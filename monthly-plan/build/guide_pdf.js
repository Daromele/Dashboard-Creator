// Print a guide HTML to a Letter PDF with backgrounds. usage: node build/guide_pdf.js in.html out.pdf
const {chromium}=require(require.resolve('playwright',{paths:[process.env.NODE_PATH||'/opt/node22/lib/node_modules','.']}));
const path=require('path');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
 await p.goto('file://'+path.resolve(process.argv[2]));await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);
 await p.pdf({path:process.argv[3],format:'Letter',printBackground:true,margin:{top:0,right:0,bottom:0,left:0},preferCSSPageSize:true});
 const over=await p.evaluate(()=>[...document.querySelectorAll('.page')].map((s,i)=>{const f=s.querySelector('.foot');const kids=[...s.children].filter(c=>!c.classList.contains('foot')&&!c.classList.contains('strap')&&!c.classList.contains('ver'));
  const bottom=Math.max(...kids.map(c=>c.getBoundingClientRect().bottom))-s.getBoundingClientRect().top;const limit=f?f.offsetTop-6:s.clientHeight;return bottom>limit?`page ${i+1} overflows by ${Math.round(bottom-limit)}px`:null;}).filter(Boolean));
 console.log(process.argv[3],over.length?over:'no overflow');await b.close();})();
