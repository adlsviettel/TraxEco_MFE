import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We previously replaced it with * 100. Let's find * 100 and replace with * 1000
content = content.replace('parseFloat(data.data.ctnL) * 100', 'parseFloat(data.data.ctnL) * 1000')
content = content.replace('parseFloat(data.data.ctnW) * 100', 'parseFloat(data.data.ctnW) * 1000')
content = content.replace('parseFloat(data.data.ctnH) * 100', 'parseFloat(data.data.ctnH) * 1000')

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
