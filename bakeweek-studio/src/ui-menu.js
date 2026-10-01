/* ================================================================================
   Bakeweek Studio · UI, part 5: the weekly pre-order menu.
   One menu a week: what's baking, how many of each, pickup days and when orders close.
   The menu text is copied into Instagram, Facebook, WhatsApp or an email; replies become orders here.
   ================================================================================ */
let menuRows=[];
const menuOf=wk=>state.menus.find(m=>m.week===C.monday(wk));
const cutoffAt=m=>new Date(`${m.cutoffDate}T${m.cutoffTime}:00`);
const isClosed=m=>Date.now()>cutoffAt(m).getTime();
const timeLabel=t=>{const [h,mm]=t.split(':').map(Number);return `${h%12||12}${mm?':'+pad(mm):''} ${h<12?'am':'pm'}`;};
const cutoffLabel=m=>`${longDay(m.cutoffDate)} ${date(m.cutoffDate)}, ${timeLabel(m.cutoffTime)}`;
const untilLabel=ms=>{const h=Math.round(ms/36e5);return h<1?'under an hour':h<48?plural(h,'hour'):plural(Math.round(h/24),'day');};
const leftLabel=x=>x.left===null?'':x.left===0?'sold out':`${num(x.left)} left`;

function menuText(m){const t=C.menuTally(state,m),L=[`${state.settings.business} · pre-order menu`];if(m.title)L.push(m.title);L.push('');if(m.intro)L.push(m.intro,'');
 for(const x of t)L.push(`• ${recipe(x.recipeId)?.name||'Product'} · ${money(x.unitPrice)}${x.left!==null?` (${leftLabel(x)})`:''}`);
 L.push('',`Pickup: ${joinAnd(m.days.map(d=>`${longDay(d)} ${date(d)}`))}${m.pickup?` · ${m.pickup}`:''}`,`Order by ${cutoffLabel(m)}`);if(m.payment)L.push(m.payment);
 L.push('','Reply with your name, what you’d like and your pickup day.');return L.join('\n');}
async function copyText(t,what='Menu text'){try{await navigator.clipboard.writeText(t);toast(`${what} copied. Paste it into your post or message.`);}
 catch{const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand('copy');}catch{}a.remove();toast(ok?`${what} copied.`:'Copying isn’t allowed here: select the text and copy it.');}}

