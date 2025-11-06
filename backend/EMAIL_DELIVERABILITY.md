# Email Deliverability Setup - SPF and DKIM

This guide helps you configure SPF and DKIM records so your emails aren't rejected by Gmail, Outlook, and other mail servers.

## Why Emails Get Rejected

When you send emails from `noreply@marcb.uber.space`, receiving mail servers check:

1. **SPF (Sender Policy Framework)**: Is the sending server authorized to send email for this domain?
2. **DKIM (DomainKeys Identified Mail)**: Is the email cryptographically signed?
3. **DMARC**: What should happen if SPF/DKIM checks fail?

Without these, your emails look like spam and get rejected.

## Quick Setup for Uberspace

### Step 1: Check Current DNS Records

First, see what's already configured:

```bash
# Check SPF record
dig txt marcb.uber.space +short | grep spf

# Check DKIM record  
dig txt default._domainkey.marcb.uber.space +short
```

### Step 2: Uberspace Automatically Provides DKIM

Good news! Uberspace automatically signs outgoing emails with DKIM. You just need to publish the DKIM key in DNS.

Get your DKIM public key:

```bash
ssh marcb@himalia.uberspace.de
cat /var/qmail/control/dkim/$(hostname).public
```

This will show something like:
```
default._domainkey IN TXT "v=DKIM1; k=rsa; p=MIGfMA0GCS..."
```

### Step 3: Add DNS Records

You need to add DNS records for your domain. **Where you do this depends on your domain registrar:**

#### For `marcb.uber.space` (Uberspace subdomain)

**You cannot modify DNS for Uberspace subdomains.** Uberspace manages this automatically.

**Solution**: Use your own custom domain (e.g., `daycare.example.com`) for production emails.

#### For Your Own Domain (Recommended)

If you have a custom domain (e.g., `example.com`), add these DNS records:

**SPF Record** (TXT record for `@` or root domain):
```
Type: TXT
Name: @
Value: v=spf1 include:spf.uberspace.de ~all
```

**DKIM Record** (TXT record):
```
Type: TXT
Name: default._domainkey
Value: [paste the value from /var/qmail/control/dkim/*.public]
```

Example DKIM value:
```
v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...
```

**DMARC Record** (TXT record):
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

### Step 4: Verify DNS Propagation

Wait 5-15 minutes for DNS to propagate, then check:

```bash
# Check SPF
dig txt yourdomain.com +short | grep spf

# Check DKIM
dig txt default._domainkey.yourdomain.com +short

# Check DMARC
dig txt _dmarc.yourdomain.com +short
```

### Step 5: Update Email Configuration

If using a custom domain, update your `.env`:

```bash
ssh marcb@himalia.uberspace.de
cd ~/daycare-app/backend
nano .env
```

Change:
```env
SMTP_USER=noreply@yourdomain.com
SMTP_FROM=Day-Care System <noreply@yourdomain.com>
```

Restart:
```bash
supervisorctl restart daycare-backend
```

## Using Uberspace Subdomain (marcb.uber.space)

### Option 1: Accept Lower Deliverability

Uberspace subdomains have SPF/DKIM configured, but some strict servers (Gmail, Outlook) may still flag emails because:
- Shared IP reputation
- Generic subdomain appearance
- No custom DMARC policy

**Workaround**: Ask users to check their spam folder and whitelist `noreply@marcb.uber.space`.

### Option 2: Use Your Own Domain

**Recommended for production!** 

1. Register a domain (e.g., from Namecheap, Google Domains, etc.)
2. Point it to Uberspace:
   ```bash
   ssh marcb@himalia.uberspace.de
   uberspace web domain add yourdomain.com
   uberspace mail domain add yourdomain.com
   ```
3. Add DNS records (SPF, DKIM, DMARC) at your domain registrar
4. Update `.env` to use `noreply@yourdomain.com`

### Option 3: Use Third-Party Email Service

Use a dedicated email service with better deliverability:

**SendGrid** (Free tier: 100 emails/day):
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
SMTP_FROM=Day-Care System <noreply@yourdomain.com>
```

**Mailgun** (Free tier: 5,000 emails/month for 3 months):
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your_mailgun_smtp_password
SMTP_FROM=Day-Care System <noreply@yourdomain.com>
```

**Amazon SES** (Very cheap, high deliverability):
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_ses_smtp_username
SMTP_PASS=your_ses_smtp_password
SMTP_FROM=Day-Care System <noreply@yourdomain.com>
```

These services handle SPF/DKIM/DMARC automatically and have better IP reputation.

## Testing Email Deliverability

### Test with Mail-Tester

Send a test email to Mail-Tester:

1. Visit: https://www.mail-tester.com/
2. Copy the unique test address shown
3. Send a test email from your app to that address
4. Check your score (aim for 8+/10)

### Manual Test Script

```bash
ssh marcb@himalia.uberspace.de
cd ~/daycare-app/backend
cat > test-deliverability.js << 'EOF'
require('dotenv').config({ path: __dirname + '/.env' });
const { sendPasswordResetEmail } = require('./utils/emailService');

