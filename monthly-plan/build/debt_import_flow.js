// Debt Free Plan: importing statement downloads in the browser. A card CSV, a checking CSV and an
// OFX card file (all fictional) go in; payments, charges and interest come out matched to debts.
//   node build/debt_import_flow.js [screenshot dir]
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const path=require('path'),fs=require('fs'),os=require('os');
const F='file://'+path.resolve(__dirname,'../app/DebtFreePlan.html'),SHOTS=process.argv[2];
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'ok  ':'FAIL'} ${name}${cond?'':' '+info}`);if(!cond)fails++;};
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'debt-import-'));
const put=(n,t)=>{const p=path.join(dir,n);fs.writeFileSync(p,t);return p;};
const card=put('HarborBank_Activity_20260925.csv','Transaction Date,Post Date,Description,Category,Type,Amount,Memo\n09/20/2026,09/21/2026,GROCERY MART #12,Groceries,Sale,-54.20,\n09/15/2026,09/15/2026,AUTOMATIC PAYMENT - THANK,,Payment,250.00,\n09/12/2026,09/12/2026,INTEREST CHARGE:PURCHASES,Fees & Adjustments,Fee,-88.17,\n09/03/2026,09/04/2026,RETURN SHOE STORE,Shopping,Return,25.00,\n08/20/2026,08/21/2026,OLD PURCHASE,Shopping,Sale,-10.00,\n');
const bank=put('Checking4410_Activity.csv','Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #\nDEBIT,09/16/2026,"HARBOR BANK CRD AUTOPAY PPD ID: 99999",-250.00,ACH_DEBIT,1200.00,,\nDEBIT,09/18/2026,"BRIGHTPATH SERVICING LOAN PMT",-210.00,ACH_DEBIT,990.00,,\nDEBIT,09/18/2026,"SUPERMART 0042",-80.10,DEBIT_CARD,909.90,,\nCREDIT,09/19/2026,"ACME CORP PAYROLL",1800.00,ACH_CREDIT,2709.90,,\nDEBIT,09/22/2026,"TOYOTA FINANCIAL PMT",-340.00,ACH_DEBIT,2369.90,,\n');
const ofx=put('store-card.qfx','OFXHEADER:100\nDATA:OFXSGML\n<OFX><SIGNONMSGSRSV1><SONRS><FI><ORG>Maple Store Card</FI></SONRS></SIGNONMSGSRSV1><CREDITCARDMSGSRSV1><CCSTMTTRNRS><CCSTMTRS><CURDEF>USD<CCACCTFROM><ACCTID>6011000000009012</CCACCTFROM><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260910<TRNAMT>-42.50<NAME>MAPLE STORE 101</STMTTRN><STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260915<TRNAMT>60.00<NAME>PAYMENT THANK YOU</STMTTRN></BANKTRANLIST><LEDGERBAL><BALAMT>-1180.40<DTASOF>20260930</LEDGERBAL></CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1></OFX>');
const pdf=put('statement.pdf','%PDF-1.4\n%fake\n');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}),p=await b.newPage({viewport:{width:1300,height:900}}),errs=[];let net=0;
 p.on('pageerror',e=>errs.push(e.message));p.on('request',r=>{if(!/^(file|data|blob):/.test(r.url()))net++;});await p.clock.setFixedTime(new Date('2026-10-03T12:00:00'));
 await p.goto(F);await p.evaluate(()=>localStorage.clear());await p.goto(F);await p.waitForTimeout(400);
 await p.evaluate(()=>{try{closeWelcome()}catch{};commit(()=>{state.debts=[{id:'v',name:'Visa card',lender:'Harbor Bank',kind:'card',balance:500000,apr:2400,min:3500,minMode:'card',since:'2026-09-01',start:500000},{id:'m',name:'Maple store card',kind:'card',balance:120000,apr:2899,min:4000,minMode:'fixed',since:'2026-09-01',start:120000},{id:'s',name:'Student loan',lender:'Brightpath Servicing',kind:'student',balance:2000000,apr:499,min:21000,minMode:'fixed',since:'2026-09-01',start:2000000},{id:'k',name:'Car loan',kind:'auto',balance:900000,apr:649,min:34000,minMode:'fixed',since:'2026-09-01',start:900000}];},'debts');});
 ok('Import statements is in the sidebar',await p.evaluate(()=>!!document.querySelector('#nav [data-go="debtimport"]')));
 await p.evaluate(()=>go('debtimport'));await p.waitForTimeout(200);
 ok('the empty screen invites a drop',await p.evaluate(()=>!!document.querySelector('#debt-drop.is-big')&&document.querySelectorAll('.imp-how .card').length===3));
 if(SHOTS)await p.screenshot({path:SHOTS+'/imp_empty.png',fullPage:true});
 await p.setInputFiles('#debt-files',[card,bank,ofx,pdf]);await p.waitForFunction(()=>document.querySelectorAll('.imp-file').length===4,null,{timeout:4000}).catch(()=>{});
 const r1=await p.evaluate(()=>({files:[...document.querySelectorAll('.imp-file')].map(c=>c.innerText.split('\n')[0]),err:document.querySelector('.imp-file.is-error')?.innerText||'',rows:document.querySelectorAll('.imp-table tbody tr').length,pick:document.querySelectorAll('.imp-table .pill.warn').length,cardDebt:document.querySelector('[data-imp-file]')?.value,checked:document.querySelectorAll('.imp-table [data-imp-on]:checked').length}));
 ok('four files: three read, the PDF explained',r1.files.length===4&&/PDF/.test(r1.err),JSON.stringify(r1));
 ok('the card file is matched to Visa by its lender',r1.cardDebt==='v',JSON.stringify(r1));
 ok('the Toyota payment waits for a debt',r1.pick===1,JSON.stringify(r1));
 const kinds=await p.evaluate(()=>Debts.importState().entries.map(e=>e.file.slice(0,6)+':'+e.kind+':'+e.status).sort());
 ok('lines before tracking and the payment seen twice are skipped',kinds.includes('harbor:charge:before')&&kinds.filter(k=>/payment:both/.test(k)).length===1,JSON.stringify(kinds));
 if(SHOTS)await p.screenshot({path:SHOTS+'/imp_review.png',fullPage:true});
 // the OFX store card: pick its debt for the whole file
 await p.selectOption('[data-imp-file^="maple"]','m').catch(()=>{});await p.waitForTimeout(100);
 const toy=await p.evaluate(()=>Debts.importState().entries.find(e=>e.amount===34000).id);await p.selectOption(`[data-imp-debt="${toy}"]`,'__no');await p.waitForTimeout(80);
 ok('a bank line can be marked as not a debt',await p.evaluate(()=>{const e=Debts.importState().entries.find(e=>e.amount===34000);return e.status==='skip'&&!e.on;}));
 await p.selectOption(`[data-imp-debt="${toy}"]`,'k');await p.waitForTimeout(100);
 const r2=await p.evaluate(()=>({toy:Debts.importState().entries.find(e=>e.amount===34000),maple:Debts.importState().entries.filter(e=>e.file.includes('maple')).map(e=>e.debt+':'+e.kind)}));
 ok('picking a debt ticks the line',r2.toy.debt==='k'&&r2.toy.on&&r2.toy.status==='new',JSON.stringify(r2.toy));
 ok('the OFX file brings lines and its statement balance',r2.maple.length===3&&r2.maple.every(x=>x.startsWith('m:'))&&r2.maple.includes('m:balance'),JSON.stringify(r2.maple));
 const n=await p.evaluate(()=>Debts.importState().entries.filter(e=>e.on&&e.debt).length);
 await p.click('[data-action="imp-go"]');await p.waitForTimeout(200);
 const r3=await p.evaluate(()=>({log:state.debtLog.length,kinds:[...new Set(state.debtLog.map(e=>e.kind))].sort(),mem:state.debtImport,done:document.querySelector('.imp-done')?.innerText||'',visa:Debts.model().rows.find(r=>r.d.id==='v').now,maple:Debts.model().rows.find(r=>r.d.id==='m').now,visaWant:(n=>n+Debt.interestOn(n,2400))(500000-25000+8817-2500+5420),mapleWant:118040+Debt.interestOn(118040,2899)}));
 ok('every ticked line is logged',r3.log===n&&/imported/.test(r3.done),n+' '+JSON.stringify(r3));
 ok('payments, charges, interest, refunds and a statement balance',JSON.stringify(r3.kinds)===JSON.stringify(['balance','charge','credit','interest','payment']),JSON.stringify(r3.kinds));
 ok('Visa: September’s real interest, not an estimate, is in its balance',r3.visa===r3.visaWant,r3.visa+' vs '+r3.visaWant);
 ok('the store card starts from its statement balance',r3.maple===r3.mapleWant,r3.maple+' vs '+r3.mapleWant);
 ok('the file and the payee are remembered',Object.values(r3.mem.files).includes('v')&&Object.values(r3.mem.files).includes('m')&&Object.values(r3.mem.payees).includes('k'),JSON.stringify(r3.mem));
 // the same files again: nothing new
 await p.setInputFiles('#debt-files',[card,bank,ofx]);await p.waitForTimeout(400);
 const r4=await p.evaluate(()=>({on:Debts.importState().entries.filter(e=>e.on).length,toy:Debts.importState().entries.find(e=>e.amount===34000)?.debt,dis:document.querySelector('[data-action="imp-go"]')?.disabled}));
 ok('importing the same files again finds nothing new, and remembers Toyota',r4.on===0&&r4.toy==='k'&&r4.dis===true,JSON.stringify(r4));
 await p.click('[data-action="imp-clear"]');await p.waitForTimeout(600);await p.reload();await p.waitForTimeout(600);
 ok('imported entries survive a reload',await p.evaluate(n=>state.debtLog.length===n&&Object.keys(state.debtImport.payees).length===2,n));
 ok('payments show the new kinds in words',await p.evaluate(()=>{go('payments');const t=document.querySelector('#content table').innerText;return /Interest charged/.test(t)&&/Refund or credit/.test(t)&&/Statement balance/.test(t);}));
 // phone width
 await p.setViewportSize({width:390,height:840});await p.evaluate(()=>go('debtimport'));await p.setInputFiles('#debt-files',[card,bank]);await p.waitForTimeout(400);
 ok('no sideways scroll on a phone',await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
 if(SHOTS)await p.screenshot({path:SHOTS+'/imp_phone.png',fullPage:true});
 ok('no page errors',!errs.length,errs.join(' | '));ok('no network',net===0,String(net));
 await b.close();fs.rmSync(dir,{recursive:true,force:true});console.log(fails?`debt import flow: ${fails} failed`:'debt import flow: all checks passed');process.exit(fails?1:0);})();
