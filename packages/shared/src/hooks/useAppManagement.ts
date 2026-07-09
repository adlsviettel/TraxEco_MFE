import { useState, useEffect, useMemo } from 'react';
import { appService, type AppInfo } from '../services/appService';
import { permissionService, type UserWithPermissions } from '../services/permissionService';
import { EXTRA_PAGES } from '../config/appPages';

export interface PageDef { 
  code: string; 
  label: string; 
  appCode: string; 
}

export const useAppManagement = (
  currentAppCode: string | null,
  t: any,
  setSnackbar: (sb: any) => void,
  fetchUsers: () => void
) => {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [pages, setPages] = useState<PageDef[]>([]);
  const [newAppCode, setNewAppCode] = useState('');
  const [newAppName, setNewAppName] = useState('');
  const [appDialogUser, setAppDialogUser] = useState<UserWithPermissions | null>(null);
  const [appDialogApps, setAppDialogApps] = useState<string[]>([]);

  useEffect(() => {
    appService.getAllApps()
      .then(res => {
        const safeApps = Array.isArray(res) ? res : ((res as any).data || []);
        setApps(safeApps);
        
        // Extract all pages from apps
        const allPages: PageDef[] = [];
        safeApps.forEach((app: any) => {
          if (Array.isArray(app.pages)) {
            app.pages.forEach((p: any) => {
              allPages.push({ code: p.pageCode, label: p.pageName, appCode: app.appCode });
            });
          }
        });
        
        // Include EXTRA_PAGES config
        EXTRA_PAGES.forEach(ep => {
          if (!allPages.some(ap => ap.code === ep.code)) {
            allPages.push(ep);
          }
        });
        
        setPages(allPages);
      })
      .catch(err => console.error('Failed to load apps/pages:', err));
  }, [currentAppCode]);

  const loadUserApps = (user: UserWithPermissions) => {
    setAppDialogUser(user);
    setAppDialogApps(user.appCodes || []);
  };

  const saveUserApps = async () => {
    if (!appDialogUser) return;
    try {
      await appService.setUserApps(appDialogUser.employeeCode, appDialogApps);
      setSnackbar({ open: true, message: t('admin.appsSaved', 'App assignments saved successfully'), severity: 'success' });
      setAppDialogUser(null);
      fetchUsers();
    } catch {
      setSnackbar({ open: true, message: t('admin.appsError', 'Failed to save app assignments'), severity: 'error' });
    }
  };

  const pagesByApp = useMemo(() => {
    const map: Record<string, PageDef[]> = {};
    pages.forEach(p => {
      if (!map[p.appCode]) map[p.appCode] = [];
      map[p.appCode].push(p);
    });
    return map;
  }, [pages]);

  return {
    apps,
    setApps,
    pages,
    newAppCode,
    setNewAppCode,
    newAppName,
    setNewAppName,
    appDialogUser,
    setAppDialogUser,
    appDialogApps,
    setAppDialogApps,
    loadUserApps,
    saveUserApps,
    pagesByApp
  };
};
