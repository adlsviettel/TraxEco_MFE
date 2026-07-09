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
  Button,
  Checkbox,
  FormGroup
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
  ImportExport as ExportIcon,
  ChildCare as ChildIcon,
  Description as DocIcon
} from '@mui/icons-material';
import { useToast } from '@traxeco/shared';

// Documents Checklist master data (from dtDoc)
const DOCUMENT_ITEMS = [
  { id: '1', name: 'Giấy chứng nhận nghỉ việc hưởng BHXH (Bản gốc)' },
  { id: '2', name: 'Giấy ra viện (Ngoại trú/Nội trú)' },
  { id: '3', name: 'Giấy khai sinh / Giấy chứng sinh của con' },
  { id: '4', name: 'Sổ Bảo hiểm xã hội' },
  { id: '5', name: 'Giấy xác nhận nghỉ dưỡng thai của cơ sở y tế' },
  { id: '6', name: 'Biên bản tai nạn lao động (nếu bị TNLĐ)' }
];

// Insurance master data (from dtInsurance)
const INSURANCE_ITEMS = [
  { id: 'INS01', code: 'CD01', name: 'Ốm đau thông thường', type: 'Ngắn ngày', fullName: 'Chế độ ốm đau thông thường (CD01)' },
  { id: 'INS02', code: 'CD02', name: 'Bệnh dài ngày (Danh mục bộ Y tế)', type: 'Dài ngày', fullName: 'Chế độ bệnh dài ngày danh mục (CD02)' },
  { id: 'INS03', code: 'CD03', name: 'Con ốm đau (Dưới 7 tuổi)', type: 'Ngắn ngày', fullName: 'Chế độ chăm con ốm đau (CD03)' },
  { id: 'INS04', code: 'CD04', name: 'Thai sản - Khám thai / Sẩy thai', type: 'Ngắn ngày', fullName: 'Chế độ thai sản sẩy thai/kế hoạch hóa (CD04)' },
  { id: 'INS05', code: 'CD05', name: 'Tai nạn lao động / Bệnh nghề nghiệp', type: 'Dài ngày', fullName: 'Chế độ tai nạn lao động (CD05)' }
];

// Disease Group master data (from dtSick)
const DISEASE_GROUPS = [
  { id: 'SG01', name: 'Bệnh lý hệ hô hấp (Họng, phổi...)' },
  { id: 'SG02', name: 'Bệnh lý hệ tiêu hóa (Dạ dày, ngộ độc...)' },
  { id: 'SG03', name: 'Chấn thương / Cơ xương khớp' },
  { id: 'SG04', name: 'Bệnh lý tim mạch / Thần kinh' },
  { id: 'SG05', name: 'Chế độ nghỉ thai sản / Kế hoạch hóa' }
];

// Document Type master data (from dtDocType)
const DOCUMENT_TYPES = [
  { id: 'DT01', name: 'Giấy chứng nhận nghỉ BHXH', sickType: 'Điều trị ngoại trú' },
  { id: 'DT02', name: 'Giấy ra viện ngoại trú', sickType: 'Ngoại trú cấp cứu' },
  { id: 'DT03', name: 'Tóm tắt hồ sơ bệnh án', sickType: 'Điều trị nội trú' }
];

interface InsuranceRecord {
  id: number;
  employeeId: string;
  fullName: string;
  factory: string;
  dept: string;
  sickness: string;
  insuranceName: string;
  offFrom: string;
  offTo: string;
  totalDays: number;
  submitterName: string;
  submitterPhone: string;
  childInfo?: { dob: string; code: string };
  checkedDocs: string[];
  remark: string;
  status: 'Approved' | 'Pending';
}

