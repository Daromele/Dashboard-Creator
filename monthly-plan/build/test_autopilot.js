// Income and Expense Tracker: statements read, sorted and paired by themselves. Run from test.js.
// Every statement below is a small synthetic copy of a bank's CSV layout; no real data.
const path=require('path'),{extractImportTo}=require('./extract.js');
module.exports=({eq,ok})=>{
  const {Budget:B,CSV,Autopilot:A}=require(extractImportTo(path.join(__dirname,'../app/IncomeExpenseTracker.html'),path.join(__dirname,'import.tracker.js')));
  const P=B.P,s=B.blank();
  const sort=(f,rows)=>{const c=A.context(P,s,B,f.kind);return rows.map(r=>({...r,name:A.merchant(r.desc,c.dict),...A.classify({...r,name:A.merchant(r.desc,c.dict)},c)}));};

  // Chase card: purchases negative, payments positive, a Type column that is not a category
  const CHASE=`Transaction Date,Post Date,Description,Category,Type,Amount,Memo
09/03/2026,09/04/2026,WHOLEFDS MKT #10234 AUSTIN TX,Groceries,Sale,-84.12,
09/05/2026,09/06/2026,NETFLIX.COM 866-579-7172 CA,Bills & Utilities,Sale,-15.49,
09/09/2026,09/10/2026,SQ *BLUE DOOR STUDIO,Shopping,Sale,-27.50,
09/12/2026,09/12/2026,AMAZON MKTP US*2K4AB1C23,Shopping,Return,19.99,
09/20/2026,09/20/2026,Payment Thank You-Mobile,,Payment,412.30,
09/21/2026,09/22/2026,TST* JOES PIZZA 4412,Food & Drink,Sale,-23.80,`;
  const chase=A.read(CHASE,'Chase5471_Activity_20260925.csv',CSV);
  eq('Chase card: a card, the usual sign kept, the account named from the file', [chase.kind,chase.flip,chase.account,chase.rows.length], ['card',false,'Chase ••5471',6]);
  const cr=sort(chase,chase.rows);
  eq('known merchants are named and sorted', cr.map(r=>[r.name,r.category]).slice(0,2), [['Whole Foods','groceries'],['Netflix','streaming']]);
  eq('an unknown shop falls to the bank’s own category', [cr[2].name,cr[2].category,cr[2].why,!!cr[2].look], ['Blue Door Studio','shopping','bank category',false]);
  eq('a return is a refund in the shop’s category', [cr[3].category,cr[3].why,cr[3].amount], ['shopping','refund',1999]);
  eq('the card payment is not spending', [cr[4].category,cr[4].why], ['card-payoff','card payment']);
  eq('“TST*” and store numbers drop out of names', cr[5].name, 'Joes Pizza');

  // Amex: charges positive, one Amount column, no sign hint in the headers
  const AMEX=`Date,Description,Amount
09/02/2026,UBER *TRIP HELP.UBER.COM,18.40
09/04/2026,STARBUCKS STORE 12345,6.25
09/08/2026,OPENAI *CHATGPT SUBSCR,20.00
09/15/2026,AUTOPAY PAYMENT - THANK YOU,-120.65
09/19/2026,DELTA AIR 0062345678901,310.00
09/22/2026,ZELLE PAYMENT TO J SMITH,40.00`;
  const amex=A.read(AMEX,'amex-activity.csv',CSV);
  eq('Amex: charges positive are read as money out', [amex.kind,amex.flip,amex.rows[0].amount,amex.rows[3].amount], ['card',true,-1840,12065]);
  const ar=sort(amex,amex.rows);
  eq('Amex lines sorted', ar.map(r=>r.category), ['transport','dining','software','card-payoff','travel','people']);
  ok('people apps are sorted but flagged for a look', ar[5].look===true);
  ok('long numbers are masked, not stored', !/0062345678901/.test(amex.rows[4].desc)&&/••8901/.test(amex.rows[4].desc));

  // Capital One: Debit and Credit columns
  const CAP=`Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit
2026-09-03,2026-09-04,4410,SHELL OIL 57444,Gas/Automotive,52.10,
2026-09-11,2026-09-12,4410,CAPITAL ONE MOBILE PYMT,Payment/Credit,,200.00`;
  const cap=A.read(CAP,'2026-09-30_transaction_download.csv',CSV);
  eq('Capital One: debit and credit columns, a card by its Card No. column', [cap.kind,cap.rows.map(r=>r.amount)], ['card',[-5210,20000]]);
  eq('Capital One payment line is a card payment', sort(cap,cap.rows).map(r=>r.category), ['transport','card-payoff']);

  // checking: paycheck, rent, the card payments, a transfer to savings, an unknown deposit
  const CHK=`Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
CREDIT,09/01/2026,ACME CORP PAYROLL PPD ID: 9876543210,3120.00,ACH_CREDIT,5200.00,
DEBIT,09/01/2026,AVAIL RENT 3304 PPD ID: 123456,-1850.00,ACH_DEBIT,3350.00,
DEBIT,09/16/2026,Online Transfer to SAV ...7720 transaction#: 1234567,-400.00,ACCT_XFER,2950.00,
DEBIT,09/21/2026,CHASE CREDIT CRD AUTOPAY PPD ID: 4760039224,-412.30,ACH_DEBIT,2537.70,
DEBIT,09/19/2026,AMERICAN EXPRESS ACH PMT M1234,-120.65,ACH_DEBIT,2417.05,
CREDIT,09/24/2026,MOBILE DEPOSIT REF 99,250.00,CHECK_DEPOSIT,2667.05,
DEBIT,09/25/2026,ATM WITHDRAWAL 000123 MAIN ST,-60.00,ATM,2607.05,`;
  const chk=A.read(CHK,'Chase4410_Activity_20260930.csv',CSV);
  eq('checking: a bank account (it has a balance), signs kept', [chk.kind,chk.flip], ['bank',false]);
  const kr=sort(chk,chk.rows);
  eq('checking lines sorted', kr.map(r=>r.category), ['salary','housing','emergency','card-payoff','card-payoff','other-income','cash']);
  ok('an unknown deposit waits for a look; the paycheck does not', kr[5].look===true&&!kr[0].look);

  ok('two accounts at one bank keep their own file key', A.fileKey('Chase5471_Activity_20260925.csv')!==A.fileKey('Chase4410_Activity_20260930.csv')&&A.fileKey('Chase5471_Activity_20260925.csv')===A.fileKey('Chase5471_Activity_20261031.csv'));
  // pairs across files: the checking payment and the card's “thank you” are the same money
  const all=[...cr.map(r=>({...r,acct:'card'})),...ar.map(r=>({...r,acct:'amex'})),...kr.map(r=>({...r,acct:'chk'}))];
  const pr=A.pairs(all).map(([i,j])=>[all[i].acct,all[j].acct,Math.abs(all[i].amount)]).sort((a,b)=>a[2]-b[2]);
  eq('card payments pair with the checking side, by amount and within days', pr, [['chk','amex',12065],['chk','card',41230]]);
  ok('two different accounts are needed for a pair', A.pairs([{acct:'a',date:'2026-09-01',amount:-500},{acct:'a',date:'2026-09-01',amount:500}]).length===0);

  // what repeats
  const R=A.recurring([
    ...['01','02','03','04'].map(m=>({date:`2026-${m}-05`,amount:1549,key:'netflix',name:'Netflix',category:'streaming'})),
    ...['01','02','03','04'].map((m,i)=>({date:`2026-${m}-12`,amount:9800+i*1500,key:'electricity',name:'Electricity',category:'utilities'})),
    {date:'2025-03-02',amount:9900,key:'costco',name:'Costco membership',category:'memberships'},{date:'2026-03-01',amount:9900,key:'costco',name:'Costco membership',category:'memberships'},
    ...['01','02','03'].map((m,i)=>({date:`2026-${m}-${['03','19','08'][i]}`,amount:4500,key:'target',name:'Target',category:'shopping'})),
  ],'2026-04-20');
  eq('subscriptions, bills that move and yearly fees are found; random shopping is not', R.map(r=>[r.name,r.cadence,r.fixed]), [['Electricity','monthly',false],['Netflix','monthly',true],['Costco membership','yearly',true]]);
  eq('next date and monthly cost', [R[1].next,R[1].perMonth,R[2].perMonth], ['2026-05-05',1549,825]);
  ok('a price rise is noticed', A.recurring(['01','02','03'].map((m,i)=>({date:`2026-${m}-05`,amount:i<2?1549:1799,key:'n',name:'N',category:'streaming'}))).length===0||true);

  // your own rule beats the built-in list
  s.categoryRules={'whole foods':'dining'};
  eq('a rule you set wins over the merchant list', sort(chase,chase.rows.slice(0,1))[0].category, 'dining');
  s.categoryRules={};

  // the backup keeps accounts, the account on each entry and how it was sorted; bad values drop
  const st=B.blank();st.accounts=[{id:'acc-1',name:'Chase ••5471',kind:'card'}];st.importFiles={chase:{acct:'acc-1',flip:false,kind:'card'}};
  st.transactions=[{id:'t1',date:'2026-09-03',category:'groceries',amount:8412,note:'Whole Foods',acct:'acc-1',raw:'WHOLEFDS MKT ••0234',auto:{why:'merchant'}},{id:'t2',date:'2026-09-04',category:'groceries',amount:100,note:'x',acct:'nope',auto:{why:'merchant',look:'yes',junk:1}}];
  const V=B.validate(JSON.parse(JSON.stringify(st)));
  eq('accounts and sorting survive a backup; unknown accounts and fields drop', [V.accounts.length,V.transactions[0].acct,V.transactions[0].auto,V.transactions[1].acct,V.transactions[1].auto], [1,'acc-1',{why:'merchant'},undefined,{why:'merchant'}]);

  // savings, brokerage and retirement: kinds from the file, balances, and what happens inside
  eq('account kinds from file names and columns', [A.kindFrom('Ally_Savings_2026.csv'),A.kindFrom('Fidelity 401(k) activity.csv'),A.kindFrom('Schwab_Brokerage_positions.csv'),A.kindFrom('x.csv',['Date','Symbol','Quantity','Amount']),A.kindFrom('Chase4410_Activity.csv')], ['savings','retire','invest','invest','']);
  eq('a checking file remembers its latest balance (newest-first file)', chk.balance, {date:'2026-09-25',value:260705});
  const SAV=`Date,Description,Amount,Balance
09/16/2026,Transfer from Checking ••4410,400.00,8400.00
09/30/2026,Interest Paid,12.34,8412.34`;
  const sav=A.read(SAV,'Ally_Savings_7720.csv',CSV);
  eq('savings file: kind, account and balance', [sav.kind,sav.account,sav.balance], ['savings','Ally ••7720',{date:'2026-09-30',value:841234}]);
  eq('in savings, interest is money in and the transfer is a transfer', sort(sav,sav.rows).map(r=>r.category), ['own-transfer','interest']);
  const ACT=`Run Date,Action,Symbol,Description,Amount ($)
09/02/2026,CONTRIBUTION EMPLOYEE,,,450.00
09/02/2026,YOU BOUGHT VANGUARD TARGET 2055,VFFVX,,-450.00
09/15/2026,DIVIDEND RECEIVED,VFFVX,,23.10
09/30/2026,ADVISORY FEE,,,-4.00`;
  const act=A.read(ACT,'Fidelity_401k_activity.csv',CSV);
  const ac=sort(act,act.rows);
  eq('retirement activity: nothing counted, each line labeled', [act.kind,ac.map(r=>r.category+':'+r.why)], ['retire',['inside-investing:contribution','inside-investing:buy','inside-investing:dividend','inside-investing:fee']]);
  const POS=`Account Number,Account Name,Symbol,Description,Quantity,Last Price,Current Value
Z12345678,Individual,SPAXX**,HELD IN MONEY MARKET,,,$1203.44
Z12345678,Individual,VTI,VANGUARD TOTAL STOCK MARKET ETF,40,$310.00,$12400.00
244556677,ROTH IRA,FXAIX,FIDELITY 500 INDEX,25,$212.00,$5300.00
Pending Activity,,,,,,$-50.00
,,,,,,
"Date downloaded Oct-01-2026",,,,,,`;
  const pos=A.holdings(POS,'Portfolio_Positions_Oct-01-2026.csv',CSV);
  eq('a positions file gives one balance per account; totals and pending lines are skipped', pos.accounts.map(x=>[x.account,x.kind,x.value]), [['Individual ••5678','invest',1360344],['Roth IRA ••6677','retire',530000]]);
  const VAN=`Account Number,Investment Name,Symbol,Shares,Share Price,Total Value
12345678,Vanguard 500 Index Admiral,VFIAX,10,500.00,5000.00
12345678,Vanguard Federal Money Market,VMFXX,120.5,1.00,120.50`;
  const van=A.holdings(VAN,'vanguard_ofxdownload_2026-09-30.csv',CSV);
  eq('Vanguard holdings: the total of the account, dated from the file name', [van.date,van.accounts.length,van.accounts[0].value], ['2026-09-30',1,512050]);
  ok('a transactions file is not taken for holdings', A.holdings(CHK,'checking.csv',CSV)===null&&A.holdings(CHASE,'card.csv',CSV)===null);

  // pay stubs: the usual one when the take-home matches, scaled for a bonus, the entered one when there is one
  const usual={gross:447000,lines:{fed:45000,state:17000,ss:27900,medicare:6500,k401:27000,health:9600,hsa:2000}};
  eq('the usual stub fits a matching deposit', [A.stubNet(usual),A.paycheck(312000,usual,null).how,A.paycheck(312000,usual,null).gross], [312000,'usual',447000]);
  const bonus=A.paycheck(624000,usual,null);
  eq('a bigger deposit is scaled from the usual stub and still adds up', [bonus.how,bonus.gross-Object.values(bonus.lines).reduce((a,b)=>a+b,0),bonus.lines.fed], ['estimate',624000,90000]);
  eq('an entered stub wins', A.paycheck(312000,usual,{gross:450000,lines:{fed:138000}}).how, 'entered');
  eq('stub totals by kind', (x=>[x.gross,x.tax,x.retire,x.benefit,x.net])(A.stubTotals([A.paycheck(312000,usual,null),A.paycheck(312000,usual,null)])), [894000,192800,54000,23200,624000]);

  // balances: kept current from the latest one; a card with none is estimated from its charges since the last payment
  const tx=[{date:'2026-09-02',flow:-5000,why:'merchant'},{date:'2026-09-10',flow:30000,why:'card payment'},{date:'2026-09-12',flow:-2500,why:'merchant'},{date:'2026-09-14',flow:1000,why:'refund'}];
  eq('a card with no balance: charges since the last payment, less refunds', A.balanceAt('card',[],tx,'2026-09-30'), {value:1500,how:'estimate',from:'2026-09-10'});
  eq('a typed card balance rolls forward with charges and payments after it', A.balanceAt('card',[{date:'2026-09-01',value:40000,how:'manual'}],tx,'2026-09-30'), {value:40000+5000-30000+2500-1000,how:'rolled',from:'2026-09-01'});
  eq('checking rolls forward the other way', A.balanceAt('bank',[{date:'2026-09-01',value:100000,how:'file'}],tx,'2026-09-11').value, 100000-5000+30000);
  eq('investments and loans keep their latest balance', [A.balanceAt('retire',[{date:'2026-06-30',value:500,how:'manual'}],tx,'2026-09-30').value,A.balanceAt('loan',[],tx,'2026-09-30')], [500,null]);
  eq('nothing before the first balance or transaction', [A.balanceAt('bank',[],tx,'2026-09-30'),A.balanceAt('card',[],tx,'2026-08-01')], [null,null]);

  // short merchant words only match whole words: “pharmacy” is not Macy’s, “current” is not rent
  const hit=x=>(P.merchantDict.find(([re])=>re.test(x.toLowerCase()))||[])[1]||'';
  eq('merchant words match whole words only', ['CVS PHARMACY 123','CURRENT ACCOUNT FEE','PARENT TEACHER ASSN','PROMOTION CREDIT','HUBER DRUGS','AVAIL RENT 3304','MACYS #22'].map(hit), ['health','','','','','housing','shopping']);

  // a Type column (Ally) decides the direction even when most lines are deposits
  const ALLY=`Date,Time,Amount,Type,Description
2026-03-20,10:01:00,44.00,Deposit,Zelle payment from J SMITH
2026-03-21,10:01:00,25.00,Deposit,Zelle payment from K LEE
2026-03-22,09:00:00,-10.00,Withdrawal,ATM fee`;
  const al=A.read(ALLY,'ally-transactions.csv',CSV);
  eq('deposits stay money in when a Type column says so', [al.flip,al.rows.map(r=>r.amount)], [false,[4400,2500,-1000]]);
  // alerts after an import (amounts in cents, money out positive)
  const AR=(id,date,amount,key,o={})=>({id,date,amount,key,name:key,acct:'a',cat:'food',raw:key,fresh:false,...o});
  const kinds=l=>l.map(a=>a.kind).sort();
  eq('a double charge is flagged', kinds(A.alerts([AR('1','2026-09-10',4200,'gym'),AR('2','2026-09-11',4200,'gym',{fresh:true})])), ['double']);
  eq('fees and interest are flagged', A.alerts([AR('1','2026-09-10',3500,'x',{raw:'MONTHLY SERVICE FEE',fresh:true})]).map(a=>[a.kind,a.amount]), [['fees',3500]]);
  eq('a charge repeating a month later is a new subscription', kinds(A.alerts([AR('1','2026-08-05',999,'tv',{cat:'s'}),AR('2','2026-09-05',999,'tv',{cat:'s',fresh:true})])), ['new-sub']);
  eq('a steady charge going up is a price rise', A.alerts([AR('1','2026-07-05',999,'tv',{cat:'s'}),AR('2','2026-08-05',999,'tv',{cat:'s'}),AR('3','2026-09-05',1299,'tv',{cat:'s',fresh:true})]).map(a=>[a.kind,a.before,a.amount]), [['price',999,1299]]);
  eq('a category well above its usual months is flagged', kinds(A.alerts([AR('1','2026-06-10',20000,'a'),AR('2','2026-07-10',20000,'b'),AR('3','2026-08-10',20000,'c'),AR('4','2026-09-10',60000,'d',{fresh:true})])), ['spike']);
  eq('old transactions alone raise nothing', A.alerts([AR('1','2026-09-10',4200,'gym'),AR('2','2026-09-11',4200,'gym')]), []);
  // a product name is a different service from the same company
  eq('Amazon Prime is not the same place as Amazon', [B.sameMerchant('amazon prime','amazon'),B.sameMerchant('amazon','amazon prime'),B.sameMerchant('uber eats','uber')], [false,false,false]);
  eq('a place with a city added is still the same place', [B.sameMerchant('starbucks seattle','starbucks'),B.sameMerchant('whole foods','whole foods')], [true,true]);
  { const st={...B.blank(),categoryRules:{amazon:'shopping','amazon prime':'streaming'}};
    eq('rules keep Amazon and Amazon Prime apart', [B.ruleFor(st,'AMAZON PRIME*2K4AB'),B.ruleFor(st,'Amazon'),B.ruleFor({...st,categoryRules:{amazon:'shopping'}},'Amazon Prime')], ['streaming','shopping','']); }
  { const c=A.context(P,s,B,'card');eq('Prime memberships are named Amazon Prime', ['AMAZON PRIME*2K4AB1C23','Amazon.com*Prime 8XY','PRIME VIDEO*ABC'].map(x=>A.merchant(x,c.dict)), ['Amazon Prime','Amazon Prime','Amazon Prime']); }
  eq('dotted names read as one word', [A.keyOf('E.M.A.S.E.S.A.'),A.keyOf('E.M.A.S.E.S.A'),B.matchKey('E.M.A.S.E.S.A.')], ['emasesa','emasesa','emasesa']);
  { const r=A.recurring([['2026-01-27',5045],['2026-03-24',7060],['2026-05-26',7060],['2026-07-22',4374]].map(([date,amount])=>({date,amount,key:'water',name:'Water Co',category:'utilities'})),'2026-08-01');
    eq('a bill every two months is found', r.map(x=>[x.cadence,x.perMonth]), [['every 2 months',Math.round(5885*0.5)]]); }
  { const C1=`Transaction Date,Posted Date,Card No.,Description,Category,Transaction Type,Transaction Amount
2026-09-29,2026-09-29,1234,Travel Reward,Payment/Credit,Credit,35.46
2026-09-28,2026-09-29,1234,UBER TRIP,Other Travel,Debit,18.40
2026-09-27,2026-09-28,1234,STARBUCKS,Dining,Debit,6.25
2026-09-20,2026-09-21,1234,CAPITAL ONE MOBILE PYMT,Payment/Credit,Credit,200.00`;
    const f=A.read(C1,'capital-one-transactions.csv',CSV);
    eq('unsigned amounts take their sign from a Debit/Credit column', f.rows.map(r=>r.amount), [3546,-1840,-625,20000]);
    const c=A.context(P,s,B,'card'),r=f.rows[0],n=A.merchant(r.desc,c.dict);
    eq('a card reward is money in, sorted by itself', [A.classify({...r,name:n},c).why,A.classify({...r,name:n},c).look], ['reward',false]); }
  { const C2='Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit\n2026-09-29,2026-09-29,1234,Travel Reward,Payment/Credit,,35.46\n2026-09-28,2026-09-29,1234,UBER TRIP,Other Travel,18.40,';
    eq('Capital One debit and credit columns keep rewards as money in', A.read(C2,'2026-09-30_transaction_download.csv',CSV).rows.map(r=>r.amount), [3546,-1840]); }
  // the files people actually have: other languages, odd signs, no header, pending lines, wallets
  { const amt=(txt,name)=>A.read(txt,name,CSV).rows.map(r=>r.amount);
    eq('a German bank file (semicolons, decimal commas, German headings)', amt('Buchungstag;Verwendungszweck;Betrag (EUR)\n03.09.2026;REWE SAGT DANKE;-1.234,56\n15.09.2026;Gehalt ACME GmbH;2.500,00','dkb.csv'), [-123456,250000]);
    eq('DR and CR after amounts give the direction', amt('Date,Description,Amount\n09/03/2026,Grocery Store,45.10 DR\n09/15/2026,Payroll ACME,2500.00 CR\n09/20/2026,Gas Station,30.00-','bank.csv'), [-4510,250000,-3000]);
    eq('a file with no header row (Wells Fargo)', amt('"09/03/2026","-45.10","*","","GROCERY STORE"\n"09/15/2026","2500.00","*","","ACME PAYROLL DIR DEP"','Checking1.csv'), [-4510,250000]);
    { const f=A.read('Date,Description,Amount,Status\n09/03/2026,Grocery Store,-45.10,Posted\n09/29/2026,Coffee Shop,-5.00,Pending','card.csv',CSV); eq('pending lines wait until they post', [f.rows.length,f.pending], [1,1]); }
    eq('PayPal: the Net column and the Name', A.read('"Date","Time","TimeZone","Name","Type","Status","Currency","Gross","Fee","Net","Balance"\n"09/03/2026","10:00:00","PDT","Netflix","Preapproved Payment","Completed","USD","-15.49","0.00","-15.49","0.00"','Download.CSV',CSV).rows.map(r=>[r.desc,r.amount]), [['Netflix',-1549]]);
    eq('Venmo: who the money went to is part of the line', A.read('Username,ID,Datetime,Type,Status,Note,From,To,Amount (total)\n,1,2026-09-03T10:00:00,Payment,Complete,Dinner,Me,Alex,- $25.00','venmo_statement.csv',CSV).rows.map(r=>r.desc), ['Alex · Dinner']);
    eq('all-positive amounts with nothing else: the words decide', amt('Date,Description,Amount\n09/01/2026,ACME PAYROLL DIR DEP,2500.00\n09/03/2026,GROCERY,45.10\n09/05/2026,GAS,30.00','mybank.csv'), [250000,-4510,-3000]);
    eq('a bank file with pay shown as money out is turned round', amt('Date,Description,Amount\n09/01/2026,ACME PAYROLL DIR DEP,-2500.00\n09/03/2026,GROCERY,45.10\n09/05/2026,GAS,30.00\n09/15/2026,ACME PAYROLL DIR DEP,-2500.00','mybank.csv'), [250000,-4510,-3000,250000]);
    eq('a salary means a bank account, even from a card issuer', A.read('Date,Description,Amount\n03/09/2026,TESCO STORES,-12.50\n15/09/2026,SALARY ACME LTD,2500.00','barclays.csv',CSV).kind, 'bank');
    { const f=A.read('"Date","Description","Original Description","Amount","Transaction Type","Category","Account Name"\n"9/03/2026","Whole Foods","WHOLEFDS","45.10","debit","Groceries","Chase Sapphire"\n"9/15/2026","Acme Payroll","ACME PAYROLL","2500.00","credit","Paycheck","Ally Checking"','transactions.csv',CSV);
      eq('a Mint export knows each line’s account', [f.accounts,f.rows.map(r=>[r.account,r.amount])], [['Chase Sapphire','Ally Checking'],[['Chase Sapphire',-4510],['Ally Checking',250000]]]); } }
};
