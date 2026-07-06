const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('src/apps/RD_MATERIAL/pages/**/*.tsx');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  // Match t('key', 'default')
  // We want to prefix the key with rdMaterial. if it doesn't have a dot already.
  let newContent = content.replace(/t\('([^'\\.]+)'/g, "t('rdMaterial.'");
  
  // also handle t("key", "default")
  newContent = newContent.replace(/t\("([^"\\.]+)"/g, 't("rdMaterial."');
  
  if (content !== newContent) {
    fs.writeFileSync(f, newContent, 'utf-8');
    console.log('Fixed:', f);
  }
});
