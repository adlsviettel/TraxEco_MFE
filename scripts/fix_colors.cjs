const fs = require('fs');
const path = require('path');

const files = [
  'src/apps/TCC_TEMPLATE/layouts/TccTemplateLayout.tsx',
  'src/apps/TCC_TEMPLATE/pages/RequestorViewPage.tsx',
  'src/apps/TCC_TEMPLATE/pages/AdminStatusPage.tsx',
  'src/apps/TCC_TEMPLATE/components/RequestFormDialog.tsx'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace blue colors with green colors
    content = content.replace(/#1976d2/g, '#3ba55c');
    content = content.replace(/#42a5f5/g, '#2e7d32');
    content = content.replace(/#1565c0/g, '#2e7d32');
    content = content.replace(/rgba\(25,\s*118,\s*210/g, 'rgba(59, 165, 92');
    content = content.replace(/rgba\(25,118,210/g, 'rgba(59,165,92');
    
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${file}`);
  }
});
