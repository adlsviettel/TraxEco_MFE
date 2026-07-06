import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the useEffect debounce
target_effect = """  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setTableSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);"""

if target_effect in content:
    content = content.replace(target_effect, "")

# 2. Modify TextField to only update tableSearch on Enter
ui_target = """          <TextField 
            size="small" 
            placeholder="Tìm kiếm (Customer, Kích thước...)" 
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(0); }}
            sx={{ width: 300, bgcolor: '#fff' }}
          />"""

ui_replacement = """          <TextField 
            size="small" 
            placeholder="Tìm kiếm rồi bấm Enter..." 
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              // Nếu người dùng xóa trắng ô tìm kiếm thì reset luôn bảng
              if (e.target.value === '') {
                setTableSearch('');
                setPage(0);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setTableSearch(searchInput);
                setPage(0);
              }
            }}
            sx={{ width: 300, bgcolor: '#fff' }}
          />"""

if ui_target in content:
    content = content.replace(ui_target, ui_replacement)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
