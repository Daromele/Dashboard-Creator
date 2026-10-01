/* ================================================================================
   Bakeweek Studio · UI, part 4: kitchen calculators. Quick math that never changes the bakery's data.
   Every input carries data-c="tab.field"; typing updates UI.tools and redraws only the results.
   ================================================================================ */
const r1=n=>Math.round(n*10)/10,r2=n=>Math.round(n*100)/100;
const amt=(n,u)=>{if(!Number.isFinite(n))return '—';if(u==='g'&&n>=1000)return `${r2(n/1000).toLocaleString('en-US')} kg`;if(u==='ml'&&n>=1000)return `${r2(n/1000).toLocaleString('en-US')} L`;return `${(n<10?r1(n):Math.round(n)).toLocaleString('en-US')} ${u}`;};
const CUP={ap:['All-purpose flour',125],bread:['Bread flour',127],ww:['Whole wheat flour',120],rye:['Rye flour',102],sugar:['Granulated sugar',200],brown:['Brown sugar, packed',213],icing:['Powdered sugar',120],butter:['Butter',227],cocoa:['Cocoa powder',85],oats:['Rolled oats',90],chips:['Chocolate chips',170],honey:['Honey',340],milk:['Milk',242],water:['Water',237],oil:['Vegetable oil',218],salt:['Fine sea salt',288]};
const VOL={cup:[1,'cups'],tbsp:[1/16,'tablespoons'],tsp:[1/48,'teaspoons'],floz:[1/8,'fluid ounces'],ml:[1/236.59,'milliliters']},MASS={g:[1,'grams'],kg:[1000,'kilograms'],oz:[28.3495,'ounces'],lb:[453.592,'pounds']};
const SHAPES=[['round','Round'],['square','Square'],['rect','Rectangle'],['loaf','Loaf pan']];
const panArea=p=>p.shape==='round'?Math.PI*(p.a/2)**2:p.shape==='square'?p.a*p.a:p.a*p.b;
UI.tools={tab:'scale',
 scale:{recipeId:'',mode:'pieces',value:24},
 dough:{pieces:10,weight:900,waste:2,levainHyd:100,rows:[{name:'Bread flour',pct:85,kind:'flour'},{name:'Whole wheat flour',pct:15,kind:'flour'},{name:'Water',pct:72,kind:'liquid'},{name:'Levain',pct:20,kind:'levain'},{name:'Salt',pct:2,kind:'other'}]},
 levain:{need:1100,starter:1,flour:5,water:5,buffer:30},
 ddt:{unit:'F',target:78,room:72,flour:70,levain:74,friction:24,withLevain:true},
 pan:{from:{shape:'round',a:8,b:8},to:{shape:'rect',a:9,b:13}},
 conv:{amount:1,unit:'cup',ing:'ap',temp:350,tunit:'F'},
 price:{recipeId:'',cost:1,minutes:3,rate:'',margin:'',card:'',wholesale:30}};
const TOOLS=[['scale','Scale a recipe','scale'],['dough','Dough by baker’s %','oven'],['levain','Levain build','spark'],['ddt','Dough temperature','clock'],['pan','Pan sizes','box'],['conv','Conversions','calc'],['price','Price check','coins']];
const cin=(path,label,value,{step='any',min='0',max='',hint='',full=false,rerender=false}={})=>`<label class="${full?'full':''}">${label}<input type="number" data-c="${path}" value="${esc(value)}" step="${step}" ${min!==''?`min="${min}"`:''} ${max!==''?`max="${max}"`:''} ${rerender?'data-rerender':''} inputmode="decimal">${hint?`<small>${hint}</small>`:''}</label>`;
const csel=(path,label,opts,value,{rerender=false,full=false}={})=>`<label class="${full?'full':''}">${label}<select data-c="${path}" ${rerender?'data-rerender':''}>${opts.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`;
const activeRecipes=()=>state.recipes.filter(r=>!r.archived);
const outRow=(label,value,strong=false)=>`<div class="row${strong?' total':''}"><span>${label}</span><strong class="number">${value}</strong></div>`;
const bigOut=(label,value,note='')=>`<div class="calc-big"><small>${label}</small><b>${value}</b>${note?`<p>${note}</p>`:''}</div>`;

