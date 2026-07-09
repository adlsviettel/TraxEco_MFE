import { useState, useCallback } from 'react';
import { tccService, type TccRequest } from '../services/tccService';

export function useDeleteCancel(
  setRequests: React.Dispatch<React.SetStateAction<TccRequest[]>>,
  showSnackbar: (msg: string, severity: 'success' | 'error') => void,
  t: any
) {
  const [deleteConfirmRow, setDeleteConfirmRow] = useState<TccRequest | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [cancelConfirmRow, setCancelConfirmRow] = useState<TccRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmRow) return;
    setDeleting(true);
    try {
      await tccService.deleteRequest(deleteConfirmRow.requestId);
      setRequests((prev) => prev.filter((r) => r.requestId !== deleteConfirmRow.requestId));
      setDeleteConfirmRow(null);
      showSnackbar(t('tcc.deleteSuccess', 'Xóa yêu cầu thành công'), 'success');
    } catch (error) {
      console.error('Failed to delete request', error);
      showSnackbar(t('tcc.deleteError', 'Lỗi khi xóa yêu cầu'), 'error');
    } finally {
      setDeleting(false);
    }
  }, [deleteConfirmRow, setRequests, showSnackbar, t]);

  const handleCancelConfirm = useCallback(async () => {
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
      showSnackbar(t('tcc.cancelSuccess', 'Hủy yêu cầu thành công'), 'success');
    } catch (error) {
      console.error('Failed to cancel request', error);
      showSnackbar(t('tcc.cancelError', 'Lỗi khi hủy yêu cầu'), 'error');
    } finally {
      setCancelling(false);
    }
  }, [cancelConfirmRow, setRequests, showSnackbar, t]);

  return {
    deleteConfirmRow,
    setDeleteConfirmRow,
    deleting,
    handleDeleteConfirm,
    cancelConfirmRow,
    setCancelConfirmRow,
    cancelling,
    handleCancelConfirm
  };
}
