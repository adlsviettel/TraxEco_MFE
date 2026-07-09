import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { tccService, type TccRequest } from '../services/tccService';

export function useMaterialDateEditor(
  setRequests: React.Dispatch<React.SetStateAction<TccRequest[]>>,
  showSnackbar: (msg: string, severity: 'success' | 'error') => void,
  t: any
) {
  const [editingRow, setEditingRow] = useState<TccRequest | null>(null);
  const [newDate, setNewDate] = useState<Date | null>(null);
  const [savingDate, setSavingDate] = useState(false);

  const handleDateSave = useCallback(async () => {
    if (!editingRow || !newDate) return;
    setSavingDate(true);
    try {
      const dateStr = format(newDate, 'yyyy-MM-dd');
      await tccService.updateMaterialSentDate(editingRow.requestId, dateStr);
      setRequests((prev) =>
        prev.map((r) =>
          r.requestId === editingRow.requestId ? { ...r, materialSentDate: dateStr } : r
        )
      );
      setEditingRow(null);
      showSnackbar(t('tcc.updateMaterialDateSuccess', 'Cập nhật ngày gửi vật liệu thành công'), 'success');
    } catch (error) {
      console.error('Failed to save date', error);
      showSnackbar(t('tcc.updateMaterialDateError', 'Lỗi khi cập nhật ngày gửi vật liệu'), 'error');
    } finally {
      setSavingDate(false);
    }
  }, [editingRow, newDate, setRequests, showSnackbar, t]);

  return {
    editingRow,
    setEditingRow,
    newDate,
    setNewDate,
    savingDate,
    handleDateSave
  };
}