const CALC={
 scale:{form(st){const rs=activeRecipes();if(!rs.length)return empty('No recipes yet','Save a recipe, then scale it to any amount here.',button('Add a recipe','recipe-form','primary'),'tags');if(!rs.some(r=>r.id===st.recipeId))st.recipeId=rs[0].id;const r=recipe(st.recipeId);
   return `<div class="fields">${csel('scale.recipeId','Recipe',rs.map(r=>[r.id,r.name]),st.recipeId,{full:true})}${csel('scale.mode','Scale by',[['pieces','Pieces I need'],['batches','Number of batches'],['factor','Multiply by']],st.mode,{rerender:true})}
    ${cin('scale.value',st.mode==='pieces'?'Pieces':st.mode==='batches'?'Batches':'Multiplier',st.value,{step:st.mode==='factor'?'0.01':'1',hint:st.mode==='pieces'?`One batch makes ${num(r.yield)}.`:st.mode==='factor'?'From Pan sizes, or 0.5 for half.':''})}</div>`;},
  out(st){const r=recipe(st.recipeId);if(!r)return '';const v=+st.value||0,k=st.mode==='pieces'?v/r.yield:st.mode==='batches'?v:v;if(!(k>0))return '<p class="dim">Enter an amount above zero.</p>';
   const rows=r.ingredients.map(x=>{const i=ingredient(x.ingredientId);return {name:i?.name||'Ingredient',unit:i?.unit||'',one:x.qty,scaled:x.qty*k,cost:i&&i.packCost!==null?x.qty*k*i.packCost/i.packSize:null};}),weight=rows.filter(x=>x.unit!=='each').reduce((n,x)=>n+x.scaled,0),cost=rows.some(x=>x.cost===null)?null:rows.reduce((n,x)=>n+x.cost,0);
   return `${bigOut('Scaled by',`× ${r2(k).toLocaleString('en-US')}`,`${num(Math.round(r.yield*k))} pieces · about ${amt(weight,'g')} of mix`)}
   <div class="table-wrap"><table data-nosort><thead><tr><th>Ingredient</th><th class="num">One batch</th><th class="num">Scaled</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.name)}</td><td class="num dim">${amt(x.one,x.unit)}</td><td class="num"><strong>${amt(x.scaled,x.unit)}</strong></td></tr>`).join('')}</tbody></table></div>
   ${outRow('Ingredient cost',cash(cost))}${outRow('Hands-on time (if it scales evenly)',mins(r.activeMinutes*k))}
   <div class="actions" style="margin-top:12px">${button(ico('print')+'Print this scaled recipe','calc-print','small')}</div>${k%1&&st.mode!=='factor'?`<p class="small dim" style="margin-top:8px">The bake plan always makes whole batches: ${plural(Math.ceil(k),'batch','batches')} for this.</p>`:''}`;}},

 dough:{form(st){return `<div class="fields">${cin('dough.pieces','Pieces',st.pieces,{step:'1',min:'1'})}${cin('dough.weight','Dough per piece (g)',st.weight,{step:'1'})}${cin('dough.waste','Allowance for loss (%)',st.waste,{step:'0.5',hint:'Dough left in the bowl and on the bench: 1–3%.'})}${cin('dough.levainHyd','Levain hydration (%)',st.levainHyd,{step:'1',hint:'100% = equal flour and water.'})}</div>
   <div class="form-section"><h3>Formula</h3><p class="small dim" style="margin:-4px 0 10px">Flours add up to 100%. Everything else is a percentage of the total flour.</p>${st.rows.map((x,i)=>`<div class="line-row dough-row"><label>Ingredient<input data-c="dough.rows.${i}.name" value="${esc(x.name)}" maxlength="60"></label><label>%<input type="number" data-c="dough.rows.${i}.pct" value="${esc(x.pct)}" step="0.1" min="0" inputmode="decimal"></label>${csel(`dough.rows.${i}.kind`,'Counts as',[['flour','Flour'],['liquid','Water or liquid'],['levain','Levain'],['other','Other']],x.kind)}<button type="button" class="icon-action danger" data-action="dough-remove" data-i="${i}" aria-label="Remove ${esc(x.name)}">${ico('trash')}</button></div>`).join('')}${button(ico('plus')+'Add ingredient','dough-add','small quiet')}</div>`;},
  out(st){const rows=st.rows.map(x=>({...x,pct:+x.pct||0})),flourPct=rows.filter(x=>x.kind==='flour').reduce((n,x)=>n+x.pct,0),sumPct=rows.reduce((n,x)=>n+x.pct,0),total=(+st.pieces||0)*(+st.weight||0)*(1+(+st.waste||0)/100);
   if(!(sumPct>0)||!(total>0))return '<p class="dim">Enter pieces, weights and a formula.</p>';const flour=total/(sumPct/100),g=x=>flour*x.pct/100,h=(+st.levainHyd||0)/100;
   const lev=rows.filter(x=>x.kind==='levain').reduce((n,x)=>n+g(x),0),liquid=rows.filter(x=>x.kind==='liquid').reduce((n,x)=>n+g(x),0),lf=lev/(1+h),lw=lev-lf,hyd=(liquid+lw)/(flour+lf);
   return `${bigOut('Total flour',amt(flour,'g'),`${amt(total,'g')} of dough for ${plural(+st.pieces,'piece')}`)}
   <div class="table-wrap"><table data-nosort><thead><tr><th>Ingredient</th><th class="num">%</th><th class="num">Weigh</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.name||'Ingredient')}</td><td class="num dim">${r1(x.pct)}%</td><td class="num"><strong>${amt(g(x),'g')}</strong></td></tr>`).join('')}<tr class="total"><td>Total dough</td><td class="num">${r1(sumPct)}%</td><td class="num">${amt(total,'g')}</td></tr></tbody></table></div>
   ${flourPct&&Math.abs(flourPct-100)>0.05?`<div class="notice warning" style="margin:12px 0 0"><span>Your flours add up to ${r1(flourPct)}%, not 100%.</span></div>`:''}
   ${outRow('Hydration, counting the levain',pc(hyd,1))}${lev?`${outRow('Prefermented flour (in the levain)',pc(lf/(flour+lf),1))}<div class="actions" style="margin-top:12px">${button('Build this levain','dough-levain','small','data-g="'+Math.round(lev)+'"')}</div>`:''}`;}},

 levain:{form(st){return `<div class="fields">${cin('levain.need','Levain the dough needs (g)',st.need,{step:'1',full:true,hint:'From your formula, or Dough by baker’s % → Build this levain.'})}${cin('levain.starter','Ratio: starter',st.starter,{step:'0.5'})}${cin('levain.flour','Ratio: flour',st.flour,{step:'0.5'})}${cin('levain.water','Ratio: water',st.water,{step:'0.5'})}${cin('levain.buffer','Extra to keep (g)',st.buffer,{step:'1',hint:'For the jar, and what sticks to it.'})}</div>`;},
  out(st){const total=(+st.need||0)+(+st.buffer||0),parts=(+st.starter||0)+(+st.flour||0)+(+st.water||0);if(!(total>0&&parts>0))return '<p class="dim">Enter how much levain you need and a ratio.</p>';const p=x=>total*(+x||0)/parts;
   return `${bigOut('Build',amt(total,'g'),`At ${+st.starter}:${+st.flour}:${+st.water}, starter : flour : water`)}${outRow('Ripe starter',amt(p(st.starter),'g'))}${outRow('Flour',amt(p(st.flour),'g'))}${outRow('Water',amt(p(st.water),'g'))}${outRow('Levain hydration',pc((+st.water||0)/(+st.flour||1)))}
   <p class="small dim" style="margin-top:12px">More flour and water per part of starter (1:5:5, 1:10:10) slows the build, which suits an overnight levain. Your starter and kitchen temperature set the real timing.</p>`;}},

 ddt:{form(st){const u='°'+st.unit;return `<div class="fields">${csel('ddt.unit','Units',[['F','Fahrenheit (°F)'],['C','Celsius (°C)']],st.unit,{rerender:true})}${cin('ddt.target',`Dough temperature you want (${u})`,st.target,{min:''})}${cin('ddt.room',`Room (${u})`,st.room,{min:''})}${cin('ddt.flour',`Flour (${u})`,st.flour,{min:''})}
   ${csel('ddt.withLevain','Levain or preferment',[['true','Included'],['false','None (yeasted dough)']],String(st.withLevain),{rerender:true})}${st.withLevain?cin('ddt.levain',`Levain (${u})`,st.levain,{min:''}):''}${cin('ddt.friction',`Mixer friction (${u})`,st.friction,{min:'',hint:st.unit==='F'?'Hand mixing 0–6, a stand mixer about 20–30. Adjust it from your own dough.':'Hand mixing 0–3, a stand mixer about 11–17. Adjust it from your own dough.'})}</div>`;},
  out(st){const n=st.withLevain?4:3,w=(+st.target)*n-(+st.room)-(+st.flour)-(st.withLevain?+st.levain:0)-(+st.friction);if(!Number.isFinite(w))return '';const cold=st.unit==='F'?w<35:w<2,hot=st.unit==='F'?w>110:w>43;
   return `${bigOut('Use water at',`${r1(w)}°${st.unit}`,cold?'That’s colder than tap water: use ice water, or chill the flour.':hot?'That’s very warm: warm the room or the flour instead, and check the yeast won’t suffer.':'Measure it with a probe thermometer as you pour.')}
   <p class="small dim">Desired dough temperature × ${n} − (room + flour${st.withLevain?' + levain':''} + friction). Check the mixed dough and adjust the friction number until the dough lands where you want it.</p>`;}},

 pan:{form(st){const side=(k,label)=>{const p=st[k];return `<div class="form-section" style="margin-top:0"><h3>${label}</h3><div class="fields">${csel(`pan.${k}.shape`,'Shape',SHAPES,p.shape,{rerender:true})}${cin(`pan.${k}.a`,p.shape==='round'?'Diameter':p.shape==='square'?'Side':'Width',p.a,{step:'0.25'})}${['rect','loaf'].includes(p.shape)?cin(`pan.${k}.b`,'Length',p.b,{step:'0.25'}):''}</div></div>`;};
   return side('from','The recipe’s pan')+side('to','Your pan')+'<p class="small dim">Use the same unit (inches or centimeters) for both pans.</p>';},
  out(st){const a=panArea(st.from),b=panArea(st.to);if(!(a>0&&b>0))return '<p class="dim">Enter both pans’ sizes.</p>';const k=b/a;
   return `${bigOut('Multiply the recipe by',`× ${r2(k)}`,`${r1(a)} → ${r1(b)} square units of pan`)}${outRow('Batter or dough depth',k>1.05||k<0.95?'Same, when you scale by this':'About the same')}
   <p class="small dim" style="margin-top:8px">A deeper or shallower layer bakes in a different time: check early, and lower the oven a little for deep pans.</p><div class="actions" style="margin-top:12px">${button(ico('scale')+'Scale a recipe by this','pan-scale','small primary',`data-k="${r2(k)}"`)}</div>`;}},

 conv:{form(st){return `<div class="fields">${cin('conv.amount','Amount',st.amount,{step:'any'})}${csel('conv.unit','Unit',[...Object.entries(VOL).map(([k,[,l]])=>[k,l]),...Object.entries(MASS).map(([k,[,l]])=>[k,l])],st.unit)}${csel('conv.ing','Ingredient',Object.entries(CUP).map(([k,[l]])=>[k,l]),st.ing,{full:true})}</div>
   <div class="form-section"><h3>Oven temperature</h3><div class="fields">${cin('conv.temp','Temperature',st.temp,{min:''})}${csel('conv.tunit','From',[['F','°F to °C'],['C','°C to °F']],st.tunit)}</div></div>`;},
  out(st){const [name,gpc]=CUP[st.ing],a=+st.amount||0,g=VOL[st.unit]?a*VOL[st.unit][0]*gpc:a*MASS[st.unit][0],cups=g/gpc,t=+st.temp,T=st.tunit==='F'?`${Math.round((t-32)*5/9)}°C`:`${Math.round(t*9/5+32)}°F`;
   return `${bigOut(`${a.toLocaleString('en-US')} ${(VOL[st.unit]||MASS[st.unit])[1]} of ${name.toLowerCase()}`,amt(g,'g'),`${r2(g/28.3495)} oz · ${r2(cups)} cups · ${r1(cups*16)} tablespoons`)}
   <p class="small dim">Cup weights change with how you scoop: these use 1 cup of ${name.toLowerCase()} = ${gpc} g. Weighing is always more exact.</p>${outRow(`${t}°${st.tunit} is`,T,true)}
   <div class="table-wrap" style="margin-top:12px"><table data-nosort><thead><tr><th>Oven</th>${[325,350,375,400,425,450,475,500].map(f=>`<th class="num">${f}°F</th>`).join('')}</tr></thead><tbody><tr><td>°C</td>${[325,350,375,400,425,450,475,500].map(f=>`<td class="num">${Math.round((f-32)*5/9)}</td>`).join('')}</tr></tbody></table></div>`;}},

 price:{form(st){const rs=activeRecipes(),S=state.settings;if(st.rate==='')st.rate=S.hourlyRate;if(st.margin==='')st.margin=S.targetMargin;if(st.card==='')st.card=S.cardRate;
   return `<div class="fields">${csel('price.recipeId','Start from a recipe',[['','Type my own numbers'],...rs.map(r=>[r.id,r.name])],st.recipeId,{rerender:true,full:true})}${cin('price.cost','Ingredients + packaging per piece',st.cost,{step:'0.01'})}${cin('price.minutes','Hands-on minutes per piece',st.minutes,{step:'0.1',hint:'Batch time ÷ pieces, plus finishing.'})}
   ${cin('price.rate','Value of an hour of your work',st.rate,{step:'0.5'})}${cin('price.margin','Target profit margin (%)',st.margin,{step:'1',max:'90'})}${cin('price.card','Card fee (%)',st.card,{step:'0.1',max:'20'})}${cin('price.wholesale','Wholesale discount (%)',st.wholesale,{step:'1',max:'90',hint:'Cafés and shops often pay 30–50% below retail.'})}</div>`;},
  out(st){const c=+st.cost||0,lab=(+st.minutes||0)/60*(+st.rate||0),den=1-(+st.margin||0)/100-(+st.card||0)/100;if(den<=0)return '<div class="notice warning"><span>Margin plus card fee must be under 100%.</span></div>';
   const retail=(c+lab)/den,r=recipe(st.recipeId),cur=r?.unitPrice,ws=(cur??retail)*(1-(+st.wholesale||0)/100),wsKeep=ws-c-lab;
   return `${bigOut('Lowest retail price',money(retail),`Covers ${money(c)} costs and ${money(lab)} of your time, leaves ${st.margin}% after card fees`)}
   ${cur!==undefined?outRow('Your price now',`${money(cur)} ${cur+0.005>=retail?pill('Healthy','good'):pill(`${money(retail-cur)} short`,'warn')}`):''}
   ${outRow(`Wholesale at ${st.wholesale}% off ${cur!==undefined?'your price':'that'}`,money(ws))}${outRow('A wholesale piece keeps, after costs and your time',`<span class="${wsKeep<0?'neg':''}">${money(wsKeep)}</span>`,true)}
   <p class="small dim" style="margin-top:8px">${wsKeep<0?'At this discount, wholesale pays less than your time is worth. Try a smaller discount, a larger batch, or a product with less hands-on time.':'Wholesale pays less per piece but often fills the oven on quiet days.'}</p>`;}},
};
const calcPrefill=()=>{const st=UI.tools.price,r=recipe(st.recipeId);if(!r)return;const c=recipeCostPerPiece(r);st.cost=c===null?st.cost:r2(c);st.minutes=r2(r.activeMinutes/r.yield+r.finishMinutes);};

