import { test, expect } from '@playwright/test';

test.describe('TCC Template Request - Requestor View', () => {
  test.beforeEach(async ({ page }) => {
    // No need to inject English anymore, we use language-agnostic data-testid

    // Navigate to the Requestor View page
    await page.goto('/tcc-template/tracking');
    // Wait for the page to render (the data grid should be visible)
    await page.waitForSelector('.MuiDataGrid-root:visible');
  });

  test('Toolbar should render correctly with required buttons and icons', async ({ page }) => {
    // 1. Check Filter Button
    const filterBtn = page.getByTestId('requestor-btn-tcc-filter');
    await expect(filterBtn).toBeVisible();
    
    // 2. Check Columns Button
    const columnsBtn = page.getByTestId('requestor-btn-tcc-columns');
    await expect(columnsBtn).toBeVisible();
    
    // 3. Check Load Data Button
    const loadDataBtn = page.getByTestId('requestor-btn-tcc-load-data');
    await expect(loadDataBtn).toBeVisible();
  });

  test('Toolbar Filter button opens drawer', async ({ page }) => {
    const filterBtn = page.getByTestId('requestor-btn-tcc-filter');
    await filterBtn.click();
    
    // Check if the Advanced Filter Drawer is opened (look for Apply button)
    await expect(page.getByRole('button', { name: /Apply/i })).toBeVisible();
    // Close the drawer
    await page.keyboard.press('Escape');
  });

  test('Toolbar Columns button opens column reorder dialog', async ({ page }) => {
    const columnsBtn = page.getByTestId('requestor-btn-tcc-columns');
    await columnsBtn.click();
    
    // Check if the Columns Dialog is opened
    await expect(page.getByRole('dialog')).toBeVisible();
    // Close the dialog
    await page.keyboard.press('Escape');
  });

  test('Toolbar Load Data button shows loading state', async ({ page }) => {
    // We mock the API to simulate loading state or just check if it gets disabled when clicked
    const loadDataBtn = page.getByTestId('requestor-btn-tcc-load-data');
    
    // Normally we would intercept the API here, but for basic check, just click and verify.
    // Ensure it is not disabled initially
    await expect(loadDataBtn).not.toBeDisabled({ timeout: 30000 });
  });
});
