/**
 * TCC Template Request Service
 * Uses authFetch for API calls.
 */
import { authFetch } from '@traxeco/shared';

export const isQueuedRequest = (r: any): boolean => {
  if (!r) return false;
  const statusLower = (r.status || '').toLowerCase();
  const queueLower = (r.queueStatus || '').toLowerCase();

  // 1. If already approved, released, finished, in progress, rejected or cancelled -> NOT in queue
  if (
    queueLower === 'approved' || 
    statusLower === 'approved' || 
    statusLower === 'in progress' || 
    statusLower === 'finished' || 
    statusLower === 'released' || 
    statusLower === 'rejected' || 
    statusLower === 'cancelled' ||
    r.releasedDate
  ) {
    return false;
  }

  // 2. MUST have explicit pending queue status from backend
  return queueLower === 'pending' || statusLower === 'queued';
};

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
  fabricDeliveryDate: string | null;
  fabricNoNeed: boolean;
  paperPatternDeliveryDate: string | null;
  paperPatternNoNeed: boolean;
  trimDeliveryDate: string | null;
  trimNoNeed: boolean;
  sampleSketchDeliveryDate: string | null;
  sampleSketchNoNeed: boolean;
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
  materialSentDate?: string | null;
  fabricReceivedDate?: string | null;
  paperPatternReceivedDate?: string | null;
  trimReceivedDate?: string | null;
  sampleSketchReceivedDate?: string | null;
  startDate: string | null;
  finishedDate: string | null;
  status: string;
  delayRemakeReason: string;
  templateQty: number | null;
  templateType: string;
  releasedDate: string | null;
  queueStatus?: string;
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
  fabricDeliveryDate: string | null;
  fabricNoNeed?: boolean;
  paperPatternDeliveryDate: string | null;
  paperPatternNoNeed?: boolean;
  trimDeliveryDate: string | null;
  trimNoNeed?: boolean;
  sampleSketchDeliveryDate: string | null;
  sampleSketchNoNeed?: boolean;
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
  queueStatus?: string | null;
  status?: string | null;
}

export interface UpdateProgressPayload {
  materialReceivedDate?: string | null;
  materialSentDate?: string | null;
  clearMaterialSentDate?: boolean;
  fabricReceivedDate?: string | null;
  paperPatternReceivedDate?: string | null;
  trimReceivedDate?: string | null;
  sampleSketchReceivedDate?: string | null;
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
  templateType?: string;
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
  fabricDeliveryDate?: string | null;
  paperPatternDeliveryDate?: string | null;
  trimDeliveryDate?: string | null;
  sampleSketchDeliveryDate?: string | null;
  fabricNoNeed?: boolean;
  paperPatternNoNeed?: boolean;
  trimNoNeed?: boolean;
  sampleSketchNoNeed?: boolean;
  clearFabricDeliveryDate?: boolean;
  clearPaperPatternDeliveryDate?: boolean;
  clearTrimDeliveryDate?: boolean;
  clearSampleSketchDeliveryDate?: boolean;
  processType?: string;
  operationDescription?: string;
  machineType?: string;
  machineDimension?: string;
  sizesRequired?: string;
  isPriority?: boolean;
  priorityReason?: string;
  queueStatus?: string;
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

