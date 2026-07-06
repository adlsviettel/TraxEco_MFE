import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box, Avatar, Button, Tooltip, IconButton, Menu, MenuItem, Typography, useTheme, useMediaQuery
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import {
  User as UserIconLucide,
  Home as HomeIconLucide,
  LogOut as LogoutIconLucide,
  Key as KeyIconLucide
} from 'lucide-react';
import { authService } from '../services/authService';
import ConfirmDialog, { defaultConfirmDialog } from './ConfirmDialog';
import type { ConfirmDialogState } from './ConfirmDialog';
import ChangePasswordDialog from './ChangePasswordDialog';

const languages = [
  { code: 'vi', label: 'VI', country: 'vn' },
  { code: 'en', label: 'EN', country: 'gb' },
  { code: 'id', label: 'ID', country: 'id' },
  { code: 'th', label: 'TH', country: 'th' },
  { code: 'km', label: 'KM', country: 'kh' },
];

export interface HeaderActionsProps {
  homePath?: string;
  showHome?: boolean;
  onOpenChangePassword?: () => void;
}

export default function HeaderActions({
  homePath = '/',
  showHome = true,
  onOpenChangePassword
}: HeaderActionsProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  
  // Robust mobile detection: combine media query, screen width, and user agent.
  const isMobileMediaQuery = useMediaQuery(theme.breakpoints.down('md'));
  const [isMobile, setIsMobile] = useState(() => {
    const uaMobile = typeof navigator !== 'undefined' && 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const widthMobile = typeof window !== 'undefined' && window.innerWidth < 900;
    return uaMobile || widthMobile;
  });

  React.useEffect(() => {
    const handleResize = () => {
      const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const widthMobile = window.innerWidth < 900;
      setIsMobile(uaMobile || widthMobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigate = useNavigate();

  const [langAnchorEl, setLangAnchorEl] = useState<null | HTMLElement>(null);
  const [accountAnchorEl, setAccountAnchorEl] = useState<null | HTMLElement>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(defaultConfirmDialog);
  const [changePwdOpen, setChangePwdOpen] = useState(false);

  const handleOpenChangePassword = () => {
    if (onOpenChangePassword) {
      onOpenChangePassword();
    } else {
      setChangePwdOpen(true);
    }
  };

  const userInfo = authService.getUserInfo() || { employeeCode: 'User', employeeName: 'User' };

  const handleLangMenuClick = (event: React.MouseEvent<HTMLElement>) => setLangAnchorEl(event.currentTarget);
  const handleLangMenuClose = (code?: string) => {
    if (code) {
      i18n.changeLanguage(code);
      localStorage.setItem('i18nextLng', code);
    }
    setLangAnchorEl(null);
  };

  const handleAccountMenuClick = (event: React.MouseEvent<HTMLElement>) => setAccountAnchorEl(event.currentTarget);
  const handleAccountMenuClose = () => setAccountAnchorEl(null);

  const handleLogout = () => {
    handleAccountMenuClose();
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

  const activeLang = languages.find(l => l.code === (i18n.language || 'vi')) || languages[0];

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  const accountMenu = (
    <Menu
      anchorEl={accountAnchorEl}
      open={Boolean(accountAnchorEl)}
      onClose={handleAccountMenuClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      PaperProps={{
        sx: {
          mt: 1,
          borderRadius: 1,
          minWidth: 240,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden',
          padding: 0
        }
      }}
      MenuListProps={{ sx: { padding: 0 } }}
    >
      <Box sx={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #eee' }}>
        <Avatar sx={{ width: 44, height: 44, background: 'linear-gradient(135deg, #3ba55c 0%, #2e7d32 100%)', boxShadow: '0 4px 10px rgba(59, 165, 92,0.25)', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
          {getInitials(userInfo.employeeName || userInfo.employeeCode)}
        </Avatar>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#333', lineHeight: 1.2 }}>
            {userInfo.employeeName || userInfo.employeeCode || 'Unknown'}
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#888', mt: 0.5 }}>
            {userInfo.roleLabel || userInfo.section || 'Staff'}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ padding: '8px 16px', borderBottom: '1px solid #eee' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, py: 0.75, fontSize: 13, color: '#555' }}>
          <UserIconLucide size={15} color="#888" />
          <span>Username: <b>{userInfo.employeeCode || '—'}</b></span>
        </Box>
        {userInfo.factory && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, py: 0.75, fontSize: 13, color: '#555' }}>
            <HomeIconLucide size={15} color="#888" />
            <span>Factory: <b>{userInfo.factory}</b></span>
          </Box>
        )}
      </Box>
      <Box sx={{ py: 1 }}>
        <MenuItem onClick={() => { handleAccountMenuClose(); handleOpenChangePassword(); }} sx={{ py: 1.2, px: 2, gap: 1.5 }}>
          <KeyIconLucide size={16} color="#555" />
          <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#333' }}>
            {t('changePassword.menuItem', 'Change Password')}
          </Typography>
        </MenuItem>
        {showHome && (
          <MenuItem onClick={() => { handleAccountMenuClose(); navigate(homePath); }} sx={{ py: 1.2, px: 2, gap: 1.5 }}>
            <HomeIconLucide size={16} color="#555" />
            <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#333' }}>
              {t('nav.home', 'Home')}
            </Typography>
          </MenuItem>
        )}
        <MenuItem onClick={handleLogout} sx={{ py: 1.2, px: 2, gap: 1.5, color: '#ef4444' }}>
          <LogoutIconLucide size={16} color="#ef4444" />
          <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
            {t('nav.logout', 'Logout')}
          </Typography>
        </MenuItem>
      </Box>
    </Menu>
  );

  const langMenu = (
    <Menu
      anchorEl={langAnchorEl}
      open={Boolean(langAnchorEl)}
      onClose={() => handleLangMenuClose()}
      PaperProps={{
        sx: {
          mt: 1,
          borderRadius: 1,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }
      }}
    >
      {languages.map(lang => (
        <MenuItem
          key={lang.code}
          selected={i18n.language === lang.code}
          onClick={() => handleLangMenuClose(lang.code)}
          sx={{ px: 3, py: 1.5, display: 'flex', gap: 1.5, alignItems: 'center' }}
        >
          <img
            loading="lazy"
            width="20"
            src={`${import.meta.env.BASE_URL}flags/${lang.country}.png`}
            alt=""
            style={{ display: 'block' }}
          />
          {lang.label}
        </MenuItem>
      ))}
    </Menu>
  );

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
      {isMobile ? (
        <>
          <IconButton onClick={handleLangMenuClick} sx={{ mr: 0.5 }}>
            <img
              loading="lazy"
              width="20"
              src={`${import.meta.env.BASE_URL}flags/${activeLang.country}.png`}
              alt=""
              style={{ display: 'block', borderRadius: 2 }}
            />
          </IconButton>
          {langMenu}
          <IconButton onClick={handleAccountMenuClick} size="small" sx={{ p: 0.5, transition: 'all 0.2s', '&:hover': { transform: 'scale(1.05)' } }}>
            <Avatar sx={{ width: 34, height: 34, background: 'linear-gradient(135deg, #3ba55c 0%, #2e7d32 100%)', boxShadow: '0 2px 8px rgba(59, 165, 92,0.2)', fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
              {getInitials(userInfo.employeeName || userInfo.employeeCode)}
            </Avatar>
          </IconButton>
          {accountMenu}
        </>
      ) : (
        <>
          <Button
            color="inherit"
            onClick={handleLangMenuClick}
            sx={{
              mr: 1,
              display: 'flex',
              alignItems: 'center',
              '& > *:not(:last-child)': { mr: 1 },
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '6px',
              padding: '6px 16px'
            }}
          >
            <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
              <img
                loading="lazy"
                width="20"
                src={`${import.meta.env.BASE_URL}flags/${activeLang.country}.png`}
                alt=""
                style={{ display: 'block' }}
              />
            </Box>
            <span style={{ fontWeight: 600 }}>{activeLang.label}</span>
            <ArrowDropDownIcon />
          </Button>
          {langMenu}

          <Button
            onClick={handleAccountMenuClick}
            sx={{
              ml: 1,
              display: 'flex',
              alignItems: 'center',
              '& > *:not(:last-child)': { mr: 1 },
              textTransform: 'none',
              color: theme.palette.text.primary,
              borderRadius: '6px',
              padding: '4px 12px 4px 4px',
              transition: 'all 0.2s',
              '&:hover': { backgroundColor: theme.palette.action.hover, transform: 'translateY(-1px)' }
            }}
          >
            <Avatar sx={{ width: 36, height: 36, background: 'linear-gradient(135deg, #3ba55c 0%, #2e7d32 100%)', boxShadow: '0 2px 8px rgba(59, 165, 92,0.2)', fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
              {getInitials(userInfo.employeeName || userInfo.employeeCode)}
            </Avatar>
            <Box sx={{ textAlign: 'left', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {userInfo.employeeName || userInfo.employeeCode || 'User'}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, lineHeight: 1 }}>
                {userInfo.roleLabel || userInfo.section || ''}
              </Typography>
            </Box>
            <ArrowDropDownIcon sx={{ fontSize: 20, color: theme.palette.text.secondary }} />
          </Button>
          {accountMenu}
        </>
      )}
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(p => ({ ...p, open: false }))} />
      <ChangePasswordDialog open={changePwdOpen} onClose={() => setChangePwdOpen(false)} />
    </Box>
  );
}
