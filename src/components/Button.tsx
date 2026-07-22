import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/utils';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { spring, springSnap } from '../lib/motion';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const styleVariants = {
      primary:
        'bg-[#FFC928] text-[#111] hover:bg-yellow-400 font-black shadow-sm',
      secondary: 'bg-[#111] text-white hover:bg-zinc-800 font-bold shadow-sm',
      outline: 'border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold',
      ghost: 'bg-transparent hover:bg-white/10 text-white font-bold',
      danger: 'bg-red-500 text-white hover:bg-red-600 font-bold shadow-sm',
    };

    const sizes = {
      sm: 'px-4 py-2.5 text-[10px] uppercase tracking-widest',
      md: 'px-6 py-3 text-xs uppercase tracking-widest',
      lg: 'px-8 py-4 text-sm uppercase tracking-widest',
      icon: 'p-3',
    };

    return (
      <motion.button
        ref={ref as React.Ref<HTMLButtonElement>}
        whileHover={{ scale: 1.03, transition: spring }}
        whileTap={{ scale: 0.97, transition: springSnap }}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#FFC928]/50 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed',
          isLoading && "animate-pulse",
          styleVariants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin shrink-0" /> : null}
        {children}
      </motion.button>
    );
  }
);
