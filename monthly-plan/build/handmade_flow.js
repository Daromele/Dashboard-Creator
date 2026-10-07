// Handmade Inventory Tracker in the browser, the way a new maker uses it: materials with what they have, a purchase,
// a product with a recipe, a batch (and a short one), sales, a return, an adjustment and a stock count, a craft fair
// with a tally of the day, then the restock list, history, P&L, backup round trip, sample mode and phone width.
//   node build/handmade_flow.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const path=require('path');
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'ok  ':'FAIL'} ${name}${cond?'':' '+info}`);if(!cond)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}),errs=[];
 const p=await b.newPage({viewport:{width:1300,height:900}});p.on('pageerror',e=>errs.push(e.message));
 await p.clock.setFixedTime(new Date('2026-10-12T12:00:00'));
 const F='file://'+path.resolve(__dirname,'../app/HandmadeInventoryTracker.html');await p.goto(F);await p.evaluate(()=>localStorage.clear());await p.goto(F);await p.waitForTimeout(400);
 const v=(js,a)=>p.evaluate(js,a),click=s=>v(s=>document.querySelector(s).click(),s),submit=s=>v(s=>document.querySelector(s).requestSubmit(),s),wait=(n=200)=>p.waitForTimeout(n);
 ok('welcome ends with “Add my first material”',await v(()=>P.welcome.at(-1).cta.action==='hm-mat-add'));
 await v(()=>{try{closeWelcome()}catch{}});await wait();
 ok('empty home: four steps, no hero',await v(()=>document.querySelectorAll('.pp-step').length===4&&!document.querySelector('.hero')));
 // materials, one with what's already on the shelf
 await v(()=>go('hmmats'));await wait();
 for(const [n,u,q,c,r] of [['Soy wax','lb','10','25','4'],['Amber jar 8 oz','each','12','18','6'],['Fragrance oil','oz','8','16','']]){
  await click('[data-action="hm-mat-add"]');await wait(120);await p.fill('#hm-mat-form [name=name]',n);await p.selectOption('#hm-mat-form [name=unit]',u);await p.fill('#hm-mat-form [name=qty]',q);await p.fill('#hm-mat-form [name=cost]',c);if(r)await p.fill('#hm-mat-form [name=reorder]',r);await submit('#hm-mat-form');await wait(150);}
 ok('three materials, each with a starting purchase',await v(()=>state.hmMats.length===3&&state.hmBuys.length===3));
 await click('[data-action="hm-buy"][data-mat]');await wait(120);await p.fill('#hm-buy-form [name=qty]','10');await p.fill('#hm-buy-form [name=cost]','$35.00');await wait(80);
 ok('purchase shows the price per unit',await v(()=>/\$3\.50 \/ lb/.test(document.querySelector('.hm-per').textContent)));
 await submit('#hm-buy-form');await wait(150);
 ok('average cost moves with the dearer wax',await v(()=>Math.round(HandmadeUI.model().L.mats.get(state.hmMats[0].id).avg)===300));
 // a product with its recipe
 await v(()=>go('hmprods'));await wait();await click('[data-action="hm-prod-add"]');await wait(150);
 await p.fill('#hm-prod-form [name=name]','Cedar candle');await p.fill('#hm-prod-form [name=price]','28');await p.fill('#hm-prod-form [name=labor]','15');
 await v(()=>{const f=document.querySelector('#hm-prod-form'),M=state.hmMats;f.querySelector('[name=bm0]').value=M[0].id;f.querySelector('[name=bq0]').value='0.5';document.querySelector('[data-action="hm-bom-line"]').click();});await wait(80);
 await v(()=>{const f=document.querySelector('#hm-prod-form'),M=state.hmMats;f.querySelector('[name=bm1]').value=M[1].id;f.querySelector('[name=bq1]').value='1';document.querySelector('[data-action="hm-bom-line"]').click();});await wait(80);
 await v(()=>{const f=document.querySelector('#hm-prod-form'),M=state.hmMats;f.querySelector('[name=bm2]').value=M[2].id;f.querySelector('[name=bq2]').value='0.6';f.querySelector('[name=bq2]').dispatchEvent(new Event('input',{bubbles:true}));});await wait(120);
 ok('live price: materials and your time',await v(()=>/Materials &amp; packaging \$4\.20|Materials & packaging \$4\.20/.test(document.querySelector('.hm-price-prev').innerHTML)));
 await submit('#hm-prod-form');await wait(150);
 ok('product saved with a 3-line recipe and a SKU',await v(()=>state.hmProds.length===1&&state.hmProds[0].bom.length===3&&state.hmProds[0].sku==='001'));
 // make a batch, then one that's short of jars
 await click('[data-action="hm-make"]');await wait(150);await p.fill('#hm-make-form [name=qty]','10');await wait(120);
 ok('batch form checks every material',await v(()=>document.querySelectorAll('.hm-need tbody tr').length===3&&!document.querySelector('.hm-check .rp-chip.neg')));
 await submit('#hm-make-form');await wait(150);
 ok('ten candles in stock, wax used',await v(()=>{const L=HandmadeUI.model().L;return L.prods.get(state.hmProds[0].id).qty===10&&L.mats.get(state.hmMats[0].id).qty===15;}));
 await click('[data-action="hm-make"]');await wait(150);await p.fill('#hm-make-form [name=qty]','5');await wait(120);
 ok('short jars flagged before saving',await v(()=>!!document.querySelector('.hm-check .rp-chip.neg')&&!!document.querySelector('[name=anyway]')));
 await submit('#hm-make-form');await wait(120);
 ok('a short batch needs “Make it anyway”',await v(()=>state.hmBatches.length===1&&!document.querySelector('#form-error').hidden));
 await v(()=>closeModal());
 // a sale on Etsy, with its fee filled in
 await click('.topbar [data-action="hm-sell"]');await wait(150);
 ok('sale form starts at the product price',await v(()=>document.querySelector('#hm-sale-form [name=price]').value==='28.00'));
 await p.fill('#hm-sale-form [name=label]','6.50');await wait(100);
 ok('Etsy fee filled in',await v(()=>document.querySelector('#hm-sale-form [name=fee]').value===((Math.round(2800*950/10000)+45)/100).toFixed(2)));
 await submit('#hm-sale-form');await wait(150);
 ok('sold: nine left, true profit after the piece’s cost',await v(()=>{const M=HandmadeUI.model(),s=state.hmSales[0];return M.L.prods.get(state.hmProds[0].id).qty===9&&Handmade.sale(M.s,s,M.L).profit===2800-s.fee-650-M.L.cogs.get(s.id);}));
 // return, back to stock
 await v(()=>{go('hmsales');document.querySelector('[data-action="hm-return"]').click();});await wait(150);await submit('#hm-ret-form');await wait(150);
 ok('returned piece back in stock',await v(()=>HandmadeUI.model().L.prods.get(state.hmProds[0].id).qty===10));
 // an adjustment and a stock count, both kept in history
 await v(()=>{go('hmmats');document.querySelector(`[data-action="hm-adj"][data-mat="${state.hmMats[1].id}"]`).click();});await wait(150);
 await p.fill('#hm-adj-form [name=count]','0');await wait(80);
 ok('count shows the difference',await v(()=>/−?-?2 from what/.test(document.querySelector('.hm-diff').textContent)));
 await p.selectOption('#hm-adj-form [name=reason]','damaged');await submit('#hm-adj-form');await wait(150);
 ok('damaged jars saved as an adjustment',await v(()=>state.hmAdj.length===1&&state.hmAdj[0].qty===-2&&state.hmAdj[0].reason==='damaged'));
 await click('[data-action="hm-count"]');await wait(150);await v(()=>{const i=document.querySelector(`#hm-count-form [name="m_${state.hmMats[2].id}"]`);i.value='1.5';});await submit('#hm-count-form');await wait(150);
 ok('stock count adds one adjustment per difference',await v(()=>state.hmAdj.length===2&&state.hmAdj[1].reason==='count'));
 ok('history balance equals stock',await v(()=>{const M=HandmadeUI.model();return state.hmMats.every(m=>{const h=Handmade.history(M.s,m.id,M.L);return !h.length||h.at(-1).bal===M.L.mats.get(m.id).qty;});}));
 // a craft fair: plan, then tally the day
 await v(()=>go('hmevents'));await wait();await click('[data-action="hm-ev-add"]');await wait(150);
 await p.fill('#hm-ev-form [name=name]','Fall market');await p.fill('#hm-ev-form [name=date]','2026-10-10');await p.fill('#hm-ev-form [name=booth]','45');await p.fill('#hm-ev-form [name=hours]','6');
 await v(()=>{const id=state.hmProds[0].id;document.querySelector(`[name="pl_${id}"]`).value='8';document.querySelector(`[name="tk_${id}"]`).value='8';});await submit('#hm-ev-form');await wait(150);
 await click('[data-action="hm-ev-sell"]');await wait(150);await v(()=>{document.querySelector(`[name="n_${state.hmProds[0].id}"]`).value='5';});await p.fill('#hm-evsell-form [name=fee]','3.64');await submit('#hm-evsell-form');await wait(150);
 ok('fair sales recorded at the event',await v(()=>state.hmSales.filter(s=>s.event).reduce((a,s)=>a+s.qty,0)===5));
 ok('event profit after the booth',await v(()=>{const M=HandmadeUI.model(),x=Handmade.event(M.s,state.hmEvents[0],M.L);return x.sold===5&&x.prods[0].left===3&&x.profit===14000-364-4500-x.cogs;}));
 // restock, P&L
 await v(()=>go('hmrestock'));await wait();
 ok('restock lists the jars',await v(()=>/Amber jar/.test(document.querySelector('#content').innerText)));
 await v(()=>go('hmpl'));await wait();
 ok('P&L counts the booth and the write-off',await v(()=>{const T=Handmade.pnl(HandmadeUI.model().s,'2026-01-01','2026-10-12');return T.events===4500&&T.writeOff>0;}));
 ok('backup round trip keeps everything',await v(()=>{const c=Budget.validate(JSON.parse(JSON.stringify(state)));return ['hmMats','hmProds','hmBuys','hmBatches','hmSales','hmAdj','hmEvents'].every(k=>c[k].length===state[k].length)&&c.hmSales.some(s=>s.ret)&&c.hmProds[0].bom.length===3;}));
 // sample mode
 await v(()=>document.querySelector('[data-action="demo"]').click());await wait(500);
 for(const s of ['dashboard','hmprods','hmmats','hmmake','hmsales','hmevents','hmrestock','hmlog','hmexp','hmpl','settings','guide']){await v(x=>go(x),s);await wait(120);}
 await v(()=>go('dashboard'));await wait(200);
 ok('sample: true profit hero',await v(()=>/True profit/i.test(document.querySelector('.hero')?.innerText||'')));
 ok('sample: stock replays without going below zero',await v(()=>{const M=HandmadeUI.model();return M.st.negative.length===0&&M.L.short.length===0;}));
 ok('sample: every month profitable',await v(()=>HandmadeUI.model().months.every(m=>m.net>0)));
 ok('sample: an upcoming fair to make for',await v(()=>HandmadeUI.model().rs.toMake.length>0));
 ok('no other edition’s words',await v(()=>{const h=['dashboard','hmprods','hmsales','hmpl','settings','guide'].map(x=>{go(x);return document.querySelector('#content').innerHTML;}).join(' ');return !/\b(planner|budget|tenant|landlord|debt|reseller)\b/i.test(h.replace(/<[^>]+>/g,' '));}));
 await v(()=>document.querySelector('[data-action="exit-demo"]').click());await wait(300);
 ok('back to my workshop: own data intact',await v(()=>state.hmProds.length===1&&state.hmMats.length===3));
 await p.setViewportSize({width:390,height:844});for(const s of ['dashboard','hmprods','hmmats','hmsales','hmevents','hmlog']){await v(x=>go(x),s);await wait(150);ok(`phone: no sideways scroll on ${s}`,await v(()=>document.documentElement.scrollWidth<=392));}
 ok('no page errors',!errs.length,errs.join(' | '));
 await b.close();console.log(fails?`${fails} failed`:'all passed');process.exit(fails?1:0);})();
