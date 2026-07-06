import re

filepath = r"d:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\pages\AdminStatusPage.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import keyframes
if "keyframes" not in content:
    content = content.replace("import { \n  DataGrid,", "import { keyframes } from '@mui/system';\nimport { \n  DataGrid,")

# 2. Add pulseAnimation definition
if "const pulseAnimation" not in content:
    pulse_def = """
const pulseAnimation = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); border-color: #ef4444; }
  50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); border-color: #ef4444; }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); border-color: #ef4444; }
`;
"""
    content = content.replace("function AdminStatusDrawer({", pulse_def + "\nfunction AdminStatusDrawer({")

# 3. Add errorFields state
if "const [errorFields" not in content:
    content = content.replace("const [errorToast, setErrorToast]", "const [errorFields, setErrorFields] = useState<string[]>([]);\n  const [errorToast, setErrorToast]")

# 4. Clear errorFields in handleChange
if "setErrorFields((prev) => prev.filter(f => f !== field));" not in content:
    content = content.replace(
        "setEditForm((prev) => ({ ...prev, [field]: value }));",
        "setEditForm((prev) => ({ ...prev, [field]: value }));\n    setErrorFields((prev) => prev.filter((f) => f !== field));"
    )

# 5. Clear errorFields in handleDateChange for status cascades
# For simplicity, we just clear the field itself inside handleDateChange
if "setErrorFields((prev) => prev.filter((f) => f !== field));" not in content.split("const handleDateChange")[1]:
    content = content.replace(
        "const next = { ...prev, [field]: value };",
        "const next = { ...prev, [field]: value };\n      setErrorFields((prevErr) => prevErr.filter((f) => f !== field));"
    )

# 6. Update handleRelease
old_release = """  const handleRelease = () => {
    const { materialReceivedDate, startDate, finishedDate, status, developerName, templateQty } = editForm;
    if (!materialReceivedDate || !startDate || !finishedDate || !status || !developerName || !templateQty) {
      setErrorToast({ open: true, message: t('tcc.releaseValidationFailed', 'Please fill in all required fields in the TCC Action / Update section before releasing.') });
      return;
    }
    handleChange('releasedDate', format(new Date(), 'yyyy-MM-dd'));
  };"""

new_release = """  const handleRelease = () => {
    const { materialReceivedDate, startDate, finishedDate, status, developerName, templateQty } = editForm;
    const missing: string[] = [];
    if (!materialReceivedDate) missing.push('materialReceivedDate');
    if (!startDate) missing.push('startDate');
    if (!finishedDate) missing.push('finishedDate');
    if (!status) missing.push('status');
    if (!developerName) missing.push('developerName');
    if (!templateQty) missing.push('templateQty');

    if (missing.length > 0) {
      setErrorFields(missing);
      setErrorToast({ open: true, message: t('tcc.releaseValidationFailed', 'Please fill in all required fields in the TCC Action / Update section before releasing.') });
      setTimeout(() => {
        const el = document.getElementById(`field-${missing[0]}`);
        if (el) el.focus();
      }, 100);
      return;
    }
    handleChange('releasedDate', format(new Date(), 'yyyy-MM-dd'));
  };"""

if old_release in content:
    content = content.replace(old_release, new_release)

# 7. Add ID and error/animation to Material Received Date
if "id: 'field-materialReceivedDate'" not in content:
    content = re.sub(
        r"(<DatePicker\s*label=\{t\('tcc\.materialReceivedDate', 'Material Received Date'\)\}\s*minDate=\{new Date\(\)\}\s*value=\{.*\}\s*onChange=\{.*\}\s*disabled=\{.*\}\s*slotProps=\{\{)",
        r"\1\n                    field: { clearable: true },\n                    textField: {\n                      id: 'field-materialReceivedDate',\n                      error: errorFields.includes('materialReceivedDate'),",
        content
    )
    content = content.replace(
        "onChange={(val) => handleDateChange('materialReceivedDate', val)}\n                  disabled={!isEditable}\n                  slotProps={{\n                    field: { clearable: true },\n                    textField: {\n                      fullWidth: true,",
        "onChange={(val) => handleDateChange('materialReceivedDate', val)}\n                  disabled={!isEditable}\n                  slotProps={{\n                    textField: {\n                      id: 'field-materialReceivedDate',\n                      error: errorFields.includes('materialReceivedDate'),\n                      fullWidth: true,"
    )

# Let's do a more robust replacement for the fields
def inject_error_props(content, field_name, t_label):
    # This might be tricky with regex, we'll use targeted string replacements
    return content

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied phase 1")
