import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-3 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
            'border border-gray-200 dark:border-gray-700 rounded-xl',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent',
            'transition-colors resize-none',
            error && 'border-red-400 focus:ring-red-400',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
        {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
