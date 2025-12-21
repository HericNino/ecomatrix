import { getDb } from '../config/db.js';

/**
 * Dohvaća postavke cijene struje za kućanstvo
 */
export async function getElectricityPrice(korisnikId, kucanstvoId) {
  const db = getDb();

  const [rows] = await db.query(
    `SELECT cijena_kwh, valuta
     FROM kucanstvo
     WHERE kucanstvo_id = ? AND korisnik_id = ?`,
    [kucanstvoId, korisnikId]
  );

  if (rows.length === 0) {
    const err = new Error('Kućanstvo nije pronađeno.');
    err.status = 404;
    throw err;
  }

  return {
    cijena_kwh: parseFloat(rows[0].cijena_kwh),
    valuta: rows[0].valuta,
  };
}

/**
 * Postavlja cijenu struje za kućanstvo
 */
export async function setElectricityPrice(korisnikId, kucanstvoId, cijenaKwh, valuta = 'EUR') {
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

  await db.query(
    'UPDATE kucanstvo SET cijena_kwh = ?, valuta = ? WHERE kucanstvo_id = ?',
    [cijenaKwh, valuta, kucanstvoId]
  );

  return {
    cijena_kwh: parseFloat(cijenaKwh),
    valuta,
  };
}

/**
 * Izračunava troškove potrošnje za određeno razdoblje
 */
export async function calculateCosts(korisnikId, kucanstvoId, datumOd, datumDo) {
  const db = getDb();

  // Provjeri vlasništvo i dohvati cijenu
  const priceInfo = await getElectricityPrice(korisnikId, kucanstvoId);

  // Dohvati potrošnju po uređajima
  const [devices] = await db.query(
    `SELECT
      u.uredjaj_id,
      u.naziv,
      u.tip_uredjaja,
      p.naziv AS prostorija,
      MIN(m.vrijednost_kwh) as min_value,
      MAX(m.vrijednost_kwh) as max_value,
      MAX(m.vrijednost_kwh) - MIN(m.vrijednost_kwh) as potrosnja_kwh
     FROM mjerenje m
     JOIN uredjaj u ON m.uredjaj_id = u.uredjaj_id
     JOIN prostorija p ON u.prostorija_id = p.prostorija_id
     WHERE p.kucanstvo_id = ?
       AND m.datum_vrijeme >= ?
       AND m.datum_vrijeme <= ?
       AND m.validno = 1
     GROUP BY u.uredjaj_id, u.naziv, u.tip_uredjaja, p.naziv`,
    [kucanstvoId, datumOd, datumDo]
  );

  // Izračunaj troškove po uređajima
  const costsPerDevice = devices.map(device => ({
    uredjaj_id: device.uredjaj_id,
    naziv: device.naziv,
    tip_uredjaja: device.tip_uredjaja,
    prostorija: device.prostorija,
    potrosnja_kwh: parseFloat(device.potrosnja_kwh || 0),
    troskovi: parseFloat((device.potrosnja_kwh || 0) * priceInfo.cijena_kwh).toFixed(2),
  }));

  // Ukupna potrošnja i troškovi
  const ukupnaPotrosnja = costsPerDevice.reduce((sum, d) => sum + d.potrosnja_kwh, 0);
  const ukupniTroskovi = costsPerDevice.reduce((sum, d) => sum + parseFloat(d.troskovi), 0);

  // Grupiranje po prostorijama
  const costsPerRoom = {};
  costsPerDevice.forEach(device => {
    if (!costsPerRoom[device.prostorija]) {
      costsPerRoom[device.prostorija] = {
        prostorija: device.prostorija,
        potrosnja_kwh: 0,
        troskovi: 0,
      };
    }
    costsPerRoom[device.prostorija].potrosnja_kwh += device.potrosnja_kwh;
    costsPerRoom[device.prostorija].troskovi += parseFloat(device.troskovi);
  });

  const roomCosts = Object.values(costsPerRoom).map(room => ({
    ...room,
    potrosnja_kwh: parseFloat(room.potrosnja_kwh.toFixed(2)),
    troskovi: parseFloat(room.troskovi.toFixed(2)),
  }));

  // Grupiranje po tipu uređaja
  const costsPerType = {};
  costsPerDevice.forEach(device => {
    if (!costsPerType[device.tip_uredjaja]) {
      costsPerType[device.tip_uredjaja] = {
        tip_uredjaja: device.tip_uredjaja,
        potrosnja_kwh: 0,
        troskovi: 0,
      };
    }
    costsPerType[device.tip_uredjaja].potrosnja_kwh += device.potrosnja_kwh;
    costsPerType[device.tip_uredjaja].troskovi += parseFloat(device.troskovi);
  });

  const typeCosts = Object.values(costsPerType).map(type => ({
    ...type,
    potrosnja_kwh: parseFloat(type.potrosnja_kwh.toFixed(2)),
    troskovi: parseFloat(type.troskovi.toFixed(2)),
  }));

  return {
    period: {
      od: datumOd,
      do: datumDo,
    },
    pricing: {
      cijena_kwh: priceInfo.cijena_kwh,
      valuta: priceInfo.valuta,
    },
    total: {
      potrosnja_kwh: parseFloat(ukupnaPotrosnja.toFixed(2)),
      troskovi: parseFloat(ukupniTroskovi.toFixed(2)),
    },
    byDevice: costsPerDevice,
    byRoom: roomCosts,
    byType: typeCosts,
  };
}

/**
 * Dohvaća dnevne troškove za grafikon
 */
export async function getDailyCosts(korisnikId, kucanstvoId, danaUnazad = 30) {
  const db = getDb();

  // Dohvati cijenu
  const priceInfo = await getElectricityPrice(korisnikId, kucanstvoId);

  const datumOd = new Date();
  datumOd.setDate(datumOd.getDate() - danaUnazad);

  const [dailyData] = await db.query(
    `SELECT
      DATE(m.datum_vrijeme) as datum,
      SUM(CASE
        WHEN prev.vrijednost_kwh IS NOT NULL
        THEN m.vrijednost_kwh - prev.vrijednost_kwh
        ELSE 0
      END) as potrosnja_kwh
     FROM mjerenje m
     LEFT JOIN mjerenje prev ON prev.uredjaj_id = m.uredjaj_id
       AND prev.datum_vrijeme < m.datum_vrijeme
       AND prev.datum_vrijeme >= DATE_SUB(m.datum_vrijeme, INTERVAL 1 DAY)
     JOIN uredjaj u ON m.uredjaj_id = u.uredjaj_id
     JOIN prostorija p ON u.prostorija_id = p.prostorija_id
     WHERE p.kucanstvo_id = ?
       AND m.datum_vrijeme >= ?
       AND m.validno = 1
     GROUP BY DATE(m.datum_vrijeme)
     ORDER BY datum ASC`,
    [kucanstvoId, datumOd]
  );

  const dailyCosts = dailyData.map(day => ({
    datum: day.datum,
    potrosnja_kwh: parseFloat((day.potrosnja_kwh || 0).toFixed(2)),
    troskovi: parseFloat(((day.potrosnja_kwh || 0) * priceInfo.cijena_kwh).toFixed(2)),
  }));

  return {
    cijena_kwh: priceInfo.cijena_kwh,
    valuta: priceInfo.valuta,
    data: dailyCosts,
  };
}
