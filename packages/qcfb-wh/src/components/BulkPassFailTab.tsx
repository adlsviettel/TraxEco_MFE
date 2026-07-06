import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Chip, Pagination, Select, MenuItem,
  Snackbar, Alert, Popover, IconButton, Badge,
  Checkbox, Slide, Divider, Skeleton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import { useToast } from '@traxeco/shared';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';

// --- Excel Filter Components ---
const EMPTY_OPTIONS: readonly string[] = [];
const ACCENT = '#2e7d32';

const FilterOption = React.memo(({ opt, isSelected, onToggle }: { opt: string; isSelected: boolean; onToggle: (o: string) => void }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.75, borderRadius: 1, mx: 0.5, '&:hover': { bgcolor: '#f1f5f9' }, transition: 'background-color 0.2s' }}>
    <Checkbox size="small" sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 18 } }} checked={isSelected} onChange={() => onToggle(opt)} />
    <Typography variant="body2" sx={{ ml: 1, fontSize: '0.85rem', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => onToggle(opt)} style={{ cursor: 'pointer', flex: 1 }}>
      {opt === '' ? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>(Blanks)</span> : opt}
    </Typography>
  </Box>
));

const ColumnFilter = React.memo(({ colKey, label, options, value, onChange }: { colKey: string; label: string; options: string[]; value: string; onChange: (k: string, v: string) => void }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const active = !!value;

  const [searchText, setSearchText] = useState('');
  const [selectedLocal, setSelectedLocal] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (anchorEl) {
      setSearchText('');
      const vals = value ? value.split('||').map(s => s.trim()).filter(Boolean) : [];
      setSelectedLocal(new Set(vals));
    }
  }, [anchorEl, value]);

  const displayOptions = useMemo(() => {
    if (!searchText) return options;
    return options.filter(o => o.toLowerCase().includes(searchText.toLowerCase()));
  }, [options, searchText]);

  const isAllSelected = displayOptions.length > 0 && displayOptions.every(o => selectedLocal.has(o));
  const isIndeterminate = !isAllSelected && displayOptions.some(o => selectedLocal.has(o));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = new Set(selectedLocal);
    if (e.target.checked) displayOptions.forEach(o => next.add(o));
    else displayOptions.forEach(o => next.delete(o));
    setSelectedLocal(next);
  };

  const handleToggle = React.useCallback((opt: string) => {
    setSelectedLocal(prev => {
      const next = new Set(prev);
      if (next.has(opt)) next.delete(opt);
      else next.add(opt);
      return next;
    });
  }, []);

  const handleApply = () => {
    onChange(colKey, Array.from(selectedLocal).join('||'));
    setAnchorEl(null);
  };

  const handleClear = () => {
    onChange(colKey, '');
    setAnchorEl(null);
  };

  return (
    <>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.85rem', color: active ? ACCENT : '#475569', lineHeight: 1.2 }}>{label}</Typography>
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.35, color: active ? ACCENT : '#cbd5e1', '&:hover': { color: ACCENT, backgroundColor: '#e8f5e9' } }}>
          <Badge variant="dot" invisible={!active} color="success" sx={{ '& .MuiBadge-badge': { minWidth: 6, height: 6, p: 0 } }}>
            <FilterListIcon sx={{ fontSize: 16 }} />
          </Badge>
        </IconButton>
      </Box>
      <Popover
        open={!!anchorEl} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { borderRadius: 3, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)', width: 280, display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0' } } }}
      >
        <Box sx={{ p: 1.5, borderBottom: '1px solid #f1f5f9', bgcolor: '#f8fafc' }}>
          <TextField
            fullWidth size="small" placeholder="Search..." value={searchText} onChange={(e) => setSearchText(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 18, color: '#94a3b8', mr: 1 }} /> }}
            sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.85rem', borderRadius: 2, bgcolor: '#fff', '& fieldset': { borderColor: '#e2e8f0' }, '&:hover fieldset': { borderColor: '#cbd5e1' } } }}
          />
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', maxHeight: 280, py: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.75, mx: 0.5, borderRadius: 1, '&:hover': { bgcolor: '#f1f5f9' }, transition: 'background-color 0.2s', mb: 0.5, borderBottom: '1px solid #f1f5f9' }}>
            <Checkbox size="small" sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 18 } }} checked={isAllSelected} indeterminate={isIndeterminate} onChange={handleSelectAll} />
            <Typography variant="body2" sx={{ ml: 1, fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }} onClick={() => handleSelectAll({ target: { checked: !isAllSelected } } as any)} style={{ cursor: 'pointer', flex: 1 }}>(Select All)</Typography>
          </Box>
          {displayOptions.slice(0, 300).map(opt => (
            <FilterOption key={opt} opt={opt} isSelected={selectedLocal.has(opt)} onToggle={handleToggle} />
          ))}
          {displayOptions.length > 300 && (
            <Typography variant="caption" sx={{ p: 1, color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' }}>
              Showing 300 of {displayOptions.length} items. Please use search.
            </Typography>
          )}
        </Box>
        <Box sx={{ p: 1.5, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', bgcolor: '#f8fafc' }}>
          <Button size="small" onClick={handleClear} sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600, '&:hover': { bgcolor: '#f1f5f9' } }}>Clear Filter</Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" color="inherit" onClick={() => setAnchorEl(null)} sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}>Cancel</Button>
            <Button size="small" variant="contained" color="success" onClick={handleApply} sx={{ textTransform: 'none', boxShadow: 'none', borderRadius: 2, px: 2, fontWeight: 700 }}>OK</Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
});

