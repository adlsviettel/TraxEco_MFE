import React from "react";
import { Button } from "@mui/material";
import type { ButtonProps, SxProps, Theme } from "@mui/material";

export interface AppButtonProps extends ButtonProps {
  customVariant?: "primary" | "secondary" | "danger" | "warning";
}

const AppButton: React.FC<AppButtonProps> = ({
  children,
  variant = "contained",
  size = "small",
  sx,
  customVariant = "primary",
  ...props
}) => {
  let baseSx: SxProps<Theme> = {
    borderRadius: "8px",
    height: 40,
    textTransform: "none",
    fontSize: 13,
    fontWeight: 500,
    px: 2.5,
    transition: "all 0.2s ease-in-out",
  };

  if (variant === "contained" && customVariant === "primary") {
    baseSx = {
      ...baseSx,
      bgcolor: "#2e7d32",
      color: "#fff",
      boxShadow: "0 4px 6px -1px rgba(46,125,50,0.2)",
      "&:hover": { bgcolor: "rgba(46,125,50,0.9)" },
      "&.Mui-disabled": {
        bgcolor: "#2e7d32",
        color: "rgba(255,255,255,0.7)",
        opacity: 0.8,
      },
    };
  } else if (variant === "outlined" && customVariant === "primary") {
    baseSx = {
      ...baseSx,
      color: "#2e7d32",
      borderColor: "#2e7d32",
      "&:hover": { bgcolor: "rgba(46,125,50,0.05)", borderColor: "#2e7d32" },
    };
  } else if (variant === "outlined" && customVariant === "secondary") {
    baseSx = {
      ...baseSx,
      borderColor: "#bfc9c4",
      color: "#191c1d",
      bgcolor: "#fff",
      "&:hover": { bgcolor: "#f3f4f5", borderColor: "#bfc9c4" },
      "&.Mui-active": {
        bgcolor: "rgba(46,125,50,0.05)",
        borderColor: "#2e7d32",
        color: "#2e7d32",
      },
    };
  } else if (variant === "outlined" && customVariant === "danger") {
    baseSx = {
      ...baseSx,
      borderColor: "#d32f2f",
      color: "#d32f2f",
      bgcolor: "#fff",
      "&:hover": { bgcolor: "rgba(211,47,47,0.04)", borderColor: "#d32f2f" },
    };
  } else if (variant === "outlined" && customVariant === "warning") {
    baseSx = {
      ...baseSx,
      borderColor: "#ed6c02",
      color: "#ed6c02",
      bgcolor: "#fff",
      "&:hover": { bgcolor: "rgba(237,108,2,0.04)", borderColor: "#ed6c02" },
    };
  }

  // Merge the passed sx onto baseSx
  const finalSx = [baseSx, ...(Array.isArray(sx) ? sx : [sx])];

  return (
    <Button
      variant={variant}
      size={size}
      disableElevation
      sx={finalSx}
      {...props}
    >
      {children}
    </Button>
  );
};

export default AppButton;
