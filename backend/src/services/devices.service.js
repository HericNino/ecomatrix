import { getDb } from "../config/db.js";

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

/** GET /api/households/:id/devices */
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

/** POST /api/households/:id/devices */
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

  // provjera da prostorija pripada tom kućanstvu
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


/** GET /api/devices/:deviceId */
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

/** GET /api/devices/:deviceId/plug */
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
/** POST /api/devices/:deviceId/plug */
export async function attachPlugToDevice(korisnikId, uredjajId, data) {
  const { serijski_broj, proizvodjac, model } = data;
  const db = getDb();
  await assertDeviceOwnership(db, korisnikId, uredjajId);

  if (!serijski_broj) {
    const err = new Error('serijski_broj je obavezan.');
    err.status = 400;
    throw err;
  }

  // provjeri da uređaj već nema utičnicu
  const [existingForDevice] = await db.query(
    `SELECT utikac_id FROM pametni_utikac WHERE uredjaj_id = ?`,
    [uredjajId]
  );

  if (existingForDevice.length > 0) {
    const err = new Error('Uređaj već ima pridruženu pametnu utičnicu.');
    err.status = 400;
    throw err;
  }

  // provjeri da serijski broj nije zauzet
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
        status
     ) VALUES (?, ?, ?, ?, 'aktivan')`,
    [uredjajId, serijski_broj, proizvodjac || null, model || null]
  );

  return {
    id: res.insertId,
    uredjaj_id: uredjajId,
    serijski_broj,
    proizvodjac: proizvodjac || null,
    model: model || null,
    status: 'aktivan'
  };
}