const MemoMasterRow = React.memo(({ row, index, isActive, onClick }: any) => (
  <TableRow 
    hover 
    selected={isActive}
    onClick={() => onClick(row)}
    sx={{ cursor: 'pointer', '&.Mui-selected': { bgcolor: 'rgba(46, 125, 50, 0.12)' }, '&.Mui-selected:hover': { bgcolor: 'rgba(46, 125, 50, 0.18)' } }}
  >
    <TableCell>{index}</TableCell>
    <TableCell>{row.SupCode}</TableCell>
    <TableCell>{row.InvoiceNo}</TableCell>
    <TableCell>{row.OrderNumber}</TableCell>
    <TableCell>{row.RollItem}</TableCell>
    <TableCell>{row.Color}</TableCell>
    <TableCell sx={{ fontWeight: 700 }}>{row.TotalQtyRoll}</TableCell>
    <TableCell sx={{ fontWeight: 700, color: '#3b82f6' }}>{row.TotalQtyYrds != null ? Number(row.TotalQtyYrds).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}</TableCell>
  </TableRow>
));

const MemoDetailRow = React.memo(({ r, isSelected, onClick }: any) => (
  <TableRow hover selected={isSelected} onClick={() => onClick(r.QrCode || r.RollNo)} sx={{ cursor: 'pointer', '&.Mui-selected': { bgcolor: 'rgba(46, 125, 50, 0.08)' } }}>
    <TableCell padding="checkbox">
      <Checkbox size="small" color="success" checked={isSelected} />
    </TableCell>
    <TableCell>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 28, height: 24, px: 1.5, bgcolor: '#f1f5f9', color: '#0f172a', fontWeight: 800, borderRadius: 1, fontSize: '0.75rem', border: '1px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        {r.RollNo}
      </Box>
    </TableCell>
    <TableCell>{r.BatchNo || '-'}</TableCell>
    <TableCell>{r.Width || '-'}</TableCell>
    <TableCell>{r.ShipLength || '-'}</TableCell>
    <TableCell>{r.InsptLenght || '-'}</TableCell>
    <TableCell>
      {r.InsptReslt ? (() => {
        const res = r.InsptReslt.toLowerCase().trim();
        const isPass = res === 'pass' || res === 'p' || res === 'a' || res === 'ok';
        const isFail = res === 'fail' || res === 'f' || res === 'reject';
        return (
          <Chip size="small" icon={isPass ? <CheckCircleIcon /> : <WarningIcon />} label={r.InsptReslt} color={isPass ? 'success' : isFail ? 'error' : 'warning'} variant="outlined" sx={{ fontWeight: 600, px: 0.5, height: 22 }} />
        );
      })() : '-'}
    </TableCell>
  </TableRow>
));

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export default function BulkPassFailTab() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  // --- MASTER STATE ---
  const [invoiceNo, setInvoiceNo] = useState('');
  const [poNo, setPoNo] = useState('');
  const [itemNo, setItemNo] = useState('');
  const [color, setColor] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const [masterData, setMasterData] = useState<any[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterColFilters, setMasterColFilters] = useState<Record<string, string>>({});
  
  const [activeMasterRow, setActiveMasterRow] = useState<any>(null);
  
  const [masterPage, setMasterPage] = useState(0);
  const [masterRowsPerPage, setMasterRowsPerPage] = useState(50);

  // --- DETAIL STATE ---
  const [detailData, setDetailData] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedRollIds, setSelectedRollIds] = useState<Set<string>>(new Set());
  
  const [detailPage, setDetailPage] = useState(0);
  const [detailRowsPerPage, setDetailRowsPerPage] = useState(50);
  
  // Action Bar
  const [actionGroup, setActionGroup] = useState('');
  const [actionRemark, setActionRemark] = useState('');

  const updateMasterColFilter = React.useCallback((col: string, val: string) => { setMasterColFilters(prev => ({ ...prev, [col]: val })); setMasterPage(0); }, []);

  // Filter Master Data
  const filteredMasterData = useMemo(() => {
    const activeFilters = Object.entries(masterColFilters).filter(([, v]) => v);
    if (activeFilters.length === 0) return masterData;
    return masterData.filter(row => {
      for (const [key, val] of activeFilters) {
        const cellVal = String((row as any)[key] ?? '').toLowerCase();
        const tokens = val.split('||').map(t => t.trim().toLowerCase()).filter(t => t);
        if (tokens.length > 0) {
          if (!tokens.some(t => cellVal === t)) return false;
        }
      }
      return true;
    });
  }, [masterData, masterColFilters]);

  const masterColOptions = useMemo(() => {
    const opts: Record<string, string[]> = {};
    const cols = ['SupCode', 'InvoiceNo', 'OrderNumber', 'RollItem', 'Color'];
    for (const key of cols) {
      opts[key] = Array.from(new Set(masterData.map(r => String((r as any)[key] ?? '')))).filter(Boolean).sort();
    }
    return opts;
  }, [masterData]);

  const paginatedMasterData = useMemo(() => {
    return filteredMasterData.slice(masterPage * masterRowsPerPage, masterPage * masterRowsPerPage + masterRowsPerPage);
  }, [filteredMasterData, masterPage, masterRowsPerPage]);

  const paginatedDetailData = useMemo(() => {
    return detailData.slice(detailPage * detailRowsPerPage, detailPage * detailRowsPerPage + detailRowsPerPage);
  }, [detailData, detailPage, detailRowsPerPage]);

  const handleSearchMaster = async () => {
    setMasterLoading(true);
    setActiveMasterRow(null);
    setDetailData([]);
    setSelectedRollIds(new Set());
    
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (invoiceNo.trim()) params.append('invoiceNo', invoiceNo.trim());
      if (poNo.trim()) params.append('poNo', poNo.trim());
      if (itemNo.trim()) params.append('itemNo', itemNo.trim());
      if (color.trim()) params.append('color', color.trim());

      const res = await fetch(`${API_BASE}/qcfb/packing-list-summary?${params.toString()}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const result = await res.json();
      
      setMasterData(result);
      setMasterPage(0);
      if (result.length > 0) {
        showToast(t('qcfb.loadSuccess', 'Tải thành công {{count}} dòng', { count: result.length }), 'success');
      } else {
        showToast(t('qcfb.noDataFound', 'Không tìm thấy dữ liệu!'), 'warning');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setMasterLoading(false);
    }
  };

  const fetchDetail = React.useCallback(async (row: any) => {
    setActiveMasterRow(row);
    setDetailLoading(true);
    setSelectedRollIds(new Set());
    setDetailPage(0);
    
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE}/qcfb/packing-list-detail?invoiceNo=${encodeURIComponent(row.InvoiceNo || '')}&supCode=${encodeURIComponent(row.SupCode || '')}&orderNumber=${encodeURIComponent(row.OrderNumber || '')}&color=${encodeURIComponent(row.Color || '')}&rollItem=${encodeURIComponent(row.RollItem || '')}`;
      
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`${t('history.error', 'HTTP Error')} ${res.status}`);
      
      const data = await res.json();
      if (data.rolls && Array.isArray(data.rolls)) {
        data.rolls.sort((a: any, b: any) => {
          const valA = String(a.RollNo || a.QrCode || '');
          const valB = String(b.RollNo || b.QrCode || '');
          return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
        });
        setDetailData(data.rolls);
      } else {
        setDetailData([]);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  }, [showToast, t]);

  const handleSelectAllRolls = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allIds = new Set(detailData.map(r => r.QrCode || r.RollNo));
      setSelectedRollIds(allIds);
    } else {
      setSelectedRollIds(new Set());
    }
  };

  const handleSelectRoll = React.useCallback((id: string) => {
    setSelectedRollIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkAction = async (status: 'P' | 'H' | 'F') => {
    if (selectedRollIds.size === 0 || !activeMasterRow) return;
    
    // Map selected IDs back to roll objects
    const items = detailData
      .filter(r => selectedRollIds.has(r.QrCode || r.RollNo))
      .map(r => ({
        qrCode: r.QrCode || '',
        batchNo: r.BatchNo || '',
        rollItem: activeMasterRow.RollItem || '',
        rollNo: r.RollNo || '',
        shipLength: String(r.ShipLength || '0')
      }));
    const statusText = status === 'P' ? 'Pass' : status === 'H' ? 'Hold' : 'Fail';
    
    try {
      setDetailLoading(true);
      const token = localStorage.getItem('token');
      const url = `${API_BASE}/qcfb/pass-fail`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, group: actionGroup, remark: actionRemark, items })
      });
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

      showToast(t('qcfb.saveSuccess', 'Cập nhật thành công!'), 'success');
      
      setSelectedRollIds(new Set());
      setActionGroup('');
      setActionRemark('');
      
      // Reload Detail Grid to see new status
      await fetchDetail(activeMasterRow);
    } catch (e: any) {
      showToast(`Lỗi khi lưu trạng thái ${statusText}: ${e.message}`, 'error');
      setDetailLoading(false);
    }
  };

  return (
    <Box sx={{ px: 1, py: 0.5, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%', minHeight: 0 }}>
      {/* FILTER SECTION */}
      <Paper elevation={0} sx={{ flexShrink: 0, p: 1.5, borderRadius: 2, border: '1px solid #e0e0e0', background: 'linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%)' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          <Button disabled={masterLoading} variant="contained" size="small" disableElevation onClick={handleSearchMaster}
            startIcon={!masterLoading ? <SearchIcon sx={{ fontSize: '18px !important' }} /> : undefined}
            sx={{ flexShrink: 0, borderRadius: 1.5, fontWeight: 700, height: 32, fontSize: '0.8rem', px: 2.5, textTransform: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: 'none', '&:hover': { background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' } }}>
            {masterLoading ? <CircularProgress size={24} color="inherit" /> : 'Search'}
          </Button>

          <Button variant="outlined" size="small" startIcon={<FilterListIcon />} onClick={() => setShowFilters(!showFilters)}
            sx={{ borderRadius: 1.5, fontWeight: 600, px: 2, height: 32, fontSize: '0.8rem', borderColor: '#e0e0e0', color: '#475569', '&:hover': { borderColor: '#cbd5e1', backgroundColor: '#f8fafc' }, textTransform: 'none' }}>
            Lọc thêm
          </Button>
          
          {(invoiceNo || poNo || itemNo || color) && !showFilters && (
            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600, fontStyle: 'italic' }}>
              *Đang áp dụng bộ lọc
            </Typography>
          )}
        </Box>
        
        {/* HIDDEN FILTERS */}
        <Slide direction="down" in={showFilters} mountOnEnter unmountOnExit>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5, p: 1.5, backgroundColor: '#fff', borderRadius: 1.5, border: '1px dashed #cbd5e1' }}>
            <TextField size="small" placeholder="Invoice No" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchMaster()} 
              InputProps={{ startAdornment: <Typography sx={{color:'#94a3b8', mr:1, fontSize:'0.8rem', fontWeight:600}}>INV</Typography> }}
              sx={{ flex: '1 1 150px', '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem', bgcolor: '#f8fafc' } }} 
            />
            <TextField size="small" placeholder="PO Number" value={poNo} onChange={e => setPoNo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchMaster()} 
              InputProps={{ startAdornment: <Typography sx={{color:'#94a3b8', mr:1, fontSize:'0.8rem', fontWeight:600}}>PO#</Typography> }}
              sx={{ flex: '1 1 150px', '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem', bgcolor: '#f8fafc' } }} 
            />
            <TextField size="small" placeholder="Item No" value={itemNo} onChange={e => setItemNo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchMaster()} 
              InputProps={{ startAdornment: <Typography sx={{color:'#94a3b8', mr:1, fontSize:'0.8rem', fontWeight:600}}>ITM</Typography> }}
              sx={{ flex: '1 1 150px', '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem', bgcolor: '#f8fafc' } }} 
            />
            <TextField size="small" placeholder="Color" value={color} onChange={e => setColor(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchMaster()} 
              InputProps={{ startAdornment: <Typography sx={{color:'#94a3b8', mr:1, fontSize:'0.8rem', fontWeight:600}}>CLR</Typography> }}
              sx={{ flex: '1 1 150px', '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 32, fontSize: '0.8rem', bgcolor: '#f8fafc' } }} 
            />
          </Box>
        </Slide>
      </Paper>

      {/* TWO GRIDS SPLIT */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: 0 }}>
        
        {/* TOP GRID: MASTER */}
        <Paper elevation={0} sx={{ flex: 1, minHeight: 200, display: 'flex', flexDirection: 'column', borderRadius: 2, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
          <Box sx={{ p: 1.5, borderBottom: '1px solid #e0e0e0', bgcolor: '#f8fafc' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>Danh sách Hóa Đơn / PO (Master)</Typography>
          </Box>
          <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
            <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { fontSize: '12px', py: 1, px: 1.5, borderBottom: '1px solid #f1f5f9' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>#</TableCell>
                  {[
                    { key: 'SupCode', label: 'Supplier' },
                    { key: 'InvoiceNo', label: 'Invoice' },
                    { key: 'OrderNumber', label: 'PO#' },
                    { key: 'RollItem', label: 'Item' },
                    { key: 'Color', label: 'Color' }
                  ].map(col => (
                    <TableCell key={col.key} sx={{ fontWeight: 800, bgcolor: '#f8fafc', whiteSpace: 'nowrap', borderBottom: '2px solid #e2e8f0' }}>
                      <ColumnFilter colKey={col.key} label={col.label} options={masterColOptions[col.key] || EMPTY_OPTIONS} value={masterColFilters[col.key] || ''} onChange={updateMasterColFilter} />
                    </TableCell>
                  ))}
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>TOTAL ROLLS</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>TOTAL YARDS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {masterLoading ? (
                  Array.from(new Array(5)).map((_, idx) => (
                    <TableRow key={`skeleton-${idx}`}>
                      <TableCell><Skeleton animation="wave" height={24} width={20} /></TableCell>
                      <TableCell><Skeleton animation="wave" height={24} /></TableCell>
                      <TableCell><Skeleton animation="wave" height={24} /></TableCell>
                      <TableCell><Skeleton animation="wave" height={24} /></TableCell>
                      <TableCell><Skeleton animation="wave" height={24} /></TableCell>
                      <TableCell><Skeleton animation="wave" height={24} /></TableCell>
                      <TableCell><Skeleton animation="wave" height={24} width={40} /></TableCell>
                      <TableCell><Skeleton animation="wave" height={24} width={50} /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  paginatedMasterData.map((row, idx) => (
                    <MemoMasterRow
                      key={idx}
                      row={row}
                      index={masterPage * masterRowsPerPage + idx + 1}
                      isActive={activeMasterRow === row}
                      onClick={fetchDetail}
                    />
                  ))
                )}
                {!masterLoading && filteredMasterData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3, color: '#94a3b8' }}>Chưa có dữ liệu. Vui lòng Search.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', bgcolor: '#fff', p: 1, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>Dòng / trang:</Typography>
              <Select size="small" value={masterRowsPerPage} onChange={(e) => { setMasterRowsPerPage(Number(e.target.value)); setMasterPage(0); }} sx={{ height: 28, fontSize: '0.8rem' }}>
                {[25, 50, 100, 200, 500].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </Select>
              <Typography variant="body2" sx={{ color: '#64748b', ml: 1 }}>
                {filteredMasterData.length > 0 ? masterPage * masterRowsPerPage + 1 : 0}-{Math.min((masterPage + 1) * masterRowsPerPage, filteredMasterData.length)} / {filteredMasterData.length}
              </Typography>
            </Box>
            <Pagination
              count={Math.ceil(filteredMasterData.length / masterRowsPerPage) || 1}
              page={masterPage + 1}
              onChange={(_, newPage) => setMasterPage(newPage - 1)}
              shape="rounded" size="small"
              sx={{ '& .MuiPaginationItem-root.Mui-selected': { bgcolor: '#2e7d32', color: '#fff', '&:hover': { bgcolor: '#1b5e20' } } }}
            />
          </Box>
        </Paper>

        {/* BOTTOM GRID: DETAIL */}
        <Paper elevation={0} sx={{ flex: 1, minHeight: 250, display: 'flex', flexDirection: 'column', borderRadius: 2, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
          <Box sx={{ p: 1.5, borderBottom: '1px solid #e0e0e0', bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
              Danh sách Cuộn (Rolls Detail) {activeMasterRow ? `- ${activeMasterRow.InvoiceNo} / ${activeMasterRow.OrderNumber}` : ''}
            </Typography>
            <Chip size="small" label={`${detailData.length} Rolls`} sx={{ bgcolor: '#e2e8f0', color: '#475569', fontWeight: 600 }} />
          </Box>
          <TableContainer sx={{ flexGrow: 1, overflow: 'auto', position: 'relative' }}>
            <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { fontSize: '12px', py: 0.75, px: 1.5, borderBottom: '1px solid #f1f5f9' } }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <Checkbox 
                      size="small" color="success"
                      checked={detailData.length > 0 && selectedRollIds.size === detailData.length}
                      indeterminate={selectedRollIds.size > 0 && selectedRollIds.size < detailData.length}
                      onChange={handleSelectAllRolls}
                      disabled={detailData.length === 0 || detailLoading}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Roll No</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Batch No</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Width</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Ship Len</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>QC Len</TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>QC Result</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detailLoading ? (
                  Array.from(new Array(5)).map((_, idx) => (
                    <TableRow key={`skeleton-detail-${idx}`}>
                      <TableCell padding="checkbox"><Skeleton animation="wave" variant="rectangular" width={18} height={18} sx={{ m: 1, borderRadius: 0.5 }} /></TableCell>
                      <TableCell><Skeleton animation="wave" height={24} width={60} /></TableCell>
                      <TableCell><Skeleton animation="wave" height={24} /></TableCell>
                      <TableCell><Skeleton animation="wave" height={24} width={40} /></TableCell>
                      <TableCell><Skeleton animation="wave" height={24} width={50} /></TableCell>
                      <TableCell><Skeleton animation="wave" height={24} width={50} /></TableCell>
                      <TableCell><Skeleton animation="wave" variant="rounded" height={22} width={70} /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  paginatedDetailData.map((r, i) => (
                    <MemoDetailRow
                      key={i}
                      r={r}
                      isSelected={selectedRollIds.has(r.QrCode || r.RollNo)}
                      onClick={handleSelectRoll}
                    />
                  ))
                )}
                {!detailLoading && detailData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                      {activeMasterRow ? 'Không có chi tiết cuộn nào.' : 'Vui lòng chọn 1 dòng ở bảng trên để xem chi tiết.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', bgcolor: '#fff', p: 1, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>Dòng / trang:</Typography>
              <Select size="small" value={detailRowsPerPage} onChange={(e) => { setDetailRowsPerPage(Number(e.target.value)); setDetailPage(0); }} sx={{ height: 28, fontSize: '0.8rem' }}>
                {[25, 50, 100, 200, 500].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </Select>
              <Typography variant="body2" sx={{ color: '#64748b', ml: 1 }}>
                {detailData.length > 0 ? detailPage * detailRowsPerPage + 1 : 0}-{Math.min((detailPage + 1) * detailRowsPerPage, detailData.length)} / {detailData.length}
              </Typography>
            </Box>
            <Pagination
              count={Math.ceil(detailData.length / detailRowsPerPage) || 1}
              page={detailPage + 1}
              onChange={(_, newPage) => setDetailPage(newPage - 1)}
              shape="rounded" size="small"
              sx={{ '& .MuiPaginationItem-root.Mui-selected': { bgcolor: '#2e7d32', color: '#fff', '&:hover': { bgcolor: '#1b5e20' } } }}
            />
          </Box>
        </Paper>
      </Box>

      {/* Sticky Action Bar */}
      <Slide direction="up" in={selectedRollIds.size > 0} mountOnEnter unmountOnExit>
        <Paper elevation={4} sx={{
          position: 'fixed', bottom: 20, left: { xs: 20, sm: 'auto' }, right: { xs: 20, sm: 20 }, width: { xs: 'auto', sm: 600 },
          p: 2, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 1.5, zIndex: 1000,
          border: '1px solid #10b981', backgroundColor: '#f0fdf4'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#166534' }}>
              Đã chọn {selectedRollIds.size} cuộn vải
            </Typography>
            <Button size="small" variant="text" color="success" onClick={() => setSelectedRollIds(new Set())}>Bỏ chọn</Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField 
              size="small" label="Nhóm (Group)" variant="outlined" 
              value={actionGroup} onChange={e => setActionGroup(e.target.value)}
              sx={{ flex: 1, minWidth: 120, backgroundColor: '#fff', borderRadius: 1 }}
            />
            <TextField 
              size="small" label="Ghi chú (Remark)" variant="outlined" 
              value={actionRemark} onChange={e => setActionRemark(e.target.value)}
              sx={{ flex: 2, minWidth: 200, backgroundColor: '#fff', borderRadius: 1 }}
            />
          </Box>
          <Divider sx={{ my: 0.5, borderColor: 'rgba(22, 101, 52, 0.2)' }} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
            <Button variant="contained" color="success" onClick={() => handleBulkAction('P')} sx={{ minWidth: 100, fontWeight: 700 }}>Pass</Button>
            <Button variant="contained" color="warning" onClick={() => handleBulkAction('H')} sx={{ minWidth: 100, fontWeight: 700, color: '#fff' }}>Hold</Button>
            <Button variant="contained" color="error" onClick={() => handleBulkAction('F')} sx={{ minWidth: 100, fontWeight: 700 }}>Fail</Button>
          </Box>
        </Paper>
      </Slide>

    </Box>
  );
}
