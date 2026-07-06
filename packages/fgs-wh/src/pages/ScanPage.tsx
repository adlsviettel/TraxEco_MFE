import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Chip,
  useTheme,
  Autocomplete,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import {
  QrCodeScanner as ScannerIcon,
  Inventory2 as BoxIcon,
  Business as CustomerIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { customerService, type Customer } from '../services/customerService';
import { packService } from '../services/packService';
import { authFetch } from '@traxeco/shared';
import { factoryPermissionService } from '../services/factoryPermissionService';
import GenesisScanView from '../components/GenesisScanView';
import DefaultScanView from '../components/DefaultScanView';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

interface HistoryRow {
  PONo: string;
  CTNBarCode: string;
  CTNNo: number;
  PLQty: number;
  PackedQty: number;
  CTNSeriNo: string;
  SysCreateDate: string;
  FacLine: string;
  Comment1: string | null;
  ReScan: number | null;
}

export default function ScanPage() {
  const theme = useTheme();
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  // Customer state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Today's pack history from InlineFGsWHCTNMaster
  const [todayHistory, setTodayHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Factory & FacLine state
  const [factories, setFactories] = useState<string[]>([]);
  const [facLines, setFacLines] = useState<string[]>([]);
  const [selectedFactory, setSelectedFactory] = useState(localStorage.getItem('selectedFactory') || '');
  const [facLine, setFacLine] = useState(localStorage.getItem('selectedFacLine') || '');

  // Fetch customers on mount and restore saved selection
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const data = await customerService.getAll();
        setCustomers(data);

        const savedId = localStorage.getItem('selectedCustomerId');
        if (savedId) {
          const found = data.find((c) => c.custmId === Number(savedId));
          if (found) setSelectedCustomer(found);
        }
      } catch (err) {
        console.error('Failed to load customers:', err);
      } finally {
        setLoadingCustomers(false);
      }
    };
    fetchCustomers();
    // Fetch factories
    factoryPermissionService.getAllFactories()
      .then(data => setFactories(data))
      .catch(err => console.error('Failed to load factories:', err));
    // Fetch FacLines
    authFetch(`${API_BASE_URL}/pack/faclines`)
      .then((r: Response) => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then((data: any) => {
        if (Array.isArray(data)) {
          setFacLines(data);
          // Auto-select first FacLine if none saved or saved doesn't match
          const savedFac = localStorage.getItem('selectedFactory') || '';
          const savedLine = localStorage.getItem('selectedFacLine') || '';
          const matched = savedFac ? data.filter((f: string) => f.startsWith(savedFac)) : data;
          if (!savedLine || !matched.includes(savedLine)) {
            const first = matched.length > 0 ? matched[0] : '';
            setFacLine(first);
            if (first) localStorage.setItem('selectedFacLine', first);
          }
        }
      })
      .catch((err: any) => console.error('Failed to load faclines:', err));
  }, []);

  // Focus input when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      inputRef.current?.focus();
    }
  }, [selectedCustomer]);

  // Fetch today's pack history
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await packService.getTodayHistory();
      setTodayHistory(Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []));
    } catch (err) {
      console.error('Failed to load today history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const isGenesis = selectedCustomer?.custmName === 'Genesis';

  return (
    <Paper elevation={0} sx={{ p: 1, bgcolor: 'transparent', flexGrow: 1, height: '100%' }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        <Grid size={{ xs: 12 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ p: 0.5, flexGrow: 1, display: 'flex', flexDirection: 'column', '& > *:not(:last-child)': { mb: 1.5 }, minHeight: 0, overflow: 'auto' }}>
      {/* ── Header + Customer/Factory Selection ── */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: 2.5,
          border: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #f8faf8 0%, #ffffff 100%)',
          display: 'flex', flexDirection: 'column', gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>


          {/* Customer Autocomplete */}
          <Autocomplete
            options={customers}
            getOptionLabel={(option) => option.custmName}
            value={selectedCustomer}
            onChange={(_event, newValue) => {
              setSelectedCustomer(newValue);
              if (newValue) {
                localStorage.setItem('selectedCustomerId', String(newValue.custmId));
              } else {
                localStorage.removeItem('selectedCustomerId');
              }
            }}
            loading={loadingCustomers}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={t('scan.searchCustomer')}
                variant="outlined"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingCustomers ? <CircularProgress color="inherit" size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                  sx: {
                    borderRadius: 1.5,
                    height: 36,
                    fontSize: '0.85rem',
                    backgroundColor: '#fff',
                  },
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.custmId}>
                <CustomerIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1.2rem' }} />
                <Typography sx={{ fontWeight: 500, fontSize: '0.9rem' }}>{option.custmName}</Typography>
              </li>
            )}
            noOptionsText={t('scan.noCustomerFound')}
            sx={{ flex: '1 1 200px', minWidth: 180, maxWidth: 320 }}
          />

          {/* Factory dropdown */}
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel sx={{ fontSize: '0.85rem' }}>Factory</InputLabel>
            <Select
              value={factories.includes(selectedFactory) ? selectedFactory : ''}
              label="Factory"
              onChange={(e) => {
                const fac = e.target.value;
                setSelectedFactory(fac); localStorage.setItem('selectedFactory', fac);
                const matched = fac ? facLines.filter(f => f.startsWith(fac)) : facLines;
                const first = matched.length > 0 ? matched[0] : '';
                setFacLine(first);
                if (first) localStorage.setItem('selectedFacLine', first);
                else localStorage.removeItem('selectedFacLine');
              }}
              sx={{ borderRadius: 1.5, height: 36, fontSize: '0.85rem', backgroundColor: '#fff' }}
            >
              <MenuItem value=""><em>All</em></MenuItem>
              {factories.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </Select>
          </FormControl>

          {/* FacLine dropdown */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel sx={{ fontSize: '0.85rem' }}>FacLine</InputLabel>
            <Select
              value={facLines.includes(facLine) ? facLine : ''}
              label="FacLine"
              onChange={(e) => { setFacLine(e.target.value); localStorage.setItem('selectedFacLine', e.target.value); }}
              sx={{ borderRadius: 1.5, height: 36, fontSize: '0.85rem', backgroundColor: '#fff' }}
            >
              <MenuItem value=""><em>-</em></MenuItem>
              {(selectedFactory ? facLines.filter(f => f.startsWith(selectedFactory)) : facLines).map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {selectedCustomer ? (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}>
          {/* Top Half: Scan Area (Primary Workspace) */}
          <Box sx={{ flexGrow: 1, minHeight: 300, display: 'flex', flexDirection: 'column' }}>
            {isGenesis ? (
              <GenesisScanView customerName={selectedCustomer.custmName} onHistoryRefresh={fetchHistory} />
            ) : (
              <DefaultScanView customer={selectedCustomer} factory={selectedFactory} facLine={facLine} onHistoryRefresh={fetchHistory} />
            )}
          </Box>

          {/* Bottom Half: Today's Pack History from DB (Docked fixed-height log) */}
          <Box sx={{ height: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                📋 {t('scan.scanHistory')}
              </Typography>
              <Chip label={todayHistory.length} size="small" color="primary" sx={{ fontWeight: 700 }} />
            </Box>
            <Paper elevation={0} sx={{ flexGrow: 1, borderRadius: 2, overflow: 'hidden', border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
              {loadingHistory ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : todayHistory.length === 0 ? (
                <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'text.secondary' }}>
                  <BoxIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
                  <Typography variant="h6">{t('scan.noScanData')}</Typography>
                  <Typography variant="body2">{t('scan.noScanHint')}</Typography>
                </Box>
              ) : (
                <Box sx={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, borderBottom: '2px solid #e0e0e0' }}>#</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, borderBottom: '2px solid #e0e0e0' }}>{t('history.col.poNo', 'PO')}</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, borderBottom: '2px solid #e0e0e0' }}>{t('history.col.ctnNo', 'CTN No')}</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, borderBottom: '2px solid #e0e0e0' }}>CTNBarCode</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, borderBottom: '2px solid #e0e0e0' }}>{t('history.col.packedQty', 'Packed Qty')}</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, borderBottom: '2px solid #e0e0e0' }}>{t('history.col.time', 'Time')}</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, borderBottom: '2px solid #e0e0e0' }}>ReScan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayHistory.map((row, idx) => (
                        <tr key={`${row.CTNSeriNo}-${idx}`} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '4px 8px', color: '#999' }}>{idx + 1}</td>
                          <td style={{ padding: '4px 8px', fontWeight: 600 }}>{row.PONo}</td>
                          <td style={{ padding: '4px 8px' }}>{row.CTNNo}</td>
                          <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: '0.75rem' }}>{row.CTNBarCode}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: '#2e7d32' }}>{row.PackedQty}</td>
                          <td style={{ padding: '4px 8px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                            {row.SysCreateDate ? format(new Date(row.SysCreateDate), 'HH:mm:ss') : ''}
                          </td>
                          <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                            {row.ReScan ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#fff3e0', color: '#e65100', padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600 }}>
                                🔄 {row.Comment1 || ''}
                              </span>
                            ) : (
                              <span style={{ color: '#bbb' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      ) : (
        <Paper
          elevation={0}
          sx={{
            p: 8,
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: `1px dashed ${theme.palette.divider}`,
          }}
        >
          <ScannerIcon sx={{ fontSize: 80, opacity: 0.15, mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
            {t('scan.pleaseSelectCustomer')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('scan.selectFromList')}
          </Typography>
        </Paper>
      )}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}
