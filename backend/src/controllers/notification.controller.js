/**
 * Notification Controller
 *
 * Handles HTTP requests for notifications
 */

import * as notificationService from '../services/notification.service.js';

/**
 * Get all notifications for the authenticated user
 */
export async function getNotifications(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const { neprocitano, limit, offset } = req.query;

    const notifications = await notificationService.getUserNotifications(korisnikId, {
      neprocitano: neprocitano === 'true',
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });

    res.json({ notifications });
  } catch (error) {
    next(error);
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(req, res, next) {
  try {
    const korisnikId = req.user.id;

    const count = await notificationService.getUnreadCount(korisnikId);

    res.json({ count });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const { id } = req.params;

    const success = await notificationService.markAsRead(parseInt(id), korisnikId);

    if (!success) {
      return res.status(404).json({ message: 'Notifikacija nije pronađena' });
    }

    res.json({ message: 'Notifikacija označena kao pročitana' });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(req, res, next) {
  try {
    const korisnikId = req.user.id;

    const count = await notificationService.markAllAsRead(korisnikId);

    res.json({
      message: 'Sve notifikacije označene kao pročitane',
      count
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Archive (delete) a notification
 */
export async function archiveNotification(req, res, next) {
  try {
    const korisnikId = req.user.id;
    const { id } = req.params;

    const success = await notificationService.archiveNotification(parseInt(id), korisnikId);

    if (!success) {
      return res.status(404).json({ message: 'Notifikacija nije pronađena' });
    }

    res.json({ message: 'Notifikacija obrisana' });
  } catch (error) {
    next(error);
  }
}
