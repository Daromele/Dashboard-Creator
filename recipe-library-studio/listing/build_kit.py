# Builds the Etsy listing kit for Recipe Library Studio from the screenshots in img/.
#   python3 listing/build_kit.py
# Writes how-to-guide-print.html, how-to-guide-dynamic.html and etsy-mockups.html next to this file.
# Images are embedded, so each HTML file works on its own.
import base64, pathlib

HERE = pathlib.Path(__file__).parent
IMG = {p.stem: 'data:image/jpeg;base64,' + base64.b64encode(p.read_bytes()).decode() for p in (HERE / 'img').glob('*.jpg')}
APP = 'Recipe Library Studio'
SHOP = 'JPS Digital Pages'
EMAIL = 'hello@jpsdigitalpages.com'
SITE = 'jpsdigitalpages.com'
CONTACT = f'{SHOP} · {SITE} · {EMAIL}'
CONTACT_HTML = f'{SHOP} · <a href="https://www.{SITE}">{SITE}</a> · <a href="mailto:{EMAIL}">{EMAIL}</a>'

THEMES = [  # name, paper, accent, sidebar, highlight
    ('Kiln', '#FBF8F5', '#A4471F', '#2D1B12', '#F2B441'), ('Ledger', '#F6F7F5', '#1F7A5C', '#111C28', '#E3A73B'),
    ('Sage', '#FAFAF8', '#2F5D50', '#183B31', '#F2B441'), ('Linen', '#F7F4ED', '#6B5B45', '#362D21', '#E8A24A'),
    ('Fjord', '#F6F8FA', '#2C5470', '#153042', '#F0A93C'), ('Slate', '#F8F9FA', '#3F4A55', '#242C34', '#EFA93F'),
    ('Night', '#141218', '#C3A9E8', '#1A1522', '#F0B98F'), ('Midnight', '#0C1720', '#9DB8F5', '#092632', '#F5C382')]

STEPS = [
    ('Open your app', 'Download the PDF in your Etsy order and open your Recipe Library Studio link. Install it like an app: the install icon in Chrome or Edge, or Share → Add to Home Screen on iPhone.'),
    ('Add your recipes', 'Paste a recipe link, paste up to 100 links at once, paste a whole recipe page, or type in family favorites.'),
    ('Plan, shop and cook', 'Drop recipes into your week, send the ingredients to your shopping list, then cook step by step with built-in timers.'),
]

ANATOMY = [
    ('Start cooking', 'Big, one-step-at-a-time cook mode with timers. Use the arrow keys or tap to move on.'),
    ('Favorite, Made it, Plan', 'Heart the keepers, log each time you cook with a rating and a note, or add it to a day in your plan.'),
    ('Serves, US and Metric', 'Change the servings and every amount scales. Switch between the original, US and metric units.'),
    ('Shopping list and copy', 'Send the ingredients to your list (things in your pantry are skipped) or copy them as clean text.'),
    ('Step timers', 'Any step with a time gets a one-tap timer.'),
    ('Edit and Print / PDF', 'Fix anything, add a photo, then print a clean recipe card or save it as a PDF.'),
]

TOOLBOX = [
    ('Kitchen', 'Your dashboard: recipes saved, meals cooked, what to cook next and where your recipes come from.'),
    ('Recipes', 'Search, filter by category, tag, collection or time, switch between cards and a table, and edit many at once.'),
    ('Add a recipe', 'Import from a link, import many links, paste a page, type a recipe, and check whether a website imports.'),
    ('Meal plan', 'Plan the week with servings, drag meals between days, Fill my week, Copy last week, and print the plan.'),
    ('Shopping list', 'Sorted by aisle, scaled to your servings, with staples, check-offs and one-tap copy.'),
    ('Pantry', 'Keep what you have and see What can I cook: recipes you can make now or with just a few things more.'),
    ('Settings & backup', 'Themes, units, backups (merge or replace), a backup folder, CSV export and the welcome tour.'),
]

NOTE_OK = ('Best for setting up and printing: a computer',
           'Chrome, Edge, Safari or Firefox on a Mac or PC gives you the most room for planning, and the easiest printing and saving as PDF.')
NOTE_PHONE = ('iPhone, iPad and Android: good to know', [
    'iPhone and iPad: open your link in Safari, then Share → Add to Home Screen to install it.',
    'Android: open your link in Chrome, then menu → Install app.',
    'Each phone, tablet and computer keeps its own library. Move recipes with Back up, then Restore → Merge on the other device.',
    'For printing recipe books and saving PDFs, a computer is easiest.'])
