
const Budget = (() => {
  const THEMES=['lavender','sage','linen','fjord','blush','slate','night','midnight'];
  const MAX_QUICK_MEMORY=500;
  const CURRENCIES=['USD','EUR','GBP','CAD','AUD','NZD','INR','NGN','ZAR','JPY','CNY','CHF','SEK','NOK','DKK','PLN','CZK','HUF','RON','BGN','TRY','RUB','UAH','ILS','AED','SAR','QAR','KWD','EGP','KES','GHS','TZS','UGX','MAD','BRL','MXN','ARS','CLP','COP','PEN','SGD','HKD','MYR','THB','PHP','IDR','VND','KRW','TWD','PKR','BDT','LKR','NPR','ISK','HRK','RSD'];
  const DATE_FORMATS={auto:'Match my device',dmy:'21 Sep 2026',mdy:'Sep 21, 2026',ymd:'2026-09-21'};
  const GROUPS = {income:'Income',bills:'Bills',subscriptions:'Subscriptions',debt:'Debt payments',variable:'Variable expenses',sinking:'Sinking funds',savings:'Savings',investment:'Investments'};
  const type = c => c.group === 'income' ? 'income' : ['sinking','savings','investment'].includes(c.group) ? 'saving' : 'expense';
  const uid = () => globalThis.crypto?.randomUUID?.() || 'id-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  const today = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const validMonth = x => typeof x==='string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(x) && +x.slice(0,4)>=1900 && +x.slice(0,4)<=9998;
  const days = m => new Date(+m.slice(0,4),+m.slice(5,7),0,12).getDate();
  const validDate = x => typeof x==='string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && validMonth(x.slice(0,7)) && +x.slice(8)>=1 && +x.slice(8)<=days(x.slice(0,7));
  const shift = (m,n) => {const d=new Date(+m.slice(0,4),+m.slice(5)-1+n,1,12);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
  const cents = s => {if(!/^\d{1,8}(\.\d{1,2})?$/.test(String(s).trim())) throw Error('Use a positive amount with up to two decimal places.');return Math.round(Number(s)*100);};
  const blank = () => ({version:1,settings:{name:'',currency:'USD',symbol:'',dateFormat:'auto',theme:'lavender',hiddenNav:[]},baseline:{},categories:[
    ['salary','Salary','income'],['side','Side hustle','income'],['spouse','Spouse / partner','income'],['other-income','Other income','income'],
    ['housing','Rent / mortgage','bills'],['utilities','Utilities','bills'],['internet','Internet & phone','bills'],['insurance','Insurance','bills'],
    ['streaming','Streaming','subscriptions'],['memberships','Memberships','subscriptions'],['credit','Credit card payment','debt'],['loan','Loan payment','debt'],
    ['groceries','Groceries','variable'],['transport','Transport','variable'],['dining','Dining & coffee','variable'],['personal','Personal & family','variable'],
    ['travel','Travel fund','sinking'],['annual-bills','Annual bills fund','sinking'],['emergency','Emergency savings','savings'],['investing','Investment contributions','investment']
  ].map(([id,name,group])=>({id,name,group,archived:false})),months:{},transactions:[],goals:[],reviews:{},schedules:[],snapshots:{},quickMemory:{},importMap:{}});
  const month = (s,m) => s.months[m] || {plan:{},opening:0,note:'',closed:false};
  // The usual amounts repeat every month; a month stores only the categories it changes.
  const planFor = (s,m) => ({...(s.baseline||{}),...(month(s,m).plan||{})});
  const overrides = (s,m) => {const b=s.baseline||{},p=month(s,m).plan||{},out={};
    if(!Object.keys(b).length)return out;
    for(const id of Object.keys(p))if(!b[id]||b[id].amount!==p[id].amount||b[id].day!==p[id].day)out[id]=true;
    return out;};
  const txCache = new WeakMap();
  function byMonth(s){const arr=s.transactions,hit=txCache.get(arr);if(hit&&hit.len===arr.length)return hit.map;
    const map=new Map();for(const t of arr){const k=t.date.slice(0,7),a=map.get(k);a?a.push(t):map.set(k,[t]);}
    txCache.set(arr,{len:arr.length,map});return map;}
  const invalidate = s => {if(s&&s.transactions)txCache.delete(s.transactions);};
  const EMPTY=[];
  const transactions = (s,m) => byMonth(s).get(m) || EMPTY;
  const actual = (s,m,id) => transactions(s,m).filter(t=>t.category===id).reduce((a,t)=>a+t.amount,0);
  const rows = (s,m) => {
    const tx=transactions(s,m),sums=new Map(),used=new Set(),plan=planFor(s,m);
    tx.forEach(t=>{sums.set(t.category,(sums.get(t.category)||0)+t.amount);used.add(t.category);});
    return s.categories.filter(c=>!c.archived||plan[c.id]||used.has(c.id)).map(c=>({...c,type:type(c),planned:plan[c.id]?.amount||0,day:plan[c.id]?.day||0,actual:sums.get(c.id)||0}));
  };
  const totals = (s,m) => {
    const r=rows(s,m), out={income:{plan:0,actual:0},expense:{plan:0,actual:0},saving:{plan:0,actual:0}};
    r.forEach(c=>{out[c.type].plan+=c.planned;out[c.type].actual+=c.actual;});
    out.unassigned=out.income.plan-out.expense.plan-out.saving.plan;
    out.remaining=out.expense.plan-out.expense.actual;
    out.net=out.income.actual-out.expense.actual-out.saving.actual;
    out.cash=month(s,m).opening+out.net;
    return out;
  };
  const annual = (s,y) => Array.from({length:12},(_,i)=>{const m=`${y}-${String(i+1).padStart(2,'0')}`;return {month:m,...totals(s,m),hasPlan:Object.values(planFor(s,m)).some(p=>p.amount>0),closed:month(s,m).closed};});
  const goalProgress = (s,g,m) => {
    const end=m+'-'+String(days(m)).padStart(2,'0');
    const inWindow=end<g.start?[]:s.transactions.filter(t=>t.category===g.category && t.date>=g.start && t.date<=end);
    const saved=end<g.start?0:g.opening+inWindow.reduce((a,t)=>a+t.amount,0);
    const remaining=Math.max(0,g.target-saved);
    const months=Math.max(1,(+g.due.slice(0,4)-+m.slice(0,4))*12+(+g.due.slice(5,7)-+m.slice(5,7))+1);
    return {saved,remaining,counted:inWindow.length,everLogged:s.transactions.some(t=>t.category===g.category),monthly:Math.ceil(remaining/months),percent:Math.max(0,Math.min(100,Math.round(saved/g.target*100)))};
  };
  const due = (s,m) => rows(s,m).filter(c=>c.day && c.planned>0).map(c=>({...c,date:m+'-'+String(Math.min(c.day,days(m))).padStart(2,'0'),remaining:Math.max(0,c.planned-c.actual)})).sort((a,b)=>a.date.localeCompare(b.date));
  const FREQUENCIES={once:'Once',weekly:'Weekly',biweekly:'Every two weeks',monthly:'Monthly',quarterly:'Every three months',annual:'Yearly'};
  const plusDays=(date,n)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  function occurrences(s,m){
    const from=m+'-01',to=m+'-'+String(days(m)).padStart(2,'0'),linked=new Map(s.transactions.filter(t=>t.scheduleKey).map(t=>[t.scheduleKey,t]));
    const result=[];
    (s.schedules||[]).forEach(r=>{
      if(r.start>to||r.end<from)return;
      let dates=[];
      if(r.frequency==='once'){if(r.start>=from&&r.start<=to)dates=[r.start];}
      else if(['weekly','biweekly'].includes(r.frequency)){
        const step=r.frequency==='weekly'?7:14;
        const daysBetween=Math.round((Date.UTC(+from.slice(0,4),+from.slice(5,7)-1,1)-Date.UTC(+r.start.slice(0,4),+r.start.slice(5,7)-1,+r.start.slice(8)))/86400000);
        let d=plusDays(r.start,Math.max(0,Math.ceil(daysBetween/step))*step);
        while(d<=to&&validDate(d)){dates.push(d);d=plusDays(d,step);}
      }else{
        const step={monthly:1,quarterly:3,annual:12}[r.frequency],delta=(+m.slice(0,4)-+r.start.slice(0,4))*12+(+m.slice(5,7)-+r.start.slice(5,7));
        if(delta>=0&&delta%step===0)dates=[m+'-'+String(Math.min(+r.start.slice(8),days(m))).padStart(2,'0')];
      }
      dates.filter(d=>d>=r.start&&d<=r.end).forEach(date=>{const key=r.id+'@'+date;result.push({...r,date,key,transaction:linked.get(key)||null});});
    });
    return result.sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name)||a.key.localeCompare(b.key));
  }
  function schedulePlan(s,m){const sums={};occurrences(s,m).forEach(o=>{sums[o.category]=(sums[o.category]||0)+o.amount;});return sums;}
  function reserves(s,m,asOf=today()){
    const cutoff=asOf<m+'-01'?m+'-00':asOf>m+'-'+String(days(m)).padStart(2,'0')?m+'-'+String(days(m)).padStart(2,'0'):asOf;
    const partial={...s,transactions:s.transactions.filter(t=>t.date<=cutoff)},t=totals(partial,m),r=rows(partial,m),pending={};
    occurrences(partial,m).filter(o=>!o.transaction).forEach(o=>pending[o.category]=(pending[o.category]||0)+o.amount);
    for(const c of s.categories){if(pending[c.id]&&!r.some(row=>row.id===c.id))r.push({...c,type:type(c),planned:0,actual:0});}
    const fixed=r.filter(c=>['bills','subscriptions','debt'].includes(c.group)).reduce((n,c)=>n+Math.max(0,c.planned-c.actual,pending[c.id]||0),0);
    const saving=r.filter(c=>c.type==='saving').reduce((n,c)=>n+Math.max(0,c.planned-c.actual,pending[c.id]||0),0);
    return {cash:t.cash,fixed,saving,after:t.cash-fixed-saving,cutoff};
  }
  function annualCategories(s,y){const months=Array.from({length:12},(_,i)=>`${y}-${String(i+1).padStart(2,'0')}`),all=months.map(m=>new Map(rows(s,m).map(c=>[c.id,c])));return s.categories.filter(c=>!c.archived||all.some(r=>r.has(c.id))).map(c=>({...c,months:months.map((m,i)=>({month:m,plan:all[i].get(c.id)?.planned||0,actual:all[i].get(c.id)?.actual||0}))}));}
  function snapshotTotals(v){const assets=v.cash+v.savings+v.investments+v.other;return {assets,debts:v.debts,net:assets-v.debts};}
  const quickKey = text => String(text||'').toLowerCase().replace(/\b(refund|returned|reversal|withdrawal)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim().slice(0,80);
  function parseQuick(text,categories,memory={}){
    const raw=String(text||'').trim(),match=raw.match(/(?:^|\s)(?:[$€£₦₹R]\s*)?((?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]{1,8})(?:\.[0-9]{1,2})?|[0-9]{1,8},[0-9]{1,2})\s*$/);
    if(!match)throw Error('End the entry with an amount, like “coffee 4.50”.');
    const note=raw.slice(0,match.index).trim(),numeric=match[1].includes('.')?match[1].replace(/,/g,''):match[1].replace(',','.'),amount=cents(numeric);
    if(!note)throw Error('Add a short description before the amount.');
    const words=note.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),reverse=/\b(refund|returned|reversal|withdrawal)\b/.test(words);
    const aliases={coffee:'dining',cafe:'dining',lunch:'dining',dinner:'dining',restaurant:'dining',takeaway:'dining',groceries:'groceries',grocery:'groceries',supermarket:'groceries',food:'groceries',rent:'housing',mortgage:'housing',electric:'utilities',water:'utilities',gas:'utilities',utility:'utilities',phone:'internet',internet:'internet',netflix:'streaming',spotify:'streaming',streaming:'streaming',subscription:'memberships',fuel:'transport',petrol:'transport',uber:'transport',taxi:'transport',bus:'transport',train:'transport',salary:'salary',paycheck:'salary',payday:'salary',freelance:'side',client:'side',sidehustle:'side',partner:'spouse',spouse:'spouse',creditcard:'credit',loan:'loan',travel:'travel',holiday:'travel',emergency:'emergency',invest:'investing',investment:'investing'};
    let category='',source='';const remembered=memory[quickKey(note)];
    if(remembered&&categories.some(c=>c.id===remembered&&!c.archived)){category=remembered;source='memory';}
    if(!category)for(const c of categories){const n=c.name.toLowerCase();if(words===n||words.includes(n)){category=c.id;break;}}
    if(!category){for(const [word,id] of Object.entries(aliases)){if(words.replace(/ /g,'').includes(word)&&categories.some(c=>c.id===id&&!c.archived)){category=id;break;}}}
    return {note,amount:reverse?-amount:amount,category,...(source==='memory'?{source}: {})};
  }
  function protectClosedSchedules(before,after){
    for(const [m,v] of Object.entries(before.months)){if(!v.closed)continue;
      const signature=s=>occurrences(s,m).map(o=>[o.key,o.category,o.amount,o.name]);
      if(JSON.stringify(signature(before))!==JSON.stringify(signature(after)))throw Error('This would change a schedule in a closed month. Reopen that month or create a new schedule starting later.');
    }
    return after;
  }
  function validate(s){
    const fail=()=>{throw Error('This is not a valid Monthly Plan backup. Your current data has not been changed.');};
    const str=(x,max=300)=>typeof x==='string'&&x.length<=max;
    const amount=x=>Number.isSafeInteger(x)&&Math.abs(x)<=9999999999;
    const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
    const id=x=>str(x,80)&&/^[A-Za-z0-9_-]+$/.test(x)&&!['__proto__','prototype','constructor'].includes(x);
    if(object(s)&&typeof s.version==='number'&&s.version>1)throw Error('This backup was saved by a newer version of Monthly Plan. Open your newest planner file and restore it there. Your current data has not been changed.');
    if(object(s)&&object(s.settings)&&!THEMES.includes(s.settings.theme))s.settings.theme='lavender';
    if(object(s)&&object(s.settings)){
     if(s.settings.symbol===undefined)s.settings.symbol='';
     if(!Object.hasOwn(DATE_FORMATS,s.settings.dateFormat))s.settings.dateFormat='auto';
    }
    if(!object(s)||s.version!==1||!object(s.settings)||!str(s.settings.name,100)||!str(s.settings.symbol,6)||!CURRENCIES.includes(s.settings.currency)||!Array.isArray(s.categories)||!s.categories.length||s.categories.length>300||!object(s.months)||!Array.isArray(s.transactions)||s.transactions.length>100000||!Array.isArray(s.goals)||!object(s.reviews))fail();
    const optionalNav=['annual','goals','scheduled','calendar','wealth','insights','review','guide'];
    if(!Array.isArray(s.settings.hiddenNav))s.settings.hiddenNav=[];
    s.settings.hiddenNav=optionalNav.filter(x=>s.settings.hiddenNav.includes(x));
    const ids=new Set();s.categories.forEach(c=>{if(!object(c)||!id(c.id)||ids.has(c.id)||!str(c.name,80)||!c.name.trim()||!Object.hasOwn(GROUPS,c.group)||typeof c.archived!=='boolean')fail();ids.add(c.id);});
    Object.entries(s.months).forEach(([m,v])=>{if(!validMonth(m)||!object(v)||!object(v.plan)||!amount(v.opening)||!str(v.note,3000)||typeof v.closed!=='boolean')fail();Object.entries(v.plan).forEach(([c,p])=>{if(!ids.has(c)||!object(p)||!amount(p.amount)||p.amount<0||!Number.isInteger(p.day)||p.day<0||p.day>31)fail();});});
    if(s.seededFrom!==undefined&&!validMonth(s.seededFrom))delete s.seededFrom;
    if(s.baseline===undefined){
     // upgrading a planner written before plans repeated: adopt the latest month that was planned
     const planned=Object.keys(s.months).filter(m=>Object.keys(s.months[m].plan||{}).length).sort();
     s.baseline=planned.length?JSON.parse(JSON.stringify(s.months[planned[planned.length-1]].plan)):{};
     if(planned.length)s.seededFrom=planned[planned.length-1];
    }
    if(!object(s.baseline))fail();
    Object.entries(s.baseline).forEach(([c,p])=>{if(!ids.has(c)||!object(p)||!amount(p.amount)||p.amount<0||!Number.isInteger(p.day)||p.day<0||p.day>31)delete s.baseline[c];});
    if(s.schedules===undefined)s.schedules=[];
    if(s.snapshots===undefined)s.snapshots={};
    if(s.quickMemory===undefined)s.quickMemory={};
    if(!Array.isArray(s.schedules)||s.schedules.length>500||!object(s.snapshots)||!object(s.quickMemory))fail();
    if(s.importMap===undefined)s.importMap={};
    if(!object(s.importMap))s.importMap={};
    Object.entries(s.importMap).forEach(([k,v])=>{if(!str(k,120)||!ids.has(v))delete s.importMap[k];});
    Object.entries(s.quickMemory).forEach(([k,v])=>{if(!str(k,80)||!k||!ids.has(v))delete s.quickMemory[k];});
    const qk=Object.keys(s.quickMemory);if(qk.length>MAX_QUICK_MEMORY)for(const k of qk.slice(0,qk.length-MAX_QUICK_MEMORY))delete s.quickMemory[k];
    const scheduleIds=new Set();s.schedules.forEach(r=>{if(!object(r)||!id(r.id)||scheduleIds.has(r.id)||!str(r.name,100)||!r.name.trim()||!ids.has(r.category)||!amount(r.amount)||r.amount<=0||!validDate(r.start)||!validDate(r.end)||r.end<r.start||!Object.hasOwn(FREQUENCIES,r.frequency))fail();scheduleIds.add(r.id);});
    Object.entries(s.snapshots).forEach(([m,v])=>{if(!validMonth(m)||!object(v)||!str(v.note,1000)||['cash','savings','investments','other','debts'].some(k=>!amount(v[k])||v[k]<0))fail();if(v.debtMix===undefined)v.debtMix={credit:0,loans:0,mortgage:0,other:v.debts};if(!object(v.debtMix)||['credit','loans','mortgage','other'].some(k=>!amount(v.debtMix[k])||v.debtMix[k]<0)||Object.values(v.debtMix).reduce((n,x)=>n+x,0)!==v.debts)fail();});
    const keys=new Set();s.transactions.forEach(t=>{if(t.scheduleKey!==undefined){if(!str(t.scheduleKey,100)||!/^([A-Za-z0-9_-]+)@(\d{4}-\d{2}-\d{2})$/.test(t.scheduleKey)||!scheduleIds.has(t.scheduleKey.split('@')[0])||!validDate(t.scheduleKey.split('@')[1])||keys.has(t.scheduleKey))fail();keys.add(t.scheduleKey);const r=s.schedules.find(r=>r.id===t.scheduleKey.split('@')[0]);if(r.category!==t.category||t.amount<=0)fail();}});
    const tids=new Set();s.transactions.forEach(t=>{if(!object(t)||!id(t.id)||tids.has(t.id)||!validDate(t.date)||!ids.has(t.category)||!amount(t.amount)||!t.amount||!str(t.note,500))fail();tids.add(t.id);});
    const gids=new Set(),cats=new Set();s.goals.forEach(g=>{
     const gc=s.categories.find(c=>c.id===g.category);
     if(gc&&g.kind===undefined)g.kind=gc.group==='debt'?'debt':'saving';
     const fits=gc&&(g.kind==='debt'?gc.group==='debt':type(gc)==='saving');
     if(!object(g)||!id(g.id)||gids.has(g.id)||cats.has(g.category)||!ids.has(g.category)||!['saving','debt'].includes(g.kind)||!fits||!str(g.name,100)||!amount(g.target)||g.target<=0||!amount(g.opening)||g.opening<0||!validDate(g.start)||!validDate(g.due)||g.due<g.start)fail();
     // a damaged or oversized photo is dropped rather than failing the whole restore
     if(g.image!==undefined&&(typeof g.image!=='string'||!/^data:image\/(?:jpeg|png|webp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(g.image)||g.image.length>900000))delete g.image;
     if(g.kind==='debt')delete g.image;
     gids.add(g.id);cats.add(g.category);});
    Object.entries(s.reviews).forEach(([k,r])=>{if(!validDate(k)||!object(r)||!str(r.win,3000)||!str(r.change,3000)||!Array.isArray(r.checks)||r.checks.length!==3||r.checks.some(x=>typeof x!=='boolean')||typeof r.done!=='boolean')fail();});
    return s;
  }
  // Embedded covers keep the fictional sample fully usable as a single offline HTML file.
  const SAMPLE_GOAL_IMAGES={travel:"",emergency:"",investing:""};
  // a few commitments fall late in the month so the sample shows a realistic mid-month position
  const LATE_IN_MONTH={insurance:26,memberships:24,loan:27,'annual-bills':25,'car-loan':18};
  function sample(m=today().slice(0,7)){
    const s=blank();s.settings.name='Alex';s.settings.goalImages=true;s.settings.goalsLayout='grid';s.categories.push({id:'car-loan',name:'Car loan payment',group:'debt',archived:false});const year=m.slice(0,4),now=today();
    const amounts={salary:3600,side:450,spouse:1800,housing:1550,utilities:180,internet:90,insurance:120,streaming:35,memberships:45,credit:220,loan:180,'car-loan':300,groceries:520,transport:180,dining:160,personal:180,travel:250,'annual-bills':120,emergency:500,investing:400};
    for(let i=1;i<=12;i++){
      const key=`${year}-${String(i).padStart(2,'0')}`,past=key<m;
      s.months[key]={opening:50000,closed:past,note:key===m?'Build a little breathing room. Keep dining within plan and make the travel transfer.':'',plan:{}};
      Object.entries(amounts).forEach(([id,a],j)=>{const day=id==='salary'||id==='spouse'?1:id==='side'?20:(LATE_IN_MONTH[id]||Math.min(28,j+1));s.months[key].plan[id]={amount:a*100,day:['groceries','transport','dining','personal'].includes(id)?0:day};
        if(key>m)return;
        const c=s.categories.find(c=>c.id===id);
        if(c.group==='variable'){
          [3,9,16,23,28].forEach((d,n)=>{const date=`${key}-${String(d).padStart(2,'0')}`;if(date<=now)s.transactions.push({id:uid(),date,category:id,amount:Math.round(a*100*(id==='dining'?.24:.17)+(past?(i%3)*100:0)),note:['Weekly shop','Top-up','Weekend','Weekly shop','Month end'][n]});});
        }else{const date=key+'-'+String(day).padStart(2,'0');if(date<=now)s.transactions.push({id:uid(),date,category:id,amount:a*100,note:c.name});}
      });
    }
    s.baseline=JSON.parse(JSON.stringify(s.months[m].plan));
    for(const key of Object.keys(s.months))if(key>m)s.months[key].plan={};
    s.schedules=s.categories.filter(c=>c.group!=='variable'&&amounts[c.id]).map(c=>({id:'sample-'+c.id,name:c.name,category:c.id,amount:amounts[c.id]*100,frequency:'monthly',start:year+'-01-'+String(s.months[year+'-01'].plan[c.id].day).padStart(2,'0'),end:year+'-12-31'}));
    s.transactions.forEach(t=>{const r=s.schedules.find(r=>r.category===t.category);if(r)t.scheduleKey=r.id+'@'+t.date;});
    for(let i=1;i<=+m.slice(5,7);i++){const credit=Math.max(0,198000-i*22000),personal=Math.max(0,240000-i*18000),car=Math.max(0,510000-i*30000),loans=personal+car,mortgage=Math.max(0,300000-i*10000),debts=credit+loans+mortgage;s.snapshots[year+'-'+String(i).padStart(2,'0')]={cash:120000+i*18000,savings:190000+i*70000,investments:600000+i*41000,other:150000,debts,debtMix:{credit,loans,mortgage,other:0},note:'Fictional month-end statement balances.'};}
    s.goals=[
     {id:uid(),category:'travel',kind:'saving',name:'A holiday, already paid for',target:300000,opening:40000,start:year+'-01-01',due:year+'-12-31',image:SAMPLE_GOAL_IMAGES.travel},
     {id:uid(),category:'emergency',kind:'saving',name:'Build a cushion',target:1000000,opening:150000,start:year+'-01-01',due:(+year+1)+'-06-30',image:SAMPLE_GOAL_IMAGES.emergency},
     {id:uid(),category:'investing',kind:'saving',name:'Invest consistently',target:480000,opening:0,start:year+'-01-01',due:year+'-12-31',image:SAMPLE_GOAL_IMAGES.investing},
     {id:uid(),category:'credit',kind:'debt',name:'Clear the credit card',target:264000,opening:66000,start:year+'-01-01',due:year+'-12-31'},
     {id:uid(),category:'loan',kind:'debt',name:'Pay off the personal loan',target:300000,opening:60000,start:year+'-01-01',due:(+year+1)+'-06-30'},
     {id:uid(),category:'car-loan',kind:'debt',name:'Finish the car loan',target:600000,opening:90000,start:year+'-01-01',due:(+year+1)+'-12-31'}];
    return s;
  }
  return {planFor,overrides,CURRENCIES,DATE_FORMATS,THEMES,MAX_QUICK_MEMORY,invalidate,FREQUENCIES,plusDays,occurrences,schedulePlan,reserves,annualCategories,snapshotTotals,quickKey,parseQuick,protectClosedSchedules,GROUPS,type,uid,today,validMonth,validDate,days,shift,cents,blank,month,transactions,actual,rows,totals,annual,goalProgress,due,validate,sample};
})();
if(typeof module!=='undefined')module.exports=Budget;
