import os
import re

directory = r'd:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\components'

regex_app = r'<AppTextField([^>]*)value=\{([^}]*)\}\s*onChange=\{\(e\)\s*=>\s*handleChange\(\'([^\']+)\',\s*e\.target\.value\)\}([^>]*)>'
replacement_app = r'<AppTextField\1value={\2} debounceMs={150} onDebounceChange={(val) => handleChange(\'\3\', val)}\4>'

for filename in os.listdir(directory):
    if not filename.endswith('.tsx'): continue
    filepath = os.path.join(directory, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original = content
    content = re.sub(regex_app, replacement_app, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filename}")
