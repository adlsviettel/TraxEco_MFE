import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace localhost with window.location.hostname
old_fetch = "const res = await fetch(`http://localhost:3001/api/inventory/po-config-info/${encodeURIComponent(poSearch.trim())}`);"
new_fetch = "const res = await fetch(`http://${window.location.hostname}:3001/api/inventory/po-config-info/${encodeURIComponent(poSearch.trim())}`);"

content = content.replace(old_fetch, new_fetch)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
