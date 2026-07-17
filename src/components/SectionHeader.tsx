import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { staggerContainer, staggerItem } from '../lib/motion';

interface SectionHeaderProps {
  subtitle: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  subtitleClass?: string;
  titleClass?: string;
  className?: string;
}

export default function SectionHeader({ subtitle, title, description, align = 'center', subtitleClass, titleClass, className }: SectionHeaderProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px 0px' }}
      className={cn(
        'space-y-2',
        align === 'center' && 'text-center',
        className
      )}
    >
      <motion.span
        variants={staggerItem}
        className={cn('text-xs font-black uppercase tracking-widest', subtitleClass || 'text-brand-orange')}
      >
        {subtitle}
      </motion.span>
      <motion.h2
        variants={staggerItem}
        className={cn('font-display font-black text-2xl md:text-3xl tracking-tight leading-none uppercase italic', titleClass || '')}
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p
          variants={staggerItem}
          className="text-xs font-bold text-gray-400 uppercase tracking-wider"
        >
          {description}
        </motion.p>
      )}
    </motion.div>
  );
}
