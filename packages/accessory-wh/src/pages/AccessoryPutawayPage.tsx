import React, { useState } from 'react';
import { Box, TextField, Button, Paper, Typography, CircularProgress } from '@mui/material';
import { accessoryApi } from '../services/accessoryApi';

export default function AccessoryPutawayPage() {
  const [barcode, setBarcode] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePutaway = async () => {
    if (!barcode || !location) return alert('Nhập đủ Barcode và Location');
    setLoading(true);
    try {
      await accessoryApi.putaway(barcode, location);
      alert('Cất kệ thành công!');
      setBarcode('');
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ mb: 3 }}>Cất Kệ Phụ Liệu</Typography>
        
        <TextField 
          fullWidth label="Quét Barcode Phụ Liệu" size="large" sx={{ mb: 3 }}
          value={barcode} onChange={e => setBarcode(e.target.value)}
          autoFocus
        />
        
        <TextField 
          fullWidth label="Quét Mã Vị Trí (Kệ)" size="large" sx={{ mb: 4 }}
          value={location} onChange={e => setLocation(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handlePutaway()}
        />

        <Button 
          variant="contained" 
          size="large" 
          fullWidth 
          onClick={handlePutaway}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Xác Nhận Cất Kệ'}
        </Button>
      </Paper>
    </Box>
  );
}
