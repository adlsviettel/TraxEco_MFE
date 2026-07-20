import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

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

extractText('api_docs.pdf').catch(console.error);
