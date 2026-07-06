import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Grid,
  Autocomplete,
  TextField,
  Typography,
  InputAdornment,
  Chip,
  Card,
  CardActionArea,
  CircularProgress,
} from "@mui/material";
import {
  Search as SearchIcon,
  Healing as SicknessIcon,
  Medication as MedIcon,
  WarningAmber as WarningIcon,
} from "@mui/icons-material";
import {
  clinicApi,
  ClinicMedicine,
  ClinicMedicineGroup,
  ClinicSickness,
} from "../../api/clinicApi";

interface MedicineSelectorProps {
  onAddMedicine: (med: ClinicMedicine, qty: number) => void;
  onSicknessChange: (sick: ClinicSickness[]) => void;
  factory?: string;
}

export default function MedicineSelector({
  onAddMedicine,
  onSicknessChange,
  factory = "F2",
}: MedicineSelectorProps) {
  const { t } = useTranslation();

  const [sicknesses, setSicknesses] = useState<ClinicSickness[]>([]);
  const [groups, setGroups] = useState<ClinicMedicineGroup[]>([]);
  const [medicines, setMedicines] = useState<ClinicMedicine[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSick, setSelectedSick] = useState<ClinicSickness[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroupId, setActiveGroupId] = useState<string>("ALL");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [sickData, groupData, medData] = await Promise.all([
          clinicApi.getSickness(),
          clinicApi.getMedicineGroups(),
          clinicApi.getMedicines(factory),
        ]);
        setSicknesses(sickData);
        setGroups([
          { idGroup: "ALL", nameGroup: "Tất cả", typeGroup: "" },
          ...groupData,
        ]);
        setMedicines(medData);
      } catch (error) {
        console.error("Failed to load clinic data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [factory]);

  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
      const matchGroup = activeGroupId === "ALL" || m.idGroup === activeGroupId;
      const matchSearch = m.nameMed
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchGroup && matchSearch;
    });
  }, [searchQuery, activeGroupId, medicines]);

  const handleCardClick = (med: ClinicMedicine) => {
    if (med.balance <= 0) return;
    onAddMedicine(med, 1);
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Debugging log for the user to check in F12 console
  console.log("MedicineSelector - Total Medicines Loaded:", medicines.length);
  console.log("MedicineSelector - Filtered Medicines:", filteredMedicines.length);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Box sx={{ p: 2, borderBottom: "1px solid #e2e8f0", bgcolor: "#ffffff", flexShrink: 0 }}>
        <Autocomplete
          multiple
          fullWidth
          options={sicknesses}
          getOptionLabel={(option) => option.nameSick}
          value={selectedSick}
          onChange={(_, newValue) => {
            setSelectedSick(newValue);
            onSicknessChange(newValue);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={t(
                "clinic.dispense.sickness",
                "Chẩn đoán (Triệu chứng / Bệnh)...",
              )}
              variant="outlined"
              size="small"
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "#f8fafc",
                },
              }}
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <>
                    <InputAdornment position="start" sx={{ pl: 1 }}>
                      <SicknessIcon sx={{ color: "#2e7d32", fontSize: 20 }} />
                    </InputAdornment>
                    {params.InputProps.startAdornment}
                  </>
                ),
              }}
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                variant="outlined"
                label={option.nameSick}
                {...getTagProps({ index })}
                size="small"
                sx={{
                  bgcolor: "#e8f5e9",
                  color: "#15803d",
                  borderColor: "#a5d6a7",
                  fontWeight: 600,
                  "& .MuiChip-deleteIcon": {
                    color: "#2e7d32",
                  },
                }}
              />
            ))
          }
        />

        <TextField
          fullWidth
          placeholder={t("clinic.dispense.searchMed", "Tìm kiếm thuốc...")}
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              borderRadius: 5,
              bgcolor: "#ffffff",
              "&.Mui-focused": {
                bgcolor: "#ffffff",
                boxShadow: "0 0 0 2px rgba(46,125,50,0.2)",
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#94a3b8" }} />
              </InputAdornment>
            ),
          }}
        />

        <Box
          sx={{
            display: "flex",
            gap: 1,
            overflowX: "auto",
            pb: 0.5,
            "&::-webkit-scrollbar": { height: 6 },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#cbd5e1",
              borderRadius: 3,
            },
          }}
        >
          {groups.map((group) => (
            <Chip
              key={group.idGroup}
              label={group.nameGroup}
              onClick={() => setActiveGroupId(group.idGroup)}
              sx={{
                fontWeight: 600,
                bgcolor:
                  activeGroupId === group.idGroup ? "#2e7d32" : "#f1f5f9",
                color: activeGroupId === group.idGroup ? "#ffffff" : "#475569",
                "&:hover": {
                  bgcolor:
                    activeGroupId === group.idGroup ? "#15803d" : "#e2e8f0",
                },
              }}
            />
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          p: 1,
          bgcolor: "#f8fafc",
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
          },
          gridAutoRows: "min-content",
          gap: 1,
          alignContent: "start",
        }}
      >
        {filteredMedicines.length === 0 && (
          <Box sx={{ p: 4, textAlign: "center", gridColumn: "1 / -1" }}>
            <Typography color="text.secondary">
              Không tìm thấy thuốc nào. (Tổng số thuốc tải về: {medicines.length})
            </Typography>
          </Box>
        )}

        {filteredMedicines.map((med, index) => {
          const isOutOfStock = med.balance <= 0;
          return (
            <Card
              key={`${med.idMed}-${index}`}
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: isOutOfStock ? "#fecaca" : "#e2e8f0",
                borderRadius: 2,
                transition: "all 0.2s",
                opacity: isOutOfStock ? 0.6 : 1,
                bgcolor: isOutOfStock ? "#fef2f2" : "#ffffff",
                "&:hover": {
                  borderColor: isOutOfStock ? "#fecaca" : "#2e7d32",
                  boxShadow: isOutOfStock
                    ? "none"
                    : "0 2px 4px rgba(0,0,0,0.05)",
                  transform: isOutOfStock ? "none" : "translateY(-1px)",
                },
              }}
            >
              <CardActionArea
                onClick={() => handleCardClick(med)}
                disabled={isOutOfStock}
                sx={{ p: 1.25 }}
              >
                <Grid container alignItems="center" spacing={2}>
                  <Grid item>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1.5,
                        bgcolor: isOutOfStock ? "#fee2e2" : "#e0f2fe",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: isOutOfStock ? "#ef4444" : "#0ea5e9",
                      }}
                    >
                      <MedIcon />
                    </Box>
                  </Grid>
                  <Grid item xs>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: "#0f172a",
                        fontSize: 14,
                        mb: 0.5,
                      }}
                    >
                      {med.nameMed}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: "#64748b",
                        fontWeight: 500,
                      }}
                    >
                      {med.unit}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                      }}
                    >
                      {isOutOfStock ? (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            color: "#ef4444",
                          }}
                        >
                          <WarningIcon sx={{ fontSize: 14 }} />
                          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                            Hết hàng
                          </Typography>
                        </Box>
                      ) : (
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#64748b",
                          }}
                        >
                          Tồn:{" "}
                          <Box
                            component="span"
                            sx={{
                              color: "#0f172a",
                              fontWeight: 800,
                              fontSize: 14,
                            }}
                          >
                            {med.balance}
                          </Box>
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
