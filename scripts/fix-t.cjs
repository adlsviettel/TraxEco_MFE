const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('src/apps/RD_MATERIAL/pages');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  // Match t('key', 'default') or t('key') where key doesn't have a dot and is not 't('
  let newContent = content.replace(/t\('([^'\\.]+)'/g, "t('rdMaterial.'");
  newContent = newContent.replace(/t\("([^"\\.]+)"/g, 't("rdMaterial."');
  if (content !== newContent) {
    fs.writeFileSync(f, newContent, 'utf-8');
    console.log('Fixed:', f);
  }
});
