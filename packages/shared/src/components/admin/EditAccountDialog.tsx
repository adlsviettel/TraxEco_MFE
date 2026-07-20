import React from 'react';
import { 
  Dialog, DialogTitle, DialogContent, TextField, Box, 
  FormControl, InputLabel, Select, MenuItem, DialogActions, Button, CircularProgress 
} from '@mui/material';

interface EditAccountDialogProps {
  open: boolean;
  onClose: () => void;
  editForm: {
    employeeCode: string;
    employeeName: string;
    email: string;
    factory: string;
    dept: string;
    section: string;
    roleLevel: number;
  };
  setEditForm: React.Dispatch<React.SetStateAction<{
    employeeCode: string;
    employeeName: string;
    email: string;
    factory: string;
    dept: string;
    section: string;
    roleLevel: number;
  }>>;
  handleEditAccount: () => void;
  editing: boolean;
  roleOptions: { value: number; label: string }[];
  themeColors: { main: string; dark: string; light: string };
  isSuperAdmin: boolean;
  myRoleLevel: number;
  t: any;
}

export const EditAccountDialog: React.FC<EditAccountDialogProps> = ({
  open,
  onClose,
  editForm,
  setEditForm,
  handleEditAccount,
  editing,
  roleOptions,
  themeColors,
  isSuperAdmin,
  myRoleLevel,
  t
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {t('admin.editTitle', 'Chỉnh sửa tài khoản')}: {editForm.employeeCode}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField label="Employee Name" size="small" value={editForm.employeeName}
          onChange={e => setEditForm(f => ({ ...f, employeeName: e.target.value }))} />
        <TextField label="Email" size="small" value={editForm.email} type="email"
          onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
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
          <InputLabel>{t('admin.role', 'Vai trò')}</InputLabel>
          <Select value={editForm.roleLevel} label={t('admin.role', 'Vai trò')}
            onChange={e => setEditForm(f => ({ ...f, roleLevel: Number(e.target.value) }))}>
            {roleOptions.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t('admin.cancel', 'Hủy')}</Button>
        <Button variant="contained" onClick={handleEditAccount} disabled={editing}
          sx={{ backgroundColor: themeColors.main, '&:hover': { backgroundColor: themeColors.dark } }}>
          {editing ? <CircularProgress size={20} color="inherit" /> : t('admin.saveChanges', 'Lưu thay đổi')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
