import {expect,test} from '@playwright/test';

test('iPad rail switches visual tools and dismisses palettes from the canvas',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('navigation',{name:'iPad tools'})).toBeVisible();
  await expect(page.locator('.tools')).toBeHidden();
  await expect(page.getByLabel('Canvas zoom')).toBeVisible();
  await expect(page.getByRole('navigation',{name:'iPad tools'})).toHaveCSS('flex-direction','column');
  await page.getByRole('button',{name:'Panels',exact:true}).click();
  await expect(page.locator('.asset-panel')).toHaveClass(/open/);
  await expect(page.locator('.panel-square')).toBeVisible();
  await expect(page.getByLabel('Close tool options',{exact:true})).toBeHidden();
  await page.locator('.workspace').click({position:{x:700,y:300}});
  await expect(page.locator('.asset-panel')).not.toHaveClass(/open/);
  await page.getByRole('button',{name:'Panels',exact:true}).click();
  await page.getByLabel('Panel corner radius').fill('0');
  await page.getByRole('button',{name:/Square/}).click();
  await expect(page.locator('.asset-panel')).not.toHaveClass(/open/);
  await page.getByRole('button',{name:'Layers',exact:true}).click();
  await expect(page.locator('.inspector')).toHaveClass(/open/);
  await expect(page.getByText('Square Panel')).toBeVisible();
});

test('the empty page pans with one finger and effects show visual previews',async({page})=>{
  await page.goto('/');
  const scrollTop=await page.locator('.workspace').evaluate(node=>{const el=node as HTMLElement,fire=(type:string,y:number)=>el.dispatchEvent(new PointerEvent(type,{pointerId:1,pointerType:'touch',isPrimary:true,clientX:500,clientY:y,buttons:type==='pointerup'?0:1,bubbles:true,cancelable:true}));fire('pointerdown',500);fire('pointermove',180);fire('pointerup',180);return el.scrollTop});
  expect(scrollTop).toBeGreaterThan(250);
  await page.getByRole('button',{name:'Move',exact:true}).click();
  await expect(page.locator('.workspace')).toHaveClass(/panning/);
  await expect(page.locator('.asset-panel')).not.toHaveClass(/open/);
  await page.getByRole('button',{name:'Effects',exact:true}).click();
  await expect(page.locator('.effect-focus')).toBeVisible();
  await expect(page.locator('.effect-speed')).toBeVisible();
  await page.getByRole('button',{name:/Focus lines/}).click();
  await page.getByRole('button',{name:'Layers',exact:true}).click();
  await expect(page.getByText('Focus Lines',{exact:true})).toBeVisible();
});

test('pinch zoom continues into a one-finger page pan',async({page})=>{
  await page.goto('/');
  const panDelta=await page.locator('.workspace').evaluate(node=>{
    const el=node as HTMLElement;
    const fire=(type:string,id:number,x:number,y:number)=>el.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',isPrimary:id===1,clientX:x,clientY:y,buttons:type==='pointerup'?0:1,bubbles:true,cancelable:true}));
    fire('pointerdown',1,400,500);fire('pointerdown',2,500,500);
    fire('pointermove',1,360,500);fire('pointermove',2,540,500);
    fire('pointerup',2,540,500);
    const before=el.scrollTop;
    fire('pointermove',1,360,180);fire('pointerup',1,360,180);
    return el.scrollTop-before;
  });
  expect(panDelta).toBeGreaterThan(250);
  await expect(page.getByLabel('Canvas zoom').locator('output')).not.toHaveText('100%');
});
