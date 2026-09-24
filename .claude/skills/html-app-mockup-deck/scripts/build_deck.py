"""Build a 1500x1125 Etsy listing-image deck from a JSON config.

usage: python build_deck.py deck.json
Paths in the config are relative to the config file. Images are embedded as
base64, so the output is one self-contained HTML file.
"""
import io,base64,os,sys,json,html
HERE=os.path.dirname(os.path.abspath(__file__)); ASSETS=os.path.join(HERE,'..','assets')
cfg_path=os.path.abspath(sys.argv[1]); BASE=os.path.dirname(cfg_path)
C=json.load(io.open(cfg_path,encoding='utf-8'))
def rel(p): return p if os.path.isabs(p) else os.path.join(BASE,p)
def asset(n): return io.open(os.path.join(ASSETS,n),encoding='utf-8').read()
IMG=rel(C.get('images_dir','shots'))
def pic(n,key,alt=''):
    ext=n.rsplit('.',1)[-1].lower(); mime='jpeg' if ext in('jpg','jpeg') else ext
    with open(os.path.join(IMG,n),'rb') as f: b=base64.b64encode(f.read()).decode()
    return f'<img data-img="{key}" src="data:image/{mime};base64,{b}" alt="{html.escape(alt)}">'
E='contenteditable="true" spellcheck="false"'
FOOT=C.get('footer','')
b=C.get('brand',{})
brand=':root{'+''.join(f'--{k}:{v};' for k,v in b.items())+'}' if b else ''
FONTS=io.open(rel(C['fonts_css']),encoding='utf-8').read() if C.get('fonts_css') else asset('fonts.css')

def slide(i,s):
    sid=f's{i}'; kind=s.get('kind','tab'); dark=' dark' if s.get('dark') else ''
    label=f'<div class="slide-label">Slide {i} — {s.get("label",s.get("eyebrow",""))}</div>\n'
    foot=f'<div class="foot" {E}>{s.get("foot",FOOT)}</div>'
    eb=f'<div class="eyebrow" {E}>{s.get("eyebrow","")}</div>'
    if kind=='hero':
        pills=''.join(f'<span class="pill" {E}>{p}</span>' for p in s.get('pills',[]))
        return (label+f'<div class="slide{dark}" id="{sid}">{eb}<h1 {E}>{s["headline"]}</h1>'
          +(f'<div class="pills">{pills}</div>' if pills else '')
          +f'<div class="shot">{pic(s["image"],sid,s.get("alt",""))}</div>{foot}</div>')
    if kind=='themes':
        looks=''.join(f'<div class="look"><div class="box">{pic(t["image"],"theme-"+str(n),t["name"]+" theme")}</div>'
          f'<div class="name"><i style="background:{t["swatch"]}"></i><span {E}>{t["name"]}</span></div></div>'
          for n,t in enumerate(s['themes']))
        cols=s.get('columns',4)
        return (label+f'<div class="slide{dark}" id="{sid}">{eb}<h2 {E}>{s["headline"]}</h2>'
          f'<div class="looks" style="grid-template-columns:repeat({cols},minmax(0,1fr))">{looks}</div>{foot}</div>')
    sub=f'<p class="sub" {E}>{s["sub"]}</p>' if s.get('sub') else ''
    return (label+f'<div class="slide{dark}" id="{sid}">{eb}<h2 {E}>{s["headline"]}</h2>{sub}'
      f'<div class="shot">{pic(s["image"],sid,s["headline"])}</div>{foot}</div>')

SLIDES=[slide(i+1,s) for i,s in enumerate(C['slides'])]
L=C.get('listing')
listing=''
if L:
    desc=L.get('description','')
    if L.get('description_file'): desc=io.open(rel(L['description_file']),encoding='utf-8').read()
    tags=L.get('tags',[])
    listing=('<div class="listing"><h3>Etsy listing copy</h3>'
     '<p class="lead">Not a slide — nothing here is screenshotted. Select and copy each block straight into Etsy.</p>'
     f'<h4>Title</h4><pre>{html.escape(L["title"])}</pre><p class="hint">{len(L["title"])} characters (Etsy max 140).</p>'
     f'<h4>Keywords — {len(tags)} tags, each 20 characters or fewer</h4><pre>{html.escape(", ".join(tags))}</pre>'
     '<p class="hint">Paste as one line; Etsy splits them on the commas.</p>'
     f'<h4>Description</h4><pre>{html.escape(desc.strip())}</pre>'
     '<p class="hint">Plain text only — Etsy strips markdown, so use real • characters.</p></div>')
    bad=[t for t in tags if len(t)>20]
    if bad or len(tags)>13 or len(L['title'])>140: print('WARNING listing limits:',bad,len(tags),len(L['title']))

name=C['product']
OUT=('<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'
 f'<title>{html.escape(name)} · Etsy listing mockups (1500 × 1125)</title>\n<style>'
 +FONTS+asset('deck.css')+brand+asset('swap.css')+'</style></head><body>\n'
 f'<div class="bar"><b>{html.escape(name.upper())} — listing slides</b>'
 '<span>1500 × 1125 · DevTools (F12) → device toolbar → custom 1500 × 1125 → ⋮ → Capture screenshot</span>'
 '<span>✏ Click any text to edit · 🖼 Click or drag a screenshot onto any picture to replace it</span>'
 '<span><button onclick="MPSwap.toggle(this)">🖼 Replace images: ON</button> '
 '<button onclick="MPSwap.reset()">Reset pictures</button></span>'
 +('<span>📝 Listing title, tags and description are at the bottom of this page</span>' if L else '')+
 '<span id="nav"></span></div>\n'+'\n\n'.join(SLIDES)+'\n\n'+listing+
 '\n<script>'+asset('swap.js').replace('mp-kit-img:',C.get('storage_prefix','mockup-img:'))+'</script>\n'
 '<script>document.querySelectorAll(".slide img[data-img]").forEach(function(i){i.title="Click, or drop a screenshot here, to replace this picture";});</script>\n'
 '<script>const slides=[...document.querySelectorAll(".slide")];'
 'document.getElementById("nav").innerHTML=slides.map((s,i)=>'
 '"<button onclick=\\"document.getElementById(\'"+s.id+"\').scrollIntoView({behavior:\'smooth\'})\\">"+(i+1)+"</button>").join(" ");'
 '</script>\n</body></html>')
out=rel(C.get('output',name.replace(' ','_')+'_Etsy_Mockups.html'))
os.makedirs(os.path.dirname(out) or '.',exist_ok=True)
io.open(out,'w',encoding='utf-8').write(OUT)
print('wrote',out,'slides',len(SLIDES),'MB %.2f'%(len(OUT)/1048576))