NOTE_STORAGE = ('Your recipes are saved in your browser — please read', [
    'Your library saves automatically in this browser, on this device.',
    'Clearing your browser cache, history or site data will permanently delete your saved recipes.',
    'Recipes do not carry over between browsers or devices: Chrome and Safari keep separate libraries.',
    'Download a backup regularly (Settings & backup), or choose a backup folder in Chrome or Edge to save one after every change.'])

FAQ = [
    ('A link didn’t import. Why?', 'A few big sites, such as Allrecipes and NYT Cooking, block apps from reading their pages. Open the recipe, select everything (Ctrl+A or ⌘A), copy, and use Paste the page text. Add a recipe lists the sites that import well and the ones that need this step.'),
    ('Which sites work best?', 'Twenty are tested, including HelloFresh, BBC Good Food, Taste of Home, King Arthur Baking, Tasty, RecipeTin Eats and Pinch of Yum. Most food blogs with a Jump to recipe button work too. Use Check a website to test any other site.'),
    ('Can I use it on my phone and my computer?', 'Yes. Each device keeps its own library. Download a backup on one and restore it on the other; choose Merge to combine both without duplicates.'),
    ('Do I need the internet?', 'You need a connection to open the app the first time and to import from links. Your saved recipes, plan and lists live on your device.'),
    ('Is my data private?', 'Your library is stored only in your own browser. When you import a link, the page is read to pull out the recipe; nothing is kept.'),
    ('How do I make a recipe book?', 'Group recipes into a collection, press Book, pick a cover style, then print or choose Save as PDF.'),
    ('I cleared my browser. Can I get my recipes back?', 'Only from a backup file. That’s why the app reminds you to back up and can save to a folder automatically.'),
    ('I need help.', f'Email {EMAIL} and we’ll sort it out.'),
]

BASE_CSS = """
:root{--paper:#FBF8F5;--card:#fff;--sunk:#F4EEE8;--ink:#221A15;--ink-2:#5E5048;--ink-3:#8C7E75;--rule:#EEE5DD;--accent:#A4471F;--accent-soft:#FAEDE6;--bold:#2D1B12;--bold-2:#3A2419;--on-bold:#FBF3EE;--on-bold-dim:#CBB3A5;--pop:#F2B441;--ok:#1F7A52}
*{box-sizing:border-box;margin:0}
body{font-family:'DM Sans',system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);background:var(--paper);line-height:1.55;-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:'Manrope','DM Sans',system-ui,sans-serif;letter-spacing:-.02em;line-height:1.15}
.serif{font-family:'Playfair Display',Georgia,serif;font-weight:600;letter-spacing:-.01em}
.eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:var(--accent)}
.shot{display:block;width:100%;border-radius:12px;border:1px solid var(--rule);box-shadow:0 18px 40px -18px rgba(45,27,18,.35)}
.notice{border-radius:14px;padding:16px 18px;border:1px solid;display:grid;gap:6px}
.notice b{font-size:15px}.notice ul{padding-left:18px;display:grid;gap:4px}
.n-ok{background:#E7F3EC;border-color:#B4D9C6;color:#17432F}
.n-phone{background:#FBE6E3;border-color:#F0BDB4;color:#6E2318}
.n-store{background:#FDF4DE;border-color:#F0D58E;color:#5B4210}
.theme-card{border-radius:14px;overflow:hidden;border:1px solid var(--rule);background:#fff}
.theme-card .sw{display:grid;grid-template-columns:30% 1fr;height:84px}
.theme-card .sw div:last-child{display:grid;align-content:center;gap:7px;padding:0 12px}
.theme-card .bar{height:9px;border-radius:9px}
.theme-card .bar.s{width:60%}
.theme-card span{display:block;padding:8px 12px;font-weight:700;font-size:13px}
.faq-item{padding:14px 0;border-bottom:1px solid var(--rule)}.faq-item b{display:block;margin-bottom:4px}
"""
FONTS = '<style>' + (HERE.parent / 'src' / 'fonts.css').read_text() + '</style>'
_GF = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&family=Manrope:wght@700;800&family=Playfair+Display:wght@600&display=swap" rel="stylesheet">'


