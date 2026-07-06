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

async function mapKategoriBarangAsync(kategoriText: string, uraianBarang: string): Promise<string> {
  if (kategoriText && /^[1-8]$/.test(kategoriText.trim())) {
    return kategoriText.trim();
  }

  const mappings = await getMappings();

  // 1. Prioritize mapping by specific item description (uraianBarang)
  if (uraianBarang) {
    const textUraian = uraianBarang.toLowerCase();
    for (const m of mappings) {
      if (textUraian.includes(m.keyword.toLowerCase()) || textUraian === m.description.toLowerCase()) {
        return m.inswCode;
      }
    }
  }

  // 2. Fallback to mapping by global category name (kategoriText)
  if (kategoriText) {
    const textKategori = kategoriText.toLowerCase();
    for (const m of mappings) {
      if (textKategori.includes(m.keyword.toLowerCase()) || textKategori === m.description.toLowerCase() || textKategori === m.inswCode.toLowerCase()) {
        return m.inswCode;
      }
    }
  }

  // 3. Strict Mode: If not found, throw error to BLOCK the push because INSW will reject blanks
  const displayVal = kategoriText ? `Kategori '${kategoriText}'` : `Tên hàng '${uraianBarang}'`;
  throw new Error(`Thiếu danh mục (Kategori) cho mặt hàng: ${displayVal}. Vui lòng thêm Keyword vào trang INSW Mapping và thử lại!`);
}

// ─── Build request body from parsed PDF data ─────────────────────────────────
// kdKegiatan: 30=Pemasukan, 31=Pengeluaran, 32=Stock Opname, 33=Adjustment

export async function buildInswRequestBody(parsedData: ParsedDataSuccess, kdKegiatan: string = '30'): Promise<InswRequestBody> {
  const barangTransaksi: InswBarang[] = [];
  for (const item of parsedData.items) {
    barangTransaksi.push({
      kdKategoriBarang: await mapKategoriBarangAsync(item.kategoriBarang, item.uraianBarang),
      kdBarang: item.kodeBarang || '',
      uraianBarang: item.uraianBarang || '',
      jumlah: parseNumber(item.jumlah),
      kdSatuan: item.satuan || '',
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
