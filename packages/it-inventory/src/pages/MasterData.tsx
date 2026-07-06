import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, FileText, Loader, Send, CheckCircle, XCircle, X } from 'lucide-react';
import Header from '../components/Header.tsx';
import { usePageVisible } from '../hooks/usePageVisible.ts';
import { getFiles, getFileDetail, savePushLog } from '../services/api.ts';
import type { FileDetailDto } from '../services/api.ts';
import { pushToInsw, buildInswRequestBody } from '../services/inswApi.ts';
import type { ParsedDataSuccess } from '../types/index.ts';
import { DataEvents } from '../utils/dataEvents.ts';

interface FlatItem {
  uid: string;
  fileId: number;
  fileName: string;
  itemNo: number;
  kodeHS: string;
  uraianBarang: string;
  kodeBarang: string;
  jumlah: string;
  satuan: string;
  harga: string;
  amount: string;
  nilaiPabean: string;
  negara: string;
  kategoriBarang: string;
  kondisiBarang: string;
  nomorPengajuan: string;
  tanggalPengajuan: string;
  nomorPendaftaran: string;
  tanggalPendaftaran: string;
}

interface PushResult {
  nomorPengajuan: string;
  itemCount: number;
  success: boolean;
  message: string;
  responseData?: unknown;
  showDetail?: boolean;
}

