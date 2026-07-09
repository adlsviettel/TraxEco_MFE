import React, { useState, useEffect, useRef } from 'react';
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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DatePicker } from '@mui/x-date-pickers';
import { useTranslation } from 'react-i18next';
import { tccService, type TccRequest, type CreateRequestPayload, type TccMachineTemplate, type TccLeadTimeConfig } from '../services/tccService';
import { format, addDays, getDay } from 'date-fns';

const CUSTOMERS = ['Adidas', 'Puma', 'NB', 'Swannies', 'Bomber', 'Rhone'];
const SAMPLE_STAGES = ['01 -1st Proto', '02 -Salesman', '05 -Pre-Prod', '07 -Size Set', '09 -04th Proto', '09 -3rd Proto', '12 -Fitting', '13 -2nd Proto', '14 -Sealing', '15 -PLM', '18 -Garment Test', '19 -Production', '20 -GMM', '23 -Confirmation'];
const FACTORIES = ['SR Puma', 'SR Adidas', 'SR NB', 'A1A - F1', 'A1A - F2', 'A1A - F3', 'SR TL', 'TCC'];
const SEASONS = ['SP26', 'SU26', 'FA26', 'WI26', 'SP27', 'SU27', 'FA27', 'WI27'];
const PRODUCT_TYPES = ['Polo', 'T-Shirt', 'Jacket', 'Pants', 'Shorts', 'Dress', 'Skirts', 'Hoodie', 'Sweater'];

