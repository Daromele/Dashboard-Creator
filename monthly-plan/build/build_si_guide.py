"""Shop Insights buyer guide: listing-kit/Shop_Insights_Guide.html, then node build/render_si_guide.js -> PDF.

US Letter pages in the Monthly Plan guide's layout, in Shop Insights' Kiln colors, with screenshots from the
app's sample shops (node listing-kit/shop-insights/capture_guide.js). Every page carries the website and email.

usage (from monthly-plan/):  python3 build/build_si_guide.py && node build/render_si_guide.js
"""
import io, base64, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, 'listing-kit/shop-insights/guide-shots/')
FONTS = io.open(os.path.join(ROOT, '../.claude/skills/html-app-mockup-deck/assets/fonts.css'), encoding='utf-8').read()
WEB, MAIL, VERSION = 'jpsdigitalpages.com', 'hello@jpsdigitalpages.com', 'v1.0'

def img(n, alt=''):
    with open(SHOTS + n, 'rb') as f: b = base64.b64encode(f.read()).decode()
    return f'<img src="data:image/jpeg;base64,{b}" alt="{alt}">'

CSS = FONTS + """
@page{size:8.5in 11in;margin:0}
:root{--bold:#3A2419;--accent:#A3461F;--pop:#F2B441;--page:#FBF7F2;--ink:#2A1A12;--ink2:#5E4A40;--ink3:#8C7A70;
 --rule:#E8DCD2;--soft:#F3EAE2;--warm:#FDF1DC;--warmline:#F0D9AE;--green:#E6F1EA;--greenline:#BFDCCB}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#A89A90}
body{font-family:"Montserrat",-apple-system,Helvetica,Arial,sans-serif;color:var(--ink);font-size:10.5pt;line-height:1.55}
.page{width:8.5in;height:11in;position:relative;overflow:hidden;background:var(--page);padding:.62in .7in .9in;margin:0 auto .25in;break-after:page;page-break-after:always}
.page:last-child{break-after:auto;page-break-after:auto}
@media print{html,body{background:none}.page{margin:0}}
.mark{width:.46in;height:.46in;border-radius:.1in;background:var(--bold);color:var(--pop);display:grid;place-items:center;font-family:"Playfair Display",Georgia,serif;font-weight:800;font-size:16pt;line-height:1}
.top{display:flex;align-items:flex-start;gap:.2in}
.top .label{font-size:8pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);padding-top:.06in}
h1{font-family:"Playfair Display",Georgia,serif;font-weight:800;font-size:27pt;line-height:1.12;color:var(--bold);letter-spacing:-.01em;margin:.32in 0 .12in}
.lede{font-size:11pt;color:var(--ink2);margin-bottom:.18in}
h2{font-size:13.5pt;font-weight:600;color:var(--bold);margin:.18in 0 .07in}
p{margin:0 0 .09in}
b{font-weight:700;color:var(--bold)}
ol,ul{margin:0 0 .1in .2in}li{margin-bottom:.04in}
.box{background:var(--soft);border-radius:.14in;padding:.16in .22in;margin:.13in 0}
.box.warm{background:var(--warm);border:1px solid var(--warmline)}
.box.green{background:var(--green);border:1px solid var(--greenline)}
.box h3{font-size:10.5pt;font-weight:700;color:var(--bold);margin-bottom:.05in}
.box p:last-child,.box ul:last-child{margin-bottom:0}
.shot{border-radius:.1in;overflow:hidden;border:1px solid var(--rule);box-shadow:0 6px 18px rgba(58,36,25,.14);margin:.08in 0 .06in;background:#fff}
.shot img{display:block;width:100%;height:auto}
.cap{font-size:8.5pt;color:var(--ink3);margin-bottom:.1in}
table{width:100%;border-collapse:collapse;margin:.08in 0 .12in;font-size:9.4pt}
th{text-align:left;font-size:7.5pt;letter-spacing:.09em;text-transform:uppercase;color:var(--ink3);font-weight:700;padding:.06in .1in .06in 0;border-bottom:1.5px solid var(--rule)}
td{padding:.075in .12in .075in 0;border-bottom:1px solid var(--rule);vertical-align:top}
td:first-child{font-weight:700;color:var(--bold);width:1.8in}
.two{display:grid;grid-template-columns:1fr 1fr;gap:.14in}.two .box{margin:0}
.foot{position:absolute;left:.7in;right:.7in;bottom:.42in;border-top:1px solid var(--rule);padding-top:.1in;display:flex;justify-content:space-between;gap:.2in;font-size:7pt;letter-spacing:.03em;color:var(--ink3)}
.foot .t{text-transform:uppercase}.foot .n{color:var(--accent);font-size:8pt;font-weight:700}
.cover{background:var(--bold);color:#fff;padding:.72in .7in}
.cover .mark{width:.62in;height:.62in;font-size:22pt;background:var(--pop);color:var(--bold)}
.cover .kicker{font-size:10pt;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--pop);margin:.48in 0 .16in}
.cover .title{font-family:"Playfair Display",Georgia,serif;font-weight:800;font-size:44pt;line-height:1.08;color:#fff}
.cover .tag{font-family:"Playfair Display",Georgia,serif;font-weight:700;font-size:19pt;color:var(--pop);margin:.16in 0 .14in}
.cover .intro{font-size:12pt;color:rgba(255,255,255,.84);line-height:1.5;max-width:5.4in}
.cover .shot{margin:.4in .1in 0;border:0;box-shadow:0 18px 44px rgba(0,0,0,.45)}
.cover .strap{position:absolute;left:.7in;bottom:1.05in;font-size:9pt;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--pop)}
.cover .ver{position:absolute;left:.7in;right:.7in;bottom:.5in;font-size:8.5pt;color:rgba(255,255,255,.7);letter-spacing:.03em;display:flex;justify-content:space-between}
"""

