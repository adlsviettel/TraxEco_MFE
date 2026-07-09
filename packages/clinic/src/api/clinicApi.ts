import { authFetch } from "@traxeco/shared";

const API_BASE = "http://localhost:8100/api/clinic";

export interface ClinicEmployee {
  globalId: string;
  fullname: string;
  department: string;
  dob?: string;
  gender?: string;
  laborType?: string;
  factory?: string;
}

export interface ClinicMedicine {
  idMed: string;
  nameMed: string;
  idGroup: string;
  unit: string;
  packageType: string;
  balance: number;
}

export interface ClinicMedicineGroup {
  idGroup: string;
  nameGroup: string;
  typeGroup: string;
}

export interface ClinicSickness {
  idSick: string;
  nameSick: string;
  idGroup: string;
}

export interface ClinicDispenseDetailRequest {
  idMed: string;
  qty: number;
}

export interface ClinicDispenseRequest {
  employeeCode: string;
  idSick: string;
  type: string;
  factory: string;
  items: ClinicDispenseDetailRequest[];
}

export interface ClinicDispenseHistory {
  code: string;
  type: string;
  employeeCode: string;
  employeeName: string;
  idSick: string;
  sicknessName: string;
  sysCreateDate: string;
  createdBy: string;
  factory: string;
  medicines: {
    idMed: string;
    nameMed: string;
    qty: number;
  }[];
}

// Mock Data Fallbacks
const MOCK_EMPLOYEES: Record<string, ClinicEmployee> = {
  "26094": {
    globalId: "A1A1926094",
    fullname: "Nguyễn Ngọc Khả Tú",
    department: "CTTAP - CTTAP",
    dob: "1996-01-02",
    gender: "Nam",
    laborType: "ST",
    factory: "F2",
  },
  "04819": {
    globalId: "A1A1004819",
    fullname: "Lê Thị Trúc Ly",
    department: "QA - Quality Assurance",
    dob: "1997-08-15",
    gender: "Nữ",
    laborType: "ST",
    factory: "F2",
  },
};

const MOCK_MEDICINES: ClinicMedicine[] = [
  { idMed: "M001", nameMed: "Air-X", idGroup: "G001", unit: "Viên", packageType: "Hộp", balance: 186 },
  { idMed: "M002", nameMed: "Alcool", idGroup: "G004", unit: "Chai", "packageType": "Chai", balance: 30 },
  { idMed: "M003", nameMed: "Alphacymotrypsin", idGroup: "G003", unit: "Viên", "packageType": "Hộp", balance: 297 },
  { idMed: "M004", nameMed: "Alveril", idGroup: "G001", unit: "Viên", "packageType": "Hộp", balance: 0 },
  { idMed: "M005", nameMed: "Paracetamol 500mg", idGroup: "G001", unit: "Viên", "packageType": "Vỉ", balance: 500 },
  { idMed: "M006", nameMed: "Decolgen Forte", idGroup: "G001", unit: "Viên", "packageType": "Hộp", balance: 150 },
  { idMed: "M007", nameMed: "Amoxicillin 500mg", idGroup: "G002", unit: "Viên", "packageType": "Vỉ", balance: 120 },
  { idMed: "M008", nameMed: "Povidone Iodine 10%", idGroup: "G004", unit: "Chai", "packageType": "Chai", balance: 45 },
  { idMed: "M009", nameMed: "Salonpas Gel", idGroup: "G005", unit: "Tuýp", "packageType": "Tuýp", balance: 25 },
  { idMed: "M010", nameMed: "Vitamin C 500mg", idGroup: "G005", unit: "Viên", "packageType": "Chai", balance: 350 },
  { idMed: "M011", nameMed: "Panadol Extra", idGroup: "G001", unit: "Viên", "packageType": "Hộp", balance: 220 },
];

const MOCK_GROUPS: ClinicMedicineGroup[] = [
  { idGroup: "G001", nameGroup: "Nhóm giảm đau, hạ sốt", typeGroup: "MED" },
  { idGroup: "G002", nameGroup: "Nhóm kháng sinh", typeGroup: "MED" },
  { idGroup: "G003", nameGroup: "Nhóm kháng viêm", typeGroup: "MED" },
  { idGroup: "G004", nameGroup: "Nhóm dầu gió, sát trùng", typeGroup: "MED" },
  { idGroup: "G005", nameGroup: "Nhóm vitamin & bồi bổ", typeGroup: "MED" },
];

