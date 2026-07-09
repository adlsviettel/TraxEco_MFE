import React from 'react';
import { Paper, Box, CircularProgress, Typography, Button } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { type UserWithPermissions } from '../../services/permissionService';

interface UserListProps {
  users: UserWithPermissions[];
  filteredUsers: UserWithPermissions[];
  selectedUser: UserWithPermissions | null;
  onUserSelect: (user: UserWithPermissions) => void;
  themeColors: { main: string; dark: string; light: string };
  loading: boolean;
  fetchUsers: () => void;
  t: any;
}

export const UserList: React.FC<UserListProps> = ({
  users,
  filteredUsers,
  selectedUser,
  onUserSelect,
  themeColors,
  loading,
  fetchUsers,
  t
}) => {
  return (
    <Paper elevation={0} sx={{ 
      width: { xs: '100%', lg: 360 }, minWidth: { lg: 320 }, 
      maxHeight: { xs: 550, lg: 'none' },
      borderRadius: 4, border: '1px solid rgba(255,255,255,0.8)', 
      background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.03)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0
    }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (!Array.isArray(users) || users.length === 0) ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
          <Typography variant="body2" color="text.secondary">{t('admin.clickToLoad', 'Click to load users')}</Typography>
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchUsers} disableElevation
            sx={{ borderRadius: 8, fontWeight: 700, backgroundColor: themeColors.main, '&:hover': { backgroundColor: themeColors.dark } }}>
            {t('admin.loadUsers', 'Load Users')}
          </Button>
        </Box>
      ) : (
        <Box sx={{ 
          flex: 1, overflowY: 'auto', p: 1.5,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 10 }
        }}>
          {filteredUsers.map((user, idx) => {
            const isSelected = selectedUser?.employeeCode === user.employeeCode && selectedUser?.employeeName === user.employeeName;
            const stableKey = user.employeeCode || user.employeeName || `${user.factory || 'unknown'}-${user.dept || 'unknown'}-${idx}`;
            return (
              <Box key={stableKey}
                onClick={() => onUserSelect(user)}
                sx={{
                  p: 1.5, mb: 1, cursor: 'pointer', borderRadius: '8px',
                  border: isSelected ? `2px solid ${themeColors.main}` : '2px solid transparent',
                  backgroundColor: isSelected ? '#fff' : 'transparent',
                  opacity: user.isActive ? 1 : 0.6,
                  boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': { 
                    backgroundColor: '#fff', 
                    transform: isSelected ? 'none' : 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{
                    width: 38, height: 38, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: user.isAdmin 
                      ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' 
                      : `linear-gradient(135deg, ${themeColors.main} 0%, ${themeColors.dark} 100%)`, 
                    color: '#fff', fontWeight: 800, fontSize: 14
                  }}>
                    {(user.employeeName || user.employeeCode || '?')[0]?.toUpperCase()}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {user.employeeName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.25, fontSize: '0.75rem' }}>
                      <span>{user.employeeCode}</span>
                      <span style={{ fontWeight: 700, color: user.isAdmin ? '#2563eb' : '#64748b' }}>{user.roleLabel}</span>
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Paper>
  );
};
