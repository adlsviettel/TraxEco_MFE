import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search as SearchIcon,
  Inventory as PutawayIcon,
  QrCodeScanner as QrCodeIcon,
} from '@mui/icons-material';
import { AppShell , authService } from '@traxeco/shared';
import AccessorySearchPage from '../pages/AccessorySearchPage';
import AccessoryPutawayPage from '../pages/AccessoryPutawayPage';

export default function AccessoryLayout() {
  const { t } = useTranslation();

  const navItems = useMemo(() => [
    { text: t('qcfb.nav.Tracứu&InTem', 'Tra cứu & In Tem'), icon: <SearchIcon />, path: '/acc-wh/search', pageCode: 'acc-search' },
    { text: t('qcfb.nav.CấtKệ', 'Cất Kệ'), icon: <PutawayIcon />, path: '/acc-wh/putaway', pageCode: 'acc-putaway' },
  ], [t]);

  const pages = useMemo(() => [
    { path: '/acc-wh/search', component: <AccessorySearchPage /> },
    { path: '/acc-wh/putaway', component: <AccessoryPutawayPage /> },
  ], []);

  return (
    <AppShell
      appTitle={t('app.accessoryWH', 'Kho Phụ Liệu')}
      appTitleShort="ACCESSORY"
      appLogo={<QrCodeIcon sx={{ color: '#fff', fontSize: 18 }} />}
      accentColor="#2e7d32"
      drawerWidth={260}
      navItems={navItems}
      pages={pages}
      storageKey="acc_drawer_open"
      versionString="ACC_WH v1.1.8-0410"
      fallbackPath="/acc-wh/search"
      rootPath="/acc-wh"
    />
  );
}
