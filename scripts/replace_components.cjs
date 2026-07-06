const fs = require('fs');
const path = require('path');

const files = [
  'src/apps/TCC_TEMPLATE/pages/RequestorViewPage.tsx',
  'src/apps/TCC_TEMPLATE/pages/AdminStatusPage.tsx',
  'src/apps/TCC_TEMPLATE/components/TccAdvancedFilterDrawer.tsx',
  'src/apps/TCC_TEMPLATE/components/RequestFormDialog.tsx'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');

    // Add imports if not present
    let imports = [];
    if (!content.includes('AppButton')) {
      if (file.includes('/pages/')) {
        imports.push(`import AppButton from '../components/ui/AppButton';`);
      } else {
        imports.push(`import AppButton from './ui/AppButton';`);
      }
    }
    if (!content.includes('AppTextField')) {
      if (file.includes('/pages/')) {
        imports.push(`import AppTextField from '../components/ui/AppTextField';`);
      } else {
        imports.push(`import AppTextField from './ui/AppTextField';`);
      }
    }
    
    if (imports.length > 0) {
      // insert after the last standard import or just at line 20
      content = content.replace(/(import .* from '.*';\n)/, `$1${imports.join('\n')}\n`);
    }

    // Replace TextField tags
    content = content.replace(/<TextField/g, '<AppTextField');
    content = content.replace(/<\/TextField>/g, '</AppTextField>');

    // Replace Button tags
    content = content.replace(/<Button/g, '<AppButton');
    content = content.replace(/<\/Button>/g, '</AppButton>');

    // Remove the verbose inline sx props that were simulating the AppButton style
    // I'll just let AppButton handle the primary/secondary styling.
    // For Filter button
    content = content.replace(/<AppButton(\s+)variant="outlined"(\s+)startIcon=\{<FilterListIcon \/>\}([\s\S]*?)sx=\{[\s\S]*?\}/g, '<AppButton$1variant="outlined" customVariant="secondary"$2startIcon={<FilterListIcon />}');
    
    // For Search button (Apply filters)
    content = content.replace(/<AppButton(\s+)variant="outlined"(\s+)onClick=\{handleApplyFilters\}([\s\S]*?)sx=\{[\s\S]*?\}/g, '<AppButton$1variant="outlined" customVariant="secondary"$2onClick={handleApplyFilters}');
    
    // For Add New Button
    content = content.replace(/<AppButton(\s+)variant="contained"(\s+)startIcon=\{<AddIcon \/>\}([\s\S]*?)sx=\{[\s\S]*?\}/g, '<AppButton$1variant="contained" customVariant="primary"$2startIcon={<AddIcon />}');

    // For Clear All button
    content = content.replace(/<AppButton(\s+)fullWidth(\s+)variant="outlined"(\s+)onClick=\{onClear\}([\s\S]*?)sx=\{[\s\S]*?\}/g, '<AppButton$1fullWidth$2variant="outlined" customVariant="secondary"$3onClick={onClear}');

    // For Apply button in Drawer
    content = content.replace(/<AppButton(\s+)fullWidth(\s+)variant="contained"(\s+)onClick=\{onApply\}([\s\S]*?)sx=\{[\s\S]*?\}/g, '<AppButton$1fullWidth$2variant="contained" customVariant="primary"$3onClick={onApply}');

    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${file}`);
  }
});
