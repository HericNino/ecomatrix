import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';
import householdsService from '../services/households.service';
import measurementsService from '../services/measurements.service';
import costsService from '../services/costs.service';
import goalsService from '../services/goals.service';
import reportsService from '../services/reports.service';
import './Dashboard.css';

const COLORS = ['#2563eb', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard = () => {
  const [households, setHouseholds] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartData, setChartData] = useState({
    daily: [],
    topDevices: [],
    byType: []
  });
  const [costsData, setCostsData] = useState(null);
  const [dailyCosts, setDailyCosts] = useState([]);
  const [activeGoals, setActiveGoals] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveData, setLiveData] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchLive = async () => {
      try {
        const householdsData = await householdsService.getAll();
        const hh = (householdsData.households || [])[0];
        if (!hh) return;
        const { data } = await api.get(`/households/${hh.id_kucanstvo}/live`);
        if (!cancelled) setLiveData(data);
      } catch (_) {}
    };

    fetchLive();
    const liveInterval = setInterval(fetchLive, 5000);
    return () => { cancelled = true; clearInterval(liveInterval); };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const householdsData = await householdsService.getAll();
      const allHouseholds = householdsData.households || [];
      setHouseholds(allHouseholds);

      if (allHouseholds.length > 0) {
        const firstHousehold = allHouseholds[0];

        try {
          const statsData = await householdsService.getStats(firstHousehold.id_kucanstvo);
          setStats(statsData);
        } catch (err) {
          console.error('Error loading stats:', err);
        }

        try {
          const costs = await costsService.getCosts(firstHousehold.id_kucanstvo);
          setCostsData(costs);
        } catch (err) {
          console.error('Greska pri ucitavanju troskova:', err);
        }

        try {
          const daily = await costsService.getDailyCosts(firstHousehold.id_kucanstvo, 7);
          setDailyCosts(daily.data || []);
        } catch (err) {
          console.error('Greska pri ucitavanju dnevnih troskova:', err);
        }

        try {
          const goalsData = await goalsService.getAll(firstHousehold.id_kucanstvo);
          const active = (goalsData.goals || []).filter(g => g.aktivan);
          setActiveGoals(active.slice(0, 3));
        } catch (err) {
          console.error('Greska pri ucitavanju ciljeva:', err);
        }

        try {
          const datumDo = new Date().toISOString().split('T')[0];
          const datumOd = new Date();
          datumOd.setDate(datumOd.getDate() - 7);
          const datumOdStr = datumOd.toISOString().split('T')[0];

          const reportData = await reportsService.getConsumptionReport(
            firstHousehold.id_kucanstvo,
            datumOdStr,
            datumDo,
            'day'
          );

          const dailyData = (reportData.timeSeries || []).map(item => ({
            dan: new Date(item.datum).toLocaleDateString('hr-HR', { weekday: 'short' }),
            potrosnja: item.potrosnja_kwh || 0,
          }));

          const topDevicesData = (reportData.topDevices || []).slice(0, 5).map(device => ({
            name: device.naziv,
            potrosnja: device.potrosnja_kwh || 0,
          }));

          const byTypeData = (reportData.byDeviceType || []).map(item => ({
            name: getDeviceTypeLabel(item.tip_uredjaja),
            value: item.potrosnja_kwh || 0,
          }));

          setChartData({
            daily: dailyData,
            topDevices: topDevicesData,
            byType: byTypeData,
          });
        } catch (err) {
          console.error('Greska pri ucitavanju podataka za grafikone:', err);
          setChartData({
            daily: [],
            topDevices: [],
            byType: [],
          });
        }
      }
    } catch (err) {
      setError('Greška prilikom učitavanja podataka');
      console.error(err);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  const getDeviceTypeLabel = (type) => {
    const labels = {
      hladnjak: 'Hladnjak',
      zamrzivac: 'Zamrzivač',
      pecnica: 'Pećnica',
      mikrovalna: 'Mikrovalna',
      perilica_rublja: 'Perilica rublja',
      perilica_posudja: 'Perilica posuđa',
      klima: 'Klima',
      grijanje: 'Grijanje',
      tv: 'TV',
      racunalo: 'Računalo',
      rasvjeta: 'Rasvjeta',
      bojler: 'Bojler',
      ostalo: 'Ostalo',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <span className="spinner" style={{width: '48px', height: '48px'}}></span>
          <p className="empty-state-message">Učitavam podatke...</p>
        </div>
      </div>
    );
  }

  const handleRefresh = async () => {
    await loadDashboardData();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          {lastUpdated && (
            <p style={{fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: '4px'}}>
              Zadnje ažurirano: {lastUpdated.toLocaleTimeString('hr-HR')}
            </p>
          )}
        </div>
        <button className="btn btn-secondary" onClick={handleRefresh} disabled={loading}>
          Osvježi
        </button>
      </div>

      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: 'var(--color-error-bg)',
          border: '1px solid var(--color-error)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-error)',
          marginBottom: '24px'
        }}>
          {error}
        </div>
      )}

      {/* Live Consumption Strip */}
      {liveData && liveData.devices && liveData.devices.length > 0 && (
        <div className="live-strip">
          <span className="live-dot"></span>
          <span className="live-strip-total">{liveData.totalW} W</span>
          <span className="live-strip-sep">—</span>
          {liveData.devices.map((d, i) => (
            <span key={d.uredjaj_id} className="live-strip-device">
              {i > 0 && <span className="live-strip-divider">·</span>}
              {d.naziv}: <strong>{d.snaga_w} W</strong>
            </span>
          ))}
          <span className="live-strip-time">{new Date(liveData.timestamp).toLocaleTimeString('hr-HR')}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{background: '#dbeafe'}}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9L10 2l8 7v9a1 1 0 01-1 1H3a1 1 0 01-1-1z"/><path d="M8 21V11h4v10"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Domovi</span>
            <div className="stat-value">{households.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: '#fef3c7'}}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#d97706" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="16" height="16" rx="3"/><path d="M10 6v4l3 3"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Aktivni uređaji</span>
            <div className="stat-value">{stats?.active_devices || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: '#e0e7ff'}}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#4f46e5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 16l4-5 3 3 4-6 5 3"/><path d="M2 2v16h16"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Potrošnja (30 dana)</span>
            <div className="stat-value">
              {stats?.total_consumption?.toFixed(2) || '0.00'}
              <span className="stat-unit">kWh</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: '#dcfce7'}}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="10" r="8"/><path d="M10 6v4l2 2"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Ukupni troškovi</span>
            <div className="stat-value">
              {costsData?.total?.troskovi?.toFixed(2) || '0.00'}
              <span className="stat-unit">€</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {households.length > 0 && chartData.daily.length > 0 && (
        <div style={{marginBottom: '32px'}}>
          <h2 className="section-title">Pregled potrošnje i troškova</h2>
          <div className="grid grid-cols-2">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Dnevna potrošnja</h3>
                <p style={{fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0}}>
                  Zadnjih 7 dana
                </p>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="dan" stroke="#71717a" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#71717a" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'white',
                        border: '1px solid #e4e4e7',
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}
                      formatter={(value) => [`${value.toFixed(2)} kWh`, 'Potrošnja']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="potrosnja"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ fill: '#2563eb', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Potrošnja (kWh)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {dailyCosts.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Dnevni troškovi</h3>
                  <p style={{fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0}}>
                    Zadnjih 7 dana
                  </p>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyCosts}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                      <XAxis dataKey="datum" stroke="#71717a" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#71717a" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          background: 'white',
                          border: '1px solid #e4e4e7',
                          borderRadius: '6px',
                          fontSize: '13px'
                        }}
                        formatter={(value) => [`${value.toFixed(2)} €`, 'Troškovi']}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="troskovi"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Troškovi (€)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {chartData.topDevices.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Top potrošači</h3>
                  <p style={{fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0}}>
                    Najveća potrošnja
                  </p>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.topDevices}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                      <XAxis dataKey="name" stroke="#71717a" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#71717a" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          background: 'white',
                          border: '1px solid #e4e4e7',
                          borderRadius: '6px',
                          fontSize: '13px'
                        }}
                        formatter={(value) => [`${value.toFixed(2)} kWh`, 'Potrošnja']}
                      />
                      <Legend />
                      <Bar dataKey="potrosnja" fill="#2563eb" name="Potrošnja (kWh)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {chartData.byType.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Potrošnja po tipu</h3>
                  <p style={{fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0}}>
                    Distribucija po tipu uređaja
                  </p>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData.byType}
                        cx="50%"
                        cy="40%"
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                          if (percent < 0.05) return null;
                          const RADIAN = Math.PI / 180;
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          return (
                            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
                              {`${(percent * 100).toFixed(0)}%`}
                            </text>
                          );
                        }}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.byType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value.toFixed(2)} kWh`, name]} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div style={{marginBottom: '32px'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'}}>
            <h2 className="section-title" style={{margin: 0}}>Aktivni ciljevi</h2>
            <Link to="/goals" className="btn btn-secondary btn-sm">
              Svi ciljevi
            </Link>
          </div>
          <div className="goals-grid">
            {activeGoals.map((goal) => (
              <div key={goal.cilj_id} className="goal-card">
                <div className="goal-header">
                  <h3>{goal.naziv}</h3>
                  <span className="goal-period">
                    {new Date(goal.datum_pocetka).toLocaleDateString('hr-HR', { month: 'short', day: 'numeric' })} - {new Date(goal.datum_zavrsetka).toLocaleDateString('hr-HR', { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                {goal.cilj_kwh && goal.progress && (
                  <div className="goal-item">
                    <div className="goal-label">
                      <span>Potrošnja</span>
                      <span className="goal-value">
                        {goal.progress.trenutna_potrosnja_kwh} / {goal.cilj_kwh} kWh
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(goal.progress.postotak_kwh || 0, 100)}%`,
                          backgroundColor: goal.progress.status === 'postignuto' ? '#10b981' : goal.progress.status === 'prekoraceno' ? '#ef4444' : goal.progress.status === 'upozorenje' ? '#f59e0b' : '#2563eb'
                        }}
                      />
                    </div>
                    <div className="goal-percent">{goal.progress.postotak_kwh}%</div>
                  </div>
                )}

                {goal.cilj_troskova && goal.progress && (
                  <div className="goal-item">
                    <div className="goal-label">
                      <span>Troškovi</span>
                      <span className="goal-value">
                        {goal.progress.trenutni_troskovi} / {goal.cilj_troskova} €
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(goal.progress.postotak_troskova || 0, 100)}%`,
                          backgroundColor: goal.progress.status === 'postignuto' ? '#10b981' : goal.progress.status === 'prekoraceno' ? '#ef4444' : goal.progress.status === 'upozorenje' ? '#f59e0b' : '#2563eb'
                        }}
                      />
                    </div>
                    <div className="goal-percent">{goal.progress.postotak_troskova}%</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Households List */}
      <div style={{marginBottom: '32px'}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'}}>
          <h2 className="section-title" style={{margin: 0}}>Moji domovi</h2>
          <Link to="/households" className="btn btn-primary">
            Upravljaj domovima
          </Link>
        </div>

        {households.length === 0 ? (
          <div className="empty-state">
            <h3 className="empty-state-title">Nemate dodanih domova</h3>
            <p className="empty-state-message">Započnite s praćenjem potrošnje kreiranjem vašeg prvog doma</p>
            <Link to="/households" className="btn btn-primary">
              Kreiraj dom
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3">
            {households.map((household) => (
              <Link
                key={household.id_kucanstvo}
                to={`/households/${household.id_kucanstvo}`}
                className="household-card"
              >
                <div className="household-header">
                  <div className="household-icon">🏠</div>
                  <div>
                    <h3 className="household-name">{household.naziv}</h3>
                    <p className="household-address">{household.adresa}</p>
                  </div>
                </div>
                <div className="household-footer">
                  <span className="household-location">📍 {household.grad}</span>
                  {household.broj_soba && (
                    <span className="household-stat">{household.broj_soba} sobe</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="section-title">Brze akcije</h2>
        <div className="grid grid-cols-3">
          <Link to="/households" className="action-card">
            <span className="action-card-icon">🏠</span>
            <span className="action-card-label">Dodaj dom</span>
          </Link>
          <Link to="/devices" className="action-card">
            <span className="action-card-icon">💡</span>
            <span className="action-card-label">Dodaj uređaj</span>
          </Link>
          <Link to="/reports" className="action-card">
            <span className="action-card-icon">📊</span>
            <span className="action-card-label">Izvještaji</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
