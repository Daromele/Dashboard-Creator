// Make a new house-style app from assets/starter.html.
//   node new_app.js --name "Bakeweek Studio" --key jps-bakeweek --theme kiln [--mark B] --out ../../../../bakeweek/Bakeweek_Studio.html
// Fills the name, one-letter mark, storage key, default theme and copyright year; inlines the fonts;
// sets <meta name="theme-color"> to the theme's --bold; and makes the favicon: a rounded square in the
// theme's --bold with the mark in its --pop (the same look as the sidebar's brand mark).
// Then edit CONFIG, Logic and VIEWS in the new file. A drawn glyph (a <path>, as Shop Insights' "S")
// renders crisper than a font letter at 16px: swap it into the favicon when the product is final.
const fs=require('fs'),path=require('path');
const arg=k=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:undefined;};
const name=arg('name'),key=arg('key'),theme=arg('theme')||'kiln',out=arg('out'),mark=(arg('mark')||name?.[0]||'A').toUpperCase();
if(!name||!key||!out){console.error('usage: node new_app.js --name "Product" --key jps-product --theme kiln [--mark P] --out Product.html');process.exit(1);}
if(!/^[a-z0-9-]+$/.test(key))throw Error('--key: lowercase letters, digits and dashes only (it names the browser storage and backup files)');
const A=path.join(__dirname,'../assets');let html=fs.readFileSync(path.join(A,'starter.html'),'utf8');
const block=t=>(html.match(new RegExp(`\\[data-theme="${t}"\\]\\{([^}]*)\\}`))||[])[1];
if(!block(theme))throw Error(`--theme must be one of: ${[...html.matchAll(/\[data-theme="([a-z]+)"\]\{/g)].map(m=>m[1]).join(', ')}`);
const tok=n=>(block(theme).match(new RegExp(`--${n}:(#[0-9A-Fa-f]{6})`))||[])[1];
const bold=tok('bold')||'#3A2419',pop=tok('pop')||'#F2B441';
const favicon='data:image/svg+xml,'+`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="${bold}"/><text x="32" y="45" font-family="Arial,Helvetica,sans-serif" font-size="36" font-weight="800" text-anchor="middle" fill="${pop}">${mark}</text></svg>`.replace(/#/g,'%23').replace(/"/g,"'");
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
const fill=(a,b)=>{if(!html.includes(a))throw Error('starter.html is missing '+a);html=html.split(a).join(b);};
fill('/*@@FONTS@@*/',fs.readFileSync(path.join(A,'fonts.css'),'utf8').trim());
fill('{{FAVICON}}',favicon);fill('{{THEME_COLOR}}',bold);fill('{{YEAR}}',String(new Date().getFullYear()));
fill('{{NAME}}',esc(name));fill('{{MARK}}',mark);fill('{{KEY}}',key);fill('{{THEME}}',theme);
const left=html.match(/\{\{[A-Z_]+\}\}/);if(left)throw Error('unfilled placeholder '+left[0]);
fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,html);
console.log(`wrote ${out} (${(html.length/1024).toFixed(0)} KB) · theme ${theme} · storage ${key}-v1 · favicon ${mark} on ${bold}`);
