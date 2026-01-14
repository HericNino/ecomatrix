import { useState, useEffect, useRef } from 'react';
import notificationsService from '../services/notifications';
import './NotificationBell.css';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  // Fetch unread count on mount and every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications when panel opens
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const fetchUnreadCount = async () => {
    try {
      const data = await notificationsService.getUnreadCount();
      setUnreadCount(data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationsService.getNotifications({ limit: 20 });
      setNotifications(data.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await notificationsService.markAsRead(notificationId);
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, procitano: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, procitano: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleArchive = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await notificationsService.archiveNotification(notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));
      if (!notifications.find(n => n.id === notificationId)?.procitano) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  const togglePanel = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  const getTypeIcon = (tip) => {
    switch (tip) {
      case 'device_failure':
      case 'warning':
        return '⚠️';
      case 'high_consumption':
        return '⚡';
      case 'anomaly':
        return 'ℹ️';
      case 'system':
        return '⚙️';
      case 'info':
        return 'ℹ️';
      default:
        return '🔔';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Upravo sada';
    if (minutes < 60) return `Prije ${minutes} min`;
    if (hours < 24) return `Prije ${hours}h`;
    if (days < 7) return `Prije ${days}d`;
    return date.toLocaleDateString('hr-HR');
  };

  return (
    <div className="notification-bell" ref={panelRef}>
      <button className="btn-icon" onClick={togglePanel} title="Notifikacije">
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <h3 style={{fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', margin: 0}}>Notifikacije</h3>
            {unreadCount > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleMarkAllAsRead}
                title="Označi sve kao pročitano"
              >
                ✓ Označi sve
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="empty-state" style={{padding: '32px'}}>
                <span className="spinner"></span>
                <p className="empty-state-message">Učitavanje...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="empty-state" style={{padding: '32px'}}>
                <div style={{fontSize: '48px', marginBottom: '16px'}}>🔔</div>
                <p className="empty-state-message">Nema notifikacija</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.procitano ? 'unread' : ''}`}
                  style={{
                    padding: 'var(--space-3)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    gap: 'var(--space-3)',
                    transition: 'background-color var(--transition-fast)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    backgroundColor: notification.prioritet === 'critical' || notification.prioritet === 'high'
                      ? 'var(--color-error-light)'
                      : notification.prioritet === 'medium'
                      ? 'var(--color-warning-light)'
                      : 'var(--color-info-light)',
                    color: notification.prioritet === 'critical' || notification.prioritet === 'high'
                      ? 'var(--color-error)'
                      : notification.prioritet === 'medium'
                      ? 'var(--color-warning)'
                      : 'var(--color-info)'
                  }}>
                    {getTypeIcon(notification.tip)}
                  </div>

                  <div style={{flex: 1, minWidth: 0}}>
                    <h4 style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-semibold)',
                      color: 'var(--text-primary)',
                      marginBottom: 'var(--space-1)'
                    }}>
                      {notification.naslov}
                    </h4>
                    <p style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-secondary)',
                      marginBottom: 'var(--space-2)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {notification.poruka}
                    </p>
                    <span style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-tertiary)'
                    }}>
                      {formatTimestamp(notification.datum_kreiranja)}
                    </span>
                  </div>

                  <div style={{display: 'flex', gap: '4px', flexShrink: 0}}>
                    {!notification.procitano && (
                      <button
                        className="btn-icon btn-sm"
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        title="Označi kao pročitano"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      className="btn-icon btn-sm"
                      onClick={(e) => handleArchive(notification.id, e)}
                      title="Arhiviraj"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
