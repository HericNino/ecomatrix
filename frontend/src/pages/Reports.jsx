import { useState, useEffect } from 'react';
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
  ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';
import householdsService from '../services/households.service';
import reportsService from '../services/reports.service';
import './Reports.css';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const Reports = () => {
  const [households, setHouseholds] = useState([]);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [showComparison, setShowComparison] = useState(false);

  // Filtri
  const [filters, setFilters] = useState({
    datumOd: getDefaultDateFrom(),
    datumDo: getDefaultDateTo(),
    groupBy: 'day'
  });

  // Filtri za usporedbu
  const [comparisonFilters, setComparisonFilters] = useState({
    period1Start: '',
    period1End: '',
    period2Start: '',
    period2End: ''
  });

  useEffect(() => {
    loadHouseholds();
  }, []);

  useEffect(() => {
    if (selectedHousehold) {
      loadReport();
    }
  }, [selectedHousehold, filters.groupBy]);

  function getDefaultDateFrom() {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Zadnjih 30 dana
    return date.toISOString().split('T')[0];
  }

  function getDefaultDateTo() {
    const date = new Date();
    return date.toISOString().split('T')[0];
  }

  const loadHouseholds = async () => {
    try {
      const data = await householdsService.getAll();
      const allHouseholds = data.households || [];
      setHouseholds(allHouseholds);
      if (allHouseholds.length > 0) {
        setSelectedHousehold(allHouseholds[0].id_kucanstvo);
      }
    } catch (err) {
      toast.error('Greška pri učitavanju kućanstava');
    }
  };

  const loadReport = async () => {
    if (!selectedHousehold) return;

    try {
      setLoading(true);
      const data = await reportsService.getConsumptionReport(
        selectedHousehold,
        filters.datumOd,
        filters.datumDo,
        filters.groupBy
      );
      setReportData(data);
    } catch (err) {
      console.error('Greska pri ucitavanju izvjestaja:', err);
      toast.error('Greška pri učitavanju izvještaja');
    } finally {
      setLoading(false);
    }
  };

  const loadComparison = async () => {
    if (!selectedHousehold) return;

    const { period1Start, period1End, period2Start, period2End } = comparisonFilters;

    if (!period1Start || !period1End || !period2Start || !period2End) {
      toast.error('Unesite oba razdoblja za usporedbu');
      return;
    }

    try {
      setLoading(true);
      const data = await reportsService.comparePeriods(
        selectedHousehold,
        period1Start,
        period1End,
        period2Start,
        period2End
      );
      setComparisonData(data);
    } catch (err) {
      console.error('Greska pri usporedbi:', err);
      toast.error('Greška pri usporedbi razdoblja');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleComparisonFilterChange = (e) => {
    setComparisonFilters({
      ...comparisonFilters,
      [e.target.name]: e.target.value
    });
  };

  const handleGenerateReport = () => {
    loadReport();
  };

  const handleGenerateComparison = () => {
    loadComparison();
  };

  const exportToPDF = () => {
    // TODO: Implementiraj PDF export
    toast('PDF export dolazi uskoro...', { icon: '📄' });
  };

  const exportToExcel = () => {
    if (!reportData) return;

    // Jednostavan CSV export (moze se koristiti kao Excel)
    let csv = 'Datum,Potrošnja (kWh)\n';
    reportData.timeSeries.forEach(item => {
      csv += `${item.datum},${item.potrosnja_kwh}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `izvjestaj_${filters.datumOd}_${filters.datumDo}.csv`;
    link.click();
    toast.success('Izvještaj exportan');
  };

  if (households.length === 0) {
    return (
      <div className="reports-empty">
        <h2>Nema kućanstava</h2>
        <p>Prvo dodajte kućanstvo za generiranje izvještaja</p>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1>Izvještaji potrošnje</h1>
          <p>Detaljne analize i usporedbe potrošnje energije</p>
        </div>
        <div className="header-actions">
          <button onClick={exportToPDF} className="export-btn pdf-btn" disabled={!reportData}>
            📄 PDF
          </button>
          <button onClick={exportToExcel} className="export-btn excel-btn" disabled={!reportData}>
            📊 Excel
          </button>
        </div>
      </div>

      {/* Household & Mode Selector */}
      <div className="reports-controls">
        <div className="control-group">
          <label>Kućanstvo:</label>
          <select
            value={selectedHousehold || ''}
            onChange={(e) => setSelectedHousehold(Number(e.target.value))}
            className="control-select"
          >
            {households.map(h => (
              <option key={h.id_kucanstvo} value={h.id_kucanstvo}>
                {h.naziv}
              </option>
            ))}
          </select>
        </div>

        <div className="mode-toggle">
          <button
            className={!showComparison ? 'mode-btn active' : 'mode-btn'}
            onClick={() => setShowComparison(false)}
          >
            Izvještaj
          </button>
          <button
            className={showComparison ? 'mode-btn active' : 'mode-btn'}
            onClick={() => setShowComparison(true)}
          >
            Usporedba
          </button>
        </div>
      </div>

      {/* Report Mode */}
      {!showComparison && (
        <>
          <div className="filters-section">
            <div className="filter-row">
              <div className="filter-group">
                <label>Od:</label>
                <input
                  type="date"
                  name="datumOd"
                  value={filters.datumOd}
                  onChange={handleFilterChange}
                  className="filter-input"
                />
              </div>
              <div className="filter-group">
                <label>Do:</label>
                <input
                  type="date"
                  name="datumDo"
                  value={filters.datumDo}
                  onChange={handleFilterChange}
                  className="filter-input"
                />
              </div>
              <div className="filter-group">
                <label>Grupiranje:</label>
                <select
                  name="groupBy"
                  value={filters.groupBy}
                  onChange={handleFilterChange}
                  className="filter-select"
                >
                  <option value="hour">Po satu</option>
                  <option value="day">Po danu</option>
                  <option value="week">Po tjednu</option>
                  <option value="month">Po mjesecu</option>
                  <option value="year">Po godini</option>
                </select>
              </div>
              <button onClick={handleGenerateReport} className="generate-btn" disabled={loading}>
                {loading ? 'Generiranje...' : 'Generiraj'}
              </button>
            </div>
          </div>

          {/* Report Data */}
          {reportData && (
            <div className="report-content">
              {/* Summary Cards */}
              <div className="summary-grid">
                <div className="summary-card">
                  <div className="summary-icon">⚡</div>
                  <div className="summary-details">
                    <h3>{reportData.summary.ukupna_potrosnja_kwh} kWh</h3>
                    <p>Ukupna potrošnja</p>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-icon">📊</div>
                  <div className="summary-details">
                    <h3>{reportData.summary.prosjecna_dnevna_kwh} kWh</h3>
                    <p>Prosječna dnevna</p>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-icon">💡</div>
                  <div className="summary-details">
                    <h3>{reportData.summary.broj_uredjaja}</h3>
                    <p>Aktivnih uređaja</p>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-icon">📅</div>
                  <div className="summary-details">
                    <h3>{reportData.summary.broj_dana}</h3>
                    <p>Dana u razdoblju</p>
                  </div>
                </div>
              </div>

              {/* Time Series Chart */}
              <div className="chart-section">
                <h2>Potrošnja kroz vrijeme</h2>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={reportData.timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="datum" stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                        formatter={(value) => [`${value} kWh`, 'Potrošnja']}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="potrosnja_kwh"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ fill: '#10b981', r: 4 }}
                        name="Potrošnja (kWh)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Devices */}
              <div className="chart-section">
                <h2>Top 10 potrošača</h2>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={reportData.topDevices}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="naziv" stroke="#6b7280" style={{ fontSize: '11px' }} />
                      <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                        formatter={(value) => [`${value} kWh`, 'Potrošnja']}
                      />
                      <Legend />
                      <Bar dataKey="potrosnja_kwh" fill="#3b82f6" name="Potrošnja (kWh)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* By Room & Device Type */}
              <div className="charts-row">
                <div className="chart-section half">
                  <h2>Po prostorijama</h2>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={reportData.byRoom}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.prostorija}: ${entry.potrosnja_kwh} kWh`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="potrosnja_kwh"
                        >
                          {reportData.byRoom.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} kWh`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-section half">
                  <h2>Po tipu uređaja</h2>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={reportData.byDeviceType}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.tip_uredjaja}: ${entry.potrosnja_kwh} kWh`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="potrosnja_kwh"
                        >
                          {reportData.byDeviceType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} kWh`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Comparison Mode */}
      {showComparison && (
        <>
          <div className="filters-section">
            <div className="comparison-filters">
              <div className="period-group">
                <h3>Razdoblje 1</h3>
                <div className="filter-row">
                  <div className="filter-group">
                    <label>Od:</label>
                    <input
                      type="date"
                      name="period1Start"
                      value={comparisonFilters.period1Start}
                      onChange={handleComparisonFilterChange}
                      className="filter-input"
                    />
                  </div>
                  <div className="filter-group">
                    <label>Do:</label>
                    <input
                      type="date"
                      name="period1End"
                      value={comparisonFilters.period1End}
                      onChange={handleComparisonFilterChange}
                      className="filter-input"
                    />
                  </div>
                </div>
              </div>

              <div className="period-group">
                <h3>Razdoblje 2</h3>
                <div className="filter-row">
                  <div className="filter-group">
                    <label>Od:</label>
                    <input
                      type="date"
                      name="period2Start"
                      value={comparisonFilters.period2Start}
                      onChange={handleComparisonFilterChange}
                      className="filter-input"
                    />
                  </div>
                  <div className="filter-group">
                    <label>Do:</label>
                    <input
                      type="date"
                      name="period2End"
                      value={comparisonFilters.period2End}
                      onChange={handleComparisonFilterChange}
                      className="filter-input"
                    />
                  </div>
                </div>
              </div>

              <button onClick={handleGenerateComparison} className="generate-btn" disabled={loading}>
                {loading ? 'Uspoređujem...' : 'Usporedi'}
              </button>
            </div>
          </div>

          {/* Comparison Results */}
          {comparisonData && (
            <div className="comparison-content">
              <div className="comparison-summary">
                <div className="comparison-card">
                  <h3>Razdoblje 1</h3>
                  <p className="period-date">
                    {new Date(comparisonData.period1.od).toLocaleDateString('hr-HR')} - {new Date(comparisonData.period1.do).toLocaleDateString('hr-HR')}
                  </p>
                  <div className="period-stat">
                    <span className="stat-value">{comparisonData.period1.ukupna_potrosnja_kwh} kWh</span>
                    <span className="stat-label">Ukupna potrošnja</span>
                  </div>
                </div>

                <div className="comparison-indicator">
                  <div className={`trend-badge ${comparisonData.trend}`}>
                    {comparisonData.trend === 'rast' && '📈 Rast'}
                    {comparisonData.trend === 'pad' && '📉 Pad'}
                    {comparisonData.trend === 'stabilno' && '➡️ Stabilno'}
                  </div>
                  <div className="difference-value">
                    {comparisonData.difference.postotak > 0 ? '+' : ''}
                    {comparisonData.difference.postotak}%
                  </div>
                  <div className="difference-kwh">
                    ({comparisonData.difference.potrosnja_kwh > 0 ? '+' : ''}
                    {comparisonData.difference.potrosnja_kwh} kWh)
                  </div>
                </div>

                <div className="comparison-card">
                  <h3>Razdoblje 2</h3>
                  <p className="period-date">
                    {new Date(comparisonData.period2.od).toLocaleDateString('hr-HR')} - {new Date(comparisonData.period2.do).toLocaleDateString('hr-HR')}
                  </p>
                  <div className="period-stat">
                    <span className="stat-value">{comparisonData.period2.ukupna_potrosnja_kwh} kWh</span>
                    <span className="stat-label">Ukupna potrošnja</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {loading && !reportData && !comparisonData && (
        <div className="reports-loading">
          <p>Učitavam podatke...</p>
        </div>
      )}
    </div>
  );
};

export default Reports;
