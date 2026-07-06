import re

# 1. Fix server.ts (poolPromise -> pool)
with open(r'd:\TSI\TestClaudeCode\TraxEco\backend\src\server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

bad_code = """  try {
    const pool = await poolPromise;
    const result = await pool.request().query("""
good_code = """  try {
    if (!pool) return res.status(500).json({ error: 'DB not connected' });
    const result = await pool.request().query("""

content = content.replace(bad_code, good_code)

with open(r'd:\TSI\TestClaudeCode\TraxEco\backend\src\server.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update vite.config.ts to proxy /api/inventory to 3001
with open(r'd:\TSI\TestClaudeCode\TraxEco\vite.config.ts', 'r', encoding='utf-8') as f:
    vite_content = f.read()

proxy_old = """        '/api': {
          target: 'http://127.0.0.1:8100',"""

proxy_new = """        '/api/inventory': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: 'http://127.0.0.1:8100',"""

if "'/api/inventory': {" not in vite_content:
    vite_content = vite_content.replace(proxy_old, proxy_new)
    with open(r'd:\TSI\TestClaudeCode\TraxEco\vite.config.ts', 'w', encoding='utf-8') as f:
        f.write(vite_content)

# 3. Update LabelConfigPage.tsx to use relative paths
with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    page_content = f.read()

# Replace shipping marks fetch
old_sm_fetch = "const res = await fetch(`http://${window.location.hostname}:3001/api/inventory/shipping-marks`);"
new_sm_fetch = "const res = await fetch(`/api/inventory/shipping-marks`);"
page_content = page_content.replace(old_sm_fetch, new_sm_fetch)

# Replace PO fetch
old_po_fetch = "const res = await fetch(`http://${window.location.hostname}:3001/api/inventory/po-config-info/${encodeURIComponent(poSearch.trim())}`);"
new_po_fetch = "const res = await fetch(`/api/inventory/po-config-info/${encodeURIComponent(poSearch.trim())}`);"
page_content = page_content.replace(old_po_fetch, new_po_fetch)

# Just in case there are multiple replacements, or other formats:
# wait, I also had fallback if they don't match exactly. Let's use regex.
page_content = re.sub(r'fetch\(`http://\$\{window\.location\.hostname\}:3001(/api/inventory/shipping-marks)`\)', r'fetch(`\1`)', page_content)
page_content = re.sub(r'fetch\(`http://\$\{window\.location\.hostname\}:3001(/api/inventory/po-config-info/\$\{.*?\}\)`\)', r'fetch(`\1`)', page_content)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(page_content)
