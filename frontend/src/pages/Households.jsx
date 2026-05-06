import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import householdsService from '../services/households.service';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import './Households.css';

const Households = () => {
  const [households, setHouseholds] = useState([]);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [roomModalMode, setRoomModalMode] = useState('create');
  const [editingHouseholdId, setEditingHouseholdId] = useState(null);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const [householdForm, setHouseholdForm] = useState({
    naziv: '',
    adresa: '',
    grad: '',
    povrsina: '',
  });

  const [roomForm, setRoomForm] = useState({
    naziv: '',
    povrsina: '',
  });

  useEffect(() => {
    loadHouseholds();
  }, []);

  const loadHouseholds = async () => {
    try {
      setLoading(true);
      const data = await householdsService.getAll();
      setHouseholds(data.households || []);
    } catch (err) {
      toast.error('Greška prilikom učitavanja kućanstava');
    } finally {
      setLoading(false);
    }
  };

  const loadHouseholdDetails = async (householdId) => {
    try {
      const [roomsData, devicesData] = await Promise.all([
        householdsService.getRooms(householdId),
        householdsService.getDevices(householdId),
      ]);
      setRooms(roomsData.rooms || []);
      setDevices(devicesData.devices || devicesData || []);
    } catch (err) {
      toast.error('Greška prilikom učitavanja detalja');
    }
  };

  const handleSelectHousehold = async (household) => {
    setSelectedHousehold(household);
    await loadHouseholdDetails(household.id_kucanstvo);
  };

  const handleCreateHousehold = async (e) => {
    e.preventDefault();
    try {
      await householdsService.create(householdForm);
      toast.success('Kućanstvo uspješno kreirano!');
      setIsModalOpen(false);
      setHouseholdForm({ naziv: '', adresa: '', grad: '', povrsina: '' });
      await loadHouseholds();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Greška prilikom kreiranja');
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!selectedHousehold) return;

    try {
      await householdsService.createRoom(selectedHousehold.id_kucanstvo, roomForm);
      toast.success('Prostorija uspješno dodana!');
      setIsRoomModalOpen(false);
      setRoomForm({ naziv: '', povrsina: '' });
      await loadHouseholdDetails(selectedHousehold.id_kucanstvo);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Greška prilikom kreiranja prostorije');
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingHouseholdId(null);
    setHouseholdForm({ naziv: '', adresa: '', grad: '', povrsina: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (household) => {
    setModalMode('edit');
    setEditingHouseholdId(household.id_kucanstvo);
    setHouseholdForm({
      naziv: household.naziv,
      adresa: household.adresa,
      grad: household.grad,
      povrsina: household.povrsina || '',
    });
    setIsModalOpen(true);
  };

  const handleUpdateHousehold = async (e) => {
    e.preventDefault();
    try {
      await householdsService.update(editingHouseholdId, householdForm);
      toast.success('Kućanstvo uspješno ažurirano!');
      setIsModalOpen(false);
      setHouseholdForm({ naziv: '', adresa: '', grad: '', povrsina: '' });
      await loadHouseholds();
      if (selectedHousehold?.id_kucanstvo === editingHouseholdId) {
        const updated = households.find((h) => h.id_kucanstvo === editingHouseholdId);
        if (updated) setSelectedHousehold({ ...updated, ...householdForm });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Greška prilikom ažuriranja');
    }
  };

  const handleDeleteHousehold = (household) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Obriši kućanstvo',
      message: `Jeste li sigurni da želite obrisati kućanstvo "${household.naziv}"? Ova akcija je nepovratna i obrisat će sve prostorije i uređaje.`,
      onConfirm: async () => {
        try {
          await householdsService.delete(household.id_kucanstvo);
          toast.success('Kućanstvo uspješno obrisano!');
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
          if (selectedHousehold?.id_kucanstvo === household.id_kucanstvo) {
            setSelectedHousehold(null);
            setRooms([]);
            setDevices([]);
          }
          await loadHouseholds();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Greška prilikom brisanja');
        }
      },
    });
  };

  const openCreateRoomModal = () => {
    setRoomModalMode('create');
    setEditingRoomId(null);
    setRoomForm({ naziv: '', povrsina: '' });
    setIsRoomModalOpen(true);
  };

  const openEditRoomModal = (room) => {
    setRoomModalMode('edit');
    setEditingRoomId(room.id_prostorija);
    setRoomForm({
      naziv: room.naziv,
      povrsina: room.povrsina || '',
    });
    setIsRoomModalOpen(true);
  };

  const handleUpdateRoom = async (e) => {
    e.preventDefault();
    if (!selectedHousehold) return;

    try {
      await householdsService.updateRoom(
        selectedHousehold.id_kucanstvo,
        editingRoomId,
        roomForm
      );
      toast.success('Prostorija uspješno ažurirana!');
      setIsRoomModalOpen(false);
      setRoomForm({ naziv: '', povrsina: '' });
      await loadHouseholdDetails(selectedHousehold.id_kucanstvo);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Greška prilikom ažuriranja prostorije');
    }
  };

  const handleDeleteRoom = (room) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Obriši prostoriju',
      message: `Jeste li sigurni da želite obrisati prostoriju "${room.naziv}"? Ova akcija je nepovratna i obrisat će sve uređaje u prostoriji.`,
      onConfirm: async () => {
        try {
          await householdsService.deleteRoom(selectedHousehold.id_kucanstvo, room.id_prostorija);
          toast.success('Prostorija uspješno obrisana!');
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
          await loadHouseholdDetails(selectedHousehold.id_kucanstvo);
        } catch (err) {
          toast.error(err.response?.data?.message || 'Greška prilikom brisanja prostorije');
        }
      },
    });
  };

  // Filter households based on search query
  const filteredHouseholds = households.filter((household) => {
    const query = searchQuery.toLowerCase();
    return (
      household.naziv.toLowerCase().includes(query) ||
      household.adresa.toLowerCase().includes(query) ||
      household.grad.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="households-loading">
        <p>Učitavam kućanstva...</p>
      </div>
    );
  }

  return (
    <div className="households-page">
      <div className="page-header">
        <div>
          <h1>Moja kućanstva</h1>
          <p>Upravljajte kućanstvima, prostorijama i uređajima</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          + Novo kućanstvo
        </button>
      </div>

      <div className="households-layout">
        {/* Lista kućanstava */}
        <div className="households-sidebar">
          <h3>Vaša kućanstva</h3>
          {households.length === 0 ? (
            <div className="empty-message">
              <p>Nemate kreiranih kućanstava.</p>
              <button className="btn-secondary" onClick={openCreateModal}>
                Kreiraj prvo kućanstvo
              </button>
            </div>
          ) : (
            <>
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Pretraži kućanstva..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="households-list">
                {filteredHouseholds.length === 0 ? (
                  <div className="empty-message">
                    <p>Nema rezultata pretrage.</p>
                  </div>
                ) : (
                  filteredHouseholds.map((household) => (
                    <div
                      key={household.id_kucanstvo}
                      className={`household-item ${
                        selectedHousehold?.id_kucanstvo === household.id_kucanstvo ? 'active' : ''
                      }`}
                    >
                      <div onClick={() => handleSelectHousehold(household)}>
                        <h4>{household.naziv}</h4>
                        <p>{household.adresa}</p>
                        <span className="household-city">{household.grad}</span>
                      </div>
                      <div className="household-actions">
                        <button
                          className="btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(household);
                          }}
                          title="Uredi"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHousehold(household);
                          }}
                          title="Obriši"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Detalji kućanstva */}
        <div className="household-details">
          {selectedHousehold ? (
            <>
              <div className="details-header">
                <div>
                  <h2>{selectedHousehold.naziv}</h2>
                  <p className="details-address">
                    {selectedHousehold.adresa}, {selectedHousehold.grad}
                  </p>
                  {selectedHousehold.povrsina && (
                    <p className="details-info">Površina: {selectedHousehold.povrsina} m²</p>
                  )}
                </div>
              </div>

              {/* Prostorije */}
              <div className="details-section">
                <div className="section-title">
                  <h3>Prostorije</h3>
                  <button className="btn-secondary" onClick={openCreateRoomModal}>
                    + Dodaj prostoriju
                  </button>
                </div>

                {rooms.length === 0 ? (
                  <div className="empty-card">
                    <p>Nema prostorija. Dodajte prvu prostoriju.</p>
                  </div>
                ) : (
                  <div className="rooms-grid">
                    {rooms.map((room) => (
                      <div key={room.id_prostorija} className="room-card">
                        <div className="room-content">
                          <h4>{room.naziv}</h4>
                          {room.povrsina && <p>{room.povrsina} m²</p>}
                        </div>
                        <div className="room-actions">
                          <button
                            className="btn-icon-small"
                            onClick={() => openEditRoomModal(room)}
                            title="Uredi"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-icon-small"
                            onClick={() => handleDeleteRoom(room)}
                            title="Obriši"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Uređaji */}
              <div className="details-section">
                <div className="section-title">
                  <h3>Uređaji</h3>
                </div>

                {devices.length === 0 ? (
                  <div className="empty-card">
                    <p>Nema uređaja u ovom kućanstvu.</p>
                  </div>
                ) : (
                  <div className="devices-grid">
                    {devices.map((device) => (
                      <div key={device.id_uredjaj || device.id} className="device-card">
                        <div className="device-icon">💡</div>
                        <div className="device-info">
                          <h4>{device.naziv}</h4>
                          <p>{device.prostorija?.naziv || device.naziv_prostorija || ''}</p>
                          {(device.nominalna_snaga || device.snaga) && (
                            <span>{device.nominalna_snaga || device.snaga}W</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <div className="no-selection-icon">🏠</div>
              <h3>Odaberite kućanstvo</h3>
              <p>Odaberite kućanstvo sa lijeve strane za prikaz detalja</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal za kreiranje/uređivanje kućanstva */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Novo kućanstvo' : 'Uredi kućanstvo'}
      >
        <form
          onSubmit={modalMode === 'create' ? handleCreateHousehold : handleUpdateHousehold}
          className="household-form"
        >
          <div className="form-group">
            <label htmlFor="naziv">Naziv kućanstva *</label>
            <input
              type="text"
              id="naziv"
              value={householdForm.naziv}
              onChange={(e) =>
                setHouseholdForm({ ...householdForm, naziv: e.target.value })
              }
              required
              placeholder="Moje kućanstvo"
            />
          </div>

          <div className="form-group">
            <label htmlFor="adresa">Adresa *</label>
            <input
              type="text"
              id="adresa"
              value={householdForm.adresa}
              onChange={(e) =>
                setHouseholdForm({ ...householdForm, adresa: e.target.value })
              }
              required
              placeholder="Ulica i broj"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="grad">Grad *</label>
              <input
                type="text"
                id="grad"
                value={householdForm.grad}
                onChange={(e) =>
                  setHouseholdForm({ ...householdForm, grad: e.target.value })
                }
                required
                placeholder="Zagreb"
              />
            </div>

            <div className="form-group">
              <label htmlFor="povrsina">Površina (m²)</label>
              <input
                type="number"
                id="povrsina"
                value={householdForm.povrsina}
                onChange={(e) =>
                  setHouseholdForm({ ...householdForm, povrsina: e.target.value })
                }
                placeholder="100"
                min="0"
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Odustani
            </button>
            <button type="submit" className="btn-primary">
              {modalMode === 'create' ? 'Kreiraj kućanstvo' : 'Spremi promjene'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal za dodavanje/uređivanje prostorije */}
      <Modal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        title={roomModalMode === 'create' ? 'Nova prostorija' : 'Uredi prostoriju'}
      >
        <form
          onSubmit={roomModalMode === 'create' ? handleCreateRoom : handleUpdateRoom}
          className="household-form"
        >
          <div className="form-group">
            <label htmlFor="room-naziv">Naziv prostorije *</label>
            <input
              type="text"
              id="room-naziv"
              value={roomForm.naziv}
              onChange={(e) => setRoomForm({ ...roomForm, naziv: e.target.value })}
              required
              placeholder="Dnevna soba"
            />
          </div>

          <div className="form-group">
            <label htmlFor="room-povrsina">Površina (m²)</label>
            <input
              type="number"
              id="room-povrsina"
              value={roomForm.povrsina}
              onChange={(e) =>
                setRoomForm({ ...roomForm, povrsina: e.target.value })
              }
              placeholder="25"
              min="0"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsRoomModalOpen(false)}
            >
              Odustani
            </button>
            <button type="submit" className="btn-primary">
              {roomModalMode === 'create' ? 'Dodaj prostoriju' : 'Spremi promjene'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })
        }
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />
    </div>
  );
};

export default Households;
