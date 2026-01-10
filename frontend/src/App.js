import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import MyEventsPage from './pages/MyEventsPage';
import MyCalendarPage from './pages/MyCalendarPage';
import CreateEventPage from './pages/CreateEventPage';
import EditEventPage from './pages/EditEventPage';
import EditProfilePage from './pages/EditProfilePage';
import VenueBookingPage from './pages/VenueBookingPage';
import VenueBookingDetailsPage from './pages/VenueBookingDetailsPage';
import MyVenueRequestsPage from './pages/MyVenueRequestsPage';
import RequestResourcesPage from './pages/RequestResourcesPage';
import MyResourceRequestsPage from './pages/MyResourceRequestsPage';
import ResourceRequestDetailsPage from './pages/ResourceRequestDetailsPage';
import FacultyEventsPage from './pages/FacultyEventsPage';
import FacultyEventDetailPage from './pages/FacultyEventDetailPage';
import FacultyProvideFeedbackPage from './pages/FacultyProvideFeedbackPage';
import FacultyBookingRequestsPage from './pages/FacultyBookingRequestsPage';
import FacultyBookingRequestDetailPage from './pages/FacultyBookingRequestDetailPage';
import VenueAvailabilityPage from './pages/VenueAvailabilityPage';
import RecordAttendancePage from './pages/RecordAttendancePage';
import CustomizeRegistrationFormPage from './pages/CustomizeRegistrationFormPage';
import CustomRegistrationFormPage from './pages/CustomRegistrationFormPage';
import UserManagementPage from './pages/UserManagementPage';
import FacultyVenueManagementPage from './pages/FacultyVenueManagementPage';
import ResourceCataloguePage from './pages/ResourceCataloguePage';
import SystemConfigurationPage from './pages/SystemConfigurationPage';
import BookingRequestsManagementPage from './pages/BookingRequestsManagementPage';
import ReportsAnalyticsPage from './pages/ReportsAnalyticsPage';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/profile" element={<EditProfilePage />} />
        <Route path="/my-calendar" element={<MyCalendarPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailsPage />} />
        <Route path="/events/:id/edit" element={<EditEventPage />} />
        <Route path="/my-events" element={<MyEventsPage />} />
        <Route path="/my-events/:eventId/attendance" element={<RecordAttendancePage />} />
        <Route path="/my-events/:eventId/customize-form" element={<CustomizeRegistrationFormPage />} />
        <Route path="/events/:eventId/register-form" element={<CustomRegistrationFormPage />} />
        <Route path="/my-venue-requests" element={<MyVenueRequestsPage />} />
        <Route path="/my-resource-requests" element={<MyResourceRequestsPage />} />
        <Route path="/resource-requests/:id" element={<ResourceRequestDetailsPage />} />
        <Route path="/create-event" element={<CreateEventPage />} />
        <Route path="/venue-booking" element={<VenueBookingPage />} />
        <Route path="/venue-bookings/:id" element={<VenueBookingDetailsPage />} />
        <Route path="/request-resources" element={<RequestResourcesPage />} />
        <Route path="/faculty-events" element={<FacultyEventsPage />} />
        <Route path="/faculty-events/:id" element={<FacultyEventDetailPage />} />
        <Route path="/faculty-events/:eventId/feedback" element={<FacultyProvideFeedbackPage />} />
        <Route path="/faculty/bookings" element={<FacultyBookingRequestsPage />} />
        <Route path="/faculty/bookings/:id" element={<FacultyBookingRequestDetailPage />} />
        <Route path="/venue-availability" element={<VenueAvailabilityPage />} />
        <Route path="/admin/users" element={<UserManagementPage />} />
        <Route path="/admin/faculties" element={<FacultyVenueManagementPage />} />
        <Route path="/admin/resources" element={<ResourceCataloguePage />} />
        <Route path="/admin/system-configuration" element={<SystemConfigurationPage />} />
        <Route path="/admin/booking-requests" element={<BookingRequestsManagementPage />} />
        <Route path="/admin/reports" element={<ReportsAnalyticsPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
