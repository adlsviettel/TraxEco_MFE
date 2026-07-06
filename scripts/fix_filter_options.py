import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace filterOptions definition
old_filter = """  const filterOptions = createFilterOptions({
    limit: 50,
  });"""

new_filter = """  const filterOptions = createFilterOptions({
    limit: 50,
    stringify: (option: any) => option.shippingMarkId === 0 ? option.shippingMarkPicture : `${option.shippingMarkId} - ${option.shippingMarkPicture}`
  });"""

content = content.replace(old_filter, new_filter)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
