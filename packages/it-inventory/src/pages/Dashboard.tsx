import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
  FileText, CheckCircle, XCircle, Loader,
  Upload, Send, AlertCircle, Package, RefreshCw,
  Edit, Trash2, Settings as SettingsIcon
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Header from '../components/Header.tsx';
import { usePageVisible } from '../hooks/usePageVisible.ts';
import { getDashboardStats, getAuditLogs, getFiles } from '../services/api.ts';
import type { DashboardStatsDto, AuditLogDto, ImportedFileDto } from '../services/api.ts';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: string;
  loading?: boolean;
}

function StatCard({ icon: Icon, label, value, color, loading }: StatCardProps) {
  return (
    <div className="stat-mini-card">
      <div className="stat-mini-icon" style={{ background: color + '22', color }}>
        <Icon size={20} />
      </div>
      <div>
        <p className="stat-mini-label">{label}</p>
        <p className="stat-mini-value">{loading ? '—' : value}</p>
      </div>
    </div>
  );
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

function DonutCard({ title, data, loading }: { title: string; data: ChartDataItem[]; loading: boolean }) {
  const { t } = useTranslation();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3>{title}</h3>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{total} {t('common.total', 'total')}</span>
      </div>
      <div className="chart-body">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader size={28} className="spin" style={{ color: 'var(--accent)' }} />
          </div>
        ) : total === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
            {t('common.noData', 'No data available')}
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {data.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {data.map((entry, idx) => (
                <div key={idx} className="legend-item">
                  <span className="legend-dot" style={{ background: entry.color }} />
                  <span className="legend-label">{entry.name}</span>
                  <span className="legend-value">{entry.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getActionIcon(action: string) {
  switch (action?.toLowerCase()) {
    case 'import': return <Upload size={14} />;
    case 'parse': return <Package size={14} />;
    case 'push_insw': return <Send size={14} />;
    case 'delete': return <Trash2 size={14} />;
    case 'config_change': return <SettingsIcon size={14} />;
    case 'edit': return <Edit size={14} />;
    default: return <AlertCircle size={14} />;
  }
}

function getActionStyle(action: string): { bg: string; color: string } {
  switch (action?.toLowerCase()) {
    case 'import': return { bg: '#2e7d3222', color: '#2e7d32' };
    case 'parse': return { bg: '#8b5cf622', color: '#8b5cf6' };
    case 'push_insw': return { bg: '#10b98122', color: '#10b981' };
    case 'delete': return { bg: '#ef444422', color: '#ef4444' };
    case 'config_change': return { bg: '#f59e0b22', color: '#f59e0b' };
    default: return { bg: '#64748b22', color: '#64748b' };
  }
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStatsDto | null>(null);
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [files, setFiles] = useState<ImportedFileDto[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [statsRes, logsRes, filesRes] = await Promise.all([
        getDashboardStats(),
        getAuditLogs(),
        getFiles(),
      ]);
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (logsRes.success && logsRes.data) setLogs(logsRes.data);
      if (filesRes.success && filesRes.data) setFiles(filesRes.data.filter(f => !f.isDeleted));
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);
  usePageVisible('/', loadDashboard);

  // Build chart data from files
  const parseStatusData: ChartDataItem[] = (() => {
    const success = files.filter(f => f.parseStatus === 'success').length;
    const failed = files.filter(f => f.parseStatus === 'failed').length;
    const pending = files.filter(f => f.parseStatus !== 'success' && f.parseStatus !== 'failed').length;
    const arr: ChartDataItem[] = [];
    if (success > 0) arr.push({ name: 'Parsed', value: success, color: '#10b981' });
    if (failed > 0) arr.push({ name: 'Failed', value: failed, color: '#ef4444' });
    if (pending > 0) arr.push({ name: 'Pending', value: pending, color: '#f59e0b' });
    return arr;
  })();

  const pushStatusData: ChartDataItem[] = (() => {
    const arr: ChartDataItem[] = [];
    if (stats) {
      if (stats.totalPushSuccess > 0) arr.push({ name: 'Push Success', value: stats.totalPushSuccess, color: '#10b981' });
      if (stats.totalPushFailed > 0) arr.push({ name: 'Push Failed', value: stats.totalPushFailed, color: '#ef4444' });
      const notPushed = stats.totalParsed - stats.totalPushSuccess - stats.totalPushFailed;
      if (notPushed > 0) arr.push({ name: 'Not Pushed', value: notPushed, color: '#64748b' });
    }
    return arr;
  })();

  // Recent activity — last 8 logs
  const recentLogs = logs.slice(0, 8);

  return (
    <div className="page">
      <Header title={t('nav.dashboard')} />
      <div className="page-body">

        {/* Summary stats */}
        <div className="stat-mini-row">
          <StatCard icon={FileText} label={t('dashboard.totalDocuments')} value={stats?.totalFiles ?? 0} color="#4f6ef7" loading={loading} />
          <StatCard icon={CheckCircle} label={t('dashboard.processed')} value={stats?.totalParsed ?? 0} color="#10b981" loading={loading} />
          <StatCard icon={Package} label={t('dashboard.totalItems', 'Total Items')} value={stats?.totalItems ?? 0} color="#8b5cf6" loading={loading} />
          <StatCard icon={Send} label={t('dashboard.pushSuccess', 'Push Success')} value={stats?.totalPushSuccess ?? 0} color="#06b6d4" loading={loading} />
          <StatCard icon={XCircle} label={t('dashboard.failed')} value={stats?.totalPushFailed ?? 0} color="#ef4444" loading={loading} />
        </div>

        {/* Donut charts */}
        <div className="charts-row">
          <DonutCard title={t('dashboard.fileParseStatus', 'File Parse Status')} data={parseStatusData} loading={loading} />
          <DonutCard title={t('dashboard.inswPushStatus', 'INSW Push Status')} data={pushStatusData} loading={loading} />
        </div>

        {/* Recent activity table */}
        <div className="card">
          <div className="card-header">
            <h3>{t('dashboard.recentActivity')}</h3>
            <button className="btn-secondary" onClick={loadDashboard} disabled={loading} style={{ padding: '4px 12px', fontSize: 12 }}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> {t('common.refresh')}
            </button>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 30 }}>
              <Loader size={24} className="spin" style={{ color: 'var(--accent)' }} />
            </div>
          ) : recentLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>
              {t('common.noData')}
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>{t('logs.user')}</th>
                  <th>{t('logs.action')}</th>
                  <th>{t('logs.entityType')}</th>
                  <th>{t('logs.detail')}</th>
                  <th>{t('logs.dateTime')}</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map(log => {
                  const style = getActionStyle(log.action);
                  return (
                    <tr key={log.logId}>
                      <td><strong>{log.username || '—'}</strong></td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: style.bg, color: style.color,
                        }}>
                          {getActionIcon(log.action)}
                          {log.action}
                        </span>
                      </td>
                      <td className="text-muted" style={{ textTransform: 'capitalize' }}>{log.entityType || '—'}</td>
                      <td className="text-muted" style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          )}
        </div>
      </div>
    </div>
  );
}
