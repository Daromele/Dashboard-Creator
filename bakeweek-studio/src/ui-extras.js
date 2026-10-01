/* ================================================================================
   Bakeweek Studio · UI, part 6: the organized-baker extras.
   Product labels (ingredients by weight, allergens, baked and best-by dates), customers (contact,
   allergies, history), profit & expenses, ready-to-send messages, and pantry minimums.
   ================================================================================ */
const ALLERGENS={wheat:'Wheat',milk:'Milk',eggs:'Eggs',soy:'Soy',peanuts:'Peanuts',treenuts:'Tree nuts',sesame:'Sesame',fish:'Fish',shellfish:'Shellfish'};
const fullDate=d=>DT(d,{month:'short',day:'numeric',year:'numeric'});
const firstName=n=>String(n||'').replace(/\(.*?\)/g,'').trim().split(/\s+/)[0]||'there';
const allergyLine=r=>{const a=C.labelInfo(state,r).allergens;return a.length?a.map(x=>ALLERGENS[x]).join(', '):'';};

/* ---------- customers: a card per name, matched to orders and standing orders ---------- */
const custKey=n=>String(n||'').trim().toLowerCase();
const custOf=n=>state.customers.find(c=>custKey(c.name)===custKey(n));
const allergyNote=n=>custOf(n)?.allergies||'';
function customerRows(){const m=new Map(),get=(n)=>{const k=custKey(n);if(!m.has(k))m.set(k,{name:n.trim(),orders:[],profile:null});return m.get(k);};
 for(const o of state.orders)if(!isMarket(o))get(o.customer).orders.push(o);for(const c of state.customers)get(c.name).profile=c;
 return [...m.values()].map(x=>{const live=x.orders.filter(o=>o.status!=='Cancelled').sort((a,b)=>a.dueDate.localeCompare(b.dueDate)),prod=new Map();live.forEach(o=>o.lines.forEach(l=>prod.set(l.recipeId,(prod.get(l.recipeId)||0)+l.qty)));
  const fav=[...prod].sort((a,b)=>b[1]-a[1])[0];const t=today(),past=live.filter(o=>o.dueDate<=t);return {...x,name:x.profile?.name||x.name,live:past,upcoming:live.length-past.length,spent:past.reduce((n,o)=>n+sales(o),0),first:live[0]?.dueDate||'',last:past.at(-1)?.dueDate||'',fav:fav?recipe(fav[0])?.name||'':'',standing:state.standing.some(so=>custKey(so.customer)===custKey(x.name)),menu:live.some(o=>o.menuId)};});}
UI.customers={q:'',page:0};

/* ---------- labels ---------- */
const SHEETS={avery5163:{name:'2 × 4 in, 10 a sheet (Avery 5163 · Letter)',page:'letter',w:'4in',h:'2in',cols:2,rows:5,top:'.5in',left:'.156in',gx:'.188in',big:false},
 avery5164:{name:'3⅓ × 4 in, 6 a sheet (Avery 5164 · Letter)',page:'letter',w:'4in',h:'3.333in',cols:2,rows:3,top:'.5in',left:'.156in',gx:'.188in',big:true},
 l7163:{name:'99 × 38 mm, 14 a sheet (L7163 · A4)',page:'A4',w:'99.1mm',h:'38.1mm',cols:2,rows:7,top:'15.1mm',left:'4.65mm',gx:'2.5mm',big:false}};
UI.labels={sheet:'avery5163',baked:'',skip:0,counts:null};
function labelHTML(r,baked){const L=C.labelInfo(state,r),S=state.settings,best=r.keepsDays?C.addDays(baked,r.keepsDays):'';
 return `<div class="lbl"><div class="lbl-biz">${esc(S.business)}</div><div class="lbl-name">${esc(r.name)}</div><div class="lbl-ing"><b>Ingredients:</b> ${esc(L.ingredients.replace(/\.\s*$/,''))}.</div>${L.allergens.length?`<div class="lbl-all"><b>Contains:</b> ${L.allergens.map(a=>ALLERGENS[a]).join(', ')}.</div>`:''}${r.labelNote?`<div class="lbl-note">${esc(r.labelNote)}</div>`:''}
 <div class="lbl-meta">${r.pieceWeight?`<span>Net wt ${num(r.pieceWeight)} g (${(r.pieceWeight/28.3495).toFixed(1)} oz)</span>`:''}<span>Baked ${fullDate(baked)}</span>${best?`<span>Best by ${fullDate(best)}</span>`:''}</div>${S.address?`<div class="lbl-addr">${esc(S.address)}</div>`:''}${S.labelFooter?`<div class="lbl-foot">${esc(S.labelFooter)}</div>`:''}</div>`;}
