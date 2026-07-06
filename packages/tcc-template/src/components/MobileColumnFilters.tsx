import React, { useState, useMemo, useEffect } from 'react';
import { 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  Typography, 
  Checkbox, 
  FormControlLabel, 
  FormGroup, 
  TextField, 
  InputAdornment, 
  Box,
  IconButton,
  Chip,
  Button,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { columnFilterStore } from './ColumnFilterContext';
import { useTranslation } from 'react-i18next';

export interface FilterableField {
  field: string;
  label: string;
  valueGetter?: (value: any, row: any) => any;
}

interface MobileColumnFiltersProps {
  pageId: 'admin' | 'requestor';
  allFields: FilterableField[];
  localFilters: Record<string, string[]>;
  setLocalFilters: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
}

// Separate component for each column filter item to adhere to Rules of Hooks
interface MobileColumnFilterItemProps {
  field: string;
  fieldDef: FilterableField;
  allRows: any[];
  allFields: FilterableField[];
  localFilters: Record<string, string[]>;
  setLocalFilters: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  onRemove: () => void;
  t: any;
}

function MobileColumnFilterItem({
  field,
  fieldDef,
  allRows,
  allFields,
  localFilters,
  setLocalFilters,
  onRemove,
  t
}: MobileColumnFilterItemProps) {
  const { label, valueGetter } = fieldDef;
  const [searchTerm, setSearchTerm] = useState('');

  // Helper to get cell value
  const getFieldValue = (row: any): string => {
    if (valueGetter) {
      try {
        const rawVal = row[field];
        const computed = valueGetter(rawVal, row);
        return (computed !== undefined && computed !== null && computed !== '') ? String(computed) : '(Blanks)';
      } catch { /* fallback */ }
    }
    const val = row[field];
    return (val !== undefined && val !== null && val !== '') ? String(val) : '(Blanks)';
  };

  // Cross-filter: apply all OTHER column filters (exclude current column)
  const crossFilteredRows = useMemo(() => {
    const otherFilters = Object.entries(localFilters).filter(([f]) => f !== field);
    if (otherFilters.length === 0) return allRows;
    return allRows.filter((row: any) => {
      return otherFilters.every(([f, allowedValues]) => {
        if (!allowedValues || allowedValues.length === 0) return true;
        
        // Find matching field definition to apply its valueGetter if any
        const otherFieldDef = allFields.find(fd => fd.field === f);
        let val: any;
        if (otherFieldDef?.valueGetter) {
          val = otherFieldDef.valueGetter(row[f], row);
        } else {
          val = row[f];
        }
        val = (val !== undefined && val !== null && val !== '') ? String(val) : '(Blanks)';
        return allowedValues.includes(val);
      });
    });
  }, [allRows, localFilters, field, allFields]);

  // Compute unique values for this column
  const uniqueValues = useMemo(() => {
    const values = new Set<string>();
    crossFilteredRows.forEach((row: any) => {
      values.add(getFieldValue(row));
    });
    return Array.from(values).sort();
  }, [crossFilteredRows]);

  // Handle search input inside accordion
  const filteredValues = useMemo(() => {
    if (!searchTerm) return uniqueValues;
    return uniqueValues.filter(v => v.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [uniqueValues, searchTerm]);

  const currentSelected = localFilters[field] || [];
  const isAllSelected = uniqueValues.every(v => currentSelected.includes(v));
  const activeCount = currentSelected.length;

  const handleSelectAll = (checked: boolean) => {
    setLocalFilters(prev => {
      const next = { ...prev };
      if (checked) {
        next[field] = uniqueValues;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const handleToggleValue = (val: string, checked: boolean) => {
    setLocalFilters(prev => {
      const next = { ...prev };
      const current = next[field] || [];
      if (checked) {
        next[field] = [...current, val];
      } else {
        const updated = current.filter(v => v !== val);
        if (updated.length === 0) {
          delete next[field];
        } else {
          next[field] = updated;
        }
      }
      return next;
    });
  };

  return (
    <Accordion 
      disableGutters
      elevation={0}
      sx={{ 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px !important',
        mb: 0.5,
        '&:before': { display: 'none' },
        overflow: 'hidden'
      }}
    >
      <AccordionSummary 
        expandIcon={<ExpandMoreIcon sx={{ fontSize: 20 }} />}
        sx={{ 
          bgcolor: activeCount > 0 ? 'rgba(46,125,50,0.04)' : '#f8fafc',
          minHeight: 44,
          height: 44,
          px: 2,
          '& .MuiAccordionSummary-content': { 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            mr: 1,
            width: 'calc(100% - 24px)'
          }
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: activeCount > 0 ? 700 : 600, color: activeCount > 0 ? '#1b5e20' : '#475569', flexGrow: 1 }}>
          {label}
        </Typography>
        
        {/* Active count tag */}
        {activeCount > 0 && (
          <Chip 
            label={activeCount} 
            size="small" 
            sx={{ 
              height: 18, 
              fontSize: 10, 
              fontWeight: 700, 
              bgcolor: '#e8f5e9', 
              color: '#2e7d32',
              border: '1px solid #c8e6c9',
              px: 0.5
            }} 
          />
        )}

        {/* Remove Column filter icon button */}
        <IconButton 
          component="span"
          size="small" 
          onClick={(e) => {
            e.stopPropagation(); // Avoid expanding/collapsing accordion!
            onRemove();
          }}
          sx={{ 
            color: '#94a3b8', 
            '&:hover': { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.08)' } 
          }}
        >
          <DeleteOutlineIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: '#fff' }}>
        {/* Search unique values */}
        <TextField
          placeholder={t('tcc.searchValues', 'Tìm giá trị...')}
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ fontSize: 16, color: '#94a3b8', mr: 0.5 }} />,
            endAdornment: searchTerm ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <ClearIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </InputAdornment>
            ) : null
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              height: 32,
              fontSize: 12,
              borderRadius: '6px',
              bgcolor: '#f8fafc'
            }
          }}
        />

        {/* Select All */}
        <FormControlLabel
          control={
            <Checkbox 
              size="small"
              checked={isAllSelected && uniqueValues.length > 0} 
              indeterminate={activeCount > 0 && !isAllSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              sx={{ py: 0.25, color: '#1b5e20', '&.Mui-checked': { color: '#1b5e20' } }}
            />
          }
          label={
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
              ({t('tcc.selectAll', 'Select All')})
            </Typography>
          }
          sx={{ m: 0 }}
        />

        {/* Unique Values list */}
        <Box sx={{ overflowY: 'auto', maxHeight: 200, display: 'flex', flexDirection: 'column', pr: 0.5 }}>
          <FormGroup>
            {filteredValues.map(val => (
              <FormControlLabel
                key={val}
                control={
                  <Checkbox 
                    size="small"
                    checked={currentSelected.includes(val)} 
                    onChange={(e) => handleToggleValue(val, e.target.checked)}
                    sx={{ py: 0.25, color: '#1b5e20', '&.Mui-checked': { color: '#1b5e20' } }}
                  />
                }
                label={
                  <Typography sx={{ fontSize: 12, color: '#475569' }}>
                    {val}
                  </Typography>
                }
                sx={{ m: 0 }}
              />
            ))}
            {filteredValues.length === 0 && (
              <Typography sx={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', py: 1 }}>
                {t('tcc.noValuesMatch', 'No values match search')}
              </Typography>
            )}
          </FormGroup>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

export default function MobileColumnFilters({
  pageId,
  allFields,
  localFilters,
  setLocalFilters
}: MobileColumnFiltersProps) {
  const { t } = useTranslation();
  const allRows = columnFilterStore.allRows(pageId);

  // 1. Manage active filter columns from localStorage
  const localStorageKey = `tcc_active_filter_columns_${pageId}`;
  const [activeCols, setActiveCols] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(localStorageKey);
    if (saved) {
      try {
        setActiveCols(JSON.parse(saved));
      } catch {
        const defaults = ['status', 'processType', 'developerName'];
        setActiveCols(defaults);
        localStorage.setItem(localStorageKey, JSON.stringify(defaults));
      }
    } else {
      const defaults = ['status', 'processType', 'developerName'];
      setActiveCols(defaults);
      localStorage.setItem(localStorageKey, JSON.stringify(defaults));
    }
  }, [pageId, localStorageKey]);

  const saveActiveCols = (cols: string[]) => {
    setActiveCols(cols);
    localStorage.setItem(localStorageKey, JSON.stringify(cols));
  };

  // 2. Menu anchor for "+ Add Filter Column" button
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);

  const availableFields = useMemo(() => {
    return allFields.filter(f => !activeCols.includes(f.field));
  }, [allFields, activeCols]);

  const handleAddColumn = (field: string) => {
    const updated = [...activeCols, field];
    saveActiveCols(updated);
    setAddMenuAnchor(null);
  };

  const handleRemoveColumn = (field: string) => {
    const updated = activeCols.filter(f => f !== field);
    saveActiveCols(updated);
    
    setLocalFilters(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="subtitle2" sx={{ color: '#475569', fontWeight: 700, mb: 1, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.05em' }}>
        {t('tcc.detailedColumnFilters', 'Lọc Chi Tiết Theo Cột')}
      </Typography>

      {/* Render active column filters */}
      {activeCols.map((field) => {
        const fieldDef = allFields.find(f => f.field === field);
        if (!fieldDef) return null;

        return (
          <MobileColumnFilterItem
            key={field}
            field={field}
            fieldDef={fieldDef}
            allRows={allRows}
            allFields={allFields}
            localFilters={localFilters}
            setLocalFilters={setLocalFilters}
            onRemove={() => handleRemoveColumn(field)}
            t={t}
          />
        );
      })}

      {activeCols.length === 0 && (
        <Typography sx={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', py: 2 }}>
          {t('tcc.noActiveFilters', 'Chưa có bộ lọc cột nào được thêm')}
        </Typography>
      )}

      {/* Button to add new filter columns */}
      {availableFields.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={(e) => setAddMenuAnchor(e.currentTarget)}
            sx={{
              height: 38,
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 12,
              borderColor: '#bfc9c4',
              color: '#475569',
              '&:hover': {
                borderColor: '#1b5e20',
                bgcolor: 'rgba(27,94,32,0.04)',
                color: '#1b5e20'
              }
            }}
          >
            {t('tcc.addColumnFilter', 'Thêm bộ lọc cột')}
          </Button>

          <Menu
            anchorEl={addMenuAnchor}
            open={Boolean(addMenuAnchor)}
            onClose={() => setAddMenuAnchor(null)}
            PaperProps={{
              sx: {
                maxHeight: 300,
                width: 250,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                mt: 0.5
              }
            }}
          >
            <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
              {t('tcc.selectColumn', 'Chọn cột để thêm')}
            </Typography>
            <Divider sx={{ mb: 0.5 }} />
            {availableFields.map((f) => (
              <MenuItem 
                key={f.field} 
                onClick={() => handleAddColumn(f.field)}
                sx={{ fontSize: 13, py: 1, color: '#334155' }}
              >
                {f.label}
              </MenuItem>
            ))}
          </Menu>
        </Box>
      )}
    </Box>
  );
}
