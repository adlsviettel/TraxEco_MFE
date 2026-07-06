import re

with open('sp_planload.sql', 'r', encoding='utf-8') as f:
    lines = f.readlines()

out_lines = []
for line in lines:
    clean_line = line.strip()
    if clean_line and clean_line != 'Text' and not clean_line.startswith('---'):
        out_lines.append(clean_line)

content = '\n'.join(out_lines)

# Replace procedure name and use CREATE instead of ALTER for new server
content = content.replace('CREATE proc [dbo].[InlineFGsWHPlanLoad_Cust]', 'SET ANSI_NULLS ON;\nGO\nSET QUOTED_IDENTIFIER ON;\nGO\nALTER proc [dbo].[InlineFGsWHPlanLoad_Cust_v2]')

# Add clustered indexes to temp tables
# Let's find where #Base is created
idx_base = content.find("INTO #Base")
if idx_base != -1:
    content = content.replace(
        "AND t1.CTNLocation IS NOT NULL;",
        "AND t1.CTNLocation IS NOT NULL;\nCREATE CLUSTERED INDEX idx_base ON #Base(PONo);"
    )

content = content.replace(
    "INTO #tempTu11",
    "INTO #tempTu11"
)
# For #tempTu1
content = content.replace(
    "GROUP BY a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty,a.InCTNQty,a.PerClose,a.Final,a.POLocation,a.Comment2,a.Factory,b.CTNL,b.CTNH,b.CTNW",
    "GROUP BY a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty,a.InCTNQty,a.PerClose,a.Final,a.POLocation,a.Comment2,a.Factory,b.CTNL,b.CTNH,b.CTNW;\nCREATE CLUSTERED INDEX idx_tempTu1 ON #tempTu1(StyleNo, PONo, Country, SchExFactory, Factory);"
)

# Fix line breaks
content = content.replace('b.N\numberIn', 'b.NumberIn')
content = content.replace('P2\n.CTNH', 'P2.CTNH')

# Replace the 30 days hardcoding to use the @MCutOfTime parameter with 30 days window
content = content.replace("DATEADD(DAY,-30,GETDATE())", "DATEADD(DAY,-30,CAST(@MCutOfTime AS DATE))")

cte_original = """;WITH CTE_MaxRecNo AS (
SELECT *,
ROW_NUMBER() OVER (PARTITION BY CTNBarCode ORDER BY RecNo DESC) AS rn
FROM dbo.InlineFGsWHCTNActWght WITH (NOLOCK)
)
SELECT a.PONo,
SUM(b.ActualWght) AS TotalActualWght,
COUNT(DISTINCT a.CTNBarCode) AS TotalCTNBarCode
INTO #Temp_W
FROM (
SELECT DISTINCT b.PONo, b.CTNSeriNo, b.CTNBarCode
FROM #Temp_F1 a
INNER JOIN dbo.InlineFGsWHCTNMaster b WITH (NOLOCK) ON a.PONo = RIGHT(b.PONo, 9)
WHERE b.ReScan IS NULL
) a
LEFT JOIN CTE_MaxRecNo b ON a.CTNBarCode = b.CTNBarCode AND b.rn = 1
GROUP BY a.PONo
ORDER BY a.PONo;"""

cte_optimized = """SELECT DISTINCT b.CTNBarCode
INTO #Temp_Barcodes
FROM #Temp_F1 x
INNER JOIN dbo.InlineFGsWHCTNMaster b WITH (NOLOCK) ON x.PONo = RIGHT(b.PONo, 9)
WHERE b.ReScan IS NULL;

CREATE CLUSTERED INDEX idx_Barcodes ON #Temp_Barcodes(CTNBarCode);

;WITH CTE_MaxRecNo AS (
SELECT w.CTNBarCode, w.ActualWght,
ROW_NUMBER() OVER (PARTITION BY w.CTNBarCode ORDER BY w.RecNo DESC) AS rn
FROM dbo.InlineFGsWHCTNActWght w WITH (NOLOCK)
INNER JOIN #Temp_Barcodes t ON w.CTNBarCode = t.CTNBarCode
)
SELECT a.PONo,
SUM(b.ActualWght) AS TotalActualWght,
COUNT(DISTINCT a.CTNBarCode) AS TotalCTNBarCode
INTO #Temp_W
FROM (
SELECT DISTINCT b.PONo, b.CTNSeriNo, b.CTNBarCode
FROM #Temp_F1 a
INNER JOIN dbo.InlineFGsWHCTNMaster b WITH (NOLOCK) ON a.PONo = RIGHT(b.PONo, 9)
WHERE b.ReScan IS NULL
) a
LEFT JOIN CTE_MaxRecNo b ON a.CTNBarCode = b.CTNBarCode AND b.rn = 1
GROUP BY a.PONo
ORDER BY a.PONo;"""

content = content.replace(cte_original, cte_optimized)

# Fix the 22s bottleneck on #Temp_CreatedBy
content = content.replace(
    "INTO #Temp_CreatedBy\nFROM dbo.InlineFGsWHCTNMaster WITH (NOLOCK)\nWHERE RIGHT(PONo,9) IN (SELECT DISTINCT PONo FROM #tempp_)",
    "INTO #Temp_CreatedBy\nFROM dbo.InlineFGsWHCTNMaster WITH (NOLOCK)\nWHERE PONo_9 IN (SELECT DISTINCT PONo FROM #tempp_);\nCREATE CLUSTERED INDEX idx_CreatedBy ON #Temp_CreatedBy(PONo);"
)

# Use the PONo_9 computed column in all other places to avoid full table scans
content = content.replace(
    "LEFT JOIN dbo.InlineFGsWHPkList b WITH (NOLOCK) ON RIGHT(a.PONo,9) = RIGHT(b.PONo,9)",
    "LEFT JOIN dbo.InlineFGsWHPkList b WITH (NOLOCK) ON RIGHT(a.PONo,9) = b.PONo_9"
)
content = content.replace(
    "INNER JOIN dbo.InlineFGsWHCTNMaster b WITH (NOLOCK) ON a.PONo = RIGHT(b.PONo, 9)",
    "INNER JOIN dbo.InlineFGsWHCTNMaster b WITH (NOLOCK) ON a.PONo = b.PONo_9"
)
content = content.replace(
    "INNER JOIN dbo.InlineFGsWHCTNMaster b WITH (NOLOCK) ON x.PONo = RIGHT(b.PONo, 9)",
    "INNER JOIN dbo.InlineFGsWHCTNMaster b WITH (NOLOCK) ON x.PONo = b.PONo_9"
)

with open('sp_planload_v2.sql', 'w', encoding='utf-8') as f:
    f.write(content)
