/* ================================================================================
   Bakeweek Studio · UI, part 7: the month calendar and daily routines.
   ================================================================================ */
UI.cal={month:''};
const calMonth=()=>UI.cal.month||week.slice(0,7);
const CAL_KINDS={market:['Market','var(--cat-2)'],pickup:['Pickups','var(--cat-1)'],pre:['Pre-orders','var(--cat-4)'],drop:['Drops','var(--cat-3)'],cutoff:['Menu closes','var(--cat-5)'],prep:['Prep','var(--ink-3)']};

VIEWS.calendar=function(){const ym=calMonth(),first=ym+'-01',start=C.monday(first),last=C.addDays(C.addDays(first,32).slice(0,8)+'01',-1),end=C.addDays(C.monday(last),6),t=today();
 const days=[];for(let w=start;w<=end;w=C.addDays(w,7))days.push(...C.planWeek(state,w).days);
 const inMonth=d=>d.date.slice(0,7)===ym,os=state.orders.filter(o=>o.status!=='Cancelled'&&o.dueDate.startsWith(ym));
 const chips=d=>{const due=state.orders.filter(o=>o.status!=='Cancelled'&&o.dueDate===d.date),c=[];
  for(const m of due.filter(isMarket))c.push(['market',esc(m.customer)]);
  const pk=due.filter(o=>!isMarket(o)&&!o.standingId&&!o.menuId).length,pr=due.filter(o=>o.menuId).length,dr=due.filter(o=>o.standingId).length;
  if(pk)c.push(['pickup',plural(pk,'pickup')]);if(pr)c.push(['pre',plural(pr,'pre-order')]);if(dr)c.push(['drop',plural(dr,'drop')]);
  for(const m of state.menus.filter(m=>m.cutoffDate===d.date))c.push(['cutoff',`Menu closes ${timeLabel(m.cutoffTime)}`]);
  if(d.preps.length)c.push(['prep',`Prep: ${d.preps.length>1?plural(d.preps.length,'dough'):esc(d.preps[0].recipeName.split(' ').slice(0,2).join(' '))}`]);return c;};
 const md=days.filter(inMonth),over=md.filter(d=>d.overMinutes>0),mk=os.filter(isMarket).length,busy=md.reduce((b,d)=>d.activeMinutes>b.activeMinutes?d:b,md[0]);
 return pagehead('Your month','Calendar','Every pickup, drop, market day, menu cutoff and dough prep, a month at a glance. Pick a day to open its kitchen plan.',button('‹','cal-shift','quiet','data-d="-1" aria-label="Previous month"')+button(ico('calendar')+'<span>This month</span>','cal-today','quiet')+button('›','cal-shift','quiet','data-d="1" aria-label="Next month"')+button(ico('print')+'<span>Print</span>','print',''))+
 `<div class="kpis">${tile('Pickups & drops',num(os.filter(o=>!isMarket(o)).length),{icon:'box',note:`${plural(os.filter(o=>o.standingId).length,'standing drop')} · ${plural(os.filter(o=>o.menuId).length,'pre-order')}`,i:0})}${tile('Market days',num(mk),{icon:'tent',note:mk?'Planned and closed':'None this month',i:1})}${tile('Sales this month',money(os.reduce((n,o)=>n+sales(o),0)),{icon:'up',tone:'pos',note:'Orders quoted, markets as sold',i:2})}${tile('Days over your hours',num(over.length),{icon:'clock',tone:over.length?'neg':'pos',note:busy&&busy.activeMinutes?`Busiest: ${longDay(busy.date)} ${date(busy.date)}, ${mins(busy.activeMinutes)}`:'A quiet month so far',i:3})}</div>
 <section class="card cal-card"><div class="cardhead"><div><h2>${monthName(ym)}</h2><p>Hours bar: hands-on work against the hours you set that day.</p></div><div class="legend">${Object.entries(CAL_KINDS).map(([,[l,c]])=>`<span><i class="dot" style="background:${c}"></i>${l}</span>`).join('')}</div></div>
 <div class="cal-grid" role="grid" aria-label="${monthName(ym)}">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<div class="cal-dow" role="columnheader">${d}</div>`).join('')}
 ${days.map(d=>{const c=chips(d),w=d.capacity?Math.min(100,d.activeMinutes/d.capacity*100):d.activeMinutes?100:0;
  return `<button class="cal-day${inMonth(d)?'':' out'}${d.date===t?' today':''}${d.overMinutes>0?' over':''}" data-action="cal-day" data-date="${d.date}" aria-label="${longDay(d.date)} ${date(d.date)}: ${c.map(x=>x[1].replace(/<[^>]+>/g,'')).join(', ')||'nothing planned'}"><span class="cal-num">${+d.date.slice(8)}</span>${d.activeMinutes?`<span class="cal-bar" title="${mins(d.activeMinutes)} of ${mins(d.capacity)}"><i style="width:${w.toFixed(0)}%"></i></span>`:''}
   <span class="cal-chips">${c.slice(0,4).map(([k,l])=>`<span class="cal-chip" style="--cc:${CAL_KINDS[k][1]}">${l}</span>`).join('')}${c.length>4?`<span class="cal-more">+${c.length-4} more</span>`:''}</span></button>`;}).join('')}</div></section>`;};

/* ---------- routines: shown on each day's kitchen plan, ticked off as you go ---------- */
function routineBlock(d){if(!d.routines.length)return '';const done=d.routines.filter(r=>r.done).length;
 return `<div class="section-label">Routines · ${num(done)} of ${num(d.routines.length)} done</div>${d.routines.map(r=>`<label class="routine${r.done?' done':''}"><input type="checkbox" data-routine="${esc(r.id)}" data-date="${d.date}" ${r.done?'checked':''}><span><b>${esc(r.name)}</b>${r.note?`<small>${esc(r.note)}</small>`:''}</span>${r.minutes?pill(mins(r.minutes),'flag'):''}</label>`).join('')}`;}
function routineForm(id){const r=state.routines.find(x=>x.id===id)||{name:'',days:[0,1,2,3,4,5,6],minutes:10,note:''};
 modal(id?'Edit routine':'Add a routine','Something you do on the same days every week. It shows on those days’ kitchen plans to tick off, and its minutes count toward the day.',
 `<form id="routine-form" data-id="${esc(id||'')}"><div class="fields">${fld('name','Routine',r.name,{attrs:'required maxlength="150" placeholder="e.g. Feed the starter"',full:true})}</div>
  <div class="form-section"><h3>Which days</h3><div class="day-picks" role="group" aria-label="Days">${DAYS.map((d,i)=>`<label class="day-pick"><input type="checkbox" name="days" value="${i}" ${r.days.includes(i)?'checked':''}><span>${d}</span></label>`).join('')}</div></div>
  <div class="fields" style="margin-top:14px">${fld('minutes','Minutes',r.minutes,{type:'number',attrs:'min="0" max="600" step="any" required'})}${fld('note','Note',r.note,{attrs:'maxlength="500" placeholder="e.g. 1:5:5 at 8am and 8pm"'})}</div>
  <div class="formfoot">${id?button('Delete','routine-delete','danger quiet',`data-id="${esc(id)}"`):''}<button type="button" class="btn" data-action="dismiss">Cancel</button><button class="btn primary" type="submit">${id?'Save':'Add routine'}</button></div></form>`);}
const routinesCard=()=>`<section class="card" id="routines"><div class="cardhead"><div><h2>Routines</h2><p>Things you do on the same days every week. They show on those days’ kitchen plans to tick off.</p></div>${button(ico('plus')+'Add routine','routine-form','small primary')}</div>
 ${state.routines.map(r=>`<div class="row"><div><strong>${esc(r.name)}</strong><small>${r.days.length===7?'Every day':joinAnd(r.days.map(d=>DAYS[d]))}${r.minutes?` · ${mins(r.minutes)}`:''}${r.note?` · ${esc(r.note)}`:''}</small></div><button class="icon-action" data-action="routine-form" data-id="${esc(r.id)}" aria-label="Edit ${esc(r.name)}" title="Edit">${ico('edit')}</button></div>`).join('')||'<p class="dim small">No routines yet. Feeding the starter, a weekly deep clean and ordering flour are good first ones.</p>'}</section>`;

Object.assign(ACTIONS,{
 'cal-shift':b=>{const [y,m]=calMonth().split('-').map(Number),d=new Date(Date.UTC(y,m-1+ +b.dataset.d,1));UI.cal.month=d.toISOString().slice(0,7);render();},
 'cal-today':()=>{UI.cal.month=today().slice(0,7);render();},
 'cal-day':b=>{week=C.monday(b.dataset.date);selectedDay=b.dataset.date;go('week');},
 'routine-form':b=>routineForm(b.dataset.id),
 'routine-delete':b=>{closeModal();commit(s=>C.deleteRoutine(s,b.dataset.id),'Routine deleted');},
});
document.addEventListener('change',e=>{const x=e.target;if(x.dataset?.routine)commit(s=>C.toggleRoutine(s,x.dataset.routine,x.dataset.date));});
document.addEventListener('submit',e=>{const f=e.target;if(f.id!=='routine-form')return;const days=new FormData(f).getAll('days');if(!days.length)return formError('Choose at least one day.');
 formSave(f,(s,d)=>C.saveRoutine(s,{...d,id:f.dataset.id||undefined,days}),f.dataset.id?'Routine saved':'Routine added');});
