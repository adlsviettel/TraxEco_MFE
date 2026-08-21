import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, FileText, Loader, Search, Database, Layers } from 'lucide-react';
import Header from '../components/Header.tsx';
import { usePageVisible } from '../hooks/usePageVisible.ts';
import { getFiles, getFileDetail } from '../services/api.ts';
import type { FileDetailDto } from '../services/api.ts';
import { detectKategoriBarang, getMappings } from '../services/inswApi.ts';

interface MasterItem {
  kodeBarang: string;
  uraianBarang: string;
  kodeHS: string;
  kategoriBarang: string;
  satuan: string;
  negara: string;
  occurrenceCount: number;
  latestDocNo: string;
  latestDate: string;
  samplePrice: string;
}

export default function MasterData() {
  const { t } = useTranslation();
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  async function loadAllData() {
    setLoading(true);
    try {
      const filesRes = await getFiles();
      if (!filesRes.success || !filesRes.data) return;

      const parsed = filesRes.data.filter(f => f.parseStatus === 'success' && !f.isDeleted);
      const detailPromises = parsed.map(f => getFileDetail(f.fileId).catch(() => null));
      const details = await Promise.all(detailPromises);
      const mappings = await getMappings();

      const itemMap = new Map<string, MasterItem>();

      details.forEach((res, idx) => {
        if (!res || !res.success || !res.data) return;
        const detail = res.data as FileDetailDto;
        const file = parsed[idx];

        detail.items.forEach(item => {
          const rawCode = (item.kodeBarang || '').trim();
          const rawUraian = (item.uraianBarang || '').trim();
          const key = rawCode ? rawCode.toUpperCase() : rawUraian.toUpperCase();
          if (!key) return;

          const detectedCat = detectKategoriBarang({
            kategoriBarang: item.kategoriBarang,
            uraianBarang: item.uraianBarang,
            kodeHS: item.kodeHS,
            kodeBarang: item.kodeBarang
          }, mappings);

          if (itemMap.has(key)) {
            const existing = itemMap.get(key)!;
            existing.occurrenceCount += 1;
            if (file.importedAt > existing.latestDate) {
              existing.latestDate = detail.header?.tanggalPendaftaran || detail.header?.tanggalPengajuan || file.importedAt;
              existing.latestDocNo = detail.header?.nomorPendaftaran || detail.header?.nomorPengajuan || '';
            }
          } else {
            itemMap.set(key, {
              kodeBarang: rawCode || '—',
              uraianBarang: rawUraian || '—',
              kodeHS: item.kodeHS || '—',
              kategoriBarang: detectedCat,
              satuan: item.satuan || 'PCE',
              negara: item.negara || 'ID',
              occurrenceCount: 1,
              latestDocNo: detail.header?.nomorPendaftaran || detail.header?.nomorPengajuan || '',
              latestDate: detail.header?.tanggalPendaftaran || detail.header?.tanggalPengajuan || file.importedAt,
              samplePrice: item.harga || '0',
            });
          }
        });
      });

      setItems(Array.from(itemMap.values()));
    } catch (err) {
      console.error('Failed to load master data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAllData(); }, []);
  usePageVisible('/master-data', loadAllData);

  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchSearch = !search || (
        item.kodeBarang.toLowerCase().includes(search.toLowerCase()) ||
        item.uraianBarang.toLowerCase().includes(search.toLowerCase()) ||
        item.kodeHS.toLowerCase().includes(search.toLowerCase())
      );
      const matchCat = categoryFilter === 'ALL' || item.kategoriBarang === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [items, search, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(page, totalPages);
  const paged = filtered.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const getKategoriBadge = (catCode: string) => {
    switch (catCode) {
      case '1':
        return <span className="status-badge" style={{ background: '#e0e7ff', color: '#3730a3', fontWeight: 600 }}>1 - Mesin / Asset</span>;
      case '2':
        return <span className="status-badge active" style={{ background: '#dcfce7', color: '#166534', fontWeight: 600 }}>2 - Hasil Produksi</span>;
      case '3':
        return <span className="status-badge" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>3 - Bahan Baku / Penolong</span>;
      case '4':
        return <span className="status-badge" style={{ background: '#f3e8ff', color: '#6b21a8', fontWeight: 600 }}>4 - Pengemas / Packaging</span>;
      case '5':
        return <span className="status-badge" style={{ background: '#ffe4e6', color: '#9f1239', fontWeight: 600 }}>5 - Scrap / Sisa</span>;
      case '6':
        return <span className="status-badge" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>6 - Barang Contoh / Sample</span>;
      case '7':
        return <span className="status-badge" style={{ background: 'background.default', color: '#334155', fontWeight: 600 }}>7 - Bangunan / Konstruksi</span>;
      case '8':
        return <span className="status-badge" style={{ background: '#ccfbf1', color: '#115e59', fontWeight: 600 }}>8 - WIP / Setengah Jadi</span>;
      default:
        return <span className="status-badge" style={{ background: 'background.default', color: '#475569' }}>Kategori {catCode}</span>;
    }
  };

  return (
    <div className="page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header title={t('nav.masterData', 'Master Data Barang')} />
      <div className="page-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden', padding: 20 }}>

        {/* Toolbar & Customs Specs Banner */}
        <div className="card" style={{ padding: '14px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Database size={20} style={{ color: 'var(--primary, #3ba55c)' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>Daftar Barang Master (Customs Item Master)</h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  PER-24/BC/2023 Compliant · {items.length} Unique Master Items Aggregated
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={15} style={{ color: '#64748b' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>{t('table.kategori', 'Kategori INSW')}:</span>
                <select
                  value={categoryFilter}
                  onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
                  style={{ border: '1px solid', borderColor: 'divider', borderRadius: 6, padding: '5px 10px', fontSize: 13, background: 'background.paper', color: '#0f172a', fontWeight: 500 }}
                >
                  <option value="ALL">{t('masterData.allCategories', 'Tất cả Kategori (1-8)')}</option>
                  <option value="1">1 - Mesin / Asset</option>
                  <option value="2">2 - Hasil Produksi</option>
                  <option value="3">3 - Bahan Baku / Penolong</option>
                  <option value="4">4 - Barang Modal</option>
                  <option value="5">5 - Scrap</option>
                  <option value="8">8 - WIP</option>
                </select>
              </div>

              <div style={{ position: 'relative', width: 260 }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: 9, color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder={t('masterData.search', 'Search Kode Barang, Description, HS...')}
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  style={{ width: '100%', padding: '6px 12px 6px 32px', borderRadius: 6, border: '1px solid', borderColor: 'divider', fontSize: 13, color: '#0f172a' }}
                />
              </div>

              <button className="btn-secondary" onClick={loadAllData} disabled={loading} style={{ fontSize: 13, padding: '7px 14px' }}>
                <RefreshCw size={15} className={loading ? 'spin' : ''} /> {t('common.refresh', 'Refresh')}
              </button>
            </div>
          </div>
        </div>

        {/* Content Table Card */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 400 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', flex: 1 }}>
              <Loader size={32} className="spin" style={{ margin: '0 auto 12px', display: 'block', color: 'var(--primary, #3ba55c)' }} />
              <p style={{ color: '#64748b', margin: 0 }}>{t('common.loading', 'Loading...')} Unique Master Data Items</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', flex: 1 }}>
              <FileText size={44} style={{ opacity: 0.4, margin: '0 auto 10px', display: 'block' }} />
              <p style={{ margin: 0, fontWeight: 500, color: '#475569' }}>{t('common.noData', 'No Master Items found matching criteria')}</p>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: 'background.default', textAlign: 'left', fontSize: 12, color: '#475569' }}>
                      <th style={{ width: 45, textAlign: 'center', padding: '10px', position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>#</th>
                      <th style={{ position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>{t('table.itemCode', 'Kode Barang')}</th>
                      <th style={{ position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>{t('table.description', 'Uraian Barang')}</th>
                      <th style={{ position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>{t('table.kategori', 'Kategori INSW')}</th>
                      <th style={{ position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>{t('table.hsCode', 'Kode HS')}</th>
                      <th style={{ textAlign: 'center', position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>{t('table.uom', 'Satuan')}</th>
                      <th style={{ textAlign: 'center', position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>{t('table.country', 'Xuất Xứ')}</th>
                      <th style={{ textAlign: 'center', position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>{t('masterData.occurrenceCount', 'Tổng giao dịch')}</th>
                      <th style={{ position: 'sticky', top: 0, background: 'background.default', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>{t('masterData.latestDocNo', 'Chứng từ gần nhất')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((item, idx) => {
                      const rowNum = (safeCurrentPage - 1) * pageSize + idx + 1;
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                          <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: '10px' }}>{rowNum}</td>
                          <td style={{ padding: '10px' }}>
                            <code style={{ fontWeight: 600, color: 'var(--primary-dark, #2e8b4a)', background: 'background.default', padding: '2px 8px', borderRadius: 4 }}>
                              {item.kodeBarang}
                            </code>
                          </td>
                          <td style={{ padding: '10px', color: '#0f172a', fontWeight: 500, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.uraianBarang}>
                            {item.uraianBarang}
                          </td>
                          <td style={{ padding: '10px' }}>{getKategoriBadge(item.kategoriBarang)}</td>
                          <td style={{ padding: '10px' }}><code style={{ color: '#475569', fontSize: 12 }}>{item.kodeHS}</code></td>
                          <td style={{ textAlign: 'center', padding: '10px' }}><span className="status-badge" style={{ background: 'background.default', color: '#334155' }}>{item.satuan}</span></td>
                          <td style={{ textAlign: 'center', padding: '10px', fontSize: 12, color: '#64748b' }}>{item.negara}</td>
                          <td style={{ textAlign: 'center', padding: '10px' }}>
                            <span style={{ background: '#e8f7ec', color: '#2e8b4a', fontWeight: 600, padding: '2px 8px', borderRadius: 10, fontSize: 12 }}>
                              {item.occurrenceCount} {t('common.records', 'bản ghi')}
                            </span>
                          </td>
                          <td style={{ padding: '10px', fontSize: 12, color: '#64748b' }}>
                            {item.latestDocNo ? <span>Doc: <code>{item.latestDocNo}</code></span> : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Numbered Pagination Bar */}
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
                    <option value={15}>15</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#64748b', fontSize: 13 }}>
                    {t('common.showing', 'Hiển thị')} {(safeCurrentPage - 1) * pageSize + 1}–{Math.min(safeCurrentPage * pageSize, filtered.length)} / {filtered.length} {t('masterData.items', 'Mặt Hàng Master')}
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
