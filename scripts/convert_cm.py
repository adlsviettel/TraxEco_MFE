import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the fetching logic where dimensions are set
old_fetch = """        const newCtnL = data.data.ctnL ? parseFloat(data.data.ctnL).toString() : commonData.ctnL;
        const newCtnW = data.data.ctnW ? parseFloat(data.data.ctnW).toString() : commonData.ctnW;
        const newCtnH = data.data.ctnH ? parseFloat(data.data.ctnH).toString() : commonData.ctnH;"""

new_fetch = """        // Convert from m to cm (x100) and remove extra decimals
        const newCtnL = data.data.ctnL ? Math.round(parseFloat(data.data.ctnL) * 100).toString() : commonData.ctnL;
        const newCtnW = data.data.ctnW ? Math.round(parseFloat(data.data.ctnW) * 100).toString() : commonData.ctnW;
        const newCtnH = data.data.ctnH ? Math.round(parseFloat(data.data.ctnH) * 100).toString() : commonData.ctnH;"""

content = content.replace(old_fetch, new_fetch)

# And also replace in the setCommonData section
old_set = """          ctnL: data.data.ctnL ? parseFloat(data.data.ctnL).toString() : prev.ctnL,
          ctnW: data.data.ctnW ? parseFloat(data.data.ctnW).toString() : prev.ctnW,
          ctnH: data.data.ctnH ? parseFloat(data.data.ctnH).toString() : prev.ctnH"""

new_set = """          ctnL: data.data.ctnL ? Math.round(parseFloat(data.data.ctnL) * 100).toString() : prev.ctnL,
          ctnW: data.data.ctnW ? Math.round(parseFloat(data.data.ctnW) * 100).toString() : prev.ctnW,
          ctnH: data.data.ctnH ? Math.round(parseFloat(data.data.ctnH) * 100).toString() : prev.ctnH"""

content = content.replace(old_set, new_set)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
