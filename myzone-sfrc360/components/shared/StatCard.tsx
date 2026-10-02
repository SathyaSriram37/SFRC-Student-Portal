import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  description?: string;
  className?: string;
  icon?: React.ReactNode;
}

export default function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  description,
  className,
  icon,
}: StatCardProps) {
  const changeColors = {
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-sfrc-600 bg-sfrc-100',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-sfrc-200 bg-white p-5',
        'shadow-sm hover:shadow-md transition-shadow duration-200',
        'group',
        className
      )}
    >
      {/* Decorative accent line */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-sfrc-700 to-sfrc-accent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-sfrc-600 uppercase tracking-wider truncate">
            {title}
          </p>
          <p className="mt-1 text-2xl font-black text-sfrc-900 truncate">
            {value}
          </p>
          {description && (
            <p className="mt-1 text-xs text-sfrc-600 truncate">{description}</p>
          )}
        </div>
        {icon && (
          <div className="shrink-0 w-10 h-10 rounded-lg bg-sfrc-100 flex items-center justify-center text-sfrc-700 group-hover:bg-sfrc-700 group-hover:text-white transition-colors duration-200">
            {icon}
          </div>
        )}
      </div>

      {change && (
        <div className="mt-3">
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
              changeColors[changeType]
            )}
          >
            {changeType === 'positive' && '↑ '}
            {changeType === 'negative' && '↓ '}
            {change}
          </span>
        </div>
      )}
    </div>
  );
}
