import fitz
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

doc = fitz.open(r'D:\Downloads\pia.pdf')
print(f'Pages: {len(doc)}')

with open(r'd:\TSI\TestClaudeCode\TraxEco\pdf_output_old.txt', 'w', encoding='utf-8', errors='replace') as f:
    for i, page in enumerate(doc):
        text = page.get_text()
        f.write(f'--- Page {i+1} ---\n')
        f.write(text)
        f.write('\n')
    print("Done writing to pdf_output_old.txt")
