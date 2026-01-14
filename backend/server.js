require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const participationRoutes = require('./routes/participationRoutes');
const venueBookingRoutes = require('./routes/venueBookingRoutes');
const resourceRequestRoutes = require('./routes/resourceRequests');
const venueRoutes = require('./routes/venueRoutes');
const venueAvailabilityRoutes = require('./routes/venueAvailabilityRoutes');
const eventFeedbackRoutes = require('./routes/eventFeedbackRoutes');
const registrationFieldRoutes = require('./routes/registrationFieldRoutes');
const eventInvitationRoutes = require('./routes/eventInvitationRoutes');
const userRoutes = require('./routes/userRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const resourceCategoryRoutes = require('./routes/resourceCategoryRoutes');
const resourceTypeRoutes = require('./routes/resourceTypeRoutes');
const systemSettingRoutes = require('./routes/systemSettingRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware - CORS must be configured properly
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
}));
app.use(express.json());

// Handle OPTIONS requests globally (CORS preflight)
app.options('*', cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/participation', participationRoutes);
app.use('/api/venue-bookings', venueBookingRoutes);
app.use('/api/resource-requests', resourceRequestRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/venue-availability', venueAvailabilityRoutes);
app.use('/api/event-feedbacks', eventFeedbackRoutes);
app.use('/api', registrationFieldRoutes);
app.use('/api/invitations', eventInvitationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/faculties', facultyRoutes);
app.use('/api/resource-categories', resourceCategoryRoutes);
app.use('/api/resource-types', resourceTypeRoutes);
app.use('/api/system-settings', systemSettingRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Handle Supabase connection errors
  if (err.message && err.message.includes('ENOTFOUND')) {
    return res.status(503).json({ 
      error: 'Database service unavailable',
      details: 'Cannot connect to database. Please check your connection.'
    });
  }
  
  // Handle token errors
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // Default error response
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
