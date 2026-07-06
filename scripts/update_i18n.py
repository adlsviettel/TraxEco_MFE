import json
import os

locales_dir = r"D:\TSI\TestClaudeCode\TraxEco\src\i18n\locales"
updates = {
    "en.json": {
        "exportExcel": "Export Excel",
        "filter": "Filter",
        "searchCustomer": "Search customer...",
        "toggleColumns": "Toggle Columns"
    },
    "vi.json": {
        "exportExcel": "Xuất Excel",
        "filter": "Bộ lọc",
        "searchCustomer": "Tìm kiếm khách hàng...",
        "toggleColumns": "Tùy chỉnh cột"
    },
    "id.json": {
        "exportExcel": "Ekspor Excel",
        "filter": "Saring",
        "searchCustomer": "Cari pelanggan...",
        "toggleColumns": "Ubah Kolom"
    },
    "km.json": {
        "exportExcel": "នាំចេញឯកសារ Excel",
        "filter": "តម្រង",
        "searchCustomer": "ស្វែងរកអតិថិជន...",
        "toggleColumns": "បិទបើកជួរឈរ"
    },
    "th.json": {
        "exportExcel": "ส่งออก Excel",
        "filter": "ตัวกรอง",
        "searchCustomer": "ค้นหาลูกค้า...",
        "toggleColumns": "สลับคอลัมน์"
    }
}

for fname, new_keys in updates.items():
    path = os.path.join(locales_dir, fname)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if "tcc" not in data:
            data["tcc"] = {}
            
        for k, v in new_keys.items():
            data["tcc"][k] = v
        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Updated {fname}")
