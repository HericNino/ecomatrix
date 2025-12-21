import * as svc from '../services/households.service.js';

// Dozvoljeni tipovi prostorija
const DOZVOLJENI_TIPOVI_PROSTORIJE = [
  'dnevna_soba',
  'kuhinja',
  'spavaca_soba',
  'kupaonica',
  'hodnik',
  'ostalo'
];

// Lista svih kucanstava za korisnika
export async function listHouseholds(req, res, next) {
    try {
        const korisnikId = req.user.id;
        const data = await svc.listHouseholds(korisnikId);
        res.json({ households: data });
    } catch (error) {
        next(error);
    }
}

// Kreiranje novog kucanstva
export async function createHousehold(req, res, next) {
    try {
        const korisnikId = req.user.id;
        const { naziv, adresa, grad, povrsina } = req.body;

        if (!naziv || !adresa || !grad) {
            return res.status(400).json({ message: 'Unesite naziv, adresu i grad' });
        }

        const created = await svc.createHousehold(korisnikId, {
            naziv,
            adresa,
            grad,
            povrsina: povrsina ?? null
        });

        res.status(201).json(created);
    } catch (error) {
        next(error);
    }
}

// Dohvati jedno kucanstvo
export async function getHousehold(req, res, next) {
    try {
        const korisnikId = req.user.id;
        const id = Number(req.params.id);
        const data = await svc.getHouseholdById(korisnikId, id);
        res.json(data);
    } catch (error) {
        next(error);
    }
}

// Lista prostorija u kucanstvu
export async function listRooms(req, res, next) {
    try {
        const korisnikId = req.user.id;
        const kucanstvoId = Number(req.params.id);
        const data = await svc.listRooms(korisnikId, kucanstvoId);
        res.json({ rooms: data });
    } catch (error) {
        next(error);
    }
}
export async function createRoom(req, res, next) {
 try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);
    const { naziv, tip, povrsina } = req.body;

    if (!naziv) {
      return res.status(400).json({ message: 'naziv je obavezan.' });
    }

    let tipValue = tip ?? 'ostalo';

    if (!DOZVOLJENI_TIPOVI_PROSTORIJE.includes(tipValue)) {
      return res.status(400).json({
        message: 'Neispravan tip prostorije.',
        dozvoljeni_tipovi: DOZVOLJENI_TIPOVI_PROSTORIJE
      });
    }

    const created = await svc.createRoom(korisnikId, kucanstvoId, {
      naziv,
      tip: tipValue,
      povrsina: povrsina ?? null
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

export async function updateHousehold(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);
    const { naziv, adresa, grad, povrsina } = req.body;

    if (!naziv || !adresa || !grad) {
      return res.status(400).json({ message: 'Naziv, adresa i grad su obavezni.' });
    }

    const updated = await svc.updateHousehold(korisnikId, kucanstvoId, {
      naziv,
      adresa,
      grad,
      povrsina: povrsina ?? null
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteHousehold(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);

    await svc.deleteHousehold(korisnikId, kucanstvoId);

    res.json({ success: true, message: 'Kućanstvo uspješno obrisano.' });
  } catch (err) {
    next(err);
  }
}

export async function updateRoom(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);
    const prostorijId = Number(req.params.roomId);
    const { naziv, tip, povrsina } = req.body;

    if (!naziv) {
      return res.status(400).json({ message: 'Naziv je obavezan.' });
    }

    const updated = await svc.updateRoom(korisnikId, kucanstvoId, prostorijId, {
      naziv,
      tip: tip ?? 'ostalo',
      povrsina: povrsina ?? null
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteRoom(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);
    const prostorijId = Number(req.params.roomId);

    await svc.deleteRoom(korisnikId, kucanstvoId, prostorijId);

    res.json({ success: true, message: 'Prostorija uspješno obrisana.' });
  } catch (err) {
    next(err);
  }
}

// Statistika za kucanstvo
export async function getStats(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);

    const stats = await svc.getHouseholdStats(korisnikId, kucanstvoId);

    res.json(stats);
  } catch (err) {
    next(err);
  }
}
