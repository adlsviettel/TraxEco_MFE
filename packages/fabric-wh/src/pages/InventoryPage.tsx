/**
 * Fabric Warehouse — Inventory Page
 * Multi-select, soft-delete, context menu, column filters, Excel export
 */
import { useState, useCallback, useMemo, useRef, memo, useTransition, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Typography, Paper, TextField, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Pagination, CircularProgress, Chip, IconButton, Checkbox, Select, Alert, LinearProgress,
  Popover, Badge, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, Menu, MenuItem, ListItemIcon, ListItemText, Autocomplete, Snackbar, Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  QrCode as QrCodeIcon,
  LocalShipping as PalletIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CategoryIcon from '@mui/icons-material/Category';
import PaletteIcon from '@mui/icons-material/Palette';
import LayersIcon from '@mui/icons-material/Layers';
import * as XLSX from 'xlsx';
import { fabricInventoryService, type FabricInventoryItem, type InventorySearchParams, type LocationHistoryItem } from '../services/fabricInventoryService';
import { authService, useToast, useExcelDragSelection } from '@traxeco/shared';
import FabricSearchFilter from '../components/FabricSearchFilter';

const ACCENT = '#2e7d32';

// ─── Pre-computed static sx objects ───
const SX_CELL = { whiteSpace: 'nowrap', fontSize: '12px' } as const;
const SX_CELL_BOLD = { ...SX_CELL, fontWeight: 700 } as const;
const SX_HEADER_CELL = { fontWeight: 700, backgroundColor: '#f8fafc', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 2, borderBottom: '2px solid #e2e8f0', color: '#334155', letterSpacing: '0.02em' } as const;
const SX_ROW = {
  backgroundColor: '#fff',
  '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
  cursor: 'pointer',
  transition: 'background-color 0.12s ease-out',
  '&:hover': { backgroundColor: '#e8f5e9 !important' },
  '&:hover .sticky-cell': { backgroundColor: '#e8f5e9 !important' }
} as const;
const SX_ROW_SELECTED = {
  ...SX_ROW,
  backgroundColor: '#c8e6c9 !important',
  '&:nth-of-type(odd)': { backgroundColor: '#c8e6c9 !important' },
  '& .sticky-cell': { backgroundColor: '#c8e6c9 !important' }
} as const;
const SX_CHIP_QC_STAR = { fontWeight: 700, height: 22, fontSize: '0.72rem', backgroundColor: '#ffeb3b', color: '#d32f2f' } as const;
const SX_CHIP_STATUS = { fontWeight: 600, height: 22, fontSize: '0.72rem' } as const;
const NUMERIC_COLS = new Set(['ShipLength', 'Balance', 'NW', 'GW', 'Width']);

// ─── Simple Column Filter Popover ───
const EMPTY_OPTIONS: readonly string[] = [];

// ─── Simple Column Filter Popover ───
const ColumnFilter = memo(({ colKey, label, value, onChange }: { colKey: string; label: string; value: string; onChange: (k: string, v: string) => void }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const active = !!value;

  const handleChange = useCallback((v: string) => { onChange(colKey, v); }, [colKey, onChange]);
  const parsedValue = useMemo(() => value ? value.split(',').map(s => s.trim()).filter(Boolean) : [], [value]);

  return (
    <>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.2 }}>{label}</Typography>
        <IconButton
          size="small"
          onClick={(e) => { setAnchorEl(e.currentTarget); setTimeout(() => inputRef.current?.focus(), 80); }}
          sx={{ p: 0.25, color: active ? ACCENT : '#bbb', '&:hover': { color: ACCENT, backgroundColor: '#e8f5e9' } }}
        >
          <Badge variant="dot" invisible={!active} color="success">
            <FilterIcon sx={{ fontSize: 15 }} />
          </Badge>
        </IconButton>
      </Box>
      <Popover
        open={!!anchorEl} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 1.5, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 260, maxWidth: 350 } } }}
      >
        <Autocomplete
          multiple
          freeSolo
          options={EMPTY_OPTIONS}
          value={parsedValue}
          onChange={(e, newVal) => handleChange(newVal.join(', '))}
          renderTags={(tagValue, getTagProps) =>
            tagValue.map((option, index) => {
              const { key, ...restProps } = getTagProps({ index });
              return <Chip variant="outlined" label={option} size="small" key={key} {...restProps} sx={{ height: 24, fontSize: '0.75rem' }} />;
            })
          }
          renderInput={(params) => (
            <TextField {...params} inputRef={inputRef} size="small" placeholder={value ? '' : `Filter ${label}...`}
              onKeyDown={(e) => { if (e.key === 'Escape') setAnchorEl(null); }}
              autoFocus fullWidth
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <>
                    <SearchIcon sx={{ fontSize: 18, color: '#999', ml: 0.5, mr: 0.5 }} />
                    {params.InputProps.startAdornment}
                  </>
                )
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem' } }}
            />
          )}
        />
      </Popover>
    </>
  );
});

// All columns
const ALL_COLUMNS: { key: string; label: string; width: number; noFilter?: boolean }[] = [
  { key: 'DateInHouse', label: 'Date In', width: 100 },
  { key: 'Status', label: 'Status', width: 100 },
  { key: 'SupCode', label: 'Supplier', width: 90 },
  { key: 'OrderNumber', label: 'Order No', width: 120 },
  { key: 'InvoiceNo', label: 'Invoice', width: 120 },
  { key: 'Invoice2', label: 'Invoice 2', width: 100 },
  { key: 'RollItem', label: 'Item', width: 120 },
  { key: 'ColorCode', label: 'Color Code', width: 100 },
  { key: 'Color', label: 'Color', width: 100 },
  { key: 'BatchNo', label: 'Batch', width: 100 },
  { key: 'RollNo', label: 'Roll No', width: 80 },
  { key: 'ShipLength', label: 'Ship Length', width: 95 },
  { key: 'Balance', label: 'Balance', width: 80 },
  { key: 'NW', label: 'NW', width: 60 },
  { key: 'GW', label: 'GW', width: 60 },
  { key: 'Width', label: 'Width', width: 70 },
  { key: 'Location', label: 'Location', width: 100 },
  { key: 'WH-Location', label: 'WH-Location', width: 100 },
  { key: 'DateModify', label: 'Date Modified', width: 110 },
  { key: 'Modify_By', label: 'Modified By', width: 100 },
  { key: 'Fac', label: 'Factory', width: 70 },
  { key: 'Qc', label: 'QC By', width: 80 },
  { key: 'PassPO', label: 'QC Status', width: 90 },
  { key: 'InsptRoll', label: 'Inspect', width: 80 },
  { key: 'Comment', label: 'Comment', width: 120 },
  { key: 'Remark', label: 'Remark', width: 120 },
  { key: 'Remark2', label: 'Remark 2', width: 100 },
  { key: 'Date_Relax', label: 'Relax Date', width: 100 },
  { key: 'Time_Relax', label: 'Relax Time', width: 90 },
  { key: 'RelaxBy', label: 'Relax By', width: 90 },
  { key: 'HourRelax', label: 'Relax (h)', width: 80 },
  { key: 'HourStandard', label: 'Std (h)', width: 70 },
  { key: 'QrCode', label: 'QR Code', width: 120 },
  { key: 'BarCode', label: 'Barcode', width: 120 },
  { key: 'RecNo', label: '#', width: 60, noFilter: true },
];
const COL_COUNT = ALL_COLUMNS.length;



