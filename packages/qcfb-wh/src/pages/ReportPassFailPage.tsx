import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Chip, Pagination, Select, MenuItem,
  Snackbar, Alert, Popover, Autocomplete, IconButton, Badge, Skeleton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useTranslation } from 'react-i18next';
import { useToast } from '@traxeco/shared';
import FilterListIcon from '@mui/icons-material/FilterList';

const EMPTY_OPTIONS: readonly string[] = [];
const ACCENT = '#2e7d32';

const ColumnFilter = React.memo(({ colKey, label, value, onChange }: { colKey: string; label: string; value: string; onChange: (k: string, v: string) => void }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const active = !!value;

  const handleChange = React.useCallback((v: string) => { onChange(colKey, v); }, [colKey, onChange]);
  const parsedValue = useMemo(() => value ? value.split(',').map(s => s.trim()).filter(Boolean) : [], [value]);

  return (
    <>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.2 }}>{label}</Typography>
        <IconButton
          size="small"
          onClick={(e) => { setAnchorEl(e.currentTarget); setTimeout(() => inputRef.current?.focus(), 80); }}
          sx={{ p: 0.25, color: active ? ACCENT : '#bbb', '&:hover': { color: ACCENT, backgroundColor: '#e8f5e9' } }}
        >
          <Badge variant="dot" invisible={!active} color="success">
            <FilterListIcon sx={{ fontSize: 15 }} />
          </Badge>
        </IconButton>
      </Box>
      <Popover
        open={!!anchorEl} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 1.5, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 260, maxWidth: 350 } } }}
      >
        <Autocomplete
          multiple
          freeSolo
          options={EMPTY_OPTIONS}
          value={parsedValue}
          onChange={(e, newVal) => handleChange(newVal.join(', '))}
          renderTags={(tagValue, getTagProps) =>
            tagValue.map((option, index) => {
              const { key, ...restProps } = getTagProps({ index });
              return <Chip variant="outlined" label={option} size="small" key={key} {...restProps} sx={{ height: 24, fontSize: '0.75rem' }} />;
            })
          }
          renderInput={(params) => (
            <TextField {...params} inputRef={inputRef} size="small" placeholder={value ? '' : `Filter ${label}...`}
              onKeyDown={(e) => { if (e.key === 'Escape') setAnchorEl(null); }}
              autoFocus fullWidth
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <>
                    <SearchIcon sx={{ fontSize: 18, color: '#999', ml: 0.5, mr: 0.5 }} />
                    {params.InputProps.startAdornment}
                  </>
                )
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem' } }}
            />
          )}
        />
      </Popover>
    </>
  );
});


const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

const todayStr = () => new Date().toISOString().slice(0, 10);
const lastMonthStr = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};

let pageCache: any = null;

interface ReportRow {
  Date: string;
  SupCode: string;
  InvoiceNo: string;
  OrderNumber: string;
  RollItem: string;
  Color: string;
  QtyReceive: number;
  QtyInspt: string;
  Pass: string;
  Width: string;
  Remark: string;
}

const getPassColor = (pass: string) => {
  switch (pass?.toUpperCase()) {
    case 'OK': return 'success';
    case 'REJECT': return 'error';
    case 'HOLD': return 'warning';
    default: return 'default';
  }
};

const MemoReportRow = React.memo(({ row, index }: { row: ReportRow; index: number }) => (
  <TableRow hover>
    <TableCell>{index}</TableCell>
    <TableCell>{row.Date}</TableCell>
    <TableCell>{row.SupCode}</TableCell>
    <TableCell>{row.InvoiceNo}</TableCell>
    <TableCell>{row.OrderNumber}</TableCell>
    <TableCell>{row.RollItem}</TableCell>
    <TableCell>{row.Color}</TableCell>
    <TableCell align="right" sx={{ fontWeight: 600 }}>{row.QtyReceive ? Number(row.QtyReceive).toFixed(2) : ''}</TableCell>
    <TableCell align="right" sx={{ fontWeight: 600, color: '#3b82f6' }}>{row.QtyInspt}</TableCell>
    <TableCell>
      <Chip
        label={row.Pass || 'N/A'}
        color={getPassColor(row.Pass) as any}
        size="small"
        sx={{ fontWeight: 'bold' }}
      />
    </TableCell>
    <TableCell>{row.Remark}</TableCell>
  </TableRow>
));

