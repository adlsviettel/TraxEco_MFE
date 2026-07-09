import React, { useState, useRef, useEffect } from 'react';
import {
  Alert, Box, Button, Card, Chip, CircularProgress, Divider,
  Grid, Stack, TextField, Typography, Fade, IconButton,
  Paper, Autocomplete, Avatar, Pagination,
  Select, MenuItem, Checkbox, FormControlLabel, ToggleButton, ToggleButtonGroup, Dialog, DialogContent
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PersonIcon from '@mui/icons-material/Person';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import InventoryIcon from '@mui/icons-material/Inventory';
import SearchIcon from '@mui/icons-material/Search';
import { rdItemApi } from '../services/rdMaterialApi';
import type { Item } from '../types';
import { authFetch, useToast, AppButton, AppTextField } from '@traxeco/shared';
import { useTranslation } from 'react-i18next';
import QRScannerDialog from '../components/QRScannerDialog';
import CameraCaptureDialog from '../components/CameraCaptureDialog';

const ScanOutPage: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [actionType, setActionType] = useState<'OUT' | 'IN'>('OUT');
  const [manualCode, setManualCode] = useState('');
  const [prefix, setPrefix] = useState('FB');
  const [item, setItem] = useState<Item | null>(null);
  const [searching, setSearching] = useState(false);
  const [holder, setHolder] = useState('');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [borrowedQty, setBorrowedQty] = useState(0);
  const [logs, setLogs] = useState<any[]>([]);
  const [holderOpts, setHolderOpts] = useState<string[]>([]);
  
  const [isGuest, setIsGuest] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [capturedPhotoFile, setCapturedPhotoFile] = useState<File | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [logPage, setLogPage] = useState(1);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<any>(null);
  const itemSearchTimerRef = useRef<any>(null);
  const [staffLoading, setStaffLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    // Initial load: historical options
    rdItemApi.getOptions('holder').then(opt => { if (opt) setHolderOpts(opt); }).catch(() => {});
  }, []);

  const handleStaffSearch = (query: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!query || query.length < 2) return;
    
    searchTimerRef.current = setTimeout(async () => {
      setStaffLoading(true);
      try {
        const res = await authFetch(`accounts/search-staff?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const text = await res.text();
          let options: string[] = [];
          try {
            const json = JSON.parse(text);
            const list = Array.isArray(json) ? json : (json.data || []);
            options = list.map((u: any) => {
              const code = u.id_staff || u.code || u.idStaff || '';
              const name = u.fullname || u.employeeName || '';
              return `${code} - ${name}`;
            });
          } catch {
            // Regex extraction for truncated JSON due to infinite recursion loop
            const regex1 = /"fullname"\s*:\s*"([^"]+)".*?"(?:id_staff|code|idStaff)"\s*:\s*"([^"]+)"/g;
            const regex2 = /"(?:id_staff|code|idStaff)"\s*:\s*"([^"]+)".*?"fullname"\s*:\s*"([^"]+)"/g;
            let m;
            while ((m = regex1.exec(text)) !== null) options.push(`${m[2]} - ${m[1]}`);
            while ((m = regex2.exec(text)) !== null) options.push(`${m[1]} - ${m[2]}`);
            options = [...new Set(options)];
          }
          if (options.length > 0) {
            setHolderOpts(options);
          } else {
            // If still empty, try fallback to historical options
            rdItemApi.getOptions('holder').then(opt => { if (opt) setHolderOpts(opt); }).catch(() => {});
          }
        }
      } catch { /* ignore */ }
      finally { setStaffLoading(false); }
    }, 400);
  };

  // Auto-focus search input when returning to initial state
  useEffect(() => {
    if (!item && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [item]);

  const doSearch = async (code: string) => {
    if (!code) return;
    setSearching(true);
    setItem(null);
    setLogs([]);
    setLogPage(1);
    setBorrowedQty(0);
    try {
      let data: Item | null = null;
      // Match raw IDs or prefixed IDs (FB-12, 12, ac-5)
      const idMatch = code.match(/^([A-Za-z]{2}-)?(\d+)$/);
      if (idMatch) {
        try {
          const res = await rdItemApi.getById(Number(idMatch[2]));
          if (res && res.id) data = res;
        } catch { /* ignore and fallback */ }
      }

      if (!data) {
        try {
          const res = await rdItemApi.getByQrCode(code);
          if (res && res.id) data = res;
        } catch { /* ignore */ }
      }

      if (!data) {
        throw new Error('Not found');
      }

      const currentQty = Number(data.quantity);
      if (actionType === 'OUT' && (isNaN(currentQty) || currentQty <= 0)) {
        throw new Error(t('rdMaterial.scanout_qty_zero_error', 'Cannot scan out. This item currently has 0 quantity.'));
      }
      
      setItem(data);
      const logData = await rdItemApi.getScanLogs(data.id);
      
      const totalOut = logData.filter((l: any) => l.actionType === 'OUT').reduce((acc: number, l: any) => acc + Math.abs(l.qtyChanged), 0);
      const totalIn = logData.filter((l: any) => l.actionType === 'IN').reduce((acc: number, l: any) => acc + Math.abs(l.qtyChanged), 0);
      setBorrowedQty(totalOut - totalIn);
      setLogs(logData);
    } catch (err: any) {
      if (err.message && err.message !== 'Not found') {
        showToast(err.message, 'error');
      } else {
        showToast(t('rdMaterial.scanout_not_found', 'Item not found. Please try again!'), 'error');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = async () => {
    const finalHolder = isGuest ? `Guest: ${guestName} - ${guestPhone || 'N/A'}` : holder;
    if (!item || !finalHolder || qty <= 0 || (isGuest && !guestName)) return;
    setUploadingPhoto(true);
    try {
      let photoUrl = '';
      if (capturedPhotoFile) {
        try {
          photoUrl = await rdItemApi.uploadImage(capturedPhotoFile);
        } catch (uploadErr) {
          console.error("Image upload failed, proceeding without image", uploadErr);
          showToast(t('rdMaterial.upload_photo_failed_continue', 'Không thể tải lên ảnh minh chứng, vẫn tiếp tục lưu...'), "warning");
        }
      }

      await rdItemApi.scan(item.id, { holder: finalHolder, qtyChanged: qty, note, photoUrl }, actionType);
      showToast(actionType === 'OUT' ? t('rdMaterial.scanout_success', 'Inventory updated successfully!') : t('rdMaterial.scanin_success', 'Item returned successfully!'), 'success');
      
      const [newItem, logData] = await Promise.all([
        rdItemApi.getById(item.id),
        rdItemApi.getScanLogs(item.id)
      ]);
      setItem(newItem);
      
      const totalOut = logData.filter((l: any) => l.actionType === 'OUT').reduce((acc: number, l: any) => acc + Math.abs(l.qtyChanged), 0);
      const totalIn = logData.filter((l: any) => l.actionType === 'IN').reduce((acc: number, l: any) => acc + Math.abs(l.qtyChanged), 0);
      setBorrowedQty(totalOut - totalIn);
      setLogs(logData);
      
      // Reset input quantity, note and photo evidence
      setQty(1);
      setNote('');
      setCapturedPhotoFile(null);
      setCapturedPhotoUrl(null);
    } catch (err: any) {
      showToast(err.message || 'System error during update', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const clearSearch = () => {
    setItem(null);
    setManualCode('');
  };

  const handleManualSearch = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    if (!manualCode) return;
    if (itemSearchTimerRef.current) clearTimeout(itemSearchTimerRef.current);
    doSearch(`${prefix}-${manualCode}`);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', pt: 2, pb: { xs: 12, lg: 6 } }}>
      {/* Dynamic Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1, mr: 2 }}>
          <Typography variant="h4" fontWeight={800} color="#0f172a" sx={{ letterSpacing: '-0.5px' }}>
            {t('rdMaterial.scanout_title', 'Scan & Inventory')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('rdMaterial.scanout_subtitle', 'Quickly borrow or return inventory via QR Code.')}
          </Typography>
        </Box>
        {item && (
          <Fade in>
            <AppButton 
              variant="outlined" 
              customVariant="secondary"
              startIcon={<ArrowBackIcon />} 
              onClick={clearSearch}
              sx={{ 
                borderRadius: '50px', whiteSpace: 'nowrap', px: { xs: 2, sm: 3 }, py: 1, 
                fontWeight: 800, flexShrink: 0, mt: 0.5,
                borderColor: '#e2e8f0', color: '#0f172a',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' }
              }}
            >
              {t('rdMaterial.scanout_scan_another', 'Scan Another')}
            </AppButton>
          </Fade>
        )}
      </Box>

      {/* Global Alerts */}

      {/* --- STATE 1: SEARCH BAR --- */}
      {!item && (
        <Fade in timeout={500}>
          <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            <ToggleButtonGroup
              value={actionType}
              exclusive
              onChange={(_, val) => { if (val) setActionType(val); }}
              sx={{ mb: 4, bgcolor: '#f8fafc', borderRadius: 2, p: 0.5, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
            >
              <ToggleButton value="OUT" sx={{ px: 4, py: 1, fontWeight: 800, border: 'none', borderRadius: 1.5, '&.Mui-selected': { bgcolor: '#fef2f2', color: '#ef4444' } }}>
                SCAN OUT (BORROW)
              </ToggleButton>
              <ToggleButton value="IN" sx={{ px: 4, py: 1, fontWeight: 800, border: 'none', borderRadius: 1.5, '&.Mui-selected': { bgcolor: '#f0fdf4', color: '#16a34a' } }}>
                SCAN IN (RETURN)
              </ToggleButton>
            </ToggleButtonGroup>

            <Box sx={{ 
              width: 100, height: 100, borderRadius: '50%', bgcolor: actionType === 'OUT' ? '#fef2f2' : '#f0fdf4', color: actionType === 'OUT' ? '#ef4444' : '#22c55e', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4,
              boxShadow: actionType === 'OUT' ? '0 0 0 10px rgba(239, 68, 68, 0.05)' : '0 0 0 10px rgba(34, 197, 94, 0.05)'
            }}>
              <QrCodeScannerIcon sx={{ fontSize: 48 }} />
            </Box>
            
            <Paper elevation={0} sx={{ 
              width: '100%', maxWidth: 700, borderRadius: '50px', p: 0.5, pl: 1.5,
              boxShadow: '0 8px 32px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', bgcolor: '#fff',
              transition: 'all 0.2s', '&:focus-within': { boxShadow: '0 8px 32px rgba(46,125,50,0.15)', borderColor: '#2e7d32' }
            }}>
              <IconButton 
                color="primary" 
                onClick={() => setScannerOpen(true)}
                sx={{ p: 1.2, bgcolor: '#f0fdf4', color: '#16a34a', mr: 1.5, transition: 'all 0.2s', '&:hover': { bgcolor: '#dcfce7', transform: 'scale(1.05)' } }}
                title="Scan QR Code"
              >
                <CameraAltIcon />
              </IconButton>
              
              <Select
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                variant="standard"
                disableUnderline
                renderValue={(value) => <Typography fontWeight={800} color="#334155">{value}</Typography>}
                sx={{ 
                  fontWeight: 800, color: '#334155',
                  height: 36, display: 'flex', alignItems: 'center',
                  minWidth: 60, borderRight: '2px solid #f1f5f9', pr: 1.5, mr: 1.5,
                  '& .MuiSelect-select': { py: 0, '&:focus': { bgcolor: 'transparent' } }
                }}
              >
                <MenuItem value="FB">FB (Fabric)</MenuItem>
                <MenuItem value="AC">AC (Accessory)</MenuItem>
                <MenuItem value="SY">SY (Yardage)</MenuItem>
                <MenuItem value="GM">GM (Garment)</MenuItem>
                <MenuItem value="MK">MK (Mockup)</MenuItem>
              </Select>

              <TextField
                inputRef={inputRef}
                fullWidth
                variant="standard"
                placeholder={t('rdMaterial.scanout_manual_input', 'Enter ID (e.g., 12)...')}
                value={manualCode}
                onChange={(e) => {
                  let val = e.target.value.toUpperCase();
                  const match = val.match(/^([A-Z]{2})[-]?(\d+)$/);
                  let newPrefix = prefix;
                  let newCode = val;
                  if (match) {
                    newPrefix = match[1];
                    setPrefix(newPrefix);
                    newCode = match[2];
                    setManualCode(newCode);
                  } else {
                    newCode = val.replace(/[^0-9A-Z-]/g, '');
                    setManualCode(newCode);
                  }
                  
                  // Debounce search (Chống lag)
                  if (itemSearchTimerRef.current) clearTimeout(itemSearchTimerRef.current);
                  if (newCode) {
                    itemSearchTimerRef.current = setTimeout(() => {
                      doSearch(`${newPrefix}-${newCode}`);
                    }, 600);
                  }
                }}
                onKeyDown={handleManualSearch}
                InputProps={{
                  disableUnderline: true,
                  sx: { fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', '& input::placeholder': { color: '#94a3b8', fontWeight: 500 } }
                }}
              />
              
              <IconButton 
                onClick={(e) => handleManualSearch(e as any)}
                disabled={!manualCode || searching}
                sx={{ 
                  width: 44, height: 44, 
                  bgcolor: !manualCode ? '#f1f5f9' : '#2e7d32', 
                  color: !manualCode ? '#94a3b8' : '#fff', 
                  '&:hover': { bgcolor: !manualCode ? '#f1f5f9' : '#1b6d24' },
                  '&.Mui-disabled': { bgcolor: '#f1f5f9', color: '#94a3b8' },
                  ml: 1, flexShrink: 0,
                  transition: 'all 0.2s'
                }}
              >
                {searching ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
              </IconButton>
            </Paper>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 4, textAlign: 'center', maxWidth: 400 }}>
              Tip: You can directly enter the ID (e.g., <strong>12</strong>) or the full code (e.g., <strong>FB-12</strong>). The system will auto-detect it.
            </Typography>
          </Box>
        </Fade>
      )}

      {/* --- STATE 2: ITEM FOUND (ACTION FLOW) --- */}
      {item && (
        <Fade in timeout={500}>
          <Box>
            <Grid container spacing={4} sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
              
              {/* LEFT: Item Profile */}
              <Grid size={{ xs: 12, md: 4 }} sx={{ minWidth: 0 }}>
                <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <Box sx={{ p: 3, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <Chip 
                      icon={<CheckCircleIcon sx={{ color: '#22c55e !important' }}/>} 
                      label={t('rdMaterial.scanout_qr_valid', 'Item Found')} 
                      size="small" 
                      sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700, mb: 2, px: 1 }} 
                    />
                    <Typography variant="h6" fontWeight={800} color="#0f172a" lineHeight={1.3} mb={1}>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontFamily="monospace" fontSize={14}>
                      {item.itemCode || `ID: ${item.id}`}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 3 }}>
                    <Stack spacing={2.5}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography color="text.secondary" fontSize={13}>Category</Typography>
                        <Typography fontWeight={600} fontSize={13} color="#0f172a">{item.itemType}</Typography>
                      </Box>
                      <Divider sx={{ borderStyle: 'dashed' }} />
                      <Box display="flex" justifyContent="space-between">
                        <Typography color="text.secondary" fontSize={13}>Supplier</Typography>
                        <Typography fontWeight={600} fontSize={13} color="#0f172a">{item.supplierName || '—'}</Typography>
                      </Box>
                      <Divider sx={{ borderStyle: 'dashed' }} />
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography color="text.secondary" fontSize={13}>Storage Location</Typography>
                        <Chip label={item.location || 'Unassigned'} size="small" sx={{ fontWeight: 700, bgcolor: '#f1f5f9', color: '#475569' }} />
                      </Box>
                      <Divider sx={{ borderStyle: 'dashed' }} />
                      <Box display="flex" justifyContent="space-between" alignItems="center" p={2} bgcolor="#f0fdf4" borderRadius={3}>
                        <Box display="flex" alignItems="center" gap={1.5} flex={1}>
                          <InventoryIcon sx={{ color: '#16a34a', fontSize: 22 }} />
                          <Typography fontWeight={800} color="#166534" sx={{ letterSpacing: '0.5px' }}>Current Inventory:</Typography>
                        </Box>
                        <Typography variant="h5" fontWeight={900} color="#15803d" sx={{ pl: 2 }}>
                          {item.quantity ?? 0}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Card>
              </Grid>

              {/* MIDDLE: Action Form */}
              <Grid size={{ xs: 12, md: 4 }} sx={{ minWidth: 0 }}>
                  {/* Action Form */}
                  <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid #e2e8f0', p: 4, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)', height: '100%' }}>
                    <Typography variant="h6" fontWeight={800} color="#0f172a" mb={3}>
                      {actionType === 'OUT' ? t('rdMaterial.scanout_step3', 'Bước 3 — Xác nhận Scan Out') : t('rdMaterial.scanin_step3', 'Bước 3 — Xác nhận Scan In')}
                    </Typography>
                    
                    <Stack spacing={3}>
                      {(item.quantity ?? 0) <= 0 && actionType === 'OUT' && (
                        <Alert severity="error" sx={{ borderRadius: 2, '& .MuiAlert-icon': { alignItems: 'center' } }}>
                          <Typography fontWeight={700} sx={{ wordBreak: 'break-word' }}>
                            {t('rdMaterial.scanout_out_of_stock', 'Tồn kho không đủ! Vật tư này hiện đã hết hàng (0 available) và không thể xuất thêm.')}
                          </Typography>
                        </Alert>
                      )}
                      {borrowedQty <= 0 && actionType === 'IN' && (
                        <Alert severity="warning" sx={{ borderRadius: 2, '& .MuiAlert-icon': { alignItems: 'center' } }}>
                          <Typography fontWeight={700} sx={{ wordBreak: 'break-word' }}>
                            {t('rdMaterial.scanin_no_borrow', 'Không thể Trả! Vật tư này hiện tại không có ai mượn (Đang mượn: 0).')}
                          </Typography>
                        </Alert>
                      )}
                      
                      <Box>
                        <Box display="flex" justifyContent="flex-start" alignItems="center" gap={4} mb={1.5}>
                          <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                                {t('rdMaterial.scanout_holder_req', 'HOLDER (BORROWER) *')}
                              </Typography>
                              <FormControlLabel 
                                control={
                                  <Checkbox 
                                    size="small" 
                                    checked={isGuest} 
                                    onChange={(e) => setIsGuest(e.target.checked)} 
                                    sx={{ py: 0, pr: 1, '&.Mui-checked': { color: '#16a34a' } }} 
                                  />
                                } 
                                label={
                                  <Typography variant="body2" fontWeight={700} sx={{ color: isGuest ? '#16a34a' : 'text.secondary', userSelect: 'none' }}>
                                    {t('rdMaterial.scanout_guest', 'Guest')}
                                  </Typography>
                                }
                                sx={{ m: 0, pl: 1 }}
                              />
                            </Box>
                            
                            {!isGuest ? (
                              <Autocomplete
                                freeSolo
                                loading={staffLoading}
                                options={holderOpts}
                                filterOptions={(x) => x}
                                value={holder}
                                onChange={(_, val) => setHolder(val || '')}
                                onInputChange={(_, val, reason) => { 
                                  setHolder(val);
                                  if (reason === 'input') {
                                    handleStaffSearch(val);
                                  }
                                }}
                                renderInput={(params) => (
                                  <AppTextField 
                                    {...params} 
                                    placeholder={t('rdMaterial.scanout_select_staff', 'Select staff (Type ID or Name)...')} 
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
                                    InputProps={{
                                      ...params.InputProps,
                                      endAdornment: (
                                        <React.Fragment>
                                          {staffLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                          {params.InputProps.endAdornment}
                                        </React.Fragment>
                                      ),
                                    }}
                                  />
                                )}
                              />
                            ) : (
                              <Box display="flex" gap={2}>
                                <AppTextField
                                  fullWidth
                                  placeholder={t('rdMaterial.scanout_guest_name', 'Guest Name *')}
                                  value={guestName}
                                  onChange={(e) => setGuestName(e.target.value)}
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
                                />
                                <AppTextField
                                  fullWidth
                                  placeholder={t('rdMaterial.scanout_guest_phone', 'Phone')}
                                  value={guestPhone}
                                  onChange={(e) => setGuestPhone(e.target.value)}
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
                                />
                              </Box>
                            )}
                          </Box>

                          <Box>
                            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1}>
                              {actionType === 'OUT' ? t('rdMaterial.scanout_qty_out', 'QUANTITY TO TAKE OUT *') : t('rdMaterial.scanin_qty_in', 'QUANTITY TO RETURN *')}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={2}>
                              <AppTextField 
                                type="number" 
                                value={qty} 
                                onChange={(e) => setQty(+e.target.value)}
                                inputProps={{ min: 1, max: actionType === 'OUT' ? (item?.quantity ?? 9999) : (borrowedQty > 0 ? borrowedQty : 99999), style: { textAlign: 'center' } }} 
                                sx={{ width: 140, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc', fontSize: '1.2rem', fontWeight: 700 } }} 
                              />
                              <Typography fontSize={14} color="text.secondary">
                                / {actionType === 'OUT' ? (item?.quantity ?? 0) : borrowedQty} {actionType === 'OUT' ? 'available' : 'borrowed'}
                              </Typography>
                            </Box>
                          </Box>

                          <Box>
                            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1}>
                              {t('rdMaterial.scanout_note_opt', 'NOTE (OPTIONAL)')}
                            </Typography>
                            <AppTextField 
                              fullWidth 
                              multiline 
                              rows={2}
                              placeholder="Reason for scan out..." 
                              value={note} 
                              onChange={(e) => setNote(e.target.value)} 
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
                            />
                          </Box>
                          
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1}>
                              {t('rdMaterial.scan_log_photo', 'PHOTO EVIDENCE *')}
                            </Typography>
                            {capturedPhotoUrl ? (
                              <Box sx={{ position: 'relative', width: 120, height: 90, borderRadius: 2, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                <img src={capturedPhotoUrl} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setCapturedPhotoFile(null);
                                    setCapturedPhotoUrl(null);
                                  }}
                                  sx={{
                                    position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff',
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                                  }}
                                >
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Box>
                            ) : (
                              <Button
                                variant="outlined"
                                startIcon={<CameraAltIcon />}
                                onClick={() => setCameraDialogOpen(true)}
                                sx={{ 
                                  borderRadius: 2, borderColor: '#cbd5e1', color: '#475569', textTransform: 'none', fontWeight: 700,
                                  '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' }
                                }}
                              >
                                {t('rdMaterial.take_photo_btn', 'Take Photo / Upload Image')}
                              </Button>
                            )}
                          </Box>

                          <AppButton
                            variant="contained" 
                            customVariant="primary"
                            size="large"
                            disabled={!item || (!isGuest && !holder) || (isGuest && !guestName) || qty <= 0 || (actionType === 'OUT' && qty > (item?.quantity ?? 0)) || (actionType === 'IN' && qty > borrowedQty) || !capturedPhotoFile || uploadingPhoto}
                            onClick={handleConfirm}
                            sx={{ 
                              borderRadius: 2.5, py: 2, fontSize: '1.1rem', fontWeight: 800,
                              background: actionType === 'OUT' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                              boxShadow: actionType === 'OUT' ? '0 8px 20px rgba(239, 68, 68, 0.3)' : '0 8px 20px rgba(22, 163, 74, 0.3)',
                              '&:hover': { background: actionType === 'OUT' ? 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)' : 'linear-gradient(135deg, #15803d 0%, #166534 100%)' },
                              '&:disabled': { background: '#e2e8f0', color: '#94a3b8' }
                            }}
                          >
                            {uploadingPhoto ? (
                              <CircularProgress size={24} color="inherit" />
                            ) : (
                              actionType === 'OUT' ? t('rdMaterial.scanout_confirm_btn', 'Confirm Scan Out') : t('rdMaterial.scanin_confirm_btn', 'Confirm Return')
                            )}
                          </AppButton>
                    </Stack>
                  </Card>
              </Grid>

              {/* RIGHT: Recent Logs */}
              <Grid size={{ xs: 12, md: 4 }} sx={{ minWidth: 0 }}>
                  <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid #e2e8f0', p: 4, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <HistoryIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                      <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {actionType === 'OUT' ? t('rdMaterial.scanout_log', 'LỊCH SỬ SCAN OUT GẦN ĐÂY') : t('rdMaterial.scanin_log', 'LỊCH SỬ SCAN IN GẦN ĐÂY')}
                      </Typography>
                    </Box>
                    
                    {(() => {
                      const filteredLogs = logs.filter(log => log.actionType === actionType);
                      const totalPages = Math.ceil(filteredLogs.length / 5);
                      const displayLogs = filteredLogs.slice((logPage - 1) * 5, logPage * 5);
                      
                      return filteredLogs.length > 0 ? (
                      <>
                        <Stack spacing={2} sx={{ mb: 3 }}>
                          {displayLogs.map((log) => (
                            <Paper key={log.id} elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #f1f5f9', bgcolor: '#fff', display: 'flex', gap: 2, alignItems: 'center' }}>
                              <Avatar sx={{ bgcolor: '#f0fdf4', color: '#16a34a', width: 40, height: 40 }}>
                                <PersonIcon />
                              </Avatar>
                              <Box flex={1}>
                                 <Typography variant="body2" fontWeight={700} color="#0f172a">{log.holder}</Typography>
                                 <Typography variant="caption" color="text.secondary">
                                   {new Date(log.scannedAt).toLocaleString('en-US')} {log.note ? ` • ${log.note}` : ''}
                                 </Typography>
                               </Box>
                               {log.photoUrl && (
                                 <Box 
                                   onClick={() => setPreviewPhotoUrl(log.photoUrl)}
                                   sx={{ 
                                     width: 36, height: 36, borderRadius: 1.5, overflow: 'hidden', border: '1px solid #e2e8f0', cursor: 'pointer',
                                     transition: 'transform 0.15s', '&:hover': { transform: 'scale(1.1)' }, flexShrink: 0
                                   }}
                                 >
                                   <img src={rdItemApi.getImageUrl(log.photoUrl)} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                 </Box>
                               )}
                               <Chip label={log.qtyChanged} size="small" sx={{ bgcolor: log.actionType === 'OUT' ? '#fef2f2' : '#f0fdf4', color: log.actionType === 'OUT' ? '#dc2626' : '#16a34a', fontWeight: 800, fontSize: 13 }} />
                            </Paper>
                          ))}
                        </Stack>
                        
                        {totalPages > 1 && (
                          <Box display="flex" justifyContent="center" mt="auto" pt={2} borderTop="1px solid #f1f5f9">
                            <Pagination 
                              count={totalPages} 
                              page={logPage} 
                              onChange={(e, val) => setLogPage(val)} 
                              color="primary" 
                              size="small" 
                            />
                          </Box>
                        )}
                      </>
                    ) : (
                      <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px dashed #cbd5e1', bgcolor: 'transparent', textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          {actionType === 'OUT' ? t('rdMaterial.no_scanout_history', 'Chưa có lịch sử Scan Out cho vật tư này.') : t('rdMaterial.no_scanin_history', 'Chưa có lịch sử Scan In cho vật tư này.')}
                        </Typography>
                      </Paper>
                    );
                    })()}
                  </Card>
              </Grid>
            </Grid>
          </Box>
        </Fade>
      )}

      {/* QR Scanner Dialog */}
      <QRScannerDialog 
        open={scannerOpen} 
        onClose={() => setScannerOpen(false)} 
        onScan={(text) => {
          setScannerOpen(false);
          let val = text.toUpperCase();
          const match = val.match(/^([A-Z]{2})[-]?(\d+)$/);
          if (match) {
            setPrefix(match[1]);
            setManualCode(match[2]);
            // Give state time to update before searching
            setTimeout(() => doSearch(match[2]), 100);
          } else {
            const num = val.replace(/[^0-9A-Z-]/g, '');
            setManualCode(num);
            setTimeout(() => doSearch(num), 100);
          }
        }} 
      />

      {/* Camera Capture Dialog */}
      <CameraCaptureDialog
        open={cameraDialogOpen}
        onClose={() => setCameraDialogOpen(false)}
        onCapture={(file, dataUrl) => {
          setCapturedPhotoFile(file);
          setCapturedPhotoUrl(dataUrl);
        }}
      />

      {/* Preview Dialog */}
      <Dialog open={!!previewPhotoUrl} onClose={() => setPreviewPhotoUrl(null)} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: 0, bgcolor: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: 200 }}>
          <IconButton
            onClick={() => setPreviewPhotoUrl(null)}
            sx={{ position: 'absolute', top: 12, right: 12, color: '#fff', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, zIndex: 10 }}
          >
            <CloseIcon />
          </IconButton>
          {previewPhotoUrl && (
            <img
              src={rdItemApi.getImageUrl(previewPhotoUrl)}
              alt="Preview Evidence"
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ScanOutPage;
