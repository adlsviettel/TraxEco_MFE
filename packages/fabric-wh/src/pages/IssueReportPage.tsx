import { useState, useCallback, useMemo, useRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Pagination, Select, MenuItem, CircularProgress, Button,
  IconButton, Badge, Popover, TextField, Chip, Autocomplete, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { useToast, useExcelDragSelection, authFetch } from '@traxeco/shared';
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

/**
 * Modern Issue Report page with Sticky headers, Sticky Checkboxes and Filter capabilities.
 * Extracted from Legacy C# 'download_issue_report()' - ID: 18.
 */

const ACCENT = '#2e7d32';
const SX_HEADER_CELL = { fontWeight: 700, backgroundColor: '#f8fafc', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 2, borderBottom: '2px solid #e2e8f0', color: '#334155', letterSpacing: '0.02em' };
const SX_CELL = { whiteSpace: 'nowrap', fontSize: '12px' };

const EMPTY_OPTIONS: readonly string[] = [];

// Reusable Column Filter Component
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
          multiple freeSolo options={EMPTY_OPTIONS} value={parsedValue} onChange={(e, newVal) => handleChange(newVal.join(', '))}
          renderTags={(tagValue, getTagProps) =>
            tagValue.map((option, index) => {
              const { key, ...restProps } = getTagProps({ index });
              return <Chip variant="outlined" label={option} size="small" key={key} {...restProps} sx={{ height: 24, fontSize: '0.75rem' }} />;
            })
          }
          renderInput={(params) => (
            <TextField {...params} inputRef={inputRef} size="small" placeholder={value ? '' : `Filter ${label}...`}
              onKeyDown={(e) => { if (e.key === 'Escape') setAnchorEl(null); }} autoFocus fullWidth
              InputProps={{ ...params.InputProps, startAdornment: (<><SearchIcon sx={{ fontSize: 18, color: '#999', ml: 0.5, mr: 0.5 }} />{params.InputProps.startAdornment}</>) }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem' } }}
            />
          )}
        />
      </Popover>
    </>
  );
});

// Editable Cell Component for QtyOut
const EditableQtyCell = ({ initialValue, recNo, onUpdate }: { initialValue: string, recNo: number, onUpdate: (recNo: number, val: number) => Promise<void> }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (val === initialValue) return setEditing(false);
    const numVal = Number(val);
    if (isNaN(numVal)) {
      setVal(initialValue);
      return setEditing(false);
    }
    
    try {
      setLoading(true);
      await onUpdate(recNo, numVal);
      setEditing(false);
    } catch (e) {
      setVal(initialValue);
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress size={14} sx={{ color: ACCENT }} />;

  if (editing) {
    return (
      <TextField 
        size="small" 
        autoFocus
        type="number"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setVal(initialValue); setEditing(false); } }}
        inputProps={{ step: "0.01", min: "0", style: { padding: '2px 4px', fontSize: '0.85rem', width: '60px', textAlign: 'center' } }}
        autoComplete="off"
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, cursor: 'pointer', '&:hover .edit-icon': { opacity: 1 } }} onClick={() => setEditing(true)}>
      <span>{initialValue}</span>
      <Box className="edit-icon" title="Edit QtyOut" sx={{ opacity: 0, transition: '0.2s', width: 16, height: 16, bgcolor: '#e8f5e9', color: ACCENT, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
      </Box>
    </Box>
  );
};

