
import React, { useState, useRef, useEffect } from 'react';
import { QuizQuestion, ColorTheme } from '../types';
import { drawQuizScene } from '../utils/canvas';

interface VideoRenderStepProps {
  quizData: QuizQuestion[];
  audioBlobs: (Blob | null)[];
  answerAudioBlobs: (Blob | null)[];
  onComplete: (blob: Blob) => void;
  onError: (error: string) => void;
  theme: ColorTheme;
  topic: string;
  difficulty: string;
  quizType: string;
  customBackground: string | null;
  backgroundType: 'image' | 'video' | null;
  aspectRatio: '9:16' | '16:9';
  watermark: string;
  introClip: Blob | null;
  outroClip: Blob | null;
  introAudio: Blob | null;
  backgroundMovement: string;
}

const VideoRenderStep: React.FC<VideoRenderStepProps> = ({ quizData, audioBlobs, answerAudioBlobs, onComplete, onError, theme, topic, difficulty, quizType, customBackground, backgroundType, aspectRatio, watermark, introClip, outroClip, introAudio, backgroundMovement }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('Initializing...');
  const [progress, setProgress] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const introVideoRef = useRef<HTMLVideoElement | null>(null);
  const outroVideoRef = useRef<HTMLVideoElement | null>(null);

  const isPortrait = aspectRatio === '9:16';
  const canvasWidth = isPortrait ? 1080 : 1920;
  const canvasHeight = isPortrait ? 1920 : 1080;

  useEffect(() => {
    let animationFrameId: number | null = null;
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioContext = audioContextRef.current;
    
    const renderVideo = async () => {
      if (!canvasRef.current) { onError("Canvas not found."); return; }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) { onError("Could not get 2D context from canvas."); return; }
      
      let backgroundMedia: HTMLImageElement | HTMLVideoElement | null = null;
      if (customBackground) {
        setStatus('Loading background...');
        try {
          if (backgroundType === 'image') {
            backgroundMedia = await new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = () => reject(new Error(`Failed to load background image.`));
              img.src = customBackground;
            });
          } else if (backgroundType === 'video') {
            backgroundMedia = await new Promise<HTMLVideoElement>((resolve, reject) => {
              const vid = document.createElement('video');
              vid.oncanplaythrough = () => {
                vid.muted = true;
                vid.play().then(() => resolve(vid)).catch(reject);
              };
              vid.onerror = () => reject(new Error(`Failed to load background video.`));
              vid.src = customBackground;
              vid.load();
            });
          }
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Unknown background loading error');
            return;
        }
      }

      const videoStream = canvas.captureStream(30);
      const audioDestination = audioContext.createMediaStreamDestination();

      function playBeep(time: number, freq = 880, duration = 0.1, gainValue = 0.3) {
        if (!audioContext) return;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioDestination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(gainValue, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        osc.start(time);
        osc.stop(time + duration);
      }

      function playCelebrationSound(time: number) {
        playBeep(time, 523.25, 0.2, 0.3); playBeep(time + 0.15, 659.25, 0.2, 0.3);
        playBeep(time + 0.3, 783.99, 0.2, 0.3); playBeep(time + 0.45, 1046.50, 0.3, 0.3);
      }
      
      function playCorrectSound(time: number) {
        playBeep(time, 523.25, 0.15, 0.2); playBeep(time + 0.1, 659.25, 0.15, 0.2);
      }

      const combinedStream = new MediaStream([...videoStream.getTracks(), ...audioDestination.stream.getTracks()]);
      const chunks: Blob[] = [];
      const mime = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mime)) { onError("Recording format not supported by this browser."); return; }
      
      const recorder = new MediaRecorder(combinedStream, { mimeType: mime, videoBitsPerSecond: 12000000 });
      const recordPromise = new Promise<Blob>((res, rej) => {
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => { const blob = new Blob(chunks, { type: 'video/webm' }); res(blob); };
        recorder.onerror = (e) => rej((e as any).error);
      });
      
      let totalDurS = 0;

      try {
        const C = 5, THINK_PAUSE = 2.0, REVEAL_PAUSE = 2.0, COVER = 3, FINAL = 5;
        setStatus('Decoding audio & loading media...');

        const loadVideoClip = async (clip: Blob | null) => {
          if (!clip) return { video: null, audio: null, duration: 0 };
          const url = URL.createObjectURL(clip);
          const video = document.createElement('video');
          video.muted = true;
          await new Promise((res, rej) => {
              video.onloadedmetadata = res;
              video.onerror = rej;
              video.src = url;
          });
          const audioBuffer = await clip.arrayBuffer().then(ab => audioContext.decodeAudioData(ab));
          return { video, audio: audioBuffer, duration: video.duration };
        };

        const [intro, outro, introAudioBuf, qBufs, aBufs, questionMediaElements] = await Promise.all([
            loadVideoClip(introClip),
            loadVideoClip(outroClip),
            introAudio ? introAudio.arrayBuffer().then(ab => audioContext.decodeAudioData(ab)) : Promise.resolve(null),
            Promise.all(audioBlobs.map(b => b ? b.arrayBuffer().then(ab => audioContext.decodeAudioData(ab)) : null)),
            Promise.all(answerAudioBlobs.map(b => b ? b.arrayBuffer().then(ab => audioContext.decodeAudioData(ab)) : null)),
            Promise.all(quizData.map(q => {
              if (!q.media || !q.media.url) return Promise.resolve(null);
              
              if (q.media.type === 'image') {
                return new Promise<HTMLImageElement>((resolve, reject) => {
                  const img = new Image();
                  img.onload = () => resolve(img);
                  img.onerror = () => reject(new Error('Failed to load pre-fetched image.'));
                  img.src = q.media!.url;
                });
              } else { // Video
                return new Promise<HTMLVideoElement>((resolve, reject) => {
                  const vid = document.createElement('video');
                  vid.oncanplaythrough = () => { vid.muted = true; resolve(vid); };
                  vid.onerror = () => reject(new Error('Failed to load pre-fetched video.'));
                  vid.src = q.media.url;
                  vid.load();
                });
              }
            }))
        ]);

        if(intro.video) introVideoRef.current = intro.video;
        if(outro.video) outroVideoRef.current = outro.video;

        const qDurs = qBufs.map(b => b?.duration || 0);
        const aDurs = aBufs.map(b => b?.duration || 0);

        const timeline: any[] = [];
        let time = 0;

        if (intro.duration > 0) {
            timeline.push({ phase: 'intro', startTimeS: time, durationS: intro.duration, audioBuffer: intro.audio });
            time += intro.duration;
        }

        const coverStart = time;
        // If intro audio is provided, we use that duration if it's longer than default cover time, capped at 6s
        const coverDuration = introAudioBuf ? Math.min(Math.max(COVER, introAudioBuf.duration), 6) : COVER;
        
        timeline.push({ phase: 'cover', startTimeS: time, durationS: coverDuration, coverStartTime: coverStart, audioBuffer: introAudioBuf });
        time += coverDuration;

        quizData.forEach((qItem, i) => {
          const qVoDur = qDurs[i] || 0;
          const aVoDur = aDurs[i] || 0;
          const ANS_VO_DUR = aVoDur > 0 ? aVoDur + 0.5 : 0;
          const isToT = qItem.quizType === 'This or That';

          const sceneStartTime = time;
          if (qVoDur > 0 && qBufs[i]) {
            timeline.push({ qI: i, phase: 'voiceover', startTimeS: time, durationS: qVoDur, audioBuffer: qBufs[i], sceneStartTime });
            time += qVoDur;
          } else {
            timeline.push({ qI: i, phase: 'question', startTimeS: time, durationS: 1.5, sceneStartTime });
            time += 1.5;
          }

          timeline.push({ qI: i, phase: 'think_pause', startTimeS: time, durationS: THINK_PAUSE, sceneStartTime });
          time += THINK_PAUSE;

          if (!isToT) {
            timeline.push({ qI: i, phase: 'countdown', startTimeS: time, durationS: C, sceneStartTime });
            time += C;
            timeline.push({ qI: i, phase: 'reveal_pause', startTimeS: time, durationS: REVEAL_PAUSE, sceneStartTime, revealTime: time });
            time += REVEAL_PAUSE;
            if (ANS_VO_DUR > 0 && aBufs[i]) {
              timeline.push({ qI: i, phase: 'answer_voiceover', startTimeS: time, durationS: ANS_VO_DUR, audioBuffer: aBufs[i], sceneStartTime, revealTime: time - REVEAL_PAUSE });
              time += ANS_VO_DUR;
            }
          } else {
            timeline.push({ qI: i, phase: 'reveal', startTimeS: time, durationS: C, sceneStartTime, revealTime: time });
            time += C;
          }
        });

        if (outro.duration > 0) {
            timeline.push({ phase: 'outro', startTimeS: time, durationS: outro.duration, audioBuffer: outro.audio });
            time += outro.duration;
        } else {
            timeline.push({ phase: 'final', startTimeS: time, durationS: FINAL });
            time += FINAL;
        }
        totalDurS = time;
        const audioStart = audioContext.currentTime + 0.1;

        timeline.forEach(s => {
          const schedTime = audioStart + s.startTimeS;
          if (s.audioBuffer) {
            const src = audioContext.createBufferSource();
            src.buffer = s.audioBuffer;
            src.connect(audioDestination);
            src.start(schedTime);
          }
          if (s.phase === 'cover' && !s.audioBuffer) { 
              // Play default beeps only if no intro audio
              playBeep(schedTime, 660, 0.15, 0.25); playBeep(schedTime + 1, 660, 0.15, 0.25); playBeep(schedTime + 2, 880, 0.2, 0.3); 
          }
          if (s.phase === 'countdown') { for (let i = 0; i < s.durationS - 1; i++) playBeep(schedTime + i, 440, 0.08, 0.15); playBeep(schedTime + s.durationS - 1, 660, 0.1, 0.2); }
          if (s.phase === 'reveal_pause') { playCorrectSound(schedTime); }
          if (s.phase === 'final') { playCelebrationSound(schedTime); }
        });
        
        recorder.start();
        setStatus('Rendering...');

        function loop(now: number) {
          const elapsedS = audioContext.currentTime - audioStart;
          if (elapsedS < 0) { animationFrameId = requestAnimationFrame(loop); return; }
          if (elapsedS >= totalDurS) { finalize(); return; }

          let scene = timeline.find((s, i) => elapsedS >= s.startTimeS && (!timeline[i+1] || elapsedS < timeline[i+1].startTimeS));
          if (!scene) { if (elapsedS > totalDurS - 0.1) { finalize(); return; } animationFrameId = requestAnimationFrame(loop); return; }
          
          const sceneElapsedTimeS = elapsedS - scene.startTimeS;

          if (scene.phase === 'intro' && introVideoRef.current) {
              introVideoRef.current.currentTime = sceneElapsedTimeS;
              ctx.drawImage(introVideoRef.current, 0, 0, canvasWidth, canvasHeight);
          } else if (scene.phase === 'outro' && outroVideoRef.current) {
              outroVideoRef.current.currentTime = sceneElapsedTimeS;
              ctx.drawImage(outroVideoRef.current, 0, 0, canvasWidth, canvasHeight);
          } else {
              if (backgroundMedia instanceof HTMLVideoElement) {
                  const mediaTime = scene.sceneStartTime !== undefined ? elapsedS - scene.sceneStartTime : elapsedS;
                  backgroundMedia.currentTime = mediaTime % backgroundMedia.duration;
              }
              const qI = scene.qI !== undefined ? scene.qI : null;
              const qData = (qI !== null) ? quizData[qI] : null;
              const qMedia = (qI !== null) ? questionMediaElements[qI] : null;

              if (qMedia instanceof HTMLVideoElement) {
                const mediaTime = elapsedS - scene.sceneStartTime;
                qMedia.currentTime = mediaTime % qMedia.duration;
              }

              let animState: any = { time: now, sceneElapsedTimeS: sceneElapsedTimeS };
              if (scene.phase === 'countdown') animState.countdownValue = C - sceneElapsedTimeS;
              let drawingPhase = ['voiceover', 'think_pause', 'question'].includes(scene.phase) ? 'question' : ['reveal_pause', 'answer_voiceover', 'reveal'].includes(scene.phase) ? 'reveal' : scene.phase;
              drawQuizScene(ctx, { topic, questionData: qData, questionIndex: qI, totalQuestions: quizData.length, theme, difficulty, quizType: qData?.quizType || quizType, backgroundMedia, questionMedia: qMedia, aspectRatio, watermark, backgroundMovement }, drawingPhase, animState);
          }
          
          setProgress((elapsedS / totalDurS) * 100);
          setStatus(`Rendering ${scene.phase}` + (scene.qI !== undefined ? ` (Q${scene.qI + 1})` : ''));
          animationFrameId = requestAnimationFrame(loop);
        }

        await new Promise(resolve => setTimeout(resolve, (audioStart - audioContext.currentTime) * 1000 - 50));
        animationFrameId = requestAnimationFrame(loop);

        async function finalize() {
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          if (backgroundMedia instanceof HTMLVideoElement) backgroundMedia.pause();
          setStatus('Finalizing...'); setProgress(100);
          await new Promise(r => setTimeout(r, 100));
          if (recorder.state === "recording") recorder.stop();
          const blob = await recordPromise;
          onComplete(blob);
        }

      } catch (err) {
        console.error("Render failed:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown rendering error occurred.";
        onError(errorMessage);
        if (recorder?.state === 'recording') recorder.stop();
        if (backgroundMedia instanceof HTMLVideoElement) backgroundMedia.pause();
      }
    };
    renderVideo();
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (audioContextRef.current?.state !== 'closed') audioContextRef.current.close().catch(console.error);
      if (introVideoRef.current?.src) URL.revokeObjectURL(introVideoRef.current.src);
      if (outroVideoRef.current?.src) URL.revokeObjectURL(outroVideoRef.current.src);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full space-y-4 p-4 animate-fade-in">
      <h2 className="text-2xl font-bold text-white text-center">Rendering Video...</h2>
      <p className="text-gray-400 text-center">Please keep this tab open. This may take a moment.</p>
      <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
        <div className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-linear" style={{ width: `${progress}%` }}></div>
      </div>
      <p className="text-center text-blue-400 font-mono text-sm">{status}</p>
      <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} className={`w-full ${isPortrait ? 'aspect-[9/16]' : 'aspect-[16/9]'} rounded-lg border border-gray-700 bg-black`}></canvas>
    </div>
  );
}

export default VideoRenderStep;
