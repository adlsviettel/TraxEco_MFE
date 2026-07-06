const fs = require('fs');

let filePaths = [
  'src/apps/RD_MATERIAL/pages/DashboardPage.tsx',
  'src/apps/RD_MATERIAL/pages/FabricDetailPage.tsx',
  'src/apps/RD_MATERIAL/pages/FabricFormDrawer.tsx',
  'src/apps/RD_MATERIAL/pages/FabricListPage.tsx',
  'src/apps/RD_MATERIAL/pages/LabelPrintPage.tsx',
  'src/apps/RD_MATERIAL/pages/ScanOutPage.tsx',
  'src/apps/RD_MATERIAL/pages/GenericPages.tsx'
];

filePaths.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  content = content.replace(/\{\s*\('rdMaterial\.',\s*('([^']*)'|"([^"]*)")\)\s*\}/g, "{}");
  content = content.replace(/\{\s*\('rdMaterial\.',\s*''\)\s*\}/g, "{}");
  content = content.replace(/\{\s*\('rdMaterial\.',\s*""\)\s*\}/g, "{}");
  
  // also check if the label={} was actually generated
  
  fs.writeFileSync(f, content, 'utf-8');
});
console.log('clean');
