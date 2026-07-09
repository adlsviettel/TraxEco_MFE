import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { 
  Box, Checkbox, Typography, Paper, IconButton, Divider, MenuItem, Chip, 
  Menu, Badge, useTheme, useMediaQuery, Tooltip, InputAdornment, Button
} from '@mui/material';
import { 
  DataGrid, useGridApiRef, gridFilteredSortedRowIdsSelector 
} from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams, GridRowParams } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SyncIcon from '@mui/icons-material/Sync';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ClearIcon from '@mui/icons-material/Clear';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import EditIcon from '@mui/icons-material/Edit';

// Services & Shared
import { tccService, type TccRequest, type RequestFilters } from '../services/tccService';
import { authService, AppButton, AppTextField, AdvancedFilterDrawer } from '@traxeco/shared';

// Column Menu & Context
import ExcelStyleColumnMenu from '../components/ExcelStyleColumnMenu';
import CustomFilterPanel from '../components/CustomFilterPanel';
import { columnFilterStore } from '../components/ColumnFilterContext';

// Hooks
import { useSnackbar } from '../hooks/useSnackbar';
import { useAdminRequests } from '../hooks/useAdminRequests';
import { useWebSocket } from '../hooks/useWebSocket';
import { useColumnManagement } from '../hooks/useColumnManagement';

// Components
import { ReorderColumnsDialog } from '../components/ReorderColumnsDialog';
import { DataGridFooter } from '../components/DataGridFooter';
import { MobileAdminRequestList } from '../components/MobileAdminRequestList';
import { AdminStatusDrawer } from '../components/AdminStatusDrawer';

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

