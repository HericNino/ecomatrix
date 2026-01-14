import api from './api';

/**
 * Notification Service
 * Handles all notification-related API calls
 */

export const notificationsService = {
  /**
   * Get user notifications
   * @param {Object} params - Query parameters
   * @param {boolean} params.neprocitano - Filter unread only
   * @param {number} params.limit - Number of notifications to fetch
   * @param {number} params.offset - Offset for pagination
   */
  async getNotifications({ neprocitano = false, limit = 50, offset = 0 } = {}) {
    const response = await api.get('/notifications', {
      params: { neprocitano, limit, offset }
    });
    return response.data;
  },

  /**
   * Get count of unread notifications
   */
  async getUnreadCount() {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  /**
   * Mark a notification as read
   * @param {number} notificationId - ID of notification to mark as read
   */
  async markAsRead(notificationId) {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },

  /**
   * Archive (delete) a notification
   * @param {number} notificationId - ID of notification to archive
   */
  async archiveNotification(notificationId) {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  }
};

export default notificationsService;
