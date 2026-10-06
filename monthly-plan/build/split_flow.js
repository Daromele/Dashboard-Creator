// Budget methods in the browser: off by default in the Monthly Plan (turned on in Settings), on with 50/30/20 in
// the Paycheck Budget Planner; switching methods, zero-based, and moving a line between need and want.
//   node build/split_flow.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const path=require('path');
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'ok  ':'FAIL'} ${name}${cond?'':' '+info}`);if(!cond)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}),errs=[];
 const open=async app=>{const p=await b.newPage({viewport:{width:1300,height:900}});p.on('pageerror',e=>errs.push(app+': '+e.message));await p.clock.setFixedTime(new Date('2026-10-06T12:00:00'));
  const F='file://'+path.resolve(__dirname,`../app/${app}.html`);await p.goto(F);await p.evaluate(()=>localStorage.clear());await p.goto(F);await p.waitForTimeout(400);await p.evaluate(()=>{try{closeWelcome()}catch{};document.querySelector('[data-action="demo"]').click();});await p.waitForTimeout(500);return p;};
 // Monthly Plan: off until turned on
 let p=await open('MonthlyBudgetPlanner');const v=(js,a)=>p.evaluate(js,a);
 ok('Monthly Plan: no method card by default',await v(()=>{go('budget');return !document.querySelector('.sp-card')&&!state.settings.splitMethod;}));
 await v(()=>go('settings'));ok('Settings offers the method, “Off” chosen',await v(()=>document.querySelector('#split-method-select').value===''));
 await p.selectOption('#split-method-select','50-30-20');await p.waitForTimeout(250);
 ok('turned on: the monthly plan shows the 50/30/20 card',await v(()=>{go('budget');const c=document.querySelector('.sp-card');return !!c&&/Your 50\/30\/20 budget/.test(c.innerText)&&c.querySelectorAll('.sp-row').length===3;}));
 const needs=await v(()=>Split.compute(Budget.rows(state,selected).filter(c=>c.type!=='income'&&c.type!=='transfer').map(c=>({amount:c.planned,tag:SplitUI.tagOf('cat:'+c.id,SplitUI.catTag(c))})),Budget.totals(state,selected).income.plan,'50-30-20').rows[0].actual);
 ok('needs = the planned bills and needs',needs>0,needs);
 await v(()=>{document.querySelector('.sp-tags').open=true;});const key=await v(()=>{const s=[...document.querySelectorAll('select[data-split-key]')].find(x=>x.value==='need');return s.dataset.splitKey;});
 await p.selectOption(`select[data-split-key="${key}"]`,'want');await p.waitForTimeout(250);
 ok('moving a line from need to want is remembered',await v(k=>state.splitTags[k]==='want',key));
 await v(()=>document.querySelector('[data-action="split-basis"][data-k="actual"]').click());ok('Planned / So far switch',await v(()=>/so far/i.test(document.querySelector('.sp-card').innerText)));
 await v(()=>document.querySelector('[data-action="split-method"][data-k="70-20-10"]').click());await p.waitForTimeout(200);
 ok('70/20/10: living, savings, debt & giving',await v(()=>state.settings.splitMethod==='70-20-10'&&/Debt & giving/.test(document.querySelector('.sp-card').innerText)));
 await p.close();
 // Paycheck: on by default, with every method
 p=await open('PaycheckBudgetPlanner');const w=(js,a)=>p.evaluate(js,a);
 ok('Paycheck: 50/30/20 on This paycheck by default',await w(()=>{go('dashboard');const c=document.querySelector('.sp-card');return !!c&&/This paycheck, 50\/30\/20/.test(c.innerText)&&state.settings.splitMethod==='50-30-20';}));
 ok('all four methods to pick from',await w(()=>document.querySelectorAll('.sp-card .segment [data-action="split-method"]').length===4));
 await w(()=>document.querySelector('.sp-card [data-action="split-method"][data-k="zero"]').click());await p.waitForTimeout(250);
 ok('zero-based: what is still to assign, the same as left over',await w(()=>{const m=PaycheckUI.model();return /Still to assign/.test(document.querySelector('.sp-card').innerText)&&/This paycheck, zero-based/.test(document.querySelector('.sp-card').innerText)&&m.p.left>0;}));
 await w(()=>document.querySelector('.sp-card [data-action="split-method"][data-k="80-20"]').click());
 ok('80/20',await w(()=>document.querySelectorAll('.sp-card .sp-row').length===2));
 ok('Settings can hide the method in the paycheck planner',await w(()=>{go('settings');return [...document.querySelectorAll('#split-method-select option')].some(o=>o.value==='');}));
 await p.close();
 ok('no page errors',!errs.length,errs.join(' | '));
 await b.close();console.log(fails?`split flow: ${fails} failed`:'split flow: all checks passed');process.exit(fails?1:0);})();
