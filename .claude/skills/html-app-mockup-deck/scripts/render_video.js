// Render an animated listing video (MP4, H.264, no audio) from app captures.
// usage: node render_video.js video.json [--frames 0,90,200]   (--frames writes stills only, for checking)
// Run video_capture.js first. video.json (render part):
// {"product","output":"X_Etsy_Video.mp4","shots_dir":"vshots","size":[1440,1080],"fps":30,
//  "brand":{"ink","bold","pop","paper","calm"},
//  "scenes":[
//   {"type":"title","dur":2.2,"eyebrow","headline","pills":[..],"image":"dash"},
//   {"type":"shot","dur":2.6,"dark":false,"eyebrow","headline",
//    "shots":[{"img":"plan0","at":0},{"img":"plan1","at":1.0}],          // crossfades, seconds into the scene
//    "cursor":[{"t":0.9,"target":"plan0.plus","click":true}],           // target = capture.key from targets.json
//    "zoom":{"t0":0.4,"t1":2.4,"target":"dash.hero","scale":1.3},   // grows from the target's top-left
//                                   // ("anchor":"center" or "origin":[fx,fy] to change; keep the scale low on full-width targets)
//    "files":{"t0":0.4,"names":["checking.csv"],"target":"imp.drop"}}, // files fly into the target
//   {"type":"end","dur":2.4,"headline":"Product","sub":"line","pills":[..],"themes":["vshots/../shots/theme-a.jpg",..]}]}
// Keep the total ≤ 15 s (Etsy's limit). Etsy plays listing videos without sound.
const {chromium}=require(require.resolve('playwright',{paths:[process.env.NODE_PATH||'/opt/node22/lib/node_modules','.']}));
const path=require('path'),fs=require('fs'),{spawn,execFileSync}=require('child_process');
const cfgPath=path.resolve(process.argv[2]),C=JSON.parse(fs.readFileSync(cfgPath,'utf8')),B=path.dirname(cfgPath);
const R=p=>path.isAbsolute(p)?p:path.join(B,p);
const fi=process.argv.indexOf('--frames'),STILLS=fi>0?process.argv[fi+1].split(',').map(Number):null;
const SH=R(C.shots_dir||'vshots'),T=JSON.parse(fs.readFileSync(path.join(SH,'targets.json'),'utf8'));
const [W,H]=C.size||[1440,1080],FPS=C.fps||30;
const FONTS='file://'+(C.fonts_css?R(C.fonts_css):path.join(__dirname,'..','assets','fonts.css'));
const url=n=>'file://'+(n.includes('/')||n.includes('.')?R(n):path.join(SH,n+'.jpg'));
let t0=0;const scenes=C.scenes.map(s=>{const o={...s,start:t0};t0+=s.dur;return o;});const TOTAL=t0;
if(TOTAL>15.001)console.warn(`warning: ${TOTAL.toFixed(2)} s is over Etsy's 15 s limit`);
const tgt=k=>{const [c,n]=k.split('.');const v=T[c]?.[n];if(!v)throw new Error('unknown target '+k);return v;};
for(const s of scenes){for(const c of s.cursor||[])c.box=tgt(c.target);if(s.zoom)s.zoom.box=tgt(s.zoom.target);if(s.files)s.files.box=tgt(s.files.target);}
// urls resolved in Node so the page needs no path logic
for(const s of scenes){if(s.image)s.imageUrl=url(s.image);if(s.shots)s.shotUrls=s.shots.map(x=>url(x.img));if(s.themes)s.themeUrls=s.themes.map(url);}
const b=C.brand||{};
const html=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>
:root{--ink:${b.ink||'#1d1d1f'};--bold:${b.bold||'#222'};--pop:${b.pop||'#f0b040'};--paper:${b.paper||'#fafafa'};--calm:${b.calm||'#555'}}
*{box-sizing:border-box;margin:0}html,body{width:${W}px;height:${H}px;overflow:hidden;background:var(--bold);font-family:Montserrat,sans-serif}
.sc{position:absolute;inset:0;overflow:hidden;opacity:0}
.dark{background:radial-gradient(1200px 700px at 50% -10%,rgba(255,255,255,.09),transparent 60%),var(--bold);color:#fff}
.light{background:var(--paper);color:var(--ink)}
.eb{position:absolute;left:0;right:0;text-align:center;font-weight:600;letter-spacing:.24em;text-transform:uppercase;font-size:21px}
.dark .eb{color:var(--pop)}.light .eb{color:var(--calm)}
.hl{position:absolute;left:40px;right:40px;text-align:center;font-family:"Playfair Display",serif;font-weight:700;letter-spacing:-.01em;line-height:1.04}
.pills{position:absolute;left:0;right:0;display:flex;gap:14px;justify-content:center}
.pill{border:1.5px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:11px 24px;font-weight:600;font-size:22px}
.box{position:absolute;left:50px;width:${W-100}px;height:${(W-100)/1.6}px;border-radius:6px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.28),0 2px 6px rgba(0,0,0,.12)}
.light .box{box-shadow:0 22px 50px rgba(20,30,40,.16),0 1px 3px rgba(20,30,40,.12)}
.zm{position:absolute;inset:0;will-change:transform}.zm img{position:absolute;inset:0;width:100%;height:100%;display:block}
.cur{position:absolute;left:0;top:0;width:44px;height:44px;opacity:0;z-index:5;transform-origin:4px 3px}
.rip{position:absolute;width:90px;height:90px;margin:-45px 0 0 -45px;border-radius:50%;background:var(--pop);opacity:0;z-index:4}
.ring{position:absolute;border:4px solid var(--pop);border-radius:14px;opacity:0;z-index:4;box-shadow:0 0 0 8px rgba(240,170,60,.18)}
.file{position:absolute;left:0;top:0;z-index:6;display:flex;align-items:center;gap:12px;background:#fff;color:#1d2733;border-radius:12px;padding:14px 20px;font-weight:600;font-size:22px;box-shadow:0 14px 30px rgba(0,0,0,.25);white-space:nowrap}
.file i{width:30px;height:36px;border-radius:4px;background:var(--calm);position:relative}.file i:after{content:"CSV";position:absolute;bottom:5px;left:0;right:0;text-align:center;color:#fff;font:700 9px Montserrat}
.th{position:absolute;border-radius:6px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,.35)}.th img{width:100%;display:block}
</style></head><body><div id="v"></div><script>
const W=${W},H=${H},S=${JSON.stringify(scenes)},TOTAL=${TOTAL};
const cl=x=>Math.max(0,Math.min(1,x)),ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2,out=x=>1-Math.pow(1-x,3);
const BX=W-100,BY=H-(W-100)/1.6-28,BH=(W-100)/1.6;
const CUR='<svg class="cur" viewBox="0 0 44 44"><path d="M5 3 L5 34 L13 26 L19 40 L25 37 L19 24 L30 24 Z" fill="#111" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/></svg>';
const v=document.getElementById('v');
S.forEach((s,i)=>{const d=document.createElement('div');d.className='sc '+(s.type==='shot'&&!s.dark?'light':'dark');s.el=d;v.appendChild(d);
 const anim=[];const add=(h,delay)=>{d.insertAdjacentHTML('beforeend',h);const e=d.lastElementChild;anim.push([e,delay]);return e;};
 if(s.type==='title'){
  if(s.image){const p=add('<div class="box" style="top:0"><img src="'+s.imageUrl+'" style="width:100%;display:block"></div>',0);s.peek=p;anim.pop();}
  add('<div class="eb" style="top:150px">'+(s.eyebrow||'')+'</div>',.1);
  add('<div class="hl" style="top:198px;font-size:100px">'+s.headline+'</div>',.25);
  if(s.pills)add('<div class="pills" style="top:440px">'+s.pills.map(p=>'<span class="pill">'+p+'</span>').join('')+'</div>',.5);
 }else if(s.type==='end'){
  add('<div class="eb" style="top:110px">'+(s.eyebrow||'')+'</div>',.05);
  add('<div class="hl" style="top:150px;font-size:104px">'+s.headline+'</div>',.15);
  if(s.sub)add('<div class="eb" style="top:290px;letter-spacing:.04em;text-transform:none;color:rgba(255,255,255,.82);font-weight:500;font-size:28px">'+s.sub+'</div>',.3);
  if(s.pills)add('<div class="pills" style="top:350px">'+s.pills.map(p=>'<span class="pill">'+p+'</span>').join('')+'</div>',.4);
  const n=(s.themes||[]).length,cols=4,tw=300,gap=26,x0=(W-(cols*tw+(cols-1)*gap))/2;
  (s.themeUrls||[]).forEach((u,k)=>add('<div class="th" style="left:'+(x0+(k%cols)*(tw+gap))+'px;top:'+(470+Math.floor(k/cols)*240)+'px;width:'+tw+'px"><img src="'+u+'"></div>',.5+k*.07));
 }else{
  add('<div class="eb" style="top:60px">'+(s.eyebrow||'')+'</div>',.05);
  add('<div class="hl" style="top:98px;font-size:66px">'+s.headline+'</div>',.15);
  const bx=add('<div class="box" style="top:'+BY+'px"><div class="zm">'+s.shotUrls.map(u=>'<img src="'+u+'">').join('')+'</div></div>',.2);
  s.zm=bx.firstChild;s.imgs=[...s.zm.querySelectorAll('img')];
  if(s.cursor){s.zm.insertAdjacentHTML('beforeend','<div class="rip"></div>'+CUR);s.rip=s.zm.querySelector('.rip');s.cur=s.zm.querySelector('.cur');}
  if(s.files){s.zm.insertAdjacentHTML('beforeend','<div class="ring"></div>'+s.files.names.map(n=>'<div class="file"><i></i>'+n+'</div>').join(''));
   s.ring=s.zm.querySelector('.ring');s.fl=[...s.zm.querySelectorAll('.file')];}
 }
 s.anim=anim;});
function seek(t){
 S.forEach((s,i)=>{const lt=t-s.start,next=S[i+1];
  const vis=lt>=-0.001&&(!next||t<next.start+0.55);s.el.style.display=vis?'block':'none';if(!vis)return;
  // push transition: the next scene slides up over this one
  const pin=i===0?1:ease(cl(lt/0.55)),pout=next?ease(cl((t-next.start)/0.55)):0;
  s.el.style.opacity=1;s.el.style.zIndex=i;s.el.style.transform='translateY('+((1-pin)*H-pout*H*0.22)+'px)';
  s.el.style.filter=pout>0?'brightness('+(1-0.35*pout)+')':'';
  for(const [e,dl] of s.anim){const p=out(cl((lt-dl)/0.55));e.style.opacity=p;e.style.translate='0 '+(1-p)*28+'px';}
  if(s.peek){const p=ease(cl(lt/s.dur));s.peek.style.top=(H+40-(H-560)*out(cl(lt/1.1))-30*p)+'px';}
  if(s.zm){
   s.shots.forEach((sh,k)=>{s.imgs[k].style.opacity=k===0?1:cl((lt-sh.at)/0.3);});
   let sc=1;if(s.zoom){const z=s.zoom,p=ease(cl((lt-z.t0)/(z.t1-z.t0)));sc=1+(z.scale-1)*p;
    const o=z.origin||(z.anchor==='center'?[z.box.x+z.box.w/2,z.box.y+z.box.h/2]:[z.box.x,z.box.y]);s.zm.style.transformOrigin=(o[0]*BX)+'px '+(o[1]*BH)+'px';s.zm.style.transform='scale('+sc+')';}
   if(s.cur){const K=s.cursor,P=c=>[(c.box.x+c.box.w/2)*BX,(c.box.y+c.box.h/2)*BH];let [x,y]=P(K[0]);
    const enter=K[0].t-0.7;if(lt<K[0].t){const p=ease(cl((lt-enter)/0.7));x+=(1-p)*170;y+=(1-p)*120;}
    for(let k=1;k<K.length;k++){const a=P(K[k-1]),b=P(K[k]),st=Math.max(K[k-1].t+0.2,K[k].t-0.6),p=ease(cl((lt-st)/(K[k].t-st)));if(lt>=st){x=a[0]+(b[0]-a[0])*p;y=a[1]+(b[1]-a[1])*p;}}
    s.cur.style.opacity=cl((lt-enter)/0.25);let press=1,rp=-1;
    for(const c of K)if(c.click){const d=lt-c.t;if(d>=0&&d<0.16)press=0.82;if(d>=0&&d<0.5)rp=d/0.5;}
    s.cur.style.transform='translate('+(x-4)+'px,'+(y-3)+'px) scale('+(press/sc)+')';
    s.rip.style.left=x+'px';s.rip.style.top=y+'px';s.rip.style.opacity=rp<0?0:.45*(1-rp);s.rip.style.transform='scale('+(rp<0?0:(.3+rp)/sc)+')';}
   if(s.fl){const f=s.files,bx=f.box,cx=(bx.x+bx.w/2)*BX,cy=(bx.y+bx.h/2)*BH,n=s.fl.length;let landed=0;
    s.fl.forEach((e,k)=>{const st=f.t0+k*0.16,p=ease(cl((lt-st)/0.75));const sx=BX*(0.18+0.64*(n<2?.5:k/(n-1))),sy=-BY-80;
     const w=e.offsetWidth,h=e.offsetHeight,x=sx+(cx-sx)*p-w/2,y=sy+(cy+(k-(n-1)/2)*16-sy)*p-h/2;
     const fade=cl((lt-st-0.75)/0.25);if(fade>=1)landed++;e.style.opacity=lt<st?0:1-fade;e.style.transform='translate('+x+'px,'+y+'px) scale('+(1-0.35*fade)+') rotate('+((1-p)*(k%2?6:-6))+'deg)';});
    const rs=f.t0+(n-1)*0.16+0.6,rp=cl((lt-rs)/0.25)*(1-cl((lt-rs-0.7)/0.3));
    Object.assign(s.ring.style,{left:bx.x*BX-6+'px',top:bx.y*BH-6+'px',width:bx.w*BX+12+'px',height:bx.h*BH+12+'px',opacity:rp});}
  }
 });}
window.ready=Promise.all([document.fonts.ready,...[...document.images].map(i=>i.decode().catch(()=>{}))]);
</script></body></html>`;
const tmp=path.join(B,'.video-compose.html');fs.writeFileSync(tmp,html);
(async()=>{const br=await chromium.launch();const p=await br.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+tmp);await p.evaluate(()=>window.ready);await p.waitForTimeout(300);
 if(STILLS){for(const f of STILLS){await p.evaluate(t=>seek(t),f/FPS);const o=path.join(B,`frame-${f}.jpg`);await p.screenshot({path:o,type:'jpeg',quality:90});console.log(o);}
  await br.close();fs.unlinkSync(tmp);if(errs.length)console.log('page errors',errs);return;}
 let ff;try{ff=execFileSync('python3',['-c','import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();}catch{ff='ffmpeg';}
 const out=R(C.output);const enc=spawn(ff,['-y','-loglevel','error','-f','image2pipe','-c:v','mjpeg','-framerate',String(FPS),'-i','-',
  '-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart','-an',out],{stdio:['pipe','inherit','inherit']});
 const N=Math.round(TOTAL*FPS);
 for(let f=0;f<N;f++){await p.evaluate(t=>seek(t),f/FPS);const buf=await p.screenshot({type:'jpeg',quality:94});
  if(!enc.stdin.write(buf))await new Promise(r=>enc.stdin.once('drain',r));}
 enc.stdin.end();await new Promise(r=>enc.on('close',r));await br.close();fs.unlinkSync(tmp);
 if(errs.length)console.log('page errors',errs);
 console.log(`wrote ${out} · ${N} frames · ${TOTAL.toFixed(2)} s · ${(fs.statSync(out).size/1e6).toFixed(1)} MB`);})();
