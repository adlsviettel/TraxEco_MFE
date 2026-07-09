import React from 'react';
import { Dialog, DialogTitle, DialogContent, Typography, DialogActions, Button } from '@mui/material';
import { WarningRounded as WarningIcon } from '@mui/icons-material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  t: any;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  onConfirm,
  onClose,
  t
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}>
      <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <WarningIcon sx={{ color: '#e11d48', fontSize: 28 }} />
        {title}
      </DialogTitle>
      <DialogContent sx={{ pb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.9rem', lineHeight: 1.6 }}>
          {description}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: '8px', color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}>
          {t('admin.cancel', 'Huỷ')}
        </Button>
        <Button variant="contained" color="error" onClick={onConfirm} sx={{ borderRadius: '8px', fontWeight: 800, px: 3, bgcolor: '#e11d48', textTransform: 'none', '&:hover': { bgcolor: '#be123c' } }}>
          {t('admin.confirmDelete', 'Xác nhận xóa')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
