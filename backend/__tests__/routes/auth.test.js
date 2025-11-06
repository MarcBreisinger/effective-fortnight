const request = require('supertest');
const express = require('express');
const authRoutes = require('../../routes/auth');
const db = require('../../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Mock the database
jest.mock('../../config/database');

// Mock the email service
jest.mock('../../utils/emailService', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ messageId: 'test-123' })
}));

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Set up test environment
process.env.JWT_SECRET = 'test-secret-key';
process.env.FRONTEND_URL = 'http://localhost:3000';

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new parent user with valid registration code', async () => {
      // Mock child exists
      db.query
        .mockResolvedValueOnce([[{ id: 1 }]]) // Child lookup
        .mockResolvedValueOnce([[]]) // Email doesn't exist
        .mockResolvedValueOnce([{ insertId: 1 }]) // User created
        .mockResolvedValueOnce([]) // Link created
        .mockResolvedValueOnce([[{ id: 1, name: 'Emma', assigned_group: 'A' }]]); // Get linked children

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          registrationCode: 'ABC123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.role).toBe('parent');
      expect(response.body.user.children).toHaveLength(1);
    });

    it('should return 400 for invalid registration code', async () => {
      db.query.mockResolvedValueOnce([[]]); // No child found

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          registrationCode: 'INVALID',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid registration code');
    });

    it('should return 400 if email already registered', async () => {
      db.query
        .mockResolvedValueOnce([[{ id: 1 }]]) // Child exists
        .mockResolvedValueOnce([[{ id: 2 }]]); // Email exists

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          registrationCode: 'ABC123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'existing@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email already registered');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          registrationCode: 'ABC123',
          firstName: '',
          lastName: 'Doe',
          email: 'invalid-email',
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      db.query
        .mockResolvedValueOnce([[{
          id: 1,
          email: 'test@example.com',
          password: hashedPassword,
          first_name: 'Test',
          last_name: 'User',
          role: 'parent'
        }]])
        .mockResolvedValueOnce([[{ id: 1, name: 'Emma', assigned_group: 'A' }]]); // Children

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 401 for invalid email', async () => {
      db.query.mockResolvedValueOnce([[]]); // User not found

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should return 401 for invalid password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      
      db.query.mockResolvedValueOnce([[{
        id: 1,
        email: 'test@example.com',
        password: hashedPassword,
        first_name: 'Test',
        last_name: 'User',
        role: 'parent'
      }]]);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should include children for parent users', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      db.query
        .mockResolvedValueOnce([[{
          id: 1,
          email: 'parent@example.com',
          password: hashedPassword,
          first_name: 'Parent',
          last_name: 'User',
          role: 'parent'
        }]])
        .mockResolvedValueOnce([[
          { id: 1, name: 'Emma', assigned_group: 'A' },
          { id: 2, name: 'Liam', assigned_group: 'B' }
        ]]);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'parent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.children).toHaveLength(2);
    });

    it('should not include children for staff users', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      db.query.mockResolvedValueOnce([[{
        id: 1,
        email: 'staff@example.com',
        password: hashedPassword,
        first_name: 'Staff',
        last_name: 'User',
        role: 'staff'
      }]]);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'staff@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.children).toEqual([]);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    const { sendPasswordResetEmail } = require('../../utils/emailService');

    it('should send password reset email for valid user', async () => {
      db.query
        .mockResolvedValueOnce([[{
          id: 1,
          first_name: 'John',
          email: 'john@example.com'
        }]])
        .mockResolvedValueOnce([{ insertId: 1 }]); // Token inserted

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'john@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('password reset link has been sent');
      expect(sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should return success even for non-existent email (security)', async () => {
      db.query.mockResolvedValueOnce([[]]); // User not found

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('password reset link has been sent');
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const plainToken = 'valid-token-123';
      const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');

      db.query
        .mockResolvedValueOnce([[{
          id: 1,
          user_id: 1,
          expires_at: new Date(Date.now() + 3600000),
          used: false
        }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Password updated
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Token marked as used

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: plainToken,
          password: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Password has been reset successfully');
    });

    it('should reject expired token', async () => {
      db.query.mockResolvedValueOnce([[]]); // No valid token found

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'expired-token',
          password: 'newpassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid or expired');
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-token',
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/auth/verify-reset-token/:token', () => {
    it('should return valid for unexpired token', async () => {
      const plainToken = 'valid-token';
      const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');

      db.query.mockResolvedValueOnce([[{ id: 1 }]]);

      const response = await request(app)
        .get(`/api/auth/verify-reset-token/${plainToken}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });

    it('should return invalid for expired token', async () => {
      db.query.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .get('/api/auth/verify-reset-token/expired-token');

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', async () => {
      const token = jwt.sign({ id: 1, email: 'test@example.com', role: 'parent' }, process.env.JWT_SECRET);
      
      db.query
        .mockResolvedValueOnce([[{
          id: 1,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          phone: null,
          role: 'parent'
        }]])
        .mockResolvedValueOnce([[{ id: 1, name: 'Emma', assigned_group: 'A' }]]);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.children).toHaveLength(1);
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    it('should return 403 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid or expired token');
    });
  });
});
