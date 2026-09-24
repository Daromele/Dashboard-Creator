"""Build the free demo from the full Monthly Plan file.

The demo is generated, never hand-edited, so a fix to the product reaches the
demo by re-running this. Every patch asserts its anchor still exists, so if the
app changes shape the build fails loudly instead of silently shipping an
unlocked demo.

usage: python3 make_demo.py            -> MonthlyPlanDemo.html
"""
import io,sys

SRC='MonthlyBudgetPlanner.html'; OUT='MonthlyPlanDemo.html'
BUY_URL='https://jpsdigitalpages.etsy.com/listing/4581352270'   # the Etsy listing
DEMO_MAX=20

s=io.open(SRC,encoding='utf-8').read(); n=0
def rep(old,new,count=1):
    global s,n
    hits=s.count(old)
    assert hits==count, f'anchor found {hits}x, expected {count}: {old[:90]!r}'
    s=s.replace(old,new); n+=1

# --- demo build flag, the cap, and the buy link -----------------------------
rep("const MAX_TRANSACTIONS=20000;",
 "const MAX_TRANSACTIONS=20000;\n"
 f"const DEMO_BUILD=true, DEMO_MAX={DEMO_MAX}, BUY_URL={BUY_URL!r};\n"
 "// Sample mode is fictional data and the best thing in the demo, so the cap\n"
 "// only ever applies to the visitor's own budget.\n"
 "const txCap=()=>demo?MAX_TRANSACTIONS:DEMO_MAX;\n"
 "const txLeft=()=>Math.max(0,txCap()-state.transactions.length);\n"
 "const limitMsg=()=>demo?LIMIT_MESSAGE:`That is all ${DEMO_MAX} entries the demo allows. "
 "Your plan, categories, goals and schedules are safe — download a backup in Settings and load it into "
 "the full planner to carry straight on.`;\n")

# --- the two places a transaction is created --------------------------------
rep("if(!id&&state.transactions.length>=MAX_TRANSACTIONS)throw Error(LIMIT_MESSAGE);",
    "if(!id&&state.transactions.length>=txCap())throw Error(limitMsg());")
rep("if(state.transactions.length>=MAX_TRANSACTIONS)throw Error(LIMIT_MESSAGE);",
    "if(state.transactions.length>=txCap())throw Error(limitMsg());")

# --- locked features -------------------------------------------------------
rep("case 'print':window.print();break;",
    "case 'print':upsell('Printing and PDF export');break;")
rep("case 'import':go('import');break;",
    "case 'import':upsell('Bank CSV import');break;")
# import stays out of the sidebar so the demo never offers a door it will not open
rep("$('#nav').innerHTML=navItems.filter(([id])=>!hidden.has(id))",
    "$('#nav').innerHTML=navItems.filter(([id])=>!hidden.has(id)&&id!=='import')")
rep("function autoBackupCard(){const supported=",
    "function autoBackupCard(){if(DEMO_BUILD)return demoBackupCard();const supported=")

# --- the demo strip, the locked backup card and the upsell dialog -----------
rep("function renderBackupBanner(){",
 """const buyBtn=(cls='small primary')=>`<a class="btn ${cls}" href="${BUY_URL}" target="_blank" rel="noopener">Get the full planner</a>`;
function renderDemoBar(){
 const el=$('#demo-bar');if(!el)return;
 const left=txLeft(),msg=demo
  ?'<b>Free demo</b> · sample mode — explore a full fictional year, nothing here is counted'
  :left>0
   ?`<b>Free demo</b> · ${left} of ${DEMO_MAX} ${left===1?'entry':'entries'} left in your own budget`
   :'<b>That is the demo full.</b> Download a backup in Settings and load it into the full planner to carry on.';
 el.innerHTML=`<span>${msg}</span><div class="actions">${buyBtn()}</div>`;
 updateBarHeight?.();
}
function demoBackupCard(){
 return `<div class="backup-block"><h3 class="sub-head is-first">Automatic backups</h3>
 <div class="row"><div><strong>Daily folder backup</strong><small>Keeps a dated JSON backup in a cloud-synced folder current after every change.</small></div><span class="pill">Full planner</span></div>
 <p class="small muted" style="margin-top:14px">The demo does not write to a folder for you. <b>Download backup</b> below works here, and the file it saves loads straight into the full planner.</p></div>`;
}
function upsell(feature){
 modal('Part of the full planner',`${esc(feature)} is included when you buy Monthly Plan.`,
  `<p>Everything else in the demo is the real planner: plan a whole year, log up to ${DEMO_MAX} entries, and explore the sample year as much as you like.</p>
   <p class="small muted">Whatever you set up here comes with you. Download a backup in Settings and load it into the full planner — your categories, plan, goals and schedules arrive intact.</p>
   <div class="formfoot">${buyBtn('primary')}${button('Keep looking around','dismiss','quiet')}</div>`);
}
function renderBackupBanner(){""")

# --- markup + styling ------------------------------------------------------
rep('<div id="backup-banner"', '<div id="demo-bar" class="demo-bar no-print"></div><div id="backup-banner"')
rep(".backup-banner b{color:var(--flag)}",
    ".backup-banner b{color:var(--flag)}\n"
    ".demo-bar{display:flex;align-items:center;justify-content:space-between;gap:var(--s3);flex-wrap:wrap;"
    "padding:var(--s2) var(--s6);font-size:12.5px;background:var(--accent-soft);color:var(--ink);"
    "border-bottom:1px solid var(--accent-line)}\n"
    ".demo-bar b{color:var(--accent-strong,var(--calm))}\n"
    ".demo-bar .btn{white-space:nowrap;text-decoration:none}\n"
    "@media(max-width:620px){.demo-bar{padding:var(--s2) var(--s4)}}")
rep("renderStorage();renderBackupBanner();updateBarHeight();",
    "renderStorage();renderDemoBar();renderBackupBanner();updateBarHeight();")

# --- branding --------------------------------------------------------------
rep("<title>Monthly Plan · Monthly & Annual Budget</title>",
    "<title>Monthly Plan · Free Demo</title>")
rep("Monthly Plan by <a href=\"https://www.jpsdigitalpages.com\" target=\"_blank\" rel=\"noopener\">JPS Digital Pages</a> · <a href=\"mailto:hello@jpsdigitalpages.com\">hello@jpsdigitalpages.com</a> · Personal use only.",
    "Monthly Plan <b>free demo</b> by <a href=\"https://www.jpsdigitalpages.com\" target=\"_blank\" rel=\"noopener\">JPS Digital Pages</a> · "
    f"<a href=\"mailto:hello@jpsdigitalpages.com\">hello@jpsdigitalpages.com</a> · Limited to {DEMO_MAX} of your own entries. "
    "Bank CSV import, printing and folder backups are in the full planner. Personal use only.")

# The demo must not share browser storage with a bought copy on the same machine.
keys=s.count("jps-monthly-plan")
assert keys>=6, keys
s=s.replace("jps-monthly-plan","jps-monthly-plan-demo"); n+=1

io.open(OUT,'w',encoding='utf-8').write(s)
print(f'{OUT}: {n} patches, {len(s)/1024:.0f} KB, storage keys namespaced ({keys})')