PAGES = []
def page(label, inner):
    n = len(PAGES) + 2
    PAGES.append(f'<section class="page"><div class="top"><div class="mark">S</div><div class="label">{label}</div></div>{inner}'
                 f'<div class="foot"><span><span class="t">Shop Insights | JPS Digital Pages</span> · {WEB} · {MAIL}</span><span class="n">{n}</span></div></section>')

COVER = f'''<section class="page cover"><div class="mark">S</div>
<div class="kicker">Your how-to guide</div><div class="title">Shop Insights</div>
<div class="tag">Every Etsy shop you run, understood.</div>
<div class="intro">Drop in the files Etsy already gives you. See what each shop really keeps after every fee, which products make money, and what to set aside for tax.</div>
<div class="shot">{img("dashboard.jpg","Shop Insights dashboard")}</div>
<div class="strap">One file · Works offline · Your own backups</div>
<div class="ver"><span>JPS DIGITAL PAGES | {VERSION}</span><span>{WEB} · {MAIL}</span></div></section>'''

page('Start here', '''<h1>What you downloaded.</h1>
<p class="lede">Read this page first. The rest is here whenever you need it.</p>
<table><tr><th>File</th><th>What it is</th></tr>
<tr><td>ShopInsights.html</td><td>The whole app, in one file. This is the product.</td></tr>
<tr><td>Shop_Insights_Guide.pdf</td><td>This guide.</td></tr>
<tr><td>START_HERE.txt</td><td>The short version of this page.</td></tr>
<tr><td>LICENSE.txt</td><td>What you may and may not do with the file.</td></tr></table>
<p>The HTML file isn’t a document that opens an app: it <b>is</b> the app. Everything is inside it, and your Etsy files are read on your own computer. Nothing is uploaded.</p>
<h2>Setting up: about fifteen minutes</h2>
<ol><li><b>Extract the ZIP</b> into a folder you’ll find again. A synced folder (iCloud Drive, Dropbox, OneDrive, Google Drive) is ideal.</li>
<li><b>Double-click ShopInsights.html.</b> It opens in Chrome, Edge, Safari or Firefox like a web page, and works offline from then on.</li>
<li><b>Take the welcome tour.</b> A few short slides: importing, take-home, profit and backups.</li>
<li><b>Add your shop and import your Etsy files</b> (pages 3 and 4).</li>
<li><b>Download a backup</b> from Settings &amp; backup. Page 12 explains why.</li></ol>
<div class="box"><h3>Want to look around first?</h3><p>Choose <b>Explore sample data</b> in the sidebar. Two made-up shops fill every screen, in a separate session. <b>Return to my shops</b> brings your own numbers back, untouched.</p></div>''')

