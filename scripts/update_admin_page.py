import re

filepath = r"d:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\pages\AdminStatusPage.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update handleExport visibleCols
old_export = "const visibleCols = columns.filter(col => col.field !== 'actions');"
new_export = """const visibleCols = columns.filter(col => 
        col.field !== 'actions' && 
        columnVisibilityModel[col.field] !== false
      );"""
content = content.replace(old_export, new_export)

# 2. Add Select All / Hide All buttons to Toggle Columns Menu
old_toggle = """<Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 700, color: 'text.secondary', fontSize: 13 }}>
          {t('tcc.toggleColumns', 'Toggle Columns')}
        </Typography>
        <Divider sx={{ my: 0.5 }} />"""

new_toggle = """<Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 700, color: 'text.secondary', fontSize: 13 }}>
          {t('tcc.toggleColumns', 'Toggle Columns')}
        </Typography>
        <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 1 }}>
          <Button 
            size="small" 
            variant="outlined" 
            onClick={() => {
              const allVisible: any = {};
              columns.forEach(c => allVisible[c.field] = true);
              setColumnVisibilityModel(allVisible);
            }}
            sx={{ flex: 1, fontSize: 11 }}
          >
            Select All
          </Button>
          <Button 
            size="small" 
            variant="outlined" 
            color="error"
            onClick={() => {
              const noneVisible: any = {};
              columns.forEach(c => noneVisible[c.field] = false);
              setColumnVisibilityModel(noneVisible);
            }}
            sx={{ flex: 1, fontSize: 11 }}
          >
            Hide All
          </Button>
        </Box>
        <Divider sx={{ my: 0.5 }} />"""

content = content.replace(old_toggle, new_toggle)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("AdminStatusPage updated!")
