// Drives the business edition end to end in Chromium: every screen from blank and from the
// sample, the invoice → revenue flow, the mileage log, tax-line mapping, P&L periods and the
// accountant downloads. Fails on any page error or broken expectation.
//   node biz_smoke.js [out-dir-for-screenshots]
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const path=require('path'),fs=require('fs');
const FILE='file://'+path.resolve(__dirname,'../app/ProfitPlanBusiness.html'),OUT=process.argv[2];
const SCREENS=['dashboard','pl','budget','activity','invoices','tax','taxlines','mileage','annual','goals','scheduled','calendar','insights','review','settings','guide','import'];
let fail=0;const check=(name,cond,extra='')=>{if(!cond){fail++;console.log('FAIL:',name,extra);}};
(async()=>{
  const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:1440,height:1000},locale:'en-US',timezoneId:'UTC',acceptDownloads:true,reducedMotion:'reduce'});
  await ctx.addInitScript(()=>{try{localStorage.setItem('jps-profit-plan-welcome-v1','1');localStorage.setItem('jps-profit-plan-manual-backup',String(Date.now()));}catch{}});
  const p=await ctx.newPage();await p.clock.setFixedTime(new Date('2026-09-24T10:00:00Z'));
  const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(FILE);await p.waitForTimeout(300);
  const shot=async name=>{if(OUT){fs.mkdirSync(OUT,{recursive:true});await p.screenshot({path:path.join(OUT,name+'.png'),fullPage:true});}};
  const text=()=>p.locator('#content').innerText();
  check('title',(await p.title()).startsWith('Profit Plan'));
  check('nav has business screens',(await p.locator('#nav').innerText()).includes('Schedule C summary'));
  check('no wealth screen',!(await p.locator('#nav').innerText()).includes('Wealth'));
  for(const s of SCREENS){await p.evaluate(s=>go(s),s);await shot('blank-'+s);}
  // sample
  await p.evaluate(()=>document.querySelector('[data-action="demo"]').click());await p.waitForTimeout(200);
  for(const s of SCREENS){await p.evaluate(s=>go(s),s);await p.waitForTimeout(60);await shot('sample-'+s);}
  await p.evaluate(()=>go('dashboard'));
  const dash=await text();check('dashboard ladder',dash.includes('Profit this month')&&dash.includes('Gross profit')&&dash.includes('Tax pot'),dash.slice(0,300));
  // P&L periods
  await p.evaluate(()=>go('pl'));
  for(const k of ['month','quarter','ytd','year','custom']){await p.click(`[data-action="biz-period"][data-kind="${k}"]`);const t=await text();check('pl '+k,/Net (profit|loss)/.test(t)&&t.includes('Gross profit'),t.slice(0,200));await shot('pl-'+k);}
  await p.fill('#biz-range input[name=from]','2026-02-10');await p.fill('#biz-range input[name=to]','2026-04-20');await p.click('#biz-range button');
  check('custom range months as columns',/MAR/i.test(await p.locator('.statement-table thead').innerText()));
  await p.click('[data-action="biz-period"][data-kind="quarter"]');
  const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-action="biz-pl-csv"]')]);
  const plcsv=fs.readFileSync(await dl.path(),'utf8');check('P&L CSV',plcsv.includes('Gross profit')&&plcsv.includes('Jul')&&plcsv.includes('Total'),plcsv.slice(0,200));
  await p.emulateMedia({media:'print'});await shot('print-pl');await p.emulateMedia({media:'screen'});
  // tax set-aside and the accountant pack
  await p.evaluate(()=>go('tax'));const tax=await text();check('tax quarters',tax.includes('Due Sep 15, 2026')&&tax.includes('Should have set aside'),tax.slice(0,400));
  await p.evaluate(()=>go('taxlines'));const sc=await text();
  check('schedule C lines',sc.includes('Gross receipts or sales')&&sc.includes('Car and truck expenses')&&sc.includes('Tentative profit'),sc.slice(0,300));
  for(const [act,needle] of [['biz-sc-csv','Gross receipts or sales'],['biz-sc-detail','Schedule C line']]){
    const [d]=await Promise.all([p.waitForEvent('download'),p.click(`[data-action="${act}"]`)]);const c=fs.readFileSync(await d.path(),'utf8');check(act,c.includes(needle),c.slice(0,200));}
  await p.emulateMedia({media:'print'});await shot('print-taxlines');await p.emulateMedia({media:'screen'});
  // remap a category and see it move
  const before=await p.evaluate(()=>Budget.taxSummary(state,'2026-01-01','2026-12-31').lines.find(l=>l.id==='L18').amount);
  await p.selectOption('select[data-taxline="software"]','L27b');await p.waitForTimeout(100);
  const after=await p.evaluate(()=>Budget.taxSummary(state,'2026-01-01','2026-12-31').lines.find(l=>l.id==='L18').amount);
  check('remap moves software off line 18',after<before,`${before} -> ${after}`);
  // leave the sample and run the flows on real (blank) books
  await p.evaluate(()=>document.querySelector('[data-action="exit-demo"]').click());
  await p.evaluate(()=>go('invoices'));await p.click('[data-action="biz-add-invoice"]');
  await p.fill('#biz-invoice-form input[name=client]','Acme Studio');await p.fill('#biz-invoice-form input[name=amount]','1500');
  await p.fill('#biz-invoice-form input[name=issued]','2026-08-01');await p.fill('#biz-invoice-form input[name=due]','2026-08-31');
  await p.click('#biz-invoice-form button[type=submit]');
  check('invoice saved as overdue',(await text()).includes('days late'));
  await p.click('[data-action="biz-pay"]');await p.click('#biz-pay-form button[type=submit]');
  const st=await p.evaluate(()=>({tx:state.transactions.length,paid:!!state.invoices[0].paid,rev:Budget.plMonth(state,'2026-09').revenue.total}));
  check('paid invoice becomes revenue',st.tx===1&&st.paid&&st.rev===150000,JSON.stringify(st));
  check('paid invoice leaves the open list',(await text()).includes('Nothing waiting to be paid'));
  await p.click('[data-action="biz-inv-filter"][data-filter="all"]');await p.click('[data-action="biz-unpay"]');await p.click('[data-action="biz-confirm-unpay"]');
  check('undo paid removes revenue',await p.evaluate(()=>state.transactions.length===0&&!state.invoices[0].paid));
  await p.evaluate(()=>go('mileage'));await p.click('[data-action="biz-add-trip"]');
  await p.fill('#biz-trip-form input[name=miles]','12.5');await p.fill('#biz-trip-form input[name=purpose]','Supplier visit');await p.check('#biz-trip-form input[name=round]');
  await p.click('#biz-trip-form button[type=submit]');
  check('round trip doubles miles',await p.evaluate(()=>state.mileage[0]?.miles===250));
  await p.evaluate(()=>go('settings'));await p.fill('#biz-settings-form input[name=taxRate]','30');await p.fill('#biz-settings-form input[name=mileageRate]','72.5');
  await p.click('#biz-settings-form button');check('settings saved',await p.evaluate(()=>state.settings.taxRate===3000&&state.settings.mileageRate===725));
  // category form carries the tax line
  await p.evaluate(()=>categoryForm());await p.fill('#category-form input[name=name]','Stock photos');
  await p.selectOption('#category-form select[name=group]','marketing');await p.selectOption('#category-form select[name=taxLine]','L27b');
  await p.click('#category-form button[type=submit]');
  check('new category keeps its line',await p.evaluate(()=>state.categories.find(c=>c.name==='Stock photos')?.taxLine==='L27b'));
  // saved books survive a reload and pass validation
  await p.reload();await p.waitForTimeout(300);
  check('reload keeps books',await p.evaluate(()=>state.invoices.length===1&&state.mileage.length===1&&state.niche==='business'));
  // narrow screen
  await p.setViewportSize({width:390,height:844});for(const s of ['dashboard','pl','tax','taxlines','invoices','mileage']){await p.evaluate(s=>go(s),s);await shot('phone-'+s);
    const over=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);check('no sideways scroll on phone: '+s,over<=1,String(over));}
  check('no page errors',!errors.length,errors.join('\n'));
  await b.close();console.log(fail?`${fail} smoke checks failed`:'business smoke: all checks passed');process.exit(fail?1:0);
})();
