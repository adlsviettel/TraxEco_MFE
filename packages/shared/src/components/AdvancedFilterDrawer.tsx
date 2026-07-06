import React from 'react';
import { Drawer, Box, Typography, IconButton } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { useTranslation } from 'react-i18next';
import AppButton from './ui/AppButton';

export interface AdvancedFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  onClear: () => void;
  onApply: () => void;
  hasActiveFilters: boolean;
  children: React.ReactNode;
  title?: string;
}

const AdvancedFilterDrawer: React.FC<AdvancedFilterDrawerProps> = ({
  open,
  onClose,
  onClear,
  onApply,
  hasActiveFilters,
  children,
  title
}) => {
  const { t } = useTranslation();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      e.key === 'Enter' && 
      !e.defaultPrevented && 
      (e.target as HTMLInputElement).tagName === 'INPUT' && 
      !(e.target as HTMLInputElement).value
    ) {
      e.preventDefault();
      onApply();
    }
  };

  const handleApply = () => {
    let hasUncommitted = false;
    // Find all Autocomplete inputs and check if they have uncommitted text
    const inputs = document.querySelectorAll('.MuiAutocomplete-input');
    inputs.forEach((input) => {
      const el = input as HTMLInputElement;
      if (el.value && el.value.trim() !== '') {
        hasUncommitted = true;
        // Dispatch Enter keydown to force MUI Autocomplete to commit the value
        el.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        }));
      }
    });

    if (hasUncommitted) {
      // Give React a moment to update state before applying
      setTimeout(onApply, 50);
    } else {
      onApply();
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ zIndex: 1250 }}
      PaperProps={{ sx: { width: { xs: '100%', sm: 360 }, p: 0, bgcolor: '#f8fafc' } }}
    >
      <Box sx={{ p: 2.5, bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={700}>
          {title || t('common.advanced_filter', 'Filter Nâng cao')}
        </Typography>
        <IconButton onClick={onClose} size="small"><ClearIcon /></IconButton>
      </Box>

      <Box 
        display="flex" 
        flexDirection="column" 
        gap={2} 
        sx={{ p: 2.5, flex: 1, overflowY: 'auto' }} 
        onKeyDown={handleKeyDown}
      >
        {children}
      </Box>

      <Box sx={{ p: 2.5, bgcolor: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 1.5 }}>
        {hasActiveFilters && (
          <AppButton 
            fullWidth 
            variant="outlined" 
            customVariant="secondary"
            onClick={onClear} 
          >
            {t('common.clear_all', 'Xóa tất cả')}
          </AppButton>
        )}
        <AppButton 
          fullWidth 
          variant="contained" 
          customVariant="primary"
          onClick={handleApply} 
        >
          {t('common.apply', 'Apply')}
        </AppButton>
      </Box>
    </Drawer>
  );
};

export default AdvancedFilterDrawer;
