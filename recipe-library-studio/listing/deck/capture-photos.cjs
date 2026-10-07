// Copy of html-mockup-decks/family-c/scripts/capture.js that also loads remote recipe photos through Node.
// Capture deck screenshots from a single-file HTML app with Playwright.
// usage: node capture.js capture.json
// capture.json: {"app":"MyApp.html","out":"shots","setup":"<js run once in page>",
//   "content":"#content", "navigate":"button[data-go=\"{view}\"]",
//   "tabs":[{"name":"dashboard","view":"dashboard","offset":6},{"name":"heat","view":"annual","scrollTo":".matrix"}],
//   "themes":{"list":["light","dark"],"apply":"state.settings.theme=T;render();"}}
// Writes <out>/tab-<name>.jpg (1400px wide) and <out>/theme-<name>.jpg (920px wide).
const {chromium}=require(require.resolve('playwright',{paths:[process.env.NODE_PATH||'/opt/node22/lib/node_modules','.']}));
const path=require('path'),fs=require('fs'),{execFileSync}=require('child_process');
const cfgPath=path.resolve(process.argv[2]),C=JSON.parse(fs.readFileSync(cfgPath,'utf8')),B=path.dirname(cfgPath);
const R=p=>path.isAbsolute(p)?p:path.join(B,p);
const APP='file://'+R(C.app),OUT=R(C.out||'shots');fs.mkdirSync(OUT,{recursive:true});
// 1.6 = wide and short: the slide gives width, not height. Captured at 2x so a
// 1400px-wide slot is never upscaled.
const RATIO=C.ratio||1.6;
const toJpg=(png,w)=>{execFileSync('python3',['-c',`from PIL import Image;im=Image.open("${png}").convert("RGB");h=round(im.height*${w}/im.width);im.resize((${w},h),Image.LANCZOS).save("${png.replace(/\.png$/,'.jpg')}",quality=86)`]);fs.unlinkSync(png);};
// recipe photos live on the recipe sites: fetch them in Node (through the environment's proxy) and hand them to the page
const viaNode=async ctx=>ctx.route(u=>/^https?:/.test(u.href),async route=>{try{const r=await fetch(route.request().url(),{headers:{'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'}});
  await route.fulfill({status:r.status,headers:{'content-type':r.headers.get('content-type')||'application/octet-stream','access-control-allow-origin':'*'},body:Buffer.from(await r.arrayBuffer())});}catch{await route.abort();}});
const open=async(b,vp)=>{const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2});await viaNode(ctx);const p=await ctx.newPage();
  await p.goto(APP);await p.waitForTimeout(900);if(C.setup){await p.evaluate(C.setup);await p.waitForTimeout(700);}return p;};
(async()=>{const b=await chromium.launch();
 const p=await open(b,{width:1600,height:1400});
 for(const t of C.tabs||[]){
  if(t.view){await p.locator((C.navigate||'').replace('{view}',t.view)).first().click();await p.waitForTimeout(850);}
  if(t.before){await p.evaluate(t.before);await p.waitForTimeout(800);}
  let box;
  if(t.scrollTo){const el=p.locator(t.scrollTo).first();await el.scrollIntoViewIfNeeded();await p.waitForTimeout(600);box=await el.boundingBox();}
  else box=await p.locator(C.content||'body').boundingBox();
  const pad=t.scrollTo?0:18,w=Math.min(box.width-2*pad,1560);
  const y=Math.max(0,box.y+(t.offset||0));            // a scrolled element can sit above the viewport
  const clip={x:Math.max(0,box.x+pad),y,width:w,height:Math.min(w/(t.ratio||RATIO),1400-y-4)};
  const f=path.join(OUT,'tab-'+t.name+'.png');await p.screenshot({path:f,clip});toJpg(f,1400);console.log('tab',t.name);
 }
 if(C.themes)for(const T of C.themes.list){
  const q=await open(b,{width:1360,height:958});
  await q.evaluate(new Function('T',C.themes.apply),T);await q.waitForTimeout(500);
  const f=path.join(OUT,'theme-'+T+'.png');await q.screenshot({path:f});toJpg(f,920);await q.context().close();console.log('theme',T);
 }
 await b.close();})();
