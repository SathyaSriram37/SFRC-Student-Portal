const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, '../test-results/faculty-audit');
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

async function runFacultyAudit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const auditReport = {
    login: {},
    navigation: [],
    pages: {},
    attendance: {},
    marks: {},
    networkErrors: [],
    consoleErrors: []
  };

  page.on('console', msg => {
    if (msg.type() === 'error') {
      auditReport.consoleErrors.push(msg.text());
    }
  });

  page.on('response', resp => {
    const url = resp.url();
    const status = resp.status();
    if (status >= 400 && !url.includes('/favicon.ico')) {
      auditReport.networkErrors.push({ url, status, method: resp.request().method() });
    }
  });

  console.log('--- 1. Login Flow ---');
  await page.goto('http://localhost:3000/login?role=faculty', { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: path.join(RESULTS_DIR, '01_login_page.png') });

  await page.fill('#login-identifier', 'ganga.faculty@sfrc.ac.in');
  await page.fill('#login-password', 'Sfrc@2026');
  await page.click('#login-submit');

  try {
    await page.waitForURL('**/faculty/dashboard', { timeout: 10000 });
    auditReport.login.status = 'SUCCESS';
    auditReport.login.targetUrl = page.url();
  } catch (e) {
    auditReport.login.status = 'FAILED_URL_WAIT';
    auditReport.login.currentUrl = page.url();
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(RESULTS_DIR, '02_faculty_dashboard.png') });

  // Read dashboard greetings and profile name
  const pageContent = await page.content();
  const displayedName = await page.evaluate(() => {
    const header = document.querySelector('header');
    const h1 = document.querySelector('h1');
    const h2 = document.querySelector('h2');
    const subheader = document.querySelector('[class*="profile"], [class*="userName"], aside [class*="font-semibold"]');
    return {
      title: document.title,
      h1: h1 ? h1.innerText : null,
      h2: h2 ? h2.innerText : null,
      headerText: header ? header.innerText : null,
      asideText: document.querySelector('aside') ? document.querySelector('aside').innerText : null
    };
  });
  auditReport.login.displayedName = displayedName;

  console.log('Displayed info on dashboard:', displayedName);

  // Check all faculty links in sidebar
  const sidebarLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('aside a'));
    return links.map(a => ({ text: a.innerText.trim(), href: a.getAttribute('href') }));
  });
  console.log('Sidebar links found:', sidebarLinks);
  auditReport.sidebarLinks = sidebarLinks;

  const testUrls = [
    { name: 'Dashboard', url: '/faculty/dashboard' },
    { name: 'My Courses', url: '/faculty/courses' },
    { name: 'Attendance', url: '/faculty/attendance' },
    { name: 'Marks Entry', url: '/faculty/marks' },
    { name: 'E-Content', url: '/faculty/e-content' },
    { name: 'Mentoring', url: '/faculty/mentoring' },
    { name: 'Events', url: '/faculty/events' },
    { name: 'Research', url: '/faculty/research' },
    { name: 'Facilities', url: '/faculty/facilities' },
    { name: 'My Profile', url: '/faculty/profile' }
  ];

  for (const item of testUrls) {
    console.log(`Testing page: ${item.name} (${item.url})`);
    const resp = await page.goto(`http://localhost:3000${item.url}`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const status = resp ? resp.status() : 'NO_RESPONSE';
    const is404 = (await page.title()).includes('404') || 
                  (await page.locator('text=404').count()) > 0 || 
                  (await page.locator('text=This page could not be found').count()) > 0;
    
    const screenshotName = `nav_${item.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
    await page.screenshot({ path: path.join(RESULTS_DIR, screenshotName) });

    auditReport.navigation.push({
      name: item.name,
      url: item.url,
      httpStatus: status,
      is404,
      title: await page.title()
    });
  }

  // Deep dive into Attendance page
  console.log('--- Testing Attendance Page Actions ---');
  await page.goto('http://localhost:3000/faculty/attendance', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(RESULTS_DIR, 'attendance_initial.png') });

  const attendanceInfo = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')).map(s => ({
      id: s.id,
      name: s.name,
      options: Array.from(s.options).map(o => ({ value: o.value, text: o.text }))
    }));
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
    const tableRows = document.querySelectorAll('tbody tr').length;
    const bodyText = document.body.innerText;
    return { selects, buttons, tableRows, hasFailedToFetch: bodyText.includes('Failed to fetch') || bodyText.includes('failed to fetch') };
  });
  auditReport.attendance = attendanceInfo;

  // Try submitting / clicking action buttons on Attendance
  const submitAttendanceBtn = page.locator('button:has-text("Submit"), button:has-text("Save Attendance"), button:has-text("Mark Attendance")').first();
  if (await submitAttendanceBtn.count() > 0) {
    console.log('Clicking attendance submit button...');
    await submitAttendanceBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(RESULTS_DIR, 'attendance_after_submit.png') });
    auditReport.attendance.postSubmitText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
  }

  // Deep dive into Marks Entry page
  console.log('--- Testing Marks Entry Page Actions ---');
  await page.goto('http://localhost:3000/faculty/marks', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(RESULTS_DIR, 'marks_initial.png') });

  const marksInfo = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')).map(s => ({
      id: s.id,
      name: s.name,
      options: Array.from(s.options).map(o => ({ value: o.value, text: o.text }))
    }));
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
    const tableRows = document.querySelectorAll('tbody tr').length;
    const bodyText = document.body.innerText;
    return { selects, buttons, tableRows, hasFailedToFetch: bodyText.includes('Failed to fetch') || bodyText.includes('failed to fetch') };
  });
  auditReport.marks = marksInfo;

  const submitMarksBtn = page.locator('button:has-text("Save Marks"), button:has-text("Submit Marks"), button:has-text("Publish")').first();
  if (await submitMarksBtn.count() > 0) {
    console.log('Clicking marks submit button...');
    await submitMarksBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(RESULTS_DIR, 'marks_after_submit.png') });
    auditReport.marks.postSubmitText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
  }

  fs.writeFileSync(path.join(RESULTS_DIR, 'audit_summary.json'), JSON.stringify(auditReport, null, 2));
  console.log('Audit complete! Results saved to test-results/faculty-audit/audit_summary.json');

  await browser.close();
}

runFacultyAudit().catch(err => {
  console.error('Audit run failed:', err);
  process.exit(1);
});
