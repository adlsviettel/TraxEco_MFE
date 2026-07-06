import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button, IconButton,
  InputAdornment, Tooltip, Dialog, DialogContent, DialogTitle, DialogActions,
  Card, CardContent, Divider, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox
} from '@mui/material';
import {
  QrCodeScanner as QrCodeIcon,
  PhotoCamera as CameraIcon,
  Keyboard as KeyboardIcon,
  KeyboardHide as KeyboardHideIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Cancel as CancelIcon,
  VerticalAlignCenter as WidthIcon,
  Straighten as LengthIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  WarningAmber as WarningAmberIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { useToast, Html5QrcodePlugin, authService } from '@traxeco/shared';
import { fabricInventoryService } from '../services/fabricInventoryService';
import { useTranslation } from 'react-i18next';

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

export interface ScannedRelaxRoll {
  QrCode: string;
  RollNo?: string;
  Item: string;
  Color: string;
  BatchNo: string;
  ShipLength: number;
  OriginalWidth?: string; // Khổ vải lý thuyết
  InvoiceNo: string;
  SupCode?: string;
  OrderNumber?: string;
  isRelaxing?: boolean; // Trạng thái cuộn vải đang được Xả hay chưa
}

export default function ScanRelaxPage() {
  const { showToast } = useToast();
  const { t } = useTranslation();

  const inputValRef = useRef('');
  const [isScanning, setIsScanning] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);

  // Dữ liệu cuộn vải đang được focus
  const [currentRoll, setCurrentRoll] = useState<ScannedRelaxRoll | null>(null);
  const [confirmRelaxData, setConfirmRelaxData] = useState<any>(null);

  // Form states cho đo đạc thực tế
  const [widthBegin, setWidthBegin] = useState<string>('');
  const [widthMiddle, setWidthMiddle] = useState<string>('');
  const [widthEnd, setWidthEnd] = useState<string>('');
  const [actualYard, setActualYard] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Counter đếm giờ xả (cho vui)
  const [relaxStartTime, setRelaxStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);

  // Danh sách cuộn vải hoàn thành xả nhưng chưa có vị trí
  const [completedRolls, setCompletedRolls] = useState<any[]>([]);
  const [selectedRolls, setSelectedRolls] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{isOpen: boolean, items: string[], title: string}>({isOpen: false, items: [], title: ''});
  const [locationModal, setLocationModal] = useState<{isOpen: boolean, input: string, isScanning: boolean, loading: boolean}>({
    isOpen: false, input: '', isScanning: false, loading: false
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const isScanningRef = useRef<boolean>(false);
  const globalScanLockTime = useRef<number>(0);

  const fetchHistory = async () => {
    try {
      const data = await fabricInventoryService.getRelaxHistory();
      setCompletedRolls(data || []);
    } catch (e) {
      console.warn(t('relaxScan.fetchHistoryError', "Lỗi kéo data lịch sử xả vải:"), e);
    }
  };

  const handleUpdateLocation = async (isSkipping: boolean = false) => {
    const loc = isSkipping ? 'N/A' : locationModal.input.toUpperCase();
    if (!isSkipping && !loc) {
      showToast(t('relaxScan.scanLocationHint', 'Vui lòng nhập hoặc quét mã vị trí!'), 'warning');
      return;
    }
    setLocationModal(prev => ({ ...prev, loading: true }));
    try {
      await fabricInventoryService.updateLocation(selectedRolls, loc);
      if (isSkipping) {
        showToast(t('relaxScan.skippedLocation', { count: selectedRolls.length, defaultValue: 'Đã bỏ qua lưu vị trí cho {{count}} cuộn' }), 'success');
      } else {
        showToast(t('relaxScan.putawaySuccess', { count: selectedRolls.length, loc: loc, defaultValue: 'Đã cất {{count}} cuộn vào vị trí {{loc}}' }), 'success');
      }
      setSelectedRolls([]);
      setLocationModal({ isOpen: false, input: '', isScanning: false, loading: false });
      fetchHistory();
    } catch (e: any) {
      showToast(e.message || t('relaxScan.putawayError', 'Lỗi khi cất vị trí'), 'error');
      setLocationModal(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    // Kéo list data gốc ban đầu
    fetchHistory();
  }, []);

  useEffect(() => {
    // Focus ô nhập khi mới load, nếu chưa có cuộn vải nào
    if (!currentRoll) {
        inputRef.current?.focus();
    }
  }, [currentRoll]);

  // Bộ đếm thời gian
  useEffect(() => {
    let timer: any;
    if (currentRoll?.isRelaxing && relaxStartTime) {
      timer = setInterval(() => {
        setElapsed(Math.floor((Date.now() - relaxStartTime) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(timer);
  }, [currentRoll?.isRelaxing, relaxStartTime]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleScanObject = async (code: string) => {
    if (!code) return;
    let cleanCode = code.replace(/[\x00-\x1F\x7F-\x9F\u200B\uFEFF]/g, "").trim();

    if (cleanCode.startsWith('http') || cleanCode.includes('/')) {
        try {
            const urlParts = cleanCode.split('/');
            cleanCode = urlParts[urlParts.length - 1].split('?')[0]; 
        } catch (e) {}
    }

    const now = Date.now();
    if (now - globalScanLockTime.current < 600) return;
    globalScanLockTime.current = now;

    if (isScanningRef.current) return;

    // Reset lại form input
    setWidthBegin('');
    setWidthMiddle('');
    setWidthEnd('');
    setActualYard('');

    isScanningRef.current = true;
    setIsScanning(true);
    
    try {
      // Logic gọi API lấy thông tin cuộn vải dùng chung với scan vị trí
      const info = await fabricInventoryService.scanRollForPutaway(cleanCode);
      
      // Check SunriseOut
      if (info.SunriseOut && info.SunriseOut.toLowerCase() !== 'out') {
         if (!authService.hasAction('fb_relax', 'bypassSunrise')) {
            playBeep('error');
            showToast(t('relaxScan.barcodeSunriseError', 'Lỗi: Cuộn vải chưa xuất khỏi thẻ Sunrise! (Yêu cầu quyền Bypass)'), 'error');
            return;
         } else {
            playBeep('warning');
            showToast(t('relaxScan.barcodeSunriseWarning', 'Cảnh báo: Cuộn vải chưa xuất Sunrise, nhưng bạn có quyền Bypass!'), 'warning');
         }
      } else {
         playBeep('success');
      }

      // Kiểm tra lịch sử Relax
      if (info.StrRelxDate || info.FnsRelxDate) {
          setConfirmRelaxData(info);
          return;
      }

      processNewRoll(info, cleanCode);
    } catch (err: any) {
      console.error(err);
      setCurrentRoll(null);
      showToast(err.message || t('relaxScan.fetchHistoryError', 'Lỗi không tìm thấy cuộn vải'), 'error');
      // Trả lại focus cho thẻ input để tiếp tục quét
      setTimeout(() => inputRef.current?.focus(), 100);
    } finally {
      isScanningRef.current = false;
      setIsScanning(false);
    }
  };

  const processNewRoll = (info: any, scannedCode: string) => {
      const widthVal = info.OriWidth || info.Width || '';

      setCurrentRoll({
        QrCode: info.QrCode || scannedCode,
        RollNo: info.OriRollNo || info.RollNo || 'N/A',
        Item: info.FBItemNo || info.RollItem || 'N/A',
        Color: info.ColorCode || info.Color || 'N/A',
        BatchNo: info.OriBatchNo || info.BatchNo || 'N/A',
        InvoiceNo: info.InvoiceNo || 'N/A',
        OrderNumber: info.OrderNumber || 'N/A',
        ShipLength: info.OriLenght || info.ShipLength || info.Balance || 0,
        OriginalWidth: widthVal || 'N/A',
        SupCode: info.SupCode || 'N/A',
        isRelaxing: info.isRelaxing || false,
      });

      setWidthBegin(widthVal);
      setWidthMiddle(widthVal);
      setWidthEnd(widthVal);

      if (info.isRelaxing) {
         setRelaxStartTime(info.relaxStartTime ? new Date(info.relaxStartTime).getTime() : Date.now());
      } else {
         setRelaxStartTime(null);
      }

      playBeep('success');
      showToast('Nạp dữ liệu cuộn vải thành công!', 'success');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = inputValRef.current;
    inputValRef.current = '';
    if (inputRef.current) inputRef.current.value = '';
    handleScanObject(code);
  };

  const handleCancel = () => {
    setCurrentRoll(null);
    setWidthBegin('');
    setWidthMiddle('');
    setWidthEnd('');
    setActualYard('');
    setElapsed(0);
    setRelaxStartTime(null);
    // Focus back to scan input
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleToggleRelax = async () => {
    if (!currentRoll) return;

    if (!currentRoll.isRelaxing) {
       // Hành động: BẮT ĐẦU XẢ VẢI
       setIsSaving(true);
       try {
           await fabricInventoryService.startRelaxTime(currentRoll.QrCode);
           
           showToast(t('relaxScan.startSuccess', { qr: currentRoll.QrCode, defaultValue: `Đã ghi nhận BẮT ĐẦU XẢ VẢI cho cuộn ${currentRoll.QrCode}` }), 'success');
           
           // Khởi động đồng hồ
           setRelaxStartTime(Date.now());
           
           // Đổi trạng thái hiển thị của nút thành Kết Thúc
           setCurrentRoll(prev => prev ? { ...prev, isRelaxing: true } : prev);
       } catch (err: any) {
           console.error(err);
           showToast(err.message || t('relaxScan.startError', 'Lỗi khi bắt đầu'), 'error');
       } finally {
           setIsSaving(false);
       }
    } else {
       if (!widthBegin || !widthMiddle || !widthEnd) {
          showToast(t('relaxScan.missingWidths', "Vui lòng nhập đầy đủ các số đo Khổ (Width)!"), "warning");
          return;
       }
       if (parseFloat(widthBegin) <= 0 || parseFloat(widthMiddle) <= 0 || parseFloat(widthEnd) <= 0) {
          showToast(t('relaxScan.invalidWidths', "Các thông số đo phải lớn hơn 0!"), "warning");
          return;
       }
       if (!actualYard) {
          showToast(t('relaxScan.missingLength', "Vui lòng nhập số Yard thực tế!"), "warning");
          return;
       }

       setIsSaving(true);
       try {
          await fabricInventoryService.endRelaxAndSaveMeasurement({
              qrCode: currentRoll.QrCode,
              widthBegin: parseFloat(widthBegin),
              widthMiddle: parseFloat(widthMiddle),
              widthEnd: parseFloat(widthEnd),
              actualYard: parseFloat(actualYard)
          });
          
          showToast(t('relaxScan.endSaveSuccess', { qr: currentRoll.QrCode, defaultValue: `Đã KẾT THÚC và LƯU dữ liệu cho cuộn ${currentRoll.QrCode}` }), 'success');
          
          // Nhét luôn cuộn vừa Xả xong lên đầu bảng Local State thay vì chọc BE
          setCompletedRolls(prev => [
            {
               QrCode: currentRoll.QrCode,
               RollNo: currentRoll.RollNo,
               InvoiceNo: currentRoll.InvoiceNo,
               BatchNo: currentRoll.BatchNo,
               Item: currentRoll.Item,
               Color: currentRoll.Color,
               OrderNumber: currentRoll.OrderNumber,
               ShipLength: actualYard,
               Status: t('relaxScan.statusFinished', 'Vừa xong')
            },
            ...prev
          ]);
          
          handleCancel(); // Kết thúc thì dọn form để quét cuộn khác
       } catch (err: any) {
          console.error(err);
          showToast(err.message || t('relaxScan.saveFailed', "Lưu thất bại"), 'error');
       } finally {
          setIsSaving(false);
       }
    }
  };

  return (
    <Box sx={{ px: { xs: 1, sm: 2 }, py: 2, flex: 1, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: '1000px', mx: 'auto', zoom: { md: 0.85, lg: 0.9, xl: 1 } }}>
      
      {/* KHU VỰC 1: SCAN INPUT (Sẽ tàng hình đi nếu đang làm việc với 1 cuộn trên Card) */}
      {!currentRoll && (
        <Paper elevation={3} sx={{ p: 3, borderRadius: 3, border: '1px solid #10b981', bgcolor: '#ecfdf5', animation: 'fadeIn 0.5s' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
               <QrCodeIcon sx={{ fontSize: 32, color: '#059669' }} />
               <Typography variant="h6" sx={{ fontWeight: 800, color: '#064e3b' }}>
                 {t('relaxScan.scanStartPrompt', 'Quét mã vạch bắt đầu Xả Vải')}
               </Typography>
            </Box>
            <form onSubmit={handleFormSubmit} style={{ width: '100%', maxWidth: '600px' }}>
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
                placeholder={t('relaxScan.inputPlaceholder', 'Ví dụ: FB-12345...')}
                defaultValue={""}
                onChange={e => { inputValRef.current = e.target.value; }}
                disabled={isScanning}
                inputProps={{ inputMode: showVirtualKeyboard ? 'text' : 'none', autoComplete: 'off' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <QrCodeIcon color="success" />
                    </InputAdornment>
                  ),
                  sx: { 
                    bgcolor: '#fff', 
                    borderRadius: 3, 
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                    fontWeight: 700, 
                    fontSize: '1.4rem',
                    height: '60px',
                    '& input': { letterSpacing: 2, textAlign: 'center' },
                    '&.Mui-focused': { border: '2px solid #10b981' }
                  },
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={t('relaxScan.virtualKeyboard', 'Bàn phím ảo')}>
                        <IconButton 
                          onClick={() => setShowVirtualKeyboard(!showVirtualKeyboard)} 
                          color={showVirtualKeyboard ? "warning" : "default"} 
                          sx={{ mr: 0.5 }}
                        >
                          {showVirtualKeyboard ? <KeyboardHideIcon /> : <KeyboardIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('relaxScan.scanCamera', 'Quét Camera')}>
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
            <Typography variant="caption" sx={{ color: '#059669', fontStyle: 'italic' }}>
              * Con trỏ chuột luôn tập trung ở đây, chỉ cần bắn máy dọc là tự nhảy!
            </Typography>
          </Box>
        </Paper>
      )}

       {/* KHU VỰC 2: CARD ĐIỀN THÔNG TIN CHI TIẾT (Chỉ bật khi đã quét dính 1 cuộn) */}
      {currentRoll && (
        <Card elevation={6} sx={{ borderRadius: 3, overflow: 'visible', animation: 'slideInUp 0.3s' }}>
           <Box sx={{ bgcolor: 'primary.dark', p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                 <InfoIcon sx={{ color: '#fff' }} />
                 <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', letterSpacing: 1 }}>
                    {t('relaxScan.relaxingInfo', 'THÔNG TIN CUỘN VẢI ĐANG XẢ')}
                 </Typography>
              </Box>
              <Chip label={currentRoll.QrCode} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 800, fontSize: '1rem', border: '1px solid rgba(255,255,255,0.4)' }} />
           </Box>
           
           <CardContent sx={{ p: { xs: 2, md: 4 } }}>
             <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
                
                {/* CỘT TRÁI: Read-only Data */}
                <Box sx={{ flex: { xs: '1 1 auto', md: '0 0 40%' } }}>
                   <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', mb: 2 }}>
                     thông tin gốc
                   </Typography>
                   <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', pb: 0.5 }}>
                         <Typography color="text.secondary">Item:</Typography>
                         <Typography fontWeight={700}>{currentRoll.Item}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', pb: 0.5 }}>
                         <Typography color="text.secondary">Color:</Typography>
                         <Typography fontWeight={700}>{currentRoll.Color}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', pb: 0.5 }}>
                         <Typography color="text.secondary">Batch No:</Typography>
                         <Typography fontWeight={700}>{currentRoll.BatchNo}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', pb: 0.5 }}>
                         <Typography color="text.secondary">Invoice:</Typography>
                         <Typography fontWeight={700}>{currentRoll.InvoiceNo}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', pb: 0.5 }}>
                         <Typography color="text.secondary">Supplier:</Typography>
                         <Typography fontWeight={700}>{currentRoll.SupCode}</Typography>
                      </Box>
                   </Box>
                </Box>

                {/* Phân cách trên desktop */}
                <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
                   <Divider orientation="vertical" />
                </Box>

                {/* CỘT PHẢI: Inputs đo đạc */}
                <Box sx={{ flex: { xs: '1 1 auto', md: '1 1 0%' } }}>
                   <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                     <WidthIcon fontSize="small"/> {t('relaxScan.measuringResult', 'KẾT QUẢ ĐO ĐẠC THỰC TẾ')}
                   </Typography>

                   <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>

                      {/* AREA 1: WIDTH */}
                      <Box sx={{ mb: 3 }}>
                         <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{t('relaxScan.width', '1. Khổ Vải (Width)')}</span>
                            <span style={{ color: '#f57c00' }}>Gốc: {currentRoll.OriginalWidth}</span>
                         </Typography>
                         <Box sx={{ mt: 0.5, display: 'flex', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                               <TextField fullWidth size="small" type="number" label="Đầu cuộn"
                                  value={widthBegin} onChange={(e) => setWidthBegin(e.target.value)}
                                  InputLabelProps={{ shrink: true }}
                                  inputProps={{ step: '0.01' }}
                                  sx={{ bgcolor: '#fff' }} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                               <TextField fullWidth size="small" type="number" label="Giữa cuộn"
                                  value={widthMiddle} onChange={(e) => setWidthMiddle(e.target.value)}
                                  InputLabelProps={{ shrink: true }}
                                  inputProps={{ step: '0.01' }}
                                  sx={{ bgcolor: '#fff' }} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                               <TextField fullWidth size="small" type="number" label="Cuối cuộn"
                                  value={widthEnd} onChange={(e) => setWidthEnd(e.target.value)}
                                  InputLabelProps={{ shrink: true }}
                                  inputProps={{ step: '0.01' }}
                                  sx={{ bgcolor: '#fff' }} />
                            </Box>
                         </Box>
                      </Box>

                      {/* AREA 2: LENGTH */}
                      <Box>
                         <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{t('relaxScan.lengthYard', '2. Lượng Xả (Yard)')}</span>
                            <span style={{ color: '#f57c00' }}>ShipLength: {currentRoll.ShipLength}</span>
                         </Typography>
                         <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <LengthIcon sx={{ color: '#94a3b8' }} />
                            <TextField fullWidth size="medium" type="number" 
                                  placeholder={t('relaxScan.actualYardPlaceholder', 'Nhập số yard thực tế')}
                                  value={actualYard} onChange={(e) => setActualYard(e.target.value)}
                                  onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                           e.preventDefault();
                                           handleToggleRelax();
                                      }
                                  }}
                                  inputProps={{ step: '0.01' }}
                                  sx={{ bgcolor: '#fff', '& .MuiInputBase-input': { fontWeight: 800, color: 'primary.main', fontSize: '1.2rem' } }} />
                         </Box>
                      </Box>
                   </Box>

                   {/* ACTION BUTTONS */}
                   <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                      <Button variant="outlined" color="inherit" fullWidth onClick={handleCancel} disabled={isSaving}
                              startIcon={<CancelIcon/>} sx={{ fontWeight: 700, color: '#475569', borderColor: '#cbd5e1' }}>
                         Quét cuộn khác
                      </Button>
                      <Button 
                         variant="contained" 
                         color={currentRoll.isRelaxing ? "error" : "primary"} 
                         fullWidth 
                         onClick={handleToggleRelax} 
                         disabled={isSaving}
                         startIcon={currentRoll.isRelaxing ? <StopIcon/> : <PlayIcon/>} 
                         sx={{ fontWeight: 800, fontSize: '1rem', py: 1.5, boxShadow: currentRoll.isRelaxing ? '0 4px 14px rgba(239,68,68,0.4)' : '0 4px 14px rgba(59,130,246,0.4)' }}
                      >
                         {isSaving 
                           ? 'ĐANG BÁO CÁO...' 
                           : (currentRoll.isRelaxing 
                               ? `KẾT THÚC (${formatTime(elapsed)}) & LƯU` 
                               : 'BẮT ĐẦU XẢ VẢI')
                         }
                      </Button>
                   </Box>

                </Box>
             </Box>
           </CardContent>
        </Card>
      )}

      {/* KHU VỰC 3: DATAGRID HIỂN THỊ CÁC CUỘN ĐÃ XẢ XONG CHỜ CẬP NHẬT VỊ TRÍ */}
      {!currentRoll && (
        <Box sx={{ mt: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.5s', overflow: 'hidden' }}>
           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1 }}>
               <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon color="warning" />
                  DANH SÁCH ĐÃ XẢ (CHỜ CẤT VỊ TRÍ)
                  <Chip label={completedRolls.length} color="warning" size="small" sx={{ fontWeight: 800 }} />
               </Typography>
               <Box sx={{ display: 'flex', gap: 1 }}>
                   {selectedRolls.length > 0 && (
                     <>
                       <Button 
                          size="small" 
                          variant="contained" 
                          color="info" 
                          startIcon={<InventoryIcon />} 
                          onClick={() => setLocationModal(prev => ({ ...prev, isOpen: true }))}
                          sx={{ fontWeight: 600, borderRadius: 2 }}
                       >
                          CẤT VỊ TRÍ ({selectedRolls.length})
                       </Button>
                       <Button 
                          size="small" 
                          variant="contained" 
                          color="error" 
                          startIcon={<DeleteIcon />} 
                          onClick={() => {
                             setDeleteConfirm({
                                isOpen: true,
                                items: selectedRolls,
                                title: `Bạn chắc chắn muốn xóa ${selectedRolls.length} cuộn vải đã chọn?`
                             });
                          }}
                          sx={{ fontWeight: 600, borderRadius: 2 }}
                       >
                          XÓA ({selectedRolls.length})
                       </Button>
                     </>
                   )}
                   <Button size="small" variant="text" onClick={fetchHistory} startIcon={<RefreshIcon />} sx={{ fontWeight: 600 }}>
                      LÀM MỚI
                   </Button>
               </Box>
           </Box>
           
           <Paper sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
             <TableContainer sx={{ flexGrow: 1, maxHeight: 400 }}>
               <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: 1.2, px: 2 } }}>
                 <TableHead>
                   <TableRow>
                                           <TableCell padding="checkbox" sx={{ width: 40, bgcolor: '#f8fafc', py: 0 }}>
                         <Checkbox 
                            size="small" 
                            checked={completedRolls.length > 0 && selectedRolls.length === completedRolls.length}
                            onChange={(e) => {
                               if (e.target.checked) setSelectedRolls(completedRolls.map(r => r.QrCode));
                               else setSelectedRolls([]);
                            }}
                         />
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#f8fafc', width: 50, borderBottom: '2px solid #e2e8f0', color: '#334155' }}>STT</TableCell>
                     <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Roll No</TableCell>
                     <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Invoice / Batch</TableCell>
                     <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Item / Color</TableCell>
                     <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>PO</TableCell>
                     <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', textAlign: 'right', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Yard</TableCell>
                     <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Trạng thái</TableCell>
                     <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', textAlign: 'right', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>Thao tác</TableCell>
                   </TableRow>
                 </TableHead>
                 <TableBody>
                   {completedRolls.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={9} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                         <Typography variant="body2" sx={{ fontStyle: 'italic' }}>Không có cuộn vải nào đang chờ cất vào kệ.</Typography>
                       </TableCell>
                     </TableRow>
                   ) : (
                     completedRolls.map((row, idx) => (
                       <TableRow key={idx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell padding="checkbox" sx={{ py: 0 }}>
                             <Checkbox 
                                size="small"
                                checked={selectedRolls.includes(row.QrCode)}
                                onChange={(e) => {
                                   if (e.target.checked) setSelectedRolls([...selectedRolls, row.QrCode]);
                                   else setSelectedRolls(selectedRolls.filter(id => id !== row.QrCode));
                                }}
                             />
                          </TableCell>
                          <TableCell align="center">{idx + 1}</TableCell>
                         <TableCell>
                            <Typography sx={{ fontWeight: 800, color: '#1e293b' }}>{row.RollNo}</Typography>
                         </TableCell>
                         <TableCell>
                            <Typography sx={{ fontWeight: 600, color: '#475569' }}>Inv: {row.InvoiceNo}</Typography>
                            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>Batch: {row.BatchNo}</Typography>
                         </TableCell>
                         <TableCell>
                           <Typography sx={{ fontWeight: 600 }}>{row.RollItem || row.Item}</Typography>
                           <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>{row.Color}</Typography>
                         </TableCell>
                         <TableCell>
                            <Typography sx={{ fontWeight: 600, color: '#334155' }}>{row.OrderNumber}</Typography>
                         </TableCell>
                         <TableCell align="right">
                           <Typography sx={{ fontWeight: 800, color: '#0284c7' }}>{row.YrdsAc || row.ShipLength}</Typography>
                         </TableCell>
                         <TableCell>
                           <Chip label={row.Status || 'Chờ vị trí'} size="small" color="warning" variant="outlined" sx={{ fontWeight: 600, bgcolor: '#fffbeb' }} />
                         </TableCell>
                         <TableCell align="right">
                           <Tooltip title="Xóa nhanh">
                             <IconButton size="small" color="error" onClick={() => {
                                setDeleteConfirm({
                                   isOpen: true,
                                   items: [row.QrCode],
                                   title: `Xóa cuộn vải ${row.RollNo}?`
                                });
                             }}>
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
           </Paper>
        </Box>
      )}

      {/* POPUP CẢNH BÁO ĐÃ XẢ VẢI TRƯỚC ĐÓ */}
      <Dialog 
        open={!!confirmRelaxData} 
        onClose={() => {}} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
           sx: { borderRadius: 3, border: '1px solid #f59e0b', boxShadow: '0 20px 25px -5px rgba(245, 158, 11, 0.2)' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#b45309', fontWeight: 900, bgcolor: '#fffbeb' }}>
          <WarningAmberIcon color="warning" fontSize="large" />
          CẢNH BÁO: Cuộn Vải Này Đã Xả
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#fffbeb', px: 3 }}>
          <Typography variant="body1" sx={{ mb: 2, fontWeight: 600, color: '#92400e', fontSize: 16 }}>
            Cuộn vải <strong style={{ color: '#ea580c' }}>{confirmRelaxData?.QrCode}</strong> (Roll: {confirmRelaxData?.OriRollNo || confirmRelaxData?.RollNo}) đã được ghi nhận xả trước đó!
          </Typography>
          <Box sx={{ bgcolor: '#fef3c7', p: 2, borderRadius: 2, border: '1px dashed #d97706', mb: 2 }}>
             <Typography variant="body2" sx={{ mb: 1, color: '#92400e' }}>
                <strong style={{ display: 'inline-block', width: 140 }}>Giờ bắt đầu cũ:</strong> {confirmRelaxData?.StrRelxDate || 'Chưa rõ'}
             </Typography>
             <Typography variant="body2" sx={{ mb: 1, color: '#92400e' }}>
                <strong style={{ display: 'inline-block', width: 140 }}>Giờ kết thúc cũ:</strong> {confirmRelaxData?.FnsRelxDate || 'Chưa rõ'}
             </Typography>
             <Typography variant="body2" sx={{ color: '#92400e' }}>
                <strong style={{ display: 'inline-block', width: 140 }}>Yard cắt thực tế:</strong> <span style={{ fontWeight: 900, color: '#ea580c', fontSize: 16 }}>{confirmRelaxData?.YrdsAc ?? '0'}</span>
             </Typography>
          </Box>
          <Typography variant="body1" sx={{ fontWeight: 800, color: '#ea580c', textAlign: 'center' }}>
            Bạn có CHẮC CHẮN muốn XẢ LẠI cuộn này không? 
            <Box component="span" sx={{ display: 'block', fontWeight: 600, fontSize: 14, color: '#b45309', mt: 0.5 }}>
              (Dữ liệu cũ sẽ bị đè nếu tiếp tục)
            </Box>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#fffbeb', justifyContent: 'center', gap: 2 }}>
          <Button 
             variant="outlined" 
             size="large"
             onClick={() => {
                setIsScanning(false);
                isScanningRef.current = false;
                inputValRef.current = '';
                if (inputRef.current) inputRef.current.value = '';
                setConfirmRelaxData(null);
                setTimeout(() => inputRef.current?.focus(), 100);
             }}
             sx={{ fontWeight: 800, color: '#92400e', borderColor: '#d97706', minWidth: 140, borderRadius: 2 }}
          >
            Hủy Quét Qr
          </Button>
          <Button 
             variant="contained" 
             color="warning" 
             size="large"
             onClick={async () => {
                const info = confirmRelaxData;
                setConfirmRelaxData(null);
                try {
                   await fabricInventoryService.cancelOldRelax(info.QrCode);
                   processNewRoll({ ...info, isRelaxing: false, relaxStartTime: null }, info.QrCode);
                } catch (e: any) {
                   showToast('Lỗi huỷ dữ liệu cũ: ' + e.message, 'error');
                }
             }}
             sx={{ fontWeight: 900, minWidth: 180, borderRadius: 2 }}
          >
            XÁC NHẬN XẢ LẠI
          </Button>
        </DialogActions>
      </Dialog>

      {/* TÍCH HỢP CAMERA SCANNER */}
      <Dialog open={showScanner} onClose={() => setShowScanner(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CameraIcon color="primary" /> Quét Camera
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
          <Button onClick={() => setShowScanner(false)} variant="contained" color="inherit" sx={{ fontWeight: 700 }}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* POPUP XÓA */}
      <Dialog 
        open={deleteConfirm.isOpen} 
        onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon /> Xác Nhận Xóa
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ fontWeight: 500, color: '#334155' }}>
            {deleteConfirm.title}
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>
            Thao tác này không thể hoàn tác. Các cuộn vải bị xóa sẽ mất lịch sử xả vải và trở về trạng thái chưa xả.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
             onClick={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })} 
             color="inherit" 
             sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            HỦY
          </Button>
          <Button 
             onClick={async () => {
                try {
                   await fabricInventoryService.deleteRelaxRecords(deleteConfirm.items);
                   showToast(`Đã xóa thành công!`, 'success');
                   setSelectedRolls([]);
                   fetchHistory();
                } catch (e: any) {
                   showToast(e.message || 'Lỗi khi xóa', 'error');
                } finally {
                   setDeleteConfirm({ ...deleteConfirm, isOpen: false });
                }
             }}
             variant="contained" 
             color="error" 
             sx={{ fontWeight: 800, minWidth: 100, borderRadius: 2 }}
          >
            XÓA NGAY
          </Button>
        </DialogActions>
      </Dialog>

      {/* POPUP CẬP NHẬT VỊ TRÍ */}
      <Dialog 
        open={locationModal.isOpen} 
        onClose={() => setLocationModal(prev => ({ ...prev, isOpen: false, isScanning: false }))} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 1 }}>
          <InventoryIcon /> Cất Vị Trí Kệ ({selectedRolls.length} cuộn)
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
            Nhập tay mã kệ hoặc bấm nút Quét Camera bên dưới để quét QR vị trí kệ.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {locationModal.isScanning ? (
              <Box sx={{ width: '100%', borderRadius: 2, overflow: 'hidden' }}>
                <Html5QrcodePlugin 
                  fps={10} 
                  qrbox={250} 
                  disableFlip={false}
                  onClose={() => setLocationModal(prev => ({...prev, isScanning: false}))}
                  qrCodeSuccessCallback={(decodedText) => {
                    playBeep('success');
                    setLocationModal(prev => ({ ...prev, isScanning: false, input: decodedText }));
                  }} 
                />
                <Button fullWidth color="error" variant="text" sx={{ mt: 1, fontWeight: 700 }} onClick={() => setLocationModal(prev => ({...prev, isScanning: false}))}>
                  HỦY QUÉT
                </Button>
              </Box>
            ) : (
              <TextField 
                autoFocus
                fullWidth 
                variant="outlined" 
                label="Mã Vị Trí (VD: A.01.01)" 
                value={locationModal.input}
                onChange={(e) => setLocationModal(prev => ({ ...prev, input: e.target.value.toUpperCase() }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (locationModal.input) {
                      handleUpdateLocation(false);
                    }
                  }
                }}
                inputProps={{ inputMode: showVirtualKeyboard ? 'text' : 'none', autoComplete: 'off' }}
                InputProps={{
                  sx: { fontWeight: 700 },
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Bàn phím ảo">
                        <IconButton 
                          onClick={() => setShowVirtualKeyboard(!showVirtualKeyboard)} 
                          color={showVirtualKeyboard ? "warning" : "default"} 
                          sx={{ mr: 0.5 }}
                        >
                          {showVirtualKeyboard ? <KeyboardHideIcon /> : <KeyboardIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Quét Camera">
                        <IconButton color="primary" sx={{ bgcolor: '#e0f2fe', '&:hover': { bgcolor: '#bae6fd' } }} onClick={() => setLocationModal(prev => ({...prev, isScanning: true}))}>
                          <CameraIcon />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  )
                }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button 
             onClick={() => setLocationModal(prev => ({ ...prev, isOpen: false }))} 
             color="inherit" 
             sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            ĐÓNG
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
               onClick={() => handleUpdateLocation(true)}
               variant="outlined" 
               color="warning" 
               disabled={locationModal.loading || locationModal.isScanning}
               sx={{ fontWeight: 800, borderRadius: 2 }}
            >
              BỎ QUA
            </Button>
            <Button 
               onClick={() => handleUpdateLocation(false)}
               variant="contained" 
               color="info" 
               disabled={locationModal.loading || locationModal.isScanning || !locationModal.input}
               sx={{ fontWeight: 800, minWidth: 120, borderRadius: 2 }}
            >
              {locationModal.loading ? 'ĐANG LƯU...' : 'CẤT KỆ LƯU'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}





