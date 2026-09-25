// N = the budget edition as built today, O = the frozen v1.8 module it must keep matching.
const {extractTo}=require('./extract.js'),path=require('path'),fs=require('fs');
extractTo(path.join(__dirname,'../app/MonthlyBudgetPlanner.html'),path.join(__dirname,'budget.new.js'));
fs.copyFileSync(path.join(__dirname,'baseline/budget-v1.8.js'),path.join(__dirname,'budget.old.js'));
const N=require('./budget.new.js'), O=require('./budget.old.js');
let fail=0, pass=0;
const eq=(name,a,b)=>{const x=JSON.stringify(a),y=JSON.stringify(b);
  if(x===y){pass++;}else{fail++;console.log("MISMATCH:",name,"\n  new:",String(x).slice(0,300),"\n  old:",String(y).slice(0,300));}};
const ok=(name,cond,extra='')=>{if(cond){pass++;}else{fail++;console.log("FAIL:",name,extra);}};

// v1.9 adds a Transfers group and four default categories. The v1.8 comparisons below run on the
// v1.8 category set; the additions are checked on their own further down.
const V18_IDS=new Set(O.blank().categories.map(c=>c.id));
const ADDED=['taxes','retirement','card-payoff','own-transfer'];
function fixture(B){
  const s=B.blank();s.categories=s.categories.filter(c=>V18_IDS.has(c.id));
  s.settings.name='Test';
  const amounts={salary:300000,housing:150000,groceries:50000,dining:20000,emergency:40000,investing:25000,credit:18000,streaming:1500};
  for(const m of ['2026-07','2026-08','2026-09']){
    s.months[m]={opening:120000,closed:m==='2026-07',note:'n '+m,plan:{}};
    Object.entries(amounts).forEach(([id,a],i)=>{s.months[m].plan[id]={amount:a,day:i===0?1:Math.min(28,i*3+2)};});
  }
  let n=0;
  for(const m of ['2026-07','2026-08','2026-09'])
    for(const [id,a] of Object.entries(amounts))
      for(const d of [3,11,19,27]){
        n++;
        s.transactions.push({id:'t'+n,date:`${m}-${String(d).padStart(2,'0')}`,category:id,
          amount: (n%17===0? -Math.round(a/8) : Math.round(a/4)),note:'note '+n});
      }
  s.schedules=[{id:'sch1',name:'Rent',category:'housing',amount:150000,frequency:'monthly',start:'2026-07-01',end:'2026-12-31'},
               {id:'sch2',name:'Pay',category:'salary',amount:300000,frequency:'biweekly',start:'2026-07-03',end:'2026-12-31'},
               {id:'sch3',name:'Netflix',category:'streaming',amount:1500,frequency:'quarterly',start:'2026-07-09',end:'2026-12-31'}];
  s.goals=[{id:'g1',category:'emergency',name:'Cushion',target:1000000,opening:150000,start:'2026-01-01',due:'2027-06-30'},
           {id:'g2',category:'investing',name:'Invest',target:480000,opening:0,start:'2026-01-01',due:'2026-12-31'}];
  s.snapshots={'2026-08':{cash:120000,savings:190000,investments:600000,other:150000,debts:300000,
                          debtMix:{credit:100000,loans:100000,mortgage:100000,other:0},note:'snap'}};
  s.reviews={'2026-08-31':{win:'w',change:'c',checks:[true,false,true],done:true}};
  s.quickMemory={'coffee':'dining','rent':'housing'};
  return s;
}
const sn=fixture(N), so=fixture(O);

