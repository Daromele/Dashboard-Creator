// Pass 1 of the newbie check: open every screen and click every control, one at a time, from the same
// starting state, in three states (empty app, first data, sample mode), and record what each one did.
// Works for any app built on the monthly-plan core (globals: state, Budget, P, render, go, screen, demo), and for
// other house-style apps through an `adapter` block in editions.json (how to reset, its dialog and tour ids).
//   node crawl.js <App.html> <outDir> [--date 2026-10-05]
// Writes <outDir>/crawl.json and <outDir>/crawl.md (suspicious controls first, then every control).
const {chromium}=require(require.resolve('playwright',{paths:[process.env.NODE_PATH||'/opt/node22/lib/node_modules','.']}));
const fs=require('fs'),path=require('path');
const APP=path.resolve(process.argv[2]),OUT=path.resolve(process.argv[3]||'.');fs.mkdirSync(OUT,{recursive:true});
const di=process.argv.indexOf('--date'),DATE=di>0?process.argv[di+1]:'2026-10-05';
const ED=JSON.parse(fs.readFileSync(path.join(__dirname,'..','editions.json'),'utf8'));
const SEL='#content button,#content a,#content select,#content input[type=checkbox],.topbar button,#nav button';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:950},acceptDownloads:true});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.clock.setFixedTime(new Date(DATE+'T12:00:00'));
 await p.goto('file://'+APP);await p.evaluate(()=>localStorage.clear());await p.goto('file://'+APP);await p.waitForTimeout(800);
 const id=await p.evaluate(()=>typeof P!=='undefined'?P.id:(document.title.split(/[ ·]/)[0]||'').toLowerCase());const E=ED[id]||{first:'',forbid:[]};
 const A=Object.assign({setup:"try{closeWelcome()}catch{};state.settings.hiddenNav=[];render();",empty:'state=Budget.blank();demo=false;',sample:'realState=Budget.blank();state=Budget.sample();demo=true;',reset:"state.settings.hiddenNav=[];selected=Budget.today().slice(0,7);",modal:'#modal',title:'#modal-title',welcome:'#welcome-tour'},E.adapter||{});
 await p.evaluate(s=>{window.print=()=>{window.__printed=(window.__printed||0)+1;};eval(s);},A.setup);
 const SCREENS=await p.evaluate(()=>[...new Set([...document.querySelectorAll('#nav [data-go]')].map(e=>e.dataset.go))]);
 const STATES={empty:A.empty,...(E.first?{first:A.empty+E.first}:{}),sample:A.sample};
 const reset=async(st,scr)=>{await p.evaluate(([s,scr,A])=>{try{if(document.querySelector(A.modal).open)document.querySelector(A.modal).close();}catch{};try{if(document.querySelector(A.welcome).open)document.querySelector(A.welcome).close();}catch{};eval(s);eval(A.reset);screen=scr;render();window.scrollTo(0,0);const t=document.querySelector('#toast');if(t)t.hidden=true;},[STATES[st],scr,A]);await p.waitForTimeout(120);};
 const desc=`e=>[e.dataset.action||e.dataset.go&&('go:'+e.dataset.go)||e.getAttribute('href')||e.name||'',(e.innerText||e.getAttribute('aria-label')||e.title||e.value||'').trim().replace(/\\s+/g,' ').slice(0,50)]`;
 const list=()=>p.evaluate(([S,D])=>{const d=eval(D);return [...document.querySelectorAll(S)].filter(e=>e.offsetParent!==null&&!e.disabled).map(e=>{const [act,label]=d(e);return {act,label,zone:e.closest('.topbar')?'top':e.closest('#nav')?'nav':'content'};});},[SEL,desc]);
 const results=[],words=[];
 for(const st of Object.keys(STATES))for(const scr of SCREENS){
  await reset(st,scr);
  // wording from other editions, including inside closed <details>
  if(E.forbid.length){const html=await p.evaluate(()=>document.querySelector('#content').innerHTML.replace(/<[^>]+>/g,' ')+' '+[...document.querySelectorAll('#content [title],#content [aria-label]')].map(e=>e.title+' '+e.getAttribute('aria-label')).join(' '));
   const re=new RegExp(`[^.\\n]{0,40}\\b(${E.forbid.join('|')})\\b[^.\\n]{0,40}`,'gi');for(const m of new Set(html.match(re)||[]))words.push({st,scr,text:m.replace(/\s+/g,' ').trim()});}
  const seen=new Set();
  for(const c of await list()){if((c.zone==='nav'||c.zone==='top')&&scr!==SCREENS[0])continue;
   const key=c.act+'|'+c.label;if(seen.has(key))continue;seen.add(key);
   if(/^(https?:|mailto:)/.test(c.act)){results.push({st,scr,...c,out:'external link'});continue;}
   await reset(st,scr);
   const before=await p.evaluate(A=>({s:JSON.stringify(state),screen,modal:document.querySelector(A.modal).open,printed:window.__printed||0,html:document.querySelector('#content').innerHTML}),A);
   const nErr=errs.length;let dl=null,fc=null;const w1=p.waitForEvent('download',{timeout:700}).then(d=>dl=d.suggestedFilename()).catch(()=>{}),w2=p.waitForEvent('filechooser',{timeout:700}).then(()=>fc=true).catch(()=>{});
   let found;try{found=await p.evaluate(([S,D,c])=>{const d=eval(D),e=[...document.querySelectorAll(S)].filter(x=>x.offsetParent!==null&&!x.disabled).find(x=>d(x).join('|')===c.act+'|'+c.label);if(!e)return false;
     if(e.tagName==='SELECT'){const o=[...e.options].find(o=>!o.selected&&o.value!=='');if(o){e.value=o.value;e.dispatchEvent(new Event('change',{bubbles:true}));}}else e.click();return true;},[SEL,desc,c]);}
   catch(e){results.push({st,scr,...c,out:'CLICK FAILED '+e.message.split('\n')[0]});continue;}
   if(!found){results.push({st,scr,...c,out:'(gone after reset: depends on an earlier click)'});continue;}
   await p.waitForTimeout(260);await Promise.all([w1,w2]);
   const a=await p.evaluate(A=>({s:JSON.stringify(state),screen,modal:document.querySelector(A.modal).open,mt:document.querySelector(A.modal).open?document.querySelector(A.title)?.innerText:'',toast:(t=>t&&!t.hidden?t.innerText.replace(/\s+/g,' ').slice(0,90):'')(document.querySelector('#toast')),printed:window.__printed||0,html:document.querySelector('#content').innerHTML,welcome:!!document.querySelector(A.welcome)?.open}),A);
   const out=[];if(errs.length>nErr)out.push('ERROR: '+errs.slice(nErr).join(' / '));
   if(a.modal&&!before.modal)out.push('dialog: '+a.mt);if(a.welcome)out.push('welcome tour');if(a.screen!==before.screen)out.push('goes to '+a.screen);
   if(a.toast)out.push('toast: '+a.toast);if(a.s!==before.s)out.push('data changed');if(a.printed>before.printed)out.push('print');if(dl)out.push('download '+dl);if(fc)out.push('file picker');
   if(!out.length&&a.html!==before.html)out.push('screen redrawn');
   results.push({st,scr,...c,out:out.join(' · ')||'NOTHING VISIBLE'});}
 }
 fs.writeFileSync(path.join(OUT,'crawl.json'),JSON.stringify({app:path.basename(APP),id,date:DATE,results,words},null,1));
 const bad=results.filter(r=>/NOTHING|ERROR|FAILED/.test(r.out));
 const md=[`# Crawl: ${path.basename(APP)} (${id}), clock ${DATE}`,'',`${results.length} controls clicked in ${Object.keys(STATES).join(', ')} · ${bad.length} to look at · ${words.length} wording hits`,'',
  '## To look at','',...bad.map(r=>`- ${r.st} / ${r.scr} · \`${r.act}\` “${r.label}” → ${r.out}`),'',
  '## Wording from other editions','',...(words.length?[...new Map(words.map(w=>[w.text,w])).values()].map(w=>`- ${w.st} / ${w.scr}: “${w.text}”`):['- none']),'',
  '## Every control (first time seen per state and screen)','',...[...new Map(results.map(r=>[r.st+r.scr+r.act,r])).values()].map(r=>`- ${r.st} / ${r.scr} [${r.zone}] \`${r.act}\` “${r.label}” → ${r.out}`)];
 fs.writeFileSync(path.join(OUT,'crawl.md'),md.join('\n'));
 console.log(`${id}: ${results.length} controls · ${bad.length} to look at · ${words.length} wording hits · page errors ${errs.length}`);
 bad.forEach(r=>console.log(`  ${r.st}/${r.scr} ${r.act} “${r.label}” → ${r.out}`));
 await b.close();})();
