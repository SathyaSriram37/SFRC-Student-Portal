import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_TEST_EMAIL || 'sfrc.admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_TEST_PASSWORD || 'Password@123';
const SYNTHETIC_STUDENT_EMAIL = 'test_verify_student@sfrc.ac.in';
const SYNTHETIC_STUDENT_NAME = 'Test Verification Student';

test.describe.serial('Admin User Management E2E Verification', () => {
  let contextPage: any;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    contextPage = await context.newPage();
    contextPage.on('dialog', async (dialog: any) => {
      try {
        await dialog.accept();
      } catch (_) {}
    });
  });

  test.afterAll(async () => {
    if (contextPage) {
      await contextPage.close();
    }
  });

  test('TC-01: Admin Authentication and Navigation to User Management', async () => {
    // Navigate to admin login
    await contextPage.goto('/login?role=admin');
    await contextPage.waitForLoadState('networkidle');

    // Explicitly click Administrator portal tab to ensure admin role is active
    const adminRoleTab = contextPage.locator('a[href*="role=admin"]');
    await adminRoleTab.click();
    await contextPage.waitForTimeout(500);

    // Verify login form elements using precise accessible IDs
    const emailInput = contextPage.locator('#login-identifier');
    const passwordInput = contextPage.locator('#login-password');
    const submitButton = contextPage.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(submitButton).toContainText('Administrator');

    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);
    await submitButton.click();

    // Verify successful login redirect to dashboard
    await expect(contextPage).toHaveURL(/\/admin\/(dashboard|users)/, { timeout: 20000 });

    // Navigate to /admin/users
    await contextPage.goto('/admin/users');
    await expect(contextPage).toHaveURL('/admin/users');

    // Verify main header
    const mainHeading = contextPage.locator('h1');
    await expect(mainHeading).toContainText('Institutional User Management');
  });

  test('TC-02: Real Database Data & Metrics Summary Verification', async () => {
    await contextPage.goto('/admin/users');
    await contextPage.waitForLoadState('networkidle');

    // Verify stats cards are present and loaded
    const statsCards = contextPage.locator('.grid div:has-text("All Users")').first();
    await expect(statsCards).toBeVisible();

    // Verify counts are populated numbers
    const statP = contextPage.locator('.grid div:has-text("All Users") p').first();
    await expect(statP).toHaveText(/\d+/, { timeout: 10000 });
    const totalUsersText = await statP.innerText();
    expect(Number(totalUsersText)).toBeGreaterThanOrEqual(1);

    // Verify table has real user rows (headers and at least one user)
    const userRows = contextPage.locator('table tbody tr');
    await expect(userRows.first()).toBeVisible();
    const rowCount = await userRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);

    // Take screenshot of directory
    await contextPage.screenshot({ path: 'test-results/admin-user-directory.png' });
  });

  test('TC-03: Filter Tabs and Live Search Functionality', async () => {
    await contextPage.goto('/admin/users');
    await contextPage.waitForLoadState('networkidle');

    // Click 'Students' tab
    const studentsTab = contextPage.locator('button:has-text("Students")').first();
    await studentsTab.click();
    await contextPage.waitForTimeout(1000);

    // Verify student badge in rows
    const studentBadges = contextPage.locator('span:has-text("Student")');
    await expect(studentBadges.first()).toBeVisible();

    // Search for a specific user
    const searchInput = contextPage.locator('input[placeholder*="Search by full name"]');
    await searchInput.fill('Hema');
    await contextPage.getByRole('button', { name: 'Search', exact: true }).click();
    await contextPage.waitForTimeout(1000);

    // Verify matching row
    const matchingRow = contextPage.locator('table tbody tr:has-text("Hema")');
    await expect(matchingRow).toBeVisible();

    // Clear search filter
    const clearBtn = contextPage.locator('button:has-text("Clear Filters")');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await contextPage.waitForTimeout(1000);
    }
  });

  test('TC-04: Student Detailed Profile Drawer & Academic Fields', async () => {
    await contextPage.goto('/admin/users');
    await contextPage.waitForLoadState('networkidle');

    // Click 'View Details' on the first row
    const viewButtons = contextPage.locator('button[title*="View complete profile details"]');
    await expect(viewButtons.first()).toBeVisible();
    await viewButtons.first().click();

    // Verify detailed drawer/modal opens
    const drawerHeading = contextPage.locator('h2');
    await expect(drawerHeading).toBeVisible();

    // Verify sections present
    const accountStateText = contextPage.locator('text=Account State');
    await expect(accountStateText).toBeVisible();

    // Capture screenshot of student detail view
    await contextPage.screenshot({ path: 'test-results/student-detail-drawer.png' });

    // Close modal
    const closeBtn = contextPage.locator('button:has-text("Close")');
    await closeBtn.click();
  });

  test('TC-05: Safe Create User End-to-End', async () => {
    await contextPage.goto('/admin/users');
    await contextPage.waitForLoadState('networkidle');

    // Open Create User Modal
    const createBtn = contextPage.locator('button:has-text("Create User Account")');
    await createBtn.click();

    // Fill form fields
    const modal = contextPage.locator('form:has-text("Create Account in Database")');
    await expect(modal).toBeVisible();

    await contextPage.locator('input[placeholder*="Karpagam S"]').fill(SYNTHETIC_STUDENT_NAME);
    await contextPage.locator('input[placeholder="user@sfrc.ac.in"]').fill(SYNTHETIC_STUDENT_EMAIL);
    await modal.locator('select').first().selectOption('student');
    await contextPage.locator('input[placeholder="26UCA042"]').fill('26UCA997');

    // Submit form
    const submitBtn = contextPage.locator('button:has-text("Create Account in Database")');
    await submitBtn.click();

    // Verify success alert or toast
    await expect(contextPage.locator('text=/created successfully|successfully created/i').first()).toBeVisible({ timeout: 15000 });

    // Verify newly created record appears in list
    const searchInput = contextPage.locator('input[placeholder*="Search by full name"]');
    await searchInput.fill(SYNTHETIC_STUDENT_EMAIL);
    await contextPage.getByRole('button', { name: 'Search', exact: true }).click();
    await contextPage.waitForTimeout(1000);

    const createdRow = contextPage.locator(`table tbody tr:has-text("${SYNTHETIC_STUDENT_EMAIL}")`);
    await expect(createdRow).toBeVisible();
  });

  test('TC-06: Safe Edit User End-to-End', async () => {
    await contextPage.goto('/admin/users');
    await contextPage.waitForLoadState('networkidle');

    // Search for test user
    const searchInput = contextPage.locator('input[placeholder*="Search by full name"]');
    await searchInput.fill(SYNTHETIC_STUDENT_EMAIL);
    await contextPage.getByRole('button', { name: 'Search', exact: true }).click();
    await contextPage.waitForTimeout(1000);

    // Click Edit button
    const editBtn = contextPage.locator('button[title*="Edit permitted profile fields"]').first();
    await editBtn.click();

    // Verify edit form opens
    const editModal = contextPage.locator('form:has-text("Save Changes to Database")');
    await expect(editModal).toBeVisible();

    // Update phone number and section
    const phoneInput = editModal.locator('input[placeholder*="9876543210"]');
    await phoneInput.fill('9876500999');

    const sectionInput = editModal.locator('input[placeholder="A"]');
    if (await sectionInput.isVisible()) {
      await sectionInput.fill('B');
    }

    // Save changes
    await editModal.locator('button:has-text("Save Changes to Database")').click();

    // Verify success feedback
    await expect(contextPage.locator('text=updated successfully').first()).toBeVisible({ timeout: 10000 });
  });

  test('TC-07: Activate and Deactivate End-to-End', async () => {
    await contextPage.goto('/admin/users');
    await contextPage.waitForLoadState('networkidle');

    // Find synthetic test user
    const searchInput = contextPage.locator('input[placeholder*="Search by full name"]');
    await searchInput.fill(SYNTHETIC_STUDENT_EMAIL);
    await contextPage.getByRole('button', { name: 'Search', exact: true }).click();
    await contextPage.waitForTimeout(1000);

    // Click Deactivate
    const deactBtn = contextPage.locator('button:has-text("Deactivate")').first();
    await deactBtn.click();

    // Verify feedback
    await expect(contextPage.locator('text=deactivated successfully').first()).toBeVisible({ timeout: 10000 });

    // Verify status changed to Inactive
    const inactiveBadge = contextPage.locator('span:has-text("Inactive")').first();
    await expect(inactiveBadge).toBeVisible();

    // Click Activate
    const actBtn = contextPage.locator('button:has-text("Activate")').first();
    await actBtn.click();

    // Verify feedback
    await expect(contextPage.locator('text=activated successfully').first()).toBeVisible({ timeout: 10000 });

    // Verify status changed back to Active
    const activeBadge = contextPage.locator('span:has-text("Active")').first();
    await expect(activeBadge).toBeVisible();
  });

  test('TC-08: Administrative Password Reset Flow', async () => {
    await contextPage.goto('/admin/users');
    await contextPage.waitForLoadState('networkidle');

    // Find synthetic test user
    const searchInput = contextPage.locator('input[placeholder*="Search by full name"]');
    await searchInput.fill(SYNTHETIC_STUDENT_EMAIL);
    await contextPage.getByRole('button', { name: 'Search', exact: true }).click();
    await contextPage.waitForTimeout(1000);

    // Click Reset Password
    const resetBtn = contextPage.locator('button[title*="Reset account password"]').first();
    await resetBtn.click();

    // Verify Password Reset modal displays temporary password
    const pwdModal = contextPage.locator('h3:has-text("Password Reset Complete")');
    await expect(pwdModal).toBeVisible({ timeout: 10000 });

    // Verify temporary password format
    const tempPassCode = contextPage.locator('code');
    const passText = await tempPassCode.innerText();
    expect(passText).toContain('Sfrc@');

    // Verify copy button
    const copyBtn = contextPage.locator('button:has-text("Copy")');
    await copyBtn.click();
    await expect(contextPage.locator('button:has-text("Copied")')).toBeVisible();

    // Close modal
    await contextPage.locator('button:has-text("Done")').click();
  });

  test('TC-09: Archive / Delete Safety & Test Account Cleanup', async () => {
    await contextPage.goto('/admin/users');
    await contextPage.waitForLoadState('networkidle');

    // Find synthetic test user
    const searchInput = contextPage.locator('input[placeholder*="Search by full name"]');
    await searchInput.fill(SYNTHETIC_STUDENT_EMAIL);
    await contextPage.getByRole('button', { name: 'Search', exact: true }).click();
    await contextPage.waitForTimeout(1000);

    // Click Delete/Archive trash icon
    const trashBtn = contextPage.locator('button[title*="Archive or delete user account"]').first();
    await trashBtn.click();

    // Verify modal options
    const archiveModal = contextPage.locator('h3:has-text("Manage Record Removal")');
    await expect(archiveModal).toBeVisible();

    const archiveOption = contextPage.locator('button:has-text("Archive / Soft Deactivate")');
    await expect(archiveOption).toBeVisible();

    const permanentOption = contextPage.locator('button:has-text("Permanent Database Deletion")');
    await expect(permanentOption).toBeVisible();

    // Execute permanent deletion on the synthetic test account to clean up
    await permanentOption.click();

    // Verify deletion feedback
    await expect(contextPage.locator('text=permanently deleted').first()).toBeVisible({ timeout: 10000 });
  });

  test('TC-10: RBAC Boundaries & Unauthorized Access Rejection', async ({ request }) => {
    // Unauthenticated request to admin endpoint -> 401 Unauthorized
    const unauthRes = await request.get('http://127.0.0.1:8000/api/v1/admin/users');
    expect(unauthRes.status()).toBe(401);
  });

  test('TC-11: Responsive Viewport Verification (Desktop, Tablet, Mobile)', async () => {
    // 1. Desktop
    await contextPage.setViewportSize({ width: 1280, height: 800 });
    await contextPage.goto('/admin/users');
    await expect(contextPage.locator('h1')).toBeVisible();

    // 2. Tablet
    await contextPage.setViewportSize({ width: 768, height: 1024 });
    await expect(contextPage.locator('h1')).toBeVisible();

    // 3. Mobile
    await contextPage.setViewportSize({ width: 375, height: 667 });
    await expect(contextPage.locator('h1')).toBeVisible();
    await expect(contextPage.locator('button:has-text("Create User Account")')).toBeVisible();
  });
});
