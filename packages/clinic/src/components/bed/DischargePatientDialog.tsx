import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography,
  Box
} from '@mui/material';
import { Bed } from './BedStatusGrid';

interface DischargePatientDialogProps {
  open: boolean;
  bed: Bed | null;
  onClose: () => void;
  onDischarge: () => void;
}

export default function DischargePatientDialog({ open, bed, onClose, onDischarge }: DischargePatientDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xs" 
      fullWidth
      sx={{
        '& *': { fontFamily: "'Outfit', sans-serif !important" }
      }}
      PaperProps={{
        sx: { borderRadius: '12px' }
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, fontSize: 16, pb: 1.5 }}>
        {t('clinic.bed.dischargeTitle', 'Hoàn tất thủ tục & Trả giường')}
      </DialogTitle>
      <DialogContent dividers sx={{ py: 2 }}>
        {bed && (
          <Box>
            <Typography variant="body2" sx={{ color: '#475569', mb: 2, fontWeight: 500, lineHeight: 1.5 }}>
              {t('clinic.bed.confirmDischarge', 'Bạn có chắc chắn muốn cho bệnh nhân sau xuất giường nằm và trả giường về trạng thái trống?')}
            </Typography>
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: 14.5 }}>
                {bed.fullName}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mt: 0.25 }}>
                Mã NV: {bed.employeeId}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1.25, color: '#1e293b' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Triệu chứng:</span> {bed.sickness}
              </Typography>
              <Typography variant="caption" sx={{ mt: 1, color: '#64748b', display: 'block' }}>
                Vào lúc: {bed.admitTime}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button 
          onClick={onClose} 
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
          onClick={onDischarge} 
          variant="contained" 
          sx={{
            bgcolor: '#ef4444',
            fontWeight: 800,
            textTransform: 'none',
            borderRadius: '8px',
            px: 3,
            '&:hover': { bgcolor: '#dc2626' }
          }}
        >
          {t('clinic.bed.dischargeButton', 'Xác nhận kết thúc')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
