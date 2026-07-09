import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Box, 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  InputAdornment,
  Pagination,
  TextField,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  Button,
  Chip
} from '@mui/material';
import { 
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  Print as PrintIcon,
  ImportExport as ExportIcon,
  Assessment as ReportIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useToast, factoryPermissionService } from '@traxeco/shared';

// Mock report data for Social Insurance
const MOCK_INSURANCE_REPORTS = [
  { stt: 1, employeeId: '12700481', fullName: 'Trần Thị Mai', dept: 'May 1', pos: 'Công nhân', sickGroup: 'Bệnh hô hấp', sickName: 'Viêm họng hạt cấp', insCode: 'CD01', insName: 'Ốm đau thông thường', insType: 'Ngắn ngày', docType: 'Giấy chứng nhận nghỉ BHXH', leaveType: 'Điều trị ngoại trú', from: '2026-07-02', to: '2026-07-04', days: 3, createdBy: 'BS. Lê Minh' },
  { stt: 2, employeeId: '12700982', fullName: 'Phạm Văn Nam', dept: 'May 3', pos: 'Tổ trưởng', sickGroup: 'Nhi khoa', sickName: 'Con ốm sốt siêu vi', insCode: 'CD03', insName: 'Con ốm đau dưới 7t', insType: 'Ngắn ngày', docType: 'Giấy khai sinh / BHXH con', leaveType: 'Ngoại trú chăm con', from: '2026-07-01', to: '2026-07-03', days: 3, createdBy: 'Y tá Nguyễn Hoa' }
];

// Mock report data for Early Leaving
const MOCK_EARLY_LEAVING_REPORTS = [
  { stt: 1, employeeId: '12700123', fullName: 'Lê Thị Út', dept: 'Cắt 2', pos: 'Công nhân', sickness: 'Đau đầu dữ dội', leaveTime: '04/07/2026 10:15', hasMed: 'Có phát thuốc', doctor: 'Y tá Nguyễn Hoa', createdBy: 'Y tá Nguyễn Hoa' },
  { stt: 2, employeeId: '12700556', fullName: 'Trần Văn Tiến', dept: 'May 5', pos: 'Công nhân', sickness: 'Đau bụng / Buồn nôn', leaveTime: '04/07/2026 11:30', hasMed: 'Không', doctor: 'BS. Lê Minh', createdBy: 'BS. Lê Minh' }
];

// Mock report data for Maternity
const MOCK_MATERNITY_REPORTS = [
  { stt: 1, employeeId: '12700234', fullName: 'Nguyễn Thị Hoa', dept: 'Kiểm hàng', pos: 'QC', maternityType: 'Khám thai định kỳ', fromDate: '2026-07-02', toDate: '2026-07-02', totalDays: 1, docType: 'Giấy chứng nhận BHXH', createdBy: 'Y tá Nguyễn Hoa' },
  { stt: 2, employeeId: '12700678', fullName: 'Đỗ Thị Hạnh', dept: 'May 2', pos: 'Công nhân', maternityType: 'Nghỉ sinh con (6 tháng)', fromDate: '2026-06-15', toDate: '2026-12-15', totalDays: 180, docType: 'Giấy khai sinh con', createdBy: 'BS. Lê Minh' }
];

