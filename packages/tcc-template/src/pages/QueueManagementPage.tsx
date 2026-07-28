import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  MenuItem,
  InputAdornment,
  useTheme
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import SyncIcon from '@mui/icons-material/Sync';

import { format, parseISO } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTranslation } from 'react-i18next';

import { tccService, TccRequest } from '../services/tccService';
import { useSnackbar } from '../hooks/useSnackbar';
import { AdvancedFilterDrawer, AppTextField, AppButton } from '@traxeco/shared';

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const INITIAL_STATE = { pagination: { paginationModel: { pageSize: 25 } } };
const getRowId = (row: any) => row.requestId;
const GRID_SX = {
  height: '100%',
  border: 'none',
  '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-filler, & .MuiDataGrid-scrollbarFiller, & .MuiDataGrid-columnHeader--filled': { backgroundColor: '#F9FAFA !important', borderBottom: '1px solid #e1e3e4 !important' },
  '& .MuiDataGrid-columnHeader': { bgcolor: '#F9FAFA', color: '#707975', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, whiteSpace: 'normal !important', lineHeight: '1.2 !important', wordBreak: 'normal' },
  '& .MuiDataGrid-cell': { borderColor: '#e1e3e4', fontSize: '13px', color: '#3f4945', '&:focus': { outline: 'none !important' }, '&:focus-within': { outline: 'none !important' } },
  '& .MuiDataGrid-row:hover': { bgcolor: '#F9FAFA !important' },
};

