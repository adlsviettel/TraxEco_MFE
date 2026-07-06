export interface Supplier {
  idSup: string;
  nameSup: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface WarehouseStock {
  no: number;           // STT lô hàng nhập (lot no)
  idMed: string;        // Mã thuốc
  nameMed: string;      // Tên thuốc
  qty: number;          // Số lượng nhập ban đầu
  qtyIssue: number;     // Số lượng tồn kho chính hiện tại
  idSup: string;        // Mã nhà cung cấp
  manuDate: string;     // Ngày sản xuất
  expDate: string;      // Hạn sử dụng
}

export interface FactoryStock {
  no: number;           // STT lô hàng chuyển xuống xưởng
  recNo: number;        // FK liên kết với lô hàng nhập gốc ở kho chính
  idMed: string;        // Mã thuốc
  nameMed: string;      // Tên thuốc
  factory: string;      // Tên phân xưởng nhận (F1, F2...)
  qty: number;          // Số lượng chuyển ban đầu
  qtyIssue: number;     // Số lượng tồn tại phân xưởng
}
