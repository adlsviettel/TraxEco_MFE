import pyodbc

conn_str = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=192.168.1.245;"
    "DATABASE=DtradeProduction;"
    "UID=user_prog1;"
    "PWD=tHBJ@eJd94mZ;"
    "TrustServerCertificate=yes;"
)

conn = pyodbc.connect(conn_str)
cursor = conn.cursor()

# Check declarations for 0902903346 in COO_CustomsData
decls = ['108315653720', '108163434850', '108345185910', '108292341360', '108471926510', '108454193410', '107982965900']

for d in decls:
    cursor.execute("SELECT COUNT(*) FROM COO_CustomsData WHERE [Số TK] = ?", d)
    count = cursor.fetchone()[0]
    print(f"Declaration {d}: found {count} rows in COO_CustomsData")
