import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@renderer/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-accent-500 text-surface-0 font-medium',
    'hover:bg-accent-600 active:bg-accent-700',
    'shadow-sm hover:shadow-md',
  ].join(' '),
  secondary: [
    'bg-surface-0 text-surface-700 border border-surface-200',
    'hover:bg-surface-50 hover:border-surface-300',
  ].join(' '),
  ghost: [
    'text-surface-600',
    'hover:bg-surface-100 hover:text-surface-900',
  ].join(' '),
  danger: [
    'bg-danger-500 text-surface-0 font-medium',
    'hover:bg-danger-600',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-6 text-base gap-2.5 rounded-lg',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center',
          'transition-all duration-150 ease-out',
          'press-feedback',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400',
          'disabled:opacity-40 disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize };
