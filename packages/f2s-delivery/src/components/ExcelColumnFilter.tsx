import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Popover, Box, Typography, TextField, Checkbox, FormControlLabel,
  Button, Divider, IconButton, InputAdornment, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Chip
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  FilterAltOutlined as FilterIcon,
  FilterAltOff as FilterOffIcon,
} from '@mui/icons-material';

export interface FilterOption {
  value: string;
  label?: string;
  count?: number;
}

interface ExcelColumnFilterProps {
  title: string;
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  options: FilterOption[];
  selectedValues: string[];
  onApply: (selected: string[]) => void;
  onClear: () => void;
  onSortAsc?: () => void;
  onSortDesc?: () => void;
  currentSort?: 'asc' | 'desc' | null;
  allowCustomValue?: boolean;
}

export default function ExcelColumnFilter({
  title,
  anchorEl,
  open,
  onClose,
  options,
  selectedValues,
  onApply,
  onClear,
  onSortAsc,
  onSortDesc,
  currentSort,
  allowCustomValue = true,
}: ExcelColumnFilterProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelected, setTempSelected] = useState<Set<string>>(new Set());

  // Khi mở popover, reset lại state theo selectedValues hiện tại (Excel style: nếu chưa lọc thì chọn tất cả)
  useEffect(() => {
    if (open) {
      setSearchTerm('');
      if (selectedValues.length > 0) {
        setTempSelected(new Set(selectedValues));
      } else {
        setTempSelected(new Set(options.map(opt => opt.value)));
      }
    }
  }, [open, selectedValues, options]);

  // Lọc danh sách options theo từ khóa tìm kiếm
  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return options;
    return options.filter(opt =>
      (opt.label || opt.value).toLowerCase().includes(term)
    );
  }, [options, searchTerm]);

  // Kiểm tra nếu người dùng gõ từ khóa mà không có sẵn trong options
  const hasExactMatch = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return options.some(opt => (opt.label || opt.value).toLowerCase() === term);
  }, [options, searchTerm]);

  // Trạng thái của Checkbox "Chọn tất cả"
  const isAllFilteredSelected = filteredOptions.length > 0 &&
    filteredOptions.every(opt => tempSelected.has(opt.value));
  const isSomeFilteredSelected = filteredOptions.some(opt => tempSelected.has(opt.value)) &&
    !isAllFilteredSelected;

  const handleToggleSelectAll = () => {
    setTempSelected(prev => {
      const next = new Set(prev);
      if (isAllFilteredSelected) {
        filteredOptions.forEach(opt => next.delete(opt.value));
      } else {
        filteredOptions.forEach(opt => next.add(opt.value));
      }
      return next;
    });
  };

  const handleToggleOption = (value: string) => {
    setTempSelected(prev => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const handleAddCustomValue = () => {
    const term = searchTerm.trim();
    if (!term) return;
    setTempSelected(prev => {
      const next = new Set(prev);
      next.add(term);
      return next;
    });
    setSearchTerm('');
  };

  const handleApply = () => {
    const isAllOriginalSelected = options.length > 0 &&
      options.every(opt => tempSelected.has(opt.value)) &&
      tempSelected.size === options.length;
    if (isAllOriginalSelected) {
      onClear();
    } else {
      onApply(Array.from(tempSelected));
    }
    onClose();
  };

  const handleClear = () => {
    onClear();
    onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      PaperProps={{
        elevation: 8,
        sx: {
          width: 310,
          borderRadius: 3,
          mt: 1,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          boxShadow: '0 14px 36px rgba(0, 0, 0, 0.14)',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 1.5, pb: 1, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <FilterIcon sx={{ color: '#10b981', fontSize: 18 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b' }}>
              {title}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: '#94a3b8' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Sort Actions (giống Excel: Sort A to Z, Sort Z to A) */}
        {(onSortAsc || onSortDesc) && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            {onSortAsc && (
              <Button
                size="small"
                fullWidth
                variant={currentSort === 'asc' ? 'contained' : 'outlined'}
                onClick={() => { onSortAsc(); onClose(); }}
                startIcon={<ArrowUpwardIcon sx={{ fontSize: 14 }} />}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  py: 0.4,
                  borderRadius: 1.5,
                  bgcolor: currentSort === 'asc' ? '#10b981' : '#fff',
                  borderColor: currentSort === 'asc' ? '#10b981' : '#cbd5e1',
                  color: currentSort === 'asc' ? '#fff' : '#475569',
                  '&:hover': { bgcolor: currentSort === 'asc' ? '#059669' : '#f1f5f9' },
                }}
              >
                A → Z
              </Button>
            )}
            {onSortDesc && (
              <Button
                size="small"
                fullWidth
                variant={currentSort === 'desc' ? 'contained' : 'outlined'}
                onClick={() => { onSortDesc(); onClose(); }}
                startIcon={<ArrowDownwardIcon sx={{ fontSize: 14 }} />}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  py: 0.4,
                  borderRadius: 1.5,
                  bgcolor: currentSort === 'desc' ? '#10b981' : '#fff',
                  borderColor: currentSort === 'desc' ? '#10b981' : '#cbd5e1',
                  color: currentSort === 'desc' ? '#fff' : '#475569',
                  '&:hover': { bgcolor: currentSort === 'desc' ? '#059669' : '#f1f5f9' },
                }}
              >
                Z → A
              </Button>
            )}
          </Box>
        )}
      </Box>

      {/* Search Box */}
      <Box sx={{ p: 1.5, pb: 1 }}>
        <TextField
          size="small"
          placeholder={t('excelFilter.search', 'Tìm kiếm giá trị...')}
          value={searchTerm}
          autoFocus
          fullWidth
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (!hasExactMatch && searchTerm.trim()) {
                handleAddCustomValue();
              } else {
                handleApply();
              }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
              </InputAdornment>
            ),
            endAdornment: searchTerm ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')} edge="end">
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              fontSize: '0.82rem',
              bgcolor: '#f8fafc',
            },
          }}
        />
      </Box>

      <Divider />

      {/* Select All Checkbox */}
      <Box sx={{ px: 1.5, py: 0.5, bgcolor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={isAllFilteredSelected}
              indeterminate={isSomeFilteredSelected}
              onChange={handleToggleSelectAll}
              sx={{ p: 0.5, color: '#94a3b8', '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: '#10b981' } }}
            />
          }
          label={
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155', fontSize: '0.8rem' }}>
              {t('excelFilter.selectAll', '(Chọn tất cả)')}
            </Typography>
          }
          sx={{ m: 0, width: '100%' }}
        />
      </Box>

      {/* Options List */}
      <List sx={{ maxHeight: 220, overflowY: 'auto', p: 0.5 }}>
        {filteredOptions.length === 0 && !searchTerm.trim() ? (
          <Typography variant="caption" sx={{ p: 2, color: '#94a3b8', display: 'block', textAlign: 'center' }}>
            {t('excelFilter.noData', 'Không có dữ liệu')}
          </Typography>
        ) : (
          filteredOptions.map((opt) => {
            const isChecked = tempSelected.has(opt.value);
            return (
              <ListItem key={opt.value} disablePadding>
                <ListItemButton
                  dense
                  onClick={() => handleToggleOption(opt.value)}
                  sx={{
                    borderRadius: 1.5,
                    py: 0.4,
                    px: 1,
                    '&:hover': { bgcolor: '#f1f5f9' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <Checkbox
                      edge="start"
                      size="small"
                      checked={isChecked}
                      tabIndex={-1}
                      disableRipple
                      sx={{ p: 0, color: '#cbd5e1', '&.Mui-checked': { color: '#10b981' } }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{
                          fontSize: '0.82rem',
                          fontWeight: isChecked ? 700 : 500,
                          color: isChecked ? '#0f172a' : '#475569',
                        }}
                      >
                        {opt.label || opt.value}
                      </Typography>
                    }
                  />
                  {opt.count !== undefined && (
                    <Chip
                      size="small"
                      label={opt.count}
                      sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        bgcolor: isChecked ? '#ecfdf5' : '#f1f5f9',
                        color: isChecked ? '#047857' : '#64748b',
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })
        )}

        {/* Nút thêm giá trị gõ tay nếu không tìm thấy trong options */}
        {allowCustomValue !== false && !hasExactMatch && searchTerm.trim() && (
          <ListItem disablePadding>
            <ListItemButton
              dense
              onClick={handleAddCustomValue}
              sx={{
                borderRadius: 1.5,
                py: 0.5,
                px: 1,
                bgcolor: 'rgba(16, 185, 129, 0.08)',
                '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.16)' },
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#047857' }}>
                {t('excelFilter.addValue', '+ Thêm "{{val}}" vào bộ lọc', { val: searchTerm.trim() })}
              </Typography>
            </ListItemButton>
          </ListItem>
        )}
      </List>

      <Divider />

      {/* Footer Actions */}
      <Box sx={{ p: 1, px: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f8fafc' }}>
        <Button
          size="small"
          variant="text"
          onClick={handleClear}
          disabled={tempSelected.size === 0 && selectedValues.length === 0}
          startIcon={<FilterOffIcon sx={{ fontSize: 14 }} />}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.75rem',
            color: '#ef4444',
            '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.08)' },
          }}
        >
          {t('excelFilter.clear', 'Xóa lọc')}
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="text"
            onClick={onClose}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}
          >
            {t('excelFilter.cancel', 'Hủy')}
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleApply}
            disableElevation
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.75rem',
              borderRadius: 1.5,
              bgcolor: '#10b981',
              px: 1.5,
              '&:hover': { bgcolor: '#059669' },
            }}
          >
            {t('excelFilter.apply', 'Áp dụng')}
          </Button>
        </Box>
      </Box>
    </Popover>
  );
}
