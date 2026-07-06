-- =================================================================
-- Script to create Login and Permission tables for TraxEco
-- =================================================================

-- 1. Accounts
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Accounts]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[Accounts](
    [EmployeeCode] [nvarchar](50) NOT NULL,
    [EmployeeName] [nvarchar](255) NULL,
    [Password] [nvarchar](255) NOT NULL,
    [Factory] [nvarchar](50) NULL,
    [Dept] [nvarchar](50) NULL,
    [Section] [nvarchar](50) NULL,
    [RoleLevel] [int] NOT NULL DEFAULT (4),
    [IsActive] [bit] NOT NULL DEFAULT (1),
    [MustChangePassword] [bit] NOT NULL DEFAULT (1),
    [CreatedBy] [nvarchar](50) NULL,
    [CreatedDate] [datetime] NOT NULL DEFAULT (GETDATE()),
    [UpdatedBy] [nvarchar](50) NULL,
    [UpdatedDate] [datetime] NULL,
 CONSTRAINT [PK_Accounts] PRIMARY KEY CLUSTERED ([EmployeeCode] ASC)
)
END
GO

-- 2. AppPermissions (App assignments per user)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AppPermissions]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[AppPermissions](
    [EmployeeCode] [nvarchar](50) NOT NULL,
    [AppCode] [nvarchar](50) NOT NULL,
    [GrantedBy] [nvarchar](50) NULL,
    [GrantedDate] [datetime] NOT NULL DEFAULT (GETDATE()),
 CONSTRAINT [PK_AppPermissions] PRIMARY KEY CLUSTERED ([EmployeeCode] ASC, [AppCode] ASC)
)
END
GO

-- 3. FactoryPermissions (Factory access per app per user)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[FactoryPermissions]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[FactoryPermissions](
    [EmployeeCode] [nvarchar](50) NOT NULL,
    [AppCode] [nvarchar](50) NOT NULL,
    [Factory] [nvarchar](50) NOT NULL,
    [GrantedBy] [nvarchar](50) NULL,
    [GrantedDate] [datetime] NOT NULL DEFAULT (GETDATE()),
 CONSTRAINT [PK_FactoryPermissions] PRIMARY KEY CLUSTERED ([EmployeeCode] ASC, [AppCode] ASC, [Factory] ASC)
)
END
GO

-- 4. Permissions (Page-level permissions)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Permissions]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[Permissions](
    [EmployeeCode] [nvarchar](50) NOT NULL,
    [PageCode] [nvarchar](100) NOT NULL,
    [CanView] [bit] NOT NULL DEFAULT (0),
    [CanAdd] [bit] NOT NULL DEFAULT (0),
    [CanEdit] [bit] NOT NULL DEFAULT (0),
    [CanDelete] [bit] NOT NULL DEFAULT (0),
    [CanExport] [bit] NOT NULL DEFAULT (0),
    [GrantedBy] [nvarchar](50) NULL,
    [GrantedDate] [datetime] NOT NULL DEFAULT (GETDATE()),
 CONSTRAINT [PK_Permissions] PRIMARY KEY CLUSTERED ([EmployeeCode] ASC, [PageCode] ASC)
)
END
GO

-- =================================================================
-- Initial Data Seeding (Super Admin Account)
-- =================================================================

-- Create highly privileged 'system' admin account for setup
IF NOT EXISTS (SELECT * FROM [dbo].[Accounts] WHERE [EmployeeCode] = 'system')
BEGIN
    INSERT INTO [dbo].[Accounts] 
    ([EmployeeCode], [EmployeeName], [Password], [RoleLevel], [IsActive], [MustChangePassword])
    VALUES 
    ('system', 'System Administrator', 'System@123', 1, 1, 0)
END
GO

-- Grant IT_INVENTORY App permission to system
IF NOT EXISTS (SELECT * FROM [dbo].[AppPermissions] WHERE [EmployeeCode] = 'system' AND [AppCode] = 'IT_INVENTORY')
BEGIN
    INSERT INTO [dbo].[AppPermissions] ([EmployeeCode], [AppCode]) VALUES ('system', 'IT_INVENTORY')
END
GO
