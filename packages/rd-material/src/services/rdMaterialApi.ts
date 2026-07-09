/**
 * R&D Material Library API — uses TraxEco's authFetch (shared auth/token).
 * All endpoints go through the same backend at VITE_API_BASE_URL.
 */
import type { Item, PageResponse } from '../types';

// Lazy-import authFetch to avoid circular dependencies
const getAuthFetch = async () => {
  const { authFetch } = await import('@traxeco/shared');
  return authFetch;
};

export interface ItemFilter {
  itemType?: string;
  itemCode?: string;
  category?: string;
  supplierName?: string;
  keyword?: string;
  color?: string;
  origin?: string;
  location?: string;
  holder?: string;
  parentId?: number;
  page?: number;
  size?: number;
  garmentCategory?: string;
  sportCategory?: string;
  styleNo?: string;
  sampleStage?: string;
}

export const rdItemApi = {
  getAll: async (params: ItemFilter = {}): Promise<PageResponse<Item>> => {
    const authFetch = await getAuthFetch();
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) query.set(k, String(v));
    });
    const res = await authFetch(`rd-items?${query.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  getById: async (id: number): Promise<Item> => {
    const authFetch = await getAuthFetch();
    const res = await authFetch(`rd-items/${id}`, { cache: 'no-store' });
    try {
      return await res.json();
    } catch {
      // Backend may return truncated JSON due to infinite recursion loop
      return { id } as Item;
    }
  },

  getChildren: async (id: number): Promise<Item[]> => {
    const authFetch = await getAuthFetch();
    const res = await authFetch(`rd-items/${id}/children`);
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  getByQrCode: async (qrCode: string): Promise<Item> => {
    const authFetch = await getAuthFetch();
    const res = await authFetch(`rd-items/qr/${qrCode}`);
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  create: async (data: Partial<Item>): Promise<Item> => {
    const authFetch = await getAuthFetch();
    const res = await authFetch('rd-items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  update: async (id: number, data: Partial<Item>): Promise<Item> => {
    const authFetch = await getAuthFetch();
    const res = await authFetch(`rd-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  softDelete: async (id: number): Promise<void> => {
    const authFetch = await getAuthFetch();
    await authFetch(`rd-items/${id}`, { method: 'DELETE' });
  },

  scan: async (itemId: number, payload: { holder: string; qtyChanged: number; note?: string; photoUrl?: string }, actionType: 'IN' | 'OUT'): Promise<void> => {
    const authFetch = await getAuthFetch();
    const res = await authFetch(`rd-items/${itemId}/scan-${actionType.toLowerCase()}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`Failed to scan ${actionType}: ${res.status} ${errorText}`);
    }
  },

  getScanLogs: async (itemId: number): Promise<any[]> => {
    try {
      const authFetch = await getAuthFetch();
      const res = await authFetch(`rd-items/${itemId}/scan-logs`);
      
      const text = await res.text();
      if (!text || text.trim() === '') return [];
      
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        return [];
      }
      
      let rawLogs = Array.isArray(json) ? json : [];
      if (!Array.isArray(json) && json) {
        if (Array.isArray(json.data)) rawLogs = json.data;
        else if (Array.isArray(json.content)) rawLogs = json.content;
        else if (json.data && Array.isArray(json.data.content)) rawLogs = json.data.content;
        else if (json.data && Array.isArray(json.data.data)) rawLogs = json.data.data;
      }
      
      return rawLogs.map((log: any) => {
        const rawQty = log.qtyChanged ?? log.qty_changed ?? 0;
        // Use backend 'action' field (SCAN_OUT / SCAN_IN), fallback to qtyChanged sign
        const act = log.action || log.actionType || log.action_type || '';
        const actUpper = String(act).toUpperCase();
        let finalActionType: string;
        if (actUpper.includes('OUT')) {
          finalActionType = 'OUT';
        } else if (actUpper.includes('IN')) {
          finalActionType = 'IN';
        } else {
          finalActionType = Number(rawQty) < 0 ? 'OUT' : 'IN';
        }
        
        return {
          ...log,
          id: log.id,
          itemId: log.itemId || log.item_id,
          itemCode: log.itemCode || log.item_code,
          itemName: log.itemName || log.item_name,
          itemType: log.itemType || log.item_type,
          actionType: finalActionType,
          qtyChanged: Math.abs(Number(rawQty)),
          holder: log.holder,
          locationFrom: log.locationFrom || log.location_from,
          note: log.note,
          scannedAt: log.scannedAt || log.scanned_at,
          scannedBy: log.scannedBy || log.scanned_by,
          photoUrl: log.photoUrl || log.photo_url,
        };
      });
    } catch (e) {
      console.error('[ScanLogs] Error:', e);
      return [];
    }
  },

  getRecentScanLogs: async (): Promise<any[]> => {
    const authFetch = await getAuthFetch();
    const res = await authFetch(`rd-items/history/recent`);
    try {
      const json = await res.json();
      let rawLogs = Array.isArray(json) ? json : [];
      if (!Array.isArray(json) && json) {
        if (Array.isArray(json.data)) rawLogs = json.data;
        else if (Array.isArray(json.content)) rawLogs = json.content;
        else if (json.data && Array.isArray(json.data.content)) rawLogs = json.data.content;
        else if (json.data && Array.isArray(json.data.data)) rawLogs = json.data.data;
      }
      return rawLogs.map((log: any) => {
        const act = log.action || log.actionType || log.action_type || '';
        const actUpper = String(act).toUpperCase();
        const finalActionType = actUpper.includes('OUT') ? 'OUT' : (actUpper.includes('IN') ? 'IN' : actUpper);
        
        return {
          ...log,
          id: log.id,
          itemId: log.itemId || log.item_id,
          itemCode: log.itemCode || log.item_code,
          itemName: log.itemName || log.item_name,
          itemType: log.itemType || log.item_type,
          actionType: finalActionType,
          qtyChanged: Math.abs(log.qtyChanged ?? log.qty_changed ?? 0),
          holder: log.holder,
          locationFrom: log.locationFrom || log.location_from,
          note: log.note,
          scannedAt: log.scannedAt || log.scanned_at,
          scannedBy: log.scannedBy || log.scanned_by,
          photoUrl: log.photoUrl || log.photo_url,
        };
      });
    } catch {
      return [];
    }
  },

  searchScanLogs: async (params: { startDate?: string; endDate?: string; itemType?: string; actionType?: string; keyword?: string; page?: number; size?: number }): Promise<PageResponse<any>> => {
    const authFetch = await getAuthFetch();
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) query.set(k, String(v));
    });
    const res = await authFetch(`rd-items/history?${query.toString()}`);
    try {
      let data = await res.json();
      if (data && !data.content && data.data && data.data.content) {
        data = data.data; // unwrap if it's wrapped in ApiResponse
      }
      if (data && data.content) {
        data.content = data.content.map((log: any) => {
          const rawQty = log.qtyChanged ?? log.qty_changed ?? 0;
          const act = log.action || log.actionType || log.action_type || '';
          const actUpper = String(act).toUpperCase();
          let finalActionType = actUpper.includes('OUT') ? 'OUT' : (actUpper.includes('IN') ? 'IN' : actUpper);
          if (!finalActionType) finalActionType = rawQty < 0 ? 'OUT' : 'IN';
          
          return {
            ...log,
            id: log.id,
            itemId: log.itemId || log.item_id,
            itemCode: log.itemCode || log.item_code,
            itemName: log.itemName || log.item_name,
            itemType: log.itemType || log.item_type,
            actionType: finalActionType,
            qtyChanged: Math.abs(rawQty),
            holder: log.holder,
            locationFrom: log.locationFrom || log.location_from,
            note: log.note,
            scannedAt: log.scannedAt || log.scanned_at,
            scannedBy: log.scannedBy || log.scanned_by,
            photoUrl: log.photoUrl || log.photo_url,
          };
        });
      }
      return data;
    } catch {
      return { content: [], totalElements: 0, totalPages: 0, number: 0, size: params.size || 20 };
    }
  },

  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    // Generate a unique filename using timestamp and a random string to avoid overwrites (especially for clipboard "image.png")
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanName}`;
    formData.append('file', file, uniqueFilename);
    
    // Call the PHP upload URL defined in .env
    let uploadUrl = import.meta.env.VITE_IMAGE_UPLOAD_URL;
    if (uploadUrl) {
      uploadUrl = uploadUrl.replace(/^"|"$/g, '').trim();
    }
    if (!uploadUrl) {
      let baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      baseUrl = baseUrl.replace(/^"|"$/g, '').trim();
      uploadUrl = baseUrl.replace(/\/$/, '') + '/rd-items/upload-image';
    }
    
    // Use standard fetch instead of authFetch to avoid JWT issues if the PHP server doesn't support it
    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });
    
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Upload failed with status: ${res.status}. ${errText}`);
    }
    
    const responseText = await res.text();
    
    // If the response is the exact string from the user's PHP script, construct the URL manually
    if (responseText.includes('Success')) {
      return `/RDMaterialLib/${uniqueFilename}`;
    }
    
    return responseText.replace(/^"|"$/g, '');
  },

  extractSticker: async (file: File, itemType: string): Promise<any> => {
    const authFetch = await getAuthFetch();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('itemType', itemType);

    const res = await authFetch('rd-items/extract-sticker', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`AI Sticker Scan failed: ${errText || res.statusText}`);
    }

    return res.json();
  },


  getCustomers: async (): Promise<any[]> => {
    try {
      const authFetch = await getAuthFetch();
      const res = await authFetch('customers');
      if (!res.ok) throw new Error('API error: ' + res.status);
      const json = await res.json();
      return Array.isArray(json) ? json : (json.data || []);
    } catch (err) {
      console.error('Failed to fetch customers', err);
      return [];
    }
  },

  checkDuplicateCode: async (itemCode: string, itemType: string, excludeId?: number): Promise<boolean> => {
    try {
      const authFetch = await getAuthFetch();
      const url = `rd-items/check-duplicate?itemCode=${encodeURIComponent(itemCode)}&itemType=${encodeURIComponent(itemType)}${excludeId ? `&excludeId=${excludeId}` : ''}`;
      const res = await authFetch(url);
      if (!res.ok) throw new Error('API error: ' + res.status);
      const val = await res.json();
      return !!val;
    } catch (err) {
      console.error('Failed to check duplicate code', err);
      return false;
    }
  },

  getOptions: async (field: string): Promise<string[]> => {
    try {
      // Use plain fetch (not authFetch) — this endpoint is public, no JWT needed
      let baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      baseUrl = baseUrl.replace(/^"|"$/g, '').trim();
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/rd-items/options?field=${field}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error(`Failed to fetch options for ${field}`, err);
      return [];
    }
  },

  getImageUrl: (rawPath: string): string => {
    if (!rawPath) return '';
    // Strip quotes that might have been accidentally saved in the DB
    let path = rawPath.replace(/^"|"$/g, '').trim();
    if (!path) return '';

    const finalizeUrl = (finalUrl: string) => {
      if (finalUrl.startsWith('http://') && typeof window !== 'undefined' && window.location.protocol === 'https:') {
        const basePath = import.meta.env.VITE_BASE_PATH || '/';
        return `${basePath.replace(/\/$/, '')}/proxy.php?url=${encodeURIComponent(finalUrl)}`;
      }
      return finalUrl;
    };
    
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return finalizeUrl(path);
    
    // Rewrite /rd-images/ to /RDMaterialLib/ since they are physically stored there on the PHP server
    if (path.startsWith('/rd-images/')) {
      path = path.replace(/^\/rd-images\//, '/RDMaterialLib/');
    }
    
    // Resolve /api/rd-items/images/ path to PHP /RDMaterialLib/ if that ever occurs
    if (path.startsWith('/api/rd-items/images/')) {
      path = path.replace(/^\/api\/rd-items\/images\//, '/RDMaterialLib/');
    }
    
    // If path is a relative path from our upload script
    if (path.startsWith('/RDMaterialLib/') || path.startsWith('/FGsWHSign/')) {
      let serveUrl = import.meta.env.VITE_IMAGE_SERVE_URL || '';
      serveUrl = serveUrl.replace(/^"|"$/g, '').trim();
      return finalizeUrl(serveUrl + path);
    }
    
    // Resolve relative /api paths against the configured API_BASE_URL (Java backend)
    let baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';
    baseUrl = baseUrl.replace(/^"|"$/g, '').trim();
    
    if (path.startsWith('/api/')) {
      return finalizeUrl(baseUrl.replace(/\/api\/?$/, '') + path);
    }
    
    return finalizeUrl(path);
  },
};
