import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Scale, Gavel, Lock, Bot, AlertTriangle, ChevronDown } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

const sections = [
  { icon: FileText, id: 't1' },
  { icon: Scale, id: 't2' },
  { icon: Shield, id: 't3' },
  { icon: Gavel, id: 't4' },
  { icon: Lock, id: 't5' },
  { icon: Bot, id: 't6' },
  { icon: AlertTriangle, id: 't7' },
  { icon: FileText, id: 't8' },
  { icon: Scale, id: 't9' },
];

export default function TermsPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [openSection, setOpenSection] = useState<number | null>(null);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black text-white' : 'bg-white text-[#111]'}`}>
      <SEO 
        title={t('terms.seoTitle')}
        description={t('terms.seoDesc')}
      />
      <Navbar />

      <section className="pt-36 pb-16 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl aspect-square blur-[140px] -z-10 rounded-full bg-[#FFC928]/10" />
        
        <div className="max-w-4xl mx-auto">
          <Link 
            to="/" 
            className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#FFC928] hover:opacity-80 transition-opacity mb-8"
          >
            <ArrowLeft size={12} /> {t('terms.backHome')}
          </Link>

          <div className="text-center space-y-4 mb-16">
            <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tighter uppercase italic leading-[0.9]">
              {t('terms.heroA')} <span className="text-[#FFC928]">{t('terms.heroB')}</span>
            </h1>
            <p className="text-sm text-gray-400 font-semibold">
              {t('terms.updated')}
            </p>
          </div>

          <div className="space-y-4">
            {sections.map((section, i) => {
              const isOpen = openSection === i;
              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-[2rem] border overflow-hidden ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-gray-50/50 border-gray-100'}`}
                >
                  <button
                    onClick={() => setOpenSection(isOpen ? null : i)}
                    className={`w-full flex items-center gap-4 p-6 sm:p-8 text-left transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-100/50'}`}
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FFC928]/10 flex items-center justify-center shrink-0">
                      <section.icon size={20} className="text-[#FFC928]" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">{t(`terms.${section.id}Title`)}</h2>
                    </div>
                    <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className={`px-6 sm:px-8 pb-6 sm:pb-8 text-xs sm:text-sm leading-relaxed font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {t(`terms.${section.id}Body`)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          <div className={`mt-12 p-6 sm:p-8 rounded-[2rem] border text-center ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-amber-50/40 border-amber-100/60'}`}>
            <p className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('terms.contactLine')}{' '}
              <a href="mailto:contato@meuovo.com" className="text-[#FFC928] hover:underline">contato@meuovo.com</a>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
