import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Paper, Box, Typography, Chip, TextField, InputAdornment, Tooltip, IconButton, Button 
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon, Search as SearchIcon, 
  PersonAdd as PersonAddIcon, GroupAdd as GroupAddIcon,
  Refresh as RefreshIcon, ChevronLeft as ChevronLeftIcon,
  Timeline as TrackingIcon
} from '@mui/icons-material';

interface AdminToolbarProps {
  isMobile: boolean;
  themeColors: { main: string; dark: string; light: string };
  search: string;
  setSearch: (s: string) => void;
  usersCount: number;
  isSuperAdmin: boolean;
  myRoleLevel: number;
  loading: boolean;
  fetchUsers: () => void;
  onAddUserClick: () => void;
  onBulkSetupClick: () => void;
  t: any;
}

export const AdminToolbar: React.FC<AdminToolbarProps> = ({
  isMobile,
  themeColors,
  search,
  setSearch,
  usersCount,
  isSuperAdmin,
  myRoleLevel,
  loading,
  fetchUsers,
  onAddUserClick,
  onBulkSetupClick,
  t
}) => {
  const location = useLocation();
  const nav = useNavigate();

  if (isMobile) {
    return (
      <Paper elevation={0} sx={{ 
        p: 1, borderRadius: '10px', border: '1px solid rgba(255,255,255,1)', 
        background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.01)',
        display: 'flex', flexDirection: 'column', gap: 1
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {location.pathname === '/admin' && (
              <IconButton size="small" onClick={() => nav('/')}
                sx={{ border: '1px solid #cbd5e1', borderRadius: 1.5, color: themeColors.main, p: 0.25 }}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            )}
            <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontWeight: 800, color: themeColors.dark, letterSpacing: '-0.3px', fontSize: 14 }}>
              <AdminIcon sx={{ fontSize: 20, p: 0.2, borderRadius: 1, background: themeColors.light, color: themeColors.main }} /> 
              {t('admin.title', 'Permission Management')}
            </Typography>
          </Box>
          <Chip 
            label={`${usersCount} ${t('admin.users', 'users')}`} 
            size="small" 
            sx={{ fontWeight: 800, height: 18, fontSize: 10, backgroundColor: '#fff', color: themeColors.main, border: '1px solid rgba(0,0,0,0.05)' }} 
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <TextField size="small" placeholder={t('admin.searchPlaceholder')}
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></InputAdornment> }}
            sx={{ 
              flex: 1,
              '& .MuiOutlinedInput-root': { 
                borderRadius: 5, backgroundColor: '#fff',
                height: 32,
                fontSize: 12,
                '& fieldset': { borderColor: '#e2e8f0' }
              } 
            }}
          />
          
          {(isSuperAdmin || myRoleLevel <= 1) && (
            <Tooltip title={t('admin.userTracking', 'User Tracking')}>
              <IconButton onClick={() => nav('/tracking')} size="small"
                sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0', p: 0.5, borderRadius: 1.5, color: '#475569', '&:hover': { bgcolor: '#eff6ff', color: themeColors.main } }}>
                <TrackingIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
          
          <Tooltip title={t('admin.createAccount')}>
            <IconButton onClick={onAddUserClick} size="small"
              sx={{ bgcolor: themeColors.main, color: '#fff', p: 0.5, borderRadius: 1.5, '&:hover': { bgcolor: themeColors.dark } }}>
              <PersonAddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          
          {(isSuperAdmin || myRoleLevel <= 1) && (
            <Tooltip title={t('admin.bulkSetup', 'Bulk Setup')}>
              <IconButton onClick={onBulkSetupClick} size="small"
                sx={{ background: `linear-gradient(135deg, ${themeColors.main} 0%, ${themeColors.dark} 100%)`, color: '#fff', p: 0.5, borderRadius: 1.5, '&:hover': { background: `linear-gradient(135deg, ${themeColors.dark} 0%, ${themeColors.main} 100%)` } }}>
                <GroupAddIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title={t('admin.reloadTooltip')}>
            <IconButton onClick={fetchUsers} disabled={loading} size="small"
              sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0', p: 0.5, borderRadius: 1.5, color: '#64748b', '&:hover': { bgcolor: '#f8fafc' } }}>
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {location.pathname === '/admin' && (
            <Button variant="outlined" size="small" onClick={() => nav('/')}
              sx={{ minWidth: 'auto', borderRadius: 1.5, borderColor: themeColors.main, color: themeColors.main, py: 0.25, '&:hover': { background: themeColors.light } }}>
              ← {t('admin.home')}
            </Button>
          )}
          <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, color: themeColors.dark, letterSpacing: '-0.3px', fontSize: 18 }}>
            <AdminIcon sx={{ fontSize: 24, p: 0.3, borderRadius: 1.5, background: themeColors.light, color: themeColors.main }} /> 
            {t('admin.title', 'Permission Management')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip label={`${usersCount} ${t('admin.users', 'users')}`} sx={{ height: 24, fontWeight: 700, backgroundColor: '#fff', color: themeColors.main, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }} />
        </Box>
      </Box>

      <Paper elevation={0} sx={{ 
        p: 1, borderRadius: 2, border: '1px solid rgba(255,255,255,1)', 
        background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.01)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
          <TextField size="small" placeholder={t('admin.searchPlaceholder')}
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }}
            sx={{ 
              minWidth: 260, 
              '& .MuiOutlinedInput-root': { 
                borderRadius: 6, backgroundColor: '#fff',
                height: 32, fontSize: 13,
                transition: 'all 0.3s ease',
                '& fieldset': { borderColor: '#e2e8f0' },
                '&:hover fieldset': { borderColor: '#cbd5e1' },
                '&.Mui-focused fieldset': { borderColor: themeColors.main, borderWidth: '2px' },
                '&.Mui-focused': { boxShadow: `0 0 0 3px ${themeColors.light}` }
              } 
            }}
          />
          <Box sx={{ flexGrow: 1 }} />
          {(isSuperAdmin || myRoleLevel <= 1) && (
            <Button variant="outlined" size="small" startIcon={<TrackingIcon />} onClick={() => nav('/tracking')}
              sx={{ borderRadius: 6, height: 32, fontSize: 12, fontWeight: 700, px: 2, borderColor: '#cbd5e1', color: '#475569', transition: 'all 0.2s', '&:hover': { borderColor: '#1565c0', color: '#1565c0', backgroundColor: '#eff6ff', transform: 'translateY(-1px)' } }}>
              {t('admin.userTracking', 'User Tracking')}
            </Button>
          )}
          <Button variant="contained" size="small" disableElevation startIcon={<PersonAddIcon />} onClick={onAddUserClick}
            sx={{ borderRadius: 6, height: 32, fontSize: 12, fontWeight: 700, px: 2, backgroundColor: themeColors.main, color: '#fff', transition: 'all 0.2s', '&:hover': { backgroundColor: themeColors.dark, transform: 'translateY(-1px)', boxShadow: `0 4px 10px ${themeColors.light}` } }}>
            {t('admin.createAccount')}
          </Button>
          {(isSuperAdmin || myRoleLevel <= 1) && (
            <Button variant="contained" size="small" disableElevation startIcon={<GroupAddIcon />} onClick={onBulkSetupClick}
              sx={{ borderRadius: 6, height: 32, fontSize: 12, fontWeight: 800, px: 2, background: `linear-gradient(135deg, ${themeColors.main} 0%, ${themeColors.dark} 100%)`, color: '#fff', transition: 'all 0.2s', '&:hover': { background: `linear-gradient(135deg, ${themeColors.dark} 0%, ${themeColors.main} 100%)`, transform: 'translateY(-1px)', boxShadow: `0 4px 10px ${themeColors.light}` } }}>
              {t('admin.bulkSetup', 'Bulk Setup')}
            </Button>
          )}
          <Tooltip title={t('admin.reloadTooltip')}>
            <IconButton size="small" onClick={fetchUsers} disabled={loading} sx={{ width: 32, height: 32, background: '#fff', border: '1px solid #e2e8f0', '&:hover': { background: '#f8fafc' } }}>
              <RefreshIcon sx={{ fontSize: 18, color: '#64748b' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
    </>
  );
};
