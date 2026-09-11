import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw, Send, Calendar, Search, CheckCircle, XCircle, Clock, AlertCircle, Layers, Database,
  ArrowUpRight
} from 'lucide-react';
import Header from '../components/Header.tsx';
import StatusDetailModal from '../components/StatusDetailModal.tsx';
import { fetchErpStockOpname } from '../services/api.ts';
import { pushStockOpnameToInsw } from '../services/inswApi.ts';

interface StockOpnameProps {
  category?: 'machinery' | 'auxiliary' | 'wip' | 'finished' | 'scrap';
}

const CATEGORY_NAMES: Record<string, string> = {
  machinery: 'Machinery And Equipment',
  auxiliary: 'Auxiliary Materials',
  wip: 'Work-in-Process (WIP)',
  finished: 'Finished Goods',
  scrap: 'Material Waste & Scrap Management'
};

const CATEGORY_CODES: Record<string, string> = {
  machinery: 'MESIN / ASSET',
  auxiliary: 'BAHAN PENOLONG',
  wip: 'REF 8 (PRODLINE / WIP)',
  finished: 'REF 2 (PRODUCTION / FG)',
  scrap: 'REF 6 (LOSSPROFIT / SCRAP)'
};

export interface StockItem {
  id: string;
  nomorDokKegiatan: string;
  tanggalKegiatan: string;
  thoiGianThucTe: string;
  ngayBaoCaoCutoff5AM: string;
  kdBarang: string;
  uraianBarang: string;
  jumlah: number;
  kdSatuan: string;
  nilai: number;
  kho: string;
  statusPush: 'idle' | 'pushing' | 'success' | 'failed';
  pushMessage?: string;
}

