import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box, Typography, Button, TextField, CircularProgress, Alert, Card,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  Skeleton, TablePagination, InputAdornment, IconButton, Badge, Drawer, Divider, Autocomplete, Pagination, Select, MenuItem, Popover, Switch
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircleOutline as CheckIcon,
  LocalShipping as ShippingIcon,
  WarningAmber as WarningIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Close as CloseIcon
} from '@mui/icons-material';

import { authService } from '@traxeco/shared';
import { deliveryScanService } from '../services/deliveryScanService';

export default function ReceivePage() {
  const [loading, setLoading] = useState(true); // true by default for initial load
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Pagination & Search State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);

  // Filter Drawer State
  const [filterOpen, setFilterOpen] = useState(false);

  const [filterPO, setFilterPO] = useState('');
  const [filterJob, setFilterJob] = useState('');
  const [filterLine, setFilterLine] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({ po: '', job: '', line: '' });

  // Popover Anchor States for Inline Filters
  const [poFilterAnchorEl, setPoFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [jobFilterAnchorEl, setJobFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [lineFilterAnchorEl, setLineFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  const userInfo = authService.getUserInfo();

  // Dialog State
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actualQty, setActualQty] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Thêm History State
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryRow, setSelectedHistoryRow] = useState<any>(null);

  const applyFilters = () => {
    setPage(0);
    setAppliedFilters({ po: filterPO, job: filterJob, line: filterLine });
    // Dùng setTimeout để tránh bị MUI Autocomplete blur event chặn
    setTimeout(() => {
      setFilterOpen(false);
    }, 100);
  };

  const handleRemoveFilter = (type: 'po' | 'job' | 'line', valueToRemove: string) => {
    const currentList = appliedFilters[type].split(',').map(s => s.trim()).filter(Boolean);
    const newList = currentList.filter(item => item !== valueToRemove);
    const newStr = newList.join(',');
    
    setAppliedFilters(prev => ({ ...prev, [type]: newStr }));
    if (type === 'po') setFilterPO(newStr);
    if (type === 'job') setFilterJob(newStr);
    if (type === 'line') setFilterLine(newStr);
    setPage(0);
  };

  // Fetch data on mount and on page/search change
  useEffect(() => {
    handleRefresh(false);
  }, [page, rowsPerPage, appliedFilters]);

  // Bộ Timer cho Smart Polling
  const lastInteractionRef = useRef<number>(Date.now());

  // Lắng nghe sự kiện người dùng tương tác để reset idle timer
  useEffect(() => {
    const handleInteraction = () => { lastInteractionRef.current = Date.now(); };
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    return () => {
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  // Lặp nền: Ninja Tự Động Định Tuyến Thời Gian (Smart Polling)
  useEffect(() => {
    let timeoutId: any;
    
    const tick = () => {
      // 1. Tắt công tắc hoặc đang mổ xẻ chứng từ -> Đi ngủ 10s
      if (!isAutoRefresh || dialogOpen) {
        timeoutId = setTimeout(tick, 10000);
        return;
      }
      // 2. Màn hình Tablet đang tắt / Tắt tab -> Đi ngủ 10s (Bảo vệ CPU)
      if (document.visibilityState !== 'visible') {
        timeoutId = setTimeout(tick, 10000);
        return;
      }
      
      // 3. Tính độ trễ (Thời gian rảnh rỗi không ai đụng vô máy ngập kho)
      const idleTime = Date.now() - lastInteractionRef.current;
      let nextInterval = 10000; // Tiêu chuẩn: 10s/lần
      if (idleTime > 60000 * 3) {
        nextInterval = 30000; // Nghỉ 3 phút -> Rẽ sóng 30s/lần
      }
      if (idleTime > 60000 * 10) {
        nextInterval = 60000; // Nghỉ 10 phút -> Ngái ngủ 60s/lần
      }

      handleRefresh(true).finally(() => {
        timeoutId = setTimeout(tick, nextInterval);
      });
    };
    
    if (isAutoRefresh) {
      timeoutId = setTimeout(tick, 10000);
    }
    
    return () => clearTimeout(timeoutId);
  }, [isAutoRefresh, dialogOpen, page, rowsPerPage, appliedFilters]);

  const handleRefresh = async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
      setError(null);
      setSuccess(null);
    }
    try {
      const result = await deliveryScanService.getImportSewingData(userInfo.factory, appliedFilters, page, rowsPerPage);
      // Backend returns Map: { data: [...], totalItems: X, currentPage: Y, totalPages: Z }
      setData(result.data || []);
      setTotalItems(result.totalItems || 0);
      setLastUpdated(new Date());
    } catch (err: any) {
      if (!isSilent) {
        setError(err.message || 'Lỗi khi tải dữ liệu từ server.');
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  const openConfirmDialog = (row: any) => {
    setSelectedRow(row);
    const qty = row.TotalQty || row.Qty || 0;
    setActualQty(qty.toString());
    setDialogOpen(true);
    setIsKeyboardOpen(false);
    setSuccess(null);
    setError(null);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedRow(null);
  };

  const handleConfirm = async () => {
    if (!actualQty || isNaN(Number(actualQty))) {
      setError('Vui lòng nhập số lượng hợp lệ!');
      return;
    }

    setActionLoading(true);
    try {
      const barcode = selectedRow.RecNo || selectedRow.BarCode || selectedRow.id;
      await deliveryScanService.confirmImportSewing(barcode, Number(actualQty));
      
      setSuccess(`Đã xác nhận nhập kho thành công cho PO ${selectedRow.PONo}.`);
      closeDialog();
      handleRefresh(); // Reload list
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xác nhận. Vui lòng thử lại.');
    } finally {
      setActionLoading(false);
    }
  };

  const openHistory = async (row: any) => {
    setSelectedHistoryRow(row);
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    try {
      const barcode = row.RecNo || row.BarCode || row.id;
      const data = await deliveryScanService.getReceiveHistory(barcode);
      setHistoryData(data);
    } catch (err: any) {
      setError(err.message || 'Lỗi lấy lịch sử');
    } finally {
      setHistoryLoading(false);
    }
  };

  const expectedQtyValue = selectedRow ? Number(selectedRow.TotalQty || selectedRow.Qty || 0) : 0;
  const isMismatch = selectedRow && Number(actualQty) !== expectedQtyValue;

  // ─── Loading skeleton ───
  const LoadingSkeleton = () => (
    <Box sx={{ p: 2 }}>
      {[...Array(6)].map((_, i) => (
        <Skeleton 
          key={i} 
          variant="rectangular" 
          height={44} 
          sx={{ mb: 1, borderRadius: 1, animation: 'pulse 1.2s ease-in-out infinite' }} 
        />
      ))}
    </Box>
  );

  // ─── Memoized Table Content to Prevent Input Lag ───
  const tableContent = useMemo(() => {
    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#94a3b8' }}>
            <ShippingIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <Typography>Không có lô hàng nào đang chờ xác nhận.</Typography>
          </TableCell>
        </TableRow>
      );
    }
    
    return data.map((row, idx) => (
      <TableRow key={row.RecNo || idx} hover sx={{ 
        '&:last-child td, &:last-child th': { border: 0 }
      }}>
        <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>{row.PONo}</TableCell>
        <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>{row.JobNo || '—'}</TableCell>
        <TableCell>
          <Chip size="small" label={row.FacLine} sx={{ bgcolor: 'rgba(25,118,210,0.1)', color: '#1976d2', fontWeight: 600 }} />
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>
            {row.DateCreate ? new Date(row.DateCreate).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.ColorName || row.ColorID || '—'} / {row.SizeName || row.SizeID || '—'}
          </Typography>
        </TableCell>
        <TableCell align="center">
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#ea580c' }}>
            {Number(row.TotalQty || 0).toLocaleString()}
          </Typography>
        </TableCell>
        <TableCell align="center">
          {(() => {
            const qtyConfirm = Number(row.QtyConfirm || 0);
            const totalQty = Number(row.TotalQty || 0);
            const isShortage = qtyConfirm > 0 && totalQty > qtyConfirm;
            const isFull = qtyConfirm > 0 && totalQty <= qtyConfirm;
            
            return (
              <Typography 
                variant="body2" 
                onClick={() => { if (isShortage) openHistory(row); }}
                sx={{ 
                  fontWeight: 800, 
                  color: isShortage ? '#ef4444' : (isFull ? '#10b981' : '#64748b'),
                  textDecoration: isShortage ? 'underline' : 'none',
                  cursor: isShortage ? 'pointer' : 'default',
                  '&:hover': isShortage ? { opacity: 0.7 } : {}
                }}
              >
                {qtyConfirm.toLocaleString()}
              </Typography>
            );
          })()}
        </TableCell>
        <TableCell align="center">
          <Button
            size="small"
            variant="contained"
            onClick={() => openConfirmDialog(row)}
            sx={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '8px',
              padding: '4px 16px',
              boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { 
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(16,185,129,0.4)',
              }
            }}
          >
            Kiểm hàng
          </Button>
        </TableCell>
      </TableRow>
    ));
  }, [data]);

  return (
    <Box sx={{ 
      display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 2, 
      px: { xs: 1.5, md: 1.5, lg: 2 }, pt: { xs: 2, md: 1 }, pb: { xs: 1, md: 0 },
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      '@keyframes fadeInRow': {
        '0%': { opacity: 0, transform: 'translateY(15px)' },
        '100%': { opacity: 1, transform: 'translateY(0)' }
      }
    }}>
      
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}>
            🗓 Cập nhật: {lastUpdated.toLocaleTimeString()}
          </Typography>
        </Box>

        {/* Thể hiện các Tag lọc ra ngoài */}
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
          {appliedFilters.po.split(',').filter(Boolean).map((t, i) => (
            <Chip key={`po-${i}`} label={`PO: ${t.trim()}`} size="small" onDelete={() => handleRemoveFilter('po', t.trim())} color="primary" variant="outlined" sx={{ bgcolor: '#fff', fontWeight: 600 }} />
          ))}
          {appliedFilters.job.split(',').filter(Boolean).map((t, i) => (
            <Chip key={`job-${i}`} label={`Job: ${t.trim()}`} size="small" onDelete={() => handleRemoveFilter('job', t.trim())} color="primary" variant="outlined" sx={{ bgcolor: '#fff', fontWeight: 600 }} />
          ))}
          {appliedFilters.line.split(',').filter(Boolean).map((t, i) => (
            <Chip key={`line-${i}`} label={`Chuyền: ${t.trim()}`} size="small" onDelete={() => handleRemoveFilter('line', t.trim())} color="primary" variant="outlined" sx={{ bgcolor: '#fff', fontWeight: 600 }} />
          ))}
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            label={loading ? 'Đang tải...' : `Tổng số lô: ${totalItems}`}
            sx={{ fontWeight: 700, bgcolor: '#f1f5f9', color: '#475569', borderRadius: 2, height: 36, px: 0.5, letterSpacing: '0.5px', display: { xs: 'none', sm: 'flex' } }}
          />
          <Badge 
            color="error" 
            variant="dot" 
            invisible={!appliedFilters.po && !appliedFilters.job && !appliedFilters.line}
          >
            <Button
              variant="outlined"
              onClick={() => setFilterOpen(true)}
              startIcon={<FilterIcon />}
              sx={{ 
                borderRadius: 2, bgcolor: '#ffffff', textTransform: 'none', fontWeight: 700, 
                color: '#475569', borderColor: '#cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                transition: 'all 0.2s',
                '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 6px rgba(0,0,0,0.04)', bgcolor: '#f8fafc' }
              }}
            >
              Bộ Lọc
            </Button>
          </Badge>

          <Drawer
            anchor="right"
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
            sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}
            PaperProps={{ sx: { width: { xs: '85%', sm: 360 }, p: 0, borderRadius: '16px 0 0 16px', boxShadow: '-4px 0 24px rgba(0,0,0,0.1)' } }}
          >
            {/* Drawer Header */}
            <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterIcon sx={{ color: '#3ba55c' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b' }}>
                  Tiêu chí tìm kiếm
                </Typography>
              </Box>
              <IconButton onClick={() => setFilterOpen(false)} size="small" sx={{ color: '#64748b' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Drawer Content */}
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, flexGrow: 1 }}>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={filterPO ? filterPO.split(',').map(s => s.trim()).filter(Boolean) : []}
                onChange={(_, newVal) => setFilterPO(newVal.join(','))}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return <Chip variant="outlined" label={`PO: ${option}`} size="small" color="primary" key={key} {...tagProps} sx={{ bgcolor: '#fff', fontWeight: 600 }} />;
                  })
                }
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="PO Number (Nhiều mã)" 
                    variant="outlined" 
                    placeholder="Gõ rồi nhấn Enter..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !(e.target as HTMLInputElement).value) {
                        applyFilters();
                      }
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
              />
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={filterJob ? filterJob.split(',').map(s => s.trim()).filter(Boolean) : []}
                onChange={(_, newVal) => setFilterJob(newVal.join(','))}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return <Chip variant="outlined" label={`Job: ${option}`} size="small" color="primary" key={key} {...tagProps} sx={{ bgcolor: '#fff', fontWeight: 600 }} />;
                  })
                }
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Job No (Nhiều mã)" 
                    variant="outlined" 
                    placeholder="Gõ rồi nhấn Enter..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !(e.target as HTMLInputElement).value) {
                        applyFilters();
                      }
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
              />
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={filterLine ? filterLine.split(',').map(s => s.trim()).filter(Boolean) : []}
                onChange={(_, newVal) => setFilterLine(newVal.join(','))}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return <Chip variant="outlined" label={`Chuyền: ${option}`} size="small" color="primary" key={key} {...tagProps} sx={{ bgcolor: '#fff', fontWeight: 600 }} />;
                  })
                }
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Chuyền (Nhiều mã)" 
                    variant="outlined" 
                    placeholder="Gõ rồi nhấn Enter..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !(e.target as HTMLInputElement).value) {
                        applyFilters();
                      }
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
              />
            </Box>

            {/* Drawer Actions */}
            <Box sx={{ p: 2.5, display: 'flex', gap: 1.5, borderTop: '1px solid #e2e8f0', bgcolor: '#fff' }}>
              <Button 
                fullWidth variant="outlined" size="large" 
                onClick={() => {
                  setFilterPO(''); setFilterJob(''); setFilterLine('');
                  setPage(0);
                  setAppliedFilters({ po: '', job: '', line: '' });
                  setFilterOpen(false);
                }}
                sx={{ fontWeight: 700, borderRadius: 2, borderColor: '#cbd5e1', color: '#475569' }}
              >
                Xóa lọc
              </Button>
              <Button 
                fullWidth variant="contained" size="large" disableElevation
                onClick={() => applyFilters()}
                sx={{ fontWeight: 700, borderRadius: 2, bgcolor: '#3ba55c', '&:hover': { bgcolor: '#2e7d32' } }}
              >
                Tìm
              </Button>
            </Box>
          </Drawer>

          <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#fff', borderRadius: 2, border: '1px solid #cbd5e1', pl: 1.5, pr: 0.5, py: 0.5, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
              {isAutoRefresh && (
                <Box sx={{ 
                  width: 8, height: 8, bgcolor: '#10b981', borderRadius: '50%', mr: 1, 
                  boxShadow: '0 0 6px #10b981',
                  animation: 'pulse 1.5s infinite',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)' },
                    '70%': { transform: 'scale(1)', boxShadow: '0 0 0 6px rgba(16, 185, 129, 0)' },
                    '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' }
                  }
                }} />
              )}
              <Typography sx={{ fontWeight: 800, color: isAutoRefresh ? '#10b981' : '#64748b', fontSize: '0.8rem', letterSpacing: 0.5 }}>
                LIVE SYNC
              </Typography>
            </Box>
            <Switch
              size="small"
              checked={isAutoRefresh}
              onChange={(e) => setIsAutoRefresh(e.target.checked)}
              sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#10b981' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#10b981' } }}
            />
          </Box>

          <Button
            variant="contained"
            color="primary"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={() => handleRefresh(false)}
            disabled={loading}
            disableElevation
            sx={{ 
              borderRadius: 2, fontWeight: 700, textTransform: 'none',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              color: '#334155', border: '1px solid #cbd5e1',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 6px rgba(0,0,0,0.04)', background: '#f1f5f9' }
            }}
          >
            Làm mới
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ borderRadius: 2 }}>{success}</Alert>}

      {/* Main List */}
      <Card elevation={0} sx={{ 
        border: '1px solid rgba(255, 255, 255, 0.4)', 
        borderRadius: '12px', 
        boxShadow: '0 10px 40px rgba(0,0,0,0.03), 0 2px 10px rgba(0,0,0,0.01)',
        bgcolor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0
      }}>
        {/* Summary moved to Header */}
        {/* Loading state */}
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            <TableContainer sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              <Table stickyHeader size="small" sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: '#f8fafc', p: 1, borderBottom: '2px solid #e2e8f0', minWidth: 140 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1 }}>
                        <Typography sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>PO Number</Typography>
                        <IconButton size="small" onClick={(e) => setPoFilterAnchorEl(e.currentTarget)} sx={{ color: filterPO ? '#10b981' : '#94a3b8', p: 0.5 }}>
                          <FilterIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Popover
                        open={Boolean(poFilterAnchorEl)} anchorEl={poFilterAnchorEl} onClose={() => setPoFilterAnchorEl(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        PaperProps={{ elevation: 3, sx: { borderRadius: 2, mt: 1, minWidth: 200 } }}
                      >
                        <Box sx={{ p: 1.5 }}>
                          <TextField
                            size="small" placeholder="Tìm PO Number..." value={filterPO} autoFocus fullWidth
                            onChange={(e) => setFilterPO(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { applyFilters(); setPoFilterAnchorEl(null); } }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                          />
                        </Box>
                      </Popover>
                    </TableCell>

                    <TableCell sx={{ bgcolor: '#f8fafc', p: 1, borderBottom: '2px solid #e2e8f0', minWidth: 140 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1 }}>
                        <Typography sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Job No</Typography>
                        <IconButton size="small" onClick={(e) => setJobFilterAnchorEl(e.currentTarget)} sx={{ color: filterJob ? '#10b981' : '#94a3b8', p: 0.5 }}>
                          <FilterIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Popover
                        open={Boolean(jobFilterAnchorEl)} anchorEl={jobFilterAnchorEl} onClose={() => setJobFilterAnchorEl(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        PaperProps={{ elevation: 3, sx: { borderRadius: 2, mt: 1, minWidth: 200 } }}
                      >
                        <Box sx={{ p: 1.5 }}>
                          <TextField
                            size="small" placeholder="Tìm Job No..." value={filterJob} autoFocus fullWidth
                            onChange={(e) => setFilterJob(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { applyFilters(); setJobFilterAnchorEl(null); } }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                          />
                        </Box>
                      </Popover>
                    </TableCell>

                    <TableCell sx={{ bgcolor: '#f8fafc', p: 1, borderBottom: '2px solid #e2e8f0', minWidth: 140 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1 }}>
                        <Typography sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Chuyền</Typography>
                        <IconButton size="small" onClick={(e) => setLineFilterAnchorEl(e.currentTarget)} sx={{ color: filterLine ? '#10b981' : '#94a3b8', p: 0.5 }}>
                          <FilterIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Popover
                        open={Boolean(lineFilterAnchorEl)} anchorEl={lineFilterAnchorEl} onClose={() => setLineFilterAnchorEl(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        PaperProps={{ elevation: 3, sx: { borderRadius: 2, mt: 1, minWidth: 200 } }}
                      >
                        <Box sx={{ p: 1.5 }}>
                          <TextField
                            size="small" placeholder="Tìm Chuyền..." value={filterLine} autoFocus fullWidth
                            onChange={(e) => setFilterLine(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { applyFilters(); setLineFilterAnchorEl(null); } }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                          />
                        </Box>
                      </Popover>
                    </TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', p: 1, borderBottom: '2px solid #e2e8f0', verticalAlign: 'middle' }}>
                      <Typography sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Ngày Tạo</Typography>
                    </TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', p: 1, borderBottom: '2px solid #e2e8f0', verticalAlign: 'middle' }}>
                      <Typography sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Màu / Size</Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ bgcolor: '#f8fafc', p: 1, borderBottom: '2px solid #e2e8f0', verticalAlign: 'middle' }}>
                      <Typography sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>SL Báo</Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ bgcolor: '#f8fafc', p: 1, borderBottom: '2px solid #e2e8f0', verticalAlign: 'middle' }}>
                      <Typography sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>SL Nhận</Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ bgcolor: '#f8fafc', p: 1, borderBottom: '2px solid #e2e8f0', verticalAlign: 'middle' }}>
                      <Typography sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Hành Động</Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableContent}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination Controls */}
            {data.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600 }}>Số dòng:</Typography>
                  <Select
                    size="small"
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setPage(0);
                    }}
                    sx={{ height: 32, bgcolor: '#ffffff', borderRadius: 1.5, fontSize: '0.875rem', fontWeight: 600, minWidth: 70 }}
                  >
                    {[20, 50, 100].map(v => <MenuItem key={v} value={v} sx={{ fontWeight: 600 }}>{v}</MenuItem>)}
                  </Select>
                  <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500, display: { xs: 'none', sm: 'block' } }}>
                    {page * rowsPerPage + 1} - {Math.min((page + 1) * rowsPerPage, totalItems)} của {totalItems}
                  </Typography>
                </Box>
                <Pagination 
                  count={Math.ceil(totalItems / rowsPerPage) || 1} 
                  page={page + 1} 
                  onChange={(e, val) => setPage(val - 1)}
                  color="primary" 
                  shape="rounded"
                  showFirstButton 
                  showLastButton
                  siblingCount={0}
                  boundaryCount={1}
                  sx={{
                    '& .MuiPaginationItem-root': { fontWeight: 700, borderRadius: 1.5 },
                    '& .Mui-selected': { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }
                  }}
                />
              </Box>
            )}
          </>
        )}
      </Card>

      {/* Validation Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', pb: 2 }}>
          Xác Nhận Hàng Nhận
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 6 }}>
          {selectedRow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 5 }}>
                  <Typography variant="body2" color="text.secondary">Số PO:</Typography>
                </Grid>
                <Grid size={{ xs: 7 }}>
                  <Typography variant="body2" fontWeight={700}>{selectedRow.PONo}</Typography>
                </Grid>
                <Grid size={{ xs: 5 }}>
                  <Typography variant="body2" color="text.secondary">Job No:</Typography>
                </Grid>
                <Grid size={{ xs: 7 }}>
                  <Typography variant="body2" fontWeight={700}>{selectedRow.JobNo || '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 5 }}>
                  <Typography variant="body2" color="text.secondary">Chuyền gửi:</Typography>
                </Grid>
                <Grid size={{ xs: 7 }}>
                  <Typography variant="body2" fontWeight={700}>{selectedRow.FacLine}</Typography>
                </Grid>
                <Grid size={{ xs: 5 }}>
                  <Typography variant="body2" color="text.secondary">Người giao:</Typography>
                </Grid>
                <Grid size={{ xs: 7 }}>
                  <Typography variant="body2" fontWeight={700}>{selectedRow.Exporter || '—'}</Typography>
                </Grid>
              </Grid>

              <Box sx={{ mt: 1, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b', mb: 1 }}>
                  SỐ LƯỢNG HÀNG XƯỞNG BÁO (Expected)
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  {expectedQtyValue.toLocaleString()} <Typography component="span" variant="body1" color="text.secondary">pcs</Typography>
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="Số lượng thực tế nhận được (Actual)"
                type="number"
                value={actualQty}
                onChange={(e) => setActualQty(e.target.value)}
                onFocus={(e) => {
                  setIsKeyboardOpen(true);
                  setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 250);
                }}
                onBlur={() => {
                  setTimeout(() => setIsKeyboardOpen(false), 200);
                }}
                InputLabelProps={{ shrink: true }}
                sx={{
                  mt: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    fontWeight: 700,
                    fontSize: '1.2rem',
                    color: isMismatch ? '#ef4444' : '#10b981',
                    '&.Mui-focused fieldset': { 
                      borderColor: isMismatch ? '#ef4444' : '#10b981' 
                    }
                  }
                }}
              />

              {isMismatch && (
                <Alert severity="warning" icon={<WarningIcon />} sx={{ borderRadius: 2, mt: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Cảnh báo! Số lượng nhận không khớp với số lượng xưởng gửi.
                  </Typography>
                </Alert>
              )}
              
              {/* Force massive spacer ONLY when keyboard is summoned to avoid ugly permanent whitespace */}
              {isKeyboardOpen && <Box className="animate-slide-up" sx={{ height: 120, opacity: 0, pointerEvents: 'none' }} />}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #f1f5f9', bgcolor: '#f8fafc' }}>
          <Button onClick={closeDialog} disabled={actionLoading} color="inherit" sx={{ fontWeight: 600 }}>
            Đóng
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={actionLoading} 
            variant="contained" 
            disableElevation
            startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
            sx={{ fontWeight: 600, borderRadius: 2, bgcolor: isMismatch ? '#f59e0b' : '#3ba55c', '&:hover': { bgcolor: isMismatch ? '#d97706' : '#2e7d32' } }}
          >
            {actionLoading ? 'Đang xử lý...' : (isMismatch ? 'Xác nhận Bất Thường' : 'Nhận Đủ')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PHYSICAL SPACER BLOCK */}
      <Box sx={{ height: { xs: '100px', md: 0 }, width: '100%', flexShrink: 0 }} />

      {/* History Dialog */}
      <Dialog 
        open={historyDialogOpen} 
        onClose={() => setHistoryDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: '12px', overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Lịch sử xác nhận
          <IconButton onClick={() => setHistoryDialogOpen(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {historyLoading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={32} />
              <Typography sx={{ mt: 2, color: '#64748b' }}>Đang tải lịch sử...</Typography>
            </Box>
          ) : historyData.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: '#64748b' }}>Chưa có lịch sử xác nhận nào.</Typography>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>TG Cập Nhật</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Người XN</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>SL Nhận</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyData.map((h, i) => (
                    <TableRow key={i}>
                      <TableCell>{new Date(h.SysCreateDate || h.sysCreateDate).toLocaleString()}</TableCell>
                      <TableCell><Chip size="small" label={h.CreatedBy || h.createdBy} sx={{ fontWeight: 600, bgcolor: '#f1f5f9' }} /></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#3ba55c' }}>{Number(h.Qty || h.qty).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
