import React, { ReactNode, useMemo, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, useTheme,
  Divider, BottomNavigation, BottomNavigationAction, Paper, useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon, ChevronLeft as ChevronLeftIcon, Settings as SettingsIcon
} from '@mui/icons-material';
import { authService } from '../services/authService';
import HeaderActions from './HeaderActions';

// Memoized container that prevents page re-renders when only the route changes.
// Without this, every AppShell re-render (triggered by useLocation) cascades
// into re-rendering ALL mounted page components including hidden ones.
const PageContainer = React.memo(({ isActive, children }: { isActive: boolean; children: ReactNode }) => (
  <div style={{ 
    display: 'flex', 
    visibility: isActive ? 'visible' : 'hidden',
    position: isActive ? 'relative' : 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: isActive ? 1 : -1,
    flexDirection: 'column', 
    width: '100%', 
    height: '100%',
    flex: 1, 
    minHeight: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch'
  }}>
    {children}
  </div>
));

export interface NavItem {
  text: string;
  label?: string;
  icon: ReactNode;
  path: string;
  pageCode: string;
}

export interface PageDef {
  path: string;
  component: ReactNode;
}

export interface AppShellProps {
  appTitle: string;
  appTitleShort?: string;
  appLogo?: ReactNode;
  accentColor?: string;
  drawerWidth?: number;
  navItems: NavItem[];
  pages: PageDef[];
  storageKey: string;
  headerExtra?: ReactNode;
  versionString?: string;
  fallbackPath?: string;
  rootPath?: string;
  onSettingsClick?: () => void;
  settingsText?: string;
}

