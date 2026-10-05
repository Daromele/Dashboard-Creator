// Debt Free Plan in the browser, as a buyer uses it: the welcome, adding debts, the plan, logging
// payments, a statement balance, a one-off payment, what-if, delete + undo, reload, sample mode,
// phone width and print. Fictional debts only.
//   node build/debt_flow.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const path=require('path');
const F='file://'+path.resolve(__dirname,'../app/DebtFreePlan.html');
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'ok  ':'FAIL'} ${name}${cond?'':' '+info}`);if(!cond)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}),p=await b.newPage({viewport:{width:1300,height:900}}),errs=[];let net=0;
 p.on('pageerror',e=>errs.push(e.message));p.on('request',r=>{if(!/^(file|data):/.test(r.url()))net++;});await p.clock.setFixedTime(new Date('2026-10-03T12:00:00'));
 await p.goto(F);await p.evaluate(()=>localStorage.clear());await p.goto(F);
 ok('the welcome opens on a first visit',await p.waitForFunction(()=>$('#welcome-tour').open,null,{timeout:4000}).then(()=>true).catch(()=>false));
 // jump to the last slide and use its button
 await p.evaluate(()=>{for(let i=0;i<6;i++)document.querySelector('[data-action="welcome-next"]')?.click();});
 const cta=await p.evaluate(()=>{const c=document.querySelector('.welcome-folder');return c&&!c.hidden?c.dataset.action:null;});
 ok('the welcome ends with “Add my first debt”',cta==='debt-add',cta);
 await p.evaluate(()=>document.querySelector('.welcome-folder').click());await p.waitForTimeout(200);
 ok('it opens the debt form',await p.evaluate(()=>!$('#welcome-tour').open&&!!document.querySelector('#debt-form')));
 const add=async(v)=>{await p.evaluate(()=>{if(!$('#modal').open||!document.querySelector('#debt-form'))document.querySelector('.pagehead [data-action="debt-add"]').click();});for(const [k,x] of Object.entries(v)){const el=await p.$(`#debt-form [name="${k}"]`);if((await el.evaluate(e=>e.tagName))==='SELECT')await el.selectOption(x);else await el.fill(String(x));}
  await p.evaluate(()=>document.querySelector('#debt-form').requestSubmit());await p.waitForTimeout(450);asked.push(await p.evaluate(()=>{const b=document.querySelector('#budget-prompt');if(b)b.querySelector('[data-action="dismiss"]').click();return !!b;}));};const asked=[];
 // an empty name is refused, with the reason in the form
 await p.evaluate(()=>document.querySelector('#debt-form').requestSubmit());await p.waitForTimeout(100);
 ok('a debt without a name is not saved',await p.evaluate(()=>!(state.debts||[]).length&&$('#modal').open));
 await p.fill('#debt-form [name=name]','Bad');await p.fill('#debt-form [name=balance]','100');await p.fill('#debt-form [name=apr]','abc');await p.fill('#debt-form [name=min]','10');await p.evaluate(()=>document.querySelector('#debt-form').requestSubmit());await p.waitForTimeout(100);
 ok('a rate that isn’t a number is explained in the form',await p.evaluate(()=>!document.querySelector('#form-error').hidden&&/rate/i.test(document.querySelector('#form-error').innerText)&&!(state.debts||[]).length));
 await add({name:'Visa',kind:'card',balance:'5000',apr:'24.99',min:'50',minMode:'card',due:'15',limit:'6000'});
 await add({name:'Car loan',kind:'auto',balance:'12000',apr:'6.5',min:'320',minMode:'fixed',due:'20'});
 await add({name:'Store card',kind:'card',balance:'800',apr:'29.99',min:'35',minMode:'fixed',due:'5'});
 const s1=await p.evaluate(()=>({n:state.debts.length,apr:state.debts[0].apr,bal:state.debts[0].balance,since:state.debts[0].since,h:document.querySelector('.debt-hero h2')?.innerText}));
 ok('the monthly budget is asked for after the first debt only',JSON.stringify(asked)==='[true,false,false]',JSON.stringify(asked));
 ok('three debts are saved, in cents and hundredths of a percent',s1.n===3&&s1.apr===2499&&s1.bal===500000&&s1.since==='2026-10-03',JSON.stringify(s1));
 ok('the dashboard shows a debt-free month',/20\d\d/.test(s1.h||''),s1.h);
 // the plan: budget, strategies
 await p.evaluate(()=>go('plan',true));await p.waitForTimeout(150);
 const minTxt=await p.evaluate(()=>document.querySelector('#plan-extra-note').innerText);
 await p.fill('#plan-budget-form [name=budget]','900');await p.evaluate(()=>document.querySelector('#plan-budget-form').requestSubmit());await p.waitForTimeout(150);
 ok('the monthly budget is saved',await p.evaluate(()=>state.debtPlan.budget===90000),minTxt);
 const strat=await p.evaluate(()=>{const before=Debts.model().sim;document.querySelector('[data-action="plan-strategy"][data-s="snowball"]').click();const after=Debts.model().sim;return {s:state.debtPlan.strategy,first:Object.entries(after.payoff).sort((a,b)=>a[1].localeCompare(b[1]))[0][0],store:state.debts.find(d=>d.name==='Store card').id,bi:before.totalInterest,ai:after.totalInterest};});
 ok('switching to snowball clears the smallest debt first',strat.s==='snowball'&&strat.first===strat.store,JSON.stringify(strat));
 ok('avalanche cost no more interest than snowball',strat.bi<=strat.ai,JSON.stringify(strat));
 // the strategy deck: big numbers roll to the new strategy, cards and chart lines follow
 const deck=await p.evaluate(()=>({kpis:document.querySelectorAll('#plan-live .big-kpis .kpi').length,cards:document.querySelectorAll('.strat-card').length,cur:document.querySelector('.strat-card.is-current')?.dataset.s,pressed:document.querySelector('.strat-switch [aria-pressed=true]')?.dataset.s,lines:document.querySelectorAll('#plan-live .dl-line').length,hl:document.querySelector('#plan-live .dl-line.hl')?.dataset.sid}));
 ok('the plan shows four big numbers, six strategy cards and a line per strategy',deck.kpis===4&&deck.cards===6&&deck.lines===6&&deck.cur==='snowball'&&deck.pressed==='snowball'&&deck.hl==='snowball',JSON.stringify(deck));
 const chip=await p.evaluate(()=>{const c=document.querySelector('#plan-live .dl-chip[data-sid="cashflow"]');c.click();const off=document.querySelector('#plan-live .dl-line[data-sid="cashflow"]').classList.contains('off');c.click();return [off,document.querySelector('#plan-live .dl-line[data-sid="cashflow"]').classList.contains('off'),state.debtPlan.strategy];});
 ok('a chip hides and shows its line without changing the plan',chip[0]===true&&chip[1]===false&&chip[2]==='snowball',JSON.stringify(chip));
 const slide=await p.evaluate(()=>{const s=document.querySelector('#plan-slider'),before=document.querySelector('#plan-live .big-kpis').dataset.x||document.querySelector('#plan-live .big-kpis .tw-num').dataset.v;s.value=String(+s.max);s.dispatchEvent(new Event('input',{bubbles:true}));return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r({before,after:document.querySelector('#plan-live .big-kpis .tw-num').dataset.v,saved:state.debtPlan.budget,max:+s.max}))));});
 ok('dragging the budget slider previews a sooner date before saving',+slide.after<+slide.before&&slide.saved===90000,JSON.stringify(slide));
 await p.evaluate(()=>document.querySelector('#plan-slider').dispatchEvent(new Event('change',{bubbles:true})));await p.waitForTimeout(100);
 ok('letting go of the slider saves the budget',await p.evaluate(m=>state.debtPlan.budget===m,slide.max));
 await p.evaluate(()=>{const s=document.querySelector('#plan-slider');s.value='90000';s.dispatchEvent(new Event('change',{bubbles:true}));});await p.waitForTimeout(100);
 await p.evaluate(()=>document.querySelector('[data-action="plan-strategy"][data-s="custom"]').click());await p.waitForTimeout(100);
 await p.evaluate(()=>document.querySelector('[data-action="plan-down"]').click());await p.waitForTimeout(100);
 ok('your own order can be rearranged',await p.evaluate(()=>state.debtPlan.strategy==='custom'&&state.debtPlan.custom.length===3));
 // a one-off payment
 await p.evaluate(()=>document.querySelector('[data-action="plan-extra-add"]').click());await p.fill('#debt-extra-form [name=amount]','500');await p.evaluate(()=>document.querySelector('#debt-extra-form').requestSubmit());await p.waitForTimeout(100);
 ok('a one-off payment is planned',await p.evaluate(()=>state.debtPlan.extras.length===1&&state.debtPlan.extras[0].amount===50000));
 // log this month as paid from the dashboard
 await p.evaluate(()=>go('dashboard',true));await p.waitForTimeout(100);
 const planned=await p.evaluate(()=>{const M=Debts.model();return M.sim.months[0].paid;});
 await p.evaluate(()=>document.querySelector('[data-action="debt-pay-all"]').click());await p.waitForTimeout(150);
 ok('“Log all as paid” logs the plan’s amounts',await p.evaluate(n=>state.debtLog.filter(e=>e.kind==='payment').reduce((a,e)=>a+e.amount,0)===n&&!!document.querySelector('.pill.pos'),planned));
 // a statement balance resets the estimate
 await p.evaluate(()=>document.querySelector('.topbar [data-action="debt-bal"]').click());await p.waitForTimeout(100);
 await p.selectOption('#debt-pay-form [name=debt]',{label:'Visa'});await p.fill('#debt-pay-form [name=amount]','4321.00');await p.evaluate(()=>document.querySelector('#debt-pay-form').requestSubmit());await p.waitForTimeout(150);
 ok('a statement balance replaces the estimate',await p.evaluate(()=>Debts.model().rows.find(r=>r.d.name==='Visa').now===432100));
 // what if: apply an extra amount
 await p.evaluate(()=>go('whatif',true));await p.waitForTimeout(150);
 const wi=await p.evaluate(()=>{const before=state.debtPlan.budget;document.querySelector('[data-action="wi-apply-extra"]').click();return [before,state.debtPlan.budget,document.querySelectorAll('.wi-card').length];});
 ok('what if: six tools, and an extra amount can be added to the plan',wi[2]===6&&wi[1]===wi[0]+10000,JSON.stringify(wi));
 // a debt set to "In collections" leaves the plan but stays in the total
 const before=await p.evaluate(()=>{const M=Debts.model();return {total:M.total,n:M.forSim.length};});
 await p.evaluate(()=>{go('debts',true);document.querySelector('.debt-card [data-action="debt-edit"]').click();});await p.waitForTimeout(150);
 await p.selectOption('#debt-form [name=status]','collections');await p.evaluate(()=>document.querySelector('#debt-form').requestSubmit());await p.waitForTimeout(200);
 const coll=await p.evaluate(()=>{const M=Debts.model(),d=state.debts.find(x=>x.status==='collections');go('dashboard',true);return {d:!!d,total:M.total,n:M.forSim.length,inPlan:!!M.sim.months[0]?.debts[d?.id],warn:/in collections/i.test(document.querySelector('.debt-warn')?.innerText||''),pay:[...document.querySelectorAll('.pay-row b')].some(b=>b.innerText===d.name)};});
 ok('a debt in collections stays in the total but leaves the plan, with a reminder',coll.d&&coll.total===before.total&&coll.n===before.n-1&&!coll.inPlan&&coll.warn&&!coll.pay,JSON.stringify({before,coll}));
 await p.evaluate(()=>{const d=state.debts.find(x=>x.status==='collections');commit(()=>{delete d.status;},'back');});
 // a debt's own history, from its card
 const hist=await p.evaluate(()=>{go('debts',true);const id=state.debts[0].id;document.querySelector(`.debt-card [data-action="debt-history"][data-id="${id}"]`).click();const rows=[...document.querySelectorAll('#content table tbody tr')].length,want=state.debtLog.filter(e=>e.debt===id).length;return {screen:document.body.dataset.screen,rows,want};});
 ok('a debt’s history icon opens its payments and entries only',hist.screen==='payments'&&hist.rows===hist.want&&hist.want>0,JSON.stringify(hist));
 ok('delete sits on every debt card',await p.evaluate(()=>{go('debts',true);return document.querySelectorAll('.debt-card [data-action="debt-del"]').length===state.debts.filter(d=>!d.archived).length;}));
 // delete with undo
 await p.evaluate(()=>go('debts',true));await p.waitForTimeout(100);
 await p.evaluate(()=>{document.querySelector('#content [data-action="debt-edit"]').click();});await p.waitForTimeout(100);
 await p.evaluate(()=>document.querySelector('#debt-form [data-action="debt-del"]').click());await p.evaluate(()=>document.querySelector('[data-action="debt-del-ok"]').click());await p.waitForTimeout(100);
 const afterDel=await p.evaluate(()=>state.debts.length);await p.evaluate(()=>document.querySelector('#toast [data-action="undo"]').click());await p.waitForTimeout(100);
 ok('a debt can be deleted and brought back with Undo',afterDel===2&&await p.evaluate(()=>state.debts.length===3));
 // saved across a reload
 await p.reload();await p.waitForTimeout(400);
 ok('everything is still there after a reload',await p.evaluate(()=>state.debts.length===3&&state.debtLog.length>=4&&state.debtPlan.extras.length===1));
 // every screen, with the sample, at desktop and phone width
 await p.evaluate(()=>{try{closeModal()}catch{};document.querySelector('[data-action="demo"]').click();});await p.waitForTimeout(300);
 const screens=['dashboard','debts','plan','payments','whatif','progress','duedates','budget','activity','cuts','settings','guide'];
 for(const w of [1300,390]){await p.setViewportSize({width:w,height:900});for(const s of screens){await p.evaluate(s=>go(s,true),s);await p.waitForTimeout(80);}
  ok(`every screen opens at ${w}px`,!errs.length,errs.join('|'));
  ok(`no sideways scroll at ${w}px on the dashboard`,await p.evaluate(()=>{go('dashboard',true);return document.documentElement.scrollWidth<=innerWidth+1;}));}
 await p.setViewportSize({width:1300,height:900});
 ok('the sample fills the dashboard',await p.evaluate(()=>{go('dashboard',true);return /Debt free in/i.test(document.querySelector('.debt-hero').innerText)&&document.querySelectorAll('.pay-row').length===6;}));
 ok('My debts opens as a grid with category chips',await p.evaluate(()=>{go('debts',true);return document.querySelectorAll('.debt-card').length===6&&document.querySelectorAll('.dg-chips .dl-chip').length===6;}));
 ok('settings show debt categories, not budget categories, while the budget screens are off',await p.evaluate(()=>{go('settings',true);const h=[...document.querySelectorAll('h2')].map(x=>x.innerText);return h.includes('Debt categories')&&!h.includes('Your categories');}));
 await p.emulateMedia({media:'print'});await p.evaluate(()=>go('plan',true));await p.waitForTimeout(100);
 ok('the plan prints without the sidebar',await p.evaluate(()=>getComputedStyle(document.querySelector('.rail')).display==='none'));
 ok('the app made no network requests',net===0);ok('no page errors',!errs.length,errs.join('|'));
 await b.close();console.log(fails?`${fails} failed`:'debt flow: all checks passed');process.exit(fails?1:0);})();
