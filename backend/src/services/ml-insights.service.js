/**
 * ML-Enhanced Insights Service
 *
 * Napredni servis za generiranje preporuka baziranih na machine learning
 * i statističkoj analizi podataka o potrošnji energije
 */

import { getDb } from '../config/db.js';
import * as stats from 'simple-statistics';
import * as logger from './logger.service.js';

/**
 * Detektira anomalije u potrošnji koristeći z-score metodu
 */
export function detectAnomalies(consumptionData, threshold = 2.5) {
  if (consumptionData.length < 3) return [];

  const values = consumptionData.map(d => d.potrosnja_kwh);
  const mean = stats.mean(values);
  const stdDev = stats.standardDeviation(values);

  // Guard against zero or near-zero standard deviation (uniform data)
  if (stdDev < 0.01) {
    return []; // No anomalies in uniform data
  }

  const anomalies = [];
  consumptionData.forEach((data, idx) => {
    const zScore = Math.abs((data.potrosnja_kwh - mean) / stdDev);
    if (zScore > threshold) {
      anomalies.push({
        ...data,
        zScore: zScore.toFixed(2),
        deviation: ((data.potrosnja_kwh - mean) / mean * 100).toFixed(1)
      });
    }
  });

  return anomalies;
}

/**
 * Predviđa buduću potrošnju koristeći linear regression
 */
export function predictFutureConsumption(historicalData, daysAhead = 7) {
  if (historicalData.length < 7) {
    return null;
  }

  // Pripremi podatke za regression
  const dataPoints = historicalData.map((d, idx) => [idx, d.potrosnja_kwh]);

  // Linear regression
  const regression = stats.linearRegression(dataPoints);
  const line = stats.linearRegressionLine(regression);

  // Predvidi sljedećih N dana
  const predictions = [];
  const lastIdx = historicalData.length - 1;

  for (let i = 1; i <= daysAhead; i++) {
    predictions.push({
      day: i,
      predicted_kwh: Math.max(0, line(lastIdx + i)).toFixed(2)
    });
  }

  // Izračunaj trend
  const slope = regression.m;
  let trend = 'stable';
  if (slope > 0.1) trend = 'increasing';
  else if (slope < -0.1) trend = 'decreasing';

  return {
    predictions,
    trend,
    slope: slope.toFixed(4),
    confidence: calculateConfidence(historicalData, line)
  };
}

/**
 * Izračunava confidence za prediction model
 */
function calculateConfidence(actualData, predictionLine) {
  try {
    // Prepare data as [x, y] pairs for rSquared calculation
    const dataPoints = actualData.map((d, idx) => [idx, d.potrosnja_kwh]);

    const rSquared = stats.rSquared(dataPoints, predictionLine);

    if (rSquared > 0.8) return 'high';
    if (rSquared > 0.6) return 'medium';
    return 'low';
  } catch (error) {
    // If rSquared calculation fails (degenerate regression, etc.), default to low confidence
    return 'low';
  }
}

/**
 * Identifikuje optimalno vrijeme za korištenje uređaja
 */
export function identifyOptimalUsageTimes(hourlyData) {
  if (hourlyData.length === 0) return null;

  // Grupiranje po satima
  const hourlyConsumption = {};
  hourlyData.forEach(d => {
    const hour = new Date(d.datum_vrijeme).getHours();
    if (!hourlyConsumption[hour]) {
      hourlyConsumption[hour] = [];
    }
    hourlyConsumption[hour].push(d.potrosnja_kwh);
  });

  // Izračunaj prosjek za svaki sat
  const hourlyAvg = {};
  Object.keys(hourlyConsumption).forEach(hour => {
    hourlyAvg[hour] = stats.mean(hourlyConsumption[hour]);
  });

  // Sortiraj sate po potrošnji
  const sortedHours = Object.entries(hourlyAvg)
    .sort((a, b) => a[1] - b[1])
    .map(([hour, avg]) => ({
      hour: parseInt(hour),
      avg_consumption: parseFloat(avg.toFixed(2))
    }));

  return {
    lowestConsumptionHours: sortedHours.slice(0, 5),
    highestConsumptionHours: sortedHours.slice(-5).reverse(),
    recommendation: `Najniža potrošnja: ${sortedHours[0].hour}:00-${sortedHours[0].hour + 1}:00`
  };
}

/**
 * Klasteri uređaje po potrošnji i patternima korištenja
 */
