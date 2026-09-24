import io,base64,os,html
D='deck18/'
def img(n):
    with open(D+n,'rb') as f: return 'data:image/jpeg;base64,'+base64.b64encode(f.read()).decode()
def pic(n,key,alt=''):
    return f'<img data-img="{key}" src="{img(n)}" alt="{alt}">'
SWAP_JS=io.open('swap.js.txt',encoding='utf-8').read()
SWAP_CSS=io.open('swap.css.txt',encoding='utf-8').read()
FONTS=io.open(D+'fonts.css',encoding='utf-8').read()
LISTING=io.open('listing-kit/etsy-listing.md',encoding='utf-8').read()

CSS = """
%FONTS%
:root{
  --ink:#241A33; --bold:#2E2040; --pop:#F0B98F; --pop-ink:#2E2040;
  --paper:#FAF9FC; --card:#fff; --calm:#5C3F8F; --rule:#E4DFEC; --ink2:#5C5468; --ink3:#8B8398;
  --sans:"Montserrat",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,Helvetica,Arial,sans-serif;
  --display:"Playfair Display",Georgia,"Times New Roman",serif;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#2b2b2b;font-family:var(--sans);padding:28px;display:flex;flex-direction:column;align-items:center;gap:28px}
.bar{position:static;background:#111;color:#fff;border-radius:12px;padding:12px 18px;
  display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:13px;width:1500px}
.bar b{color:var(--pop)}
.bar button{background:#333;color:#fff;border:0;border-radius:7px;padding:6px 11px;cursor:pointer;font-size:12px}
.bar button:hover{background:var(--pop);color:#000}
[contenteditable]{outline:none;cursor:text;border-radius:3px}
[contenteditable]:hover{background:rgba(92,63,143,.08)}
[contenteditable]:focus{background:rgba(92,63,143,.14)}
.dark [contenteditable]:hover{background:rgba(255,255,255,.10)}
.dark [contenteditable]:focus{background:rgba(255,255,255,.18)}
.slide-label{color:#8B8398;font-size:12px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;align-self:flex-start;margin-left:2px}

.slide{width:1500px;height:1125px;overflow:hidden;position:relative;display:flex;flex-direction:column;
  align-items:center;background:var(--paper);color:var(--ink);border-radius:2px;padding:54px 50px 26px}
.dark{background:var(--bold);color:#fff}
/* Etsy centre-crops listing images to a square, so everything that has to
   survive the thumbnail is centred rather than flush left. */
h1,h2,.eyebrow,.sub,.foot{text-align:center}
.eyebrow{font-size:19px;font-weight:800;letter-spacing:.17em;text-transform:uppercase;color:var(--calm)}
.dark .eyebrow{color:var(--pop)}
h1{font-family:var(--display);font-size:74px;line-height:1.03;letter-spacing:-.025em;font-weight:800;margin:14px 0 0}
h2{font-family:var(--display);font-size:60px;line-height:1.05;letter-spacing:-.02em;font-weight:800;margin:13px 0 0}
.sub{font-size:24px;line-height:1.4;color:var(--ink2);margin:15px auto 0;max-width:60ch}
.dark .sub{color:rgba(255,255,255,.82)}
.foot{font-size:17px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);position:absolute;left:0;right:0;bottom:22px;z-index:0}
.dark .foot{color:rgba(255,255,255,.52)}
/* the capture is the argument; min-height:0 keeps it inside its share of the
   slide instead of pushing the caption off the bottom */
.shot{position:relative;z-index:1;margin-top:28px;width:100%;min-height:0;border-radius:4px;overflow:hidden;
  box-shadow:0 26px 60px rgba(26,18,42,.26);background:#fff;flex:1 1 0;display:flex}
.dark .shot{box-shadow:0 34px 80px rgba(0,0,0,.45)}
.shot .swap-wrap{width:100%;height:100%}
.shot img{display:block;width:100%;height:100%;object-fit:cover;object-position:top center}
.pills{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:24px}
.pill{font-size:17px;font-weight:700;padding:12px 25px;border-radius:999px;
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);color:#fff;white-space:nowrap}

/* themes */
.looks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:minmax(0,1fr);
  gap:24px 22px;width:100%;flex:1 1 0;min-height:0;margin:30px 0 44px}
.look{display:flex;flex-direction:column;min-height:0}
.look .box{flex:1 1 0;min-height:0;border-radius:4px;overflow:hidden;box-shadow:0 16px 38px rgba(26,18,42,.20);background:#fff;display:flex}
.look .box .swap-wrap{width:100%;height:100%}
/* An on-image label would end up in the screenshots, since the pointer is usually
   resting on the slide when you capture it. The picture keeps a pointer cursor and a
   native tooltip, neither of which a screenshot records. */
.slide .swap-btn{display:none !important}
.look .box img{width:100%;height:100%;object-fit:cover;object-position:top left}
.look .name{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:12px;flex-shrink:0;
  font-size:21px;font-weight:800;letter-spacing:-.01em;color:var(--ink)}
.look .name i{width:15px;height:15px;border-radius:999px;flex:0 0 15px;display:block}
.look.note{justify-content:center;background:var(--bold);border-radius:13px;padding:26px;color:#fff;text-align:center}
.look.note .big{font-family:var(--display);font-size:30px;font-weight:800;line-height:1.2;margin-bottom:10px}
.look.note p{font-size:17px;line-height:1.45;color:rgba(255,255,255,.8)}

/* listing copy — a document, not a slide; never screenshotted */
.listing{width:1500px;background:#fff;border-radius:14px;padding:46px 54px 54px;color:var(--ink)}
.listing h3{font-family:var(--display);font-size:34px;margin-bottom:6px}
.listing .lead{color:var(--ink2);font-size:16px;margin-bottom:28px}
.listing h4{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--calm);font-weight:800;margin:26px 0 9px}
.listing pre{white-space:pre-wrap;font:14px/1.62 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  background:var(--paper);border:1px solid var(--rule);border-radius:10px;padding:18px 20px;color:var(--ink)}
.listing .hint{font-size:13px;color:var(--ink3);margin-top:8px}
"""

