const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../utils/emailService');

const router = express.Router();

// Parent registration with registration code
router.post('/register',
  [
    body('registrationCode').notEmpty().trim(),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('phone').optional().trim(),
    body('password').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { registrationCode, firstName, lastName, email, phone, password } = req.body;

    try {
      // Verify registration code exists
      const [childRecords] = await db.query(
        'SELECT id FROM children WHERE registration_code = ?',
        [registrationCode]
      );

      if (childRecords.length === 0) {
        return res.status(400).json({ error: 'Invalid registration code' });
      }

      const childId = childRecords[0].id;

      // Check if email already exists
      const [existingUsers] = await db.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const [result] = await db.query(
        'INSERT INTO users (email, password, first_name, last_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
        [email, hashedPassword, firstName, lastName, phone || null, 'parent']
      );

      const userId = result.insertId;

      // Link user to child
      await db.query(
        'INSERT INTO user_child_links (user_id, child_id) VALUES (?, ?)',
        [userId, childId]
      );

      // Generate JWT token
      const token = jwt.sign(
        { id: userId, email, role: 'parent' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Get the child info that was just linked
      const [linkedChildren] = await db.query(
        `SELECT c.id, c.name, c.assigned_group 
         FROM children c
         INNER JOIN user_child_links ucl ON c.id = ucl.child_id
         WHERE ucl.user_id = ?`,
        [userId]
      );

      res.status(201).json({
        message: 'Registration successful',
        token,
        user: {
          id: userId,
          email,
          firstName,
          lastName,
          role: 'parent',
          children: linkedChildren
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login (both parents and staff)
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Login validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    try {
      const [users] = await db.query(
        'SELECT id, email, password, first_name, last_name, role FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        console.log('User not found:', email);
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = users[0];
      console.log('User found:', { id: user.id, email: user.email, role: user.role });

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log('Password valid:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('Invalid password for:', email);
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Check if JWT_SECRET is set
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not set!');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('Login successful for:', email);
      
      // If parent, get linked children
      let children = [];
      if (user.role === 'parent') {
        const [linkedChildren] = await db.query(
          `SELECT c.id, c.name, c.assigned_group 
           FROM children c
           INNER JOIN user_child_links ucl ON c.id = ucl.child_id
           WHERE ucl.user_id = ?`,
          [user.id]
        );
        children = linkedChildren;
      }
      
      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          children
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, email, first_name, last_name, phone, role FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // If parent, get linked children
    let children = [];
    if (user.role === 'parent') {
      const [linkedChildren] = await db.query(
        `SELECT c.id, c.name, c.assigned_group 
         FROM children c
         INNER JOIN user_child_links ucl ON c.id = ucl.child_id
         WHERE ucl.user_id = ?`,
        [user.id]
      );
      children = linkedChildren;
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      children
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

// Update user profile
router.put('/profile', 
  authenticateToken,
  [
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('phone').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, phone } = req.body;

    try {
      // Check if email is already used by another user
      const [existingUsers] = await db.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, req.user.id]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'Email already in use by another account' });
      }

      // Update user profile
      await db.query(
        'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE id = ?',
        [firstName, lastName, email, phone || null, req.user.id]
      );

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: req.user.id,
          firstName,
          lastName,
          email,
          phone,
          role: req.user.role
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// Update child name (parents can only update their own children)
router.put('/children/:childId',
  authenticateToken,
  [
    body('name').notEmpty().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { childId } = req.params;
    const { name } = req.body;

    try {
      // Verify parent has access to this child
      if (req.user.role === 'parent') {
        const [links] = await db.query(
          'SELECT id FROM user_child_links WHERE user_id = ? AND child_id = ?',
          [req.user.id, childId]
        );

        if (links.length === 0) {
          return res.status(403).json({ error: 'You do not have permission to update this child' });
        }
      }

      // Check for duplicate name (case-insensitive, excluding this child)
      const [existingChildren] = await db.query(
        'SELECT id FROM children WHERE LOWER(name) = LOWER(?) AND id != ?',
        [name, childId]
      );

      if (existingChildren.length > 0) {
        return res.status(400).json({ error: 'A child with this name already exists' });
      }

      // Update child name
      await db.query(
        'UPDATE children SET name = ? WHERE id = ?',
        [name, childId]
      );

      res.json({
        message: 'Child name updated successfully',
        child: {
          id: parseInt(childId),
          name
        }
      });
    } catch (error) {
      console.error('Update child name error:', error);
      res.status(500).json({ error: 'Failed to update child name' });
    }
  }
);

// Link additional child to parent account using registration code
router.post('/link-child',
  authenticateToken,
  [
    body('registrationCode').notEmpty().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Only parents can link children
    if (req.user.role !== 'parent') {
      return res.status(403).json({ error: 'Parent access required' });
    }

    const { registrationCode } = req.body;

    try {
      // Verify registration code exists
      const [children] = await db.query(
        'SELECT id, name, assigned_group FROM children WHERE registration_code = ?',
        [registrationCode]
      );

      if (children.length === 0) {
        return res.status(400).json({ error: 'Invalid registration code' });
      }

      const child = children[0];

      // Check if this child is already linked to this parent
      const [existingLinks] = await db.query(
        'SELECT id FROM user_child_links WHERE user_id = ? AND child_id = ?',
        [req.user.id, child.id]
      );

      if (existingLinks.length > 0) {
        return res.status(400).json({ error: 'This child is already linked to your account' });
      }

      // Link user to child
      await db.query(
        'INSERT INTO user_child_links (user_id, child_id) VALUES (?, ?)',
        [req.user.id, child.id]
      );

      res.status(201).json({
        message: 'Child linked successfully',
        child: {
          id: child.id,
          name: child.name,
          assigned_group: child.assigned_group
        }
      });
    } catch (error) {
      console.error('Link child error:', error);
      res.status(500).json({ error: 'Failed to link child' });
    }
  }
);

// Forgot password - request password reset
router.post('/forgot-password',
  [
    body('email').isEmail().normalizeEmail()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      // Find user by email
      const [users] = await db.query(
        'SELECT id, first_name, email FROM users WHERE email = ?',
        [email]
      );

      // Always return success to prevent email enumeration
      // But only send email if user exists
      if (users.length === 0) {
        return res.json({ 
          message: 'If an account exists with that email, a password reset link has been sent.' 
        });
      }

      const user = users[0];

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      
      // Set expiration to 1 hour from now
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store token in database
      await db.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, hashedToken, expiresAt]
      );

      // Send email
      try {
        await sendPasswordResetEmail(user.email, resetToken, user.first_name);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Don't reveal email sending failures to prevent enumeration
      }

      res.json({ 
        message: 'If an account exists with that email, a password reset link has been sent.' 
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Failed to process password reset request' });
    }
  }
);

// Reset password with token
router.post('/reset-password',
  [
    body('token').notEmpty().trim(),
    body('password').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    try {
      // Hash the token to compare with stored hash
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Find valid token
      const [tokens] = await db.query(
        `SELECT prt.id, prt.user_id, prt.expires_at, prt.used
         FROM password_reset_tokens prt
         WHERE prt.token = ? AND prt.used = FALSE AND prt.expires_at > NOW()`,
        [hashedToken]
      );

      if (tokens.length === 0) {
        return res.status(400).json({ 
          error: 'Invalid or expired password reset token' 
        });
      }

      const resetToken = tokens[0];

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user password
      await db.query(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, resetToken.user_id]
      );

      // Mark token as used
      await db.query(
        'UPDATE password_reset_tokens SET used = TRUE WHERE id = ?',
        [resetToken.id]
      );

      res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
);

// Verify reset token validity
router.get('/verify-reset-token/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const [tokens] = await db.query(
      `SELECT id FROM password_reset_tokens 
       WHERE token = ? AND used = FALSE AND expires_at > NOW()`,
      [hashedToken]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Invalid or expired token' 
      });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

module.exports = router;

