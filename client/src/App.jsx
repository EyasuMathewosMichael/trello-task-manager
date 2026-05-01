import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext.jsx';
import './styles/theme.css';

import Navbar from './components/Layout/Navbar.jsx';
import Sidebar from './components/Layout/Sidebar.jsx';

import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import BoardListPage from './pages/BoardListPage.jsx';
import BoardViewPage from './pages/BoardViewPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import InviteAcceptPage from './pages/InviteAcceptPage.jsx';
import SearchPage from './pages/SearchPage.jsx';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return user ? children : <Navigate to="/login" replace />;
}

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return <Navigate to={user ? '/boards' : '/login'} replace />;
}

/** Layout wrapper for authenticated routes */
function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Static sidebar — desktop only (hidden via CSS on mobile) */}
      <Sidebar />

      {/* Mobile drawer — only rendered when open */}
      {mobileMenuOpen && (
        <>
          <div
            className="sidebar-overlay open"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="sidebar-drawer open" aria-label="Mobile navigation">
            <Sidebar onClose={() => setMobileMenuOpen(false)} />
          </div>
        </>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Navbar onMenuClick={() => setMobileMenuOpen((v) => !v)} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="bottom-right" />
      <Routes>
        {/* Public routes — no layout */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:token" element={<InviteAcceptPage />} />

        {/* Authenticated routes — wrapped in AppLayout */}
        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/boards" element={<BoardListPage />} />
          <Route path="/boards/:boardId" element={<BoardViewPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/search" element={<SearchPage />} />
        </Route>

        <Route path="/" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
