import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
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
import ProtectedRoute from './components/ProtectedRoute';
import SessionTimeoutModal from './components/SessionTimeoutModal';
import authService from './services/authService';

const AppContent = () => {
  const navigate = useNavigate();

  const handleExtendSession = async () => {
    const success = await authService.refreshAccessToken();
    if (!success) {
      throw new Error('Failed to refresh session');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <>
      <SessionTimeoutModal 
        onExtendSession={handleExtendSession}
        onLogout={handleLogout}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
        <Route path="/my-calendar" element={<ProtectedRoute><MyCalendarPage /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
        <Route path="/events/:id" element={<ProtectedRoute><EventDetailsPage /></ProtectedRoute>} />
        <Route path="/events/:id/edit" element={<ProtectedRoute><EditEventPage /></ProtectedRoute>} />
        <Route path="/my-events" element={<ProtectedRoute><MyEventsPage /></ProtectedRoute>} />
        <Route path="/my-events/:eventId/attendance" element={<ProtectedRoute><RecordAttendancePage /></ProtectedRoute>} />
        <Route path="/my-events/:eventId/customize-form" element={<ProtectedRoute><CustomizeRegistrationFormPage /></ProtectedRoute>} />
        <Route path="/events/:eventId/register-form" element={<ProtectedRoute><CustomRegistrationFormPage /></ProtectedRoute>} />
        <Route path="/my-venue-requests" element={<ProtectedRoute><MyVenueRequestsPage /></ProtectedRoute>} />
        <Route path="/my-resource-requests" element={<ProtectedRoute><MyResourceRequestsPage /></ProtectedRoute>} />
        <Route path="/resource-requests/:id" element={<ProtectedRoute><ResourceRequestDetailsPage /></ProtectedRoute>} />
        <Route path="/create-event" element={<ProtectedRoute><CreateEventPage /></ProtectedRoute>} />
        <Route path="/venue-booking" element={<ProtectedRoute><VenueBookingPage /></ProtectedRoute>} />
        <Route path="/venue-bookings/:id" element={<ProtectedRoute><VenueBookingDetailsPage /></ProtectedRoute>} />
        <Route path="/request-resources" element={<ProtectedRoute><RequestResourcesPage /></ProtectedRoute>} />
        <Route path="/faculty-events" element={<ProtectedRoute><FacultyEventsPage /></ProtectedRoute>} />
        <Route path="/faculty-events/:id" element={<ProtectedRoute><FacultyEventDetailPage /></ProtectedRoute>} />
        <Route path="/faculty-events/:eventId/feedback" element={<ProtectedRoute><FacultyProvideFeedbackPage /></ProtectedRoute>} />
        <Route path="/faculty/bookings" element={<ProtectedRoute><FacultyBookingRequestsPage /></ProtectedRoute>} />
        <Route path="/faculty/bookings/:id" element={<ProtectedRoute><FacultyBookingRequestDetailPage /></ProtectedRoute>} />
        <Route path="/venue-availability" element={<ProtectedRoute><VenueAvailabilityPage /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>} />
        <Route path="/admin/faculties" element={<ProtectedRoute><FacultyVenueManagementPage /></ProtectedRoute>} />
        <Route path="/admin/resources" element={<ProtectedRoute><ResourceCataloguePage /></ProtectedRoute>} />
        <Route path="/admin/system-configuration" element={<ProtectedRoute><SystemConfigurationPage /></ProtectedRoute>} />
        <Route path="/admin/booking-requests" element={<ProtectedRoute><BookingRequestsManagementPage /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute><ReportsAnalyticsPage /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <ToastProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppContent />
      </Router>
    </ToastProvider>
  );
}

export default App;