const INITIAL_RECORDS: InsuranceRecord[] = [
  {
    id: 1,
    employeeId: '12700481',
    fullName: 'Trần Thị Mai',
    factory: 'Xưởng F2',
    dept: 'May 1',
    sickness: 'Viêm phế quản cấp tính',
    insuranceName: 'Chế độ ốm đau thông thường (CD01)',
    offFrom: '2026-07-02',
    offTo: '2026-07-04',
    totalDays: 3,
    submitterName: 'Trần Thị Mai',
    submitterPhone: '0987654321',
    checkedDocs: ['Giấy chứng nhận nghỉ việc hưởng BHXH (Bản gốc)'],
    remark: 'Nghỉ ngoại trú điều trị thuốc',
    status: 'Approved'
  },
  {
    id: 2,
    employeeId: '12700982',
    fullName: 'Phạm Văn Nam',
    factory: 'Xưởng F2',
    dept: 'May 3',
    sickness: 'Chăm con sốt siêu vi trùng',
    insuranceName: 'Chế độ chăm con ốm đau (CD03)',
    offFrom: '2026-07-01',
    offTo: '2026-07-03',
    totalDays: 3,
    submitterName: 'Phạm Văn Nam',
    submitterPhone: '0912345678',
    childInfo: { dob: '2022-05-15', code: 'BH99887766' },
    checkedDocs: ['Giấy chứng nhận nghỉ việc hưởng BHXH (Bản gốc)', 'Giấy khai sinh / Giấy chứng sinh của con'],
    remark: 'Con ốm dưới 7 tuổi',
    status: 'Approved'
  }
];

