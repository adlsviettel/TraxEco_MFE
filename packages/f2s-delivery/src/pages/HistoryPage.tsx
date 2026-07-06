import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Typography, Paper, Tabs, Tab, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination, Select, MenuItem,
  Chip, CircularProgress, Alert, InputAdornment, useMediaQuery, useTheme,
} from '@mui/material';
import {
  History as HistoryIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  HandshakeOutlined as ManualIcon,
  PrecisionManufacturing as AutoIcon,
} from '@mui/icons-material';
import {
  deliveryHistoryService,
  type ManualDeliveryRecord,
  type AutoDeliveryRecord,
} from '../services/deliveryHistoryService';

// ─── Helpers ───
const today = () => new Date().toISOString().split('T')[0];
const formatDate = (s: string) => {
  if (!s) return '—';
  return new Date(s).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ─── Manual Tab ───
function ManualTab() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [poNo, setPoNo] = useState('');
  const [data, setData] = useState<ManualDeliveryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(0); // MUI TablePagination is 0-indexed
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalElements, setTotalElements] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const hasPo = poNo.trim().length > 0;
      const result = await deliveryHistoryService.getManualHistory(
        hasPo ? undefined : fromDate,
        hasPo ? undefined : toDate,
        poNo || undefined,
        page + 1, // Backend wants 1-indexed
        rowsPerPage
      );
      setData(result.content || []);
      setTotalElements(result.totalElements || 0);
      setSearched(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, poNo, page, rowsPerPage]);

  // Removed auto-fetch on mount: Let user click search.

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
      {/* Filter bar */}
      <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 2.5, border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #f8faf8 0%, #ffffff 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            label="Từ ngày"
            type="date"
            size="small"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: isMobile ? '100%' : 160, '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem' } }}
          />
          <TextField
            label="Đến ngày"
            type="date"
            size="small"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: isMobile ? '100%' : 160, '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem' } }}
          />
          <TextField
            label="Tìm PO"
            size="small"
            value={poNo}
            onChange={e => setPoNo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder={t('f2s.history.searchPOPlaceholder')}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }}
            sx={{ width: isMobile ? '100%' : 200, '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem' } }}
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon sx={{ fontSize: '18px !important' }} />}
            onClick={load}
            disabled={loading}
            disableElevation
            size="small"
            sx={{ fontWeight: 700, borderRadius: 1.5, height: 32, fontSize: '0.8rem', px: 2, textTransform: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: 'none', '&:hover': { background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' } }}
          >
            {t('f2s.history.search')}
          </Button>
          {searched && (
            <Chip size="small"
              label={`${data.length} ${t('f2s.history.records')}`}
              sx={{ height: 26, fontSize: '0.8rem', fontWeight: 700, backgroundColor: '#e8f5e9', color: '#2e7d32' }}
            />
          )}
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {!searched && !loading && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <ManualIcon sx={{ fontSize: 64, opacity: 0.12, mb: 1 }} />
          <Typography>{t('f2s.history.selectTimeAndSearch')}</Typography>
        </Box>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: '#2e7d32' }} />
        </Box>
      )}

      {searched && !loading && data.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Typography>{t('f2s.history.noData')}</Typography>
        </Box>
      )}

      {!loading && data.length > 0 && (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid #e0e0e0', backgroundColor: '#fff !important', flex: 1, overflow: 'auto' }}>
          <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: { xs: 0.5, lg: 1 }, px: { xs: 1, lg: 2 }, fontSize: { xs: '0.75rem', lg: '0.85rem' } } }}>
            <TableHead>
              <TableRow>
                {['FacLine', 'JobNo', 'PO No', 'Size', 'Qty', 'Importer', 'Exporter', 'DateCreate', 'DateExport', 'Remark'].map(col => (
                  <TableCell key={col} sx={{ fontWeight: 700, backgroundColor: '#f5f5f5 !important', color: '#333', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, i) => (
                <TableRow key={`${row.IdPart}-${i}`} hover sx={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa', '&:hover': { backgroundColor: '#e8f5e9' } }}>
                  <TableCell sx={{ fontSize: 12, color: '#333' }}>{row.FacLine}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#333' }}>{row.JobNo}</TableCell>
                  <TableCell sx={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{row.PONo}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#333' }}>
                    <Chip label={row.Sizx || row.Size} size="small" sx={{ fontWeight: 700, backgroundColor: '#e8f5e9', color: '#2e7d32', height: 20, fontSize: 11 }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, fontWeight: 700, color: '#333' }}>{row.Qty}</TableCell>
                  <TableCell sx={{ fontSize: 11, color: '#666' }}>{row.Importer}</TableCell>
                  <TableCell sx={{ fontSize: 11, color: '#666' }}>{row.Exporter}</TableCell>
                  <TableCell sx={{ fontSize: 11, whiteSpace: 'nowrap', color: '#333' }}>{formatDate(row.DateCreate)}</TableCell>
                  <TableCell sx={{ fontSize: 11, whiteSpace: 'nowrap', color: '#333' }}>{formatDate(row.DateExport)}</TableCell>
                  <TableCell sx={{ fontSize: 11 }}>
                    {row.Remark ? <Chip label={row.Remark} size="small" color="warning" sx={{ height: 18, fontSize: 10 }} /> : <span style={{ color: '#999' }}>—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {searched && !loading && totalElements > 0 && (
        <Box sx={{ borderTop: '1px solid #e0e0e0', backgroundColor: '#fafafa', p: 1.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2, borderRadius: '0 0 8px 8px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>{t('f2s.history.rowsPerPage')}:</Typography>
            <Select
              size="small"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(0);
              }}
              sx={{ height: 32, fontSize: '0.875rem', backgroundColor: '#fff' }}
            >
              {[15, 50, 100, 200].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
            <Typography variant="body2" sx={{ color: '#64748b', ml: 1 }}>
              {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, totalElements)} {t('f2s.history.inOf')} {totalElements}
            </Typography>
          </Box>
          <Pagination
            count={Math.ceil(totalElements / rowsPerPage) || 1}
            page={page + 1}
            onChange={(_, newPage) => setPage(newPage - 1)}
            shape="rounded"
            showFirstButton
            showLastButton
            siblingCount={isMobile ? 0 : 1}
            boundaryCount={1}
            size={isMobile ? "small" : "medium"}
            sx={{ 
              '& .MuiPagination-ul': { flexWrap: 'nowrap' },
              '& .MuiPaginationItem-root.Mui-selected': { bgcolor: '#2e7d32', color: '#fff', '&:hover': { bgcolor: '#1b5e20' } }
            }}
          />
        </Box>
      )}
    </Box>
  );
}

// ─── Auto Tab ───
function AutoTab() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [poNo, setPoNo] = useState('');
  const [data, setData] = useState<AutoDeliveryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(0); // MUI TablePagination is 0-indexed
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalElements, setTotalElements] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const hasPo = poNo.trim().length > 0;
      const result = await deliveryHistoryService.getAutoHistory(
        hasPo ? undefined : fromDate,
        hasPo ? undefined : toDate,
        poNo || undefined,
        page + 1, // Backend uses 1-indexed
        rowsPerPage
      );
      setData(result.content || []);
      setTotalElements(result.totalElements || 0);
      setSearched(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, poNo, page, rowsPerPage]);

  // Removed auto-fetch on mount: Let user click search.

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
      {/* Filter bar */}
      <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 2.5, border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #f8faf8 0%, #ffffff 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            label="Từ ngày"
            type="date"
            size="small"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: isMobile ? '100%' : 160, '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem' } }}
          />
          <TextField
            label="Đến ngày"
            type="date"
            size="small"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: isMobile ? '100%' : 160, '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem' } }}
          />
          <TextField
            label="Tìm PO"
            size="small"
            value={poNo}
            onChange={e => setPoNo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Nhập PO No..."
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }}
            sx={{ width: isMobile ? '100%' : 200, '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem' } }}
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon sx={{ fontSize: '18px !important' }} />}
            onClick={() => { setPage(0); load(); }}
            disabled={loading}
            disableElevation
            size="small"
            sx={{ fontWeight: 700, borderRadius: 1.5, height: 32, fontSize: '0.8rem', px: 2, textTransform: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: 'none', '&:hover': { background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' } }}
          >
            Tìm
          </Button>
          {searched && (
            <Chip size="small"
              label={`${totalElements} ${t('f2s.history.records')}`}
              sx={{ height: 26, fontSize: '0.8rem', fontWeight: 700, backgroundColor: '#e8f5e9', color: '#2e7d32' }}
            />
          )}
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {!searched && !loading && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <AutoIcon sx={{ fontSize: 64, opacity: 0.12, mb: 1 }} />
          <Typography>Chọn khoảng thời gian và nhấn Tìm</Typography>
        </Box>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: '#2e7d32' }} />
        </Box>
      )}

      {searched && !loading && data.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Typography>Không có dữ liệu</Typography>
        </Box>
      )}

      {!loading && data.length > 0 && (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid #e0e0e0', backgroundColor: '#fff !important', flex: 1, overflow: 'auto' }}>
          <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: { xs: 0.5, lg: 1 }, px: { xs: 1, lg: 2 }, fontSize: { xs: '0.75rem', lg: '0.85rem' } } }}>
            <TableHead>
              <TableRow>
                {['ID', 'Factory', 'PO No', 'Size', 'Packed Qty', 'Plastic Code', 'CTN BarCode', 'Type', 'Created By', 'SysCreateDate'].map(col => (
                  <TableCell key={col} sx={{ fontWeight: 700, backgroundColor: '#f5f5f5 !important', color: '#333', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, i) => (
                <TableRow key={`auto-${row.Id}-${i}`} hover sx={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa', '&:hover': { backgroundColor: '#e8f5e9' } }}>
                  <TableCell sx={{ fontSize: 11, color: '#999' }}>{row.Id}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#333' }}>{row.Factory}</TableCell>
                  <TableCell sx={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{row.PONo}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    <Chip label={row.ManuSize} size="small" sx={{ fontWeight: 700, backgroundColor: '#e8f5e9', color: '#2e7d32', height: 20, fontSize: 11 }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, fontWeight: 700, color: '#333' }}>{row.PackedQty}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    <Chip label={row.PlasticCode} size="small" variant="outlined" sx={{ fontWeight: 600, height: 20, fontSize: 11, color: '#555', borderColor: '#ccc' }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: '#555' }}>{row.CTNBarCode}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    <Chip
                      label={row.TypePartition}
                      size="small"
                      sx={{ height: 20, fontSize: 11, fontWeight: 700,
                        backgroundColor: row.TypePartition === 'D' ? '#e8f5e9' : '#fce4ec',
                        color: row.TypePartition === 'D' ? '#2e7d32' : '#c62828',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: 11, color: '#666' }}>{row.CreatedBy}</TableCell>
                  <TableCell sx={{ fontSize: 11, whiteSpace: 'nowrap', color: '#333' }}>{formatDate(row.SysCreateDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {searched && !loading && totalElements > 0 && (
        <Box sx={{ borderTop: '1px solid #e0e0e0', backgroundColor: '#fafafa', p: 1.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2, borderRadius: '0 0 8px 8px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>Dòng / trang:</Typography>
            <Select
              size="small"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(0);
              }}
              sx={{ height: 32, fontSize: '0.875rem', backgroundColor: '#fff' }}
            >
              {[15, 50, 100, 200].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
            <Typography variant="body2" sx={{ color: '#64748b', ml: 1 }}>
              {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, totalElements)} trong {totalElements}
            </Typography>
          </Box>
          <Pagination
            count={Math.ceil(totalElements / rowsPerPage) || 1}
            page={page + 1}
            onChange={(_, newPage) => setPage(newPage - 1)}
            shape="rounded"
            showFirstButton
            showLastButton
            siblingCount={isMobile ? 0 : 1}
            boundaryCount={1}
            size={isMobile ? "small" : "medium"}
            sx={{ 
              '& .MuiPagination-ul': { flexWrap: 'nowrap' },
              '& .MuiPaginationItem-root.Mui-selected': { bgcolor: '#2e7d32', color: '#fff', '&:hover': { bgcolor: '#1b5e20' } }
            }}
          />
        </Box>
      )}
    </Box>
  );
}

// ─── Main Page ───
export default function HistoryPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);

  return (
    <Box>


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
          <Tab icon={<ManualIcon />} iconPosition="start" label={t('f2s.history.manualTab')} />
          <Tab icon={<AutoIcon />} iconPosition="start" label={t('f2s.history.autoTab')} />
        </Tabs>
        <Box sx={{ p: 2 }}>
          {tab === 0 && <ManualTab />}
          {tab === 1 && <AutoTab />}
        </Box>
      </Paper>
    </Box>
  );
}
