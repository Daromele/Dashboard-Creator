// Prints every screen of every edition to PDF (sample data, Letter and A4) and reports how full
// page 1 is. A screen whose first page holds only its heading, with the content pushed to
// page 2, fails. Needs pdfjs-dist:  npm i pdfjs-dist@4  (here or in PDFJS_DIR).
//   node print_audit.js [out-dir-for-pdfs]
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const path=require('path'),fs=require('fs'),{pathToFileURL}=require('url');
const OUT=process.argv[2];
const EDITIONS=[
  {file:'MonthlyBudgetPlanner.html',key:'jps-monthly-plan',screens:['dashboard','annual','budget','activity','goals','scheduled','calendar','wealth','insights','review','settings','guide']},
  {file:'ProfitPlanBusiness.html',key:'jps-profit-plan',screens:['dashboard','pl','pl:quarter','pl:ytd','pl:year','budget','activity','invoices','tax','taxlines','mileage','annual','goals','scheduled','calendar','insights','review','settings','guide']},
  {file:'ShopInsightsEtsy.html',key:'jps-shop-insights',screens:['dashboard','shops','pl','pl:year','fees','fees:month','products','pricing','coupons','customers','reviews','seasonality','tax','taxlines','annual','etsy-import','settings','guide']},
];
const FORMATS=['Letter','A4'],MIN_FILL=0.45;   // page 1 must be at least this full when there is a page 2
(async()=>{
  const pdfjs=await import(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs',{paths:[__dirname,process.env.PDFJS_DIR||__dirname]})).href);
  const b=await chromium.launch();let fail=0,rows=[];
  for(const ed of EDITIONS){
    const ctx=await b.newContext({viewport:{width:1280,height:900},locale:'en-US',timezoneId:'UTC',reducedMotion:'reduce'});
    const p=await ctx.newPage();await p.clock.setFixedTime(new Date('2026-09-24T10:00:00Z'));
    const url=pathToFileURL(path.resolve(__dirname,'../app',ed.file)).href;
    await p.goto(url);await p.evaluate(k=>{localStorage.setItem(k+'-welcome-v1','1');localStorage.setItem(k+'-manual-backup',String(Date.now()));},ed.key);
    await p.goto(url);await p.waitForTimeout(300);
    await p.evaluate(()=>document.querySelector('[data-action="demo"]').click());
    for(const s of ed.screens){
      const [screen,kind]=s.split(':');
      await p.evaluate(([screen,kind])=>{go(screen);if(kind)document.querySelector(`[data-action="biz-period"][data-kind="${kind}"],[data-action="etsy-span"][data-span="${kind}"]`)?.click();},[screen,kind]);
      await p.waitForTimeout(80);
      for(const format of FORMATS){
        const pdf=await p.pdf({format,margin:{top:'0.4in',bottom:'0.4in',left:'0.4in',right:'0.4in'},printBackground:true});
        if(OUT){fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,`${ed.file.replace('.html','')}-${s.replace(':','-')}-${format}.pdf`),pdf);}
        const doc=await pdfjs.getDocument({data:new Uint8Array(pdf),verbosity:0}).promise;
        const page=await doc.getPage(1),vp=page.getViewport({scale:1}),tc=await page.getTextContent();
        // lowest text on page 1, as a share of the printable height
        const ys=tc.items.filter(i=>i.str.trim()).map(i=>vp.height-i.transform[5]);
        const fill=ys.length?(Math.max(...ys)-28.8)/(vp.height-57.6):0;
        const words=tc.items.map(i=>i.str).join(' ').replace(/\s+/g,' ').trim();
        let bad=doc.numPages>1&&fill<MIN_FILL;
        // a middle page that is mostly empty means something was pushed to the next page whole
        const gaps=[];for(let n=2;n<doc.numPages;n++){const pg=await doc.getPage(n),t=await pg.getTextContent(),h=pg.getViewport({scale:1}).height;
          const y=t.items.filter(i=>i.str.trim()).map(i=>h-i.transform[5]);const f=y.length?(Math.max(...y)-28.8)/(h-57.6):0;if(f<MIN_FILL)gaps.push(`page ${n} ${Math.round(f*100)}%`);}
        if(gaps.length)bad=true;if(bad)fail++;
        rows.push(`${bad?'FAIL':'ok  '} ${ed.file.slice(0,14).padEnd(14)} ${s.padEnd(12)} ${format.padEnd(6)} pages ${String(doc.numPages).padStart(2)}  page 1 ${String(Math.round(fill*100)).padStart(3)}% full${gaps.length?'  · near-empty '+gaps.join(', '):''}${bad&&fill<MIN_FILL?'  · page 1: "'+words.slice(0,90)+'…"':''}`);
      }
    }
    await ctx.close();
  }
  await b.close();console.log(rows.join('\n'));console.log(fail?`\n${fail} printouts have a near-empty first or middle page`:'\nprint audit: no near-empty pages');process.exit(fail?1:0);
})();
