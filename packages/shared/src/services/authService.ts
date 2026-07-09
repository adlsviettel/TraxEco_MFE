import { trackingService } from './trackingService';
import { startTokenRefreshTimer, stopTokenRefreshTimer } from './apiInterceptor';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

export interface Permission {
  id: number;
  employeeCode: string;
  pageCode: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canBypassCheck?: boolean;
  bypassQC?: boolean;
  bypassRelax?: boolean;
  bypassLabTest?: boolean;
  bypassSunrise?: boolean;
  grantedBy: string;
  grantedDate: string;
}

export interface LoginResponse {
  token: string;
  type: string;
  employeeCode: string;
  employeeName: string;
  factory: string;
  dept: string;
  section: string;
  roleLevel: number;
  roleLabel: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  mustChangePassword: boolean;
  permissions: Permission[];
}

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    // DIAGNOSTIC ALERT REMOVED
    console.log('Login request to:', `${API_BASE_URL}/auth/login`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Login failed (${response.status}): ${errorText}\nURL: ${API_BASE_URL}/auth/login`);
        if (response.status === 401) {
          throw new Error('INVALID_CREDENTIALS');
        }
        if (response.status === 403) {
          throw new Error('NO_APP_ACCESS');
        }
        throw new Error('SERVER_ERROR');
      }

      const json = await response.json();
      const data: LoginResponse = (json.code !== undefined && json.data !== undefined) ? json.data : json;
      localStorage.setItem('token', data.token);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('employeeCode', data.employeeCode);
      localStorage.setItem('employeeName', data.employeeName);
      localStorage.setItem('factory', data.factory || '');
      localStorage.setItem('dept', data.dept || '');
      localStorage.setItem('section', data.section || '');
      localStorage.setItem('roleLevel', String(data.roleLevel ?? 4));
      localStorage.setItem('roleLabel', data.roleLabel || 'Worker');
      localStorage.setItem('isSuperAdmin', String(data.isSuperAdmin));
      localStorage.setItem('isAdmin', String(data.isAdmin));
      localStorage.setItem('mustChangePassword', String(data.mustChangePassword));
      localStorage.setItem('permissions', JSON.stringify(data.permissions || []));

      // Track login
      trackingService.log('LOGIN', 'AUTH', data.employeeCode);

      // Start auto-refresh timer
      startTokenRefreshTimer();

      return data;
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error && err.message !== 'INVALID_CREDENTIALS' && err.message !== 'NO_APP_ACCESS') {
         console.error(`Network Error: ${err.message}\nURL: ${API_BASE_URL}/auth/login`);
      }
      throw err;
    }
  },

  logout() {
    // Track logout trước khi xóa token
    trackingService.log('LOGOUT', 'AUTH', localStorage.getItem('employeeCode') || '');

    // Stop auto-refresh timer
    stopTokenRefreshTimer();

    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('employeeCode');
    localStorage.removeItem('employeeName');
    localStorage.removeItem('factory');
    localStorage.removeItem('dept');
    localStorage.removeItem('section');
    localStorage.removeItem('roleLevel');
    localStorage.removeItem('roleLabel');
    localStorage.removeItem('isSuperAdmin');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('mustChangePassword');
    localStorage.removeItem('permissions');
    // Clear all cached page states
    sessionStorage.clear();
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  isAuthenticated(): boolean {
    return localStorage.getItem('isAuthenticated') === 'true';
  },

  isSuperAdmin(): boolean {
    return localStorage.getItem('isSuperAdmin') === 'true';
  },

  isAdmin(): boolean {
    return localStorage.getItem('isAdmin') === 'true';
  },

  mustChangePassword(): boolean {
    return localStorage.getItem('mustChangePassword') === 'true';
  },

  clearMustChangePassword() {
    localStorage.setItem('mustChangePassword', 'false');
  },

  getRoleLevel(): number {
    return parseInt(localStorage.getItem('roleLevel') || '4', 10);
  },

  getRoleLabel(): string {
    return localStorage.getItem('roleLabel') || 'Worker';
  },

  getPermissions(): Permission[] {
    try {
      return JSON.parse(localStorage.getItem('permissions') || '[]');
    } catch {
      return [];
    }
  },

  /**
   * Check if user can access a page
   */
  hasPageAccess(pageCode: string): boolean {
    if (this.isSuperAdmin()) return true;
    if (this.isAdmin()) return true;
    // Supervisor (roleLevel 2) can access admin page
    const roleLevel = Number(localStorage.getItem('roleLevel') || '99');
    if (pageCode === 'admin' && roleLevel <= 2) return true;
    const perms = this.getPermissions();
    return perms.some(p => p.pageCode === pageCode && p.canView);
  },

  /**
   * Check if user has specific action permission on a page
   */
  hasAction(pageCode: string, action: 'canAdd' | 'canEdit' | 'canDelete' | 'canExport' | 'canCancel' | 'canBypassCheck' | 'bypassQC' | 'bypassRelax' | 'bypassLabTest' | 'bypassSunrise'): boolean {
    if (this.isSuperAdmin()) return true;
    const perm = this.getPermissions().find(p => p.pageCode === pageCode);
    return perm ? !!perm[action] : false;
  },

  getUserInfo() {
    return {
      employeeCode: localStorage.getItem('employeeCode') || '',
      employeeName: localStorage.getItem('employeeName') || '',
      factory: localStorage.getItem('factory') || '',
      dept: localStorage.getItem('dept') || '',
      section: localStorage.getItem('section') || '',
      roleLabel: localStorage.getItem('roleLabel') || 'Worker',
    };
  },
};
