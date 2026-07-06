import re

filepath = r"d:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\pages\AdminStatusPage.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state
if "const [reopenConfirmOpen" not in content:
    content = content.replace(
        "const [errorToast, setErrorToast]",
        "const [reopenConfirmOpen, setReopenConfirmOpen] = useState(false);\n  const [errorToast, setErrorToast]"
    )

# 2. Add confirmReopen
if "const confirmReopen = () => {" not in content:
    confirm_func = """  const confirmReopen = () => {
    setEditForm((prev) => ({
      ...prev,
      finishedDate: null,
      developerName: '',
      delayRemakeReason: '',
      remarks: '',
      releasedDate: null,
      status: 'Remake'
    }));
    setReopenConfirmOpen(false);
  };

  const handleReleaseOrReopen = () => {"""
    content = content.replace("  const handleReleaseOrReopen = () => {", confirm_func)

# 3. Update handleReleaseOrReopen
old_reopen = """  const handleReleaseOrReopen = () => {
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
    } else {"""
new_reopen = """  const handleReleaseOrReopen = () => {
    if (editForm.releasedDate) {
      setReopenConfirmOpen(true);
    } else {"""
content = content.replace(old_reopen, new_reopen)

# 4. Render Dialog
dialog_code = """      <Dialog open={reopenConfirmOpen} onClose={() => setReopenConfirmOpen(false)}>
        <DialogTitle>{t('tcc.confirmReopenTitle', 'Confirm Re-Open')}</DialogTitle>
        <DialogContent>
          <Typography>{t('tcc.confirmReopenMessage', 'Are you sure you want to re-open this request? This will clear the Finished Date, In-charge Person, Remarks, and set Status to Remake.')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReopenConfirmOpen(false)} color="inherit">
            {t('tcc.cancel', 'Cancel')}
          </Button>
          <Button onClick={confirmReopen} color="warning" variant="contained" disableElevation>
            {t('tcc.reopen', 'Re-Open')}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );"""

content = content.replace("    </Drawer>\n  );", dialog_code)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Added Re-Open confirmation dialog")
