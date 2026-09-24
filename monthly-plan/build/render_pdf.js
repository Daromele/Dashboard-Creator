const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules']}));
const path=require('path');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('listing-kit/Monthly_Plan_Guide.html'));await p.waitForTimeout(1500);
await p.evaluate(()=>document.fonts.ready);
// any page whose content runs past its footer is a layout bug in print
const over=await p.evaluate(()=>[...document.querySelectorAll('.page')].map((pg,i)=>{
  const foot=pg.querySelector('.foot'),lim=foot?foot.getBoundingClientRect().top:pg.getBoundingClientRect().bottom-30;
  let max=0;pg.querySelectorAll('h1,h2,p,table,.box,.shot,ol,ul,.two').forEach(e=>{if(e.closest('.foot'))return;max=Math.max(max,e.getBoundingClientRect().bottom);});
  return {page:i+1,spill:Math.round(max-lim)};}).filter(x=>x.spill>0));
console.log('overflowing pages:',JSON.stringify(over));
await p.pdf({path:'listing-kit/Monthly_Plan_Guide.pdf',preferCSSPageSize:true,printBackground:true});
console.log('errors',errs);await b.close();})();
