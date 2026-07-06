import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  MedicalServicesOutlined as DispenseIcon,
  WarehouseOutlined as WarehouseIcon,
  HotelOutlined as BedIcon,
  ExitToAppOutlined as EarlyLeavingIcon,
  HealthAndSafetyOutlined as InsuranceIcon,
  PregnantWomanOutlined as MaternityIcon,
  AssessmentOutlined as ReportIcon,
  SettingsOutlined as MasterDataIcon,
  AdminPanelSettings as AdminIcon,
} from "@mui/icons-material";
import { AdminPage } from "@traxeco/shared";
import ClinicAppShell from "./ClinicAppShell";

import MedicineDispensePage from "../pages/MedicineDispensePage";
import WarehousePage from "../pages/WarehousePage";
import BedManagementPage from "../pages/BedManagementPage";
import EarlyLeavingPage from "../pages/EarlyLeavingPage";
import InsurancePage from "../pages/InsurancePage";
import MaternityPage from "../pages/MaternityPage";
import ReportPage from "../pages/ReportPage";
import MasterDataPage from "../pages/MasterDataPage";

const BASE = "/clinic";

export default function ClinicLayout() {
  const { t } = useTranslation();
  const roleLevel = Number(localStorage.getItem("roleLevel") || "99");

  const navItems = useMemo(
    () => [
      {
        text: t("clinic.nav.dispense", "Phát thuốc"),
        icon: <DispenseIcon fontSize="small" />,
        path: `${BASE}/dispense`,
        pageCode: "clinic_dispense",
      },
      {
        text: t("clinic.nav.warehouse", "Kho thuốc"),
        icon: <WarehouseIcon fontSize="small" />,
        path: `${BASE}/warehouse`,
        pageCode: "clinic_warehouse",
      },
      {
        text: t("clinic.nav.bed", "Giường bệnh"),
        icon: <BedIcon fontSize="small" />,
        path: `${BASE}/bed`,
        pageCode: "clinic_bed",
      },
      {
        text: t("clinic.nav.earlyLeaving", "Về sớm"),
        icon: <EarlyLeavingIcon fontSize="small" />,
        path: `${BASE}/early-leaving`,
        pageCode: "clinic_early_leaving",
      },
      {
        text: t("clinic.nav.insurance", "Bảo hiểm XH"),
        icon: <InsuranceIcon fontSize="small" />,
        path: `${BASE}/insurance`,
        pageCode: "clinic_insurance",
      },
      {
        text: t("clinic.nav.maternity", "Thai sản"),
        icon: <MaternityIcon fontSize="small" />,
        path: `${BASE}/maternity`,
        pageCode: "clinic_maternity",
      },
      {
        text: t("clinic.nav.report", "Báo cáo"),
        icon: <ReportIcon fontSize="small" />,
        path: `${BASE}/report`,
        pageCode: "clinic_report",
      },
      {
        text: t("clinic.nav.masterData", "Danh mục"),
        icon: <MasterDataIcon fontSize="small" />,
        path: `${BASE}/master-data`,
        pageCode: "clinic_master_data",
      },
      ...(roleLevel <= 2
        ? [
            {
              text: t("nav.admin", "Admin"),
              icon: <AdminIcon fontSize="small" />,
              path: `${BASE}/admin`,
              pageCode: "clinic_admin",
            },
          ]
        : []),
    ],
    [t, roleLevel],
  );

  const pages = useMemo(
    () => [
      { path: `${BASE}/dispense`, component: <MedicineDispensePage /> },
      { path: `${BASE}/warehouse`, component: <WarehousePage /> },
      { path: `${BASE}/bed`, component: <BedManagementPage /> },
      { path: `${BASE}/early-leaving`, component: <EarlyLeavingPage /> },
      { path: `${BASE}/insurance`, component: <InsurancePage /> },
      { path: `${BASE}/maternity`, component: <MaternityPage /> },
      { path: `${BASE}/report`, component: <ReportPage /> },
      { path: `${BASE}/master-data`, component: <MasterDataPage /> },
      ...(roleLevel <= 2
        ? [{ path: `${BASE}/admin`, component: <AdminPage /> }]
        : []),
    ],
    [roleLevel],
  );

  return (
    <ClinicAppShell
      appTitle="Clinic Management"
      appTitleShort="CLINIC"
      appLogo={<DispenseIcon sx={{ color: "#fff", fontSize: 18 }} />}
      accentColor="#2e7d32"
      drawerWidth={240}
      navItems={navItems}
      pages={pages}
      storageKey="clinic_layout_open"
      versionString="Clinic v1.0.0"
      fallbackPath={`${BASE}/dispense`}
      rootPath={BASE}
    />
  );
}