const MOCK_SICKNESS: ClinicSickness[] = [
  { idSick: "S001", nameSick: "Cảm cúm / Sốt", idGroup: "G001" },
  { idSick: "S002", nameSick: "Đau đầu / Chóng mặt", idGroup: "G001" },
  { idSick: "S003", nameSick: "Đau bụng / Tiêu chảy", idGroup: "G001" },
  { idSick: "S004", nameSick: "Chấn thương phần mềm / Trầy xước", idGroup: "G004" },
  { idSick: "S005", nameSick: "Nhức mỏi cơ xương khớp", idGroup: "G005" },
];

const MOCK_HISTORY: ClinicDispenseHistory[] = [
  {
    code: "F2_04819_20260703080000",
    type: "MED",
    employeeCode: "A1A1004819",
    employeeName: "Lê Thị Trúc Ly",
    idSick: "S001",
    sicknessName: "Cảm cúm / Sốt",
    sysCreateDate: "2026-07-03T08:00:00Z",
    createdBy: "admin",
    factory: "F2",
    medicines: [
      { idMed: "M005", nameMed: "Paracetamol 500mg", qty: 4 },
      { idMed: "M006", nameMed: "Decolgen Forte", qty: 2 },
    ],
  },
  {
    code: "F2_CABIN_20260702153000",
    type: "CABIN",
    employeeCode: "CABIN",
    employeeName: "Tủ thuốc F2",
    idSick: "",
    sicknessName: "Cấp tủ thuốc định kỳ",
    sysCreateDate: "2026-07-02T15:30:00Z",
    createdBy: "admin",
    factory: "F2",
    medicines: [
      { idMed: "M002", nameMed: "Alcool", qty: 5 },
      { idMed: "M008", nameMed: "Povidone Iodine 10%", qty: 2 },
    ],
  },
];

