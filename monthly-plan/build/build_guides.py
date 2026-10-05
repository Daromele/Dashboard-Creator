"""Buyer guides (US Letter, print to PDF) for the app editions, in the Monthly Plan guide's style.

usage: python3 build/build_guides.py [autopilot|debt ...]     (from monthly-plan/)
Writes listing/<dir>/<Product>_Guide.html; build/guide_pdf.js turns each into a PDF.
Screenshots come from listing/<dir>/shots (the deck captures).
"""
import base64, io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKILL = os.path.join(ROOT, '..', '.claude', 'skills', 'html-app-mockup-deck', 'assets')
FONTS = io.open(os.path.join(SKILL, 'fonts.css'), encoding='utf-8').read()
SWAP_JS = io.open(os.path.join(SKILL, 'swap.js'), encoding='utf-8').read()
SWAP_CSS = io.open(os.path.join(SKILL, 'swap.css'), encoding='utf-8').read()

CSS = """
@page{size:8.5in 11in;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#9aa0a6}
body{font-family:"Montserrat",-apple-system,Helvetica,Arial,sans-serif;color:var(--ink);font-size:10.5pt;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:8.5in;height:11in;position:relative;overflow:hidden;background:var(--page);padding:.62in .7in .9in;margin:0 auto .25in;break-after:page;page-break-after:always}
.page:last-child{break-after:auto;page-break-after:auto}
@media print{html,body{background:none}.page{margin:0}.toolbar{display:none !important}}
.mark{width:.46in;height:.46in;border-radius:.1in;background:var(--bold);color:var(--pop);display:grid;place-items:center;font-family:"Playfair Display",Georgia,serif;font-weight:800;font-size:16pt;line-height:1}
.top{display:flex;align-items:flex-start;gap:.2in}
.top .label{font-size:8pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--bold);padding-top:.06in}
h1{font-family:"Playfair Display",Georgia,serif;font-weight:800;font-size:27pt;line-height:1.12;color:var(--bold);letter-spacing:-.01em;margin:.36in 0 .12in}
.lede{font-size:11pt;color:var(--ink2);margin-bottom:.2in}
h2{font-size:14pt;font-weight:600;color:var(--bold);margin:.2in 0 .08in}
p{margin:0 0 .09in}
b{font-weight:700;color:var(--bold)}
ol,ul{margin:0 0 .1in .2in}
li{margin-bottom:.03in}
.box{background:var(--soft);border-radius:.14in;padding:.17in .22in;margin:.14in 0}
.box.warm{background:var(--warm);border:1px solid var(--warmline)}
.box.green{background:var(--green);border:1px solid var(--greenline)}
.box h3{font-size:10.5pt;font-weight:700;color:var(--bold);margin-bottom:.05in}
.box p:last-child,.box ul:last-child{margin-bottom:0}
.shot{border-radius:.1in;overflow:hidden;border:1px solid var(--rule);box-shadow:0 6px 18px rgba(20,30,40,.12);margin:.1in 0 .06in;background:#fff}
.shot img{display:block;width:100%;height:auto}
.cap{font-size:8.5pt;color:var(--ink3);margin-bottom:.12in}
table{width:100%;border-collapse:collapse;margin:.08in 0 .12in;font-size:9.5pt}
th{text-align:left;font-size:7.5pt;letter-spacing:.09em;text-transform:uppercase;color:var(--ink3);font-weight:700;padding:.06in .1in .06in 0;border-bottom:1.5px solid var(--rule)}
td{padding:.07in .12in .07in 0;border-bottom:1px solid var(--rule);vertical-align:top}
td:first-child{font-weight:700;color:var(--bold);width:1.75in}
.two{display:grid;grid-template-columns:1fr 1fr;gap:.14in}
.two .box{margin:0}
.foot{position:absolute;left:.7in;right:.7in;bottom:.42in;border-top:1px solid var(--rule);padding-top:.1in;display:flex;justify-content:space-between;font-size:7pt;letter-spacing:.03em;color:var(--ink3);text-transform:uppercase}
.foot .n{color:var(--accent);font-size:8pt;font-weight:700}
.cover{background:var(--bold);color:#fff;padding:.72in .7in}
.cover .mark{width:.62in;height:.62in;font-size:22pt;background:var(--pop);color:var(--bold)}
.cover .kicker{font-size:10pt;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--pop);margin:.48in 0 .16in}
.cover .title{font-family:"Playfair Display",Georgia,serif;font-weight:800;font-size:44pt;line-height:1.08;color:#fff}
.cover .tag{font-family:"Playfair Display",Georgia,serif;font-weight:700;font-size:19pt;color:var(--pop);margin:.16in 0 .14in}
.cover .intro{font-size:12pt;color:rgba(255,255,255,.82);line-height:1.5;max-width:5.3in}
.cover .shot{margin:.42in .1in 0;border:0;box-shadow:0 18px 44px rgba(0,0,0,.45)}
.cover .strap{position:absolute;left:.7in;bottom:1.05in;font-size:9pt;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--pop)}
.cover .ver{position:absolute;left:.7in;bottom:.5in;font-size:8pt;color:rgba(255,255,255,.55);letter-spacing:.04em}
.toolbar{position:sticky;top:0;z-index:9;max-width:8.5in;margin:0 auto .2in;background:#1f2328;color:#fff;border-radius:0 0 10px 10px;padding:10px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:12px}
.toolbar b{color:var(--pop)}
.toolbar button{background:#3a4048;color:#fff;border:0;border-radius:7px;padding:6px 11px;font-size:12px;cursor:pointer}
"""


