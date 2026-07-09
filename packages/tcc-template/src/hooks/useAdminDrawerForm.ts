import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { tccService, type TccRequest, type UpdateProgressPayload } from '../services/tccService';

export function useAdminDrawerForm(
  selectedRow: TccRequest | null,
  setSelectedRow: (row: TccRequest | null) => void,
  canEdit: boolean,
  open: boolean,
  onSaveSuccess: () => void,
  onRefreshData: () => void,
  t: any
) {
  const [editForm, setEditForm] = useState<UpdateProgressPayload>({});
  const [detailsEditable, setDetailsEditable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorFields, setErrorFields] = useState<string[]>([]);
  const [reopenConfirmOpen, setReopenConfirmOpen] = useState(false);
  const [errorToast, setErrorToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const devNameRef = useRef<string | null>(null);

  const isEditable = useMemo(() => {
    if (!selectedRow) return false;
    const status = editForm.status || selectedRow.status || 'Not Started';
    const isReleased = !!editForm.releasedDate && !!selectedRow.releasedDate;
    return canEdit && !isReleased && status !== 'Deleted' && status !== 'Cancelled';
  }, [canEdit, selectedRow, editForm.releasedDate, editForm.status]);

  const isConfirmSectionEditable = useMemo(() => {
    if (!isEditable) return false;
    const persistentStatus = selectedRow?.status || 'Not Started';
    if (persistentStatus === 'Rejected') return false;
    const status = editForm.status || 'Not Started';
    return status === 'Not Started' || status === 'Rejected';
  }, [isEditable, editForm.status, selectedRow?.status]);

  const isProgressSectionEditable = useMemo(() => {
    if (!isEditable) return false;
    const status = editForm.status || selectedRow?.status || 'Not Started';
    if (status === 'Rejected') return false;
    return status !== 'Not Started' || !!editForm.confirmStatus;
  }, [isEditable, editForm.status, selectedRow?.status, editForm.confirmStatus]);

  // Load and reset form on row change
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
      setErrorFields([]);
    }
  }, [open, selectedRow]);

  const handleChange = useCallback((field: keyof UpdateProgressPayload, value: any) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    setErrorFields((prev) => prev.filter((f) => f !== field));
  }, []);

  const handleDateChange = useCallback((field: keyof UpdateProgressPayload, date: Date | null) => {
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
      
      if (value) {
        if (field === 'startDate') next.status = 'Work in Progress';
        if (field === 'finishedDate') next.status = 'Completed';
      } else {
        if (field === 'finishedDate' && prev.startDate) {
          next.status = 'Work in Progress';
        }
        if (field === 'startDate') {
          next.status = 'Not Started';
          next.finishedDate = '';
          next.clearFinishedDate = true;
        }
      }
      return next;
    });
  }, []);

  const executeSave = useCallback(async (payloadToSave: UpdateProgressPayload, onSuccess?: () => void) => {
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
  }, [selectedRow, onSaveSuccess]);

  const handleApprove = useCallback(() => {
    if (selectedRow?.expectedDeliveryDate) {
      handleChange('confirmDeliveryDate', selectedRow.expectedDeliveryDate);
    }
    setEditForm((prev) => ({
      ...prev,
      confirmStatus: 'Approved',
      status: 'Not Started'
    }));
    setErrorFields((prev) => prev.filter((f) => f !== 'confirmStatus' && f !== 'status' && f !== 'remarks'));
  }, [selectedRow?.expectedDeliveryDate, handleChange]);

  const handleReject = useCallback(() => {
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
  }, [editForm.remarks, t]);

  const handleSave = useCallback(() => {
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
  }, [editForm, executeSave, t]);

  const confirmReopen = useCallback(async () => {
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
  }, [editForm, selectedRow, setSelectedRow, executeSave, onRefreshData]);

  const handleReleaseOrReopen = useCallback(async () => {
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
  }, [selectedRow?.releasedDate, editForm, executeSave, t]);

  return {
    editForm,
    setEditForm,
    detailsEditable,
    setDetailsEditable,
    saving,
    setSaving,
    errorFields,
    setErrorFields,
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
  };
}