VIEWS.tools=function(){const T=UI.tools,cal=CALC[T.tab]||CALC.scale;
 return pagehead('Your library','Calculators','Quick kitchen math. Nothing here changes your recipes, orders or pantry.')+
 `<nav class="segment calc-tabs" aria-label="Calculators">${TOOLS.map(([k,l,i])=>`<button data-action="calc-tab" data-k="${k}" aria-pressed="${T.tab===k}">${ico(i)}<span>${l}</span></button>`).join('')}</nav>
 <div class="grid2 calc"><section class="card">${cardhead(TOOLS.find(x=>x[0]===T.tab)[1],'','calc')}${cal.form(T[T.tab])}</section><section class="card calc-result" aria-live="polite"><div id="calc-out">${cal.out(T[T.tab])}</div></section></div>`;};
function calcOut(){const el=$('#calc-out');if(el)el.innerHTML=CALC[UI.tools.tab].out(UI.tools[UI.tools.tab]);}
function setPath(path,v){const k=path.split('.');let o=UI.tools;for(const p of k.slice(0,-1))o=o[p];const last=k.at(-1),old=o[last];o[last]=typeof old==='number'?(v===''?'':+v):typeof old==='boolean'?v==='true':v;}
function toF(c){return r1(c*9/5+32);}function toC(f){return r1((f-32)*5/9);}
document.addEventListener('input',e=>{const x=e.target;if(!x.dataset?.c||x.tagName==='SELECT')return;setPath(x.dataset.c,x.value);x.hasAttribute('data-rerender')?render():calcOut();});
document.addEventListener('change',e=>{const x=e.target;if(!x.dataset?.c||x.tagName!=='SELECT')return;const st=UI.tools;
 if(x.dataset.c==='ddt.unit'&&x.value!==st.ddt.unit){const d=st.ddt,f=x.value==='C'?toC:toF;for(const k of ['target','room','flour','levain'])d[k]=f(+d[k]);d.friction=r1(x.value==='C'?d.friction*5/9:d.friction*9/5);}
 setPath(x.dataset.c,x.value);if(x.dataset.c==='price.recipeId')calcPrefill();x.hasAttribute('data-rerender')?render():calcOut();});
