import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-sfrc-100 flex items-center justify-center text-sfrc-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-sfrc-800">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-sfrc-600 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
