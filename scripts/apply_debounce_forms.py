import os
import re

directories = [
    r'd:\TSI\TestClaudeCode\TraxEco\src\apps\RD_MATERIAL\pages',
    r'd:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\components' # RequestFormDialog is here
]

# The regex targets standard TextFields using `onChange={(e) => set('prop', e.target.value)}`
# or `onChange={(e) => set('prop', e.target.value as any)}`
# We also want to target `handleChange('prop', e.target.value)` which is used in RequestFormDialog.tsx

regex_set = r'<TextField([^>]*)value=\{([^}]*)\}\s*onChange=\{\(e\)\s*=>\s*set\(\'([^\']+)\',\s*e\.target\.value\)\}([^>]*)>'
replacement_set = r'<AppTextField\1value={\2} debounceMs={200} onDebounceChange={(val) => set(\'\3\', val)}\4>'

regex_handle = r'<TextField([^>]*)value=\{([^}]*)\}\s*onChange=\{\(e\)\s*=>\s*handleChange\(\'([^\']+)\',\s*e\.target\.value\)\}([^>]*)>'
replacement_handle = r'<AppTextField\1value={\2} debounceMs={200} onDebounceChange={(val) => handleChange(\'\3\', val)}\4>'

for directory in directories:
    if not os.path.exists(directory): continue
    for filename in os.listdir(directory):
        if not filename.endswith('.tsx') or ('Drawer' not in filename and 'Dialog' not in filename):
            continue
            
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original = content
        
        # Replace `set(...)`
        content = re.sub(regex_set, replacement_set, content)
        # Replace `handleChange(...)`
        content = re.sub(regex_handle, replacement_handle, content)
        
        if content != original:
            # Add AppTextField import if not present
            if 'AppTextField' not in content:
                # Find the last import and add it after
                if 'RD_MATERIAL' in directory:
                    import_str = "import AppTextField from '../components/ui/AppTextField';\n"
                else:
                    import_str = "import AppTextField from './ui/AppTextField';\n"
                    
                # insert after last import
                last_import = content.rfind('import ')
                if last_import != -1:
                    end_of_line = content.find('\n', last_import)
                    content = content[:end_of_line+1] + import_str + content[end_of_line+1:]
                else:
                    content = import_str + content
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {filename}")
