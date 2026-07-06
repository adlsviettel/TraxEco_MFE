import { useState, useRef, useEffect } from 'react';
import { usePageVisible } from '../hooks/usePageVisible.ts';
import { useTranslation } from 'react-i18next';
import {
  Upload, FileText, Eye, Trash2, CheckCircle,
  Clock, XCircle, X, AlertCircle, Loader, Send, Code,
} from 'lucide-react';
import Header from './Header.tsx';
import { parsePPKEKPDF } from '../utils/pdfParser.ts';
import { getFiles, getFileDetail, uploadFile, saveParsedData, savePushLog, deleteFile as deleteFileApi } from '../services/api.ts';
import type { PushLogDto } from '../services/api.ts';
import { pushToInsw, buildInswRequestBody, getMappings } from '../services/inswApi.ts';
import type { FileEntry, ParsedDataSuccess } from '../types/index.ts';
import { DataEvents } from '../utils/dataEvents.ts';
import { usePush, getKdKegiatan } from '../contexts/PushContext.tsx';

interface StatusIconProps {
  status: string;
}

function StatusIcon({ status }: StatusIconProps) {
  if (status === 'processed') return <CheckCircle size={14} />;
  if (status === 'pending') return <Clock size={14} />;
  if (status === 'parsing') return <Loader size={14} className="spin" />;
  return <XCircle size={14} />;
}

// ─── Detail Modal ────────────────────────────────────────────────────────────
interface ParsedDataModalProps {
  file: FileEntry;
  kdKegiatan: string;
  onClose: () => void;
  onPushSelected: (indices: number[], updatedItems: any[]) => void;
}

