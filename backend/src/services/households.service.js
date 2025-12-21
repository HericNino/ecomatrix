import { getDb } from "../config/db.js";

async function assertOwnership(db, korisnikId, kucanstvoId) {
    const [rows] = await db.query(
            `SELECT kucanstvo_id 
            FROM kucanstvo 
            WHERE kucanstvo_id = ? AND korisnik_id = ?`,
    [kucanstvoId, korisnikId]
    );

    if (rows.length === 0) {
        const err = new Error('Kućanstvo nije pronađeno');
        err.status = 404;
        throw err;
    }
}

export async function listHouseholds(korisnikId) {
    const db = getDb();
    const [rows] = await db.query(
        `SELECT kucanstvo_id AS id_kucanstvo,
            naziv,
            adresa,
            grad,
            broj_clanova,
            kvadratura AS povrsina
       FROM kucanstvo
      WHERE korisnik_id = ?
      ORDER BY kucanstvo_id DESC`,
    [korisnikId]
    );

    return rows.map(r => ({
        ...r,
    ukupna_mjesecna_potrosnja_kwh: null,
    ukupni_mjesecni_trosak_eur: null
  }));
}

export async function createHousehold(korisnikId,{naziv, adresa, grad, povrsina}) {
 const db = getDb();

  const [res] = await db.query(
    `INSERT INTO kucanstvo (korisnik_id, naziv, adresa, grad, kvadratura)
     VALUES (?, ?, ?, ?, ?)`,
    [korisnikId, naziv, adresa, grad, povrsina || null]
  );
  return {
    id_kucanstvo: res.insertId,
    korisnik_id: korisnikId,
    naziv,
    adresa,
    grad,
    povrsina
  };
}

export async function getHouseholdById(korisnikId, kucanstvoId) {
    const db = getDb();
    const [rows] = await db.query(
    `SELECT kucanstvo_id AS id_kucanstvo,
            naziv,
            adresa,
            grad,
            broj_clanova,
            kvadratura AS povrsina
       FROM kucanstvo
      WHERE kucanstvo_id = ? AND korisnik_id = ?`,
    [kucanstvoId, korisnikId]
  );

  if (rows.length === 0) {
    const err = new Error('Kućanstvo nije pronađeno');
    err.status = 404;
    throw err;
  }
    const r = rows[0];

   return {
    id_kucanstvo: r.id_kucanstvo,
    naziv: r.naziv,
    adresa: r.adresa,
    grad: r.grad,
    broj_clanova: r.broj_clanova,
    povrsina: r.povrsina,
    statistika: {
      zadnjih_30_dana_potrosnja_kwh: null,
      zadnjih_30_dana_trosak_eur: null,
      prosjek_dnevno_kwh: null,
      trend: null
    }
  };
}

export async function listRooms(korisnikId, kucanstvoId) {
  const db = getDb();
  await assertOwnership(db, korisnikId, kucanstvoId);

  const [rows] = await db.query(
    `SELECT prostorija_id AS id_prostorija, naziv, tip, kvadratura AS povrsina
       FROM prostorija
      WHERE kucanstvo_id = ?
      ORDER BY prostorija_id ASC`,
    [kucanstvoId]
  );

  return rows;
}

export async function createRoom(korisnikId, kucanstvoId, { naziv, tip, povrsina }) {
  const db = getDb();
  await assertOwnership(db, korisnikId, kucanstvoId);

  const [res] = await db.query(
    `INSERT INTO prostorija (kucanstvo_id, naziv, tip, kvadratura)
     VALUES (?, ?, ?, ?)`,
    [kucanstvoId, naziv, tip || null, povrsina || null]
  );

  return {
    id_prostorija: res.insertId,
    kucanstvo_id: kucanstvoId,
    naziv,
    tip,
    povrsina
  };
}

export async function updateHousehold(korisnikId, kucanstvoId, { naziv, adresa, grad, povrsina }) {
  const db = getDb();
  await assertOwnership(db, korisnikId, kucanstvoId);

  await db.query(
    `UPDATE kucanstvo
     SET naziv = ?, adresa = ?, grad = ?, kvadratura = ?
     WHERE kucanstvo_id = ?`,
    [naziv, adresa, grad, povrsina || null, kucanstvoId]
  );

  return {
    id_kucanstvo: kucanstvoId,
    naziv,
    adresa,
    grad,
    povrsina
  };
}

export async function deleteHousehold(korisnikId, kucanstvoId) {
  const db = getDb();
  await assertOwnership(db, korisnikId, kucanstvoId);

  await db.query('DELETE FROM kucanstvo WHERE kucanstvo_id = ?', [kucanstvoId]);

  return { success: true };
}

export async function updateRoom(korisnikId, kucanstvoId, prostorijId, { naziv, tip, povrsina }) {
  const db = getDb();
  await assertOwnership(db, korisnikId, kucanstvoId);

  await db.query(
    `UPDATE prostorija
     SET naziv = ?, tip = ?, kvadratura = ?
     WHERE prostorija_id = ? AND kucanstvo_id = ?`,
    [naziv, tip || null, povrsina || null, prostorijId, kucanstvoId]
  );

  return {
    id_prostorija: prostorijId,
    naziv,
    tip,
    povrsina
  };
}

export async function deleteRoom(korisnikId, kucanstvoId, prostorijId) {
  const db = getDb();
  await assertOwnership(db, korisnikId, kucanstvoId);

  await db.query(
    'DELETE FROM prostorija WHERE prostorija_id = ? AND kucanstvo_id = ?',
    [prostorijId, kucanstvoId]
  );

  return { success: true };
}

// Dohvati statistiku za kucanstvo
export async function getHouseholdStats(korisnikId, kucanstvoId) {
  const db = getDb();
  await assertOwnership(db, korisnikId, kucanstvoId);

  // Ukupan broj uredjaja
  const [deviceCount] = await db.query(
    `SELECT COUNT(*) as total
     FROM uredjaj u
     JOIN prostorija p ON u.prostorija_id = p.prostorija_id
     WHERE p.kucanstvo_id = ?`,
    [kucanstvoId]
  );

  // Broj aktivnih uredjaja (oni koji imaju pametni utikac)
  const [activeCount] = await db.query(
    `SELECT COUNT(*) as total
     FROM uredjaj u
     JOIN prostorija p ON u.prostorija_id = p.prostorija_id
     LEFT JOIN pametni_utikac pu ON u.uredjaj_id = pu.uredjaj_id
     WHERE p.kucanstvo_id = ? AND pu.ip_adresa IS NOT NULL`,
    [kucanstvoId]
  );

  // Ukupna potrosnja za zadnjih 30 dana
  const datumOd = new Date();
  datumOd.setDate(datumOd.getDate() - 30);

  const [consumption] = await db.query(
    `SELECT
       u.uredjaj_id,
       MAX(m.vrijednost_kwh) - MIN(m.vrijednost_kwh) as device_consumption
     FROM mjerenje m
     JOIN uredjaj u ON m.uredjaj_id = u.uredjaj_id
     JOIN prostorija p ON u.prostorija_id = p.prostorija_id
     WHERE p.kucanstvo_id = ? AND m.datum_vrijeme >= ? AND m.validno = 1
     GROUP BY u.uredjaj_id`,
    [kucanstvoId, datumOd]
  );

  const totalConsumption = consumption.reduce((sum, row) => sum + (row.device_consumption || 0), 0);

  return {
    total_devices: deviceCount[0].total || 0,
    active_devices: activeCount[0].total || 0,
    total_consumption: parseFloat(totalConsumption.toFixed(2)) || 0
  };
}
