import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AppShell } from '@traxeco/shared';
import DashboardPage from '../pages/DashboardPage';
import InventoryPage from '../pages/InventoryPage';
import RelaxPage from '../pages/RelaxPage';
import ScanRelaxPage from '../pages/ScanRelaxPage';
import TrackingPage from '../pages/TrackingPage';
import PackingListPage from '../pages/PackingListPage';
import UploadPkListPage from '../pages/UploadPkListPage';
import IssueFabricPage from '../pages/IssueFabricPage';
import IssueReportPage from '../pages/IssueReportPage';
import PutawayPage from '../pages/PutawayPage';
import PrintQrCodePage from '../pages/PrintQrCodePage';
import { AdminPage } from '@traxeco/shared';

import {
  Dashboard as DashboardIcon,
  Inventory2 as InventoryIcon,
  AdminPanelSettings as AdminSettingsIcon,
  History as HistoryIcon,
  Autorenew as RelaxIcon,
  UploadFile as UploadFileIcon,
  Output as OutputIcon,
  BarChart as BarChartIcon,
  List as ListIcon,
  QrCode as QrCodeIcon,
  SwapHoriz as SwapIcon,
  PlayCircleFilled as PlayCircleFilledIcon,
  Factory as FactoryIcon
} from '@mui/icons-material';

const BASE = '/fabricwh';

export default function FabricLayout() {
  const { t } = useTranslation();
  const roleLevel = Number(localStorage.getItem('roleLevel') || '99');

  const navItems = useMemo(() => [
    { text: t('dashboard.title', 'Dashboard'), icon: <DashboardIcon />, path: BASE, pageCode: 'fb_dashboard' },
    { text: t('packingList.title', 'Packing List'), icon: <ListIcon />, path: `${BASE}/pklist`, pageCode: 'fb_pklist' },
    { text: t('upload.title', 'Upload PKList'), icon: <UploadFileIcon />, path: `${BASE}/upload-pklist`, pageCode: 'fb_upload_pklist' },
    { text: t('printQr.title', 'Print QR Code'), icon: <QrCodeIcon />, path: `${BASE}/print-qr`, pageCode: 'fb_print_qr' },
    { text: t('putaway.title', 'Putaway / Location'), icon: <SwapIcon />, path: `${BASE}/putaway`, pageCode: 'fb_putaway' },
    { text: t('inventory.title', 'Inventory'), icon: <InventoryIcon />, path: `${BASE}/inventory`, pageCode: 'fb_inventory' },
    { text: t('issueFabric.title', 'Issue Fabric'), icon: <OutputIcon />, path: `${BASE}/issue`, pageCode: 'fb_issue' },
    { text: t('relaxScan.title', 'Xả vải'), icon: <PlayCircleFilledIcon />, path: `${BASE}/scan-relax`, pageCode: 'fb_relax' },
    { text: t('relax.title', 'Báo cáo xả vải'), icon: <RelaxIcon />, path: `${BASE}/relax`, pageCode: 'fb_relax_report' },
    { text: t('issueReport.title', 'Issue Report'), icon: <BarChartIcon />, path: `${BASE}/report`, pageCode: 'fb_report' },
    ...(roleLevel <= 2
      ? [
          { text: t('tracking.title', 'Tracking Logs'), icon: <HistoryIcon />, path: `${BASE}/tracking`, pageCode: 'fb_tracking' },
          { text: t('nav.admin', 'Admin'), icon: <AdminSettingsIcon />, path: `${BASE}/admin`, pageCode: 'fb_admin' }
        ]
      : []),
  ], [t, roleLevel]);

  const pages = useMemo(() => [
    { path: BASE, component: <DashboardPage /> },
    { path: `${BASE}/pklist`, component: <PackingListPage /> },
    { path: `${BASE}/upload-pklist`, component: <UploadPkListPage /> },
    { path: `${BASE}/print-qr`, component: <PrintQrCodePage /> },
    { path: `${BASE}/putaway`, component: <PutawayPage /> },
    { path: `${BASE}/inventory`, component: <InventoryPage /> },
    { path: `${BASE}/issue`, component: <IssueFabricPage /> },
    { path: `${BASE}/scan-relax`, component: <ScanRelaxPage /> },
    { path: `${BASE}/relax`, component: <RelaxPage /> },
    { path: `${BASE}/report`, component: <IssueReportPage /> },
    ...(roleLevel <= 2 ? [
      { path: `${BASE}/tracking`, component: <TrackingPage /> },
      { path: `${BASE}/admin`, component: <AdminPage /> },
    ] : []),
  ], [roleLevel]);

  return (
    <AppShell
      appTitle="Fabric Warehouse"
      appTitleShort="Fabric WH"
      appLogo={<FactoryIcon sx={{ color: '#fff', fontSize: 20 }} />}
      accentColor="#2e7d32"
      drawerWidth={260}
      navItems={navItems}
      pages={pages}
      storageKey="fabric_drawer_open"
      versionString="FabricWH v1.1.8-0410"
      fallbackPath="/fabricwh"
      rootPath="/fabricwh"
    />
  );
}
