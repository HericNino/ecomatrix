import { getDb } from "../config/db.js";

/**
 * Analizira obrasce potrošnje za kućanstvo
 */
export async function analyzeConsumptionPatterns(korisnikId, kucanstvoId, danaUnazad = 30) {
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

  const datumOd = new Date();
  datumOd.setDate(datumOd.getDate() - danaUnazad);

  // Dohvati sve uređaje i njihova mjerenja (kumulativne vrijednosti)
  const [measurements] = await db.query(
    `SELECT
      m.mjerenje_id,
      m.uredjaj_id,
      m.datum_vrijeme,
      m.vrijednost_kwh,
      u.naziv AS uredjaj_naziv,
      u.tip_uredjaja,
      p.naziv AS prostorija_naziv
    FROM mjerenje m
    JOIN uredjaj u ON m.uredjaj_id = u.uredjaj_id
    JOIN prostorija p ON u.prostorija_id = p.prostorija_id
    WHERE p.kucanstvo_id = ? AND m.datum_vrijeme >= ? AND m.validno = 1
    ORDER BY m.uredjaj_id, m.datum_vrijeme ASC`,
    [kucanstvoId, datumOd]
  );

  if (measurements.length === 0) {
    return {
      message: 'Nema dovoljno podataka za analizu.',
      peakHours: null,
      weekdayPatterns: null,
      topConsumers: null,
      summary: null,
    };
  }

  // Izračunaj potrošnju iz kumulativnih vrijednosti
  const consumptionData = [];
  const deviceMap = {};

  measurements.forEach((m, idx) => {
    if (!deviceMap[m.uredjaj_id]) {
      deviceMap[m.uredjaj_id] = {
        lastValue: m.vrijednost_kwh,
        lastTime: m.datum_vrijeme,
        naziv: m.uredjaj_naziv,
        tip: m.tip_uredjaja,
        prostorija: m.prostorija_naziv,
      };
    } else {
      const prev = deviceMap[m.uredjaj_id];
      const consumption = m.vrijednost_kwh - prev.lastValue;

      // Samo ako je potrošnja pozitivna (brojač ide naprijed)
      if (consumption > 0 && consumption < 10) { // razumna granica
        consumptionData.push({
          uredjaj_id: m.uredjaj_id,
          uredjaj_naziv: m.uredjaj_naziv,
          tip_uredjaja: m.tip_uredjaja,
          prostorija_naziv: m.prostorija_naziv,
          datum_vrijeme: m.datum_vrijeme,
          potrosnja_kwh: consumption,
        });
      }

      deviceMap[m.uredjaj_id].lastValue = m.vrijednost_kwh;
      deviceMap[m.uredjaj_id].lastTime = m.datum_vrijeme;
    }
  });

  if (consumptionData.length === 0) {
    return {
      message: 'Nema dovoljno podataka za analizu obrazaca.',
      peakHours: null,
      weekdayPatterns: null,
      topConsumers: null,
      summary: null,
    };
  }

  // Analiza po satima (peak hours)
  const hourlyConsumption = {};
  consumptionData.forEach(c => {
    const hour = new Date(c.datum_vrijeme).getHours();
    if (!hourlyConsumption[hour]) {
      hourlyConsumption[hour] = 0;
    }
    hourlyConsumption[hour] += c.potrosnja_kwh;
  });

  // Pronađi špic sate
  const peakHours = Object.entries(hourlyConsumption)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour, consumption]) => ({
      hour: parseInt(hour),
      consumption: parseFloat(consumption.toFixed(2)),
    }));

  // Analiza po danima u tjednu
  const dayOfWeekConsumption = {};
  const daysMap = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'];

  consumptionData.forEach(c => {
    const dayOfWeek = new Date(c.datum_vrijeme).getDay();
    if (!dayOfWeekConsumption[dayOfWeek]) {
      dayOfWeekConsumption[dayOfWeek] = 0;
    }
    dayOfWeekConsumption[dayOfWeek] += c.potrosnja_kwh;
  });

  const weekdayPatterns = daysMap.map((name, idx) => ({
    day: name,
    consumption: parseFloat((dayOfWeekConsumption[idx] || 0).toFixed(2)),
  }));

  // Top potrošači
  const deviceConsumption = {};
  consumptionData.forEach(c => {
    if (!deviceConsumption[c.uredjaj_id]) {
      deviceConsumption[c.uredjaj_id] = {
        naziv: c.uredjaj_naziv,
        tip: c.tip_uredjaja,
        prostorija: c.prostorija_naziv,
        total: 0,
      };
    }
    deviceConsumption[c.uredjaj_id].total += c.potrosnja_kwh;
  });

  const topConsumers = Object.values(deviceConsumption)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map(d => ({
      ...d,
      total: parseFloat(d.total.toFixed(2)),
    }));

  // Neobični skokovi (3x iznad prosjeka)
  const avgConsumption = consumptionData.reduce((sum, c) => sum + c.potrosnja_kwh, 0) / consumptionData.length;
  const unusualSpikes = consumptionData
    .filter(c => c.potrosnja_kwh > avgConsumption * 3)
    .map(c => ({
      uredjaj_naziv: c.uredjaj_naziv,
      datum_vrijeme: c.datum_vrijeme,
      potrosnja_kwh: parseFloat(c.potrosnja_kwh.toFixed(2)),
    }))
    .slice(0, 5);

  // Summary statistika
  const totalConsumption = consumptionData.reduce((sum, c) => sum + c.potrosnja_kwh, 0);
  const summary = {
    totalConsumption: parseFloat(totalConsumption.toFixed(2)),
    averageDaily: parseFloat((totalConsumption / danaUnazad).toFixed(2)),
    measurementCount: consumptionData.length,
    deviceCount: Object.keys(deviceConsumption).length,
  };

  return {
    peakHours,
    weekdayPatterns,
    topConsumers,
    unusualSpikes,
    summary,
  };
}

