import { authFetch } from './apiInterceptor';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

export const factoryPermissionService = {
  /** Get all distinct factories */
  async getAllFactories(): Promise<string[]> {
    // Sử dụng API thực tế đã có sẵn để lấy list factory
    const res = await authFetch(`${API_BASE_URL}/fabric-wh/target-factories`);
    if (res.status === 403) return [];
    if (!res.ok) throw new Error('Failed to load factories');
    return res.json();
  },

  /** Get user's allowed factories for an app */
  async getUserFactories(_employeeCode: string, _appCode: string): Promise<string[]> {
    const res = await authFetch(`${API_BASE_URL}/factory-permissions/${encodeURIComponent(_employeeCode)}/${encodeURIComponent(_appCode)}`);
    if (!res.ok) throw new Error('Failed to load user factories');
    return res.json();
  },

  /** Set user's factories for an app */
  async setUserFactories(_employeeCode: string, _appCode: string, _factories: string[]): Promise<void> {
    const res = await authFetch(`${API_BASE_URL}/factory-permissions/${encodeURIComponent(_employeeCode)}/${encodeURIComponent(_appCode)}`, {
      method: 'POST',
      body: JSON.stringify({ factories: _factories }),
    });
    if (!res.ok) throw new Error('Failed to update factories');
  },

  /** Get current user's allowed factories for an app (for data filtering) */
  async getMyFactories(appCode: string): Promise<{ all: boolean; factories: string[] }> {
    const res = await authFetch(`${API_BASE_URL}/factory-permissions/my/${encodeURIComponent(appCode)}`);
    if (!res.ok) throw new Error('Failed');
    return res.json();
  },
};
