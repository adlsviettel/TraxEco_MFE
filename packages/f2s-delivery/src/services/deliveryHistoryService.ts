const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

// Keys match SQL column names exactly (JdbcTemplate preserves original casing)
export interface ManualDeliveryRecord {
  FacLine: string;
  JobNo: string;
  PONo: string;
  Size: number;
  Qty: number;
  Importer: string;
  SignImporter: string;
  Exporter: string;
  SignExporter: string;
  DateCreate: string;
  DateExport: string;
  Remark: string;
  IdPart: string;
  Sizx: string;
}

export interface AutoDeliveryRecord {
  Id: number;
  Factory: string;
  PONo: string;
  ManuSize: number;
  PackedQty: number;
  PlasticCode: string;
  CreatedBy: string;
  SysCreateDate: string;
  CTNBarCode: string;
  TypePartition: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  page: number;
  size: number;
}

export const deliveryHistoryService = {
  getManualHistory: async (
    fromDate?: string,
    toDate?: string,
    poNo?: string,
    page: number = 1,
    size: number = 100
  ): Promise<PaginatedResponse<ManualDeliveryRecord>> => {
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    if (poNo) params.append('poNo', poNo);
    params.append('page', page.toString());
    params.append('size', size.toString());
    
    const res = await fetch(`${API_BASE}/f2s-delivery/history/manual?${params}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load manual history');
    const json = await res.json();
    return json.code !== undefined && json.data ? json.data : json;
  },

  getAutoHistory: async (
    fromDate?: string,
    toDate?: string,
    poNo?: string,
    page: number = 1,
    size: number = 100
  ): Promise<PaginatedResponse<AutoDeliveryRecord>> => {
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    if (poNo) params.append('poNo', poNo);
    params.append('page', page.toString());
    params.append('size', size.toString());
    
    const res = await fetch(`${API_BASE}/f2s-delivery/history/auto?${params}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load auto history');
    const json = await res.json();
    return json.code !== undefined && json.data ? json.data : json;
  },
};
