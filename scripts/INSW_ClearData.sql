-- =================================================================
-- CLEAR ALL INSW DATA (giữ lại bảng + config)
-- Chạy trên database DtradeProduction
-- =================================================================

-- Xóa theo thứ tự FK: con trước, cha sau

-- 1. Xóa push log
DELETE FROM [dbo].[INSW_PushLog];
PRINT 'Cleared INSW_PushLog';

-- 2. Xóa document items
DELETE FROM [dbo].[INSW_DocumentItems];
PRINT 'Cleared INSW_DocumentItems';

-- 3. Xóa document headers
DELETE FROM [dbo].[INSW_DocumentHeaders];
PRINT 'Cleared INSW_DocumentHeaders';

-- 4. Xóa imported files
DELETE FROM [dbo].[INSW_ImportedFiles];
PRINT 'Cleared INSW_ImportedFiles';

-- 5. Xóa audit log
DELETE FROM [dbo].[INSW_AuditLog];
PRINT 'Cleared INSW_AuditLog';

-- Reset identity counters
DBCC CHECKIDENT ('INSW_PushLog', RESEED, 0);
DBCC CHECKIDENT ('INSW_DocumentItems', RESEED, 0);
DBCC CHECKIDENT ('INSW_ImportedFiles', RESEED, 0);
DBCC CHECKIDENT ('INSW_AuditLog', RESEED, 0);

PRINT '';
PRINT 'Done! All INSW data cleared. Config tables untouched.';
