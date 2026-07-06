import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackingService } from '../services/trackingService';

/**
 * Hook tự động tracking:
 * - Gửi PAGE_VISIT mỗi khi user chuyển trang
 * - Gửi HEARTBEAT mỗi 60 giây (để biết user đang online)
 * 
 * Sử dụng: đặt <ActivityTracker /> trong Layout chính (1 lần duy nhất)
 */
export function useActivityTracker() {
  const location = useLocation();
  const lastPath = useRef('');

  // Track page visits
  useEffect(() => {
    const path = location.pathname + location.hash;
    if (path !== lastPath.current) {
      lastPath.current = path;

      // Xác định module từ path
      const module = detectModule(path);
      trackingService.log('PAGE_VISIT', module, path);
    }
  }, [location]);

  // Heartbeat mỗi 60 giây
  useEffect(() => {
    const send = () => {
      const path = location.pathname + location.hash;
      trackingService.heartbeat(path);
    };

    send(); // Gửi ngay khi mount
    const interval = setInterval(send, 60_000); // Mỗi 60s

    return () => clearInterval(interval);
  }, [location]);
}

/**
 * Xác định module từ URL path
 */
function detectModule(path: string): string {
  if (path.includes('f2s-delivery') || path.includes('deliver')) return 'F2S_DELIVERY';
  if (path.includes('fgs') || path.includes('scan') || path.includes('history')) return 'FGS_WH';
  if (path.includes('insw')) return 'INSW';
  if (path.includes('qcfb')) return 'QCFB_WH';
  if (path.includes('admin') || path.includes('account') || path.includes('permission')) return 'ADMIN';
  if (path.includes('inventory') || path.includes('fabric')) return 'INVENTORY';
  if (path.includes('dashboard')) return 'DASHBOARD';
  if (path.includes('tracking')) return 'TRACKING';
  return 'OTHER';
}

/**
 * Component wrapper — đặt trong Layout
 * Usage: <ActivityTracker />
 */
export function ActivityTracker() {
  useActivityTracker();
  return null;
}
