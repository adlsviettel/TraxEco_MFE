import { test, expect } from '@playwright/test';

test.describe('R&D Material - Fabric Full CRUD', () => {
  const timestamp = Date.now();
  const TEST_ITEM_CODE = `AUTO_CODE_${timestamp}`;
  const TEST_FABRIC_NAME = `AUTO_FABRIC_${timestamp}`;
  const UPDATED_FABRIC_NAME = `UPDATED_FABRIC_${timestamp}`;

  test('should create, search, update and delete a fabric item', async ({ page }) => {
    // Tăng timeout vì thao tác CRUD toàn bộ (4 hành động) mất rất nhiều thời gian
    test.setTimeout(120000);

    // Mock localStorage to have SUPER_ADMIN role so that we can see the Add button
    await page.addInitScript(() => {
      window.localStorage.setItem('isSuperAdmin', 'true');
    });

    // 1. Truy cập trang Fabric
    await page.goto('/rd-material/fabric');
    
    // Đợi trang load xong
    await page.waitForTimeout(2000);

    // 2. THÊM MỚI (CREATE)
    const btnAdd = page.getByTestId('rd-fabric-btn-add');
    await expect(btnAdd).toBeVisible();
    await btnAdd.click();

    // Điền thông tin vào Form (Item Code & Fabric Name)
    const itemCodeInput = page.getByTestId('rd-fabric-form-itemCode');
    const fabricNameInput = page.getByTestId('rd-fabric-form-fabricName');
    
    await itemCodeInput.waitFor({ state: 'visible' });
    await itemCodeInput.fill(TEST_ITEM_CODE);
    
    // MUI TextField đôi khi cần focus vào input bên trong
    await fabricNameInput.waitFor({ state: 'visible' });
    await fabricNameInput.click();
    await fabricNameInput.fill(TEST_FABRIC_NAME);

    // Điền Quantity (Bắt buộc)
    const qtyInput = page.getByTestId('rd-fabric-form-quantity');
    await qtyInput.waitFor({ state: 'visible' });
    await qtyInput.fill('10');

    // Bấm Save
    const btnSave = page.getByTestId('rd-fabric-form-btn-save');
    await btnSave.click();

    // Đợi form đóng lại (Drawer tắt) tức là lưu thành công
    await expect(page.getByTestId('rd-fabric-form-btn-save')).toBeHidden({ timeout: 10000 });
    // Chờ 1 chút để lưới load lại data
    await page.waitForTimeout(1000);

    // 3. TÌM KIẾM (READ)
    const searchInput = page.getByTestId('rd-fabric-search-input');
    await searchInput.waitFor({ state: 'visible' });
    
    // Tìm mã vừa tạo
    await searchInput.fill(TEST_ITEM_CODE);
    
    // Đợi hệ thống call API (Debounce 400ms + API time)
    await page.waitForTimeout(2000);

    // Bảng dữ liệu phải hiện ra nút Edit của đúng mã đó
    const editBtnLocator = page.getByTestId(`rd-fabric-btn-edit-${TEST_ITEM_CODE}`);
    await expect(editBtnLocator).toBeVisible({ timeout: 15000 });

    // 4. CHỈNH SỬA (UPDATE)
    await editBtnLocator.click();

    // Sửa tên Fabric
    await fabricNameInput.waitFor({ state: 'visible' });
    await fabricNameInput.click();
    await fabricNameInput.fill(UPDATED_FABRIC_NAME);
    
    await btnSave.click();
    
    // Đợi form đóng lại tức là update thành công
    await expect(page.getByTestId('rd-fabric-form-btn-save')).toBeHidden({ timeout: 10000 });
    
    // Chờ 1 chút để lưới load lại data
    await page.waitForTimeout(2000);
    // Tên mới phải xuất hiện trên màn hình
    await expect(page.locator(`text=${UPDATED_FABRIC_NAME}`).first()).toBeVisible({ timeout: 10000 });

    // 5. XÓA (DELETE)
    const deleteBtnLocator = page.getByTestId(`rd-fabric-btn-delete-${TEST_ITEM_CODE}`);
    await expect(deleteBtnLocator).toBeVisible();
    await deleteBtnLocator.click();

    // Dialog xác nhận xóa xuất hiện
    const confirmBtn = page.getByTestId('btn-confirm-dialog');
    await confirmBtn.waitFor({ state: 'visible' });
    await confirmBtn.click();

    // Bỏ qua chờ Snackbar để tránh lỗi locator resolve nhiều element ẩn
    
    // Đợi lại load lại và đảm bảo nút edit của mã này hoàn toàn biến mất
    await page.waitForTimeout(2000);
    await expect(editBtnLocator).toBeHidden({ timeout: 10000 });
  });
});
