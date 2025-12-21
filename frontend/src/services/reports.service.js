import api from './api';

const reportsService = {
  // Dohvati izvjestaj potrosnje
  async getConsumptionReport(householdId, datumOd, datumDo, groupBy = 'day') {
    const response = await api.get(`/households/${householdId}/reports`, {
      params: {
        datum_od: datumOd,
        datum_do: datumDo,
        group_by: groupBy
      }
    });
    return response.data;
  },

  // Usporedi dva razdoblja
  async comparePeriods(householdId, period1Start, period1End, period2Start, period2End) {
    const response = await api.get(`/households/${householdId}/reports/compare`, {
      params: {
        period1_start: period1Start,
        period1_end: period1End,
        period2_start: period2Start,
        period2_end: period2End
      }
    });
    return response.data;
  }
};

export default reportsService;
