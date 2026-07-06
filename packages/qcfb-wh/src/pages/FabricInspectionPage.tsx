import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, IconButton, Button, Grid, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { QrCodeScanner as QrCodeIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQrScanner } from '../hooks/useQrScanner';
import { qcfbInspectionService } from '../services/qcfbInspectionService';
import RollInfoPanel from '../components/RollInfoPanel';
import type { RollInfo } from '../components/RollInfoPanel';
import InspectionPanel from '../components/InspectionPanel';
import type { InspectionData } from '../components/InspectionPanel';
import DefectTable from '../components/DefectTable';
import type { DefectItem } from '../components/DefectTable';

export default function FabricInspectionPage() {
  const { t } = useTranslation();
  const [qrInput, setQrInput] = useState('');
  const [activeQr, setActiveQr] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [rollInfo, setRollInfo] = useState<RollInfo | undefined>(undefined);
  const [inspectionData, setInspectionData] = useState<InspectionData>({
    wb: '', wm: '', we: '', ya: '', ms: '', gsm: '', distance: '', cycleStandard: '', cycleActual: '', cycleNumber: '', cycleHori: '', cycleVer: '', pallet: '', note: '', colorApp: '1', handfeel: '1', odorTest: '1'
  });
  const [defects, setDefects] = useState<DefectItem[]>([]);
  const [defectMasters, setDefectMasters] = useState<any[]>([]);

  // Dialogs
  const [newRollDialog, setNewRollDialog] = useState(false);
  
  const { isScanning, startScanning, stopScanning } = useQrScanner('qr-reader');

  useEffect(() => {
    // Load defect masters on mount
    qcfbInspectionService.getDefectMasters().then(res => {
      if(res.ok) res.json().then(data => setDefectMasters(data || []));
    }).catch(console.error);
  }, []);

  const handleScan = async (code: string) => {
    if (!code) return;
    setLoading(true);
    try {
      // 1. Check if roll exists and is inspected
      const checkRes = await qcfbInspectionService.checkRoll(code);
      if (!checkRes.ok) {
        alert('Lỗi kết nối Backend API! Vui lòng kiểm tra xem Backend (TraxEco_BE) đã được build và chạy lại chưa.');
        setLoading(false);
        return;
      }
      
      const checkData = await checkRes.json();
      if (!checkData.exists) {
        alert(t('qcfb.inspection.rollNotFound', 'Cuộn vải không tồn tại trong kho!'));
        setLoading(false);
        return;
      }
      
      // 2. If not inspected, init roll. (We can prompt user, but for now we auto init to mimic previous flow)
      if (!checkData.isInspected) {
        await qcfbInspectionService.initRoll(code);
      }
      
      // 3. Get all info
      const infoRes = await qcfbInspectionService.getRollInfo(code);
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        setRollInfo(infoData.rollInfo || undefined);
        if (infoData.inspectionData) {
          setInspectionData({
            ...inspectionData,
            ...infoData.inspectionData
          });
        }
        setDefects(infoData.defects || []);
        setActiveQr(code);
        setQrInput(code);
      } else {
        alert('Lỗi khi lấy dữ liệu thông tin cuộn vải.');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onAddDefect = async (code: string, point: number) => {
    try {
      await qcfbInspectionService.addDefect({
        qrCode: activeQr,
        defectCode: code,
        point: String(point),
        qty: 1,
        yard: Number(rollInfo?.ShipLength || 0),
        imgLink: '',
        username: 'User', // Will be taken from backend token or service
        factory: 'Fac'
      });
      // Refresh defects
      const res = await qcfbInspectionService.getDefects(activeQr);
      if (res.ok) setDefects(await res.json());
    } catch (e) { console.error(e); }
  };

  const onDeleteDefect = async (code: string, point: number) => {
    try {
      await qcfbInspectionService.deleteDefect(activeQr, code, String(point));
      setDefects(defects.filter(d => !(d.DefectCode === code && d.DefectPoint === point)));
    } catch (e) { console.error(e); }
  };

  const onClearAllDefects = async () => {
    try {
      await qcfbInspectionService.clearAllDefects(activeQr);
      setDefects([]);
    } catch (e) { console.error(e); }
  };

  return (
    <Box sx={{ 
      height: '100%', display: 'flex', flexDirection: 'column', 
      minHeight: '100%',
      color: '#1e293b',
      p: { xs: 1, sm: 2 }
    }}>
      <Box sx={{ 
        display: 'flex', gap: 2, mb: 4, p: 2, 
        bgcolor: '#ffffff', 
        borderRadius: 4, 
        border: '1px solid rgba(0,0,0,0.04)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
        alignItems: 'center'
      }}>
        <TextField
          fullWidth
          size="medium"
          placeholder={t('qcfb.inspection.scanPlaceholder', 'Scan QR Code...')}
          value={qrInput}
          onChange={e => setQrInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleScan(qrInput)}
          sx={{ 
            '& .MuiOutlinedInput-root': { 
              bgcolor: '#f8fafc', 
              borderRadius: 3,
              transition: 'all 0.2s ease-in-out',
              '&:hover': { bgcolor: '#f1f5f9' },
              '&.Mui-focused': { bgcolor: '#ffffff', boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)' }
            },
            '& .MuiOutlinedInput-notchedOutline': { border: '1px solid transparent' },
            '& input::placeholder': { color: '#94a3b8', fontSize: '1rem' }
          }}
        />
        <Button 
          variant="contained" 
          onClick={() => handleScan(qrInput)}
          sx={{ 
            borderRadius: 3, px: 5, py: 1.5, fontWeight: 800, fontSize: '1rem',
            bgcolor: '#10b981',
            boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
            letterSpacing: '0.5px',
            '&:hover': { bgcolor: '#059669', boxShadow: '0 6px 20px rgba(16,185,129,0.4)', transform: 'translateY(-1px)' },
            transition: 'all 0.2s'
          }}
        >
          SCAN
        </Button>
        <IconButton onClick={() => {
          if (isScanning) stopScanning();
          else startScanning(handleScan);
        }} sx={{ 
          bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6',
          boxShadow: '0 4px 12px rgba(59,130,246,0.1)', 
          '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.15)', transform: 'rotate(5deg)' },
          transition: 'all 0.2s', p: 1.5
        }}>
          <QrCodeIcon />
        </IconButton>
      </Box>

      {/* QR Scanner Container */}
      <Box id="qr-reader" sx={{ display: isScanning ? 'block' : 'none', width: '100%', maxWidth: '400px', mx: 'auto', mb: 2 }} />

      <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
        {/* Panel A: Roll Info */}
        <Grid size={{ xs: 12 }}>
          <RollInfoPanel rollInfo={rollInfo} />
        </Grid>
        
        {/* Panel B: Inspection Input */}
        <Grid size={{ xs: 12, md: 7 }}>
          <InspectionPanel 
             qrCode={activeQr} 
             data={inspectionData} 
             onColorChange={v => { setInspectionData({...inspectionData, colorApp: v}); qcfbInspectionService.updateField(activeQr, 'colorApp', v); }}
             onHandfeelChange={v => { setInspectionData({...inspectionData, handfeel: v}); qcfbInspectionService.updateField(activeQr, 'handfeel', v); }}
             onOdorChange={v => { setInspectionData({...inspectionData, odorTest: v}); qcfbInspectionService.updateField(activeQr, 'odorTest', v); }}
          />
        </Grid>
        
        {/* Panel C: Defect Management */}
        <Grid size={{ xs: 12, md: 5 }}>
          <DefectTable 
             defects={defects}
             defectMasters={defectMasters}
             onAdd={onAddDefect}
             onDelete={onDeleteDefect}
             onDeleteAll={onClearAllDefects}
             yard={Number(rollInfo?.ShipLength || 100)}
             width={Number(rollInfo?.Width || 60)}
             customer="Adidas" // mock
          />
        </Grid>
      </Grid>
    </Box>
  );
}
