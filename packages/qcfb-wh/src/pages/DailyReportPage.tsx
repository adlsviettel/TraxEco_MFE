import { useState, useRef, memo, useMemo, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, TextField, CircularProgress, Chip, Alert, Collapse, Badge,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination, Select, MenuItem,
  IconButton, Popover, InputAdornment, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Backdrop, Portal, LinearProgress
} from '@mui/material';
import {
  Assessment as ReportIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  TableChart as ExcelIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

const todayStr = () => new Date().toISOString().slice(0, 10);

// ─── Column Filter Popover (memoized) ───
const ColumnFilter = memo(({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const active = !!value;

  return (
    <>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</Typography>
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

let pageCache: any = null;

export default function DailyReportPage() {
  const { t } = useTranslation();
  const [fromDate, setFromDate] = useState(pageCache?.fromDate || todayStr());
  const [toDate, setToDate] = useState(pageCache?.toDate || todayStr());
  const [invoiceNo, setInvoiceNo] = useState(pageCache?.invoiceNo || '');
  const [poNo, setPoNo] = useState(pageCache?.poNo || '');
  const [itemNo, setItemNo] = useState(pageCache?.itemNo || '');
  const [color, setColor] = useState(pageCache?.color || '');
  const [batch, setBatch] = useState(pageCache?.batch || '');
  const [rollNo, setRollNo] = useState(pageCache?.rollNo || '');
  const [data, setData] = useState<any[]>(pageCache?.data || []);
  const [columns, setColumns] = useState<string[]>(pageCache?.columns || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(pageCache?.showFilters || false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Dialog state
  const [defectDialogOpen, setDefectDialogOpen] = useState(false);
  const [defects, setDefects] = useState<any[]>([]);
  const [selectedQr, setSelectedQr] = useState('');
  const [isLockScreen, setIsLockScreen] = useState(false);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);

  // Toast state
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  const showToast = (msg: string, severity: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setToastMsg(msg);
    setToastSeverity(severity);
    setToastOpen(true);
  };


  // Pagination & Column Filters (Frontend)
  const [page, setPage] = useState(pageCache?.page || 0);
  const [rowsPerPage, setRowsPerPage] = useState(pageCache?.rowsPerPage || 50);
  const [colFilters, setColFilters] = useState<Record<string, string>>(pageCache?.colFilters || {});

  const activeFilterCount = [invoiceNo, poNo, itemNo, color, batch, rollNo].filter(v => v.trim()).length;

  // Caching mechanism to preserve state when page unmounts
  pageCache = { fromDate, toDate, invoiceNo, poNo, itemNo, color, batch, rollNo, data, columns, showFilters, page, rowsPerPage, colFilters };

  const filteredData = useMemo(() => {
    return data.filter(row => {
      return columns.every(col => {
        const filterVal = colFilters[col];
        if (!filterVal) return true;
        const rowVal = String(row[col] ?? '').toLowerCase();
        return rowVal.includes(filterVal.toLowerCase());
      });
    });
  }, [data, columns, colFilters]);

  const paginatedData = useMemo(() => {
    return filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (invoiceNo.trim()) params.append('invoiceNo', invoiceNo.trim());
      if (poNo.trim()) params.append('poNo', poNo.trim());
      if (itemNo.trim()) params.append('itemNo', itemNo.trim());
      if (color.trim()) params.append('color', color.trim());
      if (batch.trim()) params.append('batch', batch.trim());
      if (rollNo.trim()) params.append('rollNo', rollNo.trim());

      const res = await fetch(`${API_BASE}/qcfb/daily-report?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load report');
      const result = await res.json();

      setData(result);
      setPage(0);
      setColFilters({});
      
      if (result && result.length > 0) {
        setColumns(Object.keys(result[0]).filter(c => c !== 'QrCode'));
        showToast(t('qcfb.loadSuccess', 'Tải thành công {{count}} dòng báo cáo', { count: result.length }), 'success');
      } else {
        setColumns([]);
        showToast(t('qcfb.noDataFound', 'Không tìm thấy dữ liệu!'), 'warning');
      }
    } catch (err: any) {
      setError(err.message || t('qcfb.errorFetch', 'Lỗi khi tải dữ liệu!'));
      showToast(err.message || t('qcfb.errorFetch', 'Lỗi khi tải dữ liệu!'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (filteredData.length === 0) return;

    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('DailyReport');

      // --- HEADER SECTION ---
      // 1. Company Name & Title
      sheet.mergeCells('A1:D1');
      sheet.getCell('A1').value = 'CONG TY TNHH ABC (COMPANY NAME)';
      sheet.getCell('A1').font = { name: 'Arial', size: 12, bold: true };

      sheet.mergeCells('A2:R2');
      const titleCell = sheet.getCell('A2');
      titleCell.value = 'QC DAILY REPORT (BÁO CÁO QC HÀNG NGÀY)';
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1976D2' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // 2. Report Metadata
      sheet.getCell('A4').value = 'Từ ngày (From Date):';
      sheet.getCell('A4').font = { bold: true };
      sheet.getCell('B4').value = fromDate;
      
      sheet.getCell('C4').value = 'Đến ngày (To Date):';
      sheet.getCell('C4').font = { bold: true };
      sheet.getCell('D4').value = toDate;

      sheet.getCell('A5').value = 'Ngày in (Print Date):';
      sheet.getCell('A5').font = { bold: true };
      sheet.getCell('B5').value = new Date().toLocaleString('vi-VN');

      // --- TABLE HEADERS ---
      const headerRowIndex = 7;
      const exportCols = columns.filter(c => c !== 'QrCode'); // Bỏ cột QrCode ẩn
      const headerRow = sheet.getRow(headerRowIndex);
      
      exportCols.forEach((col, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = col;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } }; // Custom Green
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });

      // --- TABLE DATA ---
      filteredData.forEach((rowData, rIdx) => {
        const row = sheet.getRow(headerRowIndex + 1 + rIdx);
        exportCols.forEach((col, cIdx) => {
          const cell = row.getCell(cIdx + 1);
          cell.value = rowData[col];
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
          };
          // Căn giữa một số cột đặc thù
          if (['Color', 'BatchNo', 'RollNo', 'ShipLength', 'InsptReslt'].includes(col)) {
            cell.alignment = { horizontal: 'center' };
          }
        });
      });

      // --- COLUMN AUTO-WIDTH ---
      exportCols.forEach((col, i) => {
        sheet.getColumn(i + 1).width = Math.max(12, col.length + 2);
      });
      // Mở rộng riêng cột thông tin
      sheet.getColumn(1).width = 18; // InvoiceNo
      sheet.getColumn(4).width = 25; // RollItem
      sheet.getColumn(18).width = 40; // Exception/Remark

      // Xóa lưới mờ mặc định của Excel cho đẹp
      sheet.views = [{ showGridLines: false }];

      // --- SAVE FILE ---
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `QC_DailyReport_${fromDate}_${toDate}.xlsx`);
      
      setToastMsg(t('qcfb.exportSuccess', 'Xuất mẫu Excel chuẩn thành công!'));
      setToastSeverity('success');
      setToastOpen(true);
    } catch (err: any) {
      console.error('Lỗi export Excel:', err);
      setToastMsg(t('qcfb.exportError', 'Lỗi xuất Excel: ') + err.message);
      setToastSeverity('error');
      setToastOpen(true);
    }
  };

  const handleOpenDefects = async (qrCode: string, rollNo: string) => {
    if (!qrCode || isLockScreen) return;
    setIsLockScreen(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/qcfb/defects?qrCode=${encodeURIComponent(qrCode)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        if (result && result.length > 0) {
          setSelectedQr(rollNo || qrCode);
          setDefects(result);
          setDefectDialogOpen(true);
        } else {
          setToastMsg(t('qcfb.emptyDefects', 'Cuộn {{roll}} không có defect nào!', { roll: rollNo || qrCode }));
          setToastSeverity('success');
          setToastOpen(true);
        }
      } else {
        throw new Error('API Error');
      }
    } catch {
      setToastMsg(t('qcfb.errorDefects', 'Lỗi tải danh sách defect cho cuộn {{roll}}!', { roll: rollNo || qrCode }));
      setToastSeverity('error');
      setToastOpen(true);
    } finally {
      setIsLockScreen(false);
    }
  };

  const handleOpenGallery = (picString: string) => {
    const images = picString.split(/[;,]+/).map(p => p.trim()).filter(Boolean).map(pic => {
      let picName = pic;
      if (!picName.toLowerCase().endsWith('.jpg')) {
        picName += '.jpg';
      }
      const imgBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL || 'http://192.168.1.248/FbwarehouseImg';
      return `${imgBaseUrl.replace(/\/$/, '')}/${picName}`;
    });
    setGalleryImages(images);
    setGalleryDialogOpen(true);
  };

  return (
    <Box sx={{ p: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {data.length > 0 && (
            <Chip size="small"
              label={t('qcfb.totalCount', 'Total: {{count}}', { count: filteredData.length })}
              sx={{ height: 26, fontSize: '0.8rem', fontWeight: 700, bgcolor: '#e3f2fd', color: '#1565c0' }}
            />
          )}
          <Button variant="contained" size="small" startIcon={<ExcelIcon sx={{ fontSize: '18px !important' }} />} onClick={handleExport}
            disabled={data.length === 0} disableElevation
            sx={{ borderRadius: 1.5, fontWeight: 700, height: 32, px: 2, backgroundColor: '#2e7d32', textTransform: 'none', '&:hover': { backgroundColor: '#1b5e20' } }}>
            {t('qcfb.exportExcel', 'Excel')}
          </Button>
        </Box>
      </Box>

      {/* Search Filters */}
      <Paper elevation={0} sx={{ flexShrink: 0, borderRadius: 2, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
        {/* Row 1 — Date range + Action buttons */}
        <Box sx={{
          p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
          background: 'linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%)',
          borderBottom: '1px solid #e8e8e8',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, backgroundColor: '#fff', borderRadius: 1.5, border: '1px solid #e0e0e0', px: 1.5, py: 0.25 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#2e7d32', mr: 0.5, whiteSpace: 'nowrap' }}>📅</Typography>
            <TextField size="small" type="date" value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              variant="standard" InputProps={{ disableUnderline: true }}
              sx={{ width: 130, '& input': { fontSize: '0.85rem', py: 0.5 } }} />
            <Typography variant="body2" sx={{ color: '#999', mx: 0.5 }}>→</Typography>
            <TextField size="small" type="date" value={toDate}
              onChange={e => setToDate(e.target.value)}
              variant="standard" InputProps={{ disableUnderline: true }}
              sx={{ width: 130, '& input': { fontSize: '0.85rem', py: 0.5 } }} />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
              <Badge badgeContent={activeFilterCount} color="success" sx={{ '& .MuiBadge-badge': { fontWeight: 700 } }}>
            <Button variant={showFilters ? 'contained' : 'outlined'} size="small"
              startIcon={<FilterIcon />}
              endIcon={<ExpandIcon sx={{ transition: 'transform 0.3s', transform: showFilters ? 'rotate(180deg)' : 'rotate(0)' }} />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{
                borderRadius: 1.5, fontWeight: 600, minWidth: 100,
                ...(showFilters ? {
                  backgroundColor: '#2e7d32', '&:hover': { backgroundColor: '#1b5e20' },
                } : {
                  borderColor: '#bdbdbd', color: '#616161', '&:hover': { borderColor: '#2e7d32', color: '#2e7d32', backgroundColor: '#e8f5e9' },
                }),
              }}>
              {t('qcfb.filtersBtn', 'Filters')}
            </Button>
          </Badge>
          <Button variant="contained" startIcon={!loading ? <SearchIcon sx={{ fontSize: '18px !important' }} /> : undefined} size="small"
            onClick={handleSearch}
            disabled={loading} disableElevation
            sx={{
              borderRadius: '12px', fontWeight: 700, height: 32, fontSize: '0.8rem', px: 2.5, textTransform: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: 'none',
              '&:hover': { background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' },
            }}>
            {loading ? <CircularProgress size={24} color="inherit" /> : t('qcfb.searchBtn', 'Search')}
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon sx={{ fontSize: '18px !important' }} />} size="small"
            onClick={() => { setFromDate(todayStr()); setToDate(todayStr()); setInvoiceNo(''); setPoNo(''); setItemNo(''); setColor(''); setBatch(''); setRollNo(''); setData([]); setColumns([]); setError(null); setPage(0); setColFilters({}); }}
            sx={{ borderRadius: '12px', fontWeight: 600, height: 32, fontSize: '0.8rem', px: 2, textTransform: 'none', borderColor: '#cbd5e1', color: '#475569', '&:hover': { bgcolor: '#f1f5f9' } }}>
            {t('qcfb.resetBtn', 'Reset')}
          </Button>
        </Box>

        <Collapse in={showFilters} timeout={300}>
          <Box sx={{
            p: 1.5,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: 1.5,
            background: '#fff',
            borderTop: '1px dashed #e0e0e0',
          }}>
            {[
              { label: 'Invoice No', value: invoiceNo, setter: setInvoiceNo, icon: 'INV' },
              { label: 'PO No', value: poNo, setter: setPoNo, icon: 'PO#' },
              { label: 'Item No', value: itemNo, setter: setItemNo, icon: 'ITM' },
              { label: 'Color', value: color, setter: setColor, icon: 'CLR' },
              { label: 'Batch', value: batch, setter: setBatch, icon: 'BCH' },
              { label: 'Roll No', value: rollNo, setter: setRollNo, icon: 'RLL' },
            ].map(f => (
              <TextField
                key={f.label}
                size="small"
                placeholder={f.label}
                value={f.value}
                onChange={e => f.setter(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: <Typography sx={{color:'#94a3b8', mr:1, fontSize:'0.85rem', fontWeight:600}}>{f.icon}</Typography>,
                }}
                sx={{
                  flex: '1 1 150px',
                  '& .MuiOutlinedInput-root': { 
                    backgroundColor: '#fff', borderRadius: 2, transition: 'all 0.2s', 
                    '& fieldset': { borderColor: '#e2e8f0' }, 
                    '&:hover fieldset': { borderColor: '#cbd5e1' }, 
                    '&.Mui-focused fieldset': { borderColor: '#2e7d32', borderWidth: '1px', boxShadow: '0 0 0 3px rgba(46,125,50,0.1)' } 
                  }, 
                  '& input': { fontSize: '0.875rem', fontWeight: 500, color: '#334155' }
                }}
              />
            ))}
          </Box>
        </Collapse>
      </Paper>

      {/* Error */}
      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

      {/* Data Table */}
      <Paper elevation={0} sx={{ width: '100%', overflow: 'hidden', borderRadius: 2, border: '1px solid #e0e0e0', flexGrow: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {loading && <LinearProgress color="success" sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999 }} />}
        {!mounted ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : data.length > 0 ? (
          <>
            <TableContainer sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}>
              <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { fontSize: { xs: '0.7rem', lg: '11px' }, py: { xs: 0.2, lg: 0.5 }, px: { xs: 0.6, lg: 0.8 } } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, backgroundColor: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>#</TableCell>
                    {columns.map(col => (
                      <TableCell key={col} sx={{ backgroundColor: '#f5f5f5', whiteSpace: 'nowrap', p: 1, borderBottom: '2px solid #e0e0e0' }}>
                        <ColumnFilter
                          label={col}
                          value={colFilters[col] || ''}
                          onChange={(val) => {
                            setColFilters(prev => ({ ...prev, [col]: val }));
                            setPage(0);
                          }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.map((row, i) => (
                    <TableRow key={i} hover sx={{ '&:hover': { backgroundColor: '#e8f5e9 !important' } }}>
                      <TableCell>{page * rowsPerPage + i + 1}</TableCell>
                      {columns.map(col => (
                        <TableCell key={col} sx={{ whiteSpace: 'nowrap' }}>
                          {col === 'InsptReslt' && (row[col] === 'F' || row[col] === 'P') ? (
                            <Chip
                              label={row[col] === 'F' ? 'Fail' : 'Pass'}
                              color={row[col] === 'F' ? 'error' : 'success'}
                              size="small"
                              sx={{ fontWeight: 700, borderRadius: 1, minWidth: 60 }}
                            />
                          ) : col === 'RollNo' && row[col] ? (
                            <Typography 
                              variant="body2" 
                              onClick={() => handleOpenDefects(row.QrCode, String(row[col]))}
                              sx={{ 
                                color: '#1976d2', 
                                cursor: 'pointer', 
                                fontWeight: 600,
                                textDecoration: 'underline',
                                textUnderlineOffset: 3,
                                textDecorationColor: 'rgba(25, 118, 210, 0.4)',
                                '&:hover': { 
                                  color: '#115293', 
                                  textDecorationColor: '#115293' 
                                }
                              }}
                            >
                              {String(row[col])}
                            </Typography>
                          ) : col === 'Exception' && row[col] ? (
                            <Tooltip title={String(row[col])} placement="top" arrow>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 180, cursor: 'help' }}>
                                {String(row[col])}
                              </Typography>
                            </Tooltip>
                          ) : (
                            row[col] != null ? String(row[col]) : ''
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
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
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <ReportIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
            <Typography color="text.secondary" dangerouslySetInnerHTML={{ __html: t('qcfb.pressSearch', 'Nhấn <strong>Search</strong> để xem Daily Report') }} />
          </Box>
        )}
      </Paper>

      {/* Defect Dialog */}
      <Dialog open={defectDialogOpen} onClose={() => setDefectDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReportIcon color="primary" /> {t('qcfb.defectList', 'Defect List')}
          <Chip label={selectedQr} size="small" sx={{ ml: 1, fontFamily: 'monospace' }} />
        </DialogTitle>
        <DialogContent dividers sx={{ minHeight: 150, p: 0 }}>
          <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: { xs: 0.5, lg: 1 }, px: { xs: 1, lg: 2 }, fontSize: { xs: '0.75rem', lg: '0.85rem' } } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5' }}>#</TableCell>
                {['DefectCode', 'DefectName', 'QtyDefect', 'DefectPoint', 'PicLink'].map(k => (
                  <TableCell key={k} sx={{ fontWeight: 700, bgcolor: '#f5f5f5', whiteSpace: 'nowrap' }}>{k}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {defects.map((dc, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>{idx + 1}</TableCell>
                  {['DefectCode', 'DefectName', 'QtyDefect', 'DefectPoint', 'PicLink'].map(k => (
                    <TableCell key={k} sx={{ whiteSpace: k === 'PicLink' ? 'normal' : 'nowrap' }}>
                      {k === 'PicLink' && dc[k] ? (
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenGallery(String(dc[k]))}
                          sx={{ color: '#1976d2', bgcolor: '#e3f2fd', '&:hover': { bgcolor: '#bbdefb' } }}
                        >
                          <Badge badgeContent={String(dc[k]).split(/[;,]+/).filter(Boolean).length} color="error" sx={{ '& .MuiBadge-badge': { right: -3, top: 3, padding: '0 4px', minWidth: 16, height: 16 } }}>
                            <VisibilityIcon fontSize="small" />
                          </Badge>
                        </IconButton>
                      ) : (
                        String(dc[k] != null ? dc[k] : '')
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDefectDialogOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>{t('qcfb.close', 'Close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Thumbnails Gallery Dialog */}
      <Dialog open={galleryDialogOpen} onClose={() => setGalleryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReportIcon color="primary" /> {t('qcfb.imageGallery', 'Danh sách hình ảnh')}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
          {galleryImages.map((imgUrl, i) => (
            <Box 
              key={i}
              onClick={() => setSelectedImg(imgUrl)}
              sx={{ 
                width: 100, height: 100, cursor: 'pointer',
                border: '2px solid #e0e0e0', borderRadius: 2, 
                backgroundImage: `url('${imgUrl}')`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                transition: '0.2s', '&:hover': { opacity: 0.8, borderColor: '#1976d2', transform: 'scale(1.05)' }
              }}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGalleryDialogOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>{t('qcfb.closeBtn', 'Đóng')}</Button>
        </DialogActions>
      </Dialog>

      {/* Full Screen Image Viewer */}
      <Dialog open={!!selectedImg} onClose={() => setSelectedImg(null)} maxWidth="lg">
        <Box sx={{ position: 'relative', bgcolor: '#000', borderRadius: 1, overflow: 'hidden' }}>
          <IconButton 
            onClick={() => setSelectedImg(null)} 
            sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', bgcolor: 'rgba(0,0,0,0.4)', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}
          >
            <CloseIcon />
          </IconButton>
          {selectedImg && (
            <img 
              src={selectedImg} 
              alt="Defect fullscreen" 
              style={{ maxWidth: '100%', maxHeight: '85vh', display: 'block', objectFit: 'contain' }} 
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x600?text=Image+Not+Found'; }}
            />
          )}
        </Box>
      </Dialog>

      {/* Toast Notification */}
      <Snackbar open={toastOpen} autoHideDuration={3000} onClose={() => setToastOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToastOpen(false)} severity={toastSeverity} sx={{ width: '100%', fontWeight: 600 }}>
          {toastMsg}
        </Alert>
      </Snackbar>

      {/* Full screen loader */}
      <Portal>
        <Backdrop open={isLockScreen} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 2000 }}>
          <CircularProgress color="inherit" />
        </Backdrop>
      </Portal>
    </Box>
  );
}