export default function AppShell({
  appTitle,
  appTitleShort,
  appLogo,
  accentColor = '#2e7d32',
  drawerWidth = 260,
  navItems,
  pages,
  storageKey,
  headerExtra,
  versionString,
  fallbackPath,
  rootPath,
  onSettingsClick,
  settingsText
}: AppShellProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved !== null ? saved === 'true' : true;
  });

  // Track which pages have been mounted (visited at least once)
  const mountedPagesRef = useRef<Set<string>>(new Set());

  const toggleDrawer = () => {
    setOpen(prev => {
      const nextState = !prev;
      localStorage.setItem(storageKey, String(nextState));
      return nextState;
    });
  };

  const filteredMenuItems = useMemo(() => {
    return navItems.filter(item => authService.hasPageAccess(item.pageCode));
  }, [navItems]);

  const isNavMatched = (itemPath: string) => {
    if (location.pathname === itemPath || location.pathname === itemPath + '/') return true;
    if (!location.pathname.startsWith(itemPath + '/')) return false;
    return !filteredMenuItems.some(other => 
      other.path !== itemPath && 
      other.path.length > itemPath.length && 
      (location.pathname === other.path || location.pathname.startsWith(other.path + '/'))
    );
  };

  const activeIndex = filteredMenuItems.findIndex(item => isNavMatched(item.path));
  
  const currentPath = location.pathname;
  const activeColor = theme.palette.mode === 'dark' ? '#4ade80' : accentColor;

  useEffect(() => {
    const isRoot = rootPath 
      ? (currentPath === rootPath || currentPath === rootPath + '/')
      : false;
      
    if (isRoot) {
      if (filteredMenuItems.length > 0) {
        navigate(filteredMenuItems[0].path, { replace: true });
      } else if (fallbackPath) {
        navigate(fallbackPath, { replace: true });
      }
    }
  }, [currentPath, filteredMenuItems, navigate, rootPath, fallbackPath]);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      width: '100%',
      height: '100%',
      backgroundColor: isMobile ? 'background.default' : undefined,
      overflow: isMobile ? 'auto' : 'hidden',
    }}>
      <CssBaseline />

      {/* ─── APP BAR (responsive) ─── */}
      {isMobile ? (
        <AppBar position="fixed" elevation={0} sx={{
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
        }}>
          <Toolbar sx={{ minHeight: 'calc(52px + env(safe-area-inset-top)) !important', pt: 'env(safe-area-inset-top)', px: 2 }}>
            {appLogo ? (
              <Box sx={{
                width: 30, height: 30, borderRadius: 1.5, mr: 1.5,
                background: `linear-gradient(135deg, ${accentColor} 0%, #43a047 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 2px 6px ${accentColor}4D`,
              }}>
                {appLogo}
              </Box>
            ) : null}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: accentColor, lineHeight: 1.2 }}>
                {appTitleShort || appTitle}
              </Typography>
              <Typography variant="caption" noWrap sx={{ fontWeight: 600, color: 'text.secondary', lineHeight: 1.1 }}>
                {activeIndex >= 0 ? (filteredMenuItems[activeIndex].label || filteredMenuItems[activeIndex].text) : ''}
              </Typography>
            </Box>
            {headerExtra}
            <HeaderActions homePath="/" />
          </Toolbar>
        </AppBar>
      ) : (
        <AppBar position="fixed" elevation={0} sx={{
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.leavingScreen,
          }),
          ...(open && {
            marginLeft: drawerWidth, width: `calc(100% - ${drawerWidth}px)`,
            transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.enteringScreen,
            }),
          }),
        }}>
          <Toolbar sx={{ minHeight: 'calc(64px + env(safe-area-inset-top)) !important', pt: 'env(safe-area-inset-top)' }}>
            <IconButton color="inherit" onClick={toggleDrawer} edge="start" sx={{ marginRight: 1, ...(open && { display: 'none' }) }}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
              <Typography variant="h6" noWrap sx={{ fontWeight: 800, color: accentColor }}>
                {appTitle}
              </Typography>
              <Typography variant="h6" sx={{ color: 'text.secondary', opacity: 0.4 }}>|</Typography>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, color: 'text.secondary', mt: '2px' }}>
                {activeIndex >= 0 ? (filteredMenuItems[activeIndex].label || filteredMenuItems[activeIndex].text) : ''}
              </Typography>
            </Box>
            {headerExtra}
            <HeaderActions homePath="/" />
          </Toolbar>
        </AppBar>
      )}

      {/* ─── DESKTOP SIDEBAR (hidden on mobile) ─── */}
      {!isMobile && (
        <Drawer variant="permanent" open={open} sx={{
          width: drawerWidth, flexShrink: 0, whiteSpace: 'nowrap', boxSizing: 'border-box',
          ...(open && {
            width: drawerWidth,
            transition: theme.transitions.create('width', { easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.enteringScreen }),
            '& .MuiDrawer-paper': { width: drawerWidth, overflowX: 'hidden', backgroundColor: theme.palette.background.paper, borderRight: `1px solid ${theme.palette.divider}`, transition: theme.transitions.create('width', { easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.enteringScreen }) },
          }),
          ...(!open && {
            width: `calc(${theme.spacing(7)} + 1px)`,
            transition: theme.transitions.create('width', { easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.leavingScreen }),
            '& .MuiDrawer-paper': { width: `calc(${theme.spacing(7)} + 1px)`, overflowX: 'hidden', backgroundColor: theme.palette.background.paper, borderRight: `1px solid ${theme.palette.divider}`, transition: theme.transitions.create('width', { easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.leavingScreen }) },
          }),
        }}>
          <Toolbar sx={{ minHeight: 'calc(64px + env(safe-area-inset-top)) !important', pt: 'env(safe-area-inset-top)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: [1] }}>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: open ? 1.5 : 0.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5, transition: 'all 0.3s' }}>
              {appLogo ? (
                <Box sx={{
                  width: 36, height: 36, borderRadius: 1.5, flexShrink: 0,
                  background: `linear-gradient(135deg, ${accentColor} 0%, #43a047 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 2px 8px ${accentColor}59`
                }}>
                  {appLogo}
                </Box>
              ) : null}
              {open && (
                <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, opacity: open ? 1 : 0, transition: 'opacity 0.3s' }}>
                  <Box component="span" sx={{ fontSize: '0.85rem', fontWeight: 800, color: theme.palette.mode === 'dark' ? '#4ade80' : accentColor }}>
                    {appTitleShort || appTitle}
                  </Box>
                </Box>
              )}
            </Typography>
            <IconButton onClick={toggleDrawer}><ChevronLeftIcon /></IconButton>
          </Toolbar>
          <Divider />
          <List sx={{ px: 1, pt: 2 }}>
            {filteredMenuItems.map((item) => {
              const isSelected = isNavMatched(item.path);
              return (
                <ListItem key={item.text} disablePadding sx={{ display: 'block', mb: 1 }}>
                  <ListItemButton onClick={() => navigate(item.path)} selected={isSelected}
                    sx={{ minHeight: 48, justifyContent: open ? 'initial' : 'center', px: open ? 2.5 : 1, borderRadius: 2, '&.Mui-selected': { backgroundColor: theme.palette.mode === 'dark' ? 'rgba(74, 222, 128, 0.15)' : `${accentColor}1A`, color: activeColor, fontWeight: 600, '&:hover': { backgroundColor: theme.palette.mode === 'dark' ? 'rgba(74, 222, 128, 0.25)' : `${accentColor}2A` }, '& .MuiListItemIcon-root': { color: activeColor } } }}>
                    <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto', justifyContent: 'center', color: isSelected ? activeColor : 'inherit' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} sx={{ opacity: open ? 1 : 0, '& .MuiTypography-root': { fontWeight: isSelected ? 600 : 400, color: isSelected ? activeColor : 'inherit' } }} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
          {onSettingsClick && (
            <Box sx={{ mt: 'auto', px: 1 }}>
              <ListItem disablePadding sx={{ display: 'block', mb: 0 }}>
                <ListItemButton onClick={onSettingsClick}
                  sx={{ minHeight: 48, justifyContent: open ? 'initial' : 'center', px: open ? 2.5 : 1, borderRadius: 2, '&:hover': { backgroundColor: `${accentColor}1A` } }}>
                  <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto', justifyContent: 'center' }}>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={settingsText || t('nav.settings', 'Settings')} sx={{ opacity: open ? 1 : 0, '& .MuiTypography-root': { fontWeight: 500 } }} />
                </ListItemButton>
              </ListItem>
            </Box>
          )}
          {versionString && (
            <Box sx={{ mt: onSettingsClick ? 0 : 'auto', pb: 2, pt: 2, textAlign: 'center', opacity: open ? 1 : 0, transition: 'opacity 0.2s', overflow: 'hidden' }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, fontSize: '0.7rem', display: 'block', whiteSpace: 'nowrap' }}>
                {versionString}
              </Typography>
            </Box>
          )}
        </Drawer>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <Box component="main" sx={{
        flexGrow: 1,
        p: isMobile ? 0 : 1,
        pl: 0,
        pr: isMobile ? 0 : 1,
        pb: isMobile ? 'calc(70px + env(safe-area-inset-bottom))' : 1,
        pt: isMobile ? 0 : 1.5,
        backgroundColor: isMobile ? undefined : theme.palette.background.default,
        display: 'flex', flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
        height: '100%',
        WebkitOverflowScrolling: 'touch',
      }}>
        {isMobile ? <Toolbar sx={{ minHeight: 'calc(52px + env(safe-area-inset-top)) !important', p: 0, m: 0 }} /> : <Toolbar sx={{ minHeight: 'calc(64px + env(safe-area-inset-top)) !important', p: 0, m: 0 }} />}
        <Box sx={{ width: '100%', flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }} className="animate-slide-up">
          {pages.map(({ path, component }) => {
            const isExact = currentPath === path || currentPath === path + '/';
            const isSubpath = currentPath.startsWith(path + '/');
            const hasMoreSpecificPage = pages.some(other =>
              other.path !== path &&
              other.path.length > path.length &&
              (currentPath === other.path || currentPath.startsWith(other.path + '/'))
            );
            const isActive = isExact || (isSubpath && !hasMoreSpecificPage);
            // Lazy mount: track which pages have been visited
            if (isActive && !mountedPagesRef.current.has(path)) {
              mountedPagesRef.current.add(path);
            }
            // Only render pages that have been visited at least once
            if (!mountedPagesRef.current.has(path)) return null;
            return (
              <PageContainer key={path} isActive={isActive}>
                {React.isValidElement(component) ? React.cloneElement(component as React.ReactElement, { isActive }) : component}
              </PageContainer>
            );
          })}
        </Box>
      </Box>

      {/* ─── MOBILE BOTTOM NAV (hidden on desktop) ─── */}
      {isMobile && (
        <Paper elevation={8} sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <BottomNavigation value={activeIndex >= 0 ? activeIndex : 0} onChange={(_, newValue) => navigate(filteredMenuItems[newValue].path)} showLabels
            sx={{ height: 64, bgcolor: 'background.paper', '& .MuiBottomNavigationAction-root': { minWidth: 0, py: 1, color: 'text.secondary', '&.Mui-selected': { color: activeColor } }, '& .MuiBottomNavigationAction-label': { fontSize: '0.65rem', fontWeight: 600, '&.Mui-selected': { fontSize: '0.67rem', fontWeight: 700 } } }}>
            {filteredMenuItems.map((item) => (
              <BottomNavigationAction key={item.path} label={item.text} icon={item.icon} />
            ))}
          </BottomNavigation>
        </Paper>
      )}

    </Box>
  );
}
