import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Button, 
  Drawer, 
  IconButton, 
  InputAdornment,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Tooltip,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Add as AddIcon, 
  Send as SendIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
  LocalShipping as LocalShippingIcon,
  Home as HomeIcon,
  People as PeopleIcon,
  Hotel as BedIcon,
  History as HistoryIcon,
  Assessment as ReportIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useToast, AppTextField, HeaderActions } from '@traxeco/shared';

import ImportMedicineForm from '../components/warehouse/ImportMedicineForm';
import SendToFactoryForm from '../components/warehouse/SendToFactoryForm';
import { clinicApi } from '../api/clinicApi';
import { useNavigate } from 'react-router-dom';
import { WarehouseStock, FactoryStock } from '../types/warehouse';
import { useEffect } from 'react';

export default function WarehousePage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [warehouseStock, setWarehouseStock] = useState<WarehouseStock[]>([]);
  const [factoryStock, setFactoryStock] = useState<FactoryStock[]>([]);
  
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [factorySearch, setFactorySearch] = useState('');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Tải dữ liệu thật từ Backend Java
  const loadData = async () => {
    setLoading(true);
    try {
      const [whRes, facRes] = await Promise.all([
        clinicApi.getWarehouseStock(),
        clinicApi.getFactoryStock()
      ]);
      
      // Ánh xạ tồn kho chính (factory = MAIN)
      const mappedWh: WarehouseStock[] = whRes.map(item => ({
        no: item.stockId,
        idMed: String(item.medicineId),
        nameMed: item.medicineName || `Thuốc ID ${item.medicineId}`,
        qty: item.quantity, // Đặt bằng tồn kho hiện tại hoặc lấy từ lịch sử nhập
        qtyIssue: item.quantity,
        idSup: item.supplierName || 'NCC',
        manuDate: item.mfgDate ? item.mfgDate.split('T')[0] : '',
        expDate: item.expDate ? item.expDate.split('T')[0] : ''
      }));

      // Ánh xạ tồn kho phân xưởng (F1, F2, F3, F4)
      const mappedFac: FactoryStock[] = facRes.map(item => ({
        no: item.stockId,
        recNo: item.stockId, // Liên kết lô stock
        idMed: String(item.medicineId),
        nameMed: item.medicineName || `Thuốc ID ${item.medicineId}`,
        factory: item.factory,
        qty: item.quantity,
        qtyIssue: item.quantity
      }));

      setWarehouseStock(mappedWh);
      setFactoryStock(mappedFac);
    } catch (e) {
      showToast(t('clinic.warehouse.loadFailed', 'Không thể kết nối API tải dữ liệu kho thuốc!'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleImport = async (dataList: any | any[]) => {
    const list = Array.isArray(dataList) ? dataList : [dataList];
    setLoading(true);
    try {
      for (const data of list) {
        await clinicApi.importMedicine({
          medicineId: parseInt(data.idMed),
          supplierId: data.idSup ? parseInt(data.idSup) : null,
          quantity: data.qty,
          buyPrice: 0.0,
          mfgDate: data.manuDate || null,
          expDate: data.expDate || null,
          remark: "Nhập kho chính"
        });
      }
      setIsImportModalOpen(false);
      showToast(t('clinic.warehouse.importSuccess', 'Nhập kho các lô thuốc thành công!'), 'success');
      loadData(); // Tải lại dữ liệu thật
    } catch (e: any) {
      showToast(e.message || 'Nhập kho thất bại!', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToFactory = async (dataList: any | any[]) => {
    const list = Array.isArray(dataList) ? dataList : [dataList];
    setLoading(true);
    try {
      for (const data of list) {
        await clinicApi.transferToFactory({
          medicineId: parseInt(data.idMed),
          factory: data.factory.replace('Xưởng ', ''), // Convert 'Xưởng F1' -> 'F1'
          quantity: data.qty
        });
      }
      setIsSendModalOpen(false);
      showToast(t('clinic.warehouse.sendSuccess', 'Điều chuyển các lô thuốc xuống phân xưởng thành công!'), 'success');
      loadData(); // Tải lại dữ liệu thật
    } catch (e: any) {
      showToast(e.message || 'Điều chuyển thất bại!', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWarehouseLot = async (no: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa lô tồn kho chính này?")) return;
    setLoading(true);
    try {
      await clinicApi.deleteWarehouseStock(no);
      showToast(t('clinic.warehouse.deleteLotSuccess', 'Đã xóa lô hàng nhập kho.'), 'info');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Xóa thất bại!', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFactoryLot = async (no: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy lô điều chuyển và hoàn trả thuốc về kho tổng?")) return;
    setLoading(true);
    try {
      await clinicApi.deleteFactoryStock(no);
      showToast(t('clinic.warehouse.deleteTransSuccess', 'Đã hủy lô chuyển thuốc xuống xưởng.'), 'info');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Xóa thất bại!', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Lọc dữ liệu tìm kiếm
  const filteredWarehouse = warehouseStock.filter(item => 
    item.nameMed.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
    item.idMed.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
    item.idSup.toLowerCase().includes(warehouseSearch.toLowerCase())
  );

  const filteredFactory = factoryStock.filter(item => 
    item.nameMed.toLowerCase().includes(factorySearch.toLowerCase()) ||
    item.idMed.toLowerCase().includes(factorySearch.toLowerCase()) ||
    item.factory.toLowerCase().includes(factorySearch.toLowerCase())
  );

  return (
    <Box
      sx={{
        flexGrow: 1,
        width: '100%',
        height: '100%',
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: '#f4f6f8',
        fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
      }}
    >
      {/* ─── GOOGLE FONTS & STYLES ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;750;800&family=Outfit:wght@500;600;700;800;900&display=swap');
        .MuiTypography-root, .MuiButton-root, .MuiInputBase-root, .MuiTableCell-root, .MuiChip-root {
          font-family: 'Inter', 'Outfit', sans-serif !important;
        }
      `}</style>

      {/* ─── MAIN CONTENT CONTAINER (Split 2 Columns) ─── */}
      <Box
        sx={{
          flexGrow: 1,
          p: 0.5,
          pt: 1,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          minHeight: 0,
          gap: 1,
          height: "100%",
          overflow: "hidden"
        }}
      >
        {/* ─── CỘT TRÁI: 1. KHO TỔNG (WAREHOUSE STOCK) ─── */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            borderRadius: "16px",
            border: "1px solid #cbd5e1",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
            bgcolor: "#ffffff"
          }}
        >
          {/* Header Cột Trái */}
          <Box sx={{ p: 2.5, borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#f8fafc", flexShrink: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <InventoryIcon sx={{ color: "#15803d", fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a", fontSize: 14.5, fontFamily: "'Outfit' !important", letterSpacing: "0.2px" }}>
                1. TỒN KHO TỔNG (MAIN WAREHOUSE)
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsImportModalOpen(true)}
              sx={{
                bgcolor: "#15803d",
                color: "#ffffff",
                borderRadius: "8px",
                textTransform: "none",
                fontWeight: 750,
                fontSize: 12.5,
                px: 2,
                py: 0.75,
                boxShadow: "0 2px 6px rgba(27,94,32,0.15)",
                "&:hover": { bgcolor: "#166534" }
              }}
            >
              Nhập thuốc mới
            </Button>
          </Box>

          {/* Tìm kiếm nhanh */}
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
            <AppTextField
              placeholder="Tìm nhanh thuốc trong kho tổng..."
              value={warehouseSearch}
              onDebounceChange={(val) => setWarehouseSearch(val)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94a3b8", fontSize: 18 }} />
                  </InputAdornment>
                )
              }}
              sx={{
                width: "100%",
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  bgcolor: "#f8fafc",
                  fontSize: 13,
                  "& fieldset": { borderColor: "#cbd5e1" }
                }
              }}
            />
          </Box>

          {/* Bảng Kho Tổng */}
          <Box sx={{ flexGrow: 1, overflowY: "auto", overflowX: "auto", minHeight: 0 }}>
            {filteredWarehouse.length === 0 ? (
              <Box sx={{ p: 8, textAlign: "center", color: "#94a3b8" }}>
                <Typography variant="body2" sx={{ fontStyle: "italic", fontSize: 13.5 }}>
                  Không tìm thấy thuốc nào trong kho tổng.
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: '100%', minWidth: 620 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: "#f8fafc", color: "#475569", fontWeight: 800, fontSize: 11.5, py: 1.5 }}>Lô số</TableCell>
                      <TableCell sx={{ bgcolor: "#f8fafc", color: "#475569", fontWeight: 800, fontSize: 11.5, py: 1.5 }}>Tên thuốc</TableCell>
                      <TableCell sx={{ bgcolor: "#f8fafc", color: "#475569", fontWeight: 800, fontSize: 11.5, py: 1.5, textAlign: "center" }}>SL Nhập</TableCell>
                      <TableCell sx={{ bgcolor: "#f8fafc", color: "#475569", fontWeight: 800, fontSize: 11.5, py: 1.5, textAlign: "center" }}>Tồn kho</TableCell>
                      <TableCell sx={{ bgcolor: "#f8fafc", color: "#475569", fontWeight: 800, fontSize: 11.5, py: 1.5 }}>Nhà CC</TableCell>
                      <TableCell sx={{ bgcolor: "#f8fafc", color: "#475569", fontWeight: 800, fontSize: 11.5, py: 1.5, textAlign: "center" }}>HSD</TableCell>
                      <TableCell sx={{ bgcolor: "#f8fafc", color: "#475569", fontWeight: 800, fontSize: 11.5, py: 1.5, textAlign: "center" }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredWarehouse.map((item) => (
                      <TableRow key={item.no} hover>
                        <TableCell sx={{ fontSize: 12.5, fontWeight: 700, color: "#1e293b" }}>#{item.no}</TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 750, color: "#0f172a" }}>{item.nameMed}</Typography>
                          <Typography sx={{ fontSize: 11, color: "#64748b" }}>{item.idMed}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: 12.5, fontWeight: 600, color: "#475569", textAlign: "center" }}>{item.qty}</TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          <Chip 
                            label={item.qtyIssue} 
                            size="small" 
                            sx={{ 
                              height: 22, 
                              fontSize: 12, 
                              fontWeight: 800, 
                              bgcolor: item.qtyIssue > 0 ? "#e8f5e9" : "#fee2e2", 
                              color: item.qtyIssue > 0 ? "#15803d" : "#ef4444",
                              borderRadius: "6px"
                            }} 
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12.5, color: "#475569" }}>{item.idSup}</TableCell>
                        <TableCell sx={{ fontSize: 12.5, color: "#475569", textAlign: "center" }}>{item.expDate}</TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          <Tooltip title="Xóa lô hàng">
                            <IconButton 
                              onClick={() => handleDeleteWarehouseLot(item.no)}
                              size="small"
                              sx={{ color: "#ef4444", "&:hover": { bgcolor: "#fee2e2" } }}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Paper>

        {/* ─── CỘT PHẢI: 2. PHÂN CHIA XƯỞNG (WORKSHOPS) ─── */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            borderRadius: "16px",
            border: "1px solid #cbd5e1",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
            bgcolor: "#ffffff"
          }}
        >
          {/* Header Cột Phải */}
          <Box sx={{ p: 2.5, borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#f8fafc", flexShrink: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <LocalShippingIcon sx={{ color: "#15803d", fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a", fontSize: 14.5, fontFamily: "'Outfit' !important", letterSpacing: "0.2px" }}>
                2. PHÂN CHIA XƯỞNG (FACTORIES)
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={() => setIsSendModalOpen(true)}
              sx={{
                bgcolor: "#15803d",
                color: "#ffffff",
                borderRadius: "8px",
                textTransform: "none",
                fontWeight: 750,
                fontSize: 12.5,
                px: 2,
                py: 0.75,
                boxShadow: "0 2px 6px rgba(27,94,32,0.15)",
                "&:hover": { bgcolor: "#166534" }
              }}
            >
              Phân chia xưởng
            </Button>
          </Box>

          {/* Tìm kiếm nhanh */}
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
            <AppTextField
              placeholder="Tìm nhanh thuốc đã phân chia xưởng..."
              value={factorySearch}
              onDebounceChange={(val) => setFactorySearch(val)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94a3b8", fontSize: 18 }} />
                  </InputAdornment>
                )
              }}
              sx={{
                width: "100%",
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  bgcolor: "#f8fafc",
                  fontSize: 13,
                  "& fieldset": { borderColor: "#cbd5e1" }
                }
              }}
            />
          </Box>

          {/* Bảng Phân Chia Xưởng */}
          <Box sx={{ flexGrow: 1, overflowY: "auto", overflowX: "auto", minHeight: 0 }}>
            {filteredFactory.length === 0 ? (
              <Box sx={{ p: 8, textAlign: "center", color: "#94a3b8" }}>
                <Typography variant="body2" sx={{ fontStyle: "italic", fontSize: 13.5 }}>
                  Chưa thực hiện điều chuyển thuốc xuống xưởng nào.
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: '100%', minWidth: 620 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: "#f8fafc", color: "#475569", fontWeight: 800, fontSize: 11.5, py: 1.5 }}>Mã chuyển</TableCell>
                      <TableCell sx={{ bgcolor: "#f8fafc", color: "#475569", fontWeight: 800, fontSize: 11.5, py: 1.5 }}>Tên thuốc</TableCell>
                      <TableCell sx={{ bgcolor: "#f8fafc", color: "#475569", fontWeight: 800, fontSize: 11.5, py: 1.5, textAlign: "center" }}>Nhà máy</TableCell>
                      <TableCell sx={{ bgcolor: "#f8fafc", color: "#475569", fontWeight: 800, fontSize: 11.5, py: 1.5, textAlign: "center" }}>SL Nhận</TableCell>
                      <TableCell sx={{ bgcolor: "#f8fafc", color: "#475569", fontWeight: 800, fontSize: 11.5, py: 1.5, textAlign: "center" }}>Còn lại</TableCell>
                      <TableCell sx={{ bgcolor: "#f8fafc", color: "#475569", fontWeight: 800, fontSize: 11.5, py: 1.5, textAlign: "center" }}>Lô nguồn</TableCell>
                      <TableCell sx={{ bgcolor: "#f8fafc", color: "#475569", fontWeight: 800, fontSize: 11.5, py: 1.5, textAlign: "center" }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredFactory.map((item) => (
                      <TableRow key={item.no} hover>
                        <TableCell sx={{ fontSize: 12.5, fontWeight: 700, color: "#1e293b" }}>#{item.no}</TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 750, color: "#0f172a" }}>{item.nameMed}</Typography>
                          <Typography sx={{ fontSize: 11, color: "#64748b" }}>{item.idMed}</Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          <Chip 
                            label={item.factory} 
                            size="small" 
                            sx={{ 
                              height: 22, 
                              fontSize: 11, 
                              fontWeight: 800, 
                              bgcolor: "#f3e5f5", 
                              color: "#7b1fa2",
                              borderRadius: "6px"
                            }} 
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12.5, fontWeight: 600, color: "#475569", textAlign: "center" }}>{item.qty}</TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          <Chip 
                            label={item.qtyIssue} 
                            size="small" 
                            sx={{ 
                              height: 22, 
                              fontSize: 12, 
                              fontWeight: 800, 
                              bgcolor: item.qtyIssue > 0 ? "#e8f5e9" : "#fee2e2", 
                              color: item.qtyIssue > 0 ? "#15803d" : "#ef4444",
                              borderRadius: "6px"
                            }} 
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12.5, color: "#475569", textAlign: "center" }}>#{item.recNo}</TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          <Tooltip title="Hủy lô điều chuyển">
                            <IconButton 
                              onClick={() => handleDeleteFactoryLot(item.no)}
                              size="small"
                              sx={{ color: "#ef4444", "&:hover": { bgcolor: "#fee2e2" } }}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Paper>
      </Box>

      {/* ─── SIDE DRAWER: NHẬP THUỐC MỚI ─── */}
      <Drawer 
        anchor="right"
        open={isImportModalOpen} 
        onClose={(_, reason) => {
          if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
            setIsImportModalOpen(false);
          }
        }}
        sx={{ zIndex: 9999 }}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 1000 }, backgroundColor: '#ffffff' }
        }}
      >
        <Box sx={{ m: 0, p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit' !important" }}>
            Nhập kho dược phẩm mới
          </Typography>
          <IconButton onClick={() => setIsImportModalOpen(false)} sx={{ color: '#64748b' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ p: 2.5, flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 75px)' }}>
          <ImportMedicineForm onImport={handleImport} />
        </Box>
      </Drawer>

      {/* ─── SIDE DRAWER: ĐIỀU CHUYỂN XUỐNG XƯỞNG ─── */}
      <Drawer 
        anchor="right"
        open={isSendModalOpen} 
        onClose={(_, reason) => {
          if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
            setIsSendModalOpen(false);
          }
        }}
        sx={{ zIndex: 9999 }}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 1000 }, backgroundColor: '#ffffff' }
        }}
      >
        <Box sx={{ m: 0, p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit' !important" }}>
            Phân chia thuốc xuống phân xưởng
          </Typography>
          <IconButton onClick={() => setIsSendModalOpen(false)} sx={{ color: '#64748b' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ p: 2.5, flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 75px)' }}>
          <SendToFactoryForm 
            warehouseStock={warehouseStock} 
            onSendToFactory={handleSendToFactory} 
          />
        </Box>
      </Drawer>
    </Box>
  );
}
