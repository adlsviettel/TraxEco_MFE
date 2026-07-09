import React from 'react';
import { 
  Dialog, DialogTitle, DialogContent, Box, TextField, Button, Paper, Table, 
  TableHead, TableRow, TableCell, Checkbox, TableBody, FormControl, InputLabel, 
  Select, MenuItem, Accordion, AccordionSummary, AccordionDetails, TableContainer, 
  Typography, Alert, DialogActions, CircularProgress 
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon, ChevronRight as ChevronRightIcon, 
  ChevronLeft as ChevronLeftIcon 
} from '@mui/icons-material';
import { type AppInfo } from '../../services/appService';
import { type PageDef } from '../../hooks/useAppManagement';

const ACTIONS = ['canView', 'canAdd', 'canEdit', 'canDelete', 'canExport', 'canCancel', 'canBypassCheck', 'bypassQC', 'bypassRelax', 'bypassLabTest', 'bypassSunrise'] as const;
const ACTION_LABELS: Record<string, string> = {
  canView: '👁 View', canAdd: '➕ Add', canEdit: '✏️ Edit', canDelete: '🗑 Del', canExport: '📥 Exp', canCancel: '🚫 Cancel', canBypassCheck: '🔓 Bypass All',
  bypassQC: '🔓 QC', bypassRelax: '🔓 Relax', bypassLabTest: '🔓 Lab', bypassSunrise: '🔓 Sunrise',
};
const BYPASS_PAGES = new Set(['fb_issue', 'fb_relax']);

interface BulkSetupDialogProps {
  open: boolean;
  onClose: () => void;
  bulkStep: number;
  setBulkStep: (step: number) => void;
  bulkSearchRef: React.RefObject<HTMLInputElement>;
  bulkResults: any[];
  bulkSelectedUsers: any[];
  setBulkSelectedUsers: React.Dispatch<React.SetStateAction<any[]>>;
  bulkRoleLevel: number;
  setBulkRoleLevel: (level: number) => void;
  bulkAppCodes: string[];
  setBulkAppCodes: (codes: string[]) => void;
  bulkPermissions: any[];
  setBulkPermissions: React.Dispatch<React.SetStateAction<any[]>>;
  bulkSaving: boolean;
  existingUserCodes: Set<string>;
  handleBulkSearch: (query: string) => void;
  handleBulkSetup: () => void;
  apps: AppInfo[];
  pages: PageDef[];
  pagesByApp: Record<string, PageDef[]>;
  roleOptions: { value: number; label: string }[];
  themeColors: { main: string; dark: string; light: string };
  t: any;
}

export const BulkSetupDialog: React.FC<BulkSetupDialogProps> = ({
  open,
  onClose,
  bulkStep,
  setBulkStep,
  bulkSearchRef,
  bulkResults,
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
  handleBulkSetup,
  apps,
  pages,
  pagesByApp,
  roleOptions,
  themeColors,
  t
}) => {
  const onSearchClick = () => {
    if (bulkSearchRef.current) {
      handleBulkSearch(bulkSearchRef.current.value);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && bulkSearchRef.current) {
      handleBulkSearch(bulkSearchRef.current.value);
    }
  };

  const eligibleResults = bulkResults.filter(
    u => !existingUserCodes.has(u.id_staff || u.code) && String(u.is_existing_account) !== 'true' && u.is_existing_account !== 1 && u.is_existing_account !== '1'
  );

  const allEligibleChecked = eligibleResults.length > 0 && bulkSelectedUsers.length === eligibleResults.length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
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
                onKeyDown={onKeyDown}
                sx={{ flex: 1, bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '4px' } }} />
              <Button variant="contained" onClick={onSearchClick} disableElevation sx={{ borderRadius: '6px', px: 3, bgcolor: themeColors.main, '&:hover': { bgcolor: themeColors.dark } }}>{t('common.search', 'Search')}</Button>
            </Box>
            <Paper elevation={0} sx={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox checked={allEligibleChecked}
                                onChange={e => setBulkSelectedUsers(e.target.checked ? eligibleResults : [])}
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
                    {roleOptions.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Assign Apps</InputLabel>
                  <Select multiple value={bulkAppCodes} label="Assign Apps"
                    onChange={e => {
                      const val = Array.isArray(e.target.value) ? e.target.value : [];
                      setBulkAppCodes(val);
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
        <Button onClick={onClose} sx={{ color: '#64748b', fontWeight: 600 }}>{t('admin.cancel', 'Hủy')}</Button>
        <Box sx={{ flex: 1 }} />
        {bulkStep === 1 && (
          <Button variant="contained" disabled={bulkSelectedUsers.length === 0} onClick={() => setBulkStep(2)} endIcon={<ChevronRightIcon />} sx={{ borderRadius: 8, px: 3, fontWeight: 800, bgcolor: themeColors.main }}>
            {t('admin.nextStep', 'Next Step ({{count}} selected)', { count: bulkSelectedUsers.length })}
          </Button>
        )}
        {bulkStep === 2 && (
          <>
            <Button onClick={() => setBulkStep(1)} startIcon={<ChevronLeftIcon />} sx={{ fontWeight: 700, color: themeColors.main }}>{t('admin.back', 'Quay lại')}</Button>
            <Button variant="contained" disabled={bulkSaving} onClick={handleBulkSetup} sx={{ borderRadius: 8, px: 4, fontWeight: 800, background: `linear-gradient(135deg, ${themeColors.main} 0%, ${themeColors.dark} 100%)`, '&:hover': { background: `linear-gradient(135deg, ${themeColors.dark} 0%, ${themeColors.main} 100%)` } }}>
              {bulkSaving ? <CircularProgress size={20} color="inherit" /> : t('admin.confirmSetup', 'Confirm Setup')}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
