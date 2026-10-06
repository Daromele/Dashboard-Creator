// Paycheck Budget Planner in the browser, as a buyer uses it: the welcome, the three setup steps, a paycheck
// paid every two weeks (and one twice a month), bills landing in the paycheck before they're due, spending and
// saving, logging spending, confirming a paycheck, a short paycheck fixed by moving a bill, carrying leftovers,
// a second income, past paychecks, sample mode, start fresh, phone width and print. Fictional data only.
//   node build/paycheck_flow.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const path=require('path');
const F='file://'+path.resolve(__dirname,'../app/PaycheckBudgetPlanner.html');
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'ok  ':'FAIL'} ${name}${cond?'':' '+info}`);if(!cond)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}),p=await b.newPage({viewport:{width:1300,height:900}}),errs=[];let net=0;
 p.on('pageerror',e=>errs.push(e.message));p.on('request',r=>{if(!/^(file|data):/.test(r.url()))net++;});await p.clock.setFixedTime(new Date('2026-10-06T12:00:00'));
 await p.goto(F);await p.evaluate(()=>localStorage.clear());await p.goto(F);
 const v=(js,a)=>p.evaluate(js,a),M=()=>v(()=>{const m=PaycheckUI.model();return m.p?{start:m.p.start,end:m.p.end,income:m.p.income,bills:m.p.bills.map(i=>i.b.name),billTotal:m.p.billTotal,spendPlan:m.p.spendPlan,spent:m.p.spent,left:m.p.left,next:m.next&&{start:m.next.start,left:m.next.left,bills:m.next.bills.map(i=>i.b.name)}}:null;});
 const submit=async id=>{await v(i=>document.querySelector(i).requestSubmit(),id);await p.waitForTimeout(300);};
 ok('the welcome opens on a first visit',await p.waitForFunction(()=>$('#welcome-tour').open,null,{timeout:4000}).then(()=>true).catch(()=>false));
 await v(()=>{for(let i=0;i<6;i++)document.querySelector('[data-action="welcome-next"]')?.click();});
 ok('the welcome ends with “Add my paycheck”',await v(()=>{const c=document.querySelector('.welcome-folder');return c&&!c.hidden&&c.dataset.action==='pp-income-add';}));
 await v(()=>document.querySelector('.welcome-folder').click());await p.waitForTimeout(200);
 ok('it opens the paycheck form',await v(()=>!$('#welcome-tour').open&&!!document.querySelector('#pp-income-form')));
 // twice a month shows two days and a weekend rule; every two weeks shows the next payday
 await p.selectOption('#pp-income-form [name=freq]','semimonthly');
 ok('twice a month: pick two days and the weekend rule, no date',await v(()=>{const f=document.querySelector('#pp-income-form');return !f.querySelector('.pp-f-days').hidden&&!f.querySelector('.pp-f-weekend').hidden&&f.querySelector('.pp-f-next').hidden;}));
 await p.selectOption('#pp-income-form [name=freq]','biweekly');
 ok('every 2 weeks: the next payday, no weekend rule',await v(()=>{const f=document.querySelector('#pp-income-form');return f.querySelector('.pp-f-days').hidden&&f.querySelector('.pp-f-weekend').hidden&&!f.querySelector('.pp-f-next').hidden&&f.elements.start.value==='';}));
 await v(()=>document.querySelector('[data-action="dismiss"]').click());await p.waitForTimeout(100);
 ok('empty app: three setup steps, no arrows or print',await v(()=>document.querySelectorAll('.pp-step').length===3&&!document.querySelector('#content .due-nav')&&!document.querySelector('#content [data-action="print"]')));
 // 1. the paycheck: last payday was Friday Oct 2
 await v(()=>document.querySelector('.pp-step [data-action="pp-income-add"]').click());await p.waitForTimeout(100);
 await p.fill('#pp-income-form [name=name]','My job');await p.fill('#pp-income-form [name=amount]','$2,000');await p.fill('#pp-income-form [name=start]','2026-10-02');await submit('#pp-income-form');
 let m=await M();ok('a paycheck every two weeks: this one runs Oct 2 – Oct 15',m&&m.start==='2026-10-02'&&m.end==='2026-10-15'&&m.income===200000,JSON.stringify(m));
 ok('step 1 is ticked; steps 2 and 3 still offered',await v(()=>document.querySelectorAll('.pp-step.done').length===1&&document.querySelectorAll('.pp-step').length===3));
 // 2. bills: phone (12th) in this paycheck, rent (Nov 1) in the next
 const bill=async(name,amt,date,freq)=>{await v(()=>document.querySelector('.topbar [data-action="bt-add"]').click());await p.waitForTimeout(100);await p.fill('#bt-form [name=name]',name);await p.fill('#bt-form [name=amount]',amt);await p.fill('#bt-form [name=start]',date);if(freq)await p.selectOption('#bt-form [name=freq]',freq);await submit('#bt-form');};
 await bill('Phone','80','2026-10-12');await bill('Rent','1,450','2026-11-01');await v(()=>go('dashboard'));
 m=await M();ok('phone lands in this paycheck, rent in the one before it’s due (Oct 30)',m.bills.join()==='Phone'&&m.next.start==='2026-10-16'&&!m.next.bills.length,JSON.stringify(m));
 const L=await v(()=>PaycheckUI.model().L.map(p=>p.start+':'+p.bills.map(i=>i.b.name).join('+')));ok('…rent comes out of the Oct 30 paycheck',L.some(x=>x.startsWith('2026-10-30:Rent')),L.join(' '));
 // 3. spending: a preset, and a saving goal guessed from its name
 await v(()=>{go('spending');document.querySelector('.bt-presets [data-preset="0"]').click();});await p.waitForTimeout(100);
 ok('a preset fills Groceries, $600 a month',await v(()=>{const f=document.querySelector('#pp-env-form');return f.elements.name.value==='Groceries'&&f.elements.per.value==='month'&&/a paycheck/.test(f.querySelector('.pp-per-hint').innerText);}));
 await submit('#pp-env-form');
 await v(()=>document.querySelector('[data-action="pp-env-add"]').click());await p.waitForTimeout(100);await p.fill('#pp-env-form [name=name]','Vacation fund');
 ok('“Vacation fund” is guessed as saving',await v(()=>document.querySelector('#pp-env-form [name=kind]:checked').value==='save'));
 await p.fill('#pp-env-form [name=amount]','50');await submit('#pp-env-form');
 ok('all three steps done: the setup card steps aside',await v(()=>{go('dashboard');return !document.querySelector('.pp-steps');}));
 m=await M();ok('this paycheck: $2,000 − $80 phone − groceries (14 of 31 days of $600) − $50 saving',m.left===200000-8000-Math.round(60000*14/31)-5000,JSON.stringify(m));
 // log spending
 await v(()=>document.querySelector('.topbar [data-action="pp-spend"]').click());await p.waitForTimeout(100);
 ok('Log spending picks the spending kind, dated today',await v(()=>{const f=document.querySelector('#pp-spend-form');return f.elements.env.selectedOptions[0].text==='Groceries'&&f.elements.date.value==='2026-10-06';}));
 await p.fill('#pp-spend-form [name=amount]','45.20');await submit('#pp-spend-form');
 ok('the message says what’s left this paycheck',await v(()=>/Groceries: \$45\.20 · \$225\.77 left this paycheck/.test(document.querySelector('#toast').innerText)),await v(()=>document.querySelector('#toast').innerText));
 m=await M();ok('spent this paycheck: $45.20',m.spent===4520);
 // the paycheck arrived: confirm what really came in
 ok('“Did your My job paycheck arrive?”',await v(()=>/Did your My job paycheck arrive\?/.test(document.querySelector('#content').innerText)));
 await v(()=>document.querySelector('[data-action="pp-got"]').click());await p.waitForTimeout(100);await p.fill('#pp-got-form [name=amount]','1,980');await submit('#pp-got-form');
 m=await M();ok('the plan uses what you got: $1,980',m.income===198000);
 // a short paycheck, fixed by moving a bill
 await bill('Car repair','2,100','2026-10-20','once');await v(()=>go('dashboard'));
 m=await M();ok('the next paycheck runs short and the dashboard says so',m.next.left<0&&/next paycheck .* short/i.test(await v(()=>document.querySelector('.debt-warn').innerText)),JSON.stringify(m.next));
 await v(()=>go('paychecks'));
 ok('Paycheck plan: one short paycheck, marked red',await v(()=>document.querySelectorAll('.pp-card.is-short').length===1&&/1 paycheck short/.test(document.querySelector('#content').innerText)));
 await v(()=>{const r=state.btBills.find(x=>x.name==='Car repair');document.querySelector(`[data-action="pp-move"][data-id="${r.id}"]`).click();});await p.waitForTimeout(100);
 ok('the move dialog offers this paycheck and marks its own',await v(()=>/its own/.test(document.querySelector('#pp-move-form').innerText)&&!!document.querySelector('#pp-move-form [value="2026-10-02"]')));
 await v(()=>{document.querySelector('#pp-move-form [value="2026-10-02"]').checked=true;document.querySelector('#pp-move-form').requestSubmit();});await p.waitForTimeout(300);
 m=await M();ok('moved: it comes out of this paycheck, the next one isn’t short',m.bills.includes('Car repair')&&m.next.left>=0&&!m.next.bills.includes('Car repair'),JSON.stringify(m));
 // carrying what's left
 const before=(await M()).next.left;await v(()=>document.querySelector('[data-action="pp-carry"]').click());await p.waitForTimeout(300);
 m=await M();ok('carry: the next paycheck starts with this one’s left over',m.next.left===before+m.left,JSON.stringify([before,m.left,m.next.left]));
 await v(()=>document.querySelector('[data-action="pp-carry"]').click());await p.waitForTimeout(200);
 // tick a bill from This paycheck
 await v(()=>{go('dashboard');const ph=state.btBills.find(x=>x.name==='Phone');document.querySelector(`.bt-check[data-id="${ph.id}"]`).click();});await p.waitForTimeout(250);
 ok('ticking the phone bill marks it paid',await v(()=>state.btLog.some(e=>e.bill===state.btBills.find(x=>x.name==='Phone').id)));
 // the next paycheck from the arrows
 await v(()=>document.querySelector('[data-action="pp-next"]').click());await p.waitForTimeout(150);
 ok('› goes to the next paycheck, with a way back',await v(()=>PaycheckUI.model().p.start==='2026-10-16'&&!!document.querySelector('[data-action="pp-now"]')));
 await v(()=>document.querySelector('[data-action="pp-now"]').click());
 // a second income, paid twice a month
 await v(()=>{go('income');document.querySelector('[data-action="pp-income-add"]').click();});await p.waitForTimeout(100);
 await p.fill('#pp-income-form [name=name]','Partner');await p.fill('#pp-income-form [name=amount]','1600');await p.selectOption('#pp-income-form [name=freq]','semimonthly');await p.selectOption('#pp-income-form [name=day1]','15');await p.selectOption('#pp-income-form [name=day2]','31');await submit('#pp-income-form');
 const P2=await v(()=>Pay.periods(state.ppIncome,'2026-10-06','2026-10-31').map(p=>p.start));ok('two incomes make their own paychecks (Oct 15, Oct 16, Oct 30)',P2.join()==='2026-10-02,2026-10-15,2026-10-16,2026-10-30',P2.join());
 ok('Paydays marks the main paycheck; the partner’s doesn’t add another round of saving',await v(()=>/Main paycheck/.test(document.querySelector('#content').innerText)&&Pay.plan({incomes:state.ppIncome,bills:[],envelopes:state.ppEnv,log:[],spend:[]},'2026-10-15',1,'2026-10-06')[0].savePlan===0));
 await v(()=>document.querySelector('[data-action="pp-income-main"]').click());await p.waitForTimeout(200);
 ok('Make main moves the per-paycheck amounts to the partner',await v(()=>state.ppIncome[0].name==='Partner'));
 // past paychecks
 await v(()=>go('pphistory'));ok('Past paychecks lists this one, in progress',await v(()=>/in progress/.test(document.querySelector('#content').innerText)));
 // delete + undo
 await v(()=>{go('income');const x=state.ppIncome.find(z=>z.name==='Partner');document.querySelector(`[data-action="pp-income-del"][data-id="${x.id}"]`).click();});await p.waitForTimeout(100);
 await v(()=>document.querySelector('[data-action="pp-income-del-ok"]').click());await p.waitForTimeout(200);ok('delete an income',await v(()=>state.ppIncome.length===1));
 await v(()=>document.querySelector('#toast [data-action="undo"]').click());await p.waitForTimeout(200);ok('undo brings it back',await v(()=>state.ppIncome.length===2));
 // the calendar shows paydays
 await v(()=>go('billcal'));ok('the calendar shows paydays',await v(()=>document.querySelectorAll('.pp-ev').length>=3));
 // reload keeps everything
 await p.reload();await p.waitForTimeout(500);ok('reload keeps paychecks, bills, spending and the move',await v(()=>state.ppIncome.length===2&&state.btBills.length===3&&state.ppSpend.length===1&&Object.keys(state.ppMoves).length===1));
 // sample mode
 await v(()=>{try{closeWelcome()}catch{};document.querySelector('[data-action="demo"]').click();});await p.waitForTimeout(600);
 const S=await v(()=>({i:state.ppIncome.length,b:state.btBills.length,e:state.ppEnv.length,s:state.ppSpend.length,short:PaycheckUI.model().L.filter(p=>p.short).length,banner:document.querySelector('#demo-banner').innerText}));
 ok('sample: two incomes, 12 bills, 7 envelopes, spending logged, one short paycheck ahead',S.i===2&&S.b===12&&S.e===7&&S.s>30&&S.short===1,JSON.stringify(S));
 ok('the sample banner speaks about paychecks',/Your own paychecks and bills stay separate/.test(S.banner));
 await v(()=>go('guide'));ok('in sample mode the guide offers the way back',await v(()=>!!document.querySelector('#content [data-action="exit-demo"]')));
 await v(()=>document.querySelector('[data-action="exit-demo"]').click());await p.waitForTimeout(400);ok('back to your own',await v(()=>state.ppIncome.length===2&&state.btBills.length===3));
 // start fresh, keeping the plan
 await v(()=>{go('settings');document.querySelector('[data-action="start-fresh"]').click();});await p.waitForTimeout(150);
 ok('start fresh offers to keep the paychecks, bills and spending plan',await v(()=>/Keep my paychecks, bills and spending plan/.test(document.querySelector('#fresh-form').innerText)));
 await p.check('#fresh-form [name=sure]');await submit('#fresh-form');await p.waitForTimeout(300);
 ok('ticks and spending cleared; incomes, bills and envelopes kept',await v(()=>state.ppIncome.length===2&&state.btBills.length===3&&state.ppEnv.length===2&&!state.ppSpend.length&&!state.btLog.length&&!Object.keys(state.ppMoves||{}).length));
 // phone width, print
 await p.setViewportSize({width:390,height:844});
 for(const s of ['dashboard','paychecks','spending','mybills','income','billcal','pphistory','settings']){await v(x=>go(x),s);await p.waitForTimeout(150);const w=await v(()=>document.documentElement.scrollWidth);ok(`${s} fits a phone`,w<=392,w);}
 await p.setViewportSize({width:1300,height:900});await v(()=>{state.settings.theme='night';go('dashboard');});await p.emulateMedia({media:'print'});await p.waitForTimeout(100);
 ok('prints without the sidebar',await v(()=>document.querySelector('#nav').offsetParent===null||getComputedStyle(document.querySelector('.rail,nav,#nav')).display==='none'));
 await p.emulateMedia({media:'screen'});
 ok('no page errors',!errs.length,errs.join(' | '));ok('no network requests',net===0,net);
 await b.close();console.log(fails?`paycheck flow: ${fails} failed`:'paycheck flow: all checks passed');process.exit(fails?1:0);})();
