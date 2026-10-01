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
// the sample fills every screen
await p.evaluate(()=>document.querySelector('[data-action="demo"]')?.click()||Promise.resolve());
ok('the app made no network requests',net===0,net);
ok('no page errors',!errs.length,errs.join('|'));
await b.close();console.log(fails?`${fails} failed`:'autopilot flow: all checks passed');process.exit(fails?1:0);})();
