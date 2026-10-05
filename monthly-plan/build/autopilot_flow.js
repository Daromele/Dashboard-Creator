// Money Autopilot in the browser: drop statements, see them sorted and paired, settle what needs a
// look, import again without duplicates, delete an import. Synthetic statements only.
//   node build/autopilot_flow.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const path=require('path');
const F='file://'+path.resolve(__dirname,'../app/MoneyAutopilot.html');
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'ok  ':'FAIL'} ${name}${cond?'':' '+info}`);if(!cond)fails++;};
const file=(name,text)=>({name,mimeType:'text/csv',buffer:Buffer.from(text)});
const CARD=`Transaction Date,Post Date,Description,Category,Type,Amount,Memo
09/03/2026,09/04/2026,WHOLEFDS MKT #10234 AUSTIN TX,Groceries,Sale,-84.12,
09/05/2026,09/06/2026,NETFLIX.COM 866-579-7172 CA,Bills & Utilities,Sale,-15.49,
09/09/2026,09/10/2026,BLUE DOOR STUDIO 4421,,Sale,-27.50,
09/11/2026,09/12/2026,BLUE DOOR STUDIO 4421,,Sale,-12.00,
09/20/2026,09/20/2026,Payment Thank You-Mobile,,Payment,412.30,
09/21/2026,09/22/2026,STARBUCKS STORE 12345,Food & Drink,Sale,-6.25,
09/21/2026,09/22/2026,STARBUCKS STORE 12345,Food & Drink,Sale,-6.25,`;
const BANK=`Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
CREDIT,09/01/2026,ACME CORP PAYROLL PPD ID: 9876543210,3120.00,ACH_CREDIT,5200.00,
DEBIT,09/01/2026,AVAIL RENT 3304 PPD ID: 123456,-1850.00,ACH_DEBIT,3350.00,
DEBIT,09/21/2026,CHASE CREDIT CRD AUTOPAY PPD ID: 4760039224,-412.30,ACH_DEBIT,2937.70,
DEBIT,09/25/2026,VENMO PAYMENT 1023334455,-40.00,ACH_DEBIT,2897.70,`;
(async()=>{const b=await chromium.launch(),p=await b.newPage({viewport:{width:1360,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(F);await p.evaluate(()=>{localStorage.clear();localStorage.setItem('jps-money-autopilot-welcome-v1','1');localStorage.setItem('jps-money-autopilot-manual-backup',String(Date.now()));});await p.goto(F);await p.waitForTimeout(300);
ok('an empty app opens on the drop zone',await p.evaluate(()=>!!document.querySelector('#ap-drop.is-big')&&screen==='dashboard'));
let net=0;p.on('request',r=>{if(!r.url().startsWith('file:')&&!r.url().startsWith('data:'))net++;});
await p.evaluate(()=>go('import',true));
await p.setInputFiles('#ap-files',[file('Chase5471_Activity_20260925.csv',CARD),file('Chase4410_Activity_20260930.csv',BANK),file('statement.pdf','%PDF')]);await p.waitForTimeout(500);
const S=await p.evaluate(()=>({n:state.transactions.length,accts:state.accounts.map(a=>a.name+':'+a.kind),toast:$('#toast').innerText}));
ok('both files read, one account each, named from the file',JSON.stringify(S.accts)==='["Chase ••5471:card","Chase ••4410:bank"]',JSON.stringify(S.accts));
ok('every line added, both coffees kept',S.n===11,S.n);
ok('the toast counts what was added and what needs a look',/11 transactions added · 3 need a look/.test(S.toast),S.toast);
ok('a PDF is refused with what to do instead',await p.evaluate(()=>/Download the CSV version/.test(document.querySelector('.ap-report').innerText)));
const T=await p.evaluate(()=>state.transactions.map(t=>[t.note,t.category,t.amount,t.auto?.why,!!t.auto?.look,!!t.auto?.pair]));
const by=n=>T.filter(t=>t[0]===n);
ok('card payment and checking autopay are paired and not counted',by('Payment Thank You')[0]?.[1]==='card-payoff'&&by('Payment Thank You')[0][5]&&T.filter(t=>t[1]==='card-payoff').length===2&&T.filter(t=>t[1]==='card-payoff').every(t=>t[5]),JSON.stringify(T.filter(t=>t[1]==='card-payoff')));
ok('paycheck, rent and known shops sorted',by('Acme Payroll')[0]?.[1]==='salary'&&by('Rent')[0]?.[1]==='housing'&&by('Whole Foods')[0]?.[1]==='groceries'&&by('Netflix')[0]?.[1]==='streaming',JSON.stringify(T));
ok('no long numbers stored',await p.evaluate(()=>!state.transactions.some(t=>/\d{6,}/.test((t.raw||'')+t.note))));
const tot=await p.evaluate(()=>{const t=Budget.totals(state,'2026-09');return [t.income.actual,t.expense.actual];});
ok('September: money in and spending, card payments left out',JSON.stringify(tot)===JSON.stringify([312000,8412+1549+2750+1200+625+625+185000+4000]),JSON.stringify(tot));
// needs a look: one choice settles both Blue Door lines and becomes a rule
await p.evaluate(()=>go('inbox',true));await p.waitForTimeout(150);
ok('needs a look groups the same place together',await p.evaluate(()=>document.querySelectorAll('table.ap-look tbody tr').length===2&&/2 transactions/.test(document.querySelector('table.ap-look').innerText)));
await p.evaluate(()=>{const sel=[...document.querySelectorAll('[data-look]')].find(x=>/blue door/.test(x.dataset.look));sel.value='shopping';sel.dispatchEvent(new Event('change',{bubbles:true}));});await p.waitForTimeout(200);
ok('both Blue Door lines moved, and remembered',await p.evaluate(()=>state.transactions.filter(t=>t.note==='Blue Door Studio').every(t=>t.category==='shopping'&&!t.auto.look)&&state.categoryRules['blue door studio']==='shopping'));
await p.evaluate(()=>{const sel=document.querySelector('[data-look]');sel.value='gifts';sel.dispatchEvent(new Event('change',{bubbles:true}));});await p.waitForTimeout(200);
ok('a Venmo payment is settled alone, with no rule',await p.evaluate(()=>state.transactions.find(t=>t.note==='Venmo').category==='gifts'&&!state.categoryRules.venmo&&!state.transactions.some(t=>t.auto?.look)));
// the same files again, plus an overlapping later statement: only the new line comes in
await p.evaluate(()=>go('import',true));
await p.setInputFiles('#ap-files',[file('Chase5471_Activity_20260925.csv',CARD),file('Chase5471_Activity_20261005.csv',CARD.split('\n').slice(0,1).concat(CARD.split('\n').slice(5),['10/02/2026,10/03/2026,BLUE DOOR STUDIO 4421,,Sale,-8.00,']).join('\n'))]);await p.waitForTimeout(400);
const R=await p.evaluate(()=>({n:state.transactions.length,toast:$('#toast').innerText,acc:state.accounts.length,bd:state.transactions.filter(t=>t.note==='Blue Door Studio').map(t=>t.category+':'+t.auto.why)}));
ok('repeats are skipped, the new line is added to the same account',R.n===12&&R.acc===2,JSON.stringify(R));
ok('the learned rule sorts the new Blue Door line',R.bd.length===3&&R.bd.includes('shopping:your rule'),JSON.stringify(R.bd));
ok('the report says what was already there',await p.evaluate(()=>/already here, skipped/.test(document.querySelector('.ap-report').innerText)));
// rename an account, delete the last import
await p.evaluate(()=>{const i=document.querySelector('.ap-acct-name');i.value='Sapphire card';i.dispatchEvent(new Event('change',{bubbles:true}));});await p.waitForTimeout(150);
ok('an account can be renamed',await p.evaluate(()=>state.accounts.some(a=>a.name==='Sapphire card')));
const before=await p.evaluate(()=>state.transactions.length);
await p.evaluate(()=>document.querySelector('[data-action="ap-batch-del"]').click());await p.waitForTimeout(100);await p.click('[data-action="ap-batch-del-ok"]');await p.waitForTimeout(150);
ok('deleting an import removes only its transactions',await p.evaluate(n=>state.transactions.length===n-1,before));
// screens render with data
for(const v of ['dashboard','recurring','activity','annual','insights']){await p.evaluate(v=>go(v,true),v);await p.waitForTimeout(100);}
ok('dashboard shows the month kept and the accounts card',await p.evaluate(()=>{go('dashboard',true);return /money picture/i.test(document.querySelector('h1').innerText)&&!!document.querySelector('.hero');}));
// a backup round trip keeps accounts and sorting
const kept=await p.evaluate(()=>{const v=Budget.validate(JSON.parse(JSON.stringify(state)));return v.accounts.length===2&&v.transactions.every(t=>t.acct)&&v.transactions.some(t=>t.auto?.pair);});
ok('a backup keeps accounts, pairs and sorting',kept);
// each file is its own import: delete one, the other stays
await p.evaluate(()=>go('import',true));
await p.setInputFiles('#ap-files',[file('Discover_1111.csv',`Trans. Date,Post Date,Description,Amount,Category
09/12/2026,09/12/2026,TARGET 00012345,25.00,Merchandise
09/13/2026,09/13/2026,SHELL OIL 1234,30.00,Gasoline`),file('Citi_2222.csv',`Status,Date,Description,Debit,Credit
Cleared,09/14/2026,CVS PHARMACY 123,12.00,`)]);await p.waitForTimeout(400);
const two=await p.evaluate(()=>[...document.querySelectorAll('[data-action="ap-batch-del"]')].map(b=>b.closest('tr').innerText.replace(/\s+/g,' ')));
ok('each file has its own line in Imports',two.some(r=>/Discover_1111\.csv/.test(r)&&/2 transactions/.test(r))&&two.some(r=>/Citi_2222\.csv/.test(r)&&/1 transaction/.test(r)),JSON.stringify(two));
await p.evaluate(()=>[...document.querySelectorAll('[data-action="ap-batch-del"]')].find(b=>/Discover_1111/.test(b.closest('tr').innerText)).click());await p.waitForTimeout(100);
await p.click('[data-action="ap-batch-del-ok"]');await p.waitForTimeout(200);
ok('deleting one file keeps the other',await p.evaluate(()=>!state.transactions.some(t=>/Target|Shell/.test(t.note)&&t.date.startsWith('2026-09-1'))&&state.transactions.some(t=>t.note==='CVS'&&t.category==='health')&&![...document.querySelectorAll('[data-action="ap-batch-del"]')].some(b=>/Discover_1111/.test(b.closest('tr').innerText))&&[...document.querySelectorAll('[data-action="ap-batch-del"]')].some(b=>/Citi_2222/.test(b.closest('tr').innerText))));
// savings and investments: a savings file pairs with checking and counts as saved; a positions file is a balance
const SAVF=`Date,Description,Amount,Balance
09/16/2026,Transfer from Checking,400.00,8400.00
09/30/2026,Interest Paid,12.34,8412.34`;
const BANK2=`Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
DEBIT,09/16/2026,Online Transfer to SAV ...7720,-400.00,ACCT_XFER,2497.70,`;
const POSF=`Account Number,Account Name,Symbol,Description,Quantity,Last Price,Current Value
Z12345678,Individual,VTI,VANGUARD TOTAL STOCK MARKET ETF,40,$310.00,$12400.00
244556677,ROTH IRA,FXAIX,FIDELITY 500 INDEX,25,$212.00,$5300.00`;
await p.evaluate(()=>go('import',true));
await p.setInputFiles('#ap-files',[file('Ally_Savings_7720.csv',SAVF),file('Chase4410_Activity_20260917.csv',BANK2),file('Portfolio_Positions_2026-09-30.csv',POSF)]);await p.waitForTimeout(400);
const W=await p.evaluate(()=>{const sav=state.accounts.find(a=>a.kind==='savings'),tx=state.transactions.filter(t=>t.date==='2026-09-16'&&Math.abs(t.amount)===40000);
 return {kinds:state.accounts.map(a=>a.kind).sort().join(','),cats:tx.map(t=>t.category).sort().join(','),paired:tx.every(t=>t.auto?.pair),bal:(state.balances||{})[sav?.id]?.at(-1),invest:state.accounts.filter(a=>['invest','retire'].includes(a.kind)).map(a=>a.name+':'+state.balances[a.id].at(-1).value),toast:$('#toast').innerText};});
ok('savings, brokerage and IRA accounts are created from their files',['bank','card','invest','retire','savings'].every(k=>W.kinds.split(',').includes(k)),W.kinds);
ok('the move to savings is paired: saved on the checking side, not counted on the savings side',W.cats==='emergency,own-transfer'&&W.paired,JSON.stringify(W));
ok('the savings balance is read from its file',W.bal?.value===841234&&W.bal.date==='2026-09-30',JSON.stringify(W.bal));
ok('a positions file gives each account its balance',JSON.stringify(W.invest)==='["Individual ••5678:1240000","Roth IRA ••6677:530000"]',JSON.stringify(W.invest));
ok('the toast counts the balances',/2 balances updated|3 balances updated/.test(W.toast),W.toast);
// a 401(k) typed in by hand, and the Savings & investments screen
await p.evaluate(()=>go('invest',true));await p.waitForTimeout(150);
await p.evaluate(()=>document.querySelector('[data-action="ap-bal-new"]').click());await p.waitForTimeout(100);
await p.fill('#ap-bal-form [name=name]','Acme 401(k)');await p.fill('#ap-bal-form [name=value]','41,250.00');await p.click('#ap-bal-form button[type=submit]');await p.waitForTimeout(200);
ok('a 401(k) balance can be typed in',await p.evaluate(()=>{const a=state.accounts.find(x=>x.name==='Acme 401(k)');return a?.kind==='retire'&&state.balances[a.id][0].value===4125000&&state.balances[a.id][0].how==='manual';}));
ok('Net worth is what you own less what you owe',await p.evaluate(()=>{const n=+document.querySelector('.hero .hero-big').dataset.count,txt=document.querySelector('.hero-side').innerText;return /Credit cards/.test(txt)&&/Retirement/.test(txt)&&Number.isInteger(n);}));
ok('a card without a balance is estimated and asks for one',await p.evaluate(()=>[...document.querySelectorAll('.notice')].some(n=>/card balances? (is|are) estimated/.test(n.innerText))&&/Estimate: charges since the last payment/.test(document.querySelector('#content').innerText)));
const card=await p.evaluate(()=>state.accounts.find(a=>a.kind==='card').id);
await p.evaluate(id=>document.querySelector(`[data-action="ap-bal"][data-id="${id}"]`).click(),card);await p.waitForTimeout(100);
await p.fill('#ap-bal-form [name=value]','500');await p.fill('#ap-bal-form [name=date]','2026-09-15');await p.click('#ap-bal-form button[type=submit]');await p.waitForTimeout(200);
const owed=await p.evaluate(id=>{const t=state.transactions.filter(x=>x.acct===id&&x.date>'2026-09-15'&&x.date<=Budget.today());const f=t.reduce((n,x)=>n+(Budget.type(state.categories.find(c=>c.id===x.category))==='income'?x.amount:-x.amount),0);return [50000-f,/Kept current with new transactions/.test(document.querySelector('#content').innerText)];},card);
ok('a typed card balance is kept current by the statements after it',owed[1]&&await p.evaluate(v=>[...document.querySelectorAll('table.ap-rec tbody tr')].some(r=>r.innerText.includes(fmt(v))),owed[0]),JSON.stringify(owed));

// paychecks: one usual stub fills in each paycheck
await p.evaluate(()=>go('paychecks',true));await p.waitForTimeout(150);
await p.evaluate(()=>document.querySelector('[data-action="ap-stub-usual"]').click());await p.waitForTimeout(100);
for(const [k,v] of [['gross','4470'],['fed','450'],['state','170'],['ss','279'],['medicare','65'],['k401','270'],['health','96'],['hsa','20']])await p.fill(`#ap-stub-form [name=${k}]`,v);
ok('the stub form shows the take-home as you type',await p.evaluate(()=>/\$3,120\.00/.test($('#ap-stub-net').innerText)));
await p.click('#ap-stub-form button[type=submit]');await p.waitForTimeout(200);
ok('the paycheck is broken down from the usual stub',await p.evaluate(()=>{const r=document.querySelector('table.ap-rec tbody tr');return /Usual stub/.test(r.innerText)&&/\$4,470\.00/.test(r.innerText)&&+document.querySelector('.hero .hero-big').dataset.count===447000;}));
// the sample fills every screen
await p.evaluate(()=>document.querySelector('[data-action="demo"]')?.click()||Promise.resolve());
// statement categories you don't have become suggestions; bulk rename, move, select-same; merge categories
await p.evaluate(()=>{if(demo)document.querySelector('[data-action="demo-exit"],[data-action="exit-demo"]')?.click();go('import',true);});await p.waitForTimeout(200);
await p.setInputFiles('#ap-files',[file('Wells_3333.csv',`Date,Description,Category,Amount
09/02/2026,BRIGHT KIDS ACADEMY,Tuition,-120.00
09/09/2026,BRIGHT KIDS ACADEMY,Tuition,-120.00
09/16/2026,TUTOR TIME LLC,Tuition,-60.00
09/20/2026,ZQX HOLDINGS 4411,Misc,-15.00`)]);await p.waitForTimeout(400);
await p.evaluate(()=>go('inbox',true));await p.waitForTimeout(200);
ok('needs a look suggests the bank’s own category',await p.evaluate(()=>/Categories from your statements/.test(document.querySelector('#content').innerText)&&/Tuition/.test(document.querySelector('.ap-suggest').innerText)));
await p.evaluate(()=>document.querySelector('[data-action="ap-sug-new"]').click());await p.waitForTimeout(200);
ok('creating it files those transactions and remembers it',await p.evaluate(()=>{const c=state.categories.find(x=>x.name==='Tuition');return !!c&&state.transactions.filter(t=>/Bright Kids|Tutor Time/.test(t.note)).every(t=>t.category===c.id&&!t.auto.look&&t.amount>0)&&state.importMap.tuition===c.id;}));
await p.evaluate(()=>{go('activity',true);});await p.waitForTimeout(200);
await p.evaluate(()=>{const id=state.transactions.find(t=>t.note==='Bright Kids Academy').id;txSel.clear();txSel.add(id);render();});await p.waitForTimeout(100);
await p.evaluate(()=>document.querySelector('[data-action="ap-bulk-same"]').click());await p.waitForTimeout(100);
ok('select all from the same place',await p.evaluate(()=>txSel.size===2));
await p.fill('#bulk-rename','Bright Kids');await p.evaluate(()=>document.querySelector('[data-action="ap-bulk-rename"]').click());await p.waitForTimeout(200);
ok('rename a place everywhere, remembered for next time',await p.evaluate(()=>state.transactions.filter(t=>t.note==='Bright Kids').length===2&&state.nameRules['bright kids academy']==='Bright Kids'));
await p.evaluate(()=>go('import',true));await p.setInputFiles('#ap-files',[file('Wells_3333.csv',`Date,Description,Category,Amount
09/23/2026,BRIGHT KIDS ACADEMY,Tuition,-120.00`)]);await p.waitForTimeout(400);
ok('the next statement uses the new name and the remembered category',await p.evaluate(()=>{const t=state.transactions.find(x=>x.date==='2026-09-23'&&/Bright/.test(x.note));return t?.note==='Bright Kids'&&state.categories.find(c=>c.id===t.category)?.name==='Tuition';}));
await p.evaluate(()=>{go('activity',true);txSel.clear();state.transactions.filter(t=>t.note==='Bright Kids').forEach(t=>txSel.add(t.id));render();});await p.waitForTimeout(100);
const target=await p.evaluate(()=>state.accounts.find(a=>a.kind==='bank').id);
await p.selectOption('#bulk-acct',target);await p.waitForTimeout(200);
ok('move the selected to another account',await p.evaluate(id=>state.transactions.filter(t=>t.note==='Bright Kids').every(t=>t.acct===id),target));
await p.evaluate(()=>{txSel.clear();categoryForm(state.categories.find(c=>c.name==='Tuition').id);});await p.waitForTimeout(100);
await p.selectOption('#cat-merge-into','kids-pets');await p.evaluate(()=>document.querySelector('[data-action="cat-merge"]').click());await p.waitForTimeout(200);
ok('merge a category into another',await p.evaluate(()=>{const c=state.categories.find(x=>x.name==='Tuition');return c.archived&&state.transactions.filter(t=>t.note==='Bright Kids').every(t=>t.category==='kids-pets')&&state.importMap.tuition==='kids-pets';}));
// every table sorts and searches; the year tiles open their transactions
await p.evaluate(()=>{document.querySelector('[data-action="demo"]')?.click();});await p.waitForTimeout(300);
await p.evaluate(()=>go('annual',true));await p.waitForTimeout(200);
await p.evaluate(()=>[...document.querySelector('.annual-table').tHead.rows[0].cells].find(h=>/spending/i.test(h.innerText)).click());await p.waitForTimeout(100);
ok('a table sorts by a heading click, totals stay last',await p.evaluate(()=>{const r=[...document.querySelector('.annual-table').tBodies[0].rows],v=r.map(x=>x.cells[2].innerText).filter(x=>x!=='—').slice(0,-1).map(x=>+x.replace(/[^\d.]/g,''));return v.every((x,i)=>!i||v[i-1]>=x)&&/To date/.test(r.at(-1).innerText);}));
await p.evaluate(()=>go('recurring',true));await p.waitForTimeout(200);await p.fill('.tbl-search','netflix');await p.waitForTimeout(100);
ok('a table filters by search',await p.evaluate(()=>{const t=document.querySelector('.tbl-tools').nextElementSibling.querySelector('table');return [...t.tBodies[0].rows].filter(r=>!r.hidden).every(r=>/netflix/i.test(r.innerText))&&[...t.tBodies[0].rows].some(r=>r.hidden);}));
await p.evaluate(()=>render());ok('search survives a re-render',await p.evaluate(()=>document.querySelector('.tbl-search').value==='netflix'));
await p.evaluate(()=>go('annual',true));await p.waitForTimeout(200);
ok('the year shows monthly averages',await p.evaluate(()=>/Money in \/ month/i.test(document.querySelector('.kpis').innerText)&&/Cash flow \/ month/i.test(document.querySelector('.kpis').innerText)));
await p.evaluate(()=>document.querySelector('[data-action="kpi-year"][data-type="saving"]').click());await p.waitForTimeout(200);
ok('the saved tile opens the year’s saving transactions',await p.evaluate(()=>screen==='activity'&&filterType==='saving'&&txFrom.endsWith('-01-01')&&txTo.endsWith('-12-31')));
// alerts after an import: a double charge and a fee show in the report and on the dashboard
await p.evaluate(()=>go('import',true));await p.setInputFiles('#ap-files',[file('Citi_9090.csv',`Date,Description,Amount
09/14/2026,CORNER GYM MEMBERSHIP,-42.00
09/15/2026,CORNER GYM MEMBERSHIP,-42.00
09/16/2026,MONTHLY SERVICE FEE,-12.00`)]);await p.waitForTimeout(400);
ok('the import report lists what deserves a look',await p.evaluate(()=>{const c=document.querySelector('.ap-alerts');return !!c&&/double charge/i.test(c.innerText)&&/Fees and interest/i.test(c.innerText);}));
await p.evaluate(()=>go('dashboard',true));await p.waitForTimeout(200);
ok('the dashboard shows the alerts too',await p.evaluate(()=>/double charge/i.test(document.querySelector('.ap-alerts')?.innerText||'')),await p.evaluate(()=>screen+' '+demo+' '+document.querySelector('main')?.innerText.slice(0,200)));
await p.evaluate(()=>document.querySelector('.ap-alert-fees summary').click());await p.evaluate(()=>document.querySelector('.ap-alert-fees [data-action="ap-alert-hide"]').click());await p.waitForTimeout(150);
ok('an alert can be hidden',await p.evaluate(()=>!document.querySelector('.ap-alert-fees')&&!!document.querySelector('.ap-alert-double')));
// settings: categories and rules edit in bulk; rules edit in place
await p.evaluate(()=>{state.categoryRules={'corner gym':state.categories.find(c=>!c.archived&&Budget.type(c)==='expense').id,'blue door':state.categories.find(c=>!c.archived&&Budget.type(c)==='expense').id};go('settings',true);});await p.waitForTimeout(200);
await p.evaluate(()=>{const k=document.querySelector('.rule-key[data-key="corner gym"]');k.value='Corner Gym Plus';k.dispatchEvent(new Event('change',{bubbles:true}));});await p.waitForTimeout(150);
ok('a rule’s words can be edited',await p.evaluate(()=>!!state.categoryRules['corner gym plus']&&!state.categoryRules['corner gym']));
const other=await p.evaluate(()=>state.categories.filter(c=>!c.archived&&Budget.type(c)==='expense')[1].id);
await p.evaluate(v=>{const s=document.querySelector('.rule-cat[data-key="blue door"]');s.value=v;s.dispatchEvent(new Event('change',{bubbles:true}));},other);await p.waitForTimeout(150);
ok('a rule’s category can be changed',await p.evaluate(v=>state.categoryRules['blue door']===v,other));
await p.evaluate(()=>{const card=document.querySelector('.rule-key').closest('section');const a=card.querySelector('.sel-all');a.checked=true;a.dispatchEvent(new Event('change',{bubbles:true}));});
ok('select all shows the bulk bar',await p.evaluate(()=>{const b=document.querySelector('.sel-bar[data-sel="rule"]');return !b.hidden&&/2 selected/.test(b.innerText);}));
await p.evaluate(()=>document.querySelector('[data-action="rule-bulk-delete"]').click());await p.waitForTimeout(150);
ok('rules delete in bulk',await p.evaluate(()=>!Object.keys(state.categoryRules).length));
await p.evaluate(()=>{state.categories.push({id:'zz1',name:'Spare one',group:state.categories.find(c=>Budget.type(c)==='expense').group},{id:'zz2',name:'Spare two',group:state.categories.find(c=>Budget.type(c)==='expense').group});render();
 ['zz1','zz2'].forEach(id=>{const x=document.querySelector(`.sel-pick[value="${id}"]`);x.checked=true;x.dispatchEvent(new Event('change',{bubbles:true}));});document.querySelector('[data-action="cat-bulk-archive"]').click();});await p.waitForTimeout(150);
