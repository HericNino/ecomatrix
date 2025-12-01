import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.port || 4000,
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'rootroot',
        database: process.env.DB_NAME || 'ecometrix'
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'dev-secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    }
};