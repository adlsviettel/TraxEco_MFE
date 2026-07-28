import re

with open(r'packages\tcc-template\src\components\RequestFormDialog.tsx', 'r', encoding='utf-8') as f:
  text = f.read()

text = text.replace('  );\n};\n', '  );\n}\n')
text = text.replace('export default RequestFormDialog;', '')

with open(r'packages\tcc-template\src\components\RequestFormDialog.tsx', 'w', encoding='utf-8') as f:
  f.write(text)
print("DONE")
