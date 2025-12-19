import { getDb } from '../config/db.js';
import * as shellyService from './shelly.service.js';

export async function saveMeasurement(uredjajId, utikacId, vrijednostKwh, datumVrijeme, tipMjerenja = 'automatsko') {
  const db = getDb();

  const [result] = await db.query(
    `INSERT INTO mjerenje (
      uredjaj_id,
      utikac_id,
      vrijednost_kwh,
      datum_vrijeme,
      tip_mjerenja,
      validno
    ) VALUES (?, ?, ?, ?, ?, 1)`,
    [uredjajId, utikacId, vrijednostKwh, datumVrijeme, tipMjerenja]
  );

  return {
    id: result.insertId,
    uredjaj_id: uredjajId,
    utikac_id: utikacId,
    vrijednost_kwh: vrijednostKwh,
    datum_vrijeme: datumVrijeme,
    tip_mjerenja: tipMjerenja,
    validno: true
  };
}

export async function getMeasurementsByDevice(uredjajId, datumOd = null, datumDo = null, limit = 100) {
  const db = getDb();

  let query = `
    SELECT
      m.mjerenje_id,
      m.uredjaj_id,
      m.utikac_id,
      m.vrijednost_kwh,
      m.datum_vrijeme,
      m.tip_mjerenja,
      m.validno,
      u.naziv AS uredjaj_naziv,
      u.tip_uredjaja
    FROM mjerenje m
    JOIN uredjaj u ON m.uredjaj_id = u.uredjaj_id
    WHERE m.uredjaj_id = ? AND m.validno = 1
  `;

  const params = [uredjajId];

  if (datumOd) {
    query += ' AND m.datum_vrijeme >= ?';
    params.push(datumOd);
  }

  if (datumDo) {
    query += ' AND m.datum_vrijeme <= ?';
    params.push(datumDo);
  }

  query += ' ORDER BY m.datum_vrijeme DESC LIMIT ?';
  params.push(limit);

  const [rows] = await db.query(query, params);
  return rows;
}

export async function getMeasurementsByHousehold(korisnikId, kucanstvoId, datumOd = null, datumDo = null) {
  const db = getDb();

  const [ownership] = await db.query(
    'SELECT kucanstvo_id FROM kucanstvo WHERE kucanstvo_id = ? AND korisnik_id = ?',
    [kucanstvoId, korisnikId]
  );

  if (ownership.length === 0) {
    const err = new Error('Kućanstvo nije pronađeno.');
    err.status = 404;
    throw err;
  }

  let query = `
    SELECT
      m.mjerenje_id,
      m.uredjaj_id,
      m.vrijednost_kwh,
      m.datum_vrijeme,
      m.tip_mjerenja,
      u.naziv AS uredjaj_naziv,
      u.tip_uredjaja,
      p.naziv AS prostorija_naziv
    FROM mjerenje m
    JOIN uredjaj u ON m.uredjaj_id = u.uredjaj_id
    JOIN prostorija p ON u.prostorija_id = p.prostorija_id
    JOIN kucanstvo k ON p.kucanstvo_id = k.kucanstvo_id
    WHERE k.kucanstvo_id = ? AND k.korisnik_id = ? AND m.validno = 1
  `;

  const params = [kucanstvoId, korisnikId];

  if (datumOd) {
    query += ' AND m.datum_vrijeme >= ?';
    params.push(datumOd);
  }

  if (datumDo) {
    query += ' AND m.datum_vrijeme <= ?';
    params.push(datumDo);
  }

  query += ' ORDER BY m.datum_vrijeme DESC';

  const [rows] = await db.query(query, params);
  return rows;
}

export async function collectDataFromDevice(uredjajId) {
  const db = getDb();

  const [rows] = await db.query(
    `SELECT
      u.uredjaj_id,
      u.naziv AS uredjaj_naziv,
      pu.utikac_id,
      pu.ip_adresa,
      pu.serijski_broj
    FROM uredjaj u
    JOIN pametni_utikac pu ON u.uredjaj_id = pu.uredjaj_id
    WHERE u.uredjaj_id = ? AND pu.status = 'aktivan'`,
    [uredjajId]
  );

  if (rows.length === 0) {
    const err = new Error('Uređaj nema pridruženu aktivnu pametnu utičnicu.');
    err.status = 404;
    throw err;
  }

  const device = rows[0];

  if (!device.ip_adresa) {
    const err = new Error('Pametna utičnica nema konfiguriranu IP adresu.');
    err.status = 400;
    throw err;
  }

  const energyData = await shellyService.getCurrentEnergyConsumption(device.ip_adresa);

  const measurement = await saveMeasurement(
    device.uredjaj_id,
    device.utikac_id,
    energyData.energyKwh,
    energyData.timestamp,
    'automatsko'
  );

  return {
    ...measurement,
    uredjaj_naziv: device.uredjaj_naziv,
    trenutna_snaga: energyData.currentPower,
    napon: energyData.voltage,
    struja: energyData.current,
    frekvencija: energyData.frequency,
    ukljucen: energyData.isOn,
    temperatura: energyData.temperature
  };
}

