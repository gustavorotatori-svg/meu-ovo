import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { eggBounce, durations, easings } from '../lib/motion';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({ icon, title, subtitle, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durations.base, ease: easings.smooth }}
      className={cn('text-center py-12 px-4', className)}
    >
      <motion.div
        variants={eggBounce}
        initial="hidden"
        animate="visible"
        className="w-20 h-20 bg-slate-50 dark:bg-dark-elevated rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <div className="text-slate-300 dark:text-slate-600">{icon}</div>
      </motion.div>
      <p className="font-display font-black text-slate-300 dark:text-slate-600 uppercase text-2xl italic tracking-tighter">{title}</p>
      {subtitle && (
        <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-2">{subtitle}</p>
      )}
      {action && <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: durations.base, ease: easings.smooth, delay: 0.2 }}
        className="mt-6"
      >
        {action}
      </motion.div>}
    </motion.div>
  );
}
