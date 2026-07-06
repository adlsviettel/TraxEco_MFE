-- =================================================================
-- Script to create TCC Template Settings tables for SQL Server
-- =================================================================

-- 1. TCC_Metadata
-- Lưu trữ các danh mục động (Customer, Factory, Sample Stage, v.v.)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TCC_Metadata]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[TCC_Metadata](
    [Id] [int] IDENTITY(1,1) NOT NULL,
    [Category] [nvarchar](50) NOT NULL, -- e.g., 'customer', 'factory', 'sampleStage'
    [Value] [nvarchar](255) NOT NULL,   -- e.g., 'Nike', 'VENDER', 'PPS'
    [SortOrder] [int] NULL DEFAULT (0),
    [IsActive] [bit] NOT NULL DEFAULT (1),
    [CreatedAt] [datetime] NOT NULL DEFAULT (GETDATE()),
 CONSTRAINT [PK_TCC_Metadata] PRIMARY KEY CLUSTERED ([Id] ASC)
)
END
GO

-- 2. TCC_MachineTemplates
-- Lưu trữ cấu hình Máy May
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TCC_MachineTemplates]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[TCC_MachineTemplates](
    [Id] [int] IDENTITY(1,1) NOT NULL,
    [Factory] [nvarchar](100) NOT NULL,
    [MachineType] [nvarchar](100) NOT NULL,
    [MachineDimension] [nvarchar](100) NOT NULL,
    [IsActive] [bit] NOT NULL DEFAULT (1),
    [CreatedAt] [datetime] NOT NULL DEFAULT (GETDATE()),
 CONSTRAINT [PK_TCC_MachineTemplates] PRIMARY KEY CLUSTERED ([Id] ASC)
)
END
GO

-- 3. TCC_LeadTimeConfigs
-- Lưu trữ cấu hình thời gian thực hiện
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TCC_LeadTimeConfigs]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[TCC_LeadTimeConfigs](
    [Id] [int] IDENTITY(1,1) NOT NULL,
    [FactoryName] [nvarchar](100) NOT NULL,
    [ProcessType] [nvarchar](50) NOT NULL, -- 'Light', 'Medium', 'Heavy'
    [LeadTimeDays] [int] NOT NULL,
    [IsActive] [bit] NOT NULL DEFAULT (1),
    [CreatedAt] [datetime] NOT NULL DEFAULT (GETDATE()),
 CONSTRAINT [PK_TCC_LeadTimeConfigs] PRIMARY KEY CLUSTERED ([Id] ASC)
)
END
GO

-- =================================================================
-- Insert Dữ liệu mẫu ban đầu (Initial Data)
-- =================================================================

-- Mẫu cho Khách Hàng (Customer)
IF NOT EXISTS (SELECT 1 FROM [dbo].[TCC_Metadata] WHERE [Category] = 'customer')
BEGIN
    INSERT INTO [dbo].[TCC_Metadata] ([Category], [Value]) VALUES 
    ('customer', 'Customer A'),
    ('customer', 'Customer B');
END
GO

-- Mẫu cho Nhà Máy (Factory)
IF NOT EXISTS (SELECT 1 FROM [dbo].[TCC_Metadata] WHERE [Category] = 'factory')
BEGIN
    INSERT INTO [dbo].[TCC_Metadata] ([Category], [Value]) VALUES 
    ('factory', 'Factory 1'),
    ('factory', 'Factory 2');
END
GO

-- Mẫu cho Giai Đoạn Mẫu (Sample Stage)
IF NOT EXISTS (SELECT 1 FROM [dbo].[TCC_Metadata] WHERE [Category] = 'sampleStage')
BEGIN
    INSERT INTO [dbo].[TCC_Metadata] ([Category], [Value]) VALUES 
    ('sampleStage', 'PPS'),
    ('sampleStage', 'Fit Sample');
END
GO