export default function AdminStatusPage() {
  const { t } = useTranslation();
  const mainApiRef = useGridApiRef();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [columnsMenuAnchor, setColumnsMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<TccRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const canEditAdmin = useMemo(() => {
    return authService.isSuperAdmin() || authService.isAdmin() || authService.hasAction('tcc_admin_status', 'canEdit');
  }, []);

  // 1. Toast Notifications Hook
  const { 
    open: snackbarOpen, message: snackbarMessage, severity: snackbarSeverity, 
    showSnackbar, hideSnackbar 
  } = useSnackbar();

  // 2. Request Data hook
  const {
    requests, setRequests, loading, fromDate, setFromDate, toDate, setToDate,
    filters, developers, customers, factories,
    columnFilters, setColumnFilters, localColumnFilters, setLocalColumnFilters,
    filteredRequests, fetchRequests, handleFilterChange
  } = useAdminRequests(showSnackbar, t);

  // 3. WebSocket real-time updates
  useWebSocket('/topic/tcc-updates', fetchRequests);

  // 4. Column visibility and order Hook
  const {
    columnVisibilityModel, setColumnVisibilityModel, columnOrder, setColumnOrder,
    reorderOpen, setReorderOpen, localFields, setLocalFields, draggedFieldRef
  } = useColumnManagement('tcc_column_order', {
    machineType: false,
    priorityReason: false,
    releasedDate: false,
    comments: false,
    remarks: false,
    updatedBy: false,
    updatedAt: false,
  });

  const activeFiltersCount = (filters.factory ? 1 : 0) + (filters.season ? 1 : 0) + (fromDate ? 1 : 0) + (toDate ? 1 : 0);

  // Lock mobile body scroll
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

  // Sync drawer selection after updates
  const handleSaveSuccess = () => {
    setDrawerOpen(false);
    fetchRequests();
  };

  // Excel Exporter
  const handleExport = async () => {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Template Status');

      const visibleCols = columns.filter(col => 
        col.field !== 'actions' && 
        columnVisibilityModel[col.field] !== false
      );
      worksheet.columns = visibleCols.map(col => ({
        header: col.headerName || col.field,
        key: col.field,
        width: 20
      }));

      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2E7D32' },
        };
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
          let val = (req as any)[col.field];
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
      saveAs(blob, `TCC_Template_Status_${dateStr}.xlsx`);
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
      case 'Rejected':
        return t('tcc.statusRejected', 'Rejected');
      case 'Cancelled':
        return t('tcc.statusCancelled', 'Cancelled');
      case 'Deleted':
        return t('tcc.statusDeleted', 'Deleted');
      case 'Not Started':
      default:
        return t('tcc.statusNotStarted');
    }
  };

  // Columns Configuration
  const columns = useMemo<GridColDef[]>(() => [
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const status = params.row.status || 'Not Started';
        const isReleased = !!params.row.releasedDate;
        const canEditRow = !isReleased && status !== 'Deleted' && status !== 'Cancelled';

        if (canEditAdmin) {
          return (
            <Box display="flex" alignItems="center" gap={0.5} justifyContent="center" width="100%">
              <Tooltip title={isReleased ? t('tcc.cannotEditReleased', 'Released request cannot be edited') : t('tcc.edit', 'Edit')} arrow>
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    disabled={!canEditRow}
                    onClick={() => {
                      setSelectedRow(params.row as TccRequest);
                      setDrawerOpen(true);
                    }}
                    sx={{ 
                      color: canEditRow ? '#2e7d32' : 'text.disabled',
                      '&:hover': {
                        bgcolor: canEditRow ? 'rgba(46, 125, 50, 0.08)' : 'transparent',
                      }
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          );
        } else {
          return (
            <Box display="flex" alignItems="center" gap={0.5} justifyContent="center" width="100%">
              <Tooltip title={t('tcc.viewDetails', 'View Details')} arrow>
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => {
                      setSelectedRow(params.row as TccRequest);
                      setDrawerOpen(true);
                    }}
                    sx={{ 
                      color: '#15803d',
                      '&:hover': {
                        bgcolor: 'rgba(21, 128, 61, 0.08)',
                      }
                    }}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          );
        }
      }
    },
    {
      field: 'isPriority',
      headerName: 'Priority request',
      width: 100,
      renderCell: (params: GridRenderCellParams) =>
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
      field: 'createdAt',
      headerName: 'Request Creation Date ®',
      width: 125,
      renderCell: (params: GridRenderCellParams) => formatDate(params.value),
    },
    { field: 'monthYear', headerName: 'Month (auto)', width: 120 },
    { field: 'customer', headerName: 'Customer (R)', width: 120 },
    { field: 'season', headerName: 'Season ®', width: 90 },
    { field: 'styleNumber', headerName: 'Style number ®', width: 130 },
    { field: 'productType', headerName: 'Product type ®', width: 120 },
    { field: 'sampleStage', headerName: 'Sample  stage ®', width: 140 },
    { field: 'factory', headerName: 'Factory ®', width: 120 },
    {
      field: 'materialSentDate',
      headerName: 'Material sent date ®',
      width: 140,
      renderCell: (params: GridRenderCellParams) => formatDate(params.value),
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
      renderCell: (params: GridRenderCellParams) => formatDate(params.value),
    },
    { field: 'operationDescription', headerName: 'Operation Description ®', width: 180 },
    { field: 'machineType', headerName: 'Machine type®', width: 120 },
    { field: 'machineDimension', headerName: 'Machine dimension ®', width: 120 },
    { field: 'sizesRequired', headerName: 'Sample size', width: 120 },
    {
      field: 'startDate',
      headerName: 'Start Date (TCC)',
      width: 120,
      renderCell: (params: GridRenderCellParams) => formatDate(params.value),
    },
    {
      field: 'expectedDeliveryDate',
      headerName: 'Request Delivery Date',
      width: 140,
      renderCell: (params: GridRenderCellParams) => formatDate(params.value),
    },
    {
      field: 'confirmDeliveryDate',
      headerName: 'Confirmed Delivery Date',
      width: 140,
      renderCell: (params: GridRenderCellParams) => {
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
      renderCell: (params: GridRenderCellParams) => formatDate(params.value),
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
      renderCell: (params: GridRenderCellParams) => formatDate(params.value),
    },
    { field: 'delayRemakeReason', headerName: 'reason for remake/ Delay (TCC)', width: 180 },
    { field: 'templateQty', headerName: 'Template Qty (TCC)', width: 150 },
    { field: 'lineQuantity', headerName: 'Line Quantity', width: 180 },
    { field: 'comments', headerName: 'Comments', width: 180 },
    { field: 'developerName', headerName: 'In-charge Person  (TCC)', width: 130 },
    { field: 'remarks', headerName: 'Remarks (TCC)', minWidth: 180, flex: 1 },
    { field: 'updatedBy', headerName: 'Last Updated By', width: 150 },
    { 
      field: 'updatedAt', 
      headerName: 'Last Updated At', 
      width: 170,
      renderCell: (params: GridRenderCellParams) => formatDateTime(params.value)
    },
    { field: 'requestId', headerName: 'RequestID', width: 120 },
    { field: 'requesterName', headerName: 'NameOfRequester', width: 180 },
  ], [t, canEditAdmin]);

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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            width: '100%',
            height: '100%',
            userSelect: 'none',
          }}
        >
          <span
            draggable
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              draggedFieldRef.current = col.field;
            }}
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
            onDragEnd={() => {
              draggedFieldRef.current = null;
            }}
            style={{
              cursor: 'grab',
              display: 'inline-flex',
              alignItems: 'center',
              color: '#94a3b8',
              marginRight: '2px',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            ⠿
          </span>
          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {col.headerName || col.field}
          </span>
          {columnFilters[col.field] && (
            <FilterAltIcon style={{ color: '#1b5e20', fontSize: '14px', marginLeft: '2px' }} titleAccess="Filtered" />
          )}
        </div>
      )
    }));
  }, [columns, columnOrder, columnFilters, setColumnOrder, draggedFieldRef]);

  // Sync reorder fields
  useEffect(() => {
    if (reorderOpen) {
      setLocalFields(columns.map(c => c.field));
    }
  }, [reorderOpen, columns, setLocalFields]);

  // Register column filters
  columnFilterStore.register('admin', columnFilters, setColumnFilters, requests);

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
                if (e.key === 'Enter') fetchRequests();
              }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ fontSize: 20, color: '#707975', mr: 1 }} />,
                endAdornment: filters.customer ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => handleFilterChange('customer', '')}><ClearIcon sx={{ fontSize: 16 }} /></IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{ 
                flexGrow: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  height: 40,
                  fontSize: 13,
                  bgcolor: '#fff',
                  '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
                }
              }}
            />

            {/* Sync Button */}
            <IconButton 
              onClick={() => fetchRequests()}
              disabled={loading}
              sx={{ 
                bgcolor: 'rgba(46,125,50,0.1)', 
                color: '#2e7d32',
                borderRadius: '50%',
                width: 44, height: 44,
                flexShrink: 0
              }}
            >
              <SyncIcon sx={{ 
                fontSize: 20,
                animation: loading ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } }
              }} />
            </IconButton>

            {/* Filter Button */}
            <IconButton 
              onClick={() => setFilterOpen(true)}
              sx={{ 
                bgcolor: activeFiltersCount > 0 ? 'rgba(46,125,50,0.1)' : '#f1f5f9', 
                color: activeFiltersCount > 0 ? '#2e7d32' : '#64748b',
                borderRadius: '50%',
                width: 44, height: 44,
                flexShrink: 0
              }}
            >
              <Badge badgeContent={activeFiltersCount} color="success" sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 15, minWidth: 15 } }}>
                <FilterListIcon sx={{ fontSize: 20 }} />
              </Badge>
            </IconButton>

            {/* More Menu */}
            <IconButton 
              onClick={(e) => setMobileMenuAnchor(e.currentTarget)}
              sx={{ 
                bgcolor: '#f1f5f9', 
                color: '#64748b',
                borderRadius: '50%',
                width: 44, height: 44,
                flexShrink: 0
              }}
            >
              <MoreVertIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>

          {(filters.customer || activeFiltersCount > 0 || filteredRequests.length > 0) && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, mb: 0.5, px: 0.5 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {loading ? 'Loading...' : `${filteredRequests.length} requests found`}
              </Typography>
              <Divider sx={{ flexGrow: 1, ml: 1.5, borderColor: 'rgba(0,0,0,0.06)' }} />
            </Box>
          )}

          <Menu
            anchorEl={mobileMenuAnchor}
            open={Boolean(mobileMenuAnchor)}
            onClose={() => setMobileMenuAnchor(null)}
            PaperProps={{ sx: { borderRadius: 2, minWidth: 180 } }}
          >
            <MenuItem onClick={() => { setMobileMenuAnchor(null); setReorderOpen(true); }}>
              <ViewColumnIcon sx={{ mr: 1.5, fontSize: 20, color: 'text.secondary' }} />
              <Typography fontSize={14} fontWeight={500}>{t('tcc.columns', 'Columns')}</Typography>
            </MenuItem>
            <MenuItem disabled={exporting || filteredRequests.length === 0} onClick={() => { setMobileMenuAnchor(null); handleExport(); }}>
              <FileDownloadIcon sx={{ mr: 1.5, fontSize: 20, color: 'text.secondary' }} />
              <Typography fontSize={14} fontWeight={500}>
                {exporting ? t('tcc.exporting', 'Exporting...') : t('tcc.exportExcel', 'Export Excel')}
              </Typography>
            </MenuItem>
          </Menu>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 1, px: 3, py: 2, bgcolor: '#ffffff', borderBottom: '1px solid #e1e3e4', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', flex: 1, minWidth: 300 }}>
            <AppTextField
              placeholder={t('tcc.searchCustomer', 'Search Customer...')}
              size="small"
              value={filters.customer}
              onChange={(e) => handleFilterChange('customer', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchRequests();
              }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ fontSize: 20, color: '#707975', mr: 1 }} />,
                endAdornment: filters.customer ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => handleFilterChange('customer', '')}><ClearIcon sx={{ fontSize: 16 }} /></IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{ 
                flex: 1,
                minWidth: 200,
                maxWidth: 320,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  height: 40,
                  fontSize: 13,
                  bgcolor: '#fff',
                  '& fieldset': { borderColor: '#bfc9c4' },
                  '&:hover fieldset': { borderColor: '#3ba55c' },
                  '&.Mui-focused fieldset': { borderColor: '#3ba55c' }
                }
              }}
            />

            <AppButton
              data-testid="admin-btn-tcc-filter"
              variant="outlined"
              customVariant="secondary"
              startIcon={<FilterListIcon />}
              onClick={() => setFilterOpen(true)}
              sx={{ height: 40, borderRadius: '8px' }}
            >
              {t('tcc.filter', 'Filter')}{' '}
              {filters.factory || filters.season || fromDate || toDate ? '(Active)' : ''}
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
              data-testid="admin-btn-tcc-columns"
              variant="outlined"
              customVariant="secondary"
              onClick={(e) => setColumnsMenuAnchor(e.currentTarget)}
              startIcon={<ViewColumnIcon sx={{ fontSize: '20px !important' }} />}
              sx={{ height: 40, borderRadius: '8px' }}
            >
              {t('tcc.columns', 'Columns')}
            </AppButton>

            <AppButton
              data-testid="admin-btn-tcc-load-data"
              variant="contained"
              customVariant="primary"
              disabled={loading}
              onClick={() => fetchRequests()}
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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
            <Box sx={{ color: '#2e7d32', fontSize: 13, fontWeight: 500, bgcolor: 'rgba(46,125,50,0.1)', px: 1.5, py: 1, borderRadius: '8px' }}>
              {loading ? t('tcc.loading', 'Loading...') : t('tcc.items_count', { count: filteredRequests.length, defaultValue: `${filteredRequests.length} items` })}
            </Box>

            <AppButton
              variant="outlined"
              customVariant="primary"
              disabled={exporting || filteredRequests.length === 0}
              onClick={handleExport}
              startIcon={<FileDownloadIcon />}
              sx={{ height: 40, borderRadius: '8px' }}
            >
              {exporting ? t('tcc.exporting', 'Exporting...') : t('tcc.exportExcel', 'Export Excel')}
            </AppButton>
          </Box>
        </Box>
      )}

      {/* Main Grid View */}
      {isMobile ? (
        <MobileAdminRequestList
          requests={filteredRequests}
          loading={loading}
          filters={filters}
          canEdit={canEditAdmin}
          setSelectedRow={setSelectedRow}
          setDrawerOpen={setDrawerOpen}
          getStatusLabel={getStatusLabel}
          getStatusStyle={getStatusStyle}
          formatDate={formatDate}
          t={t}
        />
      ) : (
        <Paper elevation={0} sx={{ flex: 1, minHeight: 400, height: 'calc(100vh - 200px)', borderRadius: '8px', border: '1px solid #e2e8f0', bgcolor: '#ffffff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <DataGrid
            apiRef={mainApiRef}
            rows={filteredRequests}
            columns={sortedColumns}
            getRowId={(row) => row.requestId}
            getRowClassName={(params) => params.row.status === 'Cancelled' ? 'row-cancelled' : ''}
            loading={loading}
            disableRowSelectionOnClick
            rowHeight={60}
            columnVisibilityModel={columnVisibilityModel}
            onColumnVisibilityModelChange={(newModel) => setColumnVisibilityModel(newModel)}
            onRowDoubleClick={(params: GridRowParams) => {
              setSelectedRow(params.row as TccRequest);
              setDrawerOpen(true);
            }}
            initialState={{
              pagination: { paginationModel: { pageSize: 20 } },
            }}
            slots={{
              footer: DataGridFooter,
              columnMenu: ExcelStyleColumnMenu,
              filterPanel: CustomFilterPanel,
            }}
            sx={{
              height: '100%',
              border: 'none',
              '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-filler, & .MuiDataGrid-scrollbarFiller, & .MuiDataGrid-columnHeader--filled': { backgroundColor: '#F9FAFA !important', borderBottom: '1px solid #e1e3e4 !important' },
              '& .MuiDataGrid-columnHeader': { bgcolor: '#F9FAFA', color: '#707975', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' },
              '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, whiteSpace: 'normal !important', lineHeight: '1.2 !important', wordBreak: 'normal' },
              '& .MuiDataGrid-cell': { borderColor: '#e2e8f0', fontSize: '13px', color: '#3f4945', '&:focus': { outline: 'none !important' }, '&:focus-within': { outline: 'none !important' } },
              '& .MuiDataGrid-row:hover': { bgcolor: '#F9FAFA !important' },
              '& .row-cancelled': { opacity: 0.5 }
            }}
          />
        </Paper>
      )}

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
          setFromDate('');
          setToDate('');
          setLocalColumnFilters({});
          setColumnFilters({});
          setFilterOpen(false);
          fetchRequests({ customer: '', factory: '', season: '' });
        }}
        onApply={() => {
          setColumnFilters(localColumnFilters);
          setFilterOpen(false);
          fetchRequests();
        }}
      >
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
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
              {t('tcc.fromDate', 'From Date')}
            </Typography>
            <DatePicker format="dd/MM/yyyy"
              value={fromDate ? new Date(fromDate) : null}
              onChange={(val) => setFromDate(val ? format(val, 'yyyy-MM-dd') : '')}
              slotProps={{
                field: { clearable: true },
                textField: {
                  fullWidth: true,
                  size: 'small',
                  sx: {
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', height: 40, fontSize: 13, bgcolor: '#fff' }
                  }
                }
              }}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: '#334155' }}>
              {t('tcc.toDate', 'To Date')}
            </Typography>
            <DatePicker format="dd/MM/yyyy"
              value={toDate ? new Date(toDate) : null}
              onChange={(val) => setToDate(val ? format(val, 'yyyy-MM-dd') : '')}
              slotProps={{
                field: { clearable: true },
                textField: {
                  fullWidth: true,
                  size: 'small',
                  sx: {
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', height: 40, fontSize: 13, bgcolor: '#fff' }
                  }
                }
              }}
            />
          </Box>
        </Box>
      </AdvancedFilterDrawer>

      {/* Admin Status Detail / Progress Form Drawer */}
      <AdminStatusDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        selectedRow={selectedRow}
        setSelectedRow={setSelectedRow}
        canEdit={canEditAdmin}
        developers={developers}
        customers={customers}
        factories={factories}
        onSaveSuccess={handleSaveSuccess}
        onRefreshData={fetchRequests}
      />

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

      {/* Column Reordering Dialog */}
      <ReorderColumnsDialog
        open={reorderOpen}
        onClose={() => setReorderOpen(false)}
        localFields={localFields}
        setLocalFields={setLocalFields}
        sortedColumns={sortedColumns}
        setColumnOrder={setColumnOrder}
        t={t}
      />
    </Box>
  );
}
