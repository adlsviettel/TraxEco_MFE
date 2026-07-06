import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Typography, Paper, TextField, Button, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, InputAdornment, IconButton, CircularProgress, Tabs, Tab,
  Snackbar, Alert, Autocomplete
} from '@mui/material';
import {
  Search as SearchIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Inventory as InventoryIcon,
  CheckCircle as CheckCircleIcon,
  PendingActions as PendingIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { deliveryScanService } from '../services/deliveryScanService';

export default function PoPackingStatusPage() {
  const { t } = useTranslation();
  const [poNumber, setPoNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [packingData, setPackingData] = useState<any[]>([]);
  const [cratesData, setCratesData] = useState<any[]>([]);
  const [cartonsData, setCartonsData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ target: 0, packed: 0, remaining: 0, percentage: 0 });
  const [tabIndex, setTabIndex] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' as 'success' | 'error' | 'info' });
  
  const [poOptions, setPoOptions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = async (event: any, newInputValue: string) => {
    setInputValue(newInputValue);
    if (newInputValue.length >= 2) {
      try {
        const data = await deliveryScanService.searchPoNumbers(newInputValue);
        setPoOptions(data);
      } catch (error) {
        console.error('Error fetching PO suggestions:', error);
      }
    } else {
      setPoOptions([]);
    }
  };

  const handleSyncCrates = async () => {
    if (!poNumber) return;
    setSyncing(true);
    try {
      const res = await deliveryScanService.syncPoPlasticCrates(poNumber);
      setSnackbar({ open: true, message: res.message || 'Synced successfully', type: 'success' });
      await executeSearch(poNumber);
    } catch (error: any) {
      console.error('Error syncing crates:', error);
      setSnackbar({ open: true, message: error.message || 'Error syncing', type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleSearchClick = () => {
    if (poNumber) {
      executeSearch(poNumber);
    }
  };

  const executeSearch = async (searchPo: string) => {
    if (!searchPo) return;
    setLoading(true);
    try {
      const [data, crates, cartons] = await Promise.all([
        deliveryScanService.getPoPackingStatus(searchPo),
        deliveryScanService.getPoPlasticCrates(searchPo),
        deliveryScanService.getPoCartonDetails(searchPo)
      ]);
      setPackingData(data);
      setCratesData(crates);
      setCartonsData(cartons);
      
      let target = 0;
      let packed = 0;
      if (Array.isArray(data)) data.forEach((row: any) => {
        target += (row.qty || 0);
        packed += (row.sumOutput || 0);
      });
      const remaining = target - packed;
      const percentage = target > 0 ? Math.round((packed / target) * 100) : 0;
      
      setSummary({ target, packed, remaining, percentage });
      setSearched(true);
    } catch (error: any) {
      console.error('Error fetching packing status:', error);
      setSnackbar({ open: true, message: error.message || 'Error fetching data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && poNumber) {
      executeSearch(poNumber);
    }
  };

  return (
    <Box sx={{ 
      p: { xs: 2, md: 3 }, 
      height: '100%', 
      overflowY: 'auto',
      display: 'flex', 
      flexDirection: 'column', 
      gap: 3, 
      alignItems: searched ? 'stretch' : 'center', 
      justifyContent: searched ? 'flex-start' : 'center', 
      bgcolor: '#f8fafc' 
    }}>
      
      {/* INITIAL STATE: Big Centered Search */}
      {!searched && (
        <Box sx={{ width: '100%', maxWidth: 700, animation: 'fadeIn 0.5s ease-out' }}>
          <Paper elevation={3} sx={{ p: 5, borderRadius: 4, textAlign: 'center', borderTop: '6px solid #3ba55c' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Box sx={{ bgcolor: '#dcfce7', p: 2, borderRadius: '50%', display: 'flex' }}>
                <InventoryIcon sx={{ color: '#16a34a', fontSize: 48 }} />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b', mb: 1.5 }}>
              Check PO Packing Status
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', mb: 4, px: 2 }}>
              Scan or enter a PO Number to instantly verify the packed quantities, remaining balance, and detailed carton tracking.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Autocomplete
                freeSolo
                fullWidth
                options={poOptions}
                inputValue={inputValue}
                onInputChange={handleInputChange}
                value={poNumber}
                onChange={(event, newValue) => {
                  const val = newValue || '';
                  setPoNumber(val);
                  if (val) {
                    executeSearch(val);
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    placeholder="Enter PO Number (e.g. SOGS2402175)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && inputValue && !poOptions.includes(inputValue)) {
                        setPoNumber(inputValue);
                        executeSearch(inputValue);
                      }
                    }}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 3, bgcolor: '#f8fafc', fontSize: '1.1rem', py: 0.5, '& fieldset': { borderColor: '#e2e8f0' }, '&:hover fieldset': { borderColor: '#3ba55c' }, '&.Mui-focused fieldset': { borderColor: '#3ba55c' } }
                    }}
                  />
                )}
              />
              <Button
                variant="contained"
                onClick={handleSearchClick}
                disabled={!poNumber || loading}
                sx={{
                  borderRadius: 3, px: 6, fontWeight: 700, fontSize: '1.1rem',
                  bgcolor: '#3ba55c', '&:hover': { bgcolor: '#22c55e' },
                  boxShadow: '0 8px 16px -4px rgba(59, 165, 92, 0.4)'
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Search'}
              </Button>
            </Box>
            
            {!loading && (
              <Box sx={{ mt: 5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Frequently Tracked
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap', mt: 1.5 }}>
                  {['0902496356', 'SOGS2402175', 'SOAD2602444'].map((po, idx) => (
                    <Chip 
                      key={idx}
                      icon={<PendingIcon fontSize="small" sx={{ color: '#16a34a' }}/>} 
                      label={po} 
                      onClick={() => { setPoNumber(po); executeSearch(po); }}
                      sx={{ 
                        bgcolor: '#fff', border: '1px solid #e2e8f0', fontWeight: 600, color: '#334155', borderRadius: 2,
                        '&:hover': { borderColor: '#3ba55c', bgcolor: '#f0fdf4' } 
                      }} 
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        </Box>
      )}

      {/* SEARCHED STATE: Dashboard Layout */}
      {searched && (
        <>
          {/* Header Dashboard Row */}
          <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' }, animation: 'fadeIn 0.4s ease-out' }}>
            
            {/* Search Box Panel */}
            <Paper elevation={1} sx={{ p: 3, borderRadius: 4, flex: '0 0 350px', borderTop: '5px solid #3ba55c', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <InventoryIcon sx={{ color: '#16a34a' }} />
                PO Packing Status
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', mb: 2, display: 'block' }}>Update tracking for another PO</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Autocomplete
                  freeSolo
                  fullWidth
                  size="small"
                  options={poOptions}
                  inputValue={inputValue}
                  onInputChange={handleInputChange}
                  value={poNumber}
                  onChange={(event, newValue) => {
                    const val = newValue || '';
                    setPoNumber(val);
                    if (val) {
                      executeSearch(val);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      placeholder="PO Number..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && inputValue && !poOptions.includes(inputValue)) {
                          setPoNumber(inputValue);
                          executeSearch(inputValue);
                        }
                      }}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        sx: { borderRadius: 2, bgcolor: '#f8fafc', '&.Mui-focused fieldset': { borderColor: '#3ba55c' } }
                      }}
                    />
                  )}
                />
                <Button
                  variant="contained"
                  onClick={handleSearchClick}
                  disabled={!poNumber || loading}
                  sx={{ borderRadius: 2, minWidth: 90, fontWeight: 700, bgcolor: '#3ba55c', '&:hover': { bgcolor: '#22c55e' } }}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : 'Search'}
                </Button>
              </Box>
            </Paper>

            {/* Summary Cards */}
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
              <Card elevation={1} sx={{ flex: 1, borderRadius: 4, bgcolor: '#fff', border: '1px solid #e0f2fe' }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Target Quantity</Typography>
                  <Typography variant="h3" sx={{ color: '#0284c7', fontWeight: 800, mt: 1 }}>{summary.target.toLocaleString()}</Typography>
                </CardContent>
              </Card>
              
              <Card elevation={1} sx={{ flex: 1, borderRadius: 4, bgcolor: '#fff', border: '1px solid #dcfce7' }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Packed Quantity</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 1 }}>
                    <Typography variant="h3" sx={{ color: '#16a34a', fontWeight: 800 }}>{summary.packed.toLocaleString()}</Typography>
                    <Typography variant="subtitle1" sx={{ color: '#22c55e', fontWeight: 700, mb: 0.5 }}>({summary.percentage}%)</Typography>
                  </Box>
                </CardContent>
              </Card>

              <Card elevation={1} sx={{ flex: 1, borderRadius: 4, bgcolor: '#fff', border: '1px solid #fef3c7' }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Remaining</Typography>
                  <Typography variant="h3" sx={{ color: summary.remaining > 0 ? '#ea580c' : '#16a34a', fontWeight: 800, mt: 1 }}>{summary.remaining.toLocaleString()}</Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Details Table */}
          <Paper elevation={2} sx={{ flexGrow: 1, minHeight: 500, borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#334155' }}>
                Packing History for {poNumber}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
                  onClick={handleSyncCrates}
                  disabled={syncing || !poNumber}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  Sync Barcodes
                </Button>
                <Chip 
                  label={summary.target > 0 && summary.remaining <= 0 ? "Completed" : summary.packed > 0 ? "In Progress" : "Not Started"} 
                  color={summary.target > 0 && summary.remaining <= 0 ? "success" : summary.packed > 0 ? "warning" : "default"} 
                  size="small" 
                  sx={{ fontWeight: 600 }} 
                />
              </Box>
            </Box>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fff' }}>
              <Tabs 
                value={tabIndex} 
                onChange={(e, val) => setTabIndex(val)} 
                textColor="primary" 
                indicatorColor="primary"
                sx={{ '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.95rem' } }}
              >
                <Tab label="Packing Summary" />
                <Tab label={`Plastic Crates (${cratesData.length})`} />
                <Tab label={`Carton Details (${cartonsData.length})`} />
              </Tabs>
            </Box>

            {tabIndex === 0 && (
            <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>PO No</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Job No</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>UPC Code</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Color</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Size</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>FacLine</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Qty</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Packed</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Balance</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {packingData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 3, color: '#64748b' }}>
                        No packing details found for this PO.
                      </TableCell>
                    </TableRow>
                  ) : (
                    packingData.map((row, index) => {
                      const qty = row.qty || 0;
                      const packed = row.sumOutput || 0;
                      const balance = row.balance || (qty - packed);
                      const isComplete = balance <= 0;

                      return (
                        <TableRow key={index} hover>
                          <TableCell sx={{ fontWeight: 600, color: '#374151' }}>{row.poNo}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.jobNo}</TableCell>
                          <TableCell>{row.upcCode}</TableCell>
                          <TableCell>{row.color}</TableCell>
                          <TableCell align="center">{row.sizx}</TableCell>
                          <TableCell align="center">{row.facLine}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>{qty.toLocaleString()}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: '#3b82f6' }}>{packed.toLocaleString()}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, color: balance > 0 ? '#f59e0b' : '#64748b' }}>{balance.toLocaleString()}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              icon={isComplete ? <CheckCircleIcon fontSize="small"/> : <PendingIcon fontSize="small"/>} 
                              label={isComplete ? "Complete" : "Packing"} 
                              size="small" 
                              sx={{ 
                                bgcolor: isComplete ? '#dcfce7' : '#fef3c7', 
                                color: isComplete ? '#166534' : '#b45309', 
                                fontWeight: 600 
                              }} 
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            )}

            {tabIndex === 1 && (
            <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>PO No</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Factory Line</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>CTN Seri No</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Plastic Code</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Manu Size</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Packed Qty</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Barcode</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Created By</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Create Date</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cratesData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 3, color: '#64748b' }}>
                        No plastic crates found for this PO.
                      </TableCell>
                    </TableRow>
                  ) : (
                    cratesData.map((row, index) => (
                      <TableRow 
                        key={index} 
                        hover
                        sx={{ 
                          bgcolor: row.isActive !== 1 ? '#fee2e2' : 'inherit',
                          opacity: row.isActive !== 1 ? 0.8 : 1
                        }}
                      >
                        <TableCell sx={{ fontWeight: 600, color: row.isActive !== 1 ? '#ef4444' : '#374151' }}>{row.poNo}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{row.facLine}</TableCell>
                        <TableCell sx={{ textDecoration: row.isActive !== 1 ? 'line-through' : 'none' }}>{row.ctnSeriNo}</TableCell>
                        <TableCell align="center">
                          <Chip label={row.plasticCode} size="small" sx={{ bgcolor: row.isActive !== 1 ? '#fca5a5' : '#e2e8f0', fontWeight: 600, color: row.isActive !== 1 ? '#7f1d1d' : 'inherit' }} />
                        </TableCell>
                        <TableCell align="center">{row.manuSize}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: row.isActive !== 1 ? '#b91c1c' : '#0284c7' }}>{row.packedQty}</TableCell>
                        <TableCell align="center">{row.ctnBarCode}</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#475569' }}>{row.createdBy}</TableCell>
                        <TableCell>{row.sysCreateDate ? new Date(row.sysCreateDate).toLocaleString() : ''}</TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={row.isActive === 1 ? "Active" : "InActive"} 
                            size="small" 
                            color={row.isActive === 1 ? "success" : "error"}
                            sx={{ fontWeight: 600 }} 
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            )}

            {tabIndex === 2 && (
            <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>PO No</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>CTN No</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>CTN Seri No</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Barcode</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Packed Qty</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Cust Size</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Manu Size</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Location</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Ship Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Created By</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }}>Create Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cartonsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 3, color: '#64748b' }}>
                        No carton details found for this PO.
                      </TableCell>
                    </TableRow>
                  ) : (
                    cartonsData.map((row, index) => (
                      <TableRow key={index} hover>
                        <TableCell sx={{ fontWeight: 600, color: '#374151' }}>{row.poNo}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}>{row.ctnNo}</TableCell>
                        <TableCell>{row.ctnSeriNo}</TableCell>
                        <TableCell align="center">{row.ctnBarCode}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#0284c7' }}>{row.packedQty}</TableCell>
                        <TableCell align="center">{row.custSize}</TableCell>
                        <TableCell align="center">{row.manuSize}</TableCell>
                        <TableCell align="center">
                          {row.ctnLocation ? <Chip label={row.ctnLocation} size="small" sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 600 }} /> : ''}
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={row.shipStatus || 'N/A'} 
                            size="small" 
                            color={row.shipStatus === 'SHIPPED' ? 'success' : 'default'}
                            sx={{ fontWeight: 600 }} 
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#475569' }}>{row.createdBy}</TableCell>
                        <TableCell>{row.sysCreateDate ? new Date(row.sysCreateDate).toLocaleString() : ''}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            )}
          </Paper>
        </>
      )}

      {/* Notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.type as any} sx={{ width: '100%', fontWeight: 600, borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
