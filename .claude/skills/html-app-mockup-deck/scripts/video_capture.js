// Capture app states for a listing video, with the on-screen position of the
// things the cursor will click.
// usage: node video_capture.js video.json
// video.json (capture part): {"app","setup","content","navigate","shots_dir":"vshots",
//   "captures":[{"name":"plan0","view":"plan","before":"<js>","click":["<playwright selector>",...],
//                "scrollTo":"<selector>","targets":{"plus":"<playwright selector>"}}]}
// Captures run in order on one page, so a capture with only "click" continues
// from the state the previous one left (before → after pairs). "clipFrom":"<name>" reuses that
// capture's crop, lined up on its scrollTo element, so before/after frames match even when
// content above them changes height.
// Writes <shots_dir>/<name>.jpg (2560px wide, ratio 1.6) and <shots_dir>/targets.json
// with each target as fractions of the image: {x,y,w,h}.
const {chromium}=require(require.resolve('playwright',{paths:[process.env.NODE_PATH||'/opt/node22/lib/node_modules','.']}));
const path=require('path'),fs=require('fs'),{execFileSync}=require('child_process');
const cfgPath=path.resolve(process.argv[2]),C=JSON.parse(fs.readFileSync(cfgPath,'utf8')),B=path.dirname(cfgPath);
const R=p=>path.isAbsolute(p)?p:path.join(B,p);
const OUT=R(C.shots_dir||'vshots');fs.mkdirSync(OUT,{recursive:true});
const RATIO=C.ratio||1.6,W=C.capture_width||2560;
(async()=>{const b=await chromium.launch();
 const p=await (await b.newContext({viewport:{width:1600,height:1400},deviceScaleFactor:2})).newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+R(C.app));await p.waitForTimeout(900);
 if(C.setup){await p.evaluate(C.setup);await p.waitForTimeout(700);}
 const targets={},clips={};
 for(const c of C.captures){
  if(c.view){await p.locator((C.navigate||'').replace('{view}',c.view)).first().click();await p.waitForTimeout(850);}
  if(c.before){await p.evaluate(c.before);await p.waitForTimeout(600);}
  for(const s of c.click||[]){await p.locator(s).first().click();await p.waitForTimeout(500);}
  await p.evaluate(()=>{const t=document.querySelector('#toast');if(t)t.hidden=true;});
  await p.waitForTimeout(900);                       // let number tweens finish
  let box,clip;
  if(c.clipFrom&&clips[c.clipFrom]){const K=clips[c.clipFrom];await p.evaluate(y=>window.scrollTo(0,y),K.scrollY);
   // content above may have changed height: line the anchor element up where it was
   if(K.anchor)await p.evaluate(([sel,top])=>{const e=document.querySelector(sel);if(e)window.scrollBy(0,e.getBoundingClientRect().top-top);},[K.anchor,K.anchorTop]);
   await p.waitForTimeout(300);clip=K.clip;}
  else{
  if(c.scrollTo){const el=p.locator(c.scrollTo).first();await el.scrollIntoViewIfNeeded();await p.waitForTimeout(500);box=await el.boundingBox();}
  else{await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(200);box=await p.locator(C.content||'body').boundingBox();}
  const pad=c.scrollTo?0:18,w=Math.min(box.width-2*pad,1560),y=Math.max(0,box.y+(c.offset??6));
  clip={x:Math.max(0,box.x+pad),y,width:w,height:Math.min(w/RATIO,1400-y-4)};}
  const anchor=c.scrollTo&&!c.scrollTo.includes('>>')?c.scrollTo:null;
  clips[c.name]={clip,scrollY:await p.evaluate(()=>scrollY),anchor,anchorTop:anchor?await p.evaluate(sel=>document.querySelector(sel)?.getBoundingClientRect().top,anchor):null};
  targets[c.name]={};
  for(const [k,s] of Object.entries(c.targets||{})){const t=await p.locator(s).first().boundingBox();
   if(!t)throw new Error(`target ${k} (${s}) not found in ${c.name}`);
   targets[c.name][k]={x:(t.x-clip.x)/clip.width,y:(t.y-clip.y)/clip.height,w:t.width/clip.width,h:t.height/clip.height};}
  const f=path.join(OUT,c.name+'.png');await p.screenshot({path:f,clip});
  execFileSync('python3',['-c',`from PIL import Image;im=Image.open("${f}").convert("RGB");im.resize((${W},round(im.height*${W}/im.width)),Image.LANCZOS).save("${f.replace(/\.png$/,'.jpg')}",quality=90)`]);fs.unlinkSync(f);
  console.log('capture',c.name,Object.keys(targets[c.name]).join(' '));
 }
 fs.writeFileSync(path.join(OUT,'targets.json'),JSON.stringify(targets,null,1));
 if(errs.length)console.log('page errors:',errs);
 await b.close();})();
