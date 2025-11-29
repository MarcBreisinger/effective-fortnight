const nodemailer = require('nodemailer');

// Email configuration
// For development, you can use a service like Ethereal (https://ethereal.email/)
// For production, configure your SMTP server details in .env

// Email translations
const emailTranslations = {
  en: {
    passwordReset: {
      subject: 'Password Reset Request - Day Care Rotation System',
      greeting: 'Hello',
      intro: 'You have requested to reset your password for the Day Care Rotation System.',
      instruction: 'Please click on the following link to reset your password:',
      buttonText: 'Reset Password',
      linkText: 'Or copy and paste this link into your browser:',
      expiry: 'This link will expire in 1 hour.',
      noRequest: 'If you did not request this password reset, please ignore this email and your password will remain unchanged.',
      closing: 'Best regards',
      systemName: 'Day Care Rotation System',
      footerNote: 'This is an automated email, please do not reply.'
    }
  },
  de: {
    passwordReset: {
      subject: 'Anfrage zur Passwortzurücksetzung - Kita-Rotationssystem',
      greeting: 'Hallo',
      intro: 'Sie haben eine Zurücksetzung Ihres Passworts für das Kita-Rotationssystem angefordert.',
      instruction: 'Bitte klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen:',
      buttonText: 'Passwort zurücksetzen',
      linkText: 'Oder kopieren Sie diesen Link in Ihren Browser:',
      expiry: 'Dieser Link läuft in 1 Stunde ab.',
      noRequest: 'Wenn Sie diese Passwortzurücksetzung nicht angefordert haben, ignorieren Sie bitte diese E-Mail und Ihr Passwort bleibt unverändert.',
      closing: 'Mit freundlichen Grüßen',
      systemName: 'Kita-Rotationssystem',
      footerNote: 'Dies ist eine automatisierte E-Mail, bitte antworten Sie nicht.'
    }
  }
};

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
 * @param {string} email - Recipient email address
 * @param {string} resetToken - Password reset token
 * @param {string} userFirstName - User's first name
 * @param {string} language - User's preferred language ('en' or 'de'), defaults to 'de'
 */
const sendPasswordResetEmail = async (email, resetToken, userFirstName, language = 'de') => {
  const transporter = createTransporter();
  
  // Get translations for the specified language (fallback to German if invalid)
  const lang = emailTranslations[language] || emailTranslations.de;
  const t = lang.passwordReset;
  
  // Construct reset URL - adjust the base URL for your frontend
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@daycare.local',
    to: email,
    subject: t.subject,
    text: `
${t.greeting} ${userFirstName},

${t.intro}

${t.instruction}
${resetUrl}

${t.expiry}

${t.noRequest}

${t.closing},
${t.systemName}
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
      <h1>${t.subject}</h1>
    </div>
    <div class="content">
      <p>${t.greeting} ${userFirstName},</p>
      <p>${t.intro}</p>
      <p>${t.instruction}</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">${t.buttonText}</a>
      </p>
      <p>${t.linkText}</p>
      <p style="word-break: break-all; color: #1976d2;">${resetUrl}</p>
      <p><strong>${t.expiry}</strong></p>
      <p>${t.noRequest}</p>
    </div>
    <div class="footer">
      <p>${t.systemName}<br>
      ${t.footerNote}</p>
    </div>
  </div>
</body>
</html>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Password reset email sent:', info.messageId, 'Language:', language);
  return info;
};

module.exports = {
  sendPasswordResetEmail
};
