/**
 * INSW API Service — push parsed PDF data to Indonesian National Single Window
 *
 * Endpoint: POST /api-insw/api-prod/inventory/temp/transaksi
 * (proxied via Vite dev server → https://api.insw.go.id)
 */

import type { ParsedDataSuccess } from '../types/index.ts';
import { getInswConfig } from '../utils/inswConfig.ts';

// ─── INSW Request Types ──────────────────────────────────────────────────────

interface InswBarang {
  kdKategoriBarang: string;
  kdBarang: string;
  uraianBarang: string;
  jumlah: number;
  kdSatuan: string;
  nilai: number;
  dokumen: unknown[];
}

interface InswDokumenKegiatan {
  nomorDokKegiatan: string;
  tanggalKegiatan: string;
  namaEntitas: string;
  barangTransaksi: InswBarang[];
}

interface InswDataItem {
  kdKegiatan: string;
  dokumenKegiatan: InswDokumenKegiatan[];
}

interface InswRequestBody {
  data: InswDataItem[];
}

// ─── Response Type ───────────────────────────────────────────────────────────

export interface InswResponse {
  success: boolean;
  status: number;
  data?: unknown;
  error?: string;
}

// ─── Helper: parse numeric string ────────────────────────────────────────────

function parseNumber(str: string): number {
  // Remove thousands separators (dots or commas) and parse
  const cleaned = str.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// ─── Helper: map kategori to INSW code ──────────────────────────────────────────
export interface InswCategoryMapping {
  id: number;
  keyword: string;
  inswCode: string;
  description: string;
}

let cachedMappings: InswCategoryMapping[] | null = null;

export async function getMappings(): Promise<InswCategoryMapping[]> {
  if (cachedMappings) return cachedMappings;
  try {
    const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
    const res = await fetch(`${BASE_URL}/insw/mappings`);
    if (res.ok) {
      cachedMappings = await res.json();
      return cachedMappings!;
    }
  } catch (e) {
    console.error("Failed to fetch INSW mappings from DB", e);
  }
  return [];
}

/**
 * Smart Hybrid Auto-Classifier for INSW Kategori Barang (1-8)
 * Combines DB Mappings + HS Code Rules + Built-in Keyword Dictionary
 */
export function detectKategoriBarang(item: { kodeHS?: string; kategoriBarang?: string; uraianBarang?: string; kodeBarang?: string }, mappings: InswCategoryMapping[] = []): string {
  const rawCat = (item.kategoriBarang || '').trim();
  if (/^[1-8]$/.test(rawCat)) return rawCat;

  const uraian = (item.uraianBarang || '').toLowerCase();
  const hs = (item.kodeHS || '').replace(/[^0-9]/g, '');
  const kdBarang = (item.kodeBarang || '').toLowerCase();

  // 1. Check User/DB Custom Mappings
  if (mappings.length > 0) {
    if (uraian) {
      const found = mappings.find(m => uraian.includes(m.keyword.toLowerCase()) || uraian === m.description.toLowerCase());
      if (found) return found.inswCode;
    }
    if (rawCat) {
      const found = mappings.find(m => rawCat.includes(m.keyword.toLowerCase()) || rawCat === m.description.toLowerCase() || rawCat === m.inswCode.toLowerCase());
      if (found) return found.inswCode;
    }
  }

  // 2. HS Code Tariff Classification Rules (Indonesia Customs Standard)
  if (hs.length >= 2) {
    const chapter = parseInt(hs.substring(0, 2), 10);
    // Machinery & Assets (Ch. 84 - 85)
    if (chapter === 84 || chapter === 85) return '1';
    // Finished Goods Garments (Ch. 61 - 62)
    if (chapter === 61 || chapter === 62) return '2';
    // Raw Materials & Textiles (Ch. 50 - 60, 39, 48, 96)
    if ((chapter >= 50 && chapter <= 60) || chapter === 39 || chapter === 48 || chapter === 96) return '3';
    // Capital Goods & Metal Tools (Ch. 72 - 83)
    if (chapter >= 72 && chapter <= 83) return '4';
    // Scrap (3915, 5505, 6310)
    if (hs.startsWith('3915') || hs.startsWith('5505') || hs.startsWith('6310')) return '5';
  }

  // 3. Built-in Keyword Dictionary Rules
  const combinedText = `${uraian} ${kdBarang} ${rawCat}`.toLowerCase();

  // Machinery & Asset
  if (/\b(máy|machine|mc-|motor|equipment|sparepart|juki|eastman|jack|brother|pewanti|thiết bị)\b/i.test(combinedText)) {
    return '1';
  }

  // Finished Goods
  if (/\b(t-shirt|shirt|pant|jacket|polo|garment|thành phẩm|áo|quần|trang phục|s2706|fg-)\b/i.test(combinedText)) {
    return '2';
  }

  // Scrap & Waste
  if (/\b(scrap|phế|vải vụn|rác|waste|phế liệu|đầu mẫu)\b/i.test(combinedText)) {
    return '5';
  }

  // Work In Process (WIP)
  if (/\b(wip|prodline|bán thành phẩm|cutting|panel|thùng bán thành)\b/i.test(combinedText)) {
    return '8';
  }

  // Auxiliary Materials & Raw Materials (Default for textile/garment production inputs)
  if (/\b(vải|fabric|jersey|cotton|poly|thread|chỉ|elastic|thun|button|cúc|zipper|khóa|label|nhãn|polybag|túi|box|hộp|tape|băng|yarn|sợi|sub-)\b/i.test(combinedText)) {
    return '3';
  }

  // Safe Default for Import Materials (Category 3 = Bahan Baku / Penolong)
  return '3';
}

async function mapKategoriBarangAsync(kategoriText: string, uraianBarang: string): Promise<string> {
  const mappings = await getMappings();
  return detectKategoriBarang({ kategoriBarang: kategoriText, uraianBarang: uraianBarang }, mappings);
}

// ─── Build request body from parsed PDF data ─────────────────────────────────
// kdKegiatan: 30=Pemasukan, 31=Pengeluaran, 32=Stock Opname, 33=Adjustment

function mapKdSatuan(rawSatuan: string, itemNo: string | number): string {
  if (!rawSatuan || !rawSatuan.trim()) {
    console.warn(`⚠️ [INSW] Mặt hàng số ${itemNo} thiếu Đơn vị tính (Satuan), mặc định dùng PCE`);
    return 'PCE';
  }
  const s = rawSatuan.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.includes('KGM') || s === 'KG' || s.includes('KILO')) return 'KGM';
  if (s.includes('PCS') || s.includes('PCE') || s.includes('PIECE')) return 'PCE';
  if (s.includes('MTR') || s.includes('METER')) return 'MTR';
  if (s.includes('YRD') || s.includes('YARD')) return 'YRD';
  if (s.includes('SET')) return 'SET';
  if (s.includes('ROLL') || s.includes('ROL') || s === 'RO') return 'ROL';
  if (s.includes('CONE') || s.includes('CNE') || s === 'CN') return 'CNE';
  if (s.includes('CARTON') || s.includes('CTN') || s === 'CT') return 'CT';
  if (s.includes('LTR') || s.includes('LITER')) return 'LTR';
  if (s.includes('MTQ')) return 'MTQ';
  if (s.includes('GRM') || s.includes('GRAM')) return 'GRM';
  if (s.includes('BALE') || s.includes('BAL')) return 'BL';
  
  // If we have a 2-3 letter code, just use it and hope INSW accepts it
  if (s.length >= 2 && s.length <= 3) return s;
  
  // Truncate to 3 chars for INSW
  return s.substring(0, 3);
}

