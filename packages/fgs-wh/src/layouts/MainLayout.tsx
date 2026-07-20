import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  QrCodeScanner as ScanIcon, History as HistoryIcon,
  LocalShipping as TruckIcon, Inventory2 as PackingPlanIcon,
  AdminPanelSettings as AdminSettingsIcon,
  Assignment as AssignmentIcon, FactCheck as FactCheckIcon, 
  EditLocation as EditLocationIcon, Map as MapIcon, Print as PrintIcon
} from '@mui/icons-material';
import { AppShell, SyncQueueWidget, AdminPage , authService } from '@traxeco/shared';

import ScanPage from '../pages/ScanPage';
import HistoryPage from '../pages/HistoryPage';
import PlanLoadPage from '../pages/PlanLoadPage';
import PackingPlanPage from '../pages/PackingPlanPage';
import UpdateLocationPage from '../pages/UpdateLocationPage';
import WarehouseMapPage from '../pages/WarehouseMapPage';
import FinalInspectionPage from '../pages/FinalInspectionPage';
import CartonShipPage from '../pages/CartonShipPage';
import LabelConfigPage from '../pages/LabelConfigPage';

export default function MainLayout() {
  const { t } = useTranslation();
  const roleLevel = Number(localStorage.getItem('roleLevel') || '99');

  const navItems = useMemo(() => [
    { text: t('nav.scan', 'Scan'), icon: <ScanIcon />, path: '/fgswh/scan', pageCode: 'scan' },
    { text: t('nav.cartonShip', 'Carton Ship'), icon: <TruckIcon />, path: '/fgswh/ship', pageCode: 'cartonship' },
    { text: t('nav.history', 'History'), icon: <HistoryIcon />, path: '/fgswh/history', pageCode: 'history' },
    { text: t('nav.planload', 'PlanLoad'), icon: <AssignmentIcon />, path: '/fgswh/planload', pageCode: 'planload' },
    { text: t('nav.packingPlan', 'Packing Plan'), icon: <PackingPlanIcon />, path: '/fgswh/packingplan', pageCode: 'packingplan' },
    { text: t('nav.finalinspection', 'Final Inspection'), icon: <FactCheckIcon />, path: '/fgswh/inspection', pageCode: 'finalinspection' },
    { text: t('nav.updateLocation', 'Cập Nhật Vị Trí'), icon: <EditLocationIcon />, path: '/fgswh/updatelocation', pageCode: 'updatelocation' },
    { text: t('nav.warehouseMap', 'Bản Đồ Kho'), icon: <MapIcon />, path: '/fgswh/map', pageCode: 'warehousemap' },
    { text: 'Cấu Hình In', icon: <PrintIcon />, path: '/fgswh/labelconfig', pageCode: 'labelconfig' },
    ...(roleLevel <= 2 || authService.hasPageAccess('admin') ? [{ text: t('nav.admin', 'Admin'), icon: <AdminSettingsIcon />, path: '/fgswh/admin', pageCode: 'admin' }] : []),
  ], [t, roleLevel]);

  const pages = useMemo(() => [
    { path: '/fgswh/scan', component: <ScanPage /> },
    { path: '/fgswh/ship', component: <CartonShipPage /> },
    { path: '/fgswh/history', component: <HistoryPage /> },
    { path: '/fgswh/planload', component: <PlanLoadPage /> },
    { path: '/fgswh/packingplan', component: <PackingPlanPage /> },
    { path: '/fgswh/inspection', component: <FinalInspectionPage /> },
    { path: '/fgswh/updatelocation', component: <UpdateLocationPage /> },
    { path: '/fgswh/map', component: <WarehouseMapPage /> },
    { path: '/fgswh/labelconfig', component: <LabelConfigPage /> },
    ...(roleLevel <= 2 || authService.hasPageAccess('admin') ? [{ path: '/fgswh/admin', component: <AdminPage /> }] : []),
  ], [roleLevel]);

  const appLogo = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 8H4L2 12V20H22V12L20 8Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" fill="rgba(255,255,255,0.15)"/>
      <path d="M12 12V8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M2 12H22" stroke="white" strokeWidth="1.8"/>
      <rect x="9" y="14" width="6" height="4" rx="0.5" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.25)"/>
      <path d="M6 4H18L20 8H4L6 4Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" fill="rgba(255,255,255,0.1)"/>
    </svg>
  );

  return (
    <AppShell
      appTitle={t('app.fgsWH', 'Finish Goods Warehouse')}
      appTitleShort={t('app.fgsWHShort', 'Finish Goods')}
      appLogo={appLogo}
      accentColor="#2e7d32"
      drawerWidth={260}
      navItems={navItems}
      pages={pages}
      storageKey="fgs_drawer_open"
      headerExtra={<SyncQueueWidget />}
      versionString="FGSWH v1.1.8-0410"
      fallbackPath="/fgswh/scan"
      rootPath="/fgswh"
    />
  );
}
