import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Modify payload in executeSave
target_payload = """          const payload = {
            recNo: editingId, // Will only be defined if editing a single config
            custNo: commonData.custNo,
            customer: commonData.customer,
            shipDest: commonData.shipDest,
            ctnL: dim.l,
            ctnW: dim.w,
            ctnH: dim.h,
            ext1: commonData.ext1,
            ext2: commonData.ext2,
            ext3: commonData.ext3,
            shippingMarkId: mark.shippingMarkId,
            area: mark.area,
            sealMethod: mark.sealMethod,
            posX: px,
            posY: py
          };"""

replacement_payload = """          const payload = {
            recNo: editingId, // Will only be defined if editing a single config
            labelId: 28, // Default LabelId as required by backend
            custNo: commonData.custNo,
            customer: commonData.customer,
            shipDest: commonData.shipDest,
            ctnL: dim.l,
            ctnW: dim.w,
            ctnH: dim.h,
            ext1: commonData.ext1,
            ext2: commonData.ext2,
            ext3: commonData.ext3,
            shippingMarkId: mark.shippingMarkId,
            area: mark.area,
            sealMethod: mark.sealMethod,
            posX: px,
            posY: py
          };"""

if target_payload in content:
    content = content.replace(target_payload, replacement_payload)

# 2. Modify payload in handleQuickSave
target_quicksave = "      const payload = { ...row, [field]: value };"
replacement_quicksave = "      const payload = { ...row, labelId: 28, [field]: value };"
if target_quicksave in content:
    content = content.replace(target_quicksave, replacement_quicksave)


with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
