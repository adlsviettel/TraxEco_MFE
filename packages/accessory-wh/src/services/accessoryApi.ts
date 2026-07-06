import { authFetch } from '@traxeco/shared';

export interface AccItem {
  ItemNumber: string;
  Configuaration: string | null;
  Size: string | null;
  Color: string | null;
  Style: string | null;
  BatchNumber: string | null;
  Warehouse: string | null;
  Site: string | null;
  PhysicalInventory: number;
  SearchName: string | null;
  ItemGroup: string | null;
  Unit: string | null;
}

export const accessoryApi = {
  searchItems: async (params: { item?: string; po?: string; color?: string; size?: string; style?: string; config?: string }): Promise<AccItem[]> => {
    const query = new URLSearchParams();
    if (params.item) query.append('item', params.item);
    if (params.po) query.append('po', params.po);
    if (params.color) query.append('color', params.color);
    if (params.size) query.append('size', params.size);
    if (params.style) query.append('style', params.style);
    if (params.config) query.append('config', params.config);

    const res = await authFetch(`http://localhost:3001/api/inventory/search?${query.toString()}`);
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  },

  printLabel: async (payload: any) => {
    const res = await authFetch('http://localhost:3001/api/inventory/print', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Print failed');
    return res.json();
  },

  putaway: async (barCode: string, locationCode: string) => {
    const res = await authFetch('http://localhost:3001/api/inventory/putaway', {
      method: 'POST',
      body: JSON.stringify({ barCode, locationCode })
    });
    if (!res.ok) throw new Error('Putaway failed');
    return res.json();
  },

  putawayManual: async (payload: any) => {
    const res = await authFetch('http://localhost:3001/api/inventory/putaway-manual', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Manual Putaway failed');
    return res.json();
  },

  putawayManualBulk: async (items: any[], locationCode: string) => {
    const res = await authFetch('http://localhost:3001/api/inventory/putaway-manual-bulk', {
      method: 'POST',
      body: JSON.stringify({ items, locationCode })
    });
    if (!res.ok) throw new Error('Bulk Manual Putaway failed');
    return res.json();
  }
};
