// Shared screens in every edition: year over year, cut back, the year's averages/totals toggle and
// the side-by-side settings tables. Sample data only.
//   node build/views_flow.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const path=require('path');
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'ok  ':'FAIL'} ${name}${cond?'':' '+info}`);if(!cond)fails++;};
const APPS=['MonthlyBudgetPlanner','SmallBusinessIncomeExpenseTracker','CreatorPlan','AutonomoPlan','MoneyAutopilot'];
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const app of APPS){const p=await b.newPage({viewport:{width:1400,height:1000}}),errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.clock.setFixedTime(new Date('2026-09-15T12:00:00'));
 await p.goto('file://'+path.resolve(__dirname,`../app/${app}.html`));await p.waitForTimeout(400);
 await p.evaluate(()=>{for(let i=0;i<localStorage.length;i++){}Object.keys(localStorage);});await p.evaluate(()=>{const k=P.storage.key;localStorage.setItem(k+'-welcome-v1','1');localStorage.setItem(k+'-manual-backup',String(Date.now()));});await p.reload();await p.waitForTimeout(300);
 await p.evaluate(()=>{try{closeModal()}catch{}demo||document.querySelector('[data-action="demo"]')?.click();try{closeModal()}catch{}});await p.waitForTimeout(300);
 const nav=await p.evaluate(()=>['years','cuts'].every(id=>document.querySelector(`#nav [data-go="${id}"]`)));ok(`${app}: year over year and cut back are in the sidebar`,nav);
 await p.evaluate(()=>go('years',true));await p.waitForTimeout(150);
 ok(`${app}: year over year lists a year`,await p.evaluate(()=>document.querySelectorAll('[data-action="years-open"]').length>=1&&!/NaN/.test(document.querySelector('main').innerText)));
 await p.evaluate(()=>go('cuts',true));await p.waitForTimeout(150);
 const r=await p.evaluate(()=>{const d0=cutsData();const s=document.querySelector('.cut-pct');s.value='20';s.dispatchEvent(new Event('change',{bubbles:true}));const d1=cutsData(),row=d1.rows.find(x=>x.id===s.dataset.id);return {before:d0.saves,after:d1.saves,expect:Math.round(row.avg*0.2),nan:/NaN/.test(document.querySelector('main').innerText),rent:/Cancel <b>(Rent|Workspace|Student|Contractor)/i.test(cutIdeas(d1).map(i=>i.text).join())};});
 ok(`${app}: a 20% cut saves 20% of that category`,r.before===0&&Math.abs(r.after-r.expect)<=1,JSON.stringify(r));
 ok(`${app}: no cancel ideas for rent, loans or contractors`,!r.rent);ok(`${app}: cut back shows no NaN`,!r.nan);
 await p.evaluate(()=>document.querySelector('[data-action="cut-limits"]').click());await p.waitForTimeout(100);await p.evaluate(()=>document.querySelector('[data-action="cut-limits-ok"]').click());await p.waitForTimeout(100);
 ok(`${app}: cuts become monthly limits`,await p.evaluate(()=>{const d=cutsData(),r=d.rows.find(x=>x.saves);return state.baseline[r.id].amount===Math.round(r.after/100)*100;}));
 await p.evaluate(()=>{const s=document.querySelector('#cut-growth');s.value='7';s.dispatchEvent(new Event('change',{bubbles:true}));});await p.waitForTimeout(100);
 ok(`${app}: a growth rate adds growth to the totals`,await p.evaluate(()=>{const d=cutsData();return d.g===7&&grown(d.saves,7,10)>d.saves*120&&/growth/.test(document.querySelector('.cut-sums').innerText);}));
 const sim=await p.evaluate(()=>{const c=state.categories.find(c=>!c.archived&&Budget.type(c)==='expense').id,mk=(id,note)=>({id,date:'2026-08-0'+(state.transactions.length%9+1),category:c,amount:1000,note});
  state.transactions.push(mk('zA1','Amazon'),mk('zA2','Amazon'),mk('zP1','Amazon Prime'),mk('zP2','Amazon Prime'),mk('zS1','Starbucks'),mk('zS2','Starbucks Seattle'));
  const other=state.categories.find(x=>!x.archived&&Budget.type(x)==='expense'&&x.id!==c).id;
  offerSimilarFor('category',other,[state.transactions.find(t=>t.id==='zP1')],'Changed to');const prime=[...document.querySelectorAll('#similar-any-form [name="g"]')].map(x=>x.value+':'+x.checked);closeModal();
  offerSimilarFor('category',other,[state.transactions.find(t=>t.id==='zS1')],'Changed to');const sb=[...document.querySelectorAll('#similar-any-form [name="g"]')].map(x=>x.value+':'+x.checked);closeModal();
  state.transactions=state.transactions.filter(t=>!t.id.startsWith('z'));return {prime,sb};});
 ok(`${app}: changing Amazon Prime never pulls in Amazon`,sim.prime.length&&sim.prime.every(x=>x.startsWith('amazon prime:')),JSON.stringify(sim.prime));
 ok(`${app}: a city variant is offered but left unticked`,sim.sb.includes('starbucks seattle:false'),JSON.stringify(sim.sb));
 await p.evaluate(()=>go('annual',true));await p.waitForTimeout(150);
 const avg=await p.evaluate(()=>document.querySelector('.kpis').innerText);
 await p.evaluate(()=>document.querySelector('[data-action="annual-kpi-mode"][data-mode="total"]').click());await p.waitForTimeout(100);
 const tot=await p.evaluate(()=>document.querySelector('.kpis').innerText);
 ok(`${app}: the year toggles between averages and totals`,/\/ month/i.test(avg)&&!/\/ month/i.test(tot.split('\n').filter(l=>!/a month/.test(l)).join(' ')),tot);
 await p.evaluate(()=>{annualKpiMode='avg';state.categoryRules={'test shop':state.categories[0].id};go('settings',true);});await p.waitForTimeout(150);
 ok(`${app}: categories and rules sit side by side at the same height`,await p.evaluate(()=>{const c=[...document.querySelectorAll('.pair-scroll>.card')];return c.length===2&&Math.abs(c[0].offsetHeight-c[1].offsetHeight)<1&&Math.abs(c[0].offsetTop-c[1].offsetTop)<1;}));
 await p.evaluate(()=>showTransactions('all'));await p.waitForTimeout(150);
 ok(`${app}: transactions show four totals and two donuts`,await p.evaluate(()=>document.querySelectorAll('#content .kpis .kpi').length>=4&&document.querySelectorAll('.activity-charts .card').length===2&&/Where it came from/.test(document.querySelector('.activity-charts').innerText)));
 await p.evaluate(()=>go('annual',true));await p.waitForTimeout(150);
 const yc=await p.evaluate(()=>{const b=document.querySelector('[data-action="year-cat"]');if(!b)return null;const id=b.dataset.id;b.click();return {id,f:filterCategory,s:screen,from:txFrom};});
 ok(`${app}: the year lists every category and opens its transactions`,yc&&yc.f===yc.id&&yc.s==='activity'&&/-01-01$/.test(yc.from),JSON.stringify(yc));
 await p.evaluate(()=>go('calendar',true));await p.waitForTimeout(100);
 const cal=await p.evaluate(()=>{const off=document.querySelectorAll('.cal-total').length;const c=document.querySelector('#cal-totals');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));const on=document.querySelectorAll('.cal-total').length;c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}));return {off,on};});
 ok(`${app}: daily totals are off until switched on`,cal.off===0&&cal.on>0,JSON.stringify(cal));
 ok(`${app}: no page errors`,!errs.length,errs.join('|'));await p.close();}
await b.close();console.log(fails?`${fails} failed`:'views flow: all checks passed');process.exit(fails?1:0);})();
