# Builds the vertical TikTok / Pinterest video: 1080x1920, 30 fps, H.264 + AAC, about 20 s,
# with synthesized (royalty-free) sounds: a soft tap on each tap, light key ticks while typing,
# a pop when each caption appears, and a whoosh into the end card.
#   python3 listing/video/make-mobile.py      (run record-mobile.mjs first)
import json, subprocess, os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mobile'); os.chdir(D)
m = json.load(open('marks.json')); SPEED = max(1.0, m['end'] / 20.5); T = lambda t: max(0.0, t / SPEED)
OUT = '../Recipe_Library_Studio_Mobile_Video.mp4'
sfx = {  # name: (aevalsrc expression, seconds)
 'tap':   ('0.55*exp(-t*70)*sin(2*PI*1500*t)+0.25*exp(-t*140)*sin(2*PI*3100*t)', 0.09),
 'pop':   ('0.30*exp(-t*22)*sin(2*PI*(420+900*t)*t)', 0.16),
 'ticks': ('0.16*exp(-mod(t,0.055)*160)*sin(2*PI*2600*t)', round(T(m['typeEnd'] - m['typeStart']), 3)),
}
inputs, chains, n = [], [], 0
def add(expr, dur, at, extra=''):
    global n
    inputs.extend(['-f', 'lavfi', '-i', f"aevalsrc='{expr}':s=48000:d={dur}"]); n += 1
    chains.append(f"[{n}:a]{extra}adelay={int(T(at) * 1000)}|{int(T(at) * 1000)}[a{n}]")
for t in m['taps']: add(*sfx['tap'], t)
for t in m['caps'][1:]: add(*sfx['pop'], t)
add(*sfx['ticks'], m['typeStart'])
inputs.extend(['-f', 'lavfi', '-i', 'anoisesrc=color=pink:amplitude=0.35:d=0.9:r=48000']); n += 1
chains.append(f"[{n}:a]lowpass=f=1800,afade=t=in:d=0.45,afade=t=out:st=0.45:d=0.45,adelay={int(T(m['endCard'] - 0.3) * 1000)}|{int(T(m['endCard'] - 0.3) * 1000)}[a{n}]")
mix = ''.join(f'[a{i}]' for i in range(1, n + 1))
total = T(m['end'])
fc = ';'.join([f"[0:v]setpts=PTS/{SPEED},fps=30,scale=1080:1920:flags=lanczos,format=yuv420p[v]"] + chains +
              [f"{mix}amix=inputs={n}:normalize=0,apad,atrim=0:{total:.3f},alimiter=limit=0.9,aformat=channel_layouts=stereo[a]"])
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'frames/list.txt', *inputs,
                '-filter_complex', fc, '-map', '[v]', '-map', '[a]', '-t', f'{total:.3f}',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high',
                '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', OUT], check=True)
print(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,width,height', '-of', 'csv=p=0', OUT], capture_output=True, text=True).stdout)
