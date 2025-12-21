import { getDb } from '../config/db.js';
import * as costsService from './costs.service.js';

/**
 * Kreira novi cilj štednje
 */
export async function createGoal(korisnikId, kucanstvoId, goalData) {
  const db = getDb();

  // Provjeri vlasništvo
  const [ownership] = await db.query(
    'SELECT kucanstvo_id FROM kucanstvo WHERE kucanstvo_id = ? AND korisnik_id = ?',
    [kucanstvoId, korisnikId]
  );

  if (ownership.length === 0) {
    const err = new Error('Kućanstvo nije pronađeno.');
    err.status = 404;
    throw err;
  }

  const { naziv, tip_cilja, cilj_kwh, cilj_troskova, datum_pocetka, datum_zavrsetka } = goalData;

  const [result] = await db.query(
    `INSERT INTO cilj_stednje
     (kucanstvo_id, naziv, tip_cilja, cilj_kwh, cilj_troskova, datum_pocetka, datum_zavrsetka, aktivan)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [kucanstvoId, naziv, tip_cilja, cilj_kwh, cilj_troskova, datum_pocetka, datum_zavrsetka]
  );

  return {
    cilj_id: result.insertId,
    kucanstvo_id: kucanstvoId,
    naziv,
    tip_cilja,
    cilj_kwh: cilj_kwh ? parseFloat(cilj_kwh) : null,
    cilj_troskova: cilj_troskova ? parseFloat(cilj_troskova) : null,
    datum_pocetka,
    datum_zavrsetka,
    aktivan: true,
  };
}

/**
 * Dohvaća sve ciljeve za kućanstvo
 */
export async function getGoals(korisnikId, kucanstvoId, onlyActive = false) {
  const db = getDb();

  // Provjeri vlasništvo
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
      cilj_id,
      kucanstvo_id,
      naziv,
      tip_cilja,
      cilj_kwh,
      cilj_troskova,
      datum_pocetka,
      datum_zavrsetka,
      aktivan,
      kreiran_datum
    FROM cilj_stednje
    WHERE kucanstvo_id = ?
  `;

  const params = [kucanstvoId];

  if (onlyActive) {
    query += ' AND aktivan = 1';
  }

  query += ' ORDER BY datum_pocetka DESC';

  const [goals] = await db.query(query, params);

  // Za svaki cilj, izračunaj trenutni napredak
  const goalsWithProgress = await Promise.all(
    goals.map(async goal => {
      const progress = await calculateGoalProgress(korisnikId, goal);
      return {
        ...goal,
        cilj_kwh: goal.cilj_kwh ? parseFloat(goal.cilj_kwh) : null,
        cilj_troskova: goal.cilj_troskova ? parseFloat(goal.cilj_troskova) : null,
        aktivan: Boolean(goal.aktivan),
        progress,
      };
    })
  );

  return goalsWithProgress;
}

/**
 * Dohvaća pojedinačni cilj
 */
export async function getGoal(korisnikId, kucanstvoId, ciljId) {
  const db = getDb();

  const [goals] = await db.query(
    `SELECT
      c.cilj_id,
      c.kucanstvo_id,
      c.naziv,
      c.tip_cilja,
      c.cilj_kwh,
      c.cilj_troskova,
      c.datum_pocetka,
      c.datum_zavrsetka,
      c.aktivan,
      c.kreiran_datum
    FROM cilj_stednje c
    JOIN kucanstvo k ON c.kucanstvo_id = k.kucanstvo_id
    WHERE c.cilj_id = ? AND c.kucanstvo_id = ? AND k.korisnik_id = ?`,
    [ciljId, kucanstvoId, korisnikId]
  );

  if (goals.length === 0) {
    const err = new Error('Cilj nije pronađen.');
    err.status = 404;
    throw err;
  }

  const goal = goals[0];
  const progress = await calculateGoalProgress(korisnikId, goal);

  return {
    ...goal,
    cilj_kwh: goal.cilj_kwh ? parseFloat(goal.cilj_kwh) : null,
    cilj_troskova: goal.cilj_troskova ? parseFloat(goal.cilj_troskova) : null,
    aktivan: Boolean(goal.aktivan),
    progress,
  };
}

/**
 * Ažurira cilj
 */
export async function updateGoal(korisnikId, kucanstvoId, ciljId, goalData) {
  const db = getDb();

  // Provjeri vlasništvo
  const [existing] = await db.query(
    `SELECT c.cilj_id
     FROM cilj_stednje c
     JOIN kucanstvo k ON c.kucanstvo_id = k.kucanstvo_id
     WHERE c.cilj_id = ? AND c.kucanstvo_id = ? AND k.korisnik_id = ?`,
    [ciljId, kucanstvoId, korisnikId]
  );

  if (existing.length === 0) {
    const err = new Error('Cilj nije pronađen.');
    err.status = 404;
    throw err;
  }

  const { naziv, tip_cilja, cilj_kwh, cilj_troskova, datum_pocetka, datum_zavrsetka, aktivan } = goalData;

  await db.query(
    `UPDATE cilj_stednje
     SET naziv = ?, tip_cilja = ?, cilj_kwh = ?, cilj_troskova = ?,
         datum_pocetka = ?, datum_zavrsetka = ?, aktivan = ?
     WHERE cilj_id = ?`,
    [naziv, tip_cilja, cilj_kwh, cilj_troskova, datum_pocetka, datum_zavrsetka, aktivan, ciljId]
  );

  return getGoal(korisnikId, kucanstvoId, ciljId);
}

/**
 * Briše cilj
 */
export async function deleteGoal(korisnikId, kucanstvoId, ciljId) {
  const db = getDb();

  // Provjeri vlasništvo
  const [existing] = await db.query(
    `SELECT c.cilj_id
     FROM cilj_stednje c
     JOIN kucanstvo k ON c.kucanstvo_id = k.kucanstvo_id
     WHERE c.cilj_id = ? AND c.kucanstvo_id = ? AND k.korisnik_id = ?`,
    [ciljId, kucanstvoId, korisnikId]
  );

  if (existing.length === 0) {
    const err = new Error('Cilj nije pronađen.');
    err.status = 404;
    throw err;
  }

  await db.query('DELETE FROM cilj_stednje WHERE cilj_id = ?', [ciljId]);

  return { success: true, cilj_id: ciljId };
}

/**
 * Izračunava napredak prema cilju
 */
async function calculateGoalProgress(korisnikId, goal) {
  try {
    // Dohvati stvarnu potrošnju i troškove za razdoblje cilja
    const costs = await costsService.calculateCosts(
      korisnikId,
      goal.kucanstvo_id,
      goal.datum_pocetka,
      goal.datum_zavrsetka
    );

    const trenutnaPotrosnja = costs.total.potrosnja_kwh;
    const trenutniTroskovi = costs.total.troskovi;

    // Izračunaj postotak napretka
    let postotakKwh = null;
    let postotakTroskova = null;
    let status = 'u_toku';

    if (goal.cilj_kwh) {
      postotakKwh = (trenutnaPotrosnja / goal.cilj_kwh) * 100;
    }

    if (goal.cilj_troskova) {
      postotakTroskova = (trenutniTroskovi / goal.cilj_troskova) * 100;
    }

    // Odredi status cilja
    const today = new Date();
    const endDate = new Date(goal.datum_zavrsetka);

    if (today > endDate) {
      // Cilj je završen
      if (goal.cilj_kwh && trenutnaPotrosnja <= goal.cilj_kwh) {
        status = 'postignuto';
      } else if (goal.cilj_troskova && trenutniTroskovi <= goal.cilj_troskova) {
        status = 'postignuto';
      } else {
        status = 'prekoraceno';
      }
    } else {
      // Cilj je u tijeku
      if (goal.cilj_kwh && trenutnaPotrosnja > goal.cilj_kwh) {
        status = 'prekoraceno';
      } else if (goal.cilj_troskova && trenutniTroskovi > goal.cilj_troskova) {
        status = 'prekoraceno';
      } else if (
        (goal.cilj_kwh && postotakKwh > 80) ||
        (goal.cilj_troskova && postotakTroskova > 80)
      ) {
        status = 'upozorenje';
      }
    }

    return {
      trenutna_potrosnja_kwh: trenutnaPotrosnja,
      trenutni_troskovi: trenutniTroskovi,
      postotak_kwh: postotakKwh ? parseFloat(postotakKwh.toFixed(1)) : null,
      postotak_troskova: postotakTroskova ? parseFloat(postotakTroskova.toFixed(1)) : null,
      status, // 'u_toku', 'postignuto', 'prekoraceno', 'upozorenje'
      preostalo_kwh: goal.cilj_kwh ? Math.max(0, goal.cilj_kwh - trenutnaPotrosnja) : null,
      preostalo_troskova: goal.cilj_troskova ? Math.max(0, goal.cilj_troskova - trenutniTroskovi) : null,
    };
  } catch (error) {
    // Ako nema dovoljno podataka, vrati osnovni napredak
    return {
      trenutna_potrosnja_kwh: 0,
      trenutni_troskovi: 0,
      postotak_kwh: 0,
      postotak_troskova: 0,
      status: 'u_toku',
      preostalo_kwh: goal.cilj_kwh,
      preostalo_troskova: goal.cilj_troskova,
    };
  }
}
