import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Typography, Paper, TextField, Chip, Button, List, ListItem, ListItemText,
  Alert, CircularProgress, Divider, Snackbar,
} from '@mui/material';
import {
  Archive as PackIcon,
  UsbRounded as UsbIcon,
} from '@mui/icons-material';
import type { Customer } from '../services/customerService';
import { packService } from '../services/packService';
import { useSerialScanner } from '@traxeco/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

interface CartonInfo {
  found: boolean;
  poNo?: string;
  ctnNo?: number;
  packedQty?: number;
  ctnSeriNo?: string;
  packStt?: string; // 'New' or existing CTNSeriNo
}

interface Props {
  customer: Customer;
  factory: string;
  facLine: string;
  onHistoryRefresh?: () => void;
}

export default function DefaultScanView({ customer, factory, facLine, onHistoryRefresh }: Props) {
  const { t } = useTranslation();
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [_packing, setPacking] = useState(false);
  const [rescanMode, setRescanMode] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // Barcode / CodeReader
  const [barcode, setBarcode] = useState('');
  const [barcodeLen, setBarcodeLen] = useState(0);

  // Carton info from API
  const [cartonInfo, setCartonInfo] = useState<CartonInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parsed fields
  const [ctnSeriNo, setCtnSeriNo] = useState('');
  const [ctnBarCode, setCtnBarCode] = useState(''); // full 20-char carton barcode

  // Scan count (SL VÔ / Thùng) - grouped: code -> quantity
  const [scannedItems, setScannedItems] = useState<Record<string, number>>({});

  // Total scanned count
  const totalScanned = Object.values(scannedItems).reduce((s, n) => s + n, 0);

  // Focus code input on mount
  useEffect(() => {
    codeInputRef.current?.focus();
  }, []);

  // Ref for handleBarcodeScan (so serial hook can call latest version)
  const handleBarcodeScanRef = useRef<(v: string) => void>(() => {});

  // Parse barcode using customer config
  const parseBarcode = useCallback((code: string) => {
    if (!code || code.length === 0) return '';
    const startPos = customer.ctnSeriStrPos; // 1-indexed
    const len = customer.ctnSeriCdLn;
    if (code.length < startPos - 1 + len) return '';
    return code.substring(startPos - 1, startPos - 1 + len);
  }, [customer]);

  // Lookup carton info by CTNSeriNo
  const lookupCarton = useCallback(async (seriNo: string) => {
    if (!seriNo) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/pack/carton-info?ctnSeriNo=${encodeURIComponent(seriNo)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('API Error');
      const data: CartonInfo = await res.json();
      setCartonInfo(data);
      if (!data.found) {
        setError(t('defaultScan.notFoundCarton', { seriNo }));
      }
    } catch {
      setError(t('defaultScan.apiError'));
      setCartonInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle barcode scan (Enter or full string pasted)
  const handleBarcodeScan = useCallback((value: string) => {
    const code = value.trim();
    if (!code) return;

    const ctnCodeLen = customer.ctnCodeMnLn; // e.g. 20 for Adidas/Puma

    if (code.length === ctnCodeLen) {
      // ─── CARTON CODE (20 chars) ───
      setBarcodeLen(code.length);
      setCtnBarCode(code); // store full barcode
      const seri = parseBarcode(code);
      setCtnSeriNo(seri);
      setError(null);

      if (seri) {
        lookupCarton(seri);
      } else {
        setError(t('defaultScan.cannotParseCtn', { len: code.length }));
      }
    } else {
      // ─── PRODUCT CODE (hàng) ───
      // Block if carton already packed and not in rescan mode
      if (cartonInfo?.packStt && cartonInfo.packStt !== 'New' && !rescanMode) {
        setError(t('defaultScan.alreadyPacked'));
        if (codeInputRef.current) codeInputRef.current.value = '';
        setTimeout(() => codeInputRef.current?.focus(), 50);
        return;
      }
      const slyc = cartonInfo?.packedQty || 0;
      if (slyc > 0 && totalScanned >= slyc) {
        setError(`Đã đủ ${slyc} sản phẩm! Không thể scan thêm.`);
      } else {
        setError(null);
        const newItems = { ...scannedItems, [code]: (scannedItems[code] || 0) + 1 };
        setScannedItems(newItems);

        // Auto-pack when SLYC == totalScanned
        const newTotal = Object.values(newItems).reduce((s, n) => s + n, 0);
        if (slyc > 0 && newTotal >= slyc && cartonInfo?.found) {
          doPack(newItems);
        }
      }
    }

    // Clear input & re-focus for next scan
    if (codeInputRef.current) codeInputRef.current.value = '';
    setTimeout(() => codeInputRef.current?.focus(), 50);
  }, [parseBarcode, lookupCarton, customer, cartonInfo, totalScanned, scannedItems, rescanMode]);

  // Handle Enter key in code reader
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = codeInputRef.current?.value || '';
      handleBarcodeScan(code);
    }
  }, [handleBarcodeScan]);

  // Keep ref in sync with latest handleBarcodeScan
  useEffect(() => {
    handleBarcodeScanRef.current = handleBarcodeScan;
  }, [handleBarcodeScan]);

  // ─── Web Serial API: COM port scanner ───
  const { status: serialStatus, portName, isSupported: serialSupported, connect: serialConnect, disconnect: serialDisconnect } =
    useSerialScanner({
      baudRate: 9600,
      onBarcode: useCallback((barcode: string) => {
        handleBarcodeScanRef.current(barcode);
      }, []),
    });

  // ─── Pack carton (auto or manual) ───
  const doPack = useCallback(async (items?: Record<string, number>) => {
    const info = cartonInfo;
    if (!info?.found || !info.poNo || !info.ctnSeriNo) return;
    const itemsToUse = items || scannedItems;
    if (Object.keys(itemsToUse).length === 0) {
      setError(t('defaultScan.noItemsInCarton'));
      return;
    }

    setPacking(true);
    setError(null);
    try {
      const payload = {
        poNo: info.poNo,
        ctnBarCode: ctnBarCode, // full 20-char scanned barcode
        ctnNo: info.ctnNo!,
        packedQty: info.packedQty!,
        facLine: facLine || 'F1A00',
        ctnSeriNo: info.ctnSeriNo,
        scannedItems: Object.entries(itemsToUse).map(([code, qty]) => ({
          garmentBarcode: code,
          qty,
        })),
      };
      await packService.packAndPrint(payload);
      setSnackbar({ open: true, message: t('defaultScan.packSuccess', { seriNo: info.ctnSeriNo }), severity: 'success' });

      // Reset form for next carton
      setScannedItems({});
      setCtnSeriNo('');
      setCtnBarCode('');
      setCartonInfo(null);
      setBarcodeLen(0);
      onHistoryRefresh?.();
      codeInputRef.current?.focus();
    } catch {
      setSnackbar({ open: true, message: t('defaultScan.packError'), severity: 'error' });
    } finally {
      setPacking(false);
    }
  }, [cartonInfo, scannedItems, facLine, onHistoryRefresh, ctnBarCode]);

  // Manual pack button
  const handleManualPack = useCallback(async () => {
    await doPack();
  }, [doPack]);

  // Handle ReScan — reset scanned items, allow re-scanning (same as Genesis)
  const handleReScan = useCallback(() => {
    setScannedItems({});
    setError(null);
    setRescanMode(true);
    setTimeout(() => codeInputRef.current?.focus(), 100);
  }, []);

  const handleClear = useCallback(() => {
    setBarcode('');
    if (codeInputRef.current) codeInputRef.current.value = '';
    setBarcodeLen(0);
    setCtnSeriNo('');
    setCtnBarCode('');
    setCartonInfo(null);
    setError(null);
    setScannedItems({});
    setRescanMode(false);
    codeInputRef.current?.focus();
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flexGrow: 1, minHeight: 0 }}>
      {/* Serial port status bar */}
      {serialSupported && (
        <Paper elevation={0} sx={{ px: 2, py: 0.75, borderRadius: 2, border: '1px solid #e0e0e0',
          display: 'flex', alignItems: 'center', gap: 1.5, backgroundColor: '#fafafa' }}>
          <UsbIcon sx={{ fontSize: 18, color: serialStatus === 'connected' ? '#2e7d32' : '#999' }} />
          <Box sx={{
            width: 8, height: 8, borderRadius: '50%',
            backgroundColor: serialStatus === 'connected' ? '#4caf50' : serialStatus === 'connecting' ? '#ff9800' : '#bbb',
            boxShadow: serialStatus === 'connected' ? '0 0 6px #4caf50' : 'none',
          }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: '#555', flex: 1 }}>
            {serialStatus === 'connected' ? `Scanner: ${portName}` :
             serialStatus === 'connecting' ? t('defaultScan.connecting') :
             serialStatus === 'unsupported' ? t('defaultScan.unsupported') :
             t('defaultScan.notConnected')}
          </Typography>
          {serialStatus === 'connected' ? (
            <Button size="small" variant="outlined" color="error" onClick={serialDisconnect}
              sx={{ borderRadius: 1.5, fontWeight: 600, fontSize: '0.7rem', py: 0.25, minWidth: 'auto' }}>
              {t('defaultScan.disconnect')}
            </Button>
          ) : serialStatus !== 'unsupported' && (
            <Button size="small" variant="contained" color="success" onClick={serialConnect} disableElevation
              sx={{ borderRadius: 1.5, fontWeight: 600, fontSize: '0.7rem', py: 0.25, minWidth: 'auto' }}>
              {t('defaultScan.connectScanner')}
            </Button>
          )}
        </Paper>
      )}

      <Box sx={{ display: 'flex', gap: 1.5, flexGrow: 1, minHeight: 0 }}>
      {/* Left: Input fields + info */}
      <Paper elevation={0} sx={{ flex: 1, p: 2, borderRadius: 2, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Row 1: CodeReader */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 90, color: '#555' }}>{t('defaultScan.codeString')}</Typography>
          <Chip label={barcodeLen || '-'} size="small" sx={{ fontWeight: 700, minWidth: 36 }} />
          <TextField
            inputRef={codeInputRef}
            onBlur={() => {
              setTimeout(() => {
                const active = document.activeElement;
                        if (active && active !== document.body) return;
                codeInputRef.current?.focus();
              }, 100);
            }}
            size="small" fullWidth
            defaultValue=""
            onKeyDown={handleKeyDown}
            placeholder={t('defaultScan.scanPlaceholder')}
            autoFocus
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.5, backgroundColor: '#fff', fontFamily: 'monospace', fontSize: '0.9rem',
              },
            }}
          />
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {error && <Alert severity="error" sx={{ borderRadius: 1.5, py: 0.5 }}>{error}</Alert>}

        {/* Carton Info Display */}
        {cartonInfo?.found && (
          <>
            <Divider />
            {/* Row 2: PO */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 90, color: '#555' }}>{t('defaultScan.poNo')}</Typography>
              <Chip label={customer.poNoMnLn} size="small" variant="outlined" sx={{ minWidth: 28 }} />
              <Chip label={customer.poNoMxLn} size="small" variant="outlined" sx={{ minWidth: 28 }} />
              <TextField size="small" value={cartonInfo.poNo || ''} InputProps={{ readOnly: true }}
                sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5, backgroundColor: '#f5f5f5', fontWeight: 700, fontFamily: 'monospace' } }}
              />
            </Box>

            {/* Row 3: Mã số THÙNG + Code thùng gốc */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 90, color: '#555' }}>{t('defaultScan.cartonCode')}</Typography>
              <TextField size="small" value={ctnBarCode} InputProps={{ readOnly: true }}
                sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5, backgroundColor: '#f5f5f5', fontWeight: 700, fontFamily: 'monospace' } }}
              />
              <Chip label={barcodeLen} size="small" sx={{ fontWeight: 700 }} />
            </Box>

            {/* Mã số THÙNG config */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 90, color: '#555' }}>{t('defaultScan.cartonNo')}</Typography>
              <Chip label={customer.ctnCodeMnLn} size="small" variant="outlined" sx={{ minWidth: 28 }} />
              <Chip label={customer.ctnSeriStrPos} size="small" variant="outlined" sx={{ minWidth: 28 }} />
              <Chip label={customer.ctnSeriCdLn} size="small" variant="outlined" sx={{ minWidth: 28 }} />
              <TextField size="small" value={barcode} InputProps={{ readOnly: true }}
                sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5, backgroundColor: '#f5f5f5', fontFamily: 'monospace', fontSize: '0.8rem' } }}
              />
            </Box>

            {/* Row 4: Mã số T.PHẨM */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 90, color: '#555' }}>{t('defaultScan.productCode')}</Typography>
              <Chip label={customer.gmtUpcMnLn} size="small" variant="outlined" sx={{ minWidth: 28 }} />
              <Chip label={customer.gmtUpcMxLn} size="small" variant="outlined" sx={{ minWidth: 28 }} />
            </Box>

            {/* Row: Mã số của PO */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 90, color: '#555' }}>{t('defaultScan.poCode')}</Typography>
              <Chip label={customer.ctnPoCdMnLn} size="small" variant="outlined" sx={{ minWidth: 28 }} />
              <Chip label={customer.ctnPoCdMxLn} size="small" variant="outlined" sx={{ minWidth: 28 }} />
            </Box>

            <Divider />

            {/* Key info row: CTN Number, SLYC, CTNSeriNo, SL VÔ */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#555' }}>{t('defaultScan.ctnNumber')}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#2e7d32', fontFamily: 'monospace' }}>
                  {String(cartonInfo.ctnNo).padStart(2, '0')}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#555' }}>{t('defaultScan.reqQty')}</Typography>
                <Typography variant="h5" sx={{
                  fontWeight: 800, fontFamily: 'monospace',
                  backgroundColor: '#ffeb3b', px: 2, borderRadius: 1, color: '#333',
                }}>
                  {cartonInfo.packedQty}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#555' }}>{t('defaultScan.ctnSeriNo')}</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                  {ctnSeriNo}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#555' }}>{t('defaultScan.packedQty')}</Typography>
                <Typography variant="h5" sx={{
                  fontWeight: 800, fontFamily: 'monospace',
                  backgroundColor: '#ffeb3b', px: 2, borderRadius: 1, color: '#333',
                }}>
                  {totalScanned}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#555' }}>{t('defaultScan.status')}</Typography>
                <Chip
                  label={rescanMode ? t('defaultScan.rescan') : cartonInfo.packStt === 'New' ? t('defaultScan.new') : t('defaultScan.packed')}
                  color={rescanMode ? 'info' : cartonInfo.packStt === 'New' ? 'success' : 'warning'}
                  size="small" sx={{ fontWeight: 700 }}
                />
              </Box>
            </Box>

            <Divider />

            {/* Factory / FacLine display */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label={`${t('account.factory')}: ${factory || '-'}`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
              <Chip label={`FacLine: ${facLine || '-'}`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Button
                variant="contained" color="error" startIcon={<PackIcon />}
                onClick={handleManualPack} size="small" disableElevation
                sx={{ borderRadius: 1.5, fontWeight: 700 }}
              >
                {t('defaultScan.packCarton')}
              </Button>
              {cartonInfo.packStt !== 'New' && !rescanMode && (
                <Button
                  variant="contained" color="warning"
                  onClick={handleReScan} size="small" disableElevation
                  startIcon={<span>🔄</span>}
                  sx={{ borderRadius: 1.5, fontWeight: 700 }}
                >
                  {t('defaultScan.rescan')}
                </Button>
              )}
              <Button
                variant="outlined" onClick={handleClear} size="small"
                sx={{ borderRadius: 1.5, fontWeight: 600, borderColor: '#2e7d32', color: '#2e7d32' }}
              >
                {t('defaultScan.clear')}
              </Button>
            </Box>
          </>
        )}
      </Paper>

      {/* Right: Scanned items list (ô 12) */}
      <Paper elevation={0} sx={{
        width: 280, borderRadius: 2, border: '1px solid #e0e0e0',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <Box sx={{ p: 1, backgroundColor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            📦 {t('defaultScan.itemList')} ({Object.keys(scannedItems).length})
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {Object.keys(scannedItems).length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">
                {cartonInfo?.found ? t('defaultScan.scanItemHint') : t('defaultScan.scanCartonFirst')}
              </Typography>
            </Box>
          ) : (
            <List dense disablePadding>
              {Object.entries(scannedItems).map(([code, count]) => (
                <ListItem key={code} sx={{ borderBottom: '1px solid #f0f0f0', py: 0.5 }}
                  secondaryAction={
                    <TextField
                      size="small" type="number" value={count}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        const slyc = cartonInfo?.packedQty || 0;
                        const otherTotal = totalScanned - count;
                        const maxAllowed = slyc > 0 ? Math.max(0, slyc - otherTotal) : val;
                        const finalVal = slyc > 0 ? Math.min(val, maxAllowed) : val;
                        let newItems: Record<string, number>;
                        if (finalVal === 0) {
                          newItems = { ...scannedItems }; delete newItems[code];
                        } else {
                          newItems = { ...scannedItems, [code]: finalVal };
                        }
                        setScannedItems(newItems);
                        // Auto-pack when total reaches SLYC
                        const newTotal = Object.values(newItems).reduce((s, n) => s + n, 0);
                        if (slyc > 0 && newTotal >= slyc && cartonInfo?.found) {
                          doPack(newItems);
                        }
                      }}
                      inputProps={{ min: 0, style: { textAlign: 'center', width: 40, padding: '2px 4px' } }}
                      sx={{ width: 56, '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                    />
                  }
                >
                  <ListItemText
                    primary={code}
                    primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Paper>

      {/* Snackbar notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          sx={{ width: '100%', fontWeight: 600, borderRadius: 2, boxShadow: 3 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      </Box>
    </Box>
  );
}
