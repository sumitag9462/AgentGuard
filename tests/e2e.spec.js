
const { test, expect } = require('@playwright/test');

test.describe('AgentGuard Full User Journey', () => {
  test.setTimeout(60000);
  
  test('Complete journey from dashboard to evaluation and traces', async ({ page }) => {
    // 1. Open AgentGuard Dashboard
    await page.goto('http://localhost:5173/');
    await expect(page).toHaveTitle('AgentGuard');
    
    // 2. Agents Page
    await page.click('a[href="/agents"]');
    await expect(page.locator('h1:has-text("Target Agents")')).toBeVisible();
    await expect(page.locator('text=Banking Support Agent')).toBeVisible();

    // 3. Evaluations Page & Start Evaluation
    await page.click('a[href="/evaluations"]');
    await expect(page.locator('h1:has-text("Evaluations")')).toBeVisible();
    
    // Check old runs load
    await expect(page.locator('tbody tr')).not.toHaveCount(0);
    
    // Trigger new evaluation
    await page.click('button:has-text("New Run")');

    // Wait for navigation to details page
    await expect(page.locator('h1:has-text("Evaluation RUN-")')).toBeVisible({ timeout: 20000 });

    // Check status becomes COMPLETED
    await expect(page.locator('.badge:has-text("COMPLETED")')).toBeVisible({ timeout: 45000 });
    
    // 6. Scenarios Page
    await page.click('a[href="/scenarios"]');
    await expect(page.locator('h1:has-text("Evaluation Scenarios")')).toBeVisible();

    // 7. Compare Page
    await page.click('a[href="/compare"]');
    await expect(page.locator('h1:has-text("Regression & Differential")')).toBeVisible();
  });
});
