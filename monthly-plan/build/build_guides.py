"""Buyer guides (US Letter, print to PDF) for the app editions, in the Monthly Plan guide's style.

usage: python3 build/build_guides.py [tracker|debt ...]     (from monthly-plan/)
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
    dir='income-expense-tracker', file='Income_Expense_Tracker', name='Income and Expense Tracker', html='IncomeExpenseTracker.html', mark='I', version='1.0',
    storage='iet-guide-img:', tour='adding statements, what gets counted, and backups', safe_page=9,
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
<p class="lede">Income and Expense Tracker answers one question first: how much did you keep this month?</p>
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
<tr><td>Add statements · Needs a look · Accounts</td><td>Statements: files in, the few it's unsure of, and your accounts.</td></tr>
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



BILLS = dict(
    dir='bill-subscription-tracker', file='Bill_Subscription_Tracker', name='Bill & Subscription Tracker', html='BillSubscriptionTracker.html', mark='B', version='1.0',
    storage='bst-guide-img:', tour='adding bills, ticking them off, renewals and backups', safe_page=9,
    colors=dict(bold='#63304A', accent='#7C3560', pop='#E9A85C', page='#FBF6F8', ink='#2A1622', ink2='#5E4A57', ink3='#94818D',
                rule='#EADBE2', soft='#F4E8EE', warm='#FBF1E3', warmline='#EED7B5', green='#E6F1EA', greenline='#BFDCCB'),
    cover=dict(kicker='Your never-late guide', tag='Never miss a due date.', image='tab-dashboard.jpg',
               intro='Every bill and subscription in one file: what’s due, what’s paid, what renews next, and what it all costs a year.'),
)


def bills_pages(shot):
    P = BILLS
    return [
        ('Start here', start_here(P, '<li><b>Add your bills</b>: rent, utilities, insurance, phone, streaming. The usual ones are one click away on an empty app.</li>',
                                  'Choose <b>Explore sample data</b> on the welcome screen or in Settings &amp; backup. A fictional household’s 19 bills fill every screen, in a separate session. <b>Return to my bills</b> brings back your own, untouched.')),
        ('The idea', f'''<h1>What’s left to pay, at a glance.</h1>
<p class="lede">Bill &amp; Subscription Tracker answers one question first: how much is still to pay this month?</p>
{shot("tab-dashboard.jpg", "guide-dashboard", "This month")}
<p class="cap">This month. The big number is what you haven’t ticked off yet; the ring shows what your bills cost a month, by category.</p>
<table><tr><th>Word</th><th>What it means</th></tr>
<tr><td>Every month</td><td>All your bills averaged to one month: a yearly $120 bill counts as $10.</td></tr>
<tr><td>Left to pay</td><td>This month’s bills not ticked off yet.</td></tr>
<tr><td>Autopay</td><td>Counts as paid on its due day, without a tick.</td></tr>
<tr><td>Set aside</td><td>Your yearly and quarterly bills ÷ 12: save this each month and they never surprise you.</td></tr></table>'''),
        ('Adding bills', '''<h1>Add each bill once.</h1>
<p class="lede">Bills &amp; subscriptions → <b>Add a bill</b>. Every later due date follows from the one you enter.</p>
<table><tr><th>Field</th><th>What to enter</th></tr>
<tr><td>Name and amount</td><td>“Electric”, “Netflix”. Amounts like $1,450 or 15.49 are fine.</td></tr>
<tr><td>Bill or subscription</td><td>Subscriptions are counted apart, so you can see what they add up to.</td></tr>
<tr><td>How often</td><td>Every week, 2 weeks, month, 2 months, 3 months, 6 months, year, or once. A bill on the 31st falls on the last day of shorter months.</td></tr>
<tr><td>Next due date</td><td>The next time it’s due. The calendar fills in from there.</td></tr>
<tr><td>On autopay</td><td>It ticks itself on its due day.</td></tr>
<tr><td>The amount changes</td><td>For electric or water: you’re asked what you really paid when you tick it.</td></tr>
<tr><td>Free trial ends</td><td>Nothing is due until then; the first charge is that day. You’re warned a week before.</td></tr>
<tr><td>Remind me to cancel by</td><td>Any bill can have a reminder date.</td></tr>
<tr><td>Pays from, website, notes</td><td>Optional: which card or account, the login page, an account number ending.</td></tr></table>
<div class="box"><h3>Price went up?</h3><p>Edit the bill, type the new amount and the date it starts. Past months keep the old price, and the rise shows on Renewals &amp; trials.</p></div>'''),
        ('Each month', f'''<h1>Tick them off.</h1>
<p class="lede">This month lists every bill due, oldest first. Tick each one as you pay it.</p>
{shot("tab-checklist.jpg", "guide-checklist", "Tick-off list")}
<div class="two"><div class="box"><h3>Needs your attention</h3><p>Overdue bills, bills due today, trials ending, cancel-by reminders and price rises appear at the top of This month, each with its button.</p></div>
<div class="box"><h3>Skip, pause, cancel</h3><p>Open a bill’s payment to <b>Skip this one</b> (a waived fee). Set a bill to Paused or Cancelled with a date: nothing is due after it, and cancelled ones count what you save.</p></div></div>
<p>Ticked something by mistake? Tick it again to take it back, or use Undo on the message at the bottom.</p>'''),
        ('Looking ahead', f'''<h1>Every due date, and the year.</h1>
<p class="lede">The Calendar shows the month; Yearly cost shows the whole year.</p>
{shot("tab-billcal.jpg", "guide-calendar", "Calendar")}
<table>
<tr><td>Calendar</td><td>Each bill on its due day: ○ to pay, ✓ paid, ! overdue, ★ a trial ending or a reminder. Click a bill to tick it.</td></tr>
<tr><td>Yearly cost</td><td>What each month of the year costs, the heavier months (when yearly bills land), and every bill’s share of the year.</td></tr>
<tr><td>Set aside for the big ones</td><td>On This month: what to save each month for yearly and quarterly bills.</td></tr></table>'''),
        ('Keep or cancel', f'''<h1>Catch it before it charges.</h1>
<p class="lede">Renewals &amp; trials: free trials, yearly renewals and price rises, before they hit your account.</p>
{shot("tab-renewals.jpg", "guide-renewals", "Renewals & trials")}
<table>
<tr><td>Free trials</td><td>Days left, and the price after. <b>Keep</b> silences the warning; <b>Cancel</b> marks it cancelled.</td></tr>
<tr><td>Review your subscriptions</td><td>Most expensive first, with each one’s share and last price change. <b>Remind me</b> sets a cancel-by date.</td></tr>
<tr><td>Cancelled, and what it’s saved</td><td>Every payment you no longer make, added up.</td></tr></table>
<p>Cancelling here only updates the app. Remember to cancel with the company too: the bill’s website link is one click away.</p>'''),
        ('Getting around', '''<h1>The screens.</h1>
<p class="lede">Turn off any you don't use in Settings &amp; backup → <b>Simplify your sidebar</b>.</p>
<table><tr><th>Screen</th><th>What it is for</th></tr>
<tr><td>This month</td><td>What’s left to pay, what needs attention, the tick-off list and the next two weeks.</td></tr>
<tr><td>Bills &amp; subscriptions</td><td>Every bill as a card or a table; filter by status, type and category.</td></tr>
<tr><td>Calendar</td><td>The month’s due dates; click to tick.</td></tr>
<tr><td>Renewals &amp; trials</td><td>Trials, reminders, renewals, price rises, and what cancelling saved.</td></tr>
<tr><td>Yearly cost</td><td>The year month by month, and every bill’s share. Export as CSV.</td></tr>
<tr><td>Payment history</td><td>What you paid and when, on time or late. Export as CSV.</td></tr>
<tr><td>Settings &amp; backup</td><td>Name, currency, 8 themes, bill categories, your sidebar, backups.</td></tr></table>
<p>Every table sorts, searches and filters. Every screen prints.</p>'''),
        ('Read this one', SAFE('bills', 'every bill, subscription, payment and category')),
        ('When you need help', help_page(P, '''<tr><td>A bill shows on the wrong day</td><td>Edit it and set the first due date; every later date follows from it.</td></tr>
<tr><td>An autopay bill didn’t go through</td><td>Click its tick to take it back, then mark it paid when it does.</td></tr>
<tr><td>A trial shows a charge</td><td>Check the trial end date on the bill. The first charge is due that day.</td></tr>
<tr><td>Last month’s numbers changed</td><td>A new price needs a start date; otherwise it applies from the first due date.</td></tr>''')),
    ]


NETWORTH = dict(
    dir='net-worth-fire-tracker', file='Net_Worth_FIRE_Tracker', name='Net Worth & FIRE Tracker', html='NetWorthFireTracker.html', mark='N', version='1.0',
    storage='nwf-guide-img:', tour='adding accounts, the monthly check-in, your FIRE number and backups', safe_page=9,
    colors=dict(bold='#16362F', accent='#1F6F5C', pop='#E8B04B', page='#F7F8F6', ink='#10241F', ink2='#4C5E58', ink3='#86948F',
                rule='#DCE3E0', soft='#E8EFEC', warm='#FBF1E3', warmline='#EED7B5', green='#E6F1EA', greenline='#BFDCCB'),
    cover=dict(kicker='Your road-to-FI guide', tag='Watch your money grow.', image='tab-dashboard.jpg',
               intro='Everything you own and owe in one number, a two-minute check-in each month, and the year you could be financially independent.'),
)


def networth_pages(shot):
    P = NETWORTH
    return [
        ('Start here', start_here(P, '<li><b>Add your accounts</b> with today’s balance: checking, savings, investments, retirement, your home, and what you owe. The usual ones are one click away on an empty app.</li><li><b>Set your FIRE number</b> on the FIRE plan: enter what you spend in a year.</li>',
                                  'Choose <b>Explore sample data</b> on the welcome screen or in Settings &amp; backup. A fictional household’s 13 accounts and two and a half years of check-ins fill every screen, in a separate session. <b>Return to my accounts</b> brings back your own, untouched.')),
        ('The idea', f'''<h1>One number that counts.</h1>
<p class="lede">Net worth is everything you own minus everything you owe. Watch it once a month and it tells you if you’re moving in the right direction.</p>
{shot("tab-dashboard.jpg", "guide-dashboard", "Net worth")}
<p class="cap">Net worth. The big number, what moved since last month, and how far along you are to your FIRE number; the ring shows where what you own sits.</p>
<table><tr><th>Word</th><th>What it means</th></tr>
<tr><td>Net worth</td><td>What you own minus what you owe.</td></tr>
<tr><td>Toward FI</td><td>Invested money that can pay for your life one day: investments, retirement accounts, an HSA, crypto.</td></tr>
<tr><td>FIRE number</td><td>A year of spending ÷ your withdrawal rate. At 4% that’s 25 years of spending.</td></tr>
<tr><td>Coast FI</td><td>Enough invested that, with no more saving, it grows into your FIRE number by retirement age.</td></tr></table>'''),
        ('Adding accounts', '''<h1>Add each account once.</h1>
<p class="lede">Accounts → <b>Add an account</b>. Typing a name picks the type for you; a name like “Visa” or “Mortgage” switches to something you owe.</p>
<table><tr><th>Field</th><th>What to enter</th></tr>
<tr><td>Name</td><td>“Checking”, “401(k)”, “Mortgage”. Anything you’ll recognize.</td></tr>
<tr><td>Own or owe</td><td>Something you own (an asset) or something you owe (a debt).</td></tr>
<tr><td>Balance today</td><td>What it’s worth, or what you owe, as a positive number. $35,000 or 1,250.50 are fine.</td></tr>
<tr><td>Type</td><td>Cash, savings, investments, retirement, HSA, crypto, home, vehicle, mortgage, cards, loans. Add your own in Settings.</td></tr>
<tr><td>Counts toward FI</td><td>Ticked for investments and retirement accounts. Change it per account.</td></tr>
<tr><td>Bank, note</td><td>Optional: where it’s held, a reminder like “employer matches 4%”.</td></tr></table>
<div class="box"><h3>Your home and car</h3><p>Add them at a fair estimate if you like: they count in your net worth, but not toward FI, because you can’t live off them without selling.</p></div>
<div class="box"><h3>Found an account later?</h3><p>Leave <b>I already had this account</b> ticked and its balance counts from your first check-in, so it doesn’t show up as growth.</p></div>
<div class="box"><h3>Closing or paying off</h3><p>Edit the account and set it to <b>Closed or paid off</b> with the month. It counts as 0 from then, and keeps its history.</p></div>'''),
        ('Each month', f'''<h1>A two-minute check-in.</h1>
<p class="lede">Once a month, open <b>Monthly check-in</b>, type each balance as it is today, and save.</p>
{shot("tab-checkin.jpg", "guide-checkin", "Monthly check-in")}
<div class="two"><div class="box"><h3>Watch it as you type</h3><p>The totals at the top and each row’s change update as you type, so you see the month before you save.</p></div>
<div class="box"><h3>Missed a month?</h3><p>No problem: a month without a check-in keeps the last balances. Use the arrows to fill in an earlier month whenever you like.</p></div></div>
<p>Only one account changed? Use <b>Update balance</b> on its card instead.</p>'''),
        ('Your FIRE number', f'''<h1>How much is enough?</h1>
<p class="lede">FIRE plan → enter <b>a year of spending</b>. Everything else has a sensible default you can change.</p>
{shot("tab-fire.jpg", "guide-fire", "FIRE plan")}
<table>
<tr><td>Withdrawal rate</td><td>How much of your invested money you’d spend each year. 4% is the classic rule; 3.5% is more cautious.</td></tr>
<tr><td>Return after inflation</td><td>A steady average growth rate in today’s money. 5% is a middle-of-the-road guess.</td></tr>
<tr><td>Invested each month</td><td>Everything going into accounts that count toward FI, employer match included.</td></tr>
<tr><td>Lean, FIRE, Fat</td><td>75%, 100% and 150% of your spending, each with its own date.</td></tr></table>'''),
        ('The road there', f'''<h1>When could you stop working?</h1>
<p class="lede">The road there draws your invested money growing year by year against your FIRE number.</p>
{shot("tab-road.jpg", "guide-road", "The road there")}
<div class="two"><div class="box"><h3>What moves the date</h3><p>Spend 10% less, invest more, lower returns, a safer withdrawal rate: each one shows how much sooner or later.</p></div>
<div class="box"><h3>What if?</h3><p>Slide <b>What if you invested more each month?</b> and a second line shows the difference.</p></div></div>
<p>It’s a smooth average, not a promise: real markets go up and down. Your check-ins keep it honest.</p>'''),
        ('Getting around', '''<h1>The screens.</h1>
<p class="lede">Turn off any you don't use in Settings &amp; backup → <b>Simplify your sidebar</b>.</p>
<table><tr><th>Screen</th><th>What it is for</th></tr>
<tr><td>Net worth</td><td>The number, what moved, your chart, and your road to FI.</td></tr>
<tr><td>Accounts</td><td>Every account as a card or a table; filter by type and own or owe; update one balance.</td></tr>
<tr><td>Monthly check-in</td><td>Every balance on one screen, and every past check-in.</td></tr>
<tr><td>FIRE plan</td><td>Your number, Lean and Fat FIRE, Coast FI, what moves the date, the road there.</td></tr>
<tr><td>Milestones</td><td>$10k to $1M+, a quarter of the way, halfway, Coast FI: when you passed each, when the next comes.</td></tr>
<tr><td>History</td><td>Every month and every year’s change; one account’s history. Export as CSV.</td></tr>
<tr><td>Settings &amp; backup</td><td>Name, currency, 8 themes, account types, your sidebar, backups.</td></tr></table>
<p>Every table sorts, searches and filters. Every screen prints.</p>'''),
        ('Read this one', SAFE('numbers', 'every account, check-in, account type and your FIRE plan')),
        ('When you need help', help_page(P, '''<tr><td>My net worth jumped</td><td>Check the newest check-in for a typo: History → open the month, or the account’s own history.</td></tr>
<tr><td>Toward FI is $0</td><td>Edit your investment and retirement accounts and tick <b>Counts toward financial independence</b>.</td></tr>
<tr><td>Years to FI says “not at this rate”</td><td>Nothing is going in and nothing grows: add what you invest each month, or a return above 0%.</td></tr>
<tr><td>A debt shows as negative</td><td>Enter what you owe as a positive number on a “Something I owe” account.</td></tr>''')),
    ]


PAYCHECK = dict(
    dir='paycheck-budget-planner', file='Paycheck_Budget_Planner', name='Paycheck Budget Planner', html='PaycheckBudgetPlanner.html', mark='P', version='1.0',
    storage='pbp-guide-img:', tour='your paycheck, bills, spending money and backups', safe_page=9,
    colors=dict(bold='#45392A', accent='#6B5B45', pop='#E8A24A', page='#F7F4ED', ink='#2A2218', ink2='#5E5446', ink3='#968C7E',
                rule='#E5DED2', soft='#EFE9DF', warm='#FBF1E3', warmline='#EED7B5', green='#E6F1EA', greenline='#BFDCCB'),
    cover=dict(kicker='Your payday guide', tag='Budget by paycheck.', image='tab-dashboard.jpg',
               intro='Every bill in the paycheck before it’s due, spending money that lasts until payday, and an early warning when a paycheck is going to run short.'),
)


def paycheck_pages(shot):
    P = PAYCHECK
    return [
        ('Start here', start_here(P, '<li><b>Follow the three steps</b> on This paycheck: add your paycheck, your bills, and your spending and saving. The usual bills and spending are one click away.</li>',
                                  'Choose <b>Explore sample data</b> on the welcome screen or in Settings &amp; backup. A fictional household with two incomes, 12 bills and a spending plan fills every screen, in a separate session. <b>Return to my paychecks</b> brings back your own, untouched.')),
        ('The idea', f'''<h1>One paycheck at a time.</h1>
<p class="lede">You’re paid every week, two weeks or twice a month, and bills don’t wait for the end of the month. So the planner budgets each paycheck on its own.</p>
{shot("tab-dashboard.jpg", "guide-dashboard", "This paycheck")}
<p class="cap">This paycheck. The big number is what’s left after its bills, spending and saving; the ring shows where it goes.</p>
<table><tr><th>Word</th><th>What it means</th></tr>
<tr><td>This paycheck</td><td>From your payday to the day before your next one.</td></tr>
<tr><td>Left over</td><td>The paycheck − its bills − spending − saving.</td></tr>
<tr><td>Short</td><td>Its bills and plans add up to more than it brings in.</td></tr>
<tr><td>Main paycheck</td><td>The income “each paycheck” amounts follow, when there are two.</td></tr></table>'''),
        ('Your paydays', '''<h1>Add your paycheck.</h1>
<p class="lede">Paydays → <b>Add an income</b>, or the first setup step. Add a partner’s or side job’s pay the same way.</p>
<table><tr><th>Field</th><th>What to enter</th></tr>
<tr><td>Take-home pay</td><td>What lands in your account, after tax. $2,150 or 1980.50 are fine.</td></tr>
<tr><td>How often</td><td>Every week, every 2 weeks, twice a month or once a month.</td></tr>
<tr><td>Next payday</td><td>For weekly and every 2 weeks: check your last pay stub. Every later payday follows from it.</td></tr>
<tr><td>Paid on</td><td>For twice a month: the two days, like the 15th and the last day.</td></tr>
<tr><td>On a weekend</td><td>Paid the Friday before, the Monday after, or that day.</td></tr></table>
<div class="box"><h3>Did your paycheck arrive?</h3><p>On payday, This paycheck asks. <b>Confirm amount</b> with what actually came in: overtime, fewer hours, a bonus. The plan uses the real number.</p></div>
<div class="box"><h3>Two incomes</h3><p>Every payday from either one starts a paycheck. “Each paycheck” spending follows your <b>main paycheck</b>; change it with <b>Make main</b>.</p></div>'''),
        ('Each payday', f'''<h1>Bills and spending money.</h1>
<p class="lede">Each bill lands in the paycheck before it’s due. Tick it off as you pay it, and log what you spend.</p>
{shot("tab-thischeck.jpg", "guide-thischeck", "This paycheck")}
<div class="two"><div class="box"><h3>Spending &amp; saving</h3><p>Groceries, gas, fun money, savings: an amount <b>each paycheck</b>, or <b>each month</b> split by the days each paycheck covers.</p></div>
<div class="box"><h3>Log spending</h3><p>At the top of every screen. Pick what it was for and the amount; you see what’s left this paycheck straight away.</p></div></div>'''),
        ('Plan ahead', f'''<h1>See a short paycheck coming.</h1>
<p class="lede">Paycheck plan shows the next 6 or 12 paychecks side by side, and what each one leaves.</p>
{shot("tab-plan.jpg", "guide-plan", "Paycheck plan")}
<table>
<tr><td>A red bar</td><td>That paycheck is short: its bills and plans are more than it brings in.</td></tr>
<tr><td>⇄ on a bill</td><td>Pay it from another paycheck, usually an earlier one with room. It stays there until you move it back.</td></tr>
<tr><td>Carry what’s left</td><td>Each paycheck starts with what the one before left (or owes).</td></tr></table>'''),
        ('Looking back', f'''<h1>How every paycheck went.</h1>
<p class="lede">Past paychecks: what came in, went to bills, was spent and saved, and what was left at the end.</p>
{shot("tab-history.jpg", "guide-history", "Past paychecks")}
<p>“Ended with” uses what you actually spent, not what you planned, so it tells you which paychecks really ran short. Export it all as CSV.</p>
<div class="box"><h3>50/30/20, 70/20/10, 80/20 or zero-based</h3><p>This paycheck compares how it’s split with a budget method. Switch methods on the card or in Settings. Open <b>Is each line a need, a want, saving or debt?</b> to fix any line the app guessed wrong.</p></div>'''),
        ('Getting around', '''<h1>The screens.</h1>
<p class="lede">Turn off any you don't use in Settings &amp; backup → <b>Simplify your sidebar</b>.</p>
<table><tr><th>Screen</th><th>What it is for</th></tr>
<tr><td>This paycheck</td><td>What’s left, its bills to tick, your spending money, and the next paychecks. ‹ › to move between paychecks.</td></tr>
<tr><td>Paycheck plan</td><td>The next paychecks side by side; move a bill; carry what’s left.</td></tr>
<tr><td>Spending &amp; saving</td><td>Your spending and saving amounts, and what you logged this paycheck.</td></tr>
<tr><td>Bills</td><td>Every bill as a card or a table: autopay, amounts that change, free trials, price rises.</td></tr>
<tr><td>Paydays</td><td>Your incomes, coming paydays, and what arrived.</td></tr>
<tr><td>Calendar</td><td>Paydays ($) and bills together; click a bill to tick it.</td></tr>
<tr><td>Past paychecks · Payment history</td><td>How each paycheck went; every bill payment. Export as CSV.</td></tr></table>
<p>Every table sorts, searches and filters. Every screen prints.</p>'''),
        ('Read this one', SAFE('paychecks', 'every paycheck, bill, payment, spending entry and category')),
        ('When you need help', help_page(P, '''<tr><td>A bill is in the wrong paycheck</td><td>It goes in the paycheck its due date falls in. Check the bill’s next due date, or use ⇄ to move it.</td></tr>
<tr><td>A paycheck looks too short</td><td>Two incomes? Make sure the right one is the <b>main paycheck</b> on Paydays.</td></tr>
<tr><td>Spending money looks small</td><td>A month amount is split by days: a short paycheck (a day or two) gets a small share.</td></tr>
<tr><td>My payday moved</td><td>Edit the income and set the next payday; every later one follows.</td></tr>''')),
    ]

BILLS['pages'] = bills_pages
AUTOPILOT['pages'] = autopilot_pages
DEBT['pages'] = debt_pages
NETWORTH['pages'] = networth_pages
PAYCHECK['pages'] = paycheck_pages

if __name__ == '__main__':
    which = sys.argv[1:] or ['tracker', 'debt', 'bills', 'networth', 'paycheck']
    for w in which:
        build({'tracker': AUTOPILOT, 'debt': DEBT, 'bills': BILLS, 'networth': NETWORTH, 'paycheck': PAYCHECK}[w])
