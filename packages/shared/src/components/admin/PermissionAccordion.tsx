import React, { memo } from 'react';
import { 
  Box, Typography, Accordion, AccordionSummary, AccordionDetails, 
  Chip, Button, Tooltip, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Checkbox 
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { type UserWithPermissions } from '../../services/permissionService';
import { type AppInfo } from '../../services/appService';
import { type PendingChange } from '../../hooks/usePermissionEditor';
import { type PageDef } from '../../hooks/useAppManagement';
import { PERMISSION_PRESETS } from '../../config/permissionPresets';

const ACTIONS = ['canView', 'canAdd', 'canEdit', 'canDelete', 'canExport', 'canCancel', 'canBypassCheck', 'bypassQC', 'bypassRelax', 'bypassLabTest', 'bypassSunrise'] as const;
const ACTION_LABELS: Record<string, string> = {
  canView: '👁 View', canAdd: '➕ Add', canEdit: '✏️ Edit', canDelete: '🗑 Del', canExport: '📥 Exp', canCancel: '🚫 Cancel', canBypassCheck: '🔓 Bypass All',
  bypassQC: '🔓 QC', bypassRelax: '🔓 Relax', bypassLabTest: '🔓 Lab', bypassSunrise: '🔓 Sunrise',
};
const BYPASS_PAGES = new Set(['fb_issue', 'fb_relax']);

const PermissionRow = memo(({ pg, user, pendingChange, themeColor, onToggle }: any) => {
  const perm = user.permissions.find((p: any) => p.pageCode === pg.code);
  const state = pendingChange || {
    employeeCode: user.employeeCode, pageCode: pg.code,
    canView: perm?.canView ?? false, canAdd: perm?.canAdd ?? false,
    canEdit: perm?.canEdit ?? false, canDelete: perm?.canDelete ?? false,
    canExport: perm?.canExport ?? false,
    canCancel: perm?.canCancel ?? false,
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
      '&:hover .sticky-col': { backgroundColor: '#f8fafc' },
      transition: 'all 0.2s'
    }}>
      <TableCell className="sticky-col" sx={{ 
        position: 'sticky',
        left: 0,
        zIndex: 1,
        backgroundColor: hasChange ? '#fefce8' : '#fff',
        fontWeight: 700, 
        borderBottom: '1px solid #f1f5f9', 
        color: '#334155', 
        fontSize: '0.9rem',
        boxShadow: '2px 0 5px -2px rgba(0,0,0,0.05)'
      }}>{pg.label}</TableCell>
      {ACTIONS.map(a => {
        if (a.startsWith('bypass')) {
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
    canCancel: perm?.canCancel ?? false,
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
          if (a.startsWith('bypass')) {
            if (!BYPASS_PAGES.has(pg.code)) return null;
            if (pg.code === 'fb_relax' && a !== 'bypassSunrise') return null;
          }
          
          const isSelected = !!state[a];
          const isBypass = a.startsWith('bypass');
          
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

interface PermissionAccordionProps {
  apps: AppInfo[];
  currentAppCode: string | null;
  selectedUser: UserWithPermissions;
  selectedUserApps: string[];
  pagesByApp: Record<string, PageDef[]>;
  pendingChanges: Map<string, PendingChange>;
  togglePerm: (user: UserWithPermissions, pageCode: string, action: string, currentState: any) => void;
  toggleAllForApp: (user: UserWithPermissions, appPages: PageDef[], enable: boolean) => void;
  applyPreset: (user: UserWithPermissions, appCode: string, levelNum: number) => void;
  getPermState: (user: UserWithPermissions, pageCode: string) => any;
  isMobile: boolean;
  isSuperAdmin: boolean;
  myRoleLevel: number;
  themeColors: { main: string; dark: string; light: string };
  t: any;
}

export const PermissionAccordion: React.FC<PermissionAccordionProps> = ({
  apps,
  currentAppCode,
  selectedUser,
  selectedUserApps,
  pagesByApp,
  pendingChanges,
  togglePerm,
  toggleAllForApp,
  applyPreset,
  getPermState,
  isMobile,
  isSuperAdmin,
  myRoleLevel,
  themeColors,
  t
}) => {
  return (
    <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
      {apps.filter(app => {
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
                    onClick={(e) => { e.stopPropagation(); toggleAllForApp(selectedUser, appPages, !allChecked); }}
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
                  {t('admin.noPagesForApp', 'No pages registered for this app')}
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
                        <TableCell sx={{ 
                          position: 'sticky',
                          left: 0,
                          top: 0,
                          zIndex: 3,
                          fontWeight: 800, 
                          backgroundColor: '#f1f5f9', 
                          color: '#64748b', 
                          textTransform: 'uppercase', 
                          fontSize: 11, 
                          letterSpacing: '0.5px', 
                          borderBottom: 'none',
                          boxShadow: '2px 2px 5px -2px rgba(0,0,0,0.1)'
                        }}>{t('admin.page', 'Page')}</TableCell>
                        {ACTIONS.map(a => (
                          <TableCell key={a} align="center" sx={{ 
                            position: 'sticky',
                            top: 0,
                            zIndex: 2,
                            fontWeight: 800, 
                            backgroundColor: '#f1f5f9', 
                            color: '#64748b', 
                            textTransform: 'uppercase', 
                            fontSize: 11, 
                            letterSpacing: '0.5px', 
                            borderBottom: 'none' 
                          }}>
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
  );
};
