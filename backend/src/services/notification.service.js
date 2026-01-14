/**
 * Notification Service
 *
 * Manages system notifications for critical events:
 * - Device failures
 * - High consumption warnings
 * - Anomaly detections
 * - System alerts
 */

import { getDb } from '../config/db.js';
import * as logger from './logger.service.js';

/**
 * Notification types
 */
export const NotificationType = {
  DEVICE_FAILURE: 'device_failure',
  HIGH_CONSUMPTION: 'high_consumption',
  ANOMALY: 'anomaly',
  SYSTEM: 'system',
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * Notification priorities
 */
export const NotificationPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Create a new notification
 */
export async function createNotification({
  korisnikId,
  kucanstvoId = null,
  uredjajId = null,
  tip,
  prioritet,
  naslov,
  poruka,
  metadata = null
}) {
  const db = getDb();

  try {
    const [result] = await db.query(
      `INSERT INTO notifikacija
       (korisnik_id, kucanstvo_id, uredjaj_id, tip, prioritet, naslov, poruka, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [korisnikId, kucanstvoId, uredjajId, tip, prioritet, naslov, poruka, JSON.stringify(metadata)]
    );

    logger.logInfo('Notification created', {
      notifikacijaId: result.insertId,
      korisnikId,
      tip,
      prioritet
    });

    return result.insertId;
  } catch (error) {
    logger.logError('Failed to create notification', error, {
      korisnikId,
      tip
    });
    throw error;
  }
}

/**
 * Get all notifications for a user
 */
export async function getUserNotifications(korisnikId, {
  neprocitano = false,
  limit = 50,
  offset = 0
} = {}) {
  const db = getDb();

  try {
    let query = `
      SELECT
        n.notifikacija_id AS id,
        n.korisnik_id,
        n.kucanstvo_id,
        n.uredjaj_id,
        n.tip,
        n.prioritet,
        n.naslov,
        n.poruka,
        n.metadata,
        n.procitano,
        n.arhivirano,
        n.datum_kreiranja,
        n.datum_procitano,
        k.naziv as kucanstvo_naziv,
        u.naziv as uredjaj_naziv
      FROM notifikacija n
      LEFT JOIN kucanstvo k ON n.kucanstvo_id = k.kucanstvo_id
      LEFT JOIN uredjaj u ON n.uredjaj_id = u.uredjaj_id
      WHERE n.korisnik_id = ? AND n.arhivirano = FALSE
    `;

    const params = [korisnikId];

    if (neprocitano) {
      query += ' AND n.procitano = FALSE';
    }

    query += ' ORDER BY n.datum_kreiranja DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [notifications] = await db.query(query, params);

    // MySQL2 automatically parses JSON fields, so no need to parse again
    return notifications;
  } catch (error) {
    logger.logError('Failed to get user notifications', error, { korisnikId });
    throw error;
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(korisnikId) {
  const db = getDb();

  try {
    const [result] = await db.query(
      `SELECT COUNT(*) as count
       FROM notifikacija
       WHERE korisnik_id = ? AND procitano = FALSE AND arhivirano = FALSE`,
      [korisnikId]
    );

    return result[0].count;
  } catch (error) {
    logger.logError('Failed to get unread count', error, { korisnikId });
    throw error;
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notifikacijaId, korisnikId) {
  const db = getDb();

  try {
    const [result] = await db.query(
      `UPDATE notifikacija
       SET procitano = TRUE, datum_procitano = NOW()
       WHERE notifikacija_id = ? AND korisnik_id = ?`,
      [notifikacijaId, korisnikId]
    );

    return result.affectedRows > 0;
  } catch (error) {
    logger.logError('Failed to mark notification as read', error, {
      notifikacijaId,
      korisnikId
    });
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(korisnikId) {
  const db = getDb();

  try {
    const [result] = await db.query(
      `UPDATE notifikacija
       SET procitano = TRUE, datum_procitano = NOW()
       WHERE korisnik_id = ? AND procitano = FALSE`,
      [korisnikId]
    );

    logger.logInfo('Marked all notifications as read', {
      korisnikId,
      count: result.affectedRows
    });

    return result.affectedRows;
  } catch (error) {
    logger.logError('Failed to mark all as read', error, { korisnikId });
    throw error;
  }
}

/**
 * Delete (archive) a notification
 */
export async function archiveNotification(notifikacijaId, korisnikId) {
  const db = getDb();

  try {
    const [result] = await db.query(
      `UPDATE notifikacija
       SET arhivirano = TRUE
       WHERE notifikacija_id = ? AND korisnik_id = ?`,
      [notifikacijaId, korisnikId]
    );

    return result.affectedRows > 0;
  } catch (error) {
    logger.logError('Failed to archive notification', error, {
      notifikacijaId,
      korisnikId
    });
    throw error;
  }
}

/**
 * Clean up old notifications (older than 30 days)
 */
export async function cleanupOldNotifications(daysOld = 30) {
  const db = getDb();

  try {
    const [result] = await db.query(
      `DELETE FROM notifikacija
       WHERE datum_kreiranja < DATE_SUB(NOW(), INTERVAL ? DAY)
       AND procitano = TRUE`,
      [daysOld]
    );

    logger.logInfo('Cleaned up old notifications', {
      deletedCount: result.affectedRows,
      daysOld
    });

    return result.affectedRows;
  } catch (error) {
    logger.logError('Failed to cleanup old notifications', error, { daysOld });
    throw error;
  }
}

/**
 * Helper: Create device failure notification
 */
export async function notifyDeviceFailure(korisnikId, kucanstvoId, uredjajId, deviceName, errorMessage) {
  return createNotification({
    korisnikId,
    kucanstvoId,
    uredjajId,
    tip: NotificationType.DEVICE_FAILURE,
    prioritet: NotificationPriority.HIGH,
    naslov: `Uređaj ${deviceName} nije dostupan`,
    poruka: `Uređaj ${deviceName} ne odgovara. Molimo provjerite vezu ili kontaktirajte podršku.`,
    metadata: {
      deviceName,
      errorMessage,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Helper: Create high consumption notification
 */
export async function notifyHighConsumption(korisnikId, kucanstvoId, uredjajId, deviceName, consumption, threshold) {
  return createNotification({
    korisnikId,
    kucanstvoId,
    uredjajId,
    tip: NotificationType.HIGH_CONSUMPTION,
    prioritet: NotificationPriority.MEDIUM,
    naslov: `Visoka potrošnja detektirana`,
    poruka: `Uređaj ${deviceName} ima neobično visoku potrošnju: ${consumption.toFixed(2)} kWh (${((consumption / threshold - 1) * 100).toFixed(0)}% iznad normale).`,
    metadata: {
      deviceName,
      consumption,
      threshold,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Helper: Create anomaly detection notification
 */
export async function notifyAnomaly(korisnikId, kucanstvoId, anomalyData) {
  return createNotification({
    korisnikId,
    kucanstvoId,
    uredjajId: null,
    tip: NotificationType.ANOMALY,
    prioritet: NotificationPriority.MEDIUM,
    naslov: 'Neobična potrošnja detektirana',
    poruka: `Sustav je detektirao neobičnu potrošnju u vašem kućanstvu. Provjerite uređaje i potrošnju.`,
    metadata: {
      ...anomalyData,
      timestamp: new Date().toISOString()
    }
  });
}

export default {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  cleanupOldNotifications,
  notifyDeviceFailure,
  notifyHighConsumption,
  notifyAnomaly,
  NotificationType,
  NotificationPriority
};
