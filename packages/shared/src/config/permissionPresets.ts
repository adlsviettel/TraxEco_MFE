export interface PresetPermission {
  canView?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
  canBypassCheck?: boolean;
  bypassQC?: boolean;
  bypassRelax?: boolean;
  bypassLabTest?: boolean;
  bypassSunrise?: boolean;
  [key: string]: boolean | undefined;
}

export interface AppPresets {
  [roleLevel: number]: {
    label: string;
    pages: Record<string, PresetPermission>;
  };
}

export const PERMISSION_PRESETS: Record<string, AppPresets> = {
  FGS_WH: {
    4: {
      label: 'Worker',
      pages: {
        scan: { canView: true, canAdd: true, canEdit: true },
        history: { canView: true }
      }
    },
    3: {
      label: 'Staff',
      pages: {
        scan: { canView: true, canAdd: true, canEdit: true },
        history: { canView: true, canExport: true },
        planload: { canView: true, canAdd: true, canEdit: true },
        packingplan: { canView: true, canAdd: true, canEdit: true },
        finalinspection: { canView: true, canAdd: true, canEdit: true },
        updatelocation: { canView: true, canAdd: true, canEdit: true },
        warehousemap: { canView: true },
        labelconfig: { canView: true },
        cartonship: { canView: true, canAdd: true, canEdit: true }
      }
    },
    2: {
      label: 'Supervisor',
      pages: {
        scan: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        history: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        planload: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        packingplan: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        finalinspection: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        updatelocation: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        warehousemap: { canView: true, canAdd: true, canEdit: true, canDelete: true },
        labelconfig: { canView: true, canAdd: true, canEdit: true, canDelete: true },
        cartonship: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        admin: { canView: true, canAdd: true, canEdit: true }
      }
    }
  },
  FABRIC_WH: {
    4: {
      label: 'Worker',
      pages: {
        fb_putaway: { canView: true, canAdd: true, canEdit: true },
        fb_issue: { canView: true, canAdd: true, canEdit: true },
        fb_relax: { canView: true, canAdd: true, canEdit: true }
      }
    },
    3: {
      label: 'Staff',
      pages: {
        fb_dashboard: { canView: true },
        fb_pklist: { canView: true, canAdd: true, canEdit: true },
        fb_upload_pklist: { canView: true, canAdd: true },
        fb_print_qr: { canView: true, canAdd: true, canEdit: true },
        fb_putaway: { canView: true, canAdd: true, canEdit: true },
        fb_inventory: { canView: true, canExport: true },
        fb_issue: { canView: true, canAdd: true, canEdit: true, canExport: true },
        fb_relax: { canView: true, canAdd: true, canEdit: true },
        fb_relax_report: { canView: true, canExport: true },
        fb_report: { canView: true, canExport: true },
        fb_tracking: { canView: true }
      }
    },
    2: {
      label: 'Supervisor',
      pages: {
        fb_dashboard: { canView: true },
        fb_pklist: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        fb_upload_pklist: { canView: true, canAdd: true, canEdit: true, canDelete: true },
        fb_print_qr: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        fb_putaway: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        fb_inventory: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        fb_issue: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        fb_relax: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        fb_relax_report: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        fb_report: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        fb_tracking: { canView: true, canExport: true },
        fb_admin: { canView: true, canAdd: true, canEdit: true }
      }
    }
  },
  QCFB_WH: {
    4: {
      label: 'Worker',
      pages: {
        'qcfb-fabric-inspection': { canView: true, canAdd: true, canEdit: true }
      }
    },
    3: {
      label: 'Staff',
      pages: {
        'qcfb-dashboard': { canView: true },
        'qcfb-fabric-inspection': { canView: true, canAdd: true, canEdit: true },
        'qcfb-inspection-history': { canView: true, canExport: true },
        'qcfb-daily-report': { canView: true, canExport: true },
        'qcfb-packing-list-summary': { canView: true, canExport: true },
        'qcfb-report-pass-fail': { canView: true },
        'qcfb-report-defect': { canView: true }
      }
    },
    2: {
      label: 'Supervisor',
      pages: {
        'qcfb-dashboard': { canView: true },
        'qcfb-fabric-inspection': { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        'qcfb-inspection-history': { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        'qcfb-daily-report': { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        'qcfb-packing-list-summary': { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        'qcfb-report-pass-fail': { canView: true, canExport: true },
        'qcfb-report-defect': { canView: true, canExport: true },
        'qcfb-admin': { canView: true, canAdd: true, canEdit: true }
      }
    }
  },
  IT_INVENTORY: {
    4: {
      label: 'Worker',
      pages: {
        it_inbound: { canView: true, canAdd: true, canEdit: true },
        it_outbound: { canView: true, canAdd: true, canEdit: true },
        it_stock_opname: { canView: true, canAdd: true, canEdit: true }
      }
    },
    3: {
      label: 'Staff',
      pages: {
        it_dashboard: { canView: true },
        it_master_data: { canView: true, canAdd: true, canEdit: true, canExport: true },
        it_inbound: { canView: true, canAdd: true, canEdit: true },
        it_outbound: { canView: true, canAdd: true, canEdit: true },
        it_stock_opname: { canView: true, canAdd: true, canEdit: true },
        it_adjustment: { canView: true, canAdd: true, canEdit: true },
        it_insw_mapping: { canView: true, canAdd: true, canEdit: true },
        it_insw_push: { canView: true, canAdd: true, canEdit: true },
        it_logs: { canView: true }
      }
    },
    2: {
      label: 'Supervisor',
      pages: {
        it_dashboard: { canView: true },
        it_master_data: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        it_inbound: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        it_outbound: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        it_stock_opname: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        it_adjustment: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        it_insw_mapping: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        it_insw_push: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        it_logs: { canView: true, canExport: true },
        it_settings: { canView: true, canAdd: true, canEdit: true },
        it_account: { canView: true, canAdd: true, canEdit: true },
        it_admin: { canView: true, canAdd: true, canEdit: true }
      }
    }
  },
  F2S_DELIVERY: {
    4: {
      label: 'Worker',
      pages: {
        deliver: { canView: true, canAdd: true, canEdit: true }
      }
    },
    3: {
      label: 'Staff',
      pages: {
        dashboard: { canView: true },
        deliver: { canView: true, canAdd: true, canEdit: true },
        history: { canView: true, canExport: true },
        report: { canView: true, canExport: true },
        receive: { canView: true, canAdd: true, canEdit: true },
        po_status: { canView: true }
      }
    },
    2: {
      label: 'Supervisor',
      pages: {
        dashboard: { canView: true },
        deliver: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        history: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        report: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        receive: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        po_status: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        f2s_admin: { canView: true, canAdd: true, canEdit: true }
      }
    }
  },
  RD_MATERIAL: {
    4: {
      label: 'Worker',
      pages: {
        rd_scan: { canView: true }
      }
    },
    3: {
      label: 'Staff',
      pages: {
        rd_dashboard: { canView: true },
        rd_fabric: { canView: true, canAdd: true, canEdit: true },
        rd_accessory: { canView: true, canAdd: true, canEdit: true },
        rd_yardage: { canView: true, canAdd: true, canEdit: true },
        rd_product: { canView: true, canAdd: true, canEdit: true },
        rd_color: { canView: true, canAdd: true, canEdit: true },
        rd_trim: { canView: true, canAdd: true, canEdit: true },
        rd_pattern: { canView: true, canAdd: true, canEdit: true },
        rd_concept: { canView: true, canAdd: true, canEdit: true },
        rd_catalog: { canView: true, canAdd: true, canEdit: true },
        rd_archive: { canView: true },
        rd_scan: { canView: true }
      }
    },
    2: {
      label: 'Supervisor',
      pages: {
        rd_dashboard: { canView: true },
        rd_fabric: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        rd_accessory: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        rd_yardage: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        rd_product: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        rd_color: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        rd_trim: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        rd_pattern: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        rd_concept: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        rd_catalog: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        rd_archive: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        rd_scan: { canView: true, canAdd: true, canEdit: true },
        rd_admin: { canView: true, canAdd: true, canEdit: true }
      }
    }
  },
  TCC_TEMPLATE: {
    4: {
      label: 'Worker',
      pages: {
        tcc_tracking: { canView: true }
      }
    },
    3: {
      label: 'Staff',
      pages: {
        tcc_tracking: { canView: true, canAdd: true, canEdit: true },
        tcc_admin_status: { canView: true, canAdd: true, canEdit: true },
        tcc_dashboard: { canView: true }
      }
    },
    2: {
      label: 'Supervisor',
      pages: {
        tcc_tracking: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        tcc_admin_status: { canView: true, canAdd: true, canEdit: true, canDelete: true, canExport: true },
        tcc_dashboard: { canView: true, canExport: true },
        tcc_settings: { canView: true, canAdd: true, canEdit: true },
        tcc_admin: { canView: true, canAdd: true, canEdit: true }
      }
    }
  }
};
