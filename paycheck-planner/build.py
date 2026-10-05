#!/usr/bin/env python3
"""Builds PaycheckToPaycheckPlanner.html from the shared engine (Money Autopilot's built file)
plus this edition's pack, module and CSS. Run: python3 paycheck-planner/build.py"""
import pathlib, re, json
here = pathlib.Path(__file__).parent
s = (here / 'engine/MoneyAutopilot.html').read_text()
pack = (here / 'pack.js').read_text()
mod = (here / 'payday.js').read_text()
css = (here / 'payday.css').read_text()

def one(a, b, text):
    assert text.count(a) == 1, (text.count(a), a[:80])
    return text.replace(a, b)

P = dict(name='Paycheck to Paycheck Planner', title='Paycheck to Paycheck Planner · Safe to spend until payday', color='#1F4A3E',
         desc='Paycheck to Paycheck Planner by JPS Digital Pages. See what is safe to spend until your next payday, with every bill accounted for. Works offline; your data never leaves your computer.',
         icon='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="%231F4A3E"/><path d="M22 48V16h13a9 9 0 0 1 0 18H22" fill="none" stroke="%23F2B441" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>')

# head
s = one('<!-- Money Autopilot. Copyright (c) 2026 JPS Digital Pages. All rights reserved.\n     Personal-use customer edition. -->',
        '<!-- Paycheck to Paycheck Planner. Copyright (c) 2026 JPS Digital Pages. All rights reserved.\n     Personal-use customer edition. Not for resale or redistribution. -->', s)
s = one('data-theme="{{themes.0}}"', 'data-theme="sage"', s)
s = one('<meta name="theme-color" content="#1f3b36">', f'<meta name="theme-color" content="{P["color"]}">', s)
s = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{P["desc"]}">', s, count=1)
s = one('<title>Money Autopilot · Private Income & Expense Tracker</title>', f'<title>{P["title"]}</title>', s)
s = re.sub(r"<link rel=\"icon\" href='[^']*'>", f"<link rel=\"icon\" href='{P['icon']}'>", s, count=1)

# pack: the tracker pack stays as the base (categories, merchant list); this edition's overrides follow it
i = s.index('</script>')
s = s[:i] + '\n' + pack + '\n' + s[i:]

# css
i = s.index('</style></head>')
s = s[:i] + '\n' + css + s[i:]

# static shell
s = one('<div class="brand-mark">A</div><div class="brand-txt"><b>Money Autopilot</b>', '<div class="brand-mark">P</div><div class="brand-txt"><b>Paycheck to Paycheck Planner</b>', s)
s = one('<div class="rail-note"><b>Your money, sorted for you.</b>Statements in, the whole picture out. Nothing leaves this computer.</div>',
        '<div class="rail-note"><b>One number until payday.</b>What you have, less the bills still to come. Nothing leaves this computer.</div>', s)
s = one('<span>Income &amp; expense tracker · v1.0</span>', '<span>Safe to spend until payday · v2.0</span>', s)
s = one('Fictional numbers. Your own budget stays separate.', 'Made-up data to explore. Nothing here is saved, and your own data is untouched.', s)
s = one('data-action="exit-demo">Return to my money</button>', 'data-action="exit-demo">Return to my data</button>', s)
s = one('Enable JavaScript to use Money Autopilot.', 'Enable JavaScript to use Paycheck to Paycheck Planner.', s)

