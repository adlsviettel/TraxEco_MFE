import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { authFetch } from '@traxeco/shared';
import {
  Box, Typography, Paper, TextField, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton,
  InputAdornment, Chip, CircularProgress, Zoom, Autocomplete,
  FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel,
  Card, CardHeader, CardContent, Divider, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Snackbar, Alert, Grid
} from '@mui/material';
import {
  QrCodeScanner as ScannerIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Keyboard as KeyboardIcon,
  KeyboardHide as KeyboardHideIcon,
  LocationOn as LocationIcon,
  PlaylistAddCheck as ListIcon,
  CheckCircle as ConfirmIcon,
  SwapHoriz as ChangeLocIcon,
  Close as CloseIcon,
  Inventory2 as PackingIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Html5QrcodePlugin, ConfirmDialog, defaultConfirmDialog, playScanSound, playErrorSound, playQASound, playWarningSound, playFactoryMismatchSound, offlineSyncService } from '@traxeco/shared';
import type { ConfirmDialogState } from '@traxeco/shared';
import { customerService, type Customer } from '../services/customerService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

// Constants removed. Location fetched dynamically from DB.

// ── Interfaces ──────────────────────────────────────────────
interface ScannedCarton {
  id: string;
  CTNBarCode: string;
  PONo: string;
  CTNNo: string;
  CTNSeriNo: string;
  PackedQty: string;
  Shelf: string;   // e.g. "A.1.03"
  Pallet: string;  // e.g. "0000"
}

interface CurrentCarton {
  barcode: string;
  poNo: string;
  ctnNo: string;
  ctnSeriNo: string;
  packedQty: string;
  planRefNo: string;
  isFinalInspection: boolean;
}

