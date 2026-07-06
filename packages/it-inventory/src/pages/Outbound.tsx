import PdfImportPage from '../components/PdfImportPage.tsx';

export default function Pengeluaran() {
  return <PdfImportPage titleKey="nav.pengeluaran" sectionKey="pengeluaran" fileType="pengeluaran" pagePath="/pengeluaran" kdKegiatan="31" hintText="(Hỗ trợ tải lên: BC 2.5, BC 2.6.1, BC 3.0, BC 2.7, BC 4.1)" />;
}
