// Builds the one file a buyer gets: Bakeweek_Studio.html
//   src/shell.html     page shell (head, sidebar, top bar, dialogs)
//   src/house.css      house style from the sellable-html-app skill (tokens, 8 themes, components)
//   src/bakeweek.css   the bakery-specific pieces
//   src/bakecore.js    every rule and calculation (pure, from the first version; tested by test.js)
//   src/ui-base.js     house shell behavior: storage, backups, sample mode, chart kit, dialogs, tour
//   src/ui-views.js    screens, dialogs, kitchen paperwork and events
//   src/ui-sales.js    standing orders and market days (sell-through, leftovers, suggested amounts)
//   src/ui-menu.js     the weekly pre-order menu: limits, cutoff, copyable menu text, pre-orders
//   src/ui-extras.js   labels, customers, profit & expenses, order messages, pantry minimums
//   src/ui-cal.js      the month calendar and weekly routines
//   src/ui-tools.js    kitchen calculators: scale a recipe, dough, levain, dough temperature, pans, conversions, price check
// Fonts (DM Sans + Manrope) are embedded from the skill's assets/fonts.css.
//   node build.js            build
//   node build.js --check    exit 1 when Bakeweek_Studio.html is out of date
const fs=require('fs'),path=require('path');
const S=f=>fs.readFileSync(path.join(__dirname,'src',f),'utf8');
const FONTS=path.join(__dirname,'../.claude/skills/sellable-html-app/assets/fonts.css');
function build(){let html=S('shell.html');
 const parts={'/*@@FONTS@@*/':fs.readFileSync(FONTS,'utf8').trim(),'/*@@CSS@@*/':S('house.css')+'\n'+S('bakeweek.css'),'/*@@BAKECORE@@*/':S('bakecore.js').trim(),'/*@@UI@@*/':S('ui-base.js')+'\n'+S('ui-views.js')+'\n'+S('ui-sales.js')+'\n'+S('ui-menu.js')+'\n'+S('ui-extras.js')+'\n'+S('ui-cal.js')+'\n'+S('ui-tools.js')};
 for(const [k,v] of Object.entries(parts)){if(html.split(k).length!==2)throw Error('shell.html needs exactly one '+k);html=html.replace(k,()=>v);}
 if(/@@[A-Z]+@@/.test(html))throw Error('unfilled marker in shell.html');
 return html;}
const OUT=path.join(__dirname,'Bakeweek_Studio.html');
if(require.main===module){const html=build();
 if(process.argv.includes('--check')){if(!fs.existsSync(OUT)||fs.readFileSync(OUT,'utf8')!==html){console.log('Bakeweek_Studio.html is out of date. Run: node build.js');process.exit(1);}console.log('build is current');}
 else{fs.writeFileSync(OUT,html);console.log(`built Bakeweek_Studio.html (${(html.length/1024).toFixed(0)} KB)`);}}
module.exports={build};
