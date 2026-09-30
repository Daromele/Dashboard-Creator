// Saves every slide of the mockup deck as its own listing photo: 2000×1500 JPG (4:3), rendered at 2x then downscaled.
//   node listing-kit/export_slides.js
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules','.']}));
const path=require('path'),fs=require('fs'),{execFileSync}=require('child_process');
const DECK=path.join(__dirname,'../Bakeweek_Studio_Etsy_Mockups.html'),OUT=path.join(__dirname,'../Bakeweek_Studio_Listing_Photos');
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT);
(async()=>{const b=await chromium.launch(),p=await (await b.newContext({viewport:{width:1600,height:1200},deviceScaleFactor:2})).newPage();
 await p.goto('file://'+DECK);await p.waitForTimeout(1000);await p.mouse.move(0,0);
 const slides=p.locator('.slide'),n=await slides.count(),names=await p.evaluate(()=>[...document.querySelectorAll('.slide')].map(s=>(s.dataset.label||s.getAttribute('aria-label')||s.querySelector('h1,h2')?.innerHTML.replace(/<br\s*\/?>/g,' ').replace(/&amp;/g,'and')||'').trim()));
 for(let i=0;i<n;i++){const slug=(names[i]||'slide').toLowerCase().replace(/<[^>]+>/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
  const png=path.join(OUT,`${String(i+1).padStart(2,'0')}-${slug}.png`);await slides.nth(i).screenshot({path:png});
  execFileSync('python3',['-c',`from PIL import Image;im=Image.open("${png}").convert("RGB");im.resize((2000,1500),Image.LANCZOS).save("${png.replace(/\.png$/,'.jpg')}",quality=90,optimize=True)`]);fs.unlinkSync(png);}
 await b.close();console.log(fs.readdirSync(OUT).join('\n'));})();
