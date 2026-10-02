import io,base64
D='deck18/'
def img(n,key,alt=''):
    with open(D+n,'rb') as f: b=base64.b64encode(f.read()).decode()
    return f'<img data-img="{key}" src="data:image/jpeg;base64,{b}" alt="{alt}">'
FONTS=io.open(D+'fonts.css',encoding='utf-8').read()
SWAP_JS=io.open('swap.js.txt',encoding='utf-8').read()
SWAP_CSS=io.open('swap.css.txt',encoding='utf-8').read()

# type scale taken from the Payday Plan ADHD guide (points, US Letter)
CSS=FONTS+"""
@page{size:8.5in 11in;margin:0}
:root{--plum:#2E2040;--plum2:#3A2A52;--accent:#5C3F8F;--pop:#F0B98F;--page:#F8F5FA;--ink:#2A2233;--ink2:#5F5770;
 --ink3:#8E86A0;--rule:#DDD5E6;--soft:#ECE6F3;--warm:#FBF1E6;--warmline:#EFD9BF;--green:#E6F1EA;--greenline:#BFDCCB}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#9A93A6}
body{font-family:"Montserrat",-apple-system,Helvetica,Arial,sans-serif;color:var(--ink);font-size:10.5pt;line-height:1.55}
.page{width:8.5in;height:11in;position:relative;overflow:hidden;background:var(--page);padding:.62in .7in .9in;
 margin:0 auto .25in;break-after:page;page-break-after:always}
.page:last-child{break-after:auto;page-break-after:auto}
@media print{html,body{background:none}.page{margin:0}.toolbar{display:none !important}}
.mark{width:.46in;height:.46in;border-radius:.1in;background:var(--plum);color:var(--pop);display:grid;place-items:center;
 font-family:"Playfair Display",Georgia,serif;font-weight:800;font-size:16pt;line-height:1}
.top{display:flex;align-items:flex-start;gap:.2in}
.top .label{font-size:8pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--plum);padding-top:.06in}
h1{font-family:"Playfair Display",Georgia,serif;font-weight:800;font-size:27pt;line-height:1.12;color:var(--plum);
 letter-spacing:-.01em;margin:.36in 0 .12in}
.lede{font-size:11pt;color:var(--ink2);margin-bottom:.2in}
h2{font-size:14pt;font-weight:600;color:var(--plum);margin:.2in 0 .08in}
p{margin:0 0 .09in}
b{font-weight:700;color:var(--plum)}
ol,ul{margin:0 0 .1in .2in}
li{margin-bottom:.03in}
.box{background:var(--soft);border-radius:.14in;padding:.17in .22in;margin:.14in 0}
.box.warm{background:var(--warm);border:1px solid var(--warmline)}
.box.green{background:var(--green);border:1px solid var(--greenline)}
.box h3{font-size:10.5pt;font-weight:700;color:var(--plum);margin-bottom:.05in}
.box p:last-child,.box ul:last-child{margin-bottom:0}
.shot{border-radius:.1in;overflow:hidden;border:1px solid var(--rule);box-shadow:0 6px 18px rgba(46,32,64,.12);margin:.1in 0 .06in;background:#fff}
.shot img{display:block;width:100%;height:auto}
.cap{font-size:8.5pt;color:var(--ink3);margin-bottom:.12in}
table{width:100%;border-collapse:collapse;margin:.08in 0 .12in;font-size:9.5pt}
th{text-align:left;font-size:7.5pt;letter-spacing:.09em;text-transform:uppercase;color:var(--ink3);font-weight:700;
 padding:.06in .1in .06in 0;border-bottom:1.5px solid var(--rule)}
td{padding:.08in .12in .08in 0;border-bottom:1px solid var(--rule);vertical-align:top}
td:first-child{font-weight:700;color:var(--plum);white-space:nowrap;width:1.75in}
.two{display:grid;grid-template-columns:1fr 1fr;gap:.14in}
.two .box{margin:0}
.foot{position:absolute;left:.7in;right:.7in;bottom:.42in;border-top:1px solid var(--rule);padding-top:.1in;
 display:flex;justify-content:space-between;font-size:7pt;letter-spacing:.03em;color:var(--ink3);text-transform:uppercase}
.foot .n{color:var(--pop);font-size:8pt}
/* cover */
.cover{background:var(--plum);color:#fff;padding:.72in .7in}
.cover .mark{width:.62in;height:.62in;font-size:22pt;background:var(--pop);color:var(--plum)}
.cover .kicker{font-size:10pt;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--pop);margin:.48in 0 .16in}
.cover .title{font-family:"Playfair Display",Georgia,serif;font-weight:800;font-size:44pt;line-height:1.08;color:#fff}
.cover .tag{font-family:"Playfair Display",Georgia,serif;font-weight:700;font-size:19pt;color:var(--pop);margin:.16in 0 .14in}
.cover .intro{font-size:12pt;color:rgba(255,255,255,.82);line-height:1.5;max-width:5.3in}
.cover .shot{margin:.42in .1in 0;border:0;box-shadow:0 18px 44px rgba(0,0,0,.45)}
.cover .strap{position:absolute;left:.7in;bottom:1.05in;font-size:9pt;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--pop)}
.cover .ver{position:absolute;left:.7in;bottom:.5in;font-size:8pt;color:rgba(255,255,255,.55);letter-spacing:.04em}
.toolbar{position:sticky;top:0;z-index:9;max-width:8.5in;margin:0 auto .2in;background:#1f1a28;color:#fff;border-radius:0 0 10px 10px;
 padding:10px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:12px}
.toolbar b{color:var(--pop)}
.toolbar button{background:#3a3148;color:#fff;border:0;border-radius:7px;padding:6px 11px;font-size:12px;cursor:pointer}
"""+SWAP_CSS

