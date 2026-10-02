const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules']}));
const path=require('path');
(async()=>{
 const b=await chromium.launch();
 const c=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 const p=await c.newPage(); const errs=[];
 p.on('pageerror',e=>errs.push('pageerror: '+e.message));
 p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text());});
 await p.goto('file://'+path.resolve('MonthlyPlanDemo.html')); await p.waitForTimeout(900);
 const x=p.locator('[data-action="welcome-close"]'); if(await x.isVisible().catch(()=>0)) await x.click();
 const out={};
 out.barStart=(await p.locator('#demo-bar').innerText()).replace(/\s+/g,' ').trim();
 out.importHiddenFromNav=await p.locator('button.navlink[data-go="import"]').count()===0;

 // log entries through the real quick-log form until the cap bites
 const log=async i=>{
  await p.locator('[data-action="quick-log"]').first().click(); await p.waitForTimeout(220);
  await p.fill('#quick-entry','coffee '+(3+i%5)+'.50');
  const sel=p.locator('#quick-log-form select[name="category"]');
  if(await sel.count()) await sel.selectOption({index:1}).catch(()=>{});
  await p.locator('#quick-log-form button[type=submit]').click(); await p.waitForTimeout(260);
  const err=p.locator('#form-error');
  const msg=await err.isVisible().catch(()=>0)?(await err.innerText()).trim():'';
  if(msg) await p.locator('[data-action="dismiss"]').first().click().catch(()=>{});
  return msg;
 };
 let blockedAt=null,blockMsg='';
 for(let i=0;i<24;i++){const m=await log(i); if(m){blockedAt=i;blockMsg=m;break;}}
 out.blockedAfterEntries=blockedAt;
 out.blockMessage=blockMsg.slice(0,120);
 out.txStored=await p.evaluate(()=>state.transactions.length);
 out.barFull=(await p.locator('#demo-bar').innerText()).replace(/\s+/g,' ').trim();

 // locked features raise the upsell, not the feature
 let printed=false; await p.exposeFunction('__printed',()=>printed=true).catch(()=>{});
 await p.evaluate(()=>{window.print=()=>window.__printed&&window.__printed();});
 await p.locator('[data-action="print"]').first().click({force:true}).catch(async()=>{
   await p.evaluate(()=>document.querySelector('[data-action="print"]')?.click());});
 await p.waitForTimeout(400);
 out.printShowsUpsell=(await p.locator('#modal-title').innerText().catch(()=>'')).includes('full planner');
 out.printDidNotPrint=!printed;
 await p.locator('[data-action="dismiss"]').first().click().catch(()=>{});

 await p.evaluate(()=>go('settings')); await p.waitForTimeout(500);
 await p.evaluate(()=>document.querySelector('[data-action="import"]')?.click()); await p.waitForTimeout(400);
 out.importShowsUpsell=(await p.locator('#modal-title').innerText().catch(()=>'')).includes('full planner');
 await p.locator('[data-action="dismiss"]').first().click().catch(()=>{});
 await p.evaluate(()=>go('settings')); await p.waitForTimeout(400);
 out.folderBackupLocked=(await p.locator('.backup-block').innerText()).includes('Full planner');
 out.buyLinks=await p.locator('a.btn[href*="jpsdigitalpages"]').count();

 // the backup download still works — this is how work carries into the paid app
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:9000}).catch(()=>null),
   p.evaluate(()=>document.querySelector('[data-action="backup"]')?.click())]);
 out.backupDownloads=!!dl && /\.json$/.test(dl.suggestedFilename()||'');

 // sample mode is exempt from the cap
 await p.evaluate(()=>document.querySelector('#demo-toggle')?.click()); await p.waitForTimeout(1200);
 out.sampleTx=await p.evaluate(()=>state.transactions.length);
 out.sampleBar=(await p.locator('#demo-bar').innerText()).replace(/\s+/g,' ').trim().slice(0,70);
 const m=await log(0); out.sampleCanStillLog=!m;

 out.errors=errs;
 console.log(JSON.stringify(out,null,1));
 await b.close();
})();
