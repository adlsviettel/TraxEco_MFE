import { useState, useMemo } from 'react';
import { type TccRequest } from '../services/tccService';

export const useDateFilter = (requests: TccRequest[]) => {
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [preset, setPreset] = useState<string>('All Time');

  const handlePresetChange = (selectedPreset: string) => {
    setPreset(selectedPreset);
    if (selectedPreset === 'All Time') {
      setFromDate('');
      setToDate('');
      return;
    }
    
    const now = new Date();
    let start: Date;
    let end: Date = now;
    
    if (selectedPreset === 'This Week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end = new Date();
    } else if (selectedPreset === 'This Month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date();
    } else if (selectedPreset === 'This Year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date();
    } else {
      return;
    }

    const p = (n: number) => n.toString().padStart(2, '0');
    setFromDate(`${start.getFullYear()}-${p(start.getMonth() + 1)}-${p(start.getDate())}`);
    setToDate(`${end.getFullYear()}-${p(end.getMonth() + 1)}-${p(end.getDate())}`);
  };

  const filteredRequests = useMemo(() => {
    if (!requests || requests.length === 0) return [];
    return requests.filter(req => {
      if (!req.createdAt) return false;
      try {
        const reqDate = new Date(req.createdAt);
        if (isNaN(reqDate.getTime())) return false;
        
        const reqDateOnly = new Date(reqDate.getFullYear(), reqDate.getMonth(), reqDate.getDate());
        
        if (fromDate) {
          const parts = fromDate.split('-');
          const from = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          if (reqDateOnly < from) return false;
        }
        
        if (toDate) {
          const parts = toDate.split('-');
          const to = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          if (reqDateOnly > to) return false;
        }
        
        return true;
      } catch {
        return false;
      }
    });
  }, [requests, fromDate, toDate]);

  const clearFilters = () => {
    setPreset('All Time');
    setFromDate('');
    setToDate('');
  };

  return {
    fromDate,
    toDate,
    preset,
    setFromDate,
    setToDate,
    setPreset,
    handlePresetChange,
    filteredRequests,
    clearFilters
  };
};
