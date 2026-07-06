/**
 * Auto Delivery Service — F2S Giao Hàng Auto
 * 
 * Hiện tại dùng MOCK DATA. Khi có SQL schema từ sếp,
 * chỉ cần thay body của mỗi method bằng authFetch() call thật.
 */

import { authFetch } from '@traxeco/shared';

// ─── Interfaces (sẽ map 1:1 với SQL tables sau) ───

export interface SewingOutputItem {
  size: string;
  qtyPo: number;
  qtyScanOut: number;    // Số lượng đã scan ra ở chuyền
  qtyPacked: number;     // Số lượng đã pack vào thùng
  balance: number;       // qtyScanOut - qtyPacked = còn lại
}

export interface PackingPlanSizeDetail {
  size: string;
  custSize: string;
  qty: number;
}

export interface PackingPlanItem {
  cartonNo: number;
  cartonIndex: string;   // A, B, C...
  ctnSeriNo: string;
  sizes: PackingPlanSizeDetail[];
  totalPcs: number;
  packStt: string;       // 'New' | packed CTNSeriNo
}

export interface PackType {
  code: string;          // A, B, C, D
  name: string;          // Mô tả
  pic?: string;          // Đường dẫn ảnh
}

export interface PackQueueItem {
  cartonNo: number;
  cartonIndex: string;
  ctnSeriNo: string;
  sizes: PackingPlanSizeDetail[];
  totalPcs: number;
  packTypeCode: string;
  crateBarcode: string;
}

export interface AutoDeliveryData {
  sewingOutput: SewingOutputItem[];
  packingPlan: PackingPlanItem[];
}

// ─── Service ───

export const autoDeliveryService = {
  /**
   * Lấy data Qty chuyền + Packing Plan theo PO (Lấy trực tiếp từ DB)
   */
  async getAutoDeliveryData(po: string): Promise<AutoDeliveryData> {
    const userDept = localStorage.getItem('dept') || 'FGS';
    const res = await authFetch(`f2s-delivery/auto/data?poNo=${encodeURIComponent(po)}&facLine=${encodeURIComponent(userDept)}`);
    if (!res.ok) throw new Error('Lỗi khi tải dữ liệu cấu trúc (BE chưa start hoặc lỗi SQL)');
    return await res.json();
  },

  /**
   * Tim PO theo kiểu LIKE, tra ket qua la list tung PO duy nhat.
   */
  async searchPOs(query: string): Promise<string[]> {
    const term = query.trim();
    if (!term) return [];
    
    // Lấy tên Dept người dùng đang đăng nhập làm FacLine (vd: F2, F3)
    const userDept = localStorage.getItem('dept') || 'FGS';
    
    const res = await authFetch(`f2s-delivery/auto/search-po?poNo=${encodeURIComponent(term)}&facLine=${encodeURIComponent(userDept)}`);
    if (!res.ok) throw new Error('Lỗi khi tải danh sách PO gợi ý');
    
    const data = await res.json();
    return data;
  },

  /**
   * Lấy danh sách loại đóng thùng trực tiếp từ SQL Database
   */
  async getPackTypes(): Promise<PackType[]> {
    const res = await authFetch(`f2s-delivery/auto/pack-types`);
    if (!res.ok) throw new Error('Crashed');
    return await res.json();
  },

  /**
   * Validate mã thùng nhựa (crate barcode) với SQL Database
   */
  async validateCrate(crateBarcode: string): Promise<{ valid: boolean; message?: string }> {
    const trimmed = crateBarcode.trim();
    if (!trimmed) {
      return { valid: false, message: 'Mã thùng nhựa không được để trống' };
    }
    
    try {
      const res = await authFetch(`f2s-delivery/auto/validate-crate?barcode=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error('API Error');
      const isFree = await res.json();
      if (!isFree) {
        return { valid: false, message: `Thùng nhựa [${trimmed}] đang kẹt chứa hàng, chưa được giải phóng khỏi kho!` };
      }
      return { valid: true };
    } catch (e) {
      return { valid: false, message: 'Không thể kết nối máy chủ để kiểm tra mã thùng' };
    }
  },

  /**
   * Truyền dữ liệu xuống Backend để chốt sổ (và có thể gọi AGV)
   */
  async confirmAutoPack(activePO: string, items: PackQueueItem[], callAgv: boolean): Promise<{ success: boolean; message?: string }> {
    const facLine = localStorage.getItem('dept') || 'FGS';
    const username = localStorage.getItem('employeeCode') || 'admin';

    const payload = {
      activePO,
      facLine,
      username,
      callAgv,
      items
    };

    try {
      const res = await authFetch(`f2s-delivery/auto/save`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // Đọc body dù ok hay không để lấy message lỗi thật từ BE
      const data = await res.json();
      
      if (!res.ok) {
        const errMsg = data?.message || data?.error || `HTTP ${res.status}`;
        return { success: false, message: `Lỗi từ server: ${errMsg}` };
      }
      
      return data;
    } catch (e: any) {
      console.error('❌ confirmAutoPack error:', e);
      return { success: false, message: `Lỗi: ${e.message || 'Không kết nối được server'}` };
    }
  },
};
