import {expect,test} from '@playwright/test';

test('iPad rail switches visual tools and dismisses palettes from the canvas',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('navigation',{name:'iPad tools'})).toBeVisible();
  await expect(page.locator('.tools')).toBeHidden();
  await expect(page.getByLabel('Canvas zoom')).toBeVisible();
  await expect(page.getByRole('navigation',{name:'iPad tools'})).toHaveCSS('flex-direction','column');
  await page.getByRole('button',{name:'Panels',exact:true}).click();
  await expect(page.getByLabel('Tool options')).toHaveClass(/open/);
  await expect(page.locator('.panel-square')).toBeVisible();
  await expect(page.getByLabel('Close tool options')).toBeHidden();
  await page.locator('.workspace').click({position:{x:700,y:300}});
  await expect(page.getByLabel('Tool options')).not.toHaveClass(/open/);
  await page.getByRole('button',{name:'Panels',exact:true}).click();
  await page.getByLabel('Panel corner radius').fill('0');
  await page.getByRole('button',{name:/Square/}).click();
  await expect(page.getByLabel('Tool options')).not.toHaveClass(/open/);
  await page.getByRole('button',{name:'Layers',exact:true}).click();
  await expect(page.locator('.inspector')).toHaveClass(/open/);
  await expect(page.getByText('Square Panel')).toBeVisible();
});

test('the empty page pans with one finger and effects show visual previews',async({page})=>{
  await page.goto('/');
  const scrollTop=await page.locator('.workspace').evaluate(node=>{const el=node as HTMLElement,point=(y:number)=>new Touch({identifier:1,target:el,clientX:500,clientY:y});el.dispatchEvent(new TouchEvent('touchstart',{touches:[point(500)],bubbles:true,cancelable:true}));el.dispatchEvent(new TouchEvent('touchmove',{touches:[point(180)],bubbles:true,cancelable:true}));el.dispatchEvent(new TouchEvent('touchend',{touches:[],bubbles:true,cancelable:true}));return el.scrollTop});
  expect(scrollTop).toBeGreaterThan(250);
  await page.getByRole('button',{name:'Move',exact:true}).click();
  await expect(page.locator('.workspace')).toHaveClass(/panning/);
  await expect(page.getByLabel('Tool options')).not.toHaveClass(/open/);
  await page.getByRole('button',{name:'Effects',exact:true}).click();
  await expect(page.locator('.effect-focus')).toBeVisible();
  await expect(page.locator('.effect-speed')).toBeVisible();
  await page.getByRole('button',{name:/Focus lines/}).click();
  await page.getByRole('button',{name:'Layers',exact:true}).click();
  await expect(page.getByText('Focus Lines')).toBeVisible();
});

test('pinch zoom continues into a one-finger page pan',async({page})=>{
  await page.goto('/');
  const panDelta=await page.locator('.workspace').evaluate(node=>{
    const el=node as HTMLElement;
    const touch=(id:number,x:number,y:number)=>new Touch({identifier:id,target:el,clientX:x,clientY:y});
    const fire=(type:string,touches:Touch[])=>el.dispatchEvent(new TouchEvent(type,{touches,bubbles:true,cancelable:true}));
    fire('touchstart',[touch(1,400,500),touch(2,500,500)]);
    fire('touchmove',[touch(1,360,500),touch(2,540,500)]);
    const remaining=touch(1,360,500);
    fire('touchend',[remaining]);
    const before=el.scrollTop;
    fire('touchmove',[touch(1,360,180)]);
    fire('touchend',[]);
    return el.scrollTop-before;
  });
  expect(panDelta).toBeGreaterThan(250);
  await expect(page.getByLabel('Canvas zoom').locator('output')).not.toHaveText('100%');
});
