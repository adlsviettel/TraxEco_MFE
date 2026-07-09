import React, { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, Drawer, IconButton, TextField, Typography,
  Grid, CircularProgress, Divider, InputAdornment, Snackbar, Alert, MenuItem, Autocomplete, Stack,
  Card, CardHeader, CardContent
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { rdItemApi } from '../services/rdMaterialApi';
import type { Item, ItemType } from '../types';
import { useTranslation } from 'react-i18next';
import { authService } from '@traxeco/shared';

export interface FormFieldDef {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'autocomplete' | 'multiline';
  options?: string[];
  block: 'main' | 'specs' | 'finance';
  fullWidth?: boolean;
}

// Per-module config: which generic sections / labels to show
interface ModuleConfig {
  showSupplier: boolean;
  showCost: boolean;      // Price, MOQ, Surcharges
  showQuantity: boolean;
  quantityLabel: string;
  showLocation: boolean;
  locationLabel: string;
  showHolder: boolean;
  showRemark: boolean;
  showImage: boolean;
  showCategory: boolean;
  categoryLabel: string;
  showDescription: boolean;
}

const MODULE_CONFIG: Record<string, ModuleConfig> = {
  FABRIC: {
    showSupplier: true, showCost: true, showQuantity: true, quantityLabel: 'Qty of hanger',
    showLocation: true, locationLabel: 'Hanger location', showHolder: true, showRemark: true,
    showImage: true, showCategory: false, categoryLabel: '', showDescription: false,
  },
  ACCESSORY: {
    showSupplier: true, showCost: true, showQuantity: true, quantityLabel: 'Quantity',
    showLocation: true, locationLabel: 'Location', showHolder: false, showRemark: true,
    showImage: true, showCategory: false, categoryLabel: '', showDescription: true,
  },
  PRODUCT: {
    showSupplier: false, showCost: false, showQuantity: true, quantityLabel: 'Quantity',
    showLocation: true, locationLabel: 'Location', showHolder: true, showRemark: true,
    showImage: true, showCategory: false, categoryLabel: '', showDescription: true,
  },
  YARDAGE: {
    showSupplier: false, showCost: false, showQuantity: true, quantityLabel: "Q'ty of yardage",
    showLocation: true, locationLabel: 'Yardage location', showHolder: false, showRemark: true,
    showImage: true, showCategory: true, categoryLabel: 'Color', showDescription: false,
  },
  PATTERN: {
    showSupplier: false, showCost: false, showQuantity: false, quantityLabel: 'Quantity',
    showLocation: false, locationLabel: 'Location', showHolder: false, showRemark: false,
    showImage: false, showCategory: false, categoryLabel: '', showDescription: false,
  },
  CATALOG: {
    showSupplier: true, showCost: false, showQuantity: false, quantityLabel: 'Quantity',
    showLocation: true, locationLabel: 'Location', showHolder: true, showRemark: false,
    showImage: true, showCategory: false, categoryLabel: '', showDescription: false,
  },
  CONCEPT: {
    showSupplier: false, showCost: false, showQuantity: false, quantityLabel: 'Quantity',
    showLocation: false, locationLabel: 'Location', showHolder: false, showRemark: false,
    showImage: true, showCategory: false, categoryLabel: '', showDescription: true,
  },
  COLOR:   {
    showSupplier: true, showCost: false, showQuantity: false, quantityLabel: 'Quantity',
    showLocation: false, locationLabel: 'Location', showHolder: false, showRemark: true,
    showImage: true, showCategory: true, categoryLabel: 'Season / Palette', showDescription: true,
  },
  TRIM:    {
    showSupplier: true, showCost: true, showQuantity: true, quantityLabel: 'Quantity',
    showLocation: true, locationLabel: 'Location', showHolder: true, showRemark: true,
    showImage: true, showCategory: true, categoryLabel: 'Trim Type', showDescription: true,
  },
  ARCHIVE: {
    showSupplier: true, showCost: false, showQuantity: true, quantityLabel: 'Quantity',
    showLocation: true, locationLabel: 'Location', showHolder: true, showRemark: true,
    showImage: false, showCategory: false, categoryLabel: '', showDescription: true,
  },
};

const DEFAULT_CONFIG: ModuleConfig = {
  showSupplier: true, showCost: true, showQuantity: true, quantityLabel: 'Quantity',
  showLocation: true, locationLabel: 'Location', showHolder: true, showRemark: true,
  showImage: true, showCategory: true, categoryLabel: 'Category', showDescription: true,
};

const setNested = (obj: any, path: string, value: any) => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const lastObj = keys.reduce((o, k) => o[k] = o[k] || {}, obj);
  lastObj[lastKey] = value;
};

