const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules']}));
const path=require('path');
const seed=`(()=>{
 state.settings.name='Alex';state.settings.currency='GBP';state.settings.theme='fjord';
 state.categories.push({id:'petcare',name:'Pet care',group:'variable',archived:false});
 const m=Budget.today().slice(0,7);
 state.months[m]={plan:{petcare:{amount:8500,day:1}},opening:12345,note:'a note',closed:false};
 state.goals.push({id:'g1',name:'Laptop',kind:'saving',category:'emergency',target:120000,opening:25000,start:Budget.today().slice(0,8)+'01',due:(+Budget.today().slice(0,4)+1)+'-12-31'});
 state.schedules.push({id:'s1',name:'Rent',category:'housing',amount:120000,frequency:'monthly',start:Budget.today().slice(0,8)+'01',end:(+Budget.today().slice(0,4)+2)+'-12-31'});
 for(let i=0;i<6;i++)state.transactions.push({id:Budget.uid(),date:Budget.today(),category:'petcare',amount:1000+i,note:'x'+i});
 state.reviews[Budget.today()]={note:'weekly'};
 save();render();
})()`;
const snap=p=>p.evaluate(()=>({tx:state.transactions.length,cats:state.categories.length,goals:state.goals.length,
 sched:state.schedules.length,months:Object.keys(state.months).length,reviews:Object.keys(state.reviews).length,
 name:state.settings.name,currency:state.settings.currency,theme:state.settings.theme,
 plan:Object.values(state.months)[0]?.plan?.petcare?.amount||0}));
(async()=>{
 const b=await chromium.launch(); const out={};
 const run=async(mode)=>{
  const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('file://'+path.resolve('MonthlyBudgetPlanner.html')); await p.waitForTimeout(900);
  const x=p.locator('[data-action="welcome-close"]'); if(await x.isVisible().catch(()=>0)) await x.click();
  await p.evaluate(seed); await p.waitForTimeout(600);
  const before=await snap(p);
  await p.evaluate(()=>go('settings')); await p.waitForTimeout(500);
  await p.locator('[data-action="start-fresh"]').click(); await p.waitForTimeout(400);
  const note1=(await p.locator('#fresh-note').innerText()).slice(0,40);
  await p.selectOption('#fresh-mode',mode); await p.waitForTimeout(250);
  const note2=(await p.locator('#fresh-note').innerText()).slice(0,40);
  await p.locator('[data-action="confirm-fresh"]').click(); await p.waitForTimeout(800);
  const after=await snap(p);
  // undo puts it back
  const undo=p.locator('[data-action="undo"]');
  const undoVisible=await undo.isVisible().catch(()=>false);
  if(undoVisible){await undo.click();await p.waitForTimeout(600);}
  const undone=await snap(p);
  // and the app still works: log a transaction after the reset
  await p.reload(); await p.waitForTimeout(900);
  const y=p.locator('[data-action="welcome-close"]'); if(await y.isVisible().catch(()=>0)) await y.click();
  const persisted=await snap(p);
  out[mode]={before,after,noteChanged:note1!==note2,undoVisible,undone:JSON.stringify(undone)===JSON.stringify(before),
    persistedAfterUndo:persisted.tx===before.tx,persisted,errors:errs};
  await p.context().close();
 };
 await run('all'); await run('entries');
 console.log(JSON.stringify(out,null,1));
 await b.close();
})();