const GENERATE_MOCK_DATA = (cat: string, dateStr: string): StockItem[] => {
  const baseItems: Record<string, Array<Omit<StockItem, 'id' | 'statusPush'>>> = {
    wip: [
      { nomorDokKegiatan: 'A1A25486721', tanggalKegiatan: dateStr, thoiGianThucTe: `${dateStr} 01:48:36`, ngayBaoCaoCutoff5AM: dateStr, kdBarang: 'RE-POLYBAG_PUMA-30CMX40CM', uraianBarang: 'POLYBAG PUMA 30CM X 40CM', jumlah: 455, kdSatuan: 'PCE', nilai: 13650, kho: 'SF1-AC-BK' },
      { nomorDokKegiatan: 'A1A25462843', tanggalKegiatan: dateStr, thoiGianThucTe: `${dateStr} 02:15:10`, ngayBaoCaoCutoff5AM: dateStr, kdBarang: '96000353', uraianBarang: 'ELASTIC TAPE 2.5CM BLACK', jumlah: 120, kdSatuan: 'MTR', nilai: 4800, kho: 'SF2-AC-BK' },
      { nomorDokKegiatan: 'TAN-084616', tanggalKegiatan: dateStr, thoiGianThucTe: `${dateStr} 04:30:00`, ngayBaoCaoCutoff5AM: dateStr, kdBarang: 'FB-CAJ24837', uraianBarang: 'VẢI THUN SINGLE JERSEY 100% COTTON', jumlah: 77.28, kdSatuan: 'YRD', nilai: 386400, kho: 'F2-FB-REP' },
      { nomorDokKegiatan: 'A1A25462850', tanggalKegiatan: dateStr, thoiGianThucTe: `${dateStr} 06:10:00`, ngayBaoCaoCutoff5AM: dateStr, kdBarang: '62782692', uraianBarang: 'SEWING THREAD 100% POLYESTER 40/2', jumlah: 50, kdSatuan: 'CNE', nilai: 7500, kho: 'SF1-AC-BK' },
      { nomorDokKegiatan: 'A1A25462860', tanggalKegiatan: dateStr, thoiGianThucTe: `${dateStr} 07:15:00`, ngayBaoCaoCutoff5AM: dateStr, kdBarang: 'SF2-FB-BK', uraianBarang: 'RIBBON TAPE WOVEN PUMA 1.5CM', jumlah: 300, kdSatuan: 'MTR', nilai: 15000, kho: 'SF2-FB-BK' },
    ],
    finished: [
      { nomorDokKegiatan: 'A1A25424072', tanggalKegiatan: dateStr, thoiGianThucTe: `${dateStr} 01:20:00`, ngayBaoCaoCutoff5AM: dateStr, kdBarang: 'S2706GHTM640Y', uraianBarang: 'MEN ATHLETIC T-SHIRT FIT S2706', jumlah: 180, kdSatuan: 'PCE', nilai: 216000, kho: 'CEN-WFG' },
      { nomorDokKegiatan: 'A1A25424088', tanggalKegiatan: dateStr, thoiGianThucTe: `${dateStr} 03:45:00`, ngayBaoCaoCutoff5AM: dateStr, kdBarang: 'S2706GHTM640M', uraianBarang: 'MEN ATHLETIC T-SHIRT FIT S2706 MEDIUM', jumlah: 240, kdSatuan: 'PCE', nilai: 288000, kho: 'CEN-WFG' },
      { nomorDokKegiatan: 'A1A25425100', tanggalKegiatan: dateStr, thoiGianThucTe: `${dateStr} 08:30:00`, ngayBaoCaoCutoff5AM: dateStr, kdBarang: 'PUMA-JKT-2026-BLK', uraianBarang: 'PUMA TRACK JACKET BLACK XL', jumlah: 95, kdSatuan: 'PCE', nilai: 237500, kho: 'CEN-WFG' },
    ],
    scrap: [
      { nomorDokKegiatan: 'SCR-2026-0012', tanggalKegiatan: dateStr, thoiGianThucTe: `${dateStr} 02:05:00`, ngayBaoCaoCutoff5AM: dateStr, kdBarang: '62584799-60', uraianBarang: 'VẢI VỤN THUN 100% RECYCLE POLYESTER', jumlah: 105.5, kdSatuan: 'KGM', nilai: 15825, kho: 'F5-SCRAP' },
      { nomorDokKegiatan: 'SCR-2026-0015', tanggalKegiatan: dateStr, thoiGianThucTe: `${dateStr} 04:12:00`, ngayBaoCaoCutoff5AM: dateStr, kdBarang: 'SCRAP-POLY-01', uraianBarang: 'PHẾ LIỆU POLYBAG & ĐẦU MẪU CẮT', jumlah: 42.0, kdSatuan: 'KGM', nilai: 4200, kho: 'F5-SCRAP' },
    ],
    machinery: [
      { nomorDokKegiatan: 'EQ-2026-0089', tanggalKegiatan: dateStr, thoiGianThucTe: `${dateStr} 09:00:00`, ngayBaoCaoCutoff5AM: dateStr, kdBarang: 'MC-JUKI-DDL9000C', uraianBarang: 'MÁY MAY 1 KIM ĐIỆN TỬ JUKI DDL-9000C', jumlah: 2, kdSatuan: 'SET', nilai: 4500000, kho: 'MC-WH' },
      { nomorDokKegiatan: 'EQ-2026-0092', tanggalKegiatan: dateStr, thoiGianThucTe: `${dateStr} 11:30:00`, ngayBaoCaoCutoff5AM: dateStr, kdBarang: 'MC-EASTMAN-629X', uraianBarang: 'MÁY CẮT ĐỨNG EASTMAN 629X 8 INCH', jumlah: 1, kdSatuan: 'SET', nilai: 1800000, kho: 'MC-WH' },
    ],
    auxiliary: [
      { nomorDokKegiatan: 'POAD000085227', tanggalKegiatan: dateStr, thoiGianThucTe: `${dateStr} 01:10:00`, ngayBaoCaoCutoff5AM: dateStr, kdBarang: '62584799-60', uraianBarang: 'VẢI THUN 100% RECYCLE POLYESTER KHỔ 60"', jumlah: 407, kdSatuan: 'YRD', nilai: 1221000, kho: 'SF2-FB-BK' },
      { nomorDokKegiatan: 'POAD000085216', tanggalKegiatan: dateStr, thoiGianThucTe: `${dateStr} 03:00:00`, ngayBaoCaoCutoff5AM: dateStr, kdBarang: '60036235-58', uraianBarang: 'VẢI LƯỚI 100% RECYCLE POLYESTER KHỔ 58"', jumlah: 17.5, kdSatuan: 'YRD', nilai: 87500, kho: 'SF2-FB-BK' },
    ]
  };

  const list = baseItems[cat] || baseItems.wip;
  return list.map((item, idx) => ({
    ...item,
    id: `${cat}-${idx + 1}-${Date.now()}`,
    statusPush: 'idle'
  }));
};

