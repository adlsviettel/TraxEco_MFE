import React, { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search as SearchIcon,
  Assignment as AssignmentIcon,
  BarChart as BarChartIcon,
  NoteAdd as NoteAddIcon,
  AdminPanelSettings as AdminSettingsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { AppShell, AdminPage , authService } from '@traxeco/shared';

import RequestorViewPage from '../pages/RequestorViewPage';
import AdminStatusPage from '../pages/AdminStatusPage';
import DashboardPage from '../pages/DashboardPage';
import TccSettingsPage from '../pages/TccSettingsPage';
import QueueManagementPage from '../pages/QueueManagementPage';
import TccNotificationBell from '../components/TccNotificationBell';

const BASE = '/tcc-template';

export default function TccTemplateLayout() {
  const { t } = useTranslation();
  const roleLevel = Number(localStorage.getItem('roleLevel') || '99');

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const requestPermissionSafe = (): Promise<NotificationPermission> => {
        return new Promise((resolve) => {
          try {
            const permissionResult = Notification.requestPermission(resolve);
            if (permissionResult && typeof permissionResult.then === 'function') {
              permissionResult.then(resolve);
            }
          } catch (e) {
            resolve(Notification.permission);
          }
        });
      };
      
      requestPermissionSafe().then((permission) => {
        console.log('Notification permission auto-request result:', permission);
      });
    }
  }, []);

  const hasAdminAccess = useMemo(() => roleLevel <= 2 || authService.hasPageAccess('tcc_admin'), [roleLevel]);

  const navItems = useMemo(() => [
    { text: t('tcc.nav.tracking', 'Template Request Form'), icon: <SearchIcon fontSize="small" />, path: `${BASE}/tracking`, pageCode: 'tcc_tracking' },
    { text: t('tcc.nav.adminStatus', 'Master Data'), icon: <AssignmentIcon fontSize="small" />, path: `${BASE}/admin-status`, pageCode: 'tcc_admin_status' },
    { text: t('tcc.nav.queue', 'Queue Management'), icon: <AssignmentIcon fontSize="small" />, path: `${BASE}/queue`, pageCode: 'tcc_admin_status' },
    { text: t('tcc.nav.dashboard', 'Dashboard'), icon: <BarChartIcon fontSize="small" />, path: `${BASE}/dashboard`, pageCode: 'tcc_dashboard' },
    { text: t('nav.settings', 'Settings'), icon: <SettingsIcon fontSize="small" />, path: `${BASE}/settings`, pageCode: 'tcc_settings' },
    ...(hasAdminAccess ? [{ text: t('nav.admin', 'Admin'), icon: <AdminSettingsIcon fontSize="small" />, path: `${BASE}/admin`, pageCode: 'tcc_admin' }] : []),
  ], [t, hasAdminAccess]);

  const pages = useMemo(() => [
    { path: `${BASE}/tracking`, component: <RequestorViewPage /> },
    { path: `${BASE}/admin-status`, component: <AdminStatusPage /> },
    { path: `${BASE}/queue`, component: <QueueManagementPage /> },
    { path: `${BASE}/dashboard`, component: <DashboardPage /> },
    { path: `${BASE}/settings`, component: <TccSettingsPage /> },
    ...(hasAdminAccess ? [{ path: `${BASE}/admin`, component: <AdminPage /> }] : []),
  ], [hasAdminAccess]);

  return (
    <AppShell
      appTitle="TCC Template Request"
      appTitleShort="TCC TEMPLATE"
      appLogo={<NoteAddIcon sx={{ color: '#fff', fontSize: 18 }} />}
      accentColor="#2e7d32"
      drawerWidth={280}
      navItems={navItems}
      pages={pages}
      storageKey="tcc_layout_open"
      headerExtra={<TccNotificationBell />}
      versionString="TCC v1.0.0"
      fallbackPath="/tcc-template/tracking"
      rootPath="/tcc-template"
    />
  );
}