export async function collectDataFromAllDevices(korisnikId, kucanstvoId) {
  const db = getDb();

  const [ownership] = await db.query(
    'SELECT kucanstvo_id FROM kucanstvo WHERE kucanstvo_id = ? AND korisnik_id = ?',
    [kucanstvoId, korisnikId]
  );

  if (ownership.length === 0) {
    const err = new Error('Kućanstvo nije pronađeno.');
    err.status = 404;
    throw err;
  }

  const [devices] = await db.query(
    `SELECT
      u.uredjaj_id
    FROM uredjaj u
    JOIN prostorija p ON u.prostorija_id = p.prostorija_id
    JOIN kucanstvo k ON p.kucanstvo_id = k.kucanstvo_id
    JOIN pametni_utikac pu ON u.uredjaj_id = pu.uredjaj_id
    WHERE k.kucanstvo_id = ?
      AND k.korisnik_id = ?
      AND pu.status = 'aktivan'
      AND pu.ip_adresa IS NOT NULL`,
    [kucanstvoId, korisnikId]
  );

  const results = [];
  const errors = [];

  for (const device of devices) {
    try {
      const measurement = await collectDataFromDevice(device.uredjaj_id);
      results.push(measurement);
    } catch (error) {
      errors.push({
        uredjaj_id: device.uredjaj_id,
        error: error.message
      });
    }
  }

  return {
    success: results,
    errors: errors,
    total: devices.length,
    collected: results.length,
    failed: errors.length
  };
}

export async function getDailyConsumption(uredjajId, datum) {
  const db = getDb();

  const datumStart = new Date(datum);
  datumStart.setHours(0, 0, 0, 0);

  const datumEnd = new Date(datum);
  datumEnd.setHours(23, 59, 59, 999);

  const [rows] = await db.query(
    `SELECT
      MIN(vrijednost_kwh) AS pocetna_vrijednost,
      MAX(vrijednost_kwh) AS krajnja_vrijednost,
      MAX(vrijednost_kwh) - MIN(vrijednost_kwh) AS potrosnja,
      COUNT(*) AS broj_mjerenja
    FROM mjerenje
    WHERE uredjaj_id = ?
      AND datum_vrijeme BETWEEN ? AND ?
      AND validno = 1`,
    [uredjajId, datumStart, datumEnd]
  );

  return rows[0];
}

export async function getConsumptionStats(korisnikId, kucanstvoId, datumOd, datumDo) {
  const db = getDb();

  const [ownership] = await db.query(
    'SELECT kucanstvo_id FROM kucanstvo WHERE kucanstvo_id = ? AND korisnik_id = ?',
    [kucanstvoId, korisnikId]
  );

  if (ownership.length === 0) {
    const err = new Error('Kućanstvo nije pronađeno.');
    err.status = 404;
    throw err;
  }

  const [rows] = await db.query(
    `SELECT
      u.tip_uredjaja,
      u.naziv AS uredjaj_naziv,
      COUNT(m.mjerenje_id) AS broj_mjerenja,
      MIN(m.vrijednost_kwh) AS min_vrijednost,
      MAX(m.vrijednost_kwh) AS max_vrijednost,
      MAX(m.vrijednost_kwh) - MIN(m.vrijednost_kwh) AS ukupna_potrosnja,
      AVG(m.vrijednost_kwh) AS prosjecna_vrijednost
    FROM mjerenje m
    JOIN uredjaj u ON m.uredjaj_id = u.uredjaj_id
    JOIN prostorija p ON u.prostorija_id = p.prostorija_id
    JOIN kucanstvo k ON p.kucanstvo_id = k.kucanstvo_id
    WHERE k.kucanstvo_id = ?
      AND k.korisnik_id = ?
      AND m.datum_vrijeme BETWEEN ? AND ?
      AND m.validno = 1
    GROUP BY u.uredjaj_id, u.tip_uredjaja, u.naziv`,
    [kucanstvoId, korisnikId, datumOd, datumDo]
  );

  return rows;
}
