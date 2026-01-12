# Email System Implementation Guide

This document explains the comprehensive email system implemented using Resend for the Event Management System.

## Overview

The email system sends notifications for all major events in the application lifecycle, including:

- **Two-Factor Authentication (2FA)** - Automatic OTP verification on every login
- **Event Management** - Create, edit, delete notifications
- **Registration** - Confirmation, capacity reached, reopening
- **Venue Bookings** - Request, approval, cancellation
- **Resource Requests** - Request, approval, cancellation
- **Event Reminders** - Automated 1-day-before reminders

## Login Flow with 2FA

The system now enforces 2FA on every login:

1. **User enters email and password** on login page
2. **Backend validates credentials** and sends 6-digit OTP to user's email
3. **User redirected to OTP verification page** 
4. **User enters 6-digit code** (auto-submits when complete)
5. **Backend verifies OTP** and issues JWT token
6. **User redirected to dashboard**

The OTP code:
- Expires in 10 minutes
- Can only be used once
- Can be resent with 60-second cooldown

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install resend uuid node-cron
```

### 2. Configure Resend API Key

1. Sign up for [Resend](https://resend.com) and get your API key
2. Add your API key to `.env`:

```env
RESEND_API_KEY=re_your_resend_api_key_here
FROM_EMAIL=noreply@yourdomain.com
```

### 3. Run Database Migration

Run the 2FA table migration:

```bash
# Connect to your Supabase database and execute:
psql -h your-db-host -U your-user -d your-database -f database/migrations/add_2fa_table.sql
```

Or execute directly in Supabase SQL Editor:

```sql
-- Two-Factor Authentication Table
CREATE TABLE IF NOT EXISTS two_factor_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_2fa_user_id ON two_factor_codes(user_id);
CREATE INDEX idx_2fa_expires_at ON two_factor_codes(expires_at);
CREATE INDEX idx_2fa_code ON two_factor_codes(code);

ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
```

### 4. Start the Server

The event reminder scheduler will automatically start when the server starts:

```bash
npm run dev
```

You should see:
```
Server running on port 5000
✅ Event reminder scheduler started (runs every hour)
```

## Email Templates

All email templates are styled with inline CSS for maximum email client compatibility. Each template includes:

- Responsive design (max-width: 600px)
- Professional branding
- Clear call-to-action sections
- Footer with copyright

## API Endpoints

### Login with 2FA

#### Step 1: Login (sends OTP automatically)
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "requiresOTP": true,
  "message": "Verification code sent to your email",
  "email": "user@example.com"
}
```

#### Step 2: Verify OTP (returns JWT token)
```http
POST /api/auth/2fa/verify
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "student",
    "facultyId": "faculty-id"
  }
}
```

#### Resend OTP Code
```http
POST /api/auth/2fa/send
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA code sent to your email"
}
```

## Email Triggers

### Automatic Email Triggers

| Action | Trigger Location | Recipient | Email Type |
|--------|-----------------|-----------|------------|
| Event Created | `EventController.createEvent` | Organizer | Event creation confirmation |
| Event Updated | `EventController.updateEvent` | All registered participants | Event update notification |
| Event Deleted | `EventController.deleteEvent` | All registered participants | Event cancellation |
| Registration | `ParticipationController.register` | Registering user | Registration confirmation |
| Capacity Reached | `ParticipationController.register` | All participants | Registration closed (capacity) |
| Registration Closed (Manual) | `EventController.toggleRegistrationStatus` | All participants | Registration closed (manual) |
| Registration Reopened | `EventController.toggleRegistrationStatus` | Interested users | Registration reopened |
| Venue Booking Created | `VenueBookingController.createVenueBooking` | Requester | Booking request submitted |
| Venue Booking Approved | `VenueBookingController.approveBookingRequest` | Requester | Booking approved |
| Venue Booking Cancelled | `VenueBookingController.cancelVenueBooking` | Requester | Booking cancelled |
| Resource Request Created | `ResourceRequestController.createResourceRequest` | Requester | Request submitted |
| Resource Request Approved | `ResourceRequestController.approveResourceRequest` | Requester | Request approved |
| Resource Request Cancelled | `ResourceRequestController.cancelResourceRequest` | Requester | Request cancelled |
| Event Reminder | `EventReminderScheduler` (cron) | All registered participants | 24-hour reminder |

## Event Reminder Scheduler

The scheduler runs **every hour** and sends reminders for events starting in 24 hours (23-25 hour window).

### Manual Trigger (for testing)

To manually trigger the reminder scheduler:

```javascript
// In your code or via a test endpoint
const EventReminderScheduler = require('./services/EventReminderScheduler');
await EventReminderScheduler.triggerManually();
```

### Scheduler Configuration

The scheduler is configured in `services/EventReminderScheduler.js`:

```javascript
// Runs every hour at minute 0
cron.schedule('0 * * * *', async () => {
  await this.sendEventReminders();
});
```

To change the frequency, modify the cron expression:
- `0 * * * *` - Every hour
- `*/30 * * * *` - Every 30 minutes
- `0 */6 * * *` - Every 6 hours
- `0 9 * * *` - Daily at 9 AM

## Error Handling