page('Your Etsy files', '''<h1>Download these from Etsy.</h1>
<p class="lede">Shop Insights reads the files Etsy already gives you. Download them for each shop.</p>
<table><tr><th>File</th><th>Where to find it</th></tr>
<tr><td>Sold order items</td><td>Shop Manager → Settings → Options → <b>Download Data</b> → Order Items. One file for the whole year is fine. <b>Start with this one.</b></td></tr>
<tr><td>Payment account statements</td><td>Shop Manager → Finances → <b>Monthly statements</b> → Download CSV. One per month: the exact fees, ads and Etsy Plus.</td></tr>
<tr><td>Listings</td><td>Shop Manager → Settings → Options → Download Data → <b>Listings</b>. Optional: photos, tags and listing health.</td></tr>
<tr><td>Etsy Payments deposits</td><td>Shop Manager → Settings → Options → Download Data. Optional: what reached your bank.</td></tr>
<tr><td>Reviews</td><td>Your Etsy account → Privacy settings → <b>Download data</b> (reviews.json). Optional.</td></tr></table>
<div class="box warm"><h3>More than one shop?</h3><p>Etsy downloads the shop that is open in Shop Manager. Switch shops on Etsy first, download that shop’s files, then import them into the matching shop in Shop Insights.</p></div>
<div class="box green"><h3>Your buyers’ privacy</h3><p>The sold order items file includes names and addresses. Shop Insights keeps only the country and a scrambled key to count repeat buyers. Names, emails and addresses are never stored.</p></div>''')

page('Bring it in', f'''<h1>Import, in one go.</h1>
<p class="lede"><b>Import files</b> in the sidebar: choose the shop, then drop in every file at once.</p>
<div class="shot">{img("import.jpg","Import files screen")}</div>
<table><tr><th>It handles</th><th>How</th></tr>
<tr><td>Several files at once</td><td>Each file is recognized by what’s inside it, whatever it’s called.</td></tr>
<tr><td>The same file twice</td><td>Every order, line and review is recognized, so nothing ever counts twice.</td></tr>
<tr><td>The wrong shop</td><td>Under <b>Imported files</b>, move a file to another shop, or delete it, with undo.</td></tr>
<tr><td>Months with no statement yet</td><td>Estimated from your orders at your fee rates, then replaced by the statement when you import it.</td></tr></table>''')

page('The dashboard', f'''<h1>What each shop really keeps.</h1>
<p class="lede">The dashboard answers one question first: after Etsy, what did you take home this month?</p>
<div class="shot">{img("dashboard.jpg","Dashboard")}</div>
<p class="cap">Pick one shop or all of them at the top; every screen and printout follows it. The month strip under it moves through the year.</p>
<table><tr><th>Word</th><th>What it means</th></tr>
<tr><td>Revenue</td><td>Order payments, less the sales tax buyers paid and refunds.</td></tr>
<tr><td>Etsy costs</td><td>Fees, Etsy Ads, Offsite Ads and Etsy Plus, after credits.</td></tr>
<tr><td>Take-home</td><td>Revenue minus Etsy costs.</td></tr>
<tr><td>Net profit</td><td>Take-home minus the costs you log yourself (materials, packaging, software).</td></tr></table>''')

page('Fees & ads', f'''<h1>Every fee, accounted for.</h1>
<p class="lede"><b>Fees &amp; ads</b> shows your Etsy statement line by line: what Etsy kept and what reached your bank.</p>
<div class="shot">{img("fees.jpg","What Etsy kept")}</div>
<div class="box warm"><h3>Switch it on first</h3><p>Fees &amp; ads, Insights, Year over year and Transactions start switched off to keep the sidebar short. Turn them on in <b>Settings &amp; backup → Simplify your sidebar</b>.</p></div>
<div class="box"><h3>Sales tax and VAT buyers pay</h3><p>Etsy adds it to the buyer’s payment and pays it to the state. Shop Insights records it as a minus line under revenue, so it is never counted as your income or your cost.</p></div>''')

