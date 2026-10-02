import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-4',
        'pb-5 border-b border-sfrc-200',
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-black text-sfrc-900 tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-sfrc-600">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}
