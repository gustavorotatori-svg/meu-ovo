import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Search, ShoppingCart, MapPin, Heart, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const steps = [
  {
    icon: <Sparkles size={36} className="text-black" />,
    title: 'Bem-vindo ao MEU OVO!',
    description: 'O marketplace que conecta você aos melhores restaurantes do seu bairro. Aqui, cada pedido fortalece o comércio local.',
    bgColor: 'bg-[#FFC928]',
  },
  {
    icon: <Search size={36} className="text-white" />,
    title: 'Descubra Restaurantes',
    description: 'Busque por tipo de culinária, filtre por preço ou veja os mais perto de você. Cada restaurante tem sua própria avaliação e estilo.',
    bgColor: 'bg-[#111]',
  },
  {
    icon: <ShoppingCart size={36} className="text-black" />,
    title: 'Faça seu Pedido',
    description: 'Monte seu carrinho, escolha formas de pagamento (o restaurante define) e finalize em poucos cliques. Tudo transparente, sem taxas escondidas.',
    bgColor: 'bg-emerald-500',
  },
  {
    icon: <MapPin size={36} className="text-white" />,
    title: 'Acompanhe e Impacte',
    description: 'Veja o status do seu pedido em tempo real. Parte de cada pedido apoia projetos sociais — você come bem e faz o bem.',
    bgColor: 'bg-sky-500',
  },
  {
    icon: <Heart size={36} className="text-black" />,
    title: 'Pronto pra pedir?',
    description: 'Explore os restaurantes, peça sua comida favorita e ajude a fortalecer a economia local. Bom apetite! 🍳',
    bgColor: 'bg-[#FFC928]',
  },
];

export default function OnboardingTutorial() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const totalSteps = steps.length;

  async function completeTutorial() {
    if (!user) return;
    setClosing(true);
    try {
      await updateDoc(doc(db, 'users', user.id), { onboardingComplete: true });
    } catch {
      // Non-critical
    }
  }

  async function skipTutorial() {
    await completeTutorial();
  }

  function next() {
    if (step === totalSteps - 1) {
      completeTutorial();
    } else {
      setStep(s => s + 1);
    }
  }

  function prev() {
    if (step > 0) setStep(s => s - 1);
  }

  const current = steps[step];

  if (closing) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] pointer-events-none"
      />
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={skipTutorial}
        />

        {/* Card */}
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label={`Tutorial passo ${step + 1}: ${current.title}`}
        >
          {/* Close button */}
          <button
            onClick={skipTutorial}
            className="absolute top-4 right-4 z-10 p-2.5 rounded-xl bg-black/5 hover:bg-black/10 transition-colors"
            aria-label="Pular tutorial"
          >
            <X size={18} className="text-gray-500" />
          </button>

          {/* Icon area */}
          <div className={`${current.bgColor} p-10 flex items-center justify-center min-h-[200px]`}>
            <motion.div
              key={step}
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 200 }}
              className="w-20 h-20 bg-white/20 rounded-[1.5rem] flex items-center justify-center backdrop-blur-sm"
            >
              {current.icon}
            </motion.div>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Progress dots */}
            <div className="flex items-center gap-2 mb-6">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? 'w-8 bg-[#FFC928]' : i < step ? 'w-4 bg-[#FFC928]/40' : 'w-4 bg-gray-200'
                  }`}
                />
              ))}
            </div>

            <motion.h2
              key={`title-${step}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-xl font-black text-[#111] mb-3"
            >
              {current.title}
            </motion.h2>

            <motion.p
              key={`desc-${step}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-sm text-gray-500 leading-relaxed mb-8"
            >
              {current.description}
            </motion.p>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {step > 0 && (
                <button
                  onClick={prev}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black text-gray-500 hover:bg-gray-100 transition-all"
                >
                  <ChevronLeft size={16} />
                  Voltar
                </button>
              )}

              <div className="flex-1" />

              {step < totalSteps - 1 ? (
                <button
                  onClick={next}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#111] text-white text-sm font-black hover:bg-black transition-all shadow-lg"
                >
                  Próximo
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={completeTutorial}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FFC928] text-black text-sm font-black hover:bg-[#e6b520] transition-all shadow-lg shadow-yellow-500/20"
                >
                  Começar!
                  <Sparkles size={16} />
                </button>
              )}
            </div>

            {/* Skip link */}
            {step < totalSteps - 1 && (
              <div className="mt-4 text-center">
                <button
                  onClick={skipTutorial}
                  className="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors"
                >
                  Pular tutorial
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
