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

  const s=B.blank();s.settings.es={exempt130:false,lowIncome:0,planaUntil:''};
  const tx=(id,date,category,amount,vat,ret)=>({id,date,category,amount,note:id,...(vat?{vat}:{}),...(ret?{ret}:{})});
  s.transactions=[
    tx('a','2026-02-10','services',106000,2100,1500),   // €1,000 base, IVA 210, withheld 150
    tx('b','2026-02-12','software',24200,2100),          // €200 base, IVA 42
    tx('c','2026-03-01','cuota',30000),                  // €300 cuota, no IVA
    tx('d','2026-03-05','interest',1000),                // not activity income
    tx('e','2026-05-10','materials',121000,2100),        // Q2: €1,000 base, IVA 210 → IVA credit
    tx('f','2026-08-10','services',242000,2100),         // Q3: €2,000 base, IVA 420, no withholding
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
  const low=JSON.parse(JSON.stringify(s));low.settings.es.lowIncome=100;low.transactions.push(tx('h','2026-01-20','services',605000,2100));
  eq('low-income deduction comes off the 130', (T=>T.quarters[0].pay130)(B.esTax(B.validate(low),'2026','2026-09-30')), Math.round((550000-27500)*0.2)-15000-10000);
  // P&L counts the base, never the IVA; bank interest is other income, below operating profit
  eq('P&L on the base', (p=>[p.revenue.total,p.net])(B.pl(B.validate(JSON.parse(JSON.stringify(s))),'2026-01-01','2026-03-31')), [100000,100000-20000-30000+1000]);
  // backups: bad rates are dropped, settings get defaults
  const bad=JSON.parse(JSON.stringify(s));bad.transactions[0].vat=1800;bad.transactions[0].ret=1234;bad.categories[0].vat=5;bad.settings.es={lowIncome:30,planaUntil:'nope'};
  const V=B.validate(bad);
  eq('bad rates dropped, never fatal', ['vat' in V.transactions[0],'ret' in V.transactions[0],'vat' in V.categories[0],V.settings.es], [false,false,false,{exempt130:false,lowIncome:0,planaUntil:'',cadence:'quarterly',docsDay:10}]);
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
  ok('a new planner is in euros, dates day-first, categories carry IVA', B.blank().settings.currency==='EUR'&&B.blank().settings.dateFormat==='dmy'&&B.blank().categories.find(c=>c.id==='services').vat===2100);
};
