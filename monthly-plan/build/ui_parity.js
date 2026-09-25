// Proves the budget edition built from core + packs/budget.js renders exactly what v1.8 did.
// Both files run with a frozen clock and deterministic ids; every screen and the main
// dialogs are rendered from blank and from sample data, and their markup is compared.
//
//   node ui_parity.js [old.html] [new.html]
// Defaults: v1.8 from git history (commit bc76a13) vs app/MonthlyBudgetPlanner.html.
const {chromium}=require(require.resolve('playwright',{paths:['/opt/node22/lib/node_modules',__dirname]}));
const fs=require('fs'),path=require('path'),os=require('os'),{execSync}=require('child_process');

const BASE_COMMIT='bc76a13',REL='monthly-plan/app/MonthlyBudgetPlanner.html';
function baseline(){
  const out=path.join(os.tmpdir(),'mp-v1.8.html');
  const root=execSync('git rev-parse --show-toplevel',{cwd:__dirname}).toString().trim();
  fs.writeFileSync(out,execSync(`git show ${BASE_COMMIT}:${REL}`,{cwd:root,maxBuffer:64<<20}));
  return out;
}
const [oldFile,newFile]=[process.argv[2]||baseline(),process.argv[3]||path.resolve(__dirname,'../app/MonthlyBudgetPlanner.html')];

const SCREENS=['dashboard','annual','budget','activity','goals','scheduled','calendar','wealth','insights','review','settings','guide','import'];
const DIALOGS={
  transaction:'transactionForm()',category:'categoryForm()',categoryEdit:'categoryForm(state.categories[4].id)',
  goal:'goalForm()',quick:'quickLog()',schedule:'scheduleForm()',quickSetup:'quickSetup()',snapshot:'snapshotForm()',
};
async function capture(file){
  const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:1440,height:1000},locale:'en-US',timezoneId:'UTC',reducedMotion:'reduce'});
  // This init script also writes localStorage. That is safe here only because each page is
  // loaded once and never reloaded; see biz_smoke.js for why reloads need another approach.
  await ctx.addInitScript(()=>{let n=0;Object.defineProperty(crypto,'randomUUID',{value:()=>'id-'+(++n),configurable:true});
    let seed=7;Math.random=()=>(seed=(seed*16807)%2147483647)/2147483647;
    try{localStorage.setItem('jps-monthly-plan-welcome-v1','1');localStorage.setItem('jps-monthly-plan-manual-backup',String(Date.now()));}catch{}});
  const p=await ctx.newPage();await p.clock.setFixedTime(new Date('2026-09-24T10:00:00Z'));
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+path.resolve(file));await p.waitForTimeout(300);
  const out={};
  const grab=async key=>{out[key]=await p.evaluate(()=>{
    // v1.9 adds the Start fresh block, marks dated headings as the period and bumps the version;
    // everything else must match v1.8
    const norm=h=>h.replace(/ data-count="[^"]*"/g,'').replace(/animation-delay:[^;"]*;?/g,'').replace(/<!--fresh-->[\s\S]*?<!--\/fresh-->/,'').replace(/class="eyebrow period"/g,'class="eyebrow"').replace(/<span class="pt-month">([^<]*)<\/span>/,'$1');
    return {content:norm(document.querySelector('#content').innerHTML),nav:document.querySelector('#nav').innerHTML,
      title:document.title+[...document.head.querySelectorAll('meta,link,title')].map(e=>e.outerHTML).join(''),rail:document.querySelector('.rail').innerHTML.replace(/ · v1\.[89]</,' · v<'),modal:document.querySelector('#modal').open?document.querySelector('#modal-body').innerHTML:''};});};
  for(const mode of ['blank','sample']){
    if(mode==='sample')await p.evaluate(()=>document.querySelector('[data-action="demo"]').click());
    for(const s of SCREENS){await p.evaluate(s=>{go(s);},s);await grab(mode+':'+s);}
    await p.evaluate(()=>go('dashboard'));
    for(const [k,js] of Object.entries(DIALOGS)){
      await p.evaluate(js=>{try{eval(js);}catch(e){}},js);await grab(mode+':dialog:'+k);
      await p.evaluate(()=>{const m=document.querySelector('#modal');if(m.open)m.close();});
    }
    for(let i=0;i<5;i++){out[mode+':welcome:'+i]={content:await p.evaluate(i=>{openWelcome(false);welcomeAt=i;renderWelcome();
      const html=document.querySelector('#welcome-tour').innerHTML;document.querySelector('#welcome-tour').close();return html;},i),nav:'',title:'',rail:'',modal:''};}
  }
  out.errors=errors;await b.close();return out;
}
(async()=>{
  const [a,c]=[await capture(oldFile),await capture(newFile)];
  let diffs=0;
  for(const key of Object.keys(a)){if(key==='errors')continue;
    for(const part of ['content','nav','title','rail','modal']){
      const x=a[key][part],y=c[key]?.[part];
      if(x!==y){diffs++;let i=0;while(i<x.length&&x[i]===y?.[i])i++;
        console.log(`DIFF ${key} ${part} @${i}\n  old: …${x.slice(Math.max(0,i-80),i+160)}\n  new: …${String(y).slice(Math.max(0,i-80),i+160)}`);}
    }
  }
  if(c.errors.length)console.log('page errors (new):',c.errors);
  console.log(`${Object.keys(a).length-1} views compared, ${diffs} differences, ${c.errors.length} page errors`);
  process.exit(diffs||c.errors.length?1:0);
})();