def build(P):
    d = os.path.join(ROOT, 'listing', P['dir'])
    shots = os.path.join(d, 'shots')

    def img(name, key, alt=''):
        with open(os.path.join(shots, name), 'rb') as f:
            b = base64.b64encode(f.read()).decode()
        return f'<img data-img="{key}" src="data:image/jpeg;base64,{b}" alt="{alt}">'

    def shot(name, key, alt):
        return f'<div class="shot">{img(name, key, alt)}</div>'

    pages = []
    for n, (label, inner) in enumerate(P['pages'](shot), start=2):
        pages.append(f'<section class="page"><div class="top"><div class="mark">{P["mark"]}</div><div class="label">{label}</div></div>{inner}'
                     f'<div class="foot"><span>{P["name"]} | JPS Digital Pages</span><span class="n">{n}</span></div></section>')
    c = P['cover']
    cover = (f'<section class="page cover"><div class="mark">{P["mark"]}</div><div class="kicker">{c["kicker"]}</div>'
             f'<div class="title">{P["name"]}</div><div class="tag">{c["tag"]}</div><div class="intro">{c["intro"]}</div>'
             f'{shot(c["image"], "guide-cover", P["name"])}<div class="strap">One file · Works offline · Your own backups</div>'
             f'<div class="ver">JPS DIGITAL PAGES | v{P["version"]}</div></section>')
    v = P['colors']
    root = ':root{' + ';'.join(f'--{k}:{x}' for k, x in v.items()) + '}'
    swap_js = SWAP_JS.replace("var KEY='mp-kit-img:'", f"var KEY='{P['storage']}'")
    html = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + P['name'] + ' · Guide</title><style>' + FONTS + root + CSS + SWAP_CSS + '</style></head><body>'
            '<div class="toolbar"><b>' + P['name'] + ' guide</b><span>Print or save as PDF: Letter, margins none, background graphics on</span>'
            '<button onclick="MPSwap.toggle(this)">Replace images: ON</button><button onclick="MPSwap.reset()">Reset pictures</button>'
            '<button onclick="window.print()">Print / PDF</button></div>' + cover + ''.join(pages) + '<script>' + swap_js + '</script></body></html>')
    out = os.path.join(d, P['file'] + '_Guide.html')
    io.open(out, 'w', encoding='utf-8').write(html)
    print('wrote', out, 'pages', 1 + len(pages))


