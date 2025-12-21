import * as svc from '../services/goals.service.js';

export async function createGoal(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);

    const { naziv, tip_cilja, cilj_kwh, cilj_troskova, datum_pocetka, datum_zavrsetka } = req.body;

    if (!naziv || !datum_pocetka || !datum_zavrsetka) {
      const err = new Error('Naziv, datum početka i datum završetka su obavezni.');
      err.status = 400;
      throw err;
    }

    if (!cilj_kwh && !cilj_troskova) {
      const err = new Error('Morate postaviti cilj potrošnje (kWh) ili cilj troškova.');
      err.status = 400;
      throw err;
    }

    const result = await svc.createGoal(korisnikId, kucanstvoId, {
      naziv,
      tip_cilja: tip_cilja || 'mjesecni',
      cilj_kwh,
      cilj_troskova,
      datum_pocetka,
      datum_zavrsetka,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getGoals(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);
    const onlyActive = req.query.active === 'true';

    const result = await svc.getGoals(korisnikId, kucanstvoId, onlyActive);

    res.json({ goals: result });
  } catch (error) {
    next(error);
  }
}

export async function getGoal(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);
    const ciljId = Number(req.params.goalId);

    const result = await svc.getGoal(korisnikId, kucanstvoId, ciljId);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateGoal(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);
    const ciljId = Number(req.params.goalId);

    const { naziv, tip_cilja, cilj_kwh, cilj_troskova, datum_pocetka, datum_zavrsetka, aktivan } = req.body;

    const result = await svc.updateGoal(korisnikId, kucanstvoId, ciljId, {
      naziv,
      tip_cilja,
      cilj_kwh,
      cilj_troskova,
      datum_pocetka,
      datum_zavrsetka,
      aktivan,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteGoal(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);
    const ciljId = Number(req.params.goalId);

    const result = await svc.deleteGoal(korisnikId, kucanstvoId, ciljId);

    res.json(result);
  } catch (error) {
    next(error);
  }
}
