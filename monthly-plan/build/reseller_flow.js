// Reseller Profit Tracker in the browser, the way a new reseller uses it: add a haul with Enter, a lot split to the
// cent, list, sell with the fee filled in, a return back to stock, a write-off, expenses and mileage, then P&L,
// Schedule C, backup round trip, sample mode and a phone-width check.
//   node build/reseller_flow.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const path=require('path');
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'ok  ':'FAIL'} ${name}${cond?'':' '+info}`);if(!cond)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}),errs=[];
 const p=await b.newPage({viewport:{width:1300,height:900}});p.on('pageerror',e=>errs.push(e.message));
 await p.clock.setFixedTime(new Date('2026-10-12T12:00:00'));
 const F='file://'+path.resolve(__dirname,'../app/ResellerProfitTracker.html');await p.goto(F);await p.evaluate(()=>localStorage.clear());await p.goto(F);await p.waitForTimeout(400);
 const v=(js,a)=>p.evaluate(js,a);
 ok('welcome ends with “Add my first items”',await v(()=>P.welcome.at(-1).cta.action==='rs-go-add'));
 await v(()=>{try{closeWelcome()}catch{}});await p.waitForTimeout(200);
 ok('empty home: three steps, no hero',await v(()=>document.querySelectorAll('.pp-step').length===3&&!document.querySelector('.hero')));
 ok('month bar hidden',await v(()=>document.body.classList.contains('debt-ed')));
 ok('top bar says Record a sale',await v(()=>/Record a sale/.test(document.querySelector('.topbar [data-action="rs-sell"]')?.textContent||'')));
 // a haul, one Enter at a time
 await v(()=>go('rsadd'));await p.waitForTimeout(200);
 await p.fill('[data-rs-intake="source"]','Goodwill');await p.dispatchEvent('[data-rs-intake="source"]','change');await p.waitForTimeout(150);
 for(const [t,c,l] of [['Wool jacket, M','8','60'],['Pyrex bowl','4.50','35']]){await p.fill('#rs-intake-form [name=title]',t);await p.fill('#rs-intake-form [name=cost]',c);await p.fill('#rs-intake-form [name=list]',l);await p.press('#rs-intake-form [name=title]','Enter');await p.waitForTimeout(200);}
 ok('two items added with SKUs',await v(()=>state.rsItems.length===2&&state.rsItems[0].sku==='0001'&&state.rsItems[1].sku==='0002'));
 ok('haul source carried to each item',await v(()=>state.rsItems.every(i=>i.source==='Goodwill')));
 ok('title is focused for the next one',await v(()=>document.activeElement?.name==='title'));
 ok('“Just added” lists them',await v(()=>/Just added/.test(document.querySelector('#content').innerText)&&document.querySelectorAll('#content tbody tr').length===2));
 // a lot of three for $10
 await v(()=>document.querySelector('[data-action="rs-lot-add"]').click());await p.waitForTimeout(150);
 await p.fill('#rs-lot-form [name=name]','Bin dig');await p.fill('#rs-lot-form [name=cost]','10');await v(()=>document.querySelector('#rs-lot-form').requestSubmit());await p.waitForTimeout(250);
 ok('lot mode hides the cost field',await v(()=>!document.querySelector('#rs-intake-form [name=cost]')));
 for(const t of ['Tee A','Tee B','Tee C']){await p.fill('#rs-intake-form [name=title]',t);await p.press('#rs-intake-form [name=title]','Enter');await p.waitForTimeout(150);}
 ok('lot cost splits to the cent',await v(()=>{const C=Resale.costs({items:state.rsItems,lots:state.rsLots});return state.rsItems.filter(i=>i.lot).reduce((a,i)=>a+C.get(i.id),0)===1000;}));
 // list the jacket on eBay, then sell it
 await v(()=>{const it=state.rsItems[0];go('rsitems');document.querySelector(`[data-action="rs-item-edit"][data-id="${it.id}"]`).click();});await p.waitForTimeout(150);
 await v(()=>{const f=document.querySelector('#rs-item-form');f.querySelector('[name=plat][value="ebay"]').checked=true;f.requestSubmit();});await p.waitForTimeout(200);
 ok('ticking a platform marks it listed today',await v(()=>state.rsItems[0].listed==='2026-10-12'&&state.rsItems[0].plats[0]==='ebay'));
 await v(()=>document.querySelector(`[data-action="rs-sell"][data-item="${state.rsItems[0].id}"]`).click());await p.waitForTimeout(150);
 ok('sale form starts at the list price and the item’s platform',await v(()=>{const f=document.querySelector('#rs-sale-form');return f.elements.price.value==='60.00'&&f.elements.plat.value==='ebay';}));
 await p.fill('#rs-sale-form [name=price]','55');await p.fill('#rs-sale-form [name=label]','8.99');await p.waitForTimeout(150);
 ok('fee filled in from eBay’s rate',await v(()=>document.querySelector('#rs-sale-form [name=fee]').value===((Math.round(5500*1360/10000)+40)/100).toFixed(2)));
 ok('live profit preview takes off the item cost',await v(()=>/item cost \$8\.00/.test(document.querySelector('.rs-preview').textContent)));
 await v(()=>document.querySelector('#rs-sale-form').requestSubmit());await p.waitForTimeout(250);
 const fee=Math.round(5500*1360/10000)+40,profit=5500-fee-899-800;
 ok('sale saved with its true profit',await v(p=>Resale.sale({items:state.rsItems,sales:state.rsSales},state.rsSales[0]).profit===p,profit));
 ok('the jacket reads as sold',await v(()=>ResellerUI.model().each.get(state.rsItems[0].id).status==='sold'));
 // a return, back to stock
 await v(()=>{go('rssales');document.querySelector('[data-action="rs-return"]').click();});await p.waitForTimeout(150);
 await v(()=>document.querySelector('#rs-ret-form').requestSubmit());await p.waitForTimeout(200);
 ok('returned item is back on the shelf',await v(()=>ResellerUI.model().each.get(state.rsItems[0].id).left===1));
 ok('return costs only the label and fees',await v(p=>Resale.sale({items:state.rsItems,sales:state.rsSales},state.rsSales[0]).profit===p,-fee-899));
 // write one off
 await v(()=>{const it=state.rsItems[1];go('rsitems');document.querySelector(`[data-action="rs-item-edit"][data-id="${it.id}"]`).click();});await p.waitForTimeout(150);
 await v(()=>{const f=document.querySelector('#rs-item-form');f.elements.gone.value='donated';f.elements.gone.dispatchEvent(new Event('change',{bubbles:true}));f.requestSubmit();});await p.waitForTimeout(200);
 ok('donated item written off in the P&L',await v(()=>Resale.pnl({items:state.rsItems,sales:state.rsSales,lots:state.rsLots},'2026-01-01','2026-12-31').writeOff===450));
 // expenses and mileage
 await v(()=>{go('rsexp');document.querySelector('[data-action="rs-exp-add"]').click();});await p.waitForTimeout(150);
 await p.fill('#rs-exp-form [name=note]','Poly mailers 100');await p.waitForTimeout(80);
 ok('expense line guessed from the words',await v(()=>document.querySelector('#rs-exp-form [name=cat]').value==='supplies'));
 await p.fill('#rs-exp-form [name=amount]','$12.99');await v(()=>document.querySelector('#rs-exp-form').requestSubmit());await p.waitForTimeout(200);
 ok('expense saved',await v(()=>state.rsExps.length===1&&state.rsExps[0].amount===1299));
 await v(()=>{go('rsmiles');document.querySelector('[data-action="rs-trip-add"]').click();});await p.waitForTimeout(150);
 await p.fill('#rs-trip-form [name=miles]','20');await v(()=>document.querySelector('#rs-trip-form').requestSubmit());await p.waitForTimeout(200);
 ok('trip worth miles × rate',await v(()=>Resale.expenses({trips:state.rsTrips,rate:state.settings.rsRate},'2026-01-01','2026-12-31')[0].amount===1400));
 // statements
 await v(()=>go('rspl'));await p.waitForTimeout(200);
 ok('P&L shows net profit',await v(()=>/Net profit/.test(document.querySelector('#content').innerText)));
 await v(()=>go('rstax'));await p.waitForTimeout(200);
 ok('Schedule C part III shows',await v(()=>/Part III/.test(document.querySelector('#content').innerText)&&/42/.test(document.querySelector('#content').innerText)));
 ok('COGS ties to the P&L',await v(()=>{const S={items:state.rsItems,sales:state.rsSales,lots:state.rsLots,exps:state.rsExps,trips:state.rsTrips,rate:state.settings.rsRate},Y=Resale.scheduleC(S,2026,'2026-10-12'),T=Resale.pnl(S,'2026-01-01','2026-10-12');return Y.cogs===T.cogs+T.writeOff;}));
 // backup round trip keeps everything
 ok('backup validates intact',await v(()=>{const c=Budget.validate(JSON.parse(JSON.stringify(state)));return c.rsItems.length===state.rsItems.length&&c.rsSales.length===1&&c.rsSales[0].ret&&c.rsLots.length===1&&c.rsExps.length===1&&c.rsTrips.length===1;}));
 // platform fees edit
 await v(()=>go('rsplats'));await p.waitForTimeout(150);
 await v(()=>{const f=document.querySelector('#rs-fees-form');f.elements.pct0.value='14';f.requestSubmit();});await p.waitForTimeout(150);
 ok('platform fee edited; past sale keeps its fee',await v(f=>state.rsPlats[0].pct===1400&&state.rsSales[0].fee===f,fee));
 // sample mode
 await v(()=>document.querySelector('[data-action="demo"]').click());await p.waitForTimeout(400);
 for(const s of ['dashboard','rsitems','rsadd','rssales','rsplats','rsexp','rsmiles','rspl','rstax','rsimport','settings','guide']){await v(x=>go(x),s);await p.waitForTimeout(120);}
 await v(()=>go('dashboard'));await p.waitForTimeout(200);
 ok('sample: hero shows true profit',await v(()=>!!document.querySelector('.hero')&&/True profit/i.test(document.querySelector('.hero').innerText)));
 ok('sample: profitable months',await v(()=>ResellerUI.model().months.filter(m=>m.net>0).length>=10));
 ok('sample: a lot, a bundle, returns and write-offs',await v(()=>state.rsLots.length===1&&state.rsItems.some(i=>i.qty>1)&&state.rsSales.filter(s=>s.ret).length===2&&state.rsItems.some(i=>i.status==='donated')));
 await v(()=>go('rsitems'));await p.waitForTimeout(150);
 ok('sample: grid pages at 24',await v(()=>document.querySelectorAll('.rs-card').length===24&&!!document.querySelector('[data-action="rs-more"]')));
 ok('no other edition’s words',await v(()=>{const h=[...['dashboard','rsitems','rssales','rspl','settings','guide']].map(x=>{go(x);return document.querySelector('#content').innerHTML;}).join(' ');return !/\b(planner|budget|tenant|rent roll|landlord|debt)\b/i.test(h.replace(/<[^>]+>/g,' '));}));
 await v(()=>document.querySelector('[data-action="exit-demo"]').click());await p.waitForTimeout(300);
 ok('back to my shop: own items intact',await v(()=>state.rsItems.length===5));
 // phone
 await p.setViewportSize({width:390,height:844});for(const s of ['dashboard','rsitems','rsadd','rssales','rspl']){await v(x=>go(x),s);await p.waitForTimeout(150);ok(`phone: no sideways scroll on ${s}`,await v(()=>document.documentElement.scrollWidth<=392));}
 ok('no page errors',!errs.length,errs.join(' | '));
 await b.close();console.log(fails?`${fails} failed`:'all passed');process.exit(fails?1:0);})();
