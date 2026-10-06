// Budget methods: 50/30/20, 70/20/10, 80/20, zero-based. Money in cents.
const path=require('path'),{extractImportTo}=require('./extract.js');
module.exports=({eq,ok})=>{
  const {Split:S}=require(extractImportTo(path.join(__dirname,'../app/DebtFreePlan.html'),path.join(__dirname,'import.split.js')));
  const items=[{amount:150000,tag:'need'},{amount:60000,tag:'need'},{amount:40000,tag:'want'},{amount:30000,tag:'save'},{amount:20000,tag:'debt'}];
  const A=S.compute(items,400000,'50-30-20');
  eq('50/30/20: needs, wants, savings & debt', A.rows.map(r=>[r.key,r.actual,r.goal,r.pct]), [['need',210000,200000,52.5],['want',40000,120000,10],['save',50000,80000,12.5]]);
  eq('unassigned is what no line takes', A.unassigned, 400000-300000);
  const B=S.compute(items,400000,'70-20-10');
  eq('70/20/10: living, savings, debt', B.rows.map(r=>[r.key,r.actual]), [['live',250000],['save',30000],['debt',20000]]);
  eq('80/20: savings apart from everything else', S.compute(items,400000,'80-20').rows.map(r=>r.actual), [270000,30000]);
  const Z=S.compute(items,400000,'zero');
  eq('zero-based: only what is left to assign', [Z.zero,Z.assigned,Z.unassigned,Z.rows], [true,300000,100000,undefined]);
  eq('an unknown method falls back to 50/30/20', S.compute(items,400000,'nope').id, '50-30-20');
  eq('no income: no shares', S.compute(items,0,'50-30-20').rows[0].pct, 0);
  eq('the closest method', S.bestFit([{amount:280000,tag:'need'},{amount:40000,tag:'debt'},{amount:80000,tag:'save'}],400000), '70-20-10');
  eq('tags from names', ['Groceries','Eating out','Emergency fund','Student loan','Gas','Fun money','Rent','Daycare'].map(n=>S.guess(n)), ['need','want','save','debt','need','want','need','need']);
};
