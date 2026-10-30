import { useCallback, useEffect, useState } from 'react';

const DEVANAGARI = /[ऀ-ॿ]/;

// Chrome stops long utterances after ~15 seconds, so speech is queued sentence by sentence.
function splitIntoChunks(text: string): string[] {
  return text.match(/[^.!?।]+[.!?।]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const base = lang.split('-')[0];
  return voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(base));
}

/** Browser text-to-speech. Uses a Hindi voice for Devanagari text and Indian English otherwise. */
export function useSpeechSynthesis() {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = useState(false);

  // Stop speaking when the component using this hook unmounts (e.g. user navigates away).
  useEffect(() => () => { if (isSupported) window.speechSynthesis.cancel(); }, [isSupported]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    const synth = window.speechSynthesis;
    synth.cancel();

    const lang = DEVANAGARI.test(text) ? 'hi-IN' : 'en-IN';
    const voice = pickVoice(lang);
    const chunks = splitIntoChunks(text);
    if (!chunks.length) return;

    chunks.forEach((chunk, i) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = lang;
      if (voice) utterance.voice = voice;
      if (i === chunks.length - 1) {
        utterance.onend = () => setSpeaking(false);
        // cancel() fires "interrupted"/"canceled" on old utterances; ignore those so a restart stays "speaking"
        utterance.onerror = (e) => {
          if (e.error !== 'interrupted' && e.error !== 'canceled') setSpeaking(false);
        };
      }
      synth.speak(utterance);
    });
    setSpeaking(true);
  }, []);

  return { isSupported, speaking, speak, stop };
}
