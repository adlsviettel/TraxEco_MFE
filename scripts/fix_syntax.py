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
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            original = content
            
            # Fix \' to ' in set(\' and handleChange(\'
            content = content.replace(r"handleChange(\'", "handleChange('")
            content = content.replace(r"\', val)", "', val)")
            content = content.replace(r"set(\'", "set('")
            
            if content != original:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Fixed {filename}")
