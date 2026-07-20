const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

const getHeaders = async () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export interface UserWithPermissions {
  employeeCode: string;
  employeeName: string;
  email?: string;
  factory: string;
  dept: string;
  section: string;
  roleLevel: number;
  roleLabel: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isActive: boolean;
  appCodes?: string[];
  permissions: {
    pageCode: string;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
    canCancel?: boolean;
    canBypassCheck: boolean;
    bypassQC?: boolean;
    bypassRelax?: boolean;
    bypassLabTest?: boolean;
    bypassSunrise?: boolean;
    grantedBy: string;
  }[];
}

export const permissionService = {
  async getAllUsers(appCode?: string | null): Promise<UserWithPermissions[]> {
    const url = appCode 
      ? `${API_BASE_URL}/permissions/all-users?appCode=${encodeURIComponent(appCode)}`
      : `${API_BASE_URL}/permissions/all-users`;
    const response = await fetch(url, {
      headers: await getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    const json = await response.json();
    return Array.isArray(json) ? json : (json.data || json.users || []);
  },

  async grantPermission(data: {
    employeeCode: string;
    pageCode: string;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
    canCancel?: boolean;
    canBypassCheck?: boolean;
    bypassQC?: boolean;
    bypassRelax?: boolean;
    bypassLabTest?: boolean;
    bypassSunrise?: boolean;
  }): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/permissions/grant`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to grant permission');
  },

  async revokePermission(employeeCode: string, pageCode: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/permissions/${employeeCode}/${pageCode}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to revoke permission');
  },

  async refreshMyPermissions(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/permissions/my`, {
      headers: await getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to refresh permissions');
    const data = await response.json();
    localStorage.setItem('isSuperAdmin', String(data.isSuperAdmin));
    localStorage.setItem('isAdmin', String(data.isAdmin));
    localStorage.setItem('roleLevel', String(data.roleLevel ?? 4));
    localStorage.setItem('roleLabel', data.roleLabel || 'Worker');
    localStorage.setItem('permissions', JSON.stringify(data.permissions || []));
  },

  async toggleActive(employeeCode: string, isActive: boolean): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/accounts/toggle-active`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ employeeCode, isActive }),
    });
    if (!response.ok) throw new Error('Failed to toggle user status');
  },

  async deleteUser(employeeCode: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/accounts/delete/${encodeURIComponent(employeeCode)}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete user');
  },
};
