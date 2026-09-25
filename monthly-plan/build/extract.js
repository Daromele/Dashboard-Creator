// Pulls the pure calculation module (niche pack + Budget) out of a built planner file so
// Node can require it. The embedded sample photos are dropped: they are only pixels.
//
//   node extract.js <planner.html> <out.js>
//
// test.js calls extractTo() for every built edition before it runs.
const fs=require('fs'),path=require('path');

function extract(html){
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  const pack=scripts.find(s=>/\bconst NICHE\s*=/.test(s))||'';
  const main=scripts.find(s=>/\bconst Budget\s*=/.test(s));
  if(!main)throw Error('No Budget module found');
  const start=main.indexOf('const Budget'),endMark='module.exports=Budget;',end=main.indexOf(endMark);
  if(start<0||end<0)throw Error('Budget module boundaries not found');
  const body=main.slice(start,end+endMark.length)
    .replace(/const SAMPLE_GOAL_IMAGES=\{[^\n]*\};/,'const SAMPLE_GOAL_IMAGES={travel:"",emergency:"",investing:""};');
  return pack.trim()+'\n'+body+'\n';
}
function extractTo(htmlFile,outFile){fs.writeFileSync(outFile,extract(fs.readFileSync(htmlFile,'utf8')));return outFile;}
// Budget plus the CSV and platform-statement modules, for import tests: {Budget,CSV,Platforms}
function extractImport(html){
  const main=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>/\bconst Platforms\s*=/.test(s));
  if(!main)throw Error('No Platforms module found');
  const cut=(from,mark)=>{const a=main.indexOf(from),b=main.indexOf(mark);if(a<0||b<0)throw Error(from+' boundaries not found');return main.slice(a,b);};
  return extract(html).replace("if(typeof module!=='undefined')module.exports=Budget;",'')
    +cut('const CSV = (()=>{',"if(typeof module!=='undefined')module.exports=CSV;")
    +cut('const Platforms = (()=>{',"if(typeof module!=='undefined')module.exports=Platforms;")
    +'\nmodule.exports={Budget,CSV,Platforms};\n';
}
function extractImportTo(htmlFile,outFile){fs.writeFileSync(outFile,extractImport(fs.readFileSync(htmlFile,'utf8')));return outFile;}

module.exports={extract,extractTo,extractImport,extractImportTo};
if(require.main===module){
  const [src,out]=process.argv.slice(2);
  if(!src||!out){console.error('usage: node extract.js <planner.html> <out.js>');process.exit(2);}
  extractTo(path.resolve(src),path.resolve(out));console.log('wrote',out);
}