// ─── Memoized table row ───
interface InventoryRowProps {
  rowIndex: number;
  row: FabricInventoryItem; selected: boolean; canDelete: boolean; canEdit: boolean;
  selectedCells: Set<string> | null; // Keep for interface compatibility if needed, or remove
  getCellProps: (colKey: string, rowIndex: number, isNumeric: boolean) => any;
  onToggle: (recNo: number, isShiftPressed: boolean) => void;
  onContextMenu: (e: React.MouseEvent, row: FabricInventoryItem) => void;
  onEditBalance: (row: FabricInventoryItem, newValue: number) => Promise<void>;
  onEditLength: (row: FabricInventoryItem, newValue: number) => Promise<void>;
  onEditLocation: (row: FabricInventoryItem, newValue: string) => Promise<void>;
  onEditComment: (row: FabricInventoryItem, newValue: string) => Promise<void>;
  onEditWHLocation: (row: FabricInventoryItem, newValue: string) => Promise<void>;
}

const InventoryRow = memo(({ 
  rowIndex, row, canEdit = false, canDelete = false, 
  selected, selectedCells, getCellProps, onToggle, onContextMenu, 
  onEditBalance, onEditLength, onEditLocation, onEditComment, onEditWHLocation
}: InventoryRowProps) => {
  const [editingCol, setEditingCol] = useState<'Balance' | 'ShipLength' | 'Location' | 'Comment' | 'WH-Location' | null>(null);
  const [editVal, setEditVal] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (colKey: 'Balance' | 'ShipLength' | 'Location' | 'Comment' | 'WH-Location') => {
    if (!canEdit) return;
    setEditingCol(colKey);
    setEditVal(row[colKey] != null ? String(row[colKey]) : '');
  };

  const handleSave = async () => {
    if (!editingCol) return;
    
    // For string columns like Location, WH-Location or Comment
    if (editingCol === 'Location' || editingCol === 'Comment' || editingCol === 'WH-Location') {
      const originalVal = String(row[editingCol] ?? '');
      if (editVal.trim() === '' && originalVal === '') {
        setEditingCol(null);
        return;
      }
      if (editVal.trim() === originalVal) {
        setEditingCol(null);
        return;
      }
      setSaving(true);
      try {
        if (editingCol === 'Location') {
          await onEditLocation(row, editVal.trim());
        } else if (editingCol === 'Comment') {
          await onEditComment(row, editVal.trim());
        } else if (editingCol === 'WH-Location') {
          await onEditWHLocation(row, editVal.trim());
        }
        setEditingCol(null);
      } catch {
        // Keep open on error
      } finally {
        setSaving(false);
      }
      return;
    }

    // For numeric columns
    const num = Number(editVal);
    const originalVal = Number(row[editingCol]);
    
    if (isNaN(num) || num < 0 || editVal === '' || num === originalVal || (editingCol === 'ShipLength' && num <= 0)) {
      setEditingCol(null);
      return;
    }
    
    setSaving(true);
    try {
      if (editingCol === 'Balance') await onEditBalance(row, num);
      if (editingCol === 'ShipLength') await onEditLength(row, num);
      setEditingCol(null);
    } catch {
      // Keep open on error
    } finally {
      setSaving(false);
    }
  };

  return (
    <TableRow hover onContextMenu={(e) => onContextMenu(e, row)} sx={selected ? SX_ROW_SELECTED : SX_ROW}>
      {canDelete && (
        <TableCell padding="checkbox" className="sticky-cell" sx={{ py: 0, position: 'sticky', left: 0, bgcolor: '#fff', zIndex: 1, transition: 'background-color 0.12s ease-out' }}>
          <Checkbox size="small" disableRipple checked={selected} 
            onChange={(e: any) => onToggle(row.RecNo, e.nativeEvent?.shiftKey || false)}
            sx={{ p: 0.3, '&.Mui-checked': { color: ACCENT } }} />
        </TableCell>
      )}
      {useMemo(() => ALL_COLUMNS.map(col => {
        const val = row[col.key as keyof FabricInventoryItem];

        // Inline Edit Columns
        if (col.key === 'Balance' || col.key === 'ShipLength' || col.key === 'Location' || col.key === 'Comment' || col.key === 'WH-Location') {
          const isNumeric = col.key === 'Balance' || col.key === 'ShipLength';
          const cellProps = isNumeric ? getCellProps(col.key, rowIndex, isNumeric) : {};
          return (
            <TableCell 
               key={col.key} 
               {...cellProps}
               sx={{ ...SX_CELL, 
                 userSelect: isNumeric ? 'none' : 'auto',
               }}>
              {editingCol === col.key ? (
                 <TextField
                   size="small"
                   autoFocus
                   type={isNumeric ? "number" : "text"}
                   value={editVal}
                   autoComplete="off"
                   onChange={e => {
                     const val = e.target.value;
                     if (isNumeric) {
                        setEditVal(val === '' ? '' : Math.max(0, Number(val)).toString());
                     } else {
                        setEditVal(val);
                     }
                   }}
                   onBlur={handleSave}
                   onKeyDown={e => {
                     if (e.key === 'Enter') handleSave();
                     if (e.key === 'Escape') setEditingCol(null);
                   }}
                   inputProps={isNumeric ? { step: "0.01", min: "0" } : undefined}
                   sx={{ 
                     width: isNumeric ? 70 : 150, 
                     input: { p: '2px 4px', fontSize: '0.85rem', fontWeight: 700, textAlign: isNumeric ? 'center' : 'left' },
                     '& .MuiOutlinedInput-root': { borderRadius: 1 }
                   }}
                   InputProps={{
                     endAdornment: saving ? <CircularProgress size={12} sx={{ ml: 0.5, color: ACCENT }} /> : null
                   }}
                 />
              ) : (
                <Box 
                  onClick={() => startEdit(col.key as any)} 
                  sx={{ 
                     display: 'flex', 
                     alignItems: 'center', 
                     justifyContent: isNumeric ? 'center' : 'flex-start',
                     gap: 0.5,
                     cursor: canEdit ? 'pointer' : 'default', 
                     minWidth: isNumeric ? 40 : 80,
                     minHeight: 20,
                     width: '100%',
                     '&:hover .edit-icon': { opacity: canEdit ? 1 : 0 }
                  }}>
                  <span>{isNumeric ? (val != null && val !== '' ? Number(val).toFixed(2) : '') : (val != null ? String(val) : '')}</span>
                  {canEdit && (
                    <Box className="edit-icon" title="Edit" sx={{ opacity: 0, transition: '0.2s', minWidth: 16, width: 16, height: 16, bgcolor: '#e8f5e9', color: ACCENT, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </Box>
                  )}
                </Box>
              )}
            </TableCell>
          );
        }

        if (col.key === 'Status') {
          const statusMap: Record<string, { text: string, color: string, bg: string }> = {
            '1': { text: 'RECEIVED', color: '#616161', bg: '#f5f5f5' },
            '2': { text: 'IN STOCK', color: '#2e7d32', bg: '#e8f5e9' },
            '3': { text: 'RELAXING', color: '#ed6c02', bg: '#fff3e0' },
            '4': { text: 'RELAXED', color: '#0288d1', bg: '#e1f5fe' },
            '5': { text: 'PREPARE', color: '#9c27b0', bg: '#f3e5f5' },
            '6': { text: 'ISSUING', color: '#d32f2f', bg: '#ffebee' },
            '7': { text: 'ISSUED', color: '#455a64', bg: '#eceff1' },
            '8': { text: 'RETURNED', color: '#5d4037', bg: '#efebe9' },
            'RECEIVED': { text: 'RECEIVED', color: '#616161', bg: '#f5f5f5' },
            'IN_STOCK': { text: 'IN STOCK', color: '#2e7d32', bg: '#e8f5e9' },
            'RELAXING': { text: 'RELAXING', color: '#ed6c02', bg: '#fff3e0' },
            'RELAXED': { text: 'RELAXED', color: '#0288d1', bg: '#e1f5fe' },
            'PREPARE': { text: 'PREPARE', color: '#9c27b0', bg: '#f3e5f5' },
            'ISSUING': { text: 'ISSUING', color: '#d32f2f', bg: '#ffebee' },
            'ISSUED': { text: 'ISSUED', color: '#455a64', bg: '#eceff1' },
            'RETURNED': { text: 'RETURNED', color: '#5d4037', bg: '#efebe9' },
          };
          const statusStr = String(val ?? '').trim();
          const mapped = statusMap[statusStr] || { text: statusStr, color: '#333', bg: '#e0e0e0' };
          
          return (
            <TableCell key={col.key} sx={SX_CELL}>
              {val != null && val !== '' ? (
                <Chip 
                  label={mapped.text} 
                  size="small" 
                  sx={{ 
                    height: 22, 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    color: mapped.color, 
                    bgcolor: mapped.bg,
                    border: `1px solid ${mapped.color}40`
                  }} 
                />
              ) : null}
            </TableCell>
          );
        }

        if (col.key === 'Qc' && val && String(val).includes('*')) {
          return <TableCell key={col.key} sx={SX_CELL}><Chip label={String(val)} size="small" sx={SX_CHIP_QC_STAR} /></TableCell>;
        }
        if ((col.key === 'PassPO' || col.key === 'InsptRoll') && val) {
          return (
            <TableCell key={col.key} sx={SX_CELL}>
              <Chip label={String(val)} size="small"
                color={val === 'Passed' ? 'success' : val === 'Failed' ? 'error' : 'default'}
                sx={SX_CHIP_STATUS} />
            </TableCell>
          );
        }
        if (col.key === 'HourRelax' && val != null) {
          const hours = Number(val);
          const std = Number(row.HourStandard || 24);
          const isEnough = hours >= std;
          const percentRaw = Math.min(100, (hours / (std || 1)) * 100);
          const percentStr = percentRaw.toFixed(2);
          
          let pColor = '#10b981'; // Green for 100%
          if (percentRaw < 25) pColor = '#ef4444'; // Red
          else if (percentRaw < 50) pColor = '#f97316'; // Orange
          else if (percentRaw < 75) pColor = '#eab308'; // Yellow
          else if (percentRaw < 100) pColor = '#3b82f6'; // Blue

          return (
            <TableCell key={col.key} sx={SX_CELL}>
              <Box title={`${hours.toFixed(2)}h / ${std}h`} sx={{ display: 'flex', alignItems: 'center', minWidth: 60, cursor: 'help' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, width: 44, textAlign: 'right', mr: 1, color: pColor }}>
                  {percentStr}%
                </Typography>
                <LinearProgress variant="determinate" value={percentRaw} 
                  sx={{ flexGrow: 1, height: 6, borderRadius: 3, backgroundColor: '#e2e8f0', '& .MuiLinearProgress-bar': { backgroundColor: pColor } }} />
              </Box>
            </TableCell>
          );
        }
        if (NUMERIC_COLS.has(col.key) && val != null && val !== '') {
          const num = Number(val);
          return <TableCell key={col.key} sx={SX_CELL}>{isNaN(num) ? String(val) : num.toFixed(2)}</TableCell>;
        }
        // Specific checks for Date columns
        if (col.key.includes('Date')) {
          const formatDateTime = (dStr: any) => {
            if (!dStr) return '';
            const d = new Date(dStr);
            if (isNaN(d.getTime())) return String(dStr);
            const p = (n: number) => n.toString().padStart(2, '0');
            return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
          };
          return <TableCell key={col.key} sx={SX_CELL}>{val ? formatDateTime(val) : ''}</TableCell>;
        }

        // Highlight RollNo column
        if (col.key === 'RollNo') {
          return <TableCell key={col.key} sx={{ ...SX_CELL, fontWeight: 800, color: '#1565c0' }}>{val != null && val !== '' ? String(val) : ''}</TableCell>;
        }

        // Read-only numeric columns highlighting support
        const isNumericCol = col.key === 'NW' || col.key === 'GW' || col.key === 'Width';
        const cellProps = isNumericCol ? getCellProps(col.key, rowIndex, isNumericCol) : {};
        
        return (
          <TableCell 
             key={col.key} 
             {...cellProps}
             sx={{ ...SX_CELL, 
               userSelect: isNumericCol ? 'none' : 'auto',
             }}>
             {val != null && val !== '' ? String(val) : ''}
          </TableCell>
        );
      }), [row, editingCol, editVal, canEdit, saving, rowIndex, getCellProps])}
    </TableRow>
  );
}, (prev: InventoryRowProps, next: InventoryRowProps) => {
  if (prev.selected !== next.selected) return false;
  if (prev.row !== next.row) return false;
  if (prev.canEdit !== next.canEdit) return false;
  return true;
});

export default function InventoryPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const canDelete = useMemo(() => authService.hasAction('fb_inventory', 'canDelete') || authService.isSuperAdmin(), []);
  const canEdit = useMemo(() => authService.hasAction('fb_inventory', 'canEdit') || authService.isSuperAdmin(), []);

  const onInlineEditLocation = useCallback(async (row: FabricInventoryItem, newValue: string) => {
    try {
      await fabricInventoryService.updateLocation([row.QrCode], newValue);
      setData(prev => prev.map(r => r.RecNo === row.RecNo ? { ...r, Location: newValue } : r));
    } catch (err) {
      setError('Inline edit location failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      throw err;
    }
  }, []);

  const onInlineEditWHLocation = useCallback(async (row: FabricInventoryItem, newValue: string) => {
    try {
      await fabricInventoryService.updateWHLocation(row.QrCode, newValue);
      setData(prev => prev.map(r => r.RecNo === row.RecNo ? { ...r, "WH-Location": newValue } : r));
      showToast(t('inventory.editSuccess'), 'success');
    } catch (err) {
      showToast(t('inventory.editFailed'), 'error');
      throw err;
    }
  }, [showToast]);

  const onInlineEditComment = useCallback(async (row: FabricInventoryItem, newValue: string) => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/fabric-wh/inventory/update-comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ qrCode: row.QrCode, comment: newValue })
      }).then(res => {
        if (!res.ok) throw new Error('Update comment failed');
      });
      setData(prev => prev.map(r => r.RecNo === row.RecNo ? { ...r, Comment: newValue } : r));
      showToast(t('inventory.editSuccess'), 'success');
    } catch (err) {
      showToast(t('inventory.editFailed'), 'error');
      throw err;
    }
  }, [showToast]);

  // Column filters (client-side)
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const updateColFilter = useCallback((col: string, val: string) => {
    setColFilters(prev => ({ ...prev, [col]: val }));
    setPage(0);
  }, []);

  // Data
  const [data, setData] = useState<FabricInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [lastSelected, setLastSelected] = useState<number | null>(null);

  // Filter data client-side
  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(colFilters).filter(([, v]) => v);
    if (activeFilters.length === 0) return data;
    return data.filter(row => {
      for (const [key, val] of activeFilters) {
        const cellVal = String(row[key as keyof FabricInventoryItem] ?? '').toLowerCase();
        const tokens = val.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
        if (tokens.length > 0) {
          if (!tokens.some(t => cellVal.includes(t))) return false;
        } else {
          if (!cellVal.includes(val.toLowerCase())) return false;
        }
      }
      return true;
    });
  }, [data, colFilters]);

  const paginatedData = useMemo(
    () => filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredData, page, rowsPerPage]
  );

  // Cell Drag Selection (DOM-based, high performance)
  const { selectionSummary, removeCellSelection, getCellProps } = useExcelDragSelection({
    data: paginatedData
  });



  const handleSearch = useCallback(async (searchParams: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const payload: InventorySearchParams = {
        invoiceNo: searchParams.invoiceNo?.trim() || undefined,
        orderNumber: searchParams.orderNumber?.trim() || undefined,
        rollItem: searchParams.rollItem?.trim() || undefined,
        color: searchParams.color?.trim() || undefined,
        batchNo: searchParams.batchNo?.trim() || undefined,
        rollNo: searchParams.rollNo?.trim() || undefined,
      };
      const result = await fabricInventoryService.search(payload);
      const rows = result.data || [];
      setData(rows);
      if (rows.length > 0) showToast(t('inventory.loadSuccess', { count: rows.length }), 'success');
      else showToast(t('inventory.noData'), 'warning');
      
      setSearched(true);
      setPage(0);
      setColFilters({});
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClear = useCallback(() => {
    setData([]);
    setSearched(false);
    setError(null);
    setColFilters({});
    setSelected(new Set());
  }, []);

  // Right-click context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row: FabricInventoryItem } | null>(null);
  const handleContextMenu = useCallback((e: React.MouseEvent, row: FabricInventoryItem) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, row });
  }, []);

  // Location history dialog
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<LocationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRow, setHistoryRow] = useState<FabricInventoryItem | null>(null);

  const openLocationHistory = useCallback(async (row: FabricInventoryItem) => {
    if (!row.QrCode || historyLoading) return;
    setContextMenu(null);
    setHistoryRow(row);
    setHistoryData([]);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const result = await fabricInventoryService.getLocationHistory(row.QrCode);
      setHistoryData(result);
    } catch {
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyLoading]);

  // Delete
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number[] | null>(null);

  const requestDelete = useCallback((recNos: number[]) => {
    if (recNos.length === 0) return;
    setContextMenu(null);
    setDeleteConfirm(recNos);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm || deleteConfirm.length === 0) return;
    setDeleting(true);
    try {
      await fabricInventoryService.softDelete(deleteConfirm);
      const deletedSet = new Set(deleteConfirm);
      setData(prev => prev.filter(r => !deletedSet.has(r.RecNo)));
      setSelected(prev => {
        const next = new Set(prev);
        deleteConfirm.forEach(id => next.delete(id));
        return next;
      });
      setDeleteConfirm(null);
    } catch (err) {
      setError('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeleting(false);
    }
  }, [deleteConfirm]);

  // --- Change Location State ---
  const [changeLocationOpen, setChangeLocationOpen] = useState(false);
  const [targetRowsLocation, setTargetRowsLocation] = useState<FabricInventoryItem[]>([]);
  const [pallets, setPallets] = useState<{ ShNm: string; ShLevl: string; ShSeq: string }[]>([]);
  const palletOptions = useMemo(() => pallets.map(p => `${p.ShNm}${p.ShLevl}-${p.ShSeq.length === 1 ? '0' + p.ShSeq : p.ShSeq}`), [pallets]);
  const [newLocation, setNewLocation] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  const openChangeLocation = useCallback(async (rows: FabricInventoryItem[]) => {
    if (rows.length === 0) return;
    setContextMenu(null);
    setTargetRowsLocation(rows);
    setNewLocation('');
    setChangeLocationOpen(true);
    if (pallets.length === 0) {
      try {
        const res = await fabricInventoryService.getPallets();
        setPallets(res);
      } catch (e) {
        console.error('Failed to load pallets:', e);
      }
    }
  }, [pallets]);

  const confirmChangeLocation = useCallback(async () => {
    if (!newLocation.trim() || targetRowsLocation.length === 0) return;
    setSavingLocation(true);
    const qrCodes = targetRowsLocation.map(r => r.QrCode);
    const codeSet = new Set(qrCodes);
    try {
      await fabricInventoryService.updateLocation(qrCodes, newLocation);
      setData(prev => prev.map(r => codeSet.has(r.QrCode) ? { ...r, Location: newLocation } : r));
      setChangeLocationOpen(false);
      setSelected(new Set());
    } catch (err) {
      setError('Change location failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSavingLocation(false);
    }
  }, [newLocation, targetRowsLocation]);

  // --- Edit Balance State ---
  const [editBalanceOpen, setEditBalanceOpen] = useState(false);
  const [targetEditRow, setTargetEditRow] = useState<FabricInventoryItem | null>(null);
  const [editBalanceVal, setEditBalanceVal] = useState<number | ''>('');
  const [savingBalance, setSavingBalance] = useState(false);

  const openEditBalance = useCallback((row: FabricInventoryItem) => {
    setContextMenu(null);
    setTargetEditRow(row);
    setEditBalanceVal(row.Balance !== null ? row.Balance : '');
    setEditBalanceOpen(true);
  }, []);

  const confirmEditBalance = useCallback(async () => {
    if (!targetEditRow || editBalanceVal === '') return;
    const isZero = editBalanceVal === 0;
    setSavingBalance(true);
    try {
      await fabricInventoryService.updateBalance(targetEditRow.RecNo, Number(editBalanceVal), isZero);
      setData(prev => prev.map(r => r.RecNo === targetEditRow.RecNo ? { ...r, Balance: Number(editBalanceVal) } : r));
      setEditBalanceOpen(false);
    } catch (err) {
      setError('Edit balance failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSavingBalance(false);
    }
  }, [targetEditRow, editBalanceVal]);

  const onInlineEditBalance = useCallback(async (row: FabricInventoryItem, newValue: number) => {
    const isZero = newValue === 0;
    try {
      await fabricInventoryService.updateBalance(row.RecNo, newValue, isZero);
      setData(prev => prev.map(r => r.RecNo === row.RecNo ? { ...r, Balance: newValue } : r));
    } catch (err) {
      setError('Inline edit balance failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      throw err; 
    }
  }, []);

  const onInlineEditLength = useCallback(async (row: FabricInventoryItem, newValue: number) => {
    try {
      await fabricInventoryService.updateLength(row.RecNo, newValue);
      setData(prev => prev.map(r => {
        if (r.RecNo === row.RecNo) {
          const newBal = (r.Balance != null && newValue < r.Balance) ? newValue : r.Balance;
          return { ...r, ShipLength: newValue, Balance: newBal };
        }
        return r;
      }));
    } catch (err) {
      setError('Inline edit length failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      throw err; 
    }
  }, []);

  // --- Print QR State ---
  const [printQROpen, setPrintQROpen] = useState(false);
  const [targetPrintRows, setTargetPrintRows] = useState<FabricInventoryItem[]>([]);

  const openPrintQR = useCallback((rows: FabricInventoryItem[]) => {
    if (rows.length === 0) return;
    setContextMenu(null);
    setTargetPrintRows(rows);
    setPrintQROpen(true);
  }, []);

  
  
  const toggleSelect = useCallback((recNo: number, isShiftPressed: boolean = false) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (isShiftPressed && lastSelected !== null) {
        const startIdx = filteredData.findIndex(r => r.RecNo === lastSelected);
        const endIdx = filteredData.findIndex(r => r.RecNo === recNo);
        if (startIdx !== -1 && endIdx !== -1) {
          const min = Math.min(startIdx, endIdx);
          const max = Math.max(startIdx, endIdx);
          const shouldSelect = !next.has(recNo);
          for (let i = min; i <= max; i++) {
            if (shouldSelect) next.add(filteredData[i].RecNo);
            else next.delete(filteredData[i].RecNo);
          }
        } else {
          if (next.has(recNo)) next.delete(recNo); else next.add(recNo);
        }
      } else {
        if (next.has(recNo)) next.delete(recNo); else next.add(recNo);
      }
      return next;
    });
    setLastSelected(recNo);
  }, [filteredData, lastSelected]);

  const activeFilterCount = useMemo(() => Object.values(colFilters).filter(v => v).length, [colFilters]);
  const selectedCount = selected.size;
  const allPageSelected = paginatedData.length > 0 && paginatedData.every(r => selected.has(r.RecNo));

  const toggleSelectAll = useCallback(() => {
    if (allPageSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        paginatedData.forEach(r => next.delete(r.RecNo));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        paginatedData.forEach(r => next.add(r.RecNo));
        return next;
      });
    }
  }, [allPageSelected, paginatedData]);

  // Export
  const handleExport = useCallback(() => {
    if (filteredData.length === 0) return;
    const exportData = filteredData.map(row => {
      const obj: Record<string, unknown> = {};
      ALL_COLUMNS.forEach(col => {
        obj[col.label] = row[col.key as keyof FabricInventoryItem] ?? '';
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    ws['!cols'] = ALL_COLUMNS.map(col => ({ wch: Math.max(col.label.length + 2, 12) }));
    XLSX.writeFile(wb, `Fabric_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [filteredData]);

  const [actionAnchorEl, setActionAnchorEl] = useState<null | HTMLElement>(null);
  const handleActionClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setActionAnchorEl(event.currentTarget);
  };
  const handleActionClose = () => {
    setActionAnchorEl(null);
  };
  
  const handleBulkChangeLocation = () => {
    handleActionClose();
    const rows = data.filter(r => selected.has(r.RecNo));
    openChangeLocation(rows);
  };
  const handleBulkPrintQR = () => {
    handleActionClose();
    const rows = data.filter(r => selected.has(r.RecNo));
    openPrintQR(rows);
  };
  const handleBulkDelete = () => {
    handleActionClose();
    requestDelete(Array.from(selected));
  };

  return (
    <Box sx={{ px: 1, py: 0.5, width: '100%', flex: 1, height: '100%', overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1, zoom: { md: 0.85, lg: 0.9, xl: 1 } }}>
      {/* Toast Error Popup */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%', borderRadius: 2, boxShadow: 3, fontWeight: 500 }}>
          {error}
        </Alert>
      </Snackbar>

      {/* Ultra-Premium Search Filters Component */}
      <FabricSearchFilter 
        fields={[
          { key: 'invoiceNo', label: 'Invoice No', icon: <ReceiptIcon fontSize="small" sx={{ color: '#64748b' }}/> },
          { key: 'orderNumber', label: 'Order Number', icon: <ConfirmationNumberIcon fontSize="small" sx={{ color: '#64748b' }}/> },
          { key: 'rollItem', label: 'Roll Item', icon: <CategoryIcon fontSize="small" sx={{ color: '#64748b' }}/> },
          { key: 'color', label: 'Color', icon: <PaletteIcon fontSize="small" sx={{ color: '#64748b' }}/> },
          { key: 'batchNo', label: 'Batch No', icon: <LayersIcon fontSize="small" sx={{ color: '#64748b' }}/> },
          { key: 'rollNo', label: 'Roll No', icon: <QrCodeIcon fontSize="small" sx={{ color: '#64748b' }}/> },
        ]}
        loading={loading}
        onSearch={handleSearch}
        onClear={handleClear}
      >
        {searched && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              label={`${filteredData.length}${filteredData.length !== data.length ? ` / ${data.length}` : ''} records`}
              size="small" sx={{ fontWeight: 700, bgcolor: '#e8f5e9', color: ACCENT }}
            />
            {activeFilterCount > 0 && (
              <Chip label={`${activeFilterCount} filter`} size="small" color="success" variant="outlined"
                onDelete={() => setColFilters({})} sx={{ fontWeight: 600 }} />
            )}
            {selectedCount > 0 && (
              <>
                <Button variant="contained" disableElevation
                  endIcon={<ArrowDownIcon />}
                  onClick={handleActionClick}
                  sx={{ borderRadius: 1.5, fontWeight: 600, height: 36, bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}>
                  {t('common.actions')} ({selectedCount})
                </Button>
                <Menu
                  anchorEl={actionAnchorEl}
                  open={Boolean(actionAnchorEl)}
                  onClose={handleActionClose}
                  slotProps={{ paper: { sx: { borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: 180 } } }}
                >
                  <MenuItem onClick={handleBulkChangeLocation} sx={{ fontSize: '0.85rem' }}>
                    <ListItemIcon><PalletIcon sx={{ fontSize: 18, color: '#1976d2' }} /></ListItemIcon>
                    <ListItemText>{t('putaway.changeLocation')}</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleBulkPrintQR} sx={{ fontSize: '0.85rem' }}>
                    <ListItemIcon><QrCodeIcon sx={{ fontSize: 18, color: '#607d8b' }} /></ListItemIcon>
                    <ListItemText>{t('printQr.title')}</ListItemText>
                  </MenuItem>
                  {canDelete && (
                    <MenuItem onClick={handleBulkDelete} sx={{ fontSize: '0.85rem', color: '#d32f2f' }}>
                      <ListItemIcon><DeleteIcon sx={{ fontSize: 18, color: '#d32f2f' }} /></ListItemIcon>
                      <ListItemText>{t('common.delete')}</ListItemText>
                    </MenuItem>
                  )}
                </Menu>
              </>
            )}
            <Button variant="outlined" startIcon={<ExportIcon />} onClick={handleExport}
              disabled={filteredData.length === 0}
              sx={{ borderRadius: 1.5, fontWeight: 600, height: 36, borderColor: '#cbd5e1', color: '#334155', bgcolor: '#fff', '&:hover': { bgcolor: '#f8fafc' } }}>
              {t('inventory.exportExcel')}
            </Button>
          </Box>
        )}
      </FabricSearchFilter>

      {/* Data Table */}
      {searched && (
        <Paper elevation={0} sx={{ 
          borderRadius: 3, border: '1px solid #e0e0e0', overflow: 'hidden', position: 'relative',
          flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0
        }}>
          {isPending && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(2px)' }}>
              <CircularProgress size={44} sx={{ color: '#2e7d32' }} />
            </Box>
          )}
          <TableContainer sx={{ flexGrow: 1, overflow: 'auto', opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s ease', pointerEvents: isPending ? 'none' : 'auto' }}>
            <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { fontSize: { xs: '0.7rem', lg: '12px' }, py: { xs: 0.5, lg: 0.75 }, px: { xs: 0.8, lg: 1 } } }}>
              <TableHead>
                <TableRow>
                  {canDelete && (
                    <TableCell padding="checkbox" sx={{ ...SX_HEADER_CELL, position: 'sticky', left: 0, zIndex: 4 }}>
                      <Checkbox size="small" checked={allPageSelected} indeterminate={selectedCount > 0 && !allPageSelected}
                        onChange={toggleSelectAll}
                        sx={{ p: 0.3, '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: ACCENT } }} />
                    </TableCell>
                  )}
                  {ALL_COLUMNS.map(col => (
                    <TableCell key={col.key} sx={{ ...SX_HEADER_CELL, minWidth: col.width }}>
                      {col.noFilter ? (
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '11px' }}>{col.label}</Typography>
                      ) : (
                        <ColumnFilter colKey={col.key} label={col.label} value={colFilters[col.key] || ''}
                          onChange={updateColFilter} />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={COL_COUNT + (canDelete ? 1 : 0) + 1} align="center" sx={{ py: 8 }}>
                      <CircularProgress size={40} sx={{ color: '#2e7d32', mb: 2 }} />
                      <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 600 }}>
                        {t('issueReport.processing')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COL_COUNT + (canDelete ? 1 : 0) + 1} align="center" sx={{ py: 6, color: '#999' }}>
                      {t('inventory.noData', 'No data found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((row, idx) => (
                    <InventoryRow key={`${row.RecNo}-${idx}`} rowIndex={idx} row={row}
                      selected={selected.has(row.RecNo)} canDelete={canDelete} canEdit={canEdit}
                      selectedCells={null} getCellProps={getCellProps}
                      onToggle={toggleSelect} onContextMenu={handleContextMenu} 

                      onEditBalance={onInlineEditBalance}
                      onEditLength={onInlineEditLength}
                      onEditLocation={onInlineEditLocation}
                      onEditComment={onInlineEditComment}
                      onEditWHLocation={onInlineEditWHLocation}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            px: 1, py: 0.5, borderTop: '1px solid #e0e0e0', flexWrap: 'wrap', gap: 1,
            flexShrink: 0, backgroundColor: '#fff', zIndex: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{t('inventory.rowsPerPage', 'Rows/page')}:</Typography>
              <Select
                size="small"
                value={rowsPerPage}
                onChange={e => {
                  startTransition(() => {
                    setRowsPerPage(Number(e.target.value));
                    setPage(0);
                  });
                }}
                sx={{ height: 32, fontSize: '0.85rem', borderRadius: 1.5 }}
              >
                {[25, 50, 100, 200, 500].map(v => <MenuItem key={v} value={v} sx={{ fontSize: '0.85rem' }}>{v}</MenuItem>)}
              </Select>
              <Typography variant="body2" sx={{ color: 'text.secondary', ml: 1 }}>
                {filteredData.length > 0 ? page * rowsPerPage + 1 : 0}-{Math.min((page + 1) * rowsPerPage, filteredData.length)} / {filteredData.length}
              </Typography>
            </Box>
            <Pagination
              count={Math.ceil(filteredData.length / rowsPerPage) || 1}
              page={page + 1}
              onChange={(_, newPage) => startTransition(() => setPage(newPage - 1))}
              shape="rounded"
              showFirstButton
              showLastButton
              size="medium"
              sx={{
                '& .MuiPagination-ul': { flexWrap: 'nowrap' },
                '& .MuiPaginationItem-root.Mui-selected': { bgcolor: ACCENT, color: '#fff', '&:hover': { bgcolor: '#1b5e20' } }
              }}
            />
          </Box>
        </Paper>
      )}

      {/* Floating Summary Footer for Dragged Cells */}
      {selectionSummary && (
        <Paper elevation={4} className="sum-footer" sx={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999, py: 1.5, px: 3, borderRadius: 3,
          display: 'flex', gap: 2, flexWrap: 'wrap',
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: '#fff', alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Cell Count: {selectionSummary.count}</Typography>
            <Box sx={{ width: 1, height: 16, bgcolor: 'rgba(255,255,255,0.3)' }} />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Sum: <Box component="span" sx={{ fontSize: '1.2em', ml: 0.5 }}>{Math.round(selectionSummary.sum * 100) / 100}</Box>
            </Typography>
            <Button size="small" onClick={removeCellSelection} sx={{ color: '#fff', minWidth: 0, p: 0.5, ml: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
              ⨯
            </Button>
          </Box>
        </Paper>
      )}

      {/* Empty state */}
      {!searched && !loading && (
        <Paper elevation={0} sx={{ p: 6, borderRadius: 3, border: '1px solid #e0e0e0', textAlign: 'center' }}>
          <SearchIcon sx={{ fontSize: 48, color: '#bdbdbd', mb: 1 }} />
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
            {t('inventory.emptyHint', 'Enter search criteria and click Search')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('inventory.emptyHintSub', 'You can search by Invoice, Order, Item, Color, Batch, or Roll No')}
          </Typography>
        </Paper>
      )}

      {/* Right-click Context Menu */}
      <Menu
        open={!!contextMenu}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
        slotProps={{ paper: { sx: { borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: 200 } } }}
      >
        <MenuItem onClick={() => {
          if (!contextMenu) return;
          const rowsToProcess = selected.has(contextMenu.row.RecNo) ? data.filter(r => selected.has(r.RecNo)) : [contextMenu.row];
          openChangeLocation(rowsToProcess);
        }} sx={{ fontSize: '0.85rem' }}>
          <ListItemIcon><PalletIcon sx={{ fontSize: 18, color: '#1976d2' }} /></ListItemIcon>
          <ListItemText>Change Location</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => contextMenu && openEditBalance(contextMenu.row)}
          sx={{ fontSize: '0.85rem' }}>
          <ListItemIcon><EditIcon sx={{ fontSize: 18, color: '#f57c00' }} /></ListItemIcon>
          <ListItemText>Edit Balance</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => {
          if (!contextMenu) return;
          const rowsToProcess = selected.has(contextMenu.row.RecNo) ? data.filter(r => selected.has(r.RecNo)) : [contextMenu.row];
          openPrintQR(rowsToProcess);
        }} sx={{ fontSize: '0.85rem' }}>
          <ListItemIcon><QrCodeIcon sx={{ fontSize: 18, color: '#607d8b' }} /></ListItemIcon>
          <ListItemText>Print QR Code</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => contextMenu && openLocationHistory(contextMenu.row)}
          sx={{ fontSize: '0.85rem' }}>
          <ListItemIcon><HistoryIcon sx={{ fontSize: 18, color: ACCENT }} /></ListItemIcon>
          <ListItemText>View Location History</ListItemText>
        </MenuItem>
        
        {canDelete && (
          <MenuItem onClick={() => {
            if (!contextMenu) return;
            const rowsToProcess = selected.has(contextMenu.row.RecNo) ? data.filter(r => selected.has(r.RecNo)) : [contextMenu.row];
            requestDelete(rowsToProcess.map(r => r.RecNo));
          }}
            sx={{ fontSize: '0.85rem', color: '#d32f2f' }}>
            <ListItemIcon><DeleteIcon sx={{ fontSize: 18, color: '#d32f2f' }} /></ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Location History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, color: ACCENT, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          📍 Location History
          {historyRow && (
            <Chip label={`${historyRow.RollItem} / ${historyRow.RollNo}`} size="small"
              sx={{ fontWeight: 600, ml: 1, backgroundColor: '#e8f5e9', color: ACCENT }} />
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} sx={{ color: ACCENT }} />
            </Box>
          ) : historyData.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No location history found
            </Typography>
          ) : (
            <Table size="small" sx={{ '& .MuiTableCell-root': { py: { xs: 0.5, lg: 1 }, px: { xs: 1, lg: 2 }, fontSize: { xs: '0.75rem', lg: '0.85rem' } } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={SX_CELL_BOLD}>Pallet Code</TableCell>
                  <TableCell sx={SX_CELL_BOLD}>Date</TableCell>
                  <TableCell sx={SX_CELL_BOLD}>Created By</TableCell>
                  <TableCell sx={SX_CELL_BOLD}>Factory</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyData.map((h, i) => (
                  <TableRow key={i} hover sx={{ '&:hover': { backgroundColor: '#e8f5e9' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>{h.PalletCode || ''}</TableCell>
                    <TableCell>{h.RecoredDate ? (() => {
                      const d = new Date(h.RecoredDate);
                      if (isNaN(d.getTime())) return h.RecoredDate;
                      const p = (n: number) => n.toString().padStart(2, '0');
                      return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
                    })() : ''}</TableCell>
                    <TableCell>{h.CreatedBy || ''}</TableCell>
                    <TableCell>{h.Fac || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => !deleting && setDeleteConfirm(null)}
        slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 320 } } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#d32f2f', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon /> Confirm Delete
        </DialogTitle>
        <DialogContent sx={{ pt: 1, pb: 2 }}>
          <Typography variant="body1">
            {deleteConfirm?.length === 1
              ? 'Are you sure you want to delete this record?'
              : `Are you sure you want to delete ${deleteConfirm?.length || 0} selected records?`}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)} disabled={deleting}
            sx={{ color: '#64748b', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disableElevation
            disabled={deleting} startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ fontWeight: 700, borderRadius: 1.5 }}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Change Location Dialog */}
      <Dialog open={changeLocationOpen} onClose={() => setChangeLocationOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#1976d2', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PalletIcon /> Update Shelf Location
        </DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          <DialogContentText sx={{ mb: 2, fontSize: '0.85rem' }}>
            Updating location for {targetRowsLocation.length} selected row(s).
          </DialogContentText>
          <Autocomplete
            freeSolo
            options={palletOptions}
            value={newLocation}
            onInputChange={(_, newValue) => setNewLocation(newValue)}
            renderInput={(params) => <TextField {...params} label="New Location (Shelf)" size="small" fullWidth autoFocus />}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setChangeLocationOpen(false)} sx={{ color: '#64748b', fontWeight: 600 }}>Cancel</Button>
          <Button onClick={confirmChangeLocation} disabled={savingLocation || !newLocation.trim()} 
            variant="contained" disableElevation sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' }, borderRadius: 1.5, fontWeight: 700 }}>
            {savingLocation ? 'Updating...' : 'Update Location'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Balance Dialog */}
      <Dialog open={editBalanceOpen} onClose={() => setEditBalanceOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#f57c00', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon /> Edit Balance
        </DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          {targetEditRow && (
            <Box sx={{ mb: 2, p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Roll No: {targetEditRow.RollNo}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>QR Code: {targetEditRow.QrCode}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Ship Length: {targetEditRow.ShipLength}</Typography>
            </Box>
          )}
          <TextField 
            label="New Balance" 
            type="number" 
            size="small" 
            fullWidth 
            value={editBalanceVal} 
            onChange={e => {
              const val = e.target.value;
              setEditBalanceVal(val === '' ? '' : Math.max(0, Number(val)));
            }} 
            inputProps={{ min: 0, step: '0.01' }}
            autoFocus 
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditBalanceOpen(false)} sx={{ color: '#64748b', fontWeight: 600 }}>Cancel</Button>
          <Button onClick={confirmEditBalance} disabled={savingBalance || editBalanceVal === '' || Number(editBalanceVal) < 0} 
            variant="contained" disableElevation sx={{ bgcolor: '#f57c00', '&:hover': { bgcolor: '#e65100' }, borderRadius: 1.5, fontWeight: 700 }}>
            {savingBalance ? 'Saving...' : 'Save Balance'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Print QR Preview Modal (Dumb wrapper for now, user can click print) */}
      <Dialog open={printQROpen} onClose={() => setPrintQROpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#607d8b', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <QrCodeIcon /> Print QR Code ({targetPrintRows.length} items)
        </DialogTitle>
        <DialogContent sx={{ pb: 3, bgcolor: '#eceff1', p: 4 }}>
          {/* Simple Label preview layout */}
          <Box id="printArea" sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 2 }}>
            {targetPrintRows.map((row) => (
              <Box key={row.QrCode} sx={{ p: 2, bgcolor: '#fff', border: '1px solid #cfd8dc', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 1 }}>
                <QrCodeIcon sx={{ fontSize: 80, color: '#37474f' }} />
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 1, fontFamily: 'monospace' }}>{row.QrCode}</Typography>
                <Typography variant="caption" sx={{ color: '#546e7a', textAlign: 'center', mt: 0.5, lineHeight: 1.2 }}>
                  {row.RollItem} - {row.Color}<br/>
                  Batch: {row.BatchNo} | Roll: {row.RollNo}
                </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPrintQROpen(false)} sx={{ color: '#64748b', fontWeight: 600 }}>Close</Button>
          <Button onClick={() => {
            const content = document.getElementById('printArea')?.innerHTML;
            if (content) {
              const win = window.open('', '_blank');
              if (win) {
                win.document.write(`<html><head><title>Print</title><style>
                  body { font-family: sans-serif; }
                  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
                  .label { border: 1px dashed #ccc; padding: 20px; text-align: center; }
                  @media print { .grid { grid-template-columns: repeat(2, 1fr); } }
                </style></head><body><div class="grid">${content.replace(/<Box/g,'<div class="label"').replace(/<\/Box>/g,'</div>')}</div><script>window.print();window.close();</script></body></html>`);
                win.document.close();
              }
            }
          }} variant="contained" disableElevation sx={{ bgcolor: '#607d8b', '&:hover': { bgcolor: '#455a64' }, borderRadius: 1.5, fontWeight: 700 }}>
            Print Labels
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Summary Footer for Selected Items */}
      {selected.size > 0 && (
        <Paper elevation={4} className="sum-footer" sx={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, py: 1.5, px: 3, borderRadius: 3,
          display: 'flex', gap: 2, flexWrap: 'wrap',
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', color: '#fff', alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)'
        }}>
          {(() => {
            const selectedRows = data.filter(r => selected.has(r.RecNo));
            const sumLength = selectedRows.reduce((sum, r) => sum + (r.ShipLength || 0), 0);
            const sumBalance = selectedRows.reduce((sum, r) => sum + (r.Balance || 0), 0);
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap', userSelect: 'none' }}>
                  {selected.size} {t('issueFabric.count', 'Rolls')}
                </Typography>
                <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.3)' }} />
                <Typography variant="body2" sx={{ userSelect: 'none', color: '#cbd5e1' }}>
                  Total ShipLength: <Box component="span" sx={{ fontWeight: 700, color: '#4ade80' }}>{Math.round(sumLength * 100) / 100}</Box>
                </Typography>
                <Typography variant="body2" sx={{ userSelect: 'none', color: '#cbd5e1' }}>
                  Total Balance: <Box component="span" sx={{ fontWeight: 700, color: '#facc15' }}>{Math.round(sumBalance * 100) / 100}</Box>
                </Typography>
              </Box>
            );
          })()}
        </Paper>
      )}
    </Box>
  );
}

