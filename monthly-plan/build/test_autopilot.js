// Money Autopilot: statements read, sorted and paired by themselves. Run from test.js.
// Every statement below is a small synthetic copy of a bank's CSV layout; no real data.
const path=require('path'),{extractImportTo}=require('./extract.js');
module.exports=({eq,ok})=>{
  const {Budget:B,CSV,Autopilot:A}=require(extractImportTo(path.join(__dirname,'../app/MoneyAutopilot.html'),path.join(__dirname,'import.tracker.js')));
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
  eq('checking lines sorted', kr.map(r=>r.category), ['salary','housing','own-transfer','card-payoff','card-payoff','other-income','cash']);
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
};
