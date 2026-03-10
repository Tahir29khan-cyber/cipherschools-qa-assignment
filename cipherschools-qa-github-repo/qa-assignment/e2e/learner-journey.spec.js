// Tool: Playwright (Node.js)
// Framework: @playwright/test
// Flow: Learner journey — Register → Login → Search → Add to Cart → Assert basket count

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'config/.env') });

const BASE_URL = process.env.BASE_URL || 'https://with-bugs.practicesoftwaretesting.com';

// Generate a unique test user for each run
function generateUser() {
  const ts = Date.now();
  return {
    firstName: 'Learner',
    lastName: 'Test',
    dob: '1995-06-15',
    address: '123 Test Street',
    city: 'Delhi',
    state: 'Delhi',
    country: 'IN',
    postcode: '110001',
    phone: '9876543210',
    email: `learner.test.${ts}@mailtest.com`,
    password: 'SecurePass@123',
  };
}

test.describe('CipherSchools QA — Learner Journey E2E', () => {
  const user = generateUser();

  // ─── STEP 1: Register a new user ────────────────────────────────────────────
  test('Step 1 — Register a new user account', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/register`);
    await expect(page).toHaveURL(/register/);

    // Fill registration form
    await page.getByLabel('First name').fill(user.firstName);
    await page.getByLabel('Last name').fill(user.lastName);
    await page.getByLabel('Date of Birth').fill(user.dob);
    await page.getByLabel('Address').fill(user.address);
    await page.getByLabel('City').fill(user.city);
    await page.getByLabel('State').fill(user.state);
    await page.getByLabel('Country').selectOption(user.country);
    await page.getByLabel('Postcode').fill(user.postcode);
    await page.getByLabel('Phone').fill(user.phone);
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);

    await page.getByRole('button', { name: /register/i }).click();

    // Assert registration success — redirected away from register page
    await expect(page).not.toHaveURL(/register/);
    console.log(`✅ Registered: ${user.email}`);
  });

  // ─── STEP 2: Log in with new credentials ────────────────────────────────────
  test('Step 2 — Login with newly registered credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: /login/i }).click();

    // Assert: no longer on login page (successful login)
    await expect(page).not.toHaveURL(/login/);
    // Assert: user menu or account link visible
    await expect(page.locator('[data-test="nav-menu"]').or(page.locator('[aria-label="User menu"]'))).toBeVisible({ timeout: 8000 });
    console.log('✅ Login successful');
  });

  // ─── STEP 3: Search for a course/product ────────────────────────────────────
  test('Step 3 — Search for a product and open detail page', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: /login/i }).click();
    await page.waitForURL(url => !url.href.includes('/login'));

    // Search
    await page.goto(`${BASE_URL}`);
    const searchInput = page.getByPlaceholder(/search/i).or(page.locator('[data-test="search-query"]'));
    await searchInput.waitFor({ state: 'visible', timeout: 8000 });
    await searchInput.fill('Pliers');
    await page.keyboard.press('Enter');

    // Wait for results
    await page.waitForURL(/search|query/i, { timeout: 10000 });

    // Click first result
    const firstProduct = page.locator('[data-test="product-name"]').first()
      .or(page.locator('.card-title').first())
      .or(page.locator('a[href*="/product"]').first());
    await firstProduct.waitFor({ state: 'visible', timeout: 10000 });
    await firstProduct.click();

    // Assert detail page
    await expect(page.locator('[data-test="product-name"]').or(page.locator('h1')).first()).toBeVisible({ timeout: 8000 });
    console.log('✅ Product detail page opened');
  });

  // ─── STEP 4 & 5: Add to cart and assert basket count ───────────────────────
  test('Step 4 — Add product to cart and assert basket increments', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/auth/login`);
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: /login/i }).click();
    await page.waitForURL(url => !url.href.includes('/login'));

    // Search and open product
    await page.goto(`${BASE_URL}`);
    const searchInput = page.getByPlaceholder(/search/i).or(page.locator('[data-test="search-query"]'));
    await searchInput.waitFor({ state: 'visible', timeout: 8000 });
    await searchInput.fill('Pliers');
    await page.keyboard.press('Enter');
    await page.waitForURL(/search|query/i, { timeout: 10000 });

    const firstProduct = page.locator('[data-test="product-name"]').first()
      .or(page.locator('a[href*="/product"]').first());
    await firstProduct.waitFor({ state: 'visible', timeout: 10000 });
    await firstProduct.click();

    // Read current cart count BEFORE adding
    const cartBadge = page.locator('[data-test="cart-quantity"]')
      .or(page.locator('.cart-quantity'))
      .or(page.locator('[aria-label*="cart"]'));
    
    let countBefore = 0;
    try {
      const text = await cartBadge.first().textContent({ timeout: 3000 });
      countBefore = parseInt(text?.trim() || '0', 10) || 0;
    } catch { countBefore = 0; }

    // Add to cart
    const addToCartBtn = page.getByRole('button', { name: /add to cart/i })
      .or(page.locator('[data-test="add-to-cart"]'));
    await addToCartBtn.waitFor({ state: 'visible', timeout: 8000 });
    await addToCartBtn.click();

    // ─── CRITICAL ASSERTION — This will FAIL if enrollment flow is broken ────
    await page.waitForTimeout(1500); // brief wait for badge update
    const cartBadgeAfter = page.locator('[data-test="cart-quantity"]')
      .or(page.locator('.cart-quantity'))
      .or(page.locator('[aria-label*="cart"]'));

    let countAfter = 0;
    try {
      const text = await cartBadgeAfter.first().textContent({ timeout: 5000 });
      countAfter = parseInt(text?.trim() || '0', 10) || 0;
    } catch { countAfter = 0; }

    expect(countAfter).toBeGreaterThan(countBefore);
    console.log(`✅ Cart count incremented: ${countBefore} → ${countAfter}`);
  });
});
