// Render a vertical (9:16) social video for TikTok, Reels, Shorts and Pinterest, with sound.
// usage: node render_social.js social.json [--frames 0,90,200]    (--frames writes stills only)
// Uses the captures from video_capture.js (same shots_dir/targets.json). social.json:
// {"output":"X_Social.mp4","shots_dir":"vshots","fps":30,"brand":{...},"bpm":104,"music":0.55,
//  "scenes":[
//   {"type":"hook","dur":1.8,"text":"When will I be<br>*debt free?*","image":"dash"},
//   {"type":"crop","dur":4,"captions":[{"t":0,"text":"Add *$250* a month"}],
//    "shots":[{"img":"plan0","at":0},{"img":"plan1","at":1.1}],           // state swaps (a ding plays on each)
//    "camera":[{"t":0,"target":"plan0.budget","pad":0.03},{"t":2.5,"target":"plan0.kpis"}], // pans between crops
//    "cursor":[{"t":1.0,"target":"plan0.plus","click":true}],
//    "stickers":[{"t":1.3,"text":"5 months sooner!","x":540,"y":1380,"rot":-4}],
//    "files":{"t0":0.4,"names":["checking.csv"],"target":"imp.drop"}},
//   {"type":"end","dur":3,"headline":"Product","sub":"…","cta":"Instant download on Etsy","themes":["shots/theme-a.jpg",…]}]}
// Text: *word* is highlighted. Keep key text out of the bottom 380 px and right 120 px (app UI sits there).
// Sound: synthesized by make_audio.py from the scene events (whoosh, pop, click, ding, sparkle, thud, riser, cash).
const {chromium}=require(require.resolve('playwright',{paths:[process.env.NODE_PATH||'/opt/node22/lib/node_modules','.']}));
const path=require('path'),fs=require('fs'),{spawn,execFileSync}=require('child_process');
const cfgPath=path.resolve(process.argv[2]),C=JSON.parse(fs.readFileSync(cfgPath,'utf8')),B=path.dirname(cfgPath);
const R=p=>path.isAbsolute(p)?p:path.join(B,p);
const fi=process.argv.indexOf('--frames'),STILLS=fi>0?process.argv[fi+1].split(',').map(Number):null;
const SH=R(C.shots_dir||'vshots'),T=JSON.parse(fs.readFileSync(path.join(SH,'targets.json'),'utf8'));
const W=1080,H=1920,FPS=C.fps||30;
const FONTS='file://'+(C.fonts_css?R(C.fonts_css):path.join(__dirname,'..','assets','fonts.css'));
const url=n=>'file://'+(n.includes('/')||n.includes('.')?R(n):path.join(SH,n+'.jpg'));
const one=k=>{const [c,n]=k.split('.');const v=T[c]?.[n];if(!v)throw new Error('unknown target '+k);return v;};
// target: "cap.key", ["cap.a","cap.b"] (union), and optional sub:[x0,y0,x1,y1] as fractions of that box
const tgt=(k,sub)=>{const bs=[].concat(k).map(one);let x=Math.min(...bs.map(b=>b.x)),y=Math.min(...bs.map(b=>b.y)),
 w=Math.max(...bs.map(b=>b.x+b.w))-x,h=Math.max(...bs.map(b=>b.y+b.h))-y;
 if(sub){x+=sub[0]*w;y+=sub[1]*h;w*=sub[2]-sub[0];h*=sub[3]-sub[1];}return {x,y,w,h};};
