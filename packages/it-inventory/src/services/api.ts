/**
 * Base API service — call Spring Boot backend
 * Dev: proxied via Vite → /api
 * Production: direct call → http://172.17.186.26:8100/api
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: false, message: `Server error (${res.status}): ${text.substring(0, 200)}` };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error' };
  }
}

// ─── Files ───────────────────────────────────────────────────

export interface ImportedFileDto {
  fileId: number;
  fileName: string;
  fileSize: number;
  storagePath: string;
  importedBy: string;
  importedAt: string;
  parseStatus: string;
  parseError: string | null;
  totalItems: number;
  isDeleted: boolean;
  fileType?: string;
}

export interface FileDetailDto {
  fileId: number;
  fileName: string;
  fileSize: number;
  importedBy: string;
  importedAt: string;
  parseStatus: string;
  totalItems: number;
  header: {
    nomorPengajuan: string;
    tanggalPengajuan: string;
    nomorPendaftaran: string;
    tanggalPendaftaran: string;
  } | null;
  items: Array<{
    itemNo: number;
    kodeHS: string;
    uraianBarang: string;
    kodeBarang: string;
    jumlah: string;
    satuan: string;
    harga: string;
    amount: string;
    nilaiPabean: string;
    negara: string;
    kategoriBarang: string;
    kondisiBarang: string;
  }>;
  latestPushStatus: string | null;
  latestPushDate: string | null;
}

export interface PushLogDto {
  pushId: number;
  fileId: number;
  pushedBy: string;
  pushedAt: string;
  status: string;
  httpStatus: number;
  requestBody: string | null;
  responseBody: string | null;
  errorMessage: string | null;
  duration: number;
}

export interface DashboardStatsDto {
  totalFiles: number;
  totalParsed: number;
  totalItems: number;
  totalPushSuccess: number;
  totalPushFailed: number;
}

export interface AuditLogDto {
  logId: number;
  username: string;
  action: string;
  entityType: string;
  entityId: number;
  detail: string;
  ipAddress: string;
  createdAt: string;
}

export interface MasterDataDto {
  masterId: number;
  category: string;
  code: string;
  name: string;
  description: string;
  status: string;
}

// ─── File APIs ───────────────────────────────────────────────

export function getFiles(): Promise<ApiResponse<ImportedFileDto[]>> {
  return request('/files');
}

export function getFileDetail(id: number): Promise<ApiResponse<FileDetailDto>> {
  return request(`/files/${id}`);
}

export async function uploadFile(file: File, username: string, fileType?: string): Promise<ApiResponse<ImportedFileDto>> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('username', username);
  if (fileType) formData.append('fileType', fileType);

  try {
    const res = await fetch(`${BASE_URL}/files/upload`, {
      method: 'POST',
      body: formData,
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: false, message: `Server error (${res.status})` };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error' };
  }
}

export function saveParsedData(fileId: number, data: { header: FileDetailDto['header']; items: FileDetailDto['items'] }, username: string): Promise<ApiResponse<string>> {
  return request(`/files/${fileId}/parsed-data?username=${encodeURIComponent(username)}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteFile(id: number, username: string): Promise<ApiResponse<string>> {
  return request(`/files/${id}?username=${encodeURIComponent(username)}`, { method: 'DELETE' });
}

// ─── INSW Push APIs ──────────────────────────────────────────

export function pushSingleFile(fileId: number, username: string): Promise<ApiResponse<PushLogDto>> {
  return request(`/insw/push/${fileId}?username=${encodeURIComponent(username)}`, { method: 'POST' });
}

export function pushBatch(fileIds: number[], username: string): Promise<ApiResponse<PushLogDto[]>> {
  return request(`/insw/push/batch?username=${encodeURIComponent(username)}`, {
    method: 'POST',
    body: JSON.stringify({ fileIds }),
  });
}

export function savePushLog(data: {
  fileId: number;
  status: string;
  httpStatus: number;
  requestBody: string | null;
  responseBody: string | null;
  errorMessage: string | null;
  duration: number;
}, username: string): Promise<ApiResponse<PushLogDto>> {
  return request(`/insw/save-log?username=${encodeURIComponent(username)}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getPushHistory(): Promise<ApiResponse<PushLogDto[]>> {
  return request('/insw/push-log');
}

export function getInswApiConfig(): Promise<ApiResponse<Record<string, string>>> {
  return request('/insw/config');
}

export function updateInswApiConfig(updates: Record<string, string>, username: string): Promise<ApiResponse<string>> {
  return request(`/insw/config?username=${encodeURIComponent(username)}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// ─── Master Data APIs ────────────────────────────────────────

export function getMasterData(category: string): Promise<ApiResponse<MasterDataDto[]>> {
  return request(`/master-data/${category}`);
}

export function createMasterData(data: Partial<MasterDataDto>): Promise<ApiResponse<MasterDataDto>> {
  return request('/master-data', { method: 'POST', body: JSON.stringify(data) });
}

export function updateMasterData(id: number, data: Partial<MasterDataDto>): Promise<ApiResponse<MasterDataDto>> {
  return request(`/master-data/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteMasterData(id: number): Promise<ApiResponse<string>> {
  return request(`/master-data/${id}`, { method: 'DELETE' });
}

// ─── Logs & Dashboard ────────────────────────────────────────

export function getAuditLogs(): Promise<ApiResponse<AuditLogDto[]>> {
  return request('/logs');
}

export function getDashboardStats(): Promise<ApiResponse<DashboardStatsDto>> {
  return request('/dashboard/stats');
}
