// Debt Free Plan: the payoff maths. Money in cents, APR in hundredths of a percent.
const path=require('path'),{extractImportTo}=require('./extract.js');
module.exports=({eq,ok})=>{
  const {Budget:B,Debt:D}=require(extractImportTo(path.join(__dirname,'../app/DebtFreePlan.html'),path.join(__dirname,'import.debt.js')));
  // a textbook loan: $10,000 at 6% over 60 months is $193.33 a month and $1,599.68 of interest
  eq('loan payment formula', D.loanPayment(1000000,600,60), 19333);
  const a=D.amortize({balance:1000000,apr:600},19333,'2026-01');
  eq('amortization: 60 months and the textbook interest', [a.rows.length,a.interest,a.done], [60,159968,true]);
  eq('the payment that finishes by a date', D.paymentToFinishBy({balance:1000000,apr:600},'2026-01','2030-12'), 19333);
  // three debts, $900 a month
  const debts=[{id:'a',balance:500000,apr:2499,min:15000,minMode:'card',limit:600000},{id:'b',balance:120000,apr:1800,min:4000},{id:'c',balance:1500000,apr:650,min:30000}];
  const P={budget:90000,start:'2026-10'},c=D.compare(debts,P);
  ok('avalanche pays the least interest', c.avalanche.totalInterest<=Math.min(c.snowball.totalInterest,c.cashflow.totalInterest,c.custom.totalInterest));
  eq('snowball clears the smallest balance first', Object.entries(c.snowball.payoff).sort((x,y)=>x[1].localeCompare(y[1]))[0][0], 'b');
  eq('avalanche clears the highest rate first', Object.entries(c.avalanche.payoff).sort((x,y)=>x[1].localeCompare(y[1]))[0][0], 'a');
  ok('paying only the minimums takes longer and costs more', c.minimums.count>c.avalanche.count*2&&c.minimums.totalInterest>c.avalanche.totalInterest*2,JSON.stringify([c.minimums.count,c.avalanche.count]));
  const s=c.avalanche;eq('every dollar paid is a balance plus its interest', s.totalPaid, 500000+120000+1500000+s.totalInterest);
  eq('the budget is spent every month until the end', s.months.slice(0,-1).every(r=>r.paid===90000), true);
  // a custom order is followed
  eq('your own order is followed', Object.entries(D.simulate(debts,{...P,strategy:'custom',custom:['c','b','a']}).payoff).sort((x,y)=>x[1].localeCompare(y[1]))[0][0], 'c');
  // one-off payments: a lump sum shortens the plan
  const lump=D.simulate(debts,{...P,strategy:'avalanche',extras:[{month:'2026-12',amount:300000}]});
  ok('a lump sum makes it sooner and cheaper', lump.count<s.count&&lump.totalInterest<s.totalInterest);
  // a budget below the minimums is flagged
  eq('a budget below the minimums shows the shortfall', D.simulate(debts,{...P,budget:30000}).shortfall>0, true);
  // a balance that grows never ends
  eq('a minimum below the interest never finishes', D.simulate([{id:'g',balance:500000,apr:2999,min:10000}],{budget:10000,start:'2026-10'}).never, true);
  // a 0% promotion: no interest until it ends, then the standard rate
  const promo=D.simulate([{id:'p',balance:300000,apr:2499,min:20000,promo:{apr:0,until:'2027-03'}}],{budget:20000,start:'2026-10'});
  eq('no interest while a 0% promotion lasts', promo.months.slice(0,6).every(r=>r.interest===0), true);
  ok('interest starts after the promotion', promo.months[6].interest>0);
  // card-style minimums fall as the balance falls, and never drop under the floor
  eq('card minimum: 1% plus interest, floored', [D.minimumDue({min:3500,minMode:'card'},500000+10400,10400),D.minimumDue({min:3500,minMode:'card'},100000,2000)], [15400,3500]);
  // today's balance: interest each month, payments off, a statement resets it
  eq('a balance estimate between statements', D.balanceNow({id:'x',balance:100000,apr:1200,since:'2026-01-15'},[{debt:'x',date:'2026-02-10',amount:20000,kind:'payment'},{debt:'x',date:'2026-03-05',amount:90000,kind:'balance'}],'2026-04-20').balance, 90900);
  // what if: a balance transfer and a consolidation loan
  const bt=D.whatIf(debts,P,{transfer:{debt:'a',feePct:300,promoApr:0,apr:2499,months:15}});
  eq('a balance transfer adds its fee to the balance', bt.debts.find(d=>d.id==='a').balance, 515000);
  const cl=D.whatIf(debts,P,{consolidate:{debts:['a','b'],apr:1100,months:36,feePct:0}});
  eq('a consolidation loan replaces the debts it pays off', [cl.debts.length,cl.debts.at(-1).balance,cl.debts.at(-1).min], [2,620000,D.loanPayment(620000,1100,36)]);
  eq('an extra amount each month raises the budget', D.whatIf(debts,P,{extra:5000}).plan.budget, 95000);
  // warnings
  eq('a balance growing on its minimum is warned about', D.warnings([{id:'g',balance:500000,apr:2999,min:10000}],'2026-10')[0].kind, 'growing');
  eq('a promotion ending soon is warned about', D.warnings([{id:'p',balance:100000,apr:2499,min:5000,promo:{apr:0,until:'2026-12'}}],'2026-10')[0].kind, 'promo-ending');
  // the edition's blank and sample keep debts
  ok('a blank Debt Free Plan has debts, a log and a plan', Array.isArray(B.blank().debts)&&B.blank().debtPlan.strategy==='avalanche');
  const S=B.sample('2026-09');ok('the sample has six debts and payments', S.debts.length===6&&S.debtLog.length>10);
  eq('saved debts survive a round trip through validation', B.validate(JSON.parse(JSON.stringify(S))).debts.length, 6);
};
