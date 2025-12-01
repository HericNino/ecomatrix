import express from 'express';
import cors from 'cors';
import {authRouter} from './routes/auth.routes.js';
import {errorHandler} from './middleware/error.middleware.js';
import {householdsRouter} from './routes/households.routes.js';
import { authRequired } from './middleware/auth.middleware.js';


export function createApp() {
    const app = express();

    app.use(cors());
    app.use(express.json());

    //Health check
    app.get('/api/health', (req,res) =>{
        res.json({status : 'ok'});
    });

    //Routes
    app.use('/api/auth',authRouter);

    app.use('/api/households',authRequired, householdsRouter);

    //Error handler
    app.use(errorHandler);

    return app;
}