// Pass 2 of the newbie check: the screenshots a first-time buyer would see, as contact sheets to look at.
//   node walk.js <App.html> <outDir> [--date 2026-10-05]
// Writes <outDir>/sheet-*.jpg: welcome tour · empty app (every screen) · the first add form ·
// sample mode (every screen, full page) · phone 390 px · a dark theme · print preview.
const {chromium}=require(require.resolve('playwright',{paths:[process.env.NODE_PATH||'/opt/node22/lib/node_modules','.']}));
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const APP=path.resolve(process.argv[2]),OUT=path.resolve(process.argv[3]||'.');fs.mkdirSync(OUT,{recursive:true});
const di=process.argv.indexOf('--date'),DATE=di>0?process.argv[di+1]:'2026-10-05';
const sheet=(files,name,w=480,cols=3)=>{execFileSync('python3',['-c',`
from PIL import Image
fs=${JSON.stringify(files)};ims=[Image.open(f).convert('RGB') for f in fs];ims=[i.resize((${w},max(1,int(${w}*i.height/i.width)))) for i in ims]
rows=[ims[k:k+${cols}] for k in range(0,len(ims),${cols})];H=sum(max(i.height for i in r) for r in rows)
s=Image.new('RGB',(${w}*${cols},H),'white');y=0
for r in rows:
  for c,i in enumerate(r):s.paste(i,(c*${w},y))
  y+=max(i.height for i in r)
s.save('${path.join(OUT,name)}',quality=72)`]);files.forEach(f=>fs.unlinkSync(f));};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1366,height:820}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.clock.setFixedTime(new Date(DATE+'T12:00:00'));
 await p.goto('file://'+APP);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(900);
 const shot=async(n,o={})=>{const f=path.join(OUT,n+'.png');await p.evaluate(()=>{const t=document.querySelector('#toast');if(t)t.hidden=true;});await p.screenshot({path:f,...o});return f;};
 // 1. the welcome tour, slide by slide
 const W=[];for(let i=0;i<8;i++){W.push(await shot('w'+i));const more=await p.evaluate(()=>{const n=document.querySelector('#welcome-tour [data-action="welcome-next"]');if(n&&n.offsetParent){n.click();return true;}return false;});if(!more)break;await p.waitForTimeout(350);}
 sheet(W,'sheet-1-welcome.jpg');
 await p.evaluate(()=>{try{closeWelcome()}catch{};state.settings.hiddenNav=[];render();});await p.waitForTimeout(300);
 const SCREENS=await p.evaluate(()=>[...new Set([...document.querySelectorAll('#nav [data-go]')].map(e=>e.dataset.go))]);
 // 2. the empty app, every screen
 const Em=[];for(const v of SCREENS){await p.evaluate(x=>go(x),v);await p.waitForTimeout(350);Em.push(await shot('e-'+v));}sheet(Em,'sheet-2-empty.jpg');
 // 3. the first add form, as the top bar's main button opens it
 await p.evaluate(()=>go(P.nav[0][0]));await p.waitForTimeout(200);
 const F=[];await p.evaluate(()=>[...document.querySelectorAll('.topbar .actions .btn.primary')].filter(e=>e.offsetParent).pop()?.click());await p.waitForTimeout(400);F.push(await shot('f-desktop'));
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(200);F.push(await shot('f-phone',{fullPage:true}));
 await p.evaluate(()=>{try{$('#modal').close()}catch{}});await p.setViewportSize({width:1366,height:820});sheet(F,'sheet-3-add-form.jpg',600,2);
 // 4. sample mode, every screen, full page
 await p.evaluate(()=>document.querySelector('[data-action="demo"]')?.click());await p.waitForTimeout(800);await p.evaluate(()=>{state.settings.hiddenNav=[];render();});
 const S=[];for(const v of SCREENS){await p.evaluate(x=>go(x),v);await p.waitForTimeout(500);S.push(await shot('s-'+v,{fullPage:true}));}sheet(S,'sheet-4-sample.jpg',480,4);
 // 5. phone width
 await p.setViewportSize({width:390,height:844});const Ph=[];for(const v of SCREENS.slice(0,6)){await p.evaluate(x=>go(x),v);await p.waitForTimeout(400);Ph.push(await shot('p-'+v));}sheet(Ph,'sheet-5-phone.jpg',300,6);
 // 6. a dark theme and print
 await p.setViewportSize({width:1366,height:820});const D=[];
 await p.evaluate(()=>{state.settings.theme=Budget.THEMES.includes('midnight')?'midnight':'night';go(P.nav[0][0]);});await p.waitForTimeout(500);D.push(await shot('d-dark',{fullPage:true}));
 await p.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));await p.emulateMedia({media:'print'});await p.waitForTimeout(300);D.push(await shot('d-print',{fullPage:true}));sheet(D,'sheet-6-dark-print.jpg',600,2);
 console.log(`sheets in ${OUT} · ${SCREENS.length} screens · page errors: ${errs.length?errs.join(' | '):'none'}`);
 await b.close();})();
