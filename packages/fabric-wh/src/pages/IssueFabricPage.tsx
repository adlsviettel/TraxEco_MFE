import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton,
  InputAdornment, Chip, CircularProgress, Tooltip, Zoom, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions,
  ToggleButton, ToggleButtonGroup, Pagination, Select, MenuItem
} from '@mui/material';
import {
  QrCodeScanner as QrCodeScannerIcon,
  DeleteOutline as DeleteIcon,
  AssignmentTurnedIn as SaveIcon,
  WorkOutline as WorkIcon,
  CheckCircleOutline as CheckCircleIcon,
  ViewKanban as ViewKanbanIcon,
  Inventory2Outlined as InventoryIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { fabricInventoryService, type FabricInventoryItem } from '../services/fabricInventoryService';
import { useTranslation } from 'react-i18next';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { QRCodeSVG } from 'qrcode.react';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import KeyboardHideIcon from '@mui/icons-material/KeyboardHide';
import FabricSearchFilter from '../components/FabricSearchFilter';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CategoryIcon from '@mui/icons-material/Category';
import PaletteIcon from '@mui/icons-material/Palette';
import LayersIcon from '@mui/icons-material/Layers';
import QrCodeIcon from '@mui/icons-material/QrCode';
import { useToast, Html5QrcodePlugin, ConfirmDialog, defaultConfirmDialog, useExcelDragSelection } from '@traxeco/shared';
import type { ConfirmDialogState } from '@traxeco/shared';

// Define the Interface for Scanned Roll
interface ScannedRoll {
  QrCode: string;
  JobNo: string;
  ItemNo: string;
  Color: string;
  InvoiceNo: string;
  Supplier: string;
  PO: string;
  BatchNo: string;
  RollNo: string;
  Yard: number; // Issue Qty
  OriginalBal: number; // Max Qty
  SunriseOut?: string;
}

const tableHeaders = ['Seq', 'Job No', 'Item No', 'Color', 'Supplier', 'PO', 'Batch No', 'Roll No', 'Yards (Balance)', 'Action'];

// Thiết lập âm thanh báo động (Industrial / Urgent)
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
      // 1 tiếng TÍT cực gọn, tần số cao (khoẻ, rõ chữ)
      playTone(950, 'sine', now, 0.15, 0.2);
    } else if (type === 'warning') {
      // 3 tiếng TÍT TÍT TÍT chói tai (Square wave, nhịp nhanh còi báo động)
      playTone(1000, 'square', now, 0.1, 0.15);
      playTone(1000, 'square', now + 0.15, 0.1, 0.15);
      playTone(1000, 'square', now + 0.3, 0.1, 0.15);
    } else if (type === 'error') {
      // Tiếng rè TÈ TÈ chát chúa (Gameshow sai / máy công nghiệp quá tải)
      const playBuzzer = (time: number) => {
         const osc1 = ctx.createOscillator();
         const osc2 = ctx.createOscillator();
         const gain = ctx.createGain();
         
         osc1.type = 'sawtooth';
         osc2.type = 'square';
         osc1.frequency.setValueAtTime(140, time);
         osc2.frequency.setValueAtTime(150, time); // Cố tình làm xéo tần số gây cảm giác gắt
         
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
      playBuzzer(now + 0.4); // 2 phát rè liên tiếp
    }
  } catch (e) {
    console.warn('Audio API not supported or blocked', e);
  }
};

