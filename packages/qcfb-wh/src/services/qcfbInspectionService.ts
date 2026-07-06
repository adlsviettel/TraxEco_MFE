import { authFetch, authService } from '@traxeco/shared';

function getUserName() {
  return authService.getUserInfo()?.employeeCode || 'unknown';
}

function getFactory() {
  return authService.getUserInfo()?.factory || 'unknown';
}

export interface AddDefectRequest {
  qrCode: string;
  defectCode: string;
  point: string;
  qty: number;
  yard: number;
  imgLink: string;
  username: string;
  factory: string;
}

export const qcfbInspectionService = {
  checkRoll: (qrCode: string) => authFetch('/qcfb/roll/check', { method: 'POST', body: JSON.stringify({ qrCode }) }),
  initRoll: (qrCode: string) => authFetch('/qcfb/roll/init', { method: 'POST', body: JSON.stringify({ qrCode, username: getUserName(), factory: getFactory() }) }),
  getRollInfo: (qrCode: string) => authFetch('/qcfb/roll/info', { method: 'POST', body: JSON.stringify({ qrCode }) }),
  updateField: (qrCode: string, field: string, value: string) => authFetch('/qcfb/roll/update', { method: 'PUT', body: JSON.stringify({ qrCode, field, value }) }),
  addDefect: (data: AddDefectRequest) => authFetch('/qcfb/defect/add', { method: 'POST', body: JSON.stringify(data) }),
  getDefects: (qrCode: string) => authFetch('/qcfb/defect/list', { method: 'POST', body: JSON.stringify({ qrCode }) }),
  deleteDefect: (qrCode: string, code: string, point: string) => authFetch('/qcfb/defect/delete', { method: 'DELETE', body: JSON.stringify({ qrCode, defectCode: code, defectPoint: point }) }),
  clearAllDefects: (qrCode: string) => authFetch('/qcfb/defect/delete-all', { method: 'DELETE', body: JSON.stringify({ qrCode }) }),
  changeDefectQty: (qrCode: string, code: string, point: string, qty: number) => authFetch('/qcfb/defect/change-qty', { method: 'PUT', body: JSON.stringify({ qrCode, defectCode: code, defectPoint: point, newQty: qty }) }),
  getDefectMasters: () => authFetch('/qcfb/defects'),
  getCustomers: () => authFetch('/qcfb/customers'),
  getNotes: (factory: string) => authFetch(`/qcfb/notes?factory=${factory}`),
  uploadImage: (file: File) => { const fd = new FormData(); fd.append('file', file); return authFetch('/qcfb/image/upload', { method: 'POST', body: fd }); },
  completeInspection: (qrCode: string) => authFetch('/qcfb/roll/complete', { method: 'POST', body: JSON.stringify({ qrCode }) }),
  // History
  getHistory: () => authFetch('/qcfb/history', { method: 'POST', body: JSON.stringify({ username: getUserName() }) }),
  getHistoryDefects: (qrCode: string) => authFetch('/qcfb/history/defects', { method: 'POST', body: JSON.stringify({ qrCode }) }),
  getLocations: (factory: string) => authFetch(`/qcfb/locations?factory=${factory}`),
  updateLocations: (qrCodes: string[], location: string) => authFetch('/qcfb/location/update', { method: 'PUT', body: JSON.stringify({ qrCodes, location, username: getUserName(), factory: getFactory() }) }),
};
