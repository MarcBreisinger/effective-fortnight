# Password Reset Email Localization

## Overview
Password reset emails are now sent in the user's preferred language (English or German), providing a consistent multilingual experience across the application.

## Implementation Details

### Database Schema Changes

A `language` column has been added to the `users` table:
```sql
language ENUM('en', 'de') DEFAULT 'de' NOT NULL
```

**For New Installations:**
- Use `backend/database/schema.sql` which includes the language column

**For Existing Databases:**
- Run the migration script: `backend/database/add_language_column.sql`
- This will add the language column and default all existing users to English ('en')

### Backend Changes

#### Email Service (`backend/utils/emailService.js`)
- Added email translation dictionary for English and German
- Updated `sendPasswordResetEmail()` function signature:
  ```javascript
  sendPasswordResetEmail(email, resetToken, userFirstName, language = 'en')
  ```
- Email templates (subject, body, HTML) now use translations based on language parameter
- Fallback to English if invalid language is provided

#### Authentication Routes (`backend/routes/auth.js`)

**Registration (`POST /register`):**
- Accepts optional `language` field ('en' or 'de')
- Saves user's language preference to database
- Defaults to 'en' if not provided

**Login (`POST /login`):**
- Returns user's language preference in response
- Syncs language with frontend LanguageContext

**Forgot Password (`POST /forgot-password`):**
- Queries user's `language` preference from database
- Passes language to `sendPasswordResetEmail()` function
- Email is sent in user's stored language preference

**Get User Info (`GET /me`):**
- Returns user's language preference

**Update Profile (`PUT /profile`):**
- Accepts optional `language` field for updating user's language preference
- Validates language is either 'en' or 'de'

### Frontend Changes

#### Registration (`frontend/src/pages/Register.js`)
- Includes current UI language when registering new users
- User's language choice during registration is saved to database

#### Authentication Context (`frontend/src/contexts/AuthContext.js`)
- On login/register/fetchUser: syncs user's database language preference with frontend
- Updates localStorage and dispatches custom event for LanguageContext

#### Language Context (`frontend/src/contexts/LanguageContext.js`)
- Listens for 'languageChanged' custom events from AuthContext
- Updates UI language when user logs in based on database preference

## Email Translations

### Supported Languages
- **English (en)**: Default language
- **German (de)**: Full translation available

### Translation Keys
Each password reset email includes:
- Subject line
- Greeting
- Introduction text
- Instructions
- Call-to-action button text
- Link copy text
- Expiration warning (1 hour)
- Security notice
- Footer with system name

### Adding New Languages
To add support for additional languages:

1. **Update Database Schema:**
   ```sql
   ALTER TABLE users MODIFY COLUMN language ENUM('en', 'de', 'fr', ...) DEFAULT 'en' NOT NULL;
   ```

2. **Add Translation to Email Service:**
   Edit `backend/utils/emailService.js`:
   ```javascript
   const emailTranslations = {
     en: { ... },
     de: { ... },
     fr: {
       passwordReset: {
         subject: '...',
         greeting: '...',
         // ... add all keys
       }
     }
   };
   ```

3. **Update Validation:**
   In `backend/routes/auth.js`, update validators:
   ```javascript
   body('language').optional().isIn(['en', 'de', 'fr', ...])
   ```

## Testing

### Test Email Generation
Use the development mode (when SMTP is not configured) to preview emails:
```bash
# Backend will log email content to console
# Email subject, text, and HTML will be displayed
```

### Test Language Switching
1. Register a new user with language preference
2. Request password reset via forgot-password page
3. Check console logs (dev mode) or email inbox for localized email
4. Verify email matches user's language preference

### Test Language Persistence
1. User registers with German language
2. User logs out
3. User requests password reset (not logged in)
4. Email should still be in German (from database preference)

## Security Considerations

- Language preference does NOT reveal whether an email exists in the system
- Forgot-password endpoint always returns success message regardless of email existence
- Language is only used when email is actually sent (user exists)
- Invalid language values fall back to English safely

## Migration Guide

### For Production Systems

1. **Backup Database:**
   ```bash
   mysqldump -u user -p database_name > backup.sql
   ```

2. **Run Migration:**
   ```bash
   mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/database/add_language_column.sql
   ```

3. **Verify Migration:**
   ```sql
   DESCRIBE users;
   SELECT COUNT(*) FROM users WHERE language = 'en'; -- Should match total user count
   ```

4. **Deploy Code:**
   - Deploy updated backend code
   - Deploy updated frontend code
   - Restart services

### For Development Environments

1. **Fresh Install:**
   ```bash
   npm run setup-db  # Uses schema.sql with language column included
   ```

2. **Existing Database:**
   ```bash
   mysql -h 127.0.0.1 -P 3307 -u marcb -p[password] [database] < backend/database/add_language_column.sql
   ```

## Troubleshooting

### User's Language Not Syncing
- Check browser console for errors
- Verify localStorage has 'language' key
- Check API responses include language field
- Ensure AuthContext is dispatching languageChanged event

### Emails Sent in Wrong Language
- Check user's language field in database: `SELECT language FROM users WHERE email = '...'`
- Verify backend logs show correct language: "Password reset email sent: ... Language: de"
- Check email translation dictionary in emailService.js

### New Users Default to Wrong Language
- Verify registration page includes language in request body
- Check backend validation accepts the language value
- Ensure database defaults to 'en' if not provided

## Future Enhancements

Potential improvements to consider:
- Add more languages (French, Spanish, etc.)
- Allow users to update language preference in settings page
- Translate other email types (welcome email, account verification, etc.)
- Add language detection from browser Accept-Language header as fallback
- Create admin panel to edit email templates without code changes
