import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  endsAt: string;
  className?: string;
}

export default function FlashDealTimer({ endsAt, className }: Props) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Encerrada'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (timeLeft === 'Encerrada') return null;

  return (
    <div className={cn("flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-600", className)}>
      <Clock size={12} />
      <span>{timeLeft}</span>
    </div>
  );
}
