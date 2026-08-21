import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FactCheck as InspectIcon,
  History as HistoryIcon,
  ManageAccounts as AdminIcon,
} from '@mui/icons-material';
import { AppShell, AdminPage, authService } from '@traxeco/shared';
import QCInspectionPage from '../pages/QCInspectionPage';
import QCHistoryPage from '../pages/QCHistoryPage';

export default function QCAccessoryLayout() {
  const { t } = useTranslation();
  const roleLevel = Number(localStorage.getItem('roleLevel') || '99');

  const navItems = useMemo(() => {
    const items = [
      { text: t('qcacc.nav.inspection', 'QC Inspection'), icon: <InspectIcon />, path: '/qc-accessory/inspection', pageCode: 'qcacc-inspection' },
      { text: t('qcacc.nav.history', 'History'), icon: <HistoryIcon />, path: '/qc-accessory/history', pageCode: 'qcacc-history' },
    ];
    if (roleLevel <= 2 || authService.hasPageAccess('qcacc-admin')) {
      items.push({ text: t('nav.admin', 'Admin'), icon: <AdminIcon />, path: '/qc-accessory/admin', pageCode: 'qcacc-admin' });
    }
    return items;
  }, [t, roleLevel]);

  const pages = useMemo(() => [
    { path: '/qc-accessory/inspection', component: <QCInspectionPage /> },
    { path: '/qc-accessory/history', component: <QCHistoryPage /> },
    ...(roleLevel <= 2 || authService.hasPageAccess('qcacc-admin') ? [{ path: '/qc-accessory/admin', component: <AdminPage /> }] : []),
  ], [roleLevel]);

  return (
    <AppShell
      appTitle={t('app.qcAccessory', 'QC Phụ Liệu')}
      appTitleShort="QC ACC"
      appLogo={<InspectIcon sx={{ color: '#fff', fontSize: 18 }} />}
      accentColor="#2e7d32"
      drawerWidth={260}
      navItems={navItems}
      pages={pages}
      storageKey="qcacc_drawer_open"
      versionString="QCACC v1.0.0"
      fallbackPath="/qc-accessory/inspection"
      rootPath="/qc-accessory"
    />
  );
}
