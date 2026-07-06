import sys
content = open('src/apps/RD_MATERIAL/pages/FabricDetailPage.tsx', 'r', encoding='utf-8').read()
content = content.replace('FabricDetailPage', 'AccessoryDetailPage')
content = content.replace('Fabric Hanger', 'Accessory Hanger')
content = content.replace('FABRIC', 'ACCESSORY')
content = content.replace('fabric', 'accessory')
content = content.replace('Fabric', 'Accessory') # FabricFormDrawer -> AccessoryFormDrawer
content = content.replace('YD-', 'AC-')
content = content.replace('rolls', 'pcs')
content = content.replace('#166534', '#1e40af').replace('#dcfce7', '#dbeafe')
content = content.replace('Accessory Name (EN)', 'Category')
content = content.replace('Structure', 'Size')
content = content.replace('Composition', 'Color')
content = content.replace('Function', 'Description')
content = content.replace('item.accessory?.accessoryName', 'item.accessory?.specification')
content = content.replace('item.accessory?.structure', 'item.accessory?.size')
content = content.replace('item.accessory?.composition', 'item.accessory?.color')
content = content.replace('item.accessory?.function', 'item.accessory?.description')

# We'll use re to remove GSM and Cuttable Width dynamically
import re
content = re.sub(r'<InfoRow label="GSM".*?/>\n\s*', '', content)
content = re.sub(r'<InfoRow label="Cuttable Width".*?/>\n\s*', '', content)

with open('src/apps/RD_MATERIAL/pages/AccessoryDetailPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
