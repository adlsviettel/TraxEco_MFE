import React from 'react';
import { Card, CardContent, Box, Typography, Paper } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const DONUT_COLORS = [
  '#5B9BD5', // Soft Blue (accent1)
  '#ED7D31', // Orange (accent2)
  '#A5A5A5', // Medium Gray (accent3)
  '#FFC000', // Yellow/Gold (accent4)
  '#4472C4', // Royal Blue (accent5)
  '#70AD47', // Olive Green (accent6)
  '#ea580c', // Fallback Orange
  '#475569'  // Fallback Slate
];

interface CustomerItem {
  customer: string;
  count: number;
}

interface CustomerDonutChartProps {
  sortedCustomers: CustomerItem[];
  totalCustomerCount: number;
  t: any;
}

export const CustomerDonutChart: React.FC<CustomerDonutChartProps> = ({
  sortedCustomers,
  totalCustomerCount,
  t
}) => {
  const isEmpty = sortedCustomers.length === 0;

  return (
    <Card 
      elevation={0}
      sx={{ 
        borderRadius: '8px', 
        border: '1px solid #e2e8f0', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        height: 340
      }}
    >
      <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flex: 1, '&:last-child': { pb: 3 } }}>
        <Box mb={2} sx={{ minHeight: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '15px', lineHeight: 1.2 }}>
            {t('tcc.dashboard.customerDistributionChart', 'Customer distribution')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.2 }}>
            {t('tcc.dashboard.customerDistributionDesc', 'Share of requests across different brands')}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ flex: 1, minHeight: 0 }}>
          
          {/* Left: Donut Pie */}
          <Box id="chart-customer" sx={{ width: '52%', height: '100%', position: 'relative' }}>
            {isEmpty ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Typography variant="caption" color="text.disabled">{t('tcc.dashboard.noData', 'No data available')}</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sortedCustomers}
                    dataKey="count"
                    nameKey="customer"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={48}
                    paddingAngle={2.5}
                    isAnimationActive={false}
                  >
                    {sortedCustomers.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0];
                        return (
                          <Paper elevation={0} sx={{ p: 1.2, border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.2 }}>
                              {item.name}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#0284c7', fontSize: '13px' }}>
                              {item.value} {t('tcc.dashboard.requests', 'Requests')} ({totalCustomerCount > 0 ? Math.round((Number(item.value) / totalCustomerCount) * 100) : 0}%)
                            </Typography>
                          </Paper>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}

            {!isEmpty && (
              /* Absolute Center Stats Overlay */
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)', 
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.05em', lineHeight: 1, fontSize: '22px' }}>
                  {totalCustomerCount}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '9px' }}>
                  {t('tcc.dashboard.totalLabel', 'Total')}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Right: Legend */}
          <Box sx={{ width: '45%', display: 'flex', flexDirection: 'column', gap: 1, pr: 0.5, maxHeight: '180px', overflowY: 'auto' }}>
            {sortedCustomers.slice(0, 5).map((c, index) => {
              const pct = totalCustomerCount > 0 ? (c.count / totalCustomerCount) * 100 : 0;
              return (
                <Box key={index} display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={0.8} sx={{ overflow: 'hidden' }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: DONUT_COLORS[index % DONUT_COLORS.length], flexShrink: 0 }} />
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontWeight: 700, 
                        color: '#475569', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        fontSize: '10.5px'
                      }}
                    >
                      {c.customer}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#0f172a', ml: 1, flexShrink: 0, fontSize: '10.5px' }}>
                    {pct.toFixed(0)}%
                  </Typography>
                </Box>
              );
            })}
            {sortedCustomers.length > 5 && (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', pl: 1.5, fontSize: '9.5px' }}>
                + {sortedCustomers.length - 5} {t('tcc.dashboard.more', 'more')}
              </Typography>
            )}
          </Box>
          
        </Box>
      </CardContent>
    </Card>
  );
};
