// Transactions with their own dates, bulk actions, tags in the form and chart slices, in the browser.
//   node tx_flow.js [screenshot dir]
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const SS=process.argv[2];
const ok=(n,c,x='')=>{console.log((c?'ok   ':'FAIL ')+n+(c?'':' '+x));if(!c)process.exitCode=1;};
// the samples fill the current month up to today; on the 1st it is nearly empty, so run on the 20th
const MID=new Date(); MID.setDate(20); MID.setHours(12,0,0,0);
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1360,height:900}});await p.clock.setFixedTime(MID);const errs=[];p.on('pageerror',e=>errs.push(e.message));
const F='file:///home/user/Dashboard-Creator/monthly-plan/app/ProfitPlanBusiness.html',k='jps-profit-plan';
await p.goto(F);await p.evaluate(k=>{localStorage.setItem(k+'-welcome-v1','1');localStorage.setItem(k+'-manual-backup',String(Date.now()));},k);await p.goto(F);await p.waitForTimeout(300);
await p.evaluate(()=>document.querySelector('[data-action="demo"]').click());await p.waitForTimeout(400);
await p.evaluate(()=>go('activity'));
await p.selectOption('#tx-range','last-month');let r=await p.evaluate(()=>activityList.every(t=>t.date.slice(0,7)===Budget.shift(Budget.today().slice(0,7),-1)));ok('last month preset',r);
ok('month picker hidden',await p.evaluate(()=>getComputedStyle(document.querySelector('.month-control')).display==='none'));
await p.selectOption('#tx-range','month');await p.fill('#search','order batch');await p.waitForTimeout(400);
await p.check('#tx-sel-page');await p.waitForTimeout(100);
const [n,L]=await p.evaluate(()=>[txSel.size,activityList.length]);ok('page select',n>0&&n===L,n+' '+L);
await p.selectOption('#bulk-tag',{label:'Services'});await p.waitForTimeout(100);
ok('bulk tag offers similar',await p.evaluate(()=>!!document.querySelector('#similar-any-form')));await p.click('#similar-any-form [data-action="dismiss"]');await p.waitForTimeout(100);
r=await p.evaluate(()=>[...txSel].every(id=>Biz.tagName(Biz.tagOf(state.transactions.find(t=>t.id===id)))==='Services'));ok('bulk tag',r);
if(SS)await p.screenshot({path:SS+'/bulk.png'});
await p.selectOption('#bulk-tag','__inherit');r=await p.evaluate(()=>[...txSel].every(id=>!state.transactions.find(t=>t.id===id).tag));ok('bulk inherit',r);
const before=await p.evaluate(()=>state.transactions.length);
await p.click('[data-action="bulk-delete"]');await p.click('[data-action="confirm-bulk-delete"]');await p.waitForTimeout(100);
ok('bulk delete',await p.evaluate(()=>state.transactions.length)===before-n);
await p.click('#toast [data-action="undo"]');ok('undo',await p.evaluate(()=>state.transactions.length)===before);
// tag in form
await p.evaluate(()=>{go('activity');transactionForm();});await p.fill('#transaction-form input[name=channel]','Payhip');
ok('tag hint from usual tag',await p.evaluate(()=>document.querySelector('#transaction-form input[name=tag]').placeholder)==='Uses Digital products');
await p.selectOption('#transaction-form select[name=category]','product-sales');await p.fill('#transaction-form input[name=amount]','20');await p.fill('#transaction-form input[name=note]','Pattern sale');
await p.click('#transaction-form button[type=submit]');await p.waitForTimeout(200);
r=await p.evaluate(()=>{const t=state.transactions.find(t=>t.note==='Pattern sale');return [Biz.channelName(t.channel),t.tag||'',Biz.tagName(Biz.tagOf(t)),!!Budget.validate(JSON.parse(JSON.stringify(state)))];});
ok('new channel gets usual tag, tx inherits',JSON.stringify(r)==='["Payhip","","Digital products",true]',JSON.stringify(r));
// YouTube gets Ad revenue; a new tag takes an unused colour; colours can be changed
await p.evaluate(()=>go('settings'));await p.click('[data-action="biz-quick-channel"][data-name="YouTube"]');await p.waitForTimeout(100);
r=await p.evaluate(()=>{const c=Biz.channels().find(c=>c.name==='YouTube');const g=Biz.tags().find(g=>g.id===c.tag);return [g?.name,g?.color,new Set(Biz.tags().map(g=>g.color)).size===Biz.tags().length];});
ok('YouTube → Ad revenue, with its own colour',r[0]==='Ad revenue'&&r[1]>=1&&r[2],JSON.stringify(r));
ok('tag colours are assigned, not chosen',await p.evaluate(()=>!document.querySelector('[data-action="biz-tag-color"]')&&Biz.tagColor(state.tags[0].id).startsWith('var(--tag-')));
// assigning a tag offers it for look-alikes and for future entries
await p.evaluate(()=>go('activity'));await p.selectOption('#tx-range','all');await p.fill('#search','');await p.waitForTimeout(250);
const tid=await p.evaluate(()=>state.transactions.find(t=>/^Order batch/.test(t.note)&&editable(t)).id);
await p.evaluate(id=>transactionForm(id),tid);await p.fill('#transaction-form input[name=tag]','Workshop');await p.click('#transaction-form button[type=submit]');await p.waitForTimeout(200);
r=await p.evaluate(()=>({dlg:document.querySelector('#similar-any-form')?.innerText||'',n:document.querySelectorAll('#similar-any-form .row').length}));
ok('single tag change asks about similar and future',/Tag similar transactions too/.test(await p.evaluate(()=>document.querySelector('dialog[open]')?.innerText||''))&&/future/.test(r.dlg)&&r.n>0,JSON.stringify(r).slice(0,200));
await p.click('#similar-any-form button[type=submit]');await p.waitForTimeout(200);
r=await p.evaluate(()=>{const g=Biz.tags().find(g=>g.name==='Workshop').id;const like=state.transactions.filter(t=>/^Order batch/.test(t.note)&&editable(t));return {all:like.every(t=>Biz.tagOf(t)===g),rule:Object.values(state.tagRules).includes(g)};});
ok('look-alikes tagged and rule remembered',r.all&&r.rule,JSON.stringify(r));
await p.evaluate(()=>quickLog());await p.fill('#quick-log-form [name=entry]','Order batch 42');await p.waitForTimeout(200);await p.click('#quick-log-form button[type=submit]');await p.waitForTimeout(200);
ok('future Quick Log entry gets the tag',await p.evaluate(()=>{const t=state.transactions.at(-1);return t.note==='Order batch'&&t.amount===4200&&Biz.tagName(Biz.tagOf(t))==='Workshop';}));
// bulk: tag a selection, then the offer covers look-alikes outside it
await p.evaluate(()=>{closeModal?.();go('activity');});await p.selectOption('#tx-range','month');await p.fill('#search','restock');await p.waitForTimeout(300);
if(await p.evaluate(()=>activityList.filter(editable).length)){await p.check('#tx-sel-page');await p.selectOption('#bulk-tag',{label:'Services'});await p.waitForTimeout(200);
 ok('bulk tag asks about similar and future',await p.evaluate(()=>!!document.querySelector('#similar-any-form')));
 await p.click('#similar-any-form button[type=submit]');await p.waitForTimeout(200);
 ok('bulk offer applied',await p.evaluate(()=>state.transactions.filter(t=>/^restock/i.test(t.note)&&editable(t)).every(t=>Biz.tagName(Biz.tagOf(t))==='Services')&&Object.keys(state.tagRules).some(k=>/restock/.test(k))));}
