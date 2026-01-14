/**
 * Scheduler Service
 *
 * Servis za automatsko prikupljanje podataka sa Shelly uređaja
 * Koristi cron job za periodično izvršavanje zadataka
 */

import cron from 'node-cron';
import { getDb } from '../config/db.js';
import * as shellyService from './shelly.service.js';
import * as measurementsService from './measurements.service.js';
import * as logger from './logger.service.js';
import * as notificationService from './notification.service.js';

let collectionJob = null;
let collectionStats = {
  totalRuns: 0,
  totalSuccess: 0,
  totalErrors: 0,
  lastRun: null,
  lastRunDuration: 0
};

/**
 * Prikuplja podatke sa svih aktivnih Shelly uređaja u sustavu
 */
async function collectDataFromAllActiveDevices() {
  const db = getDb();
  const startTime = Date.now();

  try {
    // Dohvati sve aktivne uređaje i uređaje s kvarom (pokušaj ih reconnect-ati)
    const [devices] = await db.query(
      `SELECT
        u.uredjaj_id,
        u.naziv AS uredjaj_naziv,
        pu.utikac_id,
        pu.ip_adresa,
        pu.serijski_broj,
        pu.status,
        k.kucanstvo_id,
        k.naziv AS kucanstvo_naziv,
        k.korisnik_id
      FROM uredjaj u
      JOIN pametni_utikac pu ON u.uredjaj_id = pu.uredjaj_id
      JOIN prostorija p ON u.prostorija_id = p.prostorija_id
      JOIN kucanstvo k ON p.kucanstvo_id = k.kucanstvo_id
      WHERE pu.status IN ('aktivan', 'kvar') AND pu.ip_adresa IS NOT NULL`
    );

    if (devices.length === 0) {
      logger.logInfo('No active devices with configured IP address found');
      return;
    }

    logger.logDataCollectionStart(devices.length);

    let successCount = 0;
    let errorCount = 0;
    const errorsByType = {};

    // Prikupi podatke sa svakog uređaja
    for (const device of devices) {
      try {
        // Dohvati podatke sa Shelly uređaja (s retry logikom)
        const energyData = await shellyService.getCurrentEnergyConsumption(device.ip_adresa, true);

        // Spremi mjerenje u bazu
        await measurementsService.saveMeasurement(
          device.uredjaj_id,
          device.utikac_id,
          energyData.energyKwh,
          energyData.timestamp,
          'automatsko'
        );

        // Ako je uređaj bio označen kao kvar, vrati ga na aktivan
        if (device.status === 'kvar') {
          await db.query(
            `UPDATE pametni_utikac SET status = 'aktivan' WHERE utikac_id = ?`,
            [device.utikac_id]
          );
          logger.logInfo(`Device status restored to active after successful collection`, {
            deviceId: device.uredjaj_id,
            deviceName: device.uredjaj_naziv
          });
        }

        // Check for high power consumption (over 3000W = 3kW is considered high)
        const HIGH_POWER_THRESHOLD = 3000; // Watts
        if (energyData.currentPower > HIGH_POWER_THRESHOLD) {
          notificationService.notifyHighConsumption(
            device.korisnik_id,
            device.kucanstvo_id,
            device.uredjaj_id,
            device.uredjaj_naziv,
            energyData.currentPower,
            HIGH_POWER_THRESHOLD
          ).catch(err => logger.logError('Failed to create high consumption notification', err));
        }

        successCount++;
        logger.logDataCollectionSuccess(
          device.uredjaj_id,
          device.uredjaj_naziv,
          energyData.energyKwh
        );
      } catch (error) {
        errorCount++;
        const errorType = error.type || shellyService.ErrorType.UNKNOWN;

        // Broji errore po tipu
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;

        logger.logDataCollectionError(
          device.uredjaj_id,
          device.uredjaj_naziv,
          error,
          errorType
        );

        // Pametno handlanje grešaka - ne označi odmah kao neaktivno
        // Samo za perzistentne network/timeout errore nakon retry logike
        if (errorType === shellyService.ErrorType.TIMEOUT || errorType === shellyService.ErrorType.NETWORK) {
          // Provjeri koliko puta je device failao zaredom
          const [failCount] = await db.query(
            `SELECT COUNT(*) as fails
             FROM mjerenje
             WHERE uredjaj_id = ? AND validno = 0
               AND datum_vrijeme > DATE_SUB(NOW(), INTERVAL 30 MINUTE)`,
            [device.uredjaj_id]
          );

          // Ako je failao više od 3 puta u zadnjih 30 minuta, označi kao neaktivan
          if (failCount[0].fails >= 3) {
            await db.query(
              `UPDATE pametni_utikac SET status = 'kvar' WHERE utikac_id = ?`,
              [device.utikac_id]
            );
            logger.logWarn(`Device marked as faulty after repeated failures`, {
              deviceId: device.uredjaj_id,
              deviceName: device.uredjaj_naziv,
              failCount: failCount[0].fails
            });

            // Create device failure notification
            notificationService.notifyDeviceFailure(
              device.korisnik_id,
              device.kucanstvo_id,
              device.uredjaj_id,
              device.uredjaj_naziv,
              `Uređaj je označen kao neispravan nakon ${failCount[0].fails} uzastopnih neuspjelih pokušaja prikupljanja podataka.`
            ).catch(err => logger.logError('Failed to create device failure notification', err));
          } else {
            // Spremi nevalidno mjerenje za tracking
            await db.query(
              `INSERT INTO mjerenje (uredjaj_id, utikac_id, vrijednost_kwh, datum_vrijeme, tip_mjerenja, validno)
               VALUES (?, ?, 0, NOW(), 'automatsko', 0)`,
              [device.uredjaj_id, device.utikac_id]
            );
          }
        }
      }
    }

    const totalTime = Date.now() - startTime;

    // Update statistika
    collectionStats.totalRuns++;
    collectionStats.totalSuccess += successCount;
    collectionStats.totalErrors += errorCount;
    collectionStats.lastRun = new Date();
    collectionStats.lastRunDuration = totalTime;

    logger.logDataCollectionComplete(successCount, errorCount, totalTime);

    // Log error breakdown if there were errors
    if (errorCount > 0) {
      logger.logInfo('Error breakdown by type:', errorsByType);
    }
  } catch (error) {
    logger.logError('Critical error during data collection', error);
  }
}

