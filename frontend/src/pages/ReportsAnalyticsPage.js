import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ReportsAnalyticsPage.css';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

function ReportsAnalyticsPage() {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    document.title = 'Reports & Analytics - CESMS';
  }, []);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filter states
  const [reportType, setReportType] = useState('event-summary');
  const [chartType, setChartType] = useState('bar');
  const [dateRange, setDateRange] = useState('last-30-days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [venueSearch, setVenueSearch] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState('');
  
  // Data states
  const [faculties, setFaculties] = useState([]);
  const [venues, setVenues] = useState([]);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [summaryStats, setSummaryStats] = useState({});
  
  useEffect(() => {
    loadFaculties();
    loadVenues();
    loadResourceTypes();
  }, []);
  
  const loadFaculties = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/faculties', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log('Faculties response:', data);
      if (data.success) {
        console.log('Faculties loaded:', data.faculties);
        setFaculties(data.faculties || []);
      }
    } catch (err) {
      console.error('Error loading faculties:', err);
    }
  };
  
  const loadVenues = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/venues', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log('Venues response:', data);
      if (data.success) {
        console.log('Venues loaded:', data.venues);
        setVenues(data.venues || []);
      }
    } catch (err) {
      console.error('Error loading venues:', err);
    }
  };
  
  const loadResourceTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/resource-types', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log('Resource types response:', data);
      if (data.success) {
        console.log('Resource types loaded:', data.resourceTypes);
        setResourceTypes(data.resourceTypes || []);
      }
    } catch (err) {
      console.error('Error loading resource types:', err);
    }
  };
  
  const getDateRangeValues = () => {
    const now = new Date();
    let startDate, endDate;
    
    switch (dateRange) {
      case 'last-7-days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last-30-days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last-90-days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'current-year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        } else {
          return null;
        }
        break;
      default:
        return null;
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  };
  
  const generateReport = async () => {
    setLoading(true);
    setError('');
    
    try {
      const dateValues = getDateRangeValues();
      if (!dateValues) {
        setError('Please select a valid date range');
        setLoading(false);
        return;
      }
      
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        startDate: dateValues.startDate,
        endDate: dateValues.endDate
      });
      
      if (selectedFaculty) params.append('facultyId', selectedFaculty);
      
      // Extract venue ID from search input
      if (venueSearch) {
        const selectedVenueObj = venues.find(v => 
          `${v.code} - ${v.name}` === venueSearch ||
          v.name.toLowerCase() === venueSearch.toLowerCase() ||
          v.code.toLowerCase() === venueSearch.toLowerCase()
        );
        if (selectedVenueObj) {
          params.append('venueId', selectedVenueObj.id);
          console.log('Selected venue ID:', selectedVenueObj.id);
        }
      }
      
      if (selectedEventType) params.append('eventType', selectedEventType);
      if (selectedResourceType) params.append('resourceTypeId', selectedResourceType);
      
      let endpoint = '';
      switch (reportType) {
        case 'event-summary':
          endpoint = 'event-summary';
          break;
        case 'venue-utilization':
          endpoint = 'venue-utilization';
          break;
        case 'booking-statistics':
          endpoint = 'booking-statistics';
          break;
        case 'resource-usage':
          endpoint = 'resource-usage';
          break;
        case 'participation-trends':
          endpoint = 'participation-trends';
          break;
        case 'user-activity':
          endpoint = 'user-activity';
          break;
        default:
          endpoint = 'event-summary';
      }
      
      const apiUrl = `http://localhost:5001/api/reports/${endpoint}?${params.toString()}`;
      
      console.log('Generating report with URL:', apiUrl);
      console.log('Parameters:', {
        reportType,
        selectedFaculty,
        venueSearch,
        selectedEventType,
        selectedResourceType,
        dateRange
      });
      
      const response = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate report');
      }
      
      setReportData(data);
      processReportData(data);
      
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };
  
  const processReportData = (data) => {
    switch (reportType) {
      case 'event-summary':
        processEventSummary(data.events || [], faculties);
        break;
      case 'venue-utilization':
        processVenueUtilization(data, venues);
        break;
      case 'booking-statistics':
        processBookingStatistics(data.bookings || []);
        break;
      case 'resource-usage':
        processResourceUsage(data.requests || [], resourceTypes);
        break;
      case 'participation-trends':
        processParticipationTrends(data.participations || []);
        break;
      case 'user-activity':
        processUserActivityAnalytics(data);
        break;
      default:
        break;
    }
  };
  
  const processEventSummary = (events, facultiesData) => {
    // Summary stats
    const totalEvents = events.length;
    const eventsByType = {};
    const eventsByFaculty = {};
    const eventsByMonth = {};
    
    events.forEach(event => {
      // By type
      const type = event.event_type || 'Unknown';
      eventsByType[type] = (eventsByType[type] || 0) + 1;
      
      // By faculty - get from organizer's faculty_id
      const facultyId = event.organizer?.faculty_id;
      const faculty = facultiesData.find(f => f.id === facultyId);
      const facultyName = faculty?.name || 'Unknown';
      eventsByFaculty[facultyName] = (eventsByFaculty[facultyName] || 0) + 1;
      
      // By month
      const date = new Date(event.start_datetime);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      eventsByMonth[monthYear] = (eventsByMonth[monthYear] || 0) + 1;
    });
    
    setSummaryStats({
      total: totalEvents,
      byType: eventsByType,
      byFaculty: eventsByFaculty
    });
    
    // Chart data
    let chartData = [];
    if (chartType === 'bar' || chartType === 'line') {
      chartData = Object.entries(eventsByMonth).map(([month, count]) => ({
        name: month,
        value: count
      }));
    } else if (chartType === 'pie') {
      chartData = Object.entries(eventsByType).map(([type, count]) => ({
        name: type,
        value: count
      }));
    }
    
    setChartData(chartData);
  };
  
  const processVenueUtilization = (data, venuesData) => {
    const bookings = data.bookings || [];
    const blocks = data.blocks || [];
    
    // Calculate utilization by venue
    const venueStats = {};
    
    bookings.forEach(booking => {
      const venue = venuesData.find(v => v.id === booking.venue_id);
      const venueName = venue?.name || booking.venue_id || 'Unknown';
      if (!venueStats[venueName]) {
        venueStats[venueName] = { bookings: 0, hours: 0 };
      }
      venueStats[venueName].bookings += 1;
      
      // Calculate hours
      const start = new Date(booking.approved_start_datetime);
      const end = new Date(booking.approved_end_datetime);
      const hours = (end - start) / (1000 * 60 * 60);
      venueStats[venueName].hours += hours;
    });
    
    blocks.forEach(block => {
      const venue = venuesData.find(v => v.id === block.venue_id);
      const venueName = venue?.name || block.venue_id || 'Unknown';
      if (!venueStats[venueName]) {
        venueStats[venueName] = { bookings: 0, hours: 0 };
      }
      
      const start = new Date(block.blocked_start_datetime);
      const end = new Date(block.blocked_end_datetime);
      const hours = (end - start) / (1000 * 60 * 60);
      venueStats[venueName].hours += hours;
    });
    
    const stats = {
      totalBookings: bookings.length,
      totalBlocks: blocks.length,
      venueStats
    };
    
    setSummaryStats(stats);
    
    // Chart data
    const chartData = Object.entries(venueStats).map(([venue, stats]) => ({
      name: venue,
      bookings: stats.bookings,
      hours: Math.round(stats.hours * 10) / 10,
      value: Math.round(stats.hours * 10) / 10 // For pie chart compatibility
    }));
    
    setChartData(chartData);
  };
  
  const processBookingStatistics = (bookings) => {
    const total = bookings.length;
    const approved = bookings.filter(b => b.status === 'approved').length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    const rejected = bookings.filter(b => b.status === 'rejected').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    
    // Average processing time (for approved/rejected)
    const processedBookings = bookings.filter(b => 
      (b.status === 'approved' || b.status === 'rejected') && b.updated_at
    );
    
    let avgProcessingTime = 0;
    if (processedBookings.length > 0) {
      const totalTime = processedBookings.reduce((sum, b) => {
        const created = new Date(b.created_at);
        const updated = new Date(b.updated_at);
        return sum + (updated - created);
      }, 0);
      avgProcessingTime = totalTime / processedBookings.length / (1000 * 60 * 60); // in hours
    }
    
    setSummaryStats({
      total,
      approved,
      pending,
      rejected,
      cancelled,
      approvalRate: total > 0 ? ((approved / total) * 100).toFixed(1) : 0,
      avgProcessingTime: avgProcessingTime.toFixed(1)
    });
    
    // Chart data
    const chartData = [
      { name: 'Approved', value: approved },
      { name: 'Pending', value: pending },
      { name: 'Rejected', value: rejected },
      { name: 'Cancelled', value: cancelled }
    ].filter(item => item.value > 0);
    
    setChartData(chartData);
  };
  
  const processResourceUsage = (requests, resourceTypesData) => {
    const total = requests.length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    
    // By resource type
    const byType = {};
    requests.forEach(req => {
      const resourceType = resourceTypesData.find(rt => rt.id === req.resource_id);
      const type = resourceType?.name || 'Unknown';
      byType[type] = (byType[type] || 0) + 1;
    });
    
    // By faculty (simplified - just count by faculty_id for now)
    const byFaculty = {};
    // Note: faculties not passed to this function, would need to add as parameter
    // For now, leaving as Unknown until we need this feature
    requests.forEach(req => {
      byFaculty['Unknown'] = (byFaculty['Unknown'] || 0) + 1;
    });
    
    setSummaryStats({
      total,
      approved,
      pending,
      rejected,
      byType,
      byFaculty
    });
    
    // Chart data
    let chartData = [];
    if (chartType === 'pie') {
      chartData = Object.entries(byType).map(([type, count]) => ({
        name: type,
        value: count
      }));
    } else {
      // For bar/line charts, show by status
      chartData = [
        { name: 'Approved', value: approved },
        { name: 'Pending', value: pending },
        { name: 'Rejected', value: rejected }
      ].filter(item => item.value > 0); // Only show categories with data
    }
    
    setChartData(chartData);
  };
  
  const processUserActivityAnalytics = (data) => {
    setSummaryStats({
      topCreators: data.topCreators || [],
      highRejectionUsers: data.highRejectionUsers || [],
      mostActiveRequesters: data.mostActiveRequesters || [],
      cancellationStats: data.cancellationStats || []
    });
    
    // For chart, show top event creators
    const chartData = (data.topCreators || []).map(creator => ({
      name: creator.name,
      value: creator.eventCount
    }));
    
    setChartData(chartData);
  };
  
  const processParticipationTrends = (participations) => {
    const total = participations.length;
    const attended = participations.filter(p => p.attendance_status === 'present').length;
    const registered = participations.filter(p => p.registration_status === 'registered').length;
    
    // By event
    const byEvent = {};
    participations.forEach(p => {
      const eventName = p.event?.name || 'Unknown';
      if (!byEvent[eventName]) {
        byEvent[eventName] = { total: 0, attended: 0 };
      }
      byEvent[eventName].total += 1;
      if (p.attendance_status === 'present') {
        byEvent[eventName].attended += 1;
      }
    });
    
    // By month
    const byMonth = {};
    participations.forEach(p => {
      const date = new Date(p.registered_at);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      byMonth[monthYear] = (byMonth[monthYear] || 0) + 1;
    });
    
    setSummaryStats({
      total,
      attended,
      registered,
      attendanceRate: total > 0 ? ((attended / total) * 100).toFixed(1) : 0
    });
    
    // Chart data
    let chartData = [];
    if (chartType === 'line' || chartType === 'bar') {
      chartData = Object.entries(byMonth).map(([month, count]) => ({
        name: month,
        value: count
      }));
    } else {
      chartData = Object.entries(byEvent)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([event, stats]) => ({
          name: event.length > 20 ? event.substring(0, 20) + '...' : event,
          participants: stats.total,
          attended: stats.attended
        }));
    }
    
    setChartData(chartData);
  };
  
  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return <div className="rap-no-data">No data available for the selected filters</div>;
    }
    
    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {chartData[0]?.participants !== undefined ? (
              <>
                <Bar dataKey="participants" fill="#8884d8" name="Participants" />
                <Bar dataKey="attended" fill="#82ca9d" name="Attended" />
              </>
            ) : chartData[0]?.bookings !== undefined ? (
              <>
                <Bar dataKey="bookings" fill="#8884d8" name="Bookings" />
                <Bar dataKey="hours" fill="#82ca9d" name="Hours" />
              </>
            ) : (
              <Bar dataKey="value" fill="#8884d8" />
            )}
          </BarChart>
        </ResponsiveContainer>
      );
    } else if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    } else if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }
  };
  
  const renderSummaryStats = () => {
    if (!reportData) return null;
    
    // Special rendering for user activity analytics
    if (reportType === 'user-activity') {
      return (
        <div className="rap-summary-stats">
          <h3>📊 User Activity Insights</h3>
          
          {/* Top Event Creators */}
          <div className="rap-user-activity-section">
            <h4>🏆 Top 5 Event Organizers</h4>
            {summaryStats.topCreators && summaryStats.topCreators.length > 0 ? (
              <table className="rap-activity-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>ID</th>
                    <th>Events Created</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryStats.topCreators.map((creator, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{creator.name}</td>
                      <td>{creator.staffId}</td>
                      <td><strong>{creator.eventCount}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>No data available</p>
            )}
          </div>
          
          {/* High Rejection Rate Users */}
          <div className="rap-user-activity-section">
            <h4>⚠️ Users with High Rejection Rates (&gt;30%)</h4>
            {summaryStats.highRejectionUsers && summaryStats.highRejectionUsers.length > 0 ? (
              <table className="rap-activity-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>ID</th>
                    <th>Total Requests</th>
                    <th>Rejected</th>
                    <th>Rejection Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryStats.highRejectionUsers.map((user, index) => (
                    <tr key={index}>
                      <td>{user.name}</td>
                      <td>{user.staffId}</td>
                      <td>{user.total}</td>
                      <td>{user.rejected}</td>
                      <td><span className="rap-rejection-rate">{user.rejectionRate}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>No users with rejection rates above 30%</p>
            )}
          </div>
          
          {/* Most Active Requesters */}
          <div className="rap-user-activity-section">
            <h4>📈 Top 5 Most Active Requesters</h4>
            {summaryStats.mostActiveRequesters && summaryStats.mostActiveRequesters.length > 0 ? (
              <table className="rap-activity-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>ID</th>
                    <th>Total Requests</th>
                    <th>Approved</th>
                    <th>Pending</th>
                    <th>Rejected</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryStats.mostActiveRequesters.map((user, index) => (
                    <tr key={index}>
                      <td>{user.name}</td>
                      <td>{user.staffId}</td>
                      <td><strong>{user.totalRequests}</strong></td>
                      <td><span className="rap-status-approved">{user.approved}</span></td>
                      <td><span className="rap-status-pending">{user.pending}</span></td>
                      <td><span className="rap-status-rejected">{user.rejected}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>No data available</p>
            )}
          </div>
          
          {/* Cancellation Patterns */}
          <div className="rap-user-activity-section">
            <h4>🚫 Users with High Cancellation Rates (&gt;20%)</h4>
            {summaryStats.cancellationStats && summaryStats.cancellationStats.length > 0 ? (
              <table className="rap-activity-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>ID</th>
                    <th>Cancelled</th>
                    <th>Total Requests</th>
                    <th>Cancellation Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryStats.cancellationStats.map((user, index) => (
                    <tr key={index}>
                      <td>{user.name}</td>
                      <td>{user.staffId}</td>
                      <td>{user.cancelled}</td>
                      <td>{user.total}</td>
                      <td><span className="rap-cancellation-rate">{user.cancellationRate}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>No users with cancellation rates above 20%</p>
            )}
          </div>
        </div>
      );
    }
    
    // Original rendering for other report types
    return (
      <div className="rap-summary-stats">
        <h3>Summary Statistics</h3>
        <div className="rap-stats-grid">
          {Object.entries(summaryStats).map(([key, value]) => {
            if (typeof value === 'object') return null;
            
            let label = key.replace(/([A-Z])/g, ' $1').trim();
            label = label.charAt(0).toUpperCase() + label.slice(1);
            
            return (
              <div key={key} className="rap-report-stat-card">
                <div className="rap-stat-label">{label}</div>
                <div className="rap-stat-value">{value}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  return (
    <div className="rap-reports-analytics-page">
      <div className="rap-reports-header">
        <div>
          <h1>📊 Reports & Analytics</h1>
          <p>Generate comprehensive reports on events, venues, bookings, and resources</p>
        </div>
        <button onClick={() => navigate('/home')} className="rap-back-button">
          Back to Home
        </button>
      </div>
      
      <div className="rap-reports-content">
        <div className="rap-report-filters">
          <div className="rap-report-filter-section">
            <h3>Report Configuration</h3>
          
          <div className="rap-filter-row">
            <div className="rap-filter-group">
              <label>Report Type</label>
              <select 
                value={reportType} 
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="event-summary">Event Summary</option>
                <option value="venue-utilization">Venue Utilization</option>
                <option value="booking-statistics">Booking & Cancellation Statistics</option>
                <option value="resource-usage">Resource Usage</option>
                <option value="participation-trends">Participation Trends</option>
                <option value="user-activity">User Activity Analytics</option>
              </select>
            </div>
            
            {reportType !== 'user-activity' && (
              <div className="rap-filter-group">
                <label>Chart Type</label>
                <select 
                  value={chartType} 
                  onChange={(e) => setChartType(e.target.value)}
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="pie">Pie Chart</option>
                </select>
              </div>
            )}
          </div>
          
          <div className="rap-filter-row">
            <div className="rap-filter-group">
              <label>Date Range</label>
              <select 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="last-7-days">Last 7 Days</option>
                <option value="last-30-days">Last 30 Days</option>
                <option value="last-90-days">Last 90 Days</option>
                <option value="current-month">Current Month</option>
                <option value="current-year">Current Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            
            {dateRange === 'custom' && (
              <>
                <div className="rap-filter-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                
                <div className="rap-filter-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          
          <div className="rap-filter-row">
            <div className="rap-filter-group">
              <label>
                Faculty (Optional)
                {reportType === 'venue-utilization' && ' - Venue'}
                {reportType === 'user-activity' && ' - User'}
                {reportType === 'event-summary' && ' - Organizer'}
                {reportType === 'booking-statistics' && ' - Venue'}
                {reportType === 'resource-usage' && ' - User'}
                {reportType === 'participation-trends' && ' - Participant'}
              </label>
              <select 
                value={selectedFaculty} 
                onChange={(e) => setSelectedFaculty(e.target.value)}
              >
                <option value="">All Faculties</option>
                {faculties.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            
            {reportType === 'venue-utilization' && (
              <div className="rap-filter-group">
                <label>Venue (Optional)</label>
                <input
                  type="text"
                  placeholder="Search venues..."
                  value={venueSearch}
                  onChange={(e) => setVenueSearch(e.target.value)}
                  list="venue-options"
                />
                <datalist id="venue-options">
                  {venues
                    .filter(v => 
                      venueSearch === '' ||
                      v.name.toLowerCase().includes(venueSearch.toLowerCase()) ||
                      v.code.toLowerCase().includes(venueSearch.toLowerCase())
                    )
                    .map(v => (
                      <option key={v.id} value={`${v.code} - ${v.name}`} data-id={v.id} />
                    ))}
                </datalist>
              </div>
            )}
            
            {reportType === 'event-summary' && (
              <div className="rap-filter-group">
                <label>Event Type (Optional)</label>
                <select 
                  value={selectedEventType} 
                  onChange={(e) => setSelectedEventType(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="academic">Academic</option>
                  <option value="cultural">Cultural</option>
                  <option value="sports">Sports</option>
                  <option value="social">Social</option>
                  <option value="workshop">Workshop</option>
                  <option value="seminar">Seminar</option>
                  <option value="conference">Conference</option>
                  <option value="other">Other</option>
                </select>
              </div>
            )}
            
            {reportType === 'resource-usage' && (
              <div className="rap-filter-group">
                <label>Resource Type (Optional)</label>
                <select 
                  value={selectedResourceType} 
                  onChange={(e) => setSelectedResourceType(e.target.value)}
                >
                  <option value="">All Resource Types</option>
                  {resourceTypes.map(rt => (
                    <option key={rt.id} value={rt.id}>{rt.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div className="rap-filter-actions">
            <button 
              className="rap-btn-generate-report" 
              onClick={generateReport}
              disabled={loading}
            >
              {loading ? 'Generating...' : '📈 Generate Report'}
            </button>
          </div>
          
          {error && <div className="rap-error-message">{error}</div>}
        </div>
      </div>
      
      <div>
        {reportData && (
          <div className="rap-report-results">
            {renderSummaryStats()}
            
            {reportType !== 'user-activity' && (
              <div className="rap-chart-container">
                <h3>Visual Analysis</h3>
                {renderChart()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

export default ReportsAnalyticsPage;
