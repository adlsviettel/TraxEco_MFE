import win32com.client
import os

file_path = r"D:\Downloads\Copy of Programmer.xlsx"

try:
    print("Opening Excel application...")
    excel = win32com.client.Dispatch("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False
    
    print(f"Opening workbook: {file_path}")
    wb = excel.Workbooks.Open(file_path)
    
    for ws in wb.Worksheets:
        print(f"Processing sheet: {ws.Name}")
        
        # Scale to 1 page
        ws.PageSetup.Zoom = False
        ws.PageSetup.FitToPagesWide = 1
        ws.PageSetup.FitToPagesTall = 1
        
        # Căn giữa theo chiều ngang để không bị lệch sang trái
        ws.PageSetup.CenterHorizontally = True
        
        # Chỉnh margin (lề) nhỏ lại để bảng to ra nếu có thể (đơn vị là Points, 1 inch = 72 points)
        # Để lề khoảng 0.4 inch (~28 points)
        ws.PageSetup.LeftMargin = 28
        ws.PageSetup.RightMargin = 28
        ws.PageSetup.TopMargin = 36
        ws.PageSetup.BottomMargin = 36
        
    print("Saving workbook...")
    wb.Save()
    wb.Close(SaveChanges=True)
    print("Done!")
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'excel' in locals():
        excel.Quit()
