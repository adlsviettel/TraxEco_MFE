import GenericItemList from '../components/GenericItemList';
import type { ColumnDef } from '../components/GenericItemList';
import { useTranslation } from 'react-i18next';

export const ArchivePage = () => {
  const { t } = useTranslation();
  const cols: ColumnDef[] = [
    { header: 'Type', render: (item) => item.itemType || '-' },
    { header: 'Category', render: (item) => item.category || '-' },
    { header: 'Supplier', render: (item) => item.supplierName || '-' },
    { header: 'Holder', render: (item) => item.holder || '-' },
  ];
  const fields = [
    { name: 'description', label: 'Description', block: 'main' as const, type: 'multiline' as const, fullWidth: true },
  ];
  return <GenericItemList title="Archive" subtitle={t('rdMaterial.generic_subtitle_archive', 'Discontinued or archived items')} itemType="ARCHIVE" baseRoute="/rd-material/archive" columns={cols} formFields={fields} />;
};

// ─── PRODUCT (Garment / Mockup) ───────────────────────────────────────────────
// Mindmap: Picture(Sticker+Sample), Project name,
//          Category (Tops/Pants/Jackets/Polo) [garmentCategory],
//          Sport Category (Golf/Running/Training) [sportCategory],
//          Style number [styleNo] → Style name, Size, Sample stage (Mock up/1st proto/2nd proto),
//          Color, Quantity, Pattern Marker, Allocation (Puma SR/Adidas SR/R&D...),
//          Fabric Composition (Main, Lining), FOB price (USD/pcs), Location, Holder, Remark

export default ArchivePage;
