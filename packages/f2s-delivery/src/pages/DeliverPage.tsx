import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Typography, Paper, Tabs, Tab, TextField, MenuItem, Button, Autocomplete, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Switch,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, IconButton, InputAdornment
} from '@mui/material';
import {
  QrCodeScanner as ScanIcon,
  HandshakeOutlined as ManualIcon,
  PrecisionManufacturing as AutoIcon,
  Search as SearchIcon,
  CheckCircle as CheckIcon,
  ListAlt as ListIcon,
  DeleteOutline as DeleteIcon,
  Edit as EditIcon,
  WarningAmber as WarningIcon,
  CameraAlt as CameraIcon,
} from '@mui/icons-material';
import { deliveryScanService } from '../services/deliveryScanService';
import {
  autoDeliveryService,
  type SewingOutputItem,
  type PackingPlanItem,
  type PackType,
  type PackQueueItem,
} from '../services/autoDeliveryService';
import { Html5QrcodePlugin } from '@traxeco/shared';

// ─── Manual Delivery Tab ───
const F2S_STORAGE_KEY = 'f2sDeliveryState';

function ManualTab() {
  // Khôi phục state từ sessionStorage
  const saved = (() => {
    try {
      const raw = sessionStorage.getItem(F2S_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  const [searchType, setSearchType] = useState(saved?.searchType || 'PO');
  const [searchValue, setSearchValue] = useState(saved?.searchValue || '');
  const [poList, setPoList] = useState<string[]>(saved?.poList || []);
  const [loading, setLoading] = useState(false);
  const [selectedPO, setSelectedPO] = useState<string | null>(saved?.selectedPO || null);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);

  // Detail list data
  const [details, setDetails] = useState<any[]>(saved?.details || []);
  const [history, setHistory] = useState<any[]>(saved?.history || []);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeRow, setActiveRow] = useState<any>(null); // The row they finally pick to scan
  const [dialogOpen, setDialogOpen] = useState(false); // Controls the manual input popup
  const [manualQty, setManualQty] = useState<number | string>(''); // The typed quantity in the popup

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [editQty, setEditQty] = useState<number | string>('');

  // Snackbar thông báo
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const showSnack = (message: string, severity: 'success' | 'error' = 'success') => setSnackbar({ open: true, message, severity });

  // Confirm dialog
  const [confirmDlg, setConfirmDlg] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} });

  // Lưu state vào sessionStorage mỗi khi thay đổi
  useEffect(() => {
    sessionStorage.setItem(F2S_STORAGE_KEY, JSON.stringify({
      searchType, searchValue, poList, selectedPO, details, history,
    }));
  }, [searchType, searchValue, poList, selectedPO, details, history]);

  const loadDetails = async (code: string) => {
    setLoadingDetails(true);
    try {
      const res = searchType === 'PO'
        ? await deliveryScanService.getDetailsPO(code)
        : await deliveryScanService.getDetailsSO(code);
      setDetails(res.result1 || []);
      setHistory(res.result2 || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Tạo XML string chuẩn từ 1 row data
  const buildXml = (row: any, qty?: string | number) => {
    const facLine = localStorage.getItem('dept') || '';
    const qtyValue = qty ?? row.Qty ?? row.Balance ?? '';
    return `<root><row><FacLine>${facLine}</FacLine><JobNo>${row.JobNo || ''}</JobNo><PONo>${row.PONo || ''}</PONo><Color>${row.ColorID || ''}</Color><Size>${row.SizeID || ''}</Size><Qty>${qtyValue}</Qty></row></root>`;
  };

  // Xóa dòng trong bảng History
  const handleDelete = (row: any) => {
    setConfirmDlg({
      open: true,
      message: 'Bạn có chắc chắn muốn XÓA dòng này không?',
      onConfirm: async () => {
        setConfirmDlg(prev => ({ ...prev, open: false }));
        try {
          const xmlString = buildXml(row);
          await deliveryScanService.updateOrDeleteDelivery(0, xmlString);
          showSnack('Xóa thành công!');
          if (selectedPO) await loadDetails(selectedPO);
        } catch (err: any) {
          showSnack('Lỗi khi xóa: ' + err.message, 'error');
        }
      },
    });
  };

  // Sửa dòng trong bảng History
  const handleEditConfirm = async () => {
    if (!editRow) return;
    try {
      const xmlString = buildXml(editRow, editQty);
      await deliveryScanService.updateOrDeleteDelivery(1, xmlString);
      showSnack('Cập nhật thành công!');
      setEditDialogOpen(false);
      setEditQty('');
      if (selectedPO) await loadDetails(selectedPO);
    } catch (err: any) {
      showSnack('Lỗi khi cập nhật: ' + err.message, 'error');
    }
  };

  const fetchPOs = async () => {
    if (!searchValue.trim()) return;
    setLoading(true);
    try {
      const result = searchType === 'PO' 
        ? await deliveryScanService.getListPO(searchValue)
        : await deliveryScanService.getListSO(searchValue);
      
      setPoList(result);
      if (result.length === 1) {
        const exactMatch = result[0];
        setSelectedPO(exactMatch);
        setActiveRow(null);
        setDetails([]);
        setHistory([]);
        setAutocompleteOpen(false);
        await loadDetails(exactMatch);
      } else if (result.length > 1) {
        setAutocompleteOpen(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Bước 1: Tìm PO hoặc SO (UI Mới gọn gàng hơn) */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2e7d32', mb: 1, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 1 }}>
          <SearchIcon fontSize="small" /> Bước 1: Tìm PO hoặc SO
        </Typography>
        <Paper elevation={0} sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: '100%', maxWidth: '100%', borderRadius: 2, border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          {/* Toggle PO/SO */}
          <TextField
            select
            size="small"
            value={searchType}
          onChange={(e) => {
            setSearchType(e.target.value);
            setPoList([]);
            setSelectedPO(null);
            setSearchValue('');
            setDetails([]);
            setHistory([]);
            setActiveRow(null);
          }}
          variant="standard"
          sx={{ ml: 1, width: 70, '& .MuiInput-underline:before, & .MuiInput-underline:after': { display: 'none' }, '& .MuiSelect-select': { fontWeight: 700, color: '#2e7d32' } }}
        >
          <MenuItem value="PO">PO</MenuItem>
          <MenuItem value="SO">SO</MenuItem>
        </TextField>

        {/* Divider */}
        <Box sx={{ height: 28, width: '1px', backgroundColor: '#e0e0e0', mx: 1 }} />

        {/* Ô Input bự */}
        <Autocomplete
          freeSolo
          open={autocompleteOpen}
          onOpen={() => { if (poList.length > 1) setAutocompleteOpen(true); }}
          onClose={() => setAutocompleteOpen(false)}
          options={poList}
          filterOptions={(x) => x}
          value={selectedPO}
          onChange={async (_, newValue) => {
            setAutocompleteOpen(false);
            setSelectedPO(newValue);
            setActiveRow(null);
            setActiveRow(null);
            setDetails([]);
            setHistory([]);
            if (newValue) {
              await loadDetails(newValue);
            }
          }}
          inputValue={searchValue}
          onInputChange={(_, newInputValue) => setSearchValue(newInputValue)}
          loading={loading}
          sx={{ flex: 1 }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={`Nhập số ${searchType} và bấm Enter...`}
              variant="standard"
              InputProps={{
                ...params.InputProps,
                disableUnderline: true,
                sx: { py: 1 },
                endAdornment: (
                  <>
                    {loading ? <CircularProgress color="inherit" size={18} sx={{ mr: 1 }} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  fetchPOs();
                }
              }}
            />
          )}
        />

        {/* Nút Tìm kiếm (Icon) */}
        <Button 
          onClick={fetchPOs}
          disabled={loading}
          sx={{ minWidth: 48, p: 1, color: '#2e7d32', borderRadius: 2 }}
        >
          <SearchIcon />
        </Button>
      </Paper>
      </Box>
      
      {/* Bước 2: Danh sách Size của PO/SO */}
      {selectedPO && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2e7d32', mb: 2, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ListIcon /> Bước 2: Chọn Dòng ({searchType}: {selectedPO})
          </Typography>

          {loadingDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : details.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>Không có dữ liệu chi tiết cho mã này.</Typography>
          ) : (
            <TableContainer sx={{ border: '1px solid #eee', borderRadius: 1 }}>
              <Table size="small" sx={{ '& .MuiTableCell-root': { py: { xs: 0.5, lg: 1 }, px: { xs: 1, lg: 2 }, fontSize: { xs: '0.75rem', lg: '0.85rem' } } }}>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>JobNo</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>PONo</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ManuSize</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>PackedQtyLine</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>QtyFromLine</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Balance</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center', position: 'sticky', right: 0, backgroundColor: '#f5f5f5', borderLeft: '1px solid #eee', zIndex: 2 }}>Hành động</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {details.map((row, i) => {
                    const isSelected = activeRow && activeRow.SizeID === row.SizeID && activeRow.ColorID === row.ColorID;
                    const isDisabled = row.Balance <= 0;
                    return (
                      <TableRow 
                        key={i} 
                        hover={!isDisabled}
                        onClick={() => {
                          if (!isDisabled) {
                            setActiveRow(row);
                            setManualQty('');
                            setDialogOpen(true);
                          }
                        }}
                        sx={{ 
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          backgroundColor: isSelected ? '#e8f5e9' : (isDisabled ? '#fafafa' : 'inherit'),
                          opacity: isDisabled ? 0.6 : 1,
                          '&:hover': { backgroundColor: isSelected ? '#c8e6c9' : (isDisabled ? '#fafafa' : '#f5f5f5') }
                        }}
                      >
                        <TableCell>{row.JobNo}</TableCell>
                        <TableCell>{row.PONo}</TableCell>
                        <TableCell>
                          {row.ManuSize && <Chip label={row.ManuSize} size="small" />}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>{row.PackedQtyLine || 0}</TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>{row.QtyFromLine || 0}</TableCell>
                        <TableCell sx={{ textAlign: 'right', color: isDisabled ? 'inherit' : '#d32f2f', fontWeight: 700 }}>
                          {row.Balance || 0}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center', position: 'sticky', right: 0, backgroundColor: isSelected ? '#e8f5e9' : (isDisabled ? '#fafafa' : '#ffffff'), borderLeft: '1px solid #eee' }}>
                          <Button 
                            variant={isSelected ? "contained" : "outlined"} 
                            size="small"
                            color={isSelected ? "success" : "inherit"}
                            disabled={isDisabled}
                            sx={{ minWidth: 80, textTransform: 'none' }}
                          >
                            {isDisabled ? 'Hết hàng' : 'Chọn'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Bước 3: History (Result 2) */}
      {selectedPO && history.length > 0 && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#455a64', mb: 2, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ListIcon /> Kết quả giao hàng (Lịch sử & Tổng hợp)
          </Typography>
          <TableContainer sx={{ border: '1px solid #eee', borderRadius: 1, backgroundColor: '#fff' }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#eeeeee' }}>
                <TableRow>
                  {['RecNo', 'JobNo', 'PONo', 'BuyerItem', 'ManuSize', 'CustSize', 'Balance'].map((col) => (
                    <TableCell key={col} sx={{ fontWeight: 700 }}>{col}</TableCell>
                  ))}
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', width: 100, position: 'sticky', right: 0, backgroundColor: '#eeeeee', borderLeft: '1px solid #ddd', zIndex: 2 }}>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((row, i) => (
                  <TableRow key={i} hover>
                    {['RecNo', 'JobNo', 'PONo', 'BuyerItem', 'ManuSize', 'CustSize', 'Balance'].map((col) => (
                      <TableCell key={col}>{row[col] != null ? String(row[col]) : ''}</TableCell>
                    ))}
                    <TableCell sx={{ textAlign: 'center', position: 'sticky', right: 0, backgroundColor: '#ffffff', borderLeft: '1px solid #eee' }}>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<DeleteIcon />}
                        sx={{ textTransform: 'none' }}
                        onClick={() => handleDelete(row)}
                      >
                        Xóa
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Dùng Dialog (Popup) thay vì hiển thị trực tiếp bên dưới */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2, padding: 1 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1B5E20', display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckIcon /> Xác Nhận Giao Hàng
        </DialogTitle>
        <DialogContent dividers>
          {activeRow && (() => {
            const numQty = Number(manualQty);
            const isOver = numQty > activeRow.Balance;

            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <Box sx={{ backgroundColor: '#f1f8e9', p: 2, borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">Mã PO / SO:</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{activeRow.JobNo}</Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Size hiện tại:</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {activeRow.ManuSize}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Số lượng còn lại (Balance): <Box component="span" sx={{ color: '#d32f2f', fontWeight: 700 }}>{activeRow.Balance}</Box></Typography>
                </Box>

                <TextField
                  label="Nhập số lượng giao (Qty)"
                  type="number"
                  variant="outlined"
                  fullWidth
                  autoFocus
                  error={isOver}
                  helperText={isOver ? `Không thể vượt quá Balance (${activeRow.Balance})` : ' '}
                  value={manualQty}
                  onChange={(e) => setManualQty(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      if (!String(manualQty).trim() || Number(manualQty) <= 0 || (activeRow && Number(manualQty) > activeRow.Balance)) return;
                      e.preventDefault();
                      document.getElementById('btn-save-manual')?.click();
                    }
                  }}
                  InputProps={{ 
                    inputProps: { min: 1, max: activeRow.Balance > 0 ? activeRow.Balance : undefined },
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          id="btn-save-manual"
                          variant="contained"
                          color="success"
                          sx={{ fontWeight: 800, px: 3, py: 1, borderRadius: 1 }}
                          disabled={!String(manualQty).trim() || Number(manualQty) <= 0 || (activeRow && Number(manualQty) > activeRow.Balance)}
                          onClick={async () => {
                            if (!activeRow) return;
                            try {
                              const xmlString = buildXml(activeRow, manualQty);
                              
                              await deliveryScanService.confirmManualDelivery(xmlString);
                              
                              showSnack('Xác nhận giao hàng thành công!');
                              setDialogOpen(false);
                              setManualQty('');
                              
                              if (selectedPO) {
                                await loadDetails(selectedPO);
                              }
                            } catch (err: any) {
                              showSnack('Lỗi giao hàng: ' + err.message, 'error');
                            }
                          }}
                        >
                          LƯU
                        </Button>
                      </InputAdornment>
                    )
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { pr: 0.5 } }}
                />
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Hủy Bỏ / Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Sửa số lượng */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, padding: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon /> Sửa Số Lượng
        </DialogTitle>
        <DialogContent dividers>
          {editRow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box sx={{ backgroundColor: '#e8f5e9', p: 2, borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">JobNo:</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{editRow.JobNo}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>PONo:</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{editRow.PONo}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Qty hiện tại:</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#d32f2f' }}>{editRow.Qty}</Typography>
              </Box>
              <TextField
                label="Nhập số lượng mới"
                type="number"
                variant="outlined"
                fullWidth
                autoFocus
                value={editQty}
                onChange={(e) => setEditQty(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (!String(editQty).trim() || Number(editQty) <= 0) return;
                    e.preventDefault();
                    document.getElementById('btn-update-qty')?.click();
                  }
                }}
                InputProps={{ 
                  inputProps: { min: 1 },
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        id="btn-update-qty"
                        variant="contained"
                        color="success"
                        sx={{ fontWeight: 800, px: 3, py: 1, borderRadius: 1 }}
                        disabled={!String(editQty).trim() || Number(editQty) <= 0}
                        onClick={handleEditConfirm}
                      >
                        CẬP NHẬT
                      </Button>
                    </InputAdornment>
                  )
                }}
                sx={{ '& .MuiOutlinedInput-root': { pr: 0.5 } }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>Hủy / Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog (thay window.confirm) */}
      <Dialog
        open={confirmDlg.open}
        onClose={() => setConfirmDlg(prev => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#e65100', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon /> Xác nhận
        </DialogTitle>
        <DialogContent>
          <Typography>{confirmDlg.message}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDlg(prev => ({ ...prev, open: false }))} color="inherit" sx={{ fontWeight: 600 }}>Hủy</Button>
          <Button variant="contained" color="error" sx={{ fontWeight: 700 }} onClick={confirmDlg.onConfirm}>Đồng ý</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar thông báo (thay alert) */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: 2, fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

interface PackDialogProps {
  open: boolean;
  item: PackingPlanItem | null;
  packTypes: PackType[];
  usedCrates: string[];
  onClose: () => void;
  onConfirm: (item: PackingPlanItem, typeCode: string, barcode: string) => Promise<void>;
}

function PackDialog({ open, item, packTypes, usedCrates, onClose, onConfirm }: PackDialogProps) {
  const [selectedPackType, setSelectedPackType] = useState('');
  const [crateBarcode, setCrateBarcode] = useState('');
  const [crateValidating, setCrateValidating] = useState(false);
  const [crateError, setCrateError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedPackType('');
      setCrateBarcode('');
      setCrateError('');
      setIsScanning(false);
      setCrateValidating(false);
    }
  }, [open, item]);

  const handlePackConfirm = async () => {
    if (!item || !selectedPackType) return;
    
    const trimmedBarcode = crateBarcode.trim();
    if (usedCrates.includes(trimmedBarcode)) {
      setCrateError('❌ Mã thùng nhựa này đang được dùng trong Hàng Chờ!');
      return;
    }

    setCrateValidating(true);
    setCrateError('');
    try {
      const result = await autoDeliveryService.validateCrate(crateBarcode);
      if (!result.valid) {
        setCrateError(result.message || 'Mã thùng nhựa không hợp lệ');
        setCrateValidating(false);
        return;
      }
    } catch {
      setCrateError('Lỗi khi kiểm tra mã thùng');
      setCrateValidating(false);
      return;
    }
    setCrateValidating(false);
    await onConfirm(item, selectedPackType, crateBarcode.trim());
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #e0e0e0' }}>
        <AutoIcon /> Giao Thùng #{item?.cartonNo}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {item && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            {/* Carton Info */}
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: '#f1f8e9', border: '1px solid #c8e6c9' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Thùng số</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>#{item.cartonNo}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Tổng PCS</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#2e7d32' }}>{item.totalPcs}</Typography>
                </Box>
              </Box>
            </Paper>

            {/* Size Breakdown */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Chi tiết Size trong thùng:</Typography>
              <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1.5 } }}>
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Size</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Số lượng</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {item.sizes.map(s => (
                    <TableRow key={s.size}>
                      <TableCell><Chip label={s.size} size="small" sx={{ fontWeight: 700 }} /></TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>{s.qty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            {/* Pack Type Visual Selector */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Chọn loại rổ/thùng/partition:</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1.5 }}>
                {packTypes.map(pt => (
                  <Paper
                    key={pt.code}
                    elevation={0}
                    onClick={() => setSelectedPackType(pt.code)}
                    sx={{
                      cursor: 'pointer',
                      border: selectedPackType === pt.code ? '2px solid #2e7d32' : '1px solid #e0e0e0',
                      bgcolor: selectedPackType === pt.code ? '#e8f5e9' : '#fff',
                      textAlign: 'center',
                      borderRadius: 2,
                      overflow: 'hidden',
                      transition: 'all 0.15s ease',
                      '&:active': { transform: 'scale(0.95)' }
                    }}
                  >
                    {pt.pic ? (
                      <Box
                        component="img"
                        src={`http://192.168.1.248/F2SDelivery_PartitionType/${pt.pic}`}
                        alt={pt.name}
                        sx={{ height: 80, width: '100%', objectFit: 'contain', bgcolor: '#fff', borderBottom: '1px solid #eee' }}
                        onError={(e: any) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <Box sx={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', borderBottom: '1px solid #eee' }}>
                        <Typography variant="caption" color="text.secondary">NO IMAGE</Typography>
                      </Box>
                    )}
                    <Box sx={{ p: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: selectedPackType === pt.code ? '#2e7d32' : 'inherit' }}>
                        {pt.name}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>

            {/* Crate Barcode */}
            <TextField
              label="Scan mã thùng nhựa"
              placeholder="Quét hoặc nhập mã thùng nhựa..."
              value={crateBarcode}
              onChange={(e) => { setCrateBarcode(e.target.value); setCrateError(''); }}
              onKeyDown={(e) => { 
                if (e.key === 'Enter') { 
                  e.preventDefault(); 
                  e.currentTarget.blur(); // Hide keyboard
                  handlePackConfirm(); 
                } 
              }}
              error={!!crateError}
              helperText={crateError || ' '}
              fullWidth
              size="small"
              autoFocus
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {crateValidating && <CircularProgress size={18} sx={{ mr: 1 }} />}
                    <IconButton size="small" onClick={() => setIsScanning(!isScanning)} edge="end" color={isScanning ? 'success' : 'default'}>
                      <CameraIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />

            {/* HTML5 QR Scanner */}
            {isScanning && (
              <Box sx={{ mt: 1, borderRadius: 2, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                <Html5QrcodePlugin
                  fps={10}
                  qrbox={250}
                  disableFlip={false}
                  qrCodeSuccessCallback={(decodedText) => {
                    setCrateBarcode(decodedText);
                    setCrateError('');
                    setIsScanning(false);
                  }}
                  onClose={() => setIsScanning(false)}
                />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>Hủy</Button>
        <Button
          variant="contained"
          onClick={handlePackConfirm}
          disabled={!selectedPackType || !crateBarcode.trim() || crateValidating}
          sx={{
            fontWeight: 700, borderRadius: 1.5, px: 3, textTransform: 'none',
            background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
            '&:hover': { background: '#1b5e20' },
          }}
        >
          {crateValidating ? 'Đang kiểm tra...' : 'Giao Hàng'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AutoTab() {
  const { t } = useTranslation();
  const [poValue, setPoValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [activePO, setActivePO] = useState<string | null>(null);

  // PO Autocomplete state
  const [poOptions, setPoOptions] = useState<string[]>([]);
  const [poSearching, setPoSearching] = useState(false);


  // Data
  const [sewingOutput, setSewingOutput] = useState<SewingOutputItem[]>([]);
  const [packingPlan, setPackingPlan] = useState<PackingPlanItem[]>([]);
  const [packTypes, setPackTypes] = useState<PackType[]>([]);
  const [showAllCartons, setShowAllCartons] = useState(false);

  // Pack Dialog
  const [packDlgOpen, setPackDlgOpen] = useState(false);
  const [packDlgItem, setPackDlgItem] = useState<PackingPlanItem | null>(null);

  // Queue
  const [queue, setQueue] = useState<PackQueueItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' });
  const closeSnack = useCallback(() => setSnack(prev => ({ ...prev, open: false })), []);

  // Load pack types on mount
  useEffect(() => {
    autoDeliveryService.getPackTypes().then(setPackTypes).catch(() => {});
  }, []);

  // Compute remaining balance after queue deductions
  const effectiveBalance = useMemo(() => {
    const deductions: Record<string, number> = {};
    for (const qi of queue) {
      for (const s of qi.sizes) {
        deductions[s.size] = (deductions[s.size] || 0) + s.qty;
      }
    }
    return sewingOutput.map(s => ({
      ...s,
      balance: s.balance - (deductions[s.size] || 0),
    }));
  }, [sewingOutput, queue]);

  // Determine which cartons are packable
  const cartonStatus = useMemo(() => {
    const balMap: Record<string, number> = {};
    for (const s of effectiveBalance) {
      balMap[s.size] = s.balance;
    }
    return packingPlan.map(ctn => {
      if (ctn.packStt !== 'New') return 'packed';
      if (queue.some(q => q.cartonNo === ctn.cartonNo)) return 'queued';
      const allFit = ctn.sizes.every(s => (balMap[s.size] || 0) >= s.qty);
      return allFit ? 'ready' : 'insufficient';
    });
  }, [packingPlan, effectiveBalance, queue]);

  // Filtered packing plan based on toggle
  const filteredPackingPlan = useMemo(() => {
    if (showAllCartons) return packingPlan.map((ctn, idx) => ({ ctn, idx }));
    return packingPlan.map((ctn, idx) => ({ ctn, idx })).filter(({ idx }) => cartonStatus[idx] !== 'packed');
  }, [packingPlan, cartonStatus, showAllCartons]);

  // Memoize usedCrates to avoid re-creating array every render
  const usedCrates = useMemo(() => queue.map(q => q.crateBarcode), [queue]);

  // Memoize total scan out
  const totalScanOut = useMemo(() => sewingOutput.reduce((acc, curr) => acc + curr.qtyScanOut, 0), [sewingOutput]);

  const loadDeliveryData = useCallback(async (targetPo: string) => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (!targetPo) return;
    setLoading(true);
    try {
      const data = await autoDeliveryService.getAutoDeliveryData(targetPo);
      setSewingOutput(data.sewingOutput);
      setPackingPlan(data.packingPlan);
      setActivePO(targetPo);
      setQueue([]);
    } catch {
      setSnack({ open: true, msg: 'Lỗi khi tải dữ liệu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Search for PO suggestions (Only triggered when pressing Enter or Search Button)
  const executePoSearch = useCallback(async (targetPo: string) => {
    const term = targetPo.trim();
    if (!term) return;
    setPoSearching(true);
    setPoOptions([]); // Reset options
    try {
      const res = await autoDeliveryService.searchPOs(term);
      if (res.length === 0) {
        setSnack({ open: true, msg: 'Không tìm thấy mã PO nào khớp', severity: 'error' });
      } else if (res.length === 1 && res[0] === term) {
        // Gõ full y xì đúc 100% -> Tự động load dữ liệu luôn cho lẹ, khỏi bắt sếp click 2 lần
        setPoOptions([]);
        loadDeliveryData(term);
      } else {
        // Nếu gõ thiếu / dư, show danh sách PO gợi ý
        setPoOptions(res);
      }
    } catch (err) {
      setSnack({ open: true, msg: 'Lỗi API: Không kết nối được Backend (Chưa restart BE?)', severity: 'error' });
    } finally {
      setPoSearching(false);
    }
  }, [loadDeliveryData]);

  const openPackDialog = useCallback((item: PackingPlanItem) => {
    setPackDlgItem(item);
    setPackDlgOpen(true);
  }, []);

  const closePackDialog = useCallback(() => setPackDlgOpen(false), []);

  const handleDialogConfirm = useCallback(async (item: PackingPlanItem, typeCode: string, barcode: string) => {
    const queueItem: PackQueueItem = {
      cartonNo: item.cartonNo,
      cartonIndex: item.cartonIndex,
      ctnSeriNo: item.ctnSeriNo,
      sizes: item.sizes,
      totalPcs: item.totalPcs,
      packTypeCode: typeCode,
      crateBarcode: barcode,
    };
    setQueue(prev => [...prev, queueItem]);
    setPackDlgOpen(false);
    setSnack({ open: true, msg: `Thùng #${item.cartonNo} đã vào hàng chờ`, severity: 'success' });
  }, []);

  const removeFromQueue = useCallback((cartonNo: number) => {
    setQueue(prev => prev.filter(q => q.cartonNo !== cartonNo));
  }, []);

  const handleSaveAllDialog = useCallback(() => {
    if (queue.length === 0) return;
    setConfirmSaveOpen(true);
  }, [queue.length]);

  const closeConfirmDialog = useCallback(() => setConfirmSaveOpen(false), []);

  const handleSaveAll = useCallback(async (callAgv: boolean) => {
    setConfirmSaveOpen(false);
    if (queue.length === 0 || !activePO) return;
    setSaving(true);
    try {
      const result = await autoDeliveryService.confirmAutoPack(activePO, queue, callAgv);
      if (result.success) {
        setSnack({ open: true, msg: result.message || 'Lưu thành công!', severity: 'success' });
        // Mark packed in local state
        setPackingPlan(prev => prev.map(p =>
          queue.some(q => q.cartonNo === p.cartonNo) ? { ...p, packStt: p.ctnSeriNo } : p
        ));
        // Update sewing output balance
        const deductions: Record<string, number> = {};
        for (const qi of queue) {
          for (const s of qi.sizes) {
            deductions[s.size] = (deductions[s.size] || 0) + s.qty;
          }
        }
        setSewingOutput(prev => prev.map(s => ({
          ...s,
          qtyPacked: s.qtyPacked + (deductions[s.size] || 0),
          balance: s.balance - (deductions[s.size] || 0),
        })));
        setQueue([]);
      } else {
        setSnack({ open: true, msg: 'Lưu thất bại', severity: 'error' });
      }
    } catch {
      setSnack({ open: true, msg: 'Lỗi khi lưu dữ liệu', severity: 'error' });
    } finally {
      setSaving(false);
    }
  }, [activePO, queue]);

  const handleSaveAgv = useCallback(() => handleSaveAll(true), [handleSaveAll]);
  const handleSaveNoAgv = useCallback(() => handleSaveAll(false), [handleSaveAll]);
  const handleToggleShowAll = useCallback((_: any, v: boolean) => setShowAllCartons(v), []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* ── Step 1: PO Input ── */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2e7d32', mb: 1, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 1 }}>
          <SearchIcon fontSize="small" /> {t('f2s.step1.inputPo', 'Bước 1: Nhập số PO')}
        </Typography>
        <Paper elevation={0} sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: '100%', maxWidth: '100%', borderRadius: 2, border: '1px solid #e0e0e0' }}>
          <Autocomplete
            freeSolo
            disableClearable
            options={poOptions}
            value={poValue}
            autoHighlight
            onInputChange={(_, val, reason) => {
              setPoValue(val);
              // Hide options ONLY when user physically types a new string
              if (reason === 'input' && poOptions.length > 0) setPoOptions([]);
            }}
            onChange={(_, val, reason) => {
              if (!val || typeof val !== 'string') return;
              if (reason === 'selectOption') {
                // Nhấn vào PO có sẵn
                setPoValue(val);
                setTimeout(() => loadDeliveryData(val), 50);
              } else if (reason === 'createOption') {
                // Gõ xong Enter
                executePoSearch(val);
              }
            }}
            sx={{ flex: 1 }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={t('f2s.step1.placeholder', 'Nhập phần đuôi hoặc toàn bộ số PO...')}
                variant="outlined"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  sx: { 
                    '& fieldset': { border: 'none' }, 
                    bgcolor: 'transparent'
                  },
                  endAdornment: params.InputProps.endAdornment,
                }}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter') {
                    // Nếu chưa có options nào (tức là đang gõ để search), thì gọi thẳng hàm search.
                    // Nếu đã có options (đang hiện dropdown dropdown), cứ để MUI nội bộ nhận phím Enter để "chọn" (fires onChange with selectOption).
                    if (poOptions.length === 0) {
                      e.preventDefault();
                      executePoSearch(poValue);
                    }
                  }
                }}
              />
            )}
          />
          <Button 
            onClick={() => {
              if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
              executePoSearch(poValue);
            }} 
            disabled={loading || poSearching} 
            sx={{ minWidth: 40, height: 40, p: 0, color: '#2e7d32', borderRadius: 2 }}
          >
            {loading || poSearching ? <CircularProgress size={20} /> : <SearchIcon />}
          </Button>
        </Paper>
      </Box>

      {/* ── Step 2: Dual Tables ── */}
      {activePO && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.6fr' }, gap: 2 }}>
          {/* Left: Sewing Output */}
          <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
            <Box sx={{ p: 1.5, bgcolor: '#e8f5e9', borderBottom: '1px solid #c8e6c9', display: 'flex', alignItems: 'center', gap: 1 }}>
              <ListIcon sx={{ fontSize: 18, color: '#2e7d32' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2e7d32' }}>{t('f2s.auto.qtyLine', 'Qty Chuyền')} (PO: {activePO})</Typography>
              <Chip 
                label={`${t('f2s.auto.totalQty', 'Tổng Lên:')} ${totalScanOut}`} 
                size="small" 
                sx={{ ml: 'auto', fontWeight: 700, bgcolor: '#fff', color: '#1565c0', border: '1px solid #bbdefb' }} 
              />
            </Box>
            <TableContainer>
              <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.75, px: 1.5, fontSize: '0.8rem' } }}>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>{t('f2s.auto.size', 'Size')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>{t('f2s.auto.poQty', 'PO Qty')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>{t('f2s.auto.scanOut', 'Scan Out')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>{t('f2s.auto.packed', 'Đã Giao')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>{t('f2s.auto.balance', 'Còn Lại')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {effectiveBalance.map((row) => (
                    <TableRow key={row.size} hover>
                      <TableCell><Chip label={row.size} size="small" sx={{ fontWeight: 700, minWidth: 36 }} /></TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600, color: '#1976d2' }}>{row.qtyPo}</TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {row.qtyScanOut < row.qtyPo ? (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, color: '#d32f2f' }}>
                            <WarningIcon sx={{ fontSize: 16 }} titleAccess={t('f2s.auto.insufficientScan', 'Thiếu hàng so với Qty PO')} />
                            {row.qtyScanOut}
                          </Box>
                        ) : (
                          row.qtyScanOut
                        )}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600, color: '#64748b' }}>{row.qtyPacked + ((sewingOutput.find(s => s.size === row.size)?.balance ?? 0) - row.balance)}</TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 800, color: row.balance > 0 ? '#2e7d32' : '#d32f2f' }}>{row.balance}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Right: Packing Plan */}
          <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
            <Box sx={{ p: 1.5, bgcolor: '#e8f5e9', borderBottom: '1px solid #c8e6c9', display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoIcon sx={{ fontSize: 18, color: '#2e7d32' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2e7d32' }}>{t('f2s.auto.packingPlan', 'Packing Plan')}</Typography>
              <Chip label={`${filteredPackingPlan.length}/${packingPlan.length} ${t('f2s.auto.cartons', 'thùng')}`} size="small" sx={{ fontWeight: 700, bgcolor: '#fff', color: '#2e7d32', border: '1px solid #c8e6c9' }} />
              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b' }}>{t('f2s.auto.showAll', 'Tất cả')}</Typography>
                <Switch size="small" checked={showAllCartons} onChange={handleToggleShowAll} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#2e7d32' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#81c784' } }} />
              </Box>
            </Box>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.75, px: 1.5, fontSize: '0.8rem' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5' }}>{t('f2s.auto.ctn', 'CTN')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5' }}>{t('f2s.auto.sizes', 'Sizes')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'right' }}>{t('f2s.auto.pcs', 'PCS')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center' }}>{t('f2s.auto.status', 'Trạng Thái')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5', textAlign: 'center' }}>{t('f2s.auto.action', 'Thao Tác')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPackingPlan.map(({ ctn, idx }) => {
                    const status = cartonStatus[idx];
                    const isReady = status === 'ready';
                    const isQueued = status === 'queued';
                    const isPacked = status === 'packed';
                    return (
                      <TableRow key={ctn.cartonNo} hover sx={{
                        bgcolor: isPacked ? '#f1f8e9' : isQueued ? '#fff8e1' : isReady ? '#fff' : '#fafafa',
                        opacity: (isPacked || !isReady && !isQueued) ? 0.7 : 1,
                      }}>
                        <TableCell sx={{ fontWeight: 700 }}>{ctn.cartonNo}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {ctn.sizes.map(s => (
                              <Box key={s.size} sx={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: 1, overflow: 'hidden' }}>
                                <Box sx={{ px: 0.75, py: 0.25, bgcolor: '#e3f2fd', fontWeight: 800, color: '#1565c0', borderRight: '1px solid #bbdefb', fontSize: '0.75rem' }}>{s.size}</Box>
                                <Box sx={{ px: 0.75, py: 0.25, bgcolor: '#fff', fontWeight: 600, color: '#475569', fontSize: '0.7rem' }}>{s.custSize || '-'}</Box>
                              </Box>
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>{ctn.totalPcs}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          {isPacked && <Chip label={t('f2s.auto.sttPacked', 'Đã Giao')} size="small" sx={{ fontWeight: 700, bgcolor: '#f1f8e9', color: '#7cb342', border: '1px solid #c5e1a5', fontSize: '0.75rem', minWidth: 70 }} />}
                          {isQueued && <Chip label={t('f2s.auto.sttQueued', 'Hàng Chờ')} size="small" sx={{ fontWeight: 700, bgcolor: '#fff8e1', color: '#f57f17', border: '1px solid #ffe082', fontSize: '0.75rem', minWidth: 70 }} />}
                          {isReady && <Chip label={t('f2s.auto.sttReady', 'ĐỦ HÀNG')} size="small" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)', color: '#fff', fontSize: '0.75rem', boxShadow: '0 2px 6px rgba(76,175,80,0.4)', minWidth: 70 }} />}
                          {status === 'insufficient' && <Chip label={t('f2s.auto.sttInsufficient', 'THIẾU')} size="small" sx={{ fontWeight: 700, bgcolor: '#fafafa', color: '#d32f2f', border: '1px dashed #ef9a9a', fontSize: '0.75rem', minWidth: 70 }} />}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Button
                            variant={isReady ? 'contained' : 'outlined'}
                            size="small"
                            disabled={!isReady}
                            onClick={() => openPackDialog(ctn)}
                            sx={{
                              textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', borderRadius: 1.5, minWidth: 64,
                              ...(isReady ? { background: 'linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)', color: '#fff',
                                '&:hover': { background: '#1b5e20' } } : {}),
                            }}
                          >
                            {isReady ? t('f2s.auto.btnSelect', 'Chọn') : isPacked ? t('f2s.auto.btnDone', 'Xong') : isQueued ? t('f2s.auto.btnQueued', 'Chờ') : t('f2s.auto.btnMissing', 'Thiếu')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* ── Step 4: Queue ── */}
      {activePO && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: queue.length > 0 ? '2px solid #f59e0b' : '2px dashed #cbd5e1', bgcolor: queue.length > 0 ? '#fffbeb' : '#f8fafc' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: queue.length > 0 ? '#92400e' : '#475569', display: 'flex', alignItems: 'center', gap: 1 }}>
              🛒 {t('f2s.auto.queueTitle', 'Hàng Chờ')} ({queue.length} {t('f2s.auto.cartons', 'thùng')})
            </Typography>
            <Button
              variant="contained"
              size="small"
              disabled={saving || queue.length === 0}
              onClick={handleSaveAllDialog}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
              sx={{
                textTransform: 'none', fontWeight: 700, borderRadius: 1.5, px: 3,
                background: queue.length > 0 ? 'linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)' : '#e2e8f0',
                color: queue.length > 0 ? '#fff' : '#94a3b8',
                boxShadow: queue.length > 0 ? '0 2px 8px rgba(46,125,50,0.3)' : 'none',
                '&:hover': { background: queue.length > 0 ? '#1b5e20' : '#e2e8f0' },
              }}
            >
              {saving ? t('f2s.auto.btnSaving', 'Đang lưu...') : t('f2s.auto.btnSaveAll', 'Lưu Tất Cả')}
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {queue.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#64748b', fontStyle: 'italic', py: 1 }}>
                {t('f2s.auto.queueEmpty', 'Chưa có thùng nào được chọn. Hãy "Chọn" thùng từ Packing Plan ở trên.')}
              </Typography>
            ) : (
              queue.map(q => (
                <Chip
                  key={q.cartonNo}
                  label={`CTN-${q.cartonNo} · ${q.totalPcs}pcs · Type ${q.packTypeCode} · ${q.crateBarcode}`}
                  onDelete={() => removeFromQueue(q.cartonNo)}
                  sx={{
                    fontWeight: 600, fontSize: '0.8rem', height: 32,
                    bgcolor: '#fff', border: '1px solid #f59e0b', color: '#92400e',
                    '& .MuiChip-deleteIcon': { color: '#dc2626', '&:hover': { color: '#991b1b' } },
                  }}
                />
              ))
            )}
          </Box>
        </Paper>
      )}

      {/* ── Pack Dialog ── */}
      <PackDialog
        open={packDlgOpen}
        item={packDlgItem}
        packTypes={packTypes}
        usedCrates={usedCrates}
        onClose={closePackDialog}
        onConfirm={handleDialogConfirm}
      />

      {/* ── Confirm Save Dialog ── */}
      <Dialog open={confirmSaveOpen} onClose={closeConfirmDialog} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#1b5e20', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarningIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
          Xác nhận Giao Nhận
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ fontSize: '1.05rem', color: '#374151' }}>
            Bạn có chắc chắn muốn chốt và đẩy <strong>{queue.length} thùng</strong> hàng này xuống hệ thống không?
          </Typography>
          <Typography variant="body2" sx={{ mt: 1.5, color: '#6b7280', bgcolor: '#f3f4f6', p: 1.5, borderRadius: 2 }}>
            Hãy chọn hình thức giao hàng (Có báo xe AGV tới lấy hay không).
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button 
            onClick={handleSaveAgv} 
            variant="contained" 
            fullWidth 
            sx={{ 
              fontWeight: 700, borderRadius: 2, py: 1.2, fontSize: '1rem', textTransform: 'none',
              background: 'linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)',
              boxShadow: '0 4px 12px rgba(46,125,50,0.3)'
            }}
          >
            🚀 Giao Nhận & GỌI XE AGV
          </Button>
          <Button 
            onClick={handleSaveNoAgv} 
            variant="outlined" 
            color="success" 
            fullWidth 
            sx={{ fontWeight: 700, borderRadius: 2, py: 1, textTransform: 'none', borderWidth: 2, '&:hover': { borderWidth: 2 } }}
          >
            📦 Chỉ Giao Kho (Không gọi xe)
          </Button>
          <Button 
            onClick={closeConfirmDialog} 
            color="inherit" 
            fullWidth 
            sx={{ fontWeight: 600, textTransform: 'none', mt: 0.5, color: '#6b7280' }}
          >
            Hủy thao tác
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={closeSnack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={closeSnack}
          severity={snack.severity}
          sx={{ width: '100%', borderRadius: 2, fontWeight: 600 }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ─── Main Page ───
export default function DeliverPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ pb: { xs: 10, sm: 12, md: 4 }, px: { xs: 0, sm: 1, md: 0 }, pt: { xs: 0.5, md: 1 } }}>

      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            borderBottom: '1px solid #e0e0e0',
            '& .MuiTab-root': { fontWeight: 600, fontSize: '0.9rem', minHeight: 52 },
            '& .Mui-selected': { color: '#2e7d32 !important' },
            '& .MuiTabs-indicator': { backgroundColor: '#2e7d32' },
          }}
        >
          <Tab icon={<ManualIcon />} iconPosition="start" label="Giao Thủ Công" />
          <Tab icon={<AutoIcon />} iconPosition="start" label="Giao Auto (AGV)" />
        </Tabs>
        <Box sx={{ p: { xs: 1, md: 2 } }}>
          {tab === 0 && <ManualTab />}
          {tab === 1 && <AutoTab />}
        </Box>
      </Paper>
    </Box>
  );
}
