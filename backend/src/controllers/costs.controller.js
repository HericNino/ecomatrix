import * as svc from '../services/costs.service.js';

export async function getElectricityPrice(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);

    const result = await svc.getElectricityPrice(korisnikId, kucanstvoId);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function setElectricityPrice(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);
    const { cijena_kwh, valuta } = req.body;

    if (!cijena_kwh || cijena_kwh <= 0) {
      const err = new Error('Cijena mora biti veća od 0.');
      err.status = 400;
      throw err;
    }

    const result = await svc.setElectricityPrice(korisnikId, kucanstvoId, cijena_kwh, valuta);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCosts(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);

    // Zadano razdoblje: zadnjih 30 dana
    let datumDo = req.query.datum_do || new Date().toISOString().split('T')[0];
    let datumOd = req.query.datum_od;

    if (!datumOd) {
      const date = new Date(datumDo);
      date.setDate(date.getDate() - 30);
      datumOd = date.toISOString().split('T')[0];
    }

    const result = await svc.calculateCosts(korisnikId, kucanstvoId, datumOd, datumDo);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getDailyCosts(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);
    const danaUnazad = req.query.dana_unazad ? Number(req.query.dana_unazad) : 30;

    const result = await svc.getDailyCosts(korisnikId, kucanstvoId, danaUnazad);

    res.json(result);
  } catch (error) {
    next(error);
  }
}
