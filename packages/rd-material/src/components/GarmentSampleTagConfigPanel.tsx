import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box, Typography, TextField, Select, MenuItem,
  FormControl, InputLabel, Button, Card, Divider,
  Chip, Avatar, Tooltip, IconButton, FormHelperText,
  Checkbox, Collapse, Alert
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'react-i18next';
import type { Item, GarmentSampleTagConfig, GarmentTagFabricSlot, GarmentTagSpecialPropertyItem } from '../types';
import { rdItemApi } from '../services/rdMaterialApi';
import { specialPropertyService, SpecialPropertyItem, DEFAULT_SPECIAL_PROPERTIES } from '../services/specialPropertyService';

interface GarmentSampleTagConfigPanelProps {
  item: Item;
  config: GarmentSampleTagConfig;
  onChange: (newConfig: GarmentSampleTagConfig) => void;
  onOpenPropertyManager: () => void;
}

interface BomCandidate {
  bomId?: number;
  itemId?: number;
  usage: string;
  itemCode: string;
  name: string;
  color: string;
  supplierName: string;
  structure: string;
  composition: string;
  weightGsm: string;
  cuttableWidth: string;
  treatment: string;
  formattedString: string;
  isCustom?: boolean;
}

// Module-level cache for BOM material details so switching garments or selecting garments is instant
const bomMaterialCache = new Map<number, any>();

