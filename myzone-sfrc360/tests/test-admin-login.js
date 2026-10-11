const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to http://localhost:3000/login?role=admin');
  await page.goto('http://localhost:3000/login?role=admin', { waitUntil: 'networkidle' });

  await page.waitForTimeout(2000);

  const clientInit = await page.evaluate(() => window.__client_init);
  console.log('window.__client_init:', clientInit);

  await page.fill('#login-identifier', 'sfrc.admin@gmail.com');
  await page.fill('#login-password', 'Password@123');

  console.log('Clicking submit...');
  await page.click('#login-submit');

  await page.waitForTimeout(4000);

  console.log('Final URL:', page.url());

  await browser.close();
})();
