import ExcelStyleColumnMenu from '../components/ExcelStyleColumnMenu';
import CustomFilterPanel from '../components/CustomFilterPanel';
import { columnFilterStore } from '../components/ColumnFilterContext';
import MobileColumnFilters from '../components/MobileColumnFilters';
import { keyframes } from '@mui/system';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InputAdornment } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ClearIcon from '@mui/icons-material/Clear';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import {
  Box,
  Typography,
  Drawer,
  IconButton,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  CircularProgress,
  Paper,
  Chip,
  Checkbox,
  Button,
  Menu,

  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Pagination,
  Snackbar,
  Alert,
  Badge,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  DataGrid, 
  useGridApiContext, 
  useGridSelector, 
  gridPageSelector, 
  gridPageCountSelector, 
  gridPaginationModelSelector,
  useGridApiRef,
  gridFilteredSortedRowIdsSelector
} from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams, GridRowParams } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SyncIcon from '@mui/icons-material/Sync';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { tccService, type TccRequest, type UpdateProgressPayload, type RequestFilters } from '../services/tccService';
import { Client } from '@stomp/stompjs';
import { authService, AppButton, AppTextField, AdvancedFilterDrawer } from '@traxeco/shared';

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'Work in Progress':
      return {
        bgcolor: '#eff6ff',
        color: '#1d4ed8',
        border: '1px solid #bfdbfe',
        fontWeight: 600,
      };
    case 'Completed':
      return {
        bgcolor: '#f0fdf4',
        color: '#15803d',
        border: '1px solid #bbf7d0',
        fontWeight: 600,
      };
    case 'Released':
      return {
        bgcolor: '#f5f3ff',
        color: '#6d28d9',
        border: '1px solid #ddd6fe',
        fontWeight: 600,
      };
    case 'Remake':
      return {
        bgcolor: '#fffbeb',
        color: '#b45309',
        border: '1px solid #fde68a',
        fontWeight: 600,
      };
    case 'Cancelled':
      return {
        bgcolor: '#f8fafc',
        color: '#64748b',
        border: '1px solid #e2e8f0',
        fontWeight: 600,
      };
    case 'Rejected':
    case 'Deleted':
      return {
        bgcolor: '#fef2f2',
        color: '#b91c1c',
        border: '1px solid #fecaca',
        fontWeight: 600,
      };
    case 'Not Started':
    default:
      return {
        bgcolor: '#f1f5f9',
        color: '#475569',
        border: '1px solid #cbd5e1',
        fontWeight: 600,
      };
  }
};

const getStatusLabel = (status: string, t: any) => {
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

function CustomFooter() {
  const { t } = useTranslation();
  const apiRef = useGridApiContext();
  const page = useGridSelector(apiRef, gridPageSelector);
  const pageCount = useGridSelector(apiRef, gridPageCountSelector);
  const paginationModel = useGridSelector(apiRef, gridPaginationModelSelector);
  const pageSize = paginationModel?.pageSize || 20;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ 
      borderTop: '1px solid #e1e3e4', 
      px: isMobile ? 1.5 : 3, 
      py: 1.5, 
      bgcolor: '#fff', 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: 'center', 
      gap: isMobile ? 1.5 : 2,
      justifyContent: 'space-between', 
      flexShrink: 0 
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#3f4945', fontSize: 12 }}>
        <span>{t('tcc.rowsPerPage', 'Rows per page:')}</span>
        <Select
          value={pageSize}
          onChange={(e) => apiRef.current.setPageSize(Number(e.target.value))}
          size="small"
          sx={{ 
            height: 28, 
            fontSize: 12, 
            bgcolor: '#f3f4f5', 
            '& fieldset': { border: 'none' }, 
            '&:hover fieldset': { border: '1px solid #bfc9c4' } 
          }}
        >
          {[20, 50, 100].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </Select>
      </Box>
      <Pagination
        count={pageCount}
        page={page + 1}
        onChange={(_, p) => apiRef.current.setPage(p - 1)}
        color="primary" 
        shape="rounded"
        size={isMobile ? "small" : "medium"}
        siblingCount={isMobile ? 0 : 1}
        sx={{ 
          '& .MuiPaginationItem-root': { 
            color: '#3f4945', 
            fontSize: isMobile ? 12 : 14,
            height: isMobile ? 28 : 32,
            minWidth: isMobile ? 28 : 32,
            '&.Mui-selected': { 
              bgcolor: '#1b5e20', 
              color: '#fff', 
              '&:hover': { bgcolor: '#1b6d24' } 
            } 
          } 
        }}
      />
    </Box>
  );
}

const getTodayString = (date = new Date()) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getPastDateString = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return getTodayString(date);
};

// =====================================================================
// MobileAdminRequestList - Danh sách card dành cho Admin
// =====================================================================
interface MobileAdminRequestListProps {
  requests: TccRequest[];
  loading: boolean;
  filters: any;
  canEdit: boolean;
  setSelectedRow: (row: TccRequest) => void;
  setDrawerOpen: (open: boolean) => void;
  getStatusLabel: (s: string, t: any) => string;
  getStatusStyle: (s: string) => any;
  formatDate: (v: any) => string;
  t: any;
}

