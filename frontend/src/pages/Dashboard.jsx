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
import householdsService from '../services/households.service';
import measurementsService from '../services/measurements.service';
import costsService from '../services/costs.service';
import goalsService from '../services/goals.service';
import './Dashboard.css';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard = () => {
  const [households, setHouseholds] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartData, setChartData] = useState({
    daily: [],
    topDevices: [],
    byType: [],
  });
  const [costsData, setCostsData] = useState(null);
  const [dailyCosts, setDailyCosts] = useState([]);
  const [activeGoals, setActiveGoals] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const householdsData = await householdsService.getAll();
      const allHouseholds = householdsData.households || [];
      setHouseholds(allHouseholds);

      // Ako postoji kućanstvo, učitaj statistiku i podatke za grafikone
      if (allHouseholds.length > 0) {
        const firstHousehold = allHouseholds[0];

        try {
          const statsData = await householdsService.getStats(firstHousehold.id_kucanstvo);
          setStats(statsData);
        } catch (err) {
          console.error('Error loading stats:', err);
        }

        // Učitaj podatke o troškovima
        try {
          const costs = await costsService.getCosts(firstHousehold.id_kucanstvo);
          setCostsData(costs);
        } catch (err) {
          console.error('Error loading costs:', err);
        }

        // Učitaj dnevne troškove za grafikon
        try {
          const daily = await costsService.getDailyCosts(firstHousehold.id_kucanstvo, 7);
          setDailyCosts(daily.daily_costs || []);
        } catch (err) {
          console.error('Error loading daily costs:', err);
        }

        // Učitaj aktivne ciljeve
        try {
          const goalsData = await goalsService.getAll(firstHousehold.id_kucanstvo);
          const active = (goalsData.goals || []).filter(g => g.aktivan);
          setActiveGoals(active.slice(0, 3)); // Prikaži top 3 aktivna cilja
        } catch (err) {
          console.error('Error loading goals:', err);
        }

        // Generiraj podatke za grafikone (zadnjih 7 dana)
        const dailyData = generateDailyData();

        // Učitaj sve uređaje za top potrošače
        let allDevices = [];
        for (const household of allHouseholds) {
          try {
            const devicesData = await householdsService.getDevices(household.id_kucanstvo);
            const devices = (devicesData.devices || devicesData || []).map(d => ({
              ...d,
              kucanstvo_naziv: household.naziv
            }));
            allDevices.push(...devices);
          } catch (err) {
            console.error(`Error loading devices for household ${household.id_kucanstvo}:`, err);
          }
        }

        // Top 5 uređaja po potrošnji (mock data za sada)
        const topDevicesData = allDevices.slice(0, 5).map(device => ({
          name: device.naziv,
          potrosnja: Math.random() * 100 + 20, // Mock data
        }));

        // Potrošnja po tipu uređaja
        const devicesByType = {};
        allDevices.forEach(device => {
          const type = device.tip_uredjaja || 'ostalo';
          if (!devicesByType[type]) {
            devicesByType[type] = 0;
          }
          devicesByType[type] += Math.random() * 50 + 10; // Mock data
        });

        const byTypeData = Object.entries(devicesByType).map(([type, value]) => ({
          name: getDeviceTypeLabel(type),
          value: parseFloat(value.toFixed(2)),
        }));

        setChartData({
          daily: dailyData,
          topDevices: topDevicesData,
          byType: byTypeData,
        });
      }
    } catch (err) {
      setError('Greška prilikom učitavanja podataka');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateDailyData = () => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = date.toLocaleDateString('hr-HR', { weekday: 'short' });
      data.push({
        dan: dayName,
        potrosnja: Math.random() * 30 + 10, // Mock data 10-40 kWh
      });
    }
    return data;
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
            <h3>{costsData?.ukupni_troskovi?.toFixed(2) || '0.00'} €</h3>
            <p>Ukupni troškovi</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {households.length > 0 && chartData.daily.length > 0 && (
        <div className="dashboard-section">
          <h2>Pregled potrošnje i troškova</h2>
          <div className="charts-grid">
            {/* Daily Consumption Line Chart */}
            <div className="chart-card">
              <h3>Dnevna potrošnja (zadnjih 7 dana)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dan" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [`${value.toFixed(2)} kWh`, 'Potrošnja']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="potrosnja"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 5 }}
                    activeDot={{ r: 7 }}
                    name="Potrošnja (kWh)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Daily Costs Line Chart */}
            {dailyCosts.length > 0 && (
              <div className="chart-card">
                <h3>Dnevni troškovi (zadnjih 7 dana)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyCosts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="datum" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                      formatter={(value) => [`${value.toFixed(2)} €`, 'Troškovi']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="troskovi"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', r: 5 }}
                      activeDot={{ r: 7 }}
                      name="Troškovi (€)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Devices Bar Chart */}
            {chartData.topDevices.length > 0 && (
              <div className="chart-card">
                <h3>Top potrošači</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.topDevices}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                      formatter={(value) => [`${value.toFixed(2)} kWh`, 'Potrošnja']}
                    />
                    <Legend />
                    <Bar dataKey="potrosnja" fill="#10b981" name="Potrošnja (kWh)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Consumption by Type Pie Chart */}
            {chartData.byType.length > 0 && (
              <div className="chart-card">
                <h3>Potrošnja po tipu uređaja</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.byType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value.toFixed(1)} kWh`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.byType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toFixed(2)} kWh`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Goals Progress */}
      {activeGoals.length > 0 && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Aktivni ciljevi</h2>
            <Link to="/goals" className="btn-primary">
              Svi ciljevi
            </Link>
          </div>
          <div className="goals-progress-grid">
            {activeGoals.map((goal) => (
              <div key={goal.cilj_id} className="goal-progress-card">
                <div className="goal-progress-header">
                  <h3>{goal.naziv}</h3>
                  <span className="goal-period">
                    {new Date(goal.datum_pocetka).toLocaleDateString('hr-HR', { month: 'short', day: 'numeric' })} - {new Date(goal.datum_zavrsetka).toLocaleDateString('hr-HR', { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                {goal.cilj_kwh && goal.progress && (
                  <div className="goal-progress-item">
                    <div className="progress-label">
                      <span>Potrošnja</span>
                      <span className="progress-value">
                        {goal.progress.trenutna_potrosnja_kwh} / {goal.cilj_kwh} kWh
                      </span>
                    </div>
                    <div className="progress-bar-wrapper">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(goal.progress.postotak_kwh || 0, 100)}%`,
                          backgroundColor: goal.progress.status === 'postignuto' ? '#10b981' : goal.progress.status === 'prekoraceno' ? '#ef4444' : goal.progress.status === 'upozorenje' ? '#f59e0b' : '#6b7280'
                        }}
                      />
                    </div>
                    <div className="progress-percentage">{goal.progress.postotak_kwh}%</div>
                  </div>
                )}

                {goal.cilj_troskova && goal.progress && (
                  <div className="goal-progress-item">
                    <div className="progress-label">
                      <span>Troškovi</span>
                      <span className="progress-value">
                        {goal.progress.trenutni_troskovi} / {goal.cilj_troskova} €
                      </span>
                    </div>
                    <div className="progress-bar-wrapper">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(goal.progress.postotak_troskova || 0, 100)}%`,
                          backgroundColor: goal.progress.status === 'postignuto' ? '#10b981' : goal.progress.status === 'prekoraceno' ? '#ef4444' : goal.progress.status === 'upozorenje' ? '#f59e0b' : '#6b7280'
                        }}
                      />
                    </div>
                    <div className="progress-percentage">{goal.progress.postotak_troskova}%</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
