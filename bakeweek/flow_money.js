// Bakeweek Studio's money side in the browser: invoices from orders, purchase orders and vendors, receiving stock,
// payments onto orders and into expenses, and the bank import. Uses the made-up sample bakery.
//   node bakeweek/flow_money.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const path=require('path'),fs=require('fs'),os=require('os');
let fails=0;const ok=(n,c,x='')=>{console.log(`${c?'ok  ':'FAIL'} ${n}${c?'':' '+x}`);if(!c)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}),errs=[];
 const p=await b.newPage({viewport:{width:1400,height:950}});p.on('pageerror',e=>errs.push(e.message));
 await p.clock.setFixedTime(new Date('2026-10-12T12:00:00'));
 const F='file://'+path.resolve(__dirname,'Bakeweek_Studio.html');await p.goto(F);await p.evaluate(()=>localStorage.clear());await p.goto(F);await p.waitForTimeout(800);
 const v=(js,a)=>p.evaluate(js,a);await v(()=>{try{closeTour()}catch{}});
 ok('empty app: Invoices & orders explains the next step',await v(()=>{go('docs');return /No invoices or purchase orders yet/.test(document.querySelector('#content').innerText);}));
 ok('shared engines are the core’s',await v(()=>typeof Docs.totals==='function'&&typeof Autopilot.read==='function'&&!!document.getElementById('shared-money')));
 await v(()=>toggleSample(true));await p.waitForTimeout(800);
 ok('sample: an overdue invoice and an open purchase order',await v(()=>state.docs.some(d=>Docs.status(d,today())==='overdue')&&state.docs.some(d=>d.kind==='po'&&Docs.status(d,today())==='ordered')));
 // bank import pays the overdue invoice and puts the money on its orders
 const inv=await v(()=>{const d=state.docs.find(d=>Docs.status(d,today())==='overdue');return {id:d.id,total:Docs.totals(d).total,orders:d.orders};});
 const csv=path.join(os.tmpdir(),'bw-bank.csv');fs.writeFileSync(csv,`Date,Description,Amount\n2026-10-08,ACH DEPOSIT OLIVE FIG DELI,${(inv.total/100).toFixed(2)}\n2026-10-09,KRAFT PACKAGING ORDER,-42.10\n2026-10-10,Square deposit,310.00\n`);
 await v(()=>go('bank'));await p.setInputFiles('[data-bw-bank]',csv);await p.waitForTimeout(500);
 ok('bank: deposit matched to the invoice, packaging withdrawal as an expense, a sale skipped',await v(()=>{const r=UI.bank.rows,by=s=>r.find(x=>x.desc.includes(s));return by('OLIVE').use==='pay'&&by('KRAFT').use==='exp'&&by('KRAFT').cat==='Packaging'&&by('Square').use==='skip';}));
 const exp0=await v(()=>state.expenses.length);
 await v(()=>document.querySelector('[data-action="bank-import"]').click());await p.waitForTimeout(300);
 ok('bank: the invoice is paid and its orders are paid',await v(a=>{const d=state.docs.find(x=>x.id===a.id);return Docs.status(d,today())==='paid'&&a.orders.every(id=>{const o=state.orders.find(x=>x.id===id);return Math.abs(o.paid-o.lines.reduce((n,l)=>n+l.qty*l.unitPrice,0))<0.01;});},inv));
 ok('bank: the expense was added',await v(n=>state.expenses.length===n+1,exp0));
 await v(()=>go('bank'));await p.setInputFiles('[data-bw-bank]',csv);await p.waitForTimeout(500);
 ok('bank: the same file again: what was imported is marked “imported before” and skipped',await v(()=>UI.bank.rows.filter(r=>r.dup).length===2&&UI.bank.rows.every(r=>r.use==='skip')));
 // removing the payment puts the orders back to unpaid
 await v(a=>{docView(a.id);},inv);await v(()=>document.querySelector('[data-action="doc-unpay"]').click());await p.waitForTimeout(200);
 ok('removing a payment takes it off the orders again',await v(a=>a.orders.every(id=>state.orders.find(x=>x.id===id).paid===0),inv));
 await v(()=>closeModal());
 // receive the open purchase order: stock goes up by the packs
 const po=await v(()=>{const d=state.docs.find(d=>d.kind==='po'&&!d.received);const l=d.lines[0],i=state.ingredients.find(x=>x.id===l.ingredientId);return {id:d.id,ing:i.id,stock:i.stock,add:l.qty*i.packSize};});
 await v(a=>docView(a.id),po);await v(()=>document.querySelector('[data-action="doc-received"]').click());await p.waitForTimeout(200);
 ok('received: the packs go into the pantry',await v(a=>Math.abs(state.ingredients.find(x=>x.id===a.ing).stock-(a.stock+a.add))<1e-6,po));
 const e1=await v(()=>state.expenses.length);
 await v(()=>document.querySelector('#dlg [data-action="doc-pay"]').click());await p.click('#docpay-form button[type=submit]');await p.waitForTimeout(250);
 ok('paying a purchase order adds an expense under the vendor’s kind',await v(a=>{const d=state.docs.find(x=>x.id===a.id),e=state.expenses.find(x=>x.id===d.payments[0].expenseId);return Docs.status(d,today())==='paid'&&state.expenses.length===a.n+1&&e&&e.category==='Ingredients';},{...po,n:e1}));
 // order what's low from a vendor
 await v(()=>{go('vendors');document.querySelector('[data-action="doc-new"][data-low]').click();});await p.waitForTimeout(200);
 ok('“Order what’s low” fills the purchase order with pantry lines',await v(()=>docRows.length>0&&docRows.every(l=>l.ingredientId&&l.qty>0)&&!!document.querySelector('#doc-form [name=party]').value));
 await p.click('#doc-form button[value=send]');await p.waitForTimeout(250);
 ok('saved and marked ordered with the next number',await v(()=>{const d=state.docs.at(-1);return d.kind==='po'&&d.number==='PUR-0003'&&d.sent===today();}));
 // invoice a café's orders
 await v(()=>{go('docs');document.querySelector('[data-action="doc-from-orders"]').click();});await p.waitForTimeout(200);
 await v(()=>{const s=document.querySelector('[data-io="name"]');s.value='Corner Café';s.dispatchEvent(new Event('change',{bubbles:true}));const f=document.querySelector('[data-io="from"]');f.value='2026-10-01';f.dispatchEvent(new Event('change',{bubbles:true}));const t=document.querySelector('[data-io="to"]');t.value='2026-10-31';t.dispatchEvent(new Event('change',{bubbles:true}));});await p.waitForTimeout(200);
 const n=await v(()=>document.querySelectorAll('#invorders-form [name=o]').length);
 ok('invoice from orders lists the café’s unpaid October orders',n>0,String(n));
 await p.click('#invorders-form button[type=submit]');await p.waitForTimeout(200);
 ok('…and opens an invoice with a line per product per order',await v(n=>docDraft.orders.length===n&&docRows.length>=n,n));
 await p.click('#doc-form button[value=send]');await p.waitForTimeout(250);
 ok('those orders can’t be billed twice',await v(()=>billable('Corner Café','2026-10-01','2026-10-31').length===0));
 ok('the backup still validates',await v(()=>{try{C.validateBackup(JSON.parse(JSON.stringify(state)));return true;}catch(e){return e.message;}}));
 ok('print layout has the business, bill-to and total',await v(()=>{const d=state.docs.at(-1),h=docSheet(d);return /INVOICE/.test(h)&&/Corner Café/.test(h)&&/Total/.test(h);}));
 for(const sc of ['docs','vendors','bank','money','pantry'])await v(x=>go(x),sc);
 ok('no page errors',!errs.length,errs.join(' | '));
 await b.close();console.log(fails?`bakeweek money flow: ${fails} failed`:'bakeweek money flow: all checks passed');process.exit(fails?1:0);})();
