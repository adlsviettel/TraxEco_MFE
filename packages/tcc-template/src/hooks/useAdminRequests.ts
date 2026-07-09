import { useState, useCallback, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { tccService, type TccRequest, type RequestFilters } from '../services/tccService';
import { permissionService } from '@traxeco/shared';

const getTodayString = (date = new Date()) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getPastDateString = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return getTodayString(date);
};

export function useAdminRequests(
  showSnackbar: (msg: string, severity: 'success' | 'error') => void,
  t: any
) {
  const [requests, setRequests] = useState<TccRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState<string>(getPastDateString(30));
  const [toDate, setToDate] = useState<string>(getTodayString());

  const [filters, setFilters] = useState<RequestFilters>({
    customer: '',
    factory: '',
    season: '',
  });

  const [developers, setDevelopers] = useState<string[]>([
    'Phoung', 'Tam', 'Lam', 'Quan', 'Phuoc', 'Di', 'Hoan'
  ]);
  const [customers, setCustomers] = useState<string[]>([]);
  const [factories, setFactories] = useState<string[]>([]);

  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [localColumnFilters, setLocalColumnFilters] = useState<Record<string, string[]>>({});

  const fetchRequests = useCallback(async (overrideFilters?: RequestFilters & { fromDate?: string; toDate?: string }) => {
    setLoading(true);
    try {
      const activeFilters: RequestFilters = overrideFilters || {
        ...filters,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      };
      const data = await tccService.getRequests(activeFilters);
      setError(null);
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch requests', error);
      setError(t('tcc.fetchError', 'Không thể tải danh sách yêu cầu'));
      showSnackbar(t('tcc.fetchError', 'Không thể tải danh sách yêu cầu'), 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, fromDate, toDate, t, showSnackbar]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = useCallback((field: keyof RequestFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Pre-filter requests using columnFilters (for multi-column filter on Community DataGrid)
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

  // Load Metadata
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [data, users] = await Promise.all([
          tccService.getMetadata().catch(() => ({ developer: [], customer: [], factory: [] })),
          permissionService.getAllUsers('TCC_TEMPLATE').catch(() => [])
        ]);
        
        let devSet = new Set<string>();
        // Add existing ones from state (which includes hardcoded ones initially)
        setDevelopers(prev => {
          prev.forEach(p => devSet.add(p));
          return prev;
        });

        if (data.developer && data.developer.length > 0) {
          data.developer.forEach((d: string) => devSet.add(d));
        }

        // Add users from permission list
        if (Array.isArray(users)) {
          users.forEach(u => {
            if (u.employeeName) devSet.add(u.employeeName);
          });
        }

        setDevelopers(Array.from(devSet));

        if (data.customer && data.customer.length > 0) {
          setCustomers(data.customer);
        }
        if (data.factory && data.factory.length > 0) {
          setFactories(data.factory);
        }
      } catch (error) {
        console.error('Failed to fetch metadata for filters', error);
      }
    };
    loadMetadata();
  }, []);

  return {
    requests,
    setRequests,
    loading,
    setLoading,
    error,
    setError,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    filters,
    setFilters,
    developers,
    setDevelopers,
    customers,
    factories,
    columnFilters,
    setColumnFilters,
    localColumnFilters,
    setLocalColumnFilters,
    filteredRequests,
    fetchRequests,
    handleFilterChange
  };
}
