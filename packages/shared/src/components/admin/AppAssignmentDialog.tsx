import React from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Checkbox, Typography, DialogActions, Button } from '@mui/material';
import { type AppInfo } from '../../services/appService';
import { type UserWithPermissions } from '../../services/permissionService';

interface AppAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  user: UserWithPermissions | null;
  apps: AppInfo[];
  selectedApps: string[];
  setSelectedApps: React.Dispatch<React.SetStateAction<string[]>>;
  onSave: () => void;
  themeColors: { main: string; dark: string; light: string };
  t: any;
}

export const AppAssignmentDialog: React.FC<AppAssignmentDialogProps> = ({
  open,
  onClose,
  user,
  apps,
  selectedApps,
  setSelectedApps,
  onSave,
  themeColors,
  t
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {t('admin.assignAppsTitle', 'Assign Apps')} — {user?.employeeName}
      </DialogTitle>
      <DialogContent>
        {apps.map(app => (
          <Box key={app.appCode} sx={{ display: 'flex', alignItems: 'center', '& > *:not(:last-child)': { mr: 1, mb: 1 }, py: 0.5 }}>
            <Checkbox size="small" checked={selectedApps.includes(app.appCode)}
              onChange={(_, checked) => {
                setSelectedApps(prev => checked ? [...prev, app.appCode] : prev.filter(c => c !== app.appCode));
              }}
              sx={{ '&.Mui-checked': { color: themeColors.main } }} />
            <Typography variant="body2">{app.appCode} — {app.appName}</Typography>
          </Box>
        ))}
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
