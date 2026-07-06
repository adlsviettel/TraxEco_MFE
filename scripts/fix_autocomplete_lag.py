import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add createFilterOptions to imports
if 'createFilterOptions' not in content:
    content = content.replace("from '@mui/material';", "from '@mui/material';\nimport { createFilterOptions } from '@mui/material/Autocomplete';")

# 2. Add filterOptions inside the component
filter_opts_code = """
export default function LabelConfigPage() {
  const filterOptions = createFilterOptions({
    limit: 50,
  });
"""
content = content.replace("export default function LabelConfigPage() {", filter_opts_code)

# 3. Add filterOptions prop to Autocomplete
auto_repl = """<Autocomplete
                    filterOptions={filterOptions}
                    options="""
content = content.replace("<Autocomplete\n                    options=", auto_repl)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
