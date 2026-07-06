import json
import os

locales_dir = r"d:\TSI\TestClaudeCode\TraxEco\src\i18n\locales"

translations = {
    'id.json': 'Formulir Permintaan Template',
    'km.json': 'ទម្រង់ស្នើសុំគំរូ',
    'th.json': 'แบบฟอร์มคำขอแม่แบบ'
}

for file, text in translations.items():
    filepath = os.path.join(locales_dir, file)
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    data['tcc']['nav']['tracking'] = text
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Updated 3 other locales!")