VIEWS.menu=function(){const m=menuOf(week);
 const head=pagehead(wkEyebrow(),'Pre-order menu','Post this week’s menu, take orders until it closes, and the bake plan fills itself.',m?button(ico('edit')+'<span>Edit menu</span>','menu-form','quiet',`data-id="${esc(m.id)}"`)+button(ico('print')+'<span>Print</span>','print','','data-k="menu"')+button(ico('plus')+'<span>Add a pre-order</span>','menu-order','primary'):'');
 if(!m){const prev=state.menus.filter(x=>x.week<week).sort((a,b)=>b.week.localeCompare(a.week))[0];
  return head+`<section class="card">${empty('No menu for this week yet','Choose what you’re baking, how many of each, the pickup days and when orders close. Then copy the menu text into Instagram, Facebook, WhatsApp or an email.',button('Set up this week’s menu','menu-form','primary')+(prev?' '+button(`Start from ${weekLabel(prev.week)}`,'menu-form','',`data-copy="${esc(prev.id)}"`):''),'note')}</section>`;}
 const t=C.menuTally(state,m),os=state.orders.filter(o=>o.menuId===m.id).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.customer.localeCompare(b.customer)),live=os.filter(o=>o.status!=='Cancelled');
 const total=live.reduce((n,o)=>n+rev(o),0),pieces=live.reduce((n,o)=>n+o.lines.reduce((k,l)=>k+l.qty,0),0),closed=isClosed(m),soldOut=t.filter(x=>x.left===0).length,lim=t.filter(x=>x.limit!==null),cap=lim.reduce((n,x)=>n+x.limit,0),taken=lim.reduce((n,x)=>n+Math.min(x.ordered,x.limit),0),due=live.reduce((n,o)=>n+balance(o),0);
 const byDay=m.days.map(d=>({d,os:os.filter(o=>o.dueDate===d)}));
 return head+`<section class="hero"><div><div class="eyebrow">Pre-orders · ${esc(m.title||weekLabel(week))}</div><div class="hero-num" data-count="${total}">${money(total)}</div>
  <p>${closed?`<b>Orders closed</b> ${cutoffLabel(m)}. ${plural(live.length,'order')} to bake.`:`<b>Orders close in ${untilLabel(cutoffAt(m)-Date.now())}</b>, ${cutoffLabel(m)}. ${plural(live.length,'order')} so far.`}${soldOut?` ${plural(soldOut,'item')} sold out.`:''}</p>
  <div class="actions">${button(ico('log')+'Copy menu text','menu-copy','pop')}${button('Add a pre-order','menu-order','ghost')}</div></div>
  <div class="hero-side"><div class="hero-fact">Pieces ordered<strong>${num(pieces)}</strong></div><div class="hero-fact">Still to collect<strong>${money(due)}</strong></div>
  ${cap?`<div class="hero-meter" title="${pc(taken/cap)} of limited items taken"><i style="width:${(taken/cap*100).toFixed(1)}%"></i></div><div class="hero-fact">Limited items taken<strong>${pc(taken/cap)}</strong></div>`:''}<div class="hero-fact">Pickup<strong>${m.days.map(d=>dayname(d)).join(' & ')}</strong></div></div></section>
 <section class="card table-card">${cardhead('On the menu',`${plural(t.length,'item')} · bake ${m.bakeLead?leadText(m.bakeLead):'on the pickup day'}`,'note')}<div class="table-wrap"><table><thead><tr><th>Item</th><th class="num">Price</th><th class="num">Ordered</th><th class="num">Available</th><th class="num">Left</th></tr></thead><tbody>${t.map(x=>{const k=x.limit?Math.min(1,x.ordered/x.limit):0;
  return `<tr><td><strong>${esc(recipe(x.recipeId)?.name||'Product')}</strong></td><td class="num">${money(x.unitPrice)}</td><td class="num">${num(x.ordered)}</td><td class="num" data-v="${x.limit??1e9}">${x.limit===null?'No limit':num(x.limit)}</td><td class="num" data-v="${x.left??1e9}">${x.limit===null?'—':x.left===0?pill('Sold out','warn'):`<span class="pct"><i style="width:${(k*100).toFixed(0)}%"></i></span>${num(x.left)}`}</td></tr>`;}).join('')}</tbody></table></div></section>
 <div class="grid2"><section class="card">${cardhead('Menu text','Copy it into a post, story, message or email. Edit the menu to change it.','log',button('Copy','menu-copy','small primary'))}<pre class="menu-text" id="menu-text">${esc(menuText(m))}</pre></section>
 <section class="card">${cardhead('Pre-orders',`${plural(live.length,'order')} · ${money(total)}`,'users')}${os.length?byDay.map(({d,os})=>os.length?`<div class="section-label">${longDay(d)} ${date(d)} · ${plural(os.filter(o=>o.status!=='Cancelled').length,'pickup')}</div>${os.map(o=>`<div class="order-line${o.status==='Cancelled'?' dim':''}"><div><strong>${esc(o.customer)}</strong><small>${o.lines.map(l=>`${num(l.qty)} ${esc(recipe(l.recipeId)?.name||'')}`).join(' · ')}</small></div><div class="actions">${o.status==='Cancelled'?pill('Canceled',''):balance(o)>0.005?pill(money(balance(o))+' due','flag'):pill('Paid','good')}${button('Open','order-form','small',`data-id="${esc(o.id)}"`)}</div></div>`).join('')}`:'').join('')
  :empty('No pre-orders yet','Post the menu text, then add each order as replies come in.',button('Add a pre-order','menu-order','primary'),'users')}</section></div>`;};

