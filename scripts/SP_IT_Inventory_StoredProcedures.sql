-- ==========================================================================================
-- TRAXECO IT INVENTORY - STORED PROCEDURES (UNIVERSAL / MULTI-SERVER SUPPORT)
-- Database: TraxEcoDB (or target database for IT Inventory)
-- Supports Linked Servers: [192.168.70.115_tsiiplan], [192.168.1.245_tsiiplan], [192.168.99.41_tsiiplan]
-- ==========================================================================================

USE [TraxEcoDB] -- Adjust database name as needed
GO

-- ------------------------------------------------------------------------------------------
-- 1. SP_INSW_GetErpData: Fetch Stock Opname & Adjustment data from AXDB Linked Server
--    Supports optional @LinkedServer parameter for 70.115, 1.245, and 99.41 environments
-- ------------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.SP_INSW_GetErpData', 'P') IS NOT NULL
    DROP PROCEDURE dbo.SP_INSW_GetErpData;
GO

CREATE PROCEDURE dbo.SP_INSW_GetErpData
    @Category VARCHAR(50) = 'wip',
    @TargetDate VARCHAR(10) = NULL,
    @LinkedServer VARCHAR(100) = '192.168.70.115_tsiiplan'
AS
BEGIN
    SET NOCOUNT ON;

    IF @TargetDate IS NULL OR LTRIM(RTRIM(@TargetDate)) = ''
        SET @TargetDate = CONVERT(VARCHAR(10), GETDATE(), 120);

    IF @LinkedServer IS NULL OR LTRIM(RTRIM(@LinkedServer)) = ''
        SET @LinkedServer = '192.168.70.115_tsiiplan';

    -- Format linked server brackets if missing
    IF LEFT(@LinkedServer, 1) <> '['
        SET @LinkedServer = '[' + @LinkedServer + ']';

    DECLARE @FromStr VARCHAR(25) = @TargetDate + ' 05:00:00';
    DECLARE @ToStr VARCHAR(25) = CONVERT(VARCHAR(10), DATEADD(day, 1, CAST(@TargetDate AS DATE)), 120) + ' 05:00:00';

    DECLARE @CategoryFilter NVARCHAR(500) = '';

    IF LOWER(@Category) = 'wip'
        SET @CategoryFilter = 'AND o.REFERENCECATEGORY = 8';
    ELSE IF LOWER(@Category) = 'finished'
        SET @CategoryFilter = 'AND o.REFERENCECATEGORY = 2';
    ELSE IF LOWER(@Category) = 'scrap'
        SET @CategoryFilter = 'AND (o.REFERENCECATEGORY = 6 OR d.INVENTLOCATIONID LIKE ''''%SCRAP%'''')';
    ELSE IF LOWER(@Category) = 'adjustment'
        SET @CategoryFilter = 'AND o.REFERENCECATEGORY = 4';
    ELSE IF LOWER(@Category) = 'auxiliary'
        SET @CategoryFilter = 'AND o.REFERENCECATEGORY = 3';
    ELSE IF LOWER(@Category) = 'machinery'
        SET @CategoryFilter = 'AND (i.ITEMGROUPID LIKE ''''%MESIN%'''' OR i.ITEMGROUPID LIKE ''''%ASSET%'''')';

    DECLARE @OpenQuerySql NVARCHAR(MAX);
    SET @OpenQuerySql = N'
    SELECT * FROM OPENQUERY(' + @LinkedServer + ', ''
        SELECT 
            o.REFERENCEID                                       AS nomorDokKegiatan, 
            CONVERT(VARCHAR(19), t.MODIFIEDDATETIME, 120)       AS thoiGianThucTe, 
            CONVERT(VARCHAR(10), DATEADD(hour, -5, t.MODIFIEDDATETIME), 120) AS ngayBaoCaoCutoff5AM, 
            CASE o.REFERENCECATEGORY 
                WHEN 0 THEN ''''Xuất hàng bán (Sales)'''' 
                WHEN 2 THEN ''''Nhập kho Thành phẩm (Production)'''' 
                WHEN 3 THEN ''''Nhập mua hàng (Purchase)'''' 
                WHEN 4 THEN ''''Điều chỉnh kho (Movement)'''' 
                WHEN 6 THEN ''''Báo phế & Kiểm kê (Scrap / LossProfit)'''' 
                WHEN 7 THEN ''''Chuyển kho (InventTransfer)'''' 
                WHEN 8 THEN ''''Xuất NVL Sản xuất (ProdLine / WIP)'''' 
                ELSE CAST(o.REFERENCECATEGORY AS VARCHAR(10)) 
            END                                                 AS loaiGiaoDichAX, 
            t.ITEMID                                            AS kdBarang, 
            ISNULL(i.ECCITEMCUSTOMNAME, i.NAMEALIAS)            AS uraianBarang, 
            i.ECCITEMCUSTOMCODE                                 AS hsCode, 
            t.QTY                                               AS jumlah, 
            i.ECCITEMCUSTOMUNITID                               AS kdSatuan, 
            ISNULL(t.COSTAMOUNTPOSTED, t.COSTAMOUNTPHYSICAL)    AS nilai, 
            d.INVENTLOCATIONID                                  AS kho 
        FROM AXDB.dbo.INVENTTRANS t WITH (NOLOCK) 
        INNER JOIN AXDB.dbo.INVENTTRANSORIGIN o WITH (NOLOCK) ON t.INVENTTRANSORIGIN = o.RECID AND t.DATAAREAID = o.DATAAREAID 
        LEFT JOIN AXDB.dbo.INVENTTABLE i WITH (NOLOCK)         ON t.ITEMID = i.ITEMID AND t.DATAAREAID = i.DATAAREAID 
        LEFT JOIN AXDB.dbo.INVENTDIM d WITH (NOLOCK)           ON t.INVENTDIMID = d.INVENTDIMID AND t.DATAAREAID = d.DATAAREAID 
        WHERE t.DATAAREAID = ''''tsi'''' 
          AND t.MODIFIEDDATETIME >= ''''' + @FromStr + ''''' 
          AND t.MODIFIEDDATETIME <  '''''' + @ToStr + ''''' 
          ' + @CategoryFilter + '
        ORDER BY t.MODIFIEDDATETIME DESC 
    '')';

    EXEC sp_executesql @OpenQuerySql;
END;
GO

-- ------------------------------------------------------------------------------------------
-- 2. SP_INSW_ListImportedFiles: List all imported IT Inventory files with push status
-- ------------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.SP_INSW_ListImportedFiles', 'P') IS NOT NULL
    DROP PROCEDURE dbo.SP_INSW_ListImportedFiles;
GO

CREATE PROCEDURE dbo.SP_INSW_ListImportedFiles
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        f.FileId, f.FileName, f.FileSize, f.StoragePath, f.ImportedBy, f.ImportedAt,
        f.ParseStatus, f.ParseError, f.TotalItems, f.IsDeleted,
        p.Status AS PushStatus, p.PushedAt,
        f.FileHash, f.FileType
    FROM dbo.INSW_ImportedFiles f WITH (NOLOCK)
    OUTER APPLY (
        SELECT TOP 1 Status, PushedAt
        FROM dbo.INSW_PushLog
        WHERE FileId = f.FileId
        ORDER BY PushedAt DESC
    ) p
    WHERE f.IsDeleted = 0
    ORDER BY f.ImportedAt DESC;
END;
GO

-- ------------------------------------------------------------------------------------------
-- 3. SP_INSW_GetDashboardStats: Retrieve statistics summary for IT Inventory Dashboard
-- ------------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.SP_INSW_GetDashboardStats', 'P') IS NOT NULL
    DROP PROCEDURE dbo.SP_INSW_GetDashboardStats;
GO

CREATE PROCEDURE dbo.SP_INSW_GetDashboardStats
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        (SELECT COUNT(*) FROM dbo.INSW_ImportedFiles WHERE IsDeleted = 0) AS totalFiles,
        (SELECT SUM(CASE WHEN ParseStatus='success' THEN 1 ELSE 0 END) FROM dbo.INSW_ImportedFiles WHERE IsDeleted = 0) AS totalParsed,
        (SELECT ISNULL(SUM(TotalItems), 0) FROM dbo.INSW_ImportedFiles WHERE IsDeleted = 0) AS totalItems,
        (SELECT SUM(CASE WHEN Status='success' THEN 1 ELSE 0 END) FROM dbo.INSW_PushLog) AS totalPushSuccess,
        (SELECT SUM(CASE WHEN Status='failed' THEN 1 ELSE 0 END) FROM dbo.INSW_PushLog) AS totalPushFailed;
END;
GO

-- ------------------------------------------------------------------------------------------
-- 4. SP_INSW_GetPushHistory: Retrieve push history log
-- ------------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.SP_INSW_GetPushHistory', 'P') IS NOT NULL
    DROP PROCEDURE dbo.SP_INSW_GetPushHistory;
GO

CREATE PROCEDURE dbo.SP_INSW_GetPushHistory
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        p.PushId, p.FileId, f.FileName, p.PushedBy, p.PushedAt, p.Status,
        p.HttpStatus, p.RequestBody, p.ResponseBody, p.ErrorMessage, p.Duration
    FROM dbo.INSW_PushLog p WITH (NOLOCK)
    LEFT JOIN dbo.INSW_ImportedFiles f WITH (NOLOCK) ON p.FileId = f.FileId
    ORDER BY p.PushedAt DESC;
END;
GO
