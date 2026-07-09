import React from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { WarningRounded as WarningIcon, Save as SaveIcon } from '@mui/icons-material';
import { type PendingChange } from '../../hooks/usePermissionEditor';

interface PermissionActionFooterProps {
  pendingChanges: Map<string, PendingChange>;
  saving: boolean;
  onSave: () => void;
  themeColors: { main: string; dark: string; light: string };
  t: any;
}

export const PermissionActionFooter: React.FC<PermissionActionFooterProps> = ({
  pendingChanges,
  saving,
  onSave,
  themeColors,
  t
}) => {
  return (
    <Box sx={{ p: 2, borderTop: '2px solid #e0e0e0', background: '#fafafa', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', '& > *:not(:last-child)': { mr: 2, mb: 2 } }}>
      {pendingChanges.size > 0 && (
        <Typography variant="body2" color="warning.main" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', '& > *:not(:last-child)': { mr: 0.5, mb: 0.5 } }}>
          <WarningIcon fontSize="small" /> {t('admin.unsavedChanges', 'Unsaved changes ({{count}})', { count: pendingChanges.size })}
        </Typography>
      )}
      <Button variant="contained" size="large" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
        onClick={onSave} disabled={pendingChanges.size === 0 || saving} disableElevation
        sx={{ borderRadius: 1.5, fontWeight: 700, px: 4, py: 1, backgroundColor: themeColors.main, '&:hover': { backgroundColor: themeColors.dark } }}>
        {t('admin.savePermissions', 'SAVE PERMISSIONS')}
      </Button>
    </Box>
  );
};
