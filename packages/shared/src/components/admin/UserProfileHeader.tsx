import React from 'react';
import { Box, Typography, Button, Tooltip, IconButton, Switch } from '@mui/material';
import { 
  ChevronLeft as ChevronLeftIcon, Apps as AppsIcon,
  Factory as FactoryIcon, Edit as EditIcon, Delete as DeleteIcon 
} from '@mui/icons-material';
import { type UserWithPermissions } from '../../services/permissionService';

interface UserProfileHeaderProps {
  selectedUser: UserWithPermissions;
  isMobile: boolean;
  onBackToList: () => void;
  themeColors: { main: string; dark: string; light: string };
  isSuperAdmin: boolean;
  myRoleLevel: number;
  onAppsClick: () => void;
  onFactoryClick: () => void;
  onEditClick: () => void;
  onToggleActive: (checked: boolean) => void;
  onDeleteClick: () => void;
  t: any;
}

export const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({
  selectedUser,
  isMobile,
  onBackToList,
  themeColors,
  isSuperAdmin,
  myRoleLevel,
  onAppsClick,
  onFactoryClick,
  onEditClick,
  onToggleActive,
  onDeleteClick,
  t
}) => {
  return (
    <Box sx={{ 
      p: { xs: 1.5, md: 1.75 }, borderBottom: '1px solid #f1f5f9', background: '#fff', 
      display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' 
    }}>
      {isMobile && (
        <Button
          size="small"
          variant="text"
          startIcon={<ChevronLeftIcon />}
          onClick={onBackToList}
          sx={{ width: '100%', justifyContent: 'flex-start', mb: 0.5, fontWeight: 800, color: themeColors.main, textTransform: 'none' }}
        >
          {t('admin.backToUserList', 'Quay lại danh sách')}
        </Button>
      )}
      <Box sx={{
        width: 44, height: 44, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: selectedUser.isAdmin ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' : `linear-gradient(135deg, ${themeColors.main} 0%, ${themeColors.dark} 100%)`, 
        color: '#fff', fontWeight: 800, fontSize: 18, boxShadow: `0 4px 10px ${themeColors.light}`
      }}>
        {(selectedUser.employeeName || selectedUser.employeeCode)[0]?.toUpperCase()}
      </Box>
      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.2 }}>{selectedUser.employeeName || selectedUser.employeeCode}</Typography>
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mt: 0.25 }}>
           {selectedUser.employeeCode} <span style={{ color: '#cbd5e1', margin: '0 4px' }}>|</span> {selectedUser.roleLabel} <span style={{ color: '#cbd5e1', margin: '0 4px' }}>|</span> {selectedUser.factory || 'No Factory'} / {selectedUser.dept || 'No Dept'}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        {(isSuperAdmin || myRoleLevel <= 1) && (
          <Button size="small" variant="outlined" startIcon={<AppsIcon />}
            onClick={onAppsClick}
            sx={{ borderRadius: 8, fontSize: 13, fontWeight: 700, borderColor: '#cbd5e1', color: '#475569', '&:hover': { borderColor: themeColors.main, color: themeColors.main, background: themeColors.light } }}>
            Apps
          </Button>
        )}
        {myRoleLevel <= 1 && (
          <Button size="small" variant="outlined" startIcon={<FactoryIcon />}
            onClick={onFactoryClick}
            sx={{ borderRadius: 8, fontSize: 13, fontWeight: 700, borderColor: '#cbd5e1', color: '#475569', '&:hover': { borderColor: themeColors.main, color: themeColors.main, background: themeColors.light } }}>
            Factory
          </Button>
        )}
        <Tooltip title="Edit user info">
          <IconButton size="small"
            sx={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: themeColors.main, transition: 'all 0.2s', '&:hover': { background: themeColors.light, transform: 'translateY(-2px)', borderColor: themeColors.main } }}
            onClick={onEditClick}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box sx={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, px: 1, py: 0.25, transition: 'all 0.2s', '&:focus-within': { borderColor: themeColors.main, boxShadow: `0 0 0 2px ${themeColors.light}` } }}>
          <Switch checked={selectedUser.isActive} size="small"
            onChange={(_, checked) => onToggleActive(checked)} />
        </Box>
        <Tooltip title={t('admin.deleteUserTooltip')}>
          <IconButton size="small" onClick={onDeleteClick} sx={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #ffe4e6', transition: 'all 0.2s', '&:hover': { background: '#ffe4e6', transform: 'translateY(-2px)' } }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};
