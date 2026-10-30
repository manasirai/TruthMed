import { useState } from 'react';
import { FlaskConical, Lightbulb, Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { cn } from '@/lib/utils';

// en-IN also transcribes Hinglish (romanized Hindi); hi-IN produces Devanagari.
const VOICE_LANGUAGES = [
  { code: 'en-IN', label: 'English / Hinglish' },
  { code: 'hi-IN', label: 'हिन्दी' },
];

const EXAMPLE_CLAIMS = [
  'Drinking 8 glasses of water a day is necessary for good health.',
  'Vitamin C supplements prevent colds.',
  'Eating carrots improves your eyesight.',
  'Vaccines cause autism in children.',
  'You only use 10% of your brain.',
  'Turmeric cures cancer.',
  'Cold weather causes the common cold.',
];

interface ClaimInputProps {
  onSubmit: (claim: string) => void;
  loading?: boolean;
  initialValue?: string;
}

export function ClaimInput({ onSubmit, loading, initialValue = '' }: ClaimInputProps) {
  const [claim, setClaim] = useState(initialValue);
  const [error, setError] = useState('');
  const [voiceLang, setVoiceLang] = useState(VOICE_LANGUAGES[0].code);

  const speech = useSpeechRecognition((text) => {
    setClaim((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text).slice(0, 2000));
    setError('');
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = claim.trim();
    if (!trimmed) {
      setError('Please enter a health claim to analyze.');
      return;
    }
    if (trimmed.length < 10) {
      setError('Please enter a more specific claim (at least 10 characters).');
      return;
    }
    if (trimmed.length > 2000) {
      setError('Claim is too long. Please limit to 2000 characters.');
      return;
    }
    setError('');
    speech.stop();
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <Textarea
        value={claim}
        onChange={(e) => {
          setClaim(e.target.value);
          if (error) setError('');
        }}
        placeholder="Paste a health claim, viral post, remedy, supplement claim, or medical headline…"
        rows={4}
        maxLength={2000}
        error={error}
        aria-label="Health claim to analyze"
        className="text-base"
      />
      {speech.isSupported && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Button
            type="button"
            variant={speech.listening ? 'danger' : 'secondary'}
            size="sm"
            onClick={() => (speech.listening ? speech.stop() : speech.start(voiceLang))}
            aria-label={speech.listening ? 'Stop voice input' : 'Speak your claim'}
          >
            {speech.listening ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-4 h-4" />}
            {speech.listening ? 'Stop' : 'Speak'}
          </Button>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden" role="group" aria-label="Voice input language">
            {VOICE_LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                disabled={speech.listening}
                onClick={() => setVoiceLang(l.code)}
                aria-pressed={voiceLang === l.code}
                className={cn(
                  'px-2.5 py-1 text-xs transition-colors disabled:opacity-50',
                  voiceLang === l.code
                    ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          {speech.listening && (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic truncate max-w-full" aria-live="polite">
              {speech.interim || 'Listening…'}
            </span>
          )}
          {speech.error && <span className="text-xs text-red-600 dark:text-red-400">{speech.error}</span>}
        </div>
      )}
      <div className="flex items-center justify-between mt-2 mb-4">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {claim.length}/2000 characters
        </span>
        {claim.length > 0 && (
          <button
            type="button"
            onClick={() => { setClaim(''); setError(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <Button type="submit" loading={loading} size="lg" className="w-full">
        <FlaskConical className="w-4 h-4" />
        {loading ? 'Analyzing claim…' : 'Analyze Claim'}
      </Button>

      {/* Example claims */}
      <div className="mt-5">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-2.5">
          <Lightbulb className="w-3.5 h-3.5" />
          Try an example:
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_CLAIMS.slice(0, 4).map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => { setClaim(ex); setError(''); }}
              className="text-xs px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-gray-600 dark:text-gray-400 hover:text-teal-700 dark:hover:text-teal-400 border border-gray-200 dark:border-gray-700 hover:border-teal-200 dark:hover:border-teal-800 rounded-full transition-colors text-left"
            >
              {ex.length > 48 ? ex.slice(0, 47) + '…' : ex}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
