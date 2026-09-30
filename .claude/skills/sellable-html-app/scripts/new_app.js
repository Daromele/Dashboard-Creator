// Make a new house-style app from assets/starter.html.
//   node new_app.js --name "Bakeweek Studio" --key jps-bakeweek --theme kiln [--mark B] --out ../../../../bakeweek/Bakeweek_Studio.html
// Fills the name, one-letter mark, storage key and default theme, inlines the fonts, and sets
// <meta name="theme-color"> to the theme's --bold. Then edit CONFIG, Logic and VIEWS in the new file.
const fs=require('fs'),path=require('path');
const arg=k=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:undefined;};
const name=arg('name'),key=arg('key'),theme=arg('theme')||'kiln',out=arg('out'),mark=(arg('mark')||name?.[0]||'A').toUpperCase();
if(!name||!key||!out){console.error('usage: node new_app.js --name "Product" --key jps-product --theme kiln [--mark P] --out Product.html');process.exit(1);}
if(!/^[a-z0-9-]+$/.test(key))throw Error('--key: lowercase letters, digits and dashes only (it names the browser storage)');
const A=path.join(__dirname,'../assets');let html=fs.readFileSync(path.join(A,'starter.html'),'utf8');
const themes=[...html.matchAll(/\[data-theme="([a-z]+)"\]\{/g)].map(m=>m[1]);
if(!themes.includes(theme))throw Error(`--theme must be one of: ${themes.join(', ')}`);
const bold=(html.match(new RegExp(`\\[data-theme="${theme}"\\]\\{[^}]*?--bold:(#[0-9A-Fa-f]{6})`))||[])[1]||'#3A2419';
const fill=(a,b)=>{if(!html.includes(a))throw Error('starter.html is missing '+a);html=html.split(a).join(b);};
fill('/*@@FONTS@@*/',fs.readFileSync(path.join(A,'fonts.css'),'utf8').trim());
fill('{{NAME}}',name.replace(/&/g,'&amp;').replace(/</g,'&lt;'));fill('{{MARK}}',mark);fill('{{KEY}}',key);fill('{{THEME}}',theme);
html=html.replace('data-theme="kiln"',`data-theme="${theme}"`).replace(/<meta name="theme-color" content="[^"]*">/,`<meta name="theme-color" content="${bold}">`);
fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,html);
console.log(`wrote ${out} (${(html.length/1024).toFixed(0)} KB) · theme ${theme} · storage ${key}-v1`);
