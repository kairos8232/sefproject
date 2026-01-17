const supabase = require('../config/supabase');

// Auto-cancel venue bookings that remain pending after their requested end time
// Also cancel events past end time that have no approved venue bookings
async function autoCancelOutdatedBookings() {
  const nowIso = new Date().toISOString();
  try {
    // 1) Cancel events where:
    //    - end time has passed
    //    - event status is 'pending'
    //    - has at least one pending venue booking
    //    - has no approved venue booking
    const { data: candidateEvents, error: candErr } = await supabase
      .from('events')
      .select('id, end_datetime, status')
      .lt('end_datetime', nowIso)
      .eq('status', 'pending');

    if (candErr) throw candErr;

    const eventsToCancel = [];
    for (const ev of candidateEvents || []) {
      const { data: pendingBookings, error: pendErr } = await supabase
        .from('venue_bookings')
        .select('id')
        .eq('event_id', ev.id)
        .eq('status', 'pending');
      if (pendErr) throw pendErr;

      const { data: approvedBookings, error: apprErr } = await supabase
        .from('venue_bookings')
        .select('id')
        .eq('event_id', ev.id)
        .eq('status', 'approved')
        .limit(1);
      if (apprErr) throw apprErr;

      if ((pendingBookings?.length || 0) > 0 && (!approvedBookings || approvedBookings.length === 0)) {
        eventsToCancel.push({ id: ev.id });
      }
    }

    if (eventsToCancel.length > 0) {
      const eventIds = eventsToCancel.map(e => e.id);
      const { error: cancelEvErr } = await supabase
        .from('events')
        .update({ status: 'cancelled', updated_at: nowIso })
        .in('id', eventIds);
      if (cancelEvErr) throw cancelEvErr;
      console.log(`[AutoCancel] Cancelled ${eventIds.length} events (pending, past end, venues pending, none approved)`);

      // Also cancel their pending venue bookings
      const { error: cancelVbErr } = await supabase
        .from('venue_bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: 'Auto-cancelled with event: pending after event end time',
          updated_at: nowIso
        })
        .in('event_id', eventIds)
        .eq('status', 'pending');
      if (cancelVbErr) throw cancelVbErr;

      // Also cancel their pending resource requests
      const { error: cancelRrErr } = await supabase
        .from('resource_requests')
        .update({
          status: 'cancelled',
          cancellation_reason: 'Auto-cancelled: event cancelled',
          updated_at: nowIso
        })
        .in('event_id', eventIds)
        .eq('status', 'pending');
      if (cancelRrErr) throw cancelRrErr;
    }

    // 2) As a safety net, cancel any remaining pending venue bookings with requested_end_datetime passed
    const { data: outdatedBookings, error: fetchErr } = await supabase
      .from('venue_bookings')
      .select('id')
      .eq('status', 'pending')
      .lt('requested_end_datetime', nowIso);
    if (fetchErr) throw fetchErr;

    if (Array.isArray(outdatedBookings) && outdatedBookings.length > 0) {
      const ids = outdatedBookings.map(b => b.id);
      const { error: cancelErr } = await supabase
        .from('venue_bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: 'Auto-cancelled: pending after requested end time',
          updated_at: nowIso
        })
        .in('id', ids);

      if (cancelErr) throw cancelErr;
      console.log(`[AutoCancel] Cancelled ${ids.length} outdated pending venue bookings`);
    }
  } catch (error) {
    // Suppress transient network errors but log meaningful ones
    const msg = error?.message || String(error);
    if (!msg.includes('fetch failed') && !msg.includes('ETIMEDOUT') && !msg.includes('ConnectTimeoutError')) {
      console.error('[AutoCancel] Error:', error);
    }
  }
}

module.exports = { autoCancelOutdatedBookings };
