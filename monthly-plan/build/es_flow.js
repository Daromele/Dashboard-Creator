// Autónomo Plan in the browser: IVA on the transaction form, an invoice with IVA and withholding
// paid in full, bulk IVA, Quick Log taking the category's IVA, and the Spanish tax screens.
//   node es_flow.js [screenshot dir]
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const OUT=process.argv[2];
const ok=(n,c,x='')=>{console.log((c?'ok   ':'FAIL ')+n+(c?'':' '+x));if(!c)process.exitCode=1;};
(async()=>{const b=await chromium.launch(),p=await b.newPage({viewport:{width:1360,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
const F='file:///home/user/Dashboard-Creator/monthly-plan/app/AutonomoPlan.html';
await p.goto(F);await p.evaluate(()=>{localStorage.setItem('jps-autonomo-plan-welcome-v1','1');localStorage.setItem('jps-autonomo-plan-manual-backup',String(Date.now()));});await p.goto(F);await p.waitForTimeout(300);
ok('new planner in euros',await p.evaluate(()=>state.settings.currency==='EUR'&&state.settings.dateFormat==='dmy'));
// 1. a client payment: €1,060 in the bank = €1,000 base + 21% IVA − 15% withholding
await p.evaluate(()=>transactionForm());
ok('IVA starts at the category’s rate',await p.evaluate(()=>document.querySelector('#tx-vat').value==='2100'));
await p.fill('#transaction-form input[name=amount]','1060');await p.selectOption('#transaction-form select[name=ret]','1500');
ok('split shown live',/Base €1,000\.00.*IVA €210\.00.*withholding €150\.00/.test(await p.evaluate(()=>document.querySelector('#vat-split').innerText)));
await p.selectOption('#transaction-form select[name=category]','software');
ok('changing category resets IVA to its rate',await p.evaluate(()=>document.querySelector('#tx-vat').value==='2100'));
await p.selectOption('#transaction-form select[name=category]','insurance');
ok('an exempt category sets 0%',await p.evaluate(()=>document.querySelector('#tx-vat').value==='0'));
await p.selectOption('#transaction-form select[name=category]','services');await p.selectOption('#transaction-form select[name=vat]','2100');
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
await p.evaluate(()=>{closeModal?.();document.querySelector('[data-action="demo"]').click();});await p.waitForTimeout(400);
await p.evaluate(()=>go('tax'));const tax=await p.evaluate(()=>document.querySelector('#content').innerText);
ok('quarters screen',/Modelo 303/.test(tax)&&/Modelo 130/.test(tax)&&/cuota de autónomos/.test(tax)&&/Income tax, roughly/.test(tax)&&/Due 20 Oct/.test(tax));
if(OUT)await p.screenshot({path:OUT+'/es-quarters.png',fullPage:true});
await p.evaluate(()=>go('taxlines'));const sum=await p.evaluate(()=>document.querySelector('#content').innerText);
ok('year-end summary',/Operating income/.test(sum)&&/General allowance, 5%/.test(sum)&&/IVA for the year/.test(sum));
await p.evaluate(()=>go('dashboard'));ok('dashboard shows the quarter',/IVA, IRPF & money owed/.test(await p.evaluate(()=>document.querySelector('#content').innerText)));
await p.evaluate(()=>go('settings'));ok('Spanish settings',await p.evaluate(()=>!!document.querySelector('#biz-es-form')));
ok('no page errors',!errs.length,errs.join('|'));await b.close();})();
