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
  
  // 0. FIRST & FOREMOST: If rawCat is explicitly set by user, ALWAYS RESPECT IT!
  if (/^[1-8]$/.test(rawCat)) return rawCat;

  const numMatch = rawCat.match(/^([1-8])\s*[\-\:\.\s]/);
  if (numMatch) return numMatch[1];

  const catLower = rawCat.toLowerCase();
  if (catLower) {
    if (catLower.includes('mesin') || catLower.includes('peralatan') || catLower.includes('modal')) return '1';
    if (catLower.includes('hasil produksi') || catLower.includes('thành phẩm') || catLower.includes('finished')) return '2';
    if (catLower.includes('bahan baku') || catLower.includes('penolong') || catLower.includes('raw material')) return '3';
    if (catLower.includes('pengemas') || catLower.includes('packaging')) return '4';
    if (catLower.includes('sisa') || catLower.includes('scrap') || catLower.includes('waste')) return '5';
    if (catLower.includes('sampul') || catLower.includes('contoh')) return '6';
    if (catLower.includes('bangunan') || catLower.includes('konstruksi')) return '7';
    if (catLower.includes('wip') || catLower.includes('bán thành')) return '8';
  }

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
  const s = rawSatuan.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (s.includes('KGM') || s === 'KG' || s === 'KGS' || s.includes('KILO') || s === 'KILOGRAM') return 'KGM';
  if (s.includes('PCS') || s.includes('PCE') || s.includes('PIECE') || s === 'PC' || s === 'PIECES' || s === 'PK' || s === 'PACK' || s === 'BAG' || s === 'BOX' || s === 'BT' || s === 'BTL' || s === 'BOT' || s === 'CAN' || s === 'TUBE') return 'PCE';
  if (s.includes('MTR') || s.includes('METER') || s === 'MT' || s === 'M') return 'MTR';
  if (s.includes('YRD') || s.includes('YARD') || s === 'YDS' || s === 'YD') return 'YRD';
  if (s.includes('SET')) return 'SET';
  if (s.includes('ROLL') || s.includes('ROL') || s === 'RO' || s === 'RL') return 'ROL';
  if (s.includes('CONE') || s.includes('CNE') || s === 'CN') return 'CNE';
  if (s.includes('CARTON') || s.includes('CTN') || s === 'CT' || s === 'BX') return 'CT';
  if (s.includes('LTR') || s.includes('LITER') || s === 'L') return 'LTR';
  if (s.includes('MTQ') || s === 'M3') return 'MTQ';
  if (s.includes('GRM') || s.includes('GRAM') || s === 'GR' || s === 'G') return 'GRM';
  if (s.includes('BALE') || s.includes('BAL') || s === 'BL') return 'BL';
  if (s.includes('PAIR') || s.includes('PAR') || s === 'PRS' || s === 'PR') return 'PRS';
  if (s.includes('DOZ') || s.includes('DZN') || s === 'DZ') return 'DZN';

  // Standard INSW (Indonesian Customs) allowed unit codes
  const allowedInswUnits = ['PCE', 'KGM', 'MTR', 'YRD', 'SET', 'ROL', 'CNE', 'CT', 'LTR', 'MTQ', 'GRM', 'BL', 'PRS', 'DZN'];
  if (allowedInswUnits.includes(s)) {
    return s;
  }

  // Fallback to PCE if unknown to guarantee INSW API validation pass
  console.warn(`⚠️ [INSW] Đơn vị tính "${rawSatuan}" của mặt hàng số ${itemNo} không thuộc danh mục INSW chuẩn, tự động quy đổi về PCE`);
  return 'PCE';
}

