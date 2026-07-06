import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add searchInput state and useEffect
state_target = "  const [tableSearch, setTableSearch] = useState('');"
state_replacement = """  const [tableSearch, setTableSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setTableSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);"""

if "const [searchInput" not in content:
    content = content.replace(state_target, state_replacement)

# 2. Modify TextField to use searchInput instead of tableSearch
ui_target = """          <TextField 
            size="small" 
            placeholder="Tìm kiếm (Customer, Kích thước...)" 
            value={tableSearch}
            onChange={(e) => { setTableSearch(e.target.value); setPage(0); }}
            sx={{ width: 300, bgcolor: '#fff' }}
          />"""
ui_replacement = """          <TextField 
            size="small" 
            placeholder="Tìm kiếm (Customer, Kích thước...)" 
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(0); }}
            sx={{ width: 300, bgcolor: '#fff' }}
          />"""

if "value={searchInput}" not in content:
    content = content.replace(ui_target, ui_replacement)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
