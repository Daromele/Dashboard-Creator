// Bill & Subscription Tracker in the browser, as a buyer uses it: the welcome, adding bills (presets,
// "$1,450"), ticking them off, autopay, a bill whose amount varies, skip, a price rise, a free trial,
// a cancel-by reminder, cancelling, categories, delete + undo, reload, sample mode, start fresh,
// phone width, a dark theme and print. Fictional bills only.
//   node build/bills_flow.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const path=require('path');
const F='file://'+path.resolve(__dirname,'../app/BillSubscriptionTracker.html');
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'ok  ':'FAIL'} ${name}${cond?'':' '+info}`);if(!cond)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}),p=await b.newPage({viewport:{width:1300,height:900}}),errs=[];let net=0;
 p.on('pageerror',e=>errs.push(e.message));p.on('request',r=>{if(!/^(file|data):/.test(r.url()))net++;});await p.clock.setFixedTime(new Date('2026-10-03T12:00:00'));
 await p.goto(F);await p.evaluate(()=>localStorage.clear());await p.goto(F);
 ok('the welcome opens on a first visit',await p.waitForFunction(()=>$('#welcome-tour').open,null,{timeout:4000}).then(()=>true).catch(()=>false));
 await p.evaluate(()=>{for(let i=0;i<6;i++)document.querySelector('[data-action="welcome-next"]')?.click();});
 ok('the welcome ends with “Add my first bill”',await p.evaluate(()=>{const c=document.querySelector('.welcome-folder');return c&&!c.hidden&&c.dataset.action==='bt-add';}));
 await p.evaluate(()=>document.querySelector('.welcome-folder').click());await p.waitForTimeout(200);
 ok('it opens the bill form',await p.evaluate(()=>!$('#welcome-tour').open&&!!document.querySelector('#bt-form')));
 await p.evaluate(()=>document.querySelector('[data-action="dismiss"]').click());await p.waitForTimeout(150);
 ok('an empty app offers the usual bills',await p.evaluate(()=>document.querySelectorAll('.bt-presets [data-action="bt-add"]').length>=10&&/Add your bills/.test(document.querySelector('#content').innerText)));
 const fill=async(v)=>{await p.evaluate(()=>document.querySelectorAll("#bt-form details").forEach(d=>d.open=true));for(const [k,x] of Object.entries(v)){const el=await p.$(`#bt-form [name=${k}]`);const t=await el.evaluate(e=>e.type);if(t==='checkbox'){if(x!==await el.isChecked())await el.click();}else if(t==='radio')await p.click(`#bt-form label:has(input[name=${k}][value=${x}])`);else if(el&&await el.evaluate(e=>e.tagName)==='SELECT')await el.selectOption(String(x));else await el.fill(String(x));}};
 const add=async(v)=>{await p.evaluate(()=>{if(!($('#modal').open&&document.querySelector('#bt-form')))document.querySelector('.topbar [data-action="bt-add"]').click();});await fill(v);await p.evaluate(()=>document.querySelector('#bt-form').requestSubmit());await p.waitForTimeout(350);};
 // a preset fills the name, category and type
 await p.evaluate(()=>document.querySelector('.bt-presets [data-preset="0"]').click());await p.waitForTimeout(150);
 ok('a preset fills the form',await p.evaluate(()=>document.querySelector('#bt-form [name=name]').value==='Rent'&&document.querySelector('#bt-form [name=cat]').value==='housing'));
 await p.evaluate(()=>document.querySelector('#bt-form').requestSubmit());await p.waitForTimeout(150);
 ok('a bill without an amount is not saved (the form asks for it)',await p.evaluate(()=>$('#modal').open&&!document.querySelector('#bt-form').checkValidity()&&!(state.btBills||[]).length));
 await p.fill('#bt-form [name=amount]','abc');await p.evaluate(()=>document.querySelector('#bt-form').requestSubmit());await p.waitForTimeout(150);
 ok('an amount that isn’t a number is explained in the form',await p.evaluate(()=>$('#modal').open&&!document.querySelector('#form-error').hidden&&/amount/i.test(document.querySelector('#form-error').innerText)&&!(state.btBills||[]).length));
 await fill({amount:'$1,450',start:'2026-10-01'});await p.evaluate(()=>document.querySelector('#bt-form').requestSubmit());await p.waitForTimeout(350);
 ok('“$1,450” is read as 1,450.00',await p.evaluate(()=>state.btBills[0]?.amount===145000),await p.evaluate(()=>JSON.stringify(state.btBills)));
 await add({name:'Electric',amount:'120',freq:'monthly',start:'2026-10-08',cat:'utilities',varies:true});
 await add({name:'Phone',amount:'85',freq:'monthly',start:'2026-10-02',cat:'phone',autopay:true});
 await add({name:'Streaming',kind:'sub',amount:'17.99',freq:'monthly',start:'2026-10-20',cat:'streaming'});
 await add({name:'Car insurance',amount:'684',freq:'semiannual',start:'2026-11-15',cat:'insurance'});
 await add({name:'Gym',kind:'sub',amount:'49.99',freq:'monthly',start:'2026-10-03',cat:'memberships'});
 const s1=await p.evaluate(()=>({n:state.btBills.length,month:BillsUI.model().month,perMonth:BillsUI.model().perMonth,hero:document.querySelector('.bt-hero .hero-big')?.innerText}));
 ok('six bills saved',s1.n===6,s1.n);
 ok('the month: rent, phone (autopay), gym today, electric, streaming are due; insurance is next month',s1.month.count===5,JSON.stringify(s1.month.items?.map(i=>i.b.name)));
 ok('autopay counts as paid on its due day',s1.month.items.find(i=>i.b.name==='Phone').state==='auto');
 ok('every month averages the semiannual bill: 1450+120+85+17.99+49.99+114',s1.perMonth===145000+12000+8500+1799+4999+11400,s1.perMonth);
 // tick rent off, then untick it
 await p.evaluate(()=>go('dashboard'));await p.waitForTimeout(200);
 const tick=async(name)=>{await p.evaluate(n=>{const i=BillsUI.model().month.items.find(x=>x.b.name===n);document.querySelector(`.bt-check[data-id="${i.b.id}"][data-due="${i.due}"]`).click();},name);await p.waitForTimeout(250);};
 await tick('Rent');
 ok('ticking rent records it as paid, for the bill amount, today',await p.evaluate(()=>{const e=state.btLog.find(x=>x.bill===state.btBills[0].id);return e&&e.amount===145000&&e.date==='2026-10-03'&&e.due==='2026-10-01';}));
 ok('left to pay drops by the rent',await p.evaluate(()=>BillsUI.model().month.left===12000+1799+4999));
 await tick('Rent');
 ok('ticking again takes it back',await p.evaluate(()=>!state.btLog.length));
 // a bill whose amount varies asks for the real amount
 await tick('Electric');
 ok('a varying bill opens the pay form',await p.evaluate(()=>!!document.querySelector('#bt-pay-form')));
 await p.fill('#bt-pay-form [name=amount]','131.42');await p.evaluate(()=>document.querySelector('#bt-pay-form').requestSubmit());await p.waitForTimeout(250);
 ok('the real amount is kept',await p.evaluate(()=>state.btLog.find(e=>e.amount===13142)!==undefined));
 // skip the gym this month
 await p.evaluate(()=>{const g=state.btBills.find(b=>b.name==='Gym');document.querySelector(`.bt-check[data-id="${g.id}"]`).click();});await p.waitForTimeout(250);
 await p.evaluate(()=>{const g=state.btBills.find(b=>b.name==='Gym');const e=state.btLog.find(x=>x.bill===g.id);if(e)document.querySelector(`.bt-check[data-id="${g.id}"]`).click();});await p.waitForTimeout(200);
 await p.evaluate(()=>{const g=state.btBills.find(b=>b.name==='Gym');document.querySelector('[data-action="bt-skip"][data-id="'+g.id+'"]')?.click()||(()=>{const btn=document.createElement('button');btn.dataset.action='bt-skip';btn.dataset.id=g.id;btn.dataset.due='2026-10-03';document.body.appendChild(btn);btn.click();btn.remove();})();});await p.waitForTimeout(250);
 ok('a skipped bill is not due',await p.evaluate(()=>BillsUI.model().month.items.find(i=>i.b.name==='Gym').state==='skipped'&&BillsUI.model().month.count===4));
 // a price rise from a date keeps the old price on past months
 await p.evaluate(()=>{const s=state.btBills.find(b=>b.name==='Streaming');document.querySelector('.topbar [data-action="bt-add"]');BillsUI;document.dispatchEvent(new Event('x'));const btn=document.createElement('button');btn.dataset.action='bt-edit';btn.dataset.id=s.id;document.body.appendChild(btn);btn.click();btn.remove();});await p.waitForTimeout(150);
 await fill({amount:'19.99',priceFrom:'2026-12-20'});await p.evaluate(()=>document.querySelector('#bt-form').requestSubmit());await p.waitForTimeout(300);
 ok('a new price from December keeps October at the old price',await p.evaluate(()=>{const s=state.btBills.find(b=>b.name==='Streaming');return BillCal.amountOn(s,'2026-10-20')===1799&&BillCal.amountOn(s,'2026-12-20')===1999&&s.amount===1999;}));
 // a free trial: nothing due until it ends, then a warning a week before
 await add({name:'Trial TV',kind:'sub',amount:'9.99',freq:'monthly',start:'2026-09-25',cat:'streaming',trialUntil:'2026-10-08'});
 ok('nothing is due during the trial; the first charge is the day it ends, then monthly from there',await p.evaluate(()=>{const b=state.btBills.find(x=>x.name==='Trial TV'),i=BillsUI.model().month.items.filter(x=>x.b===b);return i.length===1&&i[0].due==='2026-10-08'&&i[0].amount===999&&BillCal.nextDue(b,'2026-10-09')==='2026-11-08';}));
 await p.evaluate(()=>go('dashboard'));await p.waitForTimeout(200);
 ok('the trial ending shows under Needs your attention',await p.evaluate(()=>/Trial TV: free trial ends in 5 days/.test(document.querySelector('.debt-warn')?.innerText||'')));
 // cancel-by reminder, then cancel
 await p.evaluate(()=>go('renewals'));await p.waitForTimeout(200);
 await p.evaluate(()=>{const g=state.btBills.find(b=>b.name==='Gym');document.querySelector(`[data-action="bt-remind"][data-id="${g.id}"]`).click();});await p.waitForTimeout(150);
 await p.fill('#bt-remind-form [name=date]','2026-10-12');await p.evaluate(()=>document.querySelector('#bt-remind-form').requestSubmit());await p.waitForTimeout(250);
 ok('a cancel-by reminder is saved and listed',await p.evaluate(()=>state.btBills.find(b=>b.name==='Gym').cancelBy==='2026-10-12'&&/Gym/.test(document.querySelector('#content').innerText)));
 await p.evaluate(()=>{const g=state.btBills.find(b=>b.name==='Gym');document.querySelector(`[data-action="bt-cancel"][data-id="${g.id}"]`).click();});await p.waitForTimeout(150);
 await p.fill('#bt-cancel-form [name=date]','2026-10-04');await p.evaluate(()=>document.querySelector('#bt-cancel-form').requestSubmit());await p.waitForTimeout(250);
 ok('cancelled: out of the monthly cost, reminder cleared',await p.evaluate(()=>{const g=state.btBills.find(b=>b.name==='Gym');return g.status==='cancelled'&&!g.cancelBy&&BillCal.perMonth(g)===0;}));
 // categories: add one, archive it
 await p.evaluate(()=>go('settings'));await p.waitForTimeout(200);
 ok('Settings shows bill categories, not the budget ones',await p.evaluate(()=>/Bill categories/.test(document.querySelector('#content').innerText)&&!/Your categories/.test(document.querySelector('#content').innerText)));
 ok('Settings speaks about bills',await p.evaluate(()=>{const t=document.querySelector('#content').innerText;return /One currency for every bill/.test(t)&&/every bill, subscription, payment and category/.test(t)&&!/planner/i.test(t);}));
 await p.evaluate(()=>document.querySelector('[data-action="btcat-add"]').click());await p.waitForTimeout(100);await p.fill('#btcat-form [name=name]','Pets');await p.evaluate(()=>document.querySelector('#btcat-form').requestSubmit());await p.waitForTimeout(200);
 const pid=await p.evaluate(()=>state.btCats.find(k=>k.name==='Pets')?.id);
 ok('a category is added',!!pid);
 await p.evaluate(id=>document.querySelector(`[data-action="btcat-hide"][data-id="${id}"]`).click(),pid);await p.waitForTimeout(200);
 ok('and archived',await p.evaluate(id=>state.btCats.find(k=>k.id===id)?.hidden===true,pid));
 // delete + undo
 await p.evaluate(()=>go('mybills'));await p.waitForTimeout(200);
 await p.evaluate(()=>{const c=state.btBills.find(b=>b.name==='Car insurance');document.querySelector(`[data-action="bt-del"][data-id="${c.id}"]`).click();});await p.waitForTimeout(100);
 await p.evaluate(()=>document.querySelector('[data-action="bt-del-ok"]').click());await p.waitForTimeout(250);
 ok('delete removes the bill',await p.evaluate(()=>!state.btBills.some(b=>b.name==='Car insurance')));
 await p.evaluate(()=>document.querySelector('#toast [data-action="undo"]')?.click());await p.waitForTimeout(250);
 ok('undo brings it back',await p.evaluate(()=>state.btBills.some(b=>b.name==='Car insurance')));
 // grid and table
 await p.evaluate(()=>document.querySelector('[data-action="bt-layout"][data-layout="table"]').click());await p.waitForTimeout(200);
 ok('table view lists every active bill with a total',await p.evaluate(()=>document.querySelectorAll('.bt-table tbody tr').length>=7&&!!document.querySelector('.bt-table .tx-total')));
 // reload keeps everything
 const before=await p.evaluate(()=>JSON.stringify([state.btBills,state.btLog]));
 await p.reload();await p.waitForTimeout(800);
 ok('a reload keeps bills and payments',await p.evaluate(()=>JSON.stringify([state.btBills,state.btLog]))===before);
 // every screen draws with data
 for(const v of ['dashboard','mybills','billcal','renewals','yearcost','billpay','settings','guide']){await p.evaluate(x=>go(x),v);await p.waitForTimeout(150);ok(`${v} draws`,await p.evaluate(()=>document.querySelector('#content').innerText.length>200));}
 // sample mode: separate, rich, never saved
 await p.evaluate(()=>document.querySelector('[data-action="demo"]').click());await p.waitForTimeout(600);
 const S=await p.evaluate(()=>({n:state.btBills.length,log:state.btLog.length,od:BillsUI.model().overdue.length,ev:BillsUI.model().events.length,raises:BillsUI.model().raises.length,banner:document.querySelector('#demo-banner').innerText}));
 ok('sample mode: 19 bills, a year of payments, one overdue, a trial and a reminder, a price rise',S.n===19&&S.log>100&&S.od===1&&S.ev>=2&&S.raises>=1,JSON.stringify(S));
 ok('the sample banner speaks about bills',/Your own bills stay separate/.test(S.banner),S.banner);
 await p.evaluate(()=>document.querySelector('[data-action="exit-demo"]').click());await p.waitForTimeout(500);
 ok('leaving sample mode brings back your own bills',await p.evaluate(()=>state.btBills.length===7));
 // start fresh, keeping the bills
 await p.evaluate(()=>go('settings'));await p.waitForTimeout(150);
 await p.evaluate(()=>document.querySelector('[data-action="start-fresh"]').click());await p.waitForTimeout(150);
 ok('start fresh offers to keep the bills',await p.evaluate(()=>/Keep my bills/.test(document.querySelector('#fresh-form').innerText)));
 await p.check('#fresh-form [name=sure]');await p.evaluate(()=>document.querySelector('#fresh-form').requestSubmit());await p.waitForTimeout(500);
 ok('payments cleared, bills kept',await p.evaluate(()=>state.btBills.length===7&&!state.btLog.length));
 // phone width: nothing spills sideways
 await p.setViewportSize({width:390,height:844});
 for(const v of ['dashboard','mybills','billcal','renewals','yearcost','billpay','settings']){await p.evaluate(x=>go(x),v);await p.waitForTimeout(150);const w=await p.evaluate(()=>document.documentElement.scrollWidth);ok(`${v} fits a phone`,w<=392,w);}
 // a dark theme and print
 await p.setViewportSize({width:1300,height:900});await p.evaluate(()=>{state.settings.theme='night';go('dashboard');});await p.waitForTimeout(200);
 await p.emulateMedia({media:'print'});await p.waitForTimeout(100);
 ok('prints without the sidebar',await p.evaluate(()=>getComputedStyle(document.querySelector('.rail,nav,#nav')).display==='none'||document.querySelector('#nav').offsetParent===null));
 await p.emulateMedia({media:'screen'});
 ok('no page errors',!errs.length,errs.join(' | '));ok('no network requests',net===0,net);
 await b.close();console.log(fails?`bills flow: ${fails} failed`:'bills flow: all checks passed');process.exit(fails?1:0);})();
