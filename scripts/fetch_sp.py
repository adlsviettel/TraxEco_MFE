import pyodbc

conn_str = 'DRIVER={ODBC Driver 17 for SQL Server};SERVER=192.168.54.8;DATABASE=DtradeProduction;UID=sa;PWD=Admin@168*'
try:
    conn = pyodbc.connect(conn_str, timeout=5)
    cursor = conn.cursor()
    cursor.execute("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.InlineFBGetData'))")
    row = cursor.fetchone()
    if row and row[0]:
        with open('InlineFBGetData_sp.sql', 'w', encoding='utf-8') as f:
            f.write(row[0])
        print("Success: SP saved.")
    else:
        print("SP not found.")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
