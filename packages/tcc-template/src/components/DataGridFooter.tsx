import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Select, MenuItem, Pagination, useTheme, useMediaQuery } from '@mui/material';
import { 
  useGridApiContext, 
  useGridSelector, 
  gridPageSelector, 
  gridPageCountSelector, 
  gridPaginationModelSelector 
} from '@mui/x-data-grid';

export function DataGridFooter() {
  const { t } = useTranslation();
  const apiRef = useGridApiContext();
  const page = useGridSelector(apiRef, gridPageSelector);
  const pageCount = useGridSelector(apiRef, gridPageCountSelector);
  const paginationModel = useGridSelector(apiRef, gridPaginationModelSelector);
  const pageSize = paginationModel?.pageSize || 20;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ 
      borderTop: '1px solid #e1e3e4', 
      px: isMobile ? 1.5 : 3, 
      py: 1.5, 
      bgcolor: '#fff', 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: 'center', 
      gap: isMobile ? 1.5 : 2,
      justifyContent: 'space-between', 
      flexShrink: 0 
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#3f4945', fontSize: 12 }}>
        <span>{t('tcc.rowsPerPage', 'Rows per page:')}</span>
        <Select
          value={pageSize}
          onChange={(e) => apiRef.current.setPageSize(Number(e.target.value))}
          size="small"
          sx={{ 
            height: 28, 
            fontSize: 12, 
            bgcolor: '#f3f4f5', 
            '& fieldset': { border: 'none' }, 
            '&:hover fieldset': { border: '1px solid #bfc9c4' } 
          }}
        >
          {[20, 50, 100].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </Select>
      </Box>
      <Pagination
        count={pageCount}
        page={page + 1}
        onChange={(_, p) => apiRef.current.setPage(p - 1)}
        color="primary" 
        shape="rounded"
        size={isMobile ? "small" : "medium"}
        siblingCount={isMobile ? 0 : 1}
        sx={{ 
          '& .MuiPaginationItem-root': { 
            color: '#3f4945', 
            fontSize: isMobile ? 12 : 14,
            height: isMobile ? 28 : 32,
            minWidth: isMobile ? 28 : 32,
            '&.Mui-selected': { 
              bgcolor: '#1b5e20', 
              color: '#fff', 
              '&:hover': { bgcolor: '#1b6d24' } 
            } 
          } 
        }}
      />
    </Box>
  );
}