/**
 * Pokreće automatsko prikupljanje podataka
 * @param {string} schedule - Cron izraz (default: svake minute)
 * @returns {boolean} - true ako je uspješno pokrenuto
 */
export function startDataCollection(schedule = '*/5 * * * *') {
  if (collectionJob) {
    logger.logWarn('Data collection is already running');
    return false;
  }

  // Validiraj cron izraz
  if (!cron.validate(schedule)) {
    const error = new Error(`Invalid cron expression: ${schedule}`);
    logger.logError('Failed to start data collection', error);
    throw error;
  }

  // Kreiraj cron job
  collectionJob = cron.schedule(schedule, async () => {
    await collectDataFromAllActiveDevices();
  });

  logger.logInfo(`Data collection scheduler started with schedule: ${schedule}`);
  return true;
}

/**
 * Zaustavlja automatsko prikupljanje podataka
 * @returns {boolean} - true ako je uspješno zaustavljeno
 */
export function stopDataCollection() {
  if (!collectionJob) {
    logger.logWarn('Data collection is not running');
    return false;
  }

  collectionJob.stop();
  collectionJob = null;

  logger.logInfo('Data collection scheduler stopped');
  return true;
}

/**
 * Provjerava da li je automatsko prikupljanje pokrenuto
 * @returns {boolean} - true ako je pokrenuto
 */
export function isRunning() {
  return collectionJob !== null;
}

/**
 * Ručno pokreće prikupljanje podataka (jednokratno)
 */
export async function triggerManualCollection() {
  logger.logInfo('Manual data collection triggered');
  await collectDataFromAllActiveDevices();
}

/**
 * Dohvaća statistiku prikupljanja podataka
 * @returns {Object} - Statistika
 */
export function getCollectionStats() {
  return {
    ...collectionStats,
    isRunning: isRunning(),
    successRate: collectionStats.totalRuns > 0
      ? ((collectionStats.totalSuccess / (collectionStats.totalSuccess + collectionStats.totalErrors)) * 100).toFixed(2) + '%'
      : 'N/A'
  };
}

/**
 * Resetuje statistiku prikupljanja
 */
export function resetCollectionStats() {
  collectionStats = {
    totalRuns: 0,
    totalSuccess: 0,
    totalErrors: 0,
    lastRun: null,
    lastRunDuration: 0
  };
  logger.logInfo('Collection statistics reset');
}

/**
 * Primjeri cron schedule izraza:
 *
 * '* * * * *'      - Svake minute
 * '*\/5 * * * *'   - Svakih 5 minuta
 * '*\/15 * * * *'  - Svakih 15 minuta
 * '0 * * * *'      - Svaki sat (na početku sata)
 * '0 0 * * *'      - Svaki dan u ponoć
 * '0 *\/4 * * *'   - Svaka 4 sata
 * '0 8,12,18 * * *' - U 8:00, 12:00 i 18:00
 */
