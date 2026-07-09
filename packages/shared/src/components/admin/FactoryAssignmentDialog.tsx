import React from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Checkbox, Typography, DialogActions, Button } from '@mui/material';
import { type UserWithPermissions } from '../../services/permissionService';

interface FactoryAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  user: UserWithPermissions | null;
  currentAppCode: string | null;
  availableFactories: string[];
  selectedFactories: string[];
  setSelectedFactories: React.Dispatch<React.SetStateAction<string[]>>;
  onSave: () => void;
  themeColors: { main: string; dark: string; light: string };
  t: any;
}

export const FactoryAssignmentDialog: React.FC<FactoryAssignmentDialogProps> = ({
  open,
  onClose,
  user,
  currentAppCode,
  availableFactories,
  selectedFactories,
  setSelectedFactories,
  onSave,
  themeColors,
  t
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Factory Permissions — {user?.employeeName}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Select the factories this user can access in {currentAppCode || 'FGS_WH'}:
        </Typography>
        {availableFactories.map(fCode => (
          <Box key={fCode} sx={{ display: 'flex', alignItems: 'center', '& > *:not(:last-child)': { mr: 1, mb: 1 }, py: 0.5 }}>
            <Checkbox size="small" checked={selectedFactories.includes(fCode)}
              onChange={(_, checked) => {
                setSelectedFactories(prev => checked ? [...prev, fCode] : prev.filter(c => c !== fCode));
              }}
              sx={{ '&.Mui-checked': { color: themeColors.main } }} />
            <Typography variant="body2">{fCode}</Typography>
          </Box>
        ))}
        {availableFactories.length === 0 && (
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', p: 2, textAlign: 'center' }}>
            No factories found.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('admin.cancel', 'Hủy')}</Button>
        <Button variant="contained" onClick={onSave}
          sx={{ backgroundColor: themeColors.main, '&:hover': { backgroundColor: themeColors.dark } }}>
          {t('admin.saved', 'Lưu')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
