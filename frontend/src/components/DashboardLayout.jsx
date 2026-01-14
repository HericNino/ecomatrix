import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <div className="dashboard-layout">
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="sidebar-brand">
          {sidebarOpen && <span className="brand-name">EcoMetrix</span>}
        </div>

        <nav className="sidebar-nav">
          <Link to="/" className={`nav-item ${isActive('/')}`}>
            <span className="nav-text">Dashboard</span>
          </Link>

          <Link to="/households" className={`nav-item ${isActive('/households')}`}>
            <span className="nav-text">Domovi</span>
          </Link>

          <Link to="/devices" className={`nav-item ${isActive('/devices')}`}>
            <span className="nav-text">Uređaji</span>
          </Link>

          <Link to="/insights" className={`nav-item ${isActive('/insights')}`}>
            <span className="nav-text">Analize</span>
          </Link>

          <Link to="/goals" className={`nav-item ${isActive('/goals')}`}>
            <span className="nav-text">Ciljevi</span>
          </Link>

          <Link to="/reports" className={`nav-item ${isActive('/reports')}`}>
            <span className="nav-text">Izveštaji</span>
          </Link>

          <Link to="/settings" className={`nav-item ${isActive('/settings')}`}>
            <span className="nav-text">Postavke</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen && user && (
            <div className="user-info">
              <div className="avatar avatar-md">
                {user?.ime?.[0]}{user?.prezime?.[0]}
              </div>
              <div className="user-details">
                <p className="user-name">{user?.ime} {user?.prezime}</p>
                <p className="user-email">{user?.email}</p>
              </div>
            </div>
          )}

          <div className="sidebar-actions">
            <NotificationBell />
            <button className="btn-icon" onClick={handleLogout} title="Odjava">
              Odjava
            </button>
            <button
              className="btn-icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Zatvori' : 'Otvori'}
            >
              {sidebarOpen ? '←' : '→'}
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
