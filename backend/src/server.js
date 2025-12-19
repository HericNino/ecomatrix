import { createApp } from './app.js';
import { initDb } from './config/db.js';
import { config } from './config/env.js';
import * as scheduler from './services/scheduler.service.js';

async function startServer() {
    try {
        await initDb();

        const app = createApp();

        app.listen(config.port, () => {
            console.log(`🚀 Server running on http://localhost:${config.port}`);

            const schedule = process.env.DATA_COLLECTION_SCHEDULE || '*/5 * * * *';

            if (process.env.ENABLE_AUTO_COLLECTION !== 'false') {
                scheduler.startDataCollection(schedule);
                console.log('📊 Automatsko prikupljanje podataka pokrenuto');
            } else {
                console.log('⏸️  Automatsko prikupljanje podataka je onemogućeno');
            }
        });
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
}

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing server');
    scheduler.stopDataCollection();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing server');
    scheduler.stopDataCollection();
    process.exit(0);
});

startServer();