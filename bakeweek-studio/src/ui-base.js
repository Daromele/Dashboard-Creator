'use strict';
/* ================================================================================
   Bakeweek Studio · UI, part 1: the house shell (sellable-html-app skill starter).
   BakeCore (bakecore.js) holds every rule and calculation; this file never changes data
   except through BakeCore inside commit(). Money here is in currency units, as BakeCore uses.
   ================================================================================ */
const C=globalThis.BakeCore;
const CONFIG={
 name:'Bakeweek Studio', version:'2.1', publisher:'JPS Digital Pages', tagline:'Microbakery planner',
 support:'https://www.etsy.com/shop/JPSDigitalPages',
 storageKey:'jps-bakeweek',       // KEY below is the same key the first (Codex) version saved under
 file:'bakeweek-studio', idb:true, defaultTheme:'fjord',
 themes:['fjord','kiln','linen','sage','ledger','slate','night','midnight'],
 railNote:'<b>A little planning.</b>Room for more baking.',
 // [id, label, icon, hub tabs?]: This week is one sidebar item with four tabs
 nav:[['week','This week','today',[['week','Week plan'],['shopping','Shopping'],['batches','Batch sheets'],['packing','Pack & collect']]],
  ['orders','Orders','log'],['menu','Pre-order menu','note'],['standing','Standing orders','repeat'],['markets','Market days','tent'],['year','Year at a glance','outlook'],
  ['recipes','Recipes','tags'],['pantry','Pantry','cart'],['tools','Calculators','calc'],
  ['settings','Settings & backup','palette'],['guide','How to use','help']],
 navGroups:[['Your week',['week']],['Selling',['orders','menu','standing','markets','year']],['Your library',['recipes','pantry','tools']]], navGroupRest:'Help & settings',
 optionalNav:['menu','standing','markets','year','tools','guide'], hiddenNav:[],
 welcome:[
  {icon:'today',step:'WELCOME',title:'Your bakery week, in order',text:'Orders, standing orders and market days become one day-by-day bake plan, one combined shopping list, scaled batch sheets and packing tickets.'},
  {icon:'note',step:'EVERY WEEK',title:'Post the menu, bake what’s ordered',text:'Copy a pre-order menu into your posts and messages. Subscriptions and café orders repeat on their own, and market days suggest how much to bring next time.'},
  {icon:'spark',step:'TRY IT FIRST',title:'Should you say yes?',text:'Try a custom order before you accept it: see the extra hands-on hours, the extra shopping and a minimum quote for your target margin.'},
  {icon:'shield',step:'PRIVATE',title:'Your recipes stay yours',text:'Everything is saved in this browser on this computer. Nothing is uploaded, and there is no account or subscription.'},
  'backup',
  {icon:'check',step:'START',title:'Start with the sample bakery',text:'Explore Sunday Crumb, a made-up microbakery with a bread club, a café account and a Saturday market. Then add your pantry, your first recipe and your first order.'}],
};

