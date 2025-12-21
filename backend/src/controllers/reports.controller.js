import * as reportsService from '../services/reports.service.js';

// Generiraj izvjestaj potrosnje
export async function getConsumptionReport(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);
    const { datum_od, datum_do, group_by } = req.query;

    if (!datum_od || !datum_do) {
      return res.status(400).json({ message: 'Unesite datum od i do' });
    }

    const report = await reportsService.generateConsumptionReport(
      korisnikId,
      kucanstvoId,
      datum_od,
      datum_do,
      group_by || 'day'
    );

    res.json(report);
  } catch (error) {
    next(error);
  }
}

// Usporedi dva razdoblja
export async function comparePeriods(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const kucanstvoId = Number(req.params.id);
    const { period1_start, period1_end, period2_start, period2_end } = req.query;

    if (!period1_start || !period1_end || !period2_start || !period2_end) {
      return res.status(400).json({ message: 'Unesite oba razdoblja za usporedbu' });
    }

    const comparison = await reportsService.comparePeriodsReport(
      korisnikId,
      kucanstvoId,
      period1_start,
      period1_end,
      period2_start,
      period2_end
    );

    res.json(comparison);
  } catch (error) {
    next(error);
  }
}
