import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Menu as MenuIcon,
  CheckCircle,
  XCircle,
  FileText,
  Upload,
  Trash2,
  Send
} from 'lucide-react';
import { useMobileSidebar } from '../contexts/MobileSidebarContext';
import { useNotifications, type NotifItem } from '../contexts/NotifContext';
import { HeaderActions } from '@traxeco/shared';

interface HeaderProps {
  title: string;
}

// ─── Notification Icon Component ─────────────────────────────
function NotifIcon({ type }: { type: NotifItem['icon'] }) {
  const styles: Record<NotifItem['icon'], { bg: string; color: string; icon: React.ReactNode }> = {
    push_success: { bg: '#e8f5e9', color: '#2e7d32', icon: <CheckCircle size={14} /> },
    push_failed:  { bg: '#ffeaea', color: '#d32f2f', icon: <XCircle size={14} /> },
    upload:       { bg: '#e3f2fd', color: '#1565c0', icon: <Upload size={14} /> },
    parse:        { bg: '#f3e5f5', color: '#7b1fa2', icon: <FileText size={14} /> },
    delete:       { bg: '#fff3e0', color: '#e65100', icon: <Trash2 size={14} /> },
    push:         { bg: '#e8eaf6', color: '#3949ab', icon: <Send size={14} /> },
  };
  const s = styles[type];
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: s.bg, color: s.color, flexShrink: 0,
    }}>{s.icon}</div>
  );
}

export default function Header({ title }: HeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toggle } = useMobileSidebar();
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Use shared notification context (persists across page navigation)
  const { notifications, unreadCount, markAllRead } = useNotifications();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
    }
    if (showNotif) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotif]);

  function handleBellClick() {
    setShowNotif(v => !v);
    if (!showNotif) markAllRead();
  }

  return (
    <header className="main-header">
      <div className="header-left">
        <button className="mobile-menu-btn" onClick={toggle}>
          <MenuIcon size={22} />
        </button>
        <span className="header-breadcrumb">
          <span className="breadcrumb-app">IT Inventory</span>
          <span className="breadcrumb-sep"> - </span>
          <span className="breadcrumb-page">{title}</span>
        </span>
      </div>
      <div className="header-right">
        {/* Notification bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button className="header-icon-btn" onClick={handleBellClick}>
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                minWidth: 16, height: 16, borderRadius: 8,
                background: 'var(--danger, #ef4444)', color: '#fff',
                fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px', border: '2px solid var(--surface)',
                lineHeight: 1,
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 380, maxHeight: 440, borderRadius: 12,
              background: 'var(--surface)', boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
              border: '1px solid var(--border)', zIndex: 1000,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                padding: '14px 16px', borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t('notification.title')}</h4>
                {notifications.length > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {notifications.length} {t('notification.recent')}
                  </span>
                )}
              </div>

              {/* List */}
              <div style={{ overflowY: 'auto', flex: 1, maxHeight: 380 }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    <Bell size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <p>{t('notification.empty')}</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{
                      display: 'flex', gap: 10, padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'default', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <NotifIcon type={n.icon} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{n.title}</div>
                        <div style={{
                          fontSize: 12, color: 'var(--text-muted)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{n.detail}</div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>
                        {n.time}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                  <button
                    style={{
                      background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600,
                    }}
                    onClick={() => { setShowNotif(false); navigate('/it-inventory/logs'); }}
                  >
                    {t('notification.viewAll')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <HeaderActions homePath="/" onOpenChangePassword={() => navigate('/it-inventory/account')} />
      </div>
    </header>
  );
}
