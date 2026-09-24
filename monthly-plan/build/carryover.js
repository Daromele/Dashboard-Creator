const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules']}));
const path=require('path'),fs=require('fs');
(async()=>{
 const b=await chromium.launch(); const out={};
 const c=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+path.resolve('MonthlyPlanDemo.html')); await p.waitForTimeout(900);
 const x=p.locator('[data-action="welcome-close"]'); if(await x.isVisible().catch(()=>0)) await x.click();
 // set up real work in the demo: a renamed category, a plan, a goal and some entries
 await p.evaluate(()=>{
  state.settings.name='Demo Visitor'; state.settings.theme='night';
  state.categories.push({id:'petcare',name:'Pet care',group:'variable',archived:false});
  const m=Budget.today().slice(0,7);
  state.months[m]={plan:{petcare:{amount:8500,day:1},groceries:{amount:40000,day:1}},opening:12345,note:'set up in the demo',closed:false};
  state.goals.push({id:'g1',name:'New laptop',kind:'saving',category:'emergency',target:120000,opening:25000,start:Budget.today().slice(0,8)+'01',due:(+Budget.today().slice(0,4)+1)+'-12-31'});
  state.transactions.push({id:Budget.uid(),date:Budget.today(),category:'petcare',amount:2500,note:'vet'});
  save(); render();
 });
 await p.waitForTimeout(500);
 out.demoState=await p.evaluate(()=>({cats:state.categories.length,goals:state.goals.length,tx:state.transactions.length,name:state.settings.name}));
 await p.evaluate(()=>go('settings')); await p.waitForTimeout(400);
 const [dl]=await Promise.all([p.waitForEvent('download'),
   p.evaluate(()=>document.querySelector('[data-action="backup"]').click())]);
 const file=path.resolve('demo-backup.json'); await dl.saveAs(file);
 out.backupFile=dl.suggestedFilename();
 const raw=JSON.parse(fs.readFileSync(file,'utf8'));
 out.backupHasWork=!!(raw.categories||raw.state?.categories);

 // now load that backup into the FULL planner, in a separate browser profile
 const c2=await b.newContext({viewport:{width:1440,height:1000}});
 const q=await c2.newPage(); const errs2=[]; q.on('pageerror',e=>errs2.push(e.message));
 await q.goto('file://'+path.resolve('MonthlyBudgetPlanner.html')); await q.waitForTimeout(900);
 const y=q.locator('[data-action="welcome-close"]'); if(await y.isVisible().catch(()=>0)) await y.click();
 q.on('dialog',d=>d.accept());
 await q.evaluate(()=>go('settings')); await q.waitForTimeout(400);
 const [fc]=await Promise.all([q.waitForEvent('filechooser'),
   q.evaluate(()=>document.querySelector('[data-action="restore"]').click())]);
 await fc.setFiles(file); await q.waitForTimeout(900);
 out.reviewDialog=(await q.locator('#modal-title').innerText().catch(()=>'')).trim();
 out.toast=(await q.locator('#toast').innerText().catch(()=>'')).trim();
 if(await q.locator('[data-action="confirm-restore"]').count()){
   await q.locator('[data-action="confirm-restore"]').click(); await q.waitForTimeout(1200);}
 out.fullState=await q.evaluate(()=>({cats:state.categories.length,goals:state.goals.length,tx:state.transactions.length,name:state.settings.name,
   petcare:!!state.categories.find(c=>c.id==='petcare'),plan:Object.values(state.months).some(m=>m.plan&&m.plan.petcare&&m.plan.petcare.amount===8500)}));
 out.fullIsUncapped=await q.evaluate(()=>typeof DEMO_MAX==='undefined'&&MAX_TRANSACTIONS===20000);
 out.carriedOver=JSON.stringify(out.demoState)===JSON.stringify(out.fullState&&{cats:out.fullState.cats,goals:out.fullState.goals,tx:out.fullState.tx,name:out.fullState.name});
 out.errors=[...errs,...errs2];
 console.log(JSON.stringify(out,null,1));
 await b.close();
})();
