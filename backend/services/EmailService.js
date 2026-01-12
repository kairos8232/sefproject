const { Resend } = require('resend');

class EmailService {
  constructor() {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️  RESEND_API_KEY is not set!');
    }
    
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@yourdomain.com';
  }

  // Generic email sender
  async sendEmail({ to, subject, html, text }) {
    try {
      // Only send emails to configured allowed email (Resend test domain restriction)
      const allowedEmail = process.env.ALLOWED_2FA_EMAIL;
      
      if (allowedEmail && to !== allowedEmail) {
        // Return fake success response for non-allowed emails
        return { data: { id: 'skipped-' + Date.now() }, error: null };
      }
      
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is not configured. Please set it in .env file.');
      }
      
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      });
      
      // Check if Resend returned an error in the response
      if (result.error) {
        throw new Error(`Resend API Error: ${result.error.message}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error.message);
      throw error;
    }
  }

  // Strip HTML for plain text fallback
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // 2FA Code Email
  async send2FACode(email, code, userName) {
    const subject = '🔐 Your Two-Factor Authentication Code';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .code { background: white; border: 2px dashed #4F46E5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Two-Factor Authentication</h1>
          </div>
          <div class="content">
            <p>Hi ${userName || 'User'},</p>
            <p>Your two-factor authentication code is:</p>
            <div class="code">${code}</div>
            <p><strong>This code will expire in 10 minutes.</strong></p>
            <p>If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
          </div>
          <div class="footer">
            <p>© 2026 Event Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({ to: email, subject, html });
  }

  // Event Registration Confirmation
  async sendRegistrationConfirmation(userEmail, userName, event) {
    const subject = `✅ Registration Confirmed: ${event.event_name}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .event-details { background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 4px; }
          .detail-row { margin: 10px 0; }
          .label { font-weight: bold; color: #374151; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Registration Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>You have successfully registered for the following event:</p>
            <div class="event-details">
              <div class="detail-row"><span class="label">Event:</span> ${event.event_name}</div>
              <div class="detail-row"><span class="label">Date:</span> ${new Date(event.start_datetime).toLocaleString()}</div>
              <div class="detail-row"><span class="label">Location:</span> ${event.location || 'TBD'}</div>
              ${event.description ? `<div class="detail-row"><span class="label">Description:</span> ${event.description}</div>` : ''}
            </div>
            <p>You will receive a reminder email one day before the event.</p>
            <p>Thank you for registering!</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({ to: userEmail, subject, html });
  }

  // Event Created Notification (to organizer)
  async sendEventCreatedConfirmation(organizerEmail, organizerName, event) {
    const subject = `✅ Event Created: ${event.event_name}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .event-details { background: white; padding: 20px; border-left: 4px solid #6366f1; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Event Created Successfully</h1>
          </div>
          <div class="content">
            <p>Hi ${organizerName},</p>
            <p>Your event has been created successfully:</p>
            <div class="event-details">
              <div><strong>Event:</strong> ${event.event_name}</div>
              <div><strong>Date:</strong> ${new Date(event.start_datetime).toLocaleString()}</div>
              <div><strong>Status:</strong> ${event.status}</div>
            </div>
            <p>Next steps: Request venue and resources if needed.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({ to: organizerEmail, subject, html });
  }

  // Event Updated Notification
  async sendEventUpdatedNotification(participants, event) {
    const subject = `📝 Event Updated: ${event.event_name}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .event-details { background: white; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Event Updated</h1>
          </div>
          <div class="content">
            <p>Hi,</p>
            <p>An event you registered for has been updated:</p>
            <div class="event-details">
              <div><strong>Event:</strong> ${event.event_name}</div>
              <div><strong>New Date:</strong> ${new Date(event.start_datetime).toLocaleString()}</div>
              <div><strong>Status:</strong> ${event.status}</div>
            </div>
            <p>Please review the updated details.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Send to all participants
    const emailPromises = participants.map(p => 
      this.sendEmail({ to: p.user.email, subject, html })
    );
    return Promise.allSettled(emailPromises);
  }

  // Event Deleted Notification
  async sendEventDeletedNotification(participants, eventName) {
    const subject = `❌ Event Cancelled: ${eventName}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .alert { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Event Cancelled</h1>
          </div>
          <div class="content">
            <p>Hi,</p>
            <div class="alert">
              <strong>Important:</strong> The event "${eventName}" has been cancelled by the organizer.
            </div>
            <p>We apologize for any inconvenience. Your registration has been automatically cancelled.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const emailPromises = participants.map(p => 
      this.sendEmail({ to: p.user.email, subject, html })
    );
    return Promise.allSettled(emailPromises);
  }

  // Registration Closed Notification
  async sendRegistrationClosedNotification(participants, event, reason = 'manual') {
    const subject = `🔒 Registration Closed: ${event.event_name}`;
    const reasonText = reason === 'capacity' 
      ? 'The event has reached maximum capacity.' 
      : 'Registration has been closed by the organizer.';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #64748b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Registration Closed</h1>
          </div>
          <div class="content">
            <p>Hi,</p>
            <p>Registration for "${event.event_name}" is now closed.</p>
            <p>${reasonText}</p>
            <p>Your existing registration remains valid. We look forward to seeing you at the event!</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const emailPromises = participants.map(p => 
      this.sendEmail({ to: p.user.email, subject, html })
    );
    return Promise.allSettled(emailPromises);
  }

  // Registration Reopened Notification
  async sendRegistrationReopenedNotification(interestedUsers, event) {
    const subject = `🔓 Registration Reopened: ${event.event_name}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Registration Reopened!</h1>
          </div>
          <div class="content">
            <p>Hi,</p>
            <p>Good news! Registration for "${event.event_name}" is now open again.</p>
            <p><strong>Event Date:</strong> ${new Date(event.start_datetime).toLocaleString()}</p>
            <p>Register now before spots fill up!</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const emailPromises = interestedUsers.map(user => 
      this.sendEmail({ to: user.email, subject, html })
    );
    return Promise.allSettled(emailPromises);
  }

  // Venue Booking Request Confirmation
  async sendVenueBookingConfirmation(requesterEmail, requesterName, booking, venue, event) {
    const subject = `📍 Venue Booking Request Submitted: ${venue.name}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .details { background: white; padding: 20px; border-left: 4px solid #8b5cf6; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Venue Booking Request Submitted</h1>
          </div>
          <div class="content">
            <p>Hi ${requesterName},</p>
            <p>Your venue booking request has been submitted:</p>
            <div class="details">
              <div><strong>Venue:</strong> ${venue.name} (${venue.code})</div>
              <div><strong>Event:</strong> ${event.event_name}</div>
              <div><strong>Date:</strong> ${new Date(booking.requested_start_datetime).toLocaleString()}</div>
              <div><strong>Status:</strong> Pending Approval</div>
            </div>
            <p>You will receive an email once your request is reviewed.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({ to: requesterEmail, subject, html });
  }

  // Venue Booking Approved
  async sendVenueBookingApproved(requesterEmail, requesterName, booking, venue, event) {
    const subject = `✅ Venue Booking Approved: ${venue.name}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .details { background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Venue Booking Approved!</h1>
          </div>
          <div class="content">
            <p>Hi ${requesterName},</p>
            <p>Great news! Your venue booking has been approved:</p>
            <div class="details">
              <div><strong>Venue:</strong> ${venue.name}</div>
              <div><strong>Event:</strong> ${event.event_name}</div>
              <div><strong>Date:</strong> ${new Date(booking.approved_start_datetime || booking.requested_start_datetime).toLocaleString()}</div>
              ${booking.approval_notes ? `<div><strong>Notes:</strong> ${booking.approval_notes}</div>` : ''}
            </div>
            <p>Your event is confirmed for this venue!</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({ to: requesterEmail, subject, html });
  }

  // Venue Booking Deleted/Cancelled
  async sendVenueBookingCancelled(requesterEmail, requesterName, venueName, eventName) {
    const subject = `❌ Venue Booking Cancelled: ${venueName}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Venue Booking Cancelled</h1>
          </div>
          <div class="content">
            <p>Hi ${requesterName},</p>
            <p>Your venue booking for <strong>${venueName}</strong> (Event: ${eventName}) has been cancelled.</p>
            <p>If you have questions, please contact support.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({ to: requesterEmail, subject, html });
  }

  // Resource Request Confirmation
  async sendResourceRequestConfirmation(requesterEmail, requesterName, resources, event) {
    const subject = `🛠️ Resource Request Submitted`;
    const resourceList = resources.map(r => `${r.resource_name} (Qty: ${r.quantity})`).join(', ');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .details { background: white; padding: 20px; border-left: 4px solid #0ea5e9; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Resource Request Submitted</h1>
          </div>
          <div class="content">
            <p>Hi ${requesterName},</p>
            <p>Your resource request has been submitted:</p>
            <div class="details">
              <div><strong>Event:</strong> ${event.event_name}</div>
              <div><strong>Resources:</strong> ${resourceList}</div>
              <div><strong>Status:</strong> Pending Approval</div>
            </div>
            <p>You will receive an email once your request is reviewed.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({ to: requesterEmail, subject, html });
  }

  // Resource Request Approved
  async sendResourceRequestApproved(requesterEmail, requesterName, resources, event) {
    const subject = `✅ Resource Request Approved`;
    const resourceList = resources.map(r => `${r.resource_name} (Qty: ${r.quantity})`).join(', ');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .details { background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Resource Request Approved!</h1>
          </div>
          <div class="content">
            <p>Hi ${requesterName},</p>
            <p>Great news! Your resource request has been approved:</p>
            <div class="details">
              <div><strong>Event:</strong> ${event.event_name}</div>
              <div><strong>Resources:</strong> ${resourceList}</div>
            </div>
            <p>Your resources will be ready for the event!</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({ to: requesterEmail, subject, html });
  }

  // Resource Request Deleted/Cancelled
  async sendResourceRequestCancelled(requesterEmail, requesterName, eventName) {
    const subject = `❌ Resource Request Cancelled`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Resource Request Cancelled</h1>
          </div>
          <div class="content">
            <p>Hi ${requesterName},</p>
            <p>Your resource request for event <strong>${eventName}</strong> has been cancelled.</p>
            <p>If you have questions, please contact support.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({ to: requesterEmail, subject, html });
  }

  // Event Reminder (1 day before)
  async sendEventReminder(participants, event) {
    const subject = `⏰ Reminder: ${event.event_name} is Tomorrow!`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .event-details { background: white; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Event Reminder</h1>
          </div>
          <div class="content">
            <p>Hi,</p>
            <p>This is a friendly reminder that your event is tomorrow:</p>
            <div class="event-details">
              <div><strong>Event:</strong> ${event.event_name}</div>
              <div><strong>Date & Time:</strong> ${new Date(event.start_datetime).toLocaleString()}</div>
              ${event.location ? `<div><strong>Location:</strong> ${event.location}</div>` : ''}
              ${event.description ? `<div><strong>Description:</strong> ${event.description}</div>` : ''}
            </div>
            <p>We look forward to seeing you there!</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const emailPromises = participants.map(p => 
      this.sendEmail({ to: p.user.email, subject, html })
    );
    return Promise.allSettled(emailPromises);
  }
}

module.exports = new EmailService();
