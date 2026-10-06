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
 ok('turned on: the monthly plan shows the 50/30/20 card',await v(()=>{go('budget');const c=document.querySelector('.sp-card');return !!c&&/Your 50\/30\/20 budget/.test(c.innerText)&&c.querySelectorAll('.sp-bucket').length===3;}));
 const needs=await v(()=>Split.compute(Budget.rows(state,selected).filter(c=>c.type!=='income'&&c.type!=='transfer').map(c=>({amount:c.planned,tag:SplitUI.tagOf('cat:'+c.id,SplitUI.catTag(c))})),Budget.totals(state,selected).income.plan,'50-30-20').rows[0].actual);
 ok('needs = the planned bills and needs',needs>0,needs);
 await v(()=>{document.querySelector('.sp-tags').open=true;});const key=await v(()=>document.querySelector('[data-action="split-tag"][data-v="need"][aria-checked="true"]').dataset.key);
 await p.click(`[data-action="split-tag"][data-key="${key}"][data-v="want"]`);await p.waitForTimeout(250);
 ok('moving a line from need to want is remembered',await v(k=>state.splitTags[k]==='want',key));
 await v(()=>document.querySelector('[data-action="split-basis"][data-k="actual"]').click());ok('Planned / So far switch',await v(()=>/so far/i.test(document.querySelector('.sp-card').innerText)));
 await v(()=>document.querySelector('.sp-card [data-action="split-method"][data-k="70-20-10"]').click());await p.waitForTimeout(200);
 ok('70/20/10: living, savings, debt & giving',await v(()=>state.settings.splitMethod==='70-20-10'&&/Debt & giving/.test(document.querySelector('.sp-card').innerText)));
 await p.close();
 // Paycheck: on by default; pick a method, type amounts, watch each group fit its share
 p=await open('PaycheckBudgetPlanner');const w=(js,a)=>p.evaluate(js,a);
 ok('Paycheck: Plan this paycheck, 50/30/20 by default',await w(()=>{go('dashboard');const c=document.querySelector('.sp-card');return !!c&&/Plan this paycheck/.test(c.innerText)&&state.settings.splitMethod==='50-30-20'&&c.querySelectorAll('.sp-bucket').length===3;}));
 ok('five methods as labeled pills, custom included',await w(()=>document.querySelectorAll('.sp-card [data-action="split-method"]').length===5));
 ok('one left-to-assign number on top',await w(()=>/left to assign/.test(document.querySelector('[data-sp-banner]').innerText)));
 const fun=await w(()=>state.ppEnv.find(e=>/fun/i.test(e.name)).id);
 await p.locator(`.sp-amt[data-k="env:${fun}"]`).fill('800');
 ok('typing an amount turns Wants red at once, before saving',await w(f=>{const b=document.querySelector('.sp-bucket[data-b="want"]');return b.classList.contains('is-over')&&/over/.test(b.querySelector('[data-sp-st]').innerText)&&state.ppEnv.find(e=>e.id===f).amount===4000;},fun));
 await p.keyboard.press('Tab');await p.waitForTimeout(150);
 ok('tabbing inside the card keeps what you typed, unsaved',await w(f=>document.querySelector(`.sp-amt[data-k="env:${f}"]`).value==='800'&&state.ppEnv.find(e=>e.id===f).amount===4000,fun));
 await p.click('h1');await p.waitForTimeout(300);
 ok('leaving the card saves it',await w(f=>state.ppEnv.find(e=>e.id===f).amount===80000,fun));
 await p.locator(`.sp-amt[data-k="env:${fun}"]`).fill('40');await p.click('h1');await p.waitForTimeout(300);
 const save=await w(()=>state.ppEnv.find(e=>e.kind==='save'&&e.per!=='month').id);
 await p.locator(`.sp-amt[data-k="env:${save}"]`).fill('170');await p.click('h1');await p.waitForTimeout(300);
 ok('raising savings by the gap reaches the goal (green)',await w(()=>/Goal reached|above goal/.test(document.querySelector('.sp-bucket[data-b="save"] [data-sp-st]').innerText)));
 await w(()=>document.querySelector('.sp-card [data-action="split-method"][data-k="zero"]').click());await p.waitForTimeout(250);
 ok('zero-based: four groups and the left-to-assign banner',await w(()=>document.querySelectorAll('.sp-bucket').length===4&&/left to assign|Every dollar|Over by/.test(document.querySelector('[data-sp-banner]').innerText)));
 await w(()=>document.querySelector('.sp-card [data-action="split-method"][data-k="80-20"]').click());await p.waitForTimeout(200);
 ok('80/20',await w(()=>document.querySelectorAll('.sp-bucket').length===2));
 await w(()=>document.querySelector('.sp-card [data-action="split-method"][data-k="50-30-20"]').click());await p.waitForTimeout(200);
 ok('a paycheck without the main payday shows per-paycheck lines as not editable here',await w(()=>{let n=0;while(n++<6){const m=PaycheckUI.model(),main=Pay.mainOf(state.ppIncome);if(!m.p.pays.some(x=>x.id===main.id))break;document.querySelector('[data-action="pp-next"]').click();}const t=document.querySelector('.sp-card').innerText;return /paydays/.test(t);}));
 await w(()=>document.querySelector('.sp-card [data-action="split-method"][data-k="custom"]').click());await p.waitForTimeout(250);
 ok('Custom opens the split sliders the first time',await w(()=>!!document.querySelector('#split-custom-form')));
 await w(()=>{const f=document.querySelector('#split-custom-form');f.elements.need.value=60;f.elements.need.dispatchEvent(new Event('input',{bubbles:true}));f.elements.want.value=25;f.elements.want.dispatchEvent(new Event('input',{bubbles:true}));});
 ok('savings & debt gets the rest live (15%)',await w(()=>document.querySelector('[data-o="save"]').textContent==='15%'));
 await p.click('#split-custom-form button[type="submit"]');await p.waitForTimeout(300);
 ok('custom split saved and used: 60/25/15',await w(()=>state.settings.splitMethod==='custom'&&state.settings.splitCustom.save===15&&/60% · /.test(document.querySelector('.sp-bucket[data-b="need"] header').innerText)));
 ok('a bill line links to its edit form',await w(()=>{document.querySelector('[data-action="pp-now"]')?.click();const b=document.querySelector('.sp-card .sp-name[data-action="bt-edit"]');b.click();return /Edit/.test(document.querySelector('#modal').innerText);}));
 await w(()=>closeModal());
 ok('Settings can hide the method in the paycheck planner',await w(()=>{go('settings');return [...document.querySelectorAll('#split-method-select option')].some(o=>o.value==='');}));
 await p.close();
 ok('no page errors',!errs.length,errs.join(' | '));
 await b.close();console.log(fails?`split flow: ${fails} failed`:'split flow: all checks passed');process.exit(fails?1:0);})();
