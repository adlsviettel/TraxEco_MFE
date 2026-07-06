import { authFetch } from '@traxeco/shared';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const deliveryScanService = {
  // Lấy danh sách PO (autocomplete)
  getListPO: async (searchValue: string): Promise<string[]> => {
    const res = await authFetch(`f2s-delivery/scan/po?searchValue=${encodeURIComponent(searchValue)}`);
    if (!res.ok) throw new Error('Failed to load list PO');
    const resData = await res.json();
    const data = resData.result1 || resData.result2 || Object.values(resData)[0] || [];
    return Array.isArray(data) ? data.map((d: any) => d.PONo || d.pono || Object.values(d)[0]) : [];
  },

  getListSO: async (searchValue: string): Promise<string[]> => {
    const res = await authFetch(`f2s-delivery/scan/so?searchValue=${encodeURIComponent(searchValue)}`);
    if (!res.ok) throw new Error('Failed to load list SO');
    const resData = await res.json();
    const data = resData.result1 || resData.result2 || Object.values(resData)[0] || [];
    return Array.isArray(data) ? data.map((d: any) => d.JobNo || d.jobNo || Object.values(d)[0]) : [];
  },

  getDetailsPO: async (po: string): Promise<any> => {
    const res = await authFetch(`f2s-delivery/scan/po-details?po=${encodeURIComponent(po)}`);
    if (!res.ok) throw new Error('Failed to load PO details');
    const resData = await res.json();
    return resData;
  },

  getDetailsSO: async (so: string): Promise<any> => {
    const res = await authFetch(`f2s-delivery/scan/so-details?so=${encodeURIComponent(so)}`);
    if (!res.ok) throw new Error('Failed to load SO details');
    const resData = await res.json();
    return resData;
  },

  getPoPackingStatus: async (po: string): Promise<any[]> => {
    const res = await authFetch(`f2s-delivery/po-status?po=${encodeURIComponent(po)}`);
    if (!res.ok) throw new Error('Failed to load PO packing status');
    return await res.json();
  },

  getPoPlasticCrates: async (po: string): Promise<any[]> => {
    const res = await authFetch(`f2s-delivery/po-status/crates?po=${encodeURIComponent(po)}`);
    if (!res.ok) throw new Error('Failed to load plastic crates');
    return await res.json();
  },

  getPoCartonDetails: async (po: string): Promise<any[]> => {
    const res = await authFetch(`f2s-delivery/po-status/cartons?po=${encodeURIComponent(po)}`);
    if (!res.ok) throw new Error('Failed to load carton details');
    return await res.json();
  },

  syncPoPlasticCrates: async (po: string): Promise<any> => {
    const res = await authFetch(`f2s-delivery/po-status/sync-crates?po=${encodeURIComponent(po)}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to sync plastic crates');
    return await res.json();
  },

  searchPoNumbers: async (query: string): Promise<string[]> => {
    const res = await authFetch(`f2s-delivery/po-status/search-po?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to search PO numbers');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  confirmManualDelivery: async (xmlData: string): Promise<any> => {
    const res = await authFetch(`f2s-delivery/scan/confirm`, {
      method: 'POST',
      body: JSON.stringify({ xmlData }),
    });
    
    // Server có thể trả về 400 hoặc 500 kèm JSON error message, nên ta bắt lỗi kĩ
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Lỗi khi xác nhận giao hàng');
    }
    return data;
  },

  /**
   * Sửa hoặc Xóa dòng giao hàng
   * action = 0 -> Xóa, action = 1 -> Sửa
   */
  updateOrDeleteDelivery: async (action: number, xmlData: string): Promise<any> => {
    const res = await authFetch(`f2s-delivery/scan/update-delete`, {
      method: 'POST',
      body: JSON.stringify({ action, xmlData }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Lỗi khi xử lý yêu cầu');
    }
    return data;
  },

  /**
   * Lấy danh sách hàng giao chờ nhận từ bảng InlineFGsWHImportSewing
   * Filter: Comment IS NULL AND WHStt IS NULL AND LEFT(FacLine, 2) = Factory
   */
  getImportSewingData: async (factory: string, filters: { po?: string, job?: string, line?: string } = {}, page: number = 0, size: number = 50): Promise<any> => {
    let url = `f2s-delivery/receive/pending?factory=${encodeURIComponent(factory)}&page=${page}&size=${size}`;
    if (filters.po && filters.po.trim()) url += `&po=${encodeURIComponent(filters.po.trim())}`;
    if (filters.job && filters.job.trim()) url += `&job=${encodeURIComponent(filters.job.trim())}`;
    if (filters.line && filters.line.trim()) url += `&line=${encodeURIComponent(filters.line.trim())}`;
    
    const res = await authFetch(url);
    if (!res.ok) throw new Error('Failed to load pending imports');
    const resData = await res.json();
    return resData;
  },

  /**
   * Xác nhận nhận hàng kho
   * Sẽ cập nhật Comment và WHStt trong DB
   */
  confirmImportSewing: async (barcode: string, actualQty: number): Promise<any> => {
    const res = await authFetch(`f2s-delivery/receive/confirm`, {
      method: 'POST',
      body: JSON.stringify({ barcode, actualQty }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Lỗi khi xác nhận nhận hàng');
    }
    return data;
  },

  /**
   * Lấy lịch sử chỉnh sửa cập nhật nhận hàng của 1 mã đơn
   */
  getReceiveHistory: async (barcode: string): Promise<any[]> => {
    const res = await authFetch(`f2s-delivery/receive/${encodeURIComponent(barcode)}/history`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Lỗi lấy lịch sử');
    }
    return data.data || [];
  },
};