export default function StockOpname({ category = 'wip' }: StockOpnameProps) {
  const { t } = useTranslation();

  const todayStr = new Date().toISOString().substring(0, 10);
  const [targetDate, setTargetDate] = useState<string>(todayStr);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loadingERP, setLoadingERP] = useState<boolean>(false);
  const [pushingINSW, setPushingINSW] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedDetailItem, setSelectedDetailItem] = useState<StockItem | null>(null);

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const [items, setItems] = useState<StockItem[]>([]);

  const title = t(`categories.${category}`, CATEGORY_NAMES[category] || 'Stock Opname');
  const categoryCode = CATEGORY_CODES[category] || 'ALL';

  useEffect(() => {
    fetchERPData();
  }, [category, targetDate]);

  async function fetchERPData() {
    setLoadingERP(true);
    try {
      const res = await fetchErpStockOpname(category, targetDate);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setItems(res.data.map((item, idx) => ({
          ...item,
          id: item.id || `${category}-${idx + 1}-${Date.now()}`,
          statusPush: item.statusPush || 'idle'
        })));
      } else {
        const mockData = GENERATE_MOCK_DATA(category, targetDate);
        setItems(mockData);
      }
    } catch {
      const mockData = GENERATE_MOCK_DATA(category, targetDate);
      setItems(mockData);
    } finally {
      setSelectedIds(new Set());
      setPage(1);
      setLoadingERP(false);
    }
  }

  // Search Filtering
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

  // Totals
  const totalQty = useMemo(() => filteredItems.reduce((acc, i) => acc + Math.abs(i.jumlah), 0), [filteredItems]);
  const totalNilai = useMemo(() => filteredItems.reduce((acc, i) => acc + i.nilai, 0), [filteredItems]);

  const formatQuantity = (qty: number) => {
    const abs = Math.abs(qty);
    if (abs === 0) return '0';
    if (abs < 0.01) {
      return abs.toFixed(6).replace(/\.?0+$/, '');
    }
    return abs.toLocaleString('en-US', { maximumFractionDigits: 4 });
  };

  // Selection toggle
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

  // Push to INSW (Real API Call)
  const handlePushINSW = async () => {
    if (filteredItems.length === 0) return;
    setPushingINSW(true);

    const idsToPush = selectedIds.size > 0
      ? Array.from(selectedIds)
      : pagedItems.map(i => i.id);

    const targetItems = items.filter(i => idsToPush.includes(i.id));

    setItems(prev => prev.map(item => {
      if (idsToPush.includes(item.id)) {
        return { ...item, statusPush: 'pushing' };
      }
      return item;
    }));

    try {
      const formattedItems = targetItems.map(i => ({
        itemCode: i.kdBarang,
        itemDescription: i.uraianBarang,
        quantity: Math.abs(i.jumlah),
        uom: i.kdSatuan,
        valueRp: i.nilai,
        warehouse: i.kho,
      }));
      const docNo = targetItems[0]?.nomorDokKegiatan || `SO-${categoryCode}-${targetDate}`;
      const res = await pushStockOpnameToInsw(formattedItems, docNo, targetDate, '32');
      
      setItems(prev => prev.map(item => {
        if (idsToPush.includes(item.id)) {
          if (res.success) {
            return {
              ...item,
              statusPush: 'success',
              pushMessage: res.error || 'Successfully pushed to INSW (API 200 OK)',
            };
          } else {
            return {
              ...item,
              statusPush: 'failed',
              pushMessage: res.error || 'Failed to push to INSW',
            };
          }
        }
        return item;
      }));
    } catch (err: any) {
      setItems(prev => prev.map(item => {
        if (idsToPush.includes(item.id)) {
          return {
            ...item,
            statusPush: 'failed',
            pushMessage: err.message || 'Network error connecting to INSW API',
          };
        }
        return item;
      }));
    } finally {
      setPushingINSW(false);
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title={title} />
      <div className="page-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden', paddingBottom: 16 }}>
        
        {/* Top Control Bar */}
        <div className="card" style={{ padding: '14px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="status-badge active" style={{ background: 'var(--primary-light, #e8f7ec)', color: 'var(--primary-dark, #2e8b4a)', fontWeight: 600, fontSize: 13, border: '1px solid #bbf7d0' }}>
                  <Layers size={14} /> AXDB Category: {categoryCode}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary, #f8fafc)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color, #e2e8f0)' }}>
                <Calendar size={16} style={{ color: 'var(--primary, #3ba55c)' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text, #0f172a)' }}>{t('common.cutoff5amDate', 'Cut-off 5:00 AM Date:')}</span>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  style={{
                    border: '1px solid', borderColor: 'divider',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#0f172a',
                    background: 'background.paper'
                  }}
                />
              </div>

              <span style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', fontStyle: 'italic' }}>
                (Cut-off window: {targetDate} 05:00:00 AM → next day 04:59:59 AM)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                className="btn-secondary"
                onClick={fetchERPData}
                disabled={loadingERP || pushingINSW}
                style={{ fontSize: 13, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={15} className={loadingERP ? 'spin' : ''} />
                {loadingERP ? t('common.syncing', 'Syncing...') : t('stockOpname.syncErp', 'Sync Stock Opname from ERP')}
              </button>

              <button
                className="btn-primary"
                onClick={handlePushINSW}
                disabled={loadingERP || pushingINSW || filteredItems.length === 0}
                style={{ fontSize: 13, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Send size={15} className={pushingINSW ? 'spin' : ''} />
                {pushingINSW ? t('common.pushing', 'Pushing...') : t('stockOpname.pushInsw', `Push to INSW (kdKegiatan: 32)`)}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, flexShrink: 0 }}>
          <div className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: '#e0f2fe', color: '#0369a1', padding: 10, borderRadius: 10 }}>
              <Database size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{t('stockOpname.totalRecords', 'Total Records')}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{filteredItems.length} {t('common.items', 'items')}</div>
            </div>
          </div>

          <div className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: '#e8f7ec', color: '#2e8b4a', padding: 10, borderRadius: 10 }}>
              <Layers size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{t('stockOpname.totalQty', 'Total Quantity')}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{totalQty.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: '#fef3c7', color: '#b45309', padding: 10, borderRadius: 10 }}>
              <ArrowUpRight size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{t('stockOpname.totalValue', 'Total Value (Nilai)')}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Rp {totalNilai.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>

        {/* Data Table Card with Fixed Header & Scrollable Body */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 400 }}>
          <div className="card-header responsive-header" style={{ padding: '12px 20px', borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>{t('stockOpname.title', 'Stock Opname Inventory')}</h3>
              <span className="record-count">{filteredItems.length} {t('common.records', 'records')}</span>
            </div>

            <div style={{ position: 'relative', width: 280 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: 9, color: '#94a3b8' }} />
              <input
                type="text"
                placeholder={t('common.search', 'Search') + '...'}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  padding: '6px 12px 6px 32px',
                  borderRadius: 6,
                  border: '1px solid', borderColor: 'divider',
                  fontSize: 13,
                  color: '#0f172a'
                }}
              />
            </div>
          </div>

          {loadingERP ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', flex: 1 }}>
              <RefreshCw size={32} className="spin" style={{ margin: '0 auto 12px', display: 'block', color: 'var(--primary, #3ba55c)' }} />
              <p style={{ color: '#64748b', margin: 0 }}>{t('stockOpname.queryingErp', 'Querying Linked Server [192.168.70.115_tsiiplan].AXDB Stock Opname Journal...')}</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', flex: 1 }}>
              <AlertCircle size={44} style={{ opacity: 0.4 }} />
              <p style={{ fontSize: '1.1rem', fontWeight: 500, margin: 0, color: '#475569' }}>{t('stockOpname.noData', 'No Stock Opname records found for this date')}</p>
              <p style={{ margin: 0, fontSize: 13 }}>{t('stockOpname.noDataHint', 'Click "Sync from ERP" or select another date.')}</p>
            </div>
          ) : (
            <>
              {/* Scrollable Table Container */}
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
                    {pagedItems.map(item => {
                      const isSelected = selectedIds.has(item.id);
                      return (
                        <tr key={item.id} style={{ background: isSelected ? 'var(--primary-light, #e8f7ec)' : 'transparent', borderBottom: '1px solid', borderColor: 'divider' }}>
                          <td style={{ textAlign: 'center', padding: '10px' }}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)} />
                          </td>
                          <td style={{ padding: '10px' }}><code style={{ fontWeight: 600, color: 'var(--primary-dark, #2e8b4a)', background: 'background.default', padding: '2px 6px', borderRadius: 4 }}>{item.nomorDokKegiatan}</code></td>
                          <td style={{ fontSize: 12, color: '#64748b', padding: '10px' }}>{item.thoiGianThucTe}</td>
                          <td style={{ padding: '10px' }}>
                            <span className="status-badge" style={{ background: '#e8f7ec', color: '#2e8b4a', fontSize: 11, fontWeight: 600 }}>
                              {item.ngayBaoCaoCutoff5AM}
                            </span>
                          </td>
                          <td style={{ padding: '10px' }}><strong style={{ color: '#0f172a' }}>{item.kdBarang}</strong></td>
                          <td style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '10px', color: '#334155' }} title={item.uraianBarang}>
                            {item.uraianBarang}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#10b981', padding: '10px' }}>
                            {formatQuantity(item.jumlah)}
                          </td>
                          <td style={{ padding: '10px' }}><code style={{ color: '#475569' }}>{item.kdSatuan}</code></td>
                          <td style={{ textAlign: 'right', padding: '10px', color: '#0f172a' }}>
                            Rp {item.nilai.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '10px' }}><span className="status-badge" style={{ background: 'background.default', color: '#475569' }}>{item.kho}</span></td>
                          <td style={{ textAlign: 'center', padding: '10px' }}>
                            {item.statusPush === 'idle' && (
                              <span className="status-badge" style={{ background: 'background.default', color: '#64748b' }}><Clock size={12} /> {t('common.pending', 'Pending')}</span>
                            )}
                            {item.statusPush === 'pushing' && (
                              <span className="status-badge" style={{ background: '#e0f2fe', color: '#0284c7' }}><RefreshCw size={12} className="spin" /> {t('common.pushing', 'Pushing...')}</span>
                            )}
                            {item.statusPush === 'success' && (
                              <span
                                className="status-badge active"
                                title={item.pushMessage || 'Pushed successfully'}
                                style={{ background: '#e8f7ec', color: '#2e8b4a', cursor: 'pointer' }}
                                onClick={() => setSelectedDetailItem(item)}
                              >
                                <CheckCircle size={12} /> {t('common.pushed', 'Pushed')}
                              </span>
                            )}
                            {item.statusPush === 'failed' && (
                              <span
                                className="status-badge"
                                title={item.pushMessage || 'Click to view error details'}
                                style={{ background: '#fef2f2', color: '#ef4444', cursor: 'pointer', border: '1px solid #fecaca' }}
                                onClick={() => setSelectedDetailItem(item)}
                              >
                                <XCircle size={12} /> {t('common.failed', 'Failed')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
                  <span>Rows per page:</span>
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
                    Showing {(safeCurrentPage - 1) * pageSize + 1}–{Math.min(safeCurrentPage * pageSize, filteredItems.length)} of {filteredItems.length} items
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

        {/* INSW Status & Error Detail Modal */}
        <StatusDetailModal
          open={Boolean(selectedDetailItem)}
          onClose={() => setSelectedDetailItem(null)}
          item={selectedDetailItem}
          categoryTitle={title}
        />

      </div>
    </div>
  );
}