function MobileAdminRequestList({
  requests, loading, filters, canEdit,
  setSelectedRow, setDrawerOpen,
  getStatusLabel, getStatusStyle, formatDate, t
}: MobileAdminRequestListProps) {
  const [mobilePage, setMobilePage] = React.useState(0);
  const MOBILE_PAGE_SIZE = 20;

  // Local mobile filtering based on search text
  const filteredRows = React.useMemo(() => {
    const q = (filters.customer ?? '').toLowerCase().trim();
    if (!q) return requests;
    return requests.filter(r =>
      (r.customer ?? '').toLowerCase().includes(q) ||
      (r.styleNumber ?? '').toLowerCase().includes(q) ||
      (r.developerName ?? '').toLowerCase().includes(q) ||
      String(r.requestId ?? '').toLowerCase().includes(q)
    );
  }, [requests, filters.customer]);

  const totalPages = Math.ceil(filteredRows.length / MOBILE_PAGE_SIZE);
  const pageRows = filteredRows.slice(mobilePage * MOBILE_PAGE_SIZE, (mobilePage + 1) * MOBILE_PAGE_SIZE);

  const InfoRow = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <Box>
      <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1.2 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 600, color: color ?? '#334155', fontSize: 13, lineHeight: 1.3 }}>
        {value || '\u2014'}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, mt: 1 }}>
      {/* Card list */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
            <CircularProgress size={36} sx={{ color: '#2e7d32' }} />
          </Box>
        ) : pageRows.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 8 }}>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>{t('tcc.noDataFound', 'No data found')}</Typography>
          </Box>
        ) : pageRows.map((row) => {
          const displayStatus = row.releasedDate ? 'Released' : (row.status || 'Not Started');
          const isReleased = !!row.releasedDate;
          const isCancelled = row.status === 'Cancelled';
          const canEditRow = !isReleased && row.status !== 'Deleted' && !isCancelled;
          const isLate = (() => {
            if (!row.confirmDeliveryDate || !row.expectedDeliveryDate) return false;
            const rq = new Date(row.expectedDeliveryDate); rq.setHours(0,0,0,0);
            const cf = new Date(row.confirmDeliveryDate); cf.setHours(0,0,0,0);
            return cf > rq;
          })();

          return (
            <Box
              key={row.requestId}
              onClick={() => {
                setSelectedRow(row);
                setDrawerOpen(true);
              }}
              sx={{
                position: 'relative',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                overflow: 'hidden',
                opacity: isCancelled ? 0.6 : 1,
                bgcolor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                cursor: 'pointer',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Header */}
              <Box sx={{
                position: 'relative',
                pl: row.isPriority ? 4.5 : 2, pr: 2, py: 1.3,
                background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
              }}>
                {row.isPriority && (
                  <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 0,
                    height: 0,
                    borderStyle: 'solid',
                    borderWidth: '32px 32px 0 0',
                    borderColor: '#dc2626 transparent transparent transparent',
                    zIndex: 10,
                  }}>
                    <Box sx={{
                      position: 'absolute',
                      top: -29,
                      left: 4,
                      color: '#ffffff',
                      fontSize: 9,
                      fontWeight: 'bold',
                    }}>
                      ★
                    </Box>
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: 14 }}>
                    #{row.requestId}
                  </Typography>
                  <Typography sx={{ color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>{formatDate(row.createdAt)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ 
                    ...getStatusStyle(displayStatus), 
                    fontSize: 10, fontWeight: 700, px: 1.2, py: 0.4, borderRadius: '6px',
                    whiteSpace: 'nowrap'
                  }}>
                    {getStatusLabel(displayStatus, t)}
                  </Box>
                  {canEdit && canEditRow ? (
                    <IconButton size="small" sx={{ color: '#2e7d32', p: 0.5 }}>
                      <EditIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  ) : (
                    <IconButton size="small" sx={{ color: '#64748b', p: 0.5 }}>
                      <VisibilityIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  )}
                </Box>
              </Box>

              {/* Body */}
              <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <InfoRow label={t('tcc.customer', 'Customer')} value={row.customer} />
                  <InfoRow label={t('tcc.season', 'Season')} value={row.season} />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1.5 }}>
                  <InfoRow label={t('tcc.styleNumber', 'Style')} value={row.styleNumber} />
                  <InfoRow label={t('tcc.factory', 'Factory')} value={row.factory} />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <InfoRow label={t('tcc.inChargePerson', 'In-charge Person')} value={row.developerName} color={row.developerName ? '#1e293b' : '#94a3b8'} />
                  <InfoRow label={t('tcc.sampleStage', 'Sample Stage')} value={row.sampleStage} />
                </Box>

                {/* Dates */}
                <Box sx={{ borderTop: '1px dashed #e2e8f0', pt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{t('tcc.matSent', 'Mat. Sent')}</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#334155', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(row.materialSentDate) || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{t('tcc.reqDel', 'Req. Del.')}</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#334155', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(row.expectedDeliveryDate) || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{t('tcc.confDel', 'Conf. Del.')}</Typography>
                    <Typography sx={{ fontWeight: 700, color: isLate ? '#dc2626' : '#334155', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(row.confirmDeliveryDate) || '—'}</Typography>
                  </Box>
                </Box>

                {row.remarks && (
                  <Box sx={{ bgcolor: '#f8fafc', borderRadius: '8px', px: 1.5, py: 0.8, borderLeft: '3px solid #e2e8f0' }}>
                    <Typography sx={{ color: '#64748b', fontSize: 11, fontStyle: 'italic' }} noWrap>{row.remarks}</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (() => {
        const current = mobilePage + 1; // 1-indexed
        const pages: (number | 'dots')[] = [];
        const addPage = (p: number) => { if (!pages.includes(p) && p >= 1 && p <= totalPages) pages.push(p); };
        
        // Always page 1
        addPage(1);
        // One before current
        addPage(current - 1);
        // Current
        addPage(current);
        // One after current
        addPage(current + 1);
        // Always last page
        addPage(totalPages);
        
        // Insert ellipsis for gaps
        const withDots: (number | 'dots')[] = [];
        let prev = 0;
        for (const p of pages) {
          if (typeof p === 'number') {
            if (prev && p - prev > 1) withDots.push('dots');
            withDots.push(p);
            prev = p;
          }
        }

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, py: 1.5, borderTop: '1px solid #e2e8f0', bgcolor: '#fff', flexShrink: 0 }}>
            {/* Prev arrow */}
            <IconButton size="small" disabled={mobilePage === 0} onClick={() => setMobilePage(p => p - 1)}
              sx={{ width: 30, height: 30, fontSize: 14, color: '#475569' }}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            
            {withDots.map((item, idx) => 
              item === 'dots' ? (
                <Typography key={`dots-${idx}`} sx={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#94a3b8' }}>…</Typography>
              ) : (
                <Box key={item} onClick={() => setMobilePage(item - 1)}
                  sx={{
                    width: 30, height: 30, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    ...(item === current
                      ? { bgcolor: '#1b5e20', color: '#fff' }
                      : { color: '#475569', '&:hover': { bgcolor: '#f1f5f9' } }
                    )
                  }}
                >
                  {item}
                </Box>
              )
            )}
            
            {/* Next arrow */}
            <IconButton size="small" disabled={mobilePage >= totalPages - 1} onClick={() => setMobilePage(p => p + 1)}
              sx={{ width: 30, height: 30, fontSize: 14, color: '#475569' }}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>
        );
      })()}
    </Box>
  );
}


export default function AdminStatusPage() {
  const { t } = useTranslation();
  const mainApiRef = useGridApiRef();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);

  const canEditAdmin = React.useMemo(() => {
    return authService.isSuperAdmin() || authService.isAdmin() || authService.hasAction('tcc_admin_status', 'canEdit');
  }, []);

  const [requests, setRequests] = useState<TccRequest[]>([]);
  const [fromDate, setFromDate] = useState<string>(getPastDateString(30));
  const [toDate, setToDate] = useState<string>(getTodayString());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RequestFilters>({
    customer: '',
    factory: '',
    season: '',
  });

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


  const activeFiltersCount = (filters.factory ? 1 : 0) + (filters.season ? 1 : 0) + (fromDate ? 1 : 0) + (toDate ? 1 : 0);

  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [localColumnFilters, setLocalColumnFilters] = useState<Record<string, string[]>>({});

  // Pre-filter requests using columnFilters (for multi-column filter on Community DataGrid)
  const filteredRequests = useMemo(() => {
    const filterEntries = Object.entries(columnFilters);
    if (filterEntries.length === 0) return requests;
    return requests.filter(row => {
      return filterEntries.every(([field, allowedValues]) => {
        if (!allowedValues || allowedValues.length === 0) return true;
        let val: any;
        // Special case: status column uses computed display value
        if (field === 'status') {
          val = row.releasedDate ? 'Released' : (row.status || 'Not Started');
        } else {
          val = (row as any)[field];
          if (val && (field.toLowerCase().includes('date') || field.endsWith('At'))) {
            try {
              val = format(new Date(val), 'dd/MM/yyyy');
            } catch { /* fallback */ }
          }
        }
        val = (val !== undefined && val !== null && val !== '') ? String(val) : '(Blanks)';
        return allowedValues.includes(val);
      });
    });
  }, [requests, columnFilters]);

  columnFilterStore.register('admin', columnFilters, setColumnFilters, requests);

  const [selectedRow, setSelectedRow] = useState<TccRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (filterOpen) {
      setLocalColumnFilters(columnFilters);
    }
  }, [filterOpen, columnFilters]);

  const [exporting, setExporting] = useState(false);
  const [colMenuAnchor, setColMenuAnchor] = useState<null | HTMLElement>(null);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('tcc_column_order');
    return saved ? JSON.parse(saved) : [];
  });
  const [localFields, setLocalFields] = useState<string[]>([]);
  const draggedIndexRef = useRef<number | null>(null);
  const draggedFieldRef = useRef<string | null>(null);
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<Record<string, boolean>>({
    machineType: false,
    priorityReason: false,
    releasedDate: false,
    comments: false,
    remarks: false,
    updatedBy: false,
    updatedAt: false,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Template Status');

      // Define columns based on visibility model
      const visibleCols = columns.filter(col => 
        col.field !== 'actions' && 
        columnVisibilityModel[col.field] !== false
      );
      worksheet.columns = visibleCols.map(col => ({
        header: col.headerName || col.field,
        key: col.field,
        width: 20
      }));

      // Format Header Row
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

      // Add Data
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
    } finally {
      setExporting(false);
    }
  };




  // Initial developer list, metadata will append more if available
  const [developers, setDevelopers] = useState<string[]>([
    'Phoung', 'Tam', 'Lam', 'Quan', 'Phuoc', 'Di', 'Hoan'
  ]);
  const [customers, setCustomers] = useState<string[]>([]);
  const [factories, setFactories] = useState<string[]>([]);

  const fetchRequests = async (overrideFilters?: RequestFilters & { fromDate?: string; toDate?: string }) => {
    setLoading(true);
    try {
      const activeFilters: RequestFilters = overrideFilters || {
        ...filters,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      };
      const data = await tccService.getRequests(activeFilters);
      setError(null);
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch requests', error);
      setError(t('tcc.fetchError', 'Không thể tải danh sách yêu cầu'));
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestsRef = useRef(fetchRequests);
  const wsClientRef = useRef<Client | null>(null);

  useEffect(() => {
    fetchRequestsRef.current = fetchRequests;
  }, [fetchRequests]);

  useEffect(() => {
    fetchRequests();

    const loadMetadata = async () => {
      try {
        const data = await tccService.getMetadata();
        if (data.developer && data.developer.length > 0) {
          setDevelopers((prev) => Array.from(new Set([...prev, ...data.developer])));
        }
        if (data.customer && data.customer.length > 0) {
          setCustomers(data.customer);
        }
        if (data.factory && data.factory.length > 0) {
          setFactories(data.factory);
        }
      } catch (error) {
        console.error('Failed to fetch metadata for filters', error);
      }
    };
    loadMetadata();

    // WebSocket / STOMP Client for real-time triggers
    const getWsUrl = () => {
      const apiBase = (import.meta as any).env.VITE_API_BASE_URL || '/api';
      if (apiBase.startsWith('https://')) {
        const wsBase = apiBase.replace(/^https/, 'wss');
        return wsBase.replace(/\/api\/?$/, '') + '/ws-qc';
      } else if (apiBase.startsWith('http://')) {
        const wsBase = apiBase.replace(/^http/, 'ws');
        return wsBase.replace(/\/api\/?$/, '') + '/ws-qc';
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsPath = apiBase.replace(/\/api\/?$/, '');
        return `${protocol}//${window.location.host}${wsPath}/ws-qc`;
      }
    };

    const client = new Client({
      brokerURL: getWsUrl(),
      onConnect: () => {
        client.subscribe('/topic/tcc-updates', () => {
          fetchRequestsRef.current();
        });
      },
      onDisconnect: () => {}
    });
    wsClientRef.current = client;
    client.activate();

    return () => {
      client.deactivate();
      wsClientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (field: keyof RequestFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const columns = React.useMemo<GridColDef[]>(() => {
    const baseColumns: GridColDef[] = [
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
        headerName: t('tcc.expectedDeliveryDate', 'Request Delivery Date'),
        width: 140,
        renderCell: (params: GridRenderCellParams) => formatDate(params.value),
      },
      {
        field: 'confirmDeliveryDate',
        headerName: t('tcc.confirmDeliveryDate', 'Confirmed Delivery Date'),
        width: 140,
        renderCell: (params: GridRenderCellParams) => {
          const reqDateStr = params.row.expectedDeliveryDate;
          const confDateStr = params.value;
          
          const formattedDate = formatDate(confDateStr);
          if (!formattedDate) return '';

          // If confirmed delivery date is "after" request delivery date, highlight in RED!
          if (reqDateStr && confDateStr) {
            const reqDate = new Date(reqDateStr);
            const confDate = new Date(confDateStr);
            reqDate.setHours(0, 0, 0, 0);
            confDate.setHours(0, 0, 0, 0);
            
            if (confDate > reqDate) {
              return (
                <Typography variant="body2" sx={{ color: '#dc2626', fontWeight: 700, fontSize: '13px' }}>
                  {formattedDate}
                </Typography>
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
              label={getStatusLabel(displayStatus, t)}
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
      { field: 'templateQty', headerName: t('tcc.templateQty', 'Template Qty (TCC)'), width: 150 },
      { field: 'lineQuantity', headerName: t('tcc.lineQuantity', 'Line Quantity'), width: 180 },
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
    ];

    const orderedColumns = columnOrder && columnOrder.length > 0
      ? [...baseColumns].sort((a, b) => {
          const orderMap = new Map(columnOrder.map((field, index) => [field, index]));
          const indexA = orderMap.has(a.field) ? orderMap.get(a.field)! : 999;
          const indexB = orderMap.has(b.field) ? orderMap.get(b.field)! : 999;
          return indexA - indexB;
        })
      : baseColumns;

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
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              draggedFieldRef.current = col.field;
            }}
            onDragOver={(e) => {
              e.preventDefault();
            }}
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
                  localStorage.setItem('tcc_column_order', JSON.stringify(updated));
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
  }, [t, setSelectedRow, setDrawerOpen, canEditAdmin, columnOrder, columnFilters]);

  useEffect(() => {
    if (reorderOpen) {
      setLocalFields(columns.map(c => c.field));
    }
  }, [reorderOpen, columns]);

  const handleSaveSuccess = () => {
    setDrawerOpen(false);
    fetchRequests();
    if (wsClientRef.current && wsClientRef.current.connected) {
      try {
        wsClientRef.current.publish({ destination: '/topic/tcc-updates', body: 'refresh' });
      } catch (err) {
        console.error('Failed to publish WS message', err);
      }
    }
  };



  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.5, overflow: 'hidden' }}>
      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1, px: 1.5, pt: 1.5 }}>
          {/* R&D Material Style Mobile Toolbar */}
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
                width: 44,
                height: 44,
                flexShrink: 0,
                '&:hover': { bgcolor: 'rgba(46,125,50,0.15)' }
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
                width: 44,
                height: 44,
                flexShrink: 0,
                '&:hover': { bgcolor: activeFiltersCount > 0 ? 'rgba(46,125,50,0.15)' : '#e2e8f0' }
              }}
            >
              <Badge badgeContent={activeFiltersCount} color="success" sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 15, minWidth: 15 } }}>
                <FilterListIcon sx={{ fontSize: 20 }} />
              </Badge>
            </IconButton>

            {/* More Trigger */}
            <IconButton 
              onClick={(e) => setMobileMenuAnchor(e.currentTarget)}
              sx={{ 
                bgcolor: '#f1f5f9', 
                color: '#64748b',
                borderRadius: '50%',
                width: 44,
                height: 44,
                flexShrink: 0,
                '&:hover': { bgcolor: '#e2e8f0' }
              }}
            >
              <MoreVertIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>

          {/* Divider with count */}
          {(filters.customer || activeFiltersCount > 0 || filteredRequests.length > 0) && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, mb: 0.5, px: 0.5 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {loading ? 'Loading...' : `${filteredRequests.length} requests found`}
              </Typography>
              <Divider sx={{ flexGrow: 1, ml: 1.5, borderColor: 'rgba(0,0,0,0.06)' }} />
            </Box>
          )}

          {/* More Actions Menu */}
          <Menu
            anchorEl={mobileMenuAnchor}
            open={Boolean(mobileMenuAnchor)}
            onClose={() => setMobileMenuAnchor(null)}
            PaperProps={{ sx: { borderRadius: 2, minWidth: 180, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' } }}
          >
            <MenuItem onClick={(e) => { setMobileMenuAnchor(null); setColMenuAnchor(e.currentTarget); }}>
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
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 1 }}>
          {/* Search & Filters */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', flex: 1, minWidth: 300 }}>
            <AppTextField
              placeholder={t('tcc.searchCustomer', 'Search Customer...')}
              size="small"
              value={filters.customer}
              onChange={(e) => {
                handleFilterChange('customer', e.target.value);
              }}
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
              variant="outlined"
              customVariant="secondary"
              onClick={(e) => setColMenuAnchor(e.currentTarget)}
              startIcon={<ViewColumnIcon sx={{ fontSize: '20px !important' }} />}
              sx={{ height: 40, borderRadius: '8px' }}
            >
              {t('tcc.columns', 'Columns')}
            </AppButton>

            <AppButton
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

          {/* Export Actions */}
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
      {/* DATA GRID */}
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
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          minHeight: 400,
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          bgcolor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <DataGrid
          apiRef={mainApiRef}
          rows={filteredRequests}
          columns={columns}
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
            footer: CustomFooter,
            columnMenu: ExcelStyleColumnMenu,
            filterPanel: CustomFilterPanel,
          }}

          sx={{
            border: 'none',
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
            },
            '--header-bg': '#F9FAFA',
            '--DataGrid-t-header-background-base': '#F9FAFA',
            '--DataGrid-containerBackground': '#F9FAFA',
            '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-filler, & .MuiDataGrid-scrollbarFiller, & .MuiDataGrid-columnHeader--filled': {
              backgroundColor: '#F9FAFA !important',
              borderBottom: '1px solid #e1e3e4 !important',
            },
            '& .MuiDataGrid-columnHeader': {
              bgcolor: '#F9FAFA',
              color: '#707975',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            },
            '& .MuiDataGrid-columnHeaderTitleContainer': {
              whiteSpace: 'normal',
              lineHeight: 'normal',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 700,
              whiteSpace: 'normal !important',
              lineHeight: '1.2 !important',
              wordBreak: 'normal',
            },
            '& .MuiDataGrid-cell': {
              borderColor: '#e1e3e4',
              fontSize: '13px',
              color: '#3f4945',
              '&:focus': {
                outline: 'none !important',
              },
              '&:focus-within': {
                outline: 'none !important',
              },
            },
            '& .MuiDataGrid-row:hover': {
              bgcolor: '#F9FAFA !important',
            },
            '& .row-cancelled': {
              opacity: 0.5,
              pointerEvents: 'none',
            }
          }}
        />
      </Paper>
      )}

      <AdminStatusDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        selectedRow={selectedRow}
        setSelectedRow={setSelectedRow}
        onSaveSuccess={handleSaveSuccess}
        onRefreshData={() => fetchRequests()}
        developers={developers}
        canEdit={canEditAdmin}
      />

      {/* (Delete dialog removed) */}

      {/* Advanced Filter Drawer */}
      <AdvancedFilterDrawer
        title={t('tcc.advancedFilter', 'Filter Nâng cao')}
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onClear={() => {
          setFilters({ customer: '', factory: '', season: '' });
          setFromDate('');
          setToDate('');
          setLocalColumnFilters({});
          setColumnFilters({});
          setFilterOpen(false);
          fetchRequests({ customer: '', factory: '', season: '', fromDate: '', toDate: '' });
        }}
        onApply={() => {
          setColumnFilters(localColumnFilters);
          setFilterOpen(false);
          fetchRequests();
        }}
        hasActiveFilters={Boolean(filters.customer || filters.factory || filters.season || fromDate || toDate || Object.keys(columnFilters).length > 0)}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={-1}>
            {t('tcc.additionalFilters', 'Additional Filters')}
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontSize: 13 }}>{t('tcc.customer', 'Customer')}</InputLabel>
            <Select
              value={filters.customer || ''}
              label={t('tcc.customer', 'Customer')}
              onChange={(e) => handleFilterChange('customer', e.target.value)}
              sx={{
                borderRadius: '8px',
                height: 40,
                fontSize: 13,
                bgcolor: '#fff',
                '& fieldset': { borderColor: '#bfc9c4' },
                '&:hover fieldset': { borderColor: '#2e7d32' },
                '&.Mui-focused fieldset': { borderColor: '#2e7d32' },
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {customers.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontSize: 13 }}>{t('tcc.factory', 'Factory')}</InputLabel>
            <Select
              value={filters.factory || ''}
              label={t('tcc.factory', 'Factory')}
              onChange={(e) => handleFilterChange('factory', e.target.value)}
              sx={{
                borderRadius: '8px',
                height: 40,
                fontSize: 13,
                bgcolor: '#fff',
                '& fieldset': { borderColor: '#bfc9c4' },
                '&:hover fieldset': { borderColor: '#2e7d32' },
                '&.Mui-focused fieldset': { borderColor: '#2e7d32' },
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {factories.map((f) => (
                <MenuItem key={f} value={f}>
                  {f}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <AppTextField
            label={t('tcc.season', 'Season')}
            fullWidth
            value={filters.season || ''}
            debounceMs={400}
            onDebounceChange={(val) => handleFilterChange('season', val)}
          />

          <Divider sx={{ my: 0.5 }} />

          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={-1}>
            {t('common.dateRange', 'Date Range')}
          </Typography>

          <DatePicker format="dd/MM/yyyy"
            label={t('common.fromDate', 'From Date')}
            value={fromDate ? new Date(fromDate) : null}
            onChange={(val) => setFromDate(val ? format(val, 'yyyy-MM-dd') : '')}
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true,
                sx: {
                  '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                            height: 40,
                            fontSize: 13,
                            bgcolor: '#fff',
                            '& fieldset': { borderColor: '#bfc9c4' },
                    '&:hover fieldset': { borderColor: '#2e7d32' },
                    '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
                  },
                  '& .MuiInputLabel-root': { fontSize: 13 }
                }
              }
            }}
          />

          <DatePicker format="dd/MM/yyyy"
            label={t('common.toDate', 'To Date')}
            value={toDate ? new Date(toDate) : null}
            onChange={(val) => setToDate(val ? format(val, 'yyyy-MM-dd') : '')}
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true,
                sx: {
                  '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                            height: 40,
                            fontSize: 13,
                            bgcolor: '#fff',
                            '& fieldset': { borderColor: '#bfc9c4' },
                    '&:hover fieldset': { borderColor: '#2e7d32' },
                    '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
                  },
                  '& .MuiInputLabel-root': { fontSize: 13 }
                }
              }
            }}
          />

          {isMobile && (
            <>
              <Divider sx={{ my: 0.5 }} />
              <MobileColumnFilters
                pageId="admin"
                allFields={[
                  { 
                    field: 'status', 
                    label: t('tcc.status', 'Status'),
                    valueGetter: (value: any, row: any) => getStatusLabel(row.releasedDate ? 'Released' : (value || 'Not Started'), t)
                  },
                  { 
                    field: 'processType', 
                    label: t('tcc.processType', 'Process Type'),
                    valueGetter: (value: any) => String(value).includes('Full') ? t('tcc.processFull', 'Full Process') : t('tcc.processLight', 'Light Process')
                  },
                  { field: 'developerName', label: t('tcc.developer', 'Developer') },
                  { field: 'productType', label: t('tcc.productType', 'Product Type') },
                  { field: 'sampleStage', label: t('tcc.sampleStage', 'Sample Stage') },
                  { field: 'machineType', label: t('tcc.machineType', 'Machine Type') },
                  { field: 'machineDimension', label: t('tcc.machineDimension', 'Machine Dimension') },
                  { field: 'sizesRequired', label: t('tcc.sizesRequired', 'Sample Size') },
                  { field: 'priorityReason', label: t('tcc.priorityReason', 'Priority Reason') },
                  { field: 'monthYear', label: t('tcc.monthYear', 'Month (Auto)') },
                  { field: 'styleNumber', label: t('tcc.styleNumber', 'Style Number') },
                  { field: 'operationDescription', label: t('tcc.operationDescription', 'Operation Description') },
                  { field: 'delayRemakeReason', label: t('tcc.delayRemakeReason', 'Reason for Delay/Remake') },
                  { field: 'comments', label: t('tcc.comments', 'Comments') },
                  { field: 'remarks', label: t('tcc.remarks', 'Remarks') },
                  { field: 'requesterName', label: t('tcc.requesterName', 'Requester Name') },
                  { field: 'requestId', label: t('tcc.requestId', 'Request ID') },
                  { field: 'templateQty', label: t('tcc.templateQty', 'Template Qty') },
                  { field: 'lineQuantity', label: t('tcc.lineQuantity', 'Line Quantity') },
                  { 
                    field: 'materialSentDate', 
                    label: t('tcc.materialSentDate', 'Material Sent Date'),
                    valueGetter: (value: any) => formatDate(value)
                  },
                  { 
                    field: 'materialReceivedDate', 
                    label: t('tcc.materialReceivedDate', 'Material Received Date'),
                    valueGetter: (value: any) => formatDate(value)
                  },
                  { 
                    field: 'startDate', 
                    label: t('tcc.startDate', 'Start Date'),
                    valueGetter: (value: any) => formatDate(value)
                  },
                  { 
                    field: 'expectedDeliveryDate', 
                    label: t('tcc.expectedDeliveryDate', 'Expected Delivery Date'),
                    valueGetter: (value: any) => formatDate(value)
                  },
                  { 
                    field: 'confirmDeliveryDate', 
                    label: t('tcc.confirmDeliveryDate', 'Confirm Delivery Date'),
                    valueGetter: (value: any) => formatDate(value)
                  },
                  { 
                    field: 'finishedDate', 
                    label: t('tcc.finishedDate', 'Finished Date'),
                    valueGetter: (value: any) => formatDate(value)
                  },
                  { 
                    field: 'releasedDate', 
                    label: t('tcc.releasedDate', 'Released Date'),
                    valueGetter: (value: any) => formatDate(value)
                  },
                ]}
                localFilters={localColumnFilters}
                setLocalFilters={setLocalColumnFilters}
              />
            </>
          )}
        </Box>
      </AdvancedFilterDrawer>

      <Menu
        anchorEl={colMenuAnchor}
        open={Boolean(colMenuAnchor)}
        onClose={() => setColMenuAnchor(null)}
        PaperProps={{ sx: { maxHeight: 400, width: 240, px: 1, borderRadius: 2, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' } }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 700, color: 'text.secondary', fontSize: 13 }}>
          {t('tcc.toggleColumns', 'Toggle Columns')}
        </Typography>
        <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 1 }}>
          <Button 
            size="small" 
            variant="outlined" 
            onClick={() => {
              const allVisible: any = {};
              columns.forEach(c => allVisible[c.field] = true);
              setColumnVisibilityModel(allVisible);
            }}
            sx={{ flex: 1, fontSize: 11 }}
          >
            {t('tcc.selectAll', 'Select All')}
          </Button>
          <Button 
            size="small" 
            variant="outlined" 
            color="error"
            onClick={() => {
              const noneVisible: any = {};
              columns.forEach(c => noneVisible[c.field] = false);
              setColumnVisibilityModel(noneVisible);
            }}
            sx={{ flex: 1, fontSize: 11 }}
          >
            {t('tcc.hideAll', 'Hide All')}
          </Button>
        </Box>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem 
          onClick={() => {
            setColMenuAnchor(null);
            setReorderOpen(true);
          }}
          sx={{ 
            fontSize: 13, 
            fontWeight: 'bold', 
            color: '#1b5e20', 
            borderRadius: 1.5, 
            py: 1,
            mx: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.08)' }
          }}
        >
          <SyncIcon fontSize="small" sx={{ color: '#2e7d32' }} />
          {t('tcc.reorderColumns', 'Reorder Columns (Sắp xếp cột)')}
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

        {/* REORDER COLUMNS DIALOG */}
        <Dialog
          open={reorderOpen}
          onClose={() => setReorderOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
        >
          <DialogTitle sx={{ fontWeight: 'bold', pb: 1, fontSize: '16px' }}>
            {t('tcc.reorderColumnsTitle', 'Sắp xếp vị trí cột')}
          </DialogTitle>
          <DialogContent>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, lineHeight: 1.3 }}>
              {t('tcc.reorderColumnsDesc', 'Kéo thả các mục bên dưới để thay đổi vị trí, hoặc sử dụng các nút mũi tên bấm di chuyển.')}
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, maxHeight: 350, overflowY: 'auto', pr: 0.5 }}>
              {localFields.map((field, index) => {
                const colDef = columns.find(c => c.field === field);
                if (!colDef) return null;
                
                return (
                  <Box
                    key={field}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      draggedIndexRef.current = index;
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDragEnter={() => {
                      const dragIndex = draggedIndexRef.current;
                      const hoverIndex = index;
                      if (dragIndex === null || dragIndex === hoverIndex) return;
                      
                      const updated = [...localFields];
                      const [removed] = updated.splice(dragIndex, 1);
                      updated.splice(hoverIndex, 0, removed);
                      draggedIndexRef.current = hoverIndex;
                      setLocalFields(updated);
                    }}
                    onDragEnd={() => {
                      draggedIndexRef.current = null;
                    }}
                    sx={{
                      p: 1.2,
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      bgcolor: '#f8fafc',
                      cursor: 'grab',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background-color 0.2s',
                      '&:hover': { bgcolor: '#f1f5f9' },
                      '&:active': { cursor: 'grabbing' }
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>
                      {index + 1}. {colDef.headerName || colDef.field}
                    </Typography>
                    <Box display="flex" gap={0.5}>
                      <IconButton
                        size="small"
                        disabled={index === 0}
                        onClick={() => {
                          const updated = [...localFields];
                          const temp = updated[index];
                          updated[index] = updated[index - 1];
                          updated[index - 1] = temp;
                          setLocalFields(updated);
                        }}
                        sx={{ p: 0.2, fontSize: '11px' }}
                      >
                        ▲
                      </IconButton>
                      <IconButton
                        size="small"
                        disabled={index === localFields.length - 1}
                        onClick={() => {
                          const updated = [...localFields];
                          const temp = updated[index];
                          updated[index] = updated[index + 1];
                          updated[index + 1] = temp;
                          setLocalFields(updated);
                        }}
                        sx={{ p: 0.2, fontSize: '11px' }}
                      >
                        ▼
                      </IconButton>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
            <Button 
              variant="outlined" 
              onClick={() => {
                // Reset to default column list in columns memo
                const defaultFields = [
                  'actions',
                  'isPriority',
                  'priorityReason',
                  'createdAt',
                  'monthYear',
                  'customer',
                  'season',
                  'styleNumber',
                  'productType',
                  'sampleStage',
                  'factory',
                  'materialSentDate',
                  'processType',
                  'materialReceivedDate',
                  'operationDescription',
                  'machineType',
                  'machineDimension',
                  'sizesRequired',
                  'startDate',
                  'expectedDeliveryDate',
                  'confirmDeliveryDate',
                  'finishedDate',
                  'status',
                  'releasedDate',
                  'delayRemakeReason',
                  'templateQty',
                  'lineQuantity',
                  'comments',
                  'developerName',
                  'remarks',
                  'updatedBy',
                  'updatedAt',
                  'requestId',
                  'requesterName'
                ];
                setLocalFields(defaultFields);
              }}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              {t('tcc.resetDefault', 'Mặc định')}
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button 
              variant="text" 
              color="inherit"
              onClick={() => setReorderOpen(false)}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              {t('common.cancel', 'Hủy')}
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => {
                setColumnOrder(localFields);
                localStorage.setItem('tcc_column_order', JSON.stringify(localFields));
                setReorderOpen(false);
              }}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              {t('common.save', 'Lưu')}
            </Button>
          </DialogActions>
        </Dialog>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" variant="filled" sx={{ width: '100%', fontWeight: 600 }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}

interface AdminStatusDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedRow: TccRequest | null;
  setSelectedRow?: React.Dispatch<React.SetStateAction<TccRequest | null>>;
  onSaveSuccess: () => void;
  onRefreshData: () => void;
  developers: string[];
  canEdit: boolean;
}


const pulseAnimation = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); border-color: #ef4444; }
  50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); border-color: #ef4444; }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); border-color: #ef4444; }
`;

function AdminStatusDrawer({
  open,
  onClose,
  selectedRow,
  setSelectedRow,
  onSaveSuccess,
  onRefreshData,
  developers,
  canEdit,
}: AdminStatusDrawerProps) {
  const { t } = useTranslation();
  const [editForm, setEditForm] = useState<UpdateProgressPayload>({});
  const [detailsEditable, setDetailsEditable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorFields, setErrorFields] = useState<string[]>([]);
  const [reopenConfirmOpen, setReopenConfirmOpen] = useState(false);
  const [errorToast, setErrorToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const devNameRef = useRef<string | null>(null);

  const isEditable = React.useMemo(() => {
    if (!selectedRow) return false;
    const status = editForm.status || selectedRow.status || 'Not Started';
    const isReleased = !!editForm.releasedDate && !!selectedRow.releasedDate;
    return canEdit && !isReleased && status !== 'Deleted' && status !== 'Cancelled';
  }, [canEdit, selectedRow, editForm.releasedDate, editForm.status]);

  const isConfirmSectionEditable = React.useMemo(() => {
    if (!isEditable) return false;
    const persistentStatus = selectedRow?.status || 'Not Started';
    if (persistentStatus === 'Rejected') return false;
    const status = editForm.status || 'Not Started';
    return status === 'Not Started' || status === 'Rejected';
  }, [isEditable, editForm.status, selectedRow?.status]);

  const isProgressSectionEditable = React.useMemo(() => {
    if (!isEditable) return false;
    const status = editForm.status || selectedRow?.status || 'Not Started';
    if (status === 'Rejected') return false;
    return status !== 'Not Started' || !!editForm.confirmStatus;
  }, [isEditable, editForm.status, selectedRow?.status, editForm.confirmStatus]);

  useEffect(() => {
    if (open && selectedRow) {
      setEditForm({
        materialReceivedDate: selectedRow.materialReceivedDate,
        startDate: selectedRow.startDate,
        finishedDate: selectedRow.finishedDate,
        status: selectedRow.status || 'Not Started',
        developerName: selectedRow.developerName || '',
        delayRemakeReason: selectedRow.delayRemakeReason || '',
        templateQty: selectedRow.templateQty,
        remarks: selectedRow.remarks || '',
        releasedDate: selectedRow.releasedDate,
        confirmDeliveryDate: selectedRow.confirmDeliveryDate || null,
        confirmStatus: selectedRow.confirmStatus || null,

        // Request details fields
        requesterName: selectedRow.requesterName || '',
        customer: selectedRow.customer || '',
        season: selectedRow.season || '',
        styleNumber: selectedRow.styleNumber || '',
        productType: selectedRow.productType || '',
        sampleStage: selectedRow.sampleStage || '',
        factory: selectedRow.factory || '',
        processType: selectedRow.processType || '',
        lineQuantity: selectedRow.lineQuantity || '',
        materialSentDate: selectedRow.materialSentDate || null,
        expectedDeliveryDate: selectedRow.expectedDeliveryDate || null,
        operationDescription: selectedRow.operationDescription || '',
        machineType: selectedRow.machineType || '',
        machineDimension: selectedRow.machineDimension || '',
        sizesRequired: selectedRow.sizesRequired || '',
        isPriority: selectedRow.isPriority || false,
        priorityReason: selectedRow.priorityReason || '',
      });
      devNameRef.current = selectedRow.developerName || '';
      setDetailsEditable(false);
    }
  }, [open, selectedRow]);

  const handleChange = (field: keyof UpdateProgressPayload, value: any) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    setErrorFields((prev) => prev.filter((f) => f !== field));
  };

  const handleDateChange = (field: keyof UpdateProgressPayload, date: Date | null) => {
    const value = date ? format(date, 'yyyy-MM-dd') : '';
    
    setEditForm((prev) => {
      const next = { ...prev, [field]: value };
      setErrorFields((prevErr) => prevErr.filter((f) => f !== field));
      
      const clearFlagKey = `clear${field.charAt(0).toUpperCase()}${field.slice(1)}` as keyof UpdateProgressPayload;
      if (!value) {
        (next as any)[clearFlagKey] = true;
        (next as any)[field] = null;
      } else {
        (next as any)[clearFlagKey] = false;
      }
      
      // If setting a date
      if (value) {
        if (field === 'startDate') next.status = 'Work in Progress';
        if (field === 'finishedDate') next.status = 'Completed';
      } 
      // If clearing a date
      else {
        if (field === 'finishedDate' && prev.startDate) {
          next.status = 'Work in Progress';
        }
        if (field === 'startDate') {
          next.status = 'Not Started';
          next.finishedDate = ''; // cascade clear
          next.clearFinishedDate = true;
        }
      }
      return next;
    });
  };

  const executeSave = async (payloadToSave: UpdateProgressPayload, onSuccess?: () => void) => {
    if (!selectedRow) return;
    setSaving(true);
    try {
      const finalPayload = { ...payloadToSave };
      if (devNameRef.current !== null) {
        finalPayload.developerName = devNameRef.current;
      }
      ['developerName', 'delayRemakeReason', 'remarks'].forEach((key) => {
        const val = finalPayload[key as keyof UpdateProgressPayload];
        if (typeof val === 'string' && val.length > 0) {
          (finalPayload as any)[key] = val.charAt(0).toUpperCase() + val.slice(1);
        }
      });
      await tccService.updateProgress(selectedRow.requestId, finalPayload);
      if (onSuccess) onSuccess();
      else onSaveSuccess();
    } catch (error: any) {
      console.error('Failed to update progress', error);
      setErrorToast({ open: true, message: error.message || 'Failed to save data. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = () => {
    if (selectedRow?.expectedDeliveryDate) {
      handleChange('confirmDeliveryDate', selectedRow.expectedDeliveryDate);
    }
    setEditForm((prev) => ({
      ...prev,
      confirmStatus: 'Approved',
      status: 'Not Started'
    }));
    setErrorFields((prev) => prev.filter((f) => f !== 'confirmStatus' && f !== 'status' && f !== 'remarks'));
  };

  const handleReject = () => {
    setEditForm((prev) => ({
      ...prev,
      confirmStatus: 'Rejected',
      status: 'Rejected'
    }));
    setErrorFields((prev) => prev.filter((f) => f !== 'confirmStatus' && f !== 'status'));
    if (!editForm.remarks?.trim()) {
      setErrorFields((prev) => [...new Set([...prev, 'remarks'])]);
      setErrorToast({
        open: true,
        message: t('tcc.remarksRequiredOnReject', 'Remarks (TCC) is required when rejecting.')
      });
      setTimeout(() => {
        const el = document.getElementById('field-remarks');
        if (el) el.focus();
      }, 100);
    }
  };

  const handleSave = () => {
    if (editForm.confirmStatus === 'Rejected' && !editForm.remarks?.trim()) {
      setErrorFields((prev) => [...new Set([...prev, 'remarks'])]);
      setErrorToast({
        open: true,
        message: t('tcc.remarksRequiredOnReject', 'Remarks (TCC) is required when rejecting.')
      });
      setTimeout(() => {
        const el = document.getElementById('field-remarks');
        if (el) el.focus();
      }, 100);
      return;
    }
    executeSave(editForm);
  };

  const confirmReopen = async () => {
    const newPayload = {
      ...editForm,
      finishedDate: '',
      developerName: '',
      delayRemakeReason: '',
      remarks: '',
      releasedDate: '',
      status: 'Remake'
    };
    setEditForm(newPayload);
    setReopenConfirmOpen(false);
    
    // Clear parent selectedRow state so that the drawer is unlocked
    if (setSelectedRow && selectedRow) {
      setSelectedRow({
        ...selectedRow,
        finishedDate: '',
        developerName: '',
        delayRemakeReason: '',
        remarks: '',
        releasedDate: '',
        status: 'Remake'
      });
    }
    
    await executeSave(newPayload, onRefreshData);
  };

  const handleReleaseOrReopen = async () => {
    if (selectedRow?.releasedDate) {
      setReopenConfirmOpen(true);
    } else {
      const { materialReceivedDate, startDate, finishedDate, status, developerName, templateQty, confirmDeliveryDate } = editForm;
      const missing: string[] = [];
      if (!materialReceivedDate) missing.push('materialReceivedDate');
      if (!startDate) missing.push('startDate');
      if (!finishedDate) missing.push('finishedDate');
      if (!status) missing.push('status');
      if (!developerName) missing.push('developerName');
      if (!templateQty) missing.push('templateQty');
      if (!confirmDeliveryDate) missing.push('confirmDeliveryDate');

      if (missing.length > 0) {
        setErrorFields(missing);
        setErrorToast({ open: true, message: t('tcc.releaseValidationFailed', 'Please fill in all required fields in TCC Action / Update section before releasing.') });
        setTimeout(() => {
          const el = document.getElementById(`field-${missing[0]}`);
          if (el) el.focus();
        }, 100);
        return;
      }
      
      await executeSave(editForm);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ zIndex: (theme) => theme.zIndex.modal }}
    >
      {selectedRow && (
        <Box
          sx={{
            width: { xs: '100%', md: 900 },
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">{t('tcc.editProgress', 'Edit Progress')}</Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />

          <Box
            display="flex"
            flexDirection={{ xs: 'column', md: 'row' }}
            gap={3}
            flex={1}
            sx={{ overflowY: 'auto', pr: 1 }}
          >
            {/* ─── LEFT COLUMN: REQUEST DETAILS (READ-ONLY) ─── */}
            <Box 
              sx={{ 
                flex: 1, 
                border: '1px solid #c2ebd0', 
                bgcolor: '#f4fbf7', 
                borderRadius: '8px', 
                p: 2.5,
                height: 'fit-content'
              }}
            >
              <Typography variant="subtitle2" sx={{ color: '#2e7d32', fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#2e7d32' }}></span>
                  {t('tcc.requestDetailsHeader', 'Request Details (Read-only)')}
                </Box>
                {canEdit && isEditable && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={detailsEditable}
                        onChange={(e) => setDetailsEditable(e.target.checked)}
                        size="small"
                        sx={{ color: '#2e7d32', '&.Mui-checked': { color: '#2e7d32' } }}
                      />
                    }
                    label={<Typography sx={{ fontSize: 13, fontWeight: 600, color: '#2e7d32' }}>{t('tcc.modify', 'Modify')}</Typography>}
                    sx={{ m: 0 }}
                  />
                )}
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <AppTextField label={t('tcc.reqId', 'Request ID')} value={selectedRow.requestId || ''} disabled size="small" fullWidth />
                <AppTextField
                  label={t('tcc.requester', 'Requester')}
                  value={editForm.requesterName ?? ''}
                  disabled
                  size="small"
                  fullWidth
                />
                <AppTextField
                  label={t('tcc.customer', 'Customer')}
                  value={editForm.customer ?? ''}
                  debounceMs={150}
                  onDebounceChange={(val) => handleChange('customer', val)}
                  disabled={!detailsEditable}
                  size="small"
                  fullWidth
                />
                <AppTextField
                  label={t('tcc.season', 'Season')}
                  value={editForm.season ?? ''}
                  debounceMs={150}
                  onDebounceChange={(val) => handleChange('season', val)}
                  disabled={!detailsEditable}
                  size="small"
                  fullWidth
                />
                <AppTextField
                  label={t('tcc.styleNumber', 'Style Number')}
                  value={editForm.styleNumber ?? ''}
                  debounceMs={150}
                  onDebounceChange={(val) => handleChange('styleNumber', val)}
                  disabled={!detailsEditable}
                  size="small"
                  fullWidth
                />
                <AppTextField
                  label={t('tcc.productType', 'Product Type')}
                  value={editForm.productType ?? ''}
                  debounceMs={150}
                  onDebounceChange={(val) => handleChange('productType', val)}
                  disabled={!detailsEditable}
                  size="small"
                  fullWidth
                />
                <AppTextField
                  label={t('tcc.sampleStage', 'Sample Stage')}
                  value={editForm.sampleStage ?? ''}
                  debounceMs={150}
                  onDebounceChange={(val) => handleChange('sampleStage', val)}
                  disabled={!detailsEditable}
                  size="small"
                  fullWidth
                />
                <AppTextField
                  label={t('tcc.factory', 'Factory')}
                  value={editForm.factory ?? ''}
                  debounceMs={150}
                  onDebounceChange={(val) => handleChange('factory', val)}
                  disabled={!detailsEditable}
                  size="small"
                  fullWidth
                />
                
                {detailsEditable ? (
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: 13 }}>{t('tcc.processType', 'Process Type')}</InputLabel>
                    <Select
                      value={editForm.processType || 'Light'}
                      label={t('tcc.processType', 'Process Type')}
                      onChange={(e) => handleChange('processType', e.target.value)}
                      sx={{
                        borderRadius: '8px',
                        height: 40,
                        fontSize: 13,
                        bgcolor: '#fff',
                        '& fieldset': { borderColor: '#bfc9c4' },
                        '&:hover fieldset': { borderColor: '#2e7d32' },
                        '&.Mui-focused fieldset': { borderColor: '#2e7d32' },
                      }}
                    >
                      <MenuItem value="Light">{t('tcc.processLight', 'Light Process')}</MenuItem>
                      <MenuItem value="Full">{t('tcc.processFull', 'Full Process')}</MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                  <AppTextField 
                    label={t('tcc.processType', 'Process Type')} 
                    value={editForm.processType === 'Full' ? t('tcc.processFull', 'Full Process') : t('tcc.processLight', 'Light Process')} 
                    disabled 
                    size="small" 
                    fullWidth 
                  />
                )}
                
                <AppTextField
                  label={t('tcc.lineQuantity', 'Line Qty')}
                  value={editForm.lineQuantity ?? ''}
                  debounceMs={150}
                  onDebounceChange={(val) => handleChange('lineQuantity', val)}
                  disabled={!detailsEditable}
                  size="small"
                  fullWidth
                />

                {detailsEditable ? (
                  <DatePicker format="dd/MM/yyyy"
                    label={t('tcc.materialSentDate', 'Material Sent Date')}
                    value={editForm.materialSentDate ? new Date(editForm.materialSentDate) : null}
                    onChange={(val) => handleDateChange('materialSentDate', val)}
                    slotProps={{
                      field: { clearable: true },
                      textField: {
                        fullWidth: true,
                        size: 'small',
                        sx: {
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
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <AppTextField label={t('tcc.materialSentDate', 'Material Sent Date')} value={formatDate(editForm.materialSentDate) || ''} disabled size="small" fullWidth />
                )}

                {detailsEditable ? (
                  <DatePicker format="dd/MM/yyyy"
                    label={t('tcc.expectedDeliveryDate', 'Request Delivery Date')}
                    value={editForm.expectedDeliveryDate ? new Date(editForm.expectedDeliveryDate) : null}
                    onChange={(val) => handleDateChange('expectedDeliveryDate', val)}
                    slotProps={{
                      field: { clearable: true },
                      textField: {
                        fullWidth: true,
                        size: 'small',
                        sx: {
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
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <AppTextField label={t('tcc.expectedDeliveryDate', 'Request Delivery Date')} value={formatDate(editForm.expectedDeliveryDate) || ''} disabled size="small" fullWidth />
                )}
                
                <Box sx={{ gridColumn: 'span 2' }}>
                  <AppTextField
                    label={t('tcc.operationDescription', 'Operation Description')}
                    value={editForm.operationDescription ?? ''}
                    debounceMs={150}
                    onDebounceChange={(val) => handleChange('operationDescription', val)}
                    disabled={!detailsEditable}
                    size="small"
                    fullWidth
                    multiline
                    rows={2}
                  />
                </Box>
                
                <AppTextField
                  label={t('tcc.machineType', 'Machine Type')}
                  value={editForm.machineType ?? ''}
                  debounceMs={150}
                  onDebounceChange={(val) => handleChange('machineType', val)}
                  disabled={!detailsEditable}
                  size="small"
                  fullWidth
                />
                <AppTextField
                  label={t('tcc.machineDimension', 'Machine Dimension')}
                  value={editForm.machineDimension ?? ''}
                  debounceMs={150}
                  onDebounceChange={(val) => handleChange('machineDimension', val)}
                  disabled={!detailsEditable}
                  size="small"
                  fullWidth
                />
                
                <Box sx={{ gridColumn: 'span 2' }}>
                  <AppTextField
                    label={t('tcc.sizesRequired', 'Sizes Required')}
                    value={editForm.sizesRequired ?? ''}
                    debounceMs={150}
                    onDebounceChange={(val) => handleChange('sizesRequired', val)}
                    disabled={!detailsEditable}
                    size="small"
                    fullWidth
                  />
                </Box>
                
                {detailsEditable ? (
                  <Box sx={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={!!editForm.isPriority}
                          onChange={(e) => handleChange('isPriority', e.target.checked)}
                          size="small"
                          sx={{ color: '#dc2626', '&.Mui-checked': { color: '#dc2626' } }}
                        />
                      }
                      label={<Typography sx={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>⚠️ {t('tcc.priority', 'Priority Request')}</Typography>}
                    />
                    {editForm.isPriority && (
                      <AppTextField
                        label={t('tcc.priorityReason', 'Priority Reason')}
                        value={editForm.priorityReason ?? ''}
                        debounceMs={150}
                        onDebounceChange={(val) => handleChange('priorityReason', val)}
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                      />
                    )}
                  </Box>
                ) : (
                  editForm.isPriority && (
                    <Box sx={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography sx={{ color: '#d32f2f', fontSize: 12, fontWeight: 700, mt: 0.5 }}>⚠️ {t('tcc.priority', 'Priority Request')}</Typography>
                      <AppTextField label={t('tcc.priorityReason', 'Priority Reason')} value={editForm.priorityReason || ''} disabled size="small" fullWidth multiline rows={2} />
                    </Box>
                  )
                )}

                <AppTextField label={t('tcc.updatedBy', 'Last Updated By')} value={selectedRow.updatedBy || '—'} disabled size="small" fullWidth />
                <AppTextField label={t('tcc.updatedAt', 'Last Updated At')} value={formatDateTime(selectedRow.updatedAt) || ''} disabled size="small" fullWidth />
              </Box>
            </Box>

            {/* ─── RIGHT COLUMN: TCC UPDATE (EDITABLE) ─── */}
            <Box 
              sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 2 
              }}
            >
              <Typography variant="subtitle2" sx={{ color: '#2e7d32', fontWeight: 800, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#2e7d32' }}></span>
                {t('tcc.updateProgressHeader', 'TCC Action / Update')}
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <DatePicker format="dd/MM/yyyy"
                  label={t('tcc.confirmDeliveryDate', 'Confirmed Delivery Date')}
                  value={editForm.confirmDeliveryDate ? new Date(editForm.confirmDeliveryDate) : null}
                  onChange={(val) => handleDateChange('confirmDeliveryDate', val)}
                  disabled={!isConfirmSectionEditable || editForm.confirmStatus === 'Rejected'}
                  slotProps={{
                    field: { clearable: true },
                    textField: {
                      id: 'field-confirmDeliveryDate',
                      error: errorFields.includes('confirmDeliveryDate'),
                      fullWidth: true,
                      size: 'small',
                      sx: {
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
                        }
                      }
                    }
                  }}
                />
                <Box display="flex" gap={1} alignItems="center">
                  <AppButton
                    variant={editForm.confirmStatus === 'Approved' ? 'contained' : 'outlined'}
                    customVariant="primary"
                    onClick={handleApprove}
                    disabled={!isConfirmSectionEditable}
                    sx={{ flex: 1 }}
                  >
                    {t('tcc.approve', 'Approve')}
                  </AppButton>
                  <AppButton
                    variant={editForm.confirmStatus === 'Rejected' ? 'contained' : 'outlined'}
                    customVariant="danger"
                    onClick={handleReject}
                    disabled={!isConfirmSectionEditable}
                    sx={{
                      flex: 1,
                      ...(editForm.confirmStatus === 'Rejected' && {
                        bgcolor: '#d32f2f',
                        color: '#fff',
                        boxShadow: '0 4px 6px -1px rgba(211,47,47,0.2)',
                        '&:hover': { bgcolor: 'rgba(211,47,47,0.9)' }
                      })
                    }}
                  >
                    {t('tcc.reject', 'Reject')}
                  </AppButton>
                </Box>
                <DatePicker format="dd/MM/yyyy"
                  label={t('tcc.materialReceivedDate', 'Material Received Date')}
                  value={editForm.materialReceivedDate ? new Date(editForm.materialReceivedDate) : null}
                  onChange={(val) => handleDateChange('materialReceivedDate', val)}
                  disabled={!isProgressSectionEditable}
                  slotProps={{
                    field: { clearable: true },
                    textField: {
                      id: 'field-materialReceivedDate',
                      error: errorFields.includes('materialReceivedDate'),
                      fullWidth: true,
                      size: 'small',
                      sx: {
                        ...(errorFields.includes('materialReceivedDate') && { animation: `${pulseAnimation} 1.5s infinite` }),
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
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          maxWidth: 'calc(100% - 36px)',
                        }
                      }
                    }
                  }}
                />
                <DatePicker format="dd/MM/yyyy"
                  label={t('tcc.startDate', 'Start Date')}
                  value={editForm.startDate ? new Date(editForm.startDate) : null}
                  onChange={(val) => handleDateChange('startDate', val)}
                  disabled={!isProgressSectionEditable}
                  slotProps={{
                    field: { clearable: true },
                    textField: {
                      id: 'field-startDate',
                      error: errorFields.includes('startDate'),
                      fullWidth: true,
                      size: 'small',
                      sx: {
                        ...(errorFields.includes('startDate') && { animation: `${pulseAnimation} 1.5s infinite` }),
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
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          maxWidth: 'calc(100% - 36px)',
                        }
                      }
                    }
                  }}
                />
                <DatePicker format="dd/MM/yyyy"
                  label={t('tcc.finishedDate', 'Finished Date')}
                  value={editForm.finishedDate ? new Date(editForm.finishedDate) : null}
                  onChange={(val) => handleDateChange('finishedDate', val)}
                  disabled={!isProgressSectionEditable || !editForm.startDate}
                  slotProps={{
                    field: { clearable: true },
                    textField: {
                      id: 'field-finishedDate',
                      error: errorFields.includes('finishedDate'),
                      fullWidth: true,
                      size: 'small',
                      sx: {
                        ...(errorFields.includes('finishedDate') && { animation: `${pulseAnimation} 1.5s infinite` }),
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
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          maxWidth: 'calc(100% - 36px)',
                        }
                      }
                    }
                  }}
                />
                 <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: 13 }}>{t('tcc.status', 'Status (Auto)')}</InputLabel>
                  <Select
                    value={editForm.status || 'Not Started'}
                    label={t('tcc.status', 'Status (Auto)')}
                    onChange={(e) => handleChange('status', e.target.value)}
                    readOnly={true}
                    id="field-status"
                    error={errorFields.includes('status')}
                    sx={{
                      borderRadius: '8px',
                      height: 40,
                      fontSize: 13,
                      bgcolor: '#f8fafc',
                      pointerEvents: 'none',
                      animation: errorFields.includes('status') ? `${pulseAnimation} 1s infinite` : 'none',
                      '& fieldset': { borderColor: '#e2e8f0', borderStyle: 'dashed' },
                    }}
                    renderValue={(selected) => {
                      const label = getStatusLabel(selected as string, t);
                      const style = getStatusStyle(selected as string);
                      return (
                        <Box sx={{
                          bgcolor: style.bgcolor,
                          color: style.color,
                          border: style.border,
                          fontWeight: style.fontWeight,
                          display: 'inline-flex',
                          alignItems: 'center',
                          px: 1.5,
                          py: 0.25,
                          borderRadius: '6px',
                          fontSize: 12,
                        }}>
                          {label}
                        </Box>
                      );
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          p: 0.5,
                          mt: 0.5,
                          borderRadius: '8px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        }
                      }
                    }}
                  >
                    <MenuItem value="Not Started" sx={{
                      bgcolor: '#f1f5f9',
                      color: '#475569',
                      fontWeight: 600,
                      borderRadius: '6px',
                      mx: 0.5,
                      my: 0.25,
                      border: '1px solid #cbd5e1',
                      '&:hover': { bgcolor: '#cbd5e1' },
                      '&.Mui-selected': { bgcolor: '#cbd5e1 !important' }
                    }}>
                      {t('tcc.statusNotStarted', 'Not Started')}
                    </MenuItem>
                    <MenuItem value="Work in Progress" sx={{
                      bgcolor: '#eff6ff',
                      color: '#1d4ed8',
                      fontWeight: 600,
                      borderRadius: '6px',
                      mx: 0.5,
                      my: 0.25,
                      border: '1px solid #bfdbfe',
                      '&:hover': { bgcolor: '#bfdbfe' },
                      '&.Mui-selected': { bgcolor: '#bfdbfe !important' }
                    }}>
                      {t('tcc.statusWip', 'Work in Progress')}
                    </MenuItem>
                    <MenuItem value="Completed" sx={{
                      bgcolor: '#f0fdf4',
                      color: '#15803d',
                      fontWeight: 600,
                      borderRadius: '6px',
                      mx: 0.5,
                      my: 0.25,
                      border: '1px solid #bbf7d0',
                      '&:hover': { bgcolor: '#bbf7d0' },
                      '&.Mui-selected': { bgcolor: '#bbf7d0 !important' }
                    }}>
                      {t('tcc.statusCompleted', 'Completed')}
                    </MenuItem>
                    <MenuItem value="Remake" sx={{
                      bgcolor: '#fffbeb',
                      color: '#b45309',
                      fontWeight: 600,
                      borderRadius: '6px',
                      mx: 0.5,
                      my: 0.25,
                      border: '1px solid #fde68a',
                      '&:hover': { bgcolor: '#fde68a' },
                      '&.Mui-selected': { bgcolor: '#fde68a !important' }
                    }}>
                      {t('tcc.statusRemake', 'Remake')}
                    </MenuItem>
                  </Select>
                </FormControl>
                <Autocomplete
                  options={developers}
                  value={editForm.developerName || ''}
                  onChange={(e, val) => handleChange('developerName', val || '')}
                  onInputChange={(e, newInputValue) => { devNameRef.current = newInputValue; }}
                  freeSolo
                  disabled={!isProgressSectionEditable}
                  renderInput={(params) => (
                    <AppTextField
                      {...params}
                      label={t('tcc.developerName', 'Developer Name')}
                      id="field-developerName"
                      error={errorFields.includes('developerName')}
                      sx={errorFields.includes('developerName') ? { animation: `${pulseAnimation} 1s infinite` } : {}}
                    />
                  )}
                />
                <AppTextField
                  label={t('tcc.templateQty', 'Template Quantity')}
                  type="number"
                  value={editForm.templateQty ?? ''}
                  debounceMs={150}
                  onDebounceChange={(val) => handleChange('templateQty', val ? Number(val) : null)}
                  id="field-templateQty"
                  error={errorFields.includes('templateQty')}
                  sx={errorFields.includes('templateQty') ? { animation: `${pulseAnimation} 1s infinite` } : {}}
                  fullWidth
                  disabled={!isProgressSectionEditable}
                />
                <Box sx={{ gridColumn: 'span 2' }}>
                  <AppTextField
                    label={t('tcc.delayRemakeReason', 'Delay/Remake Reason')}
                    value={editForm.delayRemakeReason || ''}
                    debounceMs={150}
                    onDebounceChange={(val) => handleChange('delayRemakeReason', val)}
                    fullWidth
                    multiline
                    rows={2}
                    disabled={!isEditable || editForm.confirmStatus === 'Rejected'}
                  />
                </Box>
                <Box sx={{ gridColumn: 'span 2' }}>
                  <AppTextField
                    label={t('tcc.remarks', 'Remarks')}
                    value={editForm.remarks || ''}
                    debounceMs={150}
                    onDebounceChange={(val) => handleChange('remarks', val)}
                    id="field-remarks"
                    error={errorFields.includes('remarks')}
                    sx={errorFields.includes('remarks') ? { animation: `${pulseAnimation} 1s infinite` } : {}}
                    fullWidth
                    multiline
                    rows={2}
                    disabled={!isEditable}
                  />
                </Box>
                <Box sx={{ gridColumn: 'span 2' }}>
                  <Box display="flex" alignItems="center" gap={2} mt={0.5}>
                    <DatePicker format="dd/MM/yyyy"
                      label={t('tcc.releasedDate', 'Released Date')}
                      value={editForm.releasedDate ? new Date(editForm.releasedDate) : null}
                      onChange={(val) => handleDateChange('releasedDate', val)}
                      disabled={!canEdit || !!selectedRow?.releasedDate || editForm.status === 'Deleted' || editForm.status === 'Cancelled' || editForm.status === 'Rejected'}
                      slotProps={{
                        field: { clearable: true },
                        textField: {
                          id: 'field-releasedDate',
                          error: errorFields.includes('releasedDate'),
                          fullWidth: true,
                          size: 'small',
                        }
                      }}
                    />
                    <AppButton
                      variant="outlined"
                      customVariant={selectedRow?.releasedDate ? 'warning' : 'primary'}
                      onClick={handleReleaseOrReopen}
                      sx={{ whiteSpace: 'nowrap' }}
                      disabled={!canEdit || editForm.status === 'Deleted' || editForm.status === 'Cancelled' || editForm.status === 'Rejected' || (!selectedRow?.releasedDate && !editForm.releasedDate)}
                    >
                      {selectedRow?.releasedDate ? t('tcc.reopen', 'Re-Open') : t('tcc.release', 'Release')}
                    </AppButton>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>


          <Box
            mt={3}
            pt={2}
            display="flex"
            justifyContent="flex-end"
            gap={2}
            borderTop={1}
            borderColor="divider"
          >
            <AppButton
              onClick={onClose}
              variant="outlined"
              customVariant="secondary"
            >
              {t('tcc.cancel', 'Cancel')}
            </AppButton>
            <AppButton
              variant="contained"
              customVariant="primary"
              onClick={handleSave}
              disabled={saving || !isEditable}
            >
              {saving ? <CircularProgress size={24} /> : t('tcc.save', 'Save')}
            </AppButton>
          </Box>
        </Box>
      )}
      <Snackbar 
        open={errorToast.open} 
        autoHideDuration={4000} 
        onClose={() => setErrorToast({ ...errorToast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setErrorToast({ ...errorToast, open: false })} severity="error" variant="filled" sx={{ width: '100%', fontWeight: 600 }}>
          {errorToast.message}
        </Alert>
      </Snackbar>
      <Dialog open={reopenConfirmOpen} onClose={() => setReopenConfirmOpen(false)}>
        <DialogTitle>{t('tcc.confirmReopenTitle', 'Confirm Re-Open')}</DialogTitle>
        <DialogContent>
          <Typography>{t('tcc.confirmReopenMessage', 'Are you sure you want to re-open this request? This will clear the Finished Date, In-charge Person, Remarks, and set Status to Remake.')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReopenConfirmOpen(false)} color="inherit">
            {t('tcc.cancel', 'Cancel')}
          </Button>
          <Button onClick={confirmReopen} color="warning" variant="contained" disableElevation>
            {t('tcc.reopen', 'Re-Open')}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}


