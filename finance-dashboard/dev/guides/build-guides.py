#!/usr/bin/env python3
"""Emit Quick_Start_Guide.html and User_Guide.html (dev/guides/out) with embedded screenshots; PDFs rendered by render-guides.mjs."""
import base64, os
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(os.path.dirname(here))
A = os.path.join(root, 'listing', 'assets'); OUT = os.path.join(here, 'out'); os.makedirs(OUT, exist_ok=True)
css = open(os.path.join(here, 'guide.css')).read()
def img(n): return 'data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(A, n), 'rb').read()).decode()
def shot(n, cap): return f'<div class="shot"><img src="{img(n)}" alt="{cap}"></div><div class="cap">{cap}</div>'
def page(body, title, n, total): return f'<div class="page">{body}<div class="foot"><span>{title}</span><span>Page {n} of {total}</span></div></div>'
def doc(title, pages):
    return f'<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>{title}</title><style>{css}</style></head><body>' + ''.join(page(b, title, i + 1, len(pages)) for i, b in enumerate(pages)) + '</body></html>'

# ---------------- QUICK START ----------------
qs = []
qs.append(f"""
<div class="cover"><div class="kicker">Personal Finance Dashboard · Designs by Darowan</div><h1>Quick Start Guide</h1><p class="lead" style="margin-top:8pt">From download to your first budget in about ten minutes. Everything runs in your browser, offline, with no account.</p></div>
<h2>1. Open the dashboard</h2>
<ol class="steps">
<li><b>Unzip the download</b> Right-click → Extract All (Windows) or double-click the ZIP (Mac).</li>
<li><b>Move the HTML file somewhere permanent</b> For example <span class="k">Documents › Finance</span>. Your data is tied to where the file lives, so don't run it from Downloads or from inside the ZIP.</li>
<li><b>Double-click <span class="k">Personal_Finance_Dashboard.html</span></b> It opens in your default browser. Chrome or Edge give the best experience (they support automatic backup); Firefox and Safari work too.</li>
<li><b>Bookmark it</b> Press Ctrl+D / Cmd+D so it's one click away next time.</li>
</ol>
<h2>2. Setup, tour and first steps</h2>
<p>The first time you open it, a short wizard asks:</p>
<ul><li><b>Who is it for?</b> Just you, or a couple. Couple mode tags everything to a person (or "joint") and adds per-person breakdowns. You can switch later in Settings.</li>
<li><b>Currency and start month.</b> The currency only changes the symbol and number format.</li>
<li><b>Pick a look.</b> Six colour themes, including two dark ones. The dots at the bottom of the sidebar switch themes any time.</li>
<li><b>Sample data or empty?</b> Choose <b>Load the sample household</b> to explore with six months of realistic data. You can wipe it from Settings whenever you're ready.</li></ul>
<p>A short <b>welcome tour</b> follows (arrow keys or swipe to move; re-open it with the <b>?</b> button). Each slide has a "do this now" button that opens the right form. The Overview then shows <b>Your first steps</b>, a six-item checklist that ticks itself off as you go and always points at the next thing to do.</p>
{shot('overview.jpg', 'The Overview after loading the sample household.')}
""")
qs.append(f"""
<h2>3. Enter your own data, in this order</h2>
<ol class="steps">
<li><b>Income</b> Add each salary or income source with its real pay frequency — weekly, fortnightly, monthly, or custom. Set the first pay date; the dashboard works out every future pay day from it.</li>
<li><b>Bills & Subscriptions</b> Add rent, utilities, insurance and every subscription. Give each a due day and frequency. The calendar, cash-flow forecast and safe-to-spend all build from these.</li>
<li><b>Net Worth → accounts</b> Add your current accounts, savings, investments and any credit cards or loans with today's balances. Tick the account types that count as "spendable" in Settings (checking and cash by default).</li>
<li><b>Debt</b> Add each debt with its balance, APR and minimum payment. Toggle Snowball / Avalanche and add an extra monthly amount to see your debt-free date.</li>
<li><b>Savings → goals</b> Target, saved so far, monthly contribution and an optional target date.</li>
<li><b>Budget</b> Type planned amounts straight into the table, or use <b>Suggest from last 3 months</b> once you have some transactions.</li>
</ol>
<h2>4. Day to day</h2>
<div class="two">
<div class="box"><b>Add anything with one button</b> The <b>+ Add</b> button top-right (or press <b>N</b>) adds an expense, income, bill, subscription, account, goal or debt from any page. Forms show the essentials; click <b>More options</b> for the rest.</div>
<div class="box"><b>Log spending</b> Split one receipt across categories with <b>+ Add split</b>. Or <b>Import CSV</b> from your bank — duplicates are flagged automatically.</div>
<div class="box"><b>Bills and pay days take care of themselves</b> Income posts itself on every pay day. Tick bills <b>Paid</b> (or press <b>✓ Mark all due as paid</b>, or switch on auto-pay in Settings → Automation) and the payment is recorded as a transaction, so the budget and safe-to-spend update instantly.</div>
<div class="box"><b>Change the month</b> Use ‹ › in the top bar, or click the month name to jump. Every page follows it.</div>
<div class="box"><b>Print a report</b> Reports → <b>Print / Save PDF</b> for a monthly or annual summary.</div>
</div>
<h2>5. Protect your data</h2>
<div class="box good"><b>Chrome or Edge: turn on automatic backup</b> Settings → Automatic backup → <b>Choose backup file…</b>. Pick a location (a Dropbox, Drive or OneDrive folder works well). Every change is written there two seconds later and verified. Nothing is sent anywhere.</div>
<div class="box info"><b>Any browser: one-click JSON backup</b> Settings → <b>Export backup (JSON)</b>. To move to another computer, open the dashboard there and use <b>Restore from backup…</b>.</div>
<div class="box warn"><b>Don't move or rename the file, and don't clear site data</b> Both start a fresh, empty dashboard. Export a backup first, then restore it afterwards.</div>
<p class="small muted">Need more detail? The User Guide explains every screen and every calculation.</p>
""")
open(os.path.join(OUT, 'Quick_Start_Guide.html'), 'w').write(doc('Quick Start Guide', [''.join(qs)]))

