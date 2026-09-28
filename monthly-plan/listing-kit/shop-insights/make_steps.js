// The "three steps" animation: a self-contained HTML page (plays on a loop), an MP4 for the Etsy listing video,
// and a still for the mockup deck.
//   node capture_demo.js && node make_steps.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules','.']}));
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const HERE=__dirname,KIT=path.join(HERE,'..'),SH=path.join(HERE,'shots');
const b64=(f,mime)=>`data:${mime};base64,`+fs.readFileSync(f).toString('base64');
const fonts=fs.readFileSync(path.join(__dirname,'../../../.claude/skills/html-app-mockup-deck/assets/fonts.css'),'utf8');
const shots=[['Dashboard','tab-dashboard.jpg'],['Insights','tab-insights.jpg'],['Year at a glance','tab-annual.jpg'],['Shops','tab-shops.jpg'],['Products','tab-products.jpg']].map(([name,f])=>({name,src:b64(path.join(SH,f),'image/jpeg')}));
let html=fs.readFileSync(path.join(HERE,'steps.src.html'),'utf8');
for(const [a,b] of [['/*@@FONTS@@*/',fonts],['/*@@SHOTS@@*/[]',JSON.stringify(shots)],['/*@@LOGO@@*/',b64(path.join(HERE,'logos/fern.png'),'image/png')]]){if(!html.includes(a))throw Error('missing '+a);html=html.replace(a,b);}
const OUT_HTML=path.join(KIT,'Shop_Insights_How_It_Works.html');fs.writeFileSync(OUT_HTML,html);
const FFMPEG=execFileSync('python3',['-c','import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
(async()=>{const b=await chromium.launch(),p=await b.newPage({viewport:{width:1500,height:1125}});
 await p.goto('file://'+OUT_HTML+'?frame');await p.waitForTimeout(600);
 const fps=30,dur=await p.evaluate(()=>DUR),dir=fs.mkdtempSync('/tmp/steps-');
 for(let i=0;i<=dur*fps;i++){await p.evaluate(t=>seek(t),i/fps);await p.screenshot({path:path.join(dir,String(i).padStart(4,'0')+'.png')});}
 // the still for the deck: step 3 with the dashboard showing
 // the still for the deck: steps and window only (the slide carries its own headline), at the slot's 1.6 ratio, 2x
 await p.setViewportSize({width:1500,height:1125});const q=await (await b.newContext({viewport:{width:1500,height:1125},deviceScaleFactor:2})).newPage();await q.goto('file://'+OUT_HTML+'?frame');await q.waitForTimeout(600);
 await q.evaluate(()=>seek(10.9));await q.screenshot({path:path.join(SH,'steps.png'),clip:{x:70,y:206,width:1360,height:1360/1.6}});
 execFileSync('python3',['-c',`from PIL import Image;im=Image.open("${path.join(SH,'steps.png')}").convert("RGB");im.resize((1400,round(im.height*1400/im.width)),Image.LANCZOS).save("${path.join(SH,'steps.jpg')}",quality=90)`]);fs.unlinkSync(path.join(SH,'steps.png'));
 await b.close();
 // 1440×1080 (4:3, full HD height) H.264: plays on Etsy, phones and every editor
 const mp4=path.join(KIT,'Shop_Insights_How_It_Works.mp4');
 execFileSync(FFMPEG,['-y','-loglevel','error','-framerate',String(fps),'-i',path.join(dir,'%04d.png'),'-vf','scale=1440:1080:flags=lanczos,format=yuv420p','-c:v','libx264','-preset','slow','-crf','18','-movflags','+faststart',mp4]);
 fs.rmSync(dir,{recursive:true,force:true});
 console.log(`${path.relative(process.cwd(),OUT_HTML)} (${(html.length/1024).toFixed(0)} KB), ${path.relative(process.cwd(),mp4)} (${(fs.statSync(mp4).size/1e6).toFixed(1)} MB, ${dur}s), shots/steps.jpg`);})();
