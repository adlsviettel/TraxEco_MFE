import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, Paper, CircularProgress, Typography, Switch, Tooltip, IconButton, 
  Snackbar, Alert, Tabs, Tab, useTheme, useMediaQuery 
} from '@mui/material';
import { 
  AdminPanelSettings as AdminIcon, Edit as EditIcon, Delete as DeleteIcon 
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

// Services
import { permissionService, type UserWithPermissions } from '../services/permissionService';
import { appService, type AppInfo } from '../services/appService';

// Hooks
import { useAdminAuth } from '../hooks/useAdminAuth';
import { useUserManagement } from '../hooks/useUserManagement';
import { usePermissionEditor } from '../hooks/usePermissionEditor';
import { useBulkSetup } from '../hooks/useBulkSetup';
import { useAppManagement } from '../hooks/useAppManagement';
import { useFactoryPermissions } from '../hooks/useFactoryPermissions';
import { useF2SConfig } from '../hooks/useF2SConfig';

// Components
import { AdminToolbar } from '../components/admin/AdminToolbar';
import { UserList } from '../components/admin/UserList';
import { UserProfileHeader } from '../components/admin/UserProfileHeader';
import { PermissionAccordion } from '../components/admin/PermissionAccordion';
import { PermissionActionFooter } from '../components/admin/PermissionActionFooter';
import { CreateAccountDialog } from '../components/admin/CreateAccountDialog';
import { EditAccountDialog } from '../components/admin/EditAccountDialog';
import { BulkSetupDialog } from '../components/admin/BulkSetupDialog';
import { AppAssignmentDialog } from '../components/admin/AppAssignmentDialog';
import { FactoryAssignmentDialog } from '../components/admin/FactoryAssignmentDialog';
import { ConfirmDialog } from '../components/admin/ConfirmDialog';
import { F2SConfigAccordion } from '../components/admin/F2SConfigAccordion';
import { AppManagementAccordion } from '../components/admin/AppManagementAccordion';

const APP_ADMIN_PAGES: Record<string, string> = {
  FGS_WH: 'admin',
  FABRIC_WH: 'fb_admin',
  QCFB_WH: 'qcfb-admin',
  RD_MATERIAL: 'rd_admin',
  TCC_TEMPLATE: 'tcc_admin',
  F2S_DELIVERY: 'f2s_admin',
  IT_INVENTORY: 'it_admin'
};

const THEME_COLORS = {
  FGS_WH: { main: '#2e7d32', dark: '#1b5e20', light: '#e8f5e9' },
  FABRIC_WH: { main: '#2e7d32', dark: '#1b5e20', light: '#e8f5e9' },
  IT_INVENTORY: { main: '#5e35b1', dark: '#4527a0', light: '#ede7f6' },
  RD_MATERIAL: { main: '#3ba55c', dark: '#2e7d32', light: '#e8f5e9' },
  F2S_DELIVERY: { main: '#2e7d32', dark: '#1b5e20', light: '#e8f5e9' },
  F2S: { main: '#2e7d32', dark: '#1b5e20', light: '#e8f5e9' },
};

export default function AdminPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const nav = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  const [activeTab, setActiveTab] = useState<'list' | 'permissions'>('list');

  // Shared Snackbar State
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ 
    open: false, message: '', severity: 'success' 
  });

  // Custom Confirmation Dialog State
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

  // 1. Auth & App Code context
  const { currentAppCode, isSuperAdmin, myRoleLevel } = useAdminAuth();

  // Theme Colors
  const themeColors = useMemo(() => {
    const key = (currentAppCode || '') as keyof typeof THEME_COLORS;
    return THEME_COLORS[key] || { main: '#2e7d32', dark: '#1b5e20', light: '#e8f5e9' };
  }, [currentAppCode]);

  // Role Level Options
  const roleOptions = useMemo(() => {
    return [
      { value: 1, label: 'SuperAdmin' },
      { value: 2, label: 'Admin' },
      { value: 3, label: 'Supervisor' },
      { value: 4, label: 'User' },
    ].filter(r => isSuperAdmin || r.value > myRoleLevel);
  }, [isSuperAdmin, myRoleLevel]);

  // 2. User Management (CRUD, Load)
  const {
    users, loading, error, search, setSearch, selectedUser, setSelectedUser,
    filteredUsers, fetchUsers,
    createOpen, setCreateOpen, createForm, setCreateForm, creating, handleCreateAccount,
    editOpen, setEditOpen, editForm, setEditForm, editing, handleEditAccount,
    staffOptions, staffLoading, handleStaffSearch
  } = useUserManagement(currentAppCode, t, setSnackbar);

  // 3. App Management
  const {
    apps, setApps, pages, newAppCode, setNewAppCode, newAppName, setNewAppName,
    appDialogUser, setAppDialogUser, appDialogApps, setAppDialogApps,
    loadUserApps, saveUserApps, pagesByApp
  } = useAppManagement(currentAppCode, t, setSnackbar, fetchUsers);

  // Assigned apps list for selected user
  const [selectedUserApps, setSelectedUserApps] = useState<string[]>([]);
  
  // User select callback
  const onUserSelect = async (user: UserWithPermissions) => {
    setSelectedUser(user);
    if (isMobile) {
      setActiveTab('permissions');
    }
    try {
      const data = await appService.getUserApps(user.employeeCode);
      setSelectedUserApps(Array.isArray(data) ? data : ((data as any).apps || (data as any).data || []));
    } catch { 
      setSelectedUserApps([]); 
    }
  };

  // 4. Permission Editor (Matrix checkboxes, presets)
  const {
    pendingChanges, saving, getPermState, togglePerm, toggleAllForApp, applyPreset, handleSave
  } = usePermissionEditor(t, setSnackbar);

  const onSavePermissions = () => {
    handleSave(selectedUser, fetchUsers);
  };

  // 5. Bulk Setup Wizard
  const {
    bulkOpen, setBulkOpen, bulkStep, setBulkStep, bulkSearchRef, bulkResults,
    bulkSelectedUsers, setBulkSelectedUsers, bulkRoleLevel, setBulkRoleLevel,
    bulkAppCodes, setBulkAppCodes, bulkPermissions, setBulkPermissions, bulkSaving,
    existingUserCodes, handleBulkSearch, handleBulkSetup
  } = useBulkSetup(currentAppCode, users, t, setSnackbar, fetchUsers);

  // 6. Factory Permissions Dialog
  const {
    factoryDialogUser, setFactoryDialogUser, userFactoryCodes, setUserFactoryCodes,
    availableFactories, setAvailableFactories, loadFactoryPerms, saveUserFactories
  } = useFactoryPermissions(currentAppCode, t, setSnackbar, fetchUsers);

  // 7. F2S settings Config
  const {
    f2sEditableCols, setF2sEditableCols, handleSaveF2SEditableCols
  } = useF2SConfig(currentAppCode, t, setSnackbar);

  // Initial user list load
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // App management delete & add app handlers
  const onDeleteApp = (app: AppInfo) => {
    setConfirmDialog({
      open: true,
      title: t('admin.deleteAppTitle', 'Xác nhận xóa ứng dụng'),
      description: t('admin.deleteAppConfirm', 'Bạn có chắc chắn muốn xóa ứng dụng này không? Thao tác này sẽ xóa toàn bộ phân quyền liên quan và không thể hoàn tác.'),
      onConfirm: async () => {
        try { 
          await appService.deleteApp(app.appCode); 
          setApps(prev => prev.filter(a => a.appCode !== app.appCode));
          setSnackbar({ open: true, message: t('admin.deleted', 'Xóa thành công'), severity: 'success' });
        } catch { 
          setSnackbar({ open: true, message: t('admin.saveError', 'Lỗi lưu dữ liệu'), severity: 'error' }); 
        }
      }
    });
  };

  const onAddApp = async (code: string, name: string) => {
    try { 
      await appService.upsertApp(code.trim(), name.trim());
      setApps(prev => [...prev.filter(a => a.appCode !== code.trim()), { appCode: code.trim(), appName: name.trim(), isActive: true }]);
      setNewAppCode(''); 
      setNewAppName('');
      setSnackbar({ open: true, message: t('admin.saved', 'Đã lưu'), severity: 'success' });
    } catch { 
      setSnackbar({ open: true, message: t('admin.saveError', 'Lỗi lưu dữ liệu'), severity: 'error' }); 
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 1.5 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', gap: { xs: 0.5, md: 1 } }}>
      
      {/* Header & Toolbar */}
      <AdminToolbar
        isMobile={isMobile}
        themeColors={themeColors}
        search={search}
        setSearch={setSearch}
        usersCount={Array.isArray(users) ? users.length : 0}
        isSuperAdmin={isSuperAdmin}
        myRoleLevel={myRoleLevel}
        loading={loading}
        fetchUsers={fetchUsers}
        onAddUserClick={() => setCreateOpen(true)}
        onBulkSetupClick={() => { setBulkOpen(true); setBulkStep(1); setBulkSelectedUsers([]); }}
        t={t}
      />

      {error && <Alert severity="error" sx={{ borderRadius: 2, border: '1px solid #fecaca', py: 0.5 }}>{error}</Alert>}

      {/* F2S_DELIVERY Specific Settings */}
      <F2SConfigAccordion
        currentAppCode={currentAppCode}
        isSuperAdmin={isSuperAdmin}
        f2sEditableCols={f2sEditableCols}
        setF2sEditableCols={setF2sEditableCols}
        handleSaveF2SEditableCols={handleSaveF2SEditableCols}
        themeColors={themeColors}
        t={t}
      />

      {/* App Management — SuperAdmin only */}
      <AppManagementAccordion
        isSuperAdmin={isSuperAdmin}
        apps={apps}
        newAppCode={newAppCode}
        setNewAppCode={setNewAppCode}
        newAppName={newAppName}
        setNewAppName={setNewAppName}
        onDeleteApp={onDeleteApp}
        onAddApp={onAddApp}
        themeColors={themeColors}
        t={t}
      />

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
          <UserList
            users={users}
            filteredUsers={filteredUsers}
            selectedUser={selectedUser}
            onUserSelect={onUserSelect}
            themeColors={themeColors}
            loading={loading}
            fetchUsers={fetchUsers}
            t={t}
          />
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
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#cbd5e1' }}>{t('admin.selectUserHint', 'Chọn người dùng để phân quyền')}</Typography>
              </Box>
            ) : (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                
                {/* Profile Card Header */}
                <UserProfileHeader
                  selectedUser={selectedUser}
                  isMobile={isMobile}
                  onBackToList={() => setActiveTab('list')}
                  themeColors={themeColors}
                  isSuperAdmin={isSuperAdmin}
                  myRoleLevel={myRoleLevel}
                  onAppsClick={() => loadUserApps(selectedUser)}
                  onFactoryClick={() => loadFactoryPerms(selectedUser)}
                  onEditClick={() => {
                    setEditForm({
                      employeeCode: selectedUser.employeeCode,
                      employeeName: selectedUser.employeeName || '',
                      factory: selectedUser.factory || '',
                      dept: selectedUser.dept || '',
                      section: selectedUser.section || '',
                      roleLevel: selectedUser.roleLevel || 4,
                    });
                    setEditOpen(true);
                  }}
                  onToggleActive={async (checked) => {
                    try { 
                      await permissionService.toggleActive(selectedUser.employeeCode, checked);
                      setSnackbar({ open: true, message: checked ? t('admin.activated', 'Đã kích hoạt') : t('admin.deactivated', 'Đã khóa'), severity: 'success' });
                      fetchUsers();
                    } catch { 
                      setSnackbar({ open: true, message: t('admin.saveError', 'Lỗi hệ thống'), severity: 'error' }); 
                    }
                  }}
                  onDeleteClick={() => {
                    setConfirmDialog({
                      open: true,
                      title: t('admin.deleteUserTitle', 'Xác nhận xóa tài khoản'),
                      description: t('admin.deleteUserConfirm', 'Bạn có chắc chắn muốn xóa tài khoản {{user}} khỏi hệ thống không? Hành động này không thể hoàn tác.', { user: selectedUser.employeeCode }),
                      onConfirm: async () => {
                        try { 
                          await permissionService.deleteUser(selectedUser.employeeCode);
                          setSnackbar({ open: true, message: t('admin.deleted', 'Đã xóa'), severity: 'success' });
                          setSelectedUser(null); 
                          fetchUsers();
                        } catch { 
                          setSnackbar({ open: true, message: t('admin.saveError', 'Lỗi hệ thống'), severity: 'error' }); 
                        }
                      }
                    });
                  }}
                  t={t}
                />

                {/* Permission accordions by App */}
                <PermissionAccordion
                  apps={apps}
                  currentAppCode={currentAppCode}
                  selectedUser={selectedUser}
                  selectedUserApps={selectedUserApps}
                  pagesByApp={pagesByApp}
                  pendingChanges={pendingChanges}
                  togglePerm={togglePerm}
                  toggleAllForApp={toggleAllForApp}
                  applyPreset={(user, appCode, levelNum) => applyPreset(user, appCode, levelNum, pages)}
                  getPermState={getPermState}
                  isMobile={isMobile}
                  isSuperAdmin={isSuperAdmin}
                  myRoleLevel={myRoleLevel}
                  themeColors={themeColors}
                  t={t}
                />

                {/* Action Footer for Saving Permissions */}
                <PermissionActionFooter
                  pendingChanges={pendingChanges}
                  saving={saving}
                  onSave={onSavePermissions}
                  themeColors={themeColors}
                  t={t}
                />

              </Box>
            )}
          </Paper>
        )}
      </Box>

      {/* Create Account Dialog */}
      <CreateAccountDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        createForm={createForm}
        setCreateForm={setCreateForm}
        staffOptions={staffOptions}
        staffLoading={staffLoading}
        handleStaffSearch={handleStaffSearch}
        handleCreateAccount={handleCreateAccount}
        creating={creating}
        apps={apps}
        roleOptions={roleOptions}
        themeColors={themeColors}
        isSuperAdmin={isSuperAdmin}
        myRoleLevel={myRoleLevel}
        t={t}
      />

      {/* Edit Account Dialog */}
      <EditAccountDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editForm={editForm}
        setEditForm={setEditForm}
        handleEditAccount={handleEditAccount}
        editing={editing}
        roleOptions={roleOptions}
        themeColors={themeColors}
        isSuperAdmin={isSuperAdmin}
        myRoleLevel={myRoleLevel}
        t={t}
      />

      {/* Bulk Setup Dialog */}
      <BulkSetupDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        bulkStep={bulkStep}
        setBulkStep={setBulkStep}
        bulkSearchRef={bulkSearchRef}
        bulkResults={bulkResults}
        bulkSelectedUsers={bulkSelectedUsers}
        setBulkSelectedUsers={setBulkSelectedUsers}
        bulkRoleLevel={bulkRoleLevel}
        setBulkRoleLevel={setBulkRoleLevel}
        bulkAppCodes={bulkAppCodes}
        setBulkAppCodes={setBulkAppCodes}
        bulkPermissions={bulkPermissions}
        setBulkPermissions={setBulkPermissions}
        bulkSaving={bulkSaving}
        existingUserCodes={existingUserCodes}
        handleBulkSearch={handleBulkSearch}
        handleBulkSetup={handleBulkSetup}
        apps={apps}
        pages={pages}
        pagesByApp={pagesByApp}
        roleOptions={roleOptions}
        themeColors={themeColors}
        t={t}
      />

      {/* App Assignment Dialog */}
      <AppAssignmentDialog
        open={!!appDialogUser}
        onClose={() => setAppDialogUser(null)}
        user={appDialogUser}
        apps={apps}
        selectedApps={appDialogApps}
        setSelectedApps={setAppDialogApps}
        onSave={saveUserApps}
        themeColors={themeColors}
        t={t}
      />

      {/* Factory Assignment Dialog */}
      <FactoryAssignmentDialog
        open={!!factoryDialogUser}
        onClose={() => setFactoryDialogUser(null)}
        user={factoryDialogUser}
        currentAppCode={currentAppCode}
        availableFactories={availableFactories}
        selectedFactories={userFactoryCodes}
        setSelectedFactories={setUserFactoryCodes}
        onSave={saveUserFactories}
        themeColors={themeColors}
        t={t}
      />

      {/* Custom Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={async () => {
          setConfirmDialog(prev => ({ ...prev, open: false }));
          await confirmDialog.onConfirm();
        }}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        t={t}
      />

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