export default function ReportPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState(0);

  // Filter states
  const [fromDate, setFromDate] = useState(() => {
    const today = new Date();
    today.setDate(1); // Default to first day of the month
    return today.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFactory, setSelectedFactory] = useState('Tất cả');
  const [userFactories, setUserFactories] = useState<{ all: boolean; factories: string[] }>({ all: true, factories: [] });

  // Fetch factory permissions
  useEffect(() => {
    factoryPermissionService.getMyFactories('CLINIC')
      .then(res => {
        setUserFactories(res);
        if (!res.all && res.factories.length > 0) {
          const list = res.factories.map(f => f.startsWith('Xưởng') ? f : `Xưởng ${f}`);
          if (list.length === 1) {
            setSelectedFactory(list[0]);
          } else {
            setSelectedFactory('Tất cả');
          }
        }
      })
      .catch(err => {
        console.error('Error fetching factory permissions:', err);
      });
  }, []);

  // Loading states
  const [loading, setLoading] = useState(false);

  const factories = useMemo(() => {
    if (userFactories.all) {
      return ['Tất cả', 'Xưởng F1', 'Xưởng F2', 'Xưởng F3', 'Xưởng CT'];
    }
    const list = userFactories.factories.map(f => f.startsWith('Xưởng') ? f : `Xưởng ${f}`);
    if (list.length > 1) {
      return ['Tất cả', ...list];
    }
    return list;
  }, [userFactories]);

  // Handle Load Data
  const handleLoadData = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('Tải dữ liệu báo cáo thành công!', 'success');
    }, 400);
  };

  // Handle Export Excel
  const handleExportExcel = () => {
    showToast('Đang kết xuất tệp Excel báo cáo...', 'info');
    setTimeout(() => {
      showToast('Xuất báo cáo Excel thành công! Đã tải về máy.', 'success');
    }, 800);
  };

  // Filter helper to enforce factory permissions
  const matchesFactory = (deptStr: string) => {
    if (selectedFactory !== 'Tất cả') {
      const cleanSelected = selectedFactory.replace('Xưởng ', '');
      return deptStr.includes(cleanSelected);
    }
    if (!userFactories.all) {
      return userFactories.factories.some(f => {
        const cleanF = f.replace('Xưởng ', '');
        return deptStr.includes(cleanF);
      });
    }
    return true;
  };

  // Filter logic for grids
  const filteredInsurance = useMemo(() => {
    return MOCK_INSURANCE_REPORTS.filter(r => {
      if (!matchesFactory(r.dept)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return r.fullName.toLowerCase().includes(q) || r.employeeId.includes(q);
      }
      return true;
    });
  }, [searchQuery, selectedFactory, userFactories]);

  const filteredEarlyLeaving = useMemo(() => {
    return MOCK_EARLY_LEAVING_REPORTS.filter(r => {
      if (!matchesFactory(r.dept)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return r.fullName.toLowerCase().includes(q) || r.employeeId.includes(q);
      }
      return true;
    });
  }, [searchQuery, selectedFactory, userFactories]);

  const filteredMaternity = useMemo(() => {
    return MOCK_MATERNITY_REPORTS.filter(r => {
      if (!matchesFactory(r.dept)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return r.fullName.toLowerCase().includes(q) || r.employeeId.includes(q);
      }
      return true;
    });
  }, [searchQuery, selectedFactory, userFactories]);

  return (
    <Box sx={{ 
      flexGrow: 1, 
      width: '100%', 
      height: '100%', 
      minWidth: 0, 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden',
      p: 0.5,
      pt: 1,
      pb: 1,
      gap: 1
    }}>
      {/* ─── DYNAMICALLY IMPORT GOOGLE FONTS ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap');
        
        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          filter: invert(30%) sepia(80%) saturate(500%) hue-rotate(90deg) brightness(90%) contrast(90%);
        }
      `}</style>

      {/* FILTER TOOLBAR CARD */}
      <Paper elevation={0} sx={{ 
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        p: 1.5,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1.5,
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: '#ffffff',
        flexShrink: 0
      }}>
        {/* Date Filters & Selectors */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Factory Selector */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>Nhà xưởng</Typography>
            <Select
              size="small"
              value={selectedFactory}
              onChange={(e) => setSelectedFactory(e.target.value)}
              sx={{ height: 30, fontSize: '12px', fontWeight: 700, borderRadius: '6px', width: 110, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' } }}
            >
              {factories.map(fac => <MenuItem key={fac} value={fac} sx={{ fontSize: '12px', fontWeight: 700 }}>{fac}</MenuItem>)}
            </Select>
          </Box>

          {/* From Date */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>Từ ngày</Typography>
            <TextField
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              size="small"
              sx={{
                width: 135,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '6px',
                  height: 30,
                  fontSize: '11.5px',
                  fontWeight: 750,
                  color: '#334155',
                  '& fieldset': { borderColor: '#cbd5e1' }
                },
                '& .MuiInputBase-input': { py: 0.5, px: 1 }
              }}
            />
          </Box>

          {/* To Date */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>Đến ngày</Typography>
            <TextField
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              size="small"
              sx={{
                width: 135,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '6px',
                  height: 30,
                  fontSize: '11.5px',
                  fontWeight: 750,
                  color: '#334155',
                  '& fieldset': { borderColor: '#cbd5e1' }
                },
                '& .MuiInputBase-input': { py: 0.5, px: 1 }
              }}
            />
          </Box>

          {/* Search Query */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>Tìm kiếm nhanh</Typography>
            <TextField
              placeholder="Tên / ID..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                width: 130,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '6px',
                  height: 30,
                  fontSize: '11.5px',
                  fontWeight: 700,
                  bgcolor: '#ffffff',
                  '& fieldset': { borderColor: '#cbd5e1' }
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                  </InputAdornment>
                )
              }}
            />
          </Box>
        </Box>

        {/* Load & Export Buttons */}
        <Box sx={{ display: 'flex', gap: 1, pt: 1.5 }}>
          <Button
            variant="outlined"
            onClick={handleLoadData}
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            sx={{
              height: 32,
              fontSize: '12px',
              fontWeight: 800,
              textTransform: 'none',
              borderRadius: '6px',
              borderColor: '#cbd5e1',
              color: '#475569',
              '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' }
            }}
          >
            Tải dữ liệu
          </Button>
          <Button
            variant="contained"
            onClick={handleExportExcel}
            startIcon={<ExportIcon sx={{ fontSize: 16 }} />}
            sx={{
              height: 32,
              fontSize: '12px',
              fontWeight: 800,
              textTransform: 'none',
              borderRadius: '6px',
              bgcolor: '#15803d',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#166534', boxShadow: 'none' }
            }}
          >
            Xuất Excel
          </Button>
        </Box>
      </Paper>

      {/* TABS SELECTION FOR REPORT TYPES */}
      <Box sx={{ borderBottom: '1px solid #cbd5e1', flexShrink: 0 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            minHeight: 0,
            '& .MuiTabs-indicator': { bgcolor: '#15803d' },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '13px',
              color: '#64748b',
              minHeight: 38,
              py: 0.75,
              '&.Mui-selected': { color: '#15803d' }
            }
          }}
        >
          <Tab label="Báo cáo Bảo hiểm Xã hội (BHXH)" />
          <Tab label="Báo cáo Công nhân Về sớm" />
          <Tab label="Báo cáo Chế độ Thai sản" />
        </Tabs>
      </Box>

      {/* REPORT CONTENT VIEW - Stretched Paper */}
      <Paper elevation={0} sx={{ 
        flexGrow: 1,
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: '#fff',
        height: 'calc(100vh - 170px)'
      }}>
        <TableContainer sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
          
          {/* TAB 0: SOCIAL INSURANCE REPORT */}
          {activeTab === 0 && (
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>STT</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Nhân viên</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Bệnh lý & Chẩn đoán</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Chế độ BHXH</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }} align="center">Nghỉ từ</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }} align="center">Nghỉ đến</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }} align="center">Số ngày</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Người lập</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInsurance.map((r) => (
                  <TableRow key={r.stt} hover>
                    <TableCell sx={{ py: 1.25, px: 2, fontSize: '12px', fontWeight: 700 }}>{r.stt}</TableCell>
                    <TableCell sx={{ py: 1.25, px: 2 }}>
                      <Typography sx={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 800 }}>{r.fullName}</Typography>
                      <Typography sx={{ fontSize: '10.5px', color: 'text.secondary', fontWeight: 650 }}>ID: {r.employeeId}</Typography>
                      <Typography sx={{ fontSize: '10.5px', color: '#64748b' }}>{r.dept} | {r.pos}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.25, px: 2, fontSize: '12.5px', color: '#334155', fontWeight: 700 }}>{r.sickName}</TableCell>
                    <TableCell sx={{ py: 1.25, px: 2 }}>
                      <Chip label={r.insName} size="small" sx={{ height: 20, fontSize: '10px', fontWeight: 800, bgcolor: '#e8f5e9', color: '#15803d', borderRadius: '4px' }} />
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.25, px: 2, fontSize: '12px', fontWeight: 700 }}>{new Date(r.from).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell align="center" sx={{ py: 1.25, px: 2, fontSize: '12px', fontWeight: 700 }}>{new Date(r.to).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell align="center" sx={{ py: 1.25, px: 2, fontSize: '12.5px', fontWeight: 900, color: '#15803d' }}>{r.days}</TableCell>
                    <TableCell sx={{ py: 1.25, px: 2, fontSize: '12px', fontWeight: 700, color: '#475569' }}>{r.createdBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* TAB 1: EARLY LEAVING REPORT */}
          {activeTab === 1 && (
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>STT</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Nhân viên</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Triệu chứng / Lý do về</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }} align="center">Giờ cho về</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Thuốc mang về</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Người lập</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEarlyLeaving.map((r) => (
                  <TableRow key={r.stt} hover>
                    <TableCell sx={{ py: 1.25, px: 2, fontSize: '12px', fontWeight: 700 }}>{r.stt}</TableCell>
                    <TableCell sx={{ py: 1.25, px: 2 }}>
                      <Typography sx={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 800 }}>{r.fullName}</Typography>
                      <Typography sx={{ fontSize: '10.5px', color: 'text.secondary', fontWeight: 650 }}>ID: {r.employeeId}</Typography>
                      <Typography sx={{ fontSize: '10.5px', color: '#64748b' }}>{r.dept} | {r.pos}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.25, px: 2, fontSize: '12.5px', color: '#334155', fontWeight: 700 }}>{r.sickness}</TableCell>
                    <TableCell align="center" sx={{ py: 1.25, px: 2, fontSize: '12.5px', color: '#0f172a', fontWeight: 800 }}>{r.leaveTime}</TableCell>
                    <TableCell sx={{ py: 1.25, px: 2 }}>
                      <Chip 
                        label={r.hasMed} 
                        size="small" 
                        sx={{ 
                          height: 20, 
                          fontSize: '10px', 
                          fontWeight: 800, 
                          bgcolor: r.hasMed === 'Có phát thuốc' ? '#e8f5e9' : '#f1f5f9', 
                          color: r.hasMed === 'Có phát thuốc' ? '#15803d' : '#475569', 
                          borderRadius: '4px' 
                        }} 
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.25, px: 2, fontSize: '12px', fontWeight: 700, color: '#475569' }}>{r.createdBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* TAB 2: MATERNITY REPORT */}
          {activeTab === 2 && (
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>STT</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Nhân viên</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Chế độ Thai sản</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }} align="center">Từ ngày</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }} align="center">Đến ngày</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }} align="center">Số ngày nghỉ</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Người lập</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMaternity.map((r) => (
                  <TableRow key={r.stt} hover>
                    <TableCell sx={{ py: 1.25, px: 2, fontSize: '12px', fontWeight: 700 }}>{r.stt}</TableCell>
                    <TableCell sx={{ py: 1.25, px: 2 }}>
                      <Typography sx={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 800 }}>{r.fullName}</Typography>
                      <Typography sx={{ fontSize: '10.5px', color: 'text.secondary', fontWeight: 650 }}>ID: {r.employeeId}</Typography>
                      <Typography sx={{ fontSize: '10.5px', color: '#64748b' }}>{r.dept} | {r.pos}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.25, px: 2, fontSize: '12.5px', color: '#334155', fontWeight: 700 }}>{r.maternityType}</TableCell>
                    <TableCell align="center" sx={{ py: 1.25, px: 2, fontSize: '12px', fontWeight: 700 }}>{new Date(r.fromDate).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell align="center" sx={{ py: 1.25, px: 2, fontSize: '12px', fontWeight: 700 }}>{new Date(r.toDate).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell align="center" sx={{ py: 1.25, px: 2, fontSize: '12.5px', fontWeight: 900, color: '#15803d' }}>{r.totalDays}</TableCell>
                    <TableCell sx={{ py: 1.25, px: 2, fontSize: '12px', fontWeight: 700, color: '#475569' }}>{r.createdBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

        </TableContainer>

        {/* TCC Pagination style under the table */}
        <Box sx={{ 
          borderTop: '1px solid #e2e8f0', 
          backgroundColor: '#f8fafc', 
          p: 1.25, 
          px: 3,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: 2, 
          borderRadius: '0 0 8px 8px',
          flexShrink: 0
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#475569', fontWeight: 800, fontSize: '12.5px' }}>Số dòng:</Typography>
            <Select
              size="small"
              value={5}
              disabled
              sx={{ 
                height: 30, 
                fontSize: '12.5px', 
                fontWeight: 700, 
                backgroundColor: '#fff',
                borderRadius: '6px',
                width: 65,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' }
              }}
            >
              <MenuItem value={5}>5</MenuItem>
            </Select>
            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 700, fontSize: '12.5px', ml: 1 }}>
              1-2 trong 2
            </Typography>
          </Box>
          <Pagination
            count={1}
            page={1}
            disabled
            shape="rounded"
            showFirstButton
            showLastButton
            size="small"
            sx={{ 
              '& .MuiPaginationItem-root': { fontWeight: 800, borderRadius: '6px' },
              '& .MuiPaginationItem-root.Mui-selected': { bgcolor: '#15803d', color: '#fff' }
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
}