PAGES=[]
def page(label,inner,n):
    PAGES.append(f'<section class="page"><div class="top"><div class="mark">M</div><div class="label">{label}</div></div>{inner}'
      f'<div class="foot"><span>Monthly Plan | JPS Digital Pages</span><span class="n">{n}</span></div></section>')

COVER=f'''<section class="page cover"><div class="mark">M</div>
<div class="kicker">Your set-it-once guide</div>
<div class="title">Monthly Plan</div>
<div class="tag">Set it once. Follow it all year.</div>
<div class="intro">A monthly and annual budget in one file. Plan once, let it carry forward, and see the whole year clearly.</div>
<div class="shot">{img("shot-hero.jpg","pdf-cover","Monthly Plan dashboard")}</div>
<div class="strap">One file · Works offline · Your own backups</div>
<div class="ver">JPS DIGITAL PAGES | v1.8</div></section>'''

page('Start here',f'''<h1>What you downloaded.</h1>
<p class="lede">Read this page first. The rest is here whenever you need it.</p>
<table><tr><th>File</th><th>What it is</th></tr>
<tr><td>MonthlyBudgetPlanner.html</td><td>The whole app, in one file. This is the product.</td></tr>
<tr><td>Monthly_Plan_Guide.pdf</td><td>This guide.</td></tr>
<tr><td>START_HERE.txt</td><td>The short version of this page.</td></tr>
<tr><td>LICENCE.txt</td><td>What you may and may not do with the file.</td></tr></table>
<p>The HTML file is not a document that opens an app — it <b>is</b> the app. The code, fonts and charts are all inside it, and nothing is downloaded when you use it.</p>
<h2>Setting up — about ten minutes</h2>
<ol><li><b>Extract the ZIP</b> into a folder you will find again. A synced folder — iCloud Drive, Dropbox, OneDrive, Google Drive — is ideal.</li>
<li><b>Double-click MonthlyBudgetPlanner.html.</b> It opens in your browser like a web page, and works offline from then on.</li>
<li><b>Take the welcome tour.</b> Four short slides: planning, logging, backups, and your first transaction.</li>
<li><b>Build your plan once</b> in Monthly budget, then save it as your repeating plan.</li>
<li><b>Download a backup</b> from Settings &amp; backup. Page 9 explains why it matters more than anything else here.</li></ol>
<div class="box"><h3>Want to look around first?</h3><p>Choose <b>Explore sample data</b> in the sidebar. A fictional year fills every screen, in a separate session. <b>Return to my budget</b> brings back your own figures, untouched.</p></div>''',2)

page('The idea',f'''<h1>One number, not a balance.</h1>
<p class="lede">Monthly Plan answers one question first: how much is genuinely free this month?</p>
<div class="shot">{img("tab-dashboard.jpg","pdf-dashboard","Monthly dashboard")}</div>
<p class="cap">The Monthly dashboard. <b>After your commitments</b> is what remains once unpaid bills, debt payments and planned contributions are set aside.</p>
<div class="box"><h3>Why it is not just your bank balance</h3><p>A bank balance still counts money already promised to your rent, your card and your savings. This number does not. That is the whole difference — and why it is usually lower than you expect at first.</p></div>
<h2>Green and red mean one thing</h2>
<p>Within plan, or over it. Those two colours are reserved for that everywhere in the planner, so you never have to decode them. Hover any chart for the exact figure.</p>''',3)

