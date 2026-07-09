import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, Chip, CircularProgress, IconButton, InputAdornment, Paper,
  MenuItem, Select, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Pagination, Autocomplete,
  Menu, Divider, useTheme, useMediaQuery
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import { DraggableFab } from '../components/DraggableFab';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import TextureIcon from '@mui/icons-material/Texture';
import LaunchIcon from '@mui/icons-material/Launch';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FilterListIcon from '@mui/icons-material/FilterList';
import SyncIcon from '@mui/icons-material/Sync';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { authService, AppButton, AppTextField, AdvancedFilterDrawer } from '@traxeco/shared';
import { exportFabricSubmissionToExcel } from '../utils/excelExport';
import { rdItemApi } from '../services/rdMaterialApi';
import type { Item } from '../types';
import FabricFormDrawer from './FabricFormDrawer';
import { useTranslation } from 'react-i18next';
import { useDragScroll } from '../hooks/useDragScroll';
import SwipeableItem from '../components/ui/SwipeableItem';

const BASE = '/rd-material';



const getStickyHeaderStyle = (colId: string, filteredCols: any[]) => {
  const stickyIds = ['Image', 'Name', 'Fabric Name', 'Item Code'];
  if (!stickyIds.includes(colId)) return {};
  
  let left = 0;
  for (const c of filteredCols) {
    if (c.id === colId) break;
    if (stickyIds.includes(c.id)) {
      if (c.id === 'Image') left += 80;
      else if (c.id === 'Name') left += 200;
      else if (c.id === 'Fabric Name') left += 200;
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
  const stickyIds = ['Image', 'Name', 'Fabric Name', 'Item Code'];
  if (!stickyIds.includes(colId)) return {};
  
  let left = 0;
  for (const c of filteredCols) {
    if (c.id === colId) break;
    if (stickyIds.includes(c.id)) {
      if (c.id === 'Image') left += 80;
      else if (c.id === 'Name') left += 200;
      else if (c.id === 'Fabric Name') left += 200;
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

const FabricListPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));


  const STORAGE_KEY = `rd-material-state-FABRIC`;
  const pageCode = 'rd_fabric';
  const canAdd = authService.hasAction(pageCode, 'canAdd');
  const canEdit = authService.hasAction(pageCode, 'canEdit');
  const canDelete = authService.hasAction(pageCode, 'canDelete');

  const getInitialState = () => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {};
  };
  const init = getInitialState();

  const [items, setItems] = useState<Item[]>(init.items ?? []);
  const [total, setTotal] = useState(init.total ?? 0);
  const [page, setPage] = useState(init.page ?? 0);
  const [rowsPerPage, setRowsPerPage] = useState(init.rowsPerPage ?? 20);
  const [keyword, setKeyword] = useState(init.keyword ?? '');
  const [itemCode, setItemCode] = useState<string[]>(Array.isArray(init.itemCode) ? init.itemCode : (init.itemCode ? init.itemCode.split(',') : []));
  const [supplierName, setSupplierName] = useState<string[]>(Array.isArray(init.supplierName) ? init.supplierName : (init.supplierName ? init.supplierName.split(',') : []));
  const [color, setColor] = useState<string[]>(Array.isArray(init.color) ? init.color : (init.color ? init.color.split(',') : []));
  const [origin, setOrigin] = useState<string[]>(Array.isArray(init.origin) ? init.origin : (init.origin ? init.origin.split(',') : []));
  const [location, setLocation] = useState<string[]>(Array.isArray(init.location) ? init.location : (init.location ? init.location.split(',') : []));
  const [holder, setHolder] = useState<string[]>(Array.isArray(init.holder) ? init.holder : (init.holder ? init.holder.split(',') : []));
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(init.hasSearched ?? false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ page, rowsPerPage, keyword, itemCode, supplierName, color, origin, location, holder, hasSearched, items, total }));
  }, [page, rowsPerPage, keyword, itemCode, supplierName, color, origin, location, holder, hasSearched, items, total]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isCopy, setIsCopy] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({ open: false, message: '', severity: 'success' });
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const dragRef = useDragScroll();

  useEffect(() => {
    const loadCustomerOptions = async () => {
      try {
        const list = await rdItemApi.getCustomers();
        const names = list.map((c: any) => typeof c === 'string' ? c : (c.custmName || c.name || c.customerName || ''));
        const unique = Array.from(new Set(names)).filter(Boolean) as string[];
        setCustomerOptions(unique);
      } catch (err) {
        console.error('[FabricListPage] Failed to load customers:', err);
      }
    };
    loadCustomerOptions();
  }, []);

  const [filterOpen, setFilterOpen] = useState(false);
  const activeFiltersCount = (itemCode.length > 0 ? 1 : 0) + (supplierName.length > 0 ? 1 : 0) + (color.length > 0 ? 1 : 0) + (origin.length > 0 ? 1 : 0) + (location.length > 0 ? 1 : 0) + (holder.length > 0 ? 1 : 0);

  const [colMenuAnchor, setColMenuAnchor] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('rd-fabric-columns');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('rd-fabric-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const defaultOrder = [
      'Image', 'Name', 'Item Code', 'Structure', 'Composition', 'Function', 'GSM',
      'Width', 'Supplier', 'Origin', 'Price', 'MOQ / MCQ', 'Surcharge', 
      'leadtimeWithGreige', 'leadtimeWithoutGreige', 'Qty', 'Location', 'Remark', 
      'Created At', 'Holder', 'S/Y', 'Actions'
    ];
    try {
      const saved = localStorage.getItem('rd-fabric-column-order');
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        // Filter out old 'Leadtime' and 'Actions' if they were saved
        const cleanedSaved = parsed.filter(id => id !== 'Leadtime' && id !== 'Actions');
        // Filter out 'Actions' from defaultOrder for merging
        const defaultWithoutActions = defaultOrder.filter(id => id !== 'Actions');
        const validSaved = cleanedSaved.filter(id => defaultWithoutActions.includes(id));
        const missing = defaultWithoutActions.filter(id => !validSaved.includes(id));
        return [...validSaved, ...missing, 'Actions'];
      }
    } catch { /* ignore */ }
    return defaultOrder;
  });

  useEffect(() => {
    localStorage.setItem('rd-fabric-column-order', JSON.stringify(columnOrder));
  }, [columnOrder]);

  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  const columns = [
    { id: 'Image', label: t('rdMaterial.image', 'Image'), isCenter: true },
    { id: 'Name', label: t('rdMaterial.fabric_name', 'Fabric Name') },
    { id: 'Item Code', label: t('rdMaterial.item_code', 'Item Code') },
    { id: 'Structure', label: t('rdMaterial.structure', 'Structure') },
    { id: 'Composition', label: t('rdMaterial.composition', 'Composition') },
    { id: 'Function', label: t('rdMaterial.function', 'Function') },
    { id: 'GSM', label: t('rdMaterial.weight_gsm', 'Weight (GSM)') },
    { id: 'Width', label: t('rdMaterial.width', 'Cuttable width (inch)') },
    { id: 'Supplier', label: t('rdMaterial.supplier', 'Supplier Name') },
    { id: 'Origin', label: t('rdMaterial.origin', 'Origin') },
    { id: 'Price', label: t('rdMaterial.price', 'Price') },
    { id: 'MOQ / MCQ', label: t('rdMaterial.moqMcq', 'MOQ/MCQ') },
    { id: 'Surcharge', label: t('rdMaterial.surcharge', 'Surcharge') },
    { id: 'leadtimeWithGreige', label: t('rdMaterial.leadtime_with_greige', 'Leadtime with greige') },
    { id: 'leadtimeWithoutGreige', label: t('rdMaterial.leadtime_without_greige', 'Leadtime without greige') },
    { id: 'Qty', label: t('rdMaterial.qty_of_hanger', 'Quantity of Hanger'), isCenter: true },
    { id: 'Location', label: t('rdMaterial.location', 'Hanger Location') },
    { id: 'Remark', label: t('rdMaterial.remark', 'Remark') },
    { id: 'Created At', label: t('rdMaterial.created_at', 'Created At') },
    { id: 'Holder', label: t('rdMaterial.holder', 'Holder') },
    { id: 'S/Y', label: t('rdMaterial.sy', 'S/Y'), isCenter: true },
    { id: 'Actions', label: t('rdMaterial.actions', 'Actions'), isRight: true }
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
              onClick={() => React.startTransition(() => navigate(`${BASE}/fabric/${item.id}`))}
              sx={{ fontSize: 13, color: '#1a73e8', fontWeight: 500, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            >
              {item.itemCode || '—'}
            </Typography>
          </TableCell>
        );
      case 'Supplier':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>{item.supplierName || '–'}</TableCell>
        );
      case 'Structure':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
            {item.fabric?.structure || '—'}
          </TableCell>
        );
      case 'Composition':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
            {item.fabric?.composition || '—'}
          </TableCell>
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
      case 'Price':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#191c1d', fontWeight: 500 }}>
            {item.price ? `${item.price}${item.currency ? ' ' + item.currency : ''}${item.priceUnit ? '/' + item.priceUnit : ''}` : '—'}
          </TableCell>
        );
      case 'MOQ / MCQ':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
            {item.moqMcq ? `${item.moqMcq} ${item.moqMcqUnit ?? ''}`.trim() : '—'}
          </TableCell>
        );
      case 'Surcharge':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
            {item.surchargeStr || '—'}
          </TableCell>
        );
      case 'Function':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
            {item.fabric?.function || '—'}
          </TableCell>
        );
      case 'leadtimeWithGreige':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
            {item.leadtimeWithGreige || '—'}
          </TableCell>
        );
      case 'leadtimeWithoutGreige':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
            {item.leadtimeWithoutGreige || '—'}
          </TableCell>
        );
      case 'Origin':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
            {item.origin || '—'}
          </TableCell>
        );
      case 'Location':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
            {item.location || '—'}
          </TableCell>
        );
      case 'Holder':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
            {item.holder || '—'}
          </TableCell>
        );
      case 'Qty':
        return (
          <TableCell key={colId} sx={{ py: 1.5, textAlign: 'center' }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', px: 1.25, py: 0.5, borderRadius: '6px', bgcolor: 'rgba(46,125,50,0.1)', color: '#2e7d32', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, minWidth: 36 }}>
              {item.quantity ?? 0} {item.quantityUnit || 'pcs'}
            </Box>
          </TableCell>
        );
      case 'Created At':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945', whiteSpace: 'nowrap' }}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–'}
          </TableCell>
        );
      case 'Remark':
        return (
          <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.remark || '—'}
          </TableCell>
        );
      case 'S/Y':
        return (
          <TableCell key={colId} sx={{ py: 1.5, textAlign: 'center' }}>
            {item.fabric?.hasSy ? (
              <Box 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`${BASE}/yardage`, { state: { parentId: item.id } });
                }}
                sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', px: 1, py: 0.5, borderRadius: 1, bgcolor: 'rgba(46,125,50,0.1)', color: '#2e7d32', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(46,125,50,0.2)' } }}
              >
                View S/Y
              </Box>
            ) : <Typography fontSize={12} color="text.secondary">—</Typography>}
          </TableCell>
        );
      case 'Actions':
        return (
          <TableCell key={colId} sx={{ py: 1.5, textAlign: 'right', pr: 3 }}>
            <Box className="action-buttons" sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
              {canEdit && (
                <IconButton data-testid={`rd-fabric-btn-edit-${item.itemCode}`} size="small" onClick={() => { setIsCopy(false); setEditItem(item); setDrawerOpen(true); }} sx={{ color: '#707975', '&:hover': { color: '#2e7d32', bgcolor: '#f3f4f5' } }}>
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
                <IconButton data-testid={`rd-fabric-btn-delete-${item.itemCode}`} size="small" onClick={() => handleDelete(item.id)} sx={{ color: '#707975', '&:hover': { color: '#ba1a1a', bgcolor: '#ffdad6' } }}>
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
    
    // In React 18 Strict Mode, or when refreshing data, we don't show the disruptive spinner if we already have items unless forced
    const force = options?.forceLoading === true;
    const silent = !force && items.length > 0;
    
    if (!silent) setLoading(true);
    try {
      const data = await rdItemApi.getAll({ itemType: 'FABRIC', keyword, itemCode: itemCode.join(','), supplierName: supplierName.join(','), color: color.join(','), origin: origin.join(','), location: location.join(','), holder: holder.join(','), page, size: rowsPerPage });
      setItems(data.content ?? []);
      setTotal(data.totalElements ?? 0);
    } catch (err: unknown) {
      console.error('GET /rd-items error:', err);
      if (!silent) setItems([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [keyword, itemCode, supplierName, color, origin, location, holder, page, rowsPerPage, hasSearched]);

  const currentParamsRef = useRef('');

  useEffect(() => { 
    const currentParams = JSON.stringify({ keyword, itemCode, supplierName, color, origin, location, holder, page, rowsPerPage, hasSearched });
    if (currentParams === currentParamsRef.current && items.length > 0) {
      return;
    }
    currentParamsRef.current = currentParams;
    load(); 
  }, [load, keyword, itemCode, supplierName, color, origin, location, holder, page, rowsPerPage, hasSearched, items.length]);

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try { 
      await rdItemApi.softDelete(deleteId); 
      load(); 
      setSnackbar({ open: true, message: t('rdMaterial.delete_success', 'Deleted successfully'), severity: 'success' });
    } catch { 
      setSnackbar({ open: true, message: t('rdMaterial.delete_error', 'Error deleting item'), severity: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  const handleExport = async (customer: string) => {
    setExporting(true);
    setCustomerDialogOpen(false);
    try {
      const data = await rdItemApi.getAll({ itemType: 'FABRIC', keyword, itemCode: itemCode.join(','), supplierName: supplierName.join(','), color: color.join(','), origin: origin.join(','), location: location.join(','), holder: holder.join(','), page: 0, size: 10000 });
      
      let exportList = data.content ?? [];
      if (exportList.length === 0) {
        setSnackbar({ open: true, message: t('rdMaterial.no_results', 'No results found'), severity: 'warning' });
        return;
      }

      await exportFabricSubmissionToExcel(exportList, customer, t);
      setSnackbar({ open: true, message: t('rdMaterial.export_success', 'Exported to Excel successfully'), severity: 'success' });
    } catch (err: unknown) {
      console.error('Export error:', err);
      setSnackbar({ open: true, message: t('rdMaterial.export_error', 'Error exporting Excel'), severity: 'error' });
    } finally {
      setExporting(false);
    }
  };


  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

      {/* 🚀 Toolbar Area 🚀 */}
      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2, width: '100%' }}>
          {/* Sub-group 1: Search box & Chip selection info */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', pt: 1, px: 0.5 }}>
            <Box sx={{ display: 'flex', gap: 1, width: '100%', alignItems: 'center' }}>
              <AppTextField placeholder={t('rdMaterial.search_placeholder', 'Search by name, code...')}
                value={keyword} debounceMs={400} onDebounceChange={setKeyword}
                inputProps={{ 'data-testid': 'rd-fabric-search-input-mobile' }}
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
                data-testid="rd-fabric-btn-filter-mobile"
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

            {selectedIds.length > 0 && (
              <Chip 
                label={`Đã chọn ${selectedIds.length} mục`} 
                onDelete={() => setSelectedIds([])}
                sx={{ borderRadius: 1.5, fontWeight: 600, bgcolor: '#e0f2fe', color: '#0369a1', '& .MuiChip-deleteIcon': { color: '#0369a1' }, alignSelf: 'flex-start', mt: 0.5 }} 
              />
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
            <MenuItem disabled={exporting || items.length === 0} onClick={() => { setMobileMenuAnchor(null); setCustomerDialogOpen(true); }}>
              <FileDownloadIcon sx={{ mr: 1.5, fontSize: 20, color: 'text.secondary' }} />
              <Typography fontSize={14} fontWeight={500}>{exporting ? t('rdMaterial.exporting', 'Exporting...') : t('rdMaterial.export', 'Export')}</Typography>
            </MenuItem>
          </Menu>

          {canAdd && !filterOpen && (
            <DraggableFab 
              data-testid="rd-fabric-btn-add-mobile"
              color="primary" 
              onClick={() => React.startTransition(() => { setIsCopy(false); setEditItem(null); setDrawerOpen(true); })}
              initialBottom={80}
              initialRight={16}
              sx={{ 
                bgcolor: '#2e7d32', 
                '&:hover': { bgcolor: '#1b6d24' }
              }}
            >
              <AddIcon />
            </DraggableFab>
          )}
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
                inputProps={{ 'data-testid': 'rd-fabric-search-input' }}
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
                data-testid="rd-fabric-btn-filter"
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
              onClick={() => setCustomerDialogOpen(true)}
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

            {canAdd && (
              <AppButton variant="contained" customVariant="primary"
                data-testid="rd-fabric-btn-add"
                startIcon={<AddIcon sx={{ fontSize: '20px !important' }} />}
                onClick={() => React.startTransition(() => { setIsCopy(false); setEditItem(null); setDrawerOpen(true); })}
                sx={{ height: 40 }}
              >
                {t('rdMaterial.add_new', 'Add New')}
              </AppButton>
            )}
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
            <Checkbox size="small" checked={visibleColumns[col.id] !== false} onChange={() => {}} sx={{ mr: 1, p: 0, pointerEvents: 'none' }} />
            <Typography fontSize={13} fontWeight={500} sx={{ pointerEvents: 'none' }}>{col.label}</Typography>
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

      {/* 📦 Table 📦 */}
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
            {loading && items.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={28} color="primary" />
              </Box>
            ) : items.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 8 }}>
                <TextureIcon sx={{ fontSize: 48, color: '#e2e8f0' }} />
                <Typography color="text.secondary" fontWeight={600} fontSize={14}>
                  {!hasSearched ? t('rdMaterial.empty_instruction', 'Nhấn "LOAD DATA" để xem danh sách') : t('rdMaterial.no_results', 'No results found')}
                </Typography>
              </Box>
            ) : (
              items.map((item) => {
                const rightActions = [];
                if (canEdit) {
                  rightActions.push({
                    label: t('rdMaterial.edit', 'Edit'),
                    icon: <EditIcon fontSize="small" />,
                    color: '#f59e0b',
                    onClick: () => { setIsCopy(false); setEditItem(item); setDrawerOpen(true); },
                    props: { 'data-testid': `rd-fabric-btn-edit-${item.itemCode}` }
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
                    onSwipeRight={() => React.startTransition(() => navigate(`${BASE}/fabric/${item.id}`))}
                    rightActions={rightActions}
                  >
                    <Box 
                      onClick={() => React.startTransition(() => navigate(`${BASE}/fabric/${item.id}`))}
                      sx={{ 
                        p: 1.5,
                        display: 'flex',
                        gap: 1.5,
                        alignItems: 'center',
                        bgcolor: (item.quantity ?? 0) <= 0 ? '#fef2f2' : '#fff',
                        cursor: 'pointer',
                        '&:active': { bgcolor: '#f8fafc' },
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
                          flexShrink: 0,
                          border: '1px solid rgba(0,0,0,0.04)'
                        }}
                      >
                        {item.mainImage ? (
                          <img src={rdItemApi.getImageUrl(item.mainImage.split(',')[0])} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <TextureIcon sx={{ fontSize: 24, color: '#cbd5e1' }} />
                        )}
                      </Box>

                      {/* Details */}
                      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.875rem' }}>
                          {item.name || 'N/A'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem' }}>
                          ItemCode: <span style={{ color: '#2e7d32' }}>{item.itemCode || 'N/A'}</span>
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
                          {item.fabric?.composition && (
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.75rem' }} noWrap>
                              <span style={{ color: '#9ca3af', marginRight: 4 }}>Comp:</span> <span style={{ color: '#475569' }}>{item.fabric.composition}</span>
                            </Typography>
                          )}
                          {(item.fabric?.structure || item.fabric?.weightGsm) && (
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.75rem' }} noWrap>
                              {item.fabric?.structure && <><span style={{ color: '#9ca3af', marginRight: 4 }}>Str:</span> <span style={{ color: '#475569' }}>{item.fabric.structure}</span></>}
                              {item.fabric?.structure && item.fabric?.weightGsm && <span style={{ margin: '0 6px', color: '#cbd5e1' }}>|</span>}
                              {item.fabric?.weightGsm && <><span style={{ color: '#9ca3af', marginRight: 4 }}>GSM:</span> <span style={{ color: '#475569' }}>{item.fabric.weightGsm}</span></>}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                          <Chip 
                            label={item.supplierName || 'No Supplier'} 
                            size="small" 
                            sx={{ height: 22, fontSize: 10, bgcolor: '#f1f5f9', color: '#475569', fontWeight: 500 }} 
                          />
                          <Chip 
                            label={`${item.quantity ?? 0} ${item.quantityUnit || 'pcs'}`} 
                            size="small" 
                            color={(item.quantity ?? 0) > 0 ? 'success' : 'error'}
                            sx={{ height: 22, fontSize: 10, fontWeight: 700 }} 
                          />
                          {item.fabric?.hasSy && (
                            <Box 
                              onClick={(e) => {
                                e.stopPropagation();
                                React.startTransition(() => navigate(`${BASE}/yardage`, { state: { parentId: item.id } }));
                              }}
                              sx={{ 
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
                                px: 1, py: 0.25, borderRadius: 1, 
                                bgcolor: 'rgba(46,125,50,0.1)', color: '#2e7d32', 
                                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', 
                                letterSpacing: '0.05em', cursor: 'pointer', height: 22,
                                '&:hover': { bgcolor: 'rgba(46,125,50,0.2)' } 
                              }}
                            >
                              S/Y
                            </Box>
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
                          <span>{col.label}</span>
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
                {loading && items.length === 0 ? (
                  <TableRow><TableCell colSpan={colSpanCount} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} color="primary" />
                  </TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={colSpanCount} align="center" sx={{ py: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                      <TextureIcon sx={{ fontSize: 48, color: '#e2e8f0' }} />
                      <Typography color="text.secondary" fontWeight={600} fontSize={14}>
                        {!hasSearched ? t('rdMaterial.empty_instruction', 'Nhấn "LOAD DATA" để xem danh sách') : t('rdMaterial.no_results', 'No results found')}
                      </Typography>
                    </Box>
                  </TableCell></TableRow>
                ) : items.map((item) => {
                  const rowBgColor = (item.quantity ?? 0) <= 0 ? '#fef2f2' : '#fff';
                  return (
                    <TableRow
                        key={item.id} hover
                        sx={{ 
                          '&:last-child td': { borderBottom: 0 },
                          bgcolor: rowBgColor,
                          opacity: (item.quantity ?? 0) <= 0 ? 0.8 : 1,
                          transition: 'background-color 0.2s',
                          '&:hover': { bgcolor: '#F9FAFA !important' },
                          '&:hover td': { bgcolor: '#F9FAFA !important' },
                          '& .action-buttons': { opacity: 0, transition: 'opacity 0.2s' },
                          '&:hover .action-buttons': { opacity: 1 }
                        }}
                      >
  
                      {filteredCols.map((col) => renderRowCell(item, col.id, rowBgColor))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Table Footer / Pagination */}
        <Box sx={{ 
          borderTop: '1px solid #e1e3e4', 
          px: { xs: 1, sm: 3 }, 
          py: 1, 
          bgcolor: '#fff', 
          display: 'flex', 
          flexDirection: 'row',
          alignItems: 'center', 
          gap: { xs: 0.5, sm: 2 },
          justifyContent: 'space-between', 
          flexShrink: 0 
        }}>
          <Typography variant="body2" color="#3f4945" fontWeight={500} fontSize={{ xs: 11, sm: 13 }} sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {isMobile ? `Total: ${total}` : `Showing ${page * rowsPerPage + 1} - ${Math.min((page + 1) * rowsPerPage, total)} of ${total}`}
          </Typography>
          <Pagination
            count={Math.ceil(total / rowsPerPage) || 1}
            page={page + 1}
            onChange={(_, p) => { setPage(p - 1); }}
            color="primary" 
            shape="rounded"
            size={isMobile ? 'small' : 'medium'}
            siblingCount={0}
            boundaryCount={1}
            sx={{ 
              flexShrink: 1,
              '& .MuiPaginationItem-root': { 
                color: '#3f4945', 
                fontSize: isMobile ? 11 : 14,
                height: isMobile ? 24 : 32,
                minWidth: isMobile ? 24 : 32,
                '&.Mui-selected': { bgcolor: '#2e7d32', color: '#fff', '&:hover': { bgcolor: '#1b6d24' } } 
              } 
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#3f4945', fontSize: { xs: 11, sm: 12 }, flexShrink: 0 }}>
            <Select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
              size="small"
              sx={{ height: 24, fontSize: 11, bgcolor: '#f3f4f5', '& fieldset': { border: 'none' }, '&:hover fieldset': { border: '1px solid #bfc9c4' } }}
            >
              {[20, 50, 100].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
          </Box>
        </Box>
      </Paper>

      <FabricFormDrawer
        open={drawerOpen}
        item={editItem}
        isCopy={isCopy}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => { setDrawerOpen(false); setPage(0); if (!hasSearched) { setHasSearched(true); } else { load({ forceLoading: true }); } }}
      />

      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} PaperProps={{ sx: { borderRadius: 2, minWidth: 320 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{t('rdMaterial.confirm_delete_title', 'Confirm Deletion')}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">{t('rdMaterial.confirm_delete_message', 'Are you sure you want to delete this item?')}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
          <Button onClick={() => setDeleteId(null)} sx={{ color: 'text.secondary', fontWeight: 600 }}>{t('rdMaterial.cancel', 'Cancel')}</Button>
          <Button data-testid="btn-confirm-dialog" variant="contained" color="error" onClick={confirmDelete} disableElevation sx={{ fontWeight: 600 }}>{t('rdMaterial.delete', 'Delete')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={customerDialogOpen} onClose={() => setCustomerDialogOpen(false)} PaperProps={{ sx: { borderRadius: 2, minWidth: 350 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{t('rdMaterial.export_excel', 'Export Excel')}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('rdMaterial.select_customer_to_export', 'Select a customer to export the submission list:')}
            </Typography>
            <Autocomplete
              freeSolo
              options={customerOptions}
              value={selectedCustomer}
              onChange={(_, newValue) => setSelectedCustomer(newValue || '')}
              onInputChange={(_, newValue) => setSelectedCustomer(newValue || '')}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label={t('rdMaterial.customer', 'Customer')} 
                  variant="outlined" 
                  size="small" 
                  fullWidth
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          <Button onClick={() => setCustomerDialogOpen(false)} sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {t('rdMaterial.cancel', 'Cancel')}
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => handleExport(selectedCustomer)} 
            disableElevation 
            sx={{ fontWeight: 600, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b6d24' } }}
          >
            {t('rdMaterial.export', 'Export')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={(snackbar.severity as 'success' | 'error' | 'warning' | 'info') || 'success'} sx={{ width: '100%', borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default FabricListPage;
