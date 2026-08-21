import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppButton, AppTextField, authService } from '@traxeco/shared';
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  Autocomplete,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Drawer,
  FormHelperText,
  Card,
  CardContent,
  CardHeader,
  Divider,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  useMediaQuery,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DatePicker } from '@mui/x-date-pickers';
import { useTranslation } from 'react-i18next';
import { tccService, type TccRequest, type CreateRequestPayload, type TccMachineTemplate, type TccLeadTimeConfig, type SmvConfigRule, type OperationItem } from '../services/tccService';
import { format, addDays, getDay } from 'date-fns';

const CUSTOMERS = ['Adidas', 'Puma', 'NB', 'Swannies', 'Bomber', 'Rhone'];
const SAMPLE_STAGES = ['01 -1st Proto', '02 -Salesman', '05 -Pre-Prod', '07 -Size Set', '09 -04th Proto', '09 -3rd Proto', '12 -Fitting', '13 -2nd Proto', '14 -Sealing', '15 -PLM', '18 -Garment Test', '19 -Production', '20 -GMM', '23 -Confirmation'];
const FACTORIES = ['SR Puma', 'SR Adidas', 'SR NB', 'A1A - F1', 'A1A - F2', 'A1A - F3', 'SR TL', 'TCC'];
const SEASONS = ['SP26', 'SU26', 'FA26', 'WI26', 'SP27', 'SU27', 'FA27', 'WI27'];
const PRODUCT_TYPES = ['Polo', 'T-Shirt', 'Jacket', 'Pants', 'Shorts', 'Dress', 'Skirts', 'Hoodie', 'Sweater'];

interface RequestFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (req?: any) => void;
  lastRequest?: TccRequest;
}

