import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Button, List, ListItem, ListItemText,
  ListItemSecondaryAction, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, CircularProgress, Snackbar, Alert, Divider,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import WarningIcon from '@mui/icons-material/WarningRounded';
import { useTranslation } from 'react-i18next';
import { tccService } from '../services/tccService';
import { EmailTemplateConfig } from '../components/EmailTemplateConfig';

const PRIMARY_COLOR = '#2e7d32';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      {...other}
      style={{ height: 'calc(100% - 48px)', overflow: 'auto' }}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>{children}</Box>
      )}
    </div>
  );
}

export default function TccSettingsPage() {
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<Record<string, string[]>>({});
  const [machines, setMachines] = useState<any[]>([]);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addCategory, setAddCategory] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editOldValue, setEditOldValue] = useState('');
  const [saving, setSaving] = useState(false);

  const [addMachineDialogOpen, setAddMachineDialogOpen] = useState(false);
  const [newMachine, setNewMachine] = useState({ factory: '', machineType: '', machineDimension: '' });
  const [editMachineId, setEditMachineId] = useState<number | null>(null);

  const [leadTimeConfigs, setLeadTimeConfigs] = useState<any[]>([]);
  const [addLeadTimeDialogOpen, setAddLeadTimeDialogOpen] = useState(false);
  const [newLeadTime, setNewLeadTime] = useState({ factoryName: '', processType: '', leadTimeDays: '' });
  const [editLeadTimeId, setEditLeadTimeId] = useState<number | null>(null);
  
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const meta = await tccService.getMetadata();
      setMetadata(meta);
      const machs = await tccService.getMachineTemplates();
      setMachines(machs);
      const ltConfigs = await tccService.getLeadTimeConfigs();
      setLeadTimeConfigs(ltConfigs);
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: t('tcc.settings.errLoad', 'Lỗi khi tải dữ liệu cài đặt'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = (category: string) => {
    setAddCategory(category);
    setNewValue('');
    setEditOldValue('');
    setAddDialogOpen(true);
  };

  const handleOpenEdit = (category: string, oldValue: string) => {
    setAddCategory(category);
    setNewValue(oldValue);
    setEditOldValue(oldValue);
    setAddDialogOpen(true);
  };

  const handleSaveMetadata = async () => {
    if (!newValue.trim()) return;
    setSaving(true);
    try {
      if (editOldValue) {
        await tccService.updateMetadata(addCategory, editOldValue, newValue.trim());
        setSnackbar({ open: true, message: t('tcc.settings.successUpdate', 'Đã cập nhật thành công'), severity: 'success' });
      } else {
        await tccService.addMetadata(addCategory, newValue.trim());
        setSnackbar({ open: true, message: t('tcc.settings.successAdd', 'Đã thêm thành công'), severity: 'success' });
      }
      setAddDialogOpen(false);
      fetchData();
    } catch (e) {
      setSnackbar({ open: true, message: t('tcc.settings.errSave', 'Lỗi khi lưu'), severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMetadata = (category: string, value: string) => {
    const categoryLabels: Record<string, string> = {
      customer: t('tcc.customer', 'Khách hàng'),
      factory: t('tcc.factory', 'Nhà máy'),
      sampleStage: t('tcc.sampleStage', 'Giai đoạn mẫu'),
      season: t('tcc.season', 'Season'),
      productType: t('tcc.productType', 'Loại sản phẩm')
    };
    const categoryLabel = categoryLabels[category] || category;
    setConfirmDialog({
      open: true,
      title: t('tcc.settings.deleteMetaTitle', 'Xác nhận xóa danh mục'),
      description: t('tcc.settings.deleteConfirmMeta', { defaultValue: `Bạn có chắc muốn xóa "${value}" khỏi ${categoryLabel}?`, value, category: categoryLabel }),
      onConfirm: async () => {
        try {
          await tccService.deleteMetadata(category, value);
          setSnackbar({ open: true, message: t('tcc.settings.successDelete', 'Đã xóa thành công'), severity: 'success' });
          fetchData();
        } catch (e) {
          setSnackbar({ open: true, message: t('tcc.settings.errDelete', 'Lỗi khi xóa'), severity: 'error' });
        }
      }
    });
  };

  const handleOpenAddMachine = () => {
    setEditMachineId(null);
    setNewMachine({ factory: '', machineType: '', machineDimension: '' });
    setAddMachineDialogOpen(true);
  };

  const handleOpenEditMachine = (mach: any) => {
    setEditMachineId(mach.id);
    setNewMachine({ factory: mach.factory, machineType: mach.machineType, machineDimension: mach.machineDimension });
    setAddMachineDialogOpen(true);
  };

  const handleSaveMachine = async () => {
    if (!newMachine.factory || !newMachine.machineType || !newMachine.machineDimension) return;
    setSaving(true);
    try {
      if (editMachineId) {
        await tccService.updateMachineTemplate(editMachineId, newMachine);
        setSnackbar({ open: true, message: t('tcc.settings.successUpdateMachine', 'Đã cập nhật máy may thành công'), severity: 'success' });
      } else {
        await tccService.addMachineTemplate(newMachine);
        setSnackbar({ open: true, message: t('tcc.settings.successAddMachine', 'Đã thêm máy may thành công'), severity: 'success' });
      }
      setAddMachineDialogOpen(false);
      fetchData();
    } catch (e) {
      setSnackbar({ open: true, message: t('tcc.settings.errSaveMachine', 'Lỗi khi lưu máy may'), severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMachine = (id: number, name: string) => {
    setConfirmDialog({
      open: true,
      title: t('tcc.settings.deleteMachineTitle', 'Xác nhận xóa máy may'),
      description: t('tcc.settings.deleteConfirmMachine', { defaultValue: `Bạn có chắc muốn xóa máy "${name}"?`, name }),
      onConfirm: async () => {
        try {
          await tccService.deleteMachineTemplate(id);
          setSnackbar({ open: true, message: t('tcc.settings.successDelete', 'Đã xóa thành công'), severity: 'success' });
          fetchData();
        } catch (e) {
          setSnackbar({ open: true, message: t('tcc.settings.errDelete', 'Lỗi khi xóa'), severity: 'error' });
        }
      }
    });
  };

  const handleOpenAddLeadTime = () => {
    setEditLeadTimeId(null);
    setNewLeadTime({ factoryName: '', processType: '', leadTimeDays: '' });
    setAddLeadTimeDialogOpen(true);
  };

  const handleOpenEditLeadTime = (lt: any) => {
    setEditLeadTimeId(lt.id);
    setNewLeadTime({ factoryName: lt.factoryName, processType: lt.processType, leadTimeDays: String(lt.leadTimeDays || '') });
    setAddLeadTimeDialogOpen(true);
  };

  const handleSaveLeadTime = async () => {
    if (!newLeadTime.factoryName || !newLeadTime.processType || !newLeadTime.leadTimeDays) return;
    setSaving(true);
    try {
      const payload = {
        ...newLeadTime,
        factoryCategory: '', // Omitted from UI per user request
        leadTimeDays: parseInt(newLeadTime.leadTimeDays, 10)
      };
      if (editLeadTimeId) {
        await tccService.updateLeadTimeConfig(editLeadTimeId, payload);
        setSnackbar({ open: true, message: t('tcc.settings.successUpdateLeadTime', 'Đã cập nhật thời gian thành công'), severity: 'success' });
      } else {
        await tccService.addLeadTimeConfig(payload);
        setSnackbar({ open: true, message: t('tcc.settings.successAddLeadTime', 'Đã thêm thời gian thành công'), severity: 'success' });
      }
      setAddLeadTimeDialogOpen(false);
      fetchData();
    } catch (e) {
      setSnackbar({ open: true, message: t('tcc.settings.errSaveLeadTime', 'Lỗi khi lưu thời gian'), severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLeadTime = (id: number, desc: string) => {
    setConfirmDialog({
      open: true,
      title: t('tcc.settings.deleteLeadTimeTitle', 'Xác nhận xóa cấu hình Lead Time'),
      description: t('tcc.settings.deleteConfirmLeadTime', { defaultValue: `Bạn có chắc muốn xóa thời gian của "${desc}"?`, desc }),
      onConfirm: async () => {
        try {
          await tccService.deleteLeadTimeConfig(id);
          setSnackbar({ open: true, message: t('tcc.settings.successDelete', 'Đã xóa thành công'), severity: 'success' });
          fetchData();
        } catch (e) {
          setSnackbar({ open: true, message: t('tcc.settings.errDelete', 'Lỗi khi xóa'), severity: 'error' });
        }
      }
    });
  };

  const renderMetadataList = (category: string, label: string) => {
    const items = metadata?.[category] || [];
    return (
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, color: '#334155' }}>
            {label}
          </Typography>
          <Button variant="contained" size="small" startIcon={<AddIcon />} sx={{ bgcolor: PRIMARY_COLOR, '&:hover': { bgcolor: '#1b5e20' } }}
            onClick={() => handleOpenAdd(category)}>
            {t('tcc.settings.btnAddNew', 'Thêm Mới')}
          </Button>
        </Box>
        <List sx={{ p: 0 }}>
          {items.map((item, idx) => (
            <React.Fragment key={idx}>
              <ListItem>
                <ListItemText primary={item} sx={{ '& .MuiListItemText-primary': { fontWeight: 500, color: '#475569' } }} />
                <ListItemSecondaryAction>
                  <IconButton edge="end" color="primary" onClick={() => handleOpenEdit(category, item)} sx={{ mr: 1 }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" color="error" onClick={() => handleDeleteMetadata(category, item)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              {idx < items.length - 1 && <Divider />}
            </React.Fragment>
          ))}
          {items.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center', color: '#94a3b8' }}>{t('tcc.settings.noData', 'Chưa có dữ liệu')}</Box>
          )}
        </List>
      </Paper>
    );
  };

  const renderMachineList = () => {
    return (
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, color: '#334155' }}>
            {t('tcc.settings.listMachine', 'Danh Sách Máy May')}
          </Typography>
          <Button variant="contained" size="small" startIcon={<AddIcon />} sx={{ bgcolor: PRIMARY_COLOR, '&:hover': { bgcolor: '#1b5e20' } }}
            onClick={handleOpenAddMachine}>
            {t('tcc.settings.btnAddNewMachine', 'Thêm Máy Mới')}
          </Button>
        </Box>
        <List sx={{ p: 0 }}>
          {machines.map((mach, idx) => (
            <React.Fragment key={mach.id}>
              <ListItem>
                <ListItemText 
                  primary={`${mach.machineType} - ${mach.machineDimension}`} 
                  secondary={`${t('tcc.settings.factory', 'Nhà máy')}: ${mach.factory}`}
                  sx={{ '& .MuiListItemText-primary': { fontWeight: 500, color: '#475569' } }} 
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" color="primary" onClick={() => handleOpenEditMachine(mach)} sx={{ mr: 1 }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" color="error" onClick={() => handleDeleteMachine(mach.id, mach.machineType)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              {idx < machines.length - 1 && <Divider />}
            </React.Fragment>
          ))}
          {machines.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center', color: '#94a3b8' }}>{t('tcc.settings.noData', 'Chưa có dữ liệu')}</Box>
          )}
        </List>
      </Paper>
    );
  };

  const renderLeadTimeList = () => {
    return (
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, color: '#334155' }}>
            {t('tcc.settings.listLeadTime', 'Cấu Hình Thời Gian Thực Hiện (Lead Time)')}
          </Typography>
          <Button variant="contained" size="small" startIcon={<AddIcon />} sx={{ bgcolor: PRIMARY_COLOR, '&:hover': { bgcolor: '#1b5e20' } }}
            onClick={handleOpenAddLeadTime}>
            {t('tcc.settings.btnAddNewLeadTime', 'Thêm Lead Time')}
          </Button>
        </Box>
        <List sx={{ p: 0 }}>
          {leadTimeConfigs.map((lt, idx) => {
            const processLabel = lt.processType === 'Light Process' 
              ? t('tcc.processLight', 'Quy trình nhẹ') 
              : lt.processType === 'Full Process' 
                ? t('tcc.processFull', 'Quy trình đầy đủ') 
                : lt.processType;
            return (
              <React.Fragment key={lt.id}>
                <ListItem>
                  <ListItemText 
                    primary={`${processLabel} - ${lt.leadTimeDays} ${t('tcc.settings.leadTimeDaysDisplay', 'ngày (days)')}`} 
                    secondary={`${t('tcc.settings.factory', 'Nhà máy')}: ${lt.factoryName}`}
                    sx={{ '& .MuiListItemText-primary': { fontWeight: 500, color: '#475569' } }} 
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" color="primary" onClick={() => handleOpenEditLeadTime(lt)} sx={{ mr: 1 }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton edge="end" color="error" onClick={() => handleDeleteLeadTime(lt.id, `${processLabel} - ${lt.factoryName}`)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {idx < leadTimeConfigs.length - 1 && <Divider />}
              </React.Fragment>
            );
          })}
          {leadTimeConfigs.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center', color: '#94a3b8' }}>{t('tcc.settings.noData', 'Chưa có dữ liệu')}</Box>
          )}
        </List>
      </Paper>
    );
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress sx={{ color: PRIMARY_COLOR }} /></Box>;
  }

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f1f5f9', p: { xs: 1, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b', mb: 2 }}>
        {t('tcc.settings.title', 'Thiết Lập Dữ Liệu (Settings)')}
      </Typography>
      
      <Paper elevation={2} sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fff' }}>
          <Tabs 
            value={tabIndex} 
            onChange={(_, v) => setTabIndex(v)} 
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{ '& .MuiTab-root': { fontWeight: 600 }, '& .Mui-selected': { color: `${PRIMARY_COLOR} !important` }, '& .MuiTabs-indicator': { backgroundColor: PRIMARY_COLOR } }}
          >
            <Tab label={t('tcc.settings.tabCustomer', 'Khách Hàng (Customer)')} />
            <Tab label={t('tcc.settings.tabFactory', 'Nhà Máy (Factory)')} />
            <Tab label={t('tcc.settings.tabSampleStage', 'Giai Đoạn Mẫu (Sample Stage)')} />
            <Tab label={t('tcc.settings.tabMachine', 'Loại Máy (Machine)')} />
            <Tab label={t('tcc.settings.tabLeadTime', 'Thời Gian (Lead Time)')} />
            <Tab label={t('tcc.settings.tabSeason', 'Season')} />
            <Tab label={t('tcc.settings.tabProductType', 'Loại Sản Phẩm (Product Type)')} />
            <Tab label={t('tcc.settings.tabEmailTemplate', 'Email Template')} />
          </Tabs>
        </Box>
        <CustomTabPanel value={tabIndex} index={0}>
          {renderMetadataList('customer', t('tcc.settings.listCustomer', 'Danh Sách Khách Hàng'))}
        </CustomTabPanel>
        <CustomTabPanel value={tabIndex} index={1}>
          {renderMetadataList('factory', t('tcc.settings.listFactory', 'Danh Sách Nhà Máy'))}
        </CustomTabPanel>
        <CustomTabPanel value={tabIndex} index={2}>
          {renderMetadataList('sampleStage', t('tcc.settings.listSampleStage', 'Danh Sách Giai Đoạn Mẫu'))}
        </CustomTabPanel>
        <CustomTabPanel value={tabIndex} index={3}>
          {renderMachineList()}
        </CustomTabPanel>
        <CustomTabPanel value={tabIndex} index={4}>
          {renderLeadTimeList()}
        </CustomTabPanel>
        <CustomTabPanel value={tabIndex} index={5}>
          {renderMetadataList('season', t('tcc.settings.listSeason', 'Danh Sách Season'))}
        </CustomTabPanel>
        <CustomTabPanel value={tabIndex} index={6}>
          {renderMetadataList('productType', t('tcc.settings.listProductType', 'Danh Sách Loại Sản Phẩm'))}
        </CustomTabPanel>
        <CustomTabPanel value={tabIndex} index={7}>
          <EmailTemplateConfig />
        </CustomTabPanel>
      </Paper>

      {/* Dialog Add/Edit Metadata */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{editOldValue ? t('tcc.settings.editValue', 'Chỉnh Sửa Giá Trị') : t('tcc.settings.newValue', 'Thêm Giá Trị Mới')}</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <TextField
            autoFocus fullWidth variant="outlined"
            label={t('tcc.settings.valueLabel', 'Giá trị (Tên)')}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            disabled={saving}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setAddDialogOpen(false)} sx={{ color: '#64748b' }}>{t('tcc.settings.cancel', 'Hủy')}</Button>
          <Button onClick={handleSaveMetadata} variant="contained" disabled={!newValue.trim() || saving} sx={{ bgcolor: PRIMARY_COLOR }}>
            {saving ? <CircularProgress size={24} /> : t('tcc.settings.save', 'Lưu')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Add/Edit Machine */}
      <Dialog open={addMachineDialogOpen} onClose={() => setAddMachineDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{editMachineId ? t('tcc.settings.editMachine', 'Chỉnh Sửa Máy May') : t('tcc.settings.newMachine', 'Thêm Máy May Mới')}</DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth variant="outlined" disabled={saving}>
            <InputLabel>{t('tcc.settings.factory', 'Nhà máy')}</InputLabel>
            <Select
              value={newMachine.factory}
              label={t('tcc.settings.factory', 'Nhà máy')}
              onChange={(e) => setNewMachine({ ...newMachine, factory: e.target.value })}
            >
              {(metadata?.['factory'] || []).map(f => (
                <MenuItem key={f} value={f}>{f}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth variant="outlined" label={t('tcc.settings.machineType', 'Loại máy (Machine Type)')}
            value={newMachine.machineType} onChange={(e) => setNewMachine({ ...newMachine, machineType: e.target.value })}
            disabled={saving}
          />
          <TextField
            fullWidth variant="outlined" label={t('tcc.settings.machineDimension', 'Kích thước (Dimension)')}
            value={newMachine.machineDimension} onChange={(e) => setNewMachine({ ...newMachine, machineDimension: e.target.value })}
            disabled={saving}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setAddMachineDialogOpen(false)} sx={{ color: '#64748b' }}>{t('tcc.settings.cancel', 'Hủy')}</Button>
          <Button onClick={handleSaveMachine} variant="contained" disabled={!newMachine.factory || !newMachine.machineType || !newMachine.machineDimension || saving} sx={{ bgcolor: PRIMARY_COLOR }}>
            {saving ? <CircularProgress size={24} /> : t('tcc.settings.save', 'Lưu')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Add/Edit Lead Time */}
      <Dialog open={addLeadTimeDialogOpen} onClose={() => setAddLeadTimeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{editLeadTimeId ? t('tcc.settings.editLeadTime', 'Chỉnh Sửa Cấu Hình Thời Gian') : t('tcc.settings.newLeadTime', 'Thêm Cấu Hình Thời Gian')}</DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth variant="outlined" disabled={saving}>
            <InputLabel>{t('tcc.settings.factoryName', 'Tên Nhà Máy (Factory Name)')}</InputLabel>
            <Select
              value={newLeadTime.factoryName}
              label={t('tcc.settings.factoryName', 'Tên Nhà Máy (Factory Name)')}
              onChange={(e) => setNewLeadTime({ ...newLeadTime, factoryName: e.target.value })}
            >
              {(metadata?.['factory'] || []).map(f => (
                <MenuItem key={f} value={f}>{f}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth variant="outlined" disabled={saving}>
            <InputLabel>{t('tcc.settings.processType', 'Loại Xử Lý (Process Type)')}</InputLabel>
            <Select
              value={newLeadTime.processType}
              label={t('tcc.settings.processType', 'Loại Xử Lý (Process Type)')}
              onChange={(e) => setNewLeadTime({ ...newLeadTime, processType: e.target.value })}
            >
              <MenuItem value="Light Process">{t('tcc.processLight', 'Light Process')}</MenuItem>
              <MenuItem value="Full Process">{t('tcc.processFull', 'Full Process')}</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth variant="outlined" label={t('tcc.settings.leadTimeDays', 'Thời gian thực hiện (Số ngày)')} type="number"
            value={newLeadTime.leadTimeDays} onChange={(e) => setNewLeadTime({ ...newLeadTime, leadTimeDays: e.target.value })}
            disabled={saving}
            inputProps={{ min: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setAddLeadTimeDialogOpen(false)} sx={{ color: '#64748b' }}>{t('tcc.settings.cancel', 'Hủy')}</Button>
          <Button onClick={handleSaveLeadTime} variant="contained" disabled={!newLeadTime.factoryName || !newLeadTime.processType || !newLeadTime.leadTimeDays || Number(newLeadTime.leadTimeDays) <= 0 || saving} sx={{ bgcolor: PRIMARY_COLOR }}>
            {saving ? <CircularProgress size={24} /> : t('tcc.settings.save', 'Lưu')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Custom Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarningIcon sx={{ color: '#d32f2f', fontSize: 28 }} />
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent sx={{ pb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.9rem', lineHeight: 1.6 }}>
            {confirmDialog.description}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))} sx={{ borderRadius: '8px', color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}>
            {t('tcc.settings.cancel', 'Hủy')}
          </Button>
          <Button variant="contained" color="error" onClick={async () => {
            setConfirmDialog(prev => ({ ...prev, open: false }));
            await confirmDialog.onConfirm();
          }} sx={{ borderRadius: '8px', fontWeight: 800, px: 3, bgcolor: '#d32f2f', textTransform: 'none', '&:hover': { bgcolor: '#c62828' } }}>
            {t('tcc.settings.confirmDelete', 'Xác nhận xóa')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} sx={{ width: '100%', fontWeight: 600 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
