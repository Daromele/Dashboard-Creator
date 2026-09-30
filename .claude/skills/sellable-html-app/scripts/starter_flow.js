// Flow check for apps made from the starter: welcome tour, add, reload keeps data, delete + undo,
// collapsible rail (remembered), hub tabs, sidebar switches, backup, start fresh, restore, favicon.
//   node starter_flow.js App.html      (adapt the selectors once the app's screens change)
const {chromium}=require(require.resolve('playwright',{paths:[process.env.NODE_PATH||'/opt/node22/lib/node_modules','.']}));
const path=require('path'),os=require('os'),APP='file://'+path.resolve(process.argv[2]||'');
const fails=[],check=(ok,msg)=>{console.log((ok?'  ok  ':'  FAIL ')+msg);if(!ok)fails.push(msg);};
(async()=>{const b=await chromium.launch(),ctx=await b.newContext({acceptDownloads:true,viewport:{width:1440,height:900}}),p=await ctx.newPage(),errs=[];p.on('pageerror',e=>errs.push(e.message));
 const n=()=>p.evaluate(()=>state.records.length),okDialog=async()=>{await p.click('#dlg [data-action=ask-ok]');await p.waitForTimeout(300);};
 await p.goto(APP);await p.waitForTimeout(800);
 check(await p.evaluate(()=>document.querySelector('#welcome').open),'welcome tour opens on first visit');
 const steps=await p.evaluate(()=>slides().length);for(let i=1;i<steps;i++)await p.click('#welcome [data-action=tour-step][data-d="1"]');
 await p.click('#welcome [data-action=tour-close].primary');
 check(/^data:image\/svg\+xml/.test(await p.getAttribute('link[rel=icon]','href')),'favicon is an inline SVG');
 await p.click('.card [data-action=add]');await p.fill('#record-form [name=amount]','abc');await p.click('#record-form button[type=submit]');
 check(!(await p.isHidden('#form-error')),'bad amount shows an error inside the dialog');
 await p.fill('#record-form [name=amount]','123.45');await p.fill('#record-form [name=note]','First sale');await p.click('#record-form button[type=submit]');await p.waitForTimeout(300);
 check(await n()===1,'record added');
 await p.click('[data-action=rail-toggle]');check(await p.evaluate(()=>document.querySelector('#app').classList.contains('rail-min')),'sidebar collapses');
 await p.reload();await p.waitForTimeout(900);
 check(await n()===1,'record still there after reload');check(await p.evaluate(()=>document.querySelector('#welcome').open&&tourReminder&&slides().length===1),'no backup yet: the weekly backup nudge shows instead of the tour');await p.click('#welcome [data-action=tour-close].primary');
 check(await p.evaluate(()=>document.querySelector('#app').classList.contains('rail-min')),'collapsed sidebar remembered');
 await p.click('[data-action=rail-toggle]');
 await p.click('.navlink[data-go=reports]');await p.waitForTimeout(200);await p.click('.hub-tabs [data-go=year]');await p.waitForTimeout(200);
 check(await p.evaluate(()=>screen==='year'&&document.querySelector('.navlink[aria-current=page]')?.dataset.go==='year'),'hub tab opens and the hub stays current in the sidebar');
 await p.click('.navlink[data-go=settings]');await p.click('label.nav-toggle:has([data-nav-toggle=reports])');await p.waitForTimeout(200);
 check(!(await p.$('.navlink[data-go=year],.navlink[data-go=reports]')),'switching a view off hides it from the sidebar');await p.click('label.nav-toggle:has([data-nav-toggle=reports])');
 await p.click('.navlink[data-go=records]');await p.click('[data-action=delete]');await okDialog();check(await n()===0,'delete asks, then deletes');
 await p.click('#toast [data-action=undo]');check(await n()===1,'undo brings it back');
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('.topbar [data-action=backup]')]);const f=path.join(os.tmpdir(),'starter-flow-backup.json');await dl.saveAs(f);
 check(await p.isHidden('#backup-banner'),'no backup banner right after a backup');
 await p.click('.navlink[data-go=settings]');await p.click('[data-action=fresh]');await okDialog();check(await n()===0,'start fresh clears everything');
 await p.setInputFiles('#restore-file',f);await p.waitForTimeout(200);await okDialog();await p.waitForTimeout(300);check(await n()===1,'restore brings the backup back');
 await p.click('[data-action=sample]');check(await p.evaluate(()=>demo&&state.records.length>50),'sample mode fills the app');
 await p.click('[data-action=sample]');check(await n()===1,'leaving sample mode restores your own data');
 check(!errs.length,'no page errors'+(errs.length?': '+errs.join(' | '):''));
 await b.close();console.log(fails.length?`\n${fails.length} failure(s)`:'\nall flows passed');process.exit(fails.length?1:0);})();
