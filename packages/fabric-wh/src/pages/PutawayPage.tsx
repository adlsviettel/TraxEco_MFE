import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton,
  InputAdornment, Chip, Tooltip, Zoom, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogContent, DialogTitle, DialogActions, Collapse
} from '@mui/material';
import {
  QrCodeScanner as QrCodeIcon,
  Save as SaveIcon,
  DeleteOutline as DeleteIcon,
  Layers as ShelfIcon,
  ClearAll as ClearAllIcon,
  PhotoCamera as CameraIcon,
  Keyboard as KeyboardIcon,
  KeyboardHide as KeyboardHideIcon
} from '@mui/icons-material';
import { useToast, Html5QrcodePlugin, ConfirmDialog, defaultConfirmDialog, useExcelDragSelection } from '@traxeco/shared';
import type { ConfirmDialogState } from '@traxeco/shared';
import { fabricInventoryService } from '../services/fabricInventoryService';
import { useTranslation } from 'react-i18next';

/** Shape of a scanned roll in Putaway screen */
export interface PutawayRoll {
  QrCode: string;
  RollNo: string;
  Item: string;
  Color: string;
  Yard: number;
  Location: string;
  PoNo?: string;
  BatchNo?: string;
  InvoiceNo?: string;
  ShipLength?: number;
}

// Audio feedback (Industrial / Urgent)
const playBeep = (type: 'success' | 'error' | 'warning') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq: number, oscType: OscillatorType, startTime: number, duration: number, vol = 0.1) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = oscType;
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
      gain.gain.setValueAtTime(vol, startTime + duration - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;

    if (type === 'success') {
      playTone(950, 'sine', now, 0.15, 0.2);
    } else if (type === 'warning') {
      playTone(1000, 'square', now, 0.1, 0.15);
      playTone(1000, 'square', now + 0.15, 0.1, 0.15);
      playTone(1000, 'square', now + 0.3, 0.1, 0.15);
    } else if (type === 'error') {
      const playBuzzer = (time: number) => {
         const osc1 = ctx.createOscillator();
         const osc2 = ctx.createOscillator();
         const gain = ctx.createGain();
         
         osc1.type = 'sawtooth';
         osc2.type = 'square';
         osc1.frequency.setValueAtTime(140, time);
         osc2.frequency.setValueAtTime(150, time);
         
         gain.gain.setValueAtTime(0, time);
         gain.gain.linearRampToValueAtTime(0.3, time + 0.01);
         gain.gain.setValueAtTime(0.3, time + 0.25);
         gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
         
         osc1.connect(gain);
         osc2.connect(gain);
         gain.connect(ctx.destination);
         
         osc1.start(time);
         osc2.start(time);
         osc1.stop(time + 0.3);
         osc2.stop(time + 0.3);
      };
      
      playBuzzer(now);
      playBuzzer(now + 0.4); 
    }
  } catch (e) {
    console.warn('Audio API not supported', e);
  }
};

const PutawayRow = React.memo(({ row, idx, shelfQR, removeRow, getCellProps }: any) => {
  return (
    <TableRow hover>
      <TableCell>{idx + 1}</TableCell>
      <TableCell>
         <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>{row.InvoiceNo || 'N/A'}</Typography>
         <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>
            PO: {row.PoNo || 'N/A'}
         </Typography>
      </TableCell>
      <TableCell>
        <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{row.Item}</Typography>
        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>{row.Color}</Typography>
      </TableCell>
      <TableCell>
        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#0284c7' }}>{row.RollNo}</Typography>
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>Batch: {row.BatchNo || 'N/A'}</Typography>
      </TableCell>
      <TableCell {...getCellProps('ShipLength', idx, true)} align="right">
        <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }} title="Ship Length">{row.ShipLength || 0}</Typography>
        <Typography sx={{ fontWeight: 800, color: '#10b981', fontSize: '0.95rem' }} title="Actual Balance">{row.Yard}</Typography>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label={row.Location || 'N/A'} size="small" variant="outlined" sx={{ color: '#64748b', borderColor: '#cbd5e1' }} />
          <span style={{ color: '#94a3b8' }}>➔</span>
          <Chip 
            label={shelfQR || 'Chưa chọn giá'} 
            size="small" 
            color={shelfQR ? 'success' : 'default'}
            sx={{ fontWeight: 600 }}
          />
        </Box>
      </TableCell>
      <TableCell align="right">
        <Tooltip title="Xoá dòng" arrow TransitionComponent={Zoom}>
          <IconButton size="small" color="error" onClick={() => removeRow(row.QrCode)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
});

