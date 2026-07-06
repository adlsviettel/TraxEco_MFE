import os

def update_list_page():
    path = 'src/apps/RD_MATERIAL/pages/AccessoryListPage.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Update categories
    content = content.replace("const CATEGORIES = ['Woven', 'Knit', 'Lace', 'Nonwoven', 'Leather', 'Others'];",
                              "const CATEGORIES = ['Elastic', 'Zipper', 'Elastic Zipper', 'Button', 'Label', 'Hook & Eye', 'Snap', 'Velcro', 'Thread', 'Pocket Bag', 'Other'];")
    
    # Update CATEGORY_COLOR logic
    color_logic = """const CATEGORY_COLOR: Record<string, { bg: string; color: string }> = {
  Elastic:    { bg: '#dcfce7', color: '#16a34a' },
  Zipper:     { bg: '#dbeafe', color: '#2563eb' },
  Button:     { bg: '#fce7f3', color: '#db2777' },
  Label:      { bg: '#fff7ed', color: '#ea580c' },
};"""
    # Replace the old dictionary (assuming we just match the start and end roughly, or just replace the whole dict)
    import re
    content = re.sub(r'const CATEGORY_COLOR: Record<string, { bg: string; color: string }> = \{.*?\};', color_logic, content, flags=re.DOTALL)
    
    # Update the filtering options (Fabric has structure, composition, hasSy etc.)
    # Accessory has: category, composition, size, color, weightGsm.
    # In FabricListPage, filter states are: structure, composition, hasSy.
    content = content.replace("const [structure, setStructure] = useState<string>('All');", "const [category, setCategory] = useState<string>('All');")
    content = content.replace("const [composition, setComposition] = useState<string>('');", "") # Maybe keep it if they want
    content = content.replace("const [hasSy, setHasSy] = useState<string>('All');", "")
    
    # Actually it's easier to just use string replace for the JSX too
    content = content.replace('item.accessory?.structure', 'item.accessory?.category')
    content = content.replace('item.accessory?.accessoryName', 'item.name') # Wait, fabricName was changed to accessoryName. It should be item.name? Wait, accessory doesn't have accessoryName.
    content = content.replace('item.accessory?.weightGsm', 'item.accessory?.weightGsm')
    content = content.replace('item.accessory?.cuttableWidth', 'item.accessory?.size')
    content = content.replace('width:', 'size:')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

update_list_page()
print("List page updated")
