// Debt Free Plan: the payoff maths. Money in cents, APR in hundredths of a percent.
const path=require('path'),{extractImportTo}=require('./extract.js');
module.exports=({eq,ok})=>{
  const {Budget:B,Debt:D,DebtFiles:F,Autopilot:A,CSV:C}=require(extractImportTo(path.join(__dirname,'../app/DebtFreePlan.html'),path.join(__dirname,'import.debt.js')));
  // a textbook loan: $10,000 at 6% over 60 months is $193.33 a month and $1,599.68 of interest
  eq('loan payment formula', D.loanPayment(1000000,600,60), 19333);
  const a=D.amortize({balance:1000000,apr:600},19333,'2026-01');
  eq('amortization: 60 months and the textbook interest', [a.rows.length,a.interest,a.done], [60,159968,true]);
  eq('the payment that finishes by a date', D.paymentToFinishBy({balance:1000000,apr:600},'2026-01','2030-12'), 19333);
  // three debts, $900 a month
  const debts=[{id:'a',balance:500000,apr:2499,min:15000,minMode:'card',limit:600000},{id:'b',balance:120000,apr:1800,min:4000},{id:'c',balance:1500000,apr:650,min:30000}];
  const P={budget:90000,start:'2026-10'},c=D.compare(debts,P);
  ok('avalanche pays the least interest', c.avalanche.totalInterest<=Math.min(c.snowball.totalInterest,c.cashflow.totalInterest,c.custom.totalInterest));
  eq('snowball clears the smallest balance first', Object.entries(c.snowball.payoff).sort((x,y)=>x[1].localeCompare(y[1]))[0][0], 'b');
  eq('avalanche clears the highest rate first', Object.entries(c.avalanche.payoff).sort((x,y)=>x[1].localeCompare(y[1]))[0][0], 'a');
  ok('paying only the minimums takes longer and costs more', c.minimums.count>c.avalanche.count*2&&c.minimums.totalInterest>c.avalanche.totalInterest*2,JSON.stringify([c.minimums.count,c.avalanche.count]));
  const s=c.avalanche;eq('every dollar paid is a balance plus its interest', s.totalPaid, 500000+120000+1500000+s.totalInterest);
  eq('the budget is spent every month until the end', s.months.slice(0,-1).every(r=>r.paid===90000), true);
  // a custom order is followed
  eq('your own order is followed', Object.entries(D.simulate(debts,{...P,strategy:'custom',custom:['c','b','a']}).payoff).sort((x,y)=>x[1].localeCompare(y[1]))[0][0], 'c');
  // one-off payments: a lump sum shortens the plan
  const lump=D.simulate(debts,{...P,strategy:'avalanche',extras:[{month:'2026-12',amount:300000}]});
  ok('a lump sum makes it sooner and cheaper', lump.count<s.count&&lump.totalInterest<s.totalInterest);
  // a budget below the minimums is flagged
  eq('a budget below the minimums shows the shortfall', D.simulate(debts,{...P,budget:30000}).shortfall>0, true);
  // a balance that grows never ends
  eq('a minimum below the interest never finishes', D.simulate([{id:'g',balance:500000,apr:2999,min:10000}],{budget:10000,start:'2026-10'}).never, true);
  // a 0% promotion: no interest until it ends, then the standard rate
  const promo=D.simulate([{id:'p',balance:300000,apr:2499,min:20000,promo:{apr:0,until:'2027-03'}}],{budget:20000,start:'2026-10'});
  eq('no interest while a 0% promotion lasts', promo.months.slice(0,6).every(r=>r.interest===0), true);
  ok('interest starts after the promotion', promo.months[6].interest>0);
  // card-style minimums fall as the balance falls, and never drop under the floor
  eq('card minimum: 1% plus interest, floored', [D.minimumDue({min:3500,minMode:'card'},500000+10400,10400),D.minimumDue({min:3500,minMode:'card'},100000,2000)], [15400,3500]);
  // today's balance: interest each month, payments off, a statement resets it
  eq('a balance estimate between statements', D.balanceNow({id:'x',balance:100000,apr:1200,since:'2026-01-15'},[{debt:'x',date:'2026-02-10',amount:20000,kind:'payment'},{debt:'x',date:'2026-03-05',amount:90000,kind:'balance'}],'2026-04-20').balance, 90900);
  // what if: a balance transfer and a consolidation loan
  const bt=D.whatIf(debts,P,{transfer:{debt:'a',feePct:300,promoApr:0,apr:2499,months:15}});
  eq('a balance transfer adds its fee to the balance', bt.debts.find(d=>d.id==='a').balance, 515000);
  const cl=D.whatIf(debts,P,{consolidate:{debts:['a','b'],apr:1100,months:36,feePct:0}});
  eq('a consolidation loan replaces the debts it pays off', [cl.debts.length,cl.debts.at(-1).balance,cl.debts.at(-1).min], [2,620000,D.loanPayment(620000,1100,36)]);
  eq('an extra amount each month raises the budget', D.whatIf(debts,P,{extra:5000}).plan.budget, 95000);
  // warnings
  eq('a balance growing on its minimum is warned about', D.warnings([{id:'g',balance:500000,apr:2999,min:10000}],'2026-10')[0].kind, 'growing');
  eq('a promotion ending soon is warned about', D.warnings([{id:'p',balance:100000,apr:2499,min:5000,promo:{apr:0,until:'2026-12'}}],'2026-10')[0].kind, 'promo-ending');
  // the edition's blank and sample keep debts
  ok('a blank Debt Free Plan has debts, a log and a plan', Array.isArray(B.blank().debts)&&B.blank().debtPlan.strategy==='avalanche');
  const S=B.sample('2026-09');ok('the sample has six debts and payments', S.debts.length===6&&S.debtLog.length>10);
  eq('saved debts survive a round trip through validation', B.validate(JSON.parse(JSON.stringify(S))).debts.length, 6);

  // ---------- statement downloads (fictional accounts) ----------
  // the lender's own interest line replaces the estimate for its month; a refund lowers the balance without counting as paid
  const dI={id:'i',balance:100000,apr:2400,min:3000,since:'2026-01-05'};
  const est=D.balanceNow(dI,[],'2026-02-28'),real=D.balanceNow(dI,[{debt:'i',date:'2026-02-10',amount:1500,kind:'interest'},{debt:'i',date:'2026-02-12',amount:2000,kind:'credit'}],'2026-02-28');
  eq('a logged interest line replaces the estimate', [est.interest,real.interest,real.balance,real.paid], [2000,1500,99500,0]);
  const debts2=[{id:'v',name:'Visa card',lender:'Harbor Bank',since:'2026-01-01',balance:500000},{id:'s',name:'Student loan',lender:'Brightpath Servicing',since:'2026-01-01',balance:2000000},{id:'k',name:'Car loan',lender:'Lakeside Auto Finance',since:'2026-01-01',balance:900000}];
  const card='Transaction Date,Post Date,Description,Category,Type,Amount,Memo\n09/20/2026,09/21/2026,GROCERY MART #12,Groceries,Sale,-54.20,\n09/15/2026,09/15/2026,AUTOMATIC PAYMENT - THANK,,Payment,250.00,\n09/12/2026,09/12/2026,INTEREST CHARGE:PURCHASES,Fees & Adjustments,Fee,-88.17,\n09/03/2026,09/04/2026,RETURN SHOE STORE,Shopping,Return,25.00,\n09/02/2026,09/03/2026,LATE FEE,Fees & Adjustments,Fee,-29.00,\n';
  const fc=F.read(card,'HarborBank_Activity_20260925.csv',A,C,{});
  eq('a card download is read as a card', fc.kind, 'card');
  const pc=F.propose(fc,debts2,{},A);
  eq('card lines become charges, payments, interest and refunds', pc.map(e=>e.kind+':'+e.amount).sort(), ['charge:2900','charge:5420','credit:2500','interest:8817','payment:25000']);
  eq('the file is matched to its debt by the lender in its name', [...new Set(pc.map(e=>e.debt))], ['v']);
  const bank='Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #\nDEBIT,09/16/2026,"HARBOR BANK CRD AUTOPAY PPD ID: 99999",-250.00,ACH_DEBIT,1200.00,,\nDEBIT,09/18/2026,"BRIGHTPATH SERVICING LOAN PMT",-210.00,ACH_DEBIT,990.00,,\nDEBIT,09/18/2026,"SUPERMART 0042",-80.10,DEBIT_CARD,909.90,,\nCREDIT,09/19/2026,"ACME CORP PAYROLL",1800.00,ACH_CREDIT,2709.90,,\nDEBIT,09/22/2026,"TOYOTA FINANCIAL PMT",-340.00,ACH_DEBIT,2369.90,,\n';
  const fb=F.read(bank,'Checking4410_Activity.csv',A,C,{});
  eq('a checking download is read as a bank account', fb.kind, 'bank');
  const pb=F.propose(fb,debts2,{},A);
  eq('the bank file gives only the payments to debts', pb.map(e=>e.debt+':'+e.amount), ['v:25000','s:21000',':34000']);
  const all=F.check([...pc,...pb].map((e,i)=>({...e,id:'x'+i})),debts2,[]);
  eq('a card payment also in the bank file is kept once', all.filter(e=>e.kind==='payment'&&e.debt==='v').map(e=>e.status).sort(), ['both','new']);
  eq('a payment to an unknown lender waits for a debt to be picked', all.find(e=>e.amount===34000).status, 'pick');
  const learned=F.propose(fb,debts2,{payees:{[A.keyOf(A.merchant('TOYOTA FINANCIAL PMT'))]:'k'}},A);
  eq('a payee learned once is matched next time', learned.find(e=>e.amount===34000).debt, 'k');
  const again=F.check(pc.map((e,i)=>({...e,id:'y'+i})),debts2,pc.map(e=>({...e,id:'l'+e.ref})));
  ok('importing the same file twice skips every line', again.every(e=>e.status==='dup'&&!e.on));
  const ofx='OFXHEADER:100\nDATA:OFXSGML\n<OFX><CREDITCARDMSGSRSV1><CCSTMTTRNRS><CCSTMTRS><CURDEF>USD<CCACCTFROM><ACCTID>6011000000001234</CCACCTFROM><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260910120000<TRNAMT>-42.50<NAME>COFFEE HOUSE</STMTTRN><STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260915<TRNAMT>300.00<NAME>PAYMENT THANK YOU</STMTTRN></BANKTRANLIST><LEDGERBAL><BALAMT>-4321.09<DTASOF>20260930</LEDGERBAL></CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1></OFX>';
  const fo=F.read(ofx,'download.qfx',A,C,{});
  eq('an OFX card file: lines, last four digits and the statement balance', [fo.kind,fo.rows.length,/••1234$/.test(fo.account),fo.balance.value,fo.balance.date], ['card',2,true,-432109,'2026-09-30']);
  eq('the OFX balance becomes a statement balance entry', F.propose(fo,debts2,{files:{[fo.key]:'v'}},A).find(e=>e.kind==='balance').amount, 432109);
  eq('lines from before a debt was tracked are left out', F.check([{id:'z',date:'2025-12-01',amount:100,kind:'payment',debt:'v',ref:'r'}],debts2,[])[0].status, 'before');
  const v2=B.validate({...B.blank(),debts:[{id:'v',name:'Visa',balance:100}],debtLog:[{id:'e1',debt:'v',date:'2026-09-01',amount:50,kind:'interest',ref:'abc'},{id:'e2',debt:'v',date:'2026-09-02',amount:50,kind:'bogus'}],debtImport:{files:{'harbor 1234':'v','gone':'zz'},payees:{toyota:''},kinds:{x:'loan',y:'boat'}}});
  eq('imported entries and what was learned survive validation', [v2.debtLog.map(e=>e.kind),v2.debtImport.files,v2.debtImport.payees,v2.debtImport.kinds], [['interest'],{'harbor 1234':'v'},{toyota:''},{x:'loan'}]);
  const vk=B.validate({...B.blank(),debtKinds:[{id:'kback',name:'Back taxes'},{id:'card',name:'Credit cards',hidden:true},{id:'BAD ID',name:'x'},{id:'kback',name:'dup'}],debts:[{id:'t',name:'IRS plan',balance:100,kind:'kback'},{id:'u',name:'Mystery',balance:100,kind:'gone'}]});
  eq('own debt categories are kept, and a debt can use one', [vk.debtKinds.map(k=>k.id+':'+k.name+(k.hidden?':hidden':'')),vk.debts.map(d=>d.kind)], [['kback:Back taxes','card:Credit cards:hidden'],['kback','other']]);
  const vs=B.validate({...B.blank(),debts:[{id:'a',name:'A',balance:100,status:'collections'},{id:'b',name:'B',balance:100,status:'gone'},{id:'c',name:'C',balance:100,status:'active'}]});
  eq('a debt status survives validation; unknown ones are dropped', vs.debts.map(d=>d.status||'active'), ['collections','active','active']);
};
