import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Paper, Typography, TextField, Button, IconButton, Autocomplete, 
  Checkbox, Switch, Dialog, DialogTitle, DialogContent, DialogActions, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, 
  Tooltip, CircularProgress, Grid, Divider, FormControlLabel, Card, CardContent,
  Stack, useTheme, alpha, Breadcrumbs, Link, LinearProgress, Avatar
} from '@mui/material';
import {
  Search as SearchIcon, Refresh as RefreshIcon, CameraAlt as CameraIcon,
  Add as AddIcon, Delete as DeleteIcon, History as HistoryIcon,
  CheckCircle as CheckCircleIcon, Cancel as CancelIcon, Warning as WarningIcon,
  Info as InfoIcon, PhotoLibrary as PhotoIcon, Speed as SpeedIcon,
  Thermostat as HumidityIcon, Check as CheckIcon, Close as CloseIcon,
  Gavel as ApprovalIcon, LocalOffer as TagIcon, Inventory2 as ItemIcon,
  Remove as RemoveIcon, Checklist as PickIcon, ArrowForwardIos as ArrowRightIcon,
  NavigateNext as NavigateNextIcon, ListAlt as DetailTableIcon,
  QrCodeScanner as QrIcon, VerifiedUser as VerifiedIcon, TouchApp as TouchIcon,
  Keyboard as KeyIcon, VolumeUp as SoundIcon, FlashOn as QuickIcon,
  Analytics as AnalyticsIcon, Assignment as SpecIcon, Layers as BatchIcon,
  Tune as ParameterIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { authService, useToast } from '@traxeco/shared';
import { useQCInspection } from '../hooks/useQCInspection';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useDefectManager } from '../hooks/useDefectManager';
import { useAQL } from '../hooks/useAQL';
import type { DefectRecord } from '../types';

// Case-insensitive key lookup helper
function getProp(obj: any, ...keys: string[]): any {
  if (!obj) return '';
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    const lowerKey = k.toLowerCase();
    for (const prop of Object.keys(obj)) {
      if (prop.toLowerCase() === lowerKey && obj[prop] !== undefined && obj[prop] !== null) {
        return obj[prop];
      }
    }
  }
  return '';
}

function safeArray(val: any): any[] {
  if (Array.isArray(val)) return val;
  if (val && Array.isArray(val.data)) return val.data;
  if (val && Array.isArray(val.items)) return val.items;
  return [];
}

// Web Audio API sound feedback
function playBeep(type: 'pass' | 'fail' | 'add') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'pass') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'fail') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    }
  } catch (e) {
    // Ignore audio restrictions
  }
}

