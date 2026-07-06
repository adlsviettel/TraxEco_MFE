import React, { useState } from 'react';
import { Box, Grid, TextField, InputAdornment, Button, CircularProgress, IconButton, Typography, Autocomplete, Chip, Drawer, Divider } from '@mui/material';
import { Refresh as RefreshIcon, ExpandMore, FilterList as FilterIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export interface SearchField {
  key: string;
  label: string;
  icon: React.ReactNode;
  type?: 'text' | 'date';
  defaultValue?: string;
}

interface FabricSearchFilterProps {
  fields: SearchField[];
  onSearch: (filters: Record<string, string>) => void;
  loading: boolean;
  onClear?: () => void;
  children?: React.ReactNode;
  hideSearchButton?: boolean;
}

export default function FabricSearchFilter({ fields, onSearch, loading, onClear, children, hideSearchButton }: FabricSearchFilterProps) {
  const { t } = useTranslation();
  // Initialize state with default values if provided
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.forEach(f => {
      if (f.defaultValue) initial[f.key] = f.defaultValue;
    });
    return initial;
  });

  const [strayInputs, setStrayInputs] = useState<Record<string, string>>({});

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setStrayInputs(prev => ({ ...prev, [key]: '' })); // Clear stray when successfully chip-ified
  };

  const handleClear = () => {
    const cleared: Record<string, string> = {};
    fields.forEach(f => {
      // Re-apply default values on clear
      if (f.defaultValue) cleared[f.key] = f.defaultValue;
      else cleared[f.key] = '';
    });
    setFilters(cleared);
    setStrayInputs({});
    if (onClear) {
      onClear();
    } else {
      // If no explicit clear handler, just trigger search with cleared filters
      onSearch(cleared);
    }
  };

  const handleSearch = () => {
    const finalFilters = { ...filters };
    let hasStrayChanges = false;
    
    // Auto-consume any typed text that hasn't been chipi-fied (Tablet fix)
    fields.forEach(f => {
      if (strayInputs[f.key] && strayInputs[f.key].trim() !== '') {
        const val = strayInputs[f.key].trim();
        const currentArr = finalFilters[f.key] ? finalFilters[f.key].split(',').map(s=>s.trim()).filter(Boolean) : [];
        if (!currentArr.includes(val)) {
          finalFilters[f.key] = [...currentArr, val].join(', ');
          hasStrayChanges = true;
        }
      }
    });

    if (hasStrayChanges) {
      setFilters(finalFilters);
      setStrayInputs({});
      onSearch(finalFilters);
    } else {
      onSearch(filters);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      setTimeout(handleApply, 100);
    }
  };

  const [open, setOpen] = useState(false);
  const activeFiltersCount = Object.entries(filters).filter(([k, v]) => v && v.trim() !== '' && fields.find(f => f.key === k && (!f.defaultValue || f.defaultValue !== v))).length;

  const handleApply = () => {
    setOpen(false);
    handleSearch();
  };

  const removeFilter = (key: string) => {
    const newFilters = { ...filters };
    const field = fields.find(f => f.key === key);
    if (field && field.defaultValue) {
      newFilters[key] = field.defaultValue;
    } else {
      newFilters[key] = '';
    }
    setFilters(newFilters);
    onSearch(newFilters);
  };
  return (
    <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap-reverse' }}>
      
      {/* Active Filter Chips (Left) */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, flexGrow: 1 }}>
        {Object.entries(filters).map(([k, v]) => {
          if (!v || v.trim() === '') return null;
          const field = fields.find(f => f.key === k);
          if (!field) return null;
          if (field.defaultValue === v) return null; // Don't show default values as active chips
          
          return (
            <Chip
              key={k}
              label={(<Typography variant="caption"><strong>{field.label}:</strong> {v}</Typography>)}
              onDelete={() => removeFilter(k)}
              size="small"
              sx={{ height: 28, borderRadius: '8px', backgroundColor: '#e2e8f0', color: '#0f172a', fontWeight: 500, '& .MuiChip-deleteIcon': { color: '#64748b', '&:hover': { color: '#ef4444' } } }}
            />
          );
        })}
      </Box>

      {/* Actions (Right) */}
      <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
        {children}
        <Button 
          variant="outlined"
          color="inherit"
          onClick={() => setOpen(true)}
          startIcon={
            <Box sx={{ position: 'relative' }}>
              <FilterIcon sx={{ color: '#2e7d32' }} />
              {activeFiltersCount > 0 && (
                <Box sx={{ position: 'absolute', top: -5, right: -5, width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }} />
              )}
            </Box>
          }
          sx={{ 
            height: 32, borderRadius: 1.5, fontWeight: 600, fontSize: '0.8rem', color: '#475569',
            borderColor: '#cbd5e1', backgroundColor: '#fff', textTransform: 'none', px: 2,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            '&:hover': { backgroundColor: '#f1f5f9', borderColor: '#94a3b8' }
          }}
        >
          {t('common.filter', 'Filter')} {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
        </Button>

        {!hideSearchButton && (
          <Button 
            variant="contained"
            onClick={handleApply}
            disabled={loading}
            sx={{
              height: 32, borderRadius: 1.5, fontWeight: 700, fontSize: '0.8rem', minWidth: 90, px: 2.5, textTransform: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff',
              boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
              '&:hover': { background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', boxShadow: '0 4px 12px rgba(16,185,129,0.35)' }
            }}
          >
            {loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : t('common.search', 'Search')}
          </Button>
        )}
      </Box>

      {/* Right Drawer for Filters */}
      <Drawer 
        anchor="right"
        open={open} 
        onClose={() => setOpen(false)} 
        sx={{ zIndex: 9999 }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 380 }, p: 0, display: 'block', overflowY: 'auto' } }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 2, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon sx={{ color: '#2e7d32', fontSize: 20 }} /> {t('common.filter', 'Filter')}
          </Typography>
          <IconButton onClick={() => setOpen(false)} size="small" sx={{ color: '#64748b', '&:hover': { color: '#ef4444', backgroundColor: '#fee2e2' } }}>
            <ExpandMore sx={{ transform: 'rotate(90deg)' }} />
          </IconButton>
        </Box>

        {/* Scrollable Content */}
        <Box sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            {fields.map((f) => {
              const isDate = f.type === 'date';
              return (
                <Grid size={{ xs: 12 }} key={f.key}>
                  {isDate ? (
                    <TextField 
                      fullWidth type="date" variant="outlined" size="small" label={f.label} InputLabelProps={{ shrink: true }}
                      value={filters[f.key] || ''} onChange={e => updateFilter(f.key, e.target.value)} onKeyDown={handleKeyDown}
                      InputProps={{ startAdornment: f.icon ? <InputAdornment position="start" sx={{ mr: 0, '& svg': { fontSize: 18 } }}>{f.icon}</InputAdornment> : null }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                  ) : (
                    <Autocomplete
                      multiple freeSolo size="small" options={[] as string[]}
                      disablePortal
                      value={filters[f.key] ? filters[f.key].split(',').map(s => s.trim()).filter(Boolean) : []}
                      inputValue={strayInputs[f.key] || ''}
                      onInputChange={(_, newInputValue) => {
                        setStrayInputs(prev => ({ ...prev, [f.key]: newInputValue }));
                      }}
                      onChange={(e, newVal) => updateFilter(f.key, newVal.join(', '))}
                      onBlur={() => {
                        // Optional fallback: when leaving the input, consume the string immediately
                        const val = (strayInputs[f.key] || '').trim();
                        if (val) {
                          const currentArr = filters[f.key] ? filters[f.key].split(',').map(s=>s.trim()).filter(Boolean) : [];
                          if (!currentArr.includes(val)) {
                            updateFilter(f.key, [...currentArr, val].join(', '));
                          }
                          setStrayInputs(prev => ({ ...prev, [f.key]: '' }));
                        }
                      }}
                      renderTags={(tagValue, getTagProps) =>
                        tagValue.map((option, index) => {
                          const { key, ...restProps } = getTagProps({ index });
                          return <Chip variant="outlined" label={option} size="small" key={key} {...restProps} sx={{ height: 20, fontSize: '0.7rem' }} />;
                        })
                      }
                      renderInput={(params) => (
                        <TextField 
                          {...params} fullWidth type="text" variant="outlined" placeholder={!filters[f.key] ? f.label : ''} label={f.label} InputLabelProps={{ shrink: true }}
                          InputProps={{ ...params.InputProps, startAdornment: (<>{f.icon ? <InputAdornment position="start" sx={{ mr: 0, '& svg': {fontSize: 18} }}>{f.icon}</InputAdornment> : null}{params.InputProps.startAdornment}</>) }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter') {
                              const val = (e.target as HTMLInputElement).value.trim();
                              // If input is physically empty and user presses Enter, trigger Search
                              if (!val) {
                                e.preventDefault();
                                e.stopPropagation(); 
                                setTimeout(() => handleApply(), 10);
                              }
                            }
                          }}
                        />
                      )}
                    />
                  )}
                </Grid>
              );
            })}
          </Grid>
        </Box>

        {/* Footer Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', '& > *:not(:last-child)': { mr: 1.5 }, p: 1.5, borderTop: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
          <Button variant="outlined" size="small" onClick={handleClear} startIcon={<RefreshIcon sx={{ fontSize: '18px !important' }} />} sx={{ borderRadius: 1.5, height: 32, minWidth: 90, fontWeight: 600, fontSize: '0.8rem', color: '#475569', borderColor: '#cbd5e1', textTransform: 'none', px: 2, '&:hover': { backgroundColor: '#f1f5f9', color: '#ef4444', borderColor: '#fca5a5' } }}>
            {t('common.reset', 'Default')}
          </Button>
          <Button variant="contained" size="small" onClick={handleApply} disableElevation sx={{ borderRadius: 1.5, height: 32, flexGrow: 1, fontWeight: 700, fontSize: '0.8rem', textTransform: 'none', px: 3, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', '&:hover': { background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' } }}>
            {t('common.apply', 'Apply Now')}
          </Button>
        </Box>

        {/* 
          Spacer ảo chống lỗi Huawei / adjustNothing Native
          Mục đích: Vì màn hình không tự thu nhỏ khi mở bàn phím, bàn phím sẽ che khoảng 300-400px bên dưới.
          Box rỗng này tạo thêm không gian Scroll ở đuôi Drawer, giúp dời các nút thao tác lên trên bàn phím.
        */}
        <Box sx={{ height: '400px', flexShrink: 0, opacity: 0, pointerEvents: 'none' }} />
      </Drawer>
    </Box>
  );
}
