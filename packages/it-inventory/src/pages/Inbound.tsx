import PdfImportPage from '../components/PdfImportPage.tsx';

export default function Pemasukan() {
  return <PdfImportPage titleKey="nav.pemasukan" sectionKey="pemasukan" fileType="pemasukan" pagePath="/pemasukan" kdKegiatan="30" hintText="(Hỗ trợ tải lên: BC 2.3, BC 4.0, BC 2.6.2, PPKEK)" />;
}
