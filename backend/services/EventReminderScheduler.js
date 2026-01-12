const cron = require('node-cron');
const supabase = require('../config/supabase');
const EmailService = require('./EmailService');

class EventReminderScheduler {
  constructor() {
    this.job = null;
  }

  // Start the scheduler (runs every hour)
  start() {
    // Run every hour at minute 0
    this.job = cron.schedule('0 * * * *', async () => {
      await this.sendEventReminders();
    });
  }

  // Stop the scheduler
  stop() {
    if (this.job) {
      this.job.stop();
    }
  }

  // Send reminders for events happening in 24 hours
  async sendEventReminders() {
    try {
      // Calculate time window: events starting between 23-25 hours from now
      const now = new Date();
      const startWindow = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 hours from now
      const endWindow = new Date(now.getTime() + 25 * 60 * 60 * 1000);   // 25 hours from now

      // Get events in the time window
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          id,
          event_name,
          description,
          start_datetime,
          end_datetime,
          location,
          status
        `)
        .gte('start_datetime', startWindow.toISOString())
        .lte('start_datetime', endWindow.toISOString())
        .in('status', ['upcoming', 'ongoing'])
        .order('start_datetime', { ascending: true });

      if (error) {
        console.error('Error fetching events for reminders:', error);
        return;
      }

      if (!events || events.length === 0) {
        return;
      }

      // Send reminder for each event
      for (const event of events) {
        try {
          // Get registered participants for this event
          const { data: participants, error: partError } = await supabase
            .from('event_participation')
            .select(`
              id,
              status,
              user:user_id (
                id,
                email,
                name
              )
            `)
            .eq('event_id', event.id)
            .eq('status', 'registered');

          if (partError) {
            console.error(`Error fetching participants for event ${event.id}:`, partError);
            continue;
          }

          if (!participants || participants.length === 0) {
            continue;
          }

          // Send reminder emails
          await EmailService.sendEventReminder(participants, event);

          // Optional: Mark that reminder was sent (requires a reminder_sent field in events table)
          // await supabase
          //   .from('events')
          //   .update({ reminder_sent: true })
          //   .eq('id', event.id);

        } catch (eventError) {
          console.error(`Error sending reminder for event ${event.id}:`, eventError);
        }
      }

      console.log('✅ Event reminder scheduler completed');
    } catch (error) {
      console.error('Error in event reminder scheduler:', error);
    }
  }

  // Manual trigger (for testing)
  async triggerManually() {
    console.log('🔔 Manually triggering event reminder scheduler...');
    await this.sendEventReminders();
  }
}

module.exports = new EventReminderScheduler();