// ── Component ───────────────────────────────────────────────
export default function UpdateLocationPage() {
  const { t } = useTranslation();

  // Customer
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Location selectors (spText1/2/3 = shelf, spText5+spText4 = pallet)
  const [shelfZone, setShelfZone] = useState('');
  const [shelfLevel, setShelfLevel] = useState('');
  const [shelfSeq, setShelfSeq] = useState('');
  const [shelfHierarchy, setShelfHierarchy] = useState<{ zones: string[]; levels: string[]; seqs: string[] }>({ zones: [], levels: [], seqs: [] });
  const [palletNo, setPalletNo] = useState('0000');

  // Checkboxes (matching Xamarin: cbAutoMe, cbSep4QAIns, cbTradeLine)
  const [autoMemo, setAutoMemo] = useState(() => {
    const s = sessionStorage.getItem('updLoc_autoMemo'); return s ? JSON.parse(s) : true;
  });
  const [separateQA, setSeparateQA] = useState(() => {
    const s = sessionStorage.getItem('updLoc_sepQA'); return s ? JSON.parse(s) : false;
  });
  const [tradeLine, setTradeLine] = useState(() => {
    const s = sessionStorage.getItem('updLoc_tradeLine'); return s ? JSON.parse(s) : false;
  });
  const [allowReloc, setAllowReloc] = useState(() => {
    const s = sessionStorage.getItem('updLoc_allowReloc'); return s ? JSON.parse(s) : false;
  });

  // Scanner / input
  const [showScanner, setShowScanner] = useState(false);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);
  const setBarcodeInput = (val: string) => {
    if (inputRef.current) {
      inputRef.current.value = val;
    }
  };
  const inputRef = useRef<HTMLInputElement>(null);

  // Current carton (scanned but not yet added to list - the "blSglScan" concept)
  const [currentCarton, setCurrentCarton] = useState<CurrentCarton | null>(() => {
    const s = sessionStorage.getItem('updLoc_currentCarton'); return s ? JSON.parse(s) : null;
  });

  // Data from scan API (populate PkList + CurLocation cards)
  const [pkListData, setPkListData] = useState<Record<string, unknown>[]>([]);
  const [curLocationData, setCurLocationData] = useState<Record<string, unknown>[]>([]);

  // Scanned cartons queue (lvNewLocPO / dtCrTempLoc equivalent)
  const [scannedCartons, setScannedCartons] = useState<ScannedCarton[]>(() => {
    const s = sessionStorage.getItem('updLoc_scannedCartons'); return s ? JSON.parse(s) : [];
  });

  // Memorized locations per PO (ltMePOLoc / ltMeQALoc equivalent)
  const [memoLocations, setMemoLocations] = useState<Map<string, string>>(() => {
    const s = sessionStorage.getItem('updLoc_memoLocs'); return s ? new Map(JSON.parse(s)) : new Map();
  });
  const [memoQALocations, setMemoQALocations] = useState<Map<string, string>>(() => {
    const s = sessionStorage.getItem('updLoc_memoQALocs'); return s ? new Map(JSON.parse(s)) : new Map();
  });

  // ── Auto-save State to SessionStorage ──
  useEffect(() => sessionStorage.setItem('updLoc_autoMemo', JSON.stringify(autoMemo)), [autoMemo]);
  useEffect(() => sessionStorage.setItem('updLoc_sepQA', JSON.stringify(separateQA)), [separateQA]);
  useEffect(() => sessionStorage.setItem('updLoc_tradeLine', JSON.stringify(tradeLine)), [tradeLine]);
  useEffect(() => sessionStorage.setItem('updLoc_allowReloc', JSON.stringify(allowReloc)), [allowReloc]);
  useEffect(() => sessionStorage.setItem('updLoc_currentCarton', JSON.stringify(currentCarton)), [currentCarton]);
  useEffect(() => sessionStorage.setItem('updLoc_scannedCartons', JSON.stringify(scannedCartons)), [scannedCartons]);
  useEffect(() => sessionStorage.setItem('updLoc_memoLocs', JSON.stringify(Array.from(memoLocations.entries()))), [memoLocations]);
  useEffect(() => sessionStorage.setItem('updLoc_memoQALocs', JSON.stringify(Array.from(memoQALocations.entries()))), [memoQALocations]);

  // UI state
  const pendingBarcodesRef = useRef<Set<string>>(new Set());
  const [pendingScans, setPendingScans] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(defaultConfirmDialog);
  const [changeLocDialog, setChangeLocDialog] = useState<{ open: boolean; cartonId: string | null }>({ open: false, cartonId: null });
  const [alreadyLocatedDialog, setAlreadyLocatedDialog] = useState<{ open: boolean; locName: string }>({ open: false, locName: '' });
  const [factoryMismatchDialog, setFactoryMismatchDialog] = useState<{ open: boolean; cartonFactory: string; userFactory: string }>({ open: false, cartonFactory: '', userFactory: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({ open: false, message: '', severity: 'info' });

  const showToast = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ open: true, message, severity });
  };
  const handleCloseToast = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  // ── Load Shelves ──
  useEffect(() => {
    console.log('UpdateLocationPage mounted');
    const fetchShelves = async () => {
      try {
        const activeFac = localStorage.getItem('factory') || '';
        const res = await authFetch(`${API_BASE_URL}/location/shelves?factory=${encodeURIComponent(activeFac)}`);
        if (res.ok) {
          const data = await res.json();
          setShelfHierarchy(data);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách kệ:', err);
      }
    };
    fetchShelves();
    return () => console.log('UpdateLocationPage unmounted');
  }, []);

  // ── Load customers ──
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const data = await customerService.getAll();
        setCustomers(data);
        const savedId = localStorage.getItem('selectedCustomerId');
        if (savedId) {
          const found = data.find((c) => c.custmId === Number(savedId));
          if (found) setSelectedCustomer(found);
        }
      } catch (err) {
        console.error('Failed to load customers:', err);
      } finally {
        setLoadingCustomers(false);
      }
    };
    fetchCustomers();
  }, []);

  // ── Helper: Process a carton after passing initial checks ──
  const processScannedCarton = (carton: CurrentCarton) => {
    // Auto-memo logic (line 744-768)
    if (autoMemo) {
      const useQA = separateQA && carton.isFinalInspection;
      const memoShelf = useQA
        ? memoQALocations.get(carton.poNo)
        : memoLocations.get(carton.poNo);

      if (memoShelf) {
        // Auto-add with memorized location
        addCartonToList(carton.barcode, carton.poNo, carton.ctnNo,
          carton.ctnSeriNo, carton.packedQty, memoShelf, palletNo);
        // Don't set currentCarton - ready for next scan immediately
        setBarcodeInput('');
        setTimeout(() => inputRef.current?.focus(), 50);
        return;
      }
    }

    // No auto-memo match: set currentCarton, wait for "Chọn"
    setCurrentCarton(carton);
    setBarcodeInput('');
  };

  // ── Helper: add a carton to the scanned list ──
  const addCartonToList = (
    barcode: string, poNo: string, ctnNo: string, ctnSeriNo: string,
    packedQty: string, shelf: string, pallet: string
  ) => {
    // Duplicate check (line 865-867: mylist.Contains check)
    if (scannedCartons.some(c => c.CTNBarCode === barcode)) return;

    const newCarton: ScannedCarton = {
      id: Math.random().toString(36).substr(2, 9),
      CTNBarCode: barcode,
      PONo: poNo,
      CTNNo: ctnNo,
      CTNSeriNo: ctnSeriNo,
      PackedQty: packedQty,
      Shelf: shelf,
      Pallet: pallet
    };
    setScannedCartons(prev => [newCarton, ...prev]);
  };

  // ── SCAN FLOW (mirrors tm.Elapsed logic) ──
  const handleScanObject = async (barcode: string) => {
    const code = barcode.trim().toUpperCase();
    if (!code || code.length < 5) return;

    // ── TradeLine mode: fast scan, no API, no location needed (line 593-617) ──
    if (tradeLine) {
      if (scannedCartons.some(c => c.CTNBarCode === code)) {
        playWarningSound();
        setBarcodeInput('');
        return;
      }
      playScanSound();
      addCartonToList(code, '-', '-', '-', '-', '-', '-');
      setBarcodeInput('');
      return;
    }

    // ── Normal mode ──
    // If we already have a pending carton (blSglScan == false), warn (line 789-797)
    if (currentCarton) {
      if (code !== currentCarton.barcode) {
        playWarningSound();
        showToast(t('updateLocation.pendingCarton', { barcode: currentCarton.barcode }), 'warning');
        setBarcodeInput(currentCarton.barcode);
      }
      return;
    }

    // Duplicate check in list?
    if (scannedCartons.some(c => c.CTNBarCode === code)) {
      playWarningSound();
      showToast(t('updateLocation.duplicateInList'), 'warning');
      setBarcodeInput('');
      return;
    }

    // Duplicate check in pending fetches to prevent spamming
    if (pendingBarcodesRef.current.has(code)) {
      setBarcodeInput('');
      return;
    }

    // Immediately clear input so hardware scanner can blast the next barcode unblocked
    setBarcodeInput('');
    pendingBarcodesRef.current.add(code);
    setPendingScans(prev => prev + 1);
    try {
      const activeUser = localStorage.getItem('employeeCode') || '';
      const activeFac = localStorage.getItem('factory') || '';
      const res = await authFetch(
        `${API_BASE_URL}/location/scan?barcode=${encodeURIComponent(code)}&username=${encodeURIComponent(activeUser)}&factory=${encodeURIComponent(activeFac)}`
      );
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      if (!data.poNo) throw new Error('Không tìm thấy thông tin thùng!');

      // Factory Context Validation Rule
      const cartonFactory = data.factory || data.Factory || data.factoryId || data.FactoryID;
      const userFactory = localStorage.getItem('factory');
      
      if (cartonFactory && userFactory && String(cartonFactory).trim().toUpperCase() !== String(userFactory).trim().toUpperCase()) {
        playFactoryMismatchSound();
        setFactoryMismatchDialog({ open: true, cartonFactory: String(cartonFactory), userFactory: String(userFactory) });
        setBarcodeInput('');
        return;
      }

      const isFinalInspection = data.finalInspection || false;

      // Populate PkList + CurLocation cards (line 650-668)
      setPkListData(data.pkListItems || []);
      setCurLocationData(data.curLocationItems || []);

      const carton: CurrentCarton = {
        barcode: data.ctnBarCode || code,
        poNo: data.poNo || '-',
        ctnNo: data.ctnNo || '-',
        ctnSeriNo: data.ctnSeriNo || '-',
        packedQty: data.packedQty || '0',
        planRefNo: data.planRefNo || '',
        isFinalInspection: isFinalInspection
      };

      // 🚨 Case 2: Check if carton already has a location (potential duplicate label)
      // data.ctnLocation is from CTNMaster indicating this exact barcode is already located!
      // 🚨 Case 2: Check if carton already has a location (potential duplicate label)
      if (data.ctnLocation && data.ctnLocation.trim() !== '') {
        if (!allowReloc) {
          playWarningSound(); // Only play warning sound if we are BLOCKING it
          setAlreadyLocatedDialog({ open: true, locName: data.ctnLocation });
          setBarcodeInput('');
          return; // <=== BLOCK from processing further
        } else {
          // Relocation mode is ON, allow it but show a toast
          showToast(`Thùng đang được chuyển từ vị trí ${data.ctnLocation}`, 'warning');
          
          // Play the normal success sounds because we allowed it
          if (isFinalInspection) {
            playQASound();
          } else {
            playScanSound();
          }
        }
      } else {
        // Normal carton (no location yet) -> Play normal success sounds
        if (isFinalInspection) {
          playQASound();
        } else {
          playScanSound();
        }
      }

      // Proceed normally if it's a completely new carton or not yet located
      processScannedCarton(carton);
    } catch (err) {
      playErrorSound();
      showToast((err as Error).message || t('updateLocation.scanError'), 'error');
    } finally {
      pendingBarcodesRef.current.delete(code);
      setPendingScans(prev => Math.max(0, prev - 1));
    }
  };

  const handleConfirmAdd = () => {
    if (!currentCarton) return;
    if (!shelfZone || !shelfLevel || !shelfSeq) {
      showToast(t('updateLocation.selectLocationFirst'), 'warning');
      return;
    }

    const shelf = `${shelfZone}.${shelfLevel}.${shelfSeq}`;
    addCartonToList(
      currentCarton.barcode, currentCarton.poNo, currentCarton.ctnNo,
      currentCarton.ctnSeriNo, currentCarton.packedQty, shelf, palletNo
    );

    // Memorize location for this PO (line 884-906)
    if (separateQA && currentCarton.isFinalInspection) {
      setMemoQALocations(prev => new Map(prev).set(currentCarton.poNo, shelf));
    } else {
      setMemoLocations(prev => new Map(prev).set(currentCarton.poNo, shelf));
    }

    setCurrentCarton(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ── Click on row → change location (lvNewCTNLoc.ItemClick, line 498-527) ──
  const handleChangeLocation = () => {
    if (!changeLocDialog.cartonId || !shelfZone || !shelfLevel || !shelfSeq) {
      showToast(t('updateLocation.selectLocationFirst'), 'warning');
      return;
    }
    const newShelf = `${shelfZone}.${shelfLevel}.${shelfSeq}`;
    setScannedCartons(prev => prev.map(c =>
      c.id === changeLocDialog.cartonId
        ? { ...c, Shelf: newShelf, Pallet: palletNo }
        : c
    ));
    setChangeLocDialog({ open: false, cartonId: null });
  };

  // ── Long click → remove from list (lvNewCTNLoc.ItemLongClick, line 467-496) ──
  const handleRemoveCarton = (id: string) => {
    setConfirmDialog({
      open: true,
      title: t('updateLocation.deleteTitle'),
      message: t('updateLocation.deleteMsg'),
      variant: 'danger',
      onConfirm: () => setScannedCartons(prev => prev.filter(c => c.id !== id))
    });
  };

  // ── btOKSave.Click (line 528-581): save all with per-carton shelf+pallet ──
  const handleSaveLocation = () => {
    if (scannedCartons.length === 0) return;

    setConfirmDialog({
      open: true,
      title: t('updateLocation.confirmSave'),
      message: t('updateLocation.confirmSaveMsg', { count: scannedCartons.length }),
      variant: 'info',
      onConfirm: async () => {
        setSaving(true);
        try {
          const activeUser = localStorage.getItem('employeeCode') || '';
          const activeFac = localStorage.getItem('factory') || '';
          const payload = {
            items: scannedCartons.map(c => ({
              barCode: c.CTNBarCode,
              locationCode: c.Shelf,
              palletNm: `P${c.Pallet}`,
              factory: activeFac,
              updatedBy: activeUser
            }))
          };
          const res = await authFetch(`${API_BASE_URL}/location/update`, {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          if (!res.ok) throw new Error(await res.text());
          showToast(t('updateLocation.saveSuccess'), 'success');
          handleResetInternal();
        } catch (err: any) {
          if (!navigator.onLine || err.message === 'Failed to fetch' || err.name === 'TypeError') {
            const token = localStorage.getItem('token');
            const activeUser = localStorage.getItem('employeeCode') || '';
            const activeFac = localStorage.getItem('factory') || '';
            const payload = {
              items: scannedCartons.map(c => ({
                barCode: c.CTNBarCode,
                locationCode: c.Shelf,
                palletNm: `P${c.Pallet}`,
                factory: activeFac,
                updatedBy: activeUser
              }))
            };
            offlineSyncService.enqueue(
              `${API_BASE_URL}/location/update`,
              'POST',
              { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              payload,
              { description: `Cập nhật vị trí ${scannedCartons.length} thùng`, app: 'FGS_WH' }
            );
            showToast('Mất mạng! Lưu trữ tạm vào hàng chờ đồng bộ Offline.', 'warning');
            handleResetInternal();
          } else {
            showToast(err.message || t('updateLocation.saveError'), 'error');
          }
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // ── btRefDt.Click (line 382-385 / ResetData line 814-835) ──
  const handleResetInternal = () => {
    setScannedCartons([]);
    setCurrentCarton(null);
    setPkListData([]);
    setCurLocationData([]);
    setBarcodeInput('');
    setMemoLocations(new Map());
    setMemoQALocations(new Map());
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  };
  const handleReset = () => {
    setConfirmDialog({
      open: true, title: t('updateLocation.confirmReset'),
      message: t('updateLocation.confirmResetMsg'),
      variant: 'info',
      onConfirm: handleResetInternal
    });
  };

  // ── TradeLine actions: btToLine / btFromLine (line 370-380) ──
  const handleAction = (action: string) => {
    const isReturn = action === 'Trả ra';
    const tradeMode = isReturn ? '2Ln' : null;
    setConfirmDialog({
      open: true, title: t('updateLocation.confirmTrade'),
      message: t('updateLocation.confirmTradeMsg', { action, count: scannedCartons.length }),
      variant: 'info',
      onConfirm: async () => {
        setSaving(true);
        try {
          const res = await authFetch(`${API_BASE_URL}/location/tradeline`, {
            method: 'POST',
            body: JSON.stringify({ barcodes: scannedCartons.map(c => c.CTNBarCode), tradeMode })
          });
          if (!res.ok) throw new Error(await res.text());
          showToast(t('updateLocation.tradeSuccess', { action }), 'success');
          handleResetInternal();
          setTradeLine(false);
        } catch (err: any) {
          if (!navigator.onLine || err.message === 'Failed to fetch' || err.name === 'TypeError') {
            const token = localStorage.getItem('token');
            const isReturn = action === 'Trả ra';
            const tradeMode = isReturn ? '2Ln' : null;
            offlineSyncService.enqueue(
              `${API_BASE_URL}/location/tradeline`,
              'POST',
              { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              { barcodes: scannedCartons.map(c => c.CTNBarCode), tradeMode },
              { description: `Xuất TradeLine ${action} cho ${scannedCartons.length} thùng`, app: 'FGS_WH' }
            );
            showToast('Mất mạng! Lưu trữ tạm vào hàng chờ đồng bộ Offline.', 'warning');
            handleResetInternal();
            setTradeLine(false);
          } else {
            showToast(err.message || t('updateLocation.tradeError', { action }), 'error');
          }
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScanObject(inputRef.current?.value || '');
    }
  };

  // ── RENDER ──
  return (
    <Paper elevation={0} sx={{ p: 1, bgcolor: 'transparent', flexGrow: 1, height: '100%' }}>
      <Grid container spacing={2} sx={{ height: '100%', pb: 1, overflowY: 'auto' }}>

        {/* ─── LEFT PANEL: Customer, Scanner, PkList, CurLocation ─── */}
        <Grid size={{ xs: 12, md: 5, lg: 4 }} sx={{ display: 'flex', flexDirection: 'column', minHeight: { md: 0 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, '& > *:not(:last-child)': { mb: 1.5 } }}>
          {/* Customer & Scanner Block */}
          <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <Autocomplete
            options={customers}
            getOptionLabel={(o) => o.custmName}
            value={selectedCustomer}
            onChange={(_e, v) => { setSelectedCustomer(v); if (v) localStorage.setItem('selectedCustomerId', String(v.custmId)); }}
            loading={loadingCustomers}
            renderInput={(params) => (
              <TextField {...params} label={t('updateLocation.customer')} placeholder={t('updateLocation.customerPlaceholder')} variant="outlined" size="small" sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc', transition: 'all 0.2s', '&:hover': { bgcolor: '#f1f5f9' }, '&.Mui-focused': { bgcolor: '#ffffff', boxShadow: '0 0 0 4px rgba(2, 136, 209, 0.1)' } }
              }} />
            )}
          />
          {/* Scanner Input */}
          <Typography variant="subtitle2" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#0f172a', mt: 1.5, mb: 0.5 }}>
            <ScannerIcon fontSize="small" sx={{ color: '#ec4899' }} /> {t('updateLocation.scanTitle')}
          </Typography>
          <TextField
            fullWidth variant="outlined" placeholder={t('updateLocation.scanPlaceholder')}
            defaultValue=""
            onKeyDown={handleKeyDown}
            disabled={!selectedCustomer || !!currentCarton}
            inputRef={inputRef}
            onBlur={() => {
              setTimeout(() => {
                const active = document.activeElement;
                        if (active && active !== document.body) return;
                inputRef.current?.focus();
              }, 100);
            }}
            inputProps={{ inputMode: showVirtualKeyboard ? 'text' : 'none', autoComplete: 'off' }}
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: '14px', backgroundColor: '#f8fafc', fontWeight: 800, fontSize: '1.05rem', transition: 'all 0.3s ease', border: '1px solid transparent' },
              '& .Mui-focused': { backgroundColor: '#ffffff', borderColor: '#0ea5e9', boxShadow: '0 4px 15px rgba(14, 165, 233, 0.15)' }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {pendingScans > 0 ? <CircularProgress size={24} /> : (
                    <>
                      <Tooltip title={t('updateLocation.virtualKeyboard')}>
                        <IconButton onClick={() => setShowVirtualKeyboard(!showVirtualKeyboard)} color={showVirtualKeyboard ? 'warning' : 'default'}>
                          {showVirtualKeyboard ? <KeyboardHideIcon /> : <KeyboardIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('updateLocation.scanCamera')}>
                        <IconButton color="primary" onClick={() => setShowScanner(true)}>
                          <ScannerIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </InputAdornment>
              ),
              sx: { backgroundColor: '#f8fafc', fontWeight: 600 }
            }}
          />

          {/* Current carton info banner */}
          {currentCarton && !tradeLine && (
            <Box sx={{ position: 'relative', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: 3, p: 1.5, boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', animation: 'fadeIn 0.2s', mt: 1.5 }}>
              <IconButton 
                size="small" 
                onClick={() => {
                  setCurrentCarton(null);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                sx={{ position: 'absolute', top: 8, right: 8, color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#ffffff', bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
              
              <Typography variant="caption" fontWeight={800} sx={{ color: '#d1fae5', letterSpacing: 1, textTransform: 'uppercase', display: 'block', mb: 1 }}>
                {t('updateLocation.scannedWaiting')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, color: '#ffffff', mb: 2 }}>
                <Typography variant="body2">PO: <Box component="span" fontWeight={800}>{currentCarton.poNo}</Box></Typography>
                <Typography variant="body2">CTN: <Box component="span" fontWeight={800} color="#fef08a">{currentCarton.ctnNo}</Box></Typography>
                <Typography variant="body2">Qty: <Box component="span" fontWeight={800}>{currentCarton.packedQty}</Box></Typography>
                <Typography variant="body2" sx={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 1 }}>BC: <Box component="span" fontWeight={800} color="#fef08a" sx={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>{currentCarton.barcode}</Box></Typography>
              </Box>
              <Button
                fullWidth
                startIcon={<ConfirmIcon />}
                onClick={handleConfirmAdd}
                sx={{ 
                  bgcolor: '#ffffff !important', 
                  color: '#059669 !important', 
                  fontWeight: 900, 
                  borderRadius: '12px', 
                  transition: 'all 0.2s', 
                  py: 1.2, 
                  boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                  '&:hover': { bgcolor: '#f0fdf4 !important' }
                }}
              >
                {t('updateLocation.selectLocation')}
              </Button>
            </Box>
          )}
          </Paper>

          {/* ─── PkList & CurLocation ─── */}
          <Box sx={{ display: 'flex', flexDirection: 'column', '& > *:not(:last-child)': { mb: 2 }, flexGrow: 1, minHeight: 0 }}>
            {/* PkList card (lvSmallPkL) */}
            <Box sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <Card elevation={0} sx={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', borderRadius: 4, border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                <CardHeader
                  avatar={<PackingIcon sx={{ color: '#0288d1', fontSize: { xs: 18, md: 24 } }} />}
                  title={t('updateLocation.pkListTitle')}
                  action={<Chip label={pkListData.length} size="small" sx={{ fontWeight: 800, bgcolor: '#e0f2fe', color: '#0284c7', minWidth: 28, height: 28, fontSize: '0.75rem', borderRadius: '14px' }} />}
                  titleTypographyProps={{ variant: 'subtitle2', fontWeight: 800, color: '#0f172a' }}
                  sx={{ bgcolor: '#f8fafc', p: 1.5, minHeight: 0, borderBottom: '1px solid #e2e8f0', '& .MuiCardHeader-avatar': { minWidth: 0, mr: 1.5 }, '& .MuiCardHeader-action': { m: 0, alignSelf: 'center' } }}
                />
                <CardContent sx={{ flex: 1, p: 0, overflow: 'auto', bgcolor: '#f1f5f9' }}>
                  {pkListData.length > 0 ? (
                    <Box sx={{ p: { xs: 0.5, md: 1 }, display: 'flex', flexDirection: 'column', '& > *:not(:last-child)': { mr: { xs: 0.5, md: 1 }, mb: { xs: 0.5, md: 1 } } }}>
                      {pkListData.map((row: any, i) => (
                        <Paper key={i} elevation={0} sx={{ p: 1.5, bgcolor: i % 2 === 0 ? '#f8fafc' : '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 1 }}>
                            <Box sx={{ gridColumn: { xs: 'span 6', sm: 'span 4' } }}>
                              <Typography variant="caption" color="textSecondary" display="block">{t('updateLocation.scheduleEx')}</Typography>
                              <Typography variant="body2" fontWeight={600}>{String(row['SchExFactory'] || '').split('T')[0]}</Typography>
                            </Box>
                            <Box sx={{ gridColumn: { xs: 'span 6', sm: 'span 4' } }}>
                              <Typography variant="caption" color="textSecondary" display="block">{t('updateLocation.invoiceNo')}</Typography>
                              <Typography variant="body2" fontWeight={600}>{String(row['InvNo'] || '')}</Typography>
                            </Box>
                            <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                              <Typography variant="caption" color="textSecondary" display="block">PONo</Typography>
                              <Typography variant="body2" fontWeight={700} color="primary">{String(row['PONo'] || '')}</Typography>
                            </Box>
                            
                            <Box sx={{ gridColumn: 'span 3' }}>
                              <Typography variant="caption" color="textSecondary" display="block">{t('updateLocation.reqPcs')}</Typography>
                              <Typography variant="body2" fontWeight={600}>{String(row['OrderQty'] || '0')}</Typography>
                            </Box>
                            <Box sx={{ gridColumn: 'span 3' }}>
                              <Typography variant="caption" color="textSecondary" display="block">{t('updateLocation.reqCtn')}</Typography>
                              <Typography variant="body2" fontWeight={600}>{String(row['CTNQty'] || '0')}</Typography>
                            </Box>
                            <Box sx={{ gridColumn: 'span 3' }}>
                              <Typography variant="caption" color="textSecondary" display="block">{t('updateLocation.inFgs')}</Typography>
                              <Typography variant="body2" fontWeight={700} color="#e65100">{String(row['InCTNQty'] || '0')}</Typography>
                            </Box>
                            <Box sx={{ gridColumn: 'span 3' }}>
                              <Typography variant="caption" color="textSecondary" display="block">{t('updateLocation.perClose')}</Typography>
                              <Typography variant="body2" fontWeight={700} color="#16a34a">{String(row['PerClose'] || '0')}%</Typography>
                            </Box>

                            <Box sx={{ gridColumn: 'span 12' }}>
                              <Typography variant="caption" color="textSecondary" display="block">{t('updateLocation.lotRef')}</Typography>
                              <Typography variant="body2">{String(row['LogNo'] || '-')}</Typography>
                            </Box>
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', p: 1.5 }}>
                      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#ffffff', border: '1.5px dashed #cbd5e1', borderRadius: 3, width: '100%' }}>
                        <PackingIcon sx={{ fontSize: 28, mb: 1, color: '#94a3b8' }} />
                        <Typography variant="body2" fontWeight={700} color="#64748b">{t('updateLocation.noData')}</Typography>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <Card elevation={0} sx={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
                <CardHeader
                  avatar={<HistoryIcon sx={{ color: '#8b5cf6', fontSize: { xs: 18, md: 24 } }} />}
                  title={t('updateLocation.curLocationTitle')}
                  action={<Chip label={curLocationData.length} size="small" sx={{ fontWeight: 800, bgcolor: '#ede9fe', color: '#7c3aed', minWidth: 28, height: 28, fontSize: '0.75rem', borderRadius: '14px' }} />}
                  titleTypographyProps={{ variant: 'subtitle2', fontWeight: 800, color: '#0f172a' }}
                  sx={{ bgcolor: '#f8fafc', p: 1.5, minHeight: 0, borderBottom: '1px solid #e2e8f0', '& .MuiCardHeader-avatar': { minWidth: 0, mr: 1.5 }, '& .MuiCardHeader-action': { m: 0, alignSelf: 'center' } }}
                />
                <CardContent sx={{ flex: 1, p: 0, overflow: 'auto', bgcolor: '#f1f5f9' }}>
                  {curLocationData.length > 0 ? (
                    <Box sx={{ p: { xs: 0.5, md: 1 }, display: 'flex', flexDirection: 'column', '& > *:not(:last-child)': { mr: { xs: 0.5, md: 1 }, mb: { xs: 0.5, md: 1 } } }}>
                      {curLocationData.map((row, i) => {
                        const shelfName = String(Object.values(row)[0] || '');
                        const qty = String(Object.values(row)[1] || '');
                        
                        return (
                          <Paper key={i} elevation={0} sx={{ p: { xs: 1, md: 1.5 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: i % 2 === 0 ? '#f8fafc' : '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#0288d1', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <LocationIcon fontSize="small" /> {t('updateLocation.locationLabel')} {shelfName}
                              </Typography>
                              {qty && (
                                <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5, ml: 3 }}>
                                  {t('updateLocation.qtyLabel')} <Box component="span" fontWeight={600} color="#334155">{qty}</Box>
                                </Typography>
                              )}
                            </Box>
                            <Button 
                              variant="contained" size="small"
                              sx={{ fontWeight: 800, borderRadius: 2, minWidth: 80, bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9', transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)' }, transition: 'all 0.2s' }}
                              onClick={() => {
                                  if (!currentCarton) {
                                      showToast('Chưa có thùng nào đang được quét chờ chọn vị trí!', 'warning');
                                      return;
                                  }
                                  addCartonToList(
                                      currentCarton.barcode, currentCarton.poNo, currentCarton.ctnNo,
                                      currentCarton.ctnSeriNo, currentCarton.packedQty, shelfName, palletNo
                                  );
                                  // Memorize location for this PO
                                  if (separateQA && currentCarton.isFinalInspection) {
                                      setMemoQALocations(prev => new Map(prev).set(currentCarton.poNo, shelfName));
                                  } else {
                                      setMemoLocations(prev => new Map(prev).set(currentCarton.poNo, shelfName));
                                  }
                                  setCurrentCarton(null);
                                  setTimeout(() => inputRef.current?.focus(), 50);
                              }}
                            >
                               {t('updateLocation.selectBtn')}
                            </Button>
                          </Paper>
                        );
                      })}
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#ffffff', border: '1.5px dashed #cbd5e1', borderRadius: 3, width: '100%' }}>
                        <HistoryIcon sx={{ fontSize: 28, mb: 1, color: '#94a3b8' }} />
                        <Typography variant="body2" fontWeight={700} color="#64748b">{t('updateLocation.noData')}</Typography>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
            </Box>
          </Box>
        </Grid>

        {/* ─── RIGHT PANEL: Location Config, Checkboxes, Action Buttons, Scan List ─── */}
        <Grid size={{ xs: 12, md: 7, lg: 8 }} sx={{ display: 'flex', flexDirection: 'column', minHeight: { md: 0 } }}>
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', '& > *:not(:last-child)': { mb: 1.5 }, minWidth: 0 }}>
          
          {/* Top Control Bar: Location & Settings & Actions */}
          <Paper elevation={0} sx={{ p: '8px 12px', borderRadius: 2.5, display: 'flex', flexDirection: 'column', gap: 1, border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #f8faf8 0%, #ffffff 100%)', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
              {/* Location Selectors */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: '1 1 auto', minWidth: 320 }}>
                <LocationIcon fontSize="small" sx={{ color: '#2563eb' }} />
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#0f172a', whiteSpace: 'nowrap', display: { xs: 'none', sm: 'block' } }}>
                  {t('updateLocation.locationTitle')}
                </Typography>
                <FormControl size="small" sx={{ minWidth: 70, flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.8rem', bgcolor: '#fff' } }}>
                  <InputLabel sx={{ fontSize: '0.8rem' }}>{t('updateLocation.zone')}</InputLabel>
                  <Select value={shelfHierarchy.zones.includes(shelfZone) ? shelfZone : ''} label={t('updateLocation.zone')} onChange={(e) => setShelfZone(e.target.value as string)}>
                    <MenuItem value="">-</MenuItem>
                    {shelfHierarchy.zones.map(z => <MenuItem key={z} value={z}>{z}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 70, flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.8rem', bgcolor: '#fff' } }}>
                  <InputLabel sx={{ fontSize: '0.8rem' }}>{t('updateLocation.level')}</InputLabel>
                  <Select value={shelfHierarchy.levels.includes(shelfLevel) ? shelfLevel : ''} label={t('updateLocation.level')} onChange={(e) => setShelfLevel(e.target.value as string)}>
                    <MenuItem value="">-</MenuItem>
                    {shelfHierarchy.levels.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 70, flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.8rem', bgcolor: '#fff' } }}>
                  <InputLabel sx={{ fontSize: '0.8rem' }}>{t('updateLocation.seq')}</InputLabel>
                  <Select value={shelfHierarchy.seqs.includes(shelfSeq) ? shelfSeq : ''} label={t('updateLocation.seq')} onChange={(e) => setShelfSeq(e.target.value as string)}>
                    <MenuItem value="">-</MenuItem>
                    {shelfHierarchy.seqs.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField placeholder={t('updateLocation.pallet')} size="small"
                  sx={{ width: 80, '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem', bgcolor: '#fff' } }}
                  value={palletNo} onChange={(e) => setPalletNo(e.target.value)}
                />
              </Box>

              {/* Checkboxes */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '2px 8px', bgcolor: '#f1f5f9', borderRadius: 2, border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                <FormControlLabel control={<Checkbox size="small" checked={autoMemo} onChange={(e) => setAutoMemo(e.target.checked)} color="primary" sx={{ py: 0.5 }} />}
                  label={<Typography variant="caption" fontWeight={700} color="#334155">{t('updateLocation.autoMemo')}</Typography>} sx={{ m: 0 }} />
                <FormControlLabel control={<Checkbox size="small" checked={separateQA} onChange={(e) => setSeparateQA(e.target.checked)} color="secondary" sx={{ py: 0.5 }} />}
                  label={<Typography variant="caption" fontWeight={700} color="#334155">{t('updateLocation.separateQA')}</Typography>} sx={{ m: 0 }} />
                <FormControlLabel control={<Checkbox size="small" checked={allowReloc} onChange={(e) => setAllowReloc(e.target.checked)} color="warning" sx={{ py: 0.5 }} />}
                  label={<Typography variant="caption" fontWeight={700} color="warning.main">Chuyển Vị Trí</Typography>} sx={{ m: 0 }} />
                <FormControlLabel control={<Checkbox size="small" checked={tradeLine} onChange={() => setTradeLine(!tradeLine)} color="error" sx={{ py: 0.5 }} />}
                  label={<Typography variant="caption" fontWeight={800} color="error.main">{t('updateLocation.tradeLine')}</Typography>} sx={{ m: 0 }} />
              </Box>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Button variant="outlined" size="small" color="inherit" startIcon={<RefreshIcon sx={{ fontSize: '18px !important' }}/>} onClick={handleResetInternal}
                sx={{ borderRadius: 1.5, fontWeight: 700, height: 32, borderColor: '#cbd5e1', color: '#475569', '&:hover': { bgcolor: '#f1f5f9' }, textTransform: 'none' }}>
                {t('updateLocation.resetBtn')}
              </Button>
              {!tradeLine && (
                <Button variant="contained" color="success" size="small"
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon sx={{ fontSize: '18px !important' }} />} disabled={scannedCartons.length === 0 || saving} onClick={handleSaveLocation}
                  sx={{ borderRadius: 1.5, fontWeight: 800, height: 32, px: 3, textTransform: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: 'none' }}>
                  {t('updateLocation.saveBtn')} {scannedCartons.length > 0 && `(${scannedCartons.length})`}
                </Button>
              )}
              {tradeLine && (
                <>
                  <Button variant="contained" size="small" color="info" sx={{ borderRadius: 1.5, fontWeight: 800, height: 32, px: 2, textTransform: 'none' }}
                    onClick={() => handleAction('Trả ra')} disabled={scannedCartons.length === 0 || saving}>
                    {t('updateLocation.returnBtn')}
                  </Button>
                  <Button variant="contained" size="small" color="warning" sx={{ borderRadius: 1.5, fontWeight: 800, height: 32, px: 2, textTransform: 'none' }}
                    onClick={() => handleAction('Nhận lại')} disabled={scannedCartons.length === 0 || saving}>
                    {t('updateLocation.receiveBtn')}
                  </Button>
                </>
              )}
            </Box>
          </Paper>
          
          {/* Bottom: Scanned Cartons list (lvNewLocPO) + tvCTNCount */}
          <Card elevation={0} sx={{ border: '1px solid #e2e8f0', minHeight: 400, display: 'flex', flexDirection: 'column', borderRadius: 2.5, background: '#ffffff', overflow: 'hidden', flexGrow: 1 }}>
            <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ListIcon sx={{ color: '#0ea5e9', fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#0f172a', flex: 1 }}>
                {t('updateLocation.listTitle')}
              </Typography>
              <Chip label={`${scannedCartons.length} ${t('updateLocation.cartons')}`} size="small" sx={{ fontWeight: 800, bgcolor: '#f59e0b', color: '#ffffff', borderRadius: '12px', height: 24, px: 0.5 }} />
            </Box>

            {scannedCartons.length === 0 ? (
              <Box sx={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', p: 2 }}>
                <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: 3, width: '100%', maxWidth: '350px' }}>
                  <ScannerIcon sx={{ fontSize: 36, mb: 1.5, color: '#94a3b8' }} />
                  <Typography variant="body1" fontWeight={700} color="#64748b">{t('updateLocation.emptyList')}</Typography>
                </Box>
              </Box>
            ) : (
              <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                <Table stickyHeader size="small" sx={{ minWidth: 500, '& .MuiTableCell-root': { py: { xs: 0.5, lg: 1 }, px: { xs: 1, lg: 2 }, fontSize: { xs: '0.75rem', lg: '0.85rem' } } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, fontSize: { xs: '0.7rem', md: '0.75rem' }, color: '#475569', bgcolor: '#f1f5f9', p: 1, width: 30 }}>#</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 800, fontSize: { xs: '0.7rem', md: '0.75rem' }, color: '#475569', bgcolor: '#f1f5f9', p: 1 }}>{t('updateLocation.col.poNo')}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 800, fontSize: { xs: '0.7rem', md: '0.75rem' }, color: '#475569', bgcolor: '#f1f5f9', p: 1 }}>CTNBarCode</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 800, fontSize: { xs: '0.7rem', md: '0.75rem' }, color: '#475569', bgcolor: '#f1f5f9', p: 1 }}>KỆ / ZONE</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 800, fontSize: { xs: '0.7rem', md: '0.75rem' }, color: '#475569', bgcolor: '#f1f5f9', p: 1 }}>PALLET</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 800, fontSize: { xs: '0.7rem', md: '0.75rem' }, color: '#475569', bgcolor: '#f1f5f9', p: 1 }}>CTN</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 800, fontSize: { xs: '0.7rem', md: '0.75rem' }, color: '#475569', bgcolor: '#f1f5f9', p: 1, textAlign: 'right' }}>QTY</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#475569', bgcolor: '#f1f5f9', p: 1, width: 60 }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scannedCartons.map((row, idx) => (
                      <Zoom in key={row.id}>
                        <TableRow hover sx={{ cursor: 'pointer', transition: 'all 0.1s', '&:hover': { bgcolor: '#f8fafc' }, '& td': { p: { xs: 0.75, md: 1 }, fontSize: { xs: '0.7rem', md: '0.8rem' }, whiteSpace: 'nowrap' } }}
                          onClick={() => setChangeLocDialog({ open: true, cartonId: row.id })}
                        >
                          <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>{scannedCartons.length - idx}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{row.PONo}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{row.CTNBarCode}</TableCell>
                          <TableCell>
                            <Chip size="small" label={row.Shelf} sx={{ fontWeight: 800, bgcolor: '#e0f2fe', color: '#0288d1', height: 26, fontSize: { xs: '0.85rem', md: '0.9rem' }, px: 0.5 }} />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#475569' }}>{row.Pallet ? `P${row.Pallet}` : '-'}</TableCell>
                          <TableCell>{row.CTNNo}</TableCell>
                          <TableCell sx={{ textAlign: 'right', fontWeight: 800, color: '#e65100' }}>{row.PackedQty}</TableCell>
                          <TableCell>
                            <Tooltip title={t('updateLocation.changeLocTooltip')}>
                              <IconButton size="small" color="info" sx={{ bgcolor: '#e0f2fe', mr: 0.5, p: 0.5, '&:hover': { bgcolor: '#bae6fd' } }}
                                onClick={(e) => { e.stopPropagation(); setChangeLocDialog({ open: true, cartonId: row.id }); }}>
                                <ChangeLocIcon sx={{ fontSize: { xs: 16, md: 20 } }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('updateLocation.deleteTooltip')}>
                              <IconButton size="small" color="error" sx={{ bgcolor: '#fee2e2', p: 0.5, '&:hover': { bgcolor: '#fecaca' } }}
                                onClick={(e) => { e.stopPropagation(); handleRemoveCarton(row.id); }}>
                                <DeleteIcon sx={{ fontSize: { xs: 16, md: 20 } }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      </Zoom>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Box>
      </Grid>

      {/* ═══ DIALOGS ═══ */}
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(p => ({ ...p, open: false }))} />

      {/* Change Location Dialog (lvNewCTNLoc.ItemClick equivalent, line 498-527) */}
      <Dialog open={changeLocDialog.open} onClose={() => setChangeLocDialog({ open: false, cartonId: null })} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#1565c0', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ChangeLocIcon /> {t('updateLocation.changeLocTitle')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>
            {t('updateLocation.changeLocDesc')} <b>{shelfZone}.{shelfLevel}.{shelfSeq}</b> - P<b>{palletNo}</b>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setChangeLocDialog({ open: false, cartonId: null })} color="inherit" sx={{ fontWeight: 700 }}>
            KHÔNG
          </Button>
          <Button onClick={handleChangeLocation} variant="contained" color="primary" sx={{ fontWeight: 800 }}>
            {t('updateLocation.changeLocYes')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Already Located / Duplicate Warning Dialog */}
      <Dialog open={alreadyLocatedDialog.open} onClose={() => { setAlreadyLocatedDialog({ open: false, locName: '' }); setTimeout(() => inputRef.current?.focus(), 50); }} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3, borderTop: '6px solid #ef4444' } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{t('updateLocation.alreadyLocatedTitle')}</Box>
          <IconButton onClick={() => { setAlreadyLocatedDialog({ open: false, locName: '' }); setTimeout(() => inputRef.current?.focus(), 50); }} size="small" sx={{ color: '#ef4444' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          <Typography variant="body1" sx={{ mb: 2, mt: 1, fontWeight: 700, color: '#1e293b' }}>
            {t('updateLocation.alreadyLocatedMsg')} <Box component="span" sx={{ color: '#ef4444', fontSize: '1.2rem' }}>[{alreadyLocatedDialog.locName}]</Box>!
          </Typography>
          <Typography variant="caption" sx={{ color: '#475569', display: 'block', bgcolor: '#fff1f2', p: 1.5, borderRadius: 2, border: '1px solid #fecdd3' }}>
            {t('updateLocation.alreadyLocatedHint')}
          </Typography>
        </DialogContent>
      </Dialog>

      {/* Factory Mismatch Warning Dialog */}
      <Dialog open={factoryMismatchDialog.open} onClose={() => { setFactoryMismatchDialog({ open: false, cartonFactory: '', userFactory: '' }); setTimeout(() => inputRef.current?.focus(), 50); }} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3, borderTop: '6px solid #ef4444' } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>Lỗi Sai Xưởng Thao Tác</Box>
          <IconButton onClick={() => { setFactoryMismatchDialog({ open: false, cartonFactory: '', userFactory: '' }); setTimeout(() => inputRef.current?.focus(), 50); }} size="small" sx={{ color: '#ef4444' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          <Typography variant="body1" sx={{ mb: 2, mt: 1, fontWeight: 700, color: '#1e293b' }}>
            Thùng này thuộc Factory <Box component="span" sx={{ color: '#ef4444', fontSize: '1.2rem' }}>[{factoryMismatchDialog.cartonFactory}]</Box>
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, fontWeight: 600, color: '#1e293b' }}>
            Nhưng bạn đang thao tác ở Factory <Box component="span" sx={{ color: '#0288d1', fontSize: '1rem' }}>[{factoryMismatchDialog.userFactory}]</Box>
          </Typography>
          <Typography variant="caption" sx={{ color: '#475569', display: 'block', bgcolor: '#fff1f2', p: 1.5, borderRadius: 2, border: '1px solid #fecdd3' }}>
            Hệ thống TỪ CHỐI thao tác chéo xưởng. Vui lòng kiểm tra lại thùng hàng!
          </Typography>
        </DialogContent>
      </Dialog>

      {/* Camera Scanner */}
      {showScanner && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1300, bgcolor: '#000', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ 
            flex: 1, position: 'relative', overflow: 'hidden',
            '& #html5qr-code-full-region': { width: '100%', height: '100%' },
            '& video': { objectFit: 'cover !important', width: '100% !important', height: '100% !important' }
          }}>
            <Html5QrcodePlugin
              fps={10} disableFlip={false}
              onClose={() => setShowScanner(false)}
              qrCodeSuccessCallback={(decodedText) => { setShowScanner(false); handleScanObject(decodedText); }}
            />
            <IconButton 
              size="large"
              onClick={() => setShowScanner(false)} 
              sx={{ position: 'absolute', top: 16, right: 16, color: '#fff', bgcolor: 'rgba(0,0,0,0.5)', zIndex: 1400, '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
            >
              <CloseIcon fontSize="large" />
            </IconButton>
            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '70%', height: '50%', border: '2px solid rgba(255,255,255,0.5)', borderRadius: 2, pointerEvents: 'none', zIndex: 1350, boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} />
          </Box>
        </Box>
      )}

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%', borderRadius: 2, boxShadow: 3, fontWeight: 'bold' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Grid>
  </Paper>
  );
}
