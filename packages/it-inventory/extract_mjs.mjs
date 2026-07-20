import fs from 'fs';
import * as pdfjsLib from '../../node_modules/pdfjs-dist/build/pdf.mjs';

async function extractText(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument(data).promise;
  let fullText = '';
  
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(' ');
    fullText += `--- Page ${i} ---\n${text}\n\n`;
  }
  
  fs.writeFileSync('api_docs.txt', fullText);
  console.log('Done extracting. Check api_docs.txt');
}

extractText('C:\\\\Users\\\\MSI\\\\.gemini\\\\antigravity\\\\brain\\\\b4ef335f-3648-4d32-98ce-7ff92799340f\\\\scratch\\\\api_docs.pdf').catch(console.error);
