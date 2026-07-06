import re

filepath = r"d:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\pages\AdminStatusPage.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace from `const confirmReopen` to `const handleSave`
pattern = r"  const confirmReopen = \(\) => \{.*?\};\n\n  const handleReleaseOrReopen = \(\) => \{.*?handleChange\('releasedDate', format\(new Date\(\), 'yyyy-MM-dd'\)\);\n    \}\n  \};\n\n  const handleSave = async \(\) => \{.*?\n  \};"

new_code = """  const executeSave = async (payloadToSave: UpdateProgressPayload) => {
    if (!selectedRow) return;
    setSaving(true);
    try {
      await tccService.updateProgress(selectedRow.requestId, payloadToSave);
      onSaveSuccess();
    } catch (error: any) {
      console.error('Failed to update progress', error);
      setErrorToast({ open: true, message: error.message || 'Failed to save data. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => executeSave(editForm);

  const confirmReopen = async () => {
    const newPayload = {
      ...editForm,
      finishedDate: null,
      developerName: '',
      delayRemakeReason: '',
      remarks: '',
      releasedDate: null,
      status: 'Remake'
    };
    setEditForm(newPayload);
    setReopenConfirmOpen(false);
    await executeSave(newPayload);
  };

  const handleReleaseOrReopen = async () => {
    if (editForm.releasedDate) {
      setReopenConfirmOpen(true);
    } else {
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
      
      const releasedDate = format(new Date(), 'yyyy-MM-dd');
      const newPayload = { ...editForm, releasedDate };
      setEditForm(newPayload);
      await executeSave(newPayload);
    }
  };"""

content = re.sub(pattern, new_code, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactored save logic for auto-saving on Release/Re-Open")
