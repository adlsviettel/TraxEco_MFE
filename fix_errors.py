import re

with open(r'packages\tcc-template\src\components\RequestFormDialog.tsx', 'r', encoding='utf-8') as f:
  text = f.read()

text = text.replace('materialSentDate: null,', '')
text = text.replace('export default function RequestFormDialog({ open, onClose, onSuccess, lastRequest }: RequestFormDialogProps) {\n  const { t } = useTranslation();', '')
text = text.replace('export default function RequestFormDialog({ open, onClose, onSuccess }: RequestFormDialogProps) {', 'export default function RequestFormDialog({ open, onClose, onSuccess, lastRequest }: RequestFormDialogProps) {')

with open(r'packages\tcc-template\src\components\RequestFormDialog.tsx', 'w', encoding='utf-8') as f:
  f.write(text)
print("DONE")
