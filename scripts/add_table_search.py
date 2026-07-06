import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add tableSearch state
state_target = "  const [poLoading, setPoLoading] = useState(false);"
state_replacement = """  const [poLoading, setPoLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');"""
if "const [tableSearch" not in content:
    content = content.replace(state_target, state_replacement)

# 2. Add filteredConfigs
target_paginated = "  const paginatedConfigs = configs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);"
replacement_paginated = """  const filteredConfigs = React.useMemo(() => {
    if (!tableSearch) return configs;
    const lower = tableSearch.toLowerCase();
    return configs.filter(c => 
      (c.custNo || '').toLowerCase().includes(lower) || 
      (c.customer || '').toLowerCase().includes(lower) || 
      (c.shippingMarkId?.toString() || '').includes(lower) ||
      (c.shipDest || '').toLowerCase().includes(lower) ||
      (c.ctnL || '').includes(lower) ||
      (c.ctnW || '').includes(lower) ||
      (c.ctnH || '').includes(lower)
    );
  }, [configs, tableSearch]);

  const paginatedConfigs = filteredConfigs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);"""
if "const filteredConfigs" not in content:
    content = content.replace(target_paginated, replacement_paginated)

# 3. Add Search TextField to UI
target_ui = """        <Box>
          <Button startIcon={<RefreshIcon />} onClick={fetchConfigs} sx={{ mr: 1 }}>Làm mới</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Thêm Cấu Hình
          </Button>
        </Box>"""
replacement_ui = """        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField 
            size="small" 
            placeholder="Tìm kiếm (Customer, Kích thước...)" 
            value={tableSearch}
            onChange={(e) => { setTableSearch(e.target.value); setPage(0); }}
            sx={{ width: 300, bgcolor: '#fff' }}
          />
          <Button startIcon={<RefreshIcon />} onClick={fetchConfigs}>Làm mới</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Thêm Cấu Hình
          </Button>
        </Box>"""
if 'placeholder="Tìm kiếm' not in content:
    content = content.replace(target_ui, replacement_ui)

# 4. Fix TablePagination count
target_pagination = """          <TablePagination
            rowsPerPageOptions={[50, 100, 500]}
            component="div"
            count={configs.length}"""
replacement_pagination = """          <TablePagination
            rowsPerPageOptions={[50, 100, 500]}
            component="div"
            count={filteredConfigs.length}"""
if "count={filteredConfigs.length}" not in content:
    content = content.replace(target_pagination, replacement_pagination)


with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
