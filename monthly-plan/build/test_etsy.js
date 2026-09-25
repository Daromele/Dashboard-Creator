// Etsy edition checks, run from test.js. B = the calculation module of ShopInsightsEtsy.html,
// D = its Etsy data module. Fixtures are synthetic (etsy_fixtures.js), never a seller's real files.
const path=require('path'),{extractTo}=require('./extract.js'),F=require('./etsy_fixtures.js');
module.exports=({eq,ok})=>{
  const B=require(extractTo(path.join(__dirname,'../app/ShopInsightsEtsy.html'),path.join(__dirname,'budget.etsy.js')));
  const D=B.EtsyData,N=require('./budget.new.js'),Biz=require('./budget.business.js');
  const throws=(f,re)=>{try{f();return false;}catch(e){return re?re.test(e.message):true;}};
  const copy=x=>JSON.parse(JSON.stringify(x));
  let n=0;const uid=()=>'u'+(++n);
  const books=()=>{const s=B.blank();s.shops=[{id:'fern',name:'Fern Prints'},{id:'kiln',name:'Kiln Pots'}];return s;};
  const load=(s,shop,name,text)=>D.merge(s,shop,D.read(name,text),{uid,today:'2026-09-30'});

  // ---- the edition ----
  const b=B.blank();
  eq('etsy blank is tagged', [b.niche,b.settings.theme,b.settings.shop,b.shops], ['etsy','kiln','',[]]);
  eq('etsy collections', Object.keys(b.etsy), ['orders','items','listings','reviews','imports']);
  ok('importer categories exist', ['etsy-sales','etsy-refunds','buyer-tax','transaction-fees','processing-fees','listing-fees','fee-tax','other-etsy-fees','etsy-ads','offsite-ads','etsy-plus','other-marketing','shipping-labels','etsy-deposit','own-transfer'].every(id=>b.categories.some(c=>c.id===id)));
  ok('aliases and defaults point at real categories', [...Object.values(B.P.aliases),...Object.values(B.P.importHints),...B.P.defaults.quickSetup].every(id=>b.categories.some(c=>c.id===id)));
  ok('every default tax line exists', b.categories.every(c=>!c.taxLine||B.TAX_LINES[c.taxLine]));
  eq('lines: fees on 10, ads on 8, fee tax on 23, deposit off the P&L', ['transaction-fees','etsy-ads','etsy-plus','fee-tax'].map(id=>B.taxLineFor(b.categories.find(c=>c.id===id))).concat(B.counted(b.categories.find(c=>c.id==='etsy-deposit'))), ['L10','L8','L8','L23',false]);
  ok('other editions have no shops', !('shops' in N.blank())&&!('shops' in Biz.blank())&&!('etsy' in Biz.blank()));
  ok('storage key is its own', !['jps-monthly-plan','jps-profit-plan'].includes(B.P.storage.key));

  // ---- reading the four exports ----
  eq('money formats', ['$16.08','-$0.20','--','','(3.10)','CA$1,234.50','12,50 €','-€1.234,56'].map(D.money), [1608,-20,null,null,-310,123450,1250,-123456]);
  const st=D.read('etsy_statement_2026_9.csv',F.statement),so=D.read('EtsySoldOrderItems2026.csv',F.orders),sl=D.read('EtsyListingsDownload.csv',F.listings),sr=D.read('reviews.json',F.reviews);
  eq('kinds from the header row', [st.kind,so.kind,sl.kind,sr.kind], ['statement','orders','listings','reviews']);
  eq('statement dates and currency', [st.from,st.to,st.currency,st.issues], ['2026-09-07','2026-09-24','USD',[]]);
  eq('a file named like an export is still read by its columns', D.read('reviews.json','Date,Type\n1,2').kind, null);
  const cat=(title)=>st.records.filter(r=>r.note.startsWith(title)).map(r=>[r.category,r.amount]);
  eq('sale keeps the gross, buyer tax is a minus revenue line', [cat('Payment for Order #3812345671'),cat('Sales tax paid by buyer')], [[['etsy-sales',1608]],[['buyer-tax',-108]]]);
  eq('identical fee lines on one order are added together', cat('Transaction fee: Handmade Mug'), [['transaction-fees',260]]);
  eq('credits reduce the fee they belong to', [cat('Credit for listing fee'),cat('Credit for Etsy Ads fee'),cat('Share & Save refund'),cat('Credit for transaction fee')], [[['listing-fees',-20]],[['etsy-ads',-500]],[['transaction-fees',-100]],[['transaction-fees',-78]]]);
  eq('tax on fees vs tax the buyer paid', [cat('Tax: Transaction'),cat('Sales tax on Etsy Plus')], [[['fee-tax',5]],[['fee-tax',60]]]);
  eq('deposit amount comes from the title', cat('$37.35 sent'), [['etsy-deposit',3735]]);
  eq('refund, label, offsite, plus', [cat('Refund to buyer'),cat('USPS shipping label'),cat('Offsite Ads fee'),cat('Etsy Plus subscription fee')], [[['etsy-refunds',-1200]],[['shipping-labels',525]],[['offsite-ads',600]],[['etsy-plus',1000]]]);
  eq('unknown type is filed and reported', [cat('Something Etsy added later'),st.notes.length], [[['other-etsy-fees',10]],1]);
  ok('empty "--" lines are dropped', !st.records.some(r=>r.ref==='l1400000009'));
  eq('order and listing numbers kept', [st.records.find(r=>r.category==='processing-fees').ref,st.records.find(r=>r.category==='listing-fees').ref], ['o3812345671','l1400000001']);
  eq('sold items: orders and items', [so.records.length,so.items.length,so.from,so.to], [3,4,'2026-08-03','2026-09-24']);
  eq('discount counted once per order, not per item', so.records.find(o=>o.id==='3812345672').discount, 800);
  eq('order totals', so.records.find(o=>o.id==='3812345672'), {id:'3812345672',date:'2026-09-22',buyer:so.records[1].buyer,country:'United Kingdom',coupon:'FALL20',discount:800,shipDiscount:0,shipping:0,tax:0,list:4000,units:3});
  ok('buyer kept only as a scrambled key', so.records.every(o=>/^[a-z0-9]{1,12}$/.test(o.buyer))&&!JSON.stringify(so).match(/Placeholder|Example|Fictional|Testville|90000/));
  eq('same buyer, same key', so.records[0].buyer===so.records[2].buyer, true);
  eq('listings: photos, tags, variations, sku', sl.records.map(l=>[l.photos,l.tags,l.variations,l.sku,l.price]), [[10,13,1,'FERN-1',1600],[4,2,0,'',2000],[10,13,0,'',2600]]);
  eq('reviews', sr.records.map(r=>[r.date,r.stars,r.order]), [['2026-09-28',5,'3812345671'],['2026-09-30',4,'3812345672'],['2026-08-20',2,'3812345600'],['2026-09-30',4,'3812345672']]);
  eq('one review per item of an order is kept', new Set(sr.records.map(r=>r.id)).size, 4);
  ok('reviewer names are not kept', !JSON.stringify(sr.records).includes('Placeholder'));
  eq('junk is refused politely', [D.read('x.csv','a,b\n1,2').error.slice(0,10),D.read('x.json','{"a":1}').error], ['Not an Ets','This JSON file is not a list of reviews.']);

  // ---- importing into a shop ----
  const s=books();
  const r1=load(s,'fern','statement.csv',F.statement);
  eq('statement import', [r1.error,r1.added,s.transactions.length,s.transactions.every(t=>t.shop==='fern'&&t.src)], ['',st.records.length,st.records.length,true]);
  const again=load(s,'fern','statement.csv',F.statement);
  eq('the same statement twice adds nothing', [again.added,again.same,s.transactions.length], [0,st.records.length,st.records.length]);
  const edited=F.statement.replace('"September 23, 2026",Marketing,"Etsy Ads",,USD,--,-$2.50,-$2.50','"September 23, 2026",Marketing,"Etsy Ads",,USD,--,-$2.75,-$2.75');
  const upd=load(s,'fern','statement2.csv',edited);
  eq('a changed line updates, never duplicates', [upd.added,upd.updated,s.transactions.find(t=>t.note==='Etsy Ads').amount], [0,1,275]);
  load(s,'fern','statement.csv',F.statement);
  eq('into the wrong shop is refused, and says it is the same download', /Every order in this file is already in Fern Prints, so this is Fern Prints’s download again/.test(load(s,'kiln','statement.csv',F.statement).error), true);
  eq('Etsy’s other reports are named', [D.read('o.csv','Sale Date,Order ID,Buyer,Number of Items,Order Net\n01/01/26,1,a,1,2').error.slice(0,34),D.read('d.csv','Deposit Date,Amount\n01/01/26,2').error.slice(0,40)], ['This is Etsy’s Orders report (one ','This is Etsy’s Payments Deposits report.']);
  eq('nothing reached the other shop', s.transactions.some(t=>t.shop==='kiln'), false);
  eq('orders import', [load(s,'fern','o.csv',F.orders).added,s.etsy.orders.length,s.etsy.items.length], [3,3,4]);
  eq('orders again', [load(s,'fern','o.csv',F.orders).same,s.etsy.items.length], [3,4]);
  eq('orders into another shop refused', /already in Fern Prints/.test(load(s,'kiln','o.csv',F.orders).error), true);
  eq('listings replace the shop’s listings', [load(s,'fern','l.csv',F.listings).added,load(s,'fern','l.csv',F.listings).same,load(s,'fern','l2.csv',F.listings.replace('16.00,USD,5','18.00,USD,5')).replaced,s.etsy.listings.length,s.etsy.listings[0].price], [3,3,3,3,1800]);
  eq('reviews import and repeat', [load(s,'fern','r.json',F.reviews).added,load(s,'fern','r.json',F.reviews).same,s.etsy.reviews.length], [4,4,4]);
  {const z=copy(s),i=z.etsy.imports.findIndex(x=>x.kind==='orders');
   eq('import log keeps the file dates', [z.etsy.imports[i].from,z.etsy.imports[i].to], ['2026-08-03','2026-09-24']);
   z.transactions.push({id:'mine',date:'2026-09-10',category:'software',amount:500,note:'typed in',shop:'fern'});
   const dry=D.removeImport(copy(z),z.etsy.imports.findIndex(x=>x.kind==='statement'),{dry:true});
   eq('delete a statement import: counts', dry.lines, st.records.length);
   D.removeImport(z,z.etsy.imports.findIndex(x=>x.kind==='statement'));
   eq('statement lines gone, typed-in cost kept', z.transactions.map(t=>t.id), ['mine']);
   D.removeImport(z,z.etsy.imports.findIndex(x=>x.kind==='orders'));eq('orders and their items gone', [z.etsy.orders.length,z.etsy.items.length], [0,0]);
   D.removeImport(z,z.etsy.imports.findIndex(x=>x.kind==='listings'));D.removeImport(z,z.etsy.imports.findIndex(x=>x.kind==='reviews'));
   eq('listings and reviews gone', [z.etsy.listings.length,z.etsy.reviews.length], [0,0]);
   ok('still a valid backup', !throws(()=>B.validate(copy(z))));
   eq('importing again brings it back', load(z,'fern','o.csv',F.orders).added, 3);}
  eq('each import is logged', s.etsy.imports.map(x=>x.kind).filter((k,i,a)=>a.indexOf(k)===i), ['statement','orders','listings','reviews']);
  ok('no personal data stored', !/Placeholder|Example|Fictional Lane|Testville/.test(JSON.stringify(s)));
  {const e=books();e.settings.currency='USD';const gbp=D.read('s.csv',F.statement.replace(/,USD,/g,',GBP,'));
   eq('currency follows the first file into empty books', [D.merge(e,'fern',gbp,{uid}).currency,e.settings.currency], ['GBP','GBP']);
   eq('a second currency is refused', /is in USD, but Shop Insights is set to GBP/.test(load(e,'fern','s.csv',F.orders).error), true);}
  eq('dry run changes nothing', (()=>{const e=books(),before=JSON.stringify(e);D.merge(e,'fern',st,{dry:true});return JSON.stringify(e)===before;})(), true);

  // ---- the numbers ----
  const x=F.expect,v=copy(s);v.transactions.find(t=>t.note==='Etsy Ads').amount=250;
  const S=D.summary(v,'2026-09-01','2026-09-30');
  eq('take-home ladder', [S.sales,S.buyerTax,S.refunds,S.revenue,S.fees,S.marketing,S.ads,S.etsyCosts,S.takeHome], [x.sales,x.buyerTax,x.refunds,x.revenue,x.fees,x.marketing,x.ads,x.etsyCosts,x.takeHome]);
  eq('credits, labels, deposits, orders', [S.credits,S.labels,S.deposits,S.orders,S.aov], [x.credits,x.labels,x.deposits,x.orders,Math.round(x.revenue/2)]);
  eq('P&L revenue is net of buyer tax and refunds', S.pl.revenue.total, x.revenue);
  eq('deposit is not counted', S.pl.transfers.lines.map(l=>l.id), ['etsy-deposit']);
  eq('Schedule C line 1 is revenue after buyer tax', B.taxSummary(v,'2026-01-01','2026-12-31').lines.find(l=>l.id==='L1').amount, x.revenue);
  eq('all time = the month here', D.summary(v).takeHome, x.takeHome);
  eq('a month before the first line is empty', [D.summary(v,'2026-08-01','2026-08-31').takeHome,D.summary(v,'2026-10-01','2026-10-31').revenue], [0,0]);
  const ob=D.orderBook(v,'2026-09-01','2026-09-30'),o1=ob.find(o=>o.id==='3812345671');
  eq('order rebuilt: sale − buyer tax − fees', [o1.sale,o1.tax,o1.fees,o1.takeHome,o1.item], [1608,108,98+73+5,1608-108-176,'Botanical Fern Print, Vintage Style']);
  const P=D.products(v);
  eq('products', [P.list.length,P.units,P.total,P.list[0].listing,P.list[0].units], [3,5,x.list,'1400000001',2]);
  eq('discount shared across an order’s items', P.list.filter(p=>p.shop==='fern').map(p=>p.net).reduce((a,b)=>a+b,0), x.list-x.discount);
  eq('listings meet sales by title; unsold found', [P.listings.map(l=>l.units),P.unsold.map(l=>l.title)], [[2,1,0],['Autumn Leaves Print Set']]);
  eq('listing health', P.health, {photos:1,tags:1,title:1,ok:1});
  eq('top share', Math.round(P.top(1)*100), Math.round(3200/7200*100));
  eq('products in September only', D.products(v,'2026-09-01','2026-09-30').units, 4);
  const C=D.coupons(v);eq('coupons', [C.orders,C.discounted,C.discount,C.list,C.paid,C.codes[0].code], [3,1,800,7200,6400,'FALL20']);
  const U=D.customers(v);eq('customers', [U.buyers,U.repeat,U.repeatOrders,U.countries.map(c=>[c.country,c.orders])], [2,1,2,[['United States',2],['United Kingdom',1]]]);
  const R=D.reviewStats(v);eq('reviews', [R.count,R.avg.toFixed(2),R.dist,R.low.length,R.years.map(y=>y.key)], [4,'3.75',[0,1,0,2,1],1,['2026']]);
  eq('order months: sales and statement coverage', D.orderMonths(v,'2026').slice(7,9).map(m=>[m.orders,m.sales,m.statement]), [[1,1600+450,false],[2,1600+4000-800,true]]);
  eq('seasonality from orders', D.seasonality(v).years.map(y=>[y.year,y.months[7].orders,y.months[8].orders]), [['2026',1,2]]);

  // ---- months with sold orders but no statement are estimated ----
  {const z=copy(v);eq('estimates added for August only', D.syncEstimates(z,{uid,today:'2026-09-30'}), 4);
   const est=z.transactions.filter(t=>t.est),by=id=>est.find(t=>t.category===id)?.amount;
   eq('August estimate: sales exact, fees at standard rates', [by('etsy-sales'),by('transaction-fees'),by('processing-fees'),by('listing-fees'),est[0].date,est.find(t=>t.n).n], [2050,133,87,20,'2026-08-03',1]);
   const A=D.summary(z,'2026-08-01','2026-08-31');eq('estimated month in the summary and P&L', [A.revenue,A.etsyCosts,A.orders,A.estimated,B.pl(z,'2026-08-01','2026-08-31').revenue.total], [2050,240,1,true,2050]);
   eq('a month with a statement is never estimated', D.summary(z,'2026-09-01','2026-09-30').revenue, x.revenue);
   eq('months flagged', D.orderMonths(z,'2026').slice(7,9).map(m=>[m.statement,m.estimated]), [[false,true],[true,false]]);
   eq('running it again changes nothing', [D.syncEstimates(z,{uid,today:'2026-09-30'}),z.transactions.filter(t=>t.est).length], [4,4]);
   ok('estimates pass validation', !throws(()=>B.validate(copy(z))));
   z.transactions=z.transactions.filter(t=>!t.src||t.est);D.syncEstimates(z,{uid,today:'2026-09-30'});
   eq('without its statement, September is estimated too', D.estimatedMonths(z,'2026-01-01','2026-12-31'), ['2026-08','2026-09']);
   const bad=copy(z);bad.transactions.find(t=>t.est).est='yes';ok('rejects a bad estimate flag', throws(()=>B.validate(bad)));}

  // ---- several shops ----
  const m=copy(v);load(m,'kiln','k.csv',F.statement.replace(/38123456/g,'99123456').replace(/140000000/g,'150000000'));
  m.transactions.push({id:'shared1',date:'2026-09-05',category:'software',amount:1299,note:'Canva'});
  const all=D.summary(m,'2026-09-01','2026-09-30'),fern=D.summary(D.forShop(m,'fern'),'2026-09-01','2026-09-30'),kiln=D.summary(D.forShop(m,'kiln'),'2026-09-01','2026-09-30');
  eq('shops add up to all shops', [fern.revenue+kiln.revenue,fern.etsyCosts+kiln.etsyCosts], [all.revenue,all.etsyCosts]);
  eq('shared costs only in the combined view', [all.profit-fern.profit-kiln.profit], [-1299]);
  m.settings.shop='kiln';
  eq('the whole P&L follows the shop picker', B.pl(m,'2026-09-01','2026-09-30').revenue.total, kiln.revenue);
  eq('monthly totals follow it too', B.totals(m,'2026-09').income.actual, kiln.revenue);
  eq('lists follow it', [D.products(m).list.length,D.reviewStats(m).count], [0,0]);
  m.settings.shop='';
  eq('compare', D.compare(m,'2026-09-01','2026-09-30').map(c=>[c.id,c.takeHome,c.reviews]), [['fern',fern.takeHome,3],['kiln',kiln.takeHome,0]]);

  // ---- validation ----
  eq('etsy roundtrip', B.validate(copy(m)).etsy.items.length, 4);
  const bad={'unknown shop on a transaction':z=>z.transactions[0].shop='nope','duplicate shop':z=>z.shops.push({id:'fern',name:'Again'}),
    'item without quantity':z=>z.etsy.items[0].qty=0,'review stars':z=>z.etsy.reviews[0].stars=6,'order date':z=>z.etsy.orders[0].date='2026-02-30',
    'listing photos':z=>z.etsy.listings[0].photos=11,'order in unknown shop':z=>z.etsy.orders[0].shop='ghost','duplicate order':z=>z.etsy.orders.push(copy(z.etsy.orders[0])),
    'import kind':z=>z.etsy.imports[0].kind='other','negative discount':z=>z.etsy.orders[0].discount=-5};
  for(const [name,mut] of Object.entries(bad)){const z=copy(m);mut(z);ok('rejects '+name,throws(()=>B.validate(z)));}
  {const z=copy(m);z.settings.shop='gone';eq('unknown selection falls back to all shops', B.validate(z).settings.shop, '');}
  {const z=B.blank();delete z.etsy;delete z.shops;const w=B.validate(z);eq('missing etsy parts are filled', [w.shops,w.etsy.orders], [[],[]]);}
  ok('etsy backup refused by the business edition', throws(()=>Biz.validate(copy(m)),/different planner edition/));
  ok('business backup refused by etsy', throws(()=>B.validate(Biz.blank()),/Profit Plan/));

  // ---- sample shops ----
  for(const mo of ['2026-01','2026-09','2026-12'])ok('etsy sample validates '+mo, !throws(()=>B.validate(copy(B.sample(mo)))));
  const smp=B.sample('2026-09'),T=D.summary(smp,'2026-01-01','2026-08-31');
  eq('sample has two shops and every kind of data', [smp.shops.length,...['orders','items','listings','reviews'].map(k=>smp.etsy[k].length>0)], [2,true,true,true,true]);
  ok('sample take-home is below revenue and positive', T.takeHome>0&&T.takeHome<T.revenue&&T.costShare>0.1&&T.costShare<0.4, JSON.stringify([T.revenue,T.takeHome]));
  ok('sample has unsold and incomplete listings', D.products(smp).unsold.length>0&&D.products(smp).health.tags>0);
  ok('sample orders line up with the statement', D.orderBook(smp,'2026-08-01','2026-08-31').every(o=>smp.etsy.orders.some(x=>x.id===o.id)));

  // ---- Quick Log speaks Etsy seller ----
  const q=text=>B.parseQuick(text,b.categories,{});
  eq('quick: packaging', q('mailers 18').category, 'packaging');
  eq('quick: craft fair sale', q('craft fair sale 240').category, 'other-sales');
  eq('quick: clay', q('clay order 42.50').category, 'materials');
};
