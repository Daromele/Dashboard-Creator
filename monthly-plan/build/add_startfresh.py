"""Add a 'Start fresh' reset to Settings.

Clearing a planner one entry at a time is the kind of chore that makes someone
abandon the app, and clearing browser data takes the settings with it. This adds
one honest way out, with the backup button inside the confirm dialog so the
escape hatch is where the risk is.
"""
import io
F='MonthlyBudgetPlanner.html'
s=io.open(F,encoding='utf-8').read(); n=0
def rep(old,new,count=1):
    global s,n
    hits=s.count(old); assert hits==count, f'anchor {hits}x, expected {count}: {old[:80]!r}'
    s=s.replace(old,new); n+=1

# --- Settings entry point --------------------------------------------------
rep("""<div class="row"><div><strong>Import your bank CSV</strong><small>Map columns, review categories, then import.</small></div>${button('Import','import','small')}</div></section>""",
    """<div class="row"><div><strong>Import your bank CSV</strong><small>Map columns, review categories, then import.</small></div>${button('Import','import','small')}</div>"""
    """<h3 class="sub-head">Start fresh</h3><div class="row"><div><strong>Clear this planner</strong>"""
    """<small>Empty it out and begin again, keeping your setup or not.</small></div>"""
    """${button('Start fresh','start-fresh','small danger')}</div></section>""")

# --- the dialog and the reset itself ---------------------------------------
rep(" case 'restore':$('#restore-file').value='';$('#restore-file').click();break;",
 """ case 'restore':$('#restore-file').value='';$('#restore-file').click();break;
 case 'start-fresh':modal('Start fresh','Clear this planner and begin again. Download a backup first if there is any chance you will want this back.',
  `<label class="full">What should go?<select id="fresh-mode">`+
  `<option value="all">Everything — a brand-new planner</option>`+
  `<option value="entries">Only what I recorded — keep my setup</option>`+
  `</select><small id="fresh-note">Categories, plans, transactions, goals, recurring payments and reviews all go. Your currency, date format and palette stay.</small></label>`+
  `<div class="formfoot">${button('Download backup first','backup')}${button('Cancel','dismiss','quiet')}${button('Clear planner','confirm-fresh','primary')}</div>`);break;
 case 'confirm-fresh':{
  const mode=$('#fresh-mode')?.value||'all';
  const next=Budget.blank();
  if(mode==='entries'){
   // the setup someone spent an evening on survives; only what they logged goes
   next.settings=clone(state.settings);
   next.categories=clone(state.categories);
   next.baseline=clone(state.baseline);
   next.goals=clone(state.goals);
   next.schedules=clone(state.schedules);
   Object.entries(state.months).forEach(([m,v])=>{next.months[m]={plan:clone(v.plan),opening:v.opening,note:'',closed:false};});
  }else{
   const k=state.settings;
   next.settings={...next.settings,currency:k.currency,symbol:k.symbol,dateFormat:k.dateFormat,theme:k.theme,hiddenNav:[...(k.hiddenNav||[])]};
  }
  Budget.validate(next);
  closeModal();
  selected=Budget.today().slice(0,7);budgetDirty=false;activityPage=0;
  commit(()=>{state=next;},mode==='all'?'Planner cleared. Undo is here until this message goes.':'Recorded entries cleared. Undo is here until this message goes.');
  break;}""")

# the note under the select should follow the choice, or it quietly lies
rep("""document.addEventListener('change',e=>{const el=e.target;if(el.id==='month-picker')""",
 """document.addEventListener('change',e=>{const el=e.target;
 if(el.id==='fresh-mode'){const n=$('#fresh-note');if(n)n.textContent=el.value==='entries'
  ?'Your categories, monthly plan, goals and recurring payments stay. Transactions, weekly reviews and wealth snapshots go.'
  :'Categories, plans, transactions, goals, recurring payments and reviews all go. Your currency, date format and palette stay.';return;}
 if(el.id==='month-picker')""")

io.open(F,'w',encoding='utf-8').write(s)
print(f'{F}: {n} patches, {len(s)/1024:.0f} KB')
