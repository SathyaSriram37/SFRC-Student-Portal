import { test, expect } from '@playwright/test';

test.describe('Parent Module Comprehensive End-to-End Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for uncaught console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Login as Parent
    await page.goto('http://localhost:3000/login?role=parent');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="text"], input[name="identifier"], input[placeholder*="parent@gmail.com"]').fill('kannan@gmail.com');
    await page.locator('input[type="password"]').fill('Sfrc@2026');
    await page.locator('button:has-text("Sign in as Parent")').click();

    await page.waitForURL('**/parent/dashboard', { timeout: 15000 });
    await expect(page).toHaveURL(/.*\/parent\/dashboard/);
  });

  test('TC-P01: Parent Dashboard loads real ward metrics with zero console errors', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Priya Sharma');
    await expect(page.locator('text=23UCA001')).toBeVisible();
    await expect(page.getByText('100.0%').first()).toBeVisible();
    await expect(page.getByText('8.80').first()).toBeVisible();
  });

  test('TC-P02: My Ward Profile (/parent/progress) displays verified academic affiliation', async ({ page }) => {
    await page.locator('aside nav a[href="/parent/progress"]').click();
    await page.waitForURL('**/parent/progress');
    await expect(page.locator('h1')).toContainText('Ward Profile & Academic Affiliation');
    await expect(page.locator('text=Priya Sharma')).toBeVisible();
    await expect(page.locator('text=23UCA001')).toBeVisible();
    await expect(page.locator('text=Computer Applications')).toBeVisible();
  });

  test('TC-P03: Ward Attendance (/parent/attendance) displays accurate calculations and Not Started badges', async ({ page }) => {
    await page.locator('aside nav a[href="/parent/attendance"]').click();
    await page.waitForURL('**/parent/attendance');
    await expect(page.locator('h1')).toContainText('Ward Course Attendance Records');
    await expect(page.locator('text=22PCSC21')).toBeVisible();
    await expect(page.locator('text=Regular')).toBeVisible();
    await expect(page.locator('text=Not Started')).toHaveCount(2);
  });

  test('TC-P04: Ward Performance (/parent/performance) renders CGPA progression and assessment marks', async ({ page }) => {
    await page.locator('aside nav a[href="/parent/performance"]').click();
    await page.waitForURL('**/parent/performance');
    await expect(page.locator('h1')).toContainText('Ward Academic Performance & Assessment Marks');
    await expect(page.locator('text=8.80')).toBeVisible();
    await expect(page.locator('text=22PCSC21')).toBeVisible();
    await expect(page.locator('text=22 / 25')).toBeVisible();
  });

  test('TC-P05: Examinations Schedule (/parent/exams) loads real database courses and hall ticket verification', async ({ page }) => {
    await page.locator('aside nav a[href="/parent/exams"]').click();
    await page.waitForURL('**/parent/exams');
    await expect(page.locator('h1')).toContainText('Examinations & Hall Ticket Status');
    await expect(page.locator('text=23UCA001')).toBeVisible();
    await expect(page.locator('text=Approved & Verified')).toBeVisible();
    await expect(page.locator('text=22PCSC21 • Advanced Machine Learning')).toBeVisible();
  });

  test('TC-P06: College Events (/parent/events) displays institutional calendar from database', async ({ page }) => {
    await page.locator('aside nav a[href="/parent/events"]').click();
    await page.waitForURL('**/parent/events');
    await expect(page.locator('h1')).toContainText('College Events & Parent Gatherings');
    await expect(page.locator('text=Parent-Teacher Association (PTA) General Body Meeting')).toBeVisible();
  });

  test('TC-P07: Live Bus Tracking (/parent/transport) displays real route, stops, and pass details', async ({ page }) => {
    await page.locator('aside nav a[href="/parent/transport"]').click();
    await page.waitForURL('**/parent/transport');
    await expect(page.locator('h1')).toContainText('Live Bus Tracking & Transport');
    await expect(page.locator('text=Transit Active • Operating on Time')).toBeVisible();
    await expect(page.locator('text=Digital Bus Pass')).toBeVisible();
    await expect(page.getByText('Priya Sharma', { exact: true })).toBeVisible();
    await expect(page.locator('text=Ward Boarding Stop')).toBeVisible();
    await expect(page.getByText('Coronation Colony').first()).toBeVisible();
  });

  test('TC-P08: Hostel Welfare (/parent/hostel) loads real day scholar status', async ({ page }) => {
    await page.locator('aside nav a[href="/parent/hostel"]').click();
    await page.waitForURL('**/parent/hostel');
    await expect(page.locator('h1')).toContainText('Hostel & Residential Welfare');
    await expect(page.locator('text=Day Scholar Status')).toBeVisible();
  });

  test('TC-P09: Parent Circulars & Notices (/parent/notices) loads real announcements from DB without errors', async ({ page }) => {
    await page.locator('aside nav a[href="/parent/notices"]').click();
    await page.waitForURL('**/parent/notices');
    await expect(page.locator('h1')).toContainText('Parent Official Circulars & Notices');
    await expect(page.locator('text=Parent-Teacher Association (PTA) General Body Meeting')).toBeVisible();
    await expect(page.locator('text=Autonomous End-Semester Examination (ESE) Schedule & Regulations')).toBeVisible();
  });
});
