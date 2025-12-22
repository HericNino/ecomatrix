import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import householdsService from '../services/households.service';
import devicesService from '../services/devices.service';
import measurementsService from '../services/measurements.service';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import './Devices.css';

const DEVICE_TYPES = [
  { value: 'hladnjak', label: 'Hladnjak', icon: '🧊' },
  { value: 'zamrzivac', label: 'Zamrzivač', icon: '❄️' },
  { value: 'pecnica', label: 'Pećnica', icon: '🔥' },
  { value: 'mikrovalna', label: 'Mikrovalna', icon: '📦' },
  { value: 'perilica_rublja', label: 'Perilica rublja', icon: '👕' },
  { value: 'perilica_posudja', label: 'Perilica posuđa', icon: '🍽️' },
  { value: 'klima', label: 'Klima', icon: '❄️' },
  { value: 'grijanje', label: 'Grijanje', icon: '🔥' },
  { value: 'tv', label: 'TV', icon: '📺' },
  { value: 'racunalo', label: 'Računalo', icon: '💻' },
  { value: 'rasvjeta', label: 'Rasvjeta', icon: '💡' },
  { value: 'bojler', label: 'Bojler', icon: '🚿' },
  { value: 'ostalo', label: 'Ostalo', icon: '⚡' },
];

