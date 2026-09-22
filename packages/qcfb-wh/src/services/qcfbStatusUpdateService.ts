import { authFetch } from '@traxeco/shared';

export interface LotFilterParams {
  po?: string;
  item?: string;
  color?: string;
  supplier?: string;
  batch?: string;
  quickSearch?: string;
}

export interface FabricLotBackendItem {
  po: string;
  item: string;
  colorCode: string;
  colorName: string;
  invoice: string;
  supplier: string;
  batch: string;
  factory: string;
  stdWidth: number;
  totalRolls: number;
  qtyReceive: number;
  qtyInspection: number;
  actualWidthAvg: number;
  latestInspectDate: string | null;
  isProcessed: number;
  statusUpdateId: number | null;
  savedDateApprove?: string;
  savedActualWidth?: number;
  savedQtyInspection?: number;
  savedJobsJson?: string;
  savedRemark?: string;
}

export interface SaveStatusUpdatePayload {
  id?: number | string | null;
  dateApprove: string;
  po: string;
  item: string;
  colorCode?: string;
  colorName?: string;
  invoice?: string;
  supplier?: string;
  batch?: string;
  totalRolls?: number;
  qtyReceive?: number;
  qtyInspection?: number;
  stdWidth?: number;
  actualWidth?: number;
  jobs?: { job: string; yard: number }[];
  jobsJson?: string;
  remark?: string;
  factory?: string;
}

export interface StatusUpdateHistoryItem {
  id: number;
  dateApprove: string;
  po: string;
  item: string;
  colorCode: string;
  colorName: string;
  invoice: string;
  supplier: string;
  batch: string;
  totalRolls: number;
  qtyReceive: number;
  qtyInspection: number;
  stdWidth: number;
  actualWidth: number;
  jobsJson: string;
  remark: string;
  factory: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const qcfbStatusUpdateService = {
  getLots: async (params?: LotFilterParams): Promise<FabricLotBackendItem[]> => {
    const searchParams = new URLSearchParams();
    if (params?.po) searchParams.append('po', params.po);
    if (params?.item) searchParams.append('item', params.item);
    if (params?.color) searchParams.append('color', params.color);
    if (params?.supplier) searchParams.append('supplier', params.supplier);
    if (params?.batch) searchParams.append('batch', params.batch);
    if (params?.quickSearch) searchParams.append('quickSearch', params.quickSearch);

    const queryStr = searchParams.toString();
    const res = await authFetch(`/qcfb/status-update/lots${queryStr ? '?' + queryStr : ''}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch lots: ${res.statusText}`);
    }
    const json = await res.json();
    return Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : (Array.isArray(json?.result) ? json.result : []));
  },

  saveStatusUpdate: async (payload: SaveStatusUpdatePayload): Promise<{ success: boolean; message: string; id?: number }> => {
    const res = await authFetch('/qcfb/status-update/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Failed to save status update: ${res.statusText}`);
    }
    return await res.json();
  },

  getHistory: async (params?: { fromDate?: string; toDate?: string; po?: string; item?: string; supplier?: string; keyword?: string }): Promise<StatusUpdateHistoryItem[]> => {
    const searchParams = new URLSearchParams();
    if (params?.fromDate) searchParams.append('fromDate', params.fromDate);
    if (params?.toDate) searchParams.append('toDate', params.toDate);
    if (params?.po) searchParams.append('po', params.po);
    if (params?.item) searchParams.append('item', params.item);
    if (params?.supplier) searchParams.append('supplier', params.supplier);
    if (params?.keyword) searchParams.append('keyword', params.keyword);

    const queryStr = searchParams.toString();
    const res = await authFetch(`/qcfb/status-update/history${queryStr ? '?' + queryStr : ''}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch status update history: ${res.statusText}`);
    }
    const json = await res.json();
    return Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : (Array.isArray(json?.result) ? json.result : []));
  },
};
