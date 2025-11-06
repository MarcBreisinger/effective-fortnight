const { sendPasswordResetEmail } = require('../../utils/emailService');
const nodemailer = require('nodemailer');

// Mock nodemailer
jest.mock('nodemailer');

describe('Email Service', () => {
  let mockTransporter;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create mock transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'test-message-id-123',
        response: '250 OK'
      })
    };

    // Mock nodemailer.createTransport to return our mock transporter
    nodemailer.createTransport.mockReturnValue(mockTransporter);

    // Set environment variables for testing (note: SMTP_PASS not SMTP_PASSWORD)
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'test@test.com';
    process.env.SMTP_PASS = 'testpassword';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_FROM = 'noreply@daycare.test';
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  describe('sendPasswordResetEmail', () => {
    it('should send email with correct parameters', async () => {
      const email = 'user@example.com';
      const resetToken = 'abc123def456';
      const userName = 'John';

      const result = await sendPasswordResetEmail(email, resetToken, userName);

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@test.com',
          pass: 'testpassword'
        }
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.from).toBe('noreply@daycare.test');
      expect(mailOptions.to).toBe(email);
      expect(mailOptions.subject).toContain('Password Reset Request');
      expect(mailOptions.html).toContain(userName);
      expect(mailOptions.html).toContain(resetToken);
      expect(mailOptions.html).toContain('http://localhost:3000/reset-password');

      expect(result).toEqual({
        messageId: 'test-message-id-123',
        response: '250 OK'
      });
    });

    it('should include reset link with correct token', async () => {
      const email = 'user@example.com';
      const resetToken = 'unique-token-789';
      const userName = 'Jane';

      await sendPasswordResetEmail(email, resetToken, userName);

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      const expectedLink = `http://localhost:3000/reset-password?token=${resetToken}`;
      
      expect(mailOptions.html).toContain(expectedLink);
      expect(mailOptions.html).toContain('href="' + expectedLink + '"');
    });

    it('should personalize email with user name', async () => {
      const email = 'user@example.com';
      const resetToken = 'token123';
      const userName = 'Alice';

      await sendPasswordResetEmail(email, resetToken, userName);

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      
      expect(mailOptions.html).toContain(`Hello ${userName}`);
    });

    it('should handle email sending errors', async () => {
      const email = 'user@example.com';
      const resetToken = 'token123';
      const userName = 'Bob';

      const error = new Error('SMTP connection failed');
      mockTransporter.sendMail.mockRejectedValueOnce(error);

      await expect(
        sendPasswordResetEmail(email, resetToken, userName)
      ).rejects.toThrow('SMTP connection failed');
    });

    it('should use correct SMTP configuration', async () => {
      const email = 'user@example.com';
      const resetToken = 'token123';
      const userName = 'Charlie';

      await sendPasswordResetEmail(email, resetToken, userName);

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.test.com',
          port: 587,
          secure: false
        })
      );
    });

    it('should include both HTML and text versions', async () => {
      const email = 'user@example.com';
      const resetToken = 'token123';
      const userName = 'David';

      await sendPasswordResetEmail(email, resetToken, userName);

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      
      expect(mailOptions.html).toBeDefined();
      expect(typeof mailOptions.html).toBe('string');
      expect(mailOptions.html.length).toBeGreaterThan(0);
    });

    it('should handle special characters in user name', async () => {
      const email = 'user@example.com';
      const resetToken = 'token123';
      const userName = "O'Brien";

      await sendPasswordResetEmail(email, resetToken, userName);

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      
      expect(mailOptions.html).toContain("O'Brien");
    });

    it('should handle special characters in email address', async () => {
      const email = 'user+test@example.com';
      const resetToken = 'token123';
      const userName = 'Eve';

      await sendPasswordResetEmail(email, resetToken, userName);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user+test@example.com'
        })
      );
    });

    it('should create new transporter for each email', async () => {
      await sendPasswordResetEmail('user1@example.com', 'token1', 'User1');
      await sendPasswordResetEmail('user2@example.com', 'token2', 'User2');

      expect(nodemailer.createTransport).toHaveBeenCalledTimes(2);
    });

    it('should include instructions in email body', async () => {
      const email = 'user@example.com';
      const resetToken = 'token123';
      const userName = 'Frank';

      await sendPasswordResetEmail(email, resetToken, userName);

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      
      expect(mailOptions.html).toContain('password reset');
      expect(mailOptions.html).toContain('Click');
      expect(mailOptions.html).toContain('button');
    });
  });

  describe('SMTP Configuration', () => {
    it('should use environment variables for SMTP settings', async () => {
      process.env.SMTP_HOST = 'mail.custom.com';
      process.env.SMTP_PORT = '465';
      process.env.SMTP_USER = 'custom@mail.com';
      process.env.SMTP_PASS = 'custompass';

      await sendPasswordResetEmail('user@example.com', 'token', 'User');

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'mail.custom.com',
        port: 465,
        secure: false,
        auth: {
          user: 'custom@mail.com',
          pass: 'custompass'
        }
      });
    });

    it('should use FRONTEND_URL for reset links', async () => {
      process.env.FRONTEND_URL = 'https://daycare.example.com';

      await sendPasswordResetEmail('user@example.com', 'token123', 'User');

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      
      expect(mailOptions.html).toContain('https://daycare.example.com/reset-password?token=token123');
    });
  });
});
