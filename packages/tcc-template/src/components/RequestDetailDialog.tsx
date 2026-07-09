import React, { useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, Box, Typography, IconButton, Grid, 
  CircularProgress, TextField, Button, Snackbar, Alert 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { authService } from '@traxeco/shared';
import { type TccRequest } from '../services/tccService';
import { useRequestDetailData } from '../hooks/useRequestDetailData';

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

interface RequestDetailDialogProps {
  open: boolean;
  onClose: () => void;
  request: TccRequest | null;
  canEditTracking: boolean;
  setEditingRow: (row: TccRequest) => void;
  setNewDate: (d: Date | null) => void;
}

export function RequestDetailDialog({
  open,
  onClose,
  request,
  canEditTracking,
  setEditingRow,
  setNewDate
}: RequestDetailDialogProps) {
  const { t } = useTranslation();

  // Local Snackbar State
  const [localSnackbarOpen, setLocalSnackbarOpen] = useState(false);
  const [localSnackbarMessage, setLocalSnackbarMessage] = useState('');
  const [localSnackbarSeverity, setLocalSnackbarSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  const showToast = React.useCallback((message: string, severity: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setLocalSnackbarMessage(message);
    setLocalSnackbarSeverity(severity);
    setLocalSnackbarOpen(true);
  }, []);

  const {
    auditLogs,
    logsLoading,
    comments,
    commentsLoading,
    newCommentText,
    setNewCommentText,
    submittingComment,
    handleSendComment,
    handleDeleteComment,
    handleTogglePin
  } = useRequestDetailData(request, open, showToast);

  if (!request) return null;

  const displayStatus = request.releasedDate ? 'Released' : (request.status || 'Not Started');
  const isCancelled = request.status === 'Cancelled';
  
  const userInfo = authService.getUserInfo();
  const isSuperOrAdmin = authService.isSuperAdmin() || authService.isAdmin();
  
  const reqLower = (request.requesterName || '').trim().toLowerCase();
  const codeLower = (userInfo.employeeCode || '').trim().toLowerCase();
  const nameLower = (userInfo.employeeName || '').trim().toLowerCase();
  const isMyRequest = reqLower === codeLower || reqLower === nameLower || reqLower.startsWith(codeLower + ' -');
  const canEditThisRow = isSuperOrAdmin || (isMyRequest && canEditTracking);
  const canEditMaterialSent = canEditThisRow && !isCancelled;

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

  const steps = [
    { label: t('tcc.stepCreated', 'Request Created'), done: true, current: false },
    { label: t('tcc.stepMaterialSent', 'Material Sent'), done: !!request.materialSentDate, current: false },
    { label: t('tcc.stepMaterialReceived', 'Material Received'), done: !!request.materialReceivedDate || ['Work in Progress', 'Ready', 'Released', 'Completed'].includes(request.status), current: false },
    { label: t('tcc.stepFinished', 'Pattern Finished'), done: ['Ready', 'Released', 'Completed'].includes(request.status) || !!request.finishedDate, current: false },
    { label: t('tcc.stepReleased', 'Released'), done: ['Released', 'Completed'].includes(request.status) || !!request.releasedDate, current: false },
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

  const safeComments = Array.isArray(comments) ? comments : [];
  const safeAuditLogs = Array.isArray(auditLogs) ? auditLogs : [];

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
            {t('tcc.progressTimeline', '📍 Progress Timeline')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', mt: 1, px: 2 }}>
            <Box sx={{ position: 'absolute', top: '15px', left: '8%', right: '8%', height: '3px', bgcolor: '#e2e8f0', zIndex: 1 }} />
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
              {t('tcc.priorityRequest', '🚨 Priority Request')}
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#991b1b', fontWeight: 600 }}>
              {t('tcc.priorityReasonLabel', 'Reason:')} {request.priorityReason || t('tcc.noReasonProvided', 'No reason provided')}
            </Typography>
          </Box>
        )}

        {/* Section 1: General Info Card */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '14px', p: 2, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#1b5e20', mb: 2, display: 'flex', alignItems: 'center', gap: 0.8, borderBottom: '1px solid #f1f5f9', pb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('tcc.generalInfo', '📝 General Info')}
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.customer', 'Customer')} value={request.customer} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.season', 'Season')} value={request.season} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.styleNumber', 'Style Number')} value={request.styleNumber} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.factory', 'Factory')} value={request.factory} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.sampleStage', 'Sample Stage')} value={request.sampleStage} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.productType', 'Product Type')} value={request.productType} /></Grid>
          </Grid>
        </Box>

        {/* Section 2: Process & Machine Card */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '14px', p: 2, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#1b5e20', mb: 2, display: 'flex', alignItems: 'center', gap: 0.8, borderBottom: '1px solid #f1f5f9', pb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('tcc.processAndMachine', '⚙️ Process & Machine')}
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.processType', 'Process Type')} value={request.processType} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.developerName', 'In-charge Person')} value={request.developerName} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.machineType', 'Machine Type')} value={request.machineType} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.machineDimension', 'Machine Dimension')} value={request.machineDimension} /></Grid>
          </Grid>
        </Box>

        {/* Section 3: Dates Card */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '14px', p: 2, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#1b5e20', mb: 2, display: 'flex', alignItems: 'center', gap: 0.8, borderBottom: '1px solid #f1f5f9', pb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('tcc.timelineDates', '📅 Timeline & Dates')}
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.creationDate', 'Creation Date')} value={formatDate(request.createdAt)} /></Grid>
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
                  {t('tcc.materialSent', 'Material Sent')}
                  {canEditMaterialSent && (
                    <EditIcon sx={{ fontSize: 11, color: '#1b5e20' }} />
                  )}
                </Typography>
                <Typography sx={{ color: request.materialSentDate ? '#0f172a' : '#94a3b8', fontSize: 13, fontWeight: 600 }}>
                  {formatDate(request.materialSentDate) || '—'}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.materialReceived', 'Material Received')} value={formatDate(request.materialReceivedDate)} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.startDate', 'Start Date')} value={formatDate(request.startDate)} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.finishedDate', 'Finished Date')} value={formatDate(request.finishedDate)} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.releasedDate', 'Released Date')} value={formatDate(request.releasedDate)} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.expectedDeliveryDate', 'Expected Delivery')} value={formatDate(request.expectedDeliveryDate)} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.confirmDeliveryDate', 'Confirm Delivery')} value={formatDate(request.confirmDeliveryDate)} /></Grid>
          </Grid>
        </Box>

        {/* Section 4: Remarks Card */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '14px', p: 2, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.01)', mb: 1 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#1b5e20', mb: 2, display: 'flex', alignItems: 'center', gap: 0.8, borderBottom: '1px solid #f1f5f9', pb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('tcc.extraInfo', '🏷️ Extra Information')}
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.requesterCode', 'Requester Code')} value={request.requesterName} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.templateQty', 'Template Qty')} value={request.templateQty !== null ? String(request.templateQty) : '—'} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.lineQuantity', 'Line Quantity')} value={request.lineQuantity || '—'} /></Grid>
            <Grid size={{ xs: 6 }}><DetailItem label={t('tcc.sampleSize', 'Sample Size')} value={request.sizesRequired || '—'} /></Grid>
            <Grid size={{ xs: 12 }}><DetailItem label={t('tcc.operationDescription', 'Operation Description')} value={request.operationDescription || '—'} /></Grid>
            
            {request.delayRemakeReason && (
              <Grid size={{ xs: 12 }}>
                <Typography sx={{ color: '#d32f2f', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                  {t('tcc.delayRemakeLabel', 'Reason for Delay/Remake (TCC)')}
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
                  {t('tcc.commentsTcc', 'Comments (TCC)')}
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
                {t('tcc.remarks', 'Remarks')}
              </Typography>
              <Box sx={{ bgcolor: '#f8fafc', borderRadius: '10px', p: 1.5, borderLeft: '4px solid #cbd5e1', mt: 0.5 }}>
                <Typography sx={{ color: request.remarks ? '#334155' : '#94a3b8', fontSize: 13, fontStyle: request.remarks ? 'normal' : 'italic', lineHeight: 1.4 }}>
                  {request.remarks || t('tcc.noRemarks', 'No remarks provided')}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Section 5: Comments */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', p: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1b5e20', mb: 1.5 }}>
            {t('tcc.discussionHeader', '💬 DISCUSSION & EXCHANGE') + ' (' + safeComments.length + ')'}
          </Typography>
          
          {commentsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} sx={{ color: '#1b5e20' }} />
            </Box>
          ) : safeComments.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', py: 1 }}>
              {t('tcc.noComments', 'No discussions yet')}
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
              placeholder={t('tcc.commentPlaceholder', 'Enter your comment...')}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
              disabled={submittingComment}
              sx={{ '& .MuiInputBase-root': { borderRadius: '20px', fontSize: 12, bgcolor: '#fff' } }}
            />
            <Button variant="contained" onClick={handleSendComment}
              disabled={!newCommentText.trim() || submittingComment}
              sx={{ minWidth: 60, height: 36, borderRadius: '18px', bgcolor: '#1b5e20', '&:hover': { bgcolor: '#2e7d32' }, textTransform: 'none', fontSize: 12 }}
            >
              {submittingComment ? <CircularProgress size={16} color="inherit" /> : t('tcc.send', 'Send')}
            </Button>
          </Box>
        </Box>

        {/* Section 6: Audit Logs */}
        <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', p: 2, mb: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1b5e20', mb: 1.5 }}>
            {t('tcc.auditLogHeader', '📜 AUDIT LOGS')}
          </Typography>
          
          {logsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} sx={{ color: '#1b5e20' }} />
            </Box>
          ) : safeAuditLogs.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', py: 1 }}>
              {t('tcc.noAuditLogs', 'No edit history')}
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
