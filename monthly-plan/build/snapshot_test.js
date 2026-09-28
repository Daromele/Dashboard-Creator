// Proves the free take-home check agrees with the full app on the same files, stays small, and stores nothing.
//   node build/demo_data.js && node build/make_snapshot.js && node build/snapshot_test.js
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),'/opt/node22/lib/node_modules']}));
const fs=require('fs'),path=require('path');
const APP=path.join(__dirname,'../app'),PAGE='file://'+APP+'/ShopInsightsDemo.html',FULL='file://'+APP+'/ShopInsightsEtsy.html';
const DIR=path.join(__dirname,'../listing-kit/demo-data/Copper Kiln Ceramics'),ALL=fs.readdirSync(DIR).map(f=>path.join(DIR,f));
const BUY=fs.readFileSync(path.join(__dirname,'make_snapshot.js'),'utf8').match(/BUY_URL='([^']+)'/)[1];
let fails=0;const check=(n,ok,info='')=>{console.log((ok?'ok   ':'FAIL ')+n+(ok?'':' '+String(info).slice(0,300)));if(!ok)fails++;};
const usd=s=>Math.round(parseFloat(String(s).replace(/[^\d.-]/g,''))*100);
(async()=>{const b=await chromium.launch();
 // what the full app says for the same shop and the same three months
 const f=await b.newPage();await f.clock.setFixedTime(new Date('2026-09-28T12:00:00Z'));await f.goto(FULL);await f.evaluate(()=>localStorage.setItem('jps-shop-insights-welcome-v1','1'));await f.goto(FULL);await f.waitForTimeout(300);
 await f.evaluate(()=>go('etsy-import'));await f.fill('#etsy-shop-form input[name=name]','Copper Kiln Ceramics');await f.click('#etsy-shop-form button');await f.setInputFiles('#etsy-files',ALL);
 await f.waitForFunction(()=>document.querySelector('#content').innerText.includes('Ready to import'),null,{timeout:60000});await f.click('[data-action="etsy-import"]');await f.waitForFunction(()=>!Etsy.session?.files?.length,null,{timeout:60000});
 const want=await f.evaluate(()=>{const S=EtsyData.summary(state,'2026-07-01','2026-09-27');return {takeHome:S.takeHome,revenue:S.revenue};});

 const p=await b.newPage({viewport:{width:1280,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
 await p.goto(PAGE);
 check('small page',fs.statSync(path.join(APP,'ShopInsightsDemo.html')).size<40*1024);
 check('none of the full app inside',await p.evaluate(()=>typeof Budget==='undefined'&&typeof EtsyData==='undefined'&&typeof Ext==='undefined'));
 await p.click('#sample');check('sample shop report',/Take-home/i.test(await p.innerText('#report'))&&/made-up sample/.test(await p.innerText('#report')));
 await p.click('#again');await p.setInputFiles('#files',ALL);await p.waitForSelector('#report:not([hidden])');
 const hero=await p.evaluate(()=>({take:document.querySelector('.hero .big').textContent,rev:[...document.querySelectorAll('.facts div')][0].querySelector('strong').textContent,range:document.querySelector('.hero .eyebrow').textContent}));
 check('latest 3 months only',/Jul 1, 2026 – Sep 2[67], 2026/.test(hero.range),hero.range);
 check('take-home matches the full app to the cent',usd(hero.take)===want.takeHome,`${hero.take} vs ${want.takeHome}`);
 check('sales match the full app to the cent',usd(hero.rev)===want.revenue,`${hero.rev} vs ${want.revenue}`);
 check('older months are mentioned, not shown',/latest 3 months/.test(await p.innerText('#report')));
 check('top sellers and countries from the order file',await p.evaluate(()=>document.querySelectorAll('#report table tbody tr').length>=6));
 const again=await p.evaluate(()=>document.querySelector('.hero .big').textContent);await p.click('#again');await p.setInputFiles('#files',[...ALL,...ALL.filter(x=>/statement_2026_9/.test(x))]);await p.waitForSelector('#report:not([hidden])');
 check('the same statement twice counts once',await p.evaluate(()=>document.querySelector('.hero .big').textContent)===again);
 const hrefs=await p.evaluate(()=>[...document.querySelectorAll('[data-buy]')].map(a=>a.href));check('buy buttons go to the listing',hrefs.length>=2&&hrefs.every(h=>h.startsWith(BUY)),JSON.stringify(hrefs));
 check('nothing stored',await p.evaluate(async()=>localStorage.length===0&&(await indexedDB.databases()).length===0));
 check('no page errors',!errs.length,JSON.stringify(errs));
 if(process.argv[2]){await p.screenshot({path:process.argv[2]+'/snapshot-report.png',fullPage:true});await p.click('#again');await p.screenshot({path:process.argv[2]+'/snapshot-start.png',fullPage:true});}
 await b.close();console.log(fails?`${fails} checks failed`:'take-home check: all checks passed');process.exit(fails?1:0);})();
