import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { householdsRouter } from './routes/households.routes.js';
import { devicesRouter } from './routes/devices.routes.js';
import { measurementsRouter } from './routes/measurements.routes.js';
import { insightsRouter } from './routes/insights.routes.js';
import { costsRouter } from './routes/costs.routes.js';
import { goalsRouter } from './routes/goals.routes.js';
import { reportsRouter } from './routes/reports.routes.js';
import { authRequired } from './middleware/auth.middleware.js';


export function createApp()
{
    const app = express();

    app.use(cors());
    app.use(express.json());

    //Health check
    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok' });
    });

    //Routes
    app.use('/api/auth', authRouter);
    app.use('/api/households', authRequired, householdsRouter);
    app.use('/api', authRequired, devicesRouter);
    app.use('/api', authRequired, measurementsRouter);
    app.use('/api', authRequired, insightsRouter);
    app.use('/api', authRequired, costsRouter);
    app.use('/api', authRequired, goalsRouter);
    app.use('/api', authRequired, reportsRouter);

    //Error handler
    app.use(errorHandler);

    return app;
}
