import { useState, useEffect, useCallback, useRef } from 'react';
import { qcAccessoryApi } from '../services/qcAccessoryApi';

export function useAutoRefresh(intervalMs: number = 90000) {
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [invoiceCount, setInvoiceCount] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await qcAccessoryApi.refreshInvoice();
      setInvoiceCount(Array.isArray(data) ? data.length : 0);
      setLastRefresh(new Date().toLocaleTimeString('vi-VN'));
    } catch {
      // Silent fail for background refresh
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh(); // Initial load
    intervalRef.current = setInterval(refresh, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh, intervalMs]);

  const manualRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  return { lastRefresh, isRefreshing, invoiceCount, manualRefresh };
}
