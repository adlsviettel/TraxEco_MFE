import pyodbc

conn_str = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=192.168.1.245;"
    "DATABASE=DtradeProduction;"
    "UID=user_prog1;"
    "PWD=tHBJ@eJd94mZ;"
    "TrustServerCertificate=yes;"
)

try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    decls = ['108476632940', '108451195860', '108445396620']
    for d in decls:
        cursor.execute(f"SELECT [Số TK], [Xuất xứ], [Mã loại hình], [Ghi chú] FROM COO_CustomsData WHERE [Số TK] = '{d}'")
        rows = cursor.fetchall()
        print(f"Customs data for {d}: {len(rows)} rows found")
        for r in rows:
            print("  ", r)

    print("\n--- Check all rows in COO_ConsumptionData for PO 0902952505 ---")
    cursor.execute("SELECT [Customer order No.], [Material Code], [Material Name] FROM COO_ConsumptionData WHERE [Customer order No.] LIKE '%0902952505%'")
    rows = cursor.fetchall()
    print("COO_ConsumptionData rows:", len(rows))
    for r in rows:
        print("  ", r)

except Exception as e:
    print("Error:", e)
