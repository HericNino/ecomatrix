import { createApp } from './app.js';
import { initDb } from './config/db.js';
import { config } from './config/env.js';

async function startServer() {
    try{
        await initDb(); //Test konekcie na bazu

        const app = createApp();

        app.listen(config.port, () => {
            console.log(`🚀 Server running on http://localhost:${config.port}`);
        });
    } catch (err) {
        console.error("Failed to start server:",err);
        process.exit(1);
    }
}

startServer();