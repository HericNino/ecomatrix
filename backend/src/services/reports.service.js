import { getDb } from '../config/db.js';

// Generira izvjestaj potrosnje za odredjeno razdoblje
export async function generateConsumptionReport(korisnikId, kucanstvoId, datumOd, datumDo, groupBy = 'day') {
  const db = getDb();

  // Provjeri vlasnistvo
  const [ownership] = await db.query(
    'SELECT kucanstvo_id FROM kucanstvo WHERE kucanstvo_id = ? AND korisnik_id = ?',
    [kucanstvoId, korisnikId]
  );

  if (ownership.length === 0) {
    const err = new Error('Kucanstvo ne postoji');
    err.status = 404;
    throw err;
  }

  // Odredi SQL grouping na osnovu tipa izvjestaja
  let dateFormat;
  let groupByClause;

  switch(groupBy) {
    case 'hour':
      dateFormat = '%Y-%m-%d %H:00:00';
      groupByClause = 'DATE_FORMAT(m.datum_vrijeme, "%Y-%m-%d %H")';
      break;
    case 'day':
      dateFormat = '%Y-%m-%d';
      groupByClause = 'DATE(m.datum_vrijeme)';
      break;
    case 'week':
      dateFormat = '%Y-%u'; // Year-Week
      groupByClause = 'YEARWEEK(m.datum_vrijeme)';
      break;
    case 'month':
      dateFormat = '%Y-%m';
      groupByClause = 'DATE_FORMAT(m.datum_vrijeme, "%Y-%m")';
      break;
    case 'year':
      dateFormat = '%Y';
      groupByClause = 'YEAR(m.datum_vrijeme)';
      break;
    default:
      dateFormat = '%Y-%m-%d';
      groupByClause = 'DATE(m.datum_vrijeme)';
  }

  // Dohvati potrosnju grupirano po vremenu (koristimo MIN/MAX za svaki uredjaj, pa sumiramo)
  const [deviceConsumption] = await db.query(
    `SELECT
      u.uredjaj_id,
      ${groupByClause} as period,
      MAX(m.vrijednost_kwh) - MIN(m.vrijednost_kwh) as potrosnja_kwh
    FROM mjerenje m
    JOIN uredjaj u ON m.uredjaj_id = u.uredjaj_id
    JOIN prostorija p ON u.prostorija_id = p.prostorija_id
    WHERE p.kucanstvo_id = ?
      AND m.datum_vrijeme >= ?
      AND m.datum_vrijeme <= ?
      AND m.validno = 1
    GROUP BY u.uredjaj_id, period
    ORDER BY period`,
    [kucanstvoId, datumOd, datumDo]
  );

  // Grupiraj po periodu i sumiraj potrosnju svih uredjaja
  const timeSeriesMap = {};
  deviceConsumption.forEach(row => {
    if (!timeSeriesMap[row.period]) {
      timeSeriesMap[row.period] = {
        period: row.period,
        potrosnja_kwh: 0
      };
    }
    timeSeriesMap[row.period].potrosnja_kwh += (row.potrosnja_kwh || 0);
  });

  const timeSeriesData = Object.values(timeSeriesMap).map(item => ({
    datum: item.period,
    potrosnja_kwh: parseFloat((item.potrosnja_kwh || 0).toFixed(2))
  }));

  // Dohvati top uredjaje po potrosnji
  const [topDevices] = await db.query(
    `SELECT
      u.uredjaj_id,
      u.naziv,
      u.tip_uredjaja,
      p.naziv as prostorija,
      MAX(m.vrijednost_kwh) - MIN(m.vrijednost_kwh) as potrosnja_kwh
    FROM mjerenje m
    JOIN uredjaj u ON m.uredjaj_id = u.uredjaj_id
    JOIN prostorija p ON u.prostorija_id = p.prostorija_id
    WHERE p.kucanstvo_id = ?
      AND m.datum_vrijeme >= ?
      AND m.datum_vrijeme <= ?
      AND m.validno = 1
    GROUP BY u.uredjaj_id, u.naziv, u.tip_uredjaja, p.naziv
    ORDER BY potrosnja_kwh DESC
    LIMIT 10`,
    [kucanstvoId, datumOd, datumDo]
  );

  // Potrosnja po prostorijama (prvo po uredjaju, pa grupiramo po prostoriji)
  const [devicesByRoom] = await db.query(
    `SELECT
      p.prostorija_id,
      p.naziv as prostorija,
      p.tip as tip_prostorije,
      u.uredjaj_id,
      MAX(m.vrijednost_kwh) - MIN(m.vrijednost_kwh) as potrosnja_kwh
    FROM mjerenje m
    JOIN uredjaj u ON m.uredjaj_id = u.uredjaj_id
    JOIN prostorija p ON u.prostorija_id = p.prostorija_id
    WHERE p.kucanstvo_id = ?
      AND m.datum_vrijeme >= ?
      AND m.datum_vrijeme <= ?
      AND m.validno = 1
    GROUP BY p.prostorija_id, p.naziv, p.tip, u.uredjaj_id`,
    [kucanstvoId, datumOd, datumDo]
  );

  // Grupiraj po prostoriji
  const roomMap = {};
  devicesByRoom.forEach(row => {
    if (!roomMap[row.prostorija_id]) {
      roomMap[row.prostorija_id] = {
        prostorija_id: row.prostorija_id,
        prostorija: row.prostorija,
        tip_prostorije: row.tip_prostorije,
        potrosnja_kwh: 0
      };
    }
    roomMap[row.prostorija_id].potrosnja_kwh += (row.potrosnja_kwh || 0);
  });

  const roomData = Object.values(roomMap)
    .sort((a, b) => b.potrosnja_kwh - a.potrosnja_kwh)
    .map(room => ({
      ...room,
      potrosnja_kwh: parseFloat(room.potrosnja_kwh.toFixed(2))
    }));

  // Potrosnja po tipu uredjaja (prvo po uredjaju, pa grupiramo po tipu)
  const [devicesByType] = await db.query(
    `SELECT
      u.tip_uredjaja,
      u.uredjaj_id,
      MAX(m.vrijednost_kwh) - MIN(m.vrijednost_kwh) as potrosnja_kwh
    FROM mjerenje m
    JOIN uredjaj u ON m.uredjaj_id = u.uredjaj_id
    JOIN prostorija p ON u.prostorija_id = p.prostorija_id
    WHERE p.kucanstvo_id = ?
      AND m.datum_vrijeme >= ?
      AND m.datum_vrijeme <= ?
      AND m.validno = 1
    GROUP BY u.tip_uredjaja, u.uredjaj_id`,
    [kucanstvoId, datumOd, datumDo]
  );

  // Grupiraj po tipu uredjaja
  const typeMap = {};
  devicesByType.forEach(row => {
    if (!typeMap[row.tip_uredjaja]) {
      typeMap[row.tip_uredjaja] = {
        tip_uredjaja: row.tip_uredjaja,
        broj_uredjaja: 0,
        potrosnja_kwh: 0,
        devices: new Set()
      };
    }
    typeMap[row.tip_uredjaja].devices.add(row.uredjaj_id);
    typeMap[row.tip_uredjaja].potrosnja_kwh += (row.potrosnja_kwh || 0);
  });

  const deviceTypeData = Object.values(typeMap)
    .sort((a, b) => b.potrosnja_kwh - a.potrosnja_kwh)
    .map(type => ({
      tip_uredjaja: type.tip_uredjaja,
      broj_uredjaja: type.devices.size,
      potrosnja_kwh: parseFloat(type.potrosnja_kwh.toFixed(2))
    }));

  // Ukupna statistika
  const ukupnaPotrosnja = timeSeriesData.reduce((sum, item) => sum + parseFloat(item.potrosnja_kwh || 0), 0);
  const prosjecnaDnevna = timeSeriesData.length > 0 ? ukupnaPotrosnja / timeSeriesData.length : 0;

  return {
    period: {
      od: datumOd,
      do: datumDo,
      groupBy
    },
    summary: {
      ukupna_potrosnja_kwh: parseFloat(ukupnaPotrosnja.toFixed(2)),
      prosjecna_dnevna_kwh: parseFloat(prosjecnaDnevna.toFixed(2)),
      broj_uredjaja: topDevices.length,
      broj_dana: timeSeriesData.length
    },
    timeSeries: timeSeriesData.map(item => ({
      datum: item.datum,
      potrosnja_kwh: parseFloat((item.potrosnja_kwh || 0).toFixed(2))
    })),
    topDevices: topDevices.map(device => ({
      uredjaj_id: device.uredjaj_id,
      naziv: device.naziv,
      tip_uredjaja: device.tip_uredjaja,
      prostorija: device.prostorija,
      potrosnja_kwh: parseFloat((device.potrosnja_kwh || 0).toFixed(2))
    })),
    byRoom: roomData.map(room => ({
      prostorija_id: room.prostorija_id,
      prostorija: room.prostorija,
      tip_prostorije: room.tip_prostorije,
      potrosnja_kwh: parseFloat((room.potrosnja_kwh || 0).toFixed(2))
    })),
    byDeviceType: deviceTypeData.map(type => ({
      tip_uredjaja: type.tip_uredjaja,
      broj_uredjaja: type.broj_uredjaja,
      potrosnja_kwh: parseFloat((type.potrosnja_kwh || 0).toFixed(2))
    }))
  };
}

