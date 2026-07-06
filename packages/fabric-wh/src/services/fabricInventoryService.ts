import { authFetch } from '@traxeco/shared';
/**
 * Fabric Inventory API Service
 */
const API = import.meta.env.VITE_API_BASE_URL || 'http://172.17.186.139:8100/api';

export interface FabricInventoryItem {
  DateInHouse: string | null;
  SupCode: string;
  OrderNumber: string;
  InvoiceNo: string;
  RollItem: string;
  ColorCode: string;
  Color: string;
  BatchNo: string;
  RollNo: string;
  ShipLength: number | null;
  Balance: number | null;
  NW: number | null;
  GW: number | null;
  Width: number | null;
  Location: string | null;
  "WH-Location": string | null;
  DateModify: string | null;
  Modify_By: string | null;
  Invoice2: string | null;
  Remark: string | null;
  Fac: string;
  Qc: string | null;
  PassPO: string;
  Comment: string | null;
  InsptRoll: string | null;
  Date_Relax: string | null;
  Time_Relax: string | null;
  RelaxBy: string | null;
  HourRelax: number | null;
  HourStandard: number | null;
  Remark2: string | null;
  RecNo: number;
  QrCode: string;
  BarCode: string | null;
  Status?: number | string | null;
}

export interface InventorySearchParams {
  invoiceNo?: string;
  orderNumber?: string;
  rollItem?: string;
  color?: string;
  batchNo?: string;
  rollNo?: string;
}

export interface LocationHistoryItem {
  PalletCode: string | null;
  RecoredDate: string | null;
  CreatedBy: string | null;
  Fac: string | null;
}

