import re

files = [
    r"d:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\pages\AdminStatusPage.tsx",
    r"d:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\pages\RequestorViewPage.tsx"
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add import
    import_statement = "import ExcelStyleColumnMenu from '../components/ExcelStyleColumnMenu';\n"
    if "ExcelStyleColumnMenu" not in content:
        # insert after import React
        content = content.replace("import React", import_statement + "import React", 1)

    # 2. Add slot to DataGrid
    if "slots={{ columnMenu: ExcelStyleColumnMenu }}" not in content:
        content = content.replace("<DataGrid\n", "<DataGrid\n          slots={{ columnMenu: ExcelStyleColumnMenu }}\n")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Grid menus updated!")
