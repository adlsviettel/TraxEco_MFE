import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, CircularProgress, Avatar, Button, Chip, Grid, Stack, Menu, MenuItem,
} from '@mui/material';
import {
  Inventory as PackingIcon,
  Apps as DefaultAppIcon,
  Logout as LogoutIcon,
  DesktopWindows as MonitorIcon,
  AdminPanelSettings as AdminIcon,
  QrCodeScanner as QrCodeIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material';
import { appService, authService, ConfirmDialog, defaultConfirmDialog, getInitials, languages } from '@traxeco/shared';
import type { AppInfo, ConfirmDialogState } from '@traxeco/shared';

const APP_CONFIG: Record<string, { icon: React.ReactNode; route: string; i18nKey?: string }> = {
  FGS_WH: {
    icon: <PackingIcon sx={{ fontSize: 36 }} />,
    route: '/fgswh',
    i18nKey: 'app.fgsWH',
  },
  FABRIC_WH: {
    icon: <DefaultAppIcon sx={{ fontSize: 36 }} />,
    route: '/fabricwh',
    i18nKey: 'app.fabricWH',
  },
  IT_INVENTORY: {
    icon: <MonitorIcon sx={{ fontSize: 36 }} />,
    route: '/it-inventory',
    i18nKey: 'app.itInventory',
  },
  F2S_DELIVERY: {
    icon: <DefaultAppIcon sx={{ fontSize: 36 }} />,
    route: '/f2s-delivery',
    i18nKey: 'app.f2sDelivery',
  },
  QCFB_WH: {
    icon: <DefaultAppIcon sx={{ fontSize: 36 }} />,
    route: '/qcfb-wh',
    i18nKey: 'app.qcfbWH',
  },
  RD_MATERIAL: {
    icon: <PackingIcon sx={{ fontSize: 36 }} />,
    route: '/rd-material',
    i18nKey: 'app.rdMaterial',
  },
  ACCESSORY_WH: {
    icon: <QrCodeIcon sx={{ fontSize: 36 }} />,
    route: '/acc-wh',
    i18nKey: 'app.accessoryWH',
  },
  TCC_TEMPLATE: {
    icon: <DefaultAppIcon sx={{ fontSize: 36 }} />,
    route: '/tcc-template',
    i18nKey: 'app.tccTemplate',
  },
  CLINIC: {
    icon: <DefaultAppIcon sx={{ fontSize: 36 }} />,
    route: '/clinic',
    i18nKey: 'app.clinic',
  },
  // Future apps can be added here
};

export default function MainPage() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [userAppCodes, setUserAppCodes] = useState<string[]>([]);
  const { t, i18n } = useTranslation();
  const [langAnchorEl, setLangAnchorEl] = useState<null | HTMLElement>(null);
  
  const handleLangMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setLangAnchorEl(event.currentTarget);
  };
  
  const handleLangMenuClose = (code?: string) => {
    if (code) {
      i18n.changeLanguage(code);
      localStorage.setItem('i18nextLng', code);
    }
    setLangAnchorEl(null);
  };

  const activeLang = languages.find(l => l.code === (i18n.language || 'vi')) || languages[0];
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(defaultConfirmDialog);

  const userName = localStorage.getItem('employeeName') || localStorage.getItem('employeeCode') || 'User';
  const employeeCode = localStorage.getItem('employeeCode') || '';
  const roleLevel = Number(localStorage.getItem('roleLevel') || '99');
  const isSuperAdmin = roleLevel <= 1;
  const isAdmin = localStorage.getItem('isAdmin') === 'true' || isSuperAdmin;

  useEffect(() => {
    const loadApps = async () => {
      try {
        const [allApps, myAppCodes] = await Promise.all([
          appService.getAllApps(),
          appService.getMyApps(),
        ]);
        
        if (!allApps || !Array.isArray(allApps)) {
           throw new Error('Danh sách ứng dụng không hợp lệ');
        }

        setApps(allApps.filter(a => a.isActive));
        setUserAppCodes(myAppCodes || []);
      } catch (err: any) {
        // Fallback: try getMyApps alone
        try {
          const myAppCodes = await appService.getMyApps();
          setUserAppCodes(myAppCodes || []);
        } catch (innerErr: any) {
          console.error(innerErr);
          setUserAppCodes([]);
        }
      } finally {
        setLoading(false);
      }
    };
    loadApps();
  }, []);

  // Filter apps user has access to
  const visibleApps = apps.length > 0
    ? apps.filter(app => userAppCodes.includes(app.appCode))
    : userAppCodes.map(code => ({
        appCode: code,
        appName: code,
        isActive: true,
      }));

  // Đã bỏ tính năng auto-redirect nếu user chỉ có 1 app (theo yêu cầu fix lỗi chớp màn hình)

  const handleLogout = () => {
    setConfirmDialog({
      open: true,
      title: t('nav.logout', 'Logout'),
      message: t('auth.logoutConfirm', 'Are you sure you want to log out?'),
      variant: 'info',
      confirmText: t('nav.logout', 'Logout'),
      cancelText: t('common.cancel', 'Cancel'),
      onConfirm: () => {
        authService.logout();
        navigate('/login');
      }
    });
  };



  return (
    <Box sx={{ display: 'flex', height: '100%', backgroundColor: '#f5f7fa', overflow: 'hidden' }}>
      
      {/* Left Panel - Branding (Hidden on mobile) */}
      <Box 
        sx={{ 
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          flex: { md: 0.8, lg: 0.6 },
          position: 'relative',
          background: 'radial-gradient(circle at 50% 0%, #333946 0%, #22262e 100%)',
          color: '#ffffff',
          overflow: 'hidden',
          height: '100%'
        }}
      >
        <Box 
          sx={{
            position: 'absolute',
            width: '150%',
            height: '150%',
            background: 'radial-gradient(circle, rgba(59,165,92,0.1) 0%, rgba(0,0,0,0) 60%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none'
          }}
        />

        <Box sx={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ mb: 6, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 85C25 85 10 65 10 45C10 20 40 10 60 10C85 10 95 30 95 50C95 75 75 85 50 85Z" fill="url(#paint0_linear)" opacity="0.9"/>
              <path d="M40 90C15 90 5 70 5 50C5 25 35 15 55 15C80 15 90 35 90 55C90 80 65 90 40 90Z" stroke="#34a853" strokeWidth="4" strokeLinecap="round"/>
              <path d="M40 90C50 60 70 30 90 15" stroke="#1e1e24" strokeWidth="3" opacity="0.7"/>
              <path d="M25 40C40 60 60 70 85 60" stroke="#1e1e24" strokeWidth="3" opacity="0.7"/>
              <defs>
                <linearGradient id="paint0_linear" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3ba55c" />
                  <stop offset="1" stopColor="#1e8449" />
                </linearGradient>
              </defs>
            </svg>
            
            <Typography variant="h4" sx={{ mt: 2, fontWeight: 300, letterSpacing: 1, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#fff', marginRight: '4px' }}>Lib</span>
              <span style={{ color: '#4caf50' }}>Inter</span>
            </Typography>
            <Typography variant="subtitle1" sx={{ letterSpacing: 6, color: '#aaa', fontWeight: 600, fontSize: '0.8rem', mt: 0.5 }}>
              GROUP
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 500, mb: 1, color: '#fff' }}>Leading</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: '#fff' }}>GARMENT TECHNOLOGIST</Typography>
            <Typography variant="h5" sx={{ fontWeight: 500, color: '#fff', mb: 4, textTransform: 'uppercase' }}>in sportswear</Typography>
          </Box>
        </Box>

        <Typography 
          variant="body2" 
          sx={{ 
            position: 'absolute', 
            bottom: 30, 
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.8rem'
          }}
        >
          Copyright © Trax Group. All rights reserved • v1.1.8-0410
        </Typography>
      </Box>

      {/* Right Panel - Wrapper */}
      <Box 
        sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          height: '100%'
        }}
      >
        {/* Top bar — Logout right */}
        <Box sx={{
          display: 'flex', justifyContent: 'flex-end', 
          p: { xs: 2.5, sm: 3 }, backgroundColor: '#f5f7fa', zIndex: 10,
          borderBottom: '1px solid rgba(0,0,0,0.03)'
        }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            {isAdmin && (
              <Chip
                icon={<AdminIcon style={{ color: '#3ba55c' }} />}
                label={t('main.systemAdmin')}
                onClick={() => navigate('/admin')}
                sx={{
                  fontWeight: 600, backgroundColor: 'rgba(59, 165, 92, 0.1)', color: '#3ba55c',
                  border: '1px solid rgba(59, 165, 92, 0.3)', cursor: 'pointer',
                  display: { xs: 'none', sm: 'flex' }
                }}
              />
            )}

            <Button
              variant="outlined"
              onClick={handleLangMenuClick}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                borderColor: 'rgba(0,0,0,0.15)',
                color: '#4a5568',
                fontWeight: 600,
                fontSize: '0.85rem',
                borderRadius: 2,
                px: 2,
                py: 0.75,
                textTransform: 'none',
                height: 38,
                '&:hover': {
                  borderColor: '#3ba55c',
                  backgroundColor: 'rgba(59, 165, 92, 0.04)'
                }
              }}
            >
              <img
                loading="lazy"
                width="20"
                src={`${import.meta.env.BASE_URL}flags/${activeLang.country}.png`}
                alt=""
                style={{ display: 'block', borderRadius: 2 }}
              />
              {activeLang.label}
              <ArrowDropDownIcon sx={{ color: '#718096' }} />
            </Button>
            
            <Menu
              anchorEl={langAnchorEl}
              open={Boolean(langAnchorEl)}
              onClose={() => handleLangMenuClose()}
              PaperProps={{
                sx: {
                  mt: 1,
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }
              }}
            >
              {languages.map(lang => (
                <MenuItem
                  key={lang.code}
                  selected={i18n.language === lang.code}
                  onClick={() => handleLangMenuClose(lang.code)}
                  sx={{ px: 2.5, py: 1.25, display: 'flex', gap: 1.5, alignItems: 'center' }}
                >
                  <img
                    loading="lazy"
                    width="20"
                    src={`${import.meta.env.BASE_URL}flags/${lang.country}.png`}
                    alt=""
                    style={{ display: 'block', borderRadius: 1 }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#2d3748' }}>
                    {lang.label}
                  </Typography>
                </MenuItem>
              ))}
            </Menu>

          <Button
            variant="contained"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            disableElevation
            sx={{
              backgroundColor: '#3ba55c',
              color: '#fff',
              fontWeight: 700, 
              fontSize: '0.9rem',
              borderRadius: 2,
              textTransform: 'none',
              '&:hover': { backgroundColor: '#2e8b4a' },
            }}
          >
            {t('main.logout', 'Đăng xuất')}
          </Button>
        </Stack>
      </Box>

        {/* Main interactive area */}
        <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ 
            display: 'flex', flexDirection: 'column', 
            justifyContent: 'flex-start', alignItems: 'center', 
            minHeight: '100%',
            pt: { xs: 6, sm: 8 }, pb: 4, px: { xs: 2, sm: 4, md: 8 } 
          }}>
          
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#2d3748', mb: 1 }}>
              {t('main.selectApp', 'Chọn ứng dụng để bắt đầu')}
            </Typography>
          </Box>

          {loading ? (
            <CircularProgress size={40} sx={{ color: '#3ba55c' }} />
          ) : (
            <Paper elevation={0} sx={{ 
              width: '100%', 
              maxWidth: 900, 
              p: { xs: 2, sm: 4 }, 
              borderRadius: 4, 
              backgroundColor: 'transparent' /* Hoặc màu nền nếu muốn bọc chung */ 
            }}>
              <Grid container spacing={2}>
                {visibleApps.map(app => {
                  const config = APP_CONFIG[app.appCode] || {
                    icon: <DefaultAppIcon sx={{ fontSize: 36 }} />,
                    route: `/${app.appCode.toLowerCase()}`,
                  };

                  return (
                    <Grid size={{ xs: 6, md: 6, lg: 4 }} key={app.appCode}>
                      <Box
                        onClick={() => navigate(config.route)}
                        sx={{
                          p: { xs: 2, sm: 3 },
                          borderRadius: 3,
                          cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          backgroundColor: '#fff',
                          height: '100%',
                          width: '100%',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                          border: '1px solid rgba(0,0,0,0.02)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 12px 28px rgba(0,0,0,0.08)',
                          },
                          '&:active': {
                            transform: 'translateY(-2px)',
                          },
                        }}
                      >
                        <Box
                          className="app-icon-wrapper"
                          sx={{
                            width: 60, height: 60, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: '#3ba55c',
                            color: '#fff',
                            mb: 2 
                          }}
                        >
                          {config.icon}
                        </Box>
                        <Typography 
                          className="app-title" 
                          variant="body1" 
                          sx={{
                            fontWeight: 800, 
                            color: '#2d3748', 
                            textAlign: 'center', 
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                            fontSize: '0.85rem'
                          }}
                        >
                          {config.i18nKey ? t(config.i18nKey, app.appName) : app.appName}
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>

              {visibleApps.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 6, width: '100%' }}>
                  <Typography variant="h6" sx={{ color: '#64748b' }}>
                    {t('main.noAppsAssigned')}
                  </Typography>
                </Box>
              )}
            </Paper>
          )}

          {/* Quick Info text / Admin fallback at the bottom */}
          {!loading && isAdmin && (
            <Box sx={{ mt: 8, textAlign: 'center', display: { xs: 'block', sm: 'none' } }}>
               <Button onClick={() => navigate('/admin')} color="secondary">
                 {t('main.systemAdmin', 'System Administration')}
               </Button>
            </Box>
          )}
            {/* Version for Mobile / Overall viewport */}
            <Box sx={{ mt: 4, mb: 1, textAlign: 'right', width: '100%' }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>v1.1.8-0410</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(p => ({ ...p, open: false }))} />
    </Box>
  );
}
