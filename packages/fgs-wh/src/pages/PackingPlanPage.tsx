import { useState, useCallback, useMemo, useRef, memo, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Pagination, Select, MenuItem, Chip, Button, TextField,
  CircularProgress, Alert, Snackbar, IconButton, Popover, InputAdornment, Badge, Grid
} from '@mui/material';
import {
  Inventory2 as PackingIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FileDownload as ExcelIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { parsePackingPlanPdf, type PackingPlanRow } from '../utils/packingPlanParser';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';
const ACCENT = '#2e7d32';

// Extracted to packingPlanParser.ts

// ─── Column Filter Popover (same as HistoryPage) ───
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

const columns = [
  { id: 'planRefNo', label: 'Plan Ref No' },
  { id: 'poNo', label: 'PO No' },
  { id: 'buyerItem', label: 'Buyer Item' },
  { id: 'custSize', label: 'Cust Size' },
  { id: 'manuSize', label: 'Manu Size' },
  { id: 'gpsSize', label: 'GPS Size' },
  { id: 'ctnNo', label: 'CTN No', align: 'right' as const },
  { id: 'ctnSeriNo', label: 'CTN SeriNo' },
  { id: 'packedQty', label: 'Packed Qty', align: 'right' as const },
  { id: 'factory', label: 'Factory' },
  { id: 'grssW', label: 'Gross W', align: 'right' as const },
  { id: 'netW', label: 'Net W', align: 'right' as const },
  { id: 'ctnL', label: 'CTN L', align: 'right' as const },
  { id: 'ctnW', label: 'CTN W', align: 'right' as const },
  { id: 'ctnH', label: 'CTN H', align: 'right' as const },
  { id: 'orderNo', label: 'Order No' },
  { id: 'custNo', label: 'Cust No' },
  { id: 'lineAggerator', label: 'Line Aggerator' },
];

const STORAGE_KEY = 'packingPlanState';

interface SavedState {
  planRefNo: string;
  poNo: string;
  page: number;
  rowsPerPage: number;
  data: PackingPlanRow[];
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

export default function PackingPlanPage() {
  const { t } = useTranslation();
  const saved = useMemo(() => loadSaved(), []);
  const [planRefNo, setPlanRefNo] = useState(saved?.planRefNo ?? '');
  const [poNo, setPoNo] = useState(saved?.poNo ?? '');
  const [data, setData] = useState<PackingPlanRow[]>(saved?.data ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(saved?.page ?? 0);
  const [rowsPerPage, setRowsPerPage] = useState(saved?.rowsPerPage ?? 50);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      // Hardcoded Puma for now as per test requirement, we can add a selector later
      const parsedData = await parsePackingPlanPdf(file, 'Puma', 'FGS');
      setData(parsedData);
      setSnackbar({ open: true, message: `Successfully parsed ${parsedData.length} rows from PDF!`, severity: 'success' });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Failed to parse PDF', severity: 'error' });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    saveState({ planRefNo, poNo, page, rowsPerPage, data });
  }, [planRefNo, poNo, page, rowsPerPage, data]);

  const handleSearch = useCallback(async () => {
    const plan = planRefNo.trim();
    const po = poNo.trim();
    if (!plan && !po) {
      setError(t('packingPlan.errorEmpty'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (plan) params.append('planRefNo', plan);
      if (po) params.append('poNo', po);
      const res = await fetch(`${API_BASE_URL}/packing-plan/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const result = await res.json();
      setData(result);
      setPage(0);
      setColFilters({});
      if (result.length === 0) setSnackbar({ open: true, message: t('packingPlan.noDataFound'), severity: 'error' });
    } catch {
      setError(t('packingPlan.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [planRefNo, poNo]);

  const handleReset = useCallback(() => {
    setPlanRefNo('');
    setPoNo('');
    setData([]);
    setError(null);
    setPage(0);
    setColFilters({});
  }, []);

  // Column filtering
  const filteredData = useMemo(() => {
    const hasFilters = Object.values(colFilters).some(v => v);
    if (!hasFilters) return data;
    return data.filter(row => {
      for (const [key, val] of Object.entries(colFilters)) {
        if (!val) continue;
        const cell = String((row as unknown as Record<string, unknown>)[key] ?? '').toLowerCase();
        if (!cell.includes(val.toLowerCase())) return false;
      }
      return true;
    });
  }, [data, colFilters]);

  const pagedData = useMemo(() =>
    filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredData, page, rowsPerPage]
  );

  const totalQty = useMemo(() => filteredData.reduce((s, r) => s + (r.packedQty || 0), 0), [filteredData]);
  const activeFilterCount = useMemo(() => Object.values(colFilters).filter(v => v).length, [colFilters]);

  const handleExportExcel = useCallback(() => {
    if (filteredData.length === 0) return;
    const rows = filteredData.map((row, idx) => ({
      '#': idx + 1,
      'Plan Ref No': row.planRefNo, 'PO No': row.poNo, 'Buyer Item': row.buyerItem,
      'Cust Size': row.custSize, 'Manu Size': row.manuSize, 'GPS Size': row.gpsSize,
      'CTN No': row.ctnNo, 'CTN SeriNo': row.ctnSeriNo, 'Packed Qty': row.packedQty,
      'Factory': row.factory, 'Gross W': row.grssW, 'Net W': row.netW,
      'CTN L': row.ctnL, 'CTN W': row.ctnW, 'CTN H': row.ctnH,
      'Order No': row.orderNo, 'Cust No': row.custNo, 'Line Aggerator': row.lineAggerator,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PackingPlan');
    XLSX.writeFile(wb, `PackingPlan_${planRefNo || poNo || 'All'}.xlsx`);
  }, [filteredData, planRefNo, poNo]);

  return (
    <Paper elevation={0} sx={{ p: 1, bgcolor: 'transparent', flexGrow: 1, height: '100%' }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        <Grid size={{ xs: 12 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', '& > *:not(:last-child)': { mb: 2 }, height: '100%' }}>

      {/* ── Compact Header + Filters ── */}
      <Paper elevation={0} sx={{
        p: '8px 12px', borderRadius: 2.5, border: '1px solid #e2e8f0',
        background: 'linear-gradient(135deg, #f8faf8 0%, #ffffff 100%)',
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>


          {/* Inputs & Buttons */}
          <TextField size="small" placeholder={t('packingPlan.planRefNo', 'Plan Ref No')}
            value={planRefNo} onChange={(e) => setPlanRefNo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }}
            sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem', bgcolor: '#fff' } }}
          />
          <TextField size="small" placeholder={t('packingPlan.poNo', 'PO No')}
            value={poNo} onChange={(e) => setPoNo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }}
            sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem', bgcolor: '#fff' } }}
          />

          <Button variant="contained" startIcon={<SearchIcon sx={{ fontSize: '18px !important' }} />} onClick={handleSearch} disabled={loading} disableElevation
            sx={{ borderRadius: 1.5, fontWeight: 700, height: 32, px: 2, textTransform: 'none', minWidth: 100,
              background: 'linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)', '&:hover': { background: '#1b5e20' } }}
          >{t('genesis.searchBtn', 'Tìm kiếm')}</Button>

          <Button variant="outlined" startIcon={<RefreshIcon sx={{ fontSize: '18px !important' }} />} disabled={loading}
            onClick={handleReset}
            sx={{ borderRadius: 1.5, fontWeight: 600, height: 32, px: 1.5, textTransform: 'none', borderColor: '#cbd5e1', color: '#64748b', minWidth: 90 }}
          >{t('packingPlan.reset', 'Đặt lại')}</Button>

          <input type="file" accept=".pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
          <Button variant="contained" startIcon={<UploadIcon sx={{ fontSize: '18px !important' }} />} onClick={() => fileInputRef.current?.click()} disabled={loading} disableElevation
            sx={{ borderRadius: 1.5, fontWeight: 700, height: 32, px: 2, textTransform: 'none', minWidth: 120,
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', '&:hover': { background: '#b45309' } }}
          >Upload PDF</Button>
        </Box>

        {/* Stats & Actions Area */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip size="small"
            label={`${t('history.total', 'Total')}: ${filteredData.length}${filteredData.length !== data.length ? ` / ${data.length}` : ''}`}
            sx={{ height: 26, fontSize: '0.75rem', fontWeight: 700, bgcolor: '#e3f2fd', color: '#1565c0' }}
          />
          {filteredData.length > 0 && (
            <Chip size="small" label={`${t('packingPlan.sumQty')}: ${totalQty}`}
              sx={{ height: 26, fontSize: '0.75rem', fontWeight: 600, bgcolor: '#f1f8e9', color: '#33691e', border: '1px solid #c5e1a5' }} />
          )}
          {activeFilterCount > 0 && (
            <Chip size="small" label={`${activeFilterCount} filter`} color="success" variant="outlined"
              onDelete={() => setColFilters({})} sx={{ height: 26, fontSize: '0.75rem', fontWeight: 600 }} />
          )}
          <Button variant="contained" size="small" startIcon={<ExcelIcon sx={{ fontSize: '18px !important' }} />} onClick={handleExportExcel}
            disabled={filteredData.length === 0} disableElevation
            sx={{ borderRadius: 1.5, fontWeight: 700, height: 32, px: 1.5, backgroundColor: '#2e7d32', textTransform: 'none',
              '&:hover': { backgroundColor: '#1b5e20' } }}
          >Excel</Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

      {/* Data Table */}
      <Paper elevation={0} sx={{ width: '100%', overflow: 'hidden', borderRadius: 2, border: '1px solid #e0e0e0', flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <>
            <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
              <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: { xs: 0.5, lg: 1 }, px: { xs: 1, lg: 2 }, fontSize: { xs: '0.75rem', lg: '0.85rem' } } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5', minWidth: 40 }}>#</TableCell>
                    {columns.map(col => (
                      <TableCell key={col.id} align={col.align || 'left'}
                        sx={{ fontWeight: 700, backgroundColor: '#f5f5f5', whiteSpace: 'nowrap', py: 0.5 }}
                      >
                        <ColumnFilter
                          label={col.label}
                          value={colFilters[col.id] || ''}
                          onChange={(v) => setColFilters(prev => ({ ...prev, [col.id]: v }))}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedData.map((row, idx) => (
                    <TableRow hover key={`${row.ctnSeriNo}-${idx}`}
                      sx={{ '&:hover': { backgroundColor: '#c8e6c9 !important' } }}
                    >
                      <TableCell>{page * rowsPerPage + idx + 1}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.planRefNo || '-'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.poNo || '-'}</TableCell>
                      <TableCell>{row.buyerItem || '-'}</TableCell>
                      <TableCell>{row.custSize || '-'}</TableCell>
                      <TableCell>{row.manuSize || '-'}</TableCell>
                      <TableCell>{row.gpsSize || '-'}</TableCell>
                      <TableCell align="right">{row.ctnNo}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.ctnSeriNo || '-'}</TableCell>
                      <TableCell align="right">
                        <Chip label={row.packedQty} size="small" color="success" sx={{ fontWeight: 700, minWidth: 40 }} />
                      </TableCell>
                      <TableCell>{row.factory || '-'}</TableCell>
                      <TableCell align="right">{row.grssW ?? '-'}</TableCell>
                      <TableCell align="right">{row.netW ?? '-'}</TableCell>
                      <TableCell align="right">{row.ctnL ?? '-'}</TableCell>
                      <TableCell align="right">{row.ctnW ?? '-'}</TableCell>
                      <TableCell align="right">{row.ctnH ?? '-'}</TableCell>
                      <TableCell>{row.orderNo || '-'}</TableCell>
                      <TableCell>{row.custNo || '-'}</TableCell>
                      <TableCell>{row.lineAggerator || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={19} align="center" sx={{ py: 6 }}>
                        <Typography variant="body1" color="text.secondary">
                          {t('packingPlan.noData', 'Enter Plan Ref No or PO No and click Search')}
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
                  {[25, 50, 100, 200, 500].map(v => <MenuItem key={v} value={v} sx={{ fontSize: '0.85rem' }}>{v}</MenuItem>)}
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

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          sx={{ borderRadius: 2, fontWeight: 600 }}>{snackbar.message}</Alert>
      </Snackbar>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}
