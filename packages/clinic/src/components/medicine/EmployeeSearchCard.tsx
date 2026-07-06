import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { clinicApi } from "../../api/clinicApi";
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  CircularProgress,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import {
  Search as SearchIcon,
  Person as PersonIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import { useToast } from "@traxeco/shared";

export interface EmployeeInfo {
  idStaff: string;
  fullName: string;
  dob: string;
  department: string;
  section: string;
  gender: string;
  laborType: string;
}

interface EmployeeSearchCardProps {
  onEmployeeFound: (employee: EmployeeInfo | null) => void;
  horizontal?: boolean;
}

export default function EmployeeSearchCard({
  onEmployeeFound,
  horizontal = false,
}: EmployeeSearchCardProps) {
  const { t } = useTranslation();
  const [searchId, setSearchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const { showToast } = useToast();
  const [openHistory, setOpenHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    if (!employee) return;
    setLoadingHistory(true);
    setOpenHistory(true);
    try {
      const data = await clinicApi.getHistory("F2", 50, employee.idStaff);
      setHistory(data);
    } catch (err) {
      showToast(t("clinic.history.error", "Không thể tải lịch sử phát thuốc"), "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchId.trim()) return;

    setLoading(true);
    setEmployee(null);
    onEmployeeFound(null);

    try {
      const emp = await clinicApi.searchEmployee(searchId.trim());

      const empInfo: EmployeeInfo = {
        idStaff: emp.globalId,
        fullName: emp.fullname,
        dob: emp.dob ? new Date(emp.dob).toLocaleDateString("vi-VN") : "N/A",
        department: emp.department || "N/A",
        section: emp.department || "N/A", // user requested id_dept for "Nhà máy"
        gender: emp.gender || "N/A",
        laborType: emp.laborType || "N/A",
      };

      setEmployee(empInfo);
      onEmployeeFound(empInfo);
      showToast(
        t("clinic.search.success", "Tìm thấy thông tin nhân viên!"),
        "success",
      );
    } catch (err) {
      showToast(
        t("clinic.search.error", "Không tìm thấy nhân viên hoặc lỗi kết nối!"),
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSearchId("");
    setEmployee(null);
    onEmployeeFound(null);
  };

  if (horizontal) {
    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, width: "100%" }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <TextField
            size="small"
            label={t("clinic.search.label", "Mã nhân viên")}
            placeholder="Mã NV..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            disabled={loading}
            sx={{ width: 160 }}
          />
          <Button
            variant="contained"
            type="submit"
            disabled={loading}
            size="small"
            sx={{
              bgcolor: "#2e7d32",
              height: 38,
              textTransform: "none",
              fontWeight: 600,
              "&:hover": { bgcolor: "#15803d" },
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : t("clinic.search.btn", "Tìm")}
          </Button>
          {employee && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={handleClear}
              sx={{ height: 38, textTransform: "none", fontWeight: 600 }}
            >
              Xóa
            </Button>
          )}
        </form>

        {employee && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
              flexGrow: 1,
              bgcolor: "#f8fafc",
              p: 0.75,
              px: 2,
              borderRadius: 2,
              border: "1px solid #e2e8f0",
            }}
          >
            <Avatar sx={{ bgcolor: "#2e7d32", width: 32, height: 32 }}>
              <PersonIcon sx={{ fontSize: 18 }} />
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>
                {employee.fullName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {employee.idStaff}
              </Typography>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 10 }}>
                Ngày sinh / Giới tính
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11 }}>
                {employee.dob} • {employee.gender}
              </Typography>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 10 }}>
                Bộ phận / Nhà máy
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11 }}>
                {employee.department} • {employee.section}
              </Typography>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 10 }}>
                Loại lao động
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11 }}>
                {employee.laborType}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              size="small"
              startIcon={<HistoryIcon />}
              onClick={fetchHistory}
              sx={{
                ml: "auto",
                height: 30,
                textTransform: "none",
                fontSize: 11,
                fontWeight: 600,
                borderColor: "#cbd5e1",
                color: "#475569",
                "&:hover": {
                  borderColor: "#94a3b8",
                  bgcolor: "#f1f5f9",
                },
              }}
            >
              Xem lịch sử
            </Button>
          </Box>
        )}

        <Dialog
          open={openHistory}
          onClose={() => setOpenHistory(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 2 },
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, fontSize: 16, pb: 1 }}>
            Lịch sử cấp phát thuốc - {employee?.fullName} ({employee?.idStaff})
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            {loadingHistory ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={32} color="primary" />
              </Box>
            ) : history.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                Chưa có lịch sử cấp phát thuốc nào cho nhân viên này.
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8fafc" }}>
                    <TableCell sx={{ fontWeight: 700 }}>Ngày phát</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Loại</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Triệu chứng / Bệnh</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Chi tiết thuốc</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Người phát</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((row) => (
                    <TableRow key={row.code} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                      <TableCell>{new Date(row.sysCreateDate).toLocaleString("vi-VN")}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.type === "CABIN" ? "Tủ thuốc" : "Cá nhân"}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: 11,
                            bgcolor: row.type === "CABIN" ? "#e0f2fe" : "#f0fdf4",
                            color: row.type === "CABIN" ? "#0369a1" : "#166534",
                          }}
                        />
                      </TableCell>
                      <TableCell>{row.sicknessName || row.idSick || "N/A"}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {row.medicines.map((m: any) => `${m.nameMed} (x${m.qty})`).join(", ")}
                      </TableCell>
                      <TableCell>{row.createdBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 1.5 }}>
            <Button onClick={() => setOpenHistory(false)} sx={{ textTransform: "none", fontWeight: 600 }}>
              Đóng
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  return (
    <Box>
      <form onSubmit={handleSearch}>
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            label={t("clinic.search.label", "Mã nhân viên")}
            placeholder={t(
              "clinic.search.placeholder",
              "Nhập mã NV (VD: 04819)...",
            )}
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            disabled={loading}
          />
          <Button
            variant="contained"
            type="submit"
            disabled={loading}
            startIcon={
              loading ? <CircularProgress size={20} /> : <SearchIcon />
            }
            sx={{
              bgcolor: "#2e7d32",
              boxShadow: "none",
              textTransform: "none",
              fontWeight: 600,
              "&:hover": { bgcolor: "#15803d", boxShadow: "none" },
            }}
          >
            {t("common.search", "Tìm kiếm")}
          </Button>
          {employee && (
            <Button variant="outlined" onClick={handleClear}>
              {t("common.clear", "Xóa")}
            </Button>
          )}
        </Box>
      </form>

      {employee && (
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            bgcolor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 1,
          }}
        >
          <Box>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}
            >
              <Avatar sx={{ bgcolor: "#2e7d32" }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {employee.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {employee.idStaff}
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Grid container spacing={1} sx={{ mt: 0.5 }}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {t("clinic.employee.dob", "Ngày sinh")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {employee.dob}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {t("clinic.employee.gender", "Giới tính")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {employee.gender}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {t("clinic.employee.dept", "Bộ phận")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {employee.department}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {t("clinic.employee.factory", "Nhà máy")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {employee.section}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  {t("clinic.employee.laborType", "Loại lao động")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {employee.laborType}
                </Typography>
              </Grid>
              <Grid item xs={12} sx={{ mt: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<HistoryIcon />}
                  onClick={fetchHistory}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    borderColor: "#cbd5e1",
                    color: "#475569",
                    "&:hover": {
                      borderColor: "#94a3b8",
                      bgcolor: "#f8fafc",
                    },
                  }}
                >
                  {t("clinic.employee.viewHistory", "Xem lịch sử phát thuốc")}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Box>
      )}

      <Dialog
        open={openHistory}
        onClose={() => setOpenHistory(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16, pb: 1 }}>
          Lịch sử cấp phát thuốc - {employee?.fullName} ({employee?.idStaff})
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {loadingHistory ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={32} color="primary" />
            </Box>
          ) : history.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
              Chưa có lịch sử cấp phát thuốc nào cho nhân viên này.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Ngày phát</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Loại</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Triệu chứng / Bệnh</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Chi tiết thuốc</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Người phát</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.code} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                    <TableCell>{new Date(row.sysCreateDate).toLocaleString("vi-VN")}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.type === "CABIN" ? "Tủ thuốc" : "Cá nhân"}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: 11,
                          bgcolor: row.type === "CABIN" ? "#e0f2fe" : "#f0fdf4",
                          color: row.type === "CABIN" ? "#0369a1" : "#166534",
                        }}
                      />
                    </TableCell>
                    <TableCell>{row.sicknessName || row.idSick || "N/A"}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {row.medicines.map((m: any) => `${m.nameMed} (x${m.qty})`).join(", ")}
                    </TableCell>
                    <TableCell>{row.createdBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 1.5 }}>
          <Button onClick={() => setOpenHistory(false)} sx={{ textTransform: "none", fontWeight: 600 }}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
