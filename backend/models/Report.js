const supabase = require('../config/supabase');

class Report {
  // Event Summary Report
  static async getEventSummary(filters = {}) {
    const { startDate, endDate, facultyId, eventType } = filters;
    
    console.log('getEventSummary filters:', { startDate, endDate, facultyId, eventType });
    
    let query = supabase
      .from('events')
      .select(`
        *,
        organizer:users!organizer_id (id, name, email, role, faculty_id)
      `);
    
    if (startDate) {
      query = query.gte('start_datetime', startDate);
    }
    if (endDate) {
      query = query.lte('end_datetime', endDate);
    }
    if (eventType) {
      query = query.eq('event_type', eventType);
    }
    
    const { data: events, error } = await query;
    
    if (error) {
      console.error('Supabase error in getEventSummary:', error);
      throw error;
    }
    
    // Filter by faculty_id client-side (events don't have faculty_id, need to check organizer's faculty)
    let filteredEvents = events;
    if (facultyId) {
      filteredEvents = events.filter(event => event.organizer?.faculty_id === facultyId);
    }
    
    console.log('Total events:', events?.length, 'Filtered events:', filteredEvents?.length);
    
    return filteredEvents || [];
  }
  
  // Venue Utilization Report
  static async getVenueUtilization(filters = {}) {
    const { startDate, endDate, facultyId, venueId } = filters;
    
    console.log('getVenueUtilization filters:', { startDate, endDate, facultyId, venueId });
    
    let query = supabase
      .from('venue_bookings')
      .select(`
        *,
        venue:venues(id, code, name, faculty_id)
      `)
      .eq('status', 'approved');
    
    if (startDate) {
      query = query.gte('approved_start_datetime', startDate);
    }
    if (endDate) {
      query = query.lte('approved_end_datetime', endDate);
    }
    if (venueId) {
      query = query.eq('venue_id', venueId);
    }
    
    const { data: bookings, error } = await query;
    
    if (error) {
      console.error('Supabase error in getVenueUtilization:', error);
      throw error;
    }
    
    // Also get venue availability blocks
    let blockQuery = supabase
      .from('venue_availability_blocks')
      .select(`
        *,
        venue:venues(id, code, name, faculty_id)
      `);
    
    if (startDate) {
      blockQuery = blockQuery.gte('blocked_start_datetime', startDate);
    }
    if (endDate) {
      blockQuery = blockQuery.lte('blocked_end_datetime', endDate);
    }
    if (venueId) {
      blockQuery = blockQuery.eq('venue_id', venueId);
    }
    
    const { data: blocks } = await blockQuery;
    
    // Filter by faculty if needed (client-side since we need to check venue.faculty_id)
    let filteredBookings = bookings || [];
    let filteredBlocks = blocks || [];
    
    if (facultyId) {
      filteredBookings = filteredBookings.filter(b => b.venue?.faculty_id === facultyId);
      filteredBlocks = filteredBlocks.filter(b => b.venue?.faculty_id === facultyId);
    }
    
    console.log('Filtered bookings:', filteredBookings.length, 'blocks:', filteredBlocks.length);
    
    return {
      bookings: filteredBookings,
      blocks: filteredBlocks
    };
  }
  
  // Booking and Cancellation Statistics
  static async getBookingStatistics(filters = {}) {
    const { startDate, endDate, facultyId } = filters;
    
    console.log('getBookingStatistics filters:', { startDate, endDate, facultyId });
    
    let query = supabase
      .from('venue_bookings')
      .select(`
        *,
        venue:venues(id, code, name, faculty_id)
      `);
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    const { data: bookings, error } = await query;
    
    if (error) {
      console.error('Supabase error in getBookingStatistics:', error);
      throw error;
    }
    
    let filteredBookings = bookings || [];
    
    if (facultyId) {
      filteredBookings = filteredBookings.filter(b => b.venue?.faculty_id === facultyId);
    }
    
    console.log('Filtered bookings:', filteredBookings.length);
    
    return filteredBookings;
  }
  
