import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';

interface ChartCardProps {
  title: string;
  subtitle: string;
  chartId: string;
  isEmpty: boolean;
  emptyText: string;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  chartId,
  isEmpty,
  emptyText,
  children
}) => {
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
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.2 }}>
            {subtitle}
          </Typography>
        </Box>
        
        <Box id={chartId} sx={{ flex: 1, minHeight: 0, width: '100%' }}>
          {isEmpty ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <Typography variant="caption" color="text.disabled">{emptyText}</Typography>
            </Box>
          ) : (
            children
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
