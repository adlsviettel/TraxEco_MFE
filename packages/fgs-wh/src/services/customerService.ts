const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

export interface Customer {
  custmId: number;
  custmName: string;
  ctnCodeMnLn: number;
  ctnCodeMxLn: number;
  poNoMnLn: number;
  poNoMxLn: number;
  gmtUpcMnLn: number;
  gmtUpcMxLn: number;
  ctnPoCdMnLn: number;
  ctnPoCdMxLn: number;
  ctnSeriStrPos: number;
  ctnSeriCdLn: number;
}

export const customerService = {
  async getAll(): Promise<Customer[]> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/customers`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch customers');
    }

    const resData = await response.json();
    return resData.data;
  },
};
