import { useState, useCallback, useMemo, useRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Pagination, Select, MenuItem, CircularProgress, Button,
  IconButton, Badge, Popover, TextField, Menu, ListItemIcon, ListItemText, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, LinearProgress, Autocomplete, Chip
} from '@mui/material';
import { useToast, useExcelDragSelection } from '@traxeco/shared';
import {
  CalendarMonth as CalendarMonthIcon,
  GetApp as ExportIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Receipt as ReceiptIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  Category as CategoryIcon,
  Palette as PaletteIcon,
  Layers as LayersIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import FabricSearchFilter from '../components/FabricSearchFilter';
import { fabricInventoryService } from '../services/fabricInventoryService';

const ACCENT = '#2e7d32';
const SX_HEADER_CELL = { fontWeight: 700, backgroundColor: '#f8fafc', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 2, borderBottom: '2px solid #e2e8f0', color: '#334155', letterSpacing: '0.02em' };
const SX_CELL = { whiteSpace: 'nowrap', fontSize: '12px' };

const EMPTY_OPTIONS: readonly string[] = [];

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
        <IconButton size="small" onClick={(e) => { setAnchorEl(e.currentTarget); setTimeout(() => inputRef.current?.focus(), 80); }}
          sx={{ p: 0.25, color: active ? ACCENT : '#bbb', '&:hover': { color: ACCENT, backgroundColor: '#e8f5e9' } }}>
          <Badge variant="dot" invisible={!active} color="success"><FilterIcon sx={{ fontSize: 15 }} /></Badge>
        </IconButton>
      </Box>
      <Popover open={!!anchorEl} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 1.5, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 260, maxWidth: 350 } } }}>
        <Autocomplete
          multiple
          freeSolo
          options={EMPTY_OPTIONS}
          value={parsedValue}
          onChange={(_, newVal) => handleChange(newVal.join(', '))}
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

