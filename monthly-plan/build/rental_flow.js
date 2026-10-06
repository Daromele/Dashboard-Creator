// Rental Property Tracker in the browser, the way a new landlord uses it: add a property and a tenant, record rent
// (part, late, fee), add expenses that repeat, read the rent roll, properties and Schedule E, then sample mode.
//   node build/rental_flow.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const path=require('path');
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'ok  ':'FAIL'} ${name}${cond?'':' '+info}`);if(!cond)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}),errs=[];
 const p=await b.newPage({viewport:{width:1300,height:900}});p.on('pageerror',e=>errs.push(e.message));
 await p.clock.setFixedTime(new Date('2026-10-12T12:00:00'));
 const F='file://'+path.resolve(__dirname,'../app/RentalPropertyTracker.html');await p.goto(F);await p.evaluate(()=>localStorage.clear());await p.goto(F);await p.waitForTimeout(400);
 const v=(js,a)=>p.evaluate(js,a);
 ok('welcome tour ends with “Add my first property”',await v(()=>P.welcome.at(-1).cta.label==='Add my first property'&&P.welcome.at(-1).cta.action==='rp-prop-add'));
 await v(()=>{try{closeWelcome()}catch{}});await p.waitForTimeout(200);
 ok('empty app: three setup steps, no money numbers',await v(()=>document.querySelectorAll('.pp-step').length===3&&!document.querySelector('.hero')));
 ok('month bar hidden (months don’t drive this app)',await v(()=>document.body.classList.contains('debt-ed')));
 // a property: a duplex with a mortgage
 await v(()=>document.querySelector('[data-action="rp-prop-add"]').click());
 await p.fill('#rp-prop-form [name=name]','Maple Street duplex');await p.fill('#rp-prop-form [name=count]','2');await p.waitForTimeout(100);
 ok('unit names appear for 2+ units',await v(()=>!document.querySelector('.rp-unitnames').hidden));
 await p.fill('#rp-prop-form [name=value]','$420,000');await p.fill('#rp-prop-form [name=loan]','1,850');await p.waitForTimeout(100);
 ok('interest field appears once there is a mortgage',await v(()=>!document.querySelector('.rp-int').hidden));
 await p.fill('#rp-prop-form [name=interest]','1300');await p.click('#rp-prop-form button[type=submit]');await p.waitForTimeout(250);
 ok('property saved with 2 units, the loan and $420,000',await v(()=>{const x=state.rpProps[0];return x.units.length===2&&x.units[1].name==='Unit 2'&&x.loan.payment===185000&&x.loan.interest===130000&&x.value===42000000;}));
 // a tenant whose lease began before this month: this month's rent is asked about
 await v(()=>document.querySelector('[data-action="rp-lease-add"]').click());
 ok('lease start has no default (not today)',await v(()=>document.querySelector('#rp-lease-form [name=start]').value===''));
 await p.fill('#rp-lease-form [name=tenant]','Sam Rivera');await p.fill('#rp-lease-form [name=rent]','1450');await p.fill('#rp-lease-form [name=start]','2026-03-01');await p.dispatchEvent('#rp-lease-form [name=start]','change');await p.waitForTimeout(100);
 ok('“already received” shows, ticked, for a lease that began earlier',await v(()=>{const x=document.querySelector('.rp-paidnow');return !x.hidden&&x.querySelector('input').checked;}));
 await v(()=>{document.querySelector('.rp-paidnow input').checked=false;});
 await p.click('#rp-lease-form button[type=submit]');await p.waitForTimeout(250);
 ok('lease saved; no payment because we unticked it',await v(()=>state.rpLeases.length===1&&state.rpPays.length===0));
 ok('charts and yearly numbers don’t count months before you started tracking',await v(()=>{const M=RentalUI.model();return M.first==='2026-10'&&M.all.months===0;}));
 ok('Sam is late (due the 1st, 5 days grace, today the 12th)',await v(()=>{go('dashboard');return /Sam Rivera is 11 days late/.test(document.querySelector('#content').innerText);}));
 ok('the other unit shows as vacant',await v(()=>/Unit 2 is vacant/.test(document.querySelector('#content').innerText)));
 // part payment, then the rest
 await v(()=>document.querySelector('[data-action="rp-pay"][data-lease]').click());
 ok('payment date defaults to the due date for a late rent',await v(()=>document.querySelector('#rp-pay-form [name=date]').value==='2026-10-01'));
 await p.fill('#rp-pay-form [name=amount]','1000');await p.fill('#rp-pay-form [name=date]','2026-10-10');await p.click('#rp-pay-form button[type=submit]');await p.waitForTimeout(250);
 ok('part paid: still late, $450 left',await v(()=>{const r=Rental.roll({props:state.rpProps,leases:state.rpLeases,pays:state.rpPays,exps:state.rpExps},'2026-10','2026-10-12')[0];return r.status==='late-part'&&r.left===45000;}));
 await v(()=>document.querySelector('[data-action="rp-pay"][data-lease]').click());
 ok('the form offers what’s left ($450)',await v(()=>document.querySelector('#rp-pay-form [name=amount]').value==='450.00'));
 await p.click('#rp-pay-form button[type=submit]');await p.waitForTimeout(250);
 ok('paid in full',await v(()=>Rental.roll({props:state.rpProps,leases:state.rpLeases,pays:state.rpPays,exps:state.rpExps},'2026-10','2026-10-12')[0].status==='paid'));
 // an expense: the category follows what you type until you pick one
 await v(()=>document.querySelector('[data-action="rp-exp-add"]').click());
 await p.fill('#rp-exp-form [name=note]','Plumber: kitchen leak');await p.waitForTimeout(80);
 ok('“Plumber” is guessed as Repairs (line 14)',await v(()=>document.querySelector('#rp-exp-form [name=cat]').value==='repairs'));
 await p.fill('#rp-exp-form [name=amount]','340');await p.click('#rp-exp-form button[type=submit]');await p.waitForTimeout(250);
 await v(()=>document.querySelector('[data-action="rp-exp-add"]').click());
 await p.fill('#rp-exp-form [name=note]','Property taxes');await p.fill('#rp-exp-form [name=amount]','4200');await p.selectOption('#rp-exp-form [name=repeat]','monthly');await p.waitForTimeout(80);
 ok('a $4,200 monthly tax asks “Is that a year’s bill?”',await v(()=>/a year’s bill/.test(document.querySelector('.rp-rep-hint').textContent)));
 await p.selectOption('#rp-exp-form [name=repeat]','yearly');await p.click('#rp-exp-form button[type=submit]');await p.waitForTimeout(250);
 ok('two expenses: repairs and yearly taxes',await v(()=>state.rpExps.length===2&&state.rpExps[1].repeat==='yearly'&&state.rpExps[1].cat==='taxes'));
 // Schedule E
 ok('Schedule E: rents, repairs, taxes and mortgage interest; principal left out',await v(()=>{go('taxes');const t=document.querySelector('#content').innerText;return /Rents received/.test(t)&&/Repairs/.test(t)&&/Property taxes/.test(t)&&/Mortgage interest/.test(t)&&!/Loan principal \(not/.test(document.querySelector('table').innerText);}));
 ok('rent roll can’t go back before you started tracking',await v(()=>{go('rentroll');return !document.querySelector('[data-action="rp-roll-prev"]');}));
 ok('properties: grid card with the units and tenants',await v(()=>{go('props');return /Sam Rivera/.test(document.querySelector('.debt-card').innerText);}));
 // a later lease on the same unit can't overlap
 await v(()=>document.querySelector('[data-action="rp-lease-add"]').click());await v(()=>{const s=document.querySelector('#rp-lease-form [name=unit]');s.value=[...s.options].find(o=>/Sam/.test(o.text)).value;});
 await p.fill('#rp-lease-form [name=tenant]','Someone Else');await p.fill('#rp-lease-form [name=rent]','1200');await p.fill('#rp-lease-form [name=start]','2026-11-01');await p.click('#rp-lease-form button[type=submit]');await p.waitForTimeout(200);
 ok('two leases on one unit at once are refused, with a reason',await v(()=>/already rents that unit/.test(document.querySelector('#form-error')?.textContent||'')));
 await v(()=>closeModal());
 // sample mode
 await v(()=>{go('settings');});await v(()=>document.querySelector('[data-action="demo"]').click());await p.waitForTimeout(500);
 ok('sample: one late tenant, one lease ending, one vacancy',await v(()=>{go('dashboard');const t=document.querySelector('#content').innerText;return /days late/.test(t)&&/lease ends/.test(t)&&/is vacant/.test(t);}));
 ok('sample: cap rate and cash-on-cash shown',await v(()=>{go('props');return /\d%/.test(document.querySelector('.kpis').innerText);}));
 ok('no wording from other editions on any screen',await v(()=>{const bad=/planner|paycheck|net worth|FIRE|Autopilot|Quick Log/i;return ['dashboard','rentroll','props','tenants','expenses','taxes','rpledger','settings','guide'].every(s=>{go(s);return !bad.test(document.querySelector('#content').innerHTML.replace(/<[^>]+>/g,' '));});}));
 ok('no page errors',!errs.length,errs.join(' | '));
 await b.close();console.log(fails?`rental flow: ${fails} failed`:'rental flow: all checks passed');process.exit(fails?1:0);})();
