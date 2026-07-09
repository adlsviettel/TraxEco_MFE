import React from 'react';
import { Box, Typography, CircularProgress, IconButton, Tooltip as MuiTooltip } from '@mui/material';
import { 
  FileDownload as FileDownloadIcon, 
  Refresh as RefreshIcon 
} from '@mui/icons-material';

interface DashboardHeaderProps {
  refreshing: boolean;
  onRefresh: () => void;
  onExportClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  t: any;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ refreshing, onRefresh, onExportClick, t }) => {
  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#15803d', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          {t('tcc.dashboard.title', 'TCC Performance & Analytics Dashboard')}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
          {t('tcc.dashboard.subtitle', 'Real-time metrics, status breakdowns, and factory outputs')}
        </Typography>
      </Box>
      <Box className="no-print" display="flex" alignItems="center" gap={1}>
        {refreshing && (
          <CircularProgress size={16} sx={{ color: '#15803d' }} />
        )}
        <MuiTooltip title={t('tcc.dashboard.export', 'Xuất dữ liệu')} arrow>
          <IconButton 
            onClick={onExportClick} 
            size="small"
            sx={{ 
              bgcolor: '#ffffff', 
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              '&:hover': { bgcolor: '#f8fafc' }
            }}
          >
            <FileDownloadIcon fontSize="small" sx={{ color: '#15803d' }} />
          </IconButton>
        </MuiTooltip>
        <MuiTooltip title={t('tcc.dashboard.refresh', 'Refresh Data')} arrow>
          <IconButton 
            onClick={onRefresh} 
            disabled={refreshing}
            size="small"
            sx={{ 
              bgcolor: '#ffffff', 
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              '&:hover': { bgcolor: '#f8fafc' }
            }}
          >
            <RefreshIcon fontSize="small" sx={{ color: '#15803d', animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </IconButton>
        </MuiTooltip>
      </Box>
    </Box>
  );
};
