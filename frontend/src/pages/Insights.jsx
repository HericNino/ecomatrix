import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import householdsService from '../services/households.service';
import insightsService from '../services/insights.service';
import './Insights.css';

const Insights = () => {
  const [households, setHouseholds] = useState([]);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    loadHouseholds();
  }, []);

  useEffect(() => {
    if (selectedHousehold) {
      loadInsights();
    }
  }, [selectedHousehold, period]);

  const loadHouseholds = async () => {
    try {
      const data = await householdsService.getAll();
      const allHouseholds = data.households || [];
      setHouseholds(allHouseholds);
      if (allHouseholds.length > 0) {
        setSelectedHousehold(allHouseholds[0].id_kucanstvo);
      }
    } catch (err) {
      toast.error('Greška prilikom učitavanja kućanstava');
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async () => {
    if (!selectedHousehold) return;

    try {
      setLoading(true);
      const [patternsData, recommendationsData, comparisonData] = await Promise.all([
        insightsService.getPatterns(selectedHousehold, period),
        insightsService.getMLRecommendations(selectedHousehold, period), // Koristi ML preporuke
        insightsService.getComparison(selectedHousehold, period),
      ]);

      setPatterns(patternsData);
      setRecommendations(recommendationsData.recommendations || []);
      setComparison(comparisonData);
    } catch (err) {
      console.error('Error loading insights:', err);
      toast.error('Greška prilikom učitavanja analiza');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high':
        return 'Visok prioritet';
      case 'medium':
        return 'Srednji prioritet';
      case 'low':
        return 'Nizak prioritet';
      default:
        return '';
    }
  };

  if (loading && !selectedHousehold) {
    return (
      <div className="insights-loading">
        <p>Učitavam podatke...</p>
      </div>
    );
  }

  if (households.length === 0) {
    return (
      <div className="insights-empty">
        <h2>Nema kućanstava</h2>
        <p>Prvo dodajte kućanstvo i uređaje kako biste vidjeli analize.</p>
      </div>
    );
  }

  return (
    <div className="insights-page">
      <div className="page-header">
        <div>
          <h1>Uvidi i preporuke</h1>
          <p>Analizirajte obrasce potrošnje i dobijte personalizirane preporuke</p>
        </div>
      </div>

      {/* Controls */}
      <div className="insights-controls">
        <div className="control-group">
          <label>Kućanstvo:</label>
          <select
            value={selectedHousehold || ''}
            onChange={(e) => setSelectedHousehold(Number(e.target.value))}
            className="control-select"
          >
            {households.map((h) => (
              <option key={h.id_kucanstvo} value={h.id_kucanstvo}>
                {h.naziv}
              </option>
            ))}
          </select>
        </div>
        <div className="control-group">
          <label>Razdoblje:</label>
          <select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="control-select">
            <option value={7}>Zadnjih 7 dana</option>
            <option value={14}>Zadnjih 14 dana</option>
            <option value={30}>Zadnjih 30 dana</option>
            <option value={60}>Zadnjih 60 dana</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="insights-loading">
          <p>Analiziram podatke...</p>
        </div>
      ) : (
        <>
          {/* Comparison Card */}
          {comparison && (
            <div className="comparison-section">
              <h2>Usporedba s prošlim razdobljem</h2>
              <div className="comparison-card">
                <div className="comparison-item">
                  <span className="comparison-label">Trenutno razdoblje</span>
                  <span className="comparison-value">{comparison.currentPeriod.total} kWh</span>
                </div>
                <div className="comparison-arrow">
                  {comparison.change.trend === 'gore' && <span className="trend-up">↗</span>}
                  {comparison.change.trend === 'dolje' && <span className="trend-down">↘</span>}
                  {comparison.change.trend === 'stabilno' && <span className="trend-stable">→</span>}
                </div>
                <div className="comparison-item">
                  <span className="comparison-label">Prošlo razdoblje</span>
                  <span className="comparison-value">{comparison.previousPeriod.total} kWh</span>
                </div>
                <div className="comparison-change">
                  <span
                    className={`change-badge ${comparison.change.trend}`}
                    style={{
                      color: comparison.change.trend === 'dolje' ? '#10b981' : comparison.change.trend === 'gore' ? '#ef4444' : '#6b7280',
                    }}
                  >
                    {comparison.change.percentage > 0 ? '+' : ''}
                    {comparison.change.percentage}%
                  </span>
                  <span className="change-text">
                    {comparison.change.trend === 'dolje' && '🎉 Smanjili ste potrošnju!'}
                    {comparison.change.trend === 'gore' && '⚠️ Potrošnja je porasla'}
                    {comparison.change.trend === 'stabilno' && 'Stabilna potrošnja'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="recommendations-section">
              <h2>Personalizirane preporuke</h2>
              <div className="recommendations-grid">
                {recommendations.map((rec, index) => (
                  <div key={index} className="recommendation-card" style={{ borderLeftColor: getPriorityColor(rec.priority) }}>
                    <div className="rec-header">
                      <span className="rec-icon">{rec.icon}</span>
                      <span className="rec-priority" style={{ color: getPriorityColor(rec.priority) }}>
                        {getPriorityLabel(rec.priority)}
                      </span>
                    </div>
                    <h3>{rec.title}</h3>
                    <p>{rec.description}</p>
                    {rec.potentialSavings && (
                      <div className="rec-savings">
                        <span>💰 Potencijalna ušteda: {rec.potentialSavings}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patterns */}
          {patterns && patterns.peakHours && (
            <div className="patterns-section">
              <h2>Obrasci potrošnje</h2>

              {/* Peak Hours */}
              <div className="pattern-card">
                <h3>⏰ Špic sati potrošnje</h3>
                <div className="peak-hours">
                  {patterns.peakHours.map((peak, idx) => (
                    <div key={idx} className="peak-item">
                      <span className="peak-hour">{peak.hour}:00</span>
                      <div className="peak-bar-container">
                        <div
                          className="peak-bar"
                          style={{
                            width: `${(peak.consumption / patterns.peakHours[0].consumption) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="peak-value">{peak.consumption.toFixed(2)} kWh</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekday Patterns */}
              {patterns.weekdayPatterns && patterns.weekdayPatterns.length > 0 && (
                <div className="pattern-card">
                  <h3>📅 Potrošnja po danima</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={patterns.weekdayPatterns}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="day" stroke="#718096" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#718096" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          background: 'white',
                          border: '1px solid #e0e0e0',
                          borderRadius: '6px',
                        }}
                        formatter={(value) => [`${value.toFixed(2)} kWh`, 'Potrošnja']}
                      />
                      <Legend />
                      <Bar dataKey="consumption" fill="#10b981" name="Potrošnja (kWh)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Top Consumers */}
              {patterns.topConsumers && patterns.topConsumers.length > 0 && (
                <div className="pattern-card">
                  <h3>🔥 Top potrošači</h3>
                  <div className="top-consumers">
                    {patterns.topConsumers.map((device, idx) => (
                      <div key={idx} className="consumer-item">
                        <div className="consumer-rank">#{idx + 1}</div>
                        <div className="consumer-info">
                          <span className="consumer-name">{device.naziv}</span>
                          <span className="consumer-location">{device.prostorija}</span>
                        </div>
                        <span className="consumer-value">{device.total.toFixed(2)} kWh</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!patterns?.peakHours && !loading && (
            <div className="no-data">
              <h3>📊 Nema dovoljno podataka</h3>
              <p>
                Potrebno je više mjerenja kako bi se mogle generirati analize.
                Uvjerite se da su uređaji povezani s pametnim utičnicama i da prikupljanje podataka radi.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Insights;