export const GarmentSampleTagConfigPanel: React.FC<GarmentSampleTagConfigPanelProps> = React.memo(({
  item,
  config,
  onChange,
  onOpenPropertyManager,
}) => {
  const { t } = useTranslation();
  const [candidates, setCandidates] = useState<BomCandidate[]>([]);
  const [loadingBom, setLoadingBom] = useState(false);
  const techFileInputRef = useRef<HTMLInputElement>(null);
  const [properties, setProperties] = useState<SpecialPropertyItem[]>(() => specialPropertyService.getAll());

  useEffect(() => {
    const handleUpdate = () => {
      setProperties(specialPropertyService.getAll());
    };
    window.addEventListener('traxeco:special-properties-updated', handleUpdate);
    return () => {
      window.removeEventListener('traxeco:special-properties-updated', handleUpdate);
    };
  }, []);

  // Local working copy of config for instantaneous typing without parent re-render
  const [localConfig, setLocalConfig] = useState<GarmentSampleTagConfig>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config, item.id]);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notifyChange = useCallback((newCfg: GarmentSampleTagConfig, immediate = false) => {
    setLocalConfig(newCfg);
    if (immediate) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      onChange(newCfg);
    } else {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        onChange(newCfg);
      }, 150);
    }
  }, [onChange]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const [customPropName, setCustomPropName] = useState('');
  const [customPropIcon, setCustomPropIcon] = useState('');
  const [showAddCustomProp, setShowAddCustomProp] = useState(false);
  const customPropFileRef = useRef<HTMLInputElement>(null);
  const [editingPropIdx, setEditingPropIdx] = useState<number | null>(null);

  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/';

  // Format BOM detail line matching Excel:
  // {Supplier}/ {ItemCode}/ {Color}/ {Structure} {Composition}, {Finish/Treatment}, {GSM}GSM, {Width}"
  const formatDetailString = (c: Partial<BomCandidate>): string => {
    const supp = (c.supplierName || '').trim();
    const code = (c.itemCode || '').trim();
    const color = (c.color || '').trim();
    const struct = (c.structure || '').trim();
    const comp = (c.composition || '').trim();
    const treat = (c.treatment || '').trim();
    const gsm = c.weightGsm ? `${c.weightGsm}GSM` : '';
    const width = c.cuttableWidth ? `${c.cuttableWidth}"` : '';

    const structComp = [struct, comp].filter(Boolean).join(' ');
    const specs = [structComp, treat, gsm, width].filter(Boolean).join(', ');
    return [supp, code, color, specs].filter(Boolean).join('/ ');
  };

  // Load and enrich BOM candidates for this garment
  useEffect(() => {
    let active = true;

    const loadBom = async () => {
      setLoadingBom(true);
      const list: BomCandidate[] = [];
      const compStr = item.product?.mainComposition;

      let parsed: any[] = [];
      if (compStr && typeof compStr === 'string' && compStr.trim().startsWith('[')) {
        try {
          const arr = JSON.parse(compStr);
          if (Array.isArray(arr)) parsed = arr;
        } catch {
          // ignore
        }
      }

      // Collect missing itemIds that are not yet cached
      const missingIds = Array.from(
        new Set(
          parsed
            .map(r => r.itemId)
            .filter((id): id is number => typeof id === 'number' && !bomMaterialCache.has(id))
        )
      );

      // Fetch all missing BOM items concurrently in parallel
      if (missingIds.length > 0) {
        await Promise.allSettled(
          missingIds.map(async (id) => {
            try {
              const mat = await rdItemApi.getById(id);
              if (mat) {
                bomMaterialCache.set(id, mat);
              }
            } catch {
              // ignore
            }
          })
        );
      }

      if (!active) return;

      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i];
        const usage = row.usage || `Fabric ${i + 1}`;
        let detailObj: Partial<BomCandidate> = {
          bomId: row.id || i + 1,
          itemId: row.itemId,
          usage,
          itemCode: row.itemCode || '',
          name: row.name || '',
          color: row.color || '',
          supplierName: row.supplierName || '',
          structure: row.structure || '',
          composition: row.composition || '',
          weightGsm: row.weightGsm ? String(row.weightGsm) : '',
          cuttableWidth: row.cuttableWidth ? String(row.cuttableWidth) : '',
          treatment: row.treatment || row.function || '',
        };

        // If row has linked itemId, enrich instantly from memory cache
        if (row.itemId && bomMaterialCache.has(row.itemId)) {
          const mat = bomMaterialCache.get(row.itemId);
          const fab = mat?.fabric || {};
          const acc = mat?.accessory || {};
          detailObj = {
            ...detailObj,
            supplierName: mat?.supplierName || detailObj.supplierName,
            itemCode: mat?.itemCode || detailObj.itemCode,
            color: fab.colorName || acc.color || mat?.color || detailObj.color,
            structure: fab.structure || acc.specification || detailObj.structure,
            composition: fab.compositionDetail || fab.composition || acc.composition || detailObj.composition,
            weightGsm: fab.weightGsm ? String(fab.weightGsm) : (acc.weightGsm ? String(acc.weightGsm) : detailObj.weightGsm),
            cuttableWidth: fab.cuttableWidth ? String(fab.cuttableWidth) : (acc.size ? String(acc.size) : detailObj.cuttableWidth),
            treatment: fab.function || detailObj.treatment,
          };
        }

        list.push({
          ...detailObj as any,
          formattedString: formatDetailString(detailObj),
        });
      }

      // If no BOM items were found in mainComposition, add the item's own fabric specs if available
      if (list.length === 0) {
        const fab = item.fabric || {};
        const fallback: Partial<BomCandidate> = {
          bomId: 1,
          usage: 'Body',
          itemCode: item.itemCode || '',
          name: item.name || '',
          color: item.color || item.product?.color || fab.colorName || '',
          supplierName: item.supplierName || item.product?.allocation || '',
          structure: fab.structure || '',
          composition: item.product?.mainComposition || fab.compositionDetail || fab.composition || '',
          weightGsm: fab.weightGsm ? String(fab.weightGsm) : '',
          cuttableWidth: fab.cuttableWidth ? String(fab.cuttableWidth) : '',
          treatment: fab.function || '',
        };
        list.push({
          ...fallback as any,
          formattedString: formatDetailString(fallback),
        });
      }

      if (active) {
        // Also preserve any custom fabrics present in localConfig
        const currentCustoms: BomCandidate[] = [];
        (localConfig.fabrics || []).forEach((f, cIdx) => {
          if (f.detail && !list.some(c => c.formattedString === f.detail || (f.bomId && c.bomId === f.bomId))) {
            currentCustoms.push({
              bomId: f.bomId || (Date.now() + cIdx),
              usage: cleanUsage(f.label) || `${t('rdMaterial.custom_fabric', 'Vải tùy chỉnh')} ${cIdx + 1}`,
              name: cleanUsage(f.label) || t('rdMaterial.custom_fabric', 'Vải tùy chỉnh'),
              itemCode: f.itemCode || '',
              color: '',
              supplierName: '',
              structure: '',
              composition: '',
              weightGsm: '',
              cuttableWidth: '',
              treatment: '',
              formattedString: f.detail,
              isCustom: true,
            });
          }
        });
        setCandidates([...list, ...currentCustoms]);
        setLoadingBom(false);
      }
    };

    loadBom();

    return () => {
      active = false;
    };
  }, [item]);

  // Helper: clean usage string
  const cleanUsage = (usage?: string): string => {
    if (!usage) return '';
    return usage.replace(/^Fabric\s*[A-Z]?\s*[-:]?\s*/i, '').trim();
  };

  const [editingSlot, setEditingSlot] = useState<'A' | 'B' | 'C' | null>(null);

  const currentFabrics = localConfig.fabrics || [];
  const slotA = currentFabrics.find(f => f.slot === 'A');
  const slotB = currentFabrics.find(f => f.slot === 'B');
  const slotC = currentFabrics.find(f => f.slot === 'C');

  // Pre-computed map for instant O(1) candidate slot lookup
  const candidateSlotMap = useMemo(() => {
    const map = new Map<any, number>();
    const slotNames: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
    slotNames.forEach((s, idx) => {
      const slotObj = currentFabrics.find(f => f.slot === s);
      if (slotObj && slotObj.detail) {
        if (slotObj.bomId != null) map.set(`bom-${slotObj.bomId}`, idx);
        if (slotObj.itemCode) map.set(`code-${slotObj.itemCode}`, idx);
        if (slotObj.detail) map.set(`detail-${slotObj.detail}`, idx);
      }
    });
    return map;
  }, [currentFabrics]);

  // Find which slot index (0 for A, 1 for B, 2 for C) a candidate is currently assigned to (-1 if not assigned)
  const getCandidateSlotIndex = (cand: BomCandidate): number => {
    if (cand.bomId != null && candidateSlotMap.has(`bom-${cand.bomId}`)) {
      return candidateSlotMap.get(`bom-${cand.bomId}`)!;
    }
    if (cand.itemCode && candidateSlotMap.has(`code-${cand.itemCode}`)) {
      return candidateSlotMap.get(`code-${cand.itemCode}`)!;
    }
    if (cand.formattedString && candidateSlotMap.has(`detail-${cand.formattedString}`)) {
      return candidateSlotMap.get(`detail-${cand.formattedString}`)!;
    }
    return -1;
  };

  // Count active slots
  const activeSlotsCount = useMemo(() => {
    return currentFabrics.filter(f => !!f.detail).length;
  }, [currentFabrics]);

  // Handle toggle candidate checkbox (Check -> assign next available slot A/B/C; Uncheck -> remove and shift)
  const handleToggleCandidate = (cand: BomCandidate) => {
    const slotIdx = getCandidateSlotIndex(cand);
    const fabrics: GarmentTagFabricSlot[] = localConfig.fabrics ? [...localConfig.fabrics] : [];

    // Ensure slots A, B, C exist
    ['A', 'B', 'C'].forEach(s => {
      if (!fabrics.find(f => f.slot === s)) {
        const defLabel = s === 'A' ? 'Fabric A- Body' : s === 'B' ? 'Fabric B- Mesh' : 'Fabric C-';
        fabrics.push({ slot: s as any, label: defLabel, detail: '' });
      }
    });

    if (slotIdx !== -1) {
      // Uncheck: remove candidate and shift remaining active slots
      const activeList = fabrics.filter(f => !!f.detail);
      activeList.splice(slotIdx, 1);

      const slotLetters: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
      const newFabrics: GarmentTagFabricSlot[] = slotLetters.map((letter, idx) => {
        const existing = activeList[idx];
        if (existing) {
          const usage = cleanUsage(existing.label);
          const defaultUsage = letter === 'A' ? 'Body' : letter === 'B' ? 'Mesh' : '';
          return {
            slot: letter,
            label: `Fabric ${letter}- ${usage || defaultUsage}`,
            detail: existing.detail,
            bomId: existing.bomId,
            itemCode: existing.itemCode,
          };
        }
        return {
          slot: letter,
          label: letter === 'A' ? 'Fabric A- Body' : letter === 'B' ? 'Fabric B- Mesh' : 'Fabric C-',
          detail: '',
        };
      });

      if (editingSlot) setEditingSlot(null);
      notifyChange({ ...localConfig, fabrics: newFabrics }, true);
    } else {
      // Check: assign to next available slot
      const activeList = fabrics.filter(f => !!f.detail);
      if (activeList.length >= 3) return; // Max 3 items

      const nextLetter: 'A' | 'B' | 'C' = activeList.length === 0 ? 'A' : activeList.length === 1 ? 'B' : 'C';
      const usage = cleanUsage(cand.usage);
      const defaultUsage = nextLetter === 'A' ? 'Body' : nextLetter === 'B' ? 'Mesh' : '';
      const label = `Fabric ${nextLetter}- ${usage || defaultUsage}`;

      const targetIdx = fabrics.findIndex(f => f.slot === nextLetter);
      const updatedSlot: GarmentTagFabricSlot = {
        slot: nextLetter,
        label,
        detail: cand.formattedString,
        bomId: cand.bomId,
        itemCode: cand.itemCode,
      };

      if (targetIdx !== -1) {
        fabrics[targetIdx] = updatedSlot;
      } else {
        fabrics.push(updatedSlot);
      }

      notifyChange({ ...localConfig, fabrics: [...fabrics] }, true);
    }
  };

  // Reorder / swap slots (e.g. swap slot 0 (A) and 1 (B))
  const handleSwapSlots = (idx1: number, idx2: number) => {
    const slotLetters: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
    const letter1 = slotLetters[idx1];
    const letter2 = slotLetters[idx2];
    const fabrics: GarmentTagFabricSlot[] = localConfig.fabrics ? [...localConfig.fabrics] : [];
    const item1 = fabrics.find(f => f.slot === letter1);
    const item2 = fabrics.find(f => f.slot === letter2);

    if (item1 && item2) {
      const tempDetail = item1.detail;
      const tempBomId = item1.bomId;
      const tempItemCode = item1.itemCode;
      const usage1 = cleanUsage(item1.label);
      const usage2 = cleanUsage(item2.label);

      item1.detail = item2.detail;
      item1.bomId = item2.bomId;
      item1.itemCode = item2.itemCode;
      item1.label = `Fabric ${letter1}- ${usage2 || (letter1 === 'A' ? 'Body' : letter1 === 'B' ? 'Mesh' : '')}`;

      item2.detail = tempDetail;
      item2.bomId = tempBomId;
      item2.itemCode = tempItemCode;
      item2.label = `Fabric ${letter2}- ${usage1 || (letter2 === 'A' ? 'Body' : letter2 === 'B' ? 'Mesh' : '')}`;

      notifyChange({ ...localConfig, fabrics: [...fabrics] }, true);
    }
  };

  // Update custom fields when editing
  const handleUpdateSlotField = (slot: 'A' | 'B' | 'C', field: 'label' | 'detail', value: string) => {
    const fabrics: GarmentTagFabricSlot[] = localConfig.fabrics ? [...localConfig.fabrics] : [];
    const target = fabrics.find(f => f.slot === slot);
    if (target) {
      target[field] = value;
      notifyChange({ ...localConfig, fabrics: [...fabrics] }, false);
    }
  };

  // Helper to check if a candidate is custom-added
  const isCustomCandidate = (cand: BomCandidate): boolean => {
    if (cand.isCustom) return true;
    const lowerUsage = String(cand.usage || '').toLowerCase();
    const lowerName = String(cand.name || '').toLowerCase();
    if (!cand.itemId && (lowerUsage.includes('tùy chỉnh') || lowerUsage.includes('custom'))) return true;
    if (!cand.itemId && (lowerName.includes('tùy chỉnh') || lowerName.includes('custom'))) return true;
    return false;
  };

  // Add custom fabric beyond BOM
  const handleAddCustomFabric = () => {
    const customId = Date.now();
    const customCount = candidates.filter(c => isCustomCandidate(c)).length + 1;
    const newCand: BomCandidate = {
      bomId: customId,
      usage: `${t('rdMaterial.custom_fabric', 'Vải tùy chỉnh')} ${customCount}`,
      itemCode: '',
      name: t('rdMaterial.custom_fabric', 'Vải tùy chỉnh'),
      color: '',
      supplierName: '',
      structure: '',
      composition: '',
      weightGsm: '',
      cuttableWidth: '',
      treatment: '',
      formattedString: t('rdMaterial.custom_fabric_spec', 'Thông số vải tùy chỉnh'),
      isCustom: true,
    };
    setCandidates(prev => [...prev, newCand]);
    handleToggleCandidate(newCand);
  };

  // Delete a custom fabric completely from candidates and active slots
  const handleDeleteCustomFabric = (cand: BomCandidate) => {
    // 1. If assigned to a slot, unassign and shift slots
    const slotIdx = getCandidateSlotIndex(cand);
    if (slotIdx !== -1) {
      const fabrics: GarmentTagFabricSlot[] = localConfig.fabrics ? [...localConfig.fabrics] : [];
      const activeList = fabrics.filter(f => !!f.detail);
      activeList.splice(slotIdx, 1);

      const slotLetters: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
      const newFabrics: GarmentTagFabricSlot[] = slotLetters.map((letter, idx) => {
        const existing = activeList[idx];
        if (existing) {
          const usage = cleanUsage(existing.label);
          const defaultUsage = letter === 'A' ? 'Body' : letter === 'B' ? 'Mesh' : '';
          return {
            slot: letter,
            label: `Fabric ${letter}- ${usage || defaultUsage}`,
            detail: existing.detail,
            bomId: existing.bomId,
            itemCode: existing.itemCode,
          };
        }
        return {
          slot: letter,
          label: letter === 'A' ? 'Fabric A- Body' : letter === 'B' ? 'Fabric B- Mesh' : 'Fabric C-',
          detail: '',
        };
      });

      if (editingSlot) setEditingSlot(null);
      notifyChange({ ...localConfig, fabrics: newFabrics }, true);
    }

    // 2. Remove from candidates list
    setCandidates(prev => prev.filter(c => {
      if (cand.bomId != null && c.bomId === cand.bomId) return false;
      if (c === cand) return false;
      return true;
    }));
  };

  // Current Special Properties list (supports multiple)
  const currentProperties = useMemo<GarmentTagSpecialPropertyItem[]>(() => {
    if (localConfig.specialProperties && Array.isArray(localConfig.specialProperties)) {
      return localConfig.specialProperties;
    }
    if (localConfig.specialProperty && localConfig.specialProperty.name) {
      return [localConfig.specialProperty];
    }
    return [
      {
        id: 'prop-water-repellent',
        name: 'Water repellent',
        iconUrl: `${baseUrl}sample-tag/water_repellency.png`,
      }
    ];
  }, [localConfig.specialProperties, localConfig.specialProperty, baseUrl]);

  // Fast pre-computed set for instant O(1) selected check
  const selectedPropSet = useMemo(() => {
    const set = new Set<string>();
    currentProperties.forEach(p => {
      if (p.id) set.add(p.id.toLowerCase());
      if (p.name) set.add(p.name.trim().toLowerCase());
    });
    return set;
  }, [currentProperties]);

  // Check if a catalog property is currently selected
  const isPropertySelected = (prop: SpecialPropertyItem) => {
    return (
      (prop.id ? selectedPropSet.has(prop.id.toLowerCase()) : false) ||
      (prop.name ? selectedPropSet.has(prop.name.trim().toLowerCase()) : false)
    );
  };

  // Toggle selection of a property from catalog
  const handleToggleProperty = (prop: SpecialPropertyItem) => {
    const isSelected = isPropertySelected(prop);
    let updated: GarmentTagSpecialPropertyItem[];
    if (isSelected) {
      updated = currentProperties.filter(
        p => (p.id ? p.id !== prop.id : true) && p.name.trim().toLowerCase() !== prop.name.trim().toLowerCase()
      );
    } else {
      updated = [
        ...currentProperties,
        {
          id: prop.id,
          name: prop.name,
          iconUrl: prop.iconUrl,
        }
      ];
    }
    notifyChange({
      ...localConfig,
      specialProperties: updated,
      specialProperty: updated[0] || undefined,
    }, true);
  };

  // Remove a property by index
  const handleRemoveProperty = (index: number) => {
    const updated = [...currentProperties];
    updated.splice(index, 1);
    if (editingPropIdx === index) setEditingPropIdx(null);
    notifyChange({
      ...localConfig,
      specialProperties: updated,
      specialProperty: updated[0] || undefined,
    }, true);
  };

  // Swap / reorder properties
  const handleSwapProperties = (idx1: number, idx2: number) => {
    if (idx1 < 0 || idx2 < 0 || idx1 >= currentProperties.length || idx2 >= currentProperties.length) return;
    const updated = [...currentProperties];
    const temp = updated[idx1];
    updated[idx1] = updated[idx2];
    updated[idx2] = temp;
    notifyChange({
      ...localConfig,
      specialProperties: updated,
      specialProperty: updated[0] || undefined,
    }, true);
  };

  // Edit custom name of a selected property
  const handleUpdatePropertyName = (index: number, newName: string) => {
    const updated = [...currentProperties];
    if (updated[index]) {
      updated[index] = { ...updated[index], name: newName };
      notifyChange({
        ...localConfig,
        specialProperties: updated,
        specialProperty: updated[0] || undefined,
      }, false);
    }
  };

  // Add custom property outside catalog
  const handleAddCustomProp = () => {
    if (!customPropName.trim()) return;
    const newProp: GarmentTagSpecialPropertyItem = {
      id: `custom-prop-${Date.now()}`,
      name: customPropName.trim(),
      iconUrl: customPropIcon || `${baseUrl}sample-tag/water_repellency.png`,
    };
    const updated = [...currentProperties, newProp];
    notifyChange({
      ...localConfig,
      specialProperties: updated,
      specialProperty: updated[0] || undefined,
    }, true);
    setCustomPropName('');
    setCustomPropIcon('');
    setShowAddCustomProp(false);
  };

  // Handle Technology Icon File Upload
  const handleTechImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        notifyChange({
          ...localConfig,
          technology: {
            name: localConfig.technology?.name || item.product?.technology || 'TEXTILE TO TEXTILE',
            iconUrl: base64,
          }
        }, true);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* 1. Date Field */}
      <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} color="#0f172a" mb={1}>
          {t('rdMaterial.labelPrint.sec1_title', '1. Ngày in (Date)')}
        </Typography>
        <TextField
          fullWidth
          size="small"
          type="date"
          label={t('rdMaterial.labelPrint.sec1_date_label', 'Ngày in trên thẻ')}
          value={localConfig.date || new Date().toISOString().split('T')[0]}
          onChange={(e) => notifyChange({ ...localConfig, date: e.target.value }, false)}
          InputLabelProps={{ shrink: true }}
        />
      </Card>

      {/* 2. Fabric Selection - Clean Checkbox based */}
      <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
            {t('rdMaterial.labelPrint.sec2_title', '2. Chọn vải hiển thị (Fabric Information)')}
          </Typography>
          <Chip
            label={t('rdMaterial.labelPrint.sec2_selected_count', { count: activeSlotsCount, defaultValue: `Đã chọn: ${activeSlotsCount}/3 vị trí` })}
            size="small"
            color={activeSlotsCount > 0 ? 'success' : 'default'}
            sx={{ fontWeight: 700 }}
          />
        </Box>

        {/* Checkbox List */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {candidates.map((cand, idx) => {
            const slotIdx = getCandidateSlotIndex(cand);
            const isChecked = slotIdx !== -1;
            const slotLetter: 'A' | 'B' | 'C' | null = isChecked ? (slotIdx === 0 ? 'A' : slotIdx === 1 ? 'B' : 'C') : null;
            const isDisabled = !isChecked && activeSlotsCount >= 3;
            const isEditing = editingSlot === slotLetter;
            const currentSlotObj = slotLetter ? currentFabrics.find(f => f.slot === slotLetter) : null;
            const isCustom = isCustomCandidate(cand);

            return (
              <Box
                key={cand.bomId ? `bom-${cand.bomId}` : `cand-${cand.itemCode}-${idx}`}
                sx={{
                  p: 1.25,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: isChecked
                    ? (slotLetter === 'A' ? '#16a34a' : slotLetter === 'B' ? '#2563eb' : '#9333ea')
                    : '#e2e8f0',
                  bgcolor: isChecked
                    ? (slotLetter === 'A' ? '#f0fdf4' : slotLetter === 'B' ? '#eff6ff' : '#faf5ff')
                    : '#ffffff',
                  opacity: isDisabled ? 0.5 : 1,
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  {/* Checkbox */}
                  <Checkbox
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => handleToggleCandidate(cand)}
                    color={slotLetter === 'A' ? 'success' : slotLetter === 'B' ? 'primary' : 'secondary'}
                    sx={{ p: 0.5, mt: -0.25 }}
                  />

                  {/* Info */}
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isChecked && slotLetter && (
                          <Chip
                            label={`Fabric ${slotLetter}${slotLetter === 'A' ? ` (${t('rdMaterial.main', 'Chính')})` : slotLetter === 'B' ? ` (${t('rdMaterial.combo', 'Phối')})` : ` (${t('rdMaterial.trim', 'Phụ')})`}`}
                            size="small"
                            color={slotLetter === 'A' ? 'success' : slotLetter === 'B' ? 'primary' : 'secondary'}
                            sx={{ height: 22, fontSize: 11, fontWeight: 800 }}
                          />
                        )}
                        <Typography variant="body2" fontWeight={700} color="#0f172a">
                          {cand.usage}: {cand.itemCode || cand.name}
                        </Typography>
                      </Box>

                      {/* Controls for checked item: Up/Down reorder + Edit + Delete */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {isChecked && slotLetter && (
                          <>
                            {slotIdx > 0 && (
                              <Tooltip title={t('rdMaterial.move_up', 'Đổi lên vị trí trước')}>
                                <IconButton size="small" onClick={() => handleSwapSlots(slotIdx, slotIdx - 1)} sx={{ p: 0.5 }}>
                                  <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {slotIdx < activeSlotsCount - 1 && (
                              <Tooltip title={t('rdMaterial.move_down', 'Đổi xuống vị trí sau')}>
                                <IconButton size="small" onClick={() => handleSwapSlots(slotIdx, slotIdx + 1)} sx={{ p: 0.5 }}>
                                  <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title={isEditing ? t('rdMaterial.labelPrint.sec2_close_edit', 'Đóng chỉnh sửa') : t('rdMaterial.labelPrint.sec2_edit_content', 'Chỉnh sửa nội dung in')}>
                              <Button
                                size="small"
                                variant={isEditing ? 'contained' : 'outlined'}
                                color={slotLetter === 'A' ? 'success' : slotLetter === 'B' ? 'primary' : 'secondary'}
                                startIcon={isEditing ? <CheckIcon sx={{ fontSize: 13 }} /> : <EditIcon sx={{ fontSize: 13 }} />}
                                onClick={() => setEditingSlot(isEditing ? null : slotLetter)}
                                sx={{ py: 0, px: 0.75, minWidth: 0, fontSize: 11, textTransform: 'none', height: 24 }}
                              >
                                {isEditing ? t('common.done', 'Xong') : t('rdMaterial.labelPrint.sec2_edit', 'Sửa')}
                              </Button>
                            </Tooltip>
                          </>
                        )}

                        {/* Delete button for custom fabric */}
                        {isCustom && (
                          <Tooltip title={t('rdMaterial.labelPrint.sec2_delete_custom', 'Xóa loại vải tùy chỉnh này')}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomFabric(cand);
                              }}
                              sx={{
                                p: 0.5,
                                width: 24,
                                height: 24,
                                bgcolor: isChecked ? '#fee2e2' : '#f1f5f9',
                                color: '#dc2626',
                                '&:hover': { bgcolor: '#fca5a5', color: '#b91c1c' }
                              }}
                            >
                              <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>

                    {/* Spec string preview */}
                    <Typography variant="caption" sx={{ color: '#475569', fontSize: 11, display: 'block', wordBreak: 'break-word', lineHeight: 1.3 }}>
                      {currentSlotObj?.detail || cand.formattedString || '—'}
                    </Typography>

                    {/* Expandable Editor when clicking "Sửa" */}
                    {isChecked && slotLetter && (
                      <Collapse in={isEditing}>
                        <Box sx={{ mt: 1.25, pt: 1, borderTop: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label={t('rdMaterial.labelPrint.fabric_slot_label_with_slot', { slot: slotLetter, usage: cleanUsage(cand.usage) || 'Body', defaultValue: `Tiêu đề thẻ (VD: Fabric ${slotLetter}- ${cleanUsage(cand.usage) || 'Body'})` })}
                            value={currentSlotObj?.label || ''}
                            onChange={(e) => handleUpdateSlotField(slotLetter, 'label', e.target.value)}
                            sx={{ '& .MuiInputBase-input': { fontSize: 12, fontWeight: 700 } }}
                          />
                          <TextField
                            fullWidth
                            size="small"
                            multiline
                            rows={2}
                            label={t('rdMaterial.labelPrint.fabric_slot_spec', 'Nội dung thông số in trên thẻ')}
                            value={currentSlotObj?.detail || ''}
                            onChange={(e) => handleUpdateSlotField(slotLetter, 'detail', e.target.value)}
                            sx={{ '& .MuiInputBase-input': { fontSize: 12 } }}
                          />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                            {isCustom ? (
                              <Button
                                size="small"
                                color="error"
                                variant="text"
                                startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
                                onClick={() => handleDeleteCustomFabric(cand)}
                                sx={{ fontSize: 11, textTransform: 'none', color: '#dc2626' }}
                              >
                                {t('rdMaterial.labelPrint.sec2_delete_custom', 'Xóa loại vải này')}
                              </Button>
                            ) : (
                              <Box />
                            )}
                            {!isCustom && (
                              <Button
                                size="small"
                                variant="text"
                                color="inherit"
                                onClick={() => {
                                  handleUpdateSlotField(slotLetter, 'detail', cand.formattedString);
                                  const usage = cleanUsage(cand.usage);
                                  const defaultUsage = slotLetter === 'A' ? 'Body' : slotLetter === 'B' ? 'Mesh' : '';
                                  handleUpdateSlotField(slotLetter, 'label', `Fabric ${slotLetter}- ${usage || defaultUsage}`);
                                }}
                                sx={{ fontSize: 11, textTransform: 'none', color: '#64748b' }}
                              >
                                {t('rdMaterial.labelPrint.sec2_restore_bom', 'Khôi phục từ BOM gốc')}
                              </Button>
                            )}
                          </Box>
                        </Box>
                      </Collapse>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Add custom fabric option */}
        <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={handleAddCustomFabric}
            disabled={activeSlotsCount >= 3}
            sx={{ textTransform: 'none', fontSize: 12 }}
          >
            {t('rdMaterial.labelPrint.sec2_add_custom', '+ Thêm loại vải khác ngoài BOM')}
          </Button>
          {activeSlotsCount >= 3 && (
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              ({t('rdMaterial.labelPrint.max_slots_reached', 'Đã chọn đủ 3/3 vị trí')})
            </Typography>
          )}
        </Box>
      </Card>

      {/* 3. Special Property Selection - Multiple selection with image on top, text below */}
      <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: 13, lineHeight: 1.2 }}>
              {t('rdMaterial.labelPrint.sec3_title', '3. Chọn Special Property')}
            </Typography>
            <Chip
              label={t('rdMaterial.labelPrint.sec3_selected_count', { count: currentProperties.length, defaultValue: `Đã chọn: ${currentProperties.length}` })}
              size="small"
              color={currentProperties.length > 0 ? (currentProperties.length <= 4 ? 'success' : 'warning') : 'default'}
              sx={{ fontWeight: 700, height: 20, fontSize: 10.5 }}
            />
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<SettingsIcon sx={{ fontSize: 14 }} />}
            onClick={onOpenPropertyManager}
            sx={{
              textTransform: 'none',
              fontSize: 11.5,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              borderRadius: '6px',
              py: 0.4,
              px: 1,
              borderColor: '#cbd5e1',
              color: '#15803d',
              bgcolor: '#ffffff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              '&:hover': { borderColor: '#16a34a', bgcolor: '#f0fdf4' },
            }}
          >
            {t('rdMaterial.labelPrint.sec3_manage', 'Quản lý danh mục')}
          </Button>
        </Box>

        {/* Selected Properties Preview Row (Image on top, text below) */}
        {currentProperties.length > 0 ? (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px dashed #cbd5e1' }}>
            <Typography variant="caption" fontWeight={700} color="#334155" sx={{ display: 'block', mb: 1 }}>
              {t('rdMaterial.labelPrint.sec3_tag_preview', 'Các tính năng sẽ in lên thẻ (hình trên, chữ dưới):')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {currentProperties.map((prop, idx) => {
                const isEditingThis = editingPropIdx === idx;
                return (
                  <Box
                    key={prop.id || `selected-prop-${idx}`}
                    sx={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      textAlign: 'center',
                      p: 1,
                      pt: 2.2,
                      width: 110,
                      bgcolor: '#ffffff',
                      border: '1.5px solid #16a34a',
                      borderRadius: 1.5,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    {/* Remove button */}
                    <Tooltip title={t('common.remove', 'Bỏ chọn tính năng này')}>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveProperty(idx)}
                        sx={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          p: 0.25,
                          bgcolor: '#fee2e2',
                          color: '#dc2626',
                          '&:hover': { bgcolor: '#fca5a5' }
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Tooltip>

                    {/* Image on top */}
                    <Box sx={{ height: 40, width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
                      {prop.iconUrl ? (
                        <img
                          src={prop.iconUrl}
                          alt={prop.name}
                          style={{ maxHeight: 36, maxWidth: 44, objectFit: 'contain' }}
                          onError={(e) => {
                            const img = e.currentTarget;
                            img.style.display = 'none';
                            const fb = img.nextElementSibling as HTMLElement;
                            if (fb) fb.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <Box
                        sx={{
                          display: prop.iconUrl ? 'none' : 'flex',
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          border: '1.5px solid #16a34a',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 800,
                          color: '#15803d',
                          bgcolor: '#f0fdf4',
                        }}
                      >
                        {prop.name.charAt(0).toUpperCase()}
                      </Box>
                    </Box>

                    {/* Text below (image on top, text below) */}
                    {isEditingThis ? (
                      <Box sx={{ mt: 0.5, width: '100%' }}>
                        <TextField
                          fullWidth
                          size="small"
                          value={prop.name}
                          onChange={(e) => handleUpdatePropertyName(idx, e.target.value)}
                          sx={{ '& .MuiInputBase-input': { fontSize: 10.5, p: '2px 4px', textAlign: 'center' } }}
                        />
                        <Button
                          size="small"
                          variant="text"
                          color="success"
                          onClick={() => setEditingPropIdx(null)}
                          sx={{ fontSize: 10, py: 0, textTransform: 'none', mt: 0.25 }}
                        >
                          {t('common.done', 'Xong')}
                        </Button>
                      </Box>
                    ) : (
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        color="#0f172a"
                        sx={{
                          fontSize: 10.5,
                          lineHeight: 1.15,
                          textAlign: 'center',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          minHeight: 25,
                        }}
                      >
                        {prop.name}
                      </Typography>
                    )}

                    {/* Controls: Reorder + Edit */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      {idx > 0 && (
                        <Tooltip title={t('rdMaterial.move_left', 'Đổi vị trí sang trái')}>
                          <IconButton size="small" onClick={() => handleSwapProperties(idx, idx - 1)} sx={{ p: 0.25 }}>
                            <ArrowBackIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {!isEditingThis && (
                        <Tooltip title={t('common.edit_feature', 'Sửa tên tính năng')}>
                          <IconButton size="small" onClick={() => setEditingPropIdx(idx)} sx={{ p: 0.25 }}>
                            <EditIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {idx < currentProperties.length - 1 && (
                        <Tooltip title={t('rdMaterial.move_right', 'Đổi vị trí sang phải')}>
                          <IconButton size="small" onClick={() => handleSwapProperties(idx, idx + 1)} sx={{ p: 0.25 }}>
                            <ArrowForwardIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        ) : (
          <Alert severity="info" sx={{ mb: 2, py: 0.5, fontSize: 12 }}>
            {t('rdMaterial.labelPrint.no_props_selected', 'Chưa có tính năng nào được chọn. Nhấp vào các thẻ bên dưới để thêm vào thẻ in.')}
          </Alert>
        )}

        {/* Catalog: Grid of available properties to toggle */}
        <Typography variant="caption" fontWeight={700} color="#475569" sx={{ display: 'block', mb: 1 }}>
          {t('rdMaterial.labelPrint.sec3_available', 'Danh mục tính năng sẵn có (Nhấp để chọn / bỏ chọn):')}
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: 1 }}>
          {properties.map((prop) => {
            const selected = isPropertySelected(prop);
            return (
              <Box
                key={prop.id}
                onClick={() => handleToggleProperty(prop)}
                sx={{
                  position: 'relative',
                  p: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderRadius: 1.5,
                  border: '1.5px solid',
                  borderColor: selected ? '#16a34a' : '#e2e8f0',
                  bgcolor: selected ? '#f0fdf4' : '#ffffff',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: selected ? '#15803d' : '#94a3b8',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                  }
                }}
              >
                {selected && (
                  <CheckCircleIcon
                    color="success"
                    sx={{ position: 'absolute', top: 4, right: 4, fontSize: 16 }}
                  />
                )}
                {/* Image on top */}
                <Box sx={{ height: 38, width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
                  {prop.iconUrl ? (
                    <img
                      src={prop.iconUrl}
                      alt={prop.name}
                      style={{ maxHeight: 34, maxWidth: 42, objectFit: 'contain' }}
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.style.display = 'none';
                        const fb = img.nextElementSibling as HTMLElement;
                        if (fb) fb.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <Box
                    sx={{
                      display: prop.iconUrl ? 'none' : 'flex',
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      border: '1.5px solid #64748b',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                      color: '#475569',
                      bgcolor: '#f1f5f9',
                    }}
                  >
                    {prop.name.charAt(0).toUpperCase()}
                  </Box>
                </Box>
                {/* Text below */}
                <Typography
                  variant="caption"
                  fontWeight={selected ? 700 : 600}
                  color={selected ? '#15803d' : '#334155'}
                  sx={{
                    fontSize: 10.5,
                    lineHeight: 1.15,
                    textAlign: 'center',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {prop.name}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Quick Custom Property Toggle */}
        <Box sx={{ mt: 1.5 }}>
          <Button
            size="small"
            variant="text"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => setShowAddCustomProp(!showAddCustomProp)}
            sx={{ textTransform: 'none', fontSize: 12, color: '#475569' }}
          >
            {showAddCustomProp ? t('common.close', 'Đóng') : t('rdMaterial.labelPrint.sec3_add_quick', '+ Thêm tính năng nhanh ngoài danh mục')}
          </Button>

          <Collapse in={showAddCustomProp}>
            <Box sx={{ mt: 1, p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                label={t('rdMaterial.labelPrint.custom_prop_name', 'Tên tính năng (VD: Super Stretch, Odor Free...)')}
                value={customPropName}
                onChange={(e) => setCustomPropName(e.target.value)}
                sx={{ '& .MuiInputBase-input': { fontSize: 12 } }}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CloudUploadIcon sx={{ fontSize: 14 }} />}
                  onClick={() => customPropFileRef.current?.click()}
                  sx={{ textTransform: 'none', fontSize: 11 }}
                >
                  {customPropIcon ? t('rdMaterial.labelPrint.sec4_change_icon', 'Đổi ảnh icon') : t('rdMaterial.upload_icon', 'Upload ảnh icon')}
                </Button>
                <input
                  type="file"
                  ref={customPropFileRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) setCustomPropIcon(ev.target.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {customPropIcon && (
                  <img src={customPropIcon} alt="Preview" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                )}
                <Box sx={{ flexGrow: 1 }} />
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  disabled={!customPropName.trim()}
                  onClick={handleAddCustomProp}
                  sx={{ textTransform: 'none', fontSize: 11 }}
                >
                  {t('rdMaterial.add_to_tag', 'Thêm vào thẻ')}
                </Button>
              </Box>
            </Box>
          </Collapse>
        </Box>
      </Card>

      {/* 4. Technology Selection & Upload */}
      <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} color="#0f172a" mb={1}>
          {t('rdMaterial.labelPrint.sec4_title', '4. Technology')}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {/* Tech badge icon preview */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Avatar
              src={localConfig.technology?.iconUrl || `${baseUrl}sample-tag/textile_to_textile.png`}
              variant="rounded"
              sx={{
                width: 48,
                height: 48,
                bgcolor: '#ffffff',
                border: '1.5px solid #cbd5e1',
                p: 0.5,
                '& img': { objectFit: 'contain' }
              }}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<CloudUploadIcon sx={{ fontSize: 14 }} />}
              onClick={() => techFileInputRef.current?.click()}
              sx={{ fontSize: 10, textTransform: 'none', px: 1, py: 0.25 }}
            >
              {t('rdMaterial.labelPrint.sec4_change_icon', 'Đổi ảnh icon')}
            </Button>
            <input
              type="file"
              ref={techFileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleTechImageUpload}
            />
          </Box>

          <Box sx={{ flexGrow: 1 }}>
            <TextField
              fullWidth
              size="small"
              label={t('rdMaterial.labelPrint.sec4_name_label', 'Tên công nghệ (Technology Name)')}
              value={localConfig.technology?.name !== undefined ? localConfig.technology.name : (item.product?.technology || 'TEXTILE TO TEXTILE')}
              onChange={(e) => notifyChange({
                ...localConfig,
                technology: {
                  name: e.target.value,
                  iconUrl: localConfig.technology?.iconUrl || `${baseUrl}sample-tag/textile_to_textile.png`,
                }
              }, false)}
            />
          </Box>
        </Box>
      </Card>

      {/* 5. Special Features */}
      <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} color="#0f172a" mb={1}>
          {t('rdMaterial.labelPrint.sec5_title', '5. Special Features (Ghi chú tính năng nổi bật)')}
        </Typography>
        <TextField
          fullWidth
          size="small"
          multiline
          rows={2}
          label={t('rdMaterial.labelPrint.sec5_content_label', 'Nội dung Special Features')}
          value={localConfig.specialFeatures !== undefined ? localConfig.specialFeatures : (item.description || item.remark || '')}
          onChange={(e) => notifyChange({ ...localConfig, specialFeatures: e.target.value }, false)}
          placeholder="VD: Innovation Click-TRAK® Magnetic Zipper, enables quick one-handed closure..."
        />
      </Card>
    </Box>
  );
});

GarmentSampleTagConfigPanel.displayName = 'GarmentSampleTagConfigPanel';

export default GarmentSampleTagConfigPanel;
