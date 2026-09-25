// Platform statements and other currencies, run from test.js. Uses the import modules of the
// business edition: {Budget, CSV, Platforms}. The statements below are small synthetic copies of
// each platform's export format; no real customer data lives in the repository.
const path=require('path'),{extractImportTo}=require('./extract.js');
module.exports=({eq,ok})=>{
  const {Budget:B,CSV,Platforms}=require(extractImportTo(path.join(__dirname,'../app/ProfitPlanBusiness.html'),path.join(__dirname,'import.business.js')));
  const read=(text,file='')=>{const rows=CSV.parse(text,CSV.detect(text).delimiter),h=rows[0].cells,body=rows.slice(1),p=Platforms.detect(h,body,file);
    return {p,conv:p&&Platforms.convert(p,h,body)};};
  const totals=conv=>{const t={};conv.rows.forEach(r=>{t[r.cells[3]]=(t[r.cells[3]]||0)+Math.round(Number(r.cells[2])*100);});return t;};

  const ETSY=`Date,Type,Title,Info,Currency,Amount,"Fees & Taxes",Net,"Tax Details"
"Sep 25, 2026",Marketing,"Etsy Ads","Etsy Ads on Sep 24",USD,--,-$1.17,-$1.17,--
"Sep 24, 2026",Tax,"Tax: Transaction","Order #1",USD,--,-$0.02,-$0.02,--
"Sep 24, 2026",Fee,"Transaction fee: Pattern","Order #1",USD,--,-$0.31,-$0.31,--
"Sep 24, 2026",Fee,"Shipping label: USPS","Order #2",USD,--,-$4.10,-$4.10,--
"Sep 24, 2026",Sale,"Payment for Order #1",,USD,$16.08,--,$16.08,--
"Sep 23, 2026",Deposit,"$37.35 sent to your bank account",,USD,--,--,--,--
"Sep 22, 2026",Refund,"Refund to buyer for Order #9",,USD,-$10.00,$0.20,-$9.80,--`;
  let r=read(ETSY);
  eq('etsy: recognised', [r.p.id,r.p.name], ['etsy','Etsy']);
  eq('etsy: sale at full price, each cut on its own, deposit left out', totals(r.conv), {'Etsy · ads & promotion':-117,'Etsy · tax on fees':-2,'Etsy · fees':-11,'Etsy · shipping labels':-410,'Etsy · sales':1608,'Etsy · refunds':-1000});
  eq('etsy: converted rows add up to the statement’s net', Object.values(totals(r.conv)).reduce((a,v)=>a+v,0), -117-2-31-410+1608-980);
  eq('etsy: kinds carry their role', [r.conv.kinds['etsy · sales'],r.conv.kinds['etsy · shipping labels'],r.conv.kinds['etsy · tax on fees']], ['sale','shipping','feeTax']);

  r=read(`"Date","Time","TimeZone","Name","Type","Status","Currency","Gross","Fee","Net","Transaction ID"
"09/02/2026","10:00:00","PDT","Jane Client","Invoice Payment","Completed","USD","500.00","-14.80","485.20","1"
"09/03/2026","10:00:00","PDT","Adobe","Express Checkout Payment","Completed","USD","-54.99","0.00","-54.99","2"
"09/04/2026","10:00:00","PDT","","General Withdrawal","Completed","USD","-400.00","0.00","-400.00","3"
"09/05/2026","10:00:00","PDT","Late Payer","Website Payment","Pending","USD","50.00","-1.80","48.20","4"
"09/06/2026","10:00:00","PDT","Jane Client","Payment Refund","Completed","USD","-20.00","0.59","-19.41","5"`);
  eq('paypal: money in, fees, purchases, withdrawals; pending left out', [r.p.id,totals(r.conv)], ['paypal',{'PayPal · sales':50000,'PayPal · fees':-1421,'PayPal · payments you made':-5499,'PayPal · payouts to your bank':-40000,'PayPal · refunds':-2000}]);
  r=read(`id,Type,Source,Amount,Fee,Net,Currency,Created (UTC),Available On (UTC),Description
txn_1,charge,ch_1,120.00,3.78,116.22,usd,2026-09-01 14:03,2026-09-03 00:00,Course sale
txn_2,refund,re_1,-20.00,0.00,-20.00,usd,2026-09-02 14:03,2026-09-04 00:00,Refund
txn_3,payout,po_1,-96.22,0.00,-96.22,usd,2026-09-05 14:03,2026-09-05 00:00,STRIPE PAYOUT
txn_4,stripe_fee,,-2.00,0.00,-2.00,usd,2026-09-06 14:03,2026-09-06 00:00,Billing fee`);
  eq('stripe: charge split from its fee, payout kept apart, currency upper-cased', [r.p.id,totals(r.conv),r.conv.rows[0].cells[4]], ['stripe',{'Stripe · sales':12000,'Stripe · fees':-578,'Stripe · refunds':-2000,'Stripe · payouts to your bank':-9622},'USD']);
  r=read(`Transaction Date,Type,Order,Card Brand,Card Source,Payout Status,Payout Date,Available On,Amount,Fee,Net,Currency
2026-09-01 10:00:00 -0400,charge,#1001,visa,online,paid,2026-09-03,2026-09-03,45.00,1.61,43.39,USD
2026-09-02 10:00:00 -0400,refund,#1001,visa,online,paid,2026-09-04,2026-09-04,-10.00,0.00,-10.00,USD`);
  eq('shopify transactions', [r.p.id,totals(r.conv)], ['shopify',{'Shopify · sales':4500,'Shopify · fees':-161,'Shopify · refunds':-1000}]);
  r=read(`Payout Date,Status,Charges,Refunds,Adjustments,Reserved Funds,Fees,Retried Amount,Total,Currency
2026-09-03,paid,450.00,-20.00,0.00,0.00,-13.35,0.00,416.65,USD`);
  eq('shopify payouts summary', [r.p.id,totals(r.conv)], ['shopify',{'Shopify · sales':45000,'Shopify · refunds':-2000,'Shopify · fees':-1335}]);
  r=read(`Date,Description,Amount
2026-09-21,"YouTube Partner Earnings (Aug 1 - 31, 2026)",1840.55
2026-09-21,"Tax withholding - US (YouTube)",-92.03
2026-09-25,"Payment - EFT",-1748.52`);
  eq('youtube: earnings, withheld tax, payment', [r.p.id,totals(r.conv)], ['youtube',{'YouTube · sales':184055,'YouTube · tax withheld':-9203,'YouTube · payouts to your bank':-174852}]);
  r=read(`Month,Gross Earnings,Patreon Platform Fee,Payment Processing Fee,Net Earnings,Currency
Aug 2026,1512.00,-120.96,-45.36,1345.68,USD`,'patreon-earnings.csv');
  eq('patreon (gross and fee columns): name from the file, monthly date', [r.p.name,r.p.key,totals(r.conv),r.conv.rows[0].cells[0]], ['Patreon','patreon',{'Patreon · sales':151200,'Patreon · fees':-16632},'1 Aug 2026']);
  r=read(`Sale Date,Item Name,Price,Gumroad Fee,Status
2026-09-02,Sewing pattern,12.00,1.20,Paid
2026-09-03,Sewing pattern,12.00,1.20,Failed`,'gumroad_sales.csv');
  eq('gumroad: failed sales left out', [r.p.name,totals(r.conv)], ['Gumroad',{'Gumroad · sales':1200,'Gumroad · fees':-120}]);
  r=read(`Date,Description,Amount,Balance
2026-09-01,ETSY INC,37.35,100.00`);
  eq('an ordinary bank file is not taken for a platform', r.p, null);
  ok('bank patterns for remembered platforms', Platforms.bankPattern('etsy','Etsy').test('ETSY INC DEPOSIT')&&Platforms.bankPattern('patreon','Patreon').test('PATREON PAYOUT')&&!Platforms.bankPattern('etsy','Etsy').test('BETSY BAKERY'));

  // ---- conversion and payouts in the preview ----
  const s=B.blank();s.settings.currency='CAD';s.platformSources={etsy:{name:'Etsy',last:'2026-09-20'}};
  const bank=CSV.parse(`Date,Description,Amount,Currency
2026-09-02,ETSY INC,37.35,CAD
2026-09-03,FIGMA,-12.00,USD
2026-09-04,CLIENT WIRE,500.00,USD`,','),hb=bank[0].cells,rb=bank.slice(1),map=CSV.guess(hb);
  const opts=(rates)=>({mode:'bank',order:'auto',decimal:'auto',categoryMap:{},overrides:{},incomeCategory:'client-work',expenseCategory:'software',rates,payouts:[{name:'Etsy',re:Platforms.bankPattern('etsy','Etsy')}],payoutCategory:'platform-payout'});
  let pv=CSV.preview(rb,hb,map,opts({}),s);
  eq('foreign rows wait for a rate; the payout is a transfer', [pv[0].category,pv[0].payout,!!pv[1].error,pv[1].currency,!!pv[2].error], ['platform-payout','Etsy',true,'USD',true]);
  pv=CSV.preview(rb,hb,map,opts({USD:1.36}),s);
  eq('converted at the rate, original kept with the same sign', pv.slice(1).map(x=>[x.category,x.amount,x.fx]), [['software',1632,{currency:'USD',amount:1200}],['client-work',68000,{currency:'USD',amount:50000}]]);
  const fileCur=CSV.parse(`Date,Description,Amount
2026-09-03,FIGMA,-12.00`,',');
  pv=CSV.preview(fileCur.slice(1),fileCur[0].cells,CSV.guess(fileCur[0].cells),{...opts({USD:1.5}),fileCurrency:'USD'},s);
  eq('a whole file in another currency', [pv[0].amount,pv[0].fx], [1800,{currency:'USD',amount:1200}]);

  // ---- saved data ----
  const v=B.blank();v.settings.currency='CAD';
  v.transactions=[{id:'a',date:'2026-09-01',category:'software',amount:1632,note:'',fx:{currency:'USD',amount:1200}},{id:'b',date:'2026-09-01',category:'software',amount:1632,note:'',fx:{currency:'XYZ',amount:1200}},{id:'c',date:'2026-09-01',category:'software',amount:1632,note:'',fx:{currency:'USD',amount:-1200}}];
  v.fxRates={USD:1.36,EUR:-2,XYZ:1};v.platformSources={etsy:{name:'Etsy',last:'2026-09-20'},'Bad Key':{name:'x',last:'2026-09-20'},paypal:{name:'',last:'2026-09-20'}};
  v.invoices=[{id:'i1',number:'1',client:'A',issued:'2026-09-01',due:'2026-09-30',amount:100000,category:'client-work',note:'',currency:'USD'},{id:'i2',number:'2',client:'B',issued:'2026-09-01',due:'2026-09-30',amount:50000,category:'client-work',note:'',currency:'CAD'}];
  const V=B.validate(JSON.parse(JSON.stringify(v)));
  eq('bad originals, rates and platforms are dropped, never fatal', [V.transactions.map(t=>!!t.fx),V.fxRates,Object.keys(V.platformSources)], [[true,false,false],{USD:1.36},['etsy']]);
  eq('an invoice in your own currency needs no currency', [V.invoices[0].currency,'currency' in V.invoices[1]], ['USD',false]);
  const R=B.receivables(V,'2026-09-15');
  eq('receivables convert at the remembered rate', [R.total,R.open.map(i=>i.home),R.unrated.length], [136000+50000,[136000,50000],0]);
  delete V.fxRates.USD;eq('no rate: listed but not totalled', [B.receivables(V,'2026-09-15').total,B.receivables(V,'2026-09-15').unrated.length], [50000,1]);
};