// ---- identical results across every read path ----
for(const m of ['2026-06','2026-07','2026-08','2026-09','2026-10']){
  eq('transactions '+m, N.transactions(sn,m).map(t=>t.id).sort(), O.transactions(so,m).map(t=>t.id).sort());
  eq('rows '+m, N.rows(sn,m), O.rows(so,m));
  eq('totals '+m, N.totals(sn,m), O.totals(so,m));
  eq('due '+m, N.due(sn,m), O.due(so,m));
  eq('occurrences '+m, N.occurrences(sn,m), O.occurrences(so,m));
  eq('reserves '+m, N.reserves(sn,m,'2026-08-20'), O.reserves(so,m,'2026-08-20'));
  eq('schedulePlan '+m, N.schedulePlan(sn,m), O.schedulePlan(so,m));
  eq('actual groceries '+m, N.actual(sn,m,'groceries'), O.actual(so,m,'groceries'));
  for(const g of sn.goals) eq('goal '+g.id+' '+m, N.goalProgress(sn,g,m), O.goalProgress(so,so.goals.find(x=>x.id===g.id),m));
}
eq('annual 2026', N.annual(sn,'2026'), O.annual(so,'2026'));
eq('annualCategories 2026', N.annualCategories(sn,'2026'), O.annualCategories(so,'2026'));

// ---- cache invalidation under the mutation patterns the app actually uses ----
sn.transactions.push({id:'zz1',date:'2026-09-05',category:'dining',amount:9999,note:'new'});
so.transactions.push({id:'zz1',date:'2026-09-05',category:'dining',amount:9999,note:'new'});
eq('after in-place push', N.totals(sn,'2026-09'), O.totals(so,'2026-09'));
ok('push visible', N.transactions(sn,'2026-09').some(t=>t.id==='zz1'));

sn.transactions=sn.transactions.filter(t=>t.id!=='zz1'); so.transactions=so.transactions.filter(t=>t.id!=='zz1');
eq('after array replace', N.totals(sn,'2026-09'), O.totals(so,'2026-09'));

// same length, different dates, in place -> needs explicit invalidate (app calls it in commit)
const moved={...sn.transactions[0],date:'2026-10-02'};
sn.transactions=sn.transactions.map(t=>t.id===moved.id?moved:t);
so.transactions=so.transactions.map(t=>t.id===moved.id?moved:t);
N.invalidate(sn); O.invalidate&&O.invalidate(so);
eq('after same-length edit', [N.totals(sn,'2026-10'),N.totals(sn,'2026-07')], [O.totals(so,'2026-10'),O.totals(so,'2026-07')]);

// returned arrays must not be mutable-in-place footguns for callers that copy first
const a1=N.transactions(sn,'2026-08'); const before=a1.map(t=>t.id).join();
[...a1].sort((x,y)=>x.id<y.id?1:-1);
ok('copy-then-sort leaves cache order intact', N.transactions(sn,'2026-08').map(t=>t.id).join()===before);

// ---- validate: unchanged strictness on real data ----
eq('validate roundtrip', N.validate(JSON.parse(JSON.stringify(sn))).transactions.length, sn.transactions.length);
const bad=[{},{version:1},null,'x',{version:1,settings:{}}];
for(const b of bad){let threw=false;try{N.validate(JSON.parse(JSON.stringify(b)))}catch{threw=true}ok('rejects junk '+JSON.stringify(b).slice(0,20),threw);}
// amounts / ids / dates still enforced
const mk=()=>JSON.parse(JSON.stringify(sn));
const cases={'bad tx date':s=>s.transactions[0].date='2026-13-40','float amount':s=>s.transactions[0].amount=1.5,
 'unknown cat':s=>s.transactions[0].category='nope','bad plan day':s=>s.months['2026-08'].plan.housing.day=99,
 'proto id':s=>s.categories[0].id='__proto__','bad currency':s=>s.settings.currency='XXX',
 'goal dup cat':s=>s.goals[1].category='emergency','negative plan':s=>s.months['2026-08'].plan.housing.amount=-5,
 'schedule end before start':s=>s.schedules[0].end='2020-01-01','debtMix sum mismatch':s=>s.snapshots['2026-08'].debtMix.credit=1};
for(const [name,mut] of Object.entries(cases)){const s=mk();mut(s);let threw=false;try{N.validate(s)}catch{threw=true}ok('still rejects: '+name,threw);}

