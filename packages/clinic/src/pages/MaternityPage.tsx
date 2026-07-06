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
  TextField,
  Button,
  Chip,
  Select,
  MenuItem,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  Checkbox,
  Grid,
  Drawer,
  IconButton,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  RadioGroup,
  Radio
} from '@mui/material';
import { 
  Search as SearchIcon,
  PregnantWoman as PregnantIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  ClearAll as ClearIcon,
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as DoneIcon
} from '@mui/icons-material';
import { useToast } from '@traxeco/shared';

// Interface matching the C# DB structure
interface MaternityRecord {
  stt: number;
  employeeId: string;
  fullName: string;
  factory: string;
  dept: string;
  laborType: 'Direct' | 'Indirect';
  registrationDate: string;
  ultrasoundDate: string;
  numOfWeeks: number;
  numOfDays: number;
  dateOfPregnancy: string;
  earlyLeaveBenefitDate: string;
  earlyMaternityLeaveEndDate: string; // Ngày dự sinh / ngày kết thúc hưởng về sớm khi bầu (Pregnancy date + 290 days)
  estDateOfBirth?: string;
  
  // 5 examination dates
  examinationDate1?: string;
  examinationDate2?: string;
  examinationDate3?: string;
  examinationDate4?: string;
  examinationDate5?: string;
  
  // Postpartum details
  babyDateOfBirth?: string;
  methodOfBirth?: string; // Sinh thường / Sinh mổ
  postpartumRestFrom?: string;
  postpartumRestTo?: string;
  childSupportEndDate?: string; // BabyDateOfBirth + 365 ngày
  
  remark?: string;
  status: 'Active' | 'Done';
}

const INITIAL_RECORDS: MaternityRecord[] = [
  {
    stt: 1,
    employeeId: '12700481',
    fullName: 'Trần Thị Mai',
    factory: 'Xưởng F2',
    dept: 'May 1',
    laborType: 'Direct',
    registrationDate: '2026-07-01',
    ultrasoundDate: '2026-07-01',
    numOfWeeks: 12,
    numOfDays: 3,
    dateOfPregnancy: '2026-04-05',
    earlyLeaveBenefitDate: '2026-07-01',
    earlyMaternityLeaveEndDate: '2027-01-20',
    estDateOfBirth: '2027-01-20',
    examinationDate1: '2026-08-10',
    status: 'Active',
    remark: 'Sức khỏe tốt'
  },
  {
    stt: 2,
    employeeId: '12700982',
    fullName: 'Nguyễn Thị Hồng',
    factory: 'Xưởng F2',
    dept: 'May 3',
    laborType: 'Indirect',
    registrationDate: '2026-06-10',
    ultrasoundDate: '2026-06-10',
    numOfWeeks: 10,
    numOfDays: 0,
    dateOfPregnancy: '2026-04-01',
    earlyLeaveBenefitDate: '2026-09-28',
    earlyMaternityLeaveEndDate: '2027-01-15',
    estDateOfBirth: '2027-01-15',
    status: 'Active'
  }
];

