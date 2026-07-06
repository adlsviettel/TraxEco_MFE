const fs = require('fs');
const path = require('path');

const localesDir = path.resolve(__dirname, 'locales');
const languages = ['en', 'vi', 'th', 'km', 'id'];

// 1. Validate JSON parsing
console.log('=== JSON Validation ===');
const allData = {};
languages.forEach(lang => {
    const file = path.join(localesDir, `${lang}.json`);
    try {
        const raw = fs.readFileSync(file, 'utf8');
        allData[lang] = JSON.parse(raw);
        console.log(`  ${lang}.json: VALID JSON (${Object.keys(allData[lang]).length} top-level keys)`);
    } catch (e) {
        console.log(`  ${lang}.json: INVALID - ${e.message}`);
    }
});

// 2. Scan for corrupt/control characters in values
console.log('\n=== Scanning for Corrupt Characters ===');
function scanCorrupt(obj, prefix, lang) {
    const issues = [];
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
            issues.push(...scanCorrupt(value, fullKey, lang));
        } else if (typeof value === 'string') {
            // Check for control characters (U+0000 to U+001F except \n \r \t)
            const controlMatch = value.match(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g);
            if (controlMatch) {
                issues.push({ lang, key: fullKey, reason: 'Control characters found', sample: value.substring(0, 80) });
            }
            // Check for replacement character U+FFFD
            if (value.includes('\uFFFD')) {
                issues.push({ lang, key: fullKey, reason: 'Replacement char (U+FFFD)', sample: value.substring(0, 80) });
            }
            // Check for unusual Unicode blocks that shouldn't appear in normal text
            const weirdMatch = value.match(/[\uD800-\uDFFF]/g);
            if (weirdMatch) {
                issues.push({ lang, key: fullKey, reason: 'Surrogate chars found', sample: value.substring(0, 80) });
            }
        }
    }
    return issues;
}

let totalIssues = 0;
languages.forEach(lang => {
    if (!allData[lang]) return;
    const issues = scanCorrupt(allData[lang], '', lang);
    if (issues.length > 0) {
        issues.forEach(i => {
            console.log(`  [${i.lang}] ${i.key}: ${i.reason}`);
            console.log(`    Sample: "${i.sample}"`);
        });
        totalIssues += issues.length;
    }
});

if (totalIssues === 0) {
    console.log('  No corrupt characters found in any language file!');
}

// 3. Check for missing keys across languages (using 'en' as reference)
console.log('\n=== Missing Key Check (vs English) ===');
function flattenKeys(obj, prefix) {
    let keys = [];
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
            keys.push(...flattenKeys(value, fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    return keys;
}

if (allData.en) {
    const enKeys = flattenKeys(allData.en, '');
    languages.filter(l => l !== 'en').forEach(lang => {
        if (!allData[lang]) return;
        const langKeys = new Set(flattenKeys(allData[lang], ''));
        const missing = enKeys.filter(k => !langKeys.has(k));
        if (missing.length > 0) {
            console.log(`  ${lang}.json: Missing ${missing.length} keys`);
            missing.slice(0, 5).forEach(k => console.log(`    - ${k}`));
            if (missing.length > 5) console.log(`    ... and ${missing.length - 5} more`);
        } else {
            console.log(`  ${lang}.json: All keys present`);
        }
    });
}

console.log('\nDone!');