export default function IssueFabricPage() {
  const { showToast } = useToast();
  const { t } = useTranslation();

  // State
  const [jobs, setJobs] = useState<string[]>([]);
  const [jobInputValue, setJobInputValue] = useState('');
  const [activeJobs, setActiveJobs] = useState<string[]>([]); // The Jobs we are currently scanning for
  const qrCodeRef = useRef('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedRolls, setScannedRolls] = useState<ScannedRoll[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);

  // Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(defaultConfirmDialog);
  const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'danger' | 'safe' | 'info' = 'danger') => {
    setConfirmDialog({ open: true, title, message, onConfirm, variant });
  };
  const closeConfirm = () => setConfirmDialog(p => ({ ...p, open: false }));

  // Kanban Modal State
  const [isKanbanOpen, setIsKanbanOpen] = useState(false);
  const [selectedKanbanJobs, setSelectedKanbanJobs] = useState<string[]>([]);

  // Inventory Modal State
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [inventoryData, setInventoryData] = useState<FabricInventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [selectedInventoryRolls, setSelectedInventoryRolls] = useState<ScannedRoll[]>([]);
  const [invPage, setInvPage] = useState(0);
  const [invRowsPerPage, setInvRowsPerPage] = useState(50);

  // Focus Management
  const qrInputRef = useRef<HTMLInputElement>(null);
  const jobInputRef = useRef<HTMLInputElement>(null);

  // Transfer Mode State
  const [issueMode, setIssueMode] = useState<'Issue' | 'ChangeFac'>('Issue');
  const [targetFactory, setTargetFactory] = useState('');
  const [targetFactoryList, setTargetFactoryList] = useState<string[]>([]);

  // Print Auto-Popup State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [newPrintedRolls, setNewPrintedRolls] = useState<any[]>([]);

  // Scan Concurrency Management
  const isScanningRef = useRef<boolean>(false);
  const lastScannedQrRef = useRef<{ code: string, time: number }>({ code: '', time: 0 });

  // Excel-like Drag Selection for scanned list (DOM-based, zero re-render during drag)
  const { selectionSummary, removeCellSelection, getCellProps } = useExcelDragSelection({
    data: scannedRolls
  });

  // Auto-focus logic
  useEffect(() => {
    if (activeJobs.length === 0 && jobInputRef.current) {
      jobInputRef.current.focus();
    } else if (activeJobs.length > 0 && qrInputRef.current) {
      qrInputRef.current.focus();
    }
  }, [activeJobs]);

  // Fetch Factories for ChangeFac mode
  useEffect(() => {
    fabricInventoryService.getTargetFactories()
      .then(res => setTargetFactoryList(res))
      .catch(err => console.error("Could not fetch target factories", err));
  }, []);

  // Handle Setting Job
  const handleLockJob = () => {
    if (issueMode === 'ChangeFac') {
      if (!targetFactory) {
        showToast(t('issueFabric.selectTargetFactory'), 'warning');
        return;
      }
      setActiveJobs([targetFactory]);
      showToast(t('issueFabric.targetFactorySet', { factory: targetFactory }), 'info');
      return;
    }

    const currentJobs = [...jobs];
    
    // Split by comma if user typed "JobA,JobB"
    if (jobInputValue.trim()) {
      const newJobs = jobInputValue.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      newJobs.forEach(j => {
        if (!currentJobs.includes(j)) currentJobs.push(j);
      });
    }

    if (currentJobs.length === 0) {
      showToast(t('issueFabric.enterJob'), 'warning');
      return;
    }
    
    // Normalize and lock
    const finalJobs = currentJobs.map(j => j.toUpperCase());
    setJobs(finalJobs); // Sync state back
    setActiveJobs(finalJobs);
    setJobInputValue('');
    showToast(t('issueFabric.jobsSet', { count: finalJobs.length }), 'info');
  };

  const handleKanbanConfirm = () => {
    if (selectedKanbanJobs.length === 0) return;
    
    const currentJobs = [...jobs];
    selectedKanbanJobs.forEach(j => {
      if (!currentJobs.includes(j)) currentJobs.push(j);
    });
    
    setJobs(currentJobs);
    setActiveJobs(currentJobs);
    setIsKanbanOpen(false);
    setSelectedKanbanJobs([]);
    showToast(t('issueFabric.kanbanReceived', { count: selectedKanbanJobs.length }), 'info');
  };

  const handleClearJob = () => {
    if (scannedRolls.length > 0) {
      showConfirm(t('issueFabric.changeJobTitle'), t('issueFabric.changeJobMsg'), () => {
        setActiveJobs([]);
        setScannedRolls([]);
      });
    } else {
      setActiveJobs([]);
      setScannedRolls([]);
    }
  };

  const handleInventoryConfirm = () => {
    if (selectedInventoryRolls.length === 0) return;

    // Filter out rolls that are already in the scanned list to prevent duplicates
    const newRolls = selectedInventoryRolls.filter(invRoll => 
      !scannedRolls.some(scanRoll => scanRoll.QrCode === invRoll.QrCode)
    );

    // Give them the active job randomly or sequence (Mock logic for assigning job)
    const normalizedRolls = newRolls.map(r => ({
      ...r,
      JobNo: activeJobs[0] // assign the first locked job
    }));

    if (normalizedRolls.length === 0) {
      showToast(t('issueFabric.allRollsExist'), 'warning');
      return;
    }

    setScannedRolls(prev => [...normalizedRolls, ...prev]);
    showToast(t('issueFabric.rollsPulled', { count: normalizedRolls.length }), 'success');
    setIsInventoryOpen(false);
    setSelectedInventoryRolls([]);
  };

  const handleFetchInventory = async (searchParams: Record<string, string>) => {
    setIsLoadingInventory(true);
    try {
      const result = await fabricInventoryService.search({
        rollItem: searchParams.rollItem?.trim() || undefined,
        color: searchParams.color?.trim() || undefined,
        orderNumber: searchParams.orderNumber?.trim() || undefined,
        batchNo: searchParams.batchNo?.trim() || undefined,
        invoiceNo: searchParams.invoiceNo?.trim() || undefined,
        rollNo: searchParams.rollNo?.trim() || undefined
      });
      const rows = result.data || [];
      // Only show rolls that are NOT shipped or already assigned
      // Assuming Balance > 0 means it's available
      const availableRows = rows.filter(r => (r.Balance ?? 0) > 0);
      setInventoryData(availableRows);
      setInvPage(0); // Reset page on new search
      
      if (availableRows.length === 0) {
        showToast(t('issueFabric.noAvailableRolls'), 'warning');
      } else {
        showToast(t('issueFabric.foundRolls', { count: availableRows.length }), 'success');
      }
    } catch (err: any) {
      showToast(err.message || t('issueFabric.loadInventoryError'), 'error');
    } finally {
      setIsLoadingInventory(false);
    }
  };

  // API Call for scanning — uses fabricInventoryService.scanRoll()
  const handleScanQr = async (e?: React.KeyboardEvent | React.FormEvent, scannedCode?: string) => {
    if (e) e.preventDefault();
    const currentQr = (scannedCode || qrCodeRef.current).trim();
    if (!currentQr) return;

    // Prevent concurrent scans or rapid fire duplicates from camera
    const now = Date.now();
    if (isScanningRef.current) return;
    if (lastScannedQrRef.current.code === currentQr && (now - lastScannedQrRef.current.time) < 2000) {
       // Ignore identical scans within 2 seconds
       return;
    }

    if (activeJobs.length === 0) {
      playBeep('error');
      showToast(t('issueFabric.scanJobFirst'), 'error');
      qrCodeRef.current = ''; if (qrInputRef.current) qrInputRef.current.value = '';
      jobInputRef.current?.focus();
      if (scannedCode) setIsCameraScannerOpen(false); // Close camera if triggered from camera but no job locked
      return;
    }

    // Check duplicate in current session
    if (scannedRolls.some(r => r.QrCode === currentQr)) {
      playBeep('warning');
      showToast(t('issueFabric.rollAlreadyScanned', { qr: currentQr }), 'warning');
      if (!scannedCode) { qrCodeRef.current = ''; if (qrInputRef.current) qrInputRef.current.value = ''; }
      lastScannedQrRef.current = { code: currentQr, time: now };
      return;
    }

    setIsScanning(true);
    isScanningRef.current = true;
    lastScannedQrRef.current = { code: currentQr, time: now };
    
    try {
      // Call centralized service (handles auth token + base URL automatically)
      const data = await fabricInventoryService.scanRoll(currentQr);

      const targetYard = data.Balance != null ? Number(data.Balance) : 0;

      const newRoll: ScannedRoll = {
        QrCode: data.QrCode || currentQr,
        JobNo: activeJobs[0],
        ItemNo: data.RollItem || '',
        Color: data.Color || '',
        InvoiceNo: data.InvoiceNo || '',
        Supplier: data.SupCode || '',
        PO: data.OrderNumber || '',
        BatchNo: data.BatchNo || '',
        RollNo: data.RollNo?.toString() || '',
        Yard: targetYard,
        OriginalBal: targetYard,
        SunriseOut: data.SunriseOut || ''
      };

      setScannedRolls(prev => [newRoll, ...prev]);
      
      const warnings = [];
      if (data.SunriseOut && data.SunriseOut.toLowerCase() !== 'out') warnings.push('Not Out of Sunrise');
      if (data.PassPO && data.PassPO.toLowerCase() !== 'passed') warnings.push('Not QC Passed');
      if (data.LabStt && data.LabStt.toLowerCase() !== 'passed') warnings.push('Not Lab Passed');
      
      if (warnings.length > 0) {
        playBeep('warning');
        showToast(t('issueFabric.rollAcceptedWithWarning', { qr: currentQr, warnings: warnings.join(', ') }), 'warning');
      } else {
        playBeep('success');
        showToast(t('issueFabric.rollAccepted', { qr: currentQr }), 'success');
      }
      if (!scannedCode) { qrCodeRef.current = ''; if (qrInputRef.current) qrInputRef.current.value = ''; } // Only clear input if not from camera
    } catch (err: any) {
      const errMsg = err.message || t('issueFabric.systemError');
      // Identify business logic warnings vs system errors
      if (errMsg.includes('Not Out of Sunrise') || errMsg.includes('Not QC Passed') || errMsg.includes('thời gian Relax') || errMsg.includes('Not Lab Passed')) {
        playBeep('warning');
      } else {
        playBeep('error');
      }
      showToast(errMsg, 'error');
      if (!scannedCode) { qrCodeRef.current = ''; if (qrInputRef.current) qrInputRef.current.value = ''; }
    } finally {
      setIsScanning(false);
      isScanningRef.current = false;
      
      // If we used the camera, keep it open but if error maybe we want to close? Let's leave it open so they can re-scan.
      // But if we used the input box, re-focus it.
      if (!scannedCode) {
        setTimeout(() => qrInputRef.current?.focus(), 50);
      }
    }
  };

  // Handle Remove Scanned Row
  const handleRemoveRow = (qrToRemove: string) => {
    setScannedRolls(prev => prev.filter(r => r.QrCode !== qrToRemove));
  };

  // Handle Edit Yard Inline
  const handleEditYard = (qrCode: string, newYardStr: string, originalBal: number) => {
    const val = parseFloat(newYardStr);
    if (isNaN(val) || val <= 0) {
      playBeep('error');
      showToast(t('issueFabric.invalidQty'), 'error');
      return;
    }
    if (val > originalBal) {
      playBeep('error');
      showToast(t('issueFabric.exceedBalance', { bal: originalBal }), 'error');
      return;
    }
    
    const newQr = '';
    const shouldPrintNow = false;

    if (issueMode === 'ChangeFac' && val < originalBal) {
      showConfirm(t('issueFabric.splitTitle'), t('issueFabric.splitMsg'), () => {
        const generatedQr = `${qrCode}-${targetFactory.toUpperCase()}-${new Date().toLocaleTimeString('en-GB', {hour12:false}).replace(/:/g, '')}`;
        setScannedRolls(prev => {
          const next = prev.map(r => r.QrCode === qrCode ? { ...r, Yard: val, GeneratedQrCode: generatedQr } : r);
          const rollInfo = next.find(r => r.QrCode === qrCode);
          if (rollInfo) {
            setNewPrintedRolls([{ ...rollInfo, QrCode: generatedQr, Yard: val }]);
            setTimeout(() => setIsPrintModalOpen(true), 50);
          }
          return next;
        });
      }, 'info');
      // Also update without print if user declines - handle in the non-confirm path
      return;
    }
    
    setScannedRolls(prev => {
      const next = prev.map(r => 
        r.QrCode === qrCode 
          ? { ...r, Yard: val, ...(newQr ? { GeneratedQrCode: newQr } : {}) } 
          : r
      );
      
      if (shouldPrintNow) {
        // Find the newly updated info
        const rollInfo = next.find(r => r.QrCode === qrCode);
        if (rollInfo) {
          const printedRoll = { 
            ...rollInfo, 
            QrCode: newQr, 
            Yard: val 
          };
          // We must defer the execution of state setters because React batches them. 
          // Setting setTimeout ensures it opens AFTER the render cycle picks up `newPrintedRolls`
          setNewPrintedRolls([printedRoll]);
          setTimeout(() => setIsPrintModalOpen(true), 50);
        }
      }
      return next;
    });
  };

  // Handle Save (Upload to server)
  const handleSave = async () => {
    if (scannedRolls.length === 0) return;
    
    // We can also let the user choose if it's "Recut" but for now let's pass false by default 
    const isRecut = false; 

    if (issueMode === 'ChangeFac' && !targetFactory) {
      showToast(t('issueFabric.selectTargetFactoryToTransfer'), 'error');
      return;
    }

    const actionText = issueMode === 'ChangeFac' ? t('issueFabric.confirmTransferAction') : t('issueFabric.confirmIssueAction');
    showConfirm(
      t('issueFabric.confirmIssueTitle'),
      t('issueFabric.confirmIssueMsg', { action: actionText, count: scannedRolls.length }),
      async () => {
        setIsSaving(true);
        try {
          const response = await fabricInventoryService.batchIssueFabric(scannedRolls, isRecut, issueMode, targetFactory);
          playBeep('success');
          showToast(response.message || t('issueFabric.issueSuccess', { action: actionText, count: scannedRolls.length }), 'success');
          if (response.newQrs && response.newQrs.length > 0) {
            setNewPrintedRolls(response.newQrs);
            setIsPrintModalOpen(true);
          }
          // Clear data on success
          setScannedRolls([]);
          setJobs([]);
          setActiveJobs([]);
        } catch (err: any) {
          playBeep('error');
          showToast(err.message || t('issueFabric.saveDataError'), 'error');
        } finally {
          setIsSaving(false);
        }
      },
      'safe'
    );
  };

  const totalYards = scannedRolls.reduce((sum, r) => sum + r.Yard, 0);

  const triggerBrowserPrint = () => {
    const content = document.getElementById('auto-qr-print-area')?.innerHTML;
    if (content) {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>Print Label</title>
              <style>
                @page { margin: 0; }
                body { margin: 0; padding: 0; font-family: sans-serif; }
                .sticker-label { break-after: page; width: 100%; height: 100vh; overflow: hidden; display: flex; padding: 10px; box-sizing: border-box; }
                .fields-col { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
                .field-text { font-weight: bold; font-size: 14pt; line-height: 1.2; }
                .qr-col { display: flex; align-items: center; padding-left: 15px; }
              </style>
            </head>
            <body>
              ${content.replace(/<div/g, '<div').replace(/<\/div>/g, '</div>')}
              <script>window.print(); window.close();</script>
            </body>
          </html>
        `);
        win.document.close();
      }
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, flex: 1, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f8', zoom: { md: 0.85, lg: 0.9, xl: 1 } }}>
      <Box sx={{ 
        flexGrow: 1, 
        display: { xs: 'flex', md: 'grid' }, 
        flexDirection: 'column', // Fallback for mobile flex
        gridTemplateColumns: 'minmax(320px, 350px) 1fr', // Only active on md+
        gap: 2,
        minHeight: 0 // Crucial for nested scrolling
      }}>
        
        {/* LEFT COLUMN: Input Form */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 2, 
          flexShrink: 0 
        }}>
          
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <ToggleButtonGroup
                color="primary"
                value={issueMode}
                exclusive
                onChange={(_, newMode) => {
                  if (newMode !== null) {
                    if (activeJobs.length > 0 || scannedRolls.length > 0) {
                      showConfirm(t('issueFabric.changeModeTitle'), t('issueFabric.changeModeMsg'), () => {
                        setIssueMode(newMode);
                        setScannedRolls([]);
                        setJobs([]);
                        setActiveJobs([]);
                        setTargetFactory('');
                      });
                    } else {
                      setIssueMode(newMode);
                    }
                  }
                }}
                aria-label="Issue Mode"
                size="small"
                fullWidth
              >
                <ToggleButton value="Issue" sx={{ fontWeight: 'bold' }}>{t('issueFabric.issueMode')}</ToggleButton>
                <ToggleButton value="ChangeFac" sx={{ fontWeight: 'bold' }}>{t('issueFabric.transferMode')}</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748b', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <WorkIcon fontSize="small" /> {issueMode === 'ChangeFac' ? t('issueFabric.setupFactory', '1. Setup Target Factory') : t('issueFabric.setupJob', '1. Setup Target Job')}
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              {issueMode === 'ChangeFac' ? (
                <TextField
                  fullWidth
                  select
                  size="small"
                  label={t('issueFabric.targetFactory')}
                  value={targetFactory}
                  onChange={(e) => setTargetFactory(e.target.value)}
                  disabled={activeJobs.length > 0} 
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ style: { fontWeight: 'bold' } }}
                  SelectProps={{ native: true }}
                >
                  <option value="" disabled>-- {t('issueFabric.targetFactory')} --</option>
                  {targetFactoryList.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </TextField>
              ) : (
                <Autocomplete
                  multiple
                  freeSolo
                  disabled={activeJobs.length > 0}
                  options={[]} // No pre-defined options
                  value={jobs}
                  inputValue={jobInputValue}
                  onInputChange={(_, newInputValue) => setJobInputValue(newInputValue)}
                  onChange={(_, newValue) => setJobs(newValue)}
                  renderTags={(value: readonly string[], getTagProps) =>
                    value.map((option: string, index: number) => {
                      const tagProps = getTagProps({ index });
                      const { key, ...restTagProps } = tagProps;
                      return (
                        <Chip
                        key={key}
                        variant="filled"
                        label={option}
                        color="primary"
                        sx={{ fontWeight: 600, color: '#fff', bgcolor: '#3b82f6' }}
                        {...restTagProps}
                      />
                    );
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    variant="outlined"
                    label={t('issueFabric.multiJob', 'Enter multiple JobNo...')}
                    inputRef={jobInputRef}
                    onBlur={() => {
                      setTimeout(() => {
                        const active = document.activeElement;
                        if (active && active !== document.body) return;
                        jobInputRef.current?.focus();
                      }, 100);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !jobInputValue) {
                        e.preventDefault();
                        handleLockJob();
                      }
                    }}
                    InputProps={{
                      ...params.InputProps,
                      sx: { fontWeight: 600, bgcolor: activeJobs.length > 0 ? '#f8fafc' : '#fff' },
                      endAdornment: activeJobs.length > 0 && (
                        <InputAdornment position="end">
                          <CheckCircleIcon color="success" />
                        </InputAdornment>
                      )
                    }}
                  />
                )}
              />
              )}

              {activeJobs.length > 0 ? (
                <Button variant="outlined" color="warning" fullWidth onClick={handleClearJob} sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}>
                  {t('issueFabric.changeJob')}
                </Button>
              ) : (
                <Box display="flex" gap={1}>
                  <Button variant="contained" color="success" onClick={handleLockJob} disableElevation sx={{ flexGrow: 1, fontWeight: 700, borderRadius: 2, textTransform: 'none' }}>
                    {t('issueFabric.lockJobs')}
                  </Button>
                  {issueMode !== 'ChangeFac' && (
                    <Tooltip title={t('issueFabric.selectFromKanban')}>
                      <Button variant="outlined" color="primary" disableElevation sx={{ borderRadius: 2, minWidth: '40px', px: 1.5 }} onClick={() => setIsKanbanOpen(true)}>
                        <ViewKanbanIcon />
                      </Button>
                    </Tooltip>
                  )}
                </Box>
              )}
            </Box>
          </Paper>

          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#fff', flexGrow: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748b', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <QrCodeScannerIcon fontSize="small" /> 2. {t('issueFabric.scanRollQR')}
            </Typography>
            
            <form onSubmit={handleScanQr}>
              <Box sx={{ position: 'relative', mt: 2, display: 'flex', gap: 1 }}>
                <TextField 
                  fullWidth
                  variant="outlined"
                  placeholder={t('issueFabric.scanPlaceholder')}
                  defaultValue={""}
                  onChange={(e) => { qrCodeRef.current = e.target.value; }}
                  disabled={activeJobs.length === 0 || isScanning}
                  inputRef={qrInputRef}
                  onBlur={() => {
                    setTimeout(() => {
                      const active = document.activeElement;
                        if (active && active !== document.body) return;
                      qrInputRef.current?.focus();
                    }, 100);
                  }}
                  autoComplete="off"
                  inputProps={{ inputMode: showVirtualKeyboard ? 'text' : 'none' }}
                  InputProps={{
                    sx: { height: 60, fontSize: '1.2rem', fontWeight: 700, bgcolor: (activeJobs.length === 0) ? '#f8fafc' : '#fff', borderRadius: 2 },
                    startAdornment: (
                      <InputAdornment position="start">
                        {isScanning ? <CircularProgress size={24} color="success" /> : <QrCodeScannerIcon color={activeJobs.length > 0 ? 'success' : 'disabled'} />}
                      </InputAdornment>
                    ),
                    endAdornment: activeJobs.length > 0 ? (
                      <InputAdornment position="end">
                        <Tooltip title={showVirtualKeyboard ? t('issueFabric.hideKeyboard') : t('issueFabric.showKeyboard')}>
                          <IconButton onClick={() => setShowVirtualKeyboard(!showVirtualKeyboard)} edge="end" color={showVirtualKeyboard ? "warning" : "default"} sx={{ mr: 0.5 }}>
                            {showVirtualKeyboard ? <KeyboardHideIcon /> : <KeyboardIcon />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('issueFabric.scanWithCamera')}>
                          <IconButton onClick={() => setIsCameraScannerOpen(true)} edge="end" color="primary">
                            <CameraAltIcon />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ) : null
                  }}
                />
                <Tooltip title={t('issueFabric.selectFromInventory')}>
                  <span> {/* Tooltip needs a span wrapper when child is disabled */}
                    <Button
                      variant="outlined"
                      color="primary"
                      disabled={activeJobs.length === 0}
                      onClick={() => setIsInventoryOpen(true)}
                      sx={{ height: 60, width: 60, borderRadius: 2, bgcolor: activeJobs.length > 0 ? '#f0fdf4' : '', borderColor: '#4ade80', color: '#16a34a', '&:hover': { bgcolor: '#dcfce7' } }}
                    >
                      <InventoryIcon />
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            </form>
            
            <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                <strong>{t('issueFabric.note')}:</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', pl: 1 }}>
                - {t('issueFabric.note1')}<br/>
                - {t('issueFabric.note2')}<br/>
                - {t('issueFabric.note3')}
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* RIGHT COLUMN: Results Table */}
        <Paper elevation={0} sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          width: '100%', 
          height: '100%',
          minHeight: { xs: 300, md: 0 },
          borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden', 
          bgcolor: '#fff'
        }}>
            <Box sx={{ p: 1.5, borderBottom: '1px solid #e0e0e0', bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155' }}>
                  {t('issueFabric.scannedList')}
               </Typography>
               <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                 <Chip size="small" label={`${t('issueFabric.count')}: ${scannedRolls.length}`} sx={{ fontWeight: 700, bgcolor: '#e0e7ff', color: '#3730a3' }} />
                 <Chip size="small" label={`${t('issueFabric.total')}: ${totalYards} yds`} sx={{ fontWeight: 700, bgcolor: '#ffedd5', color: '#c2410c' }} />
                 {scannedRolls.length > 0 && (
                   <Button size="small" variant="outlined" color="error"
                     startIcon={<DeleteIcon />}
                     onClick={() => showConfirm(t('issueFabric.clearListTitle'), t('issueFabric.clearListMsg'), () => setScannedRolls([]))}
                     sx={{ ml: 1, fontWeight: 700, fontSize: 12, borderRadius: 1.5, textTransform: 'none' }}
                   >
                     {t('issueFabric.clearAll')}
                   </Button>
                 )}
               </Box>
            </Box>

            <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
              <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: 1, px: 1.5 } }}>
                <TableHead>
                  <TableRow>
                    {tableHeaders.map((head, idx) => (
                      <TableCell key={idx} sx={{ fontWeight: 700, bgcolor: '#f8fafc', color: '#334155', whiteSpace: 'nowrap', borderBottom: '2px solid #e2e8f0' }} align={head === 'Yards (Balance)' || head === 'Action' ? 'center' : 'left'}>
                        {head}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scannedRolls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={tableHeaders.length} align="center" sx={{ py: 8 }}>
                         <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5 }}>
                           <QrCodeScannerIcon sx={{ fontSize: 60, mb: 1 }} />
                           <Typography variant="body1" sx={{ fontWeight: 600 }}>{t('putaway.noRollsYet')}</Typography>
                           <Typography variant="body2">{t('putaway.scanHint')}</Typography>
                         </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    scannedRolls.map((row, idx) => (
                        <TableRow hover key={row.QrCode}>
                          <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>{scannedRolls.length - idx}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.JobNo}</TableCell>
                          <TableCell>{row.ItemNo}</TableCell>
                          <TableCell sx={{ color: '#0ea5e9', fontWeight: 600 }}>{row.Color}</TableCell>
                          <TableCell>{row.Supplier}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', color: '#64748b' }}>{row.PO}</TableCell>
                          <TableCell>{row.BatchNo}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.RollNo}</TableCell>
                          <TableCell align="center" {...getCellProps('Yard', idx, true)}>
                            <Box 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: 0.5,
                                '&:hover .edit-icon': { opacity: 1 }
                              }}
                            >
                              <TextField
                                size="small"
                                type="number"
                                variant="standard"
                                defaultValue={row.Yard}
                                onBlur={(e) => {
                                  const val = Number(e.target.value);
                                  if (val !== row.Yard) {
                                    if (isNaN(val) || val <= 0 || val > row.OriginalBal) {
                                      e.target.value = row.Yard.toString(); // Revert visually
                                    }
                                    handleEditYard(row.QrCode, e.target.value, row.OriginalBal);
                                  }
                                }}
                                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    // Use the input value from e.target
                                    const inputNode = e.target as HTMLInputElement;
                                    const val = Number(inputNode.value);
                                    if (val !== row.Yard) {
                                      if (isNaN(val) || val <= 0 || val > row.OriginalBal) {
                                        inputNode.value = row.Yard.toString(); // Revert visually
                                      }
                                      handleEditYard(row.QrCode, inputNode.value, row.OriginalBal);
                                    }
                                    
                                    // Remove focus from input and return focus to scanner form
                                    inputNode.blur();
                                    setTimeout(() => qrInputRef.current?.focus(), 50);
                                  }
                                }}
                                inputProps={{ 
                                  step: "0.01", min: "0.01", max: row.OriginalBal,
                                  style: { textAlign: 'center', fontWeight: 800, color: row.Yard !== row.OriginalBal ? '#c2410c' : '#1e293b', width: '50px' } 
                                }}
                                InputProps={{
                                  disableUnderline: true,
                                  sx: { bgcolor: row.Yard !== row.OriginalBal ? '#ffedd5' : '#f1f5f9', borderRadius: 1, px: 0.5 }
                                }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title={t('common.delete', 'Delete')}>
                              <IconButton size="small" color="error" onClick={() => handleRemoveRow(row.QrCode)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Bottom Actions */}
            <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', bgcolor: '#fff', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button 
                  variant="contained" 
                  color="success" 
                  size="large"
                  startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  disabled={scannedRolls.length === 0 || isSaving}
                  onClick={handleSave}
                  disableElevation
                  sx={{ borderRadius: 2, fontWeight: 700, px: 4, py: 1.2, textTransform: 'none', fontSize: '1rem' }}
                >
                  {isSaving ? <CircularProgress size={24} color="inherit"/> : t('issueFabric.submitIssue', `Submit Transfer (${scannedRolls.length} rolls)`)}
                </Button>
            </Box>

          </Paper>
        </Box>

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

      {/* MODAL KANBAN */}
      <Dialog open={isKanbanOpen} onClose={() => setIsKanbanOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #e1e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
           <ViewKanbanIcon color="primary" /> {t('issueFabric.kanbanList', 'Kanban List (Pending)')}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: { xs: 0.5, lg: 1 }, px: { xs: 1, lg: 2 }, fontSize: { xs: '0.75rem', lg: '0.85rem' } } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Select</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Job No</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Item No</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Color</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* MOCK DATA KANBAN */}
                {[
                  { job: 'JOB-K-101', item: 'ITM-990', color: 'RED' },
                  { job: 'JOB-K-102', item: 'ITM-432', color: 'BLUE' },
                  { job: 'JOB-K-105', item: 'ITM-112', color: 'WHITE' },
                  { job: 'JOB-K-108', item: 'ITM-876', color: 'BLACK' }
                ].map((row) => (
                  <TableRow key={row.job} hover onClick={() => {
                    setSelectedKanbanJobs(prev => 
                      prev.includes(row.job) ? prev.filter(j => j !== row.job) : [...prev, row.job]
                    );
                  }} sx={{ cursor: 'pointer', bgcolor: selectedKanbanJobs.includes(row.job) ? '#e0f2fe' : 'inherit' }}>
                    <TableCell>
                      <input type="checkbox" checked={selectedKanbanJobs.includes(row.job)} readOnly style={{ cursor: 'pointer' }} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.job}</TableCell>
                    <TableCell>{row.item}</TableCell>
                    <TableCell>{row.color}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e1e8f0' }}>
          <Button onClick={() => setIsKanbanOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>{t('common.cancel', 'Cancel')}</Button>
          <Button onClick={handleKanbanConfirm} variant="contained" color="primary" disableElevation sx={{ fontWeight: 700 }} disabled={selectedKanbanJobs.length === 0}>
            {t('issueFabric.submitKanban', 'Confirm Kanban')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL INVENTORY PICKER */}
      <Dialog open={isInventoryOpen} onClose={() => setIsInventoryOpen(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3, height: '85vh', display: 'flex', flexDirection: 'column' } }}>
        <DialogTitle sx={{ p: 0 }}>
          <Box sx={{ p: 1.5, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e1e8f0', bgcolor: '#f8fafc', gap: 2 }}>
             <Box display="flex" alignItems="center" gap={1.5} sx={{ flexShrink: 0 }}>
               <Box sx={{ p: 1, bgcolor: '#dcfce7', borderRadius: 2, display: 'flex' }}>
                 <InventoryIcon sx={{ color: '#16a34a' }} />
               </Box>
               <Typography variant="h6" fontWeight={700}>Kho Vải (Tồn kho chưa xuất)</Typography>
             </Box>
             <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end', '& > div': { mb: 0, width: '100%' } }}>
               <FabricSearchFilter 
                 fields={[
                   { key: 'invoiceNo', label: 'Invoice No', icon: <ReceiptIcon fontSize="small" sx={{ color: '#64748b' }}/> },
                   { key: 'orderNumber', label: 'PO Number', icon: <ConfirmationNumberIcon fontSize="small" sx={{ color: '#64748b' }}/> },
                   { key: 'rollItem', label: 'Item No', icon: <CategoryIcon fontSize="small" sx={{ color: '#64748b' }}/> },
                   { key: 'color', label: 'Color', icon: <PaletteIcon fontSize="small" sx={{ color: '#64748b' }}/> },
                   { key: 'batchNo', label: 'Batch No', icon: <LayersIcon fontSize="small" sx={{ color: '#64748b' }}/> },
                   { key: 'rollNo', label: 'Roll No', icon: <QrCodeIcon fontSize="small" sx={{ color: '#64748b' }}/> },
                 ]}
                 loading={isLoadingInventory}
                 onSearch={handleFetchInventory}
                 onClear={() => setInventoryData([])}
               />
             </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, flexGrow: 1, overflow: 'auto' }}>

          <TableContainer sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}>
            <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: { xs: 0.5, lg: 1 }, px: { xs: 1, lg: 2 }, fontSize: { xs: '0.75rem', lg: '0.85rem' } } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Select</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>QR Code</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Item No</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Color</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>PO</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Supplier</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155', textAlign: 'center' }}>Roll No</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155', textAlign: 'center' }}>Yard Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventoryData.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                       {isLoadingInventory ? t('issueFabric.loadingData', 'Loading data...') : t('issueFabric.useFilterHint', 'Use the filter above to search for fabric in Inventory')}
                     </TableCell>
                  </TableRow>
                ) : (
                inventoryData.slice(invPage * invRowsPerPage, invPage * invRowsPerPage + invRowsPerPage).map((row) => {
                  if (!row.QrCode) return null;
                  const isChecked = selectedInventoryRolls.some(r => r.QrCode === row.QrCode);
                  const isAlreadyScanned = scannedRolls.some(r => r.QrCode === row.QrCode);
                  
                  return (
                    <TableRow 
                      key={row.QrCode} 
                      hover 
                      onClick={() => {
                        if (isAlreadyScanned) return;
                        setSelectedInventoryRolls(prev => {
                          if (isChecked) return prev.filter(j => j.QrCode !== row.QrCode);
                          
                          // Map FabricInventoryItem to ScannedRoll format
                          const newRoll: ScannedRoll = {
                            QrCode: row.QrCode,
                            JobNo: '', // Will be assigned on confirm
                            ItemNo: row.RollItem || '',
                            Color: row.Color || '',
                            InvoiceNo: row.InvoiceNo || '',
                            Supplier: row.SupCode || '',
                            PO: row.OrderNumber || '',
                            BatchNo: row.BatchNo || '',
                            RollNo: row.RollNo?.toString() || '',
                            Yard: row.Balance || 0,
                            OriginalBal: row.Balance || 0
                          };
                          return [...prev, newRoll];
                        });
                      }} 
                      sx={{ 
                        cursor: isAlreadyScanned ? 'not-allowed' : 'pointer', 
                        bgcolor: isAlreadyScanned ? '#f1f5f9' : (isChecked ? '#f0fdf4' : 'inherit'),
                        opacity: isAlreadyScanned ? 0.6 : 1
                      }}
                    >
                      <TableCell>
                        <input type="checkbox" checked={isChecked || isAlreadyScanned} disabled={isAlreadyScanned} readOnly style={{ cursor: isAlreadyScanned ? 'not-allowed' : 'pointer', width: 18, height: 18 }} />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#334155' }}>
                        {row.QrCode} {isAlreadyScanned && <Chip size="small" label={t('issueFabric.alreadyTaken', 'Taken')} color="default" sx={{ height: 18, fontSize: '0.65rem', ml: 1 }}/>}
                      </TableCell>
                      <TableCell>{row.RollItem}</TableCell>
                      <TableCell sx={{ color: '#0ea5e9', fontWeight: 600 }}>{row.Color}</TableCell>
                      <TableCell>{row.OrderNumber}</TableCell>
                      <TableCell>{row.SupCode}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>{row.RollNo}</TableCell>
                      <TableCell align="center">
                         <Chip size="small" label={row.Balance} sx={{ fontWeight: 800, bgcolor: '#10b981', color: '#fff' }} />
                      </TableCell>
                    </TableRow>
                  );
                }))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderTop: '1px solid #e2e8f0', bgcolor: '#fff', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>Rows/page:</Typography>
            <Select
              size="small"
              value={invRowsPerPage}
              onChange={e => {
                setInvRowsPerPage(Number(e.target.value));
                setInvPage(0);
              }}
              sx={{ height: 32, fontSize: '0.85rem', borderRadius: 1.5 }}
            >
              {[50, 100, 250, 500].map(v => <MenuItem key={v} value={v} sx={{ fontSize: '0.85rem' }}>{v}</MenuItem>)}
            </Select>
            <Typography variant="body2" sx={{ color: 'text.secondary', ml: 1 }}>
              {inventoryData.length > 0 ? invPage * invRowsPerPage + 1 : 0}-{Math.min((invPage + 1) * invRowsPerPage, inventoryData.length)} / {inventoryData.length}
            </Typography>
          </Box>
          <Pagination
            count={Math.ceil(inventoryData.length / invRowsPerPage) || 1}
            page={invPage + 1}
            onChange={(_, newPage) => setInvPage(newPage - 1)}
            shape="rounded"
            color="primary"
            size="small"
          />
        </Box>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e1e8f0', bgcolor: '#f8fafc' }}>
          <Box sx={{ flexGrow: 1 }}>
            {selectedInventoryRolls.length > 0 && <Typography variant="subtitle2" color="success.main" fontWeight={700}>Đang chọn: {selectedInventoryRolls.length} cuộn</Typography>}
          </Box>
          <Button onClick={() => setIsInventoryOpen(false)} color="inherit" sx={{ fontWeight: 600, mr: 1 }}>{t('common.close', 'Close')}</Button>
          <Button onClick={handleInventoryConfirm} variant="contained" color="success" disableElevation sx={{ fontWeight: 700, px: 3 }} disabled={selectedInventoryRolls.length === 0}>
            {t('issueFabric.confirmInventory', 'Confirm Inventory')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog for Camera Scanner */}
      <Dialog 
        open={isCameraScannerOpen} 
        onClose={() => setIsCameraScannerOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CameraAltIcon /> {t('issueFabric.cameraScan', 'Scan with Device Camera')}
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: '#000' }}>
          {isCameraScannerOpen && (
            <Html5QrcodePlugin
              fps={10}
              qrbox={250}
              disableFlip={false}
              onClose={() => setIsCameraScannerOpen(false)}
              qrCodeSuccessCallback={(decodedText) => {
                handleScanQr(undefined, decodedText);
              }}
              qrCodeErrorCallback={() => {
                 // We can ignore continuous frame errors to avoid spamming the console
              }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setIsCameraScannerOpen(false)} variant="outlined" color="primary">
            {t('common.closeCam', 'Close Camera')}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Hidden Auto Print Area */}
      <Box id="auto-qr-print-area" sx={{ display: 'none' }}>
        {newPrintedRolls.map((row, idx) => {
          return (
            <div key={idx} className="sticker-label">
              <div className="fields-col">
                <div className="field-text">PO: {row.OrderNumber || ''}</div>
                <div className="field-text">Color: {row.Color || ''}</div>
                <div className="field-text">Item: {row.RollItem || row.ItemNo || ''}</div>
                <div className="field-text">Lot: {row.BatchNo || ''}</div>
                <div className="field-text">Roll: {row.RollNo || ''}</div>
                <div className="field-text">Yds: {row.Yard || ''}</div>
                <div className="field-text">NW: {row.NW || ''} GW: {row.GW || ''}</div>
                <div className="field-text">Inv: {row.InvoiceNo || ''}</div>
              </div>
              <div className="qr-col">
                <QRCodeSVG value={String(row.QrCode || '')} size={180} level="M" />
              </div>
            </div>
          );
        })}
      </Box>

      {/* Auto-Print Modal */}
      <Dialog open={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#1976d2' }}>
          {t('issueFabric.splitSuccess', 'Roll Split Successfully')}
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ mb: 2, fontWeight: 500 }}>
            {t('issueFabric.splitMsg1', 'The system automatically generated ')}<strong>{newPrintedRolls.length}</strong>{t('issueFabric.splitMsg2', ' new QR codes for the split rolls. ')} 
            {t('issueFabric.splitMsg3', 'Do you want to print these codes to label the new rolls?')}
          </Typography>
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
            {newPrintedRolls.map((r, idx) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', pb: 1, mb: 1, '&:last-child': { border: 'none', mb: 0, pb: 0 } }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.QrCode}</Typography>
                <Typography color="secondary" sx={{ fontWeight: 700 }}>{r.Yard} Yds</Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsPrintModalOpen(false)} sx={{ color: '#64748b', fontWeight: 600 }}>{t('common.later', 'Later')}</Button>
          <Button onClick={() => { triggerBrowserPrint(); setIsPrintModalOpen(false); }} variant="contained" disableElevation color="primary" sx={{ fontWeight: 700, borderRadius: 1.5 }}>
            {t('issueFabric.printNew', 'Print Now')}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog state={confirmDialog} onClose={closeConfirm} />
    </Box>
  );
}

