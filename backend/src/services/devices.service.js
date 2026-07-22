import { getDb } from "../config/db.js";
import * as shellyService from './shelly.service.js';
import * as notificationService from './notification.service.js';

const DOZVOLJENI_TIPOVI_UREDJAJA = [
    'hladnjak',
  'zamrzivac',
  'pecnica',
  'mikrovalna',
  'perilica_rublja',
  'perilica_posudja',
  'klima',
  'grijanje',
  'tv',
  'racunalo',
  'rasvjeta',
  'bojler',
  'ostalo'
];

async function assertHouseholdOwnership(db, korisnikId, kucanstvoId) {
  const [rows] = await db.query(
    `SELECT kucanstvo_id 
       FROM kucanstvo 
      WHERE kucanstvo_id = ? AND korisnik_id = ?`,
    [kucanstvoId, korisnikId]
  );
  if (rows.length === 0) {
    const err = new Error('Kućanstvo nije pronađeno.');
    err.status = 404;
    throw err;
  }
}

async function assertDeviceOwnership(db, korisnikId, uredjajId) {
  const [rows] = await db.query(
    `SELECT u.uredjaj_id
       FROM uredjaj u
       JOIN prostorija p ON u.prostorija_id = p.prostorija_id
       JOIN kucanstvo k ON p.kucanstvo_id = k.kucanstvo_id
      WHERE u.uredjaj_id = ? AND k.korisnik_id = ?`,
    [uredjajId, korisnikId]
  );

  if (rows.length === 0) {
    const err = new Error('Uređaj nije pronađen.');
    err.status = 404;
    throw err;
  }
}

export async function listDevicesForHousehold(korisnikId, kucanstvoId) {
  const db = getDb();
  await assertHouseholdOwnership(db, korisnikId, kucanstvoId);

  const [rows] = await db.query(
    `SELECT 
        u.uredjaj_id AS id,
        u.naziv,
        u.tip_uredjaja,
        u.proizvodjac,
        u.model,
        u.nominalna_snaga,
        u.datum_kupnje,
        p.prostorija_id,
        p.naziv AS prostorija_naziv,
        p.tip AS prostorija_tip,
        pu.utikac_id,
        pu.serijski_broj AS utikac_serijski_broj,
        pu.status AS utikac_status
     FROM kucanstvo k
     JOIN prostorija p ON p.kucanstvo_id = k.kucanstvo_id
     JOIN uredjaj u ON u.prostorija_id = p.prostorija_id
     LEFT JOIN pametni_utikac pu ON pu.uredjaj_id = u.uredjaj_id
    WHERE k.kucanstvo_id = ? AND k.korisnik_id = ?
    ORDER BY u.uredjaj_id ASC`,
    [kucanstvoId, korisnikId]
  );

  return rows.map(r => ({
    id: r.id,
    naziv: r.naziv,
    tip_uredjaja: r.tip_uredjaja,
    proizvodjac: r.proizvodjac,
    model: r.model,
    nominalna_snaga: r.nominalna_snaga,
    datum_kupnje: r.datum_kupnje,
    prostorija: {
      id: r.prostorija_id,
      naziv: r.prostorija_naziv,
      tip: r.prostorija_tip
    },
    pametni_utikac: r.utikac_id
      ? {
          id: r.utikac_id,
          serijski_broj: r.utikac_serijski_broj,
          status: r.utikac_status
        }
      : null
  }));
}

export async function getLiveConsumption(korisnikId, kucanstvoId) {
  const db = getDb();
  await assertHouseholdOwnership(db, korisnikId, kucanstvoId);

  const [devices] = await db.query(
    `SELECT u.uredjaj_id, u.naziv, u.tip_uredjaja, pu.ip_adresa
     FROM uredjaj u
     JOIN pametni_utikac pu ON u.uredjaj_id = pu.uredjaj_id
     JOIN prostorija p ON u.prostorija_id = p.prostorija_id
     WHERE p.kucanstvo_id = ? AND pu.status = 'aktivan' AND pu.ip_adresa IS NOT NULL`,
    [kucanstvoId]
  );

  const results = await Promise.allSettled(
    devices.map(async d => {
      const data = await shellyService.getCurrentEnergyConsumption(d.ip_adresa, false);
      return {
        uredjaj_id: d.uredjaj_id,
        naziv: d.naziv,
        tip_uredjaja: d.tip_uredjaja,
        snaga_w: Math.round(data.currentPower || 0),
        ukljucen: data.isOn,
      };
    })
  );

  const liveDevices = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

  const totalW = liveDevices.reduce((sum, d) => sum + (d.snaga_w || 0), 0);

  return { devices: liveDevices, totalW, timestamp: new Date() };
}