export default function RequestFormDialog({ open, onClose, onSuccess, lastRequest }: RequestFormDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [urgentConfirmOpen, setUrgentConfirmOpen] = useState(false);
  const [pendingShouldSave, setPendingShouldSave] = useState<boolean>(false);

  const [customers, setCustomers] = useState<string[]>(CUSTOMERS);
  const [sampleStages, setSampleStages] = useState<string[]>(SAMPLE_STAGES);
  const [factories, setFactories] = useState<string[]>(FACTORIES);
  const [seasons, setSeasons] = useState<string[]>(SEASONS);
  const [productTypes, setProductTypes] = useState<string[]>(PRODUCT_TYPES);
  
  const [machineTemplates, setMachineTemplates] = useState<TccMachineTemplate[]>([]);
  const [leadTimeConfigs, setLeadTimeConfigs] = useState<TccLeadTimeConfig[]>([]);
  const [minDeliveryDate, setMinDeliveryDate] = useState<Date | null>(null);
  const [availableMachineTypes, setAvailableMachineTypes] = useState<string[]>([]);
  const [availableMachineDimensions, setAvailableMachineDimensions] = useState<string[]>([]);

  const [smvConfigs, setSmvConfigs] = useState<SmvConfigRule[]>([]);
  const [matchedSmv, setMatchedSmv] = useState<SmvConfigRule | null>(null);

  const [operationConfigs, setOperationConfigs] = useState<OperationItem[]>([]);
  const [selectedOpGroup, setSelectedOpGroup] = useState<string>('');
  const [selectedOpName, setSelectedOpName] = useState<string>('');
  const [groupCapacityInfo, setGroupCapacityInfo] = useState<{
    groupName: string;
    factories: string[];
    maxDailySmv: number;
    usedSmv: number;
    availableSmv: number;
    requestedSmv: number;
  } | null>(null);

  const operationGroups = useMemo(() => {
    const groups = operationConfigs.map(o => o.group).filter(Boolean);
    return Array.from(new Set(groups));
  }, [operationConfigs]);

  const commonOperationOptions = useMemo(() => {
    const ops = smvConfigs.map(c => c.commonOperation).filter(Boolean);
    return Array.from(new Set(ops));
  }, [smvConfigs]);

  const initialFormState: CreateRequestPayload = {
    requesterName: '',
    customer: '',
    season: '',
    styleNumber: '',
    productType: '',
    sampleStage: '',
    factory: '',
    fabricDeliveryDate: null,
    fabricNoNeed: false,
    paperPatternDeliveryDate: null,
    paperPatternNoNeed: false,
    trimDeliveryDate: null,
    trimNoNeed: false,
    sampleSketchDeliveryDate: null,
    sampleSketchNoNeed: false,
    processType: 'Light Process',
    operationDescription: '',
    machineType: '',
    machineDimension: '',
    sizesRequired: '',
    isPriority: false,
    priorityReason: '',
    expectedDeliveryDate: null,
    lineQuantity: '',
    templateQty: null,
  };

  const [form, setForm] = useState<CreateRequestPayload>(initialFormState);

  const availableOperationNames = useMemo(() => {
    let ops = operationConfigs;
    if (selectedOpGroup) {
      ops = ops.filter(o => o.group === selectedOpGroup);
    }
    const names = ops.map(o => o.name);
    if (form.operationDescription && !names.includes(form.operationDescription)) {
      names.push(form.operationDescription);
    }
    return Array.from(new Set(names));
  }, [selectedOpGroup, operationConfigs, form.operationDescription]);

  const matchedOpItem = useMemo(() => {
    const opName = selectedOpName || form.operationDescription;
    if (!opName) return null;
    if (operationConfigs.length > 0) {
      const stage = form.sampleStage;
      const found = operationConfigs.find(o => 
        (o.name.toLowerCase() === opName.toLowerCase() || opName.toLowerCase().includes(o.name.toLowerCase()) || o.name.toLowerCase().includes(opName.toLowerCase())) && 
        (!stage || !o.stage || o.stage.toLowerCase() === stage.toLowerCase() || stage.toLowerCase().includes(o.stage.toLowerCase()) || o.stage.toLowerCase().includes(stage.toLowerCase()))
      ) || operationConfigs.find(o => 
        o.name.toLowerCase() === opName.toLowerCase() || opName.toLowerCase().includes(o.name.toLowerCase()) || o.name.toLowerCase().includes(opName.toLowerCase())
      );
      if (found) return found;
    }
    return {
      id: 'default',
      group: selectedOpGroup || 'Polo',
      name: opName,
      sam: 30,
      difficulty: 'Medium'
    } as OperationItem;
  }, [selectedOpName, selectedOpGroup, form.operationDescription, form.sampleStage, operationConfigs]);



  useEffect(() => {
    if (form.operationDescription && form.sampleStage && smvConfigs.length > 0) {
      const op = form.operationDescription.trim().toLowerCase();
      const matched = smvConfigs.find(r => 
        r.sampleStage === form.sampleStage && (
          op.includes(r.commonOperation.toLowerCase()) || 
          r.commonOperation.toLowerCase().includes(op)
        )
      );
      setMatchedSmv(matched || null);
    } else {
      setMatchedSmv(null);
    }
  }, [form.operationDescription, form.sampleStage, smvConfigs]);

  useEffect(() => {
    if (open) {
      setError(null);

      // Determine initial form prefill values
      let sourceForm: any = null;
      const stored = localStorage.getItem('tcc_last_submitted_request');
      if (stored) {
        try {
          sourceForm = JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse last submitted request from localStorage', e);
        }
      }

      const userInfo = authService.getUserInfo();
      const loggedInName = userInfo?.employeeName || userInfo?.employeeCode || 'Guest';

      const activeSource = lastRequest || sourceForm;

      if (activeSource) {
        setForm({
          ...initialFormState,
          requesterName: loggedInName,
          customer: activeSource.customer || '',
          season: activeSource.season || '',
          styleNumber: activeSource.styleNumber || '',
          productType: activeSource.productType || '',
          sampleStage: activeSource.sampleStage || '',
          factory: activeSource.factory || '',
          paperPatternDeliveryDate: activeSource.paperPatternDeliveryDate || null,
          trimDeliveryDate: activeSource.trimDeliveryDate || null,
          fabricDeliveryDate: activeSource.fabricDeliveryDate || null,
          sampleSketchDeliveryDate: activeSource.sampleSketchDeliveryDate || null,
          paperPatternNoNeed: activeSource.paperPatternNoNeed || false,
          trimNoNeed: activeSource.trimNoNeed || false,
          fabricNoNeed: activeSource.fabricNoNeed || false,
          sampleSketchNoNeed: activeSource.sampleSketchNoNeed || false,
          processType: activeSource.processType || 'Light Process',
          operationDescription: activeSource.operationDescription || '',
          machineType: activeSource.machineType || '',
          machineDimension: activeSource.machineDimension || '',
          sizesRequired: activeSource.sizesRequired || '',
          templateQty: activeSource.templateQty || 1,
          lineQuantity: activeSource.lineQuantity || '',
          expectedDeliveryDate: activeSource.expectedDeliveryDate || null,
          isPriority: activeSource.isPriority || false,
          priorityReason: activeSource.priorityReason || '',
        });
        if (activeSource.operationDescription) {
          setSelectedOpName(activeSource.operationDescription);
        }
      } else {
        setForm({
          ...initialFormState,
          requesterName: loggedInName,
        });
        setSelectedOpName('');
        setSelectedOpGroup('');
      }

      const loadMetadata = async () => {
        try {
          const data = await tccService.getMetadata();
          if (data.customer && data.customer.length > 0) {
            setCustomers(prev => Array.from(new Set([...prev, ...data.customer])));
          }
          if (data.sampleStage && data.sampleStage.length > 0) {
            setSampleStages(prev => Array.from(new Set([...prev, ...data.sampleStage])));
          }
          if (data.factory && data.factory.length > 0) {
            setFactories(prev => Array.from(new Set([...prev, ...data.factory])));
          }
          if (data.season && data.season.length > 0) {
            setSeasons(prev => Array.from(new Set([...prev, ...data.season])));
          }
          if (data.productType && data.productType.length > 0) {
            setProductTypes(prev => Array.from(new Set([...prev, ...data.productType])));
          }

          try {
            const configs = await tccService.getLeadTimeConfigs();
            setLeadTimeConfigs(configs);
          } catch (e) {
            console.error('Failed to load lead time configs', e);
          }
          try {
            const smvRules = await tccService.getSmvConfigs();
            setSmvConfigs(smvRules);
          } catch (e) {
            console.error('Failed to load SMV rules', e);
          }
          try {
            const opConfigs = await tccService.getOperationConfigs();
            if (Array.isArray(opConfigs)) {
              setOperationConfigs(opConfigs);
            }
          } catch (e) {
            console.error('Failed to load operation configs', e);
          }
          const templates = await tccService.getMachineTemplates();
          if (Array.isArray(templates)) {
            setMachineTemplates(templates);
          } else {
            console.error('API returned non-array for machine templates:', templates);
            setMachineTemplates([]);
          }
        } catch (err) {
          console.error('Failed to load metadata from backend', err);
        }
      };
      loadMetadata();
    } else {
      setForm(initialFormState);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lastRequest]);

  const handleChange = (field: keyof CreateRequestPayload, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const normalizeStr = (str: string) => str ? str.replace(/[\s-]/g, '').toLowerCase() : '';

  useEffect(() => {
    if (form.factory && machineTemplates.length > 0) {
      const normalizedSelected = normalizeStr(form.factory);
      const types = Array.from(new Set(machineTemplates.filter(tpl => normalizeStr(tpl.factory) === normalizedSelected).map(tpl => tpl.machineType)));
      setAvailableMachineTypes(types);
      if (form.machineType && !types.includes(form.machineType)) {
        setForm(prev => ({ ...prev, machineType: '', machineDimension: '' }));
      }
    } else if (!form.factory) {
      setAvailableMachineTypes([]);
      setForm(prev => ({ ...prev, machineType: '', machineDimension: '' }));
    }
  }, [form.factory, machineTemplates]);

  useEffect(() => {
    if (form.machineType && form.factory && machineTemplates.length > 0) {
      const normalizedSelected = normalizeStr(form.factory);
      const dims = Array.from(new Set(machineTemplates.filter(tpl => normalizeStr(tpl.factory) === normalizedSelected && tpl.machineType === form.machineType).map(tpl => tpl.machineDimension)));
      setAvailableMachineDimensions(dims);
      if (form.machineDimension && !dims.includes(form.machineDimension)) {
        setForm(prev => ({ ...prev, machineDimension: '' }));
      }
    } else if (!form.machineType || !form.factory) {
      setAvailableMachineDimensions([]);
      setForm(prev => ({ ...prev, machineDimension: '' }));
    }
  }, [form.machineType, form.factory, machineTemplates]);

  // Sync selectedOpGroup and selectedOpName when form.operationDescription or operationConfigs change
  useEffect(() => {
    if (form.operationDescription && operationConfigs.length > 0) {
      const found = operationConfigs.find(o => 
        o.name.toLowerCase() === form.operationDescription.toLowerCase()
      ) || operationConfigs.find(o =>
        o.name.toLowerCase().includes(form.operationDescription.toLowerCase()) ||
        form.operationDescription.toLowerCase().includes(o.name.toLowerCase())
      );
      if (found) {
        setSelectedOpGroup(found.group);
        setSelectedOpName(found.name);
      } else {
        const fallbackGroup = operationGroups[0] || 'Polo';
        setSelectedOpGroup(fallbackGroup);
        setSelectedOpName(form.operationDescription);
      }
    }
  }, [form.operationDescription, operationConfigs, operationGroups]);



  const addWorkingDays = (startDate: Date, days: number): Date => {
    if (days <= 0) return startDate;
    let currentDate = startDate;
    let addedDays = 0;
    while (addedDays < days) {
      currentDate = addDays(currentDate, 1);
      if (getDay(currentDate) !== 0) {
        addedDays++;
      }
    }
    return currentDate;
  };

  const prevFactoryRef = useRef(form.factory);
  const prevProcessTypeRef = useRef(form.processType);
  const lastOpenRef = useRef(open);

  useEffect(() => {
    const justOpened = open && !lastOpenRef.current;
    lastOpenRef.current = open;

    if (justOpened) {
      prevFactoryRef.current = form.factory;
      prevProcessTypeRef.current = form.processType;
    }

    if (!form.factory || !form.processType) {
      setMinDeliveryDate(null);
      return;
    }
    
    if (form.isPriority) {
      const today = new Date();
      setMinDeliveryDate(today);
      const factoryChanged = !justOpened && form.factory !== prevFactoryRef.current;
      const processTypeChanged = !justOpened && form.processType !== prevProcessTypeRef.current;
      if (!form.expectedDeliveryDate || factoryChanged || processTypeChanged) {
        setForm(prev => ({ ...prev, expectedDeliveryDate: today.toISOString() }));
      }
      prevFactoryRef.current = form.factory;
      prevProcessTypeRef.current = form.processType;
      return;
    }

    const config = leadTimeConfigs.find(c => c.factoryName === form.factory && c.processType === form.processType);
    
    let leadTime = 14; // Default to 14 days for Production factories
    
    if (config && config.leadTimeDays !== null) {
      leadTime = config.leadTimeDays;
    } else {
      const normalizedFactory = (form.factory || '').toLowerCase();
      if (normalizedFactory.includes('sample') || normalizedFactory.includes('phòng mẫu') || normalizedFactory.includes('phong mau') || normalizedFactory.includes('room')) {
        leadTime = form.processType === 'Light Process' ? 2 : 5;
      }
    }
    
    const calculatedDate = addWorkingDays(new Date(), leadTime);
    setMinDeliveryDate(calculatedDate);

    const factoryChanged = !justOpened && form.factory !== prevFactoryRef.current;
    const processTypeChanged = !justOpened && form.processType !== prevProcessTypeRef.current;

    if (!form.expectedDeliveryDate || factoryChanged || processTypeChanged) {
      setForm(prev => ({ ...prev, expectedDeliveryDate: calculatedDate.toISOString() }));
    }

    prevFactoryRef.current = form.factory;
    prevProcessTypeRef.current = form.processType;
  }, [form.factory, form.processType, form.isPriority, leadTimeConfigs, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const doCreateRequest = async (shouldSave: boolean, forceUrgent?: boolean) => {
    setSubmitting(true);
    setError(null);
    try {
      const isUrgent = forceUrgent || !!form.isPriority;
      const payload = {
        ...form,
        isPriority: isUrgent,
        priorityReason: isUrgent ? (form.priorityReason || 'Urgent - capacity full') : null,
        queueStatus: isUrgent ? 'Pending' : (form.queueStatus || null),
        status: isUrgent ? 'Pending' : (form.status || 'Not Started'),
        machineType: form.machineType || null,
        machineDimension: form.machineDimension || null,
        requesterName: authService.getUserInfo().employeeCode,
        expectedDeliveryDate: form.expectedDeliveryDate ? format(new Date(form.expectedDeliveryDate), 'yyyy-MM-dd') : null,
        fabricDeliveryDate: form.fabricDeliveryDate && !form.fabricNoNeed ? format(new Date(form.fabricDeliveryDate), 'yyyy-MM-dd') : null,
        fabricNoNeed: form.fabricNoNeed,
        paperPatternDeliveryDate: form.paperPatternDeliveryDate && !form.paperPatternNoNeed ? format(new Date(form.paperPatternDeliveryDate), 'yyyy-MM-dd') : null,
        paperPatternNoNeed: form.paperPatternNoNeed,
        trimDeliveryDate: form.trimDeliveryDate && !form.trimNoNeed ? format(new Date(form.trimDeliveryDate), 'yyyy-MM-dd') : null,
        trimNoNeed: form.trimNoNeed,
        sampleSketchDeliveryDate: form.sampleSketchDeliveryDate && !form.sampleSketchNoNeed ? format(new Date(form.sampleSketchDeliveryDate), 'yyyy-MM-dd') : null,
        sampleSketchNoNeed: form.sampleSketchNoNeed,
      };

      await tccService.createRequest(payload);

      try {
        if (shouldSave) {
          localStorage.setItem('tcc_last_submitted_request', JSON.stringify(form));
        } else {
          localStorage.removeItem('tcc_last_submitted_request');
        }
      } catch (err) {
        console.error('Failed to update request storage', err);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSubmit = async (shouldSave: boolean) => {
    setConfirmOpen(false);
    setPendingShouldSave(shouldSave);

    // Pre-check Capacity Group SAM before creating request
    if (form.factory && form.expectedDeliveryDate && !form.isPriority) {
      try {
        const dateStr = format(new Date(form.expectedDeliveryDate), 'yyyy-MM-dd');
        const groupCap = await tccService.getGroupCapacityUsage(form.factory, dateStr);

        const activeBaseSam = matchedOpItem?.sam !== undefined && matchedOpItem?.sam !== null 
          ? matchedOpItem.sam 
          : (matchedSmv?.sam ? Number(matchedSmv.sam) : 0);
        const activeTotalSam = activeBaseSam * Number(form.templateQty || 1);

        console.log('[Group Capacity Check]', { factory: form.factory, date: dateStr, groupCap, activeTotalSam });

        const max = groupCap.maxDailySmv;
        const available = groupCap.availableSmv;

        setGroupCapacityInfo({
          ...groupCap,
          requestedSmv: activeTotalSam
        });

        if (max > 0 && (available <= 0 || (activeTotalSam > 0 && available < activeTotalSam))) {
          // Capacity full → show urgent popup, do NOT create request yet
          setUrgentConfirmOpen(true);
          return;
        }
      } catch (err) {
        console.warn('Group Capacity check failed, proceeding with request:', err);
      }
    }

    // Capacity OK or no check needed → create request directly
    await doCreateRequest(shouldSave);
  };

  const handleUrgentConfirm = async () => {
    setUrgentConfirmOpen(false);
    await doCreateRequest(pendingShouldSave, true);
  };

  const handleUrgentCancel = () => {
    setUrgentConfirmOpen(false);
    setSubmitting(false);
  };

  const currentSam = (matchedOpItem?.sam !== undefined && matchedOpItem?.sam !== null && Number(matchedOpItem.sam) > 0)
    ? Number(matchedOpItem.sam) 
    : ((matchedSmv?.sam && Number(matchedSmv.sam) > 0) ? Number(matchedSmv.sam) : 30);
  const isMissingSam = false;

  const isFormValid = !!(
    form.customer &&
    form.season &&
    form.styleNumber &&
    form.productType &&
    form.sampleStage &&
    form.factory &&
    form.processType &&
    form.operationDescription &&
    form.machineType &&
    form.sizesRequired &&
    form.templateQty !== null && form.templateQty !== undefined && form.templateQty !== '' &&
    form.lineQuantity &&
    form.expectedDeliveryDate &&
    (!form.isPriority || form.priorityReason)
  );

  return (
    <Drawer 
      open={open} 
      onClose={onClose} 
      anchor="right"
      sx={{ zIndex: (theme) => theme.zIndex.modal }}
      PaperProps={{ 
        sx: { 
          width: { xs: '100vw', sm: '100vw', md: '85vw', lg: '75vw', xl: '1200px' }, 
          maxWidth: '100vw', 
          display: 'flex', 
          flexDirection: 'column',
          bgcolor: 'background.default' 
        } 
      }}
    >
      <Box sx={{ p: 3, pb: 2, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
            {t('tcc.formTitle')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {t('tcc.standardLt')}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" p={4} flex={1}>
          <CircularProgress />
        </Box>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <Box sx={{ flex: 1, overflowY: 'auto', p: isMobile ? 2 : 3 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Grid container spacing={isMobile ? 2 : 3}>
              {/* CARD 1: GENERAL INFO */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, height: '100%' }}>
                  <CardHeader 
                    title={t('tcc.groupGeneral')} 
                    titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700, color: '#334155', sx: { lineHeight: 1.2 } }} 
                    sx={{ bgcolor: 'background.paper', py: isMobile ? 1.5 : 2, px: isMobile ? 2 : 3 }} 
                  />
                  <Divider />
                  <CardContent sx={{ pt: isMobile ? 2 : 3, px: isMobile ? 2 : 3, pb: isMobile ? 2 : 3 }}>
                    <Grid container spacing={isMobile ? 2 : 2.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <AppTextField
                          label={t('tcc.requesterName')}
                          fullWidth
                          disabled
                          value={authService.getUserInfo().employeeCode + " - " + authService.getUserInfo().employeeName}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth required size="small">
                          <InputLabel sx={{ fontSize: 13, '& .MuiFormLabel-asterisk': { color: '#dc2626' } }}>{t('tcc.customer')}</InputLabel>
                          <Select
                            value={form.customer}
                            label={t('tcc.customer')}
                            onChange={(e) => handleChange('customer', e.target.value)}
                            sx={{
                              borderRadius: '8px', 
                              height: 40, 
                              fontSize: 13, 
                              bgcolor: 'background.paper', 
                              '& fieldset': { borderColor: '#bfc9c4' }, 
                              '&:hover fieldset': { borderColor: '#2e7d32' }, 
                              '&.Mui-focused fieldset': { borderColor: '#2e7d32' } 
                            }}
                          >
                            {customers.map((c) => (
                              <MenuItem key={c} value={c}>{c}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Autocomplete
                          freeSolo
                          clearOnBlur={false}
                          selectOnFocus
                          handleHomeEndKeys
                          options={seasons}
                          value={form.season}
                          onChange={(_, newValue) => handleChange('season', typeof newValue === 'string' ? newValue : (newValue || ''))}
                          onInputChange={(_, newInputValue) => handleChange('season', newInputValue || '')}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={t('tcc.season')}
                              fullWidth
                              required
                              size="small"
                              sx={{
                                '& .MuiOutlinedInput-root': { 
                                  borderRadius: '8px', 
                                  height: 40,
                                  fontSize: 13, 
                                  bgcolor: 'background.paper', 
                                  '& fieldset': { borderColor: '#bfc9c4' }, 
                                  '&:hover fieldset': { borderColor: '#2e7d32' }, 
                                  '&.Mui-focused fieldset': { borderColor: '#2e7d32' } 
                                },
                                '& .MuiFormLabel-asterisk': {
                                  color: '#dc2626',
                                }
                              }}
                            />
                          )}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <AppTextField
                          label={t('tcc.styleNumber')}
                          fullWidth
                          required
                          value={form.styleNumber}
                          autoComplete="off"
                          inputProps={{ autoComplete: 'off' }}
                          onChange={(e) => handleChange('styleNumber', e.target.value)}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Autocomplete
                          freeSolo
                          clearOnBlur={false}
                          selectOnFocus
                          handleHomeEndKeys
                          options={productTypes}
                          value={form.productType}
                          onChange={(_, newValue) => handleChange('productType', typeof newValue === 'string' ? newValue : (newValue || ''))}
                          onInputChange={(_, newInputValue) => handleChange('productType', newInputValue || '')}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={t('tcc.productType')}
                              fullWidth
                              required
                              size="small"
                              sx={{
                                '& .MuiOutlinedInput-root': { 
                                  borderRadius: '8px', 
                                  height: 40,
                                  fontSize: 13, 
                                  bgcolor: 'background.paper', 
                                  '& fieldset': { borderColor: '#bfc9c4' }, 
                                  '&:hover fieldset': { borderColor: '#2e7d32' }, 
                                  '&.Mui-focused fieldset': { borderColor: '#2e7d32' } 
                                },
                                '& .MuiFormLabel-asterisk': {
                                  color: '#dc2626',
                                }
                              }}
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* CARD 2: PRODUCTION DETAILS */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, height: '100%' }}>
                  <CardHeader 
                    title={t('tcc.groupProduction')} 
                    titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700, color: '#334155', sx: { lineHeight: 1.2 } }} 
                    sx={{ bgcolor: 'background.paper', py: isMobile ? 1.5 : 2, px: isMobile ? 2 : 3 }} 
                  />
                  <Divider />
                  <CardContent sx={{ pt: isMobile ? 2 : 3, px: isMobile ? 2 : 3, pb: isMobile ? 2 : 3 }}>
                    <Grid container spacing={isMobile ? 2 : 2.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth required size="small">
                          <InputLabel sx={{ fontSize: 13, '& .MuiFormLabel-asterisk': { color: '#dc2626' } }}>{t('tcc.sampleStage')}</InputLabel>
                          <Select
                            value={form.sampleStage}
                            label={t('tcc.sampleStage')}
                            onChange={(e) => handleChange('sampleStage', e.target.value)}
                            sx={{
                              borderRadius: '8px', 
                              height: 40, 
                              fontSize: 13, 
                              bgcolor: 'background.paper', 
                              '& fieldset': { borderColor: '#bfc9c4' }, 
                              '&:hover fieldset': { borderColor: '#2e7d32' }, 
                              '&.Mui-focused fieldset': { borderColor: '#2e7d32' } 
                            }}
                          >
                            {sampleStages.map((s) => (
                              <MenuItem key={s} value={s}>{s}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth required size="small">
                          <InputLabel sx={{ fontSize: 13, '& .MuiFormLabel-asterisk': { color: '#dc2626' } }}>{t('tcc.factory')}</InputLabel>
                          <Select
                            value={form.factory}
                            label={t('tcc.factory')}
                            onChange={(e) => handleChange('factory', e.target.value)}
                            sx={{
                              borderRadius: '8px', 
                              height: 40, 
                              fontSize: 13, 
                              bgcolor: 'background.paper', 
                              '& fieldset': { borderColor: '#bfc9c4' }, 
                              '&:hover fieldset': { borderColor: '#2e7d32' }, 
                              '&.Mui-focused fieldset': { borderColor: '#2e7d32' } 
                            }}
                          >
                            {factories.map((f) => (
                              <MenuItem key={f} value={f}>{f}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Checkbox 
                            size="small"
                            checked={!form.paperPatternNoNeed}
                            onChange={(e) => {
                              const isNoNeed = !e.target.checked;
                              handleChange('paperPatternNoNeed', isNoNeed);
                              if (isNoNeed) handleChange('paperPatternDeliveryDate', null);
                            }}
                            sx={{ p: 0, '&.Mui-checked': { color: '#2e7d32' } }}
                          />
                          <DatePicker 
                            label="Paper Pattern"
                            format="dd/MM/yyyy"
                            value={form.paperPatternDeliveryDate ? new Date(form.paperPatternDeliveryDate) : null}
                            onChange={(val: Date | null) => handleChange('paperPatternDeliveryDate', val)}
                            disabled={!!form.paperPatternNoNeed}
                            slotProps={{ 
                              textField: { 
                                size: 'small',
                                fullWidth: true,
                                sx: {
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: '8px',
                                    height: 40,
                                    bgcolor: 'background.paper',
                                    '& fieldset': { borderColor: '#bfc9c4' },
                                    '&:hover fieldset': { borderColor: '#2e7d32' },
                                    '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
                                  }
                                }
                              } as any
                            }}
                          />
                        </Box>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Checkbox 
                            size="small"
                            checked={!form.trimNoNeed}
                            onChange={(e) => {
                              const isNoNeed = !e.target.checked;
                              handleChange('trimNoNeed', isNoNeed);
                              if (isNoNeed) handleChange('trimDeliveryDate', null);
                            }}
                            sx={{ p: 0, '&.Mui-checked': { color: '#2e7d32' } }}
                          />
                          <DatePicker 
                            label="Trim Delivery"
                            format="dd/MM/yyyy"
                            value={form.trimDeliveryDate ? new Date(form.trimDeliveryDate) : null}
                            onChange={(val: Date | null) => handleChange('trimDeliveryDate', val)}
                            disabled={!!form.trimNoNeed}
                            slotProps={{ 
                              textField: { 
                                size: 'small',
                                fullWidth: true,
                                sx: {
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: '8px',
                                    height: 40,
                                    bgcolor: 'background.paper',
                                    '& fieldset': { borderColor: '#bfc9c4' },
                                    '&:hover fieldset': { borderColor: '#2e7d32' },
                                    '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
                                  }
                                }
                              } as any
                            }}
                          />
                        </Box>
                      </Grid>

                      {form.processType === 'Full Process' && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Checkbox 
                              size="small"
                              checked={!form.fabricNoNeed}
                              onChange={(e) => {
                                const isNoNeed = !e.target.checked;
                                handleChange('fabricNoNeed', isNoNeed);
                                if (isNoNeed) handleChange('fabricDeliveryDate', null);
                              }}
                              sx={{ p: 0, '&.Mui-checked': { color: '#2e7d32' } }}
                            />
                            <DatePicker 
                              label="Fabric Delivery"
                              format="dd/MM/yyyy"
                              value={form.fabricDeliveryDate ? new Date(form.fabricDeliveryDate) : null}
                              onChange={(val: Date | null) => handleChange('fabricDeliveryDate', val)}
                              disabled={!!form.fabricNoNeed}
                              slotProps={{ 
                                textField: { 
                                  size: 'small',
                                  fullWidth: true,
                                  sx: {
                                    '& .MuiOutlinedInput-root': {
                                      borderRadius: '8px',
                                      height: 40,
                                      bgcolor: 'background.paper',
                                      '& fieldset': { borderColor: '#bfc9c4' },
                                      '&:hover fieldset': { borderColor: '#2e7d32' },
                                      '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
                                    }
                                  }
                                } as any
                              }}
                            />
                          </Box>
                        </Grid>
                      )}

                      {form.processType === 'Full Process' && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Checkbox 
                              size="small"
                              checked={!form.sampleSketchNoNeed}
                              onChange={(e) => {
                                const isNoNeed = !e.target.checked;
                                handleChange('sampleSketchNoNeed', isNoNeed);
                                if (isNoNeed) handleChange('sampleSketchDeliveryDate', null);
                              }}
                              sx={{ p: 0, '&.Mui-checked': { color: '#2e7d32' } }}
                            />
                            <DatePicker 
                              label="Sample/Sketch"
                              format="dd/MM/yyyy"
                              value={form.sampleSketchDeliveryDate ? new Date(form.sampleSketchDeliveryDate) : null}
                              onChange={(val: Date | null) => handleChange('sampleSketchDeliveryDate', val)}
                              disabled={!!form.sampleSketchNoNeed}
                              slotProps={{ 
                                textField: { 
                                  size: 'small',
                                  fullWidth: true,
                                  sx: {
                                    '& .MuiOutlinedInput-root': {
                                      borderRadius: '8px',
                                      height: 40,
                                      bgcolor: 'background.paper',
                                      '& fieldset': { borderColor: '#bfc9c4' },
                                      '&:hover fieldset': { borderColor: '#2e7d32' },
                                      '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
                                    }
                                  }
                                } as any
                              }}
                            />
                          </Box>
                        </Grid>
                      )}

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth required size="small">
                          <InputLabel sx={{ fontSize: 13, '& .MuiFormLabel-asterisk': { color: '#dc2626' } }}>{t('tcc.processType')}</InputLabel>
                          <Select
                            value={form.processType}
                            label={t('tcc.processType')}
                            onChange={(e) => handleChange('processType', e.target.value)}
                            sx={{
                              borderRadius: '8px', 
                              height: 40, 
                              fontSize: 13, 
                              bgcolor: 'background.paper', 
                              '& fieldset': { borderColor: '#bfc9c4' }, 
                              '&:hover fieldset': { borderColor: '#2e7d32' }, 
                              '&.Mui-focused fieldset': { borderColor: '#2e7d32' } 
                            }}
                          >
                            <MenuItem value="Light Process">{t('tcc.processLight')}</MenuItem>
                            <MenuItem value="Full Process">{t('tcc.processFull')}</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* CARD 3: TECHNICAL SPECS */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, height: '100%' }}>
                  <CardHeader 
                    title={t('tcc.groupTechnical')} 
                    titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700, color: '#334155', sx: { lineHeight: 1.2 } }} 
                    sx={{ bgcolor: 'background.paper', py: isMobile ? 1.5 : 2, px: isMobile ? 2 : 3 }} 
                  />
                  <Divider />
                  <CardContent sx={{ pt: isMobile ? 2 : 3, px: isMobile ? 2 : 3, pb: isMobile ? 2 : 3 }}>
                    <Grid container spacing={isMobile ? 2 : 2.5}>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label={t('tcc.operationDescription', 'Tên Công Đoạn / Mô Tả Công Đoạn')}
                          value={form.operationDescription}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleChange('operationDescription', val);
                            setSelectedOpName(val);
                          }}
                          fullWidth
                          required
                          size="small"
                          placeholder={t('tcc.operationDescriptionPlaceholder', 'Nhập tên công đoạn hoặc mô tả công đoạn...')}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '8px',
                              bgcolor: 'background.paper',
                              '& fieldset': { borderColor: '#bfc9c4' },
                              '&:hover fieldset': { borderColor: '#2e7d32' },
                              '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
                            }
                          }}
                        />
                      </Grid>



                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth required size="small" disabled={!form.factory}>
                          <InputLabel sx={{ fontSize: 13, '& .MuiFormLabel-asterisk': { color: '#dc2626' } }}>{t('tcc.machineType')}</InputLabel>
                          <Select
                            value={form.machineType}
                            label={t('tcc.machineType')}
                            onChange={(e) => handleChange('machineType', e.target.value)}
                            sx={{
                              borderRadius: '8px', 
                              height: 40, 
                              fontSize: 13, 
                              bgcolor: 'background.paper', 
                              '& fieldset': { borderColor: '#bfc9c4' }, 
                              '&:hover fieldset': { borderColor: '#2e7d32' }, 
                              '&.Mui-focused fieldset': { borderColor: '#2e7d32' } 
                            }}
                          >
                            {availableMachineTypes.map((mt) => (
                              <MenuItem key={mt} value={mt}>{mt}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth size="small" disabled={!form.machineType}>
                          <InputLabel sx={{ fontSize: 13, '& .MuiFormLabel-asterisk': { color: '#dc2626' } }}>{t('tcc.machineDimension')}</InputLabel>
                          <Select
                            value={form.machineDimension}
                            label={t('tcc.machineDimension')}
                            onChange={(e) => handleChange('machineDimension', e.target.value)}
                            sx={{
                              borderRadius: '8px', 
                              height: 40, 
                              fontSize: 13, 
                              bgcolor: 'background.paper', 
                              '& fieldset': { borderColor: '#bfc9c4' }, 
                              '&:hover fieldset': { borderColor: '#2e7d32' }, 
                              '&.Mui-focused fieldset': { borderColor: '#2e7d32' } 
                            }}
                          >
                            {availableMachineDimensions.map((md) => (
                              <MenuItem key={md} value={md}>{md}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 4 }}>
                        <AppTextField
                          label={t('tcc.sizesRequired', 'Sample size')}
                          fullWidth
                          required
                          value={form.sizesRequired}
                          onChange={(e) => handleChange('sizesRequired', e.target.value)}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 4 }}>
                        <AppTextField
                          label={t('tcc.templateQty', 'Quantity of Template')}
                          fullWidth
                          required
                          type="number"
                          value={form.templateQty ?? ''}
                          onChange={(e) => handleChange('templateQty', e.target.value ? Number(e.target.value) : null)}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 4 }}>
                        <AppTextField
                          label={t('tcc.lineQuantity', 'Quantity of Sewing Line')}
                          fullWidth
                          required
                          value={form.lineQuantity}
                          onChange={(e) => handleChange('lineQuantity', e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* CARD 4: SCHEDULE & PRIORITY */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, height: '100%' }}>
                  <CardHeader 
                    title={t('tcc.groupSchedule')} 
                    titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700, color: '#334155', sx: { lineHeight: 1.2 } }} 
                    sx={{ bgcolor: 'background.paper', py: isMobile ? 1.5 : 2, px: isMobile ? 2 : 3 }} 
                  />
                  <Divider />
                  <CardContent sx={{ pt: isMobile ? 2 : 3, px: isMobile ? 2 : 3, pb: isMobile ? 2 : 3 }}>
                    <Grid container spacing={isMobile ? 2 : 2.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <DatePicker format="dd/MM/yyyy"
                          label={t('tcc.expectedDeliveryDate')}
                          value={form.expectedDeliveryDate ? new Date(form.expectedDeliveryDate) : null}
                          onChange={(val: Date | null) => handleChange('expectedDeliveryDate', val)}
                          minDate={minDeliveryDate || undefined}
                          slotProps={{ 
                            textField: { 
                              required: true,
                              fullWidth: true,
                              size: 'small',
                              sx: {
                                '& .MuiOutlinedInput-root': { 
                                  borderRadius: '8px', 
                                  height: 40, 
                                  fontSize: 13, 
                                  bgcolor: 'background.paper', 
                                  '& fieldset': { borderColor: '#bfc9c4' }, 
                                  '&:hover fieldset': { borderColor: '#2e7d32' }, 
                                  '&.Mui-focused fieldset': { borderColor: '#2e7d32' } 
                                },
                                '& .MuiInputLabel-root': {
                                  fontSize: 13,
                                },
                                '& .MuiFormLabel-asterisk': {
                                  color: '#dc2626',
                                }
                              }
                            } 
                          }}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel sx={{ fontSize: 13, '& .MuiFormLabel-asterisk': { color: '#dc2626' } }}>{t('tcc.isPriority')}</InputLabel>
                          <Select
                            value={form.isPriority ? 'Yes' : 'No'}
                            label={t('tcc.isPriority')}
                            onChange={(e) => handleChange('isPriority', e.target.value === 'Yes')}
                            sx={{
                              borderRadius: '8px', 
                              height: 40, 
                              fontSize: 13, 
                              bgcolor: 'background.paper', 
                              '& fieldset': { borderColor: '#bfc9c4' }, 
                              '&:hover fieldset': { borderColor: '#2e7d32' }, 
                              '&.Mui-focused fieldset': { borderColor: '#2e7d32' } 
                            }}
                          >
                            <MenuItem value="Yes">{t('tcc.yes')}</MenuItem>
                            <MenuItem value="No">{t('tcc.no')}</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      {form.isPriority && (
                        <Grid size={{ xs: 12, sm: 12 }}>
                          <AppTextField
                            label={t('tcc.priorityReason')}
                            fullWidth
                            required={form.isPriority}
                            value={form.priorityReason}
                            onChange={(e) => handleChange('priorityReason', e.target.value)}
                          />
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
          <Box sx={{ p: 2, px: 3, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <AppButton onClick={onClose} disabled={submitting} variant="outlined" customVariant="secondary">
              {t('tcc.cancel')}
            </AppButton>
            <AppButton
              type="submit"
              variant="contained"
              customVariant="primary"
              disabled={submitting || !isFormValid}
              sx={{ minWidth: 100 }}
            >
              {submitting ? <CircularProgress size={24} color="inherit" /> : t('tcc.submit')}
            </AppButton>
          </Box>
        </form>
      )}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>
          {t('tcc.confirmSubmitTitle', 'Xác nhận gửi yêu cầu')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t('tcc.confirmSubmitDesc', 'Bạn có muốn lưu các thông tin này làm mẫu (template) để tự động điền cho lần yêu cầu tiếp theo không?')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => handleConfirmSubmit(true)}
            sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2 }}
          >
            {t('tcc.submitAndSave', 'Gửi & Lưu làm mẫu nhập')}
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => handleConfirmSubmit(false)}
            sx={{ 
              fontWeight: 'bold', 
              textTransform: 'none', 
              borderRadius: 2,
              border: '1px solid', borderColor: 'divider',
              color: '#334155',
              '&:hover': {
                border: '1px solid #94a3b8',
                bgcolor: 'background.default'
              }
            }}
          >
            {t('tcc.submitOnly', 'Chỉ gửi yêu cầu (Không lưu)')}
          </Button>
          <Button
            variant="text"
            color="inherit"
            fullWidth
            onClick={() => setConfirmOpen(false)}
            sx={{ fontWeight: 'bold', textTransform: 'none', opacity: 0.8 }}
          >
            {t('common.cancel', 'Hủy')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Urgent Confirm Dialog - shown when capacity is full */}
      <Dialog
        open={urgentConfirmOpen}
        onClose={handleUrgentCancel}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', pb: 1, color: '#dc2626' }}>
          {t('tcc.urgentConfirmTitle', '⚠️ Thông báo: Capacity Đã Vượt Ngưỡng (Over Capacity)')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" component="div" sx={{ lineHeight: 1.6 }}>
            {groupCapacityInfo ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="error.main" sx={{ fontWeight: 700 }}>
                  Dung lượng Capacity của Group "{groupCapacityInfo.groupName}" vào ngày {form.expectedDeliveryDate ? format(new Date(form.expectedDeliveryDate), 'dd/MM/yyyy') : ''} đã vượt quá giới hạn:
                </Typography>
                <Box sx={{ bgcolor: '#fef2f2', p: 1.5, borderRadius: 2, border: '1px solid #fecaca', fontSize: 13 }}>
                  <div>• Các xưởng trong Group: <strong>{groupCapacityInfo.factories.join(', ')}</strong></div>
                  <div>• Tối đa Group: <strong>{groupCapacityInfo.maxDailySmv} phút (SAM)</strong></div>
                  <div>• Đã dùng: <strong>{groupCapacityInfo.usedSmv} phút (SAM)</strong></div>
                  <div>• Yêu cầu đơn này: <strong>{groupCapacityInfo.requestedSmv} phút (SAM)</strong></div>
                </Box>
                <Typography variant="body2" color="text.primary" sx={{ mt: 0.5 }}>
                  Bạn có muốn đánh dấu Yêu cầu <strong>KHẨN CẤP (Urgent)</strong> để đưa vào Queue cho TCC xem xét duyệt không?
                </Typography>
              </Box>
            ) : (
              t('tcc.urgentConfirmMessage', 'Capacity của xưởng vào ngày giao yêu cầu này đã đầy (Over capacity). Bạn có muốn đánh dấu Yêu cầu KHẨN CẤP (Urgent) để đưa vào Queue cho TCC xem xét duyệt không?')
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={handleUrgentCancel}
            sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2 }}
          >
            {t('tcc.no', 'Không (Hủy đơn)')}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleUrgentConfirm}
            sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2 }}
          >
            {t('tcc.yesUrgent', 'Có (Gửi Khẩn Cấp vào Queue)')}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}
