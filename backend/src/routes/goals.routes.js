/**
 * Goals Routes
 *
 * Rute za upravljanje ciljevima štednje
 */

import { Router } from 'express';
import * as ctrl from '../controllers/goals.controller.js';

export const goalsRouter = Router();

// Kreiraj novi cilj za kućanstvo
goalsRouter.post('/households/:id/goals', ctrl.createGoal);

// Dohvati sve ciljeve za kućanstvo
goalsRouter.get('/households/:id/goals', ctrl.getGoals);

// Dohvati pojedinačni cilj
goalsRouter.get('/households/:id/goals/:goalId', ctrl.getGoal);

// Ažuriraj cilj
goalsRouter.put('/households/:id/goals/:goalId', ctrl.updateGoal);

// Obriši cilj
goalsRouter.delete('/households/:id/goals/:goalId', ctrl.deleteGoal);
