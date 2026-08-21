import React from 'react';
import { 
    Box, Typography, Button, Select, MenuItem 
} from '@mui/material';
import { 
    GridFooterContainer, 
    useGridApiContext, 
    useGridSelector, 
    gridPageSelector, 
    gridPageCountSelector, 
    gridPageSizeSelector 
} from '@mui/x-data-grid';

export function CustomFooter(props: any) {
  const { totalFilteredRows } = props;
  const apiRef = useGridApiContext();
  const page = useGridSelector(apiRef, gridPageSelector);
  const pageCount = useGridSelector(apiRef, gridPageCountSelector);
  const pageSize = useGridSelector(apiRef, gridPageSizeSelector) || 50;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < pageCount) {
      apiRef.current.setPage(newPage);
    }
  };

  const current = page + 1;
  const items: (number | string)[] = [];

  if (pageCount <= 5) {
      for (let i = 1; i <= pageCount; i++) items.push(i);
  } else {
      if (current <= 2) {
          items.push(1, 2, 3, '...', pageCount);
      } else if (current >= pageCount - 1) {
          items.push(1, '...', pageCount - 2, pageCount - 1, pageCount);
      } else {
          const end = Math.min(current + 2, pageCount);
          const start = current;
          items.push(1);
          if (start > 2) items.push('...');
          for (let i = start; i <= end; i++) items.push(i);
          if (end < pageCount - 1) items.push('...');
          if (end < pageCount) items.push(pageCount);
      }
  }

  return (
    <GridFooterContainer sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, borderTop: '1px solid', borderColor: 'divider', minHeight: 52 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#15803d', mr: 2 }}>
            Total rows: {(totalFilteredRows ?? 0).toLocaleString()}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Rows per page:</Typography>
        <Select
          value={pageSize}
          onChange={(e) => apiRef.current.setPageSize(Number(e.target.value))}
          size="small"
          variant="standard"
          disableUnderline
          sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.secondary', '& .MuiSelect-select': { py: 0.5 } }}
        >
          <MenuItem value={25}>25</MenuItem>
          <MenuItem value={50}>50</MenuItem>
          <MenuItem value={100}>100</MenuItem>
          <MenuItem value={200}>200</MenuItem>
          <MenuItem value={500}>500</MenuItem>
          <MenuItem value={1000}>1000</MenuItem>
        </Select>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Button 
          variant="text" 
          disabled={page === 0} 
          onClick={() => handlePageChange(page - 1)}
          sx={{ minWidth: 32, p: 0.5, color: '#15803d', fontWeight: 700 }}
        >
          &lt;
        </Button>
        
        {items.map((item, index) => (
          item === '...' ? (
            <Typography key={`ellipsis-${index}`} variant="body2" sx={{ px: 1, color: '#64748b' }}>...</Typography>
          ) : (
            <Button
              key={`page-${item}`}
              variant={item === current ? "contained" : "text"}
              onClick={() => handlePageChange((item as number) - 1)}
              sx={{ 
                minWidth: 32, 
                width: 32,
                height: 32, 
                p: 0, 
                borderRadius: '50%',
                bgcolor: item === current ? '#15803d' : 'transparent',
                color: item === current ? '#fff' : '#15803d',
                fontWeight: 700,
                '&:hover': { bgcolor: item === current ? '#166534' : '#f0fdf4' }
              }}
            >
              {item}
            </Button>
          )
        ))}

        <Button 
          variant="text" 
          disabled={page >= pageCount - 1} 
          onClick={() => handlePageChange(page + 1)}
          sx={{ minWidth: 32, p: 0.5, color: '#15803d', fontWeight: 700 }}
        >
          &gt;
        </Button>
      </Box>
    </GridFooterContainer>
  );
}

export default CustomFooter;
