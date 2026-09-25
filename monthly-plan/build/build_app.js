// Assembles each sellable single-file planner from the shared core and one niche pack.
//
//   app/src/core.html     the shared engine and UI (never shipped as-is)
//   app/packs/<id>.js     one niche: categories, labels, tax lines, theme, copy
//   app/src/<module>.js   extra screens a pack asks for (pack.build.modules)
//   app/<file>.html       the built product, with its niche pack inlined at the top
//
//   node build_app.js            build every pack
//   node build_app.js --check    exit 1 if a built file is out of date (used by test.js)
const fs=require('fs'),path=require('path'),vm=require('vm');
const APP=path.resolve(__dirname,'../app'),CORE=path.join(APP,'src/core.html'),PACKS=path.join(APP,'packs');

function loadPack(file){
  const src=fs.readFileSync(file,'utf8').trim();
  const ctx={};vm.createContext(ctx);
  vm.runInContext(src+'\n;globalThis.__pack=NICHE;',ctx);
  return {src,pack:ctx.__pack};
}
const get=(o,key)=>key.split('.').reduce((v,k)=>v==null?v:v[k],o);
// static text in the page shell comes from the pack at build time, so nothing flashes
const attr=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
function build(file){
  const {src,pack}=loadPack(file);
  let html=fs.readFileSync(CORE,'utf8');
  if(!html.includes('<!--@@NICHE_PACK@@-->'))throw Error('core.html is missing the niche pack marker');
  html=html.replace('<!--@@NICHE_PACK@@-->',()=>`<script>\n${src}\n</script>`);
  // a pack can add screens of its own: app/src/<name>.js, inlined just before the app starts
  if(!html.includes('/*@@NICHE_MODULES@@*/'))throw Error('core.html is missing the niche modules marker');
  const modules=(pack.build.modules||[]).map(m=>fs.readFileSync(path.join(APP,'src',m+'.js'),'utf8').trim()+'\n').join('');
  html=html.replace('/*@@NICHE_MODULES@@*/',()=>modules);
  html=html.replace(/\{\{(raw:)?([a-zA-Z.]+)\}\}/g,(m,raw,key)=>{
    const v=get(pack,key);if(v==null)throw Error(`${path.basename(file)}: no value for {{${key}}}`);
    return raw?String(v):attr(v);});
  return {out:path.join(APP,pack.build.file),html,pack};
}
function all(){return fs.readdirSync(PACKS).filter(f=>f.endsWith('.js')).sort().map(f=>build(path.join(PACKS,f)));}

module.exports={all,build,loadPack};
if(require.main===module){
  const check=process.argv.includes('--check');let stale=0;
  for(const b of all()){
    const current=fs.existsSync(b.out)?fs.readFileSync(b.out,'utf8'):'';
    if(check){if(current!==b.html){stale++;console.log('out of date:',path.relative(process.cwd(),b.out));}}
    else{fs.writeFileSync(b.out,b.html);console.log('built',path.relative(process.cwd(),b.out),(b.html.length/1024).toFixed(0)+' KB');}
  }
  if(check&&stale){console.log('Run: node build/build_app.js');process.exit(1);}
}
