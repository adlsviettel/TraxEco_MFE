import json
import re
import os

locales_dir = r"D:\TSI\TestClaudeCode\TraxEco\src\i18n\locales"
en_path = os.path.join(locales_dir, 'en.json')
with open(en_path, 'r', encoding='utf-8') as f:
    en_data = json.load(f).get('tcc', {})

def replace_headers(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    def replacer(match):
        key = match.group(1)
        fallback = match.group(2)
        if fallback:
            # If a fallback string is provided, use it (strip quotes)
            val = fallback.strip(" '\"")
        else:
            val = en_data.get(key, key)
        # return literal string, escaping quotes
        val = val.replace("'", "\\'")
        return f"headerName: '{val}'"

    # Match headerName: t('tcc.key') or headerName: t('tcc.key', 'fallback')
    new_content = re.sub(r"headerName:\s*t\('tcc\.([^']+)'(?:,\s*([^)]+))?\)", replacer, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

replace_headers(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\pages\RequestorViewPage.tsx')
replace_headers(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\pages\AdminStatusPage.tsx')
print("Headers updated successfully!")
