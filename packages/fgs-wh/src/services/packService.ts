const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

export interface ScannedItem {
  garmentBarcode: string;
  qty: number;
}

export interface PackAndPrintPayload {
  poNo: string;
  ctnBarCode: string;
  ctnNo: number;
  packedQty: number;
  facLine: string;
  ctnSeriNo: string;
  scannedItems: ScannedItem[];
}

async function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const packService = {
  /**
   * Pack and Print — insert into both InlineFGsWHCTNMaster + InlineFGsWHScan
   */
  async packAndPrint(payload: PackAndPrintPayload): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/pack/pack-and-print`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to save Pack and Print data');
    return response.json();
  },

  /**
   * Print only — insert into InlineFGsWHCTNMaster only
   */
  async printOnly(payload: PackAndPrintPayload): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/pack/print-only`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to save Print data');
    return response.json();
  },

  /**
   * Get scan history for a packed carton (by CTNBarCode + PONo)
   */
  async getScanHistory(ctnBarCode: string, poNo: string): Promise<{ GarmentBarcode: string; ScanedQty: number }[]> {
    const response = await fetch(
      `${API_BASE_URL}/pack/scan-history?ctnBarCode=${encodeURIComponent(ctnBarCode)}&poNo=${encodeURIComponent(poNo)}`,
      { headers: await getHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch scan history');
    return response.json();
  },

  /**
   * Get today's pack history for current user
   */
  async getTodayHistory(): Promise<{
    PONo: string;
    CTNBarCode: string;
    CTNNo: number;
    PLQty: number;
    PackedQty: number;
    CTNSeriNo: string;
    SysCreateDate: string;
    FacLine: string;
    Comment1: string | null;
    ReScan: number | null;
  }[]> {
    const response = await fetch(`${API_BASE_URL}/pack/today-history`, {
      headers: await getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch today history');
    return response.json();
  },

  /**
   * Get history by factory + optional PO + optional date range
   */
  async getFactoryHistory(factory: string, poNo?: string, fromDate?: string, toDate?: string) {
    const params = new URLSearchParams({ factory });
    if (poNo) params.append('poNo', poNo);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);

    const response = await fetch(`${API_BASE_URL}/pack/factory-history?${params.toString()}`, {
      headers: await getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch factory history');
    return response.json() as Promise<{
      PONo: string;
      CTNBarCode: string;
      CTNNo: number;
      PLQty: number;
      PackedQty: number;
      CTNSeriNo: string;
      SysCreateDate: string;
      FacLine: string;
      Comment1: string | null;
      ReScan: number | null;
      CreatedBy: string;
    }[]>;
  },
};
