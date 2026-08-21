import { useState, useCallback } from 'react';
import { qcAccessoryApi } from '../services/qcAccessoryApi';
import { useToast } from '@traxeco/shared';
import type { InvoiceItem, DefectRecord, AQLLevel, PickedItem } from '../types';

function extractArray(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && Array.isArray(res.items)) return res.items;
  return [];
}

export function useQCInspection() {
  // State for invoice data
  const [invoiceData, setInvoiceData] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // State for selected items
  const [pickedIDs, setPickedIDs] = useState<string[]>([]);
  const [selectedIDs, setSelectedIDs] = useState<string[]>([]);
  
  // State for invoice info display
  const [invoiceInfo, setInvoiceInfo] = useState({
    invoiceNo: '---', invoiceDate: '---', poNo: '---', supplier: '---',
    mClss: '---', item: '---', color: '---', size: '---',
    orderQty: '---', unit: '---', style: '---', job: '---',
  });
  
  // State for AQL
  const [aqlLevels, setAqlLevels] = useState<AQLLevel[]>([]);
  const [selectedAQL, setSelectedAQL] = useState('');
  const [sampleSize, setSampleSize] = useState(0);
  const [acceptLevel, setAcceptLevel] = useState(0);
  const [rejectLevel, setRejectLevel] = useState(0);
  
  // State for defects
  const [defects, setDefects] = useState<DefectRecord[]>([]);
  
  // Metal & moisture
  const [metalStatus, setMetalStatus] = useState(true);
  const [moistureEnabled, setMoistureEnabled] = useState(false);
  const [humidity, setHumidity] = useState(0);
  const [note, setNote] = useState('');
  
  const { showToast } = useToast();
  
  // Search Invoice
  const searchInvoice = useCallback(async (invoiceNumber: string) => {
    setLoading(true);
    try {
      const res = await qcAccessoryApi.searchInvoice(invoiceNumber);
      const data = extractArray(res);
      setInvoiceData(data);
      if (!data || data.length === 0) {
        showToast('Không tìm thấy dữ liệu', 'warning');
      }
      return data;
    } catch (err) {
      showToast('Lỗi khi tìm kiếm Invoice', 'error');
      return [];
    } finally {
      setLoading(false);
    }
  }, [showToast]);
  
  // Pick items
  const pickItems = useCallback(async (ids: string[]) => {
    try {
      await qcAccessoryApi.pickItems(ids);
      setPickedIDs(prev => [...new Set([...prev, ...ids])]);
      showToast('Pick thành công!', 'success');
    } catch (err) {
      showToast('Lỗi khi pick items', 'error');
    }
  }, [showToast]);
  
  // Calculate AQL
  const calculateAQL = useCallback((orderQty: number, aqlData: AQLLevel[]) => {
    const list = extractArray(aqlData);
    for (const level of list) {
      if (orderQty >= level.LoadSize1 && orderQty <= level.LoadSize2) {
        setSampleSize(level.SampleSize);
        setAcceptLevel(level.Accept);
        setRejectLevel(level.Reject);
        return level;
      }
    }
    return null;
  }, []);
  
  // Add defect
  const addDefect = useCallback(async (code: string, name: string, qty: number, image: string) => {
    if (selectedIDs.length === 0) {
      showToast('Chưa chọn lô hàng', 'warning');
      return;
    }
    try {
      await qcAccessoryApi.addDefect(selectedIDs, code, qty, image);
      const existing = defects.find(d => d.Code === code && d.ID === selectedIDs[0]);
      if (existing) {
        setDefects(prev => prev.map(d => 
          d.Code === code && d.ID === selectedIDs[0] 
            ? { ...d, Qty: d.Qty + qty, Image: image ? (d.Image ? `${d.Image},${image}` : image) : d.Image }
            : d
        ));
      } else {
        setDefects(prev => [...prev, { Code: code, Name: name, Qty: qty, Image: image, Path: '', ID: selectedIDs[0] }]);
      }
      showToast('Thêm defect thành công', 'success');
    } catch (err) {
      showToast('Lỗi khi thêm defect', 'error');
    }
  }, [selectedIDs, defects, showToast]);
  
  // Remove defect
  const removeDefect = useCallback(async (code: string, id: string) => {
    try {
      await qcAccessoryApi.removeDefect(id, code);
      setDefects(prev => {
        return prev.map(d => {
          if (d.Code === code && d.ID === id) {
            if (d.Qty <= 1) return null;
            return { ...d, Qty: d.Qty - 1 };
          }
          return d;
        }).filter(Boolean) as DefectRecord[];
      });
      showToast('Đã xóa defect', 'success');
    } catch (err) {
      showToast('Lỗi khi xóa defect', 'error');
    }
  }, [showToast]);
  
  // Update result (Pass/Fail)
  const updateResult = useCallback(async (result: string) => {
    if (selectedIDs.length === 0) {
      showToast('Chưa chọn lô hàng', 'warning');
      return;
    }
    try {
      await qcAccessoryApi.updateResult(selectedIDs, result, note, metalStatus ? 1 : 0);
      showToast('Upload Complete!', 'success');
      resetForm();
    } catch (err) {
      showToast('Lỗi khi cập nhật kết quả', 'error');
    }
  }, [selectedIDs, note, metalStatus, showToast]);
  
  // Approval
  const submitApproval = useCallback(async (status: string) => {
    if (selectedIDs.length === 0) {
      showToast('Chưa chọn lô hàng', 'warning');
      return;
    }
    try {
      await qcAccessoryApi.approval(selectedIDs, status);
      showToast('Approval completed!', 'success');
    } catch (err) {
      showToast('Lỗi khi approval', 'error');
    }
  }, [selectedIDs, showToast]);
  
  // Reset form
  const resetForm = useCallback(() => {
    setDefects([]);
    setInvoiceInfo({
      invoiceNo: '---', invoiceDate: '---', poNo: '---', supplier: '---',
      mClss: '---', item: '---', color: '---', size: '---',
      orderQty: '---', unit: '---', style: '---', job: '---',
    });
    setNote('');
    setMetalStatus(true);
    setSelectedIDs([]);
  }, []);
  
  // Get total defect qty
  const totalDefectQty = defects.reduce((sum, d) => sum + d.Qty, 0);
  const shouldFail = rejectLevel > 0 && totalDefectQty >= rejectLevel;
  
  return {
    // State
    invoiceData, loading, pickedIDs, selectedIDs, invoiceInfo,
    aqlLevels, selectedAQL, sampleSize, acceptLevel, rejectLevel,
    defects, metalStatus, moistureEnabled, humidity, note,
    totalDefectQty, shouldFail,
    // Setters
    setInvoiceInfo, setPickedIDs, setSelectedIDs,
    setAqlLevels, setSelectedAQL, setMetalStatus,
    setMoistureEnabled, setHumidity, setNote,
    // Actions
    searchInvoice, pickItems, calculateAQL,
    addDefect, removeDefect, updateResult, submitApproval, resetForm,
  };
}