const weekCounts=()=>{const p=plan(),c={};for(const r of [...p.runs,...p.completedRuns])c[r.recipeId]=(c[r.recipeId]||0)+r.produced;return c;};
function printLabels(){const st=UI.labels,sh=SHEETS[st.sheet],per=sh.cols*sh.rows,baked=st.baked||today(),list=Object.entries(st.counts||{}).filter(([id,n])=>n>0&&recipe(id));
 const cells=[...Array(Math.max(0,Math.min(per-1,+st.skip||0))).fill(''),...list.flatMap(([id,n])=>Array(Math.min(+n,1000)).fill(labelHTML(recipe(id),baked)))];if(!list.length)return toast('Choose how many labels to print first.');
 const pages=[];for(let i=0;i<cells.length;i+=per)pages.push(cells.slice(i,i+per));
 $('#print-area').innerHTML=`<style>@page{size:${sh.page};margin:0}</style>`+pages.map(pg=>`<div class="lbl-page${sh.big?' big':''}" style="--w:${sh.w};--h:${sh.h};--cols:${sh.cols};--top:${sh.top};--left:${sh.left};--gx:${sh.gx}">${pg.map(c=>c||'<div class="lbl empty"></div>').join('')}</div>`).join('');
 document.body.classList.add('printing');requestAnimationFrame(()=>requestAnimationFrame(()=>{try{print();}catch{document.body.classList.remove('printing');toast('Printing couldn’t open. Try again in Chrome or Edge on a computer.');}}));}

/* ---------- profit: sales less ingredients, packaging, fees, stall fees and logged expenses ---------- */
function moneyYear(y){const ms=Array.from({length:12},(_,i)=>`${y}-${pad(i+1)}`),rows=ms.map(m=>({m,sales:0,goods:0,fees:0,exps:0,minutes:0,unknown:0}));
 for(const o of state.orders){if(o.status==='Cancelled'||!o.dueDate.startsWith(y))continue;const r=rows[+o.dueDate.slice(5,7)-1];
  if(isMarket(o)){if(!o.market.closed)continue;const x=C.marketResult(state,o);r.sales+=x.takings;if(x.ingredientCost===null)r.unknown++;r.goods+=(x.ingredientCost||0)+x.packagingCost;r.fees+=x.stallFee;r.minutes+=C.quoteOrder(state,o).activeMinutes;continue;}
  const q=C.quoteOrder(state,o);r.sales+=q.revenue;if(q.ingredientCost===null)r.unknown++;r.goods+=(q.ingredientCost||0)+q.packagingCost;r.fees+=q.fees;r.minutes+=q.activeMinutes;}
 const ex=state.expenses.filter(e=>e.date.startsWith(y));for(const e of ex)rows[+e.date.slice(5,7)-1].exps+=e.amount;
 for(const r of rows)r.profit=r.sales-r.goods-r.fees-r.exps;const T=rows.reduce((a,r)=>{for(const k of ['sales','goods','fees','exps','minutes','unknown','profit'])a[k]+=r[k];return a;},{sales:0,goods:0,fees:0,exps:0,minutes:0,unknown:0,profit:0});return {rows,T,ex};}
UI.money={page:0};