  // Resource Usage Report
  static async getResourceUsage(filters = {}) {
    const { startDate, endDate, facultyId, resourceTypeId } = filters;
    
    console.log('getResourceUsage filters:', { startDate, endDate, facultyId, resourceTypeId });
    
    let query = supabase
      .from('resource_requests')
      .select('*');
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (resourceTypeId) {
      query = query.eq('resource_id', resourceTypeId);
    }
    
    const { data: requests, error } = await query;
    
    if (error) {
      console.error('Supabase error in getResourceUsage:', error);
      throw error;
    }
    
    let filteredRequests = requests || [];
    
    // For faculty filtering, we need to get event and venue info
    if (facultyId && filteredRequests.length > 0) {
      try {
        // Get unique event IDs and venue_booking IDs
        const eventIds = [...new Set(filteredRequests.map(r => r.event_id).filter(Boolean))];
        const venueBookingIds = [...new Set(filteredRequests.map(r => r.venue_booking_id).filter(Boolean))];
        
        console.log('Looking up events:', eventIds.length, 'venue_bookings:', venueBookingIds.length);
        
        // Get events with organizer info
        let eventsMap = {};
        if (eventIds.length > 0) {
          const { data: events, error: eventsError } = await supabase
            .from('events')
            .select('id, organizer_id')
            .in('id', eventIds);
          
          if (eventsError) {
            console.error('Error fetching events:', eventsError);
          } else if (events && events.length > 0) {
            // Get organizer faculty_ids
            const organizerIds = [...new Set(events.map(e => e.organizer_id).filter(Boolean))];
            if (organizerIds.length > 0) {
              const { data: organizers, error: orgError } = await supabase
                .from('users')
                .select('id, faculty_id')
                .in('id', organizerIds);
              
              if (!orgError && organizers) {
                const organizersMap = organizers.reduce((map, user) => {
                  map[user.id] = user.faculty_id;
                  return map;
                }, {});
                
                // Map events to faculty_ids
                events.forEach(event => {
                  eventsMap[event.id] = organizersMap[event.organizer_id] || null;
                });
              }
            }
          }
        }
        
        // Get venue_bookings with venue info
        let venueBookingsMap = {};
        if (venueBookingIds.length > 0) {
          const { data: venueBookings, error: vbError } = await supabase
            .from('venue_bookings')
            .select('id, venue_id')
            .in('id', venueBookingIds);
          
          if (vbError) {
            console.error('Error fetching venue_bookings:', vbError);
          } else if (venueBookings && venueBookings.length > 0) {
            // Get venue faculty_ids
            const venueIds = [...new Set(venueBookings.map(vb => vb.venue_id).filter(Boolean))];
            if (venueIds.length > 0) {
              const { data: venues, error: venuesError } = await supabase
                .from('venues')
                .select('id, faculty_id')
                .in('id', venueIds);
              
              if (!venuesError && venues) {
                const venuesMap = venues.reduce((map, venue) => {
                  map[venue.id] = venue.faculty_id;
                  return map;
                }, {});
                
                // Map venue_bookings to faculty_ids
                venueBookings.forEach(vb => {
                  venueBookingsMap[vb.id] = venuesMap[vb.venue_id] || null;
                });
              }
            }
          }
        }
        
        // Filter by faculty
        filteredRequests = filteredRequests.filter(r => {
          const eventFacultyId = r.event_id ? eventsMap[r.event_id] : null;
          const venueFacultyId = r.venue_booking_id ? venueBookingsMap[r.venue_booking_id] : null;
          return eventFacultyId === facultyId || venueFacultyId === facultyId;
        });
      } catch (err) {
        console.error('Error during faculty filtering in getResourceUsage:', err);
        // Continue without filtering if there's an error
      }
    }
    
    console.log('Filtered resource requests:', filteredRequests.length);
    
    // Enrich the data with resource type names, event names, and venue names
    if (filteredRequests.length > 0) {
      try {
        // Get resource types
        const resourceIds = [...new Set(filteredRequests.map(r => r.resource_id).filter(Boolean))];
        let resourceTypesMap = {};
        if (resourceIds.length > 0) {
          const { data: resourceTypes } = await supabase
            .from('resource_types')
            .select('id, name, code')
            .in('id', resourceIds);
          if (resourceTypes) {
            resourceTypesMap = resourceTypes.reduce((map, rt) => {
              map[rt.id] = rt;
              return map;
            }, {});
          }
        }
        
        // Get events
        const eventIds = [...new Set(filteredRequests.map(r => r.event_id).filter(Boolean))];
        let eventsMap = {};
        if (eventIds.length > 0) {
          const { data: events } = await supabase
            .from('events')
            .select('id, name')
            .in('id', eventIds);
          if (events) {
            eventsMap = events.reduce((map, e) => {
              map[e.id] = e;
              return map;
            }, {});
          }
        }
        
        // Get venue bookings and venues
        const vbIds = [...new Set(filteredRequests.map(r => r.venue_booking_id).filter(Boolean))];
        let venueBookingsMap = {};
        if (vbIds.length > 0) {
          const { data: venueBookings } = await supabase
            .from('venue_bookings')
            .select('id, venue_id')
            .in('id', vbIds);
          if (venueBookings) {
            const venueIds = [...new Set(venueBookings.map(vb => vb.venue_id).filter(Boolean))];
            if (venueIds.length > 0) {
              const { data: venues } = await supabase
                .from('venues')
                .select('id, code, name')
                .in('id', venueIds);
              if (venues) {
                const venuesMap = venues.reduce((map, v) => {
                  map[v.id] = v;
                  return map;
                }, {});
                venueBookings.forEach(vb => {
                  venueBookingsMap[vb.id] = venuesMap[vb.venue_id];
                });
              }
            }
          }
        }
        
        // Enrich the requests with names
        filteredRequests = filteredRequests.map(r => ({
          ...r,
          resource_type_name: resourceTypesMap[r.resource_id]?.name || null,
          resource_type_code: resourceTypesMap[r.resource_id]?.code || null,
          event_name: eventsMap[r.event_id]?.name || null,
          venue_code: venueBookingsMap[r.venue_booking_id]?.code || null,
          venue_name: venueBookingsMap[r.venue_booking_id]?.name || null
        }));
      } catch (err) {
        console.error('Error enriching resource request data:', err);
      }
    }
    
    return filteredRequests;
  }
  
