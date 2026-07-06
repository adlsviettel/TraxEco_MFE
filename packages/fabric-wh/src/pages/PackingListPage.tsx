import { useState, useMemo, useCallback, useRef, memo, useEffect } from 'react';
import {
  Box, Typography, Paper, Alert, Button, Checkbox,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination,
  Popover, Autocomplete, TextField, Chip, IconButton, Badge,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import {
  Download as DownloadIcon, FilterList as FilterIcon, Search as SearchIcon,
  DeleteOutline as DeleteIcon
} from '@mui/icons-material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CategoryIcon from '@mui/icons-material/Category';
import PaletteIcon from '@mui/icons-material/Palette';
import LayersIcon from '@mui/icons-material/Layers';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { useTranslation } from 'react-i18next';
import FabricSearchFilter, { type SearchField } from '../components/FabricSearchFilter';
import { useToast, useExcelDragSelection } from '@traxeco/shared';

const ACCENT = '#2e7d32';

const ColumnFilter = memo(({ colKey, label, value, onChange }: { colKey: string; label: string; value: string; onChange: (k: string, v: string) => void }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const active = !!value;

  const handleChange = useCallback((v: string) => { onChange(colKey, v); }, [colKey, onChange]);
  const parsedValue = useMemo(() => value ? value.split(',').map(s => s.trim()).filter(Boolean) : [], [value]);

  return (
    <>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 'inherit', lineHeight: 1.2 }}>{label}</Typography>
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
          multiple freeSolo options={[] as string[]} value={parsedValue}
          onChange={(_e, newVal) => handleChange(newVal.join(', '))}
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
              InputProps={{ ...params.InputProps, startAdornment: (<><SearchIcon sx={{ fontSize: 18, color: '#999', ml: 0.5, mr: 0.5 }} />{params.InputProps.startAdornment}</>) }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem' } }}
            />
          )}
        />
      </Popover>
    </>
  );
});

const EditableCell = memo(({
  initialValue, onSave, onCancel, width, type = 'text'
}: {
  initialValue: string, onSave: (val: string) => void, onCancel: () => void, width?: number, type?: 'text' | 'number'
}) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(initialValue);

  const handleSave = () => {
    setEditing(false);
    onSave(val);
  };

  if (editing) {
    return (
      <TextField
        size="small"
        autoFocus
        type={type}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleSave();
          } else if (e.key === 'Escape') {
            setVal(initialValue);
            setEditing(false);
            onCancel();
          }
        }}
        inputProps={type === 'number' ? { step: "0.01", min: "0" } : undefined}
        sx={{
          width: width || '100%',
          minWidth: 80,
          input: { p: '2px 4px', fontSize: '0.85rem', fontWeight: 700, textAlign: type === 'number' ? 'center' : 'left' }
        }}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', cursor: 'pointer', minHeight: 22, width: '100%', '&:hover .edit-icon': { opacity: 1 } }} onClick={() => setEditing(true)}>
      <Typography sx={{ fontSize: 'inherit', color: 'inherit' }}>{initialValue}</Typography>
      <Box className="edit-icon" title="Edit" sx={{ ml: 0.5, opacity: 0, transition: '0.2s', minWidth: 16, width: 16, height: 16, bgcolor: '#e8f5e9', color: ACCENT, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
      </Box>
    </Box>
  );
});

