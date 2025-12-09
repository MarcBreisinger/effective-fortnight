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

    try {
      // No capacity check - groups are dynamic based on children assigned
      // Group "capacity" is determined by the number of children in that group

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

    try {
      // No capacity check needed - groups are dynamic based on children assigned
      // Moving a child to another group adjusts both groups' capacities automatically

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

// Check if deleting child will result in parent account deletions (staff only)
router.get('/:id/check-deletion-impact', authenticateToken, requireStaff, async (req, res) => {
  const { id } = req.params;

  try {
    // Get child info
    const [children] = await db.query(
      'SELECT id, name FROM children WHERE id = ?',
      [id]
    );

    if (children.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Find parents who have this child as their ONLY child
    const [affectedParents] = await db.query(
      `SELECT 
        u.id, 
        u.first_name, 
        u.last_name, 
        u.email,
        COUNT(ucl.child_id) as child_count
       FROM users u
       INNER JOIN user_child_links ucl ON u.id = ucl.user_id
       WHERE u.role = 'parent' AND ucl.user_id IN (
         SELECT user_id FROM user_child_links WHERE child_id = ?
       )
       GROUP BY u.id, u.first_name, u.last_name, u.email
       HAVING child_count = 1`,
      [id]
    );

    res.json({
      childName: children[0].name,
      willDeleteParentAccounts: affectedParents.length > 0,
      affectedParents: affectedParents.map(p => ({
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        email: p.email
      }))
    });
  } catch (error) {
    console.error('Check deletion impact error:', error);
    res.status(500).json({ error: 'Failed to check deletion impact' });
  }
});

// Delete child (staff only)
router.delete('/:id', authenticateToken, requireStaff, async (req, res) => {
  const { id } = req.params;
  const emailService = require('../utils/emailService');

  try {
    // Get child info and affected parents before deletion
    const [children] = await db.query(
      'SELECT name FROM children WHERE id = ?',
      [id]
    );

    if (children.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const childName = children[0].name;

    // Find parents who have this child as their ONLY child
    const [affectedParents] = await db.query(
      `SELECT 
        u.id, 
        u.first_name, 
        u.last_name, 
        u.email,
        u.language,
        COUNT(ucl.child_id) as child_count
       FROM users u
       INNER JOIN user_child_links ucl ON u.id = ucl.user_id
       WHERE u.role = 'parent' AND ucl.user_id IN (
         SELECT user_id FROM user_child_links WHERE child_id = ?
       )
       GROUP BY u.id, u.first_name, u.last_name, u.email, u.language
       HAVING child_count = 1`,
      [id]
    );

    // Delete the child (this will cascade delete user_child_links)
    await db.query('DELETE FROM children WHERE id = ?', [id]);

    // Delete affected parent accounts and send emails
    for (const parent of affectedParents) {
      // Delete password reset tokens
      await db.query(
        'DELETE FROM password_reset_tokens WHERE user_id = ?',
        [parent.id]
      );

      // Delete the parent account
      await db.query('DELETE FROM users WHERE id = ?', [parent.id]);

      // Send notification email
      try {
        const language = parent.language || 'de';
        const subject = language === 'de' 
          ? 'Ihr Kita-Konto wurde geschlossen'
          : 'Your Day Care Account Has Been Closed';
        
        const message = language === 'de'
          ? `Hallo ${parent.first_name} ${parent.last_name},\n\nwir möchten Sie darüber informieren, dass Ihr Kind ${childName} aus dem Kita-System entfernt wurde.\n\nDa dies Ihr einziges verknüpftes Kind war, wurde Ihr Eltern-Konto automatisch geschlossen. Ihre Daten wurden aus dem System gelöscht.\n\nWenn Sie in Zukunft wieder ein Kind in der Kita haben, können Sie sich jederzeit mit einem neuen Registrierungscode wieder anmelden.\n\nVielen Dank für Ihr Vertrauen.\n\nMit freundlichen Grüßen,\nIhr Kita-Team`
          : `Hello ${parent.first_name} ${parent.last_name},\n\nWe would like to inform you that your child ${childName} has been removed from the day care system.\n\nAs this was your only linked child, your parent account has been automatically closed. Your data has been removed from the system.\n\nIf you have a child in day care again in the future, you can always register again with a new registration code.\n\nThank you for your trust.\n\nBest regards,\nYour Day Care Team`;

        await emailService.sendEmail(parent.email, subject, message);
      } catch (emailError) {
        console.error(`Failed to send email to ${parent.email}:`, emailError);
        // Don't fail the entire operation if email fails
      }
    }

    res.json({ 
      message: 'Child deleted successfully',
      deletedParentAccounts: affectedParents.length,
      parentEmails: affectedParents.map(p => p.email)
    });
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