page('What sells', f'''<h1>Profit, product by product.</h1>
<p class="lede"><b>Products</b> → Products &amp; listings: what each product sold, what Etsy took, and what it left you.</p>
<div class="shot">{img("products.jpg","Products and listings")}</div>
<h2>Add what one item costs you</h2>
<p>Type your cost per item in the products table, and its profit and margin update. Each product carries its share of Etsy’s fees, ads and Etsy Plus, at the rate you actually paid in that period. <b>Download CSV</b> keeps a copy for your records.</p>
<div class="two"><div class="box"><h3>New listings</h3><p>How listings you added recently are doing.</p></div><div class="box"><h3>Coupons &amp; seasonality</h3><p>What each code cost you, and your busy and quiet months.</p></div></div>''')

page('Pricing', f'''<h1>Price for the profit you want.</h1>
<p class="lede"><b>Products → Pricing calculator</b>: what one sale leaves you, and the price that keeps your margin.</p>
<div class="shot">{img("pricing.jpg","Pricing calculator")}</div>
<ol><li>Start from one of your listings, or type a price.</li>
<li>Add what you charge for shipping, any discount, your ad spend and your own costs.</li>
<li>Set the margin you want to keep. It shows the lowest price that does.</li></ol>
<p>Fees use your rates from <b>Settings → Your Etsy fees</b>, with presets by country. Tick Offsite Ads for an order that came through one.</p>''')

page('Several shops', f'''<h1>Every shop, side by side.</h1>
<p class="lede"><b>Shops</b> compares each shop’s sales, Etsy costs and take-home, over the month, quarter, year or all time.</p>
<div class="shot">{img("shops.jpg","Shops")}</div>
<table><tr><td>Logos and covers</td><td>Give each shop a logo and a cover photo from its card.</td></tr>
<tr><td>Shared costs</td><td>A cost you log with <b>All shops</b> selected is shared: it appears in the combined view only.</td></tr>
<tr><td>One shop’s costs</td><td>Pick that shop at the top first, then log the cost.</td></tr></table>''')

page('Tax time', f'''<h1>Set tax aside as you go.</h1>
<p class="lede"><b>Tax</b> → Quarterly tax: a rule of thumb for what to put aside each quarter, and what you already have.</p>
<div class="shot">{img("tax.jpg","Quarterly tax")}</div>
<h2>A summary your accountant can work from</h2>
<p><b>Schedule C summary</b> groups the year by Schedule C line. Export it, or the transactions behind it, as CSV.</p>
<div class="box warm"><h3>Good to know</h3><p>It is an organized record, not tax advice or a filed return. Set your rate with <b>Change rate</b> on the Tax screen, and check the figures with your accountant. Shop Insights is not affiliated with Etsy, Inc.</p></div>''')