const RelaxRow = memo(({ row, idx, columns, isSelected, toggleSelect, setContextMenu, editingCell, editVal, setEditVal, handleSaveEdit, startEdit, setEditingCell, getCellProps }: any) => {
  const hr = Number(row['HourRelax'] || 0);
  const ts = Number(row['TimeStandard'] || 24);
  const isEnough = hr >= ts;
  const percentRaw = Math.min(100, (hr / (ts || 1)) * 100);
  const percentStr = percentRaw.toFixed(2);
  const rowBg = isEnough ? '#f1f8e9' : '#fff3e0';
  const hoverBg = isEnough ? '#dcedc8' : '#ffe0b2';

  return (
    <TableRow hover 
      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, row }); }}
      sx={{ 
        backgroundColor: `${rowBg} !important`,
        transition: 'background-color 0.2s',
        '&:hover': { backgroundColor: `${hoverBg} !important` },
        '&:hover .sticky-cell': { backgroundColor: `${hoverBg} !important` }
      }}>
      <TableCell padding="checkbox" className="sticky-cell" sx={{ py: 0, position: 'sticky', left: 0, bgcolor: rowBg, zIndex: 1, transition: 'background-color 0.2s' }}>
        <Checkbox size="small" checked={isSelected} onChange={() => toggleSelect(Number(row.RecNo))} sx={{ p: 0.3 }} />
      </TableCell>
      {columns.map((col: any) => {
        const isEditable = col.key === 'DateRelax' || col.key === 'TimeRelax';
        const isEditing = editingCell?.recNo === row.RecNo && editingCell?.colKey === col.key;
        
        const isNumericCol = row[col.key] != null && !isNaN(parseFloat(String(row[col.key]))) && String(row[col.key]).trim() !== '' && col.key !== 'HourRelax' && !isEditable && !isEditing;
        const cellProps = isNumericCol ? getCellProps(col.key, idx, true) : {};

        return (
          <TableCell key={col.key} {...cellProps} sx={{ ...SX_CELL, ...(col.key.toLowerCase() === 'rollno' ? { fontWeight: 800, color: '#1565c0' } : {}), userSelect: isNumericCol ? 'none' : 'auto' }}>
            {col.key === 'HourRelax' ? (() => {
              let pColor = '#10b981'; // Green for 100%
              if (percentRaw < 25) pColor = '#ef4444'; // Red
              else if (percentRaw < 50) pColor = '#f97316'; // Orange
              else if (percentRaw < 75) pColor = '#eab308'; // Yellow
              else if (percentRaw < 100) pColor = '#3b82f6'; // Blue

              return (
                <Box title={`${hr.toFixed(2)}h / ${ts}h`} sx={{ display: 'flex', alignItems: 'center', minWidth: 60, cursor: 'help' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, width: 44, textAlign: 'right', mr: 1, color: pColor }}>
                    {percentStr}%
                  </Typography>
                  <LinearProgress variant="determinate" value={percentRaw} 
                    sx={{ flexGrow: 1, height: 6, borderRadius: 3, backgroundColor: '#e2e8f0', '& .MuiLinearProgress-bar': { backgroundColor: pColor } }} />
                </Box>
              );
            })() : isEditing ? (
              <TextField
                type={col.key === 'DateRelax' ? 'date' : 'time'}
                size="small" autoFocus value={editVal}
                onChange={e => setEditVal(e.target.value)}
                onBlur={() => handleSaveEdit(row)}
                onKeyDown={e => {
                  if(e.key === 'Enter') handleSaveEdit(row);
                  if(e.key === 'Escape') setEditingCell(null);
                }}
                sx={{ width: col.key === 'TimeRelax' ? 110 : 140, input: { p: 0.5, fontSize: '0.8rem', fontWeight: 600 } }}
              />
            ) : isEditable ? (
              <Box onClick={() => startEdit(row, col.key)} sx={{ 
                cursor: 'pointer', fontWeight: 600, color: '#f57c00', textDecoration: 'underline dashed', textUnderlineOffset: 3 
              }}>
                {row[col.key] != null ? String(row[col.key]) : ''}
              </Box>
            ) : (row[col.key] != null ? String(row[col.key]) : '')}
          </TableCell>
        );
      })}
    </TableRow>
  );
}, (prev: any, next: any) => {
  const wasEditing = prev.editingCell?.recNo === prev.row.RecNo;
  const isEditing = next.editingCell?.recNo === next.row.RecNo;
  
  // If this row was NOT being edited and is NOT being edited now, it doesn't care about editingCell changes
  if (!wasEditing && !isEditing) {
    return prev.isSelected === next.isSelected && prev.row === next.row;
  }
  
  // Otherwise, it is the active edit row, so we care about editVal and colKey changes
  return prev.isSelected === next.isSelected && 
         prev.row === next.row && 
         prev.editingCell?.colKey === next.editingCell?.colKey &&
         prev.editVal === next.editVal;
});

