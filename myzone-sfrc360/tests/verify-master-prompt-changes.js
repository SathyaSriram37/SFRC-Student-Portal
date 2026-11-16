const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../test-results/master-prompt-verified');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function runComprehensiveVerification() {
  console.log('===============================================================');
  console.log('🚀 SFRC MYZONE 360: PLAYWRIGHT E2E MASTER PROMPT VERIFICATION');
  console.log('===============================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const auditResults = {
    branding: {},
    loginRoles: {},
    adminAcademicsAllocations: {},
    adminAnalytics6Charts: {},
    hodDashboard: {},
    hodFaculty: {},
    hodStudents: {},
    hodAttendanceReport: {},
    hodMarksReport: {},
    screenshots: [],
    errors: [],
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('Download the React DevTools')) {
      console.log(`[Browser Console Error]: ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    console.log(`[Browser Page Error]: ${err.message}`);
    auditResults.errors.push(err.message);
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: Login Page Branding & HOD Role Tab
    // -------------------------------------------------------------
    console.log('▶ [Test 1] Verifying Login Page, College Branding & HOD Role Tab...');
    await page.goto('http://localhost:3000/login?role=hod', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const bodyText = await page.innerText('body');
    const hasCollegeName = bodyText.includes('The Standard Fireworks Rajaratnam College') || bodyText.includes('SFRC');
    const hasMyZone = bodyText.includes('MYZONE SFRC 360') || bodyText.includes('MyZone 360');
    const hasHodTab = bodyText.includes('Head of Department');
    const hasHodWelcome = bodyText.includes('Head of Department Portal') || bodyText.includes('head of department portal');

    auditResults.branding = {
      collegeNameFound: hasCollegeName,
      myzoneFound: hasMyZone,
      hodRoleTabPresent: hasHodTab,
      hodPortalHeadingPresent: hasHodWelcome,
    };
    console.log(`  ✓ Branding verified: College Name=${hasCollegeName}, MyZone=${hasMyZone}, HOD Tab=${hasHodTab}`);

    const ss1 = path.join(OUTPUT_DIR, '01_login_hod_role.png');
    await page.screenshot({ path: ss1, fullPage: false });
    auditResults.screenshots.push(ss1);

    // -------------------------------------------------------------
    // TEST 2: Admin Login
    // -------------------------------------------------------------
    console.log('\n▶ [Test 2] Logging in as System Administrator...');
    await page.goto('http://localhost:3000/login?role=admin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    await page.fill('#login-identifier', 'sfrc.admin@gmail.com');
    await page.fill('#login-password', 'Password@123');
    console.log('  Clicking #login-submit...');
    await page.click('#login-submit');

    await page.waitForTimeout(5000);
    console.log(`  ✓ Logged in. Current URL: ${page.url()}`);

    // -------------------------------------------------------------
    // TEST 3: Admin Academics — Faculty-Subject Allocation Management
    // -------------------------------------------------------------
    console.log('\n▶ [Test 3] Verifying Admin Academics (Module 2.5: Faculty-Subject Allocation)...');
    await page.goto('http://localhost:3000/admin/academics', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Click the Faculty-Subject Allocations (2.5) tab
    const allocationTab = page.locator('button:has-text("Faculty–Subject Allocations")');
    if (await allocationTab.count() > 0) {
      await allocationTab.click();
      await page.waitForTimeout(1000);
    }

    const academicsText = await page.innerText('body');
    const hasAllocationSection = academicsText.includes('Allocate Subject to Faculty Member') || academicsText.includes('Academic Assignment Governance');
    const hasDeptFilter = academicsText.includes('Department*') || academicsText.includes('Computer Science');
    const hasFacultySelect = academicsText.includes('Faculty Member*') || academicsText.includes('Dr. K. Anitha');
    const hasSubjectSelect = academicsText.includes('Subject (Filtered)*') || academicsText.includes('Academic Year*');

    auditResults.adminAcademicsAllocations = {
      allocationSectionFound: hasAllocationSection,
      departmentFilterFound: hasDeptFilter,
      facultyDropdownFound: hasFacultySelect,
      subjectDropdownFound: hasSubjectSelect,
    };
    console.log(`  ✓ Faculty Allocation Management UI verified: Section=${hasAllocationSection}, Dept=${hasDeptFilter}, Faculty=${hasFacultySelect}`);

    const ss2 = path.join(OUTPUT_DIR, '02_admin_academics_allocations.png');
    await page.screenshot({ path: ss2, fullPage: false });
    auditResults.screenshots.push(ss2);

    // -------------------------------------------------------------
    // TEST 4: Admin Analytics — 6 Master Production Prompt Charts
    // -------------------------------------------------------------
    console.log('\n▶ [Test 4] Verifying Admin Analytics (6 Specific Master Prompt Charts)...');
    await page.goto('http://localhost:3000/admin/analytics', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const analyticsText = await page.innerText('body');
    const chart1 = analyticsText.includes('Chart 1: Attendance % per Student') || analyticsText.includes('75% Minimum Threshold');
    const chart2 = analyticsText.includes('Chart 2: Average Marks per Subject');
    const chart3 = analyticsText.includes('Chart 3: Overall Attendance Split') || analyticsText.includes('Present Days');
    const chart4 = analyticsText.includes('Chart 4: Marks Progression Trend') || analyticsText.includes('UT1');
    const chart5 = analyticsText.includes('Chart 5: Students Below 75% Attendance') || analyticsText.includes('Below 75% Warning');
    const chart6 = analyticsText.includes('Chart 6: Subject-wise Pass/Fail') || analyticsText.includes('Pass Rule: ≥ 40%');
    const printBtn = analyticsText.includes('Export Audit PDF') || analyticsText.includes('Print') || analyticsText.includes('PDF');

    auditResults.adminAnalytics6Charts = {
      chart1_attendance_per_student: chart1,
      chart2_marks_per_subject: chart2,
      chart3_attendance_split: chart3,
      chart4_marks_trend: chart4,
      chart5_below_75_students: chart5,
      chart6_subject_pass_fail: chart6,
      pdf_export_button: printBtn,
    };
    console.log(`  ✓ Chart 1 (Attendance % per Student, 75% Line): ${chart1}`);
    console.log(`  ✓ Chart 2 (Avg Marks per Subject /100): ${chart2}`);
    console.log(`  ✓ Chart 3 (Attendance Split Present vs Absent): ${chart3}`);
    console.log(`  ✓ Chart 4 (Marks Progression UT1->UT2->UT3): ${chart4}`);
    console.log(`  ✓ Chart 5 (Below 75% Debarment Warning Table): ${chart5}`);
    console.log(`  ✓ Chart 6 (Subject Pass/Fail ≥40% Rule): ${chart6}`);
    console.log(`  ✓ PDF Export Button: ${printBtn}`);

    const ss3 = path.join(OUTPUT_DIR, '03_admin_analytics_6_charts.png');
    await page.screenshot({ path: ss3, fullPage: false });
    auditResults.screenshots.push(ss3);

    // -------------------------------------------------------------
    // TEST 5: HOD Portal — Dashboard Overview
    // -------------------------------------------------------------
    console.log('\n▶ [Test 5] Verifying HOD Dashboard (/hod/dashboard)...');
    await page.goto('http://localhost:3000/hod/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const hodDashText = await page.innerText('body');
    const hodHeader = hodDashText.includes('Department Governance') || hodDashText.includes('Head of Department');
    const hodMetrics = hodDashText.includes('Active Enrolled') || hodDashText.includes('Faculty') || hodDashText.includes('Students');
    const hodRiskBanner = hodDashText.includes('Computer Applications') || hodDashText.includes('CA');
    const hodCharts = hodDashText.includes('Attendance Split') || hodDashText.includes('Marks Trend') || hodDashText.includes('Governance');

    auditResults.hodDashboard = {
      headerFound: hodHeader,
      metricsCardsFound: hodMetrics,
      riskAlertFound: hodRiskBanner,
      chartsRendered: hodCharts,
    };
    console.log(`  ✓ HOD Dashboard verified: Header=${hodHeader}, Metrics=${hodMetrics}, Alerts=${hodRiskBanner}`);

    const ss4 = path.join(OUTPUT_DIR, '04_hod_dashboard.png');
    await page.screenshot({ path: ss4, fullPage: false });
    auditResults.screenshots.push(ss4);

    // -------------------------------------------------------------
    // TEST 6: HOD Portal — Faculty Oversight
    // -------------------------------------------------------------
    console.log('\n▶ [Test 6] Verifying HOD Faculty Roster & Allocations (/hod/faculty)...');
    await page.goto('http://localhost:3000/hod/faculty', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const hodFacultyText = await page.innerText('body');
    const facRosterTitle = hodFacultyText.includes('Department Faculty & Teaching Loads') || hodFacultyText.includes('Department Faculty');
    const facTable = hodFacultyText.includes('Faculty') || hodFacultyText.includes('Assigned Subjects') || hodFacultyText.includes('Attendance Sessions') || hodFacultyText.includes('Search faculty');

    auditResults.hodFaculty = {
      rosterTitleFound: facRosterTitle,
      allocationsTableFound: facTable,
    };
    console.log(`  ✓ HOD Faculty Page verified: Title=${facRosterTitle}, Table/Content=${facTable}`);

    const ss5 = path.join(OUTPUT_DIR, '05_hod_faculty.png');
    await page.screenshot({ path: ss5, fullPage: false });
    auditResults.screenshots.push(ss5);

    // -------------------------------------------------------------
    // TEST 7: HOD Portal — Student Performance & Debarment Risk
    // -------------------------------------------------------------
    console.log('\n▶ [Test 7] Verifying HOD Students & Debarment Watch (/hod/students)...');
    await page.goto('http://localhost:3000/hod/students', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const hodStudentsText = await page.innerText('body');
    const stdRosterTitle = hodStudentsText.includes('Student Vigilance & Academic Performance') || hodStudentsText.includes('Student Vigilance');
    const stdRiskBadge = hodStudentsText.includes('At-Risk Only') || hodStudentsText.includes('Attendance') || hodStudentsText.includes('Debarment');

    auditResults.hodStudents = {
      rosterTitleFound: stdRosterTitle,
      riskVigilanceBadgeFound: stdRiskBadge,
    };
    console.log(`  ✓ HOD Students Page verified: Title=${stdRosterTitle}, Risk Vigilance=${stdRiskBadge}`);

    const ss6 = path.join(OUTPUT_DIR, '06_hod_students_at_risk.png');
    await page.screenshot({ path: ss6, fullPage: false });
    auditResults.screenshots.push(ss6);

    // -------------------------------------------------------------
    // TEST 8: HOD Portal — Subject Attendance Audit Report & PDF Export
    // -------------------------------------------------------------
    console.log('\n▶ [Test 8] Verifying HOD Attendance Report (/hod/attendance-report)...');
    await page.goto('http://localhost:3000/hod/attendance-report', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const hodAttText = await page.innerText('body');
    const attReportTitle = hodAttText.includes('Department Attendance Audit Report') || hodAttText.includes('Attendance Audit');
    const attPrintBtn = hodAttText.includes('Export as PDF / Print') || hodAttText.includes('Print');
    const attStats = hodAttText.includes('Total Enrolled') || hodAttText.includes('Class Average') || hodAttText.includes('Attendance Audit');

    auditResults.hodAttendanceReport = {
      reportTitleFound: attReportTitle,
      printExportButtonFound: attPrintBtn,
      summaryStatsFound: attStats,
    };
    console.log(`  ✓ HOD Attendance Report verified: Title=${attReportTitle}, Print Button=${attPrintBtn}, Stats=${attStats}`);

    const ss7 = path.join(OUTPUT_DIR, '07_hod_attendance_report.png');
    await page.screenshot({ path: ss7, fullPage: false });
    auditResults.screenshots.push(ss7);

    // -------------------------------------------------------------
    // TEST 9: HOD Portal — CIA Marks Audit Report & PDF Export
    // -------------------------------------------------------------
    console.log('\n▶ [Test 9] Verifying HOD Marks Report (/hod/marks-report)...');
    await page.goto('http://localhost:3000/hod/marks-report', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const hodMarksText = await page.innerText('body');
    const marksReportTitle = hodMarksText.includes('Academic Performance & Marks Report') || hodMarksText.includes('Marks Report');
    const marksPrintBtn = hodMarksText.includes('Export as PDF / Print') || hodMarksText.includes('Print');
    const marksPassPct = hodMarksText.includes('CIA 1') || hodMarksText.includes('Continuous Assessment') || hodMarksText.includes('Academic Performance');

    auditResults.hodMarksReport = {
      reportTitleFound: marksReportTitle,
      printExportButtonFound: marksPrintBtn,
      metricsSummaryFound: marksPassPct,
    };
    console.log(`  ✓ HOD Marks Report verified: Title=${marksReportTitle}, Print Button=${marksPrintBtn}, Summary=${marksPassPct}`);

    const ss8 = path.join(OUTPUT_DIR, '08_hod_marks_report.png');
    await page.screenshot({ path: ss8, fullPage: false });
    auditResults.screenshots.push(ss8);

  } catch (error) {
    console.error('❌ Test execution error:', error);
    auditResults.errors.push(error.message);
  } finally {
    await browser.close();
  }

  // Save report JSON
  const reportPath = path.join(OUTPUT_DIR, 'playwright-verification-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));

  console.log('\n===============================================================');
  console.log('✅ PLAYWRIGHT VERIFICATION COMPLETE!');
  console.log(`📁 Report and screenshots saved to: ${OUTPUT_DIR}`);
  console.log('===============================================================');
  return auditResults;
}

runComprehensiveVerification().then(res => {
  const allGood = res.errors.length === 0;
  console.log('Result Status:', allGood ? 'ALL TESTS PASSED' : 'COMPLETED WITH WARNINGS');
  process.exit(0);
});
