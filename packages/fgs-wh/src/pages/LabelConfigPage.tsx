import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, CircularProgress, Alert, Pagination, Tooltip, Stack, Autocomplete
} from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Refresh as RefreshIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import { ConfirmDialog, defaultConfirmDialog, authFetch } from '@traxeco/shared';
import type { ConfirmDialogState } from '@traxeco/shared';
import { customerService, type Customer } from '../services/customerService';
import Carton3DPreview from '../components/Carton3DPreview';

// API_BASE_URL is handled automatically by authFetch
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

interface LabelConfig {
  recNo?: number;
  shippingMarkId?: number;
  custNo: string;
  ctnL: string;
  ctnW: string;
  ctnH: string;
  posX: number;
  posY: number;
  area: string;
  shipDest: string;
  customer: string;
  sealMethod: string;
  ext1: string;
  ext2: string;
  ext3: string;
}


const InlineEditCell = ({ value, onSave }: { value: number, onSave: (val: number) => void }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [val, setVal] = React.useState(value);

  React.useEffect(() => { setVal(value); }, [value]);

  if (isEditing) {
    return (
      <TextField
        size="small"
        type="number"
        autoFocus
        value={val}
        onChange={e => setVal(parseFloat(e.target.value) || 0)}
        onBlur={() => { setIsEditing(false); if (val !== value) onSave(val); }}
        onKeyDown={e => { if (e.key === 'Enter') { setIsEditing(false); if (val !== value) onSave(val); } }}
        sx={{ width: 60, '& .MuiInputBase-input': { p: '2px 4px', fontSize: '0.85rem', textAlign: 'center' } }}
      />
    );
  }
  return (
    <Box 
      onClick={() => setIsEditing(true)} 
      sx={{ cursor: 'pointer', borderBottom: '1px dashed #2196f3', color: '#1976d2', fontWeight: 600, display: 'inline-block', minWidth: 24, textAlign: 'center' }}
    >
      {value}
    </Box>
  );
};

const LocalSearchInput = ({ onSearch }: { onSearch: (val: string) => void }) => {
  const [val, setVal] = React.useState('');
  return (
    <TextField 
      size="small" 
      placeholder="Tìm kiếm rồi bấm Enter..." 
      value={val}
      onChange={(e) => {
        setVal(e.target.value);
        if (e.target.value === '') {
          onSearch('');
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onSearch(val);
        }
      }}
      sx={{ width: 300, bgcolor: '#fff' }}
    />
  );
};

