import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/utils';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-brand-egg text-brand-black hover:bg-yellow-400 focus:ring-brand-egg shadow-[0_2px_0_0_#D97706]',
      secondary: 'bg-brand-black text-white hover:bg-zinc-800 focus:ring-brand-black shadow-sm',
      outline: 'border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm',
      ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
      danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-sm',
    };

    const sizes = {
      sm: 'px-2.5 py-1.5 text-xs font-semibold tracking-wide uppercase',
      md: 'px-3.5 py-2 text-sm',
      lg: 'px-5 py-2.5 text-base',
      icon: 'p-2',
    };

    return (
      <motion.button
        ref={ref as any}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed',
          isLoading && "animate-pulse",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
        {children}
      </motion.button>
    );
  }
);
