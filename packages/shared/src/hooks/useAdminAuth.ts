import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ROUTE_TO_APP: Record<string, string> = {
  fgswh: 'FGS_WH',
  fabricwh: 'FABRIC_WH',
  'it-inventory': 'IT_INVENTORY',
  'f2s-delivery': 'F2S_DELIVERY',
  'qcfb-wh': 'QCFB_WH',
  'rd-material': 'RD_MATERIAL',
  'tcc-template': 'TCC_TEMPLATE',
};

const APP_ADMIN_PAGES: Record<string, string> = {
  FGS_WH: 'admin',
  FABRIC_WH: 'fb_admin',
  QCFB_WH: 'qcfb-admin',
  RD_MATERIAL: 'rd_admin',
  TCC_TEMPLATE: 'tcc_admin',
  F2S_DELIVERY: 'f2s_admin',
  IT_INVENTORY: 'it_admin'
};

export const useAdminAuth = () => {
  const location = useLocation();
  const nav = useNavigate();

  const pathSegment = location.pathname.split('/').filter(Boolean)[0] || '';
  const currentAppCode = ROUTE_TO_APP[pathSegment] || null;

  const isSuperAdmin = localStorage.getItem('isSuperAdmin') === 'true';
  const myRoleLevel = Number(localStorage.getItem('roleLevel') || '99');

  useEffect(() => {
    const isCurrentAdminPage = location.pathname.endsWith('/admin') || location.pathname.includes('/admin/');
    if (!isCurrentAdminPage) return;

    if (isSuperAdmin || myRoleLevel <= 1) return; // SuperAdmin & Admin can access

    if (myRoleLevel === 2 || myRoleLevel === 3) {
      if (currentAppCode) {
        const requiredPageCode = APP_ADMIN_PAGES[currentAppCode];
        try {
          const permsStr = localStorage.getItem('permissions') || '[]';
          const perms = JSON.parse(permsStr);
          const hasAdminAccess = perms.some((p: any) => p.pageCode === requiredPageCode && p.canView);
          if (hasAdminAccess) return; // Authorized
        } catch (e) {
          console.error('Error parsing permissions in useAdminAuth', e);
        }
      }
    }
    
    // Unauthorized
    nav('/', { replace: true });
  }, [location.pathname, currentAppCode, isSuperAdmin, myRoleLevel, nav]);

  return {
    pathSegment,
    currentAppCode,
    isSuperAdmin,
    myRoleLevel
  };
};
