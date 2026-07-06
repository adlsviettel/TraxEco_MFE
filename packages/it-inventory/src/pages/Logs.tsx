import { useState, useEffect } from 'react';
import { usePageVisible } from '../hooks/usePageVisible.ts';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw, Upload, Send, Settings, LogIn,
  Trash2, Edit, Loader, AlertCircle,
} from 'lucide-react';
import Header from '../components/Header.tsx';
import { getAuditLogs } from '../services/api.ts';
import type { AuditLogDto } from '../services/api.ts';

// ─── Action → icon, color mapping ────────────────────────────
const ACTION_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  upload:  { icon: <Upload size={12} />,   color: '#4f6ef7', bg: '#eef2ff' },
  import:  { icon: <Upload size={12} />,   color: '#4f6ef7', bg: '#eef2ff' },
  push:    { icon: <Send size={12} />,     color: '#10b981', bg: '#ecfdf5' },
  delete:  { icon: <Trash2 size={12} />,   color: '#ef4444', bg: '#fef2f2' },
  update:  { icon: <Edit size={12} />,     color: '#f59e0b', bg: '#fffbeb' },
  config:  { icon: <Settings size={12} />, color: '#8b5cf6', bg: '#f5f3ff' },
  login:   { icon: <LogIn size={12} />,    color: '#6b7280', bg: '#f3f4f6' },
};

function getActionStyle(action: string) {
  const key = action.toLowerCase();
  for (const k of Object.keys(ACTION_META)) {
    if (key.includes(k)) return ACTION_META[k];
  }
  return { icon: <AlertCircle size={12} />, color: '#6b7280', bg: '#f3f4f6' };
}

export default function Logs() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  async function loadLogs() {
    setLoading(true);
    try {
      const res = await getAuditLogs();
      if (res.success && res.data) setLogs(res.data);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLogs(); }, []);

  // Auto-refresh when navigating back to this page
  usePageVisible('/logs', loadLogs);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const filtered = filter
    ? logs.filter(l =>
        l.action?.toLowerCase().includes(filter.toLowerCase()) ||
        l.username?.toLowerCase().includes(filter.toLowerCase()) ||
        l.detail?.toLowerCase().includes(filter.toLowerCase()) ||
        l.entityType?.toLowerCase().includes(filter.toLowerCase())
      )
    : logs;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(page, totalPages);
  const paged = filtered.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  // Reset to page 1 when filter changes
  function handleFilterChange(val: string) {
    setFilter(val);
    setPage(1);
  }

  return (
    <div className="page">
      <Header title={t('nav.logs')} />
      <div className="page-body">

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar-left">
            <AlertCircle size={20} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600 }}>{t('nav.logs')}</span>
            <span className="text-muted" style={{ fontSize: 13 }}>— {filtered.length} {t('common.total').toLowerCase()}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              placeholder={t('common.search') + '...'}
              value={filter}
              onChange={e => handleFilterChange(e.target.value)}
              style={{ padding: '6px 12px', fontSize: 13, width: 200 }}
            />
            <button className="btn-secondary" onClick={loadLogs} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} /> {t('common.refresh')}
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <Loader size={32} className="spin" style={{ margin: '0 auto', display: 'block', color: 'var(--accent)' }} />
            <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>{t('common.loading')}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <AlertCircle size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</p>
          </div>
        ) : (
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    <th>{t('logs.user')}</th>
                    <th>{t('logs.action')}</th>
                    <th>{t('logs.entityType')}</th>
                    <th>{t('logs.detail')}</th>
                    <th>{t('logs.dateTime')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((log, idx) => {
                    const style = getActionStyle(log.action);
                    const rowNum = (safeCurrentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={log.logId}>
                        <td className="text-muted">{rowNum}</td>
                        <td><strong>{log.username || '—'}</strong></td>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            background: style.bg,
                            color: style.color,
                          }}>
                            {style.icon}
                            {log.action}
                          </span>
                        </td>
                        <td className="text-muted" style={{ textTransform: 'capitalize' }}>{log.entityType || '—'}</td>
                        <td className="text-muted" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.detail || '—'}
                        </td>
                        <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                          {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination — pinned at bottom */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              borderTop: '1px solid var(--border-color)',
              fontSize: 13,
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: 13, background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>
                  {(safeCurrentPage - 1) * pageSize + 1}–{Math.min(safeCurrentPage * pageSize, filtered.length)} / {filtered.length}
                </span>
                <button
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setPage(1)}
                >«</button>
                <button
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >‹</button>
                <span style={{ fontWeight: 600, minWidth: 40, textAlign: 'center' }}>
                  {safeCurrentPage} / {totalPages}
                </span>
                <button
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >›</button>
                <button
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setPage(totalPages)}
                >»</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