export default function MasterData() {
  const { t } = useTranslation();
  const [items, setItems] = useState<FlatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pushing, setPushing] = useState(false);
  const [pushResults, setPushResults] = useState<PushResult[] | null>(null);

  async function loadAllData() {
    setLoading(true);
    try {
      const filesRes = await getFiles();
      if (!filesRes.success || !filesRes.data) return;

      const parsed = filesRes.data.filter(f => f.parseStatus === 'success' && !f.isDeleted);
      const detailPromises = parsed.map(f => getFileDetail(f.fileId).catch(() => null));
      const details = await Promise.all(detailPromises);

      const allItems: FlatItem[] = [];
      details.forEach((res, idx) => {
        if (!res || !res.success || !res.data) return;
        const detail = res.data as FileDetailDto;
        const file = parsed[idx];
        detail.items.forEach((item, itemIdx) => {
          allItems.push({
            uid: `${file.fileId}-${item.itemNo}-${itemIdx}`,
            fileId: file.fileId,
            fileName: file.fileName,
            itemNo: item.itemNo,
            kodeHS: item.kodeHS,
            uraianBarang: item.uraianBarang,
            kodeBarang: item.kodeBarang,
            jumlah: item.jumlah,
            satuan: item.satuan,
            harga: item.harga,
            amount: item.amount,
            nilaiPabean: item.nilaiPabean,
            negara: item.negara,
            kategoriBarang: item.kategoriBarang || '',
            kondisiBarang: item.kondisiBarang || '',
            nomorPengajuan: detail.header?.nomorPengajuan || '',
            tanggalPengajuan: detail.header?.tanggalPengajuan || '',
            nomorPendaftaran: detail.header?.nomorPendaftaran || '',
            tanggalPendaftaran: detail.header?.tanggalPendaftaran || '',
          });
        });
      });

      setItems(allItems);
      setSelected(new Set());
    } catch (err) {
      console.error('Failed to load master data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAllData(); }, []);
  usePageVisible('/master-data', loadAllData);

  const filtered = search
    ? items.filter(item =>
        item.uraianBarang?.toLowerCase().includes(search.toLowerCase()) ||
        item.kodeHS?.toLowerCase().includes(search.toLowerCase()) ||
        item.kodeBarang?.toLowerCase().includes(search.toLowerCase()) ||
        item.fileName?.toLowerCase().includes(search.toLowerCase()) ||
        item.negara?.toLowerCase().includes(search.toLowerCase()) ||
        item.nomorPengajuan?.toLowerCase().includes(search.toLowerCase()) ||
        item.tanggalPendaftaran?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(page, totalPages);
  const paged = filtered.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const allPageSelected = paged.length > 0 && paged.every(item => selected.has(item.uid));
  const someSelected = selected.size > 0;

  function toggleSelect(uid: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function toggleSelectAll() {
    if (allPageSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        paged.forEach(item => next.delete(item.uid));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        paged.forEach(item => next.add(item.uid));
        return next;
      });
    }
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handlePushSelected() {
    const selectedItems = items.filter(item => selected.has(item.uid));
    if (selectedItems.length === 0) return;

    const groups = new Map<number, FlatItem[]>();
    selectedItems.forEach(item => {
      if (!groups.has(item.fileId)) groups.set(item.fileId, []);
      groups.get(item.fileId)!.push(item);
    });

    setPushing(true);
    setPushResults(null);
    const results: PushResult[] = [];
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    for (const [, groupItems] of groups) {
      const first = groupItems[0];
      const startTime = Date.now();

      const parsedData: ParsedDataSuccess = {
        success: true,
        fileName: first.fileName,
        parsedAt: new Date().toISOString(),
        header: {
          nomorPengajuan: first.nomorPengajuan,
          tanggalPengajuan: first.tanggalPengajuan,
          nomorPendaftaran: first.nomorPendaftaran,
          tanggalPendaftaran: first.tanggalPendaftaran,
        },
        items: groupItems.map(item => ({
          no: String(item.itemNo),
          kodeHS: item.kodeHS,
          uraianBarang: item.uraianBarang,
          kodeBarang: item.kodeBarang,
          jumlah: item.jumlah,
          satuan: item.satuan,
          harga: item.harga,
          amount: item.amount,
          nilaiPabean: item.nilaiPabean,
          negara: item.negara,
          kategoriBarang: item.kategoriBarang,
          kondisiBarang: item.kondisiBarang,
        })),
        _debug: { totalPages: 0, totalItems: groupItems.length, totalLines: 0, yTolerance: 0, colRanges: [], rawLines: [] },
      };

      try {
        const res = await pushToInsw(parsedData);
        const duration = Date.now() - startTime;
        const requestBody = JSON.stringify(buildInswRequestBody(parsedData));

        results.push({
          nomorPengajuan: `${first.fileName} — ${first.nomorPengajuan}`,
          itemCount: groupItems.length,
          success: res.success,
          message: res.success ? `HTTP ${res.status} — OK` : (res.error || `HTTP ${res.status}`),
          responseData: res.data,
        });

        await savePushLog({
          fileId: first.fileId,
          status: res.success ? 'success' : 'failed',
          httpStatus: res.status,
          requestBody,
          responseBody: JSON.stringify(res.data),
          errorMessage: res.error || null,
          duration,
        }, user.username || 'admin').catch(() => {});

      } catch (err) {
        results.push({
          nomorPengajuan: `${first.fileName} — ${first.nomorPengajuan}`,
          itemCount: groupItems.length,
          success: false,
          message: (err as Error).message || 'Network error',
        });
      }
    }

    setPushResults(results);
    setPushing(false);
    DataEvents.emit(DataEvents.PUSH_COMPLETED);
  }

  return (
    <div className="page">
      <Header title={t('nav.masterData')} />
      <div className="page-body">

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar-left">
            <FileText size={20} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600 }}>{t('nav.masterData')}</span>
            <span className="text-muted" style={{ fontSize: 13 }}>
              — {filtered.length} items
            </span>
            {someSelected && (
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: '#2e7d3222', color: '#2e7d32',
              }}>
                {selected.size} selected
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {someSelected && (
              <>
                <button className="btn-primary" onClick={handlePushSelected} disabled={pushing}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {pushing ? <Loader size={16} className="spin" /> : <Send size={16} />}
                  Push INSW ({selected.size})
                </button>
                <button className="btn-secondary" onClick={clearSelection} style={{ padding: '6px 10px' }}>
                  <X size={14} />
                </button>
              </>
            )}
            <input
              type="text"
              placeholder={t('common.search') + '...'}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ padding: '6px 12px', fontSize: 13, width: 200 }}
            />
            <button className="btn-secondary" onClick={loadAllData} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} /> {t('common.refresh')}
            </button>
          </div>
        </div>

        {/* Push results */}
        {pushResults && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong style={{ fontSize: 14 }}>
                Push Results — {pushResults.filter(r => r.success).length}/{pushResults.length} success
              </strong>
              <button className="icon-btn" onClick={() => setPushResults(null)} style={{ padding: 4 }}>
                <X size={16} />
              </button>
            </div>
            {pushResults.map((r, idx) => (
              <div key={idx} style={{
                borderBottom: idx < pushResults.length - 1 ? '1px solid var(--border-color)' : 'none',
                borderLeft: `3px solid ${r.success ? '#10b981' : '#ef4444'}`,
                padding: '10px 12px', marginBottom: 4, borderRadius: 4,
                background: r.success ? '#10b98108' : '#ef444408',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {r.success ? (
                    <CheckCircle size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                  ) : (
                    <XCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.nomorPengajuan}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {r.itemCount} items • {r.message}
                    </div>
                  </div>
                  {r.responseData != null && (
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }}
                      onClick={() => {
                        setPushResults(prev =>
                          prev ? prev.map((pr, i) => i === idx ? { ...pr, showDetail: !pr.showDetail } : pr) : null
                        );
                      }}>
                      {r.showDetail ? 'Hide' : 'View Detail'}
                    </button>
                  )}
                </div>
                {r.showDetail && r.responseData != null && (
                  <pre style={{
                    marginTop: 10, padding: 12, background: 'var(--bg)', borderRadius: 6,
                    fontSize: 11, overflow: 'auto', maxHeight: 250,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    color: r.success ? 'var(--text)' : '#ef4444',
                    border: '1px solid var(--border-color)',
                  }}>
                    {typeof r.responseData === 'string' ? r.responseData : JSON.stringify(r.responseData, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <Loader size={32} className="spin" style={{ margin: '0 auto', display: 'block', color: 'var(--accent)' }} />
            <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>{t('common.loading')}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</p>
          </div>
        ) : (
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', minHeight: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll}
                        style={{ cursor: 'pointer', width: 16, height: 16 }} />
                    </th>
                    <th style={{ width: 45 }}>#</th>
                    <th>File</th>
                    <th>No. Pengajuan</th>
                    <th>Released Date</th>
                    <th>Kode HS</th>
                    <th>Uraian Barang</th>
                    <th>Kategori</th>
                    <th>Kondisi</th>
                    <th>Kode Barang</th>
                    <th style={{ textAlign: 'right' }}>Jumlah</th>
                    <th>Satuan</th>
                    <th style={{ textAlign: 'right' }}>Harga</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'right' }}>Nilai Pabean</th>
                    <th>Negara</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((item, idx) => {
                    const rowNum = (safeCurrentPage - 1) * pageSize + idx + 1;
                    const isSelected = selected.has(item.uid);
                    return (
                      <tr key={item.uid} style={{ background: isSelected ? 'var(--primary)11' : undefined }}>
                        <td>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.uid)}
                            style={{ cursor: 'pointer', width: 16, height: 16 }} />
                        </td>
                        <td className="text-muted">{rowNum}</td>
                        <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }} title={item.fileName}>
                          {item.fileName}
                        </td>
                        <td style={{ fontSize: 12 }}>{item.nomorPengajuan || '—'}</td>
                        <td style={{ fontSize: 12 }}>{item.tanggalPendaftaran || '—'}</td>
                        <td><code style={{ fontSize: 12 }}>{item.kodeHS || '—'}</code></td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.uraianBarang}>
                          {item.uraianBarang || '—'}
                        </td>
                        <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }} title={item.kategoriBarang}>{item.kategoriBarang || '—'}</td>
                        <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }} title={item.kondisiBarang}>{item.kondisiBarang || '—'}</td>
                        <td><code style={{ fontSize: 12 }}>{item.kodeBarang || '—'}</code></td>
                        <td style={{ textAlign: 'right' }}>{item.jumlah || '—'}</td>
                        <td>{item.satuan || '—'}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{item.harga || '—'}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{item.amount || '—'}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{item.nilaiPabean || '—'}</td>
                        <td>{item.negara || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', borderTop: '1px solid var(--border-color)', fontSize: 13, flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                <span>Rows:</span>
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: 13, background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
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
                <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} disabled={safeCurrentPage <= 1} onClick={() => setPage(1)}>«</button>
                <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} disabled={safeCurrentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button>
                <span style={{ fontWeight: 600, minWidth: 40, textAlign: 'center' }}>{safeCurrentPage} / {totalPages}</span>
                <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} disabled={safeCurrentPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</button>
                <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} disabled={safeCurrentPage >= totalPages} onClick={() => setPage(totalPages)}>»</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
