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

    po = "''0902952505''"
    open_query = f"""
    SELECT 
        st.DATAAREAID, st.SALESID, pt.PRODID, pt.PRODSTATUS, 
        st.PURCHORDERFORMNUM, st.CUSTOMERREF, st.CUSTACCOUNT, 
        id_fg.INVENTSTYLEID, sl.ITEMID, id_fg.INVENTCOLORID, id_fg.INVENTSIZEID, 
        sl.SALESUNIT, st.SALESTYPE, sl.SALESSTATUS, 
        it_rm.DATAAREAID AS RMAREA, it_rm.ITEMID AS RMITEMID, pb.ITEMID AS [Material Code], it_rm.PRODUCT, 
        id_rm.CONFIGID, id_rm.INVENTCOLORID AS RMCOLOR, id_rm.INVENTSIZEID AS RMSIZE, id_rm.INVENTSTYLEID AS RMSTYLE, 
        pb.UNITID AS [Unit Of RM], id_rm.INVENTBATCHID, id_rm.INVENTSERIALID, 
        id_rm.INVENTLOCATIONID, id_rm.WMSLOCATIONID AS [Location], 
        inv.RECID, inv.STATUSISSUE, 
        it_rm.ECCITEMCUSTOMCODE, st.TRX_POLAT, 
        pb.INVENTTRANSID, 
        MAX(vj.DELIVERYDATE) AS DELIVERYDATE, 
        MAX(ISNULL(ph.ORDERACCOUNT, '''')) AS [Supp Code], 
        MAX(ISNULL(dpt.NAME, '''')) AS [Supplier], 
        MAX(ISNULL(vj.COUNTRYREGIONID, '''')) AS [Country/region], 
        MAX(ISNULL(vj.ECCPURCHDECLARENO, '''')) AS [Declaration number], 
        MAX(ISNULL(pb.ECCPARTNAME, '''')) AS [Part Name], 
        SUM(inv.QTY) AS [Reserve Qty], 
        '''' AS [Plant Code field] 
    FROM AXDB.dbo.SALESTABLE st WITH (NOLOCK) 
    JOIN AXDB.dbo.SALESLINE sl WITH (NOLOCK) ON st.SALESID = sl.SALESID AND st.DATAAREAID = sl.DATAAREAID 
    LEFT JOIN AXDB.dbo.INVENTDIM id_fg WITH (NOLOCK) ON sl.INVENTDIMID = id_fg.INVENTDIMID AND sl.DATAAREAID = id_fg.DATAAREAID 
    JOIN AXDB.dbo.PRODTABLE pt WITH (NOLOCK) ON pt.INVENTREFTRANSID = sl.INVENTTRANSID AND pt.DATAAREAID = sl.DATAAREAID 
    JOIN AXDB.dbo.PRODBOM pb WITH (NOLOCK) ON pt.PRODID = pb.PRODID AND pt.DATAAREAID = pb.DATAAREAID 
    JOIN AXDB.dbo.INVENTTABLE it_rm WITH (NOLOCK) ON pb.ITEMID = it_rm.ITEMID AND pb.DATAAREAID = it_rm.DATAAREAID 
    JOIN AXDB.dbo.INVENTITEMGROUPITEM iig WITH (NOLOCK) ON iig.ITEMDATAAREAID = it_rm.DATAAREAID AND iig.ITEMID = it_rm.ITEMID AND iig.ITEMGROUPID = ''RFB'' 
    JOIN AXDB.dbo.INVENTTRANSORIGIN ito WITH (NOLOCK) ON ito.INVENTTRANSID = pb.INVENTTRANSID AND ito.DATAAREAID = pb.DATAAREAID 
    JOIN AXDB.dbo.INVENTTRANS inv WITH (NOLOCK) ON inv.INVENTTRANSORIGIN = ito.RECID AND inv.DATAAREAID = ito.DATAAREAID 
    LEFT JOIN AXDB.dbo.INVENTDIM id_rm WITH (NOLOCK) ON inv.INVENTDIMID = id_rm.INVENTDIMID AND inv.DATAAREAID = id_rm.DATAAREAID 
    LEFT JOIN AXDB.dbo.PURCHTABLE ph WITH (NOLOCK) ON ph.PURCHID = id_rm.INVENTBATCHID AND ph.DATAAREAID = st.DATAAREAID 
    LEFT JOIN AXDB.dbo.VENDTABLE v2 WITH (NOLOCK) ON v2.ACCOUNTNUM = ph.ORDERACCOUNT AND v2.DATAAREAID = st.DATAAREAID 
    LEFT JOIN AXDB.dbo.DIRPARTYTABLE dpt WITH (NOLOCK) ON dpt.RECID = v2.PARTY 
    LEFT JOIN AXDB.dbo.VENDPACKINGSLIPJOUR vj WITH (NOLOCK) ON vj.PURCHID = id_rm.INVENTBATCHID AND vj.DATAAREAID = st.DATAAREAID 
    WHERE st.CUSTOMERREF = {po} AND st.DATAAREAID = ''a1a'' 
    AND ISNULL(id_rm.INVENTLOCATIONID, '''') <> ''CEN-MATV'' 
    AND ISNULL(it_rm.ECCITEMCUSTOMCODE, '''') <> ''DK1'' 
    GROUP BY st.DATAAREAID, st.SALESID, pt.PRODID, pt.PRODSTATUS, st.PURCHORDERFORMNUM, st.CUSTOMERREF, st.CUSTACCOUNT, id_fg.INVENTSTYLEID, sl.ITEMID, id_fg.INVENTCOLORID, id_fg.INVENTSIZEID, sl.SALESUNIT, st.SALESTYPE, sl.SALESSTATUS, it_rm.DATAAREAID, it_rm.ITEMID, pb.ITEMID, it_rm.PRODUCT, id_rm.CONFIGID, id_rm.INVENTCOLORID, id_rm.INVENTSIZEID, id_rm.INVENTSTYLEID, pb.UNITID, id_rm.INVENTBATCHID, id_rm.INVENTSERIALID, id_rm.INVENTLOCATIONID, id_rm.WMSLOCATIONID, inv.RECID, inv.STATUSISSUE, it_rm.ECCITEMCUSTOMCODE, st.TRX_POLAT, pb.INVENTTRANSID
    """

    sql = f"""
    SELECT erp.CUSTOMERREF, erp.[Material Code], erp.PRODUCT,
        erp.[Declaration number] as erpDeclNo,
        erp.[Country/region] as erpCountry,
        ISNULL(NULLIF(erp.[Declaration number], ''), COALESCE(c_exact.[Số TK], c_fallback.[Số TK])) as computedDeclarationNumber,
        ISNULL(NULLIF(COALESCE(c_exact.[Xuất xứ], c_fallback.[Xuất xứ]), ''), erp.[Country/region]) as computedCountryRegion,
        CAST(CASE WHEN m.[Material Code] IS NOT NULL THEN 1 ELSE 0 END AS BIT) as isMainFabric
    FROM OPENQUERY([192.168.70.115], '{open_query}') erp
    OUTER APPLY (SELECT TOP 1 [Xuất xứ], [Mã loại hình], [Ghi chú], [Số TK] FROM COO_CustomsData WHERE erp.[Declaration number] <> '' AND [Số TK] = erp.[Declaration number] COLLATE SQL_Latin1_General_CP1_CI_AS) c_exact
    OUTER APPLY (SELECT TOP 1 [Xuất xứ], [Mã loại hình], [Ghi chú], [Số TK] FROM COO_CustomsData WHERE NULLIF(erp.[Declaration number], '') IS NULL AND c_exact.[Số TK] IS NULL AND ([Số hóa đơn] = erp.INVENTSERIALID COLLATE SQL_Latin1_General_CP1_CI_AS OR [Số hợp đồng] = erp.INVENTSERIALID COLLATE SQL_Latin1_General_CP1_CI_AS OR [Số hóa đơn] = erp.INVENTBATCHID COLLATE SQL_Latin1_General_CP1_CI_AS OR [Số hợp đồng] = erp.INVENTBATCHID COLLATE SQL_Latin1_General_CP1_CI_AS)) c_fallback
    OUTER APPLY (SELECT TOP 1 [Material Code] FROM COO_ConsumptionData WHERE [Customer order No.] = erp.[CUSTOMERREF] COLLATE SQL_Latin1_General_CP1_CI_AS AND [Material Code] = erp.[Material Code] COLLATE SQL_Latin1_General_CP1_CI_AS) m
    """

    cursor.execute(sql)
    rows = cursor.fetchall()
    print(f"\nFetched {len(rows)} rows for PO 0902952505:")
    cols = [column[0] for column in cursor.description]
    for r in rows:
        d = dict(zip(cols, r))
        print("  MatCode:", d['Material Code'], "| DeclNo:", d['computedDeclarationNumber'], "| Country:", d['computedCountryRegion'], "| isMainFabric:", d['isMainFabric'])

except Exception as e:
    print("Error:", e)