def theme_cards():
    return ''.join(f'<div class="theme-card"><div class="sw"><div style="background:{s}"></div><div style="background:{p}"><div class="bar" style="background:{a}"></div><div class="bar s" style="background:{h}"></div></div></div><span>{n}</span></div>' for n, p, a, s, h in THEMES)


def notices():
    li = lambda xs: '<ul>' + ''.join(f'<li>{x}</li>' for x in xs) + '</ul>'
    return (f'<div class="notice n-ok tip"><b>✅ {NOTE_OK[0]}</b><span>{NOTE_OK[1]}</span></div>'
            f'<div class="notice n-phone tip"><b>📱 {NOTE_PHONE[0]}</b>{li(NOTE_PHONE[1])}</div>'
            f'<div class="notice n-store tip"><b>⚠️ {NOTE_STORAGE[0]}</b>{li(NOTE_STORAGE[1])}</div>')


# ---------------------------------------------------------------- print guide
def print_guide():
    steps = ''.join(f'<div class="step"><i>{i+1}</i><div><h3>{t}</h3><p>{d}</p></div></div>' for i, (t, d) in enumerate(STEPS))
    anat = ''.join(f'<div class="step"><i>{i+1}</i><div><h3>{t}</h3><p>{d}</p></div></div>' for i, (t, d) in enumerate(ANATOMY))
    tools = ''.join(f'<div class="tool"><h3>{t}</h3><p>{d}</p></div>' for t, d in TOOLBOX)
    faq = ''.join(f'<div class="faq-item"><b>{q}</b><span>{a}</span></div>' for q, a in FAQ)
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{APP} · How-to guide</title>{FONTS}<style>{BASE_CSS}
@page{{size:auto;margin:14mm}}
body{{background:#fff}}.wrap{{max-width:780px;margin:auto;padding:32px 20px}}
section{{padding:8px 0 24px}}
.hero{{background:var(--bold);color:var(--on-bold);border-radius:20px;padding:36px;display:grid;gap:10px;margin-bottom:26px}}
.hero .eyebrow{{color:var(--pop)}}.hero h1{{font-size:40px}}.hero p{{color:var(--on-bold-dim);font-size:16px;max-width:560px}}
.logo{{display:flex;align-items:center;gap:10px;font-weight:700}}.logo i{{width:36px;height:36px;border-radius:10px;background:var(--pop);color:var(--bold);display:grid;place-items:center;font-style:normal;font-weight:800}}
.section-title{{font-size:26px;margin:4px 0 6px}}.lead{{color:var(--ink-2);margin-bottom:18px}}
.step{{display:grid;grid-template-columns:34px 1fr;gap:14px;padding:14px 0;border-bottom:1px solid var(--rule)}}
.step i{{width:30px;height:30px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-style:normal;font-weight:800}}
.step h3{{font-size:16px;margin-bottom:2px}}.step p,.tool p{{color:var(--ink-2);font-size:14px}}
.tools{{display:grid;grid-template-columns:1fr 1fr;gap:12px}}.tool{{border:1px solid var(--rule);border-radius:14px;padding:14px 16px;break-inside:avoid}}.tool h3{{font-size:15px;margin-bottom:4px;color:var(--accent)}}
.themes{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:8px}}
.notes{{display:grid;gap:12px;margin-top:14px}}
.tips{{display:grid;gap:8px;padding-left:18px;color:var(--ink-2);font-size:14px}}
.foot{{margin-top:28px;font-size:12px;color:var(--ink-3);text-align:center}}.foot a{{color:inherit}}
@media print {{
  * {{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }}
  body {{ background: white !important; }}
  .wrap {{ padding: 0; max-width: none; }}
  .shot {{ max-height: 300px; object-fit: cover; object-position: top left; }}
  .step {{ padding: 9px 0; }} .faq-item {{ padding: 9px 0; }} .lead {{ margin-bottom: 10px; }}
  .tools {{ gap: 8px; }} .tool {{ padding: 10px 14px; }}
  .pb {{ break-before: page; page-break-before: always; }}
  .step, .tip, .faq-item, .theme-card, .tool, .shot {{ break-inside: avoid; page-break-inside: avoid; }}
  .section-title {{ break-after: avoid; page-break-after: avoid; }}
  .hero-plane {{ animation: none !important; }}
}}
</style></head><body><div class="wrap">
<section><div class="hero"><div class="logo"><i>R</i>{SHOP}</div><div class="eyebrow">How-to guide</div><h1 class="serif">{APP}</h1>
<p>Save recipes from a link, plan your week, shop smarter and print beautiful recipe books. Here’s everything in a few pages.</p></div>
<h2 class="section-title">Get started in 3 steps</h2>{steps}</section>

<section class="pb"><div class="eyebrow">Page 2</div><h2 class="section-title">A recipe page, piece by piece</h2><p class="lead">Every recipe you import or type looks like this. Click any part to use it.</p>
<img class="shot" src="{IMG['recipe']}" alt="A recipe page in Recipe Library Studio">{anat}</section>

<section class="pb"><div class="eyebrow">Page 3</div><h2 class="section-title">8 color themes</h2><p class="lead">Pick one in Settings &amp; backup. It changes the whole app, and your printouts stay crisp black and white with a touch of color.</p>
<div class="themes">{theme_cards()}</div>
<img class="shot" style="margin-top:22px" src="{IMG['dashboard']}" alt="The Kitchen dashboard in the Kiln theme"></section>

<section class="pb"><div class="eyebrow">Page 4</div><h2 class="section-title">Your toolbox</h2><p class="lead">Everything lives in the sidebar. On a phone, tap ☰ to open it.</p><div class="tools">{tools}</div>
<img class="shot" style="margin-top:18px" src="{IMG['plan']}" alt="The weekly meal plan"></section>

<section class="pb"><div class="eyebrow">Page 5</div><h2 class="section-title">Printing tips and important notes</h2>
<ul class="tips"><li>Press Print / PDF on any recipe, your meal plan or your shopping list. Choose Letter or A4 in the print window, or Save as PDF.</li>
<li>For a recipe book: Recipes → Collections → Book. Pick a cover style and which recipes to include.</li>
<li>Turn on Background graphics in the print window if your cover prints without color.</li></ul>
<div class="notes">{notices()}</div></section>

<section class="pb"><div class="eyebrow">Page 6</div><h2 class="section-title">Questions</h2>{faq}
<p class="foot">{APP} by {CONTACT_HTML}<br>Personal use by the purchaser.</p></section>
</div></body></html>"""


# ---------------------------------------------------------------- dynamic guide
def dynamic_guide():
    pages, labels = [], ['Welcome', '3 Steps', 'Recipe Page', 'Color Themes', 'Toolbox', 'Print & Notes', 'FAQ']
    chips = ''.join(f'<span class="chip">{c}</span>' for c in ['Import from a link', '100 links at once', 'Meal planner', 'Shopping list', 'Pantry', 'Cook mode', 'Recipe book PDF', '8 themes'])
    pages.append(f'<div class="hero"><div class="eyebrow">Welcome</div><h1 class="serif">{APP}</h1><p>Your recipes, your week and your shopping list, in one calm place. Use the arrows below to take the tour.</p><div class="chips">{chips}</div></div><img class="shot" src="{IMG["dashboard"]}" alt="">')
    pages.append('<h2>Get started in 3 steps</h2><div class="cards3">' + ''.join(f'<div class="card"><i>{i+1}</i><h3>{t}</h3><p>{d}</p></div>' for i, (t, d) in enumerate(STEPS)) + f'</div><img class="shot" src="{IMG["import"]}" alt="">')
    pages.append(f'<h2>A recipe page, piece by piece</h2><img class="shot" src="{IMG["recipe"]}" alt=""><div class="grid2">' + ''.join(f'<div class="row"><i>{i+1}</i><div><b>{t}</b><p>{d}</p></div></div>' for i, (t, d) in enumerate(ANATOMY)) + '</div>')
    pages.append(f'<h2>8 color themes</h2><p class="lead">Choose one in Settings &amp; backup. Night and Midnight are dark modes.</p><div class="themes">{theme_cards()}</div>')
    pages.append('<h2>Your toolbox</h2><div class="grid2">' + ''.join(f'<div class="card"><h3>{t}</h3><p>{d}</p></div>' for t, d in TOOLBOX) + f'</div><div class="grid2" style="margin-top:16px"><img class="shot" src="{IMG["shopping"]}" alt=""><img class="shot" src="{IMG["pantry"]}" alt=""></div>')
    pages.append(f'<h2>Printing and important notes</h2><ul class="tips"><li>Press Print / PDF on any recipe, your meal plan or your shopping list, then choose Letter or A4, or Save as PDF.</li><li>For a recipe book: Recipes → Collections → Book. Pick a cover and the recipes.</li><li>No color on the cover? Turn on Background graphics in the print window.</li></ul><div class="notes">{notices()}</div>')
    pages.append('<h2>Questions</h2>' + ''.join(f'<div class="faq-item"><b>{q}</b><span>{a}</span></div>' for q, a in FAQ) )
    body = ''.join(f'<section class="page{" active" if i == 0 else ""}" id="p{i+1}">{p}</section>' for i, p in enumerate(pages))
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{APP} · Guide</title>{FONTS}<style>{BASE_CSS}
header{{position:fixed;top:0;left:0;right:0;height:60px;background:var(--bold);color:var(--on-bold);display:flex;align-items:center;justify-content:space-between;padding:0 18px;z-index:5;gap:12px}}
.logo{{display:flex;align-items:center;gap:10px;font-weight:700;font-size:14px;white-space:nowrap}}.logo i{{width:30px;height:30px;border-radius:9px;background:var(--pop);color:var(--bold);display:grid;place-items:center;font-style:normal;font-weight:800}}
.dots{{display:flex;gap:8px}}.dots button{{width:10px;height:10px;border-radius:50%;border:0;background:#ffffff40;cursor:pointer;padding:0}}.dots button.on{{background:var(--pop);width:26px;border-radius:10px}}
.count{{font-size:13px;color:var(--on-bold-dim);white-space:nowrap}}
main{{max-width:920px;margin:auto;padding:84px 18px 110px}}
.page{{display:none}}.page.active{{display:block;animation:fadeIn .3s ease}}.page.active.back{{animation-name:fadeBack}}
@keyframes fadeIn{{from{{opacity:0;transform:translateX(12px)}}}}@keyframes fadeBack{{from{{opacity:0;transform:translateX(-12px)}}}}
h2{{font-size:30px;margin:6px 0 14px}}.lead{{color:var(--ink-2);margin-bottom:16px}}
.hero{{background:var(--bold);color:var(--on-bold);border-radius:20px;padding:34px;margin-bottom:20px;display:grid;gap:10px}}.hero .eyebrow{{color:var(--pop)}}.hero h1{{font-size:44px}}.hero p{{color:var(--on-bold-dim);max-width:560px}}
.chips{{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}}.chip{{background:#ffffff14;border:1px solid #ffffff2a;border-radius:99px;padding:6px 12px;font-size:13px;font-weight:600}}
.cards3{{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}}.grid2{{display:grid;grid-template-columns:1fr 1fr;gap:12px}}
.card{{background:#fff;border:1px solid var(--rule);border-radius:14px;padding:16px}}.card i,.row i{{width:30px;height:30px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-style:normal;font-weight:800;margin-bottom:8px}}
.card h3{{font-size:16px;margin-bottom:4px}}.card p,.row p{{color:var(--ink-2);font-size:14px}}
.row{{display:grid;grid-template-columns:34px 1fr;gap:10px;padding:12px 0;border-bottom:1px solid var(--rule)}}.row i{{margin:0}}
.shot{{margin:14px 0}}
.themes{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}}
.notes{{display:grid;gap:12px;margin-top:16px}}.tips{{display:grid;gap:8px;padding-left:18px;color:var(--ink-2)}}
.foot{{margin-top:22px;color:var(--ink-3);font-size:13px}}.foot a{{color:var(--accent)}}
nav{{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid var(--rule);display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px}}
nav button{{font:inherit;font-weight:700;border-radius:12px;padding:11px 18px;border:1px solid var(--rule);background:#fff;cursor:pointer;color:var(--ink)}}nav button.next{{background:var(--accent);border-color:var(--accent);color:#fff}}nav button:disabled{{opacity:.4;cursor:default}}
.contact{{margin-top:28px;padding-top:14px;border-top:1px solid var(--rule);text-align:center;font-size:13px;color:var(--ink-3)}}.contact a{{color:inherit}}
#nav-label{{font-weight:700;color:var(--ink-2);font-size:14px;text-align:center}}
@media(max-width:700px){{.cards3,.grid2,.themes{{grid-template-columns:1fr 1fr}}.cards3{{grid-template-columns:1fr}}.logo span{{display:none}}.hero h1{{font-size:34px}}h2{{font-size:24px}}}}
@media(prefers-reduced-motion:reduce){{.page.active{{animation:none}}}}
</style></head><body>
<header><div class="logo"><i>R</i><span>{APP}</span></div><div class="dots" id="dots"></div><div class="count" id="count">1 of 7</div></header>
<main>{body}<p class="contact">{CONTACT_HTML}</p></main>
<nav><button id="prev" onclick="navigate(-1)">← Previous</button><span id="nav-label">Welcome</span><button class="next" id="next" onclick="navigate(1)">Next →</button></nav>
<script>
const pages = ['p1','p2','p3','p4','p5','p6','p7'];
const labels = {labels!r};
let current = 0;
const dots = document.getElementById('dots');
pages.forEach((p, i) => {{ const b = document.createElement('button'); b.setAttribute('aria-label', 'Go to ' + labels[i]); b.onclick = () => goTo(i); dots.appendChild(b); }});
function goTo(idx) {{
  if (idx < 0 || idx >= pages.length || idx === current) return;
  const back = idx < current;
  document.getElementById(pages[current]).classList.remove('active', 'back');
  current = idx;
  const p = document.getElementById(pages[current]);
  p.classList.toggle('back', back);
  p.classList.add('active');
  updateUI();
}}
function navigate(dir) {{ goTo(current + dir); }}
function updateUI() {{
  [...dots.children].forEach((d, i) => d.classList.toggle('on', i === current));
  document.getElementById('count').textContent = (current + 1) + ' of ' + pages.length;
  document.getElementById('nav-label').textContent = labels[current];
  document.getElementById('prev').disabled = current === 0;
  const n = document.getElementById('next'); n.disabled = current === pages.length - 1;
  window.scrollTo(0, 0);
}}
document.addEventListener('keydown', e => {{ if (e.key === 'ArrowRight') navigate(1); if (e.key === 'ArrowLeft') navigate(-1); }});
updateUI();
</script></body></html>"""


# ---------------------------------------------------------------- mockups
def mockups():
    E = 'contenteditable="true" spellcheck="false"'
    browser = lambda img, w='100%': f'<div class="browser" style="width:{w}"><div class="bar"><i></i><i></i><i></i><span>recipe-library-studio.app</span></div><img src="{IMG[img]}" alt=""></div>'
    phone = lambda img, w=270: f'<div class="phone" style="width:{w}px;height:{int(w*2.05)}px"><img src="{IMG[img]}" alt=""></div>'
    pill = lambda t: f'<span class="pill" {E}>{t}</span>'
    sites = ['HelloFresh', 'BBC Good Food', 'Taste of Home', 'King Arthur Baking', 'Tasty', 'RecipeTin Eats', 'Pinch of Yum', 'Love and Lemons', 'Cafe Delites', 'Damn Delicious', 'Just One Cookbook', 'Well Plated']
    s1 = f'''<section class="slide dark" id="s1">
 <div class="top"><div class="brandline" {E}>{SHOP} · Recipe keeper web app</div>
 <h1 class="title" {E}>Save your recipes<br>from a link.</h1>
 <p class="sub" {E}>Your recipes, your week and your shopping list, in one calm place.</p></div>
 <div class="hero-shots">{browser('dashboard', '1040px')}{phone('phone-recipe', 250)}</div>
 <div class="pills">{''.join(pill(t) for t in ['Link import', 'Meal planner', 'Shopping list', 'Pantry', 'Cook mode', 'Recipe book PDF'])}</div>
 <div class="foot" {E}>Instant access · Works on computer, tablet and phone · {SITE}</div></section>'''
    s2 = f'''<section class="slide light" id="s2">
 <div class="top"><div class="kicker" {E}>Import</div><h1 class="title" {E}>Paste a link. Get just the recipe.</h1>
 <p class="sub" {E}>Ingredients, steps, times, servings, nutrition and photo, without the ads or the life story.</p></div>
 <div class="split"><div style="width:880px">{browser('import')}</div>
 <div class="side"><div class="box"><h3 {E}>20 tested sites</h3><div class="chips">{''.join(f'<span {E}>{x}</span>' for x in sites)}<span class="more" {E}>+ 8 more</span></div></div>
 <div class="box"><h3 {E}>100 links at once</h3><p {E}>Moving from bookmarks or Pinterest? Paste them all and watch them land.</p></div>
 <div class="box"><h3 {E}>Site blocks apps?</h3><p {E}>Copy the page, paste it in. The app finds the ingredients and steps.</p></div></div></div>
 <div class="foot" {E}>The app shows which sites import in one step and which need the paste.</div></section>'''
    s3 = f'''<section class="slide light" id="s3">
 <div class="top"><div class="kicker" {E}>Plan &amp; shop</div><h1 class="title" {E}>Plan the week. Shop in one tap.</h1>
 <p class="sub" {E}>Drag meals between days, fill the week automatically, and get a shopping list sorted by aisle.</p></div>
 <div class="trio">{browser('plan', '900px')}<div class="col">{phone('phone-shopping', 240)}</div></div>
 <div class="pills light">{''.join(pill(t) for t in ['Fill my week', 'Copy last week', 'Scales to servings', 'Skips what’s in your pantry', 'What can I cook?'])}</div></section>'''
    s4 = f'''<section class="slide light" id="s4">
 <div class="s4-top"><div class="kicker" {E}>How it works</div><h1 class="title" {E}>Up and cooking in 3 steps</h1></div>
 <div class="s4-body"><div class="steps">{''.join(f'<div class="stepc"><i>{i+1}</i><h3 {E}>{t}</h3><p {E}>{d}</p></div>' for i, (t, d) in enumerate(STEPS))}</div>
 <div class="row3">{''.join(f'<img src="{IMG[x]}" alt="">' for x in ['import', 'library', 'cook'])}</div></div></section>'''
    s5 = f'''<section class="slide dark" id="s5">
 <div class="top"><div class="kicker" {E}>Print &amp; make it yours</div><h1 class="title" {E}>Print it beautifully.</h1>
 <p class="sub" {E}>Recipe cards, meal plans and shopping lists in Letter or A4, and a recipe book with a designer cover.</p></div>
 <div class="books"><img class="paper" src="{IMG['book-cover']}" alt=""><img class="paper p2" src="{IMG['book-page']}" alt="">
 <div class="themes-box"><h3 {E}>8 color themes</h3><div class="sw">{''.join(f'<div><span style="background:{s}"></span><span style="background:{a}"></span><span style="background:{h}"></span><b {E}>{n}</b></div>' for n, p, a, s, h in THEMES)}</div><p {E}>Including two dark modes.</p></div></div>
 <div class="foot" {E}>{CONTACT}</div></section>'''
    navbtns = ''.join(f'<button onclick="document.getElementById(&quot;s{i}&quot;).scrollIntoView()">{i}</button>' for i in range(1, 6))
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{APP} · Etsy mockups</title>{FONTS}<style>{BASE_CSS}
body{{background:#d9d4cf;padding:80px 0 60px}}
.guide{{position:fixed;top:0;left:0;right:0;z-index:9;background:#1A1A2E;color:#fff;font-size:13px;display:flex;align-items:center;gap:16px;padding:10px 16px;flex-wrap:wrap}}
.guide b{{color:#F2B441}}.guide button{{font:inherit;font-weight:700;background:#ffffff1a;color:#fff;border:0;border-radius:8px;padding:6px 10px;cursor:pointer}}
[contenteditable] {{ outline: none; cursor: text; border-radius: 2px; transition: background .1s; }}
[contenteditable]:hover {{ background: rgba(255,255,255,0.1); }}
[contenteditable]:focus {{ background: rgba(255,255,255,0.18); box-shadow: 0 0 0 1px rgba(255,255,255,0.25); }}
.slide{{width:1500px;height:1125px;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0 auto 40px;padding:70px 80px;position:relative}}
.dark{{background:radial-gradient(900px 600px at 85% 90%,#5a3a1e 0,transparent 70%),var(--bold);color:var(--on-bold)}}
.light{{background:var(--paper)}}
.title{{font-size:76px;line-height:1.02}}.dark .title{{color:#fff}}
.sub{{font-size:23px;margin-top:14px;max-width:1000px;color:var(--ink-2)}}.dark .sub{{color:var(--on-bold-dim)}}
.brandline,.kicker{{font-size:17px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:var(--pop);margin-bottom:16px}}.light .kicker{{color:var(--accent)}}
.foot{{font-size:18px;color:var(--ink-3)}}.dark .foot{{color:var(--on-bold-dim)}}
.browser{{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 40px 80px -30px rgba(0,0,0,.55);flex-shrink:0}}
.browser .bar{{height:38px;background:#efe9e3;display:flex;align-items:center;gap:8px;padding:0 16px}}.browser .bar i{{width:12px;height:12px;border-radius:50%;background:#d9cfc6}}
.browser .bar span{{margin-left:16px;font-size:13px;color:#8C7E75;background:#fff;border-radius:8px;padding:3px 14px}}
.browser img{{display:block;width:100%}}
.phone{{border-radius:40px;background:#111;padding:12px;box-shadow:0 40px 80px -30px rgba(0,0,0,.6);flex-shrink:0;overflow:hidden}}.phone img{{display:block;width:100%;border-radius:30px;height:auto}}
.hero-shots{{position:relative;height:540px}}.hero-shots .browser{{position:absolute;left:0;top:0;height:540px}}.hero-shots .browser img{{height:502px;object-fit:cover;object-position:top}}.hero-shots .phone{{position:absolute;right:60px;top:40px}}
.pills{{display:flex;flex-wrap:wrap;gap:12px}}.pill{{font-size:18px;font-weight:700;padding:13px 26px;border-radius:99px;background:#ffffff14;border:1px solid #ffffff30;color:#fff}}
.pills.light .pill{{background:var(--accent-soft);border-color:#EFD6C8;color:var(--accent)}}
.split{{display:flex;gap:40px;align-items:flex-start}}.split .browser img{{height:560px;object-fit:cover;object-position:top}}
.side{{flex:1;display:grid;gap:16px;min-width:0}}.box{{background:#fff;border:1px solid var(--rule);border-radius:18px;padding:20px 22px}}.box h3{{font-size:24px;margin-bottom:8px}}.box p{{font-size:18px;color:var(--ink-2)}}
.chips{{display:flex;flex-wrap:wrap;gap:7px}}.chips span{{font-size:15px;font-weight:700;border:1px solid var(--rule);border-radius:99px;padding:6px 12px;white-space:nowrap}}.chips .more{{color:var(--accent);border-color:#EFD6C8}}
.trio{{display:flex;gap:40px;align-items:center}}.trio .browser img{{height:560px;object-fit:cover;object-position:top}}.trio .col{{flex:1;display:flex;justify-content:center}}
#s4 {{ justify-content: flex-start; padding:0 }}
.s4-top {{ flex-shrink: 0; background:var(--bold);padding:60px 80px 50px }}.s4-top .kicker{{color:var(--pop)}}.s4-top .title{{color:#fff}}
.s4-body {{ flex: 1; display: flex; flex-direction: column; justify-content: space-evenly; padding:0 80px }}
.steps{{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}}.stepc i{{width:56px;height:56px;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:24px;margin-bottom:16px}}
.stepc h3{{font-size:25px;margin-bottom:8px}}.stepc p{{font-size:18px;color:var(--ink-2)}}
.row3{{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}}.row3 img{{width:100%;height:250px;object-fit:cover;object-position:top left;border-radius:14px;border:1px solid var(--rule);box-shadow:0 20px 40px -20px rgba(45,27,18,.4)}}
.books{{display:flex;gap:36px;align-items:flex-end}}.paper{{width:380px;border-radius:6px;box-shadow:0 40px 70px -25px rgba(0,0,0,.7);transform:rotate(-3deg)}}.paper.p2{{width:470px;transform:rotate(2deg);margin-left:-60px;margin-bottom:-10px}}
.themes-box{{flex:1;background:#ffffff10;border:1px solid #ffffff26;border-radius:20px;padding:26px 28px;align-self:center}}.themes-box h3{{font-size:25px;color:#fff;margin-bottom:16px}}.themes-box p{{color:var(--on-bold-dim);font-size:17px;margin-top:14px}}
.themes-box .sw{{display:grid;grid-template-columns:repeat(2,1fr);gap:12px 18px}}.themes-box .sw div{{display:flex;align-items:center;gap:6px}}.themes-box .sw span{{width:24px;height:24px;border-radius:7px;border:1px solid #ffffff30}}.themes-box b{{margin-left:6px;font-size:17px}}
</style></head><body>
<div class="guide"><b>✈ {APP.upper()}</b><span>[1] DevTools (F12) → Toggle device toolbar → custom size <b>1500 × 1125</b></span><span>[2] ⋮ menu → “Capture screenshot” for each slide (2× screen = 3000 × 2250)</span><span>✏ Click any text to edit</span>{navbtns}</div>
{s1}{s2}{s3}{s4}{s5}</body></html>"""


(HERE / 'how-to-guide-print.html').write_text(print_guide())
(HERE / 'how-to-guide-dynamic.html').write_text(dynamic_guide())
(HERE / 'etsy-mockups.html').write_text(mockups())
print('written')
