-- ========================================================
-- Add 'Technology' freetext field for Fabric Hanger
-- Target Tables: [dbo].[RD_Fabric] and [dbo].[RD_Items]
-- ========================================================

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RD_Fabric]') AND type in (N'U'))
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[RD_Fabric]') AND name = 'Technology')
    BEGIN
        ALTER TABLE [dbo].[RD_Fabric] ADD [Technology] NVARCHAR(500) NULL;
        PRINT 'Added column Technology to RD_Fabric';
    END
END
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RD_Items]') AND type in (N'U'))
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[RD_Items]') AND name = 'Technology')
    BEGIN
        ALTER TABLE [dbo].[RD_Items] ADD [Technology] NVARCHAR(500) NULL;
        PRINT 'Added column Technology to RD_Items';
    END
END
GO
