import React, { useState, useMemo } from 'react';
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
  Chip,
  FormControlLabel,
  Switch,
  Tooltip,
  IconButton,
  Button
} from '@mui/material';
import { 
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  AssignmentTurnedIn as ApproveIcon,
  Print as PrintIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  LocalHospital as HospitalIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useToast, AppTextField } from '@traxeco/shared';

interface EarlyLeavingRecord {
  id: number;
  employeeId: string;
  fullName: string;
  factory: string;
  dept: string;
  line: string;
  sickness: string;
  leavingTime: string;
  hasMedicine: boolean;
  doctorInCharge: string;
  status: 'Approved' | 'Pending';
}

const INITIAL_RECORDS: EarlyLeavingRecord[] = [
  {
    id: 1,
    employeeId: '12700481',
    fullName: 'Trần Thị Mai',
    factory: 'Xưởng F2',
    dept: 'May 1',
    line: 'Line 05',
    sickness: 'Đau đầu / Sốt cao 38.5 độ',
    leavingTime: '04/07/2026 10:15:00',
    hasMedicine: true,
    doctorInCharge: 'BS. Lê Minh',
    status: 'Approved'
  },
  {
    id: 2,
    employeeId: '12700982',
    fullName: 'Phạm Văn Nam',
    factory: 'Xưởng F2',
    dept: 'May 3',
    line: 'Line 12',
    sickness: 'Chấn thương nhẹ cổ tay',
    leavingTime: '04/07/2026 09:30:00',
    hasMedicine: false,
    doctorInCharge: 'Y tá Nguyễn Hoa',
    status: 'Approved'
  }
];

