// The app learning from you and catching what people get wrong, in the browser. Synthetic files only.
//   node build/smart_flow.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const path=require('path');
const F='file://'+path.resolve(__dirname,'../app/MoneyAutopilot.html');
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'ok  ':'FAIL'} ${name}${cond?'':' '+info}`);if(!cond)fails++;};
const file=(name,text)=>({name,mimeType:'text/csv',buffer:Buffer.from(text)});
const months=['04','05','06','07','08','09'];
// a checking account: pay from an employer the app has never heard of, rent by Zelle to a person, a gym it learns
const BANK='Date,Description,Amount\n'+months.flatMap(m=>[`${m}/01/2026,ZELLE TO MARIA GARCIA,-1450.00`,`${m}/12/2026,NORTHWIND TRADERS DES:PR ID:88,2210.40`,`${m}/26/2026,NORTHWIND TRADERS DES:PR ID:88,2210.40`,`${m}/05/2026,ZELLE TO JORDAN LEE SAVINGS,-200.00`,`${m}/09/2026,BLUE HERON CLIMBING,-${m==='09'?'0':'6'}5.00`,`${m}/14/2026,CORNER BAKERY 22,-12.0${+m%3}`]).join('\n');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}),p=await b.newPage({viewport:{width:1300,height:900}}),errs=[];let net=0;
 p.on('pageerror',e=>errs.push(e.message));p.on('request',r=>{if(!/^(file|data):/.test(r.url()))net++;});await p.clock.setFixedTime(new Date('2026-09-30T12:00:00'));
 await p.goto(F);await p.evaluate(()=>{localStorage.clear();localStorage.setItem(P.storage.key+'-welcome-v1','1');localStorage.setItem(P.storage.key+'-manual-backup',String(Date.now()));});await p.goto(F);await p.waitForTimeout(300);
 await p.evaluate(()=>{state.settings.name='Jordan Lee';});
 // the gym: you file it once by hand… twice
 await p.evaluate(()=>go('import',true));await p.setInputFiles('#ap-files',[file('Checking4410.csv',BANK.split('\n').filter((l,i)=>i===0||!/BLUE HERON/.test(l)||/^0[45]/.test(l)).join('\n'))]);await p.waitForTimeout(500);
 const cat=n=>p.evaluate(n=>{const t=state.transactions.filter(t=>t.note===n||(t.raw||'').includes(n));return [...new Set(t.map(x=>category(x.category)?.name))].join('|');},n);
 ok('pay from an unknown employer, twice a month, is pay',/Paycheck/i.test(await cat('NORTHWIND')),await cat('NORTHWIND'));
 ok('the same large Zelle to a person early each month is rent',/Rent/i.test(await cat('MARIA GARCIA')),await cat('MARIA GARCIA'));
 ok('money to your own name is a transfer',/(between|transfer|own)/i.test(await cat('JORDAN LEE')),await cat('JORDAN LEE'));
 const gym=await p.evaluate(()=>{const fit=state.categories.find(c=>/gym/i.test(c.name)).id;state.transactions.filter(t=>/BLUE HERON/.test(t.raw||'')).forEach(t=>{t.category=fit;t.amount=Math.abs(t.amount);delete t.auto.look;});save();return fit;});
 await p.setInputFiles('#ap-files',[file('Checking4410.csv',BANK)]);await p.waitForTimeout(500);
 ok('a place you filed before is filed the same way, by itself',await p.evaluate(g=>state.transactions.filter(t=>/BLUE HERON/.test(t.raw||'')).every(t=>t.category===g&&!t.auto?.look),gym));
 ok('the report says what it learned',await p.evaluate(()=>/from your own history/.test(document.querySelector('.ap-report')?.innerText||'')));
 // a renamed copy of the same statement joins its account instead of making a new one
 const nAcc=await p.evaluate(()=>state.accounts.length);
 await p.setInputFiles('#ap-files',[file('my bank download (1).csv',BANK)]);await p.waitForTimeout(400);
 ok('a renamed copy of a statement adds no account and nothing twice',await p.evaluate(n=>state.accounts.length===n,nAcc));
 // a Mint export: one file, two accounts
 await p.setInputFiles('#ap-files',[file('transactions.csv',`"Date","Description","Original Description","Amount","Transaction Type","Category","Account Name"
"9/03/2026","Whole Foods","WHOLEFDS MKT 10234","45.10","debit","Groceries","Chase Sapphire"
"9/05/2026","Shell","SHELL OIL 5544","38.20","debit","Gas & Fuel","Chase Sapphire"
"9/15/2026","Acme Payroll","ACME CORP PAYROLL","2500.00","credit","Paycheck","Ally Checking"
"9/16/2026","Payment Thank You","PAYMENT THANK YOU","300.00","credit","Credit Card Payment","Chase Sapphire"`)]);await p.waitForTimeout(500);
 const mint=await p.evaluate(()=>state.accounts.filter(a=>/Sapphire|Ally Checking/.test(a.name)).map(a=>[a.name,a.kind,state.transactions.filter(t=>t.acct===a.id).length]));
 ok('a Mint export becomes one account per account in it',mint.length===2&&mint.some(([n,k,c])=>/Sapphire/.test(n)&&k==='card'&&c===3)&&mint.some(([n,k,c])=>/Ally/.test(n)&&k==='bank'&&c===1),JSON.stringify(mint));
 // pending lines wait
 await p.setInputFiles('#ap-files',[file('Amex.csv','Date,Description,Amount,Status\n09/20/2026,BLUE BOTTLE COFFEE,6.50,Posted\n09/29/2026,LYFT RIDE,14.00,Pending')]);await p.waitForTimeout(400);
 ok('pending lines are left for later, and the report says so',await p.evaluate(()=>!state.transactions.some(t=>/LYFT/.test(t.raw||''))&&/1 pending/.test(document.querySelector('.ap-report').innerText)));
 // watching: pay that hasn't arrived, and a month with nothing from a busy account
 const w=await p.evaluate(()=>{const acct=state.accounts.find(a=>a.name.includes('4410')).id;
  // September's pay is removed (as if it didn't come), and newer lines exist past its day
  state.transactions=state.transactions.filter(t=>!(/NORTHWIND/.test(t.raw||'')&&t.date>='2026-09-01'));
  state.transactions.push({id:'zz1',date:'2026-09-29',category:'groceries',amount:2000,note:'Market',acct});
  state.transactions=state.transactions.filter(t=>!(t.acct===acct&&t.date>='2026-06-02'&&t.date<='2026-07-15'));go('dashboard',true);return document.querySelector('.ap-alerts')?.innerText||'';});
 ok('pay that usually comes by now is flagged',/Pay not seen yet/.test(w),w.slice(0,300));
 ok('a gap in a busy account suggests a missing statement',/statement may be missing/.test(w),w.slice(0,300));
 await p.evaluate(()=>go('cuts',true));const idea=await p.evaluate(()=>{const b=document.querySelector('[data-action="cut-no"]');if(!b)return null;const a=b.dataset.arg;b.click();return [a,cutIdeas(cutsData()).some(i=>i.arg===a)];});
 ok('a declined idea is not suggested again',idea&&idea[1]===false,JSON.stringify(idea));
 ok('the app made no network requests',net===0);ok('no page errors',!errs.length,errs.join('|'));
 await b.close();console.log(fails?`${fails} failed`:'smart flow: all checks passed');process.exit(fails?1:0);})();
