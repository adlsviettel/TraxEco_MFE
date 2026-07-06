import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress,
  Divider, Grid, IconButton, Paper, Stack, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, TextField, Typography, Fade, Dialog,
  MenuItem, Select, Pagination
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PrintIcon from '@mui/icons-material/Print';
import LaunchIcon from '@mui/icons-material/Launch';
import CloseIcon from '@mui/icons-material/Close';
import InventoryIcon from '@mui/icons-material/Inventory';
import ImageIcon from '@mui/icons-material/Image';
import SearchIcon from '@mui/icons-material/Search';
import LayersIcon from '@mui/icons-material/Layers';
import HistoryIcon from '@mui/icons-material/History';

import { rdItemApi } from '../services/rdMaterialApi';
import type { Item, ScanLog } from '../types';
import QRScannerDialog from '../components/QRScannerDialog';
import { AppButton } from '@traxeco/shared';

const BASE = '/rd-material';

const InfoRow = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <Box sx={{ py: 1.25, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
    <Typography component="div" sx={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
    </Typography>
    <Typography component="div" sx={{ fontSize: 14, color: value ? '#0f172a' : '#94a3b8', fontWeight: 600, textAlign: 'right' }}>
      {value ?? '—'}
    </Typography>
  </Box>
);

const ImageGallery = ({ images }: { images: string[] }) => {
  const { t } = useTranslation();
  const [activeIdx, setActiveIdx] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  if (!images || images.length === 0) {
    return (
      <Box sx={{ width: '100%', aspectRatio: '1', bgcolor: '#f8fafc', borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', border: '1px dashed #e2e8f0' }}>
        <ImageIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
        <Typography variant="caption" fontWeight={600}>{t('rdMaterial.no_image', 'No Image')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2.5 }}>
      <Box 
        sx={{ 
          width: '100%', 
          aspectRatio: '1.2', 
          bgcolor: '#f8fafc', 
          borderRadius: 3, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          overflow: 'hidden', 
          cursor: 'zoom-in', 
          position: 'relative',
          border: '1px solid #e2e8f0',
          '&:hover .overlay': { opacity: 1 }
        }}
        onClick={() => setFullscreenOpen(true)}
      >
        <img 
          src={rdItemApi.getImageUrl(images[activeIdx])} 
          alt="Preview" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
        <Box 
          className="overlay" 
          sx={{ 
            position: 'absolute', 
            inset: 0, 
            bgcolor: 'rgba(0,0,0,0.15)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            opacity: 0, 
            transition: 'opacity 0.2s', 
            pointerEvents: 'none' 
          }}
        >
          <Box sx={{ p: 1, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.9)', color: '#0f172a', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <ImageIcon fontSize="small" />
          </Box>
        </Box>
      </Box>

      {images.length > 1 && (
        <Box sx={{ display: 'flex', gap: 1, pt: 1, overflowX: 'auto', '&::-webkit-scrollbar': { height: 4 } }}>
          {images.map((img, idx) => (
            <Box 
              key={idx} 
              onClick={() => setActiveIdx(idx)}
              sx={{ 
                width: 44, 
                height: 44, 
                flexShrink: 0, 
                borderRadius: 1, 
                overflow: 'hidden', 
                cursor: 'pointer',
                border: activeIdx === idx ? '2px solid #22c55e' : '1px solid #e2e8f0',
                opacity: activeIdx === idx ? 1 : 0.6,
                transition: 'all 0.2s',
                '&:hover': { opacity: 1 }
              }}
            >
              <img src={rdItemApi.getImageUrl(img)} alt={`Thumb ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>
          ))}
        </Box>
      )}

      <Dialog 
        open={fullscreenOpen} 
        onClose={() => setFullscreenOpen(false)} 
        maxWidth="lg" 
        PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none', overflow: 'hidden' } }}
      >
        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }} onClick={() => setFullscreenOpen(false)}>
          <img src={rdItemApi.getImageUrl(images[activeIdx])} alt="Fullscreen" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', cursor: 'zoom-out' }} />
          <IconButton onClick={(e) => { e.stopPropagation(); setFullscreenOpen(false); }} sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}><CloseIcon /></IconButton>
        </Box>
      </Dialog>
    </Box>
  );
};

const ScanQueryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const itemSearchTimerRef = useRef<any>(null);

  // Search State
  const [prefix, setPrefix] = useState<string>('FB');
  const [manualCode, setManualCode] = useState<string>(location.state?.code || '');
  const [searching, setSearching] = useState<boolean>(false);
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Results State
  const [item, setItem] = useState<Item | null>(null);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [logPage, setLogPage] = useState<number>(1);

  // Auto focus input on load / clearing
  useEffect(() => {
    if (!item && inputRef.current && !location.state?.code) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [item, location.state]);

  // Handle code passed from other pages via location.state
  useEffect(() => {
    const code = location.state?.code;
    if (code) {
      // Clear state so it doesn't re-trigger on reload
      navigate(location.pathname, { replace: true, state: {} });
      // Execute search
      doSearch(code);
    }
  }, [location.state, navigate]);

  const doSearch = async (codeStr: string) => {
    if (!codeStr.trim()) return;
    setSearching(true);
    setErrorMsg('');
    setItem(null);
    setScanLogs([]);
    setLogPage(1);

    try {
      let data: Item | null = null;

      // 1. Try parsing numeric ID
      const idMatch = codeStr.match(/^([A-Za-z]{2}-)?(\d+)$/);
      if (idMatch) {
        try {
          const res = await rdItemApi.getById(Number(idMatch[2]));
          if (res && res.id) data = res;
        } catch { /* ignore and fallback */ }
      }

      // 2. Try looking up by QR/code prefix
      if (!data) {
        try {
          const res = await rdItemApi.getByQrCode(codeStr);
          if (res && res.id) data = res;
        } catch { /* ignore */ }
      }

      if (data) {
        // If it is a Yardage (S/Y) item, populate parent fabric specifications
        if (data.itemType === 'YARDAGE' && data.parentId) {
          try {
            const parent = await rdItemApi.getById(data.parentId);
            data = {
              ...parent,
              id: data.id,
              parentId: data.parentId,
              itemCode: data.itemCode,
              name: data.name,
              quantity: data.quantity,
              location: data.location || parent.location,
              mainImage: data.mainImage || parent.mainImage,
              stickerImage: data.stickerImage || parent.stickerImage,
              remark: data.remark || parent.remark,
              itemType: 'YARDAGE'
            };
          } catch (e) {
            console.error('Failed to load parent fabric for yardage', e);
          }
        }

        setItem(data);

        // Fetch logs
        try {
          const logs = await rdItemApi.getScanLogs(data.id);
          setScanLogs(logs);
        } catch (e) {
          console.warn('Could not load scan logs', e);
        }
      } else {
        setErrorMsg(t('rdMaterial.scanout_not_found', 'Vật tư không tồn tại trong hệ thống. Vui lòng quét hoặc nhập mã khác!'));
      }
    } catch (err) {
      console.error('Search error', err);
      setErrorMsg(t('common.error', 'Đã xảy ra lỗi. Vui lòng thử lại.'));
    } finally {
      setSearching(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const cleaned = manualCode.trim();
    if (/^[A-Z]{2}-?\d+$/i.test(cleaned)) {
      doSearch(cleaned.toUpperCase());
    } else {
      doSearch(`${prefix}-${cleaned}`);
    }
  };

  const handleReset = () => {
    setManualCode('');
    setItem(null);
    setScanLogs([]);
    setErrorMsg('');
    setLogPage(1);
  };

  // Resolve item details URL path
  const handleNavigateToDetails = () => {
    if (!item) return;
    const type = item.itemType?.toUpperCase();
    if (type === 'FABRIC') {
      navigate(`${BASE}/fabric/${item.id}`);
    } else if (type === 'YARDAGE') {
      navigate(`${BASE}/fabric/${item.parentId || item.id}`);
    } else if (type === 'ACCESSORY') {
      navigate(`${BASE}/accessory/${item.id}`);
    } else if (type === 'PRODUCT') {
      navigate(`${BASE}/product/${item.id}`);
    } else {
      if (item.itemCode?.toUpperCase().startsWith('ACC')) {
        navigate(`${BASE}/accessory/${item.id}`);
      } else {
        navigate(`${BASE}/fabric/${item.parentId || item.id}`);
      }
    }
  };

  // Parse images list
  const getImagesList = () => {
    if (!item) return [];
    const mainImgs = item.mainImage ? item.mainImage.split(',').filter(Boolean) : [];
    const stickerImgs = item.stickerImage ? item.stickerImage.split(',').filter(Boolean) : [];
    return [...mainImgs, ...stickerImgs];
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', pt: 2, pb: 6 }}>
      {/* Dynamic Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#0f172a" sx={{ letterSpacing: '-0.5px' }}>
            {t('rdMaterial.scanQuery', 'Scan & Lookup')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('rdMaterial.scan_query_subtitle', 'Quét mã QR hoặc nhập mã số vật tư để tra cứu chi tiết đặc tính kỹ thuật và nhật ký mượn/trả.')}
          </Typography>
        </Box>
        {item && (
          <Fade in>
            <AppButton 
              variant="outlined" 
              customVariant="secondary"
              startIcon={<ArrowBackIcon />} 
              onClick={handleReset}
              sx={{ whiteSpace: 'nowrap', flexShrink: 0, ml: 2 }}
            >
              {t('rdMaterial.scanout_scan_another', 'Scan Another')}
            </AppButton>
          </Fade>
        )}
      </Box>

      {/* --- STATE 1: SEARCH BAR (Matches ScanOutPage) --- */}
      {!item && (
        <Fade in timeout={500}>
          <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            <Box sx={{ 
              width: 100, height: 100, borderRadius: '50%', bgcolor: '#f0fdf4', color: '#22c55e', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4,
              boxShadow: '0 0 0 10px rgba(34, 197, 94, 0.05)'
            }}>
              <QrCodeScannerIcon sx={{ fontSize: 48 }} />
            </Box>

            <Paper elevation={0} sx={{ 
              width: '100%', maxWidth: 700, borderRadius: '50px', p: 0.5, pl: 1.5,
              boxShadow: '0 8px 32px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', bgcolor: '#fff',
              transition: 'all 0.2s', '&:focus-within': { boxShadow: '0 8px 32px rgba(46,125,50,0.15)', borderColor: '#2e7d32' }
            }}>
              <IconButton 
                color="primary" 
                onClick={() => setScannerOpen(true)}
                sx={{ p: 1.2, bgcolor: '#f0fdf4', color: '#16a34a', mr: 1.5, transition: 'all 0.2s', '&:hover': { bgcolor: '#dcfce7', transform: 'scale(1.05)' } }}
                title="Scan QR Code"
              >
                <CameraAltIcon />
              </IconButton>
              
              <Select
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                variant="standard"
                disableUnderline
                renderValue={(value) => <Typography fontWeight={800} color="#334155">{value}</Typography>}
                sx={{ 
                  fontWeight: 800, color: '#334155',
                  height: 36, display: 'flex', alignItems: 'center',
                  minWidth: 60, borderRight: '2px solid #f1f5f9', pr: 1.5, mr: 1.5,
                  '& .MuiSelect-select': { py: 0, '&:focus': { bgcolor: 'transparent' } }
                }}
              >
                <MenuItem value="FB">FB (Fabric)</MenuItem>
                <MenuItem value="AC">AC (Accessory)</MenuItem>
                <MenuItem value="SY">SY (Yardage)</MenuItem>
                <MenuItem value="GM">GM (Garment)</MenuItem>
                <MenuItem value="MK">MK (Mockup)</MenuItem>
              </Select>

              <TextField
                inputRef={inputRef}
                fullWidth
                variant="standard"
                placeholder={t('rdMaterial.scanout_manual_input', 'Enter ID (e.g., 12)...')}
                value={manualCode}
                onChange={(e) => {
                  let val = e.target.value.toUpperCase();
                  const match = val.match(/^([A-Z]{2})[-]?(\d+)$/);
                  let newPrefix = prefix;
                  let newCode = val;
                  if (match) {
                    newPrefix = match[1];
                    setPrefix(newPrefix);
                    newCode = match[2];
                    setManualCode(newCode);
                  } else {
                    newCode = val.replace(/[^0-9A-Z-]/g, '');
                    setManualCode(newCode);
                  }
                  
                  // Debounce search (Chống lag)
                  if (itemSearchTimerRef.current) clearTimeout(itemSearchTimerRef.current);
                  if (newCode) {
                    itemSearchTimerRef.current = setTimeout(() => {
                      doSearch(`${newPrefix}-${newCode}`);
                    }, 600);
                  }
                }}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter') {
                    if (itemSearchTimerRef.current) clearTimeout(itemSearchTimerRef.current);
                    doSearch(`${prefix}-${manualCode}`);
                  }
                }}
                InputProps={{
                  disableUnderline: true,
                  sx: { fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', '& input::placeholder': { color: '#94a3b8', fontWeight: 500 } }
                }}
              />
              
              <IconButton 
                onClick={(e) => { 
                  e.preventDefault(); 
                  if (itemSearchTimerRef.current) clearTimeout(itemSearchTimerRef.current);
                  doSearch(`${prefix}-${manualCode}`); 
                }}
                disabled={!manualCode || searching}
                sx={{ 
                  width: 44, height: 44, 
                  bgcolor: !manualCode ? '#f1f5f9' : '#2e7d32', 
                  color: !manualCode ? '#94a3b8' : '#fff', 
                  '&:hover': { bgcolor: !manualCode ? '#f1f5f9' : '#1b6d24' },
                  '&.Mui-disabled': { bgcolor: '#f1f5f9', color: '#94a3b8' },
                  ml: 1, flexShrink: 0,
                  transition: 'all 0.2s'
                }}
              >
                {searching ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
              </IconButton>
            </Paper>

            {errorMsg && (
              <Fade in>
                <Typography color="error" variant="body2" sx={{ mt: 3, fontWeight: 700 }}>
                  ⚠️ {errorMsg}
                </Typography>
              </Fade>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mt: 4, textAlign: 'center', maxWidth: 450, lineHeight: 1.6 }}>
              {t('rdMaterial.scan_query_tip', 'Tip: You can directly enter the ID (e.g. 1002) or the full code (e.g. FB-1002).')}
            </Typography>
          </Box>
        </Fade>
      )}

      {/* --- STATE 2: ITEM FOUND (Matches ScanOutPage structure) --- */}
      {!searching && item && (
        <Fade in timeout={500}>
          <Box>
            <Grid container spacing={4} sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
              
              {/* LEFT: Item Profile & Actions */}
              <Grid size={{ xs: 12, md: 4 }} sx={{ minWidth: 0 }}>
                <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid #e2e8f0', p: 4, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <CheckCircleIcon sx={{ color: '#22c55e !important' }} />
                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {t('rdMaterial.item_found', 'Item Found')}
                    </Typography>
                  </Box>

                  <Typography variant="h6" fontWeight={800} color="#0f172a" lineHeight={1.3} mb={1}>
                    {item.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontFamily="monospace" fontSize={14} mb={3}>
                    {item.itemCode || `ID: ${item.id}`}
                  </Typography>

                  <Box mb={3}>
                    <ImageGallery images={getImagesList()} />
                  </Box>

                  <Stack spacing={2.5} sx={{ flex: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography color="text.secondary" fontSize={13}>{t('rdMaterial.location', 'Location')}</Typography>
                      <Chip label={item.location || t('rdMaterial.unassigned', 'Unassigned')} size="small" sx={{ fontWeight: 700, bgcolor: '#f1f5f9', color: '#475569' }} />
                    </Box>
                    <Divider sx={{ borderStyle: 'dashed' }} />
                    
                    {/* Inventory Box */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" p={2} bgcolor="#f0fdf4" borderRadius={3}>
                      <Box display="flex" alignItems="center" gap={1.5} flex={1}>
                        <InventoryIcon sx={{ color: '#16a34a', fontSize: 22 }} />
                        <Typography fontWeight={800} color="#166534">{t('rdMaterial.current_stock', 'Current Stock:')}</Typography>
                      </Box>
                      <Typography variant="h5" fontWeight={900} color="#15803d" sx={{ pl: 2 }}>
                        {item.quantity ?? 0}
                      </Typography>
                    </Box>

                    <Box sx={{ mt: 'auto', pt: 2 }}>
                      <Stack spacing={1.5}>
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={handleNavigateToDetails}
                          startIcon={<LaunchIcon />}
                          sx={{ 
                            borderRadius: 2, textTransform: 'none', py: 1.25, fontWeight: 700, bgcolor: '#0f172a',
                            '&:hover': { bgcolor: '#1e293b' }
                          }}
                        >
                          {t('rdMaterial.go_to_details', 'Go to Full Details')}
                        </Button>

                        <Button
                          fullWidth
                          variant="outlined"
                          onClick={() => navigate(`${BASE}/label/${item.id}`)}
                          startIcon={<PrintIcon />}
                          sx={{ 
                            borderRadius: 2, textTransform: 'none', py: 1.25, fontWeight: 700, borderColor: '#e2e8f0', color: '#334155',
                            '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' }
                          }}
                        >
                          {t('rdMaterial.print_label', 'Print Label')}
                        </Button>
                      </Stack>
                    </Box>
                  </Stack>
                </Card>
              </Grid>

              {/* CENTER: Specifications */}
              <Grid size={{ xs: 12, md: 4 }} sx={{ minWidth: 0 }}>
                <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid #e2e8f0', p: 4, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)', height: '100%' }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <LayersIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {t('rdMaterial.specifications', 'Specifications')}
                    </Typography>
                  </Box>

                  <Typography variant="subtitle2" color="primary" fontWeight={800} sx={{ mb: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {t('rdMaterial.general_metadata', 'General Info')}
                  </Typography>
                  <InfoRow label={t('rdMaterial.item_code', 'Item Code')} value={item.itemCode} />
                  <InfoRow label={t('rdMaterial.name', 'Name')} value={item.name} />
                  <InfoRow 
                    label={t('rdMaterial.item_type', 'Category')} 
                    value={
                      <Chip 
                        label={item.itemType} 
                        size="small" 
                        sx={{ 
                          fontWeight: 700, 
                          bgcolor: item.itemType === 'FABRIC' || item.itemType === 'YARDAGE' ? '#dcfce7' : '#f3e8ff', 
                          color: item.itemType === 'FABRIC' || item.itemType === 'YARDAGE' ? '#166534' : '#6b21a8' 
                        }} 
                      />
                    } 
                  />
                  <InfoRow label={t('rdMaterial.supplier_name', 'Supplier')} value={item.supplierName} />
                  <InfoRow label={t('rdMaterial.origin', 'Origin')} value={item.origin} />
                  <InfoRow label={t('rdMaterial.price', 'Price')} value={item.price ? `${item.price} ${item.currency || ''} ${item.priceUnit ? `/ ${item.priceUnit}` : ''}` : undefined} />
                  <InfoRow label={t('rdMaterial.moq_mcq', 'MOQ / MCQ')} value={item.moqMcq} />
                  <InfoRow label={t('rdMaterial.leadTime', 'Leadtime')} value={item.leadTime} />

                  {(item.itemType === 'FABRIC' || item.itemType === 'YARDAGE') && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" color="primary" fontWeight={800} sx={{ mb: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        {t('rdMaterial.fabric_specs', 'Fabric Specs')}
                      </Typography>
                      <InfoRow label={t('rdMaterial.structure', 'Structure')} value={item.fabric?.structure} />
                      <InfoRow label={t('rdMaterial.composition', 'Composition')} value={item.fabric?.composition} />
                      <InfoRow label={t('rdMaterial.weight_gsm', 'GSM')} value={item.fabric?.weightGsm ? `${item.fabric.weightGsm} gsm` : undefined} />
                      <InfoRow label={t('rdMaterial.cuttable_width', 'Cuttable Width')} value={item.fabric?.cuttableWidth ? `${item.fabric.cuttableWidth} inch` : undefined} />
                      <InfoRow label={t('rdMaterial.color', 'Color')} value={item.fabric?.colorName} />
                    </Box>
                  )}

                  {item.itemType === 'ACCESSORY' && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" color="primary" fontWeight={800} sx={{ mb: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        {t('rdMaterial.accessory_specs', 'Accessory Specs')}
                      </Typography>
                      <InfoRow label={t('rdMaterial.specification', 'Specification')} value={item.accessory?.specification} />
                      <InfoRow label={t('rdMaterial.composition', 'Composition')} value={item.accessory?.composition} />
                      <InfoRow label={t('rdMaterial.color', 'Color')} value={item.accessory?.color} />
                      <InfoRow label={t('rdMaterial.size', 'Size')} value={item.accessory?.size} />
                      <InfoRow label={t('rdMaterial.weight', 'Weight')} value={item.accessory?.weightGsm ? `${item.accessory.weightGsm} gsm` : undefined} />
                    </Box>
                  )}

                  {item.remark && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                        {t('rdMaterial.remark', 'Remark')}
                      </Typography>
                      <Typography sx={{ bgcolor: '#fafafa', p: 2, borderRadius: 2, border: '1px solid #f1f5f9', fontSize: 13.5, color: '#334155', whiteSpace: 'pre-wrap' }}>
                        {item.remark}
                      </Typography>
                    </Box>
                  )}
                </Card>
              </Grid>

              {/* RIGHT: Scan History */}
              <Grid size={{ xs: 12, md: 4 }} sx={{ minWidth: 0 }}>
                <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid #e2e8f0', p: 4, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <HistoryIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {t('rdMaterial.scan_history', 'Transaction Logs')}
                    </Typography>
                  </Box>

                  {(() => {
                    const totalPages = Math.ceil(scanLogs.length / 5);
                    const displayLogs = scanLogs.slice((logPage - 1) * 5, logPage * 5);
                    
                    return scanLogs.length > 0 ? (
                      <>
                        <Stack spacing={2} sx={{ mb: 3 }}>
                          {displayLogs.map((log) => (
                            <Paper key={log.id} elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #f1f5f9', bgcolor: '#fff', display: 'flex', gap: 2, alignItems: 'center' }}>
                              <Box flex={1}>
                                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                                  <Typography variant="body2" fontWeight={700} color="#0f172a">{log.holder}</Typography>
                                  <Chip label={log.qtyChanged} size="small" sx={{ bgcolor: log.actionType === 'OUT' ? '#fef2f2' : '#f0fdf4', color: log.actionType === 'OUT' ? '#dc2626' : '#16a34a', fontWeight: 800, fontSize: 13 }} />
                                </Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {new Date(log.scannedAt).toLocaleString('en-US')}
                                </Typography>
                                {log.note && (
                                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                                    "{log.note}"
                                  </Typography>
                                )}
                              </Box>
                            </Paper>
                          ))}
                        </Stack>
                        
                        {totalPages > 1 && (
                          <Box display="flex" justifyContent="center" mt="auto" pt={2} borderTop="1px solid #f1f5f9">
                            <Pagination 
                              count={totalPages} 
                              page={logPage} 
                              onChange={(e, val) => setLogPage(val)} 
                              color="primary" 
                              size="small" 
                            />
                          </Box>
                        )}
                      </>
                    ) : (
                      <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px dashed #cbd5e1', bgcolor: 'transparent', textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('rdMaterial.no_scan_history_found', 'No transaction logs found.')}
                        </Typography>
                      </Paper>
                    );
                  })()}
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Fade>
      )}

      {/* QR Scanner Camera Dialog */}
      <QRScannerDialog 
        open={scannerOpen} 
        onClose={() => setScannerOpen(false)} 
        onScan={(text) => {
          setScannerOpen(false);
          let val = text.toUpperCase();
          const match = val.match(/^([A-Z]{2})[-]?(\d+)$/);
          if (match) {
            setPrefix(match[1]);
            setManualCode(match[2]);
            setTimeout(() => doSearch(text), 100);
          } else {
            setManualCode(val);
            setTimeout(() => doSearch(text), 100);
          }
        }} 
      />
    </Box>
  );
};

export default ScanQueryPage;
