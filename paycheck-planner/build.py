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
s = one('...Biz.views,...Auto.views}', '...Biz.views,...Auto.views,...Payday.views}', s)

out = here.parent / 'PaycheckToPaycheckPlanner.html'
out.write_text(s)
print('built', out, len(s))
