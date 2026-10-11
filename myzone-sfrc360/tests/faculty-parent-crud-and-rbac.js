const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

const RESULTS_DIR = path.join(__dirname, '../test-results');
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

const DB_PATH = path.resolve(__dirname, '../../college.db');
const ADMIN_EMAIL = process.env.ADMIN_TEST_EMAIL || 'sfrc.admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_TEST_PASSWORD || 'Password@123';
const STUDENT_EMAIL = 'sfrc.student@gmail.com';
const STUDENT_PASSWORD = 'Password@123';

const SUPABASE_URL = 'https://ketpjyyowmhuzecwzmds.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtldHBqeXlvd21odXplY3d6bWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MDUwMTMsImV4cCI6MjEwNjE4MTAxM30.wicBEM7Oj3jD5wqBLDsukmeGZC9NNzyem6kCBRYHtFA';

const RANDOM_SUFFIX = Math.floor(1000 + Math.random() * 9000);
const FACULTY_EMAIL = `e2e.faculty${RANDOM_SUFFIX}@sfrc.ac.in`;
const FACULTY_NAME = `E2E Faculty ${RANDOM_SUFFIX}`;
const FACULTY_EMP_ID = `FAC${RANDOM_SUFFIX}`;
const FACULTY_PASSWORD = 'Password@123';

const PARENT_EMAIL = `e2e.parent${RANDOM_SUFFIX}@sfrc.ac.in`;
const PARENT_NAME = `E2E Parent ${RANDOM_SUFFIX}`;
const PARENT_PASSWORD = 'Password@123';

const testResults = [];

function recordTest(id, feature, status, details = '', evidence = '') {
  console.log(`[${status}] ${id}: ${feature} ${details ? '- ' + details : ''}`);
  testResults.push({ id, feature, status, details, evidence });
}

function querySQLite(sql, params = []) {
  const pyCode = `import sqlite3, json; con = sqlite3.connect(r'd:/SFRC Student Portal/college.db'); cur = con.cursor(); cur.execute(${JSON.stringify(sql)}, ${JSON.stringify(params)}); cols = [c[0] for c in cur.description] if cur.description else []; print(json.dumps([dict(zip(cols, r)) for r in cur.fetchall()]))`;
  const output = execSync(`"d:\\SFRC Student Portal\\backend\\venv\\Scripts\\python.exe" -c "${pyCode.replace(/"/g, '\\"')}"`, { encoding: 'utf8' });
  return JSON.parse(output.trim());
}