async function test() {
  const testEmail = process.argv[2] || 'test@mail-tester.com';
  
  console.log('Sending test email to:', testEmail);
  
  try {
    await sendPasswordResetEmail(testEmail, 'test-token-123', 'Test User');
    console.log('✓ Email sent successfully!');
    console.log('\nCheck your inbox (and spam folder)');
    console.log('For Mail-Tester: Visit https://www.mail-tester.com/ to see your score');
  } catch (error) {
    console.error('✗ Failed:', error.message);
  }
}

test();
EOF

# Test with your email
node test-deliverability.js your.email@gmail.com

# Test with Mail-Tester
node test-deliverability.js test-abc123@mail-tester.com
```

## Troubleshooting Delivery Issues

### Gmail Rejects or Marks as Spam

**Issue**: SPF/DKIM not properly configured, or shared IP reputation

**Solutions**:
1. Add custom domain with proper SPF/DKIM
2. Use SendGrid/Mailgun instead of direct SMTP
3. Ask users to whitelist your sender address
4. Enable "Less secure app access" in Gmail (not recommended)

### Outlook/Hotmail Rejects

**Issue**: Strict DMARC enforcement

**Solutions**:
1. Add DMARC record: `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`
2. Ensure SPF and DKIM both pass
3. Use a reputable third-party service

### Emails Go to Spam

**Issue**: IP reputation, missing authentication, or content triggers

**Solutions**:
1. Avoid spam trigger words (free, click here, urgent, etc.)
2. Keep HTML simple and clean
3. Include plain text alternative (already done in your code)
4. Add unsubscribe link if sending bulk emails
5. Ensure reverse DNS (PTR) matches - Uberspace handles this

### Check Email Headers

When you receive a test email, view the full headers to see authentication results:

In Gmail:
1. Open the email
2. Click three dots menu → "Show original"
3. Look for:
   - `SPF: PASS`
   - `DKIM: PASS`
   - `DMARC: PASS`

## Recommended Production Setup

For best deliverability in production:

1. **Use a custom domain**: Not `marcb.uber.space`
2. **Configure DNS records**:
   - SPF: `v=spf1 include:spf.uberspace.de ~all`
   - DKIM: From `/var/qmail/control/dkim/*.public`
   - DMARC: `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com`
3. **OR use SendGrid/Mailgun**: They handle all of this for you
4. **Test thoroughly**: Send to Gmail, Outlook, Yahoo before going live
5. **Monitor**: Check bounces and spam complaints

## DNS Record Examples

If using your own domain `daycare-example.com`:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | @ | `v=spf1 include:spf.uberspace.de ~all` | 3600 |
| TXT | default._domainkey | `v=DKIM1; k=rsa; p=MIGfMA0GCS...` | 3600 |
| TXT | _dmarc | `v=DMARC1; p=none; rua=mailto:dmarc@daycare-example.com` | 3600 |
| MX | @ | `himalia.uberspace.de` (Priority: 10) | 3600 |

## Quick Win: Use SendGrid (Recommended)

Easiest solution for immediate better deliverability:

1. Sign up at https://sendgrid.com/ (free tier)
2. Verify your domain
3. Get API key from Settings → API Keys
4. Update `.env`:
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=your_sendgrid_api_key
   SMTP_FROM=Day-Care System <noreply@yourdomain.com>
   ```
5. Restart: `supervisorctl restart daycare-backend`

SendGrid handles all SPF/DKIM/DMARC automatically and has excellent deliverability.

## Verification Checklist

- [ ] SPF record published and verified
- [ ] DKIM record published and verified  
- [ ] DMARC record published (at minimum `p=none`)
- [ ] Test email received in Gmail inbox (not spam)
- [ ] Test email received in Outlook inbox (not spam)
- [ ] Mail-Tester score above 8/10
- [ ] Email headers show SPF: PASS and DKIM: PASS
- [ ] Reverse DNS (PTR) correct (Uberspace handles this)
- [ ] FROM address matches domain with DNS records

## Support Resources

- Uberspace Mail Documentation: https://manual.uberspace.de/mail-access/
- SPF Record Checker: https://mxtoolbox.com/spf.aspx
- DKIM Validator: https://dkimvalidator.com/
- Mail-Tester: https://www.mail-tester.com/
- Google Postmaster Tools: https://postmaster.google.com/
