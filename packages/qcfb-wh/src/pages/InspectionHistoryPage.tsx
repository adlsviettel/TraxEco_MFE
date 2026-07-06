import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, TextField, Checkbox, FormControlLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { Search as SearchIcon, Save as SaveIcon } from '@mui/icons-material';
import { qcfbInspectionService } from '../services/qcfbInspectionService';

export default function InspectionHistoryPage() {
  const { t } = useTranslation();
  
  const [fromDate, setFromDate] = useState<Date | null>(new Date());
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [showUninspected, setShowUninspected] = useState(false);
  
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  
  // Location
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedShelf, setSelectedShelf] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedSeq, setSelectedSeq] = useState('');

  // Defect Modal
  const [defectModalOpen, setDefectModalOpen] = useState(false);
  const [defectRows, setDefectRows] = useState<any[]>([]);
  const [activeRoll, setActiveRoll] = useState<any>(null);

  useEffect(() => {
    // Mock get locations
    setLocations([
      { ShNm: 'A1', ShLevl: '1', ShSeq: '01' },
      { ShNm: 'A1', ShLevl: '1', ShSeq: '02' },
      { ShNm: 'B2', ShLevl: '3', ShSeq: '10' }
    ]);
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    try {
      // Mock API for now
      setTimeout(() => {
        setRows([
          { id: 'QR123', QrCode: 'QR123', RollNo: 'R001', Item: 'Fabric A', Color: 'Red', Width: 60, Yard: 100, Status: 'P', InsptDate: '2026-05-06', RollGroup: 'A1-1-01' },
          { id: 'QR124', QrCode: 'QR124', RollNo: 'R002', Item: 'Fabric B', Color: 'Blue', Width: 60, Yard: 95, Status: 'F', InsptDate: '2026-05-06', RollGroup: 'A1-1-02' },
          { id: 'QR125', QrCode: 'QR125', RollNo: 'R003', Item: 'Fabric C', Color: 'Green', Width: 62, Yard: 105, Status: '', InsptDate: '', RollGroup: '' }
        ]);
        setLoading(false);
      }, 500);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!selectedShelf || !selectedLevel || !selectedSeq || selectedRowIds.length === 0) return;
    const loc = `${selectedShelf}-${selectedLevel}-${selectedSeq}`;

    // await qcfbInspectionService.updateLocations(selectedRowIds, loc);
    // Reload
    handleSearch();
  };

  const openDefectModal = async (row: any) => {
    setActiveRoll(row);
    // Mock get defects
    setDefectRows([
      { DefectCode: 'DF01', DefectName: 'Hole', DefectPoint: 4, QtyDefect: 1 }
    ]);
    setDefectModalOpen(true);
  };

  const columns: GridColDef[] = [
    { field: 'QrCode', headerName: 'QR Code', flex: 1.5 },
    { field: 'RollNo', headerName: 'Roll No', flex: 1 },
    { field: 'Item', headerName: 'Item', flex: 1.5 },
    { field: 'Color', headerName: 'Color', flex: 1 },
    { field: 'Width', headerName: 'Width', flex: 0.8 },
    { field: 'Yard', headerName: 'Yard', flex: 0.8 },
    { field: 'InsptDate', headerName: 'Inspt Date', flex: 1.2 },
    { field: 'RollGroup', headerName: 'Location', flex: 1 },
    { 
      field: 'Status', 
      headerName: 'Status', 
      flex: 0.8,
      renderCell: (params: GridRenderCellParams) => {
        if (!params.value) return null;
        const isPass = params.value === 'P';
        return (
          <Box sx={{ 
            bgcolor: isPass ? 'success.main' : 'error.main', 
            color: 'white', 
            px: 1, 
            py: 0.5, 
            borderRadius: 1,
            fontWeight: 'bold',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }} onClick={() => openDefectModal(params.row)}>
            {isPass ? 'PASS' : 'FAIL'}
          </Box>
        );
      }
    }
  ];

  const filteredRows = showUninspected ? rows.filter(r => !r.Status) : rows;

  // Unique lists for location dropdowns
  const shelfList = Array.from(new Set(locations.map(l => l.ShNm)));
  const levelList = Array.from(new Set(locations.filter(l => l.ShNm === selectedShelf).map(l => l.ShLevl)));
  const seqList = Array.from(new Set(locations.filter(l => l.ShNm === selectedShelf && l.ShLevl === selectedLevel).map(l => l.ShSeq)));

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
      <Box sx={{ 
        height: '100%', display: 'flex', flexDirection: 'column', 
        p: { xs: 1, sm: 2 },
        color: '#1e293b'
      }}>
        <Box sx={{ 
          display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4, p: 2.5, 
          bgcolor: '#ffffff', 
          borderRadius: 4, 
          border: '1px solid rgba(0,0,0,0.04)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
          alignItems: 'center'
        }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, pb: 1.5, borderBottom: '1px solid #f1f5f9', width: '100%' }}>
          <Box sx={{ width: 4, height: 20, bgcolor: '#10b981', borderRadius: 1, mr: 1.5 }} />
          <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a' }}>
            {t('qcfb.nav.InspectionHistory', 'Inspection History')}
          </Typography>
        </Box>
        </Box>
        
        {/* Filters */}
        <Card elevation={0} sx={{ 
          mb: 4, 
          borderRadius: 4, 
          bgcolor: '#ffffff',
          border: '1px solid rgba(0,0,0,0.04)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}>
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Grid container spacing={3} alignItems="center">
              <Grid size={{ xs: 12, md: 3 }}>
                <DatePicker
                  label={t('qcfb.history.dateFrom', 'From Date')}
                  value={fromDate}
                  onChange={(val) => setFromDate(val)}
                  slotProps={{ textField: { size: 'medium', fullWidth: true, sx: { 
                    '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 3 },
                    '& .MuiOutlinedInput-notchedOutline': { border: '1px solid transparent' },
                    '& .MuiInputLabel-root': { color: '#64748b' }
                  } } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <DatePicker
                  label={t('qcfb.history.dateTo', 'To Date')}
                  value={toDate}
                  onChange={(val) => setToDate(val)}
                  slotProps={{ textField: { size: 'medium', fullWidth: true, sx: { 
                    '& .MuiOutlinedInput-root': { bgcolor: '#f8fafc', borderRadius: 3 },
                    '& .MuiOutlinedInput-notchedOutline': { border: '1px solid transparent' },
                    '& .MuiInputLabel-root': { color: '#64748b' }
                  } } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControlLabel
                  control={<Checkbox checked={showUninspected} onChange={e => setShowUninspected(e.target.checked)} sx={{ color: '#10b981', '&.Mui-checked': { color: '#059669' } }} />}
                  label={<Typography fontWeight={600} color="#475569">{t('qcfb.history.showUninspected', 'Show Uninspected Only')}</Typography>}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Button 
                  variant="contained" 
                  fullWidth 
                  startIcon={<SearchIcon />} 
                  onClick={handleSearch}
                  sx={{ 
                    borderRadius: 3, py: 1.5, fontWeight: 800, fontSize: '1rem',
                    bgcolor: '#10b981',
                    boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                    '&:hover': { bgcolor: '#059669', boxShadow: '0 6px 20px rgba(16,185,129,0.4)', transform: 'translateY(-1px)' },
                    transition: 'all 0.2s'
                  }}
                >
                  {t('qcfb.history.search', 'SEARCH')}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Location Update */}
        <Card elevation={0} sx={{ 
          mb: 4, 
          borderRadius: 4, 
          bgcolor: '#ffffff',
          border: '1px solid rgba(0,0,0,0.04)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.04)'
        }}>
          <CardContent sx={{ py: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Grid container spacing={2.5} alignItems="center">
              <Grid size={{ xs: 12, md: 2 }}>
                <Typography variant="body2" fontWeight={800} color="#475569" sx={{ letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  {t('qcfb.history.updateLocation', 'Update Location')}:
                </Typography>
              </Grid>
              <Grid size={{ xs: 4, md: 2 }}>
                <Select size="small" fullWidth displayEmpty value={selectedShelf} onChange={e => { setSelectedShelf(e.target.value); setSelectedLevel(''); setSelectedSeq(''); }} sx={{ bgcolor: '#f1f5f9', borderRadius: 2 }}>
                  <MenuItem value="" disabled>Shelf</MenuItem>
                  {shelfList.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </Grid>
              <Grid size={{ xs: 4, md: 2 }}>
                <Select size="small" fullWidth displayEmpty value={selectedLevel} onChange={e => { setSelectedLevel(e.target.value); setSelectedSeq(''); }} disabled={!selectedShelf} sx={{ bgcolor: '#f1f5f9', borderRadius: 2 }}>
                  <MenuItem value="" disabled>Level</MenuItem>
                  {levelList.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </Grid>
              <Grid size={{ xs: 4, md: 2 }}>
                <Select size="small" fullWidth displayEmpty value={selectedSeq} onChange={e => setSelectedSeq(e.target.value)} disabled={!selectedLevel} sx={{ bgcolor: '#f1f5f9', borderRadius: 2 }}>
                  <MenuItem value="" disabled>Seq</MenuItem>
                  {seqList.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Button 
                  variant="contained" 
                  fullWidth 
                  startIcon={<SaveIcon />}
                  disabled={!selectedShelf || !selectedLevel || !selectedSeq || selectedRowIds.length === 0}
                  onClick={handleUpdateLocation}
                  sx={{ 
                    borderRadius: 3, py: 1.2, fontWeight: 700, letterSpacing: '0.5px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                    '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', transform: 'translateY(-2px)' },
                    transition: 'all 0.2s',
                    '&.Mui-disabled': { background: '#e2e8f0', color: '#94a3b8' }
                  }}
                >
                  {t('qcfb.history.updateLocation', 'UPDATE')} ({selectedRowIds.length})
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* DataGrid */}
        <Box sx={{ 
          width: '100%',
          height: 600, 
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#ffffff', 
          borderRadius: 4, 
          border: '1px solid rgba(0,0,0,0.05)',
          boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          p: 1
        }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            loading={loading}
            checkboxSelection
            disableRowSelectionOnClick
            onRowSelectionModelChange={(newSel) => setSelectedRowIds(newSel as string[])}
            density="compact"
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[5, 10, 20]}
            sx={{ 
              border: 0,
              '--header-bg': '#f8fafc',
              '--DataGrid-t-header-background-base': '#f8fafc',
              '--DataGrid-containerBackground': '#f8fafc',
              '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-filler, & .MuiDataGrid-scrollbarFiller, & .MuiDataGrid-columnHeader--filled': { 
                backgroundColor: '#f8fafc !important',
              },
              '& .MuiDataGrid-columnHeaders': { color: '#475569', fontWeight: 700 },
              '& .MuiDataGrid-row:hover': { bgcolor: '#f1f5f9' },
            }}
          />
        </Box>

        {/* Defect Modal */}
        <Dialog open={defectModalOpen} onClose={() => setDefectModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('qcfb.history.defectDetail', 'Defect Detail')} - {activeRoll?.RollNo}</DialogTitle>
          <DialogContent dividers>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell align="center">Point</TableCell>
                  <TableCell align="center">Qty</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {defectRows.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell>{d.DefectCode}</TableCell>
                    <TableCell>{d.DefectName}</TableCell>
                    <TableCell align="center">{d.DefectPoint}</TableCell>
                    <TableCell align="center">{d.QtyDefect}</TableCell>
                  </TableRow>
                ))}
                {defectRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">No defects</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDefectModalOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

      </Box>
    </LocalizationProvider>
  );
}
