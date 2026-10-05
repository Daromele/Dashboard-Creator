// Net worth & FIRE: balances carried forward, totals, the series, the FIRE number and the road to it. Money in cents.
const path=require('path'),{extractImportTo}=require('./extract.js');
module.exports=({eq,ok})=>{
  const {NetWorth:N}=require(extractImportTo(path.join(__dirname,'../app/DebtFreePlan.html'),path.join(__dirname,'import.networth.js')));
  const A=[{id:'c',name:'Checking',side:'asset',type:'cash'},{id:'i',name:'Index fund',side:'asset',type:'invest',fi:true},{id:'r',name:'401(k)',side:'asset',type:'retire',fi:true},{id:'v',name:'Visa',side:'debt',type:'card'}];
  const S=[{month:'2026-01',values:{c:500000,i:1000000,v:200000}},{month:'2026-03',values:{c:600000,i:1100000,r:2000000,v:100000}},{month:'2026-04',values:{i:1200000}}];
  // a month without a check-in carries the last balance forward; an account appears from its first balance
  eq('carried forward', [N.balanceAt(A[0],S,'2026-02'),N.balanceAt(A[0],S,'2026-04'),N.balanceAt(A[2],S,'2026-02')], [500000,600000,null]);
  eq('a closed account is 0 from the month it closed', N.balanceAt({...A[0],closed:'2026-04'},S,'2026-04'), 0);
  const T=N.totals(A,S,'2026-04');
  eq('totals: assets, debts, net, toward FI, cash', [T.assets,T.debts,T.net,T.fi,T.liquid], [3800000,100000,3700000,3200000,600000]);
  const Se=N.series(A,S);
  eq('one point a month, gaps filled', Se.map(x=>x.month+':'+x.net), ['2026-01:1300000','2026-02:1300000','2026-03:3600000','2026-04:3700000']);
  eq('the series can run on to today', N.series(A,S,'2026-06').length, 6);
  eq('pace: average change a month', N.pace(Se,3), Math.round((3700000-1300000)/3));
  // the FIRE number: spending ÷ withdrawal rate
  eq('$40,000 a year at 4% needs $1,000,000', N.fireNumber(4000000,400), 100000000);
  eq('at 3.5%', N.fireNumber(3500000,350), 100000000);
  eq('no rate, no number', N.fireNumber(4000000,0), 0);
  // growth
  const P=N.project(1000000,100000,0,12);
  eq('0% return: start plus 12 deposits', [P.length,P.at(-1)], [13,2200000]);
  ok('5% real return a year compounds monthly', Math.abs(N.project(10000000,0,500,12).at(-1)-10500000)<=1);
  eq('months to a target with no growth', N.monthsTo(0,100000,0,1200000), 12);
  eq('already there', N.monthsTo(5000000,0,500,4000000), 0);
  eq('never, with nothing going in and no growth', N.monthsTo(0,0,0,100), null);
  const m=N.monthsTo(10000000,200000,500,100000000);ok('$100k + $2k/mo at 5% reaches $1M in about 19 years', m>=222&&m<=234, m);
  // Coast FI: what grows to the target with no more saving
  eq('coast: $1M in 30 years at 5%', N.coast(100000000,500,30), Math.round(100000000/Math.pow(1.05,30)));
  eq('coast with no years left is the target', N.coast(100000000,500,0), 100000000);
  // milestones
  eq('first month each mark was reached', N.reached(Se,[1000000,2500000,5000000]).map(x=>x.month), ['2026-01','2026-03',null]);
  // a type from the name
  eq('types guessed from names', ['Harbor checking','High-yield savings','Roth IRA','Vanguard brokerage','Car loan','Visa card','Mortgage','Student loan','My house','Bitcoin'].map(n=>N.guessType(n)), ['cash','savings','retire','invest','auto','card','mortgage','student','property','crypto']);
  eq('within a side', [N.guessType('Credit union savings','asset'),N.guessType('Zorblat','debt'),N.guessType('Zorblat','asset')], ['savings','other-debt','cash']);
  eq('guessAny finds debts by name', [N.guessAny('Visa'),N.guessAny('Zorblat')], ['card','']);
  eq('validate', [N.validate({name:'',side:'asset'}).length,N.validate({name:'x',side:'asset'}).length], [1,0]);
};
