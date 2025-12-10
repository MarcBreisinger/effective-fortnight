const db = require('../config/database');
const { sendPushNotificationsToUsers } = require('./pushNotificationService');

/**
 * Get the capacity for a specific group based on actual children assigned
 * @param {string} group - Group letter (A, B, C, or D)
 * @returns {Promise<number>} - Number of children assigned to this group
 */
async function getGroupCapacity(group) {
  const [result] = await db.query(
    'SELECT COUNT(*) as capacity FROM children WHERE assigned_group = ?',
    [group]
  );
  return result[0].capacity;
}

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
    // STEP 1: Restore children to their regular group slots if their group is now attending
    // If a child's group is back in attendingGroups, they should automatically get their regular slot
    // CRITICAL: Children whose group is attending but are at capacity should NOT be restored
    // This prevents displacing children with 'attending' status
    // IMPORTANT: Also restore children who are 'attending' with occupancy fields (using someone else's slot)
    const [childrenToRestore] = await db.query(
      `SELECT das.id, das.child_id, c.name as child_name, c.assigned_group, das.status,
              das.occupied_slot_from_child_id, das.occupied_slot_from_group
       FROM daily_attendance_status das
       JOIN children c ON das.child_id = c.id
       WHERE das.attendance_date = ? 
       AND c.assigned_group IN (?)
       AND (das.status = 'waiting_list' 
            OR (das.status = 'attending' AND (das.occupied_slot_from_child_id IS NOT NULL OR das.occupied_slot_from_group IS NOT NULL)))`,
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

      const groupCapacity = await getGroupCapacity(child.assigned_group);
      const currentCapacity = groupCount.length + additionallyAttending.length;
      
      console.log(`[WaitingListProcessor] Attempting to restore ${child.child_name} (Group ${child.assigned_group}) to their own group`);
      console.log(`[WaitingListProcessor] Group ${child.assigned_group} can attend: ${attendingGroups.includes(child.assigned_group)}`);
      console.log(`[WaitingListProcessor] Group ${child.assigned_group} has ${currentCapacity}/${groupCapacity} capacity`);
      console.log(`[WaitingListProcessor] Group ${child.assigned_group} has ${groupCount.length}/${groupCapacity} children: ${groupCount.map(c => c.name).join(', ')}`);
      if (additionallyAttending.length > 0) {
        console.log(`[WaitingListProcessor] Additionally attending from other groups: ${additionallyAttending.map(c => `${c.name} (Group ${c.assigned_group})`).join(', ')}`);
      }
      
      if (currentCapacity < groupCapacity) {
        // SAFE: There's actual free capacity, no one needs to be displaced
        // For waiting_list status: delete the record (reverts to default 'attending' behavior)
        // For attending status with occupancy: clear occupancy fields (they're using their own slot now)
        if (child.status === 'waiting_list') {
          await db.query(
            'DELETE FROM daily_attendance_status WHERE child_id = ? AND attendance_date = ?',
            [child.child_id, date]
          );
        } else if (child.status === 'attending' && (child.occupied_slot_from_child_id || child.occupied_slot_from_group)) {
          await db.query(
            `UPDATE daily_attendance_status 
             SET occupied_slot_from_child_id = NULL, occupied_slot_from_group = NULL
             WHERE child_id = ? AND attendance_date = ?`,
            [child.child_id, date]
          );
        }

        // Log the automated restoration (use system user ID = 1 for automated actions)
        await db.query(
          `INSERT INTO activity_log (event_type, event_date, child_id, user_id, metadata)
           VALUES (?, ?, ?, ?, ?)`,
          [
            'restored_from_waiting',
            date,
            child.child_id,
            1, // System user
            JSON.stringify({
              child_name: child.child_name,
              group: child.assigned_group,
              reason: 'group_attending_again',
              was_using_slot: child.occupied_slot_from_child_id || child.occupied_slot_from_group || null
            })
          ]
        );

        const restorationDetail = child.status === 'waiting_list' 
          ? 'from waiting list' 
          : `(was using ${child.occupied_slot_from_child_id ? `child ${child.occupied_slot_from_child_id}'s slot` : `Group ${child.occupied_slot_from_group} slot`})`;
        console.log(`[WaitingListProcessor] ✓ Restored ${child.child_name} to Group ${child.assigned_group} ${restorationDetail} - capacity available`);
        
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
    // Get all children on waiting list, ordered by urgency level (urgent first) then timestamp (FIFO)
    const [waitingChildren] = await db.query(
      `SELECT das.id, das.child_id, das.updated_at, das.urgency_level, c.name as child_name, c.assigned_group
       FROM daily_attendance_status das
       JOIN children c ON das.child_id = c.id
       WHERE das.attendance_date = ? 
       AND das.status = 'waiting_list'
       AND c.assigned_group NOT IN (?)
       ORDER BY das.urgency_level DESC, das.updated_at ASC`,
      [date, attendingGroups.length > 0 ? attendingGroups : ['NONE']] // Handle empty attending groups
    );

    console.log(`[WaitingListProcessor] Processing ${waitingChildren.length} children on waiting list`);

    for (const child of waitingChildren) {
      // Check if ANY attending group has capacity
      let hasCapacity = false;
      let assignedToGroup = null;

      for (const group of attendingGroups) {
        const groupCapacity = await getGroupCapacity(group);
        // Count all children attending and using slots in this group
        // This includes:
        // 1. Children from this group with status NULL or 'attending'
        // 2. Children from OTHER groups additionally attending and occupying slots in this group
        const [groupCount] = await db.query(
          `SELECT COUNT(*) as count FROM children c
           LEFT JOIN daily_attendance_status das ON c.id = das.child_id AND das.attendance_date = ?
           WHERE (das.status IS NULL OR das.status = 'attending')
           AND (
             c.assigned_group = ?
             OR (das.occupied_slot_from_child_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM children c2 WHERE c2.id = das.occupied_slot_from_child_id AND c2.assigned_group = ?
             ))
             OR das.occupied_slot_from_group = ?
           )`,
          [date, group, group, group]
        );

        if (groupCount[0].count < groupCapacity) {
          hasCapacity = true;
          assignedToGroup = group;
          break;
        }
      }

      if (hasCapacity) {
        // Find if there's a child from assignedToGroup who doesn't have a slot (either waiting list or gave up slot)
        // Priority: waiting_list first (they're actively waiting), then slot_given_up (they chose not to attend)
        // IMPORTANT: Exclude children whose slots are already being used by someone else
        const [displacedChild] = await db.query(
          `SELECT c.id, c.name, das.status
           FROM children c
           LEFT JOIN daily_attendance_status das ON c.id = das.child_id AND das.attendance_date = ?
           WHERE c.assigned_group = ?
           AND (das.status = 'waiting_list' OR das.status = 'slot_given_up')
           AND c.id NOT IN (
             SELECT DISTINCT occupied_slot_from_child_id 
             FROM daily_attendance_status 
             WHERE attendance_date = ? 
             AND occupied_slot_from_child_id IS NOT NULL
           )
           ORDER BY 
             CASE das.status 
               WHEN 'waiting_list' THEN 1 
               WHEN 'slot_given_up' THEN 2 
               ELSE 3 
             END,
             das.updated_at ASC
           LIMIT 1`,
          [date, assignedToGroup, date]
        );

        const occupiedSlotFromChildId = displacedChild.length > 0 ? displacedChild[0].id : null;
        const occupiedSlotFromGroup = occupiedSlotFromChildId ? null : assignedToGroup;

        // Auto-assign to attending (will appear in additionally_attending list)
        await db.query(
          `UPDATE daily_attendance_status 
           SET status = 'attending', occupied_slot_from_child_id = ?, occupied_slot_from_group = ?
           WHERE child_id = ? AND attendance_date = ?`,
          [occupiedSlotFromChildId, occupiedSlotFromGroup, child.child_id, date]
        );

        // Log the automated assignment
        await db.query(
          `INSERT INTO activity_log (event_type, event_date, child_id, user_id, metadata)
           VALUES (?, ?, ?, ?, ?)`,
          [
            'auto_assigned',
            date,
            child.child_id,
            1, // System user
            JSON.stringify({
              child_name: child.child_name,
              group: child.assigned_group,
              assigned_to_group: assignedToGroup,
              urgency_level: child.urgency_level,
              occupied_slot_from_child_id: occupiedSlotFromChildId,
              occupied_slot_from_child_name: displacedChild.length > 0 ? displacedChild[0].name : null
            })
          ]
        );

        console.log(`[WaitingListProcessor] Auto-assigned ${child.child_name} (Group ${child.assigned_group}) to additionally attending${occupiedSlotFromChildId ? ` (using slot of child ID ${occupiedSlotFromChildId})` : ''}`);
        
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

    // Send push notifications for slot assignments
    console.log('[WaitingListProcessor] Notification condition check:', {
      assignedFromWaitingList: results.assignedFromWaitingList.length,
      reassignedToRegularSlots: results.reassignedToRegularSlots.length,
      willSendNotifications: (results.assignedFromWaitingList.length > 0 || results.reassignedToRegularSlots.length > 0)
    });
    
    if (results.assignedFromWaitingList.length > 0 || results.reassignedToRegularSlots.length > 0) {
      try {
        console.log('[WaitingListProcessor] ENTERING NOTIFICATION BLOCK');
        
        const allAssignedChildren = [
          ...results.assignedFromWaitingList,
          ...results.reassignedToRegularSlots
        ];
        
        console.log('[WaitingListProcessor] All assigned children:', allAssignedChildren);

        // Group children by parent
        const childIds = allAssignedChildren.map(c => c.child_id);
        console.log('[WaitingListProcessor] Looking up parents for child IDs:', childIds);
        
        const [parentLinks] = await db.query(
          `SELECT ucl.user_id as parent_id, c.id as child_id, c.name as child_name
           FROM user_child_links ucl
           JOIN children c ON ucl.child_id = c.id
           WHERE c.id IN (?)`,
          [childIds]
        );
        
        console.log('[WaitingListProcessor] Parent links found:', parentLinks);

        const childrenByParent = {};
        parentLinks.forEach(link => {
          if (!childrenByParent[link.parent_id]) {
            childrenByParent[link.parent_id] = [];
          }
          childrenByParent[link.parent_id].push(link.child_name);
        });

        // Fetch parent language preferences
        const parentIds = Object.keys(childrenByParent);
        
        // Guard against empty parentIds array (would cause SQL error with IN ())
        if (parentIds.length === 0) {
          console.log('[WaitingListProcessor] No parent links found for assigned children - skipping notifications');
          return results;
        }
        
        const [parentLanguages] = await db.query(
          'SELECT id, language FROM users WHERE id IN (?)',
          [parentIds]
        );
        const languageMap = {};
        parentLanguages.forEach(p => {
          languageMap[p.id] = p.language || 'en';
        });

        // Send personalized notification to each parent
        console.log('[WaitingListProcessor] Grouped children by parent:', childrenByParent);
        console.log('[WaitingListProcessor] Preparing to send notifications to', Object.keys(childrenByParent).length, 'parent(s)');
        
        for (const [parentId, childNames] of Object.entries(childrenByParent)) {
          const language = languageMap[parentId] || 'en';
          console.log(`[WaitingListProcessor] Preparing notification for parent ${parentId} in ${language}:`, childNames);
          
          // Format date according to user's language
          const formattedDate = new Date(date).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          });
          
          // Format child names with "and" (or "und" in German) before the last one
          let childNamesList;
          const andWord = language === 'de' ? 'und' : 'and';
          if (childNames.length === 1) {
            childNamesList = childNames[0];
          } else if (childNames.length === 2) {
            childNamesList = `${childNames[0]} ${andWord} ${childNames[1]}`;
          } else {
            childNamesList = `${childNames.slice(0, -1).join(', ')}, ${andWord} ${childNames[childNames.length - 1]}`;
          }
          
          // Localized notification text
          const title = language === 'de'
            ? (childNames.length === 1 ? 'Platz zugewiesen' : 'Plätze zugewiesen')
            : (childNames.length === 1 ? 'Slot Assigned' : 'Slots Assigned');
          
          const assignedText = language === 'de'
            ? (childNames.length === 1 ? 'wurde ein Betreuungsplatz' : 'wurden Betreuungsplätze')
            : (childNames.length === 1 ? 'has been assigned a slot' : 'have been assigned slots');
          
          const forText = language === 'de' ? 'für den' : 'for';
          
          const notificationPayload = {
            title: title,
            body: `${childNamesList} ${assignedText} ${forText} ${formattedDate}.`,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            url: `/?date=${date}`,
            date: date,
            tag: `slot-assigned-${date}`,
            requireInteraction: true,
            event: 'slot_assigned'
          };
          
          console.log(`[WaitingListProcessor] Sending notification to parent ${parentId}:`, notificationPayload);
          await sendPushNotificationsToUsers([parseInt(parentId)], notificationPayload);
          console.log(`[WaitingListProcessor] Notification sent successfully to parent ${parentId}`);
        }
        
        console.log(`[WaitingListProcessor] Sent slot assignment notifications to ${Object.keys(childrenByParent).length} parent(s)`);
      } catch (notificationError) {
        console.error('[WaitingListProcessor] Error sending push notifications:', notificationError);
        // Don't fail the request if notifications fail
      }
    }

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
 * @param {number} childIdWhoGaveUp - ID of child who gave up their slot (optional)
 * @returns {Object} - Results of processing
 */
async function processSlotGiveUp(date, groupThatFreedUp, attendingGroups, childIdWhoGaveUp = null) {
  const results = {
    assignedFromWaitingList: []
  };

  try {
    console.log(`[WaitingListProcessor] Processing slot give-up for group ${groupThatFreedUp} on ${date}`);

    // Check if this group has capacity now
    // Count all children attending and using slots in this group (including additionally attending from other groups)
    const [groupCount] = await db.query(
      `SELECT COUNT(*) as count FROM children c
       LEFT JOIN daily_attendance_status das ON c.id = das.child_id AND das.attendance_date = ?
       WHERE (das.status IS NULL OR das.status = 'attending')
       AND (
         c.assigned_group = ?
         OR (das.occupied_slot_from_child_id IS NOT NULL AND EXISTS (
           SELECT 1 FROM children c2 WHERE c2.id = das.occupied_slot_from_child_id AND c2.assigned_group = ?
         ))
         OR das.occupied_slot_from_group = ?
       )`,
      [date, groupThatFreedUp, groupThatFreedUp, groupThatFreedUp]
    );

    const groupCapacity = await getGroupCapacity(groupThatFreedUp);
    if (groupCount[0].count >= groupCapacity) {
      console.log(`[WaitingListProcessor] Group ${groupThatFreedUp} is still at capacity`);
      return results;
    }

    // Check if there's anyone on the waiting list (prioritize urgent, then FIFO)
    const [waitingChildren] = await db.query(
      `SELECT das.id, das.child_id, das.updated_at, das.urgency_level, c.name as child_name, c.assigned_group
       FROM daily_attendance_status das
       JOIN children c ON das.child_id = c.id
       WHERE das.attendance_date = ? 
       AND das.status = 'waiting_list'
       ORDER BY das.urgency_level DESC, das.updated_at ASC
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
      // Count all children attending and using slots in child's group (including additionally attending from other groups)
      const [childGroupCount] = await db.query(
        `SELECT COUNT(*) as count FROM children c
         LEFT JOIN daily_attendance_status das ON c.id = das.child_id AND das.attendance_date = ?
         WHERE (das.status IS NULL OR das.status = 'attending')
         AND c.id != ?
         AND (
           c.assigned_group = ?
           OR (das.occupied_slot_from_child_id IS NOT NULL AND EXISTS (
             SELECT 1 FROM children c2 WHERE c2.id = das.occupied_slot_from_child_id AND c2.assigned_group = ?
           ))
           OR das.occupied_slot_from_group = ?
         )`,
        [date, child.child_id, child.assigned_group, child.assigned_group, child.assigned_group]
      );

      const childGroupCapacity = await getGroupCapacity(child.assigned_group);
      if (childGroupCount[0].count < childGroupCapacity) {
        // Delete status (restore to regular slot)
        await db.query(
          'DELETE FROM daily_attendance_status WHERE child_id = ? AND attendance_date = ? AND status = ?',
          [child.child_id, date, 'waiting_list']
        );

        console.log(`[WaitingListProcessor] Restored ${child.child_name} to regular slot in group ${child.assigned_group}`);
        
        results.assignedFromWaitingList.push({
          child_id: child.child_id,
          child_name: child.child_name,
          group: child.assigned_group,
          assigned_to_group: child.assigned_group
        });

        // Send push notification for slot assignment
        try {
          console.log(`[WaitingListProcessor] processSlotGiveUp/regularSlot - Preparing notification for child ${child.child_id}`);
          const [parentLinks] = await db.query(
            `SELECT ucl.user_id as parent_id, c.id as child_id, c.name as child_name
             FROM user_child_links ucl
             JOIN children c ON ucl.child_id = c.id
             WHERE c.id = ?`,
            [child.child_id]
          );

          console.log(`[WaitingListProcessor] processSlotGiveUp/regularSlot - Found ${parentLinks.length} parent link(s)`);

          if (parentLinks.length > 0) {
            // Get parent language preferences
            const parentIds = parentLinks.map(link => link.parent_id);
            const [parentLanguages] = await db.query(
              'SELECT id, language FROM users WHERE id IN (?)',
              [parentIds]
            );
            const languageMap = {};
            parentLanguages.forEach(p => {
              languageMap[p.id] = p.language || 'en';
            });

            // Send notification to each parent
            for (const link of parentLinks) {
              const language = languageMap[link.parent_id] || 'en';
              
              // Format date according to user's language
              const formattedDate = new Date(date).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              });
              
              // Localized notification text
              const title = language === 'de' ? 'Platz zugewiesen' : 'Slot Assigned';
              const assignedText = language === 'de' ? 'wurde ein Betreuungsplatz' : 'has been assigned a slot';
              const forText = language === 'de' ? 'für den' : 'for';
              
              const notificationPayload = {
                title: title,
                body: `${child.child_name} ${assignedText} ${forText} ${formattedDate}.`,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                url: `/?date=${date}`,
                date: date,
                tag: `slot-assigned-${date}`,
                requireInteraction: true,
                event: 'slot_assigned'
              };
              
              console.log(`[WaitingListProcessor] Sending notification to parent ${link.parent_id} for regular slot restoration`);
              await sendPushNotificationsToUsers([parseInt(link.parent_id)], notificationPayload);
              console.log(`[WaitingListProcessor] Notification sent successfully to parent ${link.parent_id}`);
            }
          } else {
            console.log(`[WaitingListProcessor] No parent links found for child ${child.child_id}`);
          }
        } catch (notificationError) {
          console.error('[WaitingListProcessor] Error sending push notification for regular slot restoration:', notificationError);
          // Don't fail the request if notification fails
        }

        return results;
      }
    }

    // Otherwise, assign to additionally attending
    let occupiedSlotFromChildId = null;
    let occupiedSlotFromGroup = null;

    // PRIORITY 1: If we know who gave up their slot, use their slot (or trace back to original owner)
    if (childIdWhoGaveUp) {
      const [childWhoGaveUpInfo] = await db.query(
        `SELECT c.assigned_group, das.occupied_slot_from_child_id, das.occupied_slot_from_group
         FROM children c
         LEFT JOIN daily_attendance_status das ON c.id = das.child_id AND das.attendance_date = ?
         WHERE c.id = ?`,
        [date, childIdWhoGaveUp]
      );
      
      if (childWhoGaveUpInfo.length > 0 && childWhoGaveUpInfo[0].assigned_group === groupThatFreedUp) {
        // The child who gave up is from the group that freed up
        // Check if they were using someone else's slot - if so, trace back to original owner
        if (childWhoGaveUpInfo[0].occupied_slot_from_child_id) {
          // They were using someone else's slot, use that original slot
          occupiedSlotFromChildId = childWhoGaveUpInfo[0].occupied_slot_from_child_id;
          occupiedSlotFromGroup = null;
        } else if (childWhoGaveUpInfo[0].occupied_slot_from_group) {
          // They were using a free slot from a group
          occupiedSlotFromChildId = null;
          occupiedSlotFromGroup = childWhoGaveUpInfo[0].occupied_slot_from_group;
        } else {
          // They were using their own slot, so use their slot
          occupiedSlotFromChildId = childIdWhoGaveUp;
          occupiedSlotFromGroup = null;
        }
      }
    }

    // PRIORITY 2: If we don't have a slot yet, find any displaced child from the group
    if (!occupiedSlotFromChildId && !occupiedSlotFromGroup) {
      const [displacedChild] = await db.query(
        `SELECT c.id, c.name, das.status
         FROM children c
         LEFT JOIN daily_attendance_status das ON c.id = das.child_id AND das.attendance_date = ?
         WHERE c.assigned_group = ?
         AND c.id != ?
         AND (das.status = 'waiting_list' OR das.status = 'slot_given_up')
         AND c.id NOT IN (
           SELECT DISTINCT occupied_slot_from_child_id 
           FROM daily_attendance_status 
           WHERE attendance_date = ? 
           AND occupied_slot_from_child_id IS NOT NULL
         )
         ORDER BY 
           CASE das.status 
             WHEN 'waiting_list' THEN 1 
             WHEN 'slot_given_up' THEN 2 
             ELSE 3 
           END,
           das.updated_at ASC
         LIMIT 1`,
        [date, groupThatFreedUp, child.child_id, date]
      );

      occupiedSlotFromChildId = displacedChild.length > 0 ? displacedChild[0].id : null;
      occupiedSlotFromGroup = occupiedSlotFromChildId ? null : groupThatFreedUp;
    }

    await db.query(
      `UPDATE daily_attendance_status 
       SET status = 'attending', occupied_slot_from_child_id = ?, occupied_slot_from_group = ?
       WHERE child_id = ? AND attendance_date = ?`,
      [occupiedSlotFromChildId, occupiedSlotFromGroup, child.child_id, date]
    );

    console.log(`[WaitingListProcessor] Assigned ${child.child_name} from waiting list to additionally attending${occupiedSlotFromChildId ? ` (using slot of child ID ${occupiedSlotFromChildId})` : ''}`);
    
    results.assignedFromWaitingList.push({
      child_id: child.child_id,
      child_name: child.child_name,
      group: child.assigned_group,
      assigned_to_group: groupThatFreedUp
    });

    // Send push notification for slot assignment
    try {
      console.log(`[WaitingListProcessor] processSlotGiveUp - Preparing notification for child ${child.child_id}`);
      const [parentLinks] = await db.query(
        `SELECT ucl.user_id as parent_id, c.id as child_id, c.name as child_name
         FROM user_child_links ucl
         JOIN children c ON ucl.child_id = c.id
         WHERE c.id = ?`,
        [child.child_id]
      );

      console.log(`[WaitingListProcessor] processSlotGiveUp - Found ${parentLinks.length} parent link(s)`);

      if (parentLinks.length > 0) {
        // Get parent language preferences
        const parentIds = parentLinks.map(link => link.parent_id);
        const [parentLanguages] = await db.query(
          'SELECT id, language FROM users WHERE id IN (?)',
          [parentIds]
        );
        const languageMap = {};
        parentLanguages.forEach(p => {
          languageMap[p.id] = p.language || 'en';
        });

        // Send notification to each parent
        for (const link of parentLinks) {
          const language = languageMap[link.parent_id] || 'en';
          
          // Format date according to user's language
          const formattedDate = new Date(date).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          });
          
          // Localized notification text
          const title = language === 'de' ? 'Platz zugewiesen' : 'Slot Assigned';
          const assignedText = language === 'de' ? 'wurde ein Betreuungsplatz' : 'has been assigned a slot';
          const forText = language === 'de' ? 'für den' : 'for';
          
          const notificationPayload = {
            title: title,
            body: `${child.child_name} ${assignedText} ${forText} ${formattedDate}.`,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            url: `/?date=${date}`,
            date: date,
            tag: `slot-assigned-${date}`,
            requireInteraction: true,
            event: 'slot_assigned'
          };
          
          console.log(`[WaitingListProcessor] Sending notification to parent ${link.parent_id} for slot give-up assignment`);
          await sendPushNotificationsToUsers([parseInt(link.parent_id)], notificationPayload);
          console.log(`[WaitingListProcessor] Notification sent successfully to parent ${link.parent_id}`);
        }
      } else {
        console.log(`[WaitingListProcessor] No parent links found for child ${child.child_id}`);
      }
    } catch (notificationError) {
      console.error('[WaitingListProcessor] Error sending push notification for slot give-up:', notificationError);
      // Don't fail the request if notification fails
    }

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
