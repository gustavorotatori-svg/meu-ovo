import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

export interface TourStep {
  target?: string;
  title: string;
  content: string;
  placement?: 'bottom' | 'top' | 'left' | 'right' | 'center';
}

interface OvinhoTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

function calculatePosition(
  targetEl: Element | null,
  placement: string,
  tooltipWidth: number,
  tooltipHeight: number
) {
  if (!targetEl || placement === 'center') return null;

  const rect = targetEl.getBoundingClientRect();
  const gap = 12;

  switch (placement) {
    case 'bottom':
      return {
        top: rect.bottom + gap + window.scrollY,
        left: rect.left + rect.width / 2 - tooltipWidth / 2 + window.scrollX,
        highlight: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      };
    case 'top':
      return {
        top: rect.top - tooltipHeight - gap + window.scrollY,
        left: rect.left + rect.width / 2 - tooltipWidth / 2 + window.scrollX,
        highlight: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      };
    case 'left':
      return {
        top: rect.top + rect.height / 2 - tooltipHeight / 2 + window.scrollY,
        left: rect.left - tooltipWidth - gap + window.scrollX,
        highlight: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      };
    case 'right':
      return {
        top: rect.top + rect.height / 2 - tooltipHeight / 2 + window.scrollY,
        left: rect.right + gap + window.scrollX,
        highlight: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      };
    default:
      return {
        top: rect.bottom + gap + window.scrollY,
        left: rect.left + rect.width / 2 - tooltipWidth / 2 + window.scrollX,
        highlight: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      };
  }
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

const OVINHO_MESSAGES = [
  'Opa, bora nessa! 🍳',
  'Deixa comigo!',
  'Show de bola!',
  'Tá no caminho certo!',
  'Fechou! 🎉',
];

export default function OvinhoTour({ steps, isOpen, onComplete, onSkip }: OvinhoTourProps) {
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [highlight, setHighlight] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [ovinhoMessage] = useState(() => OVINHO_MESSAGES[Math.floor(Math.random() * OVINHO_MESSAGES.length)]);

  const current = steps[step];

  const reposition = useCallback(() => {
    if (!current) return;
    if (!current.target || current.placement === 'center') {
      setTooltipPos({ top: 0, left: 0 });
      setHighlight(null);
      return;
    }
    const el = document.querySelector(current.target);
    if (!el) {
      setTooltipPos({ top: 0, left: 0 });
      setHighlight(null);
      return;
    }
    const tw = tooltipRef.current?.offsetWidth || 320;
    const th = tooltipRef.current?.offsetHeight || 200;
    const pos = calculatePosition(el, current.placement || 'bottom', tw, th);
    if (pos) {
      setTooltipPos({
        top: clamp(pos.top, 16, window.innerHeight - th - 16),
        left: clamp(pos.left, 16, window.innerWidth - tw - 16),
      });
      setHighlight(pos.highlight);
    }
  }, [current]);

  useEffect(() => {
    setStep(0);
    setClosing(false);
  }, [isOpen]);

  useEffect(() => {
    reposition();
    const onResize = () => reposition();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [reposition]);

  useEffect(() => {
    if (!current?.target) return;
    const el = document.querySelector(current.target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const timer = setTimeout(() => reposition(), 400);
    return () => clearTimeout(timer);
  }, [step, current?.target, reposition]);

  async function completeTour() {
    setClosing(true);
    setTimeout(() => onComplete(), 300);
  }

  function next() {
    if (step === steps.length - 1) {
      completeTour();
    } else {
      setStep(s => s + 1);
    }
  }

  function prev() {
    if (step > 0) setStep(s => s - 1);
  }

  if (!isOpen) return null;

  if (closing) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9999] pointer-events-none"
      />
    );
  }

  const isCenter = !current.target || current.placement === 'center';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999]"
      >
        {/* Backdrop with spotlight hole */}
        {!isCenter && highlight && (
          <div
            className="absolute inset-0 bg-black/60"
            style={{
              clipPath: `polygon(
                0% 0%,
                100% 0%,
                100% 100%,
                0% 100%,
                0% 0%,
                ${highlight.left}px 0%,
                ${highlight.left}px ${highlight.top}px,
                ${highlight.left + highlight.width}px ${highlight.top}px,
                ${highlight.left + highlight.width}px ${highlight.top + highlight.height}px,
                ${highlight.left}px ${highlight.top + highlight.height}px,
                ${highlight.left}px 100%,
                0% 100%
              )`,
            }}
          />
        )}
        {!isCenter && !highlight && (
          <div className="absolute inset-0 bg-black/60" />
        )}

        {/* Ovinho Tooltip */}
        <motion.div
          ref={tooltipRef}
          initial={isCenter ? { scale: 0.8, opacity: 0, y: 20 } : { scale: 0.9, opacity: 0 }}
          animate={isCenter ? { scale: 1, opacity: 1, y: 0 } : { scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 250 }}
          className={`absolute w-[340px] max-w-[85vw] ${isCenter ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}`}
          style={!isCenter ? { top: tooltipPos.top, left: tooltipPos.left } : undefined}
        >
          {/* Ovinho character + speech bubble */}
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Ovinho header */}
            <div className="bg-gradient-to-r from-[#FFC928] to-[#f5b800] px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 shrink-0">
                <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-sm">
                  <path d="M60 22C56 12 48 10 52 25C44 12 36 15 40 32C30 22 22 30 30 45C15 70 18 100 35 112C52 124 78 122 92 105C106 85 105 55 90 35C82 25 78 15 68 25C70 10 64 8 60 22Z" fill="white" stroke="#111" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
                  <path d="M65 92C50 86 40 75 40 60C40 48 52 42 63 55C74 42 86 48 86 60C86 75 78 86 65 92Z" fill="#FFC928" />
                  <circle cx="56" cy="62" r="3.5" fill="#111" />
                  <circle cx="73" cy="62" r="3.5" fill="#111" />
                  <path d="M55 74C55 74 59 81 65 81C71 81 75 74 75 74" fill="none" stroke="#111" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-sm text-black/80 tracking-tight">OVINHO</div>
                <div className="text-[11px] font-black text-black/50 uppercase tracking-wider">{ovinhoMessage}</div>
              </div>
              <button
                onClick={() => { setClosing(true); setTimeout(() => onSkip(), 300); }}
                className="p-1.5 rounded-lg bg-black/10 hover:bg-black/20 transition-colors shrink-0"
                aria-label="Fechar"
              >
                <X size={14} className="text-black/60" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              {/* Progress */}
              <div className="flex items-center gap-1.5 mb-4">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === step ? 'w-6 bg-[#FFC928]' : i < step ? 'w-2 bg-[#FFC928]/40' : 'w-2 bg-gray-200'
                    }`}
                  />
                ))}
                <span className="ml-auto text-[10px] font-black text-gray-400">
                  {step + 1}/{steps.length}
                </span>
              </div>

              <h3 className="font-black text-[#111] text-base mb-2">{current.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">{current.content}</p>

              {/* Navigation */}
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    onClick={prev}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-gray-500 hover:bg-gray-100 transition-all"
                  >
                    <ChevronLeft size={14} />
                    Voltar
                  </button>
                )}
                <div className="flex-1" />
                {step < steps.length - 1 ? (
                  <button
                    onClick={next}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#111] text-white text-xs font-black hover:bg-black transition-all shadow-lg"
                  >
                    Próximo
                    <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={completeTour}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#FFC928] text-black text-xs font-black hover:bg-[#e6b520] transition-all shadow-lg shadow-yellow-500/20"
                  >
                    Começar!
                    <Sparkles size={14} />
                  </button>
                )}
              </div>

              {/* Skip */}
              {step < steps.length - 1 && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() => { setClosing(true); setTimeout(() => onSkip(), 300); }}
                    className="text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors"
                  >
                    Pular tutorial
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
