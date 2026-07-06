import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Alert, CircularProgress, IconButton, InputAdornment
} from '@mui/material';
import { Visibility, VisibilityOff, LockReset as LockResetIcon } from '@mui/icons-material';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const { t } = useTranslation();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleReset = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
    setShowPassword(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError(t('changePassword.errorOldRequired'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('changePassword.errorMismatch'));
      return;
    }

    // Backend rule checking (front-end soft check)
    if (newPassword.length < 12) {
      setError(t('changePassword.errorLength'));
      return;
    }
    if (!/.*[A-Z].*/.test(newPassword)) {
      setError(t('changePassword.errorUppercase'));
      return;
    }
    if (!/.*[a-z].*/.test(newPassword)) {
      setError(t('changePassword.errorLowercase'));
      return;
    }
    if (!/.*[0-9].*/.test(newPassword)) {
      setError(t('changePassword.errorDigit'));
      return;
    }
    if (!/.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?].*/.test(newPassword)) {
      setError(t('changePassword.errorSpecial'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/accounts/change-password-with-old`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('changePassword.errorServer'));
      }

      setSuccess(t('changePassword.success'));
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#2e7d32', fontWeight: 700 }}>
        <LockResetIcon /> {t('changePassword.title')}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <TextField
            label={t('changePassword.oldPassword')}
            type={showPassword ? 'text' : 'password'}
            fullWidth
            margin="normal"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            disabled={loading || !!success}
            InputProps={{
               endAdornment: (
                 <InputAdornment position="end">
                   <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                     {showPassword ? <VisibilityOff /> : <Visibility />}
                   </IconButton>
                 </InputAdornment>
               ),
            }}
          />
          <TextField
             label={t('changePassword.newPassword')}
             type={showPassword ? 'text' : 'password'}
             fullWidth
             margin="normal"
             value={newPassword}
             onChange={(e) => setNewPassword(e.target.value)}
             disabled={loading || !!success}
             helperText={t('changePassword.requirements')}
          />
          <TextField
             label={t('changePassword.confirmPassword')}
             type={showPassword ? 'text' : 'password'}
             fullWidth
             margin="normal"
             value={confirmPassword}
             onChange={(e) => setConfirmPassword(e.target.value)}
             disabled={loading || !!success}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={handleClose} color="inherit" disabled={loading}>
                         {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !!success}
            sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : t('changePassword.submit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
