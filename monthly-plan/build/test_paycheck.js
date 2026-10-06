// Paycheck budget: paydays, periods, which paycheck pays each bill, spending per paycheck or per month. Money in cents.
const path=require('path'),{extractImportTo}=require('./extract.js');
module.exports=({eq,ok})=>{
  const {Pay:P}=require(extractImportTo(path.join(__dirname,'../app/DebtFreePlan.html'),path.join(__dirname,'import.paycheck.js')));
  const bw={id:'a',name:'Job',amount:200000,freq:'biweekly',start:'2026-10-09'};
  eq('every 2 weeks from the next payday', P.paydays(bw,'2026-10-01','2026-11-30'), ['2026-10-09','2026-10-23','2026-11-06','2026-11-20']);
  eq('weekly', P.paydays({...bw,freq:'weekly'},'2026-10-01','2026-10-31'), ['2026-10-09','2026-10-16','2026-10-23','2026-10-30']);
  const sm={id:'b',name:'Partner',amount:160000,freq:'semimonthly',day1:15,day2:31,start:'2026-09-01'};
  eq('twice a month on the 15th and the last day; a weekend moves to the Friday before', P.paydays(sm,'2026-10-01','2026-11-30'), ['2026-10-15','2026-10-30','2026-11-13','2026-11-30']);
  eq('…or the Monday after', P.paydays({...sm,weekend:'after'},'2026-11-01','2026-11-30'), ['2026-11-02','2026-11-16','2026-11-30']);
  eq('…or not at all', P.paydays({...sm,weekend:'none'},'2026-11-01','2026-11-30'), ['2026-11-15','2026-11-30']);
  eq('monthly on the 1st (Nov 1 is a Sunday: the Friday before)', P.paydays({...bw,freq:'monthly',start:'2026-10-01'},'2026-10-01','2026-12-31'), ['2026-10-01','2026-10-30','2026-12-01']);
  eq('nothing before the first payday', P.paydays(bw,'2026-09-01','2026-10-08'), []);
  eq('a stopped income stops', P.paydays({...bw,status:'stopped',stopped:'2026-10-23'},'2026-10-01','2026-11-30'), ['2026-10-09']);
  // periods: payday to the day before the next, from either income
  const R=P.periods([bw],'2026-10-01','2026-10-31');
  eq('periods run payday to the day before the next', R.map(p=>p.start+'..'+p.end), ['2026-10-09..2026-10-22','2026-10-23..2026-11-05']);
  const R2=P.periods([bw,sm],'2026-10-09','2026-10-31');
  eq('two incomes interleave', R2.map(p=>p.start), ['2026-10-09','2026-10-15','2026-10-23','2026-10-30']);
  eq('the same day from two incomes is one paycheck', P.periods([bw,{...bw,id:'c',name:'Side'}],'2026-10-09','2026-10-09')[0].pays.length, 2);
  eq('periods starting in a month', [P.startsIn([bw],'2026-10'),P.startsIn([bw],'2027-01')], [2,3]);
  // the plan: a bill comes out of the paycheck before it's due
  const rent={id:'r',name:'Rent',amount:120000,kind:'bill',freq:'monthly',start:'2026-01-01'},phone={id:'p',name:'Phone',amount:8000,kind:'bill',freq:'monthly',start:'2026-01-12'};
  const envs=[{id:'g',name:'Groceries',amount:60000,per:'month'},{id:'s',name:'Savings',amount:10000,kind:'save'}];
  const S={incomes:[bw],bills:[rent,phone],envelopes:envs,log:[],spend:[{id:'x',env:'g',date:'2026-10-10',amount:4500}]};
  const L=P.plan(S,'2026-10-09',3,'2026-10-10');
  eq('three paychecks from Oct 9', L.map(p=>p.start), ['2026-10-09','2026-10-23','2026-11-06']);
  eq('phone (12th) from Oct 9; rent (Nov 1) from Oct 23', [L[0].bills.map(i=>i.b.id),L[1].bills.map(i=>i.b.id)], [['p'],['r']]);
  eq('groceries $600 a month: 14 of October’s 31 days', L[0].envs.find(x=>x.e.id==='g').planned, Math.round(60000*14/31));
  eq('spent this paycheck', L[0].envs.find(x=>x.e.id==='g').spent, 4500);
  eq('left = paycheck − bills − spending − saving', L[0].left, 200000-8000-Math.round(60000*14/31)-10000);
  const T=P.plan({...S,incomes:[bw,sm]},'2026-10-09',2,'2026-10-10');
  eq('“each paycheck” follows the main income: none on the partner’s payday', [T[0].envs.find(x=>x.e.id==='s').planned,T[1].envs.find(x=>x.e.id==='s').planned], [10000,0]);
  eq('…and a month amount splits by days (6 days of Oct 9–14)', T[0].envs.find(x=>x.e.id==='g').planned, Math.round(60000*6/31));
  ok('the rent paycheck is short when rent is big', P.plan({...S,bills:[{...rent,amount:190000}]},'2026-10-09',2,'2026-10-10')[1].short);
  // moving a bill to another paycheck
  const M=P.plan({...S,moves:{'r|2026-11-01':'2026-10-09'}},'2026-10-09',2,'2026-10-10');
  eq('a moved bill comes out of the paycheck you chose', [M[0].bills.map(i=>i.b.id).sort(),M[1].bills.length,M[0].bills.find(i=>i.b.id==='r').moved], [['p','r'],0,true]);
  // what you actually got paid
  eq('a confirmed paycheck uses the amount you got', P.plan({...S,got:{'a|2026-10-09':185000}},'2026-10-09',1,'2026-10-10')[0].income, 185000);
  // carrying what's left
  const K=P.plan({...S,carry:true},'2026-10-09',2,'2026-10-10');
  eq('carry: the next paycheck starts with what this one left', K[1].carryIn, K[0].left);
  eq('a paused envelope plans nothing', P.envAmount({amount:5000,status:'paused'},L[0],[bw]), 0);
  eq('a year of an income', [P.yearOf(bw),P.yearOf(sm)], [200000*26,160000*24]);
  eq('validate', [P.validate({name:'',amount:0}).length,P.validate({name:'Job',amount:100,start:'2026-10-09'}).length], [3,0]);
};