await p.evaluate(()=>{txSel.clear();closeModal?.();});
// donut slice opens filtered list
await p.evaluate(()=>go('dashboard'));await p.waitForTimeout(300);
const sl=await p.$('.mix-card .donut-key-row.has-slice');await sl.click();await p.waitForTimeout(200);
await p.click('[data-action="slice-open"]');await p.waitForTimeout(200);
r=await p.evaluate(()=>({n:activityList.length,ok:activityList.every(t=>Budget.type(category(t.category))==='income'),range:txRange}));ok('slice → transactions with channel filter',r.n>0&&r.ok&&r.range==='custom',JSON.stringify(r));
// Monthly Plan: the same screen, without channels or tags
const q=await b.newPage({viewport:{width:1360,height:900}});await q.clock.setFixedTime(MID);q.on('pageerror',e=>errs.push(e.message));const M='file:///home/user/Dashboard-Creator/monthly-plan/app/MonthlyBudgetPlanner.html';
await q.goto(M);await q.evaluate(()=>{localStorage.setItem('jps-monthly-plan-welcome-v1','1');localStorage.setItem('jps-monthly-plan-manual-backup',String(Date.now()));});await q.goto(M);
await q.evaluate(()=>document.querySelector('[data-action="demo"]').click());await q.waitForTimeout(300);await q.evaluate(()=>go('activity'));
ok('mp: all time by default',await q.evaluate(()=>activityList.length===state.transactions.length&&!document.querySelector('#tag-filter')));
await q.selectOption('#tx-range','custom');await q.fill('#tx-from','2026-01-01');await q.dispatchEvent('#tx-from','change');await q.fill('#tx-to','2026-01-31');await q.dispatchEvent('#tx-to','change');
ok('mp: custom dates',await q.evaluate(()=>activityList.length>0&&activityList.every(t=>t.date>='2026-01-01'&&t.date<='2026-01-31')));
const open=await q.evaluate(()=>activityList.filter(editable).length);
if(open){await q.check('#tx-sel-page');const cat=await q.evaluate(()=>state.categories.find(c=>Budget.type(c)==='expense').id);await q.selectOption('#bulk-category',cat);
 ok('mp: bulk category',await q.evaluate(c=>[...txSel].every(id=>state.transactions.find(t=>t.id===id).category===c),cat));}
else ok('mp: closed January cannot be ticked',await q.evaluate(()=>document.querySelector('#tx-sel-page').disabled));
ok('no errors',!errs.length,errs.join('|'));await b.close();})();
