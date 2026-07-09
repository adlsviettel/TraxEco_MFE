import { useState, useCallback, useRef, useMemo } from 'react';
import { permissionService, type UserWithPermissions } from '../services/permissionService';
import { authFetch } from '../services/apiInterceptor';

export interface StaffOption { 
  id_staff?: string; 
  code?: string; 
  idStaff?: string; 
  fullname: string; 
  id_dept?: string; 
  dept?: string; 
}

export const useUserManagement = (currentAppCode: string | null, t: any, setSnackbar: (sb: any) => void) => {
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);

  // Autocomplete Staff Search
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create Form State
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(() => ({
    employeeCode: '',
    employeeName: '',
    factory: localStorage.getItem('factory') || '',
    dept: localStorage.getItem('dept') || '',
    section: localStorage.getItem('section') || '',
    roleLevel: 4,
    appCodes: (currentAppCode ? [currentAppCode] : []) as string[]
  }));
  const [creating, setCreating] = useState(false);

  // Edit Form State
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ employeeCode: '', employeeName: '', factory: '', dept: '', section: '', roleLevel: 4 });
  const [editing, setEditing] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true); 
    setError(null);
    try {
      const data = await permissionService.getAllUsers(currentAppCode);
      const safeData = Array.isArray(data) ? data : ((data as any).users || (data as any).data || []);
      
      // Deduplicate users and merge permissions
      const uniqueUsersMap = new Map<string, UserWithPermissions>();
      safeData.forEach((u: UserWithPermissions, index: number) => {
        const key = u.employeeCode || u.employeeName || `${u.factory || 'unknown'}-${u.dept || 'unknown'}-${index}`;
        if (!uniqueUsersMap.has(key)) {
          uniqueUsersMap.set(key, { ...u, permissions: [...(u.permissions || [])] });
        } else {
          const existing = uniqueUsersMap.get(key)!;
          if (u.permissions && Array.isArray(u.permissions)) {
            existing.permissions = [...existing.permissions, ...u.permissions];
          }
        }
      });
      
      const mergedUsers = Array.from(uniqueUsersMap.values());
      setUsers(mergedUsers);
      
      // Update selectedUser reference if it's currently selected
      setSelectedUser(prev => {
        if (!prev) return null;
        const updated = mergedUsers.find((u: any) => {
          if (prev.employeeCode && u.employeeCode && u.employeeCode === prev.employeeCode) return true;
          if (prev.employeeName && u.employeeName && u.employeeName === prev.employeeName) return true;
          return false;
        });
        return updated || prev;
      });
    } catch { 
      setError(t('admin.errorFetch', 'Failed to load users')); 
    } finally { 
      setLoading(false); 
    }
  }, [t, currentAppCode]);

  const handleStaffSearch = (query: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (query.length < 2) { 
      setStaffOptions([]); 
      return; 
    }
    
    searchTimerRef.current = setTimeout(async () => {
      setStaffLoading(true);
      try {
        const res = await authFetch(`accounts/search-staff?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const json = await res.json();
          let data: StaffOption[] = Array.isArray(json) ? json : (json.data || []);
          
          const myDept = localStorage.getItem('dept') || '';
          const myFactory = localStorage.getItem('factory') || (myDept ? myDept.substring(0, 2) : '');
          const roleLevel = Number(localStorage.getItem('roleLevel') || '99');
          const isSuperAdmin = localStorage.getItem('isSuperAdmin') === 'true';

          if (!isSuperAdmin && roleLevel > 1 && myFactory) {
            const upperFactory = myFactory.trim().toUpperCase();
            data = data.filter(d => {
              const staffDept = (d.id_dept || d.dept || '').trim().toUpperCase();
              return staffDept.startsWith(upperFactory);
            });
          }
          setStaffOptions(data);
        }
      } catch { 
        /* ignore */ 
      } finally { 
        setStaffLoading(false); 
      }
    }, 300);
  };

  const handleCreateAccount = async () => {
    if (!createForm.employeeCode.trim()) return;
    setCreating(true);
    try {
      const payload = {
        employeeCode: createForm.employeeCode.trim(),
        employeeName: createForm.employeeName,
        factory: createForm.factory,
        dept: createForm.dept,
        section: createForm.section,
        roleLevel: createForm.roleLevel
      };
      const res = await authFetch('accounts/create', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      
      setSnackbar({ open: true, message: t('admin.accountCreated', { code: createForm.employeeCode }), severity: 'success' });
      
      // Auto-assign apps to the new user
      if (createForm.appCodes && createForm.appCodes.length > 0) {
        try {
          const { appService } = await import('../services/appService');
          await appService.setUserApps(createForm.employeeCode.trim(), createForm.appCodes);
        } catch { /* best-effort, user can still assign manually */ }
      }

      setCreateOpen(false);
      // Reset form
      setCreateForm({
        employeeCode: '',
        employeeName: '',
        factory: localStorage.getItem('factory') || '',
        dept: localStorage.getItem('dept') || '',
        section: localStorage.getItem('section') || '',
        roleLevel: 4,
        appCodes: (currentAppCode ? [currentAppCode] : []) as string[]
      });
      fetchUsers();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || t('admin.createError', 'Failed to create account'), severity: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleEditAccount = async () => {
    if (!editForm.employeeCode) return;
    setEditing(true);
    try {
      const res = await authFetch(`accounts/update/${encodeURIComponent(editForm.employeeCode)}`, {
        method: 'POST',
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      
      setSnackbar({ open: true, message: t('admin.editSuccess', 'Account updated successfully'), severity: 'success' });
      setEditOpen(false);
      fetchUsers();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || t('admin.editError', 'Failed to update account'), severity: 'error' });
    } finally {
      setEditing(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const list = Array.isArray(users) ? users : [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(u => 
      (u.employeeCode || '').toLowerCase().includes(q) || 
      (u.employeeName || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  return {
    users,
    loading,
    error,
    search,
    setSearch,
    selectedUser,
    setSelectedUser,
    filteredUsers,
    fetchUsers,
    
    // Create Account Dialog States/Actions
    createOpen,
    setCreateOpen,
    createForm,
    setCreateForm,
    creating,
    handleCreateAccount,
    
    // Edit Account Dialog States/Actions
    editOpen,
    setEditOpen,
    editForm,
    setEditForm,
    editing,
    handleEditAccount,
    
    // Autocomplete search staff
    staffOptions,
    staffLoading,
    handleStaffSearch
  };
};
