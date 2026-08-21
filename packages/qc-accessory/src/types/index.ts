export interface InvoiceItem {
  ID: string;
  Physicaldate: string;
  Number: string; // PO Number
  Itemnumber: string;
  Color: string;
  Size: string;
  Quantity: number;
  Unit: string;
  Pick: string;
  Customerrequisition: string; // Job
  Itemnumber2: string; // Style
  Supplier?: string;
  MClss?: string;
  InvoiceNo?: string;
  InvoiceDate?: string;
}

export interface AQLLevel {
  LevelNo: string;
  LoadSize1: number;
  LoadSize2: number;
  SampleSize: number;
  Accept: number;
  Reject: number;
}

export interface DefectCode {
  Code: string;
  DefectEN: string;
  DefectVN: string;
}

export interface DefectRecord {
  Code: string;
  Name: string;
  Qty: number;
  Image: string;
  Path: string;
  ID: string;
}

export interface DefectDetail {
  Code: string;
  DefectEN: string;
  DefectVN: string;
  Qty: number;
  Image: string;
}

export interface HistoryRecord {
  ID: string;
  InvoiceNo: string;
  PONo: string;
  Item: string;
  Result: string;
  Approval: string;
  Color: string;
  Metal: string;
  Supplier: string;
  SampleSize: string;
  DefectQty: string;
  Accept: string;
  Reject: string;
  CreatedBy: string;
  CreatedDate: string;
  Remark: string;
  Customer: string;
}

export interface PickedItem {
  Color: string;
  Size: string;
  Quantity: number;
  Unit: string;
  Pick: string;
  ID: string;
  checked?: boolean;
}

export interface QCInspectionState {
  invoiceData: InvoiceItem[];
  selectedPO: string;
  selectedItem: string;
  pickedIDs: string[];
  selectedIDs: string[];
  defects: DefectRecord[];
  aqlLevel: string;
  sampleSize: number;
  acceptLevel: number;
  rejectLevel: number;
  orderQty: number;
  metalStatus: boolean;
  moistureEnabled: boolean;
  humidity: number;
  note: string;
  invoiceNo: string;
  invoiceDate: string;
  poNo: string;
  supplier: string;
  mClss: string;
  item: string;
  color: string;
  size: string;
  unit: string;
  style: string;
  job: string;
}
