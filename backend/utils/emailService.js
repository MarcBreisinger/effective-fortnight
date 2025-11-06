const nodemailer = require('nodemailer');

// Email configuration
// For development, you can use a service like Ethereal (https://ethereal.email/)
// For production, configure your SMTP server details in .env

const createTransporter = () => {
  // Check if we have SMTP configuration in environment variables
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development fallback - log to console
    console.warn('SMTP not configured. Emails will be logged to console only.');
    return {
      sendMail: async (mailOptions) => {
        console.log('📧 Email would be sent:');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Text:', mailOptions.text);
        console.log('HTML:', mailOptions.html);
        return { messageId: 'dev-mode-' + Date.now() };
      }
    };
  }
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, resetToken, userFirstName) => {
  const transporter = createTransporter();
  
  // Construct reset URL - adjust the base URL for your frontend
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@daycare.local',
    to: email,
    subject: 'Password Reset Request - Day Care Rotation System',
    text: `
Hello ${userFirstName},

You have requested to reset your password for the Day Care Rotation System.

Please click on the following link to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email and your password will remain unchanged.

Best regards,
Day Care Rotation System
    `,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1976d2; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .button { 
      display: inline-block; 
      padding: 12px 24px; 
      background-color: #1976d2; 
      color: white !important; 
      text-decoration: none; 
      border-radius: 4px;
      margin: 20px 0;
    }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hello ${userFirstName},</p>
      <p>You have requested to reset your password for the Day Care Rotation System.</p>
      <p>Click the button below to reset your password:</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #1976d2;">${resetUrl}</p>
      <p><strong>This link will expire in 1 hour.</strong></p>
      <p>If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
    </div>
    <div class="footer">
      <p>Day Care Rotation System<br>
      This is an automated email, please do not reply.</p>
    </div>
  </div>
</body>
</html>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Password reset email sent:', info.messageId);
  return info;
};

module.exports = {
  sendPasswordResetEmail
};
