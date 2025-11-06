const { authenticateToken, requireStaff } = require('../../middleware/auth');
const jwt = require('jsonwebtoken');

// Set up test environment
process.env.JWT_SECRET = 'test-secret-key';

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let nextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  describe('authenticateToken', () => {
    it('should verify valid token and set user on request', (done) => {
      const token = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'parent' },
        process.env.JWT_SECRET
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      nextFunction.mockImplementation(() => {
        expect(mockReq.user).toBeDefined();
        expect(mockReq.user.id).toBe(1);
        expect(mockReq.user.email).toBe('test@example.com');
        expect(mockReq.user.role).toBe('parent');
        expect(mockRes.status).not.toHaveBeenCalled();
        done();
      });

      authenticateToken(mockReq, mockRes, nextFunction);
    });

    it('should return 401 when no authorization header', () => {
      authenticateToken(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 when authorization header has no Bearer prefix', () => {
      mockReq.headers.authorization = 'InvalidFormat token123';

      authenticateToken(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is just "Bearer"', () => {
      mockReq.headers.authorization = 'Bearer';

      authenticateToken(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 for invalid token', () => {
      mockReq.headers.authorization = 'Bearer invalid-token-123';

      authenticateToken(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 for expired token', () => {
      const expiredToken = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'parent' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      mockReq.headers.authorization = `Bearer ${expiredToken}`;

      authenticateToken(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should verify token with staff role', (done) => {
      const token = jwt.sign(
        { id: 2, email: 'staff@example.com', role: 'staff' },
        process.env.JWT_SECRET
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      nextFunction.mockImplementation(() => {
        expect(mockReq.user).toBeDefined();
        expect(mockReq.user.role).toBe('staff');
        done();
      });

      authenticateToken(mockReq, mockRes, nextFunction);
    });

    it('should handle tokens with additional claims', (done) => {
      const token = jwt.sign(
        {
          id: 1,
          email: 'test@example.com',
          role: 'parent',
          customClaim: 'value'
        },
        process.env.JWT_SECRET
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      nextFunction.mockImplementation(() => {
        expect(mockReq.user).toBeDefined();
        expect(mockReq.user.customClaim).toBe('value');
        done();
      });

      authenticateToken(mockReq, mockRes, nextFunction);
    });
  });

  describe('requireStaff', () => {
    beforeEach(() => {
      // authenticateToken sets req.user, so simulate that
      mockReq.user = {};
    });

    it('should allow staff users to proceed', () => {
      mockReq.user.role = 'staff';

      requireStaff(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 403 for parent users', () => {
      mockReq.user.role = 'parent';

      requireStaff(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Staff access required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 for users with no role', () => {
      mockReq.user.role = undefined;

      requireStaff(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Staff access required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 for unknown roles', () => {
      mockReq.user.role = 'admin'; // Invalid role

      requireStaff(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle case-sensitive role checking', () => {
      mockReq.user.role = 'STAFF'; // Wrong case

      requireStaff(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('Middleware Chain', () => {
    it('should work correctly when chained together', (done) => {
      const token = jwt.sign(
        { id: 2, email: 'staff@example.com', role: 'staff' },
        process.env.JWT_SECRET
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      // First middleware: authenticateToken
      const firstNext = jest.fn(() => {
        expect(mockReq.user).toBeDefined();
        
        // Second middleware: requireStaff
        requireStaff(mockReq, mockRes, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
        done();
      });

      authenticateToken(mockReq, mockRes, firstNext);
    });

    it('should block parent users when chained', (done) => {
      const token = jwt.sign(
        { id: 1, email: 'parent@example.com', role: 'parent' },
        process.env.JWT_SECRET
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      // First middleware: authenticateToken
      const firstNext = jest.fn(() => {
        expect(mockReq.user).toBeDefined();
        
        // Second middleware: requireStaff
        requireStaff(mockReq, mockRes, nextFunction);
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(nextFunction).not.toHaveBeenCalled();
        done();
      });

      authenticateToken(mockReq, mockRes, firstNext);
    });
  });
});
