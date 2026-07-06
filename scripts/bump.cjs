const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.html');

try {
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // Find the current DEPLOY_VERSION
  const regex = /var DEPLOY_VERSION = '([^']+)';/;
  const match = content.match(regex);
  
  if (match) {
    const oldVersion = match[1];
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const newVersion = `v_${timestamp}_noconsole`;
    
    content = content.replace(regex, `var DEPLOY_VERSION = '${newVersion}';`);
    fs.writeFileSync(indexPath, content, 'utf8');
    
    console.log(`[Bump] Updated index.html cache buster from ${oldVersion} to ${newVersion}`);
  } else {
    console.warn('[Bump] Could not find DEPLOY_VERSION string in index.html');
  }
} catch (err) {
  console.error('[Bump Error]', err);
}
