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
 await p.selectOption('.sp-card select[data-split-pick]','70-20-10');await p.waitForTimeout(200);
 ok('70/20/10: living, savings, debt & giving',await v(()=>state.settings.splitMethod==='70-20-10'&&/Debt & giving/.test(document.querySelector('.sp-card').innerText)));
 await p.close();
 // Paycheck: on by default, with every method
 p=await open('PaycheckBudgetPlanner');const w=(js,a)=>p.evaluate(js,a);
 ok('Paycheck: 50/30/20 on This paycheck by default',await w(()=>{go('dashboard');const c=document.querySelector('.sp-card');return !!c&&/Split this paycheck: 50\/30\/20/.test(c.innerText)&&state.settings.splitMethod==='50-30-20';}));
 ok('all four methods to pick from',await w(()=>document.querySelectorAll('.sp-card select[data-split-pick] option').length===4));
 ok('two pies: the goal and your plan',await w(()=>document.querySelectorAll('.sp-card .sp-pie .donut').length===2&&/The 50\/30\/20 goal/.test(document.querySelector('.sp-card').innerText)));
 ok('three steps explain how it works',await w(()=>document.querySelectorAll('.sp-card .sp-how li').length===3));
 // savings short of 20%: one click raises a saving line by the gap, and the bucket reaches its goal
 const gap=await w(()=>{const b=[...document.querySelectorAll('.sp-card .sp-todo button')].find(x=>/^Add .* to /.test(x.innerText));return b?{text:b.innerText,add:+b.dataset.add,id:b.dataset.id}:null;});
 ok('a button plans what savings is missing',!!gap&&gap.add>0,JSON.stringify(gap));
 if(gap){await w(id=>document.querySelector(`.sp-card [data-action="pp-env-edit"][data-id="${id}"]`).click(),gap.id);await p.waitForTimeout(200);
  ok('it opens that line with the amount already raised',await w(g=>{const f=document.querySelector('#pp-env-form');return !!f&&Math.round(parseFloat(f.elements.amount.value.replace(/[^0-9.]/g,''))*100)===state.ppEnv.find(e=>e.id===g.id).amount+g.add;},gap));
  await p.click('#pp-env-form button[type="submit"]');await p.waitForTimeout(300);
  ok('saved: savings now on its goal',await w(()=>{const r=[...document.querySelectorAll('.sp-card .sp-row')].find(x=>/Savings & debt/.test(x.innerText));return !!r&&/On the goal|ahead of the goal/.test(r.innerText);}));}
 await p.selectOption('.sp-card select[data-split-pick]','zero');await p.waitForTimeout(250);
 ok('zero-based: what is still to assign, the same as left over',await w(()=>{const m=PaycheckUI.model();return /Still to assign/.test(document.querySelector('.sp-card').innerText)&&/Split this paycheck: zero-based/.test(document.querySelector('.sp-card').innerText)&&m.p.left>0;}));
 await p.selectOption('.sp-card select[data-split-pick]','80-20');await p.waitForTimeout(200);
 ok('80/20',await w(()=>document.querySelectorAll('.sp-card .sp-row').length===2));
 await p.selectOption('.sp-card select[data-split-pick]','50-30-20');await p.waitForTimeout(200);
 ok('a paycheck without the main payday explains instead of offering a button that can’t work',await w(()=>{let n=0;while(n++<6){const m=PaycheckUI.model(),main=Pay.mainOf(state.ppIncome);if(!m.p.pays.some(x=>x.id===main.id))break;document.querySelector('[data-action="pp-next"]').click();}const c=document.querySelector('.sp-card');return !c.querySelector('.sp-todo button')&&/follows .*paydays/.test(c.innerText);}));
 ok('room for wants never exceeds what is not planned, after the savings gap',await w(()=>{const t=document.querySelector('.sp-card').innerText,m=t.match(/\$([\d,.]+) still free to plan/),u=t.match(/Not planned yet\s*\$([\d,.]+)/);return !m||!u||parseFloat(m[1].replace(/,/g,''))<=parseFloat(u[1].replace(/,/g,''));}));
 ok('Settings can hide the method in the paycheck planner',await w(()=>{go('settings');return [...document.querySelectorAll('#split-method-select option')].some(o=>o.value==='');}));
 await p.close();
 ok('no page errors',!errs.length,errs.join(' | '));
 await b.close();console.log(fails?`split flow: ${fails} failed`:'split flow: all checks passed');process.exit(fails?1:0);})();
