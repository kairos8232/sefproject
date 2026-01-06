require('dotenv').config();
const supabase = require('./config/supabase');

async function checkData() {
  try {
    // Check FCI faculty manager
    const { data: fciManagers } = await supabase
      .from('users')
      .select('id, email, name, role, faculty_id')
      .eq('email', 'alice.wong@fci.edu')
      .single();
    
    console.log('FCI Faculty Manager:', fciManagers);

    // Check FCI faculty
    const { data: fciFaculty } = await supabase
      .from('faculties')
      .select('*')
      .eq('code', 'FCI')
      .single();
    
    console.log('FCI Faculty:', fciFaculty);

    // Check LT-FCI-01 venue
    const { data: venue } = await supabase
      .from('venues')
      .select('*')
      .eq('code', 'LT-FCI-01')
      .single();
    
    console.log('LT-FCI-01 Venue:', venue);

    // Check the test event
    const { data: event } = await supabase
      .from('events')
      .select(`
        *,
        venue_bookings (
          id,
          status,
          venue:venue_id (
            id,
            code,
            name,
            faculty_id
          )
        )
      `)
      .eq('id', 'a4444444-4444-4444-4444-444444444444')
      .single();
    
    console.log('\nEvent a4444444 (Tech Talk):');
    console.log('Event name:', event.event_name);
    console.log('Venue bookings:', JSON.stringify(event.venue_bookings, null, 2));

    // Compare faculty IDs
    console.log('\n=== COMPARISON ===');
    console.log('User faculty_id:', fciManagers?.faculty_id);
    console.log('Venue faculty_id:', venue?.faculty_id);
    console.log('Match?', fciManagers?.faculty_id === venue?.faculty_id);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkData();
