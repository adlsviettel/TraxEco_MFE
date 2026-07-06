import React, { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Alert } from '@mui/material';
import { QrCodeScanner, Send } from '@mui/icons-material';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

const ScannerSimulatorPage = () => {
  const [qrCode, setQrCode] = useState('9b0b8116bfcae18d155dbfe9a5443fb6');
  const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);

  const handleScan = async () => {
    try {
      const res = await fetch(`${API_BASE}/qc/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode })
      });
      if (res.ok) {
        setStatus({ type: 'success', msg: `Đã bắn mã [${qrCode}] thành công! Hãy sang tab màn hình QC để xem kết quả.` });
      } else {
        setStatus({ type: 'error', msg: 'Lỗi khi gửi lên Backend: ' + res.status });
      }
    } catch (err: any) {
      setStatus({ type: 'error', msg: 'Lỗi mạng: Không thể kết nối tới Backend. ' + err.message });
    }
  };

  return (
    <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
      <Paper sx={{ p: 4, maxWidth: 500, width: '100%', textAlign: 'center' }}>
        <QrCodeScanner sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Giả Lập Máy Quét (Scanner)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Mô phỏng thao tác bắn mã vạch. Nó sẽ gọi API POST lên Backend để kích hoạt WebSocket.
        </Typography>

        <TextField 
          fullWidth 
          label="Mã QR / Barcode" 
          value={qrCode} 
          onChange={e => setQrCode(e.target.value)} 
          sx={{ mb: 3 }}
        />
        
        <Button 
          variant="contained" 
          size="large" 
          fullWidth 
          startIcon={<Send />}
          onClick={handleScan}
          sx={{ height: 56, fontSize: '1.1rem', fontWeight: 700 }}
        >
          BẮN MÃ LÊN HỆ THỐNG
        </Button>

        {status && (
          <Alert severity={status.type} sx={{ mt: 3, textAlign: 'left', fontWeight: 600 }}>
            {status.msg}
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default ScannerSimulatorPage;
