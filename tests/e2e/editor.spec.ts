import {expect,test} from '@playwright/test';

test('tablet drawers expose placement options without immediately adding objects',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Panel'}).click();
  await expect(page.getByLabel('Tool options')).toHaveClass(/open/);
  await expect(page.getByText('0 objects')).toBeVisible();
  await page.getByLabel('Panel corner radius').fill('0');
  await page.getByRole('button',{name:'Square',exact:true}).click();
  await expect(page.getByText('1 objects')).toBeVisible();
  await page.getByRole('button',{name:'Layers & properties'}).click();
  await expect(page.getByLabel('Close properties')).toBeVisible();
});

test('hand mode supports touch navigation',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Hand'}).click();
  await expect(page.locator('.workspace')).toHaveClass(/panning/);
});
