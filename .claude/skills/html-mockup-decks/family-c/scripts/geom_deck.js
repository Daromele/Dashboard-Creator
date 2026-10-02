const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules']}));
const path=require('path');
(async()=>{
 const file=process.argv[2];
 const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1600,height:1200}})).newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto('file://'+path.resolve(file)); await p.waitForTimeout(1500);
 await p.evaluate(()=>document.fonts.ready);
 const report=await p.evaluate(()=>{
  const out=[];
  document.querySelectorAll('.slide').forEach(s=>{
   const sb=s.getBoundingClientRect(), bad=[];
   if(Math.round(sb.width)!==1500||Math.round(sb.height)!==1125) bad.push(`size ${Math.round(sb.width)}x${Math.round(sb.height)}`);
   s.querySelectorAll('*').forEach(n=>{
    const r=n.getBoundingClientRect();
    if(r.width===0&&r.height===0)return;
    const cs=getComputedStyle(n);
    if(r.left<sb.left-1||r.right>sb.right+1||r.top<sb.top-1||r.bottom>sb.bottom+1){
      // an element inside an overflow:hidden ancestor is clipped on purpose
      let a=n.parentElement,clipped=false;
      while(a&&a!==s.parentElement){if(getComputedStyle(a).overflow==='hidden'){clipped=true;break;}a=a.parentElement;}
      if(!clipped)bad.push(`OOB ${n.className||n.tagName}`);
    }
    if(n.scrollWidth>n.clientWidth+2&&cs.overflowX!=='hidden'&&cs.overflowX!=='auto'&&n.clientWidth>0)
      bad.push(`hscroll ${n.className||n.tagName} ${n.scrollWidth}>${n.clientWidth}`);
    if(n.scrollHeight>n.clientHeight+2&&cs.overflowY!=='hidden'&&cs.overflowY!=='auto'&&n.clientHeight>0&&/slide|split|body|looks|grid3|pad/.test(n.className||''))
      bad.push(`vscroll ${n.className} ${n.scrollHeight}>${n.clientHeight}`);
   });
   // how much of each heading sits inside Etsy's centre 1125px square crop
   const crop={left:sb.left+187.5,right:sb.right-187.5};
   const heads=[...s.querySelectorAll('h1,h2,h3,.eyebrow')].map(h=>{
     const r=h.getBoundingClientRect();
     return {t:(h.textContent||'').trim().slice(0,28),align:getComputedStyle(h).textAlign,
             inCrop:r.left>=crop.left-1&&r.right<=crop.right+1};});
   // text that visually collides with other text is in-bounds but still broken
   const texts=[...s.querySelectorAll('.foot,.name span,.look .name,h1,h2,h3,.eyebrow,.point,.pill,.cap')];
   for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){
     const a=texts[i].getBoundingClientRect(),c=texts[j].getBoundingClientRect();
     if(texts[i].contains(texts[j])||texts[j].contains(texts[i]))continue;
     if(a.left<c.right-2&&c.left<a.right-2&&a.top<c.bottom-2&&c.top<a.bottom-2)
       bad.push(`overlap ${texts[i].className||texts[i].tagName}/${texts[j].className||texts[j].tagName}`);
   }
   out.push({id:s.id,bad:[...new Set(bad)],headsOutsideCrop:heads.filter(h=>!h.inCrop).length,heads:heads.length});
  });
  return out;
 });
 let fails=0;
 report.forEach(r=>{if(r.bad.length){fails++;console.log(r.id,'PROBLEMS:',r.bad.slice(0,6));}
   else console.log(r.id,'ok · headings',r.heads,'· outside square crop:',r.headsOutsideCrop);});
 console.log('console errors:',errs);
 console.log(fails?'GEOMETRY FAILURES: '+fails:'geometry: clean');
 await b.close();
})();