/* ---------- dialogs ---------- */
const menuItemRows=()=>menuRows.map((x,i)=>`<div class="line-row menu-row" data-index="${i}"><label>Product<select data-mi="recipeId">${state.recipes.filter(r=>!r.archived||r.id===x.recipeId).map(r=>`<option value="${esc(r.id)}" ${r.id===x.recipeId?'selected':''}>${esc(r.name)}</option>`).join('')}</select></label><label>Price / piece<input data-mi="unitPrice" type="number" min="0" step="0.01" value="${Number.isFinite(x.unitPrice)?x.unitPrice:''}" required></label><label>Available<input data-mi="limit" type="number" min="1" step="1" value="${x.limit??''}" placeholder="No limit"></label><button type="button" class="icon-action danger" data-action="menu-remove" data-index="${i}" aria-label="Remove item ${i+1}">${ico('trash')}</button></div>`).join('');
function menuForm(id,copyFrom){const act=state.recipes.filter(r=>!r.archived);if(!act.length){toast('Save a recipe first, so the menu uses your real products.');return recipeForm();}
 const ex=id?state.menus.find(m=>m.id===id):null,src=ex||(copyFrom?state.menus.find(m=>m.id===copyFrom):null),wk=ex?ex.week:week,shift=src&&!ex?Math.round((Date.parse(wk)-Date.parse(src.week))/864e5):0;
 const m=src?{...src,days:src.days.map(d=>C.addDays(d,shift)),cutoffDate:C.addDays(src.cutoffDate,shift),items:src.items.filter(x=>!recipe(x.recipeId)?.archived)}:{title:'',days:[C.addDays(wk,4),C.addDays(wk,5)],cutoffDate:C.addDays(wk,2),cutoffTime:'20:00',bakeLead:0,items:act.slice(0,4).map(r=>({recipeId:r.id,unitPrice:r.unitPrice,limit:null})),intro:'',pickup:'',payment:''};
 menuRows=clone(m.items.length?m.items:[{recipeId:act[0].id,unitPrice:act[0].unitPrice,limit:null}]);
 modal(ex?'Edit this week’s menu':'Set up this week’s menu',`Week of ${weekLabel(wk)}. Orders you add from it go straight into the bake plan.`,
 `<form id="menu-form" data-id="${esc(ex?.id||'')}" data-week="${wk}"><div class="fields">${fld('title','Menu name',m.title,{attrs:'maxlength="150" placeholder="e.g. Autumn loaves, week 41"',hint:'Optional. Shown at the top of the menu text.',full:true})}</div>
  <div class="form-section"><h3>What’s on it</h3><div id="menu-rows">${menuItemRows()}</div>${button(ico('plus')+'Add product','menu-add','small quiet')}<p class="small dim" style="margin-top:8px">Leave Available empty when you’ll bake as many as people order.</p></div>
  <div class="form-section"><h3>Pickup and cutoff</h3><div class="day-picks" role="group" aria-label="Pickup days">${Array.from({length:7},(_,i)=>{const d=C.addDays(wk,i);return `<label class="day-pick"><input type="checkbox" name="days" value="${d}" ${m.days.includes(d)?'checked':''}><span>${dayname(d)} ${+d.slice(8)}</span></label>`;}).join('')}</div>
   <div class="fields" style="margin-top:14px">${fld('cutoffDate','Orders close on',m.cutoffDate,{type:'date',attrs:'required'})}${fld('cutoffTime','At',m.cutoffTime,{type:'time',attrs:'required'})}
   ${sel('bakeLead','Bake',[['0','On the pickup day'],['1','The day before pickup'],['2','2 days before'],['3','3 days before']],String(m.bakeLead))}${fld('pickup','Pickup details',m.pickup,{attrs:'maxlength="300" placeholder="e.g. 3–6pm, porch at 12 Elm St"'})}
   ${fld('payment','Payment note',m.payment,{attrs:'maxlength="300" placeholder="e.g. Pay by card link or cash at pickup"',full:true})}${area('intro','A line to open with',m.intro,'Optional: what’s new, what’s back, a seasonal special.')}</div></div>
  <div class="formfoot">${ex?button('Delete menu','menu-delete','danger quiet',`data-id="${esc(ex.id)}"`):''}<button type="button" class="btn" data-action="dismiss">Cancel</button><button class="btn primary" type="submit">${ex?'Save menu':'Create menu'}</button></div></form>`,true);}
function menuOrderForm(){const m=menuOf(week);if(!m)return menuForm();const t=C.menuTally(state,m);
 modal('Add a pre-order',`${esc(m.title||'This week’s menu')} · orders close ${cutoffLabel(m)}`,
 `<form id="menu-order-form" data-id="${esc(m.id)}">${isClosed(m)?`<div class="notice warning"><span>Orders closed ${cutoffLabel(m)}. You can still add a late one.</span></div>`:''}<div class="fields">${fld('customer','Customer','',{attrs:'required maxlength="150"'})}${sel('dueDate','Pickup day',m.days.map(d=>[d,`${longDay(d)} ${date(d)}`]),m.days[0])}${fld('contact','Contact','',{attrs:'maxlength="250" placeholder="Phone, handle or email"',full:true})}</div>
  <div class="form-section"><h3>What they’d like</h3><div class="menu-picks">${t.map(x=>`<label class="menu-pick${x.left===0?' out':''}"><span><b>${esc(recipe(x.recipeId)?.name||'Product')}</b><small>${money(x.unitPrice)}${x.left!==null?' · '+leftLabel(x):''}</small></span><input type="number" name="q_${esc(x.recipeId)}" min="0" ${x.left!==null?`max="${x.left}"`:''} step="1" value="0" inputmode="numeric" data-price="${x.unitPrice}" ${x.left===0?'disabled':''} aria-label="${esc(recipe(x.recipeId)?.name||'')}: pieces"></label>`).join('')}</div>
  <div class="row total"><span>Order total</span><strong id="mo-total">${money(0)}</strong></div></div>
  <div class="fields">${sel('payment','Payment method',[['Card','Card'],['Cash','Cash'],['Other','Other']],'Card')}${moneyFld('paid','Paid so far',0)}${area('customerNote','Note from the customer','')}</div>${formFoot('Add pre-order')}</form>`);}
