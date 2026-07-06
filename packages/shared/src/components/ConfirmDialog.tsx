import React from 'react';
import {
  Dialog, DialogContent, DialogActions, Button, Box, Typography
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Help as HelpIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  /** 'danger' = red (delete/clear), 'safe' = green (save/confirm), 'info' = blue (general), 'warning' = orange */
  variant?: 'danger' | 'safe' | 'info' | 'warning';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}

export const defaultConfirmDialog: ConfirmDialogState = {
  open: false, title: '', message: ''
};

interface ConfirmDialogProps {
  state: ConfirmDialogState;
  onClose: () => void;
}

const variantConfig = {
  danger: {
    icon: <WarningIcon sx={{ fontSize: 64, color: '#f59e0b' }} />,
    bgcolor: '#fffbeb',
    btnColor: 'error' as const,
    defaultConfirmText: 'Xác nhận',
  },
  safe: {
    icon: <CheckCircleIcon sx={{ fontSize: 64, color: '#22c55e' }} />,
    bgcolor: '#f0fdf4',
    btnColor: 'success' as const,
    defaultConfirmText: 'Đồng ý',
  },
  info: {
    icon: <HelpIcon sx={{ fontSize: 64, color: '#3b82f6' }} />,
    bgcolor: '#eff6ff',
    btnColor: 'primary' as const,
    defaultConfirmText: 'OK',
  },
  warning: {
    icon: <WarningIcon sx={{ fontSize: 64, color: '#f59e0b' }} />,
    bgcolor: '#fffbeb',
    btnColor: 'warning' as const,
    defaultConfirmText: 'Xác nhận',
  },
  primary: {
    icon: <LogoutIcon sx={{ fontSize: 64, color: 'primary.main' }} />,
    bgcolor: 'background.paper',
    btnColor: 'primary' as const,
    defaultConfirmText: 'Xác nhận',
  },
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ state, onClose }) => {
  const variant = state.variant || 'primary';
  const cfg = variantConfig[variant];

  return (
    <Dialog
      open={state.open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }
      }}
    >
      <Box sx={{ textAlign: 'center', pt: 4, pb: 1, px: 3, bgcolor: cfg.bgcolor }}>
        {cfg.icon}
        <Typography variant="h6" sx={{ fontWeight: 800, mt: 1.5, color: '#1e293b' }}>
          {state.title}
        </Typography>
      </Box>
      <DialogContent sx={{ textAlign: 'center', py: 2.5, px: 3 }}>
        <Typography sx={{ color: '#475569', fontSize: '1rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {state.message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3, px: 3, '& > *:not(:last-child)': { mr: 1, mb: 1 } }}>
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          sx={{ fontWeight: 700, borderRadius: 1, px: 4, minWidth: 100 }}
        >
          {state.cancelText || 'Hủy'}
        </Button>
        <Button
          onClick={() => { state.onConfirm?.(); onClose(); }}
          variant="contained"
          color={cfg.btnColor}
          disableElevation
          sx={{ fontWeight: 700, borderRadius: 1, px: 4, minWidth: 100 }}
        >
          {state.confirmText || cfg.defaultConfirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
