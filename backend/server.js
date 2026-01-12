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
const userRoutes = require('./routes/userRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const resourceCategoryRoutes = require('./routes/resourceCategoryRoutes');
const resourceTypeRoutes = require('./routes/resourceTypeRoutes');
const systemSettingRoutes = require('./routes/systemSettingRoutes');
const reportRoutes = require('./routes/reportRoutes');
const EventReminderScheduler = require('./services/EventReminderScheduler');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start event reminder scheduler
  EventReminderScheduler.start();
});
