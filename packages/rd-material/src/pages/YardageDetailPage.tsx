import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, Chip, CircularProgress,
  Divider, Grid, IconButton, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tooltip, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Pagination, Paper, ToggleButton, ToggleButtonGroup, Avatar,
  Menu, MenuItem, ListItemIcon, ClickAwayListener
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
import GenericItemFormDrawer from '../components/GenericItemFormDrawer';

const BASE = '/rd-material';

const InfoRow = ({ label, value, italic }: { label: string; value?: React.ReactNode; italic?: boolean }) => (
  <Box>
    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
      {label}
    </Typography>
    <Typography component="div" sx={{ fontSize: 16, color: value ? '#111827' : '#6b7280', fontWeight: value ? 600 : 500, fontStyle: italic ? 'italic' : 'normal', whiteSpace: 'pre-wrap' }}>
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
                border: activeIdx === idx ? '2px solid #2e7d32' : '1px solid transparent',
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

const YardageDetailPage: React.FC = () => {
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const [scanLogType, setScanLogType] = useState<'OUT' | 'IN'>('OUT');
  const [scanPage, setScanPage] = useState(0);
  const scanRowsPerPage = 10;

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [expandName, setExpandName] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await rdItemApi.getById(Number(id));
      setItem(data);
      setError(null);
      
      const logs = await rdItemApi.getScanLogs(Number(id));
      setScanLogs(logs || []);
    } catch (err) {
      console.error(err);
      setError(t('rdMaterial.failed_load_details', 'Failed to load details.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const confirmDelete = async () => {
    if (!item?.id) return;
    try {
      await rdItemApi.softDelete(item.id);
      setDeleteConfirmOpen(false);
      setSnackbar({ open: true, message: t('rdMaterial.delete_success', 'Deleted successfully'), severity: 'success' });
      setTimeout(() => {
        navigate(`${BASE}/yardage`, { replace: true });
      }, 1000);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: t('rdMaterial.delete_error', 'Error deleting item'), severity: 'error' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error || !item) {
    return (
      <Box p={3}>
        <Alert severity="error">{error || t('rdMaterial.item_not_found', 'Item not found')}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>{t('rdMaterial.back', 'Back')}</Button>
      </Box>
    );
  }

  const images = item.mainImage ? item.mainImage.split(',').filter(Boolean) : [];

  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: { xs: 2, md: 4 } }}>
      
      {/* Breadcrumbs */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexShrink: 0 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate(`${BASE}/yardage`)}
          sx={{ color: '#4b5563', textTransform: 'none', fontWeight: 600, fontSize: 13, '&:hover': { bgcolor: '#f3f4f6' } }}
        >
          {t('rdMaterial.back_to_list', 'Back to List')}
        </Button>
        <Typography color="#d1d5db" fontSize={12}>❯</Typography>
        <Typography fontSize={14} fontWeight={500} color="#111827">{item.itemCode || 'Yardage Detail'}</Typography>
      </Box>

      {/* Header */}
      <Box sx={{ flexShrink: 0, position: 'relative', pr: { xs: 5, md: 8 } }} mb={4}>
        <Box display="flex" alignItems="center" gap={1.5} mb={1.5} flexWrap="nowrap" sx={{ minWidth: 0 }}>
          <ClickAwayListener onClickAway={() => setExpandName(false)}>
            <Typography 
              variant="h4" 
              fontWeight={800} 
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
              {item.fabric?.fabricName || item.name || 'Sample Yardage'}
            </Typography>
          </ClickAwayListener>
          <Chip label="Yardage" size="small" sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: 12, height: 24, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, borderRadius: 2, bgcolor: 'rgba(46,125,50,0.05)', border: '1px solid rgba(46,125,50,0.1)', flexShrink: 0, ml: 'auto' }}>
             <Typography fontSize={14} lineHeight={1}>📦</Typography>
             <Typography fontSize={12} fontWeight={700} color="#2e7d32">Stock:</Typography>
             <Typography fontSize={14} fontWeight={800} color="#2e7d32">
               {item.quantity ?? 0} <Typography component="span" fontSize={12} fontWeight={600} color="#2e7d32">{item.quantityUnit || 'Yd'}</Typography>
             </Typography>
          </Box>
        </Box>

        <Typography fontSize={14} color="#4b5563" display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
          <Box component="span"><Box component="span" fontWeight={700}>Item Code:</Box> {item.itemCode || '—'}</Box>
          <Box component="span" sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#d1d5db' }} />
          {item.category && <Box component="span"><Box component="span" fontWeight={700}>Color:</Box> {item.category}</Box>}
          {item.category && <Box component="span" sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#d1d5db' }} />}
          <Box component="span"><Box component="span" fontWeight={700}>QR:</Box> YD-{item.id}</Box>
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
              Edit Details
            </MenuItem>
            <MenuItem onClick={() => { setActionMenuAnchor(null); navigate(`${BASE}/label/${item.id}`); }}>
              <ListItemIcon sx={{ minWidth: 'auto !important', color: '#2e7d32' }}>
                <PrintIcon fontSize="small" />
              </ListItemIcon>
              Print Label
            </MenuItem>
            <Divider sx={{ my: '4px !important' }} />
            <MenuItem onClick={() => { setActionMenuAnchor(null); setDeleteConfirmOpen(true); }} sx={{ color: '#ef4444' }}>
              <ListItemIcon sx={{ minWidth: 'auto !important', color: '#ef4444' }}>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              Delete Yardage
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Main Content */}
      <Grid container spacing={4} sx={{ flex: 1, minHeight: 0, height: { xs: 'auto', md: '100%' } }}>
        {/* Left Column: Image gallery */}
        <Grid size={{ xs: 12, lg: 4 }} sx={{ height: { xs: 'auto', md: '100%' }, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, overflowY: { xs: 'visible', md: 'auto' }, pr: { xs: 0, md: 1 }, pb: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Card elevation={0} sx={{ borderRadius: 4, p: 3, bgcolor: '#fff', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
                <Typography fontSize={12} fontWeight={700} color="#9ca3af" textTransform="uppercase" letterSpacing="0.05em" mb={2}>{t('rdMaterial.images', 'Images')}</Typography>
                <ImageGallery images={images} />
              </Card>
            </Box>
          </Box>
        </Grid>

        {/* Right Column: Tabbed sections */}
        <Grid size={{ xs: 12, lg: 8 }} sx={{ height: { xs: 'auto', md: '100%' }, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, overflowY: { xs: 'visible', md: 'auto' }, pr: { xs: 0, md: 1 }, pb: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Card elevation={0} sx={{ borderRadius: 4, bgcolor: '#fff', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', overflow: 'hidden' }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}
                  TabIndicatorProps={{ sx: { bgcolor: '#2e7d32', height: 2 } }}
                  sx={{
                    borderBottom: '1px solid #e5e7eb', px: 1,
                    '& .MuiTab-root': { fontSize: 14, fontWeight: 500, textTransform: 'none', minHeight: 56, color: '#6b7280', px: 3 },
                    '& .Mui-selected': { color: '#2e7d32 !important', fontWeight: 600 },
                  }}>
                  <Tab label={t('rdMaterial.yardage_info', 'Yardage Info')} />
                  <Tab label={t('rdMaterial.scan_history', 'Scan History')} />
                </Tabs>

                <Box sx={{ p: 4 }}>
                  {tab === 0 && (
                    <Box display="flex" flexDirection="column" gap={4}>
                      {/* Yardage Roll Specs */}
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800} color="#2e7d32" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>📋</span> Yardage Roll Info
                        </Typography>
                        <Box display="grid" gridTemplateColumns={{ xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }} gap={3}>
                          <InfoRow label="Color / Category" value={item.category} />
                          <InfoRow label="Quantity (Stock)" value={`${item.quantity ?? 0} ${item.quantityUnit || 'Yd'}`} />
                          <InfoRow label="Location" value={item.location} />
                          <InfoRow label="Input Date" value={item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—'} />
                        </Box>
                      </Box>

                      <Divider sx={{ borderColor: '#f1f5f9' }} />

                      {/* Parent Fabric Specs */}
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800} color="#0369a1" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>🧵</span> Parent Fabric Info
                        </Typography>
                        <Box display="grid" gridTemplateColumns={{ xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }} gap={3}>
                          <InfoRow label="Fabric Name" value={item.fabric?.fabricName} />
                          <InfoRow label="ERP Name" value={item.name} />
                          <InfoRow label="Item Code" value={item.itemCode} />
                          <InfoRow label="Structure" value={item.fabric?.structure} />
                          <InfoRow label="Composition" value={item.fabric?.composition} />
                          <InfoRow label="Weight (GSM)" value={item.fabric?.weightGsm ? `${item.fabric.weightGsm} gsm` : undefined} />
                          <InfoRow label="Cuttable Width" value={item.fabric?.cuttableWidth ? `${item.fabric.cuttableWidth} inch` : undefined} />
                          <InfoRow label="Supplier" value={item.supplierName} />
                          <InfoRow label="Origin" value={item.origin} />
                          <InfoRow label="Function" value={item.fabric?.function} />
                        </Box>
                      </Box>

                      {item.remark && (
                        <>
                          <Divider sx={{ borderColor: '#f1f5f9' }} />
                          <Box>
                            <Typography variant="subtitle2" fontWeight={800} color="text.secondary" mb={1}>Remark / Notes</Typography>
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#fafafa', color: '#4b5563', fontSize: 14, whiteSpace: 'pre-wrap' }}>
                              {item.remark}
                            </Paper>
                          </Box>
                        </>
                      )}
                    </Box>
                  )}

                  {tab === 1 && (
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
                                        <Chip label={log.actionType} size="small" sx={{ bgcolor: log.actionType === 'IN' ? '#dcfce7' : '#fee2e2', color: log.actionType === 'IN' ? '#166534' : '#dc2626', fontWeight: 600, fontSize: 11, height: 20 }} />
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

      {/* Edit Drawer */}
      <GenericItemFormDrawer
        open={drawerOpen}
        item={item}
        onClose={() => setDrawerOpen(false)}
        itemType="YARDAGE"
        title="Edit Sample Yardage"
        fields={[]}
        onSaved={(updated) => { setItem(updated); setDrawerOpen(false); fetchDetail(); }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 4, minWidth: 320 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{t('rdMaterial.confirm_delete_title', 'Confirm Deletion')}</DialogTitle>
        <DialogContent>
          <Typography color="#6b7280">{t('rdMaterial.confirm_delete', { name: item?.itemCode, defaultValue: `Delete Yardage Roll "${item?.itemCode}"?` })}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ color: '#6b7280', fontWeight: 600, textTransform: 'none' }}>{t('rdMaterial.cancel', 'Cancel')}</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disableElevation sx={{ fontWeight: 600, textTransform: 'none', borderRadius: 2 }}>{t('rdMaterial.delete', 'Delete')}</Button>
        </DialogActions>
      </Dialog>

      {/* Photo Lightbox */}
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

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default YardageDetailPage;