export async function createDeviceForHousehold(korisnikId, kucanstvoId, data) {
  const {
    prostorija_id,
    naziv,
    tip_uredjaja,
    proizvodjac,
    model,
    nominalna_snaga,
    datum_kupnje
  } = data;

  const db = getDb();
  await assertHouseholdOwnership(db, korisnikId, kucanstvoId);

  const [pros] = await db.query(
    `SELECT p.prostorija_id
       FROM prostorija p
      WHERE p.prostorija_id = ? AND p.kucanstvo_id = ?`,
    [prostorija_id, kucanstvoId]
  );

  if (pros.length === 0) {
    const err = new Error('Prostorija ne pripada kućanstvu ili ne postoji.');
    err.status = 400;
    throw err;
  }

  if (!DOZVOLJENI_TIPOVI_UREDJAJA.includes(tip_uredjaja)) {
    const err = new Error('Neispravan tip uređaja.');
    err.status = 400;
    throw err;
  }

  const [res] = await db.query(
    `INSERT INTO uredjaj (
        prostorija_id,
        naziv,
        tip_uredjaja,
        proizvodjac,
        model,
        nominalna_snaga,
        datum_kupnje
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      prostorija_id,
      naziv,
      tip_uredjaja,
      proizvodjac || null,
      model || null,
      nominalna_snaga || null,
      datum_kupnje || null
    ]
  );

  return {
    id: res.insertId,
    prostorija_id,
    naziv,
    tip_uredjaja,
    proizvodjac: proizvodjac || null,
    model: model || null,
    nominalna_snaga: nominalna_snaga || null,
    datum_kupnje: datum_kupnje || null
  };
}


export async function getDeviceById(korisnikId, uredjajId) {
  const db = getDb();

  const [rows] = await db.query(
    `SELECT 
        u.uredjaj_id AS id,
        u.naziv,
        u.tip_uredjaja,
        u.proizvodjac,
        u.model,
        u.nominalna_snaga,
        u.datum_kupnje,
        p.prostorija_id,
        p.naziv AS prostorija_naziv,
        p.tip AS prostorija_tip,
        k.kucanstvo_id,
        k.naziv AS kucanstvo_naziv,
        pu.utikac_id,
        pu.serijski_broj AS utikac_serijski_broj,
        pu.proizvodjac AS utikac_proizvodjac,
        pu.model AS utikac_model,
        pu.status AS utikac_status
     FROM uredjaj u
     JOIN prostorija p ON u.prostorija_id = p.prostorija_id
     JOIN kucanstvo k ON p.kucanstvo_id = k.kucanstvo_id
     LEFT JOIN pametni_utikac pu ON pu.uredjaj_id = u.uredjaj_id
    WHERE u.uredjaj_id = ? AND k.korisnik_id = ?`,
    [uredjajId, korisnikId]
  );

  if (rows.length === 0) {
    const err = new Error('Uređaj nije pronađen.');
    err.status = 404;
    throw err;
  }

  const r = rows[0];

  return {
    id: r.id,
    naziv: r.naziv,
    tip_uredjaja: r.tip_uredjaja,
    proizvodjac: r.proizvodjac,
    model: r.model,
    nominalna_snaga: r.nominalna_snaga,
    datum_kupnje: r.datum_kupnje,
    kucanstvo: {
      id: r.kucanstvo_id,
      naziv: r.kucanstvo_naziv
    },
    prostorija: {
      id: r.prostorija_id,
      naziv: r.prostorija_naziv,
      tip: r.prostorija_tip
    },
    pametni_utikac: r.utikac_id
      ? {
          id: r.utikac_id,
          serijski_broj: r.utikac_serijski_broj,
          proizvodjac: r.utikac_proizvodjac,
          model: r.utikac_model,
          status: r.utikac_status
        }
      : null
  };
}

export async function getPlugForDevice(korisnikId, uredjajId) {
  const db = getDb();
  await assertDeviceOwnership(db, korisnikId, uredjajId);

  const [rows] = await db.query(
    `SELECT 
        utikac_id AS id,
        uredjaj_id,
        serijski_broj,
        proizvodjac,
        model,
        status
     FROM pametni_utikac
    WHERE uredjaj_id = ?`,
    [uredjajId]
  );

  if (rows.length === 0) {
    const err = new Error('Uređaj nema pridruženu pametnu utičnicu.');
    err.status = 404;
    throw err;
  }

  return rows[0];
}

export async function attachPlugToDevice(korisnikId, uredjajId, data) {
  const { serijski_broj, proizvodjac, model, ip_adresa } = data;
  const db = getDb();
  await assertDeviceOwnership(db, korisnikId, uredjajId);

  if (!serijski_broj) {
    const err = new Error('serijski_broj je obavezan.');
    err.status = 400;
    throw err;
  }

  const [existingForDevice] = await db.query(
    `SELECT utikac_id FROM pametni_utikac WHERE uredjaj_id = ?`,
    [uredjajId]
  );

  if (existingForDevice.length > 0) {
    const err = new Error('Uređaj već ima pridruženu pametnu utičnicu.');
    err.status = 400;
    throw err;
  }

  const [existingSerial] = await db.query(
    `SELECT utikac_id FROM pametni_utikac WHERE serijski_broj = ?`,
    [serijski_broj]
  );

  if (existingSerial.length > 0) {
    const err = new Error('Pametna utičnica s ovim serijskim brojem već postoji.');
    err.status = 400;
    throw err;
  }

  const [res] = await db.query(
    `INSERT INTO pametni_utikac (
        uredjaj_id,
        serijski_broj,
        proizvodjac,
        model,
        status,
        ip_adresa
     ) VALUES (?, ?, ?, ?, 'aktivan', ?)`,
    [uredjajId, serijski_broj, proizvodjac || null, model || null, ip_adresa || null]
  );

  return {
    id: res.insertId,
    uredjaj_id: uredjajId,
    serijski_broj,
    proizvodjac: proizvodjac || null,
    model: model || null,
    status: 'aktivan',
    ip_adresa: ip_adresa || null
  };
}

export async function updatePlugForDevice(korisnikId, uredjajId, data) {
  const { ip_adresa, proizvodjac, model, status } = data;
  const db = getDb();
  await assertDeviceOwnership(db, korisnikId, uredjajId);

  const [existing] = await db.query(
    `SELECT utikac_id FROM pametni_utikac WHERE uredjaj_id = ?`,
    [uredjajId]
  );

  if (existing.length === 0) {
    const err = new Error('Uređaj nema pridruženu pametnu utičnicu.');
    err.status = 404;
    throw err;
  }

  const updates = [];
  const params = [];

  if (ip_adresa !== undefined) {
    updates.push('ip_adresa = ?');
    params.push(ip_adresa);
  }

  if (proizvodjac !== undefined) {
    updates.push('proizvodjac = ?');
    params.push(proizvodjac);
  }

  if (model !== undefined) {
    updates.push('model = ?');
    params.push(model);
  }

  if (status !== undefined) {
    if (!['aktivan', 'neaktivan', 'kvar'].includes(status)) {
      const err = new Error('Neispravan status. Dozvoljeni: aktivan, neaktivan, kvar');
      err.status = 400;
      throw err;
    }
    updates.push('status = ?');
    params.push(status);
  }

  if (updates.length === 0) {
    const err = new Error('Nema podataka za ažuriranje.');
    err.status = 400;
    throw err;
  }

  params.push(uredjajId);

  await db.query(
    `UPDATE pametni_utikac SET ${updates.join(', ')} WHERE uredjaj_id = ?`,
    params
  );

  return await getPlugForDevice(korisnikId, uredjajId);
}

export async function updateDevice(korisnikId, uredjajId, data) {
  const {
    naziv,
    tip_uredjaja,
    proizvodjac,
    model,
    nominalna_snaga,
    datum_kupnje
  } = data;

  const db = getDb();
  await assertDeviceOwnership(db, korisnikId, uredjajId);

  if (tip_uredjaja && !DOZVOLJENI_TIPOVI_UREDJAJA.includes(tip_uredjaja)) {
    const err = new Error('Neispravan tip uređaja.');
    err.status = 400;
    throw err;
  }

  await db.query(
    `UPDATE uredjaj
     SET naziv = ?, tip_uredjaja = ?, proizvodjac = ?, model = ?,
         nominalna_snaga = ?, datum_kupnje = ?
     WHERE uredjaj_id = ?`,
    [
      naziv,
      tip_uredjaja,
      proizvodjac || null,
      model || null,
      nominalna_snaga || null,
      datum_kupnje || null,
      uredjajId
    ]
  );

  return {
    id: uredjajId,
    naziv,
    tip_uredjaja,
    proizvodjac: proizvodjac || null,
    model: model || null,
    nominalna_snaga: nominalna_snaga || null,
    datum_kupnje: datum_kupnje || null
  };
}

export async function deleteDevice(korisnikId, uredjajId) {
  const db = getDb();
  await assertDeviceOwnership(db, korisnikId, uredjajId);

  // Prvo obriši pametnu utičnicu ako postoji
  await db.query('DELETE FROM pametni_utikac WHERE uredjaj_id = ?', [uredjajId]);

  // Zatim obriši sam uređaj
  await db.query('DELETE FROM uredjaj WHERE uredjaj_id = ?', [uredjajId]);

  return { success: true };
}

/**
 * Manually collect data for a specific device
 */
export async function collectDataForDevice(korisnikId, uredjajId) {
  const db = getDb();
  await assertDeviceOwnership(db, korisnikId, uredjajId);

  // Get device with plug info and household info
  const [devices] = await db.query(
    `SELECT u.uredjaj_id, u.naziv, u.prostorija_id,
            p.utikac_id, p.status, p.ip_adresa,
            k.kucanstvo_id
     FROM uredjaj u
     JOIN pametni_utikac p ON u.uredjaj_id = p.uredjaj_id
     JOIN prostorija pr ON u.prostorija_id = pr.prostorija_id
     JOIN kucanstvo k ON pr.kucanstvo_id = k.kucanstvo_id
     WHERE u.uredjaj_id = ?`,
    [uredjajId]
  );

  if (devices.length === 0) {
    throw new Error('Uređaj nema povezanu pametnu utičnicu');
  }

  const device = devices[0];

  try {
    // Collect data using Shelly service (bez retry za ručni zahtjev — brži odgovor)
    const consumptionData = await shellyService.getCurrentEnergyConsumption(device.ip_adresa, false);

    // Store measurement
    await db.query(
      `INSERT INTO mjerenje (uredjaj_id, vrijednost_kwh, datum_vrijeme, validno)
       VALUES (?, ?, ?, 1)`,
      [uredjajId, consumptionData.energyKwh, consumptionData.timestamp]
    );

    // Vrati status na aktivan ako je bio neaktivan
    if (device.status !== 'aktivan') {
      await db.query(
        `UPDATE pametni_utikac SET status = 'aktivan' WHERE utikac_id = ?`,
        [device.utikac_id]
      );
    }

    // Check for high power consumption (over 3000W = 3kW is considered high)
    const HIGH_POWER_THRESHOLD = 3000; // Watts
    if (consumptionData.currentPower > HIGH_POWER_THRESHOLD) {
      await notificationService.notifyHighConsumption(
        korisnikId,
        device.kucanstvo_id,
        uredjajId,
        device.naziv,
        consumptionData.currentPower,
        HIGH_POWER_THRESHOLD
      ).catch(err => console.error('Failed to create high consumption notification:', err));
    }

    return {
      deviceId: uredjajId,
      deviceName: device.naziv,
      energyKwh: consumptionData.energyKwh,
      currentPower: consumptionData.currentPower,
      voltage: consumptionData.voltage,
      current: consumptionData.current,
      isOn: consumptionData.isOn,
      temperature: consumptionData.temperature,
      timestamp: consumptionData.timestamp
    };
  } catch (error) {
    // Označi utičnicu kao neaktivnu
    await db.query(
      `UPDATE pametni_utikac SET status = 'neaktivan' WHERE utikac_id = ?`,
      [device.utikac_id]
    ).catch(() => {});

    // Create device failure notification
    await notificationService.notifyDeviceFailure(
      korisnikId,
      device.kucanstvo_id,
      uredjajId,
      device.naziv,
      error.message
    ).catch(err => console.error('Failed to create device failure notification:', err));

    // Re-throw the original error
    throw error;
  }
}