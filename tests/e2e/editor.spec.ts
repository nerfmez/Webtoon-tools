import {expect,test} from '@playwright/test';

test('iPad dock exposes add tools without covering the canvas',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('navigation',{name:'iPad tools'})).toBeVisible();
  await expect(page.locator('.tools')).toBeHidden();
  await expect(page.getByLabel('Canvas zoom')).toBeVisible();
  await page.getByRole('button',{name:'Add',exact:true}).click();
  await expect(page.getByLabel('Add to canvas')).toHaveClass(/open/);
  await page.getByRole('button',{name:'Panel'}).click();
  await expect(page.getByLabel('Tool options')).toHaveClass(/open/);
  await page.getByLabel('Panel corner radius').fill('0');
  await page.getByRole('button',{name:'Square',exact:true}).click();
  await page.getByRole('button',{name:'Layers',exact:true}).click();
  await expect(page.getByLabel('Close properties')).toBeVisible();
  await expect(page.getByText('Square Panel')).toBeVisible();
});

test('move mode supports touch navigation without opening a drawer',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Move',exact:true}).click();
  await expect(page.locator('.workspace')).toHaveClass(/panning/);
  await expect(page.getByLabel('Tool options')).not.toHaveClass(/open/);
});