export const fabricInventoryService = {
  async search(params: InventorySearchParams): Promise<{ data: FabricInventoryItem[]; total: number }> {
    const token = localStorage.getItem('token');
    const qs = new URLSearchParams();
    if (params.invoiceNo) qs.set('invoiceNo', params.invoiceNo);
    if (params.orderNumber) qs.set('orderNumber', params.orderNumber);
    if (params.rollItem) qs.set('rollItem', params.rollItem);
    if (params.color) qs.set('color', params.color);
    if (params.batchNo) qs.set('batchNo', params.batchNo);
    if (params.rollNo) qs.set('rollNo', params.rollNo);

    const res = await authFetch(`${API}/fabric-wh/inventory?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getDashboardStats(): Promise<any> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/dashboard-stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getLocationHistory(rollNameId: string): Promise<LocationHistoryItem[]> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/location-history?rollNameId=${encodeURIComponent(rollNameId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async softDelete(recNos: number[]): Promise<{ message: string; affected: number }> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/delete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recNos }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async updateLocation(qrCodes: string[], newLocation: string): Promise<{ message: string }> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/location/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCodes, newLocation }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
    return result;
  },

  async updateWHLocation(qrCode: string, newLocation: string): Promise<{ message: string }> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/inventory/update-wh-location`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCode, location: newLocation }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async updateBalance(recNo: number, balance: number, isZero: boolean): Promise<{ message: string }> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/balance/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recNo, balance, isZero }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Lỗi server: HTTP ${res.status}`);
    }
    return res.json();
  },

  async updateLength(recNo: number, length: number): Promise<{ message: string }> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/length/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recNo, length }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Lỗi server: HTTP ${res.status}`);
    }
    return res.json();
  },

  async getPallets(): Promise<{ ShNm: string; ShLevl: string; ShSeq: string }[]> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/pallets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getRelaxReport(fromDate: string, toDate: string): Promise<any[]> {
    const token = localStorage.getItem('token');
    const qs = new URLSearchParams();
    if (fromDate) qs.set('fromDate', fromDate);
    if (toDate) qs.set('toDate', toDate);

    const res = await authFetch(`${API}/fabric-wh/relax?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getIssueReport(fromDate: string, toDate: string): Promise<any[]> {
    const token = localStorage.getItem('token');
    const qs = new URLSearchParams();
    if (fromDate) qs.set('fromDate', fromDate);
    if (toDate) qs.set('toDate', toDate);

    const res = await authFetch(`${API}/fabric-wh/issue-report?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async updateIssueQty(recNo: number, qtyOut: number): Promise<any> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/issue-report/qty`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ recNo, qtyOut }),
    });
    if (!res.ok) {
      let errText = `HTTP ${res.status}`;
      try {
        const errorData = await res.json();
        errText = errorData.error || errText;
      } catch (e) {}
      throw new Error(errText);
    }
    return res.json();
  },

  async getAuditLogs(fromDate?: string, toDate?: string): Promise<any[]> {
    const token = localStorage.getItem('token');
    const qs = new URLSearchParams();
    if (fromDate) qs.set('fromDate', fromDate);
    if (toDate) qs.set('toDate', toDate);

    const res = await authFetch(`${API}/fabric-wh/audit-logs?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async updateRelaxTime(recNo: number, qrCode: string, newDateTime: string): Promise<any> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/relax/update-time`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ recNo, qrCode, newDateTime })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `Lỗi HTTP ${res.status}`);
    return result;
  },

  async deleteRelax(recNos: number[]): Promise<any> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/relax/delete`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ recNos })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `Lỗi HTTP ${res.status}`);
    return result;
  },

  async scanForRelax(qrCode: string): Promise<any> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/relax/scan?qrCode=${encodeURIComponent(qrCode)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `Lỗi HTTP ${res.status}`);
    return result;
  },

  async getRelaxHistory(): Promise<any[]> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/relax/history`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `Lỗi HTTP ${res.status}`);
    return result;
  },

  async startRelaxTime(qrCode: string): Promise<any> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/relax/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ qrCode })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `Lỗi HTTP ${res.status}`);
    return result;
  },

  async cancelOldRelax(qrCode: string): Promise<any> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/relax/cancel-old`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ qrCode })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `Lỗi HTTP ${res.status}`);
    return result;
  },

  async deleteRelaxRecords(qrCodes: string[]): Promise<any> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/relax/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ qrCodes })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `Lỗi HTTP ${res.status}`);
    return result;
  },

  async endRelaxAndSaveMeasurement(data: { qrCode: string, widthBegin: number, widthMiddle: number, widthEnd: number, actualYard: number }): Promise<any> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/relax/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `Lỗi HTTP ${res.status}`);
    return result;
  },

  /**
   * Issue Fabric: Scan a QR code and get roll details with validation.
   * Backend validates: SunriseOut, PassPO, LabStt, RelaxTime.
   */
  async scanRoll(qrCode: string): Promise<ScanRollResult> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/issue-fabric/scan-roll?qrCode=${encodeURIComponent(qrCode)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `Lỗi HTTP ${res.status}`);
    return result;
  },

  /**
   * Putaway: Scan roll to place in shelf. 
   * It handles auto-insertion into RollDataDtl if missing.
   */
  async scanRollForPutaway(qrCode: string): Promise<any> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/putaway/scan-roll?qrCode=${encodeURIComponent(qrCode)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `Lỗi HTTP ${res.status}`);
    return result;
  },

  /**
   * Batch Issue multiple rolls to Cutting or Transfer to another Factory
   */
  async batchIssueFabric(
    rolls: Record<string, any>[], 
    isRecut: boolean = false,
    issueType: 'Issue' | 'ChangeFac' = 'Issue',
    targetFactory: string = ''
  ): Promise<{ message: string, newQrs?: any[] }> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/issue-fabric/batch-issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ rolls, isRecut, issueType, targetFactory })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `Lỗi HTTP ${res.status}`);
    return result;
  },

  async getTargetFactories(): Promise<string[]> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/target-factories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getShelfLocations(): Promise<any[]> {
    const token = localStorage.getItem('token');
    const res = await authFetch(`${API}/fabric-wh/shelf-locations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
};

/** Shape returned by the scan-roll API */
export interface ScanRollResult {
  QrCode: string;
  OrderNumber: string;
  SupCode: string;
  InvoiceNo: string;
  RollItem: string;
  Color: string;
  BatchNo: string;
  RollNo: string;
  ShipLength: number;
  Balance: number;
  Qc: string | null;
  PassPO: string;
  Remark: string | null;
  Comment: string | null;
  Fac: string;
  DateInHouse: string;
  InsptRoll: string;
  LabStt: string;
  HourStandard: number;
  HourRelax: number;
  SttRelax: string;
  SunriseOut: string;
  productname: string | null;
  RollLocation: string | null;
  RecNo: number;
}