SAFE = lambda thing, files: f'''<h1>Keeping your {thing} safe.</h1>
<p class="lede"><b>Everything lives in your browser, on your device.</b> Nothing is sent anywhere, there is no account, and nobody else holds a copy, including us.</p>
<div class="box warm"><h3>Your entries live in browser storage: please read</h3><ul>
<li>Everything you enter or import is saved automatically in that browser's local storage.</li>
<li>Clearing your cache, history or site data will permanently delete it.</li>
<li>It does not carry across browsers: data added in Chrome will not appear in Safari.</li>
<li>The HTML file does not contain your entries. Copying the file does not copy your data.</li></ul></div>
<h2>Do one of these. Ideally both.</h2>
<div class="box green"><h3>Download backup: every browser</h3><p>Settings &amp; backup → <b>Download backup</b>. One JSON file holding {files}. <b>Restore backup</b> brings it back on any computer. The app reminds you when a backup is due.</p></div>
<div class="box"><h3>Daily folder backup: Chrome or Edge</h3><p>Choose a synced folder once (iCloud Drive, Dropbox, OneDrive, Google Drive) and a dated copy is written each day you make changes. Safari and Firefox do not offer this; use Download backup instead.</p></div>
<h2>Moving to another computer</h2>
<p>Copy the HTML file and your latest backup across, open the file, then Settings &amp; backup → <b>Restore backup</b>.</p>'''


def start_here(P, setup, sample):
    return f'''<h1>What you downloaded.</h1>
<p class="lede">Read this page first. The rest is here whenever you need it.</p>
<table><tr><th>File</th><th>What it is</th></tr>
<tr><td>{P['html']}</td><td>The whole app, in one file. This is the product.</td></tr>
<tr><td>{P['file']}_Guide.pdf</td><td>This guide.</td></tr>
<tr><td>START_HERE.txt</td><td>The short version of this page.</td></tr>
<tr><td>LICENCE.txt</td><td>What you may and may not do with the file.</td></tr></table>
<p>The HTML file is not a document that opens an app: it <b>is</b> the app. The code, fonts and charts are all inside it, and nothing is downloaded when you use it.</p>
<h2>Setting up: about ten minutes</h2>
<ol><li><b>Extract the ZIP</b> into a folder you will find again. A synced folder (iCloud Drive, Dropbox, OneDrive, Google Drive) is ideal.</li>
<li><b>Double-click {P['html']}.</b> It opens in Chrome, Edge, Safari or Firefox like a web page, and works offline from then on.</li>
<li><b>Take the welcome tour.</b> A few short slides on {P['tour']}.</li>
{setup}
<li><b>Download a backup</b> from Settings &amp; backup. Page {P['safe_page']} explains why it matters more than anything else here.</li></ol>
<div class="box"><h3>Want to look around first?</h3><p>{sample}</p></div>'''


def help_page(P, rows):
    return f'''<h1>A few useful fixes.</h1>
<table><tr><th>What you see</th><th>What to do</th></tr>
<tr><td>It opens as code, not an app</td><td>Extract the ZIP first, then right-click the file → Open with → your browser.</td></tr>
<tr><td>My numbers are gone</td><td>Check it is the same browser and profile you used before. Otherwise, Restore backup.</td></tr>
{rows}
<tr><td>Folder backup unavailable</td><td>Use Chrome or Edge on a computer, or Download backup instead.</td></tr>
<tr><td>The currency is wrong</td><td>Settings &amp; backup → Currency, or type your own symbol. Amounts are not converted.</td></tr>
<tr><td>I want the tour again</td><td>Settings &amp; backup → Welcome tour → Show tour.</td></tr></table>
<h2>We can help</h2>
<p>For order support, message <b>JPS Digital Pages</b> through Etsy or email <b>hello@jpsdigitalpages.com</b>. Website: www.jpsdigitalpages.com</p>
<div class="box"><h3>Thank you</h3><p>If {P['name']} earns its place, a review genuinely helps a small shop. And if it does not, tell us before you leave one: most things are fixable.</p></div>
<p style="font-size:8.5pt;color:var(--ink3)">© 2026 JPS Digital Pages · Personal use by one household. {P['name']} is not financial advice. See LICENCE.txt.</p>'''


