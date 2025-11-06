const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireParent } = require('../middleware/auth');

const router = express.Router();

// Get attendance status for a child on a specific date
router.get('/child/:childId/date/:date', authenticateToken, async (req, res) => {
  const { childId, date } = req.params;

  try {
    // Verify user has access to this child
    if (req.user.role === 'parent') {
      const [links] = await db.query(
        'SELECT id FROM user_child_links WHERE user_id = ? AND child_id = ?',
        [req.user.id, childId]
      );
      if (links.length === 0) {
        return res.status(403).json({ error: 'Access denied to this child' });
      }
    }

    const [status] = await db.query(
      `SELECT das.*, u.first_name, u.last_name 
       FROM daily_attendance_status das
       JOIN users u ON das.updated_by_user = u.id
       WHERE das.child_id = ? AND das.attendance_date = ?`,
      [childId, date]
    );

    if (status.length === 0) {
      return res.json({
        child_id: parseInt(childId),
        attendance_date: date,
        status: 'attending',
        parent_message: null,
        updated_by: null,
        updated_at: null
      });
    }

    res.json({
      id: status[0].id,
      child_id: status[0].child_id,
      attendance_date: status[0].attendance_date,
      status: status[0].status,
      parent_message: status[0].parent_message,
      updated_by: {
        first_name: status[0].first_name,
        last_name: status[0].last_name
      },
      updated_at: status[0].updated_at
    });
  } catch (error) {
    console.error('Get attendance status error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance status' });
  }
});

