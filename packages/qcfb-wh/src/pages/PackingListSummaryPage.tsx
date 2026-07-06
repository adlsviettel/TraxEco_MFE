import { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, TextField, CircularProgress, Alert, Badge,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination, Select, MenuItem,
  Snackbar, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Chip, Card, CardContent, LinearProgress
} from '@mui/material';
import {
  ViewList as ListIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  TableChart as ExcelIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ColorLens as ColorLensIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { generateQCSummaryExcel } from '../utils/qcReportExcelGenerator';
import { generateApprovedColorLotExcel } from '../utils/qcApprovedColorLotExcel';
import { generateInspectionReportExcel } from '../utils/qcInspectionReportExcel';

const CACHE_KEY = 'QCFB_PackingListSummary_Cache';
const getCache = () => {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    return null;
  }
};
const pageCache = getCache();

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export default function PackingListSummaryPage() {
  const { t } = useTranslation();

  // Filters
  const [invoiceNo, setInvoiceNo] = useState(pageCache?.invoiceNo || '');
  const [poNo, setPoNo] = useState(pageCache?.poNo || '');
  const [itemNo, setItemNo] = useState(pageCache?.itemNo || '');
  const [color, setColor] = useState(pageCache?.color || '');

  // Data
  const [data, setData] = useState<any[]>(pageCache?.data || []);
  const [columns, setColumns] = useState<string[]>(pageCache?.columns || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pagination & Column Filters
  const [page, setPage] = useState(pageCache?.page || 0);
  const [rowsPerPage, setRowsPerPage] = useState(pageCache?.rowsPerPage || 50);
  const [colFilters, setColFilters] = useState<Record<string, string>>(pageCache?.colFilters || {});

  // Toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  // Cache Logic
  useEffect(() => {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      invoiceNo, poNo, itemNo, color, data, columns, page, rowsPerPage, colFilters
    }));
  }, [invoiceNo, poNo, itemNo, color, data, columns, page, rowsPerPage, colFilters]);

  const activeFilterCount = [invoiceNo, poNo, itemNo, color].filter(v => v.trim()).length;

  const translateCol = (c: string) => {
    return c;
  };

  const filteredData = useMemo(() => {
    return data.filter(row => {
      return columns.every(col => {
        const filterVal = colFilters[col];
        if (!filterVal || filterVal.trim() === '') return true;
        return String(row[col] || '').toLowerCase().includes(filterVal.toLowerCase().trim());
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
      if (invoiceNo.trim()) params.append('invoiceNo', invoiceNo.trim());
      if (poNo.trim()) params.append('poNo', poNo.trim());
      if (itemNo.trim()) params.append('itemNo', itemNo.trim());
      if (color.trim()) params.append('color', color.trim());

      const res = await fetch(`${API_BASE}/qcfb/packing-list-summary?${params.toString()}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const result: any[] = await res.json();
      
      setData(result);
      setPage(0);
      setColFilters({});
      
      if (result && result.length > 0) {
        setColumns(Object.keys(result[0]));
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
    if (filteredData.length === 0) {
      showToast(t('qcfb.packing.exportEmpty', 'Không có dữ liệu để xuất Excel!'), 'warning');
      return;
    }
    
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      
      // Bác chỉ cần chuẩn bị file Template thật nằm trong thư mục Public
      // Hệ thống sẽ tự nạp trọn vẹn Format, Hình ảnh, Tiêu đề của Bác vào!
      const response = await fetch('/templates/QCReportTemplate_Real.xlsx');
      if (!response.ok) {
        showToast(t('qcfb.packing.noTemplate', 'Chưa tìm thấy file Template'), 'warning');
        return;
      }
      const arrayBuffer = await response.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      
      // Đọc Sheet số 1 của Bác
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        showToast(t('qcfb.packing.errTemplate', 'Template không hợp lệ (không có sheet nào)!'), 'error');
        return;
      }
      
      // HEADER DATA
      worksheet.getCell('A3').value = 'P/O (đơn hàng ): ' + (poNo || '');
      // Assuming item no belongs to STYLE or ITEM based on fields
      worksheet.getCell('I3').value = 'ITEM: ' + (itemNo || '');
      worksheet.getCell('N3').value = 'COLOR (màu): ' + (color || '');

      // --- ĐỔ DỮ LIỆU CÁC CUỘN ---
      // Template có sẵn 15 cột cuộn (từ cột H = 8 đến AK = 37, mỗi cuộn 2 cột)
      filteredData.forEach((row, rIdx) => {
        if (rIdx >= 15) return; // Chỉ hỗ trợ 15 cuộn trên template này hiện tại
        
        const cIdx = 8 + (rIdx * 2); // Cột tương ứng 8, 10, 12... (H, J, L, N, P...)
        const colLetter = worksheet.getColumn(cIdx).letter;
        
        // Gán vào các dòng Roll Detail
        worksheet.getCell(`${colLetter}36`).value = row.RollItem || '';         // Roll NO Of Inspection
        worksheet.getCell(`${colLetter}48`).value = row.TotalQtyYrds || '';     // Ticketed Yards
        worksheet.getCell(`${colLetter}50`).value = row.InspectedQtyYrds || ''; // Actual Yards
        // Có thể bổ sung field data khác tùy logic API
      });

      // --- CẤU HÌNH IN ẤN (AUTO SCALE TO 1 PAGE) ---
      worksheet.pageSetup = {
        ...(worksheet.pageSetup || {}),
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: {
          left: 0.25,
          right: 0.25,
          top: 0.25,
          bottom: 0.25,
          header: 0,
          footer: 0
        }
      };

      // --- XUẤT FILE NATIVE HOÀN HẢO ---
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `PackingList_QCReport_${poNo || 'Export'}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      showToast(t('qcfb.packing.exportSuccess', 'Xuất Excel thành công bằng Template gốc!'), 'success');
    } catch (err: any) {
      console.error(err);
      showToast(t('qcfb.packing.exportError', 'Lỗi khi xuất File: ') + err.message, 'error');
    }
  };

  const handleViewDetail = async (row: any) => {
    setLoading(true);
    setSelectedRow(row);
    
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE}/qcfb/packing-list-detail?invoiceNo=${encodeURIComponent(row.InvoiceNo || '')}&supCode=${encodeURIComponent(row.SupCode || '')}&orderNumber=${encodeURIComponent(row.OrderNumber || '')}&color=${encodeURIComponent(row.Color || '')}&rollItem=${encodeURIComponent(row.RollItem || '')}`;
      
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`${t('history.error', 'HTTP Error')} ${res.status}`);
      
      const data = await res.json();

      // Sắp xếp các cuộn theo thứ tự RollNo (nhận dạng luôn cả số và chữ cái tự nhiên)
      if (data.rolls && Array.isArray(data.rolls)) {
        data.rolls.sort((a: any, b: any) => {
          const valA = String(a.RollNo || a.QrCode || '');
          const valB = String(b.RollNo || b.QrCode || '');
          return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
        });
      }

      setDetailData(data);
      setDetailModalOpen(true);
      
    } catch (err: any) {
      console.error(err);
      showToast(t('qcfb.packing.errDetail', 'Lỗi tải Chi tiết: ') + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportDetailedExcel = async () => {
    if (!detailData || !selectedRow) return;
    showToast(t('qcfb.packing.exporting', 'Đang xuất Excel cho Hóa đơn ') + selectedRow.InvoiceNo + '...', 'info');
    
    try {
      await generateQCSummaryExcel(detailData, selectedRow, t);
      showToast(t('qcfb.packing.exportSuccess', 'Xuất file thành công!'), 'success');
    } catch (err: any) {
      console.error(err);
      showToast(t('qcfb.packing.exportError', 'Lỗi khi xuất Export: ') + err.message, 'error');
    }
  };

  const exportApprovedColorLot = async () => {
    if (!detailData || !selectedRow) return;
    showToast(t('qcfb.packing.exportingApproved', 'Đang xuất Approved Color/Batch...'), 'info');
    try {
      await generateApprovedColorLotExcel(detailData, selectedRow, t);
      showToast(t('qcfb.packing.exportSuccess', 'Xuất file thành công!'), 'success');
    } catch (err: any) {
      console.error(err);
      showToast(t('qcfb.packing.exportError', 'Lỗi khi xuất Export: ') + err.message, 'error');
    }
  };

  const exportInspectionReport = async () => {
    if (!detailData || !selectedRow) return;
    showToast(t('qcfb.packing.exportingInspection', 'Đang xuất Inspection Report...'), 'info');
    try {
      await generateInspectionReportExcel(detailData, selectedRow, t);
      showToast(t('qcfb.packing.exportSuccess', 'Xuất file thành công!'), 'success');
    } catch (err: any) {
      console.error(err);
      showToast(t('qcfb.packing.exportError', 'Lỗi khi xuất Export: ') + err.message, 'error');
    }
  };

  const showToast = (msg: string, severity: any = 'success') => {
    setToastMsg(msg); setToastSeverity(severity); setToastOpen(true);
  };

  return (
    <Box sx={{ px: 1, py: 0.5, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Header */}
      <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" startIcon={<RefreshIcon sx={{ fontSize: '18px !important' }} />} onClick={() => { setData([]); setColFilters({}); setPage(0); }}
            sx={{ borderRadius: 1.5, fontWeight: 600, fontSize: '0.8rem', height: 32, px: 2, textTransform: 'none', borderColor: '#cbd5e1', color: '#475569', '&:hover': { bgcolor: '#f1f5f9' } }}>
            {t('history.refresh', 'Reset')}
          </Button>
          <Button variant="contained" size="small" startIcon={<ExcelIcon sx={{ fontSize: '18px !important' }} />} disabled={filteredData.length === 0} onClick={handleExport} disableElevation
            sx={{ borderRadius: 1.5, fontWeight: 700, fontSize: '0.8rem', height: 32, px: 2, textTransform: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: 'none', '&:hover': { background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' } }}>
            {t('qcfb.packing.exportToExcel', 'Export Excel')}
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper elevation={0} sx={{ flexShrink: 0, p: 1.5, borderRadius: 2.5, border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #f8faf8 0%, #ffffff 100%)' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          
          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField size="small" placeholder={t('qcfb.packing.filterInvoice', 'Invoice No')} value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} 
              InputProps={{ startAdornment: <Typography sx={{color:'#94a3b8', mr:1, fontSize:'0.8rem', fontWeight:600}}>INV</Typography> }}
              sx={{ flex: '1 1 150px', '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem', bgcolor: '#fff' } }} 
            />
            <TextField size="small" placeholder={t('qcfb.packing.filterPo', 'PO Number')} value={poNo} onChange={e => setPoNo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} 
              InputProps={{ startAdornment: <Typography sx={{color:'#94a3b8', mr:1, fontSize:'0.8rem', fontWeight:600}}>PO#</Typography> }}
              sx={{ flex: '1 1 150px', '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem', bgcolor: '#fff' } }} 
            />
            <TextField size="small" placeholder={t('qcfb.packing.filterItem', 'Item No')} value={itemNo} onChange={e => setItemNo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} 
              InputProps={{ startAdornment: <Typography sx={{color:'#94a3b8', mr:1, fontSize:'0.8rem', fontWeight:600}}>ITM</Typography> }}
              sx={{ flex: '1 1 150px', '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem', bgcolor: '#fff' } }} 
            />
            <TextField size="small" placeholder={t('qcfb.packing.filterColor', 'Color')} value={color} onChange={e => setColor(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} 
              InputProps={{ startAdornment: <Typography sx={{color:'#94a3b8', mr:1, fontSize:'0.8rem', fontWeight:600}}>CLR</Typography> }}
              sx={{ flex: '1 1 150px', '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem', bgcolor: '#fff' } }} 
            />
          </Box>
          
          <Button disabled={loading} variant="contained" size="small" disableElevation onClick={handleSearch}
            startIcon={!loading ? <SearchIcon sx={{ fontSize: '18px !important' }} /> : undefined}
            sx={{ flexShrink: 0, borderRadius: 1.5, fontWeight: 700, height: 32, fontSize: '0.8rem', px: 2.5, textTransform: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: 'none', '&:hover': { background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' } }}>
            {loading ? <CircularProgress size={24} color="inherit" /> : <>{t('genesis.searchBtn', 'Search')} <Badge badgeContent={activeFilterCount} color="error" sx={{ ml: 1.5, '& .MuiBadge-badge': { right: -6 } }} /></>}
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ fontWeight: 600 }}>{error}</Alert>}

      {/* Data Table */}
      <Paper elevation={0} sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 2, border: '1px solid #e0e0e0', position: 'relative' }}>
        {loading && <LinearProgress color="success" sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999 }} />}
        {!mounted ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, p: 4 }}>
            <CircularProgress color="success" />
          </Box>
        ) : data.length > 0 ? (
          <>
            <TableContainer sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}>
              <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { fontSize: { xs: '0.7rem', lg: '11px' }, py: { xs: 0.2, lg: 0.5 }, px: { xs: 0.6, lg: 0.8 } } }}>
                <TableHead>
                  <TableRow>
                    {columns.map(col => (
                      <TableCell key={col} sx={{ fontWeight: 700, backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd', whiteSpace: 'nowrap' }}>
                        {translateCol(col)}
                      </TableCell>
                    ))}
                    <TableCell align="center" sx={{ fontWeight: 700, backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd', whiteSpace: 'nowrap' }}>
                      {t('qcfb.packing.action', 'Hành động')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.map((row, idx) => (
                    <TableRow key={idx} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                      {columns.map(col => (
                        <TableCell key={col} sx={{ whiteSpace: 'nowrap' }}>
                          {row[col]}
                        </TableCell>
                      ))}
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap', borderLeft: '1px solid #eee' }}>
                        <IconButton color="success" onClick={() => handleViewDetail(row)} size="small" title={t('qcfb.packing.viewDetail', 'Hiển thị QC Detail')}>
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
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
            <ListIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
            <Typography color="text.secondary">
              {t('qcfb.packing.searchGuide', 'Nhấn Search để xem bảng tổng hợp Packing List')}
            </Typography>
          </Box>
        )}
      </Paper>

      <Snackbar open={toastOpen} autoHideDuration={3000} onClose={() => setToastOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToastOpen(false)} severity={toastSeverity} sx={{ width: '100%', fontWeight: 600 }}>{toastMsg}</Alert>
      </Snackbar>

      {/* Detail Info Modal */}
      <Dialog open={detailModalOpen} onClose={() => setDetailModalOpen(false)} maxWidth="xl" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <DialogTitle sx={{ backgroundColor: '#1b5e20', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <VisibilityIcon /> {t('qcfb.packing.modalTitle', 'Fabric Quality Control Detail')}
          </Typography>
          <IconButton onClick={() => setDetailModalOpen(false)} sx={{ color: '#fff' }} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ backgroundColor: '#f4f6f8', p: 3 }}>
          {detailData && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              
              {/* Top Cards: Order Info & Quality KPI */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' }, gap: 3 }}>
                <Card elevation={1} sx={{ height: '100%', borderRadius: 2 }}>
                  <Box sx={{ p: 2, borderBottom: '1px solid #eee', backgroundColor: '#fafafa' }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#2e7d32' }}>🧾 {t('qcfb.packing.orderInfo', 'Order Information')}</Typography>
                  </Box>
                  <CardContent sx={{ '& p': { mb: 1.5, display: 'flex', justifyContent: 'space-between' }, pb: '16px !important' }}>
                    <Typography><Typography component="span" color="text.secondary">{t('qcfb.packing.inv', 'Invoice:')}</Typography> <strong>{selectedRow?.InvoiceNo}</strong></Typography>
                    <Typography><Typography component="span" color="text.secondary">{t('qcfb.packing.po', 'PO Number:')}</Typography> <strong>{selectedRow?.OrderNumber}</strong></Typography>
                    <Typography><Typography component="span" color="text.secondary">{t('qcfb.packing.sup', 'Supplier:')}</Typography> <strong>{selectedRow?.SupCode}</strong></Typography>
                    <Typography><Typography component="span" color="text.secondary">{t('qcfb.packing.itm', 'Item:')}</Typography> <strong>{selectedRow?.RollItem}</strong></Typography>
                    <Typography><Typography component="span" color="text.secondary">{t('qcfb.packing.clr', 'Color:')}</Typography> <strong>{selectedRow?.Color}</strong></Typography>
                    <Typography><Typography component="span" color="text.secondary">{t('qcfb.packing.recDate', 'Recording Date:')}</Typography> <strong>{detailData.header?.[0]?.RecoredDate || 'N/A'}</strong></Typography>
                  </CardContent>
                </Card>

                <Card elevation={1} sx={{ height: '100%', borderRadius: 2 }}>
                  <Box sx={{ p: 2, borderBottom: '1px solid #eee', backgroundColor: '#fafafa' }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#ef6c00' }}>📊 {t('qcfb.packing.qSum', 'Inspection Quality Summary')}</Typography>
                  </Box>
                  <CardContent sx={{ pb: '16px !important' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 3 }}>
                      <Box>
                        <Paper elevation={0} sx={{ p: 2, backgroundColor: '#e8f5e9', borderRadius: 2, textAlign: 'center', border: '1px solid #c8e6c9' }}>
                          <Typography variant="h4" color="#1b5e20" fontWeight={800}>{detailData.summary?.[0]?.TotalRoll || 0}</Typography>
                          <Typography variant="body2" color="text.secondary" fontWeight={600}>{t('qcfb.packing.totRolls', 'Total Rolls')}</Typography>
                        </Paper>
                      </Box>
                      <Box>
                        <Paper elevation={0} sx={{ p: 2, backgroundColor: '#e8f5e9', borderRadius: 2, textAlign: 'center' }}>
                          <Typography variant="h4" color="#2e7d32" fontWeight={800}>{detailData.percentInspected?.[0]?.RollIns || 0}</Typography>
                          <Typography variant="body2" color="text.secondary" fontWeight={600}>{t('qcfb.packing.insRolls', 'Inspected Rolls')}</Typography>
                        </Paper>
                      </Box>
                      <Box sx={{ gridColumn: { xs: 'span 2', sm: 'auto' } }}>
                        <Paper elevation={0} sx={{ p: 2, backgroundColor: '#fff3e0', borderRadius: 2, textAlign: 'center' }}>
                          <Typography variant="h4" color="#ef6c00" fontWeight={800}>{detailData.percentInspected?.[0]?.PerIns || 0}%</Typography>
                          <Typography variant="body2" color="text.secondary" fontWeight={600}>{t('qcfb.packing.insTarget', 'Inspected Target')}</Typography>
                        </Paper>
                      </Box>
                      
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', pt: 1 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">{t('qcfb.packing.totLen', 'Total Length (Yds)')}</Typography>
                            <Typography variant="subtitle1" fontWeight={700}>{detailData.summary?.[0]?.TotalL || 0}</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">{t('qcfb.packing.insLen', 'Inspected Length')}</Typography>
                            <Typography variant="subtitle1" fontWeight={700}>{detailData.percentInspected?.[0]?.LIns || 0}</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">{t('qcfb.packing.defFound', 'Defects Found')}</Typography>
                            <Typography variant="subtitle1" fontWeight={700} color={detailData.defects?.length > 0 ? "error" : "success.main"}>
                              {detailData.defects?.length || 0}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              {/* Rolls List Table */}
              <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <Card elevation={1} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ flexShrink: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa', borderBottom: '1px solid #eee' }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#2e7d32' }}>🧵 {t('qcfb.packing.rollsDet', 'Rolls Detail Information')}</Typography>
                    <Chip size="small" label={`${(detailData.rolls || []).length} ${t('qcfb.packing.rollsLoad', 'Rolls Loaded')}`} sx={{ backgroundColor: '#2e7d32', color: 'white' }} />
                  </Box>
                  <TableContainer sx={{ flexGrow: 1, maxHeight: 400 }}>
                    <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { fontSize: { xs: '0.7rem', lg: '11px' }, py: { xs: 0.2, lg: 0.5 }, px: { xs: 0.6, lg: 0.8 } } }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ backgroundColor: '#e8f5e9', fontWeight: 700 }}>{t('qcfb.packing.rollNo', 'Roll No')}</TableCell>
                          <TableCell sx={{ backgroundColor: '#e8f5e9', fontWeight: 700 }}>{t('qcfb.packing.batchNo', 'Batch No')}</TableCell>
                          <TableCell sx={{ backgroundColor: '#e8f5e9', fontWeight: 700 }}>{t('qcfb.packing.oWidth', 'Orignal Width')}</TableCell>
                          <TableCell sx={{ backgroundColor: '#e8f5e9', fontWeight: 700 }}>{t('qcfb.packing.aWidth', 'Actual Width')}</TableCell>
                          <TableCell sx={{ backgroundColor: '#e8f5e9', fontWeight: 700 }}>{t('qcfb.packing.sLength', 'Ship Length')}</TableCell>
                          <TableCell sx={{ backgroundColor: '#e8f5e9', fontWeight: 700 }}>{t('qcfb.packing.iLength', 'Inspt. Length')}</TableCell>
                          <TableCell sx={{ backgroundColor: '#e8f5e9', fontWeight: 700 }}>{t('qcfb.packing.rInspe', 'R/Inspection')}</TableCell>
                          <TableCell sx={{ backgroundColor: '#e8f5e9', fontWeight: 700 }}>{t('qcfb.packing.qcRes', 'QC Result')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(detailData.rolls || []).map((r: any, i: number) => (
                          <TableRow key={i} hover>
                            <TableCell sx={{ fontWeight: 600 }}>{r.RollNo || r.QrCode}</TableCell>
                            <TableCell>{r.BatchNo || '-'}</TableCell>
                            <TableCell>{r.Width || '-'}</TableCell>
                            <TableCell>{r.InsptWidthM || '-'}</TableCell>
                            <TableCell>{r.ShipLength || '-'}</TableCell>
                            <TableCell>{r.InsptLenght || '-'}</TableCell>
                            <TableCell>{r.InsptReltPer || '-'}</TableCell>
                            <TableCell>
                              {r.InsptReslt ? (() => {
                                const res = r.InsptReslt.toLowerCase().trim();
                                const isPass = res === 'pass' || res === 'p' || res === 'a' || res === 'ok';
                                const isFail = res === 'fail' || res === 'f' || res === 'reject';
                                return (
                                  <Chip 
                                    size="small" 
                                    icon={isPass ? <CheckCircleIcon /> : <WarningIcon />} 
                                    label={r.InsptReslt} 
                                    color={isPass ? 'success' : isFail ? 'error' : 'warning'} 
                                    variant="outlined"
                                    sx={{ fontWeight: 600, px: 0.5 }}
                                  />
                                );
                              })() : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        {(detailData.rolls || []).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              {t('qcfb.packing.noRolls', 'No roll details found mapping to this Invoice/PO')}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Box>

            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, backgroundColor: '#fafafa', borderTop: '1px solid #e0e0e0', gap: 1 }}>
          <Button onClick={() => setDetailModalOpen(false)} color="inherit" variant="text" sx={{ fontWeight: 600 }}>
            {t('genesis.btnCancel', 'Cancel')}
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button 
            onClick={exportApprovedColorLot} 
            color="warning" 
            variant="outlined" 
            size="large" 
            startIcon={<ColorLensIcon />} 
            sx={{ fontWeight: 600, px: 2, borderWidth: 2, '&:hover': { borderWidth: 2 } }}
          >
            {t('qcfb.packing.exportApproved', 'Approved Color/Batch')}
          </Button>
          <Button 
            onClick={exportInspectionReport} 
            color="info" 
            variant="outlined" 
            size="large" 
            startIcon={<AssessmentIcon />} 
            sx={{ fontWeight: 600, px: 2, borderWidth: 2, '&:hover': { borderWidth: 2 } }}
          >
            {t('qcfb.packing.exportInspection', 'Inspection Report')}
          </Button>
          <Button onClick={exportDetailedExcel} color="success" variant="contained" size="large" startIcon={<ExcelIcon />} sx={{ fontWeight: 700, px: 3, boxShadow: 2 }}>
            {t('qcfb.packing.exportBtn', 'Export QC Report')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Notification */}
      <Snackbar open={toastOpen} autoHideDuration={3000} onClose={() => setToastOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToastOpen(false)} severity={toastSeverity} sx={{ width: '100%', fontWeight: 600 }}>
          {toastMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

