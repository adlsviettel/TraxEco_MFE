import json
import os

locales_dir = r"d:\TSI\TestClaudeCode\TraxEco\src\i18n\locales"
files = {
    'en.json': {
        'reopen': 'Re-Open',
        'confirmReopenTitle': 'Confirm Re-Open',
        'confirmReopenMessage': 'Are you sure you want to re-open this request? This will clear the Finished Date, In-charge Person, Remarks, and set Status to Remake.'
    },
    'vi.json': {
        'reopen': 'Mở lại',
        'confirmReopenTitle': 'Xác nhận mở lại',
        'confirmReopenMessage': 'Bạn có chắc chắn muốn mở lại yêu cầu này không? Thao tác này sẽ xóa Ngày hoàn thành, Người phụ trách, Ghi chú và đặt Trạng thái thành Remake.'
    },
    'id.json': {
        'reopen': 'Buka Kembali',
        'confirmReopenTitle': 'Konfirmasi Buka Kembali',
        'confirmReopenMessage': 'Apakah Anda yakin ingin membuka kembali permintaan ini? Ini akan menghapus Tanggal Selesai, Penanggung Jawab, Catatan, dan mengubah Status menjadi Remake.'
    },
    'th.json': {
        'reopen': 'เปิดใหม่',
        'confirmReopenTitle': 'ยืนยันการเปิดใหม่',
        'confirmReopenMessage': 'คุณแน่ใจหรือไม่ว่าต้องการเปิดคำขอนี้ใหม่ ซึ่งจะล้างวันที่เสร็จสิ้น ผู้รับผิดชอบ หมายเหตุ และตั้งสถานะเป็น Remake'
    },
    'km.json': {
        'reopen': 'បើកឡើងវិញ',
        'confirmReopenTitle': 'បញ្ជាក់ការបើកឡើងវិញ',
        'confirmReopenMessage': 'តើអ្នកប្រាកដថាចង់បើកសំណើនេះឡើងវិញទេ? វានឹងលុបកាលបរិច្ឆេទបញ្ចប់ អ្នកទទួលខុសត្រូវ កំណត់ចំណាំ និងកំណត់ស្ថានភាពទៅជា Remake ។'
    }
}

for filename, translations in files.items():
    filepath = os.path.join(locales_dir, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if 'tcc' not in data:
            data['tcc'] = {}
            
        for key, value in translations.items():
            data['tcc'][key] = value
            
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

print("Updated 5 language files!")
