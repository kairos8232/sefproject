import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import MyEventsPage from './pages/MyEventsPage';
import CreateEventPage from './pages/CreateEventPage';
import EditEventPage from './pages/EditEventPage';
import VenueBookingPage from './pages/VenueBookingPage';
import VenueBookingDetailsPage from './pages/VenueBookingDetailsPage';
import MyVenueRequestsPage from './pages/MyVenueRequestsPage';
import RequestResourcesPage from './pages/RequestResourcesPage';
import MyResourceRequestsPage from './pages/MyResourceRequestsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailsPage />} />
        <Route path="/events/:id/edit" element={<EditEventPage />} />
        <Route path="/my-events" element={<MyEventsPage />} />
        <Route path="/my-venue-requests" element={<MyVenueRequestsPage />} />
        <Route path="/my-resource-requests" element={<MyResourceRequestsPage />} />
        <Route path="/create-event" element={<CreateEventPage />} />
        <Route path="/venue-booking" element={<VenueBookingPage />} />
        <Route path="/venue-bookings/:id" element={<VenueBookingDetailsPage />} />
        <Route path="/request-resources" element={<RequestResourcesPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