Object.assign(ACTIONS,{
 'calc-tab':b=>{UI.tools.tab=b.dataset.k;render();},
 'dough-add':()=>{UI.tools.dough.rows.push({name:'',pct:0,kind:'other'});render();$$('[data-c$=".name"]').at(-1)?.focus();},
 'dough-remove':b=>{const r=UI.tools.dough.rows;if(r.length<2)return toast('Keep at least one ingredient.');r.splice(+b.dataset.i,1);render();},
 'dough-levain':b=>{UI.tools.levain.need=+b.dataset.g;UI.tools.tab='levain';render();},
 'pan-scale':b=>{Object.assign(UI.tools.scale,{mode:'factor',value:+b.dataset.k});UI.tools.tab='scale';render();},
 'calc-print':()=>{const st=UI.tools.scale,r=recipe(st.recipeId);if(!r)return;const k=st.mode==='pieces'?(+st.value||0)/r.yield:+st.value||0;
  $('#print-area').innerHTML=`<section class="sheet">${printHead(r.name,`Scaled × ${r2(k)} · ${num(Math.round(r.yield*k))} pieces`)}<table><thead><tr><th>Ingredient</th><th class="r">One batch</th><th class="r">Scaled</th></tr></thead><tbody>${r.ingredients.map(x=>{const i=ingredient(x.ingredientId);return `<tr><td><span class="box"></span>${esc(i?.name||'')}</td><td class="r">${esc(amt(x.qty,i?.unit||''))}</td><td class="r"><b>${esc(amt(x.qty*k,i?.unit||''))}</b></td></tr>`;}).join('')}</tbody></table>${r.method?`<h3>Method</h3><div class="method">${esc(r.method)}</div>`:''}${printFoot()}</section>`;
  document.body.classList.add('printing');requestAnimationFrame(()=>requestAnimationFrame(()=>{try{print();}catch{document.body.classList.remove('printing');}}));},
});