# ---------------- USER GUIDE ----------------
ug = []
ug.append(f"""
<div class="cover"><div class="kicker">Personal Finance Dashboard · Designs by Darowan</div><h1>User Guide</h1><p class="lead" style="margin-top:8pt">Every screen, every calculation, and the answers to the questions people ask most.</p></div>
<h2>Contents</h2>
<ol><li>How it works &amp; where your data lives</li><li>Setup, household mode &amp; currency</li><li>Overview &amp; safe-to-spend</li><li>Income and the frequency rules</li><li>Bills &amp; Subscriptions</li><li>Transactions, splits and CSV import</li><li>Budget &amp; rollover</li><li>Savings goals &amp; emergency fund</li><li>Debt payoff planner</li><li>Net worth</li><li>Reports &amp; printing</li><li>Backup, restore &amp; moving computers</li><li>Browsers, devices &amp; troubleshooting</li><li>FAQ</li></ol>
<div class="box info"><b>The one idea to keep in mind</b> Everything is one connected data set. Income sources and bills are the <i>plan</i>; transactions are what <i>actually happened</i>. The Overview shows both: recorded figures as the headline, expected figures underneath.</div>
""")
ug.append(f"""
<h2>1. How it works & where your data lives</h2>
<p>The dashboard is a single HTML file. When you open it, your browser runs it locally — there is no server, no account and no internet connection. It never makes a network request.</p>
<p>Your data is saved in the browser's <b>local storage</b> on this computer, tied to the file's location. That has three consequences:</p>
<ul><li>Opening the file in a <b>different browser</b> (say Chrome and then Firefox) shows a different, separate dashboard. Use a backup to move data between them.</li>
<li><b>Moving or renaming the file</b> starts a fresh dashboard. Export a backup, move the file, then restore.</li>
<li><b>Clearing browsing data</b> ("cookies and site data") erases the dashboard. Keep a backup.</li></ul>
<h3>Backups</h3>
<p>Two mechanisms, both optional, both fully under your control:</p>
<table><tr><th>Method</th><th>Browsers</th><th>How</th></tr>
<tr><td><b>Automatic file backup</b></td><td>Chrome, Edge (and other Chromium browsers)</td><td>Settings → choose a file once. Every change is written there 2 seconds later. Every 20th write is read back and checked; a verified spare copy is kept inside the browser.</td></tr>
<tr><td><b>Manual JSON backup</b></td><td>All browsers</td><td>Settings → Export backup. Restore with Restore from backup. Firefox and Safari users get a reminder every 5 sessions.</td></tr></table>
<p class="small">See section 12 for the details, including what happens when the backup file is newer than the browser's copy.</p>
<h3>Sample data</h3>
<p>The sample household ("Alex & Sam") contains six months of realistic income, bills, subscriptions, debts, goals, budgets and about 300 transactions. It is generated relative to today's date, so it always looks current. Load or replace it from Settings → <b>Load sample data</b>. Loading it <b>replaces</b> what is in the dashboard, so export first if you have real data.</p>
<h3>Self-tests</h3>
<p>Because this is a money tool, the calculation engines ship with built-in checks against hand-worked examples (leap years, five-Friday months, month-end due days, debt amortisation, rollover). Run them any time from Settings → <b>Run self-tests</b>.</p>
""")
ug.append(f"""
<h2>2. Setup, household mode & currency</h2>
<h3>The first-run wizard</h3>
<p>Three questions: household mode and names, currency and start month, and whether to load sample data. Re-run it any time from Settings → <b>Re-run setup</b>.</p>
<h3>Household mode</h3>
<p><b>Just me</b> keeps every form short. <b>Couple</b> adds an <b>Owner</b> field (Person 1, Person 2 or Joint) to income, bills, subscriptions, transactions, accounts, debts and goals, and switches on:</p>
<ul><li>a Household split card on the Overview (income, expected income, expenses, net and share of income per person, with contribution and expense donuts);</li>
<li>owner chips and owner filters throughout; per-person columns in the annual category report; per-person net worth.</li></ul>
<p>Switching from Couple back to Just me only hides the owner field — nothing is deleted, and switching back restores every tag.</p>
<h3>Currency</h3>
<p>Choose from 24 currencies or pick <b>Custom symbol</b>. This changes the symbol and number formatting only (for example <span class="k">1.234,56 €</span> vs <span class="k">$1,234.56</span>). <b>Amounts are never converted</b> — if you switch from USD to GBP, 100 stays 100.</p>
<h3>Planning settings</h3>
<table><tr><th>Setting</th><th>What it does</th></tr>
<tr><td>Tracking starts</td><td>The earliest month budget rollover chains reach back to.</td></tr>
<tr><td>Safety buffer</td><td>A fixed amount subtracted from safe-to-spend.</td></tr>
<tr><td>Budget rollover</td><td>Off · Surplus only · Full (see section 7).</td></tr>
<tr><td>Emergency fund target</td><td>Months of expenses the emergency-fund gauge aims for.</td></tr>
<tr><td>Count subscriptions in bill totals</td><td>Whether subscriptions appear in the bills totals, calendar and safe-to-spend.</td></tr>
<tr><td>Spendable account types</td><td>Which account types count as "available" money for safe-to-spend (default: checking and cash).</td></tr></table>
<h3>Appearance</h3>
<p>Six themes: Cream, Charcoal (dark), Midnight (dark navy), Sage, Blush and Slate. Choose one in Settings → Appearance, from the dots at the bottom of the sidebar, or during setup. Charts, chips and every page follow the theme. Tick <b>Follow my device's light / dark setting</b> to switch automatically between Cream and Charcoal. Reports always print in black on white.</p>
<h3>The welcome tour and first steps</h3>
<p>The tour (the <b>?</b> button, or Settings → Welcome tour) is seven short slides: what the dashboard does, then income, bills, accounts, budget, everyday logging and backup, each with a button that opens the relevant form. The <b>Your first steps</b> card on the Overview tracks the same six steps and highlights the next one; hide it with × once you're done.</p>
<h3>Automation: enter recurring things once</h3>
<p>Settings → <b>Automation</b> has three switches.</p>
<ul><li><b>Post income on pay day</b> (on by default). Every income source creates its own income transaction on each pay date, back to your tracking start month. These carry an <span class="k">auto</span> chip in Transactions. If a pay differs, edit the posted transaction; if you delete one, that pay day stays deleted and is never re-posted.</li>
<li><b>Mark bills paid on their due date</b> (off by default). Once a due date arrives the bill is ticked and logged for that month. Untick it to undo for that month. Prefer to confirm each payment yourself? Leave this off and use <b>✓ Mark all due as paid</b> in Bills &amp; Subscriptions instead — one click for everything that has come due.</li>
<li><b>Carry the budget into each new month</b> (on by default). A month that starts with no budget gets last month's planned amounts copied in.</li></ul>
<h3>Quick add and simpler forms</h3>
<p>The <b>+ Add</b> button in the top bar (keyboard: <b>N</b>) opens one chooser for every kind of record. Every form shows only the essential fields; <b>More options</b> reveals the rest (end dates, notes, committed extra payments, and so on). Existing values in those fields expand the section automatically when editing.</p>
<h3>Categories</h3>
<p>Add, rename or remove spending categories in Settings. Renaming updates every existing transaction, budget, bill and subscription. Removing a category keeps its transactions (they show as "unbudgeted").</p>
{shot('settings.jpg', 'Settings: household, currency, planning, categories, backup and data.')}
""")
ug.append(f"""
<h2>3. Overview & safe-to-spend</h2>
<p>The Overview follows the month selected in the top bar. The five KPI cards:</p>
<table><tr><th>Card</th><th>Calculation</th></tr>
<tr><td>Income</td><td>Sum of income transactions in the month. Underneath: expected income from your income sources.</td></tr>
<tr><td>Expenses</td><td>Sum of expense transactions in the month. Underneath: bills & subscriptions due that month.</td></tr>
<tr><td>Net cash flow</td><td>Income − expenses.</td></tr>
<tr><td>Savings rate</td><td>(Net cash flow + anything logged in the <b>Savings</b> category) ÷ income. Money you moved into savings counts as saved, not spent.</td></tr>
<tr><td>Net worth</td><td>Assets − liability accounts − debts (section 10).</td></tr></table>
<h3>Safe to spend</h3>
<p>An estimate of what you can spend for the rest of the month without touching bills, goals or your buffer:</p>
<div class="box"><b>Safe to spend =</b> balances of spendable accounts − bills & subscriptions still due (not yet ticked paid, due today or later) − monthly goal contributions − safety buffer</div>
<p>For past or future months the "still due" figure covers the whole month. It is labelled an estimate because it relies on the balances you entered being current.</p>
{shot('safe-to-spend.jpg', 'The safe-to-spend card shows every component of the calculation.')}
<h3>Insights</h3>
<p>Up to four short statements at the top of the Overview, computed from your data: days until the next pay day, budget used versus month elapsed, the biggest category swing between the last two complete months, bills due in the next seven days, annual subscription cost, your debt-free date (and which strategy saves more), emergency-fund cover, and any goal that is almost funded. Click one to jump to the page behind it.</p>
<h3>Other Overview cards</h3>
<ul><li><b>Income vs expenses</b> — recorded transactions for the last 12 months.</li>
<li><b>Spending by category</b> — the month's expenses; more than eight categories are grouped as "Other categories".</li>
<li><b>Fixed vs variable</b> — fixed = transactions created by ticking a bill paid, or in a category used by a bill or subscription; everything else is variable.</li>
<li><b>Due in the next 14 days</b> — from today, always, regardless of the selected month.</li>
<li><b>Budget snapshot</b> and <b>Goals</b> — the six largest budget lines and the top four goals by priority.</li></ul>
""")
ug.append(f"""
<h2>4. Income and the frequency rules</h2>
<p>Add each income source with its amount per payment and frequency. The same frequency engine drives income, bills and subscriptions, so the rules below apply everywhere.</p>
<table><tr><th>Frequency</th><th>Rule</th><th>Monthly average</th></tr>
<tr><td>Weekly</td><td>Every 7 days from the start date.</td><td>amount × 52 ÷ 12</td></tr>
<tr><td>Fortnightly</td><td>Every 14 days from the start date.</td><td>amount × 26 ÷ 12</td></tr>
<tr><td>Monthly</td><td>On the due day each month (income: the day of the first payment date).</td><td>amount</td></tr>
<tr><td>Quarterly / every 6 months / annual</td><td>Every 3, 6 or 12 months from the start month, on the due day.</td><td>÷ 3, ÷ 6, ÷ 12</td></tr>
<tr><td>Custom</td><td>Every N weeks, months or years.</td><td>annualised ÷ 12</td></tr></table>
<div class="box good"><b>Real dates, not averages</b> Weekly and fortnightly items are placed on their actual dates, so a month with five Fridays shows five payments and a month with three fortnightly pay days shows three. Monthly figures in tables say "×3" when that happens. The "Monthly avg" column is the annualised average for comparison.</div>
<div class="box"><b>Month-end due days</b> A due day of 29, 30 or 31 falls on the last day of shorter months (31 → 28 February, or 29 in a leap year), and returns to the 31st in months that have one.</div>
<div class="box"><b>Start and end dates</b> Nothing is generated before the start date or after the end date. A monthly item that starts on the 15th with a due day of 10 first appears on the 10th of the following month. Untick <b>Active</b> to pause an item without deleting it.</div>
{shot('income.jpg', "Income: sources, next pay day, this month's total and the expected-income chart.")}
<p>The <b>Expected income by month</b> chart shows the next twelve months exactly as the engine computes them, stacked by person in couple mode.</p>
""")
ug.append(f"""
<h2>5. Bills & Subscriptions</h2>
<p>Bills and subscriptions are both recurring outgoings; the difference is the form. A bill has a due day and any frequency. A subscription has a billing cycle and a <b>next renewal date</b> — future renewals repeat from that date, and an optional "Started" date lets past months show it.</p>
<h3>The list</h3>
<ul><li><b>Paid</b> — tick to mark the item paid for the selected month. This creates an expense transaction (description = the bill's name, category = the bill's category, dated on the first due date that month, amount = all occurrences that month). Unticking deletes that transaction. The box is disabled when nothing is due that month.</li>
<li><b>due</b> chip — appears in the current month when a due date has passed and the item is not ticked.</li>
<li><b>Next due</b> — the next occurrence from today (current month) or from the start of the selected month.</li>
<li><b>This month</b> / <b>Monthly avg</b> — exact amount due this month (with ×N for multiple occurrences) and the annualised average.</li></ul>
<h3>The calendar</h3>
{shot('calendar.jpg', 'Calendar view: dashed = subscription, struck through = paid, daily totals in each cell.')}
<h3>Totals</h3>
<p>"Bills per month" and "Subscriptions per month" are annualised averages (the yearly figure ÷ 12), so annual items are spread evenly. "Due this month" and "Still to pay" use the exact amounts falling in the selected month.</p>
<div class="box info"><b>Subscriptions everywhere or only here?</b> Settings → "Count subscriptions in bill totals" decides whether subscriptions are included in the bills KPIs, the calendar, the Overview's due list and safe-to-spend. It defaults to on.</div>
""")
ug.append(f"""
<h2>6. Transactions, splits and CSV import</h2>
<p>Transactions are the record of what actually happened. Each has a date, type (expense, income or transfer), description, optional owner, "paid from" account, notes, and one or more <b>splits</b> (category + amount).</p>
<h3>Splits</h3>
<p>One receipt can cover several categories: click <b>+ Add split</b> in the form and give each line a category and amount. The transaction's total is the sum of its splits. Budgets, reports and category charts all use the split lines, so a supermarket trip can count partly as Groceries and partly as Pets.</p>
{shot('txn-form.jpg', 'The transaction form with two splits.')}
<h3>Filters</h3>
<p>Search matches description, notes and category. Filter by month (or all months), type, category and owner. The three cards above the table total whatever is currently filtered, and <b>Export CSV</b> exports the same filtered set (one row per split).</p>
<h3>CSV import</h3>
<ol class="steps">
<li><b>Export a CSV from your bank</b> and choose it in Transactions → Import CSV. The file is read in your browser only.</li>
<li><b>Map the columns.</b> Date, description and amount are detected from the header names when possible. Banks that use separate debit and credit columns are supported.</li>
<li><b>Set the sign convention</b> (negative = expense is the most common) and the date format (day-first or month-first; ISO dates like 2026-03-31 work either way).</li>
<li><b>Choose a default category, owner and account</b> for the imported rows. If the file has a category column that matches one of yours, it is used.</li>
<li><b>Check the preview.</b> Rows with the same date, amount and description as an existing transaction are marked duplicate and skipped by default. Unreadable rows are counted and ignored.</li>
<li><b>Import.</b> Recategorise anything afterwards by clicking the row.</li>
</ol>
<div class="box warn"><b>Transactions do not change account balances</b> Account balances on the Net Worth page are snapshots you update yourself (inline, or via the account form). This keeps the tool simple and avoids double-counting when you also import bank statements.</div>
""")
ug.append(f"""
<h2>7. Budget & rollover</h2>
<p>Budgets are per category, per month. Type a planned amount into the <b>Planned</b> box and click away (or press Enter) to save. Clear a box to remove that line. <b>Show all categories</b> lists every category; otherwise only categories with a budget or spending appear.</p>
{shot('budget.jpg', 'Budget with surplus rollover on: planned, rollover, available, spent, remaining and progress.')}
<table><tr><th>Column</th><th>Meaning</th></tr>
<tr><td>Planned</td><td>What you set for this month.</td></tr>
<tr><td>Rollover</td><td>Carried in from the previous month (only shown when rollover is on).</td></tr>
<tr><td>Available</td><td>Planned + rollover.</td></tr>
<tr><td>Spent</td><td>Expense transactions (split lines) in that category this month.</td></tr>
<tr><td>Remaining</td><td>Available − spent. Red when overspent; the bar turns amber above 85%.</td></tr></table>
<h3>Rollover modes</h3>
<ul><li><b>Off</b> — every month stands alone.</li>
<li><b>Surplus only</b> — unspent money from last month is added to this month; overspending is not carried (it never goes negative).</li>
<li><b>Full</b> — both unspent money and overspending carry forward, so an overspent month reduces the next month's available amount.</li></ul>
<p>Rollover chains run month to month back to the first month with a budget in that category, or the "Tracking starts" month, whichever comes first.</p>
<div class="box"><b>Worked example (surplus mode)</b> Groceries budget 100 each month. January spend 60 → February shows rollover +40 and available 140. February spend 170 → overspent by 30, so March shows rollover 0 (in Full mode it would show −30 and available 70).</div>
<h3>Shortcuts</h3>
<ul><li><b>Copy [last month]</b> — copies every planned amount from the previous month.</li>
<li><b>Suggest from last 3 months</b> — sets each category to its average spend over the previous three months, rounded up to the nearest 5.</li></ul>
<p>"Unbudgeted" chips mark spending in categories with no budget; the total is summarised beneath the table.</p>
""")
ug.append(f"""
<h2>8. Savings goals & emergency fund</h2>
{shot('savings.jpg', 'Savings: goals with projections, and the emergency fund gauge.')}
<h3>Goals</h3>
<p>Each goal has a target, saved-so-far amount, monthly contribution, optional target date, priority and owner. From those:</p>
<table><tr><th>Figure</th><th>Calculation</th></tr>
<tr><td>Remaining</td><td>Target − saved.</td></tr>
<tr><td>Projected completion</td><td>Remaining ÷ monthly contribution, rounded up, added to the current month.</td></tr>
<tr><td>Behind schedule</td><td>Shown when a target date is set and the projection lands after it (or no contribution is set).</td></tr>
<tr><td>Needed per month</td><td>Remaining ÷ months until the target date — what it would take to catch up.</td></tr></table>
<p><b>+ Add to savings</b> increases the saved amount and, optionally, records a transaction in the <b>Savings</b> category so the budget, savings rate and reports reflect it.</p>
<h3>Emergency fund</h3>
<p><b>Months covered</b> = money in the emergency fund ÷ average monthly expenses.</p>
<ul><li>Average monthly expenses = the last three months of recorded expenses, excluding the Savings category (transfers to savings are not living costs). If there are no recorded expenses yet, the monthly average of your bills and subscriptions is used.</li>
<li>"Money in the fund" = the saved amount of a goal whose name contains "Emergency"; if there is none, the total of your savings and cash accounts.</li>
<li>The target number of months is set in Settings (default 3).</li></ul>
<p>The KPI card at the top uses the same figure, so the Savings page and the Overview always agree.</p>
""")
ug.append(f"""
<h2>9. Debt payoff planner</h2>
{shot('debt.jpg', 'Debt: KPIs, strategy toggle, paydown curve, comparison, per-debt cards and the monthly schedule.')}
<p>Add each debt with its current balance, APR, minimum monthly payment and (optionally) a committed extra amount you always pay on that debt. Then choose a strategy and an <b>extra per month</b> pool.</p>
<h3>How the simulation works</h3>
<ol><li>Each month, interest is added to every debt: <span class="k">balance × APR ÷ 100 ÷ 12</span>, rounded to the cent.</li>
<li>Every debt receives its minimum payment plus its committed extra.</li>
<li>The extra pool goes to the target debt: <b>Snowball</b> = smallest balance first, <b>Avalanche</b> = highest APR first. If the target is cleared with money left over, the remainder goes to the next target the same month.</li>
<li>When a debt is paid off, its minimum and extra are added to the pool from the following month — the "snowball" effect.</li>
<li>The simulation stops when everything is cleared, or after 600 months. If payments don't cover interest, the debt is flagged <b>never pays off</b> instead of hanging.</li></ol>
<div class="box"><b>Hand-checkable example</b> 1,000 at 12% APR, 100 minimum. Month 1: interest 10.00, balance 910.00. Month 2: interest 9.10, balance 819.10. Month 3: interest 8.19, balance 727.29 … paid off in month 11, total interest 58.98. This exact case is one of the built-in self-tests.</div>
<h3>What you see</h3>
<ul><li><b>Blended APR</b> — each debt's APR weighted by its balance.</li>
<li><b>Debt-free</b> and <b>Total interest</b> for the selected strategy; the comparison card shows both strategies side by side with the interest and months saved.</li>
<li><b>Paydown curve</b> — total balance by month for both strategies (the selected one drawn solid).</li>
<li><b>Per-debt cards</b> — payoff month, this month's payment and interest, interest until paid, and progress against the original balance.</li>
<li><b>Schedule</b> — month-by-month balances; export the full schedule as CSV.</li>
<li><b>Record a payment</b> — reduces the balance and optionally logs a "Debt Payments" transaction.</li></ul>
<p class="small muted">Which strategy? Avalanche always costs the least interest. Snowball clears individual debts sooner, which many people find easier to stick to. The comparison card tells you exactly what the difference is for your numbers.</p>
""")
ug.append(f"""
<h2>10. Net worth</h2>
{shot('networth.jpg', 'Net worth: history chart, assets and liabilities with inline balances, snapshots.')}
<p><b>Net worth = assets − liability accounts − debts.</b> Debts entered on the Debt page are included automatically, so don't add them again as liability accounts.</p>
<ul><li>Accounts have a type (checking, savings, cash, investments, retirement, property, vehicle, credit card, loan, mortgage…), an owner in couple mode, and a balance. Liability balances are entered as positive numbers.</li>
<li>Edit a balance inline in the table, or open the account with ✎.</li>
<li><b>Snapshots</b> — one per month is stored automatically whenever your net worth changes (dated the day of the change; the latest change in a month wins). <b>Snapshot now</b> stores one for today. Delete any snapshot with ×.</li>
<li>The chart appears once there are two or more snapshots and shows net worth, assets and liabilities.</li></ul>
<h2>11. Reports & printing</h2>
{shot('reports.jpg', 'Reports: annual summary, month-by-month chart, highlights, category totals, and the monthly report.')}
<p>Choose a year for the annual section. The monthly report at the bottom follows the month selected in the top bar. Included:</p>
<ul><li>Annual income, expenses, net saved and savings rate; average monthly expenses.</li>
<li>Best and toughest months (by net cash flow), highest-spending month, top category, months in surplus.</li>
<li>A monthly summary table with expected income and bills due for comparison.</li>
<li>Category totals with share and per-month average (per-person columns in couple mode); income by type.</li>
<li>Monthly report: KPIs, categories vs budget, and every transaction.</li></ul>
<p><b>Print / Save PDF</b> opens the browser's print dialog with a print-friendly layout (sidebar hidden, page breaks before the monthly report). Choose "Save as PDF" as the destination to keep a copy.</p>
""")
ug.append(f"""
<h2>12. Backup, restore & moving computers</h2>
<h3>Automatic file backup (Chrome, Edge)</h3>
<ol><li>Settings → Automatic backup → <b>Choose backup file…</b> and pick a location. A folder that syncs (Dropbox, Google Drive, OneDrive, iCloud Drive) means the backup travels with you.</li>
<li>From then on, every change is written to the file two seconds after you make it. The sidebar pill shows the status.</li>
<li>Every 20th write (and every manual <b>Write now</b>) is read back and compared with the data in the browser. If it doesn't match, you get a warning and the status turns to error.</li>
<li>The last verified copy is also kept inside the browser. <b>Restore last verified copy…</b> brings it back if the file on disk is ever damaged.</li></ol>
<div class="box warn"><b>"Backup needs permission"</b> After a browser restart, Chrome asks you to re-allow access to the file. Click <b>Allow access</b> in Settings (or the pill in the sidebar). Until then, nothing is written — your data is still safe in the browser.</div>
<div class="box info"><b>The file is newer than this browser</b> If you open the dashboard where the linked file was last saved by another device, you'll be asked whether to <b>restore from the file</b> or <b>keep this browser's data</b>. Nothing is overwritten until you choose. Pick "restore" to continue where you left off on the other device.</div>
<h3>Manual backup (every browser)</h3>
<ul><li><b>Export backup (JSON)</b> downloads a complete copy: settings, accounts, income, bills, subscriptions, transactions, budgets, debts, goals and snapshots.</li>
<li><b>Restore from backup…</b> replaces everything in the dashboard with the file's contents, after a confirmation that shows the file's date and record counts. Backups from a newer version of the app are refused rather than merged blindly.</li></ul>
<h3>Moving to a new computer or browser</h3>
<ol><li>Export a JSON backup (or use the linked backup file).</li>
<li>Copy <span class="k">Personal_Finance_Dashboard.html</span> to the new computer and open it. Skip the wizard.</li>
<li>Settings → Restore from backup… → choose the file. Link a backup file again if you use automatic backup.</li></ol>
<h3>Danger zone</h3>
<p><b>Delete all transactions</b> keeps your setup, bills, debts and goals. <b>Erase everything</b> wipes the browser's copy and unlinks the backup file (the file itself is not deleted).</p>
""")
ug.append(f"""
<h2>13. Browsers, devices & troubleshooting</h2>
<table><tr><th>Browser</th><th>Works</th><th>Automatic file backup</th></tr>
<tr><td>Google Chrome (Windows, Mac, Linux)</td><td>Yes — recommended</td><td>Yes</td></tr>
<tr><td>Microsoft Edge</td><td>Yes — recommended</td><td>Yes</td></tr>
<tr><td>Firefox</td><td>Yes</td><td>No — use JSON export (reminder every 5 sessions)</td></tr>
<tr><td>Safari (Mac)</td><td>Yes</td><td>No — use JSON export</td></tr>
<tr><td>iPhone / iPad (Safari, Chrome)</td><td>Yes, from the Files app</td><td>No — use JSON export</td></tr>
<tr><td>Android (Chrome)</td><td>Yes, from a file manager</td><td>Varies by version</td></tr></table>
<p>The layout is designed for desktop and laptop screens, works well on tablets, and adapts to phones (the sidebar becomes a menu button; wide tables scroll sideways).</p>
<h3>Common problems</h3>
<div class="faq">
<p><b>My data disappeared.</b> Almost always the file was moved, renamed, opened in a different browser, or the browser's site data was cleared. Put the file back where it was (or restore a backup). If you use automatic backup, the linked file still has everything — Settings → Restore from backup…</p>
<p><b>The wizard appears every time I open the file.</b> Your browser is blocking local storage — usually a private/incognito window or a "block all cookies" setting. Open it in a normal window and allow site data.</p>
<p><b>"Browser storage is full."</b> Rare, but possible after years of transactions. Export a backup, then delete old transactions (Settings → Delete all transactions, or delete them individually).</p>
<p><b>The backup pill says "error".</b> Hover the pill or open Settings to read the message. Re-link the file with <b>Re-link file</b>. Your data in the browser is unaffected.</p>
<p><b>Numbers show in the wrong format.</b> Settings → Currency. The format follows the currency's usual locale; use Custom symbol for anything else.</p>
<p><b>A weekly bill shows five payments this month.</b> That's correct — the month has five of that weekday. Compare using the "Monthly avg" column.</p>
<p><b>Income shows 0 but I set up income sources.</b> The Income KPI counts recorded income transactions. Expected income from your sources is shown underneath. Record your pay as an income transaction when it lands (or import your statement) to see it in the headline.</p>
</div>
""")
ug.append(f"""
<h2>14. FAQ</h2>
<div class="faq">
<p><b>Does it connect to my bank?</b> No, by design. Import a CSV statement whenever you like; nothing is uploaded anywhere.</p>
<p><b>Is there a mobile app?</b> It is one file that opens in any browser, including on phones and tablets. There is nothing to install.</p>
<p><b>Can two of us use it at the same time?</b> Each browser holds its own copy. The intended workflow for couples is one shared dashboard (on one computer, or on a shared linked backup file that you open from either device — accept "restore from file" when prompted).</p>
<p><b>Can I use it for more than one year?</b> Yes. There is no limit on how far back or forward you can go; Reports let you pick any year that has data.</p>
<p><b>Do transactions update my account balances?</b> No — balances are snapshots you keep current yourself. See section 6.</p>
<p><b>Why doesn't marking a bill paid reduce my checking balance?</b> Same reason. Update the balance on the Net Worth page when you reconcile with your bank.</p>
<p><b>What is a "transfer" transaction?</b> Money moved between your own accounts. Transfers are excluded from income and expenses.</p>
<p><b>How do I record money put into savings?</b> Use <b>+ Add to savings</b> on the goal, or log an expense in the Savings category. Either way it counts toward your savings rate and against the Savings budget line.</p>
<p><b>Can I change the categories?</b> Yes — Settings → Categories. Rename, add or remove.</p>
<p><b>Can I have separate budgets per person?</b> Budgets are per household. Filter Transactions by owner to see who spent what in each category, or check the per-person columns in the annual category report.</p>
<p><b>Is my data encrypted?</b> It is stored in your browser's local storage and, if you link one, in a plain JSON file you control. Treat the backup file like any private document. If your computer is shared, use a separate browser profile or OS user account.</p>
<p><b>How do I update to a new version?</b> Export a backup, replace the HTML file with the new one in the same location, open it and restore if needed. Newer versions read older backups and migrate them.</p>
<p><b>Is this financial advice?</b> No. It is a planning and record-keeping tool. Payoff dates, projections and safe-to-spend are estimates based on the numbers you enter.</p>
</div>
<div class="box good" style="margin-top:14pt"><b>Thank you</b> for supporting a small independent shop. If anything in this guide is unclear, message the shop through Etsy and mention which browser you use.</div>
""")
open(os.path.join(OUT, 'User_Guide.html'), 'w').write(doc('User Guide', ug))
print('guides written', len(qs), len(ug))
