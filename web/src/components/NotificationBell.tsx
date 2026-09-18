import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../api/notification';
import type { NotificationItem, NotificationType } from '../types/notification';

const notifIcons: Record<NotificationType, string> = {
  order_status: '🚚',
  payment_status: '💵',
  produce_inquiry: '🌾',
  community_reply: '💬',
  program_status: '🏛️',
  system: '📢',
};

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    try {
      const count = await notificationApi.getUnreadCount();
      setUnreadCount(count);
    } catch (e) {
      // Ignore if unauthenticated
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationApi.listNotifications();
      setNotifications(data);
      const unread = data.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    }, 10000);

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      // Optimistic update: mark as read immediately
      const prevNotifications = notifications;
      const prevUnreadCount = unreadCount;
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await notificationApi.markAsRead(notif.id);
      } catch (e) {
        console.error('Failed to mark read:', e);
        // Rollback on failure
        setNotifications(prevNotifications);
        setUnreadCount(prevUnreadCount);
      }
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistic update: mark all read immediately
    const prevNotifications = notifications;
    const prevUnreadCount = unreadCount;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await notificationApi.markAllAsRead();
    } catch (e) {
      console.error('Failed to mark all read:', e);
      // Rollback on failure
      setNotifications(prevNotifications);
      setUnreadCount(prevUnreadCount);
    }
  };

  const formatTime = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  return (
    <div ref={popoverRef} className="notif-bell-wrapper" style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifications"
        className={`notif-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: unreadCount > 0 ? '#EFFDF5' : '#FFFFFF',
          border: unreadCount > 0 ? '1.5px solid #16A34A' : '1px solid #E4E2DC',
          color: unreadCount > 0 ? '#15803D' : '#525450',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          flexShrink: 0,
        }}
      >
        {/* Bell Icon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span
            className="notif-count-badge"
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              borderRadius: '9px',
              backgroundColor: '#EF4444',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              border: '2px solid #fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Backdrop overlay for mobile touch dismiss */}
      {isOpen && (
        <div
          className="notif-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Popover Panel */}
      {isOpen && (
        <div
          className="notif-popover-panel"
          style={{
            position: 'absolute',
            top: '48px',
            right: 0,
            width: '360px',
            maxHeight: '480px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.16)',
            border: '1px solid #e2e8f0',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            className="notif-popover-header"
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>Notifications</span>
              {unreadCount > 0 && (
                <span
                  className="notif-unread-badge"
                  style={{
                    backgroundColor: '#EFFDF5',
                    color: '#15803D',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    border: '1px solid #BBF7D0',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="notif-mark-read-btn"
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#0E4A27',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="notif-mobile-close-btn"
                title="Close notifications"
                style={{
                  border: 'none',
                  background: '#E2E8F0',
                  color: '#475569',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'none',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 800,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="notif-popover-body" style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Loading notifications…
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '32px', marginBottom: '6px' }}>🔔</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#475569' }}>No Notifications</div>
                <div style={{ fontSize: '12px', marginTop: '2px' }}>You're all caught up!</div>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`notif-item ${notif.isRead ? 'is-read' : 'is-unread'}`}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    gap: '12px',
                    cursor: 'pointer',
                    backgroundColor: notif.isRead ? '#ffffff' : '#EFFDF5',
                    borderBottom: '1px solid #f1f5f9',
                    borderLeft: notif.isRead ? '3px solid transparent' : '3px solid #0E4A27',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = notif.isRead ? '#f8fafc' : '#DCFCE7';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = notif.isRead ? '#ffffff' : '#EFFDF5';
                  }}
                >
                  <div
                    className={`notif-icon-box type-${notif.type}`}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      flexShrink: 0,
                    }}
                  >
                    {notifIcons[notif.type] ?? '🔔'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: notif.isRead ? 600 : 800,
                        color: '#0f172a',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span className="notif-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {notif.title}
                      </span>
                      <span className="notif-time" style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600, flexShrink: 0, marginLeft: '6px' }}>
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>

                    <div
                      className="notif-message"
                      style={{
                        fontSize: '12px',
                        color: '#475569',
                        marginTop: '2px',
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {notif.message}
                    </div>
                  </div>

                  {!notif.isRead && (
                    <div
                      className="notif-unread-dot"
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#16A34A',
                        alignSelf: 'center',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

