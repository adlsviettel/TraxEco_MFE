import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Button, Card, Chip, CircularProgress, IconButton, InputAdornment, Paper,
  MenuItem, Select, Table, TableBody, TableCell, TableContainer, Drawer,
  TableHead, Pagination, TableRow, TextField, Tooltip, Typography,
  Autocomplete, Menu, Checkbox, Divider, useTheme, useMediaQuery
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DraggableFab } from './DraggableFab';
import SearchIcon from '@mui/icons-material/Search';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FilterListIcon from '@mui/icons-material/FilterList';
import CategoryIcon from '@mui/icons-material/Category';
import SyncIcon from '@mui/icons-material/Sync';
import TextureIcon from '@mui/icons-material/Texture';
import LaunchIcon from '@mui/icons-material/Launch';
import { authService, ConfirmDialog, defaultConfirmDialog, AppButton, AppTextField } from '@traxeco/shared';
import type { ConfirmDialogState } from '@traxeco/shared';
import { rdItemApi } from '../services/rdMaterialApi';
import type { Item, ItemType } from '../types';
import GenericItemFormDrawer from './GenericItemFormDrawer';
import SwipeableItem from './ui/SwipeableItem';
import { useTranslation } from 'react-i18next';
import { useDragScroll } from '../hooks/useDragScroll';

const CATEGORIES = ['Woven', 'Knit', 'Lace', 'Nonwoven', 'Leather', 'Others'];

const CATEGORY_COLOR: Record<string, { bg: string; color: string }> = {
  Woven:    { bg: '#dcfce7', color: '#16a34a' },
  Knit:     { bg: '#dbeafe', color: '#2563eb' },
  Lace:     { bg: '#fce7f3', color: '#db2777' },
  Nonwoven: { bg: '#fff7ed', color: '#ea580c' },
  Leather:  { bg: '#f3e8ff', color: '#9333ea' },
  Others:   { bg: '#f1f5f9', color: '#64748b' },
};

export interface ColumnDef {
  header: string;
  render: (item: Item) => React.ReactNode;
}

export interface GenericItemListProps {
  title: string;
  subtitle: string;
  itemType: ItemType;
  baseRoute: string; // e.g. '/rd-material/accessory'
  icon?: React.ReactNode;
  columns: ColumnDef[];
  // Form fields config (passed down to the drawer)
  formFields?: Array<{ name: string; label: string; block: 'main' | 'specs' | 'finance'; type?: string }>;
  disableAdd?: boolean;
  disableRowClick?: boolean;
  categoryLabel?: string;
}const translateHeader = (header: string, t: any) => {
  const map: Record<string, string> = {
    'Supplier': t('rdMaterial.supplier', 'Supplier'),
    'Origin': t('rdMaterial.origin', 'Origin'),
    'Price': t('rdMaterial.price', 'Price'),
    'MOQ/MCQ': t('rdMaterial.moqMcq', 'MOQ/MCQ'),
    'Surcharge': t('rdMaterial.surcharge', 'Surcharge'),
    'Leadtime': t('rdMaterial.leadtime', 'Leadtime'),
    'Holder': t('rdMaterial.holder', 'Holder'),
    'Remark': t('rdMaterial.remark', 'Remark'),
    'Structure': t('rdMaterial.structure', 'Structure'),
    'Fabric name': t('rdMaterial.fabric_name', 'Fabric name'),
    'Composition': t('rdMaterial.composition', 'Composition'),
    'Function': t('rdMaterial.function', 'Function'),
    'Weight (GSM)': t('rdMaterial.weight_gsm', 'Weight (GSM)'),
    'Cuttable width (inch)': t('rdMaterial.width', 'Cuttable width (inch)'),
    'Color': t('rdMaterial.color', 'Color'),
    'Category': t('rdMaterial.category', 'Category'),
    'Sport': t('rdMaterial.sport_category', 'Sport'),
    'Style Name': t('rdMaterial.style_name', 'Style Name'),
    'Stage': t('rdMaterial.stage', 'Stage'),
    'Size': t('rdMaterial.size', 'Size'),
    'Gender': t('rdMaterial.gender', 'Gender'),
    'Pattern Marker': t('rdMaterial.pattern_marker', 'Pattern Marker'),
    'Allocation': t('rdMaterial.allocation', 'Allocation'),
    'Main Composition': t('rdMaterial.main_composition', 'Main Composition'),
    'FOB Price': t('rdMaterial.fob_price', 'FOB Price'),
  };
  return map[header] || header;
};

