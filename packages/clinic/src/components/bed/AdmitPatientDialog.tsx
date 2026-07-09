import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Autocomplete,
  TextField, 
  Box,
  Typography
} from '@mui/material';
import EmployeeSearchCard, { EmployeeInfo } from '../medicine/EmployeeSearchCard';
import { Bed } from './BedStatusGrid';

interface AdmitPatientDialogProps {
  open: boolean;
  bed: Bed | null;
  onClose: () => void;
  onAdmit: (data: { employeeId: string; fullName: string; sickness: string }) => void;
}

const MOCK_SICKNESSES = [
  { idSick: "S001", nameSick: "Cảm cúm / Sốt" },
  { idSick: "S002", nameSick: "Đau đầu / Chóng mặt" },
  { idSick: "S003", nameSick: "Đau bụng / Tiêu chảy" },
  { idSick: "S004", nameSick: "Chấn thương phần mềm" },
  { idSick: "S005", nameSick: "Nhức mỏi cơ xương khớp" },
  { idSick: "S006", nameSick: "Huyết áp thấp / Mệt mỏi" }
];

export default function AdmitPatientDialog({ open, bed, onClose, onAdmit }: AdmitPatientDialogProps) {
  const { t } = useTranslation();
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [sickness, setSickness] = useState<string | null>(null);

  const handleEmployeeFound = (emp: EmployeeInfo | null) => {
    setEmployee(emp);
  };

  const handleSubmit = () => {
    if (!employee || !sickness) return;
    onAdmit({
      employeeId: employee.idStaff,
      fullName: employee.fullName,
      sickness
    });
    setEmployee(null);
    setSickness(null);
  };

  const handleClose = () => {
    setEmployee(null);
    setSickness(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      sx={{
        '& *': { fontFamily: "'Be Vietnam Pro', sans-serif !important" }
      }}
      PaperProps={{
        sx: { borderRadius: '12px' }
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, fontSize: 16, pb: 1.5 }}>
        {t('clinic.bed.admitTitle', 'Tiếp nhận bệnh nhân nằm giường')} {bed?.bedName}
      </DialogTitle>
      <DialogContent dividers sx={{ py: 2.5 }}>
        <Box sx={{ mb: 3.5 }}>
          <Typography variant="caption" sx={{ mb: 1, fontWeight: 800, color: 'text.secondary', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t('clinic.bed.searchEmployee', '1. TÌM KIẾM NHÂN VIÊN')}
          </Typography>
          <EmployeeSearchCard onEmployeeFound={handleEmployeeFound} />
        </Box>

        {employee && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="caption" sx={{ mb: 1.5, fontWeight: 800, color: 'text.secondary', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('clinic.bed.admitDetails', '2. CHI TIẾT NHẬP VIỆN')}
            </Typography>
            <Autocomplete
              options={MOCK_SICKNESSES.map(s => s.nameSick)}
              value={sickness}
              onChange={(_, newValue) => setSickness(newValue)}
              freeSolo
              renderInput={(params) => (
                <TextField 
                  {...params}
                  fullWidth
                  size="small"
                  label={t('clinic.bed.sickness', 'Triệu chứng / Lý do nằm giường')}
                  placeholder={t('clinic.bed.sicknessPlaceholder', 'Chọn hoặc nhập triệu chứng...')}
                  onChange={(e) => setSickness(e.target.value)}
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                />
              )}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button 
          onClick={handleClose} 
          sx={{
            fontWeight: 800,
            textTransform: 'none',
            color: '#64748b',
            borderRadius: '8px'
          }}
        >
          {t('common.cancel', 'Hủy')}
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={!employee || !sickness}
          sx={{
            bgcolor: '#15803d',
            fontWeight: 800,
            textTransform: 'none',
            borderRadius: '8px',
            px: 3,
            '&:hover': { bgcolor: '#166534' },
            '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' }
          }}
        >
          {t('clinic.bed.admitButton', 'Bắt đầu tính giờ')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
