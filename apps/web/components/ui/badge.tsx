import { cn } from '@/lib/utils';

interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<string, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/80',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'bg-red-500 text-white hover:bg-red-500/80',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  success: 'bg-green-500 text-white hover:bg-green-500/80',
};

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
