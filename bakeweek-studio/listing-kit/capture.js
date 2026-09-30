// Screenshots for the Bakeweek Studio listing deck, from the app's own fictional demo bakery.
// Full app window (sidebar included) at 1440×900 = ratio 1.6, 2x, saved 1400px wide.
//   node capture.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules','.']}));
const path=require('path'),fs=require('fs'),{execFileSync}=require('child_process');
const APP='file://'+path.join(__dirname,'../Bakeweek_Studio.html'),OUT=path.join(__dirname,'shots');
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const toJpg=png=>{execFileSync('python3',['-c',`from PIL import Image;im=Image.open("${png}").convert("RGB");im.resize((1400,round(im.height*1400/im.width)),Image.LANCZOS).save("${png.replace(/\.png$/,'.jpg')}",quality=88)`]);fs.unlinkSync(png);};
// name, clicks, element to scroll to the top (with a small margin)
const SHOTS=[
 ['week',[]],
 ['plan',['.tab[data-tab=plan]'],'.output-tray'],
 ['shopping',['.tab[data-tab=shopping]'],'.tabs'],
 ['batches',['.tab[data-tab=batches]'],'.tabs'],
 ['packing',['.tab[data-tab=packing]'],'.tabs'],
 ['orders',['.nav-item[data-page=orders]']],
 ['recipes',['.nav-item[data-page=recipes]']],
 ['pantry',['.nav-item[data-page=pantry]']],
 ['settings',['.nav-item[data-page=settings]']],
 ['simulator',['.nav-item[data-page=week]','.tab[data-tab=plan]','[data-action=simulator]']],
];
(async()=>{const b=await chromium.launch(),p=await (await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2,reducedMotion:'reduce'})).newPage();
 await p.clock.setFixedTime(new Date('2026-10-06T15:00:00'));
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(APP);await p.waitForTimeout(600);await p.click('#demoButton');await p.waitForTimeout(500);
 for(const [name,clicks,top] of SHOTS){
  for(const c of clicks){await p.click(c);await p.waitForTimeout(350);}
  await p.evaluate(top=>{document.querySelector('#toast').hidden=true;document.activeElement?.blur();
   const el=top&&document.querySelector(top);window.scrollTo(0,el?el.getBoundingClientRect().top+scrollY-(top==='.output-tray'?12:24):0);},top);
  await p.waitForTimeout(400);
  const f=path.join(OUT,'tab-'+name+'.png');await p.screenshot({path:f});toJpg(f);console.log('tab',name);}
 console.log('errors',JSON.stringify(errs));await b.close();})();
