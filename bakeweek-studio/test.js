// Unit tests on what ships: BakeCore is read out of the built Bakeweek_Studio.html, not src/.
//   node test.js
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {build}=require('./build.js');
let pass=0,fail=0;const t=(name,fn)=>{try{fn();pass++;}catch(e){fail++;console.log('FAIL',name,'\n  ',e.message);}};
const html=fs.readFileSync(__dirname+'/Bakeweek_Studio.html','utf8');
t('built file is current',()=>assert.strictEqual(html,build(),'run: node build.js'));
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const ctx={};vm.createContext(ctx);vm.runInContext(scripts[0],ctx);const C=ctx.BakeCore;
t('BakeCore loads from the built file',()=>assert.ok(C&&C.planWeek));
const W='2026-10-05',demo=()=>C.createDemo('2026-10-06');
t('demo week totals',()=>{const p=C.planWeek(demo(),W).totals;assert.strictEqual(p.orders,9);assert.strictEqual(p.pendingBatches,15);assert.strictEqual(p.activeMinutes,842);assert.ok(Math.abs(p.shoppingCost-69.2)<1e-6);assert.ok(Math.abs(p.quotedRevenue-734.4)<1e-6);assert.ok(Math.abs(p.balanceDue-373.8)<1e-6);});
t('whole batches and extras',()=>{const r=C.planWeek(demo(),W).runs.find(r=>r.recipeName==='Signature chocolate cookies'&&r.date==='2026-10-08');assert.strictEqual(r.batches,4);assert.strictEqual(r.produced,48);assert.strictEqual(r.extra,6);});
t('shopping rounds up to whole packs',()=>{const b=C.planWeek(demo(),W).shopping.find(i=>i.name==='Butter');assert.strictEqual(b.packs,4);assert.strictEqual(b.buyQty,2000);});
t('complete a batch takes stock once; undo restores it',()=>{const s=demo(),key=C.planWeek(s,W).runs[0].key,before=s.ingredients.find(i=>i.id==='flour').stock;C.receiveShopping(s,W);const afterRx=s.ingredients.find(i=>i.id==='flour').stock;const run=C.completeRun(s,key,W);assert.ok(s.ingredients.find(i=>i.id==='flour').stock<afterRx);assert.throws(()=>C.completeRun(s,key,W));C.undoRun(s,run.id);assert.strictEqual(s.ingredients.find(i=>i.id==='flour').stock,afterRx);assert.ok(afterRx>before);});
t('not enough stock is refused',()=>{const s=demo(),key=C.planWeek(s,W).runs.find(r=>r.batches>=4).key;assert.throws(()=>C.completeRun(s,key,W),/Not enough/);});
t('ready needs every batch made; collected needs ready',()=>{const s=demo(),o=s.orders[0];assert.throws(()=>C.setOrderStatus(s,o.id,'Ready'),/Complete every batch/);assert.throws(()=>C.setOrderStatus(s,o.id,'Collected'),/ready/);});
t('try an order: overload found, nothing saved',()=>{const s=demo(),n=s.orders.length,r=C.simulateOrder(s,{reference:'X-1',customer:'Test',dueDate:'2026-10-10',bakeDate:'2026-10-08',finishDate:'2026-10-09',payment:'Card',paid:0,setupMinutes:15,extraCost:0,lines:[{recipeId:'cookie',qty:48,unitPrice:3.8,finishMinutes:6}]},W);assert.strictEqual(r.fits,false);assert.strictEqual(s.orders.length,n);assert.ok(r.quote.minPriceAtTarget>0);});
t('payments cannot exceed the order',()=>{const s=demo();assert.throws(()=>C.recordPayment(s,s.orders[0].id,1e6));});
t('CSV import: template round trip and duplicate skip',()=>{const s=demo(),csv=C.orderCSVTemplate(s).replace('ORDER-001','NEW-1');const r=C.importOrders(s,csv);assert.strictEqual(r.imported,1);const r2=C.importOrders(s,csv);assert.strictEqual(r2.imported,0);assert.strictEqual(r2.skipped,1);});
t('CSV import refuses wrong headers',()=>assert.throws(()=>C.importOrders(demo(),'a,b\n1,2'),/headers/));
t('backups: Codex-format data validates; other files are refused',()=>{const s=demo();assert.ok(C.validateBackup(JSON.parse(JSON.stringify({...s,ui:{theme:'kiln'},app:'jps-bakeweek'}))));assert.throws(()=>C.validateBackup({schema:'x',version:1}),/not a supported/);});
// the sample bakery's history (UI layer) must be valid data too
const ui=scripts[1],f=ui.slice(ui.indexOf('function sampleBakery'),ui.indexOf('/* ---------- small form helpers'));
const sb=new Function('C','today',f+'\nreturn sampleBakery();')(C,()=>'2026-10-06');
t('sample bakery: history validates',()=>{assert.ok(C.validateBackup(sb));assert.ok(sb.orders.length>90);});
t('sample bakery: past orders are collected, paid and fully made',()=>{const past=sb.orders.filter(o=>o.id.startsWith('sample-past')&&o.status!=='Cancelled');assert.ok(past.every(o=>o.status==='Collected'&&o.snapshot&&Math.abs(o.paid-o.snapshot.revenue)<1e-6));});
t('sample bakery: the current week is the demo week',()=>{const p=C.planWeek(sb,W).totals;assert.strictEqual(p.pendingBatches,15);assert.ok(Math.abs(p.quotedRevenue-734.4)<1e-6);});
t('sample bakery: pantry stock untouched by history',()=>assert.strictEqual(sb.ingredients.find(i=>i.id==='butter').stock,600));
t('no British spellings in the UI',()=>{const bad=ui.match(/\b(colour|favourite|totalled|organis|recognis|licence|xx)\b/gi)||[];assert.deepStrictEqual(bad.filter(w=>!/cancelled orders are left out/i.test(w)),[]);});
t('no window.confirm or alert in the UI',()=>assert.ok(!/\b(confirm|alert)\(/.test(ui.replace(/C\.\w+|ask\(/g,''))));
console.log(`${pass} passed, ${fail} failed`);process.exit(fail?1:0);
