import * as svc from '../services/measurements.service.js';

export async function getHouseholdMeasurements(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);
    const { datum_od, datum_do } = req.query;

    const datumOd = datum_od ? new Date(datum_od) : null;
    const datumDo = datum_do ? new Date(datum_do) : null;

    const measurements = await svc.getMeasurementsByHousehold(
      korisnikId,
      kucanstvoId,
      datumOd,
      datumDo
    );

    res.json(measurements);
  } catch (error) {
    next(error);
  }
}

export async function getDeviceMeasurements(req, res, next) {
  try {
    const uredjajId = Number(req.params.deviceId);
    const { datum_od, datum_do, limit } = req.query;

    const datumOd = datum_od ? new Date(datum_od) : null;
    const datumDo = datum_do ? new Date(datum_do) : null;
    const limitNum = limit ? Number(limit) : 100;

    const measurements = await svc.getMeasurementsByDevice(
      uredjajId,
      datumOd,
      datumDo,
      limitNum
    );

    res.json(measurements);
  } catch (error) {
    next(error);
  }
}

export async function collectDeviceData(req, res, next) {
  try {
    const uredjajId = Number(req.params.deviceId);

    const measurement = await svc.collectDataFromDevice(uredjajId);

    res.status(201).json(measurement);
  } catch (error) {
    next(error);
  }
}

export async function collectAllDevicesData(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);

    const result = await svc.collectDataFromAllDevices(korisnikId, kucanstvoId);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getDailyConsumption(req, res, next) {
  try {
    const uredjajId = Number(req.params.deviceId);
    const { datum } = req.query;

    const targetDate = datum ? new Date(datum) : new Date();

    const consumption = await svc.getDailyConsumption(uredjajId, targetDate);

    res.json(consumption);
  } catch (error) {
    next(error);
  }
}

export async function getConsumptionStats(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);
    const { datum_od, datum_do } = req.query;

    if (!datum_od || !datum_do) {
      return res.status(400).json({
        message: 'datum_od i datum_do su obavezni parametri.'
      });
    }

    const datumOd = new Date(datum_od);
    const datumDo = new Date(datum_do);

    const stats = await svc.getConsumptionStats(
      korisnikId,
      kucanstvoId,
      datumOd,
      datumDo
    );

    res.json(stats);
  } catch (error) {
    next(error);
  }
}

export async function addManualMeasurement(req, res, next) {
  try {
    const uredjajId = Number(req.params.deviceId);
    const { vrijednost_kwh, datum_vrijeme } = req.body;

    if (!vrijednost_kwh) {
      return res.status(400).json({
        message: 'vrijednost_kwh je obavezna.'
      });
    }

    const datumVrijeme = datum_vrijeme ? new Date(datum_vrijeme) : new Date();

    const measurement = await svc.saveMeasurement(
      uredjajId,
      null, // utikacId = null za ručna mjerenja
      vrijednost_kwh,
      datumVrijeme,
      'rucno'
    );

    res.status(201).json(measurement);
  } catch (error) {
    next(error);
  }
}
