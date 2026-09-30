// Flow check for apps made from the starter: welcome, add, reload keeps data, delete + undo, backup, start fresh, restore.
//   node starter_flow.js App.html   (adapt the selectors once the app's screens change)
const {chromium}=require(require.resolve('playwright',{paths:[process.env.NODE_PATH||'/opt/node22/lib/node_modules','.']}));const path=require('path'),os=require('os'),APP='file://'+path.resolve(process.argv[2]);
(async()=>{const b=await chromium.launch(),ctx=await b.newContext({acceptDownloads:true}),p=await ctx.newPage(),errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(APP);await p.waitForTimeout(600);
 console.log('welcome open:',await p.evaluate(()=>document.querySelector('#dlg').open));
 for(let i=0;i<3;i++)await p.click('#dlg [data-action=welcome][data-d="1"]');
 await p.click('#dlg [data-action=welcome-done].primary');
 await p.click('.card [data-action=add]');await p.fill('#record-form [name=amount]','123.45');await p.fill('#record-form [name=note]','First sale');await p.click('#record-form button.primary');
 await p.waitForTimeout(400);console.log('records:',await p.evaluate(()=>state.records.length));
 await p.reload();await p.waitForTimeout(700);console.log('after reload:',await p.evaluate(()=>state.records.length),'welcome again:',await p.evaluate(()=>document.querySelector('#dlg').open));
 await p.click('.navlink[data-to=records]');await p.click('[data-action=delete]',{noWaitAfter:true}).catch(()=>{});
 p.once('dialog',d=>d.accept());await p.click('[data-action=delete]');await p.waitForTimeout(300);console.log('after delete:',await p.evaluate(()=>state.records.length));
 await p.click('#toast [data-action=undo]');console.log('after undo:',await p.evaluate(()=>state.records.length));
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('.topbar [data-action=backup]')]);const f=path.join(os.tmpdir(),'starter-flow-backup.json');await dl.saveAs(f);
 p.once('dialog',d=>d.accept());await p.click('.navlink[data-to=settings]');await p.click('[data-action=fresh]');await p.waitForTimeout(300);console.log('after fresh:',await p.evaluate(()=>state.records.length));
 await p.setInputFiles('#restore-file',f);await p.waitForTimeout(500);console.log('after restore:',await p.evaluate(()=>state.records.length),'errors',errs);
 await b.close();})();
