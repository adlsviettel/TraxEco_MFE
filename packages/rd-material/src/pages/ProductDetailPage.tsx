import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, Chip, CircularProgress,
  Grid, IconButton, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tooltip, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Pagination, Paper, ToggleButton, ToggleButtonGroup,
  Menu, MenuItem, ListItemIcon, ListItemText, Divider, ClickAwayListener
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { rdItemApi } from '../services/rdMaterialApi';
import type { Item, ScanLog } from '../types';
import ProductFormDrawer from './ProductFormDrawer';

const BASE = '/rd-material';

/** Label + value display row */
const InfoRow = ({ label, value, italic }: { label: string; value?: React.ReactNode; italic?: boolean }) => (
  <Box>
    <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
      {label}
    </Typography>
    <Typography component="div" sx={{ fontSize: 16, color: value ? '#111827' : '#6b7280', fontWeight: value ? 600 : 500, fontStyle: italic ? 'italic' : 'normal' }}>
      {value ?? '—'}
    </Typography>
  </Box>
);

const ImageGallery = ({ images }: { images: string[] }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  if (!images || images.length === 0) {
    return (
      <Box sx={{ width: '100%', aspectRatio: '4/5', bgcolor: '#f3f4f6', borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
        <ImageIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
        <Typography variant="caption" fontWeight={500}>No Image</Typography>
      </Box>
    );
  }
  return (
    <Box>
      <Box 
        sx={{ width: '100%', aspectRatio: '4/5', bgcolor: '#f3f4f6', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'zoom-in', position: 'relative', '&:hover .overlay': { opacity: 1 } }}
        onClick={() => setFullscreenOpen(true)}
      >
        <img src={rdItemApi.getImageUrl(images[activeIdx])} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', transform: 'scale(1)' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
        <Box className="overlay" sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
           <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.9)', color: '#1f2937', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}><ImageIcon fontSize="small" /></Box>
        </Box>
      </Box>
      {images.length > 1 && (
        <Box sx={{ display: 'flex', gap: 1.5, pt: 2, overflowX: 'auto', '&::-webkit-scrollbar': { height: 0 } }}>
          {images.map((img, idx) => (
            <Box 
              key={idx} onClick={() => setActiveIdx(idx)}
              sx={{ 
                width: 64, height: 64, flexShrink: 0, borderRadius: 2, overflow: 'hidden', cursor: 'pointer',
                border: activeIdx === idx ? '2px solid #22c55e' : '1px solid transparent',
                opacity: activeIdx === idx ? 1 : 0.6,
                transition: 'all 0.2s',
                '&:hover': { opacity: 1 }
              }}
            >
              <img src={rdItemApi.getImageUrl(img)} alt={`Thumb ${idx+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>
          ))}
        </Box>
      )}

      <Dialog open={fullscreenOpen} onClose={() => setFullscreenOpen(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none', overflow: 'hidden' } }}>
        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', p: 0 }} onClick={() => setFullscreenOpen(false)}>
          <img src={rdItemApi.getImageUrl(images[activeIdx])} alt="Fullscreen" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', cursor: 'zoom-out' }} />
          <IconButton onClick={(e) => { e.stopPropagation(); setFullscreenOpen(false); }} sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}><CloseIcon /></IconButton>
        </Box>
      </Dialog>
    </Box>
  );
};

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [item, setItem] = useState<Item | null>(null);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab = tabParam ? parseInt(tabParam, 10) : 0;

  const setTab = (newTab: number) => {
    setSearchParams(prev => {
      prev.set('tab', String(newTab));
      return prev;
    }, { replace: true });
  };
  const [scanPage, setScanPage] = useState(0);
  const scanRowsPerPage = 5;
  const [scanLogType, setScanLogType] = useState<'OUT' | 'IN'>('OUT');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [children, setChildren] = useState<Item[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({ open: false, message: '', severity: 'success' });

  const [popupItemId, setPopupItemId] = useState<number | null>(null);
  const [popupItem, setPopupItem] = useState<Item | null>(null);
  const [loadingPopupItem, setLoadingPopupItem] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [expandName, setExpandName] = useState(false);

  const handleOpenItemPopup = async (itemId: number) => {
    if (!itemId) return;
    setPopupItemId(itemId);
    setLoadingPopupItem(true);
    setPopupItem(null);
    try {
      let itemData = await rdItemApi.getById(itemId);
      if (itemData && itemData.itemType === 'YARDAGE' && itemData.parentId) {
        try {
          const parentData = await rdItemApi.getById(itemData.parentId);
          itemData = {
            ...parentData,
            id: itemData.id,
            parentId: itemData.parentId,
            itemCode: itemData.itemCode,
            name: itemData.name,
            quantity: itemData.quantity,
            location: itemData.location || parentData.location,
            mainImage: itemData.mainImage || parentData.mainImage,
            stickerImage: itemData.stickerImage || parentData.stickerImage,
            remark: itemData.remark || parentData.remark,
            itemType: 'YARDAGE'
          };
        } catch (e) {
          console.error("Failed to load parent fabric for yardage item", e);
        }
      }
      setPopupItem(itemData);
    } catch (err) {
      console.error("Failed to load item details for popup", err);
    } finally {
      setLoadingPopupItem(false);
    }
  };

  const handleCloseItemPopup = () => {
    setPopupItemId(null);
    setPopupItem(null);
  };

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const itemData = await rdItemApi.getById(+id);
      setItem(itemData);
      
      try {
        const childrenData = await rdItemApi.getChildren(+id);
        setChildren(Array.isArray(childrenData) ? childrenData.filter(c => c.itemType === 'YARDAGE') : []);
      } catch (e) {
        console.warn('Could not load children', e);
      }
      
      // Load scan logs separately to not mask errors
      try {
        const logData = await rdItemApi.getScanLogs(+id);
        // Safety net: ensure actionType is always set (even if rdMaterialApi cache is stale)
        const fixedLogs = (logData as ScanLog[]).map(log => {
          if (!log.actionType || log.actionType === '') {
            const act = (log as any).action || '';
            const actUpper = String(act).toUpperCase();
            if (actUpper.includes('OUT')) {
              return { ...log, actionType: 'OUT' as const };
            } else if (actUpper.includes('IN')) {
              return { ...log, actionType: 'IN' as const };
            } else {
              // Last resort: negative qty = OUT
              return { ...log, actionType: (Number(log.qtyChanged) < 0 || Number((log as any).rawQtyChanged) < 0) ? 'OUT' as const : 'IN' as const };
            }
          }
          return log;
        });
        setScanLogs(fixedLogs);
      } catch (logErr) {
        console.error('[ProductDetail] Scan logs failed:', logErr);
        setScanLogs([]);
      }
    } catch {
      setError('Cannot load item data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = () => {
    if (!item) return;
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!item) return;
    try {
      await rdItemApi.softDelete(item.id);
      navigate(`${BASE}/product`);
    } catch {
      setSnackbar({ open: true, message: t('rdMaterial.delete_error', 'Error deleting item'), severity: 'error' });
    } finally {
      setDeleteConfirmOpen(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" pt={10}><CircularProgress color="primary" /></Box>;
  if (error) return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  if (!item) return null;

  return (
    <Box sx={{ 
      bgcolor: '#F8F9FA', 
      height: { xs: 'auto', md: 'calc(100vh - 90px)' }, 
      m: { xs: -1, md: -1.5 }, 
      p: { xs: 2, md: 4 },
      pb: { xs: 'calc(120px + env(safe-area-inset-bottom))', md: 4 },
      display: 'flex',
      flexDirection: 'column',
      overflow: { xs: 'visible', md: 'hidden' }
    }}>
      {/* ── Breadcrumb ── */}
      <Box sx={{ flexShrink: 0 }} display="flex" alignItems="center" gap={1} mb={3}>
        <Button size="small" onClick={() => navigate(`${BASE}/product`)} sx={{ color: '#6b7280', fontWeight: 500, fontSize: 14, textTransform: 'none', minWidth: 0, p: 0, '&:hover': { color: '#111827', bgcolor: 'transparent' } }}>
          <ArrowBackIcon sx={{ fontSize: 16, mr: 1 }} /> Product
        </Button>
        <Typography color="#d1d5db" fontSize={12}>❯</Typography>
        <Typography fontSize={14} fontWeight={500} color="#111827">{item.name}</Typography>
      </Box>

      {/* ── Header ── */}
      <Box sx={{ flexShrink: 0, position: 'relative', pr: { xs: 5, md: 8 } }} mb={4}>
        <Box display="flex" alignItems="center" gap={1.5} mb={1.5} flexWrap="nowrap" sx={{ minWidth: 0 }}>
          <ClickAwayListener onClickAway={() => setExpandName(false)}>
            <Typography 
              variant="h4" 
              fontWeight={700} 
              color="#111827" 
              onClick={() => setExpandName(true)}
              sx={{ 
                fontSize: { xs: 20, md: 30 }, 
                whiteSpace: expandName ? 'normal' : 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                minWidth: 0,
                cursor: 'pointer'
              }}
            >
              {item.name}
            </Typography>
          </ClickAwayListener>
          <Chip label="Product" size="small" sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 600, fontSize: 12, height: 24, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', flexShrink: 0, ml: 'auto' }}>
             <Typography fontSize={14} lineHeight={1}>📦</Typography>
             <Typography fontSize={12} fontWeight={700} color="#15803d">Stock:</Typography>
             <Typography fontSize={14} fontWeight={800} color="#14532d">
               {item.quantity ?? 0} {item.quantityUnit || item.priceUnit ? <Typography component="span" fontSize={12} fontWeight={600} color="#15803d">{item.quantityUnit || item.priceUnit}</Typography> : null}
             </Typography>
          </Box>
        </Box>
        
        <Typography fontSize={14} color="#4b5563" display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
          <Box component="span"><Box component="span" fontWeight={600}>Item Code:</Box> {item.itemCode}</Box>
          <Box component="span" sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#d1d5db' }} />
          {item.supplierName && <Box component="span"><Box component="span" fontWeight={600}>Supplier:</Box> {item.supplierName}</Box>}
          {item.supplierName && <Box component="span" sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#d1d5db' }} />}
          <Box component="span"><Box component="span" fontWeight={600}>QR:</Box> {(item.category?.toUpperCase() === 'MOCKUP' ? 'MK' : 'GM')}-{item.id}</Box>
        </Typography>

        <Box sx={{ position: 'absolute', right: 0, top: 0 }}>
          <Tooltip title="Actions">
            <IconButton 
              onClick={(e) => setActionMenuAnchor(e.currentTarget)} 
              sx={{ border: '1px solid #e5e7eb', borderRadius: 2, width: 40, height: 40, bgcolor: '#fff', color: '#4b5563', '&:hover': { bgcolor: '#f9fafb', color: '#111827' } }}
            >
              <MoreVertIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          
          <Menu
            anchorEl={actionMenuAnchor}
            open={Boolean(actionMenuAnchor)}
            onClose={() => setActionMenuAnchor(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 4px 20px rgba(0,0,0,0.1))',
                mt: 1,
                borderRadius: 2,
                minWidth: 160,
                '& .MuiMenuItem-root': {
                  px: 2, py: 1.5,
                  fontSize: 14,
                  fontWeight: 500,
                  gap: 1.5,
                }
              },
            }}
          >
            <MenuItem onClick={() => { setActionMenuAnchor(null); setDrawerOpen(true); }}>
              <ListItemIcon sx={{ minWidth: 'auto !important', color: '#f59e0b' }}>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={t('rdMaterial.edit', 'Edit')} />
            </MenuItem>
            
            <MenuItem onClick={() => { setActionMenuAnchor(null); navigate(`${BASE}/label/${item.id}`); }}>
              <ListItemIcon sx={{ minWidth: 'auto !important', color: '#6366f1' }}>
                <PrintIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={t('rdMaterial.print_label', 'Print Label')} />
            </MenuItem>
            
            <Divider sx={{ my: 0.5 }} />
            
            <MenuItem onClick={() => { setActionMenuAnchor(null); handleDelete(); }} sx={{ color: '#dc2626' }}>
              <ListItemIcon sx={{ minWidth: 'auto !important', color: '#dc2626' }}>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={t('rdMaterial.delete', 'Delete')} />
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* ── Main content ── */}
      <Grid container spacing={4} sx={{ flex: 1, minHeight: 0, height: { xs: 'auto', md: '100%' } }}>
        {/* Left Column */}
        <Grid size={{ xs: 12, lg: 4 }} sx={{ height: { xs: 'auto', md: '100%' }, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, overflowY: { xs: 'visible', md: 'auto' }, pr: { xs: 0, md: 1 }, pb: { xs: 2, md: 0 } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Card elevation={0} sx={{ borderRadius: 4, p: 3, bgcolor: '#fff', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
                <Typography fontSize={12} fontWeight={700} color="#9ca3af" textTransform="uppercase" letterSpacing="0.05em" mb={2}>{t('rdMaterial.product_images', 'Product Images')}</Typography>
                <ImageGallery images={item.mainImage ? item.mainImage.split(',').filter(Boolean) : []} />
              </Card>
              {item.stickerImage && item.stickerImage.split(',').filter(Boolean).length > 0 && (
                <Card elevation={0} sx={{ borderRadius: 4, p: 3, bgcolor: '#fff', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
                  <Typography fontSize={12} fontWeight={700} color="#9ca3af" textTransform="uppercase" letterSpacing="0.05em" mb={2}>{t('rdMaterial.sticker_images', 'Sticker Images')}</Typography>
                  <ImageGallery images={item.stickerImage.split(',').filter(Boolean)} />
                </Card>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Right Column */}
        <Grid size={{ xs: 12, lg: 8 }} sx={{ height: { xs: 'auto', md: '100%' }, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, overflowY: { xs: 'visible', md: 'auto' }, pr: { xs: 0, md: 1 } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Tabbed Details Card */}
            <Card elevation={0} sx={{ borderRadius: 4, bgcolor: '#fff', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', overflow: 'hidden' }}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)}
                TabIndicatorProps={{ sx: { bgcolor: '#15803d', height: 2 } }}
                sx={{
                  borderBottom: '1px solid #e5e7eb', px: 1,
                  '& .MuiTab-root': { fontSize: 14, fontWeight: 500, textTransform: 'none', minHeight: 56, color: '#6b7280', px: 3 },
                  '& .Mui-selected': { color: '#15803d !important', fontWeight: 600 },
                }}>
                <Tab label={t('rdMaterial.product_info', 'Product Info')} />
                <Tab label={t('rdMaterial.bom', 'BOM')} />
                <Tab label={t('rdMaterial.scan_history', 'Scan History')} />
              </Tabs>

              <Box sx={{ p: 4 }}>
                {tab === 0 && (
                  <Box display="grid" gridTemplateColumns={{ xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }} columnGap={{ xs: 2, md: 4 }} rowGap={{ xs: 3, md: 5 }}>
                    <InfoRow label="Project Name" value={item.product?.projectName} />
                    <InfoRow label="Style No" value={item.product?.styleNo || item.itemCode} />
                    <InfoRow label="Style Name" value={item.product?.styleName || item.name} />
                    <InfoRow label="Product Category" value={item.product?.garmentCategory} />
                    <InfoRow label="Sport Category" value={item.product?.sportCategory} />
                    <InfoRow label="Sample Stage" value={item.product?.sampleStage} />
                    <InfoRow label="Color" value={item.product?.color} />
                    <InfoRow label="Size" value={item.product?.size} />
                    <InfoRow label="Gender" value={item.product?.gender} />
                    <InfoRow label="Pattern Marker" value={item.product?.patternMarker} />
                    <InfoRow label="Allocation" value={item.product?.allocation} />
                    <InfoRow label="Location" value={item.location} />
                    <InfoRow label="FOB Price" value={item.product?.fobPrice ? <>{item.product.fobPrice} USD <Typography component="span" fontSize={14} color="#6b7280" fontWeight={400}>/ pcs</Typography></> : undefined} />
                    <Box sx={{ gridColumn: '1/-1', pt: 3, borderTop: '1px solid #f3f4f6' }}>
                      <InfoRow label="Description" value={item.description || 'No description added.'} italic={!item.description} />
                    </Box>
                    <Box sx={{ gridColumn: '1/-1', pt: 1 }}>
                      <InfoRow label="Notes" value={item.remark || 'No notes added.'} italic={!item.remark} />
                    </Box>
                  </Box>
                )}

                {tab === 1 && (
                  <Box>
                    {(() => {
                      const compStr = item.product?.mainComposition;
                      if (!compStr) return <Typography sx={{ fontSize: 14, color: '#6b7280', fontStyle: 'italic' }}>No materials defined.</Typography>;
                      if (typeof compStr !== 'string') return <Typography sx={{ fontSize: 15, color: '#111827', fontWeight: 500 }}>{String(compStr)}</Typography>;
                      if (!compStr.startsWith('[')) return <Typography sx={{ fontSize: 15, color: '#111827', fontWeight: 500 }}>{compStr}</Typography>;
                      try {
                        const list = JSON.parse(compStr);
                        if (Array.isArray(list) && list.length > 0) {
                          return (
                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, bgcolor: '#f8fafc' }}>
                              <Table size="small">
                                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 700, width: 150 }}>Usage</TableCell>
                                    <TableCell sx={{ fontWeight: 700, width: 150 }}>Item Code</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Item Name</TableCell>
                                    <TableCell sx={{ fontWeight: 700, width: 120 }}>Color</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {list.map((row: any, idx: number) => (
                                    <TableRow key={row.id || idx}>
                                      <TableCell sx={{ fontWeight: 500 }}>{row.usage}</TableCell>
                                      <TableCell>
                                        <Button 
                                          size="small" 
                                          onClick={() => handleOpenItemPopup(row.itemId)}
                                          sx={{ 
                                            fontWeight: 600, 
                                            color: '#166534', 
                                            textTransform: 'none', 
                                            minWidth: 0, 
                                            p: 0, 
                                            textDecoration: 'underline',
                                            '&:hover': { color: '#14532d', bgcolor: 'transparent', textDecoration: 'underline' } 
                                          }}
                                        >
                                          {row.itemCode}
                                        </Button>
                                      </TableCell>
                                      <TableCell>{row.name}</TableCell>
                                      <TableCell>{row.color || '–'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          );
                        }
                      } catch (e) {
                        console.error(e);
                      }
                      return <Typography sx={{ fontSize: 15, color: '#111827', fontWeight: 500 }}>{compStr}</Typography>;
                    })()}
                  </Box>
                )}

                {tab === 2 && (
                  <Box>
                    <Box mb={2}>
                      <ToggleButtonGroup size="small" value={scanLogType} exclusive onChange={(_, v) => { if (v) { setScanLogType(v); setScanPage(0); } }} sx={{ '& .MuiToggleButton-root': { py: 0.5 } }}>
                        <ToggleButton value="OUT" sx={{ px: 3, fontWeight: 600, fontSize: 13 }}>SCAN OUT (BORROW)</ToggleButton>
                        <ToggleButton value="IN" sx={{ px: 3, fontWeight: 600, fontSize: 13 }}>SCAN IN (RETURN)</ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                    {(() => {
                      const filteredLogs = scanLogs.filter(log => log.actionType === scanLogType);
                      return filteredLogs.length === 0 ? (
                        <Box textAlign="center" py={5}>
                          <Typography color="#6b7280" fontSize={14}>No scan logs found.</Typography>
                        </Box>
                      ) : (
                        <>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  {['Time', 'Action', 'Qty', 'Holder', 'Note', 'Photo'].map(h => (
                                    <TableCell key={h} sx={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: '#9ca3af', borderBottom: '1px solid #e5e7eb', py: 1.5 }}>
                                      {h}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {filteredLogs.slice(scanPage * scanRowsPerPage, scanPage * scanRowsPerPage + scanRowsPerPage).map((log, idx) => (
                                  <TableRow key={idx} hover>
                                    <TableCell sx={{ fontSize: 14, width: 150 }}>{new Date(log.scannedAt).toLocaleString()}</TableCell>
                                    <TableCell sx={{ textAlign: 'center', width: 100 }}>
                                      <Chip label={log.actionType} size="small" sx={{ bgcolor: log.actionType === 'IN' ? '#fef3c7' : '#fee2e2', color: log.actionType === 'IN' ? '#b45309' : '#dc2626', fontWeight: 600, fontSize: 11, height: 20 }} />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 14, fontWeight: 600, width: 80 }}>{Math.abs(Number(log.qtyChanged))}</TableCell>
                                    <TableCell sx={{ fontSize: 14 }}>{log.holder}</TableCell>
                                    <TableCell sx={{ fontSize: 14, color: '#6b7280' }}>{log.note}</TableCell>
                                    <TableCell sx={{ py: 1 }}>
                                      {log.photoUrl ? (
                                        <Box 
                                          onClick={() => setPreviewPhotoUrl(log.photoUrl || null)}
                                          sx={{ 
                                            width: 32, height: 32, borderRadius: 1, overflow: 'hidden', border: '1px solid #e1e3e4', cursor: 'pointer',
                                            transition: 'transform 0.15s', '&:hover': { transform: 'scale(1.1)' }, display: 'inline-block'
                                          }}
                                        >
                                          <img src={rdItemApi.getImageUrl(log.photoUrl)} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </Box>
                                      ) : (
                                        '–'
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                          {filteredLogs.length > 0 && (
                            <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f3f4f6' }}>
                              <Pagination count={Math.ceil(filteredLogs.length / scanRowsPerPage)} page={scanPage + 1} onChange={(_, p) => setScanPage(p - 1)} color="primary" shape="rounded" size="small" />
                            </Box>
                          )}
                        </>
                      );
                    })()}
                  </Box>
                )}
              </Box>
            </Card>
          </Box>
        </Box>
      </Grid>
    </Grid>

      <ProductFormDrawer
        open={drawerOpen}
        item={item}
        onClose={() => setDrawerOpen(false)}
        onSaved={(updated) => { setItem(updated); setDrawerOpen(false); }}
      />

      {/* Mini Item Detail Modal */}
      <Dialog 
        open={popupItemId !== null} 
        onClose={handleCloseItemPopup} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6' }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: 18 }}>
              {popupItem ? `[${popupItem.itemCode}] ${popupItem.name}` : 'Item Details'}
            </Typography>
            {popupItem && (() => {
              const isFabricLike = popupItem.itemType === 'FABRIC' || popupItem.itemType === 'YARDAGE';
              return (
                <Chip 
                  label={isFabricLike ? 'Fabric' : 'Accessory'} 
                  size="small" 
                  sx={{ 
                    bgcolor: isFabricLike ? '#dcfce7' : '#dbeafe', 
                    color: isFabricLike ? '#166534' : '#1e40af', 
                    fontWeight: 600, 
                    fontSize: 11,
                    height: 20
                  }} 
                />
              );
            })()}
          </Box>
          <IconButton onClick={handleCloseItemPopup} size="small" sx={{ color: '#9ca3af' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 4, bgcolor: '#fbfcfd' }}>
          {loadingPopupItem ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={8}>
              <CircularProgress size={40} sx={{ color: '#15803d' }} />
            </Box>
          ) : !popupItem ? (
            <Box py={4} textAlign="center">
              <Typography color="text.secondary">Failed to load item details.</Typography>
            </Box>
          ) : (
            <Grid container spacing={4}>
              {/* Image Section */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box 
                  sx={{ 
                    width: '100%', 
                    aspectRatio: '1', 
                    borderRadius: 3, 
                    bgcolor: '#f3f4f6', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  {(() => {
                    const imgStr = popupItem.mainImage || popupItem.stickerImage || '';
                    const imgs = imgStr.split(',').filter(Boolean);
                    return imgs.length > 0 ? (
                      <img 
                        src={rdItemApi.getImageUrl(imgs[0])} 
                        alt={popupItem.name} 
                        onClick={() => setLightboxImage(rdItemApi.getImageUrl(imgs[0]))}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                      />
                    ) : (
                      <ImageIcon sx={{ fontSize: 48, color: '#d1d5db' }} />
                    );
                  })()}
                </Box>
              </Grid>

              {/* Info Section */}
              <Grid size={{ xs: 12, sm: 8 }}>
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap={3}>
                  <InfoRow label="Item Code" value={popupItem.itemCode} />
                  <InfoRow label="Item Name" value={popupItem.name} />
                  <InfoRow label="Supplier" value={popupItem.supplierName} />
                  <InfoRow label="Origin" value={popupItem.origin} />
                  <InfoRow label="Location" value={popupItem.location} />
                  <InfoRow 
                    label="Total Stock" 
                    value={`${popupItem.quantity ?? 0} ${popupItem.priceUnit || 'pcs'}`} 
                  />
                  <InfoRow 
                    label="Price" 
                    value={popupItem.price ? `${popupItem.price} ${popupItem.currency || ''} ${popupItem.priceUnit ? `/ ${popupItem.priceUnit}` : ''}` : undefined} 
                  />
                  <InfoRow label="MOQ / MCQ" value={popupItem.moqMcq} />
                  <InfoRow label="Leadtime" value={popupItem.leadTime} />

                  {(popupItem.itemType === 'FABRIC' || popupItem.itemType === 'YARDAGE') && (
                    <>
                      <InfoRow label="Structure" value={popupItem.fabric?.structure} />
                      <InfoRow label="Fabric Name (EN)" value={popupItem.fabric?.fabricName} />
                      <InfoRow label="Composition" value={popupItem.fabric?.composition} />
                      <InfoRow label="Function" value={popupItem.fabric?.function} />
                      <InfoRow label="GSM" value={popupItem.fabric?.weightGsm ? `${popupItem.fabric.weightGsm} gsm` : undefined} />
                      <InfoRow 
                        label="Cuttable Width" 
                        value={popupItem.fabric?.cuttableWidth ? `${popupItem.fabric.cuttableWidth} inch` : undefined} 
                      />
                      <InfoRow label="Color Name" value={popupItem.fabric?.colorName} />
                    </>
                  )}

                  {popupItem.itemType === 'ACCESSORY' && (
                    <>
                      <InfoRow label="Specification" value={popupItem.accessory?.specification} />
                      <InfoRow label="Composition" value={popupItem.accessory?.composition} />
                      <InfoRow label="Color" value={popupItem.accessory?.color} />
                      <InfoRow label="Size" value={popupItem.accessory?.size} />
                      <InfoRow label="Weight" value={popupItem.accessory?.weightGsm ? `${popupItem.accessory.weightGsm} gsm` : undefined} />
                    </>
                  )}
                </Box>

                {popupItem.remark && (
                  <Box mt={3} pt={2} sx={{ borderTop: '1px solid #f3f4f6' }}>
                    <InfoRow label="Notes" value={popupItem.remark} />
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid #f3f4f6', bgcolor: '#fff', gap: 1 }}>
          <Button 
            onClick={handleCloseItemPopup} 
            variant="outlined" 
            sx={{ 
              borderRadius: 2, 
              textTransform: 'none', 
              borderColor: '#e5e7eb',
              color: '#374151',
              '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' }
            }}
          >
            Close
          </Button>
          {popupItem && (
            <Button 
              onClick={() => {
                handleCloseItemPopup();
                const type = popupItem.itemType?.toUpperCase();
                if (type === 'FABRIC') {
                  navigate(`${BASE}/fabric/${popupItem.id}`);
                } else if (type === 'YARDAGE') {
                  navigate(`${BASE}/fabric/${popupItem.parentId || popupItem.id}`);
                } else if (type === 'ACCESSORY') {
                  navigate(`${BASE}/accessory/${popupItem.id}`);
                } else {
                  if (popupItem.itemCode?.toUpperCase().startsWith('ACC')) {
                    navigate(`${BASE}/accessory/${popupItem.id}`);
                  } else {
                    navigate(`${BASE}/fabric/${popupItem.parentId || popupItem.id}`);
                  }
                }
              }} 
              variant="contained" 
              sx={{ 
                borderRadius: 2, 
                textTransform: 'none', 
                bgcolor: '#15803d',
                color: '#fff',
                '&:hover': { bgcolor: '#166534' }
              }}
            >
              Go to Details Page
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 4, minWidth: 320, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{t('rdMaterial.confirm_delete_title', 'Confirm Deletion')}</DialogTitle>
        <DialogContent>
          <Typography color="#6b7280">{t('rdMaterial.confirm_delete', { name: item?.name, defaultValue: `Delete "${item?.name}"?` })}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ color: '#6b7280', fontWeight: 600, textTransform: 'none' }}>{t('rdMaterial.cancel', 'Cancel')}</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disableElevation sx={{ fontWeight: 600, textTransform: 'none', borderRadius: 2 }}>{t('rdMaterial.delete', 'Delete')}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity as any} sx={{ width: '100%', borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>

      {/* Lightbox Image Zoom */}
      <Dialog 
        open={!!lightboxImage} 
        onClose={() => setLightboxImage(null)} 
        maxWidth="lg" 
        sx={{ zIndex: 99999 }} 
        PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none' } }}
      >
        <Box position="relative">
          <IconButton 
            onClick={() => setLightboxImage(null)} 
            sx={{ position: 'absolute', right: -20, top: -20, color: 'white', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'red' } }}
          >
            <CloseIcon />
          </IconButton>
          <img src={lightboxImage || ''} alt="Full Size" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} />
        </Box>
      </Dialog>

      <Dialog open={!!previewPhotoUrl} onClose={() => setPreviewPhotoUrl(null)} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: 0, bgcolor: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: 200 }}>
          <IconButton
            onClick={() => setPreviewPhotoUrl(null)}
            sx={{ position: 'absolute', top: 12, right: 12, color: '#fff', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, zIndex: 10 }}
          >
            <CloseIcon />
          </IconButton>
          {previewPhotoUrl && (
            <img
              src={rdItemApi.getImageUrl(previewPhotoUrl)}
              alt="Preview Evidence"
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ProductDetailPage;
