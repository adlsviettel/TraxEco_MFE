import React, { useState, useMemo, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, TextField, MenuItem, Divider, 
  Card, CardContent, CardHeader, useTheme, Grid, Accordion, AccordionSummary, AccordionDetails,
  ToggleButtonGroup, ToggleButton, Chip, Snackbar, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import { 
  QrCodeScanner, PhotoCamera, Assessment, ExpandMore, Science, Straighten, Cancel
} from '@mui/icons-material';
import { Client } from '@stomp/stompjs';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

const QCInspectionMockupPage = () => {
  const theme = useTheme();

  // --- API State ---
  const [loading, setLoading] = useState(false);
  const [scannedQrCode, setScannedQrCode] = useState<string>('');
  const [rollData, setRollData] = useState<any>(null);
  const [alertMsg, setAlertMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [manualQr, setManualQr] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean, data: any, isReinspect: boolean } | null>(null);

  // --- Core State ---
  const [customer, setCustomer] = useState('adidas');
  const [yard, setYard] = useState('150'); 
  const [width, setWidth] = useState('60'); 
  const [widthM, setWidthM] = useState(''); 
  const [widthE, setWidthE] = useState(''); 
  
  const [defects, setDefects] = useState<any[]>([]);
  const [defectCounter, setDefectCounter] = useState(0);
  const [masterDefects, setMasterDefects] = useState<any[]>([]);
  
  const [selectedDefectType, setSelectedDefectType] = useState('');

  // --- Toggle Tests ---
  const [testColor, setTestColor] = useState('1'); 
  const [testHandfeel, setTestHandfeel] = useState('1');
  const [testOdor, setTestOdor] = useState('1');

  // --- WebSocket Setup ---
  useEffect(() => {
    const getWsUrl = () => {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
      if (apiBase.startsWith('https://')) {
        const wsBase = apiBase.replace(/^https/, 'wss');
        return wsBase.replace(/\/api\/?$/, '') + '/ws-qc';
      } else if (apiBase.startsWith('http://')) {
        const wsBase = apiBase.replace(/^http/, 'ws');
        return wsBase.replace(/\/api\/?$/, '') + '/ws-qc';
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsPath = apiBase.replace(/\/api\/?$/, '');
        return `${protocol}//${window.location.host}${wsPath}/ws-qc`;
      }
    };

    const client = new Client({
      brokerURL: getWsUrl(),
      onConnect: () => {
        
        client.subscribe('/topic/qc-scans', (message) => {
          const qrCode = message.body;
          if (qrCode) {
            setAlertMsg(`Nhận mã QR từ máy quét: ${qrCode}`);
            handleScanRoll(qrCode);
          }
        });
      },
      onDisconnect: () => {}
    });
    client.activate();
    
    fetch(`${API_BASE}/qc/defects-master`)
      .then(res => res.json())
      .then(data => {
         if (Array.isArray(data)) {
           setMasterDefects(data);
           if (data.length > 0) setSelectedDefectType(data[0].defectCode);
         } else setMasterDefects([]);
      }).catch(console.error);

    return () => { client.deactivate(); };
  }, []);

  // --- Derived State & Calculations ---
  const totalPoints = useMemo(() => defects.reduce((sum, d) => sum + (d.defectPoint || d.pts), 0), [defects]);

  const avgScore = useMemo(() => {
    const y = parseFloat(yard) || 1; 
    const w = parseFloat(width) || 1;
    let avg = 0;
    if (customer === 'adidas') avg = (totalPoints * 100) / y;
    else avg = ((totalPoints * 3600) / y) / w;
    return Math.round(avg * 100) / 100;
  }, [totalPoints, yard, width, customer]);

  const threshold = customer === 'adidas' ? 20 : 28;
  const isFailed = avgScore > threshold;

  // --- API Actions ---
  const simulateHardwareScan = async (codeStr?: any) => {
    // If it's an event or undefined, use default mock
    const codeToSend = (typeof codeStr === 'string' && codeStr.trim()) ? codeStr.trim() : '9b0b8116bfcae18d155dbfe9a5443fb6';
    try {
      const res = await fetch(`${API_BASE}/qc/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: codeToSend })
      });
      if (!res.ok) throw new Error('Backend failed to broadcast (Lỗi ' + res.status + ')');
    } catch (err: any) {
      setErrorMsg('Lỗi phát sóng WebSocket: ' + err.message);
    }
  };

  const handleScanRoll = async (scannedCode?: any) => {
    // If it's an event object (e.g. from onClick), ignore it
    const codeToUse = (typeof scannedCode === 'string' && scannedCode.trim()) ? scannedCode.trim() : '9b0b8116bfcae18d155dbfe9a5443fb6';
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/qc/rolls/${codeToUse}`);
      if (!response.ok) {
         if (response.status === 401 || response.status === 403) throw new Error('Bị chặn bởi Spring Security! Hãy Restart Java BE.');
         throw new Error('Không tìm thấy cuộn vải (Lỗi ' + response.status + ')');
      }
      const data = await response.json();
      const isReinspect = data.defects && data.defects.length > 0;
      setConfirmDialog({ open: true, data, isReinspect });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmInspection = () => {
    if (!confirmDialog) return;
    const { data } = confirmDialog;
    setScannedQrCode(data.qrCode || (typeof manualQr === 'string' && manualQr ? manualQr : '9b0b8116bfcae18d155dbfe9a5443fb6'));
    setRollData(data);
    setDefects(data.defects || []);
    setWidth(data.width?.toString() || '60');
    setYard(data.shipLength?.toString() || '150');
    setAlertMsg('Đã sẵn sàng kiểm cuộn vải!');
    setConfirmDialog(null);
  };

  const handleFinish = async () => {
    if (!scannedQrCode) return setErrorMsg('Vui lòng quét cuộn vải trước khi lưu!');
    const payload = {
      widthB: parseFloat(width) || null, widthM: parseFloat(widthM) || null, widthE: parseFloat(widthE) || null,
      yard: parseFloat(yard) || null, moisture: null, gsm: null, color: parseInt(testColor),
      handfeel: parseInt(testHandfeel), odor: parseInt(testOdor)
    };
    try {
      const res = await fetch(`${API_BASE}/qc/inspections/${scannedQrCode}/measurements`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Lưu thất bại! ' + res.status);
      setAlertMsg(`Lưu dữ liệu thành công! Trạng thái: ${isFailed ? 'FAIL' : 'PASS'}`);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // --- UI Actions ---
  const handleAddDefect = async (pts: number) => {
    if (!scannedQrCode) return setErrorMsg('Vui lòng quét cuộn vải trước khi nhập lỗi!');
    if (!selectedDefectType) return setErrorMsg('Vui lòng chọn loại lỗi!');
    
    const defectObj = masterDefects.find(d => d.defectCode === selectedDefectType);
    const defectName = defectObj ? defectObj.defectName : selectedDefectType;
    const payload = { defectCode: selectedDefectType, defectName, qtyDefect: 1, defectPoint: pts, yrdsDefect: yard };

    try {
      const res = await fetch(`${API_BASE}/qc/inspections/${scannedQrCode}/defects`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Lỗi lưu Data (Server ' + res.status + ')');
      const savedDefect = await res.json();
      setDefects(prev => [savedDefect, ...prev]);
    } catch(e: any) {
      setErrorMsg('Không thể lưu lỗi: ' + e.message);
    }
  };

  const handleClearAll = () => { if (window.confirm('Xoá toàn bộ lỗi (chưa hỗ trợ qua API)?')) setDefects([]); };
  
  const handleRemoveDefect = async (defectId: number) => {
    if (!scannedQrCode || !defectId) return;
    try {
      const res = await fetch(`${API_BASE}/qc/inspections/${scannedQrCode}/defects/${defectId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Lỗi xóa Data (Server ' + res.status + ')');
      setDefects(prev => prev.filter(d => d.id !== defectId));
    } catch(e: any) {
      setErrorMsg('Không thể xóa lỗi: ' + e.message);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      
      <Snackbar open={!!alertMsg} autoHideDuration={3000} onClose={() => setAlertMsg('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="success" variant="filled">{alertMsg}</Alert>
      </Snackbar>
      <Snackbar open={!!errorMsg} autoHideDuration={6000} onClose={() => setErrorMsg('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="error" variant="filled">{errorMsg}</Alert>
      </Snackbar>

      <Dialog open={!!confirmDialog} onClose={() => setConfirmDialog(null)}>
        <DialogTitle sx={{ fontWeight: 800, color: confirmDialog?.isReinspect ? 'warning.main' : 'primary.main' }}>
          {confirmDialog?.isReinspect ? '⚠️ Cuộn vải này đã được kiểm tra!' : 'Bắt đầu kiểm tra cuộn mới'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {confirmDialog?.isReinspect 
              ? 'Cuộn vải này đã có dữ liệu kiểm tra trên hệ thống. Bạn có chắc chắn muốn TÁI KIỂM (Re-inspect) lại cuộn này không? Dữ liệu cũ có thể bị thay đổi.'
              : 'Bạn có chắc chắn muốn bắt đầu kiểm tra cuộn vải này không?'}
          </DialogContentText>
          {confirmDialog?.data && (
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="body2"><strong>Mã màu:</strong> {confirmDialog.data.materialCode} - {confirmDialog.data.color}</Typography>
              <Typography variant="body2"><strong>PO:</strong> {confirmDialog.data.orderNumber}</Typography>
              <Typography variant="body2"><strong>Chiều dài:</strong> {confirmDialog.data.shipLength} Yds</Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setConfirmDialog(null)} color="inherit" sx={{ fontWeight: 600 }}>Hủy bỏ</Button>
          <Button onClick={confirmInspection} variant="contained" color={confirmDialog?.isReinspect ? "warning" : "primary"} sx={{ fontWeight: 700 }} autoFocus>
            {confirmDialog?.isReinspect ? 'Vẫn Tái Kiểm' : 'Đồng ý Kiểm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- TOP HEADER --- */}
      <Card sx={{ p: 2.5, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 3.5 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField 
                size="small" 
                fullWidth 
                placeholder="Nhập/Quét mã QR..." 
                value={manualQr}
                onChange={(e) => setManualQr(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualQr.trim()) {
                    simulateHardwareScan(manualQr.trim());
                  }
                }}
                sx={{ bgcolor: '#fff', borderRadius: 1 }}
              />
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => {
                   if (manualQr.trim()) simulateHardwareScan(manualQr.trim());
                   else simulateHardwareScan(); // default mock
                }} 
                disabled={loading}
                sx={{ minWidth: 48, px: 2, py: 1 }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : <QrCodeScanner />} 
              </Button>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField select fullWidth label="Customer Std" value={customer} onChange={e => setCustomer(e.target.value)}>
              <MenuItem value="adidas">Adidas (Avg ≤ 20)</MenuItem>
              <MenuItem value="nike">4-Point (Avg ≤ 28)</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 7.5 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 4, sm: 4, md: 3 }}><Typography variant="caption" color="text.secondary" display="block">PO #</Typography><Typography variant="body2" fontWeight={600} noWrap title={rollData?.orderNumber}>{rollData?.orderNumber || '--'}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 4, md: 2 }}><Typography variant="caption" color="text.secondary" display="block">Item</Typography><Typography variant="body2" fontWeight={600} noWrap title={rollData?.rollItem}>{rollData?.rollItem || '--'}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 4, md: 2 }}><Typography variant="caption" color="text.secondary" display="block">Color</Typography><Typography variant="body2" fontWeight={600} noWrap title={rollData?.color}>{rollData?.color || '--'}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 4, md: 2 }}><Typography variant="caption" color="text.secondary" display="block">Lot / Batch</Typography><Typography variant="body2" fontWeight={600} noWrap title={rollData?.batchNo}>{rollData?.batchNo || '--'}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 4, md: 1.5 }}><Typography variant="caption" color="text.secondary" display="block">Roll No.</Typography><Typography variant="body2" fontWeight={700} color="primary">{rollData?.rollNo || '--'}</Typography></Grid>
              <Grid size={{ xs: 4, sm: 4, md: 1.5 }}><Typography variant="caption" color="text.secondary" display="block">Supplier</Typography><Typography variant="body2" fontWeight={600} noWrap title={rollData?.supCode}>{rollData?.supCode || '--'}</Typography></Grid>
            </Grid>
          </Grid>
        </Grid>
      </Card>

      {/* --- MAIN CONTENT --- */}
      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'row', gap: 3, flex: 1, minHeight: 0 }}>
        {!scannedQrCode && (
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, bgcolor: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)', borderRadius: 2 }}>
            <Paper elevation={3} sx={{ px: 6, py: 5, textAlign: 'center', animation: 'fadein 0.5s' }}>
              <QrCodeScanner color="primary" sx={{ fontSize: 56, mb: 2 }} />
              <Typography variant="h5" fontWeight={600} gutterBottom>Vui lòng quét Mã cuộn vải</Typography>
              <Typography variant="body2" color="text.secondary">Sử dụng máy quét hoặc nhấn nút "Scan Roll" để bắt đầu</Typography>
            </Paper>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3, flex: 1, width: '100%', opacity: scannedQrCode ? 1 : 0.5, pointerEvents: scannedQrCode ? 'auto' : 'none' }}>
          
          {/* LEFT COLUMN: Data Entry */}
          <Box sx={{ width: '38%', display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
            <Card sx={{ flex: 1, overflowY: 'auto' }}>
              <Accordion defaultExpanded disableGutters elevation={0} sx={{ borderBottom: `1px solid ${theme.palette.divider}`, '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMore />}><Straighten color="action" sx={{ mr: 1.5 }} /><Typography fontWeight={600}>Dimensions & Weight</Typography></AccordionSummary>
                <AccordionDetails sx={{ pt: 2, pb: 3, px: 3 }}>
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 4 }}><TextField label="Width Begin (in)" type="number" fullWidth value={width} onChange={e => setWidth(e.target.value)} /></Grid>
                    <Grid size={{ xs: 4 }}><TextField label="Width Mid" type="number" fullWidth value={widthM} onChange={e => setWidthM(e.target.value)} /></Grid>
                    <Grid size={{ xs: 4 }}><TextField label="Width End" type="number" fullWidth value={widthE} onChange={e => setWidthE(e.target.value)} /></Grid>
                    <Grid size={{ xs: 6 }}><TextField label="Yard (Std)" fullWidth value={rollData?.shipLength || '150'} disabled /></Grid>
                    <Grid size={{ xs: 6 }}><TextField label="Actual Yard" type="number" fullWidth value={yard} onChange={e => setYard(e.target.value)} InputProps={{ sx: { fontWeight: 600, color: 'primary.main' } }} /></Grid>
                    <Grid size={{ xs: 6 }}><TextField label="Net Wgt (NW)" fullWidth value={rollData?.nw || ''} disabled /></Grid>
                    <Grid size={{ xs: 6 }}><TextField label="Gross Wgt (GW)" fullWidth value={rollData?.gw || ''} disabled /></Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              <Accordion defaultExpanded disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMore />} sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}><Science color="action" sx={{ mr: 1.5 }} /><Typography fontWeight={600}>Density & Physical Tests</Typography></AccordionSummary>
                <AccordionDetails sx={{ pt: 3, pb: 3, px: 3 }}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 6 }}><TextField label="Moisture (Std)" fullWidth value={rollData?.itemMoisture || ''} disabled /></Grid>
                    <Grid size={{ xs: 6 }}><TextField label="Moisture Actual" fullWidth /></Grid>
                    
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'background.default', borderRadius: 2 }}>
                        <Typography variant="body2" fontWeight={600}>Color Check</Typography>
                        <ToggleButtonGroup size="small" value={testColor} exclusive onChange={(_, v) => v && setTestColor(v)}>
                          <ToggleButton value="1" color="success" sx={{ px: 3 }}>Pass</ToggleButton>
                          <ToggleButton value="0" color="error" sx={{ px: 3 }}>Fail</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'background.default', borderRadius: 2, mt: -1 }}>
                        <Typography variant="body2" fontWeight={600}>Handfeel Check</Typography>
                        <ToggleButtonGroup size="small" value={testHandfeel} exclusive onChange={(_, v) => v && setTestHandfeel(v)}>
                          <ToggleButton value="1" color="success" sx={{ px: 3 }}>Pass</ToggleButton>
                          <ToggleButton value="0" color="error" sx={{ px: 3 }}>Fail</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'background.default', borderRadius: 2, mt: -1 }}>
                        <Typography variant="body2" fontWeight={600}>Odor Check</Typography>
                        <ToggleButtonGroup size="small" value={testOdor} exclusive onChange={(_, v) => v && setTestOdor(v)}>
                          <ToggleButton value="1" color="success" sx={{ px: 3 }}>Pass</ToggleButton>
                          <ToggleButton value="0" color="error" sx={{ px: 3 }}>Fail</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Card>
          </Box>

          {/* RIGHT COLUMN: Defect Entry & Summary */}
          <Box sx={{ width: '62%', height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <CardHeader 
                title="Visual Defect Inspection" 
                titleTypographyProps={{ variant: 'h6', fontWeight: 600 }} 
                avatar={<Assessment color="primary" />} 
                sx={{ pb: 2, borderBottom: `1px solid ${theme.palette.divider}` }} 
                action={
                  <Box sx={{ textAlign: 'right', px: 2, py: 0.5, bgcolor: isFailed ? 'error.main' : 'success.main', color: 'white', borderRadius: 2 }}>
                    <Typography variant="caption" fontWeight={600} display="block">AVG SCORE</Typography>
                    <Typography variant="h5" fontWeight={700}>{avgScore}</Typography>
                  </Box>
                }
              />
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3, gap: 3 }}>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="outlined" size="large" startIcon={<PhotoCamera />} sx={{ flex: 1, fontWeight: 600 }}>
                    Capture Defect Image
                  </Button>
                  <TextField select fullWidth label="Select Defect Type" value={selectedDefectType} onChange={e => setSelectedDefectType(e.target.value)} sx={{ flex: 2 }}>
                    {masterDefects.length === 0 ? <MenuItem value="">Loading...</MenuItem> : masterDefects.map(d => (
                      <MenuItem key={d.defectCode} value={d.defectCode}>{d.defectName}</MenuItem>
                    ))}
                  </TextField>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>ASSIGN PENALTY POINTS</Typography>
                  <Box sx={{ display: 'flex', gap: 2, height: '64px' }}>
                    {[{ pt: 1, color: 'success' }, { pt: 2, color: 'warning' }, { pt: 3, color: 'error' }, { pt: 4, color: 'error' }].map(({ pt, color }) => (
                      <Button key={pt} variant="contained" color={color as any} onClick={() => handleAddDefect(pt)} fullWidth 
                        sx={{ fontSize: '1.75rem', fontWeight: 700 }}>
                        +{pt}
                      </Button>
                    ))}
                  </Box>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" color="text.secondary">DEFECT LOG</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ bgcolor: 'background.default', px: 2, py: 0.5, borderRadius: 1 }}>
                      Total Points: {totalPoints}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, p: 1 }}>
                    {defects.length === 0 && (
                       <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4, fontStyle: 'italic' }}>Chưa ghi nhận lỗi nào.</Typography>
                    )}
                    {defects.map((d, index) => (
                      <Paper key={index} elevation={1} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography variant="body2" fontWeight={500}>{d.defectName || d.type}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="body1" color="error.main" fontWeight={600}>+{d.defectPoint || d.pts}</Typography>
                          <Button color="error" size="small" sx={{ minWidth: 0, p: 0.5 }} onClick={() => handleRemoveDefect(d.id)}>
                            <Cancel fontSize="small" />
                          </Button>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" color="error" size="large" onClick={handleClearAll} sx={{ flex: 1, fontWeight: 600 }}>
                Clear All
              </Button>
              <Button variant="contained" color={isFailed ? 'error' : 'success'} size="large" onClick={handleFinish} disabled={!scannedQrCode}
                sx={{ flex: 2, fontWeight: 700, fontSize: '1.1rem' }}>
                Save / Finish Roll
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default QCInspectionMockupPage;
