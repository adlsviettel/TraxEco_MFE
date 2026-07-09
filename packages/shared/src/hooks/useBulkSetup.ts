import { useState, useRef, useMemo } from 'react';
import { permissionService, type UserWithPermissions } from '../services/permissionService';
import { authFetch } from '../services/apiInterceptor';

export const useBulkSetup = (
  currentAppCode: string | null,
  users: UserWithPermissions[],
  t: any,
  setSnackbar: (sb: any) => void,
  onSuccess: () => void
) => {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStep, setBulkStep] = useState(1);
  const bulkSearchRef = useRef<HTMLInputElement>(null);
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const [bulkSelectedUsers, setBulkSelectedUsers] = useState<any[]>([]);
  const [bulkRoleLevel, setBulkRoleLevel] = useState(4);
  const [bulkAppCodes, setBulkAppCodes] = useState<string[]>(currentAppCode ? [currentAppCode] : []);
  const [bulkPermissions, setBulkPermissions] = useState<any[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const existingUserCodes = useMemo(() => {
    return new Set((Array.isArray(users) ? users : []).map(u => u.employeeCode));
  }, [users]);

  const handleBulkSearch = async (query: string) => {
    if (!query || query.length < 2) return;
    try {
      const res = await authFetch(`accounts/search-staff?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const json = await res.json();
        const data = Array.isArray(json) ? json : (json.data || []);
        setBulkResults(data);
      }
    } catch {
      setBulkResults([]);
    }
  };

  const handleBulkSetup = async () => {
    if (bulkSelectedUsers.length === 0) return;
    setBulkSaving(true);
    try {
      const payloads = bulkSelectedUsers.map(u => ({
        employeeCode: u.code || u.id_staff || u.idStaff,
        employeeName: u.fullname,
        factory: (u.dept || u.id_dept || '').substring(0, 2),
        dept: u.dept || u.id_dept || '',
        section: '',
        roleLevel: bulkRoleLevel,
        appCodes: bulkAppCodes,
        permissions: bulkPermissions
      }));

      const res = await authFetch('accounts/bulk-setup', {
        method: 'POST',
        body: JSON.stringify(payloads),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      setSnackbar({
        open: true,
        message: t('admin.bulkSuccess', 'Bulk setup completed for {{count}} users', { count: bulkSelectedUsers.length }),
        severity: 'success'
      });
      setBulkOpen(false);
      
      // Reset state
      setBulkStep(1);
      setBulkResults([]);
      setBulkSelectedUsers([]);
      setBulkPermissions([]);
      
      onSuccess();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || t('admin.bulkError', 'Failed to execute bulk setup'),
        severity: 'error'
      });
    } finally {
      setBulkSaving(false);
    }
  };

  return {
    bulkOpen,
    setBulkOpen,
    bulkStep,
    setBulkStep,
    bulkSearchRef,
    bulkResults,
    setBulkResults,
    bulkSelectedUsers,
    setBulkSelectedUsers,
    bulkRoleLevel,
    setBulkRoleLevel,
    bulkAppCodes,
    setBulkAppCodes,
    bulkPermissions,
    setBulkPermissions,
    bulkSaving,
    existingUserCodes,
    handleBulkSearch,
    handleBulkSetup
  };
};