All email sends are wrapped in `.catch()` blocks to prevent email failures from breaking core functionality:

```javascript
await EmailService.sendEventCreatedConfirmation(email, name, event)
  .catch(err => console.error('Failed to send event creation email:', err));
```

This ensures that even if email delivery fails:
- The main operation (event creation, booking, etc.) succeeds
- Errors are logged for debugging
- User experience is not disrupted

## Testing

### Test Login with 2FA Flow

```bash
# Step 1: Login with credentials (OTP will be sent to email)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Response will be:
# {
#   "success": true,
#   "requiresOTP": true,
#   "message": "Verification code sent to your email",
#   "email": "test@example.com"
# }

# Step 2: Check your email for the 6-digit code, then verify
curl -X POST http://localhost:5000/api/auth/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "code": "123456"}'

# Response will include JWT token:
# {
#   "success": true,
#   "token": "eyJhbGciOiJIUzI1NiIs...",
#   "user": {...}
# }
```

### Test Resend OTP

```bash
curl -X POST http://localhost:5000/api/auth/2fa/send \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Test Event Reminder

```javascript
// Create a test endpoint in your routes
router.post('/test/reminder', async (req, res) => {
  const EventReminderScheduler = require('../services/EventReminderScheduler');
  await EventReminderScheduler.triggerManually();
  res.json({ success: true, message: 'Reminder test triggered' });
});
```

## Email Service Methods

| Method | Purpose | Parameters |
|--------|---------|------------|
| `send2FACode` | Send 2FA authentication code | `email, code, userName` |
| `sendRegistrationConfirmation` | Confirm event registration | `userEmail, userName, event` |
| `sendEventCreatedConfirmation` | Notify organizer of event creation | `organizerEmail, organizerName, event` |
| `sendEventUpdatedNotification` | Notify participants of event changes | `participants[], event` |
| `sendEventDeletedNotification` | Notify participants of cancellation | `participants[], eventName` |
| `sendRegistrationClosedNotification` | Notify registration closed | `participants[], event, reason` |
| `sendRegistrationReopenedNotification` | Notify registration reopened | `interestedUsers[], event` |
| `sendVenueBookingConfirmation` | Confirm venue booking request | `email, name, booking, venue, event` |
| `sendVenueBookingApproved` | Notify venue booking approved | `email, name, booking, venue, event` |
| `sendVenueBookingCancelled` | Notify venue booking cancelled | `email, name, venueName, eventName` |
| `sendResourceRequestConfirmation` | Confirm resource request | `email, name, resources[], event` |
| `sendResourceRequestApproved` | Notify resource request approved | `email, name, resources[], event` |
| `sendResourceRequestCancelled` | Notify resource request cancelled | `email, name, eventName` |
| `sendEventReminder` | Send 24-hour event reminder | `participants[], event` |

## Customization

### Modify Email Templates

Email templates are defined in `services/EmailService.js`. To customize:

1. Locate the method for the email type (e.g., `sendEventCreatedConfirmation`)
2. Modify the HTML in the `html` variable
3. Update colors, layout, or content as needed

### Change Email Branding

Update the colors and branding in the `<style>` section of each template:

```javascript
.header { background: #4F46E5; } // Change primary color
```

### Add New Email Types

1. Add a new method to `EmailService.js`:

```javascript
async sendCustomNotification(email, data) {
  const subject = 'Your Subject';
  const html = `...your HTML template...`;
  return this.sendEmail({ to: email, subject, html });
}
```

2. Call it from your controller:

```javascript
await EmailService.sendCustomNotification(user.email, data)
  .catch(err => console.error('Failed to send custom email:', err));
```

## Production Considerations

### Domain Verification

Before going to production:

1. Verify your sending domain in Resend dashboard
2. Update `FROM_EMAIL` in `.env` to use your verified domain:
   ```
   FROM_EMAIL=noreply@yourcompany.com
   ```

### Rate Limits

Resend has rate limits based on your plan. For high-volume applications:
- Implement queue-based email sending (e.g., Bull, BullMQ)
- Batch email sends where appropriate
- Monitor Resend dashboard for usage

### Email Delivery Monitoring

- Check Resend dashboard for delivery statistics
- Monitor bounce rates and spam complaints
- Implement webhook handlers for delivery events

## Troubleshooting

### Emails Not Sending

1. **Check API Key**: Ensure `RESEND_API_KEY` is set correctly in `.env`
2. **Check Logs**: Look for error messages in server console
3. **Verify Domain**: Make sure sending domain is verified in Resend
4. **Check Resend Dashboard**: View logs and errors in Resend console

### 2FA Code Not Working

1. **Check Expiry**: Codes expire after 10 minutes
2. **Database**: Ensure `two_factor_codes` table exists
3. **Code Already Used**: Each code can only be used once

### Reminder Not Sending

1. **Check Scheduler**: Verify scheduler started (check server logs)
2. **Event Timing**: Events must be 23-25 hours away
3. **Event Status**: Only `upcoming` or `ongoing` events get reminders
4. **Participants**: Event must have registered participants

## Support

For issues:
- Check server logs for detailed error messages
- Review Resend dashboard for email delivery status
- Verify all environment variables are set correctly

---

**Last Updated:** January 12, 2026
