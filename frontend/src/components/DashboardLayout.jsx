import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import './DashboardLayout.css';

const NavIcon = ({ name }) => {
  const icons = {
    dashboard: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="7" height="7" rx="1.5"/>
        <rect x="10" y="1" width="7" height="7" rx="1.5"/>
        <rect x="1" y="10" width="7" height="7" rx="1.5"/>
        <rect x="10" y="10" width="7" height="7" rx="1.5"/>
      </svg>
    ),
    households: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 8L9 2l7 6v8a1 1 0 01-1 1H3a1 1 0 01-1-1z"/>
        <path d="M7 17V10h4v7"/>
      </svg>
    ),
    devices: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2h6l1.5 4H4.5L6 2z"/>
        <rect x="2" y="6" width="14" height="10" rx="1.5"/>
        <path d="M9 10v4M7 12h4"/>
      </svg>
    ),
    insights: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 14l4-4 3 3 4-5 3 2"/>
        <path d="M2 2v14h14"/>
      </svg>
    ),
    goals: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="7"/>
        <circle cx="9" cy="9" r="3"/>
        <path d="M9 2v2M9 14v2M2 9h2M14 9h2"/>
      </svg>
    ),
    reports: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="14" height="14" rx="2"/>
        <path d="M6 9h6M6 12h4M6 6h6"/>
      </svg>
    ),
    settings: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="2.5"/>
        <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.22 3.22l1.42 1.42M13.36 13.36l1.42 1.42M14.78 3.22l-1.42 1.42M4.64 13.36l-1.42 1.42"/>
      </svg>
    ),
    logout: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 16H3a1 1 0 01-1-1V3a1 1 0 011-1h4"/>
        <path d="M12 13l4-4-4-4M16 9H7"/>
      </svg>
    ),
    menu: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M3 9h12M3 4h12M3 14h12"/>
      </svg>
    ),
    close: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M14 4L4 14M4 4l10 10"/>
      </svg>
    ),
  };
  return icons[name] || null;
};

const navItems = [
  { path: '/',           label: 'Dashboard',   icon: 'dashboard'   },
  { path: '/households', label: 'Domovi',       icon: 'households'  },
  { path: '/devices',    label: 'Uređaji',      icon: 'devices'     },
  { path: '/insights',   label: 'Analize',      icon: 'insights'    },
  { path: '/goals',      label: 'Ciljevi',      icon: 'goals'       },
  { path: '/reports',    label: 'Izvještaji',   icon: 'reports'     },
  { path: '/settings',   label: 'Postavke',     icon: 'settings'    },
];

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const currentPage = navItems.find(item => item.path === location.pathname)
    || navItems.find(item => item.path !== '/' && location.pathname.startsWith(item.path))
    || navItems[0];

  return (
    <div className={`dashboard-layout ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile hamburger */}
      <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
        <NavIcon name={mobileOpen ? 'close' : 'menu'} />
      </button>

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>

        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-logo">E</div>
          {sidebarOpen && <span className="brand-name">EcoMetrix</span>}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map(({ path, label, icon }) => (
            <Link
              key={path}
              to={path}
              className={`nav-item ${isActive(path) ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
              title={!sidebarOpen ? label : undefined}
            >
              <span className="nav-icon"><NavIcon name={icon} /></span>
              {sidebarOpen && <span className="nav-label">{label}</span>}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {sidebarOpen && user && (
            <div className="user-info">
              <div className="user-avatar">{user?.ime?.[0]}{user?.prezime?.[0]}</div>
              <div className="user-details">
                <p className="user-name">{user?.ime} {user?.prezime}</p>
                <p className="user-email">{user?.email}</p>
              </div>
            </div>
          )}

          <div className="sidebar-actions">
            <button className="sidebar-btn" onClick={handleLogout} title="Odjava">
              <NavIcon name="logout" />
              {sidebarOpen && <span>Odjava</span>}
            </button>
            <button
              className="sidebar-btn collapse-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Smanji izbornik' : 'Proširi izbornik'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                {sidebarOpen
                  ? <path d="M10 4L6 8l4 4"/>
                  : <path d="M6 4l4 4-4 4"/>}
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-icon"><NavIcon name={currentPage.icon} /></span>
            <h1 className="topbar-title">{currentPage.label}</h1>
          </div>
          <div className="topbar-right">
            <NotificationBell />
            {user && (
              <div className="topbar-user">
                <div className="topbar-avatar">{user?.ime?.[0]}{user?.prezime?.[0]}</div>
                <span className="topbar-username">{user?.ime} {user?.prezime}</span>
              </div>
            )}
          </div>
        </header>
        <div className="main-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
