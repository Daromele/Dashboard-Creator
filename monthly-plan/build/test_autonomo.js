// Autónomo Plan (Spain), run from test.js: IVA and withholding inside an amount, Modelos 303 and
// 130 by quarter, the cuota bracket, due dates and backups. Synthetic data only.
const path=require('path'),{extractTo}=require('./extract.js');
module.exports=({eq,ok})=>{
  const B=require(extractTo(path.join(__dirname,'../app/AutonomoPlan.html'),path.join(__dirname,'budget.autonomo.js')));
  // €1,000 base + 21% IVA − 15% withholding = €1,060 in the bank
  eq('split: invoice with IVA and withholding', B.vatSplit({amount:106000,vat:2100,ret:1500}), {base:100000,vat:21000,ret:15000});
  eq('split: receipt with IVA', B.vatSplit({amount:12100,vat:2100}), {base:10000,vat:2100,ret:0});
  eq('split: odd cents always add back to the amount', (x=>x.base+x.vat-x.ret)(B.vatSplit({amount:1999,vat:2100,ret:700})), 1999);
  eq('split: a refund keeps its sign', B.vatSplit({amount:-12100,vat:2100}), {base:-10000,vat:-2100,ret:0});
  eq('split: no IVA, whole amount', B.vatSplit({amount:5000}), {base:5000,vat:0,ret:0});
  eq('invoice total', [B.invoiceTotal({amount:100000,vat:2100,ret:1500}),B.invoiceTotal({amount:100000})], [106000,100000]);
  eq('deadlines move off weekends', [B.workday('2027-01-30'),B.workday('2026-10-20'),B.workday('2026-06-20')], ['2027-02-01','2026-10-20','2026-06-22']);
  // cuota brackets: monthly net income (cents) → tramo and minimum cuota
  eq('cuota: lowest bracket', [B.cuotaFor(50000).tramo,B.cuotaFor(50000).cuota], [1,20588]);
  eq('cuota: bracket edges', [B.cuotaFor(67000).tramo,B.cuotaFor(67001).tramo,B.cuotaFor(116670).tramo,B.cuotaFor(116671).tramo], [1,2,3,4]);
  eq('cuota: top bracket', [B.cuotaFor(900000).tramo,B.cuotaFor(900000).cuota,B.cuotaFor(900000).to], [15,60735,null]);
  eq('income tax scale', [B.irpfScale(1245000),B.irpfScale(2020000)], [236550,236550+186000]);

  const s=B.blank();s.settings.es={exempt130:false,lowIncome:0,planaUntil:'',estimates:true};
  // two categories the estimate checks need: stock bought for resale and workplace rent (withholding → 115)
  s.categories.push({id:'materials',name:'Materials',group:'office',archived:false,taxLine:'G1'},{id:'coworking',name:'Coworking rent',group:'tools',archived:false,taxLine:'G5'});
  const tx=(id,date,category,amount,vat,ret)=>({id,date,category,amount,note:id,...(vat?{vat}:{}),...(ret?{ret}:{})});
  s.transactions=[
    tx('a','2026-02-10','inc-prof',106000,2100,1500),   // €1,000 base, IVA 210, withheld 150
    tx('b','2026-02-12','software',24200,2100),          // €200 base, IVA 42
    tx('c','2026-03-01','cuota',30000),                  // €300 cuota, no IVA
    tx('d','2026-03-05','interest',1000),                // not activity income
    tx('e','2026-05-10','materials',121000,2100),        // Q2: €1,000 base, IVA 210 → IVA credit
    tx('f','2026-08-10','inc-prof',242000,2100),         // Q3: €2,000 base, IVA 420, no withholding
    tx('g','2026-08-11','coworking',30600,2100,1900),    // rent: €300 base + IVA 63 − 57 you withhold
  ];
  const T=B.esTax(B.validate(JSON.parse(JSON.stringify(s))),'2026','2026-09-30'),[q1,q2,q3,q4]=T.quarters;
  eq('Q1 303: charged − deducted', [q1.ivaOut,q1.ivaIn,q1.pay303], [21000,4200,16800]);
  eq('Q1 income and costs before IVA; interest left out', [q1.income,q1.expenses], [100000,50000]);
  // 130: net 500, allowance 25, 20% of 475 = 95, less 150 withheld → 0
  eq('Q1 130: withholding covers it', [q1.cum.tax,q1.pay130], [9500,0]);
  eq('Q2 303: a credit carries forward', [q2.pay303,q2.credit303], [0,21000]);
  eq('Q3 303: the carried credit comes off', [q3.carryIn,q3.pay303], [21000,42000-6300-21000]);
  // cumulative to Q3: income 3000, costs 200+300+1000+300 = 1800, net 1200, allowance 60 → 20% of 1140 = 228, less 150
  eq('Q3 130: cumulative, less withholding and earlier instalments', [q3.cum.net,q3.cum.tax,q3.pay130], [120000,22800,7800]);
  eq('Q3 withholding you owe (115)', q3.retOut, 5700);
  eq('Q4 not started', q4.started, false);
  eq('dates', [q1.due,q2.due,q3.due,q4.due], ['2026-04-20','2026-07-20','2026-10-20','2027-02-01']);
  // Seguridad Social: (net 1200 + cuota 300) × 0.93 over 9 months = 155/month → lowest bracket
  eq('cuota estimate', [T.cuota.monthlyNet,T.cuota.tramo,T.cuota.paid,T.cuota.paidMonths], [15500,1,30000,1]);
  const ex=JSON.parse(JSON.stringify(s));ex.settings.es.exempt130=true;
  eq('exempt from the 130', B.esTax(B.validate(ex),'2026','2026-09-30').quarters.every(q=>q.pay130===0), true);
  const low=JSON.parse(JSON.stringify(s));low.settings.es.lowIncome=100;low.transactions.push(tx('h','2026-01-20','inc-prof',605000,2100));
  eq('low-income deduction comes off the 130', (T=>T.quarters[0].pay130)(B.esTax(B.validate(low),'2026','2026-09-30')), Math.round((550000-27500)*0.2)-15000-10000);
  // P&L counts the base, never the IVA; bank interest is other income, below operating profit
  eq('P&L on the base', (p=>[p.revenue.total,p.net])(B.pl(B.validate(JSON.parse(JSON.stringify(s))),'2026-01-01','2026-03-31')), [100000,100000-20000-30000+1000]);
  // backups: bad rates are dropped, settings get defaults
  const bad=JSON.parse(JSON.stringify(s));bad.transactions[0].vat=1800;bad.transactions[0].ret=1234;bad.categories[0].vat=5;bad.settings.es={lowIncome:30,planaUntil:'nope',estimates:'yes'};
  const V=B.validate(bad);
  eq('bad rates dropped, never fatal', ['vat' in V.transactions[0],'ret' in V.transactions[0],'vat' in V.categories[0],V.settings.es], [false,false,false,{exempt130:false,lowIncome:0,plana:false,planaUntil:'',estimates:false,cadence:'quarterly',docsDay:10}]);
  // the checklist: documents by the gestor's day, forms on Hacienda's dates, the year's summaries
  const cs=B.validate(JSON.parse(JSON.stringify(s)));cs.checklist={'2026-Q1:303':'2026-04-15','junk':'2026-01-01','2026-Q1:bank':'nope'};
  const CV=B.validate(cs);eq('checklist ticks kept, junk dropped', CV.checklist, {'2026-Q1:303':'2026-04-15'});
  const C=B.esChecklist(CV,'2026','2026-09-30'),[c1,,c3]=C.periods,Y=C.periods.at(-1),find=(p,k)=>p.items.find(i=>i.key.endsWith(':'+k));
  eq('Q1: documents by the 10th, forms on the 20th', [find(c1,'bank').due,find(c1,'303').due,find(c1,'303').done], ['2026-04-10','2026-04-20','2026-04-15']);
  ok('Q1 130 unticked and past its date is late', find(c1,'130').late===true&&find(c1,'303').late===false);
  ok('Q3: rent withholding brings the 115 and rent invoices', !!find(c3,'115')&&!!find(c3,'rent')&&!find(c3,'111'));
  eq('the year: January, February and June dates', [find(Y,'390').due,find(Y,'180').due,find(Y,'347').due,find(Y,'renta').due], ['2027-02-01','2027-02-01','2027-03-01','2027-06-30']);  // 30 Jan and 31 Jan 2027 fall on a weekend; so does 28 Feb
  ok('no 190 without professional or payroll withholding', !find(Y,'190'));
  eq('next open item', [C.next[0].key,C.next[0].due], ['2026-Q3:issued','2026-10-10']);
  const mo=JSON.parse(JSON.stringify(CV));mo.settings.es.cadence='monthly';mo.settings.es.docsDay=5;
  const M=B.esChecklist(B.validate(mo),'2026','2026-09-30');
  eq('monthly cadence: documents per month, by the 5th', M.periods[0].items.filter(i=>i.key.endsWith(':bank')).map(i=>[i.key,i.due]), [['2026-M01:bank','2026-02-05'],['2026-M02:bank','2026-03-05'],['2026-M03:bank','2026-04-05']]);
  ok('a new planner is in euros, dates day-first, categories carry IVA', B.blank().settings.currency==='EUR'&&B.blank().settings.dateFormat==='dmy'&&B.blank().categories.find(c=>c.id==='inc-prof').vat===2100);
  // records: enter once in the original currency, report in euros
  const R=B.blank();R.channels=[{id:'ch-up',name:'Upwork',act:'ai',cur:'USD',evidence:[{id:'e9',type:'taxform',url:'https://drive.google.com/1099',name:'1099',year:2025}]}];
  R.transactions=[
    {id:'r1',date:'2026-03-05',category:'inc-ai',amount:8280,note:'March payout',channel:'ch-up',rec:{kind:'income',act:'ai',cur:'USD',rate:0.9,gross:10000,refunds:0,fees:800,payout:9200,acct:'',evidence:[{id:'e1',type:'payment',url:'https://drive.google.com/a',name:''}],status:'',reviewed:'',notes:''}},
    {id:'r2',date:'2026-03-09',category:'software',amount:6000,note:'Phone',rec:{kind:'expense',act:'digital',vendor:'Movistar',cur:'EUR',rate:1,amount:6000,vatShown:1041,pct:50,acct:'',evidence:[],status:'',reviewed:'',notes:''}},
    {id:'r3',date:'2026-03-20',category:'inc-digital',amount:4500,note:'Imported sale',fx:{currency:'USD',amount:5000}},
    {id:'r4',date:'2026-04-02',category:'inc-ai',amount:1000,note:'Next quarter'}];
  const RV=B.validate(JSON.parse(JSON.stringify(R)));
  eq('records survive a backup round trip', RV.transactions.map(t=>!!t.rec), [true,true,false,false]);
  const i1=B.recOf(RV,RV.transactions[0]),e1=B.recOf(RV,RV.transactions[1]),p1=B.recOf(RV,RV.transactions[2]);
  eq('income record in euros', [i1.grossEUR,i1.feesEUR,i1.payoutEUR,i1.cur,i1.payerName,i1.status], [9000,720,8280,'USD','Upwork','complete']);
  eq('expense record: business share less deductible IVA, missing evidence', [e1.amountEUR,e1.ivaEUR,e1.deductibleEUR,e1.vendor,e1.status], [6000,521,2480,'Movistar','missing']);
  eq('a plain imported row reads as a record', [p1.gross,p1.grossEUR,p1.rate,p1.cur,p1.record], [5000,4500,0.9,'USD',false]);
  const G=B.gestorReport(RV,'2026-01-01','2026-03-31');
  eq('gestor report totals for Q1', G.totals, {gross:13500,refunds:0,fees:720,payout:12780,expenses:6000,deductible:2480,result:13500-720-2480});
  eq('by activity', G.byActivity.filter(a=>a.gross).map(a=>[a.id,a.gross]), [['digital',4500],['ai',9000]]);
  ok('the next quarter stays out', G.income.length===2&&!G.income.some(r=>r.id==='r4'));
  eq('missing evidence listed', G.missing.map(r=>r.id), ['r2','r3']);
  ok('a payer’s 1099 joins the appendix only for its year', !G.evidence.some(e=>e.name==='1099')&&B.gestorReport(RV,'2025-01-01','2025-12-31').evidence.some(e=>e.name==='1099'));
  eq('P&L: gross less fees less the deductible share', (p=>[p.revenue.total,p.net])(B.pl(RV,'2026-01-01','2026-03-31')), [13500,13500-720-2480]);
  // estimates from records: IVA charged and withheld on a Spanish invoice, deductible IVA on a receipt
  const ES=JSON.parse(JSON.stringify(RV));ES.settings.es.estimates=true;
  ES.transactions.push({id:'r5',date:'2026-02-10',category:'inc-prof',amount:106000,note:'Factura 1',rec:{kind:'income',act:'prof',cur:'EUR',rate:1,gross:100000,refunds:0,fees:0,payout:106000,vat:2100,ret:1500,acct:'',evidence:[],status:'',reviewed:'',notes:''}});
  eq('payout implied by IVA and withholding', B.recPayout({gross:100000,refunds:0,fees:0,vat:2100,ret:1500}), 106000);
  const EV=B.validate(ES),Q1=B.esTax(EV,'2026','2026-03-31').quarters[0];
  eq('Q1 from records: IVA out, IVA in, income, expenses, withheld', [Q1.ivaOut,Q1.ivaIn,Q1.income,Q1.expenses,Q1.retIn], [21000,521,113500,720+2480,15000]);
  eq('Q1 Modelo 303', Q1.pay303, 21000-521);
  const net=113500-3200,tax=Math.round((net-Math.round(net*0.05))*0.2);
  eq('Q1 Modelo 130', Q1.pay130, tax-15000);
  const MS=B.esMonths(EV,'2026','2026-03-31'),feb=MS.months.find(m=>m.month==='2026-02');
  eq('set aside in February: IVA plus 20% of profit less withheld', [feb.iva,feb.irpf,feb.total], [21000,20000-15000,26000]);
  ok('set-aside months run to the date', MS.months.length===3&&MS.total===MS.months.reduce((a,m)=>a+m.total,0));
  // take-home: revenue less fees, costs, the cuota (recorded or expected) and income tax
  const TH=JSON.parse(JSON.stringify(EV));TH.settings.es.plana=true;TH.settings.es.planaUntil='';
  const H=B.takeHome(B.validate(TH),'2026-01-01','2026-03-31','2026-03-31');
  eq('take-home parts for Q1', [H.revenue,H.fees,H.expenses,H.cuotaPaid,H.cuotaExpected,H.expectedMonths], [113500,720,2480,0,24000,3]);
  eq('profit and take-home', [H.profit,H.takeHome], [113500-720-2480-24000,H.profit-Math.round(H.profit*H.rate)]);
  eq('IVA kept apart', H.iva, 21000-521);
  TH.settings.es.plana=false;ok('without the tarifa plana and no cuota logged, none is assumed', B.takeHome(B.validate(TH),'2026-01-01','2026-03-31','2026-03-31').cuota===0);
  TH.settings.es.plana=true;TH.settings.es.planaUntil='2026-01-31';ok('the tarifa plana stops at its end date', B.takeHome(B.validate(TH),'2026-01-01','2026-03-31','2026-03-31').cuotaExpected===8000);
  const mig=JSON.parse(JSON.stringify(EV));delete mig.settings.es.plana;mig.settings.es.planaUntil='2026-12-31';ok('an older backup with an end date turns the tarifa plana on', B.validate(mig).settings.es.plana===true);
  // plain entries with IVA (a paid invoice, Quick Log) read on their base
  const PL=B.validate(JSON.parse(JSON.stringify(EV)));PL.transactions.push({id:'p1',date:'2026-03-02',category:'inc-prof',amount:106000,vat:2100,ret:1500,note:'Invoice paid'},{id:'p2',date:'2026-03-03',category:'software',amount:12100,vat:2100,note:'Adobe'});
  const pi=B.recOf(PL,PL.transactions.at(-2)),pe=B.recOf(PL,PL.transactions.at(-1));
  eq('paid invoice: gross on the base, IVA and withholding apart', [pi.grossEUR,pi.ivaEUR,pi.retEUR,pi.payoutEUR], [100000,21000,15000,106000]);
  eq('plain receipt: deductible without its IVA', [pe.amountEUR,pe.ivaEUR,pe.deductibleEUR,pe.ivaDed], [12100,2100,10000,true]);
  eq('usual tag by payer name or its start', [B.usualTagFor('Etsy — My Shop'),B.usualTagFor('etsy'),B.usualTagFor('Etsyland'),B.usualTagFor('YouTube / Google AdSense'),B.usualTagFor('Nobody')], ['Digital products','Digital products','','Ad revenue','']);
  ok('seeded payers start with their tags', (b=>b.channels.find(c=>c.name==='Patreon')?.tag&&b.tags.some(t=>t.name==='Memberships'))(B.blank()));
  const badR=JSON.parse(JSON.stringify(R));badR.transactions[0].rec.evidence.push({id:'x',type:'nope',url:'javascript:alert(1)'});badR.transactions[1].rec.pct=250;
  const BV=B.validate(badR);
  ok('unsafe links dropped, shares clamped', BV.transactions[0].rec.evidence.every(e=>!/^javascript/i.test(e.url||''))&&BV.transactions[1].rec.pct<=100);
};
