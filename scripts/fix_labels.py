import re

filepath = r"d:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\pages\AdminStatusPage.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix materialReceivedDate
content = re.sub(
    r"sx: errorFields\.includes\('materialReceivedDate'\) \? \{ animation: `\$\{pulseAnimation\} 1s infinite` \} : \{\},\s*fullWidth: true,\s*size: 'small',\s*sx: \{",
    r"fullWidth: true,\n                      size: 'small',\n                      sx: {\n                        ...(errorFields.includes('materialReceivedDate') && { animation: `${pulseAnimation} 1.5s infinite` }),",
    content
)

# Fix startDate
content = re.sub(
    r"sx: errorFields\.includes\('startDate'\) \? \{ animation: `\$\{pulseAnimation\} 1s infinite` \} : \{\},\s*fullWidth: true,\s*size: 'small',\s*sx: \{",
    r"fullWidth: true,\n                      size: 'small',\n                      sx: {\n                        ...(errorFields.includes('startDate') && { animation: `${pulseAnimation} 1.5s infinite` }),",
    content
)

# Fix finishedDate
content = re.sub(
    r"sx: errorFields\.includes\('finishedDate'\) \? \{ animation: `\$\{pulseAnimation\} 1s infinite` \} : \{\},\s*fullWidth: true,\s*size: 'small',\s*sx: \{",
    r"fullWidth: true,\n                      size: 'small',\n                      sx: {\n                        ...(errorFields.includes('finishedDate') && { animation: `${pulseAnimation} 1.5s infinite` }),",
    content
)

# Fix the label styling in all DatePickers
label_style_old = """                        '& .MuiInputLabel-root': {
                          fontSize: 13,
                        },"""
label_style_new = """                        '& .MuiInputLabel-root': {
                          fontSize: 13,
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          maxWidth: 'calc(100% - 36px)',
                        },"""
content = content.replace(label_style_old, label_style_new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied fix for duplicated sx and label cut off")
