// Screenshots for the listing deck, from the full app with the three demo shops imported the way a buyer would.
// Same sizes as the mockup-deck skill's capture.js: ratio 1.6 at 2x, saved 1400px wide (tabs) and 920px (themes).
//   node ../../build/demo_data.js && node capture_demo.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules','.']}));
const path=require('path'),fs=require('fs'),{execFileSync}=require('child_process');
const HERE=__dirname,APP='file://'+path.join(HERE,'../../app/ShopInsightsEtsy.html'),DATA=path.join(HERE,'../demo-data'),OUT=path.join(HERE,'shots');
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const toJpg=(png,w)=>{execFileSync('python3',['-c',`from PIL import Image;im=Image.open("${png}").convert("RGB");h=round(im.height*${w}/im.width);im.resize((${w},h),Image.LANCZOS).save("${png.replace(/\.png$/,'.jpg')}",quality=88)`]);fs.unlinkSync(png);};
const SHOPS=[['Fern and Fable Prints','Fern & Fable Prints','fern'],['Copper Kiln Ceramics','Copper Kiln Ceramics','kiln'],['Plan and Page Studio','Plan & Page Studio','page']];
// name, what to run first, optional element to start at
const TABS=[
 ['dashboard',"state.settings.shop='';selected='2026-09';go('dashboard')"],
 ['insights',"go('insights')"],
 ['annual',"go('annual')"],
 ['years',"go('years')"],
 ['shops',"go('shops');document.querySelector('[data-action=etsy-span][data-span=year]').click()"],
 ['fees',"go('fees');document.querySelector('[data-action=etsy-span][data-span=month]')?.click()"],
 ['products',"go('products')"],
 ['launches',"go('launches')"],
 ['customers',"go('customers');document.querySelector('[data-action=etsy-span][data-span=year]')?.click()"],
 ['reviews',"state.settings.shop='s0';go('reviews')"],
 ['pl',"state.settings.shop='';go('pl')"],
 ['taxlines',"go('taxlines')"],
 ['pricing',"go('pricing')"],
 ['import',"go('etsy-import')"],
];
(async()=>{const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:1600,height:1400},deviceScaleFactor:2,reducedMotion:'reduce'}),p=await ctx.newPage();
 await p.clock.setFixedTime(new Date('2026-09-28T15:00:00Z'));
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(APP);await p.evaluate(()=>{localStorage.setItem('jps-shop-insights-welcome-v1','1');localStorage.setItem('jps-shop-insights-manual-backup',String(Date.now()));});await p.goto(APP);await p.waitForTimeout(500);
 for(const [dir,name,logo] of SHOPS){await p.evaluate(()=>go('etsy-import'));
  if(!(await p.evaluate(()=>state.shops.length))){await p.fill('#etsy-shop-form input[name=name]',name);await p.click('#etsy-shop-form button');}
  else{await p.evaluate(n=>{commit(()=>state.shops.push({id:'s'+state.shops.length,name:n,platform:'etsy'}));go('etsy-import');},name);await p.selectOption('#etsy-import-shop',{label:name});}
  await p.setInputFiles('#etsy-files',fs.readdirSync(path.join(DATA,dir)).map(f=>path.join(DATA,dir,f)));
  await p.waitForFunction(()=>document.querySelector('#content').innerText.includes('Ready to import'),null,{timeout:90000});await p.click('[data-action="etsy-import"]');
  await p.waitForFunction(()=>!Etsy.session?.files?.length,null,{timeout:90000});await p.waitForTimeout(400);
  await p.evaluate(()=>go('shops'));await p.evaluate(()=>{const g=document.querySelector('[data-action=etsy-shops-layout][data-k=grid]');g?.click();});
  const idx=await p.evaluate(n=>state.shops.findIndex(s=>s.name===n),name);
  await p.setInputFiles(`input[data-kind="logo"][data-shop-img="${await p.evaluate(i=>state.shops[i].id,idx)}"]`,path.join(HERE,'logos',logo+'.png'));await p.waitForTimeout(700);
  console.log('imported',name);}
 // every view on, like a buyer who switched them all on; one shop's id for the reviews shot
 await p.evaluate(()=>{state.settings.hiddenNav=[];state.shops[0].id;save();render();});
 await p.evaluate(()=>{const id=state.shops[0].id;window.__s0=id;});
 for(const [name,before] of TABS){
  await p.evaluate(src=>{new Function(src.replace("'s0'","window.__s0"))();document.querySelector('#toast')?.setAttribute('hidden','');document.querySelectorAll('dialog[open]').forEach(d=>d.close());window.scrollTo(0,0);},before);await p.waitForTimeout(900);
  const box=await p.locator('#content').boundingBox(),pad=18,w=Math.min(box.width-2*pad,1560),y=Math.max(0,box.y+6);
  const f=path.join(OUT,'tab-'+name+'.png');await p.screenshot({path:f,clip:{x:box.x+pad,y,width:w,height:Math.min(w/1.6,1400-y-4)}});toJpg(f,1400);console.log('tab',name);}
 // themes: the dashboard in each look
 const themes=await p.evaluate(()=>P.themes);
 await p.setViewportSize({width:1360,height:958});
 for(const T of themes){await p.evaluate(T=>{state.settings.theme=T;state.settings.shop='';go('dashboard');render();window.scrollTo(0,0);document.querySelector('#toast')?.setAttribute('hidden','');},T);await p.waitForTimeout(1600);
  const f=path.join(OUT,'theme-'+T+'.png');await p.screenshot({path:f});toJpg(f,920);console.log('theme',T);}
 console.log('errors',JSON.stringify(errs));await b.close();})();
