import win32com.client
import os

file_path = r"D:\Downloads\Copy of Programmer.xlsx"
pdf_path = r"D:\Downloads\Programmer_Fixed.pdf"

try:
    print("Opening Excel application...")
    excel = win32com.client.Dispatch("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False
    
    print(f"Opening workbook: {file_path}")
    wb = excel.Workbooks.Open(file_path, ReadOnly=False)
    
    for ws in wb.Worksheets:
        print(f"Processing sheet: {ws.Name}")
        
        # Scale to 1 page
        ws.PageSetup.Zoom = False
        ws.PageSetup.FitToPagesWide = 1
        ws.PageSetup.FitToPagesTall = 1
        
        # Căn giữa theo chiều ngang để không bị lệch sang trái
        ws.PageSetup.CenterHorizontally = True
        ws.PageSetup.CenterVertically = False
        
        # Chỉnh margin nhỏ lại để bảng to ra
        ws.PageSetup.LeftMargin = 18
        ws.PageSetup.RightMargin = 18
        ws.PageSetup.TopMargin = 36
        ws.PageSetup.BottomMargin = 36
        
    print("Saving workbook...")
    wb.Save()
    
    print(f"Exporting to PDF: {pdf_path}")
    wb.ExportAsFixedFormat(0, pdf_path)
    
    wb.Close(SaveChanges=True)
    print("Done!")
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'excel' in locals():
        excel.Quit()
