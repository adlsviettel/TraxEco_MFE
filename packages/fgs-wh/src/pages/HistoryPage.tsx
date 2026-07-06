import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Chip,
  Button,
  TextField,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Popover,
  InputAdornment,
  Badge,
  Checkbox,
  Snackbar,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  History as HistoryIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  TableChart as ExcelIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Summarize as SummaryIcon,
  DateRange as DateRangeIcon,
  TuneRounded as TuneIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { authService, ConfirmDialog, defaultConfirmDialog } from '@traxeco/shared';
import type { ConfirmDialogState } from '@traxeco/shared';
import * as XLSX from 'xlsx';
const ACCENT = '#2e7d32';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

interface HistoryRow {
  sysCreateDate: string;
  poNo: string;
  ctnNo: number;
  packedQty: number;
  ctnBarCode: string;
  ctnLocation: string;
  createdBy: string;
  factory: string;
  custSize: string;
  recNo: number;
  actualWght: string;
}

interface SummaryRow {
  style: string | null;
  orderNo: string | null;
  poNo: string;
  inFGsQty: number;
}

interface PoSummaryRow {
  poNo: string;
  reqCTN: number;
  fgsCTN: number;
  inFGsQty: number;
}

interface PoDetailRow {
  ctnNo: number;
  manuSize: string;
  reqQtybySize: number;
  sumQtybySize: number | null;
  createdBy: string;
  factory: string;
  sysCreateDate: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const STORAGE_KEY = 'historyPageState';

interface SavedState {
  poSearch: string;
  fromDate: string;
  toDate: string;
  page: number;
  rowsPerPage: number;
  data: HistoryRow[];
}

function loadSaved(): SavedState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveState(s: SavedState) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

const formatTime = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    + ' ' + d.toLocaleDateString('vi-VN');
};

// ─── Column Filter Popover (memoized) ───
const ColumnFilter = memo(({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const active = !!value;

  return (
    <>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.2 }}>{label}</Typography>
        <IconButton
          size="small"
          onClick={(e) => { setAnchorEl(e.currentTarget); setTimeout(() => inputRef.current?.focus(), 100); }}
          sx={{ p: 0.25, color: active ? '#2e7d32' : '#bbb', '&:hover': { color: '#2e7d32', backgroundColor: '#e8f5e9' } }}
        >
          <Badge variant="dot" invisible={!active} color="success">
            <FilterIcon sx={{ fontSize: 15 }} />
          </Badge>
        </IconButton>
      </Box>
      <Popover
        open={!!anchorEl} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 1.5, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 200 } } }}
      >
        <TextField
          inputRef={inputRef} size="small" placeholder={`Filter ${label}...`}
          value={value} onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setAnchorEl(null); }}
          autoFocus fullWidth
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#999' }} /></InputAdornment>,
            endAdornment: value ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => onChange('')} sx={{ p: 0.25 }}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem' } }}
        />
      </Popover>
    </>
  );
});

// ─── Memoized Table Row ───
interface HistoryRowProps {
  row: HistoryRow;
  idx: number;
  isSelected: boolean;
  isEditing: boolean;
  editFactory: string;
  canEdit: boolean;
  canDelete: boolean;
  factoryOptions: string[];
  onToggleSelect: (recNo: number) => void;
  onStartEdit: (recNo: number, factory: string) => void;
  onEditFactoryChange: (val: string) => void;
  onSaveFactory: (recNo: number, origFactory: string) => void;
  onCancelEdit: () => void;
}

