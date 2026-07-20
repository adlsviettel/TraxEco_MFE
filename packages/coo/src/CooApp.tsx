import React, { useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell, AdminPage } from '@traxeco/shared';
import { useTranslation } from 'react-i18next';
import { BarChart as BarChartIcon, Sync as SyncIcon, AdminPanelSettings as AdminIcon } from '@mui/icons-material';

import { ImportPage } from './pages/ImportPage';
import { DashboardPage } from './pages/DashboardPage';

const BASE = '/coo';

const CooApp = () => {
    const { t } = useTranslation();
    const roleLevel = Number(localStorage.getItem('roleLevel') || '99');

    const navItems = useMemo(() => [
        { text: t('coo.nav.dashboard', 'Dashboard'), icon: <BarChartIcon fontSize="small" />, path: `${BASE}/dashboard`, pageCode: 'coo_dashboard' },
        { text: t('coo.nav.import', 'Data Sync'), icon: <SyncIcon fontSize="small" />, path: `${BASE}/import`, pageCode: 'coo_import' },
        ...(roleLevel <= 2 ? [{ text: t('nav.admin', 'Admin'), icon: <AdminIcon fontSize="small" />, path: `${BASE}/admin`, pageCode: 'coo_admin' }] : [])
    ], [t, roleLevel]);

    const pages = useMemo(() => [
        { path: `${BASE}/dashboard`, component: <DashboardPage /> },
        { path: `${BASE}/import`, component: <ImportPage /> },
        ...(roleLevel <= 2 ? [{ path: `${BASE}/admin`, component: <AdminPage /> }] : [])
    ], [roleLevel]);

    return (
        <AppShell
            appTitle={t('coo.title', 'COO Application')}
            appTitleShort="COO"
            accentColor="#15803d"
            drawerWidth={240}
            navItems={navItems}
            pages={pages}
            storageKey="coo_layout_open"
            fallbackPath={`${BASE}/dashboard`}
            rootPath={BASE}
        />
    );
};

export default CooApp;
