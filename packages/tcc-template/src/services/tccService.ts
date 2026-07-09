/**
 * TCC Template Request Service
 * Uses authFetch for API calls.
 */
import { authFetch } from '@traxeco/shared';

export interface TccRequest {
  requestId: string;
  createdAt: string;
  monthYear: string;
  requesterName: string;
  customer: string;
  season: string;
  styleNumber: string;
  productType: string;
  sampleStage: string;
  factory: string;
  materialSentDate: string | null;
  processType: string;
  operationDescription: string;
  machineType: string;
  machineDimension: string;
  sizesRequired: string;
  isPriority: boolean;
  priorityReason: string;
  expectedDeliveryDate: string | null;
  lineQuantity: string;

  materialReceivedDate: string | null;
  startDate: string | null;
  finishedDate: string | null;
  status: string;
  delayRemakeReason: string;
  templateQty: number | null;
  releasedDate: string | null;
  developerName: string;
  comments: string;
  remarks: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
  confirmDeliveryDate?: string | null;
  confirmStatus?: string | null;
  createdBy?: string | null;
}

export interface TccComment {
  id: number;
  requestId: string;
  authorCode: string;
  authorName: string;
  content: string;
  attachments?: string | null;
  isPinned: boolean;
  createdAt: string;
}

export interface TccAuditLog {
  userName: string;
  actionType: string;
  details: string;
  createdAt: string;
}

export interface TccLeadTimeConfig {
  id: number;
  factoryCategory: string;
  factoryName: string;
  processType: string;
  leadTimeDays: number | null;
}

