import mysql from 'mysql2/promise';
import {config} from './env.js';

let pool;

export async function initDb() {
    if(!pool){
        pool = await mysql.createPool({
            host: config.db.host,
            port: config.db.port,
            user: config.db.user,
            password: config.db.password,
            database: config.db.database,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        console.log("MySQL pool created successfully");
    }

    return pool;
}

export function getDb() {
    if(!pool){
        throw new Error('MySQL pool is not initialized. Call initDb() first.');
    }
    return pool;
}