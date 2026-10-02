// Browser smoke test of every flow in the built Bakeweek_Studio.html.
//   node smoke.js
// Seeds storage with a normal page script, never addInitScript (on file:// that can wipe storage on reload).
const {chromium}=require(require.resolve('playwright',{paths:[process.env.NODE_PATH||'/opt/node22/lib/node_modules','.']}));
const path=require('path'),os=require('os'),APP='file://'+path.join(__dirname,'Bakeweek_Studio.html');
const fails=[],check=(ok,msg)=>{console.log((ok?'  ok  ':'  FAIL ')+msg);if(!ok)fails.push(msg);};
(async()=>{const b=await chromium.launch(),ctx=await b.newContext({acceptDownloads:true,viewport:{width:1440,height:900}}),p=await ctx.newPage(),errs=[];
 p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
 await p.clock.setFixedTime(new Date('2026-10-06T15:00:00'));
 const ev=(f,a)=>p.evaluate(f,a),okAsk=async()=>{await p.click('#dlg [data-action=ask-ok]');await p.waitForTimeout(250);},wait=ms=>p.waitForTimeout(ms);
 const closeTour=async()=>{if(await ev(()=>document.querySelector('#welcome').open))await p.click('#welcome .welcome-close');};
 // 1. data saved by the first (Codex) version moves across
 await p.goto(APP);await wait(700);
 await ev(()=>{const s=BakeCore.createDemo('2026-10-06');s.settings.business='Codex Bakery';localStorage.setItem('jps-bakeweek-v1',JSON.stringify(s));});
 await p.reload();await wait(900);
 check(await ev(()=>state.settings.business==='Codex Bakery'&&state.orders.length===9),'Codex-version data loads');
 check(await ev(()=>localStorage.getItem('jps-bakeweek-v1')===null),'…and moves from localStorage into IndexedDB');
 check(await ev(()=>document.querySelector('#welcome').open),'welcome tour opens on the first visit');
 await closeTour();await p.reload();await wait(900);
 check(await ev(()=>state.settings.business==='Codex Bakery'),'data still there after reload (IndexedDB)');
 await closeTour();
 // 2. start fresh, then build a bakery through the real forms
 await p.click('.navlink[data-go=settings]');await p.click('[data-action=fresh]');await okAsk();
 check(await ev(()=>!state.orders.length&&!state.ingredients.length),'start fresh clears the bakery');
 await p.click('.navlink[data-go=week]');check(await ev(()=>document.querySelectorAll('.step').length===3),'empty week shows the three first steps');
 for(const [name,size,price,stock] of [['Flour','1000','2','5000'],['Sugar','1000','1.5','3000']]){
  await p.click('.navlink[data-go=pantry]');await p.click('.pagehead [data-action=ingredient-form]');
  await p.fill('#ingredient-form [name=name]',name);await p.fill('#ingredient-form [name=packSize]',size);await p.fill('#ingredient-form [name=packCost]',price);await p.fill('#ingredient-form [name=stock]',stock);
  await p.click('#ingredient-form button[type=submit]');await wait(200);}
 check(await ev(()=>state.ingredients.length===2),'two ingredients added');
 await p.click('.navlink[data-go=recipes]');await p.click('.pagehead [data-action=recipe-form]');
 await p.fill('#recipe-form [name=name]','Test cookies');await p.fill('#recipe-form [name=yield]','12');await p.fill('#recipe-form [data-ri=qty]','100');
 await p.click('#recipe-form [data-action=add-recipe-ingredient]');await p.fill('#recipe-form .line-row:nth-child(2) [data-ri=qty]','50');
 await p.click('#recipe-form button[type=submit]');await wait(250);
 check(await ev(()=>state.recipes.length===1&&state.recipes[0].ingredients.length===2),'recipe with two ingredients saved');
 await p.click('.navlink[data-go=recipes]');await p.click('.pagehead [data-action=recipe-form]');await p.fill('#recipe-form [name=name]','test COOKIES');await p.click('#recipe-form button[type=submit]');await wait(150);
 check(await ev(()=>!document.querySelector('#form-error').hidden&&document.querySelector('#dlg').open),'a bad value shows its error inside the dialog');
 await p.click('#dlg [data-action=dismiss]');
 // 3. try an order (keyboard N), accept it
 await p.keyboard.press('n');await wait(300);
 check(await ev(()=>document.querySelector('#dlg').open&&!!document.querySelector('#sim-out .verdict')),'N opens Try an order with a live verdict');
 await p.fill('#sim-form [data-sim=customer]','Pat');await p.fill('#sim-rows [data-line=qty]','24');await wait(150);
 await p.click('#sim-out [data-action=accept-sim]');await wait(300);
 check(await ev(()=>state.orders.length===1&&state.orders[0].customer==='Pat'&&screen==='week'),'accepting adds the order and opens the week');
 check(await ev(()=>C.planWeek(state,week).runs.length===1),'the order becomes a batch in the plan');
 // 4. hub tabs, make the batch, undo, redo
 await p.click('.hub-tabs [data-go=batches]');await wait(150);
 check(await ev(()=>screen==='batches'&&document.querySelector('.navlink[aria-current=page]')?.textContent.includes('This week')),'hub tab opens; This week stays current');
 const flour0=await ev(()=>state.ingredients.find(i=>i.name==='Flour').stock);
 await p.click('[data-action=complete-run]');await okAsk();
 check(await ev(f=>state.completedRuns.length===1&&state.ingredients.find(i=>i.name==='Flour').stock<f,flour0),'mark batch made takes ingredients from the pantry');
 await p.click('#toast [data-action=undo]');await wait(150);
 check(await ev(f=>state.completedRuns.length===0&&state.ingredients.find(i=>i.name==='Flour').stock===f,flour0),'undo puts them back');
 await p.click('[data-action=complete-run]');await okAsk();
 // 5. ready, payment, collected
 await p.click('.hub-tabs [data-go=packing]');await p.click('[data-action=order-status][data-status=Ready]');await wait(200);
 check(await ev(()=>state.orders[0].status==='Ready'),'order marked ready');
 await p.click('[data-action=payment]');const total=await ev(()=>rev(state.orders[0]));await p.fill('#payment-form [name=paid]',String(total));await p.click('#payment-form button[type=submit]');await wait(150);
 check(await ev(()=>balance(state.orders[0])===0),'payment recorded; balance is zero');
 await p.click('[data-action=order-status][data-status=Collected]');await wait(150);
 check(await ev(()=>state.orders[0].status==='Collected'),'order collected');
 // 6. printing the kitchen packet and a quote
 await ev(()=>{window.print=()=>{window.__printed=(window.__printed||0)+1;};});
 await p.click('.hub-tabs [data-go=week]');await p.click('.pagehead [data-action=print][data-k=packet]');await wait(200);
 check(await ev(()=>window.__printed===1&&document.querySelectorAll('#print-area .sheet').length===3&&document.body.classList.contains('printing')),'kitchen packet prints three sheets');
 await ev(()=>window.dispatchEvent(new Event('afterprint')));
 await ev(()=>printOut('quote',state.orders[0].id));await wait(100);
 check(await ev(()=>{const t=document.querySelector('#print-area').textContent;return t.includes('Order quote')&&!/ingredients|Kitchen note/i.test(t);}),'the customer quote leaves out costs and kitchen notes');
 await ev(()=>window.dispatchEvent(new Event('afterprint')));
 // 7. orders screen: filter, search keeps focus
 await ev(()=>go('orders'));await p.click('[data-action=status-filter][data-k=all]');await p.fill('#search','pat');await wait(400);
 check(await ev(()=>document.activeElement?.id==='search'&&document.querySelectorAll('#content tbody tr').length===1),'search filters and keeps the caret in the box');
 // 8. backup, start fresh, restore
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('.topbar [data-action=backup]')]);const bk=path.join(os.tmpdir(),'bakeweek-smoke-backup.json');await dl.saveAs(bk);
 await p.click('.navlink[data-go=settings]');await p.click('[data-action=fresh]');await okAsk();
 await p.setInputFiles('#restore-file',bk);await wait(300);await okAsk();await wait(300);
 check(await ev(()=>state.orders.length===1&&state.completedRuns.length===1),'restore brings the backup back');
 // a backup from the Codex version (no ui block) also restores
 const codex=path.join(os.tmpdir(),'bakeweek-codex-backup.json');require('fs').writeFileSync(codex,await ev(()=>JSON.stringify(BakeCore.createDemo('2026-10-06'))));
 await p.setInputFiles('#restore-file',codex);await wait(300);await okAsk();await wait(300);
 check(await ev(()=>state.orders.length===9),'a Codex-version backup restores');
 await p.click('#toast [data-action=undo]');await wait(150);
 // 9. CSV export, import preview
 const [csv]=await Promise.all([p.waitForEvent('download'),ev(()=>ACTIONS['export-orders']())]);check(/Orders/.test(csv.suggestedFilename()),'orders CSV downloads');
 await ev(()=>importForm());await p.fill('[name=csvText]',await ev(()=>C.orderCSVTemplate(state).replace('ORDER-001','CSV-1')));await p.click('[data-action=preview-import]');await wait(150);
 await p.click('[data-action=confirm-import]');await wait(200);check(await ev(()=>state.orders.some(o=>o.reference==='CSV-1')),'CSV import adds the order');
 // 10. theme, collapsible rail, sidebar switch, all remembered
 await p.click('.navlink[data-go=settings]');await p.click('[data-action=theme][data-k=kiln]');await wait(150);
 await p.click('[data-action=rail-toggle]');await p.click('label.nav-toggle:has([data-nav-toggle=year])');await wait(200);
 await p.reload();await wait(900);await closeTour();
 check(await ev(()=>document.documentElement.dataset.theme==='kiln'),'palette remembered');
 check(await ev(()=>document.querySelector('#app').classList.contains('rail-min')),'collapsed sidebar remembered');
 check(await ev(()=>!document.querySelector('.navlink[data-go=year]')),'switched-off view stays hidden');
 // 11. sample mode is separate and never saved
 await p.click('[data-action=rail-toggle]');const mine=await ev(()=>state.orders.length);await p.click('#rail-demo');await wait(300);
 check(await ev(()=>demo&&state.orders.length>250&&state.standing.length===6),'sample bakery has nine months of history');
 await p.click('#rail-demo');await wait(200);check(await ev(m=>!demo&&state.orders.length===m,mine),'leaving the sample restores your bakery');
 // 12. a standing order and a market day in the buyer's own bakery, through the real forms
 await ev(()=>go('standing'));await p.click('.pagehead [data-action=standing-form]');await wait(200);
 await p.fill('#standing-form [name=customer]','Bread club: Sam');await p.check('#standing-form [name=prepaid]');await p.click('#standing-form button[type=submit]');await wait(300);
 check(await ev(()=>state.standing.length===1&&state.orders.filter(o=>o.standingId).length===4&&state.orders.filter(o=>o.standingId).every(o=>o.paid>0)),'standing order adds four prepaid weekly drops');
 await p.reload();await wait(900);await closeTour();check(await ev(()=>state.standing.length===1&&state.orders.filter(o=>o.standingId).length===4),'…kept after reload, with no extra drops');
 await ev(()=>go('markets'));await p.click('.pagehead [data-action=market-form]');await wait(200);await p.fill('#market-form [name=customer]','Riverside market');
 await p.fill('#market-form [name=dueDate]','2026-10-10');await p.dispatchEvent('#market-form [name=dueDate]','change');await p.click('#market-form button[type=submit]');await wait(300);
 const mk=await ev(()=>state.orders.find(o=>o.kind==='market')?.id);check(!!mk&&await ev(()=>C.planWeek(state,week).totals.markets===1),'market day joins the week plan');
 await ev(m=>{commit(s=>{for(const i of s.ingredients)i.stock+=1e5;for(const r of C.planWeek(s,week).runs.filter(r=>r.allocations.some(a=>a.orderId===m)))C.completeRun(s,r.key,week);});},mk);
 await ev(m=>closeForm(m),mk);await wait(200);await p.fill('#close-form [name=sold0]','5');await p.click('#close-form button[type=submit]');await wait(300);
 check(await ev(m=>order(m).status==='Collected'&&order(m).market.results[0].sold===5,mk),'record what sold closes the market day');
 check(await ev(()=>document.querySelector('.hero-num')&&/Market days/.test(document.querySelector('h1').textContent)),'market days screen shows the takings hero');
 // 13. dough prep the day before, and the weekly pre-order menu
 await ev(()=>recipeForm(state.recipes[0].id));await wait(150);await p.selectOption('#recipe-form [name=prepDays]','1');await p.fill('#recipe-form [name=prepMinutes]','20');await p.fill('#recipe-form [name=prepNote]','Chill the dough');await p.click('#recipe-form button[type=submit]');await wait(250);
 check(await ev(()=>state.recipes[0].prepDays===1&&C.planWeek(state,week).totals.prepMinutes>0),'a recipe’s day-before prep lands in the plan');
 await ev(()=>go('menu'));await p.click('#content [data-action=menu-form]');await wait(200);await p.click('#menu-form button[type=submit]');await wait(300);
 check(await ev(()=>!!menuOf(week)),'this week’s menu is created');await p.click('.pagehead [data-action=menu-order]');await wait(200);
 await p.fill('#menu-order-form [name=customer]','Jo');await p.fill('#menu-order-form [data-price]','3');await p.click('#menu-order-form button[type=submit]');await wait(300);
 check(await ev(()=>state.orders.some(o=>o.menuId&&o.customer==='Jo')),'a pre-order from the menu joins the order book');
 check(await ev(()=>/Jo/.test(document.querySelector('#content').textContent)&&/Order by/.test(document.querySelector('#menu-text').textContent)),'menu screen lists it, with the menu text');
 await ev(()=>printOut('menu'));await wait(300);check(await ev(()=>/Order by/.test(document.querySelector('#print-area').textContent)),'the menu prints');await ev(()=>document.body.classList.remove('printing'));
 // 14. labels, customers, expenses, messages and pantry minimums
 await p.click('.navlink[data-go=pantry]');await p.click('#content tbody [data-action=ingredient-form]');await wait(150);await p.click('#ingredient-form .day-pick:has([value=wheat])');await p.fill('#ingredient-form [name=minStock]','999999');await p.click('#ingredient-form button[type=submit]');await wait(250);
 check(await ev(()=>state.ingredients.some(i=>i.allergens.includes('wheat')&&i.minStock===999999)),'an ingredient’s allergens and minimum are saved');
 await p.click('.navlink[data-go=week]');await p.click('.hub-tabs [data-go=shopping]');await wait(150);check(await ev(()=>/Restock to your minimums/.test(document.querySelector('#content').textContent)),'shopping shows the restock list');
 await p.click('.navlink[data-go=labels]');await wait(150);await p.fill('#content [data-lbl]','3');await wait(500);await ev(()=>printLabels());await wait(300);
 check(await ev(()=>document.querySelectorAll('#print-area .lbl:not(.empty)').length===3&&/Contains: Wheat/.test(document.querySelector('#print-area').textContent)),'three labels print with their allergens');await ev(()=>document.body.classList.remove('printing'));
 await ev(()=>go('customers'));await wait(150);await p.click('#content tbody [data-action=customer-form]');await wait(150);await p.fill('#customer-form [name=allergies]','Sesame');await p.click('#customer-form button[type=submit]');await wait(250);
 const cname=await ev(()=>state.customers[0]?.name);check(!!cname,'a customer card is saved');
 await ev(n=>orderForm(state.orders.find(o=>o.customer===n&&o.kind!=='market').id),cname);await wait(150);check(await ev(()=>/Allergies:/.test(document.querySelector('#dlg').textContent)),'their allergy shows on the order');
 await p.click('#dlg [data-action=msg-copy][data-k=confirm]');await wait(200);check(await ev(()=>/copied|Copying/.test(document.querySelector('#toast').textContent)),'a confirmation message can be copied');await ev(()=>closeModal());
 await ev(()=>expenseForm());await wait(150);await p.fill('#expense-form [name=amount]','25');await p.fill('#expense-form [name=description]','Bags');await p.click('#expense-form button[type=submit]');await wait(250);
 check(await ev(()=>state.expenses.length===1&&state.expenses[0].description==='Bags'),'an expense is logged');
 // 15. a tidy sidebar: sales views are tabs of one item, and a tab can be switched off on its own
 check(await ev(()=>document.querySelectorAll('#nav .navlink').length<=11&&!!document.querySelector('.navlink[data-go=orders],.navlink[data-go=menu],.navlink[data-go=standing],.navlink[data-go=markets],.navlink[data-go=customers]')),'one Sales item in the sidebar');
 await ev(()=>go('orders'));check(await ev(()=>document.querySelectorAll('.hub-tabs button').length===5),'Sales has five tabs');
 await ev(()=>commit((s,p)=>{p.hiddenNav=[...p.hiddenNav,'markets'];}));await ev(()=>go('markets'));check(await ev(()=>screen==='week'&&![...document.querySelectorAll('.hub-tabs button')].some(b=>b.dataset.go==='markets')),'a switched-off tab is gone and can’t be opened');
 await ev(()=>commit((s,p)=>{p.hiddenNav=p.hiddenNav.filter(x=>x!=='markets');}));
 // 16. routines and the month calendar
 await ev(()=>{go('settings');routineForm();});await wait(150);await p.fill('#routine-form [name=name]','Feed the starter');await p.click('#routine-form button[type=submit]');await wait(250);
 check(await ev(()=>state.routines.length===1&&C.planWeek(state,week).totals.routineMinutes===70),'a daily routine adds its minutes to every day');
 await ev(()=>{selectedDay=today();go('week');});await wait(150);await p.click('#content [data-routine]');await wait(200);check(await ev(()=>state.routineLog.length===1),'ticking a routine off is saved');
 await ev(()=>go('calendar'));await wait(150);check(await ev(()=>document.querySelectorAll('.cal-day').length>=28),'the calendar shows the month');
 await p.click(`.cal-day[data-date="${await ev(()=>C.addDays(today(),2))}"]`);await wait(150);check(await ev(()=>screen==='week'&&selectedDay===C.addDays(today(),2)),'picking a day opens its kitchen plan');
 await p.click('.navlink[data-go=tools]');await p.fill('[data-c="scale.value"]','36');await wait(100);check(await ev(()=>/× 3/.test(document.querySelector('#calc-out').textContent)),'calculator scales a recipe to 36 pieces');
 check(!errs.length,'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
 await b.close();console.log(fails.length?`\n${fails.length} failure(s)`:'\nall flows passed');process.exit(fails.length?1:0);})();
