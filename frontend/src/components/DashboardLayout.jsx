import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>EcoMetrix</h2>
          <button
            className="toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        <nav className="sidebar-nav">
          <Link to="/" className={`nav-item ${isActive('/')}`}>
            <span className="nav-icon">📊</span>
            <span className="nav-text">Dashboard</span>
          </Link>

          <Link to="/households" className={`nav-item ${isActive('/households')}`}>
            <span className="nav-icon">🏠</span>
            <span className="nav-text">Kućanstva</span>
          </Link>

          <Link to="/devices" className={`nav-item ${isActive('/devices')}`}>
            <span className="nav-icon">💡</span>
            <span className="nav-text">Uređaji</span>
          </Link>

          <Link to="/reports" className={`nav-item ${isActive('/reports')}`}>
            <span className="nav-icon">📈</span>
            <span className="nav-text">Izvještaji</span>
          </Link>

          <Link to="/settings" className={`nav-item ${isActive('/settings')}`}>
            <span className="nav-icon">⚙️</span>
            <span className="nav-text">Postavke</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.ime?.[0]}{user?.prezime?.[0]}
            </div>
            <div className="user-details">
              <p className="user-name">{user?.ime} {user?.prezime}</p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Odjava
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
