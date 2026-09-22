import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Card, Grid, Paper, Stack,
  Typography, Select, MenuItem, Snackbar, Alert, CircularProgress,
  ToggleButtonGroup, ToggleButton, FormControl, FormControlLabel, Switch, Divider,
  Chip, IconButton, Tooltip, useTheme, useMediaQuery
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WifiIcon from '@mui/icons-material/Wifi';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import CropPortraitIcon from '@mui/icons-material/CropPortrait';
import SaveIcon from '@mui/icons-material/Save';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TuneIcon from '@mui/icons-material/Tune';
import { QRCodeSVG } from 'qrcode.react';
import { rdItemApi } from '../services/rdMaterialApi';
import { LABEL_SIZES, ZEBRA_IP_KEY, printViaZebraIp } from '../services/zebraPrinterService';
import type { Item, GarmentSampleTagConfig } from '../types';
import { useTranslation } from 'react-i18next';
import { AppButton, AppTextField } from '@traxeco/shared';
import A4StickerSheet, { getItemQrValue, renderSticker } from '../components/A4StickerSheet';
import GarmentSampleTagConfigPanel from '../components/GarmentSampleTagConfigPanel';
import SpecialPropertyManagerDialog from '../components/SpecialPropertyManagerDialog';
import { SpecialPropertyItem } from '../services/specialPropertyService';

const LabelPrintPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get('ids');
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [printMode, setPrintMode] = useState<'A4' | 'ROLL'>('A4');
  const [sizeIdx, setSizeIdx] = useState(0);
  const [copies, setCopies] = useState(1);
  const [a4Repeats, setA4Repeats] = useState<number>(4);
  const [copiesPerItem, setCopiesPerItem] = useState<number>(1);
  const [showCutLines, setShowCutLines] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileTab, setMobileTab] = useState<'config' | 'preview'>('config');

  // Garment Sample Tag Configuration States
  const [garmentConfigs, setGarmentConfigs] = useState<Record<number, GarmentSampleTagConfig>>({});
  const [activeGarmentId, setActiveGarmentId] = useState<number | null>(null);
  const [propertyManagerOpen, setPropertyManagerOpen] = useState(false);

  // A4 Preview Sizing & Zoom State
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 700, height: 700 });
  const [zoomMode, setZoomMode] = useState<'fit-width' | 'fit-page' | '100%'>('fit-width');

  useEffect(() => {
    if (!previewBoxRef.current) return;
    const updateSize = () => {
      if (previewBoxRef.current) {
        setContainerDimensions({
          width: previewBoxRef.current.clientWidth,
          height: previewBoxRef.current.clientHeight,
        });
      }
    };
    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(previewBoxRef.current);
    return () => resizeObserver.disconnect();
  }, [printMode]);

  const zoomScale = useMemo(() => {
    if (zoomMode === '100%') return 1;
    const a4WidthPx = 794; // 210mm at 96dpi
    const a4HeightPx = 1123; // 297mm at 96dpi

    const availableW = Math.max(containerDimensions.width - 24, 260);
    const availableH = Math.max(containerDimensions.height - 32, 280);

    if (zoomMode === 'fit-page') {
      const scaleH = availableH / a4HeightPx;
      const scaleW = availableW / a4WidthPx;
      return Math.max(0.25, Math.min(scaleH, scaleW, 1));
    }

    // Default: 'fit-width'
    return Math.max(0.25, Math.min(availableW / a4WidthPx, 1));
  }, [zoomMode, containerDimensions]);

  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/';

  // Check if printing Garment / Mockup (Product)
  const isGarment = useMemo(() => {
    return items.length > 0 && items.some(item => item.itemType === 'PRODUCT');
  }, [items]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        let validItems: Item[] = [];
        if (idsParam) {
          const idList = idsParam.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
          if (idList.length === 0) {
            setError(t('rdMaterial.labelPrint.err_invalid_ids', 'Không tìm thấy danh sách Item ID hợp lệ.'));
            setLoading(false);
            return;
          }
          const results = await Promise.all(idList.map(i => rdItemApi.getById(i)));
          validItems = results.filter((item): item is Item => !!item);
        } else if (id) {
          const single = await rdItemApi.getById(+id);
          if (single) {
            validItems = [single];
          } else {
            setError(t('rdMaterial.labelPrint.err_item_not_found', 'Không tìm thấy thông tin Item.'));
            setLoading(false);
            return;
          }
        } else {
          setError(t('rdMaterial.labelPrint.err_no_item_id', 'Không có Item ID để in nhãn.'));
          setLoading(false);
          return;
        }

        setItems(validItems);

        // Determine if Garment
        const hasGarment = validItems.some(i => i.itemType === 'PRODUCT');
        if (hasGarment) {
          // Garment Sample Tag MUST ALWAYS default to A4 (4 tags / sheet)
          setPrintMode('A4');
          setA4Repeats(4); // Default to 4 tags (1 full A4 sheet)

          // Initialize configs for Garments: from DB -> LocalStorage -> Default
          const initialConfigs: Record<number, GarmentSampleTagConfig> = {};
          const todayStr = new Date().toISOString().split('T')[0];

          for (const it of validItems) {
            if (it.itemType === 'PRODUCT') {
              let parsed: GarmentSampleTagConfig | null = null;
              // 1. Check DB config
              if (it.product?.sampleTagConfig) {
                try {
                  parsed = JSON.parse(it.product.sampleTagConfig);
                } catch {
                  // ignore
                }
              }
              // 2. Check localStorage
              if (!parsed) {
                try {
                  const stored = localStorage.getItem(`traxeco_sample_tag_config_${it.id}`);
                  if (stored) parsed = JSON.parse(stored);
                } catch {
                  // ignore
                }
              }
              // 3. Fallback default
              if (!parsed) {
                const defaultProp = {
                  id: 'prop-water-repellent',
                  name: 'Water repellent',
                  iconUrl: `${baseUrl}sample-tag/water_repellency.png`,
                };
                parsed = {
                  date: todayStr,
                  specialProperties: [defaultProp],
                  specialProperty: defaultProp,
                  technology: {
                    name: it.product?.technology || 'TEXTILE TO TEXTILE',
                    iconUrl: `${baseUrl}sample-tag/textile_to_textile.png`,
                  },
                  specialFeatures: it.description || it.remark || 'Innovation Click-TRAK® Magnetic Zipper, enables quick one-handed closure',
                };
              } else {
                // Rule 4: Always populate today's date
                parsed.date = todayStr;
                if (!parsed.specialProperties && parsed.specialProperty) {
                  parsed.specialProperties = [parsed.specialProperty];
                }
              }
              initialConfigs[it.id] = parsed;
            }
          }

          setGarmentConfigs(initialConfigs);
          if (validItems.length > 0) {
            setActiveGarmentId(validItems[0].id);
          }
        } else {
          // Standard items: default to 10 repeats on A4
          setA4Repeats(10);
        }
      } catch (err) {
        console.error('Failed to load item for print:', err);
        setError(t('rdMaterial.labelPrint.err_load_item', 'Lỗi khi tải dữ liệu Item'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, idsParam]);

  const singleItem = items.length === 1 ? items[0] : null;
  const size = LABEL_SIZES[sizeIdx];

  // Active garment object
  const activeGarment = useMemo(() => {
    if (!activeGarmentId) return items[0] || null;
    return items.find(i => i.id === activeGarmentId) || items[0] || null;
  }, [items, activeGarmentId]);

  const activeGarmentIndex = useMemo(() => {
    if (!activeGarment) return 0;
    return items.findIndex(i => i.id === activeGarment.id);
  }, [items, activeGarment]);

  const configuredCount = useMemo(() => {
    return items.filter(it => garmentConfigs[it.id]?.fabrics?.some(f => f.detail)).length;
  }, [items, garmentConfigs]);

  const [isPrintPortalActive, setIsPrintPortalActive] = useState(false);

  // Print lifecycle listeners
  useEffect(() => {
    const handleBefore = () => setIsPrintPortalActive(true);
    const handleAfter = () => setIsPrintPortalActive(false);
    window.addEventListener('beforeprint', handleBefore);
    window.addEventListener('afterprint', handleAfter);
    return () => {
      window.removeEventListener('beforeprint', handleBefore);
      window.removeEventListener('afterprint', handleAfter);
    };
  }, []);

  // Instant scroll active garment tag into view in preview pane without smooth animation jank
  // ONLY on desktop (on mobile, scrolling the window/PageContainer hides the whole config form)
  useEffect(() => {
    if (activeGarmentId && !isMobile) {
      const el = document.getElementById(`garment-tag-${activeGarmentId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'nearest' });
      }
    }
  }, [activeGarmentId, isMobile]);

  const saveDebounceTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(saveDebounceTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  // Handle Garment Config Change - Instant state update + debounced disk write
  const handleGarmentConfigChange = useCallback((itemId: number, newCfg: GarmentSampleTagConfig) => {
    // 1. Update React state immediately for responsive typing
    setGarmentConfigs(prev => ({
      ...prev,
      [itemId]: newCfg,
    }));

    // 2. Debounce disk persistence by 300ms so typing never freezes the UI thread
    if (saveDebounceTimersRef.current[itemId]) {
      clearTimeout(saveDebounceTimersRef.current[itemId]);
    }
    saveDebounceTimersRef.current[itemId] = setTimeout(() => {
      try {
        localStorage.setItem(`traxeco_sample_tag_config_${itemId}`, JSON.stringify(newCfg));
      } catch {
        // ignore
      }
    }, 300);
  }, []);

  const handleSelectGarment = useCallback((id: number) => {
    setActiveGarmentId(id);
  }, []);

  const handleActiveGarmentConfigChange = useCallback((newCfg: GarmentSampleTagConfig) => {
    if (activeGarmentId) {
      handleGarmentConfigChange(activeGarmentId, newCfg);
    }
  }, [activeGarmentId, handleGarmentConfigChange]);

  const handleOpenPropertyManager = useCallback(() => {
    setPropertyManagerOpen(true);
  }, []);

  // Save all garment configs to DB and LocalStorage
  const saveAllGarmentConfigs = async (showToast = true) => {
    setIsSavingDb(true);
    try {
      // 1. LocalStorage
      for (const it of items) {
        if (it.itemType === 'PRODUCT') {
          const cfg = garmentConfigs[it.id];
          if (cfg) {
            try {
              localStorage.setItem(`traxeco_sample_tag_config_${it.id}`, JSON.stringify(cfg));
            } catch {
              // ignore
            }
          }
        }
      }

      // 2. Database update
      const promises = items
        .filter(it => it.itemType === 'PRODUCT')
        .map(async (it) => {
          const cfg = garmentConfigs[it.id];
          if (!cfg) return;
          const cfgStr = JSON.stringify(cfg);
          await rdItemApi.update(it.id, {
            ...it,
            product: {
              ...(it.product || {}),
              sampleTagConfig: cfgStr,
            }
          });
          if (it.product) {
            it.product.sampleTagConfig = cfgStr;
          }
        });

      await Promise.allSettled(promises);
      if (showToast) {
        setSnackbar({
          open: true,
          message: t('rdMaterial.labelPrint.save_success_msg', 'Đã lưu cấu hình Sample Tag vào cơ sở dữ liệu thành công!'),
          severity: 'success'
        });
      }
    } catch (err) {
      console.error('Failed to save sample tag configs:', err);
      if (showToast) {
        setSnackbar({
          open: true,
          message: t('rdMaterial.labelPrint.save_error_msg', 'Lỗi khi lưu cấu hình vào CSDL'),
          severity: 'error'
        });
      }
    } finally {
      setIsSavingDb(false);
    }
  };

  // Prepare items for A4 Sheet
  const a4ItemsList = useMemo(() => {
    if (items.length === 0) return [];
    if (isGarment) {
      if (items.length === 1) {
        const list: Item[] = [];
        for (let i = 0; i < a4Repeats; i++) {
          list.push(items[0]);
        }
        return list;
      }
      // Multiple garments: repeat each by copiesPerItem
      if (copiesPerItem > 1) {
        const list: Item[] = [];
        for (const it of items) {
          for (let c = 0; c < copiesPerItem; c++) {
            list.push(it);
          }
        }
        return list;
      }
      return items;
    }

    // Standard stickers (Fabric, Accessory, Yardage)
    if (items.length === 1) {
      const list: Item[] = [];
      for (let i = 0; i < a4Repeats; i++) {
        list.push(items[0]);
      }
      return list;
    }
    return items;
  }, [items, isGarment, a4Repeats, copiesPerItem]);

  const totalA4Pages = useMemo(() => {
    const chunkSize = isGarment ? 4 : 10;
    return Math.ceil(a4ItemsList.length / chunkSize) || 1;
  }, [a4ItemsList, isGarment]);

  // Handle Print Action
  const handlePrint = async () => {
    if (isGarment) {
      // Auto save configuration to DB and LocalStorage before printing
      await saveAllGarmentConfigs(false);
    }
    setIsPrintPortalActive(true);
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
      }, 50);
    });
  };

  const handleWifiPrint = async () => {
    if (!singleItem) return;
    const savedIp = localStorage.getItem(ZEBRA_IP_KEY);
    if (!savedIp) {
      setSnackbar({ open: true, message: t('rdMaterial.labelPrint.err_zebra_ip', 'Vui lòng cấu hình IP máy in Zebra trong mục Settings'), severity: 'error' });
      return;
    }
    setIsPrinting(true);
    try {
      const qrVal = getItemQrValue(singleItem);
      const zpl = size.generateZPL(singleItem, qrVal, copies);
      await printViaZebraIp(savedIp, zpl);
      setSnackbar({ open: true, message: t('rdMaterial.labelPrint.wifi_sent_msg', 'Lệnh in đã được gửi qua WiFi!'), severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to print', severity: 'error' });
    } finally {
      setIsPrinting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={6}>
        <CircularProgress size={32} color="primary" />
        <Typography ml={2} color="text.secondary">{t('rdMaterial.print_loading', 'Đang tải thông tin nhãn...')}</Typography>
      </Box>
    );
  }

  if (error) return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  if (items.length === 0) return <Alert severity="warning" sx={{ m: 3 }}>{t('rdMaterial.labelPrint.no_labels_to_print', 'Không có dữ liệu tem để in')}</Alert>;

  return (
    <Box sx={{ width: '100%', p: { xs: 1.5, sm: 2, md: 2.5 } }}>
      {/* 🖨️ CSS Print Styles 🖨️ */}
      <style>{`
        @media screen {
          #print-portal-root {
            display: none !important;
          }
        }
        @media print {
          @page {
            size: ${printMode === 'A4' ? 'A4 portrait' : 'auto'};
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            width: ${printMode === 'A4' ? '210mm' : 'auto'} !important;
          }
          /* Hide the entire React SPA application */
          #root {
            display: none !important;
          }
          /* Show ONLY the direct body print portal */
          #print-portal-root {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: ${printMode === 'A4' ? '210mm' : 'auto'} !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #print-portal-root * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Navigation & Header (Pinned / Sticky at Top) */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          bgcolor: '#ffffff',
          pt: { xs: 1.5, sm: 2, md: 2 },
          pb: 1.5,
          px: { xs: 1.5, sm: 2, md: 2.5 },
          mx: { xs: -1.5, sm: -2, md: -2.5 },
          mt: { xs: -1.5, sm: -2, md: -2.5 },
          mb: 2.5,
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        }}
      >
        {/* Breadcrumb line */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Button
            size="small"
            onClick={() => navigate(-1)}
            startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
            sx={{
              color: '#64748b',
              fontWeight: 500,
              fontSize: 13,
              textTransform: 'none',
              minWidth: 0,
              p: 0,
              '&:hover': { color: '#0f172a', bgcolor: 'transparent' }
            }}
          >
            {t('rdMaterial.print_back', 'Quay lại')}
          </Button>
          <Typography sx={{ color: '#cbd5e1', fontSize: 12 }}>/</Typography>
          <Typography sx={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>
            {isGarment
              ? (items.length === 1 ? `Garment Sample Tag (${items[0].product?.styleNo || items[0].itemCode})` : t('rdMaterial.labelPrint.bulk_print_title', { count: items.length, type: t('rdMaterial.labelPrint.sample_tag_unit', 'mẫu Sample Tag'), defaultValue: `In Sample Tag (${items.length} mẫu)` }))
              : (items.length === 1
                ? (items[0].itemType === 'FABRIC' ? t('rdMaterial.fabricHanger', 'Fabric Hanger') : items[0].itemType === 'ACCESSORY' ? t('rdMaterial.accessory', 'Accessories') : items[0].itemType === 'YARDAGE' ? t('rdMaterial.yardage', 'Sample Yardage') : items[0].itemType)
                : t('rdMaterial.labelPrint.bulk_print_title', { count: items.length, type: t('rdMaterial.labelPrint.sticker_unit', 'tem'), defaultValue: `In hàng loạt (${items.length} mục)` }))}
          </Typography>
        </Box>

        {/* Title and Actions Row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: 20, md: 22 } }}>
              {isGarment ? t('rdMaterial.labelPrint.title', 'In Garment / Mockup Sample Tag') : t('rdMaterial.print_title', 'In Sticker / Tem Nhãn')}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Explicit Save Configuration Button for Garments */}
            {isGarment && (
              <AppButton
                variant="outlined"
                customVariant="secondary"
                startIcon={isSavingDb ? <CircularProgress size={16} color="inherit" /> : <SaveIcon sx={{ fontSize: 18 }} />}
                onClick={() => saveAllGarmentConfigs(true)}
                disabled={isSavingDb}
                sx={{ height: 38, px: 2, fontWeight: 600, borderRadius: '6px', fontSize: 13 }}
              >
                {isSavingDb ? t('rdMaterial.labelPrint.saving', 'Đang lưu...') : t('rdMaterial.labelPrint.save_config', 'Lưu cấu hình')}
              </AppButton>
            )}

            <AppButton
              variant="contained"
              customVariant="primary"
              startIcon={<PrintIcon sx={{ fontSize: 18 }} />}
              onClick={handlePrint}
              sx={{ height: 38, px: 2.5, fontWeight: 600, borderRadius: '6px', fontSize: 13 }}
            >
              {printMode === 'A4'
                ? (isGarment
                    ? t('rdMaterial.labelPrint.print_sample_tag_btn', { count: a4ItemsList.length, pages: totalA4Pages, defaultValue: `In ${a4ItemsList.length} Tag (${totalA4Pages} trang A4)` })
                    : `In ${a4ItemsList.length} Tem (${totalA4Pages} trang A4)`)
                : t('rdMaterial.print_pc', 'Print (PC)')}
            </AppButton>

            {printMode === 'ROLL' && singleItem && (
              <AppButton
                variant="contained"
                customVariant="primary"
                color="success"
                startIcon={isPrinting ? <CircularProgress size={18} color="inherit" /> : <WifiIcon sx={{ fontSize: 18 }} />}
                onClick={handleWifiPrint}
                disabled={isPrinting}
                sx={{ height: 38, px: 2.5, fontWeight: 600, borderRadius: '6px', fontSize: 13 }}
              >
                {t('rdMaterial.print_via_wifi', 'Print via WiFi (Zebra)')}
              </AppButton>
            )}
          </Box>
        </Box>
      </Box>

      {/* Mobile View Toggle between Configuration & Preview */}
      {isMobile && (
        <Box sx={{ mb: 2 }}>
          <ToggleButtonGroup
            value={mobileTab}
            exclusive
            onChange={(_, val) => { if (val) setMobileTab(val); }}
            fullWidth
            size="small"
            sx={{
              bgcolor: '#f1f5f9',
              p: '3px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: '6px',
                py: 0.85,
                fontWeight: 700,
                fontSize: 13,
                textTransform: 'none',
                color: '#64748b',
                '&.Mui-selected': {
                  bgcolor: '#ffffff',
                  color: '#16a34a',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                },
              },
            }}
          >
            <ToggleButton value="config">
              <TuneIcon sx={{ fontSize: 18, mr: 0.75 }} />
              {isGarment ? t('rdMaterial.labelPrint.tab_config', 'Cấu hình thẻ') : t('rdMaterial.labelPrint.tab_settings', 'Cài đặt in')}
            </ToggleButton>
            <ToggleButton value="preview">
              <ViewModuleIcon sx={{ fontSize: 18, mr: 0.75 }} />
              {t('rdMaterial.labelPrint.tab_preview', 'Xem trước tờ in')}
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Grid Settings & Preview */}
      <Grid container spacing={3}>
        {/* Left: Print Configuration & Item Summary */}
        <Grid
          size={{ xs: 12, md: isGarment ? 5 : 4.5, lg: isGarment ? 4.5 : 3.8 }}
          sx={{
            display: isMobile ? (mobileTab === 'config' ? 'block' : 'none') : 'block',
          }}
        >
          {/* Mode Selector (Hidden for Garments - Garments always print A4 4-up) */}
          {!isGarment && (
            <Card sx={{ mb: 2, borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: 'none', p: 2 }}>
              <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', color: '#64748b', display: 'block', mb: 1, letterSpacing: '0.04em' }}>
                {t('rdMaterial.labelPrint.print_format', 'Định dạng in')}
              </Typography>
              <ToggleButtonGroup
                value={printMode}
                exclusive
                onChange={(_, val) => { if (val) setPrintMode(val); }}
                fullWidth
                size="small"
                sx={{
                  bgcolor: '#f1f5f9',
                  p: '3px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  '& .MuiToggleButton-root': {
                    flex: 1,
                    minWidth: 0,
                    border: 'none',
                    borderRadius: '4px',
                    py: 0.75,
                    px: 1,
                    fontSize: 12.5,
                    fontWeight: 600,
                    textTransform: 'none',
                    color: '#475569',
                    whiteSpace: 'nowrap',
                    '&.Mui-selected': {
                      bgcolor: '#ffffff',
                      color: '#15803d',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      fontWeight: 700,
                    },
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.7)'
                    }
                  }
                }}
              >
                <ToggleButton value="A4">
                  <ViewModuleIcon sx={{ mr: 0.75, fontSize: 18, flexShrink: 0 }} />
                  {t('rdMaterial.labelPrint.format_a4', 'Tờ in A4')}
                </ToggleButton>
                <ToggleButton value="ROLL">
                  <CropPortraitIcon sx={{ mr: 0.75, fontSize: 18, flexShrink: 0 }} />
                  {t('rdMaterial.labelPrint.format_roll', 'Tem cuộn (Zebra)')}
                </ToggleButton>
              </ToggleButtonGroup>
            </Card>
          )}

          {/* Options for A4 Mode */}
          {printMode === 'A4' && (
            <Card sx={{ mb: 2, borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: 'none', p: 2 }}>
              <Typography fontWeight={700} fontSize={14} color="#1e293b" mb={1.5}>
                {isGarment ? t('rdMaterial.labelPrint.sample_tag_a4_settings', 'Cài đặt trang in Sample Tag A4') : t('rdMaterial.print_settings', 'Cài đặt in tờ A4')}
              </Typography>
              <Stack spacing={2}>
                {singleItem && (
                  <Box>
                    <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', color: '#64748b', display: 'block', mb: 0.5, letterSpacing: '0.04em' }}>
                      {isGarment ? t('rdMaterial.labelPrint.copies_a4_garment', 'Số lượng thẻ in trên tờ A4') : t('rdMaterial.labelPrint.copies_a4_sticker', 'Số lượng tem in')}
                    </Typography>
                    <Select
                      fullWidth
                      size="small"
                      value={a4Repeats}
                      onChange={(e) => setA4Repeats(Number(e.target.value))}
                      sx={{ borderRadius: '4px', fontSize: 13 }}
                    >
                      {isGarment ? (
                        [
                          <MenuItem key={1} value={1}>{t('rdMaterial.labelPrint.repeat_garment_1', '1 thẻ (1/4 trang A4)')}</MenuItem>,
                          <MenuItem key={2} value={2}>{t('rdMaterial.labelPrint.repeat_garment_2', '2 thẻ (nửa trang A4)')}</MenuItem>,
                          <MenuItem key={4} value={4}>{t('rdMaterial.labelPrint.repeat_garment_4', '4 thẻ (Đầy đủ 1 trang A4 - 4 thẻ)')}</MenuItem>,
                          <MenuItem key={8} value={8}>{t('rdMaterial.labelPrint.repeat_garment_8', '8 thẻ (2 trang A4)')}</MenuItem>,
                          <MenuItem key={12} value={12}>{t('rdMaterial.labelPrint.repeat_garment_12', '12 thẻ (3 trang A4)')}</MenuItem>,
                          <MenuItem key={16} value={16}>{t('rdMaterial.labelPrint.repeat_garment_16', '16 thẻ (4 trang A4)')}</MenuItem>,
                          <MenuItem key={20} value={20}>{t('rdMaterial.labelPrint.repeat_garment_20', '20 thẻ (5 trang A4)')}</MenuItem>,
                        ]
                      ) : (
                        [
                          <MenuItem key={1} value={1}>{t('rdMaterial.labelPrint.repeat_sticker_1', '1 tem (1/10 trang A4)')}</MenuItem>,
                          <MenuItem key={2} value={2}>{t('rdMaterial.labelPrint.repeat_sticker_2', '2 tem (1 hàng A4)')}</MenuItem>,
                          <MenuItem key={4} value={4}>{t('rdMaterial.labelPrint.repeat_sticker_4', '4 tem (2 hàng A4)')}</MenuItem>,
                          <MenuItem key={5} value={5}>{t('rdMaterial.labelPrint.repeat_sticker_5', '5 tem (nửa trang A4)')}</MenuItem>,
                          <MenuItem key={10} value={10}>{t('rdMaterial.labelPrint.repeat_sticker_10', '10 tem (Đầy 1 trang A4)')}</MenuItem>,
                          <MenuItem key={20} value={20}>{t('rdMaterial.labelPrint.repeat_sticker_20', '20 tem (2 trang A4)')}</MenuItem>,
                          <MenuItem key={30} value={30}>{t('rdMaterial.labelPrint.repeat_sticker_30', '30 tem (3 trang A4)')}</MenuItem>,
                          <MenuItem key={50} value={50}>{t('rdMaterial.labelPrint.repeat_sticker_50', '50 tem (5 trang A4)')}</MenuItem>,
                        ]
                      )}
                    </Select>
                  </Box>
                )}

                {items.length > 1 && (
                  <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                    <Typography fontSize={13} fontWeight={700} color="#15803d">
                      {isGarment
                        ? t('rdMaterial.labelPrint.bulk_print_title', { count: items.length, type: t('rdMaterial.labelPrint.sample_tag_unit', 'mẫu Sample Tag'), defaultValue: `In hàng loạt ${items.length} mẫu Sample Tag` })
                        : t('rdMaterial.labelPrint.bulk_print_title', { count: items.length, type: t('rdMaterial.labelPrint.sticker_unit', 'tem'), defaultValue: `In hàng loạt ${items.length} tem` })}
                    </Typography>
                    <Typography fontSize={12} color="#166534" mt={0.5}>
                      {isGarment
                        ? t('rdMaterial.labelPrint.bulk_print_subtitle_garment', { pages: totalA4Pages, defaultValue: `Chia thành ${totalA4Pages} trang A4 (mỗi trang 4 thẻ theo lưới 2x2).` })
                        : t('rdMaterial.labelPrint.bulk_print_subtitle_sticker', { pages: totalA4Pages, defaultValue: `Chia thành ${totalA4Pages} trang A4 (mỗi trang tối đa 10 tem).` })}
                    </Typography>
                    {isGarment && (
                      <Box sx={{ mt: 1.5 }}>
                        <Typography variant="caption" fontWeight={700} color="#166534" sx={{ display: 'block', mb: 0.5 }}>
                          {t('rdMaterial.labelPrint.copies_per_sample', 'Số bản in cho mỗi mẫu:')}
                        </Typography>
                        <Select
                          fullWidth
                          size="small"
                          value={copiesPerItem}
                          onChange={(e) => setCopiesPerItem(Number(e.target.value))}
                          sx={{ bgcolor: '#fff', borderRadius: '4px', fontSize: 13 }}
                        >
                          <MenuItem value={1}>{t('rdMaterial.labelPrint.copy_1_sample', '1 thẻ / mẫu')}</MenuItem>
                          <MenuItem value={2}>{t('rdMaterial.labelPrint.copy_2_sample', '2 thẻ / mẫu')}</MenuItem>
                          <MenuItem value={4}>{t('rdMaterial.labelPrint.copy_4_sample', '4 thẻ / mẫu (Mỗi mẫu 1 tờ A4 riêng)')}</MenuItem>
                        </Select>
                      </Box>
                    )}
                  </Box>
                )}

                <Divider sx={{ my: 0.5 }} />

                <FormControlLabel
                  control={
                    <Switch
                      checked={showCutLines}
                      onChange={(e) => setShowCutLines(e.target.checked)}
                      color="primary"
                      size="small"
                    />
                  }
                  label={
                    <Box>
                      <Typography fontSize={13} fontWeight={600} color="#334155">{t('rdMaterial.labelPrint.cut_lines', 'Hiển thị viền cắt (Cut Line)')}</Typography>
                      <Typography fontSize={11} color="text.secondary">{t('rdMaterial.labelPrint.cut_lines_desc', 'Đường nét đứt hỗ trợ cắt dán thủ công')}</Typography>
                    </Box>
                  }
                />
              </Stack>
            </Card>
          )}

          {/* Garment Print Queue & Configuration Panel */}
          {isGarment && activeGarment && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Queue Selector for Multiple Garments — Option 1: Dropdown Select Chuyên Nghiệp */}
              {items.length > 1 ? (
                <Card
                  sx={{
                    borderRadius: '10px',
                    border: '1.5px solid #86efac',
                    bgcolor: '#f0fdf4',
                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)',
                    p: 1.5,
                  }}
                >
                  {/* Top Bar: Title + Status Counter */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                    <Typography
                      sx={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#15803d',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.6,
                      }}
                    >
                      <TuneIcon sx={{ fontSize: 15, color: '#16a34a' }} />
                      {t('rdMaterial.labelPrint.configuring_sample', 'MẪU ĐANG CẤU HÌNH')} ({activeGarmentIndex + 1} / {items.length})
                    </Typography>
                    <Chip
                      size="small"
                      label={t('rdMaterial.labelPrint.configured_count', { count: configuredCount, total: items.length, defaultValue: `${configuredCount}/${items.length} đã cấu hình` })}
                      icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: configuredCount === items.length ? '#16a34a !important' : '#059669 !important' }} />}
                      sx={{
                        height: 20,
                        fontSize: '10.5px',
                        fontWeight: 700,
                        bgcolor: '#ffffff',
                        color: '#15803d',
                        border: '1px solid #bbf7d0',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                  </Box>

                  {/* Selector Bar: [ < ] [ Custom Dropdown Select ] [ > ] */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title={t('common.prev', 'Mẫu trước')}>
                      <span>
                        <IconButton
                          size="small"
                          disabled={activeGarmentIndex <= 0}
                          onClick={() => setActiveGarmentId(items[activeGarmentIndex - 1].id)}
                          sx={{
                            border: '1.5px solid #cbd5e1',
                            bgcolor: '#ffffff',
                            p: 0.75,
                            width: 38,
                            height: 38,
                            borderRadius: '8px',
                            color: '#334155',
                            transition: 'all 0.15s ease',
                            '&:hover': {
                              bgcolor: '#ffffff',
                              borderColor: '#16a34a',
                              color: '#16a34a',
                              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.15)',
                            },
                            '&.Mui-disabled': { opacity: 0.35, bgcolor: '#f8fafc', borderColor: '#e2e8f0' },
                          }}
                        >
                          <NavigateBeforeIcon sx={{ fontSize: 22 }} />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <FormControl fullWidth size="small">
                      <Select
                        value={activeGarment.id}
                        onChange={(e) => setActiveGarmentId(Number(e.target.value))}
                        renderValue={(selectedId) => {
                          const selItem = items.find(i => i.id === selectedId) || activeGarment;
                          const selIdx = items.findIndex(i => i.id === selectedId);
                          const selConfigured = !!garmentConfigs[selItem.id]?.fabrics?.some(f => f.detail);
                          return (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, width: '100%' }}>
                              <Box
                                sx={{
                                  bgcolor: '#16a34a',
                                  color: '#ffffff',
                                  borderRadius: '5px',
                                  px: 0.8,
                                  py: 0.25,
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  lineHeight: 1.2,
                                  flexShrink: 0,
                                  boxShadow: '0 1px 3px rgba(22, 163, 74, 0.25)',
                                }}
                              >
                                #{selIdx >= 0 ? selIdx + 1 : 1}
                              </Box>
                              <Box sx={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                                <Typography
                                  sx={{
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    lineHeight: 1.2,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {selItem.product?.styleNo || selItem.itemCode || selItem.name}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: '10.5px',
                                    fontWeight: 600,
                                    color: selConfigured ? '#15803d' : '#94a3b8',
                                    lineHeight: 1.1,
                                    mt: 0.2,
                                  }}
                                >
                                  {selConfigured ? `✓ ${t('rdMaterial.labelPrint.customized', 'Đã chỉnh vải')}` : `○ ${t('rdMaterial.labelPrint.not_customized', 'Chưa chỉnh vải')}`}
                                </Typography>
                              </Box>
                            </Box>
                          );
                        }}
                        sx={{
                          bgcolor: '#ffffff',
                          borderRadius: '8px',
                          height: 42,
                          border: '1.5px solid #16a34a',
                          boxShadow: '0 0 0 3px rgba(22, 163, 74, 0.12)',
                          '& .MuiOutlinedInput-notchedOutline': {
                            border: 'none',
                          },
                          '&:hover': {
                            boxShadow: '0 0 0 3px rgba(22, 163, 74, 0.22)',
                          },
                          '& .MuiSelect-select': {
                            py: 0.5,
                            px: 1.25,
                            display: 'flex',
                            alignItems: 'center',
                          },
                          '& .MuiSelect-icon': {
                            color: '#15803d',
                            fontSize: 22,
                            right: 8,
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 340,
                              borderRadius: '10px',
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                              border: '1px solid #cbd5e1',
                              mt: 0.75,
                              '& .MuiList-root': {
                                p: 0.5,
                              },
                            },
                          },
                        }}
                      >
                        {items.map((it, idx) => {
                          const isItemActive = it.id === activeGarment.id;
                          const itConfigured = !!garmentConfigs[it.id]?.fabrics?.some(f => f.detail);
                          return (
                            <MenuItem
                              key={it.id}
                              value={it.id}
                              sx={{
                                py: 1,
                                px: 1.25,
                                my: 0.25,
                                borderRadius: '6px',
                                borderLeft: isItemActive ? '4px solid #16a34a' : '4px solid transparent',
                                bgcolor: isItemActive ? '#f0fdf4 !important' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1.5,
                                transition: 'all 0.1s ease',
                                '&:hover': {
                                  bgcolor: isItemActive ? '#e6f9ed !important' : '#f8fafc',
                                },
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                <Box
                                  sx={{
                                    bgcolor: isItemActive ? '#16a34a' : itConfigured ? '#dcfce7' : '#f1f5f9',
                                    color: isItemActive ? '#ffffff' : itConfigured ? '#15803d' : '#64748b',
                                    borderRadius: '4px',
                                    px: 0.75,
                                    py: 0.2,
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    flexShrink: 0,
                                  }}
                                >
                                  #{idx + 1}
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography
                                    sx={{
                                      fontSize: '13px',
                                      fontWeight: isItemActive ? 800 : 600,
                                      color: isItemActive ? '#14532d' : '#1e293b',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      maxWidth: { xs: 150, sm: 200, md: 240 },
                                    }}
                                  >
                                    {it.product?.styleNo || it.itemCode || it.name}
                                  </Typography>
                                  {it.product?.styleName && (
                                    <Typography
                                      sx={{
                                        fontSize: '10.5px',
                                        color: '#64748b',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: { xs: 150, sm: 200, md: 240 },
                                      }}
                                    >
                                      {it.product.styleName}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                              <Chip
                                size="small"
                                label={itConfigured ? `✓ ${t('rdMaterial.labelPrint.customized', 'Đã cấu hình')}` : `○ ${t('rdMaterial.labelPrint.not_customized', 'Chưa chỉnh')}`}
                                sx={{
                                  height: 20,
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  bgcolor: itConfigured ? '#dcfce7' : '#f1f5f9',
                                  color: itConfigured ? '#15803d' : '#64748b',
                                  border: `1px solid ${itConfigured ? '#86efac' : '#e2e8f0'}`,
                                  flexShrink: 0,
                                  ml: 1.5
                                }}
                              />
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>

                    <Tooltip title={t('common.next', 'Mẫu tiếp theo')}>
                      <span>
                        <IconButton
                          size="small"
                          disabled={activeGarmentIndex >= items.length - 1}
                          onClick={() => setActiveGarmentId(items[activeGarmentIndex + 1].id)}
                          sx={{
                            border: '1.5px solid #cbd5e1',
                            bgcolor: '#ffffff',
                            p: 0.75,
                            width: 38,
                            height: 38,
                            borderRadius: '8px',
                            color: '#334155',
                            transition: 'all 0.15s ease',
                            '&:hover': {
                              bgcolor: '#ffffff',
                              borderColor: '#16a34a',
                              color: '#16a34a',
                              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.15)',
                            },
                            '&.Mui-disabled': { opacity: 0.35, bgcolor: '#f8fafc', borderColor: '#e2e8f0' },
                          }}
                        >
                          <NavigateNextIcon sx={{ fontSize: 22 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Card>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                  <TuneIcon sx={{ fontSize: 18, color: '#15803d' }} />
                  <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                    {t('rdMaterial.labelPrint.configuring_sample', 'Cấu hình thẻ')}: {activeGarment.product?.styleNo || activeGarment.itemCode}
                  </Typography>
                </Box>
              )}

                <GarmentSampleTagConfigPanel
                  item={activeGarment}
                  config={garmentConfigs[activeGarment.id] || {}}
                  onChange={handleActiveGarmentConfigChange}
                  onOpenPropertyManager={handleOpenPropertyManager}
                />
            </Box>
          )}

          {/* Non-Garment Zebra Settings & Item Info */}
          {!isGarment && printMode === 'ROLL' && (
            <Card sx={{ mb: 2, borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: 'none', p: 2 }}>
              <Typography fontWeight={700} fontSize={14} color="#1e293b" mb={1.5}>
                {t('rdMaterial.print_zebra_settings', 'Cài đặt in máy Zebra / Tem cuộn')}
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
                    {t('rdMaterial.print_size', 'Kích thước Label')}
                  </Typography>
                  <Select fullWidth size="small" value={sizeIdx} onChange={(e) => setSizeIdx(+e.target.value)} sx={{ mt: 0.5, borderRadius: '4px', fontSize: 13 }}>
                    {LABEL_SIZES.map((s, i) => <MenuItem key={i} value={i}>{s.label}</MenuItem>)}
                  </Select>
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
                    {t('rdMaterial.print_copies', 'Số lượng in')}
                  </Typography>
                  <AppTextField type="number" value={copies} onChange={(e) => setCopies(+e.target.value)} inputProps={{ min: 1, max: 50 }} sx={{ mt: 0.5, width: 100 }} />
                </Box>
              </Stack>
            </Card>
          )}

          {!isGarment && singleItem && (
            <Card sx={{ borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                <Typography fontWeight={700} fontSize={13} color="#1e293b">{t('rdMaterial.print_item_info', 'Thông tin Item')}</Typography>
              </Box>
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  [t('rdMaterial.itemCode', 'Item Code'), singleItem.itemCode],
                  [t('rdMaterial.name', 'Name'), singleItem.name],
                  [t('rdMaterial.itemType', 'Type'), singleItem.itemType],
                  [t('rdMaterial.supplier', 'Supplier'), singleItem.supplierName],
                  [t('rdMaterial.location', 'Location'), singleItem.location],
                  [t('rdMaterial.quantity', 'Quantity'), `${singleItem.quantity ?? '–'}`],
                ].map(([k, v]) => (
                  <Box key={k as string} display="flex" justifyContent="space-between" fontSize={12}>
                    <Typography fontSize={12} color="text.secondary">{k}:</Typography>
                    <Typography fontWeight={600} fontSize={12} color="#111" textAlign="right">{v || '–'}</Typography>
                  </Box>
                ))}
              </Box>
            </Card>
          )}
        </Grid>

        {/* Right: Print Preview */}
        <Grid
          size={{ xs: 12, md: isGarment ? 7 : 7.5, lg: isGarment ? 7.5 : 8.2 }}
          sx={{
            display: isMobile ? (mobileTab === 'preview' ? 'flex' : 'none') : 'flex',
            position: { md: 'sticky' },
            top: { md: 96 },
            alignSelf: 'flex-start',
            height: { md: 'calc(100vh - 160px)' },
            flexDirection: 'column',
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.25} flexWrap="wrap" gap={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
                {printMode === 'A4'
                  ? t('rdMaterial.labelPrint.preview_title', { pages: totalA4Pages, defaultValue: `Xem trước trang in A4 (${totalA4Pages} trang)` })
                  : t('rdMaterial.print_preview', 'Preview Label')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {printMode === 'A4'
                  ? (isGarment ? t('rdMaterial.labelPrint.preview_a4_spec', 'Khổ A4 (210 × 297 mm) · 4 thẻ/trang') : t('rdMaterial.labelPrint.preview_sticker_spec', 'Khổ A4 (210 × 297 mm) · 10 tem/trang'))
                  : size.label}
              </Typography>
            </Box>

            {/* Zoom Controls & Cut Lines Toggle for A4 Preview */}
            {printMode === 'A4' && (
              <Box display="flex" alignItems="center" gap={1}>
                <Button
                  size="small"
                  variant={showCutLines ? 'contained' : 'outlined'}
                  onClick={() => setShowCutLines(prev => !prev)}
                  sx={{
                    height: 26,
                    border: showCutLines ? 'none' : '1px solid #cbd5e1',
                    borderRadius: '6px',
                    px: { xs: 1, sm: 1.25 },
                    py: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'none',
                    bgcolor: showCutLines ? '#16a34a' : '#ffffff',
                    color: showCutLines ? '#ffffff' : '#64748b',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      bgcolor: showCutLines ? '#15803d' : '#f8fafc',
                    },
                  }}
                >
                  ✂ {isMobile ? t('rdMaterial.labelPrint.cut_lines_short', 'Cắt') : t('rdMaterial.labelPrint.cut_lines', 'Đường kẻ cắt')}
                </Button>

                <ToggleButtonGroup
                  size="small"
                  value={zoomMode}
                  exclusive
                  onChange={(_, val) => { if (val) setZoomMode(val); }}
                  sx={{
                    height: 26,
                    bgcolor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    p: '2px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    '& .MuiToggleButton-root': {
                      border: 'none',
                      borderRadius: '4px',
                      px: { xs: 0.75, sm: 1 },
                      py: 0,
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'none',
                      color: '#64748b',
                      whiteSpace: 'nowrap',
                      '&.Mui-selected': {
                        bgcolor: '#16a34a',
                        color: '#ffffff',
                        fontWeight: 700,
                        '&:hover': { bgcolor: '#15803d' },
                      },
                    },
                  }}
                >
                  <ToggleButton value="fit-width">{isMobile ? t('rdMaterial.labelPrint.fit_width_short', 'Vừa rộng') : t('rdMaterial.labelPrint.fit_width', 'Vừa chiều rộng')}</ToggleButton>
                  <ToggleButton value="fit-page">{isMobile ? t('rdMaterial.labelPrint.fit_page_short', 'Trọn trang') : t('rdMaterial.labelPrint.fit_page', 'Xem trọn trang')}</ToggleButton>
                  <ToggleButton value="100%">100%</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}
          </Box>

          {printMode === 'A4' ? (
            <Box
              ref={previewBoxRef}
              sx={{
                bgcolor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                p: { xs: 1, md: 2 },
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: { xs: 'safe center', md: 'center' },
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {/* On-screen A4 Preview with dynamic zoom scale */}
              <Box
                id="a4-print-container"
                sx={{
                  zoom: zoomScale,
                  '@supports not (zoom: 1)': {
                    transform: `scale(${zoomScale})`,
                    transformOrigin: 'top center',
                  },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: 'zoom 0.15s ease',
                }}
              >
                <A4StickerSheet
                  items={a4ItemsList}
                  showCutLines={showCutLines}
                  garmentConfigs={garmentConfigs}
                  activeGarmentId={activeGarmentId}
                  onSelectGarment={handleSelectGarment}
                />
              </Box>
            </Box>
          ) : (
            <Paper sx={{ p: 3, borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: '#f8fafc', gap: 3, flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {items.map((it) => (
                <Box
                  key={it.id}
                  className="zebra-label-item"
                  sx={{
                    border: '2px solid #333',
                    borderRadius: '4px',
                    p: 2,
                    width: size.width,
                    fontFamily: 'monospace',
                    bgcolor: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  <Typography fontSize={9} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>
                    R&D Material Library
                  </Typography>
                  <Typography fontSize={14} fontWeight={800} lineHeight={1.2} mb={0.25}>{it.name}</Typography>
                  <Typography fontSize={10} color="text.secondary" mb={1}>
                    {it.itemCode} · {it.location} · {it.supplierName}
                  </Typography>
                  <Box display="flex" gap={1.5} alignItems="center">
                    <QRCodeSVG value={getItemQrValue(it)} size={72} />
                    <Box>
                      <Typography fontSize={9} color="text.secondary" lineHeight={1.8}>
                        Type: {it.itemType}<br />
                        {it.fabric?.weightGsm ? `GSM: ${it.fabric.weightGsm}` : ''}<br />
                        Qty: {it.quantity ?? '–'}<br />
                        <span style={{ fontSize: 8, color: '#aaa', wordBreak: 'break-all' }}>{getItemQrValue(it)}</span>
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
              <Typography fontSize={11} color="text.secondary">{size.label}</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Special Property Manager Dialog */}
      <SpecialPropertyManagerDialog
        open={propertyManagerOpen}
        onClose={() => setPropertyManagerOpen(false)}
        selectedId={activeGarment ? garmentConfigs[activeGarment.id]?.specialProperty?.id : undefined}
        onSelect={(prop: SpecialPropertyItem) => {
          if (activeGarment) {
            const cur = garmentConfigs[activeGarment.id] || {};
            const curProps = cur.specialProperties || (cur.specialProperty ? [cur.specialProperty] : []);
            const exists = curProps.some(p => (p.id && p.id === prop.id) || p.name.trim().toLowerCase() === prop.name.trim().toLowerCase());
            const nextProps = exists ? curProps : [...curProps, { id: prop.id, name: prop.name, iconUrl: prop.iconUrl }];
            handleGarmentConfigChange(activeGarment.id, {
              ...cur,
              specialProperties: nextProps,
              specialProperty: nextProps[0],
            });
          }
        }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: '6px' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* 🖨️ Direct Body Print Portal (rendered ONLY during print) 🖨️ */}
      {isPrintPortalActive && typeof document !== 'undefined' && document.body && createPortal(
        <Box id="print-portal-root">
          {printMode === 'A4' ? (
            <A4StickerSheet
              items={a4ItemsList}
              showCutLines={showCutLines}
              garmentConfigs={garmentConfigs}
            />
          ) : (
            <Box sx={{ p: 0, m: 0 }}>
              {items.map((it) => (
                <Box
                  key={it.id}
                  sx={{
                    width: size.width,
                    border: '2px solid #333',
                    borderRadius: '4px',
                    p: 2,
                    fontFamily: 'monospace',
                    bgcolor: '#fff',
                    pageBreakAfter: 'always',
                    mb: 2,
                  }}
                >
                  <Typography fontSize={9} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>
                    R&D Material Library
                  </Typography>
                  <Typography fontSize={14} fontWeight={800} lineHeight={1.2} mb={0.25}>{it.name}</Typography>
                  <Typography fontSize={10} color="text.secondary" mb={1}>
                    {it.itemCode} · {it.location} · {it.supplierName}
                  </Typography>
                  <Box display="flex" gap={1.5} alignItems="center">
                    <QRCodeSVG value={getItemQrValue(it)} size={72} />
                    <Box>
                      <Typography fontSize={9} color="text.secondary" lineHeight={1.8}>
                        Type: {it.itemType}<br />
                        {it.fabric?.weightGsm ? `GSM: ${it.fabric.weightGsm}` : ''}<br />
                        Qty: {it.quantity ?? '–'}<br />
                        <span style={{ fontSize: 8, color: '#aaa', wordBreak: 'break-all' }}>{getItemQrValue(it)}</span>
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>,
        document.body
      )}
    </Box>
  );
};

export default LabelPrintPage;
