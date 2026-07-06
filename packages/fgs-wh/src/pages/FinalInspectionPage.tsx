import { useState, useMemo, useEffect, memo, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, TextField, CircularProgress, Alert, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination, Select, MenuItem,
  Snackbar, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Chip, LinearProgress, Checkbox, Backdrop, useMediaQuery, useTheme, Popover, Grid, Divider, Skeleton, Fade
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AssignmentTurnedIn as AssignmentIcon,
  FilterAlt as FilterAltIcon,
  FilterAltOutlined as FilterAltOutlinedIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { authService } from '@traxeco/shared';

const CACHE_KEY = 'FGS_ FinalInspection_Cache';
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

const getCleanKey = (val: any) => String(val || '').replace(/[^a-zA-Z0-9]/g, '');

const deduplicateData = (dataArray: any[]) => {
  if (!dataArray || !Array.isArray(dataArray)) return [];
  return Array.from(new Map(dataArray.map(item => {
    const po = getCleanKey(item.PONo || item.poNo);
    const pk = getCleanKey(item.PkListRef || item.pkListRef);
    return [`${po}-${pk}`, item];
  })).values());
};

const CartonDetailRow = memo(({ row, hasQAAction, handleToggleCheck }: any) => {
  const code = row.LsCTNCod || row.lsCTNCod;
  return (
    <TableRow 
      hover 
      selected={row.checked}
      onClick={(e) => { 
        if(hasQAAction && (e.target as HTMLElement).tagName !== 'INPUT') { 
          handleToggleCheck(code); 
        } 
      }} 
      sx={{ 
        cursor: hasQAAction ? 'pointer' : 'default',
        backgroundColor: row.checked ? '#fff3e0' : 'inherit',
        '&:hover': { backgroundColor: row.checked ? '#ffe0b2 !important' : undefined }
      }}
    >
      <TableCell padding="checkbox" sx={{ width: 32, p: 0, textAlign: 'center' }}>
        <Checkbox size="small" disabled={!hasQAAction} checked={row.checked} onChange={() => handleToggleCheck(code)} sx={{ p: 0.5 }} />
      </TableCell>
      <TableCell sx={{ fontFamily: 'monospace' }}>{row.LsCTNCod || row.lsCTNCod}</TableCell>
      <TableCell>{row.CTNNo || row.ctnNo}</TableCell>
      <TableCell>{row.CustSize || row.custSize || row.Size || ''}</TableCell>
      <TableCell align="center">
        {(row.PickCTN === '*' || row.pickCTN === '*' || row.InsPickCTN === '*') ? <CheckCircleIcon color="success" fontSize="small" /> : '-'}
      </TableCell>
      <TableCell align="center">
        {(row.FinalGet === '*' || row.finalGet === '*' || row.CTNGetInspt === '*') ? <CheckCircleIcon color="warning" fontSize="small" /> : '-'}
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  return prevProps.row === nextProps.row && prevProps.hasQAAction === nextProps.hasQAAction;
});

export default function FinalInspectionPage() {
  const { t } = useTranslation();
  const theme = useTheme();

  // Filters
  const [dateOrPkNo, setDateOrPkNo] = useState(pageCache?.dateOrPkNo || 'Date');
  const [searchTerm, setSearchTerm] = useState(pageCache?.searchTerm || '');
  const [filterMode, setFilterMode] = useState<string>('All'); // 'All', 'MissCTN', 'WaitingFinal', 'Pending', 'NotPick'

  // Data
  const [data, setData] = useState<any[]>(() => deduplicateData(pageCache?.data || []));
  const [loading, setLoading] = useState(false);
  const [_error, setError] = useState<string | null>(null);
  
  // Right side details
  const [detailData, setDetailData] = useState<any[]>([]);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submittingQA, setSubmittingQA] = useState(false);

  // Pagination main list
  const [page, setPage] = useState(pageCache?.page || 0);
  const [rowsPerPage, setRowsPerPage] = useState(pageCache?.rowsPerPage || 50);

  // Pagination detail list
  const [detailPage, setDetailPage] = useState(0);
  const [detailRowsPerPage, setDetailRowsPerPage] = useState(50);

  // Column Filters
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [detailColFilters, setDetailColFilters] = useState<Record<string, string>>({});

  // Filter Popover
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [currentFilterCol, setCurrentFilterCol] = useState<{ table: 'main' | 'detail', colName: string, label: string } | null>(null);

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>, table: 'main'|'detail', colName: string, label: string) => {
    setFilterAnchorEl(event.currentTarget);
    setCurrentFilterCol({ table, colName, label });
  };
  const handleFilterClose = () => {
    setFilterAnchorEl(null);
    setCurrentFilterCol(null);
  };

  // Toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  // Confirm Dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState('');

  // Final Comment Dialog
  const [cmtOpen, setCmtOpen] = useState(false);
  const [cmtFinalStatus, setCmtFinalStatus] = useState('');
  const [cmtComment, setCmtComment] = useState('');
  const [cmtLoading, setCmtLoading] = useState(false);

  // Permission Check
  const userInfo = authService.getUserInfo();
  const userSection = userInfo.section;
  const userDept = userInfo.dept;
  const isAdmin = authService.isAdmin() || authService.isSuperAdmin();
  const hasEditPerm = authService.hasAction('finalinspection', 'canEdit');
  const sectionStr = userSection?.toUpperCase() || '';
  const deptStr = userDept?.toUpperCase() || '';

  // Department detection (chỉ xác định thuộc bộ phận nào, chưa có quyền edit)
  const isQADept = ['FININS', 'QA', 'QC', 'QCI', 'CFA'].includes(sectionStr) || ['QA', 'QC', 'QCI', 'CFA'].includes(deptStr);
  const isWHDept = ['WH', 'FGS', 'KHO', 'LOG', 'FIN', 'FININS'].includes(sectionStr) || ['WH', 'FGS', 'KHO', 'LOG', 'FIN', 'FININS'].includes(deptStr) || sectionStr.includes('WH') || deptStr.includes('WH') || deptStr.includes('FIN') || deptStr.includes('FGS');

  // Action permissions
  // QA/QCI/CFA: luôn được Pick CTN (không cần set Edit)
  const canPickCTN = isAdmin || isQADept;
  // Kho: phải có quyền Edit mới được Final Get
  const canFinalGet = isAdmin || (isWHDept && hasEditPerm);
  const canAct = canPickCTN || canFinalGet;
  const hasQAAction = canPickCTN;

  // Cache Logic
  useEffect(() => {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      dateOrPkNo, searchTerm, data, page, rowsPerPage
    }));
  }, [dateOrPkNo, searchTerm, data, page, rowsPerPage]);

  const showToast = (msg: string, severity: any = 'success') => {
    setToastMsg(msg); setToastSeverity(severity); setToastOpen(true);
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      // Theo C# bản cũ: InlineFGsWHPkListComplnssLink_1
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      params.append('searchType', dateOrPkNo);
      
      // Chờ backend ghép API, mô phỏng data array
      const res = await fetch(`${API_BASE}/inspection/packing-lists?${params.toString()}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      if (!res.ok) {
        // Tạm mock data nếu chưa có API thật
        const dummyData = [
          { PkListRef: 'PL-2026-001', PONo: 'PO123456', OrderQty: 1000, ReqQty: 100, InQty: 100, Compl: 100, C1: '', C2: '*', C3: '*', Date: '2026-04-10' },
          { PkListRef: 'PL-2026-002', PONo: 'PO654321', OrderQty: 500, ReqQty: 50, InQty: 40, Compl: 80, C1: '', C2: '', C3: 'M', Date: '2026-04-11' }
        ];
        setData(dummyData);
        setPage(0);
        showToast('Using Mock Data (API not fully ready yet)', 'info');
      } else {
        const result: any[] = await res.json();
        const uniqueResult = deduplicateData(result);
        setData(uniqueResult);
        setPage(0);
        showToast(t('inspection.loadSuccess', 'Load success'), 'success');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (row: any) => {
    setSelectedPO(row);
    setLoadingDetail(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ poNo: row.PONo, refNo: row.PkListRef });
      const res = await fetch(`${API_BASE}/inspection/carton-details?${params.toString()}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });

      if (!res.ok) {
        // Mock data
        const dummyDetails = Array.from({ length: 15 }).map((_, i) => ({
          id: i,
          LsCTNCod: `CTN-${row.PONo}-${i + 1}`,
          CTNNo: i + 1,
          PackQty: 10,
          Size: 'M',
          PickCTN: i % 3 === 0 ? '*' : '',
          FinalGet: i % 4 === 0 ? '*' : '',
          Status: 'Pending',
          checked: false // for local UI toggle
        }));
        setDetailData(dummyDetails);
      } else {
        const result: any[] = await res.json();
        setDetailData(result.map(d => ({ ...d, checked: false })));
        setDetailPage(0);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Các nút Filter như trên C#
  const applyFilter = (mode: string) => {
    setFilterMode(mode);
    setPage(0);
  };

  const filteredData = useMemo(() => {
    let result = data;
    if (filterMode === 'WaitingFinal') {
      result = result.filter(r => (r.Compl >= 79 && r.C2 === '*' && r.C3 === '*'));
    } else if (filterMode === 'MissCTN') {
      result = result.filter(r => r.C3 === 'M');
    } else if (filterMode === 'Pending') {
      result = result.filter(r => r.Compl < 100);
    } else if (filterMode === 'NotPick') {
      result = result.filter(r => (r.C1 !== '' || r.C2 === '' || r.C3 === '*'));
    }
    
    // Apply Column Filters
    const activeFilters = Object.entries(colFilters).filter(([_, val]) => val && val.trim() !== '');
    if (activeFilters.length === 0) return result;

    const lowerFilters = activeFilters.map(([col, val]) => [col, val.trim().toLowerCase()]);
    return result.filter(row => {
      return lowerFilters.every(([col, val]) => {
        const rowVal = String(row[col] || '').toLowerCase();
        return rowVal.includes(val);
      });
    });
  }, [data, filterMode, colFilters]);

  const paginatedData = useMemo(() => {
    return filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  const filteredDetailData = useMemo(() => {
    const activeFilters = Object.entries(detailColFilters).filter(([_, val]) => val && val.trim() !== '');
    if (activeFilters.length === 0) return detailData;

    const lowerFilters = activeFilters.map(([col, val]) => [col, val.trim().toLowerCase()]);
    return detailData.filter(row => {
      return lowerFilters.every(([col, val]) => {
        const rowVal = String(row[col] || '').toLowerCase();
        return rowVal.includes(val);
      });
    });
  }, [detailData, detailColFilters]);

  const paginatedDetailData = useMemo(() => {
    return filteredDetailData.slice(detailPage * detailRowsPerPage, detailPage * detailRowsPerPage + detailRowsPerPage);
  }, [filteredDetailData, detailPage, detailRowsPerPage]);

  const handleToggleCheck = useCallback((code: string) => {
    setDetailData(prev => prev.map(d => {
      const c = d.LsCTNCod || d.lsCTNCod;
      if (c === code) return { ...d, checked: !d.checked };
      return d;
    }));
  }, []);

  const handleToggleSelectAll = () => {
    const allChecked = detailData.every(d => d.checked);
    setDetailData(detailData.map(d => ({ ...d, checked: !allChecked })));
  };

  const doInspection = (result: string) => {
    if (!canAct) {
      showToast(t('inspection.noPermission', 'Bạn không có quyền thực hiện thao tác này!'), 'error');
      return;
    }
    if (!selectedPO) {
      showToast('Cần chọn PO trước', 'warning');
      return;
    }
    const selectedCTNs = detailData.filter(d => d.checked);
    const count = selectedCTNs.length;

    // Pick CTN / Final Get bắt buộc phải tick ít nhất 1 thùng
    if ((result === 'PickCTN' || result === 'FinalGet') && count === 0) {
      showToast('Vui lòng chọn ít nhất 1 thùng (Checkbox) trước khi bấm ' + (result === 'PickCTN' ? 'Pick CTN' : 'Final Get'), 'warning');
      return;
    }

    // Final Get: phải kiểm tra QA đã Pick CTN chưa (theo logic Xamarin cũ)
    if (result === 'FinalGet') {
      const notPicked = selectedCTNs.filter(c => (c.InsPickCTN || '') !== '*');
      if (notPicked.length > 0) {
        showToast(`Có ${notPicked.length} thùng chưa được QA Pick CTN. Không thể Final Get!`, 'error');
        return;
      }
    }

    const labels: Record<string, string> = { PickCTN: 'Pick CTN', FinalGet: 'Final Get', PASS: 'PASS PO', FAIL: 'FAIL PO' };
    let msg = '';
    if (result === 'PickCTN' || result === 'FinalGet') {
      const field = result === 'PickCTN' ? 'InsPickCTN' : 'CTNGetInspt';
      const alreadyDone = selectedCTNs.filter(c => (c[field] === '*' || c.InsPickCTN === '*' && result === 'PickCTN') || (c.CTNGetInspt === '*' && result === 'FinalGet'));
      const notDone = count - alreadyDone.length;
      msg = `Xác nhận Toggle ${labels[result]} cho ${count} thùng đã chọn?\n(${notDone} thùng sẽ được đánh dấu, ${alreadyDone.length} thùng sẽ bị huỷ dấu)`;
    } else {
      msg = count > 0
        ? `Xác nhận ${labels[result] || result} cho ${count} thùng đã chọn?`
        : `Xác nhận ${labels[result] || result} cho toàn bộ PO ${selectedPO.PONo}?`;
    }
    setConfirmAction(result);
    setConfirmMsg(msg);
    setConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    setConfirmOpen(false);
    if (!confirmAction || !selectedPO) return;
    const selectedCTNs = detailData.filter(d => d.checked);
    const isFullPO = selectedCTNs.length === 0;
    const payload = {
      poNo: selectedPO.PONo,
      pkListRef: selectedPO.PkListRef,
      result: confirmAction,
      isFullPO: isFullPO,
      ctnList: isFullPO ? [] : selectedCTNs.map(c => c.LsCTNCod),
      inspector: authService.getUserInfo().employeeName
    };
    setSubmittingQA(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/inspection/submit-qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        showToast('Mô phỏng: Cập nhật ' + confirmAction + ' thành công cho ' + (isFullPO ? 'Toàn bộ PO' : 'Các thùng đã chọn'), 'success');
      } else {
        showToast('Cập nhật ' + confirmAction + ' thành công', 'success');
      }
      await loadDetails(selectedPO);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSubmittingQA(false);
      setConfirmAction(null);
    }
  };

  // === Final Comment ===
  const openComment = async () => {
    if (!selectedPO) { showToast('Cần chọn PO trước', 'warning'); return; }
    setCmtLoading(true); setCmtOpen(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/inspection/final-comment?poNo=${selectedPO.PONo}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setCmtFinalStatus(d.Final || d.finalStatus || ''); setCmtComment(d.Comment1 || d.comment || ''); }
      else { setCmtFinalStatus(''); setCmtComment(''); }
    } catch { setCmtFinalStatus(''); setCmtComment(''); }
    finally { setCmtLoading(false); }
  };

  const saveComment = async () => {
    if (!selectedPO) return;
    setCmtLoading(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/inspection/final-comment`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ poNo: selectedPO.PONo, finalStatus: cmtFinalStatus, comment: cmtComment }) });
      showToast('Lưu Comment thành công!', 'success'); setCmtOpen(false);
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setCmtLoading(false); }
  };

  return (
    <Paper elevation={0} sx={{ 
      p: 1, bgcolor: 'transparent', flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      animation: 'fadeIn 0.6s ease-out forwards',
      '@keyframes fadeIn': {
        '0%': { opacity: 0, transform: 'translateY(10px)' },
        '100%': { opacity: 1, transform: 'translateY(0)' }
      }
    }}>
      {/* Loading Progress Bar */}
      {(loading || loadingDetail) && (
        <LinearProgress 
          sx={{ 
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, 
            height: 3, bgcolor: 'rgba(46, 125, 50, 0.1)',
            '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #2e7d32, #4caf50)' }
          }} 
        />
      )}
      
      {/* 1. Header Grid Row */}
      <Paper elevation={0} sx={{ 
        p: '6px 12px', borderRadius: 2.5, mb: 1, border: '1px solid #e2e8f0', 
        background: 'linear-gradient(135deg, #f8faf8 0%, #ffffff 100%)',
        display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'nowrap', flexShrink: 0
      }}>


        {/* Scrollable Filters Section */}
        <Box sx={{ 
          flex: '1 1 0px', minWidth: 0, 
          display: 'flex', alignItems: 'center', gap: 1, 
          overflowX: 'auto', py: 0.5,
          '&::-webkit-scrollbar': { height: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 10 }
        }}>
          <Button size="small" variant={filterMode === 'All' ? 'contained' : 'outlined'} onClick={() => applyFilter('All')} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, height: 32, fontSize: '0.8rem', minWidth: 'fit-content', px: 1.5 }}>No Filter</Button>
          <Button size="small" variant={filterMode === 'WaitingFinal' ? 'contained' : 'outlined'} onClick={() => applyFilter('WaitingFinal')} color="info" sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, height: 32, fontSize: '0.8rem', minWidth: 'fit-content', px: 1.5 }}>Wait Final</Button>
          <Button size="small" variant={filterMode === 'MissCTN' ? 'contained' : 'outlined'} onClick={() => applyFilter('MissCTN')} color="warning" sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, height: 32, fontSize: '0.8rem', minWidth: 'fit-content', px: 1.5 }}>Miss CTN</Button>
          <Button size="small" variant={filterMode === 'Pending' ? 'contained' : 'outlined'} onClick={() => applyFilter('Pending')} color="secondary" sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, height: 32, fontSize: '0.8rem', minWidth: 'fit-content', px: 1.5 }}>Pending</Button>
          <Button size="small" variant={filterMode === 'NotPick' ? 'contained' : 'outlined'} onClick={() => applyFilter('NotPick')} color="error" sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, height: 32, fontSize: '0.8rem', minWidth: 'fit-content', px: 1.5 }}>No Pick</Button>
        </Box>

        {/* Search & Actions Section */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0, borderLeft: '1px solid #e2e8f0', pl: 2 }}>
          <Select size="small" value={dateOrPkNo} onChange={e => setDateOrPkNo(e.target.value)}
            sx={{ width: 100, borderRadius: 1.5, height: 32, fontSize: '0.8rem', bgcolor: '#fff' }}>
            <MenuItem value="Date">By Date</MenuItem>
            <MenuItem value="PLNo">By PL No</MenuItem>
          </Select>
          <TextField 
            size="small" placeholder="Find PO..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }}
            sx={{ width: { xs: 100, sm: 160, md: 200 }, '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem', bgcolor: '#fff' } }}
          />
          <Button variant="contained" disableElevation onClick={handleSearch}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <SearchIcon sx={{ fontSize: '18px !important' }} />}
            sx={{ borderRadius: 1.5, fontWeight: 700, height: 32, px: 2.5, fontSize: '0.8rem', textTransform: 'none', background: 'linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)' }}>
            {loading ? '...' : 'Tìm Kiếm'}
          </Button>
          <IconButton onClick={() => { setSearchTerm(''); handleSearch(); }} sx={{ width: 32, height: 32, border: '1px solid #cbd5e1', borderRadius: 1.5, bgcolor: '#fff' }}>
            <RefreshIcon sx={{ fontSize: 16, color: '#64748b' }} />
          </IconButton>
        </Box>
      </Paper>

      {/* Main Split Layout */}
      <Grid container spacing={2} sx={{ flexGrow: 1, height: '0', pb: 1, overflowY: { xs: 'auto', md: 'visible' } }}>
        
        {/* Left Side: Packing List */}
        <Grid size={{ xs: 12, md: 5, lg: 5 }} sx={{ height: { xs: 'auto', md: '100%' }, display: 'flex', flexDirection: 'column' }}>
        <Paper elevation={0} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2, border: '1px solid #e0e0e0', minHeight: 0, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: '#f5f5f5', p: 1, borderBottom: '1px solid #e0e0e0', fontWeight: 600, flexShrink: 0 }}>
            Packing List ({filteredData.length})
          </Box>
          {loading && <LinearProgress sx={{ height: 3 }} />}
          <TableContainer sx={{ flexGrow: 1, overflow: 'auto', minHeight: 0, position: 'relative' }}>
            <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { fontSize: { xs: '0.7rem', lg: '11px' }, py: { xs: 0.2, lg: 0.5 }, px: { xs: 0.6, lg: 0.8 } } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ backgroundColor: '#e8f5e9', fontWeight: 700, whiteSpace: 'nowrap', p: 1, top: 0, zIndex: 10 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>PL Ref <IconButton size="small" sx={{ p: 0.5, color: colFilters.PkListRef ? '#2e7d32' : '#9ca3af' }} onClick={(e) => handleFilterClick(e, 'main', 'PkListRef', 'PL Ref')}>{colFilters.PkListRef ? <FilterAltIcon fontSize="small" /> : <FilterAltOutlinedIcon fontSize="small" />}</IconButton></Box>
                  </TableCell>
                  <TableCell sx={{ backgroundColor: '#e8f5e9', fontWeight: 700, whiteSpace: 'nowrap', p: 1, top: 0, zIndex: 10 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>PO No <IconButton size="small" sx={{ p: 0.5, color: colFilters.PONo ? '#2e7d32' : '#9ca3af' }} onClick={(e) => handleFilterClick(e, 'main', 'PONo', 'PO No')}>{colFilters.PONo ? <FilterAltIcon fontSize="small" /> : <FilterAltOutlinedIcon fontSize="small" />}</IconButton></Box>
                  </TableCell>
                  <TableCell sx={{ backgroundColor: '#e8f5e9', fontWeight: 700, whiteSpace: 'nowrap', p: 1, top: 0, zIndex: 10 }} align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>Req Qty</Box>
                  </TableCell>
                  <TableCell sx={{ backgroundColor: '#e8f5e9', fontWeight: 700, whiteSpace: 'nowrap', p: 1, top: 0, zIndex: 10 }} align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>Compl %</Box>
                  </TableCell>
                  <TableCell sx={{ backgroundColor: '#e8f5e9', fontWeight: 700, whiteSpace: 'nowrap', p: 1, top: 0, zIndex: 10 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>Date <IconButton size="small" sx={{ p: 0.5, color: colFilters.Date ? '#2e7d32' : '#9ca3af' }} onClick={(e) => handleFilterClick(e, 'main', 'Date', 'Date')}>{colFilters.Date ? <FilterAltIcon fontSize="small" /> : <FilterAltOutlinedIcon fontSize="small" />}</IconButton></Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody key={`main-page-${page}`} sx={{ animation: 'tablePageFade 0.35s ease-out', '@keyframes tablePageFade': { '0%': { opacity: 0.3 }, '100%': { opacity: 1 } } }}>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton variant="text" width="80%" animation="wave" /></TableCell>
                      <TableCell><Skeleton variant="text" width="60%" animation="wave" /></TableCell>
                      <TableCell><Skeleton variant="rectangular" width="40%" height={16} sx={{ ml: 'auto', borderRadius: 1 }} animation="wave" /></TableCell>
                      <TableCell><Skeleton variant="rectangular" width="30%" height={16} sx={{ ml: 'auto', borderRadius: 4 }} animation="wave" /></TableCell>
                      <TableCell><Skeleton variant="text" width="70%" animation="wave" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  paginatedData.map((row, i) => (
                    <TableRow 
                      key={i} hover selected={selectedPO?.PONo === row.PONo} onClick={() => loadDetails(row)}
                      sx={{ cursor: 'pointer', '&.Mui-selected': { bgcolor: 'rgba(46,125,50,0.1)' } }}
                    >
                      <TableCell>{row.PkListRef}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{row.PONo}</TableCell>
                      <TableCell align="right">{row.ReqQty}</TableCell>
                      <TableCell align="right">
                        <Chip size="small" label={`${row.Compl}%`} color={row.Compl >= 100 ? 'success' : 'warning'} />
                      </TableCell>
                      <TableCell>{row.Date}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ flexShrink: 0, p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa', borderTop: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>Dòng / trang:</Typography>
              <Select
                size="small"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(0);
                }}
                sx={{ height: 32, fontSize: '0.875rem', bgcolor: '#fff' }}
              >
                {[50, 100, 250].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </Select>
            </Box>
            <Pagination
              count={Math.ceil(filteredData.length / rowsPerPage) || 1}
              page={page + 1}
              onChange={(_, newPage) => setPage(newPage - 1)}
              shape="rounded"
              boundaryCount={1}
              siblingCount={0}
              size="small"
              sx={{ '& .MuiPaginationItem-root.Mui-selected': { bgcolor: '#2e7d32', color: '#fff' } }}
            />
          </Box>
        </Paper>
        </Grid>

        {/* Right Side: CTN Details */}
        <Grid size={{ xs: 12, md: 7, lg: 7 }} sx={{ height: { xs: 'auto', md: '100%' }, display: 'flex', flexDirection: 'column' }}>
        <Paper elevation={0} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2, border: '1px solid #e0e0e0', minHeight: 0, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: '#f5f5f5', p: 1, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Carton Details {selectedPO ? `- PO: ${selectedPO.PONo}` : ''}
            </Typography>
            <Box>
              {canAct ? (
                <>
                  {canPickCTN && <Button size="small" color="info" variant="contained" sx={{ mr: 1 }} onClick={() => doInspection('PickCTN')} startIcon={<CheckCircleIcon/>}>Pick CTN</Button>}
                  {canFinalGet && <Button size="small" color="warning" variant="contained" sx={{ mr: 1 }} onClick={() => doInspection('FinalGet')} startIcon={<CheckCircleIcon/>}>Final Get</Button>}
                  {hasQAAction && (
                    <>
                      <Button size="small" color="success" variant="contained" sx={{ mr: 1 }} onClick={() => doInspection('PASS')} startIcon={<CheckCircleIcon/>}>PASS PO</Button>
                      <Button size="small" color="error" variant="contained" sx={{ mr: 1 }} onClick={() => doInspection('FAIL')} startIcon={<CancelIcon/>}>FAIL PO</Button>
                    </>
                  )}
                  <Button size="small" variant="outlined" sx={{ ml: 0.5 }} onClick={openComment} startIcon={<AssignmentIcon/>}>Comment</Button>
                </>
              ) : (
                <Chip size="small" label="Chỉ xem (View Only)" color="default" sx={{ fontWeight: 600 }} />
              )}
            </Box>
          </Box>
          <TableContainer sx={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}>
            <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { fontSize: { xs: '0.7rem', lg: '11px' }, py: { xs: 0.2, lg: 0.5 }, px: { xs: 0.6, lg: 0.8 } } }}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ backgroundColor: '#f0f4ff', top: 0, zIndex: 10, width: 32, p: 0, textAlign: 'center' }}>
                      <Checkbox size="small" disabled={!canAct} onChange={handleToggleSelectAll} sx={{ p: 0.5 }} />
                    </TableCell>
                    <TableCell sx={{ backgroundColor: '#f0f4ff', fontWeight: 700, whiteSpace: 'nowrap', p: 1, top: 0, zIndex: 10 }}>
                      CTN Barcode
                    </TableCell>
                    <TableCell sx={{ backgroundColor: '#f0f4ff', fontWeight: 700, whiteSpace: 'nowrap', p: 1, top: 0, zIndex: 10 }}>
                      CTN No
                    </TableCell>
                    <TableCell sx={{ backgroundColor: '#f0f4ff', fontWeight: 700, whiteSpace: 'nowrap', p: 1, top: 0, zIndex: 10 }}>
                      Size
                    </TableCell>

                    <TableCell sx={{ backgroundColor: '#f0f4ff', fontWeight: 700, whiteSpace: 'nowrap', p: 1, top: 0, zIndex: 10 }} align="center">
                      Pick CTN
                    </TableCell>
                    <TableCell sx={{ backgroundColor: '#f0f4ff', fontWeight: 700, whiteSpace: 'nowrap', p: 1, top: 0, zIndex: 10 }} align="center">
                      Final Get
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody key={`detail-page-${detailPage}`} sx={{ animation: 'tablePageFade 0.35s ease-out', '@keyframes tablePageFade': { '0%': { opacity: 0.3 }, '100%': { opacity: 1 } } }}>
                  {loadingDetail ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={`detail-skeleton-${i}`}>
                        <TableCell padding="checkbox"><Skeleton variant="circular" width={24} height={24} animation="wave" /></TableCell>
                        <TableCell><Skeleton variant="text" width="90%" animation="wave" /></TableCell>
                        <TableCell><Skeleton variant="text" width="40%" animation="wave" /></TableCell>
                        <TableCell><Skeleton variant="text" width="60%" animation="wave" /></TableCell>
                        <TableCell align="center"><Skeleton variant="circular" width={20} height={20} animation="wave" sx={{ mx: 'auto' }} /></TableCell>
                        <TableCell align="center"><Skeleton variant="circular" width={20} height={20} animation="wave" sx={{ mx: 'auto' }} /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <>
                      {paginatedDetailData.map((row) => {
                        const code = row.LsCTNCod || row.lsCTNCod;
                        return (
                          <CartonDetailRow 
                            key={code}
                            row={row} 
                            hasQAAction={canAct} 
                            handleToggleCheck={handleToggleCheck} 
                          />
                        );
                      })}
                      {detailData.length === 0 && !selectedPO && !loadingDetail && (
                        <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, color: '#999' }}>Vui lòng chọn 1 PO bên Danh sách để hiển thị tiến độ thùng</TableCell></TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
          </TableContainer>
          {detailData.length > 0 && (
            <Box sx={{ flexShrink: 0, p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa', borderTop: '1px solid #e0e0e0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>Dòng / trang:</Typography>
                <Select
                  size="small"
                  value={detailRowsPerPage}
                  onChange={(e) => {
                    setDetailRowsPerPage(Number(e.target.value));
                    setDetailPage(0);
                  }}
                  sx={{ height: 32, fontSize: '0.875rem', bgcolor: '#fff' }}
                >
                  {[50, 100, 200].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </Select>
              </Box>
              <Pagination
                count={Math.ceil(detailData.length / detailRowsPerPage) || 1}
                page={detailPage + 1}
                onChange={(_, newPage) => setDetailPage(newPage - 1)}
                shape="rounded"
                boundaryCount={1}
                siblingCount={0}
                size="small"
                sx={{ '& .MuiPaginationItem-root.Mui-selected': { bgcolor: '#2e7d32', color: '#fff' } }}
              />
            </Box>
          )}
        </Paper>
        </Grid>
      </Grid>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận thao tác</DialogTitle>
        <DialogContent>
          <Typography>{confirmMsg}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">Hủy</Button>
          <Button onClick={handleConfirmAction} variant="contained" color="primary" autoFocus>Xác nhận</Button>
        </DialogActions>
      </Dialog>

      {/* Final Comment Dialog */}
      <Dialog open={cmtOpen} onClose={() => setCmtOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Final Comment - PO: {selectedPO?.PONo || ''}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          {cmtLoading ? <CircularProgress size={24} sx={{ alignSelf: 'center', my: 2 }} /> : (
            <>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Final Status</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {['NR4Ins', 'F-Ok', 'Get'].map(s => (
                    <Button key={s} size="small" variant={cmtFinalStatus === s ? 'contained' : 'outlined'}
                      color={s === 'NR4Ins' ? 'warning' : s === 'F-Ok' ? 'success' : 'info'}
                      onClick={() => setCmtFinalStatus(cmtFinalStatus === s ? '' : s)}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >{s}</Button>
                  ))}
                </Box>
              </Box>
              <TextField label="Comment" multiline rows={3} fullWidth value={cmtComment} onChange={e => setCmtComment(e.target.value)} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCmtOpen(false)} color="inherit">Đóng</Button>
          <Button onClick={saveComment} variant="contained" color="primary" disabled={cmtLoading}>Lưu</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toastOpen} autoHideDuration={1500} onClose={() => setToastOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToastOpen(false)} severity={toastSeverity} sx={{ width: '100%', fontWeight: 600 }}>{toastMsg}</Alert>
      </Snackbar>

      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, display: 'flex', flexDirection: 'column', gap: 2 }} open={submittingQA}>
        <CircularProgress color="inherit" />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Đang ghi nhận đánh giá (QA)...</Typography>
      </Backdrop>

      <Popover open={Boolean(filterAnchorEl)} anchorEl={filterAnchorEl} onClose={handleFilterClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { p: 1.5, width: 240, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' } }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
          Lọc Cột: {currentFilterCol?.label}
        </Typography>
        <TextField autoFocus fullWidth size="small" placeholder="Giá trị lọc..."
          value={currentFilterCol?.table === 'main' ? colFilters[currentFilterCol.colName] || '' : detailColFilters[currentFilterCol?.colName || ''] || ''}
          onChange={(e) => {
            if (currentFilterCol?.table === 'main') setColFilters({ ...colFilters, [currentFilterCol.colName]: e.target.value });
            else if (currentFilterCol?.table === 'detail') setDetailColFilters({ ...detailColFilters, [currentFilterCol.colName]: e.target.value });
            setPage(0); setDetailPage(0);
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 }, mb: 1.5 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button size="small" variant="text" color="inherit" onClick={() => {
            if (currentFilterCol?.table === 'main') setColFilters({ ...colFilters, [currentFilterCol.colName]: '' });
            else if (currentFilterCol?.table === 'detail') setDetailColFilters({ ...detailColFilters, [currentFilterCol.colName]: '' });
            handleFilterClose();
          }}>Xoá Bộ Lọc (Clear)</Button>
        </Box>
      </Popover>
    </Paper>
  );
}