interface RequestFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

  const initialFormState: CreateRequestPayload = {
    requesterName: '',
    customer: '',
    season: '',
    styleNumber: '',
    productType: '',
    sampleStage: '',
    factory: '',
    materialSentDate: null,
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


      const userStr = localStorage.getItem('user');
      let user = null;
      if (userStr) {
        try {
          user = JSON.parse(userStr);
        } catch (e) {
          console.error('Failed to parse user from localStorage', e);
        }
      }
      const loggedInName = user?.displayName || user?.name || '';

      if (sourceForm) {
        setForm({
          requesterName: loggedInName,
          customer: sourceForm.customer || '',
          season: sourceForm.season || '',
          styleNumber: sourceForm.styleNumber || '',
          productType: sourceForm.productType || '',
          sampleStage: sourceForm.sampleStage || '',
          factory: sourceForm.factory || '',
          materialSentDate: sourceForm.materialSentDate || null,
          processType: sourceForm.processType || 'Light Process',
          operationDescription: sourceForm.operationDescription || '',
          machineType: sourceForm.machineType || '',
          machineDimension: sourceForm.machineDimension || '',
          sizesRequired: sourceForm.sizesRequired || '',
          isPriority: !!sourceForm.isPriority,
          priorityReason: sourceForm.priorityReason || '',
          expectedDeliveryDate: sourceForm.expectedDeliveryDate || null,
          lineQuantity: sourceForm.lineQuantity || '',
          templateQty: sourceForm.templateQty || null,
        });
      } else {
        setForm({
          ...initialFormState,
          requesterName: loggedInName,
        });
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

  const handleConfirmSubmit = async (shouldSave: boolean) => {
    setConfirmOpen(false);
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...form,
        machineType: form.machineType || null,
        machineDimension: form.machineDimension || null,
        requesterName: authService.getUserInfo().employeeCode,
        materialSentDate: form.materialSentDate ? format(new Date(form.materialSentDate), 'yyyy-MM-dd') : null,
        expectedDeliveryDate: form.expectedDeliveryDate ? format(new Date(form.expectedDeliveryDate), 'yyyy-MM-dd') : null,
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
          bgcolor: '#f1f5f9' 
        } 
      }}
    >
      <Box sx={{ p: 3, pb: 2, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
                <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 1, height: '100%' }}>
                  <CardHeader 
                    title={t('tcc.groupGeneral')} 
                    titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700, color: '#334155', sx: { lineHeight: 1.2 } }} 
                    sx={{ bgcolor: '#ffffff', py: isMobile ? 1.5 : 2, px: isMobile ? 2 : 3 }} 
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
                              bgcolor: '#fff', 
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
                          options={seasons}
                          value={form.season}
                          onChange={(_, newValue) => handleChange('season', newValue || '')}
                          onInputChange={(_, newInputValue) => handleChange('season', newInputValue)}
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
                                  bgcolor: '#fff', 
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
                          value={form.styleNumber} debounceMs={150} onDebounceChange={(val) => handleChange('styleNumber', val)}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Autocomplete
                          freeSolo
                          options={productTypes}
                          value={form.productType}
                          onChange={(_, newValue) => handleChange('productType', newValue || '')}
                          onInputChange={(_, newInputValue) => handleChange('productType', newInputValue)}
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
                                  bgcolor: '#fff', 
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
                <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 1, height: '100%' }}>
                  <CardHeader 
                    title={t('tcc.groupProduction')} 
                    titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700, color: '#334155', sx: { lineHeight: 1.2 } }} 
                    sx={{ bgcolor: '#ffffff', py: isMobile ? 1.5 : 2, px: isMobile ? 2 : 3 }} 
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
                              bgcolor: '#fff', 
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
                              bgcolor: '#fff', 
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
                        <DatePicker format="dd/MM/yyyy"
                          label={t('tcc.materialSentDate')}
                          value={form.materialSentDate ? new Date(form.materialSentDate) : null}
                          onChange={(val: Date | null) => handleChange('materialSentDate', val)}
                          slotProps={{ 
                            textField: { 
                              fullWidth: true,
                              size: 'small',
                              sx: {
                                '& .MuiOutlinedInput-root': { 
                                  borderRadius: '8px', 
                                  height: 40, 
                                  fontSize: 13, 
                                  bgcolor: '#fff', 
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
                              bgcolor: '#fff', 
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
                <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 1, height: '100%' }}>
                  <CardHeader 
                    title={t('tcc.groupTechnical')} 
                    titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700, color: '#334155', sx: { lineHeight: 1.2 } }} 
                    sx={{ bgcolor: '#ffffff', py: isMobile ? 1.5 : 2, px: isMobile ? 2 : 3 }} 
                  />
                  <Divider />
                  <CardContent sx={{ pt: isMobile ? 2 : 3, px: isMobile ? 2 : 3, pb: isMobile ? 2 : 3 }}>
                    <Grid container spacing={isMobile ? 2 : 2.5}>
                      <Grid size={{ xs: 12, sm: 12 }}>
                        <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#000', fontWeight: 'bold', fontStyle: 'italic', fontSize: 12 }}>
                          * {t('tcc.operationDescHelper', 'Vui lòng nhập chi tiết mô tả...')}
                        </Typography>
                        <AppTextField
                          label={t('tcc.operationDescription')}
                          fullWidth
                          required
                          multiline
                          rows={4}
                          value={form.operationDescription} debounceMs={150} onDebounceChange={(val) => handleChange('operationDescription', val)}
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
                              bgcolor: '#fff', 
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
                              bgcolor: '#fff', 
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
                          value={form.sizesRequired} debounceMs={150} onDebounceChange={(val) => handleChange('sizesRequired', val)}
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
                          value={form.lineQuantity} debounceMs={150} onDebounceChange={(val) => handleChange('lineQuantity', val)}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* CARD 4: SCHEDULE & PRIORITY */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 1, height: '100%' }}>
                  <CardHeader 
                    title={t('tcc.groupSchedule')} 
                    titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700, color: '#334155', sx: { lineHeight: 1.2 } }} 
                    sx={{ bgcolor: '#ffffff', py: isMobile ? 1.5 : 2, px: isMobile ? 2 : 3 }} 
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
                                  bgcolor: '#fff', 
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
                              bgcolor: '#fff', 
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
                            value={form.priorityReason} debounceMs={150} onDebounceChange={(val) => handleChange('priorityReason', val)}
                          />
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
          <Box sx={{ p: 2, px: 3, bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
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
            color="primary"
            fullWidth
            onClick={() => handleConfirmSubmit(false)}
            sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2 }}
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
    </Drawer>
  );
}
