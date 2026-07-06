import re

files = [
    r"d:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\pages\AdminStatusPage.tsx",
    r"d:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\pages\RequestorViewPage.tsx"
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add import
    import_statement = "import CustomFilterPanel from '../components/CustomFilterPanel';\n"
    if "CustomFilterPanel" not in content:
        # insert after ExcelStyleColumnMenu import
        content = content.replace("import ExcelStyleColumnMenu from '../components/ExcelStyleColumnMenu';", "import ExcelStyleColumnMenu from '../components/ExcelStyleColumnMenu';\n" + import_statement)

    # 2. Add slot to DataGrid
    if "filterPanel: CustomFilterPanel" not in content:
        content = content.replace("columnMenu: ExcelStyleColumnMenu,", "columnMenu: ExcelStyleColumnMenu,\n            filterPanel: CustomFilterPanel,")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Grid filterPanel updated!")