export default function EarlyLeavingPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showToast } = useToast();

  // Search employee state
  const [searchCode, setSearchCode] = useState('');
  const [foundEmployee, setFoundEmployee] = useState<any>(null);

  const loggedInUser = useMemo(() => {
    return localStorage.getItem('employeeName') || localStorage.getItem('username') || 'Y tá Nguyễn Hoa';
  }, []);

  // Form states
  const [sickness, setSickness] = useState('');
  const [leavingTime, setLeavingTime] = useState('');
  const [doctorInCharge, setDoctorInCharge] = useState(loggedInUser);
  const [hasMedicine, setHasMedicine] = useState(false);

  // Filter states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Records state
  const [records, setRecords] = useState<EarlyLeavingRecord[]>(INITIAL_RECORDS);

  // Factory check
  const activeFactory = useMemo(() => {
    const userFactoryRaw = localStorage.getItem('factory') || '';
    if (userFactoryRaw.includes('F1')) return 'Xưởng F1';
    if (userFactoryRaw.includes('F2')) return 'Xưởng F2';
    if (userFactoryRaw.includes('F3')) return 'Xưởng F3';
    if (userFactoryRaw.includes('CT')) return 'Xưởng CT';
    return 'Tất cả';
  }, []);

  const isRestricted = useMemo(() => {
    const userFactoryRaw = localStorage.getItem('factory') || '';
    const roleLevel = Number(localStorage.getItem('roleLevel') || '99');
    const isSuperAdmin = localStorage.getItem('isSuperAdmin') === 'true';
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const isPowerUser = isSuperAdmin || isAdmin || roleLevel <= 2;
    return !isPowerUser && !!userFactoryRaw && (
      userFactoryRaw.includes('F1') ||
      userFactoryRaw.includes('F2') ||
      userFactoryRaw.includes('F3') ||
      userFactoryRaw.includes('CT')
    );
  }, []);

  // Handle employee search mock
  const handleSearchEmployee = () => {
    if (!searchCode.trim()) {
      showToast('Vui lòng nhập mã nhân viên', 'warning');
      return;
    }
    // Mock response
    setFoundEmployee({
      employeeId: searchCode,
      fullName: searchCode === '123' ? 'Lê Thị Út' : 'Nguyễn Văn Minh',
      factory: activeFactory === 'Tất cả' ? 'Xưởng F2' : activeFactory,
      dept: 'May Mặc',
      line: 'Line 08'
    });
    setLeavingTime(new Date().toLocaleString('vi-VN'));
    showToast('Tìm thấy thông tin nhân viên!', 'success');
  };

  // Handle Save
  const handleSaveRecord = () => {
    if (!foundEmployee) {
      showToast('Vui lòng nhập và tìm kiếm nhân viên trước', 'warning');
      return;
    }
    if (!sickness.trim()) {
      showToast('Vui lòng ghi rõ triệu chứng / lý do cho về', 'warning');
      return;
    }

    const newRecord: EarlyLeavingRecord = {
      id: Date.now(),
      employeeId: foundEmployee.employeeId,
      fullName: foundEmployee.fullName,
      factory: foundEmployee.factory,
      dept: foundEmployee.dept,
      line: foundEmployee.line,
      sickness,
      leavingTime: leavingTime || new Date().toLocaleString('vi-VN'),
      hasMedicine,
      doctorInCharge,
      status: 'Approved'
    };

    setRecords(prev => [newRecord, ...prev]);
    showToast('Tạo phiếu cho về sớm thành công! Đã tự động in phiếu kiểm cổng.', 'success');
    
    // Reset form
    setFoundEmployee(null);
    setSearchCode('');
    setSickness('');
    setHasMedicine(false);
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Factory restriction
      if (activeFactory !== 'Tất cả' && record.factory !== activeFactory) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        if (!record.fullName.toLowerCase().includes(query) && !record.employeeId.includes(query)) {
          return false;
        }
      }

      // From date
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        const parts = record.leavingTime.split(' ');
        if (parts.length > 0) {
          const dateParts = parts[0].split('/');
          if (dateParts.length === 3) {
            const recDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
            if (recDate < from) return false;
          }
        }
      }

      // To date
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        const parts = record.leavingTime.split(' ');
        if (parts.length > 0) {
          const dateParts = parts[0].split('/');
          if (dateParts.length === 3) {
            const recDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
            if (recDate > to) return false;
          }
        }
      }

      return true;
    });
  }, [records, activeFactory, searchTerm, fromDate, toDate]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredRecords.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredRecords, page, rowsPerPage]);

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
      {/* ─── DYNAMICALLY IMPORT GOOGLE FONTS & WEBKIT STYLES ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        
        /* Clean native datepicker icon */
        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          filter: invert(30%) sepia(80%) saturate(500%) hue-rotate(90deg) brightness(90%) contrast(90%);
        }
      `}</style>

      {/* Main Container Layout - locked height to calc(100vh - 90px) to prevent empty bottom gap */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        gap: 1, 
        alignItems: 'stretch',
        flexGrow: 1,
        minHeight: 0,
        height: isMobile ? 'auto' : 'calc(100vh - 90px)'
      }}>
        
        {/* LEFT COLUMN: Create Slip Form */}
        <Paper elevation={0} sx={{ 
          width: isMobile ? '100%' : '350px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          bgcolor: '#fff',
          flexShrink: 0,
          height: '100%',
          boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)'
        }}>
          <Typography sx={{ fontWeight: 800, fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #f1f5f9', pb: 1, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            <ApproveIcon sx={{ color: '#15803d', fontSize: 16 }} />
            Tạo phiếu cho về sớm
          </Typography>

          {/* Search Employee input (Sleek side-by-side design matching Dispense Page) */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b' }}>Nhập/Quét mã thẻ nhân viên</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder="Nhập mã nhân viên..."
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchEmployee()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                    </InputAdornment>
                  )
                }}
                sx={{
                  flexGrow: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    fontSize: '12.5px',
                    height: 36,
                    '& fieldset': { borderColor: '#cbd5e1' },
                    '&.Mui-focused fieldset': { borderColor: '#15803d' },
                  }
                }}
              />
              <IconButton 
                onClick={handleSearchEmployee}
                sx={{ 
                  bgcolor: '#15803d', 
                  color: '#ffffff', 
                  borderRadius: '6px',
                  width: 36,
                  height: 36,
                  '&:hover': { bgcolor: '#166534' } 
                }}
              >
                <SearchIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Box>
          </Box>

          {/* Found Employee Card info */}
          {foundEmployee ? (
            <Box sx={{ 
              p: 1.5, 
              bgcolor: 'rgba(21,128,61,0.02)', 
              borderRadius: '6px', 
              border: '1px dashed #bbf7d0',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Họ & Tên:</Typography>
                <Typography sx={{ fontSize: '12px', color: '#0f172a', fontWeight: 800 }}>{foundEmployee.fullName}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Mã nhân viên:</Typography>
                <Typography sx={{ fontSize: '12px', color: '#0f172a', fontWeight: 700 }}>#{foundEmployee.employeeId}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Bộ phận:</Typography>
                <Typography sx={{ fontSize: '12px', color: '#334155', fontWeight: 700 }}>{foundEmployee.dept} ({foundEmployee.line})</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Nhà xưởng:</Typography>
                <Typography sx={{ fontSize: '12px', color: '#15803d', fontWeight: 800 }}>{foundEmployee.factory}</Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ 
              p: 2, 
              bgcolor: '#f8fafc', 
              borderRadius: '6px', 
              border: '1px dashed #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1
            }}>
              <PersonIcon sx={{ fontSize: 24, color: '#94a3b8' }} />
              <Typography sx={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, textAlign: 'center', lineHeight: 1.4 }}>
                Chưa có thông tin nhân viên.<br/>Vui lòng nhập ID để tra cứu.
              </Typography>
            </Box>
          )}

          {/* Sickness / Symptom details */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b' }}>Triệu chứng / Lý do cho về</Typography>
            <TextField
              placeholder="Ví dụ: Đau đầu dữ dội, sốt cao 39 độ..."
              value={sickness}
              onChange={(e) => setSickness(e.target.value)}
              size="small"
              multiline
              rows={2}
              fullWidth
              disabled={!foundEmployee}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  fontSize: '12.5px',
                  '& fieldset': { borderColor: '#cbd5e1' },
                  '&.Mui-focused fieldset': { borderColor: '#15803d' },
                }
              }}
            />
          </Box>

          {/* Time Info */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b' }}>Thời gian ra về</Typography>
            <TextField
              value={leavingTime}
              onChange={(e) => setLeavingTime(e.target.value)}
              size="small"
              disabled={!foundEmployee}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ScheduleIcon sx={{ fontSize: 15, color: '#64748b' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '6px',
                  height: 36,
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#334155',
                  '& fieldset': { borderColor: '#cbd5e1' },
                  '&.Mui-focused fieldset': { borderColor: '#15803d' },
                }
              }}
            />
          </Box>

          {/* Cấp thuốc mang về switch */}
          <FormControlLabel
            control={
              <Switch 
                checked={hasMedicine} 
                onChange={(e) => setHasMedicine(e.target.checked)} 
                color="primary"
                size="small"
                disabled={!foundEmployee}
              />
            }
            label={
              <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>
                Cấp thuốc mang về
              </Typography>
            }
            sx={{ m: 0 }}
          />

          <Box sx={{ flexGrow: 1 }} />

          {/* Confirm Action Button */}
          <Button 
            variant="contained" 
            fullWidth 
            onClick={handleSaveRecord}
            disabled={!foundEmployee}
            startIcon={<PrintIcon />}
            sx={{ 
              height: 38,
              fontSize: '13px',
              fontWeight: 800,
              borderRadius: '6px',
              textTransform: 'none',
              bgcolor: '#15803d',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#166534', boxShadow: 'none' },
              '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' }
            }}
          >
            Xác nhận & In phiếu
          </Button>
        </Paper>

        {/* RIGHT COLUMN: History List & Filters - stretched to fill the full container height */}
        <Paper elevation={0} sx={{ 
          flexGrow: 1,
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: '#fff',
          height: '100%',
          boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)'
        }}>
          {/* Header & Filter options */}
          <Box sx={{ borderBottom: '1px solid #e2e8f0', p: 1.25, px: 2, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '13px', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Danh sách công nhân ra về sớm
            </Typography>
            
            {/* Action filters */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              {/* Search by worker input */}
              <TextField 
                placeholder="Tìm tên hoặc ID..."
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  width: 140,
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
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>Từ:</Typography>
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
                      backgroundColor: '#ffffff',
                      fontSize: '11.5px',
                      fontWeight: 750,
                      color: '#334155',
                      '& fieldset': { borderColor: '#cbd5e1' }
                    },
                    '& .MuiInputBase-input': { py: 0.5, px: 1 }
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>Đến:</Typography>
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
                      backgroundColor: '#ffffff',
                      fontSize: '11.5px',
                      fontWeight: 750,
                      color: '#334155',
                      '& fieldset': { borderColor: '#cbd5e1' }
                    },
                    '& .MuiInputBase-input': { py: 0.5, px: 1 }
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Table list */}
          <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
            <TableContainer sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase' }}>Công nhân</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase' }}>Bộ phận</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase' }}>Triệu chứng / Lý do</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase' }} align="center">Thời gian về</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase' }}>Thuốc</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase' }}>Người duyệt</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase' }} align="center">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedRecords.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell sx={{ py: 1.25, px: 2 }}>
                        <Typography sx={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 800 }}>{record.fullName}</Typography>
                        <Typography sx={{ fontSize: '10.5px', color: 'text.secondary', fontWeight: 600 }}>ID: {record.employeeId}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.25, px: 2 }}>
                        <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>{record.dept}</Typography>
                        <Typography sx={{ fontSize: '10.5px', color: '#64748b' }}>{record.line} - {record.factory}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.25, px: 2, fontSize: '12px', color: '#475569', fontWeight: 500 }}>{record.sickness}</TableCell>
                      <TableCell align="center" sx={{ py: 1.25, px: 2, fontSize: '12px', color: '#0f172a', fontWeight: 750 }}>{record.leavingTime}</TableCell>
                      <TableCell sx={{ py: 1.25, px: 2 }}>
                        {record.hasMedicine ? (
                          <Chip label="Có phát thuốc" size="small" sx={{ height: 20, fontSize: '10px', fontWeight: 800, bgcolor: '#e8f5e9', color: '#15803d', borderRadius: '4px' }} />
                        ) : (
                          <Chip label="Không" size="small" variant="outlined" sx={{ height: 20, fontSize: '10px', fontWeight: 700, borderColor: '#cbd5e1', color: '#64748b', borderRadius: '4px' }} />
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.25, px: 2, fontSize: '12px', fontWeight: 700, color: '#334155' }}>{record.doctorInCharge}</TableCell>
                      <TableCell align="center" sx={{ py: 1.25, px: 2 }}>
                        <Tooltip title="In lại phiếu kiểm cổng">
                          <IconButton size="small" sx={{ color: '#15803d', '&:hover': { bgcolor: 'rgba(21,128,61,0.05)' } }}>
                            <PrintIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                        <Typography color="text.secondary" fontWeight={650} fontSize={'13px'} sx={{ fontStyle: 'italic' }}>
                          Chưa có lịch sử công nhân về sớm nào được ghi nhận.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination custom TCC layout */}
            {filteredRecords.length > 0 && (
              <Box sx={{ 
                borderTop: '1px solid #e2e8f0', 
                backgroundColor: '#f8fafc', 
                p: 1.25, 
                px: 3,
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' }, 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                gap: 2, 
                borderRadius: '0 0 12px 12px' 
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ color: '#475569', fontWeight: 800, fontSize: '12.5px' }}>Số dòng:</Typography>
                  <Select
                    size="small"
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setPage(0);
                    }}
                    sx={{ 
                      height: 30, 
                      fontSize: '12.5px', 
                      fontWeight: 700, 
                      backgroundColor: '#fff',
                      borderRadius: '6px',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' }
                    }}
                  >
                    {[5, 10, 20, 50].map(v => <MenuItem key={v} value={v} sx={{ fontSize: '12.5px', fontWeight: 700 }}>{v}</MenuItem>)}
                  </Select>
                  <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 700, fontSize: '12.5px', ml: 1 }}>
                    {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, filteredRecords.length)} trong {filteredRecords.length}
                  </Typography>
                </Box>
                <Pagination
                  count={Math.ceil(filteredRecords.length / rowsPerPage) || 1}
                  page={page + 1}
                  onChange={(_, newPage) => setPage(newPage - 1)}
                  shape="rounded"
                  showFirstButton
                  showLastButton
                  siblingCount={isMobile ? 0 : 1}
                  boundaryCount={1}
                  size="small"
                  sx={{ 
                    '& .MuiPaginationItem-root': { fontWeight: 800, borderRadius: '6px' },
                    '& .MuiPaginationItem-root.Mui-selected': { bgcolor: '#15803d', color: '#fff', '&:hover': { bgcolor: '#166534' } }
                  }}
                />
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
