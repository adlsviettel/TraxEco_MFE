import os

filepath = r"d:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\components\RequestFormDialog.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("if (form.isPriority === 'Yes')", "if (form.isPriority)")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Bug fixed!")
