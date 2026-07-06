import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.tsx';
import Dashboard from '../pages/Dashboard.tsx';
import MasterData from '../pages/MasterData.tsx';
import Pemasukan from '../pages/Inbound.tsx';
import Pengeluaran from '../pages/Outbound.tsx';
import StockOpname from '../pages/StockOpname.tsx';
import Adjustment from '../pages/Adjustment.tsx';
import InswPush from '../pages/InswPush.tsx';
import Logs from '../pages/Logs.tsx';
import Settings from '../pages/Settings.tsx';
import Account from '../pages/Account.tsx';
import { authService } from '@traxeco/shared';
import InswMapping from '../pages/InswMapping.tsx';

/**
 * Keep-Alive layout: all pages are mounted once and never unmount.
 * Only the active page is visible (display:block), others are hidden (display:none).
 */

const BASE = '/it-inventory';

const PAGES = [
  { path: '/',              component: <Dashboard />, pageCode: 'it_dashboard' },
  { path: '/master-data',   component: <MasterData />, pageCode: 'it_master_data' },
  { path: '/pemasukan',     component: <Pemasukan />, pageCode: 'it_inbound' },
  { path: '/pengeluaran',   component: <Pengeluaran />, pageCode: 'it_outbound' },
  { path: '/stock-opname/machinery', component: <StockOpname category="machinery" />, pageCode: 'it_stock_opname' },
  { path: '/stock-opname/auxiliary', component: <StockOpname category="auxiliary" />, pageCode: 'it_stock_opname' },
  { path: '/stock-opname/wip',       component: <StockOpname category="wip" />,       pageCode: 'it_stock_opname' },
  { path: '/stock-opname/finished',  component: <StockOpname category="finished" />,  pageCode: 'it_stock_opname' },
  { path: '/stock-opname/scrap',     component: <StockOpname category="scrap" />,     pageCode: 'it_stock_opname' },
  { path: '/adjustment',    component: <Adjustment />, pageCode: 'it_adjustment' },
  { path: '/insw-push',     component: <InswPush />, pageCode: 'it_insw_push' },
  { path: '/logs',          component: <Logs />, pageCode: 'it_logs' },
  { path: '/settings',      component: <Settings />, pageCode: 'it_settings' },
  { path: '/insw-mapping',  component: <InswMapping />, pageCode: 'it_insw_mapping' },
  { path: '/account',       component: <Account />, pageCode: 'it_account' },
] as const;

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Strip base prefix to match page paths
  const rawPath = location.pathname.replace(BASE, '') || '/';
  const currentPath = rawPath === '' ? '/' : rawPath;

  const allowedPages = PAGES.filter(p => 
    p.pageCode === 'it_account' || authService.hasPageAccess(p.pageCode)
  );

  useEffect(() => {
    // Use shared JWT auth instead of IT Inventory's own auth
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (allowedPages.length > 0) {
      const isCurrentPathAllowed = allowedPages.some(p => p.path === currentPath);
      if (!isCurrentPathAllowed) {
        navigate(`${BASE}${allowedPages[0].path}`, { replace: true });
      }
    }
  }, [navigate, currentPath, allowedPages]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        {allowedPages.map(({ path, component }) => (
          <div
            key={path}
            className="page-alive"
            style={{ display: currentPath === path ? 'flex' : 'none', flexDirection: 'column' }}
          >
            {component}
          </div>
        ))}
      </div>
    </div>
  );
}
