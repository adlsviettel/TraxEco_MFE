-- ==========================================================================================
-- TRAXECO / DTRADE - PREVENT DAILY AUTOMATED DEACTIVATION OF SYSTEM ACCOUNTS
-- Database: DtradeProduction
-- Server: 99.41 (172.18.99.41)
-- ==========================================================================================

USE [DtradeProduction]
GO

-- 1. Restore all system & admin accounts to IsActive = 1
UPDATE dbo.Accounts 
SET IsActive = 1 
WHERE LOWER(EmployeeCode) IN ('system', 'shin', 'user1', 'user2', 'user3', 'admin') 
   OR RoleLevel = 1;
GO

-- 2. Create AFTER UPDATE Trigger to intercept any automated daily job/script trying to set IsActive = 0 for system accounts
IF OBJECT_ID('dbo.trg_ProtectSystemAccounts_IsActive', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_ProtectSystemAccounts_IsActive;
GO

CREATE TRIGGER dbo.trg_ProtectSystemAccounts_IsActive
ON dbo.Accounts
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(IsActive)
    BEGIN
        UPDATE a
        SET a.IsActive = 1
        FROM dbo.Accounts a
        INNER JOIN inserted i ON a.EmployeeCode = i.EmployeeCode
        WHERE i.IsActive = 0 
          AND (
              LOWER(a.EmployeeCode) IN ('system', 'shin', 'user1', 'user2', 'user3', 'admin')
              OR a.RoleLevel = 1
          );
    END
END;
GO
