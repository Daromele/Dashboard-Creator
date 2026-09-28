// Builds the free take-home check: a small, separate page written for the web, not a cut-down copy of the app.
// It holds none of the app's code, so there is nothing to unlock: one report on one shop's latest 3 months.
// The sample shop is worked out here from the demo files and stored as the finished report (a few KB).
//
//   node build/demo_data.js && node build/make_snapshot.js      -> app/ShopInsightsDemo.html
const fs=require('fs'),path=require('path');
const BUY_URL='https://jpsdigitalpages.etsy.com';      // the Etsy listing once it is live
const SRC=path.join(__dirname,'../app/src/snapshot.html'),OUT=path.join(__dirname,'../app/ShopInsightsDemo.html');
const SAMPLE_DIR=path.join(__dirname,'../listing-kit/demo-data/Fern and Fable Prints');
let html=fs.readFileSync(SRC,'utf8');
const engine=html.slice(html.indexOf('//@@ENGINE'),html.indexOf('//@@END'));
const E=new Function(engine+';return {readFile,analyze};')();
const files=fs.readdirSync(SAMPLE_DIR).filter(f=>/^etsy_statement_|^EtsySoldOrderItems/.test(f)).map(f=>E.readFile(f,fs.readFileSync(path.join(SAMPLE_DIR,f),'utf8')));
const sample=E.analyze(files);
if(!sample||!sample.statements||!sample.products.length)throw Error('sample report is empty');
for(const [a,b] of [["/*@@BUY_URL@@*/''",JSON.stringify(BUY_URL)],['/*@@SAMPLE@@*/null',JSON.stringify(sample)]]){if(!html.includes(a))throw Error('anchor missing: '+a);html=html.replace(a,b);}
if(/@@/.test(html.replace(/\/\/@@(ENGINE|END)/g,'')))throw Error('unfilled placeholder');
fs.writeFileSync(OUT,html);
console.log(`${path.relative(process.cwd(),OUT)}: ${(html.length/1024).toFixed(0)} KB · sample ${sample.from} – ${sample.to}, take-home $${(sample.takeHome/100).toFixed(2)}`);
