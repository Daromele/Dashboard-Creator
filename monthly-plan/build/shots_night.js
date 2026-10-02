const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules']}));
const path=require('path'),fs=require('fs');
const APP='file://'+path.resolve('MonthlyBudgetPlanner.html');
const RATIO=1.6;                      // wide-and-short: the slide gives width, not height
(async()=>{
 const b=await chromium.launch();
 const c=await b.newContext({viewport:{width:1600,height:1400},deviceScaleFactor:2});
 const p=await c.newPage();
 await p.goto(APP);await p.waitForTimeout(900);
 const x=p.locator('[data-action="welcome-close"]');if(await x.isVisible().catch(()=>0))await x.click();
 await p.locator('#demo-toggle').click();await p.waitForTimeout(900);
 // every optional view switched on so each tab has a slide
 await p.evaluate(()=>{state.settings.hiddenNav=[];state.settings.theme='night';render();});await p.waitForTimeout(400);

 const grab=async(name,{scrollTo,ratio=RATIO,offset=0}={})=>{
   await p.evaluate(()=>{const t=document.querySelector('#toast');if(t)t.hidden=true;});
   let box;
   if(scrollTo){const el=p.locator(scrollTo).first();
     await el.scrollIntoViewIfNeeded();await p.waitForTimeout(600);
     box=await el.boundingBox();}
   else box=await p.locator('#content').boundingBox();
   const w=Math.min(box.width-(scrollTo?0:36),1560);
   // a scrolled element can sit partly above the viewport, so clamp the origin
   const y=Math.max(0,box.y+offset);
   const clip={x:Math.max(0,box.x+(scrollTo?0:18)),y,width:w,height:Math.min(w/ratio,1400-y-4)};
   await p.screenshot({path:'decknight/tab-'+name+'.png',clip});
   console.log(name,(clip.width/clip.height).toFixed(2));
 };
 const go=async(v)=>{await p.locator(`button.navlink[data-go="${v}"]`).first().click();await p.waitForTimeout(850);};

 await go('dashboard'); await grab('dashboard',{offset:6});
 await go('annual');    await grab('annual',{offset:6});
 await go('annual');    await grab('heat',{scrollTo:'.annual-category-matrix'});
 await go('budget');    await grab('budget',{offset:6});
 await go('activity');  await grab('activity',{offset:6});
 await go('goals');     await grab('goals',{offset:6});
 await go('scheduled'); await grab('scheduled',{offset:6});
 await go('calendar');  await grab('calendar',{offset:6});
 await go('wealth');    await grab('wealth',{offset:6});
 await go('insights');  await grab('insights',{offset:6});
 await go('review');    await grab('review',{offset:6});
 await go('settings');  await grab('settings',{offset:6});
 await go('guide');     await grab('guide',{offset:6});

 // CSV import mid-review
 await go('activity');
 await p.locator('button[data-action="import"]').first().click();await p.waitForTimeout(600);
 await p.locator('.map-details summary').first().click().catch(()=>{});
 await p.fill('#csv-paste',fs.readFileSync('chase.csv','utf8'));
 await p.locator('#csv-paste-form button[type=submit]').click();await p.waitForTimeout(900);
 await p.locator('button[data-action="csv-preview"]').click().catch(()=>{});await p.waitForTimeout(1100);
 await grab('import',{offset:6});
 await b.close();console.log('done');
})();
