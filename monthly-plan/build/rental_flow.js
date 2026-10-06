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
 ok('nothing recorded yet: profit & loss and Finances say so, no Print or Export',await v(()=>{const L=state.rpProps[0].loan;delete state.rpProps[0].loan;go('rppl');const a=/Nothing recorded yet/.test(document.querySelector('#content').innerText)&&!document.querySelector('[data-action="rp-pl-csv"]');go('expenses');return a&&/Nothing recorded yet/.test(document.querySelector('#content').innerText)&&!document.querySelector('[data-action="rp-exps-csv"]')&&(state.rpProps[0].loan=L,true);}));
 ok('empty repair log: no zero tiles',await v(()=>{go('rpmaint');return !document.querySelector('#content .kpis');}));
 ok('import before tenants says to add them first',await v(()=>{go('rpimport');return /add your tenants first/i.test(document.querySelector('#content').innerText);}));
 ok('a quiet week shows what’s next',await v(()=>{go('rpcal');return !!document.querySelector('.rp-next');}));
 await v(()=>go('dashboard'));
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
 // tables: tenants split property and unit, and every main table has search and sort from two rows
 await v(()=>document.querySelector('[data-action="rp-lease-add"]').click());await v(()=>{const s=document.querySelector('#rp-lease-form [name=unit]');s.value=[...s.options].find(o=>/Unit 2/.test(o.text)).value;});
 await p.fill('#rp-lease-form [name=tenant]','Priya Shah');await p.fill('#rp-lease-form [name=rent]','1400');await p.fill('#rp-lease-form [name=start]','2026-10-01');await p.click('#rp-lease-form button[type=submit]');await p.waitForTimeout(250);
 ok('tenants: Property and Unit columns, search box and a status filter with two tenants',await v(()=>{go('tenants');const h=[...document.querySelectorAll('#content thead th')].map(x=>x.innerText.replace(/[↕▲▼]/g,'').trim().toLowerCase());return h.includes('property')&&h.includes('unit')&&!!document.querySelector('.tbl-search');}));
 ok('expenses and ledger tables have search too',await v(()=>{go('expenses');const a=!!document.querySelector('.tbl-search');go('rpledger');return a&&!!document.querySelector('.tbl-search');}));
 // a general expense, not tied to one property
 await v(()=>{go('expenses');document.querySelector('[data-action="rp-exp-add"]').click();});
 await p.fill('#rp-exp-form [name=note]','Bookkeeping software');await p.selectOption('#rp-exp-form [name=prop]','');await p.fill('#rp-exp-form [name=amount]','15');await p.click('#rp-exp-form button[type=submit]');await p.waitForTimeout(250);
 ok('a General expense saves with no property',await v(()=>state.rpExps.some(x=>x.prop===''&&x.note==='Bookkeeping software')));
 ok('expenses: a General chip and a by-property card',await v(()=>{go('expenses');return [...document.querySelectorAll('[data-action="rp-exp-prop"]')].some(b=>b.dataset.k==='__general')&&/Each property/.test(document.querySelector('#content').innerText);}));
 await v(()=>document.querySelector('[data-action="rp-exp-prop"][data-k="__general"]').click());
 ok('picking General shows only that expense',await v(()=>{const r=[...document.querySelectorAll('#content table:not(.rp-sum) tbody tr')];return r.length===1&&/Bookkeeping/.test(r[0].innerText);}));
 await v(()=>document.querySelector('[data-action="rp-exp-prop"][data-k=""]').click());
 await v(()=>document.querySelector('[data-action="rp-exp-range"][data-k="custom"]').click());
 await p.fill('[data-range="rp-exp-range"][data-end="from"]','2026-10-11');await p.dispatchEvent('[data-range="rp-exp-range"][data-end="from"]','change');await p.waitForTimeout(150);
 ok('a custom date range narrows the expenses',await v(()=>/Oct 11, 2026/i.test(document.querySelector('.pagehead').innerText)&&![...document.querySelectorAll('#content tbody tr')].some(r=>/Oct 1 2026/.test(r.innerText))));
 // profit & loss
 ok('profit & loss: rents, repairs, NOI, net income and cash flow, with General as a column',await v(()=>{go('rppl');const t=document.querySelector('.rp-pl').innerText;return /Rents/.test(t)&&/Repairs/.test(t)&&/Net operating income/.test(t)&&/Net income/.test(t)&&/Cash flow/.test(t)&&/General/i.test(document.querySelector('.rp-pl thead').innerText);}));
 ok('profit & loss: rents equal what was received this year',await v(()=>{const row=[...document.querySelectorAll('.rp-pl tbody tr')].find(r=>/^Rents/.test(r.cells[0].innerText));return /\$2,850\.00/.test(row.cells[row.cells.length-1].innerText);}));
 await v(()=>{const s=document.querySelector('[data-rp-pick="pl"]');s.value=state.rpProps[0].id;s.dispatchEvent(new Event('change',{bubbles:true}));});
 ok('profit & loss for one property drops the General column',await v(()=>!/General/i.test(document.querySelector('.rp-pl thead').innerText)));
 // repairs: a tenant's request, done with a cost, lands in expenses
 await v(()=>{go('rpmaint');document.querySelector('[data-action="rp-job-add"]').click();});
 await p.fill('#rp-job-form [name=title]','Dripping kitchen tap');await v(()=>{const s=document.querySelector('#rp-job-form [name=lease]');s.value=state.rpLeases[0].id;});
 await p.click('#rp-job-form button[type=submit]');await p.waitForTimeout(250);
 ok('repair logged as a tenant request',await v(()=>state.rpJobs.length===1&&state.rpJobs[0].lease===state.rpLeases[0].id&&state.rpJobs[0].status==='open'));
 await v(()=>document.querySelector('[data-action="rp-job-done"]').click());
 ok('“Done” opens the form with Finished on and Add to expenses',await v(()=>!document.querySelector('.rp-done').hidden&&!document.querySelector('.rp-toexp').hidden));
 await p.fill('#rp-job-form [name=cost]','85');await p.fill('#rp-job-form [name=vendor]','Harbor Plumbing');await p.click('#rp-job-form button[type=submit]');await p.waitForTimeout(250);
 ok('done with a cost: a Repairs expense is added and linked',await v(()=>{const j=state.rpJobs[0],x=state.rpExps.find(e=>e.id===j.exp);return j.status==='done'&&x&&x.amount===8500&&x.cat==='repairs';}));
 ok('repair log filters: Tenant requests shows it',await v(()=>{document.querySelector('[data-action="rp-job-show"][data-k="tenant"]').click();return /Dripping/.test(document.querySelector('#content tbody').innerText);}));
 // calendar
 ok('calendar opens on this week, 7 days',await v(()=>{go('rpcal');return document.querySelectorAll('.rp-week .rp-day').length===7&&!!document.querySelector('.rp-day.today');}));
 ok('calendar chips count what they filter',await v(()=>/Rent \d+/.test(document.querySelector('[data-action="rp-cal-kind"][data-k="rent"]').innerText)));
 ok('calendar filters: hiding rent removes rent days',await v(()=>{document.querySelector('[data-action="rp-cal-mode"][data-k="month"]').click();document.querySelector('[data-action="rp-cal-kind"][data-k="rent"]').click();const gone=!/Sam Rivera/.test(document.querySelector('.rp-cal').innerText);document.querySelector('[data-action="rp-cal-kind"][data-k="rent"]').click();return gone;}));
 ok('calendar: rent due and the repair on their days',await v(()=>{const t=document.querySelector('.rp-cal').innerText;return /Sam Rivera/.test(t)&&/Dripping kitchen tap/.test(t)&&document.querySelectorAll('.rp-day:not(.out)').length===31;}));
 // letters
 await v(()=>{go('rpdocs');document.querySelector('[data-action="rp-landlord"]').click();});
 await p.fill('#rp-ll-form [name=name]','Morgan Rentals LLC');await p.fill('#rp-ll-form [name=phone]','(555) 010-2000');await p.click('#rp-ll-form button[type=submit]');await p.waitForTimeout(250);
 ok('welcome letter fills the tenant, address, rent and your details',await v(()=>{const t=document.querySelector('#rp-letter').value;return /Dear (Sam Rivera|Priya Shah)/.test(t)&&/\$1,4[05]0\.00/.test(t)&&/Morgan Rentals LLC/.test(t)&&/\(555\) 010-2000/.test(t)&&!/\[\[/.test(t);}));
 await v(()=>document.querySelector('[data-action="rp-doc"][data-k="increase"]').click());
 await p.fill('[data-doc-f="new_rent"]','1,525');await p.waitForTimeout(80);
 ok('rent increase picks up the new rent as you type',await v(()=>/\$1,525\.00/.test(document.querySelector('#rp-letter').value)));
 await v(()=>{const t=document.querySelector('#rp-letter');t.value=t.value.replace('This letter is to let you know','We’re writing to let you know');t.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-action="rp-doc-save"]').click();});
 ok('saved wording keeps blanks for the next tenant',await v(()=>{const t=state.rpTemplates.increase;return /We’re writing/.test(t)&&/\[\[tenant\]\]/.test(t)&&!/Sam Rivera|Priya Shah/.test(t);}));
 await v(()=>{const s=document.querySelector('[data-doc-lease]');s.value='all';s.dispatchEvent(new Event('change',{bubbles:true}));});
 ok('a letter to every tenant: Dear Residents, no one tenant’s name',await v(()=>{const t=document.querySelector('#rp-letter').value;return /Dear Residents/.test(t)&&!/Sam Rivera|Priya Shah/.test(t);}));
 ok('finances: summary by property with income, NOI and cash flow',await v(()=>{go('expenses');const t=document.querySelector('.rp-sum')?.innerText||'';return /Maple Street duplex/.test(t)&&/NOI/i.test(t)&&/Cash flow/i.test(t)&&/Finances/.test(document.querySelector('h1').innerText);}));
 // charging a tenant
 await v(()=>{go('tenants');document.querySelector('[data-action="rp-charge-add"][data-lease]').click();});
 await p.fill('#rp-charge-form [name=title]','Damage repair');await p.fill('#rp-charge-form [name=d0]','Broken blind');await p.fill('#rp-charge-form [name=a0]','35');
 await v(()=>document.querySelector('[data-action="rp-charge-line"]').click());await p.fill('#rp-charge-form [name=d1]','Labor');await p.fill('#rp-charge-form [name=a1]','40');await p.waitForTimeout(80);
 ok('charge form totals the items as you type',await v(()=>/\$75\.00/.test(document.querySelector('.rp-ch-total').textContent)));
 await p.click('#rp-charge-form button[type=submit]');await p.waitForTimeout(250);
 ok('the charge is saved and listed as Open',await v(()=>state.rpCharges.length===1&&/Open/.test(document.querySelector('#content').innerText)));
 await v(()=>document.querySelector('[data-action="rp-charge-bill"]').click());await p.waitForTimeout(200);
 ok('Bill opens the letter with each item and the total',await v(()=>{const t=document.querySelector('#rp-letter').value;return /STATEMENT OF CHARGES/.test(t)&&/Broken blind: \$35\.00/.test(t)&&/Total: \$75\.00/.test(t);}));
 const fees0=await v(()=>{go('rppl');return document.querySelector('.rp-pl').innerText;});
 await v(()=>{go('tenants');document.querySelector('[data-action="rp-charge-pay"]').click();});await p.fill('#rp-chpay-form [name=amount]','75');await p.click('#rp-chpay-form button[type=submit]');await p.waitForTimeout(250);
 ok('paid in full: a fee payment linked to the charge, shown as Paid',await v(()=>state.rpPays.some(x=>x.charge===state.rpCharges[0].id&&x.kind==='fee'&&x.amount===7500)&&/Paid/.test([...document.querySelectorAll('#content table')].at(-1).innerText)));
 ok('the payment counts in Late fees & other',await v(()=>{go('rppl');const r=[...document.querySelectorAll('.rp-pl tbody tr')].find(r=>/^Late fees/.test(r.cells[0].innerText));return /\$75\.00/.test(r.cells[r.cells.length-1].innerText);}));
 // bank import
 const csvPath=require('path').join(require('os').tmpdir(),'rp-bank-test.csv');require('fs').writeFileSync(csvPath,'Date,Description,Amount\n2026-10-05,Zelle from Priya Shah,1400.00\n2026-10-06,HARBOR HARDWARE SUPPLY,-86.40\n2026-10-07,ACME MORTGAGE SERVICING PMT,-1850.00\n2026-10-08,Mystery deposit,999.00\n2026-10-09,Mobile deposit,250.00\n');
 await v(()=>go('rpimport'));await p.setInputFiles('[data-rp-import]',csvPath);await p.waitForTimeout(400);
 ok('import: rent matched by name, mortgage and unknown deposit skipped',await v(()=>{const r=[...document.querySelectorAll('.rp-imp tbody tr')];const by=d=>r.find(x=>x.cells[1].innerText.includes(d));return r.length===5&&by('Priya').querySelector('[data-f=use]').value==='rent'&&by('MORTGAGE').querySelector('[data-f=use]').value==='skip'&&by('Mystery').querySelector('[data-f=use]').value==='skip'&&by('HARDWARE').querySelector('[data-f=use]').value==='exp';}));
 const before=await v(()=>[state.rpPays.length,state.rpExps.length]);
 await v(()=>document.querySelector('[data-action="rp-imp-go"]').click());await p.waitForTimeout(250);
 ok('import adds one payment and one expense',await v(b=>state.rpPays.length===b[0]+1&&state.rpExps.length===b[1]+1&&state.rpPays.some(x=>x.amount===140000&&x.date==='2026-10-05'),before));
 await v(()=>go('rpimport'));await p.setInputFiles('[data-rp-import]',csvPath);await p.waitForTimeout(400);
 ok('the same file again: those lines are marked as imported before and skipped',await v(()=>document.querySelectorAll('.rp-imp tr.rp-dup').length===2&&document.querySelectorAll('.rp-imp tbody tr').length===5&&[...document.querySelectorAll('.rp-imp tr.rp-dup [data-f=use]')].every(s=>s.value==='skip')));
 await v(()=>document.querySelector('[data-action="rp-imp-clear"]').click());
 // a property photo and the compact grid
 await v(()=>{go('props');document.querySelector('[data-action="rp-prop-edit"]').click();});
 await p.setInputFiles('[data-rp-photo]',{name:'house.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});await p.waitForTimeout(400);
 await p.click('#rp-prop-form button[type=submit]');await p.waitForTimeout(250);
 ok('a photo is saved and shown on the card',await v(()=>/^data:image\/jpeg/.test(state.rpProps[0].photo||'')&&!!document.querySelector('.debt-card .rp-photo img')));
 ok('compact grid: cash flow and mortgage, no unit list',await v(()=>{document.querySelector('[data-action="rp-layout"][data-k="compact"]').click();const c=document.querySelector('.debt-card');return c.querySelectorAll('.dg-row').length===2&&/Cash flow/.test(c.innerText)&&/Mortgage/.test(c.innerText)&&!c.querySelector('.pp-bills');}));
 ok('the photo survives a reload',await v(async()=>{await new Promise(r=>setTimeout(r,300));return true;})&&await (async()=>{await p.reload();await p.waitForTimeout(500);return v(()=>/^data:image\/jpeg/.test(state.rpProps[0].photo||'')&&state.rpJobs.length===1&&!!state.rpTemplates?.increase&&state.settings.rpLandlord?.name==='Morgan Rentals LLC');})());
 // sample mode
 await v(()=>{go('settings');});await v(()=>document.querySelector('[data-action="demo"]').click());await p.waitForTimeout(500);
 ok('sample: one late tenant, one lease ending, one vacancy',await v(()=>{go('dashboard');const t=document.querySelector('#content').innerText;return /days late/.test(t)&&/lease ends/.test(t)&&/is vacant/.test(t);}));
 ok('sample: the Home chart filters to one property',await v(()=>{go('dashboard');const sel=document.querySelector('[data-rp-pick="chart"]');sel.value='p-harbor';sel.dispatchEvent(new Event('change',{bubbles:true}));return /Harbor View condo ·/.test(document.querySelector('.bt-chart').closest('.card').innerText);}));
 ok('sample: an overdue charge on Home',await v(()=>{go('dashboard');return /owes \$126\.00 for Utilities/.test(document.querySelector('#content').innerText);}));
 ok('sample: an urgent repair on Home',await v(()=>{go('dashboard');return /Urgent repair: No hot water/.test(document.querySelector('#content').innerText);}));
 ok('sample: tenants filter by property and by status',await v(()=>{go('tenants');const f=[...document.querySelectorAll('.tbl-filter')].map(x=>x.getAttribute('aria-label').replace(/(by )(.*)/,(m,a,b)=>a+b[0]+b.slice(1).toLowerCase()));return f.includes('Filter by Property')&&f.includes('Filter by Status');}));
 ok('sample: cap rate and cash-on-cash shown',await v(()=>{go('props');return /\d%/.test(document.querySelector('.kpis').innerText);}));
 ok('no wording from other editions on any screen',await v(()=>{const bad=/planner|paycheck|net worth|FIRE|Autopilot|Quick Log/i;return ['dashboard','rentroll','props','tenants','expenses','rpcal','rpmaint','rppl','taxes','rpledger','rpimport','rpdocs','settings','guide'].every(s=>{go(s);return !bad.test(document.querySelector('#content').innerHTML.replace(/<[^>]+>/g,' '));});}));
 ok('no page errors',!errs.length,errs.join(' | '));
 await b.close();console.log(fails?`rental flow: ${fails} failed`:'rental flow: all checks passed');process.exit(fails?1:0);})();
