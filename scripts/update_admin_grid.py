import re

filepath = r"d:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\pages\AdminStatusPage.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
old_import = "} from '@mui/x-data-grid';"
new_import = """  useGridApiRef,
  gridFilteredSortedRowIdsSelector
} from '@mui/x-data-grid';"""
if "useGridApiRef" not in content:
    content = content.replace(old_import, new_import)

# 2. Add apiRef definition
old_def = "export default function AdminStatusPage() {\n  const { t } = useTranslation();"
new_def = """export default function AdminStatusPage() {
  const { t } = useTranslation();
  const mainApiRef = useGridApiRef();"""
if "mainApiRef = useGridApiRef()" not in content:
    content = content.replace(old_def, new_def)

# 3. Add apiRef to DataGrid
old_grid = "<DataGrid\n          rows={requests}"
new_grid = "<DataGrid\n          apiRef={mainApiRef}\n          rows={requests}"
if "apiRef={mainApiRef}" not in content:
    content = content.replace(old_grid, new_grid)

# 4. Update requests.forEach in handleExport
old_export = "requests.forEach((req) => {"
new_export = """const filteredSortedRowIds = gridFilteredSortedRowIdsSelector(mainApiRef);
      const dataToExport = filteredSortedRowIds.map(id => mainApiRef.current.getRow(id)).filter(Boolean);
      dataToExport.forEach((req: any) => {"""
if "gridFilteredSortedRowIdsSelector(mainApiRef)" not in content:
    content = content.replace(old_export, new_export)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("AdminStatusPage updated!")
