import { useCallback, useEffect, useRef, useState } from 'react';

// Minimal typings for the Web Speech API, which TypeScript's DOM lib does not include.
interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access was blocked. Allow it in your browser settings.',
  'service-not-allowed': 'Microphone access was blocked. Allow it in your browser settings.',
  'no-speech': 'No speech detected. Try again.',
  'audio-capture': 'No microphone found.',
  network: 'Speech recognition needs an internet connection.',
};

/**
 * Browser speech-to-text. `onFinal` receives each finalized phrase; `interim` holds the
 * phrase currently being spoken so it can be previewed.
 */
export function useSpeechRecognition(onFinal: (text: string) => void) {
  const isSupported = !!getRecognitionCtor();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const start = useCallback((lang: string) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e) => {
      let pending = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) onFinalRef.current(result[0].transcript.trim());
        else pending += result[0].transcript;
      }
      setInterim(pending);
    };
    recognition.onerror = (e) => {
      if (e.error !== 'aborted') setError(ERROR_MESSAGES[e.error] ?? 'Speech recognition failed. Try again.');
    };
    recognition.onend = () => {
      setListening(false);
      setInterim('');
    };

    recognitionRef.current = recognition;
    setError('');
    setListening(true);
    recognition.start();
  }, []);

  const stop = useCallback(() => recognitionRef.current?.stop(), []);

  return { isSupported, listening, interim, error, start, stop };
}
