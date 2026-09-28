"""Build the free trial of Shop Insights from the full app.

Generated, never hand-edited: re-run after every change to the app. Every patch asserts its anchor, so if the
app changes shape the build stops instead of shipping a trial whose limits never got applied.

The trial is the real app with three kinds of limit, on the visitor's own data only (sample mode shows everything):
  - one shop, and only the last 3 months of whatever files are dropped in (counted back from the newest date);
  - Fees & ads, Products, Profit & loss and Insights show their first sections, the rest blurred behind an upsell;
    Tax, the pricing calculator and New listings are locked screens;
  - printing, CSV downloads and folder backups open the upsell. The manual backup stays open: it restores into
    the full version, so nothing set up here is lost.

A limit in one HTML file can be removed by anyone who reads the source. It converts honest buyers; it is not
copy protection.

usage: python3 build/make_trial.py      -> app/ShopInsightsTrial.html
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from demo_kit import Patcher

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, '../app/ShopInsightsEtsy.html')
OUT = os.path.join(HERE, '../app/ShopInsightsTrial.html')
BUY_URL = 'https://jpsdigitalpages.etsy.com'      # the Etsy listing once it is live
TRIAL_MONTHS = 3

p = Patcher(SRC)

# --- constants, the upsell dialog, the trial strip and the screen locks ---------------------------------
# (core scope: use core helpers only, e.g. Budget.today and toLocaleString, not the Etsy module's num/today)
p.before("function renderBackupBanner(){", r"""const TRIAL=true,TRIAL_MONTHS=%d,BUY_URL=%r;
const buyBtn=(cls='small primary')=>`<a class="btn ${cls}" href="${BUY_URL}" target="_blank" rel="noopener">Get the full version</a>`;
function upsell(feature){
 modal('Part of the full version',`${esc(feature)} comes with Shop Insights.`,
  `<p>Everything else here is the real app: your own take-home, fees, buyers and reviews for your latest ${TRIAL_MONTHS} months, and every screen with the sample shops.</p>
   <p class="small muted">What you set up carries over. Download a backup in Settings and restore it in the full version, then import your full history and every shop.</p>
   <div class="formfoot">${buyBtn('primary')}${button('Keep looking around','dismiss','quiet')}</div>`);}
// the trial keeps the last TRIAL_MONTHS calendar months, counted back from the newest date the visitor has
function trialCut(latest){return Budget.shift(latest.slice(0,7),1-TRIAL_MONTHS)+'-01';}
function trialLatest(files){const ds=[...files.flatMap(f=>(f.records||[]).map(r=>r.date).filter(Boolean)),...state.transactions.map(t=>t.date),...state.etsy.orders.map(o=>o.date)].sort();return ds.at(-1)||Budget.today();}
function trialTrim(files){if(demo)return files;const cut=trialCut(trialLatest(files));
 return files.map(f=>{if(!f.kind||f.kind==='listings'||!f.records)return f;const keep=f.records.filter(r=>!r.date||r.date>=cut),left=f.records.length-keep.length;if(!left)return f;
  const ids=new Set(keep.map(r=>r.id)),items=f.items?f.items.filter(i=>ids.has(i.order)):f.items,ds=keep.map(r=>r.date).filter(Boolean).sort();
  const note=`Free trial: kept ${monthName(cut.slice(0,7))} onward, left out ${left.toLocaleString('en-US')} older row${left===1?'':'s'}. The full version keeps every month.`;
  return keep.length?{...f,records:keep,items,from:ds[0]||f.from,to:ds.at(-1)||f.to,notes:[...(f.notes||[]),note]}:{...f,records:[],items:[],error:`Older than the ${TRIAL_MONTHS} months the free trial keeps (from ${monthName(cut.slice(0,7))}). The full version imports every month.`};});}
function renderTrialBar(){const el=$('#trial-bar');if(!el)return;
 const latest=state.etsy.orders.length||state.transactions.length?trialLatest([]):'';
 el.innerHTML=`<span>${demo?'<b>Free trial</b> · sample mode: every screen unlocked with made-up shops':`<b>Free trial</b> · 1 shop · your latest ${TRIAL_MONTHS} months${latest?` (${monthName(trialCut(latest).slice(0,7))} – ${monthName(latest.slice(0,7))})`:''} · full history, every shop, tax and exports in the full version`}</span><div class="actions">${buyBtn()}</div>`;}
