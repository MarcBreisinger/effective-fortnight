const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const db = require('../config/database');
const { authenticateToken, requireStaff } = require('../middleware/auth');

const router = express.Router();

// Generate unique registration code
function generateRegistrationCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Get all children (staff only)
router.get('/', authenticateToken, requireStaff, async (req, res) => {
  try {
    const [children] = await db.query(
      `SELECT c.id, c.name, c.assigned_group, c.registration_code, c.created_at,
              u.first_name as created_by_first_name, u.last_name as created_by_last_name
       FROM children c
       LEFT JOIN users u ON c.created_by_staff = u.id
       ORDER BY c.assigned_group, c.name`
    );

    // For each child, get their linked parents
    for (let child of children) {
      const [parents] = await db.query(
        `SELECT p.id, p.first_name, p.last_name, p.email, p.phone
         FROM users p
         INNER JOIN user_child_links ucl ON p.id = ucl.user_id
         WHERE ucl.child_id = ? AND p.role = 'parent'
         ORDER BY p.first_name, p.last_name`,
        [child.id]
      );
      child.parents = parents;
    }

    res.json(children);
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

// Get children by group
router.get('/group/:group', authenticateToken, async (req, res) => {
  const { group } = req.params;

  if (!['A', 'B', 'C', 'D'].includes(group)) {
    return res.status(400).json({ error: 'Invalid group' });
  }

  try {
    const [children] = await db.query(
      'SELECT id, name, assigned_group FROM children WHERE assigned_group = ? ORDER BY name',
      [group]
    );

    res.json(children);
  } catch (error) {
    console.error('Get children by group error:', error);
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

// Create new child (staff only)
router.post('/', 
  authenticateToken, 
  requireStaff,
  [
    body('name').notEmpty().trim(),
    body('assignedGroup').isIn(['A', 'B', 'C', 'D'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, assignedGroup } = req.body;
    const GROUP_CAPACITY = 12;

    try {
      // Check if group has capacity
      const [groupCount] = await db.query(
        'SELECT COUNT(*) as count FROM children WHERE assigned_group = ?',
        [assignedGroup]
      );

      if (groupCount[0].count >= GROUP_CAPACITY) {
        return res.status(400).json({ 
          error: `Group ${assignedGroup} is full (capacity: ${GROUP_CAPACITY}). Please assign to a different group.` 
        });
      }

      // Generate unique registration code
      let registrationCode;
      let isUnique = false;
      
      while (!isUnique) {
        registrationCode = generateRegistrationCode();
        const [existing] = await db.query(
          'SELECT id FROM children WHERE registration_code = ?',
          [registrationCode]
        );
        isUnique = existing.length === 0;
      }

      // Insert child
      const [result] = await db.query(
        'INSERT INTO children (name, assigned_group, registration_code, created_by_staff) VALUES (?, ?, ?, ?)',
        [name, assignedGroup, registrationCode, req.user.id]
      );

      res.status(201).json({
        message: 'Child created successfully',
        child: {
          id: result.insertId,
          name,
          assignedGroup,
          registrationCode
        }
      });
    } catch (error) {
      console.error('Create child error:', error);
      res.status(500).json({ error: 'Failed to create child' });
    }
  }
);

// Update child (staff only)
router.put('/:id',
  authenticateToken,
  requireStaff,
  [
    body('name').optional().notEmpty().trim(),
    body('assignedGroup').optional().isIn(['A', 'B', 'C', 'D'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, assignedGroup } = req.body;
    const GROUP_CAPACITY = 12;

    try {
      // If changing group, check capacity
      if (assignedGroup) {
        // Get current group
        const [currentChild] = await db.query(
          'SELECT assigned_group FROM children WHERE id = ?',
          [id]
        );

        if (currentChild.length === 0) {
          return res.status(404).json({ error: 'Child not found' });
        }

        // Only check capacity if moving to a different group
        if (currentChild[0].assigned_group !== assignedGroup) {
          const [groupCount] = await db.query(
            'SELECT COUNT(*) as count FROM children WHERE assigned_group = ?',
            [assignedGroup]
          );

          if (groupCount[0].count >= GROUP_CAPACITY) {
            return res.status(400).json({ 
              error: `Group ${assignedGroup} is full (capacity: ${GROUP_CAPACITY}). Cannot move child to this group.` 
            });
          }
        }
      }

      const updates = [];
      const values = [];

      if (name) {
        updates.push('name = ?');
        values.push(name);
      }
      if (assignedGroup) {
        updates.push('assigned_group = ?');
        values.push(assignedGroup);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(id);

      const [result] = await db.query(
        `UPDATE children SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Child not found' });
      }

      res.json({ message: 'Child updated successfully' });
    } catch (error) {
      console.error('Update child error:', error);
      res.status(500).json({ error: 'Failed to update child' });
    }
  }
);

// Delete child (staff only)
router.delete('/:id', authenticateToken, requireStaff, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM children WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    res.json({ message: 'Child deleted successfully' });
  } catch (error) {
    console.error('Delete child error:', error);
    res.status(500).json({ error: 'Failed to delete child' });
  }
});

// Get parent's children
router.get('/my-children', authenticateToken, async (req, res) => {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ error: 'Parent access required' });
  }

  try {
    const [children] = await db.query(
      `SELECT c.id, c.name, c.assigned_group
       FROM children c
       INNER JOIN user_child_links ucl ON c.id = ucl.child_id
       WHERE ucl.user_id = ?
       ORDER BY c.name`,
      [req.user.id]
    );

    res.json(children);
  } catch (error) {
    console.error('Get my children error:', error);
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

module.exports = router;