const HistoryTableRow = memo(({
  row, idx, isSelected, isEditing, editFactory, canEdit, canDelete, factoryOptions,
  onToggleSelect, onStartEdit, onEditFactoryChange, onSaveFactory, onCancelEdit,
}: HistoryRowProps) => (
  <TableRow hover selected={isSelected}
    sx={{ backgroundColor: isSelected ? '#fff3e0' : undefined }}
  >
    {canDelete && (
      <TableCell padding="checkbox" className="sticky-cell" sx={{ position: 'sticky', left: 0, bgcolor: isSelected ? '#fff3e0' : '#ffffff', zIndex: 1 }}>
        <Checkbox size="small" checked={isSelected} onChange={() => onToggleSelect(row.recNo)} color="success" />
      </TableCell>
    )}
    <TableCell>{idx}</TableCell>
    <TableCell sx={{ fontWeight: 600 }}>{row.poNo}</TableCell>
    <TableCell>{row.ctnNo}</TableCell>
    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{row.ctnBarCode}</TableCell>
    <TableCell align="right">
      <Chip label={row.packedQty} size="small" color="success" sx={{ fontWeight: 700, minWidth: 40 }} />
    </TableCell>
    <TableCell>{row.custSize}</TableCell>
    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{row.actualWght !== '0' ? row.actualWght : '-'}</TableCell>
    <TableCell>
      {canEdit && isEditing ? (
        <Select size="small" value={editFactory}
          onChange={(e) => onEditFactoryChange(e.target.value)}
          onBlur={() => onSaveFactory(row.recNo, row.factory)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSaveFactory(row.recNo, row.factory); if (e.key === 'Escape') onCancelEdit(); }}
          autoFocus sx={{ minWidth: 70, fontSize: '0.85rem', '& .MuiSelect-select': { py: 0.5 } }}
        >
          {factoryOptions.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
        </Select>
      ) : (
        <Chip label={row.factory} size="small" variant="outlined"
          sx={{ fontWeight: 600, cursor: canEdit ? 'pointer' : 'default' }}
          onClick={() => { if (canEdit) onStartEdit(row.recNo, row.factory); }}
        />
      )}
    </TableCell>
    <TableCell sx={{ fontSize: '0.85rem' }}>{row.ctnLocation}</TableCell>
    <TableCell sx={{ fontSize: '0.85rem' }}>{row.createdBy}</TableCell>
    <TableCell sx={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{formatTime(row.sysCreateDate)}</TableCell>
    <TableCell sx={{ fontSize: '0.85rem' }}>{row.recNo}</TableCell>
  </TableRow>
));

// ─── Main Component ───
export default function HistoryPage() {
  const { t } = useTranslation();
  const saved = loadSaved();

  const [page, setPage] = useState(saved?.page ?? 0);
  const [rowsPerPage, setRowsPerPage] = useState(saved?.rowsPerPage ?? 25);
  const [data, setData] = useState<HistoryRow[]>(saved?.data ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [poSearch, setPoSearch] = useState(saved?.poSearch ?? '');
  const [fromDate, setFromDate] = useState(saved?.fromDate ?? todayStr());
  const [toDate, setToDate] = useState(saved?.toDate ?? todayStr());

  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const updateColFilter = useCallback((col: string, val: string) => { setColFilters(prev => ({ ...prev, [col]: val })); setPage(0); }, []);

  // Selection — use ref + state for perf: ref for instant reads, state for re-render only when count changes
  const [selectedCount, setSelectedCount] = useState(0);
  const selectedRef = useRef<Set<number>>(new Set());

  const toggleSelect = useCallback((recNo: number) => {
    const s = selectedRef.current;
    if (s.has(recNo)) s.delete(recNo); else s.add(recNo);
    setSelectedCount(s.size);
  }, []);

  const isSelected = useCallback((recNo: number) => selectedRef.current.has(recNo), []);

  const clearSelection = useCallback(() => {
    selectedRef.current = new Set();
    setSelectedCount(0);
  }, []);

  // Inline edit
  const [editingRecNo, setEditingRecNo] = useState<number | null>(null);
  const [editFactory, setEditFactory] = useState('');

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const canEdit = useMemo(() => authService.hasAction('history', 'canEdit') || authService.isSuperAdmin(), []);
  const canDelete = useMemo(() => authService.hasAction('history', 'canDelete') || authService.isSuperAdmin(), []);

  // Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(defaultConfirmDialog);
  const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'danger' | 'safe' | 'info' = 'danger') => {
    setConfirmDialog({ open: true, title, message, onConfirm, variant });
  };
  const closeConfirm = () => setConfirmDialog(p => ({ ...p, open: false }));

  useEffect(() => {
    saveState({ poSearch, fromDate, toDate, page, rowsPerPage, data });
  }, [poSearch, fromDate, toDate, page, rowsPerPage, data]);

  // ─── Data mode: detail or summary ───
  const [dataMode, setDataMode] = useState<'detail' | 'summary' | 'poSummary' | 'poDetail'>('detail');
  const [summaryData, setSummaryData] = useState<SummaryRow[]>([]);

  const handleSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      const po = poSearch.trim();
      if (po) {
        params.append('poNo', po);
      } else {
        params.append('date', fromDate);
      }
      const res = await fetch(`${API_BASE_URL}/scan-history/summary?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      setSummaryData(await res.json());
      setDataMode('summary');
      setPage(0);
      setColFilters({});
    } catch {
      setError('Failed to load summary');
    } finally {
      setLoading(false);
    }
  }, [fromDate, poSearch]);

  // PO popup state
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [poData, setPoData] = useState<any[]>([]);

  const handleSummaryClick = useCallback(() => {
    const po = poSearch.trim();
    if (po) {
      // Case 2: PO entered — show popup
      setPoDialogOpen(true);
    } else {
      // Case 1: no PO — use date summary
      handleSummary();
    }
  }, [poSearch, handleSummary]);

  const handlePoChoice = useCallback(async (choice: 'summary' | 'detail') => {
    setPoDialogOpen(false);
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const po = poSearch.trim();
      const endpoint = choice === 'summary' ? 'po-summary' : 'po-detail';
      const res = await fetch(`${API_BASE_URL}/scan-history/${endpoint}?poNo=${encodeURIComponent(po)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const result = await res.json();
      setPoData(result);
      setDataMode(choice === 'summary' ? 'poSummary' : 'poDetail');
      setPage(0);
      setColFilters({});
    } catch {
      setError('Failed to load PO data');
    } finally {
      setLoading(false);
    }
  }, [poSearch]);

  const summaryTotal = useMemo(() => summaryData.reduce((s, r) => s + (r.inFGsQty || 0), 0), [summaryData]);

  const filteredData = useMemo(() => {
    const hasFilters = Object.values(colFilters).some(v => v);
    if (!hasFilters) return data;
    return data.filter(row => {
      for (const [key, val] of Object.entries(colFilters)) {
        if (!val) continue;
        const v = val.toLowerCase();
        let cellVal = '';
        if (key === 'time') cellVal = row.sysCreateDate ? formatTime(row.sysCreateDate) : '';
        else cellVal = String((row as unknown as Record<string, unknown>)[key] ?? '');
        if (!cellVal.toLowerCase().includes(v)) return false;
      }
      return true;
    });
  }, [data, colFilters]);

  const pagedData = useMemo(() =>
    filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredData, page, rowsPerPage]
  );

  const doSearch = useCallback(async (po?: string, from?: string, to?: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('appCode', 'FGS_WH');
      if (po && po.trim()) { params.append('poNo', po.trim()); }
      else { if (from) params.append('date', from); }

      const res = await fetch(`${API_BASE_URL}/scan-history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const result: HistoryRow[] = await res.json();

      let filtered = result;
      if (!po?.trim() && to && from && to !== from) {
        const toEnd = new Date(to + 'T23:59:59').getTime();
        filtered = result.filter(r => new Date(r.sysCreateDate).getTime() <= toEnd);
      }

      setData(filtered);
      setDataMode('detail');
      setPage(0);
      setColFilters({});
      clearSelection();
      setEditingRecNo(null);
    } catch {
      setError(t('history.errorFetch', 'Failed to load history data.'));
    } finally {
      setLoading(false);
    }
  }, [t, clearSelection]);

  useEffect(() => {
    // User request: Do not auto-load data when opening the page.
    // if (!saved?.data?.length) { doSearch('', todayStr(), todayStr()); }
  }, []);  

  const handleSearch = useCallback(() => doSearch(poSearch.trim(), fromDate, toDate), [doSearch, poSearch, fromDate, toDate]);

  // ─── Edit Factory ───
  const handleSaveFactory = useCallback(async (recNo: number, originalFactory: string) => {
    if (!editFactory.trim() || editFactory.trim() === originalFactory) {
      setEditingRecNo(null);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/scan-history/factory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recNo, factory: editFactory.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      setData(prev => prev.map(r => r.recNo === recNo ? { ...r, factory: editFactory.trim() } : r));
      setEditingRecNo(null);
      setSnackbar({ open: true, message: 'Factory updated', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Error updating factory', severity: 'error' });
    }
  }, [editFactory]);

  const onStartEdit = useCallback((recNo: number, factory: string) => {
    setEditingRecNo(recNo);
    setEditFactory(factory);
  }, []);

  const onCancelEdit = useCallback(() => setEditingRecNo(null), []);
  const onEditFactoryChange = useCallback((val: string) => setEditFactory(val), []);

  // ─── Multi Delete ───
  const handleDeleteSelected = useCallback(async () => {
    const recNos = Array.from(selectedRef.current);
    if (recNos.length === 0) return;
    showConfirm('Delete rows', `Delete ${recNos.length} selected row(s)?`, async () => {
      try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/scan-history/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recNos }),
      });
      if (!res.ok) throw new Error('Failed');
      const result = await res.json();
      const deletedSet = new Set(recNos);
      setData(prev => prev.filter(r => !deletedSet.has(r.recNo)));
      clearSelection();
      setSnackbar({ open: true, message: `${result.affected} row(s) deleted`, severity: 'success' });
      } catch {
        setSnackbar({ open: true, message: 'Error deleting rows', severity: 'error' });
      }
    });
  }, [clearSelection]);

  // ─── Select All (current page) ───
  const toggleSelectAll = useCallback(() => {
    const pageRecNos = pagedData.map(r => r.recNo);
    const allSelected = pageRecNos.every(rn => selectedRef.current.has(rn));
    if (allSelected) {
      pageRecNos.forEach(rn => selectedRef.current.delete(rn));
    } else {
      pageRecNos.forEach(rn => selectedRef.current.add(rn));
    }
    setSelectedCount(selectedRef.current.size);
  }, [pagedData]);

  const allPageSelected = useMemo(() =>
    pagedData.length > 0 && pagedData.every(r => selectedRef.current.has(r.recNo)),
    [pagedData, selectedCount] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const somePageSelected = useMemo(() =>
    pagedData.some(r => selectedRef.current.has(r.recNo)),
    [pagedData, selectedCount] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ─── Excel ───
  const handleExportExcel = useCallback(() => {
    if (dataMode === 'detail') {
      if (filteredData.length === 0) return;
      const rows = filteredData.map((row, idx) => ({
        '#': idx + 1,
        'PO No': row.poNo, 'CTN No': row.ctnNo, 'CTN BarCode': row.ctnBarCode,
        'Packed Qty': row.packedQty, 'Cust Size': row.custSize, 'Actual Wght': row.actualWght,
        'Factory': row.factory, 'Location': row.ctnLocation, 'Created By': row.createdBy,
        'RecNo': row.recNo, 'Time': row.sysCreateDate ? formatTime(row.sysCreateDate) : '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'History');
      XLSX.writeFile(wb, `ScanHistory_${poSearch || 'All'}_${fromDate || todayStr()}.xlsx`);
    } else if (dataMode === 'summary') {
      if (summaryData.length === 0) return;
      const rows = summaryData.map((row, idx) => ({
        '#': idx + 1, 'Style': row.style || '', 'Order No': row.orderNo || '',
        'PO No': row.poNo, 'InFGs Qty': row.inFGsQty,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Summary');
      XLSX.writeFile(wb, `ScanSummary_${fromDate || todayStr()}.xlsx`);
    } else if (dataMode === 'poSummary') {
      if (poData.length === 0) return;
      const rows = poData.map((row, idx) => ({
        '#': idx + 1, 'PO No': row.poNo, 'Req CTN': row.reqCTN,
        'FGs CTN': row.fgsCTN, 'InFGs Qty': row.inFGsQty,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'PO Summary');
      XLSX.writeFile(wb, `POSummary_${poSearch}.xlsx`);
    } else {
      if (poData.length === 0) return;
      const rows = poData.map((row, idx) => ({
        '#': idx + 1, 'CTN No': row.ctnNo, 'Manu Size': row.manuSize || '',
        'Req Qty': row.reqQtybySize, 'Sum Qty': row.sumQtybySize ?? '',
        'Created By': row.createdBy || '', 'Factory': row.factory || '',
        'Date': row.sysCreateDate ? new Date(row.sysCreateDate).toLocaleString() : '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'CTN Detail');
      XLSX.writeFile(wb, `CTNDetail_${poSearch}.xlsx`);
    }
  }, [dataMode, filteredData, summaryData, poData, poSearch, fromDate]);

  const activeFilterCount = useMemo(() => Object.values(colFilters).filter(v => v).length, [colFilters]);

  const columns = useMemo(() => [
    { key: 'poNo', label: t('history.col.poNo', 'PO No') },
    { key: 'ctnNo', label: t('history.col.ctnNo', 'CTN No') },
    { key: 'ctnBarCode', label: t('history.col.ctnBarCode', 'CTN BarCode') },
    { key: 'packedQty', label: t('history.col.packedQty', 'Packed Qty'), align: 'right' as const },
    { key: 'custSize', label: t('history.col.custSize', 'Cust Size') },
    { key: 'actualWght', label: t('history.col.actualWght', 'Actual Wght'), align: 'right' as const },
    { key: 'factory', label: t('history.col.factory', 'Factory') },
    { key: 'ctnLocation', label: t('history.col.location', 'Location') },
    { key: 'createdBy', label: t('history.col.createdBy', 'Created By') },
    { key: 'time', label: t('history.col.time', 'Time') },
    { key: 'recNo', label: 'RecNo', noFilter: true },
  ], [t]);

  const factoryOptions = useMemo(() => {
    const set = new Set(data.map(r => r.factory).filter(Boolean));
    return Array.from(set).sort();
  }, [data]);

  const { sumWeight, totalCtns } = useMemo(() => {
    let w = 0;
    filteredData.forEach(r => { w += parseFloat(r.actualWght) || 0; });
    return { sumWeight: Math.round(w * 100) / 100, totalCtns: filteredData.length };
  }, [filteredData]);

  return (
    <Paper elevation={0} sx={{ p: 1, bgcolor: 'transparent', flexGrow: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', '& > *:not(:last-child)': { mb: 2 }, flexGrow: 1, minHeight: 0 }}>
        {/* ── Compact Header + Filters ── */}
        <Paper elevation={0} sx={{
          p: '6px 12px', borderRadius: 2.5, border: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #f8faf8 0%, #ffffff 100%)',
          display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', flexShrink: 0
        }}>


          {/* Row 2: Search Filters */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
            <TextField size="small" placeholder={t('genesis.poPlaceholder', 'Nhập số PO...')}
              value={poSearch} onChange={(e) => setPoSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></InputAdornment> }}
              sx={{ width: { xs: '100%', sm: 200, md: 240 }, '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem', bgcolor: '#fff' } }}
            />

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'nowrap' }}>
              <TextField size="small" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                disabled={!!poSearch.trim()} 
                sx={{ width: 130, '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem', bgcolor: poSearch.trim() ? '#f8f8f8' : '#fff' } }}
              />
              <TextField size="small" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                disabled={!!poSearch.trim()} 
                sx={{ width: 130, '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem', bgcolor: poSearch.trim() ? '#f8f8f8' : '#fff' } }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap' }}>
              <Button variant="contained" startIcon={<SearchIcon sx={{ fontSize: '16px !important' }} />} onClick={handleSearch} disabled={loading} disableElevation
                sx={{ borderRadius: 1.5, fontWeight: 700, height: 32, px: 2, fontSize: '0.8rem', textTransform: 'none', background: 'linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)', whiteSpace: 'nowrap' }}
              >{t('genesis.searchBtn', 'Tìm kiếm')}</Button>
              
              <Button variant="outlined" startIcon={<RefreshIcon sx={{ fontSize: '16px !important' }} />} disabled={loading}
                onClick={() => { setPoSearch(''); setFromDate(todayStr()); setToDate(todayStr()); setColFilters({}); clearSelection(); doSearch('', todayStr(), todayStr()); }}
                sx={{ borderRadius: 1.5, fontWeight: 600, height: 32, px: 1.5, fontSize: '0.8rem', textTransform: 'none', borderColor: '#cbd5e1', color: '#475569', whiteSpace: 'nowrap' }}
              >{t('history.refresh', 'Đặt lại')}</Button>
              
              <Button variant="outlined" startIcon={<SummaryIcon sx={{ fontSize: '16px !important' }} />} onClick={handleSummaryClick} disabled={loading}
                sx={{ borderRadius: 1.5, fontWeight: 700, height: 32, px: 2, fontSize: '0.8rem', textTransform: 'none', borderColor: '#2e7d32', color: '#2e7d32', whiteSpace: 'nowrap' }}
              >Summary</Button>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            {/* Right: Stats & Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {dataMode === 'detail' ? (
                <>
                  <Chip size="small" label={`${t('history.total', 'Tổng')}: ${filteredData.length}${filteredData.length !== data.length ? ` / ${data.length}` : ''}`} sx={{ height: 24, fontSize: '0.75rem', fontWeight: 700, bgcolor: '#e3f2fd', color: '#1565c0' }} />
                  {sumWeight > 0 && <Chip size="small" label={`${sumWeight} kg · ${totalCtns} ctns`} sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600, bgcolor: '#f1f8e9', color: '#33691e', border: '1px solid #c5e1a5' }} />}
                </>
              ) : dataMode === 'summary' ? (
                <>
                  <Chip size="small" icon={<SummaryIcon sx={{ fontSize: '14px !important' }} />} label="Summary" sx={{ height: 24, fontSize: '0.75rem', fontWeight: 700, bgcolor: '#e3f2fd', color: '#1565c0' }} />
                  <Chip size="small" label={`${summaryData.length} rows · Σ ${summaryTotal}`} sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600, bgcolor: '#f1f8e9', color: '#33691e' }} />
                </>
              ) : dataMode === 'poSummary' ? (
                <Chip size="small" icon={<SummaryIcon sx={{ fontSize: '14px !important' }} />} label={`PO Summary: ${poSearch} · ${poData.length} rows`} sx={{ height: 24, fontSize: '0.75rem', fontWeight: 700, bgcolor: '#fff3e0', color: '#e65100' }} />
              ) : (
                <Chip size="small" icon={<SummaryIcon sx={{ fontSize: '14px !important' }} />} label={`CTN Detail: ${poSearch} · ${poData.length} rows`} sx={{ height: 24, fontSize: '0.75rem', fontWeight: 700, bgcolor: '#f3e5f5', color: '#7b1fa2' }} />
              )}
              {activeFilterCount > 0 && <Chip size="small" label={`${activeFilterCount} filter`} color="success" variant="outlined" onDelete={() => setColFilters({})} sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600 }} />}
              {canDelete && selectedCount > 0 && <Button variant="contained" color="error" size="small" startIcon={<DeleteIcon sx={{ fontSize: '16px !important' }} />} onClick={handleDeleteSelected} disableElevation sx={{ borderRadius: 1.5, fontWeight: 700, height: 32, textTransform: 'none' }}>Delete ({selectedCount})</Button>}
              <Button variant="contained" size="small" startIcon={<ExcelIcon sx={{ fontSize: '16px !important' }} />} onClick={handleExportExcel} disabled={(dataMode === 'detail' ? filteredData.length : dataMode === 'summary' ? summaryData.length : poData.length) === 0} disableElevation sx={{ borderRadius: 1.5, fontWeight: 700, height: 32, px: 2, fontSize: '0.8rem', backgroundColor: '#2e7d32', textTransform: 'none', '&:hover': { backgroundColor: '#1b5e20' } }}>Excel</Button>
            </Box>
          </Box>
        </Paper>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

      {/* Data Table */}
      <Paper elevation={0} sx={{ width: '100%', overflow: 'hidden', borderRadius: 2, border: '1px solid #e0e0e0', flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : dataMode === 'detail' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: { xs: 0.5, lg: 1 }, px: { xs: 1, lg: 2 }, fontSize: { xs: '0.75rem', lg: '0.85rem' } } }}>
                <TableHead>
                  <TableRow>
                    {canDelete && (
                      <TableCell padding="checkbox" sx={{ backgroundColor: '#f5f5f5', position: 'sticky', left: 0, zIndex: 3, width: 40, maxWidth: 40 }}>
                        <Checkbox size="small" checked={allPageSelected} indeterminate={somePageSelected && !allPageSelected}
                          onChange={toggleSelectAll} color="success" />
                      </TableCell>
                    )}
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>#</TableCell>
                    {columns.map(col => (
                      <TableCell key={col.key} align={col.align} sx={{ fontWeight: 700, backgroundColor: '#f5f5f5', whiteSpace: 'nowrap' }}>
                        {col.noFilter ? (
                          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{col.label}</Typography>
                        ) : (
                          <ColumnFilter label={col.label} value={colFilters[col.key] || ''}
                            onChange={(v) => updateColFilter(col.key, v)} />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedData.map((row, idx) => (
                    <HistoryTableRow
                      key={row.recNo}
                      row={row}
                      idx={page * rowsPerPage + idx + 1}
                      isSelected={isSelected(row.recNo)}
                      isEditing={editingRecNo === row.recNo}
                      editFactory={editingRecNo === row.recNo ? editFactory : ''}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      factoryOptions={factoryOptions}
                      onToggleSelect={toggleSelect}
                      onStartEdit={onStartEdit}
                      onEditFactoryChange={onEditFactoryChange}
                      onSaveFactory={handleSaveFactory}
                      onCancelEdit={onCancelEdit}
                    />
                  ))}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canDelete ? 13 : 12} align="center" sx={{ py: 6 }}>
                        <Typography variant="body1" color="text.secondary">
                          {t('history.noData', 'No scan history found')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderTop: '1px solid #e0e0e0', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{t('history.rowsPerPage', 'Rows per page:')}</Typography>
                <Select
                  size="small"
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                  sx={{ height: 32, fontSize: '0.85rem', borderRadius: 1.5 }}
                >
                  {[10, 15, 25, 50, 100, 500].map(v => <MenuItem key={v} value={v} sx={{ fontSize: '0.85rem' }}>{v}</MenuItem>)}
                </Select>
                <Typography variant="body2" sx={{ color: 'text.secondary', ml: 1 }}>
                  {filteredData.length > 0 ? page * rowsPerPage + 1 : 0}-{Math.min((page + 1) * rowsPerPage, filteredData.length)} / {filteredData.length}
                </Typography>
              </Box>
              <Pagination
                count={Math.ceil(filteredData.length / rowsPerPage) || 1}
                page={page + 1}
                onChange={(_, newPage) => setPage(newPage - 1)}
                shape="rounded"
                showFirstButton
                showLastButton
                size="medium"
                sx={{
                  '& .MuiPagination-ul': { flexWrap: 'nowrap' },
                  '& .MuiPaginationItem-root.Mui-selected': { bgcolor: ACCENT, color: '#fff', '&:hover': { bgcolor: '#1b5e20' } }
                }}
              />
            </Box>
          </Box>
        ) : dataMode === 'summary' ? (
          /* Summary table */
          <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: { xs: 0.5, lg: 1 }, px: { xs: 1, lg: 2 }, fontSize: { xs: '0.75rem', lg: '0.85rem' } } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>Style</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>Order No</TableCell>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>PO No</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>InFGs Qty</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summaryData.map((row, idx) => (
                    <TableRow hover key={`${row.poNo}-${idx}`}
                      sx={{ '&:hover': { backgroundColor: '#c8e6c9 !important' } }}
                    >
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{row.style || '-'}</TableCell>
                      <TableCell>{row.orderNo || '-'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{row.poNo}</TableCell>
                      <TableCell align="right">
                        <Chip label={row.inFGsQty} size="small" color="success" sx={{ fontWeight: 700, minWidth: 50 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ backgroundColor: '#e8f5e9' }}>
                    <TableCell />
                    <TableCell colSpan={3} sx={{ fontWeight: 800, fontSize: '0.9rem' }}>TOTAL</TableCell>
                    <TableCell align="right">
                      <Chip label={summaryTotal} size="small" color="primary" sx={{ fontWeight: 800, minWidth: 60 }} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : dataMode === 'poSummary' ? (
          /* PO Summary table */
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: { xs: 0.5, lg: 1 }, px: { xs: 1, lg: 2 }, fontSize: { xs: '0.75rem', lg: '0.85rem' } } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>PO No</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>Req CTN</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>FGs CTN</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>InFGs Qty</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(poData as PoSummaryRow[]).map((row, idx) => (
                  <TableRow hover key={`${row.poNo}-${idx}`} sx={{ '&:hover': { backgroundColor: '#c8e6c9 !important' } }}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.poNo}</TableCell>
                    <TableCell align="right">{row.reqCTN}</TableCell>
                    <TableCell align="right">{row.fgsCTN}</TableCell>
                    <TableCell align="right">
                      <Chip label={row.inFGsQty} size="small" color="success" sx={{ fontWeight: 700, minWidth: 50 }} />
                    </TableCell>
                  </TableRow>
                ))}
                {poData.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No data found</Typography>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          /* PO CTN Detail table */
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: { xs: 0.5, lg: 1 }, px: { xs: 1, lg: 2 }, fontSize: { xs: '0.75rem', lg: '0.85rem' } } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>CTN No</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>Manu Size</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>Req Qty</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>Sum Qty</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>Created By</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>Factory</TableCell>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5' }}>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(poData as PoDetailRow[]).map((row, idx) => (
                  <TableRow hover key={`${row.ctnNo}-${idx}`} sx={{ '&:hover': { backgroundColor: '#c8e6c9 !important' } }}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.ctnNo}</TableCell>
                    <TableCell>{row.manuSize || '-'}</TableCell>
                    <TableCell align="right">{row.reqQtybySize}</TableCell>
                    <TableCell align="right">{row.sumQtybySize ?? '-'}</TableCell>
                    <TableCell>{row.createdBy || '-'}</TableCell>
                    <TableCell>{row.factory || '-'}</TableCell>
                    <TableCell>{row.sysCreateDate ? new Date(row.sysCreateDate).toLocaleString() : '-'}</TableCell>
                  </TableRow>
                ))}
                {poData.length === 0 && (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No data found</Typography>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* PO Summary/Detail Dialog */}
      <Dialog open={poDialogOpen} onClose={() => setPoDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 400 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#1565c0' }}>PO: {poSearch}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ whiteSpace: 'pre-line' }}>
            {'If you want to make a summary => click: YES\nIf you want to see CTN details => click: NO'}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => handlePoChoice('summary')}
            sx={{ borderRadius: 1.5, fontWeight: 700, backgroundColor: '#2e7d32', '&:hover': { backgroundColor: '#1b5e20' } }}
          >Yes</Button>
          <Button variant="outlined" onClick={() => handlePoChoice('detail')}
            sx={{ borderRadius: 1.5, fontWeight: 700, borderColor: '#1565c0', color: '#1565c0' }}
          >No</Button>
          <Button onClick={() => setPoDialogOpen(false)} sx={{ borderRadius: 1.5, fontWeight: 600, color: '#999' }}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          sx={{ borderRadius: 2, fontWeight: 600 }}>{snackbar.message}</Alert>
      </Snackbar>
      <ConfirmDialog state={confirmDialog} onClose={closeConfirm} />
      </Box>
    </Paper>
  );
}

