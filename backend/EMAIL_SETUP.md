# Password Reset Email Configuration

## Overview
The password reset feature sends emails to users with a link to reset their password. The link expires after 1 hour for security.

## Email Service Configuration

### For Development
By default, the application will log emails to the console in development mode if no SMTP configuration is provided.

### For Production
Add the following environment variables to your `.env` file in the backend directory:

```env
# SMTP Email Configuration
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
SMTP_FROM=noreply@daycare.local

# Frontend URL (for reset link)
FRONTEND_URL=http://localhost:3000
```

### Example SMTP Configurations

#### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=your-gmail@gmail.com
```
**Note:** For Gmail, you need to use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password.

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=verified-sender@yourdomain.com
```

#### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
SMTP_FROM=noreply@yourdomain.com
```

#### Custom SMTP Server
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-password
SMTP_FROM=noreply@yourdomain.com
```

## Database Setup

Before using the password reset feature, you need to create the password reset tokens table:

```bash
# Run this SQL migration on your database
mysql -u your_user -p your_database < backend/database/migration_password_reset_tokens.sql
```

Or manually run the SQL:
```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Testing Email in Development

### Option 1: Console Logging (Default)
Simply don't configure SMTP variables. Emails will be logged to the console.

### Option 2: Ethereal Email (Fake SMTP)
1. Go to [https://ethereal.email/](https://ethereal.email/)
2. Click "Create Ethereal Account"
3. Use the provided SMTP credentials in your `.env` file
4. View sent emails in the Ethereal inbox

Example Ethereal configuration:
```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ethereal-username@ethereal.email
SMTP_PASS=ethereal-password
SMTP_FROM=noreply@daycare.local
```

## Security Notes

1. **Token Expiration**: Reset tokens expire after 1 hour
2. **One-Time Use**: Tokens can only be used once
3. **Email Enumeration Protection**: The API returns the same message whether or not an email exists
4. **Secure Token Storage**: Tokens are hashed before storing in the database
5. **HTTPS Required**: In production, ensure your frontend URL uses HTTPS

## Troubleshooting

### Emails not being sent
- Check that nodemailer is installed: `npm install nodemailer`
- Verify your SMTP credentials are correct
- Check the server console for error messages
- Ensure your email provider allows SMTP connections

### Reset link not working
- Verify the `FRONTEND_URL` environment variable is set correctly
- Check that the database migration has been run
- Ensure the token hasn't expired (1 hour limit)
- Check browser console for errors

### Gmail "Less secure app access" error
- Use an App Password instead of your regular password
- Enable 2-factor authentication on your Gmail account
- Generate an App Password in your Google Account settings