def slide(sid,label,dark,eyebrow,head,sub,shot,foot):
    cls='slide dark' if dark else 'slide'
    return (f'<div class="slide-label">{label}</div>\n'
      f'<div class="{cls}" id="{sid}">'
      f'<div class="eyebrow" contenteditable="true" spellcheck="false">{eyebrow}</div>'
      f'<h2 contenteditable="true" spellcheck="false">{head}</h2>'
      f'<p class="sub" contenteditable="true" spellcheck="false">{sub}</p>'
      f'<div class="shot">{pic(shot,sid,head)}</div>'
      f'<div class="foot" contenteditable="true" spellcheck="false">{foot}</div></div>')

def hero():
    return ('<div class="slide-label">Slide 1 — Hero</div>\n'
     '<div class="slide dark" id="s1">'
     '<div class="eyebrow" contenteditable="true" spellcheck="false">Monthly &amp; annual budget planner</div>'
     '<h1 contenteditable="true" spellcheck="false">Set it once.<br>Follow it all year.</h1>'
     '<div class="pills">'
     '<span class="pill" contenteditable="true" spellcheck="false">No subscription</span>'
     '<span class="pill" contenteditable="true" spellcheck="false">Works offline</span>'
     '<span class="pill" contenteditable="true" spellcheck="false">Mac &amp; PC</span></div>'
     f'<div class="shot">{pic("tab-dashboard.jpg","s1","Monthly Plan dashboard")}</div>'
     '<div class="foot" contenteditable="true" spellcheck="false">Monthly Plan · JPS Digital Pages</div></div>')

THEMES=[('Lavender','lavender','#2E2040'),('Sage','sage','#1F4A3E'),('Linen','linen','#45392A'),('Fjord','fjord','#1C3C52'),
        ('Blush','blush','#63304A'),('Slate','slate','#2E3841'),('Night','night','#C3A9E8'),('Midnight','midnight','#9DB8F5')]
def themes(sid,label):
    looks=''.join(f'<div class="look"><div class="box">{pic("theme-"+k+".jpg","theme-"+k,n+" theme")}</div>'
      f'<div class="name"><i style="background:{c}"></i><span contenteditable="true" spellcheck="false">{n}</span></div></div>'
      for n,k,c in THEMES)
    return ('<div class="slide-label">'+label+'</div>\n'
      f'<div class="slide" id="{sid}">'
      '<div class="eyebrow" contenteditable="true" spellcheck="false">Make it yours</div>'
      '<h2 contenteditable="true" spellcheck="false">Eight looks. One clear plan.</h2>'
      f'<div class="looks">{looks}</div>'
      '<div class="foot" contenteditable="true" spellcheck="false">Monthly Plan · JPS Digital Pages</div></div>')

