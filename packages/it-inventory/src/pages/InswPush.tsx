import { useState, useEffect } from 'react';
import { usePageVisible } from '../hooks/usePageVisible.ts';
import { useTranslation } from 'react-i18next';
import {
  Send, CheckCircle, XCircle, Clock, Loader,
  RefreshCw, FileText, AlertCircle, X,
} from 'lucide-react';
import Header from '../components/Header.tsx';
import { getFiles } from '../services/api.ts';
import type { ImportedFileDto, PushLogDto } from '../services/api.ts';
import { usePush } from '../contexts/PushContext.tsx';

// ─── Component ───────────────────────────────────────────────
export default function InswPush() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<ImportedFileDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [viewResponse, setViewResponse] = useState<PushLogDto | null>(null);

  // Global push state from context — survives navigation
  const { pushStates, pushFile, pushFiles, loadHistory, historyLoaded } = usePush();

  const username = JSON.parse(localStorage.getItem('user') || '{}').username || 'system';

  // Load files AND push history
  async function loadFiles(): Promise<void> {
    setLoading(true);
    try {
      const filesRes = await getFiles();
      if (filesRes.success && filesRes.data) {
        setFiles(filesRes.data.filter(f => f.parseStatus === 'success'));
      }
      // Load history only once (context handles dedup)
      if (!historyLoaded) await loadHistory();
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFiles(); }, []);

  // Auto-refresh when navigating back to this page
  usePageVisible('/insw-push', loadFiles);

  // Pushable = not yet pushed or failed
  const pushableFiles = files.filter(f => {
    const ps = pushStates[f.fileId];
    return !ps || ps.status === 'idle' || ps.status === 'failed';
  });
  const selectedPushable = pushableFiles.filter(f => selected.has(f.fileId));
  const allPushableSelected = pushableFiles.length > 0 && pushableFiles.every(f => selected.has(f.fileId));

  function toggleSelectAll(): void {
    if (allPushableSelected) setSelected(new Set());
    else setSelected(new Set(pushableFiles.map(f => f.fileId)));
  }

  function toggleSelect(id: number): void {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Push single file via context (runs in background)
  function handlePush(file: ImportedFileDto): void {
    pushFile(file.fileId, username, file.fileType);
  }

  // Push selected files via context (runs in background)
  function handlePushSelected(): void {
    if (!selectedPushable.length) return;
    // Build fileType map so each file uses its correct kdKegiatan
    const fileTypeMap: Record<number, string> = {};
    for (const f of selectedPushable) {
      if (f.fileType) fileTypeMap[f.fileId] = f.fileType;
    }
    pushFiles(selectedPushable.map(f => f.fileId), username, fileTypeMap);
    setSelected(new Set());
  }

  // Status badge
  function statusBadge(fileId: number) {
    const ps = pushStates[fileId];
    if (!ps || ps.status === 'idle')
      return <span className="status-badge" style={{ background: '#e8eaf6', color: '#5c6bc0' }}><Clock size={12} /> {t('inswPush.pending')}</span>;
    if (ps.status === 'pushing')
      return <span className="status-badge" style={{ background: '#e3f2fd', color: '#1565c0' }}><Loader size={12} className="spin" /> {t('inswPush.pushing')}</span>;
    if (ps.status === 'success') {
      const errorMsg = ps.response?.errorMessage || ps.response?.responseBody || '';
      const isAlreadySent = errorMsg.toLowerCase().includes('sudah pernah dikirim');
      if (isAlreadySent) {
        return <span className="status-badge" style={{ background: '#e8f5e9', color: '#2e7d32' }} title={errorMsg}><CheckCircle size={12} /> {t('inswPush.alreadySent', 'Already Sent')}</span>;
      }
      return <span className="status-badge active"><CheckCircle size={12} /> {t('inswPush.success')}</span>;
    }
    return <span className="status-badge" style={{ background: '#ffeaea', color: '#d32f2f' }}><XCircle size={12} /> {t('inswPush.failed')}</span>;
  }

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="page">
      <Header title={t('inswPush.title', 'INSW Push')} />
      <div className="page-body">

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar-left">
            <Send size={20} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600 }}>{t('inswPush.subtitle', 'Push parsed documents to INSW API')}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={loadFiles} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} /> {t('common.refresh', 'Refresh')}
            </button>
            {selectedPushable.length > 0 && (
              <button className="btn-primary" onClick={handlePushSelected}>
                <Send size={16} /> {t('inswPush.pushSelected')} ({selectedPushable.length})
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <Loader size={32} className="spin" style={{ margin: '0 auto', display: 'block', color: 'var(--accent)' }} />
            <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>{t('common.loading', 'Loading…')}</p>
          </div>
        ) : files.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <AlertCircle size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: 'var(--text-muted)' }}>{t('inswPush.noFiles', 'No parsed files available for push.')}</p>
          </div>
        ) : (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" checked={allPushableSelected} onChange={toggleSelectAll} />
                  </th>
                  <th>{t('inswPush.fileName')}</th>
                  <th>Type</th>
                  <th>{t('inswPush.items')}</th>
                  <th>{t('inswPush.importedAt')}</th>
                  <th>{t('inswPush.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {files.length === 0 && (
                  <tr><td colSpan={7} className="empty-row">{t('common.noData')}</td></tr>
                )}
                {files.map((file, _idx) => {
                  const ps = pushStates[file.fileId];
                  const isPushable = !ps || ps.status === 'idle' || ps.status === 'failed';
                  const typeLabels: Record<string, string> = {
                    pemasukan: 'Pemasukan',
                    pengeluaran: 'Pengeluaran',
                    stock_opname: 'Stock Opname',
                    adjustment: 'Adjustment',
                  };
                  const typeColors: Record<string, string> = {
                    pemasukan: '#10b981',
                    pengeluaran: '#f59e0b',
                    stock_opname: '#6366f1',
                    adjustment: '#ec4899',
                  };
                  const ft = file.fileType || 'pemasukan';
                  return (
                    <tr key={file.fileId}>
                      <td>
                        {isPushable && (
                          <input
                            type="checkbox"
                            checked={selected.has(file.fileId)}
                            onChange={() => toggleSelect(file.fileId)}
                          />
                        )}
                      </td>
                      <td>
                        <FileText size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom', color: 'var(--text-muted)' }} />
                        <strong>{file.fileName}</strong>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                          fontSize: 11, fontWeight: 600, color: '#fff',
                          background: typeColors[ft] || '#64748b',
                        }}>
                          {typeLabels[ft] || ft}
                        </span>
                      </td>
                      <td className="text-muted">{file.totalItems}</td>
                      <td className="text-muted">{file.importedAt ? new Date(file.importedAt).toLocaleString() : '—'}</td>
                      <td>{statusBadge(file.fileId)}</td>
                      <td>
                        <div className="action-btns">
                          {isPushable && (
                            <button
                              className="btn-primary"
                              style={{ fontSize: 12, padding: '4px 10px' }}
                              onClick={() => handlePush(file)}
                              disabled={ps?.status === 'pushing'}
                            >
                              <Send size={12} /> {t('inswPush.push')}
                            </button>
                          )}
                          {ps?.response && (
                            <button
                              className="icon-btn-sm"
                              title={t('common.viewDetail')}
                              onClick={() => setViewResponse(ps.response!)}
                            >
                              <AlertCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Response Modal ─── */}
      {viewResponse && (
        <div className="modal-overlay" onClick={() => setViewResponse(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h3>{t('inswPush.responseDetail')}</h3>
              <button className="icon-btn" onClick={() => setViewResponse(null)}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              {/* Status banner */}
              {(() => {
                const errorMsg = viewResponse.errorMessage || viewResponse.responseBody || '';
                const isAlreadySent = errorMsg.toLowerCase().includes('sudah pernah dikirim');
                return (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: viewResponse.status === 'success' ? '#e8f5e9' : '#ffeaea',
                    color: viewResponse.status === 'success' ? '#2e7d32' : '#d32f2f',
                    fontWeight: 600,
                    fontSize: 14,
                  }}>
                    {viewResponse.status === 'success' ? (
                      isAlreadySent ? (
                        <><CheckCircle size={18} /> {t('inswPush.alreadySent', 'Data already sent to INSW')}</>
                      ) : (
                        <><CheckCircle size={18} /> {t('inswPush.pushSuccessful')}</>
                      )
                    ) : (
                      <><XCircle size={18} /> {t('inswPush.pushFailed')}</>
                    )}
                  </div>
                );
              })()}

              {/* Info grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px 20px',
                marginBottom: 16,
                fontSize: 13,
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('inswPush.pushId')}</span>
                  <p style={{ margin: '2px 0', fontWeight: 500 }}>#{viewResponse.pushId}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('inswPush.httpStatus')}</span>
                  <p style={{ margin: '2px 0', fontWeight: 500 }}>{viewResponse.httpStatus || '—'}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('inswPush.pushedBy')}</span>
                  <p style={{ margin: '2px 0', fontWeight: 500 }}>{viewResponse.pushedBy}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('inswPush.duration')}</span>
                  <p style={{ margin: '2px 0', fontWeight: 500 }}>{viewResponse.duration ? `${(viewResponse.duration / 1000).toFixed(1)}s` : '—'}</p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('inswPush.pushedAt')}</span>
                  <p style={{ margin: '2px 0', fontWeight: 500 }}>{viewResponse.pushedAt ? new Date(viewResponse.pushedAt).toLocaleString() : '—'}</p>
                </div>
              </div>

              {/* Error message */}
              {viewResponse.errorMessage && (
                <div style={{ marginBottom: 16 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('inswPush.errorMessage')}</span>
                  <div style={{
                    marginTop: 4,
                    padding: '8px 12px',
                    background: '#fff3f3',
                    borderRadius: 6,
                    border: '1px solid #ffcdd2',
                    color: '#c62828',
                    fontSize: 13,
                    wordBreak: 'break-word',
                  }}>
                    {viewResponse.errorMessage}
                  </div>
                </div>
              )}

              {/* Response body */}
              {viewResponse.responseBody && (
                <details style={{ marginBottom: 12 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                    {t('inswPush.responseBody')}
                  </summary>
                  <pre style={{
                    background: 'var(--bg-secondary, #f5f5f5)',
                    padding: 12,
                    borderRadius: 6,
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 200,
                    overflow: 'auto',
                    margin: '4px 0 0',
                  }}>
                    {(() => { try { return JSON.stringify(JSON.parse(viewResponse.responseBody), null, 2); } catch { return viewResponse.responseBody; } })()}
                  </pre>
                </details>
              )}

              {/* Request body */}
              {viewResponse.requestBody && (
                <details>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                    {t('inswPush.requestBody')}
                  </summary>
                  <pre style={{
                    background: 'var(--bg-secondary, #f5f5f5)',
                    padding: 12,
                    borderRadius: 6,
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 200,
                    overflow: 'auto',
                    margin: '4px 0 0',
                  }}>
                    {(() => { try { return JSON.stringify(JSON.parse(viewResponse.requestBody), null, 2); } catch { return viewResponse.requestBody; } })()}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
