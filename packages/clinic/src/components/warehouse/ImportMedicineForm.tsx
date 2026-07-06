import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Box, 
  Grid, 
  Autocomplete, 
  TextField, 
  Button, 
  Typography,
  Card,
  CardActionArea,
  IconButton,
  Chip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tooltip
} from '@mui/material';
import { 
  AddCircle as AddIcon,
  Search as SearchIcon,
  AddCircleOutline as PlusCircleIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Queue as QueueIcon,
  CheckCircle as CheckIcon,
  LocalPharmacy as PharmacyIcon,
  InfoOutlined as InfoIcon,
  ShoppingBagOutlined as BagIcon,
  Add as PlusIcon
} from '@mui/icons-material';

import { Supplier } from '../../types/warehouse';
import { Medicine, MedicineGroup } from '../../components/medicine/MedicineSelector';
import { clinicApi } from '../../api/clinicApi';
import { useEffect } from 'react';

interface ImportMedicineFormProps {
  onImport: (data: any) => void;
}

export default function ImportMedicineForm({ onImport }: ImportMedicineFormProps) {
  const { t } = useTranslation();

  // Active form inputs (for the current medicine lot being configured)
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [qty, setQty] = useState<number>(100);
  const [manuDate, setManuDate] = useState<string>('');
  const [expDate, setExpDate] = useState<string>('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroupId, setActiveGroupId] = useState('ALL');

  // Dynamic Medicine List Catalog State
  const [medicineList, setMedicineList] = useState<Medicine[]>([]);

  // Dynamic Supplier Catalog State
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);

  // Dynamic Medicine Groups
  const [medicineGroups, setMedicineGroups] = useState<MedicineGroup[]>([
    { idGroup: 'ALL', nameGroup: 'Tất cả' }
  ]);

  // Queued Imports List State
  const [queuedImports, setQueuedImports] = useState<any[]>([]);

  // Dialog State for adding new catalog medicine
  const [openAddMed, setOpenAddMed] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedUnit, setNewMedUnit] = useState('Viên');
  const [newMedGroupId, setNewMedGroupId] = useState('');

  // Dialog State for adding new supplier
  const [openAddSup, setOpenAddSup] = useState(false);
  const [newSupName, setNewSupName] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupAddress, setNewSupAddress] = useState('');

  // Tải dữ liệu thật từ Backend
  useEffect(() => {
    const loadCatalogData = async () => {
      try {
        const [medsRes, supsRes, groupsRes] = await Promise.all([
          clinicApi.getMedicines("MAIN"), // Kho tổng
          clinicApi.getSuppliers(),
          clinicApi.getMedicineGroups()
        ]);

        const mappedMeds: Medicine[] = medsRes.map(m => ({
          idMed: m.idMed,
          nameMed: m.nameMed,
          idGroup: m.idGroup,
          unit: m.unit,
          balance: m.balance
        }));

        const mappedSups: Supplier[] = supsRes.map(s => ({
          idSup: String(s.supplierId),
          nameSup: s.supplierName,
          address: s.address,
          phone: s.phone,
          email: s.email
        }));

        const mappedGroups: MedicineGroup[] = [
          { idGroup: 'ALL', nameGroup: 'Tất cả' },
          ...groupsRes.map(g => ({
            idGroup: g.idGroup,
            nameGroup: g.nameGroup
          }))
        ];

        setMedicineList(mappedMeds);
        setSupplierList(mappedSups);
        setMedicineGroups(mappedGroups);
        if (mappedGroups.length > 1) {
          setNewMedGroupId(mappedGroups[1].idGroup);
        }
      } catch (error) {
        console.error("Lỗi tải danh mục:", error);
      }
    };
    loadCatalogData();
  }, []);

  // Filter medicines
  const filteredMedicines = useMemo(() => {
    return medicineList.filter(med => {
      const matchGroup = activeGroupId === 'ALL' || med.idGroup === activeGroupId;
      const matchSearch = med.nameMed.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGroup && matchSearch;
    });
  }, [searchQuery, activeGroupId, medicineList]);

  // Add configured lot to the Queue
  const handleAddToQueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier || !medicine || qty <= 0) return;

    const newImport = {
      idKey: Date.now() + Math.random().toString(),
      idMed: medicine.idMed,
      nameMed: medicine.nameMed,
      idGroup: medicine.idGroup,
      qty,
      idSup: supplier.idSup,
      nameSup: supplier.nameSup,
      manuDate: manuDate || new Date().toISOString().split('T')[0],
      expDate: expDate || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
    };

    setQueuedImports(prev => [...prev, newImport]);

    // Clear active medicine selection for the next input, keep supplier for convenience
    setMedicine(null);
    setQty(100);
    setManuDate('');
    setExpDate('');
  };

  // Submit all queued imports
  const handleConfirmAllImports = () => {
    if (queuedImports.length === 0) return;
    onImport(queuedImports);
    setQueuedImports([]); // clear queue
  };

  const handleAddNewMedicine = () => {
    if (!newMedName.trim() || !newMedUnit.trim()) return;

    const newMed: Medicine = {
      idMed: 'NEW_' + Date.now(),
      nameMed: newMedName.trim().toUpperCase(),
      idGroup: newMedGroupId,
      unit: newMedUnit.trim(),
      balance: 0
    };

    setMedicineList(prev => [...prev, newMed]);
    setMedicine(newMed); // Auto select the new medicine

    // Clear dialog state
    setNewMedName('');
    setNewMedUnit('Viên');
    setNewMedGroupId('MG001');
    setOpenAddMed(false);
  };

  const handleAddNewSupplier = () => {
    if (!newSupName.trim()) return;

    const newSup: Supplier = {
      idSup: 'SUP_NEW_' + Date.now(),
      nameSup: newSupName.trim(),
      address: newSupAddress.trim() || 'N/A',
      phone: newSupPhone.trim() || 'N/A',
      email: 'N/A'
    };

    setSupplierList(prev => [...prev, newSup]);
    setSupplier(newSup); // Auto select the new supplier

    // Clear dialog state
    setNewSupName('');
    setNewSupPhone('');
    setNewSupAddress('');
    setOpenAddSup(false);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      overflow: 'hidden',
      fontFamily: "'Outfit', sans-serif !important",
      '& *': { fontFamily: "'Outfit', sans-serif !important" }
    }}>
      <Grid container spacing={2.5} sx={{ height: '100%', minHeight: 0 }}>
        
        {/* CỘT 1: LỌC VÀ CHỌN THUỐC */}
        <Grid size={{ xs: 12, md: 4.25 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid #f1f5f9', pr: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px', mb: 1.5 }}>
            1. Tìm & Chọn Thuốc
          </Typography>

          {/* Tìm kiếm nhanh thuốc + Nút Thêm mới */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Gõ tên thuốc tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: '8px' }
              }}
            />
             <Tooltip title="Tạo danh mục thuốc mới" arrow>
               <IconButton
                 onClick={() => setOpenAddMed(true)}
                 sx={{
                   flexShrink: 0,
                   bgcolor: '#e8f5e9',
                   color: '#15803d',
                   borderRadius: '50%',
                   width: 38,
                   height: 38,
                   '&:hover': {
                     bgcolor: '#c8e6c9',
                   }
                 }}
               >
                 <PlusIcon sx={{ fontSize: 20 }} />
               </IconButton>
             </Tooltip>
          </Box>

          {/* Pills nhóm thuốc */}
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 0.75, 
              overflowX: 'auto', 
              pb: 1,
              mb: 1.5,
              '&::-webkit-scrollbar': { display: 'none' },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              flexShrink: 0
            }}
          >
            {medicineGroups.map(group => {
              const isActive = activeGroupId === group.idGroup;
              return (
                <Chip
                  key={group.idGroup}
                  label={group.nameGroup}
                  onClick={() => setActiveGroupId(group.idGroup)}
                  sx={{
                    fontWeight: 700,
                    fontSize: 12,
                    px: 0.5,
                    height: 28,
                    borderRadius: '6px',
                    bgcolor: isActive ? '#15803d' : '#f1f5f9',
                    color: isActive ? '#ffffff' : '#475569',
                    border: 'none',
                    '&:hover': {
                      bgcolor: isActive ? '#166534' : '#e2e8f0',
                    }
                  }}
                />
              );
            })}
          </Box>

          {/* Danh sách thẻ thuốc - vertical scrollable */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 0.5, mb: 1 }}>
            <Grid container spacing={1}>
              {filteredMedicines.map(med => {
                const isSelected = medicine?.idMed === med.idMed;
                return (
                  <Grid size={12} key={med.idMed}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: '8px',
                        borderWidth: isSelected ? '2px' : '1px',
                        borderColor: isSelected ? '#15803d' : '#e2e8f0',
                        boxShadow: isSelected ? '0 4px 10px rgba(27,94,32,0.05)' : 'none',
                        bgcolor: isSelected ? 'rgba(27,94,32,0.01)' : '#ffffff',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          borderColor: isSelected ? '#15803d' : '#cbd5e1',
                          bgcolor: isSelected ? 'rgba(27,94,32,0.02)' : '#f8fafc'
                        }
                      }}
                    >
                      <CardActionArea onClick={() => setMedicine(med)} sx={{ p: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '6px', bgcolor: isSelected ? '#15803d' : '#f1f5f9', color: isSelected ? '#fff' : '#475569' }}>
                            <PharmacyIcon sx={{ fontSize: 18 }} />
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: 12.5, textTransform: 'uppercase' }}>
                              {med.nameMed}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                              Đơn vị: {med.unit}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Chip
                            label={`Tồn: ${med.balance}`}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: 10,
                              fontWeight: 700,
                              bgcolor: isSelected ? '#e8f5e9' : '#f1f5f9',
                              color: isSelected ? '#15803d' : '#475569',
                              borderRadius: '4px'
                            }}
                          />
                          <PlusCircleIcon sx={{ fontSize: 18, color: isSelected ? '#15803d' : '#94a3b8' }} />
                        </Box>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
              {filteredMedicines.length === 0 && (
                <Grid size={12}>
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1.5 }}>
                      Không tìm thấy thuốc
                    </Typography>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => setOpenAddMed(true)}
                      sx={{ textTransform: 'none', fontWeight: 700, borderColor: '#15803d', color: '#15803d', borderRadius: '8px' }}
                    >
                      + Tạo danh mục thuốc mới
                    </Button>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        </Grid>

        {/* CỘT 2: THÔNG TIN LÔ HÀNG */}
        <Grid size={{ xs: 12, md: 3.75 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid #f1f5f9', pr: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px', mb: 1.5 }}>
            2. Điền Lô Hàng
          </Typography>

          <Box component="form" onSubmit={handleAddToQueue} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25, flexGrow: 1 }}>
              {/* Thuốc đã chọn - header-like indicator */}
              {medicine ? (
                <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'rgba(27,94,32,0.06)', border: '1px solid #15803d', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckIcon sx={{ color: '#15803d', fontSize: 18 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 800, display: 'block', lineHeight: 1 }}>ĐÃ CHỌN THUỐC</Typography>
                    <Typography sx={{ fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', fontSize: 13, mt: 0.25 }}>
                      {medicine.nameMed}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ p: 2, borderRadius: '8px', bgcolor: '#f8fafc', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, py: 3 }}>
                  <InfoIcon sx={{ color: '#94a3b8', fontSize: 24 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', fontSize: 12, lineHeight: 1.4 }}>
                    Chưa chọn thuốc.<br />Vui lòng click vào một thẻ thuốc ở Cột 1.
                  </Typography>
                </Box>
              )}

              {/* Nhà cung cấp + Thêm mới */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Autocomplete
                  fullWidth
                  options={supplierList}
                  getOptionLabel={(option) => option.nameSup}
                  value={supplier}
                  onChange={(_, newValue) => setSupplier(newValue)}
                  renderInput={(params) => (
                    <TextField {...params} size="small" label="Nhà cung cấp" required sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
                  )}
                />
                <Tooltip title="Thêm nhà cung cấp mới" arrow>
                  <IconButton
                    onClick={() => setOpenAddSup(true)}
                    sx={{
                      flexShrink: 0,
                      bgcolor: '#e8f5e9',
                      color: '#15803d',
                      borderRadius: '50%',
                      width: 38,
                      height: 38,
                      '&:hover': {
                        bgcolor: '#c8e6c9',
                      }
                    }}
                  >
                    <PlusIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Số lượng */}
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Số lượng nhập"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 0))}
                required
                disabled={!medicine}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              />

              {/* Ngày sản xuất */}
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Ngày sản xuất"
                InputLabelProps={{ shrink: true }}
                value={manuDate}
                onChange={(e) => setManuDate(e.target.value)}
                disabled={!medicine}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              />

              {/* Hạn sử dụng */}
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Hạn sử dụng"
                InputLabelProps={{ shrink: true }}
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                disabled={!medicine}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              />
            </Box>

            {/* Nút thêm vào hàng chờ */}
            <Button
              variant="contained"
              type="submit"
              fullWidth
              startIcon={<QueueIcon />}
              disabled={!supplier || !medicine}
              sx={{
                bgcolor: '#2563eb',
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 800,
                fontSize: 13.5,
                py: 1.25,
                mt: 2,
                boxShadow: '0 4px 12px rgba(37,99,235,0.15)',
                '&:hover': { bgcolor: '#1d4ed8' },
                '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8', boxShadow: 'none' }
              }}
            >
              Thêm vào danh sách chờ
            </Button>
          </Box>
        </Grid>

        {/* CỘT 3: TỔNG HỢP DANH SÁCH CHỜ NHẬP KHO */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px' }}>
              3. Hàng Chờ Nhập ({queuedImports.length})
            </Typography>
            {queuedImports.length > 0 && (
              <Button 
                onClick={() => setQueuedImports([])} 
                size="small" 
                color="error" 
                sx={{ textTransform: 'none', fontSize: 11, fontWeight: 700 }}
              >
                Xóa hết
              </Button>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, height: '100%', overflow: 'hidden' }}>
            {/* Hàng chờ hiển thị danh sách */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', bgcolor: '#f8fafc', p: 1.5 }}>
              {queuedImports.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 8, gap: 1.5 }}>
                  <BagIcon sx={{ color: '#cbd5e1', fontSize: 40 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', fontSize: 12.5, px: 2, lineHeight: 1.4 }}>
                    Hàng chờ trống.<br />Thêm các lô thuốc cần nhập kho vào đây trước khi nhấn Xác nhận.
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {queuedImports.map((item, index) => (
                    <React.Fragment key={item.idKey}>
                      <ListItem
                        secondaryAction={
                          <IconButton edge="end" size="small" onClick={() => setQueuedImports(prev => prev.filter(q => q.idKey !== item.idKey))} sx={{ color: '#ef4444' }}>
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        }
                        sx={{ px: 0.5, py: 1 }}
                      >
                        <ListItemText
                          primary={
                            <Typography sx={{ fontWeight: 800, fontSize: 12.5, color: '#0f172a', textTransform: 'uppercase' }}>
                              {item.nameMed}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" component="span" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontSize: 11, lineHeight: 1.4 }}>
                              SL: <b>{item.qty}</b> • HSD: <b>{item.expDate}</b> <br />
                              NCC: {item.nameSup}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < queuedImports.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>

            {/* Nút gửi bulk import */}
            <Button
              variant="contained"
              onClick={handleConfirmAllImports}
              disabled={queuedImports.length === 0}
              startIcon={<CheckIcon />}
              fullWidth
              sx={{
                bgcolor: '#15803d',
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 800,
                fontSize: 14,
                py: 1.25,
                mt: 2,
                boxShadow: '0 4px 12px rgba(27,94,32,0.15)',
                '&:hover': { bgcolor: '#166534' },
                '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8', boxShadow: 'none' }
              }}
            >
              Xác nhận nhập kho ({queuedImports.length} lô)
            </Button>
          </Box>
        </Grid>

      </Grid>

      {/* ─── NESTED DIALOG: THÊM DANH MỤC THUỐC MỚI ─── */}
      <Dialog 
        open={openAddMed} 
        onClose={() => setOpenAddMed(false)}
        maxWidth="xs"
        fullWidth
        sx={{ zIndex: 10000 }}
        PaperProps={{
          sx: { borderRadius: '12px', p: 1 }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit' !important" }}>
            Tạo danh mục thuốc mới
          </Typography>
          <IconButton onClick={() => setOpenAddMed(false)} sx={{ color: '#94a3b8' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            fullWidth
            size="small"
            label="Tên thuốc mới"
            placeholder="Ví dụ: PANADOL EXTRA 500MG"
            value={newMedName}
            onChange={(e) => setNewMedName(e.target.value)}
            required
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />

          <TextField
            fullWidth
            size="small"
            label="Đơn vị tính"
            placeholder="Ví dụ: Viên, Chai, Ống, Tuýp..."
            value={newMedUnit}
            onChange={(e) => setNewMedUnit(e.target.value)}
            required
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />

          <FormControl fullWidth size="small">
            <InputLabel id="new-med-group-label">Nhóm thuốc</InputLabel>
            <Select
              labelId="new-med-group-label"
              value={newMedGroupId}
              label="Nhóm thuốc"
              onChange={(e) => setNewMedGroupId(e.target.value)}
              sx={{ borderRadius: '8px' }}
              MenuProps={{
                sx: { zIndex: 11000 }
              }}
            >
              {MOCK_GROUPS.filter(g => g.idGroup !== 'ALL').map(g => (
                <MenuItem key={g.idGroup} value={g.idGroup}>
                  {g.nameGroup}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setOpenAddMed(false)} 
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', color: '#64748b' }}
          >
            Hủy bỏ
          </Button>
          <Button
            variant="contained"
            onClick={handleAddNewMedicine}
            disabled={!newMedName.trim() || !newMedUnit.trim()}
            sx={{
              bgcolor: '#15803d',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 800,
              px: 3,
              '&:hover': { bgcolor: '#166534' },
              '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' }
            }}
          >
            Tạo mới
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── NESTED DIALOG: THÊM NHÀ CUNG CẤP MỚI ─── */}
      <Dialog 
        open={openAddSup} 
        onClose={() => setOpenAddSup(false)}
        maxWidth="xs"
        fullWidth
        sx={{ zIndex: 10000 }}
        PaperProps={{
          sx: { borderRadius: '12px', p: 1 }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit' !important" }}>
            Tạo nhà cung cấp mới
          </Typography>
          <IconButton onClick={() => setOpenAddSup(false)} sx={{ color: '#94a3b8' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            fullWidth
            size="small"
            label="Tên nhà cung cấp"
            placeholder="Ví dụ: Công ty Dược phẩm Minh Dân"
            value={newSupName}
            onChange={(e) => setNewSupName(e.target.value)}
            required
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />

          <TextField
            fullWidth
            size="small"
            label="Số điện thoại"
            placeholder="Ví dụ: 0912 345 678"
            value={newSupPhone}
            onChange={(e) => setNewSupPhone(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />

          <TextField
            fullWidth
            size="small"
            label="Địa chỉ"
            placeholder="Ví dụ: Quận 1, TP. Hồ Chí Minh"
            value={newSupAddress}
            onChange={(e) => setNewSupAddress(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setOpenAddSup(false)} 
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', color: '#64748b' }}
          >
            Hủy bỏ
          </Button>
          <Button
            variant="contained"
            onClick={handleAddNewSupplier}
            disabled={!newSupName.trim()}
            sx={{
              bgcolor: '#15803d',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 800,
              px: 3,
              '&:hover': { bgcolor: '#166534' },
              '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' }
            }}
          >
            Tạo mới
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
