import openpyxl
import sys

file_path = r"D:\Downloads\Copy of Programmer.xlsx"
new_path = r"D:\Downloads\Programmer_Fixed.xlsx"

try:
    print("Loading workbook...")
    wb = openpyxl.load_workbook(file_path)
    
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        
        # Enable Fit to Page
        ws.sheet_properties.pageSetUpPr.fitToPage = True
        ws.page_setup.fitToWidth = 1
        ws.page_setup.fitToHeight = 1
        
        # Center horizontally
        ws.print_options.horizontalCentered = True
        ws.print_options.verticalCentered = False
        
        # Adjust margins to be narrow (in inches)
        ws.page_margins.left = 0.25
        ws.page_margins.right = 0.25
        ws.page_margins.top = 0.5
        ws.page_margins.bottom = 0.5
        
    print(f"Saving to {new_path}")
    wb.save(new_path)
    print("Done!")
except Exception as e:
    print(f"Error: {e}")
