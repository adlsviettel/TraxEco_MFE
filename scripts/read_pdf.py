import sys, glob
pdf_files = glob.glob(r'D:\Project_A1A\FGsWH\C#\for Thai\FGsScan - Combine - Ver3 - Copy\FGsScan - Combine - Ver3 - Test scan no have packing list\FGsScan\*Scan out building.pdf')
if not pdf_files:
    print('PDF not found')
    sys.exit(1)
pdf_path = pdf_files[0]
print('Reading:', pdf_path)
try:
    import fitz
    doc = fitz.open(pdf_path)
    for page in doc:
        print(page.get_text())
except ImportError:
    try:
        import PyPDF2
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                print(page.extract_text())
    except ImportError:
        print('Neither PyMuPDF nor PyPDF2 is installed.')