export default function InsurancePage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showToast } = useToast();

  // Search employee states
  const [patientSearchCode, setPatientSearchCode] = useState('');
  const [foundPatient, setFoundPatient] = useState<any>(null);

  const [submitterSearchCode, setSubmitterSearchCode] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [submitterPhone, setSubmitterPhone] = useState('');

  // Form states
  const [diseaseGroupId, setDiseaseGroupId] = useState('');
  const [diseaseName, setDiseaseName] = useState('');
  
  const [insuranceId, setInsuranceId] = useState('');
  const [insuranceCode, setInsuranceCode] = useState('');
  const [diseaseClassification, setDiseaseClassification] = useState('');
  const [longShortTerm, setLongShortTerm] = useState('');

  const [docTypeId, setDocTypeId] = useState('');
  const [typeOfDisease, setTypeOfDisease] = useState('');

  const [offFrom, setOffFrom] = useState('');
  const [offTo, setOffTo] = useState('');
  const [totalDays, setTotalDays] = useState(1);

  const [isChildChecked, setIsChildChecked] = useState(false);
  const [childDob, setChildDob] = useState('');
  const [childInsuranceCode, setChildInsuranceCode] = useState('');

  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [remark, setRemark] = useState('');

  // Filter states
  const [filterSearch, setFilterSearch] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Records state
  const [records, setRecords] = useState<InsuranceRecord[]>(INITIAL_RECORDS);

  // Factory check
  const activeFactory = useMemo(() => {
    const userFactoryRaw = localStorage.getItem('factory') || '';
    if (userFactoryRaw.includes('F1')) return 'Xưởng F1';
    if (userFactoryRaw.includes('F2')) return 'Xưởng F2';
    if (userFactoryRaw.includes('F3')) return 'Xưởng F3';
    if (userFactoryRaw.includes('CT')) return 'Xưởng CT';
    return 'Tất cả';
  }, []);

  // Helper: Count working days excluding Sundays (C# CountWorkingDays)
  const calculateDays = (fromStr: string, toStr: string) => {
    if (!fromStr || !toStr) return 1;
    const start = new Date(fromStr);
    const end = new Date(toStr);
    if (start > end) return 0;
    
    let count = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0) { // 0 is Sunday
        count++;
      }
    }
    return count;
  };

  // Handle dates change
  const handleFromDateChange = (val: string) => {
    setOffFrom(val);
    if (val && offTo) {
      setTotalDays(calculateDays(val, offTo));
    }
  };

  const handleToDateChange = (val: string) => {
    setOffTo(val);
    if (offFrom && val) {
      setTotalDays(calculateDays(offFrom, val));
    }
  };

  // Search Patient
  const handleSearchPatient = () => {
    if (!patientSearchCode.trim()) {
      showToast('Vui lòng nhập mã thẻ nhân viên nghỉ bệnh', 'warning');
      return;
    }
    setFoundPatient({
      employeeId: patientSearchCode,
      fullName: patientSearchCode === '123' ? 'Trần Thị Mai' : 'Nguyễn Văn Hùng',
      factory: activeFactory === 'Tất cả' ? 'Xưởng F2' : activeFactory,
      dept: 'May Mặc',
      dob: '1995-10-12'
    });
    // Set default submitter as the patient themselves
    setSubmitterSearchCode(patientSearchCode);
    setSubmitterName(patientSearchCode === '123' ? 'Trần Thị Mai' : 'Nguyễn Văn Hùng');
    setSubmitterPhone('0987654321');
    showToast('Đã tải thông tin nhân viên nghỉ bệnh!', 'success');
  };

  // Search Submitter
  const handleSearchSubmitter = () => {
    if (!submitterSearchCode.trim()) {
      showToast('Vui lòng nhập mã thẻ người nộp', 'warning');
      return;
    }
    setSubmitterName('Lê Văn Bình (Nộp hộ)');
    setSubmitterPhone('0911223344');
    showToast('Đã tải thông tin người nộp hộ!', 'success');
  };

  // Handle Insurance Selection changed
  const handleInsuranceChange = (id: string) => {
    setInsuranceId(id);
    const item = INSURANCE_ITEMS.find(x => x.id === id);
    if (item) {
      setInsuranceCode(item.code);
      setDiseaseClassification(item.name);
      setLongShortTerm(item.type);

      // Auto-toggle child checkbox if con om regime is selected
      if (item.code === 'CD03') {
        setIsChildChecked(true);
      } else {
        setIsChildChecked(false);
      }
    }
  };

  // Handle Doc Type Selection changed
  const handleDocTypeChange = (id: string) => {
    setDocTypeId(id);
    const item = DOCUMENT_TYPES.find(x => x.id === id);
    if (item) {
      setTypeOfDisease(item.sickType);
    }
  };

  // Handle Document Checklist toggle
  const handleDocToggle = (docName: string) => {
    setSelectedDocs(prev => 
      prev.includes(docName) ? prev.filter(x => x !== docName) : [...prev, docName]
    );
  };

  // Handle Save
  const handleSave = () => {
    if (!foundPatient) {
      showToast('Vui lòng tìm và nhập thông tin nhân viên nghỉ bệnh trước', 'warning');
      return;
    }
    if (!diseaseGroupId || !diseaseName.trim() || !insuranceId || !docTypeId || !submitterName.trim()) {
      showToast('Vui lòng điền đầy đủ các trường thông tin bắt buộc (*)', 'warning');
      return;
    }
    if (selectedDocs.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 hồ sơ chứng từ đính kèm', 'warning');
      return;
    }

    const insName = INSURANCE_ITEMS.find(x => x.id === insuranceId)?.fullName || '';
    const newRecord: InsuranceRecord = {
      id: Date.now(),
      employeeId: foundPatient.employeeId,
      fullName: foundPatient.fullName,
      factory: foundPatient.factory,
      dept: foundPatient.dept,
      sickness: diseaseName,
      insuranceName: insName,
      offFrom: offFrom || new Date().toISOString().split('T')[0],
      offTo: offTo || new Date().toISOString().split('T')[0],
      totalDays,
      submitterName,
      submitterPhone,
      checkedDocs: selectedDocs,
      remark,
      status: 'Approved'
    };

    if (isChildChecked) {
      newRecord.childInfo = { dob: childDob, code: childInsuranceCode };
    }

    setRecords(prev => [newRecord, ...prev]);
    showToast('Cập nhật dữ liệu BHXH thành công!', 'success');

    // Reset Form
    setFoundPatient(null);
    setPatientSearchCode('');
    setSubmitterSearchCode('');
    setSubmitterName('');
    setSubmitterPhone('');
    setDiseaseGroupId('');
    setDiseaseName('');
    setInsuranceId('');
    setInsuranceCode('');
    setDiseaseClassification('');
    setLongShortTerm('');
    setDocTypeId('');
    setTypeOfDisease('');
    setOffFrom('');
    setOffTo('');
    setTotalDays(1);
    setIsChildChecked(false);
    setChildDob('');
    setChildInsuranceCode('');
    setSelectedDocs([]);
    setRemark('');
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Factory restriction
      if (activeFactory !== 'Tất cả' && record.factory !== activeFactory) {
        return false;
      }

      // Search query
      if (filterSearch.trim()) {
        const query = filterSearch.toLowerCase();
        if (!record.fullName.toLowerCase().includes(query) && !record.employeeId.includes(query)) {
          return false;
        }
      }

      // From date
      if (filterFrom && record.offFrom < filterFrom) {
        return false;
      }

      // To date
      if (filterTo && record.offTo > filterTo) {
        return false;
      }

      return true;
    });
  }, [records, activeFactory, filterSearch, filterFrom, filterTo]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
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
      {/* ─── DYNAMICALLY IMPORT GOOGLE FONTS ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap');
        
        /* Clean native datepicker icon */
        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          filter: invert(30%) sepia(80%) saturate(500%) hue-rotate(90deg) brightness(90%) contrast(90%);
        }
      `}</style>

      {/* Main Container Layout */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        gap: 1, 
        alignItems: 'stretch',
        flexGrow: 1,
        minHeight: 0,
        height: isMobile ? 'auto' : 'calc(100vh - 90px)'
      }}>
        
        {/* LEFT COLUMN: Create Slip Form - Scrollable */}
        <Paper elevation={0} sx={{ 
          width: isMobile ? '100%' : '440px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          bgcolor: '#fff',
          flexShrink: 0,
          height: '100%',
          overflowY: 'auto',
          boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)'
        }}>
          <Typography sx={{ fontWeight: 800, fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #f1f5f9', pb: 1, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            <ApproveIcon sx={{ color: '#15803d', fontSize: 16 }} />
            Tạo hồ sơ nghỉ hưởng BHXH
          </Typography>

          {/* SECTION 1: Patient Search */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.25, border: '1px solid #f1f5f9', borderRadius: '6px', bgcolor: '#f8fafc' }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 900, color: '#15803d', textTransform: 'uppercase' }}>1. Nhân viên nghỉ bệnh (*)</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder="Mã NV nghỉ bệnh..."
                value={patientSearchCode}
                onChange={(e) => setPatientSearchCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchPatient()}
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
                    fontSize: '12px',
                    height: 32,
                    '& fieldset': { borderColor: '#cbd5e1' },
                    '&.Mui-focused fieldset': { borderColor: '#15803d' },
                  }
                }}
              />
              <IconButton 
                onClick={handleSearchPatient}
                sx={{ 
                  bgcolor: '#15803d', 
                  color: '#ffffff', 
                  borderRadius: '6px',
                  width: 32,
                  height: 32,
                  '&:hover': { bgcolor: '#166534' } 
                }}
              >
                <SearchIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>

            {foundPatient && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pt: 0.5 }}>
                <Typography sx={{ fontSize: '12px', color: '#0f172a', fontWeight: 800 }}>{foundPatient.fullName} (#{foundPatient.employeeId})</Typography>
                <Typography sx={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>BP: {foundPatient.dept} | Xưởng: {foundPatient.factory} | NS: {foundPatient.dob}</Typography>
              </Box>
            )}
          </Box>

          {/* SECTION 2: Submitter Info */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.25, border: '1px solid #f1f5f9', borderRadius: '6px', bgcolor: '#f8fafc' }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 900, color: '#15803d', textTransform: 'uppercase' }}>2. Người nộp hồ sơ (*)</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder="Mã NV nộp thay..."
                value={submitterSearchCode}
                onChange={(e) => setSubmitterSearchCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmitter()}
                sx={{
                  flexGrow: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    fontSize: '12px',
                    height: 32,
                    '& fieldset': { borderColor: '#cbd5e1' }
                  }
                }}
              />
              <IconButton 
                onClick={handleSearchSubmitter}
                sx={{ 
                  bgcolor: '#64748b', 
                  color: '#ffffff', 
                  borderRadius: '6px',
                  width: 32,
                  height: 32,
                  '&:hover': { bgcolor: '#475569' } 
                }}
              >
                <SearchIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder="Họ tên người nộp..."
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                sx={{
                  flex: 1.5,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '6px',
                    height: 32,
                    fontSize: '11.5px',
                    backgroundColor: '#ffffff'
                  }
                }}
              />
              <TextField
                size="small"
                placeholder="SĐT người nộp..."
                value={submitterPhone}
                onChange={(e) => setSubmitterPhone(e.target.value)}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '6px',
                    height: 32,
                    fontSize: '11.5px',
                    backgroundColor: '#ffffff'
                  }
                }}
              />
            </Box>
          </Box>

          {/* SECTION 3: Sickness and Insurance Details */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {/* Nhóm bệnh */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b' }}>Nhóm bệnh lý (*)</Typography>
              <Select
                size="small"
                value={diseaseGroupId}
                onChange={(e) => setDiseaseGroupId(e.target.value)}
                sx={{ height: 32, fontSize: '12px', fontWeight: 700, borderRadius: '6px' }}
              >
                {DISEASE_GROUPS.map(g => (
                  <MenuItem key={g.id} value={g.id} sx={{ fontSize: '12px', fontWeight: 700 }}>{g.name}</MenuItem>
                ))}
              </Select>
            </Box>

            {/* Tên bệnh lý */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b' }}>Tên bệnh lý chỉ định (*)</Typography>
              <TextField
                size="small"
                placeholder="Nhập tên bệnh chi tiết..."
                value={diseaseName}
                onChange={(e) => setDiseaseName(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '6px',
                    height: 32,
                    fontSize: '12px',
                    '& fieldset': { borderColor: '#cbd5e1' }
                  }
                }}
              />
            </Box>

            {/* Tên bảo hiểm chế độ */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b' }}>Chế độ bảo hiểm áp dụng (*)</Typography>
              <Select
                size="small"
                value={insuranceId}
                onChange={(e) => handleInsuranceChange(e.target.value)}
                sx={{ height: 32, fontSize: '12px', fontWeight: 700, borderRadius: '6px' }}
              >
                {INSURANCE_ITEMS.map(ins => (
                  <MenuItem key={ins.id} value={ins.id} sx={{ fontSize: '12px', fontWeight: 700 }}>{ins.fullName}</MenuItem>
                ))}
              </Select>
            </Box>

            {/* Auto filled fields from Insurance */}
            {insuranceId && (
              <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                <Box sx={{ flex: '1 1 40%' }}>
                  <Typography sx={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>Mã bệnh BHXH:</Typography>
                  <Typography sx={{ fontSize: '11.5px', color: '#0f172a', fontWeight: 800 }}>{insuranceCode}</Typography>
                </Box>
                <Box sx={{ flex: '1 1 40%' }}>
                  <Typography sx={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>Loại bệnh:</Typography>
                  <Typography sx={{ fontSize: '11.5px', color: '#15803d', fontWeight: 800 }}>{longShortTerm}</Typography>
                </Box>
                <Box sx={{ flex: '1 1 100%' }}>
                  <Typography sx={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>Phân loại bảo hiểm:</Typography>
                  <Typography sx={{ fontSize: '11.5px', color: '#334155', fontWeight: 750 }}>{diseaseClassification}</Typography>
                </Box>
              </Box>
            )}

            {/* Loại chứng từ */}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b' }}>Loại giấy tờ (*)</Typography>
                <Select
                  size="small"
                  value={docTypeId}
                  onChange={(e) => handleDocTypeChange(e.target.value)}
                  sx={{ height: 32, fontSize: '12px', fontWeight: 700, borderRadius: '6px' }}
                >
                  {DOCUMENT_TYPES.map(doc => (
                    <MenuItem key={doc.id} value={doc.id} sx={{ fontSize: '12px', fontWeight: 700 }}>{doc.name}</MenuItem>
                  ))}
                </Select>
              </Box>
              <Box sx={{ flex: 0.8, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b' }}>Hình thức điều trị</Typography>
                <TextField
                  size="small"
                  value={typeOfDisease}
                  InputProps={{ readOnly: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '6px',
                      height: 32,
                      fontSize: '11.5px',
                      backgroundColor: '#f8fafc',
                      '& fieldset': { borderColor: '#cbd5e1' }
                    }
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* SECTION 4: Time Off & Total Days */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b' }}>Nghỉ từ ngày (*)</Typography>
              <TextField
                type="date"
                value={offFrom}
                onChange={(e) => handleFromDateChange(e.target.value)}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '6px',
                    height: 32,
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#334155',
                    '& fieldset': { borderColor: '#cbd5e1' }
                  }
                }}
              />
            </Box>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b' }}>Nghỉ đến ngày (*)</Typography>
              <TextField
                type="date"
                value={offTo}
                onChange={(e) => handleToDateChange(e.target.value)}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '6px',
                    height: 32,
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#334155',
                    '& fieldset': { borderColor: '#cbd5e1' }
                  }
                }}
              />
            </Box>
            <Box sx={{ width: 80, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b' }}>Ngày nghỉ</Typography>
              <TextField
                value={`${totalDays} ngày`}
                InputProps={{ readOnly: true }}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '6px',
                    height: 32,
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#15803d',
                    backgroundColor: '#e8f5e9',
                    '& fieldset': { borderColor: 'transparent' }
                  }
                }}
              />
            </Box>
          </Box>

          {/* SECTION 5: Child Information (Conditional) */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={isChildChecked} 
                  onChange={(e) => setIsChildChecked(e.target.checked)} 
                  color="primary"
                  size="small"
                />
              }
              label={
                <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ChildIcon sx={{ fontSize: 16, color: '#15803d' }} /> Nghỉ chăm con ốm (Dưới 7 tuổi)
                </Typography>
              }
              sx={{ m: 0 }}
            />

            {isChildChecked && (
              <Box sx={{ display: 'flex', gap: 1.5, p: 1.25, bgcolor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>Ngày sinh của con (*)</Typography>
                  <TextField
                    type="date"
                    value={childDob}
                    onChange={(e) => setChildDob(e.target.value)}
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '6px',
                        height: 30,
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#ffffff'
                      }
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>Mã số BHXH của con (*)</Typography>
                  <TextField
                    placeholder="Mã sổ BHXH con..."
                    value={childInsuranceCode}
                    onChange={(e) => setChildInsuranceCode(e.target.value)}
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '6px',
                        height: 30,
                        fontSize: '11.5px',
                        backgroundColor: '#ffffff'
                      }
                    }}
                  />
                </Box>
              </Box>
            )}
          </Box>

          {/* SECTION 6: Document Checklist */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <DocIcon sx={{ fontSize: 16, color: '#15803d' }} /> Hồ sơ chứng từ đính kèm (*)
            </Typography>
            <FormGroup sx={{ p: 1, border: '1px solid #cbd5e1', borderRadius: '6px', maxHeight: 150, overflowY: 'auto' }}>
              {DOCUMENT_ITEMS.map(doc => (
                <FormControlLabel
                  key={doc.id}
                  control={
                    <Checkbox 
                      checked={selectedDocs.includes(doc.name)} 
                      onChange={() => handleDocToggle(doc.name)} 
                      size="small"
                      color="primary"
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>{doc.name}</Typography>
                  }
                  sx={{ mb: 0.25 }}
                />
              ))}
            </FormGroup>
          </Box>

          {/* Ghi chú */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b' }}>Ghi chú / Nhận xét thêm</Typography>
            <TextField
              placeholder="Nhập ghi chú ý khoa..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              size="small"
              multiline
              rows={2}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '6px',
                  fontSize: '12px',
                  '& fieldset': { borderColor: '#cbd5e1' },
                  '&.Mui-focused fieldset': { borderColor: '#15803d' },
                }
              }}
            />
          </Box>

          {/* Save Action Button */}
          <Button 
            variant="contained" 
            fullWidth 
            onClick={handleSave}
            startIcon={<CheckCircleIcon />}
            sx={{ 
              height: 38,
              fontSize: '13px',
              fontWeight: 800,
              borderRadius: '6px',
              textTransform: 'none',
              bgcolor: '#15803d',
              boxShadow: 'none',
              mt: 1,
              '&:hover': { bgcolor: '#166534', boxShadow: 'none' }
            }}
          >
            Lưu hồ sơ BHXH
          </Button>
        </Paper>

        {/* RIGHT COLUMN: History List & Filters */}
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
              Danh sách nghỉ hưởng BHXH
            </Typography>
            
            {/* Action filters */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <TextField 
                placeholder="Tìm tên hoặc ID..."
                size="small"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
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
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>Từ:</Typography>
                <TextField 
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
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
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
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
                    <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Nhân viên</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Bệnh lý & Chế độ BHXH</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }} align="center">Thời gian nghỉ chỉ định</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Hồ sơ & Giấy tờ</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.25, px: 2, fontWeight: 800, fontSize: '11px', color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }} align="center">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedRecords.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell sx={{ py: 1.25, px: 2 }}>
                        <Typography sx={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 800 }}>{record.fullName}</Typography>
                        <Typography sx={{ fontSize: '10.5px', color: 'text.secondary', fontWeight: 600 }}>ID: {record.employeeId}</Typography>
                        <Typography sx={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500 }}>{record.dept} | {record.factory}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.25, px: 2 }}>
                        <Typography sx={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 800, mb: 0.5 }}>{record.sickness}</Typography>
                        <Chip 
                          label={record.insuranceName} 
                          size="small" 
                          sx={{ 
                            height: 18, 
                            fontSize: '9.5px', 
                            fontWeight: 800, 
                            bgcolor: record.insuranceName.includes('CD03') ? '#e0f2fe' : '#e8f5e9', 
                            color: record.insuranceName.includes('CD03') ? '#0369a1' : '#15803d', 
                            borderRadius: '4px' 
                          }} 
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.25, px: 2 }}>
                        <Typography sx={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 800 }}>
                          {new Date(record.offFrom).toLocaleDateString('vi-VN')} - {new Date(record.offTo).toLocaleDateString('vi-VN')}
                        </Typography>
                        <Typography sx={{ fontSize: '10.5px', color: '#15803d', fontWeight: 900 }}>
                          {record.totalDays} ngày nghỉ (trừ CN)
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.25, px: 2 }}>
                        <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>
                          Nộp: {record.submitterName}
                        </Typography>
                        <Typography sx={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500 }}>
                          {record.checkedDocs.length} chứng từ đính kèm
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.25, px: 2 }}>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="In lại giấy chứng nhận">
                            <IconButton size="small" sx={{ color: '#15803d', '&:hover': { bgcolor: 'rgba(21,128,61,0.05)' } }}>
                              <PrintIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xuất file XML BHXH">
                            <IconButton size="small" sx={{ color: '#0284c7', '&:hover': { bgcolor: 'rgba(2,132,199,0.05)' } }}>
                              <ExportIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                        <Typography color="text.secondary" fontWeight={650} fontSize={'13px'} sx={{ fontStyle: 'italic' }}>
                          Chưa có hồ sơ nghỉ hưởng BHXH nào được ghi nhận.
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
