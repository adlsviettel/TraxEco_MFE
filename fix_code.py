import re

with open(r'packages\tcc-template\src\components\RequestFormDialog.tsx', 'r', encoding='utf-8') as f:
  text = f.read()

# 1. Add missing state pendingShouldSave and urgentConfirmOpen
text = re.sub(r'const \[confirmOpen, setConfirmOpen\] = useState\(false\);', 'const [confirmOpen, setConfirmOpen] = useState(false);\n  const [urgentConfirmOpen, setUrgentConfirmOpen] = useState(false);\n  const [pendingShouldSave, setPendingShouldSave] = useState<boolean | null>(null);', text)

# 2. Fix handleConfirmSubmit to use PRE-CHECK
replacement = """  // User confirmed urgent
  const handleUrgentConfirm = async () => {
    setUrgentConfirmOpen(false);
    setSubmitting(true);
    try {
      await doCreateRequest(pendingShouldSave ?? false, true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit urgent request');
      setSubmitting(false);
    }
    setPendingShouldSave(null);
  };

  const handleUrgentCancel = async () => {
    setUrgentConfirmOpen(false);
    setPendingShouldSave(null);
    setSubmitting(false);
  };

  const handleConfirmSubmit = async (shouldSave: boolean) => {
    setConfirmOpen(false);
    setSubmitting(true);
    setError(null);

    try {
      if (form.factory && form.expectedDeliveryDate && !form.isPriority) {
        try {
          const dateStr = format(new Date(form.expectedDeliveryDate), 'yyyy-MM-dd');
          const usage = await tccService.getFactoryCapacityUsage(form.factory, dateStr);
          
          const used = usage?.used ?? usage?.currentUsage ?? usage?.usedCapacity ?? 0;
          const max = usage?.max ?? usage?.maxCapacity ?? usage?.maxDailyRequests ?? 0;
          const available = usage?.available ?? (max > 0 ? max - used : 999);
          
          if (usage && max > 0 && available <= 0) {
            setPendingShouldSave(shouldSave);
            setUrgentConfirmOpen(true);
            setSubmitting(false);
            return;
          }
        } catch (err) {
          console.warn('Capacity check failed:', err);
        }
      }

      await doCreateRequest(shouldSave);
    } catch (err: any) {
      setError(err.message || 'Failed to submit request');
      setSubmitting(false);
    }
  };
"""
text = re.sub(r'  const handleConfirmSubmit = async \(shouldSave: boolean\) => \{[\s\S]*?  const finalizeSuccess = async', replacement + '\n  const finalizeSuccess = async', text)

# 3. Increase all debounceMs={150} to debounceMs={500}
text = text.replace('debounceMs={150}', 'debounceMs={500}')

# 4. Add AppAutocomplete for season and productType
text = text.replace("import AppTextField from 'shared/src/components/ui/AppTextField';", "import AppTextField from 'shared/src/components/ui/AppTextField';\nimport AppAutocomplete from 'shared/src/components/ui/AppAutocomplete';")

# 5. Fix season Autocomplete
season_repl = """                        <AppAutocomplete
                          freeSolo
                          options={seasons}
                          value={form.season}
                          onChange={(_, newValue) => handleChange('season', newValue || '')}
                          debounceMs={500}
                          onDebounceInputChange={(newInputValue) => handleChange('season', newInputValue)}
                          renderInputProps={{
                            label: t('tcc.season'),
                            fullWidth: true,
                            required: true,
                            size: "small",
                            sx: {
                              bgcolor: '#fff',
                              '& fieldset': { borderColor: '#bfc9c4' },
                              '&:hover fieldset': { borderColor: '#2e7d32' },
                              '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
                            }
                          }}
                        />"""
text = re.sub(r'<Autocomplete\s+freeSolo\s+options=\{seasons\}[\s\S]*?</TextField>\s*?.*?\}\s*?/>', season_repl, text)

# 6. Fix productType Autocomplete
prod_repl = """                        <AppAutocomplete
                          freeSolo
                          options={productTypes}
                          value={form.productType}
                          onChange={(_, newValue) => handleChange('productType', newValue || '')}
                          debounceMs={500}
                          onDebounceInputChange={(newInputValue) => handleChange('productType', newInputValue)}
                          renderInputProps={{
                            label: t('tcc.productType'),
                            fullWidth: true,
                            required: true,
                            size: "small",
                            sx: {
                              bgcolor: '#fff',
                              '& fieldset': { borderColor: '#bfc9c4' },
                              '&:hover fieldset': { borderColor: '#2e7d32' },
                              '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
                            }
                          }}
                        />"""
text = re.sub(r'<Autocomplete\s+freeSolo\s+options=\{productTypes\}[\s\S]*?</TextField>\s*?.*?\}\s*?/>', prod_repl, text)

# 7. Add urgent confirm dialog if not present
urgent_dialog = """        open={urgentConfirmOpen}
        onClose={handleUrgentCancel}
        PaperProps={{
          sx: { borderRadius: 2, minWidth: 320 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#dc2626' }}>
          {t('tcc.urgentConfirmTitle', 'Capacity Full')}
        </DialogTitle>
        <DialogContent>
          <Typography>{t('tcc.urgentConfirmMessage', 'The requested factory capacity for this date is full. Do you want to submit this request as an URGENT request?')}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleUrgentCancel} color="inherit" variant="text">
            {t('tcc.no', 'No')}
          </Button>
          <Button onClick={handleUrgentConfirm} color="error" variant="contained">
            {t('tcc.yes', 'Yes, Submit as Urgent')}
          </Button>
        </DialogActions>
      </Dialog>"""

if "open={urgentConfirmOpen}" not in text:
    text = text.replace("</Drawer>", "</Drawer>\n      <Dialog\n" + urgent_dialog + "\n")


with open(r'packages\tcc-template\src\components\RequestFormDialog.tsx', 'w', encoding='utf-8') as f:
  f.write(text)
print("DONE")
