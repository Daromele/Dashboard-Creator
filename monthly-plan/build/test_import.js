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
  // tax buyers paid is passed on by Etsy: its own kind, not a fee
  const BT=ETSY.replace('"Sep 24, 2026",Sale,','"Sep 24, 2026",Tax,"Sales tax paid by buyer","Order #1",USD,--,-$1.35,-$1.35,--\n"Sep 21, 2026",VAT,"VAT paid by buyer","Order #3",USD,--,-$0.90,-$0.90,--\n"Sep 24, 2026",Sale,');
  r=read(BT);eq('etsy: buyers’ sales tax and VAT are their own kind', [r.conv.kinds['etsy · tax paid by buyers (passed on)'],totals(r.conv)['Etsy · tax paid by buyers (passed on)'],totals(r.conv)['Etsy · tax on fees']], ['buyerTax',-225,-2]);
  // the monthly summary behind "one record per shop and month"
  let rows=CSV.parse(BT,','),S=Platforms.summary(r.p,rows[0].cells,rows.slice(1));
  eq('summary: one month', S.map(x=>x.month), ['2026-09']);
  eq('summary: sales, buyer tax, gross, refunds, fees, ads, shipping', [S[0].sales,S[0].buyerTax,S[0].gross,S[0].refunds,S[0].fees,S[0].feeTax,S[0].ads,S[0].shipping], [1608,225,1383,1000,31+2-20,2,117,410]);
  eq('summary: the deposit counts from its title, outside the net', [S[0].payouts,S[0].payoutCount,S[0].net], [3735,1,1608-225-1000-(31+2-20)-117-410]);
  eq('summary: listing titles from the fee lines', S[0].titles, ['pattern']);
  r=read(ETSY);
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
  eq('youtube: earnings and withheld tax; the payment to the bank is kept for the summary only', [r.p.id,totals(r.conv)], ['youtube',{'YouTube · sales':184055,'YouTube · tax withheld':-9203}]);
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
  // ---- more sources, each summed per month as "Import statements" does (synthetic rows in each platform's layout) ----
  const sum=(text,file='')=>{const rows=CSV.parse(text,CSV.detect(text).delimiter);let hi=0,p=null;for(;hi<5&&!p;hi++)p=Platforms.detect(rows[hi].cells,rows.slice(hi+1),file);hi--;return {p,S:p&&Platforms.summary(p,rows[hi].cells,rows.slice(hi+1))};};
  const pick=(x,...k)=>k.map(n=>x[n]);
  let t=sum(`Month,Currency,Membership charges - web,Membership charges - iOS app,Shop charges - web,Shop charges - iOS app,Total gross revenue,Patreon fee,Taxes on fees,Total platform fee,Processing fee,Currency conversion fee,iOS App Store fee,Total payment fee,Merch items and shipping,Refunds,Net earnings - membership - web,Net earnings - membership - iOS app,Net earnings - shop - web,Net earnings - shop - iOS app,Your total earnings
2026-08,USD,80.00,0.00,20.00,0.00,100.00,-8.00,-1.00,-9.00,-6.00,-1.00,0.00,-7.00,0.00,-10.00,60.00,0.00,14.00,0.00,74.00
2026-09,USD,50.00,0.00,0.00,0.00,50.00,-4.00,-0.50,-4.50,-3.00,-0.50,0.00,-3.50,0.00,0.00,42.00,0.00,0.00,0.00,45.00`,'creator-analytics-earnings.csv');
  eq('patreon: gross, refunds, fees (platform + payment, not double), payout = reported earnings', [t.p.id,...pick(t.S[0],'gross','refunds','fees','payout','other')], ['patreon',10000,1000,1600,7400,0]);
  eq('patreon: a month whose lines disagree keeps the reported earnings and shows the difference', pick(t.S[1],'payout','other'), [4500,300]);
  t=sum(`"Order ID",Email,"First Name","Last Name",Currency,"Amount Gross","Amount Net",Status,"Num of Items In Cart","Items In Cart","Payment Type","PayPal/Stripe Fee","Payhip Fee","Payhip Collected Sales Tax On Your Behalf","Payhip Collected Sales Tax Amount","Custom VAT Amount",Date
"1",a@example.com,A,B,USD,16.45,13.14,COMPLETED,1,"Budget Sheet",paypal,1.06,0.75,1,1.50,0.00,"2026-09-12 10:00:00"
"2",c@example.com,C,D,USD,0.00,0.00,COMPLETED,1,"Freebie",free,,0.00,0,0.00,0.00,"2026-09-13 10:00:00"
"3",e@example.com,E,F,USD,24.99,22.72,COMPLETED,1,"Debt Tracker",stripe,1.02,1.25,0,0.00,0.00,"2026-09-14 10:00:00"`,'payhip shop.csv');
  eq('payhip: sales tax Payhip collected comes off gross; payment and Payhip fees; free orders skipped', [t.p.id,...pick(t.S[0],'sales','buyerTax','gross','fees','payout')], ['payhip',4144,150,3994,408,3586]);
  eq('payhip: item titles recognise the shop', t.S[0].titles, ['budget sheet','debt tracker']);
  t=sum(`Date,Method,Transaction ID,Gross amount,Tax withheld,Payment
"August 14, 2026",Trolley,X1,US$586.37,US$29.32,US$557.05`,'Canva Royalty Payments.csv');
  eq('canva: gross, US tax withheld, payout after it', [t.p.id,...pick(t.S[0],'currency','gross','withheld','payout')], ['canva','USD',58637,2932,55705]);
  t=sum(`Transaction ID,Payout Method,Payout Account,Amount,Transaction Fee,Date requested,Status
2,paypal,x@example.com,$10.14,$0.00,2026-09-30 08:15:53,Payment will be sent in 7 days
1,paypal,x@example.com,$10.92,$0.00,2026-09-07 15:20:18,Paid on 2026-09-14 10:00:59`,'Creative Fabrica Royalty Payments.csv');
  eq('creative fabrica: paid payouts on their paid date, pending ones wait', [t.p.id,t.S.length,...pick(t.S[0],'month','gross','payout')], ['creativefabrica',1,'2026-09',1092,1092]);
  t=sum(`Date,Status,Product,Customer,Price,Earnings,Taxes,License
2026-09-11,,"Wheel Template","Someone",12.00,6.00,0.00,Personal
2026-09-03,Refunded,"Planner","Someone Else",24.00,12.00,0.00,Commercial`,'Creative Market Sales.csv');
  eq('creative market: price is the sale, its share is the fee, a refund reverses both', [t.p.id,...pick(t.S[0],'gross','refunds','fees','payout')], ['creativemarket',1200,2400,600-1200,-600]);
  t=sum(`"type","id","date","status","customer_email","marketing_opt_in","merchandise","donation","username","message","friendly_id","customer_phone","shipping","taxes","discount","refunded"
"Order","1","2026-09-20T02:35:09.6Z","Delivered","a@example.com","false","10.99","","","","A1","","","0.00","1.65",""
"Order","2","2026-09-21T02:35:09.6Z","Delivered","b@example.com","false","8.00","2.00","","","A2","","","0.50","","3.00"
"Order","3","2026-09-22T02:35:09.6Z","Canceled","c@example.com","false","20.00","","","","A3","","","0.00","",""`,'Shop-orders_export.csv');
  eq('fourthwall: merchandise and donations less discounts, refunds apart, cancelled skipped', [t.p.id,...pick(t.S[0],'gross','refunds','payout')], ['fourthwall',1934,300,1634]);
  t=sum(`Issued Commission Amount,Issued Commission Currency,Created,Commission status,Estimated available date,Program
39.04,USD,2025-11-18 19:12:53,Withdrawn,2026-01-14 14:06:21,Kit (formerly ConvertKit)
10.00,USD,2025-11-20 19:12:53,Rejected,2026-01-14 14:06:21,Kit (formerly ConvertKit)`,'PartnerCommissionsExport.csv');
  eq('affiliate commissions: on their created date, rejected ones left out, the program named', [t.p.id,...pick(t.S[0],'month','gross','program')], ['commissions','2025-11',3904,'Kit (formerly ConvertKit)']);
  t=sum(`id,original_id,transaction_at (UTC),transaction_type,sub_type,order.order.friendly_id,order.order.status,profit,income,cost,currency,products.price,products.cost,shipping_cost,shipping_price,tax,donation,discount,fulfillment_cost,payment_fee,refund_value,order.sample_credit_used,order.thank_you_card_fee
1,a,2026-09-12T19:29:56.945945+0000,Order,COMMON,X1,DELIVERED,10.03,11.71,1.68,USD,12.99,0.38,0,0,0.67,0,1.95,0,0.63,0,,
2,b,2026-09-13T19:29:56.945945+0000,Order,COMMON,X2,DELIVERED,11.64,12.73,1.09,USD,14.98,0.43,0,0,0,0,2.25,0,0.66,0,,
3,c,2026-09-14T19:29:56.945945+0000,Order refund,COMMON,,,-5.00,0,5.00,USD,,,0,0,0,0,0,0,0,5.00,,
4,d,2026-09-01T21:19:45.979979+0000,Requested payout,,,,-73.37,0,73.37,USD,,,0,0,0,0,0,0,0,0,,`,'Fourthwall-Shop-transactions-report.csv');
  eq('fourthwall transactions: income less the buyer tax it passes on, product & payment fees, refunds, the payout apart', [t.p.id,...pick(t.S[0],'gross','buyerTax','fees','refunds','payout','payouts')], ['fourthwall',2377,67,210,500,1667,7337]);
  eq('fourthwall transactions: the payout ties to Fourthwall’s own profit', t.S[0].payout, 1003+1164-500);
  t=sum(`Month - successful transactions,Currency,Membership gross earnings - Web and Android,Membership gross earnings - iOS app,One time purchase gross earnings - Web and Android,One time purchase gross earnings - iOS app,Total gross earnings,Patreon platform fees,Taxes on fees,Payment processing fees,Currency exchange fee,iOS app fee,Merch costs (items + shipping),Total payment processing fees,Refunds,Patreon adjustments,Recovered payments,Total net earnings
2026-07,USD,70.00,0.00,30.00,0.00,100.00,-8.00,-1.00,-9.00,-1.00,0.00,0.00,-10.00,-20.00,15.00,5.00,81.00`,'patreon_earnings_breakdown_by_month.csv');
  eq('patreon breakdown: recovered payments and Patreon adjustments are income, fees and the tax on them, no gap left', [t.p.id,...pick(t.S[0],'sales','gross','refunds','fees','feeTax','payout','other')], ['patreon',12000,12000,2000,1900,100,8100,0]);
  t=sum(`Date,Estimated revenue (USD)
Total,20.001
2026-01-01,6.816
2026-01-02,7.491
2026-01-31,0.004
2026-02-01,5.690
2026-02-02,0`,'Youtube.csv');
  eq('youtube studio: daily estimates summed per month, fractions of a cent rounded once, the total row skipped', [t.p.id,t.S.map(x=>[x.month,x.gross,x.currency])], ['youtube',[['2026-01',1431,'USD'],['2026-02',569,'USD']]]);
  // AdSense account activity: a month's earnings on a date range, the payment of the month before, balances
  t=sum(`"Date","Description","Amount (USD)"
"Aug 1, 2026","Starting balance","224.68"
"Aug 21, 2026","Automatic payment: Checking  • • • • 000. 000000000000000","−224.68"
"Aug 1 – 31, 2026","Earnings - YouTube","137.53"
"Sep 1, 2026","Ending balance","137.53"`,'account_activities_202608.csv');
  eq('adsense: the month’s earnings on its last day, the earlier month’s payment kept apart, balances ignored', [t.p.id,t.S.map(x=>[x.month,x.gross,x.payout,x.payouts,x.currency])], ['youtube',[['2026-08',13753,13753,22468,'USD']]]);
  t=sum(`"Date","Description","Amount (USD)"
"Sep 1, 2026","Starting balance","137.53"
"Sep 21, 2026","Automatic payment: Checking  • • • • 000. 000000000000000","−137.53"
"Oct 1, 2026","Ending balance","0.00"`,'account_activities_202609.csv');
  ok('adsense: a month with only a payment is recognised, with no earnings to import yet', t.p?.id==='youtube'&&t.S.every(x=>!x.sales));
};
