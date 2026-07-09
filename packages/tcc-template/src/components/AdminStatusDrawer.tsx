import React, { useState } from 'react';
import { 
  Drawer, Box, Typography, Divider, IconButton, FormControl, InputLabel, 
  Select, MenuItem, FormControlLabel, Checkbox, Autocomplete, CircularProgress, 
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DatePicker } from '@mui/x-date-pickers';
import { useTranslation } from 'react-i18next';
import { keyframes } from '@mui/system';
import { format } from 'date-fns';
import { AppTextField, AppButton } from '@traxeco/shared';
import { type TccRequest } from '../services/tccService';
import { useAdminDrawerForm } from '../hooks/useAdminDrawerForm';
import { useMachineTemplateData } from '../hooks/useMachineTemplateData';

const pulseAnimation = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
  70% { transform: scale(1.02); box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
`;

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

interface AdminStatusDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedRow: TccRequest | null;
  setSelectedRow: (row: TccRequest | null) => void;
  canEdit: boolean;
  developers: string[];
  customers: string[];
  factories: string[];
  onSaveSuccess: () => void;
  onRefreshData: () => void;
}

export function AdminStatusDrawer({
  open,
  onClose,
  selectedRow,
  setSelectedRow,
  canEdit,
  developers,
  customers,
  factories,
  onSaveSuccess,
  onRefreshData
}: AdminStatusDrawerProps) {
  const { t } = useTranslation();

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

  const {
    editForm,
    setEditForm,
    detailsEditable,
    setDetailsEditable,
    saving,
    errorFields,
    reopenConfirmOpen,
    setReopenConfirmOpen,
    errorToast,
    setErrorToast,
    devNameRef,
    isEditable,
    isConfirmSectionEditable,
    isProgressSectionEditable,
    handleChange,
    handleDateChange,
    handleApprove,
    handleReject,
    handleSave,
    confirmReopen,
    handleReleaseOrReopen
  } = useAdminDrawerForm(selectedRow, setSelectedRow, canEdit, open, onSaveSuccess, onRefreshData, t);

  const {
    availableMachineTypes,
    availableMachineDimensions,
    seasons,
    productTypes,
    sampleStages
  } = useMachineTemplateData(open, editForm.factory, editForm.machineType, editForm.machineDimension, setEditForm);

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
                {detailsEditable ? (
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: 13 }}>{t('tcc.customer', 'Customer')}</InputLabel>
                    <Select
                      value={editForm.customer ?? ''}
                      label={t('tcc.customer', 'Customer')}
                      onChange={(e) => handleChange('customer', e.target.value)}
                      sx={{ borderRadius: '8px', fontSize: 13 }}
                    >
                      {customers.map((c) => (
                        <MenuItem key={c} value={c} sx={{ fontSize: 13 }}>{c}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <AppTextField
                    label={t('tcc.customer', 'Customer')}
                    value={editForm.customer ?? ''}
                    disabled
                    size="small"
                    fullWidth
                  />
                )}

                {detailsEditable ? (
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: 13 }}>{t('tcc.season', 'Season')}</InputLabel>
                    <Select
                      value={editForm.season ?? ''}
                      label={t('tcc.season', 'Season')}
                      onChange={(e) => handleChange('season', e.target.value)}
                      sx={{ borderRadius: '8px', fontSize: 13 }}
                    >
                      {seasons.map((s) => (
                        <MenuItem key={s} value={s} sx={{ fontSize: 13 }}>{s}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <AppTextField
                    label={t('tcc.season', 'Season')}
                    value={editForm.season ?? ''}
                    disabled
                    size="small"
                    fullWidth
                  />
                )}

                <AppTextField
                  label={t('tcc.styleNumber', 'Style Number')}
                  value={editForm.styleNumber ?? ''}
                  debounceMs={150}
                  onDebounceChange={(val) => handleChange('styleNumber', val)}
                  disabled={!detailsEditable}
                  size="small"
                  fullWidth
                />

                {detailsEditable ? (
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: 13 }}>{t('tcc.productType', 'Product Type')}</InputLabel>
                    <Select
                      value={editForm.productType ?? ''}
                      label={t('tcc.productType', 'Product Type')}
                      onChange={(e) => handleChange('productType', e.target.value)}
                      sx={{ borderRadius: '8px', fontSize: 13 }}
                    >
                      {productTypes.map((pt) => (
                        <MenuItem key={pt} value={pt} sx={{ fontSize: 13 }}>{pt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <AppTextField
                    label={t('tcc.productType', 'Product Type')}
                    value={editForm.productType ?? ''}
                    disabled
                    size="small"
                    fullWidth
                  />
                )}

                {detailsEditable ? (
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: 13 }}>{t('tcc.sampleStage', 'Sample Stage')}</InputLabel>
                    <Select
                      value={editForm.sampleStage ?? ''}
                      label={t('tcc.sampleStage', 'Sample Stage')}
                      onChange={(e) => handleChange('sampleStage', e.target.value)}
                      sx={{ borderRadius: '8px', fontSize: 13 }}
                    >
                      {sampleStages.map((ss) => (
                        <MenuItem key={ss} value={ss} sx={{ fontSize: 13 }}>{ss}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <AppTextField
                    label={t('tcc.sampleStage', 'Sample Stage')}
                    value={editForm.sampleStage ?? ''}
                    disabled
                    size="small"
                    fullWidth
                  />
                )}

                {detailsEditable ? (
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: 13 }}>{t('tcc.factory', 'Factory')}</InputLabel>
                    <Select
                      value={editForm.factory ?? ''}
                      label={t('tcc.factory', 'Factory')}
                      onChange={(e) => handleChange('factory', e.target.value)}
                      sx={{ borderRadius: '8px', fontSize: 13 }}
                    >
                      {factories.map((f) => (
                        <MenuItem key={f} value={f} sx={{ fontSize: 13 }}>{f}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <AppTextField
                    label={t('tcc.factory', 'Factory')}
                    value={editForm.factory ?? ''}
                    disabled
                    size="small"
                    fullWidth
                  />
                )}
                
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
                
                {detailsEditable ? (
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: 13 }}>{t('tcc.machineType', 'Machine Type')}</InputLabel>
                    <Select
                      value={editForm.machineType ?? ''}
                      label={t('tcc.machineType', 'Machine Type')}
                      onChange={(e) => handleChange('machineType', e.target.value)}
                      sx={{ borderRadius: '8px', fontSize: 13 }}
                    >
                      {availableMachineTypes.map((mt) => (
                        <MenuItem key={mt} value={mt} sx={{ fontSize: 13 }}>{mt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <AppTextField
                    label={t('tcc.machineType', 'Machine Type')}
                    value={editForm.machineType ?? ''}
                    disabled
                    size="small"
                    fullWidth
                  />
                )}

                {detailsEditable ? (
                  <FormControl fullWidth size="small" disabled={!editForm.machineType}>
                    <InputLabel sx={{ fontSize: 13 }}>{t('tcc.machineDimension', 'Machine Dimension')}</InputLabel>
                    <Select
                      value={editForm.machineDimension ?? ''}
                      label={t('tcc.machineDimension', 'Machine Dimension')}
                      onChange={(e) => handleChange('machineDimension', e.target.value)}
                      sx={{ borderRadius: '8px', fontSize: 13 }}
                    >
                      {availableMachineDimensions.map((md) => (
                        <MenuItem key={md} value={md} sx={{ fontSize: 13 }}>{md}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <AppTextField
                    label={t('tcc.machineDimension', 'Machine Dimension')}
                    value={editForm.machineDimension ?? ''}
                    disabled
                    size="small"
                    fullWidth
                  />
                )}
                
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
                      const label = getStatusLabel(selected as string);
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
                  >
                    <MenuItem value="Not Started">{t('tcc.statusNotStarted')}</MenuItem>
                    <MenuItem value="Work in Progress">{t('tcc.statusWip')}</MenuItem>
                    <MenuItem value="Completed">{t('tcc.statusCompleted')}</MenuItem>
                    <MenuItem value="Remake">{t('tcc.statusRemake')}</MenuItem>
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