function ParsedDataModal({ file, kdKegiatan, onClose, onPushSelected }: ParsedDataModalProps) {
  const { t } = useTranslation();
  const data = file.parsedData as ParsedDataSuccess;
  const [activeTab, setActiveTab] = useState<'data' | 'debug'>('data');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set(data?.items?.map((_, i) => i) || []));
  const [pushing, setPushing] = useState(false);
  const [localItems, setLocalItems] = useState<any[]>([]);

  const allSelected = data?.items?.length > 0 && selectedRows.size === data.items.length;

  useEffect(() => {
    async function init() {
      const m = await getMappings();
      if (data?.items) {
        const mappedItems = data.items.map(item => {
          let mappedCode = '';
          const textKategori = (item.kategoriBarang || '').toLowerCase();
          const textUraian = (item.uraianBarang || '').toLowerCase();
          
          if (textUraian) {
            const found = m.find(x => textUraian.includes(x.keyword.toLowerCase()) || textUraian === x.description.toLowerCase());
            if (found) mappedCode = found.inswCode;
          }
          if (!mappedCode && textKategori) {
            const found = m.find(x => textKategori.includes(x.keyword.toLowerCase()) || textKategori === x.description.toLowerCase() || textKategori === x.inswCode.toLowerCase());
            if (found) mappedCode = found.inswCode;
          }
          return {
            ...item,
            kategoriBarang: mappedCode || '',
          };
        });
        setLocalItems(mappedItems);
      }
    }
    init();
  }, [data]);
  
  function toggleAll() {
    if (allSelected) setSelectedRows(new Set());
    else setSelectedRows(new Set(data.items.map((_, i) => i)));
  }

  function toggleRow(idx: number) {
    const next = new Set(selectedRows);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedRows(next);
  }

  async function handlePush() {
    if (selectedRows.size === 0) return;

    // Check if any selected item has an empty category
    const missing = Array.from(selectedRows).some(idx => !localItems[idx]?.kategoriBarang);
    if (missing) {
      alert(t('inswPush.missingCategoryAlert', 'Please select Kategori for all selected items before pushing!'));
      return;
    }

    setPushing(true);
    await onPushSelected(Array.from(selectedRows).sort((a, b) => a - b), localItems);
    setPushing(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <FileText size={18} className="file-icon" />
            <div>
              <h3>{file.fileName}</h3>
              <span className="modal-subtitle">
                Parsed {file.uploadDate} · {file.records} items
              </span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {!data ? (
          <div className="modal-body">
            <div className="pdf-preview-placeholder">
              <AlertCircle size={36} />
              <p>No parsed data available for this file.</p>
            </div>
          </div>
        ) : !data.success ? (
          <div className="modal-body">
            <div className="parse-error">
              <XCircle size={20} />
              <div>
                <strong>Parse error:</strong> {data.error}
                {data.stack && <pre className="response-pre" style={{ marginTop: 8, fontSize: 11 }}>{data.stack}</pre>}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ── Tab bar ── */}
            <div className="modal-tabs">
              <button className={`modal-tab ${activeTab === 'data' ? 'active' : ''}`} onClick={() => setActiveTab('data')}>
                Parsed Data
              </button>
              <button className={`modal-tab ${activeTab === 'debug' ? 'active' : ''}`} onClick={() => setActiveTab('debug')}>
                Debug / Raw
              </button>
            </div>

            {activeTab === 'data' && (
              <div className="parsed-body">
                {/* ── Header section ── */}
                <div className="parsed-section">
                  <div className="parsed-section-title">A. NOMOR DAN TANGGAL PEMBERITAHUAN PABEAN</div>
                  <div className="parsed-grid-4">
                    <div className="parsed-field">
                      <span className="parsed-label">1. Nomor Pengajuan</span>
                      <span className="parsed-value mono">{(data as ParsedDataSuccess).header.nomorPengajuan || '—'}</span>
                    </div>
                    <div className="parsed-field">
                      <span className="parsed-label">2. Tanggal Pengajuan</span>
                      <span className="parsed-value">{(data as ParsedDataSuccess).header.tanggalPengajuan || '—'}</span>
                    </div>
                    <div className="parsed-field">
                      <span className="parsed-label">3. Nomor Pendaftaran</span>
                      <span className="parsed-value mono">{(data as ParsedDataSuccess).header.nomorPendaftaran || '—'}</span>
                    </div>
                    <div className="parsed-field">
                      <span className="parsed-label">4. Tanggal Pendaftaran</span>
                      <span className="parsed-value">{(data as ParsedDataSuccess).header.tanggalPendaftaran || '—'}</span>
                    </div>
                    <div className="parsed-field">
                      <span className="parsed-label">5. Jenis Transaksi</span>
                      <span className="parsed-value">{(data as ParsedDataSuccess).header.jenisTransaksi || '—'}</span>
                    </div>
                    <div className="parsed-field">
                      <span className="parsed-label">6. Penerima Barang</span>
                      <span className="parsed-value">{(data as ParsedDataSuccess).header.penerimaBarang || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* ── Items Table ── */}
                <div className="parsed-section">
                  <div className="parsed-section-title">
                    Data Barang
                    <span className="record-count" style={{ marginLeft: 8 }}>{(data as ParsedDataSuccess).items.length} rows</span>
                  </div>
                  <div className="table-scroll">
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>
                            <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: 'pointer', width: 16, height: 16 }} />
                          </th>
                          <th>No</th><th>Kode HS</th><th>Uraian Barang</th>
                          <th>Kategori</th><th>Kondisi</th>
                          <th>Kode Barang</th><th>Jumlah</th><th>Harga</th>
                          <th>Satuan</th><th>Amount</th><th>Nilai Pabean</th><th>Negara</th>
                        </tr>
                      </thead>
                      <tbody>
                        {localItems.length === 0 && (
                          <tr><td colSpan={13} className="empty-row">No items — check Debug tab for raw lines</td></tr>
                        )}
                        {localItems.map((row, idx) => (
                          <tr key={idx} style={selectedRows.has(idx) ? { background: 'var(--primary)11' } : undefined}>
                            <td>
                              <input type="checkbox" checked={selectedRows.has(idx)} onChange={() => toggleRow(idx)} style={{ cursor: 'pointer', width: 16, height: 16 }} />
                            </td>
                            <td className="text-muted">{row.no || idx + 1}</td>
                            <td><code>{row.kodeHS}</code></td>
                            <td className="col-uraian">{row.uraianBarang}</td>
                            <td>
                              <select
                                value={row.kategoriBarang}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLocalItems(prev => prev.map((item, i) => i === idx ? { ...item, kategoriBarang: val } : item));
                                }}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                  border: '1px solid var(--border-color)',
                                  background: 'var(--bg-primary)',
                                  fontSize: 12,
                                  width: '100%',
                                  minWidth: 155,
                                }}
                              >
                                <option value="">{t('inswPush.selectCategory', '-- Select Category --')}</option>
                                <option value="1">1 - Bahan Baku</option>
                                <option value="2">2 - Bahan Penolong</option>
                                <option value="3">3 - Bahan Habis Pakai</option>
                                <option value="4">4 - Barang Dagangan</option>
                                <option value="5">5 - Mesin dan Peralatan</option>
                                <option value="6">6 - Barang dalam proses</option>
                                <option value="7">7 - Barang Jadi</option>
                                <option value="8">8 - Barang Reject & Scrap</option>
                              </select>
                            </td>
                            <td>{row.kondisiBarang}</td>
                            <td><code>{row.kodeBarang}</code></td>
                            <td className="text-right">{row.jumlah}</td>
                            <td className="text-right">{row.harga}</td>
                            <td>{row.satuan}</td>
                            <td className="text-right">{row.amount}</td>
                            <td className="text-right">{row.nilaiPabean}</td>
                            <td>{row.negara}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="parsed-footer">
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    Parsed {new Date(data.parsedAt).toLocaleString()} · Y-tolerance: {data._debug?.yTolerance?.toFixed(1)}pt
                  </span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
                      <select
                        id="bulkCategorySelect"
                        defaultValue=""
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-primary)',
                          fontSize: 12,
                        }}
                      >
                        <option value="">{t('inswPush.bulkSetCategory', '-- Bulk Set Category --')}</option>
                        <option value="1">1 - Bahan Baku</option>
                        <option value="2">2 - Bahan Penolong</option>
                        <option value="3">3 - Bahan Habis Pakai</option>
                        <option value="4">4 - Barang Dagangan</option>
                        <option value="5">5 - Mesin dan Peralatan</option>
                        <option value="6">6 - Barang dalam proses</option>
                        <option value="7">7 - Barang Jadi</option>
                        <option value="8">8 - Barang Reject & Scrap</option>
                      </select>
                      <button
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        disabled={selectedRows.size === 0}
                        onClick={() => {
                          const selectEl = document.getElementById('bulkCategorySelect') as HTMLSelectElement;
                          const val = selectEl?.value;
                          if (!val) {
                            alert(t('inswPush.selectCategoryFirst', 'Please select a Kategori first!'));
                            return;
                          }
                          setLocalItems(prev => prev.map((item, i) => selectedRows.has(i) ? { ...item, kategoriBarang: val } : item));
                        }}
                      >
                        {t('common.apply', 'Apply')}
                      </button>
                    </div>
                    <span style={{ fontSize: 13, marginRight: 8 }}>Selected: <strong>{selectedRows.size}</strong> / {data.items.length}</span>
                    <button className="btn-primary" disabled={selectedRows.size === 0 || pushing} onClick={handlePush}>
                      {pushing ? <Loader size={16} className="spin" /> : <Send size={16} />}
                      Push Selected
                    </button>
                    <button className="btn-secondary" disabled={pushing} onClick={onClose}>Close</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'debug' && (data as ParsedDataSuccess)._debug && (
              <div className="parsed-body">
                <div className="parsed-section">
                  <div className="parsed-section-title">Parser Stats</div>
                  <div className="debug-stats">
                    <div className="debug-stat"><span>Pages</span><strong>{(data as ParsedDataSuccess)._debug.totalPages}</strong></div>
                    <div className="debug-stat"><span>Raw Items</span><strong>{(data as ParsedDataSuccess)._debug.totalItems}</strong></div>
                    <div className="debug-stat"><span>Lines</span><strong>{(data as ParsedDataSuccess)._debug.totalLines}</strong></div>
                    <div className="debug-stat"><span>Y-Tolerance</span><strong>{(data as ParsedDataSuccess)._debug.yTolerance?.toFixed(2)}pt</strong></div>
                    <div className="debug-stat"><span>Columns Found</span><strong>{(data as ParsedDataSuccess)._debug.colRanges?.length}</strong></div>
                    <div className="debug-stat"><span>Rows Extracted</span><strong>{(data as ParsedDataSuccess).items.length}</strong></div>
                  </div>
                </div>

                {(data as ParsedDataSuccess)._debug.colRanges?.length > 0 && (
                  <div className="parsed-section">
                    <div className="parsed-section-title">Column Ranges Detected</div>
                    <table className="table">
                      <thead><tr><th>Column</th><th>X Start</th><th>X End</th></tr></thead>
                      <tbody>
                        {(data as ParsedDataSuccess)._debug.colRanges.map((c, i) => (
                          <tr key={i}>
                            <td><code>{c.name}</code></td>
                            <td>{c.x}</td>
                            <td>{c.xEnd}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="parsed-section">
                  <div className="parsed-section-title">Raw Lines (first 80)</div>
                  <div className="debug-raw-lines">
                    {(data as ParsedDataSuccess)._debug.rawLines?.map((l, i) => (
                      <div key={i} className="debug-line">
                        <span className="debug-line-meta">p{l.page} y{l.y}</span>
                        <span className="debug-line-text">{l.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface PdfImportPageProps {
  titleKey: string;
  sectionKey: string;
  fileType: string;
  pagePath: string;
  kdKegiatan: string;
  hintText?: string;
}

export default function PdfImportPage({ titleKey, sectionKey, fileType, pagePath, kdKegiatan, hintText }: PdfImportPageProps) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState<boolean>(false);
  const [viewFile, setViewFile] = useState<FileEntry | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [errorDetailFile, setErrorDetailFile] = useState<FileEntry | null>(null);
  const { pushStates, updatePushState, loadHistory, historyLoaded } = usePush();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleteConfirmBatch, setDeleteConfirmBatch] = useState(false);
  const [viewPushResponse, setViewPushResponse] = useState<PushLogDto | null>(null);
  const [actionLoading, setActionLoading] = useState<'pushBatch' | 'deleteBatch' | 'deleteSingle' | null>(null);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [jsonModalContent, setJsonModalContent] = useState('');
  const [jsonModalTitle, setJsonModalTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Multi-select helpers
  const processedFiles = files.filter(f => f.status === 'processed');
  const pushableSelected = processedFiles.filter(f => selected.has(f.id) && (!pushStates[f.id] || pushStates[f.id]?.status !== 'pushing'));
  const allSelected = files.length > 0 && files.every(f => selected.has(f.id));

  function toggleSelectAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(files.map(f => f.id)));
  }

  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Batch push handler
  async function handlePushSelected() {
    if (!pushableSelected.length) return;
    setActionLoading('pushBatch');
    let errCount = 0;
    for (const file of pushableSelected) {
      updatePushState(file.id, { status: 'pushing' });
      try {
        let parsedData = file.parsedData;
        if (!parsedData) {
          const res = await getFileDetail(file.id);
          if (res.success && res.data) {
            const d = res.data;
            parsedData = {
              success: true, fileName: d.fileName, parsedAt: d.importedAt,
              header: { nomorPengajuan: d.header?.nomorPengajuan || '', tanggalPengajuan: d.header?.tanggalPengajuan || '', nomorPendaftaran: d.header?.nomorPendaftaran || '', tanggalPendaftaran: d.header?.tanggalPendaftaran || '', penerimaBarang: d.header?.penerimaBarang || '', jenisTransaksi: d.header?.jenisTransaksi || '' },
              items: (d.items || []).map(item => ({ no: String(item.itemNo), kodeHS: item.kodeHS || '', uraianBarang: item.uraianBarang || '', kodeBarang: item.kodeBarang || '', jumlah: item.jumlah || '', satuan: item.satuan || '', harga: item.harga || '', amount: item.amount || '', nilaiPabean: item.nilaiPabean || '', negara: item.negara || '', kategoriBarang: item.kategoriBarang || '', kondisiBarang: item.kondisiBarang || '' })),
              _debug: { totalPages: 0, totalItems: d.items?.length || 0, totalLines: 0, yTolerance: 0, colRanges: [], rawLines: [] },
            };
          }
        }
        if (!parsedData || !parsedData.success) { 
          updatePushState(file.id, { status: 'failed' }); 
          errCount++;
          continue; 
        }
        const start = Date.now();
        const result = await pushToInsw(parsedData as ParsedDataSuccess, kdKegiatan);
        const duration = Date.now() - start;
        const logRes = await savePushLog({ fileId: file.id, status: result.success ? 'success' : 'failed', httpStatus: result.status, requestBody: null, responseBody: result.data ? JSON.stringify(result.data) : null, errorMessage: result.error || null, duration }, username);
        updatePushState(file.id, { status: result.success ? 'success' : 'failed', response: logRes.data || undefined });
        if (!result.success) errCount++;
      } catch (err: any) {
        errCount++;
        updatePushState(file.id, { 
          status: 'failed',
          response: {
            id: -1,
            fileId: file.id,
            status: 'failed',
            httpStatus: 500,
            requestBody: '',
            responseBody: '',
            errorMessage: err.message || 'Push failed',
            duration: 0,
            timestamp: new Date().toISOString(),
            pushedBy: username,
            pushedAt: new Date().toISOString()
          }
        });
      }
    }
    setSelected(new Set());
    setActionLoading(null);
    if (errCount > 0) {
      alert(`Có ${errCount} file đẩy dữ liệu lên INSW bị lỗi.\nVui lòng bấm vào biểu tượng Info (i) ở cột INSW Push để xem chi tiết.`);
    }
  }

  // Batch delete handler
  async function handleDeleteSelected() {
    setActionLoading('deleteBatch');
    const ids = [...selected];
    for (const id of ids) {
      try { await deleteFileApi(id, username); } catch {}
    }
    setFiles(prev => prev.filter(f => !selected.has(f.id)));
    setSelected(new Set());
    setDeleteConfirmBatch(false);
    setActionLoading(null);
    DataEvents.emit(DataEvents.DATA_CHANGED);
  }

  const username = JSON.parse(localStorage.getItem('user') || '{}').username || 'system';

  async function handleViewJson(file: FileEntry) {
    try {
      let parsedData = file.parsedData;
      if (!parsedData) {
        const res = await getFileDetail(file.id);
        if (res.success && res.data) {
          const d = res.data;
          parsedData = {
            success: true, fileName: d.fileName, parsedAt: d.importedAt,
            header: { nomorPengajuan: d.header?.nomorPengajuan || '', tanggalPengajuan: d.header?.tanggalPengajuan || '', nomorPendaftaran: d.header?.nomorPendaftaran || '', tanggalPendaftaran: d.header?.tanggalPendaftaran || '', penerimaBarang: d.header?.penerimaBarang || '', jenisTransaksi: d.header?.jenisTransaksi || '' },
            items: (d.items || []).map(item => ({ no: String(item.itemNo), kodeHS: item.kodeHS || '', uraianBarang: item.uraianBarang || '', kodeBarang: item.kodeBarang || '', jumlah: item.jumlah || '', satuan: item.satuan || '', harga: item.harga || '', amount: item.amount || '', nilaiPabean: item.nilaiPabean || '', negara: item.negara || '', kategoriBarang: item.kategoriBarang || '', kondisiBarang: item.kondisiBarang || '' })),
            _debug: { totalPages: 0, totalItems: d.items?.length || 0, totalLines: 0, yTolerance: 0, colRanges: [], rawLines: [] },
          };
        }
      }
      if (!parsedData) {
        alert('Không thể tải dữ liệu file để sinh JSON.');
        return;
      }
      const body = await buildInswRequestBody(parsedData as ParsedDataSuccess, getKdKegiatan(fileType));
      setJsonModalContent(JSON.stringify(body, null, 2));
      setJsonModalTitle(file.fileName);
      setJsonModalOpen(true);
    } catch (err: any) {
      alert(`Lỗi sinh JSON: ${err.message}`);
    }
  }

  // Load files from backend — filter by fileType
  async function loadFiles(): Promise<void> {
    try {
      const res = await getFiles();
      if (res.success && res.data) {
        const filtered = res.data.filter(f => (f.fileType || 'pemasukan') === fileType);
        const mapped: FileEntry[] = filtered
          .map(f => ({
          id: f.fileId,
          fileName: f.fileName,
          uploadDate: f.importedAt ? new Date(f.importedAt).toLocaleString() : '',
          records: f.totalItems,
          status: f.parseStatus === 'success' ? 'processed' as const : 'failed' as const,
          errorMessage: f.parseStatus === 'pending' ? 'Bị lỗi lưu file lúc Upload (Pending) - Vui lòng xoá và thử lại' : undefined,
          parsedData: null,
        }));
        setFiles(mapped);
      }
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  }

  useEffect(() => {
    loadFiles();
    if (!historyLoaded) loadHistory();
  }, []);

  usePageVisible(pagePath, loadFiles);

  function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    processFiles(dropped);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>): void {
    processFiles(Array.from(e.target.files || []));
    e.target.value = '';
  }

  async function processFiles(pdfs: File[]): Promise<void> {
    if (!pdfs.length) return;

    const entries: FileEntry[] = pdfs.map(f => ({
      id: Date.now() + Math.random(),
      fileName: f.name,
      uploadDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
      records: 0,
      status: 'parsing',
      parsedData: null,
      _file: f,
    }));
    setFiles(prev => [...entries, ...prev]);

    for (const entry of entries) {
      try {
        // 1. Parse PDF locally FIRST
        const result = await parsePPKEKPDF(entry._file!);

        // 2. Try uploading file to backend
        let fileId: number | null = null;
        let uploadFailed = false;
        try {
          const uploadRes = await uploadFile(entry._file!, username, fileType);
          fileId = uploadRes.data?.fileId ?? null;
          if (!uploadRes.success || !fileId) {
            console.warn('── Upload failed (file will be local-only):', uploadRes.message);
            uploadFailed = true;
          }
        } catch (uploadErr) {
          console.warn('── Upload error (file will be local-only):', uploadErr);
          uploadFailed = true;
        }

        // 3. If parsed successfully and uploaded, save parsed data to backend
        if (result.success && fileId) {
          const parsedData = result as ParsedDataSuccess;
          await saveParsedData(fileId, {
            header: {
              nomorPengajuan: parsedData.header.nomorPengajuan || '',
              tanggalPengajuan: parsedData.header.tanggalPengajuan || '',
              nomorPendaftaran: parsedData.header.nomorPendaftaran || '',
              tanggalPendaftaran: parsedData.header.tanggalPendaftaran || '',
              penerimaBarang: parsedData.header.penerimaBarang || '',
              jenisTransaksi: parsedData.header.jenisTransaksi || '',
            },
            items: parsedData.items.map((item, idx) => ({
              itemNo: item.no ? parseInt(item.no) : idx + 1,
              kodeHS: item.kodeHS || '',
              uraianBarang: item.uraianBarang || '',
              kodeBarang: item.kodeBarang || '',
              jumlah: item.jumlah || '',
              satuan: item.satuan || '',
              harga: item.harga || '',
              amount: item.amount || '',
              nilaiPabean: item.nilaiPabean || '',
              negara: item.negara || '',
              kategoriBarang: item.kategoriBarang || '',
              kondisiBarang: item.kondisiBarang || '',
            })),
          }, username);
        }

        // 4. Update local state — show parsed data even if upload failed
        setFiles(prev => prev.map(fe => {
          if (fe.id !== entry.id) return fe;
          return {
            ...fe,
            id: fileId || fe.id,
            status: (result.success ? 'processed' : 'failed') as FileEntry['status'],
            records: result.success ? result.items?.length ?? 0 : 0,
            parsedData: result,
            errorMessage: uploadFailed
              ? (result.success ? 'Parsed OK (upload failed — local only)' : 'Parse failed')
              : (result.success ? undefined : ('error' in result ? (result as any).error : 'Parse failed')),
            _file: undefined,
          };
        }));
        if (!uploadFailed) DataEvents.emit(DataEvents.FILE_IMPORTED);
      } catch (err) {
        console.error('── Parse failed:', err);
        setFiles(prev => prev.map(fe => {
          if (fe.id !== entry.id) return fe;
          return { ...fe, status: 'failed' as const, errorMessage: err instanceof Error ? err.message : String(err), _file: undefined };
        }));
      }
    }
  }

  async function handleModalPushSelected(indices: number[], updatedItems: any[]) {
    if (!viewFile || !viewFile.parsedData) return;
    const parsedData = viewFile.parsedData as ParsedDataSuccess;
    
    // Create a new ParsedData object with ONLY the selected items and their UPDATED categories
    const selectedParsedData: ParsedDataSuccess = {
      ...parsedData,
      items: indices.map(idx => {
        const origItem = parsedData.items[idx];
        const updatedItem = updatedItems[idx];
        return {
          ...origItem,
          kategoriBarang: updatedItem?.kategoriBarang || '',
        };
      })
    };

    updatePushState(viewFile.id, { status: 'pushing' });
    try {
      const startTime = Date.now();
      const res = await pushToInsw(selectedParsedData, kdKegiatan);
      const duration = Date.now() - startTime;
      
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const requestBody = JSON.stringify(await buildInswRequestBody(selectedParsedData, kdKegiatan));
      
      await savePushLog({
        fileId: viewFile.id,
        status: res.success ? 'success' : 'failed',
        httpStatus: res.status,
        requestBody,
        responseBody: JSON.stringify(res.data),
        errorMessage: res.error || null,
        duration,
      }, user.username || 'admin').catch(() => {});

      if (res.success) {
        updatePushState(viewFile.id, { status: 'success' });
        setViewPushResponse({
          fileId: viewFile.id,
          status: 'success',
          httpStatus: res.status,
          requestBody,
          responseBody: JSON.stringify(res.data),
          duration,
          timestamp: new Date().toISOString()
        });
        setViewFile(null); // Close modal on success
      } else {
        updatePushState(viewFile.id, { status: 'failed' });
        setViewPushResponse({
          fileId: viewFile.id,
          status: 'failed',
          httpStatus: res.status,
          requestBody,
          responseBody: JSON.stringify(res.data),
          errorMessage: res.error,
          duration,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error(err);
      updatePushState(viewFile.id, { status: 'failed' });
      setViewPushResponse({
        fileId: viewFile.id,
        status: 'failed',
        httpStatus: 500,
        requestBody: '',
        responseBody: '',
        errorMessage: err.message || 'Push failed',
        duration: 0,
        timestamp: new Date().toISOString()
      });
    }
  }

  async function handleDelete(id: number): Promise<void> {
    setActionLoading('deleteSingle');
    try {
      // If ID is a temp local ID (float or very large), just remove locally
      const isLocalOnly = !Number.isInteger(id) || id > 1_000_000_000_000;
      if (isLocalOnly) {
        setFiles(prev => prev.filter(f => f.id !== id));
      } else {
        const res = await deleteFileApi(id, username);
        if (res.success) {
          setFiles(prev => prev.filter(f => f.id !== id));
          DataEvents.emit(DataEvents.FILE_DELETED);
        } else {
          alert('Delete failed: ' + (res.message || 'Unknown error'));
        }
      }
    } catch (err) {
      alert('Delete failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeleteConfirmId(null);
      setActionLoading(null);
    }
  }

  const anyUploading = files.some(f => f.status === 'parsing');

  return (
    <div 
      className="page"
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={e => {
        // Only set dragging to false if leaving the main window, not child elements
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragging(false);
        }
      }}
      onDrop={handleDrop}
    >
      <Header title={t(titleKey)} />
      <div className="page-body">

        {/* Hidden File Input */}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />

        {/* Global Drag Overlay */}
        {dragging && (
          <div 
            className="global-drag-overlay"
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <div className="drag-content">
              <Upload size={48} />
              <h2>{t(`${sectionKey}.dragDrop`)}</h2>
              <p>{t(`${sectionKey}.supportedFormat`)}</p>
              {hintText && <p style={{ marginTop: 8, fontWeight: 600, color: '#0eb573', fontSize: 18 }}>{hintText}</p>}
            </div>
          </div>
        )}

        {/* Files table */}
        <div className="card">
          <div className="card-header responsive-header">
            <div className="header-left-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h3 style={{ margin: 0 }}>{t(`${sectionKey}.importedData`)}</h3>
                <span className="record-count">{files.length} {t('common.total').toLowerCase()}</span>
              </div>
              {hintText && <div className="hint-text-badge">{hintText}</div>}
            </div>
            <div className="header-actions">
              {selected.size > 0 && (
                <>
                  {pushableSelected.length > 0 && (
                    <button className="btn-primary" onClick={handlePushSelected} disabled={actionLoading === 'pushBatch'} style={{ fontSize: 13, padding: '6px 14px' }}>
                      {actionLoading === 'pushBatch' ? <><Loader size={14} className="spin" /> Pushing...</> : <><Send size={14} /> Push ({pushableSelected.length})</>}
                    </button>
                  )}
                  <button className="btn-secondary" onClick={() => setDeleteConfirmBatch(true)} disabled={!!actionLoading} style={{ fontSize: 13, padding: '6px 14px', color: '#d32f2f', borderColor: '#d32f2f' }}>
                    <Trash2 size={14} /> Delete ({selected.size})
                  </button>
                  <div style={{ width: 1, height: 24, background: '#e2e8f0', margin: '0 4px' }} />
                </>
              )}
              <button 
                className="btn-primary" 
                onClick={() => !anyUploading && fileRef.current?.click()}
                disabled={anyUploading}
                style={{ fontSize: 13, padding: '6px 16px', background: 'var(--surface)', color: 'var(--primary)', border: '1px solid var(--primary)', boxShadow: 'none' }}
              >
                {anyUploading ? <><div className="upload-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Parsing...</> : <><Upload size={14} /> {t(`${sectionKey}.uploadPdf`)}</>}
              </button>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} disabled={files.length === 0} />
                </th>
                <th>{t(`${sectionKey}.fileName`)}</th>
                <th>{t(`${sectionKey}.uploadDate`)}</th>
                <th>Items</th>
                <th>{t(`${sectionKey}.status`)}</th>
                <th>INSW Push</th>
                <th>{t(`${sectionKey}.action`)}</th>
              </tr>
            </thead>
            <tbody>
              {files.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-row">{t(`${sectionKey}.noData`)}</td>
                </tr>
              )}
              {files.map((file, _idx) => (
                <tr key={file.id} style={selected.has(file.id) ? { background: 'rgba(37, 99, 235, 0.04)' } : undefined}>
                  <td>
                    <input type="checkbox" checked={selected.has(file.id)} onChange={() => toggleSelect(file.id)} />
                  </td>
                  <td>
                    <div className="file-name-cell">
                      <FileText size={16} className="file-icon" />
                      <span>{file.fileName}</span>
                    </div>
                  </td>
                  <td className="text-muted">{file.uploadDate}</td>
                  <td>
                    {file.status === 'parsing'
                      ? <span className="text-muted">—</span>
                      : <strong>{file.records}</strong>
                    }
                  </td>
                  <td>
                    <span
                      className={`status-badge ${file.status}`}
                      style={file.status === 'failed' ? { cursor: 'pointer' } : undefined}
                      onClick={() => file.status === 'failed' && file.errorMessage && setErrorDetailFile(file)}
                      title={file.status === 'failed' && file.errorMessage ? 'Click to view error detail' : undefined}
                    >
                      <StatusIcon status={file.status} />
                      {file.status}
                    </span>
                  </td>
                  <td>
                    {file.status === 'processed' ? (() => {
                      const ps = pushStates[file.id];
                      const isPushable = !ps || ps.status === 'idle' || ps.status === 'failed';
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {/* Status badge */}
                          {(!ps || ps.status === 'idle') && <span className="status-badge" style={{ background: '#e8eaf6', color: '#5c6bc0' }}><Clock size={12} /> Pending</span>}
                          {ps?.status === 'pushing' && <span className="status-badge" style={{ background: '#e3f2fd', color: '#1565c0' }}><Loader size={12} className="spin" /> Pushing</span>}
                          {ps?.status === 'success' && (
                            (() => {
                              const errorMsg = ps.response?.errorMessage || ps.response?.responseBody || '';
                              const isAlreadySent = errorMsg.toLowerCase().includes('sudah pernah dikirim');
                              if (isAlreadySent) {
                                return <span className="status-badge" style={{ background: '#e8f5e9', color: '#2e7d32' }} title={errorMsg}><CheckCircle size={12} /> {t('inswPush.alreadySent', 'Already Sent')}</span>;
                              }
                              return <span className="status-badge active"><CheckCircle size={12} /> {t('inswPush.success', 'Success')}</span>;
                            })()
                          )}
                          {ps?.status === 'failed' && <span className="status-badge" style={{ background: '#ffeaea', color: '#d32f2f' }}><XCircle size={12} /> Failed</span>}
                          {/* Push button */}
                          {isPushable && (
                            <button
                              className="btn-primary"
                              style={{ fontSize: 12, padding: '4px 10px' }}
                              disabled={ps?.status === 'pushing'}
                              onClick={async (e) => {
                                e.stopPropagation();
                                updatePushState(file.id, { status: 'pushing' });
                                try {
                                  let parsedData = file.parsedData;
                                  if (!parsedData) {
                                    const res = await getFileDetail(file.id);
                                    if (res.success && res.data) {
                                      const d = res.data;
                                      parsedData = {
                                        success: true, fileName: d.fileName, parsedAt: d.importedAt,
                                        header: { nomorPengajuan: d.header?.nomorPengajuan || '', tanggalPengajuan: d.header?.tanggalPengajuan || '', nomorPendaftaran: d.header?.nomorPendaftaran || '', tanggalPendaftaran: d.header?.tanggalPendaftaran || '', penerimaBarang: d.header?.penerimaBarang || '', jenisTransaksi: d.header?.jenisTransaksi || '' },
                                        items: (d.items || []).map(item => ({ no: String(item.itemNo), kodeHS: item.kodeHS || '', uraianBarang: item.uraianBarang || '', kodeBarang: item.kodeBarang || '', jumlah: item.jumlah || '', satuan: item.satuan || '', harga: item.harga || '', amount: item.amount || '', nilaiPabean: item.nilaiPabean || '', negara: item.negara || '', kategoriBarang: item.kategoriBarang || '', kondisiBarang: item.kondisiBarang || '' })),
                                        _debug: { totalPages: 0, totalItems: d.items?.length || 0, totalLines: 0, yTolerance: 0, colRanges: [], rawLines: [] },
                                      };
                                    }
                                  }
                                  if (!parsedData || !parsedData.success) throw new Error('No parsed data');
                                  const start = Date.now();
                                  const result = await pushToInsw(parsedData as ParsedDataSuccess, kdKegiatan);
                                  const duration = Date.now() - start;
                                  const logRes = await savePushLog({ fileId: file.id, status: result.success ? 'success' : 'failed', httpStatus: result.status, requestBody: null, responseBody: result.data ? JSON.stringify(result.data) : null, errorMessage: result.error || null, duration }, username);
                                  updatePushState(file.id, { status: result.success ? 'success' : 'failed', response: logRes.data || undefined });
                                } catch (err: any) {
                                  updatePushState(file.id, { status: 'failed' });
                                }
                              }}
                            >
                              <Send size={12} /> Push
                            </button>
                          )}
                          {/* Code icon to view JSON payload */}
                          {file.status === 'processed' && (
                            <button
                              className="icon-btn-sm"
                              title="View JSON Payload"
                              onClick={async (e) => {
                                e.stopPropagation();
                                handleViewJson(file);
                              }}
                              style={{ padding: 4 }}
                            >
                              <Code size={14} />
                            </button>
                          )}
                          {/* Info icon */}
                          {ps?.response && (
                            <button
                              className="icon-btn-sm"
                              title="View detail"
                              onClick={(e) => { e.stopPropagation(); setViewPushResponse(ps.response!); }}
                            >
                              <AlertCircle size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })() : (
                      <span className="text-muted" style={{ fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td>
                    <div className="action-btns">
                      <button
                        className="icon-btn-sm"
                        title="View parsed data"
                        disabled={file.status === 'parsing'}
                        onClick={async () => {
                          if (!file.parsedData && file.status === 'processed') {
                            try {
                              const res = await getFileDetail(file.id);
                              if (res.success && res.data) {
                                const detail = res.data;
                                const loaded: ParsedDataSuccess = {
                                  success: true, fileName: detail.fileName, parsedAt: detail.importedAt,
                                  header: { nomorPengajuan: detail.header?.nomorPengajuan || '', tanggalPengajuan: detail.header?.tanggalPengajuan || '', nomorPendaftaran: detail.header?.nomorPendaftaran || '', tanggalPendaftaran: detail.header?.tanggalPendaftaran || '', penerimaBarang: detail.header?.penerimaBarang || '', jenisTransaksi: detail.header?.jenisTransaksi || '' },
                                  items: (detail.items || []).map(item => ({ no: String(item.itemNo), kodeHS: item.kodeHS || '', uraianBarang: item.uraianBarang || '', kodeBarang: item.kodeBarang || '', jumlah: item.jumlah || '', satuan: item.satuan || '', harga: item.harga || '', amount: item.amount || '', nilaiPabean: item.nilaiPabean || '', negara: item.negara || '', kategoriBarang: item.kategoriBarang || '', kondisiBarang: item.kondisiBarang || '' })),
                                  _debug: { totalPages: 0, totalItems: detail.items?.length || 0, totalLines: 0, yTolerance: 0, colRanges: [], rawLines: [] },
                                };
                                const updated = { ...file, parsedData: loaded, records: detail.items?.length || file.records };
                                setFiles(prev => prev.map(f => f.id === file.id ? updated : f));
                                setViewFile(updated);
                                return;
                              }
                            } catch (err) {
                              console.error('Failed to load file detail:', err);
                            }
                          }
                          setViewFile(file);
                        }}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="icon-btn-sm danger"
                        title="Delete"
                        style={{ padding: 6 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(file.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Push response detail modal — synced with INSW Push page */}
      {viewPushResponse && (
        <div className="modal-overlay" onClick={() => setViewPushResponse(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h3>{t('inswPush.responseDetail')}</h3>
              <button className="icon-btn" onClick={() => setViewPushResponse(null)}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              {/* Status banner */}
              {(() => {
                const errorMsg = viewPushResponse.errorMessage || viewPushResponse.responseBody || '';
                const isAlreadySent = errorMsg.toLowerCase().includes('sudah pernah dikirim');
                return (
                  <div style={{
                    padding: '12px 16px', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
                    background: viewPushResponse.status === 'success' ? '#e8f5e9' : '#ffeaea',
                    color: viewPushResponse.status === 'success' ? '#2e7d32' : '#d32f2f',
                    fontWeight: 600, fontSize: 14,
                  }}>
                    {viewPushResponse.status === 'success' ? (
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', marginBottom: 16, fontSize: 13 }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('inswPush.pushId')}</span>
                  <p style={{ margin: '2px 0', fontWeight: 500 }}>#{viewPushResponse.pushId}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('inswPush.httpStatus')}</span>
                  <p style={{ margin: '2px 0', fontWeight: 500 }}>{viewPushResponse.httpStatus || '—'}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('inswPush.pushedBy')}</span>
                  <p style={{ margin: '2px 0', fontWeight: 500 }}>{viewPushResponse.pushedBy}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('inswPush.duration')}</span>
                  <p style={{ margin: '2px 0', fontWeight: 500 }}>{viewPushResponse.duration ? `${(viewPushResponse.duration / 1000).toFixed(1)}s` : '—'}</p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('inswPush.pushedAt')}</span>
                  <p style={{ margin: '2px 0', fontWeight: 500 }}>{viewPushResponse.pushedAt ? new Date(viewPushResponse.pushedAt).toLocaleString() : '—'}</p>
                </div>
              </div>
              {/* Error message */}
              {viewPushResponse.errorMessage && (
                <div style={{ marginBottom: 16 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('inswPush.errorMessage')}</span>
                  <div style={{ marginTop: 4, padding: '8px 12px', background: '#fff3f3', borderRadius: 6, border: '1px solid #ffcdd2', color: '#c62828', fontSize: 13, wordBreak: 'break-word' }}>
                    {viewPushResponse.errorMessage}
                  </div>
                </div>
              )}
              {/* Response body */}
              {viewPushResponse.responseBody && (
                <details style={{ marginBottom: 12 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                    {t('inswPush.responseBody')}
                  </summary>
                  <pre style={{ background: 'var(--bg-secondary, #f5f5f5)', padding: 12, borderRadius: 6, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflow: 'auto', margin: '4px 0 0' }}>
                    {(() => { try { return JSON.stringify(JSON.parse(viewPushResponse.responseBody), null, 2); } catch { return viewPushResponse.responseBody; } })()}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {viewFile && (
        <ParsedDataModal
          file={viewFile}
          kdKegiatan={kdKegiatan}
          onClose={() => setViewFile(null)}
          onPushSelected={handleModalPushSelected}
        />
      )}

      {/* Error detail modal */}
      {errorDetailFile && (
        <div className="modal-overlay" onClick={() => setErrorDetailFile(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>{t('common.error')}</h3>
              <button className="icon-btn" onClick={() => setErrorDetailFile(null)}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: 8,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: '#ffeaea',
                color: '#d32f2f',
                fontWeight: 600,
                fontSize: 14,
              }}>
                <XCircle size={18} /> {errorDetailFile.fileName}
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('inswPush.errorMessage')}</span>
                <div style={{
                  marginTop: 4,
                  padding: '10px 14px',
                  background: '#fff3f3',
                  borderRadius: 6,
                  border: '1px solid #ffcdd2',
                  color: '#c62828',
                  wordBreak: 'break-word',
                }}>
                  {errorDetailFile.errorMessage}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn-secondary" onClick={() => setErrorDetailFile(null)}>{t('common.close')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirmId !== null && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>{t('common.confirmDelete')}</h3>
              <button className="icon-btn" onClick={() => setDeleteConfirmId(null)}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ marginBottom: 20, color: 'var(--text-muted)' }}>
                {t('common.confirmDeleteMsg')}
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setDeleteConfirmId(null)} disabled={actionLoading === 'deleteSingle'}>{t('common.cancel')}</button>
                <button
                  className="btn-primary"
                  style={{ background: 'var(--danger, #ef4444)' }}
                  disabled={actionLoading === 'deleteSingle'}
                  onClick={() => handleDelete(deleteConfirmId)}
                >{actionLoading === 'deleteSingle' ? <><Loader size={14} className="spin" /> Deleting...</> : t('common.delete')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch delete confirm modal */}
      {deleteConfirmBatch && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmBatch(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>{t('common.confirmDelete')}</h3>
              <button className="icon-btn" onClick={() => setDeleteConfirmBatch(false)}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ marginBottom: 20, color: 'var(--text-muted)' }}>
                Delete {selected.size} selected file(s)? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setDeleteConfirmBatch(false)} disabled={actionLoading === 'deleteBatch'}>{t('common.cancel')}</button>
                <button
                  className="btn-primary"
                  style={{ background: 'var(--danger, #ef4444)' }}
                  disabled={actionLoading === 'deleteBatch'}
                  onClick={handleDeleteSelected}
                >{actionLoading === 'deleteBatch' ? <><Loader size={14} className="spin" /> Deleting...</> : <>{t('common.delete')} ({selected.size})</>}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View JSON Payload Modal */}
      {jsonModalOpen && (
        <div className="modal-overlay" onClick={() => setJsonModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 750 }}>
            <div className="modal-header">
              <h3>INSW Payload: {jsonModalTitle}</h3>
              <button className="icon-btn" onClick={() => setJsonModalOpen(false)}><X size={20} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  <b>API URL:</b> <code>https://api.insw.go.id/api-prod/inventory/temp/transaksi</code>
                </span>
                <button
                  className="btn-primary"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={() => {
                    navigator.clipboard.writeText(jsonModalContent);
                    alert('Đã copy JSON Payload vào clipboard!');
                  }}
                >
                  Copy JSON
                </button>
              </div>
              <pre style={{
                background: '#f5f5f5',
                color: '#333',
                padding: '12px 16px',
                borderRadius: 8,
                maxHeight: '450px',
                overflowY: 'auto',
                fontSize: '12px',
                fontFamily: 'monospace',
                border: '1px solid #e0e0e0',
                margin: 0
              }}>
                {jsonModalContent}
              </pre>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn-secondary" onClick={() => setJsonModalOpen(false)}>{t('common.close')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
