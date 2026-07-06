import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the duplicate check logic
old_check = """        if (newCustNo && newShipDest) {
          const isExist = configs.some(c => c.custNo === newCustNo && c.shipDest === newShipDest);
          setDuplicateWarning(isExist);
        } else {"""

new_check = """        const newCtnL = data.data.ctnL ? parseFloat(data.data.ctnL).toString() : commonData.ctnL;
        const newCtnW = data.data.ctnW ? parseFloat(data.data.ctnW).toString() : commonData.ctnW;
        const newCtnH = data.data.ctnH ? parseFloat(data.data.ctnH).toString() : commonData.ctnH;

        if (newCustNo && newShipDest) {
          // A configuration is a duplicate ONLY if CustNo, ShipDest AND all 3 Dimensions match.
          // Because the same Label/ShipDest can have multiple box sizes!
          const isExist = configs.some(c => 
            c.custNo === newCustNo && 
            c.shipDest === newShipDest &&
            c.ctnL === newCtnL &&
            c.ctnW === newCtnW &&
            c.ctnH === newCtnH
          );
          setDuplicateWarning(isExist);
        } else {"""

content = content.replace(old_check, new_check)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