/**
 * Generira personalizirane preporuke na temelju obrazaca potrošnje
 */
export async function generateRecommendations(korisnikId, kucanstvoId) {
  const patterns = await analyzeConsumptionPatterns(korisnikId, kucanstvoId, 30);

  if (!patterns.peakHours) {
    return {
      recommendations: [],
      message: 'Nema dovoljno podataka za generiranje preporuka.',
    };
  }

  const recommendations = [];

  // Preporuka 1: Špic sati
  if (patterns.peakHours && patterns.peakHours.length > 0) {
    const topPeakHour = patterns.peakHours[0];
    if (topPeakHour.consumption > 1.0) {
      recommendations.push({
        priority: 'high',
        icon: '⚡',
        title: 'Smanjite potrošnju u špic satima',
        description: `Najviše energije trošite oko ${topPeakHour.hour}:00 sati. Pokušajte prebaciti neke aktivnosti na razdoblja manje potrošnje.`,
        potentialSavings: '15-20% mjesečno',
      });
    }
  }

  // Preporuka 2: Top potrošači
  if (patterns.topConsumers && patterns.topConsumers.length > 0) {
    const topDevice = patterns.topConsumers[0];
    if (topDevice.total > 10.0) {
      recommendations.push({
        priority: 'high',
        icon: '🔥',
        title: `Optimizirajte korištenje uređaja: ${topDevice.naziv}`,
        description: `${topDevice.naziv} je najveći potrošač energije (${topDevice.total} kWh). Razmislite o energetski učinkovitijem uređaju ili smanjenju vremena korištenja.`,
        potentialSavings: '10-15% mjesečno',
      });
    }
  }

  // Preporuka 3: Neobični skokovi
  if (patterns.unusualSpikes && patterns.unusualSpikes.length > 0) {
    recommendations.push({
      priority: 'medium',
      icon: '⚠️',
      title: 'Otkriveni neobični skokovi potrošnje',
      description: `Zabilježili smo ${patterns.unusualSpikes.length} neobično visoku potrošnju. Provjerite postoje li uređaji koji rade nepotrebno ili su neispravni.`,
      potentialSavings: '5-10% mjesečno',
    });
  }

  // Preporuka 4: Balansiranje po danima
  if (patterns.weekdayPatterns && patterns.weekdayPatterns.length > 0) {
    const sorted = [...patterns.weekdayPatterns].sort((a, b) => b.consumption - a.consumption);
    const highestDay = sorted[0];
    const lowestDay = sorted[sorted.length - 1];

    if (highestDay.consumption > lowestDay.consumption * 2) {
      recommendations.push({
        priority: 'medium',
        icon: '📅',
        title: 'Balansirajte potrošnju kroz tjedan',
        description: `${highestDay.day} trošite dvostruko više nego ${lowestDay.day}. Pokušajte rasporediti aktivnosti ravnomjernije.`,
        potentialSavings: '5-8% mjesečno',
      });
    }
  }

  // Preporuka 5: Opći savjeti
  if (patterns.summary && patterns.summary.totalConsumption > 50) {
    recommendations.push({
      priority: 'low',
      icon: '💡',
      title: 'Smanjite stand-by potrošnju',
      description: 'Isključite uređaje koji nisu u uporabi umjesto da ih ostavljate u stand-by načinu rada. To može uštedjeti do 10% energije.',
      potentialSavings: '8-10% mjesečno',
    });
  }

  return {
    recommendations,
    analyzedPeriod: '30 dana',
    generatedAt: new Date(),
  };
}

