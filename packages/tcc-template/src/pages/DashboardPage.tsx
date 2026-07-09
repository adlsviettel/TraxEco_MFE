import React, { useState } from 'react';
import { 
  Box, Typography, CircularProgress, Paper, Menu, MenuItem, ListItemIcon, ListItemText
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, LabelList
} from 'recharts';
import { 
  Print as PrintIcon,
  TableChart as ExcelIcon
} from '@mui/icons-material';
import { AppButton } from '@traxeco/shared';

// Hooks
import { useDashboardData } from '../hooks/useDashboardData';
import { useDateFilter } from '../hooks/useDateFilter';
import { useChartData } from '../hooks/useChartData';
import { useKpiMetrics } from '../hooks/useKpiMetrics';

// Utilities
import { handleExportExcel } from '../utils/dashboardExcelExport';

// Components
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DateFilterBar } from '../components/dashboard/DateFilterBar';
import { KpiCardGrid } from '../components/dashboard/KpiCardGrid';
import { ChartCard } from '../components/dashboard/ChartCard';
import { CustomerDonutChart } from '../components/dashboard/CustomerDonutChart';

export default function DashboardPage() {
  const { t } = useTranslation();
  
  // 1. Data fetching & real-time WS
  const { data, requests, loading, error, refreshing, refetch } = useDashboardData();

  // 2. Date Filtering
  const {
    fromDate, toDate, preset, setFromDate, setToDate, setPreset,
    handlePresetChange, filteredRequests, clearFilters
  } = useDateFilter(requests);

  // 3. Chart Dataset Preparation
  const { chartsData, totalCustomerCount, sortedCustomers } = useChartData(filteredRequests);

  // 4. KPI Calculations
  const { kpis } = useKpiMetrics(requests, filteredRequests, t);

  // Export Menu State
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const isExportOpen = Boolean(exportAnchorEl);

  const handleExportClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setExportAnchorEl(event.currentTarget);
  };
  
  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  const onExportExcelClick = () => {
    handleExportClose();
    handleExportExcel({ kpis, chartsData, sortedCustomers, totalCustomerCount });
  };

  if (loading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#f8fafc' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ color: '#2e7d32', mb: 2 }} />
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {t('tcc.dashboard.loading', 'Loading TCC Analytics...')}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#f8fafc', p: 3 }}>
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 1, maxWidth: 400, border: '1px solid #fee2e2' }}>
          <Typography color="error" variant="h6" gutterBottom>{t('tcc.dashboard.error', 'Failed to Load Data')}</Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>{error || 'No analytics data available.'}</Typography>
          <AppButton variant="contained" customVariant="primary" onClick={() => refetch()}>
            {t('tcc.dashboard.retry', 'Retry')}
          </AppButton>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc', overflow: 'hidden', width: '100%' }}>
      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 3 }, width: '100%' }}>
        <style>{`
          @media print {
            .MuiAppBar-root,
            .MuiDrawer-root,
            .no-print,
            header,
            footer,
            nav,
            aside,
            button,
            .MuiButtonBase-root {
              display: none !important;
            }
            
            body, html, #root {
              background-color: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              overflow: visible !important;
            }
            
            .MuiBox-root {
              overflow: visible !important;
              height: auto !important;
              max-height: none !important;
            }

            .MuiGrid-container {
              width: 100% !important;
              margin: 0 !important;
            }
            
            .MuiCard-root, .MuiPaper-root {
              page-break-inside: avoid !important;
              box-shadow: none !important;
              border: 1px solid #cbd5e1 !important;
            }
            
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>
        
        {/* Header - Slimline Layout */}
        <DashboardHeader
          refreshing={refreshing}
          onRefresh={() => refetch(true)}
          onExportClick={handleExportClick}
          t={t}
        />

        {/* Date Filters Bar */}
        <DateFilterBar
          preset={preset}
          fromDate={fromDate}
          toDate={toDate}
          onPresetChange={handlePresetChange}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          onClear={clearFilters}
          t={t}
        />

        {/* Top Row: KPI Cards Grid */}
        <KpiCardGrid kpis={kpis} />

        {/* 6-Charts Layout Grid */}
        <Box 
          sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' }, 
            gap: 3, 
            width: '100%' 
          }}
        >
          {/* Chart 1: Monthly Input (Bar Chart) */}
          <ChartCard
            title={t('tcc.dashboard.monthlyInput', 'Monthly Input')}
            subtitle={t('tcc.dashboard.monthlyInputDesc', 'Volume trends of registered requests over time')}
            chartId="chart-monthly"
            isEmpty={chartsData.byMonth.length === 0}
            emptyText={t('tcc.dashboard.noData', 'No data available')}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData.byMonth} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <Paper elevation={0} sx={{ p: 1.2, border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.2 }}>
                            {label}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#5B9BD5', fontSize: '13px' }}>
                            {payload[0].value} {t('tcc.dashboard.requests', 'Requests')}
                          </Typography>
                        </Paper>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#5B9BD5" radius={[4, 4, 0, 0]} barSize={30} isAnimationActive={false}>
                  <LabelList dataKey="count" position="top" style={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 2: Output by quantity (Bar Chart) */}
          <ChartCard
            title={t('tcc.dashboard.outputByQuantity', 'Output by quantity')}
            subtitle={t('tcc.dashboard.outputByQuantityDesc', 'Total template quantities completed by factory')}
            chartId="chart-factory-output"
            isEmpty={chartsData.outputByFactory.length === 0}
            emptyText={t('tcc.dashboard.noData', 'No data available')}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                layout="vertical"
                data={chartsData.outputByFactory} 
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis 
                  type="number"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                />
                <YAxis 
                  type="category"
                  dataKey="factory" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <Paper elevation={0} sx={{ p: 1.2, border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.2 }}>
                            {label}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#70AD47', fontSize: '13px' }}>
                            {payload[0].value} {t('tcc.dashboard.templates', 'Templates')}
                          </Typography>
                        </Paper>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#70AD47" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}>
                  <LabelList dataKey="count" position="right" style={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 3: Avg Working day per requestor (Bar Chart) */}
          <ChartCard
            title={t('tcc.dashboard.avgWorkingDayPerRequestor', 'Avg Working day per requestor')}
            subtitle={t('tcc.dashboard.avgWorkingDayPerRequestorDesc', 'Average development days (Finished - Start) by factory')}
            chartId="chart-avg-working-days"
            isEmpty={chartsData.avgWorkingDaysByFactory.length === 0}
            emptyText={t('tcc.dashboard.noData', 'No data available')}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData.avgWorkingDaysByFactory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="factory" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <Paper elevation={0} sx={{ p: 1.2, border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.2 }}>
                            {label}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#5B9BD5', fontSize: '13px' }}>
                            {payload[0].value} {t('tcc.dashboard.days', 'Days')}
                          </Typography>
                        </Paper>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="avgDays" fill="#5B9BD5" radius={[4, 4, 0, 0]} barSize={30} isAnimationActive={false}>
                  <LabelList dataKey="avgDays" position="top" style={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 4: Product Type Breakdown (Bar Chart) */}
          <ChartCard
            title={t('tcc.dashboard.productTypeBreakdown', 'Product Type Breakdown')}
            subtitle={t('tcc.dashboard.productTypeBreakdownDesc', 'Demand volume categorized by apparel type')}
            chartId="chart-product-type"
            isEmpty={chartsData.byProductType.length === 0}
            emptyText={t('tcc.dashboard.noData', 'No data available')}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                layout="vertical"
                data={chartsData.byProductType} 
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis 
                  type="number"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                />
                <YAxis 
                  type="category"
                  dataKey="productType" 
                  width={110}
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <Paper elevation={0} sx={{ p: 1.2, border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.2 }}>
                            {label}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#AFC854', fontSize: '13px' }}>
                            {payload[0].value} {t('tcc.dashboard.requests', 'Requests')}
                          </Typography>
                        </Paper>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#AFC854" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}>
                  <LabelList dataKey="count" position="right" style={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 5: Customer distribution (Donut Chart) */}
          <CustomerDonutChart
            sortedCustomers={sortedCustomers}
            totalCustomerCount={totalCustomerCount}
            t={t}
          />

          {/* Chart 6: In progress by requestor (Line Chart) */}
          <ChartCard
            title={t('tcc.dashboard.inProgressByRequestor', 'In progress by requestor')}
            subtitle={t('tcc.dashboard.inProgressByRequestorDesc', 'Count of actively developed samples per factory/requestor')}
            chartId="chart-factory-inprogress"
            isEmpty={chartsData.inProgressByFactory.length === 0}
            emptyText={t('tcc.dashboard.noData', 'No data available')}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartsData.inProgressByFactory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="factory" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <Paper elevation={0} sx={{ p: 1.2, border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.2 }}>
                            {label}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#5B9BD5', fontSize: '13px' }}>
                            {payload[0].value} {t('tcc.dashboard.requests', 'Requests')}
                          </Typography>
                        </Paper>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#5B9BD5" 
                  strokeWidth={3} 
                  dot={{ r: 5, stroke: '#5B9BD5', strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 7 }}
                  isAnimationActive={false}
                >
                  <LabelList dataKey="count" position="top" style={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Box>
      </Box>

      <Menu
        anchorEl={exportAnchorEl}
        open={isExportOpen}
        onClose={handleExportClose}
        PaperProps={{
          sx: {
            mt: 0.5,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
          }
        }}
      >
        <MenuItem 
          onClick={() => {
            handleExportClose();
            window.print();
          }}
          sx={{ py: 1, px: 2 }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <PrintIcon fontSize="small" sx={{ color: '#15803d' }} />
          </ListItemIcon>
          <ListItemText primary={t('tcc.dashboard.exportPdfOption', 'Xuất báo cáo PDF')} primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }} />
        </MenuItem>
        <MenuItem 
          onClick={onExportExcelClick}
          sx={{ py: 1, px: 2 }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <ExcelIcon fontSize="small" sx={{ color: '#15803d' }} />
          </ListItemIcon>
          <ListItemText primary={t('tcc.dashboard.exportExcelOption', 'Xuất dữ liệu Excel')} primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }} />
        </MenuItem>
      </Menu>
    </Box>
  );
}