ok('categories archive in bulk',await p.evaluate(()=>['zz1','zz2'].every(id=>category(id).archived)));
await p.evaluate(()=>{['zz1','zz2'].forEach(id=>{const x=document.querySelector(`.sel-pick[value="${id}"]`);x.checked=true;x.dispatchEvent(new Event('change',{bubbles:true}));});document.querySelector('[data-action="cat-bulk-delete"]').click();});await p.waitForTimeout(150);
await p.evaluate(()=>document.querySelector('[data-action="cat-bulk-delete-ok"]').click());await p.waitForTimeout(150);
ok('unused categories delete in bulk',await p.evaluate(()=>!category('zz1')&&!category('zz2')));
// accounts: type change offers a swap; archive leaves net worth; year over year renders
await p.evaluate(()=>go('accounts',true));await p.waitForTimeout(200);
const acc=await p.evaluate(()=>{const a=state.accounts.find(a=>a.kind==='card'&&state.transactions.some(t=>t.acct===a.id));return a.id;});
const amtsBefore=await p.evaluate(id=>state.transactions.filter(t=>t.acct===id).map(t=>t.amount),acc);
await p.evaluate(id=>{const s=document.querySelector(`[data-acct-kind="${id}"]`);s.value='bank';s.dispatchEvent(new Event('change',{bubbles:true}));},acc);await p.waitForTimeout(150);
ok('changing card to checking offers a swap',await p.evaluate(()=>!!document.querySelector('[data-action="ap-acct-flip-ok"]')));
await p.evaluate(()=>document.querySelector('[data-action="ap-acct-flip-ok"]').click());await p.waitForTimeout(150);
ok('the swap reverses that account’s money in and out',await p.evaluate(([id,b])=>{const a=state.transactions.filter(t=>t.acct===id).map(t=>t.amount);return state.accounts.find(x=>x.id===id).kind==='bank'&&a.every((v,i)=>v===-b[i]);},[acc,amtsBefore]));
await p.evaluate(id=>document.querySelector(`[data-action="ap-acct-arch"][data-id="${id}"]`).click(),acc);await p.waitForTimeout(150);
ok('an account can be archived',await p.evaluate(id=>state.accounts.find(x=>x.id===id).archived===true,acc));
await p.evaluate(()=>go('years',true));await p.waitForTimeout(200);
ok('year over year shows a row per year',await p.evaluate(()=>/Year by year/.test(document.querySelector('main').innerText)&&document.querySelectorAll('[data-action="years-open"]').length>=1));
await p.evaluate(()=>document.querySelector('[data-action="years-open"]').click());await p.waitForTimeout(150);
ok('a year opens its overview',await p.evaluate(()=>screen==='annual'));
// bills that vary (electricity) and move around the month still show under bills
await p.evaluate(()=>{const c=state.categories.find(c=>c.group==='bills'&&!c.archived).id,today=Budget.today(),mo=n=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-n);return d.toISOString().slice(0,7);};
 [[1,'03',4210],[2,'19',9875],[3,'08',15230],[4,'25',6120]].forEach(([n,day,a],i)=>state.transactions.push({id:'zel'+i,date:mo(n)+'-'+day,category:c,amount:a,note:'Volt Power Co',acct:state.accounts[0]?.id}));render();go('recurring',true);});await p.waitForTimeout(150);
