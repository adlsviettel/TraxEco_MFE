import os

locales_dir = r"d:\TSI\TestClaudeCode\TraxEco\src\i18n\locales"
files = ["id.json", "km.json", "th.json"]

for file in files:
    filepath = os.path.join(locales_dir, file)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace('"tracking": "Template Request",', '"tracking": "Template Request Form",')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updated all locales!")
