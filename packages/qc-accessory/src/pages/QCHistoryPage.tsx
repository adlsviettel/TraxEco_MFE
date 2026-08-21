import React, { useState, useCallback, useEffect } from 'react';
import { 
  Box, Typography, Button, TextField, Dialog, DialogTitle, 
  DialogContent, DialogActions, Chip, IconButton, CircularProgress, Paper, Stack, useTheme
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { useToast } from '@traxeco/shared';
import { qcAccessoryApi } from '../services/qcAccessoryApi';
import { format } from 'date-fns';
import type { HistoryRecord, DefectRecord } from '../types';

export default function QCHistoryPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [fromDate, setFromDate] = useState<Date | null>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<HistoryRecord[]>([]);
  
  // Defect dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>('');
  const [defectLoading, setDefectLoading] = useState(false);
  const [defects, setDefects] = useState<DefectRecord[]>([]);
  
  // Image dialog state
  const [imageOpen, setImageOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState('');

  const { showToast } = useToast();

  const handleSearch = async () => {
    if (!fromDate || !toDate) {
      showToast('Vui lòng chọn Từ Ngày và Đến Ngày', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      const fromStr = format(fromDate, 'yyyy-MM-dd');
      const toStr = format(toDate, 'yyyy-MM-dd');
      const data = await qcAccessoryApi.searchHistory(fromStr, toStr);
      setRows(data || []);
      if (!data || data.length === 0) {
        showToast('Không có dữ liệu lịch sử', 'info');
      }
    } catch (err) {
      showToast('Lỗi khi tải lịch sử kiểm tra', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (params: any) => {
    const historyId = params.row.ID;
    setSelectedHistoryId(historyId);
    setDialogOpen(true);
    setDefectLoading(true);
    
    try {
      const data = await qcAccessoryApi.getDefectDetail(historyId);
      setDefects(data || []);
    } catch (err) {
      showToast('Lỗi khi tải chi tiết lỗi', 'error');
    } finally {
      setDefectLoading(false);
    }
  };

  const renderStatusChip = (params: GridRenderCellParams) => {
    const val = params.value;
    if (val === 'P') return <Chip label="PASS" color="success" size="small" sx={{ fontWeight: 800 }} />;
    if (val === 'F') return <Chip label="FAIL" color="error" size="small" sx={{ fontWeight: 800 }} />;
    if (val === 'H') return <Chip label="HOLD" color="warning" size="small" sx={{ fontWeight: 800 }} />;
    return <Chip label={val || 'N/A'} size="small" variant="outlined" />;
  };

  const columns: GridColDef[] = [
    { field: 'ID', headerName: 'ID', width: 90 },
    { field: 'InvoiceNo', headerName: 'Invoice', width: 130 },
    { field: 'PONo', headerName: 'PO Number', width: 130 },
    { field: 'Item', headerName: 'Item Code', width: 140 },
    { field: 'Color', headerName: 'Color', width: 110 },
    { field: 'Result', headerName: 'Result QC', width: 110, renderCell: renderStatusChip },
    { field: 'Approval', headerName: 'Approval', width: 110, renderCell: renderStatusChip },
    { field: 'SampleSize', headerName: 'Sample', width: 90 },
    { field: 'DefectQty', headerName: 'Defects', width: 90 },
    { field: 'Accept', headerName: 'Ac', width: 80 },
    { field: 'Reject', headerName: 'Re', width: 80 },
    { field: 'Metal', headerName: 'Metal', width: 90 },
    { field: 'CreatedBy', headerName: 'Inspector', width: 120 },
    { field: 'CreatedDate', headerName: 'Date', width: 140 },
    { field: 'Remark', headerName: 'Remark', width: 180 },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: { xs: 1.5, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
        
        {/* Search Header */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <DatePicker
              label="Từ Ngày"
              value={fromDate}
              onChange={(newVal) => setFromDate(newVal)}
              slotProps={{ textField: { size: 'small' } }}
            />
            <DatePicker
              label="Đến Ngày"
              value={toDate}
              onChange={(newVal) => setToDate(newVal)}
              slotProps={{ textField: { size: 'small' } }}
            />
            <Button
              variant="contained"
              disableElevation
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
              onClick={handleSearch}
              disabled={loading}
              sx={{ borderRadius: 2.5, px: 3, height: 40, fontWeight: 700 }}
            >
              Tìm Lịch Sử
            </Button>
          </Stack>
        </Paper>

        {/* DataGrid Table */}
        <Paper elevation={0} sx={{ flexGrow: 1, borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.ID}
            loading={loading}
            onRowClick={handleRowClick}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            sx={{ border: 0 }}
          />
        </Paper>

        {/* Defect Detail Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800 }}>
            Chi Tiết Defects Lô Hàng: #{selectedHistoryId}
            <IconButton onClick={() => setDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {defectLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : defects.length === 0 ? (
              <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                Không tìm thấy lỗi nào ghi nhận cho lô hàng này.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {defects.map((def, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={800} color="error.main">
                        {def.Code} - {def.Name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Số lượng lỗi: <strong>{def.Qty}</strong>
                      </Typography>
                    </Box>
                    {def.Image && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setCurrentImage(def.Image);
                          setImageOpen(true);
                        }}
                      >
                        Xem Ảnh Chụp
                      </Button>
                    )}
                  </Paper>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Đóng</Button>
          </DialogActions>
        </Dialog>

        {/* Fullscreen Image Preview Dialog */}
        <Dialog open={imageOpen} onClose={() => setImageOpen(false)} maxWidth="lg">
          <DialogContent sx={{ position: 'relative', p: 1 }}>
            <IconButton
              onClick={() => setImageOpen(false)}
              sx={{ position: 'absolute', right: 8, top: 8, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff' }}
            >
              <CloseIcon />
            </IconButton>
            <img
              src={currentImage}
              alt="Defect Preview"
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          </DialogContent>
        </Dialog>

      </Box>
    </LocalizationProvider>
  );
}