const moTotal=()=>{const f=$('#menu-order-form');if(!f)return;let n=0;f.querySelectorAll('[data-price]').forEach(i=>n+=(+i.value||0)*(+i.dataset.price));$('#mo-total').textContent=money(n);};
function outMenu(){const m=menuOf(week);if(!m)throw Error('Set up this week’s menu first.');const t=C.menuTally(state,m);
 return `<section class="sheet menu-sheet">${printHead(m.title||'Pre-order menu',`Pickup ${joinAnd(m.days.map(d=>`${longDay(d)} ${date(d)}`))}${m.pickup?' · '+m.pickup:''}`,`<b>Order by ${esc(cutoffLabel(m))}</b>`)}${m.intro?`<p>${esc(m.intro)}</p>`:''}
 <table><thead><tr><th>Item</th><th class="r">Price</th><th class="r"></th></tr></thead><tbody>${t.map(x=>`<tr><td><b>${esc(recipe(x.recipeId)?.name||'')}</b></td><td class="r">${esc(money(x.unitPrice))}</td><td class="r">${x.left!==null?esc(leftLabel(x)):''}</td></tr>`).join('')}</tbody></table>
 ${m.payment?`<p>${esc(m.payment)}</p>`:''}${printFoot('Thank you for supporting '+(state.settings.business||'our bakery')+'.')}</section>`;}

Object.assign(ACTIONS,{
 'menu-form':b=>menuForm(b.dataset.id,b.dataset.copy),'menu-order':menuOrderForm,'menu-copy':()=>{const m=menuOf(week);if(m)copyText(menuText(m));},
 'menu-add':()=>{const used=new Set(menuRows.map(x=>x.recipeId)),r=state.recipes.find(r=>!r.archived&&!used.has(r.id));if(!r)return formError('Every active product is already on the menu.');menuRows.push({recipeId:r.id,unitPrice:r.unitPrice,limit:null});$('#menu-rows').innerHTML=menuItemRows();},
 'menu-remove':b=>{if(menuRows.length===1)return formError('Keep at least one product on the menu.');menuRows.splice(+b.dataset.index,1);$('#menu-rows').innerHTML=menuItemRows();},
 'menu-delete':b=>ask('Delete this menu?','The menu goes; orders already taken from it stay in your order book and plan. You can undo straight after.','Delete menu',()=>commit(s=>C.deleteMenu(s,b.dataset.id),'Menu deleted')),
});
document.addEventListener('input',e=>{const x=e.target;if(x.dataset?.mi&&x.tagName!=='SELECT'){const i=+x.closest('[data-index]').dataset.index;menuRows[i][x.dataset.mi]=x.value===''?(x.dataset.mi==='limit'?null:NaN):+x.value;}if(x.closest?.('#menu-order-form'))moTotal();});
document.addEventListener('change',e=>{const x=e.target;if(x.dataset?.mi==='recipeId'){const i=+x.closest('[data-index]').dataset.index,r=recipe(x.value);menuRows[i]={...menuRows[i],recipeId:r.id,unitPrice:r.unitPrice};$('#menu-rows').innerHTML=menuItemRows();}});
document.addEventListener('submit',e=>{const f=e.target,id=f.dataset.id;
 if(f.id==='menu-form'){const days=new FormData(f).getAll('days');if(!days.length)return formError('Choose at least one pickup day.');formSave(f,(s,d)=>C.saveMenu(s,{...d,id:id||undefined,week:f.dataset.week,days,items:menuRows}),id?'Menu saved':'Menu created. Copy the text and post it.');}
 if(f.id==='menu-order-form'){const qty={};f.querySelectorAll('[data-price]').forEach(i=>{if(+i.value)qty[i.name.slice(2)]=+i.value;});formSave(f,(s,d)=>C.addMenuOrder(s,id,{...d,qty}),'Pre-order added. It’s in the bake plan.');}});
