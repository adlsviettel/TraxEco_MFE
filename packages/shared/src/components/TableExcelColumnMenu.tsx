import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Box, Checkbox, InputAdornment, TextField, Button, 
  Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Popover, IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';

export interface TableExcelColumnMenuProps {
  field: string;
  allRows: any[];
  columnFilters: Record<string, string[]>;
  setColumnFilters: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  getFieldValue: (row: any, field: string) => string;
  onSortAsc?: () => void;
  onSortDesc?: () => void;
}

export default function TableExcelColumnMenu({
  field, allRows, columnFilters, setColumnFilters, getFieldValue, onSortAsc, onSortDesc
}: TableExcelColumnMenuProps) {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  
  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  
  const [searchTerm, setSearchTerm] = useState('');

  // Cross-filter: apply all OTHER column filters (exclude current column)
  const crossFilteredRows = useMemo(() => {
    const otherFilters = Object.entries(columnFilters).filter(([f]) => f !== field);
    if (otherFilters.length === 0) return allRows;
    return allRows.filter((row: any) => {
      return otherFilters.every(([f, allowedValues]) => {
        if (!allowedValues || allowedValues.length === 0) return true;
        const val = getFieldValue(row, f);
        return allowedValues.includes(val);
      });
    });
  }, [allRows, columnFilters, field, getFieldValue]);

  const uniqueValues = useMemo(() => {
    const values = new Set<string>();
    crossFilteredRows.forEach((row: any) => {
      values.add(getFieldValue(row, field));
    });
    return Array.from(values).sort();
  }, [crossFilteredRows, field, getFieldValue]);

  const currentFilter = columnFilters[field];
  
  const [selectedValues, setSelectedValues] = useState<string[]>(() => {
    if (currentFilter && currentFilter.length > 0) return currentFilter;
    return uniqueValues;
  });

  // Reset selected values when opened
  React.useEffect(() => {
    if (open) {
      if (currentFilter && currentFilter.length > 0) setSelectedValues(currentFilter);
      else setSelectedValues(uniqueValues);
      setSearchTerm('');
    }
  }, [open, currentFilter, uniqueValues]);

  const filteredValues = useMemo(() => {
    if (!searchTerm) return uniqueValues;
    return uniqueValues.filter(v => v.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [uniqueValues, searchTerm]);

  const handleToggle = (val: string) => {
    setSelectedValues(prev => {
      if (prev.includes(val)) return prev.filter(v => v !== val);
      return [...prev, val];
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

    setColumnFilters(prev => {
      const next = { ...prev };
      if (allSelected && effectiveSelected.length === uniqueValues.length) {
        delete next[field];
      } else {
        next[field] = effectiveSelected;
      }
      return next;
    });
    handleClose();
  };

  const handleClearFilter = (e: React.SyntheticEvent) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    handleClose();
  };

  const hasFilter = Boolean(columnFilters[field]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5, opacity: hasFilter || open ? 1 : 0.3, '&:hover': { opacity: 1 }, transition: 'opacity 0.2s' }} className="column-menu-trigger">
      <IconButton 
        size="small" 
        onClick={handleOpen} 
        sx={{ p: 0.25, color: hasFilter ? '#1b5e20' : 'inherit' }}
        disableRipple
      >
        {hasFilter ? <FilterAltIcon fontSize="inherit" sx={{ fontSize: 16 }} /> : <MoreVertIcon fontSize="inherit" sx={{ fontSize: 16 }} />}
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { boxShadow: '0 4px 20px rgba(0,0,0,0.1)', borderRadius: 2 } } }}
      >
        <Box sx={{ width: 260, display: 'flex', flexDirection: 'column', bgcolor: '#fff' }} onClick={(e) => e.stopPropagation()}>
          <List dense sx={{ p: 0 }}>
            {onSortAsc && (
              <ListItemButton onClick={() => { onSortAsc(); handleClose(); }} sx={{ py: 1 }}>
                <ListItemIcon sx={{ minWidth: 32 }}><ArrowUpwardIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary={t('tcc.sortAToZ', 'Sort A to Z')} primaryTypographyProps={{ fontSize: 13 }} />
              </ListItemButton>
            )}
            {onSortDesc && (
              <ListItemButton onClick={() => { onSortDesc(); handleClose(); }} sx={{ py: 1 }}>
                <ListItemIcon sx={{ minWidth: 32 }}><ArrowDownwardIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary={t('tcc.sortZToA', 'Sort Z to A')} primaryTypographyProps={{ fontSize: 13 }} />
              </ListItemButton>
            )}
            {(onSortAsc || onSortDesc) && <Divider />}
            
            <ListItemButton onClick={handleClearFilter} disabled={!hasFilter} sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 32 }}><FilterAltOffIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={t('tcc.clearFilter', 'Clear Filter')} primaryTypographyProps={{ fontSize: 13 }} />
            </ListItemButton>
          </List>
          
          <Divider />
          
          <Box sx={{ p: 1 }}>
            <TextField
              size="small"
              placeholder={t('tcc.search', 'Search')}
              fullWidth
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                sx: { fontSize: 13, borderRadius: '6px' }
              }}
            />
          </Box>

          <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e2e8f0', mx: 1, mb: 1, borderRadius: '6px' }}>
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
                  <ListItemText primary={t('tcc.selectAll', '(Select All)')} primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }} />
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

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 1, borderTop: '1px solid #f1f5f9' }}>
            <Button size="small" variant="outlined" onClick={handleClose} sx={{ textTransform: 'none', height: 28, fontSize: 12, borderRadius: '6px', color: '#64748b', borderColor: '#cbd5e1' }}>
              {t('tcc.cancel', 'Cancel')}
            </Button>
            <Button size="small" variant="contained" onClick={applyFilter} sx={{ textTransform: 'none', height: 28, fontSize: 12, borderRadius: '6px', bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}>
              {t('tcc.ok', 'OK')}
            </Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
}
