-- =================================================================
-- Script to create INSW / IT Inventory tables for SQL Server 2008+
-- =================================================================

-- 1. INSW_ImportedFiles
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[INSW_ImportedFiles]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[INSW_ImportedFiles](
    [FileId] [int] IDENTITY(1,1) NOT NULL,
    [FileName] [nvarchar](255) NOT NULL,
    [FileSize] [bigint] NOT NULL,
    [StoragePath] [nvarchar](1000) NOT NULL,
    [FileHash] [nvarchar](255) NULL,
    [ImportedBy] [nvarchar](50) NOT NULL,
    [ImportedAt] [datetime] NOT NULL DEFAULT (GETDATE()),
    [ParseStatus] [nvarchar](20) NOT NULL DEFAULT ('pending'),
    [ParseError] [nvarchar](max) NULL,
    [TotalItems] [int] NOT NULL DEFAULT (0),
    [ParsedAt] [datetime] NULL,
    [FileType] [nvarchar](50) NULL,
    [IsDeleted] [bit] NOT NULL DEFAULT (0),
 CONSTRAINT [PK_INSW_ImportedFiles] PRIMARY KEY CLUSTERED ([FileId] ASC)
)
END
GO

-- 2. INSW_DocumentHeaders
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[INSW_DocumentHeaders]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[INSW_DocumentHeaders](
    [FileId] [int] NOT NULL,
    [NomorPengajuan] [nvarchar](100) NULL,
    [TanggalPengajuan] [nvarchar](50) NULL,
    [NomorPendaftaran] [nvarchar](100) NULL,
    [TanggalPendaftaran] [nvarchar](50) NULL,
 CONSTRAINT [PK_INSW_DocumentHeaders] PRIMARY KEY CLUSTERED ([FileId] ASC)
)
END
GO

-- 3. INSW_DocumentItems
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[INSW_DocumentItems]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[INSW_DocumentItems](
    [ItemId] [int] IDENTITY(1,1) NOT NULL,
    [FileId] [int] NOT NULL,
    [ItemNo] [int] NOT NULL,
    [KodeHS] [nvarchar](50) NULL,
    [UraianBarang] [nvarchar](max) NULL,
    [KodeBarang] [nvarchar](100) NULL,
    [Jumlah] [nvarchar](50) NULL,
    [Satuan] [nvarchar](20) NULL,
    [Harga] [nvarchar](50) NULL,
    [Amount] [nvarchar](50) NULL,
    [NilaiPabean] [nvarchar](50) NULL,
    [Negara] [nvarchar](50) NULL,
 CONSTRAINT [PK_INSW_DocumentItems] PRIMARY KEY CLUSTERED ([ItemId] ASC)
)
END
GO

-- 4. INSW_PushLog
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[INSW_PushLog]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[INSW_PushLog](
    [PushId] [int] IDENTITY(1,1) NOT NULL,
    [FileId] [int] NOT NULL,
    [PushedBy] [nvarchar](50) NOT NULL,
    [PushedAt] [datetime] NOT NULL DEFAULT (GETDATE()),
    [Status] [nvarchar](20) NOT NULL,
    [HttpStatus] [int] NULL,
    [RequestBody] [nvarchar](max) NULL,
    [ResponseBody] [nvarchar](max) NULL,
    [ErrorMessage] [nvarchar](max) NULL,
    [Duration] [int] NULL,
 CONSTRAINT [PK_INSW_PushLog] PRIMARY KEY CLUSTERED ([PushId] ASC)
)
END
GO

-- 5. INSW_ApiConfig
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[INSW_ApiConfig]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[INSW_ApiConfig](
    [ConfigKey] [nvarchar](100) NOT NULL,
    [ConfigValue] [nvarchar](1000) NULL,
    [UpdatedBy] [nvarchar](50) NULL,
    [UpdatedAt] [datetime] NULL DEFAULT (GETDATE()),
 CONSTRAINT [PK_INSW_ApiConfig] PRIMARY KEY CLUSTERED ([ConfigKey] ASC)
)
END
GO

-- 6. INSW_AppConfig
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[INSW_AppConfig]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[INSW_AppConfig](
    [ConfigKey] [nvarchar](100) NOT NULL,
    [ConfigValue] [nvarchar](1000) NULL,
    [UpdatedBy] [nvarchar](50) NULL,
    [UpdatedAt] [datetime] NULL,
 CONSTRAINT [PK_INSW_AppConfig] PRIMARY KEY CLUSTERED ([ConfigKey] ASC)
)
END
GO

-- 7. INSW_AuditLog
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[INSW_AuditLog]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[INSW_AuditLog](
    [LogId] [int] IDENTITY(1,1) NOT NULL,
    [Username] [nvarchar](50) NOT NULL,
    [Action] [nvarchar](50) NOT NULL,
    [EntityType] [nvarchar](50) NOT NULL,
    [EntityId] [int] NULL,
    [Detail] [nvarchar](max) NULL,
    [IpAddress] [nvarchar](50) NULL,
    [CreatedAt] [datetime] NOT NULL DEFAULT (GETDATE()),
 CONSTRAINT [PK_INSW_AuditLog] PRIMARY KEY CLUSTERED ([LogId] ASC)
)
END
GO

-- 8. INSW_MasterData
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[INSW_MasterData]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[INSW_MasterData](
    [MasterId] [int] IDENTITY(1,1) NOT NULL,
    [Category] [nvarchar](50) NOT NULL,
    [Code] [nvarchar](50) NOT NULL,
    [Name] [nvarchar](255) NOT NULL,
    [Description] [nvarchar](max) NULL,
    [Status] [nvarchar](20) NOT NULL DEFAULT ('active'),
    [UpdatedAt] [datetime] NULL DEFAULT (GETDATE()),
 CONSTRAINT [PK_INSW_MasterData] PRIMARY KEY CLUSTERED ([MasterId] ASC)
)
END
GO

-- =================================================================
-- Initial Data Seeding
-- =================================================================

-- Seed INSW API Configurations (Defaults)
IF NOT EXISTS (SELECT * FROM [dbo].[INSW_ApiConfig] WHERE [ConfigKey] = 'api-url')
BEGIN
    INSERT INTO [dbo].[INSW_ApiConfig] ([ConfigKey], [ConfigValue]) VALUES 
    ('api-url', 'https://api.insw.go.id/api-prod/inventory/temp/transaksi'),
    ('x-inswkey', ''),
    ('x-unique-key', ''),
    ('schedule-enabled', 'false'),
    ('schedule-time', '05:00')
END
GO

-- Seed INSW App Configurations (Defaults)
IF NOT EXISTS (SELECT * FROM [dbo].[INSW_AppConfig] WHERE [ConfigKey] = 'file_storage_path')
BEGIN
    -- This sets the fallback storage path just in case the backend needs it
    INSERT INTO [dbo].[INSW_AppConfig] ([ConfigKey], [ConfigValue]) VALUES 
    ('file_storage_path', '\\192.168.1.248\Tu\tsi'),
    ('file_storage_subfolder_format', 'yyyy\MM')
END
GO
