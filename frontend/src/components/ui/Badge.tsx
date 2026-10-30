import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
    danger: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400',
    info: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
    neutral: 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
