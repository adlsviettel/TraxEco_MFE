import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { 
  Box, Typography, Paper, IconButton, Dialog, DialogTitle, DialogContent, 
  DialogActions, CircularProgress, InputAdornment, Tooltip, Snackbar, Alert, Chip,
  Badge, MenuItem, useTheme, useMediaQuery, Checkbox, Menu, Divider, Button
} from '@mui/material';
import { 
  DataGrid, useGridApiRef, gridFilteredSortedRowIdsSelector 
} from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers';

// Icons
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ClearIcon from '@mui/icons-material/Clear';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterListIcon from '@mui/icons-material/FilterList';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import SyncIcon from '@mui/icons-material/Sync';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';

// Services & Shared
import { tccService, type TccRequest, type RequestFilters } from '../services/tccService';
import { authService, AppButton, AppTextField, AdvancedFilterDrawer } from '@traxeco/shared';

// Column Context
import ExcelStyleColumnMenu from '../components/ExcelStyleColumnMenu';
import CustomFilterPanel from '../components/CustomFilterPanel';
import { columnFilterStore } from '../components/ColumnFilterContext';

// Hooks
import { useSnackbar } from '../hooks/useSnackbar';
import { useRequestData } from '../hooks/useRequestData';
import { useWebSocket } from '../hooks/useWebSocket';
import { useColumnManagement } from '../hooks/useColumnManagement';
import { useMaterialDateEditor } from '../hooks/useMaterialDateEditor';
import { useDeleteCancel } from '../hooks/useDeleteCancel';

// Components
import { DraggableFab } from '../components/DraggableFab';
import { ConfirmActionDialog } from '../components/ConfirmActionDialog';
import { ReorderColumnsDialog } from '../components/ReorderColumnsDialog';
import { DataGridFooter } from '../components/DataGridFooter';
import { MobileRequestList } from '../components/MobileRequestList';
import { RequestDetailDialog } from '../components/RequestDetailDialog';
import RequestFormDialog from '../components/RequestFormDialog';

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'Work in Progress':
      return { bgcolor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 600 };
    case 'Completed':
      return { bgcolor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontWeight: 600 };
    case 'Released':
      return { bgcolor: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', fontWeight: 600 };
    case 'Remake':
      return { bgcolor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontWeight: 600 };
    case 'Cancelled':
      return { bgcolor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: 600 };
    case 'Rejected':
    case 'Deleted':
      return { bgcolor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontWeight: 600 };
    case 'Not Started':
    default:
      return { bgcolor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 600 };
  }
};

const formatDate = (val: any) => {
  if (!val) return '—';
  try {
    return format(new Date(val), 'dd/MM/yyyy');
  } catch {
    return '—';
  }
};

const formatDateTime = (val: any) => {
  if (!val) return '—';
  try {
    return format(new Date(val), 'dd/MM/yyyy HH:mm:ss');
  } catch {
    return '—';
  }
};

