import { test, expect } from '@playwright/test';

test.describe('Student & Staff Live Bus Tracking Verification', () => {

  test('TC-BT01: Student Live Bus Tracking (/student/transport) displays real telemetry & bus pass', async ({ page }) => {
    // Navigate to student login
    await page.goto('http://localhost:3000/login?role=student');
    await page.waitForLoadState('networkidle');

    // Fill credentials
    await page.fill('#login-identifier', 'sfrc.student@gmail.com');
    await page.fill('#login-password', 'Password@123');
    await page.click('#login-submit');

    // Wait for student dashboard
    await page.waitForURL('**/student/dashboard', { timeout: 15000 });

    // Navigate to Bus Tracking
    await page.goto('http://localhost:3000/student/transport');
    await page.waitForLoadState('networkidle');

    // Verify Title & Telemetry elements
    await expect(page.locator('h1')).toContainText('Live Bus Tracking & Transit');
    await expect(page.getByText('LIVE GPS TELEMETRY ACTIVE')).toBeVisible();
    await expect(page.getByText('Live Speed').first()).toBeVisible();
    await expect(page.getByText('Pickup Stop ETA').first()).toBeVisible();
    await expect(page.getByText('Digital Bus Pass')).toBeVisible();
  });

  test('TC-BT02: Parent and Student live tracking telemetry synchronization verification', async ({ page }) => {
    // Login as Parent Kannan
    await page.goto('http://localhost:3000/login?role=parent');
    await page.waitForLoadState('networkidle');

    await page.fill('#login-identifier', 'kannan@gmail.com');
    await page.fill('#login-password', 'Sfrc@2026');
    await page.click('#login-submit');

    await page.waitForURL('**/parent/dashboard', { timeout: 15000 });

    // Go to parent transport
    await page.goto('http://localhost:3000/parent/transport');
    await page.waitForLoadState('networkidle');

    // Verify parent sees real route and ETA
    await expect(page.locator('h1')).toContainText('Live Bus Tracking & Transport');
    await expect(page.locator('text=Transit Active • Operating on Time')).toBeVisible();
    await expect(page.locator('text=Digital Bus Pass')).toBeVisible();
    await expect(page.getByText('Priya Sharma', { exact: true })).toBeVisible();
  });

  test('TC-BT03: Staff & Faculty bus tracking (/faculty/transport) loads faculty shuttle telemetry', async ({ page }) => {
    // Login as Faculty Ganga
    await page.goto('http://localhost:3000/login?role=faculty');
    await page.waitForLoadState('networkidle');

    await page.fill('#login-identifier', 'ganga.faculty@sfrc.ac.in');
    await page.fill('#login-password', 'Sfrc@2026');
    await page.click('#login-submit');

    await page.waitForURL('**/faculty/dashboard', { timeout: 15000 });

    // Check staff transport page
    await page.goto('http://localhost:3000/faculty/transport');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Staff & Faculty Bus Tracking');
    await expect(page.getByText('LIVE GPS TELEMETRY ACTIVE')).toBeVisible();
    await expect(page.getByText('Live Speed').first()).toBeVisible();
    await expect(page.getByText('Digital Bus Pass')).toBeVisible();
  });
});
