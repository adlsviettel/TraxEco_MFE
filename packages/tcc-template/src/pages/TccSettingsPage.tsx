import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Button, List, ListItem, ListItemText,
  ListItemSecondaryAction, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, CircularProgress, Snackbar, Alert, Divider,
  FormControl, InputLabel, Select, MenuItem, Chip, OutlinedInput,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import WarningIcon from '@mui/icons-material/WarningRounded';
import { useTranslation } from 'react-i18next';
import { tccService, type SmvConfigRule, type OperationItem } from '../services/tccService';
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

  const [capacityConfigs, setCapacityConfigs] = useState<any[]>([]);
  const [addCapacityDialogOpen, setAddCapacityDialogOpen] = useState(false);
  const [newCapacity, setNewCapacity] = useState<{
    groupName: string;
    factories: string[];
    maxDailySmv: string;
  }>({ groupName: '', factories: [], maxDailySmv: '' });
  const [editCapacityId, setEditCapacityId] = useState<number | null>(null);

  const [smvConfigs, setSmvConfigs] = useState<SmvConfigRule[]>([]);
  const [operations, setOperations] = useState<OperationItem[]>([]);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL');
  const [opSearchKeyword, setOpSearchKeyword] = useState<string>('');
  const [addOpDialogOpen, setAddOpDialogOpen] = useState(false);
  const [editOpId, setEditOpId] = useState<string | null>(null);
  const [newOp, setNewOp] = useState<{ group: string; name: string; difficulty: 'Easy' | 'Medium' | 'Complex'; sam: string; stage: string }>({
    group: 'Polo',
    name: '',
    difficulty: 'Medium',
    sam: '',
    stage: ''
  });
  const [addGroupDialogOpen, setAddGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [addSmvDialogOpen, setAddSmvDialogOpen] = useState(false);
  const [editSmvId, setEditSmvId] = useState<number | string | null>(null);
  const [newSmvRule, setNewSmvRule] = useState({
    commonOperation: '',
    sampleStage: '',
    templateCategory: 'Easy',
    sam: ''
  });

  const [addFactoryToGroupOpen, setAddFactoryToGroupOpen] = useState(false);
  const [selectedGroupForFactory, setSelectedGroupForFactory] = useState<any | null>(null);
  const [factorySelectedForAdd, setFactorySelectedForAdd] = useState('');
  
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
      const capGroups = await tccService.getCapacityGroups();
      setCapacityConfigs(capGroups);
      const smvList = await tccService.getSmvConfigs();
      setSmvConfigs(smvList);
      const opList = await tccService.getOperationConfigs();
      setOperations(opList);
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

  const handleOpenAddCapacity = () => {
    setEditCapacityId(null);
    setNewCapacity({ groupName: '', factories: [], maxDailySmv: '' });
    setAddCapacityDialogOpen(true);
  };

  const handleOpenEditCapacity = (cap: any) => {
    setEditCapacityId(cap.id);
    const existingFactories = Array.isArray(cap.factories)
      ? cap.factories
      : (cap.factoryName ? [cap.factoryName] : []);
    setNewCapacity({
      groupName: cap.groupName || cap.factoryName || '',
      factories: existingFactories,
      maxDailySmv: String(cap.maxDailySmv ?? cap.maxDailyRequests ?? '')
    });
    setAddCapacityDialogOpen(true);
  };

  const handleSaveCapacity = async () => {
    if (!newCapacity.groupName.trim() || !newCapacity.maxDailySmv) return;
    setSaving(true);
    try {
      const parsedSmv = parseInt(newCapacity.maxDailySmv, 10);
      let updatedGroups: any[];
      if (editCapacityId) {
        updatedGroups = capacityConfigs.map(g => {
          if (g.id === editCapacityId || g.groupName === editCapacityId) {
            return {
              ...g,
              groupName: newCapacity.groupName,
              factories: g.factories || [],
              maxDailySmv: parsedSmv
            };
          }
          return g;
        });
      } else {
        const newGroup = {
          id: Date.now(),
          groupName: newCapacity.groupName,
          factories: [],
          maxDailySmv: parsedSmv
        };
        updatedGroups = [...capacityConfigs, newGroup];
      }
      await tccService.saveCapacityGroups(updatedGroups);
      setCapacityConfigs(updatedGroups);
      setSnackbar({ open: true, message: 'Tạo / Cập nhật Capacity Group thành công', severity: 'success' });
      setAddCapacityDialogOpen(false);
    } catch (e) {
      setSnackbar({ open: true, message: 'Lỗi khi lưu Capacity Group', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddFactoryToGroup = (groupObj: any) => {
    setSelectedGroupForFactory(groupObj);
    setFactorySelectedForAdd('');
    setAddFactoryToGroupOpen(true);
  };

  const handleSaveFactoryToGroup = async () => {
    if (!selectedGroupForFactory || !factorySelectedForAdd) return;
    setSaving(true);
    try {
      const targetId = selectedGroupForFactory.id || selectedGroupForFactory.groupName;
      const updatedGroups = capacityConfigs.map(g => {
        if ((g.id && g.id === targetId) || g.groupName === selectedGroupForFactory.groupName) {
          const currentFactories = Array.isArray(g.factories) ? g.factories : [];
          if (!currentFactories.includes(factorySelectedForAdd)) {
            return { ...g, factories: [...currentFactories, factorySelectedForAdd] };
          }
        }
        return g;
      });
      await tccService.saveCapacityGroups(updatedGroups);
      setCapacityConfigs(updatedGroups);
      setSnackbar({ open: true, message: `Đã thêm nhà máy ${factorySelectedForAdd} vào Group`, severity: 'success' });
      setAddFactoryToGroupOpen(false);
    } catch (e) {
      setSnackbar({ open: true, message: 'Lỗi khi thêm nhà máy vào Group', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFactoryFromGroup = async (groupObj: any, factoryToRemove: string) => {
    try {
      const targetId = groupObj.id || groupObj.groupName;
      const updatedGroups = capacityConfigs.map(g => {
        if ((g.id && g.id === targetId) || g.groupName === groupObj.groupName) {
          const currentFactories = Array.isArray(g.factories) ? g.factories : [];
          return { ...g, factories: currentFactories.filter((f: string) => f !== factoryToRemove) };
        }
        return g;
      });
      await tccService.saveCapacityGroups(updatedGroups);
      setCapacityConfigs(updatedGroups);
      setSnackbar({ open: true, message: `Đã xóa nhà máy ${factoryToRemove} khỏi Group`, severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: 'Lỗi khi xóa nhà máy', severity: 'error' });
    }
  };

  const handleDeleteCapacity = (id: any, groupNameStr: string) => {
    setConfirmDialog({
      open: true,
      title: 'Xác nhận xóa Group',
      description: `Bạn có chắc chắn muốn xóa Capacity Group "${groupNameStr}" không?`,
      onConfirm: async () => {
        try {
          const updatedGroups = capacityConfigs.filter(g => (g.id !== id && g.groupName !== groupNameStr));
          await tccService.saveCapacityGroups(updatedGroups);
          setCapacityConfigs(updatedGroups);
          setSnackbar({ open: true, message: 'Đã xóa Capacity Group thành công', severity: 'success' });
        } catch (e) {
          setSnackbar({ open: true, message: 'Lỗi khi xóa Capacity Group', severity: 'error' });
        }
      }
    });
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

  const handleOpenAddSmv = () => {
    setEditSmvId(null);
    setNewSmvRule({ commonOperation: '', sampleStage: '', templateCategory: 'Easy', sam: '' });
    setAddSmvDialogOpen(true);
  };

  const handleOpenEditSmv = (rule: SmvConfigRule) => {
    setEditSmvId(rule.id);
    setNewSmvRule({
      commonOperation: rule.commonOperation,
      sampleStage: rule.sampleStage,
      templateCategory: rule.templateCategory,
      sam: String(rule.sam)
    });
    setAddSmvDialogOpen(true);
  };

  const handleSaveSmv = async () => {
    if (!newSmvRule.commonOperation.trim() || !newSmvRule.sampleStage || !newSmvRule.sam) return;
    setSaving(true);
    try {
      const parsedSam = parseFloat(newSmvRule.sam);
      let updated: SmvConfigRule[];
      if (editSmvId !== null) {
        updated = smvConfigs.map(r => r.id === editSmvId ? {
          ...r,
          commonOperation: newSmvRule.commonOperation.trim(),
          sampleStage: newSmvRule.sampleStage,
          templateCategory: newSmvRule.templateCategory,
          sam: parsedSam
        } : r);
      } else {
        const newRule: SmvConfigRule = {
          id: Date.now(),
          commonOperation: newSmvRule.commonOperation.trim(),
          sampleStage: newSmvRule.sampleStage,
          templateCategory: newSmvRule.templateCategory,
          sam: parsedSam
        };
        updated = [...smvConfigs, newRule];
      }
      await tccService.saveSmvConfigs(updated);
      setSmvConfigs(updated);
      setSnackbar({ open: true, message: 'Đã lưu cấu hình SMV thành công', severity: 'success' });
      setAddSmvDialogOpen(false);
    } catch (e) {
      setSnackbar({ open: true, message: 'Lỗi khi lưu cấu hình SMV', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSmv = (id: number | string, opName: string) => {
    setConfirmDialog({
      open: true,
      title: 'Xác nhận xóa cấu hình SMV',
      description: `Bạn có chắc muốn xóa cấu hình SMV cho "${opName}"?`,
      onConfirm: async () => {
        try {
          const updated = smvConfigs.filter(r => r.id !== id);
          await tccService.saveSmvConfigs(updated);
          setSmvConfigs(updated);
          setSnackbar({ open: true, message: 'Đã xóa cấu hình SMV thành công', severity: 'success' });
        } catch (e) {
          setSnackbar({ open: true, message: 'Lỗi khi xóa cấu hình SMV', severity: 'error' });
        }
      }
    });
  };


  // Operation Config Handlers
  const handleOpenAddOp = () => {
    setEditOpId(null);
    const defaultGrp = selectedGroupFilter !== 'ALL' ? selectedGroupFilter : (groupsList[0] || 'Polo');
    setNewOp({ group: defaultGrp, name: '', difficulty: 'Medium', sam: '', stage: '' });
    setAddOpDialogOpen(true);
  };

  const handleOpenEditOp = (item: OperationItem) => {
    setEditOpId(item.id);
    setNewOp({
      group: item.group,
      name: item.name,
      difficulty: item.difficulty,
      sam: item.sam !== undefined && item.sam !== null ? String(item.sam) : '',
      stage: item.stage || ''
    });
    setAddOpDialogOpen(true);
  };

  const handleSaveOp = async () => {
    if (!newOp.name.trim()) return;
    const parsedSam = newOp.sam.trim() !== '' ? parseFloat(newOp.sam) : undefined;
    const trimmedStage = newOp.stage.trim() || undefined;
    let updated: OperationItem[];
    if (editOpId) {
      updated = operations.map(o => o.id === editOpId ? {
        ...o,
        group: newOp.group,
        name: newOp.name.trim(),
        difficulty: newOp.difficulty,
        sam: parsedSam,
        stage: trimmedStage
      } : o);
    } else {
      const newItem: OperationItem = {
        id: 'op_' + Date.now(),
        group: newOp.group,
        name: newOp.name.trim(),
        difficulty: newOp.difficulty,
        sam: parsedSam,
        stage: trimmedStage
      };
      updated = [newItem, ...operations];
    }
    await tccService.saveOperationConfigs(updated);
    setOperations(updated);
    setAddOpDialogOpen(false);
    setSnackbar({ open: true, message: editOpId ? 'Đã cập nhật công đoạn' : 'Đã thêm công đoạn mới', severity: 'success' });
  };

  const handleDeleteOp = (id: string, name: string) => {
    setConfirmDialog({
      open: true,
      title: 'Xác Nhận Xóa Công Đoạn',
      description: `Bạn có chắc muốn xóa công đoạn "${name}" không?`,
      onConfirm: async () => {
        const updated = operations.filter(o => o.id !== id);
        await tccService.saveOperationConfigs(updated);
        setOperations(updated);
        setSnackbar({ open: true, message: 'Đã xóa công đoạn', severity: 'success' });
      }
    });
  };

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    const grp = newGroupName.trim();
    setSelectedGroupFilter(grp);
    setAddGroupDialogOpen(false);
    setNewGroupName('');
    setSnackbar({ open: true, message: `Đã tạo nhóm "${grp}". Hãy thêm công đoạn mới cho nhóm này.`, severity: 'success' });
  };

  // Derive unique groups
  const groupsList = Array.from(new Set(operations.map(o => o.group))).filter(Boolean);

  const renderOperationConfig = () => {
    const filteredOps = operations.filter(op => {
      const matchesGroup = selectedGroupFilter === 'ALL' || op.group === selectedGroupFilter;
      const matchesSearch = !opSearchKeyword.trim() || op.name.toLowerCase().includes(opSearchKeyword.toLowerCase().trim());
      return matchesGroup && matchesSearch;
    });

    return (
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
        {/* Header Bar */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
              🧵 {t('tcc.settings.opConfigTitle', 'Cấu Hình Công Đoạn & Độ Khó')}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              {t('tcc.settings.opConfigSubtitle', 'Quản lý danh mục công đoạn may theo nhóm sản phẩm và thiết lập mức độ khó (Easy, Medium, Complex)')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setAddGroupDialogOpen(true)}>
              {t('tcc.settings.btnAddOpGroup', 'Thêm Nhóm Công Đoạn')}
            </Button>
            <Button variant="contained" size="small" startIcon={<AddIcon />} sx={{ bgcolor: PRIMARY_COLOR, '&:hover': { bgcolor: '#1b5e20' } }} onClick={handleOpenAddOp}>
              {t('tcc.settings.btnAddOp', 'Thêm Công Đoạn')}
            </Button>
          </Box>
        </Box>

        {/* Group Filter & Search Bar */}
        <Box sx={{ p: 2, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, justifyContent: 'space-between', alignItems: { md: 'center' } }}>
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: { xs: 1, md: 0 }, flexWrap: 'wrap' }}>
            <Chip
              label={t('tcc.settings.allCount', { defaultValue: `Tất cả (${operations.length})`, count: operations.length })}
              onClick={() => setSelectedGroupFilter('ALL')}
              color={selectedGroupFilter === 'ALL' ? 'primary' : 'default'}
              variant={selectedGroupFilter === 'ALL' ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600 }}
            />
            {groupsList.map(grp => {
              const count = operations.filter(o => o.group === grp).length;
              const isSelected = selectedGroupFilter === grp;
              return (
                <Chip
                  key={grp}
                  label={`${grp} (${count})`}
                  onClick={() => setSelectedGroupFilter(grp)}
                  color={isSelected ? 'primary' : 'default'}
                  variant={isSelected ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 600 }}
                />
              );
            })}
          </Box>
          <TextField
            size="small"
            placeholder={t('tcc.settings.searchOpPlaceholder', 'Tìm kiếm công đoạn...')}
            value={opSearchKeyword}
            onChange={(e) => setOpSearchKeyword(e.target.value)}
            sx={{ minWidth: 240 }}
          />
        </Box>

        {/* Data Table */}
        <TableContainer sx={{ maxHeight: 550 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                <TableCell sx={{ fontWeight: 700, width: 50 }}>{t('tcc.settings.seqNo', 'STT')}</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 140 }}>{t('tcc.settings.opGroup', 'Group Công Đoạn')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('tcc.settings.opName', 'Tên Công Đoạn')}</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 130, textAlign: 'center' }}>{t('tcc.settings.stage', 'Giai Đoạn')}</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 130, textAlign: 'center' }}>{t('tcc.settings.difficulty', 'Độ Khó')}</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120, textAlign: 'center' }}>{t('tcc.settings.samMinutes', 'SAM (Phút)')}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: 100 }}>{t('tcc.settings.actions', 'Thao Tác')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOps.map((op, idx) => (
                <TableRow key={op.id} hover>
                  <TableCell sx={{ color: '#64748b', fontSize: '0.85rem' }}>{idx + 1}</TableCell>
                  <TableCell>
                    <Chip label={op.group} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.75rem', borderColor: '#cbd5e1' }} />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>{op.name}</TableCell>
                  <TableCell align="center">
                    {op.stage ? (
                      <Chip
                        label={op.stage}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: '0.75rem', borderColor: '#94a3b8', color: '#334155', bgcolor: '#f8fafc' }}
                      />
                    ) : (
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={op.difficulty}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        minWidth: 80,
                        bgcolor: op.difficulty === 'Easy' ? '#dcfce7' : op.difficulty === 'Medium' ? '#fef9c3' : '#fee2e2',
                        color: op.difficulty === 'Easy' ? '#15803d' : op.difficulty === 'Medium' ? '#a16207' : '#b91c1c'
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {op.sam !== undefined && op.sam !== null && op.sam !== ('' as any) ? (
                      <Chip
                        label={`${op.sam} phút`}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700, color: '#0284c7', borderColor: '#bae6fd', bgcolor: '#f0f9ff' }}
                      />
                    ) : (
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="primary" onClick={() => handleOpenEditOp(op)} sx={{ mr: 0.5 }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteOp(op.id, op.name)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOps.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                    Không tìm thấy công đoạn nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };


  const renderSmvList = () => {
    return (
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
              ⚙️ Cấu Hình SMV (SMV Rule Configuration)
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Khi Requestor chọn Common Operation & Sample Stage, hệ thống sẽ tự động map ra Template Category và SAM tương ứng
            </Typography>
          </Box>
          <Button variant="contained" size="small" startIcon={<AddIcon />} sx={{ bgcolor: PRIMARY_COLOR, '&:hover': { bgcolor: '#1b5e20' } }}
            onClick={handleOpenAddSmv}>
            Thêm Cấu Hình SMV
          </Button>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                <TableCell colSpan={2} align="center" sx={{ fontWeight: 700, color: '#1e293b', borderRight: '2px solid #cbd5e1', bgcolor: '#e2e8f0' }}>
                  Requestor choose (Người yêu cầu chọn)
                </TableCell>
                <TableCell colSpan={2} align="center" sx={{ fontWeight: 700, color: '#15803d', borderRight: '2px solid #cbd5e1', bgcolor: '#e8f5e9' }}>
                  Automatic (Tự động tính toán)
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Actions</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600, color: '#334155' }}>Common operation</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#334155', borderRight: '2px solid #cbd5e1' }}>Sample Stage</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#15803d' }}>Template categories</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#15803d', borderRight: '2px solid #cbd5e1' }}>SAM (min)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, color: '#334155' }}>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {smvConfigs.map((rule) => (
                <TableRow key={rule.id} hover>
                  <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>{rule.commonOperation}</TableCell>
                  <TableCell sx={{ borderRight: '2px solid #e2e8f0' }}>
                    <Chip label={rule.sampleStage} size="small" variant="outlined" sx={{ fontWeight: 600, borderColor: '#94a3b8', color: '#334155' }} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={rule.templateCategory}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        bgcolor: rule.templateCategory === 'Easy' ? '#dcfce7' : rule.templateCategory === 'Medium' ? '#fef9c3' : '#fee2e2',
                        color: rule.templateCategory === 'Easy' ? '#15803d' : rule.templateCategory === 'Medium' ? '#a16207' : '#b91c1c'
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#2e7d32', borderRight: '2px solid #e2e8f0' }}>
                    {rule.sam} min
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="primary" onClick={() => handleOpenEditSmv(rule)} sx={{ mr: 0.5 }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteSmv(rule.id, rule.commonOperation)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {smvConfigs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                    Chưa có cấu hình SMV nào. Nhấn "+ Thêm Cấu Hình SMV" để tạo mới.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
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

  const renderCapacityList = () => {
    return (
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
              Capacity Groups (Cấu hình SMV theo Group)
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#64748b' }}>
              Tạo Group, cài đặt thời gian SMV tối đa (phút/ngày) và add các Factory vào Group
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            sx={{ bgcolor: PRIMARY_COLOR, '&:hover': { bgcolor: '#1b5e20' }, fontWeight: 600 }}
            onClick={handleOpenAddCapacity}
          >
            Tạo Group Mới
          </Button>
        </Box>
        <List sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {capacityConfigs.map((cap, idx) => {
            const groupName = cap.groupName || cap.factoryName || 'Group';
            const factoryList = Array.isArray(cap.factories)
              ? cap.factories
              : (cap.factoryName ? [cap.factoryName] : []);
            const smvVal = cap.maxDailySmv ?? cap.maxDailyRequests ?? 0;
            const displaySmv = Number(smvVal) === -1 ? 'Unlimited (-1)' : `${smvVal} phút/ngày`;

            return (
              <Paper key={cap.id || idx} elevation={0} sx={{ border: '1px solid #cbd5e1', borderRadius: 2, p: 2, bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>
                      📁 {groupName}
                    </Typography>
                    <Chip
                      label={`Capacity: ${displaySmv}`}
                      size="small"
                      color={Number(smvVal) === -1 ? 'default' : 'success'}
                      sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenAddFactoryToGroup(cap)}
                      sx={{ textTransform: 'none', fontWeight: 600, color: PRIMARY_COLOR, borderColor: PRIMARY_COLOR, py: 0.2 }}
                    >
                      Add Factory
                    </Button>
                    <IconButton size="small" color="primary" onClick={() => handleOpenEditCapacity(cap)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteCapacity(cap.id, groupName)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                    Danh Sách Factory Trong Group ({factoryList.length}):
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                    {factoryList.length > 0 ? (
                      factoryList.map((f: string) => (
                        <Chip
                          key={f}
                          label={f}
                          onDelete={() => handleRemoveFactoryFromGroup(cap, f)}
                          sx={{
                            bgcolor: '#f1f5f9',
                            color: '#1e293b',
                            fontWeight: 600,
                            border: '1px solid #cbd5e1',
                            '& .MuiChip-deleteIcon': { color: '#64748b', '&:hover': { color: '#ef4444' } }
                          }}
                        />
                      ))
                    ) : (
                      <Typography variant="body2" sx={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        Chưa có Factory nào. Nhấn "+ Add Factory" ở trên để thêm Factory vào Group này.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Paper>
            );
          })}
          {capacityConfigs.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center', color: '#94a3b8', bgcolor: '#fff', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>Chưa tạo Capacity Group nào</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>Nhấn button "Tạo Group Mới" ở góc phải để tạo Group và gán các Factory vào.</Typography>
            </Box>
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
            <Tab label={t('tcc.settings.tabCustomer', 'Khách Hàng')} />
            <Tab label={t('tcc.settings.tabFactory', 'Nhà Máy')} />
            <Tab label={t('tcc.settings.tabSampleStage', 'Giai Đoạn Mẫu')} />
            <Tab label={t('tcc.settings.tabMachine', 'Loại Máy')} />
            <Tab label={t('tcc.settings.tabLeadTime', 'Thời Gian Lead Time')} />
            <Tab label={t('tcc.settings.tabSeason', 'Season')} />
            <Tab label={t('tcc.settings.tabProductType', 'Loại Sản Phẩm')} />
            <Tab label={t('tcc.settings.tabCapacity', 'Capacity')} />
            <Tab label={t('tcc.settings.tabEmailTemplate', 'Email Template')} />
            <Tab label={t('tcc.settings.tabOperationConfig', 'Cấu Hình Công Đoạn')} />
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
          {renderCapacityList()}
        </CustomTabPanel>
        <CustomTabPanel value={tabIndex} index={8}>
          <EmailTemplateConfig />
        </CustomTabPanel>
        <CustomTabPanel value={tabIndex} index={9}>
          {renderOperationConfig()}
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

      {/* Dialog Add/Edit Capacity Group */}
      <Dialog open={addCapacityDialogOpen} onClose={() => setAddCapacityDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {editCapacityId ? 'Chỉnh Sửa Capacity Group' : 'Tạo Capacity Group Mới'}
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            fullWidth
            variant="outlined"
            label="Group Name (Tên Nhóm)"
            placeholder="Ví dụ: Group Sample Rooms, Group Factory Khối A"
            value={newCapacity.groupName}
            onChange={(e) => setNewCapacity({ ...newCapacity, groupName: e.target.value })}
            disabled={saving}
          />

          <TextField
            fullWidth
            variant="outlined"
            label="Max Daily SMV Capacity (Số phút SMV tối đa/ngày)"
            helperText="Nhập tổng số phút SMV tối đa cho cả Group trong 1 ngày (nhập -1 nếu Không Giới Hạn)"
            type="number"
            value={newCapacity.maxDailySmv}
            onChange={(e) => setNewCapacity({ ...newCapacity, maxDailySmv: e.target.value })}
            disabled={saving}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setAddCapacityDialogOpen(false)} sx={{ color: '#64748b' }}>Hủy</Button>
          <Button
            onClick={handleSaveCapacity}
            variant="contained"
            disabled={!newCapacity.groupName.trim() || !newCapacity.maxDailySmv || saving}
            sx={{ bgcolor: PRIMARY_COLOR, '&:hover': { bgcolor: '#1b5e20' } }}
          >
            {saving ? <CircularProgress size={24} /> : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Add Single Factory to Specific Group */}
      <Dialog open={addFactoryToGroupOpen} onClose={() => setAddFactoryToGroupOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Thêm Factory Vào Group: {selectedGroupForFactory?.groupName || selectedGroupForFactory?.factoryName}
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <FormControl fullWidth variant="outlined" disabled={saving}>
            <InputLabel id="add-factory-select-label">Chọn Factory</InputLabel>
            <Select
              labelId="add-factory-select-label"
              value={factorySelectedForAdd}
              label="Chọn Factory"
              onChange={(e) => setFactorySelectedForAdd(e.target.value)}
            >
              {(() => {
                const allAssignedFactories = new Set<string>();
                capacityConfigs.forEach(g => {
                  if (Array.isArray(g.factories)) {
                    g.factories.forEach((f: string) => allAssignedFactories.add(f));
                  }
                });

                const availableFactories = (metadata?.['factory'] || []).filter(f => !allAssignedFactories.has(f));

                if (availableFactories.length === 0) {
                  return <MenuItem disabled>Tất cả nhà máy đã thuộc về các Group khác</MenuItem>;
                }

                return availableFactories.map((f) => (
                  <MenuItem key={f} value={f}>{f}</MenuItem>
                ));
              })()}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setAddFactoryToGroupOpen(false)} sx={{ color: '#64748b' }}>Hủy</Button>
          <Button
            onClick={handleSaveFactoryToGroup}
            variant="contained"
            disabled={!factorySelectedForAdd || saving}
            sx={{ bgcolor: PRIMARY_COLOR, '&:hover': { bgcolor: '#1b5e20' } }}
          >
            {saving ? <CircularProgress size={24} /> : 'Thêm Vào Group'}
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

      
      {/* Dialog Add/Edit Operation */}
      <Dialog open={addOpDialogOpen} onClose={() => setAddOpDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editOpId ? 'Chỉnh Sửa Công Đoạn' : 'Thêm Công Đoạn Mới'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Group Công Đoạn</InputLabel>
              <Select
                value={newOp.group}
                label="Group Công Đoạn"
                onChange={(e) => setNewOp({ ...newOp, group: e.target.value })}
              >
                {groupsList.map(g => (
                  <MenuItem key={g} value={g}>{g}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Tên Công Đoạn (Operation Name)"
              fullWidth
              size="small"
              value={newOp.name}
              onChange={(e) => setNewOp({ ...newOp, name: e.target.value })}
              placeholder="Ví dụ: 1. Attach collar stand to collar / Cổ lá 3"
              multiline
              rows={2}
            />

            <FormControl fullWidth size="small">
              <InputLabel>Stage (Giai đoạn mẫu)</InputLabel>
              <Select
                value={newOp.stage}
                label="Stage (Giai đoạn mẫu)"
                onChange={(e) => setNewOp({ ...newOp, stage: e.target.value })}
              >
                <MenuItem value=""><em>-- Tất cả / Không chọn --</em></MenuItem>
                {(metadata?.['sampleStage'] || ['P1', 'P2', 'SMS', 'PP', 'PROTO', '01 -1st Proto', '02 -Salesman', '05 -Pre-Prod', '07 -Size Set', '19 -Production']).map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Độ Khó (Difficulty Level)</InputLabel>
              <Select
                value={newOp.difficulty}
                label="Độ Khó (Difficulty Level)"
                onChange={(e) => setNewOp({ ...newOp, difficulty: e.target.value as any })}
              >
                <MenuItem value="Easy">Easy (Dễ)</MenuItem>
                <MenuItem value="Medium">Medium (Trung Bình)</MenuItem>
                <MenuItem value="Complex">Complex (Phức Tạp)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Thời gian thực hiện / SAM (Phút)"
              type="number"
              fullWidth
              size="small"
              value={newOp.sam}
              onChange={(e) => setNewOp({ ...newOp, sam: e.target.value })}
              placeholder="Ví dụ: 1.5, 2.0..."
              inputProps={{ step: '0.1', min: '0' }}
              helperText="Standard Allowed Minutes (Thời gian chuẩn thực hiện công đoạn)"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddOpDialogOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleSaveOp} disabled={!newOp.name.trim()} sx={{ bgcolor: PRIMARY_COLOR }}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Add New Operation Group */}
      <Dialog open={addGroupDialogOpen} onClose={() => setAddGroupDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Thêm Nhóm Công Đoạn Mới</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Tên Nhóm Công Đoạn Mới"
              fullWidth
              size="small"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Ví dụ: Sportswear / Activewear"
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddGroupDialogOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleAddGroup} disabled={!newGroupName.trim()} sx={{ bgcolor: PRIMARY_COLOR }}>
            Thêm Nhóm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Add/Edit SMV Config */}
      <Dialog open={addSmvDialogOpen} onClose={() => setAddSmvDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {editSmvId !== null ? 'Chỉnh Sửa Cấu Hình SMV' : 'Thêm Cấu Hình SMV Mới'}
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', display: 'block', mb: 1.5 }}>
              1️⃣ Requestor choose (Người yêu cầu chọn)
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Common operation (Mô tả công đoạn chung)"
                placeholder="Ví dụ: Attach collar, Hemming..."
                value={newSmvRule.commonOperation}
                onChange={(e) => setNewSmvRule({ ...newSmvRule, commonOperation: e.target.value })}
                disabled={saving}
              />
              <FormControl fullWidth size="small" disabled={saving}>
                <InputLabel>Sample Stage (Giai đoạn mẫu)</InputLabel>
                <Select
                  value={newSmvRule.sampleStage}
                  label="Sample Stage (Giai đoạn mẫu)"
                  onChange={(e) => setNewSmvRule({ ...newSmvRule, sampleStage: e.target.value })}
                >
                  {(metadata?.['sampleStage'] || ['P1', 'P2', 'SMS', 'PP', 'PROTO']).map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Box sx={{ bgcolor: '#f0fdf4', p: 2, borderRadius: 2, border: '1px solid #bbf7d0' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#15803d', display: 'block', mb: 1.5 }}>
              2️⃣ Automatic (Tự động map kết quả)
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth size="small" disabled={saving}>
                <InputLabel>Template categories</InputLabel>
                <Select
                  value={newSmvRule.templateCategory}
                  label="Template categories"
                  onChange={(e) => setNewSmvRule({ ...newSmvRule, templateCategory: e.target.value })}
                >
                  <MenuItem value="Easy">Easy (Dễ)</MenuItem>
                  <MenuItem value="Medium">Medium (Vừa)</MenuItem>
                  <MenuItem value="Hard">Hard (Khó)</MenuItem>
                  <MenuItem value="Very Hard">Very Hard (Rất khó)</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                size="small"
                type="number"
                label="SAM (phút / min)"
                placeholder="Ví dụ: 30, 50..."
                value={newSmvRule.sam}
                onChange={(e) => setNewSmvRule({ ...newSmvRule, sam: e.target.value })}
                disabled={saving}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setAddSmvDialogOpen(false)} sx={{ color: '#64748b' }}>Hủy</Button>
          <Button
            onClick={handleSaveSmv}
            variant="contained"
            disabled={!newSmvRule.commonOperation.trim() || !newSmvRule.sampleStage || !newSmvRule.sam || saving}
            sx={{ bgcolor: PRIMARY_COLOR, '&:hover': { bgcolor: '#1b5e20' } }}
          >
            {saving ? <CircularProgress size={24} /> : 'Lưu Cấu Hình'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} sx={{ width: '100%', fontWeight: 600 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
