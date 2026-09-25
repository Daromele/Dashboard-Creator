// Dashboard KPI links, transaction filters and sorting, chart-slice dialogs in both editions.
//   node interactions.js <screenshot dir>
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const OUT=process.argv[2];
const ok=(n,c,x='')=>{console.log((c?'ok   ':'FAIL ')+n+(c?'':' '+x));if(!c)process.exitCode=1;};
(async()=>{const b=await chromium.launch();
for(const [f,key,tag] of [['MonthlyBudgetPlanner.html','jps-monthly-plan','mp'],['ProfitPlanBusiness.html','jps-profit-plan','pp'],['CreatorPlan.html','jps-creator-plan','cp']]){
const p=await b.newPage({viewport:{width:1360,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));const F='file:///home/user/Dashboard-Creator/monthly-plan/app/'+f;
await p.goto(F);await p.evaluate(k=>{localStorage.setItem(k+'-welcome-v1','1');localStorage.setItem(k+'-manual-backup',String(Date.now()));},key);await p.goto(F);await p.waitForTimeout(300);
await p.evaluate(()=>document.querySelector('[data-action="demo"]').click());await p.waitForTimeout(300);
// KPI → filtered list whose total matches
const exp=await p.evaluate(()=>Budget.totals(state,selected).expense.actual);
await p.click('[data-action="kpi-open"][data-type="expense"]');await p.waitForTimeout(200);
const r=await p.evaluate(()=>({screen,filterType,sum:activityList.reduce((n,t)=>n+t.amount,0),types:[...new Set(activityList.map(t=>Budget.type(category(t.category))))]}));
ok(tag+' expenses KPI opens matching list',r.screen==='activity'&&r.filterType==='expense'&&r.sum===exp&&r.types.join()==='expense',JSON.stringify(r)+' '+exp);
await p.evaluate(()=>go('dashboard'));await p.click('[data-action="kpi-open"][data-type="income"]');
const inc=await p.evaluate(()=>({sum:activityList.reduce((n,t)=>n+t.amount,0),want:Budget.totals(state,selected).income.actual}));ok(tag+' income KPI total matches',inc.sum===inc.want,JSON.stringify(inc));
// group filter + dependent category
const g=await p.evaluate(()=>P.groups.find(g=>g.type==='expense'&&state.categories.filter(c=>c.group===g.id).length>1).id);
await p.selectOption('#group-filter','group:'+g);
const dep=await p.evaluate(g=>({opts:[...document.querySelectorAll('#category-filter option')].slice(1).map(o=>category(o.value).group),rows:activityList.every(t=>category(t.category).group===g)}),g);
ok(tag+' category dropdown depends on group',dep.opts.length>0&&dep.opts.every(x=>x===g)&&dep.rows,JSON.stringify(dep));
const c1=await p.evaluate(()=>document.querySelectorAll('#category-filter option')[1].value);await p.selectOption('#category-filter',c1);
ok(tag+' category narrows',await p.evaluate(c=>activityList.every(t=>t.category===c),c1));
await p.selectOption('#group-filter','type:income');ok(tag+' switching group resets foreign category',await p.evaluate(()=>filterCategory==='all'&&filterType==='income'));
await p.click('[data-action="clear-filters"]');
// sorting
await p.click('[data-action="sort-tx"][data-key="amount"]');
const amts=await p.evaluate(()=>activityList.map(t=>t.amount));ok(tag+' sort amount desc',amts.every((v,i)=>!i||amts[i-1]>=v));
await p.click('[data-action="sort-tx"][data-key="amount"]');
const amts2=await p.evaluate(()=>activityList.map(t=>t.amount));ok(tag+' sort amount asc',amts2.every((v,i)=>!i||amts2[i-1]<=v));
await p.click('[data-action="sort-tx"][data-key="category"]');
const cats=await p.evaluate(()=>activityList.map(t=>category(t.category).name.toLowerCase()));ok(tag+' sort category a-z',cats.every((v,i)=>!i||cats[i-1].localeCompare(v)<=0));
ok(tag+' aria-sort set',await p.evaluate(()=>document.querySelector('th[aria-sort="ascending"]')?.textContent.includes('Category')));
await p.screenshot({path:`${OUT}/${tag}-activity.png`});
// activity donut slice
await p.evaluate(()=>document.querySelector('.activity-charts [data-slice]')?.dispatchEvent(new MouseEvent('click',{bubbles:true})));
ok(tag+' activity slice dialog',await p.evaluate(()=>document.querySelector('#modal').open&&document.querySelectorAll('.slice-row').length>0));
await p.evaluate(()=>closeModal());
// dashboard / annual slice
if(tag==='mp'){await p.evaluate(()=>go('dashboard'));await p.waitForTimeout(200);
 const d=await p.evaluate(()=>{const el=document.querySelector('#content circle[data-slice]');const spec=JSON.parse(el.dataset.slice);el.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  const want=Budget.rows(state,selected).find(c=>c.id===spec.cats[0]).actual;return {open:document.querySelector('#modal').open,sub:document.querySelector('#modal').innerText,want:fmt(want)};});
 ok('mp dashboard slice lists that category, totals match',d.open&&d.sub.includes(d.want),JSON.stringify(d).slice(0,300));
 await p.screenshot({path:`${OUT}/mp-slice.png`});
 await p.click('[data-action="slice-open"]');ok('mp slice opens in Transactions',await p.evaluate(()=>screen==='activity'&&filterCategory!=='all'));
}else{await p.evaluate(()=>go('annual'));await p.waitForTimeout(200);
 const d=await p.evaluate(()=>{const els=[...document.querySelectorAll('circle[data-slice]')];const el=els[els.length-1];el.dispatchEvent(new MouseEvent('click',{bubbles:true}));return {open:document.querySelector('#modal').open,n:document.querySelectorAll('.slice-row').length,title:document.querySelector('#modal').innerText.slice(0,120)};});
 ok('pp annual expense slice dialog',d.open&&d.n>0,JSON.stringify(d));await p.screenshot({path:`${OUT}/pp-slice.png`});}
// average cash flow card: matches the months with entries, opens the annual screen
await p.evaluate(()=>{closeModal();go('dashboard');});
const avg=await p.evaluate(()=>{const y=selected.slice(0,4),ms=Budget.annual(state,y).filter(m=>m.month<=selected&&Budget.transactions(state,m.month).length);return {want:Math.round(ms.reduce((a,m)=>a+m.net,0)/ms.length),got:+document.querySelector('[data-type="annual"] b').dataset.count};});
ok(tag+' average cash flow card',avg.want===avg.got,JSON.stringify(avg));
await p.click('[data-action="kpi-open"][data-type="annual"]');ok(tag+' average card opens annual',await p.evaluate(()=>screen==='annual'));
// transactions footer total matches the filtered expenses
await p.evaluate(()=>go('dashboard'));await p.click('[data-action="kpi-open"][data-type="expense"]');
const foot=await p.evaluate(()=>({txt:document.querySelector('.tx-total .num b').textContent,want:fmt(Budget.totals(state,selected).expense.actual)}));
ok(tag+' footer total equals the card',foot.txt===foot.want,JSON.stringify(foot));
// charts use round axis steps
await p.evaluate(()=>go('dashboard'));
ok(tag+' round axis labels',await p.evaluate(()=>[...document.querySelectorAll('.chart-axis-label')].every(e=>/^-?[^0-9-]*[0-9,]*[05]00$|^-?[^0-9-]*0$|^-?[^0-9-]*[0-9,]*,000$|[0-9]k$/.test(e.textContent.replace(/\s/g,'')))),await p.evaluate(()=>[...document.querySelectorAll('.chart-axis-label')].map(e=>e.textContent).join(' ')));
if(tag!=='mp'){
 await p.evaluate(()=>go('insights'));
 const h=await p.evaluate(()=>({txt:document.querySelector('#content').innerText,H:Budget.health(state,selected)}));
 ok(tag+' business health renders',/Cash runway/.test(h.txt)&&/Break-even (revenue|income)/i.test(h.txt)&&/What stands out/.test(h.txt)&&h.H.n===3,h.txt.slice(0,200));
 await p.evaluate(()=>go('invoices'));await p.click('[data-action="biz-remind"] >> nth=0');
 ok(tag+' reminder dialog',await p.evaluate(()=>/friendly reminder that invoice/.test(document.querySelector('#biz-remind-text')?.value||'')));
 await p.evaluate(()=>closeModal());
}
ok(tag+' no page errors',!errs.length,errs.join('|'));await p.close();}
await b.close();})();
