import re

filepath = r"d:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\pages\AdminStatusPage.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the duplicate block
bad_block = """                  slotProps={{
                    field: { clearable: true },
                    textField: {
                      id: 'field-materialReceivedDate',
                      error: errorFields.includes('materialReceivedDate'),
                    field: { clearable: true },
                    textField: {"""

good_block = """                  slotProps={{
                    field: { clearable: true },
                    textField: {
                      id: 'field-materialReceivedDate',
                      error: errorFields.includes('materialReceivedDate'),"""

content = content.replace(bad_block, good_block)

# Fix startDate
start_date_target = """                  label={t('tcc.startDate', 'Start Date')}
                  minDate={new Date()}
                  value={editForm.startDate ? new Date(editForm.startDate) : null}
                  onChange={(val) => handleDateChange('startDate', val)}
                  disabled={!isEditable}
                  slotProps={{
                    field: { clearable: true },
                    textField: {
                      fullWidth: true,"""
start_date_repl = """                  label={t('tcc.startDate', 'Start Date')}
                  minDate={new Date()}
                  value={editForm.startDate ? new Date(editForm.startDate) : null}
                  onChange={(val) => handleDateChange('startDate', val)}
                  disabled={!isEditable}
                  slotProps={{
                    field: { clearable: true },
                    textField: {
                      id: 'field-startDate',
                      error: errorFields.includes('startDate'),
                      sx: errorFields.includes('startDate') ? { animation: `${pulseAnimation} 1s infinite` } : {},
                      fullWidth: true,"""
content = content.replace(start_date_target, start_date_repl)

# Fix finishedDate
finished_date_target = """                  label={t('tcc.finishedDate', 'Finished Date')}
                  minDate={new Date()}
                  value={editForm.finishedDate ? new Date(editForm.finishedDate) : null}
                  onChange={(val) => handleDateChange('finishedDate', val)}
                  disabled={!isEditable || !editForm.startDate}
                  slotProps={{
                    field: { clearable: true },
                    textField: {
                      fullWidth: true,"""
finished_date_repl = """                  label={t('tcc.finishedDate', 'Finished Date')}
                  minDate={new Date()}
                  value={editForm.finishedDate ? new Date(editForm.finishedDate) : null}
                  onChange={(val) => handleDateChange('finishedDate', val)}
                  disabled={!isEditable || !editForm.startDate}
                  slotProps={{
                    field: { clearable: true },
                    textField: {
                      id: 'field-finishedDate',
                      error: errorFields.includes('finishedDate'),
                      sx: errorFields.includes('finishedDate') ? { animation: `${pulseAnimation} 1s infinite` } : {},
                      fullWidth: true,"""
content = content.replace(finished_date_target, finished_date_repl)

# Apply animation to materialReceivedDate too
content = content.replace(
    "error: errorFields.includes('materialReceivedDate'),",
    "error: errorFields.includes('materialReceivedDate'),\n                      sx: errorFields.includes('materialReceivedDate') ? { animation: `${pulseAnimation} 1s infinite` } : {},"
)

# Fix Status
status_target = """                    readOnly={true}
                    sx={{
                      borderRadius: '8px',
                      height: 40,
                      fontSize: 13,
                      bgcolor: '#f8fafc',
                      pointerEvents: 'none',
                      '& fieldset': { borderColor: '#e2e8f0', borderStyle: 'dashed' },
                    }}"""
status_repl = """                    readOnly={true}
                    id="field-status"
                    error={errorFields.includes('status')}
                    sx={{
                      borderRadius: '8px',
                      height: 40,
                      fontSize: 13,
                      bgcolor: '#f8fafc',
                      pointerEvents: 'none',
                      animation: errorFields.includes('status') ? `${pulseAnimation} 1s infinite` : 'none',
                      '& fieldset': { borderColor: '#e2e8f0', borderStyle: 'dashed' },
                    }}"""
content = content.replace(status_target, status_repl)

# Fix developerName
dev_target = """                      label={t('tcc.developerName', 'Developer Name')}
                      onChange={(e) => handleChange('developerName', e.target.value)}
                    />"""
dev_repl = """                      label={t('tcc.developerName', 'Developer Name')}
                      onChange={(e) => handleChange('developerName', e.target.value)}
                      id="field-developerName"
                      error={errorFields.includes('developerName')}
                      sx={errorFields.includes('developerName') ? { animation: `${pulseAnimation} 1s infinite` } : {}}
                    />"""
content = content.replace(dev_target, dev_repl)

# Fix templateQty
qty_target = """                  label={t('tcc.templateQty', 'Template Quantity')}
                  type="number"
                  value={editForm.templateQty ?? ''}
                  onChange={(e) =>
                    handleChange('templateQty', e.target.value ? Number(e.target.value) : null)
                  }
                  fullWidth
                  disabled={!isEditable}
                />"""
qty_repl = """                  label={t('tcc.templateQty', 'Template Quantity')}
                  type="number"
                  value={editForm.templateQty ?? ''}
                  onChange={(e) =>
                    handleChange('templateQty', e.target.value ? Number(e.target.value) : null)
                  }
                  id="field-templateQty"
                  error={errorFields.includes('templateQty')}
                  sx={errorFields.includes('templateQty') ? { animation: `${pulseAnimation} 1s infinite` } : {}}
                  fullWidth
                  disabled={!isEditable}
                />"""
content = content.replace(qty_target, qty_repl)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied phase 2")