export async function buildInswRequestBody(parsedData: ParsedDataSuccess, kdKegiatan: string = '30'): Promise<InswRequestBody> {
  const barangTransaksi: InswBarang[] = [];
  for (const item of parsedData.items) {
    barangTransaksi.push({
      kdKategoriBarang: await mapKategoriBarangAsync(item.kategoriBarang, item.uraianBarang),
      kdBarang: item.kodeBarang || '',
      uraianBarang: item.uraianBarang || '',
      jumlah: parseNumber(item.jumlah),
      kdSatuan: mapKdSatuan(item.satuan, item.no),
      nilai: parseNumber(item.nilaiPabean),
      dokumen: [],
    });
  }

  return {
    data: [
      {
        kdKegiatan,
        dokumenKegiatan: [
          {
            nomorDokKegiatan: parsedData.header.nomorPengajuan || '',
            tanggalKegiatan: parsedData.header.tanggalPengajuan || '',
            namaEntitas: '',
            barangTransaksi,
          },
        ],
      },
    ],
  };
}

// ─── Push to INSW API ────────────────────────────────────────────────────────

export async function pushToInsw(parsedData: ParsedDataSuccess, kdKegiatan: string = '30'): Promise<InswResponse> {
  try {
    const body = await buildInswRequestBody(parsedData, kdKegiatan);
    const config = await getInswConfig();

    console.log('--- INSW PUSH API URL:', 'https://api.insw.go.id/api-prod/inventory/temp/transaksi');
    console.log('--- INSW PUSH PROXY URL:', `/insw/proxy/transaksi`);
    console.log('--- INSW PUSH PAYLOAD BODY:', body);

    const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
    const token = localStorage.getItem('token');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-inswkey': config.xInswKey,
      'x-unique-key': config.xUniqueKey,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}/insw/proxy/transaksi`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const responseData = await res.json().catch(() => null);

    if (res.ok) {
      return { success: true, status: res.status, data: responseData };
    } else {
      const errMsg = responseData?.message || `HTTP ${res.status}: ${res.statusText}`;
      const isAlreadySent = responseData?.message?.toLowerCase().includes('sudah pernah dikirim');
      
      if (isAlreadySent) {
        return {
          success: true,
          status: res.status,
          error: errMsg, // Keep the error message to display in the UI and save to DB
          data: responseData,
        };
      }
      
      return {
        success: false,
        status: res.status,
        error: errMsg,
        data: responseData,
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    return {
      success: false,
      status: 0,
      error: error.message || 'Network error',
    };
  }
}
