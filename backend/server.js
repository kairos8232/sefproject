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
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - CORS must be configured properly
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Handle OPTIONS requests globally (CORS preflight)
app.options('*', (req, res) => {
  res.status(200).end();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/participation', participationRoutes);
app.use('/api/venue-bookings', venueBookingRoutes);
app.use('/api/resource-requests', resourceRequestRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/venue-availability', venueAvailabilityRoutes);
app.use('/api/event-feedbacks', eventFeedbackRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