export default function IssueReportPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<Record<string, string>>({});

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: () => {} });

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

      // Explicitly tell typescript about IssueReport in service
      const res = await (fabricInventoryService as any).getIssueReport(fromDate, toDate);
      const rows = res || [];
      setData(rows);
      if (rows.length > 0) showToast(t('issueReport.loadSuccess', { count: rows.length }), 'success');
      else showToast(t('issueReport.noData'), 'warning');
      
      setCurrentFilters(filters);
      setSearched(true);
      setPage(0);
      setSelectedRows(new Set());
    } catch (err: any) {
      showToast(err.message || t('issueReport.loadError'), 'error');
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

  const handleUpdateQtyOut = useCallback(async (recNo: number, newQty: number) => {
    try {
      await (fabricInventoryService as any).updateIssueQty(recNo, newQty);
      setData(prev => prev.map(r => r.RecNo === recNo ? { ...r, QtyOut: newQty } : r));
      showToast(t('issueReport.editSuccess'), 'success');
    } catch (err: any) {
      showToast(err.message || t('issueReport.editFailed'), 'error');
      throw err; // throw to reset the cell
    }
  }, [showToast]);

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
    return [...normal, ...endCols].map(key => ({ key, label: key }));
  }, [data]);

  const paginatedData = useMemo(() => filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredData, page, rowsPerPage]);
  
  // Cell Drag Selection (DOM-based, high performance)
  const { selectionSummary, removeCellSelection, getCellProps } = useExcelDragSelection({
    data: paginatedData
  });

  const updateColFilter = useCallback((col: string, val: string) => {
    setColumnFilters(prev => ({ ...prev, [col]: val }));
    setPage(0);
    setSelectedRows(new Set());
  }, []);

  const handleExport = () => {
    if (filteredData.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'IssueReport');
    XLSX.writeFile(wb, `IssueReport_${new Date().getTime()}.xlsx`);
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
            <Chip label={`${data.length} records`} size="small" sx={{ fontWeight: 700, bgcolor: '#e8f5e9', color: ACCENT }} />
            {selectedRows.size > 0 && (
              <Button variant="contained" color="error" disableElevation startIcon={<DeleteIcon />} disabled={deleting}
                onClick={() => {
                  setConfirmDialog({
                    open: true,
                    title: t('issueReport.deleteTitle'),
                    message: t('issueReport.deleteConfirmMsg', { count: selectedRows.size }),
                    onConfirm: async () => {
                      setConfirmDialog(prev => ({ ...prev, open: false }));
                      setDeleting(true);
                      try {
                        const recNoArray = filteredData.filter((_, idx) => selectedRows.has(idx)).map(r => r.RecNo).filter(Boolean);
                        const resp = await authFetch(`/fabric-wh/issue-report/delete-bulk`, {
                          method: 'POST',
                          body: JSON.stringify({ recNos: recNoArray })
                        });
                        if (!resp.ok) throw new Error('API Error');
                        showToast(t('issueReport.deleteSuccess', { count: recNoArray.length }), 'success');
                        setSelectedRows(new Set());
                        handleSearch(currentFilters);
                      } catch (e: any) {
                        showToast(t('issueReport.deleteFailed') + ': ' + e.message, 'error');
                      } finally {
                        setDeleting(false);
                      }
                    }
                  });
                }}
                sx={{ borderRadius: 1.5, fontWeight: 600, height: 36, textTransform: 'none' }}>
                {t('issueReport.deleteBtn')} ({selectedRows.size})
              </Button>
            )}
            <Button variant="outlined" startIcon={<ExportIcon />} onClick={handleExport}
              sx={{ borderRadius: 1.5, fontWeight: 600, height: 36, borderColor: '#cbd5e1', color: '#334155', bgcolor: '#fff', '&:hover': { bgcolor: '#f8fafc' } }}>
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
          <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
            <Table stickyHeader size="small" sx={{
              '& .MuiTableCell-root': { fontSize: '12px', py: 0.75, px: 1, borderColor: '#f0f0f0' },
              '& .MuiTableBody-root .MuiTableRow-root': { bgcolor: '#fff' },
              '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: '#fafbfc' },
              '& .MuiTableBody-root .MuiTableRow-root:hover': { bgcolor: '#e8f5e9 !important' },
              '& .MuiTableBody-root .MuiTableRow-root:hover .sticky-cell': { bgcolor: '#e8f5e9 !important' }
            }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ ...SX_HEADER_CELL, position: 'sticky', left: 0, zIndex: 3 }}>
                    <Checkbox size="small"
                      checked={filteredData.length > 0 && selectedRows.size === filteredData.length}
                      indeterminate={selectedRows.size > 0 && selectedRows.size < filteredData.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedRows(new Set(filteredData.map((_, i) => i)));
                        else setSelectedRows(new Set());
                      }}
                      sx={{ p: 0.3, '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: ACCENT } }}
                    />
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
                    <TableCell colSpan={Math.max(1, columns.length + 1)} align="center" sx={{ py: 8 }}>
                      <CircularProgress size={40} sx={{ color: ACCENT, mb: 2 }} />
                      <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 600 }}>{t('issueReport.processing')}</Typography>
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={Math.max(1, columns.length + 1)} align="center" sx={{ py: 6, color: '#999' }}>
                      {t('inventory.noData', 'No data found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((row, idx) => (
                    <TableRow hover key={`row-${idx}`} sx={{ transition: 'background-color 0.15s' }}>
                      <TableCell padding="checkbox" className="sticky-cell" sx={{ py: 0, position: 'sticky', left: 0, bgcolor: 'inherit', zIndex: 1, transition: 'background-color 0.15s' }}>
                        <Checkbox size="small" 
                          checked={selectedRows.has(page * rowsPerPage + idx)}
                          onChange={(e) => {
                            const newSet = new Set(selectedRows);
                            if (e.target.checked) newSet.add(page * rowsPerPage + idx);
                            else newSet.delete(page * rowsPerPage + idx);
                            setSelectedRows(newSet);
                          }}
                          sx={{ p: 0.3, '&.Mui-checked': { color: ACCENT } }}
                        />
                      </TableCell>
                      {columns.map(col => {
                        const isTargetCol = col.key === 'ShipLength' || col.key === 'Balance';
                        const hasPositiveBalance = Number(row['Balance']) > 0;
                        
                        let displayValue = row[col.key] != null ? String(row[col.key]) : '';
                        let isTransfer = false;
                        
                        // If Balance is empty or null, show CHUYEN XUONG (Transfer Factory)
                        if (col.key === 'Balance' && displayValue.trim() === '') {
                          displayValue = t('inventory.transferFactory', 'TRANSFER_FACTORY');
                          isTransfer = true;
                        }

                        let highlightSx: Record<string, any> = {};
                        if (isTransfer) {
                          // Style for Transfer Factory (Chuyển Xưởng) -> Blue
                          highlightSx = { bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 700 };
                        } else if (isTargetCol && hasPositiveBalance) {
                          // Style for Positive Balance -> Orange
                          highlightSx = { bgcolor: '#ffe0b2', color: '#e65100', fontWeight: 700 };
                        }
                        // Highlight RollNo column
                        if (col.key.toLowerCase() === 'rollno') {
                          highlightSx = { ...highlightSx, fontWeight: 800, color: '#1565c0' };
                        }

                        if (col.key === 'QtyOut') {
                          return (
                            <TableCell key={col.key} sx={{ ...SX_CELL, ...highlightSx }} align="center">
                              <EditableQtyCell 
                                initialValue={displayValue} 
                                recNo={row['RecNo']} 
                                onUpdate={handleUpdateQtyOut} 
                              />
                            </TableCell>
                          );
                        }

                        const isNumericCol = typeof displayValue === 'string' && !isNaN(parseFloat(displayValue)) && displayValue.trim() !== '' && !isTransfer;
                        const cellProps = isNumericCol ? getCellProps(col.key, idx, isNumericCol) : {};

                        return (
                          <TableCell key={col.key} {...cellProps} sx={{ ...SX_CELL, ...highlightSx, userSelect: isNumericCol ? 'none' : 'auto' }}>
                            {displayValue}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderTop: '1px solid #e0e0e0', flexWrap: 'wrap', gap: 1, backgroundColor: '#fff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{t('inventory.rowsPerPage', 'Rows/page')}:</Typography>
              <Select size="small" value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }} sx={{ height: 32, fontSize: '0.85rem', borderRadius: 1.5 }}>
                {[25, 50, 100, 200, 500].map(v => <MenuItem key={v} value={v} sx={{ fontSize: '0.85rem' }}>{v}</MenuItem>)}
              </Select>
              <Typography variant="body2" sx={{ color: 'text.secondary', ml: 1 }}>
                {filteredData.length > 0 ? page * rowsPerPage + 1 : 0}-{Math.min((page + 1) * rowsPerPage, filteredData.length)} / {filteredData.length}
              </Typography>
            </Box>
            <Pagination count={Math.ceil(filteredData.length / rowsPerPage) || 1} page={page + 1} onChange={(_, newPage) => setPage(newPage - 1)} shape="rounded" showFirstButton showLastButton size="medium" sx={{ '& .MuiPaginationItem-root.Mui-selected': { bgcolor: ACCENT, color: '#fff', '&:hover': { bgcolor: '#1b5e20' } } }} />
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
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>{t('issueReport.noDataHint')}</Typography>
        </Paper>
      )}

      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(p => ({ ...p, open: false }))} PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#d32f2f' }}>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDialog(p => ({ ...p, open: false }))} variant="text" sx={{ color: '#64748b', fontWeight: 600 }}>{t('common.cancel')}</Button>
          <Button onClick={confirmDialog.onConfirm} variant="contained" color="error" disableElevation sx={{ fontWeight: 700, borderRadius: 2, px: 3 }} disabled={deleting}>
             {deleting ? t('issueReport.deleting') : t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

