import GenericItemList from '../components/GenericItemList';
import type { ColumnDef } from '../components/GenericItemList';
import { useTranslation } from 'react-i18next';

export const ConceptPage = () => {
  const { t } = useTranslation();
  const cols: ColumnDef[] = [
    { header: 'Name', render: (item) => item.name || '-' },
    { header: 'Description', render: (item) => item.description || '-' },
  ];
  const fields = [
    { name: 'remark', label: 'Item List (Fabric Reference)', block: 'main' as const, fullWidth: true },
  ];
  // Name & Description handled by MODULE_CONFIG (showDescription:true)
  return <GenericItemList title="Concepts" subtitle={t('rdMaterial.generic_subtitle_concept', 'Inspirational assets linked to fabric hangers')} itemType="CONCEPT" baseRoute="/rd-material/concept" columns={cols} formFields={fields} />;
};

// ─── SAMPLE YARDAGE ──────────────────────────────────────────────────────────
// Mindmap: ItemList (pull info from Fabric hanger), Color, Q'ty of yardage, Yardage location
// Color → stored in item.category (pragmatic choice, no sub-table for Yardage)
// Qty   → item.quantity (label managed by MODULE_CONFIG: "Q'ty of yardage")
// Location → item.location (label managed by MODULE_CONFIG: "Yardage location")

export default ConceptPage;
