import { useState, useCallback, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { tccService, type TccRequest, type RequestFilters } from '../services/tccService';
import { authService } from '@traxeco/shared';

export function useRequestData(
  showSnackbar: (msg: string, severity: 'success' | 'error') => void,
  t: any
) {
  const [requests, setRequests] = useState<TccRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState<RequestFilters>({
    customer: '',
    factory: '',
    season: '',
    status: '',
  });
  
  const [customers, setCustomers] = useState<string[]>([]);
  const [factories, setFactories] = useState<string[]>([]);
  
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [localColumnFilters, setLocalColumnFilters] = useState<Record<string, string[]>>({});

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      let data = await tccService.getRequests(filters);
      
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - 15);
      
      // Filter out Released requests, and limit Rejected/Cancelled/Deleted to 15 days
      data = data.filter(r => {
        if (r.releasedDate) return false;
        
        const statusLower = (r.status || '').toLowerCase();
        if (statusLower === 'rejected' || statusLower === 'cancelled' || statusLower === 'deleted' || statusLower === 'reject' || statusLower === 'cancel') {
          if (!r.createdAt) return false;
          return new Date(r.createdAt) >= limitDate;
        }
        return true;
      });
      
      const userInfo = authService.getUserInfo();
      const isSuperAdmin = authService.isSuperAdmin();
      const isAdmin = authService.isAdmin();
      const hasViewAllPerm = authService.hasAction('tcc_tracking', 'canBypassCheck');
      const canViewAll = isSuperAdmin || isAdmin || hasViewAllPerm;

      if (canViewAll) {
        setRequests(data);
      } else {
        const filtered = data.filter((r) => {
          if (!r.requesterName) return false;
          const reqLower = r.requesterName.trim().toLowerCase();
          const codeLower = userInfo.employeeCode.trim().toLowerCase();
          const nameLower = userInfo.employeeName.trim().toLowerCase();
          return reqLower === codeLower || 
                 reqLower === nameLower || 
                 reqLower.startsWith(codeLower + ' -');
        });
        setRequests(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch requests', error);
      showSnackbar(t('tcc.fetchError', 'Không thể tải danh sách yêu cầu'), 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, t, showSnackbar]);

  const handleFilterChange = useCallback((field: keyof RequestFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-filter requests using columnFilters
  const filteredRequests = useMemo(() => {
    const filterEntries = Object.entries(columnFilters);
    if (filterEntries.length === 0) return requests;
    return requests.filter(row => {
      return filterEntries.every(([field, allowedValues]) => {
        if (!allowedValues || allowedValues.length === 0) return true;
        let val: any;
        if (field === 'status') {
          val = row.releasedDate ? 'Released' : (row.status || 'Not Started');
        } else {
          val = (row as any)[field];
          if (val && (field.toLowerCase().includes('date') || field.endsWith('At'))) {
            try {
              val = format(new Date(val), 'dd/MM/yyyy');
            } catch { /* fallback */ }
          }
        }
        val = (val !== undefined && val !== null && val !== '') ? String(val) : '(Blanks)';
        return allowedValues.includes(val);
      });
    });
  }, [requests, columnFilters]);

  // Load metadata on init
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const data = await tccService.getMetadata();
        if (data.customer && data.customer.length > 0) {
          setCustomers(data.customer);
        }
        if (data.factory && data.factory.length > 0) {
          setFactories(data.factory);
        }
      } catch (error) {
        console.error('Failed to load metadata for filters', error);
      }
    };
    loadMetadata();
  }, []);

  return {
    requests,
    setRequests,
    loading,
    setLoading,
    filters,
    customers,
    factories,
    columnFilters,
    setColumnFilters,
    localColumnFilters,
    setLocalColumnFilters,
    filteredRequests,
    fetchRequests,
    handleFilterChange,
    handleApplyFilters
  };
}