// Usporedi dva razdoblja
export async function comparePeriodsReport(korisnikId, kucanstvoId, period1Start, period1End, period2Start, period2End) {
  const db = getDb();

  // Dohvati podatke za oba razdoblja
  const report1 = await generateConsumptionReport(korisnikId, kucanstvoId, period1Start, period1End, 'day');
  const report2 = await generateConsumptionReport(korisnikId, kucanstvoId, period2Start, period2End, 'day');

  // Izracunaj razlike
  const difference = {
    potrosnja_kwh: report1.summary.ukupna_potrosnja_kwh - report2.summary.ukupna_potrosnja_kwh,
    postotak: report2.summary.ukupna_potrosnja_kwh > 0
      ? ((report1.summary.ukupna_potrosnja_kwh - report2.summary.ukupna_potrosnja_kwh) / report2.summary.ukupna_potrosnja_kwh * 100)
      : 0
  };

  return {
    period1: {
      od: period1Start,
      do: period1End,
      ...report1.summary
    },
    period2: {
      od: period2Start,
      do: period2End,
      ...report2.summary
    },
    difference: {
      potrosnja_kwh: parseFloat(difference.potrosnja_kwh.toFixed(2)),
      postotak: parseFloat(difference.postotak.toFixed(2))
    },
    trend: difference.potrosnja_kwh > 0 ? 'rast' : difference.potrosnja_kwh < 0 ? 'pad' : 'stabilno'
  };
}
