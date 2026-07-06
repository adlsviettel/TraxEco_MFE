/**
 * Multi-Format PDF Parser
 * Supports: PPKEK, BC-2.3, BC-4.0
 * Auto-detects format from PDF content
 */

import * as pdfjsLib from 'pdfjs-dist';
import type { PdfTextItem, ParsedHeader, ParsedItem, ParsedData, ParsedDataSuccess } from '../types/index.ts';

// Use statically served worker from public dir to avoid Vite mangling and CORS!
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
pdfjsLib.GlobalWorkerOptions.workerSrc = `${basePath}/pdf.worker.min.mjs`;

// ─── helpers ────────────────────────────────────────────────────────────────

function clean(str: string): string {
  return (str ?? '').replace(/\s+/g, ' ').trim();
}

function joinParts(a: string, b: string): string {
  return a.endsWith('-') ? a + b : a + ' ' + b;
}

function stripColon(str: string): string {
  return str.replace(/^:\s*/, '').trim();
}

function getRightValue(item: PdfTextItem, pageItems: PdfTextItem[], yTolerance = 3): string {
  const rightItems = pageItems
    .filter(i => Math.abs(i.y - item.y) <= yTolerance && i.x > item.x + 1)
    .sort((a, b) => a.x - b.x);
  for (const ri of rightItems) {
    const val = stripColon(ri.str);
    if (val && val !== ':') return val;
  }
  return '';
}

// ─── PDF raw extraction ──────────────────────────────────────────────────────

async function extractAllPages(file: File): Promise<PdfTextItem[][]> {
  const ab = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
  const pages: PdfTextItem[][] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    pages.push(
      (content.items as Array<{ str?: string; transform?: number[] }>)
        .filter(i => i.str && i.str.trim() && i.transform)
        .map(i => ({ str: i.str!.trim(), x: i.transform![4], y: i.transform![5], page: p }))
    );
  }
  return pages;
}

// ─── Format Detection ────────────────────────────────────────────────────────

type DocFormat = 'ppkek' | 'bc23' | 'bc40' | 'bc261' | 'bc262' | 'bc25' | 'bc27' | 'bc30' | 'bc41' | 'unknown';

