import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Pagination, Select, MenuItem, Chip, Button, TextField,
  CircularProgress, Alert, IconButton, Popover, InputAdornment, Badge, Grid, Checkbox, FormGroup, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, ButtonGroup
} from '@mui/material';
import {
  LocalShipping as PlanIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  TableChart as ExcelIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  PlayArrow as LoadIcon,
  Send as ShipIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';
const ACCENT = '#2e7d32';

interface PlanRow {
  StyleNo: string;
  PONo: string;
  Country: string;
  OrderQty: number;
  SchExFactory: string;
  Fowarder: string;
  InvNo: string;
  CTNQty: number;
  InCTNQty: number | null;
  PerClose: number | null;
  Final: string | null;
  POLocation: string | null;
  Comment2: string | null;
  Factory: string | null;
  CTNSize: string | null;
  CBM: number | null;
  CreatedBy: string | null;
  WeightCTN: string | null;
  [key: string]: unknown;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const PL_STORAGE_KEY = 'planLoadPageState';
interface PLSavedState { dateFilter: string; customer: string; page: number; rowsPerPage: number; data: PlanRow[]; loaded: boolean; }
function plLoadSaved(): PLSavedState | null { try { const r = sessionStorage.getItem(PL_STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
function plSaveState(s: PLSavedState) { sessionStorage.setItem(PL_STORAGE_KEY, JSON.stringify(s)); }

// ─── Module-level fetch: survives component unmount ───
let _pendingFetch: Promise<PlanRow[]> | null = null;
let _fetchListeners: Array<(data: PlanRow[] | null, err: string | null) => void> = [];

function startBackgroundFetch(dateCompact: string, customer: string) {
  const token = localStorage.getItem('token');
  _pendingFetch = fetch(`${API_BASE_URL}/plan-load?date=${dateCompact}&customer=${encodeURIComponent(customer)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(res => { if (!res.ok) throw new Error('Failed'); return res.json(); })
    .then((result: PlanRow[]) => {
      // Save to sessionStorage even if component unmounted
      const prev = plLoadSaved();
      plSaveState({ dateFilter: prev?.dateFilter ?? '', customer: prev?.customer ?? 'Adidas', page: 0, rowsPerPage: prev?.rowsPerPage ?? 25, data: result, loaded: true });
      _fetchListeners.forEach(cb => cb(result, null));
      _pendingFetch = null;
      _fetchListeners = [];
      return result;
    })
    .catch(err => {
      _fetchListeners.forEach(cb => cb(null, err?.message || 'Failed'));
      _pendingFetch = null;
      _fetchListeners = [];
      return [] as PlanRow[];
    });
  return _pendingFetch;
}

// ─── Column Filter Popover ───
const ColumnFilter = memo(({ label, value, options, onChange }: { label: string; value: string[]; options: string[]; onChange: (v: string[]) => void }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [localValue, setLocalValue] = useState<string[]>(value || []);

  const active = value && value.length > 0;

  useEffect(() => {
    if (anchorEl) {
      setLocalValue(value || []);
      setSearch('');
    }
  }, [anchorEl, value]);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const s = search.toLowerCase();
    return options.filter(o => o.toLowerCase().includes(s));
  }, [options, search]);

  const handleSelectAll = () => {
    if (localValue.length === options.length) {
      setLocalValue([]);
    } else {
      setLocalValue([...options]);
    }
  };

  const handleToggle = (opt: string) => {
    setLocalValue(prev => prev.includes(opt) ? prev.filter(v => v !== opt) : [...prev, opt]);
  };

  const handleApply = () => {
    onChange(localValue);
    setAnchorEl(null);
  };

  const isAllSelected = localValue.length > 0 && localValue.length === options.length;
  const isIndeterminate = localValue.length > 0 && localValue.length < options.length;

  return (
    <>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.75rem', lineHeight: 1.2 }}>{label}</Typography>
        <IconButton size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ p: 0.25, color: active ? '#2e7d32' : '#bbb', '&:hover': { color: '#2e7d32', backgroundColor: '#e8f5e9' } }}
        >
          <Badge variant="dot" invisible={!active} color="success"><FilterIcon sx={{ fontSize: 14 }} /></Badge>
        </IconButton>
      </Box>
      <Popover open={!!anchorEl} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' } } }}
      >
        <Box sx={{ p: 1.5, width: 260, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField 
            size="small" 
            placeholder={`Search ${label}...`} 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            autoFocus 
            fullWidth
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment>
            }}
          />
          <Box sx={{ maxHeight: 250, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 1, p: 0.5 }}>
            <FormGroup>
              {!search && (
                <FormControlLabel 
                  control={<Checkbox checked={isAllSelected} indeterminate={isIndeterminate} onChange={handleSelectAll} size="small" />} 
                  label={<Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>(Select All)</Typography>}
                  sx={{ m: 0, px: 0.5, '&:hover': { bgcolor: '#f5f5f5' } }}
                />
              )}
              {filteredOptions.map(opt => (
                <FormControlLabel 
                  key={opt}
                  control={<Checkbox checked={localValue.includes(opt)} onChange={() => handleToggle(opt)} size="small" />} 
                  label={<Typography noWrap sx={{ fontSize: '0.85rem' }} title={opt}>{opt || '(Blanks)'}</Typography>}
                  sx={{ m: 0, px: 0.5, '&:hover': { bgcolor: '#f5f5f5' } }}
                />
              ))}
              {filteredOptions.length === 0 && (
                <Typography sx={{ p: 1, color: 'text.secondary', fontSize: '0.8rem', textAlign: 'center' }}>No matches found</Typography>
              )}
            </FormGroup>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 0.5 }}>
            <Button size="small" color="inherit" onClick={() => setAnchorEl(null)}>Cancel</Button>
            <Button size="small" variant="contained" color="success" onClick={handleApply}>OK</Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
});

const formatDate = (val: unknown) => {
  if (!val) return '';
  const s = String(val);
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('vi-VN');
  } catch { return s; }
};

export default function PlanLoadPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const saved = plLoadSaved();

  const [data, setData] = useState<PlanRow[]>(saved?.data ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(saved?.loaded ?? false);
  const [cmtMode, setCmtMode] = useState(false);
  const [cmtDialogState, setCmtDialogState] = useState<{ open: boolean; row: PlanRow | null }>({ open: false, row: null });
  const [cmtForm, setCmtForm] = useState({ Final: '', Comment1: '', POLocation: '', InCTNQty: '', FullPONo: '' });
  const [savingCmt, setSavingCmt] = useState(false);
  const [loadingCmt, setLoadingCmt] = useState(false);

  useEffect(() => {
    if (cmtDialogState.open && cmtDialogState.row) {
      setLoadingCmt(true);
      const token = localStorage.getItem('token');
      fetch(`${API_BASE_URL}/plan-load/comment/${encodeURIComponent(cmtDialogState.row.PONo)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setCmtForm({
          Final: data.Final || cmtDialogState.row?.Final || '',
          Comment1: data.Comment1 || '',
          POLocation: data.POLocation || cmtDialogState.row?.POLocation || '',
          InCTNQty: data.InCTNQty?.toString() || cmtDialogState.row?.InCTNQty?.toString() || '',
          FullPONo: data.FullPONo || cmtDialogState.row?.PONo || ''
        });
      })
      .catch(err => console.error('Failed to load comment:', err))
      .finally(() => setLoadingCmt(false));
    }
  }, [cmtDialogState.open, cmtDialogState.row]);

  const [dateFilter, setDateFilter] = useState(saved?.dateFilter ?? todayISO());
  const [customer, setCustomer] = useState(saved?.customer ?? 'Adidas');

  const [page, setPage] = useState(saved?.page ?? 0);
  const [rowsPerPage, setRowsPerPage] = useState(saved?.rowsPerPage ?? 25);
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});
  const updateColFilter = useCallback((col: string, val: string[]) => { setColFilters(prev => ({ ...prev, [col]: val })); setPage(0); }, []);

  useEffect(() => {
    plSaveState({ dateFilter, customer, page, rowsPerPage, data, loaded });
  }, [dateFilter, customer, page, rowsPerPage, data, loaded]);

  const columns = useMemo(() => [
    { key: 'StyleNo', label: 'Style No', minW: 130 },
    { key: 'PONo', label: 'PO No', minW: 100 },
    { key: 'Country', label: 'Country', minW: 90 },
    { key: 'OrderQty', label: 'Order Qty', align: 'right' as const, minW: 70 },
    { key: 'SchExFactory', label: 'Sch Ex-Fac', minW: 90 },
    { key: 'Fowarder', label: 'Forwarder', minW: 120 },
    { key: 'InvNo', label: 'Inv No', minW: 80 },
    { key: 'CTNQty', label: 'CTN Qty', align: 'right' as const, minW: 60 },
    { key: 'InCTNQty', label: 'InCTN', align: 'right' as const, minW: 55 },
    { key: 'PerClose', label: '% Close', align: 'right' as const, minW: 70 },
    { key: 'Final', label: 'Final', minW: 45 },
    { key: 'POLocation', label: 'Location', minW: 70 },
    { key: 'Comment2', label: 'Comment', minW: 60 },
    { key: 'Factory', label: 'Fac', minW: 45 },
    { key: 'CTNSize', label: 'CTN Size', minW: 120 },
    { key: 'CBM', label: 'CBM', align: 'right' as const, minW: 70 },
    { key: 'CreatedBy', label: 'Created By', minW: 100 },
    { key: 'WeightCTN', label: 'Wght/CTN', minW: 80 },
  ], []);

  const filteredData = useMemo(() => {
    const hasFilters = Object.values(colFilters).some(v => v && v.length > 0);
    if (!hasFilters) return data;
    return data.filter(row => {
      for (const [key, valArr] of Object.entries(colFilters)) {
        if (!valArr || valArr.length === 0) continue;
        let cellVal = String(row[key] ?? '');
        if (key === 'SchExFactory') cellVal = formatDate(row[key]);
        if (!valArr.includes(cellVal)) return false;
      }
      return true;
    });
  }, [data, colFilters]);

  const pagedData = useMemo(() =>
    filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredData, page, rowsPerPage]
  );

  const handleLoad = useCallback(() => {
    setLoading(true);
    setError(null);
    const dateCompact = dateFilter.replace(/-/g, '');

    // Subscribe to result
    const onResult = (result: PlanRow[] | null, err: string | null) => {
      if (err) {
        setError(t('planLoad.error', 'Failed to load plan data.'));
      } else if (result) {
        setData(result);
        setPage(0);
        setColFilters({});
        setLoaded(true);
      }
      setLoading(false);
    };
    _fetchListeners.push(onResult);
    startBackgroundFetch(dateCompact, customer);
  }, [dateFilter, customer, t]);

  // On mount: if a background fetch is still running, subscribe to it
  useEffect(() => {
    if (_pendingFetch) {
      setLoading(true);
      const onResult = (result: PlanRow[] | null, err: string | null) => {
        if (err) setError('Failed to load plan data.');
        else if (result) { setData(result); setPage(0); setColFilters({}); setLoaded(true); }
        setLoading(false);
      };
      _fetchListeners.push(onResult);
    }
  }, []);  

  const handleExportExcel = useCallback(() => {
    if (filteredData.length === 0) return;
    const rows = filteredData.map((row, idx) => {
      const obj: Record<string, unknown> = { '#': idx + 1 };
      columns.forEach(c => { obj[c.label] = row[c.key] ?? ''; });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PlanLoad');
    XLSX.writeFile(wb, `PlanLoad_${customer}_${dateFilter}.xlsx`);
  }, [filteredData, columns, customer, dateFilter]);

  const activeFilterCount = useMemo(() => Object.values(colFilters).filter(v => v).length, [colFilters]);

  const { sumCBM, sumOrderQty, sumCTNQty } = useMemo(() => {
    let cbm = 0, oq = 0, cq = 0;
    filteredData.forEach(r => {
      cbm += Number(r.CBM) || 0;
      oq += Number(r.OrderQty) || 0;
      cq += Number(r.CTNQty) || 0;
    });
    return { sumCBM: Math.round(cbm * 10000) / 10000, sumOrderQty: oq, sumCTNQty: cq };
  }, [filteredData]);



  const columnOptions = useMemo(() => {
    const opts: Record<string, string[]> = {};
    columns.forEach(col => {
      const set = new Set<string>();
      data.forEach(row => {
        let val = row[col.key];
        if (col.key === 'SchExFactory') val = formatDate(val);
        if (val != null && val !== '') {
          set.add(String(val));
        }
      });
      opts[col.key] = Array.from(set).sort();
    });
    return opts;
  }, [data, columns]);

  const renderCell = (row: PlanRow, key: string) => {
    const val = row[key];
    if (val === null || val === undefined) return '-';
    if (key === 'SchExFactory') return formatDate(val);
    if (key === 'CBM') {
      const n = Number(val);
      return isNaN(n) ? String(val) : n.toFixed(4);
    }
    if (key === 'PerClose') {
      const n = Number(val);
      return (
        <Chip label={`${n}%`} size="small"
          color={n >= 100 ? 'success' : n >= 50 ? 'warning' : 'default'}
          sx={{ fontWeight: 700, minWidth: 50 }}
        />
      );
    }
    if (key === 'Final') {
      return val === 'P' ? <Chip label="P" size="small" color="success" sx={{ fontWeight: 700 }} /> : String(val);
    }
    if (key === 'Factory') {
      return val ? <Chip label={String(val)} size="small" variant="outlined" sx={{ fontWeight: 600 }} /> : '-';
    }
    // Long text columns: break lines after commas
    if (key === 'CTNSize' || key === 'CreatedBy' || key === 'Fowarder') {
      const text = String(val);
      if (text.includes(',')) {
        return (
          <Box sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.4 }}>
            {text.split(',').filter(Boolean).join(',\n')}
          </Box>
        );
      }
      return text;
    }
    return String(val);
  };

  return (
    <Paper elevation={0} sx={{ 
      p: 1.5, bgcolor: 'transparent', flexGrow: 1, minHeight: 0, 
      display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 1.5
    }}>
      {/* ── Compact Header + Filters ── */}
      <Paper elevation={0} sx={{
        p: '6px 12px', borderRadius: 2.5, border: '1px solid #e2e8f0',
        background: 'linear-gradient(135deg, #f8faf8 0%, #ffffff 100%)',
        display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', flexShrink: 0
      }}>


        {/* Filters & Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'nowrap' }}>
          <TextField size="small" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
            sx={{ width: 130, '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem', bgcolor: '#fff' } }}
          />
          <TextField size="small" placeholder={t('planLoad.customer', 'Customer')}
            value={customer} onChange={(e) => setCustomer(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></InputAdornment> }}
            sx={{ width: { xs: 120, sm: 160 }, '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem', bgcolor: '#fff' } }}
          />
          <Button variant="contained" disableElevation onClick={handleLoad} disabled={loading}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <LoadIcon sx={{ fontSize: '16px !important' }} />}
            sx={{ borderRadius: 1.5, fontWeight: 700, height: 32, px: 2, fontSize: '0.8rem', textTransform: 'none', background: 'linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)', whiteSpace: 'nowrap' }}>
            {t('planLoad.loadBtn', 'Tải dữ liệu')}
          </Button>

          {loaded && (
            <IconButton onClick={() => { setColFilters({}); handleLoad(); }} disabled={loading} sx={{ width: 32, height: 32, border: '1px solid #cbd5e1', borderRadius: 1.5, bgcolor: '#fff' }}>
              <RefreshIcon sx={{ fontSize: 16, color: '#64748b' }} />
            </IconButton>
          )}
        </Box>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Stats & Excel */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'nowrap' }}>
          {loaded && (
            <>
              <Chip size="small" label={`Tổng: ${filteredData.length}${filteredData.length !== data.length ? ` / ${data.length}` : ''}`} sx={{ height: 24, fontSize: '0.75rem', fontWeight: 700, bgcolor: '#e3f2fd', color: '#1565c0', display: { xs: 'none', xl: 'inline-flex' } }} />
              <Chip size="small" label={`CBM: ${sumCBM} | Qty: ${sumOrderQty} | CTN: ${sumCTNQty}`} sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600, bgcolor: '#f1f8e9', color: '#33691e', border: '1px solid #c5e1a5', display: { xs: 'none', lg: 'inline-flex' } }} />
            </>
          )}
          {activeFilterCount > 0 && <Chip size="small" label={`${activeFilterCount} filter`} color="success" variant="outlined" onDelete={() => setColFilters({})} sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600 }} />}
          <Button variant={cmtMode ? "contained" : "outlined"} size="small" onClick={() => setCmtMode(!cmtMode)} sx={{ borderRadius: 1.5, fontWeight: 700, height: 32, px: 1.5, fontSize: '0.8rem', textTransform: 'none', borderColor: cmtMode ? 'transparent' : '#cbd5e1', bgcolor: cmtMode ? '#22c55e' : 'transparent', color: cmtMode ? '#fff' : '#475569', '&:hover': { bgcolor: cmtMode ? '#16a34a' : '#f1f5f9' } }}>
            + POCmt
          </Button>
          <Button variant="contained" size="small" startIcon={<ExcelIcon sx={{ fontSize: '16px !important' }} />} onClick={handleExportExcel} disabled={filteredData.length === 0} disableElevation sx={{ borderRadius: 1.5, fontWeight: 700, height: 32, px: 1.5, fontSize: '0.8rem', backgroundColor: '#2e7d32', textTransform: 'none' }}>
            Excel
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

      {/* Table */}
      <Paper elevation={0} sx={{ width: '100%', overflow: 'hidden', borderRadius: 2, border: '1px solid #e0e0e0', flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {!loaded ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
            <PlanIcon sx={{ fontSize: 64, color: '#ccc' }} />
            <Typography variant="body1" color="text.secondary">
              {t('planLoad.clickLoad', 'Bấm "Tải dữ liệu" để xem kế hoạch xuất hàng')}
            </Typography>
          </Box>
        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <>
            <TableContainer sx={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}>
              <Table stickyHeader size="small" sx={{ tableLayout: 'auto', '& .MuiTableCell-root': { py: { xs: 0.5, lg: 0.8 }, px: { xs: 1, lg: 1.5 }, fontSize: { xs: '0.7rem', lg: '12px' } } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5', minWidth: 35 }}>#</TableCell>
                    {columns.map(col => (
                      <TableCell key={col.key} align={col.align} sx={{ minWidth: col.minW, p: 1, backgroundColor: '#f8f9fa' }}>
                        <ColumnFilter label={col.label} value={colFilters[col.key] || []} options={columnOptions[col.key] || []} onChange={(v) => updateColFilter(col.key, v)} />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedData.map((row, idx) => (
                    <TableRow hover key={`${row.PONo}-${idx}`}
                      onClick={() => {
                        if (cmtMode) {
                          setCmtForm({ Final: row.Final || '', Comment1: '', POLocation: row.POLocation || '', InCTNQty: row.InCTNQty?.toString() || '' });
                          setCmtDialogState({ open: true, row });
                        }
                      }}
                      sx={{ '&:hover': { backgroundColor: '#c8e6c9 !important' }, cursor: cmtMode ? 'pointer' : 'default' }}
                    >
                      <TableCell>{page * rowsPerPage + idx + 1}</TableCell>
                      {columns.map(col => (
                        <TableCell key={col.key} align={col.align} sx={{ whiteSpace: 'nowrap' }}>
                          {renderCell(row, col.key)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 6 }}>
                        <Typography variant="body1" color="text.secondary">
                          {t('planLoad.noData', 'Không có dữ liệu')}
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
                  {[10, 25, 50, 100].map(v => <MenuItem key={v} value={v} sx={{ fontSize: '0.85rem' }}>{v}</MenuItem>)}
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
          </>
        )}
      </Paper>
      {/* PO Comment Dialog */}
      <Dialog open={cmtDialogState.open} onClose={() => setCmtDialogState({ open: false, row: null })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1, fontSize: '1.1rem' }}>
          Update PO: {cmtForm.FullPONo || cmtDialogState.row?.PONo}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
          {loadingCmt ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <>
              <TextField size="small" label="Location" value={cmtForm.POLocation} onChange={e => setCmtForm(prev => ({ ...prev, POLocation: e.target.value }))} fullWidth />
              <TextField select size="small" label="Final Comment" value={cmtForm.Final} onChange={e => setCmtForm(prev => ({ ...prev, Final: e.target.value }))} fullWidth>
                <MenuItem value=""><em>(Trống)</em></MenuItem>
                <MenuItem value="F-Ok">F-Ok</MenuItem>
                <MenuItem value="NR4Ins">NR4Ins</MenuItem>
                <MenuItem value="Get">Get</MenuItem>
                <MenuItem value="P">P</MenuItem>
              </TextField>
              <TextField size="small" label="Comment1" value={cmtForm.Comment1} onChange={e => setCmtForm(prev => ({ ...prev, Comment1: e.target.value }))} fullWidth />
              <TextField size="small" label="In CTN Qty" type="number" value={cmtForm.InCTNQty} onChange={e => setCmtForm(prev => ({ ...prev, InCTNQty: e.target.value }))} fullWidth />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setCmtDialogState({ open: false, row: null })} color="inherit" sx={{ fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" color="success" disableElevation onClick={async () => {
             try {
                setSavingCmt(true);
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/plan-load/comment`, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                   body: JSON.stringify({ PONo: cmtDialogState.row?.PONo, ...cmtForm })
                });
                if (!res.ok) throw new Error(await res.text());
                setCmtDialogState({ open: false, row: null });
                handleLoad();
             } catch (err: any) {
                alert('Save failed: ' + err.message);
             } finally {
                setSavingCmt(false);
             }
          }} disabled={savingCmt} sx={{ fontWeight: 700, px: 3 }}>
            {savingCmt ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
