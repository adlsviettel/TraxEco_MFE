import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\components\Carton3DPreview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Change color to solid black
content = content.replace('color="#2e7d32" fillOpacity={0.8}', 'color="#000000" fillOpacity={0.9}')

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\components\Carton3DPreview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
