import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, CircularProgress, IconButton, InputAdornment, Paper,
  MenuItem, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
  Menu, Checkbox, Divider, useTheme, useMediaQuery, Autocomplete,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Snackbar, Alert,
  Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ClearIcon from '@mui/icons-material/Clear';
import PrintIcon from '@mui/icons-material/Print';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FilterListIcon from '@mui/icons-material/FilterList';
import SyncIcon from '@mui/icons-material/Sync';
import TextureIcon from '@mui/icons-material/Texture';
import LaunchIcon from '@mui/icons-material/Launch';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { authService, AppButton, AppTextField, AdvancedFilterDrawer, columnFilterStore, TableExcelColumnMenu } from '@traxeco/shared';
import { format } from 'date-fns';
import { exportYardageInventoryToExcel } from '../utils/excelExport';
import { rdItemApi } from '../services/rdMaterialApi';
import type { Item } from '../types';
import GenericItemFormDrawer from '../components/GenericItemFormDrawer';
import SwipeableItem from '../components/ui/SwipeableItem';
import { useTranslation } from 'react-i18next';
import { useDragScroll } from '../hooks/useDragScroll';

const BASE = '/rd-material';

const getStickyHeaderStyle = (colId: string, filteredCols: any[]) => {
  const stickyIds = ['Image', 'Name', 'Item Code'];
  if (!stickyIds.includes(colId)) return {};
  
  let left = 0;
  for (const c of filteredCols) {
    if (c.id === colId) break;
    if (stickyIds.includes(c.id)) {
      if (c.id === 'Image') left += 80;
      else if (c.id === 'Name') left += 200;
      else if (c.id === 'Item Code') left += 150;
    }
  }
  
  return {
    position: 'sticky',
    left,
    zIndex: 12,
    bgcolor: '#F9FAFA',
    borderRight: colId === 'Item Code' ? '2px solid #bfc9c4' : undefined,
  };
};

const getStickyBodyStyle = (colId: string, filteredCols: any[], rowBgColor: string) => {
  const stickyIds = ['Image', 'Name', 'Item Code'];
  if (!stickyIds.includes(colId)) return {};
  
  let left = 0;
  for (const c of filteredCols) {
    if (c.id === colId) break;
    if (stickyIds.includes(c.id)) {
      if (c.id === 'Image') left += 80;
      else if (c.id === 'Name') left += 200;
      else if (c.id === 'Item Code') left += 150;
    }
  }
  
  return {
    position: 'sticky',
    left,
    zIndex: 10,
    bgcolor: rowBgColor,
    borderRight: colId === 'Item Code' ? '2px solid #bfc9c4' : undefined,
  };
};