page('Getting around', '''<h1>The screens.</h1>
<p class="lede">Grouped in the sidebar. Turn off any you don’t use in Settings &amp; backup.</p>
<table><tr><th>Screen</th><th>What it is for</th></tr>
<tr><td>Dashboard</td><td>The month at a glance: take-home, orders, best seller, net profit.</td></tr>
<tr><td>Import files</td><td>Bring in Etsy files and bank CSVs; move or delete imported files.</td></tr>
<tr><td>Shops</td><td>Each shop side by side, with logos and covers.</td></tr>
<tr><td>Year at a glance</td><td>The year so far, month by month.</td></tr>
<tr><td>Profit &amp; loss</td><td>Revenue, Etsy costs, your costs and net profit.</td></tr>
<tr><td>Fees &amp; ads*</td><td>Your Etsy statement, line by line.</td></tr>
<tr><td>Insights*</td><td>What stands out in your own numbers.</td></tr>
<tr><td>Year over year*</td><td>This year against last.</td></tr>
<tr><td>Transactions*</td><td>Every line in your books; log your own costs here.</td></tr>
<tr><td>Products</td><td>Products &amp; listings, pricing calculator, new listings, coupons, seasonality.</td></tr>
<tr><td>Buyers &amp; reviews</td><td>Where buyers are, repeat buyers, and every review.</td></tr>
<tr><td>Tax</td><td>Quarterly tax and the Schedule C summary.</td></tr>
<tr><td>Planning</td><td>Monthly targets, recurring costs, reserves and goals.</td></tr>
<tr><td>Settings &amp; backup</td><td>Fee rates, tax rate, palette, sidebar and your backups.</td></tr></table>
<p class="cap">* Starts switched off. Turn it on in Settings &amp; backup → Simplify your sidebar.</p>
<p><b>Quick log</b> at the top takes a short line like <b>mailers 18</b> and files a cost by matching words.</p>''')

page('Read this one', f'''<h1>Keeping your numbers safe.</h1>
<p class="lede"><b>Your data lives in your browser, on your device.</b> There is no account and no server, and nobody else holds a copy, including us.</p>
<div class="box warm"><h3>Please read</h3><ul><li>Everything is saved automatically in that browser’s storage, not in the HTML file.</li>
<li>Clearing your browser’s site data can delete it.</li><li>It doesn’t carry across browsers: shops imported in Chrome won’t appear in Safari.</li></ul></div>
<div class="shot">{img("backup.jpg","Settings and backup")}</div>
<div class="two"><div class="box green"><h3>Download backup, any browser</h3><p>Settings &amp; backup → <b>Download backup</b>: one file with everything. <b>Restore backup</b> brings it back on any computer.</p></div>
<div class="box"><h3>Folder backup, Chrome or Edge</h3><p>Choose a synced folder once and a dated backup is kept current after every change. The status shows the date and time of the last one.</p></div></div>''')

page('When you need help', f'''<h1>A few useful fixes.</h1>
<table><tr><th>What you see</th><th>What to do</th></tr>
<tr><td>It opens as code, not an app</td><td>Extract the ZIP first, then right-click the file → Open with → your browser.</td></tr>
<tr><td>My numbers are gone</td><td>Use the same browser and profile as before. Otherwise, Restore backup.</td></tr>
<tr><td>A month shows “estimated”</td><td>Import that month’s payment account statement for the exact fees and ads.</td></tr>
<tr><td>A file went into the wrong shop</td><td>Import files → Imported files → Move.</td></tr>
<tr><td>A listing shows as unsold</td><td>Listings are matched by the start of their title; a renamed listing may not match.</td></tr>
<tr><td>Fees look a little off</td><td>Settings → Your Etsy fees: pick your country’s preset or type your rates.</td></tr>
<tr><td>Folder backup unavailable</td><td>Use Chrome or Edge on a computer, or Download backup instead.</td></tr>
<tr><td>I want the tour again</td><td>Settings &amp; backup → Welcome tour → Show tour.</td></tr></table>
<h2>We can help</h2>
<p>For order support, message <b>JPS Digital Pages</b> through Etsy Messages, or email <b>{MAIL}</b>. Website: <b>{WEB}</b></p>
<div class="box"><h3>Thank you</h3><p>If Shop Insights earns its place, a review genuinely helps a small shop. And if something isn’t right, tell us first: most things are fixable.</p></div>
<p style="font-size:8.5pt;color:var(--ink3)">© 2026 JPS Digital Pages · For use by the purchaser’s own business. See LICENSE.txt. Shop Insights is not affiliated with, or endorsed by, Etsy, Inc.</p>''')

HTML = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Shop Insights · Guide</title><style>' + CSS + '</style></head><body>'
        + COVER + ''.join(PAGES) + '</body></html>')
out = os.path.join(ROOT, 'listing-kit/Shop_Insights_Guide.html')
io.open(out, 'w', encoding='utf-8').write(HTML)
print('pages', 1 + len(PAGES), 'KB', len(HTML) // 1024)
