USE [DtradeProduction]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[sp_InlineFB_PrepareJobWithSplit]
    @pXmlString NVARCHAR(MAX),
    @pCreatedBy NVARCHAR(50),
    @pFactory   NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    -- Parse XML into temp table
    DECLARE @xml XML = @pXmlString;

    SELECT
        T.c.value('(QrCode)[1]', 'NVARCHAR(100)') AS QrCode,
        T.c.value('(JobNo)[1]', 'NVARCHAR(100)')   AS JobNo,
        T.c.value('(Yard)[1]', 'DECIMAL(10,2)')     AS Yard,
        T.c.value('(OrigYard)[1]', 'DECIMAL(10,2)') AS OrigYard
    INTO #PrepareData
    FROM @xml.nodes('/root/row') T(c);

    -- Process each roll
    DECLARE @QrCode NVARCHAR(100), @JobNo NVARCHAR(100), @Yard DECIMAL(10,2), @OrigYard DECIMAL(10,2);

    DECLARE cur CURSOR FOR
        SELECT QrCode, JobNo, Yard, OrigYard FROM #PrepareData;
    OPEN cur;
    FETCH NEXT FROM cur INTO @QrCode, @JobNo, @Yard, @OrigYard;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Insert into InlineFBPrepareJob with Yard info
        INSERT INTO InlineFBPrepareJob (QrCode, JobNo, Yard, OrigYard, CreatedDate, CreatedBy)
        VALUES (@QrCode, @JobNo, @Yard, @OrigYard, GETDATE(), @pCreatedBy);

        -- Update roll status to Prepared (Status = 3)
        IF @Yard >= @OrigYard
        BEGIN
            -- Full roll: update status to Prepared
            UPDATE InlineFBRollDataDtl
            SET Status = 3
            WHERE RollNameID = @QrCode;
        END
        -- NOTE: If @Yard < @OrigYard (Partial pick), we intentionally DO NOT update FoC_ExYrds 
        -- so the user can still scan the roll normally and its yardage remains intact.

        FETCH NEXT FROM cur INTO @QrCode, @JobNo, @Yard, @OrigYard;
    END

    CLOSE cur;
    DEALLOCATE cur;

    DROP TABLE #PrepareData;
END
GO
