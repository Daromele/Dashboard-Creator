// Rental properties: rent roll, expenses with repeats and the loan, Schedule E, landlord numbers. Money in cents.
const path=require('path'),{extractImportTo}=require('./extract.js');
module.exports=({eq,ok})=>{
  const {Rental:R}=require(extractImportTo(path.join(__dirname,'../app/DebtFreePlan.html'),path.join(__dirname,'import.rental.js')));
  const S={props:[{id:'p1',name:'Maple duplex',kind:'multi',added:'2026-01-01',value:40000000,price:32000000,invested:8000000,units:[{id:'u1',name:'Unit A'},{id:'u2',name:'Unit B'}],loan:{payment:150000,interest:110000}},
                  {id:'p2',name:'Oak condo',kind:'condo',added:'2026-03-01',value:20000000,units:[{id:'u3',name:'Condo'}]}],
    leases:[{id:'l1',prop:'p1',unit:'u1',tenant:'Sam',rent:140000,start:'2025-06-01',end:'2026-11-30',due:1,grace:5,deposit:140000,lateFee:5000},
            {id:'l2',prop:'p2',unit:'u3',tenant:'Ana',rent:180000,start:'2026-03-01',due:1,grace:3,deposit:180000}],
    pays:[{id:'a',lease:'l1',month:'2026-10',date:'2026-10-02',amount:140000},{id:'b',lease:'l2',month:'2026-10',date:'2026-10-01',amount:100000},{id:'c',lease:'l1',month:'2026-09',date:'2026-09-01',amount:140000}],
    exps:[{id:'e1',prop:'p1',date:'2026-01-15',amount:9000,cat:'insurance',repeat:'monthly'},{id:'e2',prop:'p1',date:'2026-10-03',amount:35000,cat:'repairs',repeat:'once'},{id:'e3',prop:'p2',date:'2026-04-20',amount:240000,cat:'taxes',repeat:'yearly'}]};
  const roll=R.roll(S,'2026-10','2026-10-06');
  eq('rent roll: three units', roll.length, 3);
  eq('Unit A paid', roll.find(r=>r.unit.id==='u1').status, 'paid');
  eq('Unit B vacant', !!roll.find(r=>r.unit.id==='u2').vacant, true);
  const c=roll.find(r=>r.unit.id==='u3');
  eq('Condo part paid and late after its 3-day grace', [c.status,c.left,c.daysLate], ['late-part',80000,5]);
  eq('within grace it is only due', R.roll(S,'2026-10','2026-10-03').find(r=>r.unit.id==='u3').status, 'part');
  eq('next month is upcoming', R.roll(S,'2026-11','2026-10-06').find(r=>r.unit.id==='u1').status, 'upcoming');
  eq('a lease ending in November is gone in December (vacant)', !!R.roll(S,'2026-12','2026-10-06').find(r=>r.unit.id==='u1').vacant, true);
  eq('due day clamps to short months', R.dueDate({due:31},'2026-02'), '2026-02-28');
  const oct=R.expenses(S,'2026-10-01','2026-10-31');
  eq('October expenses: insurance, repair, loan interest and principal', oct.map(x=>[x.cat,x.amount]).sort(), [['insurance',9000],['mortgage',110000],['principal',40000],['repairs',35000]].sort());
  eq('yearly tax repeats each April', R.expenses(S,'2027-04-01','2027-04-30').filter(x=>x.cat==='taxes').length, 1);
  eq('loan starts the month the property was added', R.expenses(S,'2025-12-01','2025-12-31').length, 0);
  const M=R.months(S,'2026-10','2026-10');
  eq('October: in, out, net', [M[0].income,M[0].expenses,M[0].net], [240000,194000,46000]);
  eq('the month under way stops at today (no future expenses)', R.months(S,'2026-10','2026-10',undefined,'2026-10-02')[0].expenses, 150000+9000*0);
  eq('opex leaves out interest and principal', M[0].opex, 44000);
  const E=R.scheduleE(S,2026),d=E.find(x=>x.prop.id==='p1');
  eq('Schedule E rents for the duplex (cash received in 2026)', d.rents, 280000);
  ok('Schedule E has the mortgage interest line 12', d.lines.some(l=>l.key==='mortgage'&&l.line===12&&l.amount===110000*12));
  eq('principal is listed apart, not deducted', d.expenses, 9000*12+35000+110000*12);
  const m=R.metrics(S,'2026-10-06','p1');
  eq('duplex: 2 units, 1 occupied', [m.units,m.occupied], [2,1]);
  ok('cap rate and cash-on-cash come from annualized real months', m.capRate!==null&&m.cashOnCash!==null);
  eq('deposits held', R.metrics(S,'2026-10-06').deposits, 320000);
  eq('1% rule: rent / price', m.onePct, 140000/32000000);
  eq('leases ending in 60 days', R.ending(S,'2026-10-06').map(l=>l.id), ['l1']);
  eq('guess: plumber → repairs, HOA → hoa, county tax → taxes, lawn → cleaning', ['Plumber visit','HOA dues','County tax bill','Lawn care'].map(R.guess), ['repairs','hoa','taxes','cleaning']);
  eq('first month with data: money or a property added, not a lease start', R.firstMonth(S), '2026-01');
  eq('per property', R.firstMonth(S,'p2'), '2026-03');
  eq('whole months only: 9 complete months for the duplex', R.metrics(S,'2026-10-06','p1').months, 9);
  eq('Schedule E stops at today for the current year', R.scheduleE(S,2026,'2026-10-06').find(x=>x.prop.id==='p1').lines.find(l=>l.key==='mortgage').amount, 110000*10);
};
