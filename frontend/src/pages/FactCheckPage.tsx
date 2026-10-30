import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FlaskConical, AlertCircle } from 'lucide-react';
import { ClaimInput } from '@/components/fact-check/ClaimInput';
import { FactCheckResultView } from '@/components/fact-check/FactCheckResult';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { PageSpinner, Spinner } from '@/components/ui/Spinner';
import type { FactCheckResult } from '@/types';

type PageState = 'idle' | 'loading' | 'result' | 'error';

export function FactCheckPage() {
  const { resultId } = useParams<{ resultId?: string }>();
  return resultId ? <SavedFactCheck resultId={resultId} /> : <NewFactCheck />;
}

// Shows a previously analyzed claim (e.g. opened from History) loaded by its result ID.
function SavedFactCheck({ resultId }: { resultId: string }) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['fact-check', resultId],
    queryFn: () => api.factCheck.getById(resultId),
  });

  if (isLoading) return <PageSpinner />;

  if (isError || !data) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500 mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Analysis Not Found</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">This result may have been removed or the link is incorrect.</p>
        <Link to="/history">
          <Button variant="secondary" size="sm">Back to History</Button>
        </Link>
      </div>
    );
  }

  return <FactCheckResultView result={data} onReset={() => navigate('/fact-check')} />;
}

function NewFactCheck() {
  const location = useLocation();
  const incomingResult = location.state?.result as FactCheckResult | undefined;

  const [state, setState] = useState<PageState>(incomingResult ? 'result' : 'idle');
  const [result, setResult] = useState<FactCheckResult | null>(incomingResult ?? null);
  const [currentClaim, setCurrentClaim] = useState('');
  const [apiError, setApiError] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: (claim: string) => api.factCheck.create(claim),
    onMutate: (claim) => {
      setCurrentClaim(claim);
      setState('loading');
      setApiError('');
    },
    onSuccess: (data) => {
      setResult(data);
      setState('result');
    },
    onError: (err: Error) => {
      setApiError(err.message || 'Analysis failed. Please try again.');
      setState('error');
    },
  });

  function handleReset() {
    setState('idle');
    setResult(null);
    setCurrentClaim('');
    setApiError('');
  }

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl mx-auto px-4 sm:px-6 py-12"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 mb-4">
                <FlaskConical className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Health Fact Checker</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                Submit any health claim for evidence-based analysis. We'll tell you what the medical literature actually says — including any uncertainty.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-card-md">
              <ClaimInput onSubmit={mutate} loading={isPending} />
            </div>
          </motion.div>
        )}

        {state === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[400px] px-4"
          >
            <Spinner className="h-10 w-10 mb-4" />
            <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">Analyzing claim…</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs text-center leading-relaxed">
              Searching medical evidence and synthesizing with AI. This may take 10–30 seconds.
            </p>
            {currentClaim && (
              <div className="mt-5 max-w-lg text-center">
                <p className="text-xs text-gray-400 dark:text-gray-500 italic">"{currentClaim.slice(0, 120)}{currentClaim.length > 120 ? '…' : ''}"</p>
              </div>
            )}
          </motion.div>
        )}

        {state === 'result' && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <FactCheckResultView result={result} onReset={handleReset} />
          </motion.div>
        )}

        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-xl mx-auto px-4 sm:px-6 py-12"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500 mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Analysis Failed</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{apiError}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6">
              <ClaimInput onSubmit={mutate} loading={isPending} initialValue={currentClaim} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
