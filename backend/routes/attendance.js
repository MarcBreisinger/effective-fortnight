const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireParent } = require('../middleware/auth');
const { processSlotGiveUp } = require('../utils/waitingListProcessor');

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
    body('status').isIn(['attending', 'slot_given_up', 'waiting_list', 'remove_waiting_list']),
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

      // Special handling for removing from waiting list
      if (status === 'remove_waiting_list') {
        // Get child info for logging
        const [childData] = await db.query('SELECT name, assigned_group FROM children WHERE id = ?', [childId]);
        
        // Simply delete the status entry - child withdraws from queue
        await db.query(
          'DELETE FROM daily_attendance_status WHERE child_id = ? AND attendance_date = ?',
          [childId, date]
        );
        
        // Log the removal from waiting list
        await db.query(
          `INSERT INTO activity_log (event_type, event_date, child_id, user_id, metadata)
           VALUES (?, ?, ?, ?, ?)`,
          [
            'waiting_list_removed',
            date,
            childId,
            req.user.id,
            JSON.stringify({
              child_name: childData[0].name,
              group: childData[0].assigned_group,
              parent_message: parentMessage || null
            })
          ]
        );
        
        console.log('[Attendance] Child removed from waiting list - status deleted');
        
        // Return success - child is back to default state (no slot)
        return res.json({
          message: 'Removed from waiting list successfully',
          status: {
            child_id: parseInt(childId),
            attendance_date: date,
            status: null, // No status means no slot
            parent_message: null,
            updated_by: {
              first_name: req.user.first_name,
              last_name: req.user.last_name
            },
            updated_at: new Date().toISOString()
          }
        });
      }

      // Get child info for logging
      const [childInfo] = await db.query('SELECT name, assigned_group FROM children WHERE id = ?', [childId]);
      
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
      
      // Log the action to activity_log
      let eventType = 'status_change';
      switch (status) {
        case 'slot_given_up':
          eventType = 'slot_given_up';
          break;
        case 'waiting_list':
          eventType = 'waiting_list_joined';
          break;
        case 'attending':
          eventType = 'slot_reclaimed';
          break;
      }
      
      await db.query(
        `INSERT INTO activity_log (event_type, event_date, child_id, user_id, metadata)
         VALUES (?, ?, ?, ?, ?)`,
        [
          eventType,
          date,
          childId,
          req.user.id,
          JSON.stringify({
            child_name: childInfo[0].name,
            group: childInfo[0].assigned_group,
            parent_message: parentMessage || null,
            status: status
          })
        ]
      );

      // Get child's group for potential processing
      const childGroup = childInfo.length > 0 ? childInfo[0].assigned_group : null;

      // Get schedule for the date to know attending groups
      const [schedules] = await db.query(
        'SELECT attending_groups FROM daily_schedules WHERE schedule_date = ?',
        [date]
      );
      const attendingGroups = schedules.length > 0 ? JSON.parse(schedules[0].attending_groups) : ['A', 'B', 'C', 'D'];

      // If giving up slot, trigger waiting list processing
      if (status === 'slot_given_up' && childGroup) {
        console.log('[Attendance] Slot given up by child in group', childGroup, '- processing waiting list');
        try {
          const processingResults = await processSlotGiveUp(date, childGroup, attendingGroups);
          console.log('[Attendance] Waiting list processing results:', processingResults);
        } catch (processingError) {
          console.error('[Attendance] Error processing slot give-up:', processingError);
          // Don't fail the request if processing fails
        }
      }

      // If joining waiting list, immediately check if they can be auto-assigned
      if (status === 'waiting_list' && childGroup) {
        console.log('[Attendance] Child joining waiting list, checking for immediate assignment');
        try {
          // Process this specific child by running full waiting list check
          // This will auto-assign if capacity is available
          const { processWaitingList } = require('../utils/waitingListProcessor');
          const processingResults = await processWaitingList(date, attendingGroups);
          console.log('[Attendance] Immediate waiting list processing results:', processingResults);
          
          // Check if this child was auto-assigned
          const wasAssigned = processingResults.assignedFromWaitingList.some(c => c.child_id === parseInt(childId)) ||
                             processingResults.reassignedToRegularSlots.some(c => c.child_id === parseInt(childId));
          if (wasAssigned) {
            finalStatus = 'attending';
            console.log('[Attendance] Child was immediately auto-assigned');
          }
        } catch (processingError) {
          console.error('[Attendance] Error processing waiting list:', processingError);
          // Don't fail the request if processing fails
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
        // Status was deleted - child was auto-restored to regular attendance
        // This happens when processWaitingList() finds child's group is attending with capacity
        console.log('[Attendance] Status entry deleted - child restored to regular attendance');
        return res.json({
          message: 'Attendance status updated successfully',
          status: {
            child_id: parseInt(childId),
            attendance_date: date,
            status: 'attending', // No status entry means attending by default
            parent_message: null,
            updated_by: {
              first_name: req.user.first_name,
              last_name: req.user.last_name
            },
            updated_at: new Date().toISOString()
          },
          auto_assigned: true // Indicate this was an automatic assignment
        });
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