const ReportPassFailPage: React.FC = () => {
  const { t } = useTranslation();
  // Filters
  const [fromDate, setFromDate] = useState(pageCache?.fromDate || lastMonthStr());
  const [toDate, setToDate] = useState(pageCache?.toDate || todayStr());
  const [invoiceNo, setInvoiceNo] = useState(pageCache?.invoiceNo || '');
  const [poNo, setPoNo] = useState(pageCache?.poNo || '');
  const [itemNo, setItemNo] = useState(pageCache?.itemNo || '');

  // Data
  const [data, setData] = useState<ReportRow[]>(pageCache?.data || []);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pagination
  const [page, setPage] = useState(pageCache?.page || 0);
  const [rowsPerPage, setRowsPerPage] = useState(pageCache?.rowsPerPage || 50);

  // Cache Update
  pageCache = { fromDate, toDate, invoiceNo, poNo, itemNo, data, page, rowsPerPage };

  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const updateColFilter = React.useCallback((col: string, val: string) => { setColFilters(prev => ({ ...prev, [col]: val })); setPage(0); }, []);

  // Filter Data
  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(colFilters).filter(([, v]) => v);
    if (activeFilters.length === 0) return data;
    return data.filter(row => {
      for (const [key, val] of activeFilters) {
        const cellVal = String((row as any)[key] ?? '').toLowerCase();
        const tokens = val.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
        if (tokens.length > 0) {
          if (!tokens.some(t => cellVal.includes(t))) return false;
        } else {
          if (!cellVal.includes(val.toLowerCase())) return false;
        }
      }
      return true;
    });
  }, [data, colFilters]);

  const paginatedData = useMemo(() => {
    return filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  const { showToast } = useToast();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (invoiceNo.trim()) params.append('invoiceNo', invoiceNo.trim());
      if (poNo.trim()) params.append('poNo', poNo.trim());
      if (itemNo.trim()) params.append('itemNo', itemNo.trim());

      const res = await fetch(`${API_BASE}/qcfb/report-pass-fail?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load report data');

      const result = await res.json();
      setData(result);

      if (!result || result.length === 0) {
        showToast(t('qcfb.noDataFound', 'Không tìm thấy dữ liệu!'), 'warning');
      } else {
        showToast(t('qcfb.loadSuccess', 'Tải thành công {{count}} dòng báo cáo', { count: result.length }), 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || t('qcfb.errorFetch', 'Lỗi khi tải dữ liệu!'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    if (!filteredData.length) {
      showToast(t('qcfb.noDataToExport', 'Không có dữ liệu để xuất'), 'warning');
      return;
    }

    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet('ReportPass');

      // Headers
      const headers = ['Date', 'SupCode', 'InvoiceNo', 'PO', 'RollItem', 'Color', 'QtyReceive', 'QtyInspt', 'Pass', 'Remark'];
      ws.addRow(headers);
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).height = 20;

      // Fill Data
      filteredData.forEach((row) => {
        ws.addRow([
          row.Date || '',
          row.SupCode || '',
          row.InvoiceNo || '',
          row.OrderNumber || '',
          row.RollItem || '',
          row.Color || '',
          row.QtyReceive || 0,
          row.QtyInspt || 'Not Check',
          row.Pass || '',
          row.Remark || ''
        ]);
      });

      // Auto fit width
      for (let c = 1; c <= headers.length; c++) {
        ws.getColumn(c).width = 15;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const dateSuffix = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);
      saveAs(new Blob([buffer]), `ReportPass_${dateSuffix}.xlsx`);
    } catch (err: any) {
      showToast(t('qcfb.exportError', 'Lỗi xuất Excel: ') + err.message, 'error');
    }
  };

  return (
    <Box sx={{ px: 1, py: 0.5, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>

      <Paper elevation={0} sx={{ flexShrink: 0, borderRadius: 2, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
        <Box sx={{
          p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
          background: 'linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%)',
          borderBottom: '1px solid #e8e8e8',
        }}>
          {/* Date range element */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, backgroundColor: '#fff', borderRadius: 1.5, border: '1px solid #e0e0e0', px: 1.5, py: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#2e7d32', mr: 0.5, whiteSpace: 'nowrap' }}>📅 {t('qcfb.dateTitle', 'Date')}</Typography>
            <TextField size="small" type="date" value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              variant="standard" InputProps={{ disableUnderline: true }}
              sx={{ width: 125, '& input': { fontSize: '0.85rem' } }} />
            <Typography variant="body2" sx={{ color: '#999', mx: 0.5 }}>→</Typography>
            <TextField size="small" type="date" value={toDate}
              onChange={e => setToDate(e.target.value)}
              variant="standard" InputProps={{ disableUnderline: true }}
              sx={{ width: 125, '& input': { fontSize: '0.85rem' } }} />
          </Box>

          <Button variant="outlined" size="small" startIcon={<FilterListIcon />} onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            sx={{ borderRadius: 1.5, fontWeight: 600, px: 2, height: 32, fontSize: '0.8rem', borderColor: '#e0e0e0', color: '#475569', '&:hover': { borderColor: '#cbd5e1', backgroundColor: '#f8fafc' }, textTransform: 'none' }}>
            Lọc thêm
          </Button>

          <Button variant="contained" size="small" startIcon={!loading ? <SearchIcon sx={{ fontSize: '18px !important' }} /> : undefined} onClick={() => { setPage(0); fetchReport(); setShowAdvancedFilters(false); }}
            disabled={loading} disableElevation
            sx={{
              borderRadius: 1.5, fontWeight: 700, height: 32, fontSize: '0.8rem', px: 2.5, textTransform: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: 'none',
              '&:hover': { background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' }, marginLeft: 'auto',
            }}>
            {loading ? <CircularProgress size={24} color="inherit" /> : t('qcfb.loadReport', 'Search')}
          </Button>

          {showAdvancedFilters && (
            <Box sx={{ width: '100%', display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 1, p: 1.5, backgroundColor: '#fff', borderRadius: 1.5, border: '1px dashed #cbd5e1' }}>
              <TextField size="small" placeholder={t('qcfb.invoiceNo', 'Invoice No')} value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchReport()}
                InputProps={{ startAdornment: <Typography sx={{ color: '#94a3b8', mr: 1, fontSize: '0.85rem', fontWeight: 600 }}>INV</Typography> }}
                sx={{ flex: '1 1 150px', '& .MuiOutlinedInput-root': { backgroundColor: '#f8fafc', borderRadius: 2 } }}
              />
              <TextField size="small" placeholder={t('qcfb.poNumber', 'PO Number')} value={poNo} onChange={e => setPoNo(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchReport()}
                InputProps={{ startAdornment: <Typography sx={{ color: '#94a3b8', mr: 1, fontSize: '0.85rem', fontWeight: 600 }}>PO#</Typography> }}
                sx={{ flex: '1 1 150px', '& .MuiOutlinedInput-root': { backgroundColor: '#f8fafc', borderRadius: 2 } }}
              />
              <TextField size="small" placeholder={t('qcfb.itemNo', 'Item No')} value={itemNo} onChange={e => setItemNo(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchReport()}
                InputProps={{ startAdornment: <Typography sx={{ color: '#94a3b8', mr: 1, fontSize: '0.85rem', fontWeight: 600 }}>ITM</Typography> }}
                sx={{ flex: '1 1 150px', '& .MuiOutlinedInput-root': { backgroundColor: '#f8fafc', borderRadius: 2 } }}
              />
            </Box>
          )}
        </Box>
      </Paper>

      <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: 3, borderRadius: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flexShrink: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{t('qcfb.reportTitlePF', 'Kết quả')} ({filteredData.length}{filteredData.length !== data.length ? ` / ${data.length}` : ''})</Typography>
          <Button
            variant="contained"
            color="success"
            startIcon={<FileDownloadIcon />}
            onClick={exportExcel}
            disabled={!data.length}
          >
            {t('qcfb.exportExcel', 'Export Excel')}
          </Button>
        </Box>
        <TableContainer sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}>
          <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { fontSize: { xs: '0.7rem', lg: '11px' }, py: { xs: 0.2, lg: 0.5 }, px: { xs: 0.6, lg: 0.8 } } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>#</TableCell>
                {[
                  { key: 'Date', label: 'Date' },
                  { key: 'SupCode', label: 'SupCode' },
                  { key: 'InvoiceNo', label: 'InvoiceNo' },
                  { key: 'OrderNumber', label: 'PO#' },
                  { key: 'RollItem', label: 'Item' },
                  { key: 'Color', label: 'Color' },
                  { key: 'QtyReceive', label: 'QtyReceive' },
                  { key: 'QtyInspt', label: 'QtyInspt' },
                  { key: 'Pass', label: 'Pass' },
                  { key: 'Remark', label: 'Remark' }
                ].map(col => (
                  <TableCell key={col.key} sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', whiteSpace: 'nowrap' }}>
                    <ColumnFilter colKey={col.key} label={col.label} value={colFilters[col.key] || ''} onChange={updateColFilter} />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading || !mounted ? (
                Array.from(new Array(10)).map((_, idx) => (
                  <TableRow key={`skeleton-${idx}`}>
                    <TableCell><Skeleton animation="wave" height={24} width={20} /></TableCell>
                    <TableCell><Skeleton animation="wave" height={24} width={80} /></TableCell>
                    <TableCell><Skeleton animation="wave" height={24} width={60} /></TableCell>
                    <TableCell><Skeleton animation="wave" height={24} width={100} /></TableCell>
                    <TableCell><Skeleton animation="wave" height={24} width={80} /></TableCell>
                    <TableCell><Skeleton animation="wave" height={24} width={100} /></TableCell>
                    <TableCell><Skeleton animation="wave" height={24} width={60} /></TableCell>
                    <TableCell><Skeleton animation="wave" height={24} width={50} /></TableCell>
                    <TableCell><Skeleton animation="wave" height={24} width={50} /></TableCell>
                    <TableCell><Skeleton animation="wave" height={24} width={60} /></TableCell>
                    <TableCell><Skeleton animation="wave" height={24} width={120} /></TableCell>
                  </TableRow>
                ))
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 5 }}>
                    <Typography variant="body1" color="textSecondary">{t('qcfb.noDataFound', 'Không tìm thấy dữ liệu báo cáo!')}</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, idx) => (
                  <MemoReportRow key={idx} row={row} index={page * rowsPerPage + idx + 1} />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', bgcolor: '#fff', p: 1.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>{t('qcfb.rowsPerPage', 'Dòng / trang:')}</Typography>
            <Select
              size="small"
              value={rowsPerPage}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRowsPerPage(val);
                setPage(0);
              }}
              sx={{ height: 32, fontSize: '0.875rem' }}
            >
              {[25, 50, 100, 200, 500].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
            <Typography variant="body2" sx={{ color: '#64748b', ml: 1 }}>
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
            siblingCount={1}
            boundaryCount={1}
            size="medium"
            sx={{
              '& .MuiPagination-ul': { flexWrap: 'nowrap' },
              '& .MuiPaginationItem-root.Mui-selected': { bgcolor: '#2e7d32', color: '#fff', '&:hover': { bgcolor: '#1b5e20' } }
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default ReportPassFailPage;

