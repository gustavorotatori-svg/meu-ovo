import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { badgePop } from '../lib/motion';

interface BadgeProps {
  children: ReactNode;
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md';
  icon?: ReactNode;
  className?: string;
}

const variants = {
  brand: 'bg-brand-egg text-brand-black',
  success: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger: 'bg-red-500/10 text-red-600 border border-red-500/20',
  info: 'bg-sky-500/10 text-sky-600 border border-sky-500/20',
  outline: 'bg-white text-slate-600 border border-slate-200',
};

const sizes = {
  sm: 'text-[9px] px-2 py-0.5',
  md: 'text-[10px] px-2.5 py-1',
};

export default function Badge({ children, variant = 'brand', size = 'md', icon, className }: BadgeProps) {
  return (
    <motion.span
      variants={badgePop}
      initial="hidden"
      animate="visible"
      className={cn(
        'inline-flex items-center gap-1 font-black uppercase tracking-widest rounded-full shrink-0',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </motion.span>
  );
}
