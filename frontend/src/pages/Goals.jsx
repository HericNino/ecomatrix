import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import householdsService from '../services/households.service';
import goalsService from '../services/goals.service';
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

  // Form state
  const [formData, setFormData] = useState({
    naziv: '',
    tip_cilja: 'mjesecni',
    cilj_kwh: '',
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
      // Edit mode
      setEditingGoal(goal);
      setFormData({
        naziv: goal.naziv,
        tip_cilja: goal.tip_cilja,
        cilj_kwh: goal.cilj_kwh || '',
        cilj_troskova: goal.cilj_troskova || '',
        datum_pocetka: goal.datum_pocetka,
        datum_zavrsetka: goal.datum_zavrsetka,
      });
    } else {
      // Create mode - set default dates
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      setEditingGoal(null);
      setFormData({
        naziv: `Cilj ${today.getMonth() + 1}/${today.getFullYear()}`,
        tip_cilja: 'mjesecni',
        cilj_kwh: '',
        cilj_troskova: '',
        datum_pocetka: startDate.toISOString().split('T')[0],
        datum_zavrsetka: endDate.toISOString().split('T')[0],
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
      cilj_kwh: '',
      cilj_troskova: '',
      datum_pocetka: '',
      datum_zavrsetka: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.naziv || !formData.datum_pocetka || !formData.datum_zavrsetka) {
      toast.error('Molimo popunite sve obavezna polja');
      return;
    }

    if (!formData.cilj_kwh && !formData.cilj_troskova) {
      toast.error('Morate postaviti barem jedan cilj (kWh ili troškovi)');
      return;
    }

    try {
      const goalData = {
        ...formData,
        cilj_kwh: formData.cilj_kwh ? parseFloat(formData.cilj_kwh) : null,
        cilj_troskova: formData.cilj_troskova ? parseFloat(formData.cilj_troskova) : null,
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
                {goal.cilj_kwh && (
                  <div className="target-item">
                    <div className="target-label">Cilj potrošnje</div>
                    <div className="target-value">{goal.cilj_kwh} kWh</div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(goal.progress.postotak_kwh || 0, 100)}%`,
                          background: getStatusColor(goal.progress.status),
                        }}
                      />
                    </div>
                    <div className="progress-text">
                      {goal.progress.trenutna_potrosnja_kwh} kWh ({goal.progress.postotak_kwh}%)
                    </div>
                  </div>
                )}

                {goal.cilj_troskova && (
                  <div className="target-item">
                    <div className="target-label">Cilj troškova</div>
                    <div className="target-value">
                      {goal.cilj_troskova} {goal.progress ? '€' : ''}
                    </div>
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
                      {goal.progress.trenutni_troskovi} € ({goal.progress.postotak_troskova}%)
                    </div>
                  </div>
                )}
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

              <div className="form-row">
                <div className="form-group">
                  <label>Cilj potrošnje (kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cilj_kwh}
                    onChange={(e) => setFormData({ ...formData, cilj_kwh: e.target.value })}
                    className="form-input"
                    placeholder="npr. 150"
                  />
                </div>

                <div className="form-group">
                  <label>Cilj troškova (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cilj_troskova}
                    onChange={(e) => setFormData({ ...formData, cilj_troskova: e.target.value })}
                    className="form-input"
                    placeholder="npr. 50"
                  />
                </div>
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
