import { useState } from 'react';
import { factoryPermissionService } from '../services/factoryPermissionService';
import { type UserWithPermissions } from '../services/permissionService';

export const useFactoryPermissions = (
  currentAppCode: string | null,
  t: any,
  setSnackbar: (sb: any) => void,
  fetchUsers: () => void
) => {
  const [factoryDialogUser, setFactoryDialogUser] = useState<UserWithPermissions | null>(null);
  const [userFactoryCodes, setUserFactoryCodes] = useState<string[]>([]);
  const [availableFactories, setAvailableFactories] = useState<string[]>([]);

  const loadFactoryPerms = async (user: UserWithPermissions) => {
    setFactoryDialogUser(user);
    try {
      const targetApp = currentAppCode || 'FGS_WH';
      const [userPermsRes, allFactoriesRes] = await Promise.all([
        factoryPermissionService.getUserFactories(user.employeeCode, targetApp),
        factoryPermissionService.getAllFactories()
      ]);
      
      const userFactoryList = Array.isArray(userPermsRes) ? userPermsRes : [];
      const availableList = Array.isArray(allFactoriesRes) ? allFactoriesRes : [];
      
      setUserFactoryCodes(userFactoryList);
      setAvailableFactories(availableList);
    } catch (e) {
      console.error('Failed to load factory perms:', e);
      setUserFactoryCodes([]);
      setAvailableFactories([]);
    }
  };

  const saveUserFactories = async () => {
    if (!factoryDialogUser) return;
    try {
      const targetApp = currentAppCode || 'FGS_WH';
      await factoryPermissionService.setUserFactories(factoryDialogUser.employeeCode, targetApp, userFactoryCodes);
      setSnackbar({ open: true, message: t('admin.factoriesSaved', 'Factory assignments saved successfully'), severity: 'success' });
      setFactoryDialogUser(null);
      fetchUsers();
    } catch {
      setSnackbar({ open: true, message: t('admin.factoriesError', 'Failed to save factory assignments'), severity: 'error' });
    }
  };

  return {
    factoryDialogUser,
    setFactoryDialogUser,
    userFactoryCodes,
    setUserFactoryCodes,
    availableFactories,
    setAvailableFactories,
    loadFactoryPerms,
    saveUserFactories
  };
};
