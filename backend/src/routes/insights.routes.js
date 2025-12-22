/**
 * Insights Routes
 *
 * Rute za analizu obrazaca i preporuke
 */

import { Router } from 'express';
import * as ctrl from '../controllers/insights.controller.js';

export const insightsRouter = Router();

// Analiza obrazaca potrošnje za kućanstvo
insightsRouter.get('/households/:id/patterns', ctrl.getConsumptionPatterns);

// Generiranje preporuka za kućanstvo
insightsRouter.get('/households/:id/recommendations', ctrl.getRecommendations);

// ML-bazirane preporuke (napredno)
insightsRouter.get('/households/:id/ml-recommendations', ctrl.getMLRecommendations);

// Usporedba s prošlim razdobljem
insightsRouter.get('/households/:id/comparison', ctrl.getComparison);