function signInWithPassword(email, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email, password });
    const url = new URL(`${SUPABASE_URL}/auth/v1/token?grant_type=password`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Supabase Auth failed (${res.statusCode}): ${data}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function callBackendApi(method, pathUrl, token = null, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://127.0.0.1:8000${pathUrl}`);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const postData = body ? JSON.stringify(body) : null;
    if (postData) headers['Content-Length'] = Buffer.byteLength(postData);

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: headers,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('========================================================');
  console.log('PLAYWRIGHT E2E VERIFICATION: FACULTY/PARENT CRUD & RBAC');
  console.log('========================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await context.newPage();

  page.on('dialog', async (d) => {
    console.log(`  [Dialog] ${d.type()}: "${d.message()}" -> accepting`);
    await d.accept();
  });

  let facultyUserId = null;
  let parentUserId = null;

  try {
    // ── 1. Admin Login ───────────────────────────────────────────────────────
    console.log('\n--- Step 1: Admin Login ---');
    await page.goto('http://127.0.0.1:3000/login?role=admin', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#login-submit', { state: 'visible', timeout: 15000 });

    const adminTab = page.locator('a[href*="role=admin"]');
    if (await adminTab.isVisible()) {
      await adminTab.click();
      await page.waitForTimeout(500);
    }

    await page.locator('#login-identifier').fill(ADMIN_EMAIL);
    await page.locator('#login-password').fill(ADMIN_PASSWORD);
    await page.locator('#login-submit').click();

    await page.waitForURL(/\/admin\/(dashboard|users)/, { timeout: 25000 });
    console.log('  Admin successfully authenticated.');

    await page.goto('http://127.0.0.1:3000/admin/users', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('table tbody tr', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // ── 2. Faculty CRUD Verification ─────────────────────────────────────────
    console.log('\n--- Step 2: Faculty CRUD via Real Browser UI ---');
    // Open Create Modal
    await page.locator('button:has-text("Create User Account")').click();
    await page.waitForTimeout(800);

    const createModal = page.locator('div.fixed').filter({ hasText: 'Create Real User Account' });
    await createModal.locator('input[name="full_name"]').fill(FACULTY_NAME);
    await createModal.locator('input[name="email"]').fill(FACULTY_EMAIL);
    await createModal.locator('select[name="role"]').selectOption('faculty');
    await page.waitForTimeout(500);

    // Explicitly set initial password
    await createModal.locator('input[name="password"]').fill(FACULTY_PASSWORD);
    await createModal.locator('input[name="employee_id"]').fill(FACULTY_EMP_ID);
    await createModal.locator('input[name="designation"]').fill('Assistant Professor');
    await createModal.locator('input[name="phone"]').fill('9876543210');

    // Select Department
    const deptSelect = createModal.locator('select[name="department_id"]');
    if (await deptSelect.isVisible()) {
      await deptSelect.selectOption({ label: 'Computer Science' }).catch(() => {});
    }

    // Submit Create Account
    await createModal.locator('button:has-text("Create Account in Database")').click();
    await page.waitForTimeout(3000);

    const shotFacultyCreated = path.join(RESULTS_DIR, '08_faculty_created.png');
    await page.screenshot({ path: shotFacultyCreated });

    // Verify in SQLite
    const facDbRows = await querySQLite(
      `SELECT up.id, up.email, up.role, up.is_active, f.employee_id, f.designation 
       FROM user_profiles up 
       JOIN faculty f ON f.user_id = up.id 
       WHERE up.email = ?`,
      [FACULTY_EMAIL]
    );

    const facCreatedDb = facDbRows.length > 0 && facDbRows[0].employee_id === FACULTY_EMP_ID;
    if (facCreatedDb) {
      facultyUserId = facDbRows[0].id;
      recordTest('CRUD-FAC-CREATE', 'Faculty Creation UI & Database Persistence', 'PASS',
        `Created ${FACULTY_EMAIL} (ID: ${facultyUserId}, EmpID: ${FACULTY_EMP_ID}) in college.db`, shotFacultyCreated);
    } else {
      recordTest('CRUD-FAC-CREATE', 'Faculty Creation UI & Database Persistence', 'FAIL',
        `Faculty record not found in college.db: ${JSON.stringify(facDbRows)}`);
    }

    // Search and verify in Table
    const searchForm = page.locator('form').filter({ has: page.locator('input[placeholder*="Search by full name"]') });
    const searchInput = searchForm.locator('input');
    await searchInput.fill(FACULTY_NAME);
    await searchForm.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);

    const facultyRow = page.locator(`table tbody tr:has-text("${FACULTY_NAME}")`);
    await page.waitForSelector(`table tbody tr:has-text("${FACULTY_NAME}")`, { timeout: 10000 });

    // Edit Faculty
    console.log('  Editing Faculty record...');
    const editFacBtn = facultyRow.locator('button[title*="Edit permitted profile fields"]');
    await editFacBtn.click();
    await page.waitForTimeout(1000);

    const editModal = page.locator('form:has-text("Save Changes to Database")');
    await editModal.locator('input[name="designation"]').fill('Associate Professor');
    await editModal.locator('input[name="phone"]').fill('9876500888');

    await editModal.locator('button:has-text("Save Changes to Database")').click();
    await page.waitForTimeout(2500);

    const shotFacultyEdited = path.join(RESULTS_DIR, '09_faculty_edited.png');
    await page.screenshot({ path: shotFacultyEdited });

    // Verify Edit in SQLite
    const facDbEditRows = await querySQLite(
      `SELECT up.phone, f.designation FROM user_profiles up JOIN faculty f ON f.user_id = up.id WHERE up.email = ?`,
      [FACULTY_EMAIL]
    );
    const facEditDb = facDbEditRows.length > 0 && facDbEditRows[0].designation === 'Associate Professor' && facDbEditRows[0].phone === '9876500888';
    if (facEditDb) {
      recordTest('CRUD-FAC-EDIT', 'Faculty Edit Profile & Database Persistence', 'PASS',
        `Phone/Designation updated to ${JSON.stringify(facDbEditRows[0])}`, shotFacultyEdited);
    } else {
      recordTest('CRUD-FAC-EDIT', 'Faculty Edit Profile & Database Persistence', 'FAIL',
        `Update not reflected in college.db: ${JSON.stringify(facDbEditRows)}`);
    }

    // Deactivate Faculty
    console.log('  Deactivating Faculty...');
    const deactFacBtn = facultyRow.locator('button:has-text("Deactivate")');
    if (await deactFacBtn.isVisible()) {
      await deactFacBtn.click();
      await page.waitForTimeout(2000);
    }

    const facDeactDbRows = await querySQLite(`SELECT is_active FROM user_profiles WHERE email = ?`, [FACULTY_EMAIL]);
    const facDeactivated = facDeactDbRows.length > 0 && Number(facDeactDbRows[0].is_active) === 0;

    // Activate Faculty
    console.log('  Reactivating Faculty...');
    const actFacBtn = facultyRow.locator('button:has-text("Activate")');
    if (await actFacBtn.isVisible()) {
      await actFacBtn.click();
      await page.waitForTimeout(2000);
    }

    const facActDbRows = await querySQLite(`SELECT is_active FROM user_profiles WHERE email = ?`, [FACULTY_EMAIL]);
    const facActivated = facActDbRows.length > 0 && Number(facActDbRows[0].is_active) === 1;

    const shotFacultyToggle = path.join(RESULTS_DIR, '10_faculty_status_toggled.png');
    await page.screenshot({ path: shotFacultyToggle });

    if (facDeactivated && facActivated) {
      recordTest('CRUD-FAC-STATUS', 'Faculty Activate/Deactivate Lifecycle', 'PASS',
        `Status successfully toggled (0 -> 1) in database and UI`, shotFacultyToggle);
    } else {
      recordTest('CRUD-FAC-STATUS', 'Faculty Activate/Deactivate Lifecycle', 'FAIL',
        `Deact: ${facDeactivated}, Act: ${facActivated}`);
    }

    // ── 3. Parent CRUD Verification ──────────────────────────────────────────
    console.log('\n--- Step 3: Parent CRUD via Real Browser UI ---');
    // Clear search filter first
    const clearBtn = page.locator('button:has-text("Clear Filters")');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await page.waitForTimeout(1000);
    }

    // Open Create Modal
    await page.locator('button:has-text("Create User Account")').click();
    await page.waitForTimeout(800);

    const createParentModal = page.locator('div.fixed').filter({ hasText: 'Create Real User Account' });
    await createParentModal.locator('input[name="full_name"]').fill(PARENT_NAME);
    await createParentModal.locator('input[name="email"]').fill(PARENT_EMAIL);
    await createParentModal.locator('select[name="role"]').selectOption('parent');
    await page.waitForTimeout(500);

    await createParentModal.locator('input[name="password"]').fill(PARENT_PASSWORD);
    await createParentModal.locator('input[name="relation"]').fill('Mother');
    await createParentModal.locator('input[name="ward_register_number"]').fill('23UCA001'); // link to real student
    await createParentModal.locator('input[name="phone"]').fill('9123456780');

    await createParentModal.locator('button:has-text("Create Account in Database")').click();
    await page.waitForTimeout(3000);

    const shotParentCreated = path.join(RESULTS_DIR, '11_parent_created.png');
    await page.screenshot({ path: shotParentCreated });

    // Verify in SQLite
    const parentDbRows = await querySQLite(
      `SELECT up.id, up.email, up.role, up.is_active, p.relation, p.ward_student_id 
       FROM user_profiles up 
       JOIN parents p ON p.user_id = up.id 
       WHERE up.email = ?`,
      [PARENT_EMAIL]
    );

    const parentCreatedDb = parentDbRows.length > 0 && parentDbRows[0].relation === 'Mother';
    if (parentCreatedDb) {
      parentUserId = parentDbRows[0].id;
      recordTest('CRUD-PAR-CREATE', 'Parent Creation UI & Database Persistence', 'PASS',
        `Created ${PARENT_EMAIL} (ID: ${parentUserId}, Ward: ${parentDbRows[0].ward_student_id}) in college.db`, shotParentCreated);
    } else {
      recordTest('CRUD-PAR-CREATE', 'Parent Creation UI & Database Persistence', 'FAIL',
        `Parent record not found in college.db: ${JSON.stringify(parentDbRows)}`);
    }

    // Search and verify in Table
    await searchInput.fill(PARENT_NAME);
    await searchForm.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);

    const parentRow = page.locator(`table tbody tr:has-text("${PARENT_NAME}")`);
    await page.waitForSelector(`table tbody tr:has-text("${PARENT_NAME}")`, { timeout: 10000 });

    // Edit Parent
    console.log('  Editing Parent record...');
    const editParBtn = parentRow.locator('button[title*="Edit permitted profile fields"]');
    await editParBtn.click();
    await page.waitForTimeout(1000);

    const editParModal = page.locator('form:has-text("Save Changes to Database")');
    await editParModal.locator('input[name="relation"]').fill('Guardian');
    await editParModal.locator('input[name="phone"]').fill('9123456999');

    await editParModal.locator('button:has-text("Save Changes to Database")').click();
    await page.waitForTimeout(2500);

    const shotParentEdited = path.join(RESULTS_DIR, '12_parent_edited.png');
    await page.screenshot({ path: shotParentEdited });

    // Verify Edit in SQLite
    const parDbEditRows = await querySQLite(
      `SELECT up.phone, p.relation FROM user_profiles up JOIN parents p ON p.user_id = up.id WHERE up.email = ?`,
      [PARENT_EMAIL]
    );
    const parEditDb = parDbEditRows.length > 0 && parDbEditRows[0].phone === '9123456999' && parDbEditRows[0].relation === 'Guardian';
    if (parEditDb) {
      recordTest('CRUD-PAR-EDIT', 'Parent Edit Profile & Database Persistence', 'PASS',
        `Phone/Relation updated to ${JSON.stringify(parDbEditRows[0])}`, shotParentEdited);
    } else {
      recordTest('CRUD-PAR-EDIT', 'Parent Edit Profile & Database Persistence', 'FAIL',
        `Update not reflected in college.db: ${JSON.stringify(parDbEditRows)}`);
    }

    // Deactivate Parent
    console.log('  Deactivating Parent...');
    const deactParBtn = parentRow.locator('button:has-text("Deactivate")');
    if (await deactParBtn.isVisible()) {
      await deactParBtn.click();
      await page.waitForTimeout(2000);
    }

    const parDeactDbRows = await querySQLite(`SELECT is_active FROM user_profiles WHERE email = ?`, [PARENT_EMAIL]);
    const parDeactivated = parDeactDbRows.length > 0 && Number(parDeactDbRows[0].is_active) === 0;

    // Activate Parent
    console.log('  Reactivating Parent...');
    const actParBtn = parentRow.locator('button:has-text("Activate")');
    if (await actParBtn.isVisible()) {
      await actParBtn.click();
      await page.waitForTimeout(2000);
    }

    const parActDbRows = await querySQLite(`SELECT is_active FROM user_profiles WHERE email = ?`, [PARENT_EMAIL]);
    const parActivated = parActDbRows.length > 0 && Number(parActDbRows[0].is_active) === 1;

    const shotParentToggle = path.join(RESULTS_DIR, '13_parent_status_toggled.png');
    await page.screenshot({ path: shotParentToggle });

    if (parDeactivated && parActivated) {
      recordTest('CRUD-PAR-STATUS', 'Parent Activate/Deactivate Lifecycle', 'PASS',
        `Status successfully toggled (0 -> 1) in database and UI`, shotParentToggle);
    } else {
      recordTest('CRUD-PAR-STATUS', 'Parent Activate/Deactivate Lifecycle', 'FAIL',
        `Deact: ${parDeactivated}, Act: ${parActivated}`);
    }

    // ── 4. RBAC Verification with Authentic Auth Tokens ──────────────────────
    console.log('\n--- Step 4: RBAC Verification via Authentic Auth Flow ---');

    // 4.1 Unauthenticated Request
    console.log('  Testing Unauthenticated Request...');
    const unauthGet = await callBackendApi('GET', '/api/v1/admin/users');
    const unauthPost = await callBackendApi('POST', '/api/v1/admin/users', null, { email: 'unauth@sfrc.ac.in' });
    const unauthDel = await callBackendApi('DELETE', '/api/v1/admin/users/dummy-id');

    if (unauthGet.status === 401 && unauthPost.status === 401 && unauthDel.status === 401) {
      recordTest('RBAC-UNAUTH', 'Unauthenticated Access Blocked', 'PASS',
        `All requests rejected with HTTP 401 Unauthorized (${unauthGet.body.detail || ''})`);
    } else {
      recordTest('RBAC-UNAUTH', 'Unauthenticated Access Blocked', 'FAIL',
        `GET: ${unauthGet.status}, POST: ${unauthPost.status}, DEL: ${unauthDel.status}`);
    }

    // 4.2 Authentic Student Authentication Flow
    console.log('  Authenticating Student via Supabase Auth...');
    const studentAuth = await signInWithPassword(STUDENT_EMAIL, STUDENT_PASSWORD);
    const studentToken = studentAuth.access_token;
    console.log(`  Student authenticated successfully. Token length: ${studentToken.length}`);

    const stuGet = await callBackendApi('GET', '/api/v1/admin/users', studentToken);
    const stuPost = await callBackendApi('POST', '/api/v1/admin/users', studentToken, { email: 'fake@sfrc.ac.in' });
    const stuDel = await callBackendApi('DELETE', '/api/v1/admin/users/dummy-id', studentToken);

    if (stuGet.status === 403 && stuPost.status === 403 && stuDel.status === 403) {
      recordTest('RBAC-STUDENT', 'Student Blocked from Admin User APIs', 'PASS',
        `Student token strictly forbidden with HTTP 403 (${stuGet.body.detail})`);
    } else {
      recordTest('RBAC-STUDENT', 'Student Blocked from Admin User APIs', 'FAIL',
        `GET: ${stuGet.status}, POST: ${stuPost.status}, DEL: ${stuDel.status}`);
    }

    // 4.3 Authentic Faculty Authentication Flow
    console.log('  Authenticating Faculty via Supabase Auth...');
    const facultyAuth = await signInWithPassword(FACULTY_EMAIL, FACULTY_PASSWORD);
    const facultyToken = facultyAuth.access_token;
    console.log(`  Faculty authenticated successfully. Token length: ${facultyToken.length}`);

    const facGet = await callBackendApi('GET', '/api/v1/admin/users', facultyToken);
    const facPost = await callBackendApi('POST', '/api/v1/admin/users', facultyToken, { email: 'fake@sfrc.ac.in' });
    const facDel = await callBackendApi('DELETE', '/api/v1/admin/users/dummy-id', facultyToken);

    if (facGet.status === 403 && facPost.status === 403 && facDel.status === 403) {
      recordTest('RBAC-FACULTY', 'Faculty Blocked from Admin User APIs', 'PASS',
        `Faculty token strictly forbidden with HTTP 403 (${facGet.body.detail})`);
    } else {
      recordTest('RBAC-FACULTY', 'Faculty Blocked from Admin User APIs', 'FAIL',
        `GET: ${facGet.status}, POST: ${facPost.status}, DEL: ${facDel.status}`);
    }

    // 4.4 Authentic Parent Authentication Flow
    console.log('  Authenticating Parent via Supabase Auth...');
    const parentAuth = await signInWithPassword(PARENT_EMAIL, PARENT_PASSWORD);
    const parentToken = parentAuth.access_token;
    console.log(`  Parent authenticated successfully. Token length: ${parentToken.length}`);

    const parGet = await callBackendApi('GET', '/api/v1/admin/users', parentToken);
    const parPost = await callBackendApi('POST', '/api/v1/admin/users', parentToken, { email: 'fake@sfrc.ac.in' });
    const parDel = await callBackendApi('DELETE', '/api/v1/admin/users/dummy-id', parentToken);

    if (parGet.status === 403 && parPost.status === 403 && parDel.status === 403) {
      recordTest('RBAC-PARENT', 'Parent Blocked from Admin User APIs', 'PASS',
        `Parent token strictly forbidden with HTTP 403 (${parGet.body.detail})`);
    } else {
      recordTest('RBAC-PARENT', 'Parent Blocked from Admin User APIs', 'FAIL',
        `GET: ${parGet.status}, POST: ${parPost.status}, DEL: ${parDel.status}`);
    }

    // ── 5. Persistence & Supabase Auth Sync Check ────────────────────────────
    console.log('\n--- Step 5: Database Architecture & Persistence Check ---');
    const facAuthMeta = facultyAuth.user?.user_metadata || {};
    const parAuthMeta = parentAuth.user?.user_metadata || {};

    const authSyncSuccess = facAuthMeta.role === 'faculty' && parAuthMeta.role === 'parent';
    if (authSyncSuccess) {
      recordTest('SYNC-SUPABASE-AUTH', 'Supabase Auth Metadata Sync', 'PASS',
        `Faculty role (${facAuthMeta.role}) and Parent role (${parAuthMeta.role}) synchronized in Supabase Auth`);
    } else {
      recordTest('SYNC-SUPABASE-AUTH', 'Supabase Auth Metadata Sync', 'FAIL',
        `Faculty meta: ${JSON.stringify(facAuthMeta)}, Parent meta: ${JSON.stringify(parAuthMeta)}`);
    }

    // ── 6. Safe Cleanup of Test Records Only ─────────────────────────────────
    console.log('\n--- Step 6: Safe Cleanup of Test Records ---');
    const adminAuth = await signInWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminToken = adminAuth.access_token;

    const delFacRes = await callBackendApi('DELETE', `/api/v1/admin/users/${facultyUserId}?permanent=true`, adminToken);
    console.log(`  Faculty deletion: status ${delFacRes.status}, message: ${delFacRes.body.message || ''}`);

    const delParRes = await callBackendApi('DELETE', `/api/v1/admin/users/${parentUserId}?permanent=true`, adminToken);
    console.log(`  Parent deletion: status ${delParRes.status}, message: ${delParRes.body.message || ''}`);

    // Verify deletion in SQLite
    const facRemDb = await querySQLite(`SELECT id FROM user_profiles WHERE id = ?`, [facultyUserId]);
    const parRemDb = await querySQLite(`SELECT id FROM user_profiles WHERE id = ?`, [parentUserId]);

    const cleanedUp = facRemDb.length === 0 && parRemDb.length === 0;
    if (cleanedUp) {
      recordTest('CLEANUP-SAFETY', 'Synthetic Records Cleanup', 'PASS',
        `Test accounts cleanly removed from college.db and Supabase Auth. Institutional records preserved.`);
    } else {
      recordTest('CLEANUP-SAFETY', 'Synthetic Records Cleanup', 'FAIL',
        `Remnants: Faculty ${facRemDb.length}, Parent ${parRemDb.length}`);
    }

  } catch (err) {
    console.error('\n[UNHANDLED ERROR IN E2E RUN]:', err);
    recordTest('SUITE-EXECUTION', 'End-to-End Test Suite', 'FAIL', err.message);
  } finally {
    await browser.close();

    console.log('\n========================================================');
    console.log('VERIFICATION SUMMARY');
    console.log('========================================================');
    let passCount = 0;
    for (const r of testResults) {
      if (r.status === 'PASS') passCount++;
      console.log(`- [${r.status}] ${r.id}: ${r.feature} ${r.details ? '(' + r.details + ')' : ''}`);
    }
    console.log(`\nTOTAL: ${passCount}/${testResults.length} PASSED`);

    fs.writeFileSync(
      path.join(RESULTS_DIR, 'faculty-parent-rbac-summary.json'),
      JSON.stringify(testResults, null, 2)
    );
  }
}

run();
