const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireStaff } = require('../middleware/auth');
const { processWaitingList } = require('../utils/waitingListProcessor');
const { rejectPastDates } = require('../utils/dateValidation');

const router = express.Router();

// Get schedule for a specific date
router.get('/date/:date', authenticateToken, async (req, res) => {
  const { date } = req.params;

  try {
    const [schedules] = await db.query(
      `SELECT id, schedule_date, group_order, capacity_limit, attending_groups, created_at
       FROM daily_schedules
       WHERE schedule_date = ?`,
      [date]
    );

    if (schedules.length === 0) {
      // Return default schedule if none exists
      return res.json({
        schedule_date: date,
        group_order: ['A', 'B', 'C', 'D'],
        capacity_limit: 4,
        attending_groups: ['A', 'B', 'C', 'D']
      });
    }

    const schedule = schedules[0];
    res.json({
      id: schedule.id,
      schedule_date: schedule.schedule_date,
      group_order: JSON.parse(schedule.group_order),
      capacity_limit: schedule.capacity_limit,
      attending_groups: JSON.parse(schedule.attending_groups)
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// Get schedules for date range
router.get('/range', authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start date and end date required' });
  }

  try {
    const [schedules] = await db.query(
      `SELECT id, schedule_date, group_order, capacity_limit, attending_groups
       FROM daily_schedules
       WHERE schedule_date BETWEEN ? AND ?
       ORDER BY schedule_date`,
      [startDate, endDate]
    );

    const parsedSchedules = schedules.map(s => ({
      id: s.id,
      schedule_date: s.schedule_date,
      group_order: JSON.parse(s.group_order),
      capacity_limit: s.capacity_limit,
      attending_groups: JSON.parse(s.attending_groups)
    }));

    res.json(parsedSchedules);
  } catch (error) {
    console.error('Get schedules range error:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// Create or update schedule (staff only)
router.post('/date/:date',
  authenticateToken,
  requireStaff,
  rejectPastDates,
  [
    body('groupOrder').isArray({ min: 4, max: 4 }),
    body('capacityLimit').isInt({ min: 0, max: 4 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date } = req.params;
    const { groupOrder, capacityLimit } = req.body;

    // Validate group order is one of the 4 valid cyclic rotations
    const validRotations = [
      ['A', 'B', 'C', 'D'],
      ['B', 'C', 'D', 'A'],
      ['C', 'D', 'A', 'B'],
      ['D', 'A', 'B', 'C']
    ];
    
    const isValidRotation = validRotations.some(rotation => 
      rotation.length === groupOrder.length && 
      rotation.every((group, index) => group === groupOrder[index])
    );

    if (!isValidRotation) {
      return res.status(400).json({ 
        error: 'Invalid group order. Only cyclic rotations allowed: ABCD, BCDA, CDAB, DABC' 
      });
    }

    // Calculate attending groups based on capacity
    const attendingGroups = groupOrder.slice(0, capacityLimit);

    try {
      // Check if schedule exists
      const [existing] = await db.query(
        'SELECT id, group_order, capacity_limit, attending_groups FROM daily_schedules WHERE schedule_date = ?',
        [date]
      );

      let capacityChanged = false;
      let rotationChanged = false;
      let oldCapacity = null;
      let oldRotation = null;

      if (existing.length > 0) {
        // Check what changed
        const oldSchedule = existing[0];
        oldCapacity = oldSchedule.capacity_limit;
        oldRotation = JSON.parse(oldSchedule.group_order);
        
        capacityChanged = oldCapacity !== capacityLimit;
        rotationChanged = JSON.stringify(oldRotation) !== JSON.stringify(groupOrder);
        
        // Update existing
        await db.query(
          `UPDATE daily_schedules 
           SET group_order = ?, capacity_limit = ?, attending_groups = ?
           WHERE schedule_date = ?`,
          [JSON.stringify(groupOrder), capacityLimit, JSON.stringify(attendingGroups), date]
        );
      } else {
        // Create new
        await db.query(
          `INSERT INTO daily_schedules (schedule_date, group_order, capacity_limit, attending_groups, created_by_staff)
           VALUES (?, ?, ?, ?, ?)`,
          [date, JSON.stringify(groupOrder), capacityLimit, JSON.stringify(attendingGroups), req.user.id]
        );
        
        // Initial creation counts as changes
        capacityChanged = true;
        rotationChanged = true;
      }

      // Log capacity change
      if (capacityChanged) {
        await db.query(
          `INSERT INTO activity_log (event_type, event_date, child_id, user_id, metadata)
           VALUES (?, ?, ?, ?, ?)`,
          [
            'capacity_changed',
            date,
            null,
            req.user.id,
            JSON.stringify({
              old_capacity: oldCapacity,
              new_capacity: capacityLimit,
              attending_groups: attendingGroups
            })
          ]
        );
      }

      // Log rotation change
      if (rotationChanged) {
        await db.query(
          `INSERT INTO activity_log (event_type, event_date, child_id, user_id, metadata)
           VALUES (?, ?, ?, ?, ?)`,
          [
            'rotation_changed',
            date,
            null,
            req.user.id,
            JSON.stringify({
              old_order: oldRotation,
              new_order: groupOrder,
              attending_groups: attendingGroups
            })
          ]
        );
      }

      res.json({
        message: 'Schedule saved successfully',
        schedule: {
          schedule_date: date,
          group_order: groupOrder,
          capacity_limit: capacityLimit,
          attending_groups: attendingGroups
        }
      });
    } catch (error) {
      console.error('Save schedule error:', error);
      res.status(500).json({ error: 'Failed to save schedule' });
    }
  }
);

// Update only capacity (staff only) - for slider updates
router.patch('/date/:date/capacity',
  authenticateToken,
  requireStaff,
  [body('capacityLimit').isInt({ min: 0, max: 4 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date } = req.params;
    const { capacityLimit } = req.body;

    try {
      // Get current schedule
      const [schedules] = await db.query(
        'SELECT group_order, capacity_limit FROM daily_schedules WHERE schedule_date = ?',
        [date]
      );

      let groupOrder;
      let oldCapacity = null;
      if (schedules.length === 0) {
        // Create with default order
        groupOrder = ['A', 'B', 'C', 'D'];
      } else {
        groupOrder = JSON.parse(schedules[0].group_order);
        oldCapacity = schedules[0].capacity_limit;
      }

      // Calculate attending groups
      const attendingGroups = groupOrder.slice(0, capacityLimit);

      if (schedules.length === 0) {
        // Create new
        await db.query(
          `INSERT INTO daily_schedules (schedule_date, group_order, capacity_limit, attending_groups, created_by_staff)
           VALUES (?, ?, ?, ?, ?)`,
          [date, JSON.stringify(groupOrder), capacityLimit, JSON.stringify(attendingGroups), req.user.id]
        );
      } else {
        // Update existing
        await db.query(
          `UPDATE daily_schedules 
           SET capacity_limit = ?, attending_groups = ?
           WHERE schedule_date = ?`,
          [capacityLimit, JSON.stringify(attendingGroups), date]
        );
      }

      // Log capacity change
      if (oldCapacity === null || oldCapacity !== capacityLimit) {
        await db.query(
          `INSERT INTO activity_log (event_type, event_date, child_id, user_id, metadata)
           VALUES (?, ?, ?, ?, ?)`,
          [
            'capacity_changed',
            date,
            null,
            req.user.id,
            JSON.stringify({
              old_capacity: oldCapacity,
              new_capacity: capacityLimit,
              attending_groups: attendingGroups
            })
          ]
        );
      }

      // Process waiting list after capacity change
      // This handles automatic reassignment when capacity increases or groups change
      try {
        const processingResults = await processWaitingList(date, attendingGroups);
        console.log('[Schedules] Waiting list processing results:', processingResults);
        
        res.json({
          message: 'Capacity updated successfully',
          schedule: {
            schedule_date: date,
            group_order: groupOrder,
            capacity_limit: capacityLimit,
            attending_groups: attendingGroups
          },
          processing_results: processingResults
        });
      } catch (processingError) {
        console.error('[Schedules] Waiting list processing error:', processingError);
        // Still return success even if processing fails - capacity was updated
        res.json({
          message: 'Capacity updated successfully',
          schedule: {
            schedule_date: date,
            group_order: groupOrder,
            capacity_limit: capacityLimit,
            attending_groups: attendingGroups
          },
          processing_error: 'Failed to process waiting list automatically'
        });
      }
    } catch (error) {
      console.error('Update capacity error:', error);
      res.status(500).json({ error: 'Failed to update capacity' });
    }
  }
);

// Update only rotation order (staff only) - for rotation editor
router.patch('/date/:date/rotation',
  authenticateToken,
  requireStaff,
  [body('groupOrder').isArray({ min: 4, max: 4 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date } = req.params;
    const { groupOrder } = req.body;

    // Validate group order contains A, B, C, D
    const validGroups = ['A', 'B', 'C', 'D'];
    if (!groupOrder.every(g => validGroups.includes(g)) || 
        new Set(groupOrder).size !== 4) {
      return res.status(400).json({ error: 'Invalid group order' });
    }

    try {
      // Get current schedule
      const [schedules] = await db.query(
        'SELECT capacity_limit FROM daily_schedules WHERE schedule_date = ?',
        [date]
      );

      let capacityLimit = 4; // Default
      if (schedules.length > 0) {
        capacityLimit = schedules[0].capacity_limit;
      }

      // Calculate attending groups based on capacity
      const attendingGroups = groupOrder.slice(0, capacityLimit);

      if (schedules.length === 0) {
        // Create new
        await db.query(
          `INSERT INTO daily_schedules (schedule_date, group_order, capacity_limit, attending_groups, created_by_staff)
           VALUES (?, ?, ?, ?, ?)`,
          [date, JSON.stringify(groupOrder), capacityLimit, JSON.stringify(attendingGroups), req.user.id]
        );
      } else {
        // Update existing
        await db.query(
          `UPDATE daily_schedules 
           SET group_order = ?, attending_groups = ?
           WHERE schedule_date = ?`,
          [JSON.stringify(groupOrder), JSON.stringify(attendingGroups), date]
        );
      }

      res.json({
        message: 'Rotation updated successfully',
        schedule: {
          schedule_date: date,
          group_order: groupOrder,
          capacity_limit: capacityLimit,
          attending_groups: attendingGroups
        }
      });
    } catch (error) {
      console.error('Update rotation error:', error);
      res.status(500).json({ error: 'Failed to update rotation' });
    }
  }
);

// Get children by schedule (for a specific date, grouped by group and attendance status)
router.get('/date/:date/children', authenticateToken, async (req, res) => {
  const { date } = req.params;

  try {
    // Get schedule for the date
    const [schedules] = await db.query(
      'SELECT group_order, attending_groups FROM daily_schedules WHERE schedule_date = ?',
      [date]
    );

    let groupOrder = ['A', 'B', 'C', 'D'];
    let attendingGroups = ['A', 'B', 'C', 'D'];

    if (schedules.length > 0) {
      groupOrder = JSON.parse(schedules[0].group_order);
      attendingGroups = JSON.parse(schedules[0].attending_groups);
    }

    // Get all children with their attendance status
    const [children] = await db.query(
      `SELECT c.id, c.name, c.assigned_group, 
              das.status as attendance_status,
              das.urgency_level,
              das.parent_message,
              das.updated_at,
              das.occupied_slot_from_child_id,
              das.occupied_slot_from_group,
              u.first_name, u.last_name,
              occupied_child.name as occupied_slot_from_child_name,
              occupier_child.id as slot_used_by_child_id,
              occupier_child.name as slot_used_by_child_name
       FROM children c
       LEFT JOIN daily_attendance_status das ON c.id = das.child_id AND das.attendance_date = ?
       LEFT JOIN users u ON das.updated_by_user = u.id
       LEFT JOIN children occupied_child ON das.occupied_slot_from_child_id = occupied_child.id
       LEFT JOIN daily_attendance_status das_occupier ON das_occupier.occupied_slot_from_child_id = c.id AND das_occupier.attendance_date = ?
       LEFT JOIN children occupier_child ON das_occupier.child_id = occupier_child.id
       ORDER BY c.assigned_group, c.name`,
      [date, date]
    );

    // Get waiting list children sorted by urgency (urgent first) then by timestamp (FIFO)
    const waitingListChildren = children
      .filter(c => c.attendance_status === 'waiting_list')
      .sort((a, b) => {
        // Sort by urgency level first (urgent > flexible)
        const urgencyOrder = { urgent: 2, flexible: 1 };
        const urgencyDiff = (urgencyOrder[b.urgency_level] || 1) - (urgencyOrder[a.urgency_level] || 1);
        if (urgencyDiff !== 0) return urgencyDiff;
        // Then by timestamp (FIFO)
        return new Date(a.updated_at) - new Date(b.updated_at);
      })
      .map(c => ({
        id: c.id,
        name: c.name,
        assigned_group: c.assigned_group,
        urgency_level: c.urgency_level,
        parent_message: c.parent_message,
        updated_at: c.updated_at,
        updated_by: c.first_name && c.last_name ? {
          first_name: c.first_name,
          last_name: c.last_name
        } : null,
        occupied_slot_from_child_id: c.occupied_slot_from_child_id,
        occupied_slot_from_child_name: c.occupied_slot_from_child_name,
        occupied_slot_from_group: c.occupied_slot_from_group,
        slot_used_by_child_id: c.slot_used_by_child_id,
        slot_used_by_child_name: c.slot_used_by_child_name
      }));

    // First pass: calculate capacity for each group
    const groupedChildren = groupOrder.map(group => {
      const groupChildren = children
        .filter(c => c.assigned_group === group)
        .map(c => ({
          id: c.id,
          name: c.name,
          attendance_status: c.attendance_status || 'attending',
          parent_message: c.parent_message,
          updated_at: c.updated_at,
          updated_by: c.first_name && c.last_name ? {
            first_name: c.first_name,
            last_name: c.last_name
          } : null,
          occupied_slot_from_child_id: c.occupied_slot_from_child_id,
          occupied_slot_from_child_name: c.occupied_slot_from_child_name,
          occupied_slot_from_group: c.occupied_slot_from_group
        }));

      // Calculate attending count (excluding those who gave up slots or are on waiting list)
      const attendingCount = groupChildren.filter(c => 
        c.attendance_status !== 'slot_given_up' && 
        c.attendance_status !== 'waiting_list'
      ).length;

      const canAttend = attendingGroups.includes(group);
      
      // Group capacity is the total number of children assigned to this group
      const groupCapacity = groupChildren.length;

      return {
        group,
        canAttend,
        capacity: groupCapacity,
        attending: attendingCount,
        available: canAttend ? Math.max(0, groupCapacity - attendingCount) : 0,
        children: groupChildren
      };
    });

    // Process waiting list and assign slots
    const additionallyAttending = [];
    const remainingWaitingList = [];
    const statusUpdates = []; // Track status changes to update database
    const statusDeletions = []; // Track status entries to delete (return to default)

    // First, check if there's any available capacity across all attending groups
    let totalAvailableCapacity = groupedChildren
      .filter(g => g.canAttend)
      .reduce((sum, g) => sum + g.available, 0);

    // Identify children who are 'attending' but their group is NOT attending
    // These MIGHT be children who were auto-assigned from waiting list
    // But we need to verify there's actually capacity for them
    // Sort by updated_at to process in the order they got their slots (null dates last)
    const attendingChildren = children
      .filter(c => c.attendance_status === 'attending')
      .sort((a, b) => {
        if (!a.updated_at) return 1;
        if (!b.updated_at) return -1;
        return new Date(a.updated_at) - new Date(b.updated_at);
      });
    
    for (const child of attendingChildren) {
      const childGroup = child.assigned_group;
      const isGroupAttending = attendingGroups.includes(childGroup);
      
      // If child is attending but their group is not attending
      if (!isGroupAttending) {
        // Check if there's available capacity for them
        if (totalAvailableCapacity > 0) {
          // They can be additionally attending
          additionallyAttending.push({
            id: child.id,
            name: child.name,
            assigned_group: child.assigned_group,
            parent_message: child.parent_message,
            updated_at: child.updated_at,
            updated_by: child.first_name && child.last_name ? {
              first_name: child.first_name,
              last_name: child.last_name
            } : null,
            occupied_slot_from_child_id: child.occupied_slot_from_child_id,
            occupied_slot_from_child_name: child.occupied_slot_from_child_name,
            occupied_slot_from_group: child.occupied_slot_from_group
          });
          
          // Consume one slot from available capacity
          totalAvailableCapacity -= 1;
          
          // Also update the actual group capacity tracking
          const availableGroup = groupedChildren.find(g => g.canAttend && g.available > 0);
          if (availableGroup) {
            availableGroup.available -= 1;
            availableGroup.attending += 1;
          }
        } else {
          // No capacity available - move to waiting list
          // Parent had requested a slot, so their request remains active in waiting list
          statusUpdates.push({
            child_id: child.id,
            status: 'waiting_list'
          });
          
          // Update in the grouped children as well
          const groupData = groupedChildren.find(g => g.group === childGroup);
          if (groupData) {
            const childInGroup = groupData.children.find(c => c.id === child.id);
            if (childInGroup) {
              childInGroup.attendance_status = 'waiting_list';
            }
          }
          
          // Add to remaining waiting list
          remainingWaitingList.push({
            id: child.id,
            name: child.name,
            assigned_group: child.assigned_group,
            parent_message: child.parent_message,
            updated_at: child.updated_at
          });
        }
      } else {
        // If child's group IS attending, they're back to normal (not additionally attending)
        // Delete their entry from daily_attendance_status to return to default state
        statusDeletions.push(child.id);
        
        // Update in the grouped children - mark as default (no explicit status)
        const groupData = groupedChildren.find(g => g.group === childGroup);
        if (groupData) {
          const childInGroup = groupData.children.find(c => c.id === child.id);
          if (childInGroup) {
            childInGroup.attendance_status = null; // Back to default
          }
        }
      }
    }

    // Then process waiting list for auto-assignment
    for (const waitingChild of waitingListChildren) {
      // Find the group this child belongs to
      const groupData = groupedChildren.find(g => g.group === waitingChild.assigned_group);
      
      if (!groupData) continue;

      // Case 1: Child's group is attending and has available capacity
      // -> Delete their status entry to return to default state (attending with their group)
      if (groupData.canAttend && groupData.available > 0) {
        // Delete status entry to return to default state
        statusDeletions.push(waitingChild.id);
        
        // Update the child's status in the group's children list
        const childInGroup = groupData.children.find(c => c.id === waitingChild.id);
        if (childInGroup) {
          childInGroup.attendance_status = null; // Back to default
        }
        
        // Reduce available capacity (both local and global)
        groupData.available -= 1;
        groupData.attending += 1;
        totalAvailableCapacity -= 1;
        
        // Don't add to either list - child returns to normal position
      }
      // Case 2: Child's group is NOT attending but there's capacity elsewhere
      // -> Change status to 'attending' and show in additionally_attending
      else if (!groupData.canAttend && totalAvailableCapacity > 0) {
        // Update status to 'attending' in database
        statusUpdates.push({
          child_id: waitingChild.id,
          status: 'attending'
        });
        
        // Update the child's status in the group's children list
        const childInGroup = groupData.children.find(c => c.id === waitingChild.id);
        if (childInGroup) {
          childInGroup.attendance_status = 'attending';
        }
        
        // Add to additionally attending list (no longer in waiting list)
        additionallyAttending.push(waitingChild);
        
        // Find a group with capacity and assign there (for capacity tracking)
        const availableGroup = groupedChildren.find(g => g.canAttend && g.available > 0);
        if (availableGroup) {
          availableGroup.available -= 1;
          availableGroup.attending += 1;
        }
        
        // Consume one slot from global capacity
        totalAvailableCapacity -= 1;
      } else {
        // No capacity anywhere - keep in waiting list
        remainingWaitingList.push(waitingChild);
      }
    }

    // Execute status updates in database
    if (statusUpdates.length > 0) {
      for (const update of statusUpdates) {
        await db.query(
          `UPDATE daily_attendance_status 
           SET status = ?, updated_at = CURRENT_TIMESTAMP
           WHERE child_id = ? AND attendance_date = ?`,
          [update.status, update.child_id, date]
        );
      }
    }

    // Execute status deletions (return children to default state when their group is attending)
    if (statusDeletions.length > 0) {
      await db.query(
        `DELETE FROM daily_attendance_status 
         WHERE child_id IN (?) AND attendance_date = ?`,
        [statusDeletions, date]
      );
    }

    res.json({
      schedule_date: date,
      group_order: groupOrder,
      groups: groupedChildren,
      additionally_attending: additionallyAttending,
      waiting_list: remainingWaitingList
    });
  } catch (error) {
    console.error('Get schedule children error:', error);
    res.status(500).json({ error: 'Failed to fetch schedule children' });
  }
});

module.exports = router;