const formatDate = (dStr: any) => {
  if (!dStr) return '';
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return dStr;
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const DataRow = memo(({ 
  row, idx, colMeta, recNoVal, recNoKey, selected, onToggle, onEditSave, 
  getCellProps
}: any) => {
  return (
    <TableRow hover sx={{ transition: 'background-color 0.15s', '&:hover .sticky-cell': { bgcolor: '#e8f5e9 !important' } }}>
      <TableCell padding="checkbox" className="sticky-cell" sx={{ py: 0, position: 'sticky', left: 0, bgcolor: 'inherit', zIndex: 1, transition: 'background-color 0.15s' }}>
        <Checkbox size="small"
          checked={selected}
          onChange={(_, checked) => onToggle(recNoVal, checked)}
          sx={{ p: 0.3, '&.Mui-checked': { color: ACCENT } }}
        />
      </TableCell>
      {colMeta.map(({ col, isDate, isEditable, isNumeric }: any) => {
        let value = isDate ? formatDate(row[col]) : row[col];

        if (col.toLowerCase().trim() === 'printstt') {
          if (String(row[col]) === '1') {
            value = <Chip label="Printed" color="success" size="small" sx={{ height: 22, fontWeight: 700, fontSize: '0.7rem' }} />;
          } else {
            value = '';
          }
        }

        const cellProps = isNumeric ? getCellProps(col, idx, isNumeric) : {};

        return (
          <TableCell
            key={col}
            {...cellProps}
            sx={{
              whiteSpace: 'nowrap',
              ...(col.toLowerCase() === 'rollno' ? { fontWeight: 800, color: '#1565c0' } : {}),
              ...(isEditable ? { '&:hover': { backgroundColor: '#f1f8e9' } } : {})
            }}
          >
            {isEditable ? (
              <EditableCell
                initialValue={row[col] !== null && row[col] !== undefined ? String(row[col]) : ''}
                type={isNumeric ? 'number' : 'text'}
                onCancel={() => { }}
                onSave={(newVal) => onEditSave(newVal, String(row[col] !== null && row[col] !== undefined ? row[col] : ''), col, recNoVal, recNoKey)}
                width={100}
              />
            ) : value}
          </TableCell>
        );
      })}
    </TableRow>
  );
});

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export default function PackingListPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const searchFields: SearchField[] = [
    { key: 'invoiceNo', label: 'Invoice No', icon: <ReceiptIcon fontSize="small" /> },
    { key: 'po', label: 'Order Number (PO)', icon: <ConfirmationNumberIcon fontSize="small" /> },
    { key: 'item', label: 'Roll Item', icon: <CategoryIcon fontSize="small" /> },
    { key: 'color', label: 'Color', icon: <PaletteIcon fontSize="small" /> },
    { key: 'lot', label: 'Batch / Lot No', icon: <LayersIcon fontSize="small" /> },
    { key: 'roll', label: 'Roll No', icon: <QrCodeScannerIcon fontSize="small" /> },
  ];

  const [page, setPage] = useState(0);
  const rowsPerPage = 50;

  const [selectedRows, setSelectedRows] = useState<Set<any>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean, title: string, message: string, onConfirm: () => void }>({
    open: false, title: '', message: '', onConfirm: () => { }
  });

  const { showToast } = useToast();

  const handleSearch = async (filters: Record<string, string>) => {
    const hasValue = Object.values(filters).some(v => v && v.trim() !== '');
    if (!hasValue) {
      setError(t('packingList.enterSearchCriteria'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || '';

      // We map this to the Java backend that simulates InlineFBGet 42
      const params = new URLSearchParams();
      if (filters.invoiceNo) params.append('invoiceNo', filters.invoiceNo);
      if (filters.po) params.append('po', filters.po);
      if (filters.item) params.append('item', filters.item);
      if (filters.color) params.append('color', filters.color);
      if (filters.lot) params.append('lot', filters.lot);
      if (filters.roll) params.append('roll', filters.roll);

      const res = await fetch(`${API_BASE}/fabric-wh/packing-list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const result = await res.json();

      if (result && result.length > 0) {
        const keys = Object.keys(result[0]);
        // Force WH-Location to show
        if (!keys.includes('WH-Location') && !keys.includes('Location')) {
          keys.push('WH-Location');
        }

        const shiftCols = ['qrcode', 'recno', 'barcode'];
        const normal = keys.filter(k => !shiftCols.includes(k.toLowerCase().trim()));
        const endCols = keys.filter(k => shiftCols.includes(k.toLowerCase().trim()));

        setColumns([...normal, ...endCols]);
        setData(result);
        setColFilters({}); // reset column filters on new search
        showToast(t('packingList.loadSuccess', { count: result.length }), 'success');
      } else {
        setColumns([]);
        setData([]);
        showToast(t('packingList.noData'), 'warning');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || t('packingList.loadError', 'Error loading Packing List data'));
      setData([]);
      showToast(t('packingList.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Do not auto-fetch if empty
  }, []);

  const handleColFilterChange = useCallback((colKey: string, val: string) => {
    setColFilters(prev => ({ ...prev, [colKey]: val }));
    setPage(0);
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      for (const [key, filterVal] of Object.entries(colFilters)) {
        if (!filterVal || filterVal.trim() === '') continue;

        const cellValue = String(row[key] ?? '').toLowerCase();
        const searchTerms = filterVal.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

        if (searchTerms.length > 0) {
          const match = searchTerms.some(term => cellValue.includes(term));
          if (!match) return false;
        }
      }
      return true;
    });
  }, [data, colFilters]);

  // Excel-like dragging for numeric columns (DOM-based, zero re-render during drag)
  const { selectionSummary, removeCellSelection, getCellProps } = useExcelDragSelection({
    data: filteredData
  });

  const EDITABLE_COLS_LIST = useMemo(() => ['OrderNumber', 'SupCode', 'InvoiceNo', 'RollItem', 'Color', 'ColorCode', 'BatchNo', 'RollNo', 'ShipLength', 'NW', 'GW', 'Width', 'Location', 'Note', 'Comment', 'WH-Location'], []);

  const colMeta = useMemo(() => columns.map(col => ({
    col,
    isDate: col.toLowerCase().includes('date'),
    isEditable: EDITABLE_COLS_LIST.some(c => c.toLowerCase().trim() === col.toLowerCase().trim()),
    isNumeric: ['shiplength', 'nw', 'gw', 'width'].includes(col.toLowerCase().trim())
  })), [columns, EDITABLE_COLS_LIST]);

  const handleRowToggle = useCallback((recNoVal: string, checked: boolean) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      checked ? next.add(recNoVal) : next.delete(recNoVal);
      return next;
    });
  }, []);

  const handleEditSave = useCallback(async (newVal: string, originalVal: string, col: string, recNoVal: string, recNoKey: string) => {
    if (newVal === originalVal || newVal.trim() === originalVal.trim()) return;
    try {
      const payload = { field: col, value: newVal };
      const resp = await fetch(`${API_BASE}/fabric-wh/packing-list/${recNoVal}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload)
      });
      const resData = await resp.json().catch(() => ({}));
      if (resp.status === 409 && resData.requiresConfirmation) {
        setConfirmDialog({
          open: true, title: t('packingList.editSuccess'), message: resData.message,
          onConfirm: async () => {
            setConfirmDialog(prev => ({ ...prev, open: false }));
            try {
              const forceResp = await fetch(`${API_BASE}/fabric-wh/packing-list/${recNoVal}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ ...payload, forceEnable: true })
              });
              if (!forceResp.ok) throw new Error('Force update failed');
              setData(prev => prev.map(r => r[recNoKey] === recNoVal ? { ...r, [col]: newVal } : r));
              showToast(t('packingList.editSuccess'), 'success');
            } catch { showToast(t('packingList.editFailed'), 'error'); }
          }
        });
        return;
      }
      if (!resp.ok) throw new Error(resData.error || 'Update failed');
      setData(prev => prev.map(r => r[recNoKey] === recNoVal ? { ...r, [col]: newVal } : r));
      showToast(t('packingList.editSuccess'), 'success');
    } catch { showToast(t('packingList.editFailed'), 'error'); }
  }, [t, showToast]);

  return (
    <Box sx={{ px: 1, py: 0.5, flex: 1, height: '100%', overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <FabricSearchFilter
        fields={searchFields}
        onSearch={handleSearch}
        loading={loading}
        onClear={() => {
          setData([]);
          setColumns([]);
        }}
        hideSearchButton={true}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {data.length > 0 && (
            <Chip
              label={`${t('issueFabric.total', 'Total')}: ${filteredData.length}${filteredData.length !== data.length ? ` / ${data.length}` : ''}`}
              size="small" sx={{ fontWeight: 700, bgcolor: '#e8f5e9', color: '#2e7d32' }}
            />
          )}
          {selectedRows.size > 0 && (
            <Button variant="contained" color="error" disableElevation startIcon={<DeleteIcon />} disabled={deleting}
              onClick={() => {
                setConfirmDialog({
                  open: true,
                  title: t('packingList.confirmDeleteTitle'),
                  message: t('packingList.confirmDeleteMsg', { count: selectedRows.size }),
                  onConfirm: async () => {
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                    setDeleting(true);
                    try {
                      const resp = await fetch(`${API_BASE}/fabric-wh/packing-list/delete-bulk`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                        body: JSON.stringify({ recNos: Array.from(selectedRows) })
                      });
                      if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || 'Delete failed'); }
                      const recNoKey2 = data.length > 0 ? (Object.keys(data[0]).find(k => k.toLowerCase().trim() === 'recno') || 'RecNo') : 'RecNo';
                      setData(prev => prev.filter(r => !selectedRows.has(r[recNoKey2])));
                      showToast(t('packingList.deleteSuccess', { count: selectedRows.size }), 'success');
                      setSelectedRows(new Set());
                    } catch (err: any) {
                      showToast(t('packingList.deleteFailed') + ': ' + err.message, 'error');
                    } finally {
                      setDeleting(false);
                    }
                  }
                });
              }}
              sx={{ fontWeight: 700, borderRadius: '12px', height: 32, fontSize: '0.8rem', px: 2, textTransform: 'none', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: 'none', '&:hover': { background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)' } }}
            >
              {t('packingList.deleteBtn')} ({selectedRows.size})
            </Button>
          )}
          {data.length > 0 && (
            <Button variant="outlined" size="small" startIcon={<DownloadIcon sx={{ fontSize: '18px !important' }} />} sx={{ height: 32, borderColor: '#cbd5e1', color: '#475569', fontWeight: 600, fontSize: '0.8rem', borderRadius: 1.5, px: 2, textTransform: 'none', bgcolor: '#fff', '&:hover': { bgcolor: '#f1f5f9' } }}>{t('inventory.exportExcel')}</Button>
          )}
        </Box>
      </FabricSearchFilter>

      {error && <Alert severity="error">{error}</Alert>}

      <Paper elevation={0} sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 2, border: '1px solid #e2e8f0' }}>
        <TableContainer sx={{ flexGrow: 1 }}>
          <Table stickyHeader size="small" sx={{
            '& .MuiTableCell-root': { fontSize: '12px', py: 0.75, px: 1, borderColor: '#f0f0f0' },
            '& .MuiTableBody-root .MuiTableRow-root': { bgcolor: '#fff' },
            '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: '#fafbfc' },
            '& .MuiTableBody-root .MuiTableRow-root:hover': { bgcolor: '#e8f5e9 !important' },
            '& .MuiTableBody-root .MuiTableRow-root:hover .sticky-cell': { bgcolor: '#e8f5e9 !important' }
          }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ fontWeight: 700, bgcolor: '#f8fafc', whiteSpace: 'nowrap', position: 'sticky', left: 0, zIndex: 3, top: 0, borderBottom: '2px solid #e2e8f0' }}>
                  <Checkbox size="small"
                    checked={filteredData.length > 0 && filteredData.slice(page * rowsPerPage, (page + 1) * rowsPerPage).every(r => {
                      const rk = Object.keys(r).find(k => k.toLowerCase().trim() === 'recno') || 'RecNo';
                      return selectedRows.has(r[rk]);
                    })}
                    indeterminate={filteredData.slice(page * rowsPerPage, (page + 1) * rowsPerPage).some(r => {
                      const rk = Object.keys(r).find(k => k.toLowerCase().trim() === 'recno') || 'RecNo';
                      return selectedRows.has(r[rk]);
                    }) && !filteredData.slice(page * rowsPerPage, (page + 1) * rowsPerPage).every(r => {
                      const rk = Object.keys(r).find(k => k.toLowerCase().trim() === 'recno') || 'RecNo';
                      return selectedRows.has(r[rk]);
                    })}
                    onChange={(_, checked) => {
                      const rk = filteredData.length > 0 ? (Object.keys(filteredData[0]).find(k => k.toLowerCase().trim() === 'recno') || 'RecNo') : 'RecNo';
                      const pageRows = filteredData.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
                      setSelectedRows(prev => {
                        const next = new Set(prev);
                        pageRows.forEach(r => checked ? next.add(r[rk]) : next.delete(r[rk]));
                        return next;
                      });
                    }}
                    sx={{ p: 0.3, '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: ACCENT } }}
                  />
                </TableCell>
                {columns.map(col => (
                  <TableCell key={col} sx={{ fontWeight: 700, bgcolor: '#f8fafc', whiteSpace: 'nowrap', borderBottom: '2px solid #e2e8f0', color: '#334155', letterSpacing: '0.02em' }}>
                    <ColumnFilter
                      colKey={col}
                      label={col === 'Comment' ? 'Remark' : col === 'Note' ? 'Remark' : col === 'Location' ? 'WH-Location' : col}
                      value={colFilters[col] || ''}
                      onChange={handleColFilterChange}
                    />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((row, idx) => {
                const recNoKey = columns.length > 0 ? (Object.keys(row).find(k => k.toLowerCase().trim() === 'recno') || 'RecNo') : 'RecNo';
                const recNoVal = row[recNoKey];
                return (
                  <DataRow
                    key={recNoVal || idx}
                    row={row} 
                    idx={idx}
                    colMeta={colMeta} 
                    recNoVal={recNoVal} 
                    recNoKey={recNoKey} 
                    selected={selectedRows.has(recNoVal)}
                    onToggle={handleRowToggle} 
                    onEditSave={handleEditSave}
                    getCellProps={getCellProps}
                  />
                );
              })}
              {filteredData.length === 0 && !loading && (
                <TableRow><TableCell colSpan={Math.max(columns.length, 1)} align="center" sx={{ py: 3, color: '#64748b' }}>{t('packingList.noDataHint')}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {filteredData.length > 0 && (
          <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0' }}>
            <Pagination
              count={Math.ceil(filteredData.length / rowsPerPage)}
              page={page + 1}
              onChange={(_, val) => setPage(val - 1)}
              color="primary"
            />
          </Box>
        )}
      </Paper>

      {/* Floating Summary Footer for Dragged Cells */}
      {selectionSummary && (
        <Paper elevation={4} className="sum-footer" sx={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 9999, py: 1.5, px: 3, borderRadius: 3,
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

      {/* Confirmation Dialog for Disabled Rolls */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog.message}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))} sx={{ color: '#64748b', fontWeight: 600 }}>{t('common.cancel')}</Button>
          <Button onClick={confirmDialog.onConfirm} variant="contained" color="error" disableElevation sx={{ fontWeight: 700, borderRadius: 1.5 }} autoFocus>{t('common.confirm')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
