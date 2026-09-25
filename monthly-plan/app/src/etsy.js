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
 const KINDS={statement:'Payment account statement',orders:'Sold order items',listings:'Listings',reviews:'Reviews'};
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
 // One file in, one parsed file out. The kind comes from the header row, never from the file name.
 function read(name,text){
  const out={name:String(name||'file').slice(0,160),kind:null,records:[],items:[],issues:[],notes:[],currency:'',from:'',to:''};
  try{const t=String(text).replace(/^﻿/,'').trim();let r;
   if(/^[[{]/.test(t)){out.kind='reviews';r=reviews(JSON.parse(t));}
   else{const d=CSV.detect(t),rows=CSV.parse(d.text,d.delimiter),at=rows.slice(0,5).findIndex(x=>kindOf(x.cells));
    if(at<0){out.error=`Not an Etsy export this app reads. First row: ${(rows[0]?.cells||[]).slice(0,6).join(', ').slice(0,120)}`;return out;}
    const headers=rows[at].cells;out.kind=kindOf(headers);r={statement,orders:soldItems,listings}[out.kind](rows.slice(at+1),headers);}
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
  if(file.kind==='statement'){
   const other=clash(file.records.map(x=>x.ref).filter(x=>x[0]==='o'));if(other){r.error=`These orders are already in ${shopName(other)}. Choose that shop, or check the file.`;return r;}
   const bySrc=new Map();s.transactions.forEach(t=>{if(t.src)bySrc.set(t.src,t);});
   for(const x of file.records){const src=hash(shop+'|'+x.key),old=bySrc.get(src);
    if(old){if(old.amount===x.amount)r.same++;else{r.updated++;r.months.add(x.date.slice(0,7));if(!dry)old.amount=x.amount;}continue;}
    r.added++;r.months.add(x.date.slice(0,7));if(!dry)s.transactions.push({id:uid(),date:x.date,category:x.category,amount:x.amount,note:x.note,shop,...(x.ref?{ref:x.ref}:{}),src});}
  }else if(file.kind==='orders'){
   const other=clash(file.records.map(o=>'o'+o.id));if(other){r.error=`These orders are already in ${shopName(other)}. Choose that shop, or check the file.`;return r;}
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
  }else if(file.kind==='reviews'){
   const other=clash(file.records.filter(x=>x.order).map(x=>'o'+x.order));if(other){r.error=`These reviews are for orders in ${shopName(other)}. Choose that shop, or check the file.`;return r;}
   const ids=new Set(E.reviews.map(x=>x.id));
   for(const x of file.records){if(ids.has(x.id)){r.same++;continue;}ids.add(x.id);r.added++;if(!dry)E.reviews.push({...x,shop});}
  }
  if(!dry){E.imports.push({shop,kind:file.kind,name:file.name,at:today,rows:file.records.length});if(E.imports.length>2000)E.imports.splice(0,E.imports.length-2000);}
  return r;
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
  const orders=new Set(tx.filter(t=>t.category==='etsy-sales'&&t.amount>0).map(t=>t.ref||t.id)).size,takeHome=revenue-etsyCosts;
  return {from,to,sales,buyerTax,refunds,revenue,fees,marketing,etsyCosts,ads,plus:amt('etsy-plus'),labels:amt('shipping-labels'),credits,deposits:amt('etsy-deposit'),takeHome,orders,
   aov:orders?Math.round(revenue/orders):0,costShare:revenue>0?etsyCosts/revenue:null,adsShare:revenue>0?ads/revenue:null,profit:p.net,pl:p,lines:by};
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
  for(const m of months)m.statement=B.transactions(s,m.month).some(t=>t.ref||X.revenue.includes(t.category));
  return months;
 }
 const forShop=(s,id)=>({...s,settings:{...s.settings,shop:id}});
 function compare(s,from=ALL.from,to=ALL.to){
  return s.shops.map(shop=>{const v=forShop(s,shop.id),m=summary(v,from,to),r=reviewStats(v,from,to);
   return {...shop,...m,soldOrders:ordersIn(v,from,to).length,listings:v.etsy.listings.filter(l=>l.shop===shop.id).length,reviews:r.count,rating:r.avg};});
 }
 return {KINDS,ALL,hash,titleKey,sameTitle,kindOf,money,classify,read,merge,summary,orderBook,products,coupons,customers,reviewStats,seasonality,orderMonths,compare,forShop,scoped};
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
 const bars=(rows,max,fmtv=fmt)=>`<div class="etsy-bars">${rows.map(([label,n,note])=>`<div class="etsy-bar"><span>${esc(label)}</span><i><b style="width:${max>0?Math.max(0,Math.min(100,n/max*100)):0}%"></b></i><strong class="number">${fmtv(n)}</strong>${note?`<small>${note}</small>`:''}</div>`).join('')}</div>`;
 const colors=['var(--cat-1)','var(--cat-2)','var(--cat-3)','var(--cat-4)','var(--cat-5)','var(--cat-6)'];

 // ---------- dashboard ----------
 function dashboardView(){
  const m=selected,prev=Budget.shift(m,-1),S=D.summary(state,m+'-01',Budget.endOf(m)),L0=D.summary(state,prev+'-01',Budget.endOf(prev));
  const y=m.slice(0,4),cutoff=today().slice(0,7),months=Array.from({length:12},(_,i)=>`${y}-${String(i+1).padStart(2,'0')}`),series=months.map(x=>x<=cutoff?D.summary(state,x+'-01',Budget.endOf(x)):null);
  const orders=D.orderBook(state,m+'-01',Budget.endOf(m)),parts=[['Etsy fees',S.fees,'var(--cat-2)'],['Ads & Etsy Plus',S.marketing,'var(--cat-4)'],['Shipping labels',S.labels,'var(--cat-3)'],['Take-home after labels',Math.max(0,S.takeHome-S.labels),'var(--ok)']];
  const split=S.revenue>0?`<div class="etsy-split" role="img" aria-label="Where each sale went">${parts.map(([n,v,c])=>v>0?`<i style="width:${v/S.revenue*100}%;background:${c}" title="${esc(n)} ${fmt(v)}"></i>`:'').join('')}</div><div class="legend">${parts.map(([n,v,c])=>`<span><i class="dot" style="background:${c}"></i>${esc(n)} <b class="number">${pc(S.revenue>0?v/S.revenue:null,0)}</b></span>`).join('')}</div>`:'';
  const fresh=['statement','orders','listings','reviews'].map(k=>{const last=D.scoped(state,state.etsy.imports).filter(x=>x.kind===k).map(x=>x.at).sort().at(-1);return `<span class="pill">${D.KINDS[k]}: ${last?dateName(last):'not yet'}</span>`;}).join(' ');
  const multi=!state.settings.shop&&state.shops.length>1?D.compare(state,m+'-01',Budget.endOf(m)):null;
  return pagehead(monthName(m),`${esc(scopeName())} at a glance`,'Take-home is revenue after sales tax buyers paid, refunds and every Etsy fee, ad and subscription.',button('Import Etsy files','go-etsy-import','primary')+button('Print summary','print','quiet'))+
   (!hasData()?`<section class="card"><div class="cardhead"><div><h2>Three steps to your first numbers</h2><p>Everything stays in this browser.</p></div></div><div class="grid3">${[['1','Add your shop','Name each Etsy shop you run. You can add more later.','etsy-add-shop','Add a shop'],['2','Download from Etsy','Your payment account statement and sold order items, plus listings and reviews if you like.','go-etsy-import','Where to find them'],['3','Drop them in','Choose the shop and drop the files together. Duplicates are skipped.','go-etsy-import','Import files']].map(([n,t,b,a,l])=>`<div class="etsy-step"><span class="pill">${n}</span><h3>${t}</h3><p class="small muted">${b}</p>${button(l,a,'small')}</div>`).join('')}</div></section>`:'')+
   `<div class="kpis etsy-kpis">${kpi('Take-home',S.takeHome,change(S.takeHome,L0.takeHome),'coins',S.takeHome<0?'warn':'')}${kpi(L.income,S.revenue,`${fmt(S.sales)} paid − ${fmt(S.buyerTax)} buyer tax${S.refunds?' − '+fmt(S.refunds)+' refunds':''}`,'down')}${stat('Etsy costs',pc(S.costShare),`${fmt(S.etsyCosts)} of ${L.income.toLowerCase()} · last month ${pc(L0.costShare)}`)}${stat('Ads',pc(S.adsShare),`${fmt(S.ads)} Etsy &amp; Offsite Ads · last month ${pc(L0.adsShare)}`)}${stat('Orders',num(S.orders),change(S.orders,L0.orders,false))}${kpi('Average order',S.aov,L0.aov?'Last month '+fmt(L0.aov):'After buyer tax','wallet')}</div>`+
   (S.revenue>0?`<section class="card"><div class="cardhead"><div><h2>Where each sale went</h2><p>${monthName(m)} · share of ${fmt(S.revenue)} ${L.income.toLowerCase()}</p></div><button class="link" data-go="fees">Fees &amp; ads</button></div>${split}</section>`:'')+
   (()=>{const mm=D.orderMonths(state,y)[+m.slice(5,7)-1];return mm.orders&&!mm.statement?`<div class="notice"><span><b>${monthName(m)}: ${num(mm.orders)} orders, ${fmt(mm.sales)} in sales</b> from your sold order items. Import this month’s payment account statement to see fees and take-home.</span>${button('Import statement','go-etsy-import','small')}</div>`:'';})()+
   Biz.dashboard()+
   (multi?`<section class="card table-card"><div class="cardhead"><div><h2>Shop by shop</h2><p>${monthName(m)}</p></div><button class="link" data-go="shops">Compare shops</button></div><div class="table-wrap"><table><thead><tr><th>Shop</th><th class="num">${L.income}</th><th class="num">Etsy costs</th><th class="num">Take-home</th><th class="num">Orders</th></tr></thead><tbody>${multi.map(x=>`<tr><td><button class="link" data-action="etsy-scope" data-shop="${x.id}">${esc(x.name)}</button></td><td class="num">${fmt(x.revenue)}</td><td class="num">${fmt(x.etsyCosts)} <span class="dim">${pc(x.costShare,0)}</span></td><td class="num"><b>${Biz.acct(x.takeHome)}</b></td><td class="num">${num(x.orders)}</td></tr>`).join('')}</tbody></table></div></section>`:'')+
   (series.some(x=>x&&(x.revenue||x.takeHome))?`<section class="card"><div class="cardhead"><div><h2>${y} month by month</h2><p>${L.income} and take-home · future months are blank</p></div></div>${areaChart([{name:L.income,values:series.map(x=>x?x.revenue:null),color:'var(--ch-in)'},{name:'Take-home',values:series.map(x=>x?x.takeHome:null),color:'var(--accent)'}],months.map(shortMonth),`${L.income} and take-home by month`)}</section>`:'')+
   `<section class="card table-card"><div class="cardhead"><div><h2>Latest orders</h2><p>${monthName(m)} · rebuilt from the payment account statement</p></div><button class="link" data-go="fees">All orders</button></div>${orders.length?orderTable(orders.slice(0,8)):empty('No orders this month','Import this month’s payment account statement.','go-etsy-import','Import Etsy files')}</section>`+
   `<div class="notice no-print"><span><b>Last imports</b><br>${fresh}</span>${button('Import Etsy files','go-etsy-import','small')}</div>`;
 }
 function orderTable(list){
  return `<div class="table-wrap"><table class="etsy-orders"><thead><tr><th>Order</th><th>Date</th>${state.settings.shop||state.shops.length<2?'':'<th>Shop</th>'}<th class="num">Buyer paid</th><th class="num">Buyer tax</th><th class="num">Etsy fees</th><th class="num">Take-home</th><th class="num">Kept</th></tr></thead><tbody>${list.map(o=>`<tr><td><b>#${esc(o.id)}</b>${o.item?`<small class="dim etsy-item">${esc(o.item)}</small>`:''}</td><td>${dateName(o.date)}</td>${state.settings.shop||state.shops.length<2?'':`<td>${esc(shopName(o.shop))}</td>`}<td class="num">${fmt(o.sale-o.refund)}</td><td class="num">${o.tax?'−'+fmt(o.tax):'—'}</td><td class="num">−${fmt(o.fees)}</td><td class="num"><b>${Biz.acct(o.takeHome)}</b></td><td class="num">${pc(o.revenue>0?o.takeHome/o.revenue:null,0)}</td></tr>`).join('')}</tbody></table></div>`;
 }
 // ---------- fees & ads ----------
 function feesView(){
  const r=range(),S=D.summary(state,r.from,r.to),y=selected.slice(0,4),cutoff=today().slice(0,7),months=Array.from({length:12},(_,i)=>`${y}-${String(i+1).padStart(2,'0')}`);
  const ms=months.map(m=>m<=cutoff?D.summary(state,m+'-01',Budget.endOf(m)):null);
  const lines=[...S.pl.opex.groups.filter(g=>Budget.GROUP_DEFS[g.id]?.etsy).flatMap(g=>g.lines)].filter(l=>l.amount>0).sort((a,b)=>b.amount-a.amount);
  const mix=lines.slice(0,5).map((l,i)=>[l.name,l.amount,colors[i],`${pc(l.amount/S.etsyCosts,0)} of Etsy costs · ${pc(S.revenue>0?l.amount/S.revenue:null)} of ${L.income.toLowerCase()}`]),rest=lines.slice(5).reduce((n,l)=>n+l.amount,0);if(rest)mix.push(['Other Etsy costs',rest,colors[5],'']);
  const orders=span==='month'?D.orderBook(state,r.from,r.to):[];
  return pagehead('Fees & ads',`What Etsy kept · ${esc(r.label)}`,'Fee credits, Etsy Plus credits and Share &amp; Save refunds are taken off the fee they belong to.',button('Print','print','quiet'))+spanControl()+
   `<div class="kpis">${kpi('Etsy costs',S.etsyCosts,`${pc(S.costShare)} of ${fmt(S.revenue)} ${L.income.toLowerCase()}`,'up')}${kpi('Etsy &amp; Offsite Ads',S.ads,`${pc(S.adsShare)} of ${L.income.toLowerCase()}`,'spark')}${kpi('Credits &amp; refunds of fees',S.credits,'Already taken off the fees','check')}${kpi('Take-home',S.takeHome,`${pc(S.revenue>0?S.takeHome/S.revenue:null)} of ${L.income.toLowerCase()} · deposits ${fmt(S.deposits)}`,'coins',S.takeHome<0?'warn':'')}</div>`+
   `<div class="grid2 equal"><section class="card"><div class="cardhead"><div><h2>Fee breakdown</h2><p>${esc(r.label)} · after credits</p></div></div>${mix.length?donutMarkup(mix,S.etsyCosts,'Etsy costs'):noData('statement lines')}</section>`+
   `<section class="card"><div class="cardhead"><div><h2>Statement lines</h2><p>${esc(r.label)}</p></div></div>${[['Order payments',S.sales],['Sales tax &amp; VAT buyers paid',-S.buyerTax],['Refunds to buyers',-S.refunds],[`<b>${L.income}</b>`,S.revenue],...lines.map(l=>[esc(l.name),-l.amount]),['<b>Take-home</b>',S.takeHome],['Shipping labels bought on Etsy',-S.labels],['Paid out to your bank',S.deposits]].filter(([,n],i)=>n||i===3).map(([k,n])=>`<div class="row"><span>${k}</span><span class="number">${Biz.acct(n)}</span></div>`).join('')}</section></div>`+
   (ms.some(x=>x&&(x.revenue||x.ads))?`<section class="card"><div class="cardhead"><div><h2>Ad spend against ${L.income.toLowerCase()}, ${y}</h2><p>Hover a month for ads as a share of ${L.income.toLowerCase()}</p></div></div>${compareBarChart([{name:L.income,values:ms.map(x=>x?x.revenue:null),color:'var(--ch-in)'},{name:'Etsy & Offsite Ads',values:ms.map(x=>x?x.ads:null),color:'var(--cat-4)'}],months.map(shortMonth),'Revenue and ad spend by month')}</section>`+
    `<section class="card table-card"><div class="cardhead"><div><h2>Month by month, ${y}</h2><p>Costs as a share of ${L.income.toLowerCase()}</p></div></div><div class="table-wrap"><table><thead><tr><th>Month</th><th class="num">${L.income}</th><th class="num">Etsy fees</th><th class="num">Ads &amp; Plus</th><th class="num">Etsy costs</th><th class="num">Ads %</th><th class="num">Take-home</th></tr></thead><tbody>${months.map((m,i)=>{const x=ms[i];return x?`<tr><td><button class="link" data-action="select-month" data-month="${m}">${shortMonth(m)}</button></td><td class="num">${fmt(x.revenue)}</td><td class="num">${fmt(x.fees)}</td><td class="num">${fmt(x.marketing)}</td><td class="num">${fmt(x.etsyCosts)} <span class="dim">${pc(x.costShare,0)}</span></td><td class="num">${pc(x.adsShare)}</td><td class="num"><b>${Biz.acct(x.takeHome)}</b></td></tr>`:`<tr><td>${shortMonth(m)}</td><td class="num dim" colspan="6">—</td></tr>`;}).join('')}</tbody></table></div></section>`:'')+
   (span==='month'?`<section class="card table-card"><div class="cardhead"><div><h2>Every order in ${monthName(selected)}</h2><p>${orders.length} order${orders.length===1?'':'s'} · what the buyer paid, less tax and Etsy’s fees</p></div>${orders.length>25?button(ordersAll?'Show fewer':'Show all','etsy-orders-all','small quiet'):''}</div>${orders.length?orderTable(ordersAll?orders:orders.slice(0,25)):noData('statement lines')}</section>`:
    `<div class="notice no-print"><span>Choose <b>Month</b> to see every order rebuilt from the statement: sale − buyer tax − fees = take-home.</span></div>`);
 }
 // ---------- products & listings ----------
 function productsView(){
  const r=range(),R=D.products(state,r.from,r.to),shown=productsAll?R.list:R.list.slice(0,25);
  const health=R.listings.filter(l=>l.flags.length).sort((a,b)=>b.flags.length-a.flags.length||a.title.localeCompare(b.title));
  return pagehead('What sells',`Products &amp; listings · ${esc(r.label)}`,'From sold order items. Revenue is at list price before discounts, then after each order’s discount is shared across its items.',scopeNote())+spanControl()+
   (R.list.length?`<div class="kpis">${stat('Products sold',num(R.list.length),`${num(R.units)} units in ${num(R.orders)} orders`)}${kpi('Sales at list price',R.total,'Before discounts','tags')}${stat('Top 5 share',pc(R.top(5),0),`Top 10: ${pc(R.top(10),0)} of list-price sales`)}${stat('Listings never sold',R.listings.length?num(R.unsold.length):'—',R.listings.length?`of ${num(R.listings.length)} listings in this period`:'Import your listings file')}</div>`+
    `<section class="card table-card"><div class="cardhead"><div><h2>Best sellers</h2><p>${esc(r.label)} · by list-price sales</p></div>${R.list.length>25?button(productsAll?'Show top 25':`Show all ${R.list.length}`,'etsy-products-all','small quiet'):''}</div><div class="table-wrap"><table><thead><tr><th>#</th><th>Product</th><th class="num">Units</th><th class="num">Orders</th><th class="num">List price sales</th><th class="num">After discounts</th><th class="num">Share</th></tr></thead><tbody>${shown.map((p,i)=>`<tr><td class="dim">${i+1}</td><td>${esc(p.name)}${!state.settings.shop&&state.shops.length>1?`<small class="dim etsy-item">${esc(shopName(p.shop))}</small>`:''}</td><td class="num">${num(p.units)}</td><td class="num">${num(p.orders)}</td><td class="num">${fmt(p.list)}</td><td class="num">${fmt(p.net)}</td><td class="num">${pc(R.total?p.list/R.total:null)}</td></tr>`).join('')}</tbody></table></div></section>`:noData('sold order items'))+
   (R.listings.length?`<div class="grid2 equal"><section class="card"><div class="cardhead"><div><h2>Price against sales</h2><p>Your listings by today’s price · sales in this period</p></div></div><div class="table-wrap"><table><thead><tr><th>Price</th><th class="num">Listings</th><th class="num">Selling</th><th class="num">Units</th><th class="num">Sales</th></tr></thead><tbody>${R.bands.map(b=>`<tr><td>${esc(b.label)}</td><td class="num">${b.listings}</td><td class="num">${b.selling}</td><td class="num">${num(b.units)}</td><td class="num">${fmt(b.list)}</td></tr>`).join('')}</tbody></table></div></section>`+
    `<section class="card"><div class="cardhead"><div><h2>Listing health</h2><p>${R.listings.length} listings · Etsy allows 10 photos, 13 tags and a 140-character title</p></div></div>${bars([['Full marks',R.health.ok],['Fewer than 10 photos',R.health.photos],['Fewer than 13 tags',R.health.tags],['Title under 40 characters',R.health.title]],R.listings.length,num)}</section></div>`+
    `<section class="card table-card"><div class="cardhead"><div><h2>Listings with no sales</h2><p>${esc(r.label)} · ${R.unsold.length} of ${R.listings.length}. Listings meet their sales on the start of the title (Etsy’s listings file has no listing number), so a renamed listing can show here.</p></div></div>${R.unsold.length?`<div class="table-wrap"><table><thead><tr><th>Listing</th><th class="num">Price</th><th class="num">In stock</th><th>Could be better</th></tr></thead><tbody>${R.unsold.slice(0,60).map(l=>`<tr><td>${esc(l.title)}</td><td class="num">${fmt(l.price)}</td><td class="num">${num(l.qty)}</td><td>${l.flags.map(f=>`<span class="pill">${esc(f)}</span>`).join(' ')||'<span class="dim">—</span>'}</td></tr>`).join('')}</tbody></table></div>`:'<p class="small muted">Every listing sold at least once in this period.</p>'}</section>`+
    `<section class="card table-card"><div class="cardhead"><div><h2>Listings to improve</h2><p>${health.length} listing${health.length===1?'':'s'} short of photos, tags or title words</p></div></div>${health.length?`<div class="table-wrap"><table><thead><tr><th>Listing</th><th class="num">Photos</th><th class="num">Tags</th><th class="num">Title length</th><th class="num">Units sold</th></tr></thead><tbody>${health.slice(0,60).map(l=>`<tr><td>${esc(l.title)}</td><td class="num ${l.photos<10?'warn':''}">${l.photos}</td><td class="num ${l.tags<13?'warn':''}">${l.tags}</td><td class="num ${l.title.length<40?'warn':''}">${l.title.length}</td><td class="num">${num(l.units)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="small muted">Every listing uses all 10 photos, all 13 tags and a full title.</p>'}</section>`
    :`<section class="card">${noData('listings')}</section>`);
 }
 // ---------- coupons & discounts ----------
 function couponsView(){
  const r=range(),C=D.coupons(state,r.from,r.to),y=selected.slice(0,4),months=Array.from({length:12},(_,i)=>`${y}-${String(i+1).padStart(2,'0')}`),mm=new Map(C.months.map(x=>[x.month,x]));
  return pagehead('What sells',`Coupons &amp; discounts · ${esc(r.label)}`,'From sold order items. A discount is counted once per order, however many items it had.',scopeNote())+spanControl()+
   (C.orders?`<div class="kpis">${stat('Orders discounted',pc(C.share,0),`${num(C.discounted)} of ${num(C.orders)} orders`)}${kpi('Discounts given',C.discount+C.shipDiscount,C.shipDiscount?`incl. ${fmt(C.shipDiscount)} off shipping`:`${pc(C.list?C.discount/C.list:null)} of list price`,'tags')}${kpi('List price',C.list,'Items before any discount','wallet')}${kpi('Paid for items',C.paid,'List price − discounts','down')}</div>`+
    `<div class="grid2 equal"><section class="card"><div class="cardhead"><div><h2>List price against paid</h2><p>${esc(r.label)}</p></div></div>${bars([['List price',C.list],['Discounts',C.discount],['Paid for items',C.paid]],C.list)}</section>`+
    `<section class="card table-card"><div class="cardhead"><div><h2>By coupon code</h2><p>Sales and offers without a code are grouped together</p></div></div>${C.codes.length?`<div class="table-wrap"><table><thead><tr><th>Code</th><th class="num">Orders</th><th class="num">Discount</th><th class="num">Average</th></tr></thead><tbody>${C.codes.map(c=>`<tr><td>${c.code?`<b>${esc(c.code)}</b>`:'<span class="dim">No code (sale or offer)</span>'}</td><td class="num">${num(c.orders)}</td><td class="num">${fmt(c.discount)}</td><td class="num">${fmt(Math.round(c.discount/c.orders))}</td></tr>`).join('')}</tbody></table></div>`:'<p class="small muted">No discounted orders in this period.</p>'}</section></div>`+
    (months.some(m=>mm.get(m))?`<section class="card"><div class="cardhead"><div><h2>Discounted orders by month, ${y}</h2><p>Hover a month for the share discounted</p></div></div>${compareBarChart([{name:'Orders',values:months.map(m=>mm.get(m)?.orders??null),color:'var(--ch-in)'},{name:'Discounted',values:months.map(m=>mm.get(m)?.discounted??null),color:'var(--cat-2)'}],months.map(shortMonth),'Orders and discounted orders by month','vertical',num)}</section>`:'')
   :`<section class="card">${noData('sold order items')}</section>`);
 }
 // ---------- customers ----------
 function customersView(){
  const r=range(),C=D.customers(state,r.from,r.to),top=C.countries.slice(0,15);
  return pagehead('What sells',`Customers · ${esc(r.label)}`,'Only the country and a scrambled buyer key are kept from the sold order items file. Names and addresses are never stored.',scopeNote())+spanControl()+
   (C.orders?`<div class="kpis">${stat('Buyers',num(C.buyers),`${num(C.orders)} orders`)}${stat('Repeat buyers',num(C.repeat),`${pc(C.buyers?C.repeat/C.buyers:null,0)} of buyers came back`)}${stat('Orders from repeat buyers',pc(C.orders?C.repeatOrders/C.orders:null,0),`${num(C.repeatOrders)} orders`)}${stat('Countries',num(C.countries.length),`Top: ${esc(C.countries[0]?.country||'—')} ${pc(C.orders?C.countries[0].orders/C.orders:null,0)}`)}</div>`+
    `<div class="grid2 equal"><section class="card"><div class="cardhead"><div><h2>Where orders go</h2><p>${esc(r.label)} · by orders</p></div></div>${bars(top.map(c=>[c.country,c.orders,`${pc(c.orders/C.orders,0)} · ${fmt(c.paid)}`]),top[0]?.orders||1,num)}</section>`+
    `<section class="card"><div class="cardhead"><div><h2>How often buyers come back</h2><p>Buyers by number of orders in this period</p></div></div>${bars(C.spread,Math.max(...C.spread.map(x=>x[1]),1),num)}<p class="small muted" style="margin-top:12px">Buyers are matched on their Etsy name as it appears in the export, so a buyer who changed it counts twice.</p></section></div>`
   :`<section class="card">${noData('sold order items')}</section>`);
 }
 // ---------- reviews ----------
 function reviewsView(){
  const r=range(),R=D.reviewStats(state,r.from,r.to),stars=n=>'★'.repeat(n)+'☆'.repeat(5-n),recentMonths=R.months.slice(-24);
  return pagehead('What buyers say',`Reviews · ${esc(r.label)}`,'From reviews.json.',scopeNote())+spanControl()+
   (R.count?`<div class="kpis">${stat('Average rating',R.avg.toFixed(2),`${num(R.count)} reviews`)}${stat('5 stars',pc(R.dist[4]/R.count,0),`${num(R.dist[4])} reviews`)}${stat('4 stars',pc(R.dist[3]/R.count,0),`${num(R.dist[3])} reviews`)}${stat('3 stars or fewer',num(R.low.length),pc(R.low.length/R.count)+' of reviews',R.low.length?'warn':'')}</div>`+
    `<div class="grid2 equal"><section class="card"><div class="cardhead"><div><h2>Star ratings</h2><p>${esc(r.label)}</p></div></div>${bars([5,4,3,2,1].map(n=>[stars(n),R.dist[n-1],pc(R.dist[n-1]/R.count,0)]),Math.max(...R.dist),num)}</section>`+
    `<section class="card table-card"><div class="cardhead"><div><h2>Year by year</h2><p>Average rating and number of reviews</p></div></div><div class="table-wrap"><table><thead><tr><th>Year</th><th class="num">Reviews</th><th class="num">Average</th></tr></thead><tbody>${R.years.map(x=>`<tr><td>${x.key}</td><td class="num">${num(x.count)}</td><td class="num"><b>${x.avg.toFixed(2)}</b></td></tr>`).join('')}</tbody></table></div></section></div>`+
    (recentMonths.length>1?`<section class="card"><div class="cardhead"><div><h2>Reviews by month</h2><p>Hover a month for its average rating</p></div></div>${compareBarChart([{name:'Reviews',values:recentMonths.map(x=>x.count),color:'var(--accent)'}],recentMonths.map(x=>shortMonth(x.key)+(recentMonths.length>12?' '+x.key.slice(2,4):'')),'Reviews by month','vertical',num)}<div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Month</th>${recentMonths.slice(-12).map(x=>`<th class="num">${shortMonth(x.key)}</th>`).join('')}</tr></thead><tbody><tr><td>Average</td>${recentMonths.slice(-12).map(x=>`<td class="num">${x.avg.toFixed(2)}</td>`).join('')}</tr></tbody></table></div></section>`:'')+
    `<section class="card table-card"><div class="cardhead"><div><h2>Reviews of 3 stars or fewer</h2><p>Newest first</p></div></div>${R.low.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Stars</th><th>Review</th><th>Order</th></tr></thead><tbody>${R.low.slice(0,50).map(x=>`<tr><td class="nw">${dateName(x.date)} ${x.date.slice(0,4)}</td><td class="nw warn">${stars(x.stars)}</td><td>${esc(x.message)||'<span class="dim">No comment</span>'}</td><td class="dim">${x.order?'#'+esc(x.order):''}</td></tr>`).join('')}</tbody></table></div>`:'<p class="small muted">No reviews under 4 stars in this period.</p>'}</section>`
   :`<section class="card">${noData('reviews')}</section>`);
 }
 // ---------- seasonality ----------
 function seasonalityView(){
  const Z=D.seasonality(state),years=Z.years.slice(-3),labels=Array.from({length:12},(_,i)=>shortMonth(`2026-${String(i+1).padStart(2,'0')}`)),yc=['var(--cat-6)','var(--cat-3)','var(--accent)'].slice(-years.length);
  const avg=labels.map((_,i)=>{const v=Z.years.filter(y=>y.paid).map(y=>y.months[i].paid);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0;}),yearAvg=avg.reduce((a,b)=>a+b,0)/12||1;
  return pagehead('What sells','Seasonality',Z.source==='orders'?'Sales by calendar month, from sold order items (list price after discounts, before shipping and tax).':'Revenue by calendar month, from the payment account statement.',scopeNote())+
   (Z.years.length?`<section class="card"><div class="cardhead"><div><h2>Month against month</h2><p>${years.map(y=>y.year).join(' · ')}</p></div></div>${compareBarChart(years.map((y,i)=>({name:y.year,values:y.months.map(m=>m.paid),color:yc[i]})),labels,'Sales by calendar month')}</section>`+
    `<section class="card table-card"><div class="cardhead"><div><h2>Busy and quiet months</h2><p>Each month against an average month, across every year imported</p></div></div><div class="table-wrap"><table><thead><tr><th>Month</th>${Z.years.map(y=>`<th class="num">${y.year}</th>`).join('')}<th class="num">Against an average month</th></tr></thead><tbody>${labels.map((l,i)=>`<tr><td>${l}</td>${Z.years.map(y=>`<td class="num">${y.months[i].paid?fmt(y.months[i].paid):'<span class="dim">—</span>'}<small class="dim etsy-item">${y.months[i].orders?num(y.months[i].orders)+' orders':''}</small></td>`).join('')}<td class="num ${avg[i]>=yearAvg*1.2?'pos':avg[i]<=yearAvg*.8?'warn':''}"><b>${pc(avg[i]/yearAvg-1,0).replace(/^(?!-)/,'+')}</b></td></tr>`).join('')}<tr class="group-total"><td><b>Year</b></td>${Z.years.map(y=>`<td class="num"><b>${fmt(y.paid)}</b><small class="dim etsy-item">${num(y.orders)} orders</small></td>`).join('')}<td></td></tr></tbody></table></div></section>`
   :`<section class="card">${noData('sold order items')}</section>`);
 }
 // ---------- shops ----------
 function shopsView(){
  const r=range(span==='all'?'all':span),rows=D.compare(state,r.from,r.to),T=D.summary({...state,settings:{...state.settings,shop:''}},r.from,r.to);
  return pagehead('Your shops','Shops',`Every import belongs to one shop. Costs you log with All shops selected are shared, and count in the combined view only.`,button('＋ Add a shop','etsy-add-shop','primary'))+spanControl()+
   (rows.length?`<section class="card table-card"><div class="cardhead"><div><h2>Shop by shop</h2><p>${esc(r.label)}</p></div></div><div class="table-wrap"><table class="etsy-compare"><thead><tr><th>Shop</th><th class="num">${L.income}</th><th class="num">Etsy costs</th><th class="num">Ads</th><th class="num">Take-home</th><th class="num">Net profit</th><th class="num">Orders</th><th class="num">Average order</th><th class="num">Listings</th><th class="num">Rating</th></tr></thead><tbody>${rows.map(x=>`<tr><td><button class="link" data-action="etsy-scope" data-shop="${x.id}"><b>${esc(x.name)}</b></button></td><td class="num">${fmt(x.revenue)}</td><td class="num">${fmt(x.etsyCosts)} <span class="dim">${pc(x.costShare,0)}</span></td><td class="num">${fmt(x.ads)} <span class="dim">${pc(x.adsShare,0)}</span></td><td class="num"><b>${Biz.acct(x.takeHome)}</b></td><td class="num">${Biz.acct(x.profit)}</td><td class="num">${num(x.orders||x.soldOrders)}</td><td class="num">${x.aov?fmt(x.aov):'—'}</td><td class="num">${num(x.listings)}</td><td class="num">${x.rating?x.rating.toFixed(2):'—'}</td></tr>`).join('')}<tr class="group-total"><td><b>All shops</b><small class="dim etsy-item">incl. shared costs</small></td><td class="num"><b>${fmt(T.revenue)}</b></td><td class="num"><b>${fmt(T.etsyCosts)}</b></td><td class="num"><b>${fmt(T.ads)}</b></td><td class="num"><b>${Biz.acct(T.takeHome)}</b></td><td class="num"><b>${Biz.acct(T.profit)}</b></td><td class="num"><b>${num(T.orders)}</b></td><td class="num">${T.aov?fmt(T.aov):'—'}</td><td></td><td></td></tr></tbody></table></div></section>`+
    (rows.filter(x=>x.revenue>0).length>1?`<section class="card"><div class="cardhead"><div><h2>Take-home by shop</h2><p>${esc(r.label)}</p></div></div>${compareBarChart([{name:L.income,values:rows.map(x=>x.revenue),color:'var(--ch-in)'},{name:'Take-home',values:rows.map(x=>x.takeHome),color:'var(--accent)'}],rows.map(x=>x.name),'Revenue and take-home by shop','horizontal')}</section>`:''):'')+
   `<section class="card no-print"><div class="cardhead"><div><h2>Manage shops</h2><p>Rename a shop at any time. Deleting a shop removes everything imported into it.</p></div></div>${state.shops.map(x=>`<div class="row"><div><strong>${esc(x.name)}</strong><small>${num(state.transactions.filter(t=>t.shop===x.id).length)} statement lines · ${num(state.etsy.orders.filter(o=>o.shop===x.id).length)} orders · ${num(state.etsy.listings.filter(l=>l.shop===x.id).length)} listings · ${num(state.etsy.reviews.filter(v=>v.shop===x.id).length)} reviews</small></div><div class="actions">${button('Rename','etsy-rename-shop','small',`data-id="${x.id}"`)}${button('Delete','etsy-delete-shop','small danger',`data-id="${x.id}"`)}</div></div>`).join('')||empty('No shops yet','Add each Etsy shop you run, then import its files.','etsy-add-shop','Add a shop')}</section>`;
 }
 // ---------- year: sold orders fill the months that have no statement yet ----------
 function annualTop(y){
  const M=D.orderMonths(state,y),cutoff=today().slice(0,7),has=M.some(m=>m.orders);if(!has)return '';
  const missing=M.filter(m=>m.orders&&!m.statement),tot=k=>M.reduce((n,m)=>n+m[k],0);
  return `<section class="card"><div class="cardhead"><div><h2>Sales from your sold orders, ${y}</h2><p>From the sold order items file: item prices after discounts, plus shipping, before sales tax · ${num(tot('orders'))} orders · ${fmt(tot('sales'))}</p></div>${missing.length?button('Import statements','go-etsy-import','small'):''}</div>`+
   compareBarChart([{name:'Sales from orders',values:M.map(m=>m.month<=cutoff?m.sales:null),color:'var(--ch-in)'}],M.map(m=>shortMonth(m.month)),`Sales from sold orders by month, ${y}`)+
   `<div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Month</th>${M.map(m=>`<th class="num">${shortMonth(m.month)}</th>`).join('')}</tr></thead><tbody><tr><td>Orders</td>${M.map(m=>`<td class="num">${m.orders?num(m.orders):'<span class="dim">—</span>'}</td>`).join('')}</tr><tr><td>Statement</td>${M.map(m=>`<td class="num">${m.statement?'<span class="pos">✓</span>':m.orders?'<span class="warn">missing</span>':'<span class="dim">—</span>'}</td>`).join('')}</tr></tbody></table></div>`+
   (missing.length?`<p class="small muted" style="margin-top:12px"><b>${missing.length} month${missing.length===1?' has':'s have'} orders but no payment account statement.</b> Revenue, Etsy fees, take-home, profit and tax below only count months with a statement. Etsy lets you download one month at a time: Shop Manager → Finances → Payment account.</p>`:'')+`</section>`;
 }
 // ---------- import ----------
 let session=null;   // {shop, files:[parsed]}
 function importView(){
  const shops=state.shops,target=session?.shop||state.settings.shop||shops[0]?.id||'';
  const where=X.exports.map(([k,label,path,example])=>`<div class="row"><div><strong>${label}</strong><small>${esc(path)}</small></div><span class="pill">${esc(example)}</span></div>`).join('');
  const shopPick=shops.length?`<label>Import into<select id="etsy-import-shop">${shops.map(x=>`<option value="${x.id}" ${x.id===target?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>`:`<form id="etsy-shop-form" class="etsy-first-shop"><label>Name your shop<input name="name" maxlength="60" required placeholder="e.g. Fern &amp; Fable Prints"></label><button class="btn primary">Add shop</button></form>`;
  let preview='';
  if(session?.files.length){
   const rows=session.files.map(f=>({f,r:D.merge(clone(state),target,f,{dry:true})}));
   const ready=rows.filter(x=>!x.r.error&&(x.r.added||x.r.updated||x.r.items)).length;
   preview=`<section class="card table-card"><div class="cardhead"><div><h2>Ready to import</h2><p>${session.files.length} file${session.files.length===1?'':'s'} into <b>${esc(shopName(target)||'—')}</b></p></div><div class="actions">${button('Clear','etsy-clear','small')}${button(`Import ${ready} file${ready===1?'':'s'}`,'etsy-import','small primary',ready&&target?'':'disabled')}</div></div><div class="table-wrap"><table class="etsy-files"><thead><tr><th>File</th><th>Recognised as</th><th>Dates</th><th class="num">Rows</th><th>What happens</th></tr></thead><tbody>${rows.map(({f,r})=>`<tr><td><b>${esc(f.name)}</b>${f.issues.length?`<small class="warn etsy-item">${f.issues.length} row${f.issues.length===1?'':'s'} skipped: ${esc(f.issues.slice(0,2).join(' · '))}</small>`:''}${f.notes.map(n=>`<small class="dim etsy-item">${esc(n)}</small>`).join('')}</td><td>${f.kind?D.KINDS[f.kind]:'<span class="warn">Not recognised</span>'}</td><td class="nw">${f.from?dateName(f.from)+(f.from.slice(0,4)!==f.to.slice(0,4)?' '+f.from.slice(0,4):'')+(f.to!==f.from?' – '+dateName(f.to):'')+' '+f.to.slice(0,4):'—'}</td><td class="num">${num(f.records.length)}${f.kind==='orders'?`<small class="dim etsy-item">${num(f.items.length)} items</small>`:''}</td><td>${r.error?`<span class="warn">${esc(r.error)}</span>`:outcome(r)}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  return pagehead('Bring in your Etsy files','Import Etsy files','Choose the shop, then drop in any of Etsy’s four exports together. Each is recognised by its columns. Anything already imported is skipped.',button('Import a bank CSV','go-import','quiet'))+
   `<section class="card"><div class="grid2 equal etsy-import-top"><div>${shopPick}${shops.length?`<p class="small muted">Files go into this shop, whatever the shop picker at the top shows. ${button('＋ Add a shop','etsy-add-shop','small')}</p>`:''}</div>`+
   `<label class="etsy-drop${shops.length?'':' disabled'}" id="etsy-drop"><span>${ico('up')}</span><b>Drop Etsy files here</b><small>or choose them · .csv and reviews.json · several at once</small><input type="file" id="etsy-files" accept=".csv,.json,text/csv,application/json" multiple ${shops.length?'':'disabled'}></label></div></section>`+
   preview+
   `<section class="card"><div class="cardhead"><div><h2>Where to find each file</h2><p>Download them from Etsy on a computer. Nothing is sent anywhere: the files are read in this browser.</p></div></div>${where}<p class="small muted" style="margin-top:12px">Buyer names and addresses in the sold order items file are not stored. Only the country and a scrambled key (to count repeat buyers) are kept.</p></section>`+
   recentImports();
 }
 function outcome(r){
  if(r.kind==='listings')return r.added?`Replaces ${r.replaced} listing${r.replaced===1?'':'s'} with ${r.added}`:`No change · ${r.same} listings already here`;
  const parts=[r.added&&`${num(r.added)} new ${r.kind==='statement'?'line':r.kind==='orders'?'order':'review'}${r.added===1?'':'s'}`,r.items&&`${num(r.items)} new item${r.items===1?'':'s'}`,r.updated&&`${num(r.updated)} updated`,r.same&&`${num(r.same)} already here`,r.currency&&`currency set to ${r.currency}`].filter(Boolean);
  return parts.length?parts.join(' · '):'Nothing new';
 }
 function recentImports(){
  const list=D.scoped(state,state.etsy.imports).slice(-12).reverse();if(!list.length)return '';
  return `<section class="card table-card"><div class="cardhead"><div><h2>Recent imports</h2><p>${esc(scopeName())}</p></div></div><div class="table-wrap"><table><thead><tr><th>Imported</th><th>Shop</th><th>File</th><th>Kind</th><th class="num">Rows</th></tr></thead><tbody>${list.map(x=>`<tr><td class="nw">${dateName(x.at)}</td><td>${esc(shopName(x.shop))}</td><td>${esc(x.name)}</td><td>${D.KINDS[x.kind]}</td><td class="num">${num(x.rows)}</td></tr>`).join('')}</tbody></table></div></section>`;
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
  case 'etsy-span':span=['month','year','all'].includes(b.dataset.span)?b.dataset.span:'all';render();break;
  case 'etsy-orders-all':ordersAll=!ordersAll;render();break;
  case 'etsy-products-all':productsAll=!productsAll;render();break;
  case 'etsy-scope':if(state.shops.some(x=>x.id===b.dataset.shop))commit(()=>state.settings.shop=b.dataset.shop,`Showing ${shopName(b.dataset.shop)}`);break;
  case 'etsy-add-shop':shopForm();break;
  case 'etsy-rename-shop':shopForm(id);break;
  case 'etsy-delete-shop':{const x=state.shops.find(s=>s.id===id);if(!x)break;confirmation(`Delete ${esc(x.name)}?`,'Its statement lines, orders, listings and reviews are removed from this planner. Shared costs are kept. You can undo this change.','etsy-confirm-delete-shop','Delete shop',`data-id="${id}"`);break;}
  case 'etsy-confirm-delete-shop':{const x=state.shops.find(s=>s.id===id);if(!x)break;closeModal();commit(()=>{state.shops=state.shops.filter(s=>s.id!==id);state.transactions=state.transactions.filter(t=>t.shop!==id);
   for(const k of ['orders','items','listings','reviews','imports'])state.etsy[k]=state.etsy[k].filter(r=>r.shop!==id);if(state.settings.shop===id||state.shops.length<2)state.settings.shop='';},`${x.name} deleted`);break;}
  case 'etsy-clear':session=null;render();break;
  case 'etsy-import':runImport();break;
 }}catch(err){toast(err.message);}});
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
 .etsy-split{display:flex;height:22px;border-radius:8px;overflow:hidden;background:var(--sunk);margin:6px 0 12px}
 .etsy-split i{display:block;height:100%}
 .etsy-bars{display:grid;gap:10px}
 .etsy-bar{display:grid;grid-template-columns:minmax(90px,38%) 1fr auto;align-items:center;gap:10px;font-size:14px}
 .etsy-bar>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .etsy-bar i{display:block;height:10px;border-radius:5px;background:var(--sunk);overflow:hidden}
 .etsy-bar i b{display:block;height:100%;background:var(--accent);border-radius:5px}
 .etsy-bar small{grid-column:2/4;margin-top:-6px;color:var(--ink-3)}
 .etsy-item{display:block;font-weight:400;max-width:420px;white-space:normal}
 .etsy-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:2px dashed var(--rule-2);border-radius:var(--r-md);padding:26px 16px;text-align:center;cursor:pointer;background:var(--sunk)}
 .etsy-drop.over{border-color:var(--accent);background:var(--accent-soft)}
 .etsy-drop.disabled{opacity:.5;cursor:not-allowed}
 .etsy-drop span svg{width:28px;height:28px;color:var(--accent)}
 .etsy-drop input{max-width:100%;margin-top:8px}
 .etsy-first-shop{display:grid;gap:10px}
 .etsy-step h3{margin:10px 0 4px}
 .grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
 .etsy-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}
 @media (max-width:760px){.grid3,.etsy-kpis{grid-template-columns:1fr}.top-left{flex-wrap:wrap;row-gap:6px}.shop-control{order:3;flex-basis:100%;margin-left:0}.shop-control .month-control-label{display:none}.shop-control select{max-width:none;width:100%;height:34px}}
 @media print{.shop-control{display:none}}
 </style>`);

 Object.assign(Ext,{
  views:{dashboard:dashboardView,'etsy-import':importView,shops:shopsView,fees:feesView,products:productsView,coupons:couponsView,customers:customersView,reviews:reviewsView,seasonality:seasonalityView},
  afterRender,annualTop,
  printScope:()=>` · ${esc(scopeName())}`,
  txTag:()=>state.settings.shop?{shop:state.settings.shop}:{},
 });
 return {range,orderTable,shopForm,readFiles,runImport,get session(){return session;}};
})();
