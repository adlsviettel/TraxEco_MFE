import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dashboard as DashboardIcon,
  LocalShipping as DeliveryIcon,
  Factory as FactoryIcon,
  Assessment as ReportIcon,
  History as HistoryIcon,
  Inventory as InventoryIcon,
  QrCodeScanner as ScanIcon,
} from '@mui/icons-material';
import { AppShell } from '@traxeco/shared';
import Dashboard from '../pages/Dashboard';
import DeliverPage from '../pages/DeliverPage';
import HistoryPage from '../pages/HistoryPage';
import ReportPage from '../pages/ReportPage';
import ReceivePage from '../pages/ReceivePage';
import PoPackingStatusPage from '../pages/PoPackingStatusPage';

const NAV_KEYS = ['dashboard', 'deliver', 'receive', 'report', 'history', 'po_status'] as const;
const NAV_ICONS = [<DashboardIcon />, <DeliveryIcon />, <FactoryIcon />, <ReportIcon />, <HistoryIcon />, <InventoryIcon />];
const NAV_PATHS = ['/f2s-delivery', '/f2s-delivery/deliver', '/f2s-delivery/receive', '/f2s-delivery/report', '/f2s-delivery/history', '/f2s-delivery/po-packing-status'];
const NAV_PAGE_CODES = ['dashboard', 'deliver', 'receive', 'report', 'history', 'po_status'];

export default function DeliveryLayout() {
  const { t } = useTranslation();

  const navItems = useMemo(() => {
    return NAV_KEYS.map((key, i) => ({
      text: t(`f2s.nav.${key}`),
      icon: NAV_ICONS[i],
      path: NAV_PATHS[i],
      pageCode: NAV_PAGE_CODES[i],
    }));
  }, [t]);

  const pages = useMemo(() => [
    { path: '/f2s-delivery', component: <Dashboard /> },
    { path: '/f2s-delivery/deliver', component: <DeliverPage /> },
    { path: '/f2s-delivery/history', component: <HistoryPage /> },
    { path: '/f2s-delivery/report', component: <ReportPage /> },
    { path: '/f2s-delivery/receive', component: <ReceivePage /> },
    { path: '/f2s-delivery/po-packing-status', component: <PoPackingStatusPage /> },
  ], []);

  return (
    <AppShell
      appTitle={t('app.f2sDelivery', 'F2S Delivery')}
      appTitleShort="F2S DELIVERY"
      appLogo={<ScanIcon sx={{ color: '#fff', fontSize: 18 }} />}
      accentColor="#2e7d32"
      drawerWidth={280}
      navItems={navItems}
      pages={pages}
      storageKey="delivery_drawer_open"
      versionString="DELIVERY v1.1.8-0410"
      fallbackPath="/f2s-delivery"
      rootPath="/f2s-delivery"
    />
  );
}
