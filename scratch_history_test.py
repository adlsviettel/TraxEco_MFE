import pyodbc

conn_str = 'DRIVER={SQL Server};SERVER=172.18.99.41;DATABASE=DtradeProduction;UID=user_prog1;PWD=tHBJ@eJd94mZ'
try:
    conn = pyodbc.connect(conn_str, autocommit=True)
    cursor = conn.cursor()
    print("Connected successfully!")
    
    sql = """
        SELECT p.PushId, p.FileId, f.FileName, p.PushedBy, p.PushedAt, p.Status,
               p.HttpStatus, p.RequestBody, p.ResponseBody, p.ErrorMessage, p.Duration
        FROM dbo.INSW_PushLog p WITH (NOLOCK)
        LEFT JOIN dbo.INSW_ImportedFiles f WITH (NOLOCK) ON p.FileId = f.FileId
        ORDER BY p.PushedAt DESC
        """
    cursor.execute(sql)
    rows = cursor.fetchall()
    print(f"Fetched {len(rows)} rows successfully!")
except Exception as e:
    print("Error:", e)
