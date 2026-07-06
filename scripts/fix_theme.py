import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\theme\index.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the transparent border style override for MuiTextField in light theme
target_block = """            '& fieldset': {
              borderColor: 'transparent',
              borderWidth: '1px',
              transition: 'border-color 0.25s ease',
            },
            '&:hover fieldset': { 
              borderColor: tokens.slate[200],
            },
            '&:hover': {
              backgroundColor: '#fff',
            },"""

replacement_block = """            '& fieldset': {
              borderColor: tokens.slate[300],
              borderWidth: '1px',
              transition: 'all 0.25s ease',
            },
            '&:hover fieldset': { 
              borderColor: tokens.slate[400],
            },
            '&:hover': {
              backgroundColor: '#fff',
            },"""

if target_block in content:
    content = content.replace(target_block, replacement_block)

# Also fix the background color to white by default instead of slate[50] to make it more visible
content = content.replace("backgroundColor: tokens.slate[50],", "backgroundColor: '#ffffff',")

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\theme\index.ts', 'w', encoding='utf-8') as f:
    f.write(content)
