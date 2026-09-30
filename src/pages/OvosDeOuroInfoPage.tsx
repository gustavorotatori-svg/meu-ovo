import { Link } from 'react-router-dom';
import { Trophy, Shield, EyeOff, Scale, HelpCircle, ArrowRight, CheckCircle2, Lock, Sparkles, Star } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import BackButton from '../components/BackButton';
import ScrollReveal from '../components/ScrollReveal';
import { useTheme } from '../context/ThemeContext';
import { useTranslation, Trans } from 'react-i18next';

export default function OvosDeOuroInfoPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-black text-white' : 'bg-white text-neutral-900'}`}>
      <SEO 
        title={t('ouro.seoTitle')}
        description={t('ouro.seoDesc')}
      />
      <Navbar />

      <div className="px-6 pt-6">
        <BackButton to="/" />
      </div>

      {/* Hero Section */}
      <section className={`pt-36 pb-20 px-6 relative overflow-hidden text-center`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl aspect-square blur-[140px] -z-10 rounded-full bg-amber-500/10" />
        
        <ScrollReveal direction="up" delay={0}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest leading-none relative">
            <span className="relative z-10 bg-gradient-to-r from-[#FFC928] via-yellow-200 to-[#FFC928] bg-clip-text text-transparent animate-gradient-shift">{t('ouro.badgeText')}</span>
            <span className="absolute -bottom-1.5 left-0 right-0 h-[3px] bg-gradient-to-r from-[#FFC928]/80 via-yellow-300/50 to-[#FFC928]/80 animate-gradient-shift rounded-full blur-[2px]" />
          </div>
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-black tracking-tighter uppercase italic leading-[0.95] max-w-3xl mx-auto">
            {t('ouro.heroA')} <span className="text-[#FFC928]">{t('ouro.heroB')}</span>
          </h1>
          
          <p className="text-lg md:text-xl font-display font-semibold max-w-2xl mx-auto leading-relaxed text-gray-400">
            {t('ouro.heroSub')}
          </p>
        </div>
        </ScrollReveal>
      </section>

      {/* Highlights Grid */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <ScrollReveal direction="up" delay={0}>
          <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-[#0a0a0a] border-white/5' : 'bg-[#F9F9F9] border-gray-100'} text-left space-y-4`}>
            <div className="w-12 h-12 bg-amber-500/10 text-[#FFC928] rounded-2xl flex items-center justify-center">
              <EyeOff size={24} />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter">{t('ouro.card1Title')}</h3>
            <p className="text-sm text-gray-500 leading-relaxed font-semibold">
              {t('ouro.card1Desc')}
            </p>
          </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
          <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-[#0a0a0a] border-white/5' : 'bg-[#F9F9F9] border-gray-100'} text-left space-y-4`}>
            <div className="w-12 h-12 bg-amber-500/10 text-[#FFC928] rounded-2xl flex items-center justify-center">
              <Trophy size={24} />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter font-display">{t('ouro.card2Title')}</h3>
            <p className="text-sm text-gray-500 leading-relaxed font-semibold">
              <Trans i18nKey="ouro.card2Desc">Ao final do ciclo anual (dia <strong>20 de Dezembro</strong>), apenas os <strong>3 primeiros colocados</strong> serão divulgados publicamente na plataforma com destaque e troféus. O restante da lista permanecerá sob sigilo perpétuo.</Trans>
            </p>
          </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={200}>
          <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-[#0a0a0a] border-white/5' : 'bg-[#F9F9F9] border-gray-100'} text-left space-y-4`}>
            <div className="w-12 h-12 bg-amber-500/10 text-[#FFC928] rounded-2xl flex items-center justify-center">
              <Scale size={24} />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter">{t('ouro.card3Title')}</h3>
            <p className="text-sm text-gray-500 leading-relaxed font-semibold">
              {t('ouro.card3Desc')}
            </p>
          </div>
          </ScrollReveal>

        </div>
      </section>

      {/* Rules and Explanation Session */}
      <section className={`py-24 border-y ${isDark ? 'bg-[#030303] border-white/5' : 'bg-[#FDFDFD] border-gray-150'}`}>
        <div className="max-w-4xl mx-auto px-6 text-left space-y-12">
          
          <ScrollReveal direction="up" delay={0}>
          <div className="text-center md:text-left space-y-2">
            <h2 className="text-3xl md:text-4xl font-black leading-none font-display uppercase tracking-tight">{t('ouro.rulesTitle')}</h2>
            <p className="text-sm text-gray-400 font-semibold">{t('ouro.rulesSub')}</p>
          </div>
          </ScrollReveal>

          <div className="space-y-8">
            <ScrollReveal direction="up" delay={0}>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-[#FFC928] text-black font-black text-xs flex items-center justify-center shrink-0 mt-1">1</div>
              <div>
                <h4 className="text-base font-black uppercase tracking-tight text-[#FFC928]">{t('ouro.rule1Title')}</h4>
                <p className="text-sm text-gray-500 leading-relaxed mt-1 font-medium">
                  <Trans i18nKey="ouro.rule1Desc">A votação popular anual de Ovos de Ouro abre no dia <strong>1 de Janeiro</strong> e encerra de forma automática pelo nosso servidor no dia <strong>15 de Dezembro</strong>. Clientes votam de forma segura ao final de seus pedidos reais.</Trans>
                </p>
              </div>
            </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={100}>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-[#FFC928] text-black font-black text-xs flex items-center justify-center shrink-0 mt-1">2</div>
              <div>
                <h4 className="text-base font-black uppercase tracking-tight text-[#FFC928]">{t('ouro.rule2Title')}</h4>
                <p className="text-sm text-gray-500 leading-relaxed mt-1 font-medium">
                  {t('ouro.rule2Desc')}
                </p>
              </div>
            </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={200}>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-[#FFC928] text-black font-black text-xs flex items-center justify-center shrink-0 mt-1">3</div>
              <div>
                <h4 className="text-base font-black uppercase tracking-tight text-[#FFC928]">{t('ouro.rule3Title')}</h4>
                <p className="text-sm text-gray-500 leading-relaxed mt-1 font-medium">
                  {t('ouro.rule3Desc')}
                </p>
              </div>
            </div>
            </ScrollReveal>
          </div>

          {/* Secure Shield Box */}
          <ScrollReveal direction="up" delay={100}>
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-[#FFC928]/30 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="p-4 bg-[#FFC928] text-black rounded-2xl">
              <Shield size={36} className="text-neutral-900" />
            </div>
            <div className="space-y-1.5 flex-1 text-center md:text-left">
              <h4 className="font-extrabold text-white text-base font-display flex items-center justify-center md:justify-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>{t('ouro.shieldTitle')}</span>
              </h4>
              <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                {t('ouro.shieldDesc')}
              </p>
            </div>
          </div>
          </ScrollReveal>

        </div>
      </section>

      {/* CTA section to start onboarding */}
      <section className="py-28 max-w-4xl mx-auto px-6 text-center space-y-8">
        <ScrollReveal direction="up" delay={0}>
        <h2 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tighter">{t('ouro.ctaTitle')}</h2>
        <p className="text-sm text-gray-400 font-semibold max-w-xl mx-auto">
          {t('ouro.ctaDesc')}
        </p>
        </ScrollReveal>
        <ScrollReveal direction="up" delay={100}>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link 
            to="/cadastro"
            className="bg-[#FFC928] hover:bg-[#e6b520] text-black font-extrabold px-8 py-4 rounded-2xl text-sm uppercase tracking-widest transition-all"
          >
            {t('ouro.ctaSignup')}
          </Link>
          <Link 
            to="/busca"
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-extrabold px-8 py-4 rounded-2xl text-sm uppercase tracking-widest transition-all"
          >
            {t('ouro.ctaExplore')}
          </Link>
        </div>
        </ScrollReveal>
      </section>

      <Footer />
    </div>
  );
}
