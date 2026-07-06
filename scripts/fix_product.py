import sys
content = open('src/apps/RD_MATERIAL/pages/FabricDetailPage.tsx', 'r', encoding='utf-8').read()
content = content.replace('FabricDetailPage', 'ProductDetailPage')
content = content.replace('Fabric Hanger', 'Design Detail')
content = content.replace('FABRIC', 'PRODUCT')
content = content.replace('fabric', 'product')
content = content.replace('Fabric', 'Product') # FabricFormDrawer -> ProductFormDrawer
content = content.replace('YD-', 'PR-')
content = content.replace('rolls', 'pcs')
content = content.replace('#166534', '#b45309').replace('#dcfce7', '#fef3c7')
content = content.replace('Product Name (EN)', 'Category')
content = content.replace('Structure', 'Size')
content = content.replace('Composition', 'Color')
content = content.replace('Function', 'Description')
content = content.replace('item.product?.productName', 'item.product?.specification')
content = content.replace('item.product?.structure', 'item.product?.size')
content = content.replace('item.product?.composition', 'item.product?.color')
content = content.replace('item.product?.function', 'item.product?.description')

# We'll use re to remove GSM and Cuttable Width dynamically
import re
content = re.sub(r'<InfoRow label="GSM".*?/>\n\s*', '', content)
content = re.sub(r'<InfoRow label="Cuttable Width".*?/>\n\s*', '', content)

with open('src/apps/RD_MATERIAL/pages/ProductDetailPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
