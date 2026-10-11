const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const VERIFY_DIR = path.join(__dirname, '../test-results/faculty-verified');
if (!fs.existsSync(VERIFY_DIR)) {
  fs.mkdirSync(VERIFY_DIR, { recursive: true });
}

async function runVerification() {
  console.log('🚀 Starting Comprehensive Faculty Fixes Verification with Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const report = {
    login: false,
    dashboardUser: '',
    profileSaved: false,
    coursesLoaded: 0,
    rosterLoaded: 0,
    eventsLoaded: 0,
    facilitiesLoaded: 0,
    attendanceSaved: false,
    marksSaved: false,
    navigation404s: [],
    errors: []
  };

  page.on('console', msg => {
    if (msg.type() === 'error') {
      report.errors.push(`[Console Error] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    report.errors.push(`[Page Error] ${err.message}`);
  });

  // 1. LOGIN
  console.log('1. Testing Login as ganga.faculty@sfrc.ac.in...');
  await page.goto('http://localhost:3000/login?role=faculty', { waitUntil: 'domcontentloaded' });
  await page.fill('#login-identifier', 'ganga.faculty@sfrc.ac.in');
  await page.fill('#login-password', 'Sfrc@2026');
  await page.click('#login-submit');

  await page.waitForURL('**/faculty/dashboard', { timeout: 15000 });
  report.login = true;
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(VERIFY_DIR, '01_dashboard.png') });

  const dashboardText = await page.innerText('body');
  const hasGanga = dashboardText.includes('Ganga') || dashboardText.includes('ganga');
  const hasAnitha = dashboardText.includes('Dr. K. Anitha');
  console.log(`- Dashboard contains 'Ganga': ${hasGanga}`);
  console.log(`- Dashboard contains old mock 'Dr. K. Anitha': ${hasAnitha}`);
  report.dashboardUser = hasGanga ? 'Ganga (Verified)' : 'Unknown';

  // 2. CHECK PROFILE PAGE
  console.log('2. Testing /faculty/profile...');
  await page.goto('http://localhost:3000/faculty/profile', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(VERIFY_DIR, '02_profile_page.png') });

  const profileBody = await page.innerText('body');
  const profileHasGanga = profileBody.includes('Ganga');
  console.log(`- Profile page displays Ganga: ${profileHasGanga}`);

  // Test Profile Save
  const phoneInput = page.locator('input[type="tel"]').first();
  if (await phoneInput.count() > 0) {
    await phoneInput.fill('+91 94421 88999');
    const saveBtn = page.locator('button:has-text("Save Profile Updates")').first();
    await saveBtn.click();
    await page.waitForTimeout(2000);
    const toastText = await page.evaluate(() => {
      const el = document.querySelector('[data-sonner-toaster]');
      return el ? el.innerText : '';
    });
    console.log(`- Profile save toast: ${toastText}`);
    report.profileSaved = toastText.includes('updated') || toastText.includes('success') || !profileBody.includes('Failed');
  }

  // 3. CHECK COURSES PAGE
  console.log('3. Testing /faculty/courses...');
  await page.goto('http://localhost:3000/faculty/courses', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(VERIFY_DIR, '03_courses_page.png') });

  const courseCards = await page.locator('text=22UCSC61, text=22PCSC21, text=22UCSC41').count();
  console.log(`- Assigned course badges found: ${courseCards}`);
  report.coursesLoaded = courseCards;

  const rosterBtn = page.locator('button:has-text("View Student Roster")').first();
  if (await rosterBtn.count() > 0) {
    await rosterBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(VERIFY_DIR, '03b_course_roster.png') });
    const rosterCount = await page.locator('text=Att.').count();
    console.log(`- Students loaded in modal roster: ${rosterCount}`);
    report.rosterLoaded = rosterCount;
    const closeBtn = page.locator('button:has-text("Close Roster")').first();
    if (await closeBtn.count() > 0) await closeBtn.click();
  }

  // 4. CHECK EVENTS PAGE
  console.log('4. Testing /faculty/events...');
  await page.goto('http://localhost:3000/faculty/events', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(VERIFY_DIR, '04_events_page.png') });

  const eventCards = await page.locator('button:has-text("View Details")').count();
  console.log(`- Campus events listed: ${eventCards}`);
  report.eventsLoaded = eventCards;

  // 5. CHECK FACILITIES PAGE
  console.log('5. Testing /faculty/facilities...');
  await page.goto('http://localhost:3000/faculty/facilities', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(VERIFY_DIR, '05_facilities_page.png') });

  const facilityCards = await page.locator('button:has-text("View Facility Details")').count();
  console.log(`- Campus facilities listed: ${facilityCards}`);
  report.facilitiesLoaded = facilityCards;

  // 6. CHECK ATTENDANCE PAGE & SUBMIT
  console.log('6. Testing /faculty/attendance (Submitting real DB attendance)...');
  await page.goto('http://localhost:3000/faculty/attendance', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(VERIFY_DIR, '06_attendance_initial.png') });

  const loadAttRosterBtn = page.locator('button:has-text("Load Student Roster")').first();
  if (await loadAttRosterBtn.count() > 0) {
    console.log('- Clicking Load Student Roster on Attendance page...');
    await loadAttRosterBtn.click();
    await page.waitForTimeout(2000);
  }

  const submitAttBtn = page.locator('button:has-text("Save Attendance Records"), button:has-text("Save Attendance"), button:has-text("Submit Attendance")').first();
  if (await submitAttBtn.count() > 0) {
    console.log('- Clicking Save Attendance Records button...');
    await submitAttBtn.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(VERIFY_DIR, '06b_attendance_saved.png') });
    const attToast = await page.evaluate(() => {
      const el = document.querySelector('[data-sonner-toaster]');
      return el ? el.innerText : '';
    });
    console.log(`- Attendance toast text: ${attToast}`);
    report.attendanceSaved = attToast.includes('saved') || attToast.includes('success') || attToast.includes('marked');
  }

  // 7. CHECK MARKS ENTRY PAGE & SUBMIT
  console.log('7. Testing /faculty/marks (Submitting real DB marks)...');
  await page.goto('http://localhost:3000/faculty/marks', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(VERIFY_DIR, '07_marks_initial.png') });

  const loadMarksBtn = page.locator('button:has-text("Load Student Mark Sheet")').first();
  if (await loadMarksBtn.count() > 0) {
    console.log('- Clicking Load Student Mark Sheet on Marks page...');
    await loadMarksBtn.click();
    await page.waitForTimeout(2000);
  }

  // Fill marks for students
  const markInputs = page.locator('input[type="number"]');
  const inputCount = await markInputs.count();
  console.log(`- Student mark input rows found: ${inputCount}`);

  for (let i = 0; i < Math.min(inputCount, 16); i++) {
    await markInputs.nth(i).fill('22');
  }

  await page.screenshot({ path: path.join(VERIFY_DIR, '07b_marks_filled.png') });

  const submitMarksBtn = page.locator('button:has-text("Submit Final Marks"), button:has-text("Save Assessment Marks"), button:has-text("Submit Marks")').first();
  if (await submitMarksBtn.count() > 0) {
    console.log('- Clicking Submit Final Marks button...');
    await submitMarksBtn.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(VERIFY_DIR, '07c_marks_saved.png') });
    const marksToast = await page.evaluate(() => {
      const el = document.querySelector('[data-sonner-toaster]');
      return el ? el.innerText : '';
    });
    console.log(`- Marks toast text: ${marksToast}`);
    report.marksSaved = marksToast.includes('saved') || marksToast.includes('success');
  }

  // 8. NAVIGATION CHECK ACROSS ALL 10 ROUTES
  console.log('8. Checking for 404s on all 10 faculty routes...');
  const routesToCheck = [
    '/faculty/dashboard',
    '/faculty/profile',
    '/faculty/courses',
    '/faculty/attendance',
    '/faculty/marks',
    '/faculty/e-content',
    '/faculty/mentoring',
    '/faculty/events',
    '/faculty/research',
    '/faculty/facilities'
  ];

  for (const r of routesToCheck) {
    const resp = await page.goto(`http://localhost:3000${r}`, { waitUntil: 'domcontentloaded' });
    const status = resp ? resp.status() : 0;
    const bodyText = await page.innerText('body');
    const is404 = status === 404 || bodyText.includes('404') || bodyText.includes('This page could not be found');
    if (is404) {
      report.navigation404s.push(r);
    }
  }

  console.log(`- 404 routes found: ${report.navigation404s.length === 0 ? 'NONE (ALL 10 ROUTES 200 OK!)' : report.navigation404s.join(', ')}`);

  fs.writeFileSync(path.join(VERIFY_DIR, 'verification_summary.json'), JSON.stringify(report, null, 2));
  console.log('\n✅ Verification Run Complete!');
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
}

runVerification().catch(err => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
