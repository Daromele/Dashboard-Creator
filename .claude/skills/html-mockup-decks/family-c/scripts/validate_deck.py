import io,re,base64,sys,subprocess,tempfile,os
f=sys.argv[1]; s=io.open(f,encoding='utf-8').read()
fail=[]
# unresolved tokens / TODOs
for pat in [r'@@[A-Z0-9_]+@@',r'\bTODO\b',r'\bLorem ipsum\b',r'undefined']:
    m=re.findall(pat,s)
    if m: fail.append(f'{pat}: {len(m)} hits {m[:3]}')
# tag balance for the structural tags
for tag in ['html','head','body','style','script','div','section']:
    o=len(re.findall(r'<%s[\s>]'%tag,s)); c=len(re.findall(r'</%s>'%tag,s))
    if o!=c: fail.append(f'<{tag}> {o} open vs {c} close')
# every script block parses
for i,js in enumerate(re.findall(r'<script>(.*?)</script>',s,re.S)):
    p=tempfile.NamedTemporaryFile('w',suffix='.js',delete=False); p.write(js); p.close()
    r=subprocess.run(['node','--check',p.name],capture_output=True,text=True)
    if r.returncode: fail.append(f'script {i}: {r.stderr.strip()[:200]}')
    os.unlink(p.name)
# base64 images decode, and report pixel ratios
imgs=re.findall(r'src="data:image/(\w+);base64,([A-Za-z0-9+/=]+)"',s)
print(f'images: {len(imgs)}')
for i,(kind,b) in enumerate(imgs):
    try:
        raw=base64.b64decode(b)
        from PIL import Image; im=Image.open(io.BytesIO(raw))
        print(f'  [{i}] {kind} {im.size[0]}x{im.size[1]} ratio {im.size[0]/im.size[1]:.3f} {len(raw)//1024}KB')
    except Exception as e: fail.append(f'image {i} failed to decode: {e}')
fonts=re.findall(r'url\(data:font/\w+;base64,([A-Za-z0-9+/=]+)\)',s)
print(f'fonts embedded: {len(fonts)}')
for i,b in enumerate(fonts):
    try: base64.b64decode(b)
    except Exception as e: fail.append(f'font {i} bad base64')
print('size: %.2f MB'%(len(s)/1048576))
print('FAILURES:' if fail else 'static checks: clean')
for x in fail: print('  -',x)
sys.exit(1 if fail else 0)
