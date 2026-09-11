import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box, Typography, Button, TextField, CircularProgress, Alert, Card,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  Skeleton, TablePagination, InputAdornment, IconButton, Badge, Drawer, Divider, Autocomplete, Pagination, Select, MenuItem, Popover, Switch,
  Checkbox, Tooltip, LinearProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircleOutline as CheckIcon,
  LocalShipping as ShippingIcon,
  WarningAmber as WarningIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  TaskAlt as TaskAltIcon,
} from '@mui/icons-material';

import { authService } from '@traxeco/shared';
import { deliveryScanService, type PendingImportItem } from '../services/deliveryScanService';
import ExcelColumnFilter, { type FilterOption } from '../components/ExcelColumnFilter';

export default function ReceivePage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true); // true by default for initial load
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Pagination & Search State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);

  // Filter Drawer State
  const [filterOpen, setFilterOpen] = useState(false);

  const [filterPO, setFilterPO] = useState('');
  const [filterJob, setFilterJob] = useState('');
  const [filterLine, setFilterLine] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({ po: '', job: '', line: '' });

  // Popover Anchor States for Inline Filters
  const [poFilterAnchorEl, setPoFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [jobFilterAnchorEl, setJobFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [lineFilterAnchorEl, setLineFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [statusFilterAnchorEl, setStatusFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  // Smart Warehouse Toolbar States
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [quickStatusFilter, setQuickStatusFilter] = useState<'ALL' | 'MATCH' | 'SHORTAGE' | 'NO_SCAN'>('ALL');
  const [quickLineFilter, setQuickLineFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'group'>('list');

  // Chuyền Detail Modal State (cho chế độ Gom Chuyền / Nhận theo xe hàng)
  const [lineModalLine, setLineModalLine] = useState<string | null>(null);
  const [lineModalSearch, setLineModalSearch] = useState<string>('');

  const userInfo = authService.getUserInfo();

  // Dialog State
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actualQty, setActualQty] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Thêm History State
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryRow, setSelectedHistoryRow] = useState<any>(null);

  // Batch Selection State
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);

  // Helper functions cho đối chiếu số lượng và nhận dạng PO
  const getRowKey = (row: any): string => {
    return String(row.RecNo || row.BarCode || row.id || `${row.PONo}_${row.FacLine}_${row.ColorName || row.ColorID}_${row.SizeName || row.SizeID}`);
  };

  const getBookQty = (row: any): number => {
    return Number(row.BookQty ?? row.TotalQty ?? row.Qty ?? 0);
  };

  const getScanQty = (row: any): number => {
    return Number(row.ScanQty ?? row.ScannedQty ?? row.DkQty ?? row.MetalScanQty ?? 0);
  };

  const getScanStatus = (row: any): 'MATCH' | 'SHORTAGE' | 'NO_SCAN' => {
    const scan = getScanQty(row);
    const book = getBookQty(row);
    if (scan === 0) return 'NO_SCAN';
    if (scan >= book) return 'MATCH';
    return 'SHORTAGE';
  };

  const formatDateTime = (dateStr?: string): string => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch {
      return dateStr;
    }
  };

  // Excel Filter Options
  const poOptions: FilterOption[] = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => {
      if (r.PONo) map.set(r.PONo, (map.get(r.PONo) || 0) + 1);
    });
    appliedFilters.po.split(',').map(s => s.trim()).filter(Boolean).forEach(p => {
      if (!map.has(p)) map.set(p, 0);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, count }));
  }, [data, appliedFilters.po]);

  const jobOptions: FilterOption[] = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => {
      if (r.JobNo) map.set(r.JobNo, (map.get(r.JobNo) || 0) + 1);
    });
    appliedFilters.job.split(',').map(s => s.trim()).filter(Boolean).forEach(j => {
      if (!map.has(j)) map.set(j, 0);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, count }));
  }, [data, appliedFilters.job]);

  const lineOptions: FilterOption[] = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => {
      if (r.FacLine) map.set(r.FacLine, (map.get(r.FacLine) || 0) + 1);
    });
    appliedFilters.line.split(',').map(s => s.trim()).filter(Boolean).forEach(l => {
      if (!map.has(l)) map.set(l, 0);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, count }));
  }, [data, appliedFilters.line]);

  const statusOptions: FilterOption[] = useMemo(() => {
    let match = 0;
    let shortage = 0;
    let noScan = 0;
    data.forEach(r => {
      const st = getScanStatus(r);
      if (st === 'MATCH') match++;
      else if (st === 'SHORTAGE') shortage++;
      else noScan++;
    });
    return [
      { value: 'MATCH', label: t('f2s.receive.toolbar.match', '🟢 Đủ SL'), count: match },
      { value: 'SHORTAGE', label: t('f2s.receive.toolbar.shortage', '🟡 Thiếu SL'), count: shortage },
      { value: 'NO_SCAN', label: t('f2s.receive.toolbar.noScan', '⚪ Chưa dò kim'), count: noScan },
    ];
  }, [data]);

  // KPI Summary Stats (Cho bộ lọc 1 chạm trên cùng)
  const kpiStats = useMemo(() => {
    let match = 0;
    let shortage = 0;
    let noScan = 0;
    data.forEach(r => {
      const st = getScanStatus(r);
      if (st === 'MATCH') match++;
      else if (st === 'SHORTAGE') shortage++;
      else noScan++;
    });
    return {
      total: totalItems || data.length,
      currentLoaded: data.length,
      match,
      shortage,
      noScan,
    };
  }, [data, totalItems]);

  // Danh sách các chuyền có hàng book (cho dropdown chọn xe hàng)
  const availableLines = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(r => {
      if (r.FacLine) {
        map.set(r.FacLine, (map.get(r.FacLine) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([line, count]) => ({ line, count }));
  }, [data]);

  // DisplayData: Kết hợp sắp xếp & lọc client-side (KPI 1 chạm, Chuyền, Barcode, Đối chiếu)
  const displayData = useMemo(() => {
    let list = [...data];

    // 1. Lọc nhanh theo Thẻ KPI 1 chạm
    if (quickStatusFilter !== 'ALL') {
      list = list.filter(r => getScanStatus(r) === quickStatusFilter);
    }

    // 2. Lọc theo trạng thái cột Excel (nếu có chọn trong popover)
    if (filterStatus.length > 0) {
      list = list.filter(r => filterStatus.includes(getScanStatus(r)));
    }

    // 3. Lọc nhanh theo Chuyền May (chọn xe hàng)
    if (quickLineFilter !== 'ALL') {
      list = list.filter(r => r.FacLine === quickLineFilter);
    }

    // 4. Ô Tìm kiếm Barcode / PO / Job / Chuyền toàn diện
    if (globalSearchTerm.trim()) {
      const term = globalSearchTerm.trim().toLowerCase();
      list = list.filter(r => 
        (r.PONo && r.PONo.toLowerCase().includes(term)) ||
        (r.JobNo && r.JobNo.toLowerCase().includes(term)) ||
        (r.FacLine && r.FacLine.toLowerCase().includes(term)) ||
        (r.ColorName && r.ColorName.toLowerCase().includes(term)) ||
        (r.ColorID && String(r.ColorID).toLowerCase().includes(term)) ||
        (r.SizeName && r.SizeName.toLowerCase().includes(term)) ||
        (r.SizeID && String(r.SizeID).toLowerCase().includes(term)) ||
        (r.BarCode && String(r.BarCode).toLowerCase().includes(term)) ||
        (r.RecNo && String(r.RecNo).toLowerCase().includes(term))
      );
    }

    // 5. Sắp xếp
    if (sortConfig) {
      list.sort((a, b) => {
        let valA: any = a[sortConfig.field];
        let valB: any = b[sortConfig.field];
        if (sortConfig.field === 'scanStatus') {
          valA = getScanStatus(a);
          valB = getScanStatus(b);
        } else if (sortConfig.field === 'TotalQty' || sortConfig.field === 'BookQty') {
          valA = getBookQty(a);
          valB = getBookQty(b);
        } else if (sortConfig.field === 'ScanQty') {
          valA = getScanQty(a);
          valB = getScanQty(b);
        } else if (sortConfig.field === 'DateCreate') {
          valA = a.DateCreate ? new Date(a.DateCreate).getTime() : 0;
          valB = b.DateCreate ? new Date(b.DateCreate).getTime() : 0;
        }
        if (valA === valB) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;
        const comp = typeof valA === 'number' && typeof valB === 'number'
          ? valA - valB
          : String(valA).localeCompare(String(valB));
        return sortConfig.direction === 'asc' ? comp : -comp;
      });
    }
    return list;
  }, [data, quickStatusFilter, filterStatus, quickLineFilter, globalSearchTerm, sortConfig]);

  // Nhóm theo Chuyền (cho chế độ xem Gom Chuyền / Nhận theo xe hàng)
  const groupedByLine = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    displayData.forEach(r => {
      const line = r.FacLine || t('f2s.receive.other', 'Khác');
      if (!groups[line]) groups[line] = [];
      groups[line].push(r);
    });
    return groups;
  }, [displayData]);

  // Dữ liệu cho Modal Chi Tiết PO của 1 Chuyền
  const lineModalItems = useMemo(() => {
    if (!lineModalLine || !groupedByLine[lineModalLine]) return [];
    const list = groupedByLine[lineModalLine];
    if (!lineModalSearch.trim()) return list;
    const term = lineModalSearch.trim().toLowerCase();
    return list.filter((r: any) => 
      (r.PONo && r.PONo.toLowerCase().includes(term)) ||
      (r.JobNo && r.JobNo.toLowerCase().includes(term)) ||
      (r.ColorName && r.ColorName.toLowerCase().includes(term)) ||
      (r.SizeName && r.SizeName.toLowerCase().includes(term)) ||
      (r.BarCode && String(r.BarCode).toLowerCase().includes(term))
    );
  }, [lineModalLine, groupedByLine, lineModalSearch]);

  const lineModalStats = useMemo(() => {
    if (!lineModalLine || !groupedByLine[lineModalLine]) {
      return { total: 0, book: 0, scan: 0, match: 0, shortage: 0, noScan: 0, selected: 0 };
    }
    const allItems = groupedByLine[lineModalLine];
    const total = allItems.length;
    const book = allItems.reduce((s: number, r: any) => s + getBookQty(r), 0);
    const scan = allItems.reduce((s: number, r: any) => s + getScanQty(r), 0);
    const match = allItems.filter((r: any) => getScanStatus(r) === 'MATCH').length;
    const shortage = allItems.filter((r: any) => getScanStatus(r) === 'SHORTAGE').length;
    const noScan = allItems.filter((r: any) => getScanStatus(r) === 'NO_SCAN').length;
    const selected = allItems.filter((r: any) => selectedKeys.has(getRowKey(r))).length;
    return { total, book, scan, match, shortage, noScan, selected };
  }, [lineModalLine, groupedByLine, selectedKeys]);

  // Chọn toàn bộ lô của 1 Chuyền
  const handleSelectLine = (line: string) => {
    const newKeys = new Set(selectedKeys);
    displayData.filter(r => (r.FacLine || t('f2s.receive.other', 'Khác')) === line).forEach(r => {
      newKeys.add(getRowKey(r));
    });
    setSelectedKeys(newKeys);
  };

  // Các giá trị tổng hợp của danh sách đã chọn
  const selectedRows = useMemo(() => {
    return displayData.filter(r => selectedKeys.has(getRowKey(r)));
  }, [displayData, selectedKeys]);

  const totalSelectedBook = useMemo(() => {
    return selectedRows.reduce((sum, r) => sum + getBookQty(r), 0);
  }, [selectedRows]);

  const totalSelectedScan = useMemo(() => {
    return selectedRows.reduce((sum, r) => sum + getScanQty(r), 0);
  }, [selectedRows]);

  const selectedShortageCount = useMemo(() => {
    return selectedRows.filter(r => getScanStatus(r) !== 'MATCH').length;
  }, [selectedRows]);

  const isAllVisibleSelected = displayData.length > 0 && displayData.every(r => selectedKeys.has(getRowKey(r)));
  const isSomeVisibleSelected = displayData.some(r => selectedKeys.has(getRowKey(r))) && !isAllVisibleSelected;

  const toggleSelectRow = (row: any) => {
    const key = getRowKey(row);
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectAllVisible = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newKeys = new Set(selectedKeys);
      displayData.forEach(r => newKeys.add(getRowKey(r)));
      setSelectedKeys(newKeys);
    } else {
      const newKeys = new Set(selectedKeys);
      displayData.forEach(r => newKeys.delete(getRowKey(r)));
      setSelectedKeys(newKeys);
    }
  };

  const handleSelectOnlyMatch = () => {
    const newKeys = new Set(selectedKeys);
    displayData.forEach(r => {
      if (getScanStatus(r) === 'MATCH') {
        newKeys.add(getRowKey(r));
      }
    });
    setSelectedKeys(newKeys);
  };

  const applyFilters = () => {
    setPage(0);
    setAppliedFilters({ po: filterPO, job: filterJob, line: filterLine });
    // Dùng setTimeout để tránh bị MUI Autocomplete blur event chặn
    setTimeout(() => {
      setFilterOpen(false);
    }, 100);
  };

  const handleRemoveFilter = (type: 'po' | 'job' | 'line', valueToRemove: string) => {
    const currentList = appliedFilters[type].split(',').map(s => s.trim()).filter(Boolean);
    const newList = currentList.filter(item => item !== valueToRemove);
    const newStr = newList.join(',');
    
    setAppliedFilters(prev => ({ ...prev, [type]: newStr }));
    if (type === 'po') setFilterPO(newStr);
    if (type === 'job') setFilterJob(newStr);
    if (type === 'line') setFilterLine(newStr);
    setPage(0);
  };

  // Fetch data on mount and on page/search change
  useEffect(() => {
    handleRefresh(false);
  }, [page, rowsPerPage, appliedFilters]);

  // Bộ Timer cho Smart Polling
  const lastInteractionRef = useRef<number>(Date.now());

  // Lắng nghe sự kiện người dùng tương tác để reset idle timer
  useEffect(() => {
    const handleInteraction = () => { lastInteractionRef.current = Date.now(); };
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    return () => {
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  // Lặp nền: Ninja Tự Động Định Tuyến Thời Gian (Smart Polling)
  useEffect(() => {
    let timeoutId: any;
    
    const tick = () => {
      // 1. Tắt công tắc hoặc đang mổ xẻ chứng từ -> Đi ngủ 10s
      if (!isAutoRefresh || dialogOpen) {
        timeoutId = setTimeout(tick, 10000);
        return;
      }
      // 2. Màn hình Tablet đang tắt / Tắt tab -> Đi ngủ 10s (Bảo vệ CPU)
      if (document.visibilityState !== 'visible') {
        timeoutId = setTimeout(tick, 10000);
        return;
      }
      
      // 3. Tính độ trễ (Thời gian rảnh rỗi không ai đụng vô máy ngập kho)
      const idleTime = Date.now() - lastInteractionRef.current;
      let nextInterval = 10000; // Tiêu chuẩn: 10s/lần
      if (idleTime > 60000 * 3) {
        nextInterval = 30000; // Nghỉ 3 phút -> Rẽ sóng 30s/lần
      }
      if (idleTime > 60000 * 10) {
        nextInterval = 60000; // Nghỉ 10 phút -> Ngái ngủ 60s/lần
      }

      handleRefresh(true).finally(() => {
        timeoutId = setTimeout(tick, nextInterval);
      });
    };
    
    if (isAutoRefresh) {
      timeoutId = setTimeout(tick, 10000);
    }
    
    return () => clearTimeout(timeoutId);
  }, [isAutoRefresh, dialogOpen, page, rowsPerPage, appliedFilters]);

  const handleRefresh = async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
      setError(null);
      setSuccess(null);
    }
    try {
      const result = await deliveryScanService.getImportSewingData(userInfo.factory, appliedFilters, page, rowsPerPage);
      // Backend returns Map: { data: [...], totalItems: X, currentPage: Y, totalPages: Z }
      setData(result.data || []);
      setTotalItems(result.totalItems || 0);
      setLastUpdated(new Date());
    } catch (err: any) {
      if (!isSilent) {
        setError(err.message || t('f2s.receive.msg.loadError', 'Lỗi khi tải dữ liệu từ server.'));
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  const openConfirmDialog = (row: any) => {
    setSelectedRow(row);
    const qty = row.TotalQty || row.Qty || 0;
    setActualQty(qty.toString());
    setDialogOpen(true);
    setIsKeyboardOpen(false);
    setSuccess(null);
    setError(null);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedRow(null);
  };

  const handleConfirm = async () => {
    const cleanQty = String(actualQty || '').trim();
    const actual = Number(cleanQty);
    if (!cleanQty || isNaN(actual) || !Number.isInteger(actual) || actual < 0) {
      setError(t('f2s.receive.msg.invalidQty', 'Số lượng thực nhận phải là số nguyên không âm (≥ 0). Không được nhập số âm hoặc số thập phân!'));
      return;
    }

    setActionLoading(true);
    try {
      const barcode = selectedRow.RecNo || selectedRow.BarCode || selectedRow.id;
      const actual = Number(actualQty);
      const expected = Number(selectedRow.TotalQty || selectedRow.Qty || 0);
      await deliveryScanService.confirmImportSewing(barcode, actual);
      
      if (actual < expected) {
        setSuccess(t('f2s.receive.msg.successPartial', 'Đã ghi nhận số lượng thực nhận là {{actual}}/{{expected}} pcs cho PO {{po}}. Dòng hàng tiếp tục lưu lại trên hệ thống để Chuyền may vào cập nhật.', { actual, expected, po: selectedRow.PONo }));
      } else {
        setSuccess(t('f2s.receive.msg.successFull', 'Đã xác nhận nhập kho thành công cho PO {{po}}.', { po: selectedRow.PONo }));
      }
      setSelectedKeys(prev => {
        const next = new Set(prev);
        next.delete(getRowKey(selectedRow));
        return next;
      });
      closeDialog();
      handleRefresh(); // Reload list
    } catch (err: any) {
      setError(err.message || t('f2s.receive.msg.loadError', 'Lỗi khi xác nhận. Vui lòng thử lại.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchConfirm = async () => {
    if (selectedRows.length === 0) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const items = selectedRows.map(r => ({
        barcode: String(r.RecNo || r.BarCode || r.id),
        actualQty: getBookQty(r),
        poNo: r.PONo,
      }));

      const result = await deliveryScanService.batchConfirmImportSewing(items);
      if (result.successCount > 0) {
        setSuccess(t('f2s.receive.msg.batchSuccess', 'Đã xác nhận nhập kho thành công cho {{successCount}}/{{total}} PO.', { successCount: result.successCount, total: items.length }));
        setSelectedKeys(new Set());
        setBatchConfirmOpen(false);
        await handleRefresh();
      }
      if (result.failedCount > 0) {
        setError(t('f2s.receive.msg.batchFailed', 'Có {{failedCount}} PO không thể xác nhận: {{errors}}', { failedCount: result.failedCount, errors: result.errors.join('; ') }));
      }
    } catch (err: any) {
      setError(err.message || t('f2s.receive.msg.batchError', 'Lỗi khi xác nhận hàng loạt.'));
    } finally {
      setActionLoading(false);
    }
  };

  const openHistory = async (row: any) => {
    setSelectedHistoryRow(row);
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    try {
      const barcode = row.RecNo || row.BarCode || row.id;
      const data = await deliveryScanService.getReceiveHistory(barcode);
      setHistoryData(data);
    } catch (err: any) {
      setError(err.message || t('f2s.receive.msg.historyError', 'Lỗi lấy lịch sử'));
    } finally {
      setHistoryLoading(false);
    }
  };

  const expectedQtyValue = selectedRow ? Number(selectedRow.TotalQty || selectedRow.Qty || 0) : 0;
  const isMismatch = selectedRow && Number(actualQty) !== expectedQtyValue;

  // ─── Loading skeleton ───
  const LoadingSkeleton = () => (
    <Box sx={{ p: 2 }}>
      {[...Array(6)].map((_, i) => (
        <Skeleton 
          key={i} 
          variant="rectangular" 
          height={44} 
          sx={{ mb: 1, borderRadius: 1, animation: 'pulse 1.2s ease-in-out infinite' }} 
        />
      ))}
    </Box>
  );

  // ─── Memoized Table Content to Prevent Input Lag ───
  const tableContent = useMemo(() => {
    if (displayData.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={10} align="center" sx={{ py: 6, color: '#94a3b8' }}>
            <ShippingIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <Typography>{t('f2s.receive.msg.noData', 'Không có lô hàng nào phù hợp với bộ lọc.')}</Typography>
          </TableCell>
        </TableRow>
      );
    }
    
    return displayData.map((row, idx) => {
      const key = getRowKey(row);
      const isSelected = selectedKeys.has(key);
      const bookQty = getBookQty(row);
      const scanQty = getScanQty(row);
      const status = getScanStatus(row);

      return (
        <TableRow 
          key={key || idx} 
          hover 
          selected={isSelected}
          onClick={() => openConfirmDialog(row)}
          sx={{ 
            cursor: 'pointer',
            '&:last-child td, &:last-child th': { border: 0 },
            bgcolor: isSelected ? 'rgba(16, 185, 129, 0.06) !important' : 'inherit',
            transition: 'background-color 0.15s ease'
          }}
        >
          {/* Checkbox column */}
          <TableCell 
            padding="checkbox" 
            align="center" 
            sx={{ width: 48 }}
            onClick={(e) => {
              e.stopPropagation();
              toggleSelectRow(row);
            }}
          >
            <Checkbox
              size="small"
              checked={isSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={() => toggleSelectRow(row)}
              sx={{
                color: '#94a3b8',
                '&.Mui-checked': { color: '#10b981' }
              }}
            />
          </TableCell>

          {/* PO Number */}
          <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>{row.PONo}</TableCell>

          {/* Job No */}
          <TableCell sx={{ fontWeight: 600, color: '#475569' }}>{row.JobNo || '—'}</TableCell>

          {/* Chuyền */}
          <TableCell>
            <Chip 
              size="small" 
              label={row.FacLine} 
              sx={{ bgcolor: 'rgba(25,118,210,0.1)', color: '#1976d2', fontWeight: 700, borderRadius: '6px' }} 
            />
          </TableCell>

          {/* Thời Gian Book */}
          <TableCell>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.78rem' }}>
              {formatDateTime(row.DateCreate)}
            </Typography>
          </TableCell>

          {/* Màu / Size */}
          <TableCell>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
              {row.ColorName || row.ColorID || '—'} / {row.SizeName || row.SizeID || '—'}
            </Typography>
          </TableCell>

          {/* SL Book */}
          <TableCell align="center">
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#ea580c' }}>
              {bookQty.toLocaleString()}
            </Typography>
          </TableCell>

          {/* SL Scan (Dò Kim) */}
          <TableCell align="center">
            {status === 'MATCH' && (
              <Box sx={{ 
                display: 'inline-flex', alignItems: 'center', gap: 0.5, 
                bgcolor: '#ecfdf5', color: '#047857', px: 1, py: 0.35, 
                borderRadius: '6px', fontWeight: 800, border: '1px solid #a7f3d0' 
              }}>
                <CheckCircleIcon sx={{ fontSize: 15, color: '#10b981' }} />
                {scanQty.toLocaleString()}
              </Box>
            )}
            {status === 'SHORTAGE' && (
              <Box sx={{ 
                display: 'inline-flex', alignItems: 'center', gap: 0.5, 
                bgcolor: '#fffbeb', color: '#b45309', px: 1, py: 0.35, 
                borderRadius: '6px', fontWeight: 800, border: '1px solid #fde68a' 
              }}>
                <WarningIcon sx={{ fontSize: 15, color: '#f59e0b' }} />
                {scanQty.toLocaleString()}
              </Box>
            )}
            {status === 'NO_SCAN' && (
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#94a3b8' }}>
                0
              </Typography>
            )}
          </TableCell>

          {/* Trạng Thái Đối Chiếu */}
          <TableCell align="center">
            {status === 'MATCH' && (
              <Chip 
                size="small" 
                label={t('f2s.receive.status.match', 'Đủ SL')} 
                sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700, border: '1px solid #a7f3d0' }} 
              />
            )}
            {status === 'SHORTAGE' && (
              <Chip 
                size="small" 
                label={t('f2s.receive.status.shortage', 'Thiếu {{qty}}', { qty: (bookQty - scanQty).toLocaleString() })} 
                sx={{ bgcolor: '#fffbeb', color: '#b45309', fontWeight: 700, border: '1px solid #fde68a' }} 
              />
            )}
            {status === 'NO_SCAN' && (
              <Chip 
                size="small" 
                label={t('f2s.receive.status.noScan', 'Chưa dò kim')} 
                sx={{ bgcolor: '#f8fafc', color: '#94a3b8', fontWeight: 600, border: '1px solid #e2e8f0' }} 
              />
            )}
          </TableCell>

          {/* Hành Động */}
          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => openConfirmDialog(row)}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '8px',
                padding: '2px 12px',
                borderColor: '#cbd5e1',
                color: '#334155',
                '&:hover': { 
                  borderColor: '#10b981',
                  color: '#10b981',
                  bgcolor: 'rgba(16, 185, 129, 0.04)'
                }
              }}
            >
              {t('f2s.receive.btn.inspect', 'Kiểm hàng')}
            </Button>
          </TableCell>
        </TableRow>
      );
    });
  }, [displayData, selectedKeys]);

  return (
    <Box sx={{ 
      display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 2, 
      px: { xs: 1.5, md: 1.5, lg: 2 }, pt: { xs: 2, md: 1 }, pb: { xs: 1, md: 0 },
      bgcolor: 'background.paper',
      '@keyframes fadeInRow': {
        '0%': { opacity: 0, transform: 'translateY(15px)' },
        '100%': { opacity: 1, transform: 'translateY(0)' }
      }
    }}>
      
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}>
            🗓 {t('f2s.receive.updated', 'Cập nhật')}: {lastUpdated.toLocaleTimeString()}
          </Typography>
        </Box>

        {/* Thể hiện các Tag lọc ra ngoài */}
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
          {appliedFilters.po.split(',').filter(Boolean).map((t, i) => (
            <Chip key={`po-${i}`} label={`PO: ${t.trim()}`} size="small" onDelete={() => handleRemoveFilter('po', t.trim())} color="primary" variant="outlined" sx={{ bgcolor: 'background.paper', fontWeight: 600 }} />
          ))}
          {appliedFilters.job.split(',').filter(Boolean).map((t, i) => (
            <Chip key={`job-${i}`} label={`Job: ${t.trim()}`} size="small" onDelete={() => handleRemoveFilter('job', t.trim())} color="primary" variant="outlined" sx={{ bgcolor: 'background.paper', fontWeight: 600 }} />
          ))}
          {appliedFilters.line.split(',').filter(Boolean).map((t, i) => (
            <Chip key={`line-${i}`} label={t("f2s.receive.tagLine", "Chuyền: {{val}}", { val: t.trim() })} size="small" onDelete={() => handleRemoveFilter('line', t.trim())} color="primary" variant="outlined" sx={{ bgcolor: 'background.paper', fontWeight: 600 }} />
          ))}
          {filterStatus.map((st, i) => (
            <Chip key={`st-${i}`} label={`${t('f2s.receive.col.status', 'Trạng thái')}: ${st === 'MATCH' ? t('f2s.receive.status.match', 'Đủ SL') : (st === 'SHORTAGE' ? t('f2s.receive.status.shortageSimple', 'Thiếu SL') : t('f2s.receive.status.noScan', 'Chưa dò kim'))}`} size="small" onDelete={() => setFilterStatus(prev => prev.filter(x => x !== st))} color="secondary" variant="outlined" sx={{ bgcolor: 'background.paper', fontWeight: 600 }} />
          ))}
          {sortConfig && (
            <Chip
              label={t('f2s.receive.sortPrefix', 'Sắp xếp: {{field}} ({{dir}})', { field: sortConfig.field === 'scanStatus' ? t('f2s.receive.col.status', 'Đối Chiếu') : (sortConfig.field === 'FacLine' ? t('f2s.receive.col.line', 'Chuyền') : (sortConfig.field === 'PONo' ? 'PO' : (sortConfig.field === 'JobNo' ? 'Job' : sortConfig.field))), dir: sortConfig.direction === 'asc' ? 'A→Z' : 'Z→A' })}
              size="small"
              onDelete={() => setSortConfig(null)}
              color="info"
              variant="outlined"
              sx={{ bgcolor: 'background.paper', fontWeight: 600 }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            label={loading ? t('common.loading', 'Đang tải...') : (displayData.length !== data.length ? `${t('f2s.receive.showing', 'Hiển thị')}: ${displayData.length}/${data.length} (${t('f2s.receive.total', 'Tổng')}: ${totalItems})` : `${t('f2s.receive.totalBatches', 'Tổng số lô')}: ${totalItems}`)}
            sx={{ fontWeight: 700, bgcolor: 'background.default', color: '#475569', borderRadius: 2, height: 36, px: 0.5, letterSpacing: '0.5px', display: { xs: 'none', sm: 'flex' } }}
          />
          <Badge 
            color="error" 
            variant="dot" 
            invisible={!appliedFilters.po && !appliedFilters.job && !appliedFilters.line}
          >
            <Button
              variant="outlined"
              onClick={() => setFilterOpen(true)}
              startIcon={<FilterIcon />}
              sx={{ 
                borderRadius: 2, bgcolor: 'background.paper', textTransform: 'none', fontWeight: 700, 
                color: '#475569', borderColor: '#cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                transition: 'all 0.2s',
                '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 6px rgba(0,0,0,0.04)', bgcolor: 'background.default' }
              }}
            >
              {t('f2s.receive.filter', 'Bộ Lọc')}
            </Button>
          </Badge>

          <Drawer
            anchor="right"
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
            sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}
            PaperProps={{ sx: { width: { xs: '85%', sm: 360 }, p: 0, borderRadius: '16px 0 0 16px', boxShadow: '-4px 0 24px rgba(0,0,0,0.1)' } }}
          >
            {/* Drawer Header */}
            <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterIcon sx={{ color: '#3ba55c' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b' }}>
                  {t('f2s.receive.filterDrawer.title', 'Tiêu chí tìm kiếm')}
                </Typography>
              </Box>
              <IconButton onClick={() => setFilterOpen(false)} size="small" sx={{ color: '#64748b' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Drawer Content */}
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, flexGrow: 1 }}>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={filterPO ? filterPO.split(',').map(s => s.trim()).filter(Boolean) : []}
                onChange={(_, newVal) => setFilterPO(newVal.join(','))}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return <Chip variant="outlined" label={`PO: ${option}`} size="small" color="primary" key={key} {...tagProps} sx={{ bgcolor: 'background.paper', fontWeight: 600 }} />;
                  })
                }
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label={t('f2s.receive.filterDrawer.poLabel', 'PO Number (Nhiều mã)')} 
                    variant="outlined" 
                    placeholder={t('f2s.receive.filterDrawer.poPlaceholder', 'Gõ rồi nhấn Enter...')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !(e.target as HTMLInputElement).value) {
                        applyFilters();
                      }
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
              />
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={filterJob ? filterJob.split(',').map(s => s.trim()).filter(Boolean) : []}
                onChange={(_, newVal) => setFilterJob(newVal.join(','))}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return <Chip variant="outlined" label={`Job: ${option}`} size="small" color="primary" key={key} {...tagProps} sx={{ bgcolor: 'background.paper', fontWeight: 600 }} />;
                  })
                }
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label={t('f2s.receive.filterDrawer.jobLabel', 'Job No (Nhiều mã)')} 
                    variant="outlined" 
                    placeholder={t('f2s.receive.filterDrawer.poPlaceholder', 'Gõ rồi nhấn Enter...')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !(e.target as HTMLInputElement).value) {
                        applyFilters();
                      }
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
              />
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={filterLine ? filterLine.split(',').map(s => s.trim()).filter(Boolean) : []}
                onChange={(_, newVal) => setFilterLine(newVal.join(','))}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return <Chip variant="outlined" label={t("f2s.receive.tagLine", "Chuyền: {{val}}", { val: option })} size="small" color="primary" key={key} {...tagProps} sx={{ bgcolor: 'background.paper', fontWeight: 600 }} />;
                  })
                }
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label={t('f2s.receive.filterDrawer.lineLabel', 'Chuyền (Nhiều mã)')} 
                    variant="outlined" 
                    placeholder={t('f2s.receive.filterDrawer.poPlaceholder', 'Gõ rồi nhấn Enter...')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !(e.target as HTMLInputElement).value) {
                        applyFilters();
                      }
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
              />
            </Box>

            {/* Drawer Actions */}
            <Box sx={{ p: 2.5, display: 'flex', gap: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Button 
                fullWidth variant="outlined" size="large" 
                onClick={() => {
                  setFilterPO(''); setFilterJob(''); setFilterLine('');
                  setPage(0);
                  setAppliedFilters({ po: '', job: '', line: '' });
                  setFilterOpen(false);
                }}
                sx={{ fontWeight: 700, borderRadius: 2, borderColor: '#cbd5e1', color: '#475569' }}
              >
                {t('f2s.receive.btn.clear', 'Xóa lọc')}
              </Button>
              <Button 
                fullWidth variant="contained" size="large" disableElevation
                onClick={() => applyFilters()}
                sx={{ fontWeight: 700, borderRadius: 2, bgcolor: '#3ba55c', '&:hover': { bgcolor: '#2e7d32' } }}
              >
                {t('f2s.receive.btn.apply', 'Tìm')}
              </Button>
            </Box>
          </Drawer>

          <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', pl: 1.5, pr: 0.5, py: 0.5, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
              {isAutoRefresh && (
                <Box sx={{ 
                  width: 8, height: 8, bgcolor: '#10b981', borderRadius: '50%', mr: 1, 
                  boxShadow: '0 0 6px #10b981',
                  animation: 'pulse 1.5s infinite',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)' },
                    '70%': { transform: 'scale(1)', boxShadow: '0 0 0 6px rgba(16, 185, 129, 0)' },
                    '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' }
                  }
                }} />
              )}
              <Typography sx={{ fontWeight: 800, color: isAutoRefresh ? '#10b981' : '#64748b', fontSize: '0.8rem', letterSpacing: 0.5 }}>
                LIVE SYNC
              </Typography>
            </Box>
            <Switch
              size="small"
              checked={isAutoRefresh}
              onChange={(e) => setIsAutoRefresh(e.target.checked)}
              sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#10b981' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#10b981' } }}
            />
          </Box>

          <Button
            variant="contained"
            color="primary"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={() => handleRefresh(false)}
            disabled={loading}
            disableElevation
            sx={{ 
              borderRadius: 2, fontWeight: 700, textTransform: 'none',
              bgcolor: 'background.paper',
              color: '#334155', border: '1px solid', borderColor: 'divider',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 6px rgba(0,0,0,0.04)', background: 'background.default' }
            }}
          >
            {t('f2s.receive.refresh', 'Làm mới')}
          </Button>
        </Box>
      </Box>

      {/* 1. KPI Cards: 4 Thẻ thống kê kiêm bộ lọc 1 chạm */}
      <Grid container spacing={{ xs: 1, sm: 1.5 }} sx={{ flexShrink: 0 }}>
        {/* Card: Tất cả */}
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card 
            elevation={0}
            onClick={() => setQuickStatusFilter('ALL')}
            sx={{ 
              p: { xs: 1, sm: 1.25 }, borderRadius: 2.5, cursor: 'pointer',
              border: quickStatusFilter === 'ALL' ? '2px solid #10b981' : '1px solid #e2e8f0',
              bgcolor: quickStatusFilter === 'ALL' ? '#f0fdf4' : 'background.paper',
              boxShadow: quickStatusFilter === 'ALL' ? '0 4px 12px rgba(16, 185, 129, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.15s',
              '&:hover': { transform: 'translateY(-1px)', borderColor: '#10b981' }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: '0.68rem' }}>
                {t('f2s.receive.kpi.totalPending', 'Tổng Chờ Nhập')}
              </Typography>
              <Typography sx={{ fontSize: '0.9rem' }}>📦</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8, my: 0.25 }}>
              <Typography sx={{ fontSize: { xs: '1.25rem', sm: '1.4rem' }, fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
                {kpiStats.total.toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.7rem' }}>{t('f2s.receive.kpi.lots', 'lô PO')}</Typography>
            </Box>
            <Typography variant="caption" sx={{ color: quickStatusFilter === 'ALL' ? '#047857' : '#94a3b8', fontSize: '0.65rem', fontWeight: 600 }}>
              {t('f2s.receive.kpi.clickToViewAll', 'Bấm để xem tất cả')}
            </Typography>
          </Card>
        </Grid>

        {/* Card: Đủ SL (Sẵn sàng nhận) */}
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card 
            elevation={0}
            onClick={() => setQuickStatusFilter('MATCH')}
            sx={{ 
              p: { xs: 1, sm: 1.25 }, borderRadius: 2.5, cursor: 'pointer',
              border: quickStatusFilter === 'MATCH' ? '2px solid #10b981' : '1px solid #e2e8f0',
              bgcolor: quickStatusFilter === 'MATCH' ? '#f0fdf4' : 'background.paper',
              boxShadow: quickStatusFilter === 'MATCH' ? '0 4px 12px rgba(16, 185, 129, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.15s',
              '&:hover': { transform: 'translateY(-1px)', borderColor: '#10b981' }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#047857', textTransform: 'uppercase', fontSize: '0.68rem' }}>
                {t('f2s.receive.kpi.readyToReceive', 'Đủ SL Dò Kim')}
              </Typography>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8, my: 0.25 }}>
              <Typography sx={{ fontSize: { xs: '1.25rem', sm: '1.4rem' }, fontWeight: 900, color: '#059669', lineHeight: 1.1 }}>
                {kpiStats.match.toLocaleString()}
              </Typography>
              <Chip label={t('f2s.receive.kpi.readyChip', 'Sẵn sàng nhận')} size="small" sx={{ height: 16, fontSize: '0.62rem', fontWeight: 700, bgcolor: '#ecfdf5', color: '#047857' }} />
            </Box>
            <Typography variant="caption" sx={{ color: '#059669', fontSize: '0.65rem', fontWeight: 700 }}>
              {t('f2s.receive.kpi.standardMet', '🟢 Đạt chuẩn (Scan ≥ Book)')}
            </Typography>
          </Card>
        </Grid>

        {/* Card: Thiếu SL */}
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card 
            elevation={0}
            onClick={() => setQuickStatusFilter('SHORTAGE')}
            sx={{ 
              p: { xs: 1, sm: 1.25 }, borderRadius: 2.5, cursor: 'pointer',
              border: quickStatusFilter === 'SHORTAGE' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
              bgcolor: quickStatusFilter === 'SHORTAGE' ? '#fffbeb' : 'background.paper',
              boxShadow: quickStatusFilter === 'SHORTAGE' ? '0 4px 12px rgba(245, 158, 11, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.15s',
              '&:hover': { transform: 'translateY(-1px)', borderColor: '#f59e0b' }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#b45309', textTransform: 'uppercase', fontSize: '0.68rem' }}>
                {t('f2s.receive.kpi.shortage', 'Thiếu SL Thực Tế')}
              </Typography>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8, my: 0.25 }}>
              <Typography sx={{ fontSize: { xs: '1.25rem', sm: '1.4rem' }, fontWeight: 900, color: '#d97706', lineHeight: 1.1 }}>
                {kpiStats.shortage.toLocaleString()}
              </Typography>
              <Chip label={t('f2s.receive.kpi.shortageChip', 'Chờ bù')} size="small" sx={{ height: 16, fontSize: '0.62rem', fontWeight: 700, bgcolor: '#fffbeb', color: '#b45309' }} />
            </Box>
            <Typography variant="caption" sx={{ color: '#b45309', fontSize: '0.65rem', fontWeight: 700 }}>
              {t('f2s.receive.kpi.underScanned', '🟡 Quét thiếu (Scan < Book)')}
            </Typography>
          </Card>
        </Grid>

        {/* Card: Chưa dò kim */}
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card 
            elevation={0}
            onClick={() => setQuickStatusFilter('NO_SCAN')}
            sx={{ 
              p: { xs: 1, sm: 1.25 }, borderRadius: 2.5, cursor: 'pointer',
              border: quickStatusFilter === 'NO_SCAN' ? '2px solid #64748b' : '1px solid #e2e8f0',
              bgcolor: quickStatusFilter === 'NO_SCAN' ? '#f8fafc' : 'background.paper',
              boxShadow: quickStatusFilter === 'NO_SCAN' ? '0 4px 12px rgba(100, 116, 139, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.15s',
              '&:hover': { transform: 'translateY(-1px)', borderColor: '#64748b' }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: '0.68rem' }}>
                {t('f2s.receive.kpi.noScan', 'Chưa Qua Dò Kim')}
              </Typography>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#cbd5e1' }} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8, my: 0.25 }}>
              <Typography sx={{ fontSize: { xs: '1.25rem', sm: '1.4rem' }, fontWeight: 900, color: '#475569', lineHeight: 1.1 }}>
                {kpiStats.noScan.toLocaleString()}
              </Typography>
              <Chip label="Scan = 0" size="small" sx={{ height: 16, fontSize: '0.62rem', fontWeight: 600, bgcolor: '#f1f5f9', color: '#64748b' }} />
            </Box>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 600 }}>
              {t('f2s.receive.kpi.notScanned', '⚪ Chưa qua máy dò')}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* 2. Smart Warehouse Toolbar: Ô tìm kiếm súng Barcode, chọn Chuyền, chuyển View mode */}
      <Card elevation={0} sx={{ p: 1.5, px: 2, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', gap: 1.5 }}>
          {/* Ô tìm kiếm Barcode to & rõ */}
          <TextField
            size="small"
            placeholder={t('f2s.receive.toolbar.searchPlaceholder', '🔍 Dùng súng bắn Barcode hoặc gõ mã PO, Job No, Chuyền, Màu, Size...')}
            value={globalSearchTerm}
            onChange={(e) => setGlobalSearchTerm(e.target.value)}
            fullWidth
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                bgcolor: '#f8fafc',
                fontSize: '0.85rem',
                fontWeight: 600,
                '&.Mui-focused': { bgcolor: '#fff' }
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#10b981', fontSize: 22 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {globalSearchTerm && (
                    <IconButton size="small" onClick={() => setGlobalSearchTerm('')} sx={{ mr: 0.5 }}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                  <Chip
                    label="SCANNER READY"
                    size="small"
                    sx={{
                      display: { xs: 'none', sm: 'inline-flex' },
                      height: 20, fontSize: '0.65rem', fontWeight: 800,
                      bgcolor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0'
                    }}
                  />
                </InputAdornment>
              )
            }}
          />

          {/* Chọn Chuyền May (theo xe hàng) & View Mode */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                {t('f2s.receive.toolbar.line', 'Chuyền')}:
              </Typography>
              <Select
                size="small"
                value={quickLineFilter}
                onChange={(e) => setQuickLineFilter(e.target.value)}
                sx={{
                  height: 38, minWidth: 160, borderRadius: 2.5,
                  fontSize: '0.82rem', fontWeight: 800,
                  bgcolor: '#eff6ff', color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                }}
              >
                <MenuItem value="ALL" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                  {t('f2s.receive.toolbar.allLines', '🏢 Tất cả các Chuyền')} ({data.length} {t('f2s.receive.kpi.lots', 'lô')})
                </MenuItem>
                {availableLines.map(({ line, count }) => (
                  <MenuItem key={line} value={line} sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    {t('f2s.receive.toolbar.linePrefix', 'Chuyền')} {line} ({count} {t('f2s.receive.kpi.lots', 'lô')})
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {/* Toggle View Mode: Dạng Bảng vs Gom Chuyền */}
            <Box sx={{ display: 'inline-flex', bgcolor: '#f1f5f9', p: 0.5, borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
              <Button
                size="small"
                onClick={() => setViewMode('list')}
                sx={{
                  textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', py: 0.4, px: 1.5, borderRadius: 2,
                  bgcolor: viewMode === 'list' ? '#fff' : 'transparent',
                  color: viewMode === 'list' ? '#0f172a' : '#64748b',
                  boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  '&:hover': { bgcolor: viewMode === 'list' ? '#fff' : '#e2e8f0' }
                }}
              >
                {t('f2s.receive.toolbar.viewTable', 'Dạng Bảng')}
              </Button>
              <Button
                size="small"
                onClick={() => setViewMode('group')}
                sx={{
                  textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', py: 0.4, px: 1.5, borderRadius: 2,
                  bgcolor: viewMode === 'group' ? '#fff' : 'transparent',
                  color: viewMode === 'group' ? '#0f172a' : '#64748b',
                  boxShadow: viewMode === 'group' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  '&:hover': { bgcolor: viewMode === 'group' ? '#fff' : '#e2e8f0' }
                }}
              >
                {t('f2s.receive.toolbar.viewGroup', 'Gom Chuyền')}
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Row 2: Filter chips & Select only match button */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, pt: 1, mt: 1, borderTop: '1px solid #f1f5f9' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>{t('f2s.receive.toolbar.quickFilter', 'Lọc nhanh')}:</Typography>
            {[
              { id: 'ALL', label: t('f2s.receive.toolbar.all', 'Tất cả') },
              { id: 'MATCH', label: t('f2s.receive.toolbar.match', '🟢 Đủ SL Dò Kim') },
              { id: 'SHORTAGE', label: t('f2s.receive.toolbar.shortage', '🟡 Thiếu SL') },
              { id: 'NO_SCAN', label: t('f2s.receive.toolbar.noScan', '⚪ Chưa Dò Kim') },
            ].map(tab => {
              const isActive = quickStatusFilter === tab.id;
              return (
                <Chip
                  key={tab.id}
                  label={tab.label}
                  size="small"
                  onClick={() => setQuickStatusFilter(tab.id as any)}
                  sx={{
                    fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer',
                    bgcolor: isActive ? '#0f172a' : '#f1f5f9',
                    color: isActive ? '#fff' : '#475569',
                    border: isActive ? 'none' : '1px solid #e2e8f0',
                    '&:hover': { bgcolor: isActive ? '#1e293b' : '#e2e8f0' }
                  }}
                />
              );
            })}
          </Box>

          <Button
            size="small"
            variant="outlined"
            onClick={handleSelectOnlyMatch}
            sx={{
              textTransform: 'none', fontWeight: 800, fontSize: '0.75rem', borderRadius: 2,
              borderColor: '#86efac', color: '#166534', bgcolor: '#f0fdf4',
              '&:hover': { bgcolor: '#dcfce7', borderColor: '#4ade80' }
            }}
          >
            {t('f2s.receive.selectMatchOnlyTooltip', '✨ Chỉ chọn các lô ĐỦ SL (Xanh)')}
          </Button>
        </Box>
      </Card>

      {/* Alerts */}
      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ borderRadius: 2 }}>{success}</Alert>}

      {/* Batch Action Bar */}
      {selectedKeys.size > 0 && (
        <Box sx={{ 
          p: 1.5, px: 2, borderRadius: 3, 
          bgcolor: '#f0fdf4', border: '1px solid #bbf7d0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 1.5,
          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.12)',
          animation: 'fadeInRow 0.2s ease-in-out'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TaskAltIcon sx={{ color: '#16a34a', fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#166534' }}>
                {t("f2s.receive.batchSelectedCount", "Đã chọn {{count}} PO", { count: selectedKeys.size })}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ my: 0.5, borderColor: '#bbf7d0' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#15803d' }}>
              {t("f2s.receive.totalBookLabel", "Tổng Book:")} <strong>{totalSelectedBook.toLocaleString()}</strong> pcs
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#15803d' }}>
              {t("f2s.receive.totalScanLabel", "Tổng Scan:")} <strong>{totalSelectedScan.toLocaleString()}</strong> pcs
            </Typography>
            {selectedShortageCount > 0 && (
              <Chip
                size="small"
                icon={<WarningIcon sx={{ fontSize: '14px !important', color: '#b45309 !important' }} />}
                label={t("f2s.receive.shortageWarningBadge", "{{count}} PO thiếu/chưa dò", { count: selectedShortageCount })}
                sx={{ bgcolor: '#fffbeb', color: '#b45309', fontWeight: 700, border: '1px solid #fde68a' }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={handleSelectOnlyMatch}
              sx={{ 
                textTransform: 'none', fontWeight: 700, borderRadius: 2, 
                borderColor: '#86efac', color: '#166534', bgcolor: '#fff',
                '&:hover': { bgcolor: '#f0fdf4', borderColor: '#4ade80' }
              }}
            >
              {t('f2s.receive.selectMatchOnlyShort', 'Chỉ chọn PO đủ SL (Xanh)')}
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={() => setSelectedKeys(new Set())}
              sx={{ textTransform: 'none', fontWeight: 600, color: '#64748b' }}
            >
              {t('f2s.receive.deselectShort', 'Bỏ chọn')}
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => setBatchConfirmOpen(true)}
              startIcon={<CheckIcon />}
              sx={{
                textTransform: 'none', fontWeight: 700, borderRadius: 2,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                px: 2,
                '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }
              }}
            >
              {t("f2s.receive.confirmSelectedBtn", "Xác nhận {{count}} PO đã chọn", { count: selectedKeys.size })}
            </Button>
          </Box>
        </Box>
      )}

      {/* Main List */}
      <Card elevation={0} sx={{ 
        border: '1px solid rgba(255, 255, 255, 0.4)', 
        borderRadius: '12px', 
        boxShadow: '0 10px 40px rgba(0,0,0,0.03), 0 2px 10px rgba(0,0,0,0.01)',
        bgcolor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0
      }}>
        {/* Summary moved to Header */}
        {/* Loading state */}
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {viewMode === 'list' ? (
              <>
                <TableContainer sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                  <Table stickyHeader size="small" sx={{ minWidth: 800 }}>
                    <TableHead>
                      <TableRow>
                        {/* Checkbox Header */}
                        <TableCell padding="checkbox" align="center" sx={{ bgcolor: 'background.default', borderBottom: '2px solid #e2e8f0', width: 48 }}>
                          <Checkbox
                            size="small"
                            checked={isAllVisibleSelected}
                            indeterminate={isSomeVisibleSelected}
                            onChange={handleSelectAllVisible}
                            sx={{
                              color: '#94a3b8',
                              '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: '#10b981' }
                            }}
                          />
                        </TableCell>

                        <TableCell sx={{ bgcolor: 'background.default', p: 1, borderBottom: '2px solid #e2e8f0', minWidth: 140 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 0.5 }}>
                            <Typography sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>PO Number</Typography>
                            <IconButton 
                              size="small" 
                              onClick={(e) => setPoFilterAnchorEl(e.currentTarget)} 
                              sx={{ 
                                color: (appliedFilters.po || sortConfig?.field === 'PONo') ? '#10b981' : '#94a3b8', 
                                p: 0.5,
                                bgcolor: (appliedFilters.po || sortConfig?.field === 'PONo') ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                borderRadius: 1
                              }}
                            >
                              <FilterIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <ExcelColumnFilter
                            open={Boolean(poFilterAnchorEl)}
                            anchorEl={poFilterAnchorEl}
                            onClose={() => setPoFilterAnchorEl(null)}
                            title={t("f2s.receive.filterPoTitle", "Lọc PO Number")}
                            options={poOptions}
                            selectedValues={appliedFilters.po ? appliedFilters.po.split(',').map(s => s.trim()).filter(Boolean) : []}
                            onApply={(selected) => {
                              const str = selected.join(',');
                              setFilterPO(str);
                              setAppliedFilters(prev => ({ ...prev, po: str }));
                              setPage(0);
                            }}
                            onClear={() => {
                              setFilterPO('');
                              setAppliedFilters(prev => ({ ...prev, po: '' }));
                              setPage(0);
                            }}
                            currentSort={sortConfig?.field === 'PONo' ? sortConfig.direction : null}
                            onSortAsc={() => setSortConfig({ field: 'PONo', direction: 'asc' })}
                            onSortDesc={() => setSortConfig({ field: 'PONo', direction: 'desc' })}
                          />
                        </TableCell>

                        <TableCell sx={{ bgcolor: 'background.default', p: 1, borderBottom: '2px solid #e2e8f0', minWidth: 140 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 0.5 }}>
                            <Typography sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Job No</Typography>
                            <IconButton 
                              size="small" 
                              onClick={(e) => setJobFilterAnchorEl(e.currentTarget)} 
                              sx={{ 
                                color: (appliedFilters.job || sortConfig?.field === 'JobNo') ? '#10b981' : '#94a3b8', 
                                p: 0.5,
                                bgcolor: (appliedFilters.job || sortConfig?.field === 'JobNo') ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                borderRadius: 1
                              }}
                            >
                              <FilterIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <ExcelColumnFilter
                            open={Boolean(jobFilterAnchorEl)}
                            anchorEl={jobFilterAnchorEl}
                            onClose={() => setJobFilterAnchorEl(null)}
                            title={t("f2s.receive.filterJobTitle", "Lọc Job No")}
                            options={jobOptions}
                            selectedValues={appliedFilters.job ? appliedFilters.job.split(',').map(s => s.trim()).filter(Boolean) : []}
                            onApply={(selected) => {
                              const str = selected.join(',');
                              setFilterJob(str);
                              setAppliedFilters(prev => ({ ...prev, job: str }));
                              setPage(0);
                            }}
                            onClear={() => {
                              setFilterJob('');
                              setAppliedFilters(prev => ({ ...prev, job: '' }));
                              setPage(0);
                            }}
                            currentSort={sortConfig?.field === 'JobNo' ? sortConfig.direction : null}
                            onSortAsc={() => setSortConfig({ field: 'JobNo', direction: 'asc' })}
                            onSortDesc={() => setSortConfig({ field: 'JobNo', direction: 'desc' })}
                          />
                        </TableCell>

                        <TableCell sx={{ bgcolor: 'background.default', p: 1, borderBottom: '2px solid #e2e8f0', minWidth: 140 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 0.5 }}>
                            <Typography sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>{t("f2s.receive.col.line", "Chuyền")}</Typography>
                            <IconButton 
                              size="small" 
                              onClick={(e) => setLineFilterAnchorEl(e.currentTarget)} 
                              sx={{ 
                                color: (appliedFilters.line || sortConfig?.field === 'FacLine') ? '#10b981' : '#94a3b8', 
                                p: 0.5,
                                bgcolor: (appliedFilters.line || sortConfig?.field === 'FacLine') ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                borderRadius: 1
                              }}
                            >
                              <FilterIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <ExcelColumnFilter
                            open={Boolean(lineFilterAnchorEl)}
                            anchorEl={lineFilterAnchorEl}
                            onClose={() => setLineFilterAnchorEl(null)}
                            title={t("f2s.receive.filterLineTitle", "Lọc Chuyền May")}
                            options={lineOptions}
                            selectedValues={appliedFilters.line ? appliedFilters.line.split(',').map(s => s.trim()).filter(Boolean) : []}
                            onApply={(selected) => {
                              const str = selected.join(',');
                              setFilterLine(str);
                              setAppliedFilters(prev => ({ ...prev, line: str }));
                              setPage(0);
                            }}
                            onClear={() => {
                              setFilterLine('');
                              setAppliedFilters(prev => ({ ...prev, line: '' }));
                              setPage(0);
                            }}
                            currentSort={sortConfig?.field === 'FacLine' ? sortConfig.direction : null}
                            onSortAsc={() => setSortConfig({ field: 'FacLine', direction: 'asc' })}
                            onSortDesc={() => setSortConfig({ field: 'FacLine', direction: 'desc' })}
                          />
                        </TableCell>
                        <TableCell sx={{ bgcolor: 'background.default', p: 1, borderBottom: '2px solid #e2e8f0', verticalAlign: 'middle', minWidth: 140 }}>
                          <Box 
                            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 0.5, cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => {
                              setSortConfig(prev => {
                                if (prev?.field === 'DateCreate' && prev.direction === 'desc') return { field: 'DateCreate', direction: 'asc' };
                                if (prev?.field === 'DateCreate' && prev.direction === 'asc') return null;
                                return { field: 'DateCreate', direction: 'desc' };
                              });
                            }}
                          >
                            <Typography sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>{t("f2s.receive.col.bookTime", "Thời Gian Giao")}</Typography>
                            {sortConfig?.field === 'DateCreate' && (
                              <Typography component="span" sx={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 900 }}>
                                {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ bgcolor: 'background.default', p: 1, borderBottom: '2px solid #e2e8f0', verticalAlign: 'middle', minWidth: 130 }}>
                          <Typography sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>{t("f2s.receive.col.colorSize", "Màu / Size")}</Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ bgcolor: 'background.default', p: 1, borderBottom: '2px solid #e2e8f0', verticalAlign: 'middle', minWidth: 90 }}>
                          <Box 
                            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => {
                              setSortConfig(prev => {
                                if (prev?.field === 'TotalQty' && prev.direction === 'desc') return { field: 'TotalQty', direction: 'asc' };
                                if (prev?.field === 'TotalQty' && prev.direction === 'asc') return null;
                                return { field: 'TotalQty', direction: 'desc' };
                              });
                            }}
                          >
                            <Typography sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>SL Book</Typography>
                            {sortConfig?.field === 'TotalQty' && (
                              <Typography component="span" sx={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 900 }}>
                                {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ bgcolor: 'background.default', p: 1, borderBottom: '2px solid #e2e8f0', verticalAlign: 'middle', minWidth: 110 }}>
                          <Box 
                            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => {
                              setSortConfig(prev => {
                                if (prev?.field === 'ScanQty' && prev.direction === 'desc') return { field: 'ScanQty', direction: 'asc' };
                                if (prev?.field === 'ScanQty' && prev.direction === 'asc') return null;
                                return { field: 'ScanQty', direction: 'desc' };
                              });
                            }}
                          >
                            <Typography sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>{t("f2s.receive.col.scanQty", "SL Scan (Dò Kim)")}</Typography>
                            {sortConfig?.field === 'ScanQty' && (
                              <Typography component="span" sx={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 900 }}>
                                {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ bgcolor: 'background.default', p: 1, borderBottom: '2px solid #e2e8f0', verticalAlign: 'middle', minWidth: 120 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <Typography sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>{t("f2s.receive.col.status", "Đối Chiếu")}</Typography>
                            <IconButton 
                              size="small" 
                              onClick={(e) => setStatusFilterAnchorEl(e.currentTarget)} 
                              sx={{ 
                                color: (filterStatus.length > 0 || sortConfig?.field === 'scanStatus') ? '#10b981' : '#94a3b8', 
                                p: 0.5,
                                bgcolor: (filterStatus.length > 0 || sortConfig?.field === 'scanStatus') ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                borderRadius: 1
                              }}
                            >
                              <FilterIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <ExcelColumnFilter
                            open={Boolean(statusFilterAnchorEl)}
                            anchorEl={statusFilterAnchorEl}
                            onClose={() => setStatusFilterAnchorEl(null)}
                            title={t("f2s.receive.filterStatusTitle", "Lọc Đối Chiếu SL")}
                            options={statusOptions}
                            selectedValues={filterStatus}
                            onApply={(selected) => {
                              setFilterStatus(selected);
                              setPage(0);
                            }}
                            onClear={() => {
                              setFilterStatus([]);
                              setPage(0);
                            }}
                            currentSort={sortConfig?.field === 'scanStatus' ? sortConfig.direction : null}
                            onSortAsc={() => setSortConfig({ field: 'scanStatus', direction: 'asc' })}
                            onSortDesc={() => setSortConfig({ field: 'scanStatus', direction: 'desc' })}
                            allowCustomValue={false}
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ bgcolor: 'background.default', p: 1, borderBottom: '2px solid #e2e8f0', verticalAlign: 'middle', minWidth: 90 }}>
                          <Typography sx={{ fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>{t("f2s.receive.col.action", "Thao Tác")}</Typography>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableContent}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {/* Pagination Controls */}
                {data.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600 }}>{t("f2s.receive.rowsPerPage", "Số dòng:")}</Typography>
                      <Select
                        size="small"
                        value={rowsPerPage}
                        onChange={(e) => {
                          setRowsPerPage(Number(e.target.value));
                          setPage(0);
                        }}
                        sx={{ height: 32, bgcolor: 'background.paper', borderRadius: 1.5, fontSize: '0.875rem', fontWeight: 600, minWidth: 70 }}
                      >
                        {[20, 50, 100].map(v => <MenuItem key={v} value={v} sx={{ fontWeight: 600 }}>{v}</MenuItem>)}
                      </Select>
                      <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500, display: { xs: 'none', sm: 'block' } }}>
                        {t("f2s.receive.pageOf", "{{from}} - {{to}} của {{total}}", { from: page * rowsPerPage + 1, to: Math.min((page + 1) * rowsPerPage, totalItems), total: totalItems })}
                      </Typography>
                    </Box>
                    <Pagination 
                      count={Math.ceil(totalItems / rowsPerPage) || 1} 
                      page={page + 1} 
                      onChange={(e, val) => setPage(val - 1)}
                      color="primary" 
                      shape="rounded"
                      showFirstButton 
                      showLastButton
                      siblingCount={0}
                      boundaryCount={1}
                      sx={{
                        '& .MuiPaginationItem-root': { fontWeight: 700, borderRadius: 1.5 },
                        '& .Mui-selected': { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }
                      }}
                    />
                  </Box>
                )}
              </>
            ) : (
              /* Gom Chuyền View (Nhận theo Xe Hàng - Danh sách thẻ Chuyền thông minh) */
              <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0, p: { xs: 1.5, md: 2 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {Object.keys(groupedByLine).length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8, color: '#94a3b8' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{t("f2s.receive.groupNoCart", "Không tìm thấy xe hàng nào phù hợp với bộ lọc")}</Typography>
                  </Box>
                ) : (
                  Object.keys(groupedByLine).map(line => {
                    const items = groupedByLine[line];
                    const matchCount = items.filter(i => getScanStatus(i) === 'MATCH').length;
                    const shortageCount = items.filter(i => getScanStatus(i) === 'SHORTAGE').length;
                    const noScanCount = items.filter(i => getScanStatus(i) === 'NO_SCAN').length;
                    const selectedInLineCount = items.filter(i => selectedKeys.has(getRowKey(i))).length;
                    const lineTotalBook = items.reduce((s, i) => s + getBookQty(i), 0);
                    const lineTotalScan = items.reduce((s, i) => s + getScanQty(i), 0);

                    return (
                      <Card 
                        key={line} 
                        elevation={0}
                        onClick={() => {
                          setLineModalLine(line);
                          setLineModalSearch('');
                        }}
                        sx={{ 
                          p: { xs: 1.5, sm: 1.75 }, 
                          borderRadius: 3, 
                          border: selectedInLineCount > 0 ? '2px solid #10b981' : '1px solid #e2e8f0', 
                          bgcolor: selectedInLineCount > 0 ? '#f0fdf4' : '#ffffff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: '#10b981',
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.12)',
                            transform: 'translateY(-1px)'
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
                          {/* Left: Line Badge & Cart Stats */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                            <Chip 
                              label={`${t('f2s.receive.toolbar.linePrefix', 'Chuyền')} ${line}`} 
                              sx={{ 
                                bgcolor: '#1d4ed8', 
                                color: '#fff', 
                                fontWeight: 800, 
                                fontSize: '0.85rem', 
                                height: 32,
                                boxShadow: '0 2px 6px rgba(29, 78, 216, 0.25)'
                              }} 
                            />
                            <Typography variant="body2" sx={{ color: '#334155', fontWeight: 700, fontSize: '0.85rem' }}>
                              {t('f2s.receive.group.totalPo', 'Tổng đơn')}: <strong>{items.length}</strong> {t('f2s.receive.kpi.lots', 'lô')}
                            </Typography>
                            
                            <Chip 
                              size="small" 
                              label={`${matchCount}/${items.length} ${t('f2s.receive.status.match', 'Đủ SL')}`} 
                              sx={{ 
                                bgcolor: matchCount === items.length ? '#dcfce7' : '#ecfdf5', 
                                color: '#047857', 
                                fontWeight: 800, 
                                border: '1px solid #a7f3d0', 
                                fontSize: '0.73rem' 
                              }} 
                            />

                            {shortageCount > 0 && (
                              <Chip 
                                size="small" 
                                label={`${shortageCount} ${t('f2s.receive.group.shortage', 'Thiếu')}`} 
                                sx={{ bgcolor: '#fffbeb', color: '#b45309', fontWeight: 700, border: '1px solid #fde68a', fontSize: '0.73rem' }} 
                              />
                            )}

                            {noScanCount > 0 && (
                              <Chip 
                                size="small" 
                                label={`${noScanCount} ${t('f2s.receive.group.noScan', 'Chưa scan')}`} 
                                sx={{ bgcolor: '#f8fafc', color: '#64748b', fontWeight: 600, border: '1px solid #e2e8f0', fontSize: '0.73rem' }} 
                              />
                            )}

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: { xs: 0, sm: 0.5 }, flexWrap: 'wrap' }}>
                              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.78rem' }}>
                                {t('f2s.receive.group.totalBookQty', 'Tổng SL giao')}: <strong style={{ color: '#ea580c' }}>{lineTotalBook.toLocaleString()}</strong> pcs
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#94a3b8', display: { xs: 'none', sm: 'inline' } }}>•</Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.78rem' }}>
                                {t('f2s.receive.group.totalScanQty', 'Tổng Scan:')} <strong style={{ color: '#059669' }}>{lineTotalScan.toLocaleString()}</strong> pcs
                              </Typography>
                            </Box>

                            {selectedInLineCount > 0 && (
                              <Chip 
                                size="small"
                                label={`${t("f2s.receive.batchSelectedCount", "Đã chọn {{count}} PO", { count: selectedInLineCount })} / ${items.length}`}
                                sx={{ bgcolor: '#10b981', color: '#fff', fontWeight: 800, fontSize: '0.73rem' }}
                              />
                            )}
                          </Box>

                          {/* Right: Actions */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => {
                                setLineModalLine(line);
                                setLineModalSearch('');
                              }}
                              sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                borderRadius: 2,
                                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                color: '#fff',
                                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
                                px: 2,
                                '&:hover': { background: 'linear-gradient(135deg, #0369a1 0%, #075985 100%)' }
                              }}
                            >
                              {t('f2s.receive.btn.viewAndSelectPo', '📂 Xem & Chọn PO')} ({items.length})
                            </Button>
                          </Box>
                        </Box>
                      </Card>
                    );
                  })
                )}
              </Box>
            )}
          </>
        )}
      </Card>

      {/* Modal Chi Tiết PO của 1 Chuyền */}
      <Dialog 
        open={Boolean(lineModalLine)} 
        onClose={() => setLineModalLine(null)} 
        maxWidth="lg" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh', display: 'flex', flexDirection: 'column' } }}
      >
        <DialogTitle sx={{ 
          p: 2, px: 2.5, 
          borderBottom: '1px solid #e2e8f0', 
          bgcolor: '#f8fafc',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Chip 
              label={`🏢 ${t('f2s.receive.toolbar.linePrefix', 'Chuyền')} ${lineModalLine}`} 
              sx={{ bgcolor: '#1d4ed8', color: '#fff', fontWeight: 800, fontSize: '0.9rem', height: 32 }} 
            />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', lineHeight: 1.2 }}>
                {t('f2s.receive.lineModal.title', 'Chi Tiết PO Cần Nhận - Chuyền {{line}}', { line: lineModalLine })}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                {t('f2s.receive.lineModalDesc', 'Gồm {{total}} lô PO • Book: {{book}} pcs • Scan: {{scan}} pcs', { total: lineModalStats.total, book: lineModalStats.book.toLocaleString(), scan: lineModalStats.scan.toLocaleString() })}
              </Typography>
            </Box>
          </Box>

          <IconButton onClick={() => setLineModalLine(null)} size="small" sx={{ color: '#64748b' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* Modal Toolbar & Fast Filter */}
        <Box sx={{ p: 1.5, px: 2.5, bgcolor: '#ffffff', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
          <TextField
            size="small"
            placeholder={t('f2s.receive.lineModal.searchPlaceholder', 'Tìm nhanh PO trong Chuyền...')}
            value={lineModalSearch}
            onChange={(e) => setLineModalSearch(e.target.value)}
            sx={{ 
              width: { xs: '100%', sm: 320 },
              '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.82rem', bgcolor: '#f8fafc' }
            }}
            InputProps={{
              endAdornment: lineModalSearch ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setLineModalSearch('')}>
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                if (!lineModalLine || !groupedByLine[lineModalLine]) return;
                const newKeys = new Set(selectedKeys);
                groupedByLine[lineModalLine].forEach((r: any) => newKeys.add(getRowKey(r)));
                setSelectedKeys(newKeys);
              }}
              sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', borderRadius: 2, borderColor: '#cbd5e1', color: '#1e293b' }}
            >
              {t('f2s.receive.btn.selectAll', '✓ Chọn tất cả')} ({lineModalStats.total})
            </Button>

            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                if (!lineModalLine || !groupedByLine[lineModalLine]) return;
                const newKeys = new Set(selectedKeys);
                groupedByLine[lineModalLine].forEach((r: any) => {
                  if (getScanStatus(r) === 'MATCH') newKeys.add(getRowKey(r));
                });
                setSelectedKeys(newKeys);
              }}
              sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', borderRadius: 2, borderColor: '#86efac', color: '#166534', bgcolor: '#f0fdf4' }}
            >
              {t('f2s.receive.btn.selectMatchOnly', '✨ Chỉ chọn Đủ SL')} ({lineModalStats.match})
            </Button>

            <Button
              size="small"
              variant="text"
              onClick={() => {
                if (!lineModalLine || !groupedByLine[lineModalLine]) return;
                const newKeys = new Set(selectedKeys);
                groupedByLine[lineModalLine].forEach((r: any) => newKeys.delete(getRowKey(r)));
                setSelectedKeys(newKeys);
              }}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}
            >
              {t('f2s.receive.btn.deselectAll', 'Bỏ chọn')}
            </Button>
          </Box>
        </Box>

        {/* Modal Content: Table of POs */}
        <DialogContent sx={{ p: 0, flex: 1, overflow: 'auto', minHeight: 0 }}>
          <TableContainer sx={{ maxHeight: 'calc(80vh - 200px)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" align="center" sx={{ bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', width: 48 }}>
                    <Checkbox
                      size="small"
                      checked={lineModalItems.length > 0 && lineModalItems.every(r => selectedKeys.has(getRowKey(r)))}
                      indeterminate={lineModalItems.some(r => selectedKeys.has(getRowKey(r))) && !lineModalItems.every(r => selectedKeys.has(getRowKey(r)))}
                      onChange={(e) => {
                        const newKeys = new Set(selectedKeys);
                        if (e.target.checked) {
                          lineModalItems.forEach(r => newKeys.add(getRowKey(r)));
                        } else {
                          lineModalItems.forEach(r => newKeys.delete(getRowKey(r)));
                        }
                        setSelectedKeys(newKeys);
                      }}
                      sx={{ color: '#94a3b8', '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: '#10b981' } }}
                    />
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>PO NUMBER</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>JOB NO</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>{t('f2s.receive.col.colorSize', 'Màu / Size')}</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>{t('f2s.receive.col.bookTime', 'Thời Gian Giao')}</TableCell>
                  <TableCell align="center" sx={{ bgcolor: '#f8fafc', fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>SL BOOK</TableCell>
                  <TableCell align="center" sx={{ bgcolor: '#f8fafc', fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>{t('f2s.receive.col.scanQty', 'SL Scan (Dò Kim)')}</TableCell>
                  <TableCell align="center" sx={{ bgcolor: '#f8fafc', fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>{t('f2s.receive.col.status', 'Đối Chiếu')}</TableCell>
                  <TableCell align="center" sx={{ bgcolor: '#f8fafc', fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>{t('f2s.receive.col.action', 'Thao Tác')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lineModalItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                      {t("f2s.receive.lineModalNoData", "Không tìm thấy PO nào phù hợp với từ khóa tìm kiếm")}
                    </TableCell>
                  </TableRow>
                ) : (
                  lineModalItems.map((row: any) => {
                    const key = getRowKey(row);
                    const isSelected = selectedKeys.has(key);
                    const status = getScanStatus(row);
                    const bookQty = getBookQty(row);
                    const scanQty = getScanQty(row);

                    return (
                      <TableRow 
                        key={key}
                        hover
                        selected={isSelected}
                        onClick={() => openConfirmDialog(row)}
                        sx={{ 
                          cursor: 'pointer',
                          '&.Mui-selected': { bgcolor: 'rgba(16, 185, 129, 0.08) !important' }
                        }}
                      >
                        <TableCell 
                          padding="checkbox" 
                          align="center" 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectRow(row);
                          }}
                        >
                          <Checkbox
                            size="small"
                            checked={isSelected}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleSelectRow(row)}
                            sx={{ color: '#94a3b8', '&.Mui-checked': { color: '#10b981' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {row.PONo}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#475569', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {row.JobNo || '—'}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#334155', fontSize: '0.8rem' }}>
                          {row.ColorName || row.ColorID || '—'} / {row.SizeName || row.SizeID || '—'}
                        </TableCell>
                        <TableCell sx={{ color: '#64748b', fontSize: '0.78rem' }}>
                          {formatDateTime(row.DateCreate)}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#ea580c', fontSize: '0.85rem' }}>
                          {bookQty.toLocaleString()}
                        </TableCell>
                        <TableCell align="center">
                          {status === 'MATCH' && (
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: '#ecfdf5', color: '#047857', px: 1, py: 0.3, borderRadius: 1.5, fontWeight: 800, border: '1px solid #a7f3d0' }}>
                              <CheckCircleIcon sx={{ fontSize: 14, color: '#10b981' }} />
                              {scanQty.toLocaleString()}
                            </Box>
                          )}
                          {status === 'SHORTAGE' && (
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: '#fffbeb', color: '#b45309', px: 1, py: 0.3, borderRadius: 1.5, fontWeight: 800, border: '1px solid #fde68a' }}>
                              <WarningIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                              {scanQty.toLocaleString()}
                            </Box>
                          )}
                          {status === 'NO_SCAN' && (
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#94a3b8' }}>0</Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {status === 'MATCH' && (
                            <Chip size="small" label={t('f2s.receive.status.match', 'Đủ SL')} sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700, border: '1px solid #a7f3d0' }} />
                          )}
                          {status === 'SHORTAGE' && (
                            <Chip size="small" label={t('f2s.receive.status.shortage', 'Thiếu {{qty}}', { qty: (bookQty - scanQty).toLocaleString() })} sx={{ bgcolor: '#fffbeb', color: '#b45309', fontWeight: 700, border: '1px solid #fde68a' }} />
                          )}
                          {status === 'NO_SCAN' && (
                            <Chip size="small" label={t('f2s.receive.status.noScan', 'Chưa dò kim')} sx={{ bgcolor: '#f8fafc', color: '#94a3b8', fontWeight: 600, border: '1px solid #e2e8f0' }} />
                          )}
                        </TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => openConfirmDialog(row)}
                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, px: 1.5, py: 0.2, fontSize: '0.72rem', borderColor: '#cbd5e1', color: '#334155' }}
                          >
                            {t('f2s.receive.btn.inspect', 'Kiểm hàng')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>

        {/* Modal Footer */}
        <DialogActions sx={{ p: 2, px: 2.5, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
              {t("f2s.receive.lineModalSelectedSummary", "Đã chọn: {{selected}} / {{total}} PO của Chuyền {{line}}", { selected: lineModalStats.selected, total: lineModalStats.total, line: lineModalLine })}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button onClick={() => setLineModalLine(null)} sx={{ textTransform: 'none', fontWeight: 600, color: '#64748b' }}>
              {t('f2s.receive.btn.close', 'Đóng')}
            </Button>
            {lineModalStats.selected > 0 && (
              <Button
                variant="contained"
                onClick={() => {
                  setBatchConfirmOpen(true);
                }}
                startIcon={<CheckIcon />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                  px: 2.5
                }}
              >
                {t('f2s.receive.btn.receiveSelected', '✓ Nhận các PO đã chọn')} ({lineModalStats.selected})
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>

      {/* Validation Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
          {t('f2s.receive.dialog.title', 'Xác Nhận Nhập Kho')}
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 6 }}>
          {selectedRow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 5 }}>
                  <Typography variant="body2" color="text.secondary">{t("f2s.receive.fieldPo", "Số PO:")}</Typography>
                </Grid>
                <Grid size={{ xs: 7 }}>
                  <Typography variant="body2" fontWeight={700}>{selectedRow.PONo}</Typography>
                </Grid>
                <Grid size={{ xs: 5 }}>
                  <Typography variant="body2" color="text.secondary">Job No:</Typography>
                </Grid>
                <Grid size={{ xs: 7 }}>
                  <Typography variant="body2" fontWeight={700}>{selectedRow.JobNo || '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 5 }}>
                  <Typography variant="body2" color="text.secondary">{t("f2s.receive.fieldLine", "Chuyền gửi:")}</Typography>
                </Grid>
                <Grid size={{ xs: 7 }}>
                  <Typography variant="body2" fontWeight={700}>{selectedRow.FacLine}</Typography>
                </Grid>
                <Grid size={{ xs: 5 }}>
                  <Typography variant="body2" color="text.secondary">{t("f2s.receive.fieldExporter", "Người giao:")}</Typography>
                </Grid>
                <Grid size={{ xs: 7 }}>
                  <Typography variant="body2" fontWeight={700}>{selectedRow.Exporter || '—'}</Typography>
                </Grid>
              </Grid>

              <Box sx={{ mt: 1, p: 2, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b', mb: 1 }}>
                  {t('f2s.receive.dialog.expectedQty', 'SỐ LƯỢNG HÀNG XƯỞNG BÁO (Expected)')}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  {expectedQtyValue.toLocaleString()} <Typography component="span" variant="body1" color="text.secondary">pcs</Typography>
                </Typography>
              </Box>

              <TextField
                fullWidth
                label={t('f2s.receive.dialog.actualQty', 'Số lượng thực tế nhận được (Actual)')}
                value={actualQty}
                onChange={(e) => {
                  // Chỉ chấp nhận các ký số nguyên từ 0-9 (loại bỏ hoàn toàn dấu âm, dấu thập phân và chữ cái)
                  const clean = e.target.value.replace(/[^0-9]/g, '');
                  setActualQty(clean);
                }}
                onKeyDown={(e) => {
                  // Chặn nhập dấu trừ (-), dấu cộng (+), dấu chấm (.), phẩy (,), chữ e/E
                  if (['-', '+', '.', ',', 'e', 'E'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                inputProps={{
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                }}
                onFocus={(e) => {
                  setIsKeyboardOpen(true);
                  setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 250);
                }}
                onBlur={() => {
                  setTimeout(() => setIsKeyboardOpen(false), 200);
                }}
                InputLabelProps={{ shrink: true }}
                sx={{
                  mt: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    fontWeight: 700,
                    fontSize: '1.2rem',
                    color: isMismatch ? '#ef4444' : '#10b981',
                    '&.Mui-focused fieldset': { 
                      borderColor: isMismatch ? '#ef4444' : '#10b981' 
                    }
                  }
                }}
              />

              {isMismatch && (
                <Alert severity="warning" icon={<WarningIcon />} sx={{ borderRadius: 2, mt: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {t('f2s.receive.dialog.mismatchWarning', 'Cảnh báo! Số lượng nhận không khớp với số lượng xưởng gửi.')}
                  </Typography>
                </Alert>
              )}
              
              {/* Force massive spacer ONLY when keyboard is summoned to avoid ugly permanent whitespace */}
              {isKeyboardOpen && <Box className="animate-slide-up" sx={{ height: 120, opacity: 0, pointerEvents: 'none' }} />}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
          <Button onClick={closeDialog} disabled={actionLoading} color="inherit" sx={{ fontWeight: 600 }}>
            {t('f2s.receive.btn.close', 'Đóng')}
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={actionLoading} 
            variant="contained" 
            disableElevation
            startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
            sx={{ fontWeight: 600, borderRadius: 2, bgcolor: isMismatch ? '#f59e0b' : '#3ba55c', '&:hover': { bgcolor: isMismatch ? '#d97706' : '#2e7d32' } }}
          >
            {actionLoading ? t('common.processing', 'Đang xử lý...') : (isMismatch ? t('f2s.receive.dialog.confirmMismatch', 'Xác nhận Bất Thường') : t('f2s.receive.dialog.confirmMatch', 'Nhận Đủ'))}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Batch Confirm Dialog */}
      <Dialog 
        open={batchConfirmOpen} 
        onClose={() => !actionLoading && setBatchConfirmOpen(false)} 
        maxWidth="md" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', borderBottom: '1px solid', borderColor: 'divider', pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TaskAltIcon sx={{ color: '#10b981' }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {t('f2s.receive.batchDialog.title', 'Xác Nhận Hàng Loạt ({{count}} PO)', { count: selectedRows.length })}
            </Typography>
          </Box>
          <IconButton onClick={() => setBatchConfirmOpen(false)} disabled={actionLoading} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5, pb: 3 }}>
          {/* Summary Box */}
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mt: 1, mb: 2.5, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('f2s.receive.batchDialog.selectedPo', 'SỐ LƯỢNG PO ĐÃ CHỌN')}</Typography>
              <Typography variant="h6" fontWeight={800} color="#0f172a">{selectedRows.length}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('f2s.receive.batchDialog.totalBookQty', 'TỔNG SL BOOK')}</Typography>
              <Typography variant="h6" fontWeight={800} color="#ea580c">{totalSelectedBook.toLocaleString()} pcs</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('f2s.receive.batchDialog.totalScanQty', 'TỔNG SL SCAN')}</Typography>
              <Typography variant="h6" fontWeight={800} color="#10b981">{totalSelectedScan.toLocaleString()} pcs</Typography>
            </Box>
          </Box>

          {/* Warning if shortage exists */}
          {selectedShortageCount > 0 && (
            <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2, borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={700}>
                {t("f2s.receive.batchWarningMsg", "Cảnh báo: Có {{count}} PO được chọn đang thiếu số lượng hoặc chưa qua máy dò kim!", { count: selectedShortageCount })}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                {t("f2s.receive.batchWarningSub", "Hệ thống chỉ xác nhận và xóa khỏi danh sách chờ các PO được chọn này. Các PO còn lại sẽ được giữ nguyên chờ chuyền điều chỉnh.")}
              </Typography>
            </Alert>
          )}

          {/* Processing Indicator */}
          {actionLoading && (
            <Box sx={{ my: 2 }}>
              <LinearProgress sx={{ height: 6, borderRadius: 1 }} color="success" />
              <Typography variant="caption" sx={{ color: '#64748b', mt: 1, display: 'block', textAlign: 'center', fontWeight: 600 }}>
                {t("f2s.receive.batchProcessing", "Đang xử lý xác nhận các PO đã chọn... Vui lòng không đóng trang.")}
              </Typography>
            </Box>
          )}

          {/* Table preview */}
          <TableContainer sx={{ maxHeight: 280, border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>PO Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Job No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('f2s.receive.col.line', 'Chuyền')}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>SL Book</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>SL Scan</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>{t('f2s.receive.col.status', 'Đối Chiếu')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedRows.map((r, i) => {
                  const bQty = getBookQty(r);
                  const sQty = getScanQty(r);
                  const st = getScanStatus(r);
                  return (
                    <TableRow key={getRowKey(r) || i}>
                      <TableCell sx={{ fontWeight: 600 }}>{r.PONo}</TableCell>
                      <TableCell>{r.JobNo || '—'}</TableCell>
                      <TableCell><Chip size="small" label={r.FacLine} sx={{ fontWeight: 600 }} /></TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: '#ea580c' }}>{bQty.toLocaleString()}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: st === 'MATCH' ? '#10b981' : (st === 'SHORTAGE' ? '#f59e0b' : '#94a3b8') }}>
                        {sQty.toLocaleString()}
                      </TableCell>
                      <TableCell align="center">
                        {st === 'MATCH' && <Chip size="small" label={t('f2s.receive.status.match', 'Đủ SL')} sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700 }} />}
                        {st === 'SHORTAGE' && <Chip size="small" label={t('f2s.receive.status.shortage', 'Thiếu {{qty}}', { qty: (bQty - sQty).toLocaleString() })} sx={{ bgcolor: '#fffbeb', color: '#b45309', fontWeight: 700 }} />}
                        {st === 'NO_SCAN' && <Chip size="small" label={t('f2s.receive.status.noScan', 'Chưa dò kim')} sx={{ bgcolor: '#f8fafc', color: '#94a3b8', fontWeight: 600 }} />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
          <Button onClick={() => setBatchConfirmOpen(false)} disabled={actionLoading} color="inherit" sx={{ fontWeight: 600 }}>
            {t('f2s.receive.btn.cancel', 'Hủy')}
          </Button>
          <Button 
            onClick={handleBatchConfirm} 
            disabled={actionLoading} 
            variant="contained" 
            disableElevation
            startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <TaskAltIcon />}
            sx={{ 
              fontWeight: 700, 
              borderRadius: 2, 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' } 
            }}
          >
            {actionLoading ? t('common.processing', 'Đang xử lý...') : t('f2s.receive.batchDialog.confirmAll', 'Xác nhận tất cả ({{count}} PO)', { count: selectedRows.length })}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PHYSICAL SPACER BLOCK */}
      <Box sx={{ height: { xs: '100px', md: 0 }, width: '100%', flexShrink: 0 }} />

      {/* History Dialog */}
      <Dialog 
        open={historyDialogOpen} 
        onClose={() => setHistoryDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: '12px', overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', borderBottom: '1px solid', borderColor: 'divider', pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t("f2s.receive.historyTitle", "Lịch sử xác nhận")}
          <IconButton onClick={() => setHistoryDialogOpen(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {historyLoading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={32} />
              <Typography sx={{ mt: 2, color: '#64748b' }}>{t("f2s.receive.historyLoading", "Đang tải lịch sử...")}</Typography>
            </Box>
          ) : historyData.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: '#64748b' }}>{t("f2s.receive.historyEmpty", "Chưa có lịch sử xác nhận nào.")}</Typography>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'background.default' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>{t("f2s.receive.historyColTime", "TG Cập Nhật")}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t("f2s.receive.historyColUser", "Người XN")}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{t("f2s.receive.historyColQty", "SL Nhận")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyData.map((h, i) => (
                    <TableRow key={i}>
                      <TableCell>{new Date(h.SysCreateDate || h.sysCreateDate).toLocaleString()}</TableCell>
                      <TableCell><Chip size="small" label={h.CreatedBy || h.createdBy} sx={{ fontWeight: 600, bgcolor: 'background.default' }} /></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#3ba55c' }}>{Number(h.Qty || h.qty).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