AUTOPILOT = dict(
    dir='money-autopilot', file='Money_Autopilot', name='Money Autopilot', html='MoneyAutopilot.html', mark='A', version='1.0',
    storage='ma-guide-img:', tour='adding statements, what gets counted, and backups', safe_page=9,
    colors=dict(bold='#1C3C52', accent='#2C5470', pop='#F0A93C', page='#F6F8FA', ink='#1D2733', ink2='#55606B', ink3='#88929C',
                rule='#D9E0E6', soft='#E8EEF3', warm='#FBF1E3', warmline='#EED7B5', green='#E6F1EA', greenline='#BFDCCB'),
    cover=dict(kicker='Your hands-off guide', tag='Statements in. Money sorted.', image='tab-dashboard.jpg',
               intro='A money tracker in one file. Drop in your bank and card downloads and see where every dollar went, without typing a single purchase.'),
)


def autopilot_pages(shot):
    P = AUTOPILOT
    return [
        ('Start here', start_here(P, '<li><b>Add your first statements</b> on Add statements: last month from every card and bank, all at once.</li>',
                                  'Choose <b>Explore sample data</b> on the welcome screen or in Settings &amp; backup. A fictional household fills every screen, in a separate session. <b>Return to my money</b> brings back your own figures, untouched.')),
        ('The idea', f'''<h1>Where it went, without typing.</h1>
<p class="lede">Money Autopilot answers one question first: how much did you keep this month?</p>
{shot("tab-dashboard.jpg", "guide-dashboard", "Money picture")}
<p class="cap">The Money picture. <b>Kept</b> is money in less spending, for the month you choose at the top.</p>
<table><tr><th>Word</th><th>What it means</th></tr>
<tr><td>Money in</td><td>Paychecks and other income.</td></tr>
<tr><td>Spending</td><td>Everything that left, less refunds.</td></tr>
<tr><td>Kept</td><td>Money in − spending.</td></tr>
<tr><td>Not counted</td><td>Card payments and transfers between your own accounts. The purchases were already counted once.</td></tr></table>'''),
        ('Add statements', f'''<h1>Three steps. Then it runs itself.</h1>
<p class="lede">Download, drop in, glance. Next month takes about two minutes.</p>
{shot("tab-import.jpg", "guide-import", "Add statements")}
<ol><li><b>Download.</b> Sign in to each bank or card website, open the account, and choose <b>Download</b> or <b>Export</b> on the transactions list. Pick <b>CSV</b> (sometimes “Spreadsheet” or “Comma delimited”) and a date range.</li>
<li><b>Drop them in.</b> All files at once on <b>Add statements</b>. Each line is read, the merchant name cleaned up, sorted into a category, and card payments and transfers are paired.</li>
<li><b>Glance.</b> Clear the few in <b>Needs a look</b>, then read your money picture.</li></ol>
<div class="two"><div class="box"><h3>Overlaps are safe</h3><p>Transactions already in the app are skipped, even when two statements overlap by a few days. Two identical purchases on the same day in one file are both kept.</p></div>
<div class="box warm"><h3>CSV, not PDF</h3><p>PDF statements can't be read. Almost every US bank, card, PayPal and Venmo offers a CSV download.</p></div></div>'''),
        ('Sorting', f'''<h1>It learns from you.</h1>
<p class="lede">Change a category once and the app remembers it for that place from then on.</p>
{shot("tab-activity.jpg", "guide-activity", "Transactions")}
<p class="cap">Transactions. Search, filter by account, category or type, and sort any column.</p>
<table>
<tr><td>Something's in the wrong category</td><td>Change it on the transaction. You're asked whether to change the others from the same place and remember it. Your choice always wins over the built-in list.</td></tr>
<tr><td>Needs a look</td><td>The few it couldn't place wait here. Pick a category; it learns.</td></tr>
<tr><td>Accounts</td><td>Each file becomes an account. Rename it, set its type (checking, card, savings…) or archive one you've closed. The type decides how money in and out is read.</td></tr>
<tr><td>Statements folder</td><td>Chrome and Edge: point it at your downloads folder on Add statements and new statement files come in by themselves each time you open the app.</td></tr></table>
<p>Long card and account numbers are hidden as soon as a file is read. Only the last four digits are kept.</p>'''),
        ('Getting around', '''<h1>The screens.</h1>
<p class="lede">The main screens are on from the start. Switch the rest on in Settings &amp; backup → <b>Simplify your sidebar</b>.</p>
<table><tr><th>Screen</th><th>What it is for</th></tr>
<tr><td>Money picture</td><td>Money in, spending, saved and kept, where it went and where it came from.</td></tr>
<tr><td>Transactions</td><td>Every line from every statement, searchable and filterable.</td></tr>
<tr><td>Subscriptions &amp; bills</td><td>Everything that repeats, its monthly and yearly cost, and the next date.</td></tr>
<tr><td>Year at a glance</td><td>Averages, best and worst months, category trends. Year over year beside it.</td></tr>
<tr><td>Cut back</td><td>Pick what to cancel or trim and see what it adds up to in a year.</td></tr>
<tr><td>Net worth</td><td>Checking, savings, brokerage and retirement, less cards and loans.</td></tr>
<tr><td>Insights</td><td>What changed: categories above your usual, price increases, new places, fees.</td></tr>
<tr><td>Paychecks</td><td>Gross pay, taxes and 401(k) from your pay stub (optional).</td></tr>
<tr><td>Add statements · Needs a look · Accounts</td><td>The Autopilot: files in, the few it's unsure of, and your accounts.</td></tr>
<tr><td>Plan (optional)</td><td>Spending limits, savings goals, reminders, a calendar, monthly snapshots and a weekly review.</td></tr>
<tr><td>Settings &amp; backup</td><td>Name, currency, date format, 8 themes, your sidebar, backups.</td></tr></table>
<p>Every screen prints cleanly. Every table sorts, searches and filters.</p>'''),
        ('Subscriptions', f'''<h1>What repeats, and what to cut.</h1>
<p class="lede">Subscriptions and bills are found by themselves from your transactions. Nothing to set up.</p>
{shot("tab-recurring.jpg", "guide-recurring", "Subscriptions & bills")}
<p class="cap">Every repeating charge, what it costs a month and a year, and the date it lands next. A price increase is flagged.</p>
<div class="two"><div class="box"><h3>Cut back</h3><p>Ideas come from your own spending: a subscription, a category running above your usual. Apply one and see the monthly and yearly total, and what it grows to if you invest it.</p></div>
<div class="box"><h3>Insights</h3><p>Categories higher or lower than your usual month, new places you spent at, your biggest purchases, fees and interest, and the charges coming up in the next three weeks.</p></div></div>'''),
        ('Net worth', f'''<h1>The rest of the picture.</h1>
<p class="lede">Savings, investments, cards and loans: what you own less what you owe.</p>
{shot("tab-invest.jpg", "guide-invest", "Net worth")}
<table>
<tr><td>Savings accounts</td><td>Drop their transactions CSV in like checking. Money moved there from checking counts as <b>saved</b>, not spent.</td></tr>
<tr><td>Brokerage and retirement</td><td>From Fidelity, Vanguard, Schwab and others, the <b>positions</b> or <b>holdings</b> download gives each account's balance; the <b>activity</b> download adds contributions.</td></tr>
<tr><td>Card balances</td><td>Card downloads don't include the balance. Type what you owe once with <b>Enter balance</b>; every statement after that keeps it current.</td></tr>
<tr><td>Paychecks</td><td>Your bank only sees take-home pay. Switch on Paychecks, enter one recent pay stub per employer, and every paycheck is broken down by itself.</td></tr></table>'''),
        ('Read this one', SAFE('money', 'every account, transaction, category and setting')),
        ('When you need help', help_page(P, '''<tr><td>A file wasn't recognized</td><td>Check it is the CSV download, not a PDF. On Add statements, <b>Map a file by hand</b> reads any CSV.</td></tr>
<tr><td>Spending looks doubled</td><td>Add the checking account's file too, so card payments can be paired. Check each account's type on Accounts.</td></tr>
<tr><td>A category is wrong</td><td>Change it on the transaction and choose to remember it.</td></tr>
<tr><td>Net worth looks off</td><td>Enter each card's balance once, and add the holdings download for investment accounts.</td></tr>''')),
    ]


