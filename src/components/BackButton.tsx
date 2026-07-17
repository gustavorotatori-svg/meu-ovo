import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { buttonHover, buttonTap } from '../lib/motion';

interface BackButtonProps {
  to?: string;
  className?: string;
  label?: string;
}

export default function BackButton({ to, className, label = 'Voltar' }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <motion.button
      whileHover={buttonHover}
      whileTap={buttonTap}
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className={cn(
        'flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-[#111] dark:text-gray-500 dark:hover:text-white transition-colors',
        className,
      )}
    >
      <ChevronLeft size={16} />
      {label}
    </motion.button>
  );
}
