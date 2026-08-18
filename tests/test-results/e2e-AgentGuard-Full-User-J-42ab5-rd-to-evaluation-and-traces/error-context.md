# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.spec.js >> AgentGuard Full User Journey >> Complete journey from dashboard to evaluation and traces
- Location: e2e.spec.js:7:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.badge:has-text("COMPLETED")')
Expected: visible
Timeout: 45000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 45000ms
  - waiting for locator('.badge:has-text("COMPLETED")')

```

```yaml
- complementary:
  - img
  - text: AgentGuard Platform
  - link "Dashboard":
    - /url: /
    - img
    - text: Dashboard
  - link "Agents":
    - /url: /agents
    - img
    - text: Agents
  - link "Evaluations":
    - /url: /evaluations
    - img
    - text: Evaluations
  - link "Scenarios":
    - /url: /scenarios
    - img
    - text: Scenarios
  - link "Regression":
    - /url: /compare
    - img
    - text: Regression
  - text: SA System Admin Local Dev
- main: Evaluation not found.
```

# Test source

```ts
  1  | 
  2  | const { test, expect } = require('@playwright/test');
  3  | 
  4  | test.describe('AgentGuard Full User Journey', () => {
  5  |   test.setTimeout(60000);
  6  |   
  7  |   test('Complete journey from dashboard to evaluation and traces', async ({ page }) => {
  8  |     // 1. Open AgentGuard Dashboard
  9  |     await page.goto('http://localhost:5173/');
  10 |     await expect(page).toHaveTitle('AgentGuard');
  11 |     
  12 |     // 2. Agents Page
  13 |     await page.click('a[href="/agents"]');
  14 |     await expect(page.locator('h1:has-text("Target Agents")')).toBeVisible();
  15 |     await expect(page.locator('text=Banking Support Agent')).toBeVisible();
  16 | 
  17 |     // 3. Evaluations Page & Start Evaluation
  18 |     await page.click('a[href="/evaluations"]');
  19 |     await expect(page.locator('h1:has-text("Evaluations")')).toBeVisible();
  20 |     
  21 |     // Check old runs load
  22 |     await expect(page.locator('tbody tr')).not.toHaveCount(0);
  23 |     
  24 |     // Trigger new evaluation
  25 |     await page.click('button:has-text("New Run")');
  26 | 
  27 |     // Wait for navigation to details page
  28 |     await expect(page.locator('h1:has-text("Evaluation RUN-")')).toBeVisible({ timeout: 20000 });
  29 | 
  30 |     // Check status becomes COMPLETED
> 31 |     await expect(page.locator('.badge:has-text("COMPLETED")')).toBeVisible({ timeout: 45000 });
     |                                                                ^ Error: expect(locator).toBeVisible() failed
  32 |     
  33 |     // 6. Scenarios Page
  34 |     await page.click('a[href="/scenarios"]');
  35 |     await expect(page.locator('h1:has-text("Evaluation Scenarios")')).toBeVisible();
  36 | 
  37 |     // 7. Compare Page
  38 |     await page.click('a[href="/compare"]');
  39 |     await expect(page.locator('h1:has-text("Regression & Differential")')).toBeVisible();
  40 |   });
  41 | });
  42 | 
```