// ─── Item Types ──────────────────────────────────────────────
export type ItemType =
  | 'FABRIC'
  | 'ACCESSORY'
  | 'PRODUCT'
  | 'YARDAGE'
  | 'PATTERN'
  | 'CATALOG'
  | 'CONCEPT'
  | 'COLOR'
  | 'TRIM'
  | 'ARCHIVE';

// ─── Base Item ───────────────────────────────────────────────
export interface MasterItem {
  id: number;
  itemType: ItemType;
  name: string;
  description?: string;
}

export interface Item {
  id: number;
  masterItemId: number;
  masterItemName?: string;
  itemType: ItemType;
  itemCode?: string;
  name: string;
  description?: string;
  stickerImage?: string;
  mainImage?: string;
  category?: string;
  specification?: string;
  supplierName?: string;
  origin?: string;
  price?: number;
  currency?: string;
  priceUnit?: string;
  moqMcq?: string;
  moqMcqUnit?: string;
  mcqSurcharge?: number;
  moqSurcharge?: number;
  leadTime?: string;
  surchargeStr?: string;
  leadtimeWithGreige?: string;
  leadtimeWithoutGreige?: string;
  customer?: string;
  priceHistory?: string;
  surcharge?: number; // legacy
  quantity?: number;
  quantityUnit?: string;
  location?: string;
  holder?: string;
  remark?: string;
  parentId?: number;
  qrCode?: string; // UUID
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  color?: string;
  status?: string;
  // Extension fields (optional, merged)
  fabric?: ItemFabric;
  accessory?: ItemAccessory;
  product?: ItemProduct;
  pattern?: ItemPattern;
  catalog?: ItemCatalog;
}

// ─── Extension Types ─────────────────────────────────────────
export interface ItemFabric {
  structure?: string;
  fabricName?: string;
  composition?: string;        // 3 options: Synthetic, Natural, Natural blend
  compositionDetail?: string;
  function?: string;
  weightGsm?: number;
  cuttableWidth?: number;
  colorName?: string;
  hasSy?: boolean;
  content?: string;
}

export interface ItemAccessory {
  specification?: string;
  composition?: string;
  description?: string; // Manual input per mindmap
  size?: string;
  color?: string;
  weightGsm?: number;
}

export interface ItemProduct {
  projectName?: string;
  garmentCategory?: string; // Tops, Pants, Jackets, Polo...
  sportCategory?: string;   // Golf, Running, Training...
  styleNo?: string;
  styleName?: string;
  sampleStage?: string;
  color?: string;
  size?: string;
  gender?: string;
  patternMarker?: string;
  allocation?: string;
  mainComposition?: string;
  liningComposition?: string;
  fobPrice?: number;
}

export interface ItemPattern {
  styleNo?: string;
  size?: string;
  location?: string;
}

export interface ItemCatalog {
  catalogCode?: string;
  specification?: string;
  description?: string;
}

// ─── Scan Log ────────────────────────────────────────────────// 🟢 Scan Log 🟢
export interface ScanLog {
  id: number;
  itemId: number;
  itemCode?: string;
  itemName?: string;
  itemType?: string;
  action?: 'SCAN_OUT' | 'SCAN_IN';
  actionType?: string;
  qtyChanged: number;
  holder: string;
  locationFrom?: string;
  note?: string;
  scannedAt: string;
  scannedBy?: string;
  photoUrl?: string;
}

// ─── Pagination ──────────────────────────────────────────────
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
