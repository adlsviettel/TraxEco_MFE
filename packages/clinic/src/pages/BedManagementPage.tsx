import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
  TablePagination,
  TextField,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  Chip
} from '@mui/material';
import { 
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ViewWeek as ViewWeekIcon,
  Sync as SyncIcon,
  FileDownload as FileDownloadIcon,
  Home as HomeIcon,
  People as PeopleIcon,
  Inventory as WarehouseIcon,
  Hotel as BedIcon,
  History as HistoryIcon,
  Assessment as ReportIcon,
  Settings as SettingsIcon,
  LocalHospital as HospitalIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useToast, AppButton, AppTextField, HeaderActions } from '@traxeco/shared';

import BedStatusGrid, { Bed } from '../components/bed/BedStatusGrid';
import AdmitPatientDialog from '../components/bed/AdmitPatientDialog';
import DischargePatientDialog from '../components/bed/DischargePatientDialog';

interface BedHistory {
  id: number;
  bedName: string;
  employeeId: string;
  fullName: string;
  sickness: string;
  admitTime: string;
  dischargeTime: string;
  factory: string;
}

// Initial occupied bed set to 31 minutes ago for immediate demonstration of the 30-min timeout flashing alert
const INITIAL_BEDS: Bed[] = [
  { idBed: 1, bedName: 'Giường F1-01', isOccupied: true, employeeId: '12700000', fullName: 'Nguyễn Thân Hân', admitTime: new Date(Date.now() - 31 * 60 * 1000).toLocaleString('vi-VN'), sickness: 'Đau bụng / Tiêu chảy', factory: 'Xưởng F1' },
  { idBed: 2, bedName: 'Giường F1-02', isOccupied: false, factory: 'Xưởng F1' },
  { idBed: 3, bedName: 'Giường F1-03', isOccupied: false, factory: 'Xưởng F1' },
  { idBed: 4, bedName: 'Giường F1-04', isOccupied: false, factory: 'Xưởng F1' },
  
  { idBed: 5, bedName: 'Giường F2-01', isOccupied: false, factory: 'Xưởng F2' },
  { idBed: 6, bedName: 'Giường F2-02', isOccupied: false, factory: 'Xưởng F2' },
  { idBed: 7, bedName: 'Giường F2-03', isOccupied: false, factory: 'Xưởng F2' },
  { idBed: 8, bedName: 'Giường F2-04', isOccupied: false, factory: 'Xưởng F2' },
  { idBed: 9, bedName: 'Giường F2-05', isOccupied: false, factory: 'Xưởng F2' },
  { idBed: 10, bedName: 'Giường F2-06', isOccupied: false, factory: 'Xưởng F2' },

  { idBed: 11, bedName: 'Giường F3-01', isOccupied: false, factory: 'Xưởng F3' },
  { idBed: 12, bedName: 'Giường F3-02', isOccupied: false, factory: 'Xưởng F3' },

  { idBed: 13, bedName: 'Giường CT-01', isOccupied: false, factory: 'Xưởng CT' },
  { idBed: 14, bedName: 'Giường CT-02', isOccupied: false, factory: 'Xưởng CT' },
  { idBed: 15, bedName: 'Giường CT-03', isOccupied: false, factory: 'Xưởng CT' },
];

const INITIAL_HISTORY: BedHistory[] = [
  {
    id: 1,
    bedName: 'Giường F2-02',
    employeeId: '12700001',
    fullName: 'Phil Khan',
    sickness: 'Chấn thương phần mềm',
    admitTime: '02/07/2026 09:00:00',
    dischargeTime: '02/07/2026 09:25:00',
    factory: 'Xưởng F2'
  }
];

const FACTORIES = ['Tất cả', 'Xưởng F1', 'Xưởng F2', 'Xưởng F3', 'Xưởng CT'];

