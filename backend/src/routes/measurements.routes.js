/**
 * Measurements Routes
 *
 * Rute za upravljanje mjerenjima potrošnje energije
 */

import { Router } from 'express';
import * as ctrl from '../controllers/measurements.controller.js';

export const measurementsRouter = Router();

// Dohvaćanje mjerenja za kućanstvo
measurementsRouter.get('/households/:id/measurements', ctrl.getHouseholdMeasurements);

// Dohvaćanje statistike potrošnje za kućanstvo
measurementsRouter.get('/households/:id/stats', ctrl.getConsumptionStats);

// Prikupljanje podataka sa svih uređaja u kućanstvu
measurementsRouter.post('/households/:id/collect-all', ctrl.collectAllDevicesData);

// Dohvaćanje mjerenja za uređaj
measurementsRouter.get('/devices/:deviceId/measurements', ctrl.getDeviceMeasurements);

// Prikupljanje podataka sa jednog uređaja
measurementsRouter.post('/devices/:deviceId/collect', ctrl.collectDeviceData);

// Dnevna potrošnja za uređaj
measurementsRouter.get('/devices/:deviceId/daily-consumption', ctrl.getDailyConsumption);

// Ručno dodavanje mjerenja
measurementsRouter.post('/devices/:deviceId/measurements', ctrl.addManualMeasurement);