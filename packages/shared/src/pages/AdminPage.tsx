import { useState, useCallback, useEffect, useMemo, memo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Checkbox, Chip, Button, TextField, CircularProgress,
  Alert, Snackbar, InputAdornment, Tooltip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, MenuItem, Select, FormControl, InputLabel,
  Autocomplete, Switch, Accordion, AccordionSummary, AccordionDetails,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tab, Tabs, useTheme, useMediaQuery,
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon, Search as SearchIcon, Save as SaveIcon,
  Refresh as RefreshIcon, PersonAdd as PersonAddIcon, Delete as DeleteIcon,
  Apps as AppsIcon, Add as AddIcon, ExpandMore as ExpandMoreIcon,
  Timeline as TrackingIcon, WarningRounded as WarningIcon,
  Factory as FactoryIcon, Edit as EditIcon,
  GroupAdd as GroupAddIcon, ChevronRight as ChevronRightIcon, ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { permissionService, type UserWithPermissions } from '../services/permissionService';
import { appService, type AppInfo } from '../services/appService';
import { factoryPermissionService } from '../services/factoryPermissionService';
import { authFetch } from '../services/apiInterceptor';
import { PERMISSION_PRESETS } from '../config/permissionPresets';
import { EXTRA_PAGES } from '../config/appPages';

const ACTIONS = ['canView', 'canAdd', 'canEdit', 'canDelete', 'canExport', 'canBypassCheck', 'bypassQC', 'bypassRelax', 'bypassLabTest', 'bypassSunrise'] as const;
const ACTION_LABELS: Record<string, string> = {
  canView: '👁 View', canAdd: '➕ Add', canEdit: '✏️ Edit', canDelete: '🗑 Del', canExport: '📥 Exp', canBypassCheck: '🔓 Bypass All',
  bypassQC: '🔓 QC', bypassRelax: '🔓 Relax', bypassLabTest: '🔓 Lab', bypassSunrise: '🔓 Sunrise',
};
// Pages that support the Bypass permission (skip QC/Lab/Relax checks)
const BYPASS_PAGES = new Set(['fb_issue', 'fb_relax']);

const ROUTE_TO_APP: Record<string, string> = {
  fgswh: 'FGS_WH',
  fabricwh: 'FABRIC_WH',
  'it-inventory': 'IT_INVENTORY',
  'f2s-delivery': 'F2S_DELIVERY',
  'qcfb-wh': 'QCFB_WH',
  'rd-material': 'RD_MATERIAL',
  'tcc-template': 'TCC_TEMPLATE',
};

interface PendingChange {
  employeeCode: string; pageCode: string;
  canView: boolean; canAdd: boolean; canEdit: boolean; canDelete: boolean; canExport: boolean; canBypassCheck: boolean;
  bypassQC: boolean; bypassRelax: boolean; bypassLabTest: boolean; bypassSunrise: boolean;
}

interface PageDef { code: string; label: string; appCode: string; }

const PermissionRow = memo(({ pg, user, pendingChange, themeColor, onToggle }: any) => {
  const perm = user.permissions.find((p: any) => p.pageCode === pg.code);
  const state = pendingChange || {
    employeeCode: user.employeeCode, pageCode: pg.code,
    canView: perm?.canView ?? false, canAdd: perm?.canAdd ?? false,
    canEdit: perm?.canEdit ?? false, canDelete: perm?.canDelete ?? false,
    canExport: perm?.canExport ?? false,
    canBypassCheck: perm?.canBypassCheck ?? false,
    bypassQC: perm?.bypassQC ?? false,
    bypassRelax: perm?.bypassRelax ?? false,
    bypassLabTest: perm?.bypassLabTest ?? false,
    bypassSunrise: perm?.bypassSunrise ?? false,
  };
  const hasChange = !!pendingChange;

  return (
    <TableRow sx={{ 
      backgroundColor: hasChange ? '#fefce8' : 'transparent',
      '&:hover': { backgroundColor: '#f8fafc' },
      transition: 'all 0.2s'
    }}>
      <TableCell sx={{ fontWeight: 700, borderBottom: '1px solid #f1f5f9', color: '#334155', fontSize: '0.9rem' }}>{pg.label}</TableCell>
      {ACTIONS.map(a => {
        if (a.toLowerCase().includes('bypass')) {
          if (!BYPASS_PAGES.has(pg.code)) {
            return <TableCell key={a} align="center" sx={{ py: 0.5, borderBottom: '1px solid #f1f5f9' }} />;
          }
          if (pg.code === 'fb_relax' && a !== 'bypassSunrise') {
            return <TableCell key={a} align="center" sx={{ py: 0.5, borderBottom: '1px solid #f1f5f9' }} />;
          }
        }
        return (
          <TableCell key={a} align="center" sx={{ py: 0.5, borderBottom: '1px solid #f1f5f9' }}>
            <Checkbox size="small" checked={!!state[a]}
              onChange={() => onToggle(user, pg.code, a, state)}
              sx={{ p: 0.5, color: '#cbd5e1', '&.Mui-checked': { color: a === 'canBypassCheck' ? '#f97316' : themeColor, '& .MuiSvgIcon-root': { transform: 'scale(1.1)', transition: 'all 0.2s' } } }} />
          </TableCell>
        );
      })}
    </TableRow>
  );
});

const MobilePermissionRow = memo(({ pg, user, pendingChange, themeColor, onToggle }: any) => {
  const perm = user.permissions.find((p: any) => p.pageCode === pg.code);
  const state = pendingChange || {
    employeeCode: user.employeeCode, pageCode: pg.code,
    canView: perm?.canView ?? false, canAdd: perm?.canAdd ?? false,
    canEdit: perm?.canEdit ?? false, canDelete: perm?.canDelete ?? false,
    canExport: perm?.canExport ?? false,
    canBypassCheck: perm?.canBypassCheck ?? false,
    bypassQC: perm?.bypassQC ?? false,
    bypassRelax: perm?.bypassRelax ?? false,
    bypassLabTest: perm?.bypassLabTest ?? false,
    bypassSunrise: perm?.bypassSunrise ?? false,
  };
  const hasChange = !!pendingChange;

  return (
    <Box sx={{ 
      p: 1.5, 
      mb: 1.5, 
      borderRadius: '8px', 
      border: '1px solid #e2e8f0', 
      backgroundColor: hasChange ? '#fefce8' : '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }}>
      <Typography sx={{ fontWeight: 800, color: '#334155', fontSize: '0.85rem', mb: 1 }}>
        {pg.label}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {ACTIONS.map(a => {
          if (a.toLowerCase().includes('bypass')) {
            if (!BYPASS_PAGES.has(pg.code)) return null;
            if (pg.code === 'fb_relax' && a !== 'bypassSunrise') return null;
          }
          
          const isSelected = !!state[a];
          const isBypass = a.toLowerCase().includes('bypass');
          
          return (
            <Chip
              key={a}
              label={ACTION_LABELS[a]}
              size="small"
              onClick={() => onToggle(user, pg.code, a, state)}
              variant={isSelected ? 'filled' : 'outlined'}
              sx={{
                fontSize: 10,
                fontWeight: 700,
                height: 26,
                cursor: 'pointer',
                ...(isSelected ? {
                  backgroundColor: isBypass ? '#f97316' : themeColor,
                  color: '#fff',
                  borderColor: 'transparent',
                  '&:hover': {
                    backgroundColor: isBypass ? '#ea580c' : themeColor,
                  }
                } : {
                  color: '#64748b',
                  borderColor: '#e2e8f0',
                  backgroundColor: 'transparent',
                  '&:hover': {
                    backgroundColor: '#f8fafc',
                  }
                })
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
});

export default function AdminPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const nav = useNavigate();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [activeTab, setActiveTab] = useState<'list' | 'permissions'>('list');

  // Derive current app context from URL (e.g. /fgswh/admin → FGS_WH)
  const pathSegment = location.pathname.split('/').filter(Boolean)[0] || '';
  const currentAppCode = ROUTE_TO_APP[pathSegment] || null;

  const isSuperAdmin = localStorage.getItem('isSuperAdmin') === 'true';
  const myRoleLevel = Number(localStorage.getItem('roleLevel') || '99');

  const APP_ADMIN_PAGES: Record<string, string> = {
    FGS_WH: 'admin',
    FABRIC_WH: 'fb_admin',
    QCFB_WH: 'qcfb-admin',
    RD_MATERIAL: 'rd_admin',
    TCC_TEMPLATE: 'tcc_admin',
    F2S_DELIVERY: 'f2s_admin',
    IT_INVENTORY: 'it_admin'
  };

  useEffect(() => {
    const isCurrentAdminPage = location.pathname.endsWith('/admin') || location.pathname.includes('/admin/');
    if (!isCurrentAdminPage) return;

    if (isSuperAdmin || myRoleLevel <= 1) return; // SuperAdmin & Admin can access

    if (myRoleLevel === 2 || myRoleLevel === 3) {
      if (currentAppCode) {
        const requiredPageCode = APP_ADMIN_PAGES[currentAppCode];
        try {
          const permsStr = localStorage.getItem('permissions') || '[]';
          const perms = JSON.parse(permsStr);
          const hasAdminAccess = perms.some((p: any) => p.pageCode === requiredPageCode && p.canView);
          if (hasAdminAccess) return; // Authorized
        } catch (e) {
          console.error('Error parsing permissions in AdminPage', e);
        }
      }
    }
    
    // Unauthorized
    nav('/', { replace: true });
  }, [location.pathname, currentAppCode, isSuperAdmin, myRoleLevel, nav]);

  const themeColors = useMemo(() => {
    switch (currentAppCode) {
      case 'FGS_WH':
        return { main: '#2e7d32', dark: '#1b5e20', light: '#e8f5e9' };
      case 'FABRIC_WH':
        return { main: '#2e7d32', dark: '#1b5e20', light: '#e8f5e9' };
      case 'IT_INVENTORY':
        return { main: '#5e35b1', dark: '#4527a0', light: '#ede7f6' };
      case 'RD_MATERIAL':
        return { main: '#3ba55c', dark: '#2e7d32', light: '#e8f5e9' };
      case 'F2S_DELIVERY':
      case 'F2S':
        return { main: '#2e7d32', dark: '#1b5e20', light: '#e8f5e9' };
      default:
        // Default to TraxEco Green
        return { main: '#2e7d32', dark: '#1b5e20', light: '#e8f5e9' };
    }
  }, [currentAppCode]);

  const [users, setUsers] = useState<UserWithPermissions[]>([]);

  const [f2sEditableCols, setF2sEditableCols] = useState('');

  // Load configuration if in F2S Delivery context
  useEffect(() => {
    if (currentAppCode === 'F2S_DELIVERY' || currentAppCode === 'F2S') {
      authFetch('f2s/settings/editable-columns')
      .then(res => res.json())
      .then(json => {
        const data = (json && json.data !== undefined) ? json.data : json;
        if (data && data.columns) setF2sEditableCols(data.columns);
      })
      .catch(err => console.error('Failed to load editable cols setting:', err));
    }
  }, [currentAppCode]);

  const handleSaveF2SEditableCols = async () => {
    try {
      const res = await authFetch('f2s/settings/editable-columns', {
        method: 'POST',
        body: JSON.stringify({ columns: f2sEditableCols })
      });
      if (!res.ok) throw new Error();
      setSnackbar({ open: true, message: t('admin.f2sConfigSaved'), severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: t('admin.f2sConfigError'), severity: 'error' });
    }
  };
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());

  // Create account
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

  // Edit account
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ employeeCode: '', employeeName: '', factory: '', dept: '', section: '', roleLevel: 4 });
  const [editing, setEditing] = useState(false);

  // Bulk Add feature
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStep, setBulkStep] = useState(1);
  const bulkSearchRef = useRef<HTMLInputElement>(null);
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const [bulkSelectedUsers, setBulkSelectedUsers] = useState<any[]>([]);
  const [bulkRoleLevel, setBulkRoleLevel] = useState(4);
  const [bulkAppCodes, setBulkAppCodes] = useState<string[]>(currentAppCode ? [currentAppCode] : []);
  const [bulkPermissions, setBulkPermissions] = useState<any[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void | Promise<void>;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });
  const existingUserCodes = useMemo(() => new Set((Array.isArray(users) ? users : []).map(u => u.employeeCode)), [users]);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Apps & Pages
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [pages, setPages] = useState<PageDef[]>([]);
  const [newAppCode, setNewAppCode] = useState('');
  const [newAppName, setNewAppName] = useState('');
  const [appDialogUser, setAppDialogUser] = useState<UserWithPermissions | null>(null);
  const [appDialogApps, setAppDialogApps] = useState<string[]>([]);
  const [selectedUserApps, setSelectedUserApps] = useState<string[]>([]);

  // Factory Perms
  const [factoryDialogUser, setFactoryDialogUser] = useState<UserWithPermissions | null>(null);
  const [userFactoryCodes, setUserFactoryCodes] = useState<string[]>([]);
  const [availableFactories, setAvailableFactories] = useState<string[]>([]);

  // Staff search
  interface StaffOption { id_staff?: string; code?: string; idStaff?: string; fullname: string; id_dept?: string; dept?: string; }
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const searchTimerRef = { current: null as ReturnType<typeof setTimeout> | null };

  const handleStaffSearch = (query: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (query.length < 2) { setStaffOptions([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      setStaffLoading(true);
      try {
        const res = await authFetch(`accounts/search-staff?q=${encodeURIComponent(query)}`);
        
        if (res.ok) {
          const json = await res.json();
          let data: StaffOption[] = Array.isArray(json) ? json : (json.data || []);
          // Lọc nhân sự theo cùng nhà máy (hoặc bộ phận) nếu user không phải là Admin/SuperAdmin
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
      } catch { /* ignore */ }
      finally { setStaffLoading(false); }
    }, 300);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await permissionService.getAllUsers(currentAppCode);
      const safeData = Array.isArray(data) ? data : (data.users || data.data || []);
      setUsers(safeData);
      setPendingChanges(new Map());
      // Re-select current user if still exists
      if (selectedUser) {
        const updated = safeData.find((u: any) => u.employeeCode === selectedUser.employeeCode);
        setSelectedUser(updated || null);
      }
    } catch { setError(t('admin.errorFetch', 'Failed to load users')); }
    finally { setLoading(false); }
  }, [t, selectedUser, currentAppCode]);

  useEffect(() => {
    appService.getAllApps()
      .then(res => {
        const safeApps = Array.isArray(res) ? res : ((res as any).data || []);
        setApps(safeApps);
      })
      .catch(() => {
        // Non-SuperAdmin may not have access to getAllApps
        // Fallback: if we have currentAppCode, create a minimal entry
        if (currentAppCode) {
          setApps([{ appCode: currentAppCode, appName: currentAppCode, isActive: true }]);
        }
      });
    authFetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api'}/permissions/pages`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch pages');
      return res.json();
    })
    .then(data => {
      // Tự động inject các trang mới để Admin có quyền cấp ngay trên UI (đề phòng DB chưa map kịp)
      const injectedPages = Array.isArray(data) ? [...data] : [];
      EXTRA_PAGES.forEach(p => {
        if (!injectedPages.find(x => x.code === p.code && x.appCode === p.appCode)) {
          injectedPages.push(p);
        }
      });
      setPages(injectedPages);
    }).catch(() => {});
  }, [currentAppCode]);

  // Group pages by appCode
  const pagesByApp = useMemo(() => {
    return pages.reduce<Record<string, PageDef[]>>((acc, pg) => {
      const key = pg.appCode || 'UNKNOWN';
      if (!acc[key]) acc[key] = [];
      acc[key].push(pg);
      return acc;
    }, {});
  }, [pages]);

  // Permission helpers
  const getPermState = useCallback((user: UserWithPermissions, pageCode: string): PendingChange => {
    const key = `${user.employeeCode}:${pageCode}`;
    if (pendingChanges.has(key)) return pendingChanges.get(key)!;
    const existing = user.permissions.find(p => p.pageCode === pageCode);
    return {
      employeeCode: user.employeeCode, pageCode,
      canView: existing?.canView ?? false, canAdd: existing?.canAdd ?? false,
      canEdit: existing?.canEdit ?? false, canDelete: existing?.canDelete ?? false,
      canExport: existing?.canExport ?? false,
      canBypassCheck: existing?.canBypassCheck ?? false,
      bypassQC: existing?.bypassQC ?? false,
      bypassRelax: existing?.bypassRelax ?? false,
      bypassLabTest: existing?.bypassLabTest ?? false,
      bypassSunrise: existing?.bypassSunrise ?? false,
    };
  }, [pendingChanges]);

  const togglePerm = useCallback((user: UserWithPermissions, pageCode: string, action: typeof ACTIONS[number], current: any) => {
    const key = `${user.employeeCode}:${pageCode}`;
    const updated = { ...current, [action]: !current[action] };
    if (action === 'canView' && !updated.canView) {
      updated.canAdd = false; updated.canEdit = false; updated.canDelete = false; updated.canExport = false; updated.canBypassCheck = false;
      updated.bypassQC = false; updated.bypassRelax = false; updated.bypassLabTest = false; updated.bypassSunrise = false;
    }
    if (action !== 'canView' && updated[action]) updated.canView = true;
    setPendingChanges(prev => new Map(prev).set(key, updated));
  }, []);

  const toggleAllForApp = (user: UserWithPermissions, appCode: string, enable: boolean) => {
    const appPages = pagesByApp[appCode] || [];
    const next = new Map(pendingChanges);
    for (const pg of appPages) {
      const key = `${user.employeeCode}:${pg.code}`;
      next.set(key, {
        employeeCode: user.employeeCode, pageCode: pg.code,
        canView: enable, canAdd: enable, canEdit: enable, canDelete: enable, canExport: enable, canBypassCheck: enable,
        bypassQC: enable, bypassRelax: enable, bypassLabTest: enable, bypassSunrise: enable,
      });
    }
    setPendingChanges(next);
  };

  const applyPreset = (user: UserWithPermissions, appCode: string, roleLevel: number) => {
    const appPages = pagesByApp[appCode] || [];
    const preset = PERMISSION_PRESETS[appCode]?.[roleLevel];
    if (!preset) return;

    const next = new Map(pendingChanges);
    for (const pg of appPages) {
      const key = `${user.employeeCode}:${pg.code}`;
      const presetPage = preset.pages[pg.code];

      if (presetPage) {
        next.set(key, {
          employeeCode: user.employeeCode,
          pageCode: pg.code,
          canView: presetPage.canView ?? false,
          canAdd: presetPage.canAdd ?? false,
          canEdit: presetPage.canEdit ?? false,
          canDelete: presetPage.canDelete ?? false,
          canExport: presetPage.canExport ?? false,
          canBypassCheck: presetPage.canBypassCheck ?? false,
          bypassQC: presetPage.bypassQC ?? false,
          bypassRelax: presetPage.bypassRelax ?? false,
          bypassLabTest: presetPage.bypassLabTest ?? false,
          bypassSunrise: presetPage.bypassSunrise ?? false,
        });
      } else {
        // If the page is not in the preset, revoke all permissions on it
        next.set(key, {
          employeeCode: user.employeeCode,
          pageCode: pg.code,
          canView: false,
          canAdd: false,
          canEdit: false,
          canDelete: false,
          canExport: false,
          canBypassCheck: false,
          bypassQC: false,
          bypassRelax: false,
          bypassLabTest: false,
          bypassSunrise: false,
        });
      }
    }
    setPendingChanges(next);
  };

  const handleSave = async () => {
    if (pendingChanges.size === 0) return;
    setSaving(true);
    try {
      for (const change of pendingChanges.values()) {
        const hasAny = change.canView || change.canAdd || change.canEdit || change.canDelete || change.canExport || change.canBypassCheck || change.bypassQC || change.bypassRelax || change.bypassLabTest || change.bypassSunrise;
        if (hasAny) await permissionService.grantPermission(change);
        else await permissionService.revokePermission(change.employeeCode, change.pageCode);
      }
      setSnackbar({ open: true, message: t('admin.saveSuccess', 'Saved!'), severity: 'success' });
      fetchUsers();
    } catch { setSnackbar({ open: true, message: t('admin.saveError', 'Save failed'), severity: 'error' }); }
    finally { setSaving(false); }
  };

  // Filtering
  const currentCode = localStorage.getItem('employeeCode') || '';
  const filteredUsers = (Array.isArray(users) ? users : []).filter(u => {
    if (u.isSuperAdmin || u.employeeCode === currentCode) return false;
    // Only show users with lower rank (higher roleLevel number)
    if ((u.roleLevel ?? 99) <= myRoleLevel) return false;

    // RBAC: If Supervisor (or Staff) access this page, ONLY show users in current app or newly created users
    if (!isSuperAdmin && myRoleLevel > 1 && currentAppCode) {
      const appPages = pagesByApp[currentAppCode] || [];
      const appPageCodes = new Set(appPages.map(p => p.code));
      const hasAppPerm = u.permissions && u.permissions.some(p => appPageCodes.has(p.pageCode));
      const isNewUser = !u.permissions || u.permissions.length === 0;
      if (!hasAppPerm && !isNewUser) return false;
    }

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.employeeCode.toLowerCase().includes(q) || (u.employeeName || '').toLowerCase().includes(q);
  });

  const ROLE_OPTIONS = [
    { value: 1, label: 'Admin' }, { value: 2, label: 'Supervisor' },
    { value: 3, label: 'Staff' }, { value: 4, label: 'Worker' },
  ].filter(r => r.value > myRoleLevel);

  const handleCreateAccount = async () => {
    if (!createForm.employeeCode.trim()) { setSnackbar({ open: true, message: t('admin.employeeCodeRequired'), severity: 'error' }); return; }
    setCreating(true);
    try {
      const payload = {
        employeeCode: createForm.employeeCode,
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
          await appService.setUserApps(createForm.employeeCode.trim(), createForm.appCodes);
        } catch { /* best-effort, user can still assign manually */ }
      }
      
      setCreateOpen(false);
      setCreateForm({
        employeeCode: '',
        employeeName: '',
        factory: !isSuperAdmin && myRoleLevel > 1 ? localStorage.getItem('factory') || '' : '',
        dept: !isSuperAdmin && myRoleLevel > 1 ? localStorage.getItem('dept') || '' : '',
        section: !isSuperAdmin && myRoleLevel > 1 ? localStorage.getItem('section') || '' : '',
        roleLevel: 4,
        appCodes: currentAppCode ? [currentAppCode] : []
      });
      fetchUsers();
    } catch (err: any) { setSnackbar({ open: true, message: err.message, severity: 'error' }); }
    finally { setCreating(false); }
  };

  const handleEditAccount = async () => {
    setEditing(true);
    try {
      const res = await authFetch(`accounts/update/${encodeURIComponent(editForm.employeeCode)}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSnackbar({ open: true, message: data.message || 'Account updated', severity: 'success' });
      setEditOpen(false);
      fetchUsers();
    } catch (err: any) { setSnackbar({ open: true, message: err.message, severity: 'error' }); }
    finally { setEditing(false); }
  };

  const handleBulkSearch = async () => {
    const q = bulkSearchRef.current?.value || '';
    if (!q.trim()) return;
    try {
      const res = await authFetch(`accounts/search-staff?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const json = await res.json();
        setBulkResults(Array.isArray(json) ? json : (json.data || []));
      }
      else setSnackbar({ open: true, message: 'Search failed', severity: 'error' });
    } catch { setSnackbar({ open: true, message: 'Network error', severity: 'error' }); }
  };

  const handleBulkSetup = async () => {
    if (bulkSelectedUsers.length === 0) { setSnackbar({ open: true, message: 'No users selected', severity: 'error' }); return; }
    setBulkSaving(true);
    try {
      const usersPayload = bulkSelectedUsers.map(u => {
        const deptStr = u.id_dept || u.dept || '';
        return {
          employeeCode: u.id_staff || u.code || '',
          employeeName: u.fullname || '',
          factory: u.id_factory || u.factory || (deptStr ? deptStr.substring(0, 2) : ''),
          dept: deptStr,
          section: u.id_section || u.section || ''
        };
      });
      const res = await authFetch('accounts/bulk-setup', {
        method: 'POST',
        body: JSON.stringify({
          users: usersPayload, roleLevel: bulkRoleLevel,
          appCodes: bulkAppCodes, permissions: bulkPermissions
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed bulk setup');
      setSnackbar({ open: true, message: `Successfully setup ${data.count || 0} users`, severity: 'success' });
      setBulkOpen(false); fetchUsers();
    } catch (err: any) { setSnackbar({ open: true, message: err.message, severity: 'error' }); }
    finally { setBulkSaving(false); }
  };

  // App assignment helpers
  const loadUserApps = async (user: UserWithPermissions) => {
    setAppDialogUser(user);
    setAppDialogApps([]);
    try {
      const data = await appService.getUserApps(user.employeeCode);
      setAppDialogApps(Array.isArray(data) ? data : (data.apps || data.data || []));
    } catch { /* ignore */ }
  };

  const saveUserApps = async () => {
    if (!appDialogUser) return;
    try {
      await appService.setUserApps(appDialogUser.employeeCode, appDialogApps);
      setSelectedUserApps(appDialogApps); // auto-refresh accordion
      setSnackbar({ open: true, message: t('admin.appsSaved'), severity: 'success' });
      setAppDialogUser(null);
    } catch { setSnackbar({ open: true, message: t('admin.saveError'), severity: 'error' }); }
  };

  // Factory assignment
  const loadFactoryPerms = async (user: UserWithPermissions) => {
    try {
      const targetApp = currentAppCode || 'FGS_WH';
      
      let allFactories: string[] = [];
      try {
        allFactories = await factoryPermissionService.getAllFactories();
      } catch (err) {
        console.warn('Failed to load all factories, defaulting to empty list', err);
      }
      setAvailableFactories(allFactories);
      
      let userFact: string[] = [];
      try {
        userFact = await factoryPermissionService.getUserFactories(user.employeeCode, targetApp);
      } catch (err) {
        console.warn('Failed to load user factories, defaulting to empty list', err);
      }
      setUserFactoryCodes(userFact);
      
      setFactoryDialogUser(user);
    } catch {
      setSnackbar({ open: true, message: 'Failed to initialize factory dialog', severity: 'error' });
    }
  };

  const saveUserFactories = async () => {
    if (!factoryDialogUser) return;
    try {
      const targetApp = currentAppCode || 'FGS_WH';
      await factoryPermissionService.setUserFactories(factoryDialogUser.employeeCode, targetApp, userFactoryCodes);
      setSnackbar({ open: true, message: t('admin.factorySaved', 'Factory permissions saved successfully'), severity: 'success' });
      setFactoryDialogUser(null);
    } catch {
      setSnackbar({ open: true, message: t('admin.factorySaveError', 'Failed to save factory permissions'), severity: 'error' });
    }
  };

  // ─── RENDER ───
  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', gap: { xs: 1, md: 2 } }}>
      {/* Header & Toolbar Card */}
      {isMobile ? (
        <Paper elevation={0} sx={{ 
          p: 1.5, borderRadius: '12px', border: '1px solid rgba(255,255,255,1)', 
          background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          display: 'flex', flexDirection: 'column', gap: 1.25
        }}>
          {/* Top Row: Title & Chip */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {location.pathname === '/admin' && (
                <IconButton size="small" onClick={() => nav('/')}
                  sx={{ border: '1px solid #cbd5e1', borderRadius: 2, color: themeColors.main, p: 0.5 }}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
              )}
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, color: themeColors.dark, letterSpacing: '-0.3px', fontSize: 16 }}>
                <AdminIcon sx={{ fontSize: 24, p: 0.25, borderRadius: 1.5, background: themeColors.light, color: themeColors.main }} /> 
                {t('admin.title', 'Permission Management')}
              </Typography>
            </Box>
            <Chip 
              label={`${Array.isArray(users) ? users.length : 0} ${t('admin.users', 'users')}`} 
              size="small" 
              sx={{ fontWeight: 800, height: 22, fontSize: 11, backgroundColor: '#fff', color: themeColors.main, border: '1px solid rgba(0,0,0,0.05)' }} 
            />
          </Box>

          {/* Bottom Row: Search & Action Icon Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <TextField size="small" placeholder={t('admin.searchPlaceholder')}
              value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }}
              sx={{ 
                flex: 1,
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 6, backgroundColor: '#fff',
                  height: 36,
                  fontSize: 13,
                  '& fieldset': { borderColor: '#e2e8f0' }
                } 
              }}
            />
            
            {/* Action Icon Buttons */}
            {(isSuperAdmin || myRoleLevel <= 1) && (
              <Tooltip title={t('admin.userTracking', 'User Tracking')}>
                <IconButton onClick={() => nav('/tracking')} size="small"
                  sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0', p: 0.75, borderRadius: 2, color: '#475569', '&:hover': { bgcolor: '#eff6ff', color: themeColors.main } }}>
                  <TrackingIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title={t('admin.createAccount')}>
              <IconButton onClick={() => setCreateOpen(true)} size="small"
                sx={{ bgcolor: themeColors.main, color: '#fff', p: 0.75, borderRadius: 2, '&:hover': { bgcolor: themeColors.dark } }}>
                <PersonAddIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            
            {(isSuperAdmin || myRoleLevel <= 1) && (
              <Tooltip title={t('admin.bulkSetup', 'Bulk Setup')}>
                <IconButton onClick={() => { setBulkOpen(true); setBulkStep(1); setBulkSelectedUsers([]); }} size="small"
                  sx={{ background: `linear-gradient(135deg, ${themeColors.main} 0%, ${themeColors.dark} 100%)`, color: '#fff', p: 0.75, borderRadius: 2, '&:hover': { background: `linear-gradient(135deg, ${themeColors.dark} 0%, ${themeColors.main} 100%)` } }}>
                  <GroupAddIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title={t('admin.reloadTooltip')}>
              <IconButton onClick={fetchUsers} disabled={loading} size="small"
                sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0', p: 0.75, borderRadius: 2, color: '#64748b', '&:hover': { bgcolor: '#f8fafc' } }}>
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>
      ) : (
        // Desktop Layout
        <>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {location.pathname === '/admin' && (
                <Button variant="outlined" size="small" onClick={() => nav('/')}
                  sx={{ minWidth: 'auto', borderRadius: 2, borderColor: themeColors.main, color: themeColors.main, '&:hover': { background: themeColors.light } }}>
                  ← {t('admin.home')}
                </Button>
              )}
              <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 800, color: themeColors.dark, letterSpacing: '-0.5px' }}>
                <AdminIcon sx={{ fontSize: 32, p: 0.5, borderRadius: 2, background: themeColors.light, color: themeColors.main }} /> 
                {t('admin.title', 'Permission Management')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip label={`${Array.isArray(users) ? users.length : 0} ${t('admin.users', 'users')}`} sx={{ fontWeight: 700, backgroundColor: '#fff', color: themeColors.main, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }} />
            </Box>
          </Box>

          {/* Toolbar */}
          <Paper elevation={0} sx={{ 
            p: 2, borderRadius: 3, border: '1px solid rgba(255,255,255,1)', 
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <TextField size="small" placeholder={t('admin.searchPlaceholder')}
                value={search} onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: '#94a3b8' }} /></InputAdornment> }}
                sx={{ 
                  minWidth: 280, 
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: 8, backgroundColor: '#fff',
                    transition: 'all 0.3s ease',
                    '& fieldset': { borderColor: '#e2e8f0' },
                    '&:hover fieldset': { borderColor: '#cbd5e1' },
                    '&.Mui-focused fieldset': { borderColor: themeColors.main, borderWidth: '2px' },
                    '&.Mui-focused': { boxShadow: `0 0 0 4px ${themeColors.light}` }
                  } 
                }}
              />
              <Box sx={{ flexGrow: 1 }} />
              {(isSuperAdmin || myRoleLevel <= 1) && (
                <Button variant="outlined" startIcon={<TrackingIcon />} onClick={() => nav('/tracking')}
                  sx={{ borderRadius: 8, fontWeight: 700, px: 2.5, borderColor: '#cbd5e1', color: '#475569', transition: 'all 0.2s', '&:hover': { borderColor: '#1565c0', color: '#1565c0', backgroundColor: '#eff6ff', transform: 'translateY(-1px)' } }}>
                  {t('admin.userTracking', 'User Tracking')}
                </Button>
              )}
              <Button variant="contained" disableElevation startIcon={<PersonAddIcon />} onClick={() => setCreateOpen(true)}
                sx={{ borderRadius: 8, fontWeight: 700, px: 3, backgroundColor: themeColors.main, color: '#fff', transition: 'all 0.2s', '&:hover': { backgroundColor: themeColors.dark, transform: 'translateY(-1px)', boxShadow: `0 6px 16px ${themeColors.light}` } }}>
                {t('admin.createAccount')}
              </Button>
              {(isSuperAdmin || myRoleLevel <= 1) && (
                <Button variant="contained" disableElevation startIcon={<GroupAddIcon />} onClick={() => { setBulkOpen(true); setBulkStep(1); setBulkSelectedUsers([]); }}
                  sx={{ borderRadius: 8, fontWeight: 800, px: 3, background: `linear-gradient(135deg, ${themeColors.main} 0%, ${themeColors.dark} 100%)`, color: '#fff', transition: 'all 0.2s', '&:hover': { background: `linear-gradient(135deg, ${themeColors.dark} 0%, ${themeColors.main} 100%)`, transform: 'translateY(-1px)', boxShadow: `0 6px 16px ${themeColors.light}` } }}>
                  {t('admin.bulkSetup', 'Bulk Setup')}
                </Button>
              )}
              <Tooltip title={t('admin.reloadTooltip')}>
                <IconButton onClick={fetchUsers} disabled={loading} sx={{ background: '#fff', border: '1px solid #e2e8f0', '&:hover': { background: '#f8fafc' } }}>
                  <RefreshIcon sx={{ color: '#64748b' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
        </>
      )}

      {error && <Alert severity="error" sx={{ borderRadius: 2, border: '1px solid #fecaca' }}>{error}</Alert>}

      {/* F2S_DELIVERY Specific Settings */}
      {(currentAppCode === 'F2S_DELIVERY' || currentAppCode === 'F2S') && isSuperAdmin && (
        <Accordion elevation={0}
          sx={{ 
            mt: { xs: 0.5, md: 2 }, border: '1px solid rgba(255,255,255,1)', borderRadius: '16px !important', 
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.02)', '&:before': { display: 'none' } 
          }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: themeColors.main }} />}
            sx={{ px: 3, '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5 } }}>
            <AdminIcon sx={{ color: themeColors.main }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: themeColors.main }}>{t('admin.f2sConfigTitle')}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField 
                size="small" 
                label={t('admin.f2sEditableColsLabel')} 
                placeholder={t('admin.f2sEditableColsPlaceholder')}
                value={f2sEditableCols} 
                onChange={e => setF2sEditableCols(e.target.value)} 
                sx={{ flex: 1, minWidth: 300, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
              />
              <Button variant="contained" onClick={handleSaveF2SEditableCols} disableElevation
                sx={{ px: 2, fontWeight: 800, borderRadius: 2, bgcolor: themeColors.main, '&:hover': { bgcolor: themeColors.dark } }}>
                {t('admin.f2sSaveConfig')}
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* App Management — SuperAdmin only */}
      {isSuperAdmin && (
        <Accordion elevation={0}
          sx={{ 
            mt: { xs: 0.5, md: 2 }, border: '1px solid rgba(255,255,255,1)', borderRadius: '16px !important', 
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.02)', '&:before': { display: 'none' } 
          }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: themeColors.main }} />}
            sx={{ px: 3, '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5 } }}>
            <AppsIcon sx={{ color: themeColors.main }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: themeColors.main }}>{t('admin.appManagement')}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              {apps.map(app => (
                <Chip key={app.appCode} label={`${app.appCode} — ${app.appName}`}
                  onDelete={() => {
                    setConfirmDialog({
                      open: true,
                      title: t('admin.deleteAppTitle', 'Xác nhận xóa ứng dụng'),
                      description: t('admin.deleteAppConfirm', 'Bạn có chắc chắn muốn xóa ứng dụng này không? Thao tác này sẽ xóa toàn bộ phân quyền liên quan và không thể hoàn tác.'),
                      onConfirm: async () => {
                        try { await appService.deleteApp(app.appCode); setApps(prev => prev.filter(a => a.appCode !== app.appCode));
                          setSnackbar({ open: true, message: t('admin.deleted'), severity: 'success' });
                        } catch { setSnackbar({ open: true, message: t('admin.saveError'), severity: 'error' }); }
                      }
                    });
                  }} sx={{ fontWeight: 700, bgcolor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }} variant="outlined" />
              ))}
              <TextField size="small" placeholder={t('admin.codePlaceholder')} value={newAppCode} onChange={e => setNewAppCode(e.target.value)} sx={{ width: 120, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }} />
              <TextField size="small" placeholder={t('admin.namePlaceholder')} value={newAppName} onChange={e => setNewAppName(e.target.value)} sx={{ width: 180, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }} />
              <Button size="small" variant="contained" startIcon={<AddIcon />} disableElevation
                disabled={!newAppCode.trim() || !newAppName.trim()}
                onClick={async () => {
                  try { await appService.upsertApp(newAppCode.trim(), newAppName.trim());
                    setApps(prev => [...prev.filter(a => a.appCode !== newAppCode.trim()), { appCode: newAppCode.trim(), appName: newAppName.trim(), isActive: true }]);
                    setNewAppCode(''); setNewAppName('');
                    setSnackbar({ open: true, message: t('admin.saved'), severity: 'success' });
                  } catch { setSnackbar({ open: true, message: t('admin.saveError'), severity: 'error' }); }
                }}
                sx={{ fontWeight: 800, borderRadius: 2, px: 2, backgroundColor: themeColors.main, '&:hover': { backgroundColor: themeColors.dark } }}>
                {t('admin.add')}
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Tab Selector on Mobile */}
      {isMobile && (
        <Tabs 
          value={activeTab} 
          onChange={(_, val) => setActiveTab(val)}
          variant="fullWidth"
          sx={{ 
            bgcolor: '#fff', 
            borderRadius: '8px', 
            border: '1px solid #e2e8f0',
            mb: 0.5,
            minHeight: 44,
            height: 44,
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            '& .MuiTabs-indicator': { backgroundColor: themeColors.main },
            '& .MuiTab-root': { py: 1, fontSize: 13, fontWeight: 800, color: '#64748b', textTransform: 'none', minHeight: 44 },
            '& .MuiTab-root.Mui-selected': { color: themeColors.main }
          }}
        >
          <Tab label={t('admin.userListTab', 'Danh sách')} value="list" />
          <Tab 
            label={t('admin.permissionsTab', 'Phân quyền')} 
            value="permissions" 
            disabled={!selectedUser}
          />
        </Tabs>
      )}

      {/* Main content — User List (left) + Permission Panel (right) */}
      <Box sx={{ 
        flex: 1, display: 'flex', gap: { xs: 2, md: 3 }, 
        minHeight: 0, 
        overflow: 'hidden', 
        flexDirection: { xs: 'column', lg: 'row' } 
      }}>
        {/* LEFT — User List */}
        {(!isMobile || activeTab === 'list') && (
          <Paper elevation={0} sx={{ 
            width: { xs: '100%', lg: 360 }, minWidth: { lg: 320 }, 
            maxHeight: { xs: 550, lg: 'none' },
            borderRadius: 4, border: '1px solid rgba(255,255,255,0.8)', 
            background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.03)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0
          }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : (!Array.isArray(users) || users.length === 0) ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
                <Typography variant="body2" color="text.secondary">{t('admin.clickToLoad')}</Typography>
                <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchUsers} disableElevation
                  sx={{ borderRadius: 8, fontWeight: 700, backgroundColor: themeColors.main, '&:hover': { backgroundColor: themeColors.dark } }}>
                  {t('admin.loadUsers')}
                </Button>
              </Box>
            ) : (
              <Box sx={{ 
                flex: 1, overflowY: 'auto', p: 1.5,
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 10 }
              }}>
                {filteredUsers.map(user => {
                  const isSelected = selectedUser?.employeeCode === user.employeeCode;
                  return (
                  <Box key={user.employeeCode}
                    onClick={async () => {
                      setSelectedUser(user);
                      if (isMobile) {
                        setActiveTab('permissions');
                      }
                      // Load user's assigned apps silently
                      try {
                        const data = await appService.getUserApps(user.employeeCode);
                        setSelectedUserApps(Array.isArray(data) ? data : (data.apps || data.data || []));
                      } catch { setSelectedUserApps([]); }
                    }}
                    sx={{
                      p: 1.5, mb: 1, cursor: 'pointer', borderRadius: '8px',
                      border: isSelected ? `2px solid ${themeColors.main}` : '2px solid transparent',
                      backgroundColor: isSelected ? '#fff' : 'transparent',
                      opacity: user.isActive ? 1 : 0.6,
                      boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': { 
                        backgroundColor: '#fff', 
                        transform: isSelected ? 'none' : 'translateY(-2px)',
                        boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.05)' : '0 4px 12px rgba(0,0,0,0.03)' 
                      }
                    }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: user.isAdmin ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' : `linear-gradient(135deg, ${themeColors.main} 0%, ${themeColors.dark} 100%)`, 
                        color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0,
                        boxShadow: `0 4px 10px ${themeColors.light}`
                      }}>
                        {(user.employeeName || user.employeeCode)[0]?.toUpperCase() || '?'}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user.employeeName || user.employeeCode}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mt: 0.25 }}>
                          {user.employeeCode} • {user.roleLabel}
                        </Typography>
                      </Box>
                      {!user.isActive && <Chip label="OFF" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: '#f1f5f9', color: '#64748b' }} />}
                    </Box>
                  </Box>
                )})}
                {filteredUsers.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    {t('admin.noUsersFound')}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        )}

        {/* RIGHT — Permission Panel */}
        {(!isMobile || activeTab === 'permissions') && (
          <Paper elevation={0} sx={{ 
            flex: 1, borderRadius: 4, border: '1px solid rgba(255,255,255,0.8)', 
            background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.03)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            minHeight: 0
          }}>
            {!selectedUser ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 2, color: '#94a3b8' }}>
                <AdminIcon sx={{ fontSize: 72, color: '#e2e8f0' }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#cbd5e1' }}>{t('admin.selectUserHint')}</Typography>
              </Box>
            ) : (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Profile Card Header */}
                <Box sx={{ 
                  p: { xs: 2, md: 3 }, borderBottom: '1px solid #f1f5f9', background: '#fff', 
                  display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' 
                }}>
                  {isMobile && (
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<ChevronLeftIcon />}
                      onClick={() => setActiveTab('list')}
                      sx={{ width: '100%', justifyContent: 'flex-start', mb: 1, fontWeight: 800, color: themeColors.main, textTransform: 'none' }}
                    >
                      {t('admin.backToUserList', 'Quay lại danh sách')}
                    </Button>
                  )}
                  <Box sx={{
                    width: 56, height: 56, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: selectedUser.isAdmin ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' : `linear-gradient(135deg, ${themeColors.main} 0%, ${themeColors.dark} 100%)`, 
                    color: '#fff', fontWeight: 800, fontSize: 22, boxShadow: `0 8px 16px ${themeColors.light}`
                  }}>
                    {(selectedUser.employeeName || selectedUser.employeeCode)[0]?.toUpperCase()}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>{selectedUser.employeeName || selectedUser.employeeCode}</Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, mt: 0.5 }}>
                       {selectedUser.employeeCode} <span style={{ color: '#cbd5e1', margin: '0 4px' }}>|</span> {selectedUser.roleLabel} <span style={{ color: '#cbd5e1', margin: '0 4px' }}>|</span> {selectedUser.factory || 'No Factory'} / {selectedUser.dept || 'No Dept'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    {(isSuperAdmin || myRoleLevel <= 1) && (
                      <Button size="small" variant="outlined" startIcon={<AppsIcon />}
                        onClick={() => loadUserApps(selectedUser)}
                        sx={{ borderRadius: 8, fontSize: 13, fontWeight: 700, borderColor: '#cbd5e1', color: '#475569', '&:hover': { borderColor: themeColors.main, color: themeColors.main, background: themeColors.light } }}>
                        Apps
                      </Button>
                    )}
                    {myRoleLevel <= 1 && (
                      <Button size="small" variant="outlined" startIcon={<FactoryIcon />}
                        onClick={() => loadFactoryPerms(selectedUser)}
                        sx={{ borderRadius: 8, fontSize: 13, fontWeight: 700, borderColor: '#cbd5e1', color: '#475569', '&:hover': { borderColor: themeColors.main, color: themeColors.main, background: themeColors.light } }}>
                        Factory
                      </Button>
                    )}
                    <Tooltip title="Edit user info">
                      <IconButton size="small"
                        sx={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: themeColors.main, transition: 'all 0.2s', '&:hover': { background: themeColors.light, transform: 'translateY(-2px)', borderColor: themeColors.main } }}
                        onClick={() => {
                          setEditForm({
                            employeeCode: selectedUser.employeeCode,
                            employeeName: selectedUser.employeeName || '',
                            factory: selectedUser.factory || '',
                            dept: selectedUser.dept || '',
                            section: selectedUser.section || '',
                            roleLevel: selectedUser.roleLevel || 4,
                          });
                          setEditOpen(true);
                        }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Box sx={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, px: 1, py: 0.25, transition: 'all 0.2s', '&:focus-within': { borderColor: themeColors.main, boxShadow: `0 0 0 2px ${themeColors.light}` } }}>
                      <Switch checked={selectedUser.isActive} size="small"
                        onChange={async (_, checked) => {
                          try { await permissionService.toggleActive(selectedUser.employeeCode, checked);
                            setSnackbar({ open: true, message: checked ? t('admin.activated') : t('admin.deactivated'), severity: 'success' });
                            fetchUsers();
                          } catch { setSnackbar({ open: true, message: t('admin.saveError'), severity: 'error' }); }
                        }} />
                    </Box>
                    <Tooltip title={t('admin.deleteUserTooltip')}>
                      <IconButton size="small" onClick={() => {
                          setConfirmDialog({
                            open: true,
                            title: t('admin.deleteUserTitle', 'Xác nhận xóa tài khoản'),
                            description: t('admin.deleteUserConfirm', 'Bạn có chắc chắn muốn xóa tài khoản {{user}} khỏi hệ thống không? Hành động này không thể hoàn tác.', { user: selectedUser.employeeCode }),
                            onConfirm: async () => {
                              try { await permissionService.deleteUser(selectedUser.employeeCode);
                                setSnackbar({ open: true, message: t('admin.deleted'), severity: 'success' });
                                setSelectedUser(null); fetchUsers();
                              } catch { setSnackbar({ open: true, message: t('admin.saveError'), severity: 'error' }); }
                            }
                          });
                        }} sx={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #ffe4e6', transition: 'all 0.2s', '&:hover': { background: '#ffe4e6', transform: 'translateY(-2px)' } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

              {/* Permission accordions by App */}
              <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                {apps.filter(app => {
                  // SuperAdmin: show all apps the selected user is assigned to
                  // Supervisor inside app: always show the current app
                  if (currentAppCode) return app.appCode === currentAppCode;
                  return (Array.isArray(selectedUserApps) ? selectedUserApps : []).includes(app.appCode);
                }).map(app => {
                  const appPages = pagesByApp[app.appCode] || [];
                  const allChecked = appPages.length > 0 && appPages.every(pg => {
                    const s = getPermState(selectedUser, pg.code);
                    return s.canView && s.canAdd && s.canEdit && s.canDelete && s.canExport;
                  });

                  return (
                    <Accordion key={app.appCode} defaultExpanded={appPages.length > 0}
                      sx={{ 
                        mb: 2, border: '1px solid #e2e8f0', borderRadius: '16px !important', 
                        overflow: 'hidden',
                        '&:before': { display: 'none' }, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' 
                      }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#94a3b8' }} />}
                        sx={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9', '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1 } }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, flex: 1, color: '#0f172a' }}>
                          <span style={{ marginRight: 8 }}>📱</span> {app.appName} 
                          <Chip label={app.appCode} size="small" sx={{ ml: 1.5, fontSize: 11, height: 22, fontWeight: 800, bgcolor: '#e2e8f0', color: '#475569' }} />
                        </Typography>
                        {appPages.length > 0 && PERMISSION_PRESETS[app.appCode] && (
                          <Box sx={{ display: 'flex', gap: 1, mr: 2 }} onClick={(e) => e.stopPropagation()}>
                            {Object.entries(PERMISSION_PRESETS[app.appCode])
                              .sort(([k1], [k2]) => Number(k1) - Number(k2))
                              .map(([level, preset]) => {
                                const levelNum = Number(level);
                                const canGrant = isSuperAdmin || levelNum > myRoleLevel;
                                if (!canGrant) return null;

                                return (
                                  <Tooltip key={level} title={t('admin.applyPresetTooltip', 'Apply preset {{label}} to this app', { label: preset.label })}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      component="span"
                                      onClick={() => applyPreset(selectedUser, app.appCode, levelNum)}
                                      sx={{
                                        minWidth: 'auto',
                                        px: 1.5,
                                        py: 0.25,
                                        fontSize: 10,
                                        fontWeight: 800,
                                        borderRadius: '6px',
                                        borderColor: '#6366f1',
                                        color: '#6366f1',
                                        '&:hover': {
                                          backgroundColor: '#e0e7ff',
                                          borderColor: '#4f46e5'
                                        }
                                      }}
                                    >
                                      📋 {preset.label}
                                    </Button>
                                  </Tooltip>
                                );
                              })}
                          </Box>
                        )}
                        {appPages.length > 0 && (
                          <Tooltip title={allChecked ? t('admin.revokeAll') : t('admin.grantAll')}>
                            <Button size="small" variant={allChecked ? 'contained' : 'outlined'} component="span"
                              onClick={(e) => { e.stopPropagation(); toggleAllForApp(selectedUser, app.appCode, !allChecked); }}
                              sx={{ minWidth: 'auto', px: 2, fontSize: 11, fontWeight: 800, borderRadius: '6px', boxShadow: 'none', transition: 'all 0.2s',
                                ...(allChecked ? { backgroundColor: themeColors.main, '&:hover': { backgroundColor: themeColors.dark, transform: 'scale(1.05)' } }
                                  : { borderColor: themeColors.main, color: themeColors.main, '&:hover': { background: themeColors.light, transform: 'scale(1.05)' } }) }}>
                              {allChecked ? t('admin.allSelected') : t('admin.selectAll')}
                            </Button>
                          </Tooltip>
                        )}
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0, px: isMobile ? 1.5 : 0, pb: isMobile ? 1.5 : 0 }}>
                        {appPages.length === 0 ? (
                          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                            {t('admin.noPagesForApp')}
                          </Typography>
                        ) : isMobile ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', pt: 1.5 }}>
                            {appPages.map(pg => (
                              <MobilePermissionRow
                                key={pg.code}
                                pg={pg}
                                user={selectedUser}
                                pendingChange={pendingChanges.get(`${selectedUser.employeeCode}:${pg.code}`)}
                                themeColor={themeColors.main}
                                onToggle={togglePerm}
                              />
                            ))}
                          </Box>
                        ) : (
                          <TableContainer sx={{ overflowX: 'auto', maxHeight: 340, overflowY: 'auto', pb: 1 }}>
                            <Table size="small" sx={{ minWidth: 600 }} stickyHeader>
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 800, backgroundColor: '#f1f5f9', color: '#64748b', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px', borderBottom: 'none' }}>{t('admin.page')}</TableCell>
                                  {ACTIONS.map(a => (
                                    <TableCell key={a} align="center" sx={{ fontWeight: 800, backgroundColor: '#f1f5f9', color: '#64748b', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px', borderBottom: 'none' }}>
                                      {ACTION_LABELS[a]}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {appPages.map(pg => (
                                  <PermissionRow
                                    key={pg.code}
                                    pg={pg}
                                    user={selectedUser}
                                    pendingChange={pendingChanges.get(`${selectedUser.employeeCode}:${pg.code}`)}
                                    themeColor={themeColors.main}
                                    onToggle={togglePerm}
                                  />
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  );
                })}

                {apps.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    {t('admin.noAppsLoaded')}
                  </Typography>
                )}
              </Box>

              {/* Action Footer for Saving Permissions */}
              <Box sx={{ p: 2, borderTop: '2px solid #e0e0e0', background: '#fafafa', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', '& > *:not(:last-child)': { mr: 2, mb: 2 } }}>
                 {pendingChanges.size > 0 && (
                   <Typography variant="body2" color="warning.main" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', '& > *:not(:last-child)': { mr: 0.5, mb: 0.5 } }}>
                     <WarningIcon fontSize="small" /> {t('admin.unsavedChanges', 'Unsaved changes ({{count}})', { count: pendingChanges.size })}
                   </Typography>
                 )}
                 <Button variant="contained" size="large" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                   onClick={handleSave} disabled={pendingChanges.size === 0 || saving} disableElevation
                   sx={{ borderRadius: 1.5, fontWeight: 700, px: 4, py: 1, backgroundColor: themeColors.main, '&:hover': { backgroundColor: themeColors.dark } }}>
                   {t('admin.savePermissions', 'SAVE PERMISSIONS')}
                 </Button>
              </Box>
            </Box>
          )}
        </Paper>)}
      </Box>

      {/* Create Account Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('admin.createTitle')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', '& > *:not(:last-child)': { mr: 2, mb: 2 }, pt: '16px !important' }}>
          <Autocomplete
            freeSolo options={staffOptions}
            getOptionLabel={(opt) => {
              if (typeof opt === 'string') return opt;
              const code = opt.id_staff || opt.code || opt.idStaff || 'N/A';
              const dept = opt.id_dept || opt.dept || 'N/A';
              return `${code} — ${opt.fullname} (${dept})`;
            }}
            loading={staffLoading}
            onInputChange={(_, val) => { handleStaffSearch(val); setCreateForm(f => ({ ...f, employeeCode: val })); }}
            onChange={(_, val) => {
              if (val && typeof val !== 'string') {
                const deptVal = (val as any).id_dept || val.dept || '';
                setCreateForm(f => ({
                  ...f,
                  employeeCode: (val as any).id_staff || val.code || val.idStaff || '',
                  employeeName: val.fullname || '',
                  dept: deptVal,
                  factory: deptVal ? deptVal.substring(0, 2) : f.factory,
                }));
              }
            }}
            renderInput={(params) => <TextField {...params} label={t('admin.col.user', 'Employee Code')} size="small" required />}
          />
          <TextField label="Employee Name" size="small" value={createForm.employeeName}
            onChange={e => setCreateForm(f => ({ ...f, employeeName: e.target.value }))} />
          <Box sx={{ display: 'flex', '& > *:not(:last-child)': { mr: 2, mb: 2 } }}>
            <TextField label="Factory" size="small" value={createForm.factory}
              disabled={!isSuperAdmin && myRoleLevel > 1}
              onChange={e => setCreateForm(f => ({ ...f, factory: e.target.value }))} sx={{ flex: 1 }} />
            <TextField label="Dept" size="small" value={createForm.dept}
              disabled={!isSuperAdmin && myRoleLevel > 1}
              onChange={e => setCreateForm(f => ({ ...f, dept: e.target.value }))} sx={{ flex: 1 }} />
            <TextField label="Section" size="small" value={createForm.section}
              disabled={!isSuperAdmin && myRoleLevel > 1}
              onChange={e => setCreateForm(f => ({ ...f, section: e.target.value }))} sx={{ flex: 1 }} />
          </Box>
          <FormControl size="small">
            <InputLabel>{t('admin.role')}</InputLabel>
            <Select value={createForm.roleLevel} label={t('admin.role')}
              onChange={e => setCreateForm(f => ({ ...f, roleLevel: Number(e.target.value) }))}>
              {ROLE_OPTIONS.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth sx={{ mt: 2 }}>
            <InputLabel>Assign Apps</InputLabel>
            <Select
              multiple
              value={createForm.appCodes}
              label="Assign Apps"
              onChange={e => {
                const val = Array.isArray(e.target.value) ? e.target.value : [];
                setCreateForm(f => ({ ...f, appCodes: val }));
              }}
              renderValue={sel => sel.join(', ')}
            >
              {apps.map(app => (
                <MenuItem key={app.appCode} value={app.appCode}>
                  <Checkbox size="small" checked={createForm.appCodes.indexOf(app.appCode) > -1} />
                  {app.appName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>{t('admin.cancel')}</Button>
          <Button variant="contained" onClick={handleCreateAccount} disabled={creating}
            sx={{ backgroundColor: themeColors.main, '&:hover': { backgroundColor: themeColors.dark } }}>
            {creating ? <CircularProgress size={20} color="inherit" /> : t('admin.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Account: {editForm.employeeCode}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Employee Name" size="small" value={editForm.employeeName}
            onChange={e => setEditForm(f => ({ ...f, employeeName: e.target.value }))} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Factory" size="small" value={editForm.factory}
              disabled={!isSuperAdmin && myRoleLevel > 1}
              onChange={e => setEditForm(f => ({ ...f, factory: e.target.value }))} sx={{ flex: 1 }} />
            <TextField label="Dept" size="small" value={editForm.dept}
              disabled={!isSuperAdmin && myRoleLevel > 1}
              onChange={e => setEditForm(f => ({ ...f, dept: e.target.value }))} sx={{ flex: 1 }} />
            <TextField label="Section" size="small" value={editForm.section}
              disabled={!isSuperAdmin && myRoleLevel > 1}
              onChange={e => setEditForm(f => ({ ...f, section: e.target.value }))} sx={{ flex: 1 }} />
          </Box>
          <FormControl size="small">
            <InputLabel>{t('admin.role')}</InputLabel>
            <Select value={editForm.roleLevel} label={t('admin.role')}
              onChange={e => setEditForm(f => ({ ...f, roleLevel: Number(e.target.value) }))}>
              {ROLE_OPTIONS.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)}>{t('admin.cancel')}</Button>
          <Button variant="contained" onClick={handleEditAccount} disabled={editing}
            sx={{ backgroundColor: themeColors.main, '&:hover': { backgroundColor: themeColors.dark } }}>
            {editing ? <CircularProgress size={20} color="inherit" /> : t('admin.saveChanges', 'Save Changes')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Setup Wizard */}
      <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid #f1f5f9', bgcolor: '#fff', pb: 2 }}>
          {t('admin.bulkSetupWizard', 'Bulk Setup Wizard')}
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, mt: 0.5 }}>
            {bulkStep === 1 ? t('admin.bulkStep1Title', 'Step 1: Search & Select HR Staff') : t('admin.bulkStep2Title', 'Step 2: Assign Profile & Permissions')}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: 500, display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
          {bulkStep === 1 && (
            <Box sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField size="small" placeholder={t('admin.bulkSearchPlaceholder', 'Search HR (Code, Name, Dept...)')} inputRef={bulkSearchRef} defaultValue=""
                  onKeyDown={e => e.key === 'Enter' && handleBulkSearch()}
                  sx={{ flex: 1, bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '4px' } }} />
                <Button variant="contained" onClick={handleBulkSearch} disableElevation sx={{ borderRadius: '6px', px: 3, bgcolor: themeColors.main, '&:hover': { bgcolor: themeColors.dark } }}>{t('common.search', 'Search')}</Button>
              </Box>
              <Paper elevation={0} sx={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox checked={bulkResults.length > 0 && bulkSelectedUsers.length === bulkResults.filter(u => !existingUserCodes.has(u.id_staff || u.code) && String(u.is_existing_account) !== 'true' && u.is_existing_account !== 1 && u.is_existing_account !== '1').length}
                                  onChange={e => setBulkSelectedUsers(e.target.checked ? bulkResults.filter(u => !existingUserCodes.has(u.id_staff || u.code) && String(u.is_existing_account) !== 'true' && u.is_existing_account !== 1 && u.is_existing_account !== '1') : [])}
                                  sx={{ '&.Mui-checked': { color: themeColors.main } }} />
                      </TableCell>
                      {bulkResults.length > 0 ? (
                        Object.keys(bulkResults[0]).slice(0, -4).map(col => (
                           <TableCell key={col} sx={{ fontWeight: 800, textTransform: 'capitalize' }}>{col.replace('id_', '')}</TableCell>
                        ))
                      ) : (
                        <>
                          <TableCell sx={{ fontWeight: 800 }}>Code</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Full Name</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Dept</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bulkResults.map((u, i) => {
                      const code = u.id_staff || u.code;
                      const isExists = existingUserCodes.has(code) || String(u.is_existing_account) === 'true' || u.is_existing_account === 1 || u.is_existing_account === '1';
                      return (
                      <TableRow key={i} hover onClick={() => {
                        if (isExists) return;
                        setBulkSelectedUsers(prev => prev.some(x => (x.id_staff || x.code) === code) ? prev.filter(x => (x.id_staff || x.code) !== code) : [...prev, u]);
                      }} sx={{ cursor: isExists ? 'not-allowed' : 'pointer', bgcolor: isExists ? '#f1f5f9' : 'inherit', opacity: isExists ? 0.8 : 1 }}>
                        <TableCell padding="checkbox">
                          <Checkbox checked={bulkSelectedUsers.some(x => (x.id_staff || x.code) === code)}
                                    disabled={isExists} 
                                    sx={{ '&.Mui-checked': { color: themeColors.main } }} />
                        </TableCell>
                        {Object.values(u).slice(0, -4).map((val: any, colIdx) => {
                          let displayVal = val;
                          if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}( |T)\d{2}:\d{2}:\d{2}/.test(val)) {
                            // Extract just the 'YYYY-MM-DD' part and ignore the trailing time
                            displayVal = val.substring(0, 10);
                          }
                          return (
                            <TableCell key={colIdx} sx={{ 
                              ...(colIdx === 1 && { fontWeight: 600 }),
                              color: isExists ? '#94a3b8' : 'inherit',
                              textDecoration: isExists ? 'line-through' : 'none'
                             }}>
                              {displayVal}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    )})}
                    {bulkResults.length === 0 && (
                      <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: '#94a3b8' }}>Search to list employees</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}

          {bulkStep === 2 && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                <Box sx={{ display: 'flex', gap: 3 }}>
                  <FormControl size="small" sx={{ width: 150 }}>
                    <InputLabel>Role Level</InputLabel>
                    <Select value={bulkRoleLevel} label="Role Level" onChange={e => setBulkRoleLevel(Number(e.target.value))}>
                      {ROLE_OPTIONS.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Assign Apps</InputLabel>
                    <Select multiple value={bulkAppCodes} label="Assign Apps"
                      onChange={e => {
                        const val = Array.isArray(e.target.value) ? e.target.value : [];
                        setBulkAppCodes(val);
                        // Clean up permissions for apps that were deselected
                        setBulkPermissions(prev => prev.filter(p => {
                          const pg = pages.find(page => page.code === p.pageCode);
                          return pg && val.includes(pg.appCode);
                        }));
                      }}
                      renderValue={sel => sel.join(', ')}>
                      {apps.map(app => <MenuItem key={app.appCode} value={app.appCode}><Checkbox sx={{ '&.Mui-checked': { color: themeColors.main } }} checked={bulkAppCodes.indexOf(app.appCode) > -1} />{app.appName}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
              
              <Box sx={{ flex: 1, overflowY: 'auto', p: 3, bgcolor: '#f8fafc' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#475569', mb: 2 }}>PERMISSION TEMPLATE FOR {bulkSelectedUsers.length} USERS</Typography>
                {bulkAppCodes.length === 0 && <Alert severity="info">Select apps above to configure permissions.</Alert>}
                {bulkAppCodes.map(appCode => {
                  const appPages = pagesByApp[appCode] || [];
                  if (appPages.length === 0) return null;
                  return (
                    <Accordion key={appCode} defaultExpanded sx={{ mb: 2, borderRadius: '12px !important', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', '&:before': { display: 'none' } }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#fff', borderBottom: '1px solid #f1f5f9' }}>
                        <Typography sx={{ fontWeight: 800 }}>{appCode}</Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0 }}>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 800, fontSize: 11, bg: '#f8fafc' }}>Page</TableCell>
                                {ACTIONS.map(a => <TableCell key={a} align="center" sx={{ fontWeight: 800, fontSize: 11, bg: '#f8fafc' }}>{ACTION_LABELS[a]}</TableCell>)}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {appPages.map(pg => {
                                const pState = bulkPermissions.find(x => x.pageCode === pg.code) || { pageCode: pg.code };
                                return (
                                  <TableRow key={pg.code}>
                                    <TableCell sx={{ fontWeight: 700 }}>{pg.label}</TableCell>
                                    {ACTIONS.map(a => {
                                      if (a.toLowerCase().includes('bypass') && !BYPASS_PAGES.has(pg.code)) return <TableCell key={a} />;
                                      if (pg.code === 'fb_relax' && a !== 'bypassSunrise' && a.toLowerCase().includes('bypass')) return <TableCell key={a} />;
                                      return (
                                        <TableCell key={a} align="center">
                                          <Checkbox size="small" checked={!!pState[a]}
                                            onChange={e => {
                                              const checked = e.target.checked;
                                              setBulkPermissions(prev => {
                                                const existing = prev.find(x => x.pageCode === pg.code) || { pageCode: pg.code };
                                                const next = prev.filter(x => x.pageCode !== pg.code);
                                                next.push({ ...existing, [a]: checked });
                                                return next;
                                              });
                                            }} sx={{ '&.Mui-checked': { color: themeColors.main } }} />
                                        </TableCell>
                                      );
                                    })}
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#fff', borderTop: '1px solid #f1f5f9' }}>
          <Button onClick={() => setBulkOpen(false)} sx={{ color: '#64748b', fontWeight: 600 }}>{t('admin.cancel')}</Button>
          <Box sx={{ flex: 1 }} />
          {bulkStep === 1 && (
            <Button variant="contained" disabled={bulkSelectedUsers.length === 0} onClick={() => setBulkStep(2)} endIcon={<ChevronRightIcon />} sx={{ borderRadius: 8, px: 3, fontWeight: 800, bgcolor: themeColors.main }}>
              {t('admin.nextStep', 'Next Step ({{count}} selected)', { count: bulkSelectedUsers.length })}
            </Button>
          )}
          {bulkStep === 2 && (
            <>
              <Button onClick={() => setBulkStep(1)} startIcon={<ChevronLeftIcon />} sx={{ fontWeight: 700, color: themeColors.main }}>{t('admin.back', 'Back')}</Button>
              <Button variant="contained" disabled={bulkSaving} onClick={handleBulkSetup} sx={{ borderRadius: 8, px: 4, fontWeight: 800, background: `linear-gradient(135deg, ${themeColors.main} 0%, ${themeColors.dark} 100%)`, '&:hover': { background: `linear-gradient(135deg, ${themeColors.dark} 0%, ${themeColors.main} 100%)` } }}>
                {bulkSaving ? <CircularProgress size={20} color="inherit" /> : t('admin.confirmSetup', 'Confirm Setup')}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* App Assignment Dialog */}
      <Dialog open={!!appDialogUser} onClose={() => setAppDialogUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('admin.assignAppsTitle')} — {appDialogUser?.employeeName}</DialogTitle>
        <DialogContent>
          {apps.map(app => (
            <Box key={app.appCode} sx={{ display: 'flex', alignItems: 'center', '& > *:not(:last-child)': { mr: 1, mb: 1 }, py: 0.5 }}>
              <Checkbox size="small" checked={appDialogApps.includes(app.appCode)}
                onChange={(_, checked) => {
                  setAppDialogApps(prev => checked ? [...prev, app.appCode] : prev.filter(c => c !== app.appCode));
                }}
                sx={{ '&.Mui-checked': { color: themeColors.main } }} />
              <Typography variant="body2">{app.appCode} — {app.appName}</Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAppDialogUser(null)}>{t('admin.cancel')}</Button>
          <Button variant="contained" onClick={saveUserApps}
            sx={{ backgroundColor: themeColors.main, '&:hover': { backgroundColor: themeColors.dark } }}>
            {t('admin.saved', 'Save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Factory Assignment Dialog */}
      <Dialog open={!!factoryDialogUser} onClose={() => setFactoryDialogUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Factory Permissions — {factoryDialogUser?.employeeName}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Select the factories this user can access in {currentAppCode || 'FGS_WH'}:
          </Typography>
          {availableFactories.map(fCode => (
            <Box key={fCode} sx={{ display: 'flex', alignItems: 'center', '& > *:not(:last-child)': { mr: 1, mb: 1 }, py: 0.5 }}>
              <Checkbox size="small" checked={userFactoryCodes.includes(fCode)}
                onChange={(_, checked) => {
                  setUserFactoryCodes(prev => checked ? [...prev, fCode] : prev.filter(c => c !== fCode));
                }}
                sx={{ '&.Mui-checked': { color: themeColors.main } }} />
              <Typography variant="body2">{fCode}</Typography>
            </Box>
          ))}
          {availableFactories.length === 0 && (
            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', p: 2, textAlign: 'center' }}>
              No factories found.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFactoryDialogUser(null)}>{t('admin.cancel')}</Button>
          <Button variant="contained" onClick={saveUserFactories}
            sx={{ backgroundColor: themeColors.main, '&:hover': { backgroundColor: themeColors.dark } }}>
            {t('admin.saved', 'Save')}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Custom Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarningIcon sx={{ color: '#e11d48', fontSize: 28 }} />
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent sx={{ pb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.9rem', lineHeight: 1.6 }}>
            {confirmDialog.description}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))} sx={{ borderRadius: '8px', color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}>
            {t('admin.cancel', 'Huỷ')}
          </Button>
          <Button variant="contained" color="error" onClick={async () => {
            setConfirmDialog(prev => ({ ...prev, open: false }));
            await confirmDialog.onConfirm();
          }} sx={{ borderRadius: '8px', fontWeight: 800, px: 3, bgcolor: '#e11d48', textTransform: 'none', '&:hover': { bgcolor: '#be123c' } }}>
            {t('admin.confirmDelete', 'Xác nhận xóa')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