export default function BedManagementPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showToast } = useToast();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [beds, setBeds] = useState<Bed[]>(INITIAL_BEDS);
  const [history, setHistory] = useState<BedHistory[]>(INITIAL_HISTORY);
  
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [isAdmitOpen, setIsAdmitOpen] = useState(false);
  const [isDischargeOpen, setIsDischargeOpen] = useState(false);
  const [activeFactory, setActiveFactory] = useState(() => {
    const userFactoryRaw = localStorage.getItem('factory') || '';
    const roleLevel = Number(localStorage.getItem('roleLevel') || '99');
    const isSuperAdmin = localStorage.getItem('isSuperAdmin') === 'true';
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const isPowerUser = isSuperAdmin || isAdmin || roleLevel <= 2;
    
    if (!isPowerUser && userFactoryRaw) {
      if (userFactoryRaw.includes('F1')) return 'Xưởng F1';
      if (userFactoryRaw.includes('F2')) return 'Xưởng F2';
      if (userFactoryRaw.includes('F3')) return 'Xưởng F3';
      if (userFactoryRaw.includes('CT')) return 'Xưởng CT';
    }
    return 'Tất cả';
  });

  const isRestricted = React.useMemo(() => {
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

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [historyPage, setHistoryPage] = useState(0);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(5);

  const filteredHistory = React.useMemo(() => {
    return history.filter(record => {
      // Filter by factory
      if (activeFactory !== 'Tất cả' && record.factory !== activeFactory) {
        return false;
      }
      
      // Filter by date
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        
        // admitTime format e.g. "02/07/2026 09:00:00" or standard LocaleString
        const parts = record.admitTime.split(' ');
        if (parts.length > 0) {
          const dateParts = parts[0].split('/');
          if (dateParts.length === 3) {
            const recordDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
            if (recordDate < from) return false;
          } else {
            const parsed = new Date(record.admitTime);
            if (!isNaN(parsed.getTime()) && parsed < from) return false;
          }
        }
      }
      
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        
        const parts = record.admitTime.split(' ');
        if (parts.length > 0) {
          const dateParts = parts[0].split('/');
          if (dateParts.length === 3) {
            const recordDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
            if (recordDate > to) return false;
          } else {
            const parsed = new Date(record.admitTime);
            if (!isNaN(parsed.getTime()) && parsed > to) return false;
          }
        }
      }
      
      return true;
    });
  }, [history, activeFactory, fromDate, toDate]);

  const paginatedHistory = React.useMemo(() => {
    const startIndex = historyPage * historyRowsPerPage;
    return filteredHistory.slice(startIndex, startIndex + historyRowsPerPage);
  }, [filteredHistory, historyPage, historyRowsPerPage]);

  // Reset page when filters change
  React.useEffect(() => {
    setHistoryPage(0);
  }, [fromDate, toDate, activeFactory]);

  // Filter beds based on selected Factory
  const filteredBeds = beds.filter(bed => activeFactory === 'Tất cả' || bed.factory === activeFactory);

  // Statistics calculation for the active factory
  const totalBedsCount = filteredBeds.length;
  const occupiedBedsCount = filteredBeds.filter(b => b.isOccupied).length;
  const emptyBedsCount = totalBedsCount - occupiedBedsCount;

  const handleAdmitClick = (bed: Bed) => {
    setSelectedBed(bed);
    setIsAdmitOpen(true);
  };

  const handleDischargeClick = (bed: Bed) => {
    setSelectedBed(bed);
    setIsDischargeOpen(true);
  };

  const handleAdmitSave = (data: { employeeId: string; fullName: string; sickness: string }) => {
    if (!selectedBed) return;

    const formattedTime = new Date().toLocaleString('vi-VN');

    setBeds((prev) =>
      prev.map((b) => {
        if (b.idBed === selectedBed.idBed) {
          return {
            ...b,
            isOccupied: true,
            employeeId: data.employeeId,
            fullName: data.fullName,
            sickness: data.sickness,
            admitTime: formattedTime
          };
        }
        return b;
      })
    );

    setIsAdmitOpen(false);
    setSelectedBed(null);
    showToast(t('clinic.bed.admitSuccess', 'Tiếp nhận bệnh nhân nằm giường thành công!'), 'success');
  };

  const handleDischargeSave = () => {
    if (!selectedBed) return;

    const formattedDischargeTime = new Date().toLocaleString('vi-VN');

    const historyEntry: BedHistory = {
      id: history.length > 0 ? Math.max(...history.map(i => i.id)) + 1 : 1,
      bedName: selectedBed.bedName,
      employeeId: selectedBed.employeeId || '',
      fullName: selectedBed.fullName || '',
      sickness: selectedBed.sickness || '',
      admitTime: selectedBed.admitTime || '',
      dischargeTime: formattedDischargeTime,
      factory: selectedBed.factory || 'Chưa rõ'
    };

    setHistory((prev) => [historyEntry, ...prev]);

    setBeds((prev) =>
      prev.map((b) => {
        if (b.idBed === selectedBed.idBed) {
          return {
            ...b,
            isOccupied: false,
            employeeId: undefined,
            fullName: undefined,
            admitTime: undefined,
            sickness: undefined
          };
        }
        return b;
      })
    );

    setIsDischargeOpen(false);
    setSelectedBed(null);
    showToast(t('clinic.bed.dischargeSuccess', 'Đã cho xuất giường và hoàn tất thủ tục.'), 'success');
  };

  return (
    <Box sx={{ 
      flexGrow: 1, 
      width: '100%', 
      height: '100%', 
      minWidth: 0, 
      display: 'flex', 
      flexDirection: 'column', 
      overflowY: 'auto',
      p: 0.5,
      pt: 1,
      pb: 2,
      gap: 1
    }}>
      {/* ─── DYNAMICALLY IMPORT GOOGLE FONTS ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
      `}</style>

      {/* Section 1: Dashboard Stats & Factory Tabs */}
      <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: 3, flexShrink: 0 }}>
        {/* Horizontal Tabs selection */}
        {!isRestricted ? (
          <Tabs 
            value={activeFactory} 
            onChange={(_, val) => setActiveFactory(val)} 
            sx={{
              bgcolor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              p: 0.5,
              minHeight: 0,
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTab-root': {
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 800,
                fontSize: 13,
                py: 1,
                px: 2.25,
                minHeight: 0,
                color: '#64748b',
                transition: 'all 0.15s',
                '&.Mui-selected': {
                  bgcolor: '#15803d',
                  color: '#ffffff'
                },
                '&:hover': {
                  bgcolor: activeFactory !== 'Tất cả' ? 'rgba(21,128,61,0.04)' : undefined
                }
              }
            }}
          >
            {FACTORIES.map(fac => (
              <Tab key={fac} label={fac} value={fac} />
            ))}
          </Tabs>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: 1 }}>
              <HospitalIcon sx={{ color: '#15803d' }} />
              {activeFactory}
            </Typography>
          </Box>
        )}

        {/* Quick dashboard badges */}
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Chip 
            label={`Tổng số giường: ${totalBedsCount}`} 
            sx={{ bgcolor: '#ffffff', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: 12.5, color: '#475569', borderRadius: '8px', px: 1 }} 
          />
          <Chip 
            label={`Đang sử dụng: ${occupiedBedsCount}`} 
            sx={{ bgcolor: '#fffbeb', border: '1px solid #fde68a', fontWeight: 800, fontSize: 12.5, color: '#d97706', borderRadius: '8px', px: 1 }} 
          />
          <Chip 
            label={`Giường trống: ${emptyBedsCount}`} 
            sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', fontWeight: 800, fontSize: 12.5, color: '#15803d', borderRadius: '8px', px: 1 }} 
          />
        </Box>
      </Box>

          {/* Sơ đồ giường bệnh */}
          <Paper elevation={0} sx={{ 
            borderRadius: '12px', 
            border: '1px solid #cbd5e1', 
            boxShadow: '0px 4px 20px -2px rgba(0,0,0,0.05)', 
            bgcolor: '#fff',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            <Box sx={{ borderBottom: '1px solid #e2e8f0', py: 2, px: 3, bgcolor: '#f8fafc', display: 'flex', alignItems: 'center', gap: 1 }}>
              <HospitalIcon sx={{ color: '#15803d', fontSize: 18 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '13px', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sơ đồ giường bệnh {activeFactory === 'Tất cả' ? 'các xưởng' : activeFactory} thời gian thực
              </Typography>
            </Box>
            <Box sx={{ p: 3, bgcolor: '#fff' }}>
              <BedStatusGrid 
                beds={filteredBeds} 
                onAdmitClick={handleAdmitClick} 
                onDischargeClick={handleDischargeClick} 
              />
            </Box>
          </Paper>

          {/* Lịch sử nằm giường */}
          <Paper elevation={0} sx={{ 
            width: '100%', 
            overflow: 'hidden', 
            flexGrow: 1, 
            minHeight: 250,
            borderRadius: '12px', 
            border: '1px solid #cbd5e1', 
            boxShadow: '0px 4px 20px -2px rgba(0,0,0,0.05)', 
            display: 'flex', 
            flexDirection: 'column', 
            bgcolor: '#fff' 
          }}>
            <Box sx={{ borderBottom: '1px solid #e2e8f0', py: 1.25, px: 3, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '13px', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('clinic.bed.historyTitle', 'Lịch sử nằm giường bệnh')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#64748b' }}>Từ:</Typography>
                  <TextField 
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarIcon sx={{ fontSize: 16, color: '#15803d' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      width: 165,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        backgroundColor: '#ffffff',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: '#334155',
                        '& fieldset': { borderColor: '#cbd5e1' },
                        '&:hover fieldset': { borderColor: '#94a3b8' },
                        '&.Mui-focused fieldset': { borderColor: '#15803d', borderWidth: '1.5px' },
                      },
                      '& .MuiInputBase-input': { py: 0.75, pl: 0.5 }
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#64748b' }}>Đến:</Typography>
                  <TextField 
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarIcon sx={{ fontSize: 16, color: '#15803d' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      width: 165,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        backgroundColor: '#ffffff',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: '#334155',
                        '& fieldset': { borderColor: '#cbd5e1' },
                        '&:hover fieldset': { borderColor: '#94a3b8' },
                        '&.Mui-focused fieldset': { borderColor: '#15803d', borderWidth: '1.5px' },
                      },
                      '& .MuiInputBase-input': { py: 0.75, pl: 0.5 }
                    }}
                  />
                </Box>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
              <TableContainer sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.75, px: 2.5, fontWeight: 800, fontSize: 11.5, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('clinic.bed.col.bed', 'Giường')}</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.75, px: 2.5, fontWeight: 800, fontSize: 11.5, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('clinic.bed.col.employee', 'Bệnh nhân')}</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.75, px: 2.5, fontWeight: 800, fontSize: 11.5, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Xưởng</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.75, px: 2.5, fontWeight: 800, fontSize: 11.5, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('clinic.bed.col.sickness', 'Triệu chứng')}</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.75, px: 2.5, fontWeight: 800, fontSize: 11.5, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }} align="center">{t('clinic.bed.col.admitTime', 'Thời gian vào')}</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.75, px: 2.5, fontWeight: 800, fontSize: 11.5, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }} align="center">{t('clinic.bed.col.dischargeTime', 'Thời gian ra')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedHistory.map((record) => (
                      <TableRow key={record.id} hover>
                        <TableCell sx={{ py: 1.5, px: 2.5, fontSize: 13, color: '#15803d', fontWeight: 800 }}>{record.bedName}</TableCell>
                        <TableCell sx={{ py: 1.5, px: 2.5, fontSize: 13 }}>
                           <Typography fontSize={13} color="#0f172a" fontWeight={800}>{record.fullName}</Typography>
                           <Typography fontSize={11} color="text.secondary">ID: {record.employeeId}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.5, px: 2.5 }}>
                          <Chip 
                            label={record.factory} 
                            size="small" 
                            sx={{ 
                              height: 20, 
                              fontSize: 10.5, 
                              fontWeight: 800, 
                              bgcolor: '#f1f5f9', 
                              color: '#475569',
                              borderRadius: '4px'
                            }} 
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1.5, px: 2.5, fontSize: 13, color: '#334155' }}>{record.sickness}</TableCell>
                        <TableCell align="center" sx={{ py: 1.5, px: 2.5, fontSize: 13, color: '#334155' }}>{record.admitTime}</TableCell>
                        <TableCell align="center" sx={{ py: 1.5, px: 2.5, fontSize: 13, color: '#334155' }}>{record.dischargeTime}</TableCell>
                      </TableRow>
                    ))}
                    {filteredHistory.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                          <Typography color="text.secondary" fontWeight={500} fontSize={13.5} sx={{ fontStyle: 'italic' }}>
                            {t('clinic.bed.noHistory', 'Chưa có lịch sử nằm giường bệnh.')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {filteredHistory.length > 0 && (
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
                      value={historyRowsPerPage}
                      onChange={(e) => {
                        setHistoryRowsPerPage(Number(e.target.value));
                        setHistoryPage(0);
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
                      {historyPage * historyRowsPerPage + 1}-{Math.min((historyPage + 1) * historyRowsPerPage, filteredHistory.length)} trong {filteredHistory.length}
                    </Typography>
                  </Box>
                  <Pagination
                    count={Math.ceil(filteredHistory.length / historyRowsPerPage) || 1}
                    page={historyPage + 1}
                    onChange={(_, newPage) => setHistoryPage(newPage - 1)}
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

      {/* Dialog tiếp nhận bệnh nhân */}
      <AdmitPatientDialog 
        open={isAdmitOpen} 
        bed={selectedBed} 
        onClose={() => setIsAdmitOpen(false)} 
        onAdmit={handleAdmitSave} 
      />

      {/* Dialog xuất viện */}
      <DischargePatientDialog 
        open={isDischargeOpen} 
        bed={selectedBed} 
        onClose={() => setIsDischargeOpen(false)} 
        onDischarge={handleDischargeSave} 
      />
    </Box>
  );
}