DEBT = dict(
    dir='debt-free-plan', file='Debt_Free_Plan', name='Debt Free Plan', html='DebtFreePlan.html', mark='D', version='1.0',
    storage='dfp-guide-img:', tour='adding debts, your plan, logging payments and backups', safe_page=9,
    colors=dict(bold='#1F4A3E', accent='#2F5D50', pop='#F2B441', page='#FAFAF8', ink='#1F2A26', ink2='#56635D', ink3='#8A958F',
                rule='#DCE3DF', soft='#E8EFEB', warm='#FBF1E3', warmline='#EED7B5', green='#E4F1EA', greenline='#BCDCC9'),
    cover=dict(kicker='Your way-out guide', tag='See the month you’re debt free.', image='tab-dashboard.jpg',
               intro='A debt payoff tracker in one file. Add your debts once, pick a strategy, and watch every balance fall to the month you’re free.'),
)


def debt_pages(shot):
    P = DEBT
    return [
        ('Start here', start_here(P, '<li><b>Add every debt</b> on My debts, then set your monthly budget when asked.</li>',
                                  'Choose <b>Explore sample data</b> on the welcome screen or in Settings &amp; backup. Six fictional debts fill every screen, in a separate session. <b>Return to my debts</b> brings back your own, untouched.')),
        ('The idea', f'''<h1>One date to aim for.</h1>
<p class="lede">Debt Free Plan answers one question first: when will the last debt reach zero?</p>
{shot("tab-dashboard.jpg", "guide-dashboard", "Debt freedom")}
<p class="cap">Debt freedom. Your debt-free date, total owed, paid so far, and the interest still ahead of you.</p>
<table><tr><th>Word</th><th>What it means</th></tr>
<tr><td>Minimum</td><td>What each lender requires every month.</td></tr>
<tr><td>Extra</td><td>Your monthly budget above all the minimums. It goes to one target debt at a time.</td></tr>
<tr><td>Rollover</td><td>When a debt is cleared, its payment moves to the next one.</td></tr>
<tr><td>Debt-free date</td><td>The month the last debt reaches zero.</td></tr></table>'''),
        ('Your debts', f'''<h1>List every debt once.</h1>
<p class="lede">My debts → <b>Add a debt</b>. Or import your card and loan downloads (page 6).</p>
{shot("tab-debts.jpg", "guide-debts", "My debts")}
<table>
<tr><td>What to enter</td><td>Balance, interest rate (APR), minimum payment and due day. Lender and category are optional; amounts like $5,000 are fine.</td></tr>
<tr><td>Card minimums</td><td>Choose <b>Card style</b> for a credit card: 1% of the balance plus that month's interest, never below what you enter. It falls as the balance falls.</td></tr>
<tr><td>0% promos</td><td>Enter the promo rate and its end month. The standard rate starts on time.</td></tr>
<tr><td>Status</td><td><b>Active</b> and <b>Hardship plan</b> debts are in the plan. <b>Paused</b>, <b>In collections</b> and <b>In dispute</b> stay in your total owed but out of the plan and the debt-free date.</td></tr>
<tr><td>Cards or table</td><td>Switch with Grid and Table. Filter by category; edit categories in Settings.</td></tr></table>'''),
        ('Your plan', f'''<h1>Pick a strategy. Watch it move.</h1>
<p class="lede">Payoff plan: set your monthly budget and choose how the extra money is aimed.</p>
{shot("tab-plan.jpg", "guide-plan", "Payoff plan")}
<table><tr><th>Strategy</th><th>How it works</th></tr>
<tr><td>Avalanche</td><td>Highest interest rate first. It costs the least.</td></tr>
<tr><td>Snowball</td><td>Smallest balance first. You see debts disappear sooner.</td></tr>
<tr><td>Cash flow</td><td>Clears the debt that frees the most monthly minimum for its size.</td></tr>
<tr><td>Credit score</td><td>Pays down the cards closest to their limit first.</td></tr>
<tr><td>Your order</td><td>Follows the order you set.</td></tr></table>
<p>Slide the budget, or tap +$50, +$100, +$250: the debt-free date, interest and every chart follow along.</p>'''),
        ('Paying', f'''<h1>Log it. Or import it.</h1>
<p class="lede">Balances update from the payments you record, and from your statements.</p>
{shot("tab-payments.jpg", "guide-payments", "Payments")}
<div class="two"><div class="box"><h3>Logging payments</h3><p>On Debt freedom, <b>Pay this month</b> lists every payment and its due date. Log one, or <b>Log all as paid</b> in one click. Each debt's history icon shows every payment, charge and interest line.</p></div>
<div class="box"><h3>Importing statements</h3><p>On <b>Import statements</b>, drop the CSV, OFX or QFX files from a card, loan or checking account. Payments, charges and real interest are matched to each debt, and duplicates are skipped.</p></div></div>
<div class="box warm"><h3>How interest is worked out</h3><p>Each month a debt is charged its APR ÷ 12 on the balance, like a card statement. Lenders charge daily, so a statement can differ by a few cents. When a statement arrives, use <b>Update balance</b>; the estimate restarts from there.</p></div>'''),
        ('Trying ideas', f'''<h1>Try it before you do it.</h1>
<p class="lede">What if and Progress: test a change, then watch the real thing happen.</p>
{shot("tab-whatif.jpg", "guide-whatif", "What if")}
<table>
<tr><td>What if</td><td>An extra payment each month, a one-off payment (a tax refund, a bonus), a lower rate, a balance transfer with its fee, a consolidation loan, or “debt free by” a date you choose. Nothing changes until you apply it.</td></tr>
<tr><td>Progress</td><td>The coloring chart: one bubble for every step paid off. Print it for the fridge. Milestones at 10%, a quarter, half and more.</td></tr>
<tr><td>Due dates</td><td>Each payment on the day it lands, with what your plan sends.</td></tr>
<tr><td>Find extra money</td><td>An optional budget and cut-back ideas to grow your monthly payment (switch on in Settings).</td></tr></table>'''),
        ('Getting around', '''<h1>The screens.</h1>
<p class="lede">Turn off any you don't use in Settings &amp; backup → <b>Simplify your sidebar</b>.</p>
<table><tr><th>Screen</th><th>What it is for</th></tr>
<tr><td>Debt freedom</td><td>Your debt-free date, what to pay this month, what's next, and warnings.</td></tr>
<tr><td>My debts</td><td>Every debt as a card or a table, with its status and category.</td></tr>
<tr><td>Import statements</td><td>Card, loan and bank downloads matched to your debts.</td></tr>
<tr><td>Payoff plan</td><td>Budget, strategy, the month-by-month schedule and all five strategies compared.</td></tr>
<tr><td>Payments</td><td>Every payment, charge, interest line and statement balance. Export as CSV.</td></tr>
<tr><td>What if</td><td>Test changes without touching your plan.</td></tr>
<tr><td>Progress</td><td>Coloring chart, milestones and each debt colored in.</td></tr>
<tr><td>Due dates</td><td>The month's payments on a calendar.</td></tr>
<tr><td>Find extra money</td><td>Monthly budget, transactions and cut-back ideas (optional).</td></tr>
<tr><td>Settings &amp; backup</td><td>Name, currency, 8 themes, debt categories, your sidebar, backups.</td></tr></table>
<div class="box warm"><h3>Warnings to watch for</h3><p>A balance that's growing (the payment doesn't cover the interest), a promo rate ending soon, or a card at its limit. They appear on Debt freedom.</p></div>'''),
        ('Read this one', SAFE('plan', 'every debt, payment, category and your plan')),
        ('When you need help', help_page(P, '''<tr><td>The budget is below the minimums</td><td>Raise it to at least the minimums total, or mark a debt Paused if you aren't paying it now.</td></tr>
<tr><td>A balance doesn't match my statement</td><td>Use Update balance on that debt, or import the statement to bring in the real interest.</td></tr>
<tr><td>“Every line is from before you added…”</td><td>The file is older than the balance you entered, so those lines are already in it. Import a newer download.</td></tr>
<tr><td>A debt shows as growing</td><td>The payment doesn't cover its monthly interest. Raise its payment or your budget.</td></tr>''')),
    ]


AUTOPILOT['pages'] = autopilot_pages
DEBT['pages'] = debt_pages

if __name__ == '__main__':
    which = sys.argv[1:] or ['autopilot', 'debt']
    for w in which:
        build({'autopilot': AUTOPILOT, 'debt': DEBT}[w])
