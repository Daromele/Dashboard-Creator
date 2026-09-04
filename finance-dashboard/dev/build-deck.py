#!/usr/bin/env python3
"""Builds listing/finance-dashboard-etsy-mockups.html — 14 screenshot-ready 1500x1125 slides."""
import base64, os, html
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
A = os.path.join(root, 'listing', 'assets')
def img(name):
    with open(os.path.join(A, name), 'rb') as f: return 'data:image/jpeg;base64,' + base64.b64encode(f.read()).decode()
E = 'contenteditable="true" spellcheck="false"'
CSS = """
:root{--bg:#f5f0e6;--bg2:#ede6d8;--surface:#fffdf9;--line:#e4dccb;--ink:#2a2824;--ink2:#5d574c;--muted:#8a8374;--accent:#b8643a;--good:#5a7f54;--plum:#8b6f8e;--blue:#5b7a8c}
*{box-sizing:border-box}body{margin:0;background:#ddd;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink)}
.slide{width:1500px;height:1125px;background:var(--bg);position:relative;overflow:hidden;margin:30px auto;box-shadow:0 10px 40px rgba(0,0,0,.25)}
.pad{position:absolute;inset:0;padding:70px 90px;display:flex;flex-direction:column}
.serif{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
h1,h2,h3{margin:0;font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;font-weight:600;letter-spacing:-.01em;line-height:1.05}
h1{font-size:74px}h2{font-size:56px}h3{font-size:30px}
p{margin:0}
.kicker{font-size:18px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:18px}
.lead{font-size:26px;line-height:1.4;color:var(--ink2);max-width:900px}
.pills{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}
.pill{border:2px solid var(--ink);border-radius:999px;padding:10px 22px;font-size:20px;font-weight:600;white-space:nowrap}
.pill.solid{background:var(--ink);color:#fff}.pill.accent{background:var(--accent);border-color:var(--accent);color:#fff}
.frame{background:#2a2824;border-radius:22px;padding:14px;box-shadow:0 30px 60px -20px rgba(42,40,36,.5)}
.frame img{display:block;width:100%;border-radius:10px}
.phone{background:#2a2824;border-radius:44px;padding:16px;box-shadow:0 30px 60px -20px rgba(42,40,36,.5);width:340px}
.phone img{display:block;width:100%;border-radius:30px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:30px 34px;box-shadow:0 1px 2px rgba(42,40,36,.05),0 8px 24px -10px rgba(42,40,36,.15)}
.card h3{margin-bottom:10px}.card p{font-size:20px;line-height:1.4;color:var(--ink2)}
.grid{display:grid;gap:22px}
.dark{background:var(--ink);color:#fff}.dark h2,.dark h3{color:#fff}.dark .lead,.dark .card p{color:#d8d2c4}.dark .card{background:#3a3733;border-color:#4a4642}.dark .kicker{color:#d4a373}
.num{font-family:"Iowan Old Style",Palatino,Georgia,serif;font-size:56px;font-weight:600;color:var(--accent);line-height:1}
.callout{position:absolute;background:var(--ink);color:#fff;font-size:19px;padding:10px 18px;border-radius:12px;font-weight:600;white-space:nowrap;box-shadow:0 8px 20px -6px rgba(0,0,0,.4)}
.callout:after{content:"";position:absolute;left:-10px;top:50%;margin-top:-8px;border:8px solid transparent;border-right-color:var(--ink);border-left:0}
.row{display:flex;gap:40px;align-items:center}
.foot{position:absolute;left:90px;right:90px;bottom:44px;display:flex;justify-content:space-between;font-size:17px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase}
.step{display:flex;gap:22px;align-items:flex-start}.step .n{width:56px;height:56px;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;font-size:26px;font-weight:700;flex:0 0 56px;font-family:Georgia,serif}
.step h3{font-size:27px;margin-bottom:4px}.step p{font-size:20px;line-height:1.4;color:var(--ink2)}
.check{display:flex;gap:14px;align-items:center;font-size:23px;padding:10px 0;border-bottom:1px solid var(--line)}.check:last-child{border-bottom:0}.check i{width:30px;height:30px;border-radius:50%;background:var(--good);color:#fff;display:grid;place-items:center;font-style:normal;font-size:17px;flex:0 0 30px}
.tile{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:28px 26px 30px}.tile b{display:block;font-size:24px;margin-bottom:4px;font-family:"Iowan Old Style",Palatino,Georgia,serif}.tile span{font-size:17px;color:var(--muted);line-height:1.35;display:block}
.tile .ic{width:44px;height:44px;border-radius:12px;background:var(--bg2);display:grid;place-items:center;margin-bottom:12px;font-size:22px}
.note{background:var(--bg2);border-radius:16px;padding:18px 24px;font-size:20px;line-height:1.45;color:var(--ink2)}
"""
def foot(n): return f'<div class="foot"><span {E}>Personal Finance Dashboard</span><span {E}>{n} / 14</span></div>'
def slide(body, cls=''): return f'<section class="slide {cls}"><div class="pad">{body}</div></section>'
S = []
# 1 Hero
S.append(slide(f"""
<div class="row" style="height:100%;gap:50px;padding-left:100px;margin-right:-30px">
  <div style="flex:0 0 540px">
    <div class="kicker" {E}>Digital download · one HTML file</div>
    <h1 {E}>Your whole money picture, in one calm place.</h1>
    <p class="lead" style="margin-top:22px" {E}>Budget, bills, debt payoff, savings goals and net worth — offline, private, and built for couples as much as singles.</p>
    <div class="pills"><span class="pill solid" {E}>Works offline</span><span class="pill" {E}>No account</span><span class="pill" {E}>No bank link</span><span class="pill accent" {E}>Couple mode</span><span class="pill" {E}>Auto-backup</span></div>
  </div>
  <div style="flex:1"><div class="frame"><img src="{img('overview.jpg')}" alt="Overview"></div></div>
</div>""" + foot(1)))
# 2 What's inside
tiles = [('📊','Overview','Income, expenses, cash flow, savings rate, net worth and safe-to-spend.'),('💵','Income','Salaries, freelance, benefits — weekly, fortnightly, monthly or custom.'),('🎯','Budget','Planned vs actual per category with optional rollover.'),('🧾','Transactions','Search, filters, split receipts, CSV import & export.'),('📅','Bills & Subs','Recurring items, paid ticks, and a due-date calendar.'),('🐷','Savings','Goals with projected finish dates and an emergency-fund gauge.'),('💳','Debt','Snowball vs avalanche, payoff dates, total interest.'),('📈','Net Worth','Assets, liabilities and a monthly history chart.'),('🖨️','Reports','Monthly & annual summaries, print to PDF.'),('⚙️','Settings','Six colour themes, currency, couple mode, backup & restore.')]
S.append(slide(f"""
<div class="kicker" {E}>Ten connected screens</div>
<h2 {E}>Everything a spreadsheet does, without the spreadsheet.</h2>
<div class="grid" style="grid-template-columns:repeat(5,1fr);margin-top:44px;flex:1;align-content:center;gap:28px">{''.join(f'<div class="tile"><div class="ic">{i}</div><b {E}>{t}</b><span {E}>{d}</span></div>' for i,t,d in tiles)}</div>
<div class="note" style="margin-top:8px" {E}>Every screen reads from the same data — mark a bill paid and it becomes a transaction, hits the budget, and updates safe-to-spend.</div>
""" + foot(2)))
# 3 Safe to spend closeup
S.append(slide(f"""
<div class="row" style="height:100%;gap:56px">
  <div style="flex:0 0 620px">
    <div class="kicker" {E}>Overview</div>
    <h2 {E}>Know what you can actually spend today.</h2>
    <p class="lead" style="margin-top:20px" {E}>Safe-to-spend takes your spendable balances and subtracts the bills still due this month, your goal contributions and a safety buffer you set.</p>
    <div style="margin-top:30px">
      <div class="check"><i>✓</i><span {E}>Five KPI cards for any month</span></div>
      <div class="check"><i>✓</i><span {E}>12-month income vs expenses trend</span></div>
      <div class="check"><i>✓</i><span {E}>Spending by category, fixed vs variable</span></div>
      <div class="check"><i>✓</i><span {E}>Bills due in the next 14 days</span></div>
    </div>
  </div>
  <div style="flex:1;display:flex;flex-direction:column;gap:26px">
    <div class="frame" style="padding:10px"><img src="{img('kpis.jpg')}" alt="KPIs"></div>
    <div class="frame" style="padding:10px;width:520px;align-self:center"><img src="{img('safe-to-spend.jpg')}" alt="Safe to spend"></div>
  </div>
</div>""" + foot(3)))
# 4 Bills calendar
S.append(slide(f"""
<div class="kicker" {E}>Bills & subscriptions</div>
<div class="row" style="align-items:flex-end;justify-content:space-between"><h2 style="max-width:900px" {E}>Every due date on one calendar. Tick it paid, it's logged.</h2><p class="lead" style="max-width:380px;font-size:21px" {E}>Weekly and fortnightly items land on real dates — a 5-Friday month shows five, not "4.33".</p></div>
<div class="frame" style="margin-top:34px;flex:1;overflow:hidden"><img src="{img('calendar.jpg')}" alt="Calendar" style="object-fit:cover;object-position:top;height:100%"></div>
""" + foot(4)))
# 5 Budget
S.append(slide(f"""
<div class="row" style="height:100%;gap:50px">
  <div style="flex:1"><div class="frame"><img src="{img('budget.jpg')}" alt="Budget"></div></div>
  <div style="flex:0 0 520px">
    <div class="kicker" {E}>Budget</div>
    <h2 {E}>Plan it. Watch the bars fill.</h2>
    <p class="lead" style="margin-top:20px;font-size:23px" {E}>Type planned amounts straight into the table. Overspend turns red. Unbudgeted spending is flagged so nothing slips past.</p>
    <div class="card" style="margin-top:28px"><h3 {E}>Rollover, your way</h3><p {E}>Off, surplus-only, or full carry-over including overspend — one setting, applied everywhere.</p></div>
    <div class="card" style="margin-top:16px"><h3 {E}>Start fast</h3><p {E}>Copy last month, or let it suggest a budget from your last three months of spending.</p></div>
  </div>
</div>""" + foot(5)))
# 6 Debt
S.append(slide(f"""
<div class="row" style="height:100%;gap:50px">
  <div style="flex:0 0 520px">
    <div class="kicker" {E}>Debt payoff</div>
    <h2 {E}>Snowball or avalanche — see the difference in interest and months.</h2>
    <p class="lead" style="margin-top:20px;font-size:23px" {E}>Real amortisation: minimums on everything, the extra pool on the target debt, and freed-up payments roll into the next one.</p>
    <div class="frame" style="padding:10px;margin-top:28px"><img src="{img('strategy.jpg')}" alt="Strategy comparison"></div>
  </div>
  <div style="flex:1"><div class="frame"><img src="{img('debt.jpg')}" alt="Debt"></div></div>
</div>""" + foot(6)))
# 7 Savings
S.append(slide(f"""
<div class="row" style="height:100%;gap:50px">
  <div style="flex:1"><div class="frame"><img src="{img('savings.jpg')}" alt="Savings"></div></div>
  <div style="flex:0 0 500px">
    <div class="kicker" {E}>Savings goals</div>
    <h2 {E}>Every goal gets a date, not just a number.</h2>
    <p class="lead" style="margin-top:20px;font-size:23px" {E}>Progress, remaining amount, projected finish month, and a warning when you're behind — with the monthly amount needed to catch up.</p>
    <div class="card" style="margin-top:28px"><h3 {E}>Emergency fund gauge</h3><p {E}>Months of expenses covered, based on your real spending, against a target you choose.</p></div>
  </div>
</div>""" + foot(7)))
# 8 Net worth
S.append(slide(f"""
<div class="kicker" {E}>Net worth</div>
<div class="row" style="align-items:flex-end;justify-content:space-between"><h2 style="max-width:820px" {E}>Watch the line go up, month after month.</h2><p class="lead" style="max-width:440px;font-size:21px" {E}>Assets minus liabilities, with debts included automatically. A snapshot is stored every month you make changes.</p></div>
<div class="frame" style="margin-top:34px;flex:1;overflow:hidden"><img src="{img('networth.jpg')}" alt="Net worth" style="object-fit:cover;object-position:top;height:100%"></div>
""" + foot(8)))
# 9 Couple mode (dark)
S.append(slide(f"""
<div class="row" style="justify-content:space-between;align-items:flex-end">
  <div style="flex:0 0 760px"><div class="kicker" {E}>Couple mode</div><h2 {E}>Yours, mine and ours — finally in one view.</h2></div>
  <p class="lead" style="max-width:480px;font-size:22px" {E}>Tag every income, bill, debt, goal and transaction to a person or "joint". See who contributes what, and how expenses split.</p>
</div>
<div class="frame" style="margin-top:36px;padding:10px"><img src="{img('household-split.jpg')}" alt="Household split"></div>
<div class="grid" style="grid-template-columns:1fr 1fr 1fr;margin-top:34px">
  <div class="card"><h3 {E}>Per-person breakdowns</h3><p {E}>Income share, expenses, net cash flow and net worth for each of you and for joint items.</p></div>
  <div class="card"><h3 {E}>Filter anything</h3><p {E}>Transactions, bills, goals and debts all carry an owner chip and filter by person.</p></div>
  <div class="card"><h3 {E}>Still simple solo</h3><p {E}>Single mode hides the owner field entirely — switch either way at any time.</p></div>
</div>""" + foot(9), 'dark'))
# 10 Month in review
S.append(slide(f"""
<div class="row" style="height:100%;gap:56px;align-items:center">
  <div style="flex:1">
    <div class="kicker" {E}>Month in review</div>
    <h2 {E}>Your month, told back to you.</h2>
    <p class="lead" style="margin-top:20px" {E}>One button turns the month into a full-screen recap — swipe or tap through what came in, where it went, what changed since last month, and what you kept.</p>
    <div style="margin-top:30px">
      <div class="check"><i>✓</i><span {E}>Built entirely from your own entries — nothing is sent anywhere</span></div>
      <div class="check"><i>✓</i><span {E}>The biggest category swing, budgets that held, bills ticked off</span></div>
      <div class="check"><i>✓</i><span {E}>Net worth, debt payoff date and any goal you finished</span></div>
      <div class="check"><i>✓</i><span {E}>Ends with one concrete suggestion for next month</span></div>
    </div>
  </div>
  <div style="flex:0 0 600px"><div class="frame" style="padding:10px"><img src="{img('story.jpg')}" alt="Month in review"></div></div>
</div>""" + foot(10), 'dark'))
# 11 Privacy & backup
S.append(slide(f"""
<div class="row" style="height:100%;gap:56px">
  <div style="flex:1">
    <div class="kicker" {E}>Private by design</div>
    <h2 {E}>Your numbers never leave your computer.</h2>
    <p class="lead" style="margin-top:20px" {E}>No account. No cloud. No bank connection. The file makes zero network requests — your data lives in your own browser.</p>
    <div style="margin-top:30px">
      <div class="check"><i>✓</i><span {E}>Automatic backup to a file you choose (Chrome & Edge)</span></div>
      <div class="check"><i>✓</i><span {E}>Put it in Dropbox, Drive or OneDrive and it travels with you</span></div>
      <div class="check"><i>✓</i><span {E}>Every write is verified; a spare copy is kept in case of damage</span></div>
      <div class="check"><i>✓</i><span {E}>One-click JSON export & restore in every browser</span></div>
    </div>
  </div>
  <div style="flex:0 0 640px"><div class="frame"><img src="{img('settings.jpg')}" alt="Settings"></div>
    <div class="note" style="margin-top:22px" {E}>"The planner writes only to a file you choose on your own computer. If that folder happens to sync, your backup travels with it. Nothing is ever sent to us."</div></div>
</div>""" + foot(11)))
# 12 Devices
S.append(slide(f"""
<div class="kicker" {E}>Desktop · laptop · tablet · phone</div>
<div class="row" style="justify-content:space-between;align-items:flex-end"><h2 style="max-width:760px" {E}>Made for a big screen. Still works on the small one.</h2><p class="lead" style="max-width:520px;font-size:21px" {E}>Open the same file on your phone or tablet for a quick check — the layout adapts, tables scroll, the menu tucks away.</p></div>
<div class="row" style="margin-top:36px;flex:1;align-items:flex-start;gap:36px;justify-content:center">
  <div class="frame" style="width:760px"><img src="{img('tablet-savings.jpg')}" alt="Tablet"></div>
  <div class="phone"><img src="{img('mobile-overview.jpg')}" alt="Phone"></div>
  <div class="phone"><img src="{img('mobile-calendar.jpg')}" alt="Phone calendar"></div>
</div>""" + foot(12)))
# 13 Themes
S.append(slide(f"""
<div class="kicker" {E}>Six colour themes</div>
<div class="row" style="justify-content:space-between;align-items:flex-end"><h2 style="max-width:820px" {E}>Your dashboard, your mood. Two dark modes included.</h2><p class="lead" style="max-width:440px;font-size:21px" {E}>Cream, Charcoal, Midnight, Sage, Blush and Slate — one click in the sidebar, or follow your device's light / dark setting.</p></div>
<div class="grid" style="grid-template-columns:1fr 1fr 1fr;margin-top:34px;flex:1;align-content:center;gap:26px">{''.join(f'<div><div class="frame" style="padding:8px"><img src="{img("theme-" + t + ".jpg")}" alt="{t}"></div><div class="center" style="margin-top:10px;font-size:20px;font-weight:600" {E}>{n}</div></div>' for t, n in [('cream','Cream'),('charcoal','Charcoal'),('midnight','Midnight'),('sage','Sage'),('blush','Blush'),('slate','Slate')])}</div>
""" + foot(13)))
# 14 How it works / what you get
S.append(slide(f"""
<div class="row" style="height:100%;gap:70px;align-items:flex-start">
  <div style="flex:1">
    <div class="kicker" {E}>How it works</div>
    <h2 {E}>Open the file. Answer three questions. Done.</h2>
    <div style="display:flex;flex-direction:column;gap:26px;margin-top:36px">
      <div class="step"><div class="n">1</div><div><h3 {E}>Download & unzip</h3><p {E}>Instant download after purchase. Move the HTML file somewhere permanent and double-click it.</p></div></div>
      <div class="step"><div class="n">2</div><div><h3 {E}>Quick setup</h3><p {E}>Single or couple, currency, start month — or load the sample household to explore first.</p></div></div>
      <div class="step"><div class="n">3</div><div><h3 {E}>Add income & bills</h3><p {E}>The calendar, forecast and safe-to-spend build themselves. Log spending as you go or import a CSV.</p></div></div>
    </div>
    <div class="grid" style="grid-template-columns:1fr 1fr 1fr;margin-top:44px">
      <div class="tile"><div class="ic">⚡</div><b {E}>Instant download</b><span {E}>Files are ready the moment your order completes.</span></div>
      <div class="tile"><div class="ic">♾️</div><b {E}>No subscription</b><span {E}>One purchase. Use it for years, on all your devices.</span></div>
      <div class="tile"><div class="ic">🔒</div><b {E}>Yours alone</b><span {E}>Nothing leaves your computer — ever.</span></div>
    </div>
  </div>
  <div style="flex:0 0 560px"><div class="card" style="padding:36px 40px"><h3 style="font-size:34px;margin-bottom:16px" {E}>What you get</h3>
    <div class="check"><i>✓</i><span {E}>Personal_Finance_Dashboard.html</span></div>
    <div class="check"><i>✓</i><span {E}>Quick Start Guide (PDF)</span></div>
    <div class="check"><i>✓</i><span {E}>Detailed User Guide (PDF)</span></div>
    <div class="check"><i>✓</i><span {E}>Sample data & guided setup</span></div>
    <div class="check"><i>✓</i><span {E}>Personal-use licence</span></div>
    <div class="check"><i>✓</i><span {E}>24 currencies + custom symbol</span></div>
    <div class="note" style="margin-top:22px;font-size:18px" {E}>Works in Chrome, Edge, Firefox and Safari. Auto-backup needs Chrome or Edge; everyone gets one-click JSON backup.</div>
  </div></div>
</div>""" + foot(14)))
out = f"""<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Personal Finance Dashboard — Etsy mockup deck</title><style>{CSS}</style></head><body>
<div style="max-width:1500px;margin:30px auto 0;font-size:15px;color:#333;background:#fff;padding:16px 22px;border-radius:10px"><b>How to capture:</b> open in Chrome → DevTools (F12) → Elements → right-click a <code>&lt;section class="slide"&gt;</code> → <i>Capture node screenshot</i>. Each slide is exactly 1500×1125. All text is editable in place — click and type before capturing. Keep hero content inside the centre square (Etsy crops search thumbnails to 1:1).</div>
{''.join(S)}
</body></html>"""
open(os.path.join(root, 'listing', 'finance-dashboard-etsy-mockups.html'), 'w').write(out)
print('deck bytes', len(out))
