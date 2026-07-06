const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

export interface PackingPlanResponse {
  packingList: PackingListItem[];
  packingDetail: PackingDetailItem[];
}

export interface PackingListItem {
  PKInsNo: string;
  PONo: string;
  JobNo: string;
  CartonNo: number;
  PackedQty: number;
  CMS: number;
  CMSL: number;
  CMSH: number;
  CTNSeriNo: string;
  CartonIndex: string;
  WorkingNumber: string;
  PackStt: string;  // "New" = new carton, CTNSeriNo = already packed
}

export interface PackingDetailItem {
  PKInsNo: string;
  PONo: string;
  JobNo: string;
  CartonNo: number;
  CartonQty: number;
  NW: number;
  CMS: number;
  CMSL: number;
  CMSH: number;
  Sizx: string;
  CTNSeriNo: string;
}

export const packingPlanService = {
  async getByPO(po: string): Promise<PackingPlanResponse> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/packing-plan?po=${encodeURIComponent(po)}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch packing plan');
    }

    return response.json();
  },
};
