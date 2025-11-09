import express from 'express';
import { register, login, me } from '../controllers/auth.controller.js';
import { authRequired } from '../middleware/auth.middleware.js';

export const authRouter = express.Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', authRequired, me);