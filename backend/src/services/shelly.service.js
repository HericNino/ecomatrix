/**
 * Shelly Plug S Gen3 API Integration Service
 *
 * Ovaj servis omogućava komunikaciju sa Shelly Plug S Gen3 uređajima
 * koristeći njihov RPC API (Gen2/Gen3).
 *
 * API Dokumentacija: https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen3/ShellyPlugSG3/
 */

import * as logger from './logger.service.js';

// Konstante za retry logiku
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // ms
const BACKOFF_MULTIPLIER = 2;

/**
 * Error tipovi za kategorizaciju grešaka
 */
export const ErrorType = {
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  INVALID_RESPONSE: 'invalid_response',
  DEVICE_OFFLINE: 'device_offline',
  PARSE_ERROR: 'parse_error',
  UNKNOWN: 'unknown'
};

/**
 * Klasifikuje grešku u odgovarajući tip
 * Exported for testing
 */
export function classifyError(error) {
  if (error.name === 'AbortError') {
    return ErrorType.TIMEOUT;
  }
  if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
    return ErrorType.NETWORK;
  }
  if (error.message.includes('HTTP error')) {
    return ErrorType.INVALID_RESPONSE;
  }
  if (error.message.includes('parse') || error.message.includes('JSON')) {
    return ErrorType.PARSE_ERROR;
  }
  return ErrorType.UNKNOWN;
}

/**
 * Čeka određeno vrijeme (helper za retry logiku)
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrapper funkcija s retry logikom i exponential backoff
 */
async function retryWithBackoff(fn, deviceIp, maxRetries = DEFAULT_MAX_RETRIES, retryDelay = DEFAULT_RETRY_DELAY) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();

      // Ako je retry bio uspješan (attempt > 0), logiraj to
      if (attempt > 0) {
        logger.logShellyRetrySuccess(deviceIp, attempt);
      }

      return result;
    } catch (error) {
      lastError = error;
      const errorType = classifyError(error);

      // Logiraj pokušaj
      logger.logShellyConnectionError(deviceIp, error, attempt);

      // Ako je ovo zadnji pokušaj, baci error
      if (attempt === maxRetries) {
        break;
      }

      // Za timeout i network errore, pokušaj ponovo
      // Za invalid response ili parse errore, ne pokušavaj ponovo
      if (errorType === ErrorType.INVALID_RESPONSE || errorType === ErrorType.PARSE_ERROR) {
        break;
      }

      // Izračunaj delay s exponential backoff
      const currentDelay = retryDelay * Math.pow(BACKOFF_MULTIPLIER, attempt);
      logger.logDebug(`Retrying in ${currentDelay}ms...`, { deviceIp, attempt, maxRetries });
      await delay(currentDelay);
    }
  }

  // Ako smo stigli ovdje, sve pokušaje smo potrošili
  const errorType = classifyError(lastError);
  const enhancedError = new Error(lastError.message);
  enhancedError.type = errorType;
  enhancedError.originalError = lastError;
  enhancedError.deviceIp = deviceIp;

  throw enhancedError;
}

/**
 * Dohvaća puni status Shelly uređaja uključujući power meter i switch podatke
 * @param {string} deviceIp - IP adresa Shelly uređaja (npr. "192.168.1.100")
 * @param {number} timeout - Timeout u ms (default: 5000)
 * @param {boolean} useRetry - Koristi retry logiku (default: true)
 * @returns {Promise<Object>} - Puni status uređaja
 */
export async function getShellyStatus(deviceIp, timeout = 5000, useRetry = true) {
  const url = `http://${deviceIp}/rpc/Shelly.GetStatus`;

  const fetchFn = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      logger.logShellyTimeout(deviceIp, timeout);
    }, timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Timeout: Uređaj na ${deviceIp} ne odgovara nakon ${timeout}ms.`);
      }
      throw new Error(`Greška pri komunikaciji sa ${deviceIp}: ${error.message}`);
    }
  };

  // Ako je retry omogućen, koristi retry logiku
  if (useRetry) {
    return retryWithBackoff(fetchFn, deviceIp);
  }

  // Inače, izvrši bez retrya
  return fetchFn();
}

/**
 * Dohvaća samo power meter podatke (PM1 komponenta)
 * @param {string} deviceIp - IP adresa Shelly uređaja
 * @param {number} pmId - ID power meter komponente (obično 0)
 * @returns {Promise<Object>} - Power meter podaci
 */
export async function getPowerMeterData(deviceIp, pmId = 0) {
  const url = `http://${deviceIp}/rpc/PM1.GetStatus?id=${pmId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(`Greška pri dohvaćanju PM podataka: ${error.message}`);
  }
}

/**
 * Dohvaća status switch komponente
 * @param {string} deviceIp - IP adresa Shelly uređaja
 * @param {number} switchId - ID switch komponente (obično 0)
 * @returns {Promise<Object>} - Switch status
 */