/* ---------- icons: 24px stroke set (core names, plus a few for the kitchen) ---------- */
const S=d=>`<svg viewBox="0 0 24 24" class="i" aria-hidden="true">${d}</svg>`;
const ICON={today:S('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>'),outlook:S('<path d="M3 16.5 9 10l4 4 8-8.5"/><path d="M15 5.5h6v6"/>'),
 log:S('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),help:S('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.8c0 1.7-2.4 2.2-2.4 3.6"/><path d="M12 17.2h.01"/>'),
 palette:S('<circle cx="12" cy="12" r="8.6"/><path d="M12 3.4a8.6 8.6 0 0 0 0 17.2Z" fill="currentColor" stroke="none"/>'),shield:S('<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6Z"/>'),
 down:S('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),up:S('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'),check:S('<path d="m5 12.5 4.5 4.5L19 7"/>'),coins:S('<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>'),
 wallet:S('<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16 14.5h2"/>'),insights:S('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),history:S('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>'),
 tags:S('<path d="M3 12V4h8l10 10-8 8Z"/><path d="M7.5 7.5h.01"/>'),plus:S('<path d="M12 5v14M5 12h14"/>'),left:S('<path d="m15 18-6-6 6-6"/>'),right:S('<path d="m9 18 6-6-6-6"/>'),menu:S('<path d="M4 7h16M4 12h16M4 17h16"/>'),
 edit:S('<path d="M4 20h4L19 9l-4-4L4 16Z"/>'),trash:S('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),print:S('<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><rect x="7" y="14" width="10" height="7"/>'),
 cross:S('<path d="M6 6l12 12M18 6 6 18"/>'),calendar:S('<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 3v3M16 3v3"/>'),table:S('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>'),
 compass:S('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>'),spark:S('<path d="M12 3v4M12 17v4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M3 12h4M17 12h4M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>'),
 clock:S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),cart:S('<path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>'),
 box:S('<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5Z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>'),oven:S('<rect x="3" y="4" width="18" height="16" rx="2.5"/><rect x="6.5" y="10" width="11" height="7" rx="1.5"/><path d="M7 7h.01M10 7h.01"/>'),
 users:S('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5 6-5s5.4 1.6 6 5"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 15.3c1.6.7 2.6 2.2 3 4.7"/>'),
 upload:S('<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>'),
 repeat:S('<path d="M17 2.5 20.5 6 17 9.5"/><path d="M3.5 11V9.5A3.5 3.5 0 0 1 7 6h13.5"/><path d="M7 21.5 3.5 18 7 14.5"/><path d="M20.5 13v1.5A3.5 3.5 0 0 1 17 18H3.5"/>'),
 tent:S('<path d="M3 9.5 5.5 4h13L21 9.5"/><path d="M3 9.5c0 1.4 1 2.5 2.25 2.5S7.5 10.9 7.5 9.5c0 1.4 1 2.5 2.25 2.5S12 10.9 12 9.5c0 1.4 1 2.5 2.25 2.5s2.25-1.1 2.25-2.5c0 1.4 1 2.5 2.25 2.5S21 10.9 21 9.5"/><path d="M5 12v8.5h14V12M10 20.5v-5h4v5"/>'),
 note:S('<rect x="4.5" y="3" width="15" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
 calc:S('<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M8.5 6.5h7v3.5h-7Z"/><path d="M8.5 14h.01M12 14h.01M15.5 14h.01M8.5 17.5h.01M12 17.5h.01M15.5 17.5h.01"/>'),
 scale:S('<path d="M12 3v18M7 21h10"/><path d="M4 7h16"/><path d="m4 7-2.5 6a3 3 0 0 0 5 0Z"/><path d="m20 7-2.5 6a3 3 0 0 0 5 0Z"/>')};
const ico=n=>ICON[n]||ICON.today;

/* ---------- helpers ---------- */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const pad=n=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const DT=(d,o)=>new Date(d+'T12:00:00').toLocaleDateString('en-US',o);
const date=d=>DT(d,{month:'short',day:'numeric'}),dayname=d=>DT(d,{weekday:'short'}),longDay=d=>DT(d,{weekday:'long'});
const monthName=(ym,o={month:'long',year:'numeric'})=>DT(ym+'-15',o);
function weekLabel(start){const end=C.addDays(start,6),y=end.slice(0,4);return start.slice(5,7)===end.slice(5,7)?`${date(start)} – ${+end.slice(8)}, ${y}`:`${date(start)} – ${date(end)}, ${y}`;}
const cur=()=>state.settings.currency||'USD';
// a missing ingredient price makes a cost unknown (null): say so instead of showing $0
const money=n=>{if(n===null||n===undefined||!Number.isFinite(n))return 'Cost needed';const s=new Intl.NumberFormat('en-US',{style:'currency',currency:cur()}).format(Math.abs(n));return (n<=-0.005?'−':'')+s;};
const cash=money;
const sym=()=>new Intl.NumberFormat('en-US',{style:'currency',currency:cur()}).formatToParts(0).find(p=>p.type==='currency')?.value||'$';
const compact=n=>{if(!Number.isFinite(n))return '—';const v=Math.abs(n);return (n<0?'−':'')+sym()+(v>=1000?(v/1000).toFixed(v>=10000?0:1).replace(/\.0$/,'')+'k':Math.round(v));};
const mins=n=>{n=Math.round(n||0);return n<60?`${n} min`:`${Math.floor(n/60)}h${n%60?' '+n%60+'m':''}`;};
const hrs=n=>{const h=(n||0)/60;return (h>=10||Number.isInteger(h)?Math.round(h):h.toFixed(1))+'h';};
const qty=(n,u)=>`${Number(n||0).toLocaleString('en-US',{maximumFractionDigits:3})} ${u}`;
const pc=(v,d=0)=>Number.isFinite(v)?(v*100).toFixed(d)+'%':'—';
const num=n=>Number(n||0).toLocaleString('en-US');
const initial=s=>String(s||'?').split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
const button=(label,action,cls='',extra='')=>`<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${label}</button>`;
const plural=(n,w,s=w+'s')=>`${num(n)} ${n===1?w:s}`;

/* ---------- state and storage keys (every key starts with the product's storage key) ---------- */
const KEY=CONFIG.storageKey+'-v1',RAIL_KEY=CONFIG.storageKey+'-rail-collapsed',WELCOME_KEY=CONFIG.storageKey+'-welcome-v1',
 NUDGE_KEY=CONFIG.storageKey+'-backup-nudge',MANUAL_BACKUP_KEY=CONFIG.storageKey+'-manual-backup';
const ls={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}}};
// prefs travel with backups but live outside BakeCore's data: theme and the views switched off
// recipe pictures, the category list (in the baker's order) and the recipes view live here too
const readPrefs=u=>({theme:CONFIG.themes.includes(u?.theme)?u.theme:CONFIG.defaultTheme,hiddenNav:Array.isArray(u?.hiddenNav)?u.hiddenNav.filter(id=>CONFIG.optionalNav.includes(id)):[...CONFIG.hiddenNav],
 categories:Array.isArray(u?.categories)?[...new Set(u.categories.filter(c=>typeof c==='string').map(c=>c.trim().slice(0,80)).filter(Boolean))]:[],
 categoryColors:Object.fromEntries(Object.entries(u?.categoryColors&&typeof u.categoryColors==='object'?u.categoryColors:{}).filter(([k,v])=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)).map(([k,v])=>[k.slice(0,80),v.toLowerCase()])),
 images:Object.fromEntries(Object.entries(u?.images&&typeof u.images==='object'?u.images:{}).filter(([k,v])=>typeof v==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(v)&&v.length<400000)),
 recipeView:u?.recipeView==='table'?'table':'grid'});
let state=C.createBlank(),prefs=readPrefs(null),real=null,sampleState=null,demo=false,undoState=null,storageProblem='',storageReloadable=false,recoveryRaw='',
 screen='week',week=C.monday(today()),selectedDay='',railMin=ls.get(RAIL_KEY)==='1',hubLast={},returnFocus=null,askFn=null;
const find=(type,id)=>state[type].find(x=>x.id===id);
const recipe=id=>find('recipes',id),ingredient=id=>find('ingredients',id),order=id=>find('orders',id);

/* ---------- storage: IndexedDB with a localStorage fallback ---------- */
let IDB=CONFIG.idb&&!!globalThis.indexedDB,writing=null,again=false;
const openDB=(name,store)=>new Promise((res,rej)=>{const q=indexedDB.open(name,1);q.onupgradeneeded=()=>q.result.createObjectStore(store);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});
async function kv(dbName,store,key,mode='get',value){const db=await openDB(dbName,store);return new Promise((res,rej)=>{const tx=db.transaction(store,mode==='get'?'readonly':'readwrite'),st=tx.objectStore(store),
 q=mode==='get'?st.get(key):mode==='del'?st.delete(key):st.put(value,key);if(mode==='get')q.onsuccess=()=>res(q.result);else tx.oncomplete=()=>res();tx.onerror=tx.onabort=()=>rej(tx.error||q.error);});}
const dataStore=(mode,v)=>kv(CONFIG.storageKey+'-data','kv',KEY,mode,v);
const record=()=>({...(demo?real:state),ui:prefs});
async function load(){let raw=null;
 // the first open moves the Codex version's localStorage copy (same key) into IndexedDB
 if(IDB){try{raw=await dataStore('get');if(!raw)raw=ls.get(KEY);}catch{IDB=false;}}
 if(!IDB){try{raw=localStorage.getItem(KEY);}catch{storageProblem='Browser storage is unavailable. Changes stay in this session only. Download a backup before closing.';}}
 if(raw){try{const j=JSON.parse(raw);state=C.validateBackup(j);prefs=readPrefs(j.ui);if(IDB)save();}catch{recoveryRaw=raw;storageProblem='Your saved data could not be opened. It has not been overwritten. Save the recovery data, then restore a backup.';}}}
const bc='BroadcastChannel' in globalThis?new BroadcastChannel(KEY):null;
if(bc)bc.onmessage=()=>{if(storageProblem)return;storageProblem='This workspace changed in another tab. This tab stopped saving so it can’t overwrite that work. Download a backup, then reload to see the latest version.';storageReloadable=true;renderStatus();};
function save(){if(storageProblem)return renderStatus();
 const text=JSON.stringify(record());
 if(IDB){if(writing){again=true;return;}   // one write in flight, one queued: an older save never lands after a newer one
  writing=dataStore('put',text).then(()=>{try{localStorage.removeItem(KEY);}catch{}bc?.postMessage('saved');}).catch(()=>{storageProblem='Browser storage is unavailable or full. Changes are only in this session. Download a backup before closing.';}).finally(()=>{writing=null;renderStatus();if(again){again=false;save();}});}
 else{try{localStorage.setItem(KEY,text);bc?.postMessage('saved');}catch{storageProblem='Browser storage is unavailable or full. Changes are only in this session. Download a backup before closing.';}renderStatus();}
 queueFolderBackup();}
// every change goes through BakeCore on a copy, is validated whole, then saved with Undo
function apply(fn){const s=clone(state),p=clone(prefs),result=fn(s,p),clean=C.validateBackup(s);undoState={state,prefs};state=clean;prefs=readPrefs(p);save();return result;}
function commit(fn,message){try{const r=apply(fn);render();if(message)toast(storageProblem&&!demo?message+' This tab isn’t saving: download a backup.':message,true);return {ok:true,r};}catch(e){toast(e.message);return {ok:false};}}
function formSave(form,fn,message){if(!form.reportValidity())return;try{apply((s,p)=>fn(s,Object.fromEntries(new FormData(form)),p));closeModal();render();toast(message,true);}catch(e){formError(e.message);}}
function toast(message,undo=false){clearTimeout(toast.t);const el=$('#toast');el.innerHTML=`<span>${esc(message)}</span>${undo?'<button data-action="undo">Undo</button>':''}`;el.hidden=false;toast.t=setTimeout(()=>el.hidden=true,6500);}

/* ---------- backups: download, restore, and a daily file in a folder the user picks (Chrome/Edge) ---------- */
function download(name,text,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=String(name).replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_');document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);}
const backupJSON=(s=state)=>JSON.stringify({...s,ui:prefs,app:CONFIG.storageKey,appVersion:CONFIG.version,saved:new Date().toISOString()},null,2);
function backup(){download(`${CONFIG.file}-${demo?'sample-':''}${today()}.json`,backupJSON());if(!demo){ls.set(MANUAL_BACKUP_KEY,String(Date.now()));renderStatus();}toast('Backup downloaded. Keep it somewhere safe.');}
async function readBackup(file){if(file.size>15*1024*1024)throw Error('That backup is too large (15 MB at most).');let j;try{j=JSON.parse(await file.text());}catch{throw Error('That file is not a Bakeweek Studio backup.');}return {data:C.validateBackup(j),ui:j.ui};}
function restoreFrom(b){if(demo)toggleSample(true);storageProblem='';storageReloadable=false;recoveryRaw='';
 commit((s,p)=>{for(const k of Object.keys(s))delete s[k];Object.assign(s,clone(b.data));if(b.ui)Object.assign(p,readPrefs(b.ui));},'Backup restored');week=C.monday(today());go('week');}
const folderSupported=()=>!!globalThis.showDirectoryPicker;
let folder=null,folderStatus='Not connected',folderTimer=null,folderChain=Promise.resolve(),bannerHidden=false;
const handleStore=(mode,v)=>kv(CONFIG.storageKey+'-backup','handles','folder',mode,v);
function setFolderStatus(t){folderStatus=t;const el=$('#folder-status');if(el)el.textContent=t;renderStatus();}
async function chooseFolder(){if(!folderSupported())return toast('Folder backup needs Chrome or Edge on a computer. Use Download backup here.');
 try{folder=await showDirectoryPicker({mode:'readwrite',id:CONFIG.storageKey+'-backups'});await handleStore('put',folder);await writeFolder();toast('A backup is now saved to that folder after every change.');render();}catch(e){if(e.name!=='AbortError')toast('That folder could not be used.');}}
async function reconnectFolder(){if(!folder)return chooseFolder();try{if(await folder.requestPermission({mode:'readwrite'})==='granted'){await writeFolder();render();}}catch{setFolderStatus('Reconnect needed');}}
function queueFolderBackup(){if(!folder||demo)return;clearTimeout(folderTimer);folderTimer=setTimeout(()=>writeFolder().catch(()=>setFolderStatus('Backup needs attention')),1200);}
function writeFolder(){const f=folder;folderChain=folderChain.catch(()=>{}).then(async()=>{if(!f||f!==folder||demo)return;
 if(await f.queryPermission({mode:'readwrite'})!=='granted')return setFolderStatus('Reconnect needed');
 const h=await f.getFileHandle(`${CONFIG.file}-backup-${today()}.json`,{create:true}),w=await h.createWritable();await w.write(backupJSON(demo?real:state));await w.close();setFolderStatus('Connected');});return folderChain;}
async function initFolder(){if(!folderSupported()){folderStatus='Not available here';return;}try{folder=await handleStore('get')||null;if(folder){const p=await folder.queryPermission({mode:'readwrite'});setFolderStatus(p==='granted'?'Connected':'Reconnect needed');}}catch{folderStatus='Not available here';}}
const hasData=()=>!!(state.orders.length||state.recipes.length||state.ingredients.length||state.standing?.length);
const protectedNow=()=>(folder&&folderStatus==='Connected')||Date.now()-(+ls.get(MANUAL_BACKUP_KEY)||0)<7*864e5;

/* ---------- sample mode: Sunday Crumb, separate from the buyer's bakery and never saved ---------- */
function toggleSample(quiet=false){if(!demo){real=state;state=sampleState||sampleBakery();demo=true;if(!quiet)toast('Sample mode: Sunday Crumb is made up, and nothing here is saved');}
 else{sampleState=state;state=real;real=null;demo=false;if(!quiet)toast('Back to your own bakery');}
 undoState=null;week=C.monday(today());selectedDay='';screen='week';render();}

/* ================================================================================
   Chart kit · SVG strings, no library. Donut above its legend, flat bars, value labels.
   ================================================================================ */
const CAT=['var(--cat-1)','var(--cat-2)','var(--cat-3)','var(--cat-4)','var(--cat-5)','var(--cat-6)'];
const tipOf=(t,rows)=>esc(JSON.stringify({t,r:rows}));
const fold=rows=>{const r=rows.filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]),top=r.slice(0,5).map((x,i)=>[x[0],x[1],x[2]||CAT[i]]);const rest=r.slice(5).reduce((n,x)=>n+x[1],0);if(rest)top.push([`Other (${r.length-5} more)`,rest,CAT[5]]);return top;};
function pie(parts,{label='',donut=true,center='',sub='',f=money}={}){
 parts=parts.filter(p=>p[1]>0);const total=parts.reduce((n,p)=>n+p[1],0);if(!total)return '';
 const R=80,r0=donut?52:0,c=90,pt=(a,r)=>[(c+r*Math.cos(a)).toFixed(2),(c+r*Math.sin(a)).toFixed(2)];let a=-Math.PI/2;
 const segs=parts.map(([name,n,color],i)=>{const sw=n/total*Math.PI*2,a1=a,a2=a+sw;a=a2;let d;
  if(sw>=Math.PI*2-1e-6)d=`M${c} ${c-R}A${R} ${R} 0 1 1 ${c-0.01} ${c-R}Z`+(donut?`M${c} ${c-r0}A${r0} ${r0} 0 1 0 ${c+0.01} ${c-r0}Z`:'');
  else{const lg=sw>Math.PI?1:0,[x1,y1]=pt(a1,R),[x2,y2]=pt(a2,R);if(donut){const [x3,y3]=pt(a2,r0),[x4,y4]=pt(a1,r0);d=`M${x1} ${y1}A${R} ${R} 0 ${lg} 1 ${x2} ${y2}L${x3} ${y3}A${r0} ${r0} 0 ${lg} 0 ${x4} ${y4}Z`;}else d=`M${c} ${c}L${x1} ${y1}A${R} ${R} 0 ${lg} 1 ${x2} ${y2}Z`;}
  return `<path class="kit-seg" d="${d}" fill="${color}" fill-rule="evenodd" style="--i:${i}" tabindex="0" aria-label="${esc(name)}: ${pc(n/total)}" data-tip="${tipOf(name,[{name:label,value:f(n),color},{name:'Share',value:pc(n/total)}])}"/>`;}).join('');
 let cuts='';if(parts.length>1){let b=-Math.PI/2;for(const p of parts){const [x1,y1]=pt(b,r0),[x2,y2]=pt(b,R+1);cuts+=`<line class="kit-cut" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;b+=p[1]/total*Math.PI*2;}}
 const key=parts.map(([name,n,color])=>`<div class="kit-key-row"><i class="dot" style="background:${color}"></i><span>${esc(name)}</span><b class="number">${pc(n/total,n/total<0.1?1:0)}</b><em class="number">${f(n)}</em></div>`).join('');
 return `<div class="kit-pie"><svg viewBox="0 0 180 180" role="img" aria-label="${esc(label)}">${segs}${cuts}${donut&&center?`<text x="90" y="92" class="kit-mid">${esc(center)}</text><text x="90" y="110" class="kit-mid-sub">${esc(sub)}</text>`:''}</svg><div class="kit-key">${key}</div></div>`;}
function spark(vals,color='var(--accent)'){const pts=vals.map((n,i)=>Number.isFinite(n)?[i,n]:null).filter(Boolean);if(pts.length<2)return '';const ys=pts.map(p=>p[1]),mn=Math.min(...ys),sp=(Math.max(...ys)-mn)||1,W=120,H=30,X=i=>2+i*(W-6)/Math.max(1,vals.length-1),Y=n=>H-4-(n-mn)/sp*(H-8),l=pts.at(-1);
 return `<svg class="kit-spark" viewBox="0 0 ${W} ${H}" aria-hidden="true" style="--spark:${color}"><polyline points="${pts.map(([i,n])=>X(i).toFixed(1)+','+Y(n).toFixed(1)).join(' ')}"/><circle cx="${X(l[0]).toFixed(1)}" cy="${Y(l[1]).toFixed(1)}" r="3"/></svg>`;}
// columns, stacked when several series; square corners, no gaps, the total printed on top, an optional line on the same scale.
// W: drawing width (700 for a half-width card, ~1100 for a full-width one). f formats tooltips, cf the axis and labels.
function bars(series,labels,{title='',overlay=null,H=260,W=700,f=money,cf=compact}={}){
 const tot=labels.map((_,i)=>series.reduce((n,s)=>n+Math.max(0,s.values[i]||0),0)),max=Math.max(1,...tot,...(overlay?overlay.values.filter(Number.isFinite):[]));if(!tot.some(Boolean)&&!overlay?.values.some(Boolean))return '';
 const pl=52,pr=12,pt=22,pb=28,band=(W-pl-pr)/labels.length,bw=Math.min(38,band*.62),Y=v=>pt+(1-v/max)*(H-pt-pb),ticks=[0,1,2,3,4].map(i=>max*i/4);
 const cols=labels.map((l,i)=>{let base=H-pb;const x=pl+band*i+(band-bw)/2;
  const segs=series.map(s=>{const v=Math.max(0,s.values[i]||0);if(!v)return '';const h=(H-pt-pb)*v/max,y=base-h;base=y;return `<rect class="kit-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" style="fill:${s.color};--i:${i}"/>`;}).join('');
  const tip=tipOf(l,[...series.filter(s=>s.values[i]).map(s=>({name:s.name,value:f(s.values[i]),color:s.color})),...(series.length>1&&tot[i]?[{name:'Total',value:f(tot[i])}]:[]),...(overlay&&Number.isFinite(overlay.values[i])?[{name:overlay.name,value:f(overlay.values[i]),color:overlay.color}]:[])]);
  return `<g class="kit-col" tabindex="0" data-tip="${tip}"><rect x="${(pl+band*i).toFixed(1)}" y="${pt}" width="${band.toFixed(1)}" height="${H-pt-pb}" fill="transparent"/>${segs}${tot[i]?`<text x="${(x+bw/2).toFixed(1)}" y="${(Y(tot[i])-6).toFixed(1)}" class="kit-axis" text-anchor="middle">${esc(cf(tot[i]))}</text>`:''}</g><text x="${(x+bw/2).toFixed(1)}" y="${H-8}" class="kit-axis" text-anchor="middle">${esc(l)}</text>`;}).join('');
 const ov=overlay?(()=>{const p=overlay.values.map((v,i)=>Number.isFinite(v)?[pl+band*i+band/2,Y(Math.max(0,v))]:null).filter(Boolean);return `<polyline class="kit-path" pathLength="100" points="${p.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' ')}" style="stroke:${overlay.color}${overlay.dash?';stroke-dasharray:4 4;animation:none':''}"/>`+p.map(q=>`<circle class="kit-dot" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="3.5" style="fill:${overlay.color}"/>`).join('');})():'';
 const keys=[...series,...(overlay?[overlay]:[])];
 return `<div class="kit-chart">${keys.length>1?`<div class="legend">${keys.map(s=>`<span><i class="dot" style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`:''}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${ticks.map(v=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="chart-grid"/><text x="${pl-8}" y="${(Y(v)+4).toFixed(1)}" class="kit-axis" text-anchor="end">${esc(cf(v))}</text>`).join('')}${cols}${ov}</svg></div>`;}

/* ---------- building blocks ---------- */
const pagehead=(eyebrow,title,sub,actions='')=>`<div class="pagehead"><div class="pagehead-text"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${sub?`<p class="subtitle">${sub}</p>`:''}</div>${actions?`<div class="actions">${actions}</div>`:''}</div>`;
// a KPI tile, tinted by what it measures: pos = money in or good, neg = costs, net = what's left, neutral = counts
function tile(label,value,{note='',tone='neutral',icon='',sp='',go='',count=null,i=0}={}){
 const attrs=go?` role="button" tabindex="0" data-action="go" data-go="${go}" title="Open ${esc(label.toLowerCase())}"`:'';
 return `<div class="kpi tone-${tone}" style="--i:${i}"${attrs}><div class="label">${icon?`<span class="kpi-ico">${ico(icon)}</span>`:''}${label}${go?'<span class="go" aria-hidden="true">↗</span>':''}</div><b class="number"${count!==null?` data-count="${count}"`:''}>${value}</b>${sp}<small>${note}</small></div>`;}
// "+12% vs last week": green when the change is good for the baker (goodUp=false for costs)
function delta(a,b,{goodUp=true,f=compact,what='last week'}={}){if(!b)return `No ${what} to compare`;const d=(a-b)/Math.abs(b),up=d>=0,good=goodUp?up:!up;return `<span class="delta ${good?'up':'down'}">${up?'+':'−'}${Math.abs(d*100).toFixed(0)}%</span> vs ${what} (${f(b)})`;}
const trendColor=(vals,goodUp=true)=>{const v=vals.filter(Number.isFinite);if(v.length<2||v.at(-1)===v.at(-2))return 'var(--accent)';return (v.at(-1)>v.at(-2))===goodUp?'var(--ok)':'var(--over)';};
const cardhead=(title,note='',icon='',actions='')=>`<div class="cardhead"><div><h2>${icon?`<span class="h-ico">${ico(icon)}</span>`:''}${title}</h2>${note?`<p>${note}</p>`:''}</div>${actions?`<div class="actions">${actions}</div>`:''}</div>`;
const empty=(title,text,btn='',icon='compass')=>`<div class="empty">${ico(icon)}<h3>${title}</h3><p>${text}</p>${btn}</div>`;
const pager=(st,total,per)=>{const pages=Math.max(1,Math.ceil(total/per));return pages<2?'':`<div class="pager no-print"><span>${num(st.page*per+1)}–${num(Math.min(total,(st.page+1)*per))} of ${num(total)} · page ${st.page+1} of ${pages}</span><span class="actions">${button('Previous','page','small',`data-d="-1" ${st.page?'':'disabled'}`)}${button('Next','page','small',`data-d="1" ${st.page<pages-1?'':'disabled'}`)}</span></div>`;};
const pill=(text,cls='')=>`<span class="pill ${cls}">${text}</span>`;
// BakeCore stores 'Cancelled' (kept for backups); the screen says it the American way
const statusLabel=s=>s==='Cancelled'?'Canceled':s;
const statusPill=s=>pill(statusLabel(s),{Confirmed:'flag',Ready:'good',Collected:'',Cancelled:'warn'}[s]||'');

// the pulse: a few things worth knowing, one at a time, above the hero
function pulse(tips){if(!tips.length)return '';return `<section class="pulse no-print" id="pulse" data-at="0"><span class="pulse-live" aria-hidden="true"></span><div class="pulse-track" aria-live="polite">${tips.map((t,i)=>`<p class="${i?'':'on'}"><span>${t}</span></p>`).join('')}</div><div class="pulse-nav"><button class="pulse-arrow" data-action="pulse" data-d="-1" aria-label="Previous insight">‹</button>${tips.map((_,i)=>`<button class="pulse-dot" data-action="pulse-to" data-i="${i}" aria-label="Insight ${i+1} of ${tips.length}" aria-pressed="${!i}"></button>`).join('')}<button class="pulse-arrow" data-action="pulse" data-d="1" aria-label="Next insight">›</button></div></section>`;}
function showPulse(i){const box=$('#pulse');if(!box)return;const ps=[...box.querySelectorAll('.pulse-track p')],ds=[...box.querySelectorAll('.pulse-dot')],n=((i%ps.length)+ps.length)%ps.length;ps.forEach((p,k)=>p.classList.toggle('on',k===n));ds.forEach((d,k)=>d.setAttribute('aria-pressed',String(k===n)));box.dataset.at=n;}
setInterval(()=>{const box=$('#pulse');if(!box||box.matches(':hover,:focus-within')||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;showPulse(+box.dataset.at+1);},6000);

/* ---------- render ---------- */
const hubOf=id=>CONFIG.nav.find(n=>n[3]&&n[3].some(([c])=>c===id));
const navGroup=id=>(CONFIG.navGroups.find(([,ids])=>ids.includes(id))||[CONFIG.navGroupRest])[0];
function applyRail(){$('#app').classList.toggle('rail-min',railMin);const t=$('.rail-toggle');t.setAttribute('aria-expanded',String(!railMin));t.setAttribute('aria-label',railMin?'Expand navigation':'Collapse navigation');}
function renderNav(){const hidden=new Set(prefs.hiddenNav),hub=hubOf(screen);let last='';if(hub)hubLast[hub[0]]=screen;
 $('#nav').innerHTML=CONFIG.nav.filter(([id])=>!hidden.has(id)).map(([id,label,icon,kids])=>{const g=navGroup(id),h=g!==last?`<div class="navgroup">${g}</div>`:'';last=g;
  const current=kids?hub&&hub[0]===id:screen===id;return h+`<button class="navlink" data-action="go" data-go="${kids?hubLast[id]||id:id}" title="${label}" ${current?'aria-current="page"':''}>${ico(icon)}<span>${label}</span></button>`;}).join('');}
function renderStatus(){const s=storageProblem?'Backup needed':demo?'Sample mode':'Saved on this device';['#save-status','#rail-status'].forEach(k=>{const el=$(k);el.textContent=s;el.classList.toggle('warn',!!storageProblem);});
 $('#storage-banner').hidden=!storageProblem||demo;$('#storage-banner').innerHTML=storageProblem?`<span><b>Not saved.</b> ${esc(storageProblem)}</span><div class="actions">${button('Download backup','backup','small primary')}${recoveryRaw?button('Save recovery data','recovery','small'):''}${storageReloadable?button('Reload this tab','reload','small'):''}</div>`:'';
 const show=!demo&&!storageProblem&&!bannerHidden&&hasData()&&!protectedNow(),reconnect=folder&&folderStatus!=='Connected';
 $('#backup-banner').hidden=!show;$('#backup-banner').innerHTML=show?`<span>${reconnect?'<b>Your backup folder needs reconnecting.</b> Changes since then are only in this browser.':'<b>Your bakery is not backed up.</b> It lives only in this browser until you save a copy.'}</span><div class="actions">${folderSupported()?button(reconnect?'Reconnect folder':'Choose backup folder',reconnect?'reconnect-folder':'choose-folder','small primary'):button('Download backup','backup','small primary')}${button('Not now','banner-hide','small quiet')}</div>`:'';
 $('#demo-banner').hidden=!demo;$('#rail-demo').textContent=demo?'Return to my bakery':'Explore the sample bakery';}
// keep focus (and the caret in a search box) across re-renders
function captureFocus(){const el=document.activeElement;if(!el||el===document.body||!$('#content').contains(el))return null;
 const key=el.id?'#'+CSS.escape(el.id):Object.keys(el.dataset||{}).length?el.tagName.toLowerCase()+Object.entries(el.dataset).map(([k,v])=>`[data-${k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}="${CSS.escape(v)}"]`).join(''):'';
 if(!key)return null;let sel=null;try{if(el.selectionStart!=null)sel=[el.selectionStart,el.selectionEnd];}catch{}return {key,sel};}
function restoreFocus(f){if(!f)return;let el=null;try{el=document.querySelector(f.key);}catch{}if(!el)return;el.focus({preventScroll:true});try{if(f.sel)el.setSelectionRange(...f.sel);}catch{}}
function render(){const f=captureFocus();if(typeof autoSync==='function')autoSync();
 if(prefs.hiddenNav.includes(hubOf(screen)?.[0]||screen))screen='week';
 document.documentElement.dataset.theme=prefs.theme;applyRail();renderNav();renderStatus();
 $('#week-label').textContent=weekLabel(week);$('#week-picker').value=week;
 const hub=hubOf(screen);
 $('#content').innerHTML=`<div class="print-title"><span><b>${esc(state.settings.business)}</b> · Bakeweek Studio</span><b>${esc(['year','markets'].includes(screen)?week.slice(0,4):['orders','standing','recipes','pantry','tools','settings','guide'].includes(screen)?'Printed '+date(today()):'Week of '+weekLabel(week))}</b></div>`+
  (hub?`<nav class="segment hub-tabs" aria-label="${hub[1]}">${hub[3].map(([c,l])=>`<button data-action="go" data-go="${c}" aria-pressed="${c===screen}">${l}</button>`).join('')}</nav>`:'')+
  (VIEWS[screen]||VIEWS.week)()+`<footer class="footer"><span>Bakeweek Studio · JPS Digital Pages</span><span>${demo?'Sample bakery · nothing saved':'Saved on this device'} · v${CONFIG.version}</span></footer>`;
 sortTables();countUp();restoreFocus(f);}
// every table sorts by its headings (click, Enter or Space); totals rows stay at the bottom; the choice survives re-renders
const sorts=new Map();
const cellVal=td=>{if(!td)return null;if(td.dataset.v!==undefined){const v=td.dataset.v;return /^-?\d+(\.\d+)?$/.test(v)?+v:v;}const t=td.textContent.trim();if(!t||t==='—')return null;const n=t.replace(/[−–]/g,'-').replace(/[^\d.-]/g,'');return /^[−–\-$€£(]?\s*[\d$€£]/.test(t)&&/^-?\d+(\.\d+)?$/.test(n)?+n:t.toLowerCase();};
function sortTables(){document.querySelectorAll('#content table').forEach(tb=>{if(tb.hasAttribute('data-nosort')||!tb.tHead||!tb.tBodies[0]||tb.tBodies[0].rows.length<3)return;
 const key=screen+'|'+[...tb.tHead.rows[0].cells].map(c=>c.textContent).join(',');
 const apply=()=>{const st=sorts.get(key);if(!st)return;const body=tb.tBodies[0],all=[...body.rows],pin=all.filter(r=>r.classList.contains('total')),rest=all.filter(r=>!pin.includes(r));
  rest.sort((a,b)=>{const x=cellVal(a.cells[st.i]),y=cellVal(b.cells[st.i]);if(x===null)return 1;if(y===null)return -1;return (x<y?-1:x>y?1:0)*st.dir;});[...rest,...pin].forEach(r=>body.appendChild(r));
  [...tb.tHead.rows[0].cells].forEach((th,j)=>{th.dataset.sort=j===st.i?(st.dir<0?'desc':'asc'):'';th.setAttribute('aria-sort',j===st.i?(st.dir<0?'descending':'ascending'):'none');});};
 [...tb.tHead.rows[0].cells].forEach((th,i)=>{if(!th.textContent.trim())return;th.classList.add('th-sort');th.tabIndex=0;th.setAttribute('role','button');
  const go=()=>{const cur=sorts.get(key),first=cellVal(tb.tBodies[0].rows[0]?.cells[i]);sorts.set(key,{i,dir:cur&&cur.i===i?-cur.dir:(typeof first==='string'?1:-1)});apply();};th.onclick=go;th.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}};});apply();});}
// numbers count up to their final text once per render; off under reduced motion
function countUp(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;cancelAnimationFrame(countUp.t);const els=[...document.querySelectorAll('#content [data-count]')].map(el=>({el,to:+el.dataset.count,final:el.textContent,f:el.dataset.fmt==='mins'?mins:el.dataset.fmt==='num'?num:money})).filter(x=>Number.isFinite(x.to)&&x.to);if(!els.length)return;
 const t0=performance.now(),step=t=>{const p=Math.min(1,(t-t0)/620),e=1-Math.pow(1-p,3);for(const x of els)if(x.el.isConnected)x.el.textContent=p<1?x.f(x.to*e):x.final;if(p<1)countUp.t=requestAnimationFrame(step);};countUp.t=requestAnimationFrame(step);}

/* ---------- dialogs: form modal, confirm with a real button, welcome tour ---------- */
function modal(title,sub,body,wide=false){returnFocus=document.activeElement;const d=$('#dlg');d.classList.toggle('wide',wide);d.innerHTML=`<div class="dialog-head"><h2 id="dlg-title">${title}</h2><button class="ibtn" data-action="dismiss" aria-label="Close dialog">${ico('cross')}</button></div>${sub?`<p class="subtitle">${sub}</p>`:''}<div id="form-error" class="error" role="alert" hidden></div>${body}`;if(!d.open)d.showModal();d.querySelector('form input:not([type=hidden]):not([type=color]),form select,form textarea')?.focus({preventScroll:true});}
function closeModal(){if($('#dlg').open)$('#dlg').close();returnFocus?.focus?.();}
function formError(msg){const e=$('#form-error');if(!e)return toast(msg);e.hidden=false;e.textContent=msg;e.scrollIntoView({block:'nearest'});}
const formFoot=(label='Save',extra='')=>`<div class="formfoot">${extra}<button type="button" class="btn" data-action="dismiss">Cancel</button><button class="btn primary" type="submit">${label}</button></div>`;
function ask(title,text,okLabel,fn,danger=true){askFn=fn;modal(title,text,`<div class="formfoot"><button type="button" class="btn" data-action="dismiss">Cancel</button><button type="button" class="btn ${danger?'danger':'primary'}" data-action="ask-ok">${okLabel}</button></div>`);}
const BACKUP_SLIDE={icon:'shield',step:'BACK UP',title:'Protect your recipes and orders',text:'In Chrome or Edge, choose a cloud-synced folder once and a backup is saved after every change. In other browsers, download a backup from Settings now and then.'};
let tourAt=0,tourReminder=false;
const slides=()=>tourReminder?[BACKUP_SLIDE]:CONFIG.welcome.map(s=>s==='backup'?BACKUP_SLIDE:s);
function openTour(reminder=false){tourReminder=reminder;tourAt=0;renderTour();if(!$('#welcome').open)$('#welcome').showModal();$('#welcome [autofocus]')?.focus();}
function renderTour(){const all=slides(),s=all[tourAt],last=tourAt===all.length-1;
 $('#welcome').innerHTML=`<div style="position:relative"><button class="ibtn welcome-close" data-action="tour-close" aria-label="Close welcome">${ico('cross')}</button><div class="welcome-art" data-n="${tourAt%3}">${ico(s.icon)}</div><div class="welcome-body"><span class="welcome-step">${s.step}</span><h2 id="welcome-title">${s.title}</h2><p>${s.text}</p>${s===BACKUP_SLIDE&&folderSupported()&&!demo?`<div style="margin-top:14px">${button(folder?'Folder connected':'Choose backup folder','choose-folder','small',folder?'disabled':'')}</div>`:''}</div>
 <div class="welcome-foot"><span class="welcome-dots">${all.map((_,i)=>`<i class="${i===tourAt?'on':''}"></i>`).join('')}</span><span class="actions">${tourAt?button('Back','tour-step','','data-d="-1"'):''}${last?(tourReminder?button('Download backup','backup','')+button('Done','tour-close','primary','autofocus'):button('Explore the sample bakery','tour-sample','')+button('Get started','tour-close','primary','autofocus')):button('Next','tour-step','primary','data-d="1" autofocus')}</span></div></div>`;}
function closeTour(){ls.set(tourReminder?NUDGE_KEY:WELCOME_KEY,tourReminder?String(Date.now()):'1');if($('#welcome').open)$('#welcome').close();}
// first open: the tour. Afterwards a weekly backup nudge, while the banner carries the reminder in between.
function startupPrompt(){setTimeout(()=>{if(ls.get(WELCOME_KEY)!=='1'&&!demo)return openTour(false);if(demo||protectedNow()||!hasData())return;if(Date.now()-(+ls.get(NUDGE_KEY)||0)<7*864e5)return;openTour(true);},450);}
// chart tooltips: hover or focus anything with data-tip
function showTip(el,x,y){const tip=$('#tip');try{const {t,r}=JSON.parse(el.dataset.tip);tip.innerHTML=`<div class="tip-title">${esc(t)}</div>`+r.map(v=>`<div class="tip-row">${v.color?`<i class="dot" style="background:${v.color}"></i>`:''}<span>${esc(v.name)}</span><b>${esc(v.value)}</b></div>`).join('');tip.hidden=false;
 tip.style.left=Math.max(8,Math.min(innerWidth-tip.offsetWidth-8,x+14))+'px';tip.style.top=Math.max(8,Math.min(innerHeight-tip.offsetHeight-8,y+14))+'px';}catch{tip.hidden=true;}}
document.addEventListener('pointermove',e=>{const el=e.target.closest?.('[data-tip]');if(el)showTip(el,e.clientX,e.clientY);else $('#tip').hidden=true;});
document.addEventListener('focusin',e=>{const el=e.target.closest?.('[data-tip]');if(el){const r=el.getBoundingClientRect();showTip(el,r.right,r.top);}else $('#tip').hidden=true;});
window.addEventListener('scroll',()=>{$('#tip').hidden=true;},{passive:true});
