import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('');
  await page.evaluate(() => indexedDB.deleteDatabase('webtoon-studio'));
});

test('tool categories require explicit placement and panel radius remains editable', async ({ page }) => {
  await page.getByTestId('tool-panel').click();
  await expect(page.getByText('0 objects')).toBeVisible();
  await page.getByTestId('option-panel-rectangle').click();
  await expect(page.getByText('Tap canvas to place panel')).toBeVisible();
  await page.locator('.upper-canvas').click({ position: { x: 420, y: 180 } });
  await expect(page.getByText('1 objects')).toBeVisible();
  await page.getByRole('button', { name: 'Properties' }).click();
  const radius = page.getByLabel('Corner radius');
  await expect(radius).toHaveValue('0');
  await radius.fill('30');
  await expect(radius).toHaveValue('30');
  await radius.fill('0');
  await expect(radius).toHaveValue('0');
});

test('effects require explicit placement and regenerate from properties', async ({ page }) => {
  await page.getByTestId('tool-effects').click();
  await expect(page.getByText('0 objects')).toBeVisible();
  await page.getByTestId('option-effect-focus').click();
  await page.locator('.upper-canvas').click({ position: { x: 450, y: 220 } });
  await expect(page.getByText('1 objects')).toBeVisible();
  await page.getByRole('button', { name: 'Properties' }).click();
  const count = page.getByLabel('Line count');
  await expect(count).toHaveValue('28');
  await count.fill('40');
  await expect(count).toHaveValue('40');
});

test('tablet drawers remain reachable and workspace scrolls', async ({ page }) => {
  const options = page.getByTestId('tool-options');
  await expect(options).toBeVisible();
  await options.locator('.drawer-close').click();
  await expect(options).not.toBeInViewport();
  await page.getByTitle('Toggle tool options').click();
  await expect(options).toBeInViewport();
  const workspace = page.getByTestId('workspace');
  const before = await workspace.evaluate(element => element.scrollTop);
  await workspace.evaluate(element => { element.scrollTop = 500; });
  await expect.poll(() => workspace.evaluate(element => element.scrollTop)).toBeGreaterThan(before);
});
