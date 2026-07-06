import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add LocalSearchInput component
local_search_code = """const LocalSearchInput = ({ onSearch }: { onSearch: (val: string) => void }) => {
  const [val, setVal] = React.useState('');
  return (
    <TextField 
      size="small" 
      placeholder="Tìm kiếm rồi bấm Enter..." 
      value={val}
      onChange={(e) => {
        setVal(e.target.value);
        if (e.target.value === '') {
          onSearch('');
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onSearch(val);
        }
      }}
      sx={{ width: 300, bgcolor: '#fff' }}
    />
  );
};"""

target_export = "export default function LabelConfigPage() {"
if "const LocalSearchInput" not in content:
    content = content.replace(target_export, local_search_code + "\n\n" + target_export)

# 2. Remove searchInput state from LabelConfigPage
state_target = "  const [searchInput, setSearchInput] = useState('');"
if state_target in content:
    content = content.replace(state_target, "")

# 3. Replace TextField with LocalSearchInput
ui_target = """          <TextField 
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

ui_replacement = """          <LocalSearchInput onSearch={(val) => { setTableSearch(val); setPage(0); }} />"""

if "LocalSearchInput onSearch=" not in content:
    content = content.replace(ui_target, ui_replacement)


with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