export function clusterDevicesByUsage(deviceData) {
  if (deviceData.length === 0) return null;

  // Kategoriziraj uređaje
  const categories = {
    high_consumption: [],      // > 75th percentile
    medium_consumption: [],     // 25th - 75th percentile
    low_consumption: [],        // < 25th percentile
    high_frequency: [],         // Često korišteni
    vampire_devices: []         // Uvijek uključeni s malom potrošnjom
  };

  const consumptions = deviceData.map(d => d.total_consumption);
  const q1 = stats.quantile(consumptions, 0.25);
  const q3 = stats.quantile(consumptions, 0.75);

  deviceData.forEach(device => {
    if (device.total_consumption > q3) {
      categories.high_consumption.push(device);
    } else if (device.total_consumption < q1) {
      categories.low_consumption.push(device);
    } else {
      categories.medium_consumption.push(device);
    }

    // Detektiraj vampire devices (mali power ali uvijek ON)
    if (device.avg_power < 50 && device.uptime_percentage > 90) {
      categories.vampire_devices.push(device);
    }
  });

  return categories;
}

/**
 * Generiraj ML-bazirane preporuke
 */
export async function generateMLRecommendations(korisnikId, kucanstvoId, danaUnazad = 30) {
  const db = getDb();

  try {
    logger.logInfo('Generating ML-based recommendations', { korisnikId, kucanstvoId });

    // Provjeri vlasništvo
    const [ownership] = await db.query(
      'SELECT kucanstvo_id FROM kucanstvo WHERE kucanstvo_id = ? AND korisnik_id = ?',
      [kucanstvoId, korisnikId]
    );

    if (ownership.length === 0) {
      throw new Error('Kućanstvo nije pronađeno');
    }

    const datumOd = new Date();
    datumOd.setDate(datumOd.getDate() - danaUnazad);

    // 1. Dohvati dnevnu potrošnju za anomaly detection i prediction
    const [dailyConsumption] = await db.query(
      `SELECT
        datum,
        SUM(daily_delta) as potrosnja_kwh
      FROM (
        SELECT
          DATE(m.datum_vrijeme) as datum,
          u.uredjaj_id,
          MAX(m.vrijednost_kwh) - MIN(m.vrijednost_kwh) as daily_delta
        FROM mjerenje m
        JOIN uredjaj u ON m.uredjaj_id = u.uredjaj_id
        JOIN prostorija p ON u.prostorija_id = p.prostorija_id
        WHERE p.kucanstvo_id = ? AND m.datum_vrijeme >= ? AND m.validno = 1
        GROUP BY DATE(m.datum_vrijeme), u.uredjaj_id
      ) as device_daily
      GROUP BY datum
      ORDER BY datum ASC`,
      [kucanstvoId, datumOd]
    );

    // 2. Dohvati hourly podatke za optimal usage times
    const [hourlyData] = await db.query(
      `SELECT
        m.datum_vrijeme,
        SUM(m.vrijednost_kwh) as potrosnja_kwh
      FROM mjerenje m
      JOIN uredjaj u ON m.uredjaj_id = u.uredjaj_id
      JOIN prostorija p ON u.prostorija_id = p.prostorija_id
      WHERE p.kucanstvo_id = ? AND m.datum_vrijeme >= ? AND m.validno = 1
      GROUP BY m.datum_vrijeme
      ORDER BY m.datum_vrijeme ASC`,
      [kucanstvoId, datumOd]
    );

    // 3. Dohvati device podatke za clustering
    const [deviceStats] = await db.query(
      `SELECT
        u.uredjaj_id,
        u.naziv,
        u.tip_uredjaja,
        SUM(m.vrijednost_kwh) as total_consumption,
        AVG(m.vrijednost_kwh) as avg_power,
        COUNT(m.mjerenje_id) as measurement_count
      FROM mjerenje m
      JOIN uredjaj u ON m.uredjaj_id = u.uredjaj_id
      JOIN prostorija p ON u.prostorija_id = p.prostorija_id
      WHERE p.kucanstvo_id = ? AND m.datum_vrijeme >= ? AND m.validno = 1
      GROUP BY u.uredjaj_id, u.naziv, u.tip_uredjaja`,
      [kucanstvoId, datumOd]
    );

    const recommendations = [];

    // === ANOMALY DETECTION ===
    if (dailyConsumption.length >= 7) {
      const anomalies = detectAnomalies(dailyConsumption.map(d => ({
        datum: d.datum,
        potrosnja_kwh: parseFloat(d.potrosnja_kwh || 0)
      })));

      if (anomalies.length > 0) {
        const avgDeviation = stats.mean(anomalies.map(a => parseFloat(a.deviation)));
        recommendations.push({
          type: 'anomaly',
          priority: 'high',
          icon: '🚨',
          title: 'Detektirane Neobične Potrošnje',
          description: `Pronađeno ${anomalies.length} dana s neobično visokom potrošnjom (prosječno ${avgDeviation.toFixed(1)}% iznad normale). Provjerite uređaje u tim danima.`,
          details: anomalies.slice(0, 3).map(a => `${a.datum}: ${a.potrosnja_kwh} kWh (+${a.deviation}%)`),
          potentialSavings: `${(avgDeviation * 0.5).toFixed(0)}% mjesečno`
        });
      }
    }

    // === PREDICTIVE ANALYTICS ===
    if (dailyConsumption.length >= 14) {
      const prediction = predictFutureConsumption(
        dailyConsumption.map(d => ({
          potrosnja_kwh: parseFloat(d.potrosnja_kwh || 0)
        })),
        7
      );

      if (prediction) {
        const avgPredicted = stats.mean(prediction.predictions.map(p => parseFloat(p.predicted_kwh)));
        const avgActual = stats.mean(dailyConsumption.slice(-7).map(d => parseFloat(d.potrosnja_kwh || 0)));
        const change = ((avgPredicted - avgActual) / avgActual * 100);

        let title = 'Predviđanje Potrošnje';
        let description = '';
        let priority = 'medium';

        if (prediction.trend === 'increasing' && change > 10) {
          title = 'Upozorenje: Rastuća Potrošnja';
          description = `Predviđamo porast potrošnje od ${change.toFixed(1)}% u sljedećih 7 dana. Razmislite o smanjenju korištenja energetski zahtjevnih uređaja.`;
          priority = 'high';
        } else if (prediction.trend === 'decreasing') {
          title = 'Odličan Trend: Opadajuća Potrošnja';
          description = `Vaša potrošnja pada! Predviđamo smanjenje od ${Math.abs(change).toFixed(1)}% u sljedećih 7 dana. Nastavite s dobrim navikama!`;
          priority = 'low';
        } else {
          description = `Potrošnja će ostati stabilna. Prosječna dnevna potrošnja: ${avgPredicted.toFixed(2)} kWh.`;
        }

        recommendations.push({
          type: 'prediction',
          priority,
          icon: prediction.trend === 'increasing' ? '📈' : prediction.trend === 'decreasing' ? '📉' : '➡️',
          title,
          description,
          details: [`Trend: ${prediction.trend}`, `Pouzdanost: ${prediction.confidence}`],
          potentialSavings: prediction.trend === 'increasing' ? '10-15% mjesečno' : null
        });
      }
    }

    // === OPTIMAL USAGE TIMES ===
    if (hourlyData.length >= 24) {
      const optimalTimes = identifyOptimalUsageTimes(hourlyData.map(d => ({
        datum_vrijeme: d.datum_vrijeme,
        potrosnja_kwh: parseFloat(d.potrosnja_kwh || 0)
      })));

      if (optimalTimes) {
        // Samo prikaži preporuku ako ima dovoljno raznolikosti u podacima
        const highestAvg = optimalTimes.highestConsumptionHours[0]?.avg_consumption || 0;
        const lowestAvg = optimalTimes.lowestConsumptionHours[0]?.avg_consumption || 0;
        const difference = highestAvg - lowestAvg;

        // Prikaži samo ako razlika između najviše i najniže je značajna (>20%)
        if (difference > highestAvg * 0.2 && optimalTimes.highestConsumptionHours.length >= 3) {
          const peakHours = optimalTimes.highestConsumptionHours.slice(0, 3).map(h => `${h.hour}:00`).join(', ');
          const offPeakHours = optimalTimes.lowestConsumptionHours.slice(0, 3).map(h => `${h.hour}:00`).join(', ');

          recommendations.push({
            type: 'timing',
            priority: 'medium',
            icon: '⏰',
            title: 'Optimizirajte Vrijeme Korištenja Uređaja',
            description: `Vaša najviša potrošnja je u satima: ${peakHours} (prosječno ${highestAvg.toFixed(2)} kWh/h). Izbjegavajte pokretanje perilice, sušilice i drugih zahtjevnih uređaja u tim satima. Najbolje vrijeme: ${offPeakHours} (prosječno ${lowestAvg.toFixed(2)} kWh/h).`,
            details: [
              `⚠️ Špica: ${peakHours}`,
              `✅ Optimalno: ${offPeakHours}`,
              `Ušteda raspoređivanjem: ~${((difference / highestAvg) * 100).toFixed(0)}%`
            ],
            potentialSavings: '10-15% mjesečno'
          });
        } else {
          // Ako nema dovoljno raznolikosti, daj generičku preporuku
          recommendations.push({
            type: 'timing',
            priority: 'low',
            icon: '⏰',
            title: 'Rasporedite Potrošnju',
            description: `Vaša potrošnja je relativno ujednačena kroz dan. Razmislite o korištenju perilice i sušilice noću ili rano ujutro kada je električna energija najčešće jeftinija.`,
            details: [
              'Noćna tarifa: 22:00 - 06:00',
              'Dnevna tarifa: 06:00 - 22:00'
            ],
            potentialSavings: '5-10% mjesečno'
          });
        }
      }
    }

    // === DEVICE CLUSTERING ===
    if (deviceStats.length > 0) {
      const deviceData = deviceStats.map(d => ({
        naziv: d.naziv,
        tip: d.tip_uredjaja,
        total_consumption: parseFloat(d.total_consumption || 0),
        avg_power: parseFloat(d.avg_power || 0),
        // NOTE: Uptime calculation assumes 5-minute collection intervals (12 per hour)
        // This matches the scheduler.service.js cron pattern: */5 * * * *
        // If collection frequency changes, update this calculation
        uptime_percentage: (parseFloat(d.measurement_count) / (danaUnazad * 24 * 12)) * 100
      }));

      const clusters = clusterDevicesByUsage(deviceData);

      if (clusters) {
        // High consumption devices
        if (clusters.high_consumption.length > 0) {
          const topDevice = clusters.high_consumption[0];
          recommendations.push({
            type: 'device_optimization',
            priority: 'high',
            icon: '🔥',
            title: 'Energetski Zahtjevni Uređaji',
            description: `${clusters.high_consumption.length} uređaja troši većinu energije. Top potrošač: ${topDevice.naziv} (${topDevice.total_consumption.toFixed(2)} kWh).`,
            details: clusters.high_consumption.slice(0, 3).map(d => `${d.naziv}: ${d.total_consumption.toFixed(2)} kWh`),
            potentialSavings: '15-20% mjesečno'
          });
        }

        // Vampire devices
        if (clusters.vampire_devices && clusters.vampire_devices.length > 0) {
          recommendations.push({
            type: 'vampire_devices',
            priority: 'medium',
            icon: '🧛',
            title: 'Detektirani "Vampire" Uređaji',
            description: `${clusters.vampire_devices.length} uređaja troši struju 24/7 čak i kada se ne koriste. Razmislite o pametnim utikačima ili isključivanju.`,
            details: clusters.vampire_devices.map(d => d.naziv),
            potentialSavings: '5-8% mjesečno'
          });
        }
      }
    }

    // === SEASONAL RECOMMENDATION ===
    const currentMonth = new Date().getMonth();
    if (currentMonth >= 5 && currentMonth <= 8) { // Ljeto
      recommendations.push({
        type: 'seasonal',
        priority: 'low',
        icon: '☀️',
        title: 'Ljetni Savjet',
        description: 'Koristite prirodnu ventilaciju umjesto klime kad je moguće. Postavite klimu na 24-25°C umjesto nižih temperatura.',
        potentialSavings: '10-15% mjesečno'
      });
    } else if (currentMonth >= 11 || currentMonth <= 2) { // Zima
      recommendations.push({
        type: 'seasonal',
        priority: 'low',
        icon: '❄️',
        title: 'Zimski Savjet',
        description: 'Izolirajte prozore i vrata. Spustite grijanje za 1°C noću - to može uštedjeti do 10% energije.',
        potentialSavings: '8-12% mjesečno'
      });
    }

    logger.logInfo('ML recommendations generated successfully', {
      korisnikId,
      kucanstvoId,
      recommendationCount: recommendations.length
    });

    return {
      recommendations: recommendations.sort((a, b) => {
        const priority = { high: 3, medium: 2, low: 1 };
        return priority[b.priority] - priority[a.priority];
      }),
      analyzedPeriod: `${danaUnazad} dana`,
      generatedAt: new Date(),
      mlMetrics: {
        anomaliesDetected: dailyConsumption.length >= 7 ? detectAnomalies(dailyConsumption.map(d => ({
          potrosnja_kwh: parseFloat(d.potrosnja_kwh || 0)
        }))).length : 0,
        predictionConfidence: dailyConsumption.length >= 14 ?
          predictFutureConsumption(dailyConsumption.map(d => ({ potrosnja_kwh: parseFloat(d.potrosnja_kwh || 0) })))?.confidence : 'N/A',
        devicesAnalyzed: deviceStats.length
      }
    };

  } catch (error) {
    logger.logError('Failed to generate ML recommendations', error, { korisnikId, kucanstvoId });
    throw error;
  }
}

export default {
  generateMLRecommendations,
  detectAnomalies,
  predictFutureConsumption,
  identifyOptimalUsageTimes,
  clusterDevicesByUsage
};
