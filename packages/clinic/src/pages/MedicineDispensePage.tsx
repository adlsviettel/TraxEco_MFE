import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Avatar,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  CardActionArea,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  ClickAwayListener,
  useTheme,
  useMediaQuery,
  InputAdornment,
  Backdrop,
} from "@mui/material";
import {
  Person as PersonIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Lock as LockIcon,
  AddCircleOutline as PlusCircleIcon,
  InfoOutlined as InfoIcon,
  MedicalServices as MedicalIcon,
  Home as HomeIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  Hotel as BedIcon,
  History as HistoryIcon,
  Assessment as ReportIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useToast, HeaderActions } from "@traxeco/shared";
import { clinicApi, ClinicEmployee, ClinicMedicine, ClinicMedicineGroup, ClinicSickness, ClinicDispenseHistory, ClinicDispenseRequest } from "../api/clinicApi";
import { useNavigate } from "react-router-dom";

interface PrescriptionItem {
  medicine: ClinicMedicine;
  qty: number;
  instruction: string; // Hướng dẫn dùng
}

export default function MedicineDispensePage() {
  const { showToast } = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();

  // ─── STATE QUẢN LÝ DỮ LIỆU TỪ API ───
  const [sicknesses, setSicknesses] = useState<ClinicSickness[]>([]);
  const [medicineGroups, setMedicineGroups] = useState<ClinicMedicineGroup[]>([]);
  const [medicines, setMedicines] = useState<ClinicMedicine[]>([]);

  // ─── STATE QUẢN LÝ BỆNH NHÂN ───
  const [searchId, setSearchId] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<ClinicEmployee | null>(null);

  // Lịch sử cấp phát của nhân viên được chọn
  const [openHistoryModal, setOpenHistoryModal] = useState(false);
  const [employeeHistory, setEmployeeHistory] = useState<ClinicDispenseHistory[]>([]);

  // ─── STATE CHẨN ĐOÁN & CHỌN THUỐC ───
  const [selectedSickness, setSelectedSickness] = useState<ClinicSickness | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editVisitCode, setEditVisitCode] = useState("");
  const [localSearchQuery, setLocalSearchQuery] = useState(""); // Ô tìm kiếm cục bộ (hết lag gõ phím)
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroupId, setActiveGroupId] = useState("ALL");
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [deleteTargetCode, setDeleteTargetCode] = useState("");

  // Debounce tìm kiếm thuốc 150ms để ngăn re-render dồn dập khi gõ phím
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(localSearchQuery);
    }, 150);
    return () => clearTimeout(handler);
  }, [localSearchQuery]);

  // ─── STATE TOA THUỐC ───
  const [prescription, setPrescription] = useState<PrescriptionItem[]>([]);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // ─── STATE LỊCH SỬ CHUNG ───
  const [historyRecords, setHistoryRecords] = useState<ClinicDispenseHistory[]>([]);

  // ─── DRAG TO SCROLL CHO NHÓM THUỐC ───
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
    scrollRef.current.style.cursor = "grabbing";
    scrollRef.current.style.userSelect = "none";
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = "pointer";
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = "pointer";
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5; // Tăng tốc độ cuộn
    scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  // ─── FETCH INITIAL DATA ───
  useEffect(() => {
    const initData = async () => {
      try {
        const userFactory = localStorage.getItem("factory") || "F2";
        const [sicknessRes, groupsRes, medicinesRes, historyRes] = await Promise.all([
          clinicApi.getSickness(),
          clinicApi.getMedicineGroups(),
          clinicApi.getMedicines(userFactory),
          clinicApi.getHistory(userFactory, 100),
        ]);
        setSicknesses(sicknessRes);
        setMedicineGroups(groupsRes);
        setMedicines(medicinesRes);
        setHistoryRecords(historyRes);
      } catch (error) {
        showToast("Lỗi khi tải dữ liệu từ server!", "error");
      }
    };
    initData();
  }, []);

  // ─── NGHIỆP VỤ TÌM KIẾM NHÂN VIÊN ───
  const handleSearchChange = (val: string) => {
    setSearchId(val);
  };

  const performSearch = async (cleanId: string) => {
    if (!cleanId) return;

    setLoadingSearch(true);
    try {
      const emp = await clinicApi.searchEmployee(cleanId);
      if (emp) {
        // Luôn query thuốc và số dư theo xưởng hiện hành của user đang thao tác thay vì cpcode của nhân viên
        const userFactory = localStorage.getItem("factory") || "F2";
        const freshMedicines = await clinicApi.getMedicines(userFactory);
        
        // Then set both states so UI updates together
        setMedicines(freshMedicines);
        setSelectedEmployee(emp);
        showToast("Tìm thấy thông tin nhân viên!", "success");
      } else {
        showToast("Không tìm thấy nhân viên!", "error");
      }
    } catch (error) {
      showToast("Lỗi khi tìm kiếm nhân viên hoặc không tìm thấy!", "error");
    } finally {
      // Thêm timeout 400ms đệm để trình duyệt hoàn tất render card thuốc lên màn hình trước khi đóng backdrop mờ
      setTimeout(() => {
        setLoadingSearch(false);
      }, 400);
    }
  };

  const handleClearEmployee = () => {
    if (prescription.length > 0) {
      setOpenCancelDialog(true);
    } else {
      performClearEmployee();
    }
  };

  const performClearEmployee = () => {
    setSearchId("");
    setSelectedEmployee(null);
    setPrescription([]);
    setSelectedSickness(null);
    setOpenCancelDialog(false);
  };

  const handleViewEmployeeHistory = async () => {
    if (!selectedEmployee) return;
    setLoadingHistory(true); // Sử dụng state loadingHistory riêng
    try {
      const factory = localStorage.getItem("factory") || "F2";
      const history = await clinicApi.getHistory(factory, 100, selectedEmployee.globalId);
      setEmployeeHistory(history);
      setOpenHistoryModal(true);
    } catch (error) {
      showToast("Lỗi khi tải lịch sử phát thuốc!", "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  // ─── LỌC DANH SÁCH THUỐC ───
  const filteredMedicines = useMemo(() => {
    return medicines
      .filter((med) => {
        const matchGroup = activeGroupId === "ALL" || med.idGroup === activeGroupId;
        const matchSearch = med.nameMed.toLowerCase().includes(searchQuery.toLowerCase());
        return matchGroup && matchSearch;
      })
      .sort((a, b) => {
        // Sắp xếp: còn hàng (balance > 0) lên trên, hết hàng (balance = 0) xuống dưới
        const aAvailable = a.balance > 0 ? 1 : 0;
        const bAvailable = b.balance > 0 ? 1 : 0;
        if (aAvailable !== bAvailable) {
          return bAvailable - aAvailable; // bAvailable=1, aAvailable=0 => trả về 1 (b lên trước)
        }
        // Nếu cùng còn hàng hoặc cùng hết hàng, giữ nguyên alphabet theo tên
        return a.nameMed.localeCompare(b.nameMed);
      });
  }, [medicines, searchQuery, activeGroupId]);

  // ─── THÊM / CẬP NHẬT TOA THUỐC ───
  const handleAddMedicine = (med: ClinicMedicine) => {
    if (med.balance <= 0) return;
    setPrescription((prev) => {
      const existingIdx = prev.findIndex((item) => item.medicine.idMed === med.idMed);
      if (existingIdx > -1) {
        const newQty = prev[existingIdx].qty + 1;
        if (newQty > med.balance) {
          showToast("Số lượng vượt quá tồn kho!", "error");
          return prev;
        }
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], qty: newQty };
        return updated;
      }
      return [...prev, { medicine: med, qty: 1, instruction: "Hướng dẫn dùng" }];
    });
  };

  const handleQtyChange = (medId: string, newQty: number) => {
    setPrescription((prev) =>
      prev.map((item) => {
        if (item.medicine.idMed === medId) {
          if (newQty > item.medicine.balance) {
            showToast("Số lượng vượt quá tồn kho!", "error");
            return item;
          }
          return { ...item, qty: newQty };
        }
        return item;
      })
    );
  };

  const handleInstructionChange = (medId: string, text: string) => {
    setPrescription((prev) =>
      prev.map((item) => {
        if (item.medicine.idMed === medId) {
          return { ...item, instruction: text };
        }
        return item;
      })
    );
  };

  const handleRemoveMedicine = (medId: string) => {
    setPrescription((prev) => prev.filter((item) => item.medicine.idMed !== medId));
  };

  // ─── XÁC NHẬN PHÁT THUỐC ───
  const handleConfirmSubmit = async () => {
    if (!selectedEmployee) return;
    setSaving(true);
    try {
      const payload: ClinicDispenseRequest = {
        employeeCode: selectedEmployee.globalId,
        idSick: selectedSickness?.idSick || "",
        type: "MED",
        factory: localStorage.getItem("factory") || "F2", // Sử dụng xưởng đăng nhập của user để trừ kho cho đúng
        items: prescription.map((item) => ({
          idMed: item.medicine.idMed,
          qty: item.qty,
        })),
      };

      if (isEditMode) {
        await clinicApi.updateDispense(editVisitCode, payload);
        showToast("Cập nhật toa thuốc thành công!", "success");
      } else {
        await clinicApi.submitDispense(payload);
        showToast("Cấp phát thuốc thành công!", "success");
      }
      
      setPrescription([]);
      setSelectedSickness(null);
      setSelectedEmployee(null);
      setSearchId("");
      setOpenConfirmDialog(false);
      setIsEditMode(false);
      setEditVisitCode("");

      // Refresh medicines
      const factory = selectedEmployee.factory || "F2";
      const freshMedicines = await clinicApi.getMedicines(factory);
      setMedicines(freshMedicines);
    } catch (error: any) {
      showToast(error?.message || "Cấp phát thuốc thất bại!", "error");
    } finally {
      setSaving(false);
    }
  };

  // ─── XỬ LÝ SỬA / XÓA LỊCH SỬ PHÁT THUỐC ───
  const handleDeleteDispense = (visitCode: string) => {
    setDeleteTargetCode(visitCode);
    setOpenDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetCode) return;
    setSaving(true);
    try {
      await clinicApi.deleteDispense(deleteTargetCode);
      showToast("Xóa lịch sử phát thuốc thành công!", "success");
      
      // Tải lại lịch sử và tồn kho
      const userFactory = localStorage.getItem("factory") || "F2";
      const freshMedicines = await clinicApi.getMedicines(userFactory);
      setMedicines(freshMedicines);
      
      if (selectedEmployee) {
        const history = await clinicApi.getHistory(userFactory, 100, selectedEmployee.globalId);
        setEmployeeHistory(history);
      }
    } catch (error: any) {
      showToast(error?.message || "Xóa lịch sử thất bại!", "error");
    } finally {
      setSaving(false);
      setOpenDeleteConfirm(false);
      setDeleteTargetCode("");
    }
  };

  const handleStartEditDispense = (record: ClinicDispenseHistory) => {
    // 1. Nạp chẩn đoán bệnh
    const sick = sicknesses.find((s) => s.idSick === record.idSick) || null;
    setSelectedSickness(sick);

    // 2. Chuyển đổi chi tiết thuốc đã cấp của record sang prescription
    const items: PrescriptionItem[] = record.medicines.map((m) => {
      // Tìm thông tin thuốc trong danh sách gốc để lấy đơn vị tính và tồn kho
      const originMed = medicines.find((med) => med.idMed === m.idMed);
      const medicineObj: ClinicMedicine = originMed || {
        idMed: m.idMed,
        nameMed: m.nameMed,
        idGroup: "",
        unit: "Viên",
        packageType: "",
        balance: m.qty, // Fallback tồn kho tạm thời bằng chính qty
      };
      
      // Ở chế độ edit, balance thực tế khi sửa thuốc phải cộng thêm lượng đã phát cũ (vì khi submit backend sẽ rollback kho)
      if (originMed) {
        medicineObj.balance = originMed.balance + m.qty;
      }

      return {
        medicine: medicineObj,
        qty: m.qty,
        instruction: "Hướng dẫn dùng",
      };
    });

    setPrescription(items);
    setIsEditMode(true);
    setEditVisitCode(record.code);
    setOpenHistoryModal(false); // Đóng modal lịch sử để sửa ngoài trang chủ
    showToast("Đã nạp toa thuốc cũ vào form. Hãy chỉnh sửa và bấm 'PHÁT THUỐC' để cập nhật lại!", "info");
  };

  // Tính tiền (Giữ lại logic cũ phòng trường hợp mở rộng)
  const totalAmount = useMemo(() => {
    return prescription.reduce((acc, item) => acc + 0 * item.qty, 0);
  }, [prescription]);

  const vatAmount = totalAmount * 0.03; // Giả lập VAT 3%
  const grandTotal = totalAmount + vatAmount;

  // Nhóm lọc thuốc (thêm "Tất cả" ở đầu nếu backend không trả về)
  const groupsWithAll = useMemo(() => {
    return [
      { idGroup: "ALL", nameGroup: "Tất cả", typeGroup: "MED" },
      ...medicineGroups,
    ];
  }, [medicineGroups]);

  return (
    <Box
      sx={{
        flexGrow: 1,
        width: "100%",
        height: "100%",
        minHeight: 0,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: "#f4f6f8", // Nền xám mát sang trọng hơn
        fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
      }}
    >
      {/* ─── DYNAMICALLY IMPORT GOOGLE FONTS FOR ULTRA-PREMIUM LOOK ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;750;800&family=Outfit:wght@500;600;700;800;900&display=swap');
        
        /* Apply custom font globally to MUI components rendering inside this scope */
        .MuiTypography-root, .MuiButton-root, .MuiInputBase-root, .MuiTableCell-root, .MuiChip-root {
          font-family: 'Inter', 'Outfit', sans-serif !important;
        }
      `}</style>

      {/* ─── MAIN CONTENT WORKSPACE ─── */}
      <Box
        sx={{
          flexGrow: 1,
          p: 0.5,
          pt: 1,
          pb: 2,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          gap: 1,
          height: "100%",
          overflowY: "auto",
        }}
      >
        {/* ─── BƯỚC 1: THÔNG TIN BỆNH NHÂN (Premium Horizontal Row) ─── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2.5,
            width: "100%",
            flexShrink: 0,
          }}
        >
          {/* Ô Tìm kiếm mã nhân viên (Đã tách component con cô lập state gõ phím - hết lag 100%) */}
          <Box sx={{ position: "relative", width: 270 }}>
            <EmployeeSearchInput
              value={searchId}
              onSearch={(val) => {
                setSearchId(val);
                // Giả lập event
                const e = { preventDefault: () => {} } as React.FormEvent;
                // Gọi searchId cục bộ
                setTimeout(() => {
                  performSearch(val);
                }, 10);
              }}
              onClear={handleClearEmployee}
              loading={loadingSearch}
              hasSelectedEmployee={!!selectedEmployee}
            />
          </Box>

          {/* Hộp hiển thị chi tiết nhân viên y hệt thiết kế */}
          <Box
            sx={{
              flexGrow: 1,
              border: "1px solid #cbd5e1",
              borderRadius: "12px",
              p: 1,
              px: 2.5,
              minHeight: 48,
              height: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: "#ffffff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            }}
          >
            {selectedEmployee ? (
              <>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar sx={{ bgcolor: "#e8f5e9", width: 32, height: 32 }}>
                    <PersonIcon sx={{ color: "#2e7d32", fontSize: 18 }} />
                  </Avatar>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: "#0f172a", fontSize: 14.5 }}>
                        {selectedEmployee.fullname}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b", fontSize: 12.5, fontWeight: 700 }}>
                        {selectedEmployee.globalId}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: "#64748b", fontSize: 12, fontWeight: 500 }}>
                      Ngày sinh: {selectedEmployee.dob ? (() => {
                        try {
                          const dateObj = new Date(selectedEmployee.dob);
                          if (isNaN(dateObj.getTime())) return selectedEmployee.dob;
                          const day = String(dateObj.getDate()).padStart(2, '0');
                          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                          const year = dateObj.getFullYear();
                          return `${day}/${month}/${year}`;
                        } catch (e) {
                          return selectedEmployee.dob;
                        }
                      })() : ""} • Giới tính: {selectedEmployee.gender} • Bộ phận: {selectedEmployee.department}
                    </Typography>
                  </Box>
                </Box>

                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleViewEmployeeHistory}
                  sx={{
                    textTransform: "none",
                    borderColor: "#15803d",
                    color: "#15803d",
                    fontWeight: 750,
                    borderRadius: "8px",
                    fontSize: 12,
                    height: 30,
                    px: 2,
                    borderWidth: "1.5px",
                    transition: "all 0.2s",
                    "&:hover": { borderColor: "#166534", bgcolor: "#f0fdf4", borderWidth: "1.5px" },
                  }}
                >
                  Xem lịch sử
                </Button>
              </>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#64748b" }}>
                <InfoIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                <Typography variant="body2" sx={{ fontStyle: "italic", fontSize: 13.5, fontWeight: 500 }}>
                  Nhập mã bệnh nhân ở cột trái để bắt đầu cấp phát thuốc.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* ─── MỤC 2 & 3: COLUMNS CONTAINER (Bố cục 2 cột chính) ─── */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: 3.5,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* CỘT TRÁI (60% width): 2. Chẩn đoán & Chọn thuốc */}
          <Box
            sx={{
              width: isMobile ? "100%" : "60%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            <Card
              elevation={0}
              sx={{
                borderRadius: "16px",
                border: "1px solid #cbd5e1",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
              }}
            >
              {/* Header Card 2 */}
              <Box
                sx={{
                  bgcolor: "#ffffff",
                  py: 2,
                  px: 3,
                  borderBottom: "1px solid #e2e8f0",
                  flexShrink: 0,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a", fontSize: 15, fontFamily: "'Outfit' !important", letterSpacing: "0.2px" }}>
                  2. CHẨN ĐOÁN & CHỌN THUỐC
                </Typography>
              </Box>

              {/* Nội dung Card 2 */}
              <CardContent
                sx={{
                  p: 0,
                  pb: "0 !important",
                  bgcolor: "#ffffff",
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <Box sx={{ p: 3, borderBottom: "1px solid #e2e8f0", flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  {/* Select Chẩn đoán */}
                  <Autocomplete
                    fullWidth
                    options={sicknesses}
                    getOptionLabel={(option) => option.nameSick}
                    value={selectedSickness}
                    onChange={(_, newValue) => setSelectedSickness(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Chẩn đoán select"
                        variant="outlined"
                        size="small"
                        sx={{
                          "& .MuiOutlinedInput-root": { 
                            borderRadius: "10px",
                            bgcolor: "#f8fafc",
                            "& fieldset": { borderColor: "#cbd5e1" },
                            "&:hover fieldset": { borderColor: "#94a3b8" },
                            "&.Mui-focused fieldset": { borderColor: "#15803d", borderWidth: "2px" },
                          },
                        }}
                      />
                    )}
                  />

                  {/* Tìm kiếm nhanh thuốc */}
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Tìm kiếm nhanh thuốc..."
                    value={localSearchQuery}
                    onChange={(e) => setLocalSearchQuery(e.target.value)}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "10px",
                        bgcolor: "#f8fafc",
                        "& fieldset": { borderColor: "#cbd5e1" },
                        "&:hover fieldset": { borderColor: "#94a3b8" },
                        "&.Mui-focused fieldset": { borderColor: "#15803d", borderWidth: "2px" },
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: "#94a3b8", fontSize: 18 }} />
                        </InputAdornment>
                      ),
                      endAdornment: localSearchQuery && (
                        <InputAdornment position="end">
                          <Button size="small" onClick={() => { setLocalSearchQuery(""); setSearchQuery(""); }} sx={{ minWidth: 0, p: 0, color: "#94a3b8" }}>✕</Button>
                        </InputAdornment>
                      )
                    }}
                  />

                   {/* Nhóm lọc thuốc (Chips y hệt mockup) */}
                  <Box
                    ref={scrollRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    sx={{
                      display: "flex",
                      gap: 1.5,
                      overflowX: "auto",
                      pb: 0.5,
                      cursor: "pointer",
                      "&::-webkit-scrollbar": { height: 4 },
                      "&::-webkit-scrollbar-thumb": { backgroundColor: "#cbd5e1", borderRadius: 2 },
                    }}
                  >
                    {groupsWithAll.map((group) => (
                      <Chip
                        key={group.idGroup}
                        label={group.nameGroup}
                        onClick={() => setActiveGroupId(group.idGroup)}
                        sx={{
                          fontWeight: 750,
                          fontSize: 13,
                          height: 32,
                          borderRadius: "8px",
                          px: 2,
                          bgcolor: activeGroupId === group.idGroup ? "#15803d" : "#f1f5f9",
                          color: activeGroupId === group.idGroup ? "#ffffff" : "#475569",
                          boxShadow: activeGroupId === group.idGroup ? "0 4px 10px rgba(27,94,32,0.2)" : "none",
                          transition: "all 0.2s",
                          "&:hover": { bgcolor: activeGroupId === group.idGroup ? "#166534" : "#e2e8f0" },
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Grid 3 cột thuốc theo mockup */}
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    p: 3,
                    bgcolor: "#f8fafc",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gridAutoRows: "min-content",
                    gap: 2.5,
                    alignContent: "start",
                    "&::-webkit-scrollbar": { width: 6 },
                    "&::-webkit-scrollbar-thumb": { backgroundColor: "#cbd5e1", borderRadius: 3 },
                  }}
                >
                  {filteredMedicines.map((med) => {
                    const isOutOfStock = med.balance <= 0;
                    return (
                      <Card
                        key={med.idMed}
                        elevation={0}
                        sx={{
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          bgcolor: isOutOfStock ? "#fef2f2" : "#ffffff",
                          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.015)",
                          display: "flex",
                          flexDirection: "column",
                          minHeight: 125,
                          "&:hover": {
                            borderColor: isOutOfStock ? "#fecaca" : "#15803d",
                            boxShadow: isOutOfStock ? "none" : "0 8px 24px rgba(0,0,0,0.06)",
                            transform: isOutOfStock ? "none" : "translateY(-3px)",
                          },
                        }}
                      >
                        <CardActionArea
                          onClick={() => handleAddMedicine(med)}
                          disabled={isOutOfStock}
                          sx={{ p: 2, flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "space-between" }}
                        >
                          <Box sx={{ width: "100%" }}>
                            <Typography variant="subtitle2" fontWeight={800} color="#1e293b" sx={{ fontSize: 14, mb: 0.5, letterSpacing: "-0.2px" }} noWrap>
                              {med.nameMed}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2, fontSize: 12 }}>
                              {med.unit}
                            </Typography>
                          </Box>

                          <Box sx={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "flex-end" }}>
                            <Box>
                              {isOutOfStock ? (
                                <Typography variant="caption" fontWeight={800} color="#ef4444" sx={{ fontSize: 11.5, bgcolor: "#fee2e2", px: 1, py: 0.25, borderRadius: "4px" }}>
                                  Hết hàng
                                </Typography>
                              ) : (
                                <Typography variant="caption" fontWeight={750} color="#15803d" sx={{ fontSize: 12, bgcolor: "#e8f5e9", px: 1, py: 0.25, borderRadius: "4px" }}>
                                  Tồn kho: {med.balance}
                                </Typography>
                              )}
                            </Box>
                            {!isOutOfStock && (
                              <PlusCircleIcon sx={{ color: "#15803d", fontSize: 24, transition: "transform 0.2s", "&:hover": { transform: "scale(1.15)" } }} />
                            )}
                          </Box>
                        </CardActionArea>
                      </Card>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>

            {/* Locked screen overlay khi chưa chọn bệnh nhân */}
            {!selectedEmployee && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  bgcolor: "rgba(255, 255, 255, 0.75)",
                  backdropFilter: "blur(12px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                  borderRadius: "16px",
                  transition: "all 0.3s",
                }}
              >
                <Box
                  sx={{
                    bgcolor: "#ffffff",
                    p: 4.5,
                    borderRadius: "20px",
                    boxShadow: "0 20px 40px -15px rgba(0,0,0,0.1), 0 15px 25px -10px rgba(0,0,0,0.05)",
                    border: "1px solid #cbd5e1",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2.5,
                    maxWidth: 340,
                  }}
                >
                  <Avatar sx={{ bgcolor: "#fee2e2", color: "#ef4444", width: 56, height: 56, boxShadow: "0 4px 10px rgba(239,68,68,0.15)" }}>
                    <LockIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight={900} color="#0f172a" sx={{ fontFamily: "'Outfit' !important", letterSpacing: "0.2px" }}>
                    CHƯA CHỌN BỆNH NHÂN
                  </Typography>
                  <Typography variant="body2" color="#64748b" textAlign="center" sx={{ fontSize: 13, lineHeight: 1.6, fontWeight: 500 }}>
                    Vui lòng nhập và tìm kiếm mã nhân viên ở thanh phía trên trước để bắt đầu.
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* CỘT PHẢI (40% width): 3. TOA THUỐC ĐÃ CHỌN */}
          <Box sx={{ width: isMobile ? "100%" : "40%", height: "100%", display: "flex", flexDirection: "column" }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: "16px",
                border: "1px solid #cbd5e1",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
              }}
            >
              {/* Header Card 3 */}
              <Box
                sx={{
                  bgcolor: "#ffffff",
                  py: 2,
                  px: 3,
                  borderBottom: "1px solid #e2e8f0",
                  flexShrink: 0,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a", fontSize: 15, fontFamily: "'Outfit' !important", letterSpacing: "0.2px" }}>
                  3. TOA THUỐC ĐÃ CHỌN
                </Typography>
              </Box>

              {/* Nội dung Card 3 */}
              <CardContent
                sx={{
                  p: 0,
                  pb: "0 !important",
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  bgcolor: "#ffffff",
                  overflow: "hidden",
                }}
              >
                {/* Bảng toa thuốc cuộn nội bộ */}
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    "&::-webkit-scrollbar": { width: 5 },
                    "&::-webkit-scrollbar-thumb": { backgroundColor: "#cbd5e1", borderRadius: 2 },
                  }}
                >
                  {prescription.length === 0 ? (
                    <Box sx={{ p: 8, textAlign: "center", color: "#94a3b8", display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
                      <MedicalIcon sx={{ fontSize: 32, color: "#cbd5e1" }} />
                      <Typography variant="body2" sx={{ fontStyle: "italic", fontSize: 13.5, fontWeight: 500 }}>
                        Chưa chọn thuốc nào. Click thuốc bên trái để thêm vào toa.
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer component={Paper} elevation={0}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: "#f8fafc" }}>
                          <TableRow>
                            <TableCell sx={{ fontSize: 12, fontWeight: 800, color: "#475569", p: 1.75 }}>Tên thuốc</TableCell>
                            <TableCell sx={{ fontSize: 12, fontWeight: 800, color: "#475569", p: 1.75, textAlign: "center" }}>Số lượng</TableCell>
                            <TableCell sx={{ p: 1.75 }}></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {prescription.map((item) => (
                            <TableRow key={item.medicine.idMed} hover sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                              {/* Tên thuốc */}
                              <TableCell sx={{ fontSize: 13.5, fontWeight: 750, p: 1.75, color: "#0f172a" }}>
                                {item.medicine.nameMed}
                              </TableCell>
                              {/* Số lượng */}
                              <TableCell sx={{ p: 1, textAlign: "center" }}>
                                <Box sx={{ display: "inline-flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "8px", bgcolor: "#ffffff", overflow: "hidden" }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleQtyChange(item.medicine.idMed, item.qty - 1)}
                                    disabled={item.qty <= 1}
                                    sx={{ p: 0.5, borderRadius: 0 }}
                                  >
                                    <RemoveIcon sx={{ fontSize: 13 }} />
                                  </IconButton>
                                  <Typography sx={{ width: 26, textAlign: "center", fontWeight: 800, fontSize: 13.5 }}>
                                    {item.qty}
                                  </Typography>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleQtyChange(item.medicine.idMed, item.qty + 1)}
                                    disabled={item.qty >= item.medicine.balance}
                                    sx={{ p: 0.5, borderRadius: 0 }}
                                  >
                                    <AddIcon sx={{ fontSize: 13 }} />
                                  </IconButton>
                                </Box>
                              </TableCell>
                              {/* Xóa */}
                              <TableCell sx={{ p: 1 }}>
                                <IconButton
                                  onClick={() => handleRemoveMedicine(item.medicine.idMed)}
                                  size="small"
                                  sx={{ color: "#ef4444", "&:hover": { bgcolor: "#fee2e2" } }}
                                >
                                  <DeleteIcon sx={{ fontSize: 17 }} />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>

                {/* Footer chỉ còn nút xác nhận phát thuốc */}
                <Box sx={{ p: 3, borderTop: "1px solid #e2e8f0", bgcolor: "#ffffff", flexShrink: 0 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => setOpenConfirmDialog(true)}
                    disabled={prescription.length === 0 || !selectedEmployee}
                    sx={{
                      bgcolor: "#15803d",
                      borderRadius: "10px",
                      textTransform: "none",
                      fontWeight: 800,
                      fontSize: 15.5,
                      py: 1.5,
                      boxShadow: "0 4px 12px rgba(27,94,32,0.2)",
                      transition: "all 0.2s ease",
                      "&:hover": { bgcolor: "#166534", boxShadow: "0 6px 20px rgba(27,94,32,0.3)" },
                      "&.Mui-disabled": { bgcolor: "#e2e8f0", color: "#94a3b8", boxShadow: "none" },
                    }}
                  >
                    PHÁT THUỐC
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>

      {/* ─── POPUP XEM LỊCH SỬ BỆNH NHÂN ─── */}
      <Dialog
        open={openHistoryModal}
        onClose={() => setOpenHistoryModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16, fontFamily: "'Outfit' !important" }}>
          Lịch sử phát thuốc của {selectedEmployee?.fullname} ({selectedEmployee?.globalId})
        </DialogTitle>
        <DialogContent dividers>
          {employeeHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", textAlign: "center", py: 4 }}>
              Không có dữ liệu lịch sử phát thuốc trước đây.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead sx={{ bgcolor: "#f8fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Thời gian</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Chẩn đoán</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Thuốc đã cấp</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: "center" }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employeeHistory.map((h) => (
                  <TableRow key={h.code} hover>
                    <TableCell sx={{ fontSize: 12.5 }}>
                      {new Date(h.sysCreateDate).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5 }}>{h.sicknessName || "Không rõ bệnh"}</TableCell>
                    <TableCell sx={{ fontSize: 12.5, color: "#15803d", fontWeight: 800 }}>
                      {h.medicines.map((m) => `${m.nameMed} x ${m.qty}`).join(", ")}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5, textAlign: "center" }}>
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleStartEditDispense(h)}
                          title="Sửa toa thuốc"
                          sx={{ color: "#15803d", "&:hover": { bgcolor: "#e8f5e9" } }}
                        >
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteDispense(h.code)}
                          title="Xóa lượt phát này"
                          sx={{ "&:hover": { bgcolor: "#fee2e2" } }}
                        >
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenHistoryModal(false)} sx={{ fontWeight: 800, textTransform: "none", color: "#15803d" }}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── POPUP XÁC NHẬN PHÁT THUỐC ─── */}
      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
        PaperProps={{ sx: { borderRadius: "16px", width: "100%", maxWidth: 410 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16, pb: 1, fontFamily: "'Outfit' !important" }}>
          Xác nhận cấp phát thuốc
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2.5 }}>
          <Typography variant="body2" sx={{ mb: 2.5, color: "#475569", lineHeight: 1.6, fontSize: 13.5 }}>
            Bạn có chắc chắn muốn xác nhận phát toa thuốc này cho bệnh nhân{" "}
            <strong>{selectedEmployee?.fullname}</strong>?
          </Typography>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.25, fontWeight: 800, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.5px" }}>
            Chi tiết toa thuốc:
          </Typography>
          <Box sx={{ bgcolor: "#f8fafc", p: 2, borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            {prescription.map((item) => (
              <Box key={item.medicine.idMed} sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                <Typography variant="caption" fontWeight={750} color="#0f172a" sx={{ fontSize: 12.5 }}>
                  {item.medicine.nameMed}
                </Typography>
                <Typography variant="caption" fontWeight={850} color="#15803d" sx={{ fontSize: 12.5 }}>
                  x {item.qty} {item.medicine.unit}
                </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => setOpenConfirmDialog(false)}
            disabled={saving}
            sx={{ textTransform: "none", fontWeight: 750, borderRadius: "8px", flex: 1, height: 38, borderColor: "#cbd5e1", color: "#475569" }}
          >
            Hủy bỏ
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleConfirmSubmit}
            disabled={saving}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              borderRadius: "8px",
              flex: 1,
              height: 38,
              bgcolor: "#15803d",
              "&:hover": { bgcolor: "#166534" },
            }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : "Đồng ý phát"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── POPUP XÁC NHẬN HỦY/THAY ĐỔI BỆNH NHÂN KHI ĐÃ CÓ TOA THUỐC ─── */}
      <Dialog
        open={openCancelDialog}
        onClose={() => setOpenCancelDialog(false)}
        PaperProps={{ sx: { borderRadius: "16px", width: "100%", maxWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16, pb: 1, fontFamily: "'Outfit' !important" }}>
          Hủy bỏ toa thuốc hiện tại?
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2.5 }}>
          <Typography variant="body2" sx={{ color: "#475569", lineHeight: 1.5 }}>
            Toa thuốc hiện tại đang có thuốc được chọn. Nếu bạn thay đổi hoặc xóa thông tin bệnh nhân, toa thuốc này sẽ bị hủy bỏ toàn bộ. Bạn có chắc chắn muốn tiếp tục không?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => setOpenCancelDialog(false)}
            sx={{ textTransform: "none", fontWeight: 750, borderRadius: "8px", flex: 1, height: 36, borderColor: "#cbd5e1", color: "#475569" }}
          >
            Hủy bỏ
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={performClearEmployee}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              borderRadius: "8px",
              flex: 1,
              height: 36,
              bgcolor: "#d32f2f",
              "&:hover": { bgcolor: "#c62828" },
            }}
          >
            Đồng ý hủy
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── POPUP XÁC NHẬN XÓA LƯỢT CẤP PHÁT THUỐC ─── */}
      <Dialog
        open={openDeleteConfirm}
        onClose={() => setOpenDeleteConfirm(false)}
        PaperProps={{ sx: { borderRadius: "16px", width: "100%", maxWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16, pb: 1, fontFamily: "'Outfit' !important" }}>
          Xác nhận xóa lịch sử phát thuốc?
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2.5 }}>
          <Typography variant="body2" sx={{ color: "#475569", lineHeight: 1.6, fontSize: 13.5 }}>
            Bạn có chắc chắn muốn xóa lượt cấp phát này? Hành động này sẽ **hoàn trả lại toàn bộ số lượng thuốc đã phát** về lại tồn kho của hệ thống.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => setOpenDeleteConfirm(false)}
            disabled={saving}
            sx={{ textTransform: "none", fontWeight: 750, borderRadius: "8px", flex: 1, height: 38, borderColor: "#cbd5e1", color: "#475569" }}
          >
            Hủy bỏ
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={saving}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              borderRadius: "8px",
              flex: 1,
              height: 38,
              bgcolor: "#d32f2f",
              "&:hover": { bgcolor: "#c62828" },
            }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : "Đồng ý xóa"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Backdrop loading đóng băng mờ toàn trang cao cấp */}
      <Backdrop
        sx={{
          color: "#ffffff",
          zIndex: (theme) => theme.zIndex.drawer + 101,
          bgcolor: "rgba(15, 23, 42, 0.45)", // slate-900 mờ
          backdropFilter: "blur(5px)", // Hiệu ứng làm mờ đóng băng trang siêu premium
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
        open={saving || loadingSearch || loadingHistory}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            bgcolor: "#ffffff",
            p: 4,
            borderRadius: "20px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            border: "1px solid rgba(226, 232, 240, 0.8)",
          }}
        >
          <CircularProgress size={50} sx={{ color: "#15803d" }} />
          <Typography
            variant="body1"
            sx={{
              mt: 2.5,
              fontWeight: 800,
              color: "#0f172a",
              fontFamily: "'Outfit' !important",
              fontSize: 16
            }}
          >
            {loadingSearch ? "Đang tìm kiếm nhân viên..." : loadingHistory ? "Đang tải lịch sử phát thuốc..." : "Đang xử lý cấp phát thuốc..."}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "#64748b",
              fontWeight: 500,
              fontSize: 12
            }}
          >
            {loadingSearch ? "Hệ thống đang truy xuất dữ liệu nhân sự" : loadingHistory ? "Đang lấy lịch sử cấp phát của nhân viên" : "Hệ thống đang trừ tồn kho & lưu lịch sử"}
          </Typography>
        </Box>
      </Backdrop>
    </Box>
  );
}

// Component con độc lập quản lý state gõ phím để triệt tiêu 100% lag khi nhập mã nhân viên
interface EmployeeSearchInputProps {
  value: string;
  onSearch: (val: string) => void;
  onClear: () => void;
  loading: boolean;
  hasSelectedEmployee: boolean;
}

function EmployeeSearchInput({ value, onSearch, onClear, loading, hasSelectedEmployee }: EmployeeSearchInputProps) {
  const [localId, setLocalId] = useState(value);

  // Sync prop value khi clear/reset từ bên ngoài
  useEffect(() => {
    setLocalId(value);
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localId.trim());
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", width: "100%" }}>
      <TextField
        size="small"
        placeholder="Nhập mã nhân viên..."
        value={localId}
        onChange={(e) => setLocalId(e.target.value)}
        disabled={loading}
        sx={{
          width: "100%",
          "& .MuiOutlinedInput-root": {
            borderRadius: "12px",
            bgcolor: "#ffffff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            paddingRight: "8px",
            "& fieldset": { borderColor: "#d1d5db" },
            "&:hover fieldset": { borderColor: "#9ca3af" },
            "&.Mui-focused fieldset": { borderColor: "#15803d", borderWidth: "2px" },
          },
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {hasSelectedEmployee && (
                <IconButton size="small" color="error" onClick={onClear} sx={{ mr: 0.5 }}>
                  <span style={{ fontSize: 16 }}>✕</span>
                </IconButton>
              )}
              <IconButton
                type="submit"
                disabled={loading}
                size="small"
                sx={{
                  bgcolor: "#15803d",
                  color: "#ffffff",
                  borderRadius: "8px",
                  width: 32,
                  height: 32,
                  "&:hover": { bgcolor: "#166534" },
                }}
              >
                {loading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon sx={{ fontSize: 18, color: "#ffffff" }} />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </form>
  );
}
