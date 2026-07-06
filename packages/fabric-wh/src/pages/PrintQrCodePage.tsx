import React, { useState, useMemo, useCallback, memo } from 'react';
import { 
  Box, Typography, Paper, Alert, Button, Checkbox, Chip, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Radio, RadioGroup, FormControlLabel, Popover, Autocomplete, Badge
} from '@mui/material';
import { 
  QrCode as QrCodeIcon, Print as PrintIcon,
  Receipt as ReceiptIcon, ConfirmationNumber as ConfirmationNumberIcon,
  Category as CategoryIcon, Palette as PaletteIcon, Layers as LayersIcon,
  Delete as DeleteIcon, WarningAmber as WarningAmberIcon, Search as SearchIcon, FilterList as FilterListIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import FabricSearchFilter, { type SearchField } from '../components/FabricSearchFilter';
import { useToast, useExcelDragSelection } from '@traxeco/shared';
import { QRCodeSVG } from 'qrcode.react';

const EMPTY_OPTIONS: readonly string[] = [];

const ColumnFilter = React.memo(({ colKey, label, value, onChange }: { colKey: string; label: string; value: string; onChange: (k: string, v: string) => void }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const active = !!value;

  const handleChange = React.useCallback((v: string) => { onChange(colKey, v); }, [colKey, onChange]);
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
            <FilterListIcon sx={{ fontSize: 15 }} />
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

const FocCell = memo(({ recNo, initialValue, onUpdate }: { recNo: number, initialValue: string, onUpdate: (r: number, v: string) => void }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(initialValue);

  const handleSave = () => {
    setEditing(false);
    if (val !== initialValue) onUpdate(recNo, val);
  };

  if (editing) {
    return (
      <TextField 
        size="small"
        autoFocus
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setVal(initialValue); setEditing(false); } }}
        inputProps={{ step: "0.01", min: 0 }}
        sx={{ '& .MuiInputBase-input': { p: '2px 4px', fontSize: '0.85rem', textAlign: 'center' }, width: 80 }}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, cursor: 'pointer', minHeight: 22, '&:hover .edit-icon': { opacity: 1 } }} onClick={() => setEditing(true)}>
      <Typography sx={{ fontSize: '11px' }}>{initialValue || '0'}</Typography>
      <Box className="edit-icon" title="Edit FOC" sx={{ opacity: 0, transition: '0.2s', minWidth: 16, width: 16, height: 16, bgcolor: '#e8f5e9', color: '#2e7d32', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
      </Box>
    </Box>
  );
});

const DataRow = memo(({ row, selected, onToggle, columns, getCellProps, idx }: any) => {
  return (
    <TableRow hover onClick={() => onToggle(row.RecNo)} sx={{ cursor: 'pointer', transition: 'background-color 0.15s', '&:hover .sticky-cell': { bgcolor: '#e8f5e9 !important' } }}>
      <TableCell padding="checkbox" className="sticky-cell" sx={{ py: 0, position: 'sticky', left: 0, bgcolor: 'inherit', zIndex: 1, transition: 'background-color 0.15s' }}>
        <Checkbox size="small" disableRipple checked={selected} sx={{ p: 0.3, '&.Mui-checked': { color: '#2e7d32' } }} />
      </TableCell>
      {columns.map((col: string) => {
        let val = String(row[col] ?? '');
        if (col === 'DateInHouse' && val.length > 10) val = val.substring(0, 10);
        
        const isNumericCol = typeof row[col] === 'number' || (row[col] != null && !isNaN(parseFloat(String(row[col]))) && String(row[col]).trim() !== '' && col !== 'DateInHouse' && col !== 'CreateDate' && col !== 'RecoredDate');
        const isExcluded = col === 'Qc' || col === 'PrintStt';
        const cellProps = (isNumericCol && !isExcluded) ? getCellProps(col, idx, true) : {};

        return (
          <TableCell key={col} {...cellProps} align={col === 'Qc' ? 'center' : 'left'} sx={{ whiteSpace: 'nowrap', ...(col.toLowerCase() === 'rollno' ? { fontWeight: 800, color: '#1565c0' } : {}), userSelect: (isNumericCol && !isExcluded) ? 'none' : 'auto' }}>
            {col === 'Qc' && val.trim() !== ''
              ? <Chip icon={<WarningAmberIcon sx={{ color: '#000 !important', fontSize: '16px' }} />} label={val.replace(/\*/g, '').trim()} size="small" sx={{ height: 22, fontWeight: 900, fontSize: '0.75rem', bgcolor: '#ffc107', color: '#000', borderRadius: 1, boxShadow: '0 1px 4px rgba(255,193,7,0.5)', '& .MuiChip-icon': { ml: 0.5, mt: '-1px' } }} />
              : col === 'PrintStt' && val === 'Printed' 
              ? <Chip label="Printed" color="success" size="small" sx={{ height: 22, fontWeight: 700, fontSize: '0.7rem' }} />
              : val}
          </TableCell>
        );
      })}
    </TableRow>
  );
});

const ACCENT = '#2e7d32';
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export default function PrintQrCodePage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(0);
  const rowsPerPage = 50;

  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const { showToast } = useToast();
  const { t } = useTranslation();
  
  const [conflictItems, setConflictItems] = useState<any[]>([]);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [focMap, setFocMap] = useState<Record<number, string>>({});
  const [printMode, setPrintMode] = useState<'browser' | 'network'>('browser');
  const [labelFormat, setLabelFormat] = useState<'normal' | 'special'>('normal');
  const [printerIp, setPrinterIp] = useState<string>('');

  // Tự động nhận diện thiết bị & lấy lại IP cũ
  React.useEffect(() => {
    const isMobileOrTablet = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
      || (navigator.maxTouchPoints > 0 && window.innerWidth <= 1024);
    
    setPrintMode(isMobileOrTablet ? 'network' : 'browser');

    const savedIp = localStorage.getItem('zebra_printer_ip');
    if (savedIp) setPrinterIp(savedIp);
  }, []);

  // Lưu IP tự động mỗi khi người dùng có gõ
  React.useEffect(() => {
    if (printerIp.trim()) {
      localStorage.setItem('zebra_printer_ip', printerIp.trim());
    }
  }, [printerIp]);

  const searchFields: SearchField[] = [
    { key: 'invoiceNo', label: 'Invoice No', icon: <ReceiptIcon fontSize="small" /> },
    { key: 'po', label: 'Order Number (PO)', icon: <ConfirmationNumberIcon fontSize="small" /> },
    { key: 'item', label: 'Roll Item', icon: <CategoryIcon fontSize="small" /> },
    { key: 'color', label: 'Color', icon: <PaletteIcon fontSize="small" /> },
    { key: 'lot', label: 'Batch / Lot No', icon: <LayersIcon fontSize="small" /> },
    { key: 'roll', label: 'Roll No', icon: <QrCodeIcon fontSize="small" /> },
    { key: 'barCode', label: 'Bar Code', icon: <QrCodeIcon fontSize="small" /> },
  ];

  const handleSearch = async (filters: Record<string, string>) => {
    const hasValue = Object.values(filters).some(v => v && v.trim() !== '');
    if (!hasValue) {
      setError(t('printQr.enterSearchCriteria'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const params = new URLSearchParams();
      if (filters.invoiceNo) params.append('invoiceNo', filters.invoiceNo);
      if (filters.po) params.append('po', filters.po);
      if (filters.item) params.append('item', filters.item);
      if (filters.color) params.append('color', filters.color);
      if (filters.lot) params.append('lot', filters.lot);
      if (filters.roll) params.append('roll', filters.roll);
      if (filters.barCode) params.append('barCode', filters.barCode);

      const res = await fetch(`${API_BASE}/fabric-wh/print-qr?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      
      if (result && result.length > 0) {
        const rawKeys = Object.keys(result[0]);
        const shiftCols = ['qrcode', 'recno', 'barcode'];
        const normal = rawKeys.filter(k => !shiftCols.includes(k.toLowerCase().trim()));
        const endCols = rawKeys.filter(k => shiftCols.includes(k.toLowerCase().trim()));
        setColumns([...normal, ...endCols]);
        setData(result);
        setSelectedRows(new Set());
        setPage(0);
        showToast(t('printQr.loadSuccess', { count: result.length }), 'success');
      } else {
        setColumns([]);
        setData([]);
        showToast(t('printQr.noData'), 'warning');
      }
    } catch (err: any) {
      setError(err.message || t('printQr.loadError', 'Error loading data'));
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const triggerBrowserPrint = () => {
    const content = document.getElementById('qr-print-area')?.innerHTML;
    if (content) {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>Print Label</title>
              <style>
                @page { size: 10.16cm 5.08cm; margin: 0; }
                body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                .sticker-label {
                  width: 10.16cm; height: 5.08cm;
                  display: flex;
                  padding: 0.2cm 0.3cm;
                  page-break-after: always;
                  overflow: hidden;
                }
                .fields-col {
                  flex: 1; display: flex; flex-direction: column; justify-content: space-between;
                  min-width: 0;
                }
                .field-text { 
                  font-size: 10pt; font-weight: 700; line-height: 1.25;
                  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .field-text.wrap { white-space: normal; word-break: break-word; }
                .field-large { font-size: 13pt; font-weight: 900; }
                .field-group { display: flex; gap: 8px; }
                .field-inv { font-size: 8pt; font-weight: 600; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #333; }
                .qr-col { 
                  flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; 
                  margin-left: 0.3cm; width: 2.8cm;
                }
                .qc-label { font-size: 9pt; font-weight: 900; margin-top: 3px; text-align: center; border: 1px solid #000; padding: 0 4px; border-radius: 3px; }
              </style>
            </head>
            <body>
              ${content.replace(/<div/g, '<div').replace(/<\/div>/g, '</div>')}
              <script>window.print(); window.close();</script>
            </body>
          </html>
        `);
        win.document.close();
      }
    }
  };

  const executePrint = async (overrides: Array<{RecNo: number, TargetBalance: number}> = []) => {
    if (printMode === 'network' && !printerIp.trim()) {
      showToast(t('printQr.enterPrinterIp'), 'warning');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        recNos: Array.from(selectedRows),
        overrides: overrides.length > 0 ? overrides : undefined,
        printMode,
        printerIp: printMode === 'network' ? printerIp.trim() : undefined
      };
      const res = await fetch(`${API_BASE}/fabric-wh/print-qr/mark-printed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      
      const resData = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        if (res.status === 409 && resData.status === 'CONFLICT') {
          // Has conflict items needing balance reset
          setConflictItems(resData.items);
          setConflictModalOpen(true);
          return;
        }
        throw new Error(resData.error || t('printQr.printError', 'Print error'));
      }
      
      showToast(t('printQr.markPrintSuccess', { count: selectedRows.size }), 'success');

      if (printMode === 'browser') {
        // Trigger browser print
        triggerBrowserPrint();
      } else {
        // Here we silently notify that the ZPL signal has been "sent" via the backend
        showToast(t('printQr.zplSent', { ip: printerIp.trim() }), 'success');
      }
      
      // Update local state without refetching from DB
      setData(prev => prev.map(row => 
        selectedRows.has(row.RecNo) ? { ...row, PrintStt: 'Printed' } : row
      ));
      setSelectedRows(new Set());
      setConflictModalOpen(false);
      setConflictItems([]);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handlePrint = () => {
    const initialFoc = {} as Record<number, string>;
    data.filter(r => selectedRows.has(r.RecNo)).forEach(r => {
      initialFoc[r.RecNo] = r.FoC_ExYrds || '';
    });
    setFocMap(initialFoc);
    setPreviewModalOpen(true);
  };

  const toggleRow = useCallback((recNo: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(recNo) ? next.delete(recNo) : next.add(recNo);
      return next;
    });
  }, []);

  const handleConfirmConflicts = () => {
    const overrides = conflictItems.map(item => ({
      RecNo: item.RecNo,
      TargetBalance: Number(item.ShipLength) // Using ShipLength as the reset balance
    }));
    executePrint(overrides);
  };

  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const updateColFilter = React.useCallback((col: string, val: string) => { setColFilters(prev => ({ ...prev, [col]: val })); setPage(0); }, []);

  // Filter Data
  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(colFilters).filter(([, v]) => v);
    if (activeFilters.length === 0) return data;
    return data.filter(row => {
      for (const [key, val] of activeFilters) {
        const cellVal = String((row as any)[key] ?? '').toLowerCase();
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

  const pageData = useMemo(() => filteredData.slice(page * rowsPerPage, (page + 1) * rowsPerPage), [filteredData, page]);

  const { selectionSummary, removeCellSelection, getCellProps } = useExcelDragSelection({
    data: pageData
  });

  return (
    <Box sx={{ px: 1, py: 0.5, flex: 1, height: '100%', overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <FabricSearchFilter 
        fields={searchFields} 
        onSearch={handleSearch} 
        loading={loading} 
        onClear={() => { setData([]); setColumns([]); }}
        hideSearchButton={true}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {data.length > 0 && (
            <Chip
              label={`${t('issueFabric.total', 'Total')}: ${filteredData.length}${filteredData.length !== data.length ? ` / ${data.length}` : ''}`}
              size="small" sx={{ fontWeight: 700, bgcolor: '#e8f5e9', color: '#2e7d32' }}
            />
          )}
          <Button 
            variant="contained" 
            disableElevation
            size="small"
            startIcon={<PrintIcon />} 
            onClick={handlePrint}
            disabled={selectedRows.size === 0}
            sx={{ 
              fontWeight: 700, 
              borderRadius: 1.5,
              height: 32,
              fontSize: '0.8rem',
              px: 2,
              textTransform: 'none',
              bgcolor: selectedRows.size > 0 ? ACCENT : undefined,
              '&:hover': { bgcolor: '#1b5e20' }
            }}
          >
            {t('printQr.printBtn')} {selectedRows.size > 0 ? selectedRows.size : ''} QR
          </Button>
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
                  <Checkbox 
                    size="small"
                    checked={pageData.length > 0 && pageData.every(r => selectedRows.has(r.RecNo))}
                    indeterminate={pageData.some(r => selectedRows.has(r.RecNo)) && !pageData.every(r => selectedRows.has(r.RecNo))}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSelectedRows(prev => {
                        const next = new Set(prev);
                        pageData.forEach(r => checked ? next.add(r.RecNo) : next.delete(r.RecNo));
                        return next;
                      });
                    }}
                    sx={{ p: 0.3, '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: ACCENT } }}
                  />
                </TableCell>
                {columns.map(col => (
                  <TableCell key={col} sx={{ fontWeight: 700, bgcolor: '#f8fafc', whiteSpace: 'nowrap', borderBottom: '2px solid #e2e8f0', color: '#334155', letterSpacing: '0.02em' }}>
                    <ColumnFilter colKey={col} label={col} value={colFilters[col] || ''} onChange={updateColFilter} />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {pageData.map((row, idx) => (
                <DataRow 
                  key={row.RecNo || idx} 
                  row={row} 
                  idx={idx}
                  selected={selectedRows.has(row.RecNo)} 
                  onToggle={toggleRow} 
                  columns={columns} 
                  getCellProps={getCellProps}
                />
              ))}
              {data.length === 0 && !loading && (
                <TableRow><TableCell colSpan={Math.max(columns.length + 1, 1)} align="center" sx={{ py: 4, color: '#64748b' }}>{t('printQr.noData')}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {filteredData.length > 0 && (
          <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0' }}>
            <Pagination count={Math.ceil(filteredData.length / rowsPerPage)} page={page + 1} onChange={(_, v) => setPage(v - 1)} color="primary" />
          </Box>
        )}
      </Paper>

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

      {/* Print Preview Modal */}
      <Dialog open={previewModalOpen} onClose={() => setPreviewModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
          <PrintIcon /> {t('printQr.confirmList', 'Confirm Print List')} ({selectedRows.size} {t('printQr.labels', 'labels')})
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { fontSize: '11px', py: 0.5, px: 1 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Roll No</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>QR Code</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Ship Length</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Item</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Color</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Batch No</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>FoC_ExYrds</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', width: 40, textAlign: 'center' }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.filter(r => selectedRows.has(r.RecNo)).map((row, idx) => (
                  <TableRow key={row.RecNo || idx} hover>
                    <TableCell>{row.RollNo || ''}</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{row.QrCode || row.BarCode || ''}</TableCell>
                    <TableCell>{row.ShipLength || ''}</TableCell>
                    <TableCell>{row.RollItem || row.Item || ''}</TableCell>
                    <TableCell>{row.Color || ''}</TableCell>
                    <TableCell>{row.BatchNo || row.Lot || ''}</TableCell>
                    <TableCell>
                      <FocCell 
                        recNo={row.RecNo} 
                        initialValue={row.FoC_ExYrds || ''} 
                        onUpdate={(r, v) => setFocMap(prev => ({ ...prev, [r]: v }))} 
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => setSelectedRows(prev => {
                          const next = new Set(prev);
                          next.delete(row.RecNo);
                          if (next.size === 0) {
                            setPreviewModalOpen(false);
                          }
                          return next;
                        })}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
              {/* Print Mode Group */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, pr: 2, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <Typography sx={{ fontWeight: 700, color: '#475569', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 0.5, pl: 1 }}>
                  <PrintIcon sx={{ fontSize: 16, color: '#64748b' }} /> {t('printQr.printConfig', 'Print Config')}:
                </Typography>
                <RadioGroup row value={printMode} onChange={e => setPrintMode(e.target.value as any)}>
                  <FormControlLabel value="browser" control={<Radio size="small" />} label={<Typography sx={{ fontWeight: 600, fontSize: '13px' }}>{t('printQr.browserPrint', 'Browser Print')}</Typography>} sx={{ mr: 2, ml: 0 }} />
                  <FormControlLabel value="network" control={<Radio size="small" />} label={<Typography sx={{ fontWeight: 600, fontSize: '13px' }}>{t('printQr.networkPrint', 'Network Print (ZPL)')}</Typography>} />
                </RadioGroup>
              </Box>

              {/* Label Type Group */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, pr: 2, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <Typography sx={{ fontWeight: 700, color: '#475569', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 0.5, pl: 1 }}>
                  <PaletteIcon sx={{ fontSize: 16, color: '#64748b' }} /> Label Type:
                </Typography>
                <RadioGroup row value={labelFormat} onChange={e => setLabelFormat(e.target.value as any)}>
                  <FormControlLabel value="normal" control={<Radio size="small" color="primary" />} label={<Typography sx={{ fontWeight: 600, fontSize: '13px' }}>Normal</Typography>} sx={{ mr: 2, ml: 0 }} />
                  <FormControlLabel value="special" control={<Radio size="small" color="secondary" />} label={<Typography sx={{ fontWeight: 700, fontSize: '13px', color: '#9c27b0' }}>Special (Job/Issue)</Typography>} />
                </RadioGroup>
              </Box>
            </Box>

            {printMode === 'network' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, px: 2, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 2, width: 'fit-content' }}>
                <Typography sx={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>Printer IP:</Typography>
                <TextField 
                  size="small" 
                  placeholder={t('printQr.printerIp', 'e.g. 192.168.1.50')} 
                  value={printerIp} 
                  onChange={(e) => setPrinterIp(e.target.value)}
                  sx={{ width: 150, '& .MuiInputBase-input': { p: '4px 8px', fontSize: '13px', fontWeight: 600 } }}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={triggerBrowserPrint} sx={{ fontWeight: 600, color: '#3b82f6' }}>{t('printQr.previewDemo', 'Preview (Demo)')}</Button>
          <Box>
            <Button onClick={() => setPreviewModalOpen(false)} sx={{ color: '#64748b', fontWeight: 600 }}>{t('common.cancel', 'Cancel')}</Button>
            <Button onClick={() => { setPreviewModalOpen(false); executePrint([]); }} variant="contained" sx={{ fontWeight: 700, ml: 1, px: 3, bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}>
              {t('printQr.proceedPrint', 'Proceed Print')}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Conflict Resolution Modal */}
      <Dialog open={conflictModalOpen} onClose={() => setConflictModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#d97706', fontWeight: 800 }}>
          ⚠️ {t('printQr.warningEmpty', 'Warning: Empty Balance')}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, bgcolor: '#fffbf1' }}>
          <Typography variant="body2" sx={{ color: '#92400e', mb: 2, fontWeight: 500, lineHeight: 1.6 }}>
            {t('printQr.warningEmptyMsg', 'There are {{count}} rolls having balance 0. If you print them, the balance will be reset to ShipLength. You can adjust the new balance below.', { count: conflictItems.length })}
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
            <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { fontSize: '12px', py: 0.75, px: 1 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>QrCode</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Current Balance</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Original ShipLength</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>New Balance (Reset)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {conflictItems.map((item) => (
                  <TableRow key={item.RecNo}>
                    <TableCell>{item.QrCode}</TableCell>
                    <TableCell sx={{ color: 'red', fontWeight: 600 }}>{item.CurrentBalance}</TableCell>
                    <TableCell>{item.ShipLength}</TableCell>
                    <TableCell>
                      <TextField 
                        size="small" 
                        type="number"
                        value={item.ShipLength} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setConflictItems(prev => prev.map(p => p.RecNo === item.RecNo ? { ...p, ShipLength: val } : p));
                        }}
                        sx={{ width: 120 }}
                        inputProps={{ step: "0.1", min: "0" }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setConflictModalOpen(false)} sx={{ color: '#64748b', fontWeight: 600 }}>{t('common.cancel', 'Cancel')}</Button>
          <Button onClick={handleConfirmConflicts} variant="contained" color="warning" sx={{ fontWeight: 700, px: 3 }}>
            {t('printQr.confirmAndPrint', 'Confirm & Print')}
          </Button>
        </DialogActions>
      </Dialog>

      <Box id="qr-print-area" sx={{ display: 'none' }}>
        {data.filter(r => selectedRows.has(r.RecNo)).map(row => {
          const yds = focMap[row.RecNo] ?? row.FoC_ExYrds ?? row.ShipLength ?? '';
          return (
            <div key={row.RecNo} className="sticker-label">
              <div className="fields-col">
                <div className="field-text">{labelFormat === 'special' ? 'PO/Job:' : 'PO:'} <span className="field-large">{row.OrderNumber || ''}</span></div>
                <div className="field-text wrap">Item: {row.RollItem || row.Item || ''}</div>
                <div className="field-text wrap">Color: {row.Color || ''}</div>
                <div className="field-group">
                  <div className="field-text">Roll: <span className="field-large">{row.RollNo || ''}</span></div>
                  <div className="field-text">{labelFormat === 'special' ? 'Inv:' : 'Lot:'} {labelFormat === 'special' ? (row.InvoiceNo || row.Invoice || '') : (row.Lot || row.BatchNo || '')}</div>
                </div>
                <div className="field-group">
                  <div className="field-text">Yds: <span className="field-large">{yds}</span></div>
                  <div className="field-text">NW: {row.NW || ''}</div>
                  {labelFormat === 'special' && <div className="field-text">GW: {row.GW || ''}</div>}
                </div>
                <div className="field-inv">{labelFormat === 'special' ? 'Size-Qty:' : 'Inv:'} {labelFormat === 'special' ? (row.Remark2 || row.Note || '') : (row.InvoiceNo || row.Invoice || '')}</div>
              </div>
              <div className="qr-col">
                <QRCodeSVG value={String(row.QrCode || row.BarCode || '')} size={85} level="M" />
                {(row.Qc && String(row.Qc).trim() !== '') && (
                  <div className="qc-label">QC {String(row.Qc).replace(/\*/g, '').replace(/^QC\s?/i, '').trim()}</div>
                )}
              </div>
            </div>
          );
        })}
      </Box>
    </Box>
  );
}

