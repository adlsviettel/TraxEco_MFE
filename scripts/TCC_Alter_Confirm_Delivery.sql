-- =================================================================
-- Script to add Confirm Delivery Date fields to TCC Requests table
-- Database: SQL Server
-- =================================================================

-- 1. Add columns to TCC_Requests table
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TCC_Requests]') AND type in (N'U'))
BEGIN
    -- Add ConfirmDeliveryDate (VARCHAR(10) or DATE)
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TCC_Requests]') AND name = 'ConfirmDeliveryDate')
    BEGIN
        ALTER TABLE [dbo].[TCC_Requests] ADD [ConfirmDeliveryDate] VARCHAR(10) NULL;
        PRINT 'Column ConfirmDeliveryDate added to TCC_Requests table.';
    END

    -- Add ConfirmStatus (NVARCHAR(50))
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TCC_Requests]') AND name = 'ConfirmStatus')
    BEGIN
        ALTER TABLE [dbo].[TCC_Requests] ADD [ConfirmStatus] NVARCHAR(50) NULL;
        PRINT 'Column ConfirmStatus added to TCC_Requests table.';
    END
END
ELSE IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TccRequests]') AND type in (N'U'))
BEGIN
    -- If table is named TccRequests instead
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TccRequests]') AND name = 'ConfirmDeliveryDate')
    BEGIN
        ALTER TABLE [dbo].[TccRequests] ADD [ConfirmDeliveryDate] VARCHAR(10) NULL;
        PRINT 'Column ConfirmDeliveryDate added to TccRequests table.';
    END

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TccRequests]') AND name = 'ConfirmStatus')
    BEGIN
        ALTER TABLE [dbo].[TccRequests] ADD [ConfirmStatus] NVARCHAR(50) NULL;
        PRINT 'Column ConfirmStatus added to TccRequests table.';
    END
END
ELSE
BEGIN
    PRINT 'Error: Neither TCC_Requests nor TccRequests table was found. Please apply these columns manually to your requests table.';
END
GO
