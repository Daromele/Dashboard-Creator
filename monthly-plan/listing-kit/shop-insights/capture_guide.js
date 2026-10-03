// Screenshots for the Shop Insights buyer guide, from the built app's sample shops.
// Full window at 1440×900, 2x, saved 1400px wide.   node listing-kit/shop-insights/capture_guide.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules','.']}));
const path=require('path'),fs=require('fs'),{execFileSync}=require('child_process');
const APP='file://'+path.join(__dirname,'../../app/ShopInsightsEtsy.html'),OUT=path.join(__dirname,'guide-shots');
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const SETUP=JSON.parse(fs.readFileSync(path.join(__dirname,'capture.json'),'utf8')).setup;
const SHOTS=[['dashboard',"state.settings.shop='';go('dashboard')"],['import',"go('etsy-import')"],['shops',"go('shops')"],['fees',"go('fees')"],
 ['products',"go('products')"],['pricing',"go('pricing')"],['taxlines',"go('taxlines')"],['tax',"go('tax')"],['annual',"go('annual')"],
 ['backup',"go('settings')",'.backup-block']];
(async()=>{const b=await chromium.launch(),p=await (await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2,reducedMotion:'reduce'})).newPage(),errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.clock.setFixedTime(new Date('2026-09-24T15:00:00'));await p.goto(APP);await p.waitForTimeout(1000);await p.evaluate(SETUP);await p.waitForTimeout(800);
 for(const [name,run,top] of SHOTS){await p.evaluate(([run,top])=>{new Function(run)();document.querySelector('#toast')&&(document.querySelector('#toast').hidden=true);document.activeElement?.blur();
   const el=top&&document.querySelector(top);window.scrollTo(0,el?el.getBoundingClientRect().top+scrollY-175:0);},[run,top]);await p.waitForTimeout(500);
  const f=path.join(OUT,name+'.png');await p.screenshot({path:f});execFileSync('python3',['-c',`from PIL import Image;im=Image.open("${f}").convert("RGB");im.resize((1400,875),Image.LANCZOS).save("${f.replace('.png','.jpg')}",quality=86)`]);fs.unlinkSync(f);console.log(name);}
 console.log('errors',JSON.stringify(errs));await b.close();})();
