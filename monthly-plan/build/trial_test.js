// Proves the free trial's limits against the demo files, and that its backup restores into the full app.
//   node build/demo_data.js && python3 build/make_trial.py && node build/trial_test.js
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),'/opt/node22/lib/node_modules']}));
const fs=require('fs'),path=require('path'),os=require('os');
const APP=path.join(__dirname,'../app'),TRIAL='file://'+APP+'/ShopInsightsTrial.html',FULL='file://'+APP+'/ShopInsightsEtsy.html';
const DATA=path.join(__dirname,'../listing-kit/demo-data/Fern and Fable Prints');
const BUY=(fs.readFileSync(path.join(__dirname,'make_trial.py'),'utf8').match(/BUY_URL = '([^']+)'/)||[])[1];
let fails=0;const check=(name,ok,info='')=>{console.log((ok?'ok   ':'FAIL ')+name+(ok?'':' '+String(info).slice(0,300)));if(!ok)fails++;};
(async()=>{
 const b=await chromium.launch(),ctx=await b.newContext({acceptDownloads:true}),p=await ctx.newPage({viewport:{width:1440,height:1000}});
 await p.clock.setFixedTime(new Date('2026-09-28T12:00:00Z'));
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
 await p.goto(TRIAL);await p.evaluate(()=>{localStorage.setItem('jps-shop-insights-trial-welcome-v1','1');localStorage.setItem('jps-shop-insights-trial-manual-backup',String(Date.now()));});await p.goto(TRIAL);await p.waitForTimeout(300);
 const modalText=async()=>{const t=await p.evaluate(()=>document.querySelector('#modal')?.open?document.querySelector('#modal').innerText:'');await p.evaluate(()=>{if(document.querySelector('#modal')?.open)closeModal();});return t;};
 check('trial strip shows before any data',(await p.innerText('#trial-bar')).includes('Free trial'));

 // one shop, last 3 months of the files
 await p.evaluate(()=>go('etsy-import'));await p.fill('#etsy-shop-form input[name=name]','Fern & Fable Prints');await p.click('#etsy-shop-form button');
 await p.setInputFiles('#etsy-files',fs.readdirSync(DATA).map(f=>path.join(DATA,f)));
 await p.waitForFunction(()=>document.querySelector('#content').innerText.includes('Ready to import'),null,{timeout:60000});await p.waitForTimeout(300);
 const pre=await p.innerText('#content');
 check('older statements are refused with the trial reason',/Older than the 3 months the free trial keeps/.test(pre),pre.slice(0,400));
 check('order files keep only the latest months',/Free trial: kept July 2026 onward/.test(pre),pre.slice(0,400));
 await p.click('[data-action="etsy-import"]');await p.waitForFunction(()=>!Etsy.session?.files?.length,null,{timeout:60000});await p.waitForTimeout(300);
 const kept=await p.evaluate(()=>({o:state.etsy.orders.map(o=>o.date).sort(),t:state.transactions.map(t=>t.date).sort(),r:state.etsy.reviews.map(r=>r.date).sort(),d:state.etsy.deposits.map(r=>r.date).sort()}));
 check('only July – September 2026 were imported',[kept.o[0],kept.t[0],kept.r[0],kept.d[0]].every(d=>d>='2026-07-01')&&kept.o.length>200,JSON.stringify([kept.o[0],kept.t[0],kept.r[0],kept.d[0],kept.o.length]));
 check('the trial strip names the months',/July 2026 – September 2026/.test(await p.innerText('#trial-bar')),await p.innerText('#trial-bar'));
 await p.evaluate(()=>go('shops'));await p.click('[data-action="etsy-add-shop"]');
 check('a second shop opens the upsell',/More than one shop/.test(await modalText()));
 check('still one shop',await p.evaluate(()=>state.shops.length)===1);

 // locked actions and screens
 await p.evaluate(()=>go('dashboard'));await p.click('[data-action="print"]');check('print opens the upsell',/Printing/.test(await modalText()));
 await p.evaluate(()=>go('products'));await p.click('[data-action="etsy-products-csv"]').catch(()=>{});check('CSV export opens the upsell',/CSV/.test(await modalText()));
 for(const s of ['fees','products','pl','insights','tax','taxlines','pricing','launches']){await p.evaluate(s=>go(s),s);await p.waitForTimeout(80);
  check(`${s}: lock card and blurred rest`,await p.evaluate(()=>!!document.querySelector('.trial-lock')&&(document.querySelectorAll('.trial-blur').length>0||document.querySelectorAll('.trial-hide').length>0||!document.querySelector('#content section.card:not(.trial-lock)'))));}
 for(const s of ['dashboard','insights','customers','reviews','annual','shops','activity','coupons']){await p.evaluate(s=>go(s),s);await p.waitForTimeout(80);
  const open=await p.evaluate(()=>!document.querySelector('.trial-lock'));const content=await p.evaluate(()=>document.querySelector('#content').innerText.length);check(`${s}: open`,s==='insights'?true:open&&content>400,content);}
 await p.evaluate(()=>go('insights'));check('insights: health score readable, first tip readable, rest blurred',await p.evaluate(()=>{const a=[...document.querySelectorAll('.kit-act')];return !!document.querySelector('.kit-ins-hero:not(.trial-blur)')&&a.length>1&&!a[0].classList.contains('trial-blur')&&a.slice(1).every(x=>x.classList.contains('trial-blur'));}));
 await p.evaluate(()=>go('settings'));check('folder backup is a full-version card',/Full version/.test(await p.innerText('#content')));
 const hrefs=await p.evaluate(()=>[...document.querySelectorAll('a.btn')].filter(a=>/full version/i.test(a.textContent)).map(a=>a.href));
 check('every buy button goes to the listing',hrefs.length>0&&hrefs.every(h=>h.startsWith(BUY)),JSON.stringify(hrefs));

 // sample mode: every screen, several shops, no trial trimming
 await p.evaluate(()=>go('dashboard'));await p.click('[data-action="demo"]');await p.waitForTimeout(300);
 check('sample mode strip',/sample mode/.test(await p.innerText('#trial-bar')));
 for(const s of ['fees','tax','launches','insights']){await p.evaluate(s=>go(s),s);await p.waitForTimeout(80);check(`sample ${s} unlocked`,await p.evaluate(()=>!document.querySelector('.trial-lock,.trial-blur')));}
 check('sample has several shops',await p.evaluate(()=>state.shops.length)>1);
 await p.click('[data-action="exit-demo"]').catch(async()=>{await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Return to my shops/.test(x.textContent));b?.click();});});await p.waitForTimeout(300);

 // storage is the trial's own, and the backup restores into the full app
 check('saved under the trial key',await p.evaluate(async()=>{await new Promise(r=>setTimeout(r,300));return !!(await dataStore('get'));})&&await p.evaluate(()=>P.storage.key)==='jps-shop-insights-trial');
 await p.evaluate(()=>go('settings'));const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-action="backup"]')]);
 const file=path.join(os.tmpdir(),'trial-backup.json');await dl.saveAs(file);
 const full=await (await b.newContext()).newPage();full.on('pageerror',e=>errs.push('full: '+e.message));
 await full.goto(FULL);await full.evaluate(()=>{localStorage.setItem('jps-shop-insights-welcome-v1','1');});await full.goto(FULL);await full.waitForTimeout(300);
 await full.evaluate(()=>go('settings'));await full.setInputFiles('#restore-file',file);await full.waitForTimeout(400);await full.click('[data-action="confirm-restore"]');await full.waitForTimeout(500);
 const after=await full.evaluate(()=>({shops:state.shops.map(s=>s.name),orders:state.etsy.orders.length,tx:state.transactions.length}));
 check('trial backup restores into the full app',after.shops[0]==='Fern & Fable Prints'&&after.orders===kept.o.length&&after.tx===kept.t.length,JSON.stringify(after));
 check('no page errors',!errs.length,JSON.stringify(errs));
 if(process.argv[2]){for(const s of ['fees','insights','tax','etsy-import']){await p.evaluate(s=>go(s),s);await p.waitForTimeout(200);await p.screenshot({path:process.argv[2]+'/trial-'+s+'.png',fullPage:true});}}await b.close();console.log(fails?`${fails} trial checks failed`:'trial: all checks passed');process.exit(fails?1:0);
})();
