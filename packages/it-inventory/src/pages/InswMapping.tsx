import { useTranslation } from 'react-i18next';
import Header from '../components/Header.tsx';
import InswMappingManager from '../components/InswMappingManager.tsx';

export default function InswMapping() {
  const { t } = useTranslation();

  return (
    <div className="page">
      <Header title={t('insw_mapping.title', 'INSW Kategori Mapping')} />
      <div className="page-body">
        <InswMappingManager />
      </div>
    </div>
  );
}