const Devices = () => {
  const [households, setHouseholds] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [deviceMeasurements, setDeviceMeasurements] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterHousehold, setFilterHousehold] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [collectingData, setCollectingData] = useState({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingDeviceId, setEditingDeviceId] = useState(null);

  const [isPlugModalOpen, setIsPlugModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const [deviceForm, setDeviceForm] = useState({
    kucanstvo_id: '',
    prostorija_id: '',
    naziv: '',
    tip_uredjaja: '',
    proizvodjac: '',
    model: '',
    nominalna_snaga: '',
    datum_kupnje: '',
  });

  const [plugForm, setPlugForm] = useState({
    serijski_broj: '',
    proizvodjac: 'Shelly',
    model: 'Plug S Gen3',
    ip_adresa: '',
  });

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const householdsData = await householdsService.getAll();
      const allHouseholds = householdsData.households || [];
      setHouseholds(allHouseholds);

      // Load all devices from all households
      const allDevices = [];
      for (const household of allHouseholds) {
        try {
          const devicesData = await householdsService.getDevices(household.id_kucanstvo);
          const householdDevices = (devicesData.devices || devicesData || []).map(device => ({
            ...device,
            kucanstvo_id: household.id_kucanstvo,
            kucanstvo_naziv: household.naziv,
          }));
          allDevices.push(...householdDevices);
        } catch (err) {
          console.error(`Error loading devices for household ${household.id_kucanstvo}:`, err);
        }
      }
      setDevices(allDevices);

      // Ucitaj zadnja mjerenja za sve uredjaje
      await loadDeviceMeasurements(allDevices);
    } catch (err) {
      toast.error('Greška prilikom učitavanja podataka');
    } finally {
      setLoading(false);
    }
  };

  // Ucitaj zadnja mjerenja za uredjaje
  const loadDeviceMeasurements = async (devicesList) => {
    const measurements = {};

    for (const device of devicesList) {
      try {
        const data = await measurementsService.getDeviceMeasurements(
          device.id_uredjaj || device.id,
          null,
          null,
          1 // samo zadnje mjerenje
        );

        if (data.measurements && data.measurements.length > 0) {
          measurements[device.id_uredjaj || device.id] = data.measurements[0];
        }
      } catch (err) {
        // Nema mjerenja za ovaj uredjaj ili greska
        console.error(`Greska pri ucitavanju mjerenja za uredjaj ${device.id_uredjaj}:`, err);
      }
    }

    setDeviceMeasurements(measurements);
  };

  // Rucno prikupi podatke sa uredjaja
  const handleCollectData = async (device) => {
    const deviceId = device.id_uredjaj || device.id;

    try {
      setCollectingData({ ...collectingData, [deviceId]: true });
      await measurementsService.collectDeviceData(deviceId);
      toast.success(`Podaci prikupljeni sa ${device.naziv}`);

      // Osvjezi mjerenje za ovaj uredjaj
      const data = await measurementsService.getDeviceMeasurements(deviceId, null, null, 1);
      if (data.measurements && data.measurements.length > 0) {
        setDeviceMeasurements({
          ...deviceMeasurements,
          [deviceId]: data.measurements[0]
        });
      }
    } catch (err) {
      toast.error('Greška pri prikupljanju podataka');
    } finally {
      setCollectingData({ ...collectingData, [deviceId]: false });
    }
  };

  const loadRoomsForHousehold = async (householdId) => {
    if (!householdId) {
      setRooms([]);
      return;
    }
    try {
      const roomsData = await householdsService.getRooms(householdId);
      setRooms(roomsData.rooms || []);
    } catch (err) {
      toast.error('Greška prilikom učitavanja prostorija');
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingDeviceId(null);
    setDeviceForm({
      kucanstvo_id: '',
      prostorija_id: '',
      naziv: '',
      tip_uredjaja: '',
      proizvodjac: '',
      model: '',
      nominalna_snaga: '',
      datum_kupnje: '',
    });
    setRooms([]);
    setIsModalOpen(true);
  };

  const openEditModal = (device) => {
    setModalMode('edit');
    setEditingDeviceId(device.id_uredjaj || device.id);
    setDeviceForm({
      kucanstvo_id: device.kucanstvo_id,
      prostorija_id: device.prostorija_id || device.prostorija?.id,
      naziv: device.naziv,
      tip_uredjaja: device.tip_uredjaja,
      proizvodjac: device.proizvodjac || '',
      model: device.model || '',
      nominalna_snaga: device.nominalna_snaga || device.snaga || '',
      datum_kupnje: device.datum_kupnje || '',
    });
    if (device.kucanstvo_id) {
      loadRoomsForHousehold(device.kucanstvo_id);
    }
    setIsModalOpen(true);
  };

  const handleCreateDevice = async (e) => {
    e.preventDefault();
    try {
      await devicesService.create(deviceForm.kucanstvo_id, {
        prostorija_id: deviceForm.prostorija_id,
        naziv: deviceForm.naziv,
        tip_uredjaja: deviceForm.tip_uredjaja,
        proizvodjac: deviceForm.proizvodjac,
        model: deviceForm.model,
        nominalna_snaga: deviceForm.nominalna_snaga,
        datum_kupnje: deviceForm.datum_kupnje,
      });
      toast.success('Uređaj uspješno kreiran!');
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Greška prilikom kreiranja uređaja');
    }
  };

  const handleUpdateDevice = async (e) => {
    e.preventDefault();
    try {
      await devicesService.update(editingDeviceId, {
        naziv: deviceForm.naziv,
        tip_uredjaja: deviceForm.tip_uredjaja,
        proizvodjac: deviceForm.proizvodjac,
        model: deviceForm.model,
        nominalna_snaga: deviceForm.nominalna_snaga,
        datum_kupnje: deviceForm.datum_kupnje,
      });
      toast.success('Uređaj uspješno ažuriran!');
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Greška prilikom ažuriranja uređaja');
    }
  };

  const handleDeleteDevice = (device) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Obriši uređaj',
      message: `Jeste li sigurni da želite obrisati uređaj "${device.naziv}"? Ova akcija je nepovratna i obrisat će sva mjerenja i povezanu pametnu utičnicu.`,
      onConfirm: async () => {
        try {
          await devicesService.delete(device.id_uredjaj || device.id);
          toast.success('Uređaj uspješno obrisan!');
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
          await loadData();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Greška prilikom brisanja uređaja');
        }
      },
    });
  };

  const openPlugModal = (device) => {
    setSelectedDevice(device);
    if (device.pametni_utikac) {
      setPlugForm({
        serijski_broj: device.pametni_utikac.serijski_broj || '',
        proizvodjac: 'Shelly',
        model: 'Plug S Gen3',
        ip_adresa: device.pametni_utikac.ip_adresa || '',
      });
    } else {
      setPlugForm({
        serijski_broj: '',
        proizvodjac: 'Shelly',
        model: 'Plug S Gen3',
        ip_adresa: '',
      });
    }
    setIsPlugModalOpen(true);
  };

  const handleSavePlug = async (e) => {
    e.preventDefault();
    const deviceId = selectedDevice.id_uredjaj || selectedDevice.id;

    try {
      if (selectedDevice.pametni_utikac) {
        await devicesService.updatePlug(deviceId, plugForm);
        toast.success('Pametna utičnica uspješno ažurirana!');
      } else {
        await devicesService.attachPlug(deviceId, plugForm);
        toast.success('Pametna utičnica uspješno dodana!');
      }
      setIsPlugModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Greška prilikom spremanja utičnice');
    }
  };

  const getDeviceIcon = (type) => {
    const deviceType = DEVICE_TYPES.find((dt) => dt.value === type);
    return deviceType ? deviceType.icon : '⚡';
  };

  const getDeviceLabel = (type) => {
    const deviceType = DEVICE_TYPES.find((dt) => dt.value === type);
    return deviceType ? deviceType.label : type;
  };

  // Filter devices
  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.naziv.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.kucanstvo_naziv.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (device.prostorija_naziv || device.prostorija?.naziv || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesHousehold =
      filterHousehold === 'all' || device.kucanstvo_id === parseInt(filterHousehold);

    const matchesType = filterType === 'all' || device.tip_uredjaja === filterType;

    return matchesSearch && matchesHousehold && matchesType;
  });

  if (loading) {
    return (
      <div className="devices-loading">
        <p>Učitavam uređaje...</p>
      </div>
    );
  }

  return (
    <div className="devices-page">
      <div className="page-header">
        <div>
          <h1>Uređaji</h1>
          <p>Upravljajte svim uređajima u vašim kućanstvima</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          + Dodaj uređaj
        </button>
      </div>

      {/* Filters */}
      <div className="devices-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Pretraži uređaje..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <select
            value={filterHousehold}
            onChange={(e) => setFilterHousehold(e.target.value)}
            className="filter-select"
          >
            <option value="all">Sva kućanstva</option>
            {households.map((household) => (
              <option key={household.id_kucanstvo} value={household.id_kucanstvo}>
                {household.naziv}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">Svi tipovi</option>
            {DEVICE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Devices Grid */}
      {filteredDevices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚡</div>
          <h3>Nema uređaja</h3>
          <p>
            {searchQuery || filterHousehold !== 'all' || filterType !== 'all'
              ? 'Nema rezultata pretrage. Pokušajte s drugim filterima.'
              : 'Dodajte prvi uređaj za praćenje potrošnje energije.'}
          </p>
          {!searchQuery && filterHousehold === 'all' && filterType === 'all' && (
            <button className="btn-primary" onClick={openCreateModal}>
              + Dodaj uređaj
            </button>
          )}
        </div>
      ) : (
        <div className="devices-grid">
          {filteredDevices.map((device) => (
            <div key={device.id_uredjaj || device.id} className="device-card">
              <div className="device-card-header">
                <div className="device-icon-large">{getDeviceIcon(device.tip_uredjaja)}</div>
                <div className="device-actions-top">
                  <button
                    className="btn-icon"
                    onClick={() => openEditModal(device)}
                    title="Uredi"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleDeleteDevice(device)}
                    title="Obriši"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="device-card-body">
                <h3>{device.naziv}</h3>
                <p className="device-type">{getDeviceLabel(device.tip_uredjaja)}</p>

                {/* Prikaz podataka o potrosnji */}
                {deviceMeasurements[device.id_uredjaj || device.id] && (
                  <div className="device-consumption">
                    <div className="consumption-main">
                      <span className="consumption-value">
                        {deviceMeasurements[device.id_uredjaj || device.id].vrijednost_kwh.toFixed(2)}
                      </span>
                      <span className="consumption-unit">kWh</span>
                    </div>
                    <div className="consumption-time">
                      Zadnje mjerenje:{' '}
                      {new Date(deviceMeasurements[device.id_uredjaj || device.id].datum_vrijeme).toLocaleString('hr-HR')}
                    </div>
                  </div>
                )}

                <div className="device-info">
                  <span className="info-label">Kućanstvo:</span>
                  <span className="info-value">{device.kucanstvo_naziv}</span>
                </div>
                <div className="device-info">
                  <span className="info-label">Prostorija:</span>
                  <span className="info-value">
                    {device.prostorija_naziv || device.prostorija?.naziv || '-'}
                  </span>
                </div>
                {device.nominalna_snaga && (
                  <div className="device-info">
                    <span className="info-label">Snaga:</span>
                    <span className="info-value">{device.nominalna_snaga} W</span>
                  </div>
                )}
                {device.pametni_utikac && (
                  <div className="device-plug-status">
                    <span className={`plug-badge ${device.pametni_utikac.status}`}>
                      🔌 {device.pametni_utikac.status === 'aktivan' ? 'Aktivna' : 'Neaktivna'}
                    </span>
                  </div>
                )}

                {/* Gumbi za upravljanje */}
                <div className="device-actions">
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => openPlugModal(device)}
                    title={device.pametni_utikac ? 'Uredi utičnicu' : 'Dodaj utičnicu'}
                  >
                    {device.pametni_utikac ? '🔌 Uredi utičnicu' : '🔌 Dodaj utičnicu'}
                  </button>

                  {device.pametni_utikac && (
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => handleCollectData(device)}
                      disabled={collectingData[device.id_uredjaj || device.id]}
                    >
                      {collectingData[device.id_uredjaj || device.id] ? '⏳ Prikupljam...' : '🔄 Osvježi podatke'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Novi uređaj' : 'Uredi uređaj'}
      >
        <form
          onSubmit={modalMode === 'create' ? handleCreateDevice : handleUpdateDevice}
          className="device-form"
        >
          {modalMode === 'create' && (
            <>
              <div className="form-group">
                <label htmlFor="kucanstvo_id">Kućanstvo *</label>
                <select
                  id="kucanstvo_id"
                  value={deviceForm.kucanstvo_id}
                  onChange={(e) => {
                    setDeviceForm({ ...deviceForm, kucanstvo_id: e.target.value, prostorija_id: '' });
                    loadRoomsForHousehold(e.target.value);
                  }}
                  required
                  className="form-select"
                >
                  <option value="">Odaberite kućanstvo</option>
                  {households.map((household) => (
                    <option key={household.id_kucanstvo} value={household.id_kucanstvo}>
                      {household.naziv}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="prostorija_id">Prostorija *</label>
                <select
                  id="prostorija_id"
                  value={deviceForm.prostorija_id}
                  onChange={(e) =>
                    setDeviceForm({ ...deviceForm, prostorija_id: e.target.value })
                  }
                  required
                  className="form-select"
                  disabled={!deviceForm.kucanstvo_id}
                >
                  <option value="">Odaberite prostoriju</option>
                  {rooms.map((room) => (
                    <option key={room.id_prostorija} value={room.id_prostorija}>
                      {room.naziv}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="naziv">Naziv uređaja *</label>
            <input
              type="text"
              id="naziv"
              value={deviceForm.naziv}
              onChange={(e) => setDeviceForm({ ...deviceForm, naziv: e.target.value })}
              required
              placeholder="LED TV Samsung"
            />
          </div>

          <div className="form-group">
            <label htmlFor="tip_uredjaja">Tip uređaja *</label>
            <select
              id="tip_uredjaja"
              value={deviceForm.tip_uredjaja}
              onChange={(e) => setDeviceForm({ ...deviceForm, tip_uredjaja: e.target.value })}
              required
              className="form-select"
            >
              <option value="">Odaberite tip</option>
              {DEVICE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="proizvodjac">Proizvođač</label>
              <input
                type="text"
                id="proizvodjac"
                value={deviceForm.proizvodjac}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, proizvodjac: e.target.value })
                }
                placeholder="Samsung"
              />
            </div>

            <div className="form-group">
              <label htmlFor="model">Model</label>
              <input
                type="text"
                id="model"
                value={deviceForm.model}
                onChange={(e) => setDeviceForm({ ...deviceForm, model: e.target.value })}
                placeholder="UE55RU7172"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nominalna_snaga">Nominalna snaga (W)</label>
              <input
                type="number"
                id="nominalna_snaga"
                value={deviceForm.nominalna_snaga}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, nominalna_snaga: e.target.value })
                }
                placeholder="150"
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="datum_kupnje">Datum kupnje</label>
              <input
                type="date"
                id="datum_kupnje"
                value={deviceForm.datum_kupnje}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, datum_kupnje: e.target.value })
                }
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
              Odustani
            </button>
            <button type="submit" className="btn-primary">
              {modalMode === 'create' ? 'Dodaj uređaj' : 'Spremi promjene'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Plug Management Modal */}
      <Modal
        isOpen={isPlugModalOpen}
        onClose={() => setIsPlugModalOpen(false)}
        title={selectedDevice?.pametni_utikac ? 'Uredi pametnu utičnicu' : 'Dodaj pametnu utičnicu'}
      >
        <form onSubmit={handleSavePlug} className="device-form">
          <p className="modal-description">
            Povežite Shelly pametnu utičnicu za automatsko praćenje potrošnje uređaja.
          </p>

          <div className="form-group">
            <label htmlFor="serijski_broj">Serijski broj *</label>
            <input
              type="text"
              id="serijski_broj"
              value={plugForm.serijski_broj}
              onChange={(e) => setPlugForm({ ...plugForm, serijski_broj: e.target.value })}
              required
              placeholder="ShellyPlug-001"
            />
            <small>Jedinstveni identifikator utičnice</small>
          </div>

          <div className="form-group">
            <label htmlFor="ip_adresa">IP adresa *</label>
            <input
              type="text"
              id="ip_adresa"
              value={plugForm.ip_adresa}
              onChange={(e) => setPlugForm({ ...plugForm, ip_adresa: e.target.value })}
              required
              placeholder="192.168.1.71"
              pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
            />
            <small>IP adresa utičnice u lokalnoj mreži</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="proizvodjac">Proizvođač</label>
              <input
                type="text"
                id="proizvodjac"
                value={plugForm.proizvodjac}
                onChange={(e) => setPlugForm({ ...plugForm, proizvodjac: e.target.value })}
                placeholder="Shelly"
              />
            </div>

            <div className="form-group">
              <label htmlFor="model">Model</label>
              <input
                type="text"
                id="model"
                value={plugForm.model}
                onChange={(e) => setPlugForm({ ...plugForm, model: e.target.value })}
                placeholder="Plug S Gen3"
              />
            </div>
          </div>

          <div className="info-box">
            <strong>💡 Dostupne utičnice:</strong>
            <ul>
              <li>Uređaji srednje potrošnje: 192.168.1.71</li>
              <li>Uređaji visoke potrošnje: 192.168.1.244</li>
              <li>Uređaji niske potrošnje: 192.168.1.166</li>
            </ul>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsPlugModalOpen(false)}>
              Odustani
            </button>
            <button type="submit" className="btn-primary">
              {selectedDevice?.pametni_utikac ? 'Spremi promjene' : 'Dodaj utičnicu'}
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

export default Devices;
