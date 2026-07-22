import { useState, useEffect, useRef } from 'react';
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import householdsService from '../services/households.service';
import reportsService from '../services/reports.service';
import './Reports.css';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// jsPDF (Helvetica) ne podrzava dijakritike — zamjena s ASCII ekvivalentima
const lat = (s) => String(s ?? '')
  .replace(/[čć]/g, 'c').replace(/[ČĆ]/g, 'C')
  .replace(/š/g, 's').replace(/Š/g, 'S')
  .replace(/ž/g, 'z').replace(/Ž/g, 'Z')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D');

// Formatiraj datum iz ISO stringa ili MySQL DATE stringa u DD.MM.YYYY
const fmtDatum = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${dt.getFullYear()}`;
};

const Reports = () => {
  const reportRef = useRef(null);
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

  const exportToPDF = async () => {
    if (!reportData) {
      toast.error('Nema podataka za export');
      return;
    }

    try {
      toast.loading('Generiranje PDF-a...', { id: 'pdf-export' });

      const selectedHouseholdName = households.find(h => h.id_kucanstvo === selectedHousehold)?.naziv || 'Kućanstvo';

      // Kreiraj novi PDF dokument
      const doc = new jsPDF();

      // Vite/ESM compatibility fix: Manually add autoTable if not auto-attached
      // jspdf-autotable v5+ doesn't auto-extend in Vite builds
      if (!doc.autoTable) {
        // Attach autoTable function to this doc instance
        doc.autoTable = function(options) {
          return autoTable(this, options);
        };
      }

      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Izvjestaj Potrosnje Energije', pageWidth / 2, yPos, { align: 'center' });

      yPos += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(lat(selectedHouseholdName), pageWidth / 2, yPos, { align: 'center' });

      yPos += 6;
      doc.setFontSize(10);
      doc.text(`Razdoblje: ${filters.datumOd} do ${filters.datumDo}`, pageWidth / 2, yPos, { align: 'center' });
      doc.text(`Generirano: ${new Date().toLocaleDateString('hr-HR')}`, pageWidth / 2, yPos + 5, { align: 'center' });

      yPos += 15;

      // Sazetak
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Sazetak', 14, yPos);
      yPos += 8;

      doc.autoTable({
        startY: yPos,
        head: [['Metrika', 'Vrijednost']],
        body: [
          ['Ukupna potrosnja', `${reportData.summary.ukupna_potrosnja_kwh} kWh`],
          ['Prosjecna dnevna', `${reportData.summary.prosjecna_dnevna_kwh} kWh`],
          ['Broj uredjaja', reportData.summary.broj_uredjaja],
          ['Broj dana u rasponu', reportData.summary.broj_dana],
        ],
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 10 },
      });

      yPos = doc.lastAutoTable.finalY + 10;

      // Top 10 potrosaca
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Top 10 potrosaca', 14, yPos);
      yPos += 6;

      const topDevicesData = reportData.topDevices.slice(0, 10).map((device, idx) => [
        idx + 1,
        lat(device.naziv),
        lat(device.tip_uredjaja),
        lat(device.prostorija),
        `${device.potrosnja_kwh} kWh`,
      ]);

      doc.autoTable({
        startY: yPos,
        head: [['#', 'Uredjaj', 'Tip', 'Prostorija', 'Potrosnja']],
        body: topDevicesData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 10 },
          4: { halign: 'right' },
        },
      });

      yPos = doc.lastAutoTable.finalY + 10;

      if (yPos > 250) { doc.addPage(); yPos = 20; }

      // Potrosnja po prostorijama
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Potrosnja po Prostorijama', 14, yPos);
      yPos += 6;

      const roomData = reportData.byRoom.map((room) => [
        lat(room.prostorija),
        lat(room.tip_prostorije) || 'N/A',
        `${room.potrosnja_kwh} kWh`,
      ]);

      doc.autoTable({
        startY: yPos,
        head: [['Prostorija', 'Tip', 'Potrosnja']],
        body: roomData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 10 },
        columnStyles: { 2: { halign: 'right' } },
      });

      yPos = doc.lastAutoTable.finalY + 10;

      if (yPos > 250) { doc.addPage(); yPos = 20; }

      // Potrosnja po tipu uredjaja
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Potrosnja po Tipu Uredjaja', 14, yPos);
      yPos += 6;

      const typeData = reportData.byDeviceType.map((type) => [
        lat(type.tip_uredjaja),
        type.broj_uredjaja,
        `${type.potrosnja_kwh} kWh`,
      ]);

      doc.autoTable({
        startY: yPos,
        head: [['Tip Uredjaja', 'Broj Uredjaja', 'Potrosnja']],
        body: typeData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 10 },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'right' },
        },
      });

      // Footer na svakoj stranici
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text(
          `Stranica ${i} od ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
        doc.text(
          'EcoMetrix - Sustav za pracenje potrosnje energije',
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 6,
          { align: 'center' }
        );
      }

      // Spremi PDF
      doc.save(`izvjestaj_${lat(selectedHouseholdName)}_${filters.datumOd}_${filters.datumDo}.pdf`);
      toast.success('PDF uspješno exportan!', { id: 'pdf-export' });
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Greška pri exportu PDF-a', { id: 'pdf-export' });
    }
  };

  const exportToExcel = () => {
    if (!reportData) return;

    const householdName = households.find(h => h.id_kucanstvo === selectedHousehold)?.naziv || '';
    const sep = ';'; // europski Excel koristi ; kao separator
    const lines = [];

    // Naslov
    lines.push(`EcoMetrix - Izvjestaj potrosnje energije`);
    lines.push(`Kucanstvo${sep}${householdName}`);
    lines.push(`Razdoblje${sep}${filters.datumOd} - ${filters.datumDo}`);
    lines.push(`Broj dana${sep}${reportData.summary.broj_dana}`);
    lines.push('');

    // Sazetak
    lines.push('SAZETAK');
    lines.push(`Metrika${sep}Vrijednost`);
    lines.push(`Ukupna potrosnja (kWh)${sep}${reportData.summary.ukupna_potrosnja_kwh}`);
    lines.push(`Prosjecna dnevna (kWh)${sep}${reportData.summary.prosjecna_dnevna_kwh}`);
    lines.push(`Broj uredjaja${sep}${reportData.summary.broj_uredjaja}`);
    lines.push(`Broj dana${sep}${reportData.summary.broj_dana}`);
    lines.push('');

    // Vremenska serija
    lines.push('POTROSNJA KROZ VRIJEME');
    lines.push(`Datum${sep}Potrosnja (kWh)`);
    reportData.timeSeries.forEach(item => {
      lines.push(`${fmtDatum(item.datum)}${sep}${item.potrosnja_kwh}`);
    });
    lines.push('');

    // Top uredjaji
    lines.push('TOP UREDJAJI');
    lines.push(`#${sep}Uredjaj${sep}Tip${sep}Prostorija${sep}Potrosnja (kWh)`);
    reportData.topDevices.forEach((device, idx) => {
      lines.push(`${idx + 1}${sep}${device.naziv}${sep}${device.tip_uredjaja}${sep}${device.prostorija}${sep}${device.potrosnja_kwh}`);
    });
    lines.push('');

    // Po prostorijama
    lines.push('PO PROSTORIJAMA');
    lines.push(`Prostorija${sep}Tip${sep}Potrosnja (kWh)`);
    reportData.byRoom.forEach(room => {
      lines.push(`${room.prostorija}${sep}${room.tip_prostorije || ''}${sep}${room.potrosnja_kwh}`);
    });
    lines.push('');

    // Po tipu uredjaja
    lines.push('PO TIPU UREDJAJA');
    lines.push(`Tip${sep}Broj uredjaja${sep}Potrosnja (kWh)`);
    reportData.byDeviceType.forEach(type => {
      lines.push(`${type.tip_uredjaja}${sep}${type.broj_uredjaja}${sep}${type.potrosnja_kwh}`);
    });

    // UTF-8 BOM osigurava da Excel pravilno otvori dijakritike
    const BOM = '﻿';
    const csv = BOM + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `izvjestaj_${householdName.replace(/\s+/g, '_')}_${filters.datumOd}_${filters.datumDo}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success('Izvještaj exportan kao CSV');
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
            <div className="report-content" ref={reportRef}>
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
                      <XAxis
                        dataKey="datum"
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(d) => {
                          const dt = new Date(d);
                          return isNaN(dt) ? d : `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.`;
                        }}
                      />
                      <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                        formatter={(value) => [`${value} kWh`, 'Potrošnja']}
                        labelFormatter={(d) => {
                          const dt = new Date(d);
                          return isNaN(dt) ? d : dt.toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="potrosnja_kwh"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ fill: '#2563eb', r: 4 }}
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
                          dataKey="potrosnja_kwh"
                          nameKey="prostorija"
                        >
                          {reportData.byRoom.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value} kWh`, name]} />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
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
                          dataKey="potrosnja_kwh"
                          nameKey="tip_uredjaja"
                        >
                          {reportData.byDeviceType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value} kWh`, name]} />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
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
