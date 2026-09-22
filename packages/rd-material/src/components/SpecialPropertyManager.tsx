import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box, Typography, Button, IconButton, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Avatar, Alert, Tooltip, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import SyncIcon from '@mui/icons-material/Sync';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import {
  SpecialPropertyItem,
  specialPropertyService,
  DEFAULT_SPECIAL_PROPERTIES
} from '../services/specialPropertyService';

export interface SpecialPropertyManagerProps {
  onSelect?: (property: SpecialPropertyItem) => void;
  selectedId?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const SpecialPropertyManager: React.FC<SpecialPropertyManagerProps> = ({
  onSelect,
  selectedId,
  onClose,
  showCloseButton = false,
}) => {
  const { t } = useTranslation();
  const [properties, setProperties] = useState<SpecialPropertyItem[]>(() => specialPropertyService.getAll());
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<SpecialPropertyItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProperties = () => {
    setProperties(specialPropertyService.getAll());
  };

  useEffect(() => {
    loadProperties();
    resetForm();

    const handleUpdate = () => {
      loadProperties();
    };

    window.addEventListener('traxeco:special-properties-updated', handleUpdate);
    return () => {
      window.removeEventListener('traxeco:special-properties-updated', handleUpdate);
    };
  }, []);

  const resetForm = () => {
    setName('');
    setIconUrl(DEFAULT_SPECIAL_PROPERTIES[0]?.iconUrl || '');
    setEditingItem(null);
    setError(null);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(t('rdMaterial.invalid_image_type', 'Vui lòng chọn file hình ảnh (PNG, JPG, SVG, WebP).'));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError(t('rdMaterial.img_upload_err_size', 'Kích thước ảnh quá lớn (tối đa 2MB).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setIconUrl(base64);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('rdMaterial.missing_prop_name', 'Vui lòng nhập tên tính năng (Special Property).'));
      return;
    }

    if (!iconUrl) {
      setError(t('rdMaterial.missing_prop_icon', 'Vui lòng chọn hoặc tải lên ảnh icon cho tính năng này.'));
      return;
    }

    try {
      if (editingItem) {
        specialPropertyService.update(editingItem.id, {
          name: trimmedName,
          iconUrl
        });
        setSuccessMsg(t('rdMaterial.prop_updated_success', 'Đã cập nhật thuộc tính thành công!'));
      } else {
        specialPropertyService.add({
          name: trimmedName,
          iconUrl
        });
        setSuccessMsg(t('rdMaterial.prop_added_success', 'Đã thêm thuộc tính mới thành công!'));
      }
      loadProperties();
      resetForm();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Lỗi khi lưu thuộc tính.');
    }
  };

  const handleStartEdit = (prop: SpecialPropertyItem) => {
    setEditingItem(prop);
    setName(prop.name);
    setIconUrl(prop.iconUrl);
    setError(null);
  };

  const handleDelete = (id: string, propName: string) => {
    if (window.confirm(t('rdMaterial.confirm_delete_prop', { name: propName, defaultValue: `Bạn có chắc chắn muốn xóa tính năng "${propName}"?` }))) {
      const ok = specialPropertyService.remove(id);
      if (ok) {
        loadProperties();
        if (editingItem?.id === id) {
          resetForm();
        }
      }
    }
  };

  const defaultCount = useMemo(() => properties.filter(p => p.isDefault).length, [properties]);
  const customCount = useMemo(() => properties.filter(p => !p.isDefault).length, [properties]);

  const filteredProperties = useMemo(() => {
    if (!searchTerm.trim()) return properties;
    const term = searchTerm.toLowerCase();
    return properties.filter(p => p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term));
  }, [properties, searchTerm]);

  return (
    <Box sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {showCloseButton && onClose && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* 2-Column Responsive Layout: Left = Add/Edit Form & Tips, Right = Current Properties Table */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '380px 1fr' },
          gap: 2.5,
          alignItems: 'start',
          flexGrow: 1,
          minHeight: 0
        }}
      >
        {/* Left Column: Form Card + Guide Notes */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              bgcolor: '#f8fafc',
              borderRadius: 2.5,
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="#0f172a" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {editingItem ? `✏️ ${t('common.edit', 'Cập nhật tính năng')}` : `➕ ${t('rdMaterial.labelPrint.sp_dialog_add', 'Thêm tính năng đặc biệt mới')}`}
            </Typography>

            {/* Icon Preview / Upload Area */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 1.5, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Avatar
                src={iconUrl}
                variant="rounded"
                sx={{
                  width: 54,
                  height: 54,
                  bgcolor: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  p: 0.5,
                  flexShrink: 0,
                  '& img': { objectFit: 'contain' }
                }}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CloudUploadIcon sx={{ fontSize: 16 }} />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ fontSize: 12, textTransform: 'none', px: 1.5, py: 0.5, whiteSpace: 'nowrap', fontWeight: 600 }}
                >
                  {t('rdMaterial.labelPrint.sp_dialog_icon', 'Chọn ảnh icon')}
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  PNG, SVG, JPG, WebP (≤2MB)
                </Typography>
              </Box>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleImageFileChange}
              />
            </Box>

            {/* Property Name Input */}
            <TextField
              fullWidth
              size="small"
              label={t('rdMaterial.labelPrint.sp_dialog_name', 'Tên tính năng (Special Property Name)')}
              placeholder="VD: Water repellent, Quick Dry..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
              sx={{ mb: 2.25, bgcolor: '#ffffff' }}
            />

            {/* Quick preset icon picker */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                {t('rdMaterial.or_choose_preset', 'Hoặc chọn nhanh từ mẫu icon sẵn có:')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(6, 1fr)' }, gap: 1 }}>
                {DEFAULT_SPECIAL_PROPERTIES.map((def) => (
                  <Tooltip key={def.id} title={def.name}>
                    <Box
                      onClick={() => {
                        setIconUrl(def.iconUrl);
                        if (!name) setName(def.name);
                      }}
                      sx={{
                        p: 0.5,
                        border: iconUrl === def.iconUrl ? '2px solid #2e7d32' : '1px solid #cbd5e1',
                        borderRadius: 2,
                        cursor: 'pointer',
                        bgcolor: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 42,
                        transition: 'all 0.15s ease',
                        '&:hover': { borderColor: '#2e7d32', transform: 'scale(1.06)', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }
                      }}
                    >
                      <img src={def.iconUrl} alt={def.name} style={{ width: 26, height: 26, objectFit: 'contain' }} />
                    </Box>
                  </Tooltip>
                ))}
              </Box>
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {editingItem && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={resetForm}
                  sx={{ textTransform: 'none', flex: 1, fontWeight: 600, py: 0.8 }}
                >
                  {t('rdMaterial.labelPrint.sp_dialog_cancel', 'Hủy')}
                </Button>
              )}
              <Button
                fullWidth={!editingItem}
                size="small"
                variant="contained"
                startIcon={editingItem ? <EditIcon sx={{ fontSize: 16 }} /> : <AddIcon sx={{ fontSize: 16 }} />}
                onClick={handleSave}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 0.85,
                  bgcolor: '#2e7d32',
                  '&:hover': { bgcolor: '#1b5e20' }
                }}
              >
                {editingItem ? t('rdMaterial.labelPrint.sp_dialog_save', 'Lưu thay đổi') : t('rdMaterial.add', 'Thêm vào danh sách')}
              </Button>
            </Box>
          </Paper>

          {/* Print Tips & Sync Hint Card */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: '#ffffff',
              borderRadius: 2.5,
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LightbulbOutlinedIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={700} color="#0f172a" fontSize="0.825rem">
                {t('rdMaterial.print_tips_title', 'Lưu ý in thẻ mẫu')}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
              {t('rdMaterial.print_tips_desc', 'Thẻ Garment Sample Tag hiển thị đẹp và cân đối nhất khi chọn từ 1 đến 4 tính năng đặc biệt.')}
            </Typography>

            <Box sx={{ p: 1.25, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <SyncIcon sx={{ color: '#16a34a', fontSize: 16, mt: '2px', flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: '#166534', fontSize: '0.725rem', lineHeight: 1.4, fontWeight: 500 }}>
                {t('rdMaterial.sp_sync_hint', 'Các thuộc tính ở đây tự động đồng bộ tức thì với trang in thẻ Garment Sample Tag.')}
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Right Column: Existing Properties Table Card */}
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2.5,
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            bgcolor: '#ffffff',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header with Search and Summary Badges */}
          <Box
            sx={{
              px: 2.5,
              py: 1.75,
              bgcolor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
              <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
                {t('rdMaterial.current_properties', 'Danh sách thuộc tính')}
              </Typography>
              <Chip
                size="small"
                label={t('rdMaterial.total_props', { count: properties.length, defaultValue: `Tổng: ${properties.length}` })}
                sx={{ bgcolor: '#e2e8f0', color: '#1e293b', fontWeight: 600, fontSize: '0.725rem', height: 24 }}
              />
              <Chip
                size="small"
                label={t('rdMaterial.default_props', { count: defaultCount, defaultValue: `Mặc định: ${defaultCount}` })}
                sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 500, fontSize: '0.725rem', height: 24 }}
              />
              {customCount > 0 && (
                <Chip
                  size="small"
                  label={t('rdMaterial.custom_props', { count: customCount, defaultValue: `Tùy chỉnh: ${customCount}` })}
                  sx={{ bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 600, fontSize: '0.725rem', height: 24 }}
                />
              )}
            </Box>

            {/* Quick Search in properties */}
            <TextField
              size="small"
              placeholder={t('rdMaterial.search_props', 'Tìm kiếm thuộc tính...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ fontSize: 18, color: '#94a3b8', mr: 0.75 }} />,
                endAdornment: searchTerm ? (
                  <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ p: 0.25 }}>
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                ) : null
              }}
              sx={{
                width: { xs: '100%', sm: 240 },
                bgcolor: '#ffffff',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  fontSize: '0.8rem',
                  height: 34
                }
              }}
            />
          </Box>

          <TableContainer>
            <Table size="medium">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f8fafc', fontSize: '0.8rem', py: 1.5 } }}>
                  <TableCell width={56} align="center">Icon</TableCell>
                  <TableCell>{t('rdMaterial.property_name', 'Tên thuộc tính (Property Name)')}</TableCell>
                  <TableCell width={160} sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{t('rdMaterial.col_prop_id', 'Mã định danh')}</TableCell>
                  <TableCell width={160} align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>{t('rdMaterial.col_prop_preview', 'Xem trước trên thẻ')}</TableCell>
                  <TableCell width={120} align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{t('rdMaterial.category', 'Phân loại')}</TableCell>
                  <TableCell width={120} align="center" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{t('rdMaterial.col_prop_status', 'Trạng thái')}</TableCell>
                  <TableCell width={90} align="right">{t('common.actions', 'Thao tác')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProperties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      <Typography variant="body2">
                        {searchTerm ? t('common.no_results', 'Không tìm thấy thuộc tính phù hợp') : t('common.no_data', 'Chưa có dữ liệu')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProperties.map((prop) => {
                    const isSelected = selectedId === prop.id;
                    const cleanId = prop.id.replace(/^prop-/, '');
                    return (
                      <TableRow
                        key={prop.id}
                        hover
                        sx={{
                          bgcolor: isSelected ? '#f0fdf4' : 'inherit',
                          '&:hover': { bgcolor: '#f8fafc' },
                          '& td': { py: 1.25 }
                        }}
                      >
                        <TableCell align="center">
                          <Avatar
                            src={prop.iconUrl}
                            variant="rounded"
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: '#ffffff',
                              border: '1.5px solid #e2e8f0',
                              p: 0.35,
                              mx: 'auto',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                              '& img': { objectFit: 'contain' }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="#0f172a" sx={{ fontSize: '0.85rem' }}>
                            {prop.name}
                          </Typography>
                          {/* Mobile-only Category & ID display */}
                          <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', gap: 0.75, mt: 0.5, flexWrap: 'wrap' }}>
                            <Chip
                              size="small"
                              label={prop.isDefault ? t('rdMaterial.default', 'Mặc định') : t('rdMaterial.custom', 'Tùy chỉnh')}
                              sx={{
                                bgcolor: prop.isDefault ? '#f1f5f9' : '#dbeafe',
                                color: prop.isDefault ? '#475569' : '#1d4ed8',
                                fontWeight: 600,
                                fontSize: '0.65rem',
                                height: 20
                              }}
                            />
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#64748b', fontSize: '0.7rem' }}>
                              #{cleanId}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontFamily: 'monospace',
                              bgcolor: '#f1f5f9',
                              color: '#475569',
                              px: 1,
                              py: 0.4,
                              borderRadius: 1,
                              fontWeight: 600,
                              fontSize: '0.75rem'
                            }}
                          >
                            {cleanId}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          {/* Mini Sample Tag Preview Badge */}
                          <Box
                            sx={{
                              display: 'inline-flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              p: '4px 8px',
                              borderRadius: 1.5,
                              border: '1px dashed #cbd5e1',
                              bgcolor: '#fafafa',
                              minWidth: 90
                            }}
                          >
                            <img src={prop.iconUrl} alt={prop.name} style={{ width: 22, height: 22, objectFit: 'contain' }} />
                            <Typography
                              sx={{
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                color: '#1e293b',
                                textTransform: 'uppercase',
                                lineHeight: 1.1,
                                mt: 0.25,
                                textAlign: 'center'
                              }}
                            >
                              {prop.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          {prop.isDefault ? (
                            <Chip
                              size="small"
                              label={t('rdMaterial.default', 'Mặc định')}
                              sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '0.725rem', height: 24 }}
                            />
                          ) : (
                            <Chip
                              size="small"
                              label={t('rdMaterial.custom', 'Tùy chỉnh')}
                              sx={{ bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 600, fontSize: '0.725rem', height: 24 }}
                            />
                          )}
                        </TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                          <Chip
                            size="small"
                            icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />}
                            label={t('rdMaterial.status_active', 'Sẵn sàng in')}
                            sx={{ bgcolor: '#f0fdf4', color: '#166534', fontWeight: 600, fontSize: '0.725rem', height: 24 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            {onSelect && (
                              <Tooltip title={t('common.select', 'Chọn thuộc tính này')}>
                                <IconButton
                                  size="small"
                                  color={isSelected ? 'success' : 'default'}
                                  onClick={() => {
                                    onSelect(prop);
                                    if (onClose) onClose();
                                  }}
                                >
                                  <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title={t('common.edit', 'Chỉnh sửa')}>
                              <IconButton
                                size="small"
                                onClick={() => handleStartEdit(prop)}
                                sx={{
                                  color: '#0284c7',
                                  bgcolor: 'rgba(2, 132, 199, 0.08)',
                                  '&:hover': { bgcolor: 'rgba(2, 132, 199, 0.16)' }
                                }}
                              >
                                <EditIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                            {!prop.isDefault && (
                              <Tooltip title={t('common.delete', 'Xóa')}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(prop.id, prop.name)}
                                  sx={{
                                    color: '#dc2626',
                                    bgcolor: 'rgba(220, 38, 38, 0.08)',
                                    '&:hover': { bgcolor: 'rgba(220, 38, 38, 0.16)' }
                                  }}
                                >
                                  <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Table Footer / Status Bar */}
          <Box
            sx={{
              px: 2.5,
              py: 1.25,
              bgcolor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              {t('rdMaterial.showing_props_count', { count: filteredProperties.length, total: properties.length, defaultValue: `Hiển thị ${filteredProperties.length} trên ${properties.length} thuộc tính` })}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <SyncIcon sx={{ fontSize: 14, color: '#16a34a' }} />
              <Typography variant="caption" color="#166534" fontWeight={500}>
                {t('rdMaterial.footer_sync_note', 'Đồng bộ tự động với hệ thống in thẻ Garment Sample Tag')}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default SpecialPropertyManager;
