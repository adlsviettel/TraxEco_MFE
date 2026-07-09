import { useMemo } from 'react';
import { type TccRequest } from '../services/tccService';

export const useChartData = (filteredRequests: TccRequest[]) => {
  const chartsData = useMemo(() => {
    if (!filteredRequests || filteredRequests.length === 0) {
      return {
        byMonth: [],
        byCustomer: [],
        byProductType: [],
        inProgressByFactory: [],
        outputByFactory: [],
        avgWorkingDaysByFactory: []
      };
    }

    const monthMap: Record<string, number> = {};
    const customerMap: Record<string, number> = {};
    const productTypeMap: Record<string, number> = {};
    const inProgressFactoryMap: Record<string, number> = {};
    const outputQtyFactoryMap: Record<string, number> = {};
    const workingDaysFactoryMap: Record<string, { totalDays: number; count: number }> = {};

    filteredRequests.forEach(req => {
      // 1. Monthly Input (Monthly volume)
      if (req.createdAt) {
        try {
          const date = new Date(req.createdAt);
          if (!isNaN(date.getTime())) {
            const monthName = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            monthMap[monthName] = (monthMap[monthName] || 0) + 1;
          }
        } catch {
          const monthYear = req.monthYear;
          if (monthYear && monthYear !== 'Unknown') {
            monthMap[monthYear] = (monthMap[monthYear] || 0) + 1;
          }
        }
      }

      // 2. Customer distribution
      if (req.customer) {
        const cust = req.customer;
        customerMap[cust] = (customerMap[cust] || 0) + 1;
      }

      // 3. Product Type Breakdown
      if (req.productType) {
        const pType = req.productType;
        productTypeMap[pType] = (productTypeMap[pType] || 0) + 1;
      }

      // 4. In Progress by Factory (Status = 'Work in Progress')
      if (req.status === 'Work in Progress' && req.factory) {
        const fact = req.factory;
        inProgressFactoryMap[fact] = (inProgressFactoryMap[fact] || 0) + 1;
      }

      // 5. Output by Factory (Sum of templateQty for Completed/Released requests)
      if ((req.status === 'Completed' || req.releasedDate) && req.factory) {
        const fact = req.factory;
        const qty = Number(req.templateQty) || 0;
        outputQtyFactoryMap[fact] = (outputQtyFactoryMap[fact] || 0) + qty;
      }

      // 6. Avg Working Days by Factory (finishedDate vs startDate)
      if (req.startDate && req.finishedDate && req.factory) {
        try {
          const start = new Date(req.startDate);
          const end = new Date(req.finishedDate);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const diffTime = end.getTime() - start.getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            if (diffDays >= 0) {
              const fact = req.factory;
              if (!workingDaysFactoryMap[fact]) {
                workingDaysFactoryMap[fact] = { totalDays: 0, count: 0 };
              }
              workingDaysFactoryMap[fact].totalDays += diffDays;
              workingDaysFactoryMap[fact].count += 1;
            }
          }
        } catch {}
      }
    });

    const byMonth = Object.entries(monthMap).map(([month, count]) => ({ month, count }));
    const byCustomer = Object.entries(customerMap).map(([customer, count]) => ({ customer, count }));
    const byProductType = Object.entries(productTypeMap).map(([productType, count]) => ({ productType, count }));
    const inProgressByFactory = Object.entries(inProgressFactoryMap).map(([factory, count]) => ({ factory, count }));
    const outputByFactory = Object.entries(outputQtyFactoryMap).map(([factory, count]) => ({ factory, count }));
    const avgWorkingDaysByFactory = Object.entries(workingDaysFactoryMap).map(([factory, val]) => ({
      factory,
      avgDays: Number((val.totalDays / val.count).toFixed(2))
    }));

    return {
      byMonth,
      byCustomer,
      byProductType,
      inProgressByFactory,
      outputByFactory,
      avgWorkingDaysByFactory
    };
  }, [filteredRequests]);

  const totalCustomerCount = useMemo(() => {
    return chartsData.byCustomer.reduce((sum, item) => sum + (item.count || 0), 0);
  }, [chartsData]);

  const sortedCustomers = useMemo(() => {
    return [...chartsData.byCustomer].sort((a, b) => (b.count || 0) - (a.count || 0));
  }, [chartsData]);

  return {
    chartsData,
    totalCustomerCount,
    sortedCustomers
  };
};
