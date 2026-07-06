const fs = require('fs');
const path = require('path');

const localesDir = 'd:/TSI/TestClaudeCode/TraxEco/src/apps/IT_INVENTORY/i18n/locales';

const dict = {
  en: {
    title: 'INSW Category Mapping',
    validateEmpty: 'Keyword and INSW Code cannot be empty!',
    saveError: 'Error saving mapping!',
    confirmDelete: 'Are you sure you want to delete this mapping?',
    deleteError: 'Error deleting mapping!',
    addNew: 'Add New Keyword',
    editKeyword: 'Edit Keyword',
    keyword: 'Keyword (Text in PDF)',
    inswCode: 'INSW Code (1-8)',
    note: 'Note',
    saveBtn: 'Save Mapping',
    noData: 'No mapping configured yet'
  },
  vi: {
    title: 'Cấu hình Kategori INSW',
    validateEmpty: 'Keyword và INSW Code không được để trống!',
    saveError: 'Lỗi khi lưu mapping!',
    confirmDelete: 'Bạn có chắc muốn xoá mapping này?',
    deleteError: 'Lỗi khi xoá mapping!',
    addNew: 'Thêm Keyword Mới',
    editKeyword: 'Sửa Keyword',
    keyword: 'Keyword (Chữ trong PDF)',
    inswCode: 'Mã INSW (1-8)',
    note: 'Ghi chú',
    saveBtn: 'Lưu Mapping',
    noData: 'Chưa có mapping nào được cấu hình'
  },
  id: {
    title: 'Konfigurasi Kategori INSW',
    validateEmpty: 'Keyword dan Kode INSW tidak boleh kosong!',
    saveError: 'Gagal menyimpan mapping!',
    confirmDelete: 'Apakah Anda yakin ingin menghapus mapping ini?',
    deleteError: 'Gagal menghapus mapping!',
    addNew: 'Tambah Keyword Baru',
    editKeyword: 'Edit Keyword',
    keyword: 'Keyword (Teks di PDF)',
    inswCode: 'Kode INSW (1-8)',
    note: 'Catatan',
    saveBtn: 'Simpan Mapping',
    noData: 'Belum ada mapping yang dikonfigurasi'
  }
};

['en', 'vi', 'id', 'th', 'km'].forEach(lang => {
  const filePath = path.join(localesDir, lang + '.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.insw_mapping = dict[lang] || dict['en'];
    if (data.common) {
      data.common.action = data.common.action || (lang === 'vi' ? 'Thao tác' : lang === 'id' ? 'Aksi' : 'Action');
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
});
console.log('Successfully updated locales!');
