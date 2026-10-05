// Bills & subscriptions: due dates, prices, months and renewals. Money in cents.
const path=require('path'),{extractImportTo}=require('./extract.js');
module.exports=({eq,ok})=>{
  const {BillCal:C}=require(extractImportTo(path.join(__dirname,'../app/DebtFreePlan.html'),path.join(__dirname,'import.bills.js')));
  const rent={id:'r',name:'Rent',amount:145000,freq:'monthly',start:'2026-01-31',kind:'bill'};
  // the 31st falls on the last day of shorter months, and comes back to the 31st after
  eq('monthly on the 31st keeps the month end', C.occurrences(rent,'2026-01-01','2026-04-30'), ['2026-01-31','2026-02-28','2026-03-31','2026-04-30']);
  eq('weekly every 7 days from the first date', C.occurrences({freq:'weekly',start:'2026-09-30'},'2026-10-01','2026-10-31'), ['2026-10-07','2026-10-14','2026-10-21','2026-10-28']);
  eq('every 2 weeks', C.occurrences({freq:'biweekly',start:'2026-01-02'},'2026-10-01','2026-10-31'), ['2026-10-09','2026-10-23']);
  eq('yearly on its anniversary, Feb 29 on Feb 28', C.occurrences({freq:'yearly',start:'2024-02-29'},'2025-01-01','2028-12-31'), ['2025-02-28','2026-02-28','2027-02-28','2028-02-29']);
  eq('quarterly', C.occurrences({freq:'quarterly',start:'2026-01-15'},'2026-01-01','2026-12-31'), ['2026-01-15','2026-04-15','2026-07-15','2026-10-15']);
  eq('once is once', C.occurrences({freq:'once',start:'2026-05-05'},'2026-01-01','2026-12-31'), ['2026-05-05']);
  eq('nothing before the first date', C.occurrences(rent,'2025-01-01','2025-12-31'), []);
  eq('an end date stops it', C.occurrences({...rent,end:'2026-03-15'},'2026-01-01','2026-12-31').length, 2);
  eq('cancelled: nothing from the day it stopped', C.occurrences({...rent,status:'cancelled',stopped:'2026-03-31'},'2026-01-01','2026-12-31'), ['2026-01-31','2026-02-28']);
  eq('a start years ago is still fast and right', C.occurrences({freq:'weekly',start:'2010-01-04'},'2026-10-01','2026-10-12'), ['2026-10-05','2026-10-12']);
  // costs spread over the year
  eq('per month: yearly $120 is $10', C.perMonth({amount:12000,freq:'yearly'}), 1000);
  eq('per month: weekly $10 is $43.33', C.perMonth({amount:1000,freq:'weekly'}), 4333);
  eq('paused bills cost nothing going forward', C.perMonth({amount:1000,freq:'monthly',status:'paused'}), 0);
  // prices: a new price from a date keeps past months right
  let n={id:'n',name:'Stream',amount:1549,freq:'monthly',start:'2025-03-07',kind:'sub'};
  n=C.setPrice(n,1799,'2026-07-07');
  eq('the new price is the current one', n.amount, 1799);
  eq('before the change: the old price', C.amountOn(n,'2026-06-07'), 1549);
  eq('from the change: the new price', C.amountOn(n,'2026-08-07'), 1799);
  eq('a price rise is reported', C.priceChanges(n).map(c=>[c.old,c.now,c.up,c.pct]), [[1549,1799,true,16]]);
  // trials: free until the trial ends
  const t={id:'t',name:'Trial',amount:999,freq:'monthly',start:'2026-10-03',trial:{until:'2026-10-31',amount:0},kind:'sub'};
  eq('free during the trial, full price from the day it ends', [C.amountOn(t,'2026-10-03'),C.amountOn(t,'2026-10-31'),C.amountOn(t,'2026-11-03')], [0,999,999]);
  eq('nothing is due while a free trial runs; charges start the day it ends', C.due([t],[],'2026-10-01','2026-11-30','2026-10-01').map(i=>i.due), ['2026-10-31','2026-11-30']);
  // a month: paid, autopay, overdue, soon, upcoming, skipped
  const B=[rent,{id:'p',name:'Phone',amount:6500,freq:'monthly',start:'2026-01-05',autopay:true},{id:'e',name:'Power',amount:9000,freq:'monthly',start:'2026-01-08'},{id:'w',name:'Water',amount:4000,freq:'monthly',start:'2026-01-12'},{id:'g',name:'Gym',amount:3000,freq:'monthly',start:'2026-01-14'}];
  const log=[{id:'l1',bill:'r',due:'2026-10-31',date:'2026-10-01',amount:145000},{id:'l2',bill:'g',due:'2026-10-14',date:'2026-10-01',skip:true}];
  const M=C.month(B,log,'2026-10','2026-10-10');
  eq('states in a month', M.items.map(i=>i.b.id+':'+i.state), ['p:auto','e:overdue','w:soon','g:skipped','r:paid']);
  eq('totals: skipped is nothing due; autopay and paid count as paid', [M.total,M.paid,M.left,M.count,M.paidCount], [145000+6500+9000+4000,145000+6500,9000+4000,4,2]);
  eq('the overdue list', M.overdue.map(i=>i.b.id), ['e']);
  // a paid amount that differs from the bill is kept
  eq('the logged amount wins', C.month(B,[{id:'x',bill:'e',due:'2026-10-08',date:'2026-10-08',amount:11234}],'2026-10','2026-10-10').items.find(i=>i.b.id==='e').amount, 11234);
  // a year, month by month
  const Y=C.yearSpread([rent,{id:'y',name:'Prime',amount:13900,freq:'yearly',start:'2025-06-20',kind:'sub'}],'2026');
  eq('a yearly bill lands in its month', [Y[5].sub,Y[4].sub,Y[5].bill], [13900,0,145000]);
  eq('the year adds up', Y.reduce((s,m)=>s+m.total,0), 145000*12+13900);
  // the next 12 months, across a year end
  const N=C.spread([rent,{id:'y',name:'Prime',amount:13900,freq:'yearly',start:'2025-06-20',kind:'sub'}],'2026-10',12);
  eq('12 months from October run to September', [N[0].month,N[3].month,N[11].month], ['2026-10','2027-01','2027-09']);
  eq('the yearly bill lands once in the next 12 months', N.reduce((s,m)=>s+m.sub,0), 13900);
  // a category from the name
  eq('categories guessed from names', ['Car insurance','Rent','Electric','Verizon','Netflix','iCloud','Gym','Student loan','Daycare','Zorblat'].map(n=>C.guessCat(n,'bill')), ['insurance','housing','utilities','phone','streaming','software','memberships','loans','kids','other']);
  eq('an unknown subscription is streaming', C.guessCat('Zorblat','sub'), 'streaming');
  // renewals, trials and reminders in a window
  const ev=C.upcomingEvents([{id:'y',name:'Prime',amount:13900,freq:'yearly',start:'2025-11-02',kind:'sub'},t,{...rent,cancelBy:'2026-10-20'}],'2026-10-10',30);
  eq('upcoming events in order', ev.map(e=>e.b.id+':'+e.type), ['r:cancel','t:trial','y:renewal']);
  // savings from cancelling: what it would have cost since
  eq('cancelled 3 months ago saves 3 payments', C.savedSince({id:'h',amount:1899,freq:'monthly',start:'2025-01-15',status:'cancelled',stopped:'2026-07-01'},'2026-10-10'), 1899*3);
  eq('validation', C.validate({name:'',amount:-1,start:'x',freq:'zzz'}).length, 4);
  eq('next due from a day', C.nextDue(rent,'2026-03-01'), '2026-03-31');
};