  // Get participation trends
  static async getParticipationTrends(filters = {}) {
    const { startDate, endDate, facultyId } = filters;
    
    console.log('getParticipationTrends filters:', { startDate, endDate, facultyId });
    
    let query = supabase
      .from('event_participation')
      .select('*');
    
    if (startDate) {
      query = query.gte('registered_at', startDate);
    }
    if (endDate) {
      query = query.lte('registered_at', endDate);
    }
    
    const { data: participations, error } = await query;
    
    if (error) {
      console.error('Supabase error in getParticipationTrends:', error);
      throw error;
    }
    
    let filteredParticipations = participations || [];
    
    // For faculty filtering, we need to get event and organizer info
    if (facultyId && filteredParticipations.length > 0) {
      try {
        // Get unique event IDs
        const eventIds = [...new Set(filteredParticipations.map(p => p.event_id).filter(Boolean))];
        
        console.log('Looking up events for participations:', eventIds.length);
        
        // Get events with organizer info
        let eventsMap = {};
        if (eventIds.length > 0) {
          const { data: events, error: eventsError } = await supabase
            .from('events')
            .select('id, organizer_id')
            .in('id', eventIds);
          
          if (eventsError) {
            console.error('Error fetching events:', eventsError);
          } else if (events && events.length > 0) {
            // Get organizer faculty_ids
            const organizerIds = [...new Set(events.map(e => e.organizer_id).filter(Boolean))];
            if (organizerIds.length > 0) {
              const { data: organizers, error: orgError } = await supabase
                .from('users')
                .select('id, faculty_id')
                .in('id', organizerIds);
              
              if (!orgError && organizers) {
                const organizersMap = organizers.reduce((map, user) => {
                  map[user.id] = user.faculty_id;
                  return map;
                }, {});
                
                // Map events to faculty_ids
                events.forEach(event => {
                  eventsMap[event.id] = organizersMap[event.organizer_id] || null;
                });
              }
            }
          }
        }
        
        // Filter by faculty
        filteredParticipations = filteredParticipations.filter(p => {
          const eventFacultyId = p.event_id ? eventsMap[p.event_id] : null;
          return eventFacultyId === facultyId;
        });
      } catch (err) {
        console.error('Error during faculty filtering in getParticipationTrends:', err);
        // Continue without filtering if there's an error
      }
    }
    
    console.log('Filtered participations:', filteredParticipations.length);
    
    // Enrich the data with event names and user names
    if (filteredParticipations.length > 0) {
      try {
        // Get events
        const eventIds = [...new Set(filteredParticipations.map(p => p.event_id).filter(Boolean))];
        let eventsMap = {};
        if (eventIds.length > 0) {
          const { data: events } = await supabase
            .from('events')
            .select('id, name, event_type')
            .in('id', eventIds);
          if (events) {
            eventsMap = events.reduce((map, e) => {
              map[e.id] = e;
              return map;
            }, {});
          }
        }
        
        // Get users (participants)
        const userIds = [...new Set(filteredParticipations.map(p => p.user_id).filter(Boolean))];
        let usersMap = {};
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, name, email')
            .in('id', userIds);
          if (users) {
            usersMap = users.reduce((map, u) => {
              map[u.id] = u;
              return map;
            }, {});
          }
        }
        
        // Enrich the participations with names
        filteredParticipations = filteredParticipations.map(p => ({
          ...p,
          event_name: eventsMap[p.event_id]?.name || null,
          event_type: eventsMap[p.event_id]?.event_type || null,
          user_name: usersMap[p.user_id]?.name || null,
          user_email: usersMap[p.user_id]?.email || null
        }));
      } catch (err) {
        console.error('Error enriching participation data:', err);
      }
    }
    