// Update attendance status (give up slot or join waiting list)
router.post('/child/:childId/date/:date',
  authenticateToken,
  requireParent,
  [
    body('status').isIn(['attending', 'slot_given_up', 'waiting_list']),
    body('parentMessage').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { childId, date } = req.params;
    const { status, parentMessage } = req.body;
    let finalStatus = status; // Track the final status after auto-assignment

    try {
      // Verify user has access to this child
      const [links] = await db.query(
        'SELECT id FROM user_child_links WHERE user_id = ? AND child_id = ?',
        [req.user.id, childId]
      );
      if (links.length === 0) {
        return res.status(403).json({ error: 'Access denied to this child' });
      }

      // Check if status already exists
      const [existing] = await db.query(
        'SELECT id FROM daily_attendance_status WHERE child_id = ? AND attendance_date = ?',
        [childId, date]
      );

      if (existing.length > 0) {
        // Update existing
        await db.query(
          `UPDATE daily_attendance_status 
           SET status = ?, parent_message = ?, updated_by_user = ?, updated_at = CURRENT_TIMESTAMP
           WHERE child_id = ? AND attendance_date = ?`,
          [status, parentMessage, req.user.id, childId, date]
        );
      } else {
        // Create new
        await db.query(
          `INSERT INTO daily_attendance_status (child_id, attendance_date, status, parent_message, updated_by_user)
           VALUES (?, ?, ?, ?, ?)`,
          [childId, date, status, parentMessage, req.user.id]
        );
      }

      // If joining waiting list, check if there's capacity and auto-assign
      if (status === 'waiting_list') {
        console.log('Processing waiting list auto-assignment for child:', childId, 'date:', date);
        const GROUP_CAPACITY = 12;
        
        // Get child's group
        const [child] = await db.query('SELECT assigned_group FROM children WHERE id = ?', [childId]);
        console.log('Child query result:', child);
        
        if (child.length > 0) {
          const childGroup = child[0].assigned_group;
          console.log('Child group:', childGroup);
          
          // Get schedule for the date
          const [schedules] = await db.query(
            'SELECT attending_groups FROM daily_schedules WHERE schedule_date = ?',
            [date]
          );
          console.log('Schedule query result:', schedules);
          
          let attendingGroups = ['A', 'B', 'C', 'D'];
          if (schedules.length > 0) {
            attendingGroups = JSON.parse(schedules[0].attending_groups);
          }
          console.log('Attending groups:', attendingGroups);
          
          const isChildGroupAttending = attendingGroups.includes(childGroup);
          console.log('Is child group attending?', isChildGroupAttending);
          
          // Case 1: Child's group is attending - check if their group has capacity
          if (isChildGroupAttending) {
            console.log('Case 1: Checking capacity for group', childGroup);
            const [groupCount] = await db.query(
              `SELECT COUNT(*) as count FROM children c
               LEFT JOIN daily_attendance_status das ON c.id = das.child_id AND das.attendance_date = ?
               WHERE c.assigned_group = ? 
               AND c.id != ?
               AND (das.status IS NULL OR das.status = 'attending')`,
              [date, childGroup, childId]
            );
            console.log('Group count (excluding current child):', groupCount[0].count);
            
            if (groupCount[0].count < GROUP_CAPACITY) {
              console.log('Capacity available! Auto-assigning to attending');
              // Auto-assign back to attending
              await db.query(
                `UPDATE daily_attendance_status 
                 SET status = 'attending'
                 WHERE child_id = ? AND attendance_date = ?`,
                [childId, date]
              );
              finalStatus = 'attending'; // Update for response
            } else {
              console.log('No capacity in child\'s group');
            }
          }
          // Case 2: Child's group is NOT attending - check if ANY attending group has capacity
          else {
            console.log('Case 2: Child\'s group not attending, checking other groups');
            let hasGeneralCapacity = false;
            
            for (const group of attendingGroups) {
              const [groupCount] = await db.query(
                `SELECT COUNT(*) as count FROM children c
                 LEFT JOIN daily_attendance_status das ON c.id = das.child_id AND das.attendance_date = ?
                 WHERE c.assigned_group = ? 
                 AND (das.status IS NULL OR das.status = 'attending')`,
                [date, group]
              );
              console.log(`Group ${group} count:`, groupCount[0].count);
              
              if (groupCount[0].count < GROUP_CAPACITY) {
                hasGeneralCapacity = true;
                console.log(`Capacity found in group ${group}`);
                break;
              }
            }
            
            if (hasGeneralCapacity) {
              console.log('General capacity available! Auto-assigning to attending');
              // Auto-assign to attending (will show in additionally_attending list)
              await db.query(
                `UPDATE daily_attendance_status 
                 SET status = 'attending'
                 WHERE child_id = ? AND attendance_date = ?`,
                [childId, date]
              );
              finalStatus = 'attending'; // Update for response
            } else {
              console.log('No capacity available anywhere');
            }
          }
        }
      }

      console.log('Fetching updated status for child:', childId, 'date:', date);
      // Get updated status with user info
      const [updated] = await db.query(
        `SELECT das.*, u.first_name, u.last_name 
         FROM daily_attendance_status das
         JOIN users u ON das.updated_by_user = u.id
         WHERE das.child_id = ? AND das.attendance_date = ?`,
        [childId, date]
      );
      console.log('Updated status query result:', updated);

      if (updated.length === 0) {
        return res.status(500).json({ error: 'Failed to retrieve updated status' });
      }

      res.json({
        message: 'Attendance status updated successfully',
        status: {
          id: updated[0].id,
          child_id: updated[0].child_id,
          attendance_date: updated[0].attendance_date,
          status: updated[0].status,
          parent_message: updated[0].parent_message,
          updated_by: {
            first_name: updated[0].first_name,
            last_name: updated[0].last_name
          },
          updated_at: updated[0].updated_at
        }
      });
    } catch (error) {
      console.error('Update attendance status error:', error);
      console.error('Error details:', {
        childId,
        date,
        status: req.body.status,
        errorMessage: error.message,
        errorStack: error.stack
      });
      res.status(500).json({ error: 'Failed to update attendance status' });
    }
  }
);

// Get waiting list for a specific date (staff only)
router.get('/waiting-list/date/:date', authenticateToken, async (req, res) => {
  const { date } = req.params;

  try {
    const [waiting] = await db.query(
      `SELECT das.*, c.name as child_name, c.assigned_group, u.first_name, u.last_name
       FROM daily_attendance_status das
       JOIN children c ON das.child_id = c.id
       JOIN users u ON das.updated_by_user = u.id
       WHERE das.attendance_date = ? AND das.status = 'waiting_list'
       ORDER BY das.updated_at ASC`,
      [date]
    );

    res.json(waiting.map(w => ({
      id: w.id,
      child_id: w.child_id,
      child_name: w.child_name,
      assigned_group: w.assigned_group,
      parent_message: w.parent_message,
      updated_by: {
        first_name: w.first_name,
        last_name: w.last_name
      },
      updated_at: w.updated_at
    })));
  } catch (error) {
    console.error('Get waiting list error:', error);
    res.status(500).json({ error: 'Failed to fetch waiting list' });
  }
});

module.exports = router;
