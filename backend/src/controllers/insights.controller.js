import * as svc from '../services/insights.service.js';

export async function getConsumptionPatterns(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);
    const danaUnazad = req.query.dana_unazad ? Number(req.query.dana_unazad) : 30;

    const patterns = await svc.analyzeConsumptionPatterns(korisnikId, kucanstvoId, danaUnazad);

    res.json(patterns);
  } catch (error) {
    next(error);
  }
}

export async function getRecommendations(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);

    const recommendations = await svc.generateRecommendations(korisnikId, kucanstvoId);

    res.json(recommendations);
  } catch (error) {
    next(error);
  }
}

export async function getComparison(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);
    const danaUnazad = req.query.dana_unazad ? Number(req.query.dana_unazad) : 30;

    const comparison = await svc.compareWithPreviousPeriod(korisnikId, kucanstvoId, danaUnazad);

    res.json(comparison);
  } catch (error) {
    next(error);
  }
}
