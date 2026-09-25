// Business edition checks, run from test.js. B = the calculation module of ProfitPlanBusiness.html.
const path=require('path'),{extractTo}=require('./extract.js');
module.exports=({eq,ok})=>{
  const B=require(extractTo(path.join(__dirname,'../app/ProfitPlanBusiness.html'),path.join(__dirname,'budget.business.js')));
  const N=require('./budget.new.js');
  const throws=(f,re)=>{try{f();return false;}catch(e){return re?re.test(e.message):true;}};

  // ---- the edition itself ----
  const b=B.blank();
  eq('business blank is tagged', b.niche, 'business');
  eq('business default theme', b.settings.theme, 'ledger');
  eq('business defaults', [b.settings.taxRate,b.settings.mileageRate,b.settings.distanceUnit,b.mileage,b.invoices], [2500,0,'mi',[],[]]);
  {const x=JSON.parse(JSON.stringify(b));x.settings.distanceUnit='furlong';eq('bad distance unit falls back', B.validate(x).settings.distanceUnit, 'mi');x.settings.distanceUnit='km';eq('km kept', B.validate(x).settings.distanceUnit, 'km');}
  ok('every default category has a group', b.categories.every(c=>B.GROUPS[c.group]));
  ok('every default tax line exists', b.categories.every(c=>!c.taxLine||B.TAX_LINES[c.taxLine]));
  ok('every income/expense group has a usual line', B.P.groups.filter(g=>['income','expense'].includes(g.type)).every(g=>B.TAX_LINES[g.taxLine]));
  {const t=B.blank();t.transactions.push({id:'a',date:'2026-05-02',category:'software',amount:5000,note:''},{id:'b',date:'2026-05-20',category:'card-payoff',amount:5000,note:''},{id:'c',date:'2026-05-21',category:'owner-retirement',amount:20000,note:''});
   const p=B.plMonth(t,'2026-05');eq('business card payoff stays off the P&L', [p.opex.total,p.net], [5000,-5000]);
   eq('card payoff and owner retirement listed as not part of profit', p.transfers.lines.map(l=>l.id).sort(), ['card-payoff','owner-retirement']);
   eq('transfers never reach the tax summary', B.taxSummary(t,'2026-01-01','2026-12-31').totals.expenses, 5000);}
  ok('aliases point at real categories', Object.values(B.P.aliases).every(id=>b.categories.some(c=>c.id===id)));
  ok('quick setup and defaults are real', [...B.P.defaults.quickSetup,B.P.defaults.category,B.P.defaults.schedule,B.P.defaults.annualCategory].every(id=>b.categories.some(c=>c.id===id)));
  eq('types from group flags', ['client-work','materials','software','owner-draw','tax-reserve','interest'].map(id=>B.type(b.categories.find(c=>c.id===id))), ['income','expense','expense','saving','saving','income']);

  // ---- profit & loss ----
  const s=B.blank();s.settings.name='Test Co';
  const tx=(date,category,amount,note='')=>s.transactions.push({id:'t'+(s.transactions.length+1),date,category,amount,note});
  // March: 10,000 sales, 1,500 COGS, 2,000 opex, 50 interest, plus transfers that must not touch profit
  tx('2026-03-02','client-work',600000);tx('2026-03-15','product-sales',400000);
  tx('2026-03-05','materials',100000);tx('2026-03-06','postage',50000);
  tx('2026-03-10','software',20000);tx('2026-03-11','advertising',80000);tx('2026-03-12','contractors',100000);
  tx('2026-03-31','interest',5000);
  tx('2026-03-28','owner-draw',300000);tx('2026-03-28','tax-reserve',150000);tx('2026-03-29','loan-repay',40000);
  tx('2026-03-20','product-sales',-20000,'refund');                     // a refund reduces revenue
  // April: a loss month
  tx('2026-04-03','client-work',50000);tx('2026-04-04','contractors',200000);tx('2026-04-20','tax-reserve',10000);
  // May: profit again
  tx('2026-05-08','client-work',800000);tx('2026-05-09','software',20000);tx('2026-05-30','tax-reserve',100000);
  const p=B.pl(s,'2026-03-01','2026-03-31');
  eq('revenue total (net of refund)', p.revenue.total, 980000);
  eq('cogs total', p.cogs.total, 150000);
  eq('gross profit', p.gross, 830000);
  eq('opex total', p.opex.total, 200000);
  eq('opex grouped in pack order', p.opex.groups.map(g=>g.id), ['overhead','marketing','people']);
  eq('operating profit', p.operating, 630000);
  eq('other income below operating', p.other.total, 5000);
  eq('net profit', p.net, 635000);
  ok('gross margin', Math.abs(p.grossMargin-830000/980000)<1e-12);
  eq('transfers kept out of profit', p.transfers.total, 490000);
  eq('lines in category order', p.revenue.lines.map(l=>l.id), ['client-work','product-sales']);
  eq('custom mid-month range', B.pl(s,'2026-03-10','2026-03-15').net, 400000-20000-80000-100000);
  eq('range across months', B.pl(s,'2026-03-01','2026-05-31').net, 635000+(50000-200000)+(800000-20000));
  eq('empty range', B.pl(s,'2025-01-01','2025-01-31').net, 0);
  eq('plMonth = pl(month)', B.plMonth(s,'2026-04'), B.pl(s,'2026-04-01','2026-04-30'));

  // ---- tax set-aside: the rule applies to profit so far, so a loss month gives some back ----
  const t=B.taxSetAside(s,'2026',2500,'2026-06-15');
  const mar=t.months[2],apr=t.months[3],may=t.months[4];
  eq('march should', mar.should, Math.round(635000*.25));
  eq('april loss lowers the need', apr.should, Math.round((635000-150000)*.25)-Math.round(635000*.25));
  eq('may should', may.should, Math.round((635000-150000+780000)*.25)-Math.round((635000-150000)*.25));
  eq('have = tax group transfers', [mar.have,apr.have,may.have], [150000,10000,100000]);
  eq('monthly shares add up to the year', t.months.reduce((n,m)=>n+m.should,0), t.months[11].ytdShould);
  eq('ytd as of June', [t.ytdNet,t.ytdShould,t.ytdHave], [1265000,Math.round(1265000*.25),260000]);
  eq('balance', t.balance, 260000-Math.round(1265000*.25));
  ok('future months flagged', t.months[6].future && !t.months[5].future);
  eq('quarters follow 1040-ES', t.quarters.map(q=>[q.label,q.from,q.to,q.due]), [['Q1','2026-01','2026-03','2026-04-15'],['Q2','2026-04','2026-05','2026-06-15'],['Q3','2026-06','2026-08','2026-09-15'],['Q4','2026-09','2026-12','2027-01-15']]);
  eq('quarter sums', [t.quarters[0].should,t.quarters[1].have], [mar.should,110000]);
  const loss=B.blank();loss.transactions.push({id:'x1',date:'2026-02-02',category:'software',amount:5000,note:''});
  eq('never negative in total', B.taxSetAside(loss,'2026',2500,'2026-12-31').ytdShould, 0);
  eq('rate defaults to settings', B.taxSetAside(s,'2026',undefined,'2026-06-15').rate, 2500);

  // ---- Schedule C summary ----
  s.settings.mileageRate=700;
  s.mileage=[{id:'m1',date:'2026-03-04',purpose:'Client visit',route:'A → B',miles:1005},{id:'m2',date:'2026-07-04',purpose:'Fair',miles:200}];
  const S=B.taxSummary(s,'2026-01-01','2026-12-31'),line=id=>S.lines.find(l=>l.id===id)?.amount||0;
  eq('mileage amount (100.5 mi at 70¢)', B.mileageAmount(1005,700), 7035);
  eq('line 1 gross receipts', line('L1'), 980000+50000+800000);
  eq('COGS lines', [line('L38'),line('L39')], [100000,50000]);
  eq('line 9 is standard mileage', line('L9'), B.mileageAmount(1205,700));
  eq('interest left off the form', S.excluded.map(l=>l.id), ['interest']);
  eq('nothing unmapped', S.unmapped, []);
  eq('totals', S.totals.net, B.pl(s,'2026-01-01','2026-12-31').net-5000-B.mileageAmount(1205,700));
  eq('gross profit = line 1 − COGS', S.totals.grossProfit, line('L1')-150000);
  const s2=JSON.parse(JSON.stringify(s));s2.categories.find(c=>c.id==='software').taxLine='L27b';
  eq('a category override moves the amount', B.taxSummary(s2,'2026-01-01','2026-12-31').lines.find(l=>l.id==='L27b').amount, 40000);
  eq('taxLineFor falls back to the group line', B.taxLineFor({id:'new',group:'marketing'}), 'L8');

  // ---- receivables ----
  s.invoices=[{id:'i1',number:'1',client:'A',issued:'2026-05-01',due:'2026-05-31',amount:1000,category:'client-work',note:''},
              {id:'i2',number:'2',client:'B',issued:'2026-03-01',due:'2026-03-31',amount:2000,category:'client-work',note:''},
              {id:'i3',number:'3',client:'C',issued:'2026-06-01',due:'2026-07-01',amount:4000,category:'client-work',note:''},
              {id:'i4',number:'4',client:'D',issued:'2026-01-01',due:'2026-01-31',amount:8000,category:'client-work',note:'',paid:{date:'2026-02-10',tx:'t1'}}];
  const R=B.receivables(s,'2026-06-15');
  eq('receivables total excludes paid', [R.total,R.overdue], [7000,3000]);
  eq('aging buckets', R.buckets.map(b=>b.amount), [4000,1000,0,2000,0]);

  // ---- validation ----
  const ok1=JSON.parse(JSON.stringify(s));
  eq('business roundtrip', B.validate(ok1).transactions.length, s.transactions.length);
  ok('budget backup refused by business', throws(()=>B.validate(N.blank()),/Monthly Plan/));
  ok('business backup refused by budget', throws(()=>N.validate(B.blank()),/different planner edition/));
  const bad={'tax rate':x=>x.settings.taxRate=12.5,'mileage miles':x=>x.mileage[0].miles=0,'mileage date':x=>x.mileage[0].date='2026-02-30',
    'invoice to expense category':x=>x.invoices[0].category='software','invoice due before issued':x=>x.invoices[0].due='2026-04-01',
    'duplicate invoice id':x=>x.invoices[1].id='i1','invoice amount':x=>x.invoices[0].amount=0};
  for(const [name,mut] of Object.entries(bad)){const x=JSON.parse(JSON.stringify(s));mut(x);ok('rejects '+name,throws(()=>B.validate(x)));}
  let x=JSON.parse(JSON.stringify(s));x.invoices[3].paid.tx='gone';eq('dangling paid link dropped', B.validate(x).invoices[3].paid, {date:'2026-02-10'});
  x=JSON.parse(JSON.stringify(s));x.categories[0].taxLine='L999';ok('unknown tax line dropped', !('taxLine' in B.validate(x).categories[0]));
  x=JSON.parse(JSON.stringify(s));delete x.settings.taxRate;delete x.mileage;eq('missing business fields filled', [B.validate(x).settings.taxRate,x.mileage], [2500,[]]);
  x=JSON.parse(JSON.stringify(s));x.settings.theme='lavender';eq('budget-only theme falls back', B.validate(x).settings.theme, 'ledger');

  // ---- sample data is internally consistent in both editions ----
  for(const m of ['2026-01','2026-06','2026-09','2026-12']){
    ok('business sample validates '+m, !throws(()=>B.validate(JSON.parse(JSON.stringify(B.sample(m))))));
    ok('budget sample validates '+m, !throws(()=>N.validate(JSON.parse(JSON.stringify(N.sample(m))))));
  }
  const smp=B.sample('2026-09');
  ok('sample has paid and open invoices', smp.invoices.some(i=>i.paid)&&smp.invoices.some(i=>!i.paid));
  ok('paid invoices are in revenue', smp.invoices.filter(i=>i.paid).every(i=>smp.transactions.some(t=>t.id===i.paid.tx&&t.amount===i.amount)));
  ok('sample makes a profit and sets tax aside', B.pl(smp,'2026-01-01','2026-08-31').net>0 && B.taxSetAside(smp,'2026',undefined,'2026-08-31').ytdHave>0);
  ok('sample has cost of goods', B.pl(smp,'2026-01-01','2026-08-31').cogs.total>0);

  // ---- Quick Log speaks business ----
  const q=text=>B.parseQuick(text,b.categories,{});
  eq('quick: client invoice', [q('client invoice 1200').category,q('client invoice 1200').amount], ['client-work',120000]);
  eq('quick: lunch with a client is a meal', q('lunch with client 32').category, 'meals');
  eq('quick: software', q('canva 12.99').category, 'software');
  eq('quick: postage', q('usps postage 8.40').category, 'postage');
  eq('quick: refund', q('refund etsy order 25').amount, -2500);
};
