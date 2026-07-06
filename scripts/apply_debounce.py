import os
import re

directories = [
    r'd:\TSI\TestClaudeCode\TraxEco\src\apps\RD_MATERIAL\pages',
    r'd:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\pages'
]

# 1. Update AdminStatusPage.tsx
admin_page = r'd:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\pages\AdminStatusPage.tsx'
if os.path.exists(admin_page):
    with open(admin_page, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Customer search
    content = re.sub(
        r'value=\{filters\.customer\}\s*onChange=\{\(e\)\s*=>\s*handleFilterChange\(\'customer\',\s*e\.target\.value\)\}',
        r'value={filters.customer}\n            debounceMs={400}\n            onDebounceChange={(val) => handleFilterChange(\'customer\', val)}',
        content
    )
    # Requeseter search
    content = re.sub(
        r'value=\{filters\.requester\}\s*onChange=\{\(e\)\s*=>\s*handleFilterChange\(\'requester\',\s*e\.target\.value\)\}',
        r'value={filters.requester}\n            debounceMs={400}\n            onDebounceChange={(val) => handleFilterChange(\'requester\', val)}',
        content
    )
    
    with open(admin_page, 'w', encoding='utf-8') as f:
        f.write(content)

# 2. Update RD_MATERIAL pages
for directory in directories:
    if not os.path.exists(directory): continue
    for filename in os.listdir(directory):
        if not filename.endswith('.tsx'): continue
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if 'AppTextField' not in content: continue

        original = content
        
        # Replace localKeyword usages in the JSX with keyword + debounce
        content = re.sub(
            r'value=\{localKeyword\}\s*onChange=\{\(e\)\s*=>\s*setLocalKeyword\(e\.target\.value\)\}',
            r'value={keyword} debounceMs={400} onDebounceChange={setKeyword}',
            content
        )
        
        # We don't necessarily need to remove localKeyword declaration, React will just ignore the unused state 
        # if we only replaced the JSX. But to be clean, let's keep it as is, or we can use localKeyword. 
        # Actually if we use keyword directly, we bypass the useEffect debounce. 
        # Wait, the useEffect in AccessoryListPage:
        # useEffect(() => { const timer = setTimeout(() => { if (keyword !== localKeyword) ... }, 500); return ... }, [localKeyword...])
        # If we change the input to use `keyword` directly, the useEffect will never fire because `localKeyword` won't change.
        # This is perfectly fine, the useEffect becomes a no-op!
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {filename}")
