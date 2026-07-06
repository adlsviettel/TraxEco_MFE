import { authFetch } from './apiInterceptor';
/**
 * Tracking Service — ghi nhận hoạt động user
 */

const API_BASE = 'tracking';

const getToken = () => localStorage.getItem('token');

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

export const trackingService = {
  /**
   * Ghi log 1 hoạt động
   */
  log: async (action: string, module?: string, details?: string) => {
    if (!getToken()) return; // skip if not logged in
    try {
      await authFetch(`${API_BASE}/log`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action, module, details }),
      });
    } catch {
      // Silent fail — tracking không nên block app
    }
  },

  /**
   * Gửi heartbeat (online status)
   */
  heartbeat: async (page: string) => {
    if (!getToken()) return; // skip if not logged in
    try {
      await authFetch(`${API_BASE}/heartbeat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ page }),
      });
    } catch {
      // Silent fail
    }
  },

  /**
   * Lấy danh sách activities (admin)
   */
  getActivities: async (params: Record<string, string> = {}): Promise<any[]> => {
    const qs = new URLSearchParams(params).toString();
    const res = await authFetch(`${API_BASE}/activities?${qs}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },

  /**
   * Lấy danh sách online users
   */
  getOnlineUsers: async (): Promise<any[]> => {
    const res = await authFetch(`${API_BASE}/online-users`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },

  /**
   * Lấy thống kê
   */
  getStats: async (fromDate?: string, toDate?: string): Promise<any> => {
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    const res = await authFetch(`${API_BASE}/stats?${params.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },
};
