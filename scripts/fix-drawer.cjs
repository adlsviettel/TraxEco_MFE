const fs = require('fs');
let f = 'src/apps/RD_MATERIAL/pages/FabricFormDrawer.tsx';
let str = fs.readFileSync(f, 'utf8');

// Match alue={(form as any).xyz ?? ''} onChange={(e) => set('rdMaterial.', e.target.value)}
str = str.replace(/value=\{\(form as any\)\.([a-zA-Z0-9_]+)\s*\?\?\s*''\}\s*onChange=\{\(e\)\s*=>\s*set\('rdMaterial\.',/g, "value={(form as any). ?? ''} onChange={(e) => set('',");

// Match alue={form.xyz ?? ''} onChange={(e) => set('rdMaterial.', e.target.value)}
str = str.replace(/value=\{form\.([a-zA-Z0-9_]+)\s*\?\?\s*''\}\s*onChange=\{\(e\)\s*=>\s*set\('rdMaterial\.',/g, "value={form. ?? ''} onChange={(e) => set('',");

// Match alue={form.xyz || ''} onChange={(e) => set('rdMaterial.', e.target.value)}
str = str.replace(/value=\{form\.([a-zA-Z0-9_]+)\s*\|\|\s*''\}\s*onChange=\{\(e\)\s*=>\s*set\('rdMaterial\.',/g, "value={form. || ''} onChange={(e) => set('',");

// alue={form.priceUnit || ''} onChange={(_, v) => set('rdMaterial.',
str = str.replace(/value=\{form\.([a-zA-Z0-9_]+)\s*\|\|\s*''\}\s*onChange=\{\(_, v\)\s*=>\s*set\('rdMaterial\.',/g, "value={form. || ''} onChange={(_, v) => set('',");

// onInputChange={(_, v) => set('rdMaterial.', v)} -- wait, which field is this bound to?
// Let's just fix the remaining ones manually to be extremely safe.

fs.writeFileSync(f, str, 'utf-8');
