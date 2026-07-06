import React from "react";
import { useTranslation } from "react-i18next";
import { Box, Typography, IconButton, Card, Stack, Chip } from "@mui/material";
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from "@mui/icons-material";
import { Medicine } from "./MedicineSelector";

export interface PrescriptionItem {
  medicine: Medicine;
  qty: number;
}

interface PrescriptionTableProps {
  items: PrescriptionItem[];
  onQtyChange: (medId: string, newQty: number) => void;
  onRemove: (medId: string) => void;
}

export default function PrescriptionTable({
  items,
  onQtyChange,
  onRemove,
}: PrescriptionTableProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <Box
        sx={{
          p: 2,
          textAlign: "center",
          bgcolor: "#f8fafc",
        }}
      >
        <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
          {t("clinic.dispense.noMeds", "Chưa có thuốc nào được chọn.")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, overflowY: "auto", bgcolor: "#ffffff" }}>
      {items.map((item, index) => (
        <Box
          key={item.medicine.idMed}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1.5,
            borderBottom:
              index === items.length - 1 ? "none" : "1px solid #e6ebf1",
            transition: "background-color 0.15s",
            "&:hover": {
              bgcolor: "#f6f9fc",
            },
          }}
        >
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              mr: 2,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                bgcolor: "#f0f9ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #e0f2fe",
              }}
            >
              <Typography sx={{ fontSize: 18 }}>💊</Typography>
            </Box>
            <Box>
              <Typography
                sx={{
                  fontWeight: 600,
                  mb: 0.5,
                  color: "#0a2540",
                  fontSize: 14,
                }}
                noWrap
              >
                {item.medicine.nameMed}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontSize: 12, color: "#425466" }}>
                  {item.medicine.unit}
                </Typography>
                <Typography
                  sx={{ color: "#425466", fontWeight: 500, fontSize: 12 }}
                >
                  Kho: {item.medicine.balance}
                </Typography>
              </Stack>
            </Box>
          </Box>

          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{
              mr: 1,
              bgcolor: "#ffffff",
              p: 0.5,
              borderRadius: 1,
              border: "1px solid #e6ebf1",
            }}
          >
            <IconButton
              size="small"
              onClick={() => onQtyChange(item.medicine.idMed, item.qty - 1)}
              disabled={item.qty <= 1}
              sx={{
                borderRadius: 1,
                p: 0.5,
                color: "#425466",
                "&.Mui-disabled": { opacity: 0.3 },
                "&:hover": { bgcolor: "#f6f9fc", color: "#0a2540" },
              }}
            >
              <RemoveIcon sx={{ fontSize: 16 }} />
            </IconButton>

            <Typography
              sx={{
                minWidth: 28,
                textAlign: "center",
                fontWeight: 600,
                color: "#0a2540",
                fontSize: 14,
              }}
            >
              {item.qty}
            </Typography>

            <IconButton
              size="small"
              onClick={() => onQtyChange(item.medicine.idMed, item.qty + 1)}
              disabled={item.qty >= item.medicine.balance}
              sx={{
                borderRadius: 1,
                p: 0.5,
                color: "#2e7d32",
                "&.Mui-disabled": { opacity: 0.3, color: "inherit" },
                "&:hover": { bgcolor: "#f6f9fc", color: "#15803d" },
              }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>

          <IconButton
            className="delete-btn"
            onClick={() => onRemove(item.medicine.idMed)}
            size="small"
            sx={{
              transition: "all 0.15s",
              color: "#94a3b8",
              "&:hover": { bgcolor: "#fff1f2", color: "#e11d48" },
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
    </Box>
  );
}