const RejectDialog = ({ open, onClose, onSubmit }: any) => {
  const [remarks, setRemarks] = React.useState('');
  React.useEffect(() => {
    if (open) setRemarks('');
  }, [open]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reject Request</DialogTitle>
      <DialogContent>
        <Box mt={2} display="flex" flexDirection="column" gap={0.5}>
          <Typography variant="body2" mb={1}>Please provide a reason for rejecting this request. This will be shown to the user.</Typography>
          <textarea
            rows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #c4c4c4',
              fontFamily: 'inherit',
              fontSize: '14px',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#1976d2'}
            onBlur={(e) => e.target.style.borderColor = '#c4c4c4'}
            placeholder="Reject Reason"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSubmit(remarks)} variant="contained" color="error" disabled={!remarks.trim()}>
          Confirm Reject
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const RescheduleDialog = ({ open, onClose, onSubmit, selectedReq }: any) => {
  const [newDate, setNewDate] = React.useState<Date | null>(null);
  const [remarks, setRemarks] = React.useState('');
  const [checkingCapacity, setCheckingCapacity] = React.useState(false);
  const [capacityInfo, setCapacityInfo] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (open && selectedReq) {
      setNewDate(selectedReq.createdAt ? parseISO(selectedReq.createdAt) : new Date());
      setRemarks('');
      setCapacityInfo(null);
    }
  }, [open, selectedReq]);

  React.useEffect(() => {
    if (open && selectedReq && newDate) {
      const check = async () => {
        setCheckingCapacity(true);
        try {
          const usage = await tccService.getFactoryCapacityUsage(selectedReq.factory, format(newDate, 'yyyy-MM-dd'));
          setCapacityInfo(usage);
        } catch (err) {
          console.error(err);
        } finally {
          setCheckingCapacity(false);
        }
      };
      check();
    }
  }, [newDate, open, selectedReq]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reschedule Request</DialogTitle>
      <DialogContent>
        <Box mt={2}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="New Request Delivery Date"
              value={newDate}
              onChange={(v) => setNewDate(v)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
          <Box mt={3} display="flex" flexDirection="column" gap={0.5}>
            <Typography variant="caption" color="textSecondary" sx={{ ml: 0.5, fontWeight: 500 }}>Remarks (Reason for reschedule)</Typography>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #c4c4c4',
                fontFamily: 'inherit',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#1976d2'}
              onBlur={(e) => e.target.style.borderColor = '#c4c4c4'}
              placeholder="Enter remarks..."
            />
          </Box>
          {checkingCapacity ? (
            <Box mt={2} display="flex" alignItems="center" gap={1}>
              <CircularProgress size={16} /> <Typography variant="caption">Checking capacity...</Typography>
            </Box>
          ) : capacityInfo ? (
            <Box mt={2} p={2} bgcolor={capacityInfo.max > 0 && capacityInfo.available === 0 ? 'error.light' : 'success.light'} borderRadius={1}>
              <Typography variant="body2" color={capacityInfo.max > 0 && capacityInfo.available === 0 ? 'error.contrastText' : 'success.contrastText'}>
                Capacity on Request Delivery Date ({newDate ? format(newDate, 'dd/MM/yyyy') : ''}): {capacityInfo.used} / {capacityInfo.max === -1 ? 'Unlimited' : capacityInfo.max} requests
                {capacityInfo.max > 0 && capacityInfo.available === 0 && ' (Factory Full)'}
              </Typography>
            </Box>
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSubmit(newDate, remarks)} variant="contained" disabled={checkingCapacity || !newDate}>
          Confirm & Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default function QueueManagementPage({ isActive = true }: any) {
  const { t } = useTranslation();
  const theme = useTheme();
  
  const [requests, setRequests] = useState<TccRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { showSnackbar, hideSnackbar, open: snackbarOpen, message: snackbarMessage, severity: snackbarSeverity } = useSnackbar();
  
  // Reschedule dialog state
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<TccRequest | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  // Filter states
  const [filterOpen, setFilterOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  
  const [filters, setFilters] = useState({
    customer: '',
    factory: '',
    season: ''
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy');
    } catch {
      return '—';
    }
  };

  const uniqueCustomers = useMemo(() => Array.from(new Set(requests.map(r => r.customer).filter(Boolean))).sort(), [requests]);
  const uniqueFactories = useMemo(() => Array.from(new Set(requests.map(r => r.factory).filter(Boolean))).sort(), [requests]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await tccService.getQueuedRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
      showSnackbar('Failed to load queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  useWebSocket('/topic/tcc-updates', fetchQueue);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFiltersCount = () => {
    let count = 0;
    if (filters.customer) count++;
    if (filters.factory) count++;
    if (filters.season) count++;
    setActiveFiltersCount(count);
  };

  const filteredRows = useMemo(() => {
    return requests.filter(req => {
      // Global Search
      const search = globalSearch.toLowerCase();
      if (search && !(
        req.requestId.toLowerCase().includes(search) ||
        (req.requesterName && req.requesterName.toLowerCase().includes(search)) ||
        (req.styleNumber && req.styleNumber.toLowerCase().includes(search))
      )) {
        return false;
      }
      
      // Advanced Filters
      if (filters.customer && req.customer !== filters.customer) return false;
      if (filters.factory && req.factory !== filters.factory) return false;
      if (filters.season && req.season !== filters.season) return false;
      
      return true;
    });
  }, [requests, globalSearch, filters]);

  const handleApprove = async (id: string) => {
    try {
      await tccService.approveQueuedRequest(id);
      showSnackbar('Request approved', 'success');
      fetchQueue();
    } catch (err) {
      console.error(err);
      showSnackbar('Failed to approve', 'error');
    }
  };

  const handleReject = (id: string) => {
    setRejectTargetId(id);
    setRejectOpen(true);
  };

  const submitReject = async (remarks: string) => {
    if (!rejectTargetId) return;
    try {
      await tccService.rejectQueuedRequest(rejectTargetId, remarks);
      showSnackbar('Request rejected', 'success');
      fetchQueue();
    } catch (err) {
      console.error(err);
      showSnackbar('Failed to reject', 'error');
    } finally {
      setRejectOpen(false);
    }
  };

  const openReschedule = (req: TccRequest) => {
    setSelectedReq(req);
    setRescheduleOpen(true);
  };

  const submitReschedule = async (newDate: Date, remarks: string) => {
    if (!selectedReq || !newDate) return;
    try {
      await tccService.rescheduleQueuedRequest(selectedReq.requestId, format(newDate, 'yyyy-MM-dd'), remarks);
      showSnackbar('Request rescheduled and approved', 'success');
      setRescheduleOpen(false);
      fetchQueue();
    } catch (err) {
      console.error(err);
      showSnackbar('Failed to reschedule', 'error');
    }
  };

  const columns: GridColDef[] = useMemo(() => [
    { field: 'requestId', headerName: 'Request ID', width: 140 },
    {
      field: 'isPriority',
      headerName: 'Priority request',
      width: 100,
      renderCell: (params: GridRenderCellParams) =>
        params.value ? (
          <Chip label={t('tcc.yes', 'Yes')} size="small" sx={{ bgcolor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 800, fontSize: '11px', px: 0.5 }} />
        ) : (
          <Chip label={t('tcc.no', 'No')} size="small" sx={{ bgcolor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700, fontSize: '11px', px: 0.5 }} />
        ),
    },
    { field: 'priorityReason', headerName: 'Priority request Reason ®', width: 150, renderCell: (params: GridRenderCellParams) => params.value || '—' },
    { field: 'createdAt', headerName: 'Request Creation Date ®', width: 150, renderCell: (params: GridRenderCellParams) => formatDate(params.value) },
    { field: 'monthYear', headerName: 'Month (auto)', width: 120, renderCell: (params: GridRenderCellParams) => params.value || '—' },
    { field: 'requesterName', headerName: 'Requester', width: 160, renderCell: (params: GridRenderCellParams) => params.value || '—' },
    { field: 'customer', headerName: 'Customer (R)', width: 140, renderCell: (params: GridRenderCellParams) => params.value || '—' },
    { field: 'season', headerName: 'Season ®', width: 120, renderCell: (params: GridRenderCellParams) => params.value || '—' },
    { field: 'styleNumber', headerName: 'Style number ®', width: 140, renderCell: (params: GridRenderCellParams) => params.value || '—' },
    { field: 'productType', headerName: 'Product type ®', width: 120, renderCell: (params: GridRenderCellParams) => params.value || '—' },
    { field: 'sampleStage', headerName: 'Sample stage ®', width: 140, renderCell: (params: GridRenderCellParams) => params.value || '—' },
    { 
      field: 'factory', 
      headerName: 'Factory ®', 
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        params.value ? <Chip label={params.value} size="small" /> : '—'
      )
    },
    { field: 'paperPatternDeliveryDate', headerName: t('tcc.paperPatternDeliveryDate', 'Paper Pattern Delivery'), width: 160, renderCell: (params: GridRenderCellParams) => formatDate(params.value) },
    { field: 'trimDeliveryDate', headerName: t('tcc.trimDeliveryDate', 'Trim Delivery Date'), width: 160, renderCell: (params: GridRenderCellParams) => formatDate(params.value) },
    { field: 'fabricDeliveryDate', headerName: t('tcc.fabricDeliveryDate', 'Fabric Delivery Date'), width: 160, renderCell: (params: GridRenderCellParams) => formatDate(params.value) },
    { field: 'sampleSketchDeliveryDate', headerName: t('tcc.sampleSketchDeliveryDate', 'Sample/Sketch Delivery Date'), width: 160, renderCell: (params: GridRenderCellParams) => formatDate(params.value) },
    {
      field: 'processType',
      headerName: 'Light / Full process ®',
      width: 140,
      renderCell: (params: GridRenderCellParams) => {
        if (!params.value) return '—';
        const isFull = String(params.value).includes('Full');
        const label = isFull ? t('tcc.processFull', 'Full Process') : t('tcc.processLight', 'Light Process');
        const style = isFull
          ? { bgcolor: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', fontWeight: 600 }
          : { bgcolor: '#f0fdfa', color: '#0d9488', border: '1px solid #ccfbf1', fontWeight: 600 };
        return <Chip label={label} size="small" sx={style} />;
      }
    },
    { field: 'materialReceivedDate', headerName: 'Material received date (TCC)', width: 180, renderCell: (params: GridRenderCellParams) => formatDate(params.value) },
    { field: 'operationDescription', headerName: 'Operation Description ®', width: 180, renderCell: (params: GridRenderCellParams) => params.value || '—' },
    { field: 'machineType', headerName: 'Machine type®', width: 120, renderCell: (params: GridRenderCellParams) => params.value || '—' },
    { field: 'machineDimension', headerName: 'Machine dimension ®', width: 140, renderCell: (params: GridRenderCellParams) => params.value || '—' },
    { field: 'sizesRequired', headerName: 'Sample size', width: 120, renderCell: (params: GridRenderCellParams) => params.value || '—' },
    { field: 'startDate', headerName: 'Start Date (TCC)', width: 140, renderCell: (params: GridRenderCellParams) => formatDate(params.value) },
    { 
      field: 'expectedDeliveryDate', 
      headerName: 'Requested Date', 
      width: 140,
      renderCell: (params: GridRenderCellParams) => formatDate(params.value)
    },
    {
      field: 'queueStatus',
      headerName: 'Queue Status',
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        if (!params.value) return '—';
        const isPending = params.value === 'Pending';
        const color = isPending ? 'warning' : params.value === 'Approved' ? 'success' : 'error';
        return (
          <Chip 
            label={params.value} 
            color={color as any} 
            size="small" 
            sx={{ 
              fontWeight: 600,
              ...(isPending && {
                animation: 'pulsePending 2s infinite',
                '@keyframes pulsePending': {
                  '0%': { boxShadow: '0 0 0 0 rgba(245, 124, 0, 0.6)' },
                  '70%': { boxShadow: '0 0 0 6px rgba(245, 124, 0, 0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(245, 124, 0, 0)' },
                }
              })
            }} 
          />
        );
      }
    },
    { field: 'confirmDeliveryDate', headerName: 'Confirmed Delivery Date', width: 160, renderCell: (params: GridRenderCellParams) => formatDate(params.value) },
    { field: 'finishedDate', headerName: 'Finished Date (TCC)', width: 140, renderCell: (params: GridRenderCellParams) => formatDate(params.value) },
    {
      field: 'status',
      headerName: 'Status (Auto)',
      width: 140,
      renderCell: (params: GridRenderCellParams) => {
        const displayStatus = params.value || 'Not Started';
        return <Chip label={displayStatus} size="small" sx={{ fontWeight: 600 }} />;
      }
    },
    { field: 'releasedDate', headerName: 'Released Date (TCC)', width: 160, renderCell: (params: GridRenderCellParams) => formatDate(params.value) },
    { field: 'delayRemakeReason', headerName: 'reason for remake/ Delay (TCC)', width: 200, renderCell: (params: GridRenderCellParams) => params.value || '—' },
    { field: 'templateQty', headerName: 'Template Qty (TCC)', width: 150, renderCell: (params: GridRenderCellParams) => params.value || '—' },
    { field: 'lineQuantity', headerName: 'Line Quantity', width: 150, renderCell: (params: GridRenderCellParams) => params.value || '—' },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 280,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" gap={1} height="100%" alignItems="center">
          <Button size="small" variant="contained" color="success" sx={{ minWidth: 0, px: 1, py: 0.5, fontSize: '0.75rem', fontWeight: 600, boxShadow: 'none' }} onClick={() => handleApprove(params.row.requestId)}>Approve</Button>
          <Button size="small" variant="contained" color="warning" sx={{ minWidth: 0, px: 1, py: 0.5, fontSize: '0.75rem', fontWeight: 600, boxShadow: 'none', color: '#fff' }} onClick={() => openReschedule(params.row)}>Reschedule</Button>
          <Button size="small" variant="contained" color="error" sx={{ minWidth: 0, px: 1, py: 0.5, fontSize: '0.75rem', fontWeight: 600, boxShadow: 'none' }} onClick={() => handleReject(params.row.requestId)}>Reject</Button>
        </Box>
      )
    }
  ], [t]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box p={3} sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Paper elevation={0} sx={{ flex: 1, minHeight: 400, height: 'calc(100vh - 200px)', borderRadius: '8px', border: '1px solid #e1e3e4', boxShadow: '0px 4px 20px rgba(0,0,0,0.05)', bgcolor: '#ffffff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, alignItems: 'center' }}>
          <AppTextField
            placeholder="Search Request ID, Requester, Style..."
            size="small"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <AppButton
            variant="contained"
            customVariant="primary"
            disabled={loading}
            onClick={() => fetchQueue()}
            startIcon={
              <SyncIcon
                sx={{
                  fontSize: '20px !important',
                  animation: loading ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }}
              />
            }
            sx={{ mr: 2, height: 40, borderRadius: '8px' }}
          >
            {t('tcc.loadData', 'Load Data')}
          </AppButton>
          <AppButton
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setFilterOpen(true)}
            sx={{
              position: 'relative',
              borderColor: activeFiltersCount > 0 ? theme.palette.primary.main : 'divider',
              color: activeFiltersCount > 0 ? theme.palette.primary.main : 'text.primary',
            }}
          >
            {t('tcc.filters', 'Filters')}
            {activeFiltersCount > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -6, right: -6,
                  bgcolor: 'error.main', color: 'white',
                  borderRadius: '50%', width: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 'bold'
                }}
              >
                {activeFiltersCount}
              </Box>
            )}
          </AppButton>
        </Box>

        <Box sx={{ flexGrow: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {isActive ? (
            <DataGrid
              rows={filteredRows}
              columns={columns}
              getRowId={getRowId}
              loading={loading}
              disableRowSelectionOnClick
              rowHeight={60}
              columnHeaderHeight={64}
              sx={GRID_SX}
              initialState={INITIAL_STATE}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
          ) : (
            <Box sx={{ flex: 1, minHeight: 400 }} />
          )}
        </Box>
      </Paper>

      {/* Advanced Filter Drawer */}
      <AdvancedFilterDrawer
        title={t('tcc.advancedFilter', 'Advanced Filter')}
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        hasActiveFilters={activeFiltersCount > 0}
        onClear={() => {
          setFilters({ customer: '', factory: '', season: '' });
          setActiveFiltersCount(0);
          setFilterOpen(false);
        }}
        onApply={() => {
          applyFiltersCount();
          setFilterOpen(false);
        }}
      >
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: '#334155' }}>
              {t('tcc.customer', 'Customer')}
            </Typography>
            <AppTextField
              select fullWidth size="small"
              value={filters.customer}
              onChange={(e) => handleFilterChange('customer', e.target.value)}
              slotProps={{ select: { displayEmpty: true } }}
            >
              <MenuItem value="">{t('tcc.allCustomers', 'All Customers')}</MenuItem>
              {uniqueCustomers.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </AppTextField>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: '#334155' }}>
              {t('tcc.factory', 'Factory')}
            </Typography>
            <AppTextField
              select fullWidth size="small"
              value={filters.factory}
              onChange={(e) => handleFilterChange('factory', e.target.value)}
              slotProps={{ select: { displayEmpty: true } }}
            >
              <MenuItem value="">{t('tcc.allFactories', 'All Factories')}</MenuItem>
              {uniqueFactories.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </AppTextField>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: '#334155' }}>
              {t('tcc.season', 'Season')}
            </Typography>
            <AppTextField
              placeholder={t('tcc.enterSeason', 'Enter season...')}
              fullWidth size="small"
              value={filters.season}
              onChange={(e) => handleFilterChange('season', e.target.value)}
            />
          </Box>
        </Box>
      </AdvancedFilterDrawer>

      <RescheduleDialog 
        open={rescheduleOpen} 
        onClose={() => setRescheduleOpen(false)} 
        onSubmit={submitReschedule} 
        selectedReq={selectedReq} 
      />

      <RejectDialog 
        open={rejectOpen} 
        onClose={() => setRejectOpen(false)} 
        onSubmit={submitReject} 
      />
      
      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={hideSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={hideSnackbar} severity={snackbarSeverity as any} variant="filled" sx={{ width: '100%', fontWeight: 600 }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
