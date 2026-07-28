import re

with open(r'packages\tcc-template\src\components\RequestFormDialog.tsx', 'r', encoding='utf-8') as f:
  text = f.read()

replacement = """</Drawer>
      <Dialog
        open={urgentConfirmOpen}
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
      </Dialog>
    </>
  );
};

export default RequestFormDialog;
"""

text = re.sub(r'</Drawer>[\s\S]*$', replacement, text)

with open(r'packages\tcc-template\src\components\RequestFormDialog.tsx', 'w', encoding='utf-8') as f:
  f.write(text)
print("DONE")
