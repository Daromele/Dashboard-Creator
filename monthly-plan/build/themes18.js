const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules']}));
const path=require('path');
(async()=>{const b=await chromium.launch();
 // full-window hero
 {const p=await (await b.newContext({viewport:{width:1500,height:1125},deviceScaleFactor:2})).newPage();
  await p.goto('file://'+path.resolve('v18.html'));await p.waitForTimeout(900);
  const x=p.locator('[data-action="welcome-close"]');if(await x.isVisible().catch(()=>0))await x.click();
  await p.locator('#demo-toggle').click();await p.waitForTimeout(900);
  await p.screenshot({path:'deck18/shot-hero.png'});await p.context().close();}
 for(const t of ['lavender','sage','linen','fjord','blush','slate','night','midnight']){
  const p=await (await b.newContext({viewport:{width:1360,height:958},deviceScaleFactor:2})).newPage();
  await p.goto('file://'+path.resolve('v18.html'));await p.waitForTimeout(900);
  const x=p.locator('[data-action="welcome-close"]');if(await x.isVisible().catch(()=>0))await x.click();
  await p.locator('#demo-toggle').click();await p.waitForTimeout(800);
  await p.evaluate(t=>{state.settings.theme=t;render();},t);await p.waitForTimeout(500);
  await p.screenshot({path:'deck18/theme-'+t+'.png'});await p.context().close();}
 await b.close();console.log('themes done');})();
