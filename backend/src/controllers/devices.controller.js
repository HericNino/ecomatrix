import * as svc from '../services/devices.service.js';

const DOZVOLJENI_TIPOVI_UREDJAJA = [
  'hladnjak',
  'zamrzivac',
  'pecnica',
  'mikrovalna',
  'perilica_rublja',
  'perilica_posudja',
  'klima',
  'grijanje',
  'tv',
  'racunalo',
  'rasvjeta',
  'bojler',
  'ostalo'
];

export async function listDevicesForHousehold(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);

    const devices = await svc.listDevicesForHousehold(korisnikId, kucanstvoId);

    res.json(devices);
  } catch (error) {
    next(error);
  }
}

export async function createDeviceForHousehold(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);
    const {
      prostorija_id,
      naziv,
      tip_uredjaja,
      proizvodjac,
      model,
      nominalna_snaga,
      datum_kupnje
    } = req.body;

    if (!prostorija_id || !naziv || !tip_uredjaja) {
      return res.status(400).json({
        message: 'prostorija_id, naziv i tip_uredjaja su obavezni.'
      });
    }

    if (!DOZVOLJENI_TIPOVI_UREDJAJA.includes(tip_uredjaja)) {
      return res.status(400).json({
        message: 'Neispravan tip uređaja.',
        dozvoljeni_tipovi: DOZVOLJENI_TIPOVI_UREDJAJA
      });
    }

    const device = await svc.createDeviceForHousehold(korisnikId, kucanstvoId, {
      prostorija_id,
      naziv,
      tip_uredjaja,
      proizvodjac,
      model,
      nominalna_snaga,
      datum_kupnje
    });

    res.status(201).json(device);
  } catch (error) {
    next(error);
  }
}

export async function getDeviceById(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const uredjajId = Number(req.params.deviceId);

    const device = await svc.getDeviceById(korisnikId, uredjajId);

    res.json(device);
  } catch (error) {
    next(error);
  }
}

export async function getPlugForDevice(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const uredjajId = Number(req.params.deviceId);

    const plug = await svc.getPlugForDevice(korisnikId, uredjajId);

    res.json(plug);
  } catch (error) {
    next(error);
  }
}

export async function attachPlugToDevice(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const uredjajId = Number(req.params.deviceId);
    const { serijski_broj, proizvodjac, model, ip_adresa } = req.body;

    if (!serijski_broj) {
      return res.status(400).json({
        message: 'serijski_broj je obavezan.'
      });
    }

    const plug = await svc.attachPlugToDevice(korisnikId, uredjajId, {
      serijski_broj,
      proizvodjac,
      model,
      ip_adresa
    });

    res.status(201).json(plug);
  } catch (error) {
    next(error);
  }
}

export async function updatePlugForDevice(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const uredjajId = Number(req.params.deviceId);
    const { ip_adresa, proizvodjac, model, status } = req.body;

    const plug = await svc.updatePlugForDevice(korisnikId, uredjajId, {
      ip_adresa,
      proizvodjac,
      model,
      status
    });

    res.json(plug);
  } catch (error) {
    next(error);
  }
}