// ---- validate: new tolerant migrations ----
let s=mk(); s.settings.theme='mint-2099';
ok('unknown theme coerced', N.validate(s).settings.theme==='lavender');
s=mk(); s.version=2; let msg='';
try{N.validate(s)}catch(e){msg=e.message}
ok('newer version has its own message', /newer version of Monthly Plan/.test(msg), msg);
s=mk(); s.settings.hiddenNav=['annual','bogus','annual','guide'];
eq('hiddenNav filtered+deduped', N.validate(s).settings.hiddenNav, ['annual','guide']);
s=mk(); s.quickMemory={'coffee':'dining','ghost':'deleted-category-id'};
const v=N.validate(s);
ok('stale memory pruned not fatal', !('ghost' in v.quickMemory) && v.quickMemory.coffee==='dining');
s=mk(); s.quickMemory={}; for(let i=0;i<700;i++)s.quickMemory['k'+i]='dining';
const kept=Object.keys(N.validate(s).quickMemory);
ok('memory capped at 500', kept.length===500 && kept[0]==='k200', kept.length+' first='+kept[0]);
// the same tolerant migrations, applied identically by v1.8
for(const [name,mut] of Object.entries({theme:s=>s.settings.theme='mint-2099',nav:s=>s.settings.hiddenNav=['bogus'],
   mem:s=>s.quickMemory={ghost:'deleted-category-id'}})){
  const a=mk(),b=mk();mut(a);mut(b);eq('migration matches v1.8: '+name,N.validate(a),O.validate(b));
}

// ---- parseQuick / csv-adjacent helpers untouched ----
for(const q of ['coffee 4.50','rent 1200','salary 2400','refund groceries 12','uber 8,50','netflix 15.99'])
  eq('parseQuick '+q, (()=>{try{return N.parseQuick(q,sn.categories,sn.quickMemory)}catch(e){return 'ERR:'+e.message}})(),
                     (()=>{try{return O.parseQuick(q,so.categories,so.quickMemory)}catch(e){return 'ERR:'+e.message}})());
eq('THEMES exported', N.THEMES, O.THEMES);
eq('GROUPS = v1.8 + Transfers', N.GROUPS, {...O.GROUPS,transfer:'Transfers (not counted)'});
{const nb=N.blank(),ob=O.blank();
 eq('blank = v1.8 + added categories', {...nb,categories:nb.categories.filter(c=>V18_IDS.has(c.id))}, ob);
 eq('added categories', nb.categories.filter(c=>!V18_IDS.has(c.id)).map(c=>c.id+':'+N.type(c)), ['taxes:expense','retirement:saving','card-payoff:transfer','own-transfer:transfer']);}
for(const c of [...O.blank().categories,{group:'nope'}])eq('type '+c.group, N.type(c), O.type(c));
// a transfer is never income, expense or saving, so a card payoff cannot double-count purchases
{const t=N.blank();t.transactions.push({id:'a',date:'2026-05-02',category:'groceries',amount:5000,note:''},{id:'b',date:'2026-05-20',category:'card-payoff',amount:5000,note:''});
 const tt=N.totals(t,'2026-05');eq('card payoff not counted', [tt.expense.actual,tt.saving.actual,tt.income.actual,tt.net], [5000,0,0,-5000]);
 eq('card payoff can be a payoff goal', N.isDebt(t.categories.find(c=>c.id==='card-payoff')), true);
 ok('v1.9 backup with transfers validates', !!N.validate(JSON.parse(JSON.stringify(t))));
 eq('quick log: autopay', N.parseQuick('card autopay 250',t.categories,{}).category, 'card-payoff');
 eq('quick log: 401k', N.parseQuick('401k 300',t.categories,{}).category, 'retirement');}
// the sample household: same records in the same order (ids are random, so compare without them)
const noIds=s=>JSON.parse(JSON.stringify(s,(k,v)=>k==='id'?undefined:v));
const v18cats=s=>({...s,categories:s.categories.filter(c=>V18_IDS.has(c.id)||c.id==='car-loan')});
for(const m of ['2026-01','2026-09','2026-12'])eq('sample '+m, noIds(v18cats(N.sample(m))), noIds(O.sample(m)));
eq('budget edition has no business screens', [N.P.features.pl,N.P.features.tax], [false,false]);

// ---- business edition, and the shared build ----
require('./test_business.js')({eq,ok});
const stale=require('child_process').spawnSync(process.execPath,[path.join(__dirname,'build_app.js'),'--check'],{encoding:'utf8'});
ok('built files match core + packs', stale.status===0, stale.stdout);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
