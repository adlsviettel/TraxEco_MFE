import React, { useState, useMemo } from 'react';
import { 
  useGridApiContext 
} from '@mui/x-data-grid';
import type { 
  GridColumnMenuProps 
} from '@mui/x-data-grid';
import { 
  Box, 
  Checkbox, 
  InputAdornment, 
  TextField, 
  Button, 
  Divider, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText 
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { columnFilterStore } from './ColumnFilterContext';

export default function ExcelStyleColumnMenu(props: GridColumnMenuProps) {
  const { hideMenu, colDef } = props;
  const apiRef = useGridApiContext();
  
  const [searchTerm, setSearchTerm] = useState('');

  // Determine pageId based on pathname to support keep-alive page instances
  const pageId = window.location.pathname.includes('admin-status') ? 'admin' : 'requestor';

  // Read from window-level store keyed by pageId
  const allRows = columnFilterStore.allRows(pageId);
  const columnFilters = columnFilterStore.columnFilters(pageId);
  

  // Helper: get display value for a field, using column valueGetter if available
  const getFieldValue = (row: any, field: string): string => {
    // Try to find column definition and use valueGetter
    const colDefForField = apiRef.current.getColumn(field);
    if (colDefForField?.valueGetter) {
      try {
        const rawVal = row[field];
        const computed = colDefForField.valueGetter(rawVal, row, colDefForField, apiRef);
        return (computed !== undefined && computed !== null && computed !== '') ? String(computed) : '(Blanks)';
      } catch { /* fallback */ }
    }
    const val = row[field];
    return (val !== undefined && val !== null && val !== '') ? String(val) : '(Blanks)';
  };

  // Cross-filter: apply all OTHER column filters (exclude current column)
  // so the unique values shown reflect the currently filtered dataset
  const crossFilteredRows = useMemo(() => {
    const otherFilters = Object.entries(columnFilters).filter(([field]) => field !== colDef.field);
    if (otherFilters.length === 0) return allRows;
    return allRows.filter((row: any) => {
      return otherFilters.every(([field, allowedValues]) => {
        if (!allowedValues || allowedValues.length === 0) return true;
        const val = getFieldValue(row, field);
        return allowedValues.includes(val);
      });
    });
  }, [allRows, columnFilters, colDef.field]);

  const uniqueValues = useMemo(() => {
    const values = new Set<string>();
    crossFilteredRows.forEach((row: any) => {
      values.add(getFieldValue(row, colDef.field));
    });
    return Array.from(values).sort();
  }, [crossFilteredRows, colDef.field]);

  const currentFilter = columnFilters[colDef.field];
  
  const [selectedValues, setSelectedValues] = useState<string[]>(() => {
    if (currentFilter && currentFilter.length > 0) {
      return currentFilter;
    }
    return uniqueValues;
  });

  const filteredValues = useMemo(() => {
    if (!searchTerm) return uniqueValues;
    return uniqueValues.filter(v => v.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [uniqueValues, searchTerm]);

  const handleToggle = (val: string) => {
    setSelectedValues(prev => {
      if (prev.includes(val)) {
        return prev.filter(v => v !== val);
      } else {
        return [...prev, val];
      }
    });
  };

  const handleSelectAll = () => {
    const allFilteredSelected = filteredValues.every(v => selectedValues.includes(v));
    if (allFilteredSelected) {
      setSelectedValues(prev => prev.filter(v => !filteredValues.includes(v)));
    } else {
      const newSelected = new Set(selectedValues);
      filteredValues.forEach(v => newSelected.add(v));
      setSelectedValues(Array.from(newSelected));
    }
  };

  const applyFilter = () => {
    const effectiveSelected = searchTerm
      ? selectedValues.filter(v => filteredValues.includes(v))
      : selectedValues;

    const allSelected = uniqueValues.every(v => effectiveSelected.includes(v));
    
    console.log('[applyFilter]', colDef.field, 'selected:', effectiveSelected.length, '/', uniqueValues.length);

    if (allSelected && effectiveSelected.length === uniqueValues.length) {
      columnFilterStore.setColumnFilters(pageId, (prev: Record<string, string[]>) => {
        const next = { ...prev };
        delete next[colDef.field];
        return next;
      });
    } else {
      columnFilterStore.setColumnFilters(pageId, (prev: Record<string, string[]>) => {
        const next = { ...prev, [colDef.field]: effectiveSelected };
        return next;
      });
    }
    hideMenu(undefined as any);
  };

  const handleSortAsc = (e: React.SyntheticEvent) => {
    apiRef.current.sortColumn(colDef.field, 'asc');
    hideMenu(e);
  };

  const handleSortDesc = (e: React.SyntheticEvent) => {
    apiRef.current.sortColumn(colDef.field, 'desc');
    hideMenu(e);
  };

  const handleClearFilter = (e: React.SyntheticEvent) => {
    columnFilterStore.setColumnFilters(pageId, (prev: Record<string, string[]>) => {
      const next = { ...prev };
      delete next[colDef.field];
      return next;
    });
    hideMenu(e);
  };

  const hasFilter = Boolean(columnFilters[colDef.field]);

  return (
    <Box sx={{ width: 260, display: 'flex', flexDirection: 'column', bgcolor: '#fff' }} onClick={(e) => e.stopPropagation()}>
      <List dense sx={{ p: 0 }}>
        <ListItemButton onClick={handleSortAsc} sx={{ py: 1 }}>
          <ListItemIcon sx={{ minWidth: 32 }}><SortByAlphaIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Sort A to Z" primaryTypographyProps={{ fontSize: 13 }} />
        </ListItemButton>
        <ListItemButton onClick={handleSortDesc} sx={{ py: 1 }}>
          <ListItemIcon sx={{ minWidth: 32 }}><SortByAlphaIcon fontSize="small" sx={{ transform: 'scaleY(-1)' }} /></ListItemIcon>
          <ListItemText primary="Sort Z to A" primaryTypographyProps={{ fontSize: 13 }} />
        </ListItemButton>
        <Divider />
        <ListItemButton onClick={handleClearFilter} disabled={!hasFilter} sx={{ py: 1 }}>
          <ListItemIcon sx={{ minWidth: 32 }}><FilterAltOffIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={`Clear Filter`} primaryTypographyProps={{ fontSize: 13 }} />
        </ListItemButton>
      </List>
      
      <Divider />
      
      <Box sx={{ p: 1 }}>
        <TextField
          size="small"
          placeholder="Search"
          fullWidth
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            sx: { fontSize: 13 }
          }}
        />
      </Box>

      <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e0e0e0', mx: 1, mb: 1, borderRadius: 1 }}>
        <List dense disablePadding>
          <ListItem disablePadding>
            <ListItemButton onClick={handleSelectAll} sx={{ py: 0, px: 1 }}>
              <ListItemIcon sx={{ minWidth: 28 }}>
                <Checkbox
                  edge="start"
                  checked={filteredValues.length > 0 && filteredValues.every(v => selectedValues.includes(v))}
                  indeterminate={filteredValues.some(v => selectedValues.includes(v)) && !filteredValues.every(v => selectedValues.includes(v))}
                  disableRipple
                  size="small"
                  sx={{ p: 0.5 }}
                />
              </ListItemIcon>
              <ListItemText primary="(Select All)" primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }} />
            </ListItemButton>
          </ListItem>
          
          {filteredValues.map((val) => (
            <ListItem key={val} disablePadding>
              <ListItemButton onClick={() => handleToggle(val)} sx={{ py: 0, px: 1 }}>
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <Checkbox
                    edge="start"
                    checked={selectedValues.includes(val)}
                    disableRipple
                    size="small"
                    sx={{ p: 0.5 }}
                  />
                </ListItemIcon>
                <ListItemText primary={val} primaryTypographyProps={{ fontSize: 13 }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 1, borderTop: '1px solid #eee' }}>
        <Button size="small" variant="outlined" onClick={hideMenu} sx={{ textTransform: 'none', height: 28, fontSize: 12 }}>
          Cancel
        </Button>
        <Button size="small" variant="contained" onClick={applyFilter} sx={{ textTransform: 'none', height: 28, fontSize: 12, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}>
          OK
        </Button>
      </Box>
    </Box>
  );
}
