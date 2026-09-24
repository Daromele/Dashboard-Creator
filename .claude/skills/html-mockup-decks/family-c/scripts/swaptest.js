const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules']}));
const path=require('path'),fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1600,height:1200}})).newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve(process.argv[2]));await p.waitForTimeout(1800);
const out={};
// geometry of the capture: gap left/right, corner radius
out.geom=await p.evaluate(()=>{const s=document.querySelector('#s2'),sh=s.querySelector('.shot'),a=s.getBoundingClientRect(),r=sh.getBoundingClientRect();
 return {slideW:Math.round(a.width),shotW:Math.round(r.width),leftGap:Math.round(r.left-a.left),rightGap:Math.round(a.right-r.right),radius:getComputedStyle(sh).borderRadius,
   footBelowShot:Math.round(s.querySelector('.foot').getBoundingClientRect().top-r.bottom)};});
// 1. click the picture itself
const img=p.locator('img[data-img="s3"]');await img.scrollIntoViewIfNeeded();
const [fc]=await Promise.all([p.waitForEvent('filechooser'),img.click()]);
await fc.setFiles(path.resolve(process.argv[3]));await p.waitForTimeout(600);
out.clickReplaced=(await img.getAttribute('src')).startsWith('data:image/png');
// 2. drop a file onto another picture
const b64=fs.readFileSync(path.resolve(process.argv[3])).toString('base64');
await p.locator('img[data-img="s4"]').scrollIntoViewIfNeeded();
await p.evaluate(async b64=>{const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const file=new File([bin],'mine.png',{type:'image/png'});
 const dt=new DataTransfer();dt.items.add(file);const w=document.querySelector('img[data-img="s4"]').parentElement;
 w.dispatchEvent(new DragEvent('dragover',{dataTransfer:dt,bubbles:true,cancelable:true}));
 w.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));},b64);
await p.waitForTimeout(600);
out.dropReplaced=(await p.locator('img[data-img="s4"]').getAttribute('src')).startsWith('data:image/png');
await p.reload();await p.waitForTimeout(1500);
out.survivesReload=(await p.locator('img[data-img="s3"]').getAttribute('src')).startsWith('data:image/png');
// switched off, clicking does nothing
await p.evaluate(()=>MPSwap.toggle());
let opened=false;p.once('filechooser',()=>opened=true);
await p.locator('img[data-img="s5"]').click();await p.waitForTimeout(500);
out.offDoesNothing=!opened;
p.on('dialog',d=>d.accept());await p.evaluate(()=>{MPSwap.toggle();MPSwap.reset();});await p.waitForTimeout(400);
out.resetRestores=(await p.locator('img[data-img="s3"]').getAttribute('src')).startsWith('data:image/jpeg');

out.errors=errs;console.log(JSON.stringify(out,null,1));await b.close();})();
