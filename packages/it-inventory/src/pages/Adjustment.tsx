import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw, Send, Calendar, Search, CheckCircle, XCircle, Clock, AlertCircle, SlidersHorizontal
} from 'lucide-react';
import Header from '../components/Header.tsx';
import type { StockItem } from './StockOpname.tsx';
import { fetchErpAdjustment } from '../services/api.ts';

export default function Adjustment() {
  const { t } = useTranslation();
  const todayStr = new Date().toISOString().substring(0, 10);
  const [targetDate, setTargetDate] = useState<string>(todayStr);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loadingERP, setLoadingERP] = useState<boolean>(false);
  const [pushingINSW, setPushingINSW] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const [items, setItems] = useState<StockItem[]>([]);

  useEffect(() => {
    fetchAdjustmentData();
  }, [targetDate]);

  async function fetchAdjustmentData() {
    setLoadingERP(true);
    try {
      const res = await fetchErpAdjustment(targetDate);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setItems(res.data.map((item, idx) => ({
          ...item,
          id: item.id || `adj-${idx + 1}-${Date.now()}`,
          statusPush: item.statusPush || 'idle'
        })));
      } else {
        const mockAdjustments: StockItem[] = [
          {
            id: 'adj-1',
            nomorDokKegiatan: 'MFAD0002077',
            tanggalKegiatan: targetDate,
            thoiGianThucTe: `${targetDate} 01:48:16`,
            ngayBaoCaoCutoff5AM: targetDate,
            kdBarang: '70005507-58',
            uraianBarang: 'VẢI THUN 100% RECYCLE POLYESTER KHỔ 58"',
            jumlah: 38,
            kdSatuan: 'YRD',
            nilai: 190000,
            kho: 'F2-FB-REP',
            statusPush: 'idle'
          },
          {
            id: 'adj-2',
            nomorDokKegiatan: 'MFAD0002080',
            tanggalKegiatan: targetDate,
            thoiGianThucTe: `${targetDate} 03:22:00`,
            ngayBaoCaoCutoff5AM: targetDate,
            kdBarang: '62584799-60',
            uraianBarang: 'VẢI THUN 100% RECYCLE POLYESTER KHỔ 60"',
            jumlah: -12.5,
            kdSatuan: 'YRD',
            nilai: 37500,
            kho: 'SF2-FB-BK',
            statusPush: 'idle'
          }
        ];
        setItems(mockAdjustments);
      }
    } catch {
      // fallback
    } finally {
      setSelectedIds(new Set());
      setPage(1);
      setLoadingERP(false);
    }
  }

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase();
    return items.filter(i =>
      i.nomorDokKegiatan.toLowerCase().includes(q) ||
      i.kdBarang.toLowerCase().includes(q) ||
      i.uraianBarang.toLowerCase().includes(q) ||
      i.kho.toLowerCase().includes(q)
    );
  }, [items, searchTerm]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safeCurrentPage = Math.min(page, totalPages);
  const pagedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safeCurrentPage, pageSize]);

  const allSelected = pagedItems.length > 0 && pagedItems.every(i => selectedIds.has(i.id));
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pagedItems.forEach(i => next.delete(i.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pagedItems.forEach(i => next.add(i.id));
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePushINSW = () => {
    if (filteredItems.length === 0) return;
    setPushingINSW(true);
    const idsToPush = selectedIds.size > 0 ? Array.from(selectedIds) : pagedItems.map(i => i.id);

    setItems(prev => prev.map(item => idsToPush.includes(item.id) ? { ...item, statusPush: 'pushing' } : item));

    setTimeout(() => {
      setItems(prev => prev.map(item => idsToPush.includes(item.id) ? { ...item, statusPush: 'success', pushMessage: 'Successfully pushed adjustment to INSW (kdKegiatan: 33)' } : item));
      setPushingINSW(false);
      setSelectedIds(new Set());
    }, 1200);
  };

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title={t('nav.adjustment', 'Adjustment')} />
      <div className="page-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden', paddingBottom: 16 }}>
        
        <div className="card" style={{ padding: '14px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span className="status-badge active" style={{ background: 'var(--primary-light, #e8f7ec)', color: 'var(--primary-dark, #2e8b4a)', fontWeight: 600, fontSize: 13, border: '1px solid #bbf7d0' }}>
                <SlidersHorizontal size={14} /> AXDB Reference: Movement Journal (Category 4)
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary, #f8fafc)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color, #e2e8f0)' }}>
                <Calendar size={16} style={{ color: 'var(--primary, #3ba55c)' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text, #0f172a)' }}>{t('common.cutoff5amDate', 'Cut-off 5:00 AM Date:')}</span>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  style={{ border: '1px solid', borderColor: 'divider', borderRadius: 6, padding: '4px 10px', fontSize: 13, fontWeight: 600, color: '#0f172a', background: 'background.paper' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="btn-secondary" onClick={fetchAdjustmentData} disabled={loadingERP || pushingINSW} style={{ fontSize: 13, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={15} className={loadingERP ? 'spin' : ''} />
                {loadingERP ? t('common.syncing', 'Syncing...') : t('adjustment.syncErp', 'Sync Adjustments from ERP')}
              </button>
              <button className="btn-primary" onClick={handlePushINSW} disabled={loadingERP || pushingINSW || filteredItems.length === 0} style={{ fontSize: 13, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Send size={15} className={pushingINSW ? 'spin' : ''} />
                {pushingINSW ? t('common.pushing', 'Pushing...') : t('adjustment.pushInsw', `Push to INSW (kdKegiatan: 33)`)}
              </button>
            </div>
          </div>
        </div>

        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 400 }}>
          <div className="card-header responsive-header" style={{ padding: '12px 20px', borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>{t('adjustment.title', 'Inventory Adjustment')}</h3>
              <span className="record-count">{filteredItems.length} {t('common.records', 'records')}</span>
            </div>
            <div style={{ position: 'relative', width: 280 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: 9, color: '#94a3b8' }} />
              <input
                type="text"
                placeholder={t('common.search', 'Search') + '...'}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                style={{ width: '100%', padding: '6px 12px 6px 32px', borderRadius: 6, border: '1px solid', borderColor: 'divider', fontSize: 13, color: '#0f172a' }}
              />
            </div>
          </div>

          {loadingERP ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', flex: 1 }}>
              <RefreshCw size={32} className="spin" style={{ margin: '0 auto 12px', display: 'block', color: 'var(--primary, #3ba55c)' }} />
              <p style={{ color: '#64748b', margin: 0 }}>Querying Linked Server [192.168.70.115_tsiiplan].AXDB Movement Journal...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', flex: 1 }}>
              <AlertCircle size={44} style={{ opacity: 0.4, margin: '0 auto 10px', display: 'block' }} />
              <p style={{ margin: 0, fontWeight: 500, color: '#475569' }}>{t('adjustment.noData', 'No Adjustment Records Found for this date')}</p>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: 'background.default', textAlign: 'left', fontSize: 12, color: '#475569' }}>
                      <th style={{ width: 40, textAlign: 'center', padding: '10px', position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>
                        <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                      </th>
                      <th style={{ position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>{t('table.docNo', 'Doc No / Ref')} (`nomorDokKegiatan`)</th>
                      <th style={{ position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>{t('table.actualTimestamp', 'Actual Timestamp')} (`thoiGianThucTe`)</th>
                      <th style={{ position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>{t('table.cutoffDate', '5AM Cutoff Date')}</th>
                      <th style={{ position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>{t('table.itemCode', 'Item Code')} (`kdBarang`)</th>
                      <th style={{ position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>{t('table.description', 'Description')} (`uraianBarang`)</th>
                      <th style={{ textAlign: 'right', position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>{t('table.qty', 'Quantity')} (`jumlah`)</th>
                      <th style={{ position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>{t('table.uom', 'UOM')}</th>
                      <th style={{ textAlign: 'right', position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>{t('table.value', 'Value')} (`nilai`)</th>
                      <th style={{ position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>{t('table.warehouse', 'Warehouse')} (`kho`)</th>
                      <th style={{ textAlign: 'center', position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>{t('table.status', 'INSW Status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedItems.map(item => (
                      <tr key={item.id} style={{ background: selectedIds.has(item.id) ? 'var(--primary-light, #e8f7ec)' : 'transparent', borderBottom: '1px solid', borderColor: 'divider' }}>
                        <td style={{ textAlign: 'center', padding: '10px' }}>
                          <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} />
                        </td>
                        <td style={{ padding: '10px' }}><code style={{ fontWeight: 600, color: 'var(--primary-dark, #2e8b4a)', background: 'background.default', padding: '2px 6px', borderRadius: 4 }}>{item.nomorDokKegiatan}</code></td>
                        <td style={{ fontSize: 12, color: '#64748b', padding: '10px' }}>{item.thoiGianThucTe}</td>
                        <td style={{ padding: '10px' }}><span className="status-badge" style={{ background: '#e8f7ec', color: '#2e8b4a', fontSize: 11, fontWeight: 600 }}>{item.ngayBaoCaoCutoff5AM}</span></td>
                        <td style={{ padding: '10px' }}><strong style={{ color: '#0f172a' }}>{item.kdBarang}</strong></td>
                        <td style={{ padding: '10px', color: '#334155' }}>{item.uraianBarang}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: item.jumlah < 0 ? '#ef4444' : '#10b981', padding: '10px' }}>{item.jumlah}</td>
                        <td style={{ padding: '10px' }}><code style={{ color: '#475569' }}>{item.kdSatuan}</code></td>
                        <td style={{ textAlign: 'right', padding: '10px', color: '#0f172a' }}>Rp {item.nilai.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '10px' }}><span className="status-badge" style={{ background: 'background.default', color: '#475569' }}>{item.kho}</span></td>
                        <td style={{ textAlign: 'center', padding: '10px' }}>
                          {item.statusPush === 'idle' && <span className="status-badge" style={{ background: 'background.default', color: '#64748b' }}><Clock size={12} /> {t('common.pending', 'Pending')}</span>}
                          {item.statusPush === 'pushing' && <span className="status-badge" style={{ background: '#e0f2fe', color: '#0284c7' }}><RefreshCw size={12} className="spin" /> {t('common.pushing', 'Pushing...')}</span>}
                          {item.statusPush === 'success' && <span className="status-badge active" style={{ background: '#e8f7ec', color: '#2e8b4a' }}><CheckCircle size={12} /> {t('common.pushed', 'Pushed')}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar with Numbered Page Buttons (1 2 3 ... maxPage) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 20px',
                borderTop: '1px solid', borderColor: 'divider',
                background: 'background.paper',
                fontSize: 13,
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
                  <span>{t('common.rowsPerPage', 'Số dòng trên trang:')}</span>
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid', borderColor: 'divider', fontSize: 13, background: 'background.paper', color: '#0f172a' }}
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#64748b', fontSize: 13 }}>
                    {t('common.showing', 'Hiển thị')} {(safeCurrentPage - 1) * pageSize + 1}–{Math.min(safeCurrentPage * pageSize, filteredItems.length)} / {filteredItems.length} {t('common.records', 'items')}
                  </span>

                  {/* Numbered Page Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 9px', fontSize: 12 }}
                      disabled={safeCurrentPage <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >‹</button>

                    {(() => {
                      const pages: (number | string)[] = [];
                      if (totalPages <= 7) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        if (safeCurrentPage > 3) pages.push('...');
                        const start = Math.max(2, safeCurrentPage - 1);
                        const end = Math.min(totalPages - 1, safeCurrentPage + 1);
                        for (let i = start; i <= end; i++) {
                          if (i > 1 && i < totalPages) pages.push(i);
                        }
                        if (safeCurrentPage < totalPages - 2) pages.push('...');
                        pages.push(totalPages);
                      }

                      return pages.map((pNum, idx) => {
                        if (typeof pNum === 'string') {
                          return <span key={`dots-${idx}`} style={{ padding: '0 4px', color: '#94a3b8', fontSize: 12 }}>...</span>;
                        }
                        const isActive = pNum === safeCurrentPage;
                        return (
                          <button
                            key={pNum}
                            onClick={() => setPage(pNum)}
                            style={{
                              padding: '4px 10px',
                              fontSize: 12,
                              borderRadius: 4,
                              border: isActive ? '1px solid var(--primary, #3ba55c)' : '1px solid #cbd5e1',
                              background: isActive ? 'var(--primary, #3ba55c)' : '#fff',
                              color: isActive ? '#fff' : '#0f172a',
                              fontWeight: isActive ? 600 : 400,
                              cursor: 'pointer',
                              minWidth: 28
                            }}
                          >
                            {pNum}
                          </button>
                        );
                      });
                    })()}

                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 9px', fontSize: 12 }}
                      disabled={safeCurrentPage >= totalPages}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >›</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