  async updateFabricDeliveryDate(requestId: string, date: string): Promise<TccRequest> {
    const res = await authFetch(`/tcc/requests/${requestId}/fabric-delivery-date`, {
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

  async getConfig(key: string): Promise<any> {
    const res = await authFetch(`/tcc/config/${key}`);
    if (!res.ok) throw new Error('API error: ' + res.status);
    const json = await res.json();
    return json.data;
  },

  async updateConfig(key: string, value: string): Promise<void> {
    await authFetch(`/tcc/config/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configValue: value })
    });
  },

  // Capacity Management
  getCapacityConfigs: async (): Promise<any[]> => {
    const res = await authFetch('/tcc/capacity');
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },
  getCapacityGroups: async (): Promise<any[]> => {
    try {
      const res = await authFetch('/tcc/config/CAPACITY_GROUPS');
      if (res.ok) {
        const json = await res.json();
        const configVal = json?.data?.configValue || json?.configValue;
        if (configVal) {
          return JSON.parse(configVal);
        }
      }
    } catch (e) {
      console.warn('Failed to load CAPACITY_GROUPS config, falling back to legacy capacity', e);
    }
    // Fallback to old capacity endpoint
    try {
      const res = await authFetch('/tcc/capacity');
      if (res.ok) {
        const list = await res.json();
        return (Array.isArray(list) ? list : (list?.data || [])).map((c: any) => ({
          id: c.id,
          groupName: c.factoryName,
          factories: [c.factoryName],
          maxDailySmv: c.maxDailyRequests
        }));
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  },
  saveCapacityGroups: async (groups: any[]): Promise<any> => {
    const res = await authFetch('/tcc/config/CAPACITY_GROUPS', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configValue: JSON.stringify(groups) })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'API error: ' + res.status);
    }
    return res.json();
  },
  addCapacityConfig: async (config: any): Promise<any> => {
    const res = await authFetch('/tcc/capacity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.message || 'API error: ' + res.status);
    }
    return res.json();
  },
  updateCapacityConfig: async (id: number, config: any): Promise<any> => {
    const res = await authFetch(`/tcc/capacity/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.message || 'API error: ' + res.status);
    }
    return res.json();
  },
  deleteCapacityConfig: async (id: number): Promise<void> => {
    await authFetch(`/tcc/capacity/${id}`, { method: 'DELETE' });
  },
  getFactoryCapacityUsage: async (factory: string, date: string): Promise<any> => {
    const res = await authFetch(`/tcc/capacity/usage?factory=${encodeURIComponent(factory)}&date=${encodeURIComponent(date)}`);
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },
  getGroupCapacityUsage: async (factory: string, date: string): Promise<{
    groupName: string;
    factories: string[];
    maxDailySmv: number;
    usedSmv: number;
    availableSmv: number;
  }> => {
    let groups: any[] = [];
    try {
      groups = await tccService.getCapacityGroups();
    } catch (e) {
      console.warn('Could not fetch capacity groups', e);
    }
    const matchedGroup = groups.find((g: any) => 
      Array.isArray(g.factories) && g.factories.some((f: string) => f.toLowerCase() === factory.toLowerCase())
    );

    const groupFactories: string[] = matchedGroup?.factories && matchedGroup.factories.length > 0 
      ? matchedGroup.factories 
      : [factory];

    // If capacity data is not found or invalid, default to Unlimited (-1)
    const rawMax = matchedGroup?.maxDailySmv ?? matchedGroup?.maxDailyRequests;
    const maxDailySmv = matchedGroup && rawMax !== undefined && rawMax !== null && Number(rawMax) > 0
      ? Number(rawMax)
      : -1; // -1 = Unlimited capacity

    let totalUsedSmv = 0;
    if (maxDailySmv > 0) {
      for (const f of groupFactories) {
        try {
          const usage = await tccService.getFactoryCapacityUsage(f, date);
          const factoryUsed = Number(usage?.usedSmv ?? usage?.used ?? usage?.currentUsage ?? 0);
          totalUsedSmv += factoryUsed;
        } catch (e) {
          console.warn(`Failed capacity usage fetch for factory ${f}`, e);
        }
      }
    }

    const availableSmv = maxDailySmv > 0 ? Math.max(0, maxDailySmv - totalUsedSmv) : 999999;
    return {
      groupName: matchedGroup?.groupName || factory,
      factories: groupFactories,
      maxDailySmv,
      usedSmv: totalUsedSmv,
      availableSmv
    };
  },

  // Queue Management
  getQueuedRequests: async (): Promise<any[]> => {
    try {
      const res = await authFetch('/tcc/requests');
      if (res.ok) {
        const allList = await res.json();
        const all: TccRequest[] = Array.isArray(allList) ? allList : (allList?.data || []);
        return all.filter(isQueuedRequest);
      }
    } catch (e) {
      console.error('Failed to load queued requests', e);
    }
    return [];
  },
  approveQueuedRequest: async (requestId: string): Promise<any> => {
    const res = await authFetch(`/tcc/queue/${encodeURIComponent(requestId)}/approve`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'API error: ' + res.status);
    }
    return res.json();
  },
  rescheduleQueuedRequest: async (requestId: string, newDate: string, remarks?: string): Promise<any> => {
    const res = await authFetch(`/tcc/queue/${encodeURIComponent(requestId)}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newDate, remarks })
    });
    if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.message || 'API error: ' + res.status);
    }
    return res.json();
  },
  rejectQueuedRequest: async (requestId: string, remarks?: string): Promise<any> => {
    const res = await authFetch(`/tcc/queue/${encodeURIComponent(requestId)}/reject`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remarks })
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  },

  // SMV Config Management
  getSmvConfigs: async (): Promise<SmvConfigRule[]> => {
    try {
      const res = await authFetch('/tcc/config/SMV_CONFIG');
      if (res.ok) {
        const json = await res.json();
        const configVal = json?.data?.configValue || json?.configValue;
        if (configVal) return JSON.parse(configVal);
      }
    } catch (e) {
      console.warn('Failed to fetch SMV_CONFIG from API, checking local storage', e);
    }
    const local = localStorage.getItem('TCC_SMV_CONFIG');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error(e);
      }
    }
    // Default seed rules if empty
    const seedRules: SmvConfigRule[] = [
      { id: 1, commonOperation: 'Attach collar', sampleStage: 'P2', templateCategory: 'Easy', sam: 30 },
      { id: 2, commonOperation: 'Attach collar', sampleStage: 'SMS', templateCategory: 'Medium', sam: 50 },
      { id: 3, commonOperation: 'Hemming', sampleStage: 'SMS', templateCategory: 'Easy', sam: 20 },
      { id: 4, commonOperation: 'Sewing pocket', sampleStage: 'PP', templateCategory: 'Hard', sam: 65 }
    ];
    localStorage.setItem('TCC_SMV_CONFIG', JSON.stringify(seedRules));
    return seedRules;
  },

  saveSmvConfigs: async (rules: SmvConfigRule[]): Promise<any> => {
    localStorage.setItem('TCC_SMV_CONFIG', JSON.stringify(rules));
    try {
      const res = await authFetch('/tcc/config/SMV_CONFIG', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configValue: JSON.stringify(rules) })
      });
      if (res.ok) return res.json();
    } catch (e) {
      console.warn('Saved SMV_CONFIG to localStorage (API unavailable)', e);
    }
    return { success: true };
  },

  // Operation Config Management
  getOperationConfigs: async (): Promise<OperationItem[]> => {
    try {
      const res = await authFetch('/tcc/config/OPERATION_CONFIG');
      if (res.ok) {
        const json = await res.json();
        const configVal = json?.data?.configValue || json?.configValue;
        if (configVal) return JSON.parse(configVal);
      }
    } catch (e) {
      console.warn('Failed to fetch OPERATION_CONFIG from API, checking local storage', e);
    }
    const local = localStorage.getItem('TCC_OPERATION_CONFIG');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error(e);
      }
    }
    // Default seed rules if empty
    const seedOperations: OperationItem[] = [
  {
    "id": "op_1",
    "group": "Polo",
    "name": "1. Attach plastic + join inner /outer collar  /Cổ lá 2 có miếng nhựa",
    "difficulty": "Medium"
  },
  {
    "id": "op_2",
    "group": "Polo",
    "name": "2. Attach collar stand to collar  /Cổ lá 3",
    "difficulty": "Medium"
  },
  {
    "id": "op_3",
    "group": "Polo",
    "name": "3. Attach placket  / Trụ cổ",
    "difficulty": "Medium"
  },
  {
    "id": "op_4",
    "group": "Polo",
    "name": "4.Trim flatknit collar  / Gọt cổ",
    "difficulty": "Easy"
  },
  {
    "id": "op_5",
    "group": "Polo",
    "name": "5. Trim Flatknit insert front collar  / Gọt phối cổ",
    "difficulty": "Easy"
  },
  {
    "id": "op_6",
    "group": "Polo",
    "name": "6. Attach halfmoon  / Đính bán nguyệt",
    "difficulty": "Complex"
  },
  {
    "id": "op_7",
    "group": "Polo",
    "name": "7. Attack logo  /Đính - diễu logo",
    "difficulty": "Easy"
  },
  {
    "id": "op_8",
    "group": "Polo",
    "name": "8. Others / New / Khác / Mới",
    "difficulty": "Medium"
  },
  {
    "id": "op_9",
    "group": "Pants / Shorts / Skirt",
    "name": "1. Set pocket opening with zipper + welt +  lower bag + cut laser pocket opening  /Túi cơi dây kéo - Đính dây kéo + cơi + lót túi dưới + cắt laser",
    "difficulty": "Complex"
  },
  {
    "id": "op_10",
    "group": "Pants / Shorts / Skirt",
    "name": "2. Set pocket opening with zipper +  lower bag + cut laser pocket opening  / Túi dây kéo - Dính dây kéo + lót túi dưới + cắt laser",
    "difficulty": "Complex"
  },
  {
    "id": "op_11",
    "group": "Pants / Shorts / Skirt",
    "name": "3. set side pocket opening with zipper + upper bag / Túi xếp có dây kéo - Đính dây kéo + lót túi trên",
    "difficulty": "Complex"
  },
  {
    "id": "op_12",
    "group": "Pants / Shorts / Skirt",
    "name": "4. Set side pocket with zipper +welt +  upper bag / Túi cơi dây kéo - Đính dây kéo + cơi + lót túi trên",
    "difficulty": "Medium"
  },
  {
    "id": "op_13",
    "group": "Pants / Shorts / Skirt",
    "name": "5. Set side pocket self welt + upper bag / Túi xếp - Đính lót túi trên",
    "difficulty": "Easy"
  },
  {
    "id": "op_14",
    "group": "Pants / Shorts / Skirt",
    "name": "6. Set pocket opening + upper & lower bag + cut laser pocket opening / Đính lót túi trên + dưới + cắt laser",
    "difficulty": "Medium"
  },
  {
    "id": "op_15",
    "group": "Pants / Shorts / Skirt",
    "name": "7. Set back pocket with welt +zipper   lower bag + cut laser pocket opening / Túi sau có cơi - Đính cơi + dây kéo + lót túi dưới + cắt laser",
    "difficulty": "Medium"
  },
  {
    "id": "op_16",
    "group": "Pants / Shorts / Skirt",
    "name": "8. Set back pocket with lower & upper bag + cut laser pocket opening / May túi sau - Đính lót túi trên + dưới + cắt laser",
    "difficulty": "Medium"
  },
  {
    "id": "op_17",
    "group": "Pants / Shorts / Skirt",
    "name": "9. Set back pocket with zipper + lower bag + cut laser pocket opening  /May túi sau có dây kéo - Đính lót túi dưới + cắt laser",
    "difficulty": "Complex"
  },
  {
    "id": "op_18",
    "group": "Pants / Shorts / Skirt",
    "name": "10. Sew dart  / May pen",
    "difficulty": "Easy"
  },
  {
    "id": "op_19",
    "group": "Pants / Shorts / Skirt",
    "name": "11. Attach fold topstitch lower facing pocket bag  / Đính đáp túi + lược",
    "difficulty": "Easy"
  },
  {
    "id": "op_20",
    "group": "Pants / Shorts / Skirt",
    "name": "12. Attach Patch pocket  /Túi đắp - Đính túi đắp",
    "difficulty": "Complex"
  },
  {
    "id": "op_21",
    "group": "Pants / Shorts / Skirt",
    "name": "13. attach concealled zipper /Tra dây kéo",
    "difficulty": "Medium"
  },
  {
    "id": "op_22",
    "group": "Pants / Shorts / Skirt",
    "name": "14. J design / Diễu J",
    "difficulty": "Medium"
  },
  {
    "id": "op_23",
    "group": "Pants / Shorts / Skirt",
    "name": "15. Attach logo / Đính - diễu logo",
    "difficulty": "Easy"
  },
  {
    "id": "op_24",
    "group": "Pants / Shorts / Skirt",
    "name": "16. Join Flaps  / Ráp nắp",
    "difficulty": "Easy"
  },
  {
    "id": "op_25",
    "group": "Pants / Shorts / Skirt",
    "name": "17. Attach leg zipper  / Đính dây kéo ống",
    "difficulty": "Medium"
  },
  {
    "id": "op_26",
    "group": "Pants / Shorts / Skirt",
    "name": "18. Others / New / Khác / Mới",
    "difficulty": "Medium"
  },
  {
    "id": "op_27",
    "group": "Jacket / Vest",
    "name": "1. Set pocket opening with zipper + welt +  lower bag + cut laser pocket opening  / Túi cơi dây kéo - Đính dây kéo + cơi + lót túi dưới + cắt laser",
    "difficulty": "Complex"
  },
  {
    "id": "op_28",
    "group": "Jacket / Vest",
    "name": "2. Set pocket opening + upper & lower bag + cut laser pocket opening  / Túi xếp - Đính lót túi trên + dưới + cắt laser",
    "difficulty": "Complex"
  },
  {
    "id": "op_29",
    "group": "Jacket / Vest",
    "name": "3. set side pocket opening with zipper + upper bag / Túi xếp có dây kéo - Đính dây kéo + lót túi trên",
    "difficulty": "Medium"
  },
  {
    "id": "op_30",
    "group": "Jacket / Vest",
    "name": "4. Set side pocket with zipper +welt +  upper bag / Túi cơi dây kéo - Đính dây kéo + cơi + lót túi trên",
    "difficulty": "Medium"
  },
  {
    "id": "op_31",
    "group": "Jacket / Vest",
    "name": "5. Set pocket opening + upper bag +cut laser pocket opening  /Túi xếp - Đính lót túi trên + cắt laser",
    "difficulty": "Medium"
  },
  {
    "id": "op_32",
    "group": "Jacket / Vest",
    "name": "6.Set side pocket Self welt + upper bag / Túi xếp - Đính lót túi trên",
    "difficulty": "Easy"
  },
  {
    "id": "op_33",
    "group": "Jacket / Vest",
    "name": "7. Sew dart /May pen",
    "difficulty": "Easy"
  },
  {
    "id": "op_34",
    "group": "Jacket / Vest",
    "name": "8. Attach fold topstitch lower facing pocket bag  /Đính - diễu đáp túi vào lót túi dưới",
    "difficulty": "Medium"
  },
  {
    "id": "op_35",
    "group": "Jacket / Vest",
    "name": "9. Attach Patch pocket /Túi đắp - Đính túi đắp",
    "difficulty": "Complex"
  },
  {
    "id": "op_36",
    "group": "Jacket / Vest",
    "name": "10. attach logo / Đính - diễu logo",
    "difficulty": "Medium"
  },
  {
    "id": "op_37",
    "group": "Jacket / Vest",
    "name": "11. Join inner & outer collar  / Cổ lá 2 - Ráp cổ trong + ngoài",
    "difficulty": "Medium"
  },
  {
    "id": "op_38",
    "group": "Jacket / Vest",
    "name": "12. Attach Front Zipper + stormflaps or garage  / Tra dây kéo thân trước + che dây kéo",
    "difficulty": "Complex"
  },
  {
    "id": "op_39",
    "group": "Jacket / Vest",
    "name": "13. Trim collar Flatknit / Gọt cổ phụ liệu",
    "difficulty": "Easy"
  },
  {
    "id": "op_40",
    "group": "Jacket / Vest",
    "name": "14. Attach placket  / Đính trụ",
    "difficulty": "Medium"
  },
  {
    "id": "op_41",
    "group": "Jacket / Vest",
    "name": "15. attach halfmoon  / Đính bán nguyệt",
    "difficulty": "Complex"
  },
  {
    "id": "op_42",
    "group": "Jacket / Vest",
    "name": "16, Attach half zipper  / Tra dây kéo 1/4",
    "difficulty": "Medium"
  },
  {
    "id": "op_43",
    "group": "Jacket / Vest",
    "name": "17. Attach storm flap To zipper  / Đính che dây kéo vào dây kéo",
    "difficulty": "Medium"
  },
  {
    "id": "op_44",
    "group": "Jacket / Vest",
    "name": "18. Join inner& outer collar stand  / Ráp chân cổ trong + ngoài",
    "difficulty": "Medium"
  },
  {
    "id": "op_45",
    "group": "Jacket / Vest",
    "name": "19. Others / New /Khác / Mới",
    "difficulty": "Medium"
  },
  {
    "id": "op_46",
    "group": "Dress / Sleeveless",
    "name": "1. Set pocket opening with zipper + welt +  lower bag + cut laser pocket opening  / Túi cơi dây kéo - Đính dây kéo + cơi + lót túi dưới + cắt laser",
    "difficulty": "Complex"
  },
  {
    "id": "op_47",
    "group": "Dress / Sleeveless",
    "name": "2. Set pocket opening + upper & lower bag + cut laser pocket opening  /Túi xếp - Đính lót túi trên + dưới + cắt laser",
    "difficulty": "Complex"
  },
  {
    "id": "op_48",
    "group": "Dress / Sleeveless",
    "name": "3. set side pocket opening with zipper + upper bag + cut laser pocket opening  /Túi sườn dây kéo - Đính dây kéo + lót túi trên + cắt laser",
    "difficulty": "Medium"
  },
  {
    "id": "op_49",
    "group": "Dress / Sleeveless",
    "name": "4. Set pocket opening + upper bag + cut laser pocket opening  /Túi xếp - Đính lót túi trên + cắt laser",
    "difficulty": "Medium"
  },
  {
    "id": "op_50",
    "group": "Dress / Sleeveless",
    "name": "5. Set back pocket with lower & upper bag + cut laser pocket opening / May túi sau - Đính lót túi trên + dưới + cắt laser",
    "difficulty": "Medium"
  },
  {
    "id": "op_51",
    "group": "Dress / Sleeveless",
    "name": "6. Set back pocket with zipper + lower bag + cut laser pocket opening   /May túi sau có dây kéo - Đính lót túi dưới + cắt laser",
    "difficulty": "Medium"
  },
  {
    "id": "op_52",
    "group": "Dress / Sleeveless",
    "name": "7. Sew dart  / May pen",
    "difficulty": "Easy"
  },
  {
    "id": "op_53",
    "group": "Dress / Sleeveless",
    "name": "8. Attach fold T/S lower facing pocket bag /  Đính - diễu đáp túi vào lót túi dưới",
    "difficulty": "Medium"
  },
  {
    "id": "op_54",
    "group": "Dress / Sleeveless",
    "name": "9. Attach Patch pocket / Túi đắp - Đính túi đắp",
    "difficulty": "Complex"
  },
  {
    "id": "op_55",
    "group": "Dress / Sleeveless",
    "name": "10. Attach logo / Đính - diễu logo",
    "difficulty": "Medium"
  },
  {
    "id": "op_56",
    "group": "Dress / Sleeveless",
    "name": "11. Attach halfmoon  /Đính bán nguyệt",
    "difficulty": "Complex"
  },
  {
    "id": "op_57",
    "group": "Dress / Sleeveless",
    "name": "12. Attach half front zipper + garage  /Đính dây kéo 1/4",
    "difficulty": "Complex"
  },
  {
    "id": "op_58",
    "group": "Dress / Sleeveless",
    "name": "13. Trim flatknit /Gọt cổ phụ liệu",
    "difficulty": "Easy"
  },
  {
    "id": "op_59",
    "group": "Dress / Sleeveless",
    "name": "14. Attach placket /  Đính trụ",
    "difficulty": "Medium"
  },
  {
    "id": "op_60",
    "group": "Dress / Sleeveless",
    "name": "15. join inner &outer collar   /Ráp cổ trong + ngoài",
    "difficulty": "Medium"
  },
  {
    "id": "op_61",
    "group": "Dress / Sleeveless",
    "name": "16. Others / New  Khác / Mới",
    "difficulty": "Medium"
  },
  {
    "id": "op_62",
    "group": "Tshirt / Long/short sleeve",
    "name": "1. Trim flatknit collar  / Gọt cổ phụ liệu",
    "difficulty": "Easy"
  },
  {
    "id": "op_63",
    "group": "Tshirt / Long/short sleeve",
    "name": "2. Attach logo  / Đính - diễu logo",
    "difficulty": "Easy"
  },
  {
    "id": "op_64",
    "group": "Tshirt / Long/short sleeve",
    "name": "3. attach placket  / Đính trụ",
    "difficulty": "Medium"
  },
  {
    "id": "op_65",
    "group": "Tshirt / Long/short sleeve",
    "name": "4. Attach collar to front panel / Lược cổ vào thân",
    "difficulty": "Easy"
  },
  {
    "id": "op_66",
    "group": "Tshirt / Long/short sleeve",
    "name": "5. attach patch pocket  /Túi đắp - Đính túi đắp",
    "difficulty": "Complex"
  },
  {
    "id": "op_67",
    "group": "Tshirt / Long/short sleeve",
    "name": "6. join inner outer collar  /Ráp cổ trong + ngoài",
    "difficulty": "Medium"
  },
  {
    "id": "op_68",
    "group": "Tshirt / Long/short sleeve",
    "name": "7. Others / New / Khác / Mới",
    "difficulty": "Medium"
  }
];
    localStorage.setItem('TCC_OPERATION_CONFIG', JSON.stringify(seedOperations));
    return seedOperations;
  },

  saveOperationConfigs: async (items: OperationItem[]): Promise<any> => {
    localStorage.setItem('TCC_OPERATION_CONFIG', JSON.stringify(items));
    try {
      const res = await authFetch('/tcc/config/OPERATION_CONFIG', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configValue: JSON.stringify(items) })
      });
      if (res.ok) return res.json();
    } catch (e) {
      console.warn('Saved OPERATION_CONFIG to localStorage (API unavailable)', e);
    }
    return { success: true };
  }

};

export interface SmvConfigRule {
  id: number | string;
  commonOperation: string;
  sampleStage: string;
  templateCategory: string;
  sam: number;
}


export interface OperationItem {
  id: string;
  group: string;
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Complex';
  sam?: number;
  stage?: string;
}
