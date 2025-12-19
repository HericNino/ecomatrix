/**
 * Shelly Plug S Gen3 API Integration Service
 *
 * Ovaj servis omogućava komunikaciju sa Shelly Plug S Gen3 uređajima
 * koristeći njihov RPC API (Gen2/Gen3).
 *
 * API Dokumentacija: https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen3/ShellyPlugSG3/
 */

/**
 * Dohvaća puni status Shelly uređaja uključujući power meter i switch podatke
 * @param {string} deviceIp - IP adresa Shelly uređaja (npr. "192.168.1.100")
 * @param {number} timeout - Timeout u ms (default: 5000)
 * @returns {Promise<Object>} - Puni status uređaja
 */
export async function getShellyStatus(deviceIp, timeout = 5000) {
  const url = `http://${deviceIp}/rpc/Shelly.GetStatus`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

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
    if (error.name === 'AbortError') {
      throw new Error(`Timeout: Uređaj na ${deviceIp} ne odgovara.`);
    }
    throw new Error(`Greška pri komunikaciji sa ${deviceIp}: ${error.message}`);
  }
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
 * @returns {Promise<Object>} - Trenutna potrošnja i ostali podaci
 */
export async function getCurrentEnergyConsumption(deviceIp) {
  try {
    const status = await getShellyStatus(deviceIp);
    const pmData = parsePowerMeterFromStatus(status);
    const swData = parseSwitchFromStatus(status);

    return {
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
  } catch (error) {
    throw new Error(`Greška pri dohvaćanju potrošnje: ${error.message}`);
  }
}