export default function RelaxPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searched, setSearched] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<Record<string, string>>({});

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const todayStr = new Date().toISOString().split('T')[0];

  const handleSearch = useCallback(async (filters: Record<string, string>) => {
    setLoading(true);
    try {
      const hasOtherFilters = !!(
        (filters.invoiceNo?.trim()) ||
        (filters.orderNumber?.trim()) ||
        (filters.rollItem?.trim()) ||
        (filters.color?.trim()) ||
        (filters.batchNo?.trim()) ||
        (filters.rollNo?.trim())
      );

      let fromDate = (filters.fromDate || '').replace(/-/g, '');
      let toDate = (filters.toDate || '').replace(/-/g, '');

      if (hasOtherFilters) {
        fromDate = '';
        toDate = '';
      }

      const res = await fabricInventoryService.getRelaxReport(fromDate, toDate);
      const rows = res || [];
      setData(rows);
      if (rows.length > 0) showToast(t('relax.loadSuccess', { count: rows.length }), 'success');
      else showToast(t('relax.noData'), 'warning');
      
      setCurrentFilters(filters);
      setSearched(true);
      setPage(0);
      setSelected(new Set());
    } catch (err: any) {
      showToast(err.message || t('relax.loadError'), 'error');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClear = useCallback(() => {
    setData([]);
    setSearched(false);
    setPage(0);
    setCurrentFilters({});
    setColumnFilters({});
  }, []);

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const itemKeys = Object.keys(data[0]);
    const keyMap: Record<string, string> = {};
    for (const k of itemKeys) keyMap[k.toLowerCase()] = k;

    return data.filter(item => {
      const checkMatch = (filterKey: string, val: string) => {
        if (!val) return true;
        const actualKey = keyMap[filterKey.toLowerCase()];
        if (actualKey) {
          const itemVal = String(item[actualKey] || '').toLowerCase();
          const tokens = val.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
          if (tokens.length > 0) {
            return tokens.some(t => itemVal.includes(t));
          }
          return itemVal.includes(val.toLowerCase());
        }
        return true;
      };

      if (!checkMatch('invoiceno', currentFilters.invoiceNo)) return false;
      if (!checkMatch('ordernumber', currentFilters.orderNumber)) return false;
      if (!checkMatch('rollitem', currentFilters.rollItem)) return false;
      if (!checkMatch('color', currentFilters.color)) return false;
      if (!checkMatch('batchno', currentFilters.batchNo)) return false;
      if (!checkMatch('rollno', currentFilters.rollNo)) return false;

      // Column Filters
      for (const colKey in columnFilters) {
        const query = columnFilters[colKey];
        if (query) {
          const valStr = String(item[colKey] || '').toLowerCase();
          const tokens = query.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
          if (tokens.length > 0) {
            if (!tokens.some(t => valStr.includes(t))) return false;
          } else {
            if (!valStr.includes(query.trim().toLowerCase())) return false;
          }
        }
      }

      return true;
    });
  }, [data, currentFilters, columnFilters]);

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    const allKeys = Object.keys(data[0]);
    const shiftCols = ['qrcode', 'recno', 'barcode', 'id'];
    const normal = allKeys.filter(k => !shiftCols.includes(k.toLowerCase().trim()));
    const endCols = allKeys.filter(k => shiftCols.includes(k.toLowerCase().trim()));
    return [...normal, ...endCols].map(key => ({
      key,
      label: key
    }));
  }, [data]);

  const paginatedData = useMemo(() => {
    return filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  const { selectionSummary, removeCellSelection, getCellProps } = useExcelDragSelection({
    data: paginatedData
  });

  const updateColFilter = useCallback((col: string, val: string) => {
    setColumnFilters(prev => ({ ...prev, [col]: val }));
    setPage(0);
  }, []);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const toggleSelect = useCallback((recNo: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(recNo)) next.delete(recNo);
      else next.add(recNo);
      return next;
    });
  }, []);
  const toggleSelectAll = useCallback(() => {
    if (paginatedData.every(r => selected.has(Number(r.RecNo)))) {
      setSelected(prev => {
        const next = new Set(prev);
        paginatedData.forEach(r => next.delete(Number(r.RecNo)));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        paginatedData.forEach(r => next.add(Number(r.RecNo)));
        return next;
      });
    }
  }, [paginatedData, selected]);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row: any } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ recNos: number[] } | null>(null);

  const handleDeleteClick = () => {
    if (!contextMenu && selected.size === 0) return;
    const recNos = selected.size > 0 ? Array.from(selected) : [contextMenu?.row.RecNo];
    setContextMenu(null);
    setConfirmDelete({ recNos });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const recNos = confirmDelete.recNos;
    setConfirmDelete(null);
    setSaving(true);
    try {
      await (fabricInventoryService as any).deleteRelax(recNos);
      showToast(t('relax.deleteSuccess', { count: recNos.length }), 'success');
      const delSet = new Set(recNos);
      setData(prev => prev.filter(r => !delSet.has(r.RecNo)));
      setSelected(prev => {
        const next = new Set(prev);
        recNos.forEach(id => next.delete(id));
        return next;
      });
    } catch (err: any) {
      showToast(err.message || t('relax.deleteFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const [editingCell, setEditingCell] = useState<{ recNo: number; colKey: string } | null>(null);
  const [editVal, setEditVal] = useState('');
  
  const startEdit = useCallback((row: any, colKey: string) => {
    setEditingCell({ recNo: row.RecNo, colKey });
    setEditVal(row[colKey] ? String(row[colKey]) : '');
  }, []);

  const handleSaveEdit = useCallback(async (row: any) => {
    if (!editingCell) return;
    const oldVal = String(row[editingCell.colKey] || '');
    if (editVal === oldVal) {
      setEditingCell(null);
      return;
    }
    setSaving(true);
    try {
      let d = row['DateRelax'];
      let tStr = row['TimeRelax'];
      if (editingCell.colKey === 'DateRelax') d = editVal;
      else tStr = editVal;
      
      const newDateTime = `${d} ${tStr}`.trim();
      await (fabricInventoryService as any).updateRelaxTime(row.RecNo, row.QrCode, newDateTime);
      showToast(t('relax.editSuccess'), 'success');
      setData(prev => prev.map(r => {
        if (r.RecNo === row.RecNo) {
          const updated = { ...r, [editingCell.colKey]: editVal };
          const dtStr = `${updated['DateRelax']}T${String(updated['TimeRelax']).padStart(5, '0')}`;
          const dt = new Date(dtStr);
          if (!isNaN(dt.getTime())) {
            updated['HourRelax'] = (new Date().getTime() - dt.getTime()) / 3600000;
          }
          return updated;
        }
        return r;
      }));
    } catch (err: any) {
      showToast(err.message || t('relax.editFailed'), 'error');
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  }, [editingCell, editVal]);

  const handleExport = () => {
    if (filteredData.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RelaxReport');
    XLSX.writeFile(wb, `RelaxReport_${new Date().getTime()}.xlsx`);
  };

  return (
    <Box sx={{ px: 1, py: 0.5, flex: 1, height: '100%', overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <FabricSearchFilter 
        fields={[
          { key: 'fromDate', label: t('history.fromDate', 'From Date'), icon: <CalendarMonthIcon fontSize="small" sx={{ color: '#64748b' }}/>, type: 'date', defaultValue: todayStr },
          { key: 'toDate', label: t('history.toDate', 'To Date'), icon: <CalendarMonthIcon fontSize="small" sx={{ color: '#64748b' }}/>, type: 'date', defaultValue: todayStr },
          { key: 'invoiceNo', label: 'Invoice No', icon: <ReceiptIcon fontSize="small" sx={{ color: '#64748b' }}/> },
          { key: 'orderNumber', label: 'Order Number', icon: <ConfirmationNumberIcon fontSize="small" sx={{ color: '#64748b' }}/> },
          { key: 'rollItem', label: 'Roll Item', icon: <CategoryIcon fontSize="small" sx={{ color: '#64748b' }}/> },
          { key: 'color', label: 'Color', icon: <PaletteIcon fontSize="small" sx={{ color: '#64748b' }}/> },
          { key: 'batchNo', label: 'Batch No', icon: <LayersIcon fontSize="small" sx={{ color: '#64748b' }}/> },
          { key: 'rollNo', label: 'Roll No', icon: <QrCodeScannerIcon fontSize="small" sx={{ color: '#64748b' }}/> },
        ]}
        loading={loading}
        onSearch={handleSearch}
        onClear={handleClear}
      >
        {searched && data.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              label={`${data.length} records`}
              size="small" sx={{ fontWeight: 700, bgcolor: '#e8f5e9', color: ACCENT }}
            />
            <Button variant="outlined" startIcon={<ExportIcon sx={{ fontSize: '18px !important' }} />} onClick={handleExport}
              sx={{ borderRadius: '12px', fontWeight: 600, fontSize: '0.8rem', height: 32, px: 2, textTransform: 'none', borderColor: '#cbd5e1', color: '#475569', bgcolor: '#fff', '&:hover': { bgcolor: '#f1f5f9' } }}>
              {t('inventory.exportExcel')}
            </Button>
          </Box>
        )}
      </FabricSearchFilter>



      {searched && (
        <Paper elevation={0} sx={{ 
          borderRadius: 2, border: '1px solid #e2e8f0', overflow: 'hidden', position: 'relative',
          flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0
        }}>
          {saving && <LinearProgress color="warning" sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999 }} />}
          {data.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderBottom: '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  {t('relax.legend', 'Legend:')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, borderRadius: 0.5, backgroundColor: '#f1f8e9', border: '1px solid #c8e6c9' }} />
                  <Typography variant="body2" sx={{ color: '#64748b' }}>{t('relax.cleared', 'Cleared standards')} (≥ Time Standard)</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, borderRadius: 0.5, backgroundColor: '#fff3e0', border: '1px solid #ffe0b2' }} />
                  <Typography variant="body2" sx={{ color: '#64748b' }}>{t('relax.below', 'Below standards')} (&lt; Time Standard)</Typography>
                </Box>
              </Box>
              {selected.size > 0 && (
                <Button variant="contained" color="error" disableElevation startIcon={<DeleteIcon />} onClick={handleDeleteClick} sx={{ borderRadius: '12px', fontWeight: 700, fontSize: '0.8rem', px: 2, height: 32, textTransform: 'none', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', '&:hover': { background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)' } }}>
                  {t('relax.deleteBtn')} ({selected.size})
                </Button>
              )}
            </Box>
          )}
          <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
            <Table stickyHeader size="small" sx={{
              '& .MuiTableCell-root': { fontSize: '12px', py: 0.75, px: 1, borderColor: '#f0f0f0' },
              '& .MuiTableBody-root .MuiTableRow-root': { bgcolor: '#fff' },
              '& .MuiTableBody-root .MuiTableRow-root:hover .sticky-cell': { bgcolor: 'inherit !important' }
            }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ ...SX_HEADER_CELL, position: 'sticky', left: 0, zIndex: 3 }}>
                    <Checkbox size="small" checked={paginatedData.length > 0 && paginatedData.every(r => selected.has(Number(r.RecNo)))} 
                      indeterminate={selected.size > 0 && !paginatedData.every(r => selected.has(Number(r.RecNo)))}
                      onChange={toggleSelectAll} sx={{ p: 0.3 }} />
                  </TableCell>
                  {columns.map(col => (
                    <TableCell key={col.key} sx={SX_HEADER_CELL}>
                      <ColumnFilter colKey={col.key} label={col.label} value={columnFilters[col.key] || ''} onChange={updateColFilter} />
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={Math.max(1, columns.length)} align="center" sx={{ py: 8 }}>
                      <CircularProgress size={40} sx={{ color: ACCENT, mb: 2 }} />
                      <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 600 }}>
                        {t('issueReport.processing', 'Processing data...')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={Math.max(1, columns.length)} align="center" sx={{ py: 6, color: '#999' }}>
                      {t('inventory.noData', 'No data found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((row, idx) => (
                    <RelaxRow 
                      key={`${row.RecNo}-${idx}`} row={row} idx={idx} columns={columns}
                      isSelected={selected.has(Number(row.RecNo))} toggleSelect={toggleSelect}
                      setContextMenu={setContextMenu} editingCell={editingCell} editVal={editVal}
                      setEditVal={setEditVal} handleSaveEdit={handleSaveEdit} startEdit={startEdit}
                      setEditingCell={setEditingCell} getCellProps={getCellProps}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            p: 1, borderTop: '1px solid #e0e0e0', flexWrap: 'wrap', gap: 1,
            backgroundColor: '#fff'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{t('inventory.rowsPerPage', 'Rows/page')}:</Typography>
              <Select
                size="small"
                value={rowsPerPage}
                onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
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
              onChange={(_, newPage) => setPage(newPage - 1)}
              shape="rounded"
              showFirstButton
              showLastButton
              size="medium"
              sx={{
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

      {!searched && !loading && (
        <Paper elevation={0} sx={{ p: 6, borderRadius: 3, border: '1px solid #e0e0e0', textAlign: 'center' }}>
          <SearchIcon sx={{ fontSize: 48, color: '#bdbdbd', mb: 1 }} />
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
            {t('relax.noDataHint')}
          </Typography>
        </Paper>
      )}

      {/* Right-click Context Menu */}
      <Menu
        open={!!contextMenu} onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
      >
        <MenuItem onClick={handleDeleteClick} sx={{ fontSize: '0.85rem', color: '#d32f2f' }}>
          <ListItemIcon><DeleteIcon sx={{ fontSize: 18, color: '#d32f2f' }} /></ListItemIcon>
          <ListItemText>{t('relax.deleteBtn')}</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#d32f2f', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon /> {t('relax.confirmDeleteTitle')}
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ color: '#1e293b', fontWeight: 500 }}>
            {t('relax.confirmDeleteMsg', { count: confirmDelete?.recNos.length })}
          </DialogContentText>
          <DialogContentText variant="body2" sx={{ color: '#f57c00', mt: 1, fontWeight: 600 }}>
            {t('relax.warningLog', 'Warning: This action will be logged in the system!')}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDelete(null)} sx={{ color: '#64748b', fontWeight: 600 }}>{t('common.cancel')}</Button>
          <Button onClick={executeDelete} variant="contained" color="error" disableElevation sx={{ fontWeight: 700, borderRadius: 1.5 }}>{t('relax.confirmDeleteTitle')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

