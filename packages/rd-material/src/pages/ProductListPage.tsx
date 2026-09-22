import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, Chip, CircularProgress, IconButton, InputAdornment, Paper,
  Table, TableBody, TableCell, TableContainer, Select, MenuItem, Pagination, Checkbox,
  TableHead, TableRow, TextField, Tooltip, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Autocomplete,
  Menu, Divider, ToggleButton, ToggleButtonGroup, useTheme, useMediaQuery, Fab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FilterListIcon from '@mui/icons-material/FilterList';
import SyncIcon from '@mui/icons-material/Sync';
import TextureIcon from '@mui/icons-material/Texture';
import LaunchIcon from '@mui/icons-material/Launch';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import TableChartIcon from '@mui/icons-material/TableChart';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import MoreVertIcon from '@mui/icons-material/MoreVert';

import { DraggableFab } from '../components/DraggableFab';
import { authService, AppButton, AppTextField, AdvancedFilterDrawer, columnFilterStore, TableExcelColumnMenu, scrollToTop } from '@traxeco/shared';
import { exportRdItemsToExcel } from '../utils/excelExport';
import { saveFileWithPicker } from '../utils/fileSaveHelper';
import { rdItemApi } from '../services/rdMaterialApi';
import type { Item } from '../types';
import ProductFormDrawer from './ProductFormDrawer';
import ProductPdfExport, { PdfProductData } from '../components/ProductPdfExport';
import { useTranslation } from 'react-i18next';
import { useDragScroll } from '../hooks/useDragScroll';
import SwipeableItem from '../components/ui/SwipeableItem';
import ImageZoomModal from '../components/ImageZoomModal';

const BASE = '/rd-material';