export default function RequestorViewPage() {
  const { t } = useTranslation();
  const mainApiRef = useGridApiRef();
  const location = useLocation();
  const navigate = useNavigate();
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [columnsMenuAnchor, setColumnsMenuAnchor] = useState<null | HTMLElement>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 1. Toast Notifications Hook
  const { 
    open: snackbarOpen, message: snackbarMessage, severity: snackbarSeverity, 
    showSnackbar, hideSnackbar 
  } = useSnackbar();

  // 2. Data Management Hook
  const {
    requests, setRequests, loading, filters, customers, factories,
    columnFilters, setColumnFilters, localColumnFilters, setLocalColumnFilters,
    filteredRequests, fetchRequests, handleFilterChange, handleApplyFilters
  } = useRequestData(showSnackbar, t);

  // 3. WebSockets Connection Hook
  useWebSocket('/topic/tcc-updates', fetchRequests);

  // 4. Column Visibility, Order & Reorder state management Hook
  const {
    columnVisibilityModel, setColumnVisibilityModel, columnOrder, setColumnOrder,
    reorderOpen, setReorderOpen, localFields, setLocalFields, draggedFieldRef
  } = useColumnManagement('tcc_requestor_column_order', {
    machineType: false,
    priorityReason: false,
    releasedDate: false,
    updatedBy: false,
    updatedAt: false,
  });

  // 5. Date Row Editor Hook
  const {
    editingRow, setEditingRow, newDate, setNewDate, savingDate, handleDateSave
  } = useMaterialDateEditor(setRequests, showSnackbar, t);

  // 6. Delete & Cancel Actions Hook
  const {
    deleteConfirmRow, setDeleteConfirmRow, deleting, handleDeleteConfirm,
    cancelConfirmRow, setCancelConfirmRow, cancelling, handleCancelConfirm
  } = useDeleteCancel(setRequests, showSnackbar, t);

  // Roles level RBAC Memo
  const canDeleteHard = useMemo(() => {
    return authService.isSuperAdmin() || authService.isAdmin() || authService.hasAction('tcc_tracking', 'canDelete');
  }, []);

  const canEditTracking = useMemo(() => {
    return authService.isSuperAdmin() || authService.isAdmin() || authService.hasAction('tcc_tracking', 'canEdit');
  }, []);

  const canCancelAll = useMemo(() => {
    return authService.isSuperAdmin() || authService.isAdmin() || authService.hasAction('tcc_tracking', 'canCancel');
  }, []);

  const activeFiltersCount = (filters.factory ? 1 : 0) + (filters.season ? 1 : 0) + (filters.status ? 1 : 0);

  // Auto open details drawer if requestId query param is in URL
  useEffect(() => {
    if (requests.length === 0) return;
    const params = new URLSearchParams(location.search);
    const reqIdParam = params.get('requestId');
    if (reqIdParam) {
      const exists = requests.some(r => r.requestId === reqIdParam);
      if (exists) {
        setSelectedDetailId(reqIdParam);
        setDetailOpen(true);
        navigate(location.pathname, { replace: true });
      }
    }
  }, [requests, location.search, navigate]);

  // Lock parent main element scroll on mobile to keep headers/footers sticky
  useEffect(() => {
    if (isMobile) {
      const mainElement = document.querySelector('main');
      if (mainElement) {
        const originalOverflow = mainElement.style.overflow;
        mainElement.style.overflow = 'hidden';
        return () => {
          mainElement.style.overflow = originalOverflow;
        };
      }
    }
  }, [isMobile]);

  useEffect(() => {
    if (filterOpen) {
      setLocalColumnFilters(columnFilters);
    }
  }, [filterOpen, columnFilters]);

  // Excel exporter
  const handleExport = async () => {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('TCC Template Requests');

      const visibleCols = columns.filter(col => 
        col.field !== 'actions' && 
        columnVisibilityModel[col.field] !== false
      );
      worksheet.columns = visibleCols.map(col => ({
        header: col.headerName || col.field,
        key: col.field,
        width: 20
      }));

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2E7D32' },
      };

      worksheet.getRow(1).eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });

      const filteredSortedRowIds = gridFilteredSortedRowIdsSelector(mainApiRef);
      const dataToExport = filteredSortedRowIds.map(id => mainApiRef.current.getRow(id)).filter(Boolean);
      dataToExport.forEach((req: any) => {
        const rowData: any = {};
        visibleCols.forEach(col => {
          const val = (req as any)[col.field];
          if (col.field === 'createdAt' || col.field === 'materialSentDate' || col.field === 'materialReceivedDate' || col.field === 'startDate' || col.field === 'expectedDeliveryDate' || col.field === 'confirmDeliveryDate' || col.field === 'finishedDate' || col.field === 'releasedDate') {
            rowData[col.field] = val ? format(new Date(val), 'yyyy-MM-dd') : '';
          } else if (col.field === 'isPriority') {
            rowData[col.field] = val ? 'Yes' : 'No';
          } else {
            rowData[col.field] = val || '';
          }
        });
        const row = worksheet.addRow(rowData);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFEEEEEE' } },
            bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const dateStr = format(new Date(), 'yyyyMMdd');
      saveAs(blob, `TCC_Template_Requests_${dateStr}.xlsx`);
    } catch (err) {
      console.error('Export error:', err);
      showSnackbar(t('tcc.exportError', 'Failed to export Excel file'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Work in Progress':
        return t('tcc.statusWip');
      case 'Completed':
        return t('tcc.statusCompleted');
      case 'Released':
        return t('tcc.statusReleased', 'Released');
      case 'Remake':
        return t('tcc.statusRemake');
      case 'Cancelled':
        return t('tcc.statusCancelled', 'Cancelled');
      case 'Rejected':
        return t('tcc.statusRejected', 'Rejected');
      case 'Deleted':
        return t('tcc.statusDeleted', 'Deleted');
      case 'Not Started':
      default:
        return t('tcc.statusNotStarted');
    }
  };

  // Columns definition (Community version requires manual sorting by order map)
  const columns = useMemo<GridColDef[]>(() => [
    { 
      field: 'requestId', 
      headerName: 'RequestID', 
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" justifyContent="center" alignItems="center" width="100%" height="100%">
          <Typography 
            onClick={() => {
              setSelectedDetailId(params.row.requestId);
              setDetailOpen(true);
            }}
            sx={{ 
              color: '#1b5e20', 
              fontWeight: 800, 
              cursor: 'pointer', 
              fontSize: '13px',
              fontFamily: 'monospace',
              '&:hover': { 
                color: '#2e7d32',
                textDecoration: 'underline'
              }
            }}
          >
            {params.value}
          </Typography>
        </Box>
      )
    },
    { 
      field: 'createdAt', 
      headerName: 'Request Creation Date ®', 
      width: 125,
      renderCell: (params) => formatDate(params.value)
    },
    { field: 'customer', headerName: 'Customer (R)', width: 120 },
    { field: 'season', headerName: 'Season ®', width: 90 },
    { field: 'styleNumber', headerName: 'Style number ®', width: 130 },
    { field: 'productType', headerName: 'Product type ®', width: 120 },
    { field: 'sampleStage', headerName: 'Sample  stage ®', width: 140 },
    { field: 'factory', headerName: 'Factory ®', width: 120 },
    {
      field: 'materialSentDate',
      headerName: 'Material sent date ®',
      width: 180,
      renderCell: (params: GridRenderCellParams) => {
        const isCancelled = params.row.status === 'Cancelled';
        const userInfo = authService.getUserInfo();
        const reqLower = (params.row.requesterName || '').trim().toLowerCase();
        const codeLower = userInfo.employeeCode.trim().toLowerCase();
        const nameLower = userInfo.employeeName.trim().toLowerCase();
        const isMyRequest = reqLower === codeLower || reqLower === nameLower || reqLower.startsWith(codeLower + ' -');
        const canEditThisRow = authService.isSuperAdmin() || authService.isAdmin() || (isMyRequest && canEditTracking);

        return (
          <Box display="flex" alignItems="center" gap={0.5} justifyContent="space-between" width="100%">
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              {params.value ? formatDate(params.value) : t('tcc.notSet')}
            </Typography>
            <IconButton
              size="small"
              disabled={!canEditThisRow || isCancelled}
              onClick={() => {
                setEditingRow(params.row as TccRequest);
                setNewDate(params.value ? new Date(params.value) : null);
              }}
              sx={{ p: 0.5 }}
            >
              <EditIcon fontSize="small" sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        );
      },
    },
    { 
      field: 'processType', 
      headerName: 'Light / Full process ®', 
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        const isFull = String(params.value).includes('Full');
        const label = isFull ? t('tcc.processFull', 'Full Process') : t('tcc.processLight', 'Light Process');
        const style = isFull
          ? { bgcolor: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', fontWeight: 600 }
          : { bgcolor: '#f0fdfa', color: '#0d9488', border: '1px solid #ccfbf1', fontWeight: 600 };
        return (
          <Chip
            label={label}
            size="small"
            sx={style}
          />
        );
      }
    },
    { 
      field: 'materialReceivedDate', 
      headerName: 'Material received date (TCC)', 
      width: 140,
      renderCell: (params) => formatDate(params.value)
    },
    { field: 'operationDescription', headerName: 'Operation Description ®', width: 180 },
    { field: 'machineType', headerName: 'Machine type®', width: 120 },
    { field: 'machineDimension', headerName: 'Machine dimension ®', width: 120 },
    { field: 'sizesRequired', headerName: 'Sample size', width: 120 },
    {
      field: 'isPriority',
      headerName: 'Priority request',
      width: 100,
      renderCell: (params) =>
        params.value ? (
          <Chip 
            label={t('tcc.yes')} 
            size="small" 
            sx={{ 
              bgcolor: '#fee2e2', 
              color: '#dc2626', 
              border: '1px solid #fecaca', 
              fontWeight: 800,
              fontSize: '11px',
              px: 0.5
            }} 
          />
        ) : (
          <Chip 
            label={t('tcc.no')} 
            size="small" 
            sx={{ 
              bgcolor: '#f0fdf4', 
              color: '#16a34a', 
              border: '1px solid #bbf7d0', 
              fontWeight: 700,
              fontSize: '11px',
              px: 0.5
            }} 
          />
        ),
    },
    { field: 'priorityReason', headerName: 'Priority request Reason ®', width: 150 },
    { 
      field: 'startDate', 
      headerName: 'Start Date (TCC)', 
      width: 120,
      renderCell: (params) => formatDate(params.value)
    },
    { 
      field: 'expectedDeliveryDate', 
      headerName: 'Request Delivery Date', 
      width: 140,
      renderCell: (params) => formatDate(params.value)
    },
    {
      field: 'confirmDeliveryDate',
      headerName: 'Confirmed Delivery Date',
      width: 140,
      renderCell: (params) => {
        const reqDateStr = params.row.expectedDeliveryDate;
        const confDateStr = params.value;
        
        const formattedDate = formatDate(confDateStr);
        if (!confDateStr) return '';

        if (reqDateStr && confDateStr) {
          const reqDate = new Date(reqDateStr);
          const confDate = new Date(confDateStr);
          reqDate.setHours(0, 0, 0, 0);
          confDate.setHours(0, 0, 0, 0);
          
          if (confDate > reqDate) {
            return (
              <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '13px' }}>
                {formattedDate}
              </span>
            );
          }
        }
        return formattedDate;
      }
    },
    { 
      field: 'finishedDate', 
      headerName: 'Finished Date (TCC)', 
      width: 120,
      renderCell: (params) => formatDate(params.value)
    },
    {
      field: 'status',
      headerName: 'Status (Auto)',
      width: 140,
      valueGetter: (value: any, row: any) => {
        return row.releasedDate ? 'Released' : (value || 'Not Started');
      },
      renderCell: (params: GridRenderCellParams) => {
        const displayStatus = params.value || 'Not Started';
        return (
          <Chip
            label={getStatusLabel(displayStatus)}
            size="small"
            sx={getStatusStyle(displayStatus)}
          />
        );
      },
    },
    { 
      field: 'releasedDate', 
      headerName: 'Released Date (TCC)', 
      width: 140,
      renderCell: (params) => formatDate(params.value)
    },
    { field: 'delayRemakeReason', headerName: 'reason for remake/ Delay (TCC)', width: 180 },
    { field: 'templateQty', headerName: 'Template Qty (TCC)', width: 150 },
    { field: 'lineQuantity', headerName: 'Line Quantity', width: 180 },
    { field: 'requesterName', headerName: 'NameOfRequester', width: 180 },
    { field: 'remarks', headerName: 'Remarks', minWidth: 180, flex: 1 },
    { field: 'updatedBy', headerName: 'Last Updated By', width: 150 },
    { 
      field: 'updatedAt', 
      headerName: 'Last Updated At', 
      width: 170,
      renderCell: (params) => formatDateTime(params.value)
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const isNotStarted = (params.row.status || 'Not Started') === 'Not Started';
        const userInfo = authService.getUserInfo();
        const reqLower = (params.row.requesterName || '').trim().toLowerCase();
        const codeLower = userInfo.employeeCode.trim().toLowerCase();
        const nameLower = userInfo.employeeName.trim().toLowerCase();
        const isMyRequest = reqLower === codeLower || reqLower === nameLower || reqLower.startsWith(codeLower + ' -');
        const isSuperOrAdmin = authService.isSuperAdmin() || authService.isAdmin();
        const hasDeletePermission = authService.hasAction('tcc_tracking', 'canDelete');
        const canDeleteRow = isSuperOrAdmin || (isMyRequest && hasDeletePermission);
        
        return (
          <Box display="flex" alignItems="center" justifyContent="center" gap={1} width="100%">
            {(canCancelAll || isMyRequest) && (
              <Tooltip title={isNotStarted ? t('tcc.cancelRequest', 'Cancel Request') : t('tcc.cannotCancel')} arrow>
                <span>
                  <IconButton
                    size="small"
                    color="warning"
                    disabled={!isNotStarted}
                    onClick={() => {
                      setCancelConfirmRow(params.row as TccRequest);
                    }}
                    sx={{ 
                      color: isNotStarted ? '#f59e0b' : 'text.disabled',
                      '&:hover': {
                        bgcolor: isNotStarted ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                      }
                    }}
                  >
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}

            {canDeleteRow && (
              <Tooltip title={isNotStarted ? t('tcc.delete', 'Delete') : t('tcc.cannotDelete')} arrow>
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    disabled={!isNotStarted}
                    onClick={() => {
                      setDeleteConfirmRow(params.row as TccRequest);
                    }}
                    sx={{ 
                      color: isNotStarted ? '#ef4444' : 'text.disabled',
                      '&:hover': {
                        bgcolor: isNotStarted ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        );
      }
    }
  ], [t, canEditTracking, canCancelAll]);

  // Memoized columns ordered by columnOrder
  const sortedColumns = useMemo<GridColDef[]>(() => {
    const orderedColumns = columnOrder && columnOrder.length > 0
      ? [...columns].sort((a, b) => {
          const orderMap = new Map(columnOrder.map((field, index) => [field, index]));
          const indexA = orderMap.has(a.field) ? orderMap.get(a.field)! : 999;
          const indexB = orderMap.has(b.field) ? orderMap.get(b.field)! : 999;
          return indexA - indexB;
        })
      : columns;

    return orderedColumns.map(col => ({
      ...col,
      renderHeader: (params: any) => (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={() => {
            const sourceField = draggedFieldRef.current;
            const targetField = col.field;
            if (sourceField && targetField && sourceField !== targetField) {
              const currentOrder = orderedColumns.map(c => c.field);
              const sourceIndex = currentOrder.indexOf(sourceField);
              const targetIndex = currentOrder.indexOf(targetField);
              if (sourceIndex !== -1 && targetIndex !== -1) {
                const updated = [...currentOrder];
                const [removed] = updated.splice(sourceIndex, 1);
                updated.splice(targetIndex, 0, removed);
                
                setColumnOrder(updated);
              }
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: col.headerAlign === 'center' ? 'center' : 'flex-start',
            gap: '4px',
            width: '100%',
            cursor: 'grab'
          }}
          draggable
          onDragStart={() => {
            draggedFieldRef.current = col.field;
          }}
          onDragEnd={() => {
            draggedFieldRef.current = null;
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {col.headerName || col.field}
          </span>
          {columnFilters[col.field] && columnFilters[col.field].length > 0 && (
            <FilterAltIcon style={{ color: '#1b5e20', fontSize: '14px', marginLeft: '2px' }} titleAccess="Filtered" />
          )}
        </div>
      )
    }));
  }, [columns, columnOrder, columnFilters, draggedFieldRef, setColumnOrder]);

  // Sync reorder dialog local fields
  useEffect(() => {
    if (reorderOpen) {
      setLocalFields(sortedColumns.map(c => c.field));
    }
  }, [reorderOpen, sortedColumns, setLocalFields]);

  // Auto register local filters with context
  columnFilterStore.register('requestor', columnFilters, setColumnFilters, requests);

  const detailRow = requests.find(r => r.requestId === selectedDetailId) || null;

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.5, overflow: 'hidden' }}>
      
      {/* 🚀 Toolbar Area 🚀 */}
      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1, px: 1.5, pt: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1, width: '100%', alignItems: 'center' }}>
            <AppTextField
              placeholder={t('tcc.searchCustomer', 'Search Customer...')}
              size="small"
              value={filters.customer}
              onChange={(e) => handleFilterChange('customer', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyFilters();
              }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ fontSize: 20, color: '#707975', mr: 1 }} />,
                endAdornment: filters.customer ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => handleFilterChange('customer', '')}><ClearIcon sx={{ fontSize: 16 }} /></IconButton>
                  </InputAdornment>
                ) : null,
                sx: { borderRadius: '24px', bgcolor: '#fff' }
              }}
              sx={{ flex: 1 }}
            />
            <IconButton 
              onClick={() => setFilterOpen(true)}
              sx={{ 
                bgcolor: activeFiltersCount > 0 ? 'rgba(46,125,50,0.1)' : '#fff',
                border: '1px solid #e1e3e4',
                color: '#1b5e20',
                width: 40, height: 40,
                borderRadius: '50%'
              }}
            >
              <Badge badgeContent={activeFiltersCount} color="error" sx={{ '& .MuiBadge-badge': { top: 3, right: 3 } }}>
                <FilterAltIcon />
              </Badge>
            </IconButton>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, px: 3, py: 2, bgcolor: '#ffffff', borderBottom: '1px solid #e1e3e4', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <AppTextField
              placeholder={t('tcc.searchCustomer', 'Search Customer...')}
              size="small"
              value={filters.customer}
              onChange={(e) => handleFilterChange('customer', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyFilters();
              }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ fontSize: 20, color: '#707975', mr: 1 }} />,
                endAdornment: filters.customer ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => handleFilterChange('customer', '')}><ClearIcon sx={{ fontSize: 16 }} /></IconButton>
                  </InputAdornment>
                ) : null,
                sx: { borderRadius: '8px', bgcolor: '#fff', width: 280 }
              }}
            />
            
            <AppButton
              data-testid="requestor-btn-tcc-filter"
              variant="outlined"
              customVariant="secondary"
              startIcon={<FilterListIcon />}
              onClick={() => setFilterOpen(true)}
              sx={{ height: 40, borderRadius: '8px' }}
            >
              {t('tcc.filter', 'Filter')}{' '}
              {activeFiltersCount > 0 ? '(Active)' : ''}
            </AppButton>
            
            {Object.keys(columnFilters).length > 0 && (
              <AppButton 
                variant="outlined" customVariant="secondary"
                startIcon={<FilterAltOffIcon />}
                onClick={() => setColumnFilters({})}
                sx={{ height: 40, borderRadius: '8px', borderColor: '#ef5350', color: '#c62828', bgcolor: 'rgba(239,83,80,0.05)', '&:hover': { bgcolor: 'rgba(239,83,80,0.1)', borderColor: '#c62828' } }}
              >
                {t('common.clearFilters', 'Clear Filters')} ({Object.keys(columnFilters).length})
              </AppButton>
            )}

            <AppButton
              data-testid="requestor-btn-tcc-columns"
              variant="outlined"
              customVariant="secondary"
              onClick={(e) => setColumnsMenuAnchor(e.currentTarget)}
              startIcon={<ViewColumnIcon sx={{ fontSize: '20px !important' }} />}
              sx={{ height: 40, borderRadius: '8px' }}
            >
              {t('tcc.columns', 'Columns')}
            </AppButton>

            <AppButton
              data-testid="requestor-btn-tcc-load-data"
              variant="contained"
              customVariant="primary"
              disabled={loading}
              onClick={handleApplyFilters}
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
              sx={{ height: 40, borderRadius: '8px' }}
            >
              {t('tcc.loadData', 'Load Data')}
            </AppButton>
          </Box>

          {/* Export and Add actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ color: '#1b5e20', fontSize: 13, fontWeight: 500, bgcolor: 'rgba(46,125,50,0.1)', px: 1.5, py: 0.5, borderRadius: '8px' }}>
              {loading ? t('tcc.loading', 'Loading...') : t('tcc.items_count', { count: requests.length, defaultValue: `${requests.length} items` })}
            </Box>

            <AppButton 
              variant="outlined" customVariant="primary"
              disabled={exporting || requests.length === 0}
              onClick={handleExport}
              startIcon={<FileDownloadIcon />}
            >
              {exporting ? t('tcc.exporting', 'Exporting...') : t('tcc.export', 'Export')}
            </AppButton>

            {authService.hasAction('tcc_tracking', 'canAdd') && (
              <AppButton 
                variant="contained" customVariant="primary" 
                startIcon={<AddIcon />}
                onClick={() => setFormOpen(true)}
              >
                {t('tcc.addNew', 'Add New')}
              </AppButton>
            )}
          </Box>
        </Box>
      )}

      {/* Main Grid View */}
      {isMobile ? (
        <MobileRequestList
          requests={filteredRequests}
          loading={loading}
          filters={filters}
          canEditTracking={canEditTracking}
          setEditingRow={setEditingRow}
          setNewDate={setNewDate}
          getStatusLabel={getStatusLabel}
          getStatusStyle={getStatusStyle}
          formatDate={formatDate}
          setSelectedDetailId={setSelectedDetailId}
          setDetailOpen={setDetailOpen}
          t={t}
        />
      ) : (
        <Paper elevation={0} sx={{ flex: 1, minHeight: 400, height: 'calc(100vh - 200px)', borderRadius: '8px', border: '1px solid #e1e3e4', boxShadow: '0px 4px 20px rgba(0,0,0,0.05)', bgcolor: '#ffffff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <DataGrid
            apiRef={mainApiRef}
            rows={filteredRequests}
            columns={sortedColumns}
            getRowId={(row) => row.requestId}
            getRowClassName={(params) => params.row.status === 'Cancelled' ? 'row-cancelled' : ''}
            loading={loading}
            disableRowSelectionOnClick
            onRowDoubleClick={(params) => {
              setSelectedDetailId(params.row.requestId);
              setDetailOpen(true);
            }}
            rowHeight={60}
            columnHeaderHeight={64}
            columnVisibilityModel={columnVisibilityModel}
            onColumnVisibilityModelChange={(newModel) => setColumnVisibilityModel(newModel)}
            initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
            slots={{ footer: DataGridFooter, columnMenu: ExcelStyleColumnMenu, filterPanel: CustomFilterPanel }}
            sx={{
              height: '100%',
              border: 'none',
              '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-filler, & .MuiDataGrid-scrollbarFiller, & .MuiDataGrid-columnHeader--filled': { backgroundColor: '#F9FAFA !important', borderBottom: '1px solid #e1e3e4 !important' },
              '& .MuiDataGrid-columnHeader': { bgcolor: '#F9FAFA', color: '#707975', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' },
              '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, whiteSpace: 'normal !important', lineHeight: '1.2 !important', wordBreak: 'normal' },
              '& .MuiDataGrid-cell': { borderColor: '#e1e3e4', fontSize: '13px', color: '#3f4945', '&:focus': { outline: 'none !important' }, '&:focus-within': { outline: 'none !important' } },
              '& .MuiDataGrid-row:hover': { bgcolor: '#F9FAFA !important' },
              '& .row-cancelled': { opacity: 0.5 }
            }}
          />
        </Paper>
      )}

      {/* Date Editor Dialog */}
      <Dialog open={!!editingRow} onClose={() => !savingDate && setEditingRow(null)}>
        <DialogTitle>{t('tcc.updateMaterialSent')}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <DatePicker format="dd/MM/yyyy"
            label={t('tcc.materialSentDate')}
            value={newDate}
            onChange={(val) => setNewDate(val)}
            slotProps={{ 
              field: { clearable: true },
              textField: { 
                fullWidth: true,
                size: 'small',
                sx: {
                  mt: 1,
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: '8px', 
                    height: 40, 
                    fontSize: 13, 
                    bgcolor: '#fff', 
                    '& fieldset': { borderColor: '#bfc9c4' }, 
                    '&:hover fieldset': { borderColor: '#3ba55c' }, 
                    '&.Mui-focused fieldset': { borderColor: '#3ba55c' } 
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: 13,
                    mt: 1
                  }
                }
              } 
            }}
          />
        </DialogContent>
        <DialogActions>
          <AppButton onClick={() => setEditingRow(null)} disabled={savingDate} variant="outlined" customVariant="secondary">
            {t('tcc.cancel')}
          </AppButton>
          <AppButton onClick={handleDateSave} variant="contained" customVariant="primary" disabled={!newDate || savingDate}>
            {savingDate ? <CircularProgress size={20} /> : t('tcc.save')}
          </AppButton>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmActionDialog
        open={!!deleteConfirmRow}
        onClose={() => setDeleteConfirmRow(null)}
        title={t('tcc.confirmDeleteTitle', 'Confirm Delete')}
        description={t('tcc.confirmDeleteMessage', 'Are you sure you want to delete request {{id}}?', { id: deleteConfirmRow?.requestId })}
        confirmText={t('tcc.delete', 'Delete')}
        cancelText={t('tcc.cancel', 'Cancel')}
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        color="error"
        sxBgColor="#d32f2f"
        sxHoverColor="#c62828"
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmActionDialog
        open={!!cancelConfirmRow}
        onClose={() => setCancelConfirmRow(null)}
        title={t('tcc.confirmCancelTitle', 'Confirm Cancel')}
        description={t('tcc.confirmCancelMessage', 'Are you sure you want to cancel request {{id}}?', { id: cancelConfirmRow?.requestId })}
        confirmText={t('tcc.cancelRequest', 'Cancel Request')}
        cancelText={t('common.cancel', 'Cancel')}
        loading={cancelling}
        onConfirm={handleCancelConfirm}
        color="warning"
        sxBgColor="#f59e0b"
        sxHoverColor="#d97706"
      />

      {/* Advanced Filter Drawer */}
      <AdvancedFilterDrawer
        title={t('tcc.advancedFilter', 'Advanced Filter')}
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        hasActiveFilters={activeFiltersCount > 0}
        onClear={() => {
          handleFilterChange('customer', '');
          handleFilterChange('factory', '');
          handleFilterChange('season', '');
          handleFilterChange('status', '');
          setLocalColumnFilters({});
          setColumnFilters({});
          setFilterOpen(false);
        }}
        onApply={() => {
          setColumnFilters(localColumnFilters);
          setFilterOpen(false);
          handleApplyFilters();
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
              {customers.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
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
              {factories.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
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

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: '#334155' }}>
              {t('tcc.status', 'Status')}
            </Typography>
            <AppTextField
              select fullWidth size="small"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              slotProps={{ select: { displayEmpty: true } }}
            >
              <MenuItem value="">{t('tcc.allStatus', 'All Statuses')}</MenuItem>
              {['Not Started', 'Work in Progress', 'Completed', 'Released', 'Remake', 'Cancelled', 'Rejected', 'Deleted'].map((st) => (
                <MenuItem key={st} value={st}>{getStatusLabel(st)}</MenuItem>
              ))}
            </AppTextField>
          </Box>
        </Box>
      </AdvancedFilterDrawer>

      {/* Details drawer/dialog */}
      <RequestDetailDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        request={detailRow}
        canEditTracking={canEditTracking}
        setEditingRow={setEditingRow}
        setNewDate={setNewDate}
      />

      {/* Add New Request Form Dialog */}
      <RequestFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => {
          setFormOpen(false);
          fetchRequests();
        }}
      />

      {/* REORDER COLUMNS DIALOG */}
      {/* Column Visibility Menu */}
      <Menu
        anchorEl={columnsMenuAnchor}
        open={Boolean(columnsMenuAnchor)}
        onClose={() => setColumnsMenuAnchor(null)}
        PaperProps={{
          sx: { width: 250, maxHeight: 400, borderRadius: 3, mt: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }
        }}
      >
        <MenuItem 
          onClick={() => { setColumnsMenuAnchor(null); setReorderOpen(true); }}
          sx={{ fontWeight: 'bold', color: '#15803d', py: 1.5, gap: 1, '&:hover': { bgcolor: 'rgba(21, 128, 61, 0.08)' } }}
        >
          <SyncIcon fontSize="small" sx={{ color: '#15803d' }} />
          {t('tcc.reorderColumnsTitle', 'Reorder Columns')}
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem 
          onClick={() => {
            const toggleCols = columns.filter(col => col.field !== 'actions' && col.field !== 'requestId');
            const isAllSelected = toggleCols.every(col => columnVisibilityModel[col.field] !== false);
            if (isAllSelected) {
              const newHidden = toggleCols.reduce((acc, col) => ({ ...acc, [col.field]: false }), { ...columnVisibilityModel });
              setColumnVisibilityModel(newHidden);
            } else {
              const newVisible = toggleCols.reduce((acc, col) => ({ ...acc, [col.field]: true }), { ...columnVisibilityModel });
              setColumnVisibilityModel(newVisible);
            }
          }} 
          sx={{ fontSize: 13, borderRadius: 1.5, py: 1, fontWeight: 'bold' }}
        >
          <Checkbox 
            checked={columns.filter(col => col.field !== 'actions' && col.field !== 'requestId').every(col => columnVisibilityModel[col.field] !== false)} 
            indeterminate={columns.filter(col => col.field !== 'actions' && col.field !== 'requestId').some(col => columnVisibilityModel[col.field] === false) && columns.filter(col => col.field !== 'actions' && col.field !== 'requestId').some(col => columnVisibilityModel[col.field] !== false)}
            size="small" 
            color="primary"
            sx={{ p: 0.5, mr: 1 }}
          />
          {t('common.selectAll', 'Select All')}
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        {columns.map((col) => (
          <MenuItem 
            key={col.field} 
            onClick={() => {
              setColumnVisibilityModel((prev) => ({
                ...prev,
                [col.field]: prev[col.field] === false ? true : false,
              }));
            }} 
            sx={{ fontSize: 13, borderRadius: 1.5, py: 1 }}
          >
            <Checkbox 
              checked={columnVisibilityModel[col.field] !== false} 
              size="small" 
              color="primary"
              sx={{ p: 0.5, mr: 1 }}
            />
            {col.headerName || col.field}
          </MenuItem>
        ))}
      </Menu>

      <ReorderColumnsDialog
        open={reorderOpen}
        onClose={() => setReorderOpen(false)}
        localFields={localFields}
        setLocalFields={setLocalFields}
        sortedColumns={sortedColumns}
        setColumnOrder={setColumnOrder}
        t={t}
      />

      {/* Toast notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={hideSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={hideSnackbar} severity={snackbarSeverity} variant="filled" sx={{ width: '100%', fontWeight: 600 }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* R&D Material Style FAB for Add New on Mobile */}
      {isMobile && authService.hasAction('tcc_tracking', 'canAdd') && (
        <DraggableFab onClick={() => setFormOpen(true)} />
      )}
    </Box>
  );
}
