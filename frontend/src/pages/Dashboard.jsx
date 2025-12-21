import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import householdsService from '../services/households.service';
import './Dashboard.css';

const Dashboard = () => {
  const [households, setHouseholds] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const householdsData = await householdsService.getAll();
      setHouseholds(householdsData.households || []);

      // Ako postoji kućanstvo, učitaj statistiku
      if (householdsData.households?.length > 0) {
        const firstHousehold = householdsData.households[0];
        const statsData = await householdsService.getStats(firstHousehold.id_kucanstvo);
        setStats(statsData);
      }
    } catch (err) {
      setError('Greška prilikom učitavanja podataka');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <p>Učitavam podatke...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Pregled potrošnje energije u vašem kućanstvu</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏠</div>
          <div className="stat-content">
            <h3>{households.length}</h3>
            <p>Kućanstva</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💡</div>
          <div className="stat-content">
            <h3>{stats?.total_devices || 0}</h3>
            <p>Aktivni uređaji</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <h3>{stats?.total_consumption?.toFixed(2) || '0.00'} kWh</h3>
            <p>Ukupna potrošnja</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>{stats?.estimated_cost?.toFixed(2) || '0.00'} €</h3>
            <p>Procijenjeni trošak</p>
          </div>
        </div>
      </div>

      {/* Households List */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Moja kućanstva</h2>
          <Link to="/households" className="btn-primary">
            Upravljaj kućanstvima
          </Link>
        </div>

        {households.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏠</div>
            <h3>Nemate dodanih kućanstava</h3>
            <p>Započnite s praćenjem potrošnje kreiranjem vašeg prvog kućanstva</p>
            <Link to="/households" className="btn-primary">
              Kreiraj kućanstvo
            </Link>
          </div>
        ) : (
          <div className="households-grid">
            {households.map((household) => (
              <Link
                key={household.id_kucanstvo}
                to={`/households/${household.id_kucanstvo}`}
                className="household-card"
              >
                <h3>{household.naziv}</h3>
                <p className="household-address">{household.adresa}</p>
                <div className="household-stats">
                  <span>📍 {household.grad}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section">
        <h2>Brze akcije</h2>
        <div className="quick-actions">
          <Link to="/households" className="action-card">
            <span className="action-icon">🏠</span>
            <span>Dodaj kućanstvo</span>
          </Link>
          <Link to="/devices" className="action-card">
            <span className="action-icon">💡</span>
            <span>Dodaj uređaj</span>
          </Link>
          <Link to="/reports" className="action-card">
            <span className="action-icon">📊</span>
            <span>Pregled izvještaja</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
