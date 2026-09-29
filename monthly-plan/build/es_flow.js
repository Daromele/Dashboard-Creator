// Autónomo Plan in the browser. Part 1, records (the default): an income record in dollars with its
// euro rate and evidence, duplicate for next month, an expense with a business share, the missing-
// evidence warning, CSV and the gestor report. Part 2, with the IVA & IRPF estimates switched on:
// IVA on the transaction form, an invoice with IVA and withholding paid in full, bulk IVA, Quick Log
// taking the category's IVA, and the Spanish tax screens.
//   node es_flow.js [screenshot dir]
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const OUT=process.argv[2];
const ok=(n,c,x='')=>{console.log((c?'ok   ':'FAIL ')+n+(c?'':' '+x));if(!c)process.exitCode=1;};
(async()=>{const b=await chromium.launch(),p=await b.newPage({viewport:{width:1360,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
const F='file:///home/user/Dashboard-Creator/monthly-plan/app/AutonomoPlan.html';
await p.goto(F);await p.evaluate(()=>{localStorage.setItem('jps-autonomo-plan-welcome-v1','1');localStorage.setItem('jps-autonomo-plan-manual-backup',String(Date.now()));});await p.goto(F);await p.waitForTimeout(300);
ok('new planner in euros',await p.evaluate(()=>state.settings.currency==='EUR'&&state.settings.dateFormat==='dmy'));
ok('estimates on by default, next to the records',await p.evaluate(()=>!!document.querySelector('.navlink[data-go="tax"]')&&!!document.querySelector('.navlink[data-go="report"]')));
// R1. income in dollars: USD 100 gross, 8 fees at 0.9 → payout €82.80
await p.evaluate(()=>go('income',true));await p.click('#content [data-action="biz-rec-add-income"]');
await p.fill('#rec-payer','Upwork');await p.selectOption('#rec-cur','USD');await p.fill('#rec-rate','0.9');
await p.fill('#rec-form [name=gross]','100');await p.fill('#rec-form [name=fees]','8');await p.fill('#rec-form [name=note]','March payout');
await p.fill('#rec-form [name=evUrl]','https://drive.google.com/file/d/abc/view');await p.waitForTimeout(80);
ok('payout and euros worked out live',await p.evaluate(()=>document.querySelector('#rec-form [name=payout]').value==='92.00'&&/payout €82\.80/.test(document.querySelector('#rec-eur').innerText)));
await p.click('#rec-form button[type=submit]');await p.waitForTimeout(150);
let r=await p.evaluate(()=>state.transactions.find(t=>t.note==='March payout'));
ok('income record saved in USD with euros',r&&r.amount===8280&&r.rec.cur==='USD'&&r.rec.gross===10000&&r.rec.fees===800&&r.rec.evidence.length===1,JSON.stringify(r));
ok('the payer is remembered',await p.evaluate(()=>Biz.channels().some(c=>c.name==='Upwork')));
ok('the USD rate is remembered',await p.evaluate(()=>state.fxRates.USD===0.9));
// R2. duplicate for next month: same payer and amounts, a month later, no evidence yet
await p.click(`[data-action="biz-rec-dup"][data-id="${r.id}"]`);await p.waitForTimeout(80);
ok('duplicate moves a month on',await p.evaluate(d=>document.querySelector('#rec-form [name=date]').value.slice(0,7)===Budget.shift(d.slice(0,7),1)&&document.querySelector('#rec-payer').value==='Upwork',r.date));
await p.evaluate(d=>{document.querySelector('#rec-form [name=date]').value=d;},r.date);await p.click('#rec-form button[type=submit]');await p.waitForTimeout(150);
ok('duplicate saved as missing evidence',await p.evaluate(()=>state.transactions.filter(t=>t.note==='March payout').map(t=>Budget.recOf(state,t).status).sort().join()==='complete,missing'));
// R2b. a Spanish client: €1,000 + 21% IVA − 15% withholding → payout €1,060, and the set-aside shows it
await p.click('#content [data-action="biz-rec-add-income"]');await p.selectOption('#rec-form [name=act]','prof');
ok('IVA follows the activity',await p.evaluate(()=>document.querySelector('#rec-vat').value==='2100'));
await p.fill('#rec-payer','Estudio Norte');await p.selectOption('#rec-form [name=ret]','1500');await p.fill('#rec-form [name=gross]','1000');await p.fill('#rec-form [name=note]','Factura 7');await p.waitForTimeout(80);
ok('payout includes IVA less withholding',await p.evaluate(()=>document.querySelector('#rec-form [name=payout]').value==='1060.00'));
await p.click('#rec-form button[type=submit]');await p.waitForTimeout(150);
ok('saved with IVA and withholding',await p.evaluate(()=>{const t=state.transactions.find(t=>t.note==='Factura 7');return t&&t.amount===106000&&t.rec.vat===2100&&t.rec.ret===1500;}));
await p.evaluate(()=>go('dashboard',true));const db=await p.evaluate(()=>document.querySelector('#content').innerText);
ok('dashboard shows the monthly set-aside',/Set aside each month/.test(db)&&/This quarter so far/.test(db));
await p.evaluate(()=>go('tax',true));ok('tax screen has the month table',await p.evaluate(()=>!!document.querySelector('.set-aside table')&&/Modelo 303/.test(document.querySelector('#content').innerText)));
await p.evaluate(()=>{const t=state.transactions.find(t=>t.note==='Factura 7');state.transactions=state.transactions.filter(x=>x!==t);save();render();});
// R3. an expense in euros used half for the business
await p.evaluate(()=>go('expenses',true));await p.click('#content [data-action="biz-rec-add-expense"]');
await p.fill('#rec-form [name=vendor]','Movistar');await p.selectOption('#rec-form [name=category]','software');await p.fill('#rec-form [name=amount]','60');await p.fill('#rec-form [name=pct]','50');
await p.fill('#rec-form [name=evUrl]','https://drive.google.com/file/d/xyz/view');await p.click('#rec-form button[type=submit]');await p.waitForTimeout(150);
const rep=await p.evaluate(()=>{const d=Budget.today();return Budget.gestorReport(state,d.slice(0,4)+'-01-01',d.slice(0,4)+'-12-31').totals;});
ok('report totals: gross, fees, deductible, result',rep.gross===18000&&rep.fees===1440&&rep.expenses===6000&&rep.deductible===3000&&rep.result===18000-1440-3000,JSON.stringify(rep));
await p.evaluate(()=>go('dashboard',true));ok('dashboard warns about missing evidence',/1 record is missing supporting evidence/.test(await p.evaluate(()=>document.querySelector('#content').innerText)));
await p.evaluate(()=>go('income',true));
let [cdl]=await Promise.all([p.waitForEvent('download'),p.click('[data-action="biz-rec-csv-income"]')]);
let csv=require('fs').readFileSync(await cdl.path(),'utf8');ok('income CSV has original and euro columns',/USD/.test(csv)&&/82\.80/.test(csv)&&/drive\.google\.com/.test(csv),csv.slice(0,300));
await p.evaluate(()=>go('report',true));const rv=await p.evaluate(()=>document.querySelector('#content').innerText);
ok('report screen previews the document',/Evidence appendix/i.test(rv)&&/Upwork/.test(rv));
if(OUT)await p.screenshot({path:OUT+'/es-report.png',fullPage:true});
// part 2: switch the estimates on, from a clean slate
await p.evaluate(()=>{state.transactions=[];state.settings.es.estimates=true;save();render();});
// 1. a client payment: €1,060 in the bank = €1,000 base + 21% IVA − 15% withholding
ok('estimate screens in the sidebar',await p.evaluate(()=>!!document.querySelector('.navlink[data-go="tax"]')));
await p.evaluate(()=>transactionForm());await p.selectOption('#transaction-form select[name=category]','inc-prof');
ok('IVA starts at the category’s rate',await p.evaluate(()=>document.querySelector('#tx-vat').value==='2100'));
await p.fill('#transaction-form input[name=amount]','1060');await p.selectOption('#transaction-form select[name=ret]','1500');
ok('split shown live',/Base €1,000\.00.*IVA €210\.00.*withholding €150\.00/.test(await p.evaluate(()=>document.querySelector('#vat-split').innerText)));
await p.selectOption('#transaction-form select[name=category]','software');
ok('changing category resets IVA to its rate',await p.evaluate(()=>document.querySelector('#tx-vat').value==='2100'));
await p.selectOption('#transaction-form select[name=category]','bank-fees');
ok('an exempt category sets 0%',await p.evaluate(()=>document.querySelector('#tx-vat').value==='0'));
await p.selectOption('#transaction-form select[name=category]','inc-prof');await p.selectOption('#transaction-form select[name=vat]','2100');
await p.fill('#transaction-form input[name=note]','Factura 001');await p.click('#transaction-form button[type=submit]');await p.waitForTimeout(150);
let t=await p.evaluate(()=>state.transactions.find(t=>t.note==='Factura 001'));
ok('saved with IVA and withholding',t&&t.amount===106000&&t.vat===2100&&t.ret===1500,JSON.stringify(t));
ok('P&L counts the base',await p.evaluate(()=>Budget.plMonth(state,selected).revenue.total===100000));
// 2. an invoice: base 2,000, IVA 21%, withholding 15% → 2,120 to be paid
await p.evaluate(()=>go('invoices'));await p.click('[data-action="biz-add-invoice"]');
await p.fill('#biz-invoice-form input[name=client]','Estudio Norte');await p.fill('#biz-invoice-form input[name=amount]','2000');await p.selectOption('#biz-invoice-form select[name=ret]','1500');await p.waitForTimeout(80);
ok('invoice total shown',/to be paid €2,120\.00/.test(await p.evaluate(()=>document.querySelector('#biz-invoice-form #vat-split').innerText)));
await p.click('#biz-invoice-form button[type=submit]');await p.waitForTimeout(150);
ok('receivable at the total',await p.evaluate(()=>Budget.receivables(state).total===212000));
await p.click('[data-action="biz-pay"] >> nth=-1');await p.click('#biz-pay-form button[type=submit]');await p.waitForTimeout(150);
t=await p.evaluate(()=>{const v=state.invoices.at(-1);return state.transactions.find(t=>t.id===v.paid?.tx);});
ok('paid invoice arrives with its IVA and withholding',t&&t.amount===212000&&t.vat===2100&&t.ret===1500,JSON.stringify(t));
// 3. Quick Log takes the category's usual IVA
await p.evaluate(()=>quickLog());await p.fill('#quick-log-form [name=entry]','adobe 24.19');await p.waitForTimeout(150);await p.click('#quick-log-form button[type=submit]');await p.waitForTimeout(150);
t=await p.evaluate(()=>state.transactions.at(-1));ok('Quick Log applies the usual IVA',t.category==='software'&&t.vat===2100,JSON.stringify(t));
// 4. bulk IVA
await p.evaluate(()=>{go('activity');});await p.check('#tx-sel-page');await p.selectOption('#bulk-vat','1000');await p.waitForTimeout(150);
ok('bulk IVA',await p.evaluate(()=>state.transactions.every(t=>t.vat===1000)));
await p.click('#toast [data-action="undo"]');
// 5. the tax screens, with sample data
await p.evaluate(()=>{closeModal?.();document.querySelector('[data-action="demo"]').click();});await p.waitForTimeout(400);await p.evaluate(()=>{state.settings.es.estimates=true;render();});
await p.evaluate(()=>go('tax'));const tax=await p.evaluate(()=>document.querySelector('#content').innerText);
ok('quarters screen',/Modelo 303/.test(tax)&&/Modelo 130/.test(tax)&&/cuota de autónomos/.test(tax)&&/Income tax, roughly/.test(tax)&&/Due 20 Oct/.test(tax));
if(OUT)await p.screenshot({path:OUT+'/es-quarters.png',fullPage:true});
await p.evaluate(()=>go('taxlines'));const sum=await p.evaluate(()=>document.querySelector('#content').innerText);
ok('year-end summary',/Operating income/.test(sum)&&/General allowance, 5%/.test(sum)&&/IVA for the year/.test(sum));
await p.evaluate(()=>go('settings'));ok('Spanish settings',await p.evaluate(()=>!!document.querySelector('#biz-es-form')));
// 6. the checklist: tick an item, export an IVA book, and the back button
await p.evaluate(()=>go('filings'));const ch=await p.evaluate(()=>document.querySelector('#content').innerText);
ok('checklist screen',/Send your gestor/i.test(ch)&&/Modelo 303 · IVA/.test(ch)&&/Modelo 390/.test(ch)&&/Modelo 347/.test(ch)&&/Coming up/.test(ch));
const key=await p.evaluate(()=>document.querySelector('[data-check$=":bank"]:not(:checked)').dataset.check);
await p.check(`[data-check="${key}"]`);await p.waitForTimeout(120);
ok('ticking keeps the date',await p.evaluate(k=>state.checklist[k]===Budget.today(),key));
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-action="biz-es-books"][data-kind="issued"] >> nth=2')]);
const text=require('fs').readFileSync(await dl.path(),'utf8');
ok('IVA book CSV has base, IVA and withholding',/Base,"?IVA rate/.test(text.replace(/"/g,''))&&/Total/.test(text),text.slice(0,200));
if(OUT)await p.screenshot({path:OUT+'/es-checklist.png',fullPage:true});
await p.evaluate(()=>go('dashboard',true));await p.click('button[data-go="filings"].check-next');await p.waitForTimeout(100);
ok('dashboard → checklist shows a back link',await p.evaluate(()=>screen==='filings'&&/Dashboard/.test(document.querySelector('.back-link')?.innerText||'')));
await p.click('.back-link');await p.waitForTimeout(100);
ok('back returns to the dashboard',await p.evaluate(()=>screen==='dashboard'&&!document.querySelector('.back-link')));
await p.click('.navlink[data-go="settings"]');ok('the sidebar starts afresh (no back link)',await p.evaluate(()=>!document.querySelector('.back-link')));
ok('no page errors',!errs.length,errs.join('|'));await b.close();})();
