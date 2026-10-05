#!/bin/sh
# Turns the recorded frames into the Etsy listing video: 1920x1080, 30 fps, H.264, no sound, sped up to fit 15 s.
#   sh listing/video/make.sh        (run record.mjs first)
cd "$(dirname "$0")"
LEN=$(python3 -c "import json;print(json.load(open('marks.json'))['end'])")
SPEED=$(python3 -c "print(max(1, $LEN/14.6))")
ffmpeg -y -loglevel error -f concat -safe 0 -i frames/list.txt \
  -vf "setpts=PTS/$SPEED,fps=30,scale=1920:1080:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -crf 18 -profile:v high -movflags +faststart -an Recipe_Library_Studio_Etsy_Video.mp4
ffprobe -v error -show_entries format=duration,size -show_entries stream=width,height,r_frame_rate -of default=nw=1 Recipe_Library_Studio_Etsy_Video.mp4