function formatInswDate(dateStr: string): string {
  if (!dateStr || !dateStr.trim()) {
    return new Date().toISOString().slice(0, 10);
  }
  const s = dateStr.trim();

  // 1. Match YYYY-MM-DD anywhere in string
  const matchYmd = s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (matchYmd) {
    const year = matchYmd[1];
    const month = matchYmd[2].padStart(2, '0');
    const day = matchYmd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 2. Match DD-MM-YYYY anywhere in string
  const matchDmy = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (matchDmy) {
    const day = matchDmy[1].padStart(2, '0');
    const month = matchDmy[2].padStart(2, '0');
    const year = matchDmy[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export async function buildInswRequestBody(parsedData: ParsedDataSuccess, kdKegiatan: string = '30'): Promise<InswRequestBody> {
  const barangTransaksi: InswBarang[] = [];
  
  // Filter out garbage header rows accidentally captured during PDF parsing
  const filteredItems = (parsedData.items || []).filter(item => {
    const uraian = (item.uraianBarang || '').toLowerCase().trim();
    const kode = (item.kodeBarang || '').toLowerCase().trim();
    
    if (uraian.includes('uraian barang secara') || 
        uraian.includes('kategori barang') || 
        uraian.includes('pos tarif') || 
        uraian.includes('jenis transaksi') ||
        kode.includes('kategori') ||
        kode.includes('uraian') ||
        kode.includes('secara lengkap')) {
      return false;
    }
    return true;
  });

  const rawItems = filteredItems.length > 0 ? filteredItems : [{
    no: '1',
    kodeHS: '',
    uraianBarang: parsedData.fileName || 'Barang Transaksi',
    kodeBarang: 'ITEM-001',
    jumlah: '1',
    satuan: 'PCE',
    harga: '0',
    amount: '0',
    nilaiPabean: '0',
    negara: 'ID'
  }];

  for (const item of rawItems) {
    const jumlahNum = parseNumber(item.jumlah);
    const nilaiNum = parseNumber(item.nilaiPabean || item.amount || item.harga);

    let cleanKdBarang = (item.kodeBarang || '').trim();
    let cleanUraian = (item.uraianBarang || '').trim();

    // If kdBarang is just an item index like "1", "2", "33" or contains header labels, use uraianBarang instead
    if (!cleanKdBarang || /^\d{1,3}(\.)?$/.test(cleanKdBarang) || cleanKdBarang.toLowerCase().includes('kategori')) {
      cleanKdBarang = cleanUraian || 'ITEM-001';
    }

    if (!cleanUraian || cleanUraian.toLowerCase().includes('uraian barang secara')) {
      cleanUraian = cleanKdBarang || 'Barang Transaksi';
    }

    barangTransaksi.push({
      kdKategoriBarang: await mapKategoriBarangAsync(item.kategoriBarang, cleanUraian),
      kdBarang: cleanKdBarang.replace(/[\r\n]+/g, ' ').trim(),
      uraianBarang: cleanUraian.replace(/[\r\n]+/g, ' ').trim(),
      jumlah: jumlahNum > 0 ? jumlahNum : 1,
      kdSatuan: mapKdSatuan(item.satuan, item.no),
      nilai: nilaiNum >= 0 ? nilaiNum : 0,
      dokumen: [],
    });
  }

  // Sanitize and clean Nomor Pengajuan / Nomor Pendaftaran
  let rawNomor = (parsedData.header?.nomorPengajuan || parsedData.header?.nomorPendaftaran || parsedData.fileName || 'DOK-001').trim();
  
  // Extract 26-digit official registration number if available
  const match26 = rawNomor.match(/([0-9]{6}[A-Z0-9]{3,6}[0-9]{10,14})/i) || 
                  (parsedData.fileName || '').match(/([0-9]{6}[A-Z0-9]{3,6}[0-9]{10,14})/i);
  if (match26) {
    rawNomor = match26[1];
  } else if (rawNomor.toLowerCase().startsWith('a.') || rawNomor.toLowerCase().startsWith('d.') || rawNomor.toLowerCase().includes('tanggal') || rawNomor.length < 5) {
    // Try extracting 6-digit registration number
    const match6 = (parsedData.header?.nomorPendaftaran || rawNomor || '').match(/([0-9]{6})/);
    if (match6) {
      rawNomor = match6[1];
    } else {
      // Clean leading garbage prefix
      rawNomor = rawNomor.replace(/^(a\.|d\.|tanggal|nomor)\s*/i, '').trim() || parsedData.fileName || 'DOK-001';
    }
  }

  const rawTanggal = parsedData.header?.tanggalPengajuan || parsedData.header?.tanggalPendaftaran || parsedData.importedAt || '';
  const rawEntitas = (parsedData.header?.penerimaBarang || parsedData.header?.pengirimBarang || 'PT. TRAX APPAREL INDONESIA').trim();

  // Auto-correct kdKegiatan based on document format (31 for Outbound, 30 for Inbound)
  const docFmt = ((parsedData as any).docFormat || parsedData.fileName || '').toLowerCase();
  let effectiveKdKegiatan = kdKegiatan || '30';
  if (docFmt.includes('2.5') || docFmt.includes('2.6.1') || docFmt.includes('4.1') || docFmt.includes('3.0') || docFmt.includes('pengeluaran')) {
    effectiveKdKegiatan = '31';
  } else if (docFmt.includes('2.0') || docFmt.includes('2.3') || docFmt.includes('4.0') || docFmt.includes('2.6.2') || docFmt.includes('pemasukan')) {
    effectiveKdKegiatan = '30';
  }

  return {
    data: [
      {
        kdKegiatan: effectiveKdKegiatan,
        dokumenKegiatan: [
          {
            nomorDokKegiatan: rawNomor,
            tanggalKegiatan: formatInswDate(rawTanggal),
            namaEntitas: rawEntitas || 'PT. TRAX APPAREL INDONESIA',
            barangTransaksi,
          },
        ],
      },
    ],
  };
}

// ─── Helper: Check if document is CEISA 4.0 (Non-INSW Push) ───────────────────

export function isCeisaDoc(item: { fileName?: string; docFormat?: string; header?: { nomorPengajuan?: string }; parsedData?: any } | null | undefined): boolean {
  if (!item) return false;
  const fileName = (item.fileName || '').toLowerCase();
  const parsedData = item.parsedData || item;
  const docFormat = (item.docFormat || parsedData.docFormat || parsedData._debug?.colRanges?.[0]?.xEnd || '').toLowerCase();
  const nomorPengajuan = (parsedData.header?.nomorPengajuan || '').toLowerCase();

  // CEISA 4.0 document formats (stored in IT Inventory only, no INSW Push needed)
  if (['bc27', 'bc41', 'bc261', 'bc25'].includes(docFormat)) return true;

  const is27 = fileName.includes('2.7') || nomorPengajuan.includes('2.7');
  const is41 = fileName.includes('4.1') || nomorPengajuan.includes('4.1');
  const is261 = fileName.includes('2.6.1') || fileName.includes('261') || nomorPengajuan.includes('2.6.1');
  const is25 = fileName.includes('2.5') || nomorPengajuan.includes('2.5');

  if (is27 || is41 || is261 || is25) {
    if (!fileName.includes('2.3') && !fileName.includes('4.0') && !fileName.includes('3.0') && !fileName.includes('2.6.2')) {
      return true;
    }
  }

  return false;
}

// ─── Push to INSW API ────────────────────────────────────────────────────────

export async function pushToInsw(parsedData: ParsedDataSuccess, kdKegiatan: string = '30'): Promise<InswResponse> {
  // BC 2.7, BC 4.1, BC 2.6.1, BC 2.5 files are internal TPB / CEISA 4.0 declarations, managed directly on CEISA, not INSW
  if (isCeisaDoc(parsedData)) {
    return {
      success: false,
      status: 400,
      data: null,
      error: 'Tờ khai (BC 2.7, BC 4.1, BC 2.6.1, BC 2.5) thuộc hệ thống CEISA 4.0. Chứng từ này chỉ import lưu trữ kho IT Inventory, không thuộc quy trình Push lên hệ thống INSW.',
    };
  }

  try {
    const body = await buildInswRequestBody(parsedData, kdKegiatan);
    const config = await getInswConfig();

    console.log('--- INSW PUSH API URL:', 'https://api.insw.go.id/api-prod/inventory/temp/transaksi');
    console.log('--- INSW PUSH PROXY URL:', `/insw/proxy/transaksi`);
    console.log('--- INSW PUSH PAYLOAD BODY (JSON STRING):\n' + JSON.stringify(body, null, 2));

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
      let errMsg = responseData?.message || responseData?.error || responseData?.detail || '';
      if (!errMsg && responseData) {
        if (typeof responseData === 'string') {
          errMsg = responseData;
        } else if (Array.isArray(responseData)) {
          errMsg = responseData.map(e => typeof e === 'object' ? (e.message || e.detail || JSON.stringify(e)) : String(e)).join('; ');
        } else if (typeof responseData === 'object') {
          errMsg = JSON.stringify(responseData);
        }
      }
      if (!errMsg) {
        errMsg = `HTTP ${res.status}: ${res.statusText || 'Bad Request'}`;
      }

      const isAlreadySent = errMsg.toLowerCase().includes('sudah pernah dikirim');
      
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
