import json
import os

locales_dir = r"d:\TSI\TestClaudeCode\TraxEco_MFE\packages\shared\src\i18n\locales"

translations = {
    "vi.json": {
        "title": "Ứng dụng Trax COO",
        "nav": {
            "dashboard": "Bảng Điều Khiển",
            "import": "Đồng Bộ Dữ Liệu",
            "admin": "Quản Trị"
        },
        "dashboard": {
            "title": "COO ERP Data Sync & Hải Quan Tờ Khai",
            "subtitle": "Tra cứu số PO, ghép nối nguyên phụ liệu với tờ khai hải quan & xuất báo cáo",
            "poSearchPlaceholder": "Nhập số PO (Ví dụ: PO123456)...",
            "searchBtn": "Tìm Kiếm PO",
            "exportExcel": "Xuất Excel",
            "totalRecords": "Tổng số dòng",
            "missingMainFabric": "Thiếu Vải chính",
            "missingDeclaration": "Thiếu Tờ khai",
            "missingCustoms": "Thiếu Hải quan",
            "valid": "Hợp lệ",
            "summaryTitle": "THỐNG KÊ TỔNG HỢP",
            "totalRows": "Tổng số dòng",
            "statusNormal": "Bình Thường",
            "searchHint": "Vui lòng nhập số PO để tìm kiếm và khớp dữ liệu"
        },
        "import": {
            "title": "Đồng Bộ & Nhập Dữ Liệu",
            "subtitle": "Nhập dữ liệu Tờ Khai Hải Quan Hàng Tuần và Dữ Liệu Định Mức COO",
            "customsTitle": "Nhập Dữ Liệu Tờ Khai / Hải Quan Hàng Tuần",
            "consumptionTitle": "Nhập Dữ Liệu Định Mức NGUYÊN NGUYÊN LIỆU COO",
            "selectFile": "Chọn File Excel",
            "uploadBtn": "Tải Lên & Nhập",
            "successMsg": "Tải lên và nhập dữ liệu thành công!",
            "errorMsg": "Lỗi nhập dữ liệu"
        }
    },
    "en.json": {
        "title": "Trax COO Application",
        "nav": {
            "dashboard": "Dashboard",
            "import": "Data Import",
            "admin": "Admin"
        },
        "dashboard": {
            "title": "COO ERP Data Sync & Customs Declaration",
            "subtitle": "Query PO number, match raw materials with customs declaration & export report",
            "poSearchPlaceholder": "Search PO (PO1, PO2, ...)...",
            "searchBtn": "Search PO",
            "exportExcel": "Export Excel",
            "totalRecords": "Total Records",
            "missingMainFabric": "Missing Main Fabric",
            "missingDeclaration": "Missing Declaration",
            "missingCustoms": "Missing Customs",
            "valid": "Valid",
            "summaryTitle": "EXCEL DATA SUMMARY",
            "totalRows": "Total Rows",
            "statusNormal": "Normal",
            "searchHint": "Please enter PO number to search and match data"
        },
        "import": {
            "title": "Data Sync & Import",
            "subtitle": "Import Weekly Customs Declaration Data and COO Consumption Data",
            "customsTitle": "Import Weekly Customs Declaration Data",
            "consumptionTitle": "Import COO Raw Material Consumption Data",
            "selectFile": "Select Excel File",
            "uploadBtn": "Upload & Import",
            "successMsg": "File uploaded and imported successfully!",
            "errorMsg": "Data import error"
        }
    },
    "th.json": {
        "title": "แอปพลิเคชัน Trax COO",
        "nav": {
            "dashboard": "แผงควบคุม",
            "import": "นำเข้าข้อมูล",
            "admin": "ผู้ดูแลระบบ"
        },
        "dashboard": {
            "title": "COO ERP Data Sync & ศุลกากร",
            "subtitle": "ค้นหาเลข PO จับคู่ใบขนสินค้าศุลกากรและส่งออกรายงาน",
            "poSearchPlaceholder": "ค้นหา PO (PO1, PO2, ...)...",
            "searchBtn": "ค้นหา PO",
            "exportExcel": "ส่งออก Excel",
            "totalRecords": "จำนวนรายการทั้งหมด",
            "missingMainFabric": "ขาดผ้าหลัก",
            "missingDeclaration": "ขาดใบขนสินค้า",
            "missingCustoms": "ขาดเอกสารศุลกากร",
            "valid": "ถูกต้อง",
            "summaryTitle": "สรุปข้อมูล EXCEL",
            "totalRows": "แถวทั้งหมด",
            "statusNormal": "ปกติ",
            "searchHint": "กรุณาใส่เลข PO เพื่อค้นหาและจับคู่ข้อมูล"
        },
        "import": {
            "title": "นำเข้าข้อมูล",
            "subtitle": "นำเข้าข้อมูลใบขนสินค้าประจำสัปดาห์และข้อมูลปริมาณการใช้ COO",
            "customsTitle": "นำเข้าข้อมูลใบขนสินค้าประจำสัปดาห์",
            "consumptionTitle": "นำเข้าข้อมูลอัตราการใช้วัตถุดิบ COO",
            "selectFile": "เลือกไฟล์ Excel",
            "uploadBtn": "อัปโหลดและนำเข้า",
            "successMsg": "อัปโหลดและนำเข้าข้อมูลสำเร็จ!",
            "errorMsg": "เกิดข้อผิดพลาดในการนำเข้า"
        }
    },
    "id.json": {
        "title": "Aplikasi Trax COO",
        "nav": {
            "dashboard": "Dasbor",
            "import": "Impor Data",
            "admin": "Admin"
        },
        "dashboard": {
            "title": "COO ERP Data Sync & Deklarasi Bea Cukai",
            "subtitle": "Cari nomor PO, cocokkan bahan baku dengan deklarasi bea cukai & ekspor laporan",
            "poSearchPlaceholder": "Cari PO (PO1, PO2, ...)...",
            "searchBtn": "Cari PO",
            "exportExcel": "Ekspor Excel",
            "totalRecords": "Total Rekaman",
            "missingMainFabric": "Kain Utama Tidak Ada",
            "missingDeclaration": "Deklarasi Kurang",
            "missingCustoms": "Kurang Dokumen Bea Cukai",
            "valid": "Valid",
            "summaryTitle": "RINGKASAN DATA EXCEL",
            "totalRows": "Total Baris",
            "statusNormal": "Normal",
            "searchHint": "Silakan masukkan nomor PO untuk mencari dan mencocokkan data"
        },
        "import": {
            "title": "Sinkronisasi & Impor Data",
            "subtitle": "Impor Data Deklarasi Bea Cukai Mingguan dan Data Konsumsi COO",
            "customsTitle": "Impor Data Deklarasi Bea Cukai Mingguan",
            "consumptionTitle": "Impor Data Konsumsi Bahan Baku COO",
            "selectFile": "Pilih File Excel",
            "uploadBtn": "Unggah & Impor",
            "successMsg": "File berhasil diunggah dan diimpor!",
            "errorMsg": "Kesalahan impor data"
        }
    },
    "km.json": {
        "title": "កម្មវិធី Trax COO",
        "nav": {
            "dashboard": "ផ្ទាំងគ្រប់គ្រង",
            "import": "នាំចូលទិន្នន័យ",
            "admin": "អ្នកគ្រប់គ្រង"
        },
        "dashboard": {
            "title": "COO ERP Data Sync & ប្រកាសគយ",
            "subtitle": "ស្វែងរកលេខ PO, ផ្គូផ្គងវត្ថុតាំងដើមជាមួយលិខិតប្រកាសគយ និងនាំចេញរបាយការណ៍",
            "poSearchPlaceholder": "ស្វែងរក PO (PO1, PO2, ...)...",
            "searchBtn": "ស្វែងរក PO",
            "exportExcel": "នាំចេញ Excel",
            "totalRecords": "កំណត់ត្រាសរុប",
            "missingMainFabric": "ខ្វះក្រណាត់សំខាន់",
            "missingDeclaration": "ខ្វះលិខិតប្រកាស",
            "missingCustoms": "ខ្វះឯកសារគយ",
            "valid": "ត្រឹមត្រូវ",
            "summaryTitle": "សេចក្តីសង្ខេប ទិន្នន័យ EXCEL",
            "totalRows": "ជួរដេកសរុប",
            "statusNormal": "ធម្មតា",
            "searchHint": "សូមបញ្ចូលលេខ PO ដើម្បីស្វែងរក និងផ្គូផ្គងទិន្នន័យ"
        },
        "import": {
            "title": "នាំចូលទិន្នន័យ",
            "subtitle": "នាំចូលទិន្នន័យលិខិតប្រកាសគយប្រចាំសប្តាហ៍ និងទិន្នន័យការប្រើប្រាស់ COO",
            "customsTitle": "នាំចូលទិន្នន័យលិខិតប្រកាសគយប្រចាំសប្តាហ៍",
            "consumptionTitle": "នាំចូលទិន្នន័យការប្រើប្រាស់វត្ថុធាតុដើម COO",
            "selectFile": "ជ្រើសរើសឯកសារ Excel",
            "uploadBtn": "បង្ហោះ និងនាំចូល",
            "successMsg": "បានបង្ហោះ និងនាំចូលទិន្នន័យដោយជោគជ័យ!",
            "errorMsg": "កំហុសក្នុងការនាំចូលទិន្នន័យ"
        }
    }
}

for fname, coo_data in translations.items():
    fpath = os.path.join(locales_dir, fname)
    if os.path.exists(fpath):
        with open(fpath, 'r', encoding='utf-8') as f:
            content = json.load(f)
        content['coo'] = coo_data
        with open(fpath, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
        print(f"Updated {fname} successfully!")
