import re

filepath = r"d:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\pages\AdminStatusPage.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update isEditable
old_editable = """  const isEditable = React.useMemo(() => {
    if (!selectedRow) return false;
    const status = selectedRow.status || 'Not Started';
    const isReleased = !!selectedRow.releasedDate;
    return canEdit && !isReleased && status !== 'Deleted' && status !== 'Cancelled';
  }, [canEdit, selectedRow]);"""

new_editable = """  const isEditable = React.useMemo(() => {
    if (!selectedRow) return false;
    const status = editForm.status || selectedRow.status || 'Not Started';
    const isReleased = !!editForm.releasedDate;
    return canEdit && !isReleased && status !== 'Deleted' && status !== 'Cancelled';
  }, [canEdit, selectedRow, editForm.releasedDate, editForm.status]);"""

content = content.replace(old_editable, new_editable)


# 2. Update handleRelease
old_release = """  const handleRelease = () => {
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

new_release = """  const handleReleaseOrReopen = () => {
    if (editForm.releasedDate) {
      setEditForm((prev) => ({
        ...prev,
        finishedDate: null,
        developerName: '',
        delayRemakeReason: '',
        remarks: '',
        releasedDate: null,
        status: 'Remake'
      }));
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
      handleChange('releasedDate', format(new Date(), 'yyyy-MM-dd'));
    }
  };"""

content = content.replace(old_release, new_release)


# 3. Update the Release button rendering
old_button = """                    <AppButton
                      variant="outlined"
                      onClick={handleRelease}
                      sx={{ whiteSpace: 'nowrap' }}
                      disabled={!isEditable || !!editForm.releasedDate}
                    >
                      {t('tcc.release', 'Release')}
                    </AppButton>"""

new_button = """                    <AppButton
                      variant="outlined"
                      onClick={handleReleaseOrReopen}
                      sx={{ whiteSpace: 'nowrap' }}
                      disabled={!canEdit || editForm.status === 'Deleted' || editForm.status === 'Cancelled'}
                    >
                      {editForm.releasedDate ? t('tcc.reopen', 'Re-Open') : t('tcc.release', 'Release')}
                    </AppButton>"""

content = content.replace(old_button, new_button)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied Re-Open logic")