export default function MaternityPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showToast } = useToast();

  const [records, setRecords] = useState<MaternityRecord[]>(INITIAL_RECORDS);
  
  // Load user factory from localStorage to lock active factory
  const userFactoryRaw = useMemo(() => localStorage.getItem('factory') || '', []);
  const activeFactory = useMemo(() => {
    if (userFactoryRaw.includes('F1')) return 'Xưởng F1';
    if (userFactoryRaw.includes('F2')) return 'Xưởng F2';
    if (userFactoryRaw.includes('F3')) return 'Xưởng F3';
    if (userFactoryRaw.includes('CT')) return 'Xưởng CT';
    return 'Xưởng F2'; // fallback
  }, [userFactoryRaw]);
  
  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [editingStt, setEditingStt] = useState<number | null>(null);

  // Confirm End Regime Dialog states
  const [isConfirmEndOpen, setIsConfirmEndOpen] = useState(false);
  const [recordToEnd, setRecordToEnd] = useState<MaternityRecord | null>(null);

  // Auto End Regime when Registering New states
  const [isAutoEndDialogOpen, setIsAutoEndDialogOpen] = useState(false);
  const [activeRecordToAutoEnd, setActiveRecordToAutoEnd] = useState<MaternityRecord | null>(null);
  // Filter states
  const [filterText, setFilterText] = useState('');
  const [filterFromDate, setFilterFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [filterToDate, setFilterToDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [appliedText, setAppliedText] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [appliedToDate, setAppliedToDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Search Employee
  const [searchCode, setSearchCode] = useState('');
  
  // Core Info
  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [factory, setFactory] = useState('');
  const [dept, setDept] = useState('');
  const [laborType, setLaborType] = useState<'Direct' | 'Indirect'>('Direct');

  // Dates
  const [registrationDate, setRegistrationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [ultrasoundDate, setUltrasoundDate] = useState('');
  const [numOfWeeks, setNumOfWeeks] = useState<number | ''>('');
  const [numOfDays, setNumOfDays] = useState<number | ''>('');
  
  // 5 Exam dates & statuses
  const [hasExam1, setHasExam1] = useState(false);
  const [examDate1, setExamDate1] = useState('');
  const [hasExam2, setHasExam2] = useState(false);
  const [examDate2, setExamDate2] = useState('');
  const [hasExam3, setHasExam3] = useState(false);
  const [examDate3, setExamDate3] = useState('');
  const [hasExam4, setHasExam4] = useState(false);
  const [examDate4, setExamDate4] = useState('');
  const [hasExam5, setHasExam5] = useState(false);
  const [examDate5, setExamDate5] = useState('');

  // Postpartum details
  const [hasBabyBorn, setHasBabyBorn] = useState(false);
  const [babyDateOfBirth, setBabyDateOfBirth] = useState('');
  const [methodOfBirth, setMethodOfBirth] = useState('');
  
  const [hasPostpartumRest, setHasPostpartumRest] = useState(false);
  const [postpartumRestFrom, setPostpartumRestFrom] = useState('');
  const [postpartumRestTo, setPostpartumRestTo] = useState('');

  // Auto-calculate Postpartum Rest dates when baby date of birth or method of birth changes
  useEffect(() => {
    if (babyDateOfBirth) {
      setHasPostpartumRest(true);
      const dob = new Date(babyDateOfBirth);
      
      // Nghỉ dưỡng từ = Ngày sinh + 180 ngày
      const restFrom = new Date(dob.getTime());
      restFrom.setDate(restFrom.getDate() + 180);
      setPostpartumRestFrom(restFrom.toISOString().split('T')[0]);

      // Đến ngày = Nghỉ dưỡng từ + 5 ngày (sinh thường) hoặc 7 ngày (sinh mổ)
      const restTo = new Date(restFrom.getTime());
      const recoveryDays = methodOfBirth === 'Sinh mổ' ? 7 : 5;
      restTo.setDate(restTo.getDate() + recoveryDays);
      setPostpartumRestTo(restTo.toISOString().split('T')[0]);
    } else {
      setHasPostpartumRest(false);
      setPostpartumRestFrom('');
      setPostpartumRestTo('');
    }
  }, [babyDateOfBirth, methodOfBirth]);

  const [remark, setRemark] = useState('');

  // Auto-calculated fields
  const calculatedDates = useMemo(() => {
    if (!employeeId || !ultrasoundDate || numOfWeeks === '' || numOfDays === '') {
      return { dateOfPregnancy: '', estDateOfBirth: '', earlyLeaveBenefitDate: '', earlyMaternityLeaveEndDate: '' };
    }

    const totalDays = (Number(numOfWeeks) * 7) + Number(numOfDays);
    const uDate = new Date(ultrasoundDate);
    
    // 1. Ngày mang thai = Ngày siêu âm - (tuần * 7 + ngày)
    const pregDate = new Date(uDate.getTime());
    pregDate.setDate(pregDate.getDate() - totalDays);
    const dateOfPregnancyStr = pregDate.toISOString().split('T')[0];

    // 2. Ngày dự sinh = Ngày mang thai + 290 ngày (C# code: dtpEndDate.Value = dtpDateOfPregnancy.Value.AddDays(290))
    const estDate = new Date(pregDate.getTime());
    estDate.setDate(estDate.getDate() + 290);
    const estDateOfBirthStr = estDate.toISOString().split('T')[0];
    const earlyMaternityLeaveEndDateStr = estDateOfBirthStr;

    // 3. Ngày hưởng chế độ về sớm
    let earlyLeaveBenefitDateStr = '';
    if (laborType === 'Direct') {
      // Direct -> dtpEarlyDate.Value = dtpRegistrationDate.Value;
      earlyLeaveBenefitDateStr = registrationDate;
    } else {
      // Indirect -> dtpEarlyDate.Value = pregnancyDate.AddDays(180);
      const earlyDate = new Date(pregDate.getTime());
      earlyDate.setDate(earlyDate.getDate() + 180);
      earlyLeaveBenefitDateStr = earlyDate.toISOString().split('T')[0];
    }

    return {
      dateOfPregnancy: dateOfPregnancyStr,
      estDateOfBirth: estDateOfBirthStr,
      earlyLeaveBenefitDate: earlyLeaveBenefitDateStr,
      earlyMaternityLeaveEndDate: earlyMaternityLeaveEndDateStr
    };
  }, [employeeId, ultrasoundDate, numOfWeeks, numOfDays, laborType, registrationDate]);

  // Child support end date (baby DOB + 365 days)
  const childSupportEndDate = useMemo(() => {
    if (!babyDateOfBirth) return '';
    const d = new Date(babyDateOfBirth);
    d.setDate(d.getDate() + 365);
    return d.toISOString().split('T')[0];
  }, [babyDateOfBirth]);

  // Search employee inside drawer
  const handleSearch = () => {
    if (!searchCode.trim()) {
      showToast('Vui lòng nhập mã thẻ nhân viên!', 'warning');
      return;
    }

    // Check if employee has existing active record in our list
    const activeRecord = records.find(r => r.employeeId === searchCode && r.status === 'Active');
    
    if (isUpdateMode) {
      // In update mode, load the active record if found
      if (activeRecord && activeRecord.stt === editingStt) {
        // already loading the correct editing record
        showToast('Đã tải thông tin hồ sơ đang cập nhật!', 'success');
      } else if (activeRecord) {
        // loaded active record
        setEditingStt(activeRecord.stt);
        setEmployeeId(activeRecord.employeeId);
        setFullName(activeRecord.fullName);
        setFactory(activeRecord.factory);
        setDept(activeRecord.dept);
        setLaborType(activeRecord.laborType);
        setRegistrationDate(activeRecord.registrationDate);
        setUltrasoundDate(activeRecord.ultrasoundDate);
        setNumOfWeeks(activeRecord.numOfWeeks);
        setNumOfDays(activeRecord.numOfDays);

        setHasExam1(!!activeRecord.examinationDate1);
        setExamDate1(activeRecord.examinationDate1 || '');
        setHasExam2(!!activeRecord.examinationDate2);
        setExamDate2(activeRecord.examinationDate2 || '');
        setHasExam3(!!activeRecord.examinationDate3);
        setExamDate3(activeRecord.examinationDate3 || '');
        setHasExam4(!!activeRecord.examinationDate4);
        setExamDate4(activeRecord.examinationDate4 || '');
        setHasExam5(!!activeRecord.examinationDate5);
        setExamDate5(activeRecord.examinationDate5 || '');

        setHasBabyBorn(!!activeRecord.babyDateOfBirth);
        setBabyDateOfBirth(activeRecord.babyDateOfBirth || '');
        setMethodOfBirth(activeRecord.methodOfBirth || '');

        setHasPostpartumRest(!!activeRecord.postpartumRestFrom);
        setPostpartumRestFrom(activeRecord.postpartumRestFrom || '');
        setPostpartumRestTo(activeRecord.postpartumRestTo || '');

        setRemark(activeRecord.remark || '');
        showToast('Đã tìm thấy và tải thông tin hồ sơ thai sản đang hoạt động!', 'success');
      } else {
        showToast('Không tìm thấy thai sản hoạt động của nhân viên này để cập nhật!', 'error');
      }
    } else {
      // In INSERT MODE (Registering a new pregnancy)
      if (activeRecord) {
        // Instead of blocking, open the auto-end confirm dialog!
        setActiveRecordToAutoEnd(activeRecord);
        setIsAutoEndDialogOpen(true);
        return;
      }

      // Find any past record of this employee to keep their profile details (Name, Factory, Dept, LaborType)
      const pastRecord = records.find(r => r.employeeId === searchCode);

      // Safe to register new one
      setIsUpdateMode(false);
      setEditingStt(null);
      setEmployeeId(searchCode);
      setFullName(pastRecord ? pastRecord.fullName : 'Nguyễn Thị Hoa');
      setFactory(pastRecord ? pastRecord.factory : (activeFactory === 'Tất cả' ? 'Xưởng F2' : activeFactory));
      setDept(pastRecord ? pastRecord.dept : 'May 1');
      setLaborType(pastRecord ? pastRecord.laborType : 'Direct');
      setRegistrationDate(new Date().toISOString().split('T')[0]);
      setUltrasoundDate('');
      setNumOfWeeks('');
      setNumOfDays('');
      
      // Clear forms
      setHasExam1(false); setExamDate1('');
      setHasExam2(false); setExamDate2('');
      setHasExam3(false); setExamDate3('');
      setHasExam4(false); setExamDate4('');
      setHasExam5(false); setExamDate5('');
      setHasBabyBorn(false); setBabyDateOfBirth(''); setMethodOfBirth('');
      setHasPostpartumRest(false); setPostpartumRestFrom(''); setPostpartumRestTo('');
      setRemark('');

      showToast('Nhân viên không có thai kỳ hoạt động. Sẵn sàng đăng ký thai kỳ mới!', 'info');
    }
  };

  // Open drawer for a brand new registration
  const handleAddNew = () => {
    setIsUpdateMode(false);
    setEditingStt(null);
    setSearchCode('');
    setEmployeeId('');
    setFullName('');
    setFactory('');
    setDept('');
    setRegistrationDate(new Date().toISOString().split('T')[0]);
    setUltrasoundDate('');
    setNumOfWeeks('');
    setNumOfDays('');
    setHasExam1(false); setExamDate1('');
    setHasExam2(false); setExamDate2('');
    setHasExam3(false); setExamDate3('');
    setHasExam4(false); setExamDate4('');
    setHasExam5(false); setExamDate5('');
    setHasBabyBorn(false); setBabyDateOfBirth(''); setMethodOfBirth('');
    setHasPostpartumRest(false); setPostpartumRestFrom(''); setPostpartumRestTo('');
    setRemark('');
    setIsDrawerOpen(true);
  };

  // Open drawer for editing/updating
  const handleSelectRecord = (r: MaternityRecord) => {
    setIsUpdateMode(true);
    setEditingStt(r.stt);
    setSearchCode(r.employeeId);
    setEmployeeId(r.employeeId);
    setFullName(r.fullName);
    setFactory(r.factory);
    setDept(r.dept);
    setLaborType(r.laborType);
    setRegistrationDate(r.registrationDate);
    setUltrasoundDate(r.ultrasoundDate);
    setNumOfWeeks(r.numOfWeeks);
    setNumOfDays(r.numOfDays);

    setHasExam1(!!r.examinationDate1);
    setExamDate1(r.examinationDate1 || '');
    setHasExam2(!!r.examinationDate2);
    setExamDate2(r.examinationDate2 || '');
    setHasExam3(!!r.examinationDate3);
    setExamDate3(r.examinationDate3 || '');
    setHasExam4(!!r.examinationDate4);
    setExamDate4(r.examinationDate4 || '');
    setHasExam5(!!r.examinationDate5);
    setExamDate5(r.examinationDate5 || '');

    setHasBabyBorn(!!r.babyDateOfBirth);
    setBabyDateOfBirth(r.babyDateOfBirth || '');
    setMethodOfBirth(r.methodOfBirth || '');

    setHasPostpartumRest(!!r.postpartumRestFrom);
    setPostpartumRestFrom(r.postpartumRestFrom || '');
    setPostpartumRestTo(r.postpartumRestTo || '');

    setRemark(r.remark || '');
    setIsDrawerOpen(true);
  };

  const handleConfirmAutoEndAndRegisterNew = () => {
    if (!activeRecordToAutoEnd) return;

    // 1. End the old active regime
    setRecords(prev => prev.map(item => 
      item.stt === activeRecordToAutoEnd.stt ? { ...item, status: 'Done' } : item
    ));

    // 2. Clear forms and switch drawer to insert mode for the new regime
    setIsUpdateMode(false);
    setEditingStt(null);
    setEmployeeId(activeRecordToAutoEnd.employeeId);
    setFullName(activeRecordToAutoEnd.fullName);
    setFactory(activeRecordToAutoEnd.factory);
    setDept(activeRecordToAutoEnd.dept);
    setLaborType(activeRecordToAutoEnd.laborType);
    setRegistrationDate(new Date().toISOString().split('T')[0]);
    setUltrasoundDate('');
    setNumOfWeeks('');
    setNumOfDays('');
    
    setHasExam1(false); setExamDate1('');
    setHasExam2(false); setExamDate2('');
    setHasExam3(false); setExamDate3('');
    setHasExam4(false); setExamDate4('');
    setHasExam5(false); setExamDate5('');
    setHasBabyBorn(false); setBabyDateOfBirth(''); setMethodOfBirth('');
    setHasPostpartumRest(false); setPostpartumRestFrom(''); setPostpartumRestTo('');
    setRemark('');

    setIsAutoEndDialogOpen(false);
    setActiveRecordToAutoEnd(null);
    showToast('Đã kết thúc chế độ cũ. Bắt đầu đăng ký thai kỳ mới cho nhân viên!', 'success');
  };



  // Save/Update records
  const handleSave = () => {
    if (!employeeId || !ultrasoundDate || numOfWeeks === '' || numOfDays === '') {
      showToast('Vui lòng nhập đầy đủ thông tin bắt buộc (MSNV, Tuổi thai, Ngày siêu âm)!', 'warning');
      return;
    }

    const payload: MaternityRecord = {
      stt: isUpdateMode && editingStt ? editingStt : Date.now(),
      employeeId,
      fullName,
      factory,
      dept,
      laborType,
      registrationDate,
      ultrasoundDate,
      numOfWeeks: Number(numOfWeeks),
      numOfDays: Number(numOfDays),
      dateOfPregnancy: calculatedDates.dateOfPregnancy,
      earlyLeaveBenefitDate: calculatedDates.earlyLeaveBenefitDate,
      earlyMaternityLeaveEndDate: calculatedDates.earlyMaternityLeaveEndDate,
      estDateOfBirth: calculatedDates.estDateOfBirth,
      
      examinationDate1: hasExam1 ? examDate1 : undefined,
      examinationDate2: hasExam2 ? examDate2 : undefined,
      examinationDate3: hasExam3 ? examDate3 : undefined,
      examinationDate4: hasExam4 ? examDate4 : undefined,
      examinationDate5: hasExam5 ? examDate5 : undefined,

      babyDateOfBirth: hasBabyBorn ? babyDateOfBirth : undefined,
      methodOfBirth: hasBabyBorn ? methodOfBirth : undefined,
      childSupportEndDate: hasBabyBorn ? childSupportEndDate : undefined,

      postpartumRestFrom: hasPostpartumRest ? postpartumRestFrom : undefined,
      postpartumRestTo: hasPostpartumRest ? postpartumRestTo : undefined,
      
      remark,
      status: (hasBabyBorn || (hasExam5 && examDate5)) ? 'Done' : 'Active'
    };

    if (isUpdateMode) {
      setRecords(prev => prev.map(r => r.stt === editingStt ? payload : r));
      showToast('Cập nhật thông tin thai sản thành công!', 'success');
    } else {
      setRecords(prev => [payload, ...prev]);
      showToast('Đăng ký hồ sơ thai sản mới thành công!', 'success');
    }

    setIsDrawerOpen(false);
  };

  // Apply filters
  const handleApplyFilter = () => {
    setAppliedText(filterText);
    setAppliedFromDate(filterFromDate);
    setAppliedToDate(filterToDate);
    showToast('Đã áp dụng bộ lọc!', 'success');
  };

  // Clear filters
  const handleClearFilter = () => {
    setFilterText('');
    const d = new Date();
    d.setDate(d.getDate() - 14);
    const fourteenDaysAgo = d.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    setFilterFromDate(fourteenDaysAgo);
    setFilterToDate(today);

    setAppliedText('');
    setAppliedFromDate(fourteenDaysAgo);
    setAppliedToDate(today);
    showToast('Đã xóa bộ lọc, hiển thị mặc định 14 ngày qua!', 'info');
  };

  // Filter records by factory, dates, and search text
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // 1. Factory check
      if (activeFactory !== 'Tất cả' && r.factory !== activeFactory) {
        return false;
      }

      // 2. Search text check (ID or Name) - Search all time if querying text
      if (appliedText.trim()) {
        const query = appliedText.toLowerCase().trim();
        const matchId = r.employeeId.toLowerCase().includes(query);
        const matchName = r.fullName.toLowerCase().includes(query);
        return matchId || matchName;
      }

      // 3. Date range check on registrationDate (Only active if NOT searching by text)
      if (appliedFromDate && r.registrationDate < appliedFromDate) {
        return false;
      }
      if (appliedToDate && r.registrationDate > appliedToDate) {
        return false;
      }

      return true;
    });
  }, [records, activeFactory, appliedText, appliedFromDate, appliedToDate]);

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
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        
        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          filter: invert(30%) sepia(80%) saturate(500%) hue-rotate(90deg) brightness(90%) contrast(90%);
        }
      `}</style>

      {/* Main Grid Card occupying 100% space */}
      <Paper elevation={0} sx={{ 
        flexGrow: 1,
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: '#fff',
        height: 'calc(100vh - 90px)'
      }}>
        {/* Toolbar Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid #cbd5e1', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, bgcolor: '#f8fafc', flexShrink: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase' }}>
            <PregnantIcon sx={{ color: '#15803d', fontSize: 18 }} />
            Quản lý chế độ thai sản
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              variant="contained"
              onClick={handleAddNew}
              startIcon={<AddIcon />}
              sx={{
                bgcolor: '#15803d',
                height: 32,
                textTransform: 'none',
                fontWeight: 800,
                fontSize: '12px',
                borderRadius: '6px',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#166534', boxShadow: 'none' }
              }}
            >
              Đăng ký mới
            </Button>
          </Box>
        </Box>

        {/* Filter Area */}
        <Box sx={{ px: 2, py: 1.5, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <TextField
            placeholder="Tìm theo tên, MSNV..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleApplyFilter();
            }}
            size="small"
            sx={{
              width: 200,
              '& .MuiOutlinedInput-root': { height: 32, borderRadius: '6px', fontSize: '12px', fontWeight: 700 }
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: filterText.trim() ? '#cbd5e1' : '#475569' }}>Từ ngày</Typography>
            <TextField
              type="date"
              value={filterFromDate}
              onChange={(e) => setFilterFromDate(e.target.value)}
              disabled={!!filterText.trim()}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': { height: 32, borderRadius: '6px', fontSize: '12px', fontWeight: 700 }
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: filterText.trim() ? '#cbd5e1' : '#475569' }}>Đến ngày</Typography>
            <TextField
              type="date"
              value={filterToDate}
              onChange={(e) => setFilterToDate(e.target.value)}
              disabled={!!filterText.trim()}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': { height: 32, borderRadius: '6px', fontSize: '12px', fontWeight: 700 }
              }}
            />
          </Box>

          <Button
            variant="contained"
            onClick={handleApplyFilter}
            startIcon={<SearchIcon sx={{ fontSize: 14 }} />}
            sx={{
              bgcolor: '#15803d',
              height: 32,
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '12px',
              borderRadius: '6px',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#166534', boxShadow: 'none' }
            }}
          >
            Lọc
          </Button>

          <Button
            variant="outlined"
            onClick={handleClearFilter}
            startIcon={<ClearIcon sx={{ fontSize: 14 }} />}
            sx={{
              height: 32,
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '12px',
              borderRadius: '6px',
              borderColor: '#cbd5e1',
              color: '#475569',
              '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' }
            }}
          >
            Xóa bộ lọc
          </Button>
        </Box>

        {/* Grid table */}
        <TableContainer sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Nhân viên</TableCell>
                <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Thông tin thai kỳ</TableCell>
                <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Thời gian về sớm</TableCell>
                <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }} align="center">Lịch khám & Sau sinh</TableCell>
                <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Trạng thái</TableCell>
                <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }} align="center">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRecords.map((r) => (
                <TableRow key={r.stt} hover>
                  <TableCell sx={{ py: 1.25, px: 2 }}>
                    <Typography sx={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 800 }}>{r.fullName}</Typography>
                    <Typography sx={{ fontSize: '10.5px', color: 'text.secondary', fontWeight: 650 }}>ID: {r.employeeId}</Typography>
                    <Typography sx={{ fontSize: '10.5px', color: '#64748b' }}>{r.dept} | {r.factory} ({r.laborType === 'Direct' ? 'Trực tiếp' : 'Gián tiếp'})</Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.25, px: 2 }}>
                    <Typography sx={{ fontSize: '12px', color: '#334155', fontWeight: 700 }}>
                      Bầu {r.numOfWeeks} tuần {r.numOfDays} ngày ({new Date(r.ultrasoundDate).toLocaleDateString('vi-VN')})
                    </Typography>
                    <Typography sx={{ fontSize: '10.5px', color: '#64748b' }}>
                      Dự sinh: {new Date(r.earlyMaternityLeaveEndDate).toLocaleDateString('vi-VN')}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.25, px: 2 }}>
                    <Typography sx={{ fontSize: '12px', color: '#0f172a', fontWeight: 700 }}>
                      Về sớm từ: {new Date(r.earlyLeaveBenefitDate).toLocaleDateString('vi-VN')}
                    </Typography>
                    {r.childSupportEndDate && (
                      <Typography sx={{ fontSize: '10.5px', color: '#15803d', fontWeight: 800 }}>
                        Nuôi con đến: {new Date(r.childSupportEndDate).toLocaleDateString('vi-VN')}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1.25, px: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                      <Typography sx={{ fontSize: '10.5px', color: '#334155', fontWeight: 700 }}>
                        Đã khám: {[r.examinationDate1, r.examinationDate2, r.examinationDate3, r.examinationDate4, r.examinationDate5].filter(Boolean).length}/5 lần
                      </Typography>
                      {r.babyDateOfBirth && (
                        <Chip 
                          label={`${r.methodOfBirth} (${new Date(r.babyDateOfBirth).toLocaleDateString('vi-VN')})`} 
                          size="small" 
                          sx={{ height: 18, fontSize: '9.5px', fontWeight: 800, bgcolor: '#e0f2fe', color: '#0369a1', borderRadius: '4px' }} 
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 1.25, px: 2 }}>
                    {r.status === 'Active' ? (
                      <Chip label="Đang thai sản" size="small" sx={{ height: 20, fontSize: '10px', fontWeight: 800, bgcolor: '#fee2e2', color: '#991b1b', borderRadius: '4px' }} />
                    ) : (
                      <Chip label="Đã hoàn thành" size="small" sx={{ height: 20, fontSize: '10px', fontWeight: 800, bgcolor: '#e8f5e9', color: '#15803d', borderRadius: '4px' }} />
                    )}
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1.25, px: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      {r.status === 'Active' ? (
                        <>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleSelectRecord(r)}
                            startIcon={<EditIcon sx={{ fontSize: 13 }} />}
                            sx={{
                              height: 26,
                              fontSize: '11px',
                              fontWeight: 800,
                              textTransform: 'none',
                              borderRadius: '4px',
                              borderColor: '#cbd5e1',
                              color: '#475569',
                              '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' }
                            }}
                          >
                            Cập nhật
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setRecordToEnd(r);
                              setIsConfirmEndOpen(true);
                            }}
                            startIcon={<DoneIcon sx={{ fontSize: 13 }} />}
                            sx={{
                              height: 26,
                              fontSize: '11px',
                              fontWeight: 800,
                              textTransform: 'none',
                              borderRadius: '4px',
                              borderColor: '#fee2e2',
                              color: '#991b1b',
                              '&:hover': { bgcolor: '#fef2f2', borderColor: '#fca5a5' }
                            }}
                          >
                            Kết thúc
                          </Button>
                        </>
                      ) : (
                        <Typography sx={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>-</Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary" fontWeight={650} fontSize={'13px'} sx={{ fontStyle: 'italic' }}>
                      Chưa có hồ sơ thai sản nào trong danh sách.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* DRAWER FOR INSERT/UPDATE FORM (Premium right slide-out) */}
      <Drawer
        anchor="right"
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        sx={{ zIndex: 1400 }}
        PaperProps={{
          sx: { width: isMobile ? '100%' : '520px', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }
        }}
      >
        {/* Drawer header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', pb: 1.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase' }}>
            <PregnantIcon sx={{ color: '#15803d' }} />
            {isUpdateMode ? 'Cập nhật hồ sơ thai sản' : 'Đăng ký hồ sơ thai sản'}
          </Typography>
          <IconButton size="small" onClick={() => setIsDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Search employee if in insert mode */}
        {!isUpdateMode && (
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              placeholder="Nhập/quét MSNV..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              size="small"
              sx={{
                flexGrow: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '6px',
                  height: 32,
                  fontSize: '12px',
                  fontWeight: 700,
                  '& fieldset': { borderColor: '#cbd5e1' }
                }
              }}
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              sx={{
                bgcolor: '#15803d',
                height: 32,
                textTransform: 'none',
                fontWeight: 800,
                fontSize: '12px',
                borderRadius: '6px',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#166534', boxShadow: 'none' }
              }}
            >
              Tìm
            </Button>
          </Box>
        )}

        {employeeId ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, overflowY: 'auto', pr: 0.5 }}>
            {/* Employee summary */}
            <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Row 1: Read-only Employee Profile Details */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1.2 }}>
                  <Typography sx={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Họ tên nhân viên</Typography>
                  <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', mt: 0.25 }}>{fullName}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Nhà xưởng / Tổ</Typography>
                  <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#334155', mt: 0.25 }}>{dept} | {factory}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Loại lao động</Typography>
                  <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#334155', mt: 0.25 }}>
                    {laborType === 'Direct' ? 'Trực tiếp (Direct)' : 'Gián tiếp (Indirect)'}
                  </Typography>
                </Box>
              </Box>

              {/* Row 2: Editable Metadata */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: '11px', color: '#64748b', fontWeight: 600, mb: 0.5 }}>Ngày đăng ký</Typography>
                  <TextField
                    type="date"
                    value={registrationDate}
                    onChange={(e) => setRegistrationDate(e.target.value)}
                    size="small"
                    sx={{
                      width: '100%',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '4px',
                        height: 30,
                        fontSize: '11.5px',
                        fontWeight: 750,
                        bgcolor: '#fff',
                        '& fieldset': { borderColor: '#cbd5e1' }
                      },
                      '& .MuiInputBase-input': { py: 0.5, px: 1 }
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1 }} />
              </Box>
            </Box>

            {/* Ultrasound information */}
            <Box sx={{ border: '1px solid #cbd5e1', borderRadius: '6px', p: 1.5 }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 900, color: '#15803d', mb: 1, textTransform: 'uppercase' }}>1. Thông tin chẩn đoán siêu âm</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12}>
                  <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', mb: 0.5 }}>Ngày siêu âm</Typography>
                  <TextField
                    type="date"
                    value={ultrasoundDate}
                    onChange={(e) => setUltrasoundDate(e.target.value)}
                    size="small"
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': { height: 30, borderRadius: '6px', fontSize: '12px', fontWeight: 700 },
                      '& .MuiInputBase-input': { py: 0.5, px: 1 }
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', mb: 0.5 }}>Tuổi thai (Tuần)</Typography>
                  <TextField
                    type="number"
                    value={numOfWeeks}
                    onChange={(e) => setNumOfWeeks(e.target.value === '' ? '' : Number(e.target.value))}
                    size="small"
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px', height: 30, fontSize: '12px', fontWeight: 700 } }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', mb: 0.5 }}>Ngày lẻ</Typography>
                  <TextField
                    type="number"
                    value={numOfDays}
                    onChange={(e) => setNumOfDays(e.target.value === '' ? '' : Number(e.target.value))}
                    size="small"
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px', height: 30, fontSize: '12px', fontWeight: 700 } }}
                  />
                </Grid>
              </Grid>

              {ultrasoundDate && numOfWeeks !== '' && numOfDays !== '' && (
                <Box sx={{ mt: 1.5, p: 1, bgcolor: '#f0fdf4', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11px', color: '#166534', fontWeight: 700 }}>Ngày mang thai:</Typography>
                    <Typography sx={{ fontSize: '11px', color: '#166534', fontWeight: 900 }}>{new Date(calculatedDates.dateOfPregnancy).toLocaleDateString('vi-VN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11px', color: '#166534', fontWeight: 700 }}>Ngày dự sinh:</Typography>
                    <Typography sx={{ fontSize: '11px', color: '#166534', fontWeight: 900 }}>{new Date(calculatedDates.estDateOfBirth).toLocaleDateString('vi-VN')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '11px', color: '#166534', fontWeight: 700 }}>Bắt đầu về sớm:</Typography>
                    <Typography sx={{ fontSize: '11px', color: '#166534', fontWeight: 900 }}>{new Date(calculatedDates.earlyLeaveBenefitDate).toLocaleDateString('vi-VN')}</Typography>
                  </Box>
                </Box>
              )}
            </Box>

            {/* 5 Prenatal Checkups */}
            <Box sx={{ border: '1px solid #cbd5e1', borderRadius: '6px', p: 1.5 }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 900, color: '#15803d', mb: 1, textTransform: 'uppercase' }}>2. Lịch khám thai định kỳ (Tối đa 5 lần)</Typography>
              <Grid container spacing={1}>
                {[
                  { label: 'Khám Lần 1', hasState: hasExam1, setHas: setHasExam1, dateState: examDate1, setDate: setExamDate1 },
                  { label: 'Khám Lần 2', hasState: hasExam2, setHas: setHasExam2, dateState: examDate2, setDate: setExamDate2 },
                  { label: 'Khám Lần 3', hasState: hasExam3, setHas: setHasExam3, dateState: examDate3, setDate: setExamDate3 },
                  { label: 'Khám Lần 4', hasState: hasExam4, setHas: setHasExam4, dateState: examDate4, setDate: setExamDate4 },
                  { label: 'Khám Lần 5', hasState: hasExam5, setHas: setHasExam5, dateState: examDate5, setDate: setExamDate5 },
                ].map((exam, idx) => (
                  <Grid item xs={12} key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormControlLabel
                      control={<Checkbox size="small" checked={exam.hasState} onChange={(e) => exam.setHas(e.target.checked)} sx={{ color: '#15803d', '&.Mui-checked': { color: '#15803d' } }} />}
                      label={<Typography sx={{ fontSize: '11.5px', fontWeight: 700, width: 85, color: '#334155' }}>{exam.label}</Typography>}
                      sx={{ mr: 0 }}
                    />
                    <TextField
                      type="date"
                      value={exam.dateState}
                      onChange={(e) => exam.setDate(e.target.value)}
                      disabled={!exam.hasState}
                      size="small"
                      sx={{
                        flexGrow: 1,
                        '& .MuiOutlinedInput-root': { height: 26, borderRadius: '4px', fontSize: '11px' },
                        '& .MuiInputBase-input': { py: 0.5, px: 1 }
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Postpartum details */}
            <Box sx={{ border: '1px solid #cbd5e1', borderRadius: '6px', p: 1.5 }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 900, color: '#15803d', mb: 1, textTransform: 'uppercase' }}>3. Thông tin sinh con & Nghỉ dưỡng sức</Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox 
                      size="small" 
                      checked={hasBabyBorn} 
                      onChange={(e) => {
                        setHasBabyBorn(e.target.checked);
                        if (!e.target.checked) {
                          setBabyDateOfBirth('');
                          setMethodOfBirth('');
                          setHasPostpartumRest(false);
                          setPostpartumRestFrom('');
                          setPostpartumRestTo('');
                        } else {
                          setMethodOfBirth('Sinh thường');
                        }
                      }} 
                      sx={{ color: '#15803d', '&.Mui-checked': { color: '#15803d' } }} 
                    />
                  }
                  label={<Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Đã sinh con</Typography>}
                />
              </Box>

              {hasBabyBorn && (
                <Grid container spacing={2}>
                  {/* Left Column: Thông tin của bé */}
                  <Grid item xs={6}>
                    <Box sx={{ borderRight: '1px solid #e2e8f0', pr: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 900, color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9', pb: 0.5 }}>
                        Thông tin bé
                      </Typography>
                      
                      <Box>
                        <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#64748b', mb: 0.5 }}>Ngày sinh con</Typography>
                        <TextField
                          type="date"
                          value={babyDateOfBirth}
                          onChange={(e) => setBabyDateOfBirth(e.target.value)}
                          size="small"
                          fullWidth
                          sx={{
                            '& .MuiOutlinedInput-root': { height: 28, borderRadius: '4px', fontSize: '11.5px' },
                            '& .MuiInputBase-input': { py: 0.5, px: 1 }
                          }}
                        />
                      </Box>

                      <Box>
                        <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#64748b', mb: 0.5 }}>Phương pháp sinh</Typography>
                        <Select
                          size="small"
                          value={methodOfBirth}
                          onChange={(e) => setMethodOfBirth(e.target.value)}
                          fullWidth
                          sx={{ height: 28, fontSize: '11.5px', fontWeight: 750, borderRadius: '4px' }}
                        >
                          <MenuItem value="Sinh thường" sx={{ fontSize: '11.5px', fontWeight: 700 }}>Sinh thường</MenuItem>
                          <MenuItem value="Sinh mổ" sx={{ fontSize: '11.5px', fontWeight: 700 }}>Sinh mổ</MenuItem>
                        </Select>
                      </Box>

                      {babyDateOfBirth && (
                        <Box sx={{ p: 1, bgcolor: '#eff6ff', borderRadius: '4px', border: '1px solid #bfdbfe', mt: 0.5 }}>
                          <Typography sx={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 800, textAlign: 'center' }}>
                            Nuôi con đến: {new Date(childSupportEndDate).toLocaleDateString('vi-VN')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Grid>

                  {/* Right Column: Nghỉ dưỡng sức */}
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 900, color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9', pb: 0.5 }}>
                        Nghỉ dưỡng sức
                      </Typography>

                      {babyDateOfBirth ? (
                        <>
                          <Box sx={{ display: 'flex', alignItems: 'center', height: 28 }}>
                            <FormControlLabel
                              control={<Checkbox size="small" checked={hasPostpartumRest} onChange={(e) => setHasPostpartumRest(e.target.checked)} sx={{ color: '#15803d', '&.Mui-checked': { color: '#15803d' } }} />}
                              label={<Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>Hưởng nghỉ dưỡng sức</Typography>}
                              sx={{ m: 0 }}
                            />
                          </Box>

                          {hasPostpartumRest && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <Box>
                                <Typography sx={{ fontSize: '11px', color: '#64748b', mb: 0.5 }}>Nghỉ dưỡng từ</Typography>
                                <TextField
                                  type="date"
                                  value={postpartumRestFrom}
                                  onChange={(e) => setPostpartumRestFrom(e.target.value)}
                                  size="small"
                                  fullWidth
                                  sx={{
                                    '& .MuiOutlinedInput-root': { height: 28, borderRadius: '4px', fontSize: '11.5px' },
                                    '& .MuiInputBase-input': { py: 0.5, px: 1 }
                                  }}
                                />
                              </Box>
                              <Box>
                                <Typography sx={{ fontSize: '11px', color: '#64748b', mb: 0.5 }}>Đến ngày</Typography>
                                <TextField
                                  type="date"
                                  value={postpartumRestTo}
                                  onChange={(e) => setPostpartumRestTo(e.target.value)}
                                  size="small"
                                  fullWidth
                                  sx={{
                                    '& .MuiOutlinedInput-root': { height: 28, borderRadius: '4px', fontSize: '11.5px' },
                                    '& .MuiInputBase-input': { py: 0.5, px: 1 }
                                  }}
                                />
                              </Box>
                            </Box>
                          )}
                        </>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1, bgcolor: '#f8fafc', borderRadius: '4px', p: 1.5, border: '1px dashed #cbd5e1' }}>
                          <Typography sx={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textAlign: 'center' }}>
                            Nhập ngày sinh con để thiết lập nghỉ dưỡng sức
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              )}
            </Box>

            {/* Remark */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b' }}>Ghi chú</Typography>
              <TextField
                placeholder="..."
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                multiline
                rows={2}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: '12px', fontWeight: 700 } }}
              />
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <Typography sx={{ color: '#64748b', fontSize: '12px', fontWeight: 650, fontStyle: 'italic' }}>
              Nhập MSNV ở trên để đăng ký/tải thông tin thai sản.
            </Typography>
          </Box>
        )}

        {/* Action footer inside drawer */}
        {employeeId && (
          <Box sx={{ borderTop: '1px solid #f1f5f9', pt: 2, display: 'flex', gap: 1.5, mt: 'auto' }}>
            <Button
              variant="outlined"
              onClick={() => setIsDrawerOpen(false)}
              fullWidth
              sx={{ height: 36, textTransform: 'none', fontWeight: 800, fontSize: '12.5px', borderRadius: '6px' }}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              fullWidth
              startIcon={<SaveIcon />}
              sx={{ height: 36, textTransform: 'none', fontWeight: 800, fontSize: '12.5px', bgcolor: '#15803d', borderRadius: '6px', boxShadow: 'none', '&:hover': { bgcolor: '#166534', boxShadow: 'none' } }}
            >
              {isUpdateMode ? 'Cập nhật' : 'Đăng ký mới'}
            </Button>
          </Box>
        )}
      </Drawer>

      {/* BEAUTIFUL CONFIRMATION DIALOG FOR KẾT THÚC */}
      <Dialog
        open={isConfirmEndOpen}
        onClose={() => setIsConfirmEndOpen(false)}
        sx={{ zIndex: 1500 }}
        PaperProps={{
          sx: { borderRadius: '12px', p: 1.5, width: 400 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <DoneIcon sx={{ color: '#15803d', fontSize: 20 }} />
          Xác nhận kết thúc thai sản
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
            Bạn có chắc chắn muốn kết thúc chế độ thai sản hiện tại của nhân viên <strong>{recordToEnd?.fullName}</strong> (MSNV: {recordToEnd?.employeeId})?
          </Typography>
          <Typography sx={{ fontSize: '12.5px', color: '#15803d', fontWeight: 700, mt: 1.5 }}>
            👉 Điều này sẽ hoàn tất hồ sơ cũ để sẵn sàng cho lần đăng ký thai kỳ tiếp theo.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 1.5, gap: 1 }}>
          <Button
            onClick={() => setIsConfirmEndOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 800, fontSize: '12.5px', color: '#64748b' }}
          >
            Hủy bỏ
          </Button>
          <Button
            onClick={() => {
              if (recordToEnd) {
                setRecords(prev => prev.map(item => item.stt === recordToEnd.stt ? { ...item, status: 'Done' } : item));
                showToast('Đã kết thúc chế độ thai sản thành công!', 'success');
              }
              setIsConfirmEndOpen(false);
              setRecordToEnd(null);
            }}
            variant="contained"
            sx={{
              bgcolor: '#15803d',
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '12.5px',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#166534', boxShadow: 'none' }
            }}
          >
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>

      {/* AUTO END CONFIRMATION DIALOG WHEN REGISTERING NEW */}
      <Dialog
        open={isAutoEndDialogOpen}
        onClose={() => {
          setIsAutoEndDialogOpen(false);
          setActiveRecordToAutoEnd(null);
          setEmployeeId('');
          setFullName('');
        }}
        sx={{ zIndex: 1550 }}
        PaperProps={{
          sx: { borderRadius: '12px', p: 1.5, width: 420 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <DoneIcon sx={{ color: '#b91c1c', fontSize: 20 }} />
          Chế độ thai sản chưa kết thúc!
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
            Nhân viên <strong>{activeRecordToAutoEnd?.fullName}</strong> (MSNV: {activeRecordToAutoEnd?.employeeId}) đang có một chế độ thai sản chưa kết thúc.
          </Typography>
          <Typography sx={{ fontSize: '13px', color: '#0f172a', fontWeight: 800, mt: 1.5 }}>
            Bạn có muốn tự động KẾT THÚC chế độ cũ để tiến hành ĐĂNG KÝ mới ngay bây giờ không?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 1.5, gap: 1 }}>
          <Button
            onClick={() => {
              setIsAutoEndDialogOpen(false);
              setActiveRecordToAutoEnd(null);
              setEmployeeId('');
              setFullName('');
            }}
            sx={{ textTransform: 'none', fontWeight: 800, fontSize: '12.5px', color: '#64748b' }}
          >
            Hủy bỏ
          </Button>
          <Button
            onClick={handleConfirmAutoEndAndRegisterNew}
            variant="contained"
            sx={{
              bgcolor: '#b91c1c',
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '12.5px',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#991b1b', boxShadow: 'none' }
            }}
          >
            Kết thúc & Đăng ký mới
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
