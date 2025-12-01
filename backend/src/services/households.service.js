import { getDb } from "../config/db.js";

/** Helper:provjera da kucanstvo pripada korisniku */

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
        `SELECT kucanstvo_id AS id,
            naziv,
            adresa,
            broj_clanova,
            kvadratura
       FROM kucanstvo
      WHERE korisnik_id = ?
      ORDER BY kucanstvo_id DESC`,
    [korisnikId]
    );

    // Stats placeholder — popunit ćemo kad napravimo mjerenja/tarife
    return rows.map(r => ({
        ...r,
    ukupna_mjesecna_potrosnja_kwh: null,
    ukupni_mjesecni_trosak_eur: null
  }));
}

export async function createHousehold(korisnikId,{naziv, adresa, broj_clanova, kvadratura}) {
 const db = getDb();

  const [res] = await db.query(
    `INSERT INTO kucanstvo (korisnik_id, naziv, adresa, broj_clanova, kvadratura)
     VALUES (?, ?, ?, ?, ?)`,
    [korisnikId, naziv, adresa, broj_clanova, kvadratura]
  );
  return {
    id: res.insertId,
    korisnik_id: korisnikId,
    naziv,
    adresa,
    broj_clanova,
    kvadratura
  };
}

export async function getHouseholdById(korisnikId, kucanstvoId) {
    const db = getDb();
    const [rows] = await db.query(
    `SELECT kucanstvo_id AS id,
            naziv,
            adresa,
            broj_clanova,
            kvadratura
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
 // placeholder statistika — kasnije ćemo izračunati iz mjerenja/računa
   return {
    id: r.id,
    naziv: r.naziv,
    adresa: r.adresa,
    broj_clanova: r.broj_clanova,
    kvadratura: r.kvadratura,
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
    `SELECT prostorija_id AS id, naziv, tip, kvadratura
       FROM prostorija
      WHERE kucanstvo_id = ?
      ORDER BY prostorija_id ASC`,
    [kucanstvoId]
  );

  return rows;
}

export async function createRoom(korisnikId, kucanstvoId, { naziv, tip, kvadratura }) {
  const db = getDb();
  await assertOwnership(db, korisnikId, kucanstvoId);

  const [res] = await db.query(
    `INSERT INTO prostorija (kucanstvo_id, naziv, tip, kvadratura)
     VALUES (?, ?, ?, ?)`,
    [kucanstvoId, naziv, tip, kvadratura]
  );

  return {
    id: res.insertId,
    kucanstvo_id: kucanstvoId,
    naziv,
    tip,
    kvadratura
  };
}