// screens: how many blocks stay readable on the visitor's own data; 0 locks the whole screen
const TRIAL_KEEP={fees:1,products:2,pl:1,insights:2,tax:0,taxlines:0,pricing:0,launches:0};
const TRIAL_WHAT={fees:'Every order, payouts and the month-by-month breakdown',products:'Profit per product, listing health and every product',pl:'The full profit & loss statement',insights:'Your whole to-do list and the products to double down on',tax:'Quarterly tax set-aside and estimates',taxlines:'The Schedule C summary for your accountant',pricing:'The pricing calculator',launches:'New listings and whether they brought more sales'};
function trialLocks(){if(demo||!(screen in TRIAL_KEEP))return;const c=$('#content');if(!c)return;
 const blocks=[...c.children].filter(el=>!el.matches('.print-title,.pagehead,.hub-tabs,.pl-controls,footer,.notice'));const keep=TRIAL_KEEP[screen];
 if(screen==='insights')c.querySelectorAll('.kit-acts .kit-act:nth-child(n+2),.kit-acts~.kit-acts .kit-act').forEach(a=>a.classList.add('trial-blur'));
 const rest=blocks.slice(keep);if(!rest.length&&keep)return;
 rest.forEach((el,i)=>el.classList.add(i<1?'trial-blur':'trial-hide'));
 const card=document.createElement('section');card.className='card trial-lock no-print';
 card.innerHTML=`<div><b>${esc(TRIAL_WHAT[screen])}</b><p>In the full version, with every month and every shop. Try it now with <button class="link" data-action="demo">the sample shops</button>.</p></div>${buyBtn('primary')}`;
 (rest[0]||c.querySelector('footer')).before(card);}
// locked actions open the upsell instead (sample mode too: they are exports of the visitor's work)
const TRIAL_ACTIONS={print:'Printing and PDF summaries',csv:'CSV exports','annual-csv':'CSV exports','biz-pl-csv':'CSV exports','etsy-products-csv':'CSV exports','biz-sc-csv':'The Schedule C summary','biz-mileage-csv':'CSV exports','choose-backup-folder':'Automatic folder backups','backup-now':'Automatic folder backups'};
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');const a=b?.dataset.action;if(!a||!(a in TRIAL_ACTIONS))return;e.preventDefault();e.stopImmediatePropagation();upsell(TRIAL_ACTIONS[a]);},true);
""" % (TRIAL_MONTHS, BUY_URL))

# --- one shop: adding a second opens the upsell (the first shop is created on the import screen) -------
p.rep("function shopForm(id=''){const x=state.shops.find(s=>s.id===id);",
      "function shopForm(id=''){if(!id&&!demo&&state.shops.length>=1)return upsell('More than one shop');const x=state.shops.find(s=>s.id===id);")
p.rep("document.addEventListener('submit',e=>{if(e.target.id!=='etsy-shop-form')return;e.preventDefault();",
      "document.addEventListener('submit',e=>{if(e.target.id!=='etsy-shop-form')return;e.preventDefault();if(!e.target.dataset.id&&!demo&&state.shops.length>=1){closeModal();return upsell('More than one shop');}")

# --- the last TRIAL_MONTHS months of every file ----------------------------------------------------------
p.rep("return r.twin?[r,{...r.twin,src:i,twinOf:true}]:[r];});}",
      "return r.twin?[r,{...r.twin,src:i,twinOf:true}]:[r];});session.files=trialTrim(session.files);}")

# --- folder backup card, strip, locks after every render --------------------------------------------------
p.rep("function autoBackupCard(){const supported=",
      "function autoBackupCard(){if(TRIAL)return `<div class=\"backup-block\"><h3 class=\"sub-head is-first\">Automatic backups</h3><div class=\"row\"><div><strong>Daily folder backup</strong><small>A dated backup in a cloud-synced folder after every change.</small></div><span class=\"pill\">Full version</span></div><p class=\"small muted\" style=\"margin-top:14px\"><b>Download backup</b> below works here, and the file restores straight into the full version.</p></div>`;const supported=")
p.rep("renderStorage();renderBackupBanner();updateBarHeight();", "renderStorage();renderTrialBar();renderBackupBanner();updateBarHeight();")
p.rep("Ext.afterRender();", "Ext.afterRender();trialLocks();")
p.rep('<div id="backup-banner"', '<div id="trial-bar" class="trial-bar no-print"></div><div id="backup-banner"')
p.rep("</head>", """<style>.trial-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:8px 24px;font-size:12.5px;background:var(--accent-soft);color:var(--ink);border-bottom:1px solid var(--accent-line)}
.trial-bar b{color:var(--accent)}.trial-bar .btn,.trial-lock .btn{white-space:nowrap;text-decoration:none}
.trial-blur{filter:blur(5px);opacity:.55;pointer-events:none;user-select:none;max-height:360px;overflow:hidden}.trial-hide{display:none!important}
.trial-lock{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;border:1px solid var(--accent-line);background:color-mix(in srgb,var(--accent) 7%,var(--card));margin-bottom:-6px;position:relative;z-index:1}
.trial-lock b{font-size:16px}.trial-lock p{margin:4px 0 0;color:var(--ink-2)}
@media(max-width:620px){.trial-bar{padding:8px 16px}}
</style></head>""")

# --- branding ------------------------------------------------------------------------------------------------
p.title('Shop Insights · Free Trial')
p.rep("${demo?'Fictional sample data':'Private to this browser · Export a backup regularly'}",
      "${demo?'Fictional sample data · free trial':'Free trial · your latest 3 months, one shop · private to this browser'}")

# the trial never shares browser storage with a bought copy
hits = p.namespace_storage('jps-shop-insights', '-trial')
p.forbid('example.com/listing', 'PLACEHOLDER')
size = p.save(OUT)
print(f'{os.path.relpath(OUT)}: {p.applied} patches, {size/1024:.0f} KB, storage key namespaced ({hits})')
