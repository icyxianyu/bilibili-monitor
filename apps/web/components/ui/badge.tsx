import { cn } from '@/lib/utils';

interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<string, string> = {
  default: 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20',
  secondary: 'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80',
  destructive: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
  outline: 'border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
  success: 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100',
};

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
