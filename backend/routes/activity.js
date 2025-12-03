const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireStaff } = require('../middleware/auth');

// Get activity log for a specific date
router.get('/date/:date', authenticateToken, async (req, res) => {
  const { date } = req.params;
  
  try {
    // Get all activity log entries for the date
    const [activities] = await db.query(
      `SELECT 
        al.id,
        al.event_type,
        al.event_date,
        al.child_id,
        al.metadata,
        al.created_at,
        u.first_name,
        u.last_name,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        c.name as child_name
       FROM activity_log al
       JOIN users u ON al.user_id = u.id
       LEFT JOIN children c ON al.child_id = c.id
       WHERE al.event_date = ?
       ORDER BY al.created_at ASC`,
      [date]
    );

    // Transform to frontend format
    const events = activities.map(activity => {
      const metadata = JSON.parse(activity.metadata || '{}');
      
      return {
        id: `activity_${activity.id}`,
        event_type: activity.event_type,
        child_id: activity.child_id,
        child_name: activity.child_name || metadata.child_name || null,
        user_name: activity.user_name,
        created_at: activity.created_at,
        metadata: metadata
      };
    });

    res.json({
      date,
      events: events,
      count: events.length
    });
  } catch (error) {
    console.error('Activity log error:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

module.exports = router;