/**
 * Uspoređuje potrošnju s prošlim razdobljem
 */
export async function compareWithPreviousPeriod(korisnikId, kucanstvoId, danaUnazad = 30) {
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

  const currentEnd = new Date();
  const currentStart = new Date();
  currentStart.setDate(currentStart.getDate() - danaUnazad);

  const previousEnd = new Date(currentStart);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - danaUnazad);

  // Dohvati podatke za trenutno razdoblje
  const [currentData] = await db.query(
    `SELECT
      u.uredjaj_id,
      MIN(m.vrijednost_kwh) as min_value,
      MAX(m.vrijednost_kwh) as max_value,
      MAX(m.vrijednost_kwh) - MIN(m.vrijednost_kwh) as consumption
     FROM mjerenje m
     JOIN uredjaj u ON m.uredjaj_id = u.uredjaj_id
     JOIN prostorija p ON u.prostorija_id = p.prostorija_id
     WHERE p.kucanstvo_id = ? AND m.datum_vrijeme >= ? AND m.datum_vrijeme <= ? AND m.validno = 1
     GROUP BY u.uredjaj_id`,
    [kucanstvoId, currentStart, currentEnd]
  );

  // Dohvati podatke za prošlo razdoblje
  const [previousData] = await db.query(
    `SELECT
      u.uredjaj_id,
      MIN(m.vrijednost_kwh) as min_value,
      MAX(m.vrijednost_kwh) as max_value,
      MAX(m.vrijednost_kwh) - MIN(m.vrijednost_kwh) as consumption
     FROM mjerenje m
     JOIN uredjaj u ON m.uredjaj_id = u.uredjaj_id
     JOIN prostorija p ON u.prostorija_id = p.prostorija_id
     WHERE p.kucanstvo_id = ? AND m.datum_vrijeme >= ? AND m.datum_vrijeme <= ? AND m.validno = 1
     GROUP BY u.uredjaj_id`,
    [kucanstvoId, previousStart, previousEnd]
  );

  const currentTotal = currentData.reduce((sum, d) => sum + (parseFloat(d.consumption) || 0), 0);
  const previousTotal = previousData.reduce((sum, d) => sum + (parseFloat(d.consumption) || 0), 0);

  let percentage = 0;
  let trend = 'stabilno';

  if (previousTotal > 0) {
    percentage = ((currentTotal - previousTotal) / previousTotal) * 100;

    if (percentage > 5) {
      trend = 'gore';
    } else if (percentage < -5) {
      trend = 'dolje';
    }
  }

  return {
    currentPeriod: {
      start: currentStart,
      end: currentEnd,
      total: parseFloat(currentTotal.toFixed(2)),
      days: danaUnazad,
    },
    previousPeriod: {
      start: previousStart,
      end: previousEnd,
      total: parseFloat(previousTotal.toFixed(2)),
      days: danaUnazad,
    },
    change: {
      percentage: parseFloat(percentage.toFixed(1)),
      trend,
      absolute: parseFloat((currentTotal - previousTotal).toFixed(2)),
    },
  };
}
