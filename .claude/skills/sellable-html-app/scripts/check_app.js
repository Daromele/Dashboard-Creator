// Browser QA for any house-style app: no errors, every screen renders, no sideways scroll on a phone,
// a dark theme renders, print hides the chrome, reduced motion stops animation.
//   node check_app.js App.html [--shots dir] [--nav ".navlink"] [--sample '[data-action="sample"]'] [--dark night]
//   Core-built apps (Shop Insights, Monthly Plan): --sample '[data-action="demo"]'
// Exit code 1 on any failure. Look at the screenshots too: checks don't catch ugly.
const {chromium}=require(require.resolve('playwright',{paths:[process.env.NODE_PATH||'/opt/node22/lib/node_modules','.']}));
const path=require('path'),fs=require('fs');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d;};
const file=path.resolve(process.argv[2]||''),NAV=arg('nav','.navlink'),SAMPLE=arg('sample','[data-action="sample"]'),DARK=arg('dark','night'),SHOTS=arg('shots');
if(!fs.existsSync(file)){console.error('usage: node check_app.js App.html [--shots dir]');process.exit(1);}
if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const fails=[],ok=m=>console.log('  ok  '+m),bad=m=>{fails.push(m);console.log('  FAIL '+m);};
async function open(b,vp,opts={}){const ctx=await b.newContext({viewport:vp,...opts}),p=await ctx.newPage(),errs=[];
 p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
 await p.goto('file://'+file);await p.waitForTimeout(700);
 await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 if(await p.locator(SAMPLE).count()){await p.locator(SAMPLE).first().evaluate(el=>el.click());await p.waitForTimeout(500);}
 return {p,errs,ctx};}
const screens=p=>p.$$eval(NAV,els=>els.map((el,i)=>({i,label:el.textContent.trim().replace(/\s+/g,' ')})));
const overflow=p=>p.evaluate(()=>document.scrollingElement.scrollWidth-innerWidth);
(async()=>{const b=await chromium.launch();
 console.log('desktop 1440×900');
 {const {p,errs,ctx}=await open(b,{width:1440,height:900});const list=await screens(p);
  if(!list.length)bad(`no nav items match ${NAV}`);
  for(const s of list){await p.locator(NAV).nth(s.i).click();await p.waitForTimeout(450);
   const txt=await p.evaluate(()=>(document.querySelector('main,#content')||document.body).innerText.trim().length);
   txt>40?ok(`${s.label}: renders`):bad(`${s.label}: looks empty`);
   const o=await overflow(p);if(o>1)bad(`${s.label}: ${o}px sideways scroll`);
   if(SHOTS)await p.screenshot({path:path.join(SHOTS,`desk-${String(s.i).padStart(2,'0')}.png`)});}
  // dark theme on the first screen
  await p.locator(NAV).first().click();await p.evaluate(t=>document.documentElement.dataset.theme=t,DARK);await p.waitForTimeout(300);
  const bg=await p.evaluate(()=>getComputedStyle(document.body).backgroundColor);const lum=bg.match(/\d+/g).slice(0,3).reduce((n,v)=>n+ +v,0)/3;
  lum<80?ok(`${DARK} theme: dark background (${bg})`):bad(`${DARK} theme did not change the background (${bg})`);
  if(SHOTS)await p.screenshot({path:path.join(SHOTS,'desk-dark.png')});
  // print hides the chrome
  await p.emulateMedia({media:'print'});
  const chrome=await p.evaluate(()=>[...document.querySelectorAll('.rail,.topbar,.toast')].filter(e=>getComputedStyle(e).display!=='none').length);
  chrome?bad(`print: ${chrome} chrome element(s) still showing`):ok('print: sidebar, top bar and toast hidden');
  errs.length?bad('errors: '+errs.slice(0,5).join(' | ')):ok('no page errors');await ctx.close();}
 console.log('phone 390×844');
 {const {p,errs,ctx}=await open(b,{width:390,height:844},{isMobile:true,hasTouch:true});const list=await screens(p);
  for(const s of list){await p.locator(NAV).nth(s.i).evaluate(el=>el.click());await p.waitForTimeout(400);const o=await overflow(p);
   o>1?bad(`phone ${s.label}: ${o}px sideways scroll`):ok(`phone ${s.label}: fits`);
   if(SHOTS)await p.screenshot({path:path.join(SHOTS,`phone-${String(s.i).padStart(2,'0')}.png`),fullPage:true});}
  errs.length?bad('phone errors: '+errs.slice(0,5).join(' | ')):ok('no page errors');await ctx.close();}
 console.log('reduced motion');
 {const {p,ctx}=await open(b,{width:1440,height:900},{reducedMotion:'reduce'});
  const moving=await p.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e);return s.animationName!=='none'&&parseFloat(s.animationDuration)>0.01;}).length);
  moving?bad(`${moving} element(s) still animate under reduced motion`):ok('no animation under reduced motion');await ctx.close();}
 await b.close();console.log(fails.length?`\n${fails.length} failure(s)`:'\nall checks passed');process.exit(fails.length?1:0);})();
