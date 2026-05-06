import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import householdsService from '../services/households.service';
import costsService from '../services/costs.service';
import './Settings.css';

const Settings = () => {
  const [households, setHouseholds] = useState([]);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [cijenaKwh, setCijenaKwh] = useState(0.15);
  const [valuta, setValuta] = useState('EUR');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadHouseholds();
  }, []);

  useEffect(() => {
    if (selectedHousehold) {
      loadElectricityPrice();
    }
  }, [selectedHousehold]);

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

  const loadElectricityPrice = async () => {
    if (!selectedHousehold) return;

    try {
      const data = await costsService.getElectricityPrice(selectedHousehold);
      setCijenaKwh(data.cijena_kwh || 0.15);
      setValuta(data.valuta || 'EUR');
    } catch (err) {
      console.error('Error loading electricity price:', err);
      // Postavi zadane vrijednosti ako greška
      setCijenaKwh(0.15);
      setValuta('EUR');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!selectedHousehold) {
      toast.error('Odaberite kućanstvo');
      return;
    }

    if (cijenaKwh <= 0) {
      toast.error('Cijena mora biti veća od 0');
      return;
    }

    try {
      setSaving(true);
      await costsService.setElectricityPrice(selectedHousehold, cijenaKwh, valuta);
      toast.success('Postavke uspješno spremljene');
    } catch (err) {
      toast.error('Greška prilikom spremanja postavki');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !selectedHousehold) {
    return (
      <div className="settings-loading">
        <p>Učitavam podatke...</p>
      </div>
    );
  }

  if (households.length === 0) {
    return (
      <div className="settings-empty">
        <h2>Nema kućanstava</h2>
        <p>Prvo dodajte kućanstvo kako biste mogli koristiti postavke.</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1>Postavke</h1>
          <p>Upravljajte postavkama za vaša kućanstva</p>
        </div>
      </div>

      {/* Household Selector */}
      <div className="settings-control">
        <label>Kućanstvo:</label>
        <select
          value={selectedHousehold || ''}
          onChange={(e) => setSelectedHousehold(Number(e.target.value))}
          className="settings-select"
        >
          {households.map((h) => (
            <option key={h.id_kucanstvo} value={h.id_kucanstvo}>
              {h.naziv}
            </option>
          ))}
        </select>
      </div>

      {/* Electricity Price Settings */}
      <div className="settings-section">
        <h2>⚡ Cijena struje</h2>
        <p className="section-description">
          Postavite cijenu struje kako biste mogli pratiti troškove potrošnje
        </p>

        <form onSubmit={handleSave} className="settings-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cijena">Cijena (€/kWh)</label>
              <input
                type="number"
                id="cijena"
                step="0.0001"
                min="0"
                value={cijenaKwh}
                onChange={(e) => setCijenaKwh(parseFloat(e.target.value))}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="valuta">Valuta</label>
              <select
                id="valuta"
                value={valuta}
                onChange={(e) => setValuta(e.target.value)}
                className="form-input"
              >
                <option value="EUR">EUR (€)</option>
                <option value="HRK">HRK (kn)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <div className="price-preview">
            <strong>Primjer:</strong> 100 kWh × {cijenaKwh} €/kWh = {(cijenaKwh * 100).toFixed(2)} {valuta}
          </div>

          <button type="submit" className="save-btn" disabled={saving}>
            {saving ? 'Spremam...' : 'Spremi postavke'}
          </button>
        </form>
      </div>

      {/* Info Section */}
      <div className="settings-info">
        <h3>💡 Kako pronaći cijenu struje?</h3>
        <ul>
          <li>Provjerite svoj zadnji račun za struju</li>
          <li>Cijena je obično navedena kao kn/kWh ili €/kWh</li>
          <li>Prosječna cijena u Hrvatskoj je oko 0.15 €/kWh</li>
        </ul>
      </div>
    </div>
  );
};

export default Settings;
