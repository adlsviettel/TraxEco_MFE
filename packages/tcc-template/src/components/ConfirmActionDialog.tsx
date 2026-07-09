import React from 'react';
import { Dialog, DialogTitle, DialogContent, Typography, DialogActions, CircularProgress } from '@mui/material';
import { AppButton } from '@traxeco/shared';

interface ConfirmActionDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  loading: boolean;
  onConfirm: () => void;
  color?: 'error' | 'warning' | 'primary' | 'success';
  sxBgColor?: string;
  sxHoverColor?: string;
}

export function ConfirmActionDialog({
  open,
  onClose,
  title,
  description,
  confirmText,
  cancelText,
  loading,
  onConfirm,
  color = 'primary',
  sxBgColor,
  sxHoverColor
}: ConfirmActionDialogProps) {
  return (
    <Dialog open={open} onClose={() => !loading && onClose()}>
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2">{description}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton 
          onClick={onClose} 
          disabled={loading}
          variant="outlined"
          customVariant="secondary"
        >
          {cancelText}
        </AppButton>
        <AppButton 
          onClick={onConfirm} 
          variant="contained" 
          color={color}
          disabled={loading}
          sx={{ 
            bgcolor: sxBgColor, 
            '&:hover': { bgcolor: sxHoverColor } 
          }}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : confirmText}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