let t0=0;const scenes=C.scenes.map(s=>{const o={...s,start:t0};t0+=s.dur;return o;});const TOTAL=t0;
const ev=[];const E=(t,kind,gain)=>ev.push({t:+t.toFixed(3),kind,...(gain?{gain}:{})});
scenes.forEach((s,i)=>{const a=s.start;
 if(i>0)E(a,s.type==='end'?'whoosh':'whoosh',0.8);
 if(s.image)s.imageUrl=url(s.image);if(s.themes)s.themeUrls=s.themes.map(url);
 if(s.type==='hook'){const words=s.text.replace(/<br>/g,' ').split(/\s+/).filter(Boolean);words.forEach((w,k)=>E(a+0.15+k*0.11,'pop',0.7));}
 for(const c of s.captions||[])E(a+c.t+0.05,'pop');
 if(s.shots){s.shotUrls=s.shots.map(x=>url(x.img));s.shots.forEach((x,k)=>{if(k>0&&s.ding!==false)E(a+x.at+0.05,'ding');});}
 for(const c of s.camera||[])c.box=tgt(c.target,c.sub);
 for(const c of s.cursor||[]){c.box=tgt(c.target,c.sub);if(c.click)E(a+c.t,'click');}
 for(const k of s.stickers||[])E(a+k.t,k.sound||'sparkle');
 if(s.files){s.files.box=tgt(s.files.target,s.files.sub);s.files.names.forEach((_,k)=>E(a+s.files.t0+k*0.16+0.72,'thud'));E(a+s.files.t0,'whoosh',0.5);}
 if(s.type==='end'){E(Math.max(0,a-0.85),'riser',0.8);E(a+0.35,'cash');}
});
const b=C.brand||{};
const html=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>
:root{--ink:${b.ink||'#1d1d1f'};--bold:${b.bold||'#222'};--pop:${b.pop||'#f0b040'};--paper:${b.paper||'#fafafa'};--calm:${b.calm||'#555'}}
*{box-sizing:border-box;margin:0}html,body{width:${W}px;height:${H}px;overflow:hidden;background:var(--bold);font-family:Montserrat,sans-serif}
.sc{position:absolute;inset:0;overflow:hidden;display:none}
.dark{background:var(--bold);color:#fff}.light{background:var(--paper);color:var(--ink)}
.blob{position:absolute;width:900px;height:900px;border-radius:50%;filter:blur(90px);opacity:.35}
.dark .blob.a{background:var(--pop);opacity:.16}.dark .blob.b{background:#fff;opacity:.08}
.light .blob.a{background:var(--pop);opacity:.18}.light .blob.b{background:var(--calm);opacity:.12}
.cap{position:absolute;left:60px;right:60px;top:250px;height:330px;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:0 22px;text-align:center;font-weight:900;font-size:84px;line-height:1.08;letter-spacing:-.02em}
.cap .w{display:inline-block}.cap .hi{color:var(--bold);background:var(--pop);padding:0 14px;border-radius:14px;margin:4px 0}
.light .cap .hi{color:#fff;background:var(--calm)}
.cap .br{flex-basis:100%;height:0}
.panel{position:absolute;left:48px;top:640px;width:${W-96}px;height:860px;border-radius:28px;overflow:hidden;background:#fff;box-shadow:0 40px 90px rgba(0,0,0,.35),0 4px 10px rgba(0,0,0,.18)}
.light .panel{box-shadow:0 30px 70px rgba(20,30,40,.22),0 2px 6px rgba(20,30,40,.14)}
.panel img{position:absolute;left:0;top:0;transform-origin:0 0;max-width:none}
.cur{position:absolute;left:0;top:0;width:76px;height:76px;z-index:5;transform-origin:6px 4px;filter:drop-shadow(0 6px 10px rgba(0,0,0,.35))}
.rip{position:absolute;width:150px;height:150px;margin:-75px 0 0 -75px;border-radius:50%;background:var(--pop);opacity:0;z-index:4}
.ring{position:absolute;border:6px solid var(--pop);border-radius:22px;opacity:0;z-index:4}
.file{position:absolute;left:0;top:0;z-index:6;display:flex;align-items:center;gap:16px;background:#fff;color:#1d2733;border-radius:18px;padding:20px 28px;font-weight:800;font-size:34px;box-shadow:0 18px 40px rgba(0,0,0,.3);white-space:nowrap}
.file i{width:44px;height:54px;border-radius:6px;background:var(--calm);position:relative}.file i:after{content:"CSV";position:absolute;bottom:7px;left:0;right:0;text-align:center;color:#fff;font:800 13px Montserrat}
.stk{position:absolute;z-index:8;padding:22px 34px;border-radius:24px;font-weight:900;font-size:50px;white-space:nowrap;background:var(--pop);color:var(--bold);box-shadow:0 18px 40px rgba(0,0,0,.3);border:5px solid #fff}
.stk.white{background:#fff;color:var(--bold);border-color:var(--pop)}
.hook{position:absolute;left:60px;right:60px;top:360px;text-align:center;font-weight:900;font-size:118px;line-height:1.04;letter-spacing:-.03em;display:flex;flex-wrap:wrap;justify-content:center;gap:0 28px}
.hook .w{display:inline-block}.hook .hi{color:var(--pop)}.hook .br{flex-basis:100%;height:0}
.card{position:absolute;left:90px;width:900px;border-radius:26px;overflow:hidden;box-shadow:0 50px 110px rgba(0,0,0,.5)}.card img{width:100%;display:block}
.end h1{position:absolute;left:40px;right:40px;top:300px;text-align:center;font-family:"Playfair Display",serif;font-weight:800;font-size:132px;line-height:1}
.end .sub{position:absolute;left:60px;right:60px;top:480px;text-align:center;font-weight:600;font-size:40px;color:rgba(255,255,255,.85)}
.end .cta{position:absolute;left:50%;top:1340px;transform:translateX(-50%);background:var(--pop);color:var(--bold);font-weight:900;font-size:50px;padding:30px 54px;border-radius:999px;white-space:nowrap;box-shadow:0 20px 50px rgba(0,0,0,.35)}
.end .by{position:absolute;left:0;right:0;top:1480px;text-align:center;font-weight:700;font-size:30px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.7)}
.th{position:absolute;width:420px;border-radius:14px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.45)}.th img{width:100%;display:block}
</style></head><body><div id="v"></div><script>
const W=${W},H=${H},S=${JSON.stringify(scenes)},PW=${W-96},PH=860,PX=48,PY=640;
const cl=x=>Math.max(0,Math.min(1,x)),ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2,out=x=>1-Math.pow(1-x,3);
const back=x=>{const c=1.9;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2);};          // overshoot
const words=(t)=>t.split(/(<br>)/).flatMap(p=>p==='<br>'?['<br>']:p.trim().split(/\\s+/).filter(Boolean));
const wordHtml=t=>{const out=[];let grp=null;for(const w of words(t)){if(w==='<br>'){if(grp){out.push(grp);grp=null;}out.push('<span class="br"></span>');continue;}
 const st=w.startsWith('*'),en=w.endsWith('*'),s=w.replace(/^\\*|\\*$/g,'');
 if(st||grp!==null){grp=(grp===null?'<span class="w hi">':grp+' ')+s;if(en){out.push(grp+'</span>');grp=null;}}else out.push('<span class="w">'+s+'</span>');}
 if(grp)out.push(grp+'</span>');return out.join('');};
const CUR='<svg class="cur" viewBox="0 0 44 44"><path d="M5 3 L5 34 L13 26 L19 40 L25 37 L19 24 L30 24 Z" fill="#111" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/></svg>';
const v=document.getElementById('v');
S.forEach((s,i)=>{const d=document.createElement('div');d.className='sc '+(s.type==='crop'&&s.light?'light':'dark')+(s.type==='end'?' end':'');s.el=d;v.appendChild(d);
 d.innerHTML='<div class="blob a"></div><div class="blob b"></div>';s.blobs=[...d.querySelectorAll('.blob')];
 if(s.type==='hook'){if(s.imageUrl){d.insertAdjacentHTML('beforeend','<div class="card"><img src="'+s.imageUrl+'"></div>');s.card=d.lastElementChild;}
  d.insertAdjacentHTML('beforeend','<div class="hook">'+wordHtml(s.text)+'</div>');s.ws=[...d.querySelectorAll('.hook .w')];}
 else if(s.type==='end'){d.insertAdjacentHTML('beforeend',(s.themeUrls||[]).map(u=>'<div class="th"><img src="'+u+'"></div>').join('')+'<h1>'+s.headline+'</h1><div class="sub">'+(s.sub||'')+'</div><div class="cta">'+(s.cta||'')+'</div><div class="by">'+(s.by||'')+'</div>');
  s.ths=[...d.querySelectorAll('.th')];s.h1=d.querySelector('h1');s.sb=d.querySelector('.sub');s.cta=d.querySelector('.cta');s.by=d.querySelector('.by');}
 else{s.caps=(s.captions||[]).map(c=>{d.insertAdjacentHTML('beforeend','<div class="cap">'+wordHtml(c.text)+'</div>');const e=d.lastElementChild;return {...c,el:e,ws:[...e.querySelectorAll('.w')]};});
  d.insertAdjacentHTML('beforeend','<div class="panel">'+s.shotUrls.map(u=>'<img src="'+u+'">').join('')+(s.files?'<div class="ring"></div>'+s.files.names.map(n=>'<div class="file"><i></i>'+n+'</div>').join(''):'')+(s.cursor?'<div class="rip"></div>'+CUR:'')+'</div>');
  s.panel=d.querySelector('.panel');s.imgs=[...s.panel.querySelectorAll('img')];s.cur=s.panel.querySelector('.cur');s.rip=s.panel.querySelector('.rip');s.ring=s.panel.querySelector('.ring');s.fl=[...s.panel.querySelectorAll('.file')];
  s.stk=(s.stickers||[]).map(k=>{d.insertAdjacentHTML('beforeend','<div class="stk '+(k.style||'')+'">'+k.text+'</div>');return {...k,el:d.lastElementChild};});}
});
// a crop rect (image px) that covers the target with padding, in the panel's aspect
function crop(box,pad,IW,IH){const p=pad??0.025;let x=(box.x-p)*IW,y=(box.y-p)*IH,w=(box.w+2*p)*IW,h=(box.h+2*p)*IH;const a=PW/PH,cx=x+w/2,cy=y+h/2;
 if(w/h>a)h=w/a;else w=h*a;if(w>IW){w=IW;h=w/a;}if(h>IH){h=IH;w=h*a;}
 x=Math.max(0,Math.min(IW-w,cx-w/2));y=Math.max(0,Math.min(IH-h,cy-h/2));return {x,y,w,h};}
function seek(t){
 S.forEach((s,i)=>{const lt=t-s.start,next=S[i+1];
  const vis=lt>=-0.001&&(!next||t<next.start+0.34);s.el.style.display=vis?'block':'none';if(!vis)return;
  const pin=i===0?1:ease(cl(lt/0.34)),pout=next?ease(cl((t-next.start)/0.34)):0;     // whip: slide in from the right
  s.el.style.zIndex=i;s.el.style.transform='translateX('+((1-pin)*W-pout*W*0.35)+'px)';
  s.el.style.filter=(pin<1||pout>0)?'blur('+(((1-pin)+pout)*7).toFixed(1)+'px)':'';
  const g=s.start+lt;s.blobs[0].style.transform='translate('+(-200+Math.sin(g*.6)*160)+'px,'+(200+Math.cos(g*.5)*140)+'px)';
  s.blobs[1].style.transform='translate('+(450+Math.cos(g*.45)*170)+'px,'+(1100+Math.sin(g*.55)*160)+'px)';
  if(s.type==='hook'){s.ws.forEach((w,k)=>{const p=cl((lt-0.15-k*0.11)/0.28);w.style.opacity=p>0?1:0;w.style.transform='scale('+(p>0?back(p):0.5)+')';});
   if(s.card){const p=out(cl((lt-0.5)/0.8));s.card.style.top=(H+60-(H-1100)*p+lt*-25)+'px';s.card.style.transform='rotate('+(-6+4*p)+'deg)';s.card.style.opacity=p;}}
  else if(s.type==='end'){const pos=[[-40,820,-9],[620,800,8],[-60,1600,6],[660,1620,-7]];
   s.ths.forEach((e,k)=>{const p=out(cl((lt-0.2-k*0.08)/0.6)),q=pos[k%4];e.style.left=q[0]+'px';e.style.top=(q[1]+(1-p)*300)+'px';e.style.opacity=p;e.style.transform='rotate('+q[2]+'deg)';e.style.display=k<4?'block':'none';});
   if(!s.fit){let f=132;while(f>72){s.h1.style.fontSize=f+'px';if(s.h1.offsetHeight<=f*2.1)break;f-=6;}s.fit=1;}   // a long name shrinks to two lines
   s.sb.style.top=(300+s.h1.offsetHeight+34)+'px';                      // a two-line name pushes the line below it down
   [[s.h1,0.1],[s.sb,0.3],[s.by,0.55]].forEach(([e,dl])=>{const p=cl((lt-dl)/0.4);e.style.opacity=p;e.style.translate='0 '+(1-out(p))*40+'px';});
   const p=cl((lt-0.45)/0.35);s.cta.style.opacity=p>0?1:0;s.cta.style.transform='translateX(-50%) scale('+((p>0?back(p):0.5)*(1+0.04*Math.sin(Math.max(0,lt-0.9)*7)))+')';}
  else{
   s.caps.forEach((c,k)=>{const nx=s.caps[k+1],on=lt>=c.t&&(!nx||lt<nx.t);c.el.style.display=on?'flex':'none';
    if(on)c.ws.forEach((w,j)=>{const p=cl((lt-c.t-j*0.06)/0.26);w.style.opacity=p>0?1:0;w.style.transform='scale('+(p>0?back(p):0.5)+') translateY('+(1-cl(p*1.5))*20+'px)';});});
   const pp=out(cl((lt-0.05)/0.45));s.panel.style.transform='translateY('+(1-pp)*120+'px) scale('+(0.94+0.06*pp)+')';
   const im=s.imgs[0],IW=im.naturalWidth,IH=im.naturalHeight;
   // camera: hold each crop, move to the next over 0.6 s before its time, slow push throughout
   const K=s.camera||[{t:0,box:{x:0,y:0,w:1,h:1},pad:0}];let r=crop(K[0].box,K[0].pad,IW,IH);
   for(let k=1;k<K.length;k++){const mv=K[k].move||0.6,p=ease(cl((lt-(K[k].t-mv))/mv));if(p>0){const a=crop(K[k-1].box,K[k-1].pad,IW,IH),b=crop(K[k].box,K[k].pad,IW,IH);r={x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p,w:a.w+(b.w-a.w)*p,h:a.h+(b.h-a.h)*p};}}
   const push=1+0.05*cl(lt/s.dur);const cw=r.w/push,ch=r.h/push;r={x:r.x+(r.w-cw)/2,y:r.y+(r.h-ch)/2,w:cw,h:ch};
   const sc=PW/r.w,F=(fx,fy)=>[(fx*IW-r.x)*sc,(fy*IH-r.y)*sc];
   s.imgs.forEach((e,k)=>{e.style.transform='translate('+(-r.x*sc)+'px,'+(-r.y*sc)+'px) scale('+sc+')';e.style.opacity=k===0?1:cl((lt-s.shots[k].at)/0.18);});
   if(s.cur){const Kc=s.cursor,P=c=>F(c.box.x+c.box.w/2,c.box.y+c.box.h/2);let [x,y]=P(Kc[0]);const enter=Kc[0].t-0.6;
    if(lt<Kc[0].t){const p=ease(cl((lt-enter)/0.6));x+=(1-p)*260;y+=(1-p)*220;}
    for(let k=1;k<Kc.length;k++){const a=P(Kc[k-1]),bb=P(Kc[k]),st=Math.max(Kc[k-1].t+0.15,Kc[k].t-0.5),p=ease(cl((lt-st)/(Kc[k].t-st)));if(lt>=st){x=a[0]+(bb[0]-a[0])*p;y=a[1]+(bb[1]-a[1])*p;}}
    s.cur.style.opacity=cl((lt-enter)/0.2);let press=1,rp=-1;for(const c of Kc)if(c.click){const d=lt-c.t;if(d>=0&&d<0.14)press=0.8;if(d>=0&&d<0.45)rp=d/0.45;}
    s.cur.style.transform='translate('+(x-6)+'px,'+(y-4)+'px) scale('+press+')';
    s.rip.style.left=x+'px';s.rip.style.top=y+'px';s.rip.style.opacity=rp<0?0:.5*(1-rp);s.rip.style.transform='scale('+(rp<0?0:.25+rp)+')';}
   if(s.fl.length){const f=s.files,bx=f.box,[cx,cy]=F(bx.x+bx.w/2,bx.y+bx.h/2),n=s.fl.length;
    s.fl.forEach((e,k)=>{const st=f.t0+k*0.16,p=ease(cl((lt-st)/0.72)),sx=PW*(0.2+0.6*(n<2?.5:k/(n-1))),sy=-PY-120;
     const w=e.offsetWidth,h=e.offsetHeight,x=sx+(cx-sx)*p-w/2,y=sy+(cy+(k-(n-1)/2)*22-sy)*p-h/2,fade=cl((lt-st-0.72)/0.22);
     e.style.opacity=lt<st?0:1-fade;e.style.transform='translate('+x+'px,'+y+'px) scale('+(1-0.35*fade)+') rotate('+((1-p)*(k%2?8:-8))+'deg)';});
    const [x0,y0]=F(bx.x,bx.y),[x1,y1]=F(bx.x+bx.w,bx.y+bx.h),rs=f.t0+(n-1)*0.16+0.6,rp=cl((lt-rs)/0.2)*(1-cl((lt-rs-0.7)/0.3));
    Object.assign(s.ring.style,{left:x0-8+'px',top:y0-8+'px',width:x1-x0+16+'px',height:y1-y0+16+'px',opacity:rp});}
   s.stk.forEach(k=>{const p=cl((lt-k.t)/0.3),end=k.until!=null?cl((lt-k.until)/0.2):0;k.el.style.display=p>0&&end<1?'block':'none';
    k.el.style.left=k.x+'px';k.el.style.top=k.y+'px';k.el.style.opacity=1-end;
    k.el.style.transform='translate(-50%,-50%) rotate('+((k.rot||0)+Math.sin((lt-k.t)*5)*1.2)+'deg) scale('+(back(p)*(1-0.3*end))+')';});
  }
 });}
// load every face up front: a scene that is hidden at load time would otherwise be measured in a fallback font
window.ready=Promise.all([document.fonts.load('800 100px "Playfair Display"'),document.fonts.load('900 80px Montserrat'),document.fonts.load('600 40px Montserrat'),document.fonts.ready,...[...document.images].map(i=>i.decode().catch(()=>{}))]);
</script></body></html>`;
const tmp=path.join(B,'.social-compose.html');fs.writeFileSync(tmp,html);
(async()=>{const br=await chromium.launch();const p=await br.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+tmp);await p.evaluate(()=>window.ready);await p.waitForTimeout(300);
 if(STILLS){for(const f of STILLS){await p.evaluate(t=>seek(t),f/FPS);const o=path.join(B,`sframe-${f}.jpg`);await p.screenshot({path:o,type:'jpeg',quality:88});}
  await br.close();fs.unlinkSync(tmp);if(errs.length)console.log('page errors',errs);console.log('stills written');return;}
 let ff;try{ff=execFileSync('python3',['-c','import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();}catch{ff='ffmpeg';}
 const evf=path.join(B,'.social-audio.json'),wav=path.join(B,'.social-audio.wav');
 fs.writeFileSync(evf,JSON.stringify({dur:TOTAL,bpm:C.bpm||104,music:C.music??0.55,events:ev}));
 execFileSync('python3',[path.join(__dirname,'make_audio.py'),evf,wav],{stdio:'inherit'});
 const out=R(C.output);
 const enc=spawn(ff,['-y','-loglevel','error','-f','image2pipe','-c:v','mjpeg','-framerate',String(FPS),'-i','-','-i',wav,
  '-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
 const N=Math.round(TOTAL*FPS);
 for(let f=0;f<N;f++){await p.evaluate(t=>seek(t),f/FPS);const buf=await p.screenshot({type:'jpeg',quality:93});
  if(!enc.stdin.write(buf))await new Promise(r=>enc.stdin.once('drain',r));}
 enc.stdin.end();await new Promise(r=>enc.on('close',r));await br.close();
 for(const f of [tmp,evf,wav])fs.unlinkSync(f);
 if(errs.length)console.log('page errors',errs);
 console.log(`wrote ${out} · ${N} frames · ${TOTAL.toFixed(2)} s · ${(fs.statSync(out).size/1e6).toFixed(1)} MB · ${ev.length} sound effects`);})();