function detectFormat(pages: PdfTextItem[][]): DocFormat {
  if (pages.length === 0) return 'unknown';

  const allText = pages.flat().map(i => i.str).join(' ').toUpperCase();
  const firstPageText = pages[0].map(i => i.str).join(' ').toUpperCase();

  console.log('── [DETECT] Total pages:', pages.length);
  console.log('── [DETECT] Total text items:', pages.flat().length);
  console.log('── [DETECT] First 500 chars:', firstPageText.substring(0, 500));

  // Only check the first page for the document title to avoid false positives
  // from other form names being mentioned in the table headers on subsequent pages.
  if (firstPageText.includes('BC 4.0') || firstPageText.includes('BC4.0') ||
      firstPageText.includes('PEMASUKAN BARANG ASAL TEMPAT LAIN DALAM DAERAH PABEAN'))
    return 'bc40';

  if (firstPageText.includes('BC 2.3') || firstPageText.includes('BC2.3') ||
      firstPageText.includes('IMPOR BARANG UNTUK DITIMBUN DI TEMPAT PENIMBUNAN BERIKAT'))
    return 'bc23';

  if (firstPageText.includes('BC 2.6.1') || firstPageText.includes('BC2.6.1') || firstPageText.includes('BC 2.6') || firstPageText.includes('BC2.6'))
    return 'bc261';

  if (firstPageText.includes('BC 2.6.2') || firstPageText.includes('BC2.6.2')) { console.log('[detectFormat] Detected bc262'); return 'bc262'; }

  if (firstPageText.includes('BC 2.5') || firstPageText.includes('BC2.5')) { console.log('[detectFormat] Detected bc25'); return 'bc25'; }

  if (firstPageText.includes('BC 2.7') || firstPageText.includes('BC2.7')) { console.log('[detectFormat] Detected bc27'); return 'bc27'; }

  if (firstPageText.includes('BC 3.0') || firstPageText.includes('BC3.0')) return 'bc30';

  if (firstPageText.includes('BC 4.1') || firstPageText.includes('BC4.1')) return 'bc41';

  if (firstPageText.includes('PPKEK') || firstPageText.includes('KAWASAN EKONOMI KHUSUS'))
    return 'ppkek';

  console.warn('── [DETECT] Could not detect format! Full text sample:', allText.substring(0, 2000));
  return 'unknown';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PPKEK Parser (existing logic)
// ═══════════════════════════════════════════════════════════════════════════════

interface HeaderPattern { key: keyof ParsedHeader; re: RegExp; }

const PPKEK_HEADER_PATTERNS: HeaderPattern[] = [
  { key: 'nomorPengajuan', re: /1\.\s*NOMOR\s+PENGAJUAN/i },
  { key: 'tanggalPengajuan', re: /2\.\s*TANGGAL\s+PENGAJUAN/i },
  { key: 'nomorPendaftaran', re: /3\.\s*NOMOR\s+PENDAFTARAN/i },
  { key: 'tanggalPendaftaran', re: /4\.\s*TANGGAL\s+PENDAFTARAN/i },
];

function extractHeaderPPKEK(pages: PdfTextItem[][]): ParsedHeader {
  const result: ParsedHeader = { nomorPengajuan: '', tanggalPengajuan: '', nomorPendaftaran: '', tanggalPendaftaran: '', penerimaBarang: '', jenisTransaksi: '' };
  const yTol = 4;
  for (const pageItems of pages) {
    let found = 0;
    for (const h of PPKEK_HEADER_PATTERNS) {
      if (result[h.key]) continue;
      const label = pageItems.find(i => h.re.test(i.str));
      if (!label) continue;
      const valItem = pageItems
        .filter(i => Math.abs(i.y - label.y) <= yTol && i.x > label.x)
        .sort((a, b) => a.x - b.x)[0];
      if (valItem) {
        const val = stripColon(valItem.str);
        if (val) { result[h.key] = val; found++; }
      }
    }
    if (found >= 2) break;
  }
  return result;
}

interface FieldRowPattern { patterns: RegExp[]; name: string; }
interface FieldRange { name: string; yLow: number; yHigh: number; }

const PPKEK_FIELD_ROW_PATTERNS: FieldRowPattern[] = [
  { patterns: [/^No\.?\s*:?$/i], name: 'no' },
  { patterns: [/^kode\s*hs\s*:?$/i], name: 'kodeHS' },
  { patterns: [/^uraian(\s*barang)?\s*:?$/i], name: 'uraianBarang' },
  { patterns: [/^kode\s*barang\s*:?$/i], name: 'kodeBarang' },
  { patterns: [/^jumlah\s*:?$/i], name: 'jumlah' },
  { patterns: [/^harga\s*:?$/i], name: 'harga' },
  { patterns: [/^satuan\s*:?$/i], name: 'satuan' },
  { patterns: [/^amount\s*:?$/i], name: 'amount' },
  { patterns: [/^nilai\s*pabean\s*:?$/i], name: 'nilaiPabean' },
  { patterns: [/^negara\s*:?$/i], name: 'negara' },
  { patterns: [/^kategori(\s*barang)?\s*:?$/i], name: 'kategoriBarang' },
  { patterns: [/^kondisi(\s*barang)?\s*:?$/i], name: 'kondisiBarang' },
  { patterns: [/^jenis\s*bayar\s*:?$/i, /^ref\s*dok\s*:?$/i], name: '_bound' },
];

const TABLE_FIELDS: (keyof ParsedItem)[] = [
  'no', 'kodeHS', 'uraianBarang', 'kodeBarang',
  'jumlah', 'harga', 'satuan', 'amount', 'nilaiPabean', 'negara',
  'kategoriBarang', 'kondisiBarang',
];

function matchFieldLabelPPKEK(str: string): string | null {
  for (const e of PPKEK_FIELD_ROW_PATTERNS) {
    if (e.patterns.some(p => p.test(str))) return e.name;
  }
  return null;
}

function extractItemsFromPagePPKEK(pageItems: PdfTextItem[]): ParsedItem[] {
  const noLabel = pageItems.find(i => /^No\.?$/i.test(i.str));
  if (!noLabel) return [];
  const labelX = noLabel.x;
  const noY = noLabel.y;
  const xTol = 8;
  const yTol = 5;

  const colCells = pageItems
    .filter(i => Math.abs(i.y - noY) <= yTol && i.x > labelX + 5 && /^\d{1,4}$/.test(i.str))
    .sort((a, b) => a.x - b.x);
  if (!colCells.length) return [];

  const colXs = colCells.map(i => i.x);
  const minSp = colXs.length > 1 ? Math.min(...colXs.slice(1).map((x, i) => x - colXs[i])) : 20;
  const colXTol = Math.max(5, minSp / 2 - 1);

  const fieldYMap = new Map<string, number>();
  for (const item of pageItems) {
    if (Math.abs(item.x - labelX) <= xTol) {
      const name = matchFieldLabelPPKEK(item.str);
      if (name && !fieldYMap.has(name)) fieldYMap.set(name, item.y);
    }
  }
  if (fieldYMap.size < 3) return [];

  const fList = [...fieldYMap.entries()].sort((a, b) => a[1] - b[1]);
  const ranges: FieldRange[] = fList.map(([name, y], i) => ({
    name,
    yLow: i === 0 ? -Infinity : (fList[i - 1][1] + y) / 2,
    yHigh: i === fList.length - 1 ? Infinity : (y + fList[i + 1][1]) / 2,
  }));

  const rows: ParsedItem[] = [];
  for (let ci = 0; ci < colXs.length; ci++) {
    const colX = colXs[ci];
    const row: Record<string, string> = Object.fromEntries(TABLE_FIELDS.map(f => [f, '']));
    const colItems = pageItems
      .filter(i => i.x > labelX + 5 && Math.abs(i.x - colX) <= colXTol)
      .sort((a, b) => a.y - b.y);
    for (const di of colItems) {
      const r = ranges.find(r => di.y >= r.yLow && di.y < r.yHigh);
      if (!r || !(r.name in row)) continue;
      row[r.name] = row[r.name] ? joinParts(row[r.name], di.str) : di.str;
    }
    TABLE_FIELDS.forEach(f => { row[f] = stripColon(clean(row[f])); });
    row.no = String(ci + 1);
    rows.push(row as unknown as ParsedItem);
  }
  return rows;
}

function extractKategoriPPKEK(pageItems: PdfTextItem[]): string {
  const label = pageItems.find(i => /Kategori\s*Barang/i.test(i.str));
  if (!label) {
    // Ultimate fallback: scan page 1 for common keywords
    const commonKats = ['MESIN/PERALATAN', 'BAHAN BAKU', 'HASIL PRODUKSI', 'BARANG MODAL', 'SISA DAN SCRAP', 'BARANG CONTOH', 'SISA PACKAGING'];
    for (const item of pageItems) {
      const upper = item.str.toUpperCase();
      const found = commonKats.find(k => upper.includes(k));
      if (found) {
        return found === 'MESIN' ? 'Mesin/Peralatan' : found;
      }
    }
    return '';
  }

  // Find items on the same Y line to the right
  const rightItems = pageItems
    .filter(i => Math.abs(i.y - label.y) <= 8 && i.x > label.x + 5)
    .sort((a, b) => a.x - b.x);

  for (const ri of rightItems) {
    let val = stripColon(ri.str).trim();
    if (val && val !== ':') {
      if (val.includes(' ')) {
        const firstWord = val.split(/\s+/)[0];
        if (firstWord.includes('/') || firstWord.length > 3) {
          val = firstWord;
        }
      }
      return val;
    }
  }

  // Fallback: look slightly below the label
  const belowItems = pageItems
    .filter(i => i.y < label.y && i.y > label.y - 20 && i.x > label.x - 50)
    .sort((a, b) => b.y - a.y);
  for (const bi of belowItems) {
    let val = stripColon(bi.str).trim();
    if (val && val !== ':') {
      if (val.includes(' ')) {
        const firstWord = val.split(/\s+/)[0];
        if (firstWord.includes('/') || firstWord.length > 3) {
          val = firstWord;
        }
      }
      return val;
    }
  }

  return '';
}

function parsePPKEK(pages: PdfTextItem[][]): { header: ParsedHeader; items: ParsedItem[] } {
  const header = extractHeaderPPKEK(pages);
  const allRows: ParsedItem[] = [];
  for (const pageItems of pages) {
    if (!pageItems.some(i => /LAMPIRAN.*DATA.*BARANG/i.test(i.str))) continue;
    allRows.push(...extractItemsFromPagePPKEK(pageItems));
  }

  // Extract Kategori Barang from page 1
  const docKategori = extractKategoriPPKEK(pages[0] || []);

  allRows.forEach((r, i) => {
    r.no = String(i + 1);
    if (docKategori && !r.kategoriBarang) {
      r.kategoriBarang = docKategori;
    }
  });
  return { header, items: allRows };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BC-2.3 Parser
// ═══════════════════════════════════════════════════════════════════════════════

function extractHeaderBC23(pages: PdfTextItem[][]): ParsedHeader {
  const result: ParsedHeader = { nomorPengajuan: '', tanggalPengajuan: '', nomorPendaftaran: '', tanggalPendaftaran: '', penerimaBarang: '', jenisTransaksi: '' };
  const yTol = 5;

  for (const pageItems of pages) {
    // Nomor Pengajuan — look for "Nomor Pengajuan" label
    const pengajuanLabel = pageItems.find(i => /Nomor\s*Pengajuan/i.test(i.str));
    if (pengajuanLabel && !result.nomorPengajuan) {
      const val = pageItems
        .filter(i => Math.abs(i.y - pengajuanLabel.y) <= yTol && i.x > pengajuanLabel.x)
        .sort((a, b) => a.x - b.x)[0];
      if (val) result.nomorPengajuan = stripColon(val.str);
    }

    // No. dan Tgl. Pendaftaran — BC-2.3 specific
    const pendaftaranLabel = pageItems.find(i =>
      /No\.\s*dan\s*Tgl\.\s*Pendaftaran/i.test(i.str) ||
      /Nomor\s*Pendaftaran/i.test(i.str)
    );
    if (pendaftaranLabel && !result.nomorPendaftaran) {
      // Values are to the right, separated by colon
      const rightItems = pageItems
        .filter(i => Math.abs(i.y - pendaftaranLabel.y) <= yTol && i.x > pendaftaranLabel.x)
        .sort((a, b) => a.x - b.x);

      for (const ri of rightItems) {
        const v = stripColon(ri.str);
        if (!v || v === ':') continue;
        // Check if it looks like a number (registration no)
        if (/^\d{4,}$/.test(v) && !result.nomorPendaftaran) {
          result.nomorPendaftaran = v;
        }
        // Check if it looks like a date
        else if (/\d{2}-\d{2}-\d{4}/.test(v) && !result.tanggalPendaftaran) {
          result.tanggalPendaftaran = v;
        }
      }
    }

    if (result.nomorPendaftaran && result.tanggalPendaftaran) break;
  }
  return result;
}

function extractItemsBC23(pages: PdfTextItem[][]): ParsedItem[] {
  const allRows: ParsedItem[] = [];
  let itemNo = 0;

  let foundItemSection = false;
  for (const pageItems of pages) {
    // BC-2.3 items appear on "LEMBAR LANJUTAN" pages or pages with item-like data
    const isItemPage = pageItems.some(i =>
      /LEMBAR\s*LANJUTAN/i.test(i.str) || /Pos\s*Tarif/i.test(i.str) ||
      /Kode\s*Br[g]?\s*:/i.test(i.str)
    );
    
    console.log('── [BC23] Page scan:', {
      hasLembarLanjutan: pageItems.some(i => /LEMBAR\s*LANJUTAN/i.test(i.str)),
      hasPosTarif: pageItems.some(i => /Pos\s*Tarif/i.test(i.str) || /^HS\s*:/i.test(i.str)),
      hasKodeBrg: pageItems.some(i => /Kode\s*(Br[g]?|Barang)\s*:/i.test(i.str)),
      isItemPage,
      totalItems: pageItems.length,
      sampleTexts: pageItems.slice(0, 30).map(i => `[${Math.round(i.x)},${Math.round(i.y)}] ${i.str}`),
    });

    if (isItemPage) foundItemSection = true;
    if (!foundItemSection) continue;

    // Find item blocks: look for "Pos Tarif" patterns and numbered items
    // BC-2.3 format has items in a vertical layout per page
    // Each item block has: Pos Tarif, Uraian, Kode Brg, Jumlah, Satuan, Negara

    // Strategy: find all "Pos Tarif/HS" labels — each marks an item
    const posTarifItems = pageItems.filter(i => /Pos\s*Tarif/i.test(i.str) || /^HS\s*:/i.test(i.str));

    if (posTarifItems.length === 0) {
      // Try alternative: look for numbered items like "1", "2" etc. at left margin
      // Find items by "Kode Brg" labels
      const kodeBrgLabels = pageItems.filter(i => /Kode\s*(Br[g]?|Barang)\s*:/i.test(i.str));

      for (const kodeLabel of kodeBrgLabels) {
        itemNo++;
        const row: ParsedItem = { no: String(itemNo), kodeHS: '', uraianBarang: '', kodeBarang: '', jumlah: '', harga: '', satuan: '', amount: '', nilaiPabean: '', negara: '', kategoriBarang: '', kondisiBarang: '' };

        // Kode Barang — value after "Kode Brg :"
        row.kodeBarang = getRightValue(kodeLabel, pageItems);

        // Look nearby (within y range of ~30) for other fields
        const yMin = kodeLabel.y - 40;
        const yMax = kodeLabel.y + 40;
        const nearby = pageItems.filter(i => i.y >= yMin && i.y <= yMax);

        for (const item of nearby) {
          if (/Pos\s*Tarif/i.test(item.str) || /^HS\s*:/i.test(item.str)) {
            row.kodeHS = getRightValue(item, pageItems);
          }
          if (/^Jumlah$/i.test(item.str.trim()) || /Jumlah\s*:/i.test(item.str)) {
            row.jumlah = getRightValue(item, pageItems);
          }
          if (/Jenis\s*Satuan/i.test(item.str) || /^Satuan$/i.test(item.str.trim())) {
            row.satuan = getRightValue(item, pageItems);
          }
          if (/Negara\s*Asal/i.test(item.str)) {
            row.negara = getRightValue(item, pageItems);
          }
          if (/Uraian/i.test(item.str)) {
            row.uraianBarang = getRightValue(item, pageItems);
          }
          // Kategori Barang
          if (/Kategori(\s*Barang)?\s*:/i.test(item.str) || /^Kategori(\s*Barang)?$/i.test(item.str.trim())) {
            if (item.str.includes(':')) {
              const parts = item.str.split(':');
              if (parts.length > 1 && parts[1].trim()) row.kategoriBarang = parts[1].trim();
            }
            if (!row.kategoriBarang) {
              row.kategoriBarang = getRightValue(item, pageItems);
            }
          }
          // Kondisi Barang
          if (/Kondisi(\s*Barang)?\s*:/i.test(item.str) || /^Kondisi(\s*Barang)?$/i.test(item.str.trim())) {
            if (item.str.includes(':')) {
              const parts = item.str.split(':');
              if (parts.length > 1 && parts[1].trim()) row.kondisiBarang = parts[1].trim();
            }
            if (!row.kondisiBarang) {
              row.kondisiBarang = getRightValue(item, pageItems);
            }
          }
          // Fallback: common Kategori/Kondisi keywords
          const upperStr23 = item.str.trim().toUpperCase();
          const commonKat23 = ['HASIL PRODUKSI', 'BAHAN BAKU', 'MESIN', 'BARANG MODAL', 'SISA DAN SCRAP', 'BARANG CONTOH', 'SISA PACKAGING'];
          if (!row.kategoriBarang) { const m = commonKat23.find(k => upperStr23 === k || upperStr23.includes(k)); if (m) row.kategoriBarang = m; }
          const commonKon23 = ['BARU', 'TIDAK RUSAK', 'RUSAK', 'BAIK', 'BEKAS'];
          if (!row.kondisiBarang) { const m = commonKon23.find(k => upperStr23 === k || upperStr23.includes(k)); if (m) row.kondisiBarang = m; }
        }

        if (row.kodeBarang || row.uraianBarang || row.kodeHS) allRows.push(row);
      }
      continue;
    }

    // Standard parsing for pages with Pos Tarif structure
    for (const ptItem of posTarifItems) {
      itemNo++;
      const row: ParsedItem = { no: String(itemNo), kodeHS: '', uraianBarang: '', kodeBarang: '', jumlah: '', harga: '', satuan: '', amount: '', nilaiPabean: '', negara: '', kategoriBarang: '', kondisiBarang: '' };

      // Get HS code value next to Pos Tarif label
      row.kodeHS = getRightValue(ptItem, pageItems);

      // Look within a block below for other fields
      const yMin = ptItem.y - 60;
      const yMax = ptItem.y + 5;
      const blockItems = pageItems.filter(i => i.y >= yMin && i.y <= yMax);

      for (const item of blockItems) {
        if (/Kode\s*(Br[g]?|Barang)\s*:/i.test(item.str)) {
          row.kodeBarang = getRightValue(item, pageItems);
        }
        if (/Jumlah/i.test(item.str) && !/Jumlah.*Jenis/i.test(item.str)) {
          row.jumlah = getRightValue(item, pageItems);
        }
        if (/Jenis\s*Satuan/i.test(item.str)) {
          row.satuan = getRightValue(item, pageItems);
        }
        if (/Negara\s*Asal/i.test(item.str)) {
          row.negara = getRightValue(item, pageItems);
        }
        // Uraian barang is usually the main description text
        if (/Uraian/i.test(item.str) && /barang/i.test(item.str)) {
          row.uraianBarang = getRightValue(item, pageItems);
        }
        // Kategori Barang
        if (/Kategori(\s*Barang)?\s*:/i.test(item.str) || /^Kategori(\s*Barang)?$/i.test(item.str.trim())) {
          if (item.str.includes(':')) {
            const parts = item.str.split(':');
            if (parts.length > 1 && parts[1].trim()) row.kategoriBarang = parts[1].trim();
          }
          if (!row.kategoriBarang) {
            row.kategoriBarang = getRightValue(item, pageItems);
          }
        }
        // Kondisi Barang
        if (/Kondisi(\s*Barang)?\s*:/i.test(item.str) || /^Kondisi(\s*Barang)?$/i.test(item.str.trim())) {
          if (item.str.includes(':')) {
            const parts = item.str.split(':');
            if (parts.length > 1 && parts[1].trim()) row.kondisiBarang = parts[1].trim();
          }
          if (!row.kondisiBarang) {
            row.kondisiBarang = getRightValue(item, pageItems);
          }
        }
        // Fallback: common keywords
        const upperStr23b = item.str.trim().toUpperCase();
        const kat23b = ['HASIL PRODUKSI', 'BAHAN BAKU', 'MESIN', 'BARANG MODAL', 'SISA DAN SCRAP', 'BARANG CONTOH', 'SISA PACKAGING'];
        if (!row.kategoriBarang) { const m = kat23b.find(k => upperStr23b === k || upperStr23b.includes(k)); if (m) row.kategoriBarang = m; }
        const kon23b = ['BARU', 'TIDAK RUSAK', 'RUSAK', 'BAIK', 'BEKAS'];
        if (!row.kondisiBarang) { const m = kon23b.find(k => upperStr23b === k || upperStr23b.includes(k)); if (m) row.kondisiBarang = m; }
      }

      if (row.kodeBarang || row.uraianBarang || row.kodeHS) allRows.push(row);
    }
  }

  allRows.forEach((r, i) => { r.no = String(i + 1); });
  return allRows;
}

function parseBC23(pages: PdfTextItem[][]): { header: ParsedHeader; items: ParsedItem[] } {
  return { header: extractHeaderBC23(pages), items: extractItemsBC23(pages) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BC-4.0 Parser
// ═══════════════════════════════════════════════════════════════════════════════

function extractHeaderBC40(pages: PdfTextItem[][]): ParsedHeader {
  const result: ParsedHeader = { nomorPengajuan: '', tanggalPengajuan: '', nomorPendaftaran: '', tanggalPendaftaran: '', penerimaBarang: '', jenisTransaksi: '' };
  const yTol = 5;

  for (const pageItems of pages) {
    // Nomor Pengajuan
    const pengajuanLabel = pageItems.find(i => /Nomor\s*Pengajuan/i.test(i.str));
    if (pengajuanLabel && !result.nomorPengajuan) {
      const val = pageItems
        .filter(i => Math.abs(i.y - pengajuanLabel.y) <= yTol && i.x > pengajuanLabel.x)
        .sort((a, b) => a.x - b.x)[0];
      if (val) result.nomorPengajuan = stripColon(val.str);
    }

    // Nomor Pendaftaran — in BC-4.0 Section F "KOLOM KHUSUS"
    const pendaftaranLabel = pageItems.find(i => /Nomor\s*Pendaftaran/i.test(i.str));
    if (pendaftaranLabel && !result.nomorPendaftaran) {
      const rightItems = pageItems
        .filter(i => Math.abs(i.y - pendaftaranLabel.y) <= yTol && i.x > pendaftaranLabel.x)
        .sort((a, b) => a.x - b.x);
      for (const ri of rightItems) {
        const v = stripColon(ri.str);
        if (/^\d{4,}$/.test(v)) { result.nomorPendaftaran = v; break; }
      }
    }

    // Tanggal — on the line below Nomor Pendaftaran or same section
    const tanggalLabel = pageItems.find(i =>
      /^Tanggal$/i.test(i.str.trim()) && i.y < (pendaftaranLabel?.y || 999)
    );
    if (tanggalLabel && !result.tanggalPendaftaran) {
      const rightItems = pageItems
        .filter(i => Math.abs(i.y - tanggalLabel.y) <= yTol && i.x > tanggalLabel.x)
        .sort((a, b) => a.x - b.x);
      for (const ri of rightItems) {
        const v = stripColon(ri.str);
        if (/\d{2}-\d{2}-\d{4}/.test(v)) { result.tanggalPendaftaran = v; break; }
      }
    }

    // Also try to find date near pendaftaran
    if (!result.tanggalPendaftaran && pendaftaranLabel) {
      const nearbyDates = pageItems
        .filter(i => Math.abs(i.y - pendaftaranLabel.y) <= 20 && /\d{2}-\d{2}-\d{4}/.test(i.str))
        .sort((a, b) => a.x - b.x);
      if (nearbyDates.length) result.tanggalPendaftaran = nearbyDates[0].str.match(/\d{2}-\d{2}-\d{4}/)?.[0] || '';
    }

    if (result.nomorPendaftaran) break;
  }
  return result;
}

function extractItemsBC40(pages: PdfTextItem[][]): ParsedItem[] {
  const allRows: ParsedItem[] = [];
  let itemNo = 0;

  let foundDataBarang = false;
  for (const pageItems of pages) {
    // BC-4.0 has "DATA BARANG" section
    if (pageItems.some(i => /DATA\s*BARANG/i.test(i.str))) foundDataBarang = true;
    
    console.log('── [BC40] Page scan:', {
      hasDataBarang: pageItems.some(i => /DATA\s*BARANG/i.test(i.str)),
      hasKodeBarang: pageItems.some(i => /Kode\s*Barang/i.test(i.str)),
      hasPosTarif: pageItems.some(i => /Pos\s*Tarif/i.test(i.str)),
      foundDataBarang,
      totalItems: pageItems.length,
      sampleTexts: pageItems.slice(0, 30).map(i => `[${Math.round(i.x)},${Math.round(i.y)}] ${i.str}`),
    });

    if (!foundDataBarang) continue;

    // Skip footer/signature pages that have no actual items
    const hasItems = pageItems.some(i =>
      /Kode\s*Barang/i.test(i.str) || /Pos\s*Tarif/i.test(i.str)
    );
    if (!hasItems) continue;

    // Find items by "Kode Barang" label pattern
    // In BC-4.0, the table structure is: No | Uraian (with Kode Barang inside) | Jumlah & Satuan | Harga
    const kodeBrgItems = pageItems.filter(i => /Kode\s*Barang\s*:/i.test(i.str) || /Kode\s*Barang\s*$/i.test(i.str));

    // Also try to find numbered items (1, 2, 3...) in column 22
    const numberedItems = pageItems.filter(i =>
      /^\d{1,3}$/.test(i.str) && i.x < 100 // leftmost column
    ).sort((a, b) => b.y - a.y); // top to bottom (y decreases going down in PDF)

    if (kodeBrgItems.length > 0) {
      for (const kodeLabel of kodeBrgItems) {
        itemNo++;
        const row: ParsedItem = { no: String(itemNo), kodeHS: '', uraianBarang: '', kodeBarang: '', jumlah: '', harga: '', satuan: '', amount: '', nilaiPabean: '', negara: '', kategoriBarang: '', kondisiBarang: '' };

        // Kode Barang value — right of label on same line
        row.kodeBarang = getRightValue(kodeLabel, pageItems, 3);

        // Search nearby for other data
        const yMin = kodeLabel.y - 40;
        const yMax = kodeLabel.y + 20;
        const nearby = pageItems.filter(i => i.y >= yMin && i.y <= yMax);

        for (const item of nearby) {
          // Pos Tarif / HS code
          if (/Pos\s*Tarif/i.test(item.str)) {
            row.kodeHS = getRightValue(item, pageItems, 3);
          }
          // Uraian / description — look for text that's description-like on lines near kode
          if (/Merk|Tipe|Ukuran|Spesifikasi/i.test(item.str)) {
            const descLine = pageItems
              .filter(i => Math.abs(i.y - item.y) <= 3)
              .sort((a, b) => a.x - b.x)
              .map(i => i.str).join(' ');
            if (descLine && !row.uraianBarang) {
              const match = descLine.match(/[A-Z][A-Z\s\-\d]+/);
              if (match) row.uraianBarang = clean(match[0]);
            }
          }
          // Kategori Barang
          if (/Kategori(\s*Barang)?\s*:/i.test(item.str) || /^Kategori(\s*Barang)?$/i.test(item.str.trim())) {
            if (item.str.includes(':')) {
              const parts = item.str.split(':');
              if (parts.length > 1 && parts[1].trim()) row.kategoriBarang = parts[1].trim();
            }
            if (!row.kategoriBarang) {
              row.kategoriBarang = getRightValue(item, pageItems, 3);
            }
          }
          // Kondisi Barang
          if (/Kondisi(\s*Barang)?\s*:/i.test(item.str) || /^Kondisi(\s*Barang)?$/i.test(item.str.trim())) {
            if (item.str.includes(':')) {
              const parts = item.str.split(':');
              if (parts.length > 1 && parts[1].trim()) row.kondisiBarang = parts[1].trim();
            }
            if (!row.kondisiBarang) {
              row.kondisiBarang = getRightValue(item, pageItems, 3);
            }
          }
          // Fallback: common keywords
          const upperStr40 = item.str.trim().toUpperCase();
          const kat40 = ['HASIL PRODUKSI', 'BAHAN BAKU', 'MESIN', 'BARANG MODAL', 'SISA DAN SCRAP', 'BARANG CONTOH', 'SISA PACKAGING'];
          if (!row.kategoriBarang) { const m = kat40.find(k => upperStr40 === k || upperStr40.includes(k)); if (m) row.kategoriBarang = m; }
          const kon40 = ['BARU', 'TIDAK RUSAK', 'RUSAK', 'BAIK', 'BEKAS'];
          if (!row.kondisiBarang) { const m = kon40.find(k => upperStr40 === k || upperStr40.includes(k)); if (m) row.kondisiBarang = m; }
        }

        // Find jumlah & satuan using BC-4.0's column structure
        // Usually numbers and units appear on the right side of the page
        const sameRowItems = pageItems
          .filter(i => Math.abs(i.y - kodeLabel.y) <= 15)
          .sort((a, b) => a.x - b.x);

        for (const sri of sameRowItems) {
          // Quantity — looks like "50.0000"
          if (/^\d+[\.,]\d{4}$/.test(sri.str) && !row.jumlah) {
            row.jumlah = sri.str;
          }
          // Unit — looks like "PCE (PIECE)" or "SET"
          if (/^(PCE|PCS|PIECE|SET|UNIT|KG|MTR|MTQ|ROLL)\b/i.test(sri.str) && !row.satuan) {
            row.satuan = sri.str;
          }
        }

        if (row.kodeBarang || row.uraianBarang) allRows.push(row);
      }
    } else if (numberedItems.length > 0) {
      // Fallback: parse by numbered rows
      for (const numItem of numberedItems) {
        itemNo++;
        const row: ParsedItem = { no: String(itemNo), kodeHS: '', uraianBarang: '', kodeBarang: '', jumlah: '', harga: '', satuan: '', amount: '', nilaiPabean: '', negara: '', kategoriBarang: '', kondisiBarang: '' };

        // Items on same row
        const sameRow = pageItems
          .filter(i => Math.abs(i.y - numItem.y) <= 8 && i.x > numItem.x + 10)
          .sort((a, b) => a.x - b.x);

        if (sameRow.length > 0) {
          row.uraianBarang = sameRow.map(i => i.str).join(' ');
        }
        if (row.uraianBarang) allRows.push(row);
      }
    }
  }

  allRows.forEach((r, i) => { r.no = String(i + 1); });
  return allRows;
}

function parseBC40(pages: PdfTextItem[][]): { header: ParsedHeader; items: ParsedItem[] } {
  return { header: extractHeaderBC40(pages), items: extractItemsBC40(pages) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BC-2.5 & BC-2.6 Parser (Smart Grid Method)
// ═══════════════════════════════════════════════════════════════════════════════

function extractHeaderBC26(pages: PdfTextItem[][]): ParsedHeader {
  const result: ParsedHeader = { nomorPengajuan: '', tanggalPengajuan: '', nomorPendaftaran: '', tanggalPendaftaran: '', penerimaBarang: '', jenisTransaksi: '' };
  const yTol = 5;

  for (const pageItems of pages) {
    // ── Nomor Pengajuan: 26 chars starting with 000
    for (const item of pageItems) {
      if (!result.nomorPengajuan && /\b000[A-Z0-9]{23}\b/i.test(item.str)) {
        result.nomorPengajuan = item.str.match(/\b000[A-Z0-9]{23}\b/i)![0];
      }
    }

    // ── Nomor Pendaftaran: find value next to "Nomor Pendaftaran" label in Section D
    // Must distinguish from Kantor Pabean code (e.g. 061000 which appears separately)
    const pendaftaranLabel = pageItems.find(i => /Nomor\s*Pendaftaran/i.test(i.str));
    if (pendaftaranLabel && !result.nomorPendaftaran) {
      // In Section D "DIISI OLEH BEA DAN CUKAI", Nomor Pendaftaran value is to the right of or near the label
      const rightOfLabel = pageItems
        .filter(i => Math.abs(i.y - pendaftaranLabel.y) <= yTol && i.x > pendaftaranLabel.x + 20)
        .sort((a, b) => a.x - b.x);

      for (const ri of rightOfLabel) {
        const v = stripColon(ri.str);
        if (v && /^\d{4,}$/.test(v)) {
          // Check this is NOT a Kantor Pabean code (which usually appears on a different Y or near "Kantor Pabean" label)
          const kantorLabel = pageItems.find(k => /Kantor\s*Pabean/i.test(k.str));
          if (kantorLabel) {
            // If this number is on the same Y as Kantor Pabean label, it's the kantor code — skip it
            if (Math.abs(ri.y - kantorLabel.y) <= yTol) continue;
          }
          result.nomorPendaftaran = v;
          break;
        }
      }

      // Fallback: if still not found, look directly below the label
      if (!result.nomorPendaftaran) {
        const belowLabel = pageItems
          .filter(i => i.y < pendaftaranLabel.y && i.y > pendaftaranLabel.y - 25 && Math.abs(i.x - pendaftaranLabel.x) <= 100)
          .sort((a, b) => b.y - a.y);
        for (const bl of belowLabel) {
          const v = stripColon(bl.str);
          if (v && /^\d{4,}$/.test(v)) {
            const kantorLabel = pageItems.find(k => /Kantor\s*Pabean/i.test(k.str));
            if (kantorLabel && Math.abs(bl.y - kantorLabel.y) <= yTol) continue;
            result.nomorPendaftaran = v;
            break;
          }
        }
      }
    }

    // ── Tanggal Pendaftaran: date near "Tanggal" label in Section D
    if (!result.tanggalPendaftaran) {
      // Find date in Section D (near Nomor Pendaftaran)
      const tanggalLabel = pageItems.find(i =>
        /^Tanggal$/i.test(i.str.trim()) && pendaftaranLabel && Math.abs(i.y - pendaftaranLabel.y) <= 25
      );
      if (tanggalLabel) {
        const rightItems = pageItems
          .filter(i => Math.abs(i.y - tanggalLabel.y) <= yTol && i.x > tanggalLabel.x)
          .sort((a, b) => a.x - b.x);
        for (const ri of rightItems) {
          const v = stripColon(ri.str);
          if (/\d{2}-\d{2}-\d{4}/.test(v)) {
            result.tanggalPendaftaran = v.match(/\d{2}-\d{2}-\d{4}/)![0];
            break;
          }
        }
      }
      // Broader fallback: first date found on page
      if (!result.tanggalPendaftaran) {
        for (const item of pageItems) {
          if (/\b\d{2}-\d{2}-\d{4}\b/.test(item.str)) {
            result.tanggalPendaftaran = item.str.match(/\b\d{2}-\d{2}-\d{4}\b/)![0];
            break;
          }
        }
      }
    }

    // ── Jenis Transaksi: look for "JENIS TRANSAKSI" label (BC 2.6.1) or "Jenis TPB" (BC 2.5)
    if (!result.jenisTransaksi) {
      // BC 2.5: check "JENIS TRANSAKSI :" first for descriptive value like NON PENYERAHAN
      const jtLabel = pageItems.find(i => /JENIS TRANSAKSI\s*:/i.test(i.str));
      if (jtLabel) {
        const rightItems = pageItems
          .filter(i => Math.abs(i.y - jtLabel.y) <= yTol && i.x > jtLabel.x + 5)
          .sort((a, b) => a.x - b.x);
        if (rightItems.length > 0) {
          const v = stripColon(rightItems[0].str);
          if (v && v !== ':') result.jenisTransaksi = v;
        }
      }

      // BC 2.6.1: "A. JENIS TRANSAKSI" with numbered value (1-5)
      if (!result.jenisTransaksi) {
        const transaksiLabel = pageItems.find(i => /JENIS\s*TRANSAKSI/i.test(i.str) && !/:\s*$/.test(i.str));
        if (transaksiLabel) {
          const rightItems = pageItems
            .filter(i => Math.abs(i.y - transaksiLabel.y) <= yTol && i.x > transaksiLabel.x + 5)
            .sort((a, b) => a.x - b.x);
          for (const ri of rightItems) {
            const v = stripColon(ri.str).replace(/[^0-9]/g, '');
            if (v && /^[1-7]$/.test(v)) {
              const labels: Record<string, string> = {
                '1': '1 - Diperbaiki', '2': '2 - Disubkontrakkan', '3': '3 - Dipinjamkan',
                '4': '4 - Barang Return', '5': '5 - Lainnya',
              };
              result.jenisTransaksi = labels[v] || v;
              break;
            }
          }
        }
      }

      // BC 2.6.2: "A. TUJUAN PEMASUKAN" with numbered value (1-4)
      if (!result.jenisTransaksi) {
        const tujuanLabel = pageItems.find(i => /TUJUAN\s*PEMASUKAN/i.test(i.str));
        if (tujuanLabel) {
          const rightItems = pageItems
            .filter(i => Math.abs(i.y - tujuanLabel.y) <= yTol && i.x > tujuanLabel.x + 5)
            .sort((a, b) => a.x - b.x);
          for (const ri of rightItems) {
            const v = stripColon(ri.str).replace(/[^0-9]/g, '');
            if (v && /^[1-4]$/.test(v)) {
              const labels: Record<string, string> = {
                '1': '1 - Eks Diperbaiki', '2': '2 - Eks Disubkontrakkan',
                '3': '3 - Eks Dipinjamkan', '4': '4 - Lainnya',
              };
              result.jenisTransaksi = labels[v] || v;
              break;
            }
          }
        }
      }

      // BC 2.5: "Jenis TPB" with number (1=Kawasan Berikat, etc.) — fallback only
      if (!result.jenisTransaksi) {
        const tpbLabel = pageItems.find(i => /Jenis\s*TPB/i.test(i.str));
        if (tpbLabel) {
          const nearVal = pageItems
            .filter(i => Math.abs(i.y - tpbLabel.y) <= yTol && i.x > tpbLabel.x - 10 && /^[1-7]$/.test(i.str.trim()))
            .sort((a, b) => a.x - b.x);
          if (nearVal.length > 0) {
            const v = nearVal[0].str.trim();
            const labels: Record<string, string> = {
              '1': '1 - Kawasan Berikat', '2': '2 - Gudang Berikat', '3': '3 - TPPB',
              '4': '4 - TBB', '5': '5 - TLB', '6': '6 - KDUB', '7': '7 - Lainnya',
            };
            result.jenisTransaksi = labels[v] || v;
          }
        }
      }
    }

    // ── Penerima Barang: name of goods recipient
    if (!result.penerimaBarang) {
      // BC 2.6.1: "Penerima Barang" section with "6. Nama"
      const penerimaSection = pageItems.find(i => /^Penerima\s*Barang$/i.test(i.str.trim()));
      if (penerimaSection) {
        // Find "6. Nama" or "Nama" label below
        const namaLabel = pageItems.find(i =>
          /^(6\.\s*)?Nama$/i.test(i.str.trim()) &&
          i.y < penerimaSection.y && i.y > penerimaSection.y - 50
        );
        if (namaLabel) {
          const nameVal = pageItems
            .filter(i => Math.abs(i.y - namaLabel.y) <= yTol && i.x > namaLabel.x + 10)
            .sort((a, b) => a.x - b.x);
          for (const nv of nameVal) {
            const v = stripColon(nv.str);
            if (v && v !== ':' && !/^\d+$/.test(v) && !/NPWP|NITKU|Alamat/i.test(v)) {
              result.penerimaBarang = v;
              break;
            }
          }
        }
      }

      // BC 2.5: "PENERIMA BARANG" section with "10. Nama"
      const penerimaSection25 = pageItems.find(i => /^PENERIMA\s*BARANG$/i.test(i.str.trim()));
      if (penerimaSection25 && !result.penerimaBarang) {
        const namaLabel = pageItems.find(i =>
          /^(10\.\s*)?Nama$/i.test(i.str.trim()) &&
          i.y < penerimaSection25.y && i.y > penerimaSection25.y - 60
        );
        if (namaLabel) {
          const nameVal = pageItems
            .filter(i => Math.abs(i.y - namaLabel.y) <= yTol && i.x > namaLabel.x + 10)
            .sort((a, b) => a.x - b.x);
          for (const nv of nameVal) {
            const v = stripColon(nv.str);
            if (v && v !== ':' && !/^\d+$/.test(v) && !/NPWP|NITKU|Alamat/i.test(v)) {
              result.penerimaBarang = v;
              break;
            }
          }
        }
      }

      // BC 2.6.2: "Pengirim Barang" section with "6. Nama" (sender, not receiver)
      const pengirimSection = pageItems.find(i => /^Pengirim\s*Barang$/i.test(i.str.trim()));
      if (pengirimSection && !result.penerimaBarang) {
        const namaLabel = pageItems.find(i =>
          /^(6\.\s*)?Nama$/i.test(i.str.trim()) &&
          i.y < pengirimSection.y && i.y > pengirimSection.y - 50
        );
        if (namaLabel) {
          const nameVal = pageItems
            .filter(i => Math.abs(i.y - namaLabel.y) <= yTol && i.x > namaLabel.x + 10)
            .sort((a, b) => a.x - b.x);
          for (const nv of nameVal) {
            const v = stripColon(nv.str);
            if (v && v !== ':' && !/^\d+$/.test(v) && !/NPWP|NITKU|Alamat/i.test(v)) {
              result.penerimaBarang = v;
              break;
            }
          }
        }
      }
    }
  }

  if (!result.tanggalPengajuan) result.tanggalPengajuan = result.tanggalPendaftaran;
  return result;
}

function extractItemsBC26(pages: PdfTextItem[][]): ParsedItem[] {
  console.log(`[extractItemsBC26] Starting extraction on ${pages.length} pages`);
  const allRows: ParsedItem[] = [];
  let itemNo = 0;
  const yTol = 5;

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pageItems = pages[pageIdx];
    // Find 'Kode Barang' or 'Kode Brg', ignore table headers (column labels)
    // Table headers typically have patterns like "- Kode barang" (with dash prefix) — skip those
    const kodeBrgItems = pageItems.filter(i => {
      const s = i.str.trim();
      // Must start with "Kode Brg" or "Kode Barang", but NOT be a column header like "- Kode barang"
      if (/^-\s*Kode/i.test(s)) return false;
      // Must match actual data Kode labels
      return /^Kode\s*(Br[g]?|Barang)\s*[:]*$/i.test(s) || /^Kode\s*(Br[g]?|Barang)\s*:\s*.+/i.test(s);
    });

    if (kodeBrgItems.length > 0) {
      for (const kodeLabel of kodeBrgItems) {
        itemNo++;
        const row: ParsedItem = { no: String(itemNo), kodeHS: '', uraianBarang: '', kodeBarang: '', jumlah: '', harga: '', satuan: '', amount: '', nilaiPabean: '', negara: '', kategoriBarang: '', kondisiBarang: '' };

        // 1. Kode Barang — value inline or to the right
        if (kodeLabel.str.includes(':')) {
          const kbParts = kodeLabel.str.split(':');
          if (kbParts.length > 1 && kbParts[1].trim()) row.kodeBarang = kbParts[1].trim();
        }
        
        if (!row.kodeBarang) {
          const rightItems = pageItems.filter(i => Math.abs(i.y - kodeLabel.y) <= 10 && i.x > kodeLabel.x + 2).sort((a, b) => a.x - b.x);
          if (rightItems.length > 0) {
             let val = stripColon(rightItems[0].str);
             if (!val && rightItems.length > 1) val = stripColon(rightItems[1].str);
             row.kodeBarang = val;
          }
          // Vertical fallback (e.g. value directly above "Kode Brg" in Lampiran tables)
          if (!row.kodeBarang) {
             const vertItems = pageItems.filter(i => 
               Math.abs(i.x - kodeLabel.x) <= 20 && i.y > kodeLabel.y && i.y <= kodeLabel.y + 25 && i !== kodeLabel
             ).sort((a, b) => a.y - b.y); // closest above first
             
             for (const vi of vertItems) {
               const v = stripColon(vi.str);
               if (v && v !== ':' && !/Kode/i.test(v)) {
                 row.kodeBarang = v;
                 break;
               }
             }
          }
        }

        // 2. HS, Uraian, Kategori, Kondisi Search in nearby area
        const yMin = kodeLabel.y - 50;
        const yMax = kodeLabel.y + 35;
        const nearby = pageItems.filter(i => i.y >= yMin && i.y <= yMax);

        for (const item of nearby) {
          // HS Code
          if (/^HS/i.test(item.str) || /Pos\s*Tarif/i.test(item.str)) {
            if (item.str.includes(':')) {
               const p = item.str.split(/:|Tarif/);
               if (p.length > 1 && p[p.length - 1].trim()) row.kodeHS = p[p.length - 1].trim();
            }
            if (!row.kodeHS) {
              const rightItems = pageItems.filter(i => Math.abs(i.y - item.y) <= 10 && i.x > item.x + 2).sort((a, b) => a.x - b.x);
              if (rightItems.length > 0) {
                 let val = stripColon(rightItems[0].str);
                 // Validate HS is numeric (6-10 digits)
                 if (val && /^\d{6,10}$/.test(val)) {
                   row.kodeHS = val;
                 } else if (!val && rightItems.length > 1) {
                   val = stripColon(rightItems[1].str);
                   if (val && /^\d{6,10}$/.test(val)) row.kodeHS = val;
                 }
              }
              // Vertical fallback for HS
              if (!row.kodeHS) {
                 const vertItems = pageItems.filter(i => 
                   Math.abs(i.x - item.x) <= 20 && Math.abs(i.y - item.y) <= 25 && i !== item
                 ).sort((a, b) => Math.abs(a.y - item.y) - Math.abs(b.y - item.y));
                 for (const vi of vertItems) {
                   const v = stripColon(vi.str).replace(/\D/g, ''); // Extract numbers
                   if (v.length >= 6 && v.length <= 10) {
                     row.kodeHS = v;
                     break;
                   }
                 }
              }
            }
          }

          // Uraian (description) — label "Uraian" or "Uraian:"
          if (/^Uraian/i.test(item.str) && !/Uraian.*Secara/i.test(item.str)) {
            if (item.str.includes(':')) {
               const p = item.str.split(':');
               if (p.length > 1 && p[1].trim()) row.uraianBarang = p.slice(1).join(':').trim();
            }
            if (!row.uraianBarang) {
              const rightItems = pageItems.filter(i => Math.abs(i.y - item.y) <= 10 && i.x > item.x + 2).sort((a, b) => a.x - b.x);
              if (rightItems.length > 0) {
                 let val = stripColon(rightItems[0].str);
                 if (!val && rightItems.length > 1) val = stripColon(rightItems[1].str);
                 row.uraianBarang = val;
              }
            }
          }

          // Negara (country, often printed without explicit label)
          const commonCountries = ['INDONESIA', 'CHINA', 'TAIWAN', 'VIETNAM', 'THAILAND', 'JAPAN', 'KOREA', 'SOUTH KOREA', 'HONG KONG', 'MALAYSIA', 'SINGAPORE', 'INDIA', 'BANGLADESH', 'USA', 'UNITED STATES', 'PHILIPPINES', 'CAMBODIA', 'MYANMAR'];
          if (!row.negara && commonCountries.includes(item.str.trim().toUpperCase())) {
             row.negara = item.str.trim().toUpperCase();
          }

          // ── NEW: Kategori Barang (e.g. "HASIL PRODUKSI")
          if (/Kategori(\s*Barang)?\s*:/i.test(item.str) || /^Kategori(\s*Barang)?$/i.test(item.str.trim()) || /Goods\s*Category/i.test(item.str)) {
            if (item.str.includes(':')) {
              const parts = item.str.split(':');
              if (parts.length > 1 && parts[1].trim()) row.kategoriBarang = parts[1].trim();
            }
            if (!row.kategoriBarang) {
              const rightItems = pageItems.filter(i => Math.abs(i.y - item.y) <= yTol && i.x > item.x + 2).sort((a, b) => a.x - b.x);
              for (const ri of rightItems) {
                const v = stripColon(ri.str);
                if (v && v !== ':') { row.kategoriBarang = v; break; }
              }
            }
          }

          // ── NEW: Kondisi Barang (e.g. "TIDAK RUSAK")
          if (/Kondisi(\s*Barang)?\s*:/i.test(item.str) || /^Kondisi(\s*Barang)?$/i.test(item.str.trim()) || /Goods\s*Condition/i.test(item.str)) {
            if (item.str.includes(':')) {
              const parts = item.str.split(':');
              if (parts.length > 1 && parts[1].trim()) row.kondisiBarang = parts[1].trim();
            }
            if (!row.kondisiBarang) {
              const rightItems = pageItems.filter(i => Math.abs(i.y - item.y) <= yTol && i.x > item.x + 2).sort((a, b) => a.x - b.x);
              for (const ri of rightItems) {
                const v = stripColon(ri.str);
                if (v && v !== ':') { row.kondisiBarang = v; break; }
              }
            }
          }

          // Fallback: If Kategori or Kondisi are printed without explicit labels (e.g. just "HASIL PRODUKSI" or "BAIK" in the text block)
          const upperStr = item.str.trim().toUpperCase();
          const commonKategori = ['HASIL PRODUKSI', 'BAHAN BAKU', 'MESIN', 'BARANG MODAL', 'SISA DAN SCRAP', 'BARANG CONTOH', 'SISA PACKAGING'];
          if (!row.kategoriBarang) {
             const matched = commonKategori.find(k => upperStr === k || upperStr.includes(k));
             if (matched) row.kategoriBarang = matched;
          }

          const commonKondisi = ['BARU', 'TIDAK RUSAK', 'RUSAK', 'BAIK', 'BEKAS'];
          if (!row.kondisiBarang) {
             const matched = commonKondisi.find(k => upperStr === k || upperStr.includes(k));
             if (matched) row.kondisiBarang = matched;
          }
        }

        // 3. Quantities & Satuan — improved: distinguish Jumlah from Berat Bersih
        // "Berat Bersih" label marks weight, NOT quantity. We need "Sat.:" or "Satuan" for quantity.
        const beratBersihLabels = nearby.filter(i => /Berat\s*Bersih/i.test(i.str));
        const satuanLabels = nearby.filter(i => /^Sat\.|^Satuan/i.test(i.str.trim()));
        const rightSideItems = nearby.filter(i => i.x > kodeLabel.x + 50).sort((a, b) => a.x - b.x);

        // First, find Satuan (unit) — this is key to knowing the correct Jumlah
        for (const sri of rightSideItems) {
          // Unit codes like PCE (PIECE), KG, ROLL, YRD, CONE, CARTON, CT
          if (/^\(?(PCE|PCS|PIECE|SET|UNIT|KG|KGM|MTR|MTQ|ROLL|RO|YRD|CONE|CARTON|CT)\b/i.test(sri.str.trim()) && !row.satuan) {
             const satuanFull = sri.str.trim();
             row.satuan = satuanFull;
             
             // Extract conversion inside parenthesis (e.g., "YARD (0.9144 M)" -> "0.9144")
             const match = satuanFull.match(/\(([\d\.]+)\s*[A-Za-z]+\)/);
             if (match) {
                 row.harga = match[1];
             }
          }
        }

        // Now find Jumlah — the number on the SAME line as "Sat.:" or near the Satuan value, NOT near "Berat Bersih"
        for (const sri of rightSideItems) {
          if (/^\d{1,10}[\.,]\d{4}$/.test(sri.str) && !row.jumlah) {
            // Check if this number is near "Berat Bersih" label — if so, skip it
            const isBeratBersih = beratBersihLabels.some(bb => Math.abs(sri.y - bb.y) <= 8);
            if (isBeratBersih) continue;
            row.jumlah = sri.str;
          }
        }

        // Fallback: if no jumlah found, try number near "Sat.:" label
        if (!row.jumlah && satuanLabels.length > 0) {
          for (const satLabel of satuanLabels) {
            const numNearSat = nearby
              .filter(i => Math.abs(i.y - satLabel.y) <= 15 && /^\d{1,10}[\.,]\d{4}$/.test(i.str))
              .sort((a, b) => a.x - b.x);
            if (numNearSat.length > 0) {
              row.jumlah = numNearSat[0].str;
              break;
            }
          }
        }

        // Nilai Pabean / CIF — numbers with 2 decimals
        for (const sri of rightSideItems) {
          if (/^\d{1,10}[\.,]\d{2}$/.test(sri.str) && !row.nilaiPabean) {
             row.nilaiPabean = sri.str;
          }
        }
        
        // ── BC 2.5 special: Uraian might not have a label, it's the description text just below Kode Brg
        if (!row.uraianBarang) {
          // In BC 2.5, goods description is directly below or near the Kode Brg line
          // E.g. "UNIFORM WORKER," or "100% POLYESTER KNITTING," etc.
          const descCandidates = pageItems.filter(i =>
            i.y < kodeLabel.y && i.y > kodeLabel.y - 25 &&
            Math.abs(i.x - kodeLabel.x) <= 20 &&
            !/^(Merk|Tipe|Ukuran|Lain|Pos\s*Tarif|Kode|Dokumen|Seri|HS|Kategori|Kondisi)/i.test(i.str.trim()) &&
            !/^\d+[\.,]\d+$/.test(i.str.trim()) && // not a number
            !/^[-:,]$/.test(i.str.trim()) && // not punctuation only
            i.str.trim().length > 2
          ).sort((a, b) => b.y - a.y); // closest to kodeLabel first

          if (descCandidates.length > 0) {
            // Join multi-line descriptions
            const descParts = descCandidates.map(i => i.str.trim()).filter(s => s.length > 1);
            if (descParts.length > 0) {
              row.uraianBarang = descParts.join(' ');
            }
          }
        }

        // Extended Uraian: If it spans multiple lines, capture continuation
        if (row.uraianBarang) {
           const uraianItem = nearby.find(i => /^Uraian/.test(i.str));
           if (uraianItem) {
              const extraDesc = nearby.filter(i => i.y > uraianItem.y && i.y < uraianItem.y + 20 && i.x < uraianItem.x + 100);
              const extraStr = extraDesc.map(i => i.str).join(' ');
              if (extraStr && !extraStr.includes('CIF') && !extraStr.includes('Satuan') && !/\d{4,}/.test(extraStr)) {
                 row.uraianBarang += ' ' + extraStr;
              }
           }
        }
        
        // Clean Uraian: Cut off before "Merk", remove trailing comma
        if (row.uraianBarang) {
           row.uraianBarang = row.uraianBarang.replace(/,\s*Merk.*/i, '').replace(/Merk.*/i, '').trim();
           if (row.uraianBarang.endsWith(',')) row.uraianBarang = row.uraianBarang.slice(0, -1);
        }

        console.log(`[extractItemsBC26] Row parsed on page ${pageIdx + 1}:`, row);
        if (row.kodeBarang || row.kodeHS || row.uraianBarang) {
           allRows.push(row);
        } else {
           console.log(`[extractItemsBC26] Row rejected (empty keys) on page ${pageIdx + 1}`);
        }
      }
    }
  }

  allRows.forEach((r, i) => { r.no = String(i + 1); });
  console.log(`[extractItemsBC26] Finished extraction. Total items: ${allRows.length}`);
  return allRows;
}

function containsNumber(str: string): boolean {
  return /\d/.test(str);
}

function parseBC26(pages: PdfTextItem[][]): { header: ParsedHeader; items: ParsedItem[] } {
  return { header: extractHeaderBC26(pages), items: extractItemsBC26(pages) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Export — auto-detect and dispatch
// ═══════════════════════════════════════════════════════════════════════════════

export async function parsePPKEKPDF(file: File): Promise<ParsedData> {
  try {
    const pages = await extractAllPages(file);
    const format = detectFormat(pages);

    let header: ParsedHeader;
    let items: ParsedItem[];

    switch (format) {
      case 'bc23': {
        const r = parseBC23(pages);
        header = r.header; items = r.items;
        break;
      }
      case 'bc40': {
        const r = parseBC40(pages);
        header = r.header; items = r.items;
        break;
      }
      case 'bc25':
      case 'bc261':
      case 'bc262':
      case 'bc27':
      case 'bc30':
      case 'bc41': {
        const r = parseBC26(pages);
        header = r.header; items = r.items;
        break;
      }
      case 'ppkek':
      default: {
        const r = parsePPKEK(pages);
        header = r.header; items = r.items;
        break;
      }
    }

    // Carry over Kategori & Kondisi from previous rows if missing
    let lastKategori = '';
    let lastKondisi = '';
    for (const row of items) {
      if (row.kategoriBarang) lastKategori = row.kategoriBarang;
      else if (lastKategori) row.kategoriBarang = lastKategori;

      if (row.kondisiBarang) lastKondisi = row.kondisiBarang;
      else if (lastKondisi) row.kondisiBarang = lastKondisi;
    }

    // Debug info
    const lampiranPage = pages.find(p => p.some(i =>
      /LAMPIRAN.*DATA.*BARANG/i.test(i.str) || /DATA\s*BARANG/i.test(i.str) || /LEMBAR\s*LANJUTAN/i.test(i.str)
    )) || pages[0] || [];

    return {
      success: true,
      fileName: file.name,
      parsedAt: new Date().toISOString(),
      header,
      items,
      _debug: {
        totalPages: pages.length,
        totalItems: pages.reduce((s, p) => s + p.length, 0),
        totalLines: pages.reduce((s, p) => s + p.length, 0),
        yTolerance: 5,
        colRanges: [{ name: 'format', x: 0, xEnd: format }],
        rawLines: lampiranPage.slice(0, 80).map(i => ({
          y: Math.round(i.y),
          page: i.page,
          text: i.str,
        })),
      },
    } as ParsedDataSuccess;
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[PDF Parser]', error);
    return { success: false, error: error.message, stack: error.stack };
  }
}
