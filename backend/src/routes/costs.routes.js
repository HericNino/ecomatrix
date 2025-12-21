/**
 * Costs Routes
 *
 * Rute za praćenje troškova i postavke cijene struje
 */

import { Router } from 'express';
import * as ctrl from '../controllers/costs.controller.js';

export const costsRouter = Router();

// Dohvati cijenu struje za kućanstvo
costsRouter.get('/households/:id/electricity-price', ctrl.getElectricityPrice);

// Postavi cijenu struje za kućanstvo
costsRouter.put('/households/:id/electricity-price', ctrl.setElectricityPrice);

// Dohvati troškove za kućanstvo
costsRouter.get('/households/:id/costs', ctrl.getCosts);

// Dohvati dnevne troškove za grafikon
costsRouter.get('/households/:id/costs/daily', ctrl.getDailyCosts);