const renderCompositionCell = (compStr?: any) => {
  if (!compStr) return '–';
  if (typeof compStr !== 'string') return '–';
  if (!compStr.startsWith('[')) return compStr;
  try {
    const list = JSON.parse(compStr);
    if (Array.isArray(list)) {
      if (list.length === 0) return '–';
      
      return (
        <Tooltip
          title={
            <Box sx={{ p: 0.5 }}>
              {list.map((item: any, idx: number) => (
                <Box key={idx} sx={{ mb: idx === list.length - 1 ? 0 : 0.75, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#a7f3d0', textTransform: 'uppercase', fontSize: 10 }}>
                    {item.usage || 'Usage'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#fff', fontSize: 11, fontWeight: 500 }}>
                    {item.itemCode} - {item.name} {item.color ? `(${item.color})` : ''}
                  </Typography>
                </Box>
              ))}
            </Box>
          }
          arrow
          placement="top"
        >
          <Box sx={{ display: 'inline-flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 220 }}>
            {list.map((item: any, idx: number) => (
              <Chip
                key={idx}
                label={item.itemCode || item.name || '–'}
                size="small"
                variant="outlined"
                sx={{ 
                  height: 20, 
                  fontSize: 11, 
                  fontWeight: 500,
                  color: '#2e7d32',
                  borderColor: 'rgba(46,125,50,0.3)',
                  bgcolor: 'rgba(46,125,50,0.04)',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'rgba(46,125,50,0.1)'
                  }
                }}
              />
            ))}
          </Box>
        </Tooltip>
      );
    }
  } catch (e) {
    console.error('Failed to parse composition JSON', e);
  }
  return compStr;
};

const getStickyHeaderStyle = (colId: string, filteredCols: any[]): any => {
  const stickyIds = ['Select', 'Image', 'Project', 'Item Code'];
  if (!stickyIds.includes(colId)) return {};
  
  let left = 0;
  for (const c of filteredCols) {
    if (c.id === colId) break;
    if (stickyIds.includes(c.id)) {
      if (c.id === 'Select') left += 44;
      else if (c.id === 'Image') left += 80;
      else if (c.id === 'Project') left += 200;
      else if (c.id === 'Item Code') left += 240;
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

interface ProductTableRowProps {
  item: Item;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  filteredCols: any[];
  stickyOffsets: Record<string, number>;
  canEdit: boolean;
  canAdd: boolean;
  canDelete: boolean;
  onOpenDetails: (id: number) => void;
  onEdit: (item: Item) => void;
  onCopy: (item: Item) => void;
  onPrint: (id: number) => void;
  onDelete: (id: number) => void;
  onPreviewZoom: (item: Item) => void;
}

const ProductTableRow = React.memo<ProductTableRowProps>(({
  item,
  isSelected,
  onToggleSelect,
  filteredCols,
  stickyOffsets,
  canEdit,
  canAdd,
  canDelete,
  onOpenDetails,
  onEdit,
  onCopy,
  onPrint,
  onDelete,
  onPreviewZoom,
}) => {
  const { t } = useTranslation();
  const rowBgColor = '#fff';

  const getStickyStyle = (colId: string) => {
    if (stickyOffsets[colId] === undefined) return {};
    return {
      position: 'sticky',
      left: stickyOffsets[colId],
      zIndex: 10,
      bgcolor: rowBgColor,
      borderRight: colId === 'Item Code' ? '2px solid #bfc9c4' : undefined,
    };
  };

  return (
    <TableRow
      hover
      sx={{ 
        '&:last-child td': { borderBottom: 0 },
        bgcolor: rowBgColor,
        transition: 'background-color 0.2s',
        '&:hover': { bgcolor: '#F9FAFA !important' },
        '&:hover td': { bgcolor: '#F9FAFA !important' },
        '& .action-buttons': { opacity: 0, transition: 'opacity 0.2s' },
        '&:hover .action-buttons': { opacity: 1 }
      }}
    >
      {filteredCols.map((col) => {
        const colId = col.id;
        switch (colId) {
          case 'Select':
            return (
              <TableCell
                key={colId}
                align="center"
                onClick={(e) => e.stopPropagation()}
                sx={{
                  py: 1, px: 0.5,
                  ...getStickyStyle('Select'),
                  width: 44, minWidth: 44, maxWidth: 44
                } as any}
              >
                <Checkbox
                  size="small"
                  checked={isSelected}
                  onChange={() => onToggleSelect(item.id!)}
                  sx={{ p: 0.5 }}
                />
              </TableCell>
            );
          case 'Image':
            return (
              <TableCell key={colId} sx={{
                px: 2, py: 1.5, textAlign: 'center',
                ...getStickyStyle('Image'),
                width: 80, minWidth: 80, maxWidth: 80
              } as any}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  {rdItemApi.hasImage(item.mainImage) ? (
                    <Tooltip
                      title={
                        <Box sx={{ width: 280, height: 280, bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 1 }}>
                          <img src={rdItemApi.getFirstImageUrl(item.mainImage)} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          <Typography sx={{ fontSize: 11, color: '#16a34a', fontWeight: 600, mt: 0.5 }}>🔍 {t('rdMaterial.click_to_zoom', 'Nhấp để phóng to / soi ảnh')}</Typography>
                        </Box>
                      }
                      placement="right"
                      componentsProps={{ tooltip: { sx: { bgcolor: 'background.paper', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', p: 0.5, border: '1px solid', borderColor: 'divider' } } }}
                    >
                      <Box 
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewZoom(item);
                        }}
                        sx={{ 
                          width: 48, height: 48, borderRadius: 1.5, overflow: 'hidden', bgcolor: 'background.default', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfc9c4', mx: 'auto',
                          cursor: 'pointer', transition: 'all 0.2s',
                          '&:hover': { borderColor: '#16a34a', boxShadow: '0 0 0 2px rgba(22, 163, 74, 0.25)', transform: 'scale(1.08)' }
                        }}
                      >
                        <img src={rdItemApi.getFirstImageUrl(item.mainImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </Box>
                    </Tooltip>
                  ) : (
                    <Box sx={{ width: 48, height: 48, borderRadius: 1.5, overflow: 'hidden', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfc9c4', mx: 'auto' }}>
                      <Typography sx={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', lineHeight: 1.1, fontWeight: 600 }}>No Image</Typography>
                    </Box>
                  )}
                  <Chip 
                    label={(item.category || 'Garment').toUpperCase()} 
                    size="small" 
                    sx={{ 
                      height: 14, fontSize: 8, fontWeight: 800, letterSpacing: '0.5px',
                      bgcolor: item.category === 'Mockup' ? '#fef3c7' : '#dcfce7', 
                      color: item.category === 'Mockup' ? '#d97706' : '#16a34a',
                      '& .MuiChip-label': { px: 0.5 }
                    }} 
                  />
                </Box>
              </TableCell>
            );
          case 'Project':
            return (
              <TableCell key={colId} sx={{
                py: 1.5, fontSize: 13, color: '#3f4945',
                ...getStickyStyle('Project'),
                width: 200, minWidth: 200, maxWidth: 200
              } as any}>
                {item.product?.projectName || item.name}
              </TableCell>
            );
          case 'Item Code':
            return (
              <TableCell key={colId} sx={{
                py: 1.5, fontSize: 13, fontWeight: 600, color: '#191c1d',
                ...getStickyStyle('Item Code'),
                minWidth: 180, width: 220,
                overflow: 'hidden'
              } as any}>
                <Tooltip title={item.itemCode || '–'} arrow placement="top">
                  <Typography 
                    component="div"
                    fontWeight={500} 
                    fontSize={13} 
                    color="#1a73e8" 
                    sx={{ 
                      cursor: 'pointer', 
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                      lineHeight: 1.35,
                      display: 'block',
                      '&:hover': { textDecoration: 'underline' } 
                    }}
                    onClick={() => onOpenDetails(item.id!)}
                  >
                    {item.itemCode || '–'}
                  </Typography>
                </Tooltip>
              </TableCell>
            );
          case 'Category':
            return (
              <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
                {item.product?.garmentCategory || '–'}
              </TableCell>
            );
          case 'Sport':
            return (
              <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
                {item.product?.sportCategory || '–'}
              </TableCell>
            );
          case 'Style Name':
            return (
              <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
                {item.product?.styleName || '–'}
              </TableCell>
            );
          case 'Stage':
            return (
              <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
                <Chip label={item.product?.sampleStage || 'N/A'} size="small" sx={{ fontSize: 11, height: 20 }} />
              </TableCell>
            );
          case 'Color':
            return (
              <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
                {item.product?.color || '–'}
              </TableCell>
            );
          case 'Size':
            return (
              <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
                {item.product?.size || '–'}
              </TableCell>
            );
          case 'Gender':
            return (
              <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
                {item.product?.gender || '–'}
              </TableCell>
            );
          case 'Pattern Marker':
            return (
              <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
                {item.product?.patternMarker || '–'}
              </TableCell>
            );
          case 'Allocation':
            return (
              <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
                {item.product?.allocation || '–'}
              </TableCell>
            );
          case 'Garment Test':
            return (
              <TableCell key={colId} align="center" sx={{ py: 1.5, fontSize: 13 }}>
                {item.product?.garmentTest ? (
                  <Chip label="Yes" size="small" color="primary" sx={{ height: 22, fontSize: 11, fontWeight: 700 }} />
                ) : (
                  <Typography fontSize={13} color="text.secondary">—</Typography>
                )}
              </TableCell>
            );
          case 'Main Composition':
            return (
              <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
                {renderCompositionCell(item.product?.mainComposition)}
              </TableCell>
            );
          case 'Description':
            return (
              <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945', minWidth: 200, maxWidth: 350, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {item.description || '—'}
              </TableCell>
            );
          case 'Technology':
            return (
              <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945', minWidth: 140 }}>
                {item.product?.technology || '—'}
              </TableCell>
            );
          case 'FOB Price':
            return (
              <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#191c1d', fontWeight: 500 }}>
                {item.product?.fobPrice ? `$${item.product.fobPrice}` : '–'}
              </TableCell>
            );
          case 'Location':
            return (
              <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
                {item.location || '–'}
              </TableCell>
            );
          case 'Qty':
            return (
              <TableCell key={colId} sx={{ py: 1.5, textAlign: 'center' }}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', px: 1.25, py: 0.5, borderRadius: '6px', bgcolor: 'rgba(46,125,50,0.1)', color: '#2e7d32', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, minWidth: 36 }}>
                  {item.quantity ?? 0}
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
              <TableCell key={colId} sx={{ py: 1.5, fontSize: 13, color: '#3f4945' }}>
                {item.remark || '–'}
              </TableCell>
            );
          case 'Actions':
            return (
              <TableCell key={colId} sx={{ py: 1.5, textAlign: 'right', pr: 3 }} onClick={(e) => e.stopPropagation()}>
                <Box className="action-buttons" sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                  {canEdit && (
                    <IconButton size="small" onClick={() => onEdit(item)} sx={{ color: '#707975', '&:hover': { color: '#2e7d32', bgcolor: '#f3f4f5' } }}>
                      <EditIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  )}
                  {canAdd && (
                    <IconButton size="small" onClick={() => onCopy(item)} sx={{ color: '#707975', '&:hover': { color: '#0284c7', bgcolor: '#e0f2fe' } }}>
                      <ContentCopyIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  )}
                  <Tooltip title={t('rdMaterial.print_sample_tag', 'In Sample Tag')}>
                    <IconButton size="small" onClick={() => onPrint(item.id!)} sx={{ color: '#707975', '&:hover': { color: '#0284c7', bgcolor: '#e0f2fe' } }}>
                      <PrintIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  {canDelete && (
                    <IconButton size="small" onClick={() => onDelete(item.id!)} sx={{ color: '#707975', '&:hover': { color: '#ba1a1a', bgcolor: '#ffdad6' } }}>
                      <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  )}
                </Box>
              </TableCell>
            );
          default:
            return null;
        }
      })}
    </TableRow>
  );
});

const ProductListPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));


  const STORAGE_KEY = `rd-material-state-PRODUCT`;
  const pageCode = 'rd_product';
  const canAdd = authService.hasAction(pageCode, 'canAdd') || true; // Allow for testing
  const canEdit = authService.hasAction(pageCode, 'canEdit') || true;
  const canDelete = authService.hasAction(pageCode, 'canDelete') || true;

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
  // Specific filters
  const [garmentCategory, setGarmentCategory] = useState<string[]>(Array.isArray(init.garmentCategory) ? init.garmentCategory : (init.garmentCategory ? init.garmentCategory.split(',') : []));
  const [sportCategory, setSportCategory] = useState<string[]>(Array.isArray(init.sportCategory) ? init.sportCategory : (init.sportCategory ? init.sportCategory.split(',') : []));
  const [styleNo, setStyleNo] = useState<string[]>(Array.isArray(init.styleNo) ? init.styleNo : (init.styleNo ? init.styleNo.split(',') : []));
  const [sampleStage, setSampleStage] = useState<string[]>(Array.isArray(init.sampleStage) ? init.sampleStage : (init.sampleStage ? init.sampleStage.split(',') : []));
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'MOCKUP' | 'GARMENT'>(init.categoryFilter ?? 'ALL');
  
  const [garmentCategoryOpts, setGarmentCategoryOpts] = useState<string[]>(['Tops', 'Pants', 'Jackets', 'Polo', 'Shorts', 'Dress']);
  const [sportCategoryOpts, setSportCategoryOpts] = useState<string[]>(['Golf', 'Running', 'Training', 'Yoga', 'Lifestyle']);
  const [sampleStageOpts, setSampleStageOpts] = useState<string[]>(['Mock up', '1st proto', '2nd proto', '3rd proto', '4th proto']);
  
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(init.hasSearched ?? false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ page, rowsPerPage, keyword, garmentCategory, sportCategory, styleNo, sampleStage, categoryFilter, hasSearched, items, total }));
  }, [page, rowsPerPage, keyword, garmentCategory, sportCategory, styleNo, sampleStage, categoryFilter, hasSearched, items, total]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isCopy, setIsCopy] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingPpt, setExportingPpt] = useState(false);
  const [pdfData, setPdfData] = useState<PdfProductData[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({ open: false, message: '', severity: 'success' });
  const dragRef = useDragScroll();

  const [filterOpen, setFilterOpen] = useState(false);
  const activeFiltersCount = (garmentCategory.length > 0 ? 1 : 0) + (sportCategory.length > 0 ? 1 : 0) + (styleNo.length > 0 ? 1 : 0) + (sampleStage.length > 0 ? 1 : 0) + (categoryFilter !== 'ALL' ? 1 : 0);

  const [colMenuAnchor, setColMenuAnchor] = useState<null | HTMLElement>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('rd-product-columns');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('rd-product-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const defaultOrder = [
      'Select', 'Image', 'Project', 'Item Code', 'Category', 'Sport', 'Style Name', 'Stage',
      'Color', 'Size', 'Gender', 'Pattern Marker', 'Allocation', 'Garment Test', 'Main Composition',
      'Description', 'Technology', 'FOB Price', 'Location', 'Qty', 'Created At', 'Remark', 'Actions'
    ];
    try {
      const saved = localStorage.getItem('rd-product-column-order');
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        const validSaved = parsed.filter(id => defaultOrder.includes(id) && id !== 'Select');
        const missing = defaultOrder.filter(id => !validSaved.includes(id) && id !== 'Select');
        return ['Select', ...validSaved, ...missing];
      }
    } catch { /* ignore */ }
    return defaultOrder;
  });

  useEffect(() => {
    localStorage.setItem('rd-product-column-order', JSON.stringify(columnOrder));
  }, [columnOrder]);

  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [previewZoomItem, setPreviewZoomItem] = useState<Item | null>(null);

  // Column Filters and Sorting Logic
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [sortConfig, setSortConfig] = useState<{ field: string, direction: 'asc' | 'desc' } | null>(null);

  const getFieldValueForFilter = useCallback((row: Item, field: string): string => {
    let val: any = '';
    switch (field) {
      case 'Project': val = row.product?.projectName || row.name; break;
      case 'Item Code': val = row.itemCode; break;
      case 'Category': val = row.product?.garmentCategory || row.category; break;
      case 'Sport': val = row.product?.sportCategory; break;
      case 'Style Name': val = row.product?.styleName; break;
      case 'Stage': val = row.product?.sampleStage; break;
      case 'Color': val = row.product?.color || row.color; break;
      case 'Size': val = row.product?.size; break;
      case 'Gender': val = row.product?.gender; break;
      case 'Pattern Marker': val = row.product?.patternMarker; break;
      case 'Allocation': val = row.product?.allocation; break;
      case 'Garment Test': val = row.product?.garmentTest ? 'Yes' : 'No'; break;
      case 'Main Composition': val = row.product?.mainComposition; break;
      case 'Description': val = row.description; break;
      case 'Technology': val = row.product?.technology; break;
      case 'FOB Price': val = row.product?.fobPrice ? `$${row.product.fobPrice}` : undefined; break;
      case 'Location': val = row.location; break;
      case 'Qty': val = row.quantity; break;
      case 'Created At':
        if (row.createdAt) {
          try { val = new Date(row.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch {}
        }
        break;
      case 'Remark': val = row.remark; break;
      default: val = row[field as keyof Item];
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

  const pagedItems = useMemo(() => {
    return filteredItems.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [filteredItems, page, rowsPerPage]);

  useEffect(() => {
    setPage(0);
  }, [columnFilters, keyword, categoryFilter, garmentCategory, sportCategory, styleNo, sampleStage]);

  useEffect(() => {
    scrollToTop(dragRef);
  }, [page]);

  useEffect(() => {
    columnFilterStore.register(window.location.pathname, columnFilters, setColumnFilters, items);
  }, [columnFilters, items]);

  const columns = useMemo(() => [
    { id: 'Select', label: '', isCenter: true },
    { id: 'Image', label: t('rdMaterial.image', 'Image'), isCenter: true },
    { id: 'Project', label: t('rdMaterial.project', 'Project') },
    { id: 'Item Code', label: t('rdMaterial.item_code', 'Style Number') },
    { id: 'Category', label: t('rdMaterial.garment_category', 'Product Category') },
    { id: 'Sport', label: t('rdMaterial.sport_category', 'Sport Category') },
    { id: 'Style Name', label: t('rdMaterial.style_name', 'Style Name') },
    { id: 'Stage', label: t('rdMaterial.stage', 'Stage') },
    { id: 'Color', label: t('rdMaterial.color', 'Color') },
    { id: 'Size', label: t('rdMaterial.size', 'Size') },
    { id: 'Gender', label: t('rdMaterial.gender', 'Gender') },
    { id: 'Pattern Marker', label: t('rdMaterial.pattern_marker', 'Pattern Marker') },
    { id: 'Allocation', label: t('rdMaterial.allocation', 'Allocation') },
    { id: 'Garment Test', label: 'Garment Test', isCenter: true },
    { id: 'Main Composition', label: t('rdMaterial.material_info', 'Material Information') },
    { id: 'Description', label: t('rdMaterial.special_feature', 'Special Feature') },
    { id: 'Technology', label: t('rdMaterial.technology', 'Technology') },
    { id: 'FOB Price', label: t('rdMaterial.fob_price', 'FOB Price') },
    { id: 'Location', label: t('rdMaterial.location', 'Location') },
    { id: 'Qty', label: t('rdMaterial.quantity', 'Qty'), isCenter: true },
    { id: 'Created At', label: t('rdMaterial.created_at', 'Created At') },
    { id: 'Remark', label: t('rdMaterial.remark', 'Remark') },
    { id: 'Actions', label: t('rdMaterial.actions', 'Actions'), isRight: true }
  ], [t]);

  const sortedColumns = useMemo(() => [...columns].sort((a, b) => {
    const idxA = columnOrder.indexOf(a.id);
    const idxB = columnOrder.indexOf(b.id);
    return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
  }), [columns, columnOrder]);

  const filteredCols = useMemo(() => sortedColumns.filter(col => visibleColumns[col.id] !== false), [sortedColumns, visibleColumns]);
  const colSpanCount = filteredCols.length;

  const stickyOffsets = useMemo(() => {
    const stickyIds = ['Select', 'Image', 'Project', 'Item Code'];
    const offsets: Record<string, number> = {};
    let left = 0;
    for (const c of filteredCols) {
      if (stickyIds.includes(c.id)) {
        offsets[c.id] = left;
        if (c.id === 'Select') left += 44;
        else if (c.id === 'Image') left += 80;
        else if (c.id === 'Project') left += 200;
        else if (c.id === 'Item Code') left += 240;
      }
    }
    return offsets;
  }, [filteredCols]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const handleOpenDetails = useCallback((id: number) => {
    React.startTransition(() => navigate(`${BASE}/product/${id}`));
  }, [navigate]);

  const handleEdit = useCallback((item: Item) => {
    setIsCopy(false);
    setEditItem(item);
    setDrawerOpen(true);
  }, []);

  const handleCopy = useCallback((item: Item) => {
    setIsCopy(true);
    setEditItem(item);
    setDrawerOpen(true);
  }, []);

  const handlePrint = useCallback((id: number) => {
    navigate(`${BASE}/label/${id}`);
  }, [navigate]);

  const handlePreviewZoom = useCallback((item: Item) => {
    setPreviewZoomItem(item);
  }, []);

  const load = useCallback(async (options?: { forceLoading?: boolean }) => {
    if (!hasSearched) return;
    
    const force = options?.forceLoading === true;
    const silent = !force && items.length > 0;
    
    if (!silent) setLoading(true);
    try {
      const data = await rdItemApi.getAll({ 
        itemType: 'PRODUCT', 
        keyword, 
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
        garmentCategory: garmentCategory.join(','),
        sportCategory: sportCategory.join(','),
        styleNo: styleNo.join(','),
        sampleStage: sampleStage.join(','),
        page: 0, 
        size: 10000 
      });
      setItems(data.content ?? []);
      setTotal(data.content ? data.content.length : 0);
      setSelectedIds([]);
    } catch (err: unknown) {
      console.error('GET /rd-items error:', err);
      if (!silent) setItems([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [keyword, garmentCategory, sportCategory, styleNo, sampleStage, categoryFilter, hasSearched]);

  const currentParamsRef = useRef('');

  useEffect(() => {
    const loadOptions = async (field: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
      try {
        const result = await rdItemApi.getOptions(field);
        if (result && result.length > 0) setter(prev => Array.from(new Set([...prev, ...result])));
      } catch {
        // ignore
      }
    };
    loadOptions('garmentCategory', setGarmentCategoryOpts);
    loadOptions('sportCategory', setSportCategoryOpts);
    loadOptions('sampleStage', setSampleStageOpts);
  }, []);

  useEffect(() => { 
    const currentParams = JSON.stringify({ keyword, garmentCategory, sportCategory, styleNo, sampleStage, categoryFilter, hasSearched });
    if (currentParams === currentParamsRef.current && items.length > 0) {
      return;
    }
    currentParamsRef.current = currentParams;
    load(); 
  }, [load, keyword, garmentCategory, sportCategory, styleNo, sampleStage, categoryFilter, hasSearched, items.length]);

  const handleDelete = useCallback((id: number) => {
    setDeleteId(id);
  }, []);

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

  
  const handleExportPdf = async () => {
    const targetItems = selectedIds.length > 0 ? items.filter(i => selectedIds.includes(i.id!)) : items;
    if (targetItems.length === 0) {
      setSnackbar({ open: true, message: t('rdMaterial.no_export_data_pdf', 'Không có dữ liệu để xuất PDF'), severity: 'warning' });
      return;
    }

    let fileHandle: any = null;
    const defaultFileName = `Products_Export_${new Date().getTime()}.pdf`;

    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: defaultFileName,
          types: [{
            description: 'PDF File (*.pdf)',
            accept: { 'application/pdf': ['.pdf'] }
          }]
        });
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // User clicked Cancel in Save Dialog
          return;
        }
        console.warn('showSaveFilePicker skipped or unsupported', err);
      }
    }

    setExportingPdf(true);
    try {
      const selectedItems = targetItems;
      const newPdfData: PdfProductData[] = [];
      
      for (const product of selectedItems) {
        let parsedBom: any[] = [];
        const compStr = product.product?.mainComposition || (product as any).mainComposition;
        if (compStr) {
          if (typeof compStr === 'string' && compStr.trim().startsWith('[')) {
            try {
              const list = JSON.parse(compStr);
              if (Array.isArray(list)) parsedBom = list;
            } catch (e) {
              parsedBom = [{ composition: compStr }];
            }
          } else {
            parsedBom = [{ composition: compStr }];
          }
        }

        const enrichedBom = [];
        for (const bom of parsedBom) {
          if (bom.itemId) {
            try {
              const materialDetail = await rdItemApi.getById(bom.itemId);
              const fab = materialDetail.fabric || {};
              const acc = materialDetail.accessory || {};
              enrichedBom.push({
                usage: bom.usage || 'Fabric',
                itemId: bom.itemId,
                itemCode: bom.itemCode || materialDetail.itemCode || '',
                name: bom.name || materialDetail.name || '',
                color: bom.color || fab.colorName || acc.color || materialDetail.color || '',
                supplierName: bom.supplierName || materialDetail.supplierName || '',
                structure: bom.structure || fab.structure || acc.specification || '',
                composition: bom.composition || fab.composition || acc.composition || '',
                technology: bom.technology || fab.technology || '',
                function: bom.function || fab.function || '',
                weightGsm: bom.weightGsm || fab.weightGsm || acc.weightGsm || '',
                cuttableWidth: bom.cuttableWidth || fab.cuttableWidth || acc.size || '',
              });
            } catch (err) {
              console.error('Failed to load material detail', err);
              enrichedBom.push({
                usage: bom.usage || 'Fabric',
                itemCode: bom.itemCode || '',
                name: bom.name || '',
                color: bom.color || '',
                supplierName: bom.supplierName || '',
                structure: bom.structure || '',
                composition: bom.composition || '',
                technology: bom.technology || '',
                function: bom.function || '',
                weightGsm: bom.weightGsm || '',
                cuttableWidth: bom.cuttableWidth || '',
              });
            }
          } else {
            enrichedBom.push({
              usage: bom.usage || 'Fabric',
              itemCode: bom.itemCode || '',
              name: bom.name || '',
              color: bom.color || '',
              supplierName: bom.supplierName || '',
              structure: bom.structure || '',
              composition: bom.composition || '',
              technology: bom.technology || '',
              function: bom.function || '',
              weightGsm: bom.weightGsm || '',
              cuttableWidth: bom.cuttableWidth || '',
            });
          }
        }

        if (enrichedBom.length === 0) {
          const supp = product.supplierName || product.product?.allocation || '';
          const code = product.itemCode || '';
          const color = product.color || product.product?.color || '';
          const struct = product.fabric?.structure || '';
          const comp = product.product?.mainComposition && !product.product.mainComposition.startsWith('[') ? product.product.mainComposition : '';
          const tech = product.fabric?.technology || '';
          const func = product.fabric?.function || '';
          const weight = product.fabric?.weightGsm ? String(product.fabric.weightGsm) : '';
          const width = product.fabric?.cuttableWidth ? String(product.fabric.cuttableWidth) : '';

          if (supp || code || color || struct || comp || tech || func || weight || width) {
            enrichedBom.push({
              usage: '',
              itemCode: code,
              supplierName: supp,
              color: color,
              structure: struct,
              composition: comp,
              technology: tech,
              function: func,
              weightGsm: weight,
              cuttableWidth: width,
            });
          }
        }
        
        newPdfData.push({ product, enrichedBom });
      }
      
      setPdfData(newPdfData);
      
      // Allow React to render the PDF component before printing
      setTimeout(async () => {
        const container = document.querySelector('.print-only-container') as HTMLElement;
        if (container) {
          const originalDisplay = container.style.display;
          const originalLeft = container.style.left;
          const originalTop = container.style.top;
          
          container.style.display = 'block';
          container.style.left = '-9999px';
          container.style.top = '-9999px';
          container.style.position = 'fixed';
          container.style.zIndex = '-9999';

          try {
            // Wait for all images to fully load before capturing
            const images = Array.from(container.querySelectorAll('img'));
            await Promise.all(images.map(img => {
              if (img.complete) return Promise.resolve();
              return new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve; // Ignore errors, still resolve so we don't block
              });
            }));

            const pages = container.querySelectorAll('.pdf-page');
            if (pages.length > 0) {
              const pdf = new jsPDF('l', 'mm', 'a4');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = pdf.internal.pageSize.getHeight();

              for (let i = 0; i < pages.length; i++) {
                const pageEl = pages[i] as HTMLElement;
                const canvas = await html2canvas(pageEl, {
                  scale: 2,
                  useCORS: true,
                  backgroundColor: '#f5f5f5',
                  logging: false,
                  width: pageEl.offsetWidth,
                  height: pageEl.offsetHeight
                });

                const imgData = canvas.toDataURL('image/png', 1.0);
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
              }

              if (fileHandle) {
                const pdfBlob = pdf.output('blob');
                const writable = await fileHandle.createWritable();
                await writable.write(pdfBlob);
                await writable.close();
              } else {
                pdf.save(defaultFileName);
              }
              setSelectedIds([]);
            }
          } catch (err) {
            console.error("PDF export failed", err);
          } finally {
            container.style.display = originalDisplay;
            container.style.left = originalLeft;
            container.style.top = originalTop;
            container.style.position = 'fixed'; // reset to CSS defined
            container.style.zIndex = '99999';
            setExportingPdf(false);
          }
        } else {
          setExportingPdf(false);
        }
      }, 1000);
      
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error generating PDF data', severity: 'error' });
      setExportingPdf(false);
    }
  };

  const handleExport = async () => {
    let fileHandle: any = null;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const defaultFileName = `Garment_Mockup_List_${dateStr}_${timeStr}.xlsx`;

    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: defaultFileName,
          types: [{
            description: 'Excel File (*.xlsx)',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
          }]
        });
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return;
        }
      }
    }

    setExporting(true);
    try {
      let exportData: Item[];
      if (selectedIds.length > 0) {
        exportData = items.filter(i => selectedIds.includes(i.id!));
      } else {
        const data = await rdItemApi.getAll({ 
          itemType: 'PRODUCT', 
          keyword, 
          garmentCategory: garmentCategory.join(','),
          sportCategory: sportCategory.join(','),
          styleNo: styleNo.join(','),
          sampleStage: sampleStage.join(','),
          page: 0, 
          size: 10000 
        });
        exportData = data.content ?? [];
      }
      await exportRdItemsToExcel(exportData, 'PRODUCT', t, fileHandle);
      setSnackbar({ open: true, message: t('rdMaterial.export_success', 'Exported to Excel successfully'), severity: 'success' });
      setSelectedIds([]);
    } catch (err: unknown) {
      console.error('Export error:', err);
      setSnackbar({ open: true, message: t('rdMaterial.export_error', 'Error exporting Excel'), severity: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPpt = async () => {
    const targetItems = selectedIds.length > 0 ? items.filter(i => selectedIds.includes(i.id!)) : items;
    if (targetItems.length === 0) {
      setSnackbar({ open: true, message: t('rdMaterial.no_export_data_ppt', 'Không có dữ liệu để xuất PPT'), severity: 'warning' });
      return;
    }

    let fileHandle: any = null;
    const defaultFileName = `Products_Export_${new Date().getTime()}.pptx`;

    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: defaultFileName,
          types: [{
            description: 'PowerPoint Presentation (*.pptx)',
            accept: { 'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'] }
          }]
        });
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return;
        }
        console.warn('showSaveFilePicker skipped or unsupported', err);
      }
    }

    setExportingPpt(true);
    try {
      const selectedItems = targetItems;
      const enrichedData: { product: Item; enrichedBom: any[] }[] = [];
      
      for (const product of selectedItems) {
        let parsedBom: any[] = [];
        const compStr = product.product?.mainComposition || (product as any).mainComposition;
        if (compStr) {
          if (typeof compStr === 'string' && compStr.trim().startsWith('[')) {
            try {
              const list = JSON.parse(compStr);
              if (Array.isArray(list)) parsedBom = list;
            } catch (e) {
              parsedBom = [{ composition: compStr }];
            }
          } else {
            parsedBom = [{ composition: compStr }];
          }
        }

        const enrichedBom = [];
        for (const bom of parsedBom) {
          if (bom.itemId) {
            try {
              const materialDetail = await rdItemApi.getById(bom.itemId);
              const fab = materialDetail.fabric || {};
              const acc = materialDetail.accessory || {};
              enrichedBom.push({
                usage: bom.usage || 'Fabric',
                itemId: bom.itemId,
                itemCode: bom.itemCode || materialDetail.itemCode || '',
                name: bom.name || materialDetail.name || '',
                color: bom.color || fab.colorName || acc.color || materialDetail.color || '',
                supplierName: bom.supplierName || materialDetail.supplierName || '',
                structure: bom.structure || fab.structure || acc.specification || '',
                composition: bom.composition || fab.composition || acc.composition || '',
                technology: bom.technology || fab.technology || '',
                function: bom.function || fab.function || '',
                weightGsm: bom.weightGsm || fab.weightGsm || acc.weightGsm || '',
                cuttableWidth: bom.cuttableWidth || fab.cuttableWidth || acc.size || '',
              });
            } catch (err) {
              enrichedBom.push({
                usage: bom.usage || 'Fabric',
                itemCode: bom.itemCode || '',
                name: bom.name || '',
                color: bom.color || '',
                supplierName: bom.supplierName || '',
                structure: bom.structure || '',
                composition: bom.composition || '',
                technology: bom.technology || '',
                function: bom.function || '',
                weightGsm: bom.weightGsm || '',
                cuttableWidth: bom.cuttableWidth || '',
              });
            }
          } else {
            enrichedBom.push({
              usage: bom.usage || 'Fabric',
              itemCode: bom.itemCode || '',
              name: bom.name || '',
              color: bom.color || '',
              supplierName: bom.supplierName || '',
              structure: bom.structure || '',
              composition: bom.composition || '',
              technology: bom.technology || '',
              function: bom.function || '',
              weightGsm: bom.weightGsm || '',
              cuttableWidth: bom.cuttableWidth || '',
            });
          }
        }

        if (enrichedBom.length === 0) {
          const supp = product.supplierName || product.product?.allocation || '';
          const code = product.itemCode || '';
          const color = product.color || product.product?.color || '';
          const struct = product.fabric?.structure || '';
          const comp = product.product?.mainComposition && !product.product.mainComposition.startsWith('[') ? product.product.mainComposition : '';
          const tech = product.fabric?.technology || '';
          const func = product.fabric?.function || '';
          const weight = product.fabric?.weightGsm ? String(product.fabric.weightGsm) : '';
          const width = product.fabric?.cuttableWidth ? String(product.fabric.cuttableWidth) : '';

          if (supp || code || color || struct || comp || tech || func || weight || width) {
            enrichedBom.push({
              usage: '',
              itemCode: code,
              supplierName: supp,
              color: color,
              structure: struct,
              composition: comp,
              technology: tech,
              function: func,
              weightGsm: weight,
              cuttableWidth: width,
            });
          }
        }
        
        enrichedData.push({ product, enrichedBom });
      }

      // Load PptxGenJS library
      let PptxGenJSConstructor: any = (window as any).PptxGenJS;
      if (!PptxGenJSConstructor) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
          script.onload = () => resolve(true);
          script.onerror = reject;
          document.head.appendChild(script);
        });
        PptxGenJSConstructor = (window as any).PptxGenJS;
      }

      const pptx = new PptxGenJSConstructor();
      try {
        pptx.defineLayout({ name: 'WIDE_16_9', width: 13.33, height: 7.5 });
        pptx.layout = 'WIDE_16_9';
      } catch {
        try { pptx.layout = 'LAYOUT_WIDE'; } catch { pptx.layout = 'LAYOUT_16x9'; }
      }

      const cardPositions = [
        { x: 0.4, y: 0.75, w: 6.0, h: 3.1 },
        { x: 6.9, y: 0.75, w: 6.0, h: 3.1 },
        { x: 0.4, y: 4.05, w: 6.0, h: 3.1 },
        { x: 6.9, y: 4.05, w: 6.0, h: 3.1 }
      ];

      // Load top-right Trax Group logo image for PPT export
      let logoBase64: string | null = null;
      try {
        const logoUrl = `${import.meta.env.BASE_URL}export_logo.png`;
        const logoRes = await fetch(logoUrl);
        const logoBlob = await logoRes.blob();
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(logoBlob);
        });
      } catch (err) {
        console.warn('Could not load export_logo.png for PPT:', err);
      }

      // Build 4 cards per slide natively
      for (let i = 0; i < enrichedData.length; i += 4) {
        const pageItems = enrichedData.slice(i, i + 4);
        const slide = pptx.addSlide();

        // Top right Trax Group Logo (positioned in top header area above cards)
        if (logoBase64) {
          slide.addImage({ 
            data: logoBase64, 
            x: 11.5, 
            y: 0.18, 
            w: 1.4, 
            h: 0.42, 
            sizing: { type: 'contain', w: 1.4, h: 0.42 } 
          });
        } else {
          slide.addText('Trax Group', { x: 10.9, y: 0.18, w: 1.8, h: 0.42, fontSize: 13, bold: true, align: 'right', color: '000000' });
        }

        for (let j = 0; j < pageItems.length; j++) {
          const { product, enrichedBom } = pageItems[j];
          const pos = cardPositions[j];

          // 1. Native Rectangular Shape Border
          slide.addShape(pptx.ShapeType.rect, {
            x: pos.x,
            y: pos.y,
            w: pos.w,
            h: pos.h,
            line: { color: 'E2E8F0', width: 1 },
            fill: { color: 'FAFAFA' }
          });

          // 2. Native Images (up to 2 converted to Base64)
          const rawImgUrls = (product.mainImage || (product as any).imageUrl || '')
            .split(',')
            .map(u => u.trim())
            .filter(Boolean)
            .slice(0, 2);

          const base64Images: string[] = [];
          for (const url of rawImgUrls) {
            try {
              const fullUrl = url.startsWith('http') ? url : rdItemApi.getImageUrl(url);
              const res = await fetch(fullUrl, { mode: 'cors' });
              const blob = await res.blob();
              const b64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => resolve('');
                reader.readAsDataURL(blob);
              });
              if (b64) base64Images.push(b64);
            } catch (err) {
              console.error('Failed to convert image for PPT:', url, err);
            }
          }

          const imgX = pos.x + 0.15;
          const imgW = 2.15;
          if (base64Images.length === 1) {
            slide.addImage({
              data: base64Images[0],
              x: imgX,
              y: pos.y + 0.15,
              w: imgW,
              h: 2.8,
              sizing: { type: 'contain', w: imgW, h: 2.8 }
            });
          } else if (base64Images.length >= 2) {
            slide.addImage({
              data: base64Images[0],
              x: imgX,
              y: pos.y + 0.15,
              w: imgW,
              h: 1.35,
              sizing: { type: 'contain', w: imgW, h: 1.35 }
            });
            slide.addImage({
              data: base64Images[1],
              x: imgX,
              y: pos.y + 1.58,
              w: imgW,
              h: 1.35,
              sizing: { type: 'contain', w: imgW, h: 1.35 }
            });
          }

          // 3. Native Editable Text Box Frame
          const textX = pos.x + 2.4;
          const textW = pos.w - 2.55;

          const textObjects: any[] = [];

          // Item Code (Bold Title)
          textObjects.push({
            text: product.itemCode || 'N/A',
            options: { fontSize: 11, bold: true, color: '000000', breakLine: true }
          });

          // Style Name
          textObjects.push({
            text: product.product?.styleName || product.name || '—',
            options: { fontSize: 9.5, color: '1E293B', breakLine: true }
          });

          // Remark (if exists)
          if (product.remark) {
            textObjects.push({
              text: `(~${product.remark}/ garment)`,
              options: { fontSize: 9.0, color: '1E293B', breakLine: true }
            });
          }

          // BOM Lines
          enrichedBom.forEach(bom => {
            const usageStr = (bom.usage || '').trim();
            const supp = (bom.supplierName || '').trim();
            const code = (bom.itemCode || '').trim();
            const color = (bom.color || '').trim();
            const comp = (bom.composition || '').trim();
            const weight = (bom.weightGsm !== undefined && bom.weightGsm !== null && bom.weightGsm !== '') ? String(bom.weightGsm).trim() : '';
            const width = (bom.cuttableWidth !== undefined && bom.cuttableWidth !== null && bom.cuttableWidth !== '') ? String(bom.cuttableWidth).trim() : '';

            // Format: [Usage]: [Supplier]/ [Item Code]/ [Color]/ [Composition], [Weight], [Width]
            const part3 = [comp, weight, width].filter(Boolean).join(', ');
            const lineDetail = [supp, code, color, part3].filter(Boolean).join('/ ');
            const lineText = usageStr ? `${usageStr}: ${lineDetail}` : lineDetail;
            if (lineText) {
              textObjects.push({
                text: lineText,
                options: { fontSize: 8.0, color: '0F172A', breakLine: true }
              });
            }
          });

          // Add native editable text box to PowerPoint slide
          slide.addText(textObjects, {
            x: textX,
            y: pos.y + 0.15,
            w: textW,
            h: 2.95,
            valign: 'top',
            margin: 0,
            shrinkText: true
          });
        }
      }

      const pptxBlob = await pptx.write({ outputType: 'blob' });
      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(pptxBlob);
        await writable.close();
      } else {
        const { saveAs } = await import('file-saver');
        saveAs(pptxBlob, defaultFileName);
      }
      setSelectedIds([]);
      setSnackbar({ open: true, message: 'Exported PPT with native editable text boxes successfully', severity: 'success' });
    } catch (err) {
      console.error("PPT export failed", err);
      setSnackbar({ open: true, message: 'Error exporting PPT', severity: 'error' });
    } finally {
      setExportingPpt(false);
    }
  };


  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-only-container, .print-only-container * {
              visibility: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-only-container {
              position: fixed;
              left: 0;
              top: 0;
              width: 100vw;
              height: 100vh;
              background: white;
              z-index: 99999;
              overflow: visible;
            }
            @page { size: landscape; margin: 0; }
          }
        `}
      </style>
      <Box className="print-only-container" sx={{ display: 'none', displayPrint: 'block' }}>
        <ProductPdfExport data={pdfData} />
      </Box>

      {/* 🚀 Toolbar Area 🚀 */}
      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2, width: '100%' }}>
          {/* Sub-group 1: Search box & Chip selection info */}
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
                  bgcolor: 'background.default', 
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
                label={t('rdMaterial.selected_count', { count: selectedIds.length, defaultValue: `Đã chọn ${selectedIds.length} mục` })} 
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
            <MenuItem disabled={exporting || items.length === 0} onClick={() => { setMobileMenuAnchor(null); handleExport(); }}>
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
            {/* Sub-group 1: Search box */}
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
              sx={{ width: { xs: '100%', sm: 240, md: 280 } }}
            />

            {/* Selection Action Bar */}
            {selectedIds.length > 0 && (
              <Box sx={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 1, 
                bgcolor: '#f0f9ff', 
                border: '1px solid #bae6fd', 
                px: 1.25, 
                py: 0.5, 
                borderRadius: 2,
                flexShrink: 0
              }}>
                <Chip 
                  size="small"
                  label={t('rdMaterial.selected_count', { count: selectedIds.length, defaultValue: `Đã chọn ${selectedIds.length}` })} 
                  onDelete={() => setSelectedIds([])}
                  sx={{ fontWeight: 600, bgcolor: '#e0f2fe', color: '#0369a1', '& .MuiChip-deleteIcon': { color: '#0369a1' } }} 
                />
                <AppButton
                  variant="contained"
                  customVariant="primary"
                  size="small"
                  startIcon={<PrintIcon sx={{ fontSize: '16px !important' }} />}
                  onClick={() => navigate(`${BASE}/label?ids=${selectedIds.join(',')}`)}
                  sx={{ height: 30, px: 1.5, bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontSize: 12.5, whiteSpace: 'nowrap' }}
                >
                  {t('rdMaterial.print_sample_tag_count', { count: selectedIds.length, defaultValue: `In Sample Tag (${selectedIds.length})` })}
                </AppButton>
              </Box>
            )}

            {/* Sub-group 2: Category Toggle (if present) & Filter trigger */}
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
              disabled={exporting || exportingPdf || exportingPpt || items.length === 0}
              onClick={(e) => setExportMenuAnchor(e.currentTarget)}
              startIcon={
                <FileDownloadIcon sx={{ 
                  fontSize: '20px !important',
                  animation: (exporting || exportingPdf || exportingPpt) ? 'bounce 1s infinite' : 'none',
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
              {(exporting || exportingPdf || exportingPpt) ? t('rdMaterial.exporting', 'Exporting...') : t('rdMaterial.export', 'Export')}
            </AppButton>

            <Menu
              anchorEl={exportMenuAnchor}
              open={Boolean(exportMenuAnchor)}
              onClose={() => setExportMenuAnchor(null)}
              PaperProps={{ 
                sx: { 
                  borderRadius: 2.5, 
                  minWidth: 200, 
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)', 
                  mt: 1,
                  p: 0.5
                } 
              }}
            >
              <MenuItem 
                onClick={() => { setExportMenuAnchor(null); handleExport(); }}
                sx={{ py: 1, px: 1.5, borderRadius: 1.5, '&:hover': { bgcolor: '#f0fdf4' } }}
              >
                <TableChartIcon sx={{ color: '#16a34a', mr: 1.5, fontSize: 20 }} />
                <Typography fontSize={13.5} fontWeight={600} color="#15803d">
                  Export Excel (.xlsx)
                </Typography>
              </MenuItem>

              <MenuItem 
                onClick={() => { setExportMenuAnchor(null); handleExportPdf(); }}
                sx={{ py: 1, px: 1.5, borderRadius: 1.5, '&:hover': { bgcolor: '#fef2f2' } }}
              >
                <PictureAsPdfIcon sx={{ color: '#dc2626', mr: 1.5, fontSize: 20 }} />
                <Typography fontSize={13.5} fontWeight={600} color="#b91c1c">
                  Export PDF (.pdf)
                </Typography>
              </MenuItem>

              <MenuItem 
                onClick={() => { setExportMenuAnchor(null); handleExportPpt(); }}
                sx={{ py: 1, px: 1.5, borderRadius: 1.5, '&:hover': { bgcolor: '#fffbeb' } }}
              >
                <SlideshowIcon sx={{ color: '#d97706', mr: 1.5, fontSize: 20 }} />
                <Typography fontSize={13.5} fontWeight={600} color="#b45309">
                  Export PPT (.pptx)
                </Typography>
              </MenuItem>
            </Menu>

            {canAdd && (
              <AppButton variant="contained" customVariant="primary"
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

      <AdvancedFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        hasActiveFilters={activeFiltersCount > 0}
        onClear={() => { setCategoryFilter('ALL'); setStyleNo([]); setGarmentCategory([]); setSportCategory([]); setSampleStage([]); if(hasSearched) setPage(0); }}
        onApply={() => {
          setFilterOpen(false);
          setTimeout(() => {
            if (!hasSearched) setHasSearched(true);
            else { setPage(0); load({ forceLoading: true }); }
          }, 100);
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">Category</Typography>
          <ToggleButtonGroup
            value={categoryFilter}
            exclusive
            onChange={(_, newValue) => {
              if (newValue !== null) {
                setCategoryFilter(newValue);
                if(hasSearched) setPage(0);
              }
            }}
            size="small"
            sx={{
              display: 'flex',
              bgcolor: 'background.default',
              p: 0.5,
              borderRadius: 2,
              '& .MuiToggleButton-root': {
                flex: 1,
                border: 'none',
                borderRadius: 1.5,
                py: 0.5,
                fontSize: 13,
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'none',
                '&.Mui-selected': {
                  bgcolor: 'background.paper',
                  color: '#2e7d32',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  '&:hover': { bgcolor: 'background.paper' }
                }
              }
            }}
          >
            <ToggleButton value="ALL">{t('rdMaterial.filter_all', 'All')}</ToggleButton>
            <ToggleButton value="GARMENT">{t('rdMaterial.filter_garment', 'Garment')}</ToggleButton>
            <ToggleButton value="MOCKUP">{t('rdMaterial.filter_mockup', 'Mockup')}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">{t('rdMaterial.filter_style_no', 'Style No')}</Typography>
          <Autocomplete multiple freeSolo options={[] as string[]} value={styleNo} onChange={(_, val) => { setStyleNo(val); if(hasSearched) setPage(0); }} renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder="Enter to add..." sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 14, bgcolor: 'background.paper' } }} />} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">{t('rdMaterial.filter_garment_category', 'Product Category')}</Typography>
          <Autocomplete multiple freeSolo forcePopupIcon options={garmentCategoryOpts} value={garmentCategory} onChange={(_, val) => { setGarmentCategory(val); if(hasSearched) setPage(0); }} renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder="Enter to add..." sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 14 } }} />} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">{t('rdMaterial.filter_sport_category', 'Sport Category')}</Typography>
          <Autocomplete multiple freeSolo forcePopupIcon options={sportCategoryOpts} value={sportCategory} onChange={(_, val) => { setSportCategory(val); if(hasSearched) setPage(0); }} renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder="Enter to add..." sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 14 } }} />} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">{t('rdMaterial.filter_sample_stage', 'Sample Stage')}</Typography>
          <Autocomplete multiple freeSolo forcePopupIcon options={sampleStageOpts} value={sampleStage} onChange={(_, val) => { setSampleStage(val); if(hasSearched) setPage(0); }} renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder="Enter to add..." sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: 14 } }} />} />
        </Box>
      </AdvancedFilterDrawer>

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
        {columns.filter(col => col.id !== 'Select').map((col) => (
          <MenuItem key={col.id} onClick={() => setVisibleColumns(prev => ({ ...prev, [col.id]: prev[col.id] === false }))} sx={{ py: 0.5, borderRadius: 1 }}>
            <Checkbox size="small" checked={visibleColumns[col.id] !== false} onChange={() => {}} sx={{ mr: 1, p: 0, pointerEvents: 'none' }} />
            <Typography fontSize={13} fontWeight={500} sx={{ pointerEvents: 'none' }}>{col.label}</Typography>
          </MenuItem>
        ))}
      </Menu>

      <Paper elevation={0} sx={{ position: 'relative', flexGrow: 1, width: '100%', overflow: 'hidden', borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: '0px 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
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
              items.map((item) => {
                const rightActions = [];
                if (canEdit) {
                  rightActions.push({
                    label: t('rdMaterial.edit', 'Edit'),
                    icon: <EditIcon fontSize="small" />,
                    color: '#f59e0b',
                    onClick: () => { setIsCopy(false); setEditItem(item); setDrawerOpen(true); }
                  });
                }
                rightActions.push({
                  label: t('rdMaterial.print_sample_tag', 'In Sample Tag'),
                  icon: <PrintIcon fontSize="small" />,
                  color: '#0284c7',
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
                    onSwipeRight={() => React.startTransition(() => navigate(`${BASE}/product/${item.id}`))}
                    rightActions={rightActions}
                  >
                    <Box 
                      onClick={() => React.startTransition(() => navigate(`${BASE}/product/${item.id}`))}
                      sx={{ 
                        p: 1.5,
                        display: 'flex',
                        gap: 1.5,
                        alignItems: 'center',
                        bgcolor: (item.quantity ?? 0) <= 0 ? '#fef2f2' : '#fff',
                        cursor: 'pointer',
                        '&:active': { bgcolor: 'background.default' },
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
                          bgcolor: 'background.default', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: '1px solid rgba(0,0,0,0.04)'
                        }}
                      >
                        {rdItemApi.hasImage(item.mainImage) ? (
                          <img src={rdItemApi.getFirstImageUrl(item.mainImage)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <TextureIcon sx={{ fontSize: 24, color: '#cbd5e1' }} />
                        )}
                      </Box>

                      {/* Details */}
                      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.875rem' }}>
                          {item.product?.projectName || item.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem' }}>
                            Style No: <span style={{ color: '#2e7d32' }}>{item.itemCode || 'N/A'}</span>
                          </Typography>
                          {item.product?.sampleStage && (
                            <Chip 
                              label={item.product.sampleStage} 
                              size="small" 
                              sx={{ height: 22, fontSize: 10, bgcolor: 'background.default', color: '#475569', fontWeight: 500 }} 
                            />
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
                          {item.product?.styleName && (
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.75rem' }} noWrap>
                              <span style={{ color: '#9ca3af', marginRight: 4 }}>Style Name:</span> <span style={{ color: '#475569' }}>{item.product.styleName}</span>
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                          <Chip 
                            label={(item.category || 'Garment').toUpperCase()} 
                            size="small" 
                            sx={{ 
                              height: 22, fontSize: 10, fontWeight: 700,
                              bgcolor: item.category === 'Mockup' ? '#fef3c7' : '#dcfce7', 
                              color: item.category === 'Mockup' ? '#d97706' : '#16a34a',
                            }} 
                          />
                          {item.product?.garmentCategory && (
                            <Chip 
                              label={item.product.garmentCategory} 
                              size="small" 
                              sx={{ height: 22, fontSize: 10, bgcolor: 'background.default', color: '#475569', fontWeight: 500 }} 
                            />
                          )}
                          {item.quantity !== undefined && (
                            <Chip 
                              label={`Qty: ${item.quantity}`} 
                              size="small" 
                              color="success"
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
                    const widthStyle = col.id === 'Select' ? { width: 44, minWidth: 44, maxWidth: 44 }
                                     : col.id === 'Image' ? { width: 80, minWidth: 80, maxWidth: 80 }
                                     : col.id === 'Project' ? { width: 200, minWidth: 200, maxWidth: 200 }
                                     : col.id === 'Item Code' ? { width: 240, minWidth: 240, maxWidth: 240 }
                                     : {};

                    if (col.id === 'Select') {
                      const isAllChecked = items.length > 0 && selectedIds.length === items.length;
                      const isIndeterminate = selectedIds.length > 0 && selectedIds.length < items.length;
                      return (
                        <TableCell
                          key={col.id}
                          align="center"
                          sx={{
                            py: 1, px: 0.5,
                            bgcolor: '#F9FAFA',
                            borderBottom: '1px solid', borderColor: 'divider',
                            ...stickyStyle,
                            ...widthStyle,
                          }}
                        >
                          <Checkbox
                            size="small"
                            checked={isAllChecked}
                            indeterminate={isIndeterminate}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(items.map(i => i.id!).filter(Boolean));
                              } else {
                                setSelectedIds([]);
                              }
                            }}
                            sx={{ p: 0.5 }}
                          />
                        </TableCell>
                      );
                    }
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
                          bgcolor: '#F9FAFA', borderBottom: '1px solid', borderColor: 'divider',
                          py: 2, px: 2, textAlign: col.isCenter ? 'center' : col.isRight ? 'right' : 'left',
                          whiteSpace: 'nowrap',
                          cursor: col.id !== 'Image' && col.id !== 'Actions' ? 'grab' : 'default',
                          userSelect: 'none',
                          borderLeft: dragOverColId === col.id ? '2px dashed #2e7d32' : undefined,
                          opacity: draggedColId === col.id ? 0.4 : 1,
                          transition: 'opacity 0.15s, border 0.15s',
                          ...stickyStyle,
                          ...widthStyle,
                          '&:hover .hide-col-btn': { opacity: 0.6 }
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
              <TableBody sx={{ '& tr:nth-of-type(even)': { bgcolor: 'background.paper' }, '& tr:nth-of-type(odd)': { bgcolor: 'background.paper' }, opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
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
                ) : pagedItems.map((item) => (
                  <ProductTableRow
                    key={item.id}
                    item={item}
                    isSelected={selectedSet.has(item.id!)}
                    onToggleSelect={handleToggleSelect}
                    filteredCols={filteredCols}
                    stickyOffsets={stickyOffsets}
                    canEdit={canEdit}
                    canAdd={canAdd}
                    canDelete={canDelete}
                    onOpenDetails={handleOpenDetails}
                    onEdit={handleEdit}
                    onCopy={handleCopy}
                    onPrint={handlePrint}
                    onDelete={handleDelete}
                    onPreviewZoom={handlePreviewZoom}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Table Footer / Pagination */}
        <Box sx={{ 
          borderTop: '1px solid', borderColor: 'divider', 
          px: { xs: 1, sm: 3 }, 
          py: 1, 
          bgcolor: 'background.paper', 
          display: 'flex', 
          flexDirection: 'row',
          alignItems: 'center', 
          gap: { xs: 0.5, sm: 2 },
          justifyContent: 'space-between', 
          flexShrink: 0 
        }}>
          <Typography variant="body2" color="#3f4945" fontWeight={500} fontSize={{ xs: 11, sm: 13 }} sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {isMobile ? `Total: ${filteredItems.length}` : `Showing ${filteredItems.length === 0 ? 0 : page * rowsPerPage + 1} - ${Math.min((page + 1) * rowsPerPage, filteredItems.length)} of ${filteredItems.length}`}
          </Typography>
          <Pagination
            count={Math.ceil(filteredItems.length / rowsPerPage) || 1}
            page={page + 1}
            onChange={(_, p) => { 
              setPage(p - 1); 
              scrollToTop(dragRef);
            }}
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
              onChange={(e) => { 
                setRowsPerPage(Number(e.target.value)); 
                setPage(0); 
                scrollToTop(dragRef);
              }}
              size="small"
              sx={{ height: 24, fontSize: 11, bgcolor: '#f3f4f5', '& fieldset': { border: 'none' }, '&:hover fieldset': { border: '1px solid #bfc9c4' } }}
            >
              {[20, 50, 100].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </Select>
          </Box>
        </Box>
      </Paper>

      <ProductFormDrawer
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
          <Button variant="contained" color="error" onClick={confirmDelete} disableElevation sx={{ fontWeight: 600 }}>{t('rdMaterial.delete', 'Delete')}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={(snackbar.severity as 'success' | 'error' | 'warning' | 'info') || 'success'} sx={{ width: '100%', borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>

      {/* Full-screen Rich Image Zoom & Pan Modal */}
      <ImageZoomModal
        open={!!previewZoomItem}
        onClose={() => setPreviewZoomItem(null)}
        images={[
          ...(rdItemApi.hasImage(previewZoomItem?.mainImage) ? previewZoomItem!.mainImage!.split(',').filter(Boolean) : []),
          ...(rdItemApi.hasImage(previewZoomItem?.stickerImage) ? previewZoomItem!.stickerImage!.split(',').filter(Boolean) : []),
        ]}
        title={previewZoomItem ? `${previewZoomItem.name || ''} (${previewZoomItem.itemCode || ''})` : ''}
      />
    </Box>
  );
};

export default ProductListPage;
