import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Checkbox, FormControlLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, Snackbar, Alert, Chip, Divider, CircularProgress,
  IconButton, Tooltip, Grid
} from '@mui/material';
import {
  LocalShipping as TruckIcon, QrCodeScanner as ScanIcon, Save as SaveIcon,
  Person as PersonIcon, Phone as PhoneIcon, ConfirmationNumber as SealIcon,
  DirectionsBus as TrailerIcon, RestartAlt as ResetIcon,
  Inventory2 as CartonIcon, Assignment as POIcon,
  CameraAlt as CameraIcon, Keyboard as KeyboardIcon, KeyboardHide as KeyboardHideIcon,
  Close as CloseIcon, Delete as DeleteIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { authFetch, offlineSyncService, ConfirmDialog, defaultConfirmDialog, Html5QrcodePlugin } from '@traxeco/shared';
import type { ConfirmDialogState } from '@traxeco/shared';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const ACCENT = '#2e7d32';
const ACCENT_LIGHT = '#e8f5e9';
const ACCENT_DARK = '#1b5e20';

/* ── Types ── */
interface UnshipInfo {
  PONo: string;
  CTNBarCode: string;
  CTNNo: string;
  PlanRefNo?: string;
  planRefNo?: string;
  [key: string]: unknown;
}

interface LoadedCTN { barcode: string; ctnNo: string; poNo: string; }
interface LoadedPO { poNo: string; ctnQty: number; }

/* ── Shared input sx ── */
const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    backgroundColor: '#fff',
    fontSize: '0.9rem',
    '&.Mui-focused': { boxShadow: `0 0 0 2px ${ACCENT}22` },
  },
};

const iconAdornment = (Icon: React.ElementType, color = '#94a3b8') => (
  { startAdornment: <Icon sx={{ color, mr: 0.5, fontSize: 18 }} /> }
);

