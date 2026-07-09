import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';

interface KpiItem {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
}

interface KpiCardGridProps {
  kpis: KpiItem[];
}

export const KpiCardGrid: React.FC<KpiCardGridProps> = ({ kpis }) => {
  return (
    <Box 
      sx={{ 
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2.5, 
        mb: 3 
      }}
    >
      {kpis.map((kpi, index) => (
        <Card 
          key={index}
          elevation={0}
          sx={{ 
            borderRadius: '8px', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 16px -4px rgba(0,0,0,0.06)',
              borderColor: '#cbd5e1'
            }
          }}
        >
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.01em', fontSize: '13px' }}>
                {kpi.title}
              </Typography>
              <Box 
                sx={{ 
                  p: 1, 
                  background: kpi.gradient, 
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {kpi.icon}
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', fontSize: '26px' }}>
              {kpi.value}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};