/* ---------- screens ---------- */
Object.assign(VIEWS,{
 customers(){const st=UI.customers,q=st.q.toLowerCase(),all=customerRows(),t=today(),ym=t.slice(0,7);
  const head=pagehead('The people you bake for','Customers','Contact details, allergies and notes, with every order they’ve placed. Allergies show on their orders and packing tickets.',button(ico('plus')+'<span>Add customer</span>','customer-form','primary'));
  if(!all.length)return head+`<section class="card">${empty('Your customers will gather here','Everyone you take an order for appears automatically. Add allergies and notes once, and they follow every order.',button('Add a customer','customer-form','primary'),'users')}</section>`;
  const rows=all.filter(c=>!q||`${c.name} ${c.profile?.contact||''} ${c.profile?.notes||''} ${c.profile?.allergies||''}`.toLowerCase().includes(q)).sort((a,b)=>b.last.localeCompare(a.last)||a.name.localeCompare(b.name));
  const per=15,pages=Math.max(1,Math.ceil(rows.length/per));st.page=Math.max(0,Math.min(st.page,pages-1));const view=rows.slice(st.page*per,st.page*per+per);
  const buyers=all.filter(c=>c.live.length||c.upcoming),repeat=buyers.filter(c=>c.live.length>1||c.standing),top=[...buyers].sort((a,b)=>b.spent-a.spent)[0],fresh=buyers.filter(c=>c.first.startsWith(ym)),allergic=all.filter(c=>c.profile?.allergies);
  return head+`<div class="kpis">${tile('Customers',num(buyers.length),{icon:'users',note:`${plural(allergic.length,'allergy','allergies')} on file`,i:0})}${tile('Come back',pc(buyers.length?repeat.length/buyers.length:NaN),{icon:'repeat',tone:'pos',note:`${plural(repeat.length,'customer')} with 2+ orders or a standing order`,i:1})}${tile('Top customer',top?esc(top.name):'—',{icon:'up',tone:'pos',note:top?`${money(top.spent)} across ${plural(top.live.length,'order')}`:'',i:2})}${tile('New this month',num(fresh.length),{icon:'plus',note:'First order in '+monthName(ym,{month:'long'}),i:3})}</div>
  <section class="card table-card">${cardhead('Everyone',plural(rows.length,'customer'),'users',`<div class="filters"><input id="search" type="search" placeholder="Search names, contacts, notes or allergies" value="${esc(st.q)}" aria-label="Search customers"></div>`)}
   ${rows.length?`<div class="table-wrap"><table><thead><tr><th>Customer</th><th class="num">Orders</th><th class="num">Spent</th><th>Last order</th><th>Usually</th><th>Notes</th><th></th></tr></thead><tbody>${view.map(c=>`<tr><td><strong>${esc(c.name)}</strong><small class="dim" style="display:block">${esc(c.profile?.contact||'')}${c.standing?`${c.profile?.contact?' · ':''}standing order`:''}</small></td><td class="num">${num(c.live.length)}${c.upcoming?`<small class="dim" style="display:block">+${num(c.upcoming)} coming</small>`:''}</td><td class="num">${money(c.spent)}</td><td data-v="${c.last}">${c.last?date(c.last)+(c.last.slice(0,4)!==t.slice(0,4)?', '+c.last.slice(0,4):''):'—'}</td><td><span class="clamp">${esc(c.fav)}</span></td><td>${c.profile?.allergies?pill('Allergy: '+esc(c.profile.allergies),'warn'):''}${c.profile?.notes?`<small class="dim" style="display:block">${esc(c.profile.notes.slice(0,60))}${c.profile.notes.length>60?'…':''}</small>`:''}</td><td class="num">${button('Open','customer-form','small',`data-name="${esc(c.name)}"`)}</td></tr>`).join('')}</tbody></table></div>${pager(st,rows.length,per)}`:empty('No customers match','Try another search.','','users')}</section>`;},

 labels(){const st=UI.labels,rs=state.recipes.filter(r=>!r.archived);if(!st.baked)st.baked=today();if(!st.counts)st.counts=weekCounts();
  const head=pagehead('Your library','Labels','Ingredients by weight, allergens, baked and best-by dates, on standard label sheets. Check the wording against your local cottage-food rules.',button(ico('print')+'<span>Print labels</span>','labels-print','primary'));
  if(!rs.length)return head+`<section class="card">${empty('No recipes yet','Save a recipe, mark allergens on its pantry ingredients, and its label is ready.',button('Add a recipe','recipe-form','primary'),'tags')}</section>`;
  const sh=SHEETS[st.sheet],n=Object.values(st.counts).reduce((a,b)=>a+(+b||0),0),sheets=Math.ceil((n+(+st.skip||0))/(sh.cols*sh.rows)),show=rs.filter(r=>+st.counts[r.id]>0).slice(0,3);
  const missing=[];if(!state.settings.address)missing.push('your address');if(!state.settings.labelFooter)missing.push('the home-kitchen statement');
  return head+(missing.length?`<div class="notice warning" style="margin-bottom:16px"><span>Add ${joinAnd(missing)} in Settings → Labels. Many cottage-food rules require them.</span>${button('Open settings','go','small','data-go="settings" data-anchor="labels"')}</div>`:'')+
  `<div class="grid2 wide-left"><section class="card">${cardhead('What to print',`${plural(n,'label')} · ${plural(sheets,'sheet')}`,'print',button('Use this week’s batches','labels-week','small'))}
   <div class="fields">${`<label class="full">Label sheet<select id="lbl-sheet">${Object.entries(SHEETS).map(([k,v])=>`<option value="${k}" ${k===st.sheet?'selected':''}>${v.name}</option>`).join('')}</select></label>`}
   <label>Baked on<input id="lbl-baked" type="date" value="${st.baked}"></label><label>Skip the first<input id="lbl-skip" type="number" min="0" max="${sh.cols*sh.rows-1}" step="1" value="${+st.skip||0}"><small>To finish a part-used sheet.</small></label></div>
   <div class="table-wrap" style="margin-top:14px"><table data-nosort><thead><tr><th>Product</th><th>Contains</th><th>Keeps</th><th class="num">Labels</th></tr></thead><tbody>${rs.map(r=>`<tr><td><strong>${esc(r.name)}</strong></td><td>${allergyLine(r)?esc(allergyLine(r)):'<span class="dim">None marked</span>'}</td><td>${r.keepsDays?plural(r.keepsDays,'day'):'<span class="dim">Not set</span>'}</td><td class="num"><input class="num-in" type="number" min="0" max="1000" step="1" data-lbl="${esc(r.id)}" value="${+st.counts[r.id]||0}" aria-label="${esc(r.name)}: labels"></td></tr>`).join('')}</tbody></table></div></section>
   <section class="card">${cardhead('Preview','At actual size on the sheet you chose','tags')}<div class="lbl-previews">${(show.length?show:rs.slice(0,1)).map(r=>`<div class="lbl-preview${sh.big?' big':''}" style="--w:${sh.w};--h:${sh.h}">${labelHTML(r,st.baked)}</div>`).join('')}</div>
   <p class="small dim" style="margin-top:12px">Ingredients are listed heaviest first from the recipe (an egg counts as 50 g), using each pantry item’s name for labels. Type your own list in a recipe to override it. Allergens come from the pantry.</p></section></div>`;},

 money(){const y=week.slice(0,4),{rows,T,ex}=moneyYear(y),st=UI.money,ms=rows.map(r=>monthName(r.m,{month:'short'}));
  const head=pagehead(y,'Profit & expenses','What’s left of your sales after ingredients, packaging, fees and the expenses you log. Your own time isn’t taken off: that’s yours.',button('‹ '+(y-1),'year-shift','quiet','data-d="-1"')+button((+y+1)+' ›','year-shift','quiet','data-d="1"')+button(ico('down')+'<span>CSV</span>','money-csv','quiet')+button(ico('plus')+'<span>Add expense</span>','expense-form','primary'));
  if(!T.sales&&!ex.length)return head+`<section class="card">${empty(`Nothing in ${y} yet`,'Collected orders and closed market days count here, along with any expenses you add: packaging, equipment, permits, insurance, mileage.',button('Add an expense','expense-form','primary'),'coins')}</section>`;
  const hrsT=T.minutes/60,byCat=new Map();ex.forEach(e=>byCat.set(e.category,(byCat.get(e.category)||0)+e.amount));const best=[...rows].sort((a,b)=>b.profit-a.profit)[0],topCat=[...byCat].sort((a,b)=>b[1]-a[1])[0];
  const per=12,list=[...ex].sort((a,b)=>b.date.localeCompare(a.date)),pages=Math.max(1,Math.ceil(list.length/per));st.page=Math.max(0,Math.min(st.page,pages-1));const view=list.slice(st.page*per,st.page*per+per);
  return head+`<section class="hero"><div><div class="eyebrow">Profit · ${y}</div><div class="hero-num" data-count="${T.profit}">${money(T.profit)}</div>
   <p>From <b>${money(T.sales)}</b> of sales. That’s about <b>${hrsT?money(T.profit/hrsT):'—'} for every hour</b> of hands-on work (${hrs(T.minutes)} this year).${T.unknown?` ${plural(T.unknown,'order')} had missing ingredient prices.`:''}</p>
   <div class="actions">${button('Add an expense','expense-form','pop')}${button('Year at a glance','go','ghost','data-go="year"')}</div></div>
   <div class="hero-side"><div class="hero-fact">Sales<strong>${money(T.sales)}</strong></div><div class="hero-fact">Ingredients &amp; packaging<strong>${money(T.goods)}</strong></div><div class="hero-meter" title="${pc(T.sales?T.profit/T.sales:NaN)} kept"><i style="width:${T.sales?Math.max(0,Math.min(100,T.profit/T.sales*100)).toFixed(1):0}%"></i></div><div class="hero-fact">Card &amp; stall fees<strong>${money(T.fees)}</strong></div><div class="hero-fact">Expenses<strong>${money(T.exps)}</strong></div></div></section>
  <div class="kpis">${tile('Profit margin',pc(T.sales?T.profit/T.sales:NaN),{icon:'insights',tone:'net',note:'Of every sale, before your time',i:0})}${tile('Per hands-on hour',hrsT?money(T.profit/hrsT):'—',{icon:'clock',tone:'net',note:`Compare with ${money(state.settings.hourlyRate)} you value an hour at`,i:1})}${tile('Best month',best.profit>0?monthName(best.m,{month:'long'}):'—',{icon:'up',tone:'pos',note:best.profit>0?money(best.profit)+' profit':'',i:2})}${tile('Biggest expense',topCat?esc(topCat[0]):'—',{icon:'wallet',tone:'neg',note:topCat?money(topCat[1])+` · ${plural(ex.length,'expense')} logged`:'None logged yet',i:3})}</div>
  <section class="card">${cardhead('Profit by month','What was left each month, with sales for comparison','insights')}${bars([{name:'Profit',color:'var(--ok)',values:rows.map(r=>Math.max(0,r.profit))}],ms,{title:'Profit by month',overlay:{name:'Sales',color:'var(--accent)',values:rows.map(r=>r.sales)},W:1100,H:270})}</section>
  <div class="grid2"><section class="card table-card">${cardhead('Month by month','','table')}<div class="table-wrap"><table><thead><tr><th>Month</th><th class="num">Sales</th><th class="num">Ingredients &amp; packaging</th><th class="num">Fees</th><th class="num">Expenses</th><th class="num">Profit</th></tr></thead><tbody>${rows.map(r=>`<tr><td data-v="${r.m}">${monthName(r.m,{month:'long'})}</td><td class="num">${r.sales?money(r.sales):'—'}</td><td class="num">${r.goods?money(r.goods):'—'}</td><td class="num">${r.fees?money(r.fees):'—'}</td><td class="num">${r.exps?money(r.exps):'—'}</td><td class="num"><strong${r.profit<0?' class="neg-t"':''}>${r.sales||r.exps?money(r.profit):'—'}</strong></td></tr>`).join('')}<tr class="total"><td>${y}</td><td class="num">${money(T.sales)}</td><td class="num">${money(T.goods)}</td><td class="num">${money(T.fees)}</td><td class="num">${money(T.exps)}</td><td class="num">${money(T.profit)}</td></tr></tbody></table></div></section>
   <section class="card">${cardhead('Expenses by kind',`${money(T.exps)} in ${y}`,'wallet')}${pie(fold([...byCat]),{label:'Expenses',center:compact(T.exps),sub:'EXPENSES'})||empty('No expenses logged','Packaging, equipment, permits, insurance, mileage: add them as they happen.',button('Add an expense','expense-form','primary'),'wallet')}</section></div>
  <section class="card table-card">${cardhead('Expenses',plural(ex.length,'expense')+` in ${y}`,'log')}${ex.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Kind</th><th>What</th><th class="num">Amount</th><th></th></tr></thead><tbody>${view.map(e=>`<tr><td data-v="${e.date}">${date(e.date)}</td><td>${esc(e.category)}</td><td>${esc(e.description||'—')}</td><td class="num">${money(e.amount)}</td><td class="num"><button class="icon-action" data-action="expense-form" data-id="${esc(e.id)}" aria-label="Edit expense" title="Edit">${ico('edit')}</button></td></tr>`).join('')}</tbody></table></div>${pager(st,ex.length,per)}`:empty('No expenses yet','Market stall fees are already counted from your market days.','','wallet')}</section>`;},
});

/* ---------- dialogs ---------- */
function customerForm(name){const rows=customerRows(),c=name?rows.find(x=>custKey(x.name)===custKey(name)):null,p=c?.profile||{name:c?.name||'',contact:'',allergies:'',notes:''};
 if(!p.contact&&c){const o=[...c.orders].reverse().find(o=>o.contact);if(o)p.contact=o.contact;}
 modal(c?esc(c.name):'Add a customer',c?`${plural(c.live.length,'order')} · ${money(c.spent)}${c.first?` · since ${fullDate(c.first)}`:''}`:'Allergies and notes you add here show on their orders and packing tickets.',
 `<form id="customer-form" data-old="${esc(c?.name||'')}" data-id="${esc(p.id||'')}"><div class="fields">${fld('name','Name',p.name,{attrs:'required maxlength="150"'})}${fld('contact','Phone, email or handle',p.contact,{attrs:'maxlength="250"'})}
  ${fld('allergies','Allergies or must-avoid',p.allergies,{attrs:'maxlength="300" placeholder="e.g. tree nuts, sesame"',full:true,hint:'Shown in red on their orders and printed on packing tickets.'})}${area('notes','Notes',p.notes,'Preferences, birthdays, how they like to pay, where to leave things…')}</div>
  ${c&&c.orders.length?`<div class="form-section"><h3>Orders</h3>${[...c.orders].sort((a,b)=>b.dueDate.localeCompare(a.dueDate)).slice(0,8).map(o=>`<div class="row"><div><strong>${fullDate(o.dueDate)}</strong><small>${o.lines.map(l=>`${num(l.qty)} ${esc(recipe(l.recipeId)?.name||'')}`).join(' · ')}</small></div><span class="actions">${statusPill(o.status)}<strong class="number">${money(sales(o))}</strong></span></div>`).join('')}${c.orders.length>8?`<p class="small dim">and ${plural(c.orders.length-8,'earlier order')}</p>`:''}</div>`:''}
  ${formFoot(c?.profile?'Save':'Save customer')}</form>`);}
function expenseForm(id){const e=state.expenses.find(x=>x.id===id)||{date:today(),category:'Packaging',description:'',amount:''};
 modal(id?'Edit expense':'Add an expense','Anything the business paid for that isn’t already an ingredient in a recipe or a market stall fee.',`<form id="expense-form" data-id="${esc(id||'')}"><div class="fields">${fld('date','Date',e.date,{type:'date',attrs:'required'})}${sel('category','Kind',C.expenseCategories.map(c=>[c,c]),e.category)}
  ${fld('description','What it was',e.description,{attrs:'maxlength="200" placeholder="e.g. 200 kraft bread bags"',full:true})}${moneyFld('amount','Amount',e.amount,'',true)}</div><div class="formfoot">${id?button('Delete','expense-delete','danger quiet',`data-id="${esc(id)}"`):''}<button type="button" class="btn" data-action="dismiss">Cancel</button><button class="btn primary" type="submit">${id?'Save':'Add expense'}</button></div></form>`);
 $('#expense-form [name=amount]')?.setAttribute('required','');$('#expense-form [name=amount]')?.setAttribute('min','0.01');}

/* ---------- ready-to-send messages for an order ---------- */
function orderMessage(o,kind){const S=state.settings,items=o.lines.map(l=>`• ${num(l.qty)} ${recipe(l.recipeId)?.name||'Product'}`).join('\n'),when=`${longDay(o.dueDate)} ${date(o.dueDate)}`,bal=balance(o),hi=`Hi ${firstName(o.customer)}!`;
 if(kind==='confirm')return `${hi} Your order with ${S.business} is confirmed:\n${items}\n\nPickup: ${when}\nTotal: ${money(rev(o))}${o.paid>0?`\nPaid: ${money(o.paid)}${bal>0.005?` · balance ${money(bal)}`:''}`:''}\n\nThank you!`;
 if(kind==='ready')return `${hi} Your order is ready for pickup ${o.dueDate===today()?'today':when}.${bal>0.005?` Balance due: ${money(bal)}.`:''} See you soon!\n— ${S.business}`;
 return `${hi} A friendly reminder that ${money(bal)} is still due for your order (${o.reference}, pickup ${when}). Thank you so much!\n— ${S.business}`;}

/* ---------- actions and events ---------- */
Object.assign(ACTIONS,{
 'customer-form':b=>customerForm(b.dataset.name),'expense-form':b=>expenseForm(b.dataset.id),
 'expense-delete':b=>{closeModal();commit(s=>C.deleteExpense(s,b.dataset.id),'Expense deleted');},
 'labels-print':printLabels,'labels-week':()=>{UI.labels.counts=weekCounts();render();toast('Counts set to this week’s batches.');},
 'labels-for':b=>{UI.labels.counts={[b.dataset.id]:+b.dataset.n||0};if(b.dataset.date)UI.labels.baked=b.dataset.date;closeModal();go('labels');},
 'msg-copy':b=>{const o=order(b.dataset.id);if(o)copyText(orderMessage(o,b.dataset.k),'Message');},
 'money-csv':()=>{const y=week.slice(0,4),{rows,ex}=moneyYear(y),r2c=n=>Math.round(n*100)/100;const L=[['Month','Sales','Ingredients & packaging','Card & stall fees','Expenses','Profit'],...rows.map(r=>[r.m,r2c(r.sales),r2c(r.goods),r2c(r.fees),r2c(r.exps),r2c(r.profit)]),[],['Expense date','Kind','What','Amount'],...[...ex].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>[e.date,e.category,e.description,r2c(e.amount)])];
  download(`Bakeweek_Profit_${y}.csv`,'﻿'+L.map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n','text/csv;charset=utf-8');toast('Profit and expenses exported for '+y+'.');},
});
document.addEventListener('input',e=>{const x=e.target;if(x.dataset?.lbl!==undefined){UI.labels.counts[x.dataset.lbl]=Math.max(0,Math.round(+x.value||0));clearTimeout(UI.lt);UI.lt=setTimeout(render,350);}
 if(x.id==='lbl-skip'){UI.labels.skip=Math.max(0,Math.round(+x.value||0));clearTimeout(UI.lt);UI.lt=setTimeout(render,350);}});
document.addEventListener('change',e=>{const x=e.target;if(x.id==='lbl-sheet'){UI.labels.sheet=x.value;render();}if(x.id==='lbl-baked'&&/^\d{4}-\d{2}-\d{2}$/.test(x.value)){UI.labels.baked=x.value;render();}});
document.addEventListener('submit',e=>{const f=e.target,id=f.dataset.id;
 if(f.id==='expense-form')formSave(f,(s,d)=>C.saveExpense(s,{...d,id:id||undefined}),id?'Expense saved':'Expense added');
 if(f.id==='customer-form'){const old=f.dataset.old;formSave(f,(s,d)=>{const c=C.saveCustomer(s,{...d,id:id||undefined});
  // a new name follows them onto every order and standing order
  if(old&&custKey(old)!==custKey(d.name)||old&&old!==d.name.trim()){for(const o of s.orders)if(custKey(o.customer)===custKey(old))o.customer=c.name;for(const so of s.standing)if(custKey(so.customer)===custKey(old))so.customer=c.name;}return c;},'Customer saved');}});