const getNested = (obj: any, path: string) => {
  return path.split('.').reduce((o, k) => (o || {})[k], obj);
};

interface Props {
  open: boolean;
  item: Item | null;
  isCopy?: boolean;
  itemType: ItemType;
  title: string;
  fields: FormFieldDef[];
  onClose: () => void;
  onSaved: () => void;
}

const GenericItemFormDrawer: React.FC<Props> = ({ open, item, isCopy, itemType, title, fields, onClose, onSaved }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<Item>>({ itemType });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({ open: false, message: '', severity: 'success' });

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [shakeFields, setShakeFields] = useState<Record<string, boolean>>({});
  const itemCodeRef = React.useRef<HTMLInputElement | null>(null);
  const nameRef = React.useRef<HTMLInputElement | null>(null);
  const quantityRef = React.useRef<HTMLInputElement | null>(null);

  const cfg = MODULE_CONFIG[itemType] || DEFAULT_CONFIG;

  useEffect(() => {
    if (open) {
      setErrors({});
      setShakeFields({});
      if (item) {
        const cloned = JSON.parse(JSON.stringify(item));
        if (isCopy) {
          delete cloned.id;
          delete cloned.qrCode;
        }
        setFormData(cloned);
      }
      else setFormData({ itemType });
    }
  }, [open, item, itemType, isCopy]);

  const handleChange = (path: string, val: string | number) => {
    setFormData(prev => {
      const newData = { ...prev };
      setNested(newData, path, val);
      return newData;
    });
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'mainImage' | 'stickerImage') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setSnackbar({ open: true, message: t('rdMaterial.image_too_large', 'Image size > 5MB'), severity: 'warning' });
    setUploading(true);
    try {
      const url = await rdItemApi.uploadImage(file);
      handleChange(targetField, url);
      setSnackbar({ open: true, message: t('rdMaterial.image_uploaded_success', 'Image uploaded successfully'), severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: t('rdMaterial.image_upload_error', 'Failed to upload image'), severity: 'error' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    const isMissingCode = !formData.itemCode;
    const isMissingName = !formData.name;
    const qtyVal = formData.quantity !== undefined && formData.quantity !== null && formData.quantity !== '' ? Number(formData.quantity) : undefined;
    const isMissingQty = cfg.showQuantity && (qtyVal === undefined || qtyVal <= 0);

    if (isMissingCode || isMissingName || isMissingQty) {
      const newErrors = {
        itemCode: isMissingCode,
        name: isMissingName,
        quantity: isMissingQty
      };
      setErrors(newErrors);
      setShakeFields(newErrors);

      if (isMissingCode && !(itemType === 'YARDAGE' || !!formData.id)) {
        itemCodeRef.current?.focus();
      } else if (isMissingName && itemType !== 'YARDAGE') {
        nameRef.current?.focus();
      } else if (isMissingQty) {
        quantityRef.current?.focus();
      }

      setTimeout(() => setShakeFields({}), 500);

      const missingList: string[] = [];
      if (isMissingCode) missingList.push(t('rdMaterial.validation.missing_code', 'Mã hàng (Item Code) chưa nhập'));
      if (isMissingName) missingList.push(t('rdMaterial.validation.missing_name', 'Tên chưa nhập'));
      if (isMissingQty) missingList.push(t('rdMaterial.validation.missing_qty', 'Số lượng (Qty) chưa nhập'));

      const errorMsg = `${t('rdMaterial.validation.check_below', 'Vui lòng kiểm tra:')} ${missingList.join(', ')}`;
      return setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    }

    if (formData.itemCode && formData.itemCode.trim() !== '') {
      const isDuplicate = await rdItemApi.checkDuplicateCode(formData.itemCode, itemType, formData.id);
      if (isDuplicate) {
        setShakeFields({ itemCode: true });
        setTimeout(() => setShakeFields({}), 500);
        itemCodeRef.current?.focus();
        return setSnackbar({ 
          open: true, 
          message: t('rdMaterial.validation.duplicate_code', 'Mã hàng đã tồn tại trong hệ thống. Vui lòng nhập mã hàng khác để tiếp tục.'), 
          severity: 'error' 
        });
      }
    }

    setLoading(true);
    try {
      // Detect price/cost changes and record history
      let currentHistory: any[] = [];
      try {
        if (formData.priceHistory) {
          currentHistory = JSON.parse(formData.priceHistory);
        } else if (item && item.priceHistory) {
          currentHistory = JSON.parse(item.priceHistory);
        }
      } catch (err) {
        console.warn('Failed to parse price history', err);
      }

      const toNum = (v: unknown) => {
        const n = Number(v);
        return v === '' || v === undefined || v === null || isNaN(n) ? undefined : n;
      };

      const priceChanged = (item?.price !== toNum(formData.price));
      const currencyChanged = (item?.currency !== (formData.currency || 'USD'));
      const unitChanged = (item?.priceUnit !== (formData.priceUnit || ''));
      const moqMcqChanged = (item?.moqMcq !== (formData.moqMcq || ''));
      const moqMcqUnitChanged = (item?.moqMcqUnit !== (formData.moqMcqUnit || ''));

      const hasCostChanged = priceChanged || currencyChanged || unitChanged || moqMcqChanged || moqMcqUnitChanged;

      if (!formData.id || hasCostChanged) {
        const userInfo = authService.getUserInfo();
        const userName = userInfo?.employeeName || 'System';
        const newEntry = {
          price: toNum(formData.price),
          currency: formData.currency || 'USD',
          priceUnit: formData.priceUnit || undefined,
          moqMcq: formData.moqMcq || undefined,
          moqMcqUnit: formData.moqMcqUnit || undefined,
          date: new Date().toISOString(),
          user: userName
        };
        currentHistory.unshift(newEntry);
      }
      
      const payload = {
        ...formData,
        priceHistory: currentHistory.length > 0 ? JSON.stringify(currentHistory) : undefined,
      };

      if (formData.id) {
        await rdItemApi.update(formData.id, payload);
      } else {
        await rdItemApi.create(payload);
      }
      setSnackbar({ open: true, message: t('rdMaterial.save_success', 'Saved successfully'), severity: 'success' });
      onSaved();
      setTimeout(onClose, 800);
    } catch (err: any) {
      setSnackbar({ open: true, message: t('rdMaterial.save_error', 'Failed to save item') + ': ' + (err.response?.data || err.message), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!open || !cfg.showImage) return;
      const file = Array.from(e.clipboardData?.files || []).find(f => f.type.startsWith('image/'));
      if (!file) return;
      
      e.preventDefault();
      if (file.size > 5 * 1024 * 1024) return setSnackbar({ open: true, message: t('rdMaterial.image_too_large', 'Image size > 5MB'), severity: 'warning' });
      setUploading(true);
      try {
        const url = await rdItemApi.uploadImage(file);
        handleChange('mainImage', url);
        setSnackbar({ open: true, message: t('rdMaterial.image_pasted_success', 'Image pasted successfully'), severity: 'success' });
      } catch {
        setSnackbar({ open: true, message: t('rdMaterial.image_paste_error', 'Failed to paste image'), severity: 'error' });
      } finally {
        setUploading(false);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [open, cfg.showImage, t]);

  const renderField = (f: FormFieldDef) => {
    const val = getNested(formData, f.name) ?? '';
    const cols = f.fullWidth ? 12 : 6;
    const sxProp = { '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: 2 } };

    if (f.type === 'select' && f.options) {
      return (
        <Grid size={{ xs: 12, sm: cols }} key={f.name}>
          <TextField select label={f.label} fullWidth size="small" value={val}
            onChange={(e) => handleChange(f.name, e.target.value)} sx={sxProp}
            SelectProps={{ MenuProps: { style: { zIndex: 99999 } } }}>
            {f.options.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </TextField>
        </Grid>
      );
    }
    if (f.type === 'autocomplete' && f.options) {
      return (
        <Grid size={{ xs: 12, sm: cols }} key={f.name}>
          <Autocomplete options={f.options} freeSolo size="small" fullWidth
            value={val} onChange={(_, v) => handleChange(f.name, v ?? '')}
            onInputChange={(_, v) => handleChange(f.name, v)}
            slotProps={{ popper: { sx: { zIndex: 99999 } } }}
            renderInput={(params) => <TextField {...params} variant="outlined" label={f.label} fullWidth sx={sxProp} />}
          />
        </Grid>
      );
    }
    if (f.type === 'multiline') {
      return (
        <Grid size={{ xs: 12, sm: cols }} key={f.name}>
          <TextField label={f.label} fullWidth size="small" multiline rows={2} value={val}
            onChange={(e) => handleChange(f.name, e.target.value)} sx={sxProp} />
        </Grid>
      );
    }
    return (
      <Grid size={{ xs: 12, sm: cols }} key={f.name}>
        <TextField label={f.label} fullWidth size="small"
          type={f.type === 'number' ? 'number' : 'text'} value={val}
          onChange={(e) => handleChange(f.name, f.type === 'number' ? Number(e.target.value) : e.target.value)}
          sx={sxProp}
        />
      </Grid>
    );
  };

  const renderFields = (block: string) => fields.filter(f => f.block === block).map(renderField);

  return (
    <Drawer open={open} ModalProps={{ keepMounted: true }} anchor="right" onClose={(event, reason) => { if (reason === 'backdropClick') return; onClose(); }} sx={{ zIndex: 9999 }} PaperProps={{ sx: { width: { xs: '100%', md: '85vw', xl: 1400 }, maxWidth: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column' } }}>
      {/* Header */}
      <Box sx={{ px: 3, py: 2.5, background: 'linear-gradient(135deg, #2e7d32 0%, #3ba55c 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography fontWeight={800} fontSize={18} color="#fff" sx={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{title}</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}><CloseIcon /></IconButton>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: { xs: 'auto', md: 'hidden' }, p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: '100%', maxWidth: 1440, height: { xs: 'auto', md: '100%' }, display: 'flex', flexDirection: 'column' }}>
          <Grid container spacing={4} sx={{ height: { xs: 'auto', md: '100%' }, minHeight: 0, flex: 1 }}>
            
            {/* LEFT COLUMN */}
            {cfg.showImage && (
              <Grid size={{ xs: 12, md: 4 }} sx={{ height: { xs: 'auto', md: '100%' }, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flex: 1, overflowY: { xs: 'visible', md: 'auto' }, pr: { xs: 0, md: 1 } }}>
                  <Stack spacing={4}>
                    {/* PICTURE BLOCK */}
                    <Card elevation={0} sx={{ borderRadius: 0, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.04)' }}>
                      <CardHeader 
                        title="1. Picture" 
                        titleTypographyProps={{ variant: 'overline', fontWeight: 800, sx: { letterSpacing: 1, fontSize: 13, color: '#0f172a' } }}
                        sx={{ bgcolor: '#fff', py: 2, borderBottom: '1px solid rgba(0,0,0,0.04)', borderLeft: '4px solid #3ba55c' }}
                      />
                      <CardContent sx={{ p: 3 }}>
                        <Box>
                          <Box display="flex" gap={1}>
                            <Box sx={{ flex: 1 }}>
                              <input type="file" id="main-file-upload" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageCapture(e, 'mainImage')} />
                              <label htmlFor="main-file-upload">
                                <Box sx={{ border: '1px dashed #cbd5e1', borderRadius: 1, bgcolor: '#f8fafc', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#f1f5f9', borderColor: '#3ba55c' } }}>
                                  <UploadFileIcon sx={{ color: '#94a3b8', fontSize: 20, mr: 1 }} />
                                  <Typography variant="caption" fontWeight={600}>{t('rdMaterial.library', 'Thư viện')}</Typography>
                                </Box>
                              </label>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <input type="file" id="main-cam-upload" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handleImageCapture(e, 'mainImage')} />
                              <label htmlFor="main-cam-upload">
                                <Box sx={{ border: '1px dashed #6ee7b7', borderRadius: 1, bgcolor: '#f0fdf4', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#dcfce7', borderColor: '#2e7d32' } }}>
                                  <PhotoCameraIcon sx={{ color: '#2e7d32', fontSize: 20, mr: 1 }} />
                                  <Typography variant="caption" fontWeight={600} color="#2e7d32">{t('rdMaterial.camera', 'Máy ảnh')}</Typography>
                                </Box>
                              </label>
                            </Box>
                          </Box>
                          {(formData.mainImage || uploading) && (
                            <Box mt={1.5} sx={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 1, overflow: 'hidden', border: formData.mainImage ? '1px solid #e2e8f0' : 'none', bgcolor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                              {uploading && !formData.mainImage
                                ? <Box sx={{ inset: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.8)' }}><CircularProgress size={24} /></Box>
                                : <img src={rdItemApi.getImageUrl(formData.mainImage)} alt="Main" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                              }
                              {formData.mainImage && (
                                <IconButton size="small" sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(255,255,255,0.8)', p: 0.5, backdropFilter: 'blur(4px)', '&:hover': { bgcolor: '#ef4444', color: 'white' } }} onClick={() => handleChange('mainImage', '')}>
                                  <CloseIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              )}
                              {!formData.id && <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(59, 165, 92, 0.8)', color: '#fff', fontSize: 10, textAlign: 'center', py: 0.5 }}>{t('rdMaterial.not_saved', 'Chưa lưu')}</Box>}
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Stack>
                </Box>
              </Grid>
            )}

            {/* RIGHT COLUMN: ITEM DETAILS */}
            <Grid size={{ xs: 12, md: cfg.showImage ? 8 : 12 }} sx={{ height: { xs: 'auto', md: '100%' }, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ flex: 1, overflowY: { xs: 'visible', md: 'auto' }, pr: { xs: 0, md: 1 } }}>
                <Card elevation={0} sx={{ borderRadius: 0, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.04)', minHeight: '100%' }}>
                  <CardHeader 
                    title={<span>ItemNo (Item Code) <span style={{color: '#ef4444'}}>*</span></span>} 
                    titleTypographyProps={{ variant: 'overline', fontWeight: 800, sx: { letterSpacing: 1, fontSize: 13, color: '#0f172a' } }}
                    sx={{ bgcolor: '#fff', py: 2, borderBottom: '1px solid rgba(0,0,0,0.04)', borderLeft: '4px solid #2e7d32' }}
                  />
                  <CardContent sx={{ p: 0 }}>
                    
                    {/* GENERAL INFO HIGHLIGHT */}
                    <Box p={4} pb={2}>
                      <Stack spacing={2.5}>
                        <TextField 
                          placeholder="Enter Item Code / Item No..." 
                          variant="standard" 
                          required 
                          fullWidth 
                          inputRef={itemCodeRef}
                          value={formData.itemCode || ''} 
                          onChange={(e) => {
                            handleChange('itemCode', e.target.value);
                            if (errors.itemCode) {
                              setErrors(prev => ({ ...prev, itemCode: false }));
                            }
                          }} 
                          disabled={itemType === 'YARDAGE' || !!formData.id}
                          InputProps={{ disableUnderline: true, sx: { fontSize: { xs: 24, md: 32 }, fontWeight: 800, color: '#0f172a', '& input::placeholder': { color: '#cbd5e1', opacity: 1 } } }} 
                          sx={{ 
                            bgcolor: errors.itemCode ? '#fef2f2' : '#f8fafc', 
                            p: 2, 
                            borderRadius: 1, 
                            border: errors.itemCode ? '1.5px solid #ef4444' : (shakeFields.itemCode ? '1.5px solid #ef4444' : '1px dashed #cbd5e1'), 
                            transition: 'all 0.2s', 
                            '&:hover': { borderColor: (errors.itemCode || shakeFields.itemCode) ? '#ef4444' : '#94a3b8', bgcolor: errors.itemCode ? '#fef2f2' : '#f1f5f9' }, 
                            '&:focus-within': { 
                              borderColor: errors.itemCode ? '#ef4444' : '#2563eb', 
                              bgcolor: '#fff', 
                              boxShadow: errors.itemCode ? '0 0 0 4px rgba(239,68,68,0.15)' : '0 0 0 4px rgba(37,99,235,0.1)' 
                            },
                            opacity: (itemType === 'YARDAGE' || !!formData.id) ? 0.7 : 1,
                            animation: shakeFields.itemCode ? 'shake 0.5s ease-in-out' : 'none',
                            '@keyframes shake': {
                              '0%, 100%': { transform: 'translateX(0)' },
                              '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
                              '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' }
                            }
                          }} 
                        />
                        <TextField 
                          label="Name" 
                          size="small" 
                          required 
                          inputRef={nameRef}
                          value={formData.name || ''} 
                          disabled={itemType === 'YARDAGE'} 
                          onChange={(e) => {
                            handleChange('name', e.target.value);
                            if (errors.name) {
                              setErrors(prev => ({ ...prev, name: false }));
                            }
                          }} 
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              bgcolor: errors.name ? '#fef2f2' : '#f8fafc', 
                              borderRadius: 1, 
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: errors.name ? '#ef4444' : (shakeFields.name ? '#ef4444' : undefined),
                                borderWidth: (errors.name || shakeFields.name) ? '1.5px' : undefined,
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: errors.name ? '#ef4444' : undefined,
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: errors.name ? '#ef4444' : undefined,
                              },
                              '&:hover': { bgcolor: errors.name ? '#fef2f2' : '#f1f5f9' }, 
                              '&.Mui-focused': { bgcolor: '#fff' } 
                            },
                            animation: shakeFields.name ? 'shake 0.5s ease-in-out' : 'none',
                          }} 
                        />
                        {cfg.showDescription && <TextField label="Description" size="small" value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover': { bgcolor: '#f1f5f9' }, '&.Mui-focused': { bgcolor: '#fff' } } }} />}
                      </Stack>
                    </Box>

                    <Stack spacing={0} divider={<Divider sx={{ borderStyle: 'dashed', borderColor: '#e2e8f0', mx: 4 }} />}>
                      
                      {/* SPECIFICATION */}
                      {(cfg.showCategory || fields.some(f => f.block === 'specs')) && (
                        <Box p={4}>
                          {itemType !== 'YARDAGE' && (
                            <Typography variant="subtitle2" sx={{ color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }} fontWeight={800} mb={3}>Specification</Typography>
                          )}
                          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                            {cfg.showCategory && <TextField label={cfg.categoryLabel || "Category"} size="small" value={formData.category || ''} onChange={(e) => handleChange('category', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />}
                            {renderFields('specs')}
                          </Box>
                        </Box>
                      )}

                      {/* SUPPLIER */}
                      {cfg.showSupplier && (
                        <Box p={4}>
                          <Typography variant="subtitle2" sx={{ color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }} fontWeight={800} mb={3}>Supplier</Typography>
                          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                            <TextField label="Supplier Name" size="small" value={formData.supplierName || ''} onChange={(e) => handleChange('supplierName', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                            <TextField label="Origin" size="small" value={formData.origin || ''} onChange={(e) => handleChange('origin', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                          </Box>
                        </Box>
                      )}

                      {/* COST */}
                      {(cfg.showCost || fields.some(f => f.block === 'finance')) && (
                        <Box p={4}>
                          <Typography variant="subtitle2" sx={{ color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }} fontWeight={800} mb={3}>Cost</Typography>
                          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                            {cfg.showCost && (
                              <>
                                <TextField 
                                  label="Price" size="small" type="number" 
                                  value={formData.price ?? ''} onChange={(e) => handleChange('price', e.target.value)} 
                                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'}, pr: 0.5 } }}
                                  InputProps={{
                                    endAdornment: (
                                      <InputAdornment position="end">
                                        <Autocomplete options={['USD', 'VND', 'RMB', 'EUR', 'GBP', 'JPY', 'KRW', 'THB']} value={formData.currency || ''} onChange={(_, newVal) => handleChange('currency', newVal || '')} disableClearable size="small" sx={{ width: 80, '& .MuiInputBase-root': { py: 0, pl: 0.5, pr: '24px !important', fontSize: 13, color: 'text.secondary', fontWeight: 600 } }} renderInput={(params) => <TextField {...params} variant="standard" InputProps={{ ...params.InputProps, disableUnderline: true }} />} />
                                        <Box component="span" sx={{ fontSize: 16, mx: 0.5, color: 'text.disabled' }}>/</Box>
                                        <Autocomplete options={['yd', 'm', 'pcs', 'set', 'kg', 'roll']} freeSolo size="small" value={formData.priceUnit || ''} onChange={(_, v) => handleChange('priceUnit', v || '')} onInputChange={(_, v) => handleChange('priceUnit', v)} sx={{ width: 65, '& .MuiInputBase-root': { py: 0, pl: 0.5, pr: '24px !important', fontSize: 13, color: 'primary.main', fontWeight: 700, bgcolor: '#e2e8f0', borderRadius: 1, '&:hover':{bgcolor:'#cbd5e1'} } }} renderInput={(params) => <TextField {...params} placeholder="Unit" variant="standard" InputProps={{ ...params.InputProps, disableUnderline: true }} />} />
                                      </InputAdornment>
                                    ),
                                  }}
                                />
                                <TextField label="MOQ/MCQ" fullWidth size="small" 
                                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'}, pr: 0.5 } }}
                                  InputProps={{
                                    endAdornment: (
                                      <InputAdornment position="end">
                                        <Box component="span" sx={{ fontSize: 13, mx: 0.5, color: 'text.disabled', fontWeight: 600 }}>Unit:</Box>
                                        <Autocomplete options={['yd/yd', 'm/m', 'pcs/pcs', 'set/set']} freeSolo size="small" value={formData.moqMcqUnit || ''} onChange={(_, v) => handleChange('moqMcqUnit', v || '')} onInputChange={(_, v) => handleChange('moqMcqUnit', v)} sx={{ width: 75, '& .MuiInputBase-root': { py: 0, pl: 0.5, pr: '24px !important', fontSize: 13, color: 'primary.main', fontWeight: 700, bgcolor: '#e2e8f0', borderRadius: 1, '&:hover':{bgcolor:'#cbd5e1'} } }} renderInput={(params) => <TextField {...params} placeholder="yd/yd" variant="standard" InputProps={{ ...params.InputProps, disableUnderline: true }} />} />
                                      </InputAdornment>
                                    )
                                  }}
                                  value={formData.moqMcq || ''} onChange={(e) => handleChange('moqMcq', e.target.value)} />
                                <TextField label="MCQ Surcharge ($)" size="small" type="number" value={formData.mcqSurcharge ?? ''} onChange={(e) => handleChange('mcqSurcharge', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                                <TextField label="MOQ Surcharge ($)" size="small" type="number" value={formData.moqSurcharge ?? ''} onChange={(e) => handleChange('moqSurcharge', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                              </>
                            )}
                            {renderFields('finance')}
                          </Box>
                        </Box>
                      )}

                      {/* OTHER INFO */}
                      {(cfg.showQuantity || cfg.showLocation || cfg.showHolder || cfg.showRemark || fields.some(f => f.block === 'main')) && (
                        <Box p={4}>
                          {itemType !== 'YARDAGE' && (
                            <Typography variant="subtitle2" sx={{ color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }} fontWeight={800} mb={3}>Other Info</Typography>
                          )}
                          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                            {cfg.showQuantity && (
                              <TextField
                                label={cfg.quantityLabel || 'Quantity'}
                                size="small"
                                type="number"
                                inputRef={quantityRef}
                                value={formData.quantity ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '') {
                                    handleChange('quantity', '');
                                    return;
                                  }
                                  const num = Number(val);
                                  if (!isNaN(num) && num >= 0) {
                                    handleChange('quantity', num);
                                    if (errors.quantity) {
                                      setErrors(prev => ({ ...prev, quantity: false }));
                                    }
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                    e.preventDefault();
                                  }
                                }}
                                InputProps={{
                                  inputProps: { min: 0 }
                                }}
                                sx={{
                                  '& input[type=number]': {
                                    MozAppearance: 'textfield',
                                  },
                                  '& input[type=number]::-webkit-outer-spin-button': {
                                    WebkitAppearance: 'none',
                                    margin: 0,
                                  },
                                  '& input[type=number]::-webkit-inner-spin-button': {
                                    WebkitAppearance: 'none',
                                    margin: 0,
                                  },
                                  '& .MuiOutlinedInput-root': {
                                    bgcolor: errors.quantity ? '#fef2f2' : '#f8fafc',
                                    borderRadius: 1,
                                    '& .MuiOutlinedInput-notchedOutline': {
                                      borderColor: errors.quantity ? '#ef4444' : (shakeFields.quantity ? '#ef4444' : undefined),
                                      borderWidth: (errors.quantity || shakeFields.quantity) ? '1.5px' : undefined,
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                      borderColor: errors.quantity ? '#ef4444' : undefined,
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                      borderColor: errors.quantity ? '#ef4444' : undefined,
                                    },
                                    '&:hover': { bgcolor: errors.quantity ? '#fef2f2' : '#f1f5f9' },
                                    '&.Mui-focused': { bgcolor: '#fff' }
                                  },
                                  animation: shakeFields.quantity ? 'shake 0.5s ease-in-out' : 'none',
                                }}
                              />
                            )}
                            {cfg.showLocation && <TextField label={cfg.locationLabel || 'Location'} size="small" value={formData.location ?? ''} onChange={(e) => handleChange('location', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />}
                            {cfg.showHolder && <TextField label="Holder" size="small" value={formData.holder ?? ''} onChange={(e) => handleChange('holder', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />}
                            {renderFields('main')}
                            {cfg.showRemark && <TextField label="Remark" size="small" multiline rows={3} value={formData.remark ?? ''} onChange={(e) => handleChange('remark', e.target.value)} sx={{ gridColumn: '1/-1', '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />}
                          </Box>
                        </Box>
                      )}

                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ px: 3, py: 2.5, borderTop: '1px solid #f1f5f9', bgcolor: '#fff', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 1, px: 3, fontWeight: 700, borderColor: '#cbd5e1', color: '#64748b', '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' } }}>
          {t('rdMaterial.cancel', 'Cancel')}
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={loading}
          sx={{ borderRadius: 1, px: 4, fontWeight: 700, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' }, boxShadow: '0 4px 14px 0 rgba(46, 125, 50, 0.39)' }}
        >
          {loading ? t('rdMaterial.print_loading', 'Loading...') : t('rdMaterial.save', 'Save')}
        </Button>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={2000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} sx={{ zIndex: 99999 }}>
        <Alert severity={snackbar.severity as any} sx={{ width: '100%', borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Drawer>
  );
};

export default GenericItemFormDrawer;
