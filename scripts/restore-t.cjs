const fs = require('fs');

const data = fs.readFileSync('update-i18n.cjs', 'utf-8');
const viMatch = data.match(/const viKeys = \{([\s\S]*?)\n\};\n\nconst enKeys/);
if(!viMatch) { console.error('not found'); process.exit(1); }

let lines = viMatch[1].split('\n').filter(l => l.includes(':'));
let map = {};
lines.forEach(l => {
   let parts = l.split(':');
   let key = parts[0].trim();
   let val = parts.slice(1).join(':').trim().replace(/^"|"$/g, '').replace(/,\s*$/, '').replace(/^"|"$/g, '');
   map[val] = key;
});

// some values might have commas at the end, so let's clean string
// actually some are like items_count: "{{count}} mục",
// which means val is {{count}} mục

// Let's print the map to verify
console.log(Object.keys(map).length + " keys loaded.");

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
  let changed = false;

  // Replace t('rdMaterial.', 'some value') or t('rdMaterial.', "some value")
  // Or t('rdMaterial.', { ... defaultValue: 'some value' })

  // General text matcher:
  let newContent = content.replace(/t\('rdMaterial\.',\s*'([^']+)'\)/g, function(match, text) {
    if(map[text]) {
      changed = true;
      return 	('rdMaterial.', '');
    }
    return match;
  });

  newContent = newContent.replace(/t\('rdMaterial\.',\s*"([^"]+)"\)/g, function(match, text) {
    if(map[text]) {
      changed = true;
      return 	('rdMaterial.', "");
    }
    return match;
  });

  // What about objects passed to t? e.g. t('rdMaterial.', { count: total, defaultValue: ${total} mục })
  // We can just restore them manually since there are only a few.
  
  if (content !== newContent) {
    fs.writeFileSync(f, newContent, 'utf-8');
    console.log('Fixed simple string:', f);
  }
});
