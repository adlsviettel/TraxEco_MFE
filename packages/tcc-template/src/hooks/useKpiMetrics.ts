import React, { useMemo } from 'react';
import { type TccRequest } from '../services/tccService';
import { 
  Assignment as AssignmentIcon, 
  CheckCircle as CheckCircleIcon, 
  Autorenew as AutorenewIcon, 
  Speed as SpeedIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  HourglassEmpty as HourglassIcon
} from '@mui/icons-material';

export const useKpiMetrics = (requests: TccRequest[], filteredRequests: TccRequest[], t: any) => {
  const todayRequestCount = useMemo(() => {
    const todayStr = new Date().toDateString();
    return requests.filter(req => {
      if (!req.createdAt) return false;
      try {
        const date = new Date(req.createdAt);
        return !isNaN(date.getTime()) && date.toDateString() === todayStr;
      } catch {
        return false;
      }
    }).length;
  }, [requests]);

  const dynamicKpis = useMemo(() => {
    const totalInput = filteredRequests.length;
    const totalOutput = filteredRequests.filter(r => r.status && r.status.toLowerCase() === 'completed').length;
    const inProcess = filteredRequests.filter(r => r.status && r.status.toLowerCase() === 'work in progress').length;
    const notStarted = filteredRequests.filter(r => r.status && r.status.toLowerCase() === 'not started').length;
    const remake = filteredRequests.filter(r => r.status && r.status.toLowerCase() === 'remake').length;
    
    const completionRate = totalInput === 0 ? 0 : totalOutput / totalInput;

    let totalDays = 0;
    let countWithDates = 0;
    let totalDelivery = 0;

    filteredRequests.forEach(r => {
      if (r.status && r.status.toLowerCase() === 'completed') {
        if (r.startDate && r.finishedDate) {
          try {
            const start = new Date(r.startDate);
            const finished = new Date(r.finishedDate);
            if (!isNaN(start.getTime()) && !isNaN(finished.getTime())) {
              const diffTime = finished.getTime() - start.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              totalDays += Math.max(0, diffDays);
              countWithDates++;
            }
          } catch {}
        }
        if (r.templateQty !== null && r.templateQty !== undefined) {
          totalDelivery += Number(r.templateQty);
        }
      }
    });

    const avgWorkingDays = countWithDates === 0 ? 0 : totalDays / countWithDates;

    return {
      totalInput,
      totalOutput,
      inProcess,
      notStarted,
      remake,
      completionRate,
      avgWorkingDays,
      totalDelivery
    };
  }, [filteredRequests]);

  const kpis = useMemo(() => {
    const rawRate = dynamicKpis.completionRate * 100;
    const formattedCompletionRate = `${rawRate.toFixed(2)}%`;
    const formattedAvgWorkingDays = dynamicKpis.avgWorkingDays.toFixed(2);

    return [
      { 
        title: t('tcc.dashboard.totalInput', 'Total Input'), 
        value: dynamicKpis.totalInput, 
        icon: React.createElement(AssignmentIcon, { sx: { color: '#1b5e20', fontSize: 24 } }),
        gradient: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
      },
      { 
        title: t('tcc.dashboard.todayInput', "Today's Requests"), 
        value: todayRequestCount, 
        icon: React.createElement(AssignmentIcon, { sx: { color: '#0d9488', fontSize: 24 } }),
        gradient: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)'
      },
      { 
        title: t('tcc.dashboard.totalOutput', 'Total Output'), 
        value: dynamicKpis.totalOutput, 
        icon: React.createElement(CheckCircleIcon, { sx: { color: '#2e7d32', fontSize: 24 } }),
        gradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
      },
      { 
        title: t('tcc.dashboard.inProcess', 'In Process'), 
        value: dynamicKpis.inProcess, 
        icon: React.createElement(AutorenewIcon, { sx: { color: '#0284c7', fontSize: 24 } }),
        gradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
      },
      { 
        title: t('tcc.dashboard.notStarted', 'Not Started'), 
        value: dynamicKpis.notStarted, 
        icon: React.createElement(HourglassIcon, { sx: { color: '#475569', fontSize: 24 } }),
        gradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
      },
      { 
        title: t('tcc.dashboard.remake', 'Remake'), 
        value: dynamicKpis.remake, 
        icon: React.createElement(RefreshIcon, { sx: { color: '#ea580c', fontSize: 24 } }),
        gradient: 'linear-gradient(135deg, #fffbeb 0%, #fde68a 100%)'
      },
      { 
        title: t('tcc.dashboard.completionRate', 'Completion Rate'), 
        value: formattedCompletionRate, 
        icon: React.createElement(TrendingUpIcon, { sx: { color: '#004d40', fontSize: 24 } }),
        gradient: 'linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)'
      },
      { 
        title: t('tcc.dashboard.avgWorkingDays', 'Avg Working Day'), 
        value: formattedAvgWorkingDays, 
        icon: React.createElement(SpeedIcon, { sx: { color: '#d97706', fontSize: 24 } }),
        gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
      },
      { 
        title: t('tcc.dashboard.totalDelivery', 'Total Delivery'), 
        value: dynamicKpis.totalDelivery, 
        icon: React.createElement(AssignmentIcon, { sx: { color: '#4a148c', fontSize: 24 } }),
        gradient: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)'
      }
    ];
  }, [dynamicKpis, todayRequestCount, t]);

  return {
    kpis,
    dynamicKpis,
    todayRequestCount
  };
};
