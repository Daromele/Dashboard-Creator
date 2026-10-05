// Net Worth & FIRE Tracker in the browser, as a buyer uses it: the welcome, adding accounts (presets, a
// type and side guessed from the name, "$1,250"), the monthly check-in, updating one balance, the FIRE
// plan, milestones, history, closing and deleting an account, account types, reload, sample mode, start
// fresh, phone width and print. Fictional accounts only.
//   node build/networth_flow.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const path=require('path');
const F='file://'+path.resolve(__dirname,'../app/NetWorthFireTracker.html');
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'ok  ':'FAIL'} ${name}${cond?'':' '+info}`);if(!cond)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}),p=await b.newPage({viewport:{width:1300,height:900}}),errs=[];let net=0;
 p.on('pageerror',e=>errs.push(e.message));p.on('request',r=>{if(!/^(file|data):/.test(r.url()))net++;});await p.clock.setFixedTime(new Date('2026-10-05T12:00:00'));
 await p.goto(F);await p.evaluate(()=>localStorage.clear());await p.goto(F);
 const v=(js,a)=>p.evaluate(js,a),M=()=>v(()=>{const m=NetWorthUI.model();return {n:m.A.length,net:m.now.net,assets:m.now.assets,debts:m.now.debts,fi:m.now.fi,fire:m.fire,toFI:m.toFI,months:m.months};});
 ok('the welcome opens on a first visit',await p.waitForFunction(()=>$('#welcome-tour').open,null,{timeout:4000}).then(()=>true).catch(()=>false));
 await v(()=>{for(let i=0;i<6;i++)document.querySelector('[data-action="welcome-next"]')?.click();});
 ok('the welcome ends with “Add my first account”',await v(()=>{const c=document.querySelector('.welcome-folder');return c&&!c.hidden&&c.dataset.action==='nw-add';}));
 await v(()=>document.querySelector('.welcome-folder').click());await p.waitForTimeout(200);
 ok('it opens the account form',await v(()=>!$('#welcome-tour').open&&!!document.querySelector('#nw-form')));
 await v(()=>document.querySelector('[data-action="dismiss"]').click());await p.waitForTimeout(150);
 ok('empty app: the usual accounts are one click away, no arrows or exports',await v(()=>document.querySelectorAll('.bt-presets [data-action="nw-add"]').length>=10&&!document.querySelector('#content [data-action="print"]')));
 const open=async()=>{await v(()=>{if(!($('#modal').open&&document.querySelector('#nw-form')))document.querySelector('.topbar [data-action="nw-add"]').click();});await p.waitForTimeout(120);};
 const submit=async()=>{await v(()=>document.querySelector('#nw-form').requestSubmit());await p.waitForTimeout(300);};
 // a preset fills the name, type and side
 await v(()=>document.querySelector('.bt-presets [data-preset="2"]').click());await p.waitForTimeout(150);
 ok('a preset (401(k)) fills the form and ticks “toward FI”',await v(()=>{const f=document.querySelector('#nw-form');return f.elements.name.value==='401(k)'&&f.elements.type.value==='retire'&&f.elements.fi.checked;}));
 await submit();
 ok('no balance, not saved (the form asks for it)',await v(()=>$('#modal').open&&!document.querySelector('#nw-form').checkValidity()&&!(state.nwAccounts||[]).length));
 await p.fill('#nw-form [name=balance]','abc');await submit();
 ok('a balance that isn’t a number is explained',await v(()=>!document.querySelector('#form-error').hidden&&/amount/i.test(document.querySelector('#form-error').innerText)));
 await p.fill('#nw-form [name=balance]','$35,000');await submit();
 let m=await M();ok('“$35,000” saved as 35,000.00, in this month’s check-in',m.n===1&&m.net===3500000&&m.fi===3500000&&m.months.join()==='2026-10',JSON.stringify(m));
 // typing a name picks the type, and a debt-sounding name flips to "owe"
 await open();await p.fill('#nw-form [name=name]','Harbor checking');
 ok('“Harbor checking” → Cash & checking, not toward FI',await v(()=>{const f=document.querySelector('#nw-form');return f.elements.type.value==='cash'&&!f.elements.fi.checked;}));
 await p.fill('#nw-form [name=balance]','4200');await submit();
 await open();await p.fill('#nw-form [name=name]','Visa card');
 ok('“Visa card” flips to Something I owe → Credit cards, and hides “toward FI”',await v(()=>{const f=document.querySelector('#nw-form');return f.querySelector('[name=side]:checked').value==='debt'&&f.elements.type.value==='card'&&f.querySelector('.nw-fi-line').hidden&&/owe/.test($('#modal-title').innerText);}));
 await p.fill('#nw-form [name=balance]','1,250');await submit();
 await open();await p.fill('#nw-form [name=name]','Brokerage');await p.click('#nw-form label:has(input[name=side][value=asset])');
 ok('a type you pick stays put',await v(()=>{const f=document.querySelector('#nw-form');f.elements.type.value='other-asset';f.elements.type.dispatchEvent(new Event('change',{bubbles:true}));f.elements.name.value='Brokerage account';f.elements.name.dispatchEvent(new Event('input',{bubbles:true}));return f.elements.type.value==='other-asset';}));
 await v(()=>{const f=document.querySelector('#nw-form');f.elements.type.value='invest';f.elements.type.dispatchEvent(new Event('change',{bubbles:true}));});
 ok('…and “toward FI” follows the type until you tick it yourself',await v(()=>document.querySelector('#nw-form').elements.fi.checked));
 await p.fill('#nw-form [name=balance]','10000');await submit();
 m=await M();ok('four accounts: own 49,200, owe 1,250, toward FI 45,000',m.n===4&&m.assets===4920000&&m.debts===125000&&m.net===4795000&&m.fi===4500000,JSON.stringify(m));
 ok('with four accounts, “Add the rest of your accounts” still offers the usual ones',await v(()=>{go('dashboard');return !!document.querySelector('.bt-more-card');}));
 ok('FI progress is “—” until there’s a FIRE number',await v(()=>/—/.test([...document.querySelectorAll('.kpi')].find(k=>/FI progress/.test(k.innerText)).innerText)));
 // last month's check-in, then this month's: the strip follows what you type
 await v(()=>{go('checkin');document.querySelector('[data-action="nw-ci-prev"]').click();});await p.waitForTimeout(150);
 ok('the check-in goes back a month with its own arrows',await v(()=>document.querySelector('#nw-ci-form').dataset.month==='2026-09'));
 await v(()=>{document.querySelectorAll('#nw-ci-form .nw-ci-row input').forEach(i=>{i.value={'401(k)':'33000','Harbor checking':'4000','Visa card':'900','Brokerage account':'9500'}[i.closest('.nw-ci-row').querySelector('b').innerText]||i.value;});document.querySelector('#nw-ci-form').requestSubmit();});await p.waitForTimeout(300);
 m=await M();ok('September saved: two months now',m.months.join()==='2026-09,2026-10',m.months.join());
 await v(()=>document.querySelector('[data-action="nw-ci-now"]').click());await p.waitForTimeout(150);
 await p.fill('#nw-ci-form input[name^="b-"]>>nth=0','36000');await p.waitForTimeout(500);
 ok('typing a balance moves the net worth strip straight away',await v(()=>{const b=document.querySelector('.nw-ci-sum [data-k="net"]');return +b.dataset.v===4895000;}),await v(()=>document.querySelector('.nw-ci-sum [data-k="net"]').dataset.v));
 ok('…and shows that row’s change',await v(()=>/\+\$3,000/.test(document.querySelector(".nw-ci-ch").innerText)));
 ok('the save button names the month',await v(()=>/Save the October 2026 check-in/.test(document.querySelector('#nw-ci-form [type=submit]').innerText)));
 await v(()=>document.querySelector('#nw-ci-form').requestSubmit());await p.waitForTimeout(300);
 m=await M();ok('October updated, the rest kept',m.net===4895000&&m.fi===4600000,JSON.stringify(m));
 // update one balance from its card
 await v(()=>{go('nwaccounts');const a=state.nwAccounts.find(x=>x.name==='Visa card');document.querySelector(`[data-action="nw-bal"][data-id="${a.id}"]`).click();});await p.waitForTimeout(150);
 ok('Update balance is titled for the account',await v(()=>/Update Visa card/.test($('#modal-title').innerText)));
 await p.fill('#nw-bal-form [name=balance]','0');await v(()=>document.querySelector('#nw-bal-form').requestSubmit());await p.waitForTimeout(250);
 m=await M();ok('paying the card off raises net worth by 1,250',m.net===4895000+125000,m.net);
 ok('the account’s card shows the change since last check-in in green',await v(()=>{const c=[...document.querySelectorAll('.bt-card')].find(c=>/Visa card/.test(c.innerText));return /\+\$900|−\$900/.test(c.innerText)&&!!c.querySelector('.dg-hi .pos');}));
 // the FIRE plan
 await v(()=>go('fire'));await p.waitForTimeout(150);
 ok('no FIRE number yet: the plan asks for a year of spending',await v(()=>/Start with a year of spending/.test(document.querySelector('#content').innerText)));
 await p.fill('#nw-f-spend','40,000');await p.fill('#nw-f-monthly','1500');await p.fill('#nw-f-age','30');await p.click('h1');await p.waitForTimeout(200);await p.waitForTimeout(300);
 m=await M();ok('$40,000 a year at 4% → $1,000,000; years to FI worked out',m.fire===100000000&&m.toFI>200&&m.toFI<420,JSON.stringify(m));
 ok('the FIRE screen shows Lean, FIRE, Fat and Coast FI',await v(()=>['Lean FIRE','Fat FIRE','Coast FI'].every(t=>document.querySelector('#content').innerText.includes(t))));
 await v(()=>{const r=document.querySelector('#nw-f-rate');r.value='350';r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}));});await p.waitForTimeout(300);
 m=await M();ok('sliding the withdrawal rate to 3.5% saves and moves the number',m.fire===Math.round(4000000*10000/350),m.fire);
 await v(()=>{const r=document.querySelector('#nw-extra');r.value='50000';r.dispatchEvent(new Event('input',{bubbles:true}));});await p.waitForTimeout(100);
 ok('the what-if slider says how much sooner',await v(()=>/sooner/.test(document.querySelector('[data-out="extra-res"]').innerText)));
 await v(()=>{const r=document.querySelector('#nw-extra');r.dispatchEvent(new Event('change',{bubbles:true}));});await p.waitForTimeout(200);
 ok('…and draws a second line on the road there',await v(()=>document.querySelectorAll('.nw-chart .nw-line').length>=2));
 // milestones and history
 await v(()=>go('milestones'));await p.waitForTimeout(150);
 ok('milestones: $25,000 passed before you started, a next one with a date',await v(()=>/\$25,000\s*Before you started/.test(document.querySelector('#content').innerText)&&!!document.querySelector('.nw-mile.next')));
 await v(()=>{go('nwhistory');});await p.waitForTimeout(150);
 ok('history lists both months, newest first',await v(()=>{const r=[...document.querySelectorAll('.bt-table tbody tr')].map(t=>t.cells[0].innerText);return /October 2026/.test(r[0])&&/September 2026/.test(r[1]);}));
 await v(()=>{const a=state.nwAccounts.find(x=>x.name==='401(k)');document.querySelector(`[data-action="nw-history"][data-id="${a.id}"]`).click();});await p.waitForTimeout(150);
 ok('one account’s history from its chip',await v(()=>/401\(k\)/.test(document.querySelector('h1').innerText)&&document.querySelectorAll('.bt-table tbody tr').length===2));
 // close an account: 0 from that month, kept in history
 await v(()=>{go('nwaccounts');const a=state.nwAccounts.find(x=>x.name==='Visa card');document.querySelector(`[data-action="nw-edit"][data-id="${a.id}"]`).click();});await p.waitForTimeout(150);
 ok('edit: “Closed in” hidden while open',await v(()=>document.querySelector('.nw-closed').hidden));
 await p.selectOption('#nw-form [name=status]','closed');
 ok('…shown once you choose Closed',await v(()=>!document.querySelector('.nw-closed').hidden));
 await submit();
 ok('a closed account moves to the Closed tab',await v(()=>/Closed\s*1/.test(document.querySelector('.bt-filters').innerText)));
 // delete + undo
 const before=(await M()).n;
 await v(()=>{const a=state.nwAccounts.find(x=>x.name==='Harbor checking');document.querySelector(`[data-action="nw-del"][data-id="${a.id}"]`).click();});await p.waitForTimeout(100);
 await v(()=>document.querySelector('[data-action="nw-del-ok"]').click());await p.waitForTimeout(200);
 ok('delete removes the account and its balances',await v(()=>!state.nwAccounts.some(a=>a.name==='Harbor checking')&&state.nwSnaps.every(s=>Object.keys(s.values).every(k=>state.nwAccounts.some(a=>a.id===k)))));
 await v(()=>document.querySelector('#toast [data-action="undo"]').click());await p.waitForTimeout(200);
 ok('undo brings it back',(await M()).n===before);
 // account types
 await v(()=>go('settings'));await p.waitForTimeout(150);
 ok('Settings shows account types with edit, archive, delete',await v(()=>/Account types/.test(document.querySelector('#content').innerText)&&!!document.querySelector('[data-action="nwt-hide"]')&&!!document.querySelector('[data-action="nwt-del"]')));
 ok('a type in use can’t be deleted',await v(()=>document.querySelector('[data-action="nwt-del"][data-id="retire"]').disabled));
 // reload keeps everything
 await p.reload();await p.waitForTimeout(500);
 ok('reload keeps accounts, check-ins and the plan',await v(()=>state.nwAccounts.length===4&&state.nwSnaps.length===2&&state.nwPlan.spend===4000000));
 // sample mode: separate, rich, never saved
 await v(()=>{try{closeWelcome()}catch{};document.querySelector('[data-action="demo"]').click();});await p.waitForTimeout(600);
 const S=await v(()=>({n:state.nwAccounts.length,s:state.nwSnaps.length,banner:document.querySelector('#demo-banner').innerText,m:NetWorthUI.model()}));
 ok('sample mode: 13 accounts, 29 check-ins, a FIRE plan, this month not checked in',S.n===13&&S.s===29&&S.m.fire===120000000&&!S.m.checked,JSON.stringify({n:S.n,s:S.s}));
 ok('the sample banner speaks about accounts',/Your own accounts stay separate/.test(S.banner),S.banner);
 await v(()=>go('guide'));
 ok('in sample mode the guide offers the way back',await v(()=>!!document.querySelector('#content [data-action="exit-demo"]')));
 await v(()=>document.querySelector('[data-action="exit-demo"]').click());await p.waitForTimeout(400);
 ok('leaving sample mode brings back your own accounts',await v(()=>state.nwAccounts.length===4));
 // start fresh, keeping the accounts
 await v(()=>{go('settings');document.querySelector('[data-action="start-fresh"]').click();});await p.waitForTimeout(150);
 ok('start fresh offers to keep the accounts and plan',await v(()=>/Keep my accounts and FIRE plan/.test(document.querySelector('#fresh-form').innerText)));
 await p.check('#fresh-form [name=sure]');await v(()=>document.querySelector('#fresh-form').requestSubmit());await p.waitForTimeout(500);
 ok('history cleared to one check-in with the latest balances; accounts and plan kept',await v(()=>state.nwAccounts.length===4&&state.nwSnaps.length===1&&state.nwPlan.spend===4000000&&NetWorthUI.model().now.net>0));
 // ---- from the newbie check: two months as a new buyer, on a fresh page ----
 {const q=await b.newPage({viewport:{width:1300,height:900}});q.on('pageerror',e=>errs.push(e.message));const w=(js,a)=>q.evaluate(js,a);
  await q.clock.setFixedTime(new Date('2026-10-05T12:00:00'));await q.goto(F);await w(()=>localStorage.clear());await q.goto(F);await q.waitForTimeout(400);await w(()=>{try{closeWelcome()}catch{}});
  const add=async(name,bal)=>{await w(()=>document.querySelector('.topbar [data-action="nw-add"]').click());await q.waitForTimeout(100);await q.fill('#nw-form [name=name]',name);await q.fill('#nw-form [name=balance]',bal);};
  const save=async()=>{await w(()=>document.querySelector('#nw-form').requestSubmit());await q.waitForTimeout(300);};
  await add('Checking','2500');ok('first month: no “I already had it” box (nothing earlier)',await w(()=>!document.querySelector('#nw-form [name=had]')));await save();
  await add('Index fund','40000');await save();
  ok('first check-in: no “this year” in the hero',await w(()=>{go('dashboard');return !/this year/.test(document.querySelector('.debt-hero').innerText);}));
  // November: a forgotten account
  await q.clock.setFixedTime(new Date('2026-11-06T12:00:00'));await q.reload();await q.waitForTimeout(400);await w(()=>{try{closeWelcome()}catch{}});
  await add('Old 401k from last job','30000');
  ok('a later account offers “I already had this account”, ticked',await w(()=>document.querySelector('#nw-form [name=had]')?.checked));
  await save();
  const m=await w(()=>{const x=NetWorthUI.model();return {moved:x.moved,months:x.months,oct:NetWorth.totals(x.A,x.S,'2026-10').net,pace:x.pace};});
  ok('…so it doesn’t count as growth: October includes it, nothing “moved”',m.oct===7250000&&m.moved===0&&m.pace===0,JSON.stringify(m));
  ok('no “You passed $50,000” for an account you already had',await w(()=>{go('dashboard');return !/You passed/.test(document.querySelector('#content').innerText);}));
  // December, not checked in yet: the chart and averages stop at November
  await q.clock.setFixedTime(new Date('2026-12-03T12:00:00'));await q.reload();await q.waitForTimeout(400);await w(()=>{try{closeWelcome()}catch{}});
  ok('the chart stops at the last check-in (no flat December point)',await w(()=>{const x=NetWorthUI.model();return x.series.at(-1).month==='2026-11'&&!x.checked;}));
  ok('History labels the first year “2026 (from Oct)”',await w(()=>{go('nwhistory');return /2026 \(from Oct\)/.test(document.querySelector('.kpis').innerText);}));
  // FIRE: a monthly number typed by mistake
  await w(()=>go('fire'));await q.fill('#nw-f-spend','4000');
  ok('a year of spending under $12,000 asks “Is that a month?”',await w(()=>/Is that a month\?/.test(document.querySelector('[data-out="spend-month"]').innerText)));
  await q.fill('#nw-f-spend','48,000');
  ok('…and a real year shows its monthly amount',await w(()=>/\$4,000\.00 a month/.test(document.querySelector('[data-out="spend-month"]').innerText)));
  // edit: a new type brings its own “Counts toward FI”
  await w(()=>{go('nwaccounts');const a=state.nwAccounts.find(x=>x.name==='Checking');document.querySelector(`[data-action="nw-edit"][data-id="${a.id}"]`).click();});await q.waitForTimeout(150);
  await q.selectOption('#nw-form [name=type]','invest');
  ok('edit: switching Checking to Investments ticks “Counts toward FI”',await w(()=>document.querySelector('#nw-form [name=fi]').checked));
  await q.fill('#nw-form [name=name]','Checking 2');
  ok('…and typing the name afterwards leaves it alone',await w(()=>document.querySelector('#nw-form [name=fi]').checked));
  await w(()=>closeModal());
  // hero wording and print
  await w(()=>go('dashboard'));
  ok('the hero says “at your Nov check-in”',await w(()=>/at your Nov check-in/.test(document.querySelector('.debt-hero').innerText)));
  await q.emulateMedia({media:'print'});
  ok('print: the ring labels on the hero are dark',await w(()=>{const t=document.querySelector('.hero .hd-name');return !t||getComputedStyle(t).fill==='rgb(34, 34, 34)';}));
  await q.close();}
 // phone width, print
 await p.setViewportSize({width:390,height:844});
 for(const s of ['dashboard','nwaccounts','checkin','fire','milestones','nwhistory','settings']){await v(x=>go(x),s);await p.waitForTimeout(150);const w=await v(()=>document.documentElement.scrollWidth);ok(`${s} fits a phone`,w<=392,w);}
 await p.setViewportSize({width:1300,height:900});await v(()=>{state.settings.theme='night';go('dashboard');});await p.emulateMedia({media:'print'});await p.waitForTimeout(100);
 ok('prints without the sidebar',await v(()=>document.querySelector('#nav').offsetParent===null||getComputedStyle(document.querySelector('.rail,nav,#nav')).display==='none'));
 await p.emulateMedia({media:'screen'});
 ok('no page errors',!errs.length,errs.join(' | '));ok('no network requests',net===0,net);
 await b.close();console.log(fails?`networth flow: ${fails} failed`:'networth flow: all checks passed');process.exit(fails?1:0);})();
