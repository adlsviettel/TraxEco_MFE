import type { LucideIcon } from 'lucide-react';

// ─── User & Auth ─────────────────────────────────────────────────────────────
export interface User {
  username: string;
  password?: string;
  role: string;
}

// ─── Language ────────────────────────────────────────────────────────────────
export interface Language {
  code: string;
  label: string;
  flag: string;
}

// ─── Navigation ──────────────────────────────────────────────────────────────
export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
  pageCode?: string;
  subItems?: { to: string; label: string; pageCode?: string }[];
}

// ─── PDF Parser ──────────────────────────────────────────────────────────────
export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  page: number;
}

export interface ParsedHeader {
  nomorPengajuan: string;
  tanggalPengajuan: string;
  nomorPendaftaran: string;
  tanggalPendaftaran: string;
  penerimaBarang: string;
  jenisTransaksi: string;
}

export interface ParsedItem {
  no: string;
  kodeHS: string;
  uraianBarang: string;
  kodeBarang: string;
  jumlah: string;
  harga: string;
  satuan: string;
  amount: string;
  nilaiPabean: string;
  negara: string;
  kategoriBarang: string;
  kondisiBarang: string;
}

export interface ColRange {
  name: string;
  x: number;
  xEnd: number | string;
}

export interface RawLine {
  y: number;
  page: number;
  text: string;
}

export interface DebugInfo {
  totalPages: number;
  totalItems: number;
  totalLines: number;
  yTolerance: number;
  colRanges: ColRange[];
  rawLines: RawLine[];
}

export interface ParsedDataSuccess {
  success: true;
  fileName: string;
  parsedAt: string;
  header: ParsedHeader;
  items: ParsedItem[];
  _debug: DebugInfo;
}

export interface ParsedDataError {
  success: false;
  error: string;
  stack?: string;
}

export type ParsedData = ParsedDataSuccess | ParsedDataError;

// ─── File Entry (PDF Import page) ────────────────────────────────────────────
export interface FileEntry {
  id: number;
  fileName: string;
  uploadDate: string;
  records: number;
  status: 'parsing' | 'processed' | 'failed';
  parsedData: ParsedData | null;
  errorMessage?: string;
  _file?: File;
}

// ─── Master Data ─────────────────────────────────────────────────────────────
export interface MasterDataRow {
  id: number;
  code: string;
  name: string;
  description: string;
  status: string;
}

export type MasterDataTab = 'items' | 'categories' | 'vendors' | 'locations';

export interface MasterDataForm {
  code: string;
  name: string;
  description: string;
  status: string;
}

// ─── ERP Data ────────────────────────────────────────────────────────────────
export interface ErpRow {
  id: string;
  ref: string;
  type: string;
  items: number;
  amount: number;
  syncDate: string;
  status: string;
}

// ─── INSW Push ───────────────────────────────────────────────────────────────
export interface InswQueueItem {
  id: string;
  docRef: string;
  type: string;
  preparedDate: string;
  pushDate: string | null;
  status: 'success' | 'pending' | 'failed';
  response: string | null;
}

export interface InswConfig {
  xInswKey: string;
  xUniqueKey: string;
}

// ─── Logs ────────────────────────────────────────────────────────────────────
export interface LogEntry {
  id: number;
  user: string;
  action: string;
  detail: string;
  date: string;
  type: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

export interface ActivityRow {
  id: string;
  type: string;
  document: string;
  date: string;
  status: string;
}
