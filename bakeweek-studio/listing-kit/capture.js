// Screenshots for the Bakeweek Studio listing deck, from the built app's sample bakery (Sunday Crumb).
// Full app window (sidebar included) at 1440×900 = ratio 1.6, 2x, saved 1400px wide; themes 1360×958 at 920px.
//   node capture.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules','.']}));
const path=require('path'),fs=require('fs'),{execFileSync}=require('child_process');
const APP='file://'+path.join(__dirname,'../Bakeweek_Studio.html')+'?demo=1',OUT=path.join(__dirname,'shots');
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const toJpg=(png,w)=>{execFileSync('python3',['-c',`from PIL import Image;im=Image.open("${png}").convert("RGB");im.resize((${w},round(im.height*${w}/im.width)),Image.LANCZOS).save("${png.replace(/\.png$/,'.jpg')}",quality=88)`]);fs.unlinkSync(png);};
// name, what to run, element to scroll to the top
const SHOTS=[
 ['week',"go('week')"],['plan',"go('week')",'.days'],['calendar',"go('calendar')",'.cal-card'],
 ['menu',"go('menu')"],['standing',"go('standing')"],['markets',"go('markets')"],
 ['shopping',"go('shopping')"],['batches',"go('batches')"],['labels',"go('labels')"],['customers',"go('customers')"],
 ['money',"go('money')"],['simulator',"week=C.addDays(C.monday(today()),7);go('week');simulator();simDraft.lines[0].qty=24;updateSimFields()"],['tools',"UI.tools.tab='dough';go('tools')"],
 ['recipes',"go('recipes')"],['settings',"go('settings')"],
];
const clean=()=>{document.querySelector('#toast').hidden=true;document.activeElement?.blur();};
(async()=>{const b=await chromium.launch();
 const open=async vp=>{const p=await (await b.newContext({viewport:vp,deviceScaleFactor:2,reducedMotion:'reduce'})).newPage();await p.clock.setFixedTime(new Date('2026-10-06T15:00:00'));await p.goto(APP);await p.waitForTimeout(900);return p;};
 const p=await open({width:1440,height:900}),errs=[];p.on('pageerror',e=>errs.push(e.message));
 for(const [name,run,top] of SHOTS){await p.evaluate(()=>{if(document.querySelector('#dlg').open)closeModal();});await p.evaluate(run);
  await p.evaluate(([top,c])=>{new Function(c)();const el=top&&document.querySelector(top);window.scrollTo(0,el?el.closest('.card')?.getBoundingClientRect().top+scrollY-20||0:0);},[top,`(${clean})()`]);
  await p.waitForTimeout(400);const f=path.join(OUT,'tab-'+name+'.png');await p.screenshot({path:f});toJpg(f,1400);console.log('tab',name);}
 const q=await open({width:1360,height:958});
 for(const T of ['fjord','kiln','linen','sage','ledger','slate','night','midnight']){await q.evaluate(T=>{prefs.theme=T;go('week');document.querySelector('#toast').hidden=true;},T);await q.waitForTimeout(400);const f=path.join(OUT,'theme-'+T+'.png');await q.screenshot({path:f});toJpg(f,920);console.log('theme',T);}
 console.log('errors',JSON.stringify(errs));await b.close();})();
