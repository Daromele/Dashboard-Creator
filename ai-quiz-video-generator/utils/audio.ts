
/**
 * Helper to write string to DataView
 */
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Converts raw PCM data (Int16Array) to a WAV file Blob.
 */
export function pcmToWav(pcmData: Int16Array, sampleRate: number, numChannels = 1): Blob {
  const SIZEOF_INT16 = 2;
  const dataSize = pcmData.length * numChannels * SIZEOF_INT16;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // (file-size - 8)
  writeString(view, 8, 'WAVE');

  // FMT sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * SIZEOF_INT16, true); // ByteRate
  view.setUint16(32, numChannels * SIZEOF_INT16, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // DATA sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM data
  let offset = 44;
  for (let i = 0; i < pcmData.length; i++, offset += SIZEOF_INT16) {
    view.setInt16(offset, pcmData[i], true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

export function getCurrentSeason(): string {
  const month = new Date().getMonth(); // 0-11 (Jan=0, Dec=11)
  // Northern Hemisphere seasons
  if (month >= 2 && month <= 4) return 'Spring'; // Mar, Apr, May
  if (month >= 5 && month <= 7) return 'Summer'; // Jun, Jul, Aug
  if (month >= 8 && month <= 10) return 'Autumn'; // Sep, Oct, Nov
  return 'Winter'; // Dec, Jan, Feb
}

export interface StingerNote {
  midi: number;
  start: number;
  duration: number;
  gain: number;
}

export interface StingerSpec {
  tempo?: number;
  waveform?: OscillatorType;
  notes: StingerNote[];
}

const midiToFrequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/**
 * Renders a Claude-composed note sequence into a WAV blob using the Web Audio
 * API. Claude has no audio-generation endpoint, so it writes the score and the
 * browser plays it.
 */
export async function synthesizeStinger(spec: StingerSpec): Promise<Blob> {
  const notes = (spec?.notes || []).filter(
    (note) => Number.isFinite(note?.midi) && Number.isFinite(note?.start) && note?.duration > 0
  );
  if (!notes.length) throw new Error('The generated stinger contained no playable notes.');

  const sampleRate = 44100;
  const tail = 0.4;
  const lengthS = Math.min(6, Math.max(...notes.map(n => n.start + n.duration)) + tail);

  const OfflineCtx: typeof OfflineAudioContext =
    (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  if (!OfflineCtx) throw new Error('This browser cannot synthesize audio (no OfflineAudioContext).');

  const ctx = new OfflineCtx(1, Math.ceil(lengthS * sampleRate), sampleRate);
  const master = ctx.createGain();
  // Headroom so overlapping notes don't clip.
  master.gain.value = 0.7 / Math.max(1, Math.sqrt(notes.length));
  master.connect(ctx.destination);

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = spec.waveform || 'triangle';
    osc.frequency.value = midiToFrequency(note.midi);

    const start = Math.max(0, note.start);
    const end = start + note.duration;
    const peak = Math.min(1, Math.max(0.05, note.gain ?? 0.5));

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(end + 0.05);
  }

  const rendered = await ctx.startRendering();
  const channel = rendered.getChannelData(0);
  const pcm = new Int16Array(channel.length);
  for (let i = 0; i < channel.length; i++) {
    const clamped = Math.max(-1, Math.min(1, channel[i]));
    pcm[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  return pcmToWav(pcm, sampleRate);
}
