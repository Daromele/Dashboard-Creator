// Platform statements and other currencies, end to end in the browser, for all three editions.
//   node import_flow.js [screenshot dir]
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));const path=require('path'),OUT=process.argv[2];
const APP=f=>'file://'+path.resolve(__dirname,'../app/'+f);
const ok=(n,c,x='')=>{console.log((c?'ok   ':'FAIL ')+n+(c?'':' '+x));if(!c)process.exitCode=1;};
const ETSY=`Date,Type,Title,Info,Currency,Amount,"Fees & Taxes",Net,"Tax Details"
"Sep 20, 2026",Marketing,"Etsy Ads","Etsy Ads on Sep 19",USD,--,-$1.17,-$1.17,--
"Sep 19, 2026",Fee,"Transaction fee: Pattern","Order #1",USD,--,-$0.31,-$0.31,--
"Sep 19, 2026",Fee,"Shipping label: USPS","Order #2",USD,--,-$4.10,-$4.10,--
"Sep 19, 2026",Sale,"Payment for Order #1",,USD,$16.08,--,$16.08,--
"Sep 18, 2026",Deposit,"$37.35 sent to your bank account",,USD,--,--,--,--`;
const BANK=`Date,Description,Amount
2026-09-21,ETSY INC DEPOSIT,37.35
2026-09-22,GROCERY MART,-20.00`;
const PAYPAL=`"Date","Time","TimeZone","Name","Type","Status","Currency","Gross","Fee","Net","Transaction ID"
"09/02/2026","10:00:00","PDT","Jane Client","Invoice Payment","Completed","USD","500.00","-14.80","485.20","1"
"09/04/2026","10:00:00","PDT","","General Withdrawal","Completed","USD","-400.00","0.00","-400.00","3"`;
(async()=>{const b=await chromium.launch(),p=await b.newPage({viewport:{width:1360,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
const F=APP('ProfitPlanBusiness.html');
await p.goto(F);await p.evaluate(()=>{localStorage.setItem('jps-profit-plan-welcome-v1','1');localStorage.setItem('jps-profit-plan-manual-backup',String(Date.now()));});await p.goto(F);await p.waitForTimeout(300);
// 1. Etsy statement into a USD planner
await p.evaluate(t=>startCSV(t,'etsy_statement_2026_9.csv'),ETSY);await p.waitForTimeout(200);
const map=await p.evaluate(()=>({platform:csvSession.platform?.name,rows:csvSession.rows.length,txt:document.querySelector('#content').innerText,cm:csvSession.options.categoryMap}));
ok('etsy recognised',map.platform==='Etsy'&&map.rows===4&&/Etsy statement recognised/.test(map.txt),JSON.stringify(map).slice(0,300));
ok('etsy kinds default to categories',map.cm['etsy · sales']==='product-sales'&&map.cm['etsy · fees']==='platform-fees'&&map.cm['etsy · ads & promotion']==='advertising'&&map.cm['etsy · shipping labels']==='postage',JSON.stringify(map.cm));
if(OUT)await p.screenshot({path:OUT+'/imp-map.png',fullPage:true});
await p.click('[data-action="csv-preview"]');await p.waitForTimeout(200);
if(OUT)await p.screenshot({path:OUT+'/imp-review.png',fullPage:true});
await p.click('[data-action="csv-import"] >> nth=0');await p.waitForTimeout(200);
const st=await p.evaluate(()=>({tx:state.transactions.map(t=>[t.category,t.amount,t.channel?Biz.channelName(t.channel):'']),src:state.platformSources,qm:Object.keys(state.quickMemory).length,pl:Budget.plMonth(state,'2026-09')}));
ok('etsy imported as gross + fees',JSON.stringify(st.tx.map(x=>x.slice(0,2)).sort())===JSON.stringify([['advertising',117],['platform-fees',31],['postage',410],['product-sales',1608]].sort()),JSON.stringify(st.tx));
ok('net profit equals Etsy net',st.pl.net===1608-117-31-410,String(st.pl.net));
ok('platform remembered, no Quick Log clutter',st.src?.etsy?.name==='Etsy'&&st.qm===0,JSON.stringify(st.src)+' '+st.qm);
// 2. bank file: the Etsy deposit is a transfer
await p.evaluate(t=>startCSV(t,'bank.csv'),BANK);await p.click('[data-action="csv-preview"]');await p.waitForTimeout(200);
const bank=await p.evaluate(()=>({rows:csvSession.preview.map(r=>[r.note,r.category,r.payout||'']),txt:document.querySelector('#content').innerText}));
ok('bank deposit from Etsy → payouts transfer',bank.rows[0][1]==='platform-payout'&&bank.rows[0][2]==='Etsy'&&/look like money moving to or from Etsy|looks like money moving to or from Etsy/.test(bank.txt),JSON.stringify(bank.rows));
ok('other bank rows untouched',bank.rows[1][1]!=='platform-payout');
await p.evaluate(()=>{csvSession=null;});
// 3. PayPal in USD into a CAD planner: rates box, conversion, original kept
await p.evaluate(()=>{state.settings.currency='CAD';});
await p.evaluate(t=>startCSV(t,'Download.CSV'),PAYPAL);await p.click('[data-action="csv-preview"]');await p.waitForTimeout(200);
let r=await p.evaluate(()=>({errs:csvSession.preview.filter(r=>r.error).map(r=>r.error),txt:document.querySelector('.fx-box')?.innerText||''}));
ok('USD rows wait for a rate',r.errs.length===2&&/add a rate/.test(r.errs[0])&&/1 USD/.test(r.txt),JSON.stringify(r));
await p.fill('[data-fx-rate="USD"]','1.36');await p.dispatchEvent('[data-fx-rate="USD"]','change');await p.waitForTimeout(200);
r=await p.evaluate(()=>csvSession.preview.filter(r=>!r.skip).map(r=>[r.category,r.amount,r.fx]));
ok('converted at the rate, original kept',r.some(x=>x[1]===68000&&x[2]?.amount===50000&&x[2]?.currency==='USD')&&r.some(x=>x[1]===2013&&x[2]?.amount===1480),JSON.stringify(r));
if(OUT)await p.screenshot({path:OUT+'/imp-fx.png',fullPage:true});
await p.click('[data-action="csv-import"] >> nth=0');await p.waitForTimeout(200);
const fx=await p.evaluate(()=>({rate:state.fxRates?.USD,withFx:state.transactions.filter(t=>t.fx).length,valid:!!Budget.validate(JSON.parse(JSON.stringify(state)))}));
ok('rate remembered, entries keep USD, state validates',fx.rate===1.36&&fx.withFx===2&&fx.valid,JSON.stringify(fx));
// 4. a purchase in USD through the transaction form: the rate fills in the CAD amount
await p.evaluate(()=>{go('activity');transactionForm();});await p.waitForTimeout(150);
await p.evaluate(()=>document.querySelector('.fx-details').open=true);
await p.selectOption('#transaction-form select[name=fxCurrency]','USD');await p.fill('#transaction-form input[name=fxAmount]','100');
ok('rate prefilled and CAD amount worked out',await p.evaluate(()=>document.querySelector('#transaction-form input[name=fxRate]').value==='1.36'&&document.querySelector('#transaction-form input[name=amount]').value==='136.00'));
await p.selectOption('#transaction-form select[name=category]','software');await p.fill('#transaction-form input[name=note]','Figma annual');
await p.click('#transaction-form button[type=submit]');await p.waitForTimeout(150);
const ft=await p.evaluate(()=>state.transactions.find(t=>t.note==='Figma annual'));
ok('form saves the USD original',ft&&ft.amount===13600&&ft.fx?.currency==='USD'&&ft.fx?.amount===10000,JSON.stringify(ft));
ok('list shows the original amount',await p.evaluate(()=>[...document.querySelectorAll('.fx-orig')].some(e=>/USD\s?100\.00/.test(e.textContent))));
// 5. an invoice in USD: shown in USD with a CAD estimate; paid at what actually arrived
await p.evaluate(()=>go('invoices'));await p.click('[data-action="biz-add-invoice"]');
await p.fill('#biz-invoice-form input[name=client]','Lumen Paints');await p.fill('#biz-invoice-form input[name=amount]','1000');
await p.selectOption('#biz-invoice-form select[name=currency]','USD');
await p.fill('#biz-invoice-form input[name=issued]','2026-09-01');await p.fill('#biz-invoice-form input[name=due]','2026-09-30');
await p.click('#biz-invoice-form button[type=submit]');await p.waitForTimeout(150);
const inv=await p.evaluate(()=>({v:state.invoices.at(-1),R:Budget.receivables(state),txt:document.querySelector('#content').innerText}));
ok('USD invoice counted at the rate',inv.v.currency==='USD'&&inv.R.total===136000&&/USD\s?1,000\.00/.test(inv.txt)&&/≈ CA\$1,360\.00/.test(inv.txt),JSON.stringify({v:inv.v,t:inv.R.total}));
await p.click('[data-action="biz-pay"] >> nth=-1');await p.waitForTimeout(100);
ok('pay dialog asks what arrived, prefilled',await p.evaluate(()=>document.querySelector('#biz-pay-form input[name=received]').value==='1360.00'));
await p.fill('#biz-pay-form input[name=received]','1350.00');await p.click('#biz-pay-form button[type=submit]');await p.waitForTimeout(150);
const paid=await p.evaluate(()=>{const v=state.invoices.at(-1),t=state.transactions.find(t=>t.id===v.paid?.tx);return {t,rate:state.fxRates.USD,valid:!!Budget.validate(JSON.parse(JSON.stringify(state)))};});
ok('paid at the amount received, USD kept, rate updated',paid.t?.amount===135000&&paid.t?.fx?.amount===100000&&paid.rate===1.35&&paid.valid,JSON.stringify(paid));
if(OUT)await p.screenshot({path:OUT+'/fx-invoices.png',fullPage:true});
ok('no page errors',!errs.length,errs.join('|'));
// Monthly Plan: an Etsy side hustle lands in Side hustle, fees included
const m=await b.newPage();const merr=[];m.on('pageerror',e=>merr.push(e.message));const MF=APP('MonthlyBudgetPlanner.html');
await m.goto(MF);await m.evaluate(()=>{localStorage.setItem('jps-monthly-plan-welcome-v1','1');localStorage.setItem('jps-monthly-plan-manual-backup',String(Date.now()));});await m.goto(MF);await m.waitForTimeout(300);
await m.evaluate(t=>startCSV(t,'etsy_statement_2026_9.csv'),ETSY);await m.click('[data-action="csv-preview"]');await m.click('[data-action="csv-import"] >> nth=0');await m.waitForTimeout(150);
const mt=await m.evaluate(()=>({cats:[...new Set(state.transactions.map(t=>t.category))],sum:state.transactions.reduce((n,t)=>n+t.amount,0)}));
ok('monthly plan: Etsy sale and fees land in Side hustle, netting to what arrived',mt.cats.join()==='side'&&mt.sum===1608-117-31-410,JSON.stringify(mt));
ok('monthly plan: no page errors',!merr.length,merr.join('|'));
// Creator Plan: YouTube earnings are ad revenue, tagged with the YouTube stream; withheld tax is tax paid
const c=await b.newPage();const cerr=[];c.on('pageerror',e=>cerr.push(e.message));const CF=APP('CreatorPlan.html');
await c.goto(CF);await c.evaluate(()=>{localStorage.setItem('jps-creator-plan-welcome-v1','1');localStorage.setItem('jps-creator-plan-manual-backup',String(Date.now()));});await c.goto(CF);await c.waitForTimeout(300);
await c.evaluate(()=>{state.channels=[{id:'yt',name:'YouTube'}];});
await c.evaluate(t=>startCSV(t,'adsense-transactions.csv'),`Date,Description,Amount
2026-09-21,"YouTube Partner Earnings (Aug 1 - 31, 2026)",1840.55
2026-09-21,"Tax withholding - US (YouTube)",-92.03
2026-09-25,"Payment - EFT",-1748.52`);
await c.click('[data-action="csv-preview"]');await c.click('[data-action="csv-import"] >> nth=0');await c.waitForTimeout(150);
const ct=await c.evaluate(()=>state.transactions.map(t=>[t.category,t.amount,t.channel||'']).sort());
ok('creator plan: YouTube earnings → ad revenue on the YouTube stream, withheld tax → tax paid, payment skipped',JSON.stringify(ct)===JSON.stringify([['ad-revenue',184055,'yt'],['est-tax',9203,'yt']]),JSON.stringify(ct));
ok('creator plan: no page errors',!cerr.length,cerr.join('|'));
await b.close();})();
