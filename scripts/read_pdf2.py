import sys, glob
pdf_files = glob.glob(r'D:\Project_A1A\FGsWH\C#\for Thai\FGsScan - Combine - Ver3 - Copy\FGsScan - Combine - Ver3 - Test scan no have packing list\FGsScan\*Scan out building.pdf')
if not pdf_files:
    sys.exit(1)
pdf_path = pdf_files[0]
try:
    import fitz
    doc = fitz.open(pdf_path)
    with open(r'D:\TSI\TestClaudeCode\TraxEco\pdf_output.txt', 'w', encoding='utf-8') as f:
        for page in doc:
            f.write(page.get_text() + '\n')
except ImportError:
    try:
        import PyPDF2
        with open(pdf_path, 'rb') as f_in:
            reader = PyPDF2.PdfReader(f_in)
            with open(r'D:\TSI\TestClaudeCode\TraxEco\pdf_output.txt', 'w', encoding='utf-8') as f_out:
                for page in reader.pages:
                    f_out.write(page.extract_text() + '\n')
    except ImportError:
        with open(r'D:\TSI\TestClaudeCode\TraxEco\pdf_output.txt', 'w', encoding='utf-8') as f_out:
            f_out.write('Neither PyMuPDF nor PyPDF2 is installed.\n')