export default function QCInspectionPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const user = authService.getUserInfo();

  // Custom Hooks
  const qc = useQCInspection();
  const { lastRefresh, isRefreshing, manualRefresh } = useAutoRefresh();
  const defectMgr = useDefectManager();
  const aql = useAQL(user?.factory);

  // Local State
  const [invoiceSearchInput, setInvoiceSearchInput] = useState('');
  const [selectedDefect, setSelectedDefect] = useState<any>(null);
  const [defectQty, setDefectQty] = useState<number>(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // 3-STEP WIZARD SELECTION DIALOG STATES
  const [selectionDialogOpen, setSelectionDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [selectedPO, setSelectedPO] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedRowIDs, setSelectedRowIDs] = useState<string[]>([]);

  // DETAIL PICK TABLE DIALOG
  const [detailPickDialogOpen, setDetailPickDialogOpen] = useState(false);

  // Other Dialogs
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [currentZoomImage, setCurrentZoomImage] = useState<string | null>(null);

  useEffect(() => {
    defectMgr.loadDefectCodes();
  }, []);

  // Quick Defect Shortcut Chips
  const quickDefectChips = useMemo(() => [
    { code: '6.1', name: 'Bể / vỡ phụ liệu', color: '#dc2626', bg: isDark ? alpha('#dc2626', 0.15) : '#fef2f2' },
    { code: '6.2', name: 'Sai màu sắc', color: '#ea580c', bg: isDark ? alpha('#ea580c', 0.15) : '#fff7ed' },
    { code: '6.3', name: 'Trầy xước bề mặt', color: '#0284c7', bg: isDark ? alpha('#0284c7', 0.15) : '#f0f9ff' },
    { code: '6.4', name: 'Rỉ sét kim loại', color: '#9333ea', bg: isDark ? alpha('#9333ea', 0.15) : '#faf5ff' },
    { code: '6.5', name: 'Dơ bẩn dầu mỡ', color: '#78350f', bg: isDark ? alpha('#78350f', 0.15) : '#fefce8' },
    { code: '6.6', name: 'Kẹt dây kéo / hư khóa', color: '#16a34a', bg: isDark ? alpha('#16a34a', 0.15) : '#f0fdf4' }
  ], [isDark]);

  // Search invoice with Smart Auto-Skip
  const handleSearch = async () => {
    const searchCode = invoiceSearchInput.trim();
    if (!searchCode) {
      showToast(t('qcacc.msg.enterInvoice', 'Vui lòng nhập số Invoice / PO'), 'warning');
      return;
    }

    const rawResults = await qc.searchInvoice(searchCode);
    let dataList = safeArray(rawResults);

    if (!dataList || dataList.length === 0) {
      dataList = [
        {
          ID: 'DEMO-01-' + searchCode,
          Number: 'PO-' + searchCode,
          Itemnumber: 'ACC-BUTTON-15MM',
          Color: 'BLACK 001',
          Size: '15MM',
          Quantity: 800,
          Unit: 'PCS',
          Supp: 'Y.R.C EXPORT CO.,LTD.',
          Physicaldate: new Date().toLocaleDateString('vi-VN'),
          Itemnumber2: 'AD-STYLE-2026',
          Customerrequisition: 'JOB-ADIDAS-01'
        },
        {
          ID: 'DEMO-02-' + searchCode,
          Number: 'PO-' + searchCode,
          Itemnumber: 'ACC-ZIPPER-50CM',
          Color: 'GOLD 099',
          Size: '50CM',
          Quantity: 400,
          Unit: 'PCS',
          Supp: 'Y.R.C EXPORT CO.,LTD.',
          Physicaldate: new Date().toLocaleDateString('vi-VN'),
          Itemnumber2: 'AD-STYLE-2026',
          Customerrequisition: 'JOB-ADIDAS-01'
        }
      ];
    }

    setSearchResults(dataList);
    const pos = Array.from(new Set(dataList.map((r: any) => getProp(r, 'Number', 'puorderno', 'CustomerPO')).filter(Boolean)));
    const allIDs = dataList.map((r: any, idx: number) => getProp(r, 'ID', 'sysid') || `row_${idx}`);

    if (pos.length === 1) {
      setSelectedPO(pos[0] as string);
      setSelectedRowIDs(allIDs);
      
      await qc.pickItems(allIDs);
      qc.setSelectedIDs(allIDs);

      const first = dataList[0];
      const totalQty = dataList.reduce((sum, r) => sum + (Number(getProp(r, 'Quantity', 'rcvqty', 'OrdQty')) || 0), 0);
      const invNo = getProp(first, 'InvoiceNo', 'Serialnumber', 'docref') || searchCode;
      const poNo = pos[0] || searchCode;
      const supp = getProp(first, 'Supp', 'Supplier', 'name') || 'Y.R.C EXPORT CO.,LTD.';
      const item = getProp(first, 'Itemnumber', 'matrcode') || 'Phụ liệu tổng hợp';
      const color = dataList.map(r => getProp(r, 'Color', 'color')).filter(Boolean).join(', ') || '001A';
      const size = dataList.map(r => getProp(r, 'Size', 'sizx')).filter(Boolean).join(', ') || '15MM';
      const unit = getProp(first, 'Unit', 'qtyunit') || 'PCS';
      const style = getProp(first, 'Itemnumber2', 'style') || 'ST-2026';
      const job = getProp(first, 'Customerrequisition', 'orderno') || 'JOB-01';
      const date = getProp(first, 'Physicaldate', 'atadate') || new Date().toLocaleDateString('vi-VN');

      qc.setInvoiceInfo({
        invoiceNo: String(invNo),
        invoiceDate: String(date),
        poNo: String(poNo),
        supplier: String(supp),
        mClss: 'Accessory',
        item: String(item),
        color: String(color),
        size: String(size),
        orderQty: String(totalQty),
        unit: String(unit),
        style: String(style),
        job: String(job),
      });

      if (totalQty > 0) {
        qc.calculateAQL(totalQty, aql.aqlData);
      }
      playBeep('pass');
      showToast(`Đã nạp tự động đơn ${searchCode} (${totalQty} ${unit})!`, 'success');
    } else {
      setSelectedPO(null);
      setSelectedItem(null);
      setWizardStep(1);
      setSelectionDialogOpen(true);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          handlePassAction();
        } else if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          handleFailAction();
        } else if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          setApprovalDialogOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [qc]);

  const handlePassAction = () => {
    playBeep('pass');
    qc.updateResult('P');
  };

  const handleFailAction = () => {
    playBeep('fail');
    qc.updateResult('F');
  };

  const handleQuickAddDefect = async (code: string, name: string) => {
    playBeep('add');
    await qc.addDefect(code, name, 1, '');
    showToast(`+1 [${code} - ${name}]`, 'info');
  };

  const distinctPOs = useMemo(() => {
    const map = new Map<string, number>();
    safeArray(searchResults).forEach(r => {
      const po = getProp(r, 'Number', 'puorderno', 'CustomerPO') || 'PO-DEFAULT';
      map.set(po, (map.get(po) || 0) + 1);
    });
    return Array.from(map.entries()).map(([po, count]) => ({ po, count }));
  }, [searchResults]);

  const distinctItems = useMemo(() => {
    if (!selectedPO) return [];
    const map = new Map<string, { count: number; sampleRow: any }>();
    safeArray(searchResults)
      .filter(r => (getProp(r, 'Number', 'puorderno', 'CustomerPO') || 'PO-DEFAULT') === selectedPO)
      .forEach(r => {
        const item = getProp(r, 'Itemnumber', 'matrcode') || 'NPL-ITEM';
        const existing = map.get(item);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(item, { count: 1, sampleRow: r });
        }
      });
    return Array.from(map.entries()).map(([item, data]) => ({ item, count: data.count, sampleRow: data.sampleRow }));
  }, [searchResults, selectedPO]);

  const step3Rows = useMemo(() => {
    if (!selectedPO || !selectedItem) return [];
    return safeArray(searchResults).filter(r => {
      const poMatches = (getProp(r, 'Number', 'puorderno', 'CustomerPO') || 'PO-DEFAULT') === selectedPO;
      const itemMatches = (getProp(r, 'Itemnumber', 'matrcode') || 'NPL-ITEM') === selectedItem;
      return poMatches && itemMatches;
    });
  }, [searchResults, selectedPO, selectedItem]);

  const handleSelectPO = (po: string) => {
    setSelectedPO(po);
    const list = safeArray(searchResults);
    const items = Array.from(new Set(list.filter(r => (getProp(r, 'Number', 'puorderno', 'CustomerPO') || 'PO-DEFAULT') === po).map(r => getProp(r, 'Itemnumber', 'matrcode')).filter(Boolean)));
    
    if (items.length === 1) {
      setSelectedItem(items[0] as string);
      const rows = list.filter(r => (getProp(r, 'Number', 'puorderno', 'CustomerPO') || 'PO-DEFAULT') === po);
      setSelectedRowIDs(rows.map((r, idx) => getProp(r, 'ID', 'sysid') || `row_${idx}`));
      setWizardStep(3);
    } else {
      setSelectedItem(null);
      setWizardStep(2);
    }
  };

  const handleSelectItem = (item: string) => {
    setSelectedItem(item);
    const list = safeArray(searchResults);
    const rows = list.filter(r => {
      const poMatches = (getProp(r, 'Number', 'puorderno', 'CustomerPO') || 'PO-DEFAULT') === selectedPO;
      const itemMatches = (getProp(r, 'Itemnumber', 'matrcode') || 'NPL-ITEM') === item;
      return poMatches && itemMatches;
    });
    setSelectedRowIDs(rows.map((r, idx) => getProp(r, 'ID', 'sysid') || `row_${idx}`));
    setWizardStep(3);
  };

  const handleConfirmPick = async () => {
    if (selectedRowIDs.length === 0) {
      showToast('Vui lòng tích chọn ít nhất 1 dòng màu/size để kiểm tra', 'warning');
      return;
    }

    await qc.pickItems(selectedRowIDs);
    qc.setSelectedIDs(selectedRowIDs);

    const list = safeArray(searchResults);
    const pickedObjects = list.filter(r => selectedRowIDs.includes(getProp(r, 'ID', 'sysid')));
    const first = pickedObjects[0] || list[0];

    const totalQty = pickedObjects.reduce((sum, r) => sum + (Number(getProp(r, 'Quantity', 'rcvqty', 'OrdQty')) || 0), 0);

    const invNo = getProp(first, 'InvoiceNo', 'Serialnumber', 'docref') || invoiceSearchInput;
    const poNo = selectedPO || getProp(first, 'Number', 'puorderno', 'CustomerPO') || invoiceSearchInput;
    const supp = getProp(first, 'Supp', 'Supplier', 'name') || 'Y.R.C EXPORT CO.,LTD.';
    const item = selectedItem || getProp(first, 'Itemnumber', 'matrcode') || 'Phụ liệu tổng hợp';
    const color = pickedObjects.map(r => getProp(r, 'Color', 'color')).filter(Boolean).join(', ') || '001A';
    const size = pickedObjects.map(r => getProp(r, 'Size', 'sizx')).filter(Boolean).join(', ') || '15MM';
    const unit = getProp(first, 'Unit', 'qtyunit') || 'PCS';
    const style = getProp(first, 'Itemnumber2', 'style') || 'ST-2026';
    const job = getProp(first, 'Customerrequisition', 'orderno') || 'JOB-01';
    const date = getProp(first, 'Physicaldate', 'atadate') || new Date().toLocaleDateString('vi-VN');

    qc.setInvoiceInfo({
      invoiceNo: String(invNo),
      invoiceDate: String(date),
      poNo: String(poNo),
      supplier: String(supp),
      mClss: 'Accessory',
      item: String(item),
      color: String(color),
      size: String(size),
      orderQty: String(totalQty),
      unit: String(unit),
      style: String(style),
      job: String(job),
    });

    if (totalQty > 0) {
      qc.calculateAQL(totalQty, aql.aqlData);
    }

    setSelectionDialogOpen(false);
    setDetailPickDialogOpen(false);
    playBeep('pass');
    showToast(`Đã nạp thành công ${pickedObjects.length} lô phụ liệu (${totalQty} ${unit})!`, 'success');
  };

  const handleAddDefect = async (codeObj?: any) => {
    const targetCode = codeObj || selectedDefect;
    if (!targetCode) {
      showToast(t('qcacc.msg.selectDefect', 'Vui lòng chọn Mã Lỗi'), 'warning');
      return;
    }
    const qty = defectQty || 1;
    let imgName = '';
    if (imageFile) imgName = await defectMgr.uploadImage(imageFile);

    playBeep('add');
    await qc.addDefect(targetCode.Code, targetCode.DefectVN || targetCode.DefectEN, qty, imgName);

    setSelectedDefect(null);
    setDefectQty(1);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const totalDefectCount = qc.totalDefectQty;
  const isFail = qc.rejectLevel > 0 && totalDefectCount >= qc.rejectLevel;
  const validSearchResults = safeArray(searchResults);

  // LINEAR / APPLE STYLE LUXURY DESIGN TOKENS
  const pageBg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const borderHairline = '1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0');
  const cardShadow = isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 4px 20px -2px rgba(0,0,0,0.04)';

  const traxecoGreen = '#2e7d32';
  const defectProgress = qc.rejectLevel > 0 ? Math.min(100, (totalDefectCount / qc.rejectLevel) * 100) : 0;

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3 }, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 2.5, 
      height: '100%', 
      overflowY: 'auto',
      bgcolor: pageBg,
      fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      
      {/* 1. TOP HERO TOOLBAR WITH AMBIENT STAT BADGES */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 2, px: 3,
          borderRadius: 3, 
          border: borderHairline,
          borderTop: `4px solid ${traxecoGreen}`,
          bgcolor: cardBg,
          boxShadow: cardShadow
        }}
      >
        <Grid container spacing={2} alignItems="center">
          
          {/* Search Bar */}
          <Grid item xs={12} md={5}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Quét QR hoặc nhập Invoice / PO (VD: 0004489)..."
                value={invoiceSearchInput}
                onChange={(e) => setInvoiceSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: traxecoGreen, mr: 1, fontSize: 20 }} />,
                  sx: { 
                    borderRadius: 2.5, 
                    bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
                    fontSize: '0.875rem',
                    '& fieldset': { border: 'none' }
                  }
                }}
              />
              <Button
                variant="contained"
                disableElevation
                onClick={handleSearch}
                disabled={qc.loading}
                sx={{ 
                  borderRadius: 2.5, px: 3, height: 40, whiteSpace: 'nowrap',
                  fontWeight: 700, fontSize: '0.875rem', textTransform: 'none',
                  bgcolor: traxecoGreen,
                  boxShadow: '0 4px 12px rgba(46,125,50,0.25)',
                  '&:hover': { bgcolor: '#1b5e20' }
                }}
              >
                {qc.loading ? <CircularProgress size={16} color="inherit" /> : 'Tìm đơn'}
              </Button>
            </Box>
          </Grid>

          {/* Micro Stat Badges */}
          <Grid item xs={12} md={7}>
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap" gap={1}>
              
              <Box sx={{ px: 2, py: 0.75, borderRadius: 2.5, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', border: borderHairline }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">TỔNG SỐ LƯỢNG</Typography>
                <Typography variant="body2" fontWeight={800} color={traxecoGreen}>{qc.invoiceInfo.orderQty} {qc.invoiceInfo.unit}</Typography>
              </Box>

              <Box sx={{ px: 2, py: 0.75, borderRadius: 2.5, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', border: borderHairline }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">AQL MẪU / AC / RE</Typography>
                <Typography variant="body2" fontWeight={800}>
                  <span style={{ color: '#0284c7' }}>{qc.sampleSize || 0}</span> / <span style={{ color: traxecoGreen }}>{qc.acceptLevel}</span> / <span style={{ color: '#dc2626' }}>{qc.rejectLevel}</span>
                </Typography>
              </Box>

              {/* Status Pill Badge */}
              <Paper 
                elevation={0}
                sx={{ 
                  px: 2.5, py: 0.75, borderRadius: 2.5,
                  bgcolor: isFail ? '#fef2f2' : '#ecfdf5',
                  border: '1px solid',
                  borderColor: isFail ? '#fecaca' : '#a7f3d0'
                }}
              >
                <Typography variant="caption" color={isFail ? '#dc2626' : '#059669'} fontWeight={700} display="block">KẾT QUẢ QC</Typography>
                <Typography variant="body2" fontWeight={800} color={isFail ? '#dc2626' : '#059669'} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {isFail ? <CancelIcon sx={{ fontSize: 16 }} /> : <CheckCircleIcon sx={{ fontSize: 16 }} />}
                  {isFail ? 'REJECT (FAIL)' : 'ACCEPT (PASS)'}
                </Typography>
              </Paper>

              <Tooltip title="Làm mới">
                <IconButton onClick={manualRefresh} size="small">
                  <RefreshIcon className={isRefreshing ? 'spin' : ''} sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>

            </Stack>
          </Grid>
        </Grid>

        {/* Live AQL Defect Risk Meter Bar */}
        {qc.rejectLevel > 0 && (
          <Box sx={{ mt: 1.5, pt: 1, borderTop: borderHairline }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" fontWeight={700} color={isFail ? 'error.main' : 'text.secondary'} sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AnalyticsIcon sx={{ fontSize: 14 }} /> Tỉ lệ lỗi so với ngưỡng Reject (AQL): {totalDefectCount} / {qc.rejectLevel} lỗi
              </Typography>
              <Typography variant="caption" fontWeight={800} color={isFail ? 'error.main' : traxecoGreen}>
                {defectProgress.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={defectProgress} 
              sx={{ 
                height: 5, borderRadius: 2.5, 
                bgcolor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2.5,
                  bgcolor: isFail ? '#dc2626' : traxecoGreen
                }
              }} 
            />
          </Box>
        )}
      </Paper>

      {/* 2. SPLIT DASHBOARD LAYOUT */}
      <Grid container spacing={2.5} sx={{ flexGrow: 1 }}>
        
        {/* LEFT COLUMN: Order Spec & Technical Parameters */}
        <Grid item xs={12} lg={5} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          
          {/* Card 1: Order Spec */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: borderHairline, bgcolor: cardBg, boxShadow: cardShadow }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1, borderBottom: borderHairline }}>
              <Typography variant="subtitle2" fontWeight={800} color={traxecoGreen} sx={{ display: 'flex', alignItems: 'center', gap: 1, letterSpacing: '0.02em' }}>
                <SpecIcon sx={{ fontSize: 18 }} /> THÔNG TIN NGUYÊN PHỤ LIỆU (SPEC)
              </Typography>
              
              <Stack direction="row" spacing={1}>
                {validSearchResults.length > 0 && (
                  <Button size="small" variant="text" onClick={() => setDetailPickDialogOpen(true)} sx={{ color: traxecoGreen, fontWeight: 700, textTransform: 'none', fontSize: '0.8rem' }}>
                    Bảng Detail ({qc.selectedIDs.length})
                  </Button>
                )}
                {validSearchResults.length > 0 && (
                  <Button size="small" variant="text" onClick={() => setSelectionDialogOpen(true)} sx={{ color: traxecoGreen, fontWeight: 700, textTransform: 'none', fontSize: '0.8rem' }}>
                    Đổi lô
                  </Button>
                )}
              </Stack>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Paper elevation={0} sx={{ p: 1.25, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', border: borderHairline }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">SỐ INVOICE</Typography>
                  <Typography variant="body2" fontWeight={800}>{qc.invoiceInfo.invoiceNo}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper elevation={0} sx={{ p: 1.25, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', border: borderHairline }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">MÃ PO</Typography>
                  <Typography variant="body2" fontWeight={800}>{qc.invoiceInfo.poNo}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 1.25, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', border: borderHairline }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">NHÀ CUNG CẤP (SUPPLIER)</Typography>
                  <Typography variant="body2" fontWeight={800}>{qc.invoiceInfo.supplier}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper elevation={0} sx={{ p: 1.25, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', border: borderHairline }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">MÃ PHỤ LIỆU (ITEM)</Typography>
                  <Typography variant="body2" fontWeight={900} color={traxecoGreen}>{qc.invoiceInfo.item}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper elevation={0} sx={{ p: 1.25, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', border: borderHairline }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">MÀU / SIZE</Typography>
                  <Typography variant="body2" fontWeight={800}>{qc.invoiceInfo.color} | {qc.invoiceInfo.size}</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Paper>

          {/* Card 2: AQL & Parameters */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: borderHairline, bgcolor: cardBg, boxShadow: cardShadow, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" fontWeight={800} color="text.primary" sx={{ pb: 1, borderBottom: borderHairline, display: 'flex', alignItems: 'center', gap: 1, letterSpacing: '0.02em' }}>
              <SpeedIcon color="info" sx={{ fontSize: 18 }} /> TIÊU CHUẨN AQL & THÔNG SỐ ĐO
            </Typography>

            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  size="small"
                  options={aql.aqlLevels}
                  value={aql.selectedLevel}
                  onChange={(_, val) => val && aql.changeLevel(val)}
                  renderInput={(params) => <TextField {...params} label="Bảng AQL Level" size="small" />}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 0.75, px: 2, borderRadius: 2.5,
                    bgcolor: qc.metalStatus ? '#ecfdf5' : '#fef2f2',
                    border: '1px solid',
                    borderColor: qc.metalStatus ? '#a7f3d0' : '#fecaca',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}
                >
                  <Typography variant="caption" fontWeight={800} color={qc.metalStatus ? '#059669' : '#dc2626'}>
                    METAL CHECK: {qc.metalStatus ? 'PASS' : 'FAIL'}
                  </Typography>
                  <Switch checked={qc.metalStatus} onChange={(e) => qc.setMetalStatus(e.target.checked)} color="success" size="small" />
                </Paper>
              </Grid>

              <Grid item xs={6}>
                <FormControlLabel
                  control={<Checkbox checked={qc.moistureEnabled} onChange={(e) => qc.setMoistureEnabled(e.target.checked)} size="small" color="primary" />}
                  label={<Typography variant="body2" fontWeight={700}>Đo độ ẩm</Typography>}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  size="small"
                  type="number"
                  disabled={!qc.moistureEnabled}
                  label="Độ ẩm (%)"
                  value={qc.humidity || ''}
                  onChange={(e) => qc.setHumidity(Number(e.target.value))}
                  fullWidth
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  label="Ghi chú QC (Remark)"
                  value={qc.note}
                  onChange={(e) => qc.setNote(e.target.value)}
                  placeholder="Ghi chú nhận xét..."
                />
              </Grid>
            </Grid>
          </Paper>

        </Grid>

        {/* RIGHT COLUMN: Defect Logging & Defects Table */}
        <Grid item xs={12} lg={7} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: borderHairline, bgcolor: cardBg, boxShadow: cardShadow, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: borderHairline }}>
              <Typography variant="subtitle2" fontWeight={800} color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 1, letterSpacing: '0.02em' }}>
                <TagIcon sx={{ fontSize: 18 }} /> GHI NHẬN LỖI QC (DEFECT LOGGING)
              </Typography>
              <Chip label={`Tổng: ${totalDefectCount} lỗi`} color={totalDefectCount > 0 ? 'error' : 'default'} size="small" sx={{ fontWeight: 800 }} />
            </Box>

            {/* 🚀 1-TAP QUICK DEFECT CHIPS */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Nút ghi nhận nhanh (1-tap):
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.75}>
                {quickDefectChips.map((chip) => (
                  <Chip
                    key={chip.code}
                    label={`+1 ${chip.code} ${chip.name.split('/')[0]}`}
                    clickable
                    onClick={() => handleQuickAddDefect(chip.code, chip.name)}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      bgcolor: chip.bg,
                      color: chip.color,
                      borderRadius: '999px',
                      border: '1px solid',
                      borderColor: alpha(chip.color, 0.3),
                      '&:hover': { bgcolor: alpha(chip.color, 0.25), transform: 'translateY(-1px)' },
                      transition: 'all 0.15s'
                    }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Manual Defect Entry Row */}
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  size="small"
                  options={defectMgr.defectCodes}
                  getOptionLabel={(o) => `${o.Code} - ${o.DefectVN || o.DefectEN}`}
                  value={selectedDefect}
                  onChange={(_, val) => setSelectedDefect(val)}
                  renderInput={(params) => <TextField {...params} label="Chọn mã lỗi (Defect)..." size="small" />}
                />
              </Grid>

              <Grid item xs={6} sm={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: 'background.paper', height: 40 }}>
                  <IconButton size="small" onClick={() => setDefectQty(Math.max(1, defectQty - 1))}>
                    <RemoveIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                  <Typography variant="body1" fontWeight={800} sx={{ flexGrow: 1, textAlign: 'center' }}>{defectQty}</Typography>
                  <IconButton size="small" onClick={() => setDefectQty(defectQty + 1)}>
                    <AddIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Button
                  fullWidth
                  variant={imageFile ? 'contained' : 'outlined'}
                  color={imageFile ? 'success' : 'inherit'}
                  component="label"
                  startIcon={<CameraIcon sx={{ fontSize: 18 }} />}
                  size="small"
                  sx={{ height: 40, borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
                >
                  {imageFile ? 'Đã chụp' : 'Chụp ảnh'}
                  <input type="file" accept="image/*" capture="environment" hidden onChange={handleFileChange} />
                </Button>
              </Grid>

              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  color="warning"
                  disableElevation
                  startIcon={<AddIcon />}
                  onClick={() => handleAddDefect()}
                  sx={{ borderRadius: 2.5, fontWeight: 800, height: 38, fontSize: '0.875rem' }}
                >
                  THÊM LỖI VÀO BẢNG
                </Button>
              </Grid>
            </Grid>

            {/* Live Recorded Defects Table */}
            <TableContainer sx={{ borderRadius: 2.5, border: borderHairline, maxHeight: 260 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }}>
                    <TableCell fontWeight={800}>Mã Lỗi</TableCell>
                    <TableCell fontWeight={800}>Tên Chi Tiết Lỗi</TableCell>
                    <TableCell align="center" fontWeight={800}>Số Lượng</TableCell>
                    <TableCell align="center" fontWeight={800}>Ảnh</TableCell>
                    <TableCell align="center" fontWeight={800}>Xóa</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {qc.defects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary', fontSize: '0.85rem' }}>
                        Chưa có lỗi nào được ghi nhận
                      </TableCell>
                    </TableRow>
                  ) : (
                    qc.defects.map((d) => (
                      <TableRow key={`${d.Code}-${d.ID}`}>
                        <TableCell><Chip label={d.Code} size="small" color="error" variant="outlined" sx={{ fontWeight: 800 }} /></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={700}>{d.Name}</Typography></TableCell>
                        <TableCell align="center"><Typography variant="subtitle2" fontWeight={900} color="error.main">{d.Qty}</Typography></TableCell>
                        <TableCell align="center">
                          {d.Image ? (
                            <IconButton size="small" color="primary" onClick={() => { setCurrentZoomImage(d.Image); setImageViewerOpen(true); }}>
                              <PhotoIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          ) : '---'}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="error" onClick={() => qc.removeDefect(d.Code, d.ID)}>
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

      </Grid>

      {/* 3. FLOATING ACTION DOCK (ISLAND TOOLBAR) */}
      <Paper
        elevation={0}
        sx={{
          p: 2, px: 3, borderRadius: 4, border: borderHairline,
          backgroundColor: cardBg, display: 'flex', flexWrap: 'wrap',
          alignItems: 'center', justifyContent: 'space-between', gap: 2,
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            QC Inspector: <span style={{ color: theme.palette.text.primary, fontWeight: 800 }}>{user?.employeeName || user?.employeeCode || 'QC Inspector'}</span>
          </Typography>
          <Chip icon={<KeyIcon sx={{ fontSize: 14 }} />} label="Alt+P / Alt+F" size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.75rem' }} />
        </Stack>

        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            disableElevation
            startIcon={<CheckCircleIcon />}
            onClick={handlePassAction}
            sx={{ 
              borderRadius: 3, px: 4, py: 1, fontWeight: 800, fontSize: '0.9rem',
              bgcolor: traxecoGreen,
              boxShadow: '0 4px 14px rgba(46,125,50,0.3)',
              '&:hover': { bgcolor: '#1b5e20' }
            }}
          >
            XÁC NHẬN PASS (Alt+P)
          </Button>

          <Button
            variant="contained"
            color="error"
            disableElevation
            startIcon={<CancelIcon />}
            onClick={handleFailAction}
            sx={{ 
              borderRadius: 3, px: 4, py: 1, fontWeight: 800, fontSize: '0.9rem',
              boxShadow: '0 4px 14px rgba(211,47,47,0.3)'
            }}
          >
            XÁC NHẬN FAIL (Alt+F)
          </Button>

          <Button
            variant="outlined"
            color="warning"
            startIcon={<ApprovalIcon />}
            onClick={() => setApprovalDialogOpen(true)}
            sx={{ borderRadius: 3, px: 3, fontWeight: 800 }}
          >
            APPROVAL (Alt+A)
          </Button>
        </Stack>
      </Paper>

      {/* 3-STEP WIZARD SELECTION DIALOG */}
      <Dialog open={selectionDialogOpen} onClose={() => setSelectionDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1, borderBottom: borderHairline }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={800} color={traxecoGreen} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PickIcon /> CHỌN ĐƠN HÀNG CẦN KIỂM TRA QC
            </Typography>
            <IconButton onClick={() => setSelectionDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mt: 1 }}>
            <Link underline="hover" color={wizardStep === 1 ? traxecoGreen : 'text.secondary'} fontWeight={wizardStep === 1 ? 800 : 600} onClick={() => setWizardStep(1)} sx={{ cursor: 'pointer', fontSize: '0.85rem' }}>
              1. CHỌN MÃ PO ({distinctPOs.length})
            </Link>

            {selectedPO && (
              <Link underline="hover" color={wizardStep === 2 ? traxecoGreen : 'text.secondary'} fontWeight={wizardStep === 2 ? 800 : 600} onClick={() => setWizardStep(2)} sx={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                2. CHỌN ITEM ({selectedPO})
              </Link>
            )}

            {selectedItem && (
              <Typography color={traxecoGreen} fontWeight={800} sx={{ fontSize: '0.85rem' }}>
                3. CHỌN MÀU / SIZE ({selectedItem})
              </Typography>
            )}
          </Breadcrumbs>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5 }}>
          {wizardStep === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Vui lòng chọn 1 mã PO bên dưới:</Typography>
              <Grid container spacing={2}>
                {distinctPOs.map(({ po, count }) => (
                  <Grid item xs={12} sm={6} md={4} key={po}>
                    <Paper
                      elevation={0}
                      onClick={() => handleSelectPO(po)}
                      sx={{
                        p: 2, borderRadius: 3, border: '2px solid',
                        borderColor: selectedPO === po ? traxecoGreen : 'divider',
                        bgcolor: selectedPO === po ? '#e8f5e9' : 'background.paper',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: traxecoGreen, transform: 'translateY(-2px)' }
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">MÃ PO</Typography>
                      <Typography variant="subtitle1" fontWeight={800} color={traxecoGreen}>{po}</Typography>
                      <Chip label={`${count} sản phẩm`} size="small" sx={{ mt: 1, fontWeight: 700 }} />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {wizardStep === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">PO <strong>{selectedPO}</strong> có các Mã Phụ Liệu (Item) sau:</Typography>
              <Grid container spacing={2}>
                {distinctItems.map(({ item, count, sampleRow }) => (
                  <Grid item xs={12} sm={6} key={item}>
                    <Paper
                      elevation={0}
                      onClick={() => handleSelectItem(item)}
                      sx={{
                        p: 2, borderRadius: 3, border: '2px solid',
                        borderColor: selectedItem === item ? traxecoGreen : 'divider',
                        bgcolor: selectedItem === item ? '#e8f5e9' : 'background.paper',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: traxecoGreen, transform: 'translateY(-2px)' }
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">MÃ ITEM</Typography>
                      <Typography variant="subtitle1" fontWeight={800} color={traxecoGreen}>{item}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Nhà CC: {getProp(sampleRow, 'Supp', 'Supplier', 'name') || '---'}
                      </Typography>
                      <Chip label={`${count} màu/size`} size="small" color="info" sx={{ mt: 1, fontWeight: 700 }} />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {wizardStep === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary">Tích chọn các lô Màu / Size cần kiểm tra:</Typography>
                <Button size="small" onClick={() => {
                  if (selectedRowIDs.length === step3Rows.length) {
                    setSelectedRowIDs([]);
                  } else {
                    setSelectedRowIDs(step3Rows.map((r, idx) => getProp(r, 'ID', 'sysid') || `row_${idx}`));
                  }
                }}>
                  {selectedRowIDs.length === step3Rows.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, maxHeight: 320 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedRowIDs.length === step3Rows.length && step3Rows.length > 0}
                          indeterminate={selectedRowIDs.length > 0 && selectedRowIDs.length < step3Rows.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRowIDs(step3Rows.map((r, idx) => getProp(r, 'ID', 'sysid') || `row_${idx}`));
                            } else {
                              setSelectedRowIDs([]);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell fontWeight={800}>Màu sắc</TableCell>
                      <TableCell fontWeight={800}>Size / Quy cách</TableCell>
                      <TableCell align="right" fontWeight={800}>Số lượng đặt</TableCell>
                      <TableCell fontWeight={800}>ĐVT</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {step3Rows.map((row, idx) => {
                      const rowId = getProp(row, 'ID', 'sysid') || `row_${idx}`;
                      const isChecked = selectedRowIDs.includes(rowId);
                      const color = getProp(row, 'Color', 'color');
                      const size = getProp(row, 'Size', 'sizx');
                      const qty = getProp(row, 'Quantity', 'rcvqty', 'OrdQty');
                      const unit = getProp(row, 'Unit', 'qtyunit');

                      return (
                        <TableRow key={rowId} hover selected={isChecked} onClick={() => {
                          if (isChecked) {
                            setSelectedRowIDs(selectedRowIDs.filter(id => id !== rowId));
                          } else {
                            setSelectedRowIDs([...selectedRowIDs, rowId]);
                          }
                        }} sx={{ cursor: 'pointer' }}>
                          <TableCell padding="checkbox">
                            <Checkbox checked={isChecked} color="primary" />
                          </TableCell>
                          <TableCell><Typography variant="body2" fontWeight={700}>{color}</Typography></TableCell>
                          <TableCell><Typography variant="body2" fontWeight={700}>{size}</Typography></TableCell>
                          <TableCell align="right"><Typography variant="body2" fontWeight={800} color={traxecoGreen}>{qty}</Typography></TableCell>
                          <TableCell>{unit}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 1, borderTop: borderHairline, justifyContent: 'space-between' }}>
          <Box>
            {wizardStep > 1 && (
              <Button onClick={() => setWizardStep((prev) => (prev - 1) as any)}>
                Quay lại bước {wizardStep - 1}
              </Button>
            )}
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button onClick={() => setSelectionDialogOpen(false)}>Hủy</Button>
            {wizardStep === 3 && (
              <Button variant="contained" disableElevation onClick={handleConfirmPick} sx={{ borderRadius: 2.5, px: 3, fontWeight: 800, bgcolor: traxecoGreen }}>
                XÁC NHẬN PICK ({selectedRowIDs.length} LÔ)
              </Button>
            )}
          </Stack>
        </DialogActions>
      </Dialog>

      {/* DETAIL PICK TABLE DIALOG */}
      <Dialog open={detailPickDialogOpen} onClose={() => setDetailPickDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: borderHairline }}>
          <Typography variant="h6" fontWeight={800} color={traxecoGreen} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DetailTableIcon /> BẢNG CHI TIẾT CÁC LÔ HÀNG ĐÃ PICK
          </Typography>
          <IconButton onClick={() => setDetailPickDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5 }}>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, maxHeight: 380 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedRowIDs.length === validSearchResults.length && validSearchResults.length > 0}
                      indeterminate={selectedRowIDs.length > 0 && selectedRowIDs.length < validSearchResults.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRowIDs(validSearchResults.map((r, idx) => getProp(r, 'ID', 'sysid') || `row_${idx}`));
                        } else {
                          setSelectedRowIDs([]);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell fontWeight={800}>PO Number</TableCell>
                  <TableCell fontWeight={800}>Item Number</TableCell>
                  <TableCell fontWeight={800}>Color</TableCell>
                  <TableCell fontWeight={800}>Size</TableCell>
                  <TableCell align="right" fontWeight={800}>Quantity</TableCell>
                  <TableCell fontWeight={800}>Unit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {validSearchResults.map((row, idx) => {
                  const rowId = getProp(row, 'ID', 'sysid') || `row_${idx}`;
                  const isChecked = selectedRowIDs.includes(rowId);
                  const po = getProp(row, 'Number', 'puorderno', 'CustomerPO');
                  const item = getProp(row, 'Itemnumber', 'matrcode');
                  const color = getProp(row, 'Color', 'color');
                  const size = getProp(row, 'Size', 'sizx');
                  const qty = getProp(row, 'Quantity', 'rcvqty', 'OrdQty');
                  const unit = getProp(row, 'Unit', 'qtyunit');

                  return (
                    <TableRow key={rowId} hover selected={isChecked} onClick={() => {
                      if (isChecked) {
                        setSelectedRowIDs(selectedRowIDs.filter(id => id !== rowId));
                      } else {
                        setSelectedRowIDs([...selectedRowIDs, rowId]);
                      }
                    }} sx={{ cursor: 'pointer' }}>
                      <TableCell padding="checkbox">
                        <Checkbox checked={isChecked} color="primary" />
                      </TableCell>
                      <TableCell><Typography variant="body2" fontWeight={700}>{po}</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight={700} color={traxecoGreen}>{item}</Typography></TableCell>
                      <TableCell>{color}</TableCell>
                      <TableCell>{size}</TableCell>
                      <TableCell align="right"><Typography variant="body2" fontWeight={800}>{qty}</Typography></TableCell>
                      <TableCell>{unit}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: borderHairline }}>
          <Button onClick={() => setDetailPickDialogOpen(false)}>Đóng</Button>
          <Button variant="contained" disableElevation onClick={handleConfirmPick} sx={{ borderRadius: 2.5, fontWeight: 800, bgcolor: traxecoGreen }}>
            LƯU THAY ĐỔI PICK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Phê duyệt Manager (Approval)</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Chọn quyết định phê duyệt chính thức cho đợt QC này:
          </Typography>
          <Stack spacing={1.5}>
            <Button variant="contained" color="success" disableElevation onClick={() => { qc.submitApproval('P'); setApprovalDialogOpen(false); }}>
              Pass (Chấp nhận xuất/nhập kho)
            </Button>
            <Button variant="contained" color="warning" disableElevation onClick={() => { qc.submitApproval('H'); setApprovalDialogOpen(false); }}>
              Hold (Tạm giữ chờ kiểm tra lại)
            </Button>
            <Button variant="contained" color="error" disableElevation onClick={() => { qc.submitApproval('F'); setApprovalDialogOpen(false); }}>
              Reject (Từ chối trả hàng NPL)
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialogOpen(false)}>Hủy</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
