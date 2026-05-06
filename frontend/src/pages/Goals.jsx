import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import householdsService from '../services/households.service';
import goalsService from '../services/goals.service';
import costsService from '../services/costs.service';
import ConfirmDialog from '../components/ConfirmDialog';
import './Goals.css';

const Goals = () => {
  const [households, setHouseholds] = useState([]);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [cijenaKwh, setCijenaKwh] = useState(0.15);

  // Form state — cilj_kwh se automatski izračunava iz cilj_troskova / cijena_kwh
  const [formData, setFormData] = useState({
    naziv: '',
    tip_cilja: 'mjesecni',
    cilj_troskova: '',
    datum_pocetka: '',
    datum_zavrsetka: '',
  });

  useEffect(() => {
    loadHouseholds();
  }, []);

  useEffect(() => {
    if (selectedHousehold) {
      loadGoals();
      costsService.getElectricityPrice(selectedHousehold)
        .then(data => setCijenaKwh(data.cijena_kwh || 0.15))
        .catch(() => {});
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

  const loadGoals = async () => {
    if (!selectedHousehold) return;

    try {
      setLoading(true);
      const data = await goalsService.getAll(selectedHousehold);
      setGoals(data.goals || []);
    } catch (err) {
      console.error('Error loading goals:', err);
      toast.error('Greška prilikom učitavanja ciljeva');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (goal = null) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData({
        naziv: goal.naziv,
        tip_cilja: goal.tip_cilja,
        cilj_troskova: goal.cilj_troskova || '',
        datum_pocetka: goal.datum_pocetka,
        datum_zavrsetka: goal.datum_zavrsetka
      });
    } else {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      setEditingGoal(null);
      setFormData({
        naziv: `Cilj ${today.getMonth() + 1}/${today.getFullYear()}`,
        tip_cilja: 'mjesecni',
        cilj_troskova: '',
        datum_pocetka: startDate.toISOString().split('T')[0],
        datum_zavrsetka: endDate.toISOString().split('T')[0]
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGoal(null);
    setFormData({
      naziv: '',
      tip_cilja: 'mjesecni',
      cilj_troskova: '',
      datum_pocetka: '',
      datum_zavrsetka: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.naziv || !formData.datum_pocetka || !formData.datum_zavrsetka) {
      toast.error('Molimo popunite sve obavezne podatke');
      return;
    }

    if (!formData.cilj_troskova || parseFloat(formData.cilj_troskova) <= 0) {
      toast.error('Unesite ciljani trošak u eurima');
      return;
    }

    try {
      const cijenaKwhVal = cijenaKwh > 0 ? cijenaKwh : 0.15;
      const goalData = {
        ...formData,
        cilj_troskova: parseFloat(formData.cilj_troskova),
        cilj_kwh: parseFloat((parseFloat(formData.cilj_troskova) / cijenaKwhVal).toFixed(2)),
      };

      if (editingGoal) {
        await goalsService.update(selectedHousehold, editingGoal.cilj_id, {
          ...goalData,
          aktivan: editingGoal.aktivan,
        });
        toast.success('Cilj uspješno ažuriran');
      } else {
        await goalsService.create(selectedHousehold, goalData);
        toast.success('Cilj uspješno kreiran');
      }

      handleCloseModal();
      loadGoals();
    } catch (err) {
      toast.error('Greška prilikom spremanja cilja');
    }
  };

  const handleDeleteClick = (goal) => {
    setGoalToDelete(goal);
    setShowConfirmDelete(true);
  };

  const handleDeleteConfirm = async () => {
    if (!goalToDelete) return;

    try {
      await goalsService.delete(selectedHousehold, goalToDelete.cilj_id);
      toast.success('Cilj uspješno obrisan');
      loadGoals();
    } catch (err) {
      toast.error('Greška prilikom brisanja cilja');
    } finally {
      setShowConfirmDelete(false);
      setGoalToDelete(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'postignuto':
        return '#10b981';
      case 'prekoraceno':
        return '#ef4444';
      case 'upozorenje':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'postignuto':
        return 'Postignuto';
      case 'prekoraceno':
        return 'Prekoračeno';
      case 'upozorenje':
        return 'Upozorenje';
      default:
        return 'U tijeku';
    }
  };

  if (loading && !selectedHousehold) {
    return (
      <div className="goals-loading">
        <p>Učitavam podatke...</p>
      </div>
    );
  }

  if (households.length === 0) {
    return (
      <div className="goals-empty">
        <h2>Nema kućanstava</h2>
        <p>Prvo dodajte kućanstvo kako biste mogli postavljati ciljeve.</p>
      </div>
    );
  }

  return (
    <div className="goals-page">
      <div className="page-header">
        <div>
          <h1>Ciljevi štednje</h1>
          <p>Postavite i pratite ciljeve potrošnje i troškova</p>
        </div>
        <button onClick={() => handleOpenModal()} className="add-goal-btn">
          + Novi cilj
        </button>
      </div>

      {/* Household Selector */}
      <div className="goals-control">
        <label>Kućanstvo:</label>
        <select
          value={selectedHousehold || ''}
          onChange={(e) => setSelectedHousehold(Number(e.target.value))}
          className="goals-select"
        >
          {households.map((h) => (
            <option key={h.id_kucanstvo} value={h.id_kucanstvo}>
              {h.naziv}
            </option>
          ))}
        </select>
      </div>

      {/* Goals Grid */}
      {loading ? (
        <div className="goals-loading">
          <p>Učitavam ciljeve...</p>
        </div>
      ) : goals.length === 0 ? (
        <div className="no-goals">
          <h3>📊 Nema postavljenih ciljeva</h3>
          <p>Kliknite "Novi cilj" za kreiranje prvog cilja štednje</p>
        </div>
      ) : (
        <div className="goals-grid">
          {goals.map((goal) => (
            <div key={goal.cilj_id} className="goal-card">
              <div className="goal-header">
                <h3>{goal.naziv}</h3>
                <div className="goal-actions">
                  <button onClick={() => handleOpenModal(goal)} className="edit-btn" title="Uredi">
                    ✏️
                  </button>
                  <button onClick={() => handleDeleteClick(goal)} className="delete-btn" title="Obriši">
                    🗑️
                  </button>
                </div>
              </div>

              <div className="goal-period">
                📅 {new Date(goal.datum_pocetka).toLocaleDateString('hr-HR')} -{' '}
                {new Date(goal.datum_zavrsetka).toLocaleDateString('hr-HR')}
              </div>

              <div className="goal-targets">
                <div className="target-item">
                  <div className="target-label">Ciljani trošak</div>
                  <div className="target-value">{goal.cilj_troskova} €</div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(goal.progress.postotak_troskova || 0, 100)}%`,
                        background: getStatusColor(goal.progress.status),
                      }}
                    />
                  </div>
                  <div className="progress-text">
                    {goal.progress.trenutni_troskovi} € / {goal.cilj_troskova} € ({goal.progress.postotak_troskova ?? 0}%)
                  </div>
                  {goal.cilj_kwh && (
                    <div className="target-kwh-hint">
                      ≈ {goal.cilj_kwh} kWh pri {cijenaKwh.toFixed(4)} €/kWh
                    </div>
                  )}
                </div>
              </div>

              <div className="goal-status" style={{ color: getStatusColor(goal.progress.status) }}>
                <strong>{getStatusText(goal.progress.status)}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingGoal ? 'Uredi cilj' : 'Novi cilj'}</h2>
              <button onClick={handleCloseModal} className="modal-close">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="goal-form">
              <div className="form-group">
                <label>Naziv cilja *</label>
                <input
                  type="text"
                  value={formData.naziv}
                  onChange={(e) => setFormData({ ...formData, naziv: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Datum početka *</label>
                  <input
                    type="date"
                    value={formData.datum_pocetka}
                    onChange={(e) => setFormData({ ...formData, datum_pocetka: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Datum završetka *</label>
                  <input
                    type="date"
                    value={formData.datum_zavrsetka}
                    onChange={(e) => setFormData({ ...formData, datum_zavrsetka: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Ciljani trošak (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.cilj_troskova}
                  onChange={(e) => setFormData({ ...formData, cilj_troskova: e.target.value })}
                  className="form-input"
                  placeholder="npr. 50.00"
                  required
                />
                {formData.cilj_troskova && cijenaKwh > 0 && (
                  <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                    ≈ {(parseFloat(formData.cilj_troskova) / cijenaKwh).toFixed(1)} kWh pri {cijenaKwh.toFixed(4)} €/kWh
                  </small>
                )}
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCloseModal} className="cancel-btn">
                  Odustani
                </button>
                <button type="submit" className="submit-btn">
                  {editingGoal ? 'Spremi promjene' : 'Kreiraj cilj'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDeleteConfirm}
        title="Obriši cilj"
        message={`Jeste li sigurni da želite obrisati cilj "${goalToDelete?.naziv}"?`}
      />
    </div>
  );
};

export default Goals;
