import os

def replace_in_file(src, dest):
    with open(src, 'r', encoding='utf-8') as f:
        content = f.read()

    # Generic replaces
    content = content.replace('FabricListPage', 'AccessoryListPage')
    content = content.replace('FabricDetailPage', 'AccessoryDetailPage')
    content = content.replace('FabricFormDrawer', 'AccessoryFormDrawer')
    content = content.replace('Fabric', 'Accessory')
    content = content.replace('fabric', 'accessory')
    content = content.replace('FABRIC', 'ACCESSORY')
    content = content.replace('Hanger location', 'Location')
    content = content.replace('Qty of hanger', 'Quantity')
    
    with open(dest, 'w', encoding='utf-8') as f:
        f.write(content)

base_path = 'src/apps/RD_MATERIAL/pages/'
replace_in_file(base_path + 'FabricListPage.tsx', base_path + 'AccessoryListPage.tsx')
replace_in_file(base_path + 'FabricDetailPage.tsx', base_path + 'AccessoryDetailPage.tsx')
print("Done cloning!")
