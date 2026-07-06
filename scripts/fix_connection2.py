import re

# 1. Update LabelConfigPage.tsx to use relative paths
with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    page_content = f.read()

# Replace shipping marks fetch
page_content = page_content.replace(
    "const res = await fetch(`http://${window.location.hostname}:3001/api/inventory/shipping-marks`);",
    "const res = await fetch(`/api/inventory/shipping-marks`);"
)

# Replace PO fetch
page_content = page_content.replace(
    "const res = await fetch(`http://${window.location.hostname}:3001/api/inventory/po-config-info/${encodeURIComponent(poSearch.trim())}`);",
    "const res = await fetch(`/api/inventory/po-config-info/${encodeURIComponent(poSearch.trim())}`);"
)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(page_content)
