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

let collectionJob = null;

/**
 * Prikuplja podatke sa svih aktivnih Shelly uređaja u sustavu
 */
async function collectDataFromAllActiveDevices() {
  const db = getDb();

  try {
    console.log(`[${new Date().toISOString()}] Započinjem prikupljanje podataka...`);

    // Dohvati sve aktivne uređaje sa pametnim utičnicama koje imaju IP adresu
    const [devices] = await db.query(
      `SELECT
        u.uredjaj_id,
        u.naziv AS uredjaj_naziv,
        pu.utikac_id,
        pu.ip_adresa,
        pu.serijski_broj,
        k.kucanstvo_id,
        k.naziv AS kucanstvo_naziv
      FROM uredjaj u
      JOIN pametni_utikac pu ON u.uredjaj_id = pu.uredjaj_id
      JOIN prostorija p ON u.prostorija_id = p.prostorija_id
      JOIN kucanstvo k ON p.kucanstvo_id = k.kucanstvo_id
      WHERE pu.status = 'aktivan' AND pu.ip_adresa IS NOT NULL`
    );

    if (devices.length === 0) {
      console.log('Nema aktivnih uređaja sa konfiguriranom IP adresom.');
      return;
    }

    console.log(`Pronađeno ${devices.length} aktivnih uređaja.`);

    let successCount = 0;
    let errorCount = 0;

    // Prikupi podatke sa svakog uređaja
    for (const device of devices) {
      try {
        // Dohvati podatke sa Shelly uređaja
        const energyData = await shellyService.getCurrentEnergyConsumption(device.ip_adresa);

        // Spremi mjerenje u bazu
        await measurementsService.saveMeasurement(
          device.uredjaj_id,
          device.utikac_id,
          energyData.energyKwh,
          energyData.timestamp,
          'automatsko'
        );

        successCount++;
        console.log(`✓ ${device.uredjaj_naziv} (${device.kucanstvo_naziv}): ${energyData.energyKwh} kWh`);
      } catch (error) {
        errorCount++;
        console.error(`✗ ${device.uredjaj_naziv} (${device.kucanstvo_naziv}): ${error.message}`);

        // Označi utičnicu kao neaktivnu ako je problem u komunikaciji
        if (error.message.includes('Timeout') || error.message.includes('komunikaciji')) {
          await db.query(
            `UPDATE pametni_utikac SET status = 'neaktivan' WHERE utikac_id = ?`,
            [device.utikac_id]
          );
          console.log(`  → Utičnica označena kao neaktivna.`);
        }
      }
    }

    console.log(`[${new Date().toISOString()}] Prikupljanje završeno: ${successCount} uspješno, ${errorCount} greške.`);
  } catch (error) {
    console.error('Kritična greška pri prikupljanju podataka:', error);
  }
}

/**
 * Pokreće automatsko prikupljanje podataka
 * @param {string} schedule - Cron izraz (default: svake minute)
 * @returns {boolean} - true ako je uspješno pokrenuto
 */
export function startDataCollection(schedule = '*/5 * * * *') {
  if (collectionJob) {
    console.warn('Automatsko prikupljanje podataka je već pokrenuto.');
    return false;
  }

  // Validiraj cron izraz
  if (!cron.validate(schedule)) {
    throw new Error(`Neispravan cron izraz: ${schedule}`);
  }

  // Kreiraj cron job
  collectionJob = cron.schedule(schedule, async () => {
    await collectDataFromAllActiveDevices();
  });

  console.log(`[Scheduler] Automatsko prikupljanje pokrenuto (schedule: ${schedule})`);
  return true;
}

/**
 * Zaustavlja automatsko prikupljanje podataka
 * @returns {boolean} - true ako je uspješno zaustavljeno
 */
export function stopDataCollection() {
  if (!collectionJob) {
    console.warn('Automatsko prikupljanje podataka nije pokrenuto.');
    return false;
  }

  collectionJob.stop();
  collectionJob = null;

  console.log('[Scheduler] Automatsko prikupljanje zaustavljeno.');
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
  console.log('[Scheduler] Ručno pokrenuto prikupljanje podataka.');
  await collectDataFromAllActiveDevices();
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
