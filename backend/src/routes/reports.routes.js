import express from 'express';
import * as reportsController from '../controllers/reports.controller.js';

const router = express.Router();

// GET /api/households/:id/reports - Generiraj izvjestaj
router.get('/households/:id/reports', reportsController.getConsumptionReport);

// GET /api/households/:id/reports/compare - Usporedi razdoblja
router.get('/households/:id/reports/compare', reportsController.comparePeriods);

export { router as reportsRouter };
