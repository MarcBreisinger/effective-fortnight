const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireStaff } = require('../middleware/auth');

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

    // Validate group order contains A, B, C, D
    const validGroups = ['A', 'B', 'C', 'D'];
    if (!groupOrder.every(g => validGroups.includes(g)) || 
        new Set(groupOrder).size !== 4) {
      return res.status(400).json({ error: 'Invalid group order' });
    }

    // Calculate attending groups based on capacity
    const attendingGroups = groupOrder.slice(0, capacityLimit);

    try {
      // Check if schedule exists
      const [existing] = await db.query(
        'SELECT id FROM daily_schedules WHERE schedule_date = ?',
        [date]
      );

      if (existing.length > 0) {
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
        'SELECT group_order FROM daily_schedules WHERE schedule_date = ?',
        [date]
      );

      let groupOrder;
      if (schedules.length === 0) {
        // Create with default order
        groupOrder = ['A', 'B', 'C', 'D'];
      } else {
        groupOrder = JSON.parse(schedules[0].group_order);
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

      res.json({
        message: 'Capacity updated successfully',
        schedule: {
          schedule_date: date,
          group_order: groupOrder,
          capacity_limit: capacityLimit,
          attending_groups: attendingGroups
        }
      });
    } catch (error) {
      console.error('Update capacity error:', error);
      res.status(500).json({ error: 'Failed to update capacity' });
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

    // Get all children grouped by group
    const [children] = await db.query(
      'SELECT id, name, assigned_group FROM children ORDER BY assigned_group, name'
    );

    // Organize children by group in the daily order
    const groupedChildren = groupOrder.map(group => ({
      group,
      canAttend: attendingGroups.includes(group),
      children: children.filter(c => c.assigned_group === group)
    }));

    res.json({
      schedule_date: date,
      group_order: groupOrder,
      groups: groupedChildren
    });
  } catch (error) {
    console.error('Get schedule children error:', error);
    res.status(500).json({ error: 'Failed to fetch schedule children' });
  }
});

module.exports = router;
