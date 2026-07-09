import React from 'react';
import { Paper, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import { AppButton } from '@traxeco/shared';

interface DateFilterBarProps {
  preset: string;
  fromDate: string;
  toDate: string;
  onPresetChange: (preset: string) => void;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  onClear: () => void;
  t: any;
}

export const DateFilterBar: React.FC<DateFilterBarProps> = ({
  preset,
  fromDate,
  toDate,
  onPresetChange,
  onFromDateChange,
  onToDateChange,
  onClear,
  t
}) => {
  return (
    <Paper 
      className="no-print"
      elevation={0} 
      sx={{ 
        p: 2, 
        mb: 3, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        flexWrap: 'wrap', 
        borderRadius: '8px', 
        border: '1px solid #e2e8f0',
        bgcolor: '#ffffff'
      }}
    >
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel sx={{ fontSize: 13 }}>{t('common.presetRange', 'Preset Range')}</InputLabel>
        <Select
          value={preset}
          label={t('common.presetRange', 'Preset Range')}
          onChange={(e) => onPresetChange(e.target.value)}
          sx={{ 
            borderRadius: '8px', 
            height: 40, 
            fontSize: 13,
            bgcolor: '#fff',
            '& fieldset': { borderColor: '#bfc9c4' },
            '&:hover fieldset': { borderColor: '#2e7d32' },
            '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
          }}
        >
          <MenuItem value="All Time">{t('common.allTime', 'All Time')}</MenuItem>
          <MenuItem value="This Week">{t('common.thisWeek', 'This Week')}</MenuItem>
          <MenuItem value="This Month">{t('common.thisMonth', 'This Month')}</MenuItem>
          <MenuItem value="This Year">{t('common.thisYear', 'This Year')}</MenuItem>
          <MenuItem value="Custom">{t('common.customRange', 'Custom Range')}</MenuItem>
        </Select>
      </FormControl>

      <DatePicker format="dd/MM/yyyy"
        label={t('common.fromDate', 'From Date')}
        value={fromDate ? new Date(fromDate) : null}
        onChange={(val) => {
          onPresetChange('Custom');
          onFromDateChange(val ? format(val, 'yyyy-MM-dd') : '');
        }}
        slotProps={{
          textField: {
            size: 'small',
            sx: {
              '& .MuiOutlinedInput-root': { 
                borderRadius: '8px', 
                height: 40, 
                fontSize: 13,
                bgcolor: '#fff',
                '& fieldset': { borderColor: '#bfc9c4' },
                '&:hover fieldset': { borderColor: '#2e7d32' },
                '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
              },
              '& .MuiInputLabel-root': { fontSize: 13 }
            }
          }
        }}
      />

      <DatePicker format="dd/MM/yyyy"
        label={t('common.toDate', 'To Date')}
        value={toDate ? new Date(toDate) : null}
        onChange={(val) => {
          onPresetChange('Custom');
          onToDateChange(val ? format(val, 'yyyy-MM-dd') : '');
        }}
        slotProps={{
          textField: {
            size: 'small',
            sx: {
              '& .MuiOutlinedInput-root': { 
                borderRadius: '8px', 
                height: 40, 
                fontSize: 13,
                bgcolor: '#fff',
                '& fieldset': { borderColor: '#bfc9c4' },
                '&:hover fieldset': { borderColor: '#2e7d32' },
                '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
              },
              '& .MuiInputLabel-root': { fontSize: 13 }
            }
          }
        }}
      />

      {(fromDate || toDate) && (
        <AppButton
          variant="outlined"
          customVariant="secondary"
          onClick={onClear}
          sx={{ height: 40, borderRadius: '8px', fontSize: 13, textTransform: 'none' }}
        >
          {t('common.clearFilters', 'Clear Filters')}
        </AppButton>
      )}
    </Paper>
  );
};