export default function PutawayPage() {
  const { showToast } = useToast();
  const { t } = useTranslation();

  const inputValRef = useRef('');
  const [shelfQR, setShelfQR] = useState('');
  const [scannedRolls, setScannedRolls] = useState<PutawayRoll[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [selName, setSelName] = useState('');
  const [selLevel, setSelLevel] = useState('');
  const [selSeq, setSelSeq] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showManualShelf, setShowManualShelf] = useState(false);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);

  // Confirm Dialog state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(defaultConfirmDialog);

  const showConfirmPopup = (title: string, message: string, onConfirm: () => void, variant: 'danger' | 'safe' | 'info' = 'danger') => {
    setConfirmDialog({ open: true, title, message, onConfirm, variant });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog(p => ({ ...p, open: false }));
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const isScanningRef = useRef<boolean>(false);
  const globalScanLockTime = useRef<number>(0);
  const lastScannedQrRef = useRef<{ code: string, time: number }>({ code: '', time: 0 });

  // Excel-like selection for numeric columns (DOM-based, zero re-render during drag)
  const { selectionSummary, removeCellSelection, getCellProps } = useExcelDragSelection({
    data: scannedRolls
  });

  // Fetch db locations
  useEffect(() => {
    fabricInventoryService.getShelfLocations()
      .then(setAllLocations)
      .catch(console.error);
    inputRef.current?.focus();
  }, []);

  const nameOpts = useMemo(() => Array.from(new Set(allLocations.map(l => l.ShNm))).sort(), [allLocations]);
  const levelOpts = useMemo(() => {
    if (!selName) return [];
    return Array.from(new Set(allLocations.filter(l => l.ShNm === selName).map(l => l.ShLevl))).sort((a:any, b:any) => a - b);
  }, [allLocations, selName]);
  const seqOpts = useMemo(() => {
    if (!selName || !selLevel) return [];
    return Array.from(new Set(allLocations.filter(l => l.ShNm === selName && String(l.ShLevl) === String(selLevel)).map(l => l.ShSeq))).sort();
  }, [allLocations, selName, selLevel]);

  // Handle building shelf code automatically
  const handleApplyCascading = () => {
    if (selName && selLevel && selSeq) {
       const loc = `${selName}${selLevel}-${selSeq}`;
       setShelfQR(loc);
       playBeep('success');
       showToast(t('putaway.shelfSelected', { loc }), 'success');
       setSelName('');
       setSelLevel('');
       setSelSeq('');
       inputRef.current?.focus();
    } else {
       playBeep('warning');
       showToast(t('putaway.shelfIncomplete'), 'warning');
    }
  };

  const handleScanObject = async (code: string) => {
    if (!code) return;
    // Strip control characters
    let cleanCode = code.replace(/[\x00-\x1F\x7F-\x9F\u200B\uFEFF]/g, "").trim();

    // If the printed QR is actually a full URL (often auto-stripped by Wedge scanners but not by HTML5 camera)
    // Extract the final segment (e.g., http://domain.com/qrcodes/fb-123a -> fb-123a)
    if (cleanCode.startsWith('http') || cleanCode.includes('/')) {
        try {
            const urlParts = cleanCode.split('/');
            cleanCode = urlParts[urlParts.length - 1].split('?')[0]; // simple extraction
        } catch (e) {}
    }

    const now = Date.now();
    
    // 1. Global throttle: prevent ANY scan within 600ms of each other (prevents wedge scanner continuous loops)
    if (now - globalScanLockTime.current < 600) return;
    globalScanLockTime.current = now;

    // 2. State throttle: prevent scanning while previous API is running
    if (isScanningRef.current) return;

    // 3. Duplicate throttle: prevent identical scans within 3 seconds
    if (lastScannedQrRef.current.code === cleanCode && (now - lastScannedQrRef.current.time) < 3000) {
       return;
    }
    
    lastScannedQrRef.current = { code: cleanCode, time: now };

    // Typically, a shelf QR starts with some prefix or exactly matches a location pattern.
    // Shelf codes are usually <= 10 characters (e.g. F2A-A01). Rolls represent longer strings.
    const isLikelyShelf = cleanCode.length <= 10 && !cleanCode.includes('|'); 

    if (isLikelyShelf) {
      if (shelfQR === cleanCode) {
         playBeep('warning');
         showToast(t('putaway.shelfAlready'), 'info');
      } else {
         setShelfQR(cleanCode);
         playBeep('success');
         showToast(t('putaway.shelfSet', { code: cleanCode }), 'success');
      }
      return;
    }

    // Check if already scanned
    if (scannedRolls.some(r => r.QrCode.trim() === cleanCode)) {
      playBeep('warning');
      showToast(t('putaway.rollDuplicate'), 'warning');
      return;
    }

    isScanningRef.current = true;
    setIsScanning(true);
    try {
      // Call backend to fetch Roll Details
      // We use the specialized scanRollForPutaway which handles missing RollData inserts
      const info = await fabricInventoryService.scanRollForPutaway(cleanCode);
      setScannedRolls(prev => [{
        QrCode: info.QrCode || cleanCode,
        RollNo: info.RollNo,
        Item: info.RollItem,
        Color: info.Color,
        Yard: info.Balance,
        Location: info.RollLocation || 'N/A',
        PoNo: info.OrderNumber,
        BatchNo: info.BatchNo,
        InvoiceNo: info.InvoiceNo,
        ShipLength: info.ShipLength
      }, ...prev]);
      playBeep('success');
      showToast(t('putaway.rollAdded', { roll: info.RollNo || cleanCode }), 'success');
    } catch (err: any) {
      console.error(err);
      playBeep('error');
      showToast(err.message || t('putaway.rollInvalid', { code: cleanCode }), 'error');
    } finally {
      isScanningRef.current = false;
      setIsScanning(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = inputValRef.current;
    inputValRef.current = '';
    if (inputRef.current) inputRef.current.value = '';
    handleScanObject(code);
    // Refocus input
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const removeRow = (qrCode: string) => {
    setScannedRolls(prev => prev.filter(r => r.QrCode !== qrCode));
  };

  const clearAll = () => {
    showConfirmPopup(
      t('putaway.confirmClearTitle'),
      t('putaway.confirmClearMsg', { count: scannedRolls.length }),
      () => {
        setScannedRolls([]);
        setShelfQR('');
        inputRef.current?.focus();
      }
    );
  };

  const handleSave = () => {
    if (scannedRolls.length === 0) {
      showToast(t('putaway.noRollsToSave'), 'warning');
      return;
    }
    if (!shelfQR) {
      showToast(t('putaway.scanShelfFirst'), 'error');
      inputRef.current?.focus();
      return;
    }

    showConfirmPopup(
      t('putaway.confirmSaveTitle'),
      t('putaway.confirmSaveMsg', { count: scannedRolls.length, shelf: shelfQR }),
      async () => {
        setIsSaving(true);
        try {
          const qrs = scannedRolls.map(r => r.QrCode);
          const res = await fabricInventoryService.updateLocation(qrs, shelfQR);
          showToast(res.message || t('putaway.saveSuccess', { count: qrs.length, shelf: shelfQR }), 'success');
          
          // Clear rolls after saving
          setScannedRolls([]);
        } catch (err: any) {
          showToast(err.message || t('putaway.saveError'), 'error');
        } finally {
          setIsSaving(false);
          inputRef.current?.focus();
        }
      },
      'safe'
    );
  };

  return (
    <Box sx={{ px: 1, py: 1, flex: 1, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1, zoom: { md: 0.85, lg: 0.9, xl: 1 } }}>
      
      {/* HEADER & INPUT BOX */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
        <Box sx={{ 
          display: { xs: 'flex', md: 'grid' }, 
          flexDirection: 'column', 
          gridTemplateColumns: '1fr minmax(250px, 300px)', 
          gap: 2, 
          alignItems: 'stretch' 
        }}>
          
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#334155' }}>
              {t('putaway.scanPlaceholder')}
            </Typography>
            <form onSubmit={handleFormSubmit}>
              <TextField
                inputRef={inputRef}
                onBlur={() => {
                  setTimeout(() => {
                    const active = document.activeElement;
                        if (active && active !== document.body) return;
                    inputRef.current?.focus();
                  }, 100);
                }}
                fullWidth
                size="medium"
                placeholder={t('putaway.scanPlaceholder', 'e.g. F2A-A01 or roll FB-123...')}
                defaultValue={""}
                onChange={e => { inputValRef.current = e.target.value; }}
                disabled={isScanning || isSaving}
                inputProps={{ inputMode: showVirtualKeyboard ? 'text' : 'none', autoComplete: 'off' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <QrCodeIcon color="primary" />
                  </InputAdornment>
                ),
                sx: { 
                  bgcolor: '#fff', 
                  borderRadius: 2, 
                  fontWeight: 600, 
                  fontSize: '1.2rem',
                  '& input': { letterSpacing: 1 } 
                },
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={showVirtualKeyboard ? t('issueFabric.hideKeyboard', 'Hide virtual keyboard') : t('issueFabric.showKeyboard', 'Show virtual keyboard')}>
                      <IconButton 
                        onClick={() => setShowVirtualKeyboard(!showVirtualKeyboard)} 
                        edge="end" 
                        color={showVirtualKeyboard ? "warning" : "default"} 
                        sx={{ mr: 0.5 }}
                      >
                        {showVirtualKeyboard ? <KeyboardHideIcon /> : <KeyboardIcon />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('putaway.cameraScan', 'Camera Scan')}>
                      <IconButton 
                        color="primary" 
                        onClick={() => setShowScanner(true)}
                        sx={{ bgcolor: '#e0f2fe', '&:hover': { bgcolor: '#bae6fd' } }}
                      >
                        <CameraIcon />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                )
              }}
            />
            </form>

            {/* CASCADING DROPDOWNS */}
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed #cbd5e1' }}>
               <Button 
                 variant="text" 
                 size="small"
                 onClick={() => setShowManualShelf(p => !p)}
                 sx={{ width: '100%', justifyContent: 'flex-start', color: '#64748b', fontWeight: 600, mb: 1 }}
               >
                 {showManualShelf ? `▲ ${t('putaway.manualShelf')}` : `▼ ${t('putaway.manualShelf')}`}
               </Button>
               <Collapse in={showManualShelf}>
                 <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                   <FormControl size="small" sx={{ minWidth: 100, flex: 1, bgcolor: '#fff' }}>
                     <InputLabel>1. {t('putaway.zone')}</InputLabel>
                     <Select value={selName} label="1. Khu" onChange={e => { setSelName(e.target.value); setSelLevel(''); setSelSeq(''); }}>
                       {nameOpts.map(o => <MenuItem key={String(o)} value={String(o)}>{o}</MenuItem>)}
                     </Select>
                   </FormControl>
                   <FormControl size="small" sx={{ minWidth: 100, flex: 1, bgcolor: '#fff' }} disabled={!selName}>
                     <InputLabel>2. {t('putaway.row')}</InputLabel>
                     <Select value={selLevel} label={`2. ${t('putaway.row', 'Row')}`} onChange={e => { setSelLevel(e.target.value); setSelSeq(''); }}>
                       {levelOpts.map(o => <MenuItem key={String(o)} value={String(o)}>{o}</MenuItem>)}
                     </Select>
                   </FormControl>
                   <FormControl size="small" sx={{ minWidth: 100, flex: 1, bgcolor: '#fff' }} disabled={!selLevel}>
                     <InputLabel>3. {t('putaway.bin')}</InputLabel>
                     <Select value={selSeq} label={`3. ${t('putaway.bin', 'Bin')}`} onChange={e => setSelSeq(e.target.value)}>
                       {seqOpts.map(o => <MenuItem key={String(o)} value={String(o)}>{o}</MenuItem>)}
                     </Select>
                   </FormControl>
                   <Button 
                     variant="contained" 
                     color="primary" 
                     disabled={!selName || !selLevel || !selSeq}
                     onClick={handleApplyCascading}
                     sx={{ fontWeight: 700, px: 3, borderRadius: 1.5 }}
                   >
                     {t('putaway.selectShelf')}
                   </Button>
                 </Box>
               </Collapse>
            </Box>

          </Box>

          <Paper elevation={0} sx={{ 
            p: 2, borderRadius: 2, width: '100%', height: '100%', 
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            bgcolor: shelfQR ? '#ecfdf5' : '#f1f5f9',
            border: `1px solid ${shelfQR ? '#10b981' : '#cbd5e1'}`
          }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ShelfIcon fontSize="small" /> {t('putaway.shelfLabel')}
            </Typography>
            {shelfQR ? (
              <Chip 
                label={shelfQR} 
                onDelete={() => {
                  setShelfQR('');
                  inputRef.current?.focus();
                }}
                sx={{ 
                  mt: 1, fontSize: '1.3rem', fontWeight: 800, height: 40,
                  color: '#059669', bgcolor: '#a7f3d0',
                  '& .MuiChip-deleteIcon': {
                    color: '#047857',
                    '&:hover': { color: '#065f46' }
                  }
                }} 
              />
            ) : (
              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: '#94a3b8' }}>
                {t('putaway.shelfPlaceholder')}
              </Typography>
            )}
          </Paper>

        </Box>
      </Paper>

      {/* ACTION BAR & COUNT */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          {t('putaway.scannedRolls')} 
          <Chip label={scannedRolls.length} color="primary" size="small" sx={{ fontWeight: 800, minWidth: 40 }} />
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<ClearAllIcon />}
            onClick={clearAll}
            disabled={scannedRolls.length === 0 && !shelfQR}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {t('putaway.clearAll')}
          </Button>
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={scannedRolls.length === 0 || !shelfQR || isSaving}
            sx={{ fontWeight: 800, borderRadius: 2, px: 3, boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
          >
            {t('putaway.saveBtn')}
          </Button>
        </Box>
      </Box>

      {/* DATAGRID */}
      <Paper sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <TableContainer sx={{ flexGrow: 1 }}>
          <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: 1.2, px: 2 } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', width: 50, borderBottom: '2px solid #e2e8f0', color: '#334155' }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Invoice / PO</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Item / Color</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Batch / Roll No</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>ShipL / Act.</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Location / Move To</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#f8fafc', width: 50, borderBottom: '2px solid #e2e8f0', color: '#334155' }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scannedRolls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8, color: '#94a3b8' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <QrCodeIcon sx={{ fontSize: 48, opacity: 0.2 }} />
                      <Typography variant="body2">{t('putaway.scanHint')}</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                scannedRolls.map((row, idx) => (
                  <PutawayRow 
                    key={row.QrCode} 
                    row={row} 
                    idx={idx} 
                    shelfQR={shelfQR} 
                    removeRow={removeRow} 
                    getCellProps={getCellProps}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Floating Summary Footer for Dragged Cells */}
      {selectionSummary && (
        <Paper elevation={4} className="sum-footer" sx={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 9999, py: 1.5, px: 3, borderRadius: 3,
          display: 'flex', gap: 2, flexWrap: 'wrap',
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: '#fff', alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Cell Count: {selectionSummary.count}</Typography>
            <Box sx={{ width: 1, height: 16, bgcolor: 'rgba(255,255,255,0.3)' }} />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Sum: <Box component="span" sx={{ fontSize: '1.2em', ml: 0.5 }}>{Math.round(selectionSummary.sum * 100) / 100}</Box>
            </Typography>
            <Button size="small" onClick={removeCellSelection} sx={{ color: '#fff', minWidth: 0, p: 0.5, ml: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
              ⨯
            </Button>
          </Box>
        </Paper>
      )}

      {/* TÍCH HỢP CAMERA SCANNER */}
      <Dialog open={showScanner} onClose={() => setShowScanner(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CameraIcon color="primary" /> {t('putaway.cameraScan')}
        </DialogTitle>
        <DialogContent sx={{ p: 1, bgcolor: '#000', display: 'flex', justifyContent: 'center' }}>
          {showScanner && (
            <Box sx={{ width: '100%', maxWidth: 500, overflow: 'hidden', borderRadius: 2 }}>
              <Html5QrcodePlugin 
                fps={10} 
                qrbox={250} 
                disableFlip={false}
                onClose={() => setShowScanner(false)}
                qrCodeSuccessCallback={(decodedText) => {
                  setShowScanner(false);
                  handleScanObject(decodedText);
                }} 
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowScanner(false)} variant="contained" color="inherit" sx={{ fontWeight: 700 }}>{t('putaway.close')}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog state={confirmDialog} onClose={closeConfirmDialog} />

    </Box>
  );
}

