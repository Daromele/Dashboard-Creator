// Export every slide of a mockup deck as a 1500×1125 PNG: png/NN-label.png, and a zip next to the deck.
//   node build/deck_pngs.js listing/<dir>/<Deck>.html
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const path=require('path'),fs=require('fs'),{execFileSync}=require('child_process');
(async()=>{const deck=path.resolve(process.argv[2]),dir=path.dirname(deck),out=path.join(dir,'png');
 fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}),p=await b.newPage({viewport:{width:1700,height:1300},deviceScaleFactor:1});
 await p.goto('file://'+deck);await p.waitForTimeout(800);
 const slides=await p.evaluate(()=>[...document.querySelectorAll('.slide[id^="s"]')].map(s=>({id:s.id,label:(s.previousElementSibling?.classList.contains('slide-label')?s.previousElementSibling.innerText:'')||s.id})));
 for(const [i,s] of slides.entries()){const slug=s.label.toLowerCase().replace(/^\s*(slide\s*)?\d+\s*[·.\-–:]?\s*/i,'').replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||s.id;
  const el=await p.$('#'+s.id);await el.scrollIntoViewIfNeeded();await el.screenshot({path:path.join(out,`${String(i+1).padStart(2,'0')}-${slug}.png`)});}
 await b.close();
 const zip=deck.replace(/_Etsy_Mockups\.html$/,'_Etsy_PNGs.zip');try{fs.rmSync(zip,{force:true});execFileSync('zip',['-jq',zip,...fs.readdirSync(out).map(f=>path.join(out,f))]);}catch(e){console.warn('zip skipped:',e.message);}
 console.log(`${slides.length} PNGs → ${path.relative(process.cwd(),out)}`);})();
