/**
 * Supabase Auth Email Templates
 *
 * Copy these HTML templates into your Supabase dashboard:
 * Authentication → Email Templates
 *
 * Then configure Mailjet SMTP:
 * Authentication → Settings → SMTP Settings
 */

export const WELCOME_EMAIL = `<!-- Welcome / Confirm Signup -->
<h2>Welcome to Dr. Token System</h2>
<p>Click the button below to confirm your email address and activate your account.</p>
<a href="{{ .ConfirmationURL }}" 
   style="display:inline-block;padding:12px 24px;background:#171717;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;">
  Confirm Email
</a>
<p style="margin-top:16px;color:#888;font-size:12px;">
  If you didn't create an account, you can safely ignore this email.
</p>`;

export const RESET_PASSWORD_EMAIL = `<!-- Reset Password -->
<h2>Reset Your Password</h2>
<p>Click the button below to reset your password for Dr. Token System.</p>
<a href="{{ .ConfirmationURL }}" 
   style="display:inline-block;padding:12px 24px;background:#171717;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;">
  Reset Password
</a>
<p style="margin-top:16px;color:#888;font-size:12px;">
  If you didn't request a password reset, you can safely ignore this email.
</p>`;

export const EMAIL_CONFIRMATION_OTP = `<!-- Email OTP Confirmation -->
<h2>Verify Your Email</h2>
<p>Your confirmation code is:</p>
<div style="font-size:32px;font-weight:700;letter-spacing:4px;text-align:center;padding:16px;background:#f5f5f5;border-radius:8px;margin:16px 0;font-family:monospace;">
  {{ .Token }}
</div>
<p style="color:#888;font-size:12px;">
  This code expires in 10 minutes. If you didn't request this, ignore this email.
</p>`;

export const MAGIC_LINK_EMAIL = `<!-- Magic Link -->
<h2>Sign in to Dr. Token System</h2>
<p>Click the button below to sign in instantly.</p>
<a href="{{ .ConfirmationURL }}" 
   style="display:inline-block;padding:12px 24px;background:#171717;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;">
  Sign In
</a>
<p style="margin-top:16px;color:#888;font-size:12px;">
  If you didn't request this link, you can safely ignore this email.
</p>`;

/**
 * Mailjet SMTP Configuration Guide
 *
 * 1. Go to Supabase Dashboard → Authentication → Settings
 * 2. Scroll to "SMTP Settings"
 * 3. Enable Custom SMTP
 * 4. Enter these values:
 *
 *    SMTP Host:     in-v3.mailjet.com
 *    SMTP Port:     587
 *    SMTP Username: (your Mailjet API Key)
 *    SMTP Password: (your Mailjet Secret Key)
 *    Sender Name:   Dr. Token System
 *    Sender Email:  noreply@drtokensystem.com
 *
 * 5. Click "Save"
 * 6. Go to "Email Templates" tab
 * 7. Customize each template with the HTML above
 *
 * Mailjet API Keys: https://app.mailjet.com/account/apikeys
 */
