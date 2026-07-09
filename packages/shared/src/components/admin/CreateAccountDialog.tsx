import React from 'react';
import { 
  Dialog, DialogTitle, DialogContent, Autocomplete, TextField, Box, 
  FormControl, InputLabel, Select, MenuItem, Checkbox, DialogActions, Button, CircularProgress 
} from '@mui/material';
import { type AppInfo } from '../../services/appService';
import { type StaffOption } from '../../hooks/useUserManagement';

interface CreateAccountDialogProps {
  open: boolean;
  onClose: () => void;
  createForm: {
    employeeCode: string;
    employeeName: string;
    factory: string;
    dept: string;
    section: string;
    roleLevel: number;
    appCodes: string[];
  };
  setCreateForm: React.Dispatch<React.SetStateAction<{
    employeeCode: string;
    employeeName: string;
    factory: string;
    dept: string;
    section: string;
    roleLevel: number;
    appCodes: string[];
  }>>;
  staffOptions: StaffOption[];
  staffLoading: boolean;
  handleStaffSearch: (query: string) => void;
  handleCreateAccount: () => void;
  creating: boolean;
  apps: AppInfo[];
  roleOptions: { value: number; label: string }[];
  themeColors: { main: string; dark: string; light: string };
  isSuperAdmin: boolean;
  myRoleLevel: number;
  t: any;
}

export const CreateAccountDialog: React.FC<CreateAccountDialogProps> = ({
  open,
  onClose,
  createForm,
  setCreateForm,
  staffOptions,
  staffLoading,
  handleStaffSearch,
  handleCreateAccount,
  creating,
  apps,
  roleOptions,
  themeColors,
  isSuperAdmin,
  myRoleLevel,
  t
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t('admin.createTitle', 'Tạo tài khoản')}</DialogTitle>
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
          <InputLabel>{t('admin.role', 'Vai trò')}</InputLabel>
          <Select value={createForm.roleLevel} label={t('admin.role', 'Vai trò')}
            onChange={e => setCreateForm(f => ({ ...f, roleLevel: Number(e.target.value) }))}>
            {roleOptions.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
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
        <Button onClick={onClose}>{t('admin.cancel', 'Hủy')}</Button>
        <Button variant="contained" onClick={handleCreateAccount} disabled={creating}
          sx={{ backgroundColor: themeColors.main, '&:hover': { backgroundColor: themeColors.dark } }}>
          {creating ? <CircularProgress size={20} color="inherit" /> : t('admin.create', 'Tạo')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
