/**
 * Voiceover preview using the browser's built-in speech synthesis.
 *
 * Claude is a text model - it has no text-to-speech endpoint - so spoken audio
 * comes from the browser (for previewing how a line will sound) or from the
 * user's own microphone recording (for the audio that ends up in the video).
 * Claude still writes and polishes the script that gets read; see
 * `generateVoiceoverScript` in claudeService.ts.
 */
import { VOICE_STYLES } from '../constants';

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Browser voice lists load asynchronously in Chrome; wait for the first fill. */
function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) return resolve(voices);

    const timeout = window.setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
    window.speechSynthesis.addEventListener(
      'voiceschanged',
      () => {
        window.clearTimeout(timeout);
        resolve(window.speechSynthesis.getVoices());
      },
      { once: true },
    );
  });
}

export function cancelSpeech(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

/** Speaks `text` in the chosen style. Resolves when playback finishes. */
export async function speak(text: string, styleId: string): Promise<void> {
  if (!isSpeechSupported()) {
    throw new Error('This browser does not support speech playback. Record your own voiceover instead.');
  }
  if (!text.trim()) throw new Error('There is nothing to read aloud.');

  const style = VOICE_STYLES.find((v) => v.id === styleId) ?? VOICE_STYLES[0];
  const voices = await getVoices();
  const preferred =
    voices.find((v) => v.lang.startsWith('en') && v.localService) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    voices[0];

  cancelSpeech();

  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    if (preferred) utterance.voice = preferred;
    utterance.rate = style.rate;
    utterance.pitch = style.pitch;
    utterance.onend = () => resolve();
    utterance.onerror = (event) =>
      event.error === 'interrupted' || event.error === 'canceled'
        ? resolve()
        : reject(new Error(`Speech playback failed: ${event.error}`));
    window.speechSynthesis.speak(utterance);
  });
}