page('Getting around','''<h1>The screens.</h1>
<p class="lede">Twelve views, grouped in the sidebar. Turn off any you do not use in Settings.</p>
<table><tr><th>Screen</th><th>What it is for</th></tr>
<tr><td>Monthly dashboard</td><td>What is left after commitments, and where the plan stands.</td></tr>
<tr><td>Annual dashboard</td><td>The year: plan against actual, and every category month by month.</td></tr>
<tr><td>Monthly budget</td><td>Your plan. Set once; every month starts from it.</td></tr>
<tr><td>Transactions</td><td>Everything logged — searchable, filterable, with charts. Import CSV here.</td></tr>
<tr><td>Savings &amp; goals</td><td>Goals you are saving towards, and debts you are paying off.</td></tr>
<tr><td>Recurring payments</td><td>Bills and income on a rhythm — weekly to yearly.</td></tr>
<tr><td>Calendar</td><td>The month laid out: planned and recorded, day by day.</td></tr>
<tr><td>Wealth snapshots</td><td>Month-end balances and net worth, kept apart from the budget.</td></tr>
<tr><td>Insights</td><td>What stands out in your own numbers.</td></tr>
<tr><td>Weekly review</td><td>A two-minute check-in to keep the plan true.</td></tr>
<tr><td>Settings &amp; backup</td><td>Currency, dates, themes, categories and your backups.</td></tr>
<tr><td>How to use</td><td>The guide inside the app, and the tour again.</td></tr></table>
<h2>Logging what you spend</h2>
<p>Press <b>N</b> anywhere, or choose <b>Add transaction</b> at the top. <b>Quick log</b> takes a short line like <b>coffee 4.50</b> and files it by matching words — and remembers your choice next time.</p>''',4)

page('Set it once',f'''<h1>Plan once. It repeats.</h1>
<p class="lede">Rebuilding a budget every month is what makes most people stop. This one is built so you do not.</p>
<div class="shot">{img("tab-budget.jpg","pdf-budget","Monthly budget")}</div>
<h2>Your repeating plan</h2>
<p>Save your budget as the baseline and every new month opens already filled in. Change one figure in March and only March changes — the planner marks it as an override for that month.</p>
<h2>Groups that fold away</h2>
<p>Income, bills, subscriptions, debt, variable spending and savings each collapse with their own totals, so you can work on one part at a time. Add a category from right here.</p>
<div class="box"><h3>Recurring payments</h3><p>Add rent, the phone, the gym once, on their real rhythm. They appear on the calendar and tick off when you record the matching payment.</p></div>''',5)

page('Bring it in',f'''<h1>Import your bank CSV.</h1>
<p class="lede">Transactions → <b>Import CSV</b>. Map the columns, review, then add.</p>
<div class="shot" style="margin:0 auto .06in;width:90%">{img("tab-import.jpg","pdf-import","CSV import review")}</div>
<table><tr><th>It handles</th><th>How</th></tr>
<tr><td>Any date format</td><td>Day/month or month/day is decided from the whole column, not guessed row by row.</td></tr>
<tr><td>Your categories</td><td>Every choice you make is remembered, so the next statement arrives mostly sorted.</td></tr>
<tr><td>Duplicates</td><td>Rows you already have are flagged and blocked. The same file twice cannot double your spending.</td></tr>
<tr><td>Many rows at once</td><td>Select all, set one category for them all. Closed months reopen from the import itself.</td></tr></table>
<div class="box warm" style="margin-top:.06in"><h3>Credit cards: pick one method</h3><p>Import the card's purchases, or record the payment you make to the card — not both, or the same money counts twice.</p></div>''',6)

page('Worth finding',f'''<h1>Saving up. Paying off.</h1>
<p class="lede">Savings goals and debt payoff goals, side by side, counted from what you actually log.</p>
<div class="shot">{img("tab-goals.jpg","pdf-goals","Savings and goals")}</div>
<div class="two">
<div class="box"><h3>Debt payoff</h3><p>Link a debt category and the goal becomes a payoff: paid off, per cent cleared, and what is still owing.</p></div>
<div class="box"><h3>Cover photos</h3><p>Give a savings goal a picture of the thing itself. Photos are cropped to the card's shape, and one button hides them all.</p></div>
<div class="box"><h3>Cards or table</h3><p>Switch to a table you can sort by any column — saved, target, progress, what is left, date.</p></div>
<div class="box"><h3>Search, filter, sort</h3><p>Find a goal by name or category, show only those in progress, and order them however helps today.</p></div></div>
<p style="margin-top:.14in">If a payoff goal sits at 0%, its card tells you why — usually because the card's purchases were imported instead of the payments made to it.</p>''',7)

