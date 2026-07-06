import os

locales_dir = r"d:\TSI\TestClaudeCode\TraxEco\src\i18n\locales"

# vi.json
vi_path = os.path.join(locales_dir, 'vi.json')
with open(vi_path, 'r', encoding='utf-8') as f:
    vi_content = f.read()
vi_content = vi_content.replace('"tracking": "Yêu Cầu Rập",', '"tracking": "Phiếu Yêu Cầu Rập",')
with open(vi_path, 'w', encoding='utf-8') as f:
    f.write(vi_content)

print("Updated vi.json!")
