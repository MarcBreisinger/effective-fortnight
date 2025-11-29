const db = require('../config/database');

const GROUP_CAPACITY = 12; // Maximum children per group

/**
 * Process waiting list and automatically assign children when capacity becomes available
 * This handles:
 * 1. Automatic reassignment when a child's group becomes available again
 * 2. Processing waiting list queue when general capacity opens up
 * 3. Clearing statuses for children whose groups are now attending
 * 
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array<string>} attendingGroups - Array of groups that can attend (e.g., ['A', 'B', 'C'])
 * @returns {Object} - Results of processing including reassigned children
 */
async function processWaitingList(date, attendingGroups) {
  const results = {
    reassignedToRegularSlots: [],
    assignedFromWaitingList: [],
    clearedStatuses: []
  };

  try {
    // STEP 1: Clear statuses for children whose groups are now attending
    // If a child's group is back in attendingGroups, they should automatically get their regular slot
    // CRITICAL: Children whose group is attending but are at capacity should NOT be restored
    // This prevents displacing children with 'attending' status
    const [childrenToRestore] = await db.query(
      `SELECT das.id, das.child_id, c.name as child_name, c.assigned_group, das.status
       FROM daily_attendance_status das
       JOIN children c ON das.child_id = c.id
       WHERE das.attendance_date = ? 
       AND das.status = 'waiting_list'
       AND c.assigned_group IN (?)`,
      [date, attendingGroups]
    );

    console.log(`[WaitingListProcessor] Found ${childrenToRestore.length} children whose groups are now attending (excluding those who gave up slots)`);

    for (const child of childrenToRestore) {
      // Check if their group has capacity
      // Count children who are attending in this group
      // IMPORTANT: Count includes children with 'attending' status from OTHER groups who are additionally attending
      const [groupCount] = await db.query(
        `SELECT c.id, c.name, c.assigned_group, das.status
         FROM children c
         LEFT JOIN daily_attendance_status das ON c.id = das.child_id AND das.attendance_date = ?
         WHERE c.assigned_group = ? 
         AND c.id != ?
         AND (das.status IS NULL OR das.status = 'attending')`,
        [date, child.assigned_group, child.child_id]
      );

      // Also count children from OTHER groups who are additionally attending with THIS group
      const [additionallyAttending] = await db.query(
        `SELECT c.id, c.name, c.assigned_group
         FROM children c
         JOIN daily_attendance_status das ON c.id = das.child_id AND das.attendance_date = ?
         WHERE c.assigned_group != ?
         AND das.status = 'attending'`,
        [date, child.assigned_group]
      );

      const currentCapacity = groupCount.length + additionallyAttending.length;
      
      console.log(`[WaitingListProcessor] Attempting to restore ${child.child_name} (Group ${child.assigned_group}) to their own group`);
      console.log(`[WaitingListProcessor] Group ${child.assigned_group} can attend: ${attendingGroups.includes(child.assigned_group)}`);
      console.log(`[WaitingListProcessor] Group ${child.assigned_group} has ${currentCapacity}/${GROUP_CAPACITY} capacity`);
      console.log(`[WaitingListProcessor] Group ${child.assigned_group} has ${groupCount.length}/${GROUP_CAPACITY} children: ${groupCount.map(c => c.name).join(', ')}`);
      if (additionallyAttending.length > 0) {
        console.log(`[WaitingListProcessor] Additionally attending from other groups: ${additionallyAttending.map(c => `${c.name} (Group ${c.assigned_group})`).join(', ')}`);
      }
      
      if (currentCapacity < GROUP_CAPACITY) {
        // SAFE: There's actual free capacity, no one needs to be displaced
        // Delete status record (reverts to default 'attending' behavior)
        await db.query(
          'DELETE FROM daily_attendance_status WHERE child_id = ? AND attendance_date = ?',
          [child.child_id, date]
        );

        console.log(`[WaitingListProcessor] ✓ Restored ${child.child_name} to Group ${child.assigned_group} - capacity available`);
        
        results.reassignedToRegularSlots.push({
          child_id: child.child_id,
          child_name: child.child_name,
          group: child.assigned_group,
          previous_status: child.status
        });
      } else {
        // Group is at capacity - child must stay on waiting list
        // They CANNOT displace someone with 'attending' status
        console.log(`[WaitingListProcessor] ✗ Cannot restore ${child.child_name} - no capacity in Group ${child.assigned_group}`);
      }
    }

    // STEP 2: Process waiting list queue (children whose groups are NOT attending)
    // Get all children on waiting list, ordered by timestamp (FIFO)
    const [waitingChildren] = await db.query(
      `SELECT das.id, das.child_id, das.updated_at, c.name as child_name, c.assigned_group
       FROM daily_attendance_status das
       JOIN children c ON das.child_id = c.id
       WHERE das.attendance_date = ? 
       AND das.status = 'waiting_list'
       AND c.assigned_group NOT IN (?)
       ORDER BY das.updated_at ASC`,
      [date, attendingGroups.length > 0 ? attendingGroups : ['NONE']] // Handle empty attending groups
    );

    console.log(`[WaitingListProcessor] Processing ${waitingChildren.length} children on waiting list`);

    for (const child of waitingChildren) {
      // Check if ANY attending group has capacity
      let hasCapacity = false;
      let assignedToGroup = null;

      for (const group of attendingGroups) {
        const [groupCount] = await db.query(
          `SELECT COUNT(*) as count FROM children c
           LEFT JOIN daily_attendance_status das ON c.id = das.child_id AND das.attendance_date = ?
           WHERE c.assigned_group = ? 
           AND (das.status IS NULL OR das.status = 'attending')`,
          [date, group]
        );

        if (groupCount[0].count < GROUP_CAPACITY) {
          hasCapacity = true;
          assignedToGroup = group;
          break;
        }
      }

      if (hasCapacity) {
        // Auto-assign to attending (will appear in additionally_attending list)
        await db.query(
          `UPDATE daily_attendance_status 
           SET status = 'attending'
           WHERE child_id = ? AND attendance_date = ?`,
          [child.child_id, date]
        );

        console.log(`[WaitingListProcessor] Auto-assigned ${child.child_name} (Group ${child.assigned_group}) to additionally attending`);
        
        results.assignedFromWaitingList.push({
          child_id: child.child_id,
          child_name: child.child_name,
          group: child.assigned_group,
          assigned_to_group: assignedToGroup
        });
      } else {
        console.log(`[WaitingListProcessor] No capacity available for ${child.child_name}`);
        break; // Stop processing if no capacity (maintain queue order)
      }
    }

    console.log(`[WaitingListProcessor] Processing complete:`, {
      reassignedToRegularSlots: results.reassignedToRegularSlots.length,
      assignedFromWaitingList: results.assignedFromWaitingList.length,
      clearedStatuses: results.clearedStatuses.length
    });

    return results;
  } catch (error) {
    console.error('[WaitingListProcessor] Error processing waiting list:', error);
    throw error;
  }
}