ok('a varying electricity bill is listed under bills',await p.evaluate(()=>[...document.querySelectorAll('table.ap-rec')].some(t=>/Volt Power Co/.test(t.innerText)&&/Bills/i.test(t.closest('section').querySelector('h2').innerText))));
await p.evaluate(()=>{state.transactions=state.transactions.filter(t=>!t.id.startsWith('zel'));});
// the edit dialog names the account; the money picture has money out and money in side by side
ok('the edit dialog shows the account it came from',await p.evaluate(()=>{const t=state.transactions.find(t=>t.acct&&writable(t.date.slice(0,7)));transactionForm(t.id);const pill=document.querySelector('#transaction-form .acct-pill')?.innerText||'';closeModal();return pill.includes(state.accounts.find(a=>a.id===t.acct).name);}));
await p.evaluate(()=>go('dashboard',true));await p.waitForTimeout(150);
ok('the money picture shows where it went and where it came from',await p.evaluate(()=>/Where it went/.test(document.querySelector('main').innerText)&&/Where it came from/.test(document.querySelector('main').innerText)&&document.querySelectorAll('.kpis-lead .kpi').length===4));
// a statement in euros: asks for a rate, converts, keeps the euro amount; a water bill every two months is a bill
{const mo=n=>{const d=new Date(Date.UTC(2026,8-n,1));return d.toISOString().slice(0,7);};
 const EUR=`"Booking Date","Value Date","Partner Name","Partner Iban",Type,"Payment Reference","Account Name","Amount (EUR)","Original Amount","Original Currency","Exchange Rate"
${mo(8)}-27,${mo(8)}-27,E.M.A.S.E.S.A.,,"Direct Debit",REF1,"Main Account",-50.45,,,
${mo(6)}-24,${mo(6)}-24,E.M.A.S.E.S.A.,,"Direct Debit",REF2,"Main Account",-70.60,,,
${mo(4)}-26,${mo(4)}-26,E.M.A.S.E.S.A.,,"Direct Debit",REF3,"Main Account",-70.60,,,
${mo(2)}-22,${mo(2)}-22,E.M.A.S.E.S.A,,"Direct Debit",REF4,"Main Account",-43.74,,,
${mo(0)}-10,${mo(0)}-10,Test Employer SL,,Income,NOMINA,"Main Account",1500.00,,,`;
 await p.evaluate(()=>go('import',true));await p.setInputFiles('#ap-files',[file('N26-test-eur.csv',EUR)]);await p.waitForTimeout(400);
 ok('a euro statement asks for a rate first',await p.evaluate(()=>!!document.querySelector('.ap-fx-rate')&&/in EUR/.test(document.querySelector('.ap-report').innerText)));
 await p.fill('.ap-fx-rate','1.1');await p.evaluate(()=>document.querySelector('[data-action="ap-fx-go"]').click());await p.waitForTimeout(500);
 const fx=await p.evaluate(()=>{const l=state.transactions.filter(t=>t.fx?.currency==='EUR');const w=l.find(t=>/EMASESA/.test(t.note)&&t.fx.amount===4374);return {n:l.length,w:w&&[w.amount,w.fx.amount,category(w.category).name],rate:state.fxRates.EUR,cur:state.accounts.find(a=>a.id===w?.acct)?.cur};});
 ok('euro rows are converted and keep their euro amount',fx.n===5&&fx.w&&fx.w[0]===Math.round(4374*1.1)&&fx.w[1]===4374&&fx.rate===1.1&&fx.cur==='EUR',JSON.stringify(fx));
 ok('EMASESA is sorted as a utility',/Utilities/.test(fx.w?.[2]||''),JSON.stringify(fx));
 await p.evaluate(()=>go('recurring',true));await p.waitForTimeout(150);
 ok('a bill every two months shows under bills',await p.evaluate(()=>[...document.querySelectorAll('table.ap-rec')].some(t=>/EMASESA/.test(t.innerText)&&/2 months/i.test(t.innerText))),await p.evaluate(()=>JSON.stringify([Budget.today(),state.transactions.filter(t=>/EMASESA/.test(t.note)).map(t=>[t.date,t.amount,t.category,Autopilot.keyOf(t.note)])])));
 await p.evaluate(()=>go('import',true));await p.setInputFiles('#ap-files',[file('N26-test-eur.csv',EUR)]);await p.waitForTimeout(400);
 ok('the same euro file again adds nothing',await p.evaluate(()=>state.transactions.filter(t=>t.fx?.currency==='EUR').length===5));
 await p.evaluate(()=>{const a=state.accounts.find(a=>a.cur==='EUR');go('accounts',true);const i=document.querySelector(`.ap-acct-rate[data-rate-acct="${a.id}"]`);i.value='1.2';i.dispatchEvent(new Event('change',{bubbles:true}));});await p.waitForTimeout(150);
 ok('changing an account’s rate converts it again',await p.evaluate(()=>{const w=state.transactions.find(t=>/EMASESA/.test(t.note)&&t.fx?.amount===4374);return w&&w.amount===Math.round(4374*1.2)&&state.accounts.find(a=>a.cur==='EUR').name!=='1.2';}));
 // the account pill opens that account's transactions
 const pill=await p.evaluate(()=>{const t=state.transactions.find(t=>t.fx&&writable(t.date.slice(0,7)));transactionForm(t.id);document.querySelector('#transaction-form .acct-pill').click();return {s:screen,acct:filterAcct===t.acct,all:activityList.every(x=>x.acct===t.acct),n:activityList.length};});
 ok('the account pill shows that account’s transactions',pill.s==='activity'&&pill.acct&&pill.all&&pill.n>=5,JSON.stringify(pill));
 await p.evaluate(()=>{filterAcct='';state.transactions=state.transactions.filter(t=>!t.fx);});}
// swap money in and out for just the selected rows
{const r=await p.evaluate(()=>{showTransactions('all');txRange='all';render();const t=activityList.find(t=>t.acct&&editable(t));const before=t.amount;txSel.clear();txSel.add(t.id);render();const btn=document.querySelector('[data-action="ap-bulk-swap"]');if(!btn)return ['nobtn',screen,!!document.querySelector('.bulk-bar'),document.querySelector('.bulk-bar')?.innerText.slice(0,200)];btn.click();return [before,state.transactions.find(x=>x.id===t.id).amount];});
 ok('swap in/out flips only the selected rows',r[1]===-r[0],JSON.stringify(r));await p.evaluate(()=>{txSel.clear();});}
ok('the app made no network requests',net===0,net);
{const ins=await p.evaluate(()=>{go('insights',true);return document.querySelector('#content').innerText;});
 ok('insights compare the month with your usual one, with no budget-plan wording',/What stands out/.test(ins)&&/usual/.test(ins)&&!/over plan|Planned income|Contribution gap/i.test(ins),ins.slice(0,200));}
ok('no page errors',!errs.length,errs.join('|'));
await b.close();console.log(fails?`${fails} failed`:'autopilot flow: all checks passed');process.exit(fails?1:0);})();