export async function getSwitchStatus(deviceIp, switchId = 0) {
  const url = `http://${deviceIp}/rpc/Switch.GetStatus?id=${switchId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(`Greška pri dohvaćanju switch statusa: ${error.message}`);
  }
}

/**
 * Kontrolira switch (uključuje/isključuje uređaj)
 * @param {string} deviceIp - IP adresa Shelly uređaja
 * @param {boolean} on - true za uključivanje, false za isključivanje
 * @param {number} switchId - ID switch komponente (obično 0)
 * @returns {Promise<Object>} - Rezultat operacije
 */
export async function setSwitchState(deviceIp, on, switchId = 0) {
  const url = `http://${deviceIp}/rpc/Switch.Set?id=${switchId}&on=${on}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(`Greška pri postavljanju switch stanja: ${error.message}`);
  }
}

/**
 * Parsira power meter podatke iz Shelly.GetStatus odgovora
 * @param {Object} statusData - Podaci iz Shelly.GetStatus
 * @returns {Object} - Parsed power meter podaci
 */
export function parsePowerMeterFromStatus(statusData) {
  // Shelly Plug S Gen3 koristi switch:0 koji sadrži power meter podatke
  // Shelly PM Mini koristi pm1:0
  const pm = statusData['pm1:0'] || statusData['switch:0'];

  if (!pm) {
    throw new Error('Power meter podaci nisu dostupni u statusu.');
  }

  return {
    voltage: pm.voltage,           // Napon u V
    current: pm.current,           // Struja u A
    power: pm.apower,              // Aktivna snaga u W
    frequency: pm.freq,            // Frekvencija u Hz
    totalEnergy: pm.aenergy.total, // Ukupna energija u Wh
    energyByMinute: pm.aenergy.by_minute, // Energija po minutama
    timestamp: pm.aenergy.minute_ts // Unix timestamp
  };
}

/**
 * Parsira switch podatke iz Shelly.GetStatus odgovora
 * @param {Object} statusData - Podaci iz Shelly.GetStatus
 * @returns {Object} - Parsed switch podaci
 */
export function parseSwitchFromStatus(statusData) {
  const sw = statusData['switch:0'];

  if (!sw) {
    throw new Error('Switch podaci nisu dostupni u statusu.');
  }

  return {
    id: sw.id,
    output: sw.output,           // Da li je uključeno (true/false)
    temperature: sw.temperature?.tC || null // Temperatura u °C
  };
}

/**
 * Testira konekciju sa Shelly uređajem
 * @param {string} deviceIp - IP adresa Shelly uređaja
 * @returns {Promise<boolean>} - true ako je uređaj dostupan
 */
export async function testShellyConnection(deviceIp) {
  try {
    await getShellyStatus(deviceIp, 3000);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Dohvaća trenutnu potrošnju energije u kWh
 * Ovo je glavna funkcija koja se koristi za prikupljanje podataka
 * @param {string} deviceIp - IP adresa Shelly uređaja
 * @param {boolean} useRetry - Koristi retry logiku (default: true)
 * @returns {Promise<Object>} - Trenutna potrošnja i ostali podaci
 */
export async function getCurrentEnergyConsumption(deviceIp, useRetry = true) {
  try {
    const status = await getShellyStatus(deviceIp, 5000, useRetry);
    const pmData = parsePowerMeterFromStatus(status);
    const swData = parseSwitchFromStatus(status);

    const result = {
      // Potrošnja u kWh (API vraća Wh, pa pretvaramo)
      energyKwh: pmData.totalEnergy / 1000,
      // Trenutna snaga u W
      currentPower: pmData.power,
      // Napon u V
      voltage: pmData.voltage,
      // Struja u A
      current: pmData.current,
      // Frekvencija u Hz
      frequency: pmData.frequency,
      // Da li je uređaj uključen
      isOn: swData.output,
      // Temperatura uređaja
      temperature: swData.temperature,
      // Timestamp
      timestamp: new Date(pmData.timestamp * 1000)
    };

    logger.logDebug('Energy consumption fetched successfully', {
      deviceIp,
      energyKwh: result.energyKwh,
      currentPower: result.currentPower
    });

    return result;
  } catch (error) {
    // Ako error ima tip property (iz retryWithBackoff), dodaj ga u poruku
    const errorType = error.type || classifyError(error);
    const enhancedError = new Error(`Greška pri dohvaćanju potrošnje: ${error.message}`);
    enhancedError.type = errorType;
    enhancedError.deviceIp = deviceIp;
    enhancedError.originalError = error.originalError || error;

    logger.logError('Failed to fetch energy consumption', enhancedError, {
      deviceIp,
      errorType
    });

    throw enhancedError;
  }
}
