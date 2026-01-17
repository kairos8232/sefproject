-- Enable pg_cron for scheduled jobs (Supabase supports this extension)
create extension if not exists pg_cron;

-- Function: auto-cancel events and venue bookings based on time and status criteria
create or replace function public.auto_cancel_outdated_bookings()
returns void
language plpgsql
as $$
begin
  -- Cancel events where:
  --  - event.status = 'pending'
  --  - event.end_datetime < now()
  --  - has at least one pending venue booking
  --  - has zero approved venue bookings
  update events e
  set status = 'cancelled', updated_at = now()
  where e.status = 'pending'
    and e.end_datetime < now()
    and exists (
      select 1 from venue_bookings vb
      where vb.event_id = e.id and vb.status = 'pending'
    )
    and not exists (
      select 1 from venue_bookings vb
      where vb.event_id = e.id and vb.status = 'approved'
    );

  -- Cancel pending venue_bookings for events cancelled above
  update venue_bookings vb
  set status = 'cancelled',
      cancellation_reason = 'Auto-cancelled with event: pending after event end time',
      updated_at = now()
  where vb.status = 'pending'
    and exists (
      select 1 from events e
      where e.id = vb.event_id and e.status = 'cancelled'
    );

  -- Cancel pending resource requests tied to events cancelled above
  update resource_requests rr
  set status = 'cancelled',
      cancellation_reason = 'Auto-cancelled: event cancelled',
      updated_at = now()
  where rr.status = 'pending'
    and exists (
      select 1 from events e
      where e.id = rr.event_id and e.status = 'cancelled'
    );

  -- Safety net: cancel any remaining pending venue bookings whose requested_end_datetime has passed
  update venue_bookings vb
  set status = 'cancelled',
      cancellation_reason = 'Auto-cancelled: pending after requested end time',
      updated_at = now()
  where vb.status = 'pending'
    and vb.requested_end_datetime < now();
end;
$$;

-- Schedule the function to run every 30 minutes
-- Name the job for easy identification
select cron.schedule(
  'auto_cancel_outdated_bookings_job',
  '*/30 * * * *',
  $$select public.auto_cancel_outdated_bookings();$$
);

-- Optional: run once immediately
select public.auto_cancel_outdated_bookings();
