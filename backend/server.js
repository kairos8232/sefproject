require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const participationRoutes = require('./routes/participationRoutes');
const venueBookingRoutes = require('./routes/venueBookingRoutes');
const resourceRequestRoutes = require('./routes/resourceRequests');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/participation', participationRoutes);
app.use('/api/venue-bookings', venueBookingRoutes);
app.use('/api/resource-requests', resourceRequestRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