# module before the engine starts, and its screens join the engine's
marker = '<div id="toast" class="toast"'
j = s.index('<script>', s.index(marker))
s = s[:j] + '<script>\n' + mod + '\n</script>\n' + s[j:]
# Bills & pay: plain words for this edition (the engine's schedule screen)
for x, y in [('Repeat the plan. Record the reality.', 'Your pay and bills'),
             ('Set a repeat once, then match each payment when it happens.', 'Add each paycheck and bill once. They repeat on their own.'),
             ("'Add schedule'", "'Add pay or bill'"),
             ('Your schedules', 'Your pay and bills'),
             ('To change future amounts, end the old schedule and add a new one.', 'To change an amount from now on, edit it, or end the old one and add a new one.'),
             ("button('Use recurring amounts','schedule-plan','quiet')", "''"),
             ('scheduled items.</b> Expected amounts are not actual transactions. Record an item or match an existing entry to avoid double counting.', 'due this month.</b> Mark each one when it actually leaves or lands, here or with the check on Today.'),
             ('Add a recurring schedule', 'Add pay or a bill'),
             ("<small>Includes every ${(a=>a.slice(0,-1).join(', ')+' and '+a.at(-1))(['month','category','goal','review','schedule',P.features.wealth&&'wealth snapshot',P.features.invoices&&'invoice',P.features.mileage&&'mileage trip'].filter(Boolean))}.</small>",
              '<small>Includes your balance, cushion, pay, bills, spending and categories.</small>'),
             ('This creates reminders. Nothing is paid, imported or added to actuals automatically.', 'It repeats on its own. Bills due before payday come off your safe-to-spend.')]:
    s = one(x, y, s)
s = one('...Biz.views,...Auto.views}', '...Biz.views,...Auto.views,...Payday.views}', s)

# More pay frequencies: twice a month, every four weeks, and a custom "every N days"
s = one("const FREQUENCIES={once:'Once',weekly:'Weekly',biweekly:'Every two weeks',monthly:'Monthly',quarterly:'Every three months',annual:'Yearly'};",
        "const FREQUENCIES={once:'Once',weekly:'Weekly',biweekly:'Every two weeks',semimonthly:'Twice a month',fourweekly:'Every four weeks',monthly:'Monthly',quarterly:'Every three months',annual:'Yearly',custom:'Every … days (custom)'};", s)
s = one("""      else if(['weekly','biweekly'].includes(r.frequency)){
        const step=r.frequency==='weekly'?7:14;""",
        """      else if(r.frequency==='semimonthly'){const d1=+r.start.slice(8),last=days(m),a=d1<=15?d1:d1-15,b=d1<=15?(d1+15>=28?last:d1+15):Math.min(d1,last);dates=[...new Set([a,b])].map(x=>m+'-'+String(Math.min(x,last)).padStart(2,'0'));}
      else if(['weekly','biweekly','fourweekly','custom'].includes(r.frequency)){
        const step={weekly:7,biweekly:14,fourweekly:28}[r.frequency]||Math.max(1,Math.min(365,(r.every|0)||14));""", s)
s = one("const PER_MONTH={once:0,weekly:52/12,biweekly:26/12,monthly:1,quarterly:1/3,annual:1/12};",
        "const PER_MONTH={once:0,weekly:52/12,biweekly:26/12,semimonthly:2,fourweekly:13/12,monthly:1,quarterly:1/3,annual:1/12};", s)
s = one("r.amount*(PER_MONTH[r.frequency]??0)", "r.amount*(r.frequency==='custom'?365/12/Math.max(1,r.every||14):(PER_MONTH[r.frequency]??0))", s)
s = one("""${(r?.frequency||'monthly')===v?'selected':''}>${l}</option>`).join('')}</select></label>""",
        """${(r?.frequency||'monthly')===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Every how many days?<input name="every" type="number" min="1" max="365" value="${r?.every||''}" placeholder="e.g. 10"><small>Only for “Every … days (custom)”</small></label>""", s)
s = one("frequency:f.get('frequency'),start:f.get('start'),end:f.get('end')}",
        "frequency:f.get('frequency'),start:f.get('start'),end:f.get('end'),...(f.get('frequency')==='custom'?{every:Math.max(1,Math.min(365,parseInt(f.get('every'),10)||14))}:{})}", s)

out = here.parent / 'PaycheckToPaycheckPlanner.html'
out.write_text(s)
print('built', out, len(s))
