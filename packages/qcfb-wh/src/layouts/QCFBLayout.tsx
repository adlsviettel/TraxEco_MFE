import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Assessment as ReportIcon,
  BugReport as InspectIcon,
  ViewList as ListIcon,
  ManageAccounts as AdminIcon,
} from '@mui/icons-material';
import { AppShell, AdminPage , authService } from '@traxeco/shared';
import DailyReportPage from '../pages/DailyReportPage';
import PackingListSummaryPage from '../pages/PackingListSummaryPage';
import PassFailPage from '../pages/PassFailPage';
import ReportDefectPage from '../pages/ReportDefectPage';
import FabricInspectionPage from '../pages/FabricInspectionPage';
import InspectionHistoryPage from '../pages/InspectionHistoryPage';
import QCInspectionMockupPage from '../pages/QCInspectionMockupPage';
import ScannerSimulatorPage from '../pages/ScannerSimulatorPage';

export default function QCFBLayout() {
  const { t } = useTranslation();
  const roleLevel = Number(localStorage.getItem('roleLevel') || '99');

  const navItems = useMemo(() => {
    const items = [
      { text: t('qcfb.nav.FabricInspection', 'Fabric Inspection'), icon: <InspectIcon />, path: '/qcfb-wh/fabric-inspection', pageCode: 'qcfb-fabric-inspection' },
      { text: t('qcfb.nav.InspectionHistory', 'Inspection History'), icon: <ListIcon />, path: '/qcfb-wh/inspection-history', pageCode: 'qcfb-inspection-history' },
      { text: t('qcfb.nav.DailyReport', 'Daily Report'), icon: <ReportIcon />, path: '/qcfb-wh/daily-report', pageCode: 'qcfb-daily-report' },
      { text: t('qcfb.nav.PackingListSummary', 'Packing List Summary'), icon: <ListIcon />, path: '/qcfb-wh/packing-list-summary', pageCode: 'qcfb-packing-list-summary' },
      { text: t('qcfb.nav.PassFailCenter', 'Pass/Fail Center'), icon: <InspectIcon />, path: '/qcfb-wh/pass-fail', pageCode: 'qcfb-report-pass-fail' },
      { text: t('qcfb.nav.ReportDefect', 'Report Defect'), icon: <ReportIcon />, path: '/qcfb-wh/report-defect', pageCode: 'qcfb-report-defect' },
      { text: t('qcfb.nav.QCMockupTest', '🔥 QC Mockup (Test)'), icon: <InspectIcon />, path: '/qcfb-wh/qc-mockup', pageCode: 'qcfb-dashboard' },
      { text: t('qcfb.nav.ScannerTest', '🔥 Scanner (Test)'), icon: <InspectIcon />, path: '/qcfb-wh/scanner', pageCode: 'qcfb-dashboard' },
    ];
    if (roleLevel <= 2 || authService.hasPageAccess('qcfb-admin')) {
      items.push({ text: t('nav.admin', 'Admin'), icon: <AdminIcon />, path: '/qcfb-wh/admin', pageCode: 'qcfb-admin' });
    }
    return items;
  }, [t, roleLevel]);

  const pages = useMemo(() => [
    { path: '/qcfb-wh/fabric-inspection', component: <FabricInspectionPage /> },
    { path: '/qcfb-wh/inspection-history', component: <InspectionHistoryPage /> },
    { path: '/qcfb-wh/daily-report', component: <DailyReportPage /> },
    { path: '/qcfb-wh/packing-list-summary', component: <PackingListSummaryPage /> },
    { path: '/qcfb-wh/pass-fail', component: <PassFailPage /> },
    { path: '/qcfb-wh/report-defect', component: <ReportDefectPage /> },
    { path: '/qcfb-wh/qc-mockup', component: <QCInspectionMockupPage /> },
    { path: '/qcfb-wh/scanner', component: <ScannerSimulatorPage /> },
    ...(roleLevel <= 2 || authService.hasPageAccess('qcfb-admin') ? [{ path: '/qcfb-wh/admin', component: <AdminPage /> }] : []),
  ], [roleLevel]);

  return (
    <AppShell
      appTitle={t('app.qcfbWH', 'QC Fabric Warehouse')}
      appTitleShort="QC FABRIC WH"
      appLogo={<InspectIcon sx={{ color: '#fff', fontSize: 18 }} />}
      accentColor="#2e7d32"
      drawerWidth={260}
      navItems={navItems}
      pages={pages}
      storageKey="qcfb_drawer_open"
      versionString="QCFB v1.1.8-0410"
      fallbackPath="/qcfb-wh/fabric-inspection"
      rootPath="/qcfb-wh"
    />
  );
}
