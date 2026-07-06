/**
 * Notification Context — persists notification state across page navigation.
 * Loads push history + audit logs, tracks read/unread status via localStorage.
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { getAuditLogs, getPushHistory } from '../services/api.ts';
import type { AuditLogDto, PushLogDto } from '../services/api.ts';

// ─── Types ───────────────────────────────────────────────────
export interface NotifItem {
  id: string;
  icon: 'push_success' | 'push_failed' | 'upload' | 'parse' | 'delete' | 'push';
  title: string;
  detail: string;
  time: string;
  timestamp: number;
}

interface NotifContextValue {
  notifications: NotifItem[];
  unreadCount: number;
  markAllRead: () => void;
  refresh: () => Promise<void>;
}

const NotifContext = createContext<NotifContextValue | null>(null);

// ─── Helpers ─────────────────────────────────────────────────
function relativeTime(dateStr: string): string {
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function buildNotifications(pushLogs: PushLogDto[], auditLogs: AuditLogDto[]): NotifItem[] {
  const items: NotifItem[] = [];

  for (const log of pushLogs) {
    items.push({
      id: `push-${log.pushId}`,
      icon: log.status === 'success' ? 'push_success' : 'push_failed',
      title: log.status === 'success' ? 'INSW Push Successful' : 'INSW Push Failed',
      detail: log.errorMessage ? log.errorMessage.slice(0, 80) : `File #${log.fileId} → HTTP ${log.httpStatus}`,
      time: relativeTime(log.pushedAt),
      timestamp: new Date(log.pushedAt).getTime(),
    });
  }

  for (const log of auditLogs) {
    let icon: NotifItem['icon'] = 'upload';
    let title = log.action;
    if (log.action === 'upload') { icon = 'upload'; title = 'File Uploaded'; }
    else if (log.action === 'parse') { icon = 'parse'; title = 'File Parsed'; }
    else if (log.action === 'delete') { icon = 'delete'; title = 'File Deleted'; }
    else if (log.action === 'push') continue;
    else { title = log.action.charAt(0).toUpperCase() + log.action.slice(1); }

    items.push({
      id: `audit-${log.logId}`,
      icon, title,
      detail: log.detail?.slice(0, 80) || `${log.entityType} #${log.entityId}`,
      time: relativeTime(log.createdAt),
      timestamp: new Date(log.createdAt).getTime(),
    });
  }

  items.sort((a, b) => b.timestamp - a.timestamp);
  return items.slice(0, 20);
}

// ─── Provider ────────────────────────────────────────────────
export function NotifProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const loaded = useRef(false);

  const username = JSON.parse(localStorage.getItem('user') || '{}').username || '';

  const refresh = useCallback(async () => {
    if (!username) return; // Not logged in — skip
    try {
      const [pushRes, logRes] = await Promise.allSettled([getPushHistory(), getAuditLogs()]);
      const pushLogs = (pushRes.status === 'fulfilled' && pushRes.value.success && pushRes.value.data ? pushRes.value.data : []).filter(l => l.pushedBy === username);
      const auditLogs = (logRes.status === 'fulfilled' && logRes.value.success && logRes.value.data ? logRes.value.data : []).filter(l => l.username === username);
      const items = buildNotifications(pushLogs, auditLogs);
      setNotifications(items);

      const lastSeen = parseInt(localStorage.getItem('notif_last_seen') || '0', 10);
      setUnreadCount(items.filter(n => n.timestamp > lastSeen).length);
    } catch {
      // Silently fail — don't spam console
    }
  }, [username]);

  const markAllRead = useCallback(() => {
    localStorage.setItem('notif_last_seen', String(Date.now()));
    setUnreadCount(0);
  }, []);

  // Load once + poll every 60s (was 30s — reduce load)
  useEffect(() => {
    if (!username) return; // Not logged in
    if (!loaded.current) { loaded.current = true; refresh(); }
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh, username]);

  return (
    <NotifContext.Provider value={{ notifications, unreadCount, markAllRead, refresh }}>
      {children}
    </NotifContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────
export function useNotifications(): NotifContextValue {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error('useNotifications must be used within NotifProvider');
  return ctx;
}
