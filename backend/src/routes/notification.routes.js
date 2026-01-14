/**
 * Notification Routes
 *
 * API endpoints for managing notifications
 */

import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller.js';

export const notificationRouter = Router();

// Get all notifications for the authenticated user
notificationRouter.get('/', ctrl.getNotifications);

// Get unread notification count
notificationRouter.get('/unread-count', ctrl.getUnreadCount);

// Mark specific notification as read
notificationRouter.patch('/:id/read', ctrl.markAsRead);

// Mark all notifications as read
notificationRouter.patch('/read-all', ctrl.markAllAsRead);

// Archive (delete) a notification
notificationRouter.delete('/:id', ctrl.archiveNotification);