TABS=[
 ('s2','Slide 2 — Monthly dashboard',False,'Monthly dashboard','What is really left.',
  'One honest number, after every commitment you have already made.','tab-dashboard.jpg','Fictional sample figures shown'),
 ('s3','Slide 3 — Monthly budget',True,'Monthly budget','Plan it once.',
  'Save it as your repeating plan and every month opens already filled in.','tab-budget.jpg','Change one month without touching the rest'),
 ('s4','Slide 4 — Annual dashboard',False,'Annual dashboard','The whole year, at once.',
  'Planned against actual, month by month, for the entire year.','tab-annual.jpg','Fictional sample figures shown'),
 ('s5','Slide 5 — Year-wide category table',True,'Every category','Twelve months. One table.',
  'Shaded by how far actual ran from plan, so the month that slipped is obvious.','tab-heat.jpg','Green within plan · red over plan'),
 ('s6','Slide 6 — Transactions',False,'Transactions','Every entry, with charts.',
  'Filter by category or type and the charts follow along.','tab-activity.jpg','Where it went · by type · largest expense'),
 ('s7','Slide 7 — CSV import',True,'Bank import','Import. It learns.',
  'Map the columns once. It remembers your categories and blocks duplicates.','tab-import.jpg','Any date format · duplicate protection'),
 ('s8','Slide 8 — Savings & goals',False,'Savings &amp; goals','Saving up. Paying off.',
  'Add a photo of what you are saving for. Debt payoff goals sit alongside.','tab-goals.jpg','Cards or table · search, sort and filter'),
 ('s9','Slide 9 — Recurring payments',True,'Recurring payments','Set the rhythm once.',
  'Rent, subscriptions, loans — on the dates they actually land.','tab-scheduled.jpg','Weekly · monthly · quarterly · yearly'),
 ('s10','Slide 10 — Calendar',False,'Calendar','Your month, day by day.',
  'What is planned and what you have recorded, side by side.','tab-calendar.jpg','Select any day for its detail'),
 ('s11','Slide 11 — Wealth snapshots',True,'Wealth snapshots','Watch net worth move.',
  'Month-end balances, tracked apart from your budget.','tab-wealth.jpg','Assets · debts · net worth'),
 ('s12','Slide 12 — Insights',False,'Insights','What stands out.',
  'Plain observations drawn only from the entries you made.','tab-insights.jpg','Nothing estimated, nothing invented'),
 ('s13','Slide 13 — Weekly review',True,'Weekly review','Two minutes on a Sunday.',
  'A short check-in that keeps the whole thing honest.','tab-review.jpg','The habit that makes a budget work'),
 ('s14','Slide 14 — Settings & backup',False,'Settings &amp; backup','Yours, and safe.',
  'Your currency, your categories, your sidebar — and a full backup any time.','tab-settings.jpg','Your data never leaves your computer'),
 ('s15','Slide 15 — How to use',True,'How to use','Guided from the start.',
  'A welcome tour, a full guide inside, and a sample year to explore first.','tab-guide.jpg','Sample mode keeps your own budget separate'),
]

SLIDES=[hero()]+[slide(*t) for t in TABS]+[themes('s16','Slide 16 — Themes')]

listing_block=('<div class="listing"><h3>Etsy listing copy</h3>'
 '<p class="lead">Not a slide — nothing here is screenshotted. Select and copy each block straight into Etsy.</p>'
 '<h4>Title</h4><pre>Monthly Budget Planner Spreadsheet Alternative (Editable HTML Budget Tracker Instant Download, Offline)</pre>'
 '<p class="hint">103 characters.</p>'
 '<h4>Keywords — 13 tags, each 20 characters or fewer</h4>'
 '<pre>budget planner, monthly budget, budget tracker, digital planner, debt payoff tracker, savings tracker, expense tracker, budget template, finance planner, money tracker, annual budget, sinking funds, paycheck budget</pre>'
 '<p class="hint">Paste as one line; Etsy splits them on the commas.</p>'
 '<h4>Description</h4><pre>'+html.escape(LISTING.split('=== DESCRIPTION (plain text — paste exactly as-is, no formatting)',1)[1].strip())+'</pre>'
 '<p class="hint">Plain text only — Etsy strips markdown, so the bullets are real • characters.</p></div>')

HTML=('<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'
 '<title>Monthly Plan · Etsy listing mockups (1500 × 1125)</title>\n<style>'
 +CSS.replace('%FONTS%',FONTS)+SWAP_CSS+'</style></head><body>\n'
 '<div class="bar"><b>MONTHLY PLAN — listing slides</b>'
 '<span>1500 × 1125 · DevTools (F12) → device toolbar → custom 1500 × 1125 → ⋮ → Capture screenshot</span>'
 '<span>✏ Click any text to edit · 🖼 Click or drag a screenshot onto any picture to replace it</span>'
 '<span><button onclick="MPSwap.toggle(this)">🖼 Replace images: ON</button> '
 '<button onclick="MPSwap.reset()">Reset pictures</button></span>'
 '<span>📝 Listing title, tags and description are at the bottom of this page</span>'
 '<span id="nav"></span></div>\n'
 +'\n\n'.join(SLIDES)+'\n\n'+listing_block+
 '\n<script>'+SWAP_JS+'</script>\n<script>document.querySelectorAll(".slide img[data-img]").forEach(function(i){i.title="Click, or drop a screenshot here, to replace this picture";});</script>\n<script>const slides=[...document.querySelectorAll(".slide")];'
 'document.getElementById("nav").innerHTML=slides.map((s,i)=>'
 '"<button onclick=\\"document.getElementById(\'"+s.id+"\').scrollIntoView({behavior:\'smooth\'})\\">"+(i+1)+"</button>").join(" ");'
 '</script>\n</body></html>')
io.open('listing-kit/Monthly_Plan_Etsy_Mockups.html','w',encoding='utf-8').write(HTML)
print('slides',len(SLIDES),'bytes',len(HTML))