const GenericItemList: React.FC<GenericItemListProps> = ({ title, subtitle, itemType, baseRoute, icon, columns, formFields, disableAdd, disableRowClick, categoryLabel }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dragRef = useDragScroll();


  const navigate = useNavigate();
  const locationState = useLocation().state as { keyword?: string; parentId?: number } | null;
  const stateKeyword = locationState?.keyword;
  const stateParentId = locationState?.parentId;
  const STORAGE_KEY = `rd-material-state-${itemType}`;
  const pageCode = 'rd_' + baseRoute.split('/').pop();
  const canAdd = !disableAdd && authService.hasAction(pageCode, 'canAdd');
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

  const [items, setItems] = useState<Item[]>(stateParentId || stateKeyword ? [] : (init.items ?? []));
  const [total, setTotal] = useState(stateParentId || stateKeyword ? 0 : (init.total ?? 0));
  const [page, setPage] = useState(stateParentId || stateKeyword ? 0 : (init.page ?? 0));
  const [rowsPerPage, setRowsPerPage] = useState(init.rowsPerPage ?? 20);
  
  // Initialize keyword from location state if available, otherwise from session storage
  const [keyword, setKeyword] = useState(stateKeyword || (stateParentId ? '' : (init.keyword ?? '')));
  const [localKeyword, setLocalKeyword] = useState(stateKeyword || (stateParentId ? '' : (init.keyword ?? '')));
  const [parentId, setParentId] = useState<number | undefined>(stateParentId ?? init.parentId);
  
  const [itemCode, setItemCode] = useState<string[]>(stateParentId || stateKeyword ? [] : (Array.isArray(init.itemCode) ? init.itemCode : (init.itemCode ? init.itemCode.split(',') : [])));
  const [supplierName, setSupplierName] = useState<string[]>(stateParentId ? [] : (Array.isArray(init.supplierName) ? init.supplierName : (init.supplierName ? init.supplierName.split(',') : [])));
  const [color, setColor] = useState<string[]>(stateParentId ? [] : (Array.isArray(init.color) ? init.color : (init.color ? init.color.split(',') : [])));
  const [origin, setOrigin] = useState<string[]>(stateParentId ? [] : (Array.isArray(init.origin) ? init.origin : (init.origin ? init.origin.split(',') : [])));
  const [location, setLocation] = useState<string[]>(stateParentId ? [] : (Array.isArray(init.location) ? init.location : (init.location ? init.location.split(',') : [])));
  const [holder, setHolder] = useState<string[]>(stateParentId ? [] : (Array.isArray(init.holder) ? init.holder : (init.holder ? init.holder.split(',') : [])));

  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(stateParentId || stateKeyword ? true : (init.hasSearched ?? false));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [colMenuAnchor, setColMenuAnchor] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`rd-columns-${itemType}`);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    
    const defaults: Record<string, boolean> = {
      Image: true,
      Name: true,
      'Item Code': true,
      Category: true,
      Location: true,
      Qty: true,
      'Created At': true,
      Actions: true
    };
    columns.forEach(col => {
      defaults[col.header] = true;
    });
    return defaults;
  });

  useEffect(() => {
    setVisibleColumns(prev => {
      let changed = false;
      const next = { ...prev };
      columns.forEach(col => {
        if (next[col.header] === undefined) {
          next[col.header] = true;
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(`rd-columns-${itemType}`, JSON.stringify(next));
        return next;
      }
      return prev;
    });
  }, [columns, itemType]);

  useEffect(() => {
    localStorage.setItem(`rd-columns-${itemType}`, JSON.stringify(visibleColumns));
  }, [visibleColumns, itemType]);

  const colSpanCount = 
    (visibleColumns['Image'] !== false ? 1 : 0) +
    (visibleColumns['Name'] !== false ? 1 : 0) +
    (visibleColumns['Item Code'] !== false ? 1 : 0) +
    (visibleColumns['Category'] !== false ? 1 : 0) +
    columns.filter(col => visibleColumns[col.header] !== false).length +
    (visibleColumns['Location'] !== false ? 1 : 0) +
    (visibleColumns['Qty'] !== false ? 1 : 0) +
    (visibleColumns['Created At'] !== false ? 1 : 0) +
    (visibleColumns['Actions'] !== false ? 1 : 0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (keyword !== localKeyword) {
        setKeyword(localKeyword);
        if (hasSearched) setPage(0);
        setParentId(undefined);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localKeyword, keyword, hasSearched]);

  useEffect(() => {
    if (stateParentId !== undefined) {
      setLocalKeyword('');
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
      setLocalKeyword(stateKeyword);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ page, rowsPerPage, keyword, itemCode, supplierName, color, origin, location, holder, hasSearched, items, total, parentId }));
    }, 300);
    return () => clearTimeout(timer);
  }, [STORAGE_KEY, page, rowsPerPage, keyword, itemCode, supplierName, color, origin, location, holder, hasSearched, items, total, parentId]);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isCopy, setIsCopy] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmDialogState>(defaultConfirmDialog);

  const [filterOpen, setFilterOpen] = useState(false);
  const activeFiltersCount = (itemCode.length > 0 ? 1 : 0) + (supplierName.length > 0 ? 1 : 0) + (color.length > 0 ? 1 : 0) + (origin.length > 0 ? 1 : 0) + (location.length > 0 ? 1 : 0) + (holder.length > 0 ? 1 : 0);

  const load = useCallback(async (options?: { forceLoading?: boolean }) => {
    if (!hasSearched) return;
    
    const force = options?.forceLoading === true;
    const silent = !force && items.length > 0;
    
    if (!silent) setLoading(true);
    try {
      const data = await rdItemApi.getAll({ 
        itemType, 
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
      console.error('GET error:', err);
      if (!silent) setItems([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [itemType, keyword, parentId, itemCode, supplierName, color, origin, location, holder, page, rowsPerPage, hasSearched]);

  const currentParamsRef = useRef(JSON.stringify({ itemType, keyword, parentId, itemCode, supplierName, color, origin, location, holder, page, rowsPerPage, hasSearched }));

  useEffect(() => {
    const currentParams = JSON.stringify({ itemType, keyword, parentId, itemCode, supplierName, color, origin, location, holder, page, rowsPerPage, hasSearched });
    if (currentParams === currentParamsRef.current && items.length > 0) {
      // Data matches current params and is already in memory, skip load
      return;
    }
    currentParamsRef.current = currentParams;
    load(); 
  }, [load, itemType, keyword, parentId, itemCode, supplierName, color, origin, location, holder, page, rowsPerPage, hasSearched, items.length]);

  const handleDelete = (id: number) => {
    setConfirmState({
      open: true,
      title: 'Delete Data',
      message: 'Are you sure you want to delete this item? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try { await rdItemApi.softDelete(id); load(); } catch { /* ignore */ }
      }
    });
  };

  const catStyle = (cat?: string) => CATEGORY_COLOR[cat ?? ''] ?? CATEGORY_COLOR['Others'];

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await rdItemApi.getAll({ 
        itemType, 
        keyword: parentId ? undefined : keyword,
        parentId,
        itemCode: itemCode.join(','), supplierName: supplierName.join(','), 
        color: color.join(','), origin: origin.join(','), 
        location: location.join(','), holder: holder.join(','), 
        page: 0, size: 10000 
      });
      const { exportRdItemsToExcel } = await import('../utils/excelExport');
      exportRdItemsToExcel(data.content ?? [], itemType as any, t);
      // alert success maybe
    } catch {
      // error
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <GenericItemFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        item={editItem}
        isCopy={isCopy}
        itemType={itemType}
        title={editItem ? (isCopy ? `Copy/Clone ${title}` : `Edit ${title}`) : `Add New ${title}`}
        fields={formFields ?? []}
        onSaved={() => { setPage(0); if (!hasSearched) setHasSearched(true); else load(); }}
      />
      <ConfirmDialog 
        state={confirmState} 
        onClose={() => setConfirmState(s => ({ ...s, open: false }))} 
      />

      {/* 🚀 Compact Toolbar 🚀 */}
      {isMobile ? (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', pt: 1, px: 0.5 }}>
            <Box sx={{ display: 'flex', gap: 1, width: '100%', alignItems: 'center' }}>
              <AppTextField placeholder="Search by name, code..."
                value={keyword} debounceMs={400} onDebounceChange={setKeyword}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: '#707975' }} /></InputAdornment>,
                  endAdornment: keyword ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => { setLocalKeyword(''); setKeyword(''); }}><ClearIcon sx={{ fontSize: 16 }} /></IconButton>
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
                  {loading ? 'Loading...' : `${total} items found`}
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
            <MenuItem disabled={exporting || total === 0} onClick={() => { setMobileMenuAnchor(null); handleExport(); }}>
              <FileDownloadIcon sx={{ mr: 1.5, fontSize: 20, color: 'text.secondary' }} />
              <Typography fontSize={14} fontWeight={500}>{exporting ? t('rdMaterial.exporting', 'Exporting...') : t('rdMaterial.export', 'Export')}</Typography>
            </MenuItem>
          </Menu>

          {canAdd && !filterOpen && (
            <DraggableFab 
              color="primary" 
              onClick={() => React.startTransition(() => { setIsCopy(false); setEditItem(null); setDrawerOpen(true); })}
              initialBottom={80}
              initialRight={16}
              sx={{ 
                bgcolor: '#2e7d32', 
                '&:hover': { bgcolor: '#1b5e20' }
              }}
            >
              <AddIcon />
            </DraggableFab>
          )}
        </>
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
            {/* Sub-group 1: Search box */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: { xs: '1 1 100%', sm: '0 1 auto' }, minWidth: 200 }}>
              <AppTextField placeholder="Search by name, code..."
                value={keyword} debounceMs={400} onDebounceChange={setKeyword}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: '#707975' }} /></InputAdornment>,
                  endAdornment: keyword ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => { setLocalKeyword(''); setKeyword(''); }}><ClearIcon sx={{ fontSize: 16 }} /></IconButton>
                    </InputAdornment>
                  ) : null,
                }}
                sx={{ width: '100%', minWidth: 200, maxWidth: { sm: 280, md: 320 } }}
              />
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
                Filter{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
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
              {loading ? 'Loading...' : `${total} items`}
            </Box>

            <AppButton variant="outlined" customVariant="primary"
              disabled={exporting || total === 0}
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

            {canAdd && (
              <AppButton variant="contained" customVariant="primary"
                startIcon={<AddIcon sx={{ fontSize: '20px !important' }} />}
                onClick={() => React.startTransition(() => { setIsCopy(false); setEditItem(null); setDrawerOpen(true); })}
                sx={{ height: 40 }}
              >
                Add New
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
        {[
          { id: 'Image', label: 'Image' },
          { id: 'Name', label: itemType === 'YARDAGE' ? 'Fabric Name' : 'ERP Number' },
          { id: 'Item Code', label: 'Item Code' },
          { id: 'Category', label: categoryLabel || 'Category' },
          ...columns.map(c => ({ id: c.header, label: c.header })),
          { id: 'Location', label: 'Location' },
          { id: 'Qty', label: 'Qty' },
          { id: 'Created At', label: 'Created At' },
          { id: 'Actions', label: 'Actions' }
        ].map((col) => (
          <MenuItem key={col.id} onClick={() => setVisibleColumns(prev => ({ ...prev, [col.id]: prev[col.id] === false }))} sx={{ py: 0.5, borderRadius: 1 }}>
            <Checkbox size="small" checked={visibleColumns[col.id] !== false} onChange={() => {}} sx={{ mr: 1, p: 0, pointerEvents: 'none' }} />
            <Typography fontSize={13} fontWeight={500} sx={{ pointerEvents: 'none' }}>{col.label}</Typography>
          </MenuItem>
        ))}
      </Menu>

      {/* Filter Drawer */}
      <Drawer
        anchor="right"
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        sx={{ zIndex: 9999 }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 360 }, p: 0, bgcolor: '#f8fafc' } }}
      >
            <Box sx={{ p: 2.5, bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" fontWeight={700}>{t('rdMaterial.advanced_filter', 'Advanced Filter')}</Typography>
              <IconButton onClick={() => setFilterOpen(false)} size="small"><ClearIcon /></IconButton>
            </Box>
            <Box display="flex" flexDirection="column" gap={2} sx={{ p: 2.5, flex: 1, overflowY: 'auto' }} onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.defaultPrevented && (e.target as HTMLInputElement).tagName === 'INPUT' && !(e.target as HTMLInputElement).value) {
                e.preventDefault();
                setFilterOpen(false);
                setTimeout(() => {
                  if (!hasSearched) setHasSearched(true);
                  else { setPage(0); load({ forceLoading: true }); }
                }, 100);
              }
            }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">{t('rdMaterial.filter_item_code', 'Item Code')}</Typography>
                <Autocomplete multiple freeSolo options={[] as string[]} value={itemCode} onChange={(_, val) => { setItemCode(val); if(hasSearched) setPage(0); }} renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder={t('rdMaterial.enter_to_add', 'Enter to add...')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 14, bgcolor: '#fff' } }} />} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">{t('rdMaterial.filter_supplier', 'Supplier')}</Typography>
                <Autocomplete multiple freeSolo options={[] as string[]} value={supplierName} onChange={(_, val) => { setSupplierName(val); if(hasSearched) setPage(0); }} renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder={t('rdMaterial.enter_to_add', 'Enter to add...')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 14 } }} />} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">{t('rdMaterial.filter_color', 'Color')}</Typography>
                <Autocomplete multiple freeSolo options={[] as string[]} value={color} onChange={(_, val) => { setColor(val); if(hasSearched) setPage(0); }} renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder={t('rdMaterial.enter_to_add', 'Enter to add...')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 14 } }} />} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">{t('rdMaterial.filter_origin', 'Origin')}</Typography>
                <Autocomplete multiple freeSolo options={[] as string[]} value={origin} onChange={(_, val) => { setOrigin(val); if(hasSearched) setPage(0); }} renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder={t('rdMaterial.enter_to_add', 'Enter to add...')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 14 } }} />} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">{t('rdMaterial.filter_location', 'Location')}</Typography>
                <Autocomplete multiple freeSolo options={[] as string[]} value={location} onChange={(_, val) => { setLocation(val); if(hasSearched) setPage(0); }} renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder={t('rdMaterial.enter_to_add', 'Enter to add...')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 14, bgcolor: '#fff' } }} />} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">{t('rdMaterial.filter_holder', 'Holder')}</Typography>
                <Autocomplete multiple freeSolo options={[] as string[]} value={holder} onChange={(_, val) => { setHolder(val); if(hasSearched) setPage(0); }} renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder={t('rdMaterial.enter_to_add', 'Enter to add...')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 14, bgcolor: '#fff' } }} />} />
              </Box>
            </Box>
            <Box sx={{ p: 2.5, bgcolor: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 1.5 }}>
              {activeFiltersCount > 0 && (
                <Button fullWidth variant="outlined" color="inherit"
                  onClick={() => { setItemCode([]); setSupplierName([]); setColor([]); setOrigin([]); setLocation([]); setHolder([]); if(hasSearched) setPage(0); }} 
                  sx={{ color: 'text.secondary', fontWeight: 600, borderColor: '#cbd5e1' }}>
                  {t('rdMaterial.clear_all', 'Clear All')}
                </Button>
              )}
              <Button fullWidth variant="contained" onClick={() => {
                setFilterOpen(false);
                setTimeout(() => {
                  if (!hasSearched) setHasSearched(true);
                  else { setPage(0); load({ forceLoading: true }); }
                }, 100);
              }} disableElevation sx={{ bgcolor: '#2e7d32', color: '#fff', '&:hover': { bgcolor: 'rgba(46,125,50,0.9)' }, fontWeight: 700 }}>
                {t('rdMaterial.apply', 'Apply')}
              </Button>
            </Box>
          </Drawer>

      {/* 🚀 Table / Cards 🚀 */}
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
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {loading && items.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={28} color="primary" />
              </Box>
            ) : items.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 8 }}>
                <CategoryIcon sx={{ fontSize: 48, color: '#e2e8f0' }} />
                <Typography color="text.secondary" fontWeight={600} fontSize={14}>
                  {!hasSearched ? t('rdMaterial.empty_instruction', 'Click "LOAD DATA" to view the list') : t('rdMaterial.no_results', 'No results found')}
                </Typography>
              </Box>
            ) : (
              items.map((item) => {
                const cs = catStyle(item.category);
                
                const rightActions = [];
                if (canEdit && visibleColumns['Actions'] !== false) {
                  rightActions.push({
                    label: t('rdMaterial.edit', 'Edit'),
                    icon: <EditIcon fontSize="small" />,
                    color: '#f59e0b',
                    onClick: () => { setIsCopy(false); setEditItem(item); setDrawerOpen(true); }
                  });
                }
                if (visibleColumns['Actions'] !== false) {
                  rightActions.push({
                    label: t('rdMaterial.print', 'Print'),
                    icon: <PrintIcon fontSize="small" />,
                    color: '#6366f1',
                    onClick: () => navigate(`/rd-material/label/${item.id}`)
                  });
                }

                return (
                  <SwipeableItem
                    key={item.id}
                    swipeRightLabel={t('rdMaterial.open_details', 'Open Details')}
                    swipeRightIcon={<LaunchIcon />}
                    swipeRightColor="#2e7d32"
                    onSwipeRight={() => !disableRowClick && navigate(`${baseRoute}/${item.id}`)}
                    rightActions={rightActions}
                  >
                    <Box 
                      onClick={() => !disableRowClick && navigate(`${baseRoute}/${item.id}`)}
                      sx={{ 
                        p: 1.5,
                        display: 'flex',
                        gap: 1.5,
                        alignItems: 'center',
                        bgcolor: (item.quantity ?? 0) <= 0 ? '#fef2f2' : '#fff',
                        cursor: disableRowClick ? 'default' : 'pointer',
                        '&:active': !disableRowClick ? { bgcolor: '#f8fafc' } : undefined,
                        transition: 'background-color 0.1s'
                      }}
                    >
                      {/* Image or Placeholder */}
                      {visibleColumns['Image'] !== false && (
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
                      )}

                      {/* Details */}
                      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {visibleColumns['Name'] !== false && (
                          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.875rem' }}>
                            {item.name || 'N/A'}
                          </Typography>
                        )}
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          {visibleColumns['Item Code'] !== false && item.itemCode && (
                            <Typography 
                              variant="body2" 
                              sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem' }}
                              onClick={async (e) => { 
                                e.stopPropagation(); 
                                if (item.itemType !== 'FABRIC' && item.itemCode) {
                                  try {
                                    const res = await rdItemApi.getAll({ itemType: 'FABRIC', keyword: item.itemCode, size: 1 });
                                    if (res.content && res.content.length > 0) {
                                      navigate(`/rd-material/fabric/${res.content[0].id}`);
                                      return;
                                    }
                                  } catch (err) {
                                    console.error('Failed to resolve fabric ID', err);
                                  }
                                }
                                navigate(`/rd-material/fabric/${item.parentId || item.id}`); 
                              }}
                            >
                              ItemCode: <span style={{ color: '#1a73e8', textDecoration: 'underline' }}>{item.itemCode}</span>
                            </Typography>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                          {visibleColumns['Category'] !== false && item.category && (
                            <Chip 
                              label={item.category} 
                              size="small" 
                              sx={{ 
                                height: 22, fontSize: 10, fontWeight: 700,
                                bgcolor: cs.bg, 
                                color: cs.color,
                              }} 
                            />
                          )}
                          {visibleColumns['Supplier'] !== false && (
                            <Chip 
                              label={item.supplierName || 'No Supplier'} 
                              size="small" 
                              sx={{ height: 22, fontSize: 10, bgcolor: '#f1f5f9', color: '#475569', fontWeight: 500 }} 
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
                              label={`${item.quantity ?? 0}${item.quantityUnit ? ` ${item.quantityUnit}` : (item.priceUnit ? ` ${item.priceUnit}` : '')}`} 
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
                  {visibleColumns['Image'] !== false && <TableCell sx={{ width: 60, bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, whiteSpace: 'nowrap' }}></TableCell>}
                  {visibleColumns['Name'] !== false && <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, whiteSpace: 'nowrap' }}>{itemType === 'YARDAGE' ? t('rdMaterial.fabric_name', 'Fabric Name') : t('rdMaterial.erp_number', 'ERP Number')}</TableCell>}
                  {visibleColumns['Item Code'] !== false && <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, whiteSpace: 'nowrap' }}>{t('rdMaterial.item_code', 'Item Code')}</TableCell>}
                  {visibleColumns['Category'] !== false && <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, whiteSpace: 'nowrap' }}>{categoryLabel ? t(categoryLabel.toLowerCase().replace(/ /g, '_'), categoryLabel) : t('rdMaterial.category', 'Category')}</TableCell>}
                  {columns.map((col, idx) => visibleColumns[col.header] !== false && (
                    <TableCell key={idx} sx={{ fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, whiteSpace: 'nowrap' }}>
                      {translateHeader(col.header, t)}
                    </TableCell>
                  ))}
                  {visibleColumns['Location'] !== false && <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, whiteSpace: 'nowrap' }}>{t('rdMaterial.location', 'Location')}</TableCell>}
                  {visibleColumns['Qty'] !== false && <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, textAlign: 'center', whiteSpace: 'nowrap' }}>{t('rdMaterial.quantity', 'Qty')}</TableCell>}
                  {visibleColumns['Created At'] !== false && <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, whiteSpace: 'nowrap' }}>{t('rdMaterial.created_at', 'Created At')}</TableCell>}
                  {visibleColumns['Actions'] !== false && <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#707975', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: '#F9FAFA', borderBottom: '1px solid #e1e3e4', py: 2, px: 2, textAlign: 'right', whiteSpace: 'nowrap' }}>{t('rdMaterial.actions', 'Actions')}</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody sx={{ '& tr:nth-of-type(even)': { bgcolor: '#fff' }, '& tr:nth-of-type(odd)': { bgcolor: '#fff' }, opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                {loading ? (
                  <TableRow><TableCell colSpan={colSpanCount} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} color="primary" />
                  </TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={colSpanCount} align="center" sx={{ py: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                      <CategoryIcon sx={{ fontSize: 48, color: '#e2e8f0' }} />
                      <Typography color="text.secondary" fontWeight={600} fontSize={14}>
                        {!hasSearched ? t('rdMaterial.empty_instruction', 'Click "LOAD DATA" to view the list') : t('rdMaterial.no_results', 'No results found')}
                      </Typography>
                    </Box>
                  </TableCell></TableRow>
                ) : items.map((item) => {
                  const cs = catStyle(item.category);
                  return (
                    <TableRow 
                      key={item.id} 
                      hover 
                      onClick={() => !disableRowClick && navigate(`${baseRoute}/${item.id}`)} 
                      sx={{ 
                        cursor: disableRowClick ? 'default' : 'pointer', 
                        '&:last-child td': { border: 0 },
                        bgcolor: (item.quantity ?? 0) <= 0 ? '#fef2f2' : '#fff',
                        transition: 'background-color 0.2s',
                        '&:hover': { bgcolor: '#F9FAFA !important' },
                        '& .action-buttons': { opacity: 0, transition: 'opacity 0.2s' },
                        '&:hover .action-buttons': { opacity: 1 }
                      }}
                    >
                      {visibleColumns['Image'] !== false && (
                        <TableCell sx={{ px: 2, py: 1.5, textAlign: 'center' }}>
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
                            <Box sx={{ width: 48, height: 48, borderRadius: 1, overflow: 'hidden', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfc9c4', mx: 'auto', fontSize: 20 }}>
                              📦
                            </Box>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns['Name'] !== false && (
                        <TableCell sx={{ py: 1.5, fontSize: 13, color: '#191c1d' }}>
                          <Typography fontWeight={500} fontSize={13} color="#191c1d" noWrap sx={{ maxWidth: 200 }}>
                            {item.name}
                          </Typography>
                        </TableCell>
                      )}
                      {visibleColumns['Item Code'] !== false && (
                        <TableCell sx={{ py: 1.5, fontSize: 13 }}>
                          {item.itemCode ? (
                            <Typography 
                              component="span" 
                              sx={{ color: '#1a73e8', cursor: 'pointer', fontWeight: 500, '&:hover': { textDecoration: 'underline' } }}
                              onClick={async (e) => { 
                                e.stopPropagation(); 
                                if (item.itemType !== 'FABRIC' && item.itemCode) {
                                  try {
                                    const res = await rdItemApi.getAll({ itemType: 'FABRIC', keyword: item.itemCode, size: 1 });
                                    if (res.content && res.content.length > 0) {
                                      navigate(`/rd-material/fabric/${res.content[0].id}`);
                                      return;
                                    }
                                  } catch (err) {
                                    console.error('Failed to resolve fabric ID', err);
                                  }
                                }
                                navigate(`/rd-material/fabric/${item.parentId || item.id}`); 
                              }}
                            >
                              {item.itemCode}
                            </Typography>
                          ) : (
                            <Typography component="span" sx={{ color: '#3f4945' }}>–</Typography>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns['Category'] !== false && (
                        <TableCell sx={{ py: 1.5, px: 2 }}>
                          {item.category ? (
                            <Chip label={item.category} size="small"
                              sx={{ bgcolor: cs.bg, color: cs.color, fontWeight: 600, fontSize: 11, height: 22 }} />
                          ) : <Typography fontSize={12} color="#707975">–</Typography>}
                        </TableCell>
                      )}

                      {/* Custom columns */}
                      {columns.map((col, idx) => visibleColumns[col.header] !== false && (
                        <TableCell key={idx} sx={{ py: 1.5, px: 2, fontSize: 13, color: '#3f4945' }}>
                          {col.render(item)}
                        </TableCell>
                      ))}

                      {visibleColumns['Location'] !== false && (
                        <TableCell sx={{ py: 1.5, px: 2, fontSize: 13, color: '#3f4945' }}>{item.location || '–'}</TableCell>
                      )}
                      {visibleColumns['Qty'] !== false && (
                        <TableCell sx={{ py: 1.5, textAlign: 'center' }}>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', px: 1.25, py: 0.5, borderRadius: '6px', bgcolor: 'rgba(46,125,50,0.1)', color: '#2e7d32', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, minWidth: 36 }}>
                            {item.quantity ?? 0}{item.quantityUnit ? ` ${item.quantityUnit}` : (item.priceUnit ? ` ${item.priceUnit}` : '')}
                          </Box>
                        </TableCell>
                      )}
                      {visibleColumns['Created At'] !== false && (
                        <TableCell sx={{ py: 1.5, px: 2, fontSize: 13, color: '#3f4945', whiteSpace: 'nowrap' }}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–'}
                        </TableCell>
                      )}
                      {visibleColumns['Actions'] !== false && (
                        <TableCell onClick={(e) => e.stopPropagation()} sx={{ py: 1.5, textAlign: 'right', pr: 3 }}>
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
                            <IconButton size="small" onClick={() => navigate(`/rd-material/label/${item.id}`)} sx={{ color: '#707975', '&:hover': { color: '#2e7d32', bgcolor: '#f3f4f5' } }}>
                              <PrintIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                            {canDelete && (
                              <IconButton size="small" onClick={() => handleDelete(item.id)} sx={{ color: '#707975', '&:hover': { color: '#ba1a1a', bgcolor: '#ffdad6' } }}>
                                <DeleteIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                      )}
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
    </Box>
  );
};

export default GenericItemList;
