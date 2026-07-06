import { authFetch } from './apiInterceptor';

export interface AppInfo {
  appCode: string;
  appName: string;
  isActive: boolean;
  createdBy?: string;
}

export const appService = {
  async getAllApps(): Promise<AppInfo[]> {
    const res = await authFetch('apps');
    if (!res.ok) throw new Error('Failed to load apps');
    const json = await res.json();
    return Array.isArray(json) ? json : (json.data || []);
  },

  async upsertApp(appCode: string, appName: string, isActive = true): Promise<void> {
    const res = await authFetch('apps', {
      method: 'POST',
      body: JSON.stringify({ appCode, appName, isActive }),
    });
    if (!res.ok) throw new Error('Failed to save app');
  },

  async deleteApp(appCode: string): Promise<void> {
    const res = await authFetch(`apps/${encodeURIComponent(appCode)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete app');
  },

  async getUserApps(employeeCode: string): Promise<string[]> {
    const res = await authFetch(`apps/user/${encodeURIComponent(employeeCode)}`);
    if (!res.ok) throw new Error('Failed to load user apps');
    const json = await res.json();
    return Array.isArray(json) ? json : (json.data || []);
  },

  async getMyApps(): Promise<string[]> {
    const res = await authFetch('apps/my-apps');
    if (!res.ok) throw new Error('Failed to load my apps');
    const json = await res.json();
    return Array.isArray(json) ? json : (json.data || []);
  },

  async setUserApps(employeeCode: string, appCodes: string[]): Promise<void> {
    const res = await authFetch(`apps/user/${encodeURIComponent(employeeCode)}`, {
      method: 'POST',
      body: JSON.stringify({ appCodes }),
    });
    if (!res.ok) throw new Error('Failed to update user apps');
  },
};
