import os
import re

directories = [
    r'd:\TSI\TestClaudeCode\TraxEco\src\apps\RD_MATERIAL\pages',
    r'd:\TSI\TestClaudeCode\TraxEco\src\apps\RD_MATERIAL\components',
    r'd:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\pages',
    r'd:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\components'
]

for directory in directories:
    if not os.path.exists(directory): continue
    for root, dirs, files in os.walk(directory):
        for filename in files:
            if not filename.endswith('.tsx'): continue
            filepath = os.path.join(root, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
            except UnicodeDecodeError:
                with open(filepath, 'r', encoding='utf-16') as f:
                    content = f.read()
                
            if 'AppTextField' not in content: continue
            original = content
            
            # Replace localKeyword usages
            content = re.sub(
                r'value=\{localKeyword\}\s*onChange=\{\(e\)\s*=>\s*setLocalKeyword\(e\.target\.value\)\}',
                r'value={keyword} debounceMs={400} onDebounceChange={setKeyword}',
                content
            )
            
            if content != original:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Updated {filename}")
