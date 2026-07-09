import React, { useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, Drawer, DialogContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, DialogActions, IconButton, TextField, Typography, Card, CardHeader, CardContent,
  Divider, Stack, Snackbar, Alert, CircularProgress, Autocomplete, Collapse, ToggleButton, ToggleButtonGroup, Grid, Tooltip, MenuItem, Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ImageIcon from '@mui/icons-material/Image';
import { useNavigate } from 'react-router-dom';
import { rdItemApi } from '../services/rdMaterialApi';
import type { Item } from '../types';
import { useTranslation } from 'react-i18next';
import { AppTextField, authService } from '@traxeco/shared';

const BASE = '/rd-material';

/** Label + value display row for mini detail popup */
const InfoRow = ({ label, value, italic }: { label: string; value?: React.ReactNode; italic?: boolean }) => (
  <Box>
    <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
      {label}
    </Typography>
    <Typography component="div" sx={{ fontSize: 16, color: value ? '#111827' : '#6b7280', fontWeight: value ? 600 : 500, fontStyle: italic ? 'italic' : 'normal' }}>
      {value ?? '—'}
    </Typography>
  </Box>
);

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

const ProductFormDrawer: React.FC<Props> = ({ open, item, isCopy, onClose, onSaved }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isEdit = !!item && !isCopy;

  const [form, setForm] = useState<any>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);
  const [showMaster, setShowMaster] = useState(false);
  const [showItemDetails, setShowItemDetails] = useState(true);
  const itemCodeRef = React.useRef<HTMLInputElement | null>(null);
  const nameRef = React.useRef<HTMLInputElement | null>(null);
  const quantityRef = React.useRef<HTMLInputElement | null>(null);
  const [shakeFields, setShakeFields] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});

    // Dynamic Options
  const [garmentCategoryOpts, setGarmentCategoryOpts] = useState<string[]>(['Tops', 'Pants', 'Jackets', 'Polo', 'Shorts', 'Dress']);
  const [sportCategoryOpts, setSportCategoryOpts] = useState<string[]>(['Golf', 'Running', 'Training', 'Yoga', 'Lifestyle']);
  const [sampleStageOpts, setSampleStageOpts] = useState<string[]>(['Mock up', '1st proto', '2nd proto', 'Sales sample']);
  const [allocationOpts, setAllocationOpts] = useState<string[]>(['Puma SR', 'Adidas SR', 'R&D', 'Nike SR']);
  const [usageOpts, setUsageOpts] = useState<string[]>(['Main Fabric', 'Lining Fabric', 'Accessory']);

  // Fabrics & Accessories for Lookups
  const [materials, setMaterials] = useState<Item[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [bomList, setBomList] = useState<any[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Item | null>(null);
  const [selectedUsage, setSelectedUsage] = useState<string>('Main Fabric');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>('');

  const [popupItemId, setPopupItemId] = useState<number | null>(null);
  const [popupItem, setPopupItem] = useState<Item | null>(null);
  const [loadingPopupItem, setLoadingPopupItem] = useState(false);

  const handleOpenItemPopup = async (itemId: number) => {
    if (!itemId) return;
    setPopupItemId(itemId);
    setLoadingPopupItem(true);
    setPopupItem(null);
    try {
      let itemData = await rdItemApi.getById(itemId);
      if (itemData && itemData.itemType === 'YARDAGE' && itemData.parentId) {
        try {
          const parentData = await rdItemApi.getById(itemData.parentId);
          itemData = {
            ...parentData,
            id: itemData.id,
            parentId: itemData.parentId,
            itemCode: itemData.itemCode,
            name: itemData.name,
            quantity: itemData.quantity,
            location: itemData.location || parentData.location,
            mainImage: itemData.mainImage || parentData.mainImage,
            stickerImage: itemData.stickerImage || parentData.stickerImage,
            remark: itemData.remark || parentData.remark,
            itemType: 'YARDAGE'
          };
        } catch (e) {
          console.error("Failed to load parent fabric for yardage item", e);
        }
      }
      setPopupItem(itemData);
    } catch (err) {
      console.error("Failed to load item details for popup", err);
    } finally {
      setLoadingPopupItem(false);
    }
  };

  const handleCloseItemPopup = () => {
    setPopupItemId(null);
    setPopupItem(null);
  };

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [searchKeyword]);

  React.useEffect(() => {
    const fetchMaterials = async () => {
      if (!open) return;
      setLoadingMaterials(true);
      try {
        const res = await rdItemApi.getAll({
          keyword: debouncedKeyword || undefined,
          page: 0,
          size: 50
        });
        if (res && res.content) {
          setMaterials(res.content);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMaterials(false);
      }
    };
    fetchMaterials();
  }, [debouncedKeyword, open]);

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
          console.error(`[ProductFormDrawer] Failed to load options for ${field}:`, err);
        }
      };
      loadOptions('garmentCategory', setGarmentCategoryOpts);
      loadOptions('sportCategory', setSportCategoryOpts);
      loadOptions('sampleStage', setSampleStageOpts);
      loadOptions('allocation', setAllocationOpts);
      loadOptions('usage', setUsageOpts);
    }
  }, [open]);

  React.useEffect(() => {
    if (item) {
      let parsedBom = [];
      try {
        if (item.product?.mainComposition && item.product.mainComposition.startsWith('[')) {
          parsedBom = JSON.parse(item.product.mainComposition);
        }
      } catch (e) {}
      setBomList(parsedBom);
      setForm({
        ...item,
        category: item.category || 'Garment',
        projectName: item.product?.projectName,
        garmentCategory: item.product?.garmentCategory,
        sportCategory: item.product?.sportCategory,
        styleNo: item.product?.styleNo,
        styleName: item.product?.styleName,
        sampleStage: item.product?.sampleStage,
        color: item.product?.color,
        size: item.product?.size,
        gender: item.product?.gender,
        patternMarker: item.product?.patternMarker,
        allocation: item.product?.allocation,
        mainComposition: item.product?.mainComposition,
        liningComposition: item.product?.liningComposition,
        fobPrice: item.product?.fobPrice,
      });
    } else {
      setBomList([]);
      setForm({
        category: 'Garment',
        quantity: 1,
        itemCode: '',
        name: '',
        gender: '',
        fobPrice: undefined,
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
    const isMissingName = !form.name;
    const qty = toNum(form.quantity);
    const isMissingQty = qty === undefined || qty <= 0;

    if (isMissingCode || isMissingName || isMissingQty) {
      const newErrors = {
        itemCode: isMissingCode,
        name: isMissingName,
        quantity: isMissingQty
      };
      setErrors(newErrors);
      setShakeFields(newErrors);

      if (isMissingCode) {
        itemCodeRef.current?.focus();
      } else if (isMissingName) {
        nameRef.current?.focus();
      } else if (isMissingQty) {
        quantityRef.current?.focus();
      }

      setTimeout(() => setShakeFields({}), 500);

      const missingList: string[] = [];
      if (isMissingCode) missingList.push(t('rdMaterial.validation.missing_style_no', 'Mã hàng (Style Number) chưa nhập'));
      if (isMissingName) missingList.push(t('rdMaterial.validation.missing_erp', 'ERP Number chưa nhập'));
      if (isMissingQty) missingList.push(t('rdMaterial.validation.missing_qty', 'Số lượng (Qty) chưa nhập'));

      const errorMsg = `${t('rdMaterial.validation.check_below', 'Vui lòng kiểm tra:')} ${missingList.join(', ')}`;
      return setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    }

    // Check duplicate code
    const isDuplicate = await rdItemApi.checkDuplicateCode(form.itemCode || '', 'PRODUCT', isEdit && item ? item.id : undefined);
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

      const priceChanged = (item?.product?.fobPrice !== toNum(form.fobPrice));
      const currencyChanged = (item?.currency !== (form.currency || 'USD'));
      const customerChanged = (item?.customer !== (form.customer || ''));

      const hasCostChanged = priceChanged || currencyChanged || customerChanged;

      if (!isEdit || hasCostChanged) {
        const userInfo = authService.getUserInfo();
        const userName = userInfo?.employeeName || 'System';
        const newEntry = {
          fobPrice: toNum(form.fobPrice),
          currency: form.currency || 'USD',
          customer: form.customer || undefined,
          date: new Date().toISOString(),
          user: userName
        };
        currentHistory.unshift(newEntry);
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
        itemType: 'PRODUCT',
        itemCode: form.itemCode !== undefined && form.itemCode !== null ? form.itemCode : undefined,
        name: form.name !== undefined && form.name !== null ? form.name : undefined,
        description: form.description !== undefined && form.description !== null ? form.description : undefined,
        category: form.category !== undefined && form.category !== null ? form.category : 'Garment',
        location: form.location !== undefined && form.location !== null ? form.location : undefined,
        holder: form.holder !== undefined && form.holder !== null ? form.holder : undefined,
        remark: form.remark !== undefined && form.remark !== null ? form.remark : undefined,
        quantity: toNum(form.quantity) ?? 0,
        mainImage: finalMainImageUrls.join(',') || undefined,
        stickerImage: finalStickerImageUrls.join(',') || undefined,
        product: {
          projectName: form.projectName || undefined,
          garmentCategory: form.garmentCategory || undefined,
          sportCategory: form.sportCategory || undefined,
          styleNo: form.itemCode || undefined,
          styleName: form.styleName || undefined,
          sampleStage: form.sampleStage || undefined,
          color: form.color || undefined,
          size: form.size || undefined,
          gender: form.gender || undefined,
          patternMarker: form.patternMarker || undefined,
          allocation: form.allocation || undefined,
          mainComposition: JSON.stringify(bomList),
          liningComposition: form.liningComposition || undefined,
          fobPrice: toNum(form.fobPrice),
        },
        priceHistory: currentHistory.length > 0 ? JSON.stringify(currentHistory) : undefined,
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
        <Typography fontWeight={800} fontSize={18} color="#fff" sx={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{isEdit ? 'Edit Product' : (isCopy ? 'Copy Product' : 'Add Product')}</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}><CloseIcon /></IconButton>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: { xs: 'auto', md: 'hidden' }, p: { xs: 2, md: 4 }, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: '100%', maxWidth: 1440, height: { xs: 'auto', md: '100%' }, display: 'flex', flexDirection: 'column' }}>
          
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              color="primary"
              value={form.category || 'Garment'}
              exclusive
              onChange={(_, val) => { if (val) set('category', val); }}
              size="large"
              sx={{ bgcolor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
            >
              <ToggleButton value="Garment" sx={{ px: 5, fontWeight: 700, '&.Mui-selected': { bgcolor: '#3ba55c !important', color: '#fff !important' } }}>GARMENT</ToggleButton>
              <ToggleButton value="Mockup" sx={{ px: 5, fontWeight: 700, '&.Mui-selected': { bgcolor: '#3ba55c !important', color: '#fff !important' } }}>MOCKUP</ToggleButton>
            </ToggleButtonGroup>
          </Box>

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
                      <TextField 
                        inputRef={nameRef}
                        label="ERP Number" 
                        required
                        size="small" 
                        value={form.name ?? ''} 
                        onChange={(e) => {
                          set('name', e.target.value);
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
                          '& .MuiFormLabel-asterisk': { color: '#ef4444' },
                          animation: shakeFields.name ? 'shake 0.5s ease-in-out' : 'none',
                          '@keyframes shake': {
                            '0%, 100%': { transform: 'translateX(0)' },
                            '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
                            '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' }
                          }
                        }} 
                      />
                      <AppTextField label="Description" size="small" value={form.description ?? ''} debounceMs={200} onDebounceChange={(val) => set('description', val)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover': { bgcolor: '#f1f5f9' }, '&.Mui-focused': { bgcolor: '#fff' } } }} />
                    </Stack>
                  </CardContent>
                </Collapse>
              </Card>

              {/* PICTURE BLOCK */}
              <Card elevation={0} sx={{ borderRadius: 0, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.04)' }}>
                <CardHeader 
                  title="1. Picture" 
                  titleTypographyProps={{ variant: 'overline', fontWeight: 800, sx: { letterSpacing: 1, fontSize: 13, color: '#0f172a' } }}
                  sx={{ bgcolor: '#fff', py: 2, borderBottom: '1px solid rgba(0,0,0,0.04)', borderLeft: '4px solid #3ba55c' }}
                />
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} mb={1} display="block">Sample Image</Typography>
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
                            <Box sx={{ border: '1px dashed #6ee7b7', borderRadius: 1, bgcolor: '#f0fdf4', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#dcfce7', borderColor: '#1b5e20' } }}>
                              <PhotoCameraIcon sx={{ color: '#1b5e20', fontSize: 20, mr: 1 }} />
                              <Typography variant="caption" fontWeight={600} color="#1b5e20">{t('rdMaterial.camera', 'Máy ảnh')}</Typography>
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
                              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(46, 125, 50, 0.8)', color: '#fff', fontSize: 10, textAlign: 'center', py: 0.5 }}>Chưa lưu</Box>
                            </Box>
                          </Tooltip>
                        ))}
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} mb={1} display="block">Sticker Image</Typography>
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
                            <Box sx={{ border: '1px dashed #6ee7b7', borderRadius: 1, bgcolor: '#f0fdf4', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: '#dcfce7', borderColor: '#1b5e20' } }}>
                              <PhotoCameraIcon sx={{ color: '#1b5e20', fontSize: 20, mr: 1 }} />
                              <Typography variant="caption" fontWeight={600} color="#1b5e20">{t('rdMaterial.camera', 'Máy ảnh')}</Typography>
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
                              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(46, 125, 50, 0.8)', color: '#fff', fontSize: 10, textAlign: 'center', py: 0.5 }}>Chưa lưu</Box>
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
                title="Item Details" 
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
                  <Stack spacing={0} divider={<Divider sx={{ borderStyle: 'dashed', borderColor: '#e2e8f0', mx: 4 }} />}>
                    
                    {/* General Fields */}
                    <Box p={4}>
                      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr 1fr' }} gap={2.5}>
                        <AppTextField label="Project Name" size="small" value={form.projectName ?? ''} debounceMs={200} onDebounceChange={(val) => set('projectName', val)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        <Autocomplete componentsProps={{ popper: { style: { zIndex: 10000 } } }} forcePopupIcon options={garmentCategoryOpts} freeSolo size="small" value={form.garmentCategory ?? ''} onChange={(_, val) => set('garmentCategory', val)} onInputChange={(_, val, reason) => { if (reason === 'input' || reason === 'clear') set('garmentCategory', val); }} renderInput={(params) => <TextField {...params} label="Product Category" sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />} />
                        <Autocomplete componentsProps={{ popper: { style: { zIndex: 10000 } } }} forcePopupIcon options={sportCategoryOpts} freeSolo size="small" value={form.sportCategory ?? ''} onChange={(_, val) => set('sportCategory', val)} onInputChange={(_, val, reason) => { if (reason === 'input' || reason === 'clear') set('sportCategory', val); }} renderInput={(params) => <TextField {...params} label="Sport Category" sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />} />
                      </Box>
                    </Box>

                    {/* Style Number Section */}
                    <Box p={4}>
                      <Typography variant="subtitle2" sx={{ color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }} fontWeight={800} mb={3}>Style Number</Typography>
                      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                        <TextField 
                          inputRef={itemCodeRef}
                          label="Style Number (Item Code)" 
                          size="small"
                          required 
                          fullWidth 
                          value={form.itemCode ?? ''} 
                          onChange={(e) => {
                            set('itemCode', e.target.value);
                            if (errors.itemCode) {
                              setErrors(prev => ({ ...prev, itemCode: false }));
                            }
                          }} 
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              bgcolor: errors.itemCode ? '#fef2f2' : '#f8fafc', 
                              borderRadius: 1, 
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: errors.itemCode ? '#ef4444' : (shakeFields.itemCode ? '#ef4444' : undefined),
                                borderWidth: (errors.itemCode || shakeFields.itemCode) ? '1.5px' : undefined,
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: errors.itemCode ? '#ef4444' : undefined,
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: errors.itemCode ? '#ef4444' : undefined,
                              },
                              '&:hover': { bgcolor: errors.itemCode ? '#fef2f2' : '#f1f5f9' }, 
                              '&.Mui-focused': { bgcolor: '#fff' } 
                            },
                            '& .MuiFormLabel-asterisk': { color: '#ef4444' },
                            animation: shakeFields.itemCode ? 'shake 0.5s ease-in-out' : 'none',
                            '@keyframes shake': {
                              '0%, 100%': { transform: 'translateX(0)' },
                              '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
                              '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' }
                            }
                          }} 
                        />
                        <AppTextField label={t('rdMaterial.style_name', 'Style Name')} size="small" value={form.styleName ?? ''} debounceMs={200} onDebounceChange={(val) => set('styleName', val)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        <Autocomplete componentsProps={{ popper: { style: { zIndex: 10000 } } }} forcePopupIcon options={sampleStageOpts} freeSolo size="small" value={form.sampleStage ?? ''} onChange={(_, val) => set('sampleStage', val)} onInputChange={(_, val, reason) => { if (reason === 'input' || reason === 'clear') set('sampleStage', val); }} renderInput={(params) => <TextField {...params} label={t('rdMaterial.stage', 'Sample Stage')} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />} />
                        <AppTextField label={t('rdMaterial.color', 'Color')} size="small" value={form.color ?? ''} debounceMs={200} onDebounceChange={(val) => set('color', val)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        <Box sx={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2.5 }}>
                          <AppTextField
                            select
                            label={t('rdMaterial.gender', 'Gender')}
                            size="small"
                            value={form.gender ?? ''} debounceMs={200} onDebounceChange={(val) => set('gender', val)}
                            SelectProps={{
                              MenuProps: {
                                style: { zIndex: 10000 }
                              }
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                bgcolor: '#f8fafc',
                                borderRadius: 1,
                                '&:hover': { bgcolor: '#f1f5f9' },
                                '&.Mui-focused': { bgcolor: '#fff' }
                              }
                            }}
                          >
                            <MenuItem value="Men">{t('rdMaterial.men', 'Men')}</MenuItem>
                            <MenuItem value="Women">{t('rdMaterial.women', 'Women')}</MenuItem>
                            <MenuItem value="Unisex">{t('rdMaterial.unisex', 'Unisex')}</MenuItem>
                            <MenuItem value="Kids">{t('rdMaterial.kids', 'Kids')}</MenuItem>
                          </AppTextField>
                          <AppTextField label={t('rdMaterial.size', 'Size')} size="small" value={form.size ?? ''} debounceMs={200} onDebounceChange={(val) => set('size', val)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                           <TextField 
                            inputRef={quantityRef}
                            label={t('rdMaterial.quantity', 'Quantity')} 
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
                        </Box>
                        <Box sx={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2.5 }}>
                          <AppTextField label={t('rdMaterial.pattern_marker', 'Pattern Marker')} size="small" value={form.patternMarker ?? ''} debounceMs={200} onDebounceChange={(val) => set('patternMarker', val)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                          <Autocomplete componentsProps={{ popper: { style: { zIndex: 10000 } } }} forcePopupIcon options={allocationOpts} freeSolo size="small" value={form.allocation ?? ''} onChange={(_, val) => set('allocation', val)} onInputChange={(_, val, reason) => { if (reason === 'input' || reason === 'clear') set('allocation', val); }} renderInput={(params) => <TextField {...params} label={t('rdMaterial.allocation', 'Allocation')} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />} />
                          <AppTextField label={t('rdMaterial.location', 'Location')} size="small" value={form.location ?? ''} debounceMs={200} onDebounceChange={(val) => set('location', val)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        </Box>
                      </Box>
                    </Box>

                    {/* Material Information */}
                    <Box p={4}>
                      <Typography variant="subtitle2" sx={{ color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }} fontWeight={800} mb={3}>{t('rdMaterial.material_info', 'Material Information')}</Typography>
                      <Stack spacing={2}>
                        <Box display="flex" gap={2} alignItems="flex-start">
                          <Autocomplete
                            componentsProps={{ popper: { style: { zIndex: 10000 } } }}
                            forcePopupIcon
                            options={usageOpts}
                            freeSolo
                            size="small"
                            value={selectedUsage}
                            onChange={(_, val) => setSelectedUsage(val || '')}
                            onInputChange={(_, val, reason) => {
                              if (reason === 'input' || reason === 'clear') setSelectedUsage(val || '');
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label={t('rdMaterial.usage', 'Usage')}
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
                            sx={{ width: 180 }}
                          />
                          <Autocomplete
                            componentsProps={{ popper: { style: { zIndex: 10000 } } }}
                            options={materials}
                            getOptionLabel={(opt) => `[${opt.itemCode || 'No Code'}] ${opt.name} - ${opt.fabric?.colorName || opt.accessory?.color || ''}`}
                            isOptionEqualToValue={(option, value) => option.id === value?.id}
                            loading={loadingMaterials}
                            value={selectedMaterial}
                            onChange={(_, val) => setSelectedMaterial(val)}
                            onInputChange={(_, val, reason) => { if (reason === 'input' || reason === 'clear') setSearchKeyword(val); }}
                            renderOption={(props, option) => {
                              const { key, ...restProps } = props as any;
                              return (
                                <li key={option.id} {...restProps}>
                                  {`[${option.itemCode || 'No Code'}] ${option.name} - ${option.fabric?.colorName || option.accessory?.color || ''}`}
                                </li>
                              );
                            }}
                            renderInput={(params) => <TextField {...params} label={t('rdMaterial.search_material_placeholder', 'Search Material/Accessory')} size="small" placeholder={t('rdMaterial.type_to_search', 'Type to search DB...')} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1 } }} />}
                            sx={{ flex: 1 }}
                          />
                          <Button 
                            variant="contained" 
                            color="primary"
                            onClick={() => {
                              if (!selectedMaterial) return;
                              if (bomList.some(b => b.itemId === selectedMaterial.id && b.usage === selectedUsage)) {
                                setSnackbar({ open: true, message: t('rdMaterial.material_exist_alert', 'Mã vật tư này đã tồn tại trong danh sách!'), severity: 'warning' });
                                return;
                              }
                              const newBom = [...bomList, {
                                id: Math.random().toString(36).substring(7),
                                usage: selectedUsage,
                                itemCode: selectedMaterial.itemCode,
                                name: selectedMaterial.name,
                                color: selectedMaterial.fabric?.colorName || selectedMaterial.accessory?.color || '',
                                itemId: selectedMaterial.id,
                                itemType: selectedMaterial.category,
                                image: selectedMaterial.mainImage ? selectedMaterial.mainImage.split(',')[0] : null
                              }];
                              setBomList(newBom);
                              setSelectedMaterial(null);
                              setSearchKeyword('');
                            }}
                            sx={{ height: 40, borderRadius: 1, fontWeight: 700 }}
                          >
                            {t('rdMaterial.add', 'Add')}
                          </Button>
                        </Box>
                        
                        {bomList.length > 0 && (
                          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 700, width: 150 }}>{t('rdMaterial.usage', 'Usage')}</TableCell>
                                  <TableCell sx={{ fontWeight: 700, width: 120 }}>{t('rdMaterial.item_code', 'Item Code')}</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>{t('rdMaterial.item_name', 'Item Name')}</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>{t('rdMaterial.color', 'Color')}</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 700, width: 80 }}>{t('rdMaterial.action', 'Action')}</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {bomList.map((row, idx) => (
                                  <TableRow key={row.id || idx}>
                                    <TableCell>{row.usage}</TableCell>
                                    <TableCell>
                                      {row.itemId ? (
                                        <Button
                                          size="small"
                                          onClick={() => handleOpenItemPopup(row.itemId)}
                                          sx={{ 
                                            fontWeight: 600, 
                                            color: '#15803d', 
                                            textTransform: 'none', 
                                            p: 0, 
                                            minWidth: 0,
                                            textDecoration: 'underline',
                                            '&:hover': { bgcolor: 'transparent', textDecoration: 'none' } 
                                          }}
                                        >
                                          {row.itemCode}
                                        </Button>
                                      ) : (
                                        row.itemCode || '—'
                                      )}
                                    </TableCell>
                                    <TableCell>{row.name}</TableCell>
                                    <TableCell>{row.color}</TableCell>
                                    <TableCell align="right">
                                      <IconButton size="small" color="error" onClick={() => setBomList(bomList.filter(b => b.id !== row.id))}>
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </Stack>
                    </Box>

                    {/* Footer fields */}
                    <Box p={4}>
                      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                        <AppTextField label={t('rdMaterial.fob_price', 'FOB Price (USD/pcs)')} size="small" type="number" value={form.fobPrice ?? ''} debounceMs={200} onDebounceChange={(val) => set('fobPrice', val)} sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
                        <AppTextField label={t('rdMaterial.remark', 'Remark')} size="small" multiline rows={3} value={form.remark ?? ''} debounceMs={200} onDebounceChange={(val) => set('remark', val)} sx={{ gridColumn: '1/-1', '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 1, '&:hover':{bgcolor:'#f1f5f9'}, '&.Mui-focused':{bgcolor:'#fff'} } }} />
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
          <Button onClick={() => confirmPaste('mainImage')} variant="contained" color="primary" sx={{ borderRadius: 1, fontWeight: 600 }}>Sample Image</Button>
        </DialogActions>
      </Dialog>

      {/* Item Details Popup (without Go to Details Page button) */}
      <Dialog 
        open={popupItemId !== null} 
        onClose={handleCloseItemPopup}
        maxWidth="md"
        fullWidth
        sx={{ zIndex: 99999 }}
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', bgcolor: '#fff' }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="h6" fontWeight={700} color="#111827">Material Specifications</Typography>
            {popupItem && (
              <Chip 
                label={
                  popupItem.itemType === 'FABRIC' || popupItem.itemType === 'YARDAGE' 
                    ? 'Fabric' 
                    : 'Accessory'
                } 
                size="small" 
                sx={{ 
                  bgcolor: popupItem.itemType === 'FABRIC' || popupItem.itemType === 'YARDAGE' ? '#dcfce7' : '#f3e8ff', 
                  color: popupItem.itemType === 'FABRIC' || popupItem.itemType === 'YARDAGE' ? '#166534' : '#6b21a8', 
                  fontWeight: 600, 
                  fontSize: 11,
                  height: 20
                }} 
              />
            )}
          </Box>
          <IconButton onClick={handleCloseItemPopup} size="small" sx={{ color: '#9ca3af', '&:hover': { color: '#4b5563' } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 4, bgcolor: '#fafafa' }}>
          {loadingPopupItem ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={8}>
              <CircularProgress color="primary" />
            </Box>
          ) : !popupItem ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={8}>
              <Typography color="text.secondary">Failed to load item specs.</Typography>
            </Box>
          ) : (
            <Grid container spacing={4}>
              {/* Image Column */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box 
                  sx={{ 
                    width: '100%', 
                    aspectRatio: '1', 
                    borderRadius: 3, 
                    overflow: 'hidden', 
                    bgcolor: '#f3f4f6', 
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {(() => {
                    const imgs = popupItem.mainImage ? popupItem.mainImage.split(',').filter(Boolean) : (popupItem.stickerImage ? popupItem.stickerImage.split(',').filter(Boolean) : []);
                    return imgs.length > 0 ? (
                      <img 
                        src={rdItemApi.getImageUrl(imgs[0])} 
                        alt={popupItem.name} 
                        onClick={() => setLightboxImage(rdItemApi.getImageUrl(imgs[0]))}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                      />
                    ) : (
                      <ImageIcon sx={{ fontSize: 48, color: '#d1d5db' }} />
                    );
                  })()}
                </Box>
              </Grid>

              {/* Info Section */}
              <Grid size={{ xs: 12, sm: 8 }}>
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap={3}>
                  <InfoRow label="Item Code" value={popupItem.itemCode} />
                  <InfoRow label="Item Name" value={popupItem.name} />
                  <InfoRow label="Supplier" value={popupItem.supplierName} />
                  <InfoRow label="Origin" value={popupItem.origin} />
                  <InfoRow label="Location" value={popupItem.location} />
                  <InfoRow 
                    label="Total Stock" 
                    value={`${popupItem.quantity ?? 0} ${popupItem.priceUnit || 'pcs'}`} 
                  />
                  <InfoRow 
                    label="Price" 
                    value={popupItem.price ? `${popupItem.price} ${popupItem.currency || ''} ${popupItem.priceUnit ? `/ ${popupItem.priceUnit}` : ''}` : undefined} 
                  />
                  <InfoRow label="MOQ / MCQ" value={popupItem.moqMcq} />
                  <InfoRow label="Leadtime" value={popupItem.leadTime} />

                  {(popupItem.itemType === 'FABRIC' || popupItem.itemType === 'YARDAGE') && (
                    <>
                      <InfoRow label="Structure" value={popupItem.fabric?.structure} />
                      <InfoRow label="Fabric Name (EN)" value={popupItem.fabric?.fabricName} />
                      <InfoRow label="Composition" value={popupItem.fabric?.composition} />
                      <InfoRow label="Function" value={popupItem.fabric?.function} />
                      <InfoRow label="GSM" value={popupItem.fabric?.weightGsm ? `${popupItem.fabric.weightGsm} gsm` : undefined} />
                      <InfoRow 
                        label="Cuttable Width" 
                        value={popupItem.fabric?.cuttableWidth ? `${popupItem.fabric.cuttableWidth} inch` : undefined} 
                      />
                      <InfoRow label="Color Name" value={popupItem.fabric?.colorName} />
                    </>
                  )}

                  {popupItem.itemType === 'ACCESSORY' && (
                    <>
                      <InfoRow label="Specification" value={popupItem.accessory?.specification} />
                      <InfoRow label="Composition" value={popupItem.accessory?.composition} />
                      <InfoRow label="Color" value={popupItem.accessory?.color} />
                      <InfoRow label="Size" value={popupItem.accessory?.size} />
                      <InfoRow label="Weight" value={popupItem.accessory?.weightGsm ? `${popupItem.accessory.weightGsm} gsm` : undefined} />
                    </>
                  )}
                </Box>

                {popupItem.remark && (
                  <Box mt={3} pt={2} sx={{ borderTop: '1px solid #f3f4f6' }}>
                    <InfoRow label="Notes" value={popupItem.remark} />
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid #f3f4f6', bgcolor: '#fff', gap: 1 }}>
          <Button 
            onClick={handleCloseItemPopup} 
            variant="outlined" 
            sx={{ 
              borderRadius: 2, 
              textTransform: 'none', 
              borderColor: '#e5e7eb',
              color: '#374151',
              '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default ProductFormDrawer;
