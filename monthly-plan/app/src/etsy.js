/* Etsy edition, part 1: reading Etsy's exports and the shop analytics built on them.
   Pure functions over the planner state; no DOM. Amounts are integer cents.
   Four exports: payment account statement (CSV), sold order items (CSV), listings (CSV), reviews (JSON). */
const EtsyData=((P,B,CSV)=>{
 const X=P.etsy,ALL={from:'1900-01-01',to:'9998-12-31'};
 // short, stable keys for duplicate checks and for buyers (a buyer's name is never stored)
 const hash=(str,seed=0)=>{let h1=0xdeadbeef^seed,h2=0x41c6ce57^seed;for(let i=0;i<str.length;i++){const ch=str.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677);}
  h1=Math.imul(h1^(h1>>>16),2246822507);h1^=Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507);h2^=Math.imul(h1^(h1>>>13),3266489909);
  return (4294967296*(2097151&h2)+(h1>>>0)).toString(36);};
 const norm=s=>String(s??'').trim().toLowerCase().replace(/\s+/g,' ');
 const head=h=>norm(h).replace(/[^a-z0-9]+/g,' ').trim();
 // listings carry no listing number, so they meet their sales on the start of the title
 const titleKey=s=>norm(s).replace(/&amp;/g,'&').replace(/&#39;|&quot;/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const sameTitle=(a,b)=>{const n=Math.min(a.length,b.length,40);return n>=12&&a.slice(0,n)===b.slice(0,n);};
 const KINDS={statement:'Payment account statement',orders:'Sold order items',listings:'Listings',reviews:'Reviews',deposits:'Etsy Payments Deposits',bank:'Bank CSV'};
 const SIGNS={statement:['date','type','title','info','currency','amount','fees taxes','net'],
  orders:['sale date','item name','quantity','price','item total','order id'],
  listings:['title','price','quantity','tags']};
 const kindOf=headers=>{const h=new Set(headers.map(head));return Object.keys(SIGNS).find(k=>SIGNS[k].every(x=>h.has(x)))||null;};
 // "$16.08", "-$0.20", "CA$1,234.50", "(3.10)", "12,50 €" → cents; "--" and blanks → null
 function money(raw){
  const s=String(raw??'').trim();if(!s||/^[-–—]+$/.test(s))return null;
  const neg=/^\(.*\)$/.test(s)||/^[^\d]*[-−–]/.test(s);let d=s.replace(/[^\d.,]/g,'');
  if(/,\d{1,2}$/.test(d)&&!/\.\d{1,2}$/.test(d))d=d.replace(/\./g,'').replace(',','.');else d=d.replace(/,/g,'');
  if(!/^\d+(\.\d+)?$/.test(d))throw Error(`Could not read "${s.slice(0,20)}" as an amount`);
  const n=Math.round(parseFloat(d)*100);return neg?-n:n;}
 const when=v=>CSV.date(String(v).trim(),'mdy');

 // ---------- payment account statement ----------
 // Type + Title → category. Sales tax / VAT the buyer paid is a minus line under revenue, so it is
 // never income or a cost; credits and refunds of fees reduce the fee they belong to.
 function classify(type,title){
  const T=norm(type),t=norm(title);
  const fee=()=>/offsite/.test(t)?'offsite-ads':/etsy ads|ads fee|advertis/.test(t)?'etsy-ads':/etsy plus|plus subscription/.test(t)?'etsy-plus':/share (&|and) save/.test(t)?'transaction-fees'
   :/transaction/.test(t)?'transaction-fees':/processing/.test(t)?'processing-fees':/listing|renew/.test(t)?'listing-fees':/shipping|postage|label/.test(t)?'shipping-labels':'other-etsy-fees';
  switch(T){
   case 'sale':return {category:'etsy-sales'};
   case 'refund':return {category:/fee/.test(t)?fee():'etsy-refunds'};
   case 'fee':case 'fees':return {category:fee()};
   case 'tax':case 'vat':case 'gst':case 'sales tax':return {category:/buyer/.test(t)?'buyer-tax':'fee-tax'};
   case 'marketing':return {category:/offsite/.test(t)?'offsite-ads':/plus/.test(t)?'etsy-plus':/ads/.test(t)?'etsy-ads':'other-marketing'};
   case 'deposit':return {category:'etsy-deposit',deposit:true};
   case 'shipping':case 'shipping label':case 'postage':return {category:'shipping-labels'};
   case 'payment':case 'reserve':case 'disbursement':return {category:'own-transfer'};
  }
  return {category:fee(),unknown:true};
 }
 const refOf=text=>{let m=text.match(/order\s*#?\s*(\d{4,})/i);if(m)return 'o'+m[1];m=text.match(/listing\s*#?\s*(\d{4,})/i);return m?'l'+m[1]:'';};
 function statement(rows,headers){
  const ix=k=>headers.findIndex(h=>head(h)===k),c={date:ix('date'),type:ix('type'),title:ix('title'),info:ix('info'),currency:ix('currency'),amount:ix('amount'),fees:ix('fees taxes'),net:ix('net')};
  const lines=new Map(),issues=[],unknown=new Set(),currencies=new Set(),cats=Object.fromEntries(P.categories.map(([id,,g])=>[id,P.groups.find(x=>x.id===g).type]));
  rows.forEach(r=>{const g=k=>c[k]>=0?String(r.cells[c[k]]??'').trim():'';
   try{const date=when(g('date')),type=g('type'),title=g('title'),info=g('info'),cls=classify(type,title);
    if(cls.unknown)unknown.add(type||'(blank)');
    let v;
    if(cls.deposit){const m=title.match(/[-−(]?[^\s\d]{0,4}\d[\d.,]*/);v=m?money(m[0]):null;if(v===null)v=money(g('net'))??money(g('amount'));if(v===null)throw Error('No amount in this deposit line');}
    else if(['etsy-sales','etsy-refunds'].includes(cls.category))v=money(g('amount'))??money(g('net'));
    else v=money(g('net'))??money(g('fees'))??money(g('amount'));
    if(!v)return;
    if(g('currency'))currencies.add(g('currency').toUpperCase());
    const kind=cats[cls.category],amount=kind==='income'?v:kind==='expense'?-v:Math.abs(v),ref=refOf(title+' '+info);
    const key=[date,cls.category,ref,norm(title)].join('|'),hit=lines.get(key);
    if(hit)hit.amount+=amount;else lines.set(key,{date,category:cls.category,amount,ref,note:[title,info].filter(Boolean).join(' · ').slice(0,160),key,type});
   }catch(e){issues.push(`Line ${r.line}: ${e.message}`);}});
  const records=[...lines.values()].filter(x=>x.amount);
  return {records,issues,currencies,notes:unknown.size?[`Unrecognised line types filed under Other Etsy fees: ${[...unknown].join(', ')}`]:[]};
 }
 // ---------- sold order items ----------
 // Discount, shipping and sales tax are order-level: Etsy writes them once per order, not per item.
 const once=vals=>{const v=vals.filter(Boolean);return !v.length?0:v.every(x=>x===v[0])?v[0]:v.reduce((a,b)=>a+b,0);};
 function soldItems(rows,headers){
  const ix=k=>headers.findIndex(h=>head(h)===k),col=['sale date','item name','buyer','quantity','price','coupon code','discount amount','shipping discount','order shipping','order sales tax','item total','currency','transaction id','listing id','ship country','order id','sku','vat paid by buyer'];
  const c=Object.fromEntries(col.map(k=>[k,ix(k)])),orders=new Map(),items=[],issues=[],currencies=new Set();
  rows.forEach((r,n)=>{const g=k=>c[k]>=0?String(r.cells[c[k]]??'').trim():'';
   try{const order=g('order id').replace(/\D/g,'');if(!order)throw Error('No order ID');
    const date=when(g('sale date')),qty=Math.max(1,parseInt(g('quantity'),10)||1),price=money(g('price'))??0,total=money(g('item total'))??price*qty,name=g('item name').slice(0,300)||'Untitled item';
    if(g('currency'))currencies.add(g('currency').toUpperCase());
    let o=orders.get(order);if(!o)orders.set(order,o={id:order,date,buyer:g('buyer')?hash(norm(g('buyer'))).slice(0,12):'',country:g('ship country').slice(0,60),coupon:g('coupon code').slice(0,80),d:[],sd:[],sh:[],tx:[],vat:[],list:0,units:0});
    if(date<o.date)o.date=date;if(!o.coupon&&g('coupon code'))o.coupon=g('coupon code').slice(0,80);
    o.d.push(Math.abs(money(g('discount amount'))??0));o.sd.push(Math.abs(money(g('shipping discount'))??0));o.sh.push(money(g('order shipping'))??0);o.tx.push(money(g('order sales tax'))??0);o.vat.push(money(g('vat paid by buyer'))??0);
    o.list+=total;o.units+=qty;
    const id=g('transaction id').replace(/\D/g,'')||'h'+hash([order,g('listing id'),name,n].join('|'));
    items.push({id,order,listing:g('listing id').replace(/\D/g,'').slice(0,40),name,qty,price,total,sku:g('sku').slice(0,80)});
   }catch(e){issues.push(`Line ${r.line}: ${e.message}`);}});
  const list=[...orders.values()].map(o=>({id:o.id,date:o.date,buyer:o.buyer,country:o.country,coupon:o.coupon,discount:once(o.d),shipDiscount:once(o.sd),shipping:once(o.sh),tax:once(o.tx)+once(o.vat),list:o.list,units:o.units}));
  return {records:list,items,issues,currencies,notes:[]};
 }
 // ---------- listings ----------
 function listings(rows,headers){
  const h=headers.map(head),ix=k=>h.indexOf(k),issues=[],currencies=new Set(),records=[];
  const images=h.map((x,i)=>/^image\s?\d+$/.test(x)?i:-1).filter(i=>i>=0),variations=h.map((x,i)=>/^variation \d type$/.test(x)?i:-1).filter(i=>i>=0);
  rows.forEach(r=>{const g=i=>i>=0?String(r.cells[i]??'').trim():'';
   try{const title=g(ix('title')).slice(0,300);if(!title)throw Error('No title');
    if(g(ix('currency code')))currencies.add(g(ix('currency code')).toUpperCase());
    records.push({title,price:Math.abs(money(g(ix('price')))??0),qty:Math.max(0,Math.min(1e7,parseInt(g(ix('quantity')),10)||0)),photos:Math.min(10,images.filter(i=>g(i)).length),
     tags:Math.min(13,g(ix('tags')).split(',').filter(t=>t.trim()).length),sku:g(ix('sku')).slice(0,80),variations:Math.min(3,variations.filter(i=>g(i)).length)});
   }catch(e){issues.push(`Line ${r.line}: ${e.message}`);}});
  return {records,issues,currencies,notes:[]};
 }
 // ---------- Etsy Payments Deposits ----------
 // Payouts Etsy sent to the bank. They are not revenue (fees and tax are already gone); they let a
 // bank import tell Etsy payouts apart from money that came from anywhere else.
 const looksDeposits=(cells,name)=>{const h=cells.map(head);return h.some(x=>/date/.test(x))&&h.some(x=>/amount|^net$/.test(x))&&!h.includes('type')&&(/deposit/i.test(name)||h.some(x=>/deposit/.test(x)));};
 function deposits(rows,headers){
  const h=headers.map(head),col=re=>h.findIndex(x=>re.test(x)),d=col(/date/),a=[/^deposit amount$/,/^amount$/,/amount/,/^net$/].map(col).find(i=>i>=0)??-1,c=col(/currency/),st=col(/status/);
  if(d<0||a<0)throw Error('This deposits file has no date or amount column.');
  const records=[],issues=[],currencies=new Set(),seen=new Map();
  rows.forEach(r=>{const g=i=>i>=0?String(r.cells[i]??'').trim():'';
   try{if(st>=0&&/fail|return|cancel|revers/i.test(g(st)))return;
    const date=when(g(d)),amount=Math.abs(money(g(a))??0);if(!amount)return;if(g(c))currencies.add(g(c).toUpperCase());
    const base=date+'|'+amount,n=(seen.get(base)||0)+1;seen.set(base,n);records.push({date,amount,key:n>1?base+'#'+n:base});
   }catch(e){issues.push(`Line ${r.line}: ${e.message}`);}});
  return {records,issues,currencies,notes:[]};
 }
 // ---------- reviews.json ----------
 function reviews(json){
  const list=Array.isArray(json)?json:Array.isArray(json?.reviews)?json.reviews:null;if(!list)throw Error('This JSON file is not a list of reviews.');
  // a buyer can review each item of one order: same order, day, stars and words, and the export
  // does not say which item. Repeats are numbered within the file so all of them count, and the
  // same file imported again still matches itself.
  const records=[],issues=[],seen=new Map();
  list.forEach((r,i)=>{try{const stars=Math.round(Number(r.star_rating??r.rating));if(!(stars>=1&&stars<=5))throw Error('No star rating');
   const date=when(r.date_reviewed??r.date),message=String(r.message??r.review??'').trim().slice(0,2000),order=String(r.order_id??'').replace(/\D/g,'').slice(0,40);
   const base=[order,date,stars,message].join('|'),n=(seen.get(base)||0)+1;seen.set(base,n);
   records.push({id:'r'+hash(n>1?base+'#'+n:base),date,stars,message,order});}catch(e){issues.push(`Review ${i+1}: ${e.message}`);}});
  return {records,issues,currencies:new Set(),notes:[]};
 }
 // Etsy's other download options, recognised so the import screen can say what to use instead
 function otherReport(rows){const has=(...k)=>rows.some(r=>k.every(x=>r.includes(x)));
  if(has('order id','number of items')||has('order id','order net'))return 'This is Etsy’s Orders report (one row per order). You don’t need it: the Order Items report has the same orders item by item, and the monthly payment account statement has every fee.';
  if(rows.some(r=>r.some(x=>/gross amount|net amount|posted/.test(x))))return 'This is Etsy’s Payments Sales report (for 1099-K checks). You don’t need it: the payment account statement has the same payments plus every Etsy fee and ad.';
  return '';}
 // One file in, one parsed file out. The kind comes from the header row, never from the file name.
 function read(name,text){
  const out={name:String(name||'file').slice(0,160),kind:null,records:[],items:[],issues:[],notes:[],currency:'',from:'',to:''};
  try{const t=String(text).replace(/^﻿/,'').trim();let r;
   if(/^[[{]/.test(t)){out.kind='reviews';r=reviews(JSON.parse(t));}
   else{const d=CSV.detect(t),rows=CSV.parse(d.text,d.delimiter),at=rows.slice(0,5).findIndex(x=>kindOf(x.cells));
    if(at>=0){const headers=rows[at].cells;out.kind=kindOf(headers);r={statement,orders:soldItems,listings}[out.kind](rows.slice(at+1),headers);}
    else{const dp=rows.slice(0,5).findIndex(x=>looksDeposits(x.cells,out.name));
     if(dp<0){out.error=otherReport(rows.slice(0,5).map(x=>x.cells.map(head)))||`Not an Etsy export this app reads. First row: ${(rows[0]?.cells||[]).slice(0,6).join(', ').slice(0,120)}`;return out;}
     out.kind='deposits';r=deposits(rows.slice(dp+1),rows[dp].cells);}}
   Object.assign(out,{records:r.records,items:r.items||[],issues:r.issues,notes:r.notes});
   if(r.currencies.size>1)out.error=`This file mixes currencies (${[...r.currencies].join(', ')}).`;out.currency=[...r.currencies][0]||'';
   const dates=out.records.map(x=>x.date).filter(Boolean).sort();out.from=dates[0]||'';out.to=dates.at(-1)||'';
   if(!out.records.length&&!out.error)out.error=out.issues[0]||'No rows to import in this file.';
  }catch(e){out.error=e.message;}
  return out;
 }

 // ---------- merging into the planner ----------
 // Everything is keyed so a repeated or overlapping file adds nothing twice. A file whose orders
 // already belong to another shop is refused whole. dry:true counts without changing anything.
 function merge(s,shop,file,{uid=B.uid,today=B.today(),dry=false}={}){
  const E=s.etsy,r={kind:file.kind,name:file.name,added:0,updated:0,same:0,replaced:0,items:0,months:new Set(),error:''};
  const shopName=id=>(s.shops.find(x=>x.id===id)||{}).name||'another shop';
  if(file.error){r.error=file.error;return r;}
  if(!s.shops.some(x=>x.id===shop)){r.error='Choose a shop first.';return r;}
  if(file.currency&&file.currency!==s.settings.currency){
   const emptyBooks=!s.transactions.length&&!E.orders.length&&!E.listings.length;
   if(!emptyBooks||!B.CURRENCIES.includes(file.currency)){r.error=`This file is in ${file.currency}, but Shop Insights is set to ${s.settings.currency}. Change the currency in Settings, or use one planner file per currency.`;return r;}
   r.currency=file.currency;if(!dry)s.settings.currency=file.currency;}
  const ownerOf=new Map();E.orders.forEach(o=>ownerOf.set('o'+o.id,o.shop));s.transactions.forEach(t=>{if(t.shop&&t.ref&&t.ref[0]==='o'&&!ownerOf.has(t.ref))ownerOf.set(t.ref,t.shop);});
  const clash=refs=>{for(const x of refs){const o=ownerOf.get(x);if(o&&o!==shop)return o;}return '';};
  // every order in the file already belongs to one other shop: it is that shop's download again
  const whole=(refs,other)=>refs.length&&refs.every(x=>ownerOf.get(x)===other);
  const clashMsg=(refs,other,what)=>whole(refs,other)?`Every ${what} in this file is already in ${shopName(other)}, so this is ${shopName(other)}’s download again, whatever the file is called. Etsy downloads the shop that is open in Shop Manager: switch to the other shop there first, then download it again.`:`Some ${what}s in this file are already in ${shopName(other)}. Choose that shop, or check the file.`;
  if(file.kind==='statement'){
   const refs=[...new Set(file.records.map(x=>x.ref).filter(x=>x[0]==='o'))],other=clash(refs);if(other){r.error=clashMsg(refs,other,'order');return r;}
   // a line's key leaves the shop out, so a statement moved to another shop still matches itself;
   // lines imported before that carry hash(shop|key) and are found through every shop's name
   const bySrc=new Map();s.transactions.forEach(t=>{if(t.src&&!t.est)bySrc.set((t.shop||'')+'|'+t.src,t);});
   for(const x of file.records){const src=hash(x.key),old=[src,...s.shops.map(v=>hash(v.id+'|'+x.key))].map(c=>bySrc.get(shop+'|'+c)).find(Boolean);
    if(old){if(old.amount===x.amount)r.same++;else{r.updated++;r.months.add(x.date.slice(0,7));if(!dry)old.amount=x.amount;}continue;}
    r.added++;r.months.add(x.date.slice(0,7));if(!dry)s.transactions.push({id:uid(),date:x.date,category:x.category,amount:x.amount,note:x.note,shop,...(x.ref?{ref:x.ref}:{}),src});}
  }else if(file.kind==='orders'){
   const refs=file.records.map(o=>'o'+o.id),other=clash(refs);if(other){r.error=clashMsg(refs,other,'order');return r;}
   const orders=new Map(E.orders.map(o=>[o.id,o])),itemIds=new Set(E.items.map(i=>i.id)),touched=new Set();
   for(const o of file.records){if(orders.has(o.id))r.same++;else{r.added++;if(!dry){const n={...o,shop};E.orders.push(n);orders.set(o.id,n);}}}
   for(const i of file.items){if(itemIds.has(i.id))continue;r.items++;itemIds.add(i.id);if(!dry){E.items.push({...i,shop});touched.add(i.order);}}
   // an order seen before with new item lines: its totals come from all of its items
   if(!dry)for(const id of touched){const o=orders.get(id),its=E.items.filter(i=>i.order===id);if(o&&its.length){o.list=its.reduce((n,i)=>n+i.total,0);o.units=its.reduce((n,i)=>n+i.qty,0);}}
  }else if(file.kind==='listings'){
   // a listings export is the shop as it is today, so it replaces that shop's listings
   const sig=list=>JSON.stringify(list.map(({title,price,qty,photos,tags,sku,variations})=>[title,price,qty,photos,tags,sku,variations]));
   const mine=E.listings.filter(l=>l.shop===shop);if(sig(mine)===sig(file.records)){r.same=mine.length;}
   else{r.replaced=mine.length;r.added=file.records.length;}
   if(!dry&&r.added)E.listings=E.listings.filter(l=>l.shop!==shop).concat(file.records.map((l,i)=>({id:'L'+hash([shop,l.title,l.sku,i].join('|')),shop,...l})));
  }else if(file.kind==='deposits'){
   E.deposits??=[];const have=new Map();E.deposits.forEach(d=>{if(d.shop!==shop)return;const k=d.date+'|'+d.amount;have.set(k,(have.get(k)||0)+1);});
   const seen=new Map();
   for(const x of file.records){const k=x.date+'|'+x.amount,n=(seen.get(k)||0)+1;seen.set(k,n);if(n<=(have.get(k)||0)){r.same++;continue;}
    r.added++;if(!dry)E.deposits.push({id:'d'+uid().replace(/[^A-Za-z0-9]/g,'').slice(0,20),shop,date:x.date,amount:x.amount});}
  }else if(file.kind==='reviews'){
   const refs=file.records.filter(x=>x.order).map(x=>'o'+x.order),other=clash(refs);if(other){r.error=clashMsg(refs,other,'reviewed order');return r;}
   const ids=new Set(E.reviews.map(x=>x.id));
   for(const x of file.records){if(ids.has(x.id)){r.same++;continue;}ids.add(x.id);r.added++;if(!dry)E.reviews.push({...x,shop});}
  }
  if(!dry){E.imports.push({id:'i'+uid().replace(/[^A-Za-z0-9]/g,'').slice(0,20),shop,kind:file.kind,name:file.name,at:today,rows:file.records.length,...(file.from?{from:file.from,to:file.to}:{})});if(E.imports.length>2000)E.imports.splice(0,E.imports.length-2000);}
  return r;
 }

 // A month with sold orders but no payment account statement still belongs in the books: its
 // revenue is exact (items after discounts + shipping, before tax) and Etsy's fees are estimated at
 // the standard rates. The estimate lives as transactions marked est:true, one per category and
 // month, and is rebuilt after every import or deletion, so a month's statement replaces it.
 // Etsy Ads, Etsy Plus and credits are not in the sold orders file and are not guessed.
 const hasStatement=t=>!t.est&&!!(t.src||t.ref);
 function syncEstimates(s,{uid=B.uid,today=B.today()}={}){
  const R=X.estimate,real=new Set(),by=new Map();
  for(const t of s.transactions)if(hasStatement(t)&&t.shop)real.add(t.shop+'|'+t.date.slice(0,7));
  for(const o of s.etsy?.orders||[]){const k=o.shop+'|'+o.date.slice(0,7);if(real.has(k))continue;
   let g=by.get(k);if(!g)by.set(k,g={shop:o.shop,month:o.date.slice(0,7),last:o.date,n:0,sales:0,tx:0,proc:0,units:0});
   const paid=o.list-o.discount+(o.shipping||0);g.n++;g.sales+=paid;g.tx+=Math.round(paid*R.transaction/10000);g.proc+=Math.round((paid+(o.tax||0))*R.processing/10000)+R.processingFixed;g.units+=o.units||1;if(o.date>g.last)g.last=o.date;}
  const before=s.transactions.filter(t=>t.est).length,add=[];
  for(const g of by.values()){const date=g.last>today?today:g.last;
   [['etsy-sales',g.sales,`Estimated from ${g.n} sold order${g.n===1?'':'s'} (no statement for this month yet)`],['transaction-fees',g.tx,`Estimated transaction fees, ${R.transaction/100}%`],
    ['processing-fees',g.proc,`Estimated processing fees, ${R.processing/100}% + ${(R.processingFixed/100).toFixed(2)} an order`],['listing-fees',g.units*R.listing,`Estimated listing fees, ${(R.listing/100).toFixed(2)} an item sold`]]
    .forEach(([category,amount,note])=>{if(amount)add.push({id:uid(),date,category,amount,note,shop:g.shop,est:true,...(category==='etsy-sales'?{n:g.n}:{})});});}
  if(!before&&!add.length)return 0;
  s.transactions=s.transactions.filter(t=>!t.est).concat(add);return add.length;
 }
 const estimatedMonths=(s,from,to)=>[...new Set(scoped(s,s.transactions).filter(t=>t.est&&t.date>=from&&t.date<=to).map(t=>t.date.slice(0,7)))].sort();
 // What one import brought in: its shop's rows of that kind within the file's dates (a bank file:
 // the rows it created). An older log entry without dates covers all of its kind for that shop.
 function importScope(s,x){const E=s.etsy,inR=d=>(!x.from||d>=x.from)&&(!x.to||d<=x.to);
  if(x.kind==='bank')return {tx:x.id?s.transactions.filter(t=>t.imp===x.id):[]};
  if(x.kind==='statement')return {tx:s.transactions.filter(t=>t.shop===x.shop&&t.src&&!t.est&&!t.imp&&inR(t.date))};
  if(x.kind==='orders'){const o=E.orders.filter(v=>v.shop===x.shop&&inR(v.date)),ids=new Set(o.map(v=>v.id));return {orders:o,items:E.items.filter(it=>ids.has(it.order))};}
  if(x.kind==='listings')return {listings:E.listings.filter(l=>l.shop===x.shop)};
  if(x.kind==='deposits')return {deposits:(E.deposits||[]).filter(v=>v.shop===x.shop&&inR(v.date))};
  return {reviews:E.reviews.filter(v=>v.shop===x.shop&&inR(v.date))};}
 const scopeCounts=(x,sc)=>({kind:x.kind,shop:x.shop,lines:(sc.tx||[]).length,orders:(sc.orders||[]).length,items:(sc.items||[]).length,listings:(sc.listings||[]).length,reviews:(sc.reviews||[]).length,deposits:(sc.deposits||[]).length});
 // Undo one import. Statement lines you typed yourself are never touched. dry:true only counts.
 function removeImport(s,i,{dry=false}={}){
  const E=s.etsy,x=E.imports[i];if(!x)return null;const sc=importScope(s,x),r=scopeCounts(x,sc);
  if(!dry){const gone=new Set(Object.values(sc).flat());s.transactions=s.transactions.filter(t=>!gone.has(t));
   for(const k of ['orders','items','listings','reviews','deposits'])if(E[k])E[k]=E[k].filter(v=>!gone.has(v));E.imports.splice(i,1);}
  return r;
 }
 // Move one import to another shop (a bank file can also go back to shared, to=''). A listings
 // file replaces the other shop's listings, as a listings import always does.
 function moveImport(s,i,to,{dry=false}={}){
  const E=s.etsy,x=E.imports[i];if(!x)return null;const name=id=>(s.shops.find(v=>v.id===id)||{}).name||'All shops (shared)';
  if(to===x.shop)return {error:`It is already in ${name(to)}.`};
  if(to?!s.shops.some(v=>v.id===to):x.kind!=='bank')return {error:'Choose the shop to move it to.'};
  const sc=importScope(s,x),r=scopeCounts(x,sc);r.replaced=x.kind==='listings'?E.listings.filter(l=>l.shop===to).length:0;
  const refs=new Set([...(sc.tx||[]).map(t=>t.ref).filter(v=>v&&v[0]==='o'),...(sc.orders||[]).map(o=>'o'+o.id)]);
  // only the same kind of record can clash: a statement and an order file for the same orders belong together
  if(refs.size&&(x.kind==='statement'?s.transactions.some(t=>t.shop===to&&t.src&&refs.has(t.ref)):E.orders.some(o=>o.shop===to&&refs.has('o'+o.id))))return {...r,error:`${name(to)} already has some of these orders. Delete one of the two imports instead.`};
  if(dry)return r;
  if(x.kind==='listings')E.listings=E.listings.filter(l=>l.shop!==to);
  for(const v of Object.values(sc).flat()){if(to)v.shop=to;else delete v.shop;}
  x.shop=to;return r;
 }
 // ---------- analytics (all follow the shop selection in settings.shop) ----------
 const scoped=(s,list)=>{const shop=B.scopeOf(s);return shop?list.filter(x=>x.shop===shop):list;};
 const inRange=(x,from,to)=>x.date>=from&&x.date<=to;
 const isEtsyGroup=g=>!!(B.GROUP_DEFS[g]&&B.GROUP_DEFS[g].etsy);
 // "all time" is clamped to the dates actually recorded, so month-by-month reads stay short
 const clamp=(s,from,to)=>{let a='9999',z='0000';for(const t of s.transactions){if(t.date<a)a=t.date;if(t.date>z)z=t.date;}return [from>a?from:a,to<z?to:z];};
 function txIn(s,from,to){const [a,z]=clamp(s,from,to),out=[];for(const m of B.monthsBetween(a,z))for(const t of B.transactions(s,m))if(inRange(t,a,z))out.push(t);return out;}
 // Take-home: revenue after buyer tax and refunds, minus every Etsy fee, ad and subscription
 function summary(s,from=ALL.from,to=ALL.to){
  const [a,z]=clamp(s,from,to),p=B.pl(s,a,z),by=new Map([...p.revenue.lines,...p.cogs.lines,...p.opex.groups.flatMap(g=>g.lines),...p.other.lines,...p.transfers.lines].map(l=>[l.id,l.amount])),amt=id=>by.get(id)||0;
  const sales=amt('etsy-sales'),buyerTax=-amt('buyer-tax'),refunds=-amt('etsy-refunds'),revenue=sales-buyerTax-refunds;
  const grp=id=>(p.opex.groups.find(g=>g.id===id)||{total:0}).total,fees=grp('etsy-fees'),marketing=grp('etsy-marketing'),etsyCosts=P.groups.filter(g=>g.etsy).reduce((n,g)=>n+grp(g.id),0);
  const ads=X.ads.reduce((n,id)=>n+amt(id),0),tx=txIn(s,from,to);
  const credits=-tx.filter(t=>t.amount<0&&feeGroup(s,t.category)).reduce((n,t)=>n+t.amount,0);
  const orders=new Set(tx.filter(t=>t.category==='etsy-sales'&&t.amount>0&&!t.est).map(t=>t.ref||t.id)).size+tx.filter(t=>t.est&&t.n).reduce((n,t)=>n+t.n,0),takeHome=revenue-etsyCosts,estimated=tx.some(t=>t.est);
  return {from,to,sales,buyerTax,refunds,revenue,fees,marketing,etsyCosts,ads,plus:amt('etsy-plus'),labels:amt('shipping-labels'),credits,deposits:tx.filter(t=>t.category==='etsy-deposit'&&t.src).reduce((n,t)=>n+t.amount,0),takeHome,orders,
   estimated,aov:orders?Math.round(revenue/orders):0,costShare:revenue>0?etsyCosts/revenue:null,adsShare:revenue>0?ads/revenue:null,profit:p.net,pl:p,lines:by};
 }
 const catGroup=(s,id)=>(s.categories.find(c=>c.id===id)||{}).group;
 const feeGroup=(s,id)=>isEtsyGroup(catGroup(s,id));
 // Each order rebuilt from its statement lines: what the buyer paid, less tax, fees and labels
 function orderBook(s,from,to){
  const by=new Map();
  for(const t of txIn(s,from,to)){if(!t.ref||t.ref[0]!=='o')continue;let o=by.get(t.ref);if(!o)by.set(t.ref,o={id:t.ref.slice(1),date:t.date,shop:t.shop||'',sale:0,tax:0,refund:0,fees:0,labels:0});
   if(t.category==='etsy-sales'){o.sale+=t.amount;if(t.date<o.date||!o.seen)o.date=t.date;o.seen=true;}
   else if(t.category==='buyer-tax')o.tax-=t.amount;else if(t.category==='etsy-refunds')o.refund-=t.amount;
   else if(t.category==='shipping-labels')o.labels+=t.amount;else if(feeGroup(s,t.category))o.fees+=t.amount;}
  const names=new Map();(s.etsy?.items||[]).forEach(i=>{if(!names.has(i.order))names.set(i.order,i.name);});
  return [...by.values()].map(o=>{const revenue=o.sale-o.tax-o.refund;return {...o,revenue,takeHome:revenue-o.fees,afterLabels:revenue-o.fees-o.labels,item:names.get(o.id)||''};}).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
 }
 function ordersIn(s,from,to){return scoped(s,s.etsy?.orders||[]).filter(o=>inRange(o,from,to));}
 function products(s,from=ALL.from,to=ALL.to){
  const orders=ordersIn(s,from,to),om=new Map(orders.map(o=>[o.id,o])),by=new Map();
  for(const i of scoped(s,s.etsy.items)){const o=om.get(i.order);if(!o)continue;const k=i.listing||'n:'+titleKey(i.name);
   let p=by.get(k);if(!p)by.set(k,p={key:k,listing:i.listing,shop:i.shop,name:i.name,units:0,list:0,net:0,orders:new Set(),last:''});
   p.units+=i.qty;p.list+=i.total;p.net+=i.total-(o.list?Math.round(o.discount*i.total/o.list):0);p.orders.add(i.order);if(o.date>=p.last){p.last=o.date;p.name=i.name;}}
  const list=[...by.values()].map(p=>({...p,orders:p.orders.size,tkey:titleKey(p.name)})).sort((a,b)=>b.list-a.list||b.units-a.units||a.name.localeCompare(b.name));
  const total=list.reduce((n,p)=>n+p.list,0),units=list.reduce((n,p)=>n+p.units,0),top=n=>total?list.slice(0,n).reduce((a,p)=>a+p.list,0)/total:0;
  const ls=scoped(s,s.etsy.listings).map(l=>{const k=titleKey(l.title),sold=list.filter(p=>p.shop===l.shop&&sameTitle(k,p.tkey));
   const flags=[l.photos<10&&`${l.photos} of 10 photos`,l.tags<13&&`${l.tags} of 13 tags`,l.title.length<40&&'Short title'].filter(Boolean);
   return {...l,units:sold.reduce((n,p)=>n+p.units,0),list:sold.reduce((n,p)=>n+p.list,0),matched:sold.length>0,flags};});
  const bands=[[0,1000,'Under 10'],[1000,2000,'10 – 20'],[2000,4000,'20 – 40'],[4000,8000,'40 – 80'],[8000,Infinity,'80 and over']].map(([a,b,label])=>{const inBand=ls.filter(l=>l.price>=a&&l.price<b);
   return {label,from:a,listings:inBand.length,selling:inBand.filter(l=>l.units).length,units:inBand.reduce((n,l)=>n+l.units,0),list:inBand.reduce((n,l)=>n+l.list,0)};}).filter(b=>b.listings);
  return {list,total,units,orders:orders.length,top,listings:ls,unsold:ls.filter(l=>!l.units),bands,health:{photos:ls.filter(l=>l.photos<10).length,tags:ls.filter(l=>l.tags<13).length,title:ls.filter(l=>l.title.length<40).length,ok:ls.filter(l=>!l.flags.length).length}};
 }
 function coupons(s,from=ALL.from,to=ALL.to){
  const orders=ordersIn(s,from,to),disc=orders.filter(o=>o.discount>0||o.shipDiscount>0),sum=(l,k)=>l.reduce((n,o)=>n+(o[k]||0),0),codes=new Map(),months=new Map();
  disc.forEach(o=>{const k=o.coupon||'';let c=codes.get(k);if(!c)codes.set(k,c={code:k,orders:0,discount:0,list:0});c.orders++;c.discount+=o.discount+o.shipDiscount;c.list+=o.list;});
  orders.forEach(o=>{const m=o.date.slice(0,7);let x=months.get(m);if(!x)months.set(m,x={month:m,orders:0,discounted:0,discount:0});x.orders++;if(o.discount>0||o.shipDiscount>0){x.discounted++;x.discount+=o.discount+o.shipDiscount;}});
  const list=sum(orders,'list'),discount=sum(orders,'discount');
  return {orders:orders.length,discounted:disc.length,share:orders.length?disc.length/orders.length:null,list,discount,shipDiscount:sum(orders,'shipDiscount'),paid:list-discount,
   codes:[...codes.values()].sort((a,b)=>b.discount-a.discount),months:[...months.values()].sort((a,b)=>a.month.localeCompare(b.month))};
 }
 function customers(s,from=ALL.from,to=ALL.to){
  const orders=ordersIn(s,from,to),countries=new Map(),buyers=new Map();
  orders.forEach(o=>{const k=o.country||'Not recorded';let c=countries.get(k);if(!c)countries.set(k,c={country:k,orders:0,paid:0});c.orders++;c.paid+=o.list-o.discount;if(o.buyer)buyers.set(o.buyer,(buyers.get(o.buyer)||0)+1);});
  const counts=[...buyers.values()],repeat=counts.filter(n=>n>1);
  return {orders:orders.length,buyers:buyers.size,repeat:repeat.length,repeatOrders:repeat.reduce((a,b)=>a+b,0),countries:[...countries.values()].sort((a,b)=>b.orders-a.orders||a.country.localeCompare(b.country)),
   spread:[['1 order',counts.filter(n=>n===1).length],['2 orders',counts.filter(n=>n===2).length],['3 orders',counts.filter(n=>n===3).length],['4 or more',counts.filter(n=>n>=4).length]]};
 }
 function reviewStats(s,from=ALL.from,to=ALL.to){
  const list=scoped(s,s.etsy.reviews).filter(r=>inRange(r,from,to)),dist=[1,2,3,4,5].map(n=>list.filter(r=>r.stars===n).length),sum=list.reduce((n,r)=>n+r.stars,0);
  const group=len=>{const m=new Map();list.forEach(r=>{const k=r.date.slice(0,len);let x=m.get(k);if(!x)m.set(k,x={key:k,count:0,sum:0});x.count++;x.sum+=r.stars;});return [...m.values()].sort((a,b)=>a.key.localeCompare(b.key)).map(x=>({...x,avg:x.sum/x.count}));};
  return {count:list.length,avg:list.length?sum/list.length:null,dist,months:group(7),years:group(4),low:list.filter(r=>r.stars<=3).sort((a,b)=>b.date.localeCompare(a.date)),recent:[...list].sort((a,b)=>b.date.localeCompare(a.date))};
 }
 // Seasonality from sold orders (usually the longest history); from the statement when there are none
 function seasonality(s){
  const orders=scoped(s,s.etsy.orders),years=new Map();
  const cell=y=>{if(!years.has(y))years.set(y,Array.from({length:12},()=>({paid:0,orders:0})));return years.get(y);};
  let source='orders';
  if(orders.length)orders.forEach(o=>{const c=cell(o.date.slice(0,4))[+o.date.slice(5,7)-1];c.paid+=o.list-o.discount;c.orders++;});
  else{source='statement';const tx=txIn(s,ALL.from,ALL.to);tx.forEach(t=>{if(!X.revenue.includes(t.category))return;const c=cell(t.date.slice(0,4))[+t.date.slice(5,7)-1];c.paid+=t.amount;if(t.category==='etsy-sales'&&t.amount>0)c.orders++;});}
  return {source,years:[...years.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([year,months])=>({year,months,paid:months.reduce((n,m)=>n+m.paid,0),orders:months.reduce((n,m)=>n+m.orders,0)}))};
 }
 // Sales per month from sold orders (item price − discounts + shipping, before tax), and whether
 // that month has any payment account statement lines yet: fees and take-home need the statement
 function orderMonths(s,y){
  const months=Array.from({length:12},(_,i)=>({month:`${y}-${String(i+1).padStart(2,'0')}`,orders:0,sales:0,statement:false}));
  for(const o of scoped(s,s.etsy?.orders||[]))if(o.date.slice(0,4)===y){const m=months[+o.date.slice(5,7)-1];m.orders++;m.sales+=o.list-o.discount+(o.shipping||0);}
  for(const m of months){const tx=B.transactions(s,m.month);m.statement=tx.some(t=>!t.est&&(t.ref||X.revenue.includes(t.category)));m.estimated=tx.some(t=>t.est);}
  return months;
 }
 const forShop=(s,id)=>({...s,settings:{...s.settings,shop:id}});
 function compare(s,from=ALL.from,to=ALL.to){
  return s.shops.map(shop=>{const v=forShop(s,shop.id),m=summary(v,from,to),r=reviewStats(v,from,to);
   return {...shop,...m,soldOrders:ordersIn(v,from,to).length,listings:v.etsy.listings.filter(l=>l.shop===shop.id).length,reviews:r.count,rating:r.avg};});
 }
 return {KINDS,ALL,hash,titleKey,sameTitle,kindOf,money,classify,read,merge,summary,orderBook,products,coupons,customers,reviewStats,seasonality,orderMonths,removeImport,moveImport,importScope,syncEstimates,estimatedMonths,compare,forShop,scoped};
})(NICHE,Budget,CSV);
if(typeof module!=='undefined')module.exports.EtsyData=EtsyData;

/* Etsy edition, part 2: the screens. Shop switcher, import, dashboard, fees, products, coupons,
   customers, reviews, seasonality and the shop comparison. */
const Etsy=(()=>{
 const D=EtsyData,X=P.etsy,today=()=>Budget.today();
 const pc=(n,d=1)=>n===null||n===undefined||!Number.isFinite(n)?'—':(n*100).toFixed(d).replace(/\.0$/,'')+'%';
 const num=n=>Number(n||0).toLocaleString();
 const stat=(label,text,note,cls='')=>`<div class="kpi"><div class="label">${label}</div><b class="${cls}">${text}</b><small>${note}</small></div>`;
 const change=(now,before,money=true)=>{if(!before)return now?'New this month':'Nothing last month';const d=(now-before)/Math.abs(before);return `${d>=0?'+':'−'}${Math.abs(Math.round(d*100))}% vs last month${money?' ('+fmt(before)+')':' ('+num(before)+')'}`;};
 const shopName=id=>(state.shops.find(x=>x.id===id)||{}).name||'';
 const scopeName=()=>state.settings.shop?shopName(state.settings.shop):state.shops.length>1?'All shops':state.shops[0]?.name||'Your shop';
 const hasData=()=>state.transactions.some(t=>t.ref)||state.etsy.orders.length||state.etsy.listings.length||state.etsy.reviews.length;
 // one period control for the analysis screens: the picked month, its year, or everything
 let span='all',ordersAll=false,productsAll=false;
 function range(kind=span){const m=selected,y=m.slice(0,4);
  if(kind==='month')return {from:m+'-01',to:Budget.endOf(m),label:monthName(m)};
  if(kind==='year')return {from:y+'-01-01',to:y+'-12-31',label:'Full year '+y};
  return {...D.ALL,label:'All time'};}
 const spanControl=()=>`<div class="pl-controls no-print"><div class="segment" aria-label="Period">${[['month','Month'],['year','Year'],['all','All time']].map(([k,l])=>`<button data-action="etsy-span" data-span="${k}" aria-pressed="${span===k}">${l}</button>`).join('')}</div><span class="small muted">${span==='all'?'Everything imported':'Follows the month picker'}</span></div>`;
 const scopeNote=()=>`<span class="pill">${esc(scopeName())}</span>`;
 const noData=(what,action='go-etsy-import',label='Import Etsy files')=>empty(`No ${what} yet`,`Import your Etsy ${what} to see this${state.settings.shop?' for '+esc(shopName(state.settings.shop)):''}.`,action,label);
 const colors=['var(--cat-1)','var(--cat-2)','var(--cat-3)','var(--cat-4)','var(--cat-5)','var(--cat-6)'];

 // ---------- chart kit ----------
 // Pies and donuts answer "what share?"; gauges show one share against the whole; sparklines,
 // lines and columns show change; the scatter shows two measures at once; the heat table shows
 // a month-by-year grid. Hues come in the core's fixed order; a sixth slice is always grey "Other".
 const tipOf=(t,rows)=>esc(JSON.stringify({t,r:rows}));
 const fold=(rows,other='Other')=>{const r=rows.filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]),top=r.slice(0,5).map((x,i)=>[x[0],x[1],colors[i],x[3]]);
  const rest=r.slice(5).reduce((n,x)=>n+x[1],0);if(rest)top.push([other,rest,colors[5],`${r.length-5} more`]);return top;};
 function pie(parts,{label='',donut=true,center='',sub='',f=fmt}={}){
  parts=parts.filter(p=>p[1]>0);const total=parts.reduce((n,p)=>n+p[1],0);if(!total)return '';
  const R=80,r0=donut?52:0,c=90,pt=(a,r)=>[(c+r*Math.cos(a)).toFixed(2),(c+r*Math.sin(a)).toFixed(2)];let a=-Math.PI/2;
  const segs=parts.map(([name,n,color,note],i)=>{const sw=n/total*Math.PI*2,a1=a,a2=a+sw,share=n/total;a=a2;let d;
   if(sw>=Math.PI*2-1e-6)d=`M${c} ${c-R}A${R} ${R} 0 1 1 ${c-0.01} ${c-R}Z`+(donut?`M${c} ${c-r0}A${r0} ${r0} 0 1 0 ${c+0.01} ${c-r0}Z`:'');
   else{const lg=sw>Math.PI?1:0,[x1,y1]=pt(a1,R),[x2,y2]=pt(a2,R);
    if(donut){const [x3,y3]=pt(a2,r0),[x4,y4]=pt(a1,r0);d=`M${x1} ${y1}A${R} ${R} 0 ${lg} 1 ${x2} ${y2}L${x3} ${y3}A${r0} ${r0} 0 ${lg} 0 ${x4} ${y4}Z`;}
    else d=`M${c} ${c}L${x1} ${y1}A${R} ${R} 0 ${lg} 1 ${x2} ${y2}Z`;}
   return `<path class="kit-seg" d="${d}" fill="${color}" fill-rule="evenodd" style="--i:${i}" tabindex="0" aria-label="${esc(name)}: ${pc(share)}" data-tip="${tipOf(name,[{name:label,value:f(n),color},{name:'Share',value:pc(share)},...(note?[{name:note,value:''}]:[])])}"/>`;}).join('');
  const key=parts.map(([name,n,color,note])=>`<div class="kit-key-row" tabindex="0" data-tip="${tipOf(name,[{name:label,value:f(n),color},{name:'Share',value:pc(n/total)}])}"><i class="dot" style="background:${color}"></i><span>${esc(name)}${note?`<small>${esc(note)}</small>`:''}</span><b class="number">${pc(n/total,n/total<0.1?1:0)}</b><em class="number">${f(n)}</em></div>`).join('');
  return `<div class="kit-pie"><svg viewBox="0 0 180 180" role="img" aria-label="${esc(label)}">${segs}${donut&&center?`<text x="90" y="92" class="kit-mid">${esc(center)}</text><text x="90" y="110" class="kit-mid-sub">${esc(sub)}</text>`:''}</svg><div class="kit-key">${key}</div></div>`;
 }
 function gauge(v,title,note){const p=Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
  return `<div class="kit-gauge"><svg viewBox="0 0 180 104" role="img" aria-label="${esc(title)} ${pc(v)}"><path d="M20 92A70 70 0 0 1 160 92" class="kit-gauge-track" pathLength="100"/><path d="M20 92A70 70 0 0 1 160 92" class="kit-gauge-val" pathLength="100" style="stroke-dasharray:${(p*100).toFixed(1)} 100"/><text x="90" y="86" class="kit-gauge-num">${Number.isFinite(v)?pc(v,v<0.1?1:0):'—'}</text></svg><b>${title}</b><small>${note}</small></div>`;}
 function spark(vals,color='var(--accent)'){const pts=vals.map((n,i)=>Number.isFinite(n)?[i,n]:null).filter(Boolean);if(pts.length<2)return '';
  const ys=pts.map(p=>p[1]),mn=Math.min(...ys),mx=Math.max(...ys),sp=mx-mn||1,W=120,H=30,X=i=>2+i*(W-6)/Math.max(1,vals.length-1),Y=n=>H-4-(n-mn)/sp*(H-8),last=pts.at(-1);
  return `<svg class="kit-spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline pathLength="100" points="${pts.map(([i,n])=>X(i).toFixed(1)+','+Y(n).toFixed(1)).join(' ')}" style="stroke:${color}"/><circle cx="${X(last[0]).toFixed(1)}" cy="${Y(last[1]).toFixed(1)}" r="3" style="fill:${color}"/></svg>`;}
 const tile=(label,value,note,sp='',cls='')=>`<div class="kpi kit-tile"><div class="label">${label}</div><b class="${cls}">${value}</b>${sp}<small>${note}</small></div>`;
 const money=n=>`<span data-count="${n}">${fmt(n)}</span>`;
 // a line chart on its own scale (ratings, shares): the money chart's axis would print "$4.85"
 function line(series,labels,{min=0,max,f=String,title=''}={}){
  const all=series.flatMap(s=>s.values.filter(Number.isFinite));if(!all.length)return '';
  const hi=max??Math.max(...all),lo=Math.min(min,...all),W=700,H=220,pl=44,pr=16,pt=16,pb=28,X=i=>pl+i*(W-pl-pr)/Math.max(1,labels.length-1),Y=n=>pt+(hi-n)/((hi-lo)||1)*(H-pt-pb);
  const ticks=Array.from({length:5},(_,i)=>lo+(hi-lo)*i/4);
  return `<div class="kit-line">${series.length>1?`<div class="legend">${series.map(s=>`<span><i class="dot" style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`:''}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${ticks.map(n=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(n).toFixed(1)}" y2="${Y(n).toFixed(1)}" class="chart-grid"/><text x="${pl-8}" y="${(Y(n)+4).toFixed(1)}" class="kit-axis" text-anchor="end">${esc(f(n))}</text>`).join('')}`+
   labels.map((l,i)=>(labels.length<=13||i%Math.ceil(labels.length/12)===0)?`<text x="${X(i).toFixed(1)}" y="${H-8}" class="kit-axis" text-anchor="middle">${esc(l)}</text>`:'').join('')+
   series.map((s,si)=>{const pts=s.values.map((n,i)=>Number.isFinite(n)?[X(i),Y(n),i,n]:null).filter(Boolean);
    return `<polyline class="kit-path" pathLength="100" points="${pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')}" style="stroke:${s.color};--i:${si}"/>`+pts.map(p=>`<circle class="kit-dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" style="fill:${s.color};--i:${p[2]}" tabindex="0" data-tip="${tipOf(labels[p[2]],[{name:s.name,value:f(p[3]),color:s.color}])}"/>`).join('');}).join('')+`</svg></div>`;
 }
 function scatter(points,{xf=fmt,yf=num,xName='',yName='',title=''}={}){
  if(!points.length)return '';const W=700,H=280,pl=48,pr=20,pt=16,pb=38,xs=points.map(p=>p.x),ys=points.map(p=>p.y),xmax=Math.max(...xs,1)*1.05,ymax=Math.max(...ys,1)*1.1;
  const X=v=>pl+v/xmax*(W-pl-pr),Y=v=>pt+(1-v/ymax)*(H-pt-pb),t=k=>Array.from({length:5},(_,i)=>k*i/4);
  return `<div class="kit-scatter"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${t(ymax).map(v=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="chart-grid"/><text x="${pl-8}" y="${(Y(v)+4).toFixed(1)}" class="kit-axis" text-anchor="end">${esc(yf(Math.round(v)))}</text>`).join('')}`+
   t(xmax).map(v=>`<text x="${X(v).toFixed(1)}" y="${H-18}" class="kit-axis" text-anchor="middle">${esc(xf(Math.round(v)))}</text>`).join('')+
   `<text x="${(pl+W-pr)/2}" y="${H-2}" class="kit-axis-title" text-anchor="middle">${esc(xName)}</text><text x="12" y="${pt+4}" class="kit-axis-title">${esc(yName)}</text>`+
   points.map((p,i)=>`<circle class="kit-dot${p.y?'':' kit-dot-zero'}" cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${p.y?6:4.5}" style="--i:${i%40}" tabindex="0" data-tip="${tipOf(p.label,[{name:xName,value:xf(p.x),color:p.y?'var(--accent)':'var(--cat-6)'},{name:yName,value:yf(p.y)},...(p.note?[{name:p.note,value:''}]:[])])}"/>`).join('')+`</svg></div>`;
 }
 // stacked columns: parts of a whole per month (one colour per shop), 2px gaps between segments
 function stack(series,labels,{f=fmt,title='',overlay=null}={}){
  const tot=labels.map((_,i)=>series.reduce((n,s)=>n+(Number.isFinite(s.values[i])?Math.max(0,s.values[i]):0),0)),max=Math.max(1,...tot,...(overlay?overlay.values.filter(Number.isFinite):[]));if(!tot.some(Boolean))return '';
  const W=700,H=260,pl=52,pr=12,pt=22,pb=28,band=(W-pl-pr)/labels.length,bw=Math.min(38,band*.62),Y=v=>pt+(1-v/max)*(H-pt-pb),ticks=Array.from({length:5},(_,i)=>max*i/4);
  const cols=labels.map((l,i)=>{let base=H-pb;const x=pl+band*i+(band-bw)/2;
   const segs=series.map((s,si)=>{const v=Math.max(0,s.values[i]||0);if(!v)return '';const h=(H-pt-pb)*v/max,y=base-h;base=y;return `<rect class="kit-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" style="fill:${s.color};--i:${i}"/>`;}).join('');
   const tip=tipOf(l,[...series.filter(s=>s.values[i]).map(s=>({name:s.name,value:f(s.values[i]),color:s.color})),{name:'Total',value:f(tot[i])},...(overlay&&Number.isFinite(overlay.values[i])?[{name:overlay.name,value:f(overlay.values[i]),color:overlay.color}]:[])]);
   return `<g class="kit-col" tabindex="0" data-tip="${tip}"><rect x="${(pl+band*i).toFixed(1)}" y="${pt}" width="${band.toFixed(1)}" height="${H-pt-pb}" fill="transparent"/>${segs}${tot[i]?`<text x="${(x+bw/2).toFixed(1)}" y="${(Y(tot[i])-6).toFixed(1)}" class="kit-axis" text-anchor="middle">${esc(compact(tot[i]))}</text>`:''}</g><text x="${(x+bw/2).toFixed(1)}" y="${H-8}" class="kit-axis" text-anchor="middle">${esc(l)}</text>`;}).join('');
  const ov=overlay?(()=>{const pts=overlay.values.map((v,i)=>Number.isFinite(v)?[pl+band*i+band/2,Y(Math.max(0,v)),i,v]:null).filter(Boolean);return pts.length?`<polyline class="kit-path kit-over" pathLength="100" points="${pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')}" style="stroke:${overlay.color};--i:2"/>`+pts.map(p=>`<circle class="kit-dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" style="fill:${overlay.color};--i:${p[2]};pointer-events:none"/>`).join(''):'';})():'';
  const keys=[...series,...(overlay?[{...overlay,line:true}]:[])];
  return `<div class="kit-line">${keys.length>1?`<div class="legend">${keys.map(s=>`<span><i class="${s.line?'kit-key-line':'dot'}" style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`:''}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${ticks.map(v=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="chart-grid"/><text x="${pl-8}" y="${(Y(v)+4).toFixed(1)}" class="kit-axis" text-anchor="end">${esc(compact(v))}</text>`).join('')}${cols}${ov}</svg></div>`;
 }
 function shopStack(months,ok,overlay){
  if(state.settings.shop||state.shops.length<2)return '';
  const per=state.shops.map(sh=>({sh,vals:months.map((mo,i)=>ok(i)?D.summary(D.forShop(state,sh.id),mo+'-01',Budget.endOf(mo)).revenue:null)})).filter(x=>x.vals.some(v=>v>0));
  if(per.length<2)return '';
  const top=per.slice(0,5),rest=per.slice(5),series=top.map(x=>({name:x.sh.name,values:x.vals,color:shopColor(x.sh.id)}));
  if(rest.length)series.push({name:`${rest.length} other shop${rest.length===1?'':'s'}`,values:months.map((_,i)=>rest.reduce((n,x)=>n+(x.vals[i]||0),0)),color:colors[5]});
  return stack(series,months.map(shortMonth),{title:`${L.income} by shop and month`,overlay});
 }
 // a shop keeps its colour everywhere: its place in your shop list, never its rank
 const shopColor=id=>{const i=state.shops.findIndex(s=>s.id===id);return i>=0&&i<5?colors[i]:colors[5];};
 const heat=(v,max)=>{const t=max>0?Math.max(0,v)/max:0;return `background:color-mix(in oklab,var(--accent) ${Math.round(6+t*70)}%,var(--card));color:${t>0.5?'var(--accent-ink)':'var(--ink)'}`;};

 // ---------- the pulse: a few things worth knowing, one at a time ----------
 function insights(m){
  const out=[],mr=[m+'-01',Budget.endOf(m)],S=D.summary(state,...mr),prev=Budget.shift(m,-1),L0=D.summary(state,prev+'-01',Budget.endOf(prev));
  const pm=D.products(state,...mr),pa=pm.list.length?pm:D.products(state);
  if(pa.list[0])out.push(`<b>Best seller ${pm.list.length?'this month':'overall'}:</b>&nbsp;${esc(pa.list[0].name.slice(0,70))} · ${num(pa.list[0].units)} sold`);
  if(S.revenue>0)out.push(`<b>You kept ${pc(S.takeHome/S.revenue,0)}</b> of every sale in ${monthName(m)} after Etsy’s fees and ads${L0.revenue>0?` (last month ${pc(L0.takeHome/L0.revenue,0)})`:''}`);
  if(S.revenue>0&&L0.revenue>0&&S.adsShare!==null){const d=S.adsShare-L0.adsShare;out.push(`<b>Ads took ${pc(S.adsShare)}</b> of revenue, ${d>0?'up':'down'} ${pc(Math.abs(d))} points on last month`);}
  const Cu=D.customers(state,m.slice(0,4)+'-01-01',m.slice(0,4)+'-12-31');if(Cu.buyers)out.push(`<b>${pc(Cu.repeat/Cu.buyers,0)} of buyers came back</b> for another order in ${m.slice(0,4)}`);
  const R=D.reviewStats(state,Budget.plusDays(today(),-90),today()),Ra=D.reviewStats(state);if(R.count)out.push(`<b>${R.avg.toFixed(2)}★ over the last 90 days</b> from ${num(R.count)} review${R.count===1?'':'s'} · ${Ra.avg.toFixed(2)}★ all time`);
  const Z=D.seasonality(state);if(Z.years.length){const avg=Array.from({length:12},(_,i)=>Z.years.reduce((n,y)=>n+y.months[i].paid,0)),best=avg.indexOf(Math.max(...avg));out.push(`<b>${monthName(`2026-${String(best+1).padStart(2,'0')}`).split(' ')[0]} is your busiest month</b> across ${Z.years.length} year${Z.years.length===1?'':'s'} of orders`);}
  if(pa.health&&pa.listings.length&&pa.health.photos)out.push(`<b>${num(pa.health.photos)} listing${pa.health.photos===1?' has':'s have'} fewer than 10 photos</b> · adding photos is a quick win`);
  const miss=D.orderMonths(state,m.slice(0,4)).filter(x=>x.orders&&!x.statement).length;if(miss)out.push(`<b>${miss} month${miss===1?'':'s'} still need${miss===1?'s':''} a statement</b> to show fees and take-home · <button class="link" data-go="etsy-import">Import</button>`);
  return out;
 }
 function pulse(m){const tips=insights(m);if(!tips.length)return '';
  return `<section class="card kit-pulse no-print" id="etsy-pulse"><span class="kit-live" aria-hidden="true"></span><div class="kit-pulse-track" aria-live="polite">${tips.map((t,i)=>`<p class="${i?'':'on'}"><span>${t}</span></p>`).join('')}</div><div class="kit-pulse-nav">${tips.map((_,i)=>`<button data-action="etsy-pulse" data-i="${i}" aria-label="Show insight ${i+1} of ${tips.length}" aria-pressed="${!i}"></button>`).join('')}</div></section>`;}
 function showPulse(i){const box=document.getElementById('etsy-pulse');if(!box)return;const ps=[...box.querySelectorAll('.kit-pulse-track p')],bs=[...box.querySelectorAll('.kit-pulse-nav button')];if(!ps.length)return;
  const n=((i%ps.length)+ps.length)%ps.length;ps.forEach((p,k)=>p.classList.toggle('on',k===n));bs.forEach((b,k)=>b.setAttribute('aria-pressed',String(k===n)));box.dataset.at=n;}
 setInterval(()=>{const box=document.getElementById('etsy-pulse');if(!box||box.matches(':hover,:focus-within')||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;showPulse((+box.dataset.at||0)+1);},6000);

 // ---------- dashboard ----------
 function dashboardView(){
  const m=selected,prev=Budget.shift(m,-1),S=D.summary(state,m+'-01',Budget.endOf(m)),L0=D.summary(state,prev+'-01',Budget.endOf(prev));
  const y=m.slice(0,4),cutoff=today().slice(0,7),months=Array.from({length:12},(_,i)=>`${y}-${String(i+1).padStart(2,'0')}`),series=months.map(x=>x<=cutoff?D.summary(state,x+'-01',Budget.endOf(x)):null);
  const orders=D.orderBook(state,m+'-01',Budget.endOf(m));
  const fresh=['statement','orders','listings','reviews'].map(k=>{const last=D.scoped(state,state.etsy.imports).filter(x=>x.kind===k).map(x=>x.at).sort().at(-1);return `<span class="pill">${D.KINDS[k]}: ${last?dateName(last):'not yet'}</span>`;}).join(' ');
  const multi=!state.settings.shop&&state.shops.length>1?D.compare(state,m+'-01',Budget.endOf(m)):null;
  // a month with sold orders but no statement shows what the orders say; fees and take-home wait for the statement
  const omBy={},omOf=x=>(omBy[x.slice(0,4)]??=D.orderMonths(state,x.slice(0,4)))[+x.slice(5,7)-1];
  const om=months.map(omOf),cur=omOf(m),pom=omOf(prev),noStmt=cur.orders>0&&!cur.statement;
  // the six months up to the picked one, for the sparklines
  const six=Array.from({length:6},(_,i)=>Budget.shift(m,i-5)),sums=six.map(x=>D.summary(state,x+'-01',Budget.endOf(x))),o6=six.map(omOf);
  const sl=(f,ok=(x,i)=>o6[i].statement||o6[i].estimated)=>spark(sums.map((x,i)=>ok(x,i)?f(x):null));
  const needs='Needs this month’s payment account statement';
  const kpis=noStmt?tile('Take-home',money(S.takeHome),'Estimated: Etsy fees at standard rates, before Etsy Ads',sl(x=>x.takeHome),S.takeHome<0?'warn':'')+tile(L.income,money(S.revenue),`From ${num(cur.orders)} sold orders · ${change(S.revenue,L0.revenue)}`,sl(x=>x.revenue))+
    tile('Etsy fees',pc(S.costShare),`Estimated ${fmt(S.etsyCosts)} · transaction, processing and listing fees`,sl(x=>x.costShare,(x,i)=>(o6[i].statement||o6[i].estimated)&&x.costShare!==null))+tile('Ads','—','Not in the sold orders file · import the statement')+
    tile('Orders',num(cur.orders),change(cur.orders,pom.orders,false),spark(o6.map(x=>x.orders),'var(--accent)'))+tile('Average order',money(Math.round(cur.sales/cur.orders)),'Items after discounts, plus shipping, before tax',sl(x=>x.aov,(x,i)=>(o6[i].statement||o6[i].estimated)&&x.orders))
   :tile('Take-home',money(S.takeHome),change(S.takeHome,L0.takeHome),sl(x=>x.takeHome),S.takeHome<0?'warn':'')+tile(L.income,money(S.revenue),`${fmt(S.sales)} paid − ${fmt(S.buyerTax)} buyer tax${S.refunds?' − '+fmt(S.refunds)+' refunds':''}`,sl(x=>x.revenue))+
    tile('Etsy costs',pc(S.costShare),`${fmt(S.etsyCosts)} of ${L.income.toLowerCase()} · last month ${pc(L0.costShare)}`,sl(x=>x.costShare,(x,i)=>(o6[i].statement||o6[i].estimated)&&x.costShare!==null))+tile('Ads',pc(S.adsShare),`${fmt(S.ads)} Etsy &amp; Offsite Ads · last month ${pc(L0.adsShare)}`,sl(x=>x.adsShare,(x,i)=>o6[i].statement&&x.adsShare!==null))+
    tile('Orders',num(S.orders),change(S.orders,L0.orders,false),sl(x=>x.orders))+tile('Average order',money(S.aov),L0.aov?'Last month '+fmt(L0.aov):'After buyer tax',sl(x=>x.aov,(x,i)=>(o6[i].statement||o6[i].estimated)&&x.orders));
  const kept=Math.max(0,S.takeHome-S.labels),split=[['Take-home after labels',kept,'var(--cat-5)'],['Etsy fees',S.fees,'var(--cat-2)'],['Ads & Etsy Plus',S.marketing,'var(--cat-4)'],['Shipping labels',S.labels,'var(--cat-3)']];
  const byShop=multi&&multi.filter(x=>x.revenue>0).length>1?pie(fold(multi.map(x=>[x.name,x.revenue])),{label:L.income,donut:false}):'';
  const sold=noStmt?soldOrders(m):[];
  const has=i=>series[i]&&(om[i].statement||om[i].estimated),byShopMonths=shopStack(months,i=>has(i),{name:'Take-home',values:series.map((x,i)=>has(i)?x.takeHome:null),color:'var(--ink)'});
  return pagehead(monthName(m),`${esc(scopeName())} at a glance`,'Take-home is revenue after sales tax buyers paid, refunds and every Etsy fee, ad and subscription.',button('Import Etsy files','go-etsy-import','primary')+button('Print summary','print','quiet'))+
   (!hasData()?`<section class="card"><div class="cardhead"><div><h2>Three steps to your first numbers</h2><p>Everything stays in this browser.</p></div></div><div class="grid3">${[['1','Add your shop','Name each Etsy shop you run. You can add more later.','etsy-add-shop','Add a shop'],['2','Download from Etsy','Your payment account statement and sold order items, plus listings and reviews if you like.','go-etsy-import','Where to find them'],['3','Drop them in','Choose the shop and drop the files together. Duplicates are skipped.','go-etsy-import','Import files']].map(([n,t,b,a,l])=>`<div class="etsy-step"><span class="pill">${n}</span><h3>${t}</h3><p class="small muted">${b}</p>${button(l,a,'small')}</div>`).join('')}</div></section>`:pulse(m))+
   (noStmt?`<div class="notice"><span><b>${monthName(m)} is estimated from your sold orders.</b> Revenue is exact. Etsy’s transaction, processing and listing fees are worked out at the standard rates; Etsy Ads, Etsy Plus and credits appear once you import the month’s payment account statement, which replaces the estimate.</span>${button('Import statement','go-etsy-import','small')}</div>`:'')+
   `<div class="kpis etsy-kpis">${kpis}</div>`+
   (S.revenue>0?`<div class="grid2 equal"><section class="card"><div class="cardhead"><div><h2>Where each sale went</h2><p>${monthName(m)} · share of ${fmt(S.revenue)} ${L.income.toLowerCase()}</p></div><button class="link" data-go="fees">Fees &amp; ads</button></div>${pie(split,{label:L.income,center:pc(kept/S.revenue,0),sub:'KEPT'})}</section>`+
    (byShop?`<section class="card"><div class="cardhead"><div><h2>${L.income} by shop</h2><p>${monthName(m)}</p></div><button class="link" data-go="shops">Compare shops</button></div>${byShop}</section>`:`<section class="card">${gauge(S.costShare,'Etsy’s cut',`${fmt(S.etsyCosts)} in fees, ads and Etsy Plus`)}<div class="kit-gauge-pair">${gauge(S.adsShare,'Ads',`${fmt(S.ads)} Etsy &amp; Offsite Ads`)}${gauge(S.revenue>0?S.takeHome/S.revenue:null,'Kept',`${fmt(S.takeHome)} take-home`)}</div></section>`)+`</div>`:'')+
   Biz.dashboard()+
   (multi?`<section class="card table-card"><div class="cardhead"><div><h2>Shop by shop</h2><p>${monthName(m)}</p></div><button class="link" data-go="shops">Compare shops</button></div><div class="table-wrap"><table><thead><tr><th>Shop</th><th class="num">${L.income}</th><th class="num">Etsy costs</th><th class="num">Take-home</th><th class="num">Orders</th></tr></thead><tbody>${multi.map(x=>`<tr><td><button class="link" data-action="etsy-scope" data-shop="${x.id}">${esc(x.name)}</button></td><td class="num">${fmt(x.revenue)}</td><td class="num">${fmt(x.etsyCosts)} <span class="dim">${pc(x.costShare,0)}</span></td><td class="num"><b>${Biz.acct(x.takeHome)}</b></td><td class="num">${num(x.orders)}</td></tr>`).join('')}</tbody></table></div></section>`:'')+
   (series.some(x=>x&&(x.revenue||x.takeHome))?`<section class="card"><div class="cardhead"><div><h2>${y} month by month</h2><p>${L.income}${byShopMonths?' by shop':''} and take-home${om.some(x=>x.estimated)?' · '+om.filter(x=>x.estimated).map(x=>shortMonth(x.month)).join(', ')+' estimated from sold orders':''} · future months are blank</p></div><button class="link" data-go="annual">Year &amp; cash flow</button></div>${byShopMonths?byShopMonths:areaChart([{name:L.income,values:series.map((x,i)=>x&&(om[i].statement||om[i].estimated)?x.revenue:null),color:'var(--ch-in)'},{name:'Take-home',values:series.map((x,i)=>x&&(om[i].statement||om[i].estimated)?x.takeHome:null),color:'var(--accent)'}],months.map(shortMonth),`${L.income} and take-home by month`)}</section>`:'')+
   `<section class="card table-card"><div class="cardhead"><div><h2>Latest orders</h2><p>${monthName(m)} · ${noStmt?'from your sold order items':'rebuilt from the payment account statement'}</p></div><button class="link" data-go="fees">All orders</button></div>${noStmt?soldTable(sold.slice(0,8)):orders.length?orderTable(orders.slice(0,8)):empty('No orders this month','Import this month’s payment account statement.','go-etsy-import','Import Etsy files')}</section>`+
   `<div class="notice no-print"><span><b>Last imports</b><br>${fresh}</span>${button('Import Etsy files','go-etsy-import','small')}</div>`;
 }
 function soldOrders(m){const names=new Map();for(const i of state.etsy.items){const n=names.get(i.order);if(n)n.push(i.name);else names.set(i.order,[i.name]);}
  return D.scoped(state,state.etsy.orders).filter(o=>o.date.startsWith(m)).map(o=>({...o,names:names.get(o.id)||[]})).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));}
 function soldTable(list){const shopCol=!state.settings.shop&&state.shops.length>1;
  return `<div class="table-wrap"><table class="etsy-orders"><thead><tr><th>Order</th><th>Date</th>${shopCol?'<th>Shop</th>':''}<th class="num">Units</th><th class="num">List price</th><th class="num">Discount</th><th class="num">Shipping</th><th class="num">Paid before tax</th></tr></thead><tbody>${list.map(o=>`<tr><td><b>#${esc(o.id)}</b><small class="dim etsy-item">${esc(o.names[0]||'')}${o.names.length>1?` + ${o.names.length-1} more`:''}</small></td><td>${dateName(o.date)}</td>${shopCol?`<td>${esc(shopName(o.shop))}</td>`:''}<td class="num">${num(o.units)}</td><td class="num">${fmt(o.list)}</td><td class="num">${o.discount?'−'+fmt(o.discount):'—'}</td><td class="num">${o.shipping?fmt(o.shipping):'—'}</td><td class="num"><b>${fmt(o.list-o.discount+(o.shipping||0))}</b></td></tr>`).join('')}</tbody></table></div>`;}
 function orderTable(list){
  return `<div class="table-wrap"><table class="etsy-orders"><thead><tr><th>Order</th><th>Date</th>${state.settings.shop||state.shops.length<2?'':'<th>Shop</th>'}<th class="num">Buyer paid</th><th class="num">Buyer tax</th><th class="num">Etsy fees</th><th class="num">Take-home</th><th class="num">Kept</th></tr></thead><tbody>${list.map(o=>`<tr><td><b>#${esc(o.id)}</b>${o.item?`<small class="dim etsy-item">${esc(o.item)}</small>`:''}</td><td>${dateName(o.date)}</td>${state.settings.shop||state.shops.length<2?'':`<td>${esc(shopName(o.shop))}</td>`}<td class="num">${fmt(o.sale-o.refund)}</td><td class="num">${o.tax?'−'+fmt(o.tax):'—'}</td><td class="num">−${fmt(o.fees)}</td><td class="num"><b>${Biz.acct(o.takeHome)}</b></td><td class="num">${pc(o.revenue>0?o.takeHome/o.revenue:null,0)}</td></tr>`).join('')}</tbody></table></div>`;
 }
 // ---------- fees & ads ----------
 function feesView(){
  const r=range(),S=D.summary(state,r.from,r.to),y=selected.slice(0,4),cutoff=today().slice(0,7),months=Array.from({length:12},(_,i)=>`${y}-${String(i+1).padStart(2,'0')}`);
  const ms=months.map(m=>m<=cutoff?D.summary(state,m+'-01',Budget.endOf(m)):null);
  const lines=[...S.pl.opex.groups.filter(g=>Budget.GROUP_DEFS[g.id]?.etsy).flatMap(g=>g.lines)].filter(l=>l.amount>0).sort((a,b)=>b.amount-a.amount);
  const orders=span==='month'?D.orderBook(state,r.from,r.to):[];
  return pagehead('Fees & ads',`What Etsy kept · ${esc(r.label)}`,'Fee credits, Etsy Plus credits and Share &amp; Save refunds are taken off the fee they belong to.',button('Print','print','quiet'))+spanControl()+
   `<div class="kpis">${kpi('Etsy costs',S.etsyCosts,`${pc(S.costShare)} of ${fmt(S.revenue)} ${L.income.toLowerCase()}`,'up')}${kpi('Etsy &amp; Offsite Ads',S.ads,`${pc(S.adsShare)} of ${L.income.toLowerCase()}`,'spark')}${kpi('Credits &amp; refunds of fees',S.credits,'Already taken off the fees','check')}${kpi('Take-home',S.takeHome,`${pc(S.revenue>0?S.takeHome/S.revenue:null)} of ${L.income.toLowerCase()} · deposits ${fmt(S.deposits)}`,'coins',S.takeHome<0?'warn':'')}</div>`+
   (S.revenue>0?`<section class="card"><div class="cardhead"><div><h2>Out of every sale</h2><p>${esc(r.label)} · as a share of ${fmt(S.revenue)} ${L.income.toLowerCase()}</p></div></div><div class="kit-gauges">${gauge(S.costShare,'Etsy’s cut','Fees, ads and Etsy Plus')}${gauge(S.revenue?S.fees/S.revenue:null,'Fees',fmt(S.fees))}${gauge(S.adsShare,'Ads',fmt(S.ads))}${gauge(S.takeHome/S.revenue,'Kept',fmt(S.takeHome))}</div></section>`:'')+
   `<div class="grid2 equal"><section class="card"><div class="cardhead"><div><h2>Fee breakdown</h2><p>${esc(r.label)} · after credits</p></div></div>${lines.length?pie(fold(lines.map(l=>[l.name,l.amount]),'Other Etsy costs'),{label:'Etsy costs',donut:false}):noData('statement lines')}</section>`+
   `<section class="card"><div class="cardhead"><div><h2>Statement lines</h2><p>${esc(r.label)}</p></div></div>${[['Order payments',S.sales],['Sales tax &amp; VAT buyers paid',-S.buyerTax],['Refunds to buyers',-S.refunds],[`<b>${L.income}</b>`,S.revenue],...lines.map(l=>[esc(l.name),-l.amount]),['<b>Take-home</b>',S.takeHome],['Shipping labels bought on Etsy',-S.labels],['Paid out to your bank',S.deposits]].filter(([,n],i)=>n||i===3).map(([k,n])=>`<div class="row"><span>${k}</span><span class="number">${Biz.acct(n)}</span></div>`).join('')}</section></div>`+
   (ms.some(x=>x&&(x.revenue||x.ads))?`<div class="grid2 equal"><section class="card"><div class="cardhead"><div><h2>Ad spend against ${L.income.toLowerCase()}, ${y}</h2><p>Hover a month for ads as a share of ${L.income.toLowerCase()}</p></div></div>${compareBarChart([{name:L.income,values:ms.map(x=>x?x.revenue:null),color:'var(--ch-in)'},{name:'Etsy & Offsite Ads',values:ms.map(x=>x?x.ads:null),color:'var(--cat-4)'}],months.map(shortMonth),'Revenue and ad spend by month')}</section>`+
    `<section class="card"><div class="cardhead"><div><h2>Shares by month, ${y}</h2><p>Etsy’s cut and ads, as a share of ${L.income.toLowerCase()}</p></div></div>${line([{name:'Etsy’s cut',values:ms.map(x=>x&&x.costShare!==null?x.costShare:null),color:'var(--cat-2)'},{name:'Ads',values:ms.map(x=>x&&x.adsShare!==null?x.adsShare:null),color:'var(--cat-4)'}],months.map(shortMonth),{f:v=>pc(v,0),title:'Etsy cost and ad share by month'})}</section></div>`+
    `<section class="card table-card"><div class="cardhead"><div><h2>Month by month, ${y}</h2><p>Costs as a share of ${L.income.toLowerCase()}</p></div></div><div class="table-wrap"><table><thead><tr><th>Month</th><th class="num">${L.income}</th><th class="num">Etsy fees</th><th class="num">Ads &amp; Plus</th><th class="num">Etsy costs</th><th class="num">Ads %</th><th class="num">Take-home</th></tr></thead><tbody>${months.map((m,i)=>{const x=ms[i];return x?`<tr><td><button class="link" data-action="select-month" data-month="${m}">${shortMonth(m)}</button></td><td class="num">${fmt(x.revenue)}</td><td class="num">${fmt(x.fees)}</td><td class="num">${fmt(x.marketing)}</td><td class="num">${fmt(x.etsyCosts)} <span class="dim">${pc(x.costShare,0)}</span></td><td class="num">${pc(x.adsShare)}</td><td class="num"><b>${Biz.acct(x.takeHome)}</b></td></tr>`:`<tr><td>${shortMonth(m)}</td><td class="num dim" colspan="6">—</td></tr>`;}).join('')}</tbody></table></div></section>`:'')+
   (span==='month'?`<section class="card table-card"><div class="cardhead"><div><h2>Every order in ${monthName(selected)}</h2><p>${orders.length} order${orders.length===1?'':'s'} · what the buyer paid, less tax and Etsy’s fees</p></div>${orders.length>25?button(ordersAll?'Show fewer':'Show all','etsy-orders-all','small quiet'):''}</div>${orders.length?orderTable(ordersAll?orders:orders.slice(0,25)):noData('statement lines')}</section>`:
    `<div class="notice no-print"><span>Choose <b>Month</b> to see every order rebuilt from the statement: sale − buyer tax − fees = take-home.</span></div>`);
 }
 // ---------- products & listings ----------
 function productsView(){
  const r=range(),R=D.products(state,r.from,r.to),shown=productsAll?R.list:R.list.slice(0,25);
  const health=R.listings.filter(l=>l.flags.length).sort((a,b)=>b.flags.length-a.flags.length||a.title.localeCompare(b.title));
  const cut=s=>s.length>46?s.slice(0,44).trim()+'…':s;
  return pagehead('What sells',`Products &amp; listings · ${esc(r.label)}`,'From sold order items. Revenue is at list price before discounts, then after each order’s discount is shared across its items.',scopeNote())+spanControl()+
   (R.list.length?`<div class="kpis">${stat('Products sold',num(R.list.length),`${num(R.units)} units in ${num(R.orders)} orders`)}${kpi('Sales at list price',R.total,'Before discounts','tags')}${stat('Top 5 share',pc(R.top(5),0),`Top 10: ${pc(R.top(10),0)} of list-price sales`)}${stat('Listings never sold',R.listings.length?num(R.unsold.length):'—',R.listings.length?`of ${num(R.listings.length)} listings in this period`:'Import your listings file')}</div>`+
    `<div class="grid2 equal"><section class="card"><div class="cardhead"><div><h2>Where sales come from</h2><p>${esc(r.label)} · share of list-price sales</p></div></div>${pie(fold(R.list.map(p=>[cut(p.name),p.list]),'Every other product'),{label:'List price sales',center:pc(R.top(5),0),sub:'TOP 5'})}</section>`+
    (R.listings.length?`<section class="card"><div class="cardhead"><div><h2>Listing health</h2><p>${R.listings.length} listings · Etsy allows 10 photos, 13 tags and a 140-character title</p></div></div>${gauge(R.health.ok/R.listings.length,'Full marks',`${num(R.health.ok)} of ${num(R.listings.length)} listings use every photo and tag`)}<div class="kit-counts">${[['Fewer than 10 photos',R.health.photos],['Fewer than 13 tags',R.health.tags],['Title under 40 characters',R.health.title]].map(([l,n])=>`<div><b class="number ${n?'warn':''}">${num(n)}</b><small>${l}</small></div>`).join('')}</div></section>`:`<section class="card">${noData('listings')}</section>`)+`</div>`+
    `<section class="card table-card"><div class="cardhead"><div><h2>Best sellers</h2><p>${esc(r.label)} · by list-price sales</p></div>${R.list.length>25?button(productsAll?'Show top 25':`Show all ${R.list.length}`,'etsy-products-all','small quiet'):''}</div><div class="table-wrap"><table><thead><tr><th>#</th><th>Product</th><th class="num">Units</th><th class="num">Orders</th><th class="num">List price sales</th><th class="num">After discounts</th><th class="num">Share</th></tr></thead><tbody>${shown.map((p,i)=>`<tr><td class="dim">${i+1}</td><td>${esc(p.name)}${!state.settings.shop&&state.shops.length>1?`<small class="dim etsy-item">${esc(shopName(p.shop))}</small>`:''}</td><td class="num">${num(p.units)}</td><td class="num">${num(p.orders)}</td><td class="num">${fmt(p.list)}</td><td class="num">${fmt(p.net)}</td><td class="num">${pc(R.total?p.list/R.total:null)}</td></tr>`).join('')}</tbody></table></div></section>`:noData('sold order items'))+
   (R.listings.length?`<section class="card"><div class="cardhead"><div><h2>Price against units sold</h2><p>Each dot is a listing at today’s price · grey dots sold nothing in this period · hover for the title</p></div></div>${scatter(R.listings.map(l=>({x:l.price,y:l.units,label:l.title,note:l.flags.join(' · ')})),{xName:'Price',yName:'Units sold',title:'Listing price against units sold'})}<div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Price</th><th class="num">Listings</th><th class="num">Selling</th><th class="num">Units</th><th class="num">Sales</th></tr></thead><tbody>${R.bands.map(b=>`<tr><td>${esc(b.label)}</td><td class="num">${b.listings}</td><td class="num">${b.selling}</td><td class="num">${num(b.units)}</td><td class="num">${fmt(b.list)}</td></tr>`).join('')}</tbody></table></div></section>`+
    `<section class="card table-card"><div class="cardhead"><div><h2>Listings with no sales</h2><p>${esc(r.label)} · ${R.unsold.length} of ${R.listings.length}. Listings meet their sales on the start of the title (Etsy’s listings file has no listing number), so a renamed listing can show here.</p></div></div>${R.unsold.length?`<div class="table-wrap"><table><thead><tr><th>Listing</th><th class="num">Price</th><th class="num">In stock</th><th>Could be better</th></tr></thead><tbody>${R.unsold.slice(0,60).map(l=>`<tr><td>${esc(l.title)}</td><td class="num">${fmt(l.price)}</td><td class="num">${num(l.qty)}</td><td>${l.flags.map(f=>`<span class="pill">${esc(f)}</span>`).join(' ')||'<span class="dim">—</span>'}</td></tr>`).join('')}</tbody></table></div>`:'<p class="small muted">Every listing sold at least once in this period.</p>'}</section>`+
    `<section class="card table-card"><div class="cardhead"><div><h2>Listings to improve</h2><p>${health.length} listing${health.length===1?'':'s'} short of photos, tags or title words</p></div></div>${health.length?`<div class="table-wrap"><table><thead><tr><th>Listing</th><th class="num">Photos</th><th class="num">Tags</th><th class="num">Title length</th><th class="num">Units sold</th></tr></thead><tbody>${health.slice(0,60).map(l=>`<tr><td>${esc(l.title)}</td><td class="num ${l.photos<10?'warn':''}">${l.photos}</td><td class="num ${l.tags<13?'warn':''}">${l.tags}</td><td class="num ${l.title.length<40?'warn':''}">${l.title.length}</td><td class="num">${num(l.units)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="small muted">Every listing uses all 10 photos, all 13 tags and a full title.</p>'}</section>`
    :(R.list.length?`<section class="card">${noData('listings')}</section>`:''));
 }
 // ---------- coupons & discounts ----------
 function couponsView(){
  const r=range(),C=D.coupons(state,r.from,r.to),y=selected.slice(0,4),months=Array.from({length:12},(_,i)=>`${y}-${String(i+1).padStart(2,'0')}`),mm=new Map(C.months.map(x=>[x.month,x]));
  return pagehead('What sells',`Coupons &amp; discounts · ${esc(r.label)}`,'From sold order items. A discount is counted once per order, however many items it had.',scopeNote())+spanControl()+
   (C.orders?`<div class="kpis">${stat('Orders discounted',pc(C.share,0),`${num(C.discounted)} of ${num(C.orders)} orders`)}${kpi('Discounts given',C.discount+C.shipDiscount,C.shipDiscount?`incl. ${fmt(C.shipDiscount)} off shipping`:`${pc(C.list?C.discount/C.list:null)} of list price`,'tags')}${kpi('List price',C.list,'Items before any discount','wallet')}${kpi('Paid for items',C.paid,'List price − discounts','down')}</div>`+
    `<div class="grid2 equal"><section class="card"><div class="cardhead"><div><h2>Orders with a discount</h2><p>${esc(r.label)} · ${num(C.orders)} orders</p></div></div>${pie([['Discounted',C.discounted,'var(--cat-2)'],['Full price',C.orders-C.discounted,'var(--cat-1)']],{label:'Orders',donut:false,f:num})}</section>`+
    `<section class="card"><div class="cardhead"><div><h2>What buyers paid of the list price</h2><p>${esc(r.label)} · items only, before shipping and tax</p></div></div>${pie([['Paid for items',C.paid,'var(--cat-5)'],['Discounts',C.discount,'var(--cat-2)']],{label:'List price',center:pc(C.list?C.paid/C.list:null,0),sub:'PAID'})}</section></div>`+
    `<div class="grid2 equal"><section class="card"><div class="cardhead"><div><h2>Discount by coupon code</h2><p>Share of the ${fmt(C.discount+C.shipDiscount)} given away</p></div></div>${C.codes.length?pie(fold(C.codes.map(c=>[c.code||'No code (sale or offer)',c.discount]),'Other codes'),{label:'Discount'}):'<p class="small muted">No discounted orders in this period.</p>'}</section>`+
    `<section class="card table-card"><div class="cardhead"><div><h2>By coupon code</h2><p>Sales and offers without a code are grouped together</p></div></div>${C.codes.length?`<div class="table-wrap"><table><thead><tr><th>Code</th><th class="num">Orders</th><th class="num">Discount</th><th class="num">Average</th></tr></thead><tbody>${C.codes.map(c=>`<tr><td>${c.code?`<b>${esc(c.code)}</b>`:'<span class="dim">No code (sale or offer)</span>'}</td><td class="num">${num(c.orders)}</td><td class="num">${fmt(c.discount)}</td><td class="num">${fmt(Math.round(c.discount/c.orders))}</td></tr>`).join('')}</tbody></table></div>`:'<p class="small muted">No discounted orders in this period.</p>'}</section></div>`+
    (months.some(m=>mm.get(m))?`<section class="card"><div class="cardhead"><div><h2>Discounted orders by month, ${y}</h2><p>Hover a month for the share discounted</p></div></div>${compareBarChart([{name:'Orders',values:months.map(m=>mm.get(m)?.orders??null),color:'var(--ch-in)'},{name:'Discounted',values:months.map(m=>mm.get(m)?.discounted??null),color:'var(--cat-2)'}],months.map(shortMonth),'Orders and discounted orders by month','vertical',num)}</section>`:'')
   :`<section class="card">${noData('sold order items')}</section>`);
 }
 // ---------- customers ----------
 function customersView(){
  const r=range(),C=D.customers(state,r.from,r.to),top=C.countries.slice(0,15);
  return pagehead('What sells',`Customers · ${esc(r.label)}`,'Only the country and a scrambled buyer key are kept from the sold order items file. Names and addresses are never stored.',scopeNote())+spanControl()+
   (C.orders?`<div class="kpis">${stat('Buyers',num(C.buyers),`${num(C.orders)} orders`)}${stat('Repeat buyers',num(C.repeat),`${pc(C.buyers?C.repeat/C.buyers:null,0)} of buyers came back`)}${stat('Orders from repeat buyers',pc(C.orders?C.repeatOrders/C.orders:null,0),`${num(C.repeatOrders)} orders`)}${stat('Countries',num(C.countries.length),`Top: ${esc(C.countries[0]?.country||'—')} ${pc(C.orders?C.countries[0].orders/C.orders:null,0)}`)}</div>`+
    `<div class="grid2 equal"><section class="card"><div class="cardhead"><div><h2>Where orders go</h2><p>${esc(r.label)} · share of ${num(C.orders)} orders</p></div></div>${pie(fold(C.countries.map(c=>[c.country,c.orders]),'Other countries'),{label:'Orders',f:num,center:num(C.countries.length),sub:'COUNTRIES'})}</section>`+
    `<section class="card"><div class="cardhead"><div><h2>New and returning buyers</h2><p>${esc(r.label)} · share of ${num(C.buyers)} buyers</p></div></div>${pie([['Bought once',C.buyers-C.repeat,'var(--cat-1)'],['Came back',C.repeat,'var(--cat-5)']],{label:'Buyers',donut:false,f:num})}<p class="small muted" style="margin-top:12px">Buyers are matched on their Etsy name as it appears in the export, so a buyer who changed it counts twice.</p></section></div>`+
    `<div class="grid2 equal"><section class="card"><div class="cardhead"><div><h2>How often buyers order</h2><p>Buyers by number of orders in this period</p></div></div>${compareBarChart([{name:'Buyers',values:C.spread.map(x=>x[1]),color:'var(--accent)'}],C.spread.map(x=>x[0]),'Buyers by number of orders','vertical',num)}</section>`+
    `<section class="card table-card"><div class="cardhead"><div><h2>Top countries</h2><p>${esc(r.label)}</p></div></div><div class="table-wrap"><table><thead><tr><th>Country</th><th class="num">Orders</th><th class="num">Share</th><th class="num">Paid for items</th></tr></thead><tbody>${top.map(c=>`<tr><td>${esc(c.country)}</td><td class="num">${num(c.orders)}</td><td class="num">${pc(c.orders/C.orders,c.orders/C.orders<0.1?1:0)}</td><td class="num">${fmt(c.paid)}</td></tr>`).join('')}</tbody></table></div></section></div>`
   :`<section class="card">${noData('sold order items')}</section>`);
 }
 // ---------- reviews ----------
 function reviewsView(){
  const r=range(),R=D.reviewStats(state,r.from,r.to),stars=n=>'★'.repeat(n)+'☆'.repeat(5-n),recentMonths=R.months.slice(-24);
  // star ratings are ordered, so one hue from light (1★) to dark (5★) instead of five unrelated colours
  const ramp=[18,32,48,66,100].map(p=>`color-mix(in oklab,var(--accent) ${p}%,var(--card))`);
  const lo=R.count?Math.max(1,Math.floor(Math.min(...recentMonths.map(x=>x.avg))*2)/2-0.5):1;
  return pagehead('What buyers say',`Reviews · ${esc(r.label)}`,'From reviews.json.',scopeNote())+spanControl()+
   (R.count?`<div class="kpis">${stat('Average rating',R.avg.toFixed(2),`${num(R.count)} reviews`)}${stat('5 stars',pc(R.dist[4]/R.count,0),`${num(R.dist[4])} reviews`)}${stat('4 stars',pc(R.dist[3]/R.count,0),`${num(R.dist[3])} reviews`)}${stat('3 stars or fewer',num(R.low.length),pc(R.low.length/R.count)+' of reviews',R.low.length?'warn':'')}</div>`+
    `<div class="grid2 equal"><section class="card"><div class="cardhead"><div><h2>Star ratings</h2><p>${esc(r.label)} · share of ${num(R.count)} reviews</p></div></div>${pie([5,4,3,2,1].map(n=>[stars(n),R.dist[n-1],ramp[n-1]]),{label:'Reviews',f:num,center:R.avg.toFixed(2)+'★',sub:'AVERAGE'})}</section>`+
    `<section class="card"><div class="cardhead"><div><h2>Average rating by month</h2><p>${recentMonths.length>1?`Last ${recentMonths.length} months with reviews · scale starts at ${lo}★`:'Needs reviews in more than one month'}</p></div></div>${recentMonths.length>1?line([{name:'Average rating',values:recentMonths.map(x=>x.avg),color:'var(--accent)'}],recentMonths.map(x=>shortMonth(x.key)+(recentMonths.length>12?' '+x.key.slice(2,4):'')),{min:lo,max:5,f:v=>v.toFixed(2)+'★',title:'Average rating by month'}):''}</section></div>`+
    (recentMonths.length>1?`<div class="grid2 equal"><section class="card"><div class="cardhead"><div><h2>Reviews by month</h2><p>How many reviews arrived · last ${Math.min(12,recentMonths.length)} months with reviews</p></div></div>${compareBarChart([{name:'Reviews',values:recentMonths.slice(-12).map(x=>x.count),color:'var(--cat-3)'}],recentMonths.slice(-12).map(x=>shortMonth(x.key)+' '+x.key.slice(2,4)),'Reviews by month','vertical',num)}</section>`:'<div class="grid2 equal">')+
    `<section class="card table-card"><div class="cardhead"><div><h2>Year by year</h2><p>Average rating and number of reviews</p></div></div><div class="table-wrap"><table><thead><tr><th>Year</th><th class="num">Reviews</th><th class="num">Average</th></tr></thead><tbody>${R.years.map(x=>`<tr><td>${x.key}</td><td class="num">${num(x.count)}</td><td class="num"><b>${x.avg.toFixed(2)}</b></td></tr>`).join('')}</tbody></table></div></section></div>`+
    `<section class="card table-card"><div class="cardhead"><div><h2>Reviews of 3 stars or fewer</h2><p>Newest first</p></div></div>${R.low.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Stars</th><th>Review</th><th>Order</th></tr></thead><tbody>${R.low.slice(0,50).map(x=>`<tr><td class="nw">${dateName(x.date)} ${x.date.slice(0,4)}</td><td class="nw warn">${stars(x.stars)}</td><td>${esc(x.message)||'<span class="dim">No comment</span>'}</td><td class="dim">${x.order?'#'+esc(x.order):''}</td></tr>`).join('')}</tbody></table></div>`:'<p class="small muted">No reviews under 4 stars in this period.</p>'}</section>`
   :`<section class="card">${noData('reviews')}</section>`);
 }
 // ---------- seasonality ----------
 function seasonalityView(){
  const Z=D.seasonality(state),years=Z.years.slice(-3),labels=Array.from({length:12},(_,i)=>shortMonth(`2026-${String(i+1).padStart(2,'0')}`)),yc=['var(--cat-6)','var(--cat-3)','var(--accent)'].slice(-years.length);
  const avg=labels.map((_,i)=>{const v=Z.years.filter(y=>y.paid).map(y=>y.months[i].paid);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0;}),yearAvg=avg.reduce((a,b)=>a+b,0)/12||1;
  const max=Math.max(1,...Z.years.flatMap(y=>y.months.map(m=>m.paid)));
  return pagehead('What sells','Seasonality',Z.source==='orders'?'Sales by calendar month, from sold order items (list price after discounts, before shipping and tax).':'Revenue by calendar month, from the payment account statement.',scopeNote())+
   (Z.years.length?`<section class="card"><div class="cardhead"><div><h2>Month against month</h2><p>${years.map(y=>y.year).join(' · ')} · one line per year</p></div></div>${areaChart(years.map((y,i)=>({name:y.year,values:y.months.map(m=>m.paid||null),color:yc[i]})),labels,'Sales by calendar month, one line per year')}</section>`+
    `<section class="card table-card"><div class="cardhead"><div><h2>Busy and quiet months</h2><p>Darker cells sold more · last column compares each month with an average month, across every year imported</p></div></div><div class="table-wrap"><table class="kit-heat"><thead><tr><th>Month</th>${Z.years.map(y=>`<th class="num">${y.year}</th>`).join('')}<th class="num">Against an average month</th></tr></thead><tbody>${labels.map((l,i)=>`<tr><td>${l}</td>${Z.years.map(y=>{const c=y.months[i];return `<td class="num" style="${heat(c.paid,max)}" data-tip="${tipOf(`${l} ${y.year}`,[{name:'Sales',value:fmt(c.paid)},{name:'Orders',value:num(c.orders)}])}">${c.paid?fmt(c.paid):'—'}<small class="etsy-item">${c.orders?num(c.orders)+' orders':''}</small></td>`;}).join('')}<td class="num ${avg[i]>=yearAvg*1.2?'pos':avg[i]<=yearAvg*.8?'warn':''}"><b>${pc(avg[i]/yearAvg-1,0).replace(/^(?!-)/,'+')}</b></td></tr>`).join('')}<tr class="group-total"><td><b>Year</b></td>${Z.years.map(y=>`<td class="num"><b>${fmt(y.paid)}</b><small class="dim etsy-item">${num(y.orders)} orders</small></td>`).join('')}<td></td></tr></tbody></table></div></section>`
   :`<section class="card">${noData('sold order items')}</section>`);
 }
 // ---------- shops ----------
 function shopsView(){
  const r=range(span==='all'?'all':span),rows=D.compare(state,r.from,r.to),T=D.summary({...state,settings:{...state.settings,shop:''}},r.from,r.to),two=rows.filter(x=>x.revenue>0).length>1;
  return pagehead('Your shops','Shops',`Every import belongs to one shop. Costs you log with All shops selected are shared, and count in the combined view only.`,button('＋ Add a shop','etsy-add-shop','primary'))+spanControl()+
   (rows.length?`<section class="card table-card"><div class="cardhead"><div><h2>Shop by shop</h2><p>${esc(r.label)}</p></div></div><div class="table-wrap"><table class="etsy-compare"><thead><tr><th>Shop</th><th class="num">${L.income}</th><th class="num">Etsy costs</th><th class="num">Ads</th><th class="num">Take-home</th><th class="num">Net profit</th><th class="num">Orders</th><th class="num">Average order</th><th class="num">Listings</th><th class="num">Rating</th></tr></thead><tbody>${rows.map(x=>`<tr><td><button class="link" data-action="etsy-scope" data-shop="${x.id}"><b>${esc(x.name)}</b></button></td><td class="num">${fmt(x.revenue)}</td><td class="num">${fmt(x.etsyCosts)} <span class="dim">${pc(x.costShare,0)}</span></td><td class="num">${fmt(x.ads)} <span class="dim">${pc(x.adsShare,0)}</span></td><td class="num"><b>${Biz.acct(x.takeHome)}</b></td><td class="num">${Biz.acct(x.profit)}</td><td class="num">${num(x.orders||x.soldOrders)}</td><td class="num">${x.aov?fmt(x.aov):'—'}</td><td class="num">${num(x.listings)}</td><td class="num">${x.rating?x.rating.toFixed(2):'—'}</td></tr>`).join('')}<tr class="group-total"><td><b>All shops</b><small class="dim etsy-item">incl. shared costs</small></td><td class="num"><b>${fmt(T.revenue)}</b></td><td class="num"><b>${fmt(T.etsyCosts)}</b></td><td class="num"><b>${fmt(T.ads)}</b></td><td class="num"><b>${Biz.acct(T.takeHome)}</b></td><td class="num"><b>${Biz.acct(T.profit)}</b></td><td class="num"><b>${num(T.orders)}</b></td><td class="num">${T.aov?fmt(T.aov):'—'}</td><td></td><td></td></tr></tbody></table></div></section>`+
    (two?`<div class="grid2 equal"><section class="card"><div class="cardhead"><div><h2>Share of ${L.income.toLowerCase()}</h2><p>${esc(r.label)}</p></div></div>${pie(fold(rows.map(x=>[x.name,x.revenue])),{label:L.income,center:fmt(T.revenue).replace(/\.\d\d$/,''),sub:'ALL SHOPS'})}</section>`+
     `<section class="card"><div class="cardhead"><div><h2>Take-home by shop</h2><p>${esc(r.label)}</p></div></div>${compareBarChart([{name:L.income,values:rows.map(x=>x.revenue),color:'var(--ch-in)'},{name:'Take-home',values:rows.map(x=>x.takeHome),color:'var(--accent)'}],rows.map(x=>x.name),'Revenue and take-home by shop','horizontal')}</section></div>`:''):'')+
   `<section class="card no-print"><div class="cardhead"><div><h2>Manage shops</h2><p>Rename a shop at any time. Deleting a shop removes everything imported into it.</p></div></div>${state.shops.map(x=>`<div class="row"><div><strong>${esc(x.name)}</strong><small>${num(state.transactions.filter(t=>t.shop===x.id).length)} statement lines · ${num(state.etsy.orders.filter(o=>o.shop===x.id).length)} orders · ${num(state.etsy.listings.filter(l=>l.shop===x.id).length)} listings · ${num(state.etsy.reviews.filter(v=>v.shop===x.id).length)} reviews</small></div><div class="actions">${button('Rename','etsy-rename-shop','small',`data-id="${x.id}"`)}${button('Delete','etsy-delete-shop','small danger',`data-id="${x.id}"`)}</div></div>`).join('')||empty('No shops yet','Add each Etsy shop you run, then import its files.','etsy-add-shop','Add a shop')}</section>`;
 }
 // ---------- year: sold orders fill the months that have no statement yet ----------
 function annualTop(y){return revenueByShop(y)+soldOrdersCard(y);}
 function revenueByShop(y){
  if(state.settings.shop||state.shops.length<2)return '';
  const cutoff=today().slice(0,7),end=y===cutoff.slice(0,4)?today():y+'-12-31',rows=D.compare(state,y+'-01-01',end).filter(x=>x.revenue||x.orders),total=rows.reduce((n,x)=>n+x.revenue,0);
  if(!rows.length||!total)return '';
  const months=Array.from({length:12},(_,i)=>`${y}-${String(i+1).padStart(2,'0')}`),chart=shopStack(months,i=>months[i]<=cutoff,null);
  return `<section class="card"><div class="cardhead"><div><h2>${L.income} by shop, ${y}</h2><p>${y===cutoff.slice(0,4)?'Year to date':'Full year'} · ${fmt(total)} across ${rows.length} shops · estimated months included</p></div><button class="link" data-go="shops">Compare shops</button></div>`+
   `<div class="kit-shop-pie">${pie(rows.map(x=>[x.name,x.revenue,shopColor(x.id)]),{label:L.income,center:compact(total),sub:'ALL SHOPS'})}</div>`+(chart?`<div style="margin-top:18px">${chart}</div>`:'')+`<div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Shop</th><th class="num">${L.income}</th><th class="num">Share</th><th class="num">Etsy costs</th><th class="num">Take-home</th><th class="num">Net profit</th><th class="num">Orders</th></tr></thead><tbody>${rows.map(x=>`<tr><td class="nw"><i class="dot" style="background:${shopColor(x.id)}"></i> <button class="link" data-action="etsy-scope" data-shop="${x.id}">${esc(x.name)}</button></td><td class="num">${fmt(x.revenue)}</td><td class="num">${pc(x.revenue/total,0)}</td><td class="num">${fmt(x.etsyCosts)}</td><td class="num"><b>${Biz.acct(x.takeHome)}</b></td><td class="num">${Biz.acct(x.profit)}</td><td class="num">${num(x.orders)}</td></tr>`).join('')}</tbody></table></div></section>`;
 }
 function soldOrdersCard(y){
  const M=D.orderMonths(state,y),cutoff=today().slice(0,7),has=M.some(m=>m.orders);if(!has)return '';
  const missing=M.filter(m=>m.orders&&!m.statement),tot=k=>M.reduce((n,m)=>n+m[k],0);
  return `<section class="card"><div class="cardhead"><div><h2>Sales from your sold orders, ${y}</h2><p>From the sold order items file: item prices after discounts, plus shipping, before sales tax · ${num(tot('orders'))} orders · ${fmt(tot('sales'))}</p></div>${missing.length?button('Import statements','go-etsy-import','small'):''}</div>`+
   (()=>{const shops=!state.settings.shop?state.shops.filter(sh=>D.orderMonths(D.forShop(state,sh.id),y).some(m=>m.orders)):[];
    if(shops.length<2)return compareBarChart([{name:'Sales from orders',values:M.map(m=>m.month<=cutoff?m.sales:null),color:'var(--ch-in)'}],M.map(m=>shortMonth(m.month)),`Sales from sold orders by month, ${y}`);
    const top=shops.slice(0,5),rest=shops.slice(5),per=sh=>D.orderMonths(D.forShop(state,sh.id),y).map(m=>m.sales);
    const series=top.map(sh=>({name:sh.name,values:per(sh),color:shopColor(sh.id)}));if(rest.length)series.push({name:`${rest.length} other shop${rest.length===1?'':'s'}`,values:M.map((_,i)=>rest.reduce((n,sh)=>n+per(sh)[i],0)),color:colors[5]});
    return stack(series,M.map(m=>shortMonth(m.month)),{title:`Sales from sold orders by month and shop, ${y}`});})()+
   `<div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Month</th>${M.map(m=>`<th class="num">${shortMonth(m.month)}</th>`).join('')}</tr></thead><tbody><tr><td>Orders</td>${M.map(m=>`<td class="num">${m.orders?num(m.orders):'<span class="dim">—</span>'}</td>`).join('')}</tr><tr><td>Statement</td>${M.map(m=>`<td class="num">${m.statement?'<span class="pos">✓</span>':m.orders?'<span class="warn">estimated</span>':'<span class="dim">—</span>'}</td>`).join('')}</tr></tbody></table></div>`+
   (missing.length?`<p class="small muted" style="margin-top:12px"><b>${missing.length} month${missing.length===1?' is':'s are'} estimated from sold orders</b> (no payment account statement yet). Revenue is exact; Etsy fees are at the standard rates, and Etsy Ads, Etsy Plus and credits are missing until you import each month’s statement: Shop Manager → Finances → Payment account.</p>`:'')+`</section>`;
 }
 function plNote(from,to){const ms=D.estimatedMonths(state,from,to);if(!ms.length)return '';
  return `<div class="notice"><span><b>${ms.length===1?monthName(ms[0])+' is':ms.length+' months are'} estimated from sold orders</b>${ms.length>1?` (${ms.map(shortMonth).join(', ')})`:''}. Revenue is exact; Etsy’s transaction, processing and listing fees are at the standard rates. Etsy Ads, Etsy Plus and credits are not included until you import those months’ payment account statements, so profit and tax here are a little high.</span>${button('Import statements','go-etsy-import','small')}</div>`;}
 // Bank imports: money in that matches an Etsy payout (same amount, up to six days after Etsy sent
 // it, from a statement or the deposits file) or says "Etsy" is a transfer, because its sales are
 // already counted. Anything else that came in is other revenue, never an Etsy payout by default.
 function importRefine(cat,{date,amount,note}){
  if(!(amount>0))return cat;
  const payouts=[...(state.etsy.deposits||[]).map(d=>[d.date,d.amount]),...state.transactions.filter(t=>t.category==='etsy-deposit'&&t.src).map(t=>[t.date,t.amount])];
  if(payouts.some(([d,a])=>a===amount&&date>=d&&date<=Budget.plusDays(d,6))||/\betsy\b/i.test(note||''))return 'etsy-deposit';
  return cat==='etsy-deposit'?(P.defaults.importIncome||cat):cat;
 }
 // what an import holds, in words, for the move and delete dialogs
 const whatOf=r=>[r.lines&&`${num(r.lines)} ${r.kind==='bank'?'bank':'statement'} line${r.lines===1?'':'s'}`,r.orders&&`${num(r.orders)} order${r.orders===1?'':'s'} (${num(r.items)} items)`,r.listings&&`${num(r.listings)} listings`,r.reviews&&`${num(r.reviews)} review${r.reviews===1?'':'s'}`,r.deposits&&`${num(r.deposits)} deposit${r.deposits===1?'':'s'}`].filter(Boolean).join(', ');
 // ---------- import ----------
 let session=null;   // {shop, files:[parsed]}
 function importView(){
  const shops=state.shops,target=session?.shop||state.settings.shop||shops[0]?.id||'';
  const where=X.exports.map(([k,label,path,example])=>`<div class="row"><div><strong>${label}</strong><small>${esc(path)}</small></div><span class="pill">${esc(example)}</span></div>`).join('');
  // what the chosen shop already holds, so the choice is easy to check at a glance
  const held=id=>{const last=state.etsy.imports.filter(x=>x.shop===id).map(x=>x.at).sort().at(-1),o=state.etsy.orders.filter(x=>x.shop===id).length,l=state.transactions.filter(t=>t.shop===id&&t.src).length;
   return last?`${num(o)} order${o===1?'':'s'} · ${num(l)} statement line${l===1?'':'s'} · last import ${dateName(last)}`:'Nothing imported yet';};
  const shopPick=shops.length?`<label class="etsy-field"><span class="sr-only">Import into</span><select id="etsy-import-shop">${shops.map(x=>`<option value="${x.id}" ${x.id===target?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>${button('＋ New shop','etsy-add-shop','quiet')}`
   :`<form id="etsy-shop-form" class="etsy-first-shop"><label class="etsy-field"><span class="sr-only">Shop name</span><input name="name" maxlength="60" required placeholder="Your shop name, e.g. Fern &amp; Fable Prints"></label><button class="btn primary">Add shop</button></form>`;
  let preview='';
  if(session?.files.length){
   const rows=session.files.map(f=>({f,r:D.merge(clone(state),target,f,{dry:true})}));
   const ready=rows.filter(x=>!x.r.error&&(x.r.added||x.r.updated||x.r.items)).length;
   preview=`<section class="card table-card"><div class="cardhead"><div><h2>Ready to import</h2><p>${session.files.length} file${session.files.length===1?'':'s'} into <b>${esc(shopName(target)||'—')}</b></p></div><div class="actions">${button('Clear','etsy-clear','small')}${button(`Import ${ready} file${ready===1?'':'s'}`,'etsy-import','small primary',ready&&target?'':'disabled')}</div></div><div class="table-wrap"><table class="etsy-files"><thead><tr><th>File</th><th>Recognised as</th><th>Dates</th><th class="num">Rows</th><th>What happens</th></tr></thead><tbody>${rows.map(({f,r})=>`<tr><td><b>${esc(f.name)}</b>${f.issues.length?`<small class="warn etsy-item">${f.issues.length} row${f.issues.length===1?'':'s'} skipped: ${esc(f.issues.slice(0,2).join(' · '))}</small>`:''}${f.notes.map(n=>`<small class="dim etsy-item">${esc(n)}</small>`).join('')}</td><td>${f.kind?D.KINDS[f.kind]:'<span class="warn">Not recognised</span>'}</td><td class="nw">${f.from?dateName(f.from)+(f.from.slice(0,4)!==f.to.slice(0,4)?' '+f.from.slice(0,4):'')+(f.to!==f.from?' – '+dateName(f.to):'')+' '+f.to.slice(0,4):'—'}</td><td class="num">${num(f.records.length)}${f.kind==='orders'?`<small class="dim etsy-item">${num(f.items.length)} items</small>`:''}</td><td>${r.error?`<span class="warn">${esc(r.error)}</span>`:outcome(r)}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  return pagehead('Bring in your Etsy files','Import Etsy files','Choose the shop, then drop in any of Etsy’s four exports together. Each is recognised by its columns. Anything already imported is skipped.',button('Import a bank CSV','go-import','quiet'))+
   `<section class="card etsy-import-card"><div class="etsy-import-top">`+
   `<div class="etsy-import-step"><div class="etsy-step-head"><span class="etsy-step-no">1</span><div><h2>${shops.length?'Choose the shop':'Name your first shop'}</h2><p>${shops.length?'Files go into this shop, whatever the picker at the top shows.':'One entry per Etsy shop. You can add more later.'}</p></div></div>`+
   `<div class="etsy-shop-row">${shopPick}</div>${shops.length?`<p class="etsy-shop-meta">${ico('history')}<span>${esc(held(target))}</span></p>`:''}</div>`+
   `<div class="etsy-import-step"><div class="etsy-step-head"><span class="etsy-step-no">2</span><div><h2>Add the files</h2><p>Statements, order items, listings and reviews, together or one at a time.</p></div></div>`+
   `<label class="etsy-drop${shops.length?'':' disabled'}" id="etsy-drop"><span class="etsy-drop-icon">${ico('up')}</span><b>Drop Etsy files here</b><small>.csv and reviews.json · several at once · read on this device only</small><span class="btn small etsy-drop-btn">Choose files</span><input class="sr-only" type="file" id="etsy-files" accept=".csv,.json,text/csv,application/json" multiple ${shops.length?'':'disabled'}></label></div>`+
   `</div></section>`+
   preview+
   `<section class="card"><div class="cardhead"><div><h2>Where to find each file</h2><p>Download them from Etsy on a computer. Nothing is sent anywhere: the files are read in this browser.</p></div></div>${where}<p class="small muted" style="margin-top:12px">Buyer names and addresses in the sold order items file are not stored. Only the country and a scrambled key (to count repeat buyers) are kept.</p></section>`+
   recentImports();
 }
 function outcome(r){
  if(r.kind==='listings')return r.added?`Replaces ${r.replaced} listing${r.replaced===1?'':'s'} with ${r.added}`:`No change · ${r.same} listings already here`;
  const parts=[r.added&&`${num(r.added)} new ${{statement:'line',orders:'order',deposits:'deposit'}[r.kind]||'review'}${r.added===1?'':'s'}`,r.items&&`${num(r.items)} new item${r.items===1?'':'s'}`,r.updated&&`${num(r.updated)} updated`,r.same&&`${num(r.same)} already here`,r.currency&&`currency set to ${r.currency}`].filter(Boolean);
  return parts.length?parts.join(' · '):'Nothing new';
 }
 function recentImports(){
  const shop=state.settings.shop,list=state.etsy.imports.map((x,i)=>({...x,i})).filter(x=>!shop||x.shop===shop||(x.kind==='bank'&&!x.shop)).slice(-40).reverse();if(!list.length)return '';
  return `<section class="card table-card"><div class="cardhead"><div><h2>Imported files</h2><p>${esc(scopeName())} · Move sends everything a file brought in to another shop. Delete removes it. Costs you typed in yourself are never touched.</p></div></div><div class="table-wrap"><table><thead><tr><th>Imported</th><th>Shop</th><th>File</th><th>Kind</th><th>Covers</th><th class="num">Rows</th><th class="no-print"></th></tr></thead><tbody>${list.map(x=>`<tr><td class="nw">${dateName(x.at)}</td><td>${x.shop?esc(shopName(x.shop)):'<span class="dim">Shared</span>'}</td><td>${esc(x.name)}</td><td>${D.KINDS[x.kind]}</td><td class="nw">${x.kind==='listings'?'Today’s listings':x.from?dateName(x.from)+(x.from.slice(0,4)!==x.to.slice(0,4)?' '+x.from.slice(0,4):'')+' – '+dateName(x.to)+' '+x.to.slice(0,4):'All dates'}</td><td class="num">${num(x.rows)}</td><td class="no-print nw etsy-row-actions">${button('Move','etsy-move-import','small quiet',`data-i="${x.i}"`)}${button('Delete','etsy-remove-import','small quiet',`data-i="${x.i}"`)}</td></tr>`).join('')}</tbody></table></div></section>`;
 }
 async function readFiles(list){
  const files=[...list].slice(0,24);if(!files.length)return;
  const parsed=[];for(const f of files){if(f.size>10e6){parsed.push({name:f.name,kind:null,records:[],items:[],issues:[],notes:[],error:'Files must be smaller than 10 MB.'});continue;}parsed.push(D.read(f.name,await f.text()));}
  const shop=$('#etsy-import-shop')?.value||session?.shop||state.settings.shop||state.shops[0]?.id||'';
  session={shop,files:[...(session?.files||[]),...parsed]};render();
 }
 function runImport(){
  const s=session;if(!s?.files.length)return;const shop=s.shop||state.shops[0]?.id;if(!shop)return toast('Add a shop first.');
  const plan=s.files.map(f=>({f,r:D.merge(clone(state),shop,f,{dry:true})})).filter(x=>!x.r.error&&(x.r.added||x.r.updated||x.r.items));
  if(!plan.length)return toast('Nothing new to import.');
  const newLines=plan.filter(x=>x.f.kind==='statement').reduce((n,x)=>n+x.r.added,0);
  if(state.transactions.length+newLines>MAX_TRANSACTIONS)return toast(LIMIT_MESSAGE);
  const summary=`${shopName(shop)}: `+plan.map(({r})=>`${D.KINDS[r.kind].toLowerCase()} ${r.kind==='listings'?(r.added||r.same)+' listings':r.kind==='orders'?num(r.added)+' new orders, '+num(r.items)+' items':num(r.added)+' new'+(r.updated?', '+num(r.updated)+' updated':'')}`).join(' · ');
  let latest='';
  commit(()=>{for(const {f} of plan){const r=D.merge(state,shop,f,{uid:Budget.uid,today:today()});if(r.error)continue;
    // months that receive Etsy lines open again, as with any import
    r.months.forEach(m=>{if(state.months[m]?.closed)state.months[m].closed=false;});
    if(['statement','orders'].includes(f.kind)&&f.to>latest)latest=f.to;}
   state.settings.shop=state.shops.length>1?state.settings.shop:'';
   D.syncEstimates(state,{today:today()});
   if(latest)selected=(latest>today()?today():latest).slice(0,7);session=null;},summary);
 }
 // ---------- shop picker in the top bar ----------
 function afterRender(){
  const host=document.querySelector('.top-left');if(!host)return;let box=document.getElementById('shop-switch');
  if(!box){box=document.createElement('label');box.id='shop-switch';box.className='shop-control';host.appendChild(box);}
  const cur=state.settings.shop,opts=`${state.shops.length!==1?`<option value="">${state.shops.length?'All shops':'No shops yet'}</option>`:''}${state.shops.map(x=>`<option value="${x.id}" ${x.id===cur?'selected':''}>${esc(x.name)}</option>`).join('')}<option value="__add">＋ Add a shop…</option>`;
  box.innerHTML=`<span class="month-control-label">Shop</span><select id="shop-picker" aria-label="Shop to show">${opts}</select>`;
  const sel=box.querySelector('select');sel.value=state.shops.length===1&&!cur?state.shops[0].id:cur;
 }
 function shopForm(id=''){const x=state.shops.find(s=>s.id===id);
  modal(x?'Rename shop':'Add a shop',x?'The new name shows everywhere, including earlier imports.':'One entry per Etsy shop you run. Imports, screens and printouts can then show one shop or all of them.',`<form id="etsy-shop-form" data-id="${id}"><div class="fields"><label class="full">Shop name<input name="name" maxlength="60" required value="${esc(x?.name||'')}" placeholder="e.g. Copper Kiln Ceramics"></label></div>${formFoot(x?'Save':'Add shop')}</form>`);}

 // ---------- events ----------
 document.addEventListener('change',e=>{
  if(e.target.id==='shop-picker'){const v=e.target.value;if(v==='__add'){e.target.value=state.settings.shop;return shopForm();}
   if(v&&!state.shops.some(x=>x.id===v))return;commit(()=>state.settings.shop=state.shops.length===1?'':v,v?`Showing ${shopName(v)}`:'Showing all shops');return;}
  if(e.target.id==='etsy-import-shop'){session={...(session||{files:[]}),shop:e.target.value};render();return;}
  if(e.target.id==='etsy-files'){readFiles(e.target.files).catch(err=>toast(err.message));}
 });
 document.addEventListener('dragover',e=>{const z=e.target.closest?.('#etsy-drop');if(!z)return;e.preventDefault();z.classList.add('over');});
 document.addEventListener('dragleave',e=>{e.target.closest?.('#etsy-drop')?.classList.remove('over');});
 document.addEventListener('drop',e=>{const z=e.target.closest?.('#etsy-drop');if(!z)return;e.preventDefault();z.classList.remove('over');if(state.shops.length)readFiles(e.dataTransfer.files).catch(err=>toast(err.message));});
 document.addEventListener('click',e=>{const b=e.target.closest('button[data-action^="etsy-"],button[data-action="go-etsy-import"]');if(!b)return;const a=b.dataset.action,id=b.dataset.id;try{switch(a){
  case 'go-etsy-import':if($('#welcome-tour')?.open)closeWelcome();break;
  case 'etsy-pulse':showPulse(+b.dataset.i);break;
  case 'etsy-span':span=['month','year','all'].includes(b.dataset.span)?b.dataset.span:'all';render();break;
  case 'etsy-orders-all':ordersAll=!ordersAll;render();break;
  case 'etsy-products-all':productsAll=!productsAll;render();break;
  case 'etsy-scope':if(state.shops.some(x=>x.id===b.dataset.shop))commit(()=>state.settings.shop=b.dataset.shop,`Showing ${shopName(b.dataset.shop)}`);break;
  case 'etsy-add-shop':shopForm();break;
  case 'etsy-rename-shop':shopForm(id);break;
  case 'etsy-delete-shop':{const x=state.shops.find(s=>s.id===id);if(!x)break;confirmation(`Delete ${esc(x.name)}?`,'Its statement lines, orders, listings and reviews are removed from this planner. Shared costs are kept. You can undo this change.','etsy-confirm-delete-shop','Delete shop',`data-id="${id}"`);break;}
  case 'etsy-confirm-delete-shop':{const x=state.shops.find(s=>s.id===id);if(!x)break;closeModal();commit(()=>{state.shops=state.shops.filter(s=>s.id!==id);state.transactions=state.transactions.filter(t=>t.shop!==id);
   for(const k of ['orders','items','listings','reviews','imports'])state.etsy[k]=state.etsy[k].filter(r=>r.shop!==id);if(state.settings.shop===id||state.shops.length<2)state.settings.shop='';},`${x.name} deleted`);break;}
  case 'etsy-remove-import':{const i=+b.dataset.i,x=state.etsy.imports[i],r=x&&D.removeImport(clone(state),i,{dry:true});if(!r)break;
   const _w=whatOf(r)||'nothing else (its data is already gone)';
   confirmation(`Delete ${esc(x.name)}?`,`Removes ${_w} from ${x.shop?esc(shopName(x.shop)):'your shared records'}${x.from&&x.kind!=='listings'?`, dated ${dateName(x.from)} – ${dateName(x.to)} ${x.to.slice(0,4)}`:''}.${x.kind==='bank'?'':' If another import covers the same dates, its rows go too; import that file again to bring them back.'} You can undo this change.`,'etsy-confirm-remove-import','Delete import',`data-i="${i}"`);break;}
  case 'etsy-move-import':{const i=+b.dataset.i,x=state.etsy.imports[i];if(!x)break;
   const opts=state.shops.filter(v=>v.id!==x.shop).map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join('')+(x.kind==='bank'&&x.shop?'<option value="">All shops (shared)</option>':'');
   if(!opts)return toast('Add another shop first, then move this file to it.');
   const c=D.moveImport(clone(state),i,state.shops.find(v=>v.id!==x.shop)?.id??'',{dry:true})||{},what=whatOf(c)||'nothing (its data is already gone)';
   modal(`Move ${esc(x.name)}`,`Everything this file brought in moves with it: ${what}. Dashboards, estimates and totals follow. You can undo this change.`,`<form id="etsy-move-form" data-i="${i}"><div class="fields"><label class="full">From<input value="${x.shop?esc(shopName(x.shop)):'All shops (shared)'}" disabled></label><label class="full">Move to<select name="to">${opts}</select></label>${x.kind==='listings'?'<p class="small muted full">A listings file is a snapshot of a whole shop, so it replaces the listings already in the shop you move it to.</p>':''}</div>${formFoot('Move file')}</form>`);break;}
  case 'etsy-confirm-remove-import':{const i=+b.dataset.i,x=state.etsy.imports[i];if(!x)break;closeModal();commit(()=>{D.removeImport(state,i);D.syncEstimates(state,{today:today()});},`${x.name} deleted`);break;}
  case 'etsy-clear':session=null;render();break;
  case 'etsy-import':runImport();break;
 }}catch(err){toast(err.message);}});
 document.addEventListener('submit',e=>{if(e.target.id!=='etsy-move-form')return;e.preventDefault();
  const i=+e.target.dataset.i,to=new FormData(e.target).get('to')??'',x=state.etsy.imports[i];if(!x)return closeModal();
  const test=D.moveImport(clone(state),i,to,{dry:true});if(test?.error)return formError(test.error);
  closeModal();commit(()=>{D.moveImport(state,i,to);D.syncEstimates(state,{today:today()});},`${x.name} moved to ${to?shopName(to):'All shops (shared)'}`);});
 document.addEventListener('submit',e=>{if(e.target.id!=='etsy-shop-form')return;e.preventDefault();const f=new FormData(e.target),id=e.target.dataset.id,name=String(f.get('name')||'').trim();
  try{if(!name)throw Error('Give the shop a name.');if(state.shops.some(x=>x.id!==id&&x.name.toLowerCase()===name.toLowerCase()))throw Error('Another shop already uses that name.');
   if(!id&&state.shops.length>=24)throw Error('Shop Insights holds up to 24 shops.');
   if($('#modal').open)closeModal();
   if(id)commit(()=>state.shops.find(x=>x.id===id).name=name,'Shop renamed');
   else{const nid='shop-'+Budget.uid().replace(/[^A-Za-z0-9]/g,'').slice(0,10);commit(()=>{state.shops.push({id:nid,name});if(session)session.shop=nid;},`${name} added`);}
  }catch(err){if($('#modal').open)formError(err);else toast(err.message);}});

 document.head.insertAdjacentHTML('beforeend',`<style>
 .shop-control{display:flex;flex-direction:column;gap:2px;margin-left:14px;min-width:0}
 .shop-control select{height:36px;border-radius:10px;border:1px solid var(--rule-2);background:var(--card);color:var(--ink);font:600 14px var(--ui);padding:0 30px 0 10px;max-width:220px}
 .etsy-row-actions .btn+.btn{margin-left:6px}
 .etsy-item{display:block;font-weight:400;max-width:420px;white-space:normal}
 .sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
 .etsy-import-card{padding:0;overflow:hidden}
 .etsy-import-top{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr)}
 .etsy-import-step{padding:26px 28px;display:flex;flex-direction:column;gap:18px;min-width:0}
 .etsy-import-step+.etsy-import-step{border-left:1px solid var(--rule);background:linear-gradient(180deg,var(--sunk),var(--card) 70%)}
 .etsy-step-head{display:flex;gap:14px;align-items:flex-start}
 .etsy-step-head h2{margin:1px 0 4px;font-size:17px;letter-spacing:-.01em}
 .etsy-step-head p{margin:0;color:var(--ink-3);font-size:13.5px;line-height:1.45}
 .etsy-step-no{flex:none;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--accent-soft);color:var(--accent);font:700 13px var(--num);border:1px solid var(--accent-line)}
 .etsy-shop-row{display:flex;gap:10px;align-items:stretch}
 .etsy-shop-row .btn{flex:none;height:44px;white-space:nowrap}
 .etsy-field{flex:1;min-width:0;margin:0}
 .etsy-field select,.etsy-field input{width:100%;height:44px;margin:0;border-radius:12px;border:1px solid var(--rule-2);background:var(--card);color:var(--ink);font:600 15px var(--ui);padding:0 14px;box-shadow:var(--shadow-sm);transition:border-color .15s,box-shadow .15s}
 .etsy-field select{appearance:none;-webkit-appearance:none;padding-right:40px;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238C7E75' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;background-size:16px}
 .etsy-field select:hover,.etsy-field input:hover{border-color:var(--accent-line)}
 .etsy-field select:focus,.etsy-field input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
 .etsy-shop-meta{display:flex;align-items:center;gap:8px;margin:-6px 0 0;color:var(--ink-3);font-size:12.5px}
 .etsy-shop-meta svg{width:14px;height:14px;flex:none}
 .etsy-first-shop{display:flex;gap:10px;flex:1}
 .etsy-first-shop .btn{flex:none;height:44px}
 .etsy-drop{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:1.5px dashed var(--rule-2);border-radius:14px;padding:28px 18px;text-align:center;cursor:pointer;background:var(--card);transition:border-color .2s,background .2s,transform .2s}
 .etsy-drop:hover{border-color:var(--accent)}
 .etsy-drop:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
 .etsy-drop.over{border-color:var(--accent);background:var(--accent-soft);transform:scale(1.01)}
 .etsy-drop.disabled{opacity:.5;cursor:not-allowed}
 .etsy-drop-icon{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:var(--accent-soft);margin-bottom:6px;transition:transform .2s}
 .etsy-drop:hover .etsy-drop-icon{transform:translateY(-2px)}
 .etsy-drop-icon svg{width:22px;height:22px;color:var(--accent)}
 .etsy-drop b{font-size:15px}
 .etsy-drop small{color:var(--ink-3);font-size:12.5px}
 .etsy-drop-btn{margin-top:10px;pointer-events:none}
 .etsy-step h3{margin:10px 0 4px}
 .grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
 .etsy-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}
 @media (max-width:760px){.etsy-import-top{grid-template-columns:1fr}.etsy-import-step+.etsy-import-step{border-left:0;border-top:1px solid var(--rule)}.etsy-import-step{padding:20px}.grid3,.etsy-kpis{grid-template-columns:1fr}.top-left{flex-wrap:wrap;row-gap:6px}.shop-control{order:3;flex-basis:100%;margin-left:0}.shop-control .month-control-label{display:none}.shop-control select{max-width:none;width:100%;height:34px}}
 @media print{.shop-control{display:none}}
 /* chart kit */
 .kit-pie{display:grid;grid-template-columns:minmax(150px,200px) 1fr;gap:22px;align-items:center}
 .kit-pie svg{width:100%;height:auto;max-width:200px;overflow:visible;flex-shrink:1}
 .kit-seg{stroke:var(--card);stroke-width:2;stroke-linejoin:round;transform-origin:90px 90px;transform-box:view-box;animation:kit-pop .7s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i)*80ms);transition:transform .2s;cursor:pointer}
 .kit-seg:hover,.kit-seg:focus{transform:scale(1.045);outline:none}
 .kit-mid{font:800 20px var(--num);fill:var(--ink);text-anchor:middle}
 .kit-mid-sub{font:600 9px var(--ui);letter-spacing:.08em;fill:var(--ink-3);text-anchor:middle}
 .kit-key{display:grid;gap:4px;min-width:0}
 .kit-key-row{display:grid;grid-template-columns:auto 1fr auto auto;gap:10px;align-items:center;padding:6px 8px;border-radius:8px;font-size:14px}
 .kit-key-row:hover,.kit-key-row:focus{background:var(--sunk);outline:none}
 .kit-key-row span{min-width:0;overflow:hidden;text-overflow:ellipsis}
 .kit-key-row small{display:block;color:var(--ink-3);font-size:12px}
 .kit-key-row em{font-style:normal;color:var(--ink-2);font-size:13px}
 .kit-gauge{display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px}
 .kit-gauge svg{width:100%;height:auto;max-width:220px;flex-shrink:1}
 .kit-gauge-track,.kit-gauge-val{fill:none;stroke-width:14;stroke-linecap:round}
 .kit-gauge-track{stroke:var(--sunk)}
 .kit-gauge-val{stroke:var(--accent);animation:kit-fill 1.1s cubic-bezier(.2,.8,.2,1) both}
 .kit-gauge-num{font:800 24px var(--num);fill:var(--ink);text-anchor:middle}
 .kit-gauge small{color:var(--ink-3);font-size:12px}
 .kit-gauges{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
 .kit-gauge-pair{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
 .kit-gauge-pair .kit-gauge svg{max-width:150px}
 .kit-counts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px;text-align:center}
 .kit-counts b{display:block;font:800 24px var(--num)}
 .kit-counts small{color:var(--ink-3);font-size:12px}
 .kit-spark{display:block;width:100%;max-width:140px;height:30px;margin:6px 0 2px;flex-shrink:1}
 .kit-spark polyline{fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:100;animation:kit-draw 1.2s ease-out both}
 .kit-spark circle{transform-box:fill-box;transform-origin:center;animation:kit-beat 2.4s ease-in-out 1.2s infinite}
 .kit-line svg,.kit-scatter svg{width:100%;height:auto;overflow:visible}
 .kit-path{fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:100;animation:kit-draw 1.2s ease-out both;animation-delay:calc(var(--i)*150ms)}
 .kit-dot{stroke:var(--card);stroke-width:2;transform-box:fill-box;transform-origin:center;animation:kit-pop .5s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i)*25ms);cursor:pointer;transition:transform .15s}
 .kit-scatter .kit-dot{fill:var(--accent);fill-opacity:.8}
 .kit-scatter .kit-dot-zero{fill:var(--cat-6);fill-opacity:.55}
 .kit-dot:hover,.kit-dot:focus{transform:scale(1.6);outline:none}
 .kit-axis{font:500 11px var(--ui);fill:var(--ink-3)}
 .kit-axis-title{font:600 11px var(--ui);fill:var(--ink-2)}
 .kit-bar{stroke:var(--card);stroke-width:2;transform-box:fill-box;transform-origin:bottom;animation:kit-grow .8s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i)*40ms)}
 .kit-col{cursor:pointer;outline:none}
 .kit-key-line{display:inline-block;width:14px;height:3px;border-radius:2px;vertical-align:middle;margin-right:6px}
 .kit-col:hover .kit-bar,.kit-col:focus .kit-bar{filter:brightness(1.08)}
 @keyframes kit-grow{from{transform:scaleY(0)}}
 .kit-shop-pie .kit-pie{max-width:640px}
 .kit-heat td[data-tip]{transition:filter .15s}
 .kit-heat td[data-tip]:hover{filter:brightness(1.08)}
 .kit-heat td small{opacity:.8}
 .kit-tile{transition:transform .2s ease,box-shadow .2s ease}
 .kit-tile:hover{transform:translateY(-2px);box-shadow:var(--shadow-md)}
 .kit-pulse{display:flex;align-items:center;gap:16px;padding:14px 18px;background:linear-gradient(90deg,var(--accent-soft),var(--card))}
 .kit-live{flex:none;width:10px;height:10px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 0 var(--accent);animation:kit-ring 2s ease-out infinite}
 .kit-pulse-track{position:relative;flex:1;min-height:42px}
 .kit-pulse-track p{position:absolute;inset:0;display:flex;align-items:center;margin:0;opacity:0;transform:translateY(8px);transition:opacity .5s,transform .5s;pointer-events:none}
 .kit-pulse-track p.on{opacity:1;transform:none;pointer-events:auto}
 .kit-pulse-nav{display:flex;gap:6px;flex:none}
 .kit-pulse-nav button{width:8px;height:8px;min-height:0;padding:0;border:0;border-radius:4px;background:var(--rule-2);cursor:pointer;transition:width .3s,background .3s}
 .kit-pulse-nav button[aria-pressed="true"]{width:22px;background:var(--accent)}
 @keyframes kit-pop{from{opacity:0;transform:scale(.55)}}
 @keyframes kit-draw{from{stroke-dashoffset:100}}
 @keyframes kit-fill{from{stroke-dasharray:0 100}}
 @keyframes kit-beat{50%{transform:scale(1.6);opacity:.55}}
 @keyframes kit-ring{0%{box-shadow:0 0 0 0 color-mix(in oklab,var(--accent) 55%,transparent)}100%{box-shadow:0 0 0 12px transparent}}
 @media (max-width:760px){.kit-pie{grid-template-columns:1fr;justify-items:center}.kit-key{width:100%}.kit-gauges{grid-template-columns:1fr 1fr}.kit-pulse{flex-wrap:wrap}.kit-pulse-track{min-height:64px;flex-basis:calc(100% - 30px)}}
 @media (prefers-reduced-motion:reduce){.kit-seg,.kit-gauge-val,.kit-spark polyline,.kit-spark circle,.kit-path,.kit-dot,.kit-live,.kit-bar{animation:none!important}.kit-tile,.kit-seg,.kit-dot,.kit-pulse-track p{transition:none!important}}
 @media print{.kit-pie{break-inside:avoid}.kit-seg,.kit-gauge-val,.kit-spark polyline,.kit-path,.kit-dot{animation:none!important}}
 </style>`);

 Object.assign(Ext,{
  views:{dashboard:dashboardView,'etsy-import':importView,shops:shopsView,fees:feesView,products:productsView,coupons:couponsView,customers:customersView,reviews:reviewsView,seasonality:seasonalityView},
  afterRender,annualTop,plNote,importRefine,
  importTag:(name,rows)=>{const id='i'+Budget.uid().replace(/[^A-Za-z0-9]/g,'').slice(0,20),dates=rows.map(r=>r.date).sort();
   state.etsy.imports.push({id,shop:state.settings.shop||'',kind:'bank',name:String(name||'Bank CSV').slice(0,160),at:today(),rows:rows.length,...(dates.length?{from:dates[0],to:dates.at(-1)}:{})});
   if(state.etsy.imports.length>2000)state.etsy.imports.splice(0,state.etsy.imports.length-2000);return {imp:id};},
  printScope:()=>` · ${esc(scopeName())}`,
  txTag:()=>state.settings.shop?{shop:state.settings.shop}:{},
 });
 // books imported before estimates existed get them on first open
 if(state.etsy?.orders.length&&D.syncEstimates(state,{today:today()})){Budget.invalidate(state);save();}
 return {range,orderTable,shopForm,readFiles,runImport,get session(){return session;}};
})();