export default function LabelConfigPage() {
  const filterOptions = createFilterOptions({
    limit: 50,
    stringify: (option: any) => option.shippingMarkId === 0 ? option.shippingMarkPicture : `${option.shippingMarkId} - ${option.shippingMarkPicture}`
  });

  const [configs, setConfigs] = useState<LabelConfig[]>([]);
  const [shippingMarks, setShippingMarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Dialog State
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [deletedMarks, setDeletedMarks] = useState<number[]>([]);
  const [poSearch, setPoSearch] = useState('');
  const [poLoading, setPoLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  const [preview3DOpen, setPreview3DOpen] = useState(false);

  

  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [fetchedDimensions, setFetchedDimensions] = useState<{l: string, w: string, h: string}[]>([]);
  
  const [commonData, setCommonData] = useState({
    custNo: '', customer: '', shipDest: '',
    ext1: '', ext2: '', ext3: '', ctnL: '', ctnW: '', ctnH: ''
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [marksData, setMarksData] = useState<any[]>([
    { id: Date.now(), shippingMarkId: 0, area: 'A', sealMethod: 'H', posX: 0, posY: 0 }
  ]);

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(defaultConfirmDialog);

  const fetchConfigs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`/v2/label-config`);
      const data = await res.json();
      if (data.code === 200) {
        // Có thể sort theo ngày tạo mới nhất (desc) hoặc ID giảm dần để dễ xem data vừa thêm
        const sorted = (data.data || []).sort((a: any, b: any) => (b.recNo || 0) - (a.recNo || 0));
        setConfigs(sorted);
        setPage(0); // Reset về trang đầu sau khi fetch
      } else {
        setError(data.msg || 'Failed to fetch data');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchShippingMarks = async () => {
    try {
      const res = await authFetch(`/v2/label-config/shipping-marks`);
      const data = await res.json();
      if (data.code === 200 || data.success) {
        setShippingMarks(data.data || []);
      } else {
        setShippingMarks([]);
      }
    } catch (err) {
      console.error('Failed to fetch shipping marks', err);
      setShippingMarks([]);
    }
  };

  useEffect(() => {
    fetchConfigs();
    fetchShippingMarks();
    customerService.getAll().then(data => setCustomers(data || [])).catch(err => {
      console.error('Failed to load customers', err);
      setCustomers([]);
    });
  }, []);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  interface GroupedLabelConfig {
    id: string;
    custNo: string;
    customer: string;
    shipDest: string;
    ctnL: string;
    ctnW: string;
    ctnH: string;
    marks: LabelConfig[];
  }

  const handleOpenDialogGroup = (group: GroupedLabelConfig, isCopy: boolean = false) => {
    setPoSearch('');
    setDuplicateWarning(false);
    setFetchedDimensions([]);
    setDeletedMarks([]);
    setEditingId(isCopy ? undefined : 1);
    setCommonData({
      custNo: group.custNo,
      ctnL: group.ctnL,
      ctnW: group.ctnW,
      ctnH: group.ctnH,
      shipDest: group.shipDest,
      customer: group.customer,
      ext1: '', ext2: '', ext3: ''
    });
    setMarksData(group.marks.map(m => ({
      id: Date.now() + Math.random(),
      recNo: isCopy ? undefined : m.recNo,
      shippingMarkId: m.shippingMarkId || 0,
      area: m.area || 'A',
      sealMethod: m.sealMethod || 'H',
      posX: m.posX || 0,
      posY: m.posY || 0
    })));
    setOpen(true);
  };

  const handleOpenDialog = () => {
    setPoSearch('');
    setDuplicateWarning(false);
    setFetchedDimensions([]);
    setDeletedMarks([]);
    setEditingId(undefined);
    setCommonData({
      custNo: '', ctnL: '', ctnW: '', ctnH: '', shipDest: '', customer: '', ext1: '', ext2: '', ext3: ''
    });
    setMarksData([{
      id: Date.now(), shippingMarkId: 0, area: 'A', sealMethod: 'H', posX: 0, posY: 0
    }]);
    setOpen(true);
  };

  const handleDeleteGroup = (group: GroupedLabelConfig) => {
    setConfirmDialog({
      open: true,
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa toàn bộ các Shipping Mark của cấu hình này không?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setLoading(true);
          for (const m of group.marks) {
             if (m.recNo) await authFetch(`/v2/label-config/${m.recNo}`, { method: 'DELETE' });
          }
          fetchConfigs();
        } catch (err: any) {
          setError('Xóa thất bại');
        } finally {
          setLoading(false);
          setConfirmDialog(p => ({ ...p, open: false }));
        }
      }
    });
  };

  const handleCloseDialog = () => {
    setOpen(false);
  };


  const handleFetchPO = async () => {
    if (!poSearch.trim()) {
      setError('Vui lòng nhập mã PO');
      return;
    }
    setPoLoading(true);
    setError('');
    try {
      const res = await authFetch(`/v2/label-config/po-config-info/${encodeURIComponent(poSearch.trim())}`);
      const data = await res.json();
      if (data.success && data.data) {
        let dims = data.data.dimensions || [];
        // Support old API response format if needed
        if (dims.length === 0 && data.data.ctnL) {
          dims = [{ ctnL: data.data.ctnL, ctnW: data.data.ctnW, ctnH: data.data.ctnH }];
        }
        
        const parsedDims = dims.map((d: any) => ({
          l: d.ctnL ? Math.round(parseFloat(d.ctnL) * 1000).toString() : '',
          w: d.ctnW ? Math.round(parseFloat(d.ctnW) * 1000).toString() : '',
          h: d.ctnH ? Math.round(parseFloat(d.ctnH) * 1000).toString() : ''
        })).filter((d: any) => d.l && d.w && d.h);

        setFetchedDimensions(parsedDims);

        const newCustNo = data.data.label || commonData.custNo;
        const newShipDest = data.data.shipDest || commonData.shipDest;
        
        // Show first dimension in commonData
        const firstL = parsedDims.length > 0 ? parsedDims[0].l : commonData.ctnL;
        const firstW = parsedDims.length > 0 ? parsedDims[0].w : commonData.ctnW;
        const firstH = parsedDims.length > 0 ? parsedDims[0].h : commonData.ctnH;

        if (newCustNo && newShipDest) {
          // 1. Check for duplicates
          if (parsedDims.length > 0) {
            const allExist = parsedDims.every((dim: any) => 
              configs.some(c => 
                c.custNo === newCustNo && 
                c.shipDest === newShipDest &&
                c.ctnL === dim.l &&
                c.ctnW === dim.w &&
                c.ctnH === dim.h
              )
            );
            setDuplicateWarning(allExist);
          } else {
            setDuplicateWarning(false);
          }

          // 2. Smart Auto-Load: Find historical shipping marks used for this Label + ShipDest
          const historicalConfigs = configs.filter(c => c.custNo === newCustNo && c.shipDest === newShipDest);
          if (historicalConfigs.length > 0) {
            const uniqueMarks: any[] = [];
            const seen = new Set();
            historicalConfigs.forEach(hc => {
              const key = `${hc.shippingMarkId}-${hc.area}-${hc.sealMethod}`;
              if (!seen.has(key)) {
                seen.add(key);
                uniqueMarks.push({
                  id: Date.now() + Math.random(),
                  shippingMarkId: hc.shippingMarkId || 0,
                  area: hc.area || 'A',
                  sealMethod: hc.sealMethod || 'H',
                  posX: 0, // Will be recalculated below
                  posY: 0
                });
              }
            });
            if (uniqueMarks.length > 0) {
              setMarksData(uniqueMarks); // Pre-fill the dynamic array!
            }
          }

        } else {
          setDuplicateWarning(false);
        }

        setCommonData(prev => ({
          ...prev,
          custNo: newCustNo,
          shipDest: newShipDest,
          ctnL: firstL,
          ctnW: firstW,
          ctnH: firstH
        }));
        
        // Recalculate marks UI just for the first dimension for display purposes
        if (parsedDims.length > 0) {
          const l = parseFloat(firstL) || 0;
          const w = parseFloat(firstW) || 0;
          const h = parseFloat(firstH) || 0;
          
          setMarksData(prev => prev.map(m => {
            let px = m.posX;
            let py = m.posY;
            if (m.area === 'A' || m.area === 'B') {
              if (l > 0) px = parseFloat(((l - 200) / 2).toFixed(2));
              if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
            } else if (m.area === 'C' || m.area === 'D') {
              if (w > 0) px = parseFloat(((w - 200) / 2).toFixed(2));
              if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
            }
            return { ...m, posX: px, posY: py };
          }));
        }
      } else {
        setError('Không tìm thấy thông tin PO này trong DB');
      }
    } catch (err: any) {
      setError('Lỗi kết nối khi kéo dữ liệu PO');
    } finally {
      setPoLoading(false);
    }
  };

  const handleDimensionChange = (field: 'ctnL' | 'ctnW' | 'ctnH', value: string) => {
    setCommonData(prev => ({ ...prev, [field]: value }));
    const l = parseFloat(field === 'ctnL' ? value : commonData.ctnL) || 0;
    const w = parseFloat(field === 'ctnW' ? value : commonData.ctnW) || 0;
    const h = parseFloat(field === 'ctnH' ? value : commonData.ctnH) || 0;
    
    setMarksData(prev => prev.map(m => {
      let px = m.posX;
      let py = m.posY;
      if (m.area === 'A' || m.area === 'B') {
        if (l > 0) px = parseFloat(((l - 200) / 2).toFixed(2));
        if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
      } else if (m.area === 'C' || m.area === 'D') {
        if (w > 0) px = parseFloat(((w - 200) / 2).toFixed(2));
        if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
      }
      return { ...m, posX: px, posY: py };
    }));
  };

  const handleMarkChange = (id: number, field: string, value: any) => {
    setMarksData(prev => prev.map(m => {
      if (m.id !== id) return m;
      const updated = { ...m, [field]: value };
      
      // Auto recalc position if area changes
      if (field === 'area') {
        const l = parseFloat(commonData.ctnL) || 0;
        const w = parseFloat(commonData.ctnW) || 0;
        const h = parseFloat(commonData.ctnH) || 0;
        if (value === 'A' || value === 'B') {
          if (l > 0) updated.posX = parseFloat(((l - 200) / 2).toFixed(2));
          if (h > 0) updated.posY = parseFloat(((h - 160) / 2).toFixed(2));
        } else if (value === 'C' || value === 'D') {
          if (w > 0) updated.posX = parseFloat(((w - 200) / 2).toFixed(2));
          if (h > 0) updated.posY = parseFloat(((h - 160) / 2).toFixed(2));
        }
      }

      if (field === 'shippingMarkId') {
        if (value === 26 || value === 27) {
          updated.posX = 50;
          updated.posY = 50;
        } else if (value >= 9 && value <= 15) {
          updated.posX = 150;
          updated.posY = 50;
        }
      }
      return updated;
    }));
  };


    const executeSave = async () => {
    try {
      setLoading(true);
      
      for (const recNo of deletedMarks) {
         await authFetch(`/v2/label-config/${recNo}`, { method: 'DELETE' });
      }

      const promises: any[] = [];
      const dimsToSave = fetchedDimensions.length > 0 
        ? fetchedDimensions 
        : [{ l: commonData.ctnL, w: commonData.ctnW, h: commonData.ctnH }];

      dimsToSave.forEach(dim => {
        marksData.forEach(mark => {
          let px = mark.posX;
          let py = mark.posY;
          
          if (px === 0 && py === 0) {
            const dimL = parseFloat(dim.l) || 0;
            const dimW = parseFloat(dim.w) || 0;
            const dimH = parseFloat(dim.h) || 0;
            
            if (mark.area === 'A' || mark.area === 'B') {
              if (dimL > 0) px = parseFloat(((dimL - 200) / 2).toFixed(2));
              if (dimH > 0) py = parseFloat(((dimH - 160) / 2).toFixed(2));
            } else if (mark.area === 'C' || mark.area === 'D') {
              if (dimW > 0) px = parseFloat(((dimW - 200) / 2).toFixed(2));
              if (dimH > 0) py = parseFloat(((dimH - 160) / 2).toFixed(2));
            }
          }

          const newCustNo = dim.l ? commonData.custNo : commonData.custNo;

          const payload = {
            recNo: mark.recNo,
            custNo: newCustNo,
            ctnL: dim.l ? Math.round(parseFloat(dim.l)).toString() : commonData.ctnL,
            ctnW: dim.w ? Math.round(parseFloat(dim.w)).toString() : commonData.ctnW,
            ctnH: dim.h ? Math.round(parseFloat(dim.h)).toString() : commonData.ctnH,
            posX: px,
            posY: py,
            area: mark.area,
            shipDest: commonData.shipDest,
            customer: commonData.customer,
            shippingMarkId: mark.shippingMarkId,
            sealMethod: mark.sealMethod,
            ext1: commonData.ext1,
            ext2: commonData.ext2,
            ext3: commonData.ext3
          };

          promises.push(
            authFetch('/v2/label-config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
          );
        });
      });

      await Promise.all(promises);
      fetchConfigs();
      handleCloseDialog();
    } catch (err: any) {
      setError(err.message || 'Lưu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!commonData.ctnL || !commonData.ctnW || !commonData.ctnH) {
      setError('Vui lòng nhập đầy đủ kích thước Dài, Rộng, Cao');
      return;
    }
    if (!commonData.custNo || !commonData.customer || !commonData.shipDest) {
      setError('Vui lòng nhập đầy đủ Mã KH, Khách Hàng, Nơi Đóng Hàng');
      return;
    }
    if (marksData.length === 0) {
      setError('Vui lòng thêm ít nhất 1 Tem (Shipping Mark)');
      return;
    }
    
    if (duplicateWarning && !editingId) {
      setConfirmDialog({
        open: true,
        title: 'Cảnh báo Trùng Lặp',
        message: 'Hệ thống phát hiện đã có cấu hình cho Label và Nơi đến này. Bạn có CHẮC CHẮN muốn tạo thêm một cấu hình mới đè lên không?',
        variant: 'warning',
        onConfirm: () => {
          setConfirmDialog(p => ({ ...p, open: false }));
          executeSave();
        }
      });
      return;
    }
    
    executeSave();
  };

  const handleQuickSave = async (row: LabelConfig, field: 'posX' | 'posY', value: number) => {
    try {
      const payload = { ...row, labelId: 28, [field]: value };
      const res = await authFetch(`/v2/label-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.code === 200) {
        fetchConfigs();
      } else {
        setError('Cập nhật nhanh thất bại: ' + data.msg);
      }
    } catch (err) {
      setError('Lỗi kết nối khi cập nhật nhanh');
    }
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      open: true,
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa cấu hình này không?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setLoading(true);
          const res = await authFetch(`/v2/label-config/${id}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (data.code === 200) {
            fetchConfigs();
          }
        } catch (err) {
          setError('Delete failed');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Get current page items
  const groupedConfigs = React.useMemo(() => {
    const map = new Map<string, GroupedLabelConfig>();
    configs.forEach(c => {
      const key = `${c.custNo}-${c.ctnL}-${c.ctnW}-${c.ctnH}-${c.customer}-${c.shipDest}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          custNo: c.custNo || '',
          customer: c.customer || '',
          shipDest: c.shipDest || '',
          ctnL: c.ctnL || '',
          ctnW: c.ctnW || '',
          ctnH: c.ctnH || '',
          marks: []
        });
      }
      map.get(key)!.marks.push(c);
    });
    return Array.from(map.values());
  }, [configs]);

  const filteredConfigs = React.useMemo(() => {
    if (!tableSearch) return groupedConfigs;
    const lower = tableSearch.toLowerCase();
    return groupedConfigs.filter(g => 
      (g.custNo || '').toLowerCase().includes(lower) || 
      (g.customer || '').toLowerCase().includes(lower) || 
      (g.shipDest || '').toLowerCase().includes(lower) ||
      (g.ctnL || '').includes(lower) ||
      (g.ctnW || '').includes(lower) ||
      (g.ctnH || '').includes(lower) ||
      g.marks.some(m => (m.shippingMarkId?.toString() || '').includes(lower))
    );
  }, [groupedConfigs, tableSearch]);

  const paginatedConfigs = filteredConfigs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ p: 2, height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">Cấu Hình In Ấn (Label Config)</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <LocalSearchInput onSearch={(val) => { setTableSearch(val); setPage(0); }} />
          <Button startIcon={<RefreshIcon />} onClick={fetchConfigs}>Làm mới</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Thêm Cấu Hình
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TableContainer sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {loading && configs.length === 0 ? (
            <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
          ) : (
            <Table stickyHeader size="small">
                            <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Số Lượng Tem</TableCell>
                  <TableCell>CustNo</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Dài (L)</TableCell>
                  <TableCell>Rộng (W)</TableCell>
                  <TableCell>Cao (H)</TableCell>
                  <TableCell>ShipDest</TableCell>
                  <TableCell align="center" sx={{ 
                    position: 'sticky', 
                    right: 0, 
                    bgcolor: 'background.paper', 
                    zIndex: 1, 
                    borderLeft: '1px solid #e0e0e0',
                    boxShadow: '-2px 0 5px rgba(0,0,0,0.05)'
                  }}>
                    Thao tác
                  </TableCell>
                </TableRow>
              </TableHead>
                                      <TableBody>
              {paginatedConfigs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">Không có dữ liệu. Hãy thêm mới hoặc tìm kiếm PO.</TableCell>
                </TableRow>
              ) : (
                paginatedConfigs.map((group: any) => (
                  <TableRow key={group.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>{group.marks.length > 0 ? group.marks[0].recNo : ''}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>{group.marks.length} tem</TableCell>
                    <TableCell>{group.custNo}</TableCell>
                    <TableCell>{group.customer}</TableCell>
                    <TableCell><strong>{group.ctnL}</strong></TableCell>
                    <TableCell><strong>{group.ctnW}</strong></TableCell>
                    <TableCell><strong>{group.ctnH}</strong></TableCell>
                    <TableCell>{group.shipDest}</TableCell>
                    <TableCell align="center" sx={{ 
                      position: 'sticky', 
                      right: 0, 
                      bgcolor: 'background.paper', 
                      zIndex: 1, 
                      borderLeft: '1px solid #e0e0e0'
                    }}>
                      <Stack direction="row" justifyContent="center">
                        <Tooltip title="Chỉnh sửa (Sửa cả cụm)">
                          <IconButton size="small" color="primary" onClick={() => handleOpenDialogGroup(group)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Nhân bản (Copy cả cụm)">
                          <IconButton size="small" color="info" onClick={() => handleOpenDialogGroup(group, true)}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa cả cụm">
                          <IconButton size="small" color="error" onClick={() => handleDeleteGroup(group)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          )}
        </TableContainer>
        <Box sx={{ flexShrink: 0, borderTop: '1px solid #e0e0e0', bgcolor: 'background.paper', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">Số dòng / trang:</Typography>
            <TextField
              select
              size="small"
              value={rowsPerPage}
              onChange={(e) => handleChangeRowsPerPage(e as any)}
              sx={{ minWidth: 80, '& .MuiOutlinedInput-root': { height: 32 } }}
            >
              {[25, 50, 100, 500].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              Tổng cộng: <b>{configs.length}</b> dòng
            </Typography>
          </Box>
          <Pagination
            count={Math.ceil(configs.length / rowsPerPage)}
            page={page + 1}
            onChange={(e, p) => handleChangePage(e, p - 1)}
            color="primary"
            shape="rounded"
            showFirstButton
            showLastButton
          />
        </Box>
      </Paper>

      <Dialog open={open} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingId ? 'Sửa Cấu Hình' : 'Thêm Cấu Hình Hàng Loạt'}
          
          {/* PO Search Section */}
          <Box display="flex" gap={1} alignItems="center">
            <TextField 
              size="small" 
              placeholder="Nhập PO Puma (VD: 4602900114)" 
              value={poSearch} 
              onChange={e => setPoSearch(e.target.value)}
              sx={{ width: 250, bgcolor: 'white' }}
            />
            <Button 
              variant="contained" 
              color="secondary" 
              disabled={poLoading}
              onClick={handleFetchPO}
            >
              {poLoading ? <CircularProgress size={24} color="inherit" /> : 'Kéo dữ liệu PO'}
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {duplicateWarning && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <b>Cảnh báo:</b> Cấu hình cho Mã KH/Label này và Nơi đến này <b>đã tồn tại</b> trong hệ thống. Việc lưu thêm có thể tạo ra dữ liệu trùng lặp! Hãy kiểm tra lại danh sách bên ngoài trước khi tiếp tục.
            </Alert>
          )}
          
          <Box display="grid" gap={3} gridTemplateColumns="repeat(2, 1fr)" sx={{ mb: 3 }}>
            {/* Cột 1: Thông Tin Khách Hàng (Bắt buộc) */}
            <Box display="flex" flexDirection="column" gap={2} p={2} border="1px solid #e0e0e0" borderRadius={2} bgcolor="#f8fafc">
              <Typography variant="subtitle2" color="primary" sx={{ mb: -1 }}>THÔNG TIN CHUNG</Typography>
              <TextField label="Mã KH/Label (CustNo)" value={commonData.custNo} onChange={e => setCommonData({ ...commonData, custNo: e.target.value })} size="small" fullWidth required />
              <Autocomplete
                freeSolo
                options={(customers || []).map(c => c.custmName)}
                value={commonData.customer}
                onChange={(_, newValue) => setCommonData({ ...commonData, customer: newValue || '' })}
                onInputChange={(_, newInputValue) => setCommonData({ ...commonData, customer: newInputValue })}
                renderInput={(params) => (
                  <TextField {...params} label="Khách Hàng (Customer)" size="small" fullWidth required />
                )}
              />
              <TextField label="Nơi Đóng Hàng (ShipDest)" value={commonData.shipDest} onChange={e => setCommonData({ ...commonData, shipDest: e.target.value })} size="small" fullWidth required />
              
              <Typography variant="subtitle2" color="secondary" sx={{ mb: -1, mt: 1 }}>Trường Tùy Chọn</Typography>
              <Box display="flex" gap={1}>
                <TextField label="Mở rộng 1" value={commonData.ext1} onChange={e => setCommonData({ ...commonData, ext1: e.target.value })} size="small" fullWidth />
                <TextField label="Mở rộng 2" value={commonData.ext2} onChange={e => setCommonData({ ...commonData, ext2: e.target.value })} size="small" fullWidth />
                <TextField label="Mở rộng 3" value={commonData.ext3} onChange={e => setCommonData({ ...commonData, ext3: e.target.value })} size="small" fullWidth />
              </Box>
            </Box>

            {/* Cột 2: Thông số Carton (Bắt buộc) */}
            <Box display="flex" flexDirection="column" gap={2} p={2} border="1px solid #e0e0e0" borderRadius={2} bgcolor="#f8fafc">
              <Typography variant="subtitle2" color="primary" sx={{ mb: -1 }}>KÍCH THƯỚC THÙNG (Chung)</Typography>
              
              {fetchedDimensions.length > 1 ? (
                <Alert severity="info" sx={{ mb: 1 }}>
                  PO này có <b>{fetchedDimensions.length}</b> kích thước thùng:
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {fetchedDimensions.map((d, i) => (
                      <li key={i}>{d.l} x {d.w} x {d.h} mm</li>
                    ))}
                  </ul>
                  Hệ thống sẽ tự động sinh cấu hình cho <b>tất cả</b> các kích thước này khi bạn bấm Lưu.
                </Alert>
              ) : null}

              {fetchedDimensions.length === 0 && !editingId ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', p: 2, textAlign: 'center', bgcolor: '#f1f5f9', borderRadius: 1 }}>
                  Vui lòng kéo dữ liệu PO để lấy danh sách kích thước thùng tự động.
                </Typography>
              ) : null}

              {(fetchedDimensions.length <= 1 || editingId) && (
                <>
                  <TextField 
                    label="Chiều Dài (CTNL) - mm" 
                    value={commonData.ctnL} 
                    onChange={e => {
                      setFetchedDimensions([]);
                      handleDimensionChange('ctnL', e.target.value);
                    }} 
                    size="small" fullWidth required 
                  />
                  <TextField 
                    label="Chiều Rộng (CTNW) - mm" 
                    value={commonData.ctnW} 
                    onChange={e => {
                      setFetchedDimensions([]); 
                      handleDimensionChange('ctnW', e.target.value);
                    }} 
                    size="small" fullWidth required 
                  />
                  <TextField 
                    label="Chiều Cao (CTNH) - mm" 
                    value={commonData.ctnH} 
                    onChange={e => {
                      setFetchedDimensions([]); 
                      handleDimensionChange('ctnH', e.target.value);
                    }} 
                    size="small" fullWidth required 
                  />
                </>
              )}
            </Box>
          </Box>
          
          {/* Danh Sách Động: Tem và Mặt In */}
          <Box p={2} border="1px solid #bbdefb" borderRadius={2} bgcolor="#e3f2fd">
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary">DANH SÁCH TEM & MẶT IN (Mỗi Tem 1 dòng)</Typography>
              {!editingId && (
                <Button 
                  variant="outlined" 
                  startIcon={<AddIcon />} 
                  onClick={() => setMarksData(p => [...p, { id: Date.now(), shippingMarkId: 0, area: 'A', sealMethod: 'H', posX: 0, posY: 0 }])}
                >
                  Thêm Tem
                </Button>
              )}
            </Box>
            
            <Stack spacing={2}>
              {marksData.map((mark, index) => (
                <Box key={mark.id} display="flex" gap={2} alignItems="center" bgcolor="white" p={1.5} borderRadius={1} boxShadow="0 1px 3px rgba(0,0,0,0.1)">
                  <Typography variant="body2" fontWeight="bold" color="text.secondary" sx={{ width: 20 }}>{index + 1}.</Typography>
                  <Autocomplete
                    filterOptions={filterOptions}
                    options={[{ shippingMarkId: 0, shippingMarkPicture: '-- Chọn Mã Tem --' }, ...shippingMarks]}
                    getOptionLabel={(option) => option.shippingMarkId === 0 ? option.shippingMarkPicture : `${option.shippingMarkId} - ${option.shippingMarkPicture}`}
                    value={
                      (mark.shippingMarkId === 0) 
                        ? { shippingMarkId: 0, shippingMarkPicture: '-- Chọn Mã Tem --' }
                        : shippingMarks.find(sm => sm.shippingMarkId === mark.shippingMarkId) || { shippingMarkId: 0, shippingMarkPicture: '-- Chọn Mã Tem --' }
                    }
                    onChange={(e, v) => handleMarkChange(mark.id, 'shippingMarkId', v ? v.shippingMarkId : 0)}
                    isOptionEqualToValue={(o, v) => o.shippingMarkId === v.shippingMarkId}
                    renderInput={(params) => <TextField {...params} label="ShippingMark ID" size="small" sx={{ minWidth: 250 }} />}
                    disableClearable
                  />
                  <TextField select label="Mặt In (Area)" value={mark.area} onChange={e => handleMarkChange(mark.id, 'area', e.target.value)} size="small" sx={{ width: 120 }}>
                    <MenuItem value="A">Mặt A</MenuItem>
                    <MenuItem value="B">Mặt B</MenuItem>
                    <MenuItem value="C">Mặt C</MenuItem>
                    <MenuItem value="D">Mặt D</MenuItem>
                    <MenuItem value="E">Mặt E</MenuItem>
                    <MenuItem value="F">Mặt F</MenuItem>
                  </TextField>
                  <TextField select label="Kiểu dán" value={mark.sealMethod} onChange={e => handleMarkChange(mark.id, 'sealMethod', e.target.value)} size="small" sx={{ width: 150 }}>
                    <MenuItem value="H">Chữ H (H)</MenuItem>
                    <MenuItem value="I">Chữ I (I)</MenuItem>
                    <MenuItem value="U">Chữ U (U)</MenuItem>
                  </TextField>
                  {fetchedDimensions.length > 1 && !editingId ? (
                    <Box sx={{ width: 100, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>Tự động</Typography>
                    </Box>
                  ) : (
                    <TextField label="PosX" type="number" value={mark.posX} onChange={e => handleMarkChange(mark.id, 'posX', parseFloat(e.target.value) || 0)} size="small" sx={{ width: 100 }} />
                  )}
                  {fetchedDimensions.length > 1 && !editingId ? (
                    <Box sx={{ width: 100, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>Tự động</Typography>
                    </Box>
                  ) : (
                    <TextField label="PosY" type="number" value={mark.posY} onChange={e => handleMarkChange(mark.id, 'posY', parseFloat(e.target.value) || 0)} size="small" sx={{ width: 100 }} />
                  )}
                  
                                    {!editingId && marksData.length > 1 && (
                    <IconButton color="error" onClick={() => {
                      if (mark.recNo) {
                        setDeletedMarks(prev => [...prev, mark.recNo]);
                      }
                      setMarksData(p => p.filter(m => m.id !== mark.id));
                    }}>
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', justifyContent: 'space-between' }}>
          <Button onClick={() => setPreview3DOpen(true)} color="info" variant="contained">Xem Trước 3D</Button>
          <Box>
            <Button onClick={handleCloseDialog} color="inherit" variant="outlined" sx={{ mr: 1 }}>Hủy</Button>
            <Button onClick={handleSave} variant="contained" disabled={loading} color="primary">
              {loading ? <CircularProgress size={24} /> : 'Lưu lại cấu hình'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog open={preview3DOpen} onClose={() => setPreview3DOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Xem Trước 3D Thùng Carton</DialogTitle>
        <DialogContent sx={{ p: 1 }}>
          <Carton3DPreview
            length={parseFloat(commonData.ctnL) || 0}
            width={parseFloat(commonData.ctnW) || 0}
            height={parseFloat(commonData.ctnH) || 0}
            marks={marksData.map(m => ({
              shippingMarkId: m.shippingMarkId,
              area: m.area,
              posX: m.posX,
              posY: m.posY
            }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreview3DOpen(false)} color="inherit">Đóng</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(p => ({ ...p, open: false }))} />
    </Box>
  );
}