export interface TccAnalytics {
  totalInput: number;
  totalOutput: number;
  inProcess: number;
  notStarted: number;
  completionRate: number;
  avgWorkingDays: number;
  totalDelivery: number;
  byMonth: { month: string; count: number }[];
  byCustomer: { customer: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

export interface CreateRequestPayload {
  requesterName: string;
  customer: string;
  season: string;
  styleNumber: string;
  productType: string;
  sampleStage: string;
  factory: string;
  materialSentDate: string | null;
  processType: string;
  operationDescription: string;
  machineType: string;
  machineDimension: string;
  sizesRequired: string;
  isPriority: boolean;
  priorityReason: string;
  expectedDeliveryDate: string | null;
  lineQuantity: string;
  templateQty?: number | string | null;
  confirmDeliveryDate?: string | null;
}

export interface UpdateProgressPayload {
  materialReceivedDate?: string | null;
  startDate?: string | null;
  finishedDate?: string | null;
  expectedDeliveryDate?: string | null;
  clearExpectedDeliveryDate?: boolean;
  clearFinishedDate?: boolean;
  lineQuantity?: string;
  status?: string;
  developerName?: string;
  delayRemakeReason?: string;
  templateQty?: number | null;
  remarks?: string;
  comments?: string;
  releasedDate?: string | null;
  confirmDeliveryDate?: string | null;
  confirmStatus?: string | null;
  clearConfirmDeliveryDate?: boolean;

  // Request Details fields
  requesterName?: string;
  customer?: string;
  season?: string;
  styleNumber?: string;
  productType?: string;
  sampleStage?: string;
  factory?: string;
  materialSentDate?: string | null;
  clearMaterialSentDate?: boolean;
  processType?: string;
  operationDescription?: string;
  machineType?: string;
  machineDimension?: string;
  sizesRequired?: string;
  isPriority?: boolean;
  priorityReason?: string;
}

export interface RequestFilters {
  customer?: string;
  factory?: string;
  season?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export interface TccMachineTemplate {
  id: number;
  factory: string;
  machineType: string;
  machineDimension: string;
  isActive: boolean;
}

export const tccService = {
  async getMetadata(): Promise<Record<string, string[]>> {
    const res = await authFetch('/tcc/metadata');
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json(); // Interceptor unwraps ApiResponse.success
  },

  async addMetadata(category: string, value: string): Promise<any> {
    const res = await authFetch(`/tcc/metadata/${category}`, {
      method: 'POST',
      body: JSON.stringify({ value })
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async updateMetadata(category: string, oldValue: string, newValue: string): Promise<any> {
    const res = await authFetch(`/tcc/metadata/${category}/${encodeURIComponent(oldValue)}`, {
      method: 'PUT',
      body: JSON.stringify({ value: newValue })
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async deleteMetadata(category: string, value: string): Promise<any> {
    const res = await authFetch(`/tcc/metadata/${category}/${encodeURIComponent(value)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async getMachineTemplates(): Promise<TccMachineTemplate[]> {
    const res = await authFetch('/tcc/machines');
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async addMachineTemplate(data: Partial<TccMachineTemplate>): Promise<TccMachineTemplate> {
    const res = await authFetch('/tcc/machines', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async updateMachineTemplate(id: number, data: Partial<TccMachineTemplate>): Promise<TccMachineTemplate> {
    const res = await authFetch(`/tcc/machines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async deleteMachineTemplate(id: number): Promise<any> {
    const res = await authFetch(`/tcc/machines/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async getLeadTimeConfigs(): Promise<TccLeadTimeConfig[]> {
    const res = await authFetch('/tcc/lead-times');
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async addLeadTimeConfig(data: Partial<TccLeadTimeConfig>): Promise<TccLeadTimeConfig> {
    const res = await authFetch('/tcc/lead-times', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async updateLeadTimeConfig(id: number, data: Partial<TccLeadTimeConfig>): Promise<TccLeadTimeConfig> {
    const res = await authFetch(`/tcc/lead-times/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async deleteLeadTimeConfig(id: number): Promise<any> {
    const res = await authFetch(`/tcc/lead-times/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async getRequests(filters?: RequestFilters): Promise<TccRequest[]> {
    const qs = new URLSearchParams();
    if (filters?.customer) qs.append('customer', filters.customer);
    if (filters?.factory) qs.append('factory', filters.factory);
    if (filters?.season) qs.append('season', filters.season);
    if (filters?.status) qs.append('status', filters.status);
    if (filters?.fromDate) qs.append('fromDate', filters.fromDate);
    if (filters?.toDate) qs.append('toDate', filters.toDate);
    
    const res = await authFetch(`/tcc/requests?${qs.toString()}`);
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async createRequest(data: CreateRequestPayload): Promise<TccRequest> {
    const res = await authFetch('/tcc/requests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async updateMaterialSentDate(requestId: string, date: string): Promise<TccRequest> {
    const res = await authFetch(`/tcc/requests/${requestId}/material-sent-date`, {
      method: 'PATCH',
      body: JSON.stringify({ date })
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async updateProgress(requestId: string, data: UpdateProgressPayload): Promise<TccRequest> {
    const payload = { ...data } as any;
    
    // Add flags to tell backend to clear dates if they are empty or null
    if (payload.startDate === '' || payload.startDate === null) payload.clearStartDate = true;
    if (payload.finishedDate === '' || payload.finishedDate === null) payload.clearFinishedDate = true;
    if (payload.releasedDate === '' || payload.releasedDate === null) payload.clearReleasedDate = true;
    if (payload.expectedDeliveryDate === '' || payload.expectedDeliveryDate === null) payload.clearExpectedDeliveryDate = true;
    if (payload.materialReceivedDate === '' || payload.materialReceivedDate === null) payload.clearMaterialReceivedDate = true;
    if (payload.confirmDeliveryDate === '' || payload.confirmDeliveryDate === null) payload.clearConfirmDeliveryDate = true;

    const res = await authFetch(`/tcc/requests/${requestId}/progress`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Error saving progress');
    }
    return res.json();
  },

  async deleteRequest(requestId: string): Promise<void> {
    const res = await authFetch(`/tcc/requests/${requestId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
  },

  async getAnalytics(): Promise<TccAnalytics> {
    const res = await authFetch('/tcc/analytics');
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async importRequests(requests: Partial<TccRequest>[]): Promise<void> {
    const res = await authFetch('/tcc/requests/import', {
      method: 'POST',
      body: JSON.stringify(requests)
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
  },

  async getReadNotifications(): Promise<string[]> {
    const res = await authFetch('/tcc/notifications/read');
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const res = await authFetch('/tcc/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ notificationId })
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
  },

  async markAllNotificationsAsRead(notificationIds: string[]): Promise<void> {
    const res = await authFetch('/tcc/notifications/read-all', {
      method: 'POST',
      body: JSON.stringify({ notificationIds })
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
  },

  async resetNotifications(): Promise<void> {
    const res = await authFetch('/tcc/notifications/reset-unread', {
      method: 'POST'
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
  },

  async getAuditLogs(requestId: string): Promise<TccAuditLog[]> {
    const res = await authFetch(`/tcc/requests/${requestId}/audit-logs`);
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async getComments(requestId: string): Promise<TccComment[]> {
    const res = await authFetch(`/tcc/requests/${requestId}/comments`);
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async addComment(requestId: string, content: string, attachments?: string | null): Promise<TccComment> {
    const res = await authFetch(`/tcc/requests/${requestId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, attachments })
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  async togglePinComment(commentId: number, pinned: boolean): Promise<void> {
    const res = await authFetch(`/tcc/comments/${commentId}/pin`, {
      method: 'PUT',
      body: JSON.stringify({ pinned })
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
  },

  async deleteComment(commentId: number): Promise<void> {
    const res = await authFetch(`/tcc/comments/${commentId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
  },
};
