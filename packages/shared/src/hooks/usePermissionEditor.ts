import { useState } from 'react';
import { permissionService, type UserWithPermissions } from '../services/permissionService';
import { PERMISSION_PRESETS } from '../config/permissionPresets';

export interface PendingChange {
  employeeCode: string;
  pageCode: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canCancel?: boolean;
  canBypassCheck: boolean;
  bypassQC: boolean;
  bypassRelax: boolean;
  bypassLabTest: boolean;
  bypassSunrise: boolean;
}

export const usePermissionEditor = (t: any, setSnackbar: (sb: any) => void) => {
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [saving, setSaving] = useState(false);

  const getPermState = (user: UserWithPermissions, pageCode: string) => {
    const key = `${user.employeeCode}:${pageCode}`;
    if (pendingChanges.has(key)) return pendingChanges.get(key);
    
    const perm = user.permissions.find(p => p.pageCode === pageCode);
    return {
      employeeCode: user.employeeCode,
      pageCode,
      canView: perm?.canView ?? false,
      canAdd: perm?.canAdd ?? false,
      canEdit: perm?.canEdit ?? false,
      canDelete: perm?.canDelete ?? false,
      canExport: perm?.canExport ?? false,
      canCancel: perm?.canCancel ?? false,
      canBypassCheck: perm?.canBypassCheck ?? false,
      bypassQC: perm?.bypassQC ?? false,
      bypassRelax: perm?.bypassRelax ?? false,
      bypassLabTest: perm?.bypassLabTest ?? false,
      bypassSunrise: perm?.bypassSunrise ?? false,
    };
  };

  const togglePerm = (user: UserWithPermissions, pageCode: string, action: string, currentState: any) => {
    const key = `${user.employeeCode}:${pageCode}`;
    const nextVal = !currentState[action];
    
    setPendingChanges(prev => {
      const next = new Map(prev);
      const updated = { ...currentState, [action]: nextVal };
      
      // If it matches original user permission exactly, remove from pendingChanges
      const original = user.permissions.find(p => p.pageCode === pageCode);
      const isOriginal = original 
        ? original.canView === updated.canView &&
          original.canAdd === updated.canAdd &&
          original.canEdit === updated.canEdit &&
          original.canDelete === updated.canDelete &&
          original.canExport === updated.canExport &&
          (original.canCancel ?? false) === (updated.canCancel ?? false) &&
          original.canBypassCheck === updated.canBypassCheck &&
          original.bypassQC === updated.bypassQC &&
          original.bypassRelax === updated.bypassRelax &&
          original.bypassLabTest === updated.bypassLabTest &&
          original.bypassSunrise === updated.bypassSunrise
        : !updated.canView && !updated.canAdd && !updated.canEdit && !updated.canDelete && !updated.canExport && !updated.canCancel && !updated.canBypassCheck && !updated.bypassQC && !updated.bypassRelax && !updated.bypassLabTest && !updated.bypassSunrise;

      if (isOriginal) {
        next.delete(key);
      } else {
        next.set(key, updated);
      }
      return next;
    });
  };

  const toggleAllForApp = (user: UserWithPermissions, appPages: { code: string }[], enable: boolean) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      appPages.forEach(pg => {
        const key = `${user.employeeCode}:${pg.code}`;
        const current = getPermState(user, pg.code);
        const updated = {
          ...current,
          canView: enable,
          canAdd: enable,
          canEdit: enable,
          canDelete: enable,
          canExport: enable,
          canCancel: enable,
          canBypassCheck: enable,
          bypassQC: enable,
          bypassRelax: enable,
          bypassLabTest: enable,
          bypassSunrise: enable,
        };
        next.set(key, updated);
      });
      return next;
    });
  };

  const applyPreset = (user: UserWithPermissions, appCode: string, levelNum: number, allPages: { code: string; appCode: string }[]) => {
    const appPresets = PERMISSION_PRESETS[appCode];
    if (!appPresets) return;
    const preset = appPresets[levelNum];
    if (!preset) return;

    setPendingChanges(prev => {
      const next = new Map(prev);
      
      // Reset all pages for this app first
      const appPages = allPages.filter(pg => pg.appCode === appCode);
      appPages.forEach(pg => {
        const key = `${user.employeeCode}:${pg.code}`;
        const current = getPermState(user, pg.code);
        const updated = {
          ...current,
          canView: false,
          canAdd: false,
          canEdit: false,
          canDelete: false,
          canExport: false,
          canCancel: false,
          canBypassCheck: false,
          bypassQC: false,
          bypassRelax: false,
          bypassLabTest: false,
          bypassSunrise: false,
        };
        next.set(key, updated);
      });

      // Apply preset pages
      Object.entries(preset.pages).forEach(([pageCode, presetPage]) => {
        const key = `${user.employeeCode}:${pageCode}`;
        const current = getPermState(user, pageCode);
        const updated = {
          ...current,
          canView: presetPage.canView ?? false,
          canAdd: presetPage.canAdd ?? false,
          canEdit: presetPage.canEdit ?? false,
          canDelete: presetPage.canDelete ?? false,
          canExport: presetPage.canExport ?? false,
          canCancel: presetPage.canCancel ?? false,
          canBypassCheck: presetPage.canBypassCheck ?? false,
          bypassQC: presetPage.bypassQC ?? false,
          bypassRelax: presetPage.bypassRelax ?? false,
          bypassLabTest: presetPage.bypassLabTest ?? false,
          bypassSunrise: presetPage.bypassSunrise ?? false,
        };
        next.set(key, updated);
      });

      return next;
    });
  };

  const handleSave = async (selectedUser: UserWithPermissions | null, onSuccess: () => void) => {
    if (!selectedUser || pendingChanges.size === 0) return;
    setSaving(true);
    try {
      for (const change of pendingChanges.values()) {
        const hasAny = change.canView || change.canAdd || change.canEdit || 
                       change.canDelete || change.canExport || change.canCancel || 
                       change.canBypassCheck || change.bypassQC || change.bypassRelax || 
                       change.bypassLabTest || change.bypassSunrise;
        if (hasAny) {
          await permissionService.grantPermission(change);
        } else {
          await permissionService.revokePermission(change.employeeCode, change.pageCode);
        }
      }
      
      setSnackbar({ open: true, message: t('admin.saveSuccess', 'Permissions saved successfully'), severity: 'success' });
      setPendingChanges(new Map());
      onSuccess();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || t('admin.saveError', 'Failed to save permissions'), severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return {
    pendingChanges,
    setPendingChanges,
    saving,
    getPermState,
    togglePerm,
    toggleAllForApp,
    applyPreset,
    handleSave
  };
};
