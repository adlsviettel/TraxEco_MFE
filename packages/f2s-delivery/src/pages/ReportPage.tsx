import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button,
  CircularProgress, Alert, Card, RadioGroup, FormControlLabel, Radio,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Popover, IconButton, InputAdornment, Pagination, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Collapse
} from '@mui/material';
import {
  Download as DownloadIcon,
  Search as SearchIcon,
  Assessment as AssessmentIcon,
  FilterList as FilterListIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { authService, ConfirmDialog, defaultConfirmDialog } from '@traxeco/shared';
import type { ConfirmDialogState } from '@traxeco/shared';

const DELIVERY_METHODS = [
  { value: 'MANUAL', label: 'Thủ công' },
  { value: 'AUTO', label: 'Máy tự động' },
];

export default function ReportPage() {
  const [deliveryMethod, setDeliveryMethod] = useState(DELIVERY_METHODS[0].value);
  const [reportLevel, setReportLevel] = useState('DETAIL');
  const [showFilters, setShowFilters] = useState(true);

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  const [fromTime, setFromTime] = useState<string>('');
  const [toTime, setToTime] = useState<string>('');
  const [searchPO, setSearchPO] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const saved = localStorage.getItem('f2s_report_rows_per_page');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [filterAnchorEl, setFilterAnchorEl] = useState<{ element: HTMLElement; column: string } | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);

  const canEdit = authService.hasAction('report', 'canEdit');
  const canDelete = authService.hasAction('report', 'canDelete');
  const hasActions = canEdit || canDelete;

  // Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(defaultConfirmDialog);
  const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'danger' | 'safe' | 'info' = 'danger') => {
    setConfirmDialog({ open: true, title, message, onConfirm, variant });
  };
  const closeConfirm = () => setConfirmDialog(p => ({ ...p, open: false }));
  
  // Admin trở lên (Level 1, 2) thì được sửa TẤT CẢ các cột
  const canEditAll = authService.getRoleLevel() <= 2;

  const [editableColsForUser, setEditableColsForUser] = useState<string[]>(['packedqty', 'comment', 'ext1']);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api'}/f2s/settings/editable-columns`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(r => r.json())
    .then(data => {
      if (data.columns) {
        setEditableColsForUser((data.columns || '').split(',').map((s: string) => s.trim().toLowerCase()));
      }
    })
    .catch(err => console.error('Failed to load settings:', err));
  }, []);

  const handleConfigChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setData([]);
    setColumnFilters({});
    setPage(0);
    setError(null);
    setSuccess(null);
  };

  const handleOpenFilter = (event: React.MouseEvent<HTMLElement>, column: string) => {
    setFilterAnchorEl({ element: event.currentTarget, column });
  };

  const handleCloseFilter = () => {
    setFilterAnchorEl(null);
  };

  const handleDeleteClick = async (row: any) => {
    const id = deliveryMethod === 'AUTO' ? row.Id : row.RecNo;
    showConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa bản ghi này?', async () => {
      try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api'}/f2s/reports/delete/${deliveryMethod.toLowerCase()}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setSuccess('Xóa dữ liệu thành công!');
        handleSearch(); // Reload table
      } else {
        const errorData = await response.json().catch(()=>({}));
        setError(errorData.message || 'Lỗi khi xóa dòng');
      }
    } catch(err: any) {
      setError(err.message || 'Lỗi hệ thống');
    }
    });
  };

  const handleEditClick = (row: any) => {
    setEditingRow({...row});
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingRow) return;
    const id = deliveryMethod === 'AUTO' ? editingRow.Id : editingRow.RecNo;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api'}/f2s/reports/update/${deliveryMethod.toLowerCase()}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingRow)
      });
      if (response.ok) {
        setSuccess('Cập nhật dữ liệu thành công!');
        setEditDialogOpen(false);
        handleSearch();
      } else {
        const errorData = await response.json().catch(()=>({}));
        setError(errorData.message || 'Lỗi cập nhật dòng');
      }
    } catch(err: any) {
      setError(err.message || 'Lỗi hệ thống');
    }
  };

  const handleFilterChange = (colKey: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [colKey]: value }));
    setPage(0);
  };

  const filteredData = Array.isArray(data) ? data.filter(row => {
    return Object.entries(columnFilters).every(([key, filterValue]) => {
      if (!filterValue) return true;
      const rowValue = row[key];
      if (rowValue === null || rowValue === undefined) return false;
      return String(rowValue).toLowerCase().includes(filterValue.toLowerCase());
    });
  }) : [];

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setData([]);
    setColumnFilters({});
    setPage(0);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

      const startDateTime = `${fromDate}T${fromTime || '00:00'}`;
      const endDateTime = `${toDate}T${toTime || '23:59'}`;
      const poParam = searchPO ? `&po=${encodeURIComponent(searchPO)}` : '';

      const response = await fetch(`${apiUrl}/f2s/reports/search?type=${deliveryMethod}&level=${reportLevel}${poParam}&from=${startDateTime}&to=${endDateTime}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Lỗi server khi tìm kiếm');
      }

      const jsonData = await response.json();
      
      // Prevent crash when API returns a non-array response (e.g., error object, page wrapper)
      const dataArray = Array.isArray(jsonData) ? jsonData 
                        : (jsonData && Array.isArray(jsonData.data) ? jsonData.data : []);
                        
      setData(dataArray);
      
      if (dataArray.length === 0) {
        // Only set error if we couldn't parse the array or it's empty
        setError(jsonData.message || 'Không tìm thấy dữ liệu trong khoảng thời gian này.');
      }
    } catch (err: any) {
      setError('Lỗi khi tải dữ liệu tìm kiếm. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

      const startDateTime = `${fromDate}T${fromTime || '00:00'}`;
      const endDateTime = `${toDate}T${toTime || '23:59'}`;
      const poParam = searchPO ? `&po=${encodeURIComponent(searchPO)}` : '';

      const response = await fetch(`${apiUrl}/f2s/reports/export?type=${deliveryMethod}&level=${reportLevel}${poParam}&from=${startDateTime}&to=${endDateTime}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Server error');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `F2S_${deliveryMethod}_${reportLevel}_${fromDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setSuccess(`Đã tải thành công báo cáo [${deliveryMethod === 'MANUAL' ? 'Thủ công' : 'Máy tự động'}] từ ${fromDate} đến ${toDate}.`);
    } catch (err: any) {
      setError('Lỗi khi tải báo cáo. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>


      {/* Main Content */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          mb: 3,
          border: '1px solid #f1f5f9',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ p: 2.5, backgroundColor: '#fcfdfd' }}>
          <Box 
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: showFilters ? 2.5 : 0, cursor: 'pointer' }}
            onClick={() => setShowFilters(!showFilters)}
          >
             <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
               BỘ LỌC TÌM KIẾM DỮ LIỆU
             </Typography>
             <IconButton size="small" sx={{ color: '#64748b' }}>
               {showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
             </IconButton>
          </Box>
          <Collapse in={showFilters}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5 }}>

            {/* CỘT 1: CẤU HÌNH BÁO CÁO */}
            <Box sx={{ width: { xs: '100%', md: '33.333%' }, px: 1.5, pb: { xs: 3, md: 0 } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                1. Phân loại báo cáo
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ px: 2, py: 0.5, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#334155' }}>Giao hàng</Typography>
                  <RadioGroup row value={deliveryMethod} onChange={(e) => handleConfigChange(setDeliveryMethod, e.target.value)} sx={{ gap: 1, flexWrap: 'nowrap' }}>
                    <FormControlLabel value="MANUAL" control={<Radio size="small" sx={{ p: 0.5, '&.Mui-checked': { color: '#2e7d32' } }} />} label={<Typography variant="body2" sx={{ fontWeight: 600, color: deliveryMethod === 'MANUAL' ? '#2e7d32' : '#64748b' }}>Thủ công</Typography>} sx={{ m: 0, width: 95 }} />
                    <FormControlLabel value="AUTO" control={<Radio size="small" sx={{ p: 0.5, '&.Mui-checked': { color: '#2e7d32' } }} />} label={<Typography variant="body2" sx={{ fontWeight: 600, color: deliveryMethod === 'AUTO' ? '#2e7d32' : '#64748b' }}>Tự động</Typography>} sx={{ m: 0, width: 95 }} />
                  </RadioGroup>
                </Box>

                <Box sx={{ px: 2, py: 0.5, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#334155' }}>Mức độ</Typography>
                  <RadioGroup row value={reportLevel} onChange={(e) => handleConfigChange(setReportLevel, e.target.value)} sx={{ gap: 1, flexWrap: 'nowrap' }}>
                    <FormControlLabel value="DETAIL" control={<Radio size="small" sx={{ p: 0.5, '&.Mui-checked': { color: '#2e7d32' } }} />} label={<Typography variant="body2" sx={{ fontWeight: 600, color: reportLevel === 'DETAIL' ? '#2e7d32' : '#64748b' }}>Chi tiết</Typography>} sx={{ m: 0, width: 95 }} />
                    <FormControlLabel value="SUMMARY" control={<Radio size="small" sx={{ p: 0.5, '&.Mui-checked': { color: '#2e7d32' } }} />} label={<Typography variant="body2" sx={{ fontWeight: 600, color: reportLevel === 'SUMMARY' ? '#2e7d32' : '#64748b' }}>Tổng hợp</Typography>} sx={{ m: 0, width: 95 }} />
                  </RadioGroup>
                </Box>
              </Box>
            </Box>

            {/* CỘT 2: THỜI GIAN */}
            <Box sx={{ width: { xs: '100%', md: '33.333%' }, px: 1.5, pb: { xs: 3, md: 0 } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                2. Khung thời gian
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Từ ngày"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    disabled={!!searchPO}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: searchPO ? '#f8fafc' : '#fff' } }}
                  />
                  <TextField
                    size="small"
                    label="Giờ"
                    type="time"
                    value={fromTime}
                    onChange={(e) => setFromTime(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 60, lang: 'en-GB' }}
                    disabled={!!searchPO}
                    sx={{ width: 110, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: searchPO ? '#f8fafc' : '#fff' } }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Đến ngày"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    disabled={!!searchPO}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: searchPO ? '#f8fafc' : '#fff' } }}
                  />
                  <TextField
                    size="small"
                    label="Giờ"
                    type="time"
                    value={toTime}
                    onChange={(e) => setToTime(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 60, lang: 'en-GB' }}
                    disabled={!!searchPO}
                    sx={{ width: 110, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: searchPO ? '#f8fafc' : '#fff' } }}
                  />
                </Box>
              </Box>
            </Box>

            {/* CỘT 3: TÌM KIẾM THEO PO & HÀNH ĐỘNG */}
            <Box sx={{ width: { xs: '100%', md: '33.333%' }, px: 1.5, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                3. Tra cứu đích danh
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Nhập Số PO"
                  placeholder="Bỏ qua filter ngày nếu nhập PO..."
                  value={searchPO}
                  onChange={(e) => setSearchPO(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2, bgcolor: '#fff',
                      '&.Mui-focused fieldset': { borderColor: '#2e7d32', borderWidth: '2px' }
                    }
                  }}
                />

                <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: { xs: 1.5, md: 0 } }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSearch}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon sx={{ fontSize: 18 }} />}
                    sx={{
                      background: 'linear-gradient(135deg, #3ba55c 0%, #2e7d32 100%)',
                      color: '#fff',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 2,
                      py: 0.8,
                      boxShadow: '0 4px 12px rgba(46,125,50,0.25)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
                      }
                    }}
                  >
                    Duyệt
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleDownload}
                    disabled={loading || data.length === 0}
                    startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}
                    sx={{
                      borderColor: '#2e7d32',
                      color: '#2e7d32',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 2,
                      py: 0.8,
                      bgcolor: 'rgba(46, 125, 50, 0.05)',
                      '&:hover': {
                        borderColor: '#1b5e20',
                        bgcolor: 'rgba(46, 125, 50, 0.1)',
                      },
                      '&.Mui-disabled': {
                        borderColor: '#cbd5e1',
                        bgcolor: '#f8fafc',
                        color: '#94a3b8'
                      }
                    }}
                  >
                    Xuất Excel
                  </Button>
                </Box>
              </Box>
            </Box>

            </Box>
          </Collapse>
        </Box>
      </Paper>

      {/* Alerts */}
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

      {/* Table Data Preview */}
      {data.length > 0 && (
        <Card elevation={0} sx={{
          border: '1px solid rgba(226, 232, 240, 0.8)',
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Lệnh hiển thị chú giải màu sắc bảng Auto - Detail */}
          {deliveryMethod === 'AUTO' && reportLevel === 'DETAIL' && (
            <Box sx={{ display: 'flex', gap: 3, px: 2, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>Chú giải màu:</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Box sx={{ width: 14, height: 14, borderRadius: '4px', bgcolor: 'rgba(239, 68, 68, 0.3)', border: '1px solid #ef4444' }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155' }}>Đã bị xóa (Delete)</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Box sx={{ width: 14, height: 14, borderRadius: '4px', bgcolor: 'rgba(16, 185, 129, 0.3)', border: '1px solid #10b981' }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155' }}>Đóng gói hoàn tất</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Box sx={{ width: 14, height: 14, borderRadius: '4px', bgcolor: 'rgba(25, 118, 210, 0.3)', border: '1px solid #1976d2' }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155' }}>Đang trong quá trình đóng gói</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Box sx={{ width: 14, height: 14, borderRadius: '4px', bgcolor: '#fff', border: '1px solid #cbd5e1' }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155' }}>Đang chờ / Trống</Typography>
              </Box>
            </Box>
          )}

          <TableContainer sx={{ maxHeight: { xs: '45vh', sm: '50vh', md: '55vh', lg: '60vh' }, overflow: 'auto' }}>
            <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: { xs: 0.5, lg: 1 }, px: { xs: 1, lg: 2 }, fontSize: { xs: '0.75rem', lg: '0.85rem' } } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#f1f5f9', width: 50, fontWeight: 700, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>STT</TableCell>
                  {hasActions && reportLevel === 'DETAIL' && (
                    <TableCell sx={{ bgcolor: '#f1f5f9', width: 80, fontWeight: 700, color: '#475569', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Thao tác</TableCell>
                  )}
                  {Array.from(new Set(data.flatMap(row => Object.keys(row)))).map(key => {
                    const isActive = !!columnFilters[key];
                    return (
                      <TableCell key={key} sx={{ bgcolor: '#f1f5f9', fontWeight: 600, color: isActive ? '#2e7d32' : '#475569', whiteSpace: 'nowrap', borderBottom: '2px solid #e2e8f0' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                          {key}
                          <IconButton
                            size="small"
                            onClick={(e) => handleOpenFilter(e, key)}
                            sx={{ p: 0.5, color: isActive ? '#2e7d32' : '#94a3b8', '&:hover': { color: '#2e7d32' } }}
                          >
                            <FilterListIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, idx) => {
                  
                  // Helper case-insensitive
                  const getVal = (obj: any, target: string) => {
                    if (!obj) return undefined;
                    const foundKey = Object.keys(obj).find(k => k.toLowerCase() === target.toLowerCase());
                    return foundKey ? obj[foundKey] : undefined;
                  };

                  const rawIsActive = getVal(row, 'IsActive');
                  const isDeleted = rawIsActive && String(rawIsActive).toLowerCase() === 'delete';
                  
                  const rawExt1 = getVal(row, 'Ext1');
                  const hasExt1 = rawExt1 && String(rawExt1).trim() !== '';

                  const rawBarCode = getVal(row, 'CTNBarCode');
                  const hasBarCode = rawBarCode && String(rawBarCode).trim() !== '';

                  let rowBg = 'inherit';
                  if (isDeleted) {
                    rowBg = 'rgba(239, 68, 68, 0.12)'; // Đỏ (Delete)
                  } else if (hasBarCode) {
                    rowBg = 'rgba(16, 185, 129, 0.15)'; // Xanh lá
                  } else if (hasExt1) {
                    rowBg = 'rgba(25, 118, 210, 0.15)'; // Xanh dương
                  }

                  return (
                    <TableRow key={idx} hover sx={{
                      backgroundColor: rowBg,
                      '&:last-child td, &:last-child th': { border: 0 }
                    }}>
                      <TableCell sx={{ color: isDeleted ? '#ef4444' : '#64748b', fontWeight: isDeleted ? 600 : 400 }}>{page * rowsPerPage + idx + 1}</TableCell>
                      {hasActions && reportLevel === 'DETAIL' && (
                        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center', p: 0.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            {canEdit && !isDeleted && (
                              <IconButton size="small" color="primary" onClick={() => handleEditClick(row)} title="Sửa">
                                <EditIcon fontSize="small" />
                              </IconButton>
                            )}
                            {canDelete && !isDeleted && (
                              <IconButton size="small" color="error" onClick={() => handleDeleteClick(row)} title="Xóa">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                      )}
                      {Array.from(new Set(data.flatMap(r => Object.keys(r)))).map(key => {
                        const val = row[key];
                        const displayVal = (val !== null && val !== undefined && val !== 'undefined' && val !== 'null') ? String(val) : '';
                        
                        const keyLower = key.toLowerCase();
                        const isIsActiveColumn = keyLower === 'isactive' && isDeleted;
                        
                        let cellColor = isDeleted ? '#ef4444' : '#1e293b';
                        let cellWeight = isIsActiveColumn ? 700 : (isDeleted ? 500 : 400);

                        // Highlight riêng chữ cho 2 cột trạng thái nếu không bị xóa
                        if (!isDeleted) {
                          if (keyLower === 'ctnbarcode' && hasBarCode) {
                            cellColor = '#059669'; // Emerald đậm (Màu trùng Xanh lá)
                            cellWeight = 800;
                          } else if (keyLower === 'ext1' && hasExt1 && !hasBarCode) {
                            cellColor = '#1976d2'; // Xanh dương đậm
                            cellWeight = 800;
                          }
                        }

                        return (
                          <TableCell key={key} sx={{ 
                            whiteSpace: 'nowrap', 
                            color: cellColor,
                            fontWeight: cellWeight
                          }}>
                            {displayVal}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ borderTop: '1px solid #e2e8f0', bgcolor: '#fff', p: 1.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>Dòng / trang:</Typography>
              <Select
                size="small"
                value={rowsPerPage}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setRowsPerPage(val);
                  setPage(0);
                  localStorage.setItem('f2s_report_rows_per_page', val.toString());
                }}
                sx={{ height: 32, fontSize: '0.875rem' }}
              >
                {[10, 25, 50, 100].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </Select>
              <Typography variant="body2" sx={{ color: '#64748b', ml: 1 }}>
                {filteredData.length > 0 ? page * rowsPerPage + 1 : 0}-{Math.min((page + 1) * rowsPerPage, filteredData.length)} trong {filteredData.length}
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

          {/* Column Filter Popover */}
          <Popover
            open={Boolean(filterAnchorEl)}
            anchorEl={filterAnchorEl?.element}
            onClose={handleCloseFilter}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            PaperProps={{
              sx: { p: 1.5, width: 220, borderRadius: 2, mt: 0.5, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }
            }}
          >
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#334155' }}>
              Lọc cột {filterAnchorEl?.column}
            </Typography>
            <TextField
              size="small"
              fullWidth
              autoFocus
              placeholder="Nhập từ khoá..."
              value={filterAnchorEl ? (columnFilters[filterAnchorEl.column] || '') : ''}
              onChange={(e) => filterAnchorEl && handleFilterChange(filterAnchorEl.column, e.target.value)}
              InputProps={{
                endAdornment: filterAnchorEl && columnFilters[filterAnchorEl.column] ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => filterAnchorEl && handleFilterChange(filterAnchorEl.column, '')}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Popover>

          {/* Edit Dialog */}
          <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 700, color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
              Chỉnh sửa thông tin {deliveryMethod === 'AUTO' ? '(Giao Tự Động)' : '(Giao Thủ Công)'}
            </DialogTitle>
            <DialogContent sx={{ p: 3, pt: '24px !important', maxHeight: '60vh' }}>
              <Grid container spacing={2}>
                {editingRow && Object.keys(editingRow).map(key => {
                  const keyLower = key.toLowerCase();
                  // Các cột hệ thống KHÔNG BAO GIỜ được sửa, bất kể role nào
                  const isReadOnlySys = ['id', 'recno', 'isactive', 'syscreatedate', 'datecreate', 'createdby'].includes(keyLower);
                  
                  let isReadOnly = isReadOnlySys;
                  
                  // Nếu KHÔNG phải Admin và cũng KHÔNG phải cột hệ thống, giới hạn cột sửa
                  if (!canEditAll && !isReadOnlySys) {
                    if (!editableColsForUser.includes(keyLower)) {
                      isReadOnly = true; 
                    }
                  }

                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={key}>
                      <TextField
                        size="small"
                        fullWidth
                        label={key}
                        value={editingRow[key] || ''}
                        onChange={(e) => setEditingRow({ ...editingRow, [key]: e.target.value })}
                        disabled={isReadOnly}
                        sx={{ bgcolor: isReadOnly ? '#f8fafc' : '#fff' }}
                        helperText={!canEditAll && !isReadOnlySys && !editableColsForUser.includes(keyLower) ? "Chỉ admin mới được sửa cột này" : ""}
                        FormHelperTextProps={{ sx: { fontSize: '0.65rem' } }}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
              <Button onClick={() => setEditDialogOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
                Hủy bỏ
              </Button>
              <Button onClick={handleEditSave} variant="contained" color="primary" disableElevation sx={{ fontWeight: 600 }}>
                Lưu Thay Đổi
              </Button>
            </DialogActions>
          </Dialog>

        </Card>
      )}
      <ConfirmDialog state={confirmDialog} onClose={closeConfirm} />
      
      {/* ─── PHYSICAL SPACER BLOCK ─── */}
      {/* Đảm bảo luồn qua BottomNavigation trong WebView APK */}
      <Box sx={{ height: { xs: '100px', md: 0 }, width: '100%', flexShrink: 0 }} />
    </Box>
  );
}
