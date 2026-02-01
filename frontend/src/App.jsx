import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import Login from './shared/auth/Login';
import Register from './shared/auth/Register';
import Home from './shared/auth/Home';
import Dashboard from './shared/pages/Dashboard';
// Migrated Student Pages
import Clubs from './products/student/pages/Clubs';
import ClubDetail from './products/student/pages/ClubDetail';
import Profile from './products/student/pages/Profile';
import EditProfile from './products/student/pages/EditProfile';
import ManageMembers from './products/club-admin/pages/ManageMembers';

// Migrated Admin Pages
import AdminCreateClub from './products/super-admin/pages/AdminCreateClub';
import AdminManageClubs from './products/super-admin/pages/AdminManageClubs';
import AdminUserManagement from './products/super-admin/pages/AdminUserManagement';
import GovernanceDashboard from './products/super-admin/pages/GovernanceDashboard';

// Migrated Club Admin Pages
import EventAttendance from './products/club-admin/pages/EventAttendance';
import FeedbackDashboard from './products/club-admin/pages/FeedbackDashboard';

// New Club Admin Layout & Pages
import ClubAdminLayout from './products/club-admin/ClubAdminLayout';
import ClubAdminDashboard from './products/club-admin/pages/Dashboard';
import ClubAdminEvents from './products/club-admin/pages/Events';
import ClubAdminMembers from './products/club-admin/pages/Members';
import ClubAdminAnnouncements from './products/club-admin/pages/Announcements';
import ClubAdminSettings from './products/club-admin/pages/Settings';
import ClubAdminIssues from './products/club-admin/pages/Issues';
import ClubAdminCreateEvent from './products/club-admin/pages/CreateEvent';

// New Super Admin Layout & Pages
import SuperAdminLayout from './products/super-admin/SuperAdminLayout';
import SuperAdminDashboard from './products/super-admin/pages/Dashboard';

// New Student Layout & Pages
import StudentLayout from './products/student/StudentLayout';
import StudentHome from './products/student/pages/Home';
import StudentEvents from './products/student/pages/Events';
import MyStuff from './products/student/pages/MyStuff';

// Layout wrapper for legacy pages with navbar
const LegacyLayout = () => (
  <div className="min-vh-100 d-flex flex-column">
    <Navbar />
    <div className="flex-grow-1">
      <Outlet />
    </div>
    <footer className="bg-white text-center py-4 mt-auto border-top">
      <div className="container">
        <small className="text-muted">© 2026 ClubManager. All rights reserved.</small>
      </div>
    </footer>
  </div>
);

function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <NotificationProvider>
          <ToastProvider>
            <Routes>
              {/* ============================================ */}
              {/* NEW CLUB ADMIN UI (Separate Layout)         */}
              {/* ============================================ */}
              <Route element={<ProtectedRoute allowedRoles={['club_admin']} />}>
                <Route path="/club-admin" element={<ClubAdminLayout />}>
                  <Route index element={<ClubAdminDashboard />} />
                  <Route path="events" element={<ClubAdminEvents />} />
                  <Route path="events/new" element={<ClubAdminCreateEvent />} />
                  <Route path="members" element={<ClubAdminMembers />} />
                  <Route path="announcements" element={<ClubAdminAnnouncements />} />
                  <Route path="settings" element={<ClubAdminSettings />} />
                  <Route path="issues" element={<ClubAdminIssues />} />
                </Route>
              </Route>

              {/* ============================================ */}
              {/* NEW STUDENT UI (Bottom Tabs)                */}
              {/* ============================================ */}
              <Route element={<ProtectedRoute />}>
                <Route path="/student" element={<StudentLayout />}>
                  <Route index element={<Navigate to="home" replace />} />
                  <Route path="home" element={<StudentHome />} />
                  <Route path="events" element={<StudentEvents />} />
                  <Route path="my-stuff" element={<MyStuff />} />
                  <Route path="profile" element={<Profile />} /> {/* Reusing existing Profile page for now - TODO: Switch to products/student/pages/Profile */}
                </Route>
              </Route>

              {/* ============================================ */}
              {/* NEW SUPER ADMIN UI                          */}
              {/* ============================================ */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}>
                <Route path="/admin" element={<SuperAdminLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<SuperAdminDashboard />} />
                  {/* Routes below will be migrated from legacy */}
                  <Route path="clubs" element={<AdminManageClubs />} />
                  <Route path="users" element={<AdminUserManagement />} />
                  <Route path="governance" element={<GovernanceDashboard />} />
                </Route>
              </Route>

              {/* ============================================ */}
              {/* LEGACY ROUTES (With Navbar)                 */}
              {/* ============================================ */}
              <Route element={<LegacyLayout />}>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/clubs" element={<Clubs />} />
                <Route path="/clubs/:id" element={<ClubDetail />} />

                {/* Student/Common Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/:id" element={<Profile />} />
                  <Route path="/profile/edit" element={<EditProfile />} />
                </Route>

                {/* Club Admin Routes (legacy) */}
                <Route element={<ProtectedRoute allowedRoles={['club_admin', 'super_admin', 'admin']} />}>
                  <Route path="/clubs/:id/manage-members" element={<ManageMembers />} />
                  <Route path="/events/:id/attendance" element={<EventAttendance />} />
                  <Route path="/club-admin/feedback" element={<FeedbackDashboard />} />
                  <Route path="/admin/clubs/create" element={<AdminCreateClub />} />
                </Route>

                {/* Super Admin Routes */}
                <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}>
                  <Route path="/admin/clubs" element={<AdminManageClubs />} />
                  <Route path="/admin/users" element={<AdminUserManagement />} />
                  <Route path="/admin/governance" element={<GovernanceDashboard />} />
                </Route>
              </Route>
            </Routes>
          </ToastProvider>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
