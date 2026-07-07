import ExcelStyleColumnMenu from '../components/ExcelStyleColumnMenu';
import CustomFilterPanel from '../components/CustomFilterPanel';
import { columnFilterStore } from '../components/ColumnFilterContext';
import MobileColumnFilters from '../components/MobileColumnFilters';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  Divider,
  Checkbox,
  InputAdornment,
  Tooltip,
  useTheme,
  useMediaQuery,
  Snackbar,
  Alert,
  Badge,
  Fab,
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
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import SyncIcon from '@mui/icons-material/Sync';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ClearIcon from '@mui/icons-material/Clear';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelIcon from '@mui/icons-material/Cancel';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useLocation, useNavigate } from 'react-router-dom';
import { tccService, type TccRequest, type RequestFilters } from '../services/tccService';
import { format } from 'date-fns';
import { authService, AppButton, AppTextField, AdvancedFilterDrawer } from '@traxeco/shared';
import { Client } from '@stomp/stompjs';
import RequestFormDialog from '../components/RequestFormDialog';
import { Pagination } from '@mui/material';

function CustomFooter() {
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
        <span>Rows per page:</span>
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

// =====================================================================
// MobileRequestList - hiển thị danh sách card trên mobile
// =====================================================================
interface RequestDetailDialogProps {
  open: boolean;
  onClose: () => void;
  request: TccRequest | null;
  getStatusLabel: (s: string) => string;
  getStatusStyle: (s: string) => any;
  formatDate: (v: any) => string;
  t: any;
  canEditTracking: boolean;
  setEditingRow: (row: TccRequest) => void;
  setNewDate: (d: Date | null) => void;
}

function RequestDetailDialog({ open, onClose, request, getStatusLabel, getStatusStyle, formatDate, t, canEditTracking, setEditingRow, setNewDate }: RequestDetailDialogProps) {
  // Local Snackbar State
  const [localSnackbarOpen, setLocalSnackbarOpen] = useState(false);
  const [localSnackbarMessage, setLocalSnackbarMessage] = useState('');
  const [localSnackbarSeverity, setLocalSnackbarSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  const showToast = (message: string, severity: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setLocalSnackbarMessage(message);
    setLocalSnackbarSeverity(severity);
    setLocalSnackbarOpen(true);
  };

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsExpanded, setLogsExpanded] = useState(true);

  // Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentsExpanded, setCommentsExpanded] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Load Audit Logs and Comments when dialog opens and poll silently every 3s
  // Safe arrays — never trust API response shape
  const safeComments = Array.isArray(comments) ? comments : [];
  const safeAuditLogs = Array.isArray(auditLogs) ? auditLogs : [];

  // Helper to trigger native Windows Notification
  const triggerWindowsNotification = (title: string, body: string) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico' // Hoặc icon ứng dụng nếu có
      });
    }
  };

  const userInfo = authService.getUserInfo();
  const isSuperOrAdmin = authService.isSuperAdmin() || authService.isAdmin();

  useEffect(() => {
    if (!open || !request) return;

    // Request Windows notification permission immediately when opening dialog
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Load initial data with loaders
    setLogsLoading(true);
    setCommentsLoading(true);
    
    tccService.getAuditLogs(request.requestId)
      .then(data => setAuditLogs(Array.isArray(data) ? data : []))
      .catch(() => setAuditLogs([]))
      .finally(() => setLogsLoading(false));

    tccService.getComments(request.requestId)
      .then(data => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));

    // Polling function for real-time updates every 3 seconds
    const pollUpdatesSilently = () => {
      tccService.getComments(request.requestId)
        .then(data => {
          if (Array.isArray(data)) {
            setComments(prev => {
              const prevIds = new Set(prev.map(c => c.id));
              const newComment = data.find(c => !prevIds.has(c.id));
              if (newComment) {
                // If comment is from someone else, notify the user
                const authorCodeLower = (newComment.authorCode || '').trim().toLowerCase();
                const authorNameLower = (newComment.authorName || '').trim().toLowerCase();
                const myCodeLower = (userInfo.employeeCode || '').trim().toLowerCase();
                const myNameLower = (userInfo.employeeName || '').trim().toLowerCase();
                const isMe = authorCodeLower === myCodeLower || authorNameLower === myNameLower;
                
                if (!isMe) {
                  showToast(`💬 ${newComment.authorName}: ${newComment.content}`, 'info');
                  // Trigger Windows desktop notification!
                  triggerWindowsNotification(
                    `💬 Bình luận mới tại #${request.requestId}`,
                    `${newComment.authorName}: ${newComment.content}`
                  );
                }
              }
              return data;
            });
          }
        })
        .catch(() => {});

      tccService.getAuditLogs(request.requestId)
        .then(data => {
          if (Array.isArray(data)) {
            setAuditLogs(prev => {
              if (prev.length > 0 && data.length > prev.length) {
                showToast('📜 Nhật ký thay đổi đã được cập nhật!', 'info');
                // Trigger Windows desktop notification!
                const latestLog = data[data.length - 1];
                triggerWindowsNotification(
                  `📜 Cập nhật yêu cầu #${request.requestId}`,
                  `${latestLog?.userName || 'Hệ thống'}: ${latestLog?.details || 'Có thay đổi mới'}`
                );
              }
              return data;
            });
          }
        })
        .catch(() => {});
    };

    const interval = setInterval(pollUpdatesSilently, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [open, request]);

  if (!request) return null;

  const displayStatus = request.releasedDate ? 'Released' : (request.status || 'Not Started');
  const isCancelled = request.status === 'Cancelled';
  const reqLower = (request.requesterName || '').trim().toLowerCase();
  const codeLower = (userInfo.employeeCode || '').trim().toLowerCase();
  const nameLower = (userInfo.employeeName || '').trim().toLowerCase();
  const isMyRequest = reqLower === codeLower || reqLower === nameLower || reqLower.startsWith(codeLower + ' -');
  const canEditThisRow = isSuperOrAdmin || (isMyRequest && canEditTracking);
  const canEditMaterialSent = canEditThisRow && !isCancelled;

  const handleSendComment = () => {
    if (!newCommentText.trim() || !request) return;
    setSubmittingComment(true);
    tccService.addComment(request.requestId, newCommentText.trim())
      .then((c) => {
        setNewCommentText('');
        setComments(prev => [...prev, c]);
        showToast('Gửi ý kiến thành công!', 'success');
      })
      .catch((err) => {
        console.error(err);
        showToast('Lỗi khi gửi bình luận!', 'error');
      })
      .finally(() => setSubmittingComment(false));
  };

  const handleDeleteComment = (commentId: number) => {
    tccService.deleteComment(commentId)
      .then(() => {
        setComments(prev => prev.filter(c => c.id !== commentId));
        showToast('Đã xóa bình luận!', 'success');
      })
      .catch((err) => {
        console.error(err);
        showToast('Lỗi khi xóa bình luận!', 'error');
      });
  };

  const handleTogglePin = (commentId: number, currentlyPinned: boolean) => {
    tccService.togglePinComment(commentId, !currentlyPinned)
      .then(() => {
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, isPinned: !currentlyPinned } : c)
          .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)));
      })
      .catch(console.error);
  };

  // Custom Progress Steps mapping
  const steps = [
    { label: 'Tạo yêu cầu', done: true, current: false },
    { label: 'Đã gửi NVL', done: !!request.materialSentDate, current: false },
    { label: 'Phòng mẫu nhận', done: !!request.materialReceivedDate || ['Work in Progress', 'Ready', 'Released', 'Completed'].includes(request.status), current: false },
    { label: 'Đã xong rập', done: ['Ready', 'Released', 'Completed'].includes(request.status) || !!request.finishedDate, current: false },
    { label: 'Đã bàn giao', done: ['Released', 'Completed'].includes(request.status) || !!request.releasedDate, current: false },
  ];

  let activeIndex = 0;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].done) {
      activeIndex = i;
    }
  }

  steps.forEach((s, idx) => {
    s.current = (idx === activeIndex && displayStatus !== 'Released' && displayStatus !== 'Completed');
  });

  const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Box>
      <Typography sx={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.3 }}>
        {label}
      </Typography>
      <Typography sx={{ color: value ? '#0f172a' : '#94a3b8', fontSize: 13, fontWeight: 600 }}>
        {value || '\u2014'}
      </Typography>
    </Box>
  );

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: '20px',
          bgcolor: '#f8fafc',
          p: 0,
          m: 1.5,
          width: 'calc(100% - 24px)',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
        }
      }}
    >
      {/* Premium Header */}
      <Box sx={{
        px: 3, py: 2.2,
        background: 'linear-gradient(135deg, #1b5e20 0%, #0f3d14 100%)',
        color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography sx={{ fontWeight: 800, color: '#fff', fontSize: 18, letterSpacing: '-0.02em' }}>
            #{request.requestId}
          </Typography>
          <Box sx={{ 
            ...getStatusStyle(displayStatus), 
            fontSize: 10, fontWeight: 800, px: 1.5, py: 0.5, borderRadius: '6px', whiteSpace: 'nowrap'
          }}>
            {getStatusLabel(displayStatus)}
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#a7f3d0', p: 0.5, '&:hover': { color: '#fff' } }}>
          <CloseIcon sx={{ fontSize: 22 }} />
        </IconButton>
      </Box>

      {/* Structured Content Container */}
      <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2.2 }}>
        
        {/* Progress Timeline Stepper */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '14px', p: 2.2, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 1.5, boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#1b5e20', display: 'flex', alignItems: 'center', gap: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📍 Tiến độ yêu cầu (Timeline)
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', mt: 1, px: 2 }}>
            {/* Background Line */}
            <Box sx={{ position: 'absolute', top: '15px', left: '8%', right: '8%', height: '3px', bgcolor: '#e2e8f0', zIndex: 1 }} />
            
            {/* Active Progress Line */}
            <Box sx={{ 
              position: 'absolute', 
              top: '15px', 
              left: '8%', 
              width: `${(activeIndex / (steps.length - 1)) * 84}%`, 
              height: '3px', 
              bgcolor: '#2e7d32', 
              zIndex: 2,
              transition: 'width 0.3s ease'
            }} />

            {steps.map((step, idx) => (
              <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3, width: '20%' }}>
                <Box sx={{
                  width: 32, height: 32,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13,
                  transition: 'all 0.3s ease',
                  bgcolor: step.done ? '#2e7d32' : '#f1f5f9',
                  color: step.done ? '#fff' : '#94a3b8',
                  border: step.current ? '3px solid #2563eb' : 'none',
                  boxShadow: step.current ? '0 0 10px rgba(37, 99, 235, 0.5)' : 'none',
                  animation: step.current ? 'pulse 2s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.08)' },
                    '100%': { transform: 'scale(1)' }
                  }
                }}>
                  {step.done ? '✓' : idx + 1}
                </Box>
                <Typography sx={{ fontSize: 9, fontWeight: 700, color: step.done ? '#334155' : '#94a3b8', mt: 1, textAlign: 'center', lineHeight: 1.2 }}>
                  {step.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Priority Warning Banner */}
        {request.isPriority && (
          <Box sx={{
            bgcolor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
            borderRadius: '12px', p: 1.8, display: 'flex', flexDirection: 'column', gap: 0.5,
            boxShadow: '0 2px 6px rgba(220,38,38,0.04)'
          }}>
            <Typography sx={{ fontWeight: 800, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              🚨 Priority Request
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#991b1b', fontWeight: 600 }}>
              Reason: {request.priorityReason || 'No reason provided'}
            </Typography>
          </Box>
        )}

        {/* Section 1: General Info Card */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '14px', p: 2, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#1b5e20', mb: 2, display: 'flex', alignItems: 'center', gap: 0.8, borderBottom: '1px solid #f1f5f9', pb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📝 General Info
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}><DetailItem label="Customer" value={request.customer} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label="Season" value={request.season} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label="Style Number" value={request.styleNumber} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label="Factory" value={request.factory} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label="Sample Stage" value={request.sampleStage} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label="Product Type" value={request.productType} /></Grid>
          </Grid>
        </Box>

        {/* Section 2: Process & Machine Card */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '14px', p: 2, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#1b5e20', mb: 2, display: 'flex', alignItems: 'center', gap: 0.8, borderBottom: '1px solid #f1f5f9', pb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ⚙️ Process & Machine
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}><DetailItem label="Process Type" value={request.processType} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label="In-charge Person" value={request.developerName} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label="Machine Type" value={request.machineType} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label="Machine Dimension" value={request.machineDimension} /></Grid>
          </Grid>
        </Box>

        {/* Section 3: Dates Card */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '14px', p: 2, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#1b5e20', mb: 2, display: 'flex', alignItems: 'center', gap: 0.8, borderBottom: '1px solid #f1f5f9', pb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📅 Timeline & Dates
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}><DetailItem label="Creation Date" value={formatDate(request.createdAt)} /></Grid>
            <Grid size={{ xs: 6 }}>
              <Box 
                onClick={() => {
                  if (canEditMaterialSent) {
                    setEditingRow(request);
                    setNewDate(request.materialSentDate ? new Date(request.materialSentDate) : null);
                  }
                }}
                sx={{
                  cursor: canEditMaterialSent ? 'pointer' : 'default',
                  borderRadius: '6px',
                  p: 0.5,
                  ml: -0.5,
                  transition: 'background-color 0.15s ease',
                  '&:hover': {
                    bgcolor: canEditMaterialSent ? 'rgba(46,125,50,0.08)' : 'transparent',
                  }
                }}
              >
                <Typography sx={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.3, display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  Material Sent
                  {canEditMaterialSent && (
                    <EditIcon sx={{ fontSize: 11, color: '#1b5e20' }} />
                  )}
                </Typography>
                <Typography sx={{ color: request.materialSentDate ? '#0f172a' : '#94a3b8', fontSize: 13, fontWeight: 600 }}>
                  {formatDate(request.materialSentDate) || '—'}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6 }}><DetailItem label="Material Received" value={formatDate(request.materialReceivedDate)} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label="Start Date" value={formatDate(request.startDate)} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label="Finished Date" value={formatDate(request.finishedDate)} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label="Released Date" value={formatDate(request.releasedDate)} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label="Expected Delivery" value={formatDate(request.expectedDeliveryDate)} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label="Confirm Delivery" value={formatDate(request.confirmDeliveryDate)} /></Grid>
          </Grid>
        </Box>

        {/* Section 4: Remarks Card */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '14px', p: 2, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.01)', mb: 1 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#1b5e20', mb: 2, display: 'flex', alignItems: 'center', gap: 0.8, borderBottom: '1px solid #f1f5f9', pb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🏷️ Extra Information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}><DetailItem label="Requester Code" value={request.requesterName} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label="Template Qty" value={request.templateQty !== null ? String(request.templateQty) : '—'} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label="Line Quantity" value={request.lineQuantity || '—'} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label="Sample Size" value={request.sizesRequired || '—'} /></Grid>
            <Grid size={{ xs: 12 }}><DetailItem label="Operation Description" value={request.operationDescription || '—'} /></Grid>
            
            {request.delayRemakeReason && (
              <Grid size={{ xs: 12 }}>
                <Typography sx={{ color: '#d32f2f', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                  Reason for Delay/Remake (TCC)
                </Typography>
                <Box sx={{ bgcolor: '#fff5f5', borderRadius: '10px', p: 1.5, borderLeft: '4px solid #ef4444', mt: 0.5 }}>
                  <Typography sx={{ color: '#991b1b', fontSize: 13, lineHeight: 1.4, fontWeight: 600 }}>
                    {request.delayRemakeReason}
                  </Typography>
                </Box>
              </Grid>
            )}

            {request.comments && (
              <Grid size={{ xs: 12 }}>
                <Typography sx={{ color: '#0284c7', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                  Comments (TCC)
                </Typography>
                <Box sx={{ bgcolor: '#f0f9ff', borderRadius: '10px', p: 1.5, borderLeft: '4px solid #0284c7', mt: 0.5 }}>
                  <Typography sx={{ color: '#0369a1', fontSize: 13, lineHeight: 1.4, fontWeight: 600 }}>
                    {request.comments}
                  </Typography>
                </Box>
              </Grid>
            )}

            <Grid size={{ xs: 12 }}>
              <Typography sx={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                Remarks
              </Typography>
              <Box sx={{ bgcolor: '#f8fafc', borderRadius: '10px', p: 1.5, borderLeft: '4px solid #cbd5e1', mt: 0.5 }}>
                <Typography sx={{ color: request.remarks ? '#334155' : '#94a3b8', fontSize: 13, fontStyle: request.remarks ? 'normal' : 'italic', lineHeight: 1.4 }}>
                  {request.remarks || 'No remarks provided'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Section 5: Comments */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', p: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1b5e20', mb: 1.5 }}>
            {'💬 THẢO LUẬN & TRAO ĐỔI (' + safeComments.length + ')'}
          </Typography>
          
          {commentsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} sx={{ color: '#1b5e20' }} />
            </Box>
          ) : safeComments.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', py: 1 }}>
              Chưa có thảo luận nào
            </Typography>
          ) : (
            <Box sx={{ maxHeight: 200, overflowY: 'auto', mb: 1 }}>
              {safeComments.map((c: any, i: number) => (
                <Box key={c?.id ?? i} sx={{ bgcolor: '#f1f5f9', borderRadius: '8px', p: 1, mb: 1, border: '1px solid #e2e8f0' }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>{c?.authorName || ''}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#1e293b' }}>{c?.content || ''}</Typography>
                </Box>
              ))}
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <TextField
              size="small" fullWidth value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Nhập ý kiến..."
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
              disabled={submittingComment}
              sx={{ '& .MuiInputBase-root': { borderRadius: '20px', fontSize: 12, bgcolor: '#fff' } }}
            />
            <Button variant="contained" onClick={handleSendComment}
              disabled={!newCommentText.trim() || submittingComment}
              sx={{ minWidth: 60, height: 36, borderRadius: '18px', bgcolor: '#1b5e20', '&:hover': { bgcolor: '#2e7d32' }, textTransform: 'none', fontSize: 12 }}
            >
              {submittingComment ? <CircularProgress size={16} color="inherit" /> : 'Gửi'}
            </Button>
          </Box>
        </Box>

        {/* Section 6: Audit Logs */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', p: 2, mb: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1b5e20', mb: 1.5 }}>
            {'📜 NHẬT KÝ THAY ĐỔI (AUDIT LOGS)'}
          </Typography>
          
          {logsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} sx={{ color: '#1b5e20' }} />
            </Box>
          ) : safeAuditLogs.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', py: 1 }}>
              Chưa có lịch sử chỉnh sửa
            </Typography>
          ) : (
            <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
              {safeAuditLogs.map((log: any, i: number) => (
                <Box key={i} sx={{ mb: 1.5, pl: 2, borderLeft: '3px solid #1b5e20' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>{log?.userName || ''}</Typography>
                    <Typography sx={{ fontSize: 10, color: '#94a3b8' }}>{log?.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : ''}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, color: '#475569' }}>{log?.details || ''}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

      </DialogContent>
      
      <Snackbar
        open={localSnackbarOpen}
        autoHideDuration={3000}
        onClose={() => setLocalSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setLocalSnackbarOpen(false)} severity={localSnackbarSeverity} variant="filled" sx={{ width: '100%', fontWeight: 600 }}>
          {localSnackbarMessage}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}


function DraggableFab({ onClick }: { onClick: () => void }) {
  const fabRef = React.useRef<HTMLButtonElement>(null);
  
  const getViewport = () => {
    const parent = fabRef.current?.parentElement;
    return {
      width: parent ? parent.clientWidth : (window.innerWidth || 375),
      height: parent ? parent.clientHeight : (window.innerHeight || 600)
    };
  };

  const [position, setPosition] = React.useState({ 
    x: (window.innerWidth || 375) - 76, 
    y: (window.innerHeight || 600) - 200 
  });
  const [isDragging, setIsDragging] = React.useState(false);

  // Initialize position once parent ref is available
  React.useEffect(() => {
    const viewport = getViewport();
    setPosition({
      x: viewport.width - 72,
      y: viewport.height - 100
    });
  }, []);

  // Keep position within parent boundaries on resize
  React.useEffect(() => {
    const handleResize = () => {
      setPosition(pos => {
        const viewport = getViewport();
        const maxX = viewport.width - 72;
        const maxY = viewport.height - 72;
        return {
          x: Math.max(16, Math.min(pos.x, maxX)),
          y: Math.max(16, Math.min(pos.y, maxY))
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    setIsDragging(false);
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = position.x;
    const initialY = position.y;
    let currentX = position.x;
    let currentY = position.y;
    let hasMoved = false;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMoved = true;
        setIsDragging(true);

        const newX = initialX + dx;
        const newY = initialY + dy;

        const viewport = getViewport();
        const maxX = viewport.width - 72; // FAB is 56px, leaves 16px margin
        const maxY = viewport.height - 72; // FAB is 56px, leaves 16px margin

        currentX = Math.max(16, Math.min(newX, maxX));
        currentY = Math.max(16, Math.min(newY, maxY));
        
        setPosition({
          x: currentX,
          y: currentY
        });
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (!hasMoved) {
        onClick();
      } else {
        // Snap to nearest horizontal edge
        const viewport = getViewport();
        const midX = viewport.width / 2;
        const snapX = currentX < midX ? 16 : viewport.width - 72;
        setPosition(pos => ({
          x: snapX,
          y: pos.y
        }));
      }
      setIsDragging(false);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  return (
    <Fab
      ref={fabRef}
      color="primary"
      aria-label="add"
      onPointerDown={handlePointerDown}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      sx={{
        position: 'absolute',
        bgcolor: '#2e7d32',
        color: '#fff',
        zIndex: 1250,
        boxShadow: '0 4px 14px rgba(46,125,50,0.4)',
        transition: isDragging ? 'none' : 'left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        '&:hover': {
          bgcolor: '#1b5e20',
        },
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
    >
      <AddIcon />
    </Fab>
  );
}


interface MobileRequestListProps {
  requests: TccRequest[];
  loading: boolean;
  filters: any;
  canEditTracking: boolean;
  canDeleteHard: boolean;
  setEditingRow: (row: TccRequest) => void;
  setNewDate: (d: Date | null) => void;
  setCancelConfirmRow: (row: TccRequest) => void;
  setDeleteConfirmRow: (row: TccRequest) => void;
  getStatusLabel: (s: string) => string;
  getStatusStyle: (s: string) => any;
  formatDate: (v: any) => string;
  setSelectedDetailId: (id: string) => void;
  setDetailOpen: (open: boolean) => void;
}

function MobileRequestList({
  requests, loading, filters,
  canEditTracking, canDeleteHard,
  setEditingRow, setNewDate,
  setCancelConfirmRow, setDeleteConfirmRow,
  getStatusLabel, getStatusStyle, formatDate,
  setSelectedDetailId, setDetailOpen
}: MobileRequestListProps) {
  const [mobilePage, setMobilePage] = React.useState(0);
  const MOBILE_PAGE_SIZE = 20;

  const filteredRows = React.useMemo(() => {
    return requests.filter(r => {
      // Customer text search
      const q = (filters.customer ?? '').toLowerCase().trim();
      if (q && !(
        (r.customer ?? '').toLowerCase().includes(q) ||
        (r.styleNumber ?? '').toLowerCase().includes(q) ||
        String(r.requestId ?? '').toLowerCase().includes(q)
      )) return false;
      // Status filter
      if (filters.status && (r.status ?? '').toLowerCase() !== filters.status.toLowerCase()) return false;
      // Factory filter
      if (filters.factory && (r.factory ?? '').toLowerCase() !== filters.factory.toLowerCase()) return false;
      // Season filter
      if (filters.season && (r.season ?? '').toLowerCase() !== filters.season.toLowerCase()) return false;
      return true;
    });
  }, [requests, filters.customer, filters.status, filters.factory, filters.season]);

  const totalPages = Math.ceil(filteredRows.length / MOBILE_PAGE_SIZE);
  const pageRows = filteredRows.slice(mobilePage * MOBILE_PAGE_SIZE, (mobilePage + 1) * MOBILE_PAGE_SIZE);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

      {/* Card list */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
            <CircularProgress size={36} sx={{ color: '#2e7d32' }} />
          </Box>
        ) : pageRows.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 8 }}>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>No data found</Typography>
          </Box>
        ) : pageRows.map((row) => {
          const displayStatus = row.releasedDate ? 'Released' : (row.status || 'Not Started');
          const isCancelled = row.status === 'Cancelled';
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
                setSelectedDetailId(row.requestId);
                setDetailOpen(true);
              }}
              sx={{
                position: 'relative',
                flexShrink: 0,
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                overflow: 'hidden',
                opacity: isCancelled ? 0.6 : 1,
                bgcolor: '#ffffff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                },
                '&:active': {
                  transform: 'scale(0.98)'
                }
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
                    {getStatusLabel(displayStatus)}
                  </Box>
                </Box>
              </Box>

              {/* Body */}
              <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Customer</Typography>
                    <Typography sx={{ fontWeight: 700, color: '#334155', fontSize: 13 }}>{row.customer || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Season</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>{row.season || '—'}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1.5 }}>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Style</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>{row.styleNumber || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Factory</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>{row.factory || '—'}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Sample Stage</Typography>
                    <Typography sx={{ fontWeight: 500, color: '#475569', fontSize: 12 }}>{row.sampleStage || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Product Type</Typography>
                    <Typography sx={{ fontWeight: 500, color: '#475569', fontSize: 12 }}>{row.productType || '—'}</Typography>
                  </Box>
                </Box>

                {/* Dates */}
                <Box sx={{ borderTop: '1px dashed #e2e8f0', pt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
                  <Box 
                    onClick={(e) => {
                      const userInfo = authService.getUserInfo();
                      const reqLower = (row.requesterName || '').trim().toLowerCase();
                      const codeLower = userInfo.employeeCode.trim().toLowerCase();
                      const nameLower = userInfo.employeeName.trim().toLowerCase();
                      const isMyRequest = reqLower === codeLower || reqLower === nameLower || reqLower.startsWith(codeLower + ' -');
                      const canEditThisRow = authService.isSuperAdmin() || authService.isAdmin() || (isMyRequest && canEditTracking);

                      if (canEditThisRow && !isCancelled) {
                        e.stopPropagation();
                        setEditingRow(row);
                        setNewDate(row.materialSentDate ? new Date(row.materialSentDate) : null);
                      }
                    }}
                    sx={{ 
                      cursor: (() => {
                        const userInfo = authService.getUserInfo();
                        const reqLower = (row.requesterName || '').trim().toLowerCase();
                        const codeLower = userInfo.employeeCode.trim().toLowerCase();
                        const nameLower = userInfo.employeeName.trim().toLowerCase();
                        const isMyRequest = reqLower === codeLower || reqLower === nameLower || reqLower.startsWith(codeLower + ' -');
                        const canEditThisRow = authService.isSuperAdmin() || authService.isAdmin() || (isMyRequest && canEditTracking);
                        return (canEditThisRow && !isCancelled) ? 'pointer' : 'default';
                      })(),
                      borderRadius: '6px',
                      p: 0.5,
                      ml: -0.5,
                      '&:hover': {
                        bgcolor: (() => {
                          const userInfo = authService.getUserInfo();
                          const reqLower = (row.requesterName || '').trim().toLowerCase();
                          const codeLower = userInfo.employeeCode.trim().toLowerCase();
                          const nameLower = userInfo.employeeName.trim().toLowerCase();
                          const isMyRequest = reqLower === codeLower || reqLower === nameLower || reqLower.startsWith(codeLower + ' -');
                          const canEditThisRow = authService.isSuperAdmin() || authService.isAdmin() || (isMyRequest && canEditTracking);
                          return (canEditThisRow && !isCancelled) ? 'rgba(46,125,50,0.08)' : 'transparent';
                        })(),
                      }
                    }}
                  >
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      Mat. Sent
                      {(() => {
                        const userInfo = authService.getUserInfo();
                        const reqLower = (row.requesterName || '').trim().toLowerCase();
                        const codeLower = userInfo.employeeCode.trim().toLowerCase();
                        const nameLower = userInfo.employeeName.trim().toLowerCase();
                        const isMyRequest = reqLower === codeLower || reqLower === nameLower || reqLower.startsWith(codeLower + ' -');
                        const canEditThisRow = authService.isSuperAdmin() || authService.isAdmin() || (isMyRequest && canEditTracking);
                        return canEditThisRow && !isCancelled;
                      })() && (
                        <EditIcon sx={{ fontSize: 11, color: '#2e7d32' }} />
                      )}
                    </Typography>
                    <Typography sx={{ fontWeight: 600, color: '#334155', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatDate(row.materialSentDate) || '—'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Req. Del.</Typography>
                    <Typography sx={{ fontWeight: 600, color: '#334155', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(row.expectedDeliveryDate) || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Conf. Del.</Typography>
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

export default function RequestorViewPage() {
  const { t } = useTranslation();
  const mainApiRef = useGridApiRef();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const location = useLocation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<TccRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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
        // Clear the query parameter from browser address bar smoothly using navigate
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
  const detailRow = requests.find(r => r.requestId === selectedDetailId) || null;
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
    const [filters, setFilters] = useState<RequestFilters>({
    customer: '',
    factory: '',
    season: '',
    status: '',
  });
  const [customers, setCustomers] = useState<string[]>([]);
  const [factories, setFactories] = useState<string[]>([]);
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

  columnFilterStore.register('requestor', columnFilters, setColumnFilters, requests);

  const [editingRow, setEditingRow] = useState<TccRequest | null>(null);
  const [newDate, setNewDate] = useState<Date | null>(null);
  const [savingDate, setSavingDate] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('error');
  const wsClientRef = useRef<Client | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (filterOpen) {
      setLocalColumnFilters(columnFilters);
    }
  }, [filterOpen, columnFilters]);

  const [colMenuAnchor, setColMenuAnchor] = useState<null | HTMLElement>(null);
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<Record<string, boolean>>({
    machineType: false,
    priorityReason: false,
    releasedDate: false,
    updatedBy: false,
    updatedAt: false,
  });
  const [exporting, setExporting] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('tcc_requestor_column_order');
    return saved ? JSON.parse(saved) : [];
  });
  const [localFields, setLocalFields] = useState<string[]>([]);
  const draggedIndexRef = useRef<number | null>(null);
  const draggedFieldRef = useRef<string | null>(null);

  // Delete Confirmation States
  const [deleteConfirmRow, setDeleteConfirmRow] = useState<TccRequest | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Cancel Confirmation States
  const [cancelConfirmRow, setCancelConfirmRow] = useState<TccRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const canDeleteHard = React.useMemo(() => {
    return authService.isSuperAdmin() || authService.isAdmin() || authService.hasAction('tcc_tracking', 'canDelete');
  }, []);

  const canEditTracking = React.useMemo(() => {
    return authService.isSuperAdmin() || authService.isAdmin() || authService.hasAction('tcc_tracking', 'canEdit');
  }, []);

  const canCancelAll = React.useMemo(() => {
    return authService.isSuperAdmin() || authService.isAdmin() || authService.hasAction('tcc_tracking', 'canCancel');
  }, []);

  const activeFiltersCount = (filters.factory ? 1 : 0) + (filters.season ? 1 : 0) + (filters.status ? 1 : 0);

  const handleExport = async () => {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('TCC Template Requests');

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
      saveAs(blob, `TCC_Template_Requests_${dateStr}.xlsx`);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let data = await tccService.getRequests(filters);
      
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - 15);
      
      // Filter out Released requests, and limit Rejected/Cancelled/Deleted to 15 days
      data = data.filter(r => {
        // 1. If Released (has ReleasedDate), do not show
        if (r.releasedDate) {
          return false;
        }
        
        // 2. If status is Rejected, Cancelled, or Deleted, only show within 15 days
        const statusLower = (r.status || '').toLowerCase();
        if (statusLower === 'rejected' || statusLower === 'cancelled' || statusLower === 'deleted' || statusLower === 'reject' || statusLower === 'cancel') {
          if (!r.createdAt) return false;
          return new Date(r.createdAt) >= limitDate;
        }
        
        return true;
      });
      
      const userInfo = authService.getUserInfo();
      const isSuperAdmin = authService.isSuperAdmin();
      const isAdmin = authService.isAdmin();
      const hasViewAllPerm = authService.hasAction('tcc_tracking', 'canBypassCheck');

      const canViewAll = isSuperAdmin || isAdmin || hasViewAllPerm;

      if (canViewAll) {
        setRequests(data);
      } else {
        const filtered = data.filter((r) => {
          if (!r.requesterName) return false;
          const reqLower = r.requesterName.trim().toLowerCase();
          const codeLower = userInfo.employeeCode.trim().toLowerCase();
          const nameLower = userInfo.employeeName.trim().toLowerCase();
          return reqLower === codeLower || 
                 reqLower === nameLower || 
                 reqLower.startsWith(codeLower + ' -');
        });
        setRequests(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch requests', error);
      setSnackbarMessage(t('tcc.fetchError', 'Không thể tải danh sách yêu cầu'));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestsRef = useRef(fetchRequests);
  useEffect(() => {
    fetchRequestsRef.current = fetchRequests;
  }, [fetchRequests]);

  useEffect(() => {
    fetchRequests();

    const loadMetadata = async () => {
      try {
        const data = await tccService.getMetadata();
        if (data.customer && data.customer.length > 0) {
          setCustomers(data.customer);
        }
        if (data.factory && data.factory.length > 0) {
          setFactories(data.factory);
        }
      } catch (error) {
        console.error('Failed to load metadata for filters', error);
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
  }, []); // Initial load

  const handleFilterChange = (field: keyof RequestFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleRequestSuccess = () => {
    setFormOpen(false);
    fetchRequests();
    if (wsClientRef.current && wsClientRef.current.connected) {
      try {
        wsClientRef.current.publish({ destination: '/topic/tcc-updates', body: 'refresh' });
      } catch (err) {
        console.error('Failed to publish WS message', err);
      }
    }
  };

  const handleApplyFilters = () => {
    fetchRequests();
  };

  const handleDateSave = async () => {
    if (!editingRow || !newDate) return;
    setSavingDate(true);
    try {
      const dateStr = format(newDate, 'yyyy-MM-dd');
      await tccService.updateMaterialSentDate(editingRow.requestId, dateStr);
      // Refresh or update locally
      setRequests((prev) =>
        prev.map((r) =>
          r.requestId === editingRow.requestId ? { ...r, materialSentDate: dateStr } : r
        )
      );
      setEditingRow(null);
    } catch (error) {
      console.error('Failed to save date', error);
      setSnackbarMessage(t('tcc.updateMaterialDateError', 'Lỗi khi cập nhật ngày gửi vật liệu'));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSavingDate(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmRow) return;
    setDeleting(true);
    try {
      await tccService.deleteRequest(deleteConfirmRow.requestId);
      setRequests((prev) => prev.filter((r) => r.requestId !== deleteConfirmRow.requestId));
      setDeleteConfirmRow(null);
    } catch (error) {
      console.error('Failed to delete request', error);
      setSnackbarMessage(t('tcc.deleteError', 'Lỗi khi xóa yêu cầu'));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelConfirmRow) return;
    setCancelling(true);
    try {
      await tccService.updateProgress(cancelConfirmRow.requestId, { status: 'Cancelled' });
      setRequests((prev) =>
        prev.map((r) =>
          r.requestId === cancelConfirmRow.requestId ? { ...r, status: 'Cancelled' } : r
        )
      );
      setCancelConfirmRow(null);
    } catch (error) {
      console.error('Failed to cancel request', error);
      setSnackbarMessage(t('tcc.cancelError', 'Lỗi khi hủy yêu cầu'));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setCancelling(false);
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

  const columns = React.useMemo<GridColDef[]>(() => [
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
      headerName: t('tcc.expectedDeliveryDate', 'Request Delivery Date'), 
      width: 140,
      renderCell: (params) => formatDate(params.value)
    },
    {
      field: 'confirmDeliveryDate',
      headerName: t('tcc.confirmDeliveryDate', 'Confirmed Delivery Date'),
      width: 140,
      renderCell: (params) => {
        const reqDateStr = params.row.expectedDeliveryDate;
        const confDateStr = params.value;
        
        const formattedDate = formatDate(confDateStr);
        if (!formattedDate) return '';

        // Highlight in RED if confirmed is after requested
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
    { field: 'templateQty', headerName: t('tcc.templateQty', 'Template Qty (TCC)'), width: 150 },
    { field: 'lineQuantity', headerName: t('tcc.lineQuantity', 'Line Quantity'), width: 180 },
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
            {/* Cancel Button (Visible only to creator or admin/cancel permission) */}
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

            {/* Delete Button (Only visible to Admin/SuperAdmin, or creator with delete permission) */}
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
  ], [t, setEditingRow, setNewDate, setDeleteConfirmRow, setCancelConfirmRow, canDeleteHard, canEditTracking, canCancelAll]);

  const sortedColumns = React.useMemo<GridColDef[]>(() => {
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
                localStorage.setItem('tcc_requestor_column_order', JSON.stringify(updated));
              }
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: col.headerAlign === 'center' ? 'center' : 'flex-start',
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
              padding: '4px',
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
  }, [columns, columnOrder, columnFilters]);

  useEffect(() => {
    if (reorderOpen) {
      setLocalFields(sortedColumns.map(c => c.field));
    }
  }, [reorderOpen, sortedColumns]);

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.5, overflow: 'hidden' }}>
      {/* 🚀 Toolbar Area 🚀 */}
      {/* 🚀 Toolbar Area 🚀 */}
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
                if (e.key === 'Enter') handleApplyFilters();
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
                  borderRadius: '22px', height: 44, bgcolor: '#fff', fontSize: 13, px: 2,
                  '& fieldset': { borderColor: '#e2e8f0' },
                  '&:hover fieldset': { borderColor: '#2e7d32' },
                  '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
                } 
              }}
            />

            {/* Sync (Load Data) Button */}
            <IconButton 
              onClick={fetchRequests}
              disabled={loading}
              sx={{ 
                bgcolor: 'rgba(46,125,50,0.1)', 
                color: '#1b5e20',
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
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
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

            {/* More Menu Trigger Button */}
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

          {/* Items Count & Divider Line */}
          {(filters.customer || activeFiltersCount > 0 || requests.length > 0) && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, mb: 0.5, px: 0.5 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {loading ? 'Loading...' : `${requests.length} requests found`}
              </Typography>
              <Divider sx={{ flexGrow: 1, ml: 1.5, borderColor: 'rgba(0,0,0,0.06)' }} />
            </Box>
          )}

          {/* Mobile Actions Dropdown Menu */}
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
            <MenuItem disabled={exporting || requests.length === 0} onClick={() => { setMobileMenuAnchor(null); handleExport(); }}>
              <FileDownloadIcon sx={{ mr: 1.5, fontSize: 20, color: 'text.secondary' }} />
              <Typography fontSize={14} fontWeight={500}>
                {exporting ? t('tcc.exporting', 'Exporting...') : t('tcc.export', 'Export')}
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
                if (e.key === 'Enter') handleApplyFilters();
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
                  borderRadius: '8px', height: 40, bgcolor: '#fff', fontSize: 13,
                  '& fieldset': { borderColor: '#e2e8f0' },
                  '&:hover fieldset': { borderColor: '#3ba55c' },
                  '&.Mui-focused fieldset': { borderColor: '#3ba55c' }
                } 
              }}
            />
            
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <AppButton 
                variant="outlined" customVariant="secondary" 
                startIcon={<FilterListIcon />}
                onClick={() => setFilterOpen(true)}
                sx={{ 
                  ...(activeFiltersCount > 0 && { 
                    borderColor: '#2e7d32', 
                    color: '#1b5e20', 
                    bgcolor: 'rgba(46,125,50,0.05)',
                    '&:hover': { bgcolor: 'rgba(46,125,50,0.1)', borderColor: '#2e7d32' }
                  })
                }}
              >
                {t('tcc.filter', 'Filter')}{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
              </AppButton>

              {Object.keys(columnFilters).length > 0 && (
                <AppButton 
                  variant="outlined" customVariant="secondary"
                  startIcon={<FilterAltOffIcon />}
                  onClick={() => setColumnFilters({})}
                  sx={{ 
                    borderColor: '#ef5350', 
                    color: '#c62828', 
                    bgcolor: 'rgba(239,83,80,0.05)',
                    '&:hover': { bgcolor: 'rgba(239,83,80,0.1)', borderColor: '#c62828' }
                  }}
                >
                  Clear Filters ({Object.keys(columnFilters).length})
                </AppButton>
              )}

              <AppButton 
                variant="outlined" customVariant="secondary"
                onClick={(e) => setColMenuAnchor(e.currentTarget)}
                startIcon={<ViewColumnIcon sx={{ fontSize: '20px !important' }} />}
              >
                {t('tcc.columns', 'Columns')}
              </AppButton>

              <AppButton 
                variant="contained" customVariant="primary"
                disabled={loading}
                onClick={fetchRequests}
                startIcon={
                  <SyncIcon sx={{ 
                    fontSize: '20px !important',
                    animation: loading ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' }
                    }
                  }} />
                }
              >
                {t('tcc.loadData', 'Load Data')}
              </AppButton>
            </Box>
          </Box>

          {/* Actions */}
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

      {/* DATA GRID or MOBILE CARD LIST */}
      
      {isMobile ? (
        <MobileRequestList
          requests={filteredRequests}
          loading={loading}
          filters={filters}
          canEditTracking={canEditTracking}
          canDeleteHard={canDeleteHard}
          setEditingRow={setEditingRow}
          setNewDate={setNewDate}
          setCancelConfirmRow={setCancelConfirmRow}
          setDeleteConfirmRow={setDeleteConfirmRow}
          getStatusLabel={getStatusLabel}
          getStatusStyle={getStatusStyle}
          formatDate={formatDate}
          setSelectedDetailId={setSelectedDetailId}
          setDetailOpen={setDetailOpen}
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
          slots={{ footer: CustomFooter, columnMenu: ExcelStyleColumnMenu, filterPanel: CustomFilterPanel }}
          sx={{
            height: '100%',
            border: 'none',
            '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-filler, & .MuiDataGrid-scrollbarFiller, & .MuiDataGrid-columnHeader--filled': { backgroundColor: '#F9FAFA !important', borderBottom: '1px solid #e1e3e4 !important' },
            '& .MuiDataGrid-columnHeader': { bgcolor: '#F9FAFA', color: '#707975', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, whiteSpace: 'normal !important', lineHeight: '1.2 !important', wordBreak: 'normal' },
            '& .MuiDataGrid-cell': { borderColor: '#e1e3e4', fontSize: '13px', color: '#3f4945', '&:focus': { outline: 'none !important' }, '&:focus-within': { outline: 'none !important' } },
            '& .MuiDataGrid-row:hover': { bgcolor: '#F9FAFA !important' },
            '& .row-cancelled': { opacity: 0.5, pointerEvents: 'none' }
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
            minDate={new Date()}
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
      <Dialog 
        open={!!deleteConfirmRow} 
        onClose={() => !deleting && setDeleteConfirmRow(null)}
      >
        <DialogTitle>{t('tcc.confirmDeleteTitle', 'Confirm Delete')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t('tcc.confirmDeleteMessage', 'Are you sure you want to delete request {{id}}?', { id: deleteConfirmRow?.requestId })}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton 
            onClick={() => setDeleteConfirmRow(null)} 
            disabled={deleting}
            variant="outlined"
            customVariant="secondary"
          >
            {t('tcc.cancel', 'Cancel')}
          </AppButton>
          <AppButton 
            onClick={handleDeleteConfirm} 
            variant="contained" 
            color="error"
            disabled={deleting}
            sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#c62828' } }}
          >
            {deleting ? <CircularProgress size={20} color="inherit" /> : t('tcc.delete', 'Delete')}
          </AppButton>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog 
        open={!!cancelConfirmRow} 
        onClose={() => !cancelling && setCancelConfirmRow(null)}
      >
        <DialogTitle>{t('tcc.confirmCancelTitle', 'Confirm Cancel')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t('tcc.confirmCancelMessage', 'Are you sure you want to cancel request {{id}}?', { id: cancelConfirmRow?.requestId })}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton 
            onClick={() => setCancelConfirmRow(null)} 
            disabled={cancelling}
            variant="outlined"
            customVariant="secondary"
          >
            {t('tcc.cancel', 'Cancel')}
          </AppButton>
          <AppButton 
            onClick={handleCancelConfirm} 
            variant="contained" 
            color="warning"
            disabled={cancelling}
            sx={{ bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}
          >
            {cancelling ? <CircularProgress size={20} color="inherit" /> : t('tcc.cancelRequest', 'Cancel Request')}
          </AppButton>
        </DialogActions>
      </Dialog>

      <AdvancedFilterDrawer
        title={t('tcc.advancedFilter', 'Filter Nâng cao')}
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onClear={() => {
          setFilters({ customer: '', factory: '', season: '', status: '' });
          setLocalColumnFilters({});
          setColumnFilters({});
          setFilterOpen(false);
        }}
        onApply={() => {
          setColumnFilters(localColumnFilters);
          setFilterOpen(false);
          handleApplyFilters();
        }}
        hasActiveFilters={Boolean(filters.customer || filters.factory || filters.season || filters.status || Object.keys(columnFilters).length > 0)}
      >
        <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>
          {t('tcc.additionalFilters')}
        </Typography>
        <FormControl fullWidth size="small">
          <InputLabel sx={{ fontSize: 13 }}>{t('tcc.customer')}</InputLabel>
          <Select
            value={filters.customer || ''}
            label={t('tcc.customer')}
            onChange={(e) => handleFilterChange('customer', e.target.value)}
            sx={{
              borderRadius: '8px', 
              height: 40, 
              fontSize: 13, 
              bgcolor: '#fff', 
              '& fieldset': { borderColor: '#bfc9c4' }, 
              '&:hover fieldset': { borderColor: '#2e7d32' }, 
              '&.Mui-focused fieldset': { borderColor: '#2e7d32' } 
            }}
          >
            <MenuItem value=""><em>None</em></MenuItem>
            {customers.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel sx={{ fontSize: 13 }}>{t('tcc.factory')}</InputLabel>
          <Select
            value={filters.factory || ''}
            label={t('tcc.factory')}
            onChange={(e) => handleFilterChange('factory', e.target.value)}
            sx={{
              borderRadius: '8px', 
              height: 40, 
              fontSize: 13, 
              bgcolor: '#fff', 
              '& fieldset': { borderColor: '#bfc9c4' }, 
              '&:hover fieldset': { borderColor: '#2e7d32' }, 
              '&.Mui-focused fieldset': { borderColor: '#2e7d32' } 
            }}
          >
            <MenuItem value=""><em>None</em></MenuItem>
            {factories.map((f) => (
              <MenuItem key={f} value={f}>{f}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <AppTextField
          label={t('tcc.season')}
          fullWidth
          value={filters.season || ''}
          onChange={(e) => handleFilterChange('season', e.target.value)}
        />
        <FormControl fullWidth size="small">
          <InputLabel sx={{ fontSize: 13 }}>{t('tcc.status', 'Status')}</InputLabel>
          <Select
            value={filters.status || ''}
            label={t('tcc.status', 'Status')}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            sx={{
              borderRadius: '8px', 
              height: 40, 
              fontSize: 13, 
              bgcolor: '#fff', 
              '& fieldset': { borderColor: '#bfc9c4' }, 
              '&:hover fieldset': { borderColor: '#2e7d32' }, 
              '&.Mui-focused fieldset': { borderColor: '#2e7d32' } 
            }}
          >
            <MenuItem value=""><em>None</em></MenuItem>
            <MenuItem value="Not Started">Not Started</MenuItem>
            <MenuItem value="Work in Progress">Work in Progress</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
            <MenuItem value="Remake">Remake</MenuItem>
          </Select>
        </FormControl>

        {isMobile && (
          <>
            <Divider sx={{ my: 0.5 }} />
            <MobileColumnFilters
              pageId="requestor"
              allFields={[
                { 
                  field: 'status', 
                  label: t('tcc.status', 'Status'),
                  valueGetter: (value: any, row: any) => getStatusLabel(row.releasedDate ? 'Released' : (value || 'Not Started'))
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
      </AdvancedFilterDrawer>

      <RequestFormDialog 
        open={formOpen} 
        onClose={() => setFormOpen(false)} 
        onSuccess={handleRequestSuccess} 
        lastRequest={requests && requests.length > 0 ? requests[0] : undefined}
      />

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
            Select All
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
            Hide All
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
            sx={{ py: 0.5, borderRadius: 1 }}
          >
            <Checkbox 
              size="small" 
              checked={columnVisibilityModel[col.field] !== false} 
              sx={{ mr: 1, p: 0, pointerEvents: 'none' }} 
            />
            <Typography fontSize={13} fontWeight={500} sx={{ pointerEvents: 'none' }}>
              {col.headerName}
            </Typography>
          </MenuItem>
        ))}
      </Menu>

      <RequestDetailDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        request={detailRow}
        getStatusLabel={getStatusLabel}
        getStatusStyle={getStatusStyle}
        formatDate={formatDate}
        t={t}
        canEditTracking={canEditTracking}
        setEditingRow={setEditingRow}
        setNewDate={setNewDate}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} variant="filled" sx={{ width: '100%', fontWeight: 600 }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

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
              const colDef = sortedColumns.find(c => c.field === field);
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
                      sx={{ p: 0.5 }}
                    >
                      <ArrowUpwardIcon fontSize="inherit" sx={{ fontSize: 16 }} />
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
                      sx={{ p: 0.5 }}
                    >
                      <ArrowDownwardIcon fontSize="inherit" sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
          <Button
            onClick={() => {
              const defaultFields = [
                'requestId',
                'createdAt',
                'customer',
                'season',
                'styleNumber',
                'productType',
                'sampleStage',
                'factory',
                'materialSentDate',
                'processType',
                'operationDescription',
                'machineType',
                'machineDimension',
                'sizesRequired',
                'isPriority',
                'priorityReason',
                'expectedDeliveryDate',
                'confirmDeliveryDate',
                'finishedDate',
                'delayRemakeReason',
                'templateQty',
                'lineQuantity',
                'requesterName',
                'remarks',
                'updatedBy',
                'updatedAt',
                'actions'
              ];
              setLocalFields(defaultFields);
            }}
            variant="text"
            color="secondary"
            sx={{ fontWeight: 'bold', fontSize: 13 }}
          >
            {t('tcc.resetDefault', 'Mặc định')}
          </Button>
          <Button
            onClick={() => setReorderOpen(false)}
            variant="outlined"
            color="secondary"
            sx={{ borderRadius: 2, fontWeight: 'bold', px: 2.5, fontSize: 13 }}
          >
            {t('common.cancel', 'Hủy')}
          </Button>
          <Button
            onClick={() => {
              setColumnOrder(localFields);
              localStorage.setItem('tcc_requestor_column_order', JSON.stringify(localFields));
              setReorderOpen(false);
            }}
            variant="contained"
            color="primary"
            sx={{ borderRadius: 2, fontWeight: 'bold', px: 3, bgcolor: '#1b5e20', '&:hover': { bgcolor: '#1b5e20' }, fontSize: 13 }}
          >
            {t('common.save', 'Lưu')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* R&D Material Style FAB for Add New on Mobile */}
      {isMobile && authService.hasAction('tcc_tracking', 'canAdd') && (
        <DraggableFab onClick={() => setFormOpen(true)} />
      )}
    </Box>
  );
}
