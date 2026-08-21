import { useState, useCallback } from 'react';
import { qcAccessoryApi } from '../services/qcAccessoryApi';
import { useToast } from '@traxeco/shared';
import type { DefectCode } from '../types';

export function useDefectManager() {
  const [defectCodes, setDefectCodes] = useState<DefectCode[]>([]);
  const [selectedDefect, setSelectedDefect] = useState<DefectCode | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Load defect codes on mount
  const loadDefectCodes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await qcAccessoryApi.getDefectCodes();
      if (Array.isArray(data)) {
        setDefectCodes(data);
      }
    } catch {
      showToast('Lỗi khi tải danh sách defect', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Upload image
  const uploadImage = useCallback(async (file: File): Promise<string> => {
    try {
      const result = await qcAccessoryApi.uploadImage(file);
      return result?.fileName || result?.name || '';
    } catch {
      showToast('Lỗi khi upload ảnh', 'error');
      return '';
    }
  }, [showToast]);

  return {
    defectCodes, selectedDefect, loading,
    setSelectedDefect, loadDefectCodes, uploadImage,
  };
}