/* ── Compact Section Header ── */
const SectionLabel = ({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) => (
  <Typography variant="subtitle2" sx={{
    fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 1,
    display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.8rem', mb: 2,
  }}>
    <Icon sx={{ fontSize: 15, color: ACCENT }} /> {children}
  </Typography>
);

export default function CartonShipPage() {
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);

  /* ── Form state ── */
  const [driverName, setDriverName] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [truckPlate1, setTruckPlate1] = useState('');
  const [truckPlate2, setTruckPlate2] = useState('');
  const [sealNo1, setSealNo1] = useState('');
  const [sealNo2, setSealNo2] = useState('');
  const [sealNo3, setSealNo3] = useState('');

  /* ── Scanner state ── */
  const [scanEntirePO, setScanEntirePO] = useState(true);
  const [scanPKL, setScanPKL] = useState(false);
  const codeReaderRef = useRef<HTMLInputElement>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);

  /* ── Sound refs ── */
  const scanSoundRef = useRef<HTMLAudioElement | null>(null);
  const warnSoundRef = useRef<HTMLAudioElement | null>(null);
  const errorSoundRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    scanSoundRef.current = new Audio(`${baseUrl}sounds/Beep.ogg`.replace('//', '/'));
    warnSoundRef.current = new Audio(`${baseUrl}sounds/WrCodeReScan.mp3`.replace('//', '/'));
    errorSoundRef.current = new Audio(`${baseUrl}sounds/alert.wav`.replace('//', '/'));
  }, []);
  const playSound = (ref: React.RefObject<HTMLAudioElement | null>) => {
    try { if (ref.current) { ref.current.currentTime = 0; ref.current.play(); } } catch {}
  };

  /* ── Auto-focus: always return focus to scanner after 2s idle on other fields ── */
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusScanner = (delayMs = 150) => {
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    focusTimerRef.current = setTimeout(() => codeReaderRef.current?.focus(), delayMs);
  };
  const handleFieldBlur = () => focusScanner(2000); // 2s after leaving any field → back to scanner

  /* ── Data state ── */
  const [unshipData, setUnshipData] = useState<UnshipInfo[]>([]);
  const [loadedCTNs, setLoadedCTNs] = useState<LoadedCTN[]>([]);
  const [loadedPOs, setLoadedPOs] = useState<LoadedPO[]>([]);

  /* ── UI state ── */
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(defaultConfirmDialog);

  const showToast = (msg: string, sev: typeof toastSeverity) => {
    setToastMsg(msg); setToastSeverity(sev); setToastOpen(true);
  };

  /* ── Load unship data ── */
  useEffect(() => {
    console.log('CartonShipPage mounted');
    loadUnshipInfo();
    return () => console.log('CartonShipPage unmounted');
  }, []);

  const loadUnshipInfo = async () => {
    try {
      const factory = localStorage.getItem('factory') || 'F2';
      const res = await authFetch(`${API_BASE}/shipping/unship?facCode=${factory}`);
      if (res.ok) setUnshipData(await res.json());
    } catch (e: any) {
      showToast(t('cartonShip.loadError', 'Không tải được danh sách thùng chưa xuất: ') + e.message, 'error');
    }
  };

  /* ── Core scan logic (shared by keyboard + camera) ── */
  const processScan = useCallback(async (barcode: string) => {
    if (!barcode) return;

    let toAdd: UnshipInfo[] = [];

    if (scanPKL) {
      try {
        // 1. Try direct PlanRefNo match
        let matchedCartons = unshipData.filter(d => {
          const planRef = d.PlanRefNo || d.planRefNo;
          return planRef && String(planRef).trim().toUpperCase() === barcode.toUpperCase();
        });

        // 2. Fallback: call packing-plan API
        if (matchedCartons.length === 0) {
          const res = await authFetch(`${API_BASE}/packing-plan/search?planRefNo=${encodeURIComponent(barcode)}`);
          if (res.ok) {
            const pklData = await res.json();
            if (pklData?.length > 0) {
              const poList = Array.from(new Set(pklData.map((x: any) => x.poNo || x.PONo).filter(Boolean)));
              if (poList.length > 0) {
                const trimmedPoList = poList.map(p => String(p).trim().toUpperCase());
                matchedCartons = unshipData.filter(d => {
                  const dPo = String(d.PONo || '').trim().toUpperCase();
                  return dPo && trimmedPoList.includes(dPo);
                });
              }
            }
          }
        }

        if (matchedCartons.length === 0) {
          playSound(errorSoundRef);
          showToast(t('cartonShip.invalidPkl', 'Mã PKL không hợp lệ hoặc đã được xuất hết!'), 'error');
          if (codeReaderRef.current) codeReaderRef.current.value = '';
          focusScanner(); return;
        }
        toAdd = matchedCartons;
      } catch {
        playSound(errorSoundRef);
        showToast('Lỗi tra cứu PKL!', 'error');
        if (codeReaderRef.current) codeReaderRef.current.value = '';
        focusScanner(); return;
      }
    } else {
      const found = unshipData.filter(d =>
        String(d.CTNBarCode || '').toUpperCase().includes(barcode.toUpperCase())
      );
      if (found.length === 0) {
        playSound(errorSoundRef);
        showToast(t('cartonShip.invalidBarcode', 'Mã vạch thùng không hợp lệ hoặc đã được xuất!'), 'error');
        if (codeReaderRef.current) codeReaderRef.current.value = '';
        focusScanner(); return;
      }
      if (scanEntirePO) {
        const poNo = found[0].PONo;
        toAdd = unshipData.filter(d => d.PONo === poNo);
      } else {
        toAdd = [found.find(d => String(d.CTNBarCode).toUpperCase() === barcode.toUpperCase()) || found[0]];
      }
    }

    // Map to display format and dedupe
    const newLoaded = [...loadedCTNs];
    let addedCount = 0;
    toAdd.forEach(item => {
      if (!newLoaded.some(l => l.barcode === item.CTNBarCode)) {
        newLoaded.push({ barcode: item.CTNBarCode, ctnNo: item.CTNNo, poNo: item.PONo });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      playSound(scanSoundRef);
      newLoaded.sort((a, b) => {
        const po = String(a.poNo || '').localeCompare(String(b.poNo || ''));
        if (po !== 0) return po;
        const cn = (parseInt(a.ctnNo as any) || 0) - (parseInt(b.ctnNo as any) || 0);
        if (cn !== 0) return cn;
        return String(a.barcode || '').localeCompare(String(b.barcode || ''));
      });
      setLoadedCTNs(newLoaded);
      recomputePOs(newLoaded);
      showToast(`Đã thêm ${addedCount} thùng vào xe!`, 'success');
    } else {
      playSound(warnSoundRef);
      showToast('Dữ liệu này đã có trên xe!', 'warning');
    }
    if (codeReaderRef.current) codeReaderRef.current.value = '';
    focusScanner();
  }, [unshipData, scanPKL, scanEntirePO, loadedCTNs, t]);

  /* ── Keyboard scan (Enter key) ── */
  const handleScan = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const barcode = (codeReaderRef.current?.value || '').trim();
    processScan(barcode);
  }, [processScan]);

  /* ── PO aggregation ── */
  const recomputePOs = (ctns: LoadedCTN[]) => {
    const map: Record<string, number> = {};
    ctns.forEach(c => { map[c.poNo] = (map[c.poNo] || 0) + 1; });
    setLoadedPOs(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ poNo: k, ctnQty: v })));
  };

  /* ── Camera scan result ── */
  const handleCameraScan = useCallback((decodedText: string) => {
    setShowScanner(false);
    processScan(decodedText.trim());
  }, [processScan]);

  /* ── Remove single carton from list ── */
  const removeCarton = (barcode: string) => {
    const newList = loadedCTNs.filter(c => c.barcode !== barcode);
    setLoadedCTNs(newList);
    recomputePOs(newList);
    focusScanner();
  };

  /* ── Confirm shipping (with dialog) ── */
  const handleConfirm = () => {
    if (!truckPlate1) { showToast(t('cartonShip.errPlate1', 'Vui lòng nhập Biển số xe!'), 'warning'); return; }
    if (loadedCTNs.length === 0) { showToast(t('cartonShip.errNoCtns', 'Chưa có thùng nào trên xe!'), 'warning'); return; }

    setConfirmDialog({
      open: true,
      title: 'Xác nhận xuất hàng',
      message: `Xuất ${loadedCTNs.length} thùng (${loadedPOs.length} PO) lên xe ${truckPlate1}?`,
      variant: 'info',
      onConfirm: doConfirmShipping,
    });
  };

  const doConfirmShipping = async () => {
    setLoading(true);
    try {
      const payload = {
        plateNo1: truckPlate1, plateNo2: truckPlate2,
        driverName, phoneNo, sealNo1, sealNo2, sealNo3,
        username: localStorage.getItem('employeeCode') || 'admin',
        barcodes: loadedCTNs.map(c => c.barcode)
      };
      const res = await authFetch(`${API_BASE}/shipping/confirm`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm shipping');

      playSound(scanSoundRef);
      showToast('Xác nhận xuất hàng thành công!', 'success');
      doReset();
    } catch (e: any) {
      if (!navigator.onLine || e.message === 'Failed to fetch' || e.name === 'TypeError') {
        const token = localStorage.getItem('token');
        const payload = {
          plateNo1: truckPlate1, plateNo2: truckPlate2,
          driverName, phoneNo, sealNo1, sealNo2, sealNo3,
          username: localStorage.getItem('employeeCode') || 'admin',
          barcodes: loadedCTNs.map(c => c.barcode)
        };
        offlineSyncService.enqueue(
          `${API_BASE}/shipping/confirm`, 'POST',
          { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          payload,
          { description: `Xuất ${loadedCTNs.length} thùng cho xe ${truckPlate1}`, app: 'FGS_WH' }
        );
        showToast('Mất mạng! Đã lưu vào Hàng đợi Offline.', 'warning');
        doReset();
      } else {
        playSound(errorSoundRef);
        showToast('Lỗi: ' + e.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Reset ── */
  const doReset = () => {
    setLoadedCTNs([]); setLoadedPOs([]);
    setTruckPlate1(''); setTruckPlate2('');
    setDriverName(''); setPhoneNo('');
    setSealNo1(''); setSealNo2(''); setSealNo3('');
    if (codeReaderRef.current) codeReaderRef.current.value = '';
    loadUnshipInfo();
    focusScanner(300);
  };

  const handleReset = () => {
    const hasData = loadedCTNs.length > 0 || truckPlate1 || truckPlate2 || driverName || phoneNo;
    if (hasData) {
      setConfirmDialog({
        open: true, title: 'Xác nhận làm mới',
        message: 'Xóa toàn bộ dữ liệu đang nhập và tải lại danh sách?',
        variant: 'warning', onConfirm: doReset
      });
    } else doReset();
  };

  /* ── Badge-style count ── */
  const CountBadge = ({ count, active }: { count: number; active: boolean }) => (
    <Box component="span" sx={{
      ml: 0.75, px: 1, py: 0.25, minWidth: 22, textAlign: 'center', borderRadius: '10px',
      fontSize: '0.75rem', fontWeight: 800, lineHeight: 1.4,
      backgroundColor: active ? ACCENT : '#e2e8f0', color: active ? '#fff' : '#64748b',
      transition: 'all 0.2s',
    }}>
      {count}
    </Box>
  );

  return (
    <Paper elevation={0} sx={{ p: 1, bgcolor: 'transparent', flexGrow: 1, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* ═══ Header ═══ */}
      <Box sx={{ flexShrink: 0, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>


        </Box>

        {/* Global Action Buttons moved to Header */}
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" onClick={handleReset} startIcon={<ResetIcon />}
            sx={{
              borderRadius: '8px', fontWeight: 700, px: 2, height: 36,
              borderColor: '#cbd5e1', color: '#475569', fontSize: '0.85rem',
              '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
            }}
          >
            Làm mới
          </Button>
          <Button variant="contained" onClick={handleConfirm} disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            sx={{
              borderRadius: '8px', fontWeight: 800, px: 3, height: 36,
              bgcolor: '#2e7d32', fontSize: '0.85rem',
              boxShadow: '0 2px 8px rgba(46, 125, 50, 0.3)',
              '&:hover': { bgcolor: '#1b5e20', boxShadow: '0 4px 12px rgba(46, 125, 50, 0.4)' },
              '&.Mui-disabled': { bgcolor: '#a5d6a7', color: '#fff' },
            }}
          >
            {loading ? 'Đang xuất...' : 'Xác nhận xuất'}
          </Button>
        </Box>
      </Box>

      {/* ═══ Main Responsive Layout ═══ */}
      <Grid container spacing={2} sx={{ flexGrow: 1, height: '0', pb: 1, overflowY: { xs: 'auto', md: 'visible' } }}>

          {/* ── LEFT: Form + Scanner ── */}
          <Grid size={{ xs: 12, md: 5, lg: 4 }} sx={{ height: { xs: 'auto', md: '100%' }, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', '& > *:not(:last-child)': { mb: 2.5 }, pb: 2 }}>

          {/* Truck Info Card */}
          <Paper elevation={0} sx={{
            p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          }}>
            <SectionLabel icon={TruckIcon}>Thông tin chuyến xe</SectionLabel>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField size="small" fullWidth label="Tài xế" value={driverName}
                  onChange={e => setDriverName(e.target.value)} onBlur={handleFieldBlur}
                  InputProps={iconAdornment(PersonIcon)} sx={inputSx} />
                <TextField size="small" fullWidth label="SĐT" value={phoneNo}
                  onChange={e => setPhoneNo(e.target.value)} onBlur={handleFieldBlur} sx={{ ...inputSx, maxWidth: 160 }}
                  InputProps={iconAdornment(PhoneIcon)} />
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField size="small" fullWidth label="Biển số đầu kéo *" value={truckPlate1}
                  onChange={e => setTruckPlate1(e.target.value)} onBlur={handleFieldBlur}
                  InputProps={iconAdornment(TruckIcon, ACCENT)} sx={inputSx} />
                <TextField size="small" fullWidth label="Biển rơ-moóc" value={truckPlate2}
                  onChange={e => setTruckPlate2(e.target.value)} onBlur={handleFieldBlur}
                  InputProps={iconAdornment(TrailerIcon)} sx={inputSx} />
              </Box>

              <Divider sx={{ borderStyle: 'dashed', borderColor: '#e2e8f0' }} />

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField size="small" fullWidth label="Seal 1" value={sealNo1}
                  onChange={e => setSealNo1(e.target.value)} onBlur={handleFieldBlur}
                  InputProps={iconAdornment(SealIcon)} sx={inputSx} />
                <TextField size="small" fullWidth label="Seal 2" value={sealNo2}
                  onChange={e => setSealNo2(e.target.value)} onBlur={handleFieldBlur}
                  InputProps={iconAdornment(SealIcon)} sx={inputSx} />
                <TextField size="small" fullWidth label="Seal 3" value={sealNo3}
                  onChange={e => setSealNo3(e.target.value)} onBlur={handleFieldBlur}
                  InputProps={iconAdornment(SealIcon)} sx={inputSx} />
              </Box>
            </Box>
          </Paper>

          {/* Scanner Card */}
          <Paper elevation={0} sx={{
            p: 2.5, borderRadius: 3,
            border: `1.5px solid ${ACCENT}33`,
            background: `linear-gradient(135deg, ${ACCENT_LIGHT}88 0%, #f0fdf4 100%)`,
          }}>
            <SectionLabel icon={ScanIcon}>Quét mã vạch</SectionLabel>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1.5, alignItems: 'center' }}>
              <FormControlLabel
                control={<Checkbox size="small" checked={scanEntirePO}
                  onChange={e => { setScanEntirePO(e.target.checked); if (e.target.checked) setScanPKL(false); }}
                  sx={{ p: 0.5, color: '#2e7d32', '&.Mui-checked': { color: '#2e7d32' } }} />}
                label={<Typography variant="caption" fontWeight={700} color="#334155">Quét cả PO</Typography>}
                sx={{ m: 0 }}
              />
              <FormControlLabel
                control={<Checkbox size="small" checked={scanPKL}
                  onChange={e => { setScanPKL(e.target.checked); if (e.target.checked) setScanEntirePO(false); }}
                  sx={{ p: 0.5, color: '#2e7d32', '&.Mui-checked': { color: '#2e7d32' } }} />}
                label={<Typography variant="caption" fontWeight={700} color="#334155">Quét theo PKL</Typography>}
                sx={{ m: 0 }}
              />
            </Box>

            <TextField
              autoFocus size="small" fullWidth
              placeholder="Quét mã vạch (Nhấn Enter)..."
              inputRef={codeReaderRef}
              onBlur={() => {
                setTimeout(() => {
                  const active = document.activeElement;
                        if (active && active !== document.body) return;
                  codeReaderRef.current?.focus();
                }, 100);
              }}
              onKeyDown={handleScan}
              inputProps={{ inputMode: showVirtualKeyboard ? 'text' : 'none', autoComplete: 'off' }}
              InputProps={{
                startAdornment: <ScanIcon sx={{ mr: 1, color: ACCENT, fontSize: 22 }} />,
                endAdornment: (
                  <Box sx={{ display: 'flex', gap: 0.25 }}>
                    <Tooltip title={showVirtualKeyboard ? 'Ẩn bàn phím' : 'Hiện bàn phím'}>
                      <IconButton size="small" onClick={() => setShowVirtualKeyboard(!showVirtualKeyboard)}
                        sx={{ color: showVirtualKeyboard ? '#f59e0b' : '#94a3b8' }}>
                        {showVirtualKeyboard ? <KeyboardHideIcon fontSize="small" /> : <KeyboardIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Quét bằng Camera">
                      <IconButton size="small" onClick={() => setShowScanner(true)} sx={{ color: ACCENT }}>
                        <CameraIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px', backgroundColor: '#fff',
                  fontWeight: 700, fontSize: '1.1rem',
                  '&.Mui-focused': { boxShadow: `0 0 0 3px ${ACCENT}20`, borderColor: ACCENT },
                },
              }}
            />
          </Paper>

          {/* Progress Summary Card */}
          <Paper elevation={0} sx={{
            p: 3, borderRadius: 3,
            border: '1px dashed #cbd5e1',
            background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center'
          }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: '50%', bgcolor: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
            }}>
              <TruckIcon sx={{ fontSize: 32, color: loadedCTNs.length > 0 ? ACCENT : '#94a3b8' }} />
            </Box>
            
            <Typography variant="h3" fontWeight={800} color={loadedCTNs.length > 0 ? ACCENT : '#475569'} sx={{ lineHeight: 1 }}>
              {loadedCTNs.length}
            </Typography>
            <Typography variant="caption" fontWeight={700} color="#94a3b8" sx={{ textTransform: 'uppercase', letterSpacing: 1, mt: 1 }}>
              Thùng đã lên xe
            </Typography>

            <Box sx={{ display: 'flex', gap: 3, mt: 3, width: '100%', justifyContent: 'center' }}>
              <Box>
                <Typography variant="h6" fontWeight={800} color="#334155" sx={{ lineHeight: 1 }}>{loadedPOs.length}</Typography>
                <Typography variant="caption" color="#94a3b8" fontWeight={600}>PO ĐÃ XUẤT</Typography>
              </Box>
            </Box>
          </Paper>

            </Box>
          </Grid>

          {/* ── RIGHT: Data Tables ── */}
          <Grid size={{ xs: 12, md: 7, lg: 8 }} sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: { xs: 500, md: 0 } }}>
          <Paper elevation={0} sx={{
            display: 'flex', flexDirection: 'column', flexGrow: 1,
            borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden',
            background: '#fff',
          }}>

            {/* Tabs */}
            <Box sx={{ px: 2, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)}
                TabIndicatorProps={{ sx: { height: 2.5, borderRadius: '2px 2px 0 0', backgroundColor: ACCENT } }}
              >
                <Tab label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CartonIcon sx={{ fontSize: 16, mr: 0.5, color: tabIndex === 0 ? ACCENT : '#94a3b8' }} />
                    <Typography variant="caption" fontWeight={700}>Thùng</Typography>
                    <CountBadge count={loadedCTNs.length} active={tabIndex === 0} />
                  </Box>
                } sx={{ minHeight: 44, textTransform: 'none' }} />
                <Tab label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <POIcon sx={{ fontSize: 16, mr: 0.5, color: tabIndex === 1 ? ACCENT : '#94a3b8' }} />
                    <Typography variant="caption" fontWeight={700}>PO</Typography>
                    <CountBadge count={loadedPOs.length} active={tabIndex === 1} />
                  </Box>
                } sx={{ minHeight: 44, textTransform: 'none' }} />
              </Tabs>
            </Box>

            {/* Table */}
            <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
              <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { py: { xs: 0.5, lg: 1 }, px: { xs: 1, lg: 2 }, fontSize: { xs: '0.75rem', lg: '0.85rem' } } }}>
                <TableHead>
                  <TableRow>
                    {tabIndex === 0 ? (
                      <>
                        <TableCell sx={thSx} width={44}>#</TableCell>
                        <TableCell sx={thSx}>BARCODE</TableCell>
                        <TableCell sx={thSx} width={100}>CTN NO</TableCell>
                        <TableCell sx={thSx}>PO NO</TableCell>
                        <TableCell sx={thSx} width={44}></TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell sx={thSx} width={44}>#</TableCell>
                        <TableCell sx={thSx}>PO NO</TableCell>
                        <TableCell sx={thSx} width={100} align="right">SỐ THÙNG</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tabIndex === 0 ? (
                    loadedCTNs.length > 0 ? (
                      loadedCTNs.map((ctn, i) => (
                        <TableRow key={i} hover sx={rowSx(i)}>
                          <TableCell sx={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 500 }}>{i + 1}</TableCell>
                          <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: ACCENT, fontSize: '0.8rem', letterSpacing: 0.3 }}>{ctn.barcode}</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{ctn.ctnNo}</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.8rem' }}>{ctn.poNo}</TableCell>
                          <TableCell sx={{ p: 0.25 }}>
                            <IconButton size="small" onClick={() => removeCarton(ctn.barcode)}
                              sx={{ color: '#ef4444', p: 0.5, '&:hover': { bgcolor: '#fee2e2' } }}>
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : <EmptyState colSpan={5} text="Chưa có thùng nào trên xe" sub="Quét mã vạch để bắt đầu" />
                  ) : (
                    loadedPOs.length > 0 ? (
                      loadedPOs.map((po, i) => (
                        <TableRow key={i} hover sx={rowSx(i)}>
                          <TableCell sx={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 500 }}>{i + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#334155', fontSize: '0.8rem' }}>{po.poNo}</TableCell>
                          <TableCell align="right">
                            <Chip label={po.ctnQty} size="small"
                              sx={{ fontWeight: 800, backgroundColor: ACCENT_LIGHT, color: ACCENT, minWidth: 40 }} />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : <EmptyState colSpan={3} text="Chưa có dữ liệu PO" />
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Summary Footer */}
            {loadedCTNs.length > 0 && (
              <Box sx={{
                px: 2, py: 1, borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
                display: 'flex', justifyContent: 'flex-end', gap: 2,
              }}>
                <Typography variant="caption" fontWeight={600} color="#64748b">
                  Tổng: <Box component="span" sx={{ color: ACCENT, fontWeight: 800 }}>{loadedCTNs.length}</Box> thùng
                  {' · '}
                  <Box component="span" sx={{ color: ACCENT, fontWeight: 800 }}>{loadedPOs.length}</Box> PO
                </Typography>
              </Box>
            )}
          </Paper>
          </Grid>
        </Grid>

      {/* ═══ Toasts & Dialogs ═══ */}
      <Snackbar open={toastOpen} autoHideDuration={2500} onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToastOpen(false)} elevation={6} variant="filled" severity={toastSeverity}
          sx={{ width: '100%', borderRadius: 2, fontWeight: 600, fontSize: '0.85rem' }}>
          {toastMsg}
        </Alert>
      </Snackbar>
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })} />

      {/* Camera Scanner Overlay */}
      {showScanner && (
        <Box sx={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1300,
          bgcolor: '#000', display: 'flex', flexDirection: 'column',
        }}>
          <Box sx={{
            flex: 1, position: 'relative', overflow: 'hidden',
            '& #html5qr-code-full-region': { width: '100%', height: '100%' },
            '& video': { objectFit: 'cover !important', width: '100% !important', height: '100% !important' },
          }}>
            <Html5QrcodePlugin
              fps={10} disableFlip={false}
              onClose={() => setShowScanner(false)}
              qrCodeSuccessCallback={handleCameraScan}
            />
            <IconButton
              onClick={() => setShowScanner(false)}
              sx={{
                position: 'absolute', top: 16, right: 16, zIndex: 10,
                bgcolor: 'rgba(0,0,0,0.6)', color: '#fff',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ p: 2, bgcolor: '#111', textAlign: 'center' }}>
            <Typography variant="body2" color="#aaa" fontWeight={600}>
              Hướng camera vào mã vạch để quét
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}

/* ═══ Shared Styles ═══ */
const thSx = {
  fontWeight: 800, color: '#475569', backgroundColor: '#f1f5f9',
  py: 1, fontSize: '0.7rem', letterSpacing: 0.5,
  borderBottom: '2px solid #e2e8f0', textTransform: 'uppercase' as const,
};

const rowSx = (i: number) => ({
  '& td': { py: 0.75, borderColor: '#f1f5f9' },
  backgroundColor: i % 2 === 0 ? '#fff' : '#fafcfa',
  '&:hover': { backgroundColor: '#e8f5e9 !important' },
  transition: 'background-color 0.15s',
});

/* ═══ Empty State Component ═══ */
const EmptyState = ({ colSpan, text, sub }: { colSpan: number; text: string; sub?: string }) => (
  <TableRow>
    <TableCell colSpan={colSpan} sx={{ height: 320, textAlign: 'center', color: '#94a3b8', borderBottom: 'none' }}>
      <TruckIcon sx={{ fontSize: 56, opacity: 0.12, mb: 1.5, display: 'block', mx: 'auto', color: ACCENT }} />
      <Typography variant="body2" fontWeight={600} color="#94a3b8">{text}</Typography>
      {sub && <Typography variant="caption" color="#cbd5e1">{sub}</Typography>}
    </TableCell>
  </TableRow>
);

