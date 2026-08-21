import { authFetch, authService } from '@traxeco/shared';

function getUserName() {
  return authService.getUserInfo()?.employeeCode || 'unknown';
}

function getFactory() {
  return authService.getUserInfo()?.factory || 'unknown';
}

function getCustomer() {
  return localStorage.getItem('qcacc_customer') || 'Adidas';
}

export const qcAccessoryApi = {
  // Search Invoice
  searchInvoice: (invoiceNumber: string) =>
    authFetch('/qc-accessory/search-invoice', {
      method: 'POST',
      body: JSON.stringify({ invoiceNumber }),
    }),

  // Pick items for QC
  pickItems: (ids: string[]) =>
    authFetch('/qc-accessory/pick-items', {
      method: 'POST',
      body: JSON.stringify({ ids, userName: getUserName(), fac: getFactory() }),
    }),

  // Get AQL Levels
  getAQLLevels: (customer?: string) =>
    authFetch(`/qc-accessory/aql-levels?customer=${customer || getCustomer()}`),

  // Get Defect Codes
  getDefectCodes: () =>
    authFetch('/qc-accessory/defect-codes'),

  // Add Defect
  addDefect: (ids: string[], code: string, qty: number, image: string) =>
    authFetch('/qc-accessory/add-defect', {
      method: 'POST',
      body: JSON.stringify({ ids, code, qty, image, createdBy: getUserName() }),
    }),

  // Remove/Reduce Defect
  removeDefect: (id: string, code: string) =>
    authFetch('/qc-accessory/remove-defect', {
      method: 'DELETE',
      body: JSON.stringify({ id, code }),
    }),

  // Update QC Result (Pass/Fail)
  updateResult: (ids: string[], result: string, remark: string, metal: number) =>
    authFetch('/qc-accessory/update-result', {
      method: 'PUT',
      body: JSON.stringify({ ids, result, remark, metal, userName: getUserName() }),
    }),

  // Update Humidity
  updateHumidity: (ids: string[], humidity: number) =>
    authFetch('/qc-accessory/update-humidity', {
      method: 'PUT',
      body: JSON.stringify({ ids, humidity }),
    }),

  // Approval
  approval: (ids: string[], status: string) =>
    authFetch('/qc-accessory/approval', {
      method: 'POST',
      body: JSON.stringify({ ids, status, userName: getUserName() }),
    }),

  // Search History
  searchHistory: (dateFrom: string, dateTo: string) =>
    authFetch('/qc-accessory/history', {
      method: 'POST',
      body: JSON.stringify({ fac: getFactory(), dateFrom, dateTo }),
    }),

  // Get Defect Detail
  getDefectDetail: (id: string) =>
    authFetch(`/qc-accessory/defect-detail?id=${id}`),

  // Upload Image
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return authFetch('/qc-accessory/upload-image', {
      method: 'POST',
      body: formData,
    });
  },

  // Refresh Invoice
  refreshInvoice: () =>
    authFetch('/qc-accessory/refresh-invoice'),

  // Delete Inspection (soft delete)
  deleteInspection: (ids: string[]) =>
    authFetch('/qc-accessory/delete-inspection', {
      method: 'PUT',
      body: JSON.stringify({ ids, userName: getUserName() }),
    }),

  // Get Job Detail
  getJobDetail: (ids: string[]) =>
    authFetch('/qc-accessory/job-detail', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
};
