// Drives the Etsy edition end to end in Chromium: every screen from blank and from the sample,
// adding shops, importing the four (synthetic) Etsy exports, duplicate protection, goals, costs per
// item, the pricing calculator, fee rates, the shop picker scoping every screen and printout,
// deleting a shop, reload, and phone widths.
//   node etsy_smoke.js [out-dir-for-screenshots]
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const path=require('path'),fs=require('fs'),os=require('os'),F=require('./etsy_fixtures.js');
const FILE='file://'+path.resolve(__dirname,'../app/ShopInsightsEtsy.html'),OUT=process.argv[2],KEY='jps-shop-insights';
const SCREENS=['dashboard','etsy-import','shops','pl','fees','activity','annual','products','pricing','coupons','customers','reviews','seasonality','tax','taxlines','budget','goals','scheduled','settings','guide','import'];
let fail=0;const check=(name,cond,extra='')=>{if(!cond){fail++;console.log('FAIL:',name,extra);}};
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'etsy-fixtures-'));
  for(const [n,t] of Object.entries({...F.files,...F.channels}))fs.writeFileSync(path.join(dir,n),t);
  // a second shop's statement: same layout, different order and listing numbers
  fs.writeFileSync(path.join(dir,'kiln_statement.csv'),F.statement.replace(/38123456/g,'99123456').replace(/140000000/g,'150000000'));
  const files=Object.keys(F.files).map(n=>path.join(dir,n));
  const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:1440,height:1000},locale:'en-US',timezoneId:'UTC',acceptDownloads:true,reducedMotion:'reduce'});
  const p=await ctx.newPage();await p.clock.setFixedTime(new Date('2026-09-30T10:00:00Z'));
  const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  // seed with an ordinary page script, never addInitScript (see biz_smoke.js)
  await p.goto(FILE);await p.evaluate(k=>{localStorage.setItem(k+'-welcome-v1','1');localStorage.setItem(k+'-manual-backup',String(Date.now()));},KEY);
  await p.goto(FILE);await p.waitForTimeout(300);
  const shot=async name=>{if(OUT){fs.mkdirSync(OUT,{recursive:true});await p.screenshot({path:path.join(OUT,name+'.png'),fullPage:true});}};
  const text=()=>p.locator('#content').innerText();
  const st=(f,arg)=>p.evaluate(f,arg);
  check('title',(await p.title()).startsWith('Shop Insights'));
  const nav=await p.locator('#nav').innerText();
  check('nav has the Etsy screens',['Import files','Fees & ads','Products & listings','Reviews','Schedule C summary'].every(x=>nav.includes(x)),nav);
  check('no mileage or invoices',!nav.includes('Mileage')&&!nav.includes('Invoices'));
  check('shop picker in the top bar',await p.locator('#shop-picker').count()===1);
  for(const s of SCREENS){await p.evaluate(s=>go(s),s);await shot('blank-'+s);}
  check('blank dashboard shows the first steps',(await (async()=>{await p.evaluate(()=>go('dashboard'));return text();})()).includes('Three steps to your first numbers'));

  // ---- first shop and the four exports ----
  await p.evaluate(()=>go('etsy-import'));
  check('import asks for a shop first',await p.locator('#etsy-files').isDisabled());
  await p.fill('#etsy-shop-form input[name=name]','Fern Prints');await p.click('#etsy-shop-form button');
  check('shop added',await st(()=>state.shops.length===1&&state.shops[0].name==='Fern Prints'));
  await p.setInputFiles('#etsy-files',files);await p.waitForTimeout(300);
  const pre=await text();
  check('all four files recognised',['Payment account statement','Sold order items','Listings','Reviews'].every(x=>pre.includes(x))&&!pre.includes('Not recognised'),pre.slice(0,600));
  await shot('import-preview');
  await p.click('[data-action="etsy-import"]');await p.waitForTimeout(200);
  const after=await st(()=>({tx:state.transactions.length,orders:state.etsy.orders.length,items:state.etsy.items.length,listings:state.etsy.listings.length,reviews:state.etsy.reviews.length,sel:selected,shop:state.transactions.every(t=>t.shop===state.shops[0].id)}));
  check('four files imported',after.tx>15&&after.orders===3&&after.items===4&&after.listings===3&&after.reviews===4&&after.shop,JSON.stringify(after));
  check('month jumps to the statement',after.sel==='2026-09',after.sel);
  check('no buyer names or addresses kept',!/Placeholder|Example|Fictional Lane|Testville/.test(await st(()=>localStorage.getItem('jps-shop-insights-v1'))));
  // the same files again: nothing new
  await p.evaluate(()=>go('etsy-import'));await p.setInputFiles('#etsy-files',files);await p.waitForTimeout(300);
  check('re-import finds nothing new',(await text()).includes('already here')&&await p.locator('[data-action="etsy-import"]').isDisabled());
  await p.click('[data-action="etsy-clear"]');
  // ---- the numbers on screen (synthetic ads line is $2.50 in the file) ----
  await p.evaluate(()=>go('dashboard'));const dash=await text();
  check('dashboard take-home',dash.includes('$24.77')&&dash.includes('Take-home')&&dash.includes('$43.00'),dash.slice(0,700));
  check('dashboard orders table',dash.includes('#3812345671'));
  await shot('dashboard-one-shop');
  await p.evaluate(()=>go('fees'));await p.click('[data-action="etsy-span"][data-span="month"]');
  const fees=await text();check('fees: every order',fees.includes('Every order in September 2026')&&fees.includes('$18.23'),fees.slice(0,500));
  await p.evaluate(()=>go('products'));const prod=await text();check('products',prod.includes('Botanical Fern Print')&&prod.includes('Autumn Leaves Print Set')&&prod.includes('Listing health'),prod.slice(0,400));
  await p.evaluate(()=>{selected='2026-08';go('dashboard');});const aug=await text();
  check('a month with orders but no statement is estimated from them',aug.includes('August 2026 is estimated from your sold orders')&&aug.includes('$20.50')&&aug.includes('#3812345600'),aug.slice(0,700));
  await p.evaluate(()=>{selected='2026-09';render();});
  await p.evaluate(()=>go('reviews'));await p.click('[data-action="etsy-span"][data-span="all"]');check('reviews',(await text()).includes('Arrived bent.'));
  await p.evaluate(()=>go('pl'));check('P&L buyer tax line',(await text()).includes('Sales tax & VAT paid by buyers'));

  // ---- dashboard tiles and a monthly goal ----
  await p.evaluate(()=>go('dashboard'));
  const tiles=await p.locator('.etsy-kpis .kit-tile .label').allTextContents();
  check('dashboard has eight tiles, net profit and average cash flow among them',tiles.length===8&&tiles.includes('Net profit')&&tiles.includes('Average monthly cash flow'),tiles.join(' | '));
  await p.locator('[data-action="etsy-goal"]').first().click();await p.fill('#etsy-goal-form input[name=goal]','100');await p.click('#etsy-goal-form button[type=submit]');
  check('monthly goal saved',await st(()=>Object.values(state.settings.goals||{}).join()==='10000'),JSON.stringify(await st(()=>state.settings.goals)));
  check('dashboard measures the month against the goal',(await text()).includes('of your $100.00 monthly goal'));
  // ---- cost per item: saved on change, Tab lands in the next row; the CSV carries it ----
  await p.evaluate(()=>go('products'));const costs=p.locator('input.etsy-cost');
  check('a cost box for every product',await costs.count()>=2,String(await costs.count()));
  await costs.nth(0).fill('1.50');await costs.nth(0).press('Tab');await p.waitForTimeout(100);
  const cs=await st(()=>({costs:state.etsy.costs,focus:document.activeElement?.dataset?.cost??null,next:document.querySelectorAll('input.etsy-cost')[1]?.dataset.cost}));
  check('cost saved and Tab moves to the next product',Object.values(cs.costs||{}).join()==='150'&&cs.focus!==null&&cs.focus===cs.next,JSON.stringify(cs));
  const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-action="etsy-products-csv"]')]);
  const csv=fs.readFileSync(await dl.path(),'utf8').replace(/^﻿/,'');
  check('products CSV',csv.startsWith('"Product",')&&csv.includes('Botanical Fern Print')&&csv.includes('1.50'),csv.slice(0,400));
  // ---- pricing calculator ----
  await p.evaluate(()=>go('pricing'));
  const calc=async o=>{for(const [k,v] of Object.entries(o))await p.fill(`#etsy-calc input[name=${k}]`,String(v));return p.locator('#etsy-calc-out').innerText();};
  let out=await calc({price:12,shipping:0,discount:0,ads:0,cost:1,shipCost:0,target:30});
  check('calculator: a $12 sale at US rates',out.includes('$9.41')&&out.includes('$1.59')&&out.includes('On target'),out.slice(0,500));
  out=await calc({cost:10});check('calculator: offers the price for the target margin',/Use \$\d+\.\d\d/.test(out),out.slice(0,700));
  await p.click('[data-action="etsy-calc-use"]');check('calculator: the suggested price reaches the target',(await p.locator('#etsy-calc-out').innerText()).includes('On target'));
  out=await calc({target:95});check('calculator: an unreachable margin says so',out.includes('reachable'),out.slice(0,400));
  // ---- fee rates: a preset re-estimates months without a statement ----
  const est=()=>st(()=>state.transactions.filter(t=>t.est).map(t=>t.category+':'+t.amount).sort().join());
  const before=await est();
  await p.evaluate(()=>go('settings'));await p.selectOption('#etsy-fees-form select[name=preset]','uk');
  check('a preset fills the rates',await p.inputValue('#etsy-fees-form input[name=processing]')==='4');
  await p.click('#etsy-fees-form button');
  check('fee rates saved',await st(()=>state.settings.fees?.preset==='uk'&&state.settings.fees.processing===400&&state.settings.fees.processingFixed===20),JSON.stringify(await st(()=>state.settings.fees)));
  check('estimates follow the new rates',before!==''&&await est()!==before);
  await p.selectOption('#etsy-fees-form select[name=preset]','us');await p.click('#etsy-fees-form button');
  check('back to US rates restores the estimates',await est()===before);
  // ---- transactions: filter by where a line came from ----
  await p.evaluate(()=>{selected='2026-08';go('activity');});
  check('transactions heading',(await text()).includes('Every line in your books'));
  await p.selectOption('#source-filter','estimated');
  const rows=await p.locator('.table-card tbody tr').count(),badges=await p.locator('.table-card tbody .tx-badge',{hasText:'Estimated'}).count();
  check('source filter: estimated lines only',rows>0&&badges===rows,`${rows} rows, ${badges} badges`);
  await p.selectOption('#source-filter','statement');check('source filter: no statement lines in August',(await p.locator('#filter-count').innerText()).startsWith('0 of'));
  await p.click('[data-action="clear-filters"]');check('clear filters resets the source',await p.inputValue('#source-filter')==='all');
  await p.evaluate(()=>{selected='2026-09';render();});

  // ---- a second shop from the top-bar picker ----
  await p.selectOption('#shop-picker','__add');await p.fill('#etsy-shop-form input[name=name]','Kiln Pots');await p.click('#etsy-shop-form button[type=submit]');
  check('second shop added',await st(()=>state.shops.length===2));
  await p.evaluate(()=>go('etsy-import'));
  const kilnId=await st(()=>state.shops[1].id);await p.selectOption('#etsy-import-shop',kilnId);
  // the first shop's statement is refused for the second shop
  await p.setInputFiles('#etsy-files',[files[0]]);await p.waitForTimeout(200);
  check('wrong-shop statement refused',(await text()).includes('already in Fern Prints'));
  await p.click('[data-action="etsy-clear"]');await p.selectOption('#etsy-import-shop',kilnId);
  await p.setInputFiles('#etsy-files',[path.join(dir,'kiln_statement.csv')]);await p.waitForTimeout(200);await p.click('[data-action="etsy-import"]');await p.waitForTimeout(150);
  check('second shop imported',await st(id=>state.transactions.filter(t=>t.shop===id).length>15,kilnId));
  check('import toast says what arrived',/Kiln Pots: payment account statement \d+ new/.test(await p.locator('#toast').innerText()),await p.locator('#toast').innerText());
  // ---- the picker scopes every screen and the printout ----
  await p.evaluate(()=>go('shops'));await p.click('[data-action="etsy-span"][data-span="month"]');const shops=await text();
  check('comparison lists both shops',shops.includes('Fern Prints')&&shops.includes('Kiln Pots')&&shops.includes('All shops'),shops.slice(0,400));
  await shot('shops');
  const fernId=await st(()=>state.shops[0].id);
  await p.selectOption('#shop-picker',fernId);await p.waitForTimeout(100);
  const scoped=await st(()=>({pl:Budget.pl(state,'2026-09-01','2026-09-30').revenue.total,all:Budget.pl({...state,settings:{...state.settings,shop:''}},'2026-09-01','2026-09-30').revenue.total}));
  check('picker scopes the P&L',scoped.pl===4300&&scoped.all===8600,JSON.stringify(scoped));
  await p.evaluate(()=>go('pl'));check('print title names the shop',(await p.locator('.print-title').innerText()).includes('Fern Prints'));
  await p.evaluate(()=>go('tax'));check('tax follows the shop',(await text()).length>100);
  // a cost logged with one shop picked belongs to that shop; with All shops it is shared
  await p.evaluate(()=>transactionForm());await p.fill('#transaction-form input[name=amount]','12.99');await p.selectOption('#transaction-form select[name=category]','software');
  await p.fill('#transaction-form input[name=date]','2026-09-05');await p.click('#transaction-form button[type=submit]');
  check('new cost tagged with the picked shop',await st(id=>state.transactions.at(-1).shop===id&&state.transactions.at(-1).category==='software',fernId));
  await p.evaluate(()=>transactionForm(state.transactions.at(-1).id));await p.fill('#transaction-form input[name=note]','Canva');await p.click('#transaction-form button[type=submit]');
  check('editing keeps the shop',await st(id=>state.transactions.at(-1).shop===id&&state.transactions.at(-1).note==='Canva',fernId));
  await p.selectOption('#shop-picker','');await p.waitForTimeout(100);
  check('all shops again',await st(()=>state.settings.shop===''));

  // ---- sample shops: every screen, every period ----
  await p.evaluate(()=>document.querySelector('[data-action="demo"]').click());await p.waitForTimeout(300);
  for(const s of SCREENS){await p.evaluate(s=>go(s),s);await p.waitForTimeout(40);await shot('sample-'+s);}
  for(const s of ['fees','products','coupons','customers','reviews','shops'])for(const k of ['month','year','all']){await p.evaluate(s=>go(s),s);await p.click(`[data-action="etsy-span"][data-span="${k}"]`);}
  await p.evaluate(()=>go('dashboard'));const sd=await text();check('sample dashboard',sd.includes('Take-home')&&sd.includes('Shop by shop')&&sd.includes('Copper Kiln Ceramics'),sd.slice(0,300));
  await p.selectOption('#shop-picker','kiln');await p.evaluate(()=>go('products'));check('sample scoped to one shop',!(await text()).includes('Botanical Fern'));
  await p.emulateMedia({media:'print'});await shot('print-products-kiln');await p.emulateMedia({media:'screen'});
  await p.evaluate(()=>document.querySelector('[data-action="exit-demo"]').click());await p.waitForTimeout(200);
  check('leaving the sample restores the books',await st(()=>state.shops.length===2&&state.etsy.orders.length===3));

  // ---- reload, delete a shop, undo ----
  await p.reload();await p.waitForTimeout(300);
  check('reload keeps shops and imports',await st(()=>state.shops.length===2&&state.etsy.reviews.length===4&&state.niche==='etsy'));
  await p.evaluate(()=>go('shops'));await p.click(`[data-action="etsy-delete-shop"][data-id="${kilnId}"]`);await p.click('[data-action="etsy-confirm-delete-shop"]');
  check('deleting a shop removes its lines',await st(id=>state.shops.length===1&&!state.transactions.some(t=>t.shop===id),kilnId));
  await p.click('#toast [data-action="undo"]');check('undo brings the shop back',await st(()=>state.shops.length===2));

  await p.evaluate(()=>go('etsy-import'));const ri=await st(()=>state.etsy.imports.findIndex(x=>x.kind==='reviews'));
  await p.click(`[data-action="etsy-remove-import"][data-i="${ri}"]`);check('delete import asks first',(await p.locator('#modal').innerText()).includes('4 reviews'));
  await p.click('[data-action="etsy-confirm-remove-import"]');check('deleting an import removes its rows',await st(()=>state.etsy.reviews.length===0&&!state.etsy.imports.some(x=>x.kind==='reviews')));
  await p.click('#toast [data-action="undo"]');check('undo restores the import',await st(()=>state.etsy.reviews.length===4));
  const oi=await st(()=>state.etsy.imports.findIndex(x=>x.kind==='orders'&&x.shop===state.shops[0].id));
  await p.click(`[data-action="etsy-move-import"][data-i="${oi}"]`);await p.selectOption('#etsy-move-form select[name=to]',kilnId);await p.click('#etsy-move-form button[type=submit]');
  check('moving an import moves its orders',await st(id=>state.etsy.orders.every(o=>o.shop===id)&&state.etsy.items.every(i=>i.shop===id),kilnId));
  await p.click('#toast [data-action="undo"]');check('undo puts them back',await st(id=>state.etsy.orders.every(o=>o.shop!==id),kilnId));
  // ---- another channel: a Shopify store beside the Etsy shops ----
  await p.selectOption('#shop-picker','__add');await p.fill('#etsy-shop-form input[name=name]','Fern Online');await p.selectOption('#etsy-shop-form select[name=platform]','shopify');await p.click('#etsy-shop-form button[type=submit]');
  const webId=await st(()=>state.shops.find(x=>x.platform==='shopify')?.id);check('shopify store added',!!webId);
  await p.evaluate(()=>go('etsy-import'));await p.selectOption('#etsy-import-shop',webId);
  check('import screen speaks Shopify',(await text()).includes('Drop Shopify files here'));
  await p.setInputFiles('#etsy-files',[path.join(dir,'orders_export_1.csv')]);await p.waitForTimeout(200);
  check('shopify file recognised',(await text()).includes('Shopify orders'));
  await p.click('[data-action="etsy-import"]');await p.waitForTimeout(150);
  check('shopify orders imported',await st(id=>state.etsy.orders.filter(o=>o.shop===id).length===3&&state.transactions.some(t=>t.shop===id&&t.category==='shopify-sales'),webId));
  check('no Shopify emails or addresses kept',!/ada@example|Fictional Lane/.test(await st(()=>localStorage.getItem('jps-shop-insights-v1'))));
  await p.selectOption('#shop-picker','');await p.evaluate(()=>{selected='2026-09';go('shops');});await p.click('[data-action="etsy-span"][data-span="month"]');
  const chan=await text();check('channel comparison',chan.includes('What each channel keeps you')&&chan.includes('Fern Online'),chan.slice(0,600));
  await shot('channels');
  await p.evaluate(()=>go('settings'));check('Shopify fee rates in settings',await p.locator('#channel-fees-form').count()===1);
  await p.evaluate(()=>go('dashboard'));check('mixed channels use general fee wording',(await p.locator('.etsy-kpis .kit-tile .label').allTextContents()).includes('Fees & ads'));
  // ---- Amazon Handmade: one report brings in both the money and the orders ----
  await p.selectOption('#shop-picker','__add');await p.fill('#etsy-shop-form input[name=name]','Fern Handmade');await p.selectOption('#etsy-shop-form select[name=platform]','amazon');await p.click('#etsy-shop-form button[type=submit]');
  const amzId=await st(()=>state.shops.find(x=>x.platform==='amazon')?.id);
  await p.evaluate(()=>go('etsy-import'));await p.selectOption('#etsy-import-shop',amzId);
  await p.setInputFiles('#etsy-files',[path.join(dir,'2026Sep1-2026Sep30CustomTransaction.csv')]);await p.waitForTimeout(200);
  const amzPre=await text();check('amazon report shows as payments and orders',amzPre.includes('Amazon Handmade payments')&&amzPre.includes('Amazon Handmade orders'),amzPre.slice(0,900));
  await p.click('[data-action="etsy-import"]');await p.waitForTimeout(150);
  check('amazon money and orders imported',await st(id=>state.etsy.orders.some(o=>o.shop===id)&&state.transactions.some(t=>t.shop===id&&t.category==='amazon-fees')&&state.etsy.imports.filter(x=>x.shop===id).length===2,amzId));
  await p.selectOption('#shop-picker','');
  // ---- narrow screens ----
  await p.setViewportSize({width:390,height:844});
  for(const s of ['dashboard','etsy-import','fees','products','pricing','coupons','customers','reviews','seasonality','shops','pl']){await p.evaluate(s=>go(s),s);await shot('phone-'+s);
    const over=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);check('no sideways scroll on phone: '+s,over<=1,String(over));}
  check('no page errors',!errors.length,errors.join('\n'));
  await b.close();fs.rmSync(dir,{recursive:true,force:true});
  console.log(fail?`${fail} smoke checks failed`:'etsy smoke: all checks passed');process.exit(fail?1:0);
})();