    return filteredParticipations;
  }

  // User Activity Analytics
  static async getUserActivityAnalytics(filters = {}) {
    const { startDate, endDate, facultyId } = filters;

    try {
      // 1. Top Event Creators (by approved events)
      let eventsQuery = supabase
        .from('events')
        .select('organizer_id, organizer:users!organizer_id(id, name, email, staff_id, faculty_id)');
      
      if (startDate) eventsQuery = eventsQuery.gte('start_datetime', startDate);
      if (endDate) eventsQuery = eventsQuery.lte('end_datetime', endDate);
      
      const { data: events, error: eventsError } = await eventsQuery;
      if (eventsError) throw eventsError;

      // Filter by faculty if specified
      let filteredEvents = events;
      if (facultyId) {
        filteredEvents = events.filter(e => e.organizer?.faculty_id === facultyId);
      }

      // Count events per organizer
      const organizerCounts = {};
      filteredEvents.forEach(event => {
        if (event.organizer_id) {
          if (!organizerCounts[event.organizer_id]) {
            organizerCounts[event.organizer_id] = {
              user: event.organizer,
              eventCount: 0
            };
          }
          organizerCounts[event.organizer_id].eventCount++;
        }
      });

      const topCreators = Object.values(organizerCounts)
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 5)
        .map(item => ({
          name: item.user?.name || 'Unknown',
          staffId: item.user?.staff_id || '-',
          eventCount: item.eventCount
        }));

      // 2. Most Rejected Venue/Resource Requests
      let venueBookingsQuery = supabase
        .from('venue_bookings')
        .select('requester_user_id, status, requester:users!requester_user_id(id, name, email, staff_id, faculty_id)');
      
      if (startDate) venueBookingsQuery = venueBookingsQuery.gte('created_at', startDate);
      if (endDate) venueBookingsQuery = venueBookingsQuery.lte('created_at', endDate);

      const { data: venueBookings, error: vbError } = await venueBookingsQuery;
      if (vbError) throw vbError;

      let resourceRequestsQuery = supabase
        .from('resource_requests')
        .select('requester_user_id, status, requester:users!requester_user_id(id, name, email, staff_id, faculty_id)');
      
      if (startDate) resourceRequestsQuery = resourceRequestsQuery.gte('created_at', startDate);
      if (endDate) resourceRequestsQuery = resourceRequestsQuery.lte('created_at', endDate);

      const { data: resourceRequests, error: rrError } = await resourceRequestsQuery;
      if (rrError) throw rrError;

      // Filter by faculty if specified
      let filteredVenueBookings = venueBookings;
      let filteredResourceRequests = resourceRequests;
      if (facultyId) {
        filteredVenueBookings = venueBookings.filter(b => b.requester?.faculty_id === facultyId);
        filteredResourceRequests = resourceRequests.filter(r => r.requester?.faculty_id === facultyId);
      }

      // Calculate rejection rates
      const userStats = {};
      [...filteredVenueBookings, ...filteredResourceRequests].forEach(req => {
        const userId = req.requester_user_id;
        if (!userId) return;

        if (!userStats[userId]) {
          userStats[userId] = {
            user: req.requester,
            total: 0,
            rejected: 0,
            approved: 0,
            pending: 0,
            cancelled: 0
          };
        }
        userStats[userId].total++;
        if (req.status === 'rejected') userStats[userId].rejected++;
        if (req.status === 'approved') userStats[userId].approved++;
        if (req.status === 'pending') userStats[userId].pending++;
        if (req.status === 'cancelled') userStats[userId].cancelled++;
      });

      const highRejectionUsers = Object.values(userStats)
        .filter(stat => stat.total >= 3) // At least 3 requests
        .map(stat => ({
          name: stat.user?.name || 'Unknown',
          staffId: stat.user?.staff_id || '-',
          total: stat.total,
          rejected: stat.rejected,
          rejectionRate: ((stat.rejected / stat.total) * 100).toFixed(1)
        }))
        .filter(stat => stat.rejectionRate > 30) // More than 30% rejection
        .sort((a, b) => b.rejectionRate - a.rejectionRate)
        .slice(0, 5);

      // 3. Most Active Requesters
      const mostActiveRequesters = Object.values(userStats)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map(stat => ({
          name: stat.user?.name || 'Unknown',
          staffId: stat.user?.staff_id || '-',
          totalRequests: stat.total,
          approved: stat.approved,
          pending: stat.pending,
          rejected: stat.rejected
        }));

      // 4. Cancellation Patterns
      const cancellationStats = Object.values(userStats)
        .filter(stat => stat.cancelled > 0)
        .map(stat => ({
          name: stat.user?.name || 'Unknown',
          staffId: stat.user?.staff_id || '-',
          cancelled: stat.cancelled,
          total: stat.total,
          cancellationRate: ((stat.cancelled / stat.total) * 100).toFixed(1)
        }))
        .filter(stat => stat.cancellationRate > 20) // More than 20% cancellation
        .sort((a, b) => b.cancellationRate - a.cancellationRate)
        .slice(0, 5);

      return {
        topCreators,
        highRejectionUsers,
        mostActiveRequesters,
        cancellationStats
      };

    } catch (error) {
      console.error('Error in getUserActivityAnalytics:', error);
      throw error;
    }
  }
}

module.exports = Report;
