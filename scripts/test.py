import re, glob
keys=set()
for f in glob.glob(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\pages\*.tsx'):
    with open(f, encoding='utf-8') as file:
        keys.update(re.findall(r"t\('tcc\.([^']+)'", file.read()))
print(keys)
