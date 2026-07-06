import React, { useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, Drawer, DialogContent, DialogActions, IconButton, TextField, Typography, Card, CardHeader, CardContent,
  Divider, Stack, Snackbar, Alert, Autocomplete, Collapse, Checkbox, FormControlLabel, Grid, Tooltip,
  Table, TableHead, TableBody, TableCell, TableRow
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useNavigate } from 'react-router-dom';
import { rdItemApi } from '../services/rdMaterialApi';
import type { Item, ItemFabric } from '../types';
import { useTranslation } from 'react-i18next';
import { AppTextField, authService } from '@traxeco/shared';

const BASE = '/rd-material';

const PreviewImage = ({ file, className, alt, style }: { file: File, className?: string, alt?: string, style?: React.CSSProperties }) => {
  const [url, setUrl] = React.useState<string>('');
  React.useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url ? <img className={className} src={url} alt={alt} style={style} /> : null;
};

interface Props {
  open: boolean;
  item: Item | null;
  isCopy?: boolean;
  onClose: () => void;
  onSaved: (item: Item) => void;
}

const FabricFormDrawer: React.FC<Props> = ({ open, item, isCopy, onClose, onSaved }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isEdit = !!item && !isCopy;

  const [form, setForm] = useState<Partial<Item & ItemFabric>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);
  const [showMaster, setShowMaster] = useState(false);
  const [showItemDetails, setShowItemDetails] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const itemCodeRef = React.useRef<HTMLInputElement | null>(null);
  const quantityRef = React.useRef<HTMLInputElement | null>(null);
  const currencyRef = React.useRef<HTMLInputElement | null>(null);
  const priceUnitRef = React.useRef<HTMLInputElement | null>(null);
  const [shakeFields, setShakeFields] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [duplicateCodeError, setDuplicateCodeError] = useState(false);

  const checkDuplicate = async (code: string) => {
    if (!code || !code.trim()) {
      setDuplicateCodeError(false);
      return;
    }
    const isDuplicate = await rdItemApi.checkDuplicateCode(code, 'FABRIC', isEdit && item ? item.id : undefined);
    setDuplicateCodeError(isDuplicate);
  };

  // Dynamic Options
  const [structureOpts, setStructureOpts] = useState<string[]>(['Knit', 'Woven']);
  const [currencyOpts, setCurrencyOpts] = useState<string[]>(['USD', 'VND', 'RMB', 'EUR', 'GBP', 'JPY', 'KRW', 'THB', 'SGD', 'MYR', 'IDR']);
  const [unitOpts, setUnitOpts] = useState<string[]>(['yd', 'm', 'pcs', 'set', 'kg', 'roll']);
  const [moqUnitOpts, setMoqUnitOpts] = useState<string[]>(['yd/yd', 'm/m', 'pcs/pcs', 'set/set']);
  const [customerOpts, setCustomerOpts] = useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      setErrors({});
      const loadOptions = async (field: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
        try {
          const result = await rdItemApi.getOptions(field);
          if (result && result.length > 0) {
            setter(prev => Array.from(new Set([...prev, ...result])));
          }
        } catch (err: any) {
          console.error(`[FabricFormDrawer] Failed to load options for ${field}:`, err);
        }
      };
      loadOptions('structure', setStructureOpts);
      loadOptions('currency', setCurrencyOpts);
      loadOptions('unit', setUnitOpts);
      loadOptions('moq_unit', setMoqUnitOpts);

      const loadCustomers = async () => {
        try {
          const list = await rdItemApi.getCustomers();
          if (list && list.length > 0) {
            const names = list.map((c: any) => c.custmName).filter(Boolean);
            setCustomerOpts(Array.from(new Set(names)));
          }
        } catch (err) {
          console.error('[FabricFormDrawer] Failed to load customer options:', err);
        }
      };
      loadCustomers();
    }
  }, [open]);

  React.useEffect(() => {
    if (item) {
      setForm({
        ...item,
        structure: item.fabric?.structure,
        fabricName: item.fabric?.fabricName,
        composition: item.fabric?.composition,
        compositionDetail: item.fabric?.compositionDetail,
        function: item.fabric?.function,
        weightGsm: item.fabric?.weightGsm,
        cuttableWidth: item.fabric?.cuttableWidth,
        colorName: item.fabric?.colorName,
        hasSy: item.fabric?.hasSy,
        currency: item.currency || 'USD',
      });
    } else {
      setForm({
        currency: 'USD',
        quantity: 0,
        itemCode: '',
        fabricName: '',
        structure: '',
        composition: '',
        function: '',
        weightGsm: undefined,
        cuttableWidth: undefined,
        price: undefined,
        supplierName: '',
        origin: '',
        location: '',
        surchargeStr: '',
        leadtimeWithGreige: '',
        leadtimeWithoutGreige: '',
        customer: '',
        priceHistory: '',
        hasSy: false
      } as any);
    }
    setPendingMainImages([]);
    setPendingStickerImages([]);
  }, [item, open]);

  const set = (field: string, value: unknown) => setForm((f: any) => ({ ...f, [field]: value }));

  const toNum = (v: unknown) => {
    const n = Number(v);
    return v === '' || v === undefined || v === null || isNaN(n) ? undefined : n;
  };


  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [pastedFiles, setPastedFiles] = useState<File[]>([]);
  const [pendingMainImages, setPendingMainImages] = useState<File[]>([]);
  const [pendingStickerImages, setPendingStickerImages] = useState<File[]>([]);


  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'mainImage' | 'stickerImage') => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    
    if (files.some(f => f.size > 5 * 1024 * 1024)) {
      return setSnackbar({ open: true, message: t('rdMaterial.image_too_large', 'Image size > 5MB'), severity: 'warning' });
    }

    if (targetField === 'mainImage') {
      setPendingMainImages(prev => [...prev, ...files]);
    } else {
      setPendingStickerImages(prev => [...prev, ...files]);
    }
    e.target.value = '';
  };

  const removeImage = (targetField: 'mainImage' | 'stickerImage', indexToRemove: number) => {
    const existingUrls = form[targetField] ? String(form[targetField]).split(',').filter(Boolean) : [];
    existingUrls.splice(indexToRemove, 1);
    set(targetField, existingUrls.join(','));
  };

  const handleSave = async (printAfter = false) => {
    const isMissingCode = !form.itemCode;
    const quantityVal = toNum(form.quantity);
    const isMissingQty = quantityVal === undefined || quantityVal <= 0;
    const hasPrice = form.price !== undefined && form.price !== null && (form.price as any) !== '';
    const isMissingCurrency = hasPrice && !form.currency;
    const isMissingPriceUnit = hasPrice && !form.priceUnit;

    if (isMissingCode || isMissingQty || isMissingCurrency || isMissingPriceUnit) {
      const newErrors = {
        itemCode: isMissingCode,
        quantity: isMissingQty,
        currency: isMissingCurrency,
        priceUnit: isMissingPriceUnit
      };
      setErrors(newErrors);
      setShakeFields(newErrors);

      if (isMissingCode) {
        itemCodeRef.current?.focus();
      } else if (isMissingQty) {
        quantityRef.current?.focus();
      } else if (isMissingCurrency) {
        currencyRef.current?.focus();
      } else if (isMissingPriceUnit) {
        priceUnitRef.current?.focus();
      }

      setTimeout(() => setShakeFields({}), 500);

      const missingList: string[] = [];
      if (isMissingCode) missingList.push('Mã hàng (Item Code) chưa nhập');
      if (isMissingQty) missingList.push('Số lượng (Qty) chưa nhập');
      if (isMissingCurrency) missingList.push('Đơn vị tiền tệ (Curr) chưa chọn');
      if (isMissingPriceUnit) missingList.push('Đơn vị tính (Unit) của đơn giá chưa chọn');

      const errorMsg = `Vui lòng kiểm tra: ${missingList.join(', ')}`;
      return setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    }

    // Check duplicate code
    const isDuplicate = await rdItemApi.checkDuplicateCode(form.itemCode || '', 'FABRIC', isEdit && item ? item.id : undefined);
    if (isDuplicate) {
      setDuplicateCodeError(true);
      setShakeFields({ itemCode: true });
      setTimeout(() => setShakeFields({}), 500);
      itemCodeRef.current?.focus();
      return setSnackbar({ 
        open: true, 
        message: 'Mã hàng (Item Code) đã tồn tại trong hệ thống. Vui lòng nhập mã hàng khác để tiếp tục.', 
        severity: 'error' 
      });
    }

    const weightGsmVal = toNum((form as any).weightGsm);
    if (weightGsmVal !== undefined && weightGsmVal < 0) {
      return setSnackbar({ open: true, message: t('rdMaterial.invalid_weight', 'Weight (GSM) cannot be negative'), severity: 'error' });
    }
    const cuttableWidthVal = toNum((form as any).cuttableWidth);
    if (cuttableWidthVal !== undefined && cuttableWidthVal < 0) {
      return setSnackbar({ open: true, message: t('rdMaterial.invalid_width', 'Cuttable width cannot be negative'), severity: 'error' });
    }
    const priceVal = toNum(form.price);
    if (priceVal !== undefined && priceVal < 0) {
      return setSnackbar({ open: true, message: t('rdMaterial.invalid_price', 'Price cannot be negative'), severity: 'error' });
    }
    
    setLoading(true);
    try {
      // Detect price/cost changes and record history
      let currentHistory: any[] = [];
      try {
        if (form.priceHistory) {
          currentHistory = JSON.parse(form.priceHistory);
        } else if (item && item.priceHistory) {
          currentHistory = JSON.parse(item.priceHistory);
        }
      } catch (err) {
        console.warn('Failed to parse price history', err);
      }

      // Check if any of the cost fields have changed
      const priceChanged = (item?.price !== toNum(form.price));
      const currencyChanged = (item?.currency !== (form.currency || 'USD'));
      const unitChanged = (item?.priceUnit !== (form.priceUnit || ''));
      const moqMcqChanged = (item?.moqMcq !== (form.moqMcq || ''));
      const moqMcqUnitChanged = (item?.moqMcqUnit !== (form.moqMcqUnit || ''));
      const surchargeChanged = (item?.surchargeStr !== (form.surchargeStr || ''));
      const leadtimeWithGreigeChanged = (item?.leadtimeWithGreige !== (form.leadtimeWithGreige || ''));
      const leadtimeWithoutGreigeChanged = (item?.leadtimeWithoutGreige !== (form.leadtimeWithoutGreige || ''));
      const customerChanged = (item?.customer !== (form.customer || ''));

      const hasCostChanged = priceChanged || currencyChanged || unitChanged || moqMcqChanged || moqMcqUnitChanged || surchargeChanged || leadtimeWithGreigeChanged || leadtimeWithoutGreigeChanged || customerChanged;

      // If creating a new item, OR editing and some cost fields changed:
      if (!isEdit || hasCostChanged) {
        const userInfo = authService.getUserInfo();
        const userName = userInfo?.employeeName || 'System';
        const newEntry = {
          price: toNum(form.price),
          currency: form.currency || 'USD',
          priceUnit: form.priceUnit || undefined,
          moqMcq: form.moqMcq || undefined,
          moqMcqUnit: form.moqMcqUnit || undefined,
          surchargeStr: form.surchargeStr || undefined,
          leadtimeWithGreige: form.leadtimeWithGreige || undefined,
          leadtimeWithoutGreige: form.leadtimeWithoutGreige || undefined,
          customer: form.customer || undefined,
          date: new Date().toISOString(),
          user: userName
        };
        currentHistory.unshift(newEntry); // Newest first
      }

      // 1. Upload pending images
      let finalMainImageUrls = form.mainImage ? String(form.mainImage).split(',').filter(Boolean) : [];
      let finalStickerImageUrls = form.stickerImage ? String(form.stickerImage).split(',').filter(Boolean) : [];

      if (pendingMainImages.length > 0) {
        const urls = await Promise.all(pendingMainImages.map(f => rdItemApi.uploadImage(f)));
        finalMainImageUrls = [...finalMainImageUrls, ...urls];
      }

      if (pendingStickerImages.length > 0) {
        const urls = await Promise.all(pendingStickerImages.map(f => rdItemApi.uploadImage(f)));
        finalStickerImageUrls = [...finalStickerImageUrls, ...urls];
      }

      const payload = {
        itemType: 'FABRIC',
        itemCode: form.itemCode !== undefined && form.itemCode !== null ? form.itemCode : undefined,
        name: form.name !== undefined && form.name !== null ? form.name : undefined,
        description: form.description !== undefined && form.description !== null ? form.description : undefined,
        category: form.category !== undefined && form.category !== null ? form.category : undefined,
        supplierName: form.supplierName !== undefined && form.supplierName !== null ? form.supplierName : undefined,
        origin: form.origin !== undefined && form.origin !== null ? form.origin : undefined,
        price: toNum(form.price),
        currency: form.currency || undefined,
        moqMcq: form.moqMcq !== undefined && form.moqMcq !== null ? form.moqMcq : undefined,
        quantity: toNum(form.quantity) ?? 0,
        quantityUnit: 'pcs',
        location: form.location !== undefined && form.location !== null ? form.location : undefined,
        holder: form.holder !== undefined && form.holder !== null ? form.holder : undefined,
        remark: form.remark !== undefined && form.remark !== null ? form.remark : undefined,
        leadTime: form.leadTime !== undefined && form.leadTime !== null ? form.leadTime : undefined,
        surchargeStr: form.surchargeStr !== undefined && form.surchargeStr !== null ? form.surchargeStr : undefined,
        leadtimeWithGreige: form.leadtimeWithGreige !== undefined && form.leadtimeWithGreige !== null ? form.leadtimeWithGreige : undefined,
        leadtimeWithoutGreige: form.leadtimeWithoutGreige !== undefined && form.leadtimeWithoutGreige !== null ? form.leadtimeWithoutGreige : undefined,
        customer: form.customer !== undefined && form.customer !== null ? form.customer : undefined,
        priceHistory: JSON.stringify(currentHistory),
        stickerImage: finalStickerImageUrls.length > 0 ? finalStickerImageUrls.join(',') : "",
        mainImage: finalMainImageUrls.length > 0 ? finalMainImageUrls.join(',') : "",
        fabric: {
          structure: (form as any).structure || undefined,
          fabricName: (form as any).fabricName || undefined,
          composition: (form as any).composition || undefined,
          compositionDetail: (form as any).compositionDetail || undefined,
          function: (form as any).function || undefined,
          weightGsm: toNum((form as any).weightGsm),
          cuttableWidth: toNum((form as any).cuttableWidth),
          colorName: (form as any).colorName || undefined,
          hasSy: (form as any).hasSy,
        },
        priceUnit: form.priceUnit || undefined,
        moqMcqUnit: form.moqMcqUnit || undefined,
        mcqSurcharge: undefined,
        moqSurcharge: undefined,
      };

      let saved: Item;
      if (isEdit && item) {
        saved = await rdItemApi.update(item.id, payload as Partial<Item>);
      } else {
        saved = await rdItemApi.create(payload as Partial<Item>);
      }
      
      setPendingMainImages([]);
      setPendingStickerImages([]);
      
      setSnackbar({ open: true, message: t('rdMaterial.save_success', 'Saved successfully'), severity: 'success' });
      onSaved(saved);
      if (printAfter) navigate(`${BASE}/label/${saved.id}`);
    } catch (err: unknown) {
      console.error('Backend error:', err);
      setSnackbar({ open: true, message: t('rdMaterial.save_error', 'Failed to save item'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };


  const handlePaste = async (e: React.ClipboardEvent) => {
    if (!open) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length === 0) return;
    
    if (files.some(f => f.size > 5 * 1024 * 1024)) {
      return setSnackbar({ open: true, message: t('rdMaterial.image_too_large', 'Image size > 5MB'), severity: 'warning' });
    }

    // Open dialog to let user choose target
    setPastedFiles(files);
  };


  const confirmPaste = async (targetField: 'mainImage' | 'stickerImage') => {
    if (pastedFiles.length === 0) return;
    if (targetField === 'mainImage') {
      setPendingMainImages(prev => [...prev, ...pastedFiles]);
    } else {
      setPendingStickerImages(prev => [...prev, ...pastedFiles]);
    }
    setSnackbar({ open: true, message: t('rdMaterial.image_pasted_success', 'Image pasted successfully'), severity: 'success' });
    setPastedFiles([]);
  };

  return (
    <Drawer open={open} ModalProps={{ keepMounted: true }} anchor="right" onPaste={handlePaste} sx={{ zIndex: 9999 }} PaperProps={{ sx: { width: { xs: '100%', md: '85vw', xl: 1400 }, maxWidth: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column' } }}>
      {/* Header */}
      <Box sx={{ px: 3, py: 2.5, background: 'linear-gradient(135deg, #2e7d32 0%, #3ba55c 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography fontWeight={800} fontSize={18} color="#fff" sx={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{isEdit ? t('rdMaterial.edit_fabric_hanger', 'Edit Vải Hanger') : (isCopy ? t('rdMaterial.copy_fabric_hanger', 'Copy Vải Hanger') : t('rdMaterial.add_fabric_hanger', 'Thêm Vải Hanger'))}</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}><CloseIcon /></IconButton>
      </Box>

            {/* Body */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: { xs: 'auto', md: 'hidden' }, p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: '100%', maxWidth: 1440, height: { xs: 'auto', md: '100%' }, display: 'flex', flexDirection: 'column' }}>
          <Grid container spacing={4} sx={{ height: { xs: 'auto', md: '100%' }, minHeight: 0, flex: 1 }}>
          
          {/* LEFT COLUMN: Master Item & Picture */}
          <Grid size={{ xs: 12, md: 4 }} sx={{ height: { xs: 'auto', md: '100%' }, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, overflowY: { xs: 'visible', md: 'auto' }, pr: { xs: 0, md: 1 } }}>
              <Stack spacing={4}>
              
              {/* MASTER ITEM BLOCK */}
              <Card elevation={0} sx={{ borderRadius: 0, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.04)' }}>
                <CardHeader 
                  title="Master Item" 
                  titleTypographyProps={{ variant: 'overline', fontWeight: 800, sx: { letterSpacing: 1, fontSize: 13, color: '#0f172a' } }}
                  sx={{ bgcolor: '#fff', py: 2, borderBottom: '1px solid rgba(0,0,0,0.04)', borderLeft: '4px solid #2e7d32' }}
                  action={
                    <IconButton onClick={() => setShowMaster(!showMaster)} size="small" sx={{ color: '#64748b' }}>
                      {showMaster ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  }
                />
                <Collapse in={showMaster}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2.5}>
                      <AppTextField label={t('rdMaterial.erp_number', 'ERP Number')} size="small" value={form.name ?? ''} debounceMs={200} onDebounceChange={(val) => set('name', val)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover': { bgcolor: '#f1f5f9' }, '&.Mui-focused': { bgcolor: '#fff' } } }} />
                      <AppTextField label={t('rdMaterial.description', 'Description')} size="small" value={form.description ?? ''} debounceMs={200} onDebounceChange={(val) => set('description', val)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover': { bgcolor: '#f1f5f9' }, '&.Mui-focused': { bgcolor: '#fff' } } }} />
                    </Stack>
                  </CardContent>
                </Collapse>
              </Card>

              {/* PICTURE BLOCK */}
              <Card elevation={0} sx={{ borderRadius: 0, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.04)' }}>
                <CardHeader 
                  title={t('rdMaterial.picture_title', '1. Picture')} 
                  titleTypographyProps={{ variant: 'overline', fontWeight: 800, sx: { letterSpacing: 1, fontSize: 13, color: '#0f172a' } }}
                  sx={{ bgcolor: '#fff', py: 2, borderBottom: '1px solid rgba(0,0,0,0.04)', borderLeft: '4px solid #3ba55c' }}
                />
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} mb={1} display="block">{t('rdMaterial.fabric_image', 'Fabric Image')}</Typography>
                      <Box display="flex" gap={1}>
                        <Box sx={{ flex: 1 }}>
                          <input type="file" multiple id="main-file-upload" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageCapture(e, 'mainImage')} />
                          <label htmlFor="main-file-upload">
                            <Box sx={{ border: '1px dashed #cbd5e1', borderRadius: 1, bgcolor: '#f8fafc', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#f1f5f9', borderColor: '#3ba55c' } }}>
                              <UploadFileIcon sx={{ color: '#94a3b8', fontSize: 20, mr: 1 }} />
                              <Typography variant="caption" fontWeight={600}>{t('rdMaterial.library', 'Thư viện')}</Typography>
                            </Box>
                          </label>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <input type="file" multiple id="main-cam-upload" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handleImageCapture(e, 'mainImage')} />
                          <label htmlFor="main-cam-upload">
                            <Box sx={{ border: '1px dashed #6ee7b7', borderRadius: 1, bgcolor: '#f0fdf4', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#dcfce7', borderColor: '#2e7d32' } }}>
                              <PhotoCameraIcon sx={{ color: '#2e7d32', fontSize: 20, mr: 1 }} />
                              <Typography variant="caption" fontWeight={600} color="#2e7d32">{t('rdMaterial.camera', 'Máy ảnh')}</Typography>
                            </Box>
                          </label>
                        </Box>
                      </Box>
                      <Box mt={1.5} display="flex" flexWrap="wrap" gap={1}>
                        {form.mainImage && String(form.mainImage).split(',').filter(Boolean).map((url, idx) => (
                          <Tooltip 
                            key={idx} placement="right" 
                            title={<Box sx={{ width: 600, height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.95)', borderRadius: 2, overflow: 'hidden' }}><img src={rdItemApi.getImageUrl(url)} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /></Box>}
                            componentsProps={{ popper: { sx: { zIndex: 10000 } }, tooltip: { sx: { p: 0, bgcolor: 'transparent', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', maxWidth: 'none', borderRadius: 2 } } }}
                          >
                            <Box sx={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 1, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', bgcolor: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} onClick={() => setLightboxImage(url)}>
                              <img className="main-img" src={rdItemApi.getImageUrl(url)} alt="Image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                              <IconButton size="small" sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(255,255,255,0.8)', p: 0.5, backdropFilter: 'blur(4px)', '&:hover': { bgcolor: '#ef4444', color: 'white' } }} onClick={(e) => { e.stopPropagation(); removeImage('mainImage', idx); }}>
                                <CloseIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Box>
                          </Tooltip>
                        ))}
                        {pendingMainImages.map((file, idx) => (
                          <Tooltip 
                            key={`pending-main-${idx}`} placement="right" 
                            title={<Box sx={{ width: 600, height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.95)', borderRadius: 2, overflow: 'hidden' }}><PreviewImage file={file} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /></Box>}
                            componentsProps={{ popper: { sx: { zIndex: 10000 } }, tooltip: { sx: { p: 0, bgcolor: 'transparent', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', maxWidth: 'none', borderRadius: 2 } } }}
                          >
                            <Box sx={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 1, overflow: 'hidden', border: '1px solid #3ba55c', bgcolor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                              <PreviewImage className="main-img" file={file} alt="Pending Main" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <IconButton size="small" sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(255,255,255,0.8)', p: 0.5, backdropFilter: 'blur(4px)', '&:hover': { bgcolor: '#ef4444', color: 'white' } }} onClick={(e) => { e.stopPropagation(); setPendingMainImages(prev => prev.filter((_, i) => i !== idx)); }}>
                                <CloseIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(59, 165, 92, 0.8)', color: '#fff', fontSize: 10, textAlign: 'center', py: 0.5 }}>Chưa lưu</Box>
                            </Box>
                          </Tooltip>
                        ))}
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} mb={1} display="block">{t('rdMaterial.sticker_image', 'Sticker Image')}</Typography>
                      <Box display="flex" gap={1}>
                        <Box sx={{ flex: 1 }}>
                          <input type="file" multiple id="stk-file-upload" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageCapture(e, 'stickerImage')} />
                          <label htmlFor="stk-file-upload">
                            <Box sx={{ border: '1px dashed #cbd5e1', borderRadius: 1, bgcolor: '#f8fafc', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#f1f5f9', borderColor: '#3ba55c' } }}>
                              <UploadFileIcon sx={{ color: '#94a3b8', fontSize: 20, mr: 1 }} />
                              <Typography variant="caption" fontWeight={600}>{t('rdMaterial.library', 'Thư viện')}</Typography>
                            </Box>
                          </label>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <input type="file" multiple id="stk-cam-upload" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handleImageCapture(e, 'stickerImage')} />
                          <label htmlFor="stk-cam-upload">
                            <Box sx={{ border: '1px dashed #6ee7b7', borderRadius: 1, bgcolor: '#f0fdf4', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#dcfce7', borderColor: '#2e7d32' } }}>
                              <PhotoCameraIcon sx={{ color: '#2e7d32', fontSize: 20, mr: 1 }} />
                              <Typography variant="caption" fontWeight={600} color="#2e7d32">{t('rdMaterial.camera', 'Máy ảnh')}</Typography>
                            </Box>
                          </label>
                        </Box>
                      </Box>
                      <Box mt={1.5} display="flex" flexWrap="wrap" gap={1}>
                        {form.stickerImage && String(form.stickerImage).split(',').filter(Boolean).map((url, idx) => (
                          <Tooltip 
                            key={idx} placement="right" 
                            title={<Box sx={{ width: 600, height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.95)', borderRadius: 2, overflow: 'hidden' }}><img src={rdItemApi.getImageUrl(url)} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /></Box>}
                            componentsProps={{ popper: { sx: { zIndex: 10000 } }, tooltip: { sx: { p: 0, bgcolor: 'transparent', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', maxWidth: 'none', borderRadius: 2 } } }}
                          >
                            <Box sx={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 1, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', bgcolor: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} onClick={() => setLightboxImage(url)}>
                              <img className="stk-img" src={rdItemApi.getImageUrl(url)} alt="Sticker" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                              <IconButton size="small" sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(255,255,255,0.8)', p: 0.5, backdropFilter: 'blur(4px)', '&:hover': { bgcolor: '#ef4444', color: 'white' } }} onClick={(e) => { e.stopPropagation(); removeImage('stickerImage', idx); }}>
                                <CloseIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Box>
                          </Tooltip>
                        ))}
                        {pendingStickerImages.map((file, idx) => (
                          <Tooltip 
                            key={`pending-stk-${idx}`} placement="right" 
                            title={<Box sx={{ width: 600, height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.95)', borderRadius: 2, overflow: 'hidden' }}><PreviewImage file={file} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /></Box>}
                            componentsProps={{ popper: { sx: { zIndex: 10000 } }, tooltip: { sx: { p: 0, bgcolor: 'transparent', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', maxWidth: 'none', borderRadius: 2 } } }}
                          >
                            <Box sx={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 1, overflow: 'hidden', border: '1px solid #3ba55c', bgcolor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                              <PreviewImage className="stk-img" file={file} alt="Pending Sticker" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <IconButton size="small" sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(255,255,255,0.8)', p: 0.5, backdropFilter: 'blur(4px)', '&:hover': { bgcolor: '#ef4444', color: 'white' } }} onClick={(e) => { e.stopPropagation(); setPendingStickerImages(prev => prev.filter((_, i) => i !== idx)); }}>
                                <CloseIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(59, 165, 92, 0.8)', color: '#fff', fontSize: 10, textAlign: 'center', py: 0.5 }}>Chưa lưu</Box>
                            </Box>
                          </Tooltip>
                        ))}
                      </Box>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

            </Stack>
          </Box>
        </Grid>

        {/* RIGHT COLUMN: ITEM DETAILS */}
        <Grid size={{ xs: 12, md: 8 }} sx={{ height: { xs: 'auto', md: '100%' }, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, overflowY: { xs: 'visible', md: 'auto' }, pr: { xs: 0, md: 1 } }}>
            <Card elevation={0} sx={{ borderRadius: 0, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.04)', minHeight: '100%' }}>
              <CardHeader 
                title={<span>ItemNo (Item Code) <span style={{color: '#ef4444'}}>*</span></span>} 
                titleTypographyProps={{ variant: 'overline', fontWeight: 800, sx: { letterSpacing: 1, fontSize: 13, color: '#0f172a' } }}
                sx={{ bgcolor: '#fff', py: 2, borderBottom: '1px solid rgba(0,0,0,0.04)', borderLeft: '4px solid #2e7d32' }}
                action={
                  <IconButton onClick={() => setShowItemDetails(!showItemDetails)} size="small" sx={{ color: '#64748b' }}>
                    {showItemDetails ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                  </IconButton>
                }
              />
              <Collapse in={showItemDetails}>
                <CardContent sx={{ p: 0 }}>
                  
                  {/* ITEM CODE HIGHLIGHT */}
                  <Box p={4} pb={2}>
                    <TextField 
                      inputRef={itemCodeRef}
                      placeholder="Enter Item Code / Item No..." 
                      variant="standard" 
                      required 
                      fullWidth 
                      value={form.itemCode ?? ''} 
                      onChange={(e) => {
                        set('itemCode', e.target.value);
                        if (errors.itemCode) {
                          setErrors(prev => ({ ...prev, itemCode: false }));
                        }
                        if (duplicateCodeError) {
                          setDuplicateCodeError(false);
                        }
                      }} 
                      onBlur={() => {
                        checkDuplicate(form.itemCode || '');
                      }}
                      InputProps={{ disableUnderline: true, sx: { fontSize: { xs: 24, md: 32 }, fontWeight: 800, color: '#0f172a', '& input::placeholder': { color: '#cbd5e1', opacity: 1 } } }} 
                      sx={{ 
                        bgcolor: (errors.itemCode || duplicateCodeError) ? '#fef2f2' : '#f8fafc', 
                        p: 2, 
                        borderRadius: 1, 
                        border: (errors.itemCode || duplicateCodeError) ? '1.5px solid #ef4444' : (shakeFields.itemCode ? '1.5px solid #ef4444' : '1px dashed #cbd5e1'), 
                        transition: 'all 0.2s', 
                        '&:hover': { borderColor: (errors.itemCode || duplicateCodeError || shakeFields.itemCode) ? '#ef4444' : '#94a3b8', bgcolor: (errors.itemCode || duplicateCodeError) ? '#fef2f2' : '#f1f5f9' }, 
                        '&:focus-within': { 
                          borderColor: (errors.itemCode || duplicateCodeError) ? '#ef4444' : '#2563eb', 
                          bgcolor: '#fff', 
                          boxShadow: (errors.itemCode || duplicateCodeError) ? '0 0 0 4px rgba(239,68,68,0.15)' : '0 0 0 4px rgba(37,99,235,0.1)' 
                        },
                        animation: shakeFields.itemCode ? 'shake 0.5s ease-in-out' : 'none',
                        '@keyframes shake': {
                          '0%, 100%': { transform: 'translateX(0)' },
                          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
                          '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' }
                        }
                      }} 
                    />
                    {duplicateCodeError && (
                      <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 600, mt: 1, display: 'block', px: 2 }}>
                        Mã hàng này đã tồn tại trong hệ thống! Vui lòng chọn mã khác.
                      </Typography>
                    )}
                  </Box>

                  <Stack spacing={0} divider={<Divider sx={{ borderStyle: 'dashed', borderColor: '#e2e8f0', mx: 4 }} />}>
                    
                    {/* 2. Specification */}
                    <Box p={4}>
                      <Typography variant="subtitle2" sx={{ color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }} fontWeight={800} mb={3}>{t('rdMaterial.specs_title', '2. Specification')}</Typography>
                      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                        <Autocomplete componentsProps={{ popper: { style: { zIndex: 10000 } } }} forcePopupIcon options={structureOpts} freeSolo size="small" value={(form as any).structure ?? ''} onChange={(_, val) => set('structure', val)} onInputChange={(_, val, reason) => { if (reason === 'input' || reason === 'clear') set('structure', val); }} renderInput={(params) => <TextField {...params} label={t('rdMaterial.structure', 'Structure')} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />} />
                        <AppTextField label={t('rdMaterial.fabric_name', 'Fabric Name')} size="small" value={(form as any).fabricName ?? ''} debounceMs={200} onDebounceChange={(val) => set('fabricName', val)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        <AppTextField label={t('rdMaterial.composition', 'Composition')} size="small" value={(form as any).composition ?? ''} debounceMs={200} onDebounceChange={(val) => set('composition', val)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        <AppTextField label={t('rdMaterial.function', 'Function')} size="small" value={(form as any).function ?? ''} debounceMs={200} onDebounceChange={(val) => set('function', val)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        <AppTextField label={t('rdMaterial.weight_gsm', 'Weight (GSM)')} size="small" type="number" inputProps={{ min: 0 }} value={(form as any).weightGsm ?? ''} debounceMs={200} onDebounceChange={(val) => set('weightGsm', val)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        <AppTextField label={t('rdMaterial.width', 'Cuttable width (inch)')} size="small" type="number" inputProps={{ min: 0 }} value={(form as any).cuttableWidth ?? ''} debounceMs={200} onDebounceChange={(val) => set('cuttableWidth', val)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                      </Box>
                    </Box>

                    {/* 3. Supplier */}
                    <Box p={4}>
                      <Typography variant="subtitle2" sx={{ color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }} fontWeight={800} mb={3}>{t('rdMaterial.supplier_title', '3. Supplier')}</Typography>
                      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                        <AppTextField label={t('rdMaterial.supplier', 'Supplier Name')} size="small" value={form.supplierName ?? ''} debounceMs={200} onDebounceChange={(val) => set('supplierName', val)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        <AppTextField label={t('rdMaterial.origin', 'Origin')} size="small" value={form.origin ?? ''} debounceMs={200} onDebounceChange={(val) => set('origin', val)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                      </Box>
                    </Box>
                    {/* 4. Cost */}
                    <Box p={4}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Typography variant="subtitle2" sx={{ color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }} fontWeight={800}>{t('rdMaterial.cost_title', '4. Cost')}</Typography>
                        <Button 
                          size="small" 
                          startIcon={<HistoryIcon />} 
                          onClick={() => setHistoryOpen(true)}
                          sx={{ textTransform: 'none', color: '#15803d', fontWeight: 600, fontSize: 13 }}
                        >
                          {t('rdMaterial.submitted_cost', 'Submitted cost')}
                        </Button>
                      </Box>
                      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <AppTextField 
                            label={t('rdMaterial.price', 'Price')} size="small" type="number" inputProps={{ min: 0 }}
                            value={form.price ?? ''} debounceMs={200} onDebounceChange={(val) => set('price', val)} 
                            sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }}
                          />
                          <Autocomplete 
                            componentsProps={{ popper: { style: { zIndex: 10000 } } }} 
                            forcePopupIcon options={currencyOpts} 
                            value={form.currency || 'USD'} 
                            onChange={(_, newVal) => {
                              set('currency', newVal || '');
                              if (errors.currency) {
                                setErrors(prev => ({ ...prev, currency: false }));
                              }
                            }} 
                            disableClearable size="small" 
                            sx={{ 
                              width: 100,
                              '& .MuiOutlinedInput-root': { 
                                bgcolor: errors.currency ? '#fef2f2' : '#f8fafc', 
                                borderRadius: 1,
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: errors.currency ? '#ef4444' : (shakeFields.currency ? '#ef4444' : undefined),
                                  borderWidth: (errors.currency || shakeFields.currency) ? '1.5px' : undefined,
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: errors.currency ? '#ef4444' : undefined,
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: errors.currency ? '#ef4444' : undefined,
                                },
                                '&:hover': { bgcolor: errors.currency ? '#fef2f2' : '#f1f5f9' },
                                '&.Mui-focused': { bgcolor: '#fff' }
                              },
                              animation: shakeFields.currency ? 'shake 0.5s ease-in-out' : 'none',
                              '@keyframes shake': {
                                '0%, 100%': { transform: 'translateX(0)' },
                                '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
                                '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' }
                              }
                            }} 
                            renderInput={(params) => <TextField {...params} inputRef={currencyRef} label={t('rdMaterial.currency', 'Curr')} size="small" />} 
                          />
                          <Typography sx={{ color: 'text.disabled', fontWeight: 600 }}>/</Typography>
                          <Autocomplete 
                            componentsProps={{ popper: { style: { zIndex: 10000 } } }} 
                            forcePopupIcon options={unitOpts} 
                            freeSolo size="small" 
                            value={form.priceUnit || null} 
                            onChange={(_, v) => {
                              set('priceUnit', v || '');
                              if (errors.priceUnit) {
                                setErrors(prev => ({ ...prev, priceUnit: false }));
                              }
                            }} 
                            onInputChange={(_, v, reason) => { 
                              if (reason === 'input' || reason === 'clear') {
                                  set('priceUnit', v);
                                  if (errors.priceUnit) {
                                    setErrors(prev => ({ ...prev, priceUnit: false }));
                                  }
                                }
                            }} 
                            sx={{ 
                              width: 110,
                              '& .MuiOutlinedInput-root': { 
                                bgcolor: errors.priceUnit ? '#fef2f2' : '#f8fafc', 
                                borderRadius: 1,
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: errors.priceUnit ? '#ef4444' : (shakeFields.priceUnit ? '#ef4444' : undefined),
                                  borderWidth: (errors.priceUnit || shakeFields.priceUnit) ? '1.5px' : undefined,
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: errors.priceUnit ? '#ef4444' : undefined,
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: errors.priceUnit ? '#ef4444' : undefined,
                                },
                                '&:hover': { bgcolor: errors.priceUnit ? '#fef2f2' : '#f1f5f9' },
                                '&.Mui-focused': { bgcolor: '#fff' }
                              },
                              animation: shakeFields.priceUnit ? 'shake 0.5s ease-in-out' : 'none',
                              '@keyframes shake': {
                                '0%, 100%': { transform: 'translateX(0)' },
                                '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
                                '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' }
                              }
                            }} 
                            renderInput={(params) => <TextField {...params} inputRef={priceUnitRef} label={t('rdMaterial.unit', 'Unit')} size="small" />} 
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <AppTextField label={t('rdMaterial.moqMcq', 'MOQ/MCQ')} fullWidth size="small" 
                            sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }}
                            value={form.moqMcq || ''} debounceMs={200} onDebounceChange={(val) => set('moqMcq', val)} 
                          />
                          <Autocomplete 
                            componentsProps={{ popper: { style: { zIndex: 10000 } } }} 
                            forcePopupIcon options={moqUnitOpts} 
                            freeSolo size="small" 
                            value={form.moqMcqUnit || null} 
                            onChange={(_, v) => set('moqMcqUnit', v || '')} 
                            onInputChange={(_, v, reason) => { if (reason === 'input' || reason === 'clear') set('moqMcqUnit', v); }} 
                            sx={{ width: 110 }} 
                            renderInput={(params) => <TextField {...params} label={t('rdMaterial.unit', 'Unit')} size="small" sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1 } }} />} 
                          />
                        </Box>
                        <AppTextField label={t('rdMaterial.surcharge_str', 'Surcharge ($)')} size="small" multiline rows={3} value={form.surchargeStr ?? ''} debounceMs={200} onDebounceChange={(val) => set('surchargeStr', val)} sx={{ gridColumn: '1/-1', '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        <Autocomplete
                          componentsProps={{ popper: { style: { zIndex: 10000 } } }}
                          forcePopupIcon
                          options={customerOpts}
                          freeSolo
                          size="small"
                          value={form.customer || null}
                          onChange={(_, v) => set('customer', v || '')}
                          onInputChange={(_, v, reason) => { if (reason === 'input' || reason === 'clear') set('customer', v); }}
                          renderInput={(params) => (
                            <TextField 
                              {...params} 
                              label={t('rdMaterial.customer', 'Customer')} 
                              sx={{ 
                                '& .MuiOutlinedInput-root': { 
                                  bgcolor: '#f8fafc', 
                                  borderRadius: 1, 
                                  '&:hover': { bgcolor: '#f1f5f9' }, 
                                  '&.Mui-focused': { bgcolor: '#fff' } 
                                } 
                              }} 
                            />
                          )}
                        />
                        <AppTextField label={t('rdMaterial.leadtime_with_greige', 'Leadtime with greige')} size="small" multiline rows={3} value={form.leadtimeWithGreige ?? ''} debounceMs={200} onDebounceChange={(val) => set('leadtimeWithGreige', val)} sx={{ gridColumn: '1/-1', '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        <AppTextField label={t('rdMaterial.leadtime_without_greige', 'Leadtime without greige')} size="small" multiline rows={3} value={form.leadtimeWithoutGreige ?? ''} debounceMs={200} onDebounceChange={(val) => set('leadtimeWithoutGreige', val)} sx={{ gridColumn: '1/-1', '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                      </Box>
                    </Box>
 
                    {/* Remaining fields */}
                    <Box p={4}>
                      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                        <TextField 
                          inputRef={quantityRef}
                          label={t('rdMaterial.qty_of_hanger', 'Qty of hanger')} 
                          size="small" 
                          type="number" 
                          value={form.quantity ?? ''} 
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              set('quantity', '');
                              return;
                            }
                            const num = Number(val);
                            if (!isNaN(num) && num >= 0) {
                              set('quantity', num);
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
                            '@keyframes shake': {
                              '0%, 100%': { transform: 'translateX(0)' },
                              '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
                              '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' }
                            }
                          }} 
                        />
                        <AppTextField label={t('rdMaterial.location', 'Hanger location')} size="small" value={form.location ?? ''} debounceMs={200} onDebounceChange={(val) => set('location', val)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        <AppTextField label={t('rdMaterial.remark', 'Remark')} size="small" multiline rows={3} value={form.remark ?? ''} debounceMs={200} onDebounceChange={(val) => set('remark', val)} sx={{ gridColumn: '1/-1', '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        <Box sx={{ gridColumn: '1/-1', bgcolor: '#f0fdf4', p: 1.5, borderRadius: 1, border: '1px solid #bbf7d0', display: 'inline-flex', width: 'fit-content' }}>
                          <FormControlLabel
                            control={<Checkbox size="small" checked={!!(form as any).hasSy} onChange={(e) => set('hasSy', e.target.checked)} sx={{ color: '#22c55e', '&.Mui-checked': { color: '#16a34a' } }} />}
                            label={<Typography variant="body2" fontWeight={700} color="#166534">{t('rdMaterial.has_sy', 'Sample Yardage')}</Typography>}
                            sx={{ m: 0 }}
                          />
                        </Box>
                      </Box>
                    </Box>

                  </Stack>
                </CardContent>
              </Collapse>
            </Card>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>

      {/* Footer */}
      <Box sx={{ position: 'sticky', bottom: 0, zIndex: 10, px: 4, py: 2.5, borderTop: '1px solid rgba(0,0,0,0.05)', bgcolor: '#fff', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 1, px: 3, fontWeight: 700, borderColor: '#cbd5e1', color: '#64748b', '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' } }}>
          {t('rdMaterial.cancel', 'Cancel')}
        </Button>
        <Button onClick={() => handleSave(false)} variant="contained" disabled={loading} sx={{ borderRadius: 1, px: 4, fontWeight: 700, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' }, boxShadow: '0 4px 14px 0 rgba(46, 125, 50, 0.39)' }}>
          {loading ? t('rdMaterial.print_loading', 'Loading...') : t('rdMaterial.save', 'Save')}
        </Button>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} sx={{ zIndex: 99999 }}>
        <Alert severity={snackbar.severity as any} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
      <Dialog open={!!lightboxImage} onClose={() => setLightboxImage(null)} maxWidth="lg" sx={{ zIndex: 99999 }} PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none' } }}>
        <Box position="relative">
          <IconButton onClick={() => setLightboxImage(null)} sx={{ position: 'absolute', right: -20, top: -20, color: 'white', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'red' } }}><CloseIcon /></IconButton>
          <img src={lightboxImage || ''} alt="Full Size" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} />
        </Box>
      </Dialog>

      {/* Paste Selection Dialog */}
      <Dialog open={pastedFiles.length > 0} onClose={() => setPastedFiles([])} maxWidth="xs" fullWidth sx={{ zIndex: 99999 }} PaperProps={{ sx: { borderRadius: 2, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 700, textAlign: 'center' }}>Paste Image</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Detected {pastedFiles.length} image(s) from clipboard. Where do you want to paste?
          </Typography>
          {pastedFiles.length > 0 && (
            <Box sx={{ width: 120, height: 120, borderRadius: 1, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <PreviewImage file={pastedFiles[0]} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2, gap: 1 }}>
          <Button onClick={() => setPastedFiles([])} color="inherit" sx={{ borderRadius: 1, fontWeight: 600 }}>Cancel</Button>
          <Button onClick={() => confirmPaste('stickerImage')} variant="outlined" color="primary" sx={{ borderRadius: 1, fontWeight: 600 }}>Sticker Image</Button>
          <Button onClick={() => confirmPaste('mainImage')} variant="contained" color="primary" sx={{ borderRadius: 1, fontWeight: 600 }}>Fabric Image</Button>
        </DialogActions>
      </Dialog>

      {/* Submitted Cost History Dialog */}
      <Dialog 
        open={historyOpen} 
        onClose={() => setHistoryOpen(false)} 
        maxWidth="md" 
        fullWidth 
        sx={{ zIndex: 99999 }}
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography component="span" variant="h6" fontWeight={700} color="#0f172a">Submitted Cost History</Typography>
          <IconButton onClick={() => setHistoryOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {(() => {
            let historyList: any[] = [];
            try {
              if (form.priceHistory) {
                historyList = JSON.parse(form.priceHistory);
              } else if (item && item.priceHistory) {
                historyList = JSON.parse(item.priceHistory);
              }
            } catch (e) {
              console.warn('Error parsing price history', e);
            }

            if (!Array.isArray(historyList) || historyList.length === 0) {
              return (
                <Box py={6} textAlign="center">
                  <Typography color="text.secondary" fontSize={14}>No cost submission history found.</Typography>
                </Box>
              );
            }

            return (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 600 }}>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Price</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 1.5 }}>MOQ/MCQ</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Surcharge</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Leadtime (Greige)</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Leadtime (No Greige)</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 1.5 }}>User</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyList.map((entry: any, index: number) => (
                      <TableRow key={index} hover>
                        <TableCell sx={{ fontSize: 13, py: 1.5 }}>
                          {entry.date ? new Date(entry.date).toLocaleString('vi-VN', { 
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          }) : '–'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, py: 1.5, fontWeight: 600, color: '#0369a1' }}>
                          {entry.customer || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, py: 1.5, fontWeight: 700 }}>
                          {entry.price ? `${entry.price} ${entry.currency || 'USD'}${entry.priceUnit ? '/' + entry.priceUnit : ''}` : '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, py: 1.5 }}>
                          {entry.moqMcq ? `${entry.moqMcq} ${entry.moqMcqUnit || ''}`.trim() : '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, py: 1.5, color: '#ef4444', fontWeight: 500 }}>
                          {entry.surchargeStr || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, py: 1.5 }}>
                          {entry.leadtimeWithGreige || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, py: 1.5 }}>
                          {entry.leadtimeWithoutGreige || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, py: 1.5, color: 'text.secondary' }}>
                          {entry.user || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)} sx={{ fontWeight: 600 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default FabricFormDrawer;