page('The whole year',f'''<h1>Every category, every month.</h1>
<p class="lede">Annual dashboard → <b>Every category, across the year</b>.</p>
<div class="shot">{img("tab-heat.jpg","pdf-heat","Year-wide category table")}</div>
<p class="cap">Each square is one month, shaded by how far actual ran from plan. Select one to open that month. Blank means nothing recorded or not yet due — never a win you did not earn.</p>
<h2>A few other things</h2>
<table>
<tr><td>Exact figures</td><td>Planned and actual side by side, with future months left blank. Export it as CSV.</td></tr>
<tr><td>Wealth snapshots</td><td>Month-end balances, so the net-worth trend is not muddied by spending.</td></tr>
<tr><td>Insights</td><td>Plain observations drawn only from what you entered.</td></tr>
<tr><td>Print</td><td>Any screen prints cleanly. Landscape suits the annual views.</td></tr>
<tr><td>Eight themes</td><td>Settings &amp; backup → Choose your palette, including two dark modes.</td></tr></table>''',8)

page('Read this one','''<h1>Keeping your plan safe.</h1>
<p class="lede"><b>Your plan lives in your browser, on your device.</b> Nothing is sent anywhere, there is no account, and nobody else holds a copy — including us.</p>
<div class="box warm"><h3>Your entries live in browser storage — please read</h3><ul>
<li>Everything you enter is saved automatically in that browser's local storage.</li>
<li>Clearing your cache, history or site data will permanently delete it.</li>
<li>It does not carry across browsers — a plan built in Chrome will not appear in Safari.</li>
<li>The HTML file does not contain your entries. Copying the file does not copy your plan.</li></ul></div>
<h2>Do one of these. Ideally both.</h2>
<div class="box green"><h3>Download backup — every browser</h3><p>Settings &amp; backup → <b>Download backup</b>. One JSON file holding every month, goal and category. <b>Restore backup</b> brings it back on any computer.</p></div>
<div class="box"><h3>Daily folder backup — Chrome or Edge</h3><p>Choose a synced folder once and a dated copy is written each day you make changes. Safari and Firefox do not offer this, and Settings says so plainly.</p></div>
<h2>Moving to another computer</h2>
<p>Copy the HTML file and your latest backup across, open the file, then Settings &amp; backup → <b>Restore backup</b>.</p>''',9)

page('When you need help','''<h1>A few useful fixes.</h1>
<table><tr><th>What you see</th><th>What to do</th></tr>
<tr><td>It opens as code, not an app</td><td>Right-click the file → Open with → your browser. Extract the ZIP first.</td></tr>
<tr><td>My numbers are gone</td><td>Check it is the same browser and profile you used before. Otherwise, Restore backup.</td></tr>
<tr><td>An import doubled something</td><td>Rows marked Possible duplicate can be deleted; future imports block them.</td></tr>
<tr><td>A payoff goal stays at 0%</td><td>Log the payments made to that debt, not the card's purchases.</td></tr>
<tr><td>Folder backup unavailable</td><td>Use Chrome or Edge on a computer, or Download backup instead.</td></tr>
<tr><td>A category is wrong</td><td>Edit the transaction; create a new category from inside the editor.</td></tr>
<tr><td>The currency is wrong</td><td>Settings &amp; backup → Planner currency, or type your own symbol.</td></tr>
<tr><td>I want the tour again</td><td>Settings &amp; backup → Welcome tour → Show tour.</td></tr></table>
<h2>We can help</h2>
<p>For order support, message <b>JPS Digital Pages</b> through Etsy or email <b>hello@jpsdigitalpages.com</b>. Website: jpsdigitalpages.com</p>
<div class="box"><h3>Thank you</h3><p>If Monthly Plan earns its place, a review genuinely helps a small shop. And if it does not, tell us before you leave one — most things are fixable.</p></div>
<p style="font-size:8.5pt;color:var(--ink3)">© 2026 JPS Digital Pages · Personal use by one household. See LICENCE.txt.</p>''',10)

HTML=('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Monthly Plan · Guide</title><style>'+CSS+'</style></head><body>'
 '<div class="toolbar"><b>Monthly Plan guide</b><span>Hover a picture to swap in your own screenshot · print or save as PDF (Letter, margins none, background graphics on)</span>'
 '<button onclick="MPSwap.toggle(this)">🖼 Replace images: ON</button><button onclick="MPSwap.reset()">Reset pictures</button>'
 '<button onclick="window.print()">Print / PDF</button></div>'
 +COVER+''.join(PAGES)+'<script>'+SWAP_JS+'</script></body></html>')
io.open('listing-kit/Monthly_Plan_Guide.html','w',encoding='utf-8').write(HTML)
print('pages',1+len(PAGES),'bytes',len(HTML))
