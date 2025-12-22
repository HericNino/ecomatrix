/**
 * Logger Service
 *
 * Centralizirani logging servis koristeći Winston
 * Podržava različite razine logiranja i output u file i console
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Definiraj direktorij za logove
const logDir = path.join(__dirname, '../../logs');

// Custom format za timestamp
const timestampFormat = winston.format.timestamp({
  format: 'YYYY-MM-DD HH:mm:ss'
});

// Custom format za poruke
const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;

  // Dodaj metadata ako postoje
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

// Kreiraj Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    timestampFormat,
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'ecomatrix-backend' },
  transports: [
    // Error log file - samo errori
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log file - sve razine
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Data collection log - poseban file za data collection
    new winston.transports.File({
      filename: path.join(logDir, 'data-collection.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Dodaj console transport ako nismo u production
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      timestampFormat,
      customFormat
    )
  }));
}

/**
 * Helper funkcije za lakše logiranje
 */

export function logInfo(message, meta = {}) {
  logger.info(message, meta);
}

export function logWarn(message, meta = {}) {
  logger.warn(message, meta);
}

export function logError(message, error = null, meta = {}) {
  const errorMeta = error ? {
    ...meta,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    }
  } : meta;

  logger.error(message, errorMeta);
}

export function logDebug(message, meta = {}) {
  logger.debug(message, meta);
}

/**
 * Specifične funkcije za data collection logging
 */

export function logDataCollectionStart(deviceCount) {
  logger.info('Data collection started', {
    category: 'data-collection',
    deviceCount,
    timestamp: new Date().toISOString(),
  });
}

export function logDataCollectionSuccess(deviceId, deviceName, energyKwh) {
  logger.info('Data collection successful', {
    category: 'data-collection',
    deviceId,
    deviceName,
    energyKwh,
    timestamp: new Date().toISOString(),
  });
}

export function logDataCollectionError(deviceId, deviceName, error, errorType = 'unknown') {
  logger.error('Data collection failed', {
    category: 'data-collection',
    deviceId,
    deviceName,
    errorType,
    errorMessage: error.message,
    timestamp: new Date().toISOString(),
  });
}

export function logDataCollectionComplete(successCount, errorCount, totalTime) {
  logger.info('Data collection completed', {
    category: 'data-collection',
    successCount,
    errorCount,
    totalCount: successCount + errorCount,
    totalTimeMs: totalTime,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Specifične funkcije za Shelly plug logging
 */

export function logShellyConnectionError(deviceIp, error, retryAttempt = 0) {
  logger.warn('Shelly connection failed', {
    category: 'shelly',
    deviceIp,
    retryAttempt,
    errorMessage: error.message,
    timestamp: new Date().toISOString(),
  });
}

export function logShellyRetrySuccess(deviceIp, retryAttempt) {
  logger.info('Shelly connection successful after retry', {
    category: 'shelly',
    deviceIp,
    retryAttempt,
    timestamp: new Date().toISOString(),
  });
}

export function logShellyTimeout(deviceIp, timeoutMs) {
  logger.warn('Shelly request timeout', {
    category: 'shelly',
    deviceIp,
    timeoutMs,
    timestamp: new Date().toISOString(),
  });
}

export default logger;