const InfoRow = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <Box sx={{ py: 1.25, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
    <Typography component="div" sx={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
    </Typography>
    <Typography component="div" sx={{ fontSize: 13, color: value ? '#0f172a' : '#94a3b8', fontWeight: 600, textAlign: 'right' }}>
      {value ?? '—'}
    </Typography>
  </Box>
);

const YardageListPage: React.FC = () => {
  const navigate = useNavigate();
  const locationState = useLocation().state as { keyword?: string; parentId?: number } | null;
  const stateKeyword = locationState?.keyword;
  const stateParentId = locationState?.parentId;

  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const STORAGE_KEY = `rd-material-state-YARDAGE`;
  const pageCode = 'rd_yardage';
  const canEdit = authService.hasAction(pageCode, 'canEdit');
  const canDelete = authService.hasAction(pageCode, 'canDelete');
  const canAdd = authService.hasAction(pageCode, 'canAdd');

  const getInitialState = () => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {};
  };
  const init = getInitialState();

  const [items, setItems] = useState<Item[]>(stateParentId || stateKeyword ? [] : (init.items ?? []));
  const [total, setTotal] = useState(stateParentId || stateKeyword ? 0 : (init.total ?? 0));
  const [page, setPage] = useState(stateParentId || stateKeyword ? 0 : (init.page ?? 0));
  const [rowsPerPage, setRowsPerPage] = useState(init.rowsPerPage ?? 20);
  const [keyword, setKeyword] = useState(stateKeyword || (stateParentId ? '' : (init.keyword ?? '')));
  const [parentId, setParentId] = useState<number | undefined>(stateParentId ?? init.parentId);

  const [itemCode, setItemCode] = useState<string[]>(stateParentId || stateKeyword ? [] : (Array.isArray(init.itemCode) ? init.itemCode : (init.itemCode ? init.itemCode.split(',') : [])));
  const [supplierName, setSupplierName] = useState<string[]>(stateParentId ? [] : (Array.isArray(init.supplierName) ? init.supplierName : (init.supplierName ? init.supplierName.split(',') : [])));
  const [color, setColor] = useState<string[]>(stateParentId ? [] : (Array.isArray(init.color) ? init.color : (init.color ? init.color.split(',') : [])));
  const [origin, setOrigin] = useState<string[]>(stateParentId ? [] : (Array.isArray(init.origin) ? init.origin : (init.origin ? init.origin.split(',') : [])));
  const [location, setLocation] = useState<string[]>(stateParentId ? [] : (Array.isArray(init.location) ? init.location : (init.location ? init.location.split(',') : [])));
  const [holder, setHolder] = useState<string[]>(stateParentId ? [] : (Array.isArray(init.holder) ? init.holder : (init.holder ? init.holder.split(',') : [])));
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(stateParentId || stateKeyword ? true : (init.hasSearched ?? false));
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({ open: false, message: '', severity: 'success' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isCopy, setIsCopy] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const dragRef = useDragScroll();

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ page, rowsPerPage, keyword, itemCode, supplierName, color, origin, location, holder, hasSearched, items, total, parentId }));
  }, [page, rowsPerPage, keyword, itemCode, supplierName, color, origin, location, holder, hasSearched, items, total, parentId]);

  const [filterOpen, setFilterOpen] = useState(false);

  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [sortConfig, setSortConfig] = useState<{ field: string, direction: 'asc'|'desc' } | null>(null);

  const getFieldValueForFilter = useCallback((row: any, field: string) => {
    let val: any;
    switch(field) {
      // Common fields
      case 'Name': val = row.name; break;
      case 'Item Code': val = row.itemCode; break;
      case 'Supplier': val = row.supplierName; break;
      case 'Origin': val = row.origin; break;
      case 'Price': val = row.price ? `${row.price}${row.currency ? ' ' + row.currency : ''}${row.priceUnit ? '/' + row.priceUnit : ''}` : undefined; break;
      case 'Location': val = row.location; break;
      case 'Holder': val = row.holder; break;
      case 'Qty': val = row.quantity ? `${row.quantity} ${row.quantityUnit || 'pcs'}` : undefined; break;
      case 'Created At': 
        if (row.createdAt) {
          try { val = new Date(row.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch {}
        }
        break;
      case 'Remark': val = row.remark; break;

      // Accessory specific
      case 'Description': val = row.accessory?.description || row.description; break;
      case 'Size': val = row.accessory?.size || row.product?.size || row.pattern?.size; break;
      case 'Color': val = row.accessory?.color || row.fabric?.colorName || row.product?.color; break;
      case 'Specification': val = row.accessory?.specification; break;
      
      // Fabric & Yardage specific
      case 'Structure': val = row.fabric?.structure; break;
      case 'Composition': val = row.fabric?.composition || row.accessory?.composition; break;
      case 'Function': val = row.fabric?.function; break;
      case 'GSM': val = row.fabric?.weightGsm || row.accessory?.weightGsm; break;
      case 'Width': val = row.fabric?.cuttableWidth; break;
      case 'leadtimeWithGreige': val = row.leadtimeWithGreige; break;
      case 'leadtimeWithoutGreige': val = row.leadtimeWithoutGreige; break;
      case 'S/Y': val = row.fabric?.hasSy ? 'Yes' : 'No'; break;
      
      // Product specific
      case 'Project': val = row.product?.projectName; break;
      case 'Category': val = row.product?.garmentCategory || row.category; break;
      case 'Sport': val = row.product?.sportCategory; break;
      case 'Style Name': val = row.product?.styleName; break;
      case 'Stage': val = row.product?.sampleStage; break;
      case 'Gender': val = row.product?.gender; break;
      case 'Pattern Marker': val = row.product?.patternMarker; break;
      case 'Allocation': val = row.product?.allocation; break;
      case 'Main Composition': val = row.product?.mainComposition; break;
      case 'FOB Price': val = row.product?.fobPrice; break;
      
      default: val = row[field];
    }
    return (val !== undefined && val !== null && val !== '') ? String(val) : '(Blanks)';
  }, []);

  const filteredItems = useMemo(() => {
    let result = items;
    const filterEntries = Object.entries(columnFilters);
    if (filterEntries.length > 0) {
      result = items.filter(row => {
        return filterEntries.every(([field, allowedValues]) => {
          if (!allowedValues || allowedValues.length === 0) return true;
          const val = getFieldValueForFilter(row, field);
          return allowedValues.includes(val);
        });
      });
    }
    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const valA = getFieldValueForFilter(a, sortConfig.field);
        const valB = getFieldValueForFilter(b, sortConfig.field);
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [items, columnFilters, sortConfig, getFieldValueForFilter]);

  columnFilterStore.register(window.location.pathname, columnFilters, setColumnFilters, items);

  const activeFiltersCount = (itemCode.length > 0 ? 1 : 0) + (supplierName.length > 0 ? 1 : 0) + (color.length > 0 ? 1 : 0) + (origin.length > 0 ? 1 : 0) + (location.length > 0 ? 1 : 0) + (holder.length > 0 ? 1 : 0);

  const [colMenuAnchor, setColMenuAnchor] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('rd-yardage-columns');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('rd-yardage-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const defaultOrder = [
      'Image', 'Name', 'Item Code', 'Structure', 'Composition', 'Function', 'GSM',
      'Width', 'Supplier', 'Origin', 'Color', 'Qty', 'Location', 'Created At', 'Actions'
    ];
    try {
      const saved = localStorage.getItem('rd-yardage-column-order');
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        const cleanedSaved = parsed.filter(id => id !== 'Actions');
        const defaultWithoutActions = defaultOrder.filter(id => id !== 'Actions');
        const validSaved = cleanedSaved.filter(id => defaultWithoutActions.includes(id));
        const missing = defaultWithoutActions.filter(id => !validSaved.includes(id));
        return [...validSaved, ...missing, 'Actions'];
      }
    } catch { /* ignore */ }
    return defaultOrder;
  });

  useEffect(() => {
    localStorage.setItem('rd-yardage-column-order', JSON.stringify(columnOrder));
  }, [columnOrder]);

  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  const columns = [
    { id: 'Image', label: 'Image', isCenter: true },
    { id: 'Name', label: 'Fabric Name' },
    { id: 'Item Code', label: 'Item Code' },
    { id: 'Structure', label: 'Structure' },
    { id: 'Composition', label: 'Composition' },
    { id: 'Function', label: 'Function' },
    { id: 'GSM', label: 'Weight (GSM)' },
    { id: 'Width', label: 'Cuttable width (inch)' },
    { id: 'Supplier', label: 'Supplier Name' },
    { id: 'Origin', label: 'Origin' },
    { id: 'Color', label: 'Color' },
    { id: 'Qty', label: 'Quantity', isCenter: true },
    { id: 'Location', label: 'Location' },
    { id: 'Created At', label: 'Created At' },
    { id: 'Actions', label: 'Actions', isRight: true }
  ];

  const sortedColumns = [...columns].sort((a, b) => {
    const idxA = columnOrder.indexOf(a.id);
    const idxB = columnOrder.indexOf(b.id);
    return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
  });

  const filteredCols = sortedColumns.filter(col => visibleColumns[col.id] !== false);
  const colSpanCount = filteredCols.length;

  const renderRowCell = (item: Item, colId: string, rowBgColor: string) => {
    switch (colId) {
      case 'Image':
        return (
          <TableCell key={colId} sx={{
            px: 2, py: 1.5, textAlign: 'center',
            ...getStickyBodyStyle('Image', filteredCols, rowBgColor),
            width: 80, minWidth: 80, maxWidth: 80
          } as any}>
            {item.mainImage ? (
              <Tooltip
                title={
                  <Box sx={{ width: 240, height: 240, bgcolor: '#fff', borderRadius: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={rdItemApi.getImageUrl(item.mainImage.split(',')[0])} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </Box>
                }
                placement="right"
                componentsProps={{ tooltip: { sx: { bgcolor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', p: 0.5, border: '1px solid #e1e3e4' } } }}
              >
                <Box sx={{ width: 48, height: 48, borderRadius: 1, overflow: 'hidden', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfc9c4', mx: 'auto' }}>
                  <img src={rdItemApi.getImageUrl(item.mainImage.split(',')[0])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              </Tooltip>
            ) : (
              <Box sx={{ width: 48, height: 48, borderRadius: 1, overflow: 'hidden', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfc9c4', mx: 'auto' }}>
                <Typography sx={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', lineHeight: 1.1, fontWeight: 600 }}>No Image</Typography>
              </Box>
            )}
          </TableCell>
        );
      case 'Name':
        return (
          <TableCell key={colId} sx={{
            py: 1.5, fontSize: 13, color: '#191c1d',
            ...getStickyBodyStyle('Name', filteredCols, rowBgColor),
            width: 200, minWidth: 200, maxWidth: 200
          } as any}>
            <Typography fontSize={13} color="#191c1d" fontWeight={700} noWrap sx={{ maxWidth: 200 }}>
              {item.fabric?.fabricName || '–'}
            </Typography>
            <Typography fontSize={11} color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
              {item.name}
            </Typography>
          </TableCell>
        );
      case 'Item Code':
        return (
          <TableCell key={colId} sx={{
            py: 1.5, fontSize: 13,
            ...getStickyBodyStyle('Item Code', filteredCols, rowBgColor),
            width: 150, minWidth: 150, maxWidth: 150
          } as any}>
            <Typography 
              component="span" 
              onClick={() => React.startTransition(() => navigate(`${BASE}/yardage/${item.id}`))}
              sx={{ fontSize: 13, color: '#1a73e8', fontWeight: 500, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            >
              {item.itemCode || '—'}
            </Typography>
          </TableCell>
        );
      case 'Structure':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>{item.fabric?.structure || '—'}</TableCell>
        );
      case 'Composition':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>{item.fabric?.composition || '—'}</TableCell>
        );
      case 'Function':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>{item.fabric?.function || '—'}</TableCell>
        );
      case 'GSM':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
            {item.fabric?.weightGsm ? `${item.fabric.weightGsm} gsm` : '—'}
          </TableCell>
        );
      case 'Width':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
            {item.fabric?.cuttableWidth ? `${item.fabric.cuttableWidth} inch` : '—'}
          </TableCell>
        );
      case 'Supplier':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>{item.supplierName || '—'}</TableCell>
        );
      case 'Origin':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>{item.origin || '—'}</TableCell>
        );
      case 'Color':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>{item.category || '—'}</TableCell>
        );
      case 'Qty':
        return (
          <TableCell key={colId} sx={{ py: 1.5, textAlign: 'center' }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', px: 1.25, py: 0.5, borderRadius: '6px', bgcolor: 'rgba(46,125,50,0.1)', color: '#2e7d32', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, minWidth: 36 }}>
              {item.quantity ?? 0} {item.quantityUnit || 'Yd'}
            </Box>
          </TableCell>
        );
      case 'Location':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>{item.location || '—'}</TableCell>
        );
      case 'Created At':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945', whiteSpace: 'nowrap' }}>
            {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–'}
          </TableCell>
        );
      case 'Actions':
        return (
          <TableCell onClick={(e) => e.stopPropagation()} key={colId} sx={{ py: 1.5, textAlign: 'right', pr: 3 }}>
            <Box className="action-buttons" sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
              {canEdit && (
                <IconButton size="small" onClick={() => { setIsCopy(false); setEditItem(item); setDrawerOpen(true); }} sx={{ color: '#707975', '&:hover': { color: '#2e7d32', bgcolor: '#f3f4f5' } }}>
                  <EditIcon sx={{ fontSize: 18 }} />
                </IconButton>
              )}
              {canAdd && (
                <IconButton size="small" onClick={() => { setIsCopy(true); setEditItem(item); setDrawerOpen(true); }} sx={{ color: '#707975', '&:hover': { color: '#0284c7', bgcolor: '#e0f2fe' } }}>
                  <ContentCopyIcon sx={{ fontSize: 18 }} />
                </IconButton>
              )}
              <IconButton size="small" onClick={() => navigate(`${BASE}/label/${item.id}`)} sx={{ color: '#707975', '&:hover': { color: '#2e7d32', bgcolor: '#f3f4f5' } }}>
                <PrintIcon sx={{ fontSize: 18 }} />
              </IconButton>
              {canDelete && (
                <IconButton size="small" onClick={() => handleDelete(item.id)} sx={{ color: '#707975', '&:hover': { color: '#ba1a1a', bgcolor: '#ffdad6' } }}>
                  <DeleteIcon sx={{ fontSize: 18 }} />
                </IconButton>
              )}
            </Box>
          </TableCell>
        );
      default:
        return null;
    }
  };

  const load = useCallback(async (options?: { forceLoading?: boolean }) => {
    if (!hasSearched) return;
    
    const force = options?.forceLoading === true;
    const silent = !force && items.length > 0;
    
    if (!silent) setLoading(true);
    try {
      const data = await rdItemApi.getAll({ 
        itemType: 'YARDAGE', 
        keyword: parentId ? undefined : keyword, 
        parentId,
        itemCode: itemCode.join(','), 
        supplierName: supplierName.join(','), 
        color: color.join(','), 
        origin: origin.join(','), 
        location: location.join(','), 
        holder: holder.join(','), 
        page, 
        size: rowsPerPage 
      });
      setItems(data.content ?? []);
      setTotal(data.totalElements ?? 0);
    } catch (err: unknown) {
      console.error('GET /rd-items error:', err);
      if (!silent) setItems([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [keyword, parentId, itemCode, supplierName, color, origin, location, holder, page, rowsPerPage, hasSearched, items.length]);

  const currentParamsRef = useRef('');

  useEffect(() => { 
    const currentParams = JSON.stringify({ keyword, parentId, itemCode, supplierName, color, origin, location, holder, page, rowsPerPage, hasSearched });
    if (currentParams === currentParamsRef.current && items.length > 0) {
      return;
    }
    currentParamsRef.current = currentParams;
    load(); 
  }, [load, keyword, parentId, itemCode, supplierName, color, origin, location, holder, page, rowsPerPage, hasSearched, items.length]);

  useEffect(() => {
    if (stateParentId !== undefined) {
      setKeyword('');
      setItemCode([]);
      setSupplierName([]);
      setColor([]);
      setOrigin([]);
      setLocation([]);
      setHolder([]);
      setParentId(stateParentId);
      setHasSearched(true);
      setPage(0);
    } else {
      setParentId(undefined);
    }
  }, [stateParentId]);

  useEffect(() => {
    if (stateKeyword) {
      setKeyword(stateKeyword);
      setItemCode([]);
      setSupplierName([]);
      setColor([]);
      setOrigin([]);
      setLocation([]);
      setHolder([]);
      setParentId(undefined);
      setHasSearched(true);
      setPage(0);
    }
  }, [stateKeyword]);

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try { 
      await rdItemApi.softDelete(deleteId); 
      load({ forceLoading: true }); 
      setSnackbar({ open: true, message: t('rdMaterial.delete_success', 'Deleted successfully'), severity: 'success' });
    } catch { 
      setSnackbar({ open: true, message: t('rdMaterial.delete_error', 'Error deleting item'), severity: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await rdItemApi.getAll({ 
        itemType: 'YARDAGE', 
        keyword: parentId ? undefined : keyword, 
        parentId,
        itemCode: itemCode.join(','), 
        supplierName: supplierName.join(','), 
        color: color.join(','), 
        origin: origin.join(','), 
        location: location.join(','), 
        holder: holder.join(','), 
        page: 0, 
        size: 10000 
      });
      await exportYardageInventoryToExcel(data.content ?? [], t);
    } catch (err: unknown) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

      {/* 🚀 Toolbar Area 🚀 */}
      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', pt: 1, px: 0.5 }}>
            <Box sx={{ display: 'flex', gap: 1, width: '100%', alignItems: 'center' }}>
              <AppTextField placeholder={t('rdMaterial.search_placeholder', 'Search by name, code...')}
                value={keyword} debounceMs={400} onDebounceChange={setKeyword}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: '#707975' }} /></InputAdornment>,
                  endAdornment: keyword ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setKeyword('')}><ClearIcon sx={{ fontSize: 16 }} /></IconButton>
                    </InputAdornment>
                  ) : null,
                }}
                sx={{ flexGrow: 1, mt: '2px' }}
              />
              <IconButton 
                onClick={() => {
                  if (!hasSearched) setHasSearched(true);
                  else { setPage(0); load({ forceLoading: true }); }
                }}
                sx={{ 
                  bgcolor: 'rgba(46,125,50,0.1)', 
                  color: '#2e7d32',
                  borderRadius: '50%',
                  width: 44,
                  height: 44,
                  flexShrink: 0
                }}
              >
                <SyncIcon sx={{ 
                  animation: loading ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } }
                }} />
              </IconButton>
              <IconButton 
                onClick={() => setFilterOpen(true)}
                sx={{ 
                  bgcolor: activeFiltersCount > 0 ? 'rgba(46,125,50,0.1)' : '#f1f5f9', 
                  color: activeFiltersCount > 0 ? '#2e7d32' : '#64748b',
                  borderRadius: '50%',
                  width: 44,
                  height: 44,
                  flexShrink: 0
                }}
              >
                <FilterListIcon />
              </IconButton>
              <IconButton 
                onClick={(e) => setMobileMenuAnchor(e.currentTarget)}
                sx={{ 
                  bgcolor: '#f1f5f9', 
                  color: '#64748b',
                  borderRadius: '50%',
                  width: 44,
                  height: 44,
                  flexShrink: 0
                }}
              >
                <MoreVertIcon />
              </IconButton>
            </Box>

            {(keyword || activeFiltersCount > 0) && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 1, px: 0.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {loading ? 'Loading...' : t('rdMaterial.items_count', { count: total, defaultValue: `${total} items found` })}
                </Typography>
                <Divider sx={{ flexGrow: 1, ml: 1.5, borderColor: 'rgba(0,0,0,0.06)' }} />
              </Box>
            )}
          </Box>

          <Menu
            anchorEl={mobileMenuAnchor}
            open={Boolean(mobileMenuAnchor)}
            onClose={() => setMobileMenuAnchor(null)}
            PaperProps={{ sx: { borderRadius: 2, minWidth: 180, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' } }}
          >
            <MenuItem onClick={(e) => { setMobileMenuAnchor(null); setColMenuAnchor(e.currentTarget); }}>
              <ViewWeekIcon sx={{ mr: 1.5, fontSize: 20, color: 'text.secondary' }} />
              <Typography fontSize={14} fontWeight={500}>{t('rdMaterial.columns', 'Columns')}</Typography>
            </MenuItem>
            <MenuItem disabled={exporting || items.length === 0} onClick={() => { setMobileMenuAnchor(null); handleExport(); }}>
              <FileDownloadIcon sx={{ mr: 1.5, fontSize: 20, color: 'text.secondary' }} />
              <Typography fontSize={14} fontWeight={500}>{exporting ? t('rdMaterial.exporting', 'Exporting...') : t('rdMaterial.export', 'Export')}</Typography>
            </MenuItem>
          </Menu>
        </Box>
      ) : (
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: 2, 
          mb: 3,
          width: '100%'
        }}>
          {/* Left Section: Search & Query Filters */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5, 
            flexWrap: 'wrap', 
            flex: '1 1 auto', 
            minWidth: 0 
          }}>
            {/* Sub-group 1: Search box & Chip selection info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: { xs: '1 1 100%', sm: '0 1 auto' }, minWidth: 200 }}>
              <AppTextField placeholder={t('rdMaterial.search_placeholder', 'Search by name, code...')}
                value={keyword} debounceMs={400} onDebounceChange={setKeyword}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: '#707975' }} /></InputAdornment>,
                  endAdornment: keyword ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setKeyword('')}><ClearIcon sx={{ fontSize: 16 }} /></IconButton>
                    </InputAdornment>
                  ) : null,
                }}
                sx={{ width: '100%', minWidth: 200, maxWidth: { sm: 280, md: 320 } }}
              />

              {selectedIds.length > 0 && (
                <Chip 
                  label={`Đã chọn ${selectedIds.length} mục`} 
                  onDelete={() => setSelectedIds([])}
                  sx={{ borderRadius: 1.5, fontWeight: 600, bgcolor: '#e0f2fe', color: '#0369a1', '& .MuiChip-deleteIcon': { color: '#0369a1' } }} 
                />
              )}
            </Box>

            {/* Sub-group 2: Filter trigger */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'nowrap' }}>
              <AppButton variant="outlined" customVariant="secondary"
                onClick={() => setFilterOpen(true)}
                startIcon={<FilterListIcon sx={{ fontSize: '20px !important' }} />}
                sx={{ 
                  height: 40,
                  ...(activeFiltersCount > 0 && { 
                    borderColor: '#2e7d32', 
                    color: '#2e7d32', 
                    bgcolor: 'rgba(46,125,50,0.05)',
                    '&:hover': { bgcolor: 'rgba(46,125,50,0.1)', borderColor: '#2e7d32' }
                  })
                }}
              >
                {t('rdMaterial.filter', 'Filter')}{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
              </AppButton>
            </Box>

            {/* Sub-group 3: Grid settings */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'nowrap' }}>
              <AppButton variant="outlined" customVariant="secondary"
                onClick={(e) => setColMenuAnchor(e.currentTarget)}
                startIcon={<ViewWeekIcon sx={{ fontSize: '20px !important' }} />}
                sx={{ height: 40 }}
              >
                {t('rdMaterial.columns', 'Columns')}
              </AppButton>

              <AppButton variant="contained" customVariant="primary"
                disabled={loading}
                startIcon={
                  <SyncIcon sx={{ 
                    fontSize: '20px !important',
                    animation: loading ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' }
                    }
                  }} />
                }
                onClick={() => {
                  if (!hasSearched) setHasSearched(true);
                  else { setPage(0); load({ forceLoading: true }); }
                }}
                sx={{ display: { xs: 'none', sm: 'flex' }, height: 40 }}
              >
                {loading ? t('rdMaterial.loading', 'Loading...') : t('rdMaterial.load_data', 'Load Data')}
              </AppButton>
            </Box>
          </Box>

          {/* Right Section: Actions */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5, 
            flexWrap: 'nowrap', 
            justifyContent: 'flex-end', 
            flex: { xs: '1 1 100%', sm: '0 0 auto' },
            mt: { xs: 1, sm: 0 }
          }}>
            <Box sx={{ color: '#2e7d32', fontSize: 13, fontWeight: 500, bgcolor: 'rgba(46,125,50,0.1)', px: 1.5, py: 0.5, borderRadius: '8px', lineHeight: '30px', height: 40, display: 'flex', alignItems: 'center' }}>
              {loading ? t('rdMaterial.loading', 'Loading...') : t('rdMaterial.items_count', { count: total, defaultValue: `${total} items` })}
            </Box>

            <AppButton variant="outlined" customVariant="primary"
              disabled={exporting || items.length === 0}
              onClick={handleExport}
              startIcon={
                <FileDownloadIcon sx={{ 
                  fontSize: '20px !important',
                  animation: exporting ? 'bounce 1s infinite' : 'none',
                }} />
              }
              sx={{ 
                height: 40,
                '@keyframes bounce': {
                  '0%, 100%': { transform: 'translateY(0)' },
                  '50%': { transform: 'translateY(3px)' }
                }
              }}
            >
              {exporting ? t('rdMaterial.exporting', 'Exporting...') : t('rdMaterial.export', 'Export')}
            </AppButton>
          </Box>
        </Box>
      )}

      <Menu
        anchorEl={colMenuAnchor}
        open={Boolean(colMenuAnchor)}
        onClose={() => setColMenuAnchor(null)}
        PaperProps={{ sx: { maxHeight: 400, width: 240, px: 1, borderRadius: 2, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' } }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 700, color: 'text.secondary' }}>
          {t('rdMaterial.toggle_columns', 'Toggle Columns')}
        </Typography>
        <Divider sx={{ my: 0.5 }} />
        {columns.map((col) => (
          <MenuItem key={col.id} onClick={() => setVisibleColumns(prev => ({ ...prev, [col.id]: prev[col.id] === false }))} sx={{ py: 0.5, borderRadius: 1 }}>
            <Checkbox size="small" checked={visibleColumns[col.id] !== false} sx={{ mr: 1, p: 0, pointerEvents: 'none' }} />
            <Typography fontSize={13} fontWeight={500} sx={{ pointerEvents: 'none' }}><Box sx={{ display: 'flex', alignItems: 'center', justifyContent: col.isCenter ? 'center' : col.isRight ? 'flex-end' : 'flex-start' }}>
                          <span>{col.label}</span>
                          {col.id !== 'Image' && col.id !== 'Actions' && (
                            <TableExcelColumnMenu 
                              field={col.id}
                              allRows={items}
                              columnFilters={columnFilters}
                              setColumnFilters={setColumnFilters}
                              getFieldValue={getFieldValueForFilter}
                              onSortAsc={() => setSortConfig({ field: col.id, direction: 'asc' })}
                              onSortDesc={() => setSortConfig({ field: col.id, direction: 'desc' })}
                            />
                          )}
                        </Box></Typography>
          </MenuItem>
        ))}
      </Menu>

      {/* Filter Drawer */}
      <AdvancedFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        hasActiveFilters={activeFiltersCount > 0}
        onClear={() => { setItemCode([]); setSupplierName([]); setColor([]); setOrigin([]); setLocation([]); setHolder([]); if(hasSearched) setPage(0); }}
        onApply={() => {
          setFilterOpen(false);
          setTimeout(() => {
            if (!hasSearched) setHasSearched(true);
            else { setPage(0); load({ forceLoading: true }); }
          }, 100);
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">{t('rdMaterial.filter_item_code', 'Item Code')}</Typography>
          <Autocomplete multiple freeSolo options={[] as string[]} value={itemCode} onChange={(_, val) => { setItemCode(val); if(hasSearched) setPage(0); }} renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder="Enter to add..." sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 14, bgcolor: '#fff' } }} />} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">{t('rdMaterial.filter_supplier', 'Supplier')}</Typography>
          <Autocomplete multiple freeSolo options={[] as string[]} value={supplierName} onChange={(_, val) => { setSupplierName(val); if(hasSearched) setPage(0); }} renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder="Enter to add..." sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 14 } }} />} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">{t('rdMaterial.filter_color', 'Color')}</Typography>
          <Autocomplete multiple freeSolo options={[] as string[]} value={color} onChange={(_, val) => { setColor(val); if(hasSearched) setPage(0); }} renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder="Enter to add..." sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 14 } }} />} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">{t('rdMaterial.filter_origin', 'Origin')}</Typography>
          <Autocomplete multiple freeSolo options={[] as string[]} value={origin} onChange={(_, val) => { setOrigin(val); if(hasSearched) setPage(0); }} renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder="Enter to add..." sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 14 } }} />} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">{t('rdMaterial.filter_location', 'Location')}</Typography>
          <Autocomplete multiple freeSolo options={[] as string[]} value={location} onChange={(_, val) => { setLocation(val); if(hasSearched) setPage(0); }} renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder="Enter to add..." sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 14 } }} />} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">{t('rdMaterial.filter_holder', 'Holder')}</Typography>
          <Autocomplete multiple freeSolo options={[] as string[]} value={holder} onChange={(_, val) => { setHolder(val); if(hasSearched) setPage(0); }} renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder="Enter to add..." sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 14 } }} />} />
        </Box>
      </AdvancedFilterDrawer>

      {/* 📦 Table / Cards 📦 */}
      <Paper elevation={0} sx={{ position: 'relative', flexGrow: 1, width: '100%', overflow: 'hidden', borderRadius: '12px', border: '1px solid #e1e3e4', boxShadow: '0px 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
        {/* Loading Overlay */}
        {loading && items.length > 0 && (
          <Box sx={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            bgcolor: 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <CircularProgress color="primary" />
          </Box>
        )}
        {isMobile ? (
          <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {loading && filteredItems.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={28} color="primary" />
              </Box>
            ) : filteredItems.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 8 }}>
                <TextureIcon sx={{ fontSize: 48, color: '#e2e8f0' }} />
                <Typography color="text.secondary" fontWeight={600} fontSize={14}>
                  {!hasSearched ? t('rdMaterial.empty_instruction', 'Nhấn "LOAD DATA" để xem danh sách') : t('rdMaterial.no_results', 'No results found')}
                </Typography>
              </Box>
            ) : (
              filteredItems.map((item) => {
                const rightActions = [];
                if (canEdit) {
                  rightActions.push({
                    label: t('rdMaterial.edit', 'Edit'),
                    icon: <EditIcon fontSize="small" />,
                    color: '#f59e0b',
                    onClick: () => { setIsCopy(false); setEditItem(item); setDrawerOpen(true); }
                  });
                }
                if (canAdd) {
                  rightActions.push({
                    label: t('rdMaterial.duplicate', 'Duplicate'),
                    icon: <ContentCopyIcon fontSize="small" />,
                    color: '#0284c7',
                    onClick: () => { setIsCopy(true); setEditItem(item); setDrawerOpen(true); }
                  });
                }
                rightActions.push({
                  label: t('rdMaterial.print', 'Print'),
                  icon: <PrintIcon fontSize="small" />,
                  color: '#6366f1',
                  onClick: () => navigate(`${BASE}/label/${item.id}`)
                });
                if (canDelete) {
                  rightActions.push({
                    label: t('rdMaterial.delete', 'Delete'),
                    icon: <DeleteIcon fontSize="small" />,
                    color: '#ef4444',
                    onClick: () => handleDelete(item.id)
                  });
                }

                return (
                  <SwipeableItem
                    key={item.id}
                    swipeRightLabel={t('rdMaterial.open_details', 'Open Details')}
                    swipeRightIcon={<LaunchIcon />}
                    swipeRightColor="#2e7d32"
                    onSwipeRight={() => React.startTransition(() => navigate(`${BASE}/yardage/${item.id}`))}
                    rightActions={rightActions}
                  >
                    <Box 
                      onClick={() => React.startTransition(() => navigate(`${BASE}/yardage/${item.id}`))}
                      sx={{ 
                        p: 1.5,
                        display: 'flex',
                        gap: 1.5,
                        alignItems: 'center',
                        bgcolor: (item.quantity ?? 0) <= 0 ? '#fef2f2' : '#fff',
                        cursor: 'pointer',
                        transition: 'background-color 0.1s'
                      }}
                    >
                      {/* Image or Placeholder */}
                      <Box 
                        sx={{ 
                          width: 60, 
                          height: 60, 
                          borderRadius: 1.5, 
                          overflow: 'hidden', 
                          bgcolor: '#f1f5f9', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          border: '1px solid #e2e8f0', 
                          flexShrink: 0 
                        }}
                      >
                        {item.mainImage ? (
                          <img src={rdItemApi.getImageUrl(item.mainImage.split(',')[0])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Typography sx={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>No Image</Typography>
                        )}
                      </Box>

                      {/* Details */}
                      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {visibleColumns['Name'] !== false && (
                          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.875rem' }}>
                            {item.fabric?.fabricName || item.name || 'N/A'}
                          </Typography>
                        )}
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          {visibleColumns['Item Code'] !== false && item.itemCode && (
                            <Typography 
                              variant="body2" 
                              sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem' }}
                            >
                              ItemCode: <span 
                                onClick={(e) => { e.stopPropagation(); React.startTransition(() => navigate(`${BASE}/yardage/${item.id}`)); }}
                                style={{ color: '#1a73e8', textDecoration: 'underline', cursor: 'pointer' }}
                              >
                                {item.itemCode}
                              </span>
                            </Typography>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                          {visibleColumns['Color'] !== false && item.category && (
                            <Chip 
                              label={item.category} 
                              size="small" 
                              sx={{ 
                                height: 22, fontSize: 10, fontWeight: 700,
                                bgcolor: '#dbeafe', color: '#2563eb'
                              }} 
                            />
                          )}
                          {visibleColumns['Location'] !== false && item.location && (
                            <Chip 
                              label={item.location} 
                              size="small" 
                              sx={{ height: 22, fontSize: 10, bgcolor: '#f1f5f9', color: '#475569', fontWeight: 500 }} 
                            />
                          )}
                          {visibleColumns['Qty'] !== false && (
                            <Chip 
                              label={`${item.quantity ?? 0} ${item.quantityUnit || 'Yd'}`} 
                              size="small" 
                              color={(item.quantity ?? 0) > 0 ? 'success' : 'error'}
                              sx={{ height: 22, fontSize: 10, fontWeight: 700 }} 
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </SwipeableItem>
                );
              })
            )}
          </Box>
        ) : (
          <TableContainer ref={dragRef} sx={{
            flexGrow: 1,
            minHeight: 0,
            overflowX: 'auto',
            '&::-webkit-scrollbar': { width: '10px', height: '10px' },
            '&::-webkit-scrollbar-track': { bgcolor: '#f1f1f1', borderRadius: '10px' },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: '#bfc9c4',
              borderRadius: '10px',
              border: '2px solid #f1f1f1',
              '&:hover': { bgcolor: '#8fa095' }
            }
          }}>
            <Table stickyHeader size="small" sx={{ minWidth: 'max-content', width: '100%', tableLayout: 'auto' }}>
              <TableHead>
                <TableRow>
                  {filteredCols.map((col) => {
                    const stickyStyle = getStickyHeaderStyle(col.id, filteredCols);
                    const widthStyle = col.id === 'Image' ? { width: 80, minWidth: 80, maxWidth: 80 }
                                     : col.id === 'Name' ? { width: 200, minWidth: 200, maxWidth: 200 }
                                     : col.id === 'Item Code' ? { width: 150, minWidth: 150, maxWidth: 150 }
                                     : {};
                    return (
                      <TableCell
                        key={col.id}
                        draggable={col.id !== 'Image' && col.id !== 'Actions'}
                        onDragStart={(e) => {
                          setDraggedColId(col.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          if (draggedColId && draggedColId !== col.id && col.id !== 'Image' && col.id !== 'Actions') {
                            e.preventDefault();
                            setDragOverColId(col.id);
                          }
                        }}
                        onDragLeave={() => {
                          setDragOverColId(null);
                        }}
                        onDrop={(e) => {
                          if (draggedColId && draggedColId !== col.id && col.id !== 'Image' && col.id !== 'Actions') {
                            e.preventDefault();
                            setColumnOrder(prev => {
                              const next = [...prev];
                              const fromIndex = next.indexOf(draggedColId);
                              const toIndex = next.indexOf(col.id);
                              if (fromIndex !== -1 && toIndex !== -1) {
                                next.splice(fromIndex, 1);
                                next.splice(toIndex, 0, draggedColId);
                              }
                              return next;
                            });
                          }
                          setDraggedColId(null);
                          setDragOverColId(null);
                        }}
                        onDragEnd={() => {
                          setDraggedColId(null);
                          setDragOverColId(null);
                        }}
                        sx={{
                          fontWeight: 700, fontSize: 11, color: '#707975',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                          bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4',
                          py: 2, px: 2, textAlign: col.isCenter ? 'center' : col.isRight ? 'right' : 'left',
                          whiteSpace: 'nowrap',
                          cursor: col.id !== 'Image' && col.id !== 'Actions' ? 'grab' : 'default',
                          userSelect: 'none',
                          borderLeft: dragOverColId === col.id ? '2px dashed #2e7d32' : 'none',
                          opacity: draggedColId === col.id ? 0.4 : 1,
                          transition: 'opacity 0.15s, border 0.15s',
                          '&:hover .hide-col-btn': { opacity: 0.6 },
                          ...stickyStyle,
                          ...widthStyle
                        } as any}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: col.isCenter ? 'center' : (col.isRight ? 'flex-end' : 'flex-start'), gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: col.isCenter ? 'center' : col.isRight ? 'flex-end' : 'flex-start' }}>
                          <span>{col.label}</span>
                          {col.id !== 'Image' && col.id !== 'Actions' && (
                            <TableExcelColumnMenu 
                              field={col.id}
                              allRows={items}
                              columnFilters={columnFilters}
                              setColumnFilters={setColumnFilters}
                              getFieldValue={getFieldValueForFilter}
                              onSortAsc={() => setSortConfig({ field: col.id, direction: 'asc' })}
                              onSortDesc={() => setSortConfig({ field: col.id, direction: 'desc' })}
                            />
                          )}
                        </Box>
                          {col.id !== 'Actions' && col.id !== 'Image' && (
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setVisibleColumns(prev => ({ ...prev, [col.id]: false }));
                              }}
                              sx={{ 
                                p: 0.2, 
                                opacity: 0, 
                                transition: 'opacity 0.2s', 
                                '&:hover': { color: '#ef4444', opacity: '1 !important' } 
                              }}
                              className="hide-col-btn"
                            >
                              <VisibilityOffIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody sx={{ '& tr:nth-of-type(even)': { bgcolor: '#fff' }, '& tr:nth-of-type(odd)': { bgcolor: '#fff' }, opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                {loading && filteredItems.length === 0 ? (
                  <TableRow><TableCell colSpan={colSpanCount} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} color="primary" />
                  </TableCell></TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow><TableCell colSpan={colSpanCount} align="center" sx={{ py: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                      <TextureIcon sx={{ fontSize: 48, color: '#e2e8f0' }} />
                      <Typography color="text.secondary" fontWeight={600} fontSize={14}>
                        {!hasSearched ? t('rdMaterial.empty_instruction', 'Nhấn "LOAD DATA" để xem danh sách') : t('rdMaterial.no_results', 'No results found')}
                      </Typography>
                    </Box>
                  </TableCell></TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const rowBgColor = (item.quantity ?? 0) <= 0 ? '#fef2f2' : '#fff';
                    return (
                      <TableRow 
                        key={item.id} 
                        hover
                        onClick={() => React.startTransition(() => navigate(`${BASE}/yardage/${item.id}`))}
                        sx={{ 
                          cursor: 'pointer', 
                          bgcolor: rowBgColor,
                          transition: 'background-color 0.2s',
                          '&:hover': { bgcolor: '#F9FAFA !important' },
                          '& .action-buttons': { opacity: 0, transition: 'opacity 0.2s' },
                          '&:hover .action-buttons': { opacity: 1 }
                        }}
                      >
                        {filteredCols.map((col) => renderRowCell(item, col.id, rowBgColor))}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <GenericItemFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        item={editItem}
        isCopy={isCopy}
        itemType="YARDAGE"
        title={editItem ? `Edit Sample Yardage` : `Add New Sample Yardage`}
        fields={[]}
        onSaved={() => { setPage(0); load({ forceLoading: true }); }}
      />



      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} PaperProps={{ sx: { borderRadius: 2, minWidth: 320 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{t('rdMaterial.confirm_delete_title', 'Confirm Deletion')}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">{t('rdMaterial.confirm_delete_message', 'Are you sure you want to delete this item?')}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
          <Button onClick={() => setDeleteId(null)} sx={{ color: 'text.secondary', fontWeight: 600 }}>{t('rdMaterial.cancel', 'Cancel')}</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disableElevation sx={{ fontWeight: 600 }}>{t('rdMaterial.delete', 'Delete')}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={(snackbar.severity as 'success' | 'error' | 'warning' | 'info') || 'success'} sx={{ width: '100%', borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default YardageListPage;