/**
 * Process waiting list after someone gives up their slot
 * Checks if capacity is now available and assigns next person in queue
 * 
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} groupThatFreedUp - Group that now has free capacity
 * @param {Array<string>} attendingGroups - Array of groups that can attend
 * @returns {Object} - Results of processing
 */
async function processSlotGiveUp(date, groupThatFreedUp, attendingGroups) {
  const results = {
    assignedFromWaitingList: []
  };

  try {
    console.log(`[WaitingListProcessor] Processing slot give-up for group ${groupThatFreedUp} on ${date}`);

    // Check if this group has capacity now
    const [groupCount] = await db.query(
      `SELECT COUNT(*) as count FROM children c
       LEFT JOIN daily_attendance_status das ON c.id = das.child_id AND das.attendance_date = ?
       WHERE c.assigned_group = ? 
       AND (das.status IS NULL OR das.status = 'attending')`,
      [date, groupThatFreedUp]
    );

    if (groupCount[0].count >= GROUP_CAPACITY) {
      console.log(`[WaitingListProcessor] Group ${groupThatFreedUp} is still at capacity`);
      return results;
    }

    // Check if there's anyone on the waiting list
    const [waitingChildren] = await db.query(
      `SELECT das.id, das.child_id, das.updated_at, c.name as child_name, c.assigned_group
       FROM daily_attendance_status das
       JOIN children c ON das.child_id = c.id
       WHERE das.attendance_date = ? 
       AND das.status = 'waiting_list'
       ORDER BY das.updated_at ASC
       LIMIT 1`,
      [date]
    );

    if (waitingChildren.length === 0) {
      console.log(`[WaitingListProcessor] No children on waiting list`);
      return results;
    }

    const child = waitingChildren[0];

    // If child's own group is attending and has capacity, restore them
    if (attendingGroups.includes(child.assigned_group)) {
      const [childGroupCount] = await db.query(
        `SELECT COUNT(*) as count FROM children c
         LEFT JOIN daily_attendance_status das ON c.id = das.child_id AND das.attendance_date = ?
         WHERE c.assigned_group = ? 
         AND c.id != ?
         AND (das.status IS NULL OR das.status = 'attending')`,
        [date, child.assigned_group, child.child_id]
      );

      if (childGroupCount[0].count < GROUP_CAPACITY) {
        // Delete status (restore to regular slot)
        await db.query(
          'DELETE FROM daily_attendance_status WHERE child_id = ? AND attendance_date = ?',
          [child.child_id, date]
        );

        console.log(`[WaitingListProcessor] Restored ${child.child_name} to regular slot in group ${child.assigned_group}`);
        
        results.assignedFromWaitingList.push({
          child_id: child.child_id,
          child_name: child.child_name,
          group: child.assigned_group,
          type: 'regular_slot'
        });

        return results;
      }
    }

    // Otherwise, assign to additionally attending
    await db.query(
      `UPDATE daily_attendance_status 
       SET status = 'attending'
       WHERE child_id = ? AND attendance_date = ?`,
      [child.child_id, date]
    );

    console.log(`[WaitingListProcessor] Assigned ${child.child_name} from waiting list to additionally attending`);
    
    results.assignedFromWaitingList.push({
      child_id: child.child_id,
      child_name: child.child_name,
      group: child.assigned_group,
      type: 'additional_slot'
    });

    return results;
  } catch (error) {
    console.error('[WaitingListProcessor] Error processing slot give-up:', error);
    throw error;
  }
}

module.exports = {
  processWaitingList,
  processSlotGiveUp
};
