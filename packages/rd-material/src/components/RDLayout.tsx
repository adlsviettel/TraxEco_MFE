import React, { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Texture as TextureIcon,
  Diamond as DiamondIcon,
  Layers as LayersIcon,
  Inventory as InventoryIcon,
  Architecture as ArchitectureIcon,
  QrCodeScanner as QrCodeScannerIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Warehouse as WarehouseIcon,
} from '@mui/icons-material';
import { AppShell , authService } from '@traxeco/shared';
import RDSettingsDialog from './RDSettingsDialog';
import { IconButton } from '@mui/material';

const BASE = '/rd-material';

export default function RDLayout() {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const roleLevel = Number(localStorage.getItem('roleLevel') || '99');

  const navItems = useMemo(() => {
    const items = [
      { text: t('rdMaterial.fabricHanger', 'Fabric Hanger'), icon: <TextureIcon fontSize="small" />, path: `${BASE}/fabric`, pageCode: 'rd_fabric' },
      { text: t('rdMaterial.accessory', 'Accessory'), icon: <DiamondIcon fontSize="small" />, path: `${BASE}/accessory`, pageCode: 'rd_accessory' },
      { text: t('rdMaterial.yardage', 'Yardage'), icon: <LayersIcon fontSize="small" />, path: `${BASE}/yardage`, pageCode: 'rd_yardage' },
      { text: t('rdMaterial.product', 'Product'), icon: <ArchitectureIcon fontSize="small" />, path: `${BASE}/product`, pageCode: 'rd_product' },
      { text: t('rdMaterial.scanQuery', 'Scan Query'), icon: <QrCodeScannerIcon fontSize="small" />, path: `${BASE}/scan-query`, pageCode: 'rd_scan' },
      { text: t('rdMaterial.scan', 'Scan Out'), icon: <InventoryIcon fontSize="small" />, path: `${BASE}/scan`, pageCode: 'rd_scan' },
      { text: t('rdMaterial.scanHistory', 'Scan History'), icon: <HistoryIcon fontSize="small" />, path: `${BASE}/scan-history`, pageCode: 'rd_scan' },
    ];
    if (roleLevel <= 2 || authService.hasPageAccess('rd_fabric')) {
      items.push({ text: t('nav.admin', 'Admin'), icon: <WarehouseIcon fontSize="small" />, path: `${BASE}/admin`, pageCode: 'rd_fabric' });
    }
    return items;
  }, [t, roleLevel]);

  // Pages only needs to render the Outlet, and React Router takes care of sub-routes
  const pages = useMemo(() => [
    { path: BASE, component: <Outlet /> }
  ], []);

  const headerExtra = (
    <IconButton onClick={() => setSettingsOpen(true)} size="small" sx={{ color: 'text.secondary', mr: 1, display: { xs: 'inline-flex', md: 'none' } }}>
      <SettingsIcon />
    </IconButton>
  );

  return (
    <>
      <AppShell
        appTitle="R&D Material Library"
        appTitleShort="R&D MATERIAL"
        appLogo={<WarehouseIcon sx={{ color: '#fff', fontSize: 20 }} />}
        accentColor="#2e7d32"
        drawerWidth={240}
        navItems={navItems}
        pages={pages}
        storageKey="rd_layout_open"
        versionString="R&D v1.0.0"
        headerExtra={headerExtra}
        onSettingsClick={() => setSettingsOpen(true)}
        settingsText={t('rdMaterial.settings', 'Settings')}
        fallbackPath="/rd-material/fabric"
        rootPath="/rd-material"
      />
      <RDSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