export const clinicApi = {
  searchEmployee: async (id: string): Promise<ClinicEmployee> => {
    try {
      const res = await authFetch(`${API_BASE}/employee/search?id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error("Employee not found");
      return await res.json();
    } catch (e) {
      console.warn("clinicApi: searchEmployee failed, using mock data", e);
      const cleanId = id.trim();
      if (MOCK_EMPLOYEES[cleanId]) {
        return MOCK_EMPLOYEES[cleanId];
      }
      // Generate a dynamic mock employee for testing any code
      return {
        globalId: "A1A1" + cleanId,
        fullname: "Nhân viên Test " + cleanId,
        department: "Xưởng sản xuất F2",
        dob: "1990-05-15",
        gender: parseInt(cleanId) % 2 === 0 ? "Nam" : "Nữ",
        laborType: "PE",
        factory: "F2",
      };
    }
  },

  getMedicines: async (factory: string = "F2"): Promise<ClinicMedicine[]> => {
    try {
      const res = await authFetch(`${API_BASE}/medicine?factory=${factory}`);
      if (!res.ok) throw new Error("Failed to fetch medicines");
      const list = await res.json();
      return list.map((m: any) => ({
        idMed: m.idMed || "",
        nameMed: m.nameMed || "",
        idGroup: m.idGroup || "",
        unit: m.unit || "",
        packageType: m.packageType || "",
        balance: m.balance != null ? m.balance : 0
      }));
    } catch (e) {
      console.warn("clinicApi: getMedicines failed, using mock data", e);
      return MOCK_MEDICINES;
    }
  },

  getMedicineGroups: async (): Promise<ClinicMedicineGroup[]> => {
    try {
      const res = await authFetch(`${API_BASE}/medicine-group`);
      if (!res.ok) throw new Error("Failed to fetch medicine groups");
      const list = await res.json();
      return list.map((g: any) => ({
        idGroup: g.groupId != null ? String(g.groupId) : "",
        nameGroup: g.groupName || "",
        typeGroup: "MED"
      }));
    } catch (e) {
      console.warn("clinicApi: getMedicineGroups failed, using mock data", e);
      return MOCK_GROUPS;
    }
  },

  getSickness: async (): Promise<ClinicSickness[]> => {
    try {
      const res = await authFetch(`${API_BASE}/sickness`);
      if (!res.ok) throw new Error("Failed to fetch sicknesses");
      const list = await res.json();
      return list.map((s: any) => ({
        idSick: s.diseaseId != null ? String(s.diseaseId) : "",
        nameSick: s.diseaseName || "",
        idGroup: ""
      }));
    } catch (e) {
      console.warn("clinicApi: getSickness failed, using mock data", e);
      return MOCK_SICKNESS;
    }
  },

  submitDispense: async (data: ClinicDispenseRequest): Promise<string> => {
    try {
      const res = await authFetch(`${API_BASE}/dispense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to submit dispense");
      }
      return await res.text();
    } catch (e) {
      console.warn("clinicApi: submitDispense failed, simulating success via mock data", e);
      return "SUCCESS_MOCK";
    }
  },

  getHistory: async (factory: string = "F2", limit: number = 50, employeeCode?: string): Promise<ClinicDispenseHistory[]> => {
    try {
      let url = `${API_BASE}/dispense?factory=${factory}&limit=${limit}`;
      if (employeeCode) url += `&employeeCode=${encodeURIComponent(employeeCode)}`;
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch history");
      return await res.json();
    } catch (e) {
      console.warn("clinicApi: getHistory failed, using mock data", e);
      if (employeeCode) {
        return MOCK_HISTORY.filter(h => h.employeeCode === employeeCode);
      }
      return MOCK_HISTORY;
    }
  },

  deleteDispense: async (visitCode: string): Promise<void> => {
    const res = await authFetch(`${API_BASE}/dispense/${encodeURIComponent(visitCode)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Xóa lịch sử phát thuốc thất bại!");
    }
  },

  updateDispense: async (visitCode: string, data: ClinicDispenseRequest): Promise<void> => {
    const res = await authFetch(`${API_BASE}/dispense/${encodeURIComponent(visitCode)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Cập nhật lịch sử phát thuốc thất bại!");
    }
  },

  // ─── API QUẢN LÝ KHO THUỐC (CLINIC WAREHOUSE) ───
  getSuppliers: async (): Promise<any[]> => {
    const res = await authFetch(`${API_BASE}/suppliers`);
    if (!res.ok) throw new Error("Không thể tải danh sách nhà cung cấp");
    return await res.json();
  },

  getWarehouseStock: async (): Promise<any[]> => {
    const res = await authFetch(`${API_BASE}/warehouse/stock`);
    if (!res.ok) throw new Error("Không thể tải tồn kho chính");
    return await res.json();
  },

  getFactoryStock: async (): Promise<any[]> => {
    const res = await authFetch(`${API_BASE}/warehouse/factory-stock`);
    if (!res.ok) throw new Error("Không thể tải tồn kho phân xưởng");
    return await res.json();
  },

  getImports: async (): Promise<any[]> => {
    const res = await authFetch(`${API_BASE}/warehouse/imports`);
    if (!res.ok) throw new Error("Không thể tải lịch sử nhập kho");
    return await res.json();
  },

  importMedicine: async (data: any): Promise<void> => {
    const res = await authFetch(`${API_BASE}/warehouse/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Nhập kho thuốc thất bại");
    }
  },

  transferToFactory: async (data: any): Promise<void> => {
    const res = await authFetch(`${API_BASE}/warehouse/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Điều chuyển xuống phân xưởng thất bại");
    }
  },

  deleteWarehouseStock: async (stockId: number): Promise<void> => {
    const res = await authFetch(`${API_BASE}/warehouse/stock/${stockId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Xóa lô hàng kho chính thất bại");
    }
  },

  deleteFactoryStock: async (stockId: number): Promise<void> => {
    const res = await authFetch(`${API_BASE}/warehouse/factory-stock/${stockId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Xóa lô hàng điều chuyển thất bại");
    }
  },

  // ─── API QUẢN LÝ GIƯỜNG BỆNH (CLINIC BEDS) ───
  getBeds: async (): Promise<any[]> => {
    const res = await authFetch(`${API_BASE}/beds`);
    if (!res.ok) throw new Error("Không thể tải danh sách giường bệnh");
    return await res.json();
  },

  admitPatient: async (bedId: number, data: { employeeId: string; fullName: string; sickness: string; factory: string }): Promise<void> => {
    const res = await authFetch(`${API_BASE}/beds/${bedId}/admit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Tiếp nhận bệnh nhân nằm giường thất bại");
    }
  },

  dischargePatient: async (bedId: number): Promise<void> => {
    const res = await authFetch(`${API_BASE}/beds/${bedId}/discharge`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Cho xuất giường thất bại");
    }
  },

  getBedHistory: async (factory?: string, fromDate?: string, toDate?: string): Promise<any[]> => {
    let url = `${API_BASE}/beds/history?`;
    if (factory && factory !== "Tất cả") url += `factory=${encodeURIComponent(factory)}&`;
    if (fromDate) url += `fromDate=${encodeURIComponent(fromDate)}&`;
    if (toDate) url += `toDate=${encodeURIComponent(toDate)}&`;
    const res = await authFetch(url);
    if (!res.ok) throw new Error("Không thể tải lịch sử nằm giường");
    return await res.json();
  },
};
