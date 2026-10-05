// Accounts in other currencies: a euro statement in a dollar app, converted at each day's ECB rate (the
// rate service is mocked here: no real network) or at a rate you give; account currency changes; and the
// app's own currency changing. Synthetic statements only.
//   node build/fx_flow.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const path=require('path');
const F='file://'+path.resolve(__dirname,'../app/IncomeExpenseTracker.html');
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'ok  ':'FAIL'} ${name}${cond?'':' '+info}`);if(!cond)fails++;};
const file=(name,text)=>({name,mimeType:'text/csv',buffer:Buffer.from(text)});
const EUR=`"Booking Date","Value Date","Partner Name","Partner Iban",Type,"Payment Reference","Account Name","Amount (EUR)","Original Amount","Original Currency","Exchange Rate"
2026-07-22,2026-07-22,Water Co,,"Direct Debit",R1,"Main Account",-40.00,,,
2026-08-10,2026-08-10,Corner Shop,,"Debit Transfer",R2,"Main Account",-10.00,,,
2026-08-25,2026-08-25,Test Employer SL,,Income,R3,"Main Account",1000.00,,,`;
const USD=`Transaction Date,Post Date,Description,Category,Type,Amount,Memo
08/03/2026,08/04/2026,WHOLEFDS MKT #10234 AUSTIN TX,Groceries,Sale,-50.00,
08/05/2026,08/06/2026,NETFLIX.COM,Bills & Utilities,Sale,-15.00,`;
// ECB-style answers: euros per 1 USD on each day (so 1 EUR = 1/0.9 = 1.1111 USD), via the frankfurter layout
const ecb=url=>{const m=url.match(/(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})/),base=/base=([A-Z]{3})|from=([A-Z]{3})/.exec(url),cur=base[1]||base[2],rates={};
 for(let d=new Date(m[1]+'T12:00:00Z');d<=new Date(m[2]+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1))rates[d.toISOString().slice(0,10)]={EUR:cur==='USD'?0.9:1};return JSON.stringify({rates});};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}),p=await b.newPage({viewport:{width:1300,height:900}}),errs=[],hits=[];
 p.on('pageerror',e=>errs.push(e.message));await p.clock.setFixedTime(new Date('2026-09-15T12:00:00'));
 await p.route(/frankfurter/,r=>{hits.push(r.request().url());r.fulfill({status:200,contentType:'application/json',body:ecb(r.request().url())});});
 await p.goto(F);await p.evaluate(()=>{localStorage.clear();localStorage.setItem(P.storage.key+'-welcome-v1','1');localStorage.setItem(P.storage.key+'-manual-backup',String(Date.now()));});await p.goto(F);await p.waitForTimeout(300);
 await p.evaluate(()=>go('import',true));await p.setInputFiles('#ap-files',[file('N26-test.csv',EUR)]);await p.waitForTimeout(400);
 ok('nothing goes online before you allow it',hits.length===0&&await p.evaluate(()=>!!document.querySelector('[data-action="ap-fx-online"]')));
 await p.evaluate(()=>document.querySelector('[data-action="ap-fx-online"]').click());await p.waitForTimeout(800);
 const r1=await p.evaluate(()=>state.transactions.filter(t=>t.fx).map(t=>[t.fx.amount,t.amount,t.fx.src]));
 ok('allowed: each row converted at its day’s ECB rate',r1.length===3&&r1.every(([f,a,s])=>s==='ecb'&&Math.abs(Math.abs(a)-Math.round(Math.abs(f)/0.9))<=1),JSON.stringify(r1));
 ok('only currencies and dates were sent',hits.length>0&&hits.every(u=>/^https:\/\/api\.frankfurter\.(dev|app)\/[^?]*\?(base|from)=[A-Z]{3}&(symbols|to)=EUR$/.test(u)),hits.join(' '));
 ok('the account is marked EUR',await p.evaluate(()=>state.accounts.some(a=>a.cur==='EUR')));
 // a US card file in the same app: no conversion
 await p.setInputFiles('#ap-files',[file('Chase5471_Activity_20260925.csv',USD)]);await p.waitForTimeout(400);
 ok('a dollar statement is not converted',await p.evaluate(()=>state.transactions.filter(t=>!t.fx).length===2));
 // the app switches to euros: the euro account loses its conversion, the dollar card gains one
 await p.evaluate(()=>{go('settings',true);});await p.waitForTimeout(150);
 await p.selectOption('#settings-form select[name=currency]','EUR');await p.evaluate(()=>document.querySelector('#settings-form').requestSubmit());await p.waitForTimeout(1200);
 const r2=await p.evaluate(()=>({eur:state.transactions.filter(t=>t.acct===state.accounts.find(a=>!a.cur||a.cur==='EUR')?.id).map(t=>[t.amount,!!t.fx]),usd:state.transactions.filter(t=>t.fx?.currency==='USD').map(t=>[t.fx.amount,t.amount]),acc:state.accounts.map(a=>[a.name,a.cur||'(app)',!!a.pending])}));
 ok('switching the app to euros converts the dollar card and frees the euro account',r2.usd.length===2&&r2.usd.every(([f,a])=>Math.abs(Math.abs(a)-Math.round(Math.abs(f)*0.9))<=1)&&r2.eur.length===3&&r2.eur.every(([,fx])=>!fx),JSON.stringify(r2));
 // offline choice: a rate you give, and an account's currency changed by hand
 await p.evaluate(()=>{state.settings.fxOnline=false;go('accounts',true);});await p.waitForTimeout(150);
 const card=await p.evaluate(()=>state.accounts.find(a=>a.cur==='USD').id);
 await p.evaluate(id=>{const s=document.querySelector(`.ap-acct-cur[data-cur-acct="${id}"]`);s.value='GBP';s.dispatchEvent(new Event('change',{bubbles:true}));},card);await p.waitForTimeout(300);
 ok('a currency with no rate asks how to convert',await p.evaluate(()=>!!document.querySelector('#cur-rate')));
 await p.fill('#cur-rate','1.2');await p.evaluate(()=>document.querySelector('[data-action="ap-cur-rate"]').click());await p.waitForTimeout(300);
 ok('your rate converts the account, keeping the statement numbers',await p.evaluate(id=>{const l=state.transactions.filter(t=>t.acct===id);return l.length===2&&l.every(t=>t.fx.currency==='GBP'&&t.fx.src==='rate'&&Math.abs(t.amount)===Math.round(Math.abs(t.fx.amount)*1.2))&&state.accounts.find(a=>a.id===id).cur==='GBP';},card));
 const before=hits.length;
 await p.evaluate(id=>{const s=document.querySelector(`.ap-acct-cur[data-cur-acct="${id}"]`);s.value='EUR';s.dispatchEvent(new Event('change',{bubbles:true}));},card);await p.waitForTimeout(300);
 ok('setting an account to the app’s currency drops the conversion',await p.evaluate(id=>state.transactions.filter(t=>t.acct===id).every(t=>!t.fx&&[5000,1500].includes(Math.abs(t.amount)))&&!state.accounts.find(a=>a.id===id).cur,card));
 ok('with the switch off nothing went online',hits.length===before);
 ok('no page errors',!errs.length,errs.join('|'));
 await b.close();console.log(fails?`${fails} failed`:'fx flow: all checks passed');process.exit(fails?1:0);})();